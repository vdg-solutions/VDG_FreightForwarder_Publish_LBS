import {
  findMatch
} from "./chunk-ENSWK7L6.js";
import {
  patchUser
} from "./chunk-XVWG4BTC.js";
import {
  KIND_PNL_LINE
} from "./chunk-JAYYO7NZ.js";
import {
  listWhere
} from "./chunk-EPS4ANRF.js";
import {
  suppressDuplicatePair
} from "./chunk-T5ZHX2YX.js";
import {
  KIND_SHIPMENT
} from "./chunk-4VNIIBNV.js";
import {
  mountAgGrid
} from "./chunk-4WAHI6XV.js";
import {
  listMasters,
  saveMaster
} from "./chunk-XLNZASZM.js";
import "./chunk-7DW526V3.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/components/dup-wizard.js
import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm";
var SCORE_PRECISION = 2;
var VdgDupWizard = class extends LitElement {
  // No `repo` property any more: the suppression goes through a named use-case, so the component
  // needs nothing but the pairs. masters.js still assigns `wizard.repo` — a harmless no-op on an
  // undeclared property, to be dropped when that view is converted.
  static properties = {
    clusters: { type: Array },
    _clusters: { type: Array, state: true }
  };
  createRenderRoot() {
    return this;
  }
  constructor() {
    super();
    this.clusters = [];
    this._clusters = [];
  }
  updated(changed) {
    if (changed.has("clusters")) {
      this._clusters = [...this.clusters || []];
    }
  }
  // "These two are not the same thing" is a judgement about the data — where the suppression
  // list lives and what a suppressed pair looks like are wasm's, not this component's.
  async _suppress(pair) {
    try {
      await suppressDuplicatePair(pair.a.id, pair.b.id);
    } catch (err) {
      console.warn("[dup-wizard] suppress write failed:", err.message);
    }
    this._clusters = this._clusters.filter((c) => c !== pair);
  }
  _close() {
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, composed: true }));
    this.remove();
  }
  render() {
    const clusters = this._clusters;
    return html`
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" @click="${(e) => {
      if (e.target === e.currentTarget) this._close();
    }}">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div class="font-semibold text-slate-900">${t("dup_wizard.title")}</div>
            <button @click="${this._close}"
                    class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            ${clusters.length === 0 ? html`
              <div class="text-center py-10 text-slate-400 text-sm">${t("dup_wizard.empty")}</div>
            ` : clusters.map((pair) => html`
              <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span class="font-medium text-slate-700">${t("common.score_label")}</span>
                  ${Number(pair.score).toFixed(SCORE_PRECISION)}
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-50 rounded-lg p-3 text-sm">
                    <div class="font-medium text-slate-900 truncate">${pair.a.name}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${pair.a.id}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3 text-sm">
                    <div class="font-medium text-slate-900 truncate">${pair.b.name}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${pair.b.id}</div>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button @click="${() => this._suppress(pair)}"
                          class="flex-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
                    ${t("dup_wizard.action.not_duplicate")}
                  </button>
                </div>
              </div>
            `)}
          </div>

          <div class="px-6 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
            ${t("dup_wizard.remaining", { n: clusters.length })}
          </div>
        </div>
      </div>`;
  }
};
customElements.define("vdg-dup-wizard", VdgDupWizard);

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters.js
var MASTERS_RE = /^\/manager\/masters\/([^/]+)$/;
var KIND_CUSTOMER = "customers";
var KIND_CARRIER = "carriers";
var KIND_USER = "user";
var KIND_MAP = { customers: KIND_CUSTOMER, carriers: KIND_CARRIER, users: KIND_USER };
var USER_KIND = "user";
var STATUS_ACTIVE = "Active";
var STATUS_INACTIVE = "Inactive";
var TOAST_AUTODISMISS_MS = 5e3;
var OUTLIER_MARGIN_LOW_PCT = -20;
var OUTLIER_MARGIN_HIGH_PCT = 200;
var STALE_DATA_DAYS = 90;
var STALE_MS = STALE_DATA_DAYS * 864e5;
var _onEntity;
function getRepo() {
  return window.__vdg_repo;
}
function currentUser() {
  return window.__vdg_auth?.getCurrentUser?.()?.email || "manager";
}
function toast(message, type = "success") {
  window.dispatchEvent(new CustomEvent("vdg:toast", {
    detail: { type, message, duration: TOAST_AUTODISMISS_MS }
  }));
}
function mountUserGrid(container, users) {
  container.innerHTML = '<div class="ag-theme-quartz" style="height:400px"></div>';
  if (!window.agGrid) return;
  const cols = [
    { field: "name", headerName: t("masters_hub.col.name"), flex: 1 },
    { field: "email", headerName: t("masters_hub.col.email"), flex: 1 },
    { field: "role", headerName: t("masters_hub.col.role"), width: 90 },
    { field: "id", headerName: t("masters_hub.col.sales_id"), width: 110 },
    {
      field: "status",
      headerName: t("masters_hub.col.status"),
      width: 100,
      cellRenderer: (p) => {
        const cls = p.value === STATUS_ACTIVE ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500";
        const span = document.createElement("span");
        span.className = `px-2 py-0.5 rounded text-xs font-medium ${cls}`;
        span.textContent = p.value || "\u2014";
        return span;
      }
    },
    { field: "last_login", headerName: t("masters_hub.col.last_login"), width: 110 },
    { headerName: t("common.col.actions"), width: 110, cellRenderer: (p) => {
      const div = document.createElement("div");
      div.className = "flex gap-1";
      div.innerHTML = `
          <button class="btn-deactivate px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
            data-id="${p.data.id}" ${p.data.status === STATUS_INACTIVE ? `disabled title="${t("masters_hub.already_inactive")}"` : ""}>${t("masters_hub.action.deactivate")}</button>`;
      return div;
    } }
  ];
  const grid = mountAgGrid(container.querySelector(".ag-theme-quartz"), {
    columnDefs: cols,
    rowData: users,
    defaultColDef: { sortable: true, resizable: true }
  });
  return grid;
}
async function renderUsers(root) {
  const repo = getRepo();
  const users = repo ? await listMasters(USER_KIND) : [];
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div class="flex items-center justify-between">
        <div class="text-sm font-semibold text-slate-900">${t("masters_hub.section.user_master")}</div>
      </div>
      <div id="user-grid"></div>
      <div id="dq-section"></div>
    </div>`;
  mountUserGrid(root.querySelector("#user-grid"), users);
  renderDataQuality(root.querySelector("#dq-section"), users, [], []);
  root.addEventListener("click", async (e) => {
    const deactivateBtn = e.target.closest(".btn-deactivate");
    if (!deactivateBtn || deactivateBtn.disabled) return;
    const id = deactivateBtn.dataset.id;
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const ok = await showConfirm({
      title: t("masters_hub.confirm.deactivate", { name: user.name }),
      body: t("masters_hub.deactivate_warning"),
      confirmLabel: t("masters_hub.action.deactivate"),
      cancelLabel: t("common.action.cancel"),
      destructive: true
    });
    if (!ok) return;
    try {
      await patchUser(user.email, { active: false });
    } catch (err) {
      toast(`Could not revoke access: ${err.message}`, "error");
      return;
    }
    const updated = { ...user, status: STATUS_INACTIVE, deactivated_at: (/* @__PURE__ */ new Date()).toISOString(), deactivated_by: currentUser() };
    if (repo) await saveMaster(USER_KIND, updated);
    toast(`${user.name} deactivated.`);
    await renderUsers(root);
  });
}
function findDuplicateClusters(entities) {
  const clusters = [];
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const match = findMatch(entities[i].name, [entities[j]]);
      if (match.status === "match" || match.status === "ambiguous") {
        clusters.push({ a: entities[i].name, b: entities[j].name, score: match.similarity });
      }
    }
  }
  return clusters;
}
function renderDataQuality(container, customers, shipments, pnlLines) {
  const now = Date.now();
  const allClusters = findDuplicateClusters(customers);
  const dupCount = allClusters.length;
  const missingEtd = shipments.filter((s) => !s.etd && !s.ETD);
  const outliers = pnlLines.filter((l) => {
    const sell = Number(l.selling_vnd_collect ?? l.SellingVNDCollect ?? 0);
    const buy = Number(l.buying_vnd_pay ?? l.BuyingVNDPay ?? 0);
    if (sell <= 0) return false;
    const pct = (sell - buy) / sell * 100;
    return pct < OUTLIER_MARGIN_LOW_PCT || pct > OUTLIER_MARGIN_HIGH_PCT;
  });
  const stale = customers.filter((c) => {
    const upd = c.updated_at || c.created_at;
    return upd && now - new Date(upd).getTime() > STALE_MS;
  });
  const chip = (count, label) => count === 0 ? `<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">OK</span>` : `<span class="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">${count} ${label}</span>`;
  container.innerHTML = `
    <div class="mt-5 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div class="text-sm font-semibold text-slate-900">${t("masters_hub.dq.title")}</div>
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          ${chip(dupCount, t("masters_hub.dq.dup_clusters"))}
          <span class="text-xs text-slate-600">${t("masters_hub.dq.dup_suggestions")}</span>
          ${dupCount > 0 ? `<button id="dq-fix-dup" class="text-xs text-blue-600 underline">${t("masters_hub.dq.fix")}</button>` : ""}
        </div>
        <div class="flex items-center gap-3">
          ${chip(missingEtd.length, t("masters_hub.dq.unit_shipment"))}
          <span class="text-xs text-slate-600">${t("masters_hub.dq.missing_etd")}</span>
        </div>
        <div class="flex items-center gap-3">
          ${chip(outliers.length, t("masters_hub.dq.unit_line"))}
          <span class="text-xs text-slate-600">${t("masters_hub.dq.outlier_margins", { low: OUTLIER_MARGIN_LOW_PCT, high: OUTLIER_MARGIN_HIGH_PCT })}</span>
        </div>
        <div class="flex items-center gap-3">
          ${chip(stale.length, t("masters_hub.dq.unit_entity"))}
          <span class="text-xs text-slate-600">${t("masters_hub.dq.stale_data", { days: STALE_DATA_DAYS })}</span>
        </div>
      </div>
    </div>`;
  container.querySelector("#dq-fix-dup")?.addEventListener("click", () => {
    const wizard = document.createElement("vdg-dup-wizard");
    wizard.clusters = allClusters.map((c) => ({ a: c.a, b: c.b, score: c.score ?? 0 }));
    wizard.repo = getRepo();
    document.body.appendChild(wizard);
  });
}
async function renderCustomersMaster(root) {
  const repo = getRepo();
  const [customers, shipments, pnlLines] = repo ? await Promise.all([listMasters(KIND_CUSTOMER), listWhere(repo, KIND_SHIPMENT), listWhere(repo, KIND_PNL_LINE)]) : [[], [], []];
  const managerBar = document.createElement("div");
  managerBar.className = "flex gap-2 mb-4";
  managerBar.innerHTML = `<button id="btn-check-dup" class="px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">${t("masters_hub.dq.check_dups")}</button>`;
  const delegate = document.createElement("div");
  delegate.id = "master-delegate";
  root.innerHTML = "";
  root.appendChild(managerBar);
  root.appendChild(delegate);
  managerBar.querySelector("#btn-check-dup").addEventListener("click", () => {
    const clusters = findDuplicateClusters(customers);
    const wizard = document.createElement("vdg-dup-wizard");
    wizard.clusters = clusters.map((c) => ({ a: c.a, b: c.b, score: c.score ?? 0 }));
    wizard.repo = repo;
    document.body.appendChild(wizard);
  });
  try {
    const { render: renderCusts } = await import("./masters-customers-6LVIVJ3I.js");
    await renderCusts(delegate);
  } catch {
    delegate.innerHTML = `<div class="p-4 text-slate-400 text-xs">${t("masters_hub.err.customer_load")}</div>`;
  }
  const dqEl = document.createElement("div");
  root.appendChild(dqEl);
  renderDataQuality(dqEl, customers, shipments, pnlLines);
}
async function renderCarriersMaster(root) {
  const delegate = document.createElement("div");
  root.innerHTML = "";
  root.appendChild(delegate);
  try {
    const { render: renderCarriers } = await import("./masters-carriers-25ACI65R.js");
    await renderCarriers(delegate);
  } catch {
    delegate.innerHTML = `<div class="p-4 text-slate-400 text-xs">${t("masters_hub.err.carrier_load")}</div>`;
  }
}
async function render(root, param) {
  if (_onEntity) window.removeEventListener("vdg:entity-changed", _onEntity);
  const route = param?.route || location.hash.slice(1);
  const match = MASTERS_RE.exec(route);
  const kind = match?.[1] || param?.kind || "";
  if (!KIND_MAP[kind]) {
    root.innerHTML = `<div class="p-6 text-slate-400 text-sm">${t("masters_hub.err.type_not_found")}</div>`;
    return;
  }
  const wrapper = document.createElement("div");
  wrapper.className = "p-6 max-w-[1600px] mx-auto";
  root.innerHTML = "";
  root.appendChild(wrapper);
  if (kind === "customers") await renderCustomersMaster(wrapper);
  else if (kind === "carriers") await renderCarriersMaster(wrapper);
  else await renderUsers(wrapper);
  _onEntity = async (e) => {
    const k = e.detail?.kind;
    if (k === KIND_USER || k === KIND_CUSTOMER || k === KIND_CARRIER) {
      await render(root, param);
    }
  };
  window.addEventListener("vdg:entity-changed", _onEntity);
}
export {
  render
};
