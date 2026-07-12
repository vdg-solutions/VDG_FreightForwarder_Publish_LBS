// Aggregation + shaping only. The waterfall FORMULA (TNDN → net → split) lives
// in WASM (commission_waterfall) — this file sums margins/deductions per rep and
// delegates the money math. No formula, no magic tax rate here.

const COMMISSION_PCT_DEFAULT = 0.70; // default sales share (0..1) when unassigned
const SPARKLINE_MONTHS       = 6;
const KIND_SHIPMENT          = 'shipment';
const KIND_PNL_LINE          = 'pnl_line';
const COMMISSION_RATE_MIN    = 0;
const COMMISSION_RATE_MAX    = 100;
const CLOSED_STATE           = 'Closed';
const ADVANCE_TRANSITION     = 'AdvanceTaken';

function getSales(s)   { return s.sales_rep || s.SalesRep || '—'; }
function getState(s)   { return s.state     || s.State    || ''; }
function getEtd(s)     { return s.etd       || s.ETD      || ''; }
function getRef(s)     { return s.shipment_ref || s.ShipmentRef || s.id || ''; }

function getBuy(l)     { return Number(l.buying_vnd_pay      ?? l.BuyingVNDPay     ?? 0); }
function getSell(l)    { return Number(l.selling_vnd_collect ?? l.SellingVNDCollect ?? 0); }

function linesFor(lines, ref) {
  return lines.filter((l) => (l.shipment_ref || l.ShipmentRef) === ref);
}

function shipmentMargin(s, lines) {
  const sl   = linesFor(lines, getRef(s));
  const buy  = sl.reduce((a, l) => a + getBuy(l), 0);
  const sell = sl.reduce((a, l) => a + getSell(l), 0);
  return sell - buy;
}

/**
 * Parses period key to { year, month?, quarter? }.
 * @param {string} key e.g. "2025-06" | "2025-Q2" | "2025"
 */
function parsePeriodKey(key) {
  if (/^\d{4}-Q\d$/.test(key)) {
    const [y, q] = [parseInt(key), parseInt(key.slice(6))];
    return { year: parseInt(key.slice(0, 4)), quarter: q };
  }
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [y, m] = key.split('-').map(Number);
    return { year: y, month: m };
  }
  return { year: parseInt(key) };
}

function shipmentInPeriod(s, periodKey) {
  const etd = getEtd(s);
  if (!etd) return false;
  const d = new Date(etd);
  if (isNaN(d.getTime())) return false;
  const parsed = parsePeriodKey(periodKey);
  if (parsed.month !== undefined) {
    return d.getFullYear() === parsed.year && (d.getMonth() + 1) === parsed.month;
  }
  if (parsed.quarter !== undefined) {
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return d.getFullYear() === parsed.year && q === parsed.quarter;
  }
  return d.getFullYear() === parsed.year;
}

/**
 * @param {'month'|'quarter'} mode
 * @param {Date} date
 * @returns {string}
 */
export function buildPeriodKey(mode, date) {
  const y = date.getFullYear();
  if (mode === 'quarter') {
    const q = Math.ceil((date.getMonth() + 1) / 3);
    return `${y}-Q${q}`;
  }
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Extract sales share (0..1) from a commission_rules assignment.
 * assignment.sales_pct: arbitrary 0–100 number set by manager.
 * Fallback: legacy base_rate or COMMISSION_PCT_DEFAULT (70%).
 */
function getSplitPct(assignment) {
  if (assignment?.sales_pct != null) {
    return Math.min(Math.max(Number(assignment.sales_pct), 0), 100) / 100;
  }
  if (assignment?.base_rate != null) return assignment.base_rate / 100; // legacy
  return COMMISSION_PCT_DEFAULT;
}

/**
 * @param {object[]} shipments
 * @param {object[]} pnlLines
 * @param {Map<string,object>} commissionRules  salesId → assignment {rule_id, ...}
 * @param {object[]} advanceLog  audit_log entries with transition=AdvanceTaken
 * @param {string}   periodKey
 * @returns {Array<{salesId,salesName,margin,tndn,comDeductions,netAfterDeductions,salesSharePct,commission,lbsShare,advances,netPayable,status}>}
 */
export function computeCommissions(shipments, pnlLines, commissionRules, advanceLog, periodKey, wasm = window.__vdg_wasm) {
  const salesMap = new Map();

  for (const s of shipments) {
    if (getState(s) !== CLOSED_STATE) continue;
    if (!shipmentInPeriod(s, periodKey)) continue;
    const salesId = getSales(s);
    if (!salesMap.has(salesId)) salesMap.set(salesId, { salesId, salesName: salesId, margin: 0, comDeductions: 0 });
    const entry = salesMap.get(salesId);
    entry.margin += shipmentMargin(s, pnlLines);
    // com_customer + com_line from commission_lines on the shipment
    const commLines = s.commission_lines || [];
    entry.comDeductions += commLines
      .filter((c) => c.kind === 'CustomerRebate' || c.kind === 'LineCommission')
      .reduce((sum, c) => sum + Number(c.net_after_tax || c.net_amount || c.gross_amount || 0), 0);
  }

  const rows = [];
  for (const [salesId, data] of salesMap) {
    const assignment = (commissionRules instanceof Map)
      ? commissionRules.get(salesId)
      : commissionRules?.[salesId];

    const salesSharePct = getSplitPct(assignment);
    // Payout math from WASM (single source). clamp_negatives=true: no negative payout.
    const w = wasm.commission_waterfall(data.margin, data.comDeductions, salesSharePct * 100, true);
    const tndn       = w.tndn;
    const netAfter   = w.net_after;
    const commission = w.sales_share;
    const lbsShare   = w.lbs_share;

    const advances = (advanceLog || [])
      .filter((e) => e.transition === ADVANCE_TRANSITION && getSales(e) === salesId
        && e.period_key === periodKey)
      .reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

    rows.push({
      salesId,
      salesName:     salesId,
      margin:        data.margin,
      tndn,
      comDeductions: data.comDeductions,
      netAfterDeductions: netAfter,
      salesSharePct: salesSharePct * 100,
      commission,
      lbsShare,
      advances,
      netPayable:    commission - advances,
      status:        'Pending',
    });
  }

  rows.sort((a, b) => b.margin - a.margin);
  return rows;
}

/**
 * Last N months margin values, oldest first.
 * @returns {number[]}
 */
export function computeSparkline(shipments, pnlLines, salesId, monthCount) {
  const now = new Date();
  const result = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = buildPeriodKey('month', d);
    let margin = 0;
    for (const s of shipments) {
      if (getSales(s) !== salesId) continue;
      if (!shipmentInPeriod(s, key)) continue;
      margin += shipmentMargin(s, pnlLines);
    }
    result.push(margin);
  }
  return result;
}

export { COMMISSION_PCT_DEFAULT, SPARKLINE_MONTHS, KIND_SHIPMENT, KIND_PNL_LINE, COMMISSION_RATE_MIN, COMMISSION_RATE_MAX };
