// jobno-lease.js — port: the jobno lease use-case as its collaborators call it; the freight_app bootstrap binds
// the operator (operators/jobno-lease.js) behind it. Constants and error shapes are contract and live here.

let _impl = null;

/// The operator registers { peekLease, saveLease, takeFromLease, seedNext, claimRange, acquireLease } once, from the freight_app bootstrap.
export function bindJobnoLease(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('freight_app/jobno-lease: no operator bound (the freight_app bootstrap binds it)');
  return _impl;
}

export const peekLease = (...a) => _i().peekLease(...a);
export const saveLease = (...a) => _i().saveLease(...a);
export const takeFromLease = (...a) => _i().takeFromLease(...a);
export const seedNext = (...a) => _i().seedNext(...a);
export const claimRange = (...a) => _i().claimRange(...a);
export const acquireLease = (...a) => _i().acquireLease(...a);

/// Test seam.
export function _resetJobnoLease() { _impl = null; }
