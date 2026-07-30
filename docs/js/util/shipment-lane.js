// shipment-lane.js — F-36-01: shipments store the route as pol+pod, never a `lane` field, but
// detail-panel/grid/pipeline/customer360/mgr_sales all read s.lane. Single derivation so every
// consumer agrees on the same canonical display, instead of per-view inline fallbacks.
export function shipmentLane(s) {
  if (!s) return null;
  const { pol, pod } = s;
  if (pol && pod) return `${pol} → ${pod}`;
  return pol || pod || null;
}
