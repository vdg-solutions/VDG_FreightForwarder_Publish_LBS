import {
  applyRepost,
  buildLedgerCSV,
  computeRunningBalances,
  dayBefore,
  filterLegs,
  groupChartByType,
  isPeriodStart,
  openingBalanceFor,
  periodOfDate,
  planRepost,
  postReversal,
  purgeOrphans,
  runAndRecord
} from "./chunk-BRDPRF6R.js";
import {
  isViewSuperseded
} from "./chunk-2PLULDG2.js";
import {
  listCloseRecords
} from "./chunk-QL3VBJTQ.js";
import {
  currentUserRole
} from "./chunk-Z5J2LHCQ.js";
import {
  todayLocal
} from "./chunk-CFMB5DE5.js";
import {
  renderMasterLoadRetryStatus,
  safeMasterLoad
} from "./chunk-J2L475OW.js";
import "./chunk-JAZY43GR.js";
import {
  showConfirm
} from "./chunk-SXHZPWVA.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  currentLocale,
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-unbalanced-modal.js
function fmtAmount(n) {
  return n ? Number(n).toLocaleString("vi-VN") : "\u2014";
}
function jumpToUnbalancedEntry(entryId, legs) {
  const source = legs[0]?.source;
  if (source) {
    window.dispatchEvent(new CustomEvent("vdg:open-detail", {
      detail: { kind: source.type, id: source.id }
    }));
  }
  const debitSum = legs.reduce((sum, l) => sum + (l.debit || 0), 0);
  const creditSum = legs.reduce((sum, l) => sum + (l.credit || 0), 0);
  const trs = legs.map((l) => `
    <tr class="border-b border-slate-100">
      <td class="px-3 py-2 font-mono">${l.account_code}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtAmount(l.debit)}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtAmount(l.credit)}</td>
    </tr>
  `).join("");
  const dlg = document.createElement("dialog");
  dlg.className = "rounded-xl shadow-2xl p-0 w-[500px] max-w-[95vw] bg-white backdrop:bg-black/40";
  dlg.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <div>
        <div class="font-semibold text-slate-900 text-sm">Chi ti\u1EBFt b\xFAt to\xE1n (Entry Details)</div>
        <div class="text-xs text-slate-500 font-mono mt-0.5">${entryId}</div>
      </div>
      <button class="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500" onclick="this.closest('dialog').close()">\u2715</button>
    </div>
    <div class="px-6 py-4 text-xs">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 text-slate-500 uppercase">
            <th class="px-3 py-2">T\xE0i kho\u1EA3n</th>
            <th class="px-3 py-2 text-right">N\u1EE3 (Debit)</th>
            <th class="px-3 py-2 text-right">C\xF3 (Credit)</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot>
          <tr class="font-bold bg-amber-50 text-amber-900">
            <td class="px-3 py-2">T\u1ED4NG</td>
            <td class="px-3 py-2 text-right font-mono">${fmtAmount(debitSum)}</td>
            <td class="px-3 py-2 text-right font-mono">${fmtAmount(creditSum)}</td>
          </tr>
        </tfoot>
      </table>
      <div class="mt-4 text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex justify-between items-center font-semibold">
        <span>L\u1EC7ch (Discrepancy):</span>
        <span class="font-mono text-sm">${fmtAmount(Math.abs(debitSum - creditSum))}</span>
      </div>
    </div>
  `;
  document.body.appendChild(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  dlg.showModal();
}

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-viewer-unbalanced.js
var ENTRY_LEGS_TAG = "ledger:entry-legs";
function renderUnbalancedList(root, repo, ids) {
  const list = root.querySelector("#reconcile-unbalanced-list");
  if (!list) return;
  if (!ids.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = `
    <div class="border border-amber-200 bg-amber-50 rounded-lg p-2 flex flex-col gap-1">
      ${ids.map((entryId) => `
        <button data-unbalanced-entry="${entryId}"
          class="w-full text-left px-3 py-2 text-xs font-mono text-amber-900 bg-amber-100 hover:bg-amber-200 rounded flex justify-between items-center group transition-colors">
          <span class="font-bold">${entryId}</span>
          <svg class="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>`).join("")}
    </div>`;
  list.querySelectorAll("[data-unbalanced-entry]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const entryId = btn.dataset.unbalancedEntry;
      if (!repo) return;
      const res = await safeMasterLoad(() => repo.listAllLegsInEntry(entryId), ENTRY_LEGS_TAG);
      if (res.ok) jumpToUnbalancedEntry(entryId, res.value);
    });
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-reconcile-control.js
function fmtRunDate(runAt) {
  return runAt ? new Date(runAt).toLocaleDateString("vi-VN") : "";
}
function renderReconcileStatus(root, rec) {
  const status = root.querySelector("#reconcile-status");
  if (!status) return;
  if (!rec) {
    status.textContent = t("ledger.reconcile.never_run");
    return;
  }
  status.textContent = rec.balanced ? t("ledger.reconcile.status_ok").replace("{date}", fmtRunDate(rec.run_at)) : t("ledger.reconcile.status_bad").replace("{date}", fmtRunDate(rec.run_at)).replace("{n}", String(rec.unbalanced_ids?.length ?? 0));
}
async function runReconciliationNow(root, repo) {
  if (!repo) return null;
  const btn = root.querySelector("#btn-reconcile-now");
  const status = root.querySelector("#reconcile-status");
  if (btn) btn.disabled = true;
  if (status) status.textContent = t("ledger.reconcile.running");
  try {
    const rec = await runAndRecord(repo);
    renderReconcileStatus(root, rec);
    renderUnbalancedList(root, repo, rec?.unbalanced_ids ?? []);
    return rec;
  } catch (err) {
    if (status) status.textContent = t("ledger.reconcile.error");
    console.error("[ledger-viewer] reconcile failed:", err);
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-opening-balance.js
async function loadOpeningBalance(ledgerRepo, dataRepo, accountCode, dateFrom) {
  const asOf = dayBefore(dateFrom);
  if (!ledgerRepo || !asOf) return { live: 0, stamped: null, mismatch: false };
  let live = 0;
  try {
    const res = await ledgerRepo.getBalance(accountCode, asOf);
    live = Number(res?.balance) || 0;
  } catch (err) {
    console.error("[ledger] opening balance read failed:", err);
    return { live: 0, stamped: null, mismatch: false };
  }
  if (!isPeriodStart(dateFrom)) return { live, stamped: null, mismatch: false };
  const closes = await listCloseRecords(dataRepo);
  const stamped = openingBalanceFor(closes, periodOfDate(dateFrom), accountCode);
  return { live, stamped, mismatch: !!stamped && stamped.balance !== live };
}
function openingRowHtml(opening, fmtAmount3) {
  if (!opening) return "";
  const note = opening.stamped ? t("ledger.opening.closed_by", { p: opening.stamped.source_period, u: opening.stamped.closed_by }) : "";
  const warn = opening.mismatch ? `<div class="text-[11px] text-amber-700">${t("ledger.opening.mismatch", { b: fmtAmount3(opening.stamped.balance) })}</div>` : "";
  return `
    <tr class="bg-slate-50 border-t border-slate-200 text-xs font-medium">
      <td class="px-3 py-1.5" colspan="6">
        ${t("ledger.opening.label")}
        ${note ? `<span class="ml-2 text-[11px] font-normal text-slate-500">${note}</span>` : ""}
        ${warn}
      </td>
      <td class="px-3 py-1.5"></td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount3(opening.live)}</td>
    </tr>`;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-repost-panel.js
var REPOST_YEAR = (/* @__PURE__ */ new Date()).getFullYear();
var MAX_REASON_ROWS_SHOWN = 50;
var REASON_KEY_PREFIX = "ledger.repost.reason.";
var ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}
function toast(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message } }));
}
function fmtRunDate2(runAt) {
  return runAt ? new Date(runAt).toLocaleDateString("vi-VN") : "";
}
function shellHtml() {
  return `
    <div class="border border-slate-200 rounded-lg p-4 bg-white">
      <div class="mb-3">
        <h3 class="text-sm font-semibold text-slate-800">${t("ledger.repost.section_title")}</h3>
        <p class="text-[11px] text-slate-500 mt-0.5 max-w-2xl">${t("ledger.repost.section_help")}</p>
      </div>
      <div class="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div id="repost-status" class="text-xs text-slate-600"></div>
        <div class="flex gap-2">
          <button id="btn-repost-preview" title="${t("ledger.repost.preview_hint")}"
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100"
            aria-label="${t("ledger.repost.preview_button")}">${t("ledger.repost.preview_button")}</button>
          <button id="btn-repost-apply" disabled title="${t("ledger.repost.button_hint")}"
            class="px-3 py-1.5 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40"
            aria-label="${t("ledger.repost.button")}">${t("ledger.repost.button")}</button>
          <button id="btn-purge-orphans" disabled title="${t("ledger.repost.purge_hint")}"
            class="px-3 py-1.5 text-xs rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            aria-label="${t("ledger.repost.purge_button")}">${t("ledger.repost.purge_button")}</button>
        </div>
      </div>
      <div id="repost-preview-list" class="text-xs"></div>
    </div>`;
}
function reasonRowHtml(r) {
  const isKeyedReason = r.reason.startsWith(REASON_KEY_PREFIX);
  const reasonText = isKeyedReason ? t(r.reason) : t("ledger.repost.reason.other");
  const titleAttr = isKeyedReason ? "" : ` title="${escapeHtml(r.reason)}"`;
  return `
          <div class="px-2 py-1 font-mono text-amber-900 flex justify-between gap-2"${titleAttr}>
            <span class="font-bold">${r.entry_id}</span>
            <span class="font-sans text-amber-700/80 text-right">${reasonText}</span>
          </div>`;
}
function reasonRowsHtml(label, rows) {
  if (!rows.length) return "";
  const shown = rows.slice(0, MAX_REASON_ROWS_SHOWN);
  const overflow = rows.length - shown.length;
  return `
    <div class="mt-2">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">${label} (${rows.length})</div>
      <div class="border border-amber-200 bg-amber-50 rounded-lg p-2 flex flex-col gap-1">
        ${shown.map(reasonRowHtml).join("")}
        ${overflow > 0 ? `
          <div class="px-2 py-1 text-amber-700/70 italic">${t("ledger.repost.and_more", { n: String(overflow) })}</div>` : ""}
      </div>
    </div>`;
}
function renderPreview(root, plan) {
  const list = root.querySelector("#repost-preview-list");
  const applyBtn = root.querySelector("#btn-repost-apply");
  const purgeBtn = root.querySelector("#btn-purge-orphans");
  if (!plan) {
    list.innerHTML = "";
    applyBtn.disabled = true;
    purgeBtn.disabled = true;
    return;
  }
  const total = plan.replacements.length + plan.unchanged_count + plan.flagged.length + plan.orphans.length;
  applyBtn.disabled = plan.replacements.length === 0;
  purgeBtn.disabled = plan.orphans.length === 0;
  if (!total) {
    list.innerHTML = `<div class="text-slate-400">${t("ledger.repost.none_found")}</div>`;
    return;
  }
  list.innerHTML = `
    <div class="text-slate-600">${t("ledger.repost.result", {
    replaced: String(plan.replacements.length),
    unchanged: String(plan.unchanged_count),
    flagged: String(plan.flagged.length)
  })}</div>
    ${reasonRowsHtml(t("ledger.repost.flagged_label"), plan.flagged)}
    ${reasonRowsHtml(t("ledger.repost.orphans_label"), plan.orphans)}`;
}
function renderStatus(root, lastRepost) {
  const status = root.querySelector("#repost-status");
  status.textContent = lastRepost ? `${fmtRunDate2(lastRepost.run_at)} \u2014 ${t("ledger.repost.result", {
    replaced: String(lastRepost.replaced),
    unchanged: String(lastRepost.left_unchanged),
    flagged: String(lastRepost.flagged)
  })}` : "";
}
async function mountRepostPanelIfReady(root) {
  const entityRepo = window.__vdg_repo;
  const ledgerRepo = window.__vdg_ledger_repo;
  if (!root || !entityRepo || !ledgerRepo) return;
  await mountRepostPanel(root, { ledgerRepo, entityRepo });
}
async function mountRepostPanel(root, { ledgerRepo, entityRepo }) {
  root.innerHTML = shellHtml();
  let lastPlan = null;
  async function runPreview() {
    const btn = root.querySelector("#btn-repost-preview");
    const list = root.querySelector("#repost-preview-list");
    btn.disabled = true;
    if (list) list.innerHTML = `<div class="text-slate-400">${t("ledger.repost.running")}</div>`;
    try {
      lastPlan = await planRepost(entityRepo, ledgerRepo, REPOST_YEAR);
      renderPreview(root, lastPlan);
    } catch (err) {
      console.error("[ledger-repost-panel] preview failed:", err);
      if (list) list.innerHTML = `<div class="text-rose-600">${t("ledger.repost.error")}</div>`;
      toast("error", t("ledger.repost.error"));
    } finally {
      btn.disabled = false;
    }
  }
  root.querySelector("#btn-repost-preview").addEventListener("click", runPreview);
  root.querySelector("#btn-repost-apply").addEventListener("click", async () => {
    if (!lastPlan || !lastPlan.replacements.length) return;
    const ok = await showConfirm({
      title: t("ledger.repost.confirm_title"),
      body: t("ledger.repost.confirm_body", { n: String(lastPlan.replacements.length) }),
      confirmLabel: t("ledger.repost.button")
    });
    if (!ok) return;
    const previewBtn = root.querySelector("#btn-repost-preview");
    const applyBtn = root.querySelector("#btn-repost-apply");
    previewBtn.disabled = true;
    applyBtn.disabled = true;
    try {
      const record = await applyRepost(ledgerRepo, lastPlan);
      renderStatus(root, record);
      toast("success", t("ledger.repost.result", {
        replaced: String(record.replaced),
        unchanged: String(record.left_unchanged),
        flagged: String(record.flagged)
      }));
      await runPreview();
    } catch (err) {
      console.error("[ledger-repost-panel] apply failed:", err);
      toast("error", t("ledger.repost.error"));
    } finally {
      previewBtn.disabled = false;
    }
  });
  root.querySelector("#btn-purge-orphans").addEventListener("click", async () => {
    if (!lastPlan || !lastPlan.orphans.length) return;
    const ok = await showConfirm({
      title: t("ledger.repost.purge_confirm_title"),
      body: t("ledger.repost.purge_confirm_body", { n: String(lastPlan.orphans.length) }),
      confirmLabel: t("ledger.repost.purge_button"),
      destructive: true
    });
    if (!ok) return;
    const purgeBtn = root.querySelector("#btn-purge-orphans");
    purgeBtn.disabled = true;
    try {
      const record = await purgeOrphans(ledgerRepo, lastPlan, REPOST_YEAR);
      toast(record.failed ? "error" : "success", t("ledger.repost.purge_result", {
        purged: String(record.purged),
        failed: String(record.failed)
      }));
      await runPreview();
    } catch (err) {
      console.error("[ledger-repost-panel] purge failed:", err);
      toast("error", t("ledger.repost.error"));
      purgeBtn.disabled = false;
    }
  });
  ledgerRepo.getLastRepost().then((lastRepost) => renderStatus(root, lastRepost)).catch((err) => console.error("[ledger-repost-panel] getLastRepost failed:", err)).finally(() => runPreview());
}

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-reverse-control.js
var SOURCE_REVERSAL = "reversal";
function toast2(type, message) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message } }));
}
function reversalLabelFor(leg) {
  return {
    isReversal: leg.source?.type === SOURCE_REVERSAL,
    originalId: leg.source?.id ?? null
  };
}
function renderReversalBadge(r) {
  const { isReversal, originalId } = reversalLabelFor(r);
  if (!isReversal) return "";
  return `
    <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700">${t("ledger.reversal.row_label")}</span>
    <button data-reversal-of="${originalId}" class="ml-1 text-blue-600 hover:underline text-[10px]">${t("ledger.reversal.of", { entry: originalId })}</button>`;
}
function bindLegRowInteractions(panel, rows, { onSelectRow }) {
  panel.querySelectorAll("[data-reversal-of]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("vdg:open-detail", {
        detail: { kind: "journal_entry", id: btn.dataset.reversalOf }
      }));
    });
  });
  panel.querySelectorAll("[data-entry-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const entryId = tr.dataset.entryId;
      onSelectRow(entryId, rows.find((r) => r.entry_id === entryId) ?? null);
    });
  });
}
function mountReverseControl(host, { selectedEntryId, selectedLeg, actorId, ledgerRepo, onDone }) {
  if (!host) return;
  if (!selectedEntryId || reversalLabelFor(selectedLeg ?? {}).isReversal) {
    host.innerHTML = "";
    return;
  }
  host.innerHTML = `
    <button id="btn-reverse-entry"
      class="px-3 py-1.5 text-xs rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
      aria-label="${t("ledger.reversal.button")}">${t("ledger.reversal.button")}</button>`;
  host.querySelector("#btn-reverse-entry").addEventListener("click", async () => {
    const ok = await showConfirm({
      title: t("ledger.reversal.confirm_title"),
      body: t("ledger.reversal.confirm_body", { entry: selectedEntryId }),
      destructive: true
    });
    if (!ok) return;
    const btn = host.querySelector("#btn-reverse-entry");
    btn.disabled = true;
    try {
      await postReversal(selectedEntryId, actorId, ledgerRepo);
      onDone?.();
    } catch (err) {
      console.error("[ledger-reverse-control] reversal failed:", err);
      toast2("error", t("ledger.reversal.error"));
    } finally {
      btn.disabled = false;
    }
  });
}
function refreshReverseControl(root, state) {
  if (currentUserRole() !== ROLE_MANAGER) return;
  const host = root.querySelector("#reverse-control-root");
  if (host) mountReverseControl(host, state);
}

// output/web/js.tmp/implementations/ui/bootstrap/views/accounting/ledger-viewer.js
var TYPE_LABEL_KEYS = {
  Asset: "ledger.type.asset",
  Liability: "ledger.type.liability",
  Revenue: "ledger.type.revenue",
  Expense: "ledger.type.expense"
};
var CHART_TAG = "ledger:chart";
var RECON_TAG = "ledger:recon";
var LEGS_TAG = "ledger:legs";
var BALANCE_TAG = "ledger:balance";
var REPOST_TAG = "ledger:repost-panel";
var OPENING_TAG = "ledger:opening-balance";
var VIEW_DATA_LOAD_BUDGET_MS = 6e3;
function getLedgerRepo() {
  return window.__vdg_ledger_repo;
}
function defaultFilter() {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return {
    dateFrom: `${year}-01-01`,
    dateTo: todayLocal(),
    minAmount: "",
    maxAmount: "",
    search: ""
  };
}
var _accounts = [];
var _selectedAccount = null;
var _rawLegs = [];
var _filter = defaultFilter();
var _lastReconciliation = null;
var _selectedEntryId = null;
var _selectedLeg = null;
var _opening = null;
function accountName(account) {
  return currentLocale() === "vi" ? account.name_vi : account.name_en;
}
function fmtAmount2(n) {
  return n ? Number(n).toLocaleString("vi-VN") : "\u2014";
}
function displayedRows() {
  if (!_selectedAccount) return [];
  const filtered = filterLegs(_rawLegs, _filter);
  return computeRunningBalances(filtered, _selectedAccount.balance_side, _opening?.live ?? 0).slice().reverse();
}
function shellHtml2() {
  return `
    <div class="p-6 max-w-[1600px] mx-auto print-root" data-report-title="Ledger">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div class="text-sm font-semibold text-slate-900">${t("ledger.title")}</div>
        <button id="btn-export-csv"
          class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          aria-label="${t("ledger.export_csv")}">${t("ledger.export_csv")}</button>
      </div>

      <div class="flex flex-wrap gap-2 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 mb-4">
        <label class="text-xs text-slate-500 flex items-center gap-1">${t("ledger.filter.date_from")}
          <input id="f-date-from" type="date" value="${_filter.dateFrom}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
        <label class="text-xs text-slate-500 flex items-center gap-1">${t("ledger.filter.date_to")}
          <input id="f-date-to" type="date" value="${_filter.dateTo}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
        <input id="f-min-amount" type="number" placeholder="${t("ledger.filter.min_amount")}"
          class="border border-slate-300 rounded px-2 py-1 text-xs w-32">
        <input id="f-max-amount" type="number" placeholder="${t("ledger.filter.max_amount")}"
          class="border border-slate-300 rounded px-2 py-1 text-xs w-32">
        <input id="f-search" type="text" placeholder="${t("ledger.filter.search")}"
          class="border border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-[160px]">
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 mb-2">
        <div id="reconcile-status" class="text-xs text-slate-600"></div>
        <button id="btn-reconcile-now"
          class="px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
          aria-label="${t("ledger.reconcile.button")}">${t("ledger.reconcile.button")}</button>
      </div>
      <div id="reconcile-unbalanced-list" class="mb-4"></div>

      ${currentUserRole() === ROLE_MANAGER ? '<div id="repost-panel-root" class="mb-4"></div>' : ""}

      <div class="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div id="closing-balance-banner" class="text-xs text-slate-500"></div>
        ${currentUserRole() === ROLE_MANAGER ? '<div id="reverse-control-root"></div>' : ""}</div>

      <div class="flex gap-4">
        <div id="chart-tree" class="w-64 shrink-0 border border-slate-200 rounded-lg p-2 h-[560px] overflow-y-auto"></div>
        <div id="legs-panel" class="flex-1 border border-slate-200 rounded-lg overflow-auto h-[560px]">
          <div class="p-8 text-center text-xs text-slate-400">${t("ledger.empty_account")}</div>
        </div>
      </div>
    </div>`;
}
function renderChartTree(root) {
  const tree = root.querySelector("#chart-tree");
  const groups = groupChartByType(_accounts);
  tree.innerHTML = groups.map((g) => `
    <div class="mb-3" data-acct-group="${g.type}">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 pb-1">
        ${t(TYPE_LABEL_KEYS[g.type])}
      </div>
      ${g.accounts.map((a) => `
        <button data-acct-code="${a.code}"
          class="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 ${_selectedAccount?.code === a.code ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}">
          ${a.code} \u2014 ${accountName(a)}
        </button>`).join("")}
    </div>`).join("");
  tree.querySelectorAll("[data-acct-code]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const account = _accounts.find((a) => a.code === btn.dataset.acctCode);
      if (account) selectAccount(root, account);
    });
  });
}
function renderLegsTable(root) {
  const panel = root.querySelector("#legs-panel");
  const rows = displayedRows();
  if (!rows.length && !_opening?.live) {
    panel.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">${t("ledger.empty_legs")}</div>`;
    updateReverseControl(root);
    return;
  }
  const trs = rows.map((r) => `
    <tr data-entry-id="${r.entry_id}" class="border-t border-slate-100 text-xs cursor-pointer ${r.entry_id === _selectedEntryId ? "bg-blue-50" : "hover:bg-slate-50"}">
      <td class="px-3 py-1.5">${r.date}</td>
      <td class="px-3 py-1.5 font-mono">${r.entry_id}</td>
      <td class="px-3 py-1.5">${r.desc ?? ""}${renderReversalBadge(r)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount2(r.debit)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount2(r.credit)}</td>
      <td class="px-3 py-1.5">${r.party ?? "\u2014"}</td>
      <td class="px-3 py-1.5">
        <button data-source-type="${r.source?.type ?? ""}" data-source-id="${r.source?.id ?? ""}"
          class="text-blue-600 hover:underline">${r.source ? `${r.source.type}:${r.source.id}` : "\u2014"}</button>
      </td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount2(r.running_balance)}</td>
    </tr>`).join("");
  panel.innerHTML = `
    <table class="w-full">
      <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase sticky top-0">
        <tr>
          <th class="px-3 py-1.5 text-left">${t("ledger.column.date")}</th>
          <th class="px-3 py-1.5 text-left">${t("ledger.column.entry")}</th>
          <th class="px-3 py-1.5 text-left">${t("ledger.column.desc")}</th>
          <th class="px-3 py-1.5 text-right">${t("ledger.column.debit")}</th>
          <th class="px-3 py-1.5 text-right">${t("ledger.column.credit")}</th>
          <th class="px-3 py-1.5 text-left">${t("ledger.column.party")}</th>
          <th class="px-3 py-1.5 text-left">${t("ledger.column.source")}</th>
          <th class="px-3 py-1.5 text-right">${t("ledger.column.balance")}</th>
        </tr>
      </thead>
      <tbody>${openingRowHtml(_opening, fmtAmount2)}${trs}</tbody>
    </table>`;
  panel.querySelectorAll("[data-source-id]").forEach((btn) => {
    if (!btn.dataset.sourceId) return;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent("vdg:open-detail", {
        detail: { kind: btn.dataset.sourceType, id: btn.dataset.sourceId }
      }));
    });
  });
  bindLegRowInteractions(panel, rows, {
    onSelectRow: (entryId, leg) => {
      _selectedEntryId = entryId;
      _selectedLeg = leg;
      renderLegsTable(root);
    }
  });
  updateReverseControl(root);
}
function updateReverseControl(root) {
  refreshReverseControl(root, {
    selectedEntryId: _selectedEntryId,
    selectedLeg: _selectedLeg,
    actorId: window.__vdg_current_user?.email,
    ledgerRepo: getLedgerRepo(),
    onDone: () => {
      _selectedEntryId = null;
      _selectedLeg = null;
      if (_selectedAccount) selectAccount(root, _selectedAccount);
    }
  });
}
async function refreshBalanceBanner(repo, account) {
  const banner = document.getElementById("closing-balance-banner");
  if (!banner) return;
  if (!repo) {
    banner.textContent = "";
    return;
  }
  const balRes = await safeMasterLoad(() => repo.getBalance(account.code, _filter.dateTo), BALANCE_TAG);
  banner.textContent = balRes.ok ? `${t("ledger.closing_balance")}: ${fmtAmount2(balRes.value.balance)}` : "";
}
async function selectAccount(root, account) {
  _selectedAccount = account;
  _selectedEntryId = null;
  _selectedLeg = null;
  renderChartTree(root);
  const repo = getLedgerRepo();
  const panel = root.querySelector("#legs-panel");
  if (!repo) {
    _rawLegs = [];
    renderLegsTable(root);
    return;
  }
  const year = Number(_filter.dateFrom.slice(0, 4));
  const legsRes = await safeMasterLoad(
    () => repo.listLegs(year, account.code, _filter.dateFrom, _filter.dateTo),
    LEGS_TAG
  );
  if (!legsRes.ok) {
    renderMasterLoadRetryStatus(panel, t("masters.load_error"), t("retry"), () => selectAccount(root, account));
    return;
  }
  _rawLegs = legsRes.value;
  const openRes = await safeMasterLoad(
    () => loadOpeningBalance(repo, window.__vdg_repo, account.code, _filter.dateFrom),
    OPENING_TAG
  );
  _opening = openRes.ok ? openRes.value : null;
  await refreshBalanceBanner(repo, account);
  renderLegsTable(root);
}
function bindFilterInputs(root) {
  const bind = (id, key, onDateChange) => {
    root.querySelector(`#${id}`)?.addEventListener("input", async (e) => {
      _filter[key] = e.target.value;
      if (onDateChange && _selectedAccount) await selectAccount(root, _selectedAccount);
      else renderLegsTable(root);
    });
  };
  bind("f-date-from", "dateFrom", true);
  bind("f-date-to", "dateTo", true);
  bind("f-min-amount", "minAmount", false);
  bind("f-max-amount", "maxAmount", false);
  bind("f-search", "search", false);
}
function exportCsv() {
  if (!_selectedAccount) return;
  const csv = buildLedgerCSV(displayedRows());
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vdg-ledger-${_selectedAccount.code}-${todayLocal()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5e3);
}
async function loadInitial(root, repo) {
  if (!repo) {
    _accounts = [];
    _lastReconciliation = null;
    renderChartTree(root);
    return;
  }
  if (isViewSuperseded(root)) return;
  const [chartRes, reconRes] = await Promise.all([
    safeMasterLoad(() => repo.chartOfAccounts(), CHART_TAG, VIEW_DATA_LOAD_BUDGET_MS),
    safeMasterLoad(() => repo.getLastReconciliation(), RECON_TAG, VIEW_DATA_LOAD_BUDGET_MS)
  ]);
  if (isViewSuperseded(root)) return;
  if (!chartRes.ok) {
    const tree = root.querySelector("#chart-tree");
    renderMasterLoadRetryStatus(tree, t("masters.load_error"), t("retry"), () => loadInitial(root, repo));
    return;
  }
  _accounts = chartRes.value;
  _lastReconciliation = reconRes.ok ? reconRes.value : null;
  renderChartTree(root);
  renderReconcileStatus(root, _lastReconciliation);
  renderUnbalancedList(root, repo, _lastReconciliation?.unbalanced_ids ?? []);
}
async function render(root) {
  const repo = getLedgerRepo();
  _selectedAccount = null;
  _rawLegs = [];
  _filter = defaultFilter();
  _lastReconciliation = null;
  _selectedEntryId = null;
  _selectedLeg = null;
  _opening = null;
  root.innerHTML = shellHtml2();
  bindFilterInputs(root);
  root.querySelector("#btn-export-csv").addEventListener("click", exportCsv);
  root.querySelector("#btn-reconcile-now").addEventListener("click", async () => {
    _lastReconciliation = await runReconciliationNow(root, getLedgerRepo()) ?? _lastReconciliation;
  });
  await loadInitial(root, repo);
  if (currentUserRole() === ROLE_MANAGER) {
    const panelRoot = root.querySelector("#repost-panel-root");
    await safeMasterLoad(() => mountRepostPanelIfReady(panelRoot), REPOST_TAG);
  }
}
export {
  render
};
