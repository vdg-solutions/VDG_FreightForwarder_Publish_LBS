import { findMatch } from './master-deduper.js';

const KIND_SHIPMENT         = 'shipment';
const KIND_LINE             = 'pnl_line';
const KIND_CUSTOMER         = 'customers';
const KIND_CARRIER          = 'carrier';
const KIND_COMMISSION_ENTRY = 'commission_entry';
const KIND_COMMISSION_RULES = 'commission_rules';

const SAVE_PROGRESS_EVENT = 'vdg:save-progress';

function _emitProgress(done, total, kind) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SAVE_PROGRESS_EVENT, {
    detail: { done, total, kind },
  }));
}

/**
 * Persist all shipments + lines from a combined or legacy WASM report.
 * repo: EntityRepo instance (Phase-1: LocalStorageEntityRepo)
 *
 * @param {{ shipments: object[], lines: object[] }} report
 * @param {import('../abstractions/entity-repo.js').EntityRepo} repo
 * @returns {Promise<{ created_shipments: number, created_lines: number, new_customers: number, new_carriers: number }>}
 */
export async function commitPnlReport(report, repo) {
  const shipments = report.shipments ?? [];
  const lines     = report.lines     ?? [];

  const [existingCustomers, existingCarriers] = await Promise.all([
    repo.list(KIND_CUSTOMER, null),
    repo.list(KIND_CARRIER,  null),
  ]);

  let newCustomers = 0;
  let newCarriers  = 0;

  const total = shipments.length + lines.length;
  let done    = 0;

  // Upsert customer masters
  const customerCache = {};
  for (const s of shipments) {
    const name = s.customer || s.Customer;
    if (!name || customerCache[name]) continue;
    const match = findMatch(name, existingCustomers);
    if (match.status !== 'match') {
      const id = `CUST-${slugify(name)}`;
      await repo.put(KIND_CUSTOMER, id, { id, name, source: 'pnl_import' });
      existingCustomers.push({ id, name });
      newCustomers++;
    }
    customerCache[name] = true;
  }

  // Upsert carrier masters
  const carrierCache = {};
  for (const s of shipments) {
    const name = s.carrier || s.Carrier;
    if (!name || carrierCache[name]) continue;
    const match = findMatch(name, existingCarriers);
    if (match.status !== 'match') {
      const id = `CARR-${slugify(name)}`;
      await repo.put(KIND_CARRIER, id, { id, name, source: 'pnl_import' });
      existingCarriers.push({ id, name });
      newCarriers++;
    }
    carrierCache[name] = true;
  }

  // Persist shipments
  for (const s of shipments) {
    const id = s.shipment_ref || s.ShipmentRef || generateId('SHP');
    await repo.put(KIND_SHIPMENT, id, { ...s, id, _imported_at: Date.now() });
    done++;
    _emitProgress(done, total, KIND_SHIPMENT);
  }

  // Persist lines
  let lineIdx = 0;
  for (const line of lines) {
    const ref = line.shipment_ref || line.ShipmentRef || 'UNKNOWN';
    const id  = `${ref}-L${String(lineIdx).padStart(3, '0')}`;
    await repo.put(KIND_LINE, id, { ...line, id, _imported_at: Date.now() });
    lineIdx++;
    done++;
    _emitProgress(done, total, KIND_LINE);
  }

  return {
    created_shipments: shipments.length,
    created_lines:     lines.length,
    new_customers:     newCustomers,
    new_carriers:      newCarriers,
  };
}

// ── Sales commission auto-compute ─────────────────────────────────────────────

/**
 * Compute SalesShare + CompanyRetained for a single shipment via the WASM
 * waterfall engine (single source of truth) and persist both commission_entry
 * records. No commission arithmetic or tax rate lives in this file.
 */
export async function computeAndPersistSalesCommission(shipment, pnlLines, repo) {
  const wasm    = window.__vdg_wasm;
  const salesId = shipment.sales_rep || shipment.sales_rep_id || '';
  if (!salesId || !wasm?.commission_waterfall) return;

  const shipRef   = shipment.shipment_ref || shipment.ref || '';
  const commLines = shipment.commission_lines || [];

  // Profit = Σ (sell - buy) of pnl_lines for this shipment
  const lines = pnlLines.filter((l) => (l.shipment_ref || l.ShipmentRef) === shipRef);
  let profit = 0;
  for (const l of lines) {
    profit += Number(l.sell_amt || l.selling_vnd_collect || 0)
            - Number(l.buy_amt  || l.buying_vnd_pay      || 0);
  }
  if (profit <= 0) return;

  // Try IDB assignment first (sales_pct = arbitrary %, manager-set)
  let assignment = null;
  try {
    assignment = await repo.get(KIND_COMMISSION_RULES, salesId);
  } catch { /* ignore */ }

  const now = new Date().toISOString().slice(0, 10);

  const comKh   = commLines.filter((c) => c.kind === 'CustomerRebate')
                    .reduce((s, c) => s + Number(c.net_after_tax || 0), 0);
  const comLine = commLines.filter((c) => c.kind === 'LineCommission')
                    .reduce((s, c) => s + Number(c.net_after_tax || 0), 0);

  // Manager-set arbitrary % → WASM waterfall (single source, clamp_negatives=true).
  if (assignment?.sales_pct != null) {
    const w = wasm.commission_waterfall(profit, comKh + comLine, Number(assignment.sales_pct), true);

    await repo.put(KIND_COMMISSION_ENTRY, `${shipRef}-SALES`, {
      kind: 'SalesShare', amount_vnd: w.sales_share,
      sales_pct: w.sales_pct * 100, occurred_at: now, created_by: salesId,
    });
    await repo.put(KIND_COMMISSION_ENTRY, `${shipRef}-LBS`, {
      kind: 'CompanyRetained', amount_vnd: w.lbs_share,
      lbs_pct: (1 - w.sales_pct) * 100, occurred_at: now, created_by: 'system',
    });
    return;
  }

  // Named-rule fallback: resolve rule_id, let the rule engine apply the split.
  if (!wasm?.commission_compute || !wasm?.commission_resolve_rule) return;
  const shipmentJson = JSON.stringify(shipment);

  let ruleId = assignment?.rule_id || null;
  if (!ruleId) {
    try {
      const rule = wasm.commission_resolve_rule(salesId, shipmentJson);
      if (rule?.rule_id) ruleId = rule.rule_id;
    } catch { return; }
  }
  if (!ruleId) return;

  // TNDN from WASM too — no tax rate literal in JS.
  const deductions = {
    corp_tax_vnd:          wasm.commission_waterfall(profit, 0, 0, true).tndn,
    customer_kickback_vnd: comKh,
    line_commission_vnd:   comLine,
  };

  let result;
  try {
    result = wasm.commission_compute(shipmentJson, ruleId, JSON.stringify(deductions));
  } catch { return; }

  if (result?.sales_share) {
    await repo.put(KIND_COMMISSION_ENTRY, `${shipRef}-SALES`,
      { ...result.sales_share, occurred_at: now, created_by: salesId });
  }
  if (result?.company_retained) {
    await repo.put(KIND_COMMISSION_ENTRY, `${shipRef}-LBS`,
      { ...result.company_retained, occurred_at: now, created_by: 'system' });
  }
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
