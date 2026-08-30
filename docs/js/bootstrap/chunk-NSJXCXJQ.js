// output/web/js.tmp/implementations/kernel/core_abstractions/util/guard-messages.js
var GUARD_MESSAGES = {
  GUARD_VIOLATION: null,
  CREDIT_SUSPENDED: "Customer credit is suspended or blacklisted \u2014 contact Finance",
  OPEN_EXCEPTION: "Open exception(s) must be resolved before this transition",
  BILLING_NOT_PAID: "Billing has not been fully paid",
  QUOTATION_NOT_ACCEPTED: "Quotation has not been accepted yet",
  BOOKING_NOT_CONFIRMED: "Carrier booking is not confirmed",
  CONTAINER_NOT_LOADED: "One or more containers are not loaded onto vessel",
  CUSTOMS_NOT_CLEARED: "Customs clearance has not been completed",
  DG_COMPLIANCE_PENDING: "DG compliance is pending or rejected",
  ALREADY_IN_TARGET_STATE: "Shipment is already in this state",
  INVALID_TRANSITION: "This transition is not valid from the current state",
  NOT_FOUND: "Shipment record not found",
  STORAGE: "Storage error \u2014 please refresh and retry"
};
function guardMessage(envelope) {
  if (envelope.code === "GUARD_VIOLATION") {
    return `Guard condition not met: ${envelope.message}`;
  }
  return GUARD_MESSAGES[envelope.code] ?? `Transition failed: ${envelope.message}`;
}

export {
  guardMessage
};
