// i18n — locale loader + t() helper

import { fetchJson } from '../ports/http.js';
import { dispatchAppEvent } from '../ports/app-events.js';
import { dateFrom } from '../ports/clock.js';
import { dateDisplay, datePatternHint } from '../ports/wasm-format.js';

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

// F4-d: the display convention (digit order, separator) is decided in Rust (fmt_date_display,
// js_bridge.rs) — not by the browser's own Intl choice, which is what drifted here in the first
// place (Intl.DateTimeFormat('vi', {...}) picks a DIFFERENT separator depending on whether `year`
// is in the requested field set, proven live: 12/07/2026 here, 12-07 on the exceptions chart,
// same locale). This function only renders whatever Rust returns.
export function fmtDate(isoOrDate) {
  const iso = isoOrDate instanceof Date ? isoOrDate.toISOString() : String(isoOrDate ?? '');
  const fromRust = dateDisplay(iso);
  if (fromRust !== null) return fromRust;
  // wasm not loaded yet (or a non-browser test importing this module directly) — same shape as
  // the Rust rule, kept only as a bootstrap-order/test fallback, never the app's real decision.
  const d = isoOrDate instanceof Date ? isoOrDate : dateFrom(isoOrDate);
  return new Intl.DateTimeFormat(_locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(d);
}

// H4-c: the literal-format explainer for a date field with no value yet (date-input-hint.js) —
// the one moment `fmtDate` itself has nothing to render. Same source of truth as `fmtDate`
// (`fmt_date_pattern_hint`, declared right beside `fmt_date_display` in js_bridge.rs) so the two
// can never drift apart the way the native widget and the old value-only hint used to.
export function fmtDatePattern() {
  const fromRust = datePatternHint();
  if (fromRust !== null) return fromRust;
  // Bootstrap-order/test fallback only — mirrors fmtDate's own fallback above, never the app's
  // real decision (that stays in Rust).
  return 'dd/mm/yyyy';
}

export function fmtNumber(n) {
  return new Intl.NumberFormat(_locale, {
    style: 'decimal', maximumFractionDigits: 0,
  }).format(n);
}
