// Command Palette — F-14-13 · Lit · Ctrl+K

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { navigate }         from '../router.js';
import { idbGet, idbPut }   from '../cache/idb-cache.js';

const PALETTE_MAX_RESULTS = 8;
const PALETTE_RECENT_MAX  = 5;
const PALETTE_PREFS_KEY   = 'preferences';

const PALETTE_ACTIONS = [
  { label: 'Dashboard',         shortcut: 'g d', kind: 'action', action: () => navigate('/manager/dashboard') },
  { label: 'Shipments pipeline',shortcut: 'g s', kind: 'action', action: () => navigate('/manager/pipeline') },
  { label: 'Customers',         shortcut: 'g c', kind: 'action', action: () => navigate('/masters/customers') },
  { label: 'P&L Report',        shortcut: 'g r', kind: 'action', action: () => navigate('/manager/reports/pnl') },
  { label: 'Approve all',       shortcut: null,  kind: 'action', action: () => navigate('/manager/approvals') },
  { label: 'Period close',      shortcut: null,  kind: 'action', action: () => navigate('/manager/finance/close-period') },
  { label: 'Sales view',        shortcut: null,  kind: 'action', action: () => navigate('/dashboard') },
  { label: 'Create shipment',   shortcut: null,  kind: 'action', action: () => navigate('/sales/me/pnl/new') },
];

// ── fuzzy match ───────────────────────────────────────────────────────────────

function fuzzyScore(haystack, needle) {
  let hi = 0, score = 0, lastIdx = -1;
  for (const ch of needle.toLowerCase()) {
    const pos = haystack.toLowerCase().indexOf(ch, hi);
    if (pos < 0) return 0;
    score += lastIdx >= 0 ? Math.max(10 - (pos - lastIdx), 1) : 5;
    lastIdx = pos; hi = pos + 1;
  }
  return score;
}

// ── focus trap ────────────────────────────────────────────────────────────────

function trapFocus(el, e) {
  const focusable = [...el.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// ── component ─────────────────────────────────────────────────────────────────

class VdgCmdPalette extends LitElement {
  static properties = {
    _open:      { state: true },
    _query:     { state: true },
    _results:   { state: true },
    _activeIdx: { state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this._open      = false;
    this._query     = '';
    this._results   = [];
    this._activeIdx = 0;
    this._db        = null;

    this._onOpen    = (e) => {
      if (e.detail?.action === 'open')  this.open();
      if (e.detail?.action === 'close') this.close();
      else                               this.toggle();
    };
    this._onKey     = (e) => {
      if (!this._open) return;
      this._handleKey(e);
    };
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('vdg:cmd-palette', this._onOpen);
    window.addEventListener('keydown',         this._onKey);
    this._db = window.__vdg_db || null;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('vdg:cmd-palette', this._onOpen);
    window.removeEventListener('keydown',          this._onKey);
  }

  toggle() { this._open ? this.close() : this.open(); }

  open() {
    this._open      = true;
    this._query     = '';
    this._activeIdx = 0;
    this._loadRecent().then((r) => { this._results = r; });
    requestAnimationFrame(() => this.querySelector('#palette-input')?.focus());
  }

  close() {
    this._open    = false;
    this._query   = '';
    this._results = [];
  }

  async _loadRecent() {
    if (!this._db) return PALETTE_ACTIONS.slice(0, PALETTE_MAX_RESULTS);
    try {
      const prefs  = await idbGet(this._db, 'meta', PALETTE_PREFS_KEY);
      const recent = prefs?.palette_recent || [];
      return [...recent.slice(0, PALETTE_RECENT_MAX), ...PALETTE_ACTIONS]
        .slice(0, PALETTE_MAX_RESULTS);
    } catch { return PALETTE_ACTIONS.slice(0, PALETTE_MAX_RESULTS); }
  }

  async _search(q) {
    const candidates = [...PALETTE_ACTIONS];

    // L1 LRU shipments
    const lru = window.__vdg_lru;
    if (lru) {
      try {
        const ships = lru.getAll?.('shipment') || [];
        ships.forEach((s) => candidates.push({
          label:   `${s.shipment_ref || s.id} · ${s.customer_name || s.customer || ''}`,
          kind:    'shipment',
          id:      s.id,
          action:  null,
          shortcut: null,
        }));
        const custs = lru.getAll?.('customers') || [];
        custs.forEach((c) => candidates.push({
          label:   c.name || c.id,
          kind:    'customers',
          id:      c.id,
          action:  null,
          shortcut: null,
        }));
      } catch { /* LRU not available */ }
    }

    const scored = candidates
      .map((c) => ({ ...c, score: fuzzyScore(c.label, q) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, PALETTE_MAX_RESULTS);

    return scored.length ? scored : await this._loadRecent();
  }

  async _handleInput(e) {
    this._query     = e.target.value;
    this._activeIdx = 0;
    this._results   = this._query.length >= 1
      ? await this._search(this._query)
      : await this._loadRecent();
  }

  _handleKey(e) {
    const len = this._results.length;
    if (e.key === 'Escape')    { e.preventDefault(); this.close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      this._activeIdx = (this._activeIdx + 1) % len;
    }
    if (e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      this._activeIdx = (this._activeIdx - 1 + len) % len;
    }
    if (e.key === 'Enter') { e.preventDefault(); this._select(this._results[this._activeIdx]); }
    trapFocus(this, e);
  }

  async _select(item) {
    if (!item) return;
    if (item.kind === 'action' || item.action) {
      item.action?.();
    } else {
      window.dispatchEvent(new CustomEvent('vdg:open-detail', {
        detail: { kind: item.kind, id: item.id },
      }));
    }
    // update recent
    await this._saveRecent(item);
    this.close();
  }

  async _saveRecent(item) {
    if (!this._db) return;
    try {
      const prefs  = (await idbGet(this._db, 'meta', PALETTE_PREFS_KEY)) || { key: PALETTE_PREFS_KEY };
      const recent = (prefs.palette_recent || []).filter((r) => r.label !== item.label);
      recent.unshift({ label: item.label, kind: item.kind, id: item.id, action: null, shortcut: item.shortcut });
      prefs.palette_recent = recent.slice(0, PALETTE_RECENT_MAX);
      await idbPut(this._db, 'meta', prefs);
    } catch { /* non-critical */ }
  }

  _handleClickOutside(e) {
    if (e.target === this.querySelector('#palette-backdrop')) this.close();
  }

  render() {
    if (!this._open) return html``;

    return html`
      <div id="palette-backdrop"
           class="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-black/40"
           @click="${(e) => this._handleClickOutside(e)}">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" stroke-linecap="round"/>
            </svg>
            <input id="palette-input"
                   .value="${this._query}"
                   @input="${(e) => this._handleInput(e)}"
                   placeholder="Search routes, shipments, customers…"
                   class="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400"
                   aria-label="Command palette search"
                   autocomplete="off" spellcheck="false" />
            <kbd class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd>
          </div>

          ${this._results.length ? html`
            <ul class="py-1 max-h-80 overflow-y-auto" role="listbox" aria-label="Results">
              ${this._results.map((r, i) => html`
                <li role="option" aria-selected="${i === this._activeIdx}"
                    @click="${() => this._select(r)}"
                    @mouseenter="${() => { this._activeIdx = i; }}"
                    class="flex items-center gap-3 px-4 py-2.5 cursor-pointer
                           ${i === this._activeIdx ? 'bg-blue-600/20 rounded' : 'hover:bg-slate-50'}">
                  <span class="flex-1 text-sm text-slate-800 truncate">${r.label}</span>
                  ${r.shortcut ? html`
                    <kbd class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">${r.shortcut}</kbd>
                  ` : ''}
                </li>`)}
            </ul>
          ` : html`
            <div class="px-4 py-6 text-center text-sm text-slate-400">No results</div>
          `}

          <div class="px-4 py-2 border-t border-slate-100 flex gap-4 text-[10px] text-slate-400">
            <span>↑↓ / j k Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>`;
  }
}

customElements.define('vdg-cmd-palette', VdgCmdPalette);
export { PALETTE_ACTIONS, PALETTE_MAX_RESULTS, PALETTE_RECENT_MAX, fuzzyScore };
