import {
  PERIOD_CLOSE_KIND,
  REASON_MAX_CHARS,
  closePeriod,
  getCurrentPeriodLock,
  loadClosedPeriods,
  reopenPeriod,
  runPreCloseChecks
} from "./chunk-QL3VBJTQ.js";
import {
  todayLocal
} from "./chunk-CFMB5DE5.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  showConfirm
} from "./chunk-SXHZPWVA.js";
import "./chunk-EQL6UFHA.js";
import {
  ROLE_MANAGER
} from "./chunk-KXTXGKNK.js";
import {
  hasRole
} from "./chunk-B24LWBUG.js";
import {
  t
} from "./chunk-NPO6NGQC.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/close-period.js
var SHEETJS_CDN = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
var MONTH_COUNT_BACK = 12;
var OPENING_TOAST_MS = 8e3;
var _selectedPeriod = null;
var _checkResults = [];
var _closedPeriods = /* @__PURE__ */ new Set();
var _sheetJsLoaded = false;
function getRepo() {
  return window.__vdg_repo;
}
function getLedgerRepo() {
  return window.__vdg_ledger_repo;
}
function currentUser() {
  return window.__vdg_auth?.getCurrentUser?.()?.email || "manager";
}
function toast(type, message, duration) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type, message, duration } }));
}
function _monthOptions() {
  const now = /* @__PURE__ */ new Date();
  const opts = [];
  for (let i = 0; i < MONTH_COUNT_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ key, label: d.toLocaleString("default", { year: "numeric", month: "long" }) });
  }
  return opts;
}
function _checkIcon(severity, failCount) {
  if (failCount === 0) return "\u2705";
  return severity === "warn" ? "\u26A0\uFE0F" : "\u2139\uFE0F";
}
function _checkClass(severity, failCount) {
  if (failCount === 0) return "text-emerald-700";
  return severity === "warn" ? "text-amber-600" : "text-blue-600";
}
function _canProceed(results) {
  return results.every((r) => !(r.severity === "warn" && r.failCount > 0));
}
function renderChecklist(root, results) {
  const tbody = root.querySelector("#check-tbody");
  if (!tbody) return;
  tbody.innerHTML = results.map((r) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-2 text-base">${_checkIcon(r.severity, r.failCount)}</td>
      <td class="px-4 py-2 text-sm text-slate-700">${t("close_period.check." + r.id)}</td>
      <td class="px-4 py-2 text-sm font-mono ${_checkClass(r.severity, r.failCount)}">${r.failCount}</td>
      <td class="px-4 py-2">
        ${r.failCount > 0 ? `<button data-view-check="${r.id}"
          class="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">${t("close_period.action.view")}</button>` : ""}
      </td>
    </tr>`).join("");
  const proceedBtn = root.querySelector("#btn-proceed");
  if (proceedBtn) {
    proceedBtn.disabled = !_canProceed(results);
    proceedBtn.className = proceedBtn.disabled ? "px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-400 cursor-not-allowed" : "px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500";
  }
}
function renderPeriodSelect(root, periods, closed) {
  const sel = root.querySelector("#period-select");
  if (!sel) return;
  sel.innerHTML = periods.map(({ key, label }) => {
    const isLocked = closed.has(key);
    const isNow = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7) === key;
    const disabled = isNow ? "disabled" : "";
    return `<option value="${key}" ${disabled}>${isLocked ? "\u{1F512} " : ""}${label}</option>`;
  }).join("");
  if (periods.length) _selectedPeriod = periods[0].key;
}
async function renderLockBanner(root, period) {
  const banner = root.querySelector("#lock-banner");
  if (!banner) return;
  const lock = await getCurrentPeriodLock(getRepo(), period);
  if (lock.locked) {
    banner.className = "mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between";
    banner.innerHTML = `
      <span>\u{1F512} ${t("close_period.banner.locked", { p: period, u: lock.record.locked_by })}</span>
      <button id="btn-reopen" class="ml-4 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="${t("close_period.action.reopen")}">${t("close_period.action.reopen")}</button>`;
  } else {
    banner.className = "hidden";
    banner.innerHTML = "";
  }
}
async function loadSheetJs() {
  if (_sheetJsLoaded || window.XLSX) {
    _sheetJsLoaded = true;
    return;
  }
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = SHEETJS_CDN;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  _sheetJsLoaded = true;
}
async function handleExport(period) {
  const repo = getRepo();
  if (!repo || !period) return;
  const records = await repo.list(PERIOD_CLOSE_KIND, null).catch(() => []);
  const rec = records.find((r) => r.period === period);
  await loadSheetJs();
  if (!window.XLSX) {
    window.print();
    return;
  }
  const XLSX = window.XLSX;
  const date = todayLocal();
  const snapshot = rec?.checklist_snapshot || [];
  const ws1Data = [
    ["Period", "Closed At", "Closed By"],
    [period, rec?.closed_at || "\u2014", rec?.closed_by || "\u2014"]
  ];
  const ws2Data = [
    ["Check", "Severity", "Fail Count"],
    ...snapshot.map((r) => [r.label, r.severity, r.failCount])
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws1Data), "PnL Locked");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws2Data), "Checklist");
  XLSX.writeFile(wb, `vdg-period-close-${period}-${date}.xlsx`);
}
async function render(root) {
  if (!hasRole(ROLE_MANAGER)) {
    navigate("/dashboard");
    return;
  }
  const repo = getRepo();
  const months = _monthOptions();
  _closedPeriods = new Set(repo ? await loadClosedPeriods(repo) : []);
  _checkResults = [];
  _selectedPeriod = months[0]?.key || null;
  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[860px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-base font-semibold text-slate-900">${t("close_period.title")}</div>
          <div class="text-xs text-slate-500">${t("close_period.subtitle")}</div>
        </div>
        <div class="flex gap-2">
          <button id="btn-export"
            class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 btn-export
                   focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="${t("close_period.action.export")}">${t("close_period.action.export")}</button>
        </div>
      </div>

      <div id="lock-banner" class="hidden"></div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div class="flex items-center gap-3">
          <label class="text-sm font-medium text-slate-700" for="period-select">${t("close_period.label.period")}</label>
          <select id="period-select"
            class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="${t("close_period.label.period")}">
          </select>
          <button id="btn-run-checks"
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="${t("close_period.action.run_checks")}">${t("close_period.action.run_checks")}</button>
        </div>

        <table class="w-full text-sm" role="grid">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr>
              <th class="px-4 py-2 text-left w-8" scope="col"></th>
              <th class="px-4 py-2 text-left" scope="col">${t("close_period.col.check")}</th>
              <th class="px-4 py-2 text-left w-24" scope="col">${t("close_period.col.failing")}</th>
              <th class="px-4 py-2 w-16" scope="col"></th>
            </tr>
          </thead>
          <tbody id="check-tbody">
            <tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 text-xs">${t("close_period.empty")}</td></tr>
          </tbody>
        </table>

        <div class="flex items-center gap-3">
          <button id="btn-proceed" disabled
            class="px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-400 cursor-not-allowed"
            aria-label="${t("close_period.action.proceed")}">${t("close_period.action.proceed")}</button>
          <span class="text-xs text-slate-400">${t("close_period.hint.must_pass")}</span>
        </div>
      </div>

      <!-- Reopen form (hidden) -->
      <div id="reopen-form" class="hidden bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div class="text-sm font-medium text-slate-800">${t("close_period.reopen.title")}</div>
        <textarea id="reopen-reason" rows="3" maxlength="${REASON_MAX_CHARS}"
          placeholder="${t("close_period.reopen.placeholder")}"
          class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="${t("close_period.reopen.title")}"></textarea>
        <div class="flex gap-2">
          <button id="btn-confirm-reopen"
            class="px-4 py-2 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="${t("close_period.reopen.confirm")}">${t("close_period.reopen.confirm")}</button>
          <button id="btn-cancel-reopen"
            class="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="${t("close_period.reopen.cancel")}">${t("close_period.reopen.cancel")}</button>
        </div>
      </div>
    </div>`;
  renderPeriodSelect(root, months, _closedPeriods);
  await renderLockBanner(root, _selectedPeriod);
  root.querySelector("#period-select").addEventListener("change", async (e) => {
    _selectedPeriod = e.target.value;
    _checkResults = [];
    renderChecklist(root, []);
    await renderLockBanner(root, _selectedPeriod);
    root.querySelector("#btn-proceed").disabled = true;
  });
  root.querySelector("#btn-run-checks").addEventListener("click", async () => {
    if (!repo || !_selectedPeriod) return;
    const btn = root.querySelector("#btn-run-checks");
    btn.textContent = t("close_period.status.running");
    btn.disabled = true;
    try {
      _checkResults = await runPreCloseChecks(repo, _selectedPeriod);
      renderChecklist(root, _checkResults);
    } catch (err) {
      console.error("[period-close] checks failed:", err);
      window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { type: "error", message: t("close_period.toast.check_failed") + ": " + err.message } }));
    } finally {
      btn.textContent = t("close_period.action.run_checks");
      btn.disabled = false;
    }
  });
  root.querySelector("#btn-proceed").addEventListener("click", async () => {
    if (!_selectedPeriod || !_canProceed(_checkResults)) return;
    const ok = await showConfirm({
      title: t("close_period.confirm.title", { p: _selectedPeriod }),
      body: t("close_period.confirm.body"),
      confirmLabel: t("close_period.confirm.ok"),
      cancelLabel: t("close_period.confirm.cancel"),
      destructive: true
    });
    if (!ok) return;
    try {
      const snap = await closePeriod(repo, _selectedPeriod, currentUser(), _checkResults, getLedgerRepo());
      _closedPeriods.add(_selectedPeriod);
      renderPeriodSelect(root, months, _closedPeriods);
      await renderLockBanner(root, _selectedPeriod);
      toast("success", t("close_period.toast.closed", { p: _selectedPeriod }));
      if (snap.skipped) {
        toast("warn", t("close_period.toast.opening_skipped"), OPENING_TOAST_MS);
      } else if (snap.failed.length) {
        toast("warn", t("close_period.toast.opening_partial", { n: snap.failed.length }), OPENING_TOAST_MS);
      } else {
        toast("info", t("close_period.toast.opening_saved", { n: snap.accountCount }), OPENING_TOAST_MS);
      }
    } catch (err) {
      console.error("[period-close] close failed:", err);
      toast("error", err.message);
    }
  });
  root.querySelector("#btn-export").addEventListener("click", () => handleExport(_selectedPeriod));
  root.addEventListener("click", (e) => {
    if (e.target.id === "btn-reopen") {
      root.querySelector("#reopen-form").classList.remove("hidden");
    }
    if (e.target.id === "btn-cancel-reopen") {
      root.querySelector("#reopen-form").classList.add("hidden");
    }
    if (e.target.id === "btn-confirm-reopen") {
      const reason = root.querySelector("#reopen-reason")?.value?.trim();
      if (!reason) return;
      reopenPeriod(repo, _selectedPeriod, reason, currentUser()).then(async () => {
        _closedPeriods.delete(_selectedPeriod);
        renderPeriodSelect(root, months, _closedPeriods);
        await renderLockBanner(root, _selectedPeriod);
        root.querySelector("#reopen-form").classList.add("hidden");
        toast("info", t("close_period.toast.reopened", { p: _selectedPeriod }));
      }).catch((err) => {
        console.error("[period-close] reopen failed:", err);
        toast("error", err.message);
      });
    }
    const viewBtn = e.target.closest("[data-view-check]");
    if (viewBtn) {
      const checkId = viewBtn.dataset.viewCheck;
      const result = _checkResults.find((r) => r.id === checkId);
      if (result?.failIds?.length) {
        window.dispatchEvent(new CustomEvent("vdg:open-detail", {
          detail: { kind: "shipment", id: result.failIds[0] }
        }));
      }
    }
  });
}
export {
  render
};
