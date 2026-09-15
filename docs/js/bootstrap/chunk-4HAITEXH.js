import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/guard-messages.js
var GUARD_MESSAGE_KEYS = {
  GUARD_VIOLATION: null,
  CREDIT_SUSPENDED: "guard.credit_suspended",
  OPEN_EXCEPTION: "guard.open_exception",
  BILLING_NOT_PAID: "guard.billing_not_paid",
  QUOTATION_NOT_ACCEPTED: "guard.quotation_not_accepted",
  BOOKING_NOT_CONFIRMED: "guard.booking_not_confirmed",
  CONTAINER_NOT_LOADED: "guard.container_not_loaded",
  CUSTOMS_NOT_CLEARED: "guard.customs_not_cleared",
  DG_COMPLIANCE_PENDING: "guard.dg_compliance_pending",
  ALREADY_IN_TARGET_STATE: "guard.already_in_target_state",
  INVALID_TRANSITION: "guard.invalid_transition",
  NOT_FOUND: "guard.not_found",
  STORAGE: "guard.storage",
  // cas-write-path.md §5.4: FsmIngest's write-intent submit refusals.
  STALE_BASE: "save.error.stale_base",
  SAVE_TOO_LARGE: "save.error.too_large"
};
function guardMessage(envelope) {
  if (envelope.code === "GUARD_VIOLATION") {
    return t("guard.violation", { message: envelope.message });
  }
  const key = GUARD_MESSAGE_KEYS[envelope.code];
  return key ? t(key) : t("guard.transition_failed", { message: envelope.message });
}

// output/web/js.tmp/implementations/ui/core_abstractions/ports/flows/fsm-ingest.js
var _impl = null;
function bindFsmIngest(impl) {
  _impl = impl;
}
function _i() {
  if (!_impl) throw new Error("ui/fsm-ingest: no implementation bound (root bootstrap binds it)");
  return _impl;
}
var applyShipmentEvent = (...a) => _i().applyShipmentEvent(...a);
var moveShipmentTo = (...a) => _i().moveShipmentTo(...a);

export {
  guardMessage,
  bindFsmIngest,
  applyShipmentEvent,
  moveShipmentTo
};
