import {
  composeOverview
} from "./chunk-3FXNTAAE.js";
import {
  manifestFilings
} from "./chunk-T5ZHX2YX.js";
import {
  EMPTY_STATE_VARIANT,
  emptyStateHtml
} from "./chunk-ZJJVGVDQ.js";
import {
  fmtDate,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/manifest.js
var STATE_LABEL_KEYS = {
  Draft: "manifest.state.draft",
  DataComplete: "manifest.state.data_complete",
  SubmittedToAuthority: "manifest.state.submitted_to_authority",
  AcknowledgedByAuthority: "manifest.state.acknowledged_by_authority",
  AmendmentRequired: "manifest.state.amendment_required",
  AmendmentSubmitted: "manifest.state.amendment_submitted",
  Approved: "manifest.state.approved",
  Rejected: "manifest.state.rejected",
  Closed: "manifest.state.closed"
};
var JURISDICTION_LABEL_KEYS = {
  US: "manifest.jurisdiction.us",
  EU: "manifest.jurisdiction.eu",
  AFRA: "manifest.jurisdiction.afra",
  Other: "manifest.jurisdiction.other"
};
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function stateLabel(state) {
  return t(STATE_LABEL_KEYS[state] ?? "manifest.state.draft");
}
function jurisdictionLabel(jurisdiction) {
  return t(JURISDICTION_LABEL_KEYS[jurisdiction] ?? "manifest.jurisdiction.other");
}
function lateBadge(row) {
  if (!row.submittedLate) return "";
  return `<span class="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">${t("manifest.badge.late")}</span>`;
}
function amendmentBadge(row) {
  const cls = row.amendmentAlert ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
  return `<span class="px-2 py-0.5 rounded text-xs font-medium ${cls}">${row.amendmentCount}</span>`;
}
function buildAmendmentRows(amendments) {
  if (!amendments.length) {
    return `<tr><td colspan="4" class="p-3 text-xs text-slate-400 text-center">${t("manifest.amendment.none")}</td></tr>`;
  }
  return amendments.map((a) => `
    <tr class="bg-slate-50 text-xs text-slate-600">
      <td class="pl-10 pr-3 py-1 font-mono">v${a.version}</td>
      <td class="px-3 py-1">${escHtml(a.reason)}</td>
      <td class="px-3 py-1">${a.amendedAtMs ? fmtDate(new Date(a.amendedAtMs)) : "\u2014"}</td>
      <td class="px-3 py-1 font-mono">${escHtml(a.amendmentRef)}</td>
    </tr>`).join("");
}
function buildRow(row, idx) {
  const bodyId = `manifest-body-${idx}`;
  const milestone = row.milestoneAtMs ? fmtDate(new Date(row.milestoneAtMs)) : "\u2014";
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-sm cursor-pointer manifest-toggle" data-target="${bodyId}">
      <td class="px-3 py-2 font-mono font-semibold text-blue-700">${escHtml(row.voyageId)}</td>
      <td class="px-3 py-2">${jurisdictionLabel(row.jurisdiction)}</td>
      <td class="px-3 py-2">${stateLabel(row.state)}${lateBadge(row)}</td>
      <td class="px-3 py-2 text-center">${row.totalHblCount}</td>
      <td class="px-3 py-2">${milestone}</td>
      <td class="px-3 py-2 text-center">${amendmentBadge(row)}</td>
    </tr>
    <tr id="${bodyId}" class="hidden">
      <td colspan="6" class="p-0">
        <table class="w-full">
          <thead class="bg-slate-100 text-[10px] text-slate-500">
            <tr>
              <th class="pl-10 pr-3 py-1 text-left">${t("manifest.amendment.col.version")}</th>
              <th class="px-3 py-1 text-left">${t("manifest.amendment.col.reason")}</th>
              <th class="px-3 py-1 text-left">${t("manifest.amendment.col.amended_at")}</th>
              <th class="px-3 py-1 text-left">${t("manifest.amendment.col.ref")}</th>
            </tr>
          </thead>
          <tbody>${buildAmendmentRows(row.amendments)}</tbody>
        </table>
      </td>
    </tr>`;
}
function buildTable(rows) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table class="w-full">
        <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">${t("manifest.col.voyage")}</th>
            <th class="px-3 py-2 text-left">${t("manifest.col.jurisdiction")}</th>
            <th class="px-3 py-2 text-left">${t("manifest.col.state")}</th>
            <th class="px-3 py-2 text-center">${t("manifest.col.hbl_count")}</th>
            <th class="px-3 py-2 text-left">${t("manifest.col.milestone")}</th>
            <th class="px-3 py-2 text-center">${t("manifest.col.amendments")}</th>
          </tr>
        </thead>
        <tbody>${rows.map(buildRow).join("")}</tbody>
      </table>
    </div>`;
}
async function loadOverview() {
  return composeOverview(await manifestFilings());
}
async function render(root) {
  const { rows } = await loadOverview();
  root.innerHTML = `
    <div class="p-6 max-w-6xl mx-auto">
      <div class="mb-6">
        <div class="text-lg font-semibold text-slate-900">${t("manifest.title")}</div>
        <p class="text-slate-500 text-sm mt-1">${t("manifest.subtitle")}</p>
      </div>
      <div id="manifest-body"></div>
    </div>`;
  const body = root.querySelector("#manifest-body");
  if (!body) return;
  body.innerHTML = rows.length ? buildTable(rows) : emptyStateHtml({ variant: EMPTY_STATE_VARIANT.FIRST_RUN, entity: t("manifest.entity") });
  body.addEventListener("click", (ev) => {
    const row = ev.target.closest(".manifest-toggle");
    if (!row) return;
    const target = document.getElementById(row.dataset.target);
    if (target) target.classList.toggle("hidden");
  });
}
export {
  render
};
