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
import { requireAuth, currentSalesRepId, hasRole, ROLE_MANAGER } from './auth/auth-gate.js';
import { enforceRouteGuard, currentUserRole, currentUserRoles, normalizeRole, homeRouteForRole } from './operators/manager/route-guard.js';
import { initGoogleSignIn, requestDriveScopeGrant } from './auth/google-oauth.js';
import { renderDriveGate } from './boot/drive-gate.js';
import { loadLocale, t } from './i18n/index.js';
import { tryParamRoute }       from './app-router-ext.js';
import { loadView }            from './util/view-loader.js';
import { mountView }           from './util/mount-view.js';
import { freshViewRoot }       from './util/view-root.js';
import { initKeyboardShortcuts } from './keyboard-shortcuts.js';
import { checkVersionBanner, initBreakpointListener, initWmaListener, initConflictModal, initMergeToast, initStoreLockedScreen } from './app-events.js';
import { initAccessTokenRefresh } from './auth/token-refresh.js';
import { VIEWS } from './app-views.js';
import { runRepoInit, RepoInitTimeoutError } from './boot/repo-bootstrap.js';
import { renderRepoInitTimeoutBanner } from './boot/repo-init-fallback.js';
import { initMigrationOverlay } from './boot/migration-overlay.js';
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

// F-19-16: acquire a FRESH #view-root per navigation (latest-wins). A superseded render still
// holds its now-detached old element, so its late innerHTML write lands on an orphan node.
function _viewRoot() {
  return freshViewRoot();
}

async function renderView(route) {
  // F-24-05: role gate before any view dispatch — admin/accounting/sales prefixes
  // redirect roles that don't belong there (toast + navigate, real ACL is Drive-side).
  // #15: normalize — boot stamps the rep prefix as role until users.jsonl resolves.
  // #28: the guard takes the whole SET. Boot window (users.jsonl not resolved yet) falls back to
  // the normalized single role so a real rep is not bounced on every cold start.
  const roles = currentUserRoles();
  const effectiveRole = roles.length ? roles : [normalizeRole(currentUserRole())];
  if (enforceRouteGuard(route, effectiveRole)) return;

  const printMatch = PRINT_ROUTE_RE.exec(route);
  if (printMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/document-print.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, printMatch[1]), root, route); return;
  }

  const noteMatch = NOTE_ROUTE_RE.exec(route);
  if (noteMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/note-print.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, noteMatch[1], noteMatch[2]), root, route); return;
  }

  const budgetMatch = BUDGET_ROUTE_RE.exec(route);
  if (budgetMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/shipment-budget-print.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, budgetMatch[1]), root, route); return;
  }

  const quoteEditMatch = QUOTE_EDIT_RE.exec(route);
  if (quoteEditMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('./views/sales-quote-new.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, quoteEditMatch[1]), root, route); return;
  }

  if (await tryParamRoute(route)) return;

  const basePath = route.split('?')[0];
  // #15: unmatched-route fallback is per-role — the old blanket DEFAULT_ROUTE ('/dashboard')
  // handed the manager dashboard shell to roles the guard would never let navigate there.
  const path     = VIEWS[basePath] ? basePath : homeRouteForRole(effectiveRole);
  const root     = _viewRoot();
  const mod      = await loadView(VIEWS[path], root, path);
  if (!mod) return;
  await mountView(() => mod.render(root), root, path);
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

// Lightweight toast renderer — listens vdg:toast, auto-dismiss.
//
// F-57-02: toasts now go INTO #vdg-toast-container. The container was created here and then
// never used — every toast was appended straight to <body> with its own `fixed bottom-4
// right-4`, so two toasts landed on the exact same pixel and only the last one was readable.
// The flex column + gap the container already declared is the whole fix; individual toasts
// just have to stop positioning themselves. This got more visible once F-57-01 added the
// /manager route guard, which raises how often a denial toast fires.
(function initToastRenderer() {
  const TOAST_DEFAULT_MS  = 4_000;
  const TOAST_FADE_MS     = 300;  // must match `duration-300` below
  const TOAST_MAX_VISIBLE = 4;    // beyond this the oldest is retired early, never a wall of toasts

  const container = document.createElement('div');
  container.id        = 'vdg-toast-container';
  container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
  document.body.appendChild(container);

  const COLORS = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    warn:    'bg-amber-500',
    info:    'bg-slate-800',
  };

  function dismiss(el) {
    if (!el.isConnected) return;
    el.classList.add('opacity-0');
    setTimeout(() => el.remove(), TOAST_FADE_MS);
  }

  window.addEventListener('vdg:toast', (e) => {
    const { message, type = 'info', duration = TOAST_DEFAULT_MS } = e.detail || {};
    if (!message) return;

    const el = document.createElement('div');
    // No `fixed`/`bottom`/`right` here — the container owns placement, the toast owns looks.
    el.className = `${COLORS[type] || COLORS.info} text-white px-4 py-3 rounded shadow-lg `
                 + 'opacity-0 transition-opacity duration-300';
    el.textContent = message;
    container.appendChild(el);

    while (container.childElementCount > TOAST_MAX_VISIBLE) dismiss(container.firstElementChild);

    requestAnimationFrame(() => el.classList.remove('opacity-0'));
    setTimeout(() => dismiss(el), duration);
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
  checkVersionBanner(window.__vdg_store);
  initWmaListener();
  initConflictModal(); // F-14-18-3 modal was defined but never mounted — vdg:conflict-detected had zero listeners
  initMergeToast();    // #14 — vdg:merge-autoresolved toast + undo
  const _repId = currentSalesRepId() || ''; // AC-02: non-manager provisioned sales → /shipments/new
  // #15: non-manager without a rep fork boots straight to their role home (pending-access for
  // ReadOnly) instead of the old blanket '/dashboard' — the guard would bounce them anyway,
  // this just skips the denial toast on every cold boot.
  const defaultRoute = !hasRole(ROLE_MANAGER) && _repId && _repId !== 'NOT_PROVISIONED' && _repId !== 'OTHER'
    ? '/shipments/new'
    : homeRouteForRole(currentUserRoles().length ? currentUserRoles() : [normalizeRole(currentUserRole())]);
  initRouter(defaultRoute);

  // WASM already initialized in repo-init-steps.js critical path
  if (window.__vdg_wasm?.vdg_version) {
    console.log('[VDG] WASM version:', window.__vdg_wasm.vdg_version()); // DEV
  }

  // F-29-11: runtime FX auto-fetch retired — rates are build-time seeded plus
  // accountant manual entry through the write-gated path. No boot fetch.

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

  // NOTE: no eager AI-model pre-fetch here. The semantic-search model is ~100MB from HuggingFace;
  // pre-fetching it 2s after render saturated the connection right as the boot's Drive data reads
  // (seed/master-scope/priced-ref migrators) ran, starving them into 8s timeouts on a slow link.
  // getEmbedding() lazy-loads the model on first real use (a PNL form's semantic search), so the
  // feature still works — it just no longer competes with boot for bandwidth.
}

async function main() {
  initMigrationOverlay(); // "syncing data" overlay listens for migration start/done events
  initStoreLockedScreen(); // before any store op — an old-build tab holding OPFS must surface, not starve boot
  // SW registration lives solely in sw-register.js (invoked from index.html).
  // Init OAuth + silent token refresh (F-15-02)
  initGoogleSignIn(null, null).catch(() => { /* offline — gate handles display */ });
  initAccessTokenRefresh();                          // reconnect-chip listener only (no proactive refresh)

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
    // AC-03: repo-init hang → actionable banner with Retry. A jammed IDB open (IdbOpenFailedError
    // from repo-init-steps) routes to the SAME banner — the slow-storage copy fits — instead of
    // falling through to a raw error; the memo was already reset so Retry genuinely re-opens.
    if (err?.name === 'RepoInitTimeoutError' || err?.name === 'IdbOpenFailedError') {
      const mount = _resolveBootFallbackMount();
      renderRepoInitTimeoutBanner(mount, () => {
        const user = window.__vdg_auth?.getCurrentUser?.();
        runRepoInit(user, bootApp);
      });
      return;
    }
    // Every Drive failure routes through one gate: scope re-consent (AC-03/08/09), file/folder
    // permission (AC-06), a dead session (401 — reconnect, NOT reload), or Drive genuinely
    // unreachable (F-24-19). The status is logged because the screen deliberately doesn't show
    // one, and a support question about it otherwise has nothing to go on.
    if (renderDriveGate(_resolveBootFallbackMount(), err, {
      onRequestScope: requestDriveScopeGrant,
      onReconnected:  () => location.reload(),   // credential is good now — re-run boot
    })) {
      console.error('[VDG] boot stopped on Drive', err.status, err.driveErrorKind || '', err.message); // DEV
      return;
    }
    throw err;
  }
}

main();

export { navigate };
