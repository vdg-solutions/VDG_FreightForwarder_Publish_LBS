// Post-OAuth repo-init chain — "render-first, sync-later"
// Critical path: open store → WASM init → repo build → license gate → RENDER

import { currentAccount, currentRolesResolved } from '../../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { safeAwait } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { createIoPort } from '../../implementations/storage/bootstrap/compose.js';
import { createPlatform } from '../platform/index.js';
import { composeUi } from '../compose-ui/index.js';

import { setStoreScope, localStore } from '../../implementations/storage/core_abstractions/local-store.js';
import { loadLocale } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import { APP_VERSION } from '../../implementations/kernel/core_abstractions/version.js';
import { runLicenseGate } from './license-boot-gate.js';
import { loadWasmOrThrow } from './wasm-loader.js';
import { rehydrateFsmStates } from '../../implementations/ui/core_abstractions/ports/flows/fsm-ingest.js';
import { createBootFsm, BootEvent } from './boot-fsm.js';
import { renderBootPhase } from './boot-fsm-view.js';

const CACHE_OP_TIMEOUT_MS = 8000;
const PREFS_META_KEY     = 'preferences';
const REPO_HANG_SEAM_KEY = 'vdg.test.repoHangMs';

const STEP_OPEN_DB       = 'open-store';
const STEP_WASM_INIT     = 'wasm-init';
const STEP_BUILD_REPO    = 'build-repo-stack';
const STEP_LICENSE_GATE  = 'license-gate';
const STEP_BOOT_APP      = 'bootApp';

// A boot-critical store op timed out (repo-init:sqlite-warm / fsm-rehydrate) — stop the boot
// pipeline here instead of continuing into a repo/FSM/render built on top of it (a silent-await
// resolving to a stuck or misleading view is banned). This is deliberately NOT a lock diagnosis —
// only store-client.js's classified sahpool-genuine-conflict error earns that message — so it
// carries kind:'unresponsive', not the "close other tabs" wording, which would only be true for a
// real second live tab.
function _storeUnresponsive(tag) {
  window.dispatchEvent(new CustomEvent('vdg:store-locked', { detail: { kind: 'unresponsive', tag } }));
  return null;
}

export async function runRepoInitBounded(user, stepRef, bootFn, existingDb, onDbOpen) {
  const _hangMs = parseInt(localStorage.getItem(REPO_HANG_SEAM_KEY) || '0', 10);
  const fsm = createBootFsm(renderBootPhase);

  // 1. Storage is SQLite/OPFS in a worker
  stepRef.value = STEP_OPEN_DB;
  const db = null;
  fsm.dispatch(BootEvent.DB_OPENED);

  // 2. Load WASM — app.js's main() already kicked this off in parallel with the awaits above
  // (boot/wasm-boot-loader.js), so this normally resolves from wasm-loader.js's shared cache
  // instantly; a caller reaching this step first (a test, a retry) still loads it correctly.
  stepRef.value = STEP_WASM_INIT;
  const wasmMod = await loadWasmOrThrow();

  fsm.dispatch(BootEvent.WASM_READY);

  if (_hangMs > 0) await new Promise((r) => setTimeout(r, _hangMs));

  // 3. Build repo
  stepRef.value = STEP_BUILD_REPO;
  setStoreScope(user.email);
  const ioPort = createIoPort(user.email);

  // Boot-critical canary: fail fast, honestly, before sinking work into a repo/FSM/license-gate
  // built on a store that can't answer. A timeout here is NOT evidence of a lock (that classified
  // signal comes only from store-client.js's real sahpool-genuine-conflict error) — it just means
  // the boot must stop instead of silently rendering on top of it (no silent-await to a stuck view).
  const warmResult = await safeAwait(ioPort.cache_get_meta('__warm'), CACHE_OP_TIMEOUT_MS, null, 'repo-init:sqlite-warm');
  if (!warmResult.ok) return _storeUnresponsive('repo-init:sqlite-warm');

  const repo = new wasmMod.WasmEntityRepo(ioPort);
  window.__vdg_repo      = repo;
  window.__vdg_store     = localStore();
  window.__vdg_io        = ioPort;

  // 4. Attach Platform & Compose UI — the signed-in identity is the Rust principal
  // (session_principal), already set by the ACL-probe's auth_set_resolved_roles; JS carries no
  // mirror of it.
  wasmMod.freight_app_init(createPlatform({ repo }));
  composeUi(wasmMod);

  const rehydrateResult = await safeAwait(rehydrateFsmStates(repo), CACHE_OP_TIMEOUT_MS, null, 'fsm-rehydrate');
  if (!rehydrateResult.ok) return _storeUnresponsive('fsm-rehydrate');

  // 5. License gate
  fsm.dispatch(BootEvent.REPO_BUILT);
  stepRef.value = STEP_LICENSE_GATE;
  const app  = document.getElementById('app');
  const gateResult = await runLicenseGate({ container: app });
  if (!gateResult.proceed) { fsm.dispatch(BootEvent.LICENSE_GATE); return null; }

  // 6. RENDER
  fsm.dispatch(BootEvent.LICENSE_OK);
  stepRef.value = STEP_BOOT_APP;
  bootFn(user, db);
  fsm.dispatch(BootEvent.RENDERED);

  // 7. Deferred init
  //
  // `serverApi` used to sit in this argument list. It was not a parameter of this function, not
  // imported, and not declared anywhere — the only other mention in the file is _deferredInit's
  // OWN parameter name, a different scope. JS evaluates arguments BEFORE the call, so this line
  // threw ReferenceError and killed everything below it: the delta tick, the outbox drain, the
  // health poll, the audit trails and the role re-resolve. All of it, silently — because
  // BootEvent.RENDERED fires two lines above, so the UI came up looking fine.
  //
  // That is what shipped as v0.4.58: no incremental sync (one desk showed 11 shipments while
  // another showed 13), queued writes that never left (Publish spun forever), and a green sync
  // chip, green because nothing was left running to report otherwise.
  _deferredInit(user, db, repo);

  return { db, poller: null, auditLog: null };
}

async function _deferredInit(user, db, repo) {
  const store = localStore();
  try {
    // Ledger + user repos first: they are wasm objects off the already-loaded module, so mounting
    // them costs nothing and cannot fail on a cold cache. Everything below this line is behind an
    // `await import(...)`, and the outbox drain started there posts THROUGH the ledger repo — the
    // old order (mount last) left both that drain and resolve_principal reading an unmounted repo
    // whenever a dynamic import was slow, and the catch at the bottom swallowed the reason.
    window.__vdg_ledger_repo = repo.ledgerRepo();
    window.__vdg_user_repo   = repo.userRepo();

    if (store) {
      const prefsResult = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY),
        CACHE_OP_TIMEOUT_MS, null, 'deferred:prefs',
      );
      const locale = prefsResult.ok ? (prefsResult.value?.locale || 'vi') : 'vi';
      if (locale !== 'vi') await loadLocale(locale);
    }

    const { startDeltaTick, startOutboxDrain, startHealthPoll } = await import('../platform/sync-schedulers.js');
    startDeltaTick({ getRepo: () => repo });
    startOutboxDrain({ getRepo: () => repo });
    startHealthPoll();

    const { createAuditLog, createUserAuditLog, installErrorLog } = await import('../platform/sync-trails.js');
    window.__vdg_audit_log = createAuditLog({
      getUser: () => window.__vdg_auth?.getCurrentUser?.(),
    });

    installErrorLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.(), getVersion: () => APP_VERSION });

    const { startDueSoonChecker } = await import('../platform/sync-due-soon.js');
    startDueSoonChecker({ getSalesId: () => currentAccount() });

    window.__vdg_user_audit_log = createUserAuditLog();

    // The staff-table record is the final word on this session's principal, and it lands AFTER
    // the ACL-probe snapshot auth_set_resolved_roles already wrote (it can disagree, and it wins).
    // Rust reads the record, derives the roles, and republishes the whole principal —
    // this call carries the email and nothing else.
    //
    // A lookup that fails (server unreachable at this exact moment) now leaves the session
    // UNRESOLVED instead of publishing a false "denied" (resolve_principal.rs), but nobody ever
    // asked again — the sidebar stayed on "unreachable" until a manual reload. `vdg:server-health`
    // is the same signal the reconnect chip already answers to (startHealthPoll's tick) —
    // piggyback on it instead of a second timer, and stop listening once
    // a real verdict lands.
    const retryPrincipalOnReconnect = () => {
      if (currentRolesResolved()) { window.removeEventListener('vdg:server-health', retryPrincipalOnReconnect); return; }
      wasm().auth_resolve_principal({ email: user.email }).catch(() => {});
    };
    window.addEventListener('vdg:server-health', retryPrincipalOnReconnect);
    wasm().auth_resolve_principal({ email: user.email }).catch(() => {});

  } catch (err) {
    console.warn('[VDG] deferred init error:', err.message);
  }
}

function wasm() { return window.__vdg_wasm; }
