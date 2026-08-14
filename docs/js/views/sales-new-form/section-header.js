// section-header.js — Section A: identity, parties, routing, commercial

import { t } from '../../i18n/index.js';
import { resolveSalesRepLabel } from '../../util/sales-rep-i18n.js';
import { getCurrentUser } from '../../auth/google-oauth.js';
import { deriveDirection } from '../sales-new/shipment-builder.js';
// the header fallback literal lives in ONE place; three copies is what the cross-side guards police
import { DEFAULT_HEADER_CURRENCY } from './pnl-line-fx.js';

const CURRENCY_OPTIONS = ['USD', 'VND', 'EUR', 'SGD', 'JPY'];
// contract values (VALID_PRODUCTS in pnl_combined_row_mapper/shipment.rs) — value= stays raw, only the label translates
const PRODUCT_OPTIONS  = ['FCL EXPORT', 'IMPORT FCL', 'AIR', 'LCL'];
const MODE_OPTIONS     = ['SEA', 'AIR'];
// F-41-07: direction is a FIELD of the shipment, not a fact about the product. FCL EXPORT and
// IMPORT FCL happen to name it, AIR and LCL do not — and the customs check reads `direction`, so
// an air job left it Unknown forever and could never leave Arrived. Collect it here: pre-filled
// and read-only where the product already decides, an open required choice where it does not.
const DIRECTION_OPTIONS    = ['export', 'import'];
const DIRECTION_LABEL_KEYS = { export: 'sales_new.direction_option.export', import: 'sales_new.direction_option.import' };
// field-key names, hoisted so the i18n linter reads them as identifiers rather than as bare
// English prose inside the markup template (same carve-out shape as NAME_ATA in section-docs-ext)
const NAME_DIRECTION         = 'direction';
const NAME_DIRECTION_DISPLAY = 'direction_display';
const PRODUCT_LABEL_KEYS = { 'FCL EXPORT': 'sales_new.product_option.fcl_export', 'IMPORT FCL': 'sales_new.product_option.import_fcl', AIR: 'sales_new.product_option.air', LCL: 'sales_new.product_option.lcl' };
const MODE_LABEL_KEYS    = { SEA: 'sales_new.mode_selector.sea', AIR: 'sales_new.mode_selector.air' };

/** The direction the product itself settles, or '' when the user must say. */
export function directionFromProduct(product) {
  return deriveDirection({ product }) || '';
}

function directionSel(draft) {
  const fromProduct = directionFromProduct(draft.product);
  const selected    = fromProduct || draft.direction || '';
  const locked      = fromProduct ? ' disabled' : '';
  // A disabled select submits nothing, so mirror the settled value in a hidden twin — the record
  // must carry `direction` whether the user picked it or the product did.
  const mirror = fromProduct ? `<input type="hidden" name="${NAME_DIRECTION}" value="${fromProduct}" />` : '';
  return `<select name="${fromProduct ? NAME_DIRECTION_DISPLAY : NAME_DIRECTION}"${locked}
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs${locked ? ' bg-slate-50' : ''}">
    <option value="">—</option>${DIRECTION_OPTIONS.map((o) =>
      `<option value="${o}"${o === selected ? ' selected' : ''}>${t(DIRECTION_LABEL_KEYS[o])}</option>`).join('')}
  </select>${mirror}`;
}

export function fld(label, inner) {
  return `
    <div>
      <label class="block text-[10px] text-slate-500 mb-0.5">${label}</label>
      ${inner}
    </div>`;
}

// field with extra wrapper attrs (for data-sea-only / data-air-only)
function cfld(label, inner, attr) {
  return `
    <div ${attr}>
      <label class="block text-[10px] text-slate-500 mb-0.5">${label}</label>
      ${inner}
    </div>`;
}

export function txt(name, val, ph) {
  const phAttr = ph ? ` placeholder="${ph}"` : '';
  return `<input type="text" name="${name}" value="${val || ''}"${phAttr}
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

export function num(name, val) {
  return `<input type="number" name="${name}" value="${val || ''}" step="any"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

function roNum(name, val) {
  return `<input type="number" name="${name}" value="${val || ''}" step="any" readonly
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50" />`;
}

export function dateInp(name, val) {
  return `<input type="date" name="${name}" value="${val || ''}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

function optHtml(options, selected, labelKeys) {
  return options.map((o) =>
    `<option value="${o}"${o === selected ? ' selected' : ''}>${labelKeys ? t(labelKeys[o] || o) : o}</option>`
  ).join('');
}

export function selFld(name, options, selected, labelKeys) {
  return `<select name="${name}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">—</option>${optHtml(options, selected, labelKeys)}
  </select>`;
}

// Custom combobox with semantic search
function custSel(customers, selected, isAutofilled) {
  const autofillAttr = isAutofilled ? ' data-autofilled="true"' : '';
  return `
    <div class="relative" id="customer-search-container">
      <input type="hidden" name="customer" value="${selected || ''}" />
      <input type="text" id="customer-search-input" value="${selected || ''}" placeholder="${t('sales_new.select_placeholder')}" autocomplete="off"${autofillAttr}
        class="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-200" />
      <div id="customer-search-dropdown" class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg hidden flex-col max-h-48 overflow-y-auto text-xs">
        <!-- results go here -->
      </div>
    </div>`;
}

// F-41-01: the rep field is a SELECT over provisioned reps (value = fork prefix), not free text —
// what it holds names the revenue fork, the publish fork and the Job No namespace, none of which
// a typed label can address. A prior value that is not in the active list (rep left, legacy
// record) stays offered so an edit never silently loses it; a sentinel ('__MANAGER__') is a role
// token, not a rep, and is NOT re-offered — resaving such a record forces a real pick.
function repOptionLabel(r) {
  return r.sales_code ? `${r.name} (${r.sales_code})` : r.name;
}

function repSel(reps, selected, currentUser) {
  const known  = (reps || []).some((r) => r.prefix === selected);
  const legacy = selected && !known && !/^__.*__$/.test(selected)
    ? `<option value="${selected}" selected>${resolveSalesRepLabel(selected, currentUser, t)}</option>` : '';
  const opts = (reps || []).map((r) =>
    `<option value="${r.prefix}"${r.prefix === selected ? ' selected' : ''}>${repOptionLabel(r)}</option>`).join('');
  return `<select name="sales_rep" class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">${t('sales_new.select_placeholder')}</option>${legacy}${opts}
  </select>`;
}

// F-41-02: the job-side quote door. Options load when the picker opens (quote-attach.js);
// at render it only shows what is already attached, so an edit reads truthfully offline.
function quotePickSel(quoteId) {
  const current = quoteId ? `<option value="${quoteId}" selected>${quoteId}</option>` : '';
  return `<select name="quote_pick" class="w-full border border-slate-200 rounded px-2 py-1 text-xs">
    <option value="">${t('sales_new.quote_pick_placeholder')}</option>${current}
  </select>`;
}

export function sectionAHtml(draft = {}, customers = [], reps = []) {
  const d    = draft;
  const mode = (d.mode || 'SEA').toUpperCase();
  const seaHide = mode === 'AIR' ? ' class="hidden"' : '';
  const airHide = mode === 'AIR' ? '' : ' class="hidden"';
  return `
    <div id="sec-a-body" class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
        ${t('sales_new.section.header')}
      </div>
      <input type="hidden" name="quote_id" value="${d.quote_id || ''}" />
      <div class="grid grid-cols-3 gap-3">
        ${fld(t('sales_new.mode_selector.title'),
          selFld('mode', MODE_OPTIONS, mode, MODE_LABEL_KEYS))}
        ${fld(t('sales_new.field.mbl'),      txt('mbl', d.mbl))}
        ${fld(t('sales_new.field.job_no'), `<div class="flex items-center gap-2"><input type="text" name="job_no" value="${d.job_no || ''}" readonly class="flex-1 border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-mono" /><label class="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap"><input type="checkbox" name="has_hbl" ${d.has_hbl ? 'checked' : ''} class="h-3.5 w-3.5" />${t('sales_new.field.has_hbl')}</label></div>`)}
        ${cfld(t('sales_new.field.hbl_do'), `<input type="text" name="hbl_do_display" value="${d.has_hbl ? (d.job_no || '') : ''}" readonly class="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-slate-50 font-mono" />`, `data-hbl-do-row${d.has_hbl ? '' : ' class="hidden"'}`)}
        ${fld(t('sales_new.field.product'),  selFld('product', PRODUCT_OPTIONS, d.product, PRODUCT_LABEL_KEYS))}
        ${fld(t('sales_new.field.direction'), directionSel(d))}
        ${fld(t('sales_new.field.customer'), custSel(customers, d.customer, d._autofilled))}
        ${fld(t('sales_new.field.quote_pick'), quotePickSel(d.quote_id))}
        ${fld(t('sales_new.field.shipper'),   txt('shipper',  d.shipper))}
        ${fld(t('sales_new.field.consignee'), txt('consignee', d.consignee))}
        ${fld(t('sales_new.field.contact'),   txt('contact_person', d.contact_person))}
        ${cfld(t('sales_new.field.vessel'),   txt('vessel', d.vessel),    `data-sea-only${seaHide}`)}
        ${fld(t('sales_new.field.carrier'),   txt('carrier', d.carrier))}
        ${fld(t('sales_new.field.etd'),       dateInp('etd', d.etd))}
        ${fld(t('sales_new.field.eta'),       dateInp('eta', d.eta))}
        ${fld(t('sales_new.field.pol'),       txt('pol', d.pol, 'VNSGN'))}
        ${fld(t('sales_new.field.pod'),       txt('pod', d.pod, 'USLAX'))}
        ${cfld(t('sales_new.field.volume'),   txt('volume', d.volume, '1X40HC'), `data-sea-only${seaHide}`)}
        ${fld(t('sales_new.field.roe_buy'),  num('roe_buying', d.roe_buying))}
        ${fld(t('sales_new.field.roe_sell'), num('roe_selling', d.roe_selling))}
        ${fld(t('sales_new.field.currency'),
          selFld('currency', CURRENCY_OPTIONS, d.currency || DEFAULT_HEADER_CURRENCY))}
        <div>
          <label class="block text-[10px] text-slate-500 mb-0.5">${t('sales_new.field.sales_rep')}</label>
          <div class="flex gap-1">
            ${repSel(reps, d.sales_rep, getCurrentUser())}
            <span id="doc-type-badge"
              class="hidden text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 self-center">
            </span>
          </div>
        </div>
        ${fld(t('sales_new.field.weight_actual'), num('weight_actual_kg', d.weight_actual_kg))}
        ${cfld(t('sales_new.field.dim_l'),         num('dim_l_cm', d.dim_l_cm),                `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dim_w'),         num('dim_w_cm', d.dim_w_cm),                `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dim_h'),         num('dim_h_cm', d.dim_h_cm),                `data-air-only${airHide}`)}
        ${fld(t('sales_new.field.pieces'),        num('pieces', d.pieces))}
        ${cfld(t('sales_new.field.uld_type'),      txt('uld_type', d.uld_type),                 `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.flight_no'),     txt('flight_no', d.flight_no),               `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.origin_iata'),   txt('origin_iata', d.origin_iata, 'SGN'),    `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.dest_iata'),     txt('dest_iata', d.dest_iata, 'HAN'),        `data-air-only${airHide}`)}
        ${cfld(t('sales_new.field.chargeable_kg'), roNum('chargeable_kg', d.chargeable_kg),     `data-air-only${airHide}`)}
      </div>
    </div>`;
}
