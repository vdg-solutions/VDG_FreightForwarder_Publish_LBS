// ULD Types master CRUD grid — F-16-04
// Route: /masters/uld-types

import { isManager }                    from '../../../auth/auth-gate.js';
import { t }                            from '../../../i18n/index.js';
import { validateUldCode, checkUldCodeUnique } from '../../../util/uld-validators.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { boundedList, boundedSeedIfEmpty, renderMasterLoadRetryStatus } from '../../../util/master-load.js';

const KIND        = 'uld-types';
const KIND_PREFIX = 'ULD';
const SEED_URL    = 'seed/masters/uld-types.jsonl';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId(code) { return `${KIND_PREFIX}-${code || Date.now()}`; }

function buildModal(entity) {
  const e    = entity || {};
  const pSel = `<option value="Pallet"${e.kind === 'Pallet' ? ' selected' : ''}>Pallet</option>`;
  const cSel = `<option value="Container"${e.kind === 'Container' ? ' selected' : ''}>Container</option>`;
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('masters.uld_types.edit_title') : t('masters.uld_types.add_button')}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.uld_types.col_code')} <span class="text-red-500">*</span></label>
            <input id="m-code" type="text" maxlength="3" value="${escHtml(e.code)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="m-err-code" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.uld_types.col_kind')} <span class="text-red-500">*</span></label>
            <select id="m-kind" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              ${pSel}${cSel}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Name <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.uld_types.col_tare')} <span class="text-red-500">*</span></label>
            <input id="m-tare" type="number" step="0.1" min="0" value="${e.tare_kg ?? ''}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('masters.uld_types.col_mgw')} <span class="text-red-500">*</span></label>
            <input id="m-mgw" type="number" step="0.1" min="0" value="${e.mgw_kg ?? ''}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="m-err-mgw" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Volume (m³)</label>
            <input id="m-vol" type="number" step="0.01" min="0" value="${e.max_volume_m3 ?? ''}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Positions</label>
            <input id="m-pos" type="text" value="${escHtml((e.position_codes || []).join(','))}" placeholder="L1,L2"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Save</button>
          <button type="button" id="btn-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
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
  dialog.querySelector('#modal-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const code  = dialog.querySelector('#m-code').value.trim().toUpperCase();
    const kind  = dialog.querySelector('#m-kind').value;
    const name  = dialog.querySelector('#m-name').value.trim();
    const tare  = parseFloat(dialog.querySelector('#m-tare').value);
    const mgw   = parseFloat(dialog.querySelector('#m-mgw').value);
    const volRaw = dialog.querySelector('#m-vol').value.trim();
    const posRaw = dialog.querySelector('#m-pos').value.trim();

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#m-err-code', ''); setErr('#m-err-mgw', '');

    const codeErr = validateUldCode(code);
    if (codeErr) { setErr('#m-err-code', codeErr); return; }
    const dupErr = checkUldCodeUnique(items, code, entity?.id);
    if (dupErr)  { setErr('#m-err-code', dupErr); return; }
    if (mgw <= tare) { setErr('#m-err-mgw', 'MGW must exceed tare'); return; }

    const max_volume_m3  = volRaw ? parseFloat(volRaw) : null;
    const position_codes = posRaw ? posRaw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const updated = {
      ...(entity || {}),
      id: entity?.id || genId(code),
      code, kind, name, tare_kg: tare, mgw_kg: mgw,
      ...(max_volume_m3 != null ? { max_volume_m3 } : {}),
      position_codes,
    };
    if (max_volume_m3 == null) delete updated.max_volume_m3;
    await onSave(updated);
    dialog.close();
  });
}

function rowHtml(e, isM) {
  const actions = isM ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${e.id}">Edit</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${e.id}">Delete</button>` : '';
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-id="${e.id}">
      <td class="px-3 py-2 font-mono font-semibold">${escHtml(e.code)}</td>
      <td class="px-3 py-2">${escHtml(e.name)}</td>
      <td class="px-3 py-2">${escHtml(e.kind)}</td>
      <td class="px-3 py-2 text-right">${e.tare_kg ?? ''}</td>
      <td class="px-3 py-2 text-right">${e.mgw_kg ?? ''}</td>
      <td class="px-3 py-2 text-right">${e.max_volume_m3 ?? '—'}</td>
      <td class="px-3 py-2 font-mono">${(e.position_codes || []).join(', ') || '—'}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

export async function render(root) {
  const isM  = isManager();
  const repo = window.__vdg_repo;
  const actCol = isM ? '<th class="px-3 py-2 text-left w-28">Actions</th>' : '';

  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('masters.uld_types.title')}</div>
        ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t('masters.uld_types.add_button')}</button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('masters.uld_types.col_code')}</th>
              <th class="px-3 py-2 text-left">Name</th>
              <th class="px-3 py-2 text-left">${t('masters.uld_types.col_kind')}</th>
              <th class="px-3 py-2 text-right">${t('masters.uld_types.col_tare')}</th>
              <th class="px-3 py-2 text-right">${t('masters.uld_types.col_mgw')}</th>
              <th class="px-3 py-2 text-right">Volume (m³)</th>
              <th class="px-3 py-2 text-left">Positions</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">No ULD types found.</div>
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

    const listRes = await boundedList(repo, KIND, 'uld-types:list');
    if (!listRes.ok) {
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('retry'), reload);
      return;
    }
    items = listRes.value;
    if (isM) items = await boundedSeedIfEmpty(repo, KIND, SEED_URL, items, (e) => genId(e.code), 'uld-types:seed');
    if (tbody)   tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
  }

  await reload();

  root.querySelector('#btn-add')?.addEventListener('click', () => {
    openModal(root, null, items, async (entity) => { await repo.put(KIND, entity.id, entity); await reload(); });
  });

  root.querySelector('#m-tbody')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, items, async (u) => { await repo.put(KIND, u.id, u); await reload(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Delete this ULD type?', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
