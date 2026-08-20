// notification-composer — port: which changes and deadlines are worth telling the manager about.

export const NOTIFICATION_TYPES = [
  'approval_request',
  'exception_escalated',
  'commission_settle_request',
  'credit_state_change',
  'cutoff_approaching',
  'period_close_due',
];

let _impl = null;

/// Root bootstrap binds { computeFromEvent, computeTimeBased } once.
export function bindNotificationComposer(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/notification-composer: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ kind, id }, entities) -> a Notification or null
export const computeFromEvent = (...a) => _i().computeFromEvent(...a);
/// (shipments, today) -> the period-close and cutoff warnings
export const computeTimeBased = (...a) => _i().computeTimeBased(...a);
