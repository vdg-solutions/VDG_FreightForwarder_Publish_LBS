// base64.js — port: browser-safe base64 codec, as id-token.js decodes/re-encodes the synthetic
// JWT payload. The kernel bootstrap binds atob/btoa.

let _impl = null;

/// The adapter registers { decode, encode } once, from the kernel bootstrap.
export function bindBase64(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('kernel/base64: no adapter bound (the kernel bootstrap binds it)');
  return _impl;
}

/// (base64) -> binary string
export const b64Decode = (...a) => _i().decode(...a);
/// (binary string) -> base64
export const b64Encode = (...a) => _i().encode(...a);

/// Test seam.
export function _resetBase64() { _impl = null; }
