import {
  DEFAULT_HEADER_CURRENCY,
  applyFxDateDefaults,
  bookCurrencyOf,
  computeLineVnd,
  currencySelectHtml,
  fxCellsHtml,
  lockFxIfVnd,
  prefillFxRate,
  prefillRowFx,
  resolveHeaderCurrency,
  summarizeLineCurrencies,
  vndCellHtml,
  wireLineFx
} from "./chunk-HP6BHP7N.js";
import {
  mountDateHints
} from "./chunk-OXNK6IJ2.js";
import {
  kindI18nLabel
} from "./chunk-63NTIMGD.js";
import {
  resolveSalesRepLabel
} from "./chunk-OCM54TMO.js";
import {
  getRateForDate
} from "./chunk-RIEF2VNQ.js";
import {
  resolveShipmentState
} from "./chunk-DVXWC4LN.js";
import "./chunk-ETXXTRJC.js";
import {
  assignJobNo,
  autoAdvanceShipment,
  computeQuoteTotals,
  deletePnlLinesFor,
  dismissPrediction,
  ensureRepCode,
  getCurrentUser,
  loadKindWmaState,
  pnlLineId,
  predict,
  saveKindWmaState,
  slugify
} from "./chunk-JAUWUVEL.js";
import {
  computeChargeableKg
} from "./chunk-WKFYYEZM.js";
import {
  fxDeviation
} from "./chunk-Z6T6WECV.js";
import {
  ROLE_LABEL_KEYS
} from "./chunk-P5SY6HRX.js";
import {
  DEFAULT_CURRENCY_FIELD,
  readSettings
} from "./chunk-IIUQ3SOM.js";
import {
  todayLocal
} from "./chunk-7INC2TTZ.js";
import {
  customerRepFor,
  selfRepCandidate
} from "./chunk-BDMZBHS4.js";
import {
  checkAlreadyConverted
} from "./chunk-5UHUC2YB.js";
import {
  currentUserEmail,
  currentUserRoles
} from "./chunk-M3ODLRBG.js";
import {
  ROLE_MANAGER
} from "./chunk-NGKBNKFN.js";
import {
  registerFsmEntity
} from "./chunk-VTRTBWKI.js";
import {
  navigate
} from "./chunk-H2H4WJDI.js";
import {
  ensureShipmentStateAliases
} from "./chunk-FJ72A4AS.js";
import {
  loadWasm
} from "./chunk-EJWPNW2L.js";
import {
  REVENUE_SEEN,
  getEnvelope,
  getShipment,
  listEnvelopes,
  putShipment,
  rollbackShipmentCreate
} from "./chunk-Q3NWEQ2V.js";
import {
  getActiveSalesReps
} from "./chunk-YFN2XPGT.js";
import {
  safeMasterLoad
} from "./chunk-2CUGKPB3.js";
import {
  currentRoles,
  currentSalesRepId
} from "./chunk-NQTRREKJ.js";
import "./chunk-JAZY43GR.js";
import {
  showConfirm
} from "./chunk-HKNQBDY4.js";
import {
  currentLocale,
  t
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new/draft-manager.js
var DRAFT_META_KEY = "draft.sales-new";
var DRAFT_LS_KEY = "vdg.draft.sales-new-v2";
var getStore = () => window.__vdg_store || null;
async function loadDraft() {
  try {
    const store = getStore();
    if (store) {
      const rec = await store.cache_get_meta(DRAFT_META_KEY);
      if (rec?.state) return rec.state;
    }
  } catch {
  }
  try {
    const raw = localStorage.getItem(DRAFT_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function saveDraft(state) {
  try {
    const store = getStore();
    if (store) {
      await store.cache_put_meta(DRAFT_META_KEY, { state, last_modified: Date.now() });
      return;
    }
  } catch {
  }
  try {
    localStorage.setItem(DRAFT_LS_KEY, JSON.stringify(state));
  } catch {
  }
}
async function clearDraft() {
  try {
    const store = getStore();
    if (store) await store.cache_delete_meta(DRAFT_META_KEY);
  } catch {
  }
  try {
    localStorage.removeItem(DRAFT_LS_KEY);
  } catch {
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/pnl-vertical-autofill.js
function _resolveCommissionLines(shipment, ce) {
  if (shipment.commission_lines?.length > 0) return shipment.commission_lines;
  if (ce?.gross_amount > 0) {
    const importFxDate = shipment.etd || todayLocal();
    return [{
      kind: "Line",
      amount_fx: ce.gross_amount || 0,
      currency: "VND",
      fx_rate: ce.fx_rate_commission || 1,
      fx_date: importFxDate,
      bank_fee: ce.bank_charge || 0,
      tncn_pct: 15,
      tncn_amount: ce.personal_tax_15 || 0,
      net_after_tax: ce.net_amount || 0,
      tncn_manual: ce.tax15_manual_override || false
    }];
  }
  return [];
}
function shipmentToDraft(shipment, ce) {
  const s = shipment || {};
  return {
    quote_id: s.quote_id ?? null,
    mbl: s.mbl || "",
    hbl: s.hbl || "",
    // F-32-01: carry the persisted Job No / HBL-linkage flag through the edit round-trip —
    // renderForm only generates a fresh job_no when the draft has none (create-mount path).
    job_no: s.job_no || "",
    has_hbl: Boolean(s.do_no),
    job_file_no: s.job_file_no || "",
    // E-39: product is its own persisted field now; commodity_description only feeds the free-text
    // commodity input. Legacy records (no product) fall back to the old commodity read so the
    // select is not silently blanked on old jobs whose commodity happened to hold an option value.
    product: s.product || s.commodity_description || "",
    commodity: s.commodity_description || "",
    // E-39: carry the LIFECYCLE STATE through the edit round-trip — phase timeline + phase screens
    // open at the phase the job is actually in, not at Created.
    state: s.state || "",
    booking_no: s.booking_no || "",
    container_qty: s.container_qty ?? "",
    reefer_temp: s.reefer_temp || "",
    reefer_vent: s.reefer_vent || "",
    closing_si: s.closing_si || "",
    closing_cy: s.closing_cy || "",
    empty_pickup_depot: s.empty_pickup_depot || "",
    full_return_depot: s.full_return_depot || "",
    place_of_receipt: s.place_of_receipt || "",
    place_of_delivery: s.place_of_delivery || "",
    notify_party: s.notify_party || "",
    for_delivery: s.for_delivery || "",
    seal_no: s.seal_no || "",
    freight_terms: s.freight_terms || "",
    doc_type: s.doc_type || "",
    volume_cbm: s.volume_cbm ?? "",
    atd: s.atd || "",
    // F-41-03: phase evidence — an edit that dropped these would untick the timeline
    ata: s.ata || "",
    customs_cleared_at: s.customs_cleared_at || "",
    haulage_signed_at: s.haulage_signed_at || "",
    do_released_at: s.do_released_at || "",
    cargo_released_at: s.cargo_released_at || "",
    billing_paid_at: s.billing_paid_at || "",
    sales_rep: s.sales_rep_id || "",
    customer: s.customer || "",
    shipper: s.shipper || "",
    shipper_address: s.shipper_address || "",
    consignee: s.consignee || "",
    consignee_address: s.consignee_address || "",
    // Air header block — not read at all before this feature (a pre-existing gap: mode,
    // dim_l/w/h_cm, uld_type, flight_no, chargeable_kg and the airport fields have the same hole
    // and stay unmapped here). Fixed for exactly the fields this feature adds/renames, since an
    // edit that dropped them would make the new quantity/weight unit pickers look broken.
    pieces: s.pieces ?? "",
    package_type: s.package_type || "",
    weight_actual: s.weight_actual ?? "",
    weight_uom: s.weight_uom || "",
    vessel: s.vessel || "",
    carrier: s.carrier || "",
    etd: s.etd || "",
    eta: s.eta || "",
    pol: s.pol || "",
    pod: s.pod || "",
    volume: s.container_spec || "",
    roe_buying: s.roe_buying ?? "",
    roe_selling: s.roe_debit ?? "",
    currency: s.job_currency || "USD",
    // F-29-01 AC-06: doc date default for legacy fx_date fallback below AND the form's
    // new-row default — persisted date, not "today", so re-opening an old draft doesn't
    // silently shift its fx_date forward.
    transaction_date: s.transaction_date || "",
    lines: (s.pnl_lines || []).map((ln) => _lineToDraft(ln, s)),
    // AC-09: back-compat shim — new commission_lines > old CR1 entry > empty
    commission_lines: _resolveCommissionLines(s, ce),
    sales_share_pct_override: s.sales_share_pct_override ?? null,
    cargo_items: s.cargo_items || [],
    containers: s.containers || [],
    publish_state: s.publish_state || "draft"
  };
}
function _lineToDraft(ln, s) {
  const buyCurrency = ln.buying_currency || s.job_currency || "VND";
  const sellCurrency = ln.selling_currency || s.job_currency || "VND";
  const bookCurrency = s.job_currency || "VND";
  const wasm4 = window.__vdg_wasm;
  return {
    desc: ln.description || "",
    kind: ln.subtype || "",
    buy_qty: ln.buying_qty || 0,
    buy_unit: ln.buying_unit || "",
    buy_amt: ln.buying_amount || 0,
    buy_currency: buyCurrency,
    buy_fx_rate: ln.buying_fx_rate || (wasm4.pnl_line_fx_lock(buyCurrency, bookCurrency).rate ?? ""),
    buy_fx_date: ln.buying_fx_date || "",
    vnd_pay: ln.buying_vnd_pay || 0,
    sell_qty: ln.selling_qty || 0,
    sell_unit: ln.selling_unit || "",
    sell_amt: ln.selling_amount || 0,
    sell_currency: sellCurrency,
    sell_fx_rate: ln.selling_fx_rate || (wasm4.pnl_line_fx_lock(sellCurrency, bookCurrency).rate ?? ""),
    sell_fx_date: ln.selling_fx_date || "",
    vnd_collect: ln.selling_vnd_collect || 0,
    pol_pod_side: ln.pol_pod_side || "N/A"
  };
}

// output/web/js.tmp/implementations/kernel/core_abstractions/util/account-id.js
function isAccountId(token) {
  const s = String(token ?? "");
  return s.includes("@") && !/\s/.test(s) && s === s.toLowerCase();
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new/shipment-builder.js
var SOURCE_ORIGIN = "form-entry";
var PARSER_ID = "form-v1";
var PARSER_VERSION = "1";
var DEFAULT_INITIAL_STATE = "Created";
var wasm = () => globalThis.window?.__vdg_wasm || globalThis.__vdg_wasm;
function deriveDirection(state) {
  const mod = wasm();
  if (typeof mod?.derive_shipment_direction !== "function") {
    throw new Error("shipment-builder: wasm not ready \u2014 derive_shipment_direction missing");
  }
  return mod.derive_shipment_direction(state.direction || "", state.product || "") || null;
}
function buildShipment(state, ref, salesRepId, opts = {}) {
  const publishState = opts.publishState || "published";
  const rawState = state.state ?? DEFAULT_INITIAL_STATE;
  const resolvedState = resolveShipmentState(rawState, opts.stateAliasRows || []);
  if (!resolvedState) throw new Error(`Invalid shipment state: ${rawState}`);
  return {
    shipment_ref: ref,
    quote_id: state.quote_id || null,
    // F-30-01: nullable back-ref to source quotation
    sales_rep_id: salesRepId || null,
    state: resolvedState,
    publish_state: publishState,
    open_date: todayLocal(),
    transaction_date: todayLocal(),
    job_file_no: state.job_file_no || null,
    customer: state.customer || null,
    shipper: state.shipper || null,
    shipper_address: state.shipper_address || null,
    consignee: state.consignee || null,
    consignee_address: state.consignee_address || null,
    notify_party: state.notify_party || null,
    mbl: state.mbl || null,
    // F-32-01: HBL present ⇒ HBL No = D/O No = Job No (auto-fill supersedes any typed value)
    job_no: opts.jobNo || null,
    do_no: state.has_hbl && opts.jobNo ? opts.jobNo : null,
    hbl: state.has_hbl ? opts.jobNo || null : state.hbl || null,
    doc_type: state.doc_type || null,
    // E-39: booking/docs fields off the customer's job sheet (4-window entry)
    product: state.product || null,
    booking_no: state.booking_no || null,
    container_qty: parseInt(state.container_qty, 10) || null,
    reefer_temp: state.reefer_temp || null,
    reefer_vent: state.reefer_vent || null,
    closing_si: state.closing_si || null,
    closing_cy: state.closing_cy || null,
    empty_pickup_depot: state.empty_pickup_depot || null,
    full_return_depot: state.full_return_depot || null,
    place_of_receipt: state.place_of_receipt || null,
    place_of_delivery: state.place_of_delivery || null,
    for_delivery: state.for_delivery || null,
    seal_no: state.seal_no || null,
    volume_cbm: parseFloat(state.volume_cbm) || null,
    atd: state.atd || null,
    // F-41-03: phase evidence — each one is a checklist row the FSM reads straight off the record
    ata: state.ata || null,
    customs_cleared_at: state.customs_cleared_at || null,
    haulage_signed_at: state.haulage_signed_at || null,
    do_released_at: state.do_released_at || null,
    cargo_released_at: state.cargo_released_at || null,
    billing_paid_at: state.billing_paid_at || null,
    mode: (state.mode || "").toLowerCase() || null,
    direction: deriveDirection(state),
    container_spec: state.container_spec || state.volume || null,
    // air fields
    airport_origin: state.origin_iata || null,
    airport_dest: state.dest_iata || null,
    chargeable_kg: parseFloat(state.chargeable_kg) || null,
    // no "_kg" suffix — the value is stored in whatever weight_uom names, never forced to kg.
    // Every consumer (chargeable-weight calc, document print) reads the two together and must
    // not assume kilograms.
    weight_actual: parseFloat(state.weight_actual) || null,
    weight_uom: state.weight_uom || null,
    pieces: parseInt(state.pieces, 10) || null,
    package_type: state.package_type || null,
    uld_type: state.uld_type || null,
    flight_no: state.flight_no || null,
    pol: state.pol || null,
    pod: state.pod || null,
    etd: state.etd || null,
    eta: state.eta || null,
    carrier: state.carrier || null,
    vessel: state.vessel || null,
    handling_agent: state.handling_agent || null,
    freight_terms: state.freight_terms || null,
    commodity_description: state.commodity || null,
    job_currency: state.currency || "USD",
    roe_buying: parseFloat(state.roe_buying) || null,
    // F-41-05: the FORM field is roe_selling (collectFormState); the record key stays roe_debit.
    // Reading state.roe_debit alone dropped every typed sell-side ROE on the floor.
    roe_debit: parseFloat(state.roe_selling ?? state.roe_debit) || null,
    // E-37: line_id is the join key between the two records a shipment is stored as (the buy side
    // travels with the envelope into _shared/shipments, the sell side stays in the rep's fork).
    // Same scheme as the materialized `pnl_line` rows, so one shipment has one line vocabulary.
    // shipment_split REFUSES a line without it rather than producing a half that cannot rejoin.
    pnl_lines: state.lines ? state.lines.map((ln, i) => ({
      line_id: ln.line_id || pnlLineId(ref, i + 1),
      subtype: ln.kind || "MiscOperatingExpense",
      description: ln.desc,
      buying_qty: ln.buy_qty,
      buying_unit: ln.buy_unit,
      buying_amount: ln.buy_amt,
      buying_currency: ln.buy_currency || null,
      buying_fx_rate: ln.buy_fx_rate || null,
      buying_fx_date: ln.buy_fx_date || null,
      buying_vnd_pay: ln.vnd_pay,
      selling_qty: ln.sell_qty,
      selling_unit: ln.sell_unit,
      selling_amount: ln.sell_amt,
      selling_currency: ln.sell_currency || null,
      selling_fx_rate: ln.sell_fx_rate || null,
      selling_fx_date: ln.sell_fx_date || null,
      selling_vnd_collect: ln.vnd_collect,
      pol_pod_side: ln.pol_pod_side
    })) : (state.pnl_lines || []).map((ln, i) => ({ line_id: ln.line_id || pnlLineId(ref, i + 1), ...ln })),
    sales_share_pct_override: state.sales_share_pct_override ?? null,
    cargo_items: state.cargo_items || [],
    containers: state.containers || [],
    // AC-08: commission rows stored in shipment payload (F-15-59)
    commission_lines: (state.commission_lines || []).map((l) => ({
      kind: l.kind || "Line",
      amount_fx: l.amount_fx || 0,
      currency: l.currency || "USD",
      // Rides to ledger_poster.rs::LedgerCommissionEntry.book_currency — the workspace book
      // currency AT SAVE TIME, so commission_gross_vnd applies the SAME rule the rep saw.
      book_currency: l.book_currency || state.book_currency || null,
      fx_rate: l.fx_rate || null,
      fx_date: l.fx_date || null,
      bank_fee: l.bank_fee || 0,
      tncn_pct: l.tncn_pct || 0,
      tncn_amount: l.tncn_amount || 0,
      net_after_tax: l.net_after_tax || 0,
      tncn_manual: l.tncn_manual || false
    })),
    provenance: {
      source_origin: SOURCE_ORIGIN,
      parser_id: PARSER_ID,
      parser_version: PARSER_VERSION,
      parsed_at: (/* @__PURE__ */ new Date()).toISOString(),
      // F-29-04 VR-03 AC-06: fx-deviation confirmation audit trail
      fx_overrides: state._fx_overrides || []
    }
  };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-header.js
var CURRENCY_OPTIONS = ["USD", "VND", "EUR", "SGD", "JPY"];
var PRODUCT_OPTIONS = ["FCL EXPORT", "IMPORT FCL", "AIR", "LCL"];
var MODE_OPTIONS = ["SEA", "AIR"];
var DIRECTION_OPTIONS = ["export", "import"];
var DIRECTION_LABEL_KEYS = { export: "sales_new.direction_option.export", import: "sales_new.direction_option.import" };
var NAME_DIRECTION = "direction";
var NAME_DIRECTION_DISPLAY = "direction_display";
var PRODUCT_LABEL_KEYS = { "FCL EXPORT": "sales_new.product_option.fcl_export", "IMPORT FCL": "sales_new.product_option.import_fcl", AIR: "sales_new.product_option.air", LCL: "sales_new.product_option.lcl" };
var MODE_LABEL_KEYS = { SEA: "sales_new.mode_selector.sea", AIR: "sales_new.mode_selector.air" };
function directionFromProduct(product) {
  return deriveDirection({ product }) || "";
}
function directionSel(draft) {
  const fromProduct = directionFromProduct(draft.product);
  const selected = fromProduct || draft.direction || "";
  const locked = fromProduct ? " disabled" : "";
  const mirror = fromProduct ? `<input type="hidden" name="${NAME_DIRECTION}" value="${fromProduct}" />` : "";
  return `<select name="${fromProduct ? NAME_DIRECTION_DISPLAY : NAME_DIRECTION}"${locked}
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs${locked ? " bg-slate-50" : ""}">
    <option value="">\u2014</option>${DIRECTION_OPTIONS.map((o) => `<option value="${o}"${o === selected ? " selected" : ""}>${t(DIRECTION_LABEL_KEYS[o])}</option>`).join("")}
  </select>${mirror}`;
}
function fld(label, inner) {
  return `
    <div>
      <label class="block text-[10px] text-slate-500 mb-0.5">${label}</label>
      ${inner}
    </div>`;
}
function cfld(label, inner, attr) {
  return `
    <div ${attr}>
      <label class="block text-[10px] text-slate-500 mb-0.5">${label}</label>
      ${inner}
    </div>`;
}
function txt(name, val, ph) {
  const phAttr = ph ? ` placeholder="${ph}"` : "";
  return `<input type="text" name="${name}" value="${val || ""}"${phAttr}
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}
function num(name, val) {
  return `<input type="number" name="${name}" value="${val || ""}" step="any"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}
function roNum(name, val) {
  return `<input type="number" name="${name}" value="${val || ""}" step="any" readonly
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50" />`;
}
function dateInp(name, val) {
  return `<input type="date" name="${name}" value="${val || ""}" lang="${currentLocale()}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}
function optHtml(options, selected, labelKeys) {
  return options.map(
    (o) => `<option value="${o}"${o === selected ? " selected" : ""}>${labelKeys ? t(labelKeys[o] || o) : o}</option>`
  ).join("");
}
function selFld(name, options, selected, labelKeys) {
  return `<select name="${name}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">\u2014</option>${optHtml(options, selected, labelKeys)}
  </select>`;
}
function custSel(customers, selected, isAutofilled) {
  const autofillAttr = isAutofilled ? ' data-autofilled="true"' : "";
  return `
    <div class="relative" id="customer-search-container">
      <input type="hidden" name="customer" value="${selected || ""}" />
      <input type="text" id="customer-search-input" value="${selected || ""}" placeholder="${t("sales_new.select_placeholder")}" autocomplete="off"${autofillAttr}
        class="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-200" />
      <div id="customer-search-dropdown" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg hidden flex-col max-h-48 overflow-y-auto text-xs">
        <!-- results go here -->
      </div>
    </div>`;
}
function repOptionLabel(r) {
  return r.handle ? `${r.name} (${r.handle})` : r.name;
}
function repSel(reps, selected, currentUser) {
  const known = (reps || []).some((r) => r.prefix === selected);
  const legacy = selected && !known && isAccountId(selected) ? `<option value="${selected}" selected>${resolveSalesRepLabel(selected, currentUser, t)}</option>` : "";
  const opts = (reps || []).map((r) => `<option value="${r.prefix}"${r.prefix === selected ? " selected" : ""}>${repOptionLabel(r)}</option>`).join("");
  return `<select name="sales_rep" class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">${t("sales_new.select_placeholder")}</option>${legacy}${opts}
  </select>`;
}
function quotePickSel(quoteId) {
  const current = quoteId ? `<option value="${quoteId}" selected>${quoteId}</option>` : "";
  return `<select name="quote_pick" class="w-full border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">${t("sales_new.quote_pick_placeholder")}</option>${current}
  </select>`;
}
var CONTAINER_TYPES = ["20DC", "40DC", "40HC", "45HC", "20RF", "40RF", "20OT", "40OT", "20FR", "40FR", "20TK"];
var PKG_TYPES = ["CTNS", "PLTS", "BAGS", "BOXES", "CRATES", "PKGS", "DRUMS", "ROLLS", "SETS", "UNITS"];
var DEFAULT_PACKAGE_TYPE = "CTNS";
var FALLBACK_WEIGHT_UNITS = ["KG", "LB"];
var DEFAULT_WEIGHT_UOM = "KG";
function codeSelect(name, codes, selected, fallback) {
  const sel = selected || fallback;
  const legacy = selected && !codes.includes(selected) ? `<option value="${selected}" selected>${selected}</option>` : "";
  const opts = codes.map((c) => `<option value="${c}"${c === sel ? " selected" : ""}>${c}</option>`).join("");
  return `<select name="${name}" class="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white">${legacy}${opts}</select>`;
}
function packageTypeSelect(selected) {
  return codeSelect("package_type", PKG_TYPES, selected, DEFAULT_PACKAGE_TYPE);
}
function weightUomSelect(weightUnits, selected) {
  const codes = weightUnits && weightUnits.length > 0 ? weightUnits : FALLBACK_WEIGHT_UNITS;
  return codeSelect("weight_uom", codes, selected, DEFAULT_WEIGHT_UOM);
}
function txtWithList(name, val, ph, listId) {
  const phAttr = ph ? ` placeholder="${ph}"` : "";
  const listAttr = listId ? ` list="${listId}"` : "";
  return `<input type="text" name="${name}" value="${val || ""}"${phAttr}${listAttr}
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}
function renderHistoryDatalists(carriers = [], shipments = []) {
  const carrierSet = /* @__PURE__ */ new Set();
  (carriers || []).forEach((c) => {
    if (c.name) carrierSet.add(c.name);
    if (c.short_code) carrierSet.add(c.short_code);
  });
  const vesselSet = /* @__PURE__ */ new Set();
  const polSet = /* @__PURE__ */ new Set();
  const podSet = /* @__PURE__ */ new Set();
  const shipperSet = /* @__PURE__ */ new Set();
  const consigneeSet = /* @__PURE__ */ new Set();
  (shipments || []).forEach((s) => {
    if (s.carrier) carrierSet.add(s.carrier);
    if (s.vessel) vesselSet.add(s.vessel);
    if (s.pol) polSet.add(s.pol);
    if (s.pod) podSet.add(s.pod);
    if (s.shipper) shipperSet.add(s.shipper);
    if (s.consignee) consigneeSet.add(s.consignee);
  });
  return `
    <datalist id="carrier-history-list">
      ${Array.from(carrierSet).map((v) => `<option value="${v}"></option>`).join("")}
    </datalist>
    <datalist id="vessel-history-list">
      ${Array.from(vesselSet).map((v) => `<option value="${v}"></option>`).join("")}
    </datalist>
    <datalist id="pol-history-list">
      ${Array.from(polSet).map((v) => `<option value="${v}"></option>`).join("")}
    </datalist>
    <datalist id="pod-history-list">
      ${Array.from(podSet).map((v) => `<option value="${v}"></option>`).join("")}
    </datalist>
    <datalist id="shipper-history-list">
      ${Array.from(shipperSet).map((v) => `<option value="${v}"></option>`).join("")}
    </datalist>
    <datalist id="consignee-history-list">
      ${Array.from(consigneeSet).map((v) => `<option value="${v}"></option>`).join("")}
    </datalist>
  `;
}
function sectionAHtml(draft = {}, customers = [], reps = [], { carriers = [], shipments = [], weightUnits = [] } = {}) {
  const d = draft;
  const mode = (d.mode || "SEA").toUpperCase();
  const seaHide = mode === "AIR" ? ' class="hidden"' : "";
  const airHide = mode === "AIR" ? "" : ' class="hidden"';
  return `
    <div id="sec-a-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        ${t("sales_new.section.header")}
      </div>
      <input type="hidden" name="quote_id" value="${d.quote_id || ""}" />
      <div class="grid grid-cols-3 gap-3">
        ${fld(
    t("sales_new.mode_selector.title"),
    selFld("mode", MODE_OPTIONS, mode, MODE_LABEL_KEYS)
  )}
        ${fld(t("sales_new.field.mbl"), txt("mbl", d.mbl))}
        ${fld(t("sales_new.field.job_no"), `<div class="flex items-center gap-2"><input type="text" name="job_no" value="${d.job_no || ""}" readonly class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-mono" /><label class="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap"><input type="checkbox" name="has_hbl" ${d.has_hbl ? "checked" : ""} class="h-3.5 w-3.5" />${t("sales_new.field.has_hbl")}</label></div>`)}
        ${cfld(t("sales_new.field.hbl_do"), `<input type="text" name="hbl_do_display" value="${d.has_hbl ? d.job_no || "" : ""}" readonly class="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-mono" />`, `data-hbl-do-row${d.has_hbl ? "" : ' class="hidden"'}`)}
        ${fld(t("sales_new.field.product"), selFld("product", PRODUCT_OPTIONS, d.product, PRODUCT_LABEL_KEYS))}
        ${fld(t("sales_new.field.direction"), directionSel(d))}
        ${fld(t("sales_new.field.quote_pick"), quotePickSel(d.quote_id))}
        ${fld(t("sales_new.field.customer"), custSel(customers, d.customer, d._autofilled))}
        ${fld(t("sales_new.field.shipper"), txtWithList("shipper", d.shipper, t("sales_new.ph_shipper"), "shipper-history-list"))}
        ${fld(t("sales_new.field.shipper_address"), txt("shipper_address", d.shipper_address))}
        ${fld(t("sales_new.field.consignee"), txtWithList("consignee", d.consignee, t("sales_new.ph_consignee"), "consignee-history-list"))}
        ${fld(t("sales_new.field.consignee_address"), txt("consignee_address", d.consignee_address))}
        ${fld(t("sales_new.field.carrier"), txtWithList("carrier", d.carrier, t("sales_new.ph_carrier"), "carrier-history-list"))}
        ${cfld(t("sales_new.field.vessel_voyage"), `
          <div class="flex items-center gap-1.5">
            <input type="text" name="vessel" value="${d.vessel || ""}" placeholder="${t("sales_new.ph_vessel")}" list="vessel-history-list"
              class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs" />
            <input type="text" name="voyage" value="${d.voyage || ""}" placeholder="${t("sales_new.ph_voyage")}"
              class="w-24 border border-slate-200 rounded px-2 py-1 text-xs" />
          </div>
        `, `data-sea-only${seaHide}`)}
        ${cfld(t("sales_new.field.volume"), `
          <div class="flex items-center gap-1.5">
            <input type="number" name="container_qty" value="${d.container_qty || 1}" min="1" step="1" placeholder="${t("sales_new.ph_container_qty")}"
              class="w-16 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-center" />
            <select name="volume" class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs bg-white">
              <option value="">${t("sales_new.container_spec_placeholder")}</option>
              ${CONTAINER_TYPES.map((c) => `<option value="${c}"${(d.volume || "40HC") === c ? " selected" : ""}>${c}</option>`).join("")}
            </select>
          </div>
        `, `data-sea-only${seaHide}`)}
        ${fld(t("sales_new.field.contact"), txt("contact_person", d.contact_person))}
        ${fld(t("sales_new.field.etd"), dateInp("etd", d.etd))}
        ${fld(t("sales_new.field.eta"), dateInp("eta", d.eta))}
        ${fld(t("sales_new.field.pol"), txtWithList("pol", d.pol, "", "pol-history-list"))}
        ${fld(t("sales_new.field.pod"), txtWithList("pod", d.pod, "", "pod-history-list"))}
        ${fld(t("sales_new.field.roe_buy"), num("roe_buying", d.roe_buying))}
        ${fld(t("sales_new.field.roe_sell"), num("roe_selling", d.roe_selling))}
        ${fld(
    t("sales_new.field.currency"),
    selFld("currency", CURRENCY_OPTIONS, d.currency || DEFAULT_HEADER_CURRENCY)
  )}
        <div>
          <label class="block text-[10px] text-slate-500 mb-0.5">${t("sales_new.field.sales_rep")}</label>
          <div class="flex gap-1">
            ${repSel(reps, d.sales_rep, getCurrentUser())}
            <span id="doc-type-badge"
              class="hidden text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 self-center">
            </span>
          </div>
        </div>
        ${fld(t("sales_new.field.weight_actual"), num("weight_actual", d.weight_actual))}
        ${fld(t("sales_new.field.weight_uom"), weightUomSelect(weightUnits, d.weight_uom))}
        ${cfld(t("sales_new.field.dim_l"), num("dim_l_cm", d.dim_l_cm), `data-air-only${airHide}`)}
        ${cfld(t("sales_new.field.dim_w"), num("dim_w_cm", d.dim_w_cm), `data-air-only${airHide}`)}
        ${cfld(t("sales_new.field.dim_h"), num("dim_h_cm", d.dim_h_cm), `data-air-only${airHide}`)}
        ${fld(t("sales_new.field.pieces"), num("pieces", d.pieces))}
        ${fld(t("sales_new.field.qty_uom"), packageTypeSelect(d.package_type))}
        ${cfld(t("sales_new.field.uld_type"), txt("uld_type", d.uld_type), `data-air-only${airHide}`)}
        ${cfld(t("sales_new.field.flight_no"), txt("flight_no", d.flight_no), `data-air-only${airHide}`)}
        ${cfld(t("sales_new.field.origin_iata"), txt("origin_iata", d.origin_iata, "SGN"), `data-air-only${airHide}`)}
        ${cfld(t("sales_new.field.dest_iata"), txt("dest_iata", d.dest_iata, "HAN"), `data-air-only${airHide}`)}
        ${cfld(t("sales_new.field.chargeable_kg"), roNum("chargeable_kg", d.chargeable_kg), `data-air-only${airHide}`)}
      </div>
      ${renderHistoryDatalists(carriers, shipments)}
    </div>`;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new/doc-auto-detect.js
var FORWARDER_PREFIXES = ["HCMOE", "VDGFF", "NAUR", "PVNS"].sort((a, b) => b.length - a.length);
var MAWB_RE = /^\d{3}-\d{8}$/;
var SCAC_RE = /^[A-Z]{4}\d{6,9}$/;
function classifyDocument(input, mode) {
  const s = (input || "").trim().toUpperCase();
  if (!s) return { docType: null, confidence: "Low" };
  for (const prefix of FORWARDER_PREFIXES) {
    if (s.startsWith(prefix)) {
      return { docType: mode === "Air" ? "HAWB" : "HBL", confidence: "High" };
    }
  }
  if (MAWB_RE.test(s)) return { docType: "MAWB", confidence: "High" };
  if (SCAC_RE.test(s)) return { docType: "MBL", confidence: "Medium" };
  return { docType: null, confidence: "Low" };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-header-wiring.js
function _applyDirection(root) {
  const sel = root.querySelector("[name=direction], [name=direction_display]");
  if (!sel) return;
  const settled = directionFromProduct(root.querySelector("[name=product]")?.value || "");
  let mirror = root.querySelector("input[type=hidden][name=direction]");
  if (settled) {
    sel.value = settled;
    sel.disabled = true;
    sel.name = "direction_display";
    sel.classList.add("bg-slate-50");
    if (!mirror) {
      mirror = document.createElement("input");
      mirror.type = "hidden";
      mirror.name = "direction";
      sel.after(mirror);
    }
    mirror.value = settled;
  } else {
    mirror?.remove();
    sel.disabled = false;
    sel.name = "direction";
    sel.classList.remove("bg-slate-50");
  }
}
function _applyMode(root, mode) {
  const isAir = mode === "AIR";
  root.querySelectorAll("[data-sea-only]").forEach((el) => {
    el.classList.toggle("hidden", isAir);
  });
  root.querySelectorAll("[data-air-only]").forEach((el) => {
    el.classList.toggle("hidden", !isAir);
  });
}
var LB_TO_KG = 0.45359237;
function _toKg(value, uom) {
  return uom === "LB" ? value * LB_TO_KG : value;
}
function _updateChargeable(root) {
  const n = (name) => parseFloat(root.querySelector(`[name=${name}]`)?.value) || 0;
  const actualUom = root.querySelector("[name=weight_uom]")?.value;
  const actualKg = _toKg(n("weight_actual"), actualUom);
  const kg = computeChargeableKg(actualKg, n("dim_l_cm"), n("dim_w_cm"), n("dim_h_cm"));
  const el = root.querySelector("[name=chargeable_kg]");
  if (el) el.value = kg;
}
function wireHeaderSection(root, onChanged) {
  const mblEl = root.querySelector("[name=mbl]");
  const modeEl = root.querySelector("[name=mode]");
  const badge = root.querySelector("#doc-type-badge");
  root.querySelector("[name=product]")?.addEventListener("change", () => {
    _applyDirection(root);
    onChanged?.();
  });
  const updateBadge = () => {
    const res = classifyDocument(mblEl?.value || "");
    if (res.confidence !== "Low" && res.docType) {
      if (badge) {
        badge.textContent = res.docType;
        badge.classList.remove("hidden");
      }
    } else if (badge) {
      badge.classList.add("hidden");
    }
  };
  mblEl?.addEventListener("input", () => {
    updateBadge();
    onChanged?.();
  });
  mblEl?.addEventListener("paste", () => setTimeout(() => {
    updateBadge();
    onChanged?.();
  }, 0));
  modeEl?.addEventListener("change", () => {
    _applyMode(root, modeEl.value);
    onChanged?.();
  });
  const hblChk = root.querySelector("[name=has_hbl]");
  hblChk?.addEventListener("change", () => {
    const on = hblChk.checked, disp = root.querySelector("[name=hbl_do_display]");
    root.querySelectorAll("[data-hbl-do-row]").forEach((el) => el.classList.toggle("hidden", !on));
    if (disp) disp.value = on ? root.querySelector("[name=job_no]")?.value || "" : "";
  });
  const airFields = ["weight_actual", "dim_l_cm", "dim_w_cm", "dim_h_cm"];
  airFields.forEach((name) => {
    root.querySelector(`[name=${name}]`)?.addEventListener("input", () => {
      _updateChargeable(root);
      onChanged?.();
    });
  });
  root.querySelector("[name=weight_uom]")?.addEventListener("change", () => {
    _updateChargeable(root);
    onChanged?.();
  });
  root.querySelector("#sec-a-body")?.querySelectorAll("input,select").forEach((el) => {
    if (el !== mblEl && el !== modeEl && !airFields.includes(el.name) && el.name !== "weight_uom" && el.id !== "customer-search-input") {
      el.addEventListener("input", onChanged);
      el.addEventListener("change", onChanged);
    }
  });
  async function _autofillRep(customerName) {
    const sel = root.querySelector("select[name=sales_rep]");
    if (!sel || sel.value) return;
    try {
      const repo = window.__vdg_repo;
      const list = repo ? await repo.list("customers") : [];
      const rep = customerRepFor(customerName, list);
      if (rep && [...sel.options].some((o) => o.value === rep)) {
        sel.value = rep;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch {
    }
  }
  const custInput = root.querySelector("#customer-search-input");
  const custHidden = root.querySelector("[name=customer]");
  const custDropdown = root.querySelector("#customer-search-dropdown");
  let cIndex = null;
  const initCIndex = async () => {
    if (cIndex) return;
    const wasm4 = await loadWasm();
    if (!wasm4) return;
    cIndex = new wasm4.CustomerIndex();
    try {
      const repo = window.__vdg_repo;
      if (repo) {
        const list = await repo.list("customers");
        for (const c of list) {
          if (c.name) {
            cIndex.add_customer(JSON.stringify({ id: c.name, name: c.name }));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load customers into index", e);
    }
  };
  let searchTimeout = null;
  const renderDropdown = (results, query) => {
    custDropdown.innerHTML = "";
    if (results.length > 0) {
      results.forEach((r) => {
        const div = document.createElement("div");
        div.className = "px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-100";
        const scoreHtml = r.score !== void 0 ? `<span class="text-[9px] text-slate-400">${t("common.score_label")} ${r.score.toFixed(2)}</span>` : "";
        div.innerHTML = `<span class="font-medium">${r.name}</span>${scoreHtml}`;
        div.addEventListener("click", () => {
          custInput.value = r.name;
          custHidden.value = r.name;
          custDropdown.classList.add("hidden");
          _autofillRep(r.name);
          onChanged?.();
        });
        custDropdown.appendChild(div);
      });
    } else {
      custDropdown.innerHTML = `<div class="px-3 py-2 text-slate-400 italic">Kh\xF4ng t\xECm th\u1EA5y kh\xE1ch h\xE0ng.</div>`;
    }
    if (query) {
      const createBtn = document.createElement("div");
      createBtn.className = "px-3 py-2 bg-slate-50 hover:bg-slate-100 cursor-pointer text-blue-600 font-medium text-center sticky bottom-0 border-t border-slate-200";
      createBtn.textContent = '+ T\u1EA1o nhanh: "' + query + '"';
      createBtn.addEventListener("click", async () => {
        const repo = window.__vdg_repo;
        if (repo) {
          const id = `CUST-${slugify(query)}`;
          const newCust = { id, name: query, status: "Draft" };
          try {
            await repo.put("customers", id, newCust);
            custInput.value = query;
            custHidden.value = query;
            custDropdown.classList.add("hidden");
            if (cIndex) cIndex.add_customer(JSON.stringify({ id: query, name: query }));
            onChanged?.();
            window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { message: "\u0110\xE3 t\u1EA1o nhanh kh\xE1ch h\xE0ng", type: "success" } }));
          } catch (err) {
            console.error(err);
          }
        }
      });
      custDropdown.appendChild(createBtn);
    }
    custDropdown.classList.remove("hidden");
  };
  const doSearch = (query, isAutofillCheck = false) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      if (!query) {
        const repo = window.__vdg_repo;
        let results2 = [];
        if (repo) {
          try {
            const list = await repo.list("customers") || [];
            results2 = list.slice(0, 5).map((c) => ({ name: c.name }));
          } catch (e) {
            console.warn("Failed to list customers", e);
          }
        }
        renderDropdown(results2, query);
        return;
      }
      await initCIndex();
      let resultsJson = "[]";
      if (cIndex) {
        resultsJson = cIndex.search(query, 5);
      }
      const results = JSON.parse(resultsJson);
      if (isAutofillCheck) {
        const normalize = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        const exactMatch = results.find((r) => r.name.toLowerCase() === query.toLowerCase());
        const normalizedMatch = !exactMatch && results.length > 0 && normalize(results[0].name) === normalize(query);
        if (exactMatch || normalizedMatch) {
          const bestName = exactMatch ? exactMatch.name : results[0].name;
          custInput.value = bestName;
          custHidden.value = bestName;
          custInput.classList.remove("border-amber-400", "bg-amber-50");
          custDropdown.classList.add("hidden");
          onChanged?.();
          return;
        } else {
          custInput.classList.add("border-amber-400", "bg-amber-50");
        }
      } else {
        custInput.classList.remove("border-amber-400", "bg-amber-50");
      }
      renderDropdown(results, query);
    }, 100);
  };
  custInput?.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    custHidden.value = query;
    onChanged?.();
    doSearch(query);
  });
  custInput?.addEventListener("focus", (e) => {
    const query = e.target.value.trim();
    doSearch(query);
  });
  if (custInput?.hasAttribute("data-autofilled") && custInput.value.trim()) {
    doSearch(custInput.value.trim(), true);
  }
  document.addEventListener("click", (e) => {
    if (!custInput?.contains(e.target) && !custDropdown?.contains(e.target)) {
      custDropdown?.classList.add("hidden");
    }
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-lines.js
var KIND_LIST = ["OceanFreight", "Air", "Customs", "HandlingAgent", "THC", "BAF", "CAF", "EBS", "BankCharge", "FreightRevenue", "FreightCost", "Other"];
var POL_POD_OPTS = ["N/A", "POL", "POD"];
var INIT_ROWS = 3;
var CELL_CLS = "border border-slate-200 rounded px-1 py-0.5 text-xs";
var wasm2 = () => globalThis.window?.__vdg_wasm || globalThis.__vdg_wasm;
function classifyKind(desc) {
  const mod = wasm2();
  if (typeof mod?.classify_pnl_line_kind !== "function") {
    throw new Error("section-lines: wasm not ready \u2014 classify_pnl_line_kind missing");
  }
  return mod.classify_pnl_line_kind(desc || "");
}
function kindOpts(selected) {
  return KIND_LIST.map(
    (k) => `<option value="${k}"${k === selected ? " selected" : ""}>${t("kind." + k)}</option>`
  ).join("");
}
function polPodOpts(selected) {
  return POL_POD_OPTS.map(
    (o) => `<option value="${o}"${o === (selected || "N/A") ? " selected" : ""}>${o}</option>`
  ).join("");
}
function lineRowHtml(idx, line = {}, headerCurrency, bookCurrency) {
  const effectiveDesc = line.desc || line.description || "";
  const kindInList = line.kind ? KIND_LIST.includes(line.kind) : false;
  const effectiveKind = !kindInList && effectiveDesc ? classifyKind(effectiveDesc) : line.kind || "";
  return `
    <tr data-line="${idx}" class="border-t border-slate-100 hover:bg-slate-50/50">
      <td class="px-1 py-1 text-xs text-slate-400 text-center font-mono">${idx + 1}</td>
      <td class="col-loai px-1 py-1">
        <select name="kind" data-auto-kind="true" class="w-28 ${CELL_CLS}">
          <option value="">\u2014</option>${kindOpts(effectiveKind)}
        </select></td>
      <td class="col-description px-1 py-1">
        <input name="desc" value="${line.desc || ""}" placeholder="${t("sales_new.ph_description")}"
          class="w-36 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-blue-50/20">
        <input name="buy_qty" type="number" value="${line.buy_qty ?? ""}" placeholder="${t("sales_new.ph_qty")}"
          class="w-14 ${CELL_CLS} text-right" /></td>
      <td class="px-1 py-1 bg-blue-50/20">
        <input name="buy_unit" value="${line.buy_unit || ""}" placeholder="${t("sales_new.ph_unit")}"
          class="w-12 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-blue-50/20">
        <input name="buy_amt" type="number" value="${line.buy_amt ?? ""}" placeholder="\u2014"
          class="w-24 ${CELL_CLS} text-right font-mono" /></td>
      ${fxCellsHtml("buy", line, headerCurrency, bookCurrency)}
      ${vndCellHtml("buy", line, bookCurrency)}
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_qty" type="number" value="${line.sell_qty ?? ""}" placeholder="${t("sales_new.ph_qty")}"
          class="w-14 ${CELL_CLS} text-right" /></td>
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_unit" value="${line.sell_unit || ""}" placeholder="${t("sales_new.ph_unit")}"
          class="w-12 ${CELL_CLS}" /></td>
      <td class="px-1 py-1 bg-emerald-50/20">
        <input name="sell_amt" type="number" value="${line.sell_amt ?? ""}" placeholder="\u2014"
          class="w-24 ${CELL_CLS} text-right font-mono" /></td>
      ${fxCellsHtml("sell", line, headerCurrency, bookCurrency)}
      ${vndCellHtml("sell", line, bookCurrency)}
      <td class="px-1 py-1">
        <select name="pol_pod_side" class="w-16 ${CELL_CLS}">
          ${polPodOpts(line.pol_pod_side)}
        </select></td>
      <td class="px-1 py-1 text-center">
        <button type="button" data-remove="${idx}"
          class="text-red-400 hover:text-red-600 text-xs px-1">&#x2715;</button></td>
    </tr>`;
}
function sectionBHtml(draft = {}) {
  const lines = draft.lines || [];
  const headerCurrency = draft.currency || DEFAULT_HEADER_CURRENCY;
  const bookCurrency = draft.book_currency || DEFAULT_HEADER_CURRENCY;
  const padded = lines.length >= INIT_ROWS ? lines : [...lines, ...Array(INIT_ROWS - lines.length).fill({})];
  const rows = padded.map((l, i) => lineRowHtml(i, l, headerCurrency, bookCurrency)).join("");
  return `
    <div id="sec-b-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ${t("sales_new.section.lines")}
        </div>
        <button type="button" id="add-line-btn"
          class="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors">${t("sales_new.col_add_row")}</button>
      </div>

      <!-- Quick KPI Stats Bar -->
      <div class="grid grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">T\u1ED5ng Chi (VND)</div>
          <div id="quick-total-pay" class="text-sm font-semibold text-blue-700 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">T\u1ED5ng Thu (VND)</div>
          <div id="quick-total-collect" class="text-sm font-semibold text-emerald-700 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">L\u1EE3i Nhu\u1EADn G\u1ED9p (Margin)</div>
          <div id="quick-margin" class="text-sm font-semibold text-slate-900 mt-0.5">0</div>
        </div>
        <div class="bg-white p-2 rounded border border-slate-200">
          <div class="text-[10px] text-slate-500 font-medium">T\u1EF7 Su\u1EA5t L\u1EE3i Nhu\u1EADn (Margin %)</div>
          <div id="quick-margin-pct" class="text-sm font-semibold text-slate-900 mt-0.5">\u2014</div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-xs min-w-[1500px]" id="lines-table">
          <thead>
            <tr class="bg-slate-100/70 border-b border-slate-200">
              <th colspan="3" class="px-2 py-1 text-left text-slate-500 font-semibold uppercase tracking-wider text-[10px]">H\u1EA1ng m\u1EE5c</th>
              <th colspan="7" class="px-2 py-1 text-center bg-blue-100/50 text-blue-800 font-semibold uppercase tracking-wider text-[10px] border-x border-blue-200">Chi Ph\xED Mua (Chi)</th>
              <th colspan="7" class="px-2 py-1 text-center bg-emerald-100/50 text-emerald-800 font-semibold uppercase tracking-wider text-[10px] border-r border-emerald-200">Doanh Thu B\xE1n (Thu)</th>
              <th colspan="2" class="px-2 py-1 text-center text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Kh\xE1c</th>
            </tr>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-1 py-1.5 text-left text-slate-400 w-6">#</th>
              <th class="px-1 py-1.5 text-left text-slate-500">${t("sales_new.col_kind")}</th>
              <th class="px-1 py-1.5 text-left text-slate-500">${t("sales_new.col_description")}</th>
              <th class="px-1 py-1.5 text-right text-blue-700 bg-blue-50/30">${t("sales_new.col_buy_qty")}</th>
              <th class="px-1 py-1.5 text-left text-blue-700 bg-blue-50/30">${t("sales_new.col_unit")}</th>
              <th class="px-1 py-1.5 text-right text-blue-700 bg-blue-50/30">${t("sales_new.col_buy_amt")}</th>
              <th class="px-1 py-1.5 text-left text-blue-700 bg-blue-50/30">${t("sales_new.col_currency")}</th>
              <th class="px-1 py-1.5 text-right text-blue-700 bg-blue-50/30">${t("sales_new.col_fx_rate")}</th>
              <th class="px-1 py-1.5 text-left text-blue-700 bg-blue-50/30">${t("sales_new.col_fx_date")}</th>
              <th class="px-1 py-1.5 text-right text-blue-800 font-semibold bg-blue-100/40">${t("sales_new.col_vnd_pay")}</th>
              <th class="px-1 py-1.5 text-right text-emerald-700 bg-emerald-50/30">${t("sales_new.col_sell_qty")}</th>
              <th class="px-1 py-1.5 text-left text-emerald-700 bg-emerald-50/30">${t("sales_new.col_unit")}</th>
              <th class="px-1 py-1.5 text-right text-emerald-700 bg-emerald-50/30">${t("sales_new.col_sell_amt")}</th>
              <th class="px-1 py-1.5 text-left text-emerald-700 bg-emerald-50/30">${t("sales_new.col_currency")}</th>
              <th class="px-1 py-1.5 text-right text-emerald-700 bg-emerald-50/30">${t("sales_new.col_fx_rate")}</th>
              <th class="px-1 py-1.5 text-left text-emerald-700 bg-emerald-50/30">${t("sales_new.col_fx_date")}</th>
              <th class="px-1 py-1.5 text-right text-emerald-800 font-semibold bg-emerald-100/40">${t("sales_new.col_vnd_collect")}</th>
              <th class="px-1 py-1.5 text-left text-slate-500">${t("sales_new.col_pol_pod")}</th>
              <th class="px-1 py-1.5 w-6"></th>
            </tr>
          </thead>
          <tbody id="lines-tbody">${rows}</tbody>
        </table>
      </div>
    </div>`;
}
function collectLines(root) {
  const bookCurrency = root.querySelector("[name=book_currency]")?.value || DEFAULT_HEADER_CURRENCY;
  return Array.from(root.querySelectorAll("#lines-tbody tr[data-line]")).map((row) => {
    const buy_amt = parseFloat(row.querySelector("[name=buy_amt]")?.value) || 0;
    const buy_currency = row.querySelector("[name=buy_currency]")?.value || "";
    const buy_fx_rate = parseFloat(row.querySelector("[name=buy_fx_rate]")?.value) || 0;
    const sell_amt = parseFloat(row.querySelector("[name=sell_amt]")?.value) || 0;
    const sell_currency = row.querySelector("[name=sell_currency]")?.value || "";
    const sell_fx_rate = parseFloat(row.querySelector("[name=sell_fx_rate]")?.value) || 0;
    return {
      desc: row.querySelector("[name=desc]")?.value || "",
      kind: row.querySelector("[name=kind]")?.value || "",
      buy_qty: parseFloat(row.querySelector("[name=buy_qty]")?.value) || 0,
      buy_unit: row.querySelector("[name=buy_unit]")?.value || "",
      buy_amt,
      buy_currency,
      buy_fx_rate,
      buy_fx_date: row.querySelector("[name=buy_fx_date]")?.value || "",
      // AC-02: vnd_amount is DERIVED, not read off the (now-readonly) cell
      vnd_pay: computeLineVnd(buy_amt, buy_currency, buy_fx_rate, bookCurrency),
      sell_qty: parseFloat(row.querySelector("[name=sell_qty]")?.value) || 0,
      sell_unit: row.querySelector("[name=sell_unit]")?.value || "",
      sell_amt,
      sell_currency,
      sell_fx_rate,
      sell_fx_date: row.querySelector("[name=sell_fx_date]")?.value || "",
      vnd_collect: computeLineVnd(sell_amt, sell_currency, sell_fx_rate, bookCurrency),
      pol_pod_side: row.querySelector("[name=pol_pod_side]")?.value || "N/A"
    };
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-lines-wma.js
function ensureWmaStyle() {
  if (document.getElementById("wma-style")) return;
  const s = document.createElement("style");
  s.id = "wma-style";
  s.textContent = "@keyframes wma-pulse{0%,100%{opacity:1}50%{opacity:.6}}.wma-predicted{animation:wma-pulse .6s ease-in-out;}.wma-badge{cursor:pointer;font-size:10px;margin-left:3px;opacity:.8;vertical-align:middle;}.wma-badge:hover{opacity:1;}";
  document.head.appendChild(s);
}
function injectBadge(kindSel, state) {
  kindSel.parentElement?.querySelector(".wma-badge")?.remove();
  const span = document.createElement("span");
  span.className = "wma-badge";
  span.title = t("wma.badge_title").replace("{n}", state.total_observations);
  span.textContent = t("wma.badge_label");
  kindSel.insertAdjacentElement("afterend", span);
}
async function applyWmaToRow(row, repId, classifyKind2) {
  const rowIdx = parseInt(row.dataset.line, 10);
  const store = window.__vdg_store;
  if (!store || !repId) return;
  const kindSel = row.querySelector("[name=kind]");
  if (!kindSel || kindSel.dataset.manuallySet === "true" || kindSel.value) return;
  const desc = row.querySelector("[name=desc]")?.value || "";
  const state = await loadKindWmaState(store, repId, rowIdx);
  const top = predict(state, desc, classifyKind2);
  if (!top) return;
  kindSel.value = top;
  kindSel.classList.add("wma-predicted");
  row.dataset.wmaPredicted = top;
  injectBadge(kindSel, state);
  const sorted = Object.entries(state.kind_weights).sort((a, b) => b[1] - a[1]);
  const topW = (sorted[0]?.[1] ?? 0).toFixed(2);
  const secW = (sorted[1]?.[1] ?? 0).toFixed(2);
  console.log(`[wma] row${rowIdx} \u2192 ${top} (w=${topW} vs 2nd=${secW})`);
}
async function applyWmaToAllRows(tbody, repId, classifyKind2) {
  for (const row of Array.from(tbody.querySelectorAll("tr[data-line]"))) {
    await applyWmaToRow(row, repId, classifyKind2);
  }
}
async function dismissWmaBadge(badge, repId) {
  const row = badge.closest("tr[data-line]");
  if (!row || !repId) return false;
  const rowIdx = parseInt(row.dataset.line, 10);
  const predictedKind = row.dataset.wmaPredicted;
  const kindSel = row.querySelector("[name=kind]");
  if (kindSel) {
    kindSel.value = "";
    kindSel.classList.remove("wma-predicted");
  }
  badge.remove();
  delete row.dataset.wmaPredicted;
  if (predictedKind) {
    const store = window.__vdg_store;
    if (store) {
      const state = await loadKindWmaState(store, repId, rowIdx);
      dismissPrediction(state, predictedKind);
      await saveKindWmaState(store, repId, rowIdx, state);
    }
  }
  return true;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-lines-wiring.js
function applyKindChange(descInput, newKind) {
  if (!descInput) return;
  if (descInput.dataset.userEdited === "true") return;
  if (!newKind || newKind === "\u2014") {
    descInput.value = "";
    return;
  }
  descInput.value = kindI18nLabel(newKind, currentLocale());
}
function onKindChange(rowEl, newKind) {
  applyKindChange(rowEl.querySelector(".col-description input"), newKind);
}
function _prefillRow(row, fxRepo, onChanged) {
  if (!row || !fxRepo) return;
  Promise.all([prefillRowFx(row, "buy", fxRepo), prefillRowFx(row, "sell", fxRepo)]).then(() => onChanged?.());
}
function wireLinesSection(root, onChanged, repId, fxRepo, docDate) {
  const tbody = root.querySelector("#lines-tbody");
  if (!tbody) return;
  ensureWmaStyle();
  wireLineFx(tbody, fxRepo, docDate);
  tbody.querySelectorAll("tr[data-line]").forEach((r) => _prefillRow(r, fxRepo, onChanged));
  if (repId) {
    applyWmaToAllRows(tbody, repId, classifyKind).catch((err) => {
      console.warn("[wma] mount predict failed:", err.message);
    });
  }
  root.querySelector("#add-line-btn")?.addEventListener("click", () => {
    const idx = tbody.querySelectorAll("tr[data-line]").length;
    const headerCurrency = root.querySelector("[name=currency]")?.value || "";
    const bookCurrency = root.querySelector("[name=book_currency]")?.value || "";
    const tmp = document.createElement("tbody");
    tmp.innerHTML = lineRowHtml(idx, {}, headerCurrency, bookCurrency);
    const newRow = tmp.firstElementChild;
    tbody.appendChild(newRow);
    applyFxDateDefaults(newRow, docDate);
    _prefillRow(newRow, fxRepo, onChanged);
    if (repId) {
      applyWmaToRow(newRow, repId, classifyKind).catch((err) => {
        console.warn("[wma] new row predict failed:", err.message);
      });
    }
    onChanged?.();
  });
  tbody.addEventListener("input", (e) => {
    if (e.target.name === "desc" && e.isTrusted) {
      e.target.dataset.userEdited = "true";
    }
    const row = e.target.closest("tr[data-line]");
    if (row && e.isTrusted) {
      if (e.target.name === "buy_qty") {
        const sellQty = row.querySelector("[name=sell_qty]");
        if (sellQty && (!sellQty.value || sellQty.dataset.autoSynced === "true")) {
          sellQty.value = e.target.value;
          sellQty.dataset.autoSynced = "true";
        }
      } else if (e.target.name === "buy_unit") {
        const sellUnit = row.querySelector("[name=sell_unit]");
        if (sellUnit && (!sellUnit.value || sellUnit.dataset.autoSynced === "true")) {
          sellUnit.value = e.target.value;
          sellUnit.dataset.autoSynced = "true";
        }
      } else if (e.target.name === "sell_qty" || e.target.name === "sell_unit") {
        delete e.target.dataset.autoSynced;
      }
    }
    onChanged?.();
  });
  tbody.addEventListener("change", (e) => {
    if (e.target.name === "kind") {
      e.target.dataset.manuallySet = "true";
      onKindChange(e.target.closest("tr[data-line]"), e.target.value);
    }
    onChanged?.();
  });
  tbody.addEventListener("focusout", (e) => {
    if (e.target.name !== "desc") return;
    const row = e.target.closest("tr[data-line]");
    if (!row) return;
    const kindSel = row.querySelector("[name=kind]");
    if (!kindSel || kindSel.dataset.manuallySet === "true") return;
    kindSel.value = classifyKind(e.target.value);
    onChanged?.();
  });
  tbody.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    const rows = tbody.querySelectorAll("tr[data-line]");
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;
    const inputs = lastRow.querySelectorAll("input,select");
    if (e.target !== inputs[inputs.length - 1]) return;
    e.preventDefault();
    const newIdx = rows.length;
    const headerCurrency = root.querySelector("[name=currency]")?.value || "";
    const bookCurrency = root.querySelector("[name=book_currency]")?.value || "";
    const tmp = document.createElement("tbody");
    tmp.innerHTML = lineRowHtml(newIdx, {}, headerCurrency, bookCurrency);
    const newRow = tmp.firstElementChild;
    tbody.appendChild(newRow);
    applyFxDateDefaults(newRow, docDate);
    _prefillRow(newRow, fxRepo, onChanged);
    newRow.querySelector("input,select")?.focus();
    if (repId) {
      applyWmaToRow(newRow, repId, classifyKind).catch((err) => {
        console.warn("[wma] tab row predict failed:", err.message);
      });
    }
    onChanged?.();
  });
  tbody.addEventListener("click", async (e) => {
    const badge = e.target.closest(".wma-badge");
    if (badge) {
      if (await dismissWmaBadge(badge, repId)) onChanged?.();
      return;
    }
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    btn.closest("tr[data-line]")?.remove();
    onChanged?.();
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-commission-fx.js
var VND_CURRENCY = "VND";
var INPUT_CLS = "w-full border border-slate-200 rounded px-1 py-0.5 text-xs";
var RDONLY_CLS = `${INPUT_CLS} bg-slate-50`;
function commFxCellsHtml(row = {}, headerCurrency, bookCurrency) {
  const currency = row.currency || headerCurrency || bookCurrency || VND_CURRENCY;
  const { rate, locked } = lockFxIfVnd(currency, bookCurrency);
  const rateVal = locked ? rate : row.fx_rate ?? "";
  const rateCls = locked ? RDONLY_CLS : INPUT_CLS;
  return `
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.currency")}</span>
              ${currencySelectHtml("comm_currency", currency, `${INPUT_CLS} text-center uppercase`)}
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.fx")}</span>
              <input name="comm_fx_rate" type="number" step="any" value="${rateVal}"${locked ? " readonly" : ""}
                class="${rateCls} text-right" />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.fx_date")}</span>
              <input name="comm_fx_date" type="date" value="${row.fx_date || ""}" lang="${currentLocale()}"
                class="${INPUT_CLS}" />
            </label>`;
}
function _recompute(panel) {
  panel?.dispatchEvent(new Event("input", { bubbles: true }));
}
function applyCommFxDateDefaults(tbody, docDate) {
  if (!tbody || !docDate) return;
  tbody.querySelectorAll("[data-comm-panel]").forEach((panel) => {
    const el = panel.querySelector("[name=comm_fx_date]");
    if (el && !el.value) el.value = docDate;
  });
}
async function prefillPanelFx(panel, fxRepo, { overwrite = false } = {}) {
  if (!panel) return;
  const currencyEl = panel.querySelector("[name=comm_currency]");
  const rateEl = panel.querySelector("[name=comm_fx_rate]");
  const dateEl = panel.querySelector("[name=comm_fx_date]");
  if (!fxRepo || !currencyEl || currencyEl.value === VND_CURRENCY) return;
  if (rateEl?.dataset.manuallySet === "true") return;
  if (!overwrite && rateEl?.value !== "") return;
  const fetched = await prefillFxRate(fxRepo, currencyEl.value, dateEl?.value);
  if (fetched != null && rateEl && rateEl.dataset.manuallySet !== "true") {
    rateEl.value = fetched;
    _recompute(panel);
  }
}
async function _onCurrencyChange(panel, fxRepo) {
  if (!panel) return;
  const currencyEl = panel.querySelector("[name=comm_currency]");
  const rateEl = panel.querySelector("[name=comm_fx_rate]");
  const { rate, locked } = lockFxIfVnd(currencyEl?.value, bookCurrencyOf(panel));
  if (rateEl) {
    rateEl.readOnly = locked;
    rateEl.classList.toggle("bg-slate-50", locked);
    if (locked) {
      rateEl.value = rate;
      delete rateEl.dataset.manuallySet;
    }
  }
  _recompute(panel);
  if (!locked) await prefillPanelFx(panel, fxRepo, { overwrite: true });
}
async function _onFxDateChange(panel, fxRepo) {
  await prefillPanelFx(panel, fxRepo, { overwrite: true });
}
function wireCommissionFx(tbody, fxRepo, docDate) {
  if (!tbody) return;
  applyCommFxDateDefaults(tbody, docDate);
  mountDateHints(tbody);
  tbody.querySelectorAll("[data-comm-panel]").forEach((panel) => prefillPanelFx(panel, fxRepo));
  tbody.addEventListener("change", (e) => {
    const panel = e.target.closest("[data-comm-panel]");
    if (!panel) return;
    if (e.target.name === "comm_currency") {
      _onCurrencyChange(panel, fxRepo);
      return;
    }
    if (e.target.name === "comm_fx_date") {
      _onFxDateChange(panel, fxRepo);
    }
  });
  tbody.addEventListener("input", (e) => {
    if (e.target.name === "comm_fx_rate" && e.isTrusted) {
      e.target.dataset.manuallySet = "true";
    }
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-commission.js
var PARENT_COLSPAN = 7;
var INPUT_CLS2 = "w-full border border-slate-200 rounded px-1 py-0.5 text-xs";
var RDONLY_CLS2 = `${INPUT_CLS2} bg-slate-50`;
var EM_DASH = "\u2014";
var KIND_OPTIONS = ["CustomerRebate", "LineCommission"];
function commParentRowHtml(idx, row = {}) {
  const kind = row.kind || "";
  const desc = row.description || "";
  const rawFx = row.amount_fx != null ? row.amount_fx : 0;
  const rawFxR = row.fx_rate != null ? row.fx_rate : 0;
  const gross = rawFx && rawFxR ? rawFx * rawFxR : null;
  const net = row.net_after_tax != null && gross !== null ? row.net_after_tax : null;
  const grossFmt = gross !== null ? gross.toLocaleString("vi-VN") : EM_DASH;
  const netFmt = net !== null ? net.toLocaleString("vi-VN") : EM_DASH;
  return `
    <tr data-comm-row="${idx}" data-expanded="false"
        class="border-t border-slate-100 cursor-pointer hover:bg-slate-50">
      <td class="px-2 py-1.5 text-xs text-slate-400 text-center">${idx + 1}</td>
      <td class="px-2 py-1.5 min-w-[110px]">
        <select name="comm_kind" class="${INPUT_CLS2}">
          ${KIND_OPTIONS.map((k) => {
    const label = t(`commission.kind.${k}`);
    const sel = k === kind ? " selected" : "";
    return `<option value="${k}"${sel}>${label}</option>`;
  }).join("")}
        </select>
      </td>
      <td class="px-2 py-1.5 min-w-[120px]">
        <input name="comm_desc" type="text"
          value="${desc}"
          placeholder="${t("sales.section_c.col_description_ph")}"
          class="${INPUT_CLS2}" />
      </td>
      <td class="px-2 py-1.5 text-xs text-right font-medium text-slate-700 whitespace-nowrap"
          data-gross-display>${grossFmt}</td>
      <td class="px-2 py-1.5 text-xs text-right font-medium text-emerald-700 whitespace-nowrap"
          data-net-display>${netFmt}</td>
      <td class="px-2 py-1 text-center w-7">
        <button type="button" data-toggle-comm="${idx}"
          aria-label="${t("sales.section_c.detail_toggle")}"
          class="text-slate-400 hover:text-slate-600 select-none">&#9656;</button>
      </td>
      <td class="px-2 py-1 text-center w-7">
        <button type="button" data-remove-comm="${idx}"
          title="${t("commission.delete_row")}"
          class="text-red-400 hover:text-red-600 text-sm leading-none">&#x2715;</button>
      </td>
    </tr>`;
}
function commDetailPanelHtml(idx, row = {}, headerCurrency, bookCurrency) {
  const amountFx = row.amount_fx != null ? row.amount_fx : "";
  const bankFee = row.bank_fee != null ? row.bank_fee : "";
  const tncnPct = row.tncn_pct != null ? row.tncn_pct : window.__vdg_wasm.commission_default_personal_tax_pct();
  const tncnAmount = row.tncn_amount != null ? row.tncn_amount : "";
  const netVnd = row.net_after_tax != null ? row.net_after_tax : "";
  const isManual = row.tncn_manual || false;
  return `
    <tr data-comm-panel="${idx}" aria-hidden="true" class="hidden">
      <td colspan="${PARENT_COLSPAN}" class="px-3 pb-2">
        <div class="comm-panel rounded border border-slate-200 bg-slate-50 p-3">
          <div class="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.amount")}</span>
              <input name="comm_amount_fx" type="number" step="any"
                value="${amountFx}" placeholder="0"
                class="${INPUT_CLS2} text-right" />
            </label>
            ${commFxCellsHtml(row, headerCurrency, bookCurrency)}
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.bank_fee")}</span>
              <input name="comm_bank_fee" type="number" step="any"
                value="${bankFee}" placeholder="0"
                class="${INPUT_CLS2} text-right" />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.tncn_pct")}</span>
              <input name="comm_tncn_pct" type="number" step="any" min="0" max="100"
                value="${tncnPct}"
                class="${INPUT_CLS2} text-right" />
            </label>
            <label class="flex flex-col gap-0.5">
              <span class="text-slate-500">${t("commission.col.tncn_vnd")}</span>
              <input name="comm_tncn_vnd" type="number" step="any"
                value="${tncnAmount}" placeholder="0"
                ${isManual ? "" : "readonly"}
                data-tncn-manual="${isManual}"
                class="${isManual ? INPUT_CLS2 : RDONLY_CLS2} text-right" />
            </label>
          </div>
          <input name="comm_net_vnd" type="hidden" value="${netVnd}" />
          <div class="mt-3 pt-2 border-t border-slate-200">
            <div class="font-mono tabular-nums text-xs">
              <div class="flex justify-end items-center gap-3 py-0.5">
                <span class="text-slate-600 font-medium">${t("sales.section_c.breakdown_tong_chi")}:</span>
                <span class="w-28 text-right font-semibold text-slate-700" data-bd-gross>${EM_DASH}</span>
              </div>
              <div class="flex justify-end items-center gap-3 py-0.5 text-slate-400">
                <span>&#x2500; ${t("sales.section_c.breakdown_phi_nh")}:</span>
                <span class="w-28 text-right" data-bd-bank>${EM_DASH}</span>
              </div>
              <div class="flex justify-end items-center gap-3 py-0.5 text-slate-400">
                <span>&#x2500; ${t("sales.section_c.breakdown_tncn_nn")}:</span>
                <span class="w-28 text-right" data-bd-tncn>${EM_DASH}</span>
              </div>
              <div class="flex justify-end items-center gap-3 pt-1 border-t border-slate-300">
                <span class="text-emerald-700 font-semibold">${t("sales.section_c.breakdown_thuc_nhan")}:</span>
                <span class="w-28 text-right font-bold text-emerald-700" data-bd-net>${EM_DASH}</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>`;
}
function commEntryHtml(idx, row = {}, headerCurrency, bookCurrency) {
  return commParentRowHtml(idx, row) + commDetailPanelHtml(idx, row, headerCurrency, bookCurrency);
}
function sectionCHtml(draft = {}) {
  const headerCurrency = draft.currency || "";
  const bookCurrency = draft.book_currency || "";
  const rows = (draft.commission_lines || []).map((r, i) => commEntryHtml(i, r, headerCurrency, bookCurrency)).join("");
  return `
    <div id="sec-c-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ${t("sales_new.section.commission")}
        </div>
        <button type="button" id="add-comm-btn"
          class="text-xs text-blue-600 hover:text-blue-700">
          ${t("commission.add_row")}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs" id="commission-table">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-2 py-1.5 text-center text-slate-400 font-medium w-8">#</th>
              <th class="px-2 py-1.5 text-left text-slate-500 font-medium">
                ${t("commission.col.type")}</th>
              <th class="px-2 py-1.5 text-left text-slate-500 font-medium">
                ${t("sales.section_c.col_description")}</th>
              <th class="px-2 py-1.5 text-right text-slate-700 font-semibold">
                ${t("sales.section_c.col_tong_chi")}</th>
              <th class="px-2 py-1.5 text-right text-emerald-700 font-semibold">
                ${t("sales.section_c.col_thuc_nhan")}</th>
              <th class="px-2 py-1.5 w-8"></th>
              <th class="px-2 py-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody id="commission-tbody">${rows}</tbody>
        </table>
      </div>
    </div>`;
}
function computeCommission({ amountFx, fxRate, bankFee, tncnPct, tncnManual, tncnAmtManual, currency, bookCurrency }) {
  const grossVnd = currency === bookCurrency ? amountFx : amountFx * fxRate;
  const tncnAmt = tncnManual ? tncnAmtManual : window.__vdg_wasm.commission_personal_tax(grossVnd, tncnPct);
  return { grossVnd, tncnAmt, netVnd: window.__vdg_wasm.commission_net_after_tax(grossVnd, bankFee, tncnAmt) };
}
function recomputeEntry(panelEl) {
  const idx = panelEl.dataset.commPanel;
  const amountFx = parseFloat(panelEl.querySelector("[name=comm_amount_fx]")?.value) || 0;
  const currency = panelEl.querySelector("[name=comm_currency]")?.value || "";
  const fxRate = parseFloat(panelEl.querySelector("[name=comm_fx_rate]")?.value) || 0;
  const bankFee = parseFloat(panelEl.querySelector("[name=comm_bank_fee]")?.value) || 0;
  const tncnPct = parseFloat(panelEl.querySelector("[name=comm_tncn_pct]")?.value) || 0;
  const tncnEl = panelEl.querySelector("[name=comm_tncn_vnd]");
  const isManual = tncnEl?.dataset.tncnManual === "true";
  const { grossVnd, tncnAmt, netVnd } = computeCommission({
    amountFx,
    fxRate,
    bankFee,
    tncnPct,
    currency,
    bookCurrency: bookCurrencyOf(panelEl),
    tncnManual: isManual,
    tncnAmtManual: parseFloat(tncnEl?.value) || 0
  });
  if (!isManual && tncnEl) tncnEl.value = grossVnd ? tncnAmt : "";
  const netHidden = panelEl.querySelector("[name=comm_net_vnd]");
  if (netHidden) netHidden.value = grossVnd ? netVnd : "";
  const has = grossVnd !== 0;
  const fmt = (n) => n.toLocaleString("vi-VN");
  const qs = (s) => panelEl.querySelector(s);
  if (qs("[data-bd-gross]")) qs("[data-bd-gross]").textContent = has ? fmt(grossVnd) : EM_DASH;
  if (qs("[data-bd-bank]")) qs("[data-bd-bank]").textContent = has ? fmt(bankFee) : EM_DASH;
  if (qs("[data-bd-tncn]")) qs("[data-bd-tncn]").textContent = has ? fmt(tncnAmt) : EM_DASH;
  if (qs("[data-bd-net]")) qs("[data-bd-net]").textContent = has ? fmt(netVnd) : EM_DASH;
  const tbody = panelEl.closest("tbody");
  const parent = tbody?.querySelector(`[data-comm-row="${idx}"]`);
  if (parent?.querySelector("[data-gross-display]")) {
    parent.querySelector("[data-gross-display]").textContent = has ? fmt(grossVnd) : EM_DASH;
  }
  if (parent?.querySelector("[data-net-display]")) {
    parent.querySelector("[data-net-display]").textContent = has ? fmt(netVnd) : EM_DASH;
  }
}
function toggleEntry(tbody, idx, expand) {
  const parent = tbody.querySelector(`[data-comm-row="${idx}"]`);
  const panelRow = tbody.querySelector(`[data-comm-panel="${idx}"]`);
  if (!parent || !panelRow) return;
  parent.setAttribute("data-expanded", String(expand));
  panelRow.classList.toggle("hidden", !expand);
  panelRow.setAttribute("aria-hidden", String(!expand));
  const btn = parent.querySelector("[data-toggle-comm]");
  if (btn) btn.style.transform = expand ? "rotate(90deg)" : "";
}
function wireCommissionSection(root, onChanged, fxRepo, docDate) {
  const tbody = root.querySelector("#commission-tbody");
  if (!tbody) return;
  wireCommissionFx(tbody, fxRepo, docDate);
  root.querySelector("#add-comm-btn")?.addEventListener("click", () => {
    const idx = tbody.querySelectorAll("[data-comm-row]").length;
    const headerCurrency = root.querySelector("[name=currency]")?.value || "";
    const bookCurrency = root.querySelector("[name=book_currency]")?.value || "";
    const tmp = document.createElement("tbody");
    tmp.innerHTML = commEntryHtml(idx, {}, headerCurrency, bookCurrency);
    while (tmp.firstElementChild) tbody.appendChild(tmp.firstElementChild);
    applyCommFxDateDefaults(tbody, docDate);
    prefillPanelFx(tbody.querySelector(`[data-comm-panel="${idx}"]`), fxRepo).then(() => onChanged?.());
    toggleEntry(tbody, idx, true);
    onChanged?.();
  });
  tbody.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("[data-toggle-comm]");
    if (toggleBtn) {
      const idx = toggleBtn.dataset.toggleComm;
      const parent = tbody.querySelector(`[data-comm-row="${idx}"]`);
      const expanded = parent?.dataset.expanded === "true";
      toggleEntry(tbody, idx, !expanded);
      return;
    }
    const removeBtn = e.target.closest("[data-remove-comm]");
    if (removeBtn) {
      const idx = removeBtn.dataset.removeComm;
      tbody.querySelector(`[data-comm-row="${idx}"]`)?.remove();
      tbody.querySelector(`[data-comm-panel="${idx}"]`)?.remove();
      onChanged?.();
      return;
    }
    const parentRow = e.target.closest("[data-comm-row]");
    if (parentRow && !e.target.closest("input") && !e.target.closest("select") && !e.target.closest("button")) {
      const idx = parentRow.dataset.commRow;
      const expanded = parentRow.dataset.expanded === "true";
      toggleEntry(tbody, idx, !expanded);
    }
  });
  tbody.addEventListener("input", (e) => {
    const panel = e.target.closest("[data-comm-panel]");
    if (panel) {
      if (e.target.name === "comm_tncn_vnd") {
        e.target.dataset.tncnManual = "true";
      }
      recomputeEntry(panel);
    }
    onChanged?.();
  });
  tbody.addEventListener("change", (e) => {
    if (e.target.name === "comm_tncn_pct") {
      const panel2 = e.target.closest("[data-comm-panel]");
      const tncnEl = panel2?.querySelector("[name=comm_tncn_vnd]");
      if (tncnEl) {
        tncnEl.dataset.tncnManual = "false";
        tncnEl.setAttribute("readonly", "");
        tncnEl.className = `${RDONLY_CLS2} text-right`;
      }
    }
    const panel = e.target.closest("[data-comm-panel]");
    if (panel) recomputeEntry(panel);
    onChanged?.();
  });
  tbody.querySelectorAll("[data-comm-panel]").forEach(recomputeEntry);
}
function collectCommission(root) {
  const bookCurrency = root.querySelector("[name=book_currency]")?.value || "";
  return Array.from(root.querySelectorAll("#commission-tbody [data-comm-panel]")).map((panel) => {
    const idx = panel.dataset.commPanel;
    const tbody = panel.closest("tbody");
    const parent = tbody?.querySelector(`[data-comm-row="${idx}"]`);
    const tncnEl = panel.querySelector("[name=comm_tncn_vnd]");
    return {
      kind: parent?.querySelector("[name=comm_kind]")?.value || "",
      description: parent?.querySelector("[name=comm_desc]")?.value || "",
      amount_fx: parseFloat(panel.querySelector("[name=comm_amount_fx]")?.value) || 0,
      currency: panel.querySelector("[name=comm_currency]")?.value || "",
      book_currency: bookCurrency,
      fx_rate: parseFloat(panel.querySelector("[name=comm_fx_rate]")?.value) || 0,
      fx_date: panel.querySelector("[name=comm_fx_date]")?.value || "",
      bank_fee: parseFloat(panel.querySelector("[name=comm_bank_fee]")?.value) || 0,
      tncn_pct: parseFloat(panel.querySelector("[name=comm_tncn_pct]")?.value) || 0,
      tncn_amount: parseFloat(tncnEl?.value) || 0,
      net_after_tax: parseFloat(panel.querySelector("[name=comm_net_vnd]")?.value) || 0,
      tncn_manual: tncnEl?.dataset.tncnManual === "true"
    };
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-waterfall.js
function fmtVnd(n) {
  if (n == null) return "\u2014";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
}
function wfRow(id, label, value) {
  return `
    <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
      <span class="text-[10px] text-slate-500">${label}</span>
      <span id="${id}" class="text-sm font-semibold text-slate-900">${fmtVnd(value)}</span>
    </div>`;
}
function sectionDHtml(draft = {}, opts = {}) {
  const o = draft.sales_share_pct_override;
  const isManager = opts.isManager ?? false;
  const ruleLabel = draft._rule_label ? `(${draft._rule_label})` : "";
  return `
    <div id="sec-d-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          ${t("sales_new.section.waterfall")}
        </div>
        <button type="button" id="polpod-toggle"
          class="text-xs text-slate-500 hover:text-slate-700">
          ${t("sales_new.waterfall.polpod_toggle")} &#9658;
        </button>
      </div>
      <div id="polpod-breakdown" class="hidden mb-3 p-2 bg-slate-50 rounded text-xs text-slate-600 grid grid-cols-2 gap-1">
        <div>${t("sales_new.waterfall.sum_receipt")} POL: <span id="wf-pol-receipt">\u2014</span></div>
        <div>${t("sales_new.waterfall.sum_receipt")} POD: <span id="wf-pod-receipt">\u2014</span></div>
        <div>${t("sales_new.waterfall.sum_payment")} POL: <span id="wf-pol-payment">\u2014</span></div>
        <div>${t("sales_new.waterfall.sum_payment")} POD: <span id="wf-pod-payment">\u2014</span></div>
      </div>
      ${wfRow("wf-sum-receipt", t("sales_new.waterfall.sum_receipt"), null)}
      ${wfRow("wf-sum-payment", t("sales_new.waterfall.sum_payment"), null)}
      <div id="wf-margin-row"
        class="flex items-center justify-between py-1.5 border-b border-slate-100">
        <span class="text-[10px] text-slate-500">
          ${t("sales_new.waterfall.margin")}
          <span id="margin-loss-badge"
            class="hidden ml-1 px-1 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white">
            ${t("sales_new.waterfall.loss_badge")}
          </span>
        </span>
        <span id="wf-margin" class="text-sm font-semibold text-slate-900">\u2014</span>
      </div>
      ${wfRow("wf-tax20", t("sales_new.waterfall.tax20"), null)}
      ${wfRow("wf-gp", t("sales_new.waterfall.gp"), null)}
      <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
        <span class="text-[10px] text-slate-500">
          ${t("sales_new.waterfall.sales_share")}
          ${ruleLabel ? `<span class="ml-1 text-blue-500">${ruleLabel}</span>` : ""}
        </span>
        ${isManager ? `<input type="number" name="sales_share_pct_override" step="any" min="0" max="100"
              value="${o != null ? o : ""}" placeholder="\u2014"
              class="w-20 border border-slate-200 rounded px-2 py-1 text-xs text-right" />` : `<span class="text-xs font-medium text-slate-700" id="wf-sales-pct">
               ${o != null ? o + "%" : "\u2014"}
             </span>
             <input type="hidden" name="sales_share_pct_override" value="${o != null ? o : ""}" />`}
      </div>
      ${wfRow("wf-final-profit", t("sales_new.waterfall.final_profit"), null)}
    </div>`;
}
function wireWaterfallSection(root, onWaterfallChanged) {
  root.querySelector("#polpod-toggle")?.addEventListener("click", () => {
    const bd = root.querySelector("#polpod-breakdown");
    const btn = root.querySelector("#polpod-toggle");
    if (!bd) return;
    const hidden = bd.classList.toggle("hidden");
    if (btn) {
      btn.innerHTML = t("sales_new.waterfall.polpod_toggle") + (hidden ? " &#9658;" : " &#9660;");
    }
  });
  root.querySelector("[name=sales_share_pct_override]")?.addEventListener("input", () => {
    onWaterfallChanged?.();
  });
}
function renderWaterfall(root, result) {
  const {
    sumReceipt = 0,
    sumPayment = 0,
    margin = 0,
    tax20 = 0,
    gp = 0,
    finalProfit = 0,
    polReceiptSum = 0,
    podReceiptSum = 0,
    polPaymentSum = 0,
    podPaymentSum = 0
  } = result;
  const setTxt = (id, val) => {
    const el = root.querySelector(`#${id}`);
    if (el) el.textContent = fmtVnd(val);
  };
  setTxt("wf-sum-receipt", sumReceipt);
  setTxt("wf-sum-payment", sumPayment);
  setTxt("wf-tax20", tax20);
  setTxt("wf-gp", gp);
  setTxt("wf-final-profit", finalProfit);
  setTxt("wf-pol-receipt", polReceiptSum);
  setTxt("wf-pod-receipt", podReceiptSum);
  setTxt("wf-pol-payment", polPaymentSum);
  setTxt("wf-pod-payment", podPaymentSum);
  const marginEl = root.querySelector("#wf-margin");
  const marginRow = root.querySelector("#wf-margin-row");
  const lossBadge = root.querySelector("#margin-loss-badge");
  if (marginEl) marginEl.textContent = fmtVnd(margin);
  if (margin < 0) {
    marginEl?.classList.add("text-red-600");
    marginEl?.classList.remove("text-slate-900");
    marginRow?.classList.add("bg-red-50", "border-red-200");
    lossBadge?.classList.remove("hidden");
  } else {
    marginEl?.classList.remove("text-red-600");
    marginEl?.classList.add("text-slate-900");
    marginRow?.classList.remove("bg-red-50", "border-red-200");
    lossBadge?.classList.add("hidden");
  }
}
function collectWaterfallOverrides(root) {
  const raw = root.querySelector("[name=sales_share_pct_override]")?.value;
  const parsed = raw !== "" && raw != null ? parseFloat(raw) : null;
  return { sales_share_pct_override: parsed !== null && !isNaN(parsed) ? parsed : null };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-containers-table.js
function escHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function containerRowHtml(idx, cont = {}) {
  const specOpts = CONTAINER_TYPES.map(
    (c) => `<option value="${c}"${(cont.spec || "40HC") === c ? " selected" : ""}>${c}</option>`
  ).join("");
  return `
    <tr data-cont-row="${idx}" class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td class="py-1 px-1.5 text-center text-slate-400 font-mono text-[10px]">${idx + 1}</td>
      <td class="py-1 px-1.5">
        <input type="text" name="cont_no_${idx}" data-cont-field="container_no" value="${escHtml(cont.container_no || "")}"
          placeholder="${t("sales_new.containers.ph_no")}"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono uppercase focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <select name="cont_spec_${idx}" data-cont-field="spec" class="w-full border border-slate-200 rounded px-1 py-0.5 text-xs bg-white focus:ring-1 focus:ring-blue-400 outline-none">
          ${specOpts}
        </select>
      </td>
      <td class="py-1 px-1.5">
        <input type="text" name="cont_seal_${idx}" data-cont-field="seal_no" value="${escHtml(cont.seal_no || "")}"
          placeholder="${t("sales_new.containers.ph_seal")}"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cont_gw_${idx}" data-cont-field="weight_kg" value="${cont.weight_kg ?? ""}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cont_cbm_${idx}" data-cont-field="cbm" value="${cont.cbm ?? ""}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5 text-center">
        <button type="button" data-rm-cont="${idx}" class="text-slate-400 hover:text-rose-600 text-xs font-bold transition px-1">\u2715</button>
      </td>
    </tr>`;
}
function containersCardHtml(containers = []) {
  const contList = Array.isArray(containers) && containers.length > 0 ? containers : [{}];
  const trs = contList.map((cont, i) => containerRowHtml(i, cont)).join("");
  return `
    <div class="col-span-3 mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50" data-containers-card>
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span class="text-blue-600">\u{1F6A2}</span>
          <span>${t("sales_new.containers.title")}</span>
        </div>
        <button type="button" id="btn-add-container-row"
          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition">
          <span>+</span>
          <span>${t("sales_new.containers.add")}</span>
        </button>
      </div>
      <div class="overflow-x-auto border border-slate-200 rounded bg-white">
        <table class="w-full text-left text-xs border-collapse" id="containers-table">
          <thead>
            <tr class="bg-slate-100 text-slate-600 text-[11px] border-b border-slate-200">
              <th class="py-1.5 px-1.5 w-8 text-center font-medium">#</th>
              <th class="py-1.5 px-1.5 font-medium min-w-[140px]">${t("sales_new.containers.col_no")}</th>
              <th class="py-1.5 px-1.5 font-medium w-28">${t("sales_new.containers.col_spec")}</th>
              <th class="py-1.5 px-1.5 font-medium w-36">${t("sales_new.containers.col_seal")}</th>
              <th class="py-1.5 px-1.5 font-medium w-28 text-right">${t("sales_new.containers.col_gw")}</th>
              <th class="py-1.5 px-1.5 font-medium w-28 text-right">${t("sales_new.containers.col_cbm")}</th>
              <th class="py-1.5 px-1.5 w-8 text-center font-medium"></th>
            </tr>
          </thead>
          <tbody id="containers-tbody">
            ${trs}
          </tbody>
          <tfoot>
            <tr class="bg-slate-50 font-semibold text-slate-700 text-xs border-t border-slate-200">
              <td colspan="2" class="py-1.5 px-2 text-slate-500 font-normal">
                <span>${t("sales_new.containers.total")}</span>
                <span id="cont-summary-spec" class="ml-2 font-mono text-blue-700"></span>
              </td>
              <td class="py-1.5 px-1.5 text-center font-mono text-blue-700" id="cont-sum-qty">0</td>
              <td class="py-1.5 px-1.5"></td>
              <td class="py-1.5 px-1.5 text-right font-mono" id="cont-sum-gw">0</td>
              <td class="py-1.5 px-1.5 text-right font-mono" id="cont-sum-cbm">0</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}
function syncContainerRollup(root) {
  const rows = Array.from(root.querySelectorAll("#containers-tbody tr[data-cont-row]"));
  let totalGw = 0;
  let totalCbm = 0;
  const specCounts = /* @__PURE__ */ new Map();
  const seals = [];
  rows.forEach((r) => {
    const spec = r.querySelector('[data-cont-field="spec"]')?.value || "40HC";
    const seal = r.querySelector('[data-cont-field="seal_no"]')?.value?.trim();
    const gw = parseFloat(r.querySelector('[data-cont-field="weight_kg"]')?.value) || 0;
    const cbm = parseFloat(r.querySelector('[data-cont-field="cbm"]')?.value) || 0;
    specCounts.set(spec, (specCounts.get(spec) || 0) + 1);
    if (seal) seals.push(seal);
    totalGw += gw;
    totalCbm += cbm;
  });
  const totalContQty = rows.length;
  const elQty = root.querySelector("#cont-sum-qty");
  const elGw = root.querySelector("#cont-sum-gw");
  const elCbm = root.querySelector("#cont-sum-cbm");
  const elSpec = root.querySelector("#cont-summary-spec");
  const specSummary = Array.from(specCounts.entries()).map(([spec, count]) => `${count}x${spec}`).join(", ");
  if (elQty) elQty.textContent = totalContQty;
  if (elGw) elGw.textContent = totalGw.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  if (elCbm) elCbm.textContent = totalCbm.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  if (elSpec) elSpec.textContent = specSummary;
  const inpQty = root.querySelector("input[name=container_qty]");
  const inpVol = root.querySelector("select[name=volume]");
  const inpSeal = root.querySelector("input[name=seal_no]");
  if (inpQty && totalContQty > 0) inpQty.value = totalContQty;
  if (inpVol && specCounts.size === 1) {
    const onlySpec = specCounts.keys().next().value;
    if (onlySpec) inpVol.value = onlySpec;
  }
  if (inpSeal && seals.length > 0) inpSeal.value = seals.join(", ");
}
function collectContainers(root) {
  const rows = Array.from(root.querySelectorAll("#containers-tbody tr[data-cont-row]"));
  return rows.map((r) => {
    const val = (f) => r.querySelector(`[data-cont-field="${f}"]`)?.value?.trim() || "";
    const num2 = (f) => {
      const v = parseFloat(val(f));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    return {
      container_no: val("container_no"),
      spec: val("spec") || "40HC",
      seal_no: val("seal_no") || null,
      weight_kg: num2("weight_kg"),
      cbm: num2("cbm")
    };
  }).filter((c) => c.container_no || c.seal_no || c.weight_kg || c.cbm);
}
function wireContainersTable(root, onChanged = null) {
  const table = root.querySelector("#containers-table");
  const tbody = root.querySelector("#containers-tbody");
  const addBtn = root.querySelector("#btn-add-container-row");
  if (!table || !tbody) return;
  syncContainerRollup(root);
  tbody.addEventListener("input", () => {
    syncContainerRollup(root);
    onChanged?.();
  });
  tbody.addEventListener("change", () => {
    syncContainerRollup(root);
    onChanged?.();
  });
  addBtn?.addEventListener("click", () => {
    const nextIdx = tbody.querySelectorAll("tr[data-cont-row]").length;
    const tr = document.createElement("tbody");
    tr.innerHTML = containerRowHtml(nextIdx, {});
    tbody.appendChild(tr.firstElementChild);
    syncContainerRollup(root);
    onChanged?.();
  });
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rm-cont]");
    if (!btn) return;
    const row = btn.closest("tr[data-cont-row]");
    if (row) {
      if (tbody.querySelectorAll("tr[data-cont-row]").length <= 1) {
        row.querySelectorAll("input").forEach((inp) => {
          inp.value = "";
        });
      } else {
        row.remove();
        tbody.querySelectorAll("tr[data-cont-row]").forEach((r, i) => {
          r.dataset.contRow = i;
          const numCell = r.querySelector("td:first-child");
          if (numCell) numCell.textContent = i + 1;
        });
      }
      syncContainerRollup(root);
      onChanged?.();
    }
  });
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/section-docs-ext.js
var FREIGHT_TERMS_OPTIONS = ["PREPAID", "COLLECT"];
var BILL_TYPE_OPTIONS = ["SEAWAY", "TELEX", "SURRENDER", "ORIGINAL"];
var FREIGHT_TERMS_LABEL_KEYS = {
  PREPAID: "sales_new.freight_terms.prepaid",
  COLLECT: "sales_new.freight_terms.collect"
};
var BILL_TYPE_LABEL_KEYS = {
  SEAWAY: "sales_new.bill_type.seaway",
  TELEX: "sales_new.bill_type.telex",
  SURRENDER: "sales_new.bill_type.surrender",
  ORIGINAL: "sales_new.bill_type.original"
};
function dtInp(name, val) {
  return `<input type="datetime-local" name="${name}" value="${val || ""}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}
var NAME_COMMODITY = "commodity";
var NAME_ATD = "atd";
var NAME_ATA = "ata";
function escHtml2(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function cargoItemRowHtml(idx, item = {}) {
  const pkgOpts = PKG_TYPES.map(
    (p) => `<option value="${p}"${(item.package_type || "CTNS") === p ? " selected" : ""}>${p}</option>`
  ).join("");
  return `
    <tr data-cargo-row="${idx}" class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td class="py-1 px-1.5 text-center text-slate-400 font-mono text-[10px]">${idx + 1}</td>
      <td class="py-1 px-1.5">
        <input type="text" name="cargo_desc_${idx}" data-cargo-field="description" value="${escHtml2(item.description || "")}"
          placeholder="${t("sales_new.cargo.desc_ph") || "T\xEAn / m\xF4 t\u1EA3 m\u1EB7t h\xE0ng"}"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="text" name="cargo_hs_${idx}" data-cargo-field="hs_code" value="${escHtml2(item.hs_code || "")}" placeholder="HS Code"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_qty_${idx}" data-cargo-field="package_qty" value="${item.package_qty ?? ""}" min="0" step="1" placeholder="0"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <select name="cargo_pkg_${idx}" data-cargo-field="package_type" class="w-full border border-slate-200 rounded px-1 py-0.5 text-xs bg-white">
          ${pkgOpts}
        </select>
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_gw_${idx}" data-cargo-field="gross_weight_kg" value="${item.gross_weight_kg ?? ""}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_nw_${idx}" data-cargo-field="net_weight_kg" value="${item.net_weight_kg ?? ""}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_cbm_${idx}" data-cargo-field="volume_cbm" value="${item.volume_cbm ?? ""}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="text" name="cargo_marks_${idx}" data-cargo-field="marks_and_numbers" value="${escHtml2(item.marks_and_numbers || "")}" placeholder="N/M"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5 text-center">
        <button type="button" data-rm-cargo="${idx}" class="text-slate-400 hover:text-rose-600 text-xs font-bold transition px-1">\u2715</button>
      </td>
    </tr>`;
}
function cargoItemsCardHtml(cargoItems = []) {
  const items = Array.isArray(cargoItems) && cargoItems.length > 0 ? cargoItems : [{}];
  const trs = items.map((item, i) => cargoItemRowHtml(i, item)).join("");
  return `
    <div class="col-span-3 mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50" data-cargo-items-card>
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span class="text-blue-600">\u{1F4E6}</span>
          <span>${t("sales_new.cargo.title") || "Danh m\u1EE5c H\xE0ng h\xF3a (Cargo Items)"}</span>
        </div>
        <button type="button" id="btn-add-cargo-item"
          class="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded border border-blue-200 transition flex items-center gap-1">
          <span>+</span>
          <span>${t("sales_new.cargo.add_item") || "Th\xEAm h\xE0ng h\xF3a"}</span>
        </button>
      </div>
      <div class="overflow-x-auto rounded border border-slate-200 bg-white">
        <table class="w-full text-left text-xs border-collapse" id="cargo-items-table">
          <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
            <tr class="border-b border-slate-200">
              <th class="py-1.5 px-1.5 w-8 text-center">#</th>
              <th class="py-1.5 px-1.5 min-w-[140px]">${t("sales_new.cargo.col_desc") || "M\xF4 t\u1EA3 h\xE0ng h\xF3a"}</th>
              <th class="py-1.5 px-1.5 w-24">${t("sales_new.cargo.col_hscode") || "HS Code"}</th>
              <th class="py-1.5 px-1.5 w-20 text-right">${t("sales_new.cargo.col_qty") || "S\u1ED1 ki\u1EC7n"}</th>
              <th class="py-1.5 px-1.5 w-24">${t("sales_new.cargo.col_pkg_type") || "Lo\u1EA1i ki\u1EC7n"}</th>
              <th class="py-1.5 px-1.5 w-24 text-right">${t("sales_new.cargo.col_gw") || "GW (kg)"}</th>
              <th class="py-1.5 px-1.5 w-24 text-right">${t("sales_new.cargo.col_nw") || "NW (kg)"}</th>
              <th class="py-1.5 px-1.5 w-24 text-right">${t("sales_new.cargo.col_cbm") || "CBM (m\xB3)"}</th>
              <th class="py-1.5 px-1.5 min-w-[100px]">${t("sales_new.cargo.col_marks") || "K\xFD m\xE3 hi\u1EC7u"}</th>
              <th class="py-1.5 px-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody id="cargo-items-tbody">
            ${trs}
          </tbody>
          <tfoot class="bg-slate-50 font-semibold text-slate-700 border-t border-slate-200">
            <tr>
              <td colspan="3" class="py-1.5 px-2 text-right text-[11px]">${t("sales_new.cargo.total") || "T\u1ED5ng c\u1ED9ng:"}</td>
              <td class="py-1.5 px-1.5 font-mono text-right" id="cargo-sum-qty">0</td>
              <td class="py-1.5 px-1.5"></td>
              <td class="py-1.5 px-1.5 font-mono text-right" id="cargo-sum-gw">0</td>
              <td class="py-1.5 px-1.5 font-mono text-right" id="cargo-sum-nw">0</td>
              <td class="py-1.5 px-1.5 font-mono text-right" id="cargo-sum-cbm">0</td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}
function docsExtHtml(d = {}) {
  return `
    ${fld(t("sales_new.field.booking_no"), txt("booking_no", d.booking_no))}
    ${fld(t("sales_new.field.commodity"), txt(NAME_COMMODITY, d.commodity))}
    ${fld(t("sales_new.field.reefer_temp"), txt("reefer_temp", d.reefer_temp))}
    ${fld(t("sales_new.field.reefer_vent"), txt("reefer_vent", d.reefer_vent))}
    ${fld(t("sales_new.field.closing_si"), dtInp("closing_si", d.closing_si))}
    ${fld(t("sales_new.field.closing_cy"), dtInp("closing_cy", d.closing_cy))}
    ${fld(t("sales_new.field.empty_pickup_depot"), txt("empty_pickup_depot", d.empty_pickup_depot))}
    ${fld(t("sales_new.field.full_return_depot"), txt("full_return_depot", d.full_return_depot))}
    ${fld(t("sales_new.field.place_of_receipt"), txt("place_of_receipt", d.place_of_receipt))}
    ${fld(t("sales_new.field.place_of_delivery"), txt("place_of_delivery", d.place_of_delivery))}
    ${fld(t("sales_new.field.notify_party"), txt("notify_party", d.notify_party))}
    ${fld(t("sales_new.field.for_delivery"), txt("for_delivery", d.for_delivery))}
    ${fld(t("sales_new.field.seal_no"), txt("seal_no", d.seal_no))}
    ${fld(
    t("sales_new.field.freight_terms"),
    selFld("freight_terms", FREIGHT_TERMS_OPTIONS, d.freight_terms, FREIGHT_TERMS_LABEL_KEYS)
  )}
    ${fld(
    t("sales_new.field.bill_type"),
    selFld("doc_type", BILL_TYPE_OPTIONS, d.doc_type, BILL_TYPE_LABEL_KEYS)
  )}
    ${fld(t("sales_new.field.volume_cbm"), num("volume_cbm", d.volume_cbm))}
    ${fld(t("sales_new.field.atd"), dateInp(NAME_ATD, d.atd))}
    ${fld(t("sales_new.field.ata"), dateInp(NAME_ATA, d.ata))}
    ${fld(t("sales_new.field.customs_cleared_at"), dateInp("customs_cleared_at", d.customs_cleared_at))}
    ${fld(t("sales_new.field.haulage_signed_at"), dateInp("haulage_signed_at", d.haulage_signed_at))}
    ${fld(t("sales_new.field.do_released_at"), dateInp("do_released_at", d.do_released_at))}
    ${fld(t("sales_new.field.cargo_released_at"), dateInp("cargo_released_at", d.cargo_released_at))}
    ${fld(t("sales_new.field.billing_paid_at"), dateInp("billing_paid_at", d.billing_paid_at))}
    ${containersCardHtml(d.containers)}
    ${cargoItemsCardHtml(d.cargo_items)}`;
}
function syncCargoRollup(root) {
  const tbody = root.querySelector("#cargo-items-tbody");
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll("tr[data-cargo-row]"));
  let totalQty = 0;
  let totalGw = 0;
  let totalNw = 0;
  let totalCbm = 0;
  const descriptions = [];
  for (const r of rows) {
    const qty = Number(r.querySelector('[data-cargo-field="package_qty"]')?.value) || 0;
    const gw = Number(r.querySelector('[data-cargo-field="gross_weight_kg"]')?.value) || 0;
    const nw = Number(r.querySelector('[data-cargo-field="net_weight_kg"]')?.value) || 0;
    const cbm = Number(r.querySelector('[data-cargo-field="volume_cbm"]')?.value) || 0;
    const desc = r.querySelector('[data-cargo-field="description"]')?.value?.trim() || "";
    totalQty += qty;
    totalGw += gw;
    totalNw += nw;
    totalCbm += cbm;
    if (desc) descriptions.push(desc);
  }
  const elQty = root.querySelector("#cargo-sum-qty");
  const elGw = root.querySelector("#cargo-sum-gw");
  const elNw = root.querySelector("#cargo-sum-nw");
  const elCbm = root.querySelector("#cargo-sum-cbm");
  if (elQty) elQty.textContent = totalQty.toLocaleString("vi-VN");
  if (elGw) elGw.textContent = totalGw.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  if (elNw) elNw.textContent = totalNw.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  if (elCbm) elCbm.textContent = totalCbm.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  if (rows.length > 0 && (totalQty > 0 || totalGw > 0 || totalCbm > 0 || descriptions.length > 0)) {
    const inpPieces = root.querySelector("input[name=pieces]");
    const inpGw = root.querySelector("input[name=weight_actual]");
    const uomGw = root.querySelector("select[name=weight_uom]");
    const inpCbm = root.querySelector("input[name=volume_cbm]");
    const inpComm = root.querySelector("input[name=commodity]");
    if (inpPieces && totalQty > 0) inpPieces.value = totalQty;
    if (inpGw && totalGw > 0) {
      inpGw.value = totalGw;
      if (uomGw) uomGw.value = "KG";
    }
    if (inpCbm && totalCbm > 0) inpCbm.value = totalCbm;
    if (inpComm && descriptions.length > 0) inpComm.value = descriptions.join("; ");
  }
}
function collectCargoItems(root) {
  const rows = Array.from(root.querySelectorAll("#cargo-items-tbody tr[data-cargo-row]"));
  return rows.map((r, i) => {
    const val = (f) => r.querySelector(`[data-cargo-field="${f}"]`)?.value?.trim() || "";
    const numField = (f) => {
      const v = Number(val(f));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    return {
      item_id: `itm-${i + 1}`,
      description: val("description") || null,
      hs_code: val("hs_code") || null,
      package_qty: numField("package_qty"),
      package_type: val("package_type") || "CTNS",
      gross_weight_kg: numField("gross_weight_kg"),
      net_weight_kg: numField("net_weight_kg"),
      volume_cbm: numField("volume_cbm"),
      marks_and_numbers: val("marks_and_numbers") || null
    };
  }).filter((item) => item.description || item.package_qty || item.gross_weight_kg || item.volume_cbm);
}
function wireCargoItemsTable(root, onChanged = null) {
  const table = root.querySelector("#cargo-items-table");
  const tbody = root.querySelector("#cargo-items-tbody");
  const addBtn = root.querySelector("#btn-add-cargo-item");
  if (!table || !tbody) return;
  syncCargoRollup(root);
  tbody.addEventListener("input", () => {
    syncCargoRollup(root);
    onChanged?.();
  });
  addBtn?.addEventListener("click", () => {
    const nextIdx = tbody.querySelectorAll("tr[data-cargo-row]").length;
    const tr = document.createElement("tbody");
    tr.innerHTML = cargoItemRowHtml(nextIdx, {});
    tbody.appendChild(tr.firstElementChild);
    syncCargoRollup(root);
    onChanged?.();
  });
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-rm-cargo]");
    if (!btn) return;
    const row = btn.closest("tr[data-cargo-row]");
    if (row) {
      if (tbody.querySelectorAll("tr[data-cargo-row]").length <= 1) {
        row.querySelectorAll("input").forEach((inp) => {
          inp.value = "";
        });
      } else {
        row.remove();
        tbody.querySelectorAll("tr[data-cargo-row]").forEach((r, i) => {
          r.dataset.cargoRow = i;
          const numCell = r.querySelector("td:first-child");
          if (numCell) numCell.textContent = i + 1;
        });
      }
      syncCargoRollup(root);
      onChanged?.();
    }
  });
}
var DOCS_EXT_FIELDS = [
  "booking_no",
  "commodity",
  "container_qty",
  "reefer_temp",
  "reefer_vent",
  "closing_si",
  "closing_cy",
  "empty_pickup_depot",
  "full_return_depot",
  "place_of_receipt",
  "place_of_delivery",
  "notify_party",
  "for_delivery",
  "seal_no",
  "freight_terms",
  "doc_type",
  "volume_cbm",
  "atd",
  // F-41-03: phase evidence — each field is one ✗ row on the timeline turning ✓
  "ata",
  "customs_cleared_at",
  "haulage_signed_at",
  "do_released_at",
  "cargo_released_at",
  "billing_paid_at"
];

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/quote-attach.js
var KIND_QUOTATIONS = "quotations";
var SELL_QTY_DEFAULT = 1;
function eligibleQuotes(quotes, customerName, now = Date.now()) {
  const needle = (customerName || "").toLowerCase().trim();
  return (quotes || []).filter((q) => {
    if (q.state === "Cancelled" || q.state === "Expired" || q.state === "Rejected") return false;
    if (needle && (q.customer || "").toLowerCase().trim() !== needle) return false;
    if (q.valid_until_ms && q.valid_until_ms < now) return false;
    return true;
  });
}
function applyQuoteSellRows(root, quoteLines, { fxRepo = null, docDate = "", onChanged = null } = {}) {
  const tbody = root.querySelector("#lines-tbody");
  if (!tbody || !quoteLines?.length) return 0;
  const isBlank = (row) => ["desc", "buy_amt", "sell_amt"].every((n) => !row.querySelector(`[name=${n}]`)?.value);
  const blanks = Array.from(tbody.querySelectorAll("tr[data-line]")).filter(isBlank);
  const headerCurrency = root.querySelector("[name=currency]")?.value || "";
  const bookCurrency = root.querySelector("[name=book_currency]")?.value || "";
  let applied = 0;
  for (const q of quoteLines) {
    if (!q?.description || !(Number(q.amount) > 0)) continue;
    let row = blanks.shift();
    if (!row) {
      const idx = tbody.querySelectorAll("tr[data-line]").length;
      const tmp = document.createElement("tbody");
      tmp.innerHTML = lineRowHtml(idx, {}, headerCurrency, bookCurrency);
      row = tmp.firstElementChild;
      tbody.appendChild(row);
    }
    const set = (n, v) => {
      const el = row.querySelector(`[name=${n}]`);
      if (el) el.value = v;
    };
    set("desc", q.description);
    set("sell_qty", SELL_QTY_DEFAULT);
    set("sell_amt", q.amount);
    set("sell_currency", q.currency || "");
    const kindSel = row.querySelector("[name=kind]");
    if (kindSel && !kindSel.value) kindSel.value = classifyKind(q.description);
    applyFxDateDefaults(row, docDate);
    Promise.all([prefillRowFx(row, "buy", fxRepo), prefillRowFx(row, "sell", fxRepo)]).then(() => onChanged?.()).catch(() => {
    });
    applied++;
  }
  if (applied) onChanged?.();
  return applied;
}
function _toast(message, type) {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { message, type } }));
}
async function _attach(root, quote, opts) {
  const { repo, ownRef, onChanged } = opts;
  const existing = await checkAlreadyConverted(repo, quote.id).catch(() => null);
  if (existing && existing.shipment_ref !== ownRef) {
    _toast(t("sales_new.quote_already_converted").replace("{ref}", existing.shipment_ref || existing.id), "error");
    return false;
  }
  const hidden = root.querySelector("[name=quote_id]");
  if (hidden) hidden.value = quote.id;
  if (quote.customer) {
    const custInput = root.querySelector("#customer-search-input");
    const custHidden = root.querySelector("input[name=customer]");
    if (custInput) custInput.value = quote.customer;
    if (custHidden) custHidden.value = quote.customer;
  }
  if (quote.pol) {
    const pol = root.querySelector("[name=pol]");
    if (pol && !pol.value) pol.value = quote.pol;
  }
  if (quote.pod) {
    const pod = root.querySelector("[name=pod]");
    if (pod && !pod.value) pod.value = quote.pod;
  }
  if (quote.carrier) {
    const carrier = root.querySelector("[name=carrier]");
    if (carrier && !carrier.value) carrier.value = quote.carrier;
  }
  if (quote.container_type) {
    const vol = root.querySelector("[name=volume]");
    if (vol && !vol.value) vol.value = quote.container_type;
  }
  applyQuoteSellRows(root, quote.lines, opts);
  const repSel2 = root.querySelector("select[name=sales_rep]");
  if (repSel2 && !repSel2.value && quote.sales_rep_id && [...repSel2.options].some((o) => o.value === quote.sales_rep_id)) {
    repSel2.value = quote.sales_rep_id;
    repSel2.dispatchEvent(new Event("change", { bubbles: true }));
  }
  _toast(t("sales_new.quote_attached").replace("{id}", quote.id), "success");
  onChanged?.();
  return true;
}
function wireQuoteAttach(root, { repo, fxRepo = null, docDate = "", ownRef = null, onChanged = null } = {}) {
  const picker = root.querySelector("select[name=quote_pick]");
  if (!picker || !repo) return;
  let quotes = [];
  const quoteId = (q) => q.id;
  const refill = async () => {
    quotes = await repo.list(KIND_QUOTATIONS, null).catch(() => []);
    const customer = root.querySelector("[name=customer]")?.value || "";
    const current = picker.value;
    const rows = eligibleQuotes(quotes, customer);
    picker.innerHTML = `<option value="">${t("sales_new.quote_pick_placeholder")}</option>` + rows.map((q) => {
      const label = q.customer ? `${quoteId(q)} \u2014 ${q.customer} (${q.pol || "POL"} \u2192 ${q.pod || "POD"})` : quoteId(q);
      return `<option value="${quoteId(q)}"${q.id === current ? " selected" : ""}>${label}</option>`;
    }).join("");
  };
  refill().catch(() => {
  });
  picker.addEventListener("mousedown", refill);
  picker.addEventListener("focus", refill);
  root.querySelector("#customer-search-input")?.addEventListener("change", refill);
  picker.addEventListener("change", async () => {
    const quote = quotes.find((q) => q.id === picker.value);
    if (!quote) return;
    const ok = await _attach(root, quote, { repo, fxRepo, docDate, ownRef, onChanged });
    if (!ok) picker.value = "";
  });
  const preset = root.querySelector("[name=quote_id]")?.value;
  const hasAnyLine = Array.from(root.querySelectorAll("#lines-tbody tr[data-line]")).some((row) => ["desc", "buy_amt", "sell_amt"].some((n) => row.querySelector(`[name=${n}]`)?.value));
  if (preset && !hasAnyLine) {
    repo.get(KIND_QUOTATIONS, preset).then((quote) => {
      if (quote) applyQuoteSellRows(root, quote.lines, { fxRepo, docDate, onChanged });
    }).catch(() => {
    });
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/components/phase-timeline.js
var PHASE_FOCUS_EVENT = "vdg:phase-focus";
var REQ_FOCUS_EVENT = "vdg:req-focus";
var POSITION_CURRENT = "current";
var POSITION_DONE = "done";
var ARIA_CURRENT_STEP = "step";
var ARIA_CURRENT_NONE = "false";
var STATUS_MET = "met";
var STATUS_UNKNOWN = "unknown";
var STATUS_ICON = { met: "\u2713", missing: "\u2717", unknown: "\xB7" };
var ICON_CLASS = {
  met: "text-emerald-600",
  missing: "text-rose-600 font-semibold",
  unknown: "text-slate-400"
};
var NODE_CLASS = {
  done: "bg-emerald-500 border-emerald-500 text-white",
  current: "bg-white       border-blue-500    text-blue-600 ring-4 ring-blue-100",
  ahead: "bg-white       border-slate-300   text-slate-400"
};
var LABEL_CLASS = {
  done: "text-slate-600",
  current: "text-blue-700 font-semibold",
  ahead: "text-slate-400"
};
var RAIL_DONE = "bg-emerald-400";
var RAIL_TODO = "bg-slate-200";
var DONE_ICON = "\u2713";
var FOCUS_NODE = " shadow-md";
var FOCUS_TEXT = " underline underline-offset-4";
var g = () => globalThis.window || globalThis;
function loadTimeline(shipment) {
  const wasm4 = g().__vdg_wasm;
  const ref = shipment?.shipment_ref;
  if (!ref || typeof wasm4?.shipment_phases !== "function") return null;
  try {
    return JSON.parse(wasm4.shipment_phases(ref, JSON.stringify(shipment)));
  } catch (err) {
    console.warn("[phase-timeline]", ref, err?.message || err);
    return null;
  }
}
function requirementLine(req) {
  const what = t(`phase.req.${req.code}`);
  const who = t(ROLE_LABEL_KEYS[req.owner] || req.owner);
  const head = `${what} (${who})`;
  return req.status === STATUS_UNKNOWN ? `${head} \u2014 ${t("phase.req.unverified")}` : head;
}
function renderTimeline(timeline, { focus = null } = {}) {
  if (!timeline) return "";
  const total = timeline.phases.length;
  const steps = timeline.phases.map((phase, i) => phaseStep(phase, i, total, focus)).join("");
  const banner = timeline.off_path ? `<div class="text-xs text-slate-500 mb-2">${esc(t("phase.off_path", { state: stateLabel(timeline.current) }))}</div>` : "";
  const shown = timeline.phases.find((p) => p.state === focus) || timeline.phases.find((p) => p.position === POSITION_CURRENT);
  const next = shown ? timeline.phases[timeline.phases.indexOf(shown) + 1]?.state ?? null : null;
  return `
    ${banner}
    <ol class="flex items-start w-full" aria-label="${esc(t("phase.timeline"))}">
      ${steps}
    </ol>
    ${detailPanel(shown, next)}`;
}
function phaseStep(phase, index, total, focus) {
  const done = phase.position === POSITION_DONE;
  const here = phase.position === POSITION_CURRENT;
  const focused = focus === phase.state;
  const node = NODE_CLASS[phase.position] ?? NODE_CLASS.ahead;
  const label = LABEL_CLASS[phase.position] ?? LABEL_CLASS.ahead;
  const aria = here ? ARIA_CURRENT_STEP : ARIA_CURRENT_NONE;
  const nodeExtra = focused ? FOCUS_NODE : "";
  const textExtra = focused ? FOCUS_TEXT : "";
  const before = index === 0 ? "" : `<span class="absolute top-4 left-0 right-1/2 h-0.5 ${done || here ? RAIL_DONE : RAIL_TODO}"></span>`;
  const after = index === total - 1 ? "" : `<span class="absolute top-4 left-1/2 right-0 h-0.5 ${done ? RAIL_DONE : RAIL_TODO}"></span>`;
  const gaps = phase.requirements.filter((r) => r.status !== STATUS_MET).length;
  const badge = gaps ? `<span class="absolute -top-1 -right-1 z-20 min-w-[1rem] px-1 rounded-full bg-amber-500
                    text-white text-[10px] leading-4 text-center">${gaps}</span>` : "";
  return `
    <li class="relative flex-1 min-w-0">
      ${before}${after}
      <button type="button" data-phase="${esc(phase.state)}" aria-current="${aria}"
              class="relative w-full flex flex-col items-center gap-1.5 px-1 py-0.5 rounded-md
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <span class="relative z-10">
          <span class="grid place-items-center w-8 h-8 rounded-full border-2 text-xs font-semibold
                       ${node}${nodeExtra}">${done ? DONE_ICON : index + 1}</span>
          ${badge}
        </span>
        <span class="text-[11px] leading-tight text-center ${label}${textExtra}">${esc(stateLabel(phase.state))}</span>
      </button>
    </li>`;
}
function detailPanel(phase, next) {
  if (!phase) return "";
  const rows = phase.requirements.map(reqRow).join("");
  const body = rows ? `<ul class="mt-1.5 space-y-1">${rows}</ul>` : `<div class="mt-1 text-[11px] text-slate-500">${esc(t("phase.no_pending"))}</div>`;
  const heading = next && rows ? t("phase.advance_conditions", { state: stateLabel(next) }) : stateLabel(phase.state);
  return `
    <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div class="text-xs font-semibold text-slate-700">${esc(heading)}</div>
      ${body}
    </div>`;
}
function reqRow(req) {
  const mark = ICON_CLASS[req.status] ?? ICON_CLASS.unknown;
  const icon = STATUS_ICON[req.status] ?? STATUS_ICON.unknown;
  return `<li>
      <button type="button" data-req="${esc(req.code)}" title="${esc(req.detail || "")}"
        class="flex items-start gap-1.5 text-[11px] text-left w-full rounded px-1 py-0.5
               text-slate-700 hover:bg-slate-100 hover:underline">
        <span class="shrink-0 w-3 text-center font-semibold ${mark}">${esc(icon)}</span>
        <span>${esc(requirementLine(req))}</span>
      </button>
    </li>`;
}
function stateLabel(state) {
  return t(`shipment.status.${state}`);
}
function bindTimeline(root, onFocus) {
  for (const el of root.querySelectorAll("[data-phase]")) {
    el.addEventListener("click", () => {
      const phase = el.getAttribute("data-phase");
      onFocus?.(phase);
      g().dispatchEvent?.(new CustomEvent(PHASE_FOCUS_EVENT, { detail: { phase } }));
    });
  }
  for (const el of root.querySelectorAll("[data-req]")) {
    el.addEventListener("click", () => {
      g().dispatchEvent?.(new CustomEvent(REQ_FOCUS_EVENT, { detail: { code: el.getAttribute("data-req") } }));
    });
  }
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/phase-screens.js
var SCREEN_BOOKING = 1;
var SCREEN_DOCS = 2;
var SCREEN_BILL = 3;
var SCREEN_PNL = 4;
var SCREENS = [
  { id: SCREEN_BOOKING, key: "booking" },
  { id: SCREEN_DOCS, key: "docs" },
  { id: SCREEN_BILL, key: "bill" },
  { id: SCREEN_PNL, key: "pnl" }
];
var SCREEN_OF_STATE = {
  Created: SCREEN_BOOKING,
  BookingConfirmed: SCREEN_DOCS,
  InTransit: SCREEN_BILL,
  Arrived: SCREEN_BILL,
  Delivered: SCREEN_PNL,
  Closed: SCREEN_PNL,
  Cancelled: SCREEN_BOOKING
};
var FIELD_SCREEN = {
  // Routing & Booking (Tab 1, Tab 2, Tab 3)
  mode: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  product: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  direction: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  direction_display: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  job_no: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  customer: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  sales_rep: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  quote_pick: [SCREEN_BOOKING, SCREEN_PNL],
  carrier: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  booking_no: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  vessel: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  flight_no: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  pol: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  pod: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  origin_iata: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  dest_iata: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  place_of_receipt: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  place_of_delivery: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  etd: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  eta: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  closing_si: [SCREEN_BOOKING],
  closing_cy: [SCREEN_BOOKING],
  empty_pickup_depot: [SCREEN_BOOKING],
  full_return_depot: [SCREEN_BOOKING],
  volume: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  container_qty: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  reefer_temp: [SCREEN_BOOKING, SCREEN_DOCS],
  reefer_vent: [SCREEN_BOOKING, SCREEN_DOCS],
  has_hbl: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  hbl_do_display: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  // Documentation (Tab 2, Tab 3)
  shipper: [SCREEN_DOCS, SCREEN_BILL],
  shipper_address: [SCREEN_DOCS, SCREEN_BILL],
  consignee: [SCREEN_DOCS, SCREEN_BILL],
  consignee_address: [SCREEN_DOCS, SCREEN_BILL],
  notify_party: [SCREEN_DOCS, SCREEN_BILL],
  for_delivery: [SCREEN_DOCS, SCREEN_BILL],
  contact_person: [SCREEN_BOOKING, SCREEN_DOCS],
  mbl: [SCREEN_BOOKING, SCREEN_DOCS, SCREEN_BILL],
  seal_no: [SCREEN_DOCS, SCREEN_BILL],
  freight_terms: [SCREEN_DOCS, SCREEN_BILL],
  doc_type: [SCREEN_DOCS, SCREEN_BILL],
  // Cargo & Commodity (Tab 2, Tab 3)
  commodity: [SCREEN_DOCS, SCREEN_BILL],
  pieces: [SCREEN_DOCS, SCREEN_BILL],
  package_type: [SCREEN_DOCS, SCREEN_BILL],
  weight_actual: [SCREEN_DOCS, SCREEN_BILL],
  weight_uom: [SCREEN_DOCS, SCREEN_BILL],
  volume_cbm: [SCREEN_DOCS, SCREEN_BILL],
  dim_l_cm: [SCREEN_DOCS],
  dim_w_cm: [SCREEN_DOCS],
  dim_h_cm: [SCREEN_DOCS],
  uld_type: [SCREEN_DOCS],
  chargeable_kg: [SCREEN_DOCS, SCREEN_BILL],
  // Milestones & Evidence (Tab 3)
  atd: [SCREEN_BILL],
  ata: [SCREEN_BILL],
  customs_cleared_at: [SCREEN_BILL],
  haulage_signed_at: [SCREEN_BILL],
  do_released_at: [SCREEN_BILL],
  cargo_released_at: [SCREEN_BILL],
  // Financial & PNL (Tab 4)
  billing_paid_at: [SCREEN_PNL],
  roe_buying: [SCREEN_PNL],
  roe_selling: [SCREEN_PNL],
  currency: [SCREEN_PNL]
};
var DEFAULT_SCREENS = [SCREEN_BOOKING];
var REQ_SCREEN = {
  carrier_booking: SCREEN_BOOKING,
  quotation: SCREEN_PNL,
  dg_compliance: SCREEN_BOOKING,
  containers: SCREEN_BOOKING,
  voyage_departed: SCREEN_BILL,
  vessel_arrived: SCREEN_BILL,
  customs: SCREEN_BILL,
  haulage: SCREEN_BILL,
  delivery_order: SCREEN_BILL,
  cargo_release: SCREEN_BILL,
  billing_paid: SCREEN_PNL,
  demdet_settled: SCREEN_PNL,
  claim_closed: SCREEN_PNL
};
var TAB_BASE = "px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 transition-colors";
var TAB_ACTIVE = "bg-blue-600 text-white border-blue-600";
var TAB_INACTIVE = "bg-white text-slate-600 hover:bg-slate-50";
function screenOfState(state) {
  return SCREEN_OF_STATE[state] ?? SCREEN_BOOKING;
}
function screensOfField(name) {
  return FIELD_SCREEN[name] ?? DEFAULT_SCREENS;
}
function tabsHtml(active) {
  const btns = SCREENS.map((s) => `
    <button type="button" data-screen-tab="${s.id}"
      class="${TAB_BASE} ${s.id === active ? TAB_ACTIVE : TAB_INACTIVE}">
      ${s.id}. ${t(`sales_new.screen.${s.key}`)}
    </button>`).join("");
  return `<div id="phase-screen-tabs" class="flex flex-wrap gap-2">${btns}</div>`;
}
function screenShow(el, show) {
  if (el) el.style.display = show ? "" : "none";
}
function applyScreen(root, screen) {
  const grid = root.querySelector("#sec-a-body .grid");
  if (!grid) return;
  for (const cell of grid.children) {
    if (cell.hasAttribute("data-cargo-items-card")) {
      screenShow(cell, screen === SCREEN_DOCS);
      continue;
    }
    if (cell.hasAttribute("data-containers-card")) {
      screenShow(cell, screen === SCREEN_DOCS || screen === SCREEN_BILL);
      continue;
    }
    const input = cell.querySelector("[name]");
    if (!input) continue;
    screenShow(cell, screensOfField(input.getAttribute("name")).includes(screen));
  }
  for (const [sel, home] of [["#sec-b-body", SCREEN_PNL], ["#sec-c-body", SCREEN_PNL], ["#sec-d-body", SCREEN_PNL]]) {
    screenShow(root.querySelector(sel), screen === home);
  }
  for (const btn of root.querySelectorAll("[data-screen-tab]")) {
    const active = Number(btn.dataset.screenTab) === screen;
    btn.className = `${TAB_BASE} ${active ? TAB_ACTIVE : TAB_INACTIVE}`;
  }
}
function initPhaseScreens(root, { state = "Created" } = {}) {
  const secA = root.querySelector("#sec-a-body");
  if (!secA) return;
  secA.insertAdjacentHTML("beforebegin", tabsHtml(screenOfState(state)));
  const go = (screen) => applyScreen(root, screen);
  root.querySelector("#phase-screen-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-screen-tab]");
    if (btn) go(Number(btn.dataset.screenTab));
  });
  const onFocus = (e) => {
    if (!root.isConnected) {
      window.removeEventListener(PHASE_FOCUS_EVENT, onFocus);
      return;
    }
    const phase = e.detail?.phase;
    if (phase) go(screenOfState(phase));
  };
  window.addEventListener(PHASE_FOCUS_EVENT, onFocus);
  const onReq = (e) => {
    if (!root.isConnected) {
      window.removeEventListener(REQ_FOCUS_EVENT, onReq);
      return;
    }
    const screen = REQ_SCREEN[e.detail?.code];
    if (screen) go(screen);
  };
  window.addEventListener(REQ_FOCUS_EVENT, onReq);
  go(screenOfState(state));
}
function jumpToFirstError(root) {
  const bad = root.querySelector(".field-error");
  if (!bad) return;
  if (!bad.closest("#sec-a-body")) {
    applyScreen(root, SCREEN_PNL);
    return;
  }
  const name = bad.getAttribute("name") || bad.querySelector("[name]")?.getAttribute("name");
  if (name) applyScreen(root, screensOfField(name)[0]);
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/validate-shipment-form.js
var wasm3 = () => globalThis.window?.__vdg_wasm || globalThis.__vdg_wasm;
function validateShipmentForm(state, { publish = true } = {}) {
  const mod = wasm3();
  if (typeof mod?.validate_shipment_gate !== "function") {
    throw new Error("validate-shipment-form: wasm not ready \u2014 validate_shipment_gate missing");
  }
  const request = {
    publish,
    mbl: state.mbl || "",
    hbl: state.hbl || "",
    job_file_no: state.job_file_no || "",
    customer: state.customer || "",
    sales_rep: state.sales_rep || "",
    direction: state.direction || "",
    product: state.product || "",
    closing_si_bad_input: !!state.closing_si_bad_input,
    closing_cy_bad_input: !!state.closing_cy_bad_input,
    book_currency: state.book_currency || "",
    lines: state.lines || [],
    commission_lines: state.commission_lines || []
  };
  const reply = mod.validate_shipment_gate(JSON.stringify(request));
  const errs = reply.errors.map((key) => t(`sales_new.validation.${key}`));
  if (reply.vnd_mismatch) {
    const { expected, actual, delta } = reply.vnd_mismatch;
    errs.push(t("sales_new.validation.vnd_invariant").replace("{expected}", expected).replace("{actual}", actual).replace("{delta}", delta));
  }
  return errs;
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form.js
var AUTOSAVE_DELAY_MS = 1500;
async function renderForm(root, opts = {}) {
  const {
    customers = [],
    salesRepId = "",
    userConfig = null,
    draft = null,
    mode = "create",
    fxRepo = null,
    jobNo = null,
    defaultCurrency = null,
    revenueVisible = true,
    reps = [],
    editRef = null,
    carriers = [],
    shipments = [],
    weightUnits = []
  } = opts;
  const isEdit = mode === "edit";
  const docDate = draft?.transaction_date || todayLocal();
  const isManager = currentUserRoles().includes(ROLE_MANAGER);
  const d = draft ? { ...draft } : {};
  if (!d.sales_rep && salesRepId) d.sales_rep = salesRepId;
  d.currency = resolveHeaderCurrency(d.currency, defaultCurrency);
  d.book_currency = resolveHeaderCurrency(null, defaultCurrency);
  if (!isEdit && !d.job_no) d.job_no = jobNo;
  if (!isManager && userConfig?.sales_share_pct != null) {
    d._rule_label = `${userConfig.sales_share_pct}% sales`;
    d.sales_share_pct_override = d.sales_share_pct_override ?? userConfig.sales_share_pct;
  }
  const formTitle = isEdit ? t("sales_new.form.edit_title") : t("sales_new.form.create_title");
  const formSubtitle = isEdit ? t("sales_new.form.edit_subtitle") : t("sales_new.form.create_subtitle");
  root.innerHTML = `
    <div class="p-6 max-w-6xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xl font-semibold text-slate-900">${formTitle}</div>
          <div class="text-xs text-slate-500 mt-0.5">${formSubtitle}</div>
        </div>
      </div>
      <div id="phase-timeline"></div>
      <form id="shipment-form" class="space-y-4" novalidate>
        <input type="hidden" name="book_currency" value="${d.book_currency}" />
        ${sectionAHtml(d, customers, reps, { carriers, shipments, weightUnits })}
        ${sectionBHtml(d)}
        ${revenueVisible ? sectionCHtml(d) : ""}
        ${revenueVisible ? sectionDHtml(d, { isManager }) : ""}
        <div id="shipment-currency-summary" class="hidden text-[11px] text-slate-500 px-1"></div>
        <div id="shipment-form-errors"
          class="hidden text-xs text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
        </div>
        ${_renderActionBar(d.publish_state)}
      </form>
    </div>`;
  root.querySelector("#sec-a-body .grid")?.insertAdjacentHTML("beforeend", docsExtHtml(d));
  initPhaseScreens(root, { state: d.state || "Created" });
  mountDateHints(root);
  const onChanged = () => _recomputeWaterfall(root, userConfig);
  wireHeaderSection(root, onChanged);
  wireCargoItemsTable(root, onChanged);
  wireContainersTable(root, onChanged);
  wireLinesSection(root, onChanged, salesRepId, fxRepo, docDate);
  wireQuoteAttach(root, {
    repo: typeof window !== "undefined" ? window.__vdg_repo : null,
    fxRepo,
    docDate,
    ownRef: editRef,
    onChanged
  });
  if (revenueVisible) {
    wireCommissionSection(root, onChanged, fxRepo, docDate);
    wireWaterfallSection(root, onChanged);
    _recomputeWaterfall(root, userConfig);
  }
  if (!isEdit) {
    let autosaveTimer = null;
    let dirty = false;
    const form = root.querySelector("#shipment-form");
    form?.addEventListener("input", () => {
      dirty = true;
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        if (form.isConnected) saveDraft(collectFormState(root));
      }, AUTOSAVE_DELAY_MS);
    });
    form?.addEventListener("submit", () => clearTimeout(autosaveTimer));
    const onHidden = () => {
      if (!form || !form.isConnected) {
        document.removeEventListener("visibilitychange", onHidden);
        return;
      }
      if (dirty && document.visibilityState === "hidden") saveDraft(collectFormState(root));
    };
    document.addEventListener("visibilitychange", onHidden);
  }
}
var badInput = (root, name) => !!root.querySelector(`[name=${name}]`)?.validity?.badInput;
function collectFormState(root) {
  const g2 = (name) => root.querySelector(`[name=${name}]`)?.value || "";
  const jobNo = g2("job_no") || null;
  const hasHbl = root.querySelector("[name=has_hbl]")?.checked || false;
  return {
    quote_id: g2("quote_id") || null,
    mode: g2("mode") || "SEA",
    mbl: g2("mbl"),
    // F-32-01 QA rework DEFECT-01: hbl must be derived HERE, not only in buildShipment —
    // validateShipmentForm's save-gate runs on this state before buildShipment ever sees it.
    job_no: jobNo,
    has_hbl: hasHbl,
    hbl: hasHbl ? jobNo : null,
    job_file_no: g2("job_file_no"),
    product: g2("product"),
    // E-43: this key was MISSING while `validateShipmentForm` refuses to publish without it, so
    // `state.direction` was always undefined and EVERY publish failed with "Chưa chọn chiều
    // xuất/nhập" — including jobs whose hidden `direction` input plainly held `export`. Nothing
    // could ever reach the ledger; measured live on two shipments that had every other field.
    direction: g2("direction"),
    sales_rep: g2("sales_rep"),
    customer: g2("customer"),
    shipper: g2("shipper"),
    shipper_address: g2("shipper_address"),
    consignee: g2("consignee"),
    consignee_address: g2("consignee_address"),
    contact_person: g2("contact_person"),
    vessel: g2("vessel"),
    carrier: g2("carrier"),
    etd: g2("etd"),
    eta: g2("eta"),
    pol: g2("pol"),
    pod: g2("pod"),
    volume: g2("volume"),
    roe_buying: g2("roe_buying"),
    roe_selling: g2("roe_selling"),
    currency: g2("currency"),
    book_currency: g2("book_currency"),
    // air fields
    weight_actual: g2("weight_actual"),
    weight_uom: g2("weight_uom"),
    dim_l_cm: g2("dim_l_cm"),
    dim_w_cm: g2("dim_w_cm"),
    dim_h_cm: g2("dim_h_cm"),
    pieces: g2("pieces"),
    package_type: g2("package_type"),
    uld_type: g2("uld_type"),
    flight_no: g2("flight_no"),
    origin_iata: g2("origin_iata"),
    dest_iata: g2("dest_iata"),
    chargeable_kg: g2("chargeable_kg"),
    lines: collectLines(root),
    commission_lines: collectCommission(root),
    sales_share_pct_override: collectWaterfallOverrides(root).sales_share_pct_override,
    cargo_items: collectCargoItems(root),
    containers: collectContainers(root),
    // E-39: booking/docs ext fields — one list (section-docs-ext.js), so collector cannot drift
    ...Object.fromEntries(DOCS_EXT_FIELDS.map((n) => [n, g2(n)])),
    // the only two datetime-local fields in the form — see badInput() above
    closing_si_bad_input: badInput(root, "closing_si"),
    closing_cy_bad_input: badInput(root, "closing_cy")
  };
}
function _renderActionBar(publishState) {
  if (publishState === "published") {
    return `
      <div class="flex gap-3 pt-2">
        <button type="button" disabled
          class="px-5 py-2 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-lg flex items-center gap-2 cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
          ${t("sales_new.action.published")}
        </button>
      </div>`;
  }
  if (publishState === "publish_pending") {
    return `
      <div class="flex gap-3 pt-2">
        <button type="button" disabled
          class="px-5 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg flex items-center gap-2 cursor-not-allowed">
          <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          ${t("sales_new.action.publishing")}
        </button>
      </div>`;
  }
  return `
    <div class="flex gap-3 pt-2">
      <button type="submit" data-intent="save" id="ni-save-btn"
        class="px-4 py-2 border border-slate-300 text-sm text-slate-700 rounded-lg hover:bg-slate-50">
        ${t("sales_new.action.save")}
      </button>
      <button type="submit" data-intent="publish" id="ni-publish-btn"
        class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">
        ${t("sales_new.action.publish")}
      </button>
    </div>`;
}
function _renderCurrencySummary(root, summary) {
  const el = root.querySelector("#shipment-currency-summary");
  if (!el) return;
  if (summary.length === 0) {
    el.classList.add("hidden");
    return;
  }
  const items = summary.map((s) => t("sales_new.currency_summary.item", { count: s.count, currency: s.currency }));
  el.textContent = `${t("sales_new.currency_summary.label")} ${items.join(" \xB7 ")}`;
  el.classList.remove("hidden");
}
function _recomputeWaterfall(root, userConfig) {
  const lines = collectLines(root);
  const commissionLines = collectCommission(root);
  const overrides = collectWaterfallOverrides(root);
  _renderCurrencySummary(root, summarizeLineCurrencies(lines, commissionLines));
  const {
    sumReceipt: sr,
    sumPayment: sp,
    commissionTotal: cat,
    polReceiptSum,
    podReceiptSum,
    polPaymentSum,
    podPaymentSum
  } = computeQuoteTotals(lines, commissionLines.map((l) => l.net_after_tax || 0));
  const share = window.__vdg_wasm.commission_resolve_sales_share_pct(
    overrides.sales_share_pct_override,
    userConfig?.sales_share_pct ?? null
  );
  const w = window.__vdg_wasm.commission_waterfall(sr - sp, cat, share, false);
  const wf = { margin: w.margin, tax20: w.tndn, gp: w.net_after, finalProfit: w.lbs_share };
  renderWaterfall(root, {
    sumReceipt: sr,
    sumPayment: sp,
    margin: wf.margin,
    tax20: wf.tax20,
    gp: wf.gp,
    finalProfit: wf.finalProfit,
    salesSharePct: share,
    polReceiptSum,
    podReceiptSum,
    polPaymentSum,
    podPaymentSum
  });
  const qPay = root.querySelector("#quick-total-pay");
  const qCol = root.querySelector("#quick-total-collect");
  const qMar = root.querySelector("#quick-margin");
  const qPct = root.querySelector("#quick-margin-pct");
  const fmt = (v) => v ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "0";
  if (qPay) qPay.textContent = fmt(sp);
  if (qCol) qCol.textContent = fmt(sr);
  if (qMar) {
    qMar.textContent = fmt(wf.margin);
    if (wf.margin < 0) {
      qMar.className = "text-sm font-bold text-red-600 mt-0.5";
    } else if (wf.margin > 0) {
      qMar.className = "text-sm font-bold text-emerald-700 mt-0.5";
    } else {
      qMar.className = "text-sm font-semibold text-slate-900 mt-0.5";
    }
  }
  if (qPct) {
    if (sr > 0) {
      const pct = wf.margin / sr * 100;
      qPct.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
      qPct.className = `text-sm font-bold ${pct >= 0 ? "text-emerald-700" : "text-red-600"} mt-0.5`;
    } else {
      qPct.textContent = "\u2014";
      qPct.className = "text-sm font-semibold text-slate-900 mt-0.5";
    }
  }
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new/submit-orchestrator.js
var KIND_USER = "user";
var WARN_PNL_LINES_MISSING = "pnl_lines_empty";
var MAX_CE_CLEANUP = 20;
var INITIAL_LEDGER_VERSION = 1;
function _defaultLedgerRepo() {
  return typeof window !== "undefined" ? window.__vdg_ledger_repo : void 0;
}
function directionPrefix(direction) {
  return (direction || "").toLowerCase() === "import" ? "IM" : "EX";
}
function highlightErrors(root, errors) {
  root.querySelectorAll(".field-error").forEach(
    (el) => el.classList.remove("border-red-400", "field-error")
  );
  if (errors.some((e) => e === t("sales_new.validation.no_bill"))) {
    ["[name=mbl]", "[name=hbl]", "[name=job_file_no]"].forEach(
      (sel) => root.querySelector(sel)?.classList.add("border-red-400", "field-error")
    );
  }
  if (errors.some((e) => e === t("sales_new.validation.no_customer"))) {
    root.querySelector("[name=customer]")?.classList.add("border-red-400", "field-error");
  }
  if (errors.some((e) => e === t("sales_new.validation.closing_si_incomplete"))) {
    root.querySelector("[name=closing_si]")?.classList.add("border-red-400", "field-error");
  }
  if (errors.some((e) => e === t("sales_new.validation.closing_cy_incomplete"))) {
    root.querySelector("[name=closing_cy]")?.classList.add("border-red-400", "field-error");
  }
  const html = errors.map((e) => `<div>\u2022 ${e}</div>`).join("");
  for (const sel of ["#form-error-summary", "#shipment-form-errors"]) {
    const el = root.querySelector(sel);
    if (!el) continue;
    el.innerHTML = html;
    el.classList.toggle("hidden", errors.length === 0);
  }
}
async function _writePnlLines(repo, ref, shipment, version) {
  const lines = shipment.pnl_lines || [];
  for (let i = 0; i < lines.length; i++) {
    const id = pnlLineId(ref, i + 1);
    await repo.put("pnl_line", id, { ...lines[i], id, shipment_ref: ref, _ledger_version: version });
  }
}
async function _deletePnlLines(repo, ref) {
  await deletePnlLinesFor(repo, ref);
}
async function _loadStateAliasRows(repo) {
  return ensureShipmentStateAliases(repo);
}
async function _repCodeFor(repo, salesRepId) {
  const userId = `user:${salesRepId}`;
  const user = await repo.get(KIND_USER, userId).catch(() => null) || { id: userId, sales_code: null };
  return ensureRepCode(user, repo);
}
async function _jobNoTaken(repo, jobNo, excludeRef) {
  const matches = await listEnvelopes(repo, (s) => s.job_no === jobNo && s.shipment_ref !== excludeRef);
  return matches.length > 0;
}
async function _healJobNoCollision(repo, shipment, salesRepId) {
  const jobNo = shipment.job_no;
  if (!jobNo) return;
  const rivals = await listEnvelopes(repo, (s) => s.job_no === jobNo && s.shipment_ref !== shipment.shipment_ref);
  if (!rivals.length) return;
  const winner = [shipment.shipment_ref, ...rivals.map((r) => r.shipment_ref)].sort()[0];
  if (winner === shipment.shipment_ref) return;
  const fresh = await assignJobNo(repo, await _repCodeFor(repo, salesRepId));
  if (shipment.do_no === jobNo) shipment.do_no = fresh;
  if (shipment.hbl === jobNo) shipment.hbl = fresh;
  shipment.job_no = fresh;
  await putShipment(repo, shipment);
}
async function _resolveJobNo(state, repo, salesRepId, priorJobNo = null, ownRef = null) {
  if (state.job_no) {
    if (state.job_no === priorJobNo) return state.job_no;
    if (await _jobNoTaken(repo, state.job_no, ownRef)) {
      return assignJobNo(repo, await _repCodeFor(repo, salesRepId));
    }
    return state.job_no;
  }
  if (priorJobNo) return priorJobNo;
  return assignJobNo(repo, await _repCodeFor(repo, salesRepId));
}
async function _mintFreeShipmentRef(repo, dir, salesRepId) {
  if (!repo?.mint_shipment_ref) throw new Error("WASM repo not ready");
  return await repo.mint_shipment_ref(dir, String(salesRepId || ""));
}
async function _bestEffort(step) {
  try {
    await step();
  } catch (cleanupErr) {
    console.warn("[VDG] rollback step failed, original error preserved:", cleanupErr?.message || cleanupErr);
  }
}
async function submitForm(state, repo, salesRepId, ledgerRepo = _defaultLedgerRepo(), opts = {}) {
  if (!repo) throw new Error("Repo not available");
  const publish = opts.publish !== false;
  const dir = directionPrefix(deriveDirection(state));
  const ref = await _mintFreeShipmentRef(repo, dir, salesRepId);
  const stateAliasRows = await _loadStateAliasRows(repo);
  const jobNo = await _resolveJobNo(state, repo, salesRepId);
  const shipment = buildShipment(state, ref, salesRepId, { publishState: publish ? "publish_pending" : "draft", stateAliasRows, jobNo });
  shipment._ledger_version = INITIAL_LEDGER_VERSION;
  await putShipment(repo, shipment);
  await _healJobNoCollision(repo, shipment, salesRepId);
  await registerFsmEntity(ref, shipment.state);
  const warnings = [];
  if (!shipment.pnl_lines || shipment.pnl_lines.length === 0) {
    warnings.push(WARN_PNL_LINES_MISSING);
  }
  const commLines = shipment.commission_lines || [];
  const writtenCe = [];
  try {
    for (let i = 0; i < commLines.length; i++) {
      const key = `${ref}-CE${i + 1}`;
      const record = {
        ...commLines[i],
        shipment_ref: ref,
        occurred_at: todayLocal(),
        created_by: salesRepId || null,
        _ledger_version: INITIAL_LEDGER_VERSION
      };
      await repo.put("commission_entry", key, record);
      writtenCe.push({ key, record });
    }
    await _writePnlLines(repo, ref, shipment, INITIAL_LEDGER_VERSION);
    if (publish) await _handOverToAccounting(repo, shipment);
  } catch (err) {
    await _bestEffort(() => rollbackShipmentCreate(repo, ref));
    for (const { key } of writtenCe) await _bestEffort(() => repo.delete("commission_entry", key));
    await _bestEffort(() => _deletePnlLines(repo, ref));
    throw err;
  }
  const advancedTo = await autoAdvanceShipment(repo, shipment);
  return { ref, warnings, publishState: shipment.publish_state, advancedTo };
}
async function updateForm(state, repo, salesRepId, ref, ledgerRepo = _defaultLedgerRepo(), opts = {}) {
  if (!repo) throw new Error("Repo not available");
  const publish = opts.publish !== false;
  const prior = await getEnvelope(repo, ref).catch(() => null);
  const stateAliasRows = await _loadStateAliasRows(repo);
  const stateInput = { ...state, state: state.state ?? prior?.state };
  const jobNo = await _resolveJobNo(state, repo, salesRepId, prior?.job_no, ref);
  const shipment = buildShipment(stateInput, ref, salesRepId, { publishState: publish ? "publish_pending" : "draft", stateAliasRows, jobNo });
  shipment._ledger_version = (prior?._ledger_version || 0) + 1;
  await putShipment(repo, shipment);
  await _healJobNoCollision(repo, shipment, salesRepId);
  await registerFsmEntity(ref, shipment.state);
  for (let i = 1; i <= MAX_CE_CLEANUP; i++) {
    await repo.delete("commission_entry", `${ref}-CE${i}`);
  }
  await repo.delete("commission_entry", `${ref}-CR1`);
  const commLines = state.commission_lines || [];
  const written = [];
  for (let i = 0; i < commLines.length; i++) {
    const record = {
      ...commLines[i],
      shipment_ref: ref,
      occurred_at: todayLocal(),
      created_by: salesRepId || null,
      _ledger_version: shipment._ledger_version
    };
    await repo.put("commission_entry", `${ref}-CE${i + 1}`, record);
    written.push(record);
  }
  if (publish) await _handOverToAccounting(repo, shipment);
  await _deletePnlLines(repo, ref);
  await _writePnlLines(repo, ref, shipment, shipment._ledger_version);
  const advancedTo = await autoAdvanceShipment(repo, shipment);
  return { publishState: shipment.publish_state, advancedTo };
}
async function _handOverToAccounting(repo, shipment) {
  const { publishBilling } = await import("./billing-publish-repo-26C4LVB6.js");
  await publishBilling(repo, shipment, {});
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new/submit-guard.js
function createSubmitGuard() {
  let inFlight = false;
  return async function guardedSubmit(buttons, fn) {
    if (inFlight) return;
    inFlight = true;
    for (const btn of buttons) if (btn) btn.disabled = true;
    try {
      return await fn();
    } finally {
      inFlight = false;
      for (const btn of buttons) if (btn) btn.disabled = false;
    }
  };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/pnl-save-validations.js
function detectFxDeviation({ currency, fxRate, referenceRate }) {
  return fxDeviation(currency, fxRate, referenceRate);
}
function buildFxOverrideRecord(lineRef, {
  currency,
  fxRate,
  referenceRate,
  fxDate,
  threshold,
  reason,
  confirmedBy,
  confirmedAt
}) {
  return {
    line_ref: lineRef,
    currency,
    entered_fx_rate: fxRate,
    reference_rate: referenceRate ?? null,
    fx_date: fxDate || null,
    threshold,
    reason,
    confirmed_by: confirmedBy || null,
    confirmed_at: confirmedAt || (/* @__PURE__ */ new Date()).toISOString()
  };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new-form/pnl-fx-deviation-gate.js
var VND_CURRENCY2 = "VND";
async function _resolveReference(fxRepo, fxDate, currency, direction) {
  if (currency === VND_CURRENCY2) return 1;
  if (!fxRepo || !fxDate) return null;
  return getRateForDate(fxRepo, fxDate, currency, direction);
}
async function _checkSide(flagged, fxRepo, lineRef, { amount, currency, fxRate, fxDate, direction }) {
  if (!amount || !currency) return;
  const referenceRate = await _resolveReference(fxRepo, fxDate, currency, direction);
  const { flagged: isFlagged, reason, threshold } = detectFxDeviation({ currency, fxRate, referenceRate });
  if (isFlagged) {
    flagged.push({ lineRef, currency, fxRate, referenceRate, fxDate, reason, threshold });
  }
}
async function findFxDeviations(state = {}, fxRepo) {
  const flagged = [];
  const lines = state.lines || [];
  const commissionLines = state.commission_lines || [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await _checkSide(
      flagged,
      fxRepo,
      `${i}:buy:${l.desc || ""}`,
      { amount: l.buy_amt, currency: l.buy_currency, fxRate: l.buy_fx_rate, fxDate: l.buy_fx_date, direction: "Sell" }
    );
    await _checkSide(
      flagged,
      fxRepo,
      `${i}:sell:${l.desc || ""}`,
      { amount: l.sell_amt, currency: l.sell_currency, fxRate: l.sell_fx_rate, fxDate: l.sell_fx_date, direction: "Buy" }
    );
  }
  for (let i = 0; i < commissionLines.length; i++) {
    const l = commissionLines[i];
    await _checkSide(
      flagged,
      fxRepo,
      `C${i}:${l.kind || ""}`,
      { amount: l.amount_fx, currency: l.currency, fxRate: l.fx_rate, fxDate: l.fx_date, direction: "Sell" }
    );
  }
  return flagged;
}
function _confirmBody(flagged) {
  return flagged.map((f) => {
    const reasonLabel = f.reason === "non_positive" ? t("sales_new.fx_deviation.reason_non_positive") : t("sales_new.fx_deviation.reason_deviation");
    return `${f.lineRef}: ${f.currency} @ ${f.fxRate} \u2014 ${reasonLabel}`;
  }).join("\n");
}
async function confirmFxDeviations(flagged, { confirmedBy } = {}) {
  if (!flagged.length) return { proceed: true, overrides: [] };
  const proceed = await showConfirm({
    title: t("sales_new.fx_deviation.title"),
    body: `${t("sales_new.fx_deviation.body")}
${_confirmBody(flagged)}`,
    confirmLabel: t("sales_new.fx_deviation.confirm"),
    cancelLabel: t("sales_new.fx_deviation.cancel"),
    destructive: true
  });
  if (!proceed) return { proceed: false, overrides: [] };
  const confirmedAt = (/* @__PURE__ */ new Date()).toISOString();
  const overrides = flagged.map((f) => buildFxOverrideRecord(f.lineRef, {
    currency: f.currency,
    fxRate: f.fxRate,
    referenceRate: f.referenceRate,
    fxDate: f.fxDate,
    threshold: f.threshold,
    reason: f.reason,
    confirmedBy,
    confirmedAt
  }));
  return { proceed: true, overrides };
}

// output/web/js.tmp/implementations/ui/bootstrap/views/sales-new.js
function saveErrorText(err) {
  try {
    const envelope = JSON.parse(err.message);
    if (envelope && envelope.key) return t(envelope.key, envelope);
  } catch {
  }
  return `Error: ${err.message}`;
}
var DRAFT_TIMELINE_REF = "draft:new";
function mountPhaseTimeline(root, record) {
  const timeline = loadTimeline(record);
  if (!timeline) return;
  const host = root.querySelector("#phase-timeline");
  if (!host) return;
  const paint = (focus) => {
    host.innerHTML = renderTimeline(timeline, { focus });
    bindTimeline(host, paint);
  };
  paint(timeline.current);
}
var PERSONALIZATION_LOAD_TIMEOUT_MS = 5e3;
function showToast(msg, type = "info") {
  window.dispatchEvent(new CustomEvent("vdg:toast", { detail: { message: msg, type } }));
}
async function _fxRepo() {
  try {
    const { fxRateRepo } = await import("./fx-rate-repo-A2MFJJ6T.js");
    return fxRateRepo;
  } catch {
    return null;
  }
}
function _dispatchCommitted(formMount, repId) {
  if (!repId) return;
  const lineEls = Array.from(formMount.querySelectorAll("#lines-tbody tr[data-line]"));
  const lines = lineEls.map((row, i) => ({
    row_idx: i,
    observed_kind: row.querySelector("[name=kind]")?.value || "",
    predicted_kind: row.dataset.wmaPredicted || null
  }));
  window.dispatchEvent(new CustomEvent("vdg:shipment-committed", {
    detail: { rep_id: repId, lines, confirmed_ts: (/* @__PURE__ */ new Date()).toISOString() }
  }));
}
async function render(root, opts = {}) {
  const { editRef = null, mode = "create", salesId = "me", quotePrefill = null } = opts;
  const isEdit = mode === "edit" && !!editRef;
  const routeRep = salesId && salesId !== "me" ? salesId : null;
  const salesRepId = routeRep || selfRepCandidate(currentRoles(), currentSalesRepId() || "");
  const repo = window.__vdg_repo;
  let customers = [];
  let userConfig = null;
  let draft = null;
  let jobNo = null;
  let defaultCurrency = null;
  let reps = [];
  let revenueVisible = true;
  let carriers = [];
  let shipments = [];
  let weightUnits = [];
  if (repo) {
    const loadRes = await safeMasterLoad(async () => {
      const [customerList, carrierList, shipmentList, rawUserConfig, assignment, wsSettings, repList, uomList] = await Promise.all([
        repo.list("customers").catch(() => []),
        repo.list("carriers").catch(() => []),
        // F-43-08: 'shipment' (singular) is the registered kind -- 'shipments' resolved to
        // nothing and rendered the job list empty with no error.
        repo.list("shipment").catch((e) => {
          console.error("[sales-new] shipment list failed:", e);
          return [];
        }),
        salesRepId ? repo.get("user", `user:${salesRepId}`).catch((e) => {
          console.error("[sales-new] user get failed:", e);
          return null;
        }) : Promise.resolve(null),
        salesRepId ? repo.get("commission_rules", salesRepId).catch(() => null) : Promise.resolve(null),
        // Accounting's default currency — a LOCAL store read (workspace_settings kind), not a
        // Drive fetch. Read on edit too now: it doubles as the book currency the form's live
        // commission/line math compares against, not only the new-header seed.
        readSettings(repo),
        // F-41-01: the rep select's options — a master-kind read, same 5-min registry cache.
        getActiveSalesReps(repo).catch(() => []),
        // Weight-unit select's options — same registry read pattern as getContainerTypes()
        // (sales-quote-new.js): a master-kind list, filtered to the "weight" category client-side.
        repo.list("units-of-measure").catch(() => [])
      ]);
      let resolvedUserConfig = rawUserConfig;
      if (assignment?.sales_pct != null) {
        resolvedUserConfig = { ...rawUserConfig || {}, sales_share_pct: Number(assignment.sales_pct) };
      }
      let generatedJobNo = null;
      if (!isEdit && salesRepId) {
        try {
          const user = rawUserConfig || { id: `user:${salesRepId}`, sales_code: null };
          const repCode = await ensureRepCode(user, repo);
          generatedJobNo = await assignJobNo(repo, repCode);
        } catch {
        }
      }
      return { customerList, carrierList, shipmentList, userConfig: resolvedUserConfig, jobNo: generatedJobNo, wsSettings, repList, uomList };
    }, "sales-new:personalization", PERSONALIZATION_LOAD_TIMEOUT_MS);
    if (loadRes.ok) {
      customers = loadRes.value.customerList;
      carriers = loadRes.value.carrierList;
      shipments = loadRes.value.shipmentList;
      userConfig = loadRes.value.userConfig;
      jobNo = loadRes.value.jobNo;
      defaultCurrency = loadRes.value.wsSettings?.[DEFAULT_CURRENCY_FIELD] ?? null;
      reps = loadRes.value.repList;
      weightUnits = (loadRes.value.uomList || []).filter((u) => u.category === "weight").map((u) => u.code);
    }
  }
  if (isEdit) {
    try {
      if (repo) {
        const shipment = await getShipment(repo, editRef);
        if (shipment) revenueVisible = shipment[REVENUE_SEEN] !== false;
        const ce = await repo.get("commission_entry", `${editRef}-CR1`).catch(() => null);
        draft = shipmentToDraft(shipment, ce);
      }
    } catch {
    }
    root.innerHTML = `
      <div class="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200
                  text-amber-800 rounded-lg px-4 py-2 mx-6 mt-4 font-medium">
        <span>${t("sales_new.edit_banner")}</span>
        <span class="font-mono">${editRef}</span>
      </div>
      <div id="form-mount"></div>`;
  } else {
    if (quotePrefill) {
      draft = {
        quote_id: quotePrefill.quote_id,
        customer: quotePrefill.customer,
        pol: quotePrefill.pol,
        pod: quotePrefill.pod,
        volume: quotePrefill.container
        // shipment-builder maps volume → container_spec
      };
    }
    if (!draft) draft = await loadDraft();
    if (draft) {
      root.innerHTML = `
        <div id="draft-banner"
          class="flex items-center justify-between text-xs bg-blue-50 border border-blue-200
                 text-blue-700 rounded-lg px-4 py-2 mx-6 mt-4">
          <span>${t("sales_new.draft_restored")}</span>
          <button type="button" id="clear-draft-btn"
            class="underline text-blue-600 hover:text-blue-800">
            ${t("sales_new.draft_clear")}
          </button>
        </div>
        <div id="form-mount"></div>`;
      root.querySelector("#clear-draft-btn")?.addEventListener("click", async () => {
        await clearDraft();
        await render(root);
      });
    } else {
      root.innerHTML = '<div id="form-mount"></div>';
    }
  }
  if (draft && !draft.sales_rep) {
    const fromCust = customerRepFor(draft.customer, customers);
    if (fromCust && reps.some((r) => r.prefix === fromCust)) draft.sales_rep = fromCust;
  }
  const formMount = root.querySelector("#form-mount") || root;
  const fxRepo = await _fxRepo();
  await renderForm(formMount, {
    customers,
    salesRepId,
    userConfig,
    draft,
    mode,
    fxRepo,
    jobNo,
    defaultCurrency,
    revenueVisible,
    reps,
    editRef,
    carriers,
    shipments,
    weightUnits
  });
  mountPhaseTimeline(formMount, {
    ...draft || {},
    shipment_ref: editRef || draft?.shipment_ref || DRAFT_TIMELINE_REF,
    state: draft?.state || "Created"
  });
  const repSelect = formMount.querySelector("select[name=sales_rep]");
  if (!isEdit && repo && repSelect) {
    repSelect.addEventListener("change", async () => {
      const prefix = repSelect.value;
      if (!prefix) return;
      try {
        const user = await repo.get("user", `user:${prefix}`).catch((e) => {
          console.error("[sales-new] user get failed:", e);
          return null;
        }) || { id: `user:${prefix}`, sales_code: null };
        const code = await ensureRepCode(user, repo);
        const fresh = await assignJobNo(repo, code);
        const jobEl = formMount.querySelector("[name=job_no]");
        if (jobEl) jobEl.value = fresh;
        const disp = formMount.querySelector("[name=hbl_do_display]");
        if (disp && formMount.querySelector("[name=has_hbl]")?.checked) disp.value = fresh;
      } catch {
      }
    });
  }
  const guardedSubmit = createSubmitGuard();
  root.querySelector("#shipment-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const intent = e.submitter?.dataset?.intent === "save" ? "save" : "publish";
    const saveBtn = formMount.querySelector("#ni-save-btn");
    const publishBtn = formMount.querySelector("#ni-publish-btn");
    await guardedSubmit([saveBtn, publishBtn], async () => {
      const publish = intent === "publish";
      const state = collectFormState(formMount);
      const errors = validateShipmentForm(state, { publish });
      highlightErrors(root, errors);
      if (errors.length) {
        jumpToFirstError(root);
        return;
      }
      const flagged = await findFxDeviations(state, fxRepo);
      if (flagged.length) {
        const { proceed, overrides } = await confirmFxDeviations(
          flagged,
          { confirmedBy: currentUserEmail() || "unknown" }
        );
        if (!proceed) return;
        state._fx_overrides = overrides;
      }
      const repFinal = state.sales_rep || salesRepId;
      try {
        if (isEdit) {
          const { advancedTo } = await updateForm(state, repo, repFinal, editRef, void 0, { publish });
          _dispatchCommitted(formMount, repFinal);
          const key = publish ? "sales_new.publish_pending_toast" : "sales_new.saved_draft_toast";
          showToast(t(key).replace("{ref}", editRef), "success");
          if (advancedTo) {
            showToast(t("sales_new.auto_advanced", { state: t("shipment.status." + advancedTo) }), "success");
            navigate("/sales/edit/" + editRef);
          }
        } else {
          const { ref, advancedTo } = await submitForm(state, repo, repFinal, void 0, { publish });
          _dispatchCommitted(formMount, repFinal);
          await clearDraft();
          const key = publish ? "sales_new.publish_pending_toast" : "sales_new.saved_draft_toast";
          showToast(t(key).replace("{ref}", ref), "success");
          if (advancedTo) showToast(t("sales_new.auto_advanced", { state: t("shipment.status." + advancedTo) }), "success");
          navigate("/sales/edit/" + ref);
        }
      } catch (err) {
        showToast(saveErrorText(err), "error");
      }
    });
  });
}
export {
  render
};
