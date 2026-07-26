// Local Charge add/edit modal — split out of local-charges.js to stay under the 350-line
// cap (F-28-08). Carrier is a dropdown FK into the ocean-carriers master, not free text.

import { t, currentLocale } from '../../../i18n/index.js';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// AC-01 rework: locale-pick mirrors reports.js accountName — label_en in EN, label_vi in VI.
function uomLabel(u) {
  return currentLocale() === 'en' ? (u?.label_en || u?.label_vi || u?.code) : (u?.label_vi || u?.code);
}

// Module-const gotcha: t() must not resolve before the locale JSON loads — build the
// label maps as functions, called per render, never as a frozen module const.
export function statusLabels() {
  return {
    free: t('local_charges.status.free'),
    not_applicable: t('local_charges.status.not_applicable'),
    on_request: t('local_charges.status.on_request'),
  };
}
function dirLabels() {
  return { export: t('local_charges.dir.export'), import: t('local_charges.dir.import') };
}
function chargeKindLabels() {
  return {
    standard: t('local_charges.kind.standard'),
    demurrage: t('local_charges.kind.demurrage'),
    detention: t('local_charges.kind.detention'),
  };
}

// Exported for unit tests asserting the id shape a new row gets (F-28-08).
export function genId(scac, chargeCode) {
  return `${(scac || 'X').toUpperCase()}-${(chargeCode || 'CHG').toUpperCase()}-${Date.now()}`;
}

function optionsHtml(map, selected) {
  return Object.entries(map).map(([v, l]) => `<option value="${v}" ${selected === v ? 'selected' : ''}>${l}</option>`).join('');
}

function buildModal(entity, carriers, units, primaryLabel) {
  const e = entity || {};
  const aliases  = (e.charge_aliases || []).join(', ');
  const mode     = e.amount_status ? 'status' : 'priced';
  const carrierOpts = carriers.map((c) => `<option value="${escHtml(c.scac)}" ${e.line_scac === c.scac ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('');
  const unitOpts     = units.map((u) => `<option value="${escHtml(u.code)}" ${e.unit_code === u.code ? 'selected' : ''}>${escHtml(uomLabel(u))}</option>`).join('');
  return `
    <dialog id="lc-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="lc-modal-form" method="dialog" class="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('local_charges.modal.title_edit') : t('local_charges.modal.title_add')}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.col.carrier')} <span class="text-red-500">*</span></label>
            <select id="m-line-scac" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">${t('common.select.placeholder')}</option>${carrierOpts}</select>
            <span id="m-err-line" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.direction')}</label>
            <select id="m-direction" class="w-full border rounded-lg px-3 py-2 text-sm">${optionsHtml(dirLabels(), e.direction || 'export')}</select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.charge_name')} <span class="text-red-500">*</span></label>
            <input id="m-charge-name" type="text" value="${escHtml(e.charge_name)}" class="w-full border rounded-lg px-3 py-2 text-sm" />
            <span id="m-err-charge-name" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.charge_code')} <span class="text-red-500">*</span></label>
            <input id="m-charge-code" type="text" value="${escHtml(e.charge_code)}" class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase" />
            <span id="m-err-charge-code" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.unit_label')} <span class="text-red-500">*</span></label>
            <select id="m-unit-code" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">${t('common.select.placeholder')}</option>${unitOpts}</select>
            <span id="m-err-unit" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.charge_kind')}</label>
            <select id="m-charge-kind" class="w-full border rounded-lg px-3 py-2 text-sm">${optionsHtml(chargeKindLabels(), e.charge_kind || 'standard')}</select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.free_days')}</label>
          <input id="m-free-days" type="number" min="0" value="${e.free_days ?? ''}" class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.amount_mode')}</label>
          <select id="m-amount-mode" class="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="priced" ${mode === 'priced' ? 'selected' : ''}>${t('local_charges.modal.mode_priced')}</option>
            <option value="status" ${mode === 'status' ? 'selected' : ''}>${t('local_charges.modal.mode_status')}</option>
          </select>
        </div>
        <div id="m-priced-fields" class="grid grid-cols-2 gap-3 ${mode === 'status' ? 'hidden' : ''}">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.amt_excl')}</label>
            <input id="m-amt-ex" type="number" min="0" value="${e.amount_exclude_vat ?? ''}" class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.amt_incl')}</label>
            <input id="m-amt-inc" type="number" min="0" value="${e.amount_include_vat ?? ''}" class="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div id="m-status-fields" class="${mode === 'priced' ? 'hidden' : ''}">
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('local_charges.modal.amount_status')}</label>
          <select id="m-amount-status" class="w-full border rounded-lg px-3 py-2 text-sm"><option value="">${t('common.select.placeholder')}</option>${optionsHtml(statusLabels(), e.amount_status)}</select>
        </div>
        <span id="m-err-amount" class="hidden text-xs text-red-600"></span>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('common.field.aliases')}</label>
          <input id="m-aliases" type="text" value="${escHtml(aliases)}" placeholder="comma-separated" class="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${primaryLabel || t('common.action.save')}</button>
          <button type="button" id="btn-lc-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('common.action.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

// F-28-12: 6th arg primaryLabel overrides the submit button text (Propose vs Save, AC-01).
export function openModal(root, entity, carriers, units, onSave, primaryLabel) {
  root.querySelector('#lc-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity, carriers, units, primaryLabel));
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

    if (!lineScac)   { setErr('#m-err-line', t('local_charges.modal.err_carrier_required')); return; }
    if (!chargeName) { setErr('#m-err-charge-name', t('local_charges.modal.err_charge_name_required')); return; }
    if (!chargeCode) { setErr('#m-err-charge-code', t('local_charges.modal.err_charge_code_required')); return; }
    if (!unitCode)   { setErr('#m-err-unit', t('local_charges.modal.err_unit_required')); return; }

    let amountFields;
    if (amountMode === 'status') {
      const status = dialog.querySelector('#m-amount-status').value;
      if (!status) { setErr('#m-err-amount', t('local_charges.modal.err_status_required')); return; }
      amountFields = { amount_status: status };
    } else {
      const exVat  = Number(dialog.querySelector('#m-amt-ex').value);
      const incVat = Number(dialog.querySelector('#m-amt-inc').value);
      if (!Number.isFinite(exVat) || exVat < 0 || !Number.isFinite(incVat) || incVat < 0) {
        setErr('#m-err-amount', t('local_charges.modal.err_amount_invalid')); return;
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
