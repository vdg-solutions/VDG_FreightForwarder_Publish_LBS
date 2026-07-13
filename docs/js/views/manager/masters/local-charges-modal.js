// Local Charge add/edit modal — split out of local-charges.js to stay under the 350-line
// cap (F-28-08). Carrier is a dropdown FK into the ocean-carriers master, not free text.

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const STATUS_LABEL = { free: 'Miễn phí', not_applicable: 'Không áp dụng', on_request: 'Theo yêu cầu' };
export const DIR_LABEL    = { export: 'Xuất', import: 'Nhập' };
const CHARGE_KIND_LABEL   = { standard: 'Tiêu chuẩn', demurrage: 'Lưu container (DEM)', detention: 'Lưu vỏ (DET)' };

// Exported for unit tests asserting the id shape a new row gets (F-28-08).
export function genId(scac, chargeCode) {
  return `${(scac || 'X').toUpperCase()}-${(chargeCode || 'CHG').toUpperCase()}-${Date.now()}`;
}

function optionsHtml(map, selected) {
  return Object.entries(map).map(([v, l]) => `<option value="${v}" ${selected === v ? 'selected' : ''}>${l}</option>`).join('');
}

function buildModal(entity, carriers, units) {
  const e = entity || {};
  const aliases  = (e.charge_aliases || []).join(', ');
  const mode     = e.amount_status ? 'status' : 'priced';
  const carrierOpts = carriers.map((c) => `<option value="${escHtml(c.scac)}" ${e.line_scac === c.scac ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('');
  const unitOpts     = units.map((u) => `<option value="${escHtml(u.code)}" ${e.unit_code === u.code ? 'selected' : ''}>${escHtml(u.label_vi || u.code)}</option>`).join('');
  return `
    <dialog id="lc-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="lc-modal-form" method="dialog" class="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? 'Sửa biểu phí' : 'Thêm biểu phí'}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Hãng tàu <span class="text-red-500">*</span></label>
            <select id="m-line-scac" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">-- chọn --</option>${carrierOpts}</select>
            <span id="m-err-line" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Chiều</label>
            <select id="m-direction" class="w-full border rounded-lg px-3 py-2 text-sm">${optionsHtml(DIR_LABEL, e.direction || 'export')}</select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Tên phí <span class="text-red-500">*</span></label>
            <input id="m-charge-name" type="text" value="${escHtml(e.charge_name)}" class="w-full border rounded-lg px-3 py-2 text-sm" />
            <span id="m-err-charge-name" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Mã phí <span class="text-red-500">*</span></label>
            <input id="m-charge-code" type="text" value="${escHtml(e.charge_code)}" class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" />
            <span id="m-err-charge-code" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Đơn vị tính <span class="text-red-500">*</span></label>
            <select id="m-unit-code" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">-- chọn --</option>${unitOpts}</select>
            <span id="m-err-unit" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Loại phí</label>
            <select id="m-charge-kind" class="w-full border rounded-lg px-3 py-2 text-sm">${optionsHtml(CHARGE_KIND_LABEL, e.charge_kind || 'standard')}</select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Số ngày miễn phí (DEM/DET)</label>
          <input id="m-free-days" type="number" min="0" value="${e.free_days ?? ''}" class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Cách tính giá</label>
          <select id="m-amount-mode" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="priced" ${mode === 'priced' ? 'selected' : ''}>Có giá (VND)</option>
            <option value="status" ${mode === 'status' ? 'selected' : ''}>Trạng thái</option>
          </select>
        </div>
        <div id="m-priced-fields" class="grid grid-cols-2 gap-3 ${mode === 'status' ? 'hidden' : ''}">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Giá chưa VAT</label>
            <input id="m-amt-ex" type="number" min="0" value="${e.amount_exclude_vat ?? ''}" class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Giá có VAT</label>
            <input id="m-amt-inc" type="number" min="0" value="${e.amount_include_vat ?? ''}" class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div id="m-status-fields" class="${mode === 'priced' ? 'hidden' : ''}">
          <label class="block text-xs font-medium text-slate-700 mb-1">Trạng thái giá</label>
          <select id="m-amount-status" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">-- chọn --</option>${optionsHtml(STATUS_LABEL, e.amount_status)}</select>
        </div>
        <span id="m-err-amount" class="hidden text-xs text-red-600"></span>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Cách gọi khác (alias)</label>
          <input id="m-aliases" type="text" value="${escHtml(aliases)}" placeholder="comma-separated" class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Lưu</button>
          <button type="button" id="btn-lc-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Hủy</button>
        </div>
      </form>
    </dialog>`;
}

export function openModal(root, entity, carriers, units, onSave) {
  root.querySelector('#lc-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity, carriers, units));
  const dialog = root.querySelector('#lc-modal');
  dialog.showModal();
  dialog.querySelector('#btn-lc-cancel').addEventListener('click', () => dialog.close());

  dialog.querySelector('#m-amount-mode').addEventListener('change', (ev) => {
    const isStatus = ev.target.value === 'status';
    dialog.querySelector('#m-priced-fields').classList.toggle('hidden', isStatus);
    dialog.querySelector('#m-status-fields').classList.toggle('hidden', !isStatus);
  });

  dialog.querySelector('#lc-modal-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    ['#m-err-line', '#m-err-charge-name', '#m-err-charge-code', '#m-err-unit', '#m-err-amount'].forEach((id) => setErr(id, ''));

    const lineScac   = dialog.querySelector('#m-line-scac').value;
    const chargeName = dialog.querySelector('#m-charge-name').value.trim();
    const chargeCode = dialog.querySelector('#m-charge-code').value.trim().toUpperCase();
    const unitCode    = dialog.querySelector('#m-unit-code').value;
    const direction   = dialog.querySelector('#m-direction').value;
    const chargeKind  = dialog.querySelector('#m-charge-kind').value;
    const freeDaysRaw = dialog.querySelector('#m-free-days').value;
    const amountMode  = dialog.querySelector('#m-amount-mode').value;
    const aliases     = dialog.querySelector('#m-aliases').value.split(',').map((a) => a.trim()).filter(Boolean);

    if (!lineScac)   { setErr('#m-err-line', 'Hãng tàu là bắt buộc'); return; }
    if (!chargeName) { setErr('#m-err-charge-name', 'Tên phí là bắt buộc'); return; }
    if (!chargeCode) { setErr('#m-err-charge-code', 'Mã phí là bắt buộc'); return; }
    if (!unitCode)   { setErr('#m-err-unit', 'Đơn vị tính là bắt buộc'); return; }

    let amountFields;
    if (amountMode === 'status') {
      const status = dialog.querySelector('#m-amount-status').value;
      if (!status) { setErr('#m-err-amount', 'Chọn trạng thái giá'); return; }
      amountFields = { amount_status: status };
    } else {
      const exVat  = Number(dialog.querySelector('#m-amt-ex').value);
      const incVat = Number(dialog.querySelector('#m-amt-inc').value);
      if (!Number.isFinite(exVat) || exVat < 0 || !Number.isFinite(incVat) || incVat < 0) {
        setErr('#m-err-amount', 'Giá phải là số hợp lệ ≥ 0'); return;
      }
      amountFields = { amount_exclude_vat: exVat, amount_include_vat: incVat };
    }

    const carrier  = carriers.find((c) => c.scac === lineScac);
    const freeDays = chargeKind === 'standard' || freeDaysRaw === '' ? null : Number(freeDaysRaw);

    const base = { ...(entity || {}) };
    delete base.amount_status; delete base.amount_exclude_vat; delete base.amount_include_vat; delete base.free_days;

    const updated = {
      ...base,
      id: entity?.id || genId(lineScac, chargeCode),
      line_scac: lineScac,
      line_name: carrier?.name || entity?.line_name || lineScac,
      charge_name: chargeName,
      charge_code: chargeCode,
      unit_code: unitCode,
      direction,
      charge_kind: chargeKind,
      charge_aliases: aliases,
      ...amountFields,
    };
    if (freeDays !== null) updated.free_days = freeDays; else delete updated.free_days;

    await onSave(updated);
    dialog.close();
  });
}
