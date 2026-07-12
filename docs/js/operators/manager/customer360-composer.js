// Pure compute — Customer 360 aggregation + health score. No DOM, no I/O.

const HEALTH_DEDUCT_DISPUTE    = 15;
const HEALTH_DEDUCT_OVERDUE_91 = 20;
const HEALTH_DEDUCT_OVERDUE_61 = 10;
const HEALTH_DEDUCT_LOW_FREQ   = 10;
const HEALTH_DEDUCT_LOW_MARGIN = 5;
const HEALTH_MARGIN_WARN_PCT   = 5;
const HEALTH_LOW_FREQ_DAYS     = 90;
const HEALTH_THRESHOLD_GOOD    = 80;
const HEALTH_THRESHOLD_WATCH   = 50;
const MS_PER_DAY               = 86_400_000;
const HEALTH_SCORE_MAX         = 100;
const AR_OVERDUE_61_DAYS       = 61;
const AR_OVERDUE_91_DAYS       = 91;

function getCustId(entity) { return entity.customer_id || entity.customer || entity.Customer || ''; }
function getAmount(b)      { return Number(b.amount_vnd ?? b.AmountVnd ?? 0); }
function getBuy(l)         { return Number(l.buying_vnd_pay ?? l.BuyingVNDPay ?? 0); }
function getSell(l)        { return Number(l.selling_vnd_collect ?? l.SellingVNDCollect ?? 0); }
function getRef(s)         { return s.shipment_ref || s.ShipmentRef || s.id || ''; }
function getUpdated(e)     { return e.updated_at || e.created_at || null; }

function linesFor(lines, ref) {
  return lines.filter((l) => (l.shipment_ref || l.ShipmentRef) === ref);
}

function shipmentMarginPct(s, pnlLines) {
  const sl   = linesFor(pnlLines, getRef(s));
  const buy  = sl.reduce((a, l) => a + getBuy(l), 0);
  const sell = sl.reduce((a, l) => a + getSell(l), 0);
  if (sell <= 0) return 0;
  return ((sell - buy) / sell) * 100;
}

/**
 * @param {object} customer
 * @param {object[]} shipments
 * @param {object[]} billing
 * @param {object[]} exceptions
 * @param {Date} today
 * @returns {{ score: number, deductions: string[] }}
 */
export function computeHealthScore(customer, shipments, billing, exceptions, today) {
  const custId     = customer.id;
  const nowMs      = (today instanceof Date ? today : new Date(today)).getTime();
  let score        = HEALTH_SCORE_MAX;
  const deductions = [];

  // Open exceptions
  const openExceptions = exceptions.filter(
    (e) => getCustId(e) === custId && (e.state || '') !== 'Closed',
  );
  if (openExceptions.length > 0) {
    score -= HEALTH_DEDUCT_DISPUTE;
    deductions.push(`-${HEALTH_DEDUCT_DISPUTE}: ${openExceptions.length} open exception(s)`);
  }

  // AR overdue buckets
  const custBilling = billing.filter((b) => getCustId(b) === custId && b.status !== 'Paid');
  let has91 = false, has61 = false;
  for (const b of custBilling) {
    const inv = b.invoice_date || b.InvoiceDate;
    if (!inv) continue;
    const days = Math.floor((nowMs - new Date(inv).getTime()) / MS_PER_DAY);
    if (days > AR_OVERDUE_91_DAYS) has91 = true;
    else if (days > AR_OVERDUE_61_DAYS) has61 = true;
  }
  if (has91) {
    score -= HEALTH_DEDUCT_OVERDUE_91;
    deductions.push(`-${HEALTH_DEDUCT_OVERDUE_91}: AR 91+ days`);
  } else if (has61) {
    score -= HEALTH_DEDUCT_OVERDUE_61;
    deductions.push(`-${HEALTH_DEDUCT_OVERDUE_61}: AR 61–90 days`);
  }

  // Low frequency — no shipments in last HEALTH_LOW_FREQ_DAYS
  const custShipments = shipments.filter((s) => getCustId(s) === custId);
  const recentShipment = custShipments.some((s) => {
    const etd = s.etd || s.ETD || s.updated_at;
    if (!etd) return false;
    return (nowMs - new Date(etd).getTime()) <= HEALTH_LOW_FREQ_DAYS * MS_PER_DAY;
  });
  if (!recentShipment) {
    score -= HEALTH_DEDUCT_LOW_FREQ;
    deductions.push(`-${HEALTH_DEDUCT_LOW_FREQ}: no shipments in ${HEALTH_LOW_FREQ_DAYS} days`);
  }

  // Low margin — avg margin pct across all pnl_lines (passed via billing as proxy)
  const pnlLines = billing.filter((b) => b.kind === 'pnl_line' || b._kind === 'pnl_line');
  if (pnlLines.length === 0 && custShipments.length > 0) {
    // skip if no pnl data available
  } else if (custShipments.length > 0) {
    const avgMarginPct = custShipments.reduce((sum, s) => sum + shipmentMarginPct(s, pnlLines), 0)
      / custShipments.length;
    if (avgMarginPct < HEALTH_MARGIN_WARN_PCT) {
      score -= HEALTH_DEDUCT_LOW_MARGIN;
      deductions.push(`-${HEALTH_DEDUCT_LOW_MARGIN}: avg margin ${avgMarginPct.toFixed(1)}% < ${HEALTH_MARGIN_WARN_PCT}%`);
    }
  }

  return { score: Math.max(0, score), deductions };
}

/**
 * @param {string}   customerId
 * @param {object[]} customers
 * @param {object[]} shipments
 * @param {object[]} billing
 * @param {object[]} exceptions
 * @returns {import('../../boundary/manager-screen-dtos.js').Customer360Vm | null}
 */
export function compose(customerId, customers, shipments, billing, exceptions) {
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return null;

  const custShipments = shipments.filter((s) => getCustId(s) === customerId);
  const custBilling   = billing.filter((b) => getCustId(b) === customerId && b.status !== 'Paid');

  const lifetimeRevenue = custShipments.reduce((sum, s) => sum + Number(s.selling_vnd ?? 0), 0);
  const outstanding     = custBilling.reduce((sum, b) => sum + getAmount(b), 0);

  const salesRep = customer.sales_rep || customer.SalesRep
    || custShipments[0]?.sales_rep || custShipments[0]?.SalesRep || '—';

  const allDates = [
    ...custShipments.map((s) => getUpdated(s)),
    ...custBilling.map((b) => getUpdated(b)),
    customer.updated_at,
  ].filter(Boolean);
  const lastTouchDate = allDates.length > 0
    ? allDates.sort().pop()
    : customer.created_at || '';

  const today = new Date();
  const { score, deductions } = computeHealthScore(customer, custShipments, billing, exceptions, today);

  return {
    customer,
    lifetimeRevenue,
    outstanding,
    salesRep,
    lastTouchDate,
    healthScore:     score,
    healthBreakdown: deductions,
  };
}

export {
  HEALTH_DEDUCT_DISPUTE, HEALTH_DEDUCT_OVERDUE_91, HEALTH_DEDUCT_OVERDUE_61,
  HEALTH_DEDUCT_LOW_FREQ, HEALTH_DEDUCT_LOW_MARGIN, HEALTH_MARGIN_WARN_PCT,
  HEALTH_LOW_FREQ_DAYS, HEALTH_THRESHOLD_GOOD, HEALTH_THRESHOLD_WATCH,
};

// ── Multi-modal 360 aggregation (F-16-12) ────────────────────────────────────

const TOP_ROUTES_COUNT = 3;

function topRoutesByMode(list, laneFn) {
  const counts = new Map();
  for (const s of list) {
    const lane = laneFn(s);
    counts.set(lane, (counts.get(lane) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ROUTES_COUNT)
    .map(([lane, count]) => ({ lane, count }));
}

/**
 * Pure multi-modal aggregation — no DOM, no I/O.
 * @param {object[]} shipments  all shipments for a single customer
 * @returns {{ total, sea_count, air_count, revenue_sea, revenue_air, sea_pct, air_pct, top_routes_sea, top_routes_air }}
 */
export function compose360(shipments) {
  const sea = (shipments || []).filter((s) => (s.mode || 'sea') !== 'air');
  const air = (shipments || []).filter((s) => s.mode === 'air');

  const revenue_sea = sea.reduce((sum, s) => sum + Number(s.selling_vnd ?? 0), 0);
  const revenue_air = air.reduce((sum, s) => sum + Number(s.selling_vnd ?? 0), 0);
  const totalRev    = revenue_sea + revenue_air;

  const seaLane = (s) => `${s.pol || '?'}→${s.pod || '?'}`;
  const airLane = (s) => `${s.airport_origin || s.origin_iata || '?'}–${s.airport_dest || s.dest_iata || '?'}`;

  return {
    total:          (shipments || []).length,
    sea_count:      sea.length,
    air_count:      air.length,
    revenue_sea,
    revenue_air,
    sea_pct:        totalRev > 0 ? Math.round((revenue_sea / totalRev) * 100) : 0,
    air_pct:        totalRev > 0 ? Math.round((revenue_air / totalRev) * 100) : 0,
    top_routes_sea: topRoutesByMode(sea, seaLane),
    top_routes_air: topRoutesByMode(air, airLane),
  };
}
