// Commission rule add modal — split out of commission-rules.js to stay under the 350-line
// cap. Creates a rule for a sales_id outside the fixed per-user row set (F-57-01 CRUD
// completion). Bounds + the sales/company 100% split are validated by
// `commission_rule_split` (wasm) — this file never computes `100 - x` itself.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

export function buildAddModal() {
  return `
    <dialog id="cr-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-sm backdrop:bg-black/30">
      <form id="cr-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${t('commission_rules.add_button')}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('commission_rules.field.sales_id')} <span class="text-red-500">*</span></label>
          <input id="cr-sales-id" type="text" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="cr-err-sales-id" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('commission_rules.col.sales_pct')} <span class="text-red-500">*</span></label>
          <input id="cr-sales-pct" type="number" min="0" max="100" step="1" required
                 class="w-full border rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="cr-err-pct" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t('common.action.save')}</button>
          <button type="button" id="cr-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('common.action.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

/// `onSave(entity)` persists the rule; `entity.sales_pct` is already the Rust-validated
/// number (0..100) — the caller never re-derives or re-clamps it.
export function openAddModal(root, onSave) {
  root.querySelector('#cr-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildAddModal());
  const dialog = root.querySelector('#cr-modal');
  dialog.showModal();

  const setErr = (id, msg) => {
    const el = dialog.querySelector(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  };

  dialog.querySelector('#cr-modal-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#cr-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const salesId = dialog.querySelector('#cr-sales-id').value.trim();
    const pctRaw  = dialog.querySelector('#cr-sales-pct').value;
    setErr('#cr-err-sales-id', ''); setErr('#cr-err-pct', '');

    if (!salesId) { setErr('#cr-err-sales-id', t('commission_rules.err_sales_id_required')); return; }

    let split;
    try {
      split = window.__vdg_wasm.commission_rule_split(pctRaw === '' ? null : Number(pctRaw));
    } catch {
      setErr('#cr-err-pct', t('commission_rules.err_invalid_pct'));
      return;
    }

    await onSave({ id: salesId, sales_id: salesId, sales_pct: split.sales_pct, updated_at: new Date().toISOString() });
    dialog.close();
  });
}
