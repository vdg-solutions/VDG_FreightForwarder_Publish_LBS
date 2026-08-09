// Post-OAuth repo-init chain — "IDB-first, render-first, sync-later"
// Critical path: driveApi import → IDB open → WASM init → repo build → license gate → RENDER
// Deferred: locale prefs, delta-poll, workspace checks, ledger/user seed, etc.
// WASM is mandatory — if it fails to load, the app fails immediately. WASM must load BEFORE any
// licence check (reverifyPersistedLicense needs it) — this was a latent hang on the
// NOT_PROVISIONED branch before F-17-03 reordered it.

import { currentSalesRepId, currentRoles, emailPrefix, hasRole, ROLE_MANAGER } from '../auth/auth-gate.js';
import { safeAwait } from '../util/safe-await.js';
import { StoreIoPort } from '../data/store-io-adapters.js';
import { setStoreScope } from '../cache/store-client.js';
import { resolveUserRole } from '../operators/manager/route-guard.js';
import { rolesFromRecord } from '../auth/workspace-acl.js';
import { loadLocale } from '../i18n/index.js';
import { APP_VERSION } from '../version.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { LicenseGate, prefsLicenseStore } from '../operators/license-gate.js';
import { runLicenseGate } from './license-boot-gate.js';
import { globalizeBridgeExports } from '../wasm-loader.js';
import { rehydrateFsmStates } from '../operators/fsm-ingest.js';
import { createBootFsm, BootEvent } from './boot-fsm.js';
import { renderBootPhase } from './boot-fsm-view.js';

const IDB_OP_TIMEOUT_MS  = 8000;
const PREFS_META_KEY     = 'preferences';
const ONBOARDING_ROUTE   = '/onboarding';
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

  // 1. Import DriveApi module (fast, SW cached)
  stepRef.value = STEP_DRIVE_IMPORT;
  const useMock = new URLSearchParams(location.search).get('mock') === '1'
    || localStorage.getItem('vdg.driveMode') === 'mock';
  const driveApi = useMock
    ? await import('../implementations/mock-drive-backend.js')
    : await import('../auth/drive-api.js');

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
  const ioPort = new StoreIoPort(driveApi, user.email);
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
  window.__vdg_store     = ioPort._store; // on-demand views (prefs, drafts, wma, notifications) read SQLite here

  // F-19-88 AC-04/05: rehydrate the WASM FSM map from the repo (reload + pre-existing
  // rollback orphans) — non-fatal bound so a large shipment list never hangs boot.
  await safeAwait(rehydrateFsmStates(repo), IDB_OP_TIMEOUT_MS, null, 'fsm-rehydrate');

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

  // 7. License gate — enforced for EVERY role, no branch (AC-01..07).
  fsm.dispatch(BootEvent.REPO_BUILT); // repo stack live → GATING_LICENSE
  stepRef.value = STEP_LICENSE_GATE;
  const gate = new LicenseGate(prefsLicenseStore(ioPort._store));
  const app  = document.getElementById('app');
  const gateResult = await runLicenseGate({ gate, container: app });
  if (!gateResult.proceed) { fsm.dispatch(BootEvent.LICENSE_GATE); return null; } // gate screen owns the DOM

  // 8. RENDER — everything past this point is non-blocking
  fsm.dispatch(BootEvent.LICENSE_OK); // → RENDERING
  stepRef.value = STEP_BOOT_APP;
  bootFn(user, db);
  fsm.dispatch(BootEvent.RENDERED); // → READY (terminal): real view owns the DOM now

  // 9. Deferred init (fire-and-forget)
  _deferredInit(user, db, driveApi, repo, ioPort._store);

  return { db, poller: null, auditLog: null };
}

// ── Deferred Background Init ──────────────────────────────────────────────────
// Runs after bootFn → view is already rendered.
// Errors are logged, never crash the app.

async function _deferredInit(user, db, driveApi, repo, store) {
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

    // Delta tick — thin timer over the WASM delta engine (repo.sync_delta). All sync
    // decisions live in Rust (data_repo/sync_delta.rs).
    const { DeltaTick } = await import('../sync/delta-tick.js');
    const deltaTick = new DeltaTick(driveApi, () => repo);
    deltaTick.start();

    // Outbox drain scheduler (F-19-80 AC-01/03/09) — wires vdg:sync-now / vdg:sync-force-retry
    // / online / a bounded backoff interval to repo.drain_outbox(); without this the manual
    // "Đồng bộ" click and post-reconnect resume dispatched into the void.
    const { startOutboxDrainScheduler } = await import('../sync/outbox-drain-scheduler.js');
    startOutboxDrainScheduler({ getRepo: () => repo });

    // Audit log
    const { AuditLog } = await import('../sync/audit-log.js');
    new AuditLog(
      () => window.__vdg_auth?.getCurrentUser?.(),
      () => currentSalesRepId(),
    );

    // Master-scope migration (F-28-02): local-charges/units-of-measure flipped to team
    // audience — sweep each user's stranded per-user records into shared once, guarded by
    // an IDB meta flag. Fire-and-forget: bounded internally by safeAwait, never blocks boot.
    const { migrateMasterScope } = await import('../cache/master-scope-migrator.js');
    const masterScopePrefix = user.email.split('@')[0].toLowerCase();
    migrateMasterScope(
      repo, driveApi, store,
      () => driveApi.findWorkspaceRoot(activeWorkspaceName()), masterScopePrefix,
    ).catch((err) => console.warn('[VDG] master-scope migration error:', err.message)); // DEV

    // Error log
    const { initErrorLog } = await import('../sync/error-log.js');
    initErrorLog(driveApi, () => window.__vdg_auth?.getCurrentUser?.(), () => APP_VERSION);

    // Payment due-soon checker (F-48-01) — tier 3/4 main-thread badge/notify, one shared
    // compute_due_soon call, 100% local (no Drive/token). Tiers 1/2 registration lives in
    // sw-register.js (already wired at boot's service-worker registration call).
    const { initDueSoonChecker } = await import('../sync/due-soon-checker.js');
    initDueSoonChecker();

    // Ledger + user repos — wrap so every injected findWorkspaceRootFn resolves the
    // registry-bound name (F-17-03: findWorkspaceRoot takes a required explicit name).
    const findWorkspaceRoot = () => driveApi.findWorkspaceRoot(activeWorkspaceName());

    const { LedgerDriveRepo } = await import('../implementations/ledger-drive-repo.js');
    const ledgerRepo = new LedgerDriveRepo(driveApi, findWorkspaceRoot);
    window.__vdg_ledger_repo = ledgerRepo;

    // Priced-ref governance repos (F-28-12) — one PricedRefRepo per priced-tier master,
    // mirroring the LedgerDriveRepo closure above. Views call propose/listPending/merge/
    // reject only — never re-implement the FSM or write state.json directly.
    const { PricedRefRepo } = await import('../implementations/priced-ref-repo.js');
    window.__vdg_priced_repos = {};
    for (const refName of PRICED_REFS) {
      window.__vdg_priced_repos[refName] = new PricedRefRepo(driveApi, findWorkspaceRoot, refName);
    }

    // Priced-ref boot migration (F-28-14(d)): materialize each priced master bundle into its
    // governance ref once so the two stores stop diverging (F-28-12 D-2). Fire-and-forget:
    // bounded internally by safeAwait, idempotency keyed off the shared state.json — never blocks boot.
    const { migratePricedRefs } = await import('../cache/priced-ref-migrator.js');
    migratePricedRefs(repo, window.__vdg_priced_repos)
      .catch((err) => console.warn('[VDG] priced-ref migration error:', err.message)); // DEV

    const { UserAuditLog } = await import('../sync/user-audit-log.js');
    const userAuditLog = new UserAuditLog(
      () => window.__vdg_auth?.getCurrentUser?.(),
    );
    window.__vdg_user_audit_log = userAuditLog;

    const { UserDriveRepo } = await import('../implementations/user-drive-repo.js');
    const userRepo = new UserDriveRepo(driveApi, findWorkspaceRoot, userAuditLog);
    window.__vdg_user_repo = userRepo;

    const { RoleAssignmentService } = await import('../operators/manager/role-assignment-service.js');
    // #30: the last arg names the workspace, which goes into each user's grant file so a person
    // working for two companies can tell their two grants apart. Injected, not imported — the
    // service stays clear of the workspace-registry → drive-api → google-oauth chain.
    window.__vdg_role_assignment_service = new RoleAssignmentService(
      driveApi, userRepo, findWorkspaceRoot, null, userAuditLog, null, activeWorkspaceName,
    );
    // #25: this wiring lands in the DEFERRED step, long after the router may have rendered
    // #/admin/users on a deep link — that view read a null repo and sat at 0/0 forever. Announce it
    // so a screen that mounted too early can load itself once the services actually exist.
    window.dispatchEvent(new CustomEvent('vdg:user-repo-ready'));

    // Resolve actual user role (async, updates window.__vdg_current_user)
    userRepo.get(user.email).then((record) => {
      const resolved = rolesFromRecord(record);
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
      await _deferredManagerInit(user, driveApi, ledgerRepo, userRepo, repo);
    }
  } catch (err) {
    console.warn('[VDG] deferred init error:', err.message); // DEV
  }
}

async function _deferredManagerInit(user, driveApi, ledgerRepo, userRepo, repo) {
  const wsName   = activeWorkspaceName();
  // F-24-19: findWorkspaceRoot now distinguishes "genuinely absent" (null) from "Drive error"
  // (throws). Only a genuine null routes to onboarding — a transient failure must NOT, or a
  // dropped connection would bounce a provisioned manager into the onboarding loop.
  let wsRootId;
  try {
    wsRootId = await driveApi.findWorkspaceRoot(wsName);
  } catch (err) {
    console.warn('[repo-init] manager deferred init skipped (Drive transient):', err.message); // DEV
    return; // background — retries next boot; never onboarding on a transient error
  }
  if (!wsRootId) {
    location.hash = ONBOARDING_ROUTE;
    return;
  }

  // Orphan workspace detection
  if (driveApi.globalOwnerQuery) {
    const { computeOrphanCount } = await import('../components/orphan-folder-banner.js');
    driveApi.globalOwnerQuery(driveApi.driveFetch, wsName)
      .then((allByName) => {
        const count = computeOrphanCount(allByName.length);
        if (count > 0) {
          window.dispatchEvent(new CustomEvent('vdg:orphan-workspace-detected', {
            detail: { count, canonicalId: wsRootId },
          }));
        }
      }).catch(() => {});
  }

  // ACL target folders
  const { bootstrapAclTargetFolders } = await import('../operators/manager/workspace-bootstrap.js');
  await bootstrapAclTargetFolders(driveApi, wsRootId).catch(() => {});

  // Ledger + user seed
  ledgerRepo.ensureSeedFiles().catch(() => {});
  userRepo.ensureSeeded(user).catch(() => {});

  // Auto reconcile
  const { maybeAutoReconcile } = await import('../operators/manager/ledger-reconciler.js');
  maybeAutoReconcile(ledgerRepo);

  // Pre-warm IDB cache
  const { prefetchDashboard } = await import('../cache/route-prefetch.js');
  const { ensureShipmentStateAliases } = await import('../util/shipment-state-aliases.js');
  const WARM_KINDS = [
    'shipment', 'pnl_line', 'billing', 'approval_request', 'customers',
    'exception', 'quotation', 'commission_rules', 'user', // F-39-01: canonical user-master kind
  ];
  Promise.all(WARM_KINDS.map((k) => repo.list(k, null))).catch(() => {});
  // F-40-01: WARM_KINDS only does a bare list — never triggers the seed migration. Warm the
  // shipment-states alias seed directly, off the grid's mount path.
  ensureShipmentStateAliases(repo).catch(() => {});
  prefetchDashboard(repo).catch(() => {});
}
