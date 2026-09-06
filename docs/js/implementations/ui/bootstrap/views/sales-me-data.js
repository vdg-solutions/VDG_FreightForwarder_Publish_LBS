// sales-me-data.js — data aggregation for the sales personal workspace.
//
// Split out of sales-me.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The seam:
// this reads the repo and computes MTD stats — it never touches the DOM. sales-me.js keeps the
// presentational HTML builders and the entry point, both of which stay pure functions of the
// data this module returns.

import { resolveShipmentState } from '../../../kernel/core_abstractions/util/shipment-state-resolver.js';
import { UNKNOWN_STATE } from '../../../kernel/core_abstractions/util/dashboard-distribution.js';
import { ensureShipmentStateAliases } from '../../core_abstractions/ports/flows/shipment-state-aliases.js';
import { listMyShipments } from '../../core_abstractions/ports/data/shipment-repo.js';
import { listPnlLines, salesShareTotal, shipmentMonth } from '../../core_abstractions/ports/data/sales-reads.js';

// Which month a job counts in is a rule about the books, so wasm holds it
// (core_abstractions/shipment_month.rs) and this asks. It used to read
// `etd || prep_date || date` here and drop anything with none of them: a September job carrying
// 63,512,000 VND of margin was counted in no month at all, while this same screen listed it two
// rows below. ETD is a plan and it is blank until somebody types it.
function mtdFilter(s) {
  const now  = new Date();
  const pfx  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return shipmentMonth(s) === pfx;
}

const EMPTY_DATA = { all: [], mtd: [], pending: [], stats: { shipments: 0, revenue: 0, margin: 0, salesCommission: 0, advances: 0 } };

// `salesId` is no longer a parameter: which jobs are mine is the session's own question, answered
// in wasm off `session_principal::account()`. It used to be
// `(s.sales_rep || '').toLowerCase() === salesId.toLowerCase()`, where `salesId` was the role
// TOKEN — `__MANAGER__` for the workspace owner, matching no job at all. That is what showed 0
// shipments over a workspace holding 17.
export async function loadMyData() {
  const repo = window.__vdg_repo;
  if (!repo) return EMPTY_DATA;

  const [allShipments, allLines, aliasRows] = await Promise.all([
    listMyShipments(repo),
    listPnlLines().catch(() => []),
    ensureShipmentStateAliases(repo), // DEFECT-1: seed-on-first-read (sales rep never opens master view)
  ]);

  // F-18-11: resolve once, at the source — same class of bug as the Shipments grid's
  // pre-fix status-badge (raw string badge + raw state-or-status KPI filter read).
  for (const s of allShipments) {
    s.state = resolveShipmentState(s.state || s.status, aliasRows) || UNKNOWN_STATE;
  }

  const mtd = allShipments.filter(mtdFilter);
  const mtdRefs = new Set(mtd.map(s => s.shipment_ref || s.ref));

  // What the rep is owed on this month's jobs. Which commission kind is the rep's own share, and
  // how a net amount is read off a row that may hold a bare number or a money object, are the
  // use-case's — this screen hands it the refs and renders the figure.
  const salesCommission = await salesShareTotal([...mtdRefs]).catch(() => 0);

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

  // F-20-03: advances from CashFlowEntry source=salesId MTD -- CashFlowEntry itself was never
  // built (docs/architecture/canonical-shipment-model.md split it into a standalone CashFlowLedger
  // module that never shipped), so there is no kind to list here; the sync loop must not ask for
  // one nobody ever writes (F-43-08's own class of hole, other direction — a kind that should
  // never be registered because nothing produces it). Stays an honest 0 until that module exists.
  const advances = 0;

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
