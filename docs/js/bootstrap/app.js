import '../implementations/ui/bootstrap/components/sidebar.js';
import '../implementations/ui/bootstrap/components/topbar.js';
import '../implementations/ui/bootstrap/components/wizard-stepper.js';
import '../implementations/ui/bootstrap/components/status-badge.js';
import '../implementations/ui/bootstrap/components/info-tip.js';
import '../implementations/ui/bootstrap/components/kpi-card.js';
import '../implementations/ui/bootstrap/components/upload-zone.js';
import '../implementations/ui/bootstrap/components/cutoff-timer.js';
import '../implementations/ui/bootstrap/components/detail-panel.js';
import '../implementations/ui/bootstrap/components/print-button.js';
import '../implementations/ui/bootstrap/components/offline-banner.js';
import '../implementations/ui/bootstrap/components/cmd-palette.js';
import { initRouter, navigate } from '../implementations/ui/bootstrap/router.js';
// WASM is loaded in boot/repo-init-steps.js critical path (before bootApp)
import { requireAuth } from '../implementations/ui/core_abstractions/ports/auth/auth-gate.js';
import { currentSalesRepId, hasRole } from '../implementations/ui/core_abstractions/ports/auth/session-roles.js';
import { ROLE_MANAGER } from '../implementations/ui/core_abstractions/roles.js';
import { renderLoginPage } from '../implementations/ui/bootstrap/views/login.js';
import { createPlatform } from './platform/index.js';
import { composeAuth } from './compose-ui/auth.js';
import { configureAuthPlatform, mountLoginScreen } from './platform/auth.js';

import { composeStorage } from '../implementations/storage/bootstrap/compose.js';
import '../implementations/kernel/bootstrap/compose.js'; // binds kernel platform ports
import { currentUserRole, currentUserRoles, normalizeRole, homeRouteForRole } from '../implementations/ui/core_abstractions/ports/governance/route-guard.js';
import { enforceRouteGuard } from '../implementations/ui/bootstrap/route-enforcer.js';
import { initGoogleSignIn } from '../implementations/storage/core_abstractions/oauth.js';
import { renderServerGate } from './boot/server-gate.js';
import { loadLocale, t } from '../implementations/kernel/core_abstractions/i18n/index.js';
import { tryParamRoute }       from './app-router-ext.js';
import { loadView }            from '../implementations/ui/bootstrap/util/view-loader.js';
import { mountView }           from '../implementations/ui/bootstrap/util/mount-view.js';
import { freshViewRoot }       from '../implementations/ui/bootstrap/util/view-root.js';
import { initKeyboardShortcuts } from '../implementations/ui/bootstrap/keyboard-shortcuts.js';
import { checkVersionBanner, initBreakpointListener, initWmaListener, initConflictModal, initMergeToast, initStoreLockedScreen } from '../implementations/ui/bootstrap/app-events.js';
import { initAccessTokenRefresh } from '../implementations/storage/implementations/auth/token-refresh.js';
import { VIEWS } from './app-views.js';
import { runRepoInit, RepoInitTimeoutError } from './boot/repo-bootstrap.js';
import { renderRepoInitTimeoutBanner } from './boot/repo-init-fallback.js';
import { initMigrationOverlay } from '../implementations/ui/bootstrap/migration-overlay.js';
import './platform/sync-schedulers.js'; // Start background job tracker

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
  // #15: normalize — boot stamps the rep prefix as role until the staff table resolves.
  // #28: the guard takes the whole SET. Boot window (staff table not resolved yet) falls back to
  // the normalized single role so a real rep is not bounced on every cold start.
  const roles = currentUserRoles();
  const effectiveRole = roles.length ? roles : [normalizeRole(currentUserRole())];
  if (enforceRouteGuard(route, effectiveRole)) return;

  const printMatch = PRINT_ROUTE_RE.exec(route);
  if (printMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('../implementations/ui/bootstrap/views/document-print.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, printMatch[1]), root, route); return;
  }

  const noteMatch = NOTE_ROUTE_RE.exec(route);
  if (noteMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('../implementations/ui/bootstrap/views/note-print.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, noteMatch[1], noteMatch[2]), root, route); return;
  }

  const budgetMatch = BUDGET_ROUTE_RE.exec(route);
  if (budgetMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('../implementations/ui/bootstrap/views/shipment-budget-print.js'), root, route);
    if (!mod) return;
    await mountView(() => mod.render(root, budgetMatch[1]), root, route); return;
  }

  const quoteEditMatch = QUOTE_EDIT_RE.exec(route);
  if (quoteEditMatch) {
    const root = _viewRoot();
    const mod  = await loadView(() => import('../implementations/ui/bootstrap/views/sales-quote-new.js'), root, route);
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
  // E-43: this logged `${kind} ${id}` and the drain never sends an `id` — every sync failure read
  // as "<kind> undefined" and carried no diagnosis at all, while the event had the reason and the
  // raw Drive error in it the whole time. Hours went into re-deriving what was already in hand.
  const { kind, period, reason, error } = e.detail || {};
  console.warn(`[sync] Đồng bộ thất bại: ${kind}${period ? `/${period}` : ''} — ${reason || 'không rõ'}`,
    error || ''); // DEV
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
      const { detectRoleViaServer } = await import('../implementations/ui/core_abstractions/ports/auth/auth-gate.js');
      await detectRoleViaServer(user, { force: true });
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

async function loadWasmModule() {
  if (window.__vdg_wasm) return window.__vdg_wasm;
  try {
    const mod = await import(new URL('pkg/vdg_freight.js?v=b1a8524', document.baseURI).href);
    const wasmUrl = new URL('pkg/vdg_freight_bg.wasm?v=b1a8524', document.baseURI).href;
    await mod.default({ module_or_path: wasmUrl });
    window.__vdg_wasm = mod;
    return mod;
  } catch (err) {
    if (err instanceof LinkError || err?.name === 'LinkError' || String(err).includes('LinkError')) {
      console.warn('[VDG] WebAssembly LinkError detected (stale cache mismatch). Purging caches and reloading...');
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (!sessionStorage.getItem('__wasm_link_reloaded')) {
        sessionStorage.setItem('__wasm_link_reloaded', '1');
        location.reload();
        return new Promise(() => {});
      }
    }
    throw err;
  }
}

async function main() {
  // Every auth decision is a wasm call, so the bundle must be in flight before the gate runs.
  // Kicked off first so it overlaps the locale + storage awaits below instead of adding to them.
  const wasmReady = loadWasmModule();
  initMigrationOverlay(); // "syncing data" overlay listens for migration start/done events
  initStoreLockedScreen(); // before any store op — an old-build tab holding OPFS must surface, not starve boot
  // SW registration lives solely in sw-register.js (invoked from index.html).
  // Init OAuth + silent token refresh (F-15-02)
  initGoogleSignIn(null, null).catch(() => { /* offline — gate handles display */ });
  initAccessTokenRefresh({                           // reconnect-chip listener only (no proactive refresh)
    onReconnected: async (user) => {                 // the app's role re-resolve, injected — the adapter never imports the gate
      const { detectRoleViaServer } = await import('../implementations/ui/core_abstractions/ports/auth/auth-gate.js');
      await detectRoleViaServer(user, { force: true });
    },
  });

  // Load locale before requireAuth so fallback banners render with real text.
  try { await loadLocale('vi'); }
  catch (err) { console.warn('[VDG] i18n early load failed, key-fallback:', err.message); } // DEV

  try {
    await composeStorage(); // which storage authority this page talks to — decided once, before anything reads it
    // The gate's decisions are wasm now, so the module has to be up before it is asked anything.
    // Started at the top of main() so the fetch overlaps the locale + storage awaits above; boot's
    // own wasm step then finds it loaded.
    const wasm = await wasmReady;
    wasm.freight_app_init(createPlatform({ repo: null, currentUser: () => window.__vdg_current_user || null }));
    configureAuthPlatform({ renderLoginPage }); // the gate mounts the login VIEW through this hook
    composeAuth(wasm);
    await requireAuth((user) => runRepoInit(user, bootApp));
  } catch (err) {
    // AC-07: RoleProbeTimeoutError → existing legacy renderLoadingBanner (F-15-19 path preserved)
    if (err?.name === 'RoleProbeTimeoutError') {
      const { renderLoadingBanner } = await import('../implementations/ui/bootstrap/views/auth/auth-fallback-views.js');
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
    if (renderServerGate(_resolveBootFallbackMount(), err, {
      onReconnected:  () => location.reload(),
      serverBackend:  true,
      onSignIn:       () => mountLoginScreen(() => location.reload()),
    })) {
      console.error('[VDG] boot stopped on Server', err.status, err.message); // DEV
      return;
    }
    throw err;
  }
}

main();

export { navigate };
