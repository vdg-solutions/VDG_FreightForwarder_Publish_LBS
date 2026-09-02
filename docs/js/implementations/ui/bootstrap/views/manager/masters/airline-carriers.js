// Airline Carriers master CRUD grid — F-16-03
// Route: /masters/airline-carriers

import { currentRoles } from '../../../../../ui/core_abstractions/ports/auth/session-roles.js';
import { canWriteMaster } from '../../../../core_abstractions/ports/cache/master-registry.js';
import { t }         from '../../../../../kernel/core_abstractions/i18n/index.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { safeMasterLoad, foldSyncFailure, renderMasterLoadRetryStatus } from '../../../../../kernel/core_abstractions/util/master-load.js';
import { listMasters, saveMaster, deleteMaster } from '../../../../core_abstractions/ports/data/master-repo.js';

const KIND        = 'airline-carriers';
const KIND_PREFIX = 'ACR';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId(iata) { return `${KIND_PREFIX}-${iata || Date.now()}`; }

function buildModal(entity) {
  const e = entity || {};
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('masters.airline_carriers.edit_title') : t('masters.airline_carriers.add_button')}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('airline_carriers.field.iata')} <span class="text-red-500">*</span></label>
            <input id="m-iata" type="text" maxlength="2" value="${escHtml(e.iata_code)}" required placeholder="e.g. VN"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="m-err-iata" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('airline_carriers.field.icao')} <span class="text-red-500">*</span></label>
            <input id="m-icao" type="text" maxlength="3" value="${escHtml(e.icao_code)}" required placeholder="e.g. HVN"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="m-err-icao" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('airline_carriers.field.name')} <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-name" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${t('common.action.save')}</button>
          <button type="button" id="btn-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('common.action.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, items, onSave) {
  root.querySelector('#master-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#master-modal');
  dialog.showModal();
  dialog.querySelector('#btn-modal-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const iata = dialog.querySelector('#m-iata').value.trim().toUpperCase();
    const icao = dialog.querySelector('#m-icao').value.trim().toUpperCase();
    const name = dialog.querySelector('#m-name').value.trim();

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#m-err-iata', ''); setErr('#m-err-icao', ''); setErr('#m-err-name', '');

    const wasm = window.__vdg_wasm;
    if (!wasm.validate_airline_iata(iata)) {
      setErr('#m-err-iata', '2 alphanumeric characters with at least one letter, e.g. VN or 5J');
      return;
    }
    if (!wasm.validate_airline_icao(icao)) { setErr('#m-err-icao', '3 uppercase letters, e.g. HVN'); return; }
    if (!name) { setErr('#m-err-name', 'Name is required'); return; }

    // AC-13 carrier: uniqueness on iata_code
    const codeItems = JSON.stringify(items.map((i) => ({ id: i.id, code: i.iata_code })));
    if (wasm.check_code_unique(codeItems, iata, entity?.id ?? null)) {
      setErr('#m-err-iata', `Airport IATA code ${iata} already exists`);
      return;
    }

    const updated = { ...(entity || {}), id: entity?.id || genId(iata), iata_code: iata, icao_code: icao, name };
    await onSave(updated);
    dialog.close();
  });
}

function rowHtml(e, isM) {
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">${t('common.action.edit')}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">${t('common.action.delete')}</button>` : '';
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      <td class="px-3 py-2 font-mono">${escHtml(e.iata_code)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.icao_code)}</td>
      <td class="px-3 py-2">${escHtml(e.name)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

export async function render(root) {
  const isM  = canWriteMaster(KIND, currentRoles());
  const repo = window.__vdg_repo;
  const actCol = isM ? `<th class="px-3 py-2 text-left w-28">${t('common.col.actions')}</th>` : '';

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('masters.airline_carriers.title')}</div>
        ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t('masters.airline_carriers.add_button')}</button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('airline_carriers.col.iata')}</th>
              <th class="px-3 py-2 text-left">${t('airline_carriers.col.icao')}</th>
              <th class="px-3 py-2 text-left">${t('airline_carriers.col.name')}</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">${t('airline_carriers.empty')}</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading...</div>
    </div>`;

  let items = [];

  // F-20-01: bounded — a stalled Drive read/write on a fresh workspace resolves to an
  // actionable retry instead of hanging at "Loading...".
  async function reload() {
    const tbody    = root.querySelector('#m-tbody');
    const emptyEl  = root.querySelector('#m-empty');
    const statusEl = root.querySelector('#m-status');
    if (!repo) { items = []; if (tbody) tbody.innerHTML = ''; if (statusEl) statusEl.textContent = ''; return; }

    const listRes = foldSyncFailure(await safeMasterLoad(() => listMasters(KIND), 'airline-carriers:list'), KIND, repo);
    if (!listRes.ok) {
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('retry'), reload);
      return;
    }
    items = listRes.value;
    if (tbody) tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
  }

  await reload();

  root.querySelector('#btn-add')?.addEventListener('click', () => {
    openModal(root, null, items, async (entity) => { await saveMaster(KIND, entity); await reload(); });
  });

  root.querySelector('#m-tbody')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, items, async (u) => { await saveMaster(KIND, u); await reload(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: t('airline_carriers.confirm_delete'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      // A row whose key field is empty cannot be addressed, and `deleteMaster` throws on it.
      // Unhandled, that throw left the row on screen with nothing said -- the exact
      // "delete does nothing" the operator reported. A refusal is an ANSWER; it gets shown.
      try {
        await deleteMaster(KIND, delBtn.dataset.id);
      } catch (err) {
        await showConfirm({ title: t('masters.delete_failed'), confirmLabel: t('common.action.ok'), cancelLabel: '' });
        console.warn('delete refused', err); // DEV
        return;
      }
    }
  });
}
