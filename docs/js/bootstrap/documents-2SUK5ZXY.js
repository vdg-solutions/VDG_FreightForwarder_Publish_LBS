import {
  KIND_ARRIVAL_NOTICE,
  KIND_DOCUMENT,
  KIND_RELEASE_ORDER,
  KIND_SHIPPING_INSTRUCTION,
  composeDocumentBoard
} from "./chunk-KRST3G4J.js";
import {
  EMPTY_STATE_VARIANT,
  emptyStateHtml
} from "./chunk-ZJJVGVDQ.js";
import {
  fmtDate,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/documents.js
function getRepo() {
  return window.__vdg_repo;
}
function pillHtml(status) {
  const map = {
    issued: ["bg-emerald-100 text-emerald-700", t("documents.status.issued")],
    pending: ["bg-amber-100 text-amber-700", t("documents.status.pending")],
    overdue: ["bg-red-100 text-red-700", t("documents.status.overdue")]
  };
  const [cls, label] = map[status] || ["bg-slate-100 text-slate-500", status];
  return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}">${label}</span>`;
}
function deadlineHtml(row) {
  if (!row.deadlineMs) return '<span class="text-slate-300">\u2013</span>';
  if (row.status === "issued") return fmtDate(new Date(row.deadlineMs));
  return `<cutoff-timer deadline="${new Date(row.deadlineMs).toISOString()}" label="${t(row.typeKey)}"></cutoff-timer>`;
}
function rowHtml(row) {
  return `
    <tr>
      <td class="py-3 px-4">${row.shipmentRef || "\u2013"}</td>
      <td class="py-3 px-4">${t(row.typeKey)}</td>
      <td class="py-3 px-4">${pillHtml(row.status)}</td>
      <td class="py-3 px-4">${deadlineHtml(row)}</td>
      <td class="py-3 px-4 text-right text-slate-300">\u2013</td>
    </tr>`;
}
async function loadBoard() {
  const repo = getRepo();
  if (!repo) return { rows: [], kpis: { totalPending: 0, criticalPriority: 0, exceptions: 0, draftMblPending: 0 } };
  const [documents, shippingInstructions, arrivalNotices, releaseOrders] = await Promise.all([
    repo.list(KIND_DOCUMENT, null),
    repo.list(KIND_SHIPPING_INSTRUCTION, null),
    repo.list(KIND_ARRIVAL_NOTICE, null),
    repo.list(KIND_RELEASE_ORDER, null)
  ]);
  return composeDocumentBoard(documents, shippingInstructions, arrivalNotices, releaseOrders);
}
async function render(root) {
  const { rows, kpis } = await loadBoard();
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">${t("documents.title")}</h1>
          <p class="text-slate-500 text-sm mt-1">${t("documents.subtitle")}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.total_pending")}</div>
          <div class="text-3xl font-bold text-slate-800">${kpis.totalPending}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.critical_priority")}</div>
          <div class="text-3xl font-bold text-red-600">${kpis.criticalPriority}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.exceptions")}</div>
          <div class="text-3xl font-bold text-amber-500">${kpis.exceptions}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div class="text-sm font-semibold text-slate-500 mb-1">${t("documents.kpi.draft_mbl_pending")}</div>
          <div class="text-3xl font-bold text-blue-600">${kpis.draftMblPending}</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <th class="py-3 px-4 font-semibold">${t("shipments.grid.ref")}</th>
              <th class="py-3 px-4 font-semibold">${t("documents.col.type")}</th>
              <th class="py-3 px-4 font-semibold">${t("state")}</th>
              <th class="py-3 px-4 font-semibold">${t("documents.col.deadline")}</th>
              <th class="py-3 px-4 font-semibold text-right">${t("common.col.actions")}</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y divide-slate-100">
            ${rows.length ? rows.map(rowHtml).join("") : `<tr><td colspan="5">${emptyStateHtml({ variant: EMPTY_STATE_VARIANT.FIRST_RUN, entity: t("documents.entity") })}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
export {
  render
};
