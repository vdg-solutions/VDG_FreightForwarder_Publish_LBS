// section-docs-ext.js — E-39: the booking/documentation fields the customer's job sheet carries
// beyond the original shipment header (booking no, reefer, cut-offs, depots, bill parties, seal, ATD).
//
// Rendered INTO the section-A grid (sales-new-form.js injects it after sectionAHtml) so the cells
// share the same 3-column rhythm — phase-screens.js then decides which cells each screen shows.
// Form input name === persisted record key, one vocabulary end to end (shipment-builder.js).

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { fld, txt, num, dateInp, selFld } from './section-header.js';

// contract values — value= stays raw, only the label translates (same rule as PRODUCT_OPTIONS)
export const FREIGHT_TERMS_OPTIONS = ['PREPAID', 'COLLECT'];
export const BILL_TYPE_OPTIONS     = ['SEAWAY', 'TELEX', 'SURRENDER', 'ORIGINAL'];

const FREIGHT_TERMS_LABEL_KEYS = {
  PREPAID: 'sales_new.freight_terms.prepaid',
  COLLECT: 'sales_new.freight_terms.collect',
};
const BILL_TYPE_LABEL_KEYS = {
  SEAWAY:    'sales_new.bill_type.seaway',
  TELEX:     'sales_new.bill_type.telex',
  SURRENDER: 'sales_new.bill_type.surrender',
  ORIGINAL:  'sales_new.bill_type.original',
};

function dtInp(name, val) {
  return `<input type="datetime-local" name="${name}" value="${val || ''}"
    class="w-full border border-slate-200 rounded px-2 py-1 text-xs" />`;
}

// hoisted out of the template — a quoted word inside ${} reads to the i18n gate as a label
// somebody forgot to translate (same rule as phase-timeline.js's POSITION_* consts)
const NAME_COMMODITY = 'commodity';
const NAME_ATD       = 'atd';
const NAME_ATA       = 'ata';

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const PKG_TYPES = ['CTNS', 'PLTS', 'BAGS', 'BOXES', 'CRATES', 'PKGS', 'DRUMS', 'ROLLS', 'SETS', 'UNITS'];

export function cargoItemRowHtml(idx, item = {}) {
  const pkgOpts = PKG_TYPES.map((p) =>
    `<option value="${p}"${(item.package_type || 'CTNS') === p ? ' selected' : ''}>${p}</option>`
  ).join('');
  return `
    <tr data-cargo-row="${idx}" class="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
      <td class="py-1 px-1.5 text-center text-slate-400 font-mono text-[10px]">${idx + 1}</td>
      <td class="py-1 px-1.5">
        <input type="text" name="cargo_desc_${idx}" data-cargo-field="description" value="${escHtml(item.description || '')}"
          placeholder="${t('sales_new.cargo.desc_ph') || 'Tên / mô tả mặt hàng'}"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="text" name="cargo_hs_${idx}" data-cargo-field="hs_code" value="${escHtml(item.hs_code || '')}" placeholder="HS Code"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_qty_${idx}" data-cargo-field="package_qty" value="${item.package_qty ?? ''}" min="0" step="1" placeholder="0"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <select name="cargo_pkg_${idx}" data-cargo-field="package_type" class="w-full border border-slate-200 rounded px-1 py-0.5 text-xs bg-white">
          ${pkgOpts}
        </select>
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_gw_${idx}" data-cargo-field="gross_weight_kg" value="${item.gross_weight_kg ?? ''}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_nw_${idx}" data-cargo-field="net_weight_kg" value="${item.net_weight_kg ?? ''}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="number" name="cargo_cbm_${idx}" data-cargo-field="volume_cbm" value="${item.volume_cbm ?? ''}" min="0" step="any" placeholder="0.00"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-right focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5">
        <input type="text" name="cargo_marks_${idx}" data-cargo-field="marks_and_numbers" value="${escHtml(item.marks_and_numbers || '')}" placeholder="N/M"
          class="w-full border border-slate-200 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none" />
      </td>
      <td class="py-1 px-1.5 text-center">
        <button type="button" data-rm-cargo="${idx}" class="text-slate-400 hover:text-rose-600 text-xs font-bold transition px-1">✕</button>
      </td>
    </tr>`;
}

export function cargoItemsCardHtml(cargoItems = []) {
  const items = Array.isArray(cargoItems) && cargoItems.length > 0 ? cargoItems : [{}];
  const trs = items.map((item, i) => cargoItemRowHtml(i, item)).join('');
  return `
    <div class="col-span-3 mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50" data-cargo-items-card>
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span class="text-blue-600">📦</span>
          <span>${t('sales_new.cargo.title') || 'Danh mục Hàng hóa (Cargo Items)'}</span>
        </div>
        <button type="button" id="btn-add-cargo-item"
          class="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium rounded border border-blue-200 transition flex items-center gap-1">
          <span>+</span>
          <span>${t('sales_new.cargo.add_item') || 'Thêm hàng hóa'}</span>
        </button>
      </div>
      <div class="overflow-x-auto rounded border border-slate-200 bg-white">
        <table class="w-full text-left text-xs border-collapse" id="cargo-items-table">
          <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
            <tr class="border-b border-slate-200">
              <th class="py-1.5 px-1.5 w-8 text-center">#</th>
              <th class="py-1.5 px-1.5 min-w-[140px]">${t('sales_new.cargo.col_desc') || 'Mô tả hàng hóa'}</th>
              <th class="py-1.5 px-1.5 w-24">${t('sales_new.cargo.col_hscode') || 'HS Code'}</th>
              <th class="py-1.5 px-1.5 w-20 text-right">${t('sales_new.cargo.col_qty') || 'Số kiện'}</th>
              <th class="py-1.5 px-1.5 w-24">${t('sales_new.cargo.col_pkg_type') || 'Loại kiện'}</th>
              <th class="py-1.5 px-1.5 w-24 text-right">${t('sales_new.cargo.col_gw') || 'GW (kg)'}</th>
              <th class="py-1.5 px-1.5 w-24 text-right">${t('sales_new.cargo.col_nw') || 'NW (kg)'}</th>
              <th class="py-1.5 px-1.5 w-24 text-right">${t('sales_new.cargo.col_cbm') || 'CBM (m³)'}</th>
              <th class="py-1.5 px-1.5 min-w-[100px]">${t('sales_new.cargo.col_marks') || 'Ký mã hiệu'}</th>
              <th class="py-1.5 px-1.5 w-8"></th>
            </tr>
          </thead>
          <tbody id="cargo-items-tbody">
            ${trs}
          </tbody>
          <tfoot class="bg-slate-50 font-semibold text-slate-700 border-t border-slate-200">
            <tr>
              <td colspan="3" class="py-1.5 px-2 text-right text-[11px]">${t('sales_new.cargo.total') || 'Tổng cộng:'}</td>
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

/** The extra grid cells, in DOM order: booking extras first, then bill/docs, then ATD, then cargo items card. */
export function docsExtHtml(d = {}) {
  return `
    ${fld(t('sales_new.field.booking_no'),        txt('booking_no', d.booking_no))}
    ${fld(t('sales_new.field.commodity'),         txt(NAME_COMMODITY, d.commodity))}
    ${fld(t('sales_new.field.container_qty'),     num('container_qty', d.container_qty))}
    ${fld(t('sales_new.field.reefer_temp'),       txt('reefer_temp', d.reefer_temp))}
    ${fld(t('sales_new.field.reefer_vent'),       txt('reefer_vent', d.reefer_vent))}
    ${fld(t('sales_new.field.closing_si'),        dtInp('closing_si', d.closing_si))}
    ${fld(t('sales_new.field.closing_cy'),        dtInp('closing_cy', d.closing_cy))}
    ${fld(t('sales_new.field.empty_pickup_depot'), txt('empty_pickup_depot', d.empty_pickup_depot))}
    ${fld(t('sales_new.field.full_return_depot'), txt('full_return_depot', d.full_return_depot))}
    ${fld(t('sales_new.field.place_of_receipt'),  txt('place_of_receipt', d.place_of_receipt))}
    ${fld(t('sales_new.field.place_of_delivery'), txt('place_of_delivery', d.place_of_delivery))}
    ${fld(t('sales_new.field.notify_party'),      txt('notify_party', d.notify_party))}
    ${fld(t('sales_new.field.for_delivery'),      txt('for_delivery', d.for_delivery))}
    ${fld(t('sales_new.field.seal_no'),           txt('seal_no', d.seal_no))}
    ${fld(t('sales_new.field.freight_terms'),
          selFld('freight_terms', FREIGHT_TERMS_OPTIONS, d.freight_terms, FREIGHT_TERMS_LABEL_KEYS))}
    ${fld(t('sales_new.field.bill_type'),
          selFld('doc_type', BILL_TYPE_OPTIONS, d.doc_type, BILL_TYPE_LABEL_KEYS))}
    ${fld(t('sales_new.field.volume_cbm'),        num('volume_cbm', d.volume_cbm))}
    ${fld(t('sales_new.field.atd'),               dateInp(NAME_ATD, d.atd))}
    ${fld(t('sales_new.field.ata'),               dateInp(NAME_ATA, d.ata))}
    ${fld(t('sales_new.field.customs_cleared_at'), dateInp('customs_cleared_at', d.customs_cleared_at))}
    ${fld(t('sales_new.field.haulage_signed_at'),  dateInp('haulage_signed_at', d.haulage_signed_at))}
    ${fld(t('sales_new.field.do_released_at'),     dateInp('do_released_at', d.do_released_at))}
    ${fld(t('sales_new.field.cargo_released_at'),  dateInp('cargo_released_at', d.cargo_released_at))}
    ${fld(t('sales_new.field.billing_paid_at'),    dateInp('billing_paid_at', d.billing_paid_at))}
    ${cargoItemsCardHtml(d.cargo_items)}`;
}

/** Recalculates sums across all cargo rows and auto-fills aggregate fields in the header. */
export function syncCargoRollup(root) {
  const tbody = root.querySelector('#cargo-items-tbody');
  if (!tbody) return;
  const rows = Array.from(tbody.querySelectorAll('tr[data-cargo-row]'));

  let totalQty = 0;
  let totalGw  = 0;
  let totalNw  = 0;
  let totalCbm = 0;
  const descriptions = [];

  for (const r of rows) {
    const qty = Number(r.querySelector('[data-cargo-field="package_qty"]')?.value) || 0;
    const gw  = Number(r.querySelector('[data-cargo-field="gross_weight_kg"]')?.value) || 0;
    const nw  = Number(r.querySelector('[data-cargo-field="net_weight_kg"]')?.value) || 0;
    const cbm = Number(r.querySelector('[data-cargo-field="volume_cbm"]')?.value) || 0;
    const desc = r.querySelector('[data-cargo-field="description"]')?.value?.trim() || '';

    totalQty += qty;
    totalGw  += gw;
    totalNw  += nw;
    totalCbm += cbm;
    if (desc) descriptions.push(desc);
  }

  const elQty = root.querySelector('#cargo-sum-qty');
  const elGw  = root.querySelector('#cargo-sum-gw');
  const elNw  = root.querySelector('#cargo-sum-nw');
  const elCbm = root.querySelector('#cargo-sum-cbm');

  if (elQty) elQty.textContent = totalQty.toLocaleString('vi-VN');
  if (elGw)  elGw.textContent  = totalGw.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  if (elNw)  elNw.textContent  = totalNw.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  if (elCbm) elCbm.textContent = totalCbm.toLocaleString('vi-VN', { maximumFractionDigits: 3 });

  // Auto-roll up to scalar fields if user populated cargo items
  if (rows.length > 0 && (totalQty > 0 || totalGw > 0 || totalCbm > 0 || descriptions.length > 0)) {
    const inpPieces = root.querySelector('input[name=pieces]');
    const inpGw     = root.querySelector('input[name=weight_actual_kg]');
    const inpCbm    = root.querySelector('input[name=volume_cbm]');
    const inpComm   = root.querySelector('input[name=commodity]');

    if (inpPieces && totalQty > 0) inpPieces.value = totalQty;
    if (inpGw && totalGw > 0)      inpGw.value     = totalGw;
    if (inpCbm && totalCbm > 0)    inpCbm.value    = totalCbm;
    if (inpComm && descriptions.length > 0) inpComm.value = descriptions.join('; ');
  }
}

export function collectCargoItems(root) {
  const rows = Array.from(root.querySelectorAll('#cargo-items-tbody tr[data-cargo-row]'));
  return rows.map((r, i) => {
    const val = (f) => r.querySelector(`[data-cargo-field="${f}"]`)?.value?.trim() || '';
    const num = (f) => {
      const v = Number(val(f));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    return {
      item_id: `itm-${i + 1}`,
      description: val('description') || null,
      hs_code: val('hs_code') || null,
      package_qty: num('package_qty'),
      package_type: val('package_type') || 'CTNS',
      gross_weight_kg: num('gross_weight_kg'),
      net_weight_kg: num('net_weight_kg'),
      volume_cbm: num('volume_cbm'),
      marks_and_numbers: val('marks_and_numbers') || null,
    };
  }).filter((item) => item.description || item.package_qty || item.gross_weight_kg || item.volume_cbm);
}

export function wireCargoItemsTable(root, onChanged = null) {
  const table = root.querySelector('#cargo-items-table');
  const tbody = root.querySelector('#cargo-items-tbody');
  const addBtn = root.querySelector('#btn-add-cargo-item');
  if (!table || !tbody) return;

  syncCargoRollup(root);

  tbody.addEventListener('input', () => {
    syncCargoRollup(root);
    onChanged?.();
  });

  addBtn?.addEventListener('click', () => {
    const nextIdx = tbody.querySelectorAll('tr[data-cargo-row]').length;
    const tr = document.createElement('tbody');
    tr.innerHTML = cargoItemRowHtml(nextIdx, {});
    tbody.appendChild(tr.firstElementChild);
    syncCargoRollup(root);
    onChanged?.();
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rm-cargo]');
    if (!btn) return;
    const row = btn.closest('tr[data-cargo-row]');
    if (row) {
      if (tbody.querySelectorAll('tr[data-cargo-row]').length <= 1) {
        // Clear instead of removing last row
        row.querySelectorAll('input').forEach((inp) => { inp.value = ''; });
      } else {
        row.remove();
        // renumber
        tbody.querySelectorAll('tr[data-cargo-row]').forEach((r, i) => {
          r.dataset.cargoRow = i;
          const numCell = r.querySelector('td:first-child');
          if (numCell) numCell.textContent = i + 1;
        });
      }
      syncCargoRollup(root);
      onChanged?.();
    }
  });
}

/** collectFormState delta for the ext fields — one list, so the collector cannot drift. */
export const DOCS_EXT_FIELDS = [
  'booking_no', 'commodity', 'container_qty', 'reefer_temp', 'reefer_vent',
  'closing_si', 'closing_cy', 'empty_pickup_depot', 'full_return_depot',
  'place_of_receipt', 'place_of_delivery', 'notify_party', 'for_delivery',
  'seal_no', 'freight_terms', 'doc_type', 'volume_cbm', 'atd',
  // F-41-03: phase evidence — each field is one ✗ row on the timeline turning ✓
  'ata', 'customs_cleared_at', 'haulage_signed_at', 'do_released_at',
  'cargo_released_at', 'billing_paid_at',
];

