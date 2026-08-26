// sales-me-data.js — data aggregation for the sales personal workspace.
//
// Split out of sales-me.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The seam:
// this reads the repo and computes MTD stats — it never touches the DOM. sales-me.js keeps the
// presentational HTML builders and the entry point, both of which stay pure functions of the
// data this module returns.

import { resolveShipmentState } from '../../../kernel/core_abstractions/util/shipment-state-resolver.js';
import { UNKNOWN_STATE } from '../../../kernel/core_abstractions/util/dashboard-distribution.js';
import { ensureShipmentStateAliases } from '../../core_abstractions/ports/flows/shipment-state-aliases.js';
import { listShipments } from '../../core_abstractions/ports/data/shipment-repo.js';

function mtdFilter(s) {
  const now  = new Date();
  const year = now.getFullYear();
  const mo   = String(now.getMonth() + 1).padStart(2, '0');
  const pfx  = `${year}-${mo}`;
  const d    = s.etd || s.prep_date || s.date || '';
  return d.startsWith(pfx);
}

const EMPTY_DATA = { all: [], mtd: [], pending: [], stats: { shipments: 0, revenue: 0, margin: 0, salesCommission: 0, advances: 0 } };

export async function loadMyData(salesId) {
  const repo = window.__vdg_repo;
  if (!repo) return EMPTY_DATA;

  const [allShipments, allLines, allCashFlows, allCommEntries, aliasRows] = await Promise.all([
    listShipments(repo, (s) => (s.sales_rep || '').toLowerCase() === salesId.toLowerCase()),
    repo.list('pnl_line').catch(() => []),
    repo.list('cash_flow_entry').catch(() => []),
    repo.list('commission_entry').catch(() => []),
    ensureShipmentStateAliases(repo), // DEFECT-1: seed-on-first-read (sales rep never opens master view)
  ]);

  // F-18-11: resolve once, at the source — same class of bug as the Shipments grid's
  // pre-fix status-badge (raw string badge + raw state-or-status KPI filter read).
  for (const s of allShipments) {
    s.state = resolveShipmentState(s.state || s.status, aliasRows) || UNKNOWN_STATE;
  }

  const mtd = allShipments.filter(mtdFilter);
  const mtdRefs = new Set(mtd.map(s => s.shipment_ref || s.ref));

  // SalesShare commission MTD (from commission_entry persisted by WASM engine)
  const salesCommission = allCommEntries
    .filter(e => e.kind === 'SalesShare' && mtdRefs.has(e.shipment_ref))
    .reduce((s, e) => s + Number(e.net_amount?.amount ?? e.net_amount ?? 0), 0);

  const linesByRef = {};
  for (const l of allLines) {
    const r = l.shipment_ref;
    if (!linesByRef[r]) linesByRef[r] = [];
    linesByRef[r].push(l);
  }

  const pending = allShipments.filter((s) => {
    const ref   = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    return !lines.some((l) => Number(l.sell_amt || l.selling_vnd_collect || 0) > 0);
  });

  let revenue = 0, margin = 0;
  for (const s of mtd) {
    const ref   = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    for (const l of lines) {
      revenue += Number(l.sell_amt || l.selling_vnd_collect || 0);
      margin  += Number(l.sell_amt || l.selling_vnd_collect || 0)
               - Number(l.buy_amt  || l.buying_vnd_pay      || 0);
    }
  }

  // F-20-03: advances from CashFlowEntry source=salesId MTD
  const advances = allCashFlows
    .filter((c) => (c.source || '').toLowerCase() === salesId.toLowerCase() && mtdFilter(c))
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  for (const s of allShipments) {
    const ref   = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    s.margin = lines.reduce((acc, l) =>
      acc + (Number(l.sell_amt || l.selling_vnd_collect || 0))
          - (Number(l.buy_amt  || l.buying_vnd_pay      || 0)), 0);
  }

  return {
    all:   allShipments,
    mtd,
    pending,
    stats: { shipments: mtd.length, revenue, margin, salesCommission, advances },
  };
}
