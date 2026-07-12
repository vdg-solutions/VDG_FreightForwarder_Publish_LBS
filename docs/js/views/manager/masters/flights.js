// Flights master CRUD grid — F-16-03
// Route: /masters/flights

import { isManager } from '../../../auth/auth-gate.js';
import { t }         from '../../../i18n/index.js';
import {
  validateFlightNo, validateAirportIata, validateAirlineIata,
} from '../../../util/iata-validators.js';
import { showConfirm } from '../../../helpers/show-confirm.js';

const KIND        = 'flights';
const KIND_PREFIX = 'FLT';
const SEED_URL    = '/seed/masters/flights.jsonl';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId() { return `${KIND_PREFIX}-${Date.now()}`; }

async function seedIfEmpty(repo, items) {
  if (items.length > 0) return items;
  try {
    const res   = await fetch(SEED_URL);
    if (!res.ok) return items;
    const lines = (await res.text()).trim().split('\n').filter(Boolean);
    const seeded = [];
    for (const line of lines) {
      const entry = JSON.parse(line);
      if (!entry.id) entry.id = genId();
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
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('masters.flights.edit_title') : t('masters.flights.add_button')}</div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Flight No. <span class="text-red-500">*</span></label>
          <input id="m-flight_no" type="text" maxlength="6" value="${escHtml(e.flight_no)}" required placeholder="e.g. VN422"
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-fn" class="hidden text-xs text-red-600"></span>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Carrier IATA <span class="text-red-500">*</span></label>
          <input id="m-carrier" type="text" maxlength="2" value="${escHtml(e.carrier_iata_code)}" required placeholder="e.g. VN"
                 class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span id="m-err-carrier" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Origin IATA <span class="text-red-500">*</span></label>
            <input id="m-origin" type="text" maxlength="3" value="${escHtml(e.origin_iata)}" required placeholder="e.g. SGN"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="m-err-origin" class="hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Dest IATA <span class="text-red-500">*</span></label>
            <input id="m-dest" type="text" maxlength="3" value="${escHtml(e.dest_iata)}" required placeholder="e.g. HAN"
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="m-err-dest" class="hidden text-xs text-red-600"></span>
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Schedule (HH:MM)</label>
          <input id="m-schedule" type="time" value="${escHtml(e.schedule)}"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Save</button>
          <button type="button" id="btn-modal-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, onSave) {
  root.querySelector('#master-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#master-modal');
  dialog.showModal();
  dialog.querySelector('#btn-modal-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fn      = dialog.querySelector('#m-flight_no').value.trim().toUpperCase();
    const carrier = dialog.querySelector('#m-carrier').value.trim().toUpperCase();
    const origin  = dialog.querySelector('#m-origin').value.trim().toUpperCase();
    const dest    = dialog.querySelector('#m-dest').value.trim().toUpperCase();
    const sched   = dialog.querySelector('#m-schedule').value.trim() || null;

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#m-err-fn', ''); setErr('#m-err-carrier', ''); setErr('#m-err-origin', ''); setErr('#m-err-dest', '');

    const fnErr = validateFlightNo(fn);
    if (fnErr) { setErr('#m-err-fn', fnErr); return; }
    const cErr = validateAirlineIata(carrier);
    if (cErr) { setErr('#m-err-carrier', cErr); return; }
    const oErr = validateAirportIata(origin);
    if (oErr) { setErr('#m-err-origin', oErr); return; }
    const dErr = validateAirportIata(dest);
    if (dErr) { setErr('#m-err-dest', dErr); return; }

    const updated = {
      ...(entity || {}),
      id:                entity?.id || genId(),
      flight_no:         fn,
      carrier_iata_code: carrier,
      origin_iata:       origin,
      dest_iata:         dest,
    };
    if (sched) updated.schedule = sched; else delete updated.schedule;
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
      <td class="px-3 py-2 font-mono">${escHtml(e.flight_no)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.carrier_iata_code)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.origin_iata)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.dest_iata)}</td>
      <td class="px-3 py-2">${escHtml(e.schedule)}</td>
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
        <div class="text-lg font-semibold text-slate-900">${t('masters.flights.title')}</div>
        ${isM ? `<button id="btn-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t('masters.flights.add_button')}</button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">Flight No.</th>
              <th class="px-3 py-2 text-left">Carrier</th>
              <th class="px-3 py-2 text-left">Origin</th>
              <th class="px-3 py-2 text-left">Destination</th>
              <th class="px-3 py-2 text-left">Schedule</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="m-tbody"></tbody>
        </table>
        <div id="m-empty" class="hidden text-center text-xs text-slate-400 py-8">No flights found.</div>
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
    openModal(root, null, async (entity) => { await repo.put(KIND, entity.id, entity); await reload(); });
  });

  root.querySelector('#m-tbody')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, async (u) => { await repo.put(KIND, u.id, u); await reload(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Delete this flight?', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
