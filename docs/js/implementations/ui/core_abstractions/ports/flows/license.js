// license — port: the boot licence verdict and the wording a refusal shows. Rust classifies AND
// arms the repo write guard; the ui renders whatever the verdict says and offers reload.

// The boot states, as the gate screen branches on them. ui vocabulary — a copy of the contract
// the wasm side spells in boundary/flows_license_dto.rs, never an import across the boundary.
export const LICENSE_STATE_VALID   = 'valid';
export const LICENSE_STATE_MISSING = 'missing';
export const LICENSE_STATE_INVALID = 'invalid';
export const LICENSE_STATE_NETWORK = 'network';
export const LICENSE_STATE_GRACE   = 'grace';
export const LICENSE_STATE_BLOCKED = 'blocked';

let _impl = null;

/// Root bootstrap binds { resolveLicenseState, errorKindMessage } once.
export function bindLicenseGate(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/license: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// () -> { kind, status, payload, error_kind }
export const resolveLicenseState = (...a) => _i().resolveLicenseState(...a);
/// (error_kind) -> the translated sentence for that refusal
export const errorKindMessage = (...a) => _i().errorKindMessage(...a);
