import {
  t
} from "./chunk-MGTH6QM4.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/status-i18n.js
var FALLBACK_PREFIX = "shipment.status";
var PREFIX = {
  shipment: "shipment.status",
  document: "document.status",
  billing: "billing.status",
  exception: "exception.severity",
  approval: "approval_card.type"
};
function statusBadgeLabel(fsm, state) {
  if (!state) return "";
  return t(`${PREFIX[fsm] ?? FALLBACK_PREFIX}.${state}`);
}

export {
  statusBadgeLabel
};
