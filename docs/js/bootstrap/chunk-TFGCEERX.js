import {
  SHIPMENT_STATES
} from "./chunk-ETXXTRJC.js";
import {
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/kernel/core_abstractions/util/shipment-state-resolver.js
function resolveShipmentState(raw, aliasRows) {
  if (SHIPMENT_STATES.includes(raw)) return raw;
  const row = (aliasRows || []).find((r) => (r.aliases || []).includes(raw));
  return row ? row.code : null;
}

// output/web/js.tmp/implementations/kernel/core_abstractions/util/dashboard-distribution.js
var UNKNOWN_STATE = "Unknown";
var LABEL_KEY = {
  Created: "dashboard.distribution.label.created",
  BookingConfirmed: "dashboard.distribution.label.booking",
  InTransit: "dashboard.distribution.label.in_transit",
  Arrived: "dashboard.distribution.label.arrived",
  Delivered: "dashboard.distribution.label.delivered",
  Closed: "dashboard.distribution.label.closed",
  Cancelled: "dashboard.distribution.label.cancelled",
  [UNKNOWN_STATE]: "dashboard.distribution.label.unknown"
};
var COLOR = {
  Created: "#94a3b8",
  BookingConfirmed: "#3b82f6",
  InTransit: "#eab308",
  Arrived: "#22c55e",
  Delivered: "#14b8a6",
  Closed: "#1f2937",
  Cancelled: "#b91c1c",
  // deep red — distinct from Unknown's #ef4444 (D-3)
  [UNKNOWN_STATE]: "#ef4444"
  // distinct from all 6 canonical colors — draws the eye on purpose
};
function buildDistribution(shipments, aliasRows = []) {
  const counts = Object.fromEntries([...SHIPMENT_STATES, UNKNOWN_STATE].map((s) => [s, 0]));
  for (const s of shipments) {
    const st = s.state || s.status;
    counts[resolveShipmentState(st, aliasRows) ?? UNKNOWN_STATE]++;
  }
  return [...SHIPMENT_STATES, UNKNOWN_STATE].filter((s) => s !== UNKNOWN_STATE || counts[UNKNOWN_STATE] > 0).map((s) => ({ label: t(LABEL_KEY[s]), value: counts[s], color: COLOR[s] }));
}

export {
  UNKNOWN_STATE,
  buildDistribution,
  resolveShipmentState
};
