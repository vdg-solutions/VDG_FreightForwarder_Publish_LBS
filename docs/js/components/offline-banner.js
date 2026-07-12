import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

const BANNER_MSG   = 'Working offline — changes saved locally, will sync when reconnected';
const BANNER_Z     = 50;
const DISMISS_DELAY_MS = 2000;

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
