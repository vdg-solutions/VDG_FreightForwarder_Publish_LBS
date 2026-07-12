// Operator — AR aging + AP payables + receivable timeline. Pure, no I/O.

const AR_CURRENT_DAYS              = 30;
const AR_BUCKET_31_60              = 60;
const AR_BUCKET_61_90              = 90;
const CREDIT_UTILIZATION_WARN_PCT  = 80;
const CREDIT_UTILIZATION_EXCEEDED_PCT = 100;
const TIMELINE_WEEKS               = 4;
const AVG_DSO_DEFAULT_DAYS         = 45;

// ── helpers ───────────────────────────────────────────────────────────────────

function daysOverdue(billing, today) {
  const inv = billing.invoice_date || billing.InvoiceDate;
  if (!inv) return 0;
  return Math.floor((today - new Date(inv).getTime()) / 86_400_000);
}

function getCustomer(b) { return b.customer || b.Customer || b.customer_id || '—'; }
function getAmount(b)   { return Number(b.amount_vnd ?? b.AmountVnd ?? 0); }
function getCarrier(l)  { return l.carrier  || l.Carrier  || '—'; }
function getBuy(l)      { return Number(l.buying_vnd_pay ?? l.BuyingVNDPay ?? 0); }
function getRef(l)      { return l.shipment_ref || l.ShipmentRef || ''; }

function mondayOf(date) {
  const d   = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── AR aging ─────────────────────────────────────────────────────────────────

/**
 * @param {{ billingEntities: object[], today: number }} params
 * @returns {{ rows: ARRow[], totals: object }}
 */
export function composeAR({ billingEntities, today }) {
  const custMap = new Map();

  for (const b of billingEntities) {
    if (b.status === 'Paid' || b._deleted) continue;
    const cust = getCustomer(b);
    if (!custMap.has(cust)) {
      custMap.set(cust, {
        customer:       cust,
        customer_id:    b.customer_id || cust,
        current_vnd:    0,
        bucket_31_60:   0,
        bucket_61_90:   0,
        bucket_91_plus: 0,
        invoice_dates:  [],
        credit_limit:   Number(b.credit_limit ?? 0),
      });
    }
    const row = custMap.get(cust);
    const amt  = getAmount(b);
    const days = daysOverdue(b, today);
    row.invoice_dates.push(new Date(b.invoice_date || b.InvoiceDate || today).getTime());

    if (days > AR_BUCKET_61_90)    row.bucket_91_plus += amt;
    else if (days > AR_BUCKET_31_60) row.bucket_61_90 += amt;
    else if (days > AR_CURRENT_DAYS) row.bucket_31_60 += amt;
    else                              row.current_vnd   += amt;
  }

  const rows = [];
  for (const [, r] of custMap) {
    const total = r.current_vnd + r.bucket_31_60 + r.bucket_61_90 + r.bucket_91_plus;
    const avg_dso = r.invoice_dates.length > 0
      ? r.invoice_dates.reduce((a, t) => a + Math.floor((today - t) / 86_400_000), 0)
        / r.invoice_dates.length
      : 0;
    const utilization_pct = r.credit_limit > 0 ? (total / r.credit_limit) * 100 : 0;
    rows.push({
      customer:          r.customer,
      customer_id:       r.customer_id,
      current_vnd:       r.current_vnd,
      bucket_31_60:      r.bucket_31_60,
      bucket_61_90:      r.bucket_61_90,
      bucket_91_plus:    r.bucket_91_plus,
      total_outstanding: total,
      avg_dso:           Math.round(avg_dso),
      credit_limit:      r.credit_limit,
      utilization_pct:   Math.round(utilization_pct),
    });
  }

  rows.sort((a, b) => b.total_outstanding - a.total_outstanding);

  const totals = rows.reduce(
    (acc, r) => {
      acc.total_outstanding += r.total_outstanding;
      acc.bucket_91_plus    += r.bucket_91_plus;
      return acc;
    },
    { total_outstanding: 0, bucket_91_plus: 0 },
  );

  return { rows, totals };
}

// ── AP payables ───────────────────────────────────────────────────────────────

/**
 * @param {{ pnlLines: object[] }} params
 * @returns {{ rows: APRow[] }}
 */
export function composeAP({ pnlLines }) {
  const carrierMap = new Map();

  for (const l of pnlLines) {
    const buy = getBuy(l);
    if (buy <= 0) continue;
    const carrier = getCarrier(l);
    if (!carrierMap.has(carrier)) {
      carrierMap.set(carrier, {
        carrier,
        shipment_refs:  new Set(),
        total_payable:  0,
        dates:          [],
      });
    }
    const row = carrierMap.get(carrier);
    row.total_payable += buy;
    row.shipment_refs.add(getRef(l));
    const inv = l.invoice_date || l.InvoiceDate;
    if (inv) row.dates.push(new Date(inv).getTime());
  }

  const rows = [];
  for (const [, r] of carrierMap) {
    const count = r.shipment_refs.size;
    const oldest = r.dates.length > 0
      ? new Date(Math.min(...r.dates)).toISOString().slice(0, 10)
      : '—';
    rows.push({
      carrier:           r.carrier,
      shipment_count:    count,
      total_payable_vnd: r.total_payable,
      avg_per_job:       count > 0 ? Math.round(r.total_payable / count) : 0,
      oldest_outstanding: oldest,
    });
  }

  rows.sort((a, b) => b.total_payable_vnd - a.total_payable_vnd);
  return { rows };
}

// ── receivable timeline ───────────────────────────────────────────────────────

/**
 * @param {{ billingEntities: object[], shipments: object[], today: number }} params
 * @returns {{ weeks: string[], actuals: number[], forecast: number[] }}
 */
export function composeTimeline({ billingEntities, shipments, today }) {
  const monday0 = mondayOf(today);
  const weeks   = [];
  const actuals  = [];
  const forecast = [];

  for (let w = 0; w < TIMELINE_WEEKS; w++) {
    const wStart = new Date(monday0);
    wStart.setDate(wStart.getDate() + w * 7);
    const wEnd   = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 6);

    const fmt = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' });
    weeks.push(`W${w + 1} (${fmt.format(wStart)})`);

    // Actuals: confirmed invoices due this week
    const weekActual = billingEntities
      .filter((b) => b.status !== 'Paid')
      .reduce((sum, b) => {
        const due = b.due_date || b.DueDate;
        if (!due) return sum;
        const t = new Date(due).getTime();
        return t >= wStart.getTime() && t <= wEnd.getTime() ? sum + getAmount(b) : sum;
      }, 0);
    actuals.push(weekActual);

    // Forecast: open shipments × avg DSO
    const avgDso = AVG_DSO_DEFAULT_DAYS;
    const weekForecast = shipments
      .filter((s) => {
        const st = (s.state || s.State || '').toLowerCase();
        return !['delivered', 'closed', 'paid', 'cancelled'].includes(st);
      })
      .reduce((sum, s) => {
        const etd = s.etd || s.ETD;
        if (!etd) return sum;
        const expectedDue = new Date(new Date(etd).getTime() + avgDso * 86_400_000);
        return expectedDue.getTime() >= wStart.getTime() && expectedDue.getTime() <= wEnd.getTime()
          ? sum + Number(s.selling_vnd ?? 0)
          : sum;
      }, 0);
    forecast.push(weekForecast);
  }

  return { weeks, actuals, forecast };
}

export {
  AR_CURRENT_DAYS, AR_BUCKET_31_60, AR_BUCKET_61_90,
  CREDIT_UTILIZATION_WARN_PCT, CREDIT_UTILIZATION_EXCEEDED_PCT,
};
