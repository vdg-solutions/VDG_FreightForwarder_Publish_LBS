import {
  compose
} from "./chunk-TBGPODD6.js";
import {
  fmtDate,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/self-approved-review.js
var KIND_DECISION = "approval_decision";
var MONTH_COUNT_BACK = 12;
var DECISION_LABEL_KEY = {
  Approved: "approval.action.approve",
  Rejected: "approval.action.reject",
  NeedInfo: "approval.action.need_info"
};
var _selectedPeriod = null;
var _decisions = [];
var _rows = [];
var _onEntity;
function getRepo() {
  return window.__vdg_repo;
}
function monthOptions() {
  const now = /* @__PURE__ */ new Date();
  const opts = [];
  for (let i = 0; i < MONTH_COUNT_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ key, label: d.toLocaleString("default", { year: "numeric", month: "long" }) });
  }
  return opts;
}
function decisionLabel(decision) {
  const key = DECISION_LABEL_KEY[decision];
  return key ? t(key) : decision;
}
function typeLabel(type) {
  return t(`approval_card.type.${type}`);
}
function rowHtml(row) {
  return `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-2 text-xs text-slate-700 whitespace-nowrap">${fmtDate(row.decided_at)}</td>
      <td class="px-4 py-2 text-xs text-slate-700">${row.decided_by}</td>
      <td class="px-4 py-2 text-xs text-slate-700">${typeLabel(row.type)}</td>
      <td class="px-4 py-2 text-xs text-slate-700">${row.target_kind} \xB7 ${row.target_id}</td>
      <td class="px-4 py-2 text-xs font-medium text-amber-700">${decisionLabel(row.decision)}</td>
      <td class="px-4 py-2 text-xs text-slate-600">${row.reason}</td>
      <td class="px-4 py-2 text-xs text-slate-600">${row.comment || "\u2014"}</td>
    </tr>`;
}
function recompute() {
  _rows = compose(_decisions, { period: _selectedPeriod });
}
function renderTable(root) {
  const tbody = root.querySelector("#sar-tbody");
  if (!tbody) return;
  tbody.innerHTML = _rows.length === 0 ? `<tr><td colspan="7" class="px-4 py-10 text-center text-emerald-600 text-xs">${t("self_approved_review.empty")}</td></tr>` : _rows.map(rowHtml).join("");
  root.querySelector("#sar-count").textContent = t("self_approved_review.count", { n: _rows.length });
}
async function reload(root) {
  const repo = getRepo();
  _decisions = repo ? await repo.list(KIND_DECISION, null) : [];
  recompute();
  renderTable(root);
}
async function render(root) {
  if (_onEntity) window.removeEventListener("vdg:entity-changed", _onEntity);
  const months = monthOptions();
  _selectedPeriod = months[0]?.key || null;
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-base font-semibold text-slate-900">${t("self_approved_review.title")}</div>
          <div class="text-xs text-slate-500">${t("self_approved_review.subtitle")}</div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-slate-700" for="sar-period-select">${t("self_approved_review.label.period")}</label>
          <select id="sar-period-select"
            class="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="${t("self_approved_review.label.period")}">
            ${months.map(({ key, label }) => `<option value="${key}">${label}</option>`).join("")}
          </select>
        </div>
      </div>

      <div id="sar-count" class="text-xs text-slate-500"></div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.decided_at")}</th>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.decided_by")}</th>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.type")}</th>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.target")}</th>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.decision")}</th>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.reason")}</th>
              <th class="px-4 py-2 text-left" scope="col">${t("self_approved_review.col.comment")}</th>
            </tr>
          </thead>
          <tbody id="sar-tbody"></tbody>
        </table>
      </div>
    </div>`;
  await reload(root);
  root.querySelector("#sar-period-select")?.addEventListener("change", (e) => {
    _selectedPeriod = e.target.value;
    recompute();
    renderTable(root);
  });
  _onEntity = (e) => {
    if (e.detail?.kind !== KIND_DECISION) return;
    reload(root);
  };
  window.addEventListener("vdg:entity-changed", _onEntity);
}
export {
  render
};
