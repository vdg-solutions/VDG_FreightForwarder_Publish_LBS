// grant-reader.js — port: an employee's grant as the storage authority stores it (Drive: the
// file shared to them by name prefix). Bound to implementations/drive/grant-reader.js.

let _impl = null;

/// The adapter registers { readGrant } once, from the storage bootstrap.
export function bindGrantReader(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('storage/grant-reader: no adapter bound (the storage bootstrap binds it)');
  return _impl;
}

export const readGrant = (...a) => _i().readGrant(...a);

/// Test seam.
export function _resetGrantReader() { _impl = null; }
