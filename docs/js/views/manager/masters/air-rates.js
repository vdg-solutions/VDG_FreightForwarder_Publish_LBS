// Air Rates master CRUD grid — F-16-05
// Route: /masters/air-rates

import { isManager } from '../../../auth/auth-gate.js';
import { t }         from '../../../i18n/index.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { boundedList, boundedSeedIfEmpty, renderMasterLoadRetryStatus } from '../../../util/master-load.js';

const KIND       = 'air-rates';
const SEED_URL   = 'seed/masters/air-rates.jsonl';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function genId(r) { return `AR-${r.route_origin || ''}-${r.route_dest || ''}-${r.carrier_iata || ''}-${Date.now()}`; }

function breaksLabel(breaks) {
  if (!Array.isArray(breaks) || !breaks.length) return '—';
  return breaks.map((b) => `${b.min_kg}kg@${b.rate_per_kg}`).join(' / ');
}

function buildModal(entity) {
  const e = entity || {};
  const breaksJson = e.breaks ? JSON.stringify(e.breaks, null, 2) : '[\n  {"min_kg": 45, "rate_per_kg": 3.5}\n]';
  return `
    <dialog id="ar-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="ar-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('air_rate.edit_title') : t('air_rate.add_button')}</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.route')} (Origin) <span class="text-red-500">*</span></label>
            <input id="ar-origin" type="text" maxlength="3" value="${escHtml(e.route_origin)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.route')} (Dest) <span class="text-red-500">*</span></label>
            <input id="ar-dest" type="text" maxlength="3" value="${escHtml(e.route_dest)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.carrier')} <span class="text-red-500">*</span></label>
            <input id="ar-carrier" type="text" maxlength="2" value="${escHtml(e.carrier_iata)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Currency <span class="text-red-500">*</span></label>
            <input id="ar-currency" type="text" maxlength="3" value="${escHtml(e.currency || 'USD')}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Valid From <span class="text-red-500">*</span></label>
            <input id="ar-from" type="date" value="${escHtml(e.valid_from)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Valid Until <span class="text-red-500">*</span></label>
            <input id="ar-until" type="date" value="${escHtml(e.valid_until)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Break Tiers (JSON) <span class="text-red-500">*</span></label>
          <textarea id="ar-breaks" rows="5" required
                    class="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400">${escHtml(breaksJson)}</textarea>
          <span id="ar-err-breaks" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Save</button>
          <button type="button" id="ar-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, onSave) {
  root.querySelector('#ar-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#ar-modal');
  dialog.showModal();
  dialog.querySelector('#ar-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#ar-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const origin   = dialog.querySelector('#ar-origin').value.trim().toUpperCase();
    const dest     = dialog.querySelector('#ar-dest').value.trim().toUpperCase();
    const carrier  = dialog.querySelector('#ar-carrier').value.trim().toUpperCase();
    const currency = dialog.querySelector('#ar-currency').value.trim().toUpperCase();
    const validFrom  = dialog.querySelector('#ar-from').value;
    const validUntil = dialog.querySelector('#ar-until').value;
    const breaksRaw  = dialog.querySelector('#ar-breaks').value.trim();

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#ar-err-breaks', '');

    let breaks;
    try { breaks = JSON.parse(breaksRaw); } catch { setErr('#ar-err-breaks', 'Invalid JSON'); return; }
    if (!Array.isArray(breaks) || !breaks.length) { setErr('#ar-err-breaks', 'At least one break required'); return; }

    const id = entity?.id || entity?.rate_id || `AR-${origin}-${dest}-${carrier}`;
    const updated = { ...(entity || {}), id, rate_id: id, route_origin: origin, route_dest: dest, carrier_iata: carrier, breaks, valid_from: validFrom, valid_until: validUntil, currency };
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
      <td class="px-3 py-2 font-mono font-semibold">${escHtml(e.route_origin)}→${escHtml(e.route_dest)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.carrier_iata)}</td>
      <td class="px-3 py-2 text-[10px] text-slate-500 max-w-xs truncate">${escHtml(breaksLabel(e.breaks))}</td>
      <td class="px-3 py-2">${escHtml(e.valid_from)} – ${escHtml(e.valid_until)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.currency)}</td>
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
        <div class="text-lg font-semibold text-slate-900">${t('air_rate.title')}</div>
        ${isM ? `<button id="btn-ar-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${t('air_rate.add_button')}</button>` : ''}
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('air_rate.field.route')}</th>
              <th class="px-3 py-2 text-left">${t('air_rate.field.carrier')}</th>
              <th class="px-3 py-2 text-left">Break Tiers</th>
              <th class="px-3 py-2 text-left">Validity</th>
              <th class="px-3 py-2 text-left">Currency</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="ar-tbody"></tbody>
        </table>
        <div id="ar-empty" class="hidden text-center text-xs text-slate-400 py-8">No air rates found.</div>
      </div>
      <div id="ar-status" class="text-xs text-slate-400 mt-2">Loading...</div>
    </div>`;

  let items = [];

  // F-20-01: bounded — a stalled Drive read/write on a fresh workspace resolves to an
  // actionable retry instead of hanging at "Loading...".
  async function reload() {
    const tbody    = root.querySelector('#ar-tbody');
    const emptyEl  = root.querySelector('#ar-empty');
    const statusEl = root.querySelector('#ar-status');
    if (!repo) { items = []; if (tbody) tbody.innerHTML = ''; if (statusEl) statusEl.textContent = ''; return; }

    const listRes = await boundedList(repo, KIND, 'air-rates:list');
    if (!listRes.ok) {
      if (tbody) tbody.innerHTML = '';
      emptyEl?.classList.add('hidden');
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('retry'), reload);
      return;
    }
    items = listRes.value;
    if (isM) items = await boundedSeedIfEmpty(repo, KIND, SEED_URL, items, (e) => e.rate_id || genId(e), 'air-rates:seed');
    if (tbody)   tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
  }

  await reload();

  root.querySelector('#btn-ar-add')?.addEventListener('click', () => {
    openModal(root, null, async (entity) => { await repo.put(KIND, entity.id, entity); await reload(); });
  });

  root.querySelector('#ar-tbody')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, async (u) => { await repo.put(KIND, u.id, u); await reload(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Delete this air rate?', confirmLabel: 'Delete', cancelLabel: 'Cancel', destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
