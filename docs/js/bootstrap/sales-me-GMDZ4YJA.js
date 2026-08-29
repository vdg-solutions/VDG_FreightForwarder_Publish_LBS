import {
  UNKNOWN_STATE,
  resolveShipmentState
} from "./chunk-ZCTCC7VS.js";
import "./chunk-ETXXTRJC.js";
import {
  computeDueSoonRows
} from "./chunk-REGXU2BV.js";
import {
  statusBadgeLabel
} from "./chunk-77ST6KHY.js";
import {
  ROLE_MANAGER
} from "./chunk-CTHPHM7D.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  ensureShipmentStateAliases
} from "./chunk-FJ72A4AS.js";
import {
  listShipments
} from "./chunk-U4BJYZQA.js";
import {
  safeAwait
} from "./chunk-JAZY43GR.js";
import {
  mountAgGrid
} from "./chunk-CVZ5L5LX.js";
import {
  wireGridFilterEmptyState
} from "./chunk-EFPHCQFA.js";
import {
  currentRoles,
  currentSalesRepId
} from "./chunk-NQTRREKJ.js";
import {
  currentLocale,
  t
} from "./chunk-NJFDQATX.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-me-overdue.js
var STAGE_THRESHOLDS_DAYS = { reminder_1: 7, reminder_2: 14, escalate: 30, legal: 60, blacklist: 95 };
var STAGE_ORDER = ["reminder_1", "reminder_2", "escalate", "legal", "blacklist"];
function fmtVnd(n) {
  if (!n && n !== 0) return "\u2014";
  return Number(n).toLocaleString("vi-VN");
}
function daysOverdue(dueDate, now) {
  if (!dueDate) return 0;
  return Math.floor((now - new Date(dueDate).getTime()) / 864e5);
}
function classifyStage(days) {
  let stage = null;
  for (const s of STAGE_ORDER) if (days >= STAGE_THRESHOLDS_DAYS[s]) stage = s;
  return stage;
}
async function overdueFollowupsHtml(salesId) {
  const repo = window.__vdg_repo;
  if (!repo) return "";
  const [billing, customers] = await Promise.all([
    repo.list("billing", null).catch(() => []),
    repo.list("customers", null).catch(() => [])
  ]).catch(() => [[], []]);
  const custMap = new Map((customers || []).map((c) => [c.id, c]));
  const now = Date.now();
  const byCustomer = /* @__PURE__ */ new Map();
  for (const b of billing) {
    if (b.status === "Paid" || b._deleted) continue;
    const rep = (b.sales_rep || "").toLowerCase();
    if (rep && rep !== salesId.toLowerCase()) continue;
    const due = b.due_date || b.DueDate;
    if (daysOverdue(due, now) <= 0) continue;
    const cid = b.customer_id || b.customer || "";
    if (!byCustomer.has(cid)) byCustomer.set(cid, []);
    byCustomer.get(cid).push(b);
  }
  const rows = [];
  for (const [cid, bs] of byCustomer) {
    const customer = custMap.get(cid) || { id: cid, name: cid };
    const maxDays = bs.reduce((max, b) => {
      const d = daysOverdue(b.due_date || b.DueDate, now);
      return d > max ? d : max;
    }, 0);
    const stage = classifyStage(maxDays);
    if (!stage) continue;
    const total = bs.reduce((s, b) => s + Number(b.amount_vnd ?? b.AmountVnd ?? 0), 0);
    rows.push({ cid, name: customer.name || cid, email: customer.email || "", stage, maxDays, total });
  }
  if (!rows.length) return "";
  const rowsHtml = rows.map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2">${r.name}</td>
      <td class="px-3 py-2 font-mono text-amber-700">${t("sales_overdue.stage." + r.stage)}</td>
      <td class="px-3 py-2">${r.maxDays}d</td>
      <td class="px-3 py-2">${fmtVnd(r.total)} VND</td>
      <td class="px-3 py-2">
        <button class="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] hover:bg-blue-100"
                data-send-reminder="${r.cid}"
                data-email="${r.email}">
          ${t("sales_overdue.send")}
        </button>
      </td>
    </tr>`).join("");
  return `
    <div class="bg-white rounded-xl border border-amber-200 p-5 mt-4">
      <div class="text-sm font-semibold text-amber-700 mb-3">
        ${t("sales_overdue.title")}
        <span class="ml-2 text-xs font-normal text-amber-500">${t("sales_overdue.count", { n: rows.length })}</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full min-w-[520px]">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t("sales_overdue.col.customer")}</th>
              <th class="px-3 py-2 text-left">${t("sales_overdue.col.stage")}</th>
              <th class="px-3 py-2 text-left">${t("sales_overdue.col.days")}</th>
              <th class="px-3 py-2 text-left">${t("sales_overdue.col.outstanding")}</th>
              <th class="px-3 py-2 w-28"></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}
function sendSalesReminder(customerId, mailto) {
  window.open(`mailto:${mailto}?subject=${encodeURIComponent(t("sales_overdue.mail.subject"))}`, "_blank");
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-me-due-soon.js
function fmtVnd2(n) {
  if (!n && n !== 0) return "\u2014";
  return Number(n).toLocaleString("vi-VN");
}
async function dueSoonHtml(salesId) {
  const rows = await computeDueSoonRows(salesId);
  if (!rows.length) return "";
  const rowsHtml = rows.map((r) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2">${r.customerId}</td>
      <td class="px-3 py-2">${r.dueDate}</td>
      <td class="px-3 py-2">${r.daysUntilDue}d</td>
      <td class="px-3 py-2">${fmtVnd2(r.amountVnd)} VND</td>
    </tr>`).join("");
  return `
    <div class="bg-white rounded-xl border border-blue-200 p-5 mt-4">
      <div class="text-sm font-semibold text-blue-700 mb-3">
        ${t("due_soon.title")}
        <span class="ml-2 text-xs font-normal text-blue-500">${t("due_soon.count", { n: rows.length })}</span>
      </div>
      <div class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full min-w-[420px]">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t("due_soon.col.customer")}</th>
              <th class="px-3 py-2 text-left">${t("due_soon.col.due_date")}</th>
              <th class="px-3 py-2 text-left">${t("due_soon.col.days")}</th>
              <th class="px-3 py-2 text-left">${t("due_soon.col.amount")}</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-me-data.js
function mtdFilter(s) {
  const now = /* @__PURE__ */ new Date();
  const year = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const pfx = `${year}-${mo}`;
  const d = s.etd || s.prep_date || s.date || "";
  return d.startsWith(pfx);
}
var EMPTY_DATA = { all: [], mtd: [], pending: [], stats: { shipments: 0, revenue: 0, margin: 0, salesCommission: 0, advances: 0 } };
async function loadMyData(salesId) {
  const repo = window.__vdg_repo;
  if (!repo) return EMPTY_DATA;
  const [allShipments, allLines, allCommEntries, aliasRows] = await Promise.all([
    listShipments(repo, (s) => (s.sales_rep || "").toLowerCase() === salesId.toLowerCase()),
    repo.list("pnl_line").catch(() => []),
    repo.list("commission_entry").catch(() => []),
    ensureShipmentStateAliases(repo)
    // DEFECT-1: seed-on-first-read (sales rep never opens master view)
  ]);
  for (const s of allShipments) {
    s.state = resolveShipmentState(s.state || s.status, aliasRows) || UNKNOWN_STATE;
  }
  const mtd = allShipments.filter(mtdFilter);
  const mtdRefs = new Set(mtd.map((s) => s.shipment_ref || s.ref));
  const salesCommission = allCommEntries.filter((e) => e.kind === "SalesShare" && mtdRefs.has(e.shipment_ref)).reduce((s, e) => s + Number(e.net_amount?.amount ?? e.net_amount ?? 0), 0);
  const linesByRef = {};
  for (const l of allLines) {
    const r = l.shipment_ref;
    if (!linesByRef[r]) linesByRef[r] = [];
    linesByRef[r].push(l);
  }
  const pending = allShipments.filter((s) => {
    const ref = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    return !lines.some((l) => Number(l.sell_amt || l.selling_vnd_collect || 0) > 0);
  });
  let revenue = 0, margin = 0;
  for (const s of mtd) {
    const ref = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    for (const l of lines) {
      revenue += Number(l.sell_amt || l.selling_vnd_collect || 0);
      margin += Number(l.sell_amt || l.selling_vnd_collect || 0) - Number(l.buy_amt || l.buying_vnd_pay || 0);
    }
  }
  const advances = 0;
  for (const s of allShipments) {
    const ref = s.shipment_ref || s.ref;
    const lines = linesByRef[ref] || [];
    s.margin = lines.reduce((acc, l) => acc + Number(l.sell_amt || l.selling_vnd_collect || 0) - Number(l.buy_amt || l.buying_vnd_pay || 0), 0);
  }
  return {
    all: allShipments,
    mtd,
    pending,
    stats: { shipments: mtd.length, revenue, margin, salesCommission, advances }
  };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-me.js
var LOAD_TIMEOUT_MS = 12e3;
var CLOSED_LIKE_STATES = ["Closed", "Delivered"];
var MONTH_YEAR_FMT = { month: "long", year: "numeric" };
function fmtVnd3(n) {
  if (!n && n !== 0) return "\u2014";
  return Number(n).toLocaleString("vi-VN");
}
function roleBadgeHtml(salesId) {
  const isM = currentRoles().includes(ROLE_MANAGER);
  const cls = isM ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-blue-100 text-blue-700 border-blue-200";
  const label = isM ? t("sales_me.role.manager") : salesId;
  return `<span class="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded border ${cls}">${label}</span>`;
}
function kpiCardsHtml(stats) {
  const cards = [
    { label: t("sales_me.kpi.shipments"), value: String(stats.shipments), tone: "blue", icon: "ship", delta: t("sales_me.kpi.delta.month") },
    { label: t("sales_me.kpi.revenue"), value: fmtVnd3(stats.revenue), tone: "green", icon: "dollar", delta: t("sales_me.kpi.delta.vnd") },
    { label: t("sales_me.kpi.margin"), value: fmtVnd3(stats.margin), tone: "green", icon: "dollar", delta: t("sales_me.kpi.delta.vnd") },
    { label: t("sales_me.kpi.ttcn"), value: fmtVnd3(stats.customerRebate), tone: "amber", icon: "dollar", delta: t("sales_me.kpi.delta.vnd") }
  ];
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    ${cards.map((c) => `
      <kpi-card label="${c.label}" value="${c.value}" delta="${c.delta}" tone="${c.tone}" icon="${c.icon}"></kpi-card>
    `).join("")}
  </div>`;
}
function publishBadgeHtml(s) {
  if (s.publish_state === "draft") {
    return `<span class="ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">${t("sales_new.badge.draft")}</span>`;
  }
  return "";
}
function shipmentRowHtml(s) {
  const margin = Number(s.margin || 0);
  const posCls = margin >= 0 ? "text-emerald-700" : "text-red-600";
  const stateCls = "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700";
  const ref = s.shipment_ref || s.ref;
  const editHref = `#/sales/edit/${encodeURIComponent(ref || "")}`;
  const budgetHref = `#/shipment/${encodeURIComponent(ref || "")}/budget`;
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs">
      <td class="px-3 py-2 font-mono">
        <a href="${editHref}" class="text-blue-600 hover:underline">${ref || "\u2014"}</a>${publishBadgeHtml(s)}
      </td>
      <td class="px-3 py-2">${s.customer || "\u2014"}</td>
      <td class="px-3 py-2 font-mono">${s.pol || "\u2014"} \u2192 ${s.pod || "\u2014"}</td>
      <td class="px-3 py-2">${s.etd || "\u2014"}</td>
      <td class="px-3 py-2"><span class="${stateCls}">${statusBadgeLabel("shipment", s.state) || "\u2014"}</span></td>
      <td class="px-3 py-2 text-right font-semibold ${posCls}">${fmtVnd3(margin)}</td>
      <td class="px-3 py-2">
        <a href="${budgetHref}" class="text-xs text-slate-500 hover:text-blue-600" title="${t("sales_me.grid.print_budget")}">\u2399</a>
      </td>
    </tr>`;
}
function shipmentTableHtml(shipments, emptyMsg) {
  if (!shipments.length) {
    return `<div class="text-xs text-slate-400 py-4 text-center">${emptyMsg}</div>`;
  }
  return `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full min-w-[640px]">
        <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-3 py-2 text-left">${t("sales_me.grid.ref")}</th>
            <th class="px-3 py-2 text-left">${t("sales_me.grid.customer")}</th>
            <th class="px-3 py-2 text-left">${t("sales_me.grid.route")}</th>
            <th class="px-3 py-2 text-left">${t("sales_me.grid.etd")}</th>
            <th class="px-3 py-2 text-left">${t("sales_me.grid.state")}</th>
            <th class="px-3 py-2 text-right">${t("sales_me.grid.margin_vnd")}</th>
            <th class="px-3 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>${shipments.map(shipmentRowHtml).join("")}</tbody>
      </table>
    </div>`;
}
function commissionHtml(stats) {
  const gross = stats.salesCommission;
  const net = gross - stats.advances;
  const netCls = net >= 0 ? "text-emerald-700" : "text-red-600";
  const now = /* @__PURE__ */ new Date();
  const monthStr = `(${new Intl.DateTimeFormat(currentLocale(), MONTH_YEAR_FMT).format(now)})`;
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-sm font-semibold text-slate-900 mb-3">${t("sales_me.commission.title").replace("(MTD)", monthStr)}</div>
      <dl class="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
        <div>
          <dt class="text-slate-400">${t("sales_me.commission.margin_total")}</dt>
          <dd class="font-medium text-slate-900">${fmtVnd3(stats.margin)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t("sales_me.commission.sales_share")}</dt>
          <dd class="font-semibold text-emerald-700">${fmtVnd3(gross)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t("sales_me.commission.advances")}</dt>
          <dd class="font-medium text-slate-900">${fmtVnd3(stats.advances)} VND</dd>
        </div>
        <div>
          <dt class="text-slate-400">${t("sales_me.commission.net_payable")}</dt>
          <dd class="font-semibold ${netCls}">${fmtVnd3(net)} VND</dd>
        </div>
      </dl>
      <div class="mt-3 text-[10px] text-slate-400">${t("sales_me.commission.rate_note")}</div>
    </div>`;
}
var _onLocale = null;
async function render(root) {
  if (_onLocale) window.removeEventListener("vdg:locale-changed", _onLocale);
  _onLocale = () => {
    const liveRoot = document.getElementById("view-root");
    if (liveRoot) render(liveRoot);
  };
  window.addEventListener("vdg:locale-changed", _onLocale);
  const user = window.__vdg_auth?.getCurrentUser?.();
  const salesId = currentSalesRepId();
  if (!user || !salesId) {
    root.innerHTML = `<div data-auth-stale class="p-6 text-red-600 text-sm">${t("sales_me.not_authenticated")}</div>`;
    return;
  }
  root.innerHTML = `
    <div class="p-6 max-w-[1600px] mx-auto">
      <div class="text-lg font-semibold text-slate-900">
        ${t("sales_me.title")} \u2014 ${user.name || salesId}${roleBadgeHtml(salesId)}
      </div>
      <div id="me-loading" class="text-xs text-slate-500 mt-2">${t("loading")}</div>
      <div id="me-body" class="hidden"></div>
    </div>`;
  await populateView(root, salesId, user);
}
async function populateView(root, salesId, user) {
  const loadingEl = root.querySelector("#me-loading");
  const bodyEl = root.querySelector("#me-body");
  const { ok, value: data, error } = await safeAwait(
    loadMyData(salesId),
    LOAD_TIMEOUT_MS,
    () => {
    },
    "sales-me:loadMyData"
  );
  if (!ok) {
    console.warn("[sales-me] load failed:", error?.message);
    if (loadingEl) {
      const msg = t("sales_me.load_failed").replace("{s}", String(LOAD_TIMEOUT_MS / 1e3));
      loadingEl.innerHTML = `<span class="text-amber-700">${msg}</span>
        <button id="me-retry" class="ml-2 underline text-blue-600">${t("sales_me.retry")}</button>`;
      loadingEl.querySelector("#me-retry")?.addEventListener("click", () => populateView(root, salesId, user));
    }
    return;
  }
  const { all, pending, stats } = data;
  const activeShipments = all.filter((s) => !CLOSED_LIKE_STATES.includes(s.state));
  const emptyActive = `${t("sales_me.empty_active")} <a href="#/shipments/new" class="text-blue-500 hover:underline">${t("sales_me.quick_add")}</a>`;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="mt-1 mb-4 flex items-center justify-between">
        <div class="text-xs text-slate-500">
          ${t("sales_me.signed_in_as")} <span class="font-semibold text-slate-800">${user.email}</span>
        </div>
        <a href="#/shipments/new?sales=${encodeURIComponent(salesId)}"
          class="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg font-semibold hover:bg-blue-700 transition">
          ${t("sales_me.quick_add")}
        </a>
      </div>

      ${kpiCardsHtml(stats)}

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-slate-900">
            ${t("sales_me.active_shipments")}
            <span class="ml-2 text-xs font-normal text-slate-400">${t("sales_me.total_suffix").replace("{n}", activeShipments.length)}</span>
          </div>
          <div class="relative">
            <svg class="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input id="active-grid-search" placeholder="${t("sales_me.toolbar.search_placeholder")}" class="text-xs pl-8 pr-3 py-1 border border-slate-200 rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
          </div>
        </div>
        <div id="active-shipments-grid" class="ag-theme-quartz rounded-lg overflow-hidden border border-slate-200" style="height:320px;"></div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <div class="text-sm font-semibold text-slate-900 mb-3">
          ${t("sales_me.pending_revenue")}
          ${pending.length === 0 ? `<span class="ml-2 text-xs font-normal text-emerald-600">${t("sales_me.pending_zero")}</span>` : `<span class="ml-2 text-xs font-normal text-amber-600">${t("sales_me.pending_suffix").replace("{n}", pending.length)}</span>`}
        </div>
        ${shipmentTableHtml(pending, t("sales_me.empty_pending"))}
        ${pending.length ? `<div class="mt-2 text-[11px] text-amber-700">${t("sales_me.pending_hint")}</div>` : ""}
      </div>

      ${commissionHtml(stats)}

      ${await dueSoonHtml(salesId)}
      ${await overdueFollowupsHtml(salesId)}`;
    bodyEl.classList.remove("hidden");
    const gridDiv = root.querySelector("#active-shipments-grid");
    if (window.agGrid && gridDiv) {
      const activeGridApi = mountAgGrid(gridDiv, {
        columnDefs: [
          {
            headerName: t("sales_me.grid.ref"),
            field: "ref",
            width: 140,
            cellClass: "font-mono text-xs",
            cellRenderer: (p) => {
              const s = p.data;
              const ref = s.shipment_ref || s.ref;
              const wrap = document.createElement("div");
              wrap.className = "flex items-center gap-1 h-full";
              wrap.innerHTML = `<a href="#/sales/edit/${encodeURIComponent(ref || "")}" class="text-blue-600 hover:underline font-mono">${ref || "\u2014"}</a>${publishBadgeHtml(s)}`;
              return wrap;
            }
          },
          { headerName: t("sales_me.grid.customer"), field: "customer", flex: 2, minWidth: 140, valueGetter: (p) => p.data.customer || "\u2014" },
          { headerName: t("sales_me.grid.route"), field: "route", width: 140, cellClass: "font-mono text-xs", valueGetter: (p) => `${p.data.pol || "\u2014"} \u2192 ${p.data.pod || "\u2014"}` },
          { headerName: t("sales_me.grid.etd"), field: "etd", width: 110, cellClass: "font-mono text-xs", valueGetter: (p) => p.data.etd || "\u2014" },
          {
            headerName: t("sales_me.grid.state"),
            field: "state",
            width: 130,
            cellRenderer: (p) => {
              const span = document.createElement("span");
              span.className = "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700";
              span.textContent = statusBadgeLabel("shipment", p.data.state) || "\u2014";
              return span;
            }
          },
          {
            headerName: t("sales_me.grid.margin_vnd"),
            field: "margin",
            width: 130,
            cellClass: (p) => `font-mono text-xs font-semibold text-right ${(p.value || 0) >= 0 ? "text-emerald-700" : "text-red-600"}`,
            valueFormatter: (p) => fmtVnd3(p.value || 0)
          },
          {
            headerName: "",
            field: "budget",
            width: 50,
            sortable: false,
            filter: false,
            cellRenderer: (p) => {
              const ref = p.data.shipment_ref || p.data.ref;
              const a = document.createElement("a");
              a.href = `#/shipment/${encodeURIComponent(ref || "")}/budget`;
              a.className = "text-xs text-slate-500 hover:text-blue-600";
              a.title = t("sales_me.grid.print_budget");
              a.textContent = "\u2399";
              return a;
            }
          }
        ],
        rowData: activeShipments,
        defaultColDef: { sortable: true, resizable: true, filter: true },
        rowSelection: "single",
        rowHeight: 38,
        headerHeight: 36
      });
      wireGridFilterEmptyState({
        root,
        getApi: () => activeGridApi,
        searchSelector: "#active-grid-search",
        getTotal: () => activeShipments.length,
        entity: t("sales_me.empty.entity"),
        onCreate: () => navigate(`/shipments/new?sales=${encodeURIComponent(salesId)}`),
        filteredCreateLabel: t("sales_me.empty.create_action"),
        firstRunCreateLabel: t("sales_me.empty.first_run_action")
      });
    }
  }
  if (loadingEl) loadingEl.textContent = "";
  root.querySelector("#me-body")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-send-reminder]");
    if (!btn) return;
    const cid = btn.dataset.sendReminder;
    const mailto = btn.dataset.email || "";
    sendSalesReminder(cid, mailto);
  });
}
export {
  render
};
