// backend.js — port: which storage authority this page talks to (Drive, or vdg-server behind
// API_BASE) and the JSON call to the server. Decided once at boot by the adapter
// (implementations/server/backend.js) and remembered for the session.

let _impl = null;

/// The adapter registers { detectBackend, isServerBackend, apiFetch, _resetBackend } once, from the storage bootstrap.
export function bindBackend(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/backend: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const detectBackend = (...a) => _i().detectBackend(...a);
export const isServerBackend = (...a) => _i().isServerBackend(...a);
export const apiFetch = (...a) => _i().apiFetch(...a);
export const _resetBackend = (...a) => _i()._resetBackend(...a);

/// Test seam.
export function _resetBackendPort() { _impl = null; }
