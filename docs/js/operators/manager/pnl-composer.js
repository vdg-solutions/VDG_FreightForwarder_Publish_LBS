// Operator — P&L pivot computation. Pure, no I/O.

const BASE_CURRENCY        = 'VND';
const PNL_DEFAULT_ROW_DIMS = ['period', 'sales_rep'];

const DIM_OPTIONS = ['period', 'sales_rep', 'customer', 'trade_lane', 'container_type', 'carrier'];

// ── helpers ───────────────────────────────────────────────────────────────────

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

function getRef(s)    { return s.shipment_ref || s.ShipmentRef || ''; }
function getSales(s)  { return s.sales_rep    || s.SalesRep    || '—'; }
function getCustomer(s) { return s.customer   || s.Customer    || '—'; }
function getLane(s)   { return `${s.pol || s.POL || '?'}→${s.pod || s.POD || '?'}`; }
function getCarrier(s){ return s.carrier      || s.Carrier     || '—'; }
function getContainer(s){ return s.container_type || s.ContainerType || '—'; }

function etdPeriodLabel(etdStr) {
  if (!etdStr) return 'Unknown';
  const d = new Date(etdStr);
  return d.toLocaleString('default', { year: 'numeric', month: 'short' });
}

function dimValue(shipment, dim) {
  switch (dim) {
    case 'period':         return etdPeriodLabel(shipment.etd || shipment.ETD);
    case 'sales_rep':      return getSales(shipment);
    case 'customer':       return getCustomer(shipment);
    case 'trade_lane':     return getLane(shipment);
    case 'container_type': return getContainer(shipment);
    case 'carrier':        return getCarrier(shipment);
    default:               return '—';
  }
}

function getBuy(line)  { return Number(line.buying_vnd_pay      ?? line.BuyingVNDPay      ?? 0); }
function getSell(line) { return Number(line.selling_vnd_collect  ?? line.SellingVNDCollect ?? 0); }

function linesFor(lines, ref) {
  return lines.filter((l) => (l.shipment_ref || l.ShipmentRef) === ref);
}

function roe(entity) { return Number(entity.roe_selling ?? 1); }

// ── period window ─────────────────────────────────────────────────────────────

function periodBounds(period) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();

  if (period === 'MTD')  return [new Date(y, m, 1), now];
  if (period === 'QTD')  return [new Date(y, Math.floor(m / 3) * 3, 1), now];
  if (period === 'YTD')  return [new Date(y, 0, 1), now];
  if (period === 'Last12M') return [new Date(y - 1, m, 1), now];
  return [new Date(y, m, 1), now]; // default MTD
}

function prevPeriodBounds(period) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();

  if (period === 'MTD') {
    const start = new Date(y, m - 1, 1);
    return [start, new Date(y, m, 0)];
  }
  if (period === 'QTD') {
    const qStart = Math.floor(m / 3) * 3;
    return [new Date(y, qStart - 3, 1), new Date(y, qStart, 0)];
  }
  if (period === 'YTD') return [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)];
  if (period === 'Last12M') return [new Date(y - 2, m, 1), new Date(y - 1, m, 0)];
  return [new Date(y, m - 1, 1), new Date(y, m, 0)];
}

function filterByDateRange(shipments, [from, to]) {
  return shipments.filter((s) => {
    const etd = s.etd || s.ETD;
    if (!etd) return false;
    const t = new Date(etd).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

// ── row builder ───────────────────────────────────────────────────────────────

function buildRows(shipments, pnlLines, dims) {
  const dimKey = (s) => dims.map((d) => dimValue(s, d)).join('||');
  const groups = groupBy(shipments, dimKey);
  const rows   = [];

  for (const [key, group] of groups) {
    const dimVals = key.split('||');
    const dimsMap = Object.fromEntries(dims.map((d, i) => [d, dimVals[i]]));

    let revenue_vnd = 0, cost_vnd = 0;
    for (const s of group) {
      const r = roe(s);
      const lines = linesFor(pnlLines, getRef(s));
      for (const l of lines) {
        revenue_vnd += getSell(l) * r;
        cost_vnd    += getBuy(l)  * r;
      }
    }

    const margin_vnd    = revenue_vnd - cost_vnd;
    const margin_pct    = revenue_vnd > 0 ? (margin_vnd / revenue_vnd) * 100 : 0;
    const shipment_count = group.length;
    const avg_margin    = shipment_count > 0 ? margin_vnd / shipment_count : 0;

    rows.push({
      dims:           dimsMap,
      revenue_vnd,
      cost_vnd,
      margin_vnd,
      margin_pct,
      shipment_count,
      avg_margin,
      prev_margin_vnd: null,
      yoy_margin_vnd:  null,
    });
  }

  return rows;
}

// ── compose ───────────────────────────────────────────────────────────────────

/**
 * @param {{ shipments: object[], pnlLines: object[], period: string, dims: string[] }} params
 * @returns {{ rows: PivotRow[], grandTotals: object }}
 */
export function compose({ shipments, pnlLines, period, dims = PNL_DEFAULT_ROW_DIMS }) {
  const [from, to] = periodBounds(period);
  const [pFrom, pTo] = prevPeriodBounds(period);

  const curr = filterByDateRange(shipments, [from, to]);
  const prev = filterByDateRange(shipments, [pFrom, pTo]);

  const rows     = buildRows(curr, pnlLines, dims);
  const prevRows = buildRows(prev, pnlLines, dims);

  const prevMap = new Map(prevRows.map((r) => [
    dims.map((d) => r.dims[d]).join('||'),
    r,
  ]));

  for (const row of rows) {
    const k     = dims.map((d) => row.dims[d]).join('||');
    const p     = prevMap.get(k);
    row.prev_margin_vnd = p ? p.margin_vnd : null;
    row.yoy_margin_vnd  = null; // YoY wired per period type — simplified here
  }

  const grandTotals = rows.reduce(
    (acc, r) => {
      acc.revenue_vnd    += r.revenue_vnd;
      acc.cost_vnd       += r.cost_vnd;
      acc.margin_vnd     += r.margin_vnd;
      acc.shipment_count += r.shipment_count;
      return acc;
    },
    { revenue_vnd: 0, cost_vnd: 0, margin_vnd: 0, shipment_count: 0 },
  );

  grandTotals.margin_pct = grandTotals.revenue_vnd > 0
    ? (grandTotals.margin_vnd / grandTotals.revenue_vnd) * 100
    : 0;

  return { rows, grandTotals };
}

/**
 * Buy/Sell breakdown per kind for a set of shipment refs.
 * @param {object[]} pnlLines
 * @param {string[]} refs
 * @returns {Array<{kind:string,buy_vnd:number,sell_vnd:number,margin_vnd:number,margin_pct:number}>}
 */
export function composeBuySellBreakdown(pnlLines, refs) {
  const refSet = new Set(refs);
  const filtered = pnlLines.filter(
    (l) => refSet.has(l.shipment_ref || l.ShipmentRef),
  );
  const kindMap = groupBy(filtered, (l) => l.kind || l.Kind || 'other');
  const result  = [];

  for (const [kind, lines] of kindMap) {
    const buy_vnd  = lines.reduce((a, l) => a + getBuy(l), 0);
    const sell_vnd = lines.reduce((a, l) => a + getSell(l), 0);
    const margin_vnd  = sell_vnd - buy_vnd;
    const margin_pct  = sell_vnd > 0 ? (margin_vnd / sell_vnd) * 100 : 0;
    result.push({ kind, buy_vnd, sell_vnd, margin_vnd, margin_pct });
  }

  return result.sort((a, b) => b.sell_vnd - a.sell_vnd);
}

export { BASE_CURRENCY, PNL_DEFAULT_ROW_DIMS, DIM_OPTIONS, groupBy };
