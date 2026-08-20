// rep-code-registry — port: the 4-digit rep code that namespaces every Job No. It is the same
// `sales_code` the users screen shows as "Mã sales"; `fork` is a different field.

/// The shape a rep code has — the users form checks it without a bridge call.
export const REP_CODE_REGEX = /^\d{4}$/;

let _impl = null;

/// Root bootstrap binds { isValidRepCode, assignRepCode, ensureRepCode, assertRepCodeAssignable } once.
export function bindRepCodeRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/rep-code-registry: no implementation bound (root bootstrap binds it)');
  return _impl;
}

export const isValidRepCode = (...a) => _i().isValidRepCode(...a);
/// (repo) -> the next free code
export const assignRepCode = (...a) => _i().assignRepCode(...a);
/// (user, repo) -> the user's code, assigning and persisting one if they have none
export const ensureRepCode = (...a) => _i().ensureRepCode(...a);
/// (code, ownerId, repo) -> resolves, or throws with the form's i18n message
export const assertRepCodeAssignable = (...a) => _i().assertRepCodeAssignable(...a);
