// Post-OAuth repo-init chain — "IDB-first, render-first, sync-later"
// Critical path: IDB open → WASM init → repo build → license gate → RENDER

import { currentSalesRepId, currentRoles } from '../../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { forkId } from '../../implementations/kernel/core_abstractions/util/fork-id.js';
import { ROLE_READ_ONLY } from '../../implementations/ui/core_abstractions/roles.js';
import { safeAwait } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { createIoPort } from '../../implementations/storage/bootstrap/compose.js';
import { createPlatform } from '../platform/index.js';
import { composeUi } from '../compose-ui/index.js';
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';

const SENTINEL_TOKEN = /^__.*__$/;

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

const IDB_OP_TIMEOUT_MS  = 8000;
const PREFS_META_KEY     = 'preferences';
const REPO_HANG_SEAM_KEY = 'vdg.test.repoHangMs';

const STEP_OPEN_DB       = 'openVdgDb';
const STEP_WASM_INIT     = 'wasm-init';
const STEP_BUILD_REPO    = 'build-repo-stack';
const STEP_LICENSE_GATE  = 'license-gate';
const STEP_BOOT_APP      = 'bootApp';

export async function runRepoInitBounded(user, stepRef, bootFn, existingDb, onDbOpen) {
  const _hangMs = parseInt(localStorage.getItem(REPO_HANG_SEAM_KEY) || '0', 10);
  const fsm = createBootFsm(renderBootPhase);

  // 1. Storage is SQLite/OPFS in a worker
  stepRef.value = STEP_OPEN_DB;
  const db = null;
  fsm.dispatch(BootEvent.DB_OPENED);

  // 2. Load WASM
  stepRef.value = STEP_WASM_INIT;
  const wasmMod = await import(new URL('pkg/vdg_freight.js?v=580f1ad', document.baseURI).href);
  const wasmUrl = new URL('pkg/vdg_freight_bg.wasm?v=580f1ad', document.baseURI).href;
  await wasmMod.default({ module_or_path: wasmUrl });
  window.__vdg_wasm = wasmMod;
  globalizeBridgeExports(wasmMod);
  window.dispatchEvent(new Event('vdg:wasm-ready'));

  fsm.dispatch(BootEvent.WASM_READY);

  if (_hangMs > 0) await new Promise((r) => setTimeout(r, _hangMs));

  // 3. Build repo 
  stepRef.value = STEP_BUILD_REPO;
  setStoreScope(user.email);
  const serverApi = storageApi(); // Use storageApi to get server API
  const ioPort = createIoPort(serverApi, user.email, _forkPrefixFromSession());
  
  safeAwait(ioPort.cache_get_meta('__warm'), IDB_OP_TIMEOUT_MS, null, 'repo-init:sqlite-warm')
    .then((r) => {
      if (!r.ok) window.dispatchEvent(new CustomEvent('vdg:store-locked', { detail: { reason: 'sqlite-warm timeout' } }));
    });
    
  const repo = new wasmMod.WasmEntityRepo(ioPort);
  window.__vdg_repo      = repo;
  window.__vdg_server_api = serverApi;
  window.__vdg_store     = localStore();
  window.__vdg_io        = ioPort;

  // 4. Initial user identity
  const roles = currentRoles();
  window.__vdg_current_user = {
    email: user.email,
    role:  roles[0] || ROLE_READ_ONLY,
    roles,
    fork:  forkId(user.email),
  };

  // 5. Attach Platform & Compose UI
  wasmMod.freight_app_init(createPlatform({ repo, currentUser: () => window.__vdg_current_user || null }));
  composeUi(wasmMod);

  await safeAwait(rehydrateFsmStates(repo), IDB_OP_TIMEOUT_MS, null, 'fsm-rehydrate');

  // 6. License gate
  fsm.dispatch(BootEvent.REPO_BUILT);
  stepRef.value = STEP_LICENSE_GATE;
  const app  = document.getElementById('app');
  const gateResult = await runLicenseGate({ container: app });
  if (!gateResult.proceed) { fsm.dispatch(BootEvent.LICENSE_GATE); return null; }

  // 7. RENDER
  fsm.dispatch(BootEvent.LICENSE_OK);
  stepRef.value = STEP_BOOT_APP;
  bootFn(user, db);
  fsm.dispatch(BootEvent.RENDERED);

  // 8. Deferred init
  _deferredInit(user, db, serverApi, repo);

  return { db, poller: null, auditLog: null };
}

async function _deferredInit(user, db, serverApi, repo) {
  const store = localStore();
  try {
    if (store) {
      const prefsResult = await safeAwait(
        store.cache_get_meta(PREFS_META_KEY),
        IDB_OP_TIMEOUT_MS, null, 'deferred:prefs',
      );
      const locale = prefsResult.ok ? (prefsResult.value?.locale || 'vi') : 'vi';
      if (locale !== 'vi') await loadLocale(locale);
    }

    const { startDeltaTick, startOutboxDrain } = await import('../platform/sync-schedulers.js');
    startDeltaTick({ getRepo: () => repo });
    startOutboxDrain({ getRepo: () => repo });

    const { createAuditLog, createUserAuditLog, installErrorLog } = await import('../platform/sync-trails.js');
    window.__vdg_audit_log = createAuditLog({
      getUser: () => window.__vdg_auth?.getCurrentUser?.(),
      getRole: () => currentSalesRepId(),
    });

    installErrorLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.(), getVersion: () => APP_VERSION });

    const { startDueSoonChecker } = await import('../platform/sync-due-soon.js');
    startDueSoonChecker({ getSalesId: () => currentSalesRepId() });

    const userAuditLog = createUserAuditLog({ getUser: () => window.__vdg_auth?.getCurrentUser?.() });
    window.__vdg_user_audit_log = userAuditLog;

    const { UserStoreRepo: UserServerRepo } = await import('../../implementations/storage/implementations/repos/user-repo.js');
    const userRepo = new UserServerRepo(userAuditLog);
    window.__vdg_user_repo = userRepo;

    userRepo.get(user.email).then((record) => {
      const resolved = (Array.isArray(record?.roles) ? record.roles : []).filter(Boolean);
      window.__vdg_current_user.roles = resolved;
      window.__vdg_current_user.role  = resolved[0] || resolveUserRole(record);
      window.__vdg_current_user.fork  = record?.fork || forkId(user.email);
    }).catch(() => {});

  } catch (err) {
    console.warn('[VDG] deferred init error:', err.message);
  }
}

function wasm() { return window.__vdg_wasm; }
