// Post-OAuth repo-init chain — "IDB-first, render-first, sync-later"
// Critical path: driveApi import → IDB open → WASM init → repo build → license gate → RENDER
// Deferred: locale prefs, delta-poll, workspace checks, ledger/user seed, etc.
// WASM is mandatory — if it fails to load, the app fails immediately. WASM must load BEFORE any
// licence check (reverifyPersistedLicense needs it) — this was a latent hang on the
// NOT_PROVISIONED branch before F-17-03 reordered it.

import { currentSalesRepId, clearRoleCache, isManager } from '../auth/auth-gate.js';
import { safeAwait } from '../util/safe-await.js';
import { openVdgDb, idbGet } from '../cache/idb-cache.js';
import { WasmIoPort } from '../data/wasm-io-adapters.js';
import { resolveUserRole } from '../operators/manager/route-guard.js';
import { loadLocale } from '../i18n/index.js';
import { APP_VERSION } from '../version.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { LicenseGate, prefsLicenseStore } from '../operators/license-gate.js';
import { runFirstRunProvision, runLicenseGate } from './license-boot-gate.js';

const IDB_OP_TIMEOUT_MS  = 8000;
const META_STORE         = 'meta';
const PREFS_META_KEY     = 'preferences';
const ONBOARDING_ROUTE   = '/onboarding';
const REPO_HANG_SEAM_KEY = 'vdg.test.repoHangMs'; // AC-03 test seam

// Step name constants — AC-04: step field in diag/console entries
const STEP_DRIVE_IMPORT  = 'driveApi-import';
const STEP_OPEN_DB       = 'openVdgDb';
const STEP_WASM_INIT     = 'wasm-init';
const STEP_WORKSPACE_CHK = 'first-run-provision';
const STEP_BUILD_REPO    = 'build-repo-stack';
const STEP_LICENSE_GATE  = 'license-gate';
const STEP_BOOT_APP      = 'bootApp';

// ── Critical Path ─────────────────────────────────────────────────────────────
// Returns { db } — poller/auditLog are started in background.

export async function runRepoInitBounded(user, stepRef, bootFn, existingDb, onDbOpen) {
  const _hangMs = parseInt(localStorage.getItem(REPO_HANG_SEAM_KEY) || '0', 10);

  // 1. Import DriveApi module (fast, SW cached)
  stepRef.value = STEP_DRIVE_IMPORT;
  const useMock = new URLSearchParams(location.search).get('mock') === '1'
    || localStorage.getItem('vdg.driveMode') === 'mock';
  const driveApi = useMock
    ? await import('../implementations/mock-drive-backend.js')
    : await import('../auth/drive-api.js');

  // 2. Open IDB (fast, local) — needed by the license cache regardless of role.
  stepRef.value = STEP_OPEN_DB;
  let db = existingDb || null;
  if (!db) {
    const dbResult = await safeAwait(openVdgDb(), IDB_OP_TIMEOUT_MS, null, 'repo-init:openVdgDb');
    if (dbResult.ok) { db = dbResult.value; onDbOpen?.(db); }
    else if (currentSalesRepId() !== 'NOT_PROVISIONED') {
      throw new Error(`IDB open failed: ${dbResult.error?.message}`); // fatal outside onboarding — WASM repo needs it
    }
  }
  window.__vdg_db = db;

  // 3. Load WASM — mandatory, no fallback. Must run BEFORE any license check (both branches
  // below call into WASM to verify) — this fixed a latent hang on the NOT_PROVISIONED branch.
  stepRef.value = STEP_WASM_INIT;
  const wasmMod = await import(new URL('pkg/vdg_freight.js', document.baseURI).href);
  await wasmMod.default();
  window.__vdg_wasm = wasmMod;
  window.dispatchEvent(new Event('vdg:wasm-ready'));

  // 4. NOT_PROVISIONED → first-run manager provisioning, then reload into the ordinary licence
  // gate below (F-17-03: a bundled licence has no per-role provisioning screen left to show).
  if (currentSalesRepId() === 'NOT_PROVISIONED') {
    stepRef.value = STEP_WORKSPACE_CHK;
    await runFirstRunProvision(driveApi, activeWorkspaceName());
    // Workspace + admin/ now exist — the NOT_PROVISIONED role cached before creation would
    // otherwise survive up to ROLE_CACHE_TTL_MS and stall the reload button on this screen.
    clearRoleCache();
    location.reload(); // admin/ now exists -> this user resolves Manager on reload, then hits
    return null;        // the normal licence gate below like any other boot (F-17-03)
  }

  // AC-03 test seam
  if (_hangMs > 0) await new Promise((r) => setTimeout(r, _hangMs));

  // 5. Build repo — WASM only, IDB-first reads
  stepRef.value = STEP_BUILD_REPO;
  const ioPort = new WasmIoPort(db, driveApi, user.email);
  const repo   = new wasmMod.WasmEntityRepo(ioPort);
  window.__vdg_repo      = repo;
  window.__vdg_drive_api = driveApi;

  // 6. Initial user identity (no network, instant)
  const initialRole = isManager() ? 'Manager' : (currentSalesRepId() || 'ReadOnly');
  window.__vdg_current_user = {
    email:        user.email,
    role:         initialRole,
    sales_prefix: isManager() ? null : currentSalesRepId(),
  };

  // 7. License gate — enforced for EVERY role, no branch (AC-01..07).
  stepRef.value = STEP_LICENSE_GATE;
  const gate = new LicenseGate(prefsLicenseStore(db));
  const app  = document.getElementById('app');
  const gateResult = await runLicenseGate({ gate, container: app });
  if (!gateResult.proceed) return null;

  // 8. RENDER — everything past this point is non-blocking
  stepRef.value = STEP_BOOT_APP;
  bootFn(user, db);

  // 9. Deferred init (fire-and-forget)
  _deferredInit(user, db, driveApi, repo);

  return { db, poller: null, auditLog: null };
}

// ── Deferred Background Init ──────────────────────────────────────────────────
// Runs after bootFn → view is already rendered.
// Errors are logged, never crash the app.

async function _deferredInit(user, db, driveApi, repo) {
  try {
    // Locale from user prefs (may switch from 'vi' to user pref)
    if (db) {
      const prefsResult = await safeAwait(
        idbGet(db, META_STORE, PREFS_META_KEY),
        IDB_OP_TIMEOUT_MS, null, 'deferred:idbGet-prefs',
      );
      const locale = prefsResult.ok ? (prefsResult.value?.locale || 'vi') : 'vi';
      if (locale !== 'vi') await loadLocale(locale);
    }

    // Delta poller
    const { DeltaPoller } = await import('../sync/delta-poll.js');
    const poller = new DeltaPoller(driveApi, db);
    poller.start();

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
      repo, driveApi, db,
      () => driveApi.findWorkspaceRoot(activeWorkspaceName()), masterScopePrefix,
    ).catch((err) => console.warn('[VDG] master-scope migration error:', err.message)); // DEV

    // Error log
    const { initErrorLog } = await import('../sync/error-log.js');
    initErrorLog(driveApi, () => window.__vdg_auth?.getCurrentUser?.(), () => APP_VERSION);

    // Dunning
    const { initDunningLog } = await import('../sync/dunning-log.js');
    initDunningLog(driveApi);
    const { initDunningScheduler } = await import('../sync/dunning-scheduler.js');
    initDunningScheduler(repo);

    // Ledger + user repos — wrap so every injected findWorkspaceRootFn resolves the
    // registry-bound name (F-17-03: findWorkspaceRoot takes a required explicit name).
    const findWorkspaceRoot = () => driveApi.findWorkspaceRoot(activeWorkspaceName());

    const { LedgerDriveRepo } = await import('../implementations/ledger-drive-repo.js');
    const ledgerRepo = new LedgerDriveRepo(driveApi, findWorkspaceRoot);
    window.__vdg_ledger_repo = ledgerRepo;

    const { UserAuditLog } = await import('../sync/user-audit-log.js');
    const userAuditLog = new UserAuditLog(
      () => window.__vdg_auth?.getCurrentUser?.(),
    );
    window.__vdg_user_audit_log = userAuditLog;

    const { UserDriveRepo } = await import('../implementations/user-drive-repo.js');
    const userRepo = new UserDriveRepo(driveApi, findWorkspaceRoot, userAuditLog);
    window.__vdg_user_repo = userRepo;

    const { RoleAssignmentService } = await import('../operators/manager/role-assignment-service.js');
    window.__vdg_role_assignment_service = new RoleAssignmentService(
      driveApi, userRepo, findWorkspaceRoot, null, userAuditLog,
    );

    // Resolve actual user role (async, updates window.__vdg_current_user)
    userRepo.get(user.email).then((record) => {
      window.__vdg_current_user.role         = resolveUserRole(record);
      window.__vdg_current_user.sales_prefix = record?.sales_prefix ?? null;
    }).catch(() => {});

    // Manager-specific background tasks
    if (isManager()) {
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
  const WARM_KINDS = [
    'shipment', 'pnl_line', 'billing', 'approval_request', 'customers',
    'exception', 'quotation', 'commission_rules', 'users',
  ];
  Promise.all(WARM_KINDS.map((k) => repo.list(k, null))).catch(() => {});
  prefetchDashboard(repo).catch(() => {});
}
