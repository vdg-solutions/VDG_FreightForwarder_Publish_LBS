// customer360-composer — port: the Customer 360 card and its mode mix (F-16-12).

export const HEALTH_THRESHOLD_GOOD  = 80;
export const HEALTH_THRESHOLD_WATCH = 50;

let _impl = null;

/// Root bootstrap binds { compose, compose360 } once.
export function bindCustomer360Composer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/customer360-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (customerId, customers, shipments, billing, exceptions) -> vm, or null when unknown
export const compose = (...a) => _i().compose(...a);
/// (shipments of one customer) -> sea/air counts, revenue split and top lanes
export const compose360 = (...a) => _i().compose360(...a);
