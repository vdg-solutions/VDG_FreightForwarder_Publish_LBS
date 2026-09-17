// browser-platform.js — the browser behind the kernel's platform ports: Date, setTimeout, console,
// localStorage, fetch and the window event bus. Bound once by kernel/bootstrap/compose.js.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../core_abstractions/util/safe-await.js';
import { MODE_STATUS_UNREAD } from '../core_abstractions/ports/shipment-mode.js';

export const browserClock = {
  nowMs:    () => Date.now(),
  nowDate:  () => new Date(),
  dateFrom: (value) => new Date(value),
};

export const browserTimer = {
  startTimer:    (fn, ms) => setTimeout(fn, ms),
  stopTimer:     (handle) => clearTimeout(handle),
  startInterval: (fn, ms) => setInterval(fn, ms),
  stopInterval:  (handle) => clearInterval(handle),
};

export const consoleLog = {
  warn: (...args) => console.warn(...args), // DEV
};

export const localStorageKv = {
  getItem:    (key) => localStorage.getItem(key),
  setItem:    (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};

// A network failure and a 404 already read the same way to every caller (i18n's loadLocale
// throws "failed to load X" on either) — collapse both into the same null so a stalled
// connection cannot hang boot instead of taking that same failure path.
export const fetchHttp = {
  fetchJson: async (url) => {
    const { ok, value: resp } = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, undefined, `fetchJson:${url}`);
    return ok && resp.ok ? resp.json() : null;
  },
  fetchText: async (url) => {
    const { ok, value: resp } = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, undefined, `fetchText:${url}`);
    return ok && resp.ok ? resp.text() : null;
  },
};

export const windowEvents = {
  dispatchAppEvent: (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail })),
};

export const documentVisibility = {
  isPageVisible: () => typeof document === 'undefined' || document.visibilityState === 'visible',
  onVisibilityChange: (cb) => {
    if (typeof document === 'undefined' || !document.addEventListener) return () => {};
    document.addEventListener('visibilitychange', cb);
    return () => document.removeEventListener('visibilitychange', cb);
  },
};

export const base64Codec = {
  decode: (b64) => atob(b64),
  encode: (str) => btoa(str),
};

// The display formatters Rust owns, reached through the wasm exports the loader hangs on
// `window` (js_bridge.rs). Returning null when the export is absent lets the caller fall back
// during boot instead of throwing at a moment the app is expected to render.
export const wasmFormatter = {
  dateDisplay:     (iso) => (typeof window.fmt_date_display === 'function' ? window.fmt_date_display(iso) : null),
  datePatternHint: ()    => (typeof window.fmt_date_pattern_hint === 'function' ? window.fmt_date_pattern_hint() : null),
  stampDisplay:    (iso) => (typeof window.fmt_stamp_display === 'function' ? window.fmt_stamp_display(iso, tzOffsetMin()) : null),
};

// Minutes EAST of UTC — getTimezoneOffset() counts the other way. Read at CALL time and from the
// current instant, the same expression compose-ui/manager.js hands every manager request: the
// filter and the stamp column must be told the same offset or they land on different days, which
// is the whole point of the rule they share.
const tzOffsetMin = () => -new Date().getTimezoneOffset();

// The transport-mode vocabulary Rust owns (js_bridge_sales_form.rs). With the export absent the
// answer is "cannot read it" carrying the value untouched — the one thing this must never do is
// hand back a mode nobody stored, which is the whole of ADO #122.
export const wasmShipmentMode = {
  resolveMode: (stored) => {
    const mod = window.__vdg_wasm;
    if (typeof mod?.shipment_mode_resolve !== 'function') {
      console.warn('[shipment-mode] wasm export missing — mode left unread'); // DEV
      return { status: MODE_STATUS_UNREAD, code: stored || '' };
    }
    return mod.shipment_mode_resolve(stored || '');
  },
  modeCodes: () => window.__vdg_wasm?.shipment_mode_codes?.() || [],
};

// ag-grid-community 31.x ships as a global script, and 31.x still answers to both the modern
// createGrid() and the legacy `new Grid()` shape.
export const agGridHost = {
  create: (container, options) => {
    if (typeof window.agGrid?.createGrid === 'function') {
      return window.agGrid.createGrid(container, options);
    }
    const grid = new window.agGrid.Grid(container, options);
    return grid.gridOptions?.api || options.api;
  },
};
