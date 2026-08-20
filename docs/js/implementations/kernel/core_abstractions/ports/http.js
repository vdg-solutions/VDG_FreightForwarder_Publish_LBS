// http.js — port: a same-origin GET of a JSON or text asset (locale bundles, seed files). The
// kernel bootstrap binds fetch.

let _impl = null;

/// The adapter registers { fetchJson, fetchText } once, from the kernel bootstrap.
export function bindHttp(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/http: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// (url) -> Promise<object | null>  (null when the response is not ok)
export const fetchJson = (...a) => _i().fetchJson(...a);

/// (url) -> Promise<string | null>  (null when the response is not ok)
export const fetchText = (...a) => _i().fetchText(...a);

/// Test seam.
export function _resetHttp() { _impl = null; }
