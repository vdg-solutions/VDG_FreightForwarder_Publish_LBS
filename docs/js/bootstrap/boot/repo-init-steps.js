// Post-OAuth repo-init chain — "render-first, sync-later"
// Critical path: open store → WASM init → repo build → license gate → RENDER

import { currentSalesRepId, currentRolesResolved } from '../../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { safeAwait } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { createIoPort } from '../../implementations/storage/bootstrap/compose.js';
import { createPlatform } from '../platform/index.js';
import { composeUi } from '../compose-ui/index.js';
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { bindLedgerRepo } from '../../implementations/storage/core_abstractions/ledger-repo.js';

const SENTINEL_TOKEN = /^__.*__$/;

function _forkPrefixFromSession() {
  const token = currentSalesRepId();
  return token && !SENTINEL_TOKEN.test(token) ? token.toLowerCase() : null;
}

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
  const serverApi = storageApi(); // Use storageApi to get server API
  const ioPort = createIoPort(serverApi, user.email, _forkPrefixFromSession());

  // Boot-critical canary: fail fast, honestly, before sinking work into a repo/FSM/license-gate
  // built on a store that can't answer. A timeout here is NOT evidence of a lock (that classified
  // signal comes only from store-client.js's real sahpool-genuine-conflict error) — it just means
  // the boot must stop instead of silently rendering on top of it (no silent-await to a stuck view).
  const warmResult = await safeAwait(ioPort.cache_get_meta('__warm'), CACHE_OP_TIMEOUT_MS, null, 'repo-init:sqlite-warm');
  if (!warmResult.ok) return _storeUnresponsive('repo-init:sqlite-warm');

  const repo = new wasmMod.WasmEntityRepo(ioPort);
  window.__vdg_repo      = repo;
  window.__vdg_server_api = serverApi;
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
  _deferredInit(user, db, serverApi, repo);

  return { db, poller: null, auditLog: null };
}

async function _deferredInit(user, db, serverApi, repo) {
  const store = localStore();
  try {
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
      getRole: () => currentSalesRepId(),
    });

    installErrorLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.(), getVersion: () => APP_VERSION });

    const { startDueSoonChecker } = await import('../platform/sync-due-soon.js');
    startDueSoonChecker({ getSalesId: () => currentSalesRepId() });

    // Ledger repo — binds the io ports' ledger_* calls (outbox drain posting) and the
    // window global the accounting views/close-period/repost-panel read.
    const { LedgerStoreRepo } = await import('../../implementations/storage/implementations/repos/ledger-repo.js');
    const ledgerRepo = new LedgerStoreRepo();
    window.__vdg_ledger_repo = ledgerRepo;
    bindLedgerRepo(ledgerRepo);

    const userAuditLog = createUserAuditLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.() });
    window.__vdg_user_audit_log = userAuditLog;

    const { UserStoreRepo: UserServerRepo } = await import('../../implementations/storage/implementations/repos/user-repo.js');
    window.__vdg_user_repo = new UserServerRepo(userAuditLog);

    // The staff-table record is the final word on this session's principal, and it lands AFTER
    // the ACL-probe snapshot auth_set_resolved_roles already wrote (it can disagree, and it wins).
    // Rust reads the record, derives the roles, and republishes the whole principal —
    // this call carries the email and nothing else.
    //
    // A lookup that fails (server unreachable at this exact moment) now leaves the session
    // UNRESOLVED instead of publishing a false "denied" (resolve_principal.rs), but nobody ever
    // asked again — the sidebar stayed on "unreachable" until a manual reload. `vdg:server-health`
    // is the same signal the reconnect chip already answers to (startHealthPoll's tick, or any
    // other apiFetch success) — piggyback on it instead of a second timer, and stop listening once
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
