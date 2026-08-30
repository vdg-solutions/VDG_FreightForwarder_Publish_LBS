import {
  boundedList,
  foldSyncFailure,
  renderMasterLoadRetryStatus
} from "./chunk-2CUGKPB3.js";
import "./chunk-JAZY43GR.js";
import {
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/manager/masters/ocean-tariff.js
var KIND = "ocean-tariff";
var CARRIER_KIND = "ocean-carriers";
var ISO_DATE_LENGTH = 10;
var MIN_PLAUSIBLE_VND_RATE = 1e6;
var MAX_PLAUSIBLE_USD_RATE = 5e4;
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function todayIso() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, ISO_DATE_LENGTH);
}
function buildCarrierNameMap(carriers) {
  return new Map((carriers || []).map((c) => [c.scac, c.name]));
}
function resolveCarrierName(row, carrierMap) {
  return carrierMap.get(row.carrier_scac) ?? row.carrier_scac;
}
function currencyCode(currency) {
  if (typeof currency === "string") return currency.toUpperCase();
  if (currency && typeof currency === "object" && "Other" in currency) return String(currency.Other).toUpperCase();
  return "UNKNOWN";
}
function isRateMagnitudePlausible(record) {
  const amount = Number(record?.body?.rate_amount);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const code = currencyCode(record?.currency);
  if (code === "VND") return amount >= MIN_PLAUSIBLE_VND_RATE;
  if (code === "USD") return amount <= MAX_PLAUSIBLE_USD_RATE;
  return true;
}
async function resolveEffectiveRecord(pricedRepo, row, dateStr) {
  if (!pricedRepo) return { currency: row.currency, body: row };
  try {
    return await pricedRepo.resolveOnDate(row.pricing_key, dateStr);
  } catch {
    return { currency: row.currency, body: row };
  }
}
function rowHtml(row, carrierName, record) {
  const plausible = isRateMagnitudePlausible(record);
  const rateCls = plausible ? "text-slate-900 font-medium" : "text-red-600 font-semibold";
  const warnBadge = plausible ? "" : '<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-red-100 text-red-700">!</span>';
  const validFrom = record.body?.valid_from ?? row.valid_from;
  const validTo = record.body?.valid_to ?? row.valid_to;
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${escHtml(row.id)}">
      <td class="px-3 py-2">${escHtml(carrierName)}</td>
      <td class="px-3 py-2">${escHtml(row.lane_origin)} \u2192 ${escHtml(row.lane_dest)}</td>
      <td class="px-3 py-2 text-right ${rateCls}">${escHtml(record.body?.rate_amount)}${warnBadge}</td>
      <td class="px-3 py-2">${escHtml(currencyCode(record.currency))}</td>
      <td class="px-3 py-2 text-[10px] text-slate-400">${escHtml(validFrom)} \u2013 ${escHtml(validTo)}</td>
    </tr>`;
}
async function render(root) {
  const repo = window.__vdg_repo;
  const pricedRepo = window.__vdg_priced_repos?.[KIND];
  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t("masters.ocean_tariff.title")}</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t("masters.ocean_tariff.col_carrier")}</th>
              <th class="px-3 py-2 text-left">${t("masters.ocean_tariff.col_lane")}</th>
              <th class="px-3 py-2 text-right">${t("masters.ocean_tariff.col_rate")}</th>
              <th class="px-3 py-2 text-left">${t("masters.ocean_tariff.col_currency")}</th>
              <th class="px-3 py-2 text-left">${t("masters.ocean_tariff.col_effective")}</th>
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">${t("masters.ocean_tariff.empty")}</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">${t("common.load.loading")}</div>
    </div>`;
  async function reload() {
    const tbody = root.querySelector("#m-tbody");
    const emptyEl = root.querySelector("#m-empty");
    const statusEl = root.querySelector("#m-status");
    if (!repo) {
      if (tbody) tbody.innerHTML = "";
      if (statusEl) statusEl.textContent = "";
      return;
    }
    const [tariffRaw, carrierRes] = await Promise.all([
      boundedList(repo, KIND, "ocean-tariff:list"),
      boundedList(repo, CARRIER_KIND, "ocean-tariff:carriers")
    ]);
    const tariffRes = foldSyncFailure(tariffRaw, KIND, repo);
    if (!tariffRes.ok) {
      if (tbody) tbody.innerHTML = "";
      emptyEl?.classList.add("hidden");
      renderMasterLoadRetryStatus(statusEl, t("masters.load_error"), t("retry"), reload);
      return;
    }
    const items = tariffRes.value;
    const carriers = carrierRes.ok ? carrierRes.value : [];
    const carrierMap = buildCarrierNameMap(carriers);
    const dateStr = todayIso();
    const rows = await Promise.all(items.map(async (row) => {
      const record = await resolveEffectiveRecord(pricedRepo, row, dateStr);
      return rowHtml(row, resolveCarrierName(row, carrierMap), record);
    }));
    if (tbody) tbody.innerHTML = rows.join("");
    if (emptyEl) emptyEl.classList.toggle("hidden", items.length > 0);
    if (statusEl) statusEl.textContent = "";
  }
  await reload();
}
export {
  buildCarrierNameMap,
  isRateMagnitudePlausible,
  render,
  resolveCarrierName,
  resolveEffectiveRecord
};
