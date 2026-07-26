// Single source of the JS shipment lifecycle contract (F-19-88 AC-07). Consumed by
// detail-panel.js (UI transitions) and the fsm-contract-parity drift guard — plain module,
// no lit CDN dep, so the parity test can import it under node:test.
export const NEXT_EVENT = {
  Created: 'ConfirmBooking', BookingConfirmed: 'VoyageDeparted',
  InTransit: 'VoyageArrived', Arrived: 'DeliveryConfirmed', Delivered: 'CloseJob',
};
// Values are i18n keys (resolved via t() at the detail-panel call site), not English strings —
// F-19-94 i18n sweep. Keys unchanged so the parity guard above stays green.
export const TRANSITION_LABEL = {
  ConfirmBooking: 'shipment.transition.confirm_booking', VoyageDeparted: 'shipment.transition.mark_departed',
  VoyageArrived: 'shipment.transition.mark_arrived', DeliveryConfirmed: 'shipment.transition.confirm_delivery',
  CloseJob: 'shipment.transition.close_job',
};
