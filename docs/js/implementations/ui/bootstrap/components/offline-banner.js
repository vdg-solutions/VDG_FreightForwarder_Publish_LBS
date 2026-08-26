// offline-banner.js — offline strip element + view-mount recovery card.
// Lit is imported lazily (F-29-07 pattern): a top-level https: import blocks Node's ESM
// loader for anything that transitively loads this file (view-fallback → mount-view), so
// the CDN import lives inside _defineOfflineBanner() and the element upgrades once Lit loads.
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const LIT_CDN_URL  = 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
const BANNER_MSG   = 'Working offline — changes saved locally, will sync when reconnected';
const BANNER_Z     = 50;
const DISMISS_DELAY_MS = 2000;

async function _defineOfflineBanner() {
  if (customElements.get('vdg-offline-banner')) return;
  const { LitElement, html } = await import(LIT_CDN_URL);

  class VdgOfflineBanner extends LitElement {
    static properties = {
      _offline: { type: Boolean, state: true },
      _visible: { type: Boolean, state: true },
    };

    createRenderRoot() { return this; }

    constructor() {
      super();
      this._offline = !navigator.onLine;
      this._visible = !navigator.onLine;
      this._onOnline  = () => this._handleOnline();
      this._onOffline = () => this._handleOffline();
      this._hideTimer = null;
    }

    connectedCallback() {
      super.connectedCallback();
      window.addEventListener('online',  this._onOnline);
      window.addEventListener('offline', this._onOffline);
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      window.removeEventListener('online',  this._onOnline);
      window.removeEventListener('offline', this._onOffline);
      clearTimeout(this._hideTimer);
    }

    _handleOffline() {
      clearTimeout(this._hideTimer);
      this._offline = true;
      this._visible = true;
    }

    _handleOnline() {
      this._offline = false;
      // Brief "back online" feedback before hiding
      this._hideTimer = setTimeout(() => { this._visible = false; }, DISMISS_DELAY_MS);
    }

    render() {
      if (!this._visible) return html``;
      const isOffline = this._offline;
      return html`
        <div
          role="status"
          aria-live="polite"
          style="z-index:${BANNER_Z}"
          class="fixed top-0 left-0 right-0 flex items-center justify-center gap-2.5 px-4 py-2 text-sm font-medium pointer-events-none
                 ${isOffline ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-white/70 ${isOffline ? 'animate-pulse' : ''}"></span>
          ${isOffline ? BANNER_MSG : 'Back online — syncing…'}
        </div>
      `;
    }
  }

  customElements.define('vdg-offline-banner', VdgOfflineBanner);
}

// Browser-only: register the element. Skipped under node --test (no customElements).
if (typeof customElements !== 'undefined') {
  _defineOfflineBanner().catch((e) => console.error('[offline-banner] Lit load failed:', e)); // DEV
}

// ── view-mount recovery card (F-19-17) ────────────────────────────────────────
// Reused by view-fallback: paints an honest, user-clicked recovery state INTO
// #view-root. The fixed <vdg-offline-banner> strip above is pointer-events-none and
// cannot host the click, so recovery lives here as an exported render fn that reuses
// the same offline/online state signalling. No cache-bust, no auto re-navigate.
const RETRY_BTN_ID      = 'view-mount-retry-btn';
const RETRY_BTN_TESTID  = 'view-mount-retry';
const RELOAD_BTN_ID     = 'view-mount-reload-btn';
const RELOAD_BTN_TESTID = 'view-mount-reload';

export function renderViewMountRecovery(root, { route, offline, exhausted, reason, onRetry, onReload }) {
  // reason: 'network' — the chunk's URL itself 404/503'd (stale hash vs a moved-on build), not
  // just "still waiting". Offline still wins the message (the real cause when both are true).
  const bodyKey = offline ? 'view_mount_failed_offline'
                : reason === 'network' ? 'view_mount_failed_network'
                : exhausted ? 'view_mount_failed_persist'
                : 'view_mount_failed_body';
  // Retry re-runs the SAME route/import — useless against a stale hash that's genuinely gone.
  // Reload is the real fix for that case (see view-fallback.js's _healOrReload), so only offer
  // it when there's a network reason to believe a reload would actually change anything.
  const showReload = !offline && reason === 'network';
  root.innerHTML = `
    <div data-testid="view-mount-recovery" data-route="${route}"
         class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-lg font-semibold text-slate-700">${t('view_mount_failed_title')}</div>
      <div class="text-sm text-slate-500">${t(bodyKey)}</div>
      <div class="flex gap-2 mt-2">
        <button id="${RETRY_BTN_ID}" data-testid="${RETRY_BTN_TESTID}"
                class="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          ${t('view_mount_retry')}
        </button>
        ${showReload ? `<button id="${RELOAD_BTN_ID}" data-testid="${RELOAD_BTN_TESTID}"
                class="px-4 py-2 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">
          ${t('view_mount_reload')}
        </button>` : ''}
      </div>
    </div>`;
  root.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener('click', () => onRetry());
  if (showReload) root.querySelector(`#${RELOAD_BTN_ID}`)?.addEventListener('click', () => onReload());
}
