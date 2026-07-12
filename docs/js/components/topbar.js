// Topbar — route title, user avatar, sync chip, SW update banner

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { currentSalesRepId, isManager } from '../auth/auth-gate.js';
import { navigate } from '../router.js';
import { loadLocale, currentLocale, t } from '../i18n/index.js';
import { resolveBreadcrumb } from './breadcrumb-resolver.js';
import { computeChipState, shouldFireStuckNotification, renderSyncChip, buildAriaLabel } from './topbar-sync-chip.js';
import { renderModeToggle, readMode, MODE_LS_KEY } from './topbar-mode-toggle.js';
import { renderAvatar, idbSavePref, badgeLabel } from './topbar-helpers.js';

const SW_DISMISS_KEY            = 'vdg.sw.update.dismissed';
const SUPPORTED_LOCALES         = ['vi', 'en'];
const STUCK_RECHECK_INTERVAL_MS = 30_000;

class VdgTopbar extends LitElement {
  static properties = {
    route:           { type: String,  state: true },
    _exceptionCount: { type: Number,  state: true },
    _approvalCount:  { type: Number,  state: true },
    _notifCount:     { type: Number,  state: true },
    _menuOpen:       { type: Boolean, state: true },
    _outboxCount:    { type: Number,  state: true },
    _swUpdate:       { type: Boolean, state: true },
    _locale:         { type: String,  state: true },
    _mobile:         { type: Boolean, state: true },
    _quotaWarn:      { type: Boolean, state: true },
    _lastSyncMs:     { type: Number,  state: true },
    _retrying:       { type: Boolean, state: true },
    _retryStreak:    { type: Number,  state: true },
    _backoff429:     { type: Boolean, state: true },
    _online:         { type: Boolean, state: true },
    _lastError:      { type: String,  state: true },
    _lastNotifiedStuckEpisode: { type: Number, state: true },
    _breadcrumb:               { type: Object, state: true },
    _managerMode:              { type: String, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.route = location.hash.slice(1) || '/dashboard';
    this._exceptionCount = 0;  this._approvalCount = 0;
    this._notifCount = 0;   this._menuOpen = false;   this._outboxCount = 0;
    this._swUpdate = false; this._locale = currentLocale(); this._mobile = window.innerWidth < 768;
    this._quotaWarn = false; this._lastSyncMs = 0;
    this._retrying = false; this._retryStreak = 0; this._backoff429 = false;
    this._online = navigator.onLine; this._lastError = null;
    this._lastNotifiedStuckEpisode = 0; this._stuckTickId = null;
    this._breadcrumb = { group: '', view: '' }; this._managerMode = readMode();

    this._onNav           = (e) => { this.route = e.detail.route; };
    this._onSyncComplete  = (e) => {
      this._lastSyncMs = e.detail?.ts ?? Date.now(); this._retryStreak = 0;
      this._retrying = false; this._lastError = null; this._lastNotifiedStuckEpisode = 0;
    };
    this._onSyncError     = (e) => {
      this._retryStreak++; this._retrying = true;
      // F-19-20: known reason codes get a localized string; raw error text otherwise
      this._lastError = e.detail?.reason === 'max_retries'
        ? t('topbar.sync.tooltip.max_retries_reason')
        : (e.detail?.error ?? null);
    };
    this._onException     = (e) => { this._exceptionCount = e.detail.count; };
    this._onApproval      = (e) => { this._approvalCount  = e.detail?.count ?? 0; };
    this._onNotifCount    = (e) => { this._notifCount     = e.detail?.count ?? 0; };
    this._onDocClick      = (e) => { if (!this.contains(e.target)) this._menuOpen = false; };
    this._onOutbox        = (e) => { this._outboxCount = e.detail?.count ?? 0; };
    this._onSwUpdate      = () => { if (!sessionStorage.getItem(SW_DISMISS_KEY)) this._swUpdate = true; };
    this._onLocaleChanged = (e) => { this._locale = e.detail?.locale ?? currentLocale(); this._computeBreadcrumb(); };
    this._onHashChange    = () => { this._computeBreadcrumb(); };
    this._onBreakpt       = (e) => { this._mobile = e.detail.mobile; };
    this._onQuotaWarn     = () => { this._quotaWarn = true; };
    this._onOnline        = () => { this._online = true;  this._recomputeAndMaybeNotify(); };
    this._onOffline       = () => { this._online = false; this._recomputeAndMaybeNotify(); };
  }

  _computeBreadcrumb() {
    this._breadcrumb = resolveBreadcrumb(location.hash, this._locale, t);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('vdg:navigate',            this._onNav);
    window.addEventListener('vdg:exceptions',          this._onException);
    window.addEventListener('vdg:approval-count',      this._onApproval);
    window.addEventListener('vdg:notif-count',         this._onNotifCount);
    window.addEventListener('vdg:outbox-changed',      this._onOutbox);
    window.addEventListener('vdg:sw-update-available', this._onSwUpdate);
    window.addEventListener('vdg:locale-changed',      this._onLocaleChanged);
    window.addEventListener('hashchange',              this._onHashChange);
    window.addEventListener('vdg:breakpoint-changed',  this._onBreakpt);
    window.addEventListener('vdg:quota-warning',       this._onQuotaWarn);
    window.addEventListener('vdg:sync-complete',       this._onSyncComplete);
    window.addEventListener('vdg:sync-error',          this._onSyncError);
    window.addEventListener('online',  this._onOnline);
    window.addEventListener('offline', this._onOffline);
    document.addEventListener('click', this._onDocClick);
    this._stuckTickId = setInterval(() => this._recomputeAndMaybeNotify(), STUCK_RECHECK_INTERVAL_MS);
    this._computeBreadcrumb();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('vdg:navigate',            this._onNav);
    window.removeEventListener('vdg:exceptions',          this._onException);
    window.removeEventListener('vdg:approval-count',      this._onApproval);
    window.removeEventListener('vdg:notif-count',         this._onNotifCount);
    window.removeEventListener('vdg:outbox-changed',      this._onOutbox);
    window.removeEventListener('vdg:sw-update-available', this._onSwUpdate);
    window.removeEventListener('vdg:locale-changed',      this._onLocaleChanged);
    window.removeEventListener('hashchange',              this._onHashChange);
    window.removeEventListener('vdg:breakpoint-changed',  this._onBreakpt);
    window.removeEventListener('vdg:quota-warning',       this._onQuotaWarn);
    window.removeEventListener('vdg:sync-complete',       this._onSyncComplete);
    window.removeEventListener('vdg:sync-error',          this._onSyncError);
    window.removeEventListener('online',  this._onOnline);
    window.removeEventListener('offline', this._onOffline);
    document.removeEventListener('click', this._onDocClick);
    clearInterval(this._stuckTickId);
  }

  _recomputeAndMaybeNotify() {
    const now = Date.now();
    const perm = (typeof Notification !== 'undefined') ? Notification.permission : undefined;
    if (shouldFireStuckNotification({
      now, lastSyncMs: this._lastSyncMs, pending: this._outboxCount,
      lastNotifiedStuckEpisode: this._lastNotifiedStuckEpisode, permission: perm,
    })) {
      const body = t('topbar.sync.stuck.body').replace('{n}', String(this._outboxCount));
      new Notification(t('topbar.sync.stuck.title'), { body }); // eslint-disable-line no-new
      this._lastNotifiedStuckEpisode = this._lastSyncMs;
    }
    this.requestUpdate();
  }

  _handleSignOut() { window.__vdg_auth?.signOut?.(); location.reload(); }
  _handleSkipWaiting() { navigator.serviceWorker?.controller?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload(); }
  _dismissSwBanner() { sessionStorage.setItem(SW_DISMISS_KEY, '1'); this._swUpdate = false; }
  _handleBellClick() {
    window.dispatchEvent(new CustomEvent('vdg:open-notif-drawer'));
    navigate('/manager/notifications');
  }
  async _handleLocale(locale) {
    await loadLocale(locale);
    this._locale = locale; idbSavePref({ locale });
    window.dispatchEvent(new CustomEvent('vdg:locale-changed', { detail: { locale } }));
  }
  _handleHamburger() { window.dispatchEvent(new CustomEvent('vdg:sidebar-toggle')); }
  _handleModeSelect(mode) {
    localStorage.setItem(MODE_LS_KEY, mode); this._managerMode = mode;
    window.dispatchEvent(new CustomEvent('vdg:mode-change', { detail: { mode } }));
  }

  async _handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const repo = window.__vdg_repo;
    if (!repo) return;
    
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'info', message: 'Đang xử lý dữ liệu, vui lòng chờ...' } }));
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid JSON format, expected array.');
      
      let count = 0;
      for (const item of data) {
        await repo.save('shipment', item);
        count++;
        if (count % 500 === 0) {
          window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'info', message: `Đã nhập ${count}/${data.length} lô hàng...` } }));
        }
      }
      
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: `Đã nhập thành công ${count} lô hàng.` } }));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'error', message: 'Lỗi khi nhập dữ liệu: ' + err.message } }));
    }
    e.target.value = ''; // Reset input
    this._menuOpen = false;
  }

  _renderUserMenu(user, salesId) {
    if (!this._menuOpen) return html``;
    const roleLabel = isManager() ? t('topbar.role.manager') : (salesId || t('topbar.role.sales'));
    return html`
      <div class="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1"
           @click="${(e) => e.stopPropagation()}">
        <div class="px-4 py-3 border-b border-slate-100">
          <div class="text-xs font-semibold text-slate-900 truncate">${user?.name || '—'}</div>
          <div class="text-[11px] text-slate-500 truncate mt-0.5">${user?.email || ''}</div>
          <div class="mt-1.5 inline-flex px-2 py-0.5 rounded text-[10px] font-medium
                      ${isManager() ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
            ${roleLabel}
          </div>
        </div>
        <button @click="${() => { this._menuOpen = false; navigate('/background-jobs'); }}"
          class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>
          </svg>
          ${t('bg_jobs.title')}
        </button>
        
        <button @click="${() => this.querySelector('#data-upload')?.click()}"
          class="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition flex items-center gap-2">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Nhập dữ liệu (JSON)
        </button>
        <input type="file" id="data-upload" accept=".json" class="hidden" @change="${this._handleFileUpload}">

        <button @click="${this._handleSignOut}" data-testid="topbar-signout"
          class="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2 border-t border-slate-100">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          ${t('sign_out')}
        </button>
      </div>`;
  }

  _renderSwBanner() {
    if (!this._swUpdate) return html``;
    return html`
      <div class="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-xs flex items-center justify-between px-4 py-2">
        <span>${t('topbar.sw_update_body')}</span>
        <div class="flex gap-2">
          <button @click="${this._handleSkipWaiting}"
                  class="px-3 py-1 bg-white text-blue-700 rounded font-medium hover:bg-blue-50">${t('topbar.sw_update_action')}</button>
          <button @click="${this._dismissSwBanner}" class="px-2 py-1 text-blue-100 hover:text-white">✕</button>
        </div>
      </div>`;
  }

  render() {
    const badge = badgeLabel(this._exceptionCount + this._approvalCount);
    const notifBadge = badgeLabel(this._notifCount);
    const user = window.__vdg_auth?.getCurrentUser?.();
    const salesId = currentSalesRepId();
    const now = Date.now();
    const state = computeChipState({
      pending: this._outboxCount, retrying: this._retrying, retryStreak: this._retryStreak,
      backoff429: this._backoff429, offline: !this._online, signedOut: !user,
      lastSyncMs: this._lastSyncMs, now,
    });
    const ariaLabel = buildAriaLabel(state, this._outboxCount, t);
    const labelText = (state === 'red' && !this._online) ? t('topbar.sync.state.offline') : t('topbar.sync.label');

    return html`
      ${this._renderSwBanner()}
      <header class="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0">
        <div class="flex items-center gap-3">
          ${this._mobile ? html`
            <button @click="${() => this._handleHamburger()}" aria-label="Open menu"
                    class="w-11 h-11 border-0 box-border flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>` : ''}
          <div>
            <span class="text-xs text-slate-400">${this._breadcrumb.group}</span>
            <span class="mx-1 text-slate-300">/</span>
            <span class="text-xs text-slate-700 font-medium">${this._breadcrumb.view}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          ${this._quotaWarn ? html`<a href="https://one.google.com/storage" target="_blank" rel="noreferrer" class="hidden md:inline-flex h-9 py-0 border-0 box-border items-center gap-1 px-2.5 rounded-md text-[11px] font-medium text-red-700 hover:bg-red-50 ring-1 ring-red-200" title="Drive storage > 80%">⚠ Drive quota</a>` : ''}
          ${renderSyncChip({
            html, state, pending: this._outboxCount, lastSyncMs: this._lastSyncMs, now,
            online: this._online, ariaLabel, labelText, lastError: this._lastError, t, user,
            onSyncNow: () => {
              if (state === 'yellow') return;
              if (state === 'red' && !user) {
                window.dispatchEvent(new CustomEvent('vdg:auth-signin-request'));
                return;
              }
              if (state === 'red' && !this._online) {
                window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'warn', message: t('topbar.sync.action.waiting_network') } }));
                return;
              }
              // F-19-20: stuck-with-error dead end — force-bypass the outbox cooldown
              // instead of a generic sync-now the failed record's cooldown would swallow.
              if (state === 'orange' && this._lastError) {
                window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'info', message: t('topbar.sync.action.retrying') } }));
                window.dispatchEvent(new CustomEvent('vdg:sync-force-retry'));
                return;
              }
              window.dispatchEvent(new CustomEvent('vdg:sync-now'));
            },
          })}
          ${isManager() && this.route.startsWith('/manager/') ? renderModeToggle({ html, currentMode: this._managerMode, t, onSelect: (m) => this._handleModeSelect(m) }) : ''}
          ${isManager() ? '' : html`
            <button @click="${() => navigate('/sales/quote/new')}"
                    class="hidden md:inline-flex h-9 py-0 border-0 box-border items-center gap-1.5 px-3 text-[13px] font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              ${t('topbar.new_quote')}
            </button>
          `}
          <button @click="${() => navigate('/help')}"
                  class="hidden md:inline-flex h-9 py-0 border-0 box-border items-center px-3 text-[13px] font-medium rounded-md text-slate-600 hover:bg-slate-100 transition">
            ${t('help')}
          </button>
          <div class="hidden md:flex h-9 items-center rounded-md ring-1 ring-slate-200 overflow-hidden text-[11px] font-semibold">
            ${SUPPORTED_LOCALES.map((loc) => html`
              <button @click="${() => this._handleLocale(loc)}"
                      class="h-full px-2.5 border-0 box-border flex items-center transition ${this._locale === loc
                        ? 'bg-slate-50 text-slate-900 underline underline-offset-4 decoration-2'
                        : 'text-slate-500 hover:bg-slate-50'}">
                ${loc.toUpperCase()}
              </button>`)}
          </div>
          <button @click="${() => this._handleBellClick()}"
                  title="${this._notifCount} notification${this._notifCount !== 1 ? 's' : ''}"
                  aria-label="Notifications — ${this._notifCount} unread"
                  class="relative w-9 h-9 py-0 border-0 box-border rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 transition">
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
            </svg>
            ${notifBadge ? html`<span class="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-white">${notifBadge}</span>`
              : (badge ? html`<span class="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-white">${badge}</span>` : '')}
          </button>
          <div class="relative flex items-center h-9 pl-3 ml-1 border-l border-slate-200">
            <button @click="${() => { this._menuOpen = !this._menuOpen; }}"
                    class="flex items-center justify-center h-9 w-9 border-0 box-border rounded-full overflow-hidden hover:ring-2 hover:ring-slate-200 transition focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="User menu">
              ${renderAvatar(user)}
            </button>
            ${this._renderUserMenu(user, salesId)}
          </div>
        </div>
      </header>`;
  }
}

customElements.define('vdg-topbar', VdgTopbar);
