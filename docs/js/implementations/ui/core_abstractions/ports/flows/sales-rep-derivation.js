// sales-rep-derivation — port: what the sales form needs to derive a job's sales rep (F-41-01).
// The root bootstrap binds it to the wasm freight_app exports; the ui never sees wasm.

let _impl = null;

/// Root bootstrap binds { deriveSalesRep, selfRepCandidate, customerRepFor, mineOnly } once.
export function bindSalesRepDerivation(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/sales-rep-derivation: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ routeRep, draftRep, customerRep, selfRep }) -> rep ('' = the form must ask)
export const deriveSalesRep  = (...a) => _i().deriveSalesRep(...a);
/// (roles, account) -> rep ('' unless the session holds a sales role)
export const selfRepCandidate = (...a) => _i().selfRepCandidate(...a);
/// (rows) -> the rows belonging to the signed-in account. No account argument: a caller that
/// could name one could name somebody else's.
export const mineOnly = (...a) => _i().mineOnly(...a);
/// (customerName, customers) -> rep
export const customerRepFor  = (...a) => _i().customerRepFor(...a);
