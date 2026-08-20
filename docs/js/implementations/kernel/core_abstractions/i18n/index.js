// i18n — locale loader + t() helper

import { fetchJson } from '../ports/http.js';
import { dispatchAppEvent } from '../ports/app-events.js';
import { dateFrom } from '../ports/clock.js';

const SUPPORTED_LOCALES = ['vi', 'en'];
const DEFAULT_LOCALE    = 'vi';

let _locale = DEFAULT_LOCALE;
let _msgs   = {};

export async function loadLocale(locale) {
  const target = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const msgs   = await fetchJson(`js/implementations/kernel/core_abstractions/i18n/${target}.json`);
  if (!msgs) throw new Error(`i18n: failed to load ${target}.json`);
  _msgs   = msgs;
  _locale = target;
  dispatchAppEvent('vdg:locale-changed', { locale: _locale });
}

// Key-as-fallback — self-documenting keys
export function t(key, args) {
  let val = _msgs[key] ?? key;
  if (args && typeof val === 'string') {
    for (const [k, v] of Object.entries(args)) {
      val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return val;
}

export function currentLocale() { return _locale; }

export function fmtDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : dateFrom(isoOrDate);
  return new Intl.DateTimeFormat(_locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

export function fmtNumber(n) {
  return new Intl.NumberFormat(_locale, {
    style: 'decimal', maximumFractionDigits: 0,
  }).format(n);
}
