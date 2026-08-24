// output/web/js.tmp/implementations/ui/core_abstractions/ports/manager/notification-composer.js
var NOTIFICATION_TYPES = [
  "approval_request",
  "exception_escalated",
  "commission_settle_request",
  "credit_state_change",
  "cutoff_approaching",
  "period_close_due"
];
var _impl = null;
function bindNotificationComposer(impl) {
  _impl = impl;
}

export {
  NOTIFICATION_TYPES,
  bindNotificationComposer
};
