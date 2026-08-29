// output/web/js.tmp/implementations/kernel/core_abstractions/ports/http.js
var _impl = null;
function bindHttp(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("kernel/http: no adapter bound (the kernel bootstrap binds it)");
  return _impl;
}
var fetchJson = (...a) => _i().fetchJson(...a);

// output/web/js.tmp/implementations/kernel/core_abstractions/ports/app-events.js
var _impl2 = null;
function bindAppEvents(impl) {
  _impl2 = impl;
}
function _i2() {
  if (!_impl2) throw new Error("kernel/app-events: no adapter bound (the kernel bootstrap binds it)");
  return _impl2;
}
var dispatchAppEvent = (...a) => _i2().dispatchAppEvent(...a);

// output/web/js.tmp/implementations/kernel/core_abstractions/ports/clock.js
var _impl3 = null;
function bindClock(impl) {
  _impl3 = impl;
}
function _i3() {
  if (!_impl3) throw new Error("kernel/clock: no adapter bound (the kernel bootstrap binds it)");
  return _impl3;
}
var nowMs = (...a) => _i3().nowMs(...a);
var nowDate = (...a) => _i3().nowDate(...a);
var dateFrom = (...a) => _i3().dateFrom(...a);

// output/web/js.tmp/implementations/kernel/core_abstractions/i18n/index.js
var SUPPORTED_LOCALES = ["vi", "en"];
var DEFAULT_LOCALE = "vi";
var _locale = DEFAULT_LOCALE;
var _msgs = {};
async function loadLocale(locale) {
  const target = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const msgs = await fetchJson(`js/implementations/kernel/core_abstractions/i18n/${target}.json`);
  if (!msgs) throw new Error(`i18n: failed to load ${target}.json`);
  _msgs = msgs;
  _locale = target;
  dispatchAppEvent("vdg:locale-changed", { locale: _locale });
}
function t(key, args) {
  let val = _msgs[key] ?? key;
  if (args && typeof val === "string") {
    for (const [k, v] of Object.entries(args)) {
      val = val.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return val;
}
function currentLocale() {
  return _locale;
}
function fmtDate(isoOrDate) {
  const iso = isoOrDate instanceof Date ? isoOrDate.toISOString() : String(isoOrDate ?? "");
  if (typeof window !== "undefined" && typeof window.fmt_date_display === "function") {
    return window.fmt_date_display(iso);
  }
  const d = isoOrDate instanceof Date ? isoOrDate : dateFrom(isoOrDate);
  return new Intl.DateTimeFormat(_locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);
}
function fmtNumber(n) {
  return new Intl.NumberFormat(_locale, {
    style: "decimal",
    maximumFractionDigits: 0
  }).format(n);
}

export {
  bindHttp,
  bindAppEvents,
  bindClock,
  nowMs,
  nowDate,
  dateFrom,
  loadLocale,
  t,
  currentLocale,
  fmtDate,
  fmtNumber
};
