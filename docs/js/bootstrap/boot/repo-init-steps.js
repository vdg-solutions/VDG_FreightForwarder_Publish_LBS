// Post-OAuth repo-init chain — "IDB-first, render-first, sync-later"
// Critical path: driveApi import → IDB open → WASM init → repo build → license gate → RENDER
// Deferred: locale prefs, delta-poll, workspace checks, ledger/user seed, etc.
// WASM is mandatory — if it fails to load, the app fails immediately. WASM must load BEFORE any
// licence check (reverifyPersistedLicense needs it) — this was a latent hang on the
// NOT_PROVISIONED branch before F-17-03 reordered it.

import { currentSalesRepId, currentRoles, hasRole } from '../../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { emailPrefix } from '../../implementations/kernel/core_abstractions/util/email-prefix.js';
import { ROLE_MANAGER } from '../../implementations/ui/core_abstractions/roles.js';
import { safeAwait } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { createIoPort } from '../../implementations/storage/bootstrap/compose.js';
import { createPlatform } from '../platform/index.js';
import { composeUi } from '../compose-ui/index.js';
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { bindLedgerRepo } from '../../implementations/storage/core_abstractions/ledger-repo.js';

const SENTINEL_TOKEN = /^__.*__$/; // '__MANAGER__' is a role token, not a fork name

/// The fork the server resolved for this session (its user_prefix, uppercased into the role
/// token). A collision suffix makes it differ from the email's local part, which is why it is
/// read from the session and not recomputed. The owner sentinel yields null → email prefix.
function _forkPrefixFromSession() {
  const token = currentSalesRepId();
  return token && !SENTINEL_TOKEN.test(token) ? token.toLowerCase() : null;
}
import { setStoreScope, localStore } from '../../implementations/storage/core_abstractions/local-store.js';
import { resolveUserRole } from '../../implementations/ui/core_abstractions/ports/governance/route-guard.js';
import { loadLocale } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import { APP_VERSION } from '../../implementations/kernel/core_abstractions/version.js';
import { runLicenseGate } from './license-boot-gate.js';
import { globalizeBridgeExports } from './wasm-loader.js';
import { rehydrateFsmStates } from '../../implementations/ui/core_abstractions/ports/flows/fsm-ingest.js';
import { createBootFsm, BootEvent } from './boot-fsm.js';
import { renderBootPhase } from './boot-fsm-view.js';
import { deferredManagerInit } from './repo-init-manager.js';

const IDB_OP_TIMEOUT_MS  = 8000;
const PREFS_META_KEY     = 'preferences';
const REPO_HANG_SEAM_KEY = 'vdg.test.repoHangMs'; // AC-03 test seam

// Step name constants — AC-04: step field in diag/console entries
const STEP_DRIVE_IMPORT  = 'driveApi-import';
const STEP_OPEN_DB       = 'openVdgDb';
const STEP_WASM_INIT     = 'wasm-init';
const STEP_BUILD_REPO    = 'build-repo-stack';
const STEP_LICENSE_GATE  = 'license-gate';
const STEP_BOOT_APP      = 'bootApp';

// F-28-12: registry tier:'priced' refs wired one PricedRefRepo per ref (§2 anchor).
// F-28-15: ocean-tariff joins the list — no other change, the loop below is kind-agnostic.
const PRICED_REFS = ['local-charges', 'air-rates', 'ocean-tariff'];

// ── Critical Path ─────────────────────────────────────────────────────────────
// Returns { db } — poller/auditLog are started in background.

export async function runRepoInitBounded(user, stepRef, bootFn, existingDb, onDbOpen) {
  const _hangMs = parseInt(localStorage.getItem(REPO_HANG_SEAM_KEY) || '0', 10);

  // Event-driven boot FSM (E-36 F-36-06): every transition is driven by a REAL platform event
  // (IDB open onsuccess/onerror, wasm resolve/reject, license-gate outcome, render) — never a
  // blind wall-clock. It owns the boot-phase display (#view-loading names the live phase, not a
  // dumb spinner) and classifies failures. The 30s race in repo-bootstrap stays ONLY as a
  // last-resort anti-hang backstop, not the mechanism that decides a step's success.
  const fsm = createBootFsm(renderBootPhase);

  // 1. The Drive-shaped tree api — whatever the storage bootstrap bound (Drive REST, the server
  // shim, or the localStorage mock under ?mock=1).
  stepRef.value = STEP_DRIVE_IMPORT;
  const driveApi = storageApi();

  // 2. Storage is SQLite/OPFS in a worker (opened lazily + warmed at step 5). No blocking IDB open
  // on the critical path — a wedged legacy IndexedDB can no longer stall or fail boot, which was
  // the whole point of the migration. Kept as a step so the FSM's storage → wasm edge still fires.
  stepRef.value = STEP_OPEN_DB;
  const db = null;
  fsm.dispatch(BootEvent.DB_OPENED); // storage layer available → LOADING_WASM

  // 3. Load WASM — mandatory, no fallback. Must run BEFORE any license check (both branches
  // below call into WASM to verify) — this fixed a latent hang on the NOT_PROVISIONED branch.
  stepRef.value = STEP_WASM_INIT;
  const wasmMod = await import(new URL('pkg/vdg_freight.js', document.baseURI).href);
  await wasmMod.default();
  window.__vdg_wasm = wasmMod;
  // Root fix (F-28-12 D-1): this boot path skipped wasm-loader.js's export-globalization
  // loop, leaving window.permission_can_merge / window.proposal_reject etc. undefined for
  // the whole manager session even though window.__vdg_wasm.<name> resolved fine — the
  // governance panel reads the window global and misclassified every Manager as
  // non-maintainer. Reuse the loader's own list + loop (single source), don't duplicate it.
  globalizeBridgeExports(wasmMod);
  window.dispatchEvent(new Event('vdg:wasm-ready'));

  // 4. NOT_PROVISIONED no longer auto-provisions (#17). Boot used to create a workspace root in
  // the signed-in user's OWN Drive here, whose empty admin/users.jsonl then seeded that user as
  // Manager — so every employee who had not been invited yet forked a private workspace with its
  // own user and customer lists (QC 2026-08-09: "2 bên không đồng bộ, khác nhau"). Creating the
  // company workspace is a deliberate manager action now; boot just continues degraded and the
  // route guard lands this role on /pending-access, which owns that action.
  fsm.dispatch(BootEvent.WASM_READY); // real event: wasm module instantiated → BUILDING_REPO

  // AC-03 test seam
  if (_hangMs > 0) await new Promise((r) => setTimeout(r, _hangMs));

  // 5. Build repo — WASM only, storage on SQLite/OPFS (worker). The port keeps the idb_* method
  // names the Rust side imports; the substrate under them is SQL now (immune to the IDB wedge).
  stepRef.value = STEP_BUILD_REPO;
  setStoreScope(user.email); // #18: idempotent — auth-gate already bound it, this is the backstop
  // Same port contract either way; only where the bytes go differs (storage/bootstrap decided).
  const ioPort = createIoPort(driveApi, user.email, _forkPrefixFromSession());
  // Warm the SQLite worker off the critical path so the first repo read doesn't pay the cold
  // module-fetch + VFS-install latency inline. Non-blocking, bounded, failure is non-fatal here.
  // A TIMEOUT (vs an error) is the SILENT form of the old-tab lock — the engine never answers
  // and every later op starves the same 8s way (QC 2026-08-08: boot limped into a timeout storm
  // and froze at the license gate). Surface the same close-old-tabs screen, boot keeps degrading.
  safeAwait(ioPort.cache_get_meta('__warm'), IDB_OP_TIMEOUT_MS, null, 'repo-init:sqlite-warm')
    .then((r) => {
      if (!r.ok) window.dispatchEvent(new CustomEvent('vdg:store-locked', { detail: { reason: 'sqlite-warm timeout — engine unresponsive (another tab may hold the store)' } }));
    });
  const repo   = new wasmMod.WasmEntityRepo(ioPort);
  window.__vdg_repo      = repo;
  window.__vdg_drive_api = driveApi;
  window.__vdg_store     = localStore(); // on-demand views (prefs, drafts, wma, notifications) read SQLite here
  // E-37: the shipment revenue half is addressed by PATH, not by kind — the kind route
  // always resolves to the signed-in user's fork, so a manager reading a rep's job needs
  // ws_read_file on users/{rep}/shipment_revenue. data/shipment-revenue-repo.js reaches
  // the port through here.
  window.__vdg_io        = ioPort;

  // 6. Initial user identity (no network, instant)
  // #28: identity carries the ROLE SET. `role` stays as roles[0] purely so older readers and
  // existing ledger records keep parsing — nothing gates on it any more.
  // Every user owns a fork: user_prefix is no longer null-for-managers, so a manager doing sales
  // work has somewhere to store it. The record's own prefix overrides this below once it loads.
  const roles = currentRoles();
  window.__vdg_current_user = {
    email:       user.email,
    role:        roles[0] || 'ReadOnly',
    roles,
    user_prefix: emailPrefix(user.email),
  };

  // 6b. The Rust freight_app use-cases get their platform (records over the repo, session, prefs,
  // events, workspace, http), and every ui port is bound to a wasm export — before any view renders.
  wasmMod.freight_app_init(createPlatform({ repo, currentUser: () => window.__vdg_current_user || null }));
  composeUi(wasmMod);

  // F-19-88 AC-04/05: rehydrate the WASM FSM map from the repo (reload + pre-existing
  // rollback orphans) — non-fatal bound so a large shipment list never hangs boot. It runs
  // AFTER the platform and the ui ports are wired: the sweep is a use-case now, and a
  // use-case has nothing to read the repo through until freight_app_init has happened.
  await safeAwait(rehydrateFsmStates(repo), IDB_OP_TIMEOUT_MS, null, 'fsm-rehydrate');

  // 7. License gate — enforced for EVERY role, no branch (AC-01..07).
  fsm.dispatch(BootEvent.REPO_BUILT); // repo stack live → GATING_LICENSE
  stepRef.value = STEP_LICENSE_GATE;
  const app  = document.getElementById('app');
  const gateResult = await runLicenseGate({ container: app });
  if (!gateResult.proceed) { fsm.dispatch(BootEvent.LICENSE_GATE); return null; } // gate screen owns the DOM

  // 8. RENDER — everything past this point is non-blocking
  fsm.dispatch(BootEvent.LICENSE_OK); // → RENDERING
  stepRef.value = STEP_BOOT_APP;
  bootFn(user, db);
  fsm.dispatch(BootEvent.RENDERED); // → READY (terminal): real view owns the DOM now

  // 9. Deferred init (fire-and-forget)
  _deferredInit(user, db, driveApi, repo);

  return { db, poller: null, auditLog: null };
}

// ── Deferred Background Init ──────────────────────────────────────────────────
// Runs after bootFn → view is already rendered.
// Errors are logged, never crash the app.

async function _deferredInit(user, db, driveApi, repo) {
  const store = localStore();
  try {
    // Locale from user prefs (may switch from 'vi' to user pref)
    if (store) {
      const prefsResult = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY),
        IDB_OP_TIMEOUT_MS, null, 'deferred:prefs',
      );
      const locale = prefsResult.ok ? (prefsResult.value?.locale || 'vi') : 'vi';
      if (locale !== 'vi') await loadLocale(locale);
    }

    // Delta tick + outbox drain — thin timers over data_repo's engine (repo.sync_delta /
    // repo.drain_outbox). Every schedule decision (interval, backoff, pause, the hourly quota
    // piggyback) lives in Rust (freight_app/operators/sync). Without the drain wiring the manual
    // "Đồng bộ" click and the post-reconnect resume dispatched into the void (F-19-80).
    const { startDeltaTick, startOutboxDrain } = await import('../platform/sync-schedulers.js');
    startDeltaTick({ getRepo: () => repo });
    startOutboxDrain({ getRepo: () => repo });

    // Audit log. F-37-02: the instance used to be constructed and dropped on the floor — nothing
    // held it, `runRepoInitBounded` returned auditLog: null, and every `_auditLog?.append(...)`
    // in role-assignment-service optional-chained into nothing. The trail was empty by
    // construction, which is indistinguishable from a workspace where nobody ever changed a role.
    const { createAuditLog, createUserAuditLog, installErrorLog } = await import('../platform/sync-trails.js');
    window.__vdg_audit_log = createAuditLog({
      getUser: () => window.__vdg_auth?.getCurrentUser?.(),
      getRole: () => currentSalesRepId(),
    });

    // Master-scope migration (F-28-02): local-charges/units-of-measure flipped to team
    // audience — sweep each user's stranded per-user records into shared once, guarded by
    // an IDB meta flag. Fire-and-forget: bounded internally by safeAwait, never blocks boot.
    wasm().cache_migrate_master_scope({})
      .catch((err) => console.warn('[VDG] master-scope migration error:', err.message)); // DEV

    // Error log — browser hooks here, both bounds (no writes while auth is dead, the per-session
    // cap) in Rust.
    installErrorLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.(), getVersion: () => APP_VERSION });

    // Storage upkeep (error-log retention, per-record bundle explode, re-grant after a move) —
    // all fire-and-forget. The per-record sweep reaches the workspace tree through the freight_app
    // platform now, so nothing but the Drive api has to be threaded down here.
    import('./maintenance.js')
      .then((m) => m.runBootMaintenance(driveApi))
      .catch((err) => console.warn('[VDG] boot maintenance skipped:', err.message)); // DEV

    // Payment due-soon checker (F-48-01) — tier 3/4 main-thread badge/notify, one shared
    // compute_due_soon call, 100% local (no Drive/token). Tiers 1/2 registration lives in
    // sw-register.js (already wired at boot's service-worker registration call).
    const { startDueSoonChecker } = await import('../platform/sync-due-soon.js');
    startDueSoonChecker({ getSalesId: () => currentSalesRepId() });

    const { LedgerDriveRepo } = await import('../../implementations/storage/implementations/drive/ledger-drive-repo.js');
    const ledgerRepo = new LedgerDriveRepo();
    window.__vdg_ledger_repo = ledgerRepo;
    bindLedgerRepo(ledgerRepo); // the io ports' ledger_* calls

    // Priced-ref governance repos (F-28-12) — one PricedRefRepo per priced-tier master,
    // mirroring the LedgerDriveRepo closure above. Views call propose/listPending/merge/
    // reject only — never re-implement the FSM or write state.json directly.
    const { PricedRefRepo } = await import('../../implementations/storage/implementations/drive/priced-ref-repo.js');
    window.__vdg_priced_repos = {};
    for (const refName of PRICED_REFS) {
      window.__vdg_priced_repos[refName] = new PricedRefRepo(refName);
    }

    // Priced-ref boot migration (F-28-14(d)): materialize each priced master bundle into its
    // governance ref once so the two stores stop diverging (F-28-12 D-2). Fire-and-forget:
    // bounded internally by safeAwait, idempotency keyed off the shared state.json — never blocks boot.
    wasm().cache_migrate_priced_refs({})
      .catch((err) => console.warn('[VDG] priced-ref migration error:', err.message)); // DEV

    const userAuditLog = createUserAuditLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.() });
    window.__vdg_user_audit_log = userAuditLog;

    const { UserDriveRepo } = await import('../../implementations/storage/implementations/drive/user-drive-repo.js');
    const userRepo = new UserDriveRepo(userAuditLog);
    window.__vdg_user_repo = userRepo;

    // #30: the role cascade is a Rust use-case (governance/role_assignment.rs) reached through
    // the wasm exports; the global stays because the admin screens ask for it by name. Every
    // collaborator it needs — the roster, the audit trails, the workspace tree — is on the
    // platform object, so nothing is injected here.
    window.__vdg_role_assignment_service = {
      assignRole: (email, role, userPrefix = null, extraRoles = []) => _governance(
        wasm().governance_assign_role({ email, role, user_prefix: userPrefix, extra_roles: extraRoles })),
      changeRole: (user, newRole, newUserPrefix = null, newExtraRoles = null) => _governance(
        wasm().governance_change_role({
          user, new_role: newRole, new_user_prefix: newUserPrefix, new_extra_roles: newExtraRoles,
        })),
      revokeRole: (email, role, userPrefix = null) => _governance(
        wasm().governance_revoke_role({ email, role, user_prefix: userPrefix })),
      backfillGrants: () => _governance(wasm().governance_backfill_grants({})),
    };
    // #25: this wiring lands in the DEFERRED step, long after the router may have rendered
    // #/admin/users on a deep link — that view read a null repo and sat at 0/0 forever. Announce it
    // so a screen that mounted too early can load itself once the services actually exist.
    window.dispatchEvent(new CustomEvent('vdg:user-repo-ready'));

    // Resolve actual user role (async, updates window.__vdg_current_user)
    userRepo.get(user.email).then((record) => {
      // The store projects one `roles` array; there is no second `role` field to reconcile.
      const resolved = (Array.isArray(record?.roles) ? record.roles : []).filter(Boolean);
      window.__vdg_current_user.roles       = resolved;
      window.__vdg_current_user.role        = resolved[0] || resolveUserRole(record);
      // #28: fall back to the email prefix, never null — every user owns a fork.
      window.__vdg_current_user.user_prefix = record?.user_prefix || emailPrefix(user.email);
    }).catch(() => {});

    // Manager-specific background tasks
    if (hasRole(ROLE_MANAGER)) {
      // #30: users provisioned before grant files existed have none, and authority no longer comes
      // from the fork — without this they all land on /pending-access. Only the manager can write
      // grants/, so it runs here; failures are reported per user, never fatal to boot.
      window.__vdg_role_assignment_service.backfillGrants()
        .then((r) => { if (r.published.length) console.info('[VDG] grant backfill:', r); }) // DEV
        .catch((err) => console.warn('[VDG] grant backfill failed:', err.message));         // DEV
      await deferredManagerInit(user, driveApi, ledgerRepo, userRepo, repo);
    }
  } catch (err) {
    console.warn('[VDG] deferred init error:', err.message); // DEV
  }
}

/// The wasm module the boot loaded. Reached by name because the deferred chain runs long after
/// the module reference went out of scope.
function wasm() { return window.__vdg_wasm; }

/// A governance reply carries its failure inside it; the admin screens expect a throw, so this is
/// where the two meet.
async function _governance(pending) {
  const reply = await pending;
  if (reply?.error) throw new Error(reply.error);
  return reply;
}
