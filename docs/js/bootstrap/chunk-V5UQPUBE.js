// output/web/js.tmp/implementations/kernel/core_abstractions/util/shipment-lane.js
function shipmentLane(s) {
  if (!s) return null;
  const { pol, pod } = s;
  if (pol && pod) return `${pol} \u2192 ${pod}`;
  return pol || pod || null;
}

export {
  shipmentLane
};
