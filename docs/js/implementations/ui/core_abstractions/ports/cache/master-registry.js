// master-registry — port: master-data kind ownership as the master views need it. The registry
// itself lives in Rust (freight_app core_abstractions); the ui asks it the one question it has,
// which is whether the person in front of the table may edit it.

let _impl = null;

/// Root bootstrap binds { canWriteMaster } once.
export function bindMasterRegistry(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/master-registry: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (kind, role) -> boolean. An unregistered kind denies every role.
export const canWriteMaster = (...a) => _i().canWriteMaster(...a);
