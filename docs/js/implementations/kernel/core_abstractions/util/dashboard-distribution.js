// dashboard-distribution.js — canonical shipment-state bucket derivation for the landing
// dashboard doughnut + legend (F-18-05/F-18-08). Single source for the state list so a
// hand-typed bucket loop can never silently diverge from ShipmentState again (root cause of
// the 21/22-shipment undercount: 6 literal string comparisons that drifted from real data).
import { t } from '../i18n/index.js';
import { resolveShipmentState } from './shipment-state-resolver.js';

// F-37-04: was a fourth hand-written copy of the lifecycle. Re-exported so its consumers are
// untouched, but the list itself now lives in util/shipment-phases.js, pinned to Rust.
// Imported AND exported: `export { X } from` re-exports without binding the name locally, and
// buildDistribution below reads it.
import { SHIPMENT_STATES } from './shipment-phases.js';
export { SHIPMENT_STATES };
export const UNKNOWN_STATE = 'Unknown';

const LABEL_KEY = {
  Created:          'dashboard.distribution.label.created',
  BookingConfirmed: 'dashboard.distribution.label.booking',
  InTransit:        'dashboard.distribution.label.in_transit',
  Arrived:          'dashboard.distribution.label.arrived',
  Delivered:        'dashboard.distribution.label.delivered',
  Closed:           'dashboard.distribution.label.closed',
  Cancelled:        'dashboard.distribution.label.cancelled',
  [UNKNOWN_STATE]:  'dashboard.distribution.label.unknown',
};

const COLOR = {
  Created: '#94a3b8', BookingConfirmed: '#3b82f6', InTransit: '#eab308',
  Arrived: '#22c55e', Delivered: '#14b8a6', Closed: '#1f2937',
  Cancelled: '#b91c1c', // deep red — distinct from Unknown's #ef4444 (D-3)
  [UNKNOWN_STATE]: '#ef4444', // distinct from all 6 canonical colors — draws the eye on purpose
};

// Buckets every shipment into a canonical ShipmentState slice, or UNKNOWN_STATE when the
// state/status field matches none of them — never silently drops a shipment (AC-06/AC-07:
// distribution.reduce(sum) === shipments.length, always; PM task-delta resolution of ACs.md's
// open reconciliation question — option (a), a visible Unknown slice, not a silent exclusion).
// F-18-11 AC-05: aliasRows (shipment-states registry) resolves a legacy alias (e.g. 'Open')
// to its canonical bucket instead of Unknown. Additive default — omitting aliasRows keeps
// every existing call site/test behaviorally unchanged (canonical-only resolution).
export function buildDistribution(shipments, aliasRows = []) {
  const counts = Object.fromEntries([...SHIPMENT_STATES, UNKNOWN_STATE].map((s) => [s, 0]));
  for (const s of shipments) {
    const st = s.state || s.status;
    counts[resolveShipmentState(st, aliasRows) ?? UNKNOWN_STATE]++;
  }
  // Unknown slice omitted when zero — no empty wedge cluttering a healthy render; the sum
  // invariant still holds either way since an empty slice contributes 0.
  return [...SHIPMENT_STATES, UNKNOWN_STATE]
    .filter((s) => s !== UNKNOWN_STATE || counts[UNKNOWN_STATE] > 0)
    .map((s) => ({ label: t(LABEL_KEY[s]), value: counts[s], color: COLOR[s] }));
}
