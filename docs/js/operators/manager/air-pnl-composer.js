// Air P&L composer — chargeable-weight basis (F-16-07)
// Pure, no I/O. Mirrors pnl-composer.js pattern for sea.

const ZERO_GUARD = 0; // sentinel: div-by-zero fallback

export const AIR_DEFAULT_DIMS = ['route_lane', 'carrier_iata'];

// ── helpers ──────────────────────────────────────────────────────────────────

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

function getRef(s)          { return s.shipment_ref || s.ShipmentRef || ''; }
function getRouteLane(s)    {
  const o = s.airport_origin || s.origin_iata || '?';
  const d = s.airport_dest   || s.dest_iata   || '?';
  return `${o}–${d}`;
}
function getCarrierIata(s)  { return s.carrier_iata || s.CarrierIata || '—'; }
function getChargeableKg(s) { return Number(s.chargeable_kg ?? s.actual_kg ?? ZERO_GUARD); }
function getPeriod(s)       {
  const etd = s.etd || s.ETD;
  if (!etd) return 'Unknown';
  const d = new Date(etd);
  return d.toLocaleString('default', { year: 'numeric', month: 'short' });
}
function getSales(s)     { return s.sales_rep || s.SalesRep || '—'; }
function getCustomer(s)  { return s.customer  || s.Customer || '—'; }

function dimValue(s, dim) {
  switch (dim) {
    case 'route_lane':   return getRouteLane(s);
    case 'carrier_iata': return getCarrierIata(s);
    case 'period':       return getPeriod(s);
    case 'sales_rep':    return getSales(s);
    case 'customer':     return getCustomer(s);
    default:             return '—';
  }
}

function getBuy(line)  { return Number(line.buying_vnd_pay      ?? line.BuyingVNDPay      ?? 0); }
function getSell(line) { return Number(line.selling_vnd_collect  ?? line.SellingVNDCollect ?? 0); }

function linesFor(lines, ref) {
  return lines.filter((l) => (l.shipment_ref || l.ShipmentRef) === ref);
}

// ── compose ──────────────────────────────────────────────────────────────────

/**
 * Compose air P&L grouped by dims (default: route_lane + carrier_iata).
 * Filters to mode === 'air' only.
 *
 * @param {{ shipments: object[], pnlLines: object[], dims?: string[] }} params
 * @returns {{ rows: object[], grandTotals: object }}
 */
export function composeAir({ shipments, pnlLines, dims = AIR_DEFAULT_DIMS }) {
  const airShipments = (shipments || []).filter((s) => s.mode === 'air');

  const dimKey = (s) => dims.map((d) => dimValue(s, d)).join('||');
  const groups  = groupBy(airShipments, dimKey);
  const rows    = [];

  for (const [key, group] of groups) {
    const dimVals = key.split('||');
    const dimsMap = Object.fromEntries(dims.map((d, i) => [d, dimVals[i]]));

    let revenue_vnd = 0, cost_vnd = 0, total_chargeable_kg = 0;

    for (const s of group) {
      const lines = linesFor(pnlLines, getRef(s));
      for (const l of lines) {
        revenue_vnd += getSell(l);
        cost_vnd    += getBuy(l);
      }
      total_chargeable_kg += getChargeableKg(s);
    }

    const margin_vnd     = revenue_vnd - cost_vnd;
    const margin_pct     = revenue_vnd > 0 ? (margin_vnd / revenue_vnd) * 100 : 0;
    const revenue_per_kg = total_chargeable_kg > 0 ? revenue_vnd / total_chargeable_kg : ZERO_GUARD;
    const margin_per_kg  = total_chargeable_kg > 0 ? margin_vnd  / total_chargeable_kg : ZERO_GUARD;

    rows.push({
      dims:               dimsMap,
      revenue_vnd,
      cost_vnd,
      margin_vnd,
      margin_pct,
      shipment_count:     group.length,
      total_chargeable_kg,
      revenue_per_kg,
      margin_per_kg,
    });
  }

  const grandTotals = rows.reduce(
    (acc, r) => {
      acc.revenue_vnd         += r.revenue_vnd;
      acc.cost_vnd            += r.cost_vnd;
      acc.margin_vnd          += r.margin_vnd;
      acc.shipment_count      += r.shipment_count;
      acc.total_chargeable_kg += r.total_chargeable_kg;
      return acc;
    },
    { revenue_vnd: 0, cost_vnd: 0, margin_vnd: 0, shipment_count: 0, total_chargeable_kg: 0 },
  );

  grandTotals.margin_pct     = grandTotals.revenue_vnd > 0
    ? (grandTotals.margin_vnd / grandTotals.revenue_vnd) * 100
    : 0;
  grandTotals.revenue_per_kg = grandTotals.total_chargeable_kg > 0
    ? grandTotals.revenue_vnd / grandTotals.total_chargeable_kg
    : ZERO_GUARD;
  grandTotals.margin_per_kg  = grandTotals.total_chargeable_kg > 0
    ? grandTotals.margin_vnd / grandTotals.total_chargeable_kg
    : ZERO_GUARD;

  return { rows, grandTotals };
}
