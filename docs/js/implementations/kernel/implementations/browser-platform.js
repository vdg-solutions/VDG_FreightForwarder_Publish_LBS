// browser-platform.js — the browser behind the kernel's platform ports: Date, setTimeout, console,
// localStorage, fetch and the window event bus. Bound once by kernel/bootstrap/compose.js.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../core_abstractions/util/safe-await.js';

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
