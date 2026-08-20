// fsm-auto-advance — port: "dữ liệu đủ thì đẩy qua" (E-40). After a save, the job walks forward
// while every requirement of the next hop is affirmatively met by the record itself.

let _impl = null;

/// Root bootstrap binds { autoAdvanceShipment } once.
export function bindFsmAutoAdvance(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/fsm-auto-advance: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (repo, shipment) -> the state it advanced TO, or null when it stayed put
export const autoAdvanceShipment = (...a) => _i().autoAdvanceShipment(...a);
