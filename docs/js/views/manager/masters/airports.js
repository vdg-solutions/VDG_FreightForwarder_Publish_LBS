// Airports master CRUD grid — F-16-03
// Route: /masters/airports

import { isManager } from '../../../auth/auth-gate.js';
import { t }         from '../../../i18n/index.js';
import {
  validateAirportIata, validateAirportIcao, checkIataUnique,
} from '../../../util/iata-validators.js';
import { showConfirm } from '../../../helpers/show-confirm.js';

const KIND        = 'airports';
const KIND_PREFIX = 'APT';
const SEED_URL    = '/seed/masters/airports.jsonl';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId(iata) { return `${KIND_PREFIX}-${iata || Date.now()}`; }

// Auto-seed from static fixture on first-run (empty store)
async function seedIfEmpty(repo, items) {
  if (items.length > 0) return items;
  try {
    const res   = await fetch(SEED_URL);
    if (!res.ok) return items;
    const lines = (await res.text()).trim().split('\n').filter(Boolean);
    const seeded = [];
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (!entry.id) entry.id = genId(entry.iata_code);
      await repo.put(KIND, entry.id, entry);
      seeded.push(entry);
    }
    return seeded;
  } catch { /* seed optional */ return items; }
}

function buildModal(entity) {
  const e = entity || {};
  return `
    <dialog id="master-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-md backdrop:bg-black/30">
      <form id="modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('masters.airports.edit_title') : t('masters.airports.add_button')}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">IATA Code <span class="text-red-500">*</span></label>
          <input id="m-iata" type="text" maxlength="3" value="${escHtml(e.iata_code)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-iata" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">ICAO Code</label>
          <input id="m-icao" type="text" maxlength="4" value="${escHtml(e.icao_code)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-icao" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Name <span class="text-red-500">*</span></label>
          <input id="m-name" type="text" value="${escHtml(e.name)}" required
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">City <span class="text-red-500">*</span></label>
            <input id="m-city" type="text" value="${escHtml(e.city)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Country <span class="text-red-500">*</span></label>
            <input id="m-country" type="text" maxlength="2" value="${escHtml(e.country)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
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
  dialog.querySelector('#modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const iata    = dialog.querySelector('#m-iata').value.trim().toUpperCase();
    const icaoRaw = dialog.querySelector('#m-icao').value.trim().toUpperCase();
    const icao    = icaoRaw || null;
    const name    = dialog.querySelector('#m-name').value.trim();
    const city    = dialog.querySelector('#m-city').value.trim();
    const country = dialog.querySelector('#m-country').value.trim().toUpperCase();

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#m-err-iata', ''); setErr('#m-err-icao', '');

    const iataErr = validateAirportIata(iata);
    if (iataErr) { setErr('#m-err-iata', iataErr); return; }
    const icaoErr = icao ? validateAirportIcao(icao) : null;
    if (icaoErr) { setErr('#m-err-icao', icaoErr); return; }

    // AC-13: uniqueness guard
    const dupErr = checkIataUnique(items, iata, entity?.id);
    if (dupErr) { setErr('#m-err-iata', dupErr); return; }

    const updated = { ...(entity || {}), id: entity?.id || genId(iata), iata_code: iata, name, city, country };
    if (icao) updated.icao_code = icao; else delete updated.icao_code;
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
      <td class="px-3 py-2 font-mono">${escHtml(e.iata_code)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.icao_code)}</td>
      <td class="px-3 py-2">${escHtml(e.name)}</td>
      <td class="px-3 py-2">${escHtml(e.city)}</td>
      <td class="px-3 py-2">${escHtml(e.country)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

export async function render(root) {
  const isM  = isManager();
  const repo = window.__vdg_repo;
  const actCol = isM ? '<th class="px-3 py-2 text-left w-28">Actions</th>' : '';

  root.innerHTML = `
    <div class="p-6 max-w-[1100px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('masters.airports.title')}</div>
        ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t('masters.airports.add_button')}</button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">IATA</th>
              <th class="px-3 py-2 text-left">ICAO</th>
              <th class="px-3 py-2 text-left">Name</th>
              <th class="px-3 py-2 text-left">City</th>
              <th class="px-3 py-2 text-left">Country</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">No airports found.</div>
      </div>
      <div id="m-status" class="text-xs text-slate-400 mt-2">Loading...</div>
    </div>`;

  let items = [];

  async function reload() {
    items = repo ? await repo.list(KIND, null).catch(() => []) : [];
    if (isM) items = await seedIfEmpty(repo, items);
    const tbody   = root.querySelector('#m-tbody');
    const emptyEl = root.querySelector('#m-empty');
    if (tbody) tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    root.querySelector('#m-status').textContent = '';
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
        title: 'Delete this airport?', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
