import './components/sidebar.js';
import './components/topbar.js';
import './components/wizard-stepper.js';
import './components/status-badge.js';
import './components/kpi-card.js';
import './components/upload-zone.js';
import './components/cutoff-timer.js';
import './components/detail-panel.js';
import './components/print-button.js';
import './components/offline-banner.js';
import './components/orphan-folder-banner-element.js';
import './components/cmd-palette.js';
import { initRouter, navigate } from './router.js';
// WASM is loaded in boot/repo-init-steps.js critical path (before bootApp)
import { requireAuth, currentSalesRepId, isManager } from './auth/auth-gate.js';
import { enforceRouteGuard, currentUserRole, ROLE_MANAGER } from './operators/manager/route-guard.js';
import { initGoogleSignIn, requestDriveScopeGrant } from './auth/google-oauth.js';
import { renderDriveAccessGateScreen, DRIVE_ACCESS_REASON_SCOPE, DRIVE_ACCESS_REASON_PERMISSION, DRIVE_ACCESS_REASON_TRANSIENT }
  from './views/auth/drive-access-gate-screen.js';
import { DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT, DRIVE_ERROR_KIND_FILE_PERMISSION } from './auth/drive-error-classifier.js';
import { loadLocale, t } from './i18n/index.js';
import { tryParamRoute }       from './app-router-ext.js';
import { loadView }            from './util/view-loader.js';
import { initKeyboardShortcuts } from './keyboard-shortcuts.js';
import { checkVersionBanner, initBreakpointListener, initWmaListener } from './app-events.js';
import { initTokenRefresh, initAccessTokenRefresh } from './auth/token-refresh.js';
import { VIEWS } from './app-views.js';
import { runRepoInit, RepoInitTimeoutError } from './boot/repo-bootstrap.js';
import { activeWorkspaceName } from './operators/workspace-registry.js';
import { renderRepoInitTimeoutBanner } from './boot/repo-init-fallback.js';
import './sync/job-tracker.js'; // Start background job tracker

// F-14-16 breakpoint constants
const BREAKPOINT_TABLET_PX  = 768;
const BREAKPOINT_DESKTOP_PX = 1280; // eslint-disable-line no-unused-vars
const TOUCH_TARGET_MIN_PX   = 44;   // eslint-disable-line no-unused-vars

// F-14-20 version constants (OQ-B4-8: CI inject in E-15)
const NEW_FEATURE_BANNER_DAYS = 7;

// ── theme init ────────────────────────────────────────────────────────────────
// Dark mode is disabled: the view layer has no dark: variants, so a `.dark` root
// renders dark text on a dark body (unreadable) and hides typed input text. Force
// light regardless of OS preference or any stale saved pref until dark is fully built.
(function initTheme() {
  document.documentElement.classList.remove('dark');
}());

const PRINT_ROUTE_RE  = /^\/document\/([^/]+)\/print$/;
const NOTE_ROUTE_RE   = /^\/note\/([^/]+)\/(debit|credit)$/;
const BUDGET_ROUTE_RE = /^\/shipment\/([^/]+)\/budget$/;
const QUOTE_EDIT_RE   = /^\/sales\/quote\/([^/]+)\/edit$/;

const DEFAULT_ROUTE = '/dashboard';

function _viewRoot() {
  const el = document.getElementById('view-root');
  el.innerHTML = '';
  return el;
}

async function renderView(route) {
  // F-24-05: role gate before any view dispatch — admin/accounting/sales prefixes
  // redirect roles that don't belong there (toast + navigate, real ACL is Drive-side).
  const effectiveRole = isManager() ? ROLE_MANAGER : currentUserRole();
  if (enforceRouteGuard(route, effectiveRole)) return;

  const printMatch = PRINT_ROUTE_RE.exec(route);
  if (printMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/document-print.js'), root, route);
    if (!mod) return;
    await mod.render(root, printMatch[1]); return;
  }

  const noteMatch = NOTE_ROUTE_RE.exec(route);
  if (noteMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/note-print.js'), root, route);
    if (!mod) return;
    await mod.render(root, noteMatch[1], noteMatch[2]); return;
  }

  const budgetMatch = BUDGET_ROUTE_RE.exec(route);
  if (budgetMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/shipment-budget-print.js'), root, route);
    if (!mod) return;
    await mod.render(root, budgetMatch[1]); return;
  }

  const quoteEditMatch = QUOTE_EDIT_RE.exec(route);
  if (quoteEditMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/sales-quote-new.js'), root, route);
    if (!mod) return;
    await mod.render(root, quoteEditMatch[1]); return;
  }

  if (await tryParamRoute(route)) return;

  const basePath = route.split('?')[0];
  const path     = VIEWS[basePath] ? basePath : DEFAULT_ROUTE;
  const root     = _viewRoot();
  const mod      = await loadView(VIEWS[path], root, path);
  if (!mod) return;
  await mod.render(root);
}

window.addEventListener('vdg:navigate', (e) => renderView(e.detail.route));

window.addEventListener('vdg:sync-error', (e) => {
  const { kind, id } = e.detail || {};
  console.warn(`[sync] Đồng bộ thất bại: ${kind} ${id}`); // DEV
});

// F-24-17: outbox dropped a row instead of retrying forever (schema drift or a
// deleted-since-queued entity) — surface it so a "sync stuck" report isn't silent.
window.addEventListener('vdg:outbox-drop', (e) => {
  const { kind, id, reason } = e.detail || {};
  console.warn(`[outbox] dropped ${kind}/${id}: ${reason}`); // DEV
  window.dispatchEvent(new CustomEvent('vdg:toast', {
    detail: { type: 'info', message: t('topbar.sync.toast.schema_drift_drop') },
  }));
});

// Lightweight toast renderer — listens vdg:toast, auto-dismiss
(function initToastRenderer() {
  const TOAST_DEFAULT_MS = 4_000;
  const container = document.createElement('div');
  container.id        = 'vdg-toast-container';
  container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
  document.body.appendChild(container);

  window.addEventListener('vdg:toast', (e) => {
    const { message, type = 'info', duration = 3000 } = e.detail;
    const colors = {
      success: 'bg-green-600',
      error:   'bg-red-600',
      warn:    'bg-amber-500',
      info:    'bg-slate-800'
    };
    const bg = colors[type] || colors.info;
    const el = document.createElement('div');
    el.className = `fixed bottom-4 right-4 ${bg} text-white px-4 py-3 rounded shadow-lg z-[9999] opacity-0 transition-opacity duration-300`;
    el.textContent = message;
    document.body.appendChild(el);
    
    // Fade in
    requestAnimationFrame(() => el.classList.remove('opacity-0'));
    
    setTimeout(() => {
      el.classList.add('opacity-0');
      setTimeout(() => el.remove(), 300);
    }, duration);
  });

  // SW Update Notification (F-15-70)
  window.addEventListener('vdg:sw-update-available', () => {
    const el = document.createElement('div');
    el.className = `fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded shadow-lg z-[10000] flex items-center gap-4`;
    el.innerHTML = `
      <span>Có phiên bản hệ thống mới!</span>
      <button class="bg-white text-indigo-600 px-3 py-1 rounded text-sm font-semibold hover:bg-slate-100" 
              onclick="window.location.reload(true)">
        Tải lại ngay
      </button>
      <button class="text-white hover:text-slate-200 ml-2" onclick="this.parentElement.remove()">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;
    document.body.appendChild(el);
  });
}());

// renderNotProvisioned + renderLoadingBanner extracted to auth/auth-fallback-views.js (F-15-19 AC-4)

// Shared boot-error fallback mount lookup (RepoInitTimeoutError + F-24-19 Drive gate screens).
function _resolveBootFallbackMount() {
  return document.getElementById('view-loading')?.parentElement
      || document.getElementById('view-root')
      || document.getElementById('app');
}

// keyboard shortcuts extracted to keyboard-shortcuts.js — F-14-13

export function bootApp(user, db) {
  const app = document.getElementById('app');
  if (app && !app.querySelector('vdg-sidebar')) {
    app.innerHTML = `
      <vdg-sidebar></vdg-sidebar>
      <div class="flex-1 flex flex-col min-w-0">
        <vdg-topbar></vdg-topbar>
        <main id="view-root" class="flex-1 overflow-auto scrollbar-thin">
          <div id="view-loading" class="p-6 text-slate-500 text-sm">Loading view…</div>
        </main>
      </div>
      <vdg-cmd-palette></vdg-cmd-palette>`;
  }

  initBreakpointListener();
  initKeyboardShortcuts();
  checkVersionBanner(db);
  initWmaListener();
  const _repId = currentSalesRepId() || ''; // AC-02: non-manager provisioned sales → /sales/me/pnl/new
  const defaultRoute = !isManager() && _repId && _repId !== 'NOT_PROVISIONED' && _repId !== 'OTHER' ? '/sales/me/pnl/new' : DEFAULT_ROUTE;
  initRouter(defaultRoute);

  // WASM already initialized in repo-init-steps.js critical path
  if (window.__vdg_wasm?.vdg_version) {
    console.log('[VDG] WASM version:', window.__vdg_wasm.vdg_version()); // DEV
  }

  // F-15-38: FX auto-fetch (manager-only, async non-blocking)
  if (isManager()) {
    (async () => {
      try {
        const { FxRateDriveRepo } = await import('./implementations/fx-rate-drive-repo.js');
        const { initFxAutoFetch } = await import('./boot/fx-auto-fetcher-init.js');
        const api = window.__vdg_drive_api;
        if (!api) return;
        const fxRepo = new FxRateDriveRepo(api, () => api.findWorkspaceRoot(activeWorkspaceName()));
        // Pre-load workspace settings so first tick uses real fx_source
        let wsSettings = { fx_source: 'Manual' };
        try {
          const root = await api.findWorkspaceRoot(activeWorkspaceName());
          if (root) {
            const shared = await api.findFolder(root, '_shared');
            if (shared) {
              const q   = `name='workspace.json' and '${shared.id}' in parents and trashed=false`;
              const res = await api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
              const f   = res?.files?.[0];
              if (f) { const d = await api.getFile(f.id); if (d?.content) wsSettings = JSON.parse(d.content); }
            }
          }
        } catch { /* use Manual default */ }
        window.__vdg_workspace_settings = wsSettings;
        initFxAutoFetch(fxRepo, () => window.__vdg_workspace_settings ?? { fx_source: 'Manual' });
        window.__vdg_fx_auto_fetcher_init = initFxAutoFetch;
      } catch (e) { console.warn('[fx-auto-fetch] boot init failed:', e.message); } // DEV
    })();
  }

  // Debug refresh-role button hidden behind ?debug=1
  if (new URLSearchParams(location.search).get('debug') === '1') {
    const btn = document.createElement('button');
    btn.textContent = 'Refresh Role';
    btn.className   = 'fixed bottom-4 right-4 z-50 px-3 py-1 bg-slate-700 text-white text-xs rounded';
    btn.onclick     = async () => {
      const { detectRoleViaDrive } = await import('./auth/auth-gate.js');
      await detectRoleViaDrive(user, { force: true });
      location.reload();
    };
    document.body.appendChild(btn);
  }

  const initialRoute = location.hash.slice(1) || defaultRoute;
  renderView(initialRoute);

  // Background pre-fetch AI model for semantic search (delay 2s to prioritize UI render)
  setTimeout(async () => {
    try {
      const { preloadModel } = await import('./cache/semantic-search.js');
      preloadModel();
    } catch (e) {
      console.warn('[SemanticSearch] Preload failed:', e); // DEV
    }
  }, 2000);
}

async function main() {
  // Step 1: Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/sw.js', { scope: '/' }).catch(console.warn); // DEV
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'VDG_SW_UPDATE_AVAILABLE')
        window.dispatchEvent(new CustomEvent('vdg:sw-update-available'));
    });
    // Auto-reload once when a newly-deployed SW takes control — only if a controller already
    // existed (skip on first-ever load so we don't reload a fresh visit). Guarded against loops.
    if (navigator.serviceWorker.controller) {
      let _reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (_reloading) return;
        _reloading = true;
        location.reload();
      });
    }
  }

  // Step 2: Init OAuth + silent token refresh (F-15-02)
  initGoogleSignIn(null, null).catch(() => { /* offline — gate handles display */ });
  initTokenRefresh();
  initAccessTokenRefresh();                          // F-29-13: proactive access-token scheduler + reconnect listener

  // Load locale before requireAuth so fallback banners render with real text.
  try { await loadLocale('vi'); }
  catch (err) { console.warn('[VDG] i18n early load failed, key-fallback:', err.message); } // DEV

  try {
    await requireAuth((user) => runRepoInit(user, bootApp));
  } catch (err) {
    // AC-07: RoleProbeTimeoutError → existing legacy renderLoadingBanner (F-15-19 path preserved)
    if (err?.name === 'RoleProbeTimeoutError') {
      const { renderLoadingBanner } = await import('./auth/auth-fallback-views.js');
      renderLoadingBanner(document.getElementById('app'));
      return;
    }
    // AC-03: repo-init hang → actionable banner with Retry
    if (err?.name === 'RepoInitTimeoutError') {
      const mount = _resolveBootFallbackMount();
      renderRepoInitTimeoutBanner(mount, () => {
        const user = window.__vdg_auth?.getCurrentUser?.();
        runRepoInit(user, bootApp);
      });
      return;
    }
    // AC-03/AC-08/AC-09: Drive scope never granted at consent — no doomed Drive request was
    // fired (auth-gate's guard threw before one could be). Re-consent button reuses the same
    // popup; decline-again re-renders with a visible hint instead of looping silently.
    if (err?.name === 'DriveApiError' && err.driveErrorKind === DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT) {
      const mount  = _resolveBootFallbackMount();
      const render = (declinedAgain) => renderDriveAccessGateScreen(mount, {
        reason: DRIVE_ACCESS_REASON_SCOPE, declinedAgain,
        onRequestScope: () => requestDriveScopeGrant(
          () => location.reload(),   // AC-08: scope acquired — resume boot
          () => render(true),        // AC-09: declined again — visible feedback, not a no-op
        ),
      });
      render(false);
      return;
    }
    // AC-06: file/folder-permission 403 (scope IS granted) — distinct screen, flag never
    // cleared, no re-consent offered (that would not fix a permission problem).
    if (err?.name === 'DriveApiError' && err.driveErrorKind === DRIVE_ERROR_KIND_FILE_PERMISSION) {
      renderDriveAccessGateScreen(_resolveBootFallbackMount(), { reason: DRIVE_ACCESS_REASON_PERMISSION });
      return;
    }
    // F-24-19: any other DriveApiError (transport/5xx/quota) — Drive unreachable, not "workspace absent". Retry screen, reload re-runs boot.
    if (err?.name === 'DriveApiError') {
      renderDriveAccessGateScreen(_resolveBootFallbackMount(), { reason: DRIVE_ACCESS_REASON_TRANSIENT });
      return;
    }
    throw err;
  }
}

main();

export { navigate };
