import {
  calcResult
} from "./chunk-WKFYYEZM.js";
import {
  t
} from "./chunk-YMZ4K7MJ.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/quotes/air-calc.js
var KIND = "air-rates";
function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function loadRates(repo) {
  if (!repo) return [];
  try {
    return await repo.list(KIND, null).catch(() => []);
  } catch {
    return [];
  }
}
function rateLabel(r) {
  return `${r.route_origin}\u2192${r.route_dest} \xB7 ${r.carrier_iata} \xB7 ${r.valid_from}..${r.valid_to} (${r.currency})`;
}
function renderOptions(rates) {
  return rates.map((r) => `<option value="${escHtml(r.id || r.rate_id)}">${escHtml(rateLabel(r))}</option>`).join("");
}
function numInput(id, label, placeholder, step = "0.01") {
  return `
    <div>
      <label class="block text-xs font-medium text-slate-700 mb-1">${label}</label>
      <input id="${id}" type="number" step="${step}" min="0" placeholder="${placeholder}"
             class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
    </div>`;
}
async function render(root) {
  const repo = window.__vdg_repo;
  const rates = await loadRates(repo);
  root.innerHTML = `
    <div class="p-6 max-w-2xl mx-auto">
      <div class="text-lg font-semibold text-slate-900 mb-6">${t("air_rate.calc_title")}</div>

      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t("air_rate.field.route")} / ${t("air_rate.field.carrier")}</label>
          <select id="ac-rate"
                  class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">${t("air_rate.select_ph")}</option>
            ${renderOptions(rates)}
          </select>
          <p id="ac-no-rates" class="${rates.length ? "hidden" : ""} text-xs text-amber-600 mt-1">
            ${t("air_rate.no_rates")}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          ${numInput("ac-actual", `${t("air_rate.field.chargeable_kg")} \u2014 ${t("air_rate.field.actual")}`, "95", "0.1")}
          <div></div>
        </div>

        <div>
          <div class="text-xs font-medium text-slate-700 mb-2">${t("air_rate.dimensions")}</div>
          <div class="grid grid-cols-3 gap-3">
            ${numInput("ac-l", t("air_rate.dim.length"), "100", "1")}
            ${numInput("ac-w", t("air_rate.dim.width"), "60", "1")}
            ${numInput("ac-h", t("air_rate.dim.height"), "80", "1")}
          </div>
        </div>

        <button id="ac-calc" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
          ${t("air_rate.calc_btn")}
        </button>

        <div id="ac-result" class="hidden"></div>
        <div id="ac-error"  class="hidden text-xs text-red-600"></div>
      </div>
    </div>`;
  const rateMap = Object.fromEntries(rates.map((r) => [r.id || r.rate_id, r]));
  root.querySelector("#ac-calc").addEventListener("click", () => {
    const rateId = root.querySelector("#ac-rate").value;
    const actual = parseFloat(root.querySelector("#ac-actual").value);
    const l = parseFloat(root.querySelector("#ac-l").value) || 0;
    const w = parseFloat(root.querySelector("#ac-w").value) || 0;
    const h = parseFloat(root.querySelector("#ac-h").value) || 0;
    const errEl = root.querySelector("#ac-error");
    const resEl = root.querySelector("#ac-result");
    errEl.classList.add("hidden");
    resEl.classList.add("hidden");
    if (!rateId) {
      errEl.textContent = t("air_rate.err.no_rate");
      errEl.classList.remove("hidden");
      return;
    }
    if (isNaN(actual) || actual <= 0) {
      errEl.textContent = t("air_rate.err.no_weight");
      errEl.classList.remove("hidden");
      return;
    }
    const rate = rateMap[rateId];
    if (!rate) {
      errEl.textContent = t("air_rate.err.rate_missing");
      errEl.classList.remove("hidden");
      return;
    }
    const res = calcResult(actual, l, w, h, rate.breaks);
    if (!res) {
      errEl.textContent = t("air_rate.err.no_tier");
      errEl.classList.remove("hidden");
      return;
    }
    resEl.innerHTML = `
      <div class="border-t border-slate-100 pt-4 space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-slate-600">${t("air_rate.field.chargeable_kg")}</span>
          <span class="font-semibold">${res.chargeableKg} kg</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-slate-600">${t("air_rate.applied_tier")}</span>
          <span class="font-mono">${t("air_rate.break_line", { n: res.tier.min_kg, ccy: rate.currency, r: res.tier.rate_per_kg })}</span>
        </div>
        <div class="flex justify-between text-base font-bold text-blue-700 border-t border-slate-100 pt-2">
          <span>${t("air_rate.field.freight_total")}</span>
          <span>${rate.currency} ${res.freightTotal.toFixed(2)}</span>
        </div>
      </div>`;
    resEl.classList.remove("hidden");
  });
}
export {
  render
};
