// shipment-state-resolver.js — F-18-11: resolve a raw shipment state/status value against the
// shipment-states master. Pure, no repo access — caller loads aliasRows and decides
// reject (write path) vs Unknown (read path) when resolution fails.
import { SHIPMENT_STATES } from './dashboard-distribution.js'; // single canonical source, reused

// raw → canonical code | null. Canonical value passes through identity; a registered alias
// resolves to its owning code; anything else is unregistered (null). Case-sensitive exact
// match — mirrors dashboard-distribution.js's existing behavior so a differently-cased/spaced
// legacy string never false-matches a canonical bucket.
export function resolveShipmentState(raw, aliasRows) {
  if (SHIPMENT_STATES.includes(raw)) return raw;
  const row = (aliasRows || []).find((r) => (r.aliases || []).includes(raw));
  return row ? row.code : null;
}
