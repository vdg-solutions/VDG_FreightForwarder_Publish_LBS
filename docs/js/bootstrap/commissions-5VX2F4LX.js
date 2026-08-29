import {
  resolveSalesRepLabel
} from "./chunk-DXOUTKJE.js";
import {
  PREF_LOCKED_PERIODS_KEY,
  lockPeriod,
  readLockedPeriods
} from "./chunk-XF5P4IGN.js";
import {
  KIND_PNL_LINE,
  buildPeriodKey,
  compose,
  computeCommissions
} from "./chunk-PJCMTW4C.js";
import {
  bulkPut
} from "./chunk-U4F5HOXH.js";
import {
  currentUserEmail
} from "./chunk-N4OX2LG4.js";
import "./chunk-V5JGKO5Q.js";
import {
  KIND_SHIPMENT,
  listShipments
} from "./chunk-U4BJYZQA.js";
import {
  safeMasterLoad
} from "./chunk-CVQ465MH.js";
import "./chunk-JAZY43GR.js";
import {
  showConfirm
} from "./chunk-Z2PGQJIS.js";
import {
  t
} from "./chunk-YMZ4K7MJ.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/commission-slip.js
import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var COMPANY_NAME = "VDG FREIGHT FORWARDER";
function fmtNum(n) {
  return Number(n ?? 0).toLocaleString("vi-VN");
}
var VdgCommissionSlip = class extends LitElement {
  static properties = {
    data: { type: Object }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.data = null;
  }
  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => {
      window.print();
      const onDone = () => {
        this.remove();
        window.removeEventListener("afterprint", onDone);
      };
      window.addEventListener("afterprint", onDone);
    });
  }
  render() {
    const d = this.data || {};
    const date = (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN");
    const currentUser2 = { email: currentUserEmail() };
    const salesRep = resolveSalesRepLabel(d.sales_rep || "", currentUser2, t) || "\u2014";
    return html`
      <style>
        @media screen { .print-only { display: none !important; } }
        @media print  { .print-only { display: block !important; } }
      </style>
      <div class="print-only" style="font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:18px;font-weight:700;letter-spacing:1px;">${COMPANY_NAME}</div>
          <div style="font-size:13px;color:#555;margin-top:4px;">${t("commission.slip.title")}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">${t("commission.slip.print_date")} ${date}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tbody>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;width:50%;">${t("commission.slip.sales_rep")}</td>
              <td style="padding:8px 4px;font-weight:600;">${salesRep}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t("commission.slip.period")}</td>
              <td style="padding:8px 4px;font-weight:600;">${d.period || "\u2014"}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t("commission.slip.gross_margin")}</td>
              <td style="padding:8px 4px;">${fmtNum(d.margin)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t("commission.slip.commission_rate")}</td>
              <td style="padding:8px 4px;">${d.commission_pct ?? 10}%</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t("commission.slip.commission")}</td>
              <td style="padding:8px 4px;">${fmtNum(d.commission)}</td>
            </tr>
            <tr style="border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px 4px;color:#64748b;">${t("commission.slip.advances")}</td>
              <td style="padding:8px 4px;">${fmtNum(d.advances)}</td>
            </tr>
            <tr>
              <td style="padding:8px 4px;color:#0f172a;font-weight:700;">${t("commission.slip.net_payable")}</td>
              <td style="padding:8px 4px;font-weight:700;font-size:14px;">${fmtNum(d.net_payable)}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:40px;display:flex;justify-content:flex-end;">
          <div style="text-align:center;min-width:200px;">
            <div style="font-size:12px;color:#64748b;">${t("commission.signature_label")} _______________</div>
          </div>
        </div>
      </div>`;
  }
};
customElements.define("vdg-commission-slip", VdgCommissionSlip);

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/commission/suggestions-banner.js
var KIND_COMMISSION_ENTRY = "commission_entry";
var KIND_COMMISSION_RULES = "commission_rules";
var PATTERN_THRESHOLD = 3;
var SESSION_DISMISS_PREFIX = "vdg_commission_suggest_dismissed_";
var DEFAULT_PROMOTE_PRIORITY = 5;
function groupKey(pct, recipient, kind) {
  return `${pct}|${recipient}|${kind}`;
}
function buildGroups(entries) {
  const map = /* @__PURE__ */ new Map();
  for (const e of entries) {
    if (e.source !== "Override") continue;
    if (e.commission_pct == null || !e.recipient) continue;
    const key = groupKey(e.commission_pct, e.recipient, e.kind || "");
    const cur = map.get(key) || { pct: e.commission_pct, recipient: e.recipient, kind: e.kind, count: 0 };
    cur.count++;
    map.set(key, cur);
  }
  return map;
}
function autoSlug(recipient) {
  return recipient.toLowerCase().replace(/\s+/g, "-");
}
function bannerHtml(gk, pattern, count, priority) {
  const msg = t("commission.suggest_promote").replace("{pattern}", pattern).replace("{count}", count);
  return `
    <div class="commission-suggest-banner flex items-center justify-between gap-3
      px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 mb-3"
      data-gk="${gk}">
      <span class="text-xs text-blue-800">${msg}</span>
      <div class="flex items-center gap-2 shrink-0">
        <label class="text-[10px] text-slate-500">${t("commission.suggest.priority")}</label>
        <input type="number" class="banner-priority w-12 border border-slate-200 rounded px-1 py-0.5 text-xs"
          value="${priority}" min="0" max="999" />
        <button type="button" class="banner-promote
          px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
          ${t("commission.create_rule")}
        </button>
        <button type="button" class="banner-dismiss
          px-2 py-1 text-xs text-slate-500 hover:text-slate-800">\u2715</button>
      </div>
    </div>`;
}
async function createRule(repo, pct, recipient, kind, priority) {
  const pctDisplay = Math.round(pct * 100);
  const companyPct = 1 - pct;
  const ruleId = `auto-flat-${pctDisplay}-${autoSlug(recipient)}`;
  const rule = {
    rule_id: ruleId,
    name: `Flat ${pctDisplay}% to ${recipient}`,
    applies_to: [],
    when: ["Always"],
    split_strategy: { Flat: { sales_pct: pct, company_pct: companyPct } },
    priority,
    kind_hint: kind || null
  };
  await repo.put(KIND_COMMISSION_RULES, ruleId, rule);
  window.dispatchEvent(new CustomEvent("vdg:entity-changed", {
    detail: { kind: KIND_COMMISSION_RULES }
  }));
}
async function renderSuggestionsBanner(container, repo) {
  if (!container || !repo) return;
  container.innerHTML = "";
  let allEntries;
  try {
    allEntries = await repo.list(KIND_COMMISSION_ENTRY, null);
  } catch (err) {
    console.warn("[suggestions-banner] list failed:", err);
    return;
  }
  const groups = buildGroups(allEntries || []);
  for (const [gk, { pct, recipient, kind, count }] of groups) {
    if (count < PATTERN_THRESHOLD) continue;
    if (sessionStorage.getItem(SESSION_DISMISS_PREFIX + gk)) continue;
    const pctDisplay = Math.round(pct * 100);
    const pattern = `Flat ${pctDisplay}% to ${recipient}`;
    const tmp = document.createElement("div");
    tmp.innerHTML = bannerHtml(gk, pattern, count, DEFAULT_PROMOTE_PRIORITY);
    const banner = tmp.firstElementChild;
    container.appendChild(banner);
    banner.querySelector(".banner-dismiss")?.addEventListener("click", () => {
      sessionStorage.setItem(SESSION_DISMISS_PREFIX + gk, "1");
      banner.remove();
    });
    banner.querySelector(".banner-promote")?.addEventListener("click", async () => {
      const pri = parseInt(banner.querySelector(".banner-priority")?.value, 10);
      const safePri = isNaN(pri) ? DEFAULT_PROMOTE_PRIORITY : pri;
      try {
        await createRule(repo, pct, recipient, kind, safePri);
        banner.remove();
      } catch (err) {
        console.error("[suggestions-banner] createRule failed:", err);
      }
    });
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/commissions.js
var PAYOUT_KIND = "commission_payout";
var KIND_COMMISSION_RULES2 = "commission_rules";
var DEFAULT_PERIOD_MODE = "month";
var TOAST_AUTODISMISS_MS = 5e3;
var PREFS_META_KEY = "preferences";
var _shipments = [];
var _pnlLines = [];
var _payouts = [];
var _rules = /* @__PURE__ */ new Map();
var _prefs = {};
var _periodMode = DEFAULT_PERIOD_MODE;
var _periodDate = /* @__PURE__ */ new Date();
var _onEntity;
var _loadInFlight = false;
function getRepo() {
  return window.__vdg_repo;
}
function currentUser() {
  return window.__vdg_auth?.getCurrentUser?.()?.email || "manager";
}
function fmtNum2(n) {
  return Number(n ?? 0).toLocaleString("vi-VN");
}
function currentPeriodKey() {
  return buildPeriodKey(_periodMode, _periodDate);
}
function isSettled(salesId, periodKey) {
  return _payouts.some((p) => p.sales_rep === salesId && p.period === periodKey);
}
function renderTable(root, rows) {
  const table = root?.querySelector("#commission-table");
  if (!table) return;
  const key = currentPeriodKey();
  const rowHtml = rows.map((r) => {
    const settled = isSettled(r.salesId, key);
    const cls = settled ? "opacity-60" : "";
    const badge = settled ? `<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">${t("commission.status.Settled")}</span>` : `<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">${t("commission.status.Pending")}</span>`;
    const printBtn = settled ? `<button class="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200 btn-print-slip"
           data-sales="${r.salesId}" title="${t("commission.settle.print_slip")}">${t("commission.settle.print_slip")}</button>` : "";
    return `<tr class="${cls}">
      <td class="py-2 px-3 text-xs">${r.salesName}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum2(r.margin)}</td>
      <td class="py-2 px-3 text-xs text-right text-red-600">${fmtNum2(r.tndn)}</td>
      <td class="py-2 px-3 text-xs text-right text-amber-700">${fmtNum2(r.comDeductions)}</td>
      <td class="py-2 px-3 text-xs text-right font-medium">${fmtNum2(r.netAfterDeductions)}</td>
      <td class="py-2 px-3 text-xs text-center">${(r.salesSharePct || 0).toFixed(0)}%</td>
      <td class="py-2 px-3 text-xs text-right text-green-700 font-medium">${fmtNum2(r.commission)}</td>
      <td class="py-2 px-3 text-xs text-right text-slate-500">${fmtNum2(r.lbsShare)}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum2(r.advances)}</td>
      <td class="py-2 px-3 text-xs text-right font-semibold">${fmtNum2(r.netPayable)}</td>
      <td class="py-2 px-3">${badge}</td>
      <td class="py-2 px-3">${printBtn}</td>
    </tr>`;
  }).join("");
  const thead = [
    t("commission.settle.col.sales"),
    t("commission.settle.col.margin"),
    t("commission.settle.col.tndn"),
    t("commission.settle.col.com_deductions"),
    t("commission.settle.col.net"),
    t("commission.settle.col.sales_pct"),
    t("commission.settle.col.sales_share"),
    t("commission.settle.col.lbs_share"),
    t("commission.settle.col.advances"),
    t("commission.settle.col.net_payable"),
    t("commission.settle.col.status"),
    ""
  ];
  table.innerHTML = `
    <table class="w-full text-left border-collapse">
      <thead class="bg-slate-50">
        <tr>${thead.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600 whitespace-nowrap">${h}</th>`).join("")}</tr>
      </thead>
      <tbody>${rowHtml || `<tr><td colspan="12" class="p-4 text-slate-400 text-center text-xs">${t("commission.settle.no_data")}</td></tr>`}</tbody>
    </table>`;
  const hasUnsettled = rows.some((r) => !isSettled(r.salesId, key));
  root.querySelector("#btn-settle").disabled = !hasUnsettled;
  root.querySelectorAll(".btn-print-slip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const salesId = btn.dataset.sales;
      const payout = _payouts.find((p) => p.sales_rep === salesId && p.period === currentPeriodKey());
      if (!payout) return;
      const slip = document.createElement("vdg-commission-slip");
      slip.data = payout;
      document.body.appendChild(slip);
    });
  });
  return rows;
}
async function loadData() {
  const repo = getRepo();
  if (!repo) return true;
  _loadInFlight = true;
  const res = await safeMasterLoad(async () => {
    const [shipments, pnlLines, payouts] = await Promise.all([
      listShipments(repo, null),
      repo.list(KIND_PNL_LINE, null),
      repo.list(PAYOUT_KIND, null)
    ]);
    const composed = await compose(repo);
    let prefs = {};
    try {
      const prefList = await repo.list("meta-pref", null);
      prefs = prefList?.find((p) => p.id === PREFS_META_KEY) || {};
    } catch {
    }
    return { shipments, pnlLines, payouts, rules: composed.rules, prefs };
  }, "commissions:load");
  _loadInFlight = false;
  if (!res.ok) return false;
  ({ shipments: _shipments, pnlLines: _pnlLines, payouts: _payouts, rules: _rules, prefs: _prefs } = res.value);
  return true;
}
async function render(root) {
  if (_onEntity) window.removeEventListener("vdg:entity-changed", _onEntity);
  const urlPeriod = new URLSearchParams(location.search).get("period");
  if (urlPeriod) {
    if (urlPeriod.includes("Q")) _periodMode = "quarter";
    else _periodMode = "month";
  }
  const loaded = await loadData();
  if (!loaded) {
    root.innerHTML = `
      <div class="p-6 max-w-[1600px] mx-auto">
        <div class="text-xs text-red-500 mb-2">${t("masters.load_error")}</div>
        <button id="commission-retry" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">${t("retry")}</button>
      </div>`;
    root.querySelector("#commission-retry")?.addEventListener("click", () => render(root));
    return;
  }
  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[1600px] mx-auto">
      <div id="commission-suggest-banner"></div>
      <div class="flex items-center gap-4 flex-wrap">
        <label class="text-xs font-medium text-slate-600">${t("commission.settle.period_label")}</label>
        <select id="period-select" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="month" ${_periodMode === "month" ? "selected" : ""}>${t("commission.settle.period.month")}</option>
          <option value="quarter" ${_periodMode === "quarter" ? "selected" : ""}>${t("commission.settle.period.quarter")}</option>
        </select>
        <span id="period-label" class="text-xs text-slate-500">${currentPeriodKey()}</span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div class="text-sm font-semibold text-slate-900">${t("commission.settle.preview")}</div>
          <button id="btn-settle"
            class="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
            disabled>${t("commission.settle.action")}</button>
        </div>
        <div id="commission-table" class="overflow-x-auto"></div>
      </div>
    </div>`;
  await renderSuggestionsBanner(root.querySelector("#commission-suggest-banner"), getRepo());
  let currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
  renderTable(root, currentRows);
  root.querySelector("#period-select").addEventListener("change", (e) => {
    _periodMode = e.target.value;
    root.querySelector("#period-label").textContent = currentPeriodKey();
    currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderTable(root, currentRows);
  });
  root.querySelector("#btn-settle").addEventListener("click", async () => {
    const key = currentPeriodKey();
    const unsettled = currentRows.filter((r) => !isSettled(r.salesId, key));
    if (!unsettled.length) return;
    const ok = await showConfirm({
      title: t("commission.settle.confirm.title", { key }),
      body: t("commission.settle.confirm.body", { n: unsettled.length }),
      confirmLabel: t("commission.settle.confirm.ok"),
      cancelLabel: t("common.action.cancel"),
      destructive: true
    });
    if (!ok) return;
    const repo = getRepo();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const manager = currentUser();
    const entities = unsettled.map((r) => ({
      id: `CP-${r.salesId}-${key}`,
      kind: PAYOUT_KIND,
      sales_rep: r.salesId,
      period: key,
      margin: r.margin,
      tndn: r.tndn,
      com_deductions: r.comDeductions,
      net_after_deductions: r.netAfterDeductions,
      sales_share_pct: r.salesSharePct,
      commission: r.commission,
      lbs_share: r.lbsShare,
      advances: r.advances,
      net_payable: r.netPayable,
      settled_at: now,
      settled_by: manager
    }));
    if (repo) {
      await bulkPut(repo, PAYOUT_KIND, entities);
      await lockPeriod(repo, key, manager);
      _prefs = { ..._prefs, [PREF_LOCKED_PERIODS_KEY]: await readLockedPeriods(repo) };
      _payouts = await repo.list(PAYOUT_KIND, null);
    }
    window.dispatchEvent(new CustomEvent("vdg:toast", {
      detail: { type: "success", message: t("commission.settle.toast_success", { key, n: entities.length }), duration: TOAST_AUTODISMISS_MS }
    }));
    renderTable(root, currentRows);
  });
  _onEntity = async (e) => {
    if (!root.isConnected) {
      window.removeEventListener("vdg:entity-changed", _onEntity);
      return;
    }
    if (_loadInFlight) return;
    const kind = e.detail?.kind;
    if (kind !== KIND_SHIPMENT && kind !== PAYOUT_KIND && kind !== KIND_COMMISSION_RULES2) return;
    const ok = await loadData();
    if (!ok) return;
    currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderTable(root, currentRows);
  };
  window.addEventListener("vdg:entity-changed", _onEntity);
}
export {
  render
};
