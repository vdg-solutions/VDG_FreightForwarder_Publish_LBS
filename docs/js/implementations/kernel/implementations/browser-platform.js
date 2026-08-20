// browser-platform.js — the browser behind the kernel's platform ports: Date, setTimeout, console,
// localStorage, fetch and the window event bus. Bound once by kernel/bootstrap/compose.js.

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

export const fetchHttp = {
  fetchJson: async (url) => {
    const resp = await fetch(url);
    return resp.ok ? resp.json() : null;
  },
  fetchText: async (url) => {
    const resp = await fetch(url);
    return resp.ok ? resp.text() : null;
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
