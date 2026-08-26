// Air Rates master CRUD grid — F-16-05
// Route: /masters/air-rates

import { t } from '../../../../../kernel/core_abstractions/i18n/index.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { boundedList, safeMasterLoad, renderMasterLoadRetryStatus } from '../../../../../kernel/core_abstractions/util/master-load.js';
import { canWriteMaster } from '../../../../core_abstractions/ports/cache/master-registry.js';
import { currentUserRole } from '../../../../core_abstractions/ports/governance/route-guard.js';
import { createPricedGovernancePanel } from './priced-governance-panel.js';
import { readSettings, SECOND_EYES_FIELD } from '../../../../core_abstractions/ports/governance/workspace-settings.js';
import { isViewSuperseded } from '../../../util/view-root.js';

const KIND       = 'air-rates';

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function breaksLabel(breaks) {
  if (!Array.isArray(breaks) || !breaks.length) return '—';
  return breaks.map((b) => `${b.min_kg}kg@${b.rate_per_kg}`).join(' / ');
}

function buildModal(entity, primaryLabel) {
  const e = entity || {};
  const breaksJson = e.breaks ? JSON.stringify(e.breaks, null, 2) : '[\n  {"min_kg": 45, "rate_per_kg": 3.5}\n]';
  return `
    <dialog id="ar-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="ar-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? t('air_rate.edit_title') : t('air_rate.add_button')}</div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.route_origin')} <span class="text-red-500">*</span></label>
            <input id="ar-origin" type="text" maxlength="3" value="${escHtml(e.route_origin)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.route_dest')} <span class="text-red-500">*</span></label>
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
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.currency')} <span class="text-red-500">*</span></label>
            <input id="ar-currency" type="text" maxlength="3" value="${escHtml(e.currency || 'USD')}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.valid_from')} <span class="text-red-500">*</span></label>
            <input id="ar-from" type="date" value="${escHtml(e.valid_from)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.valid_to')} <span class="text-red-500">*</span></label>
            <input id="ar-until" type="date" value="${escHtml(e.valid_to)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">${t('air_rate.field.break_tiers')} (JSON) <span class="text-red-500">*</span></label>
          <textarea id="ar-breaks" rows="5" required
                    class="w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400">${escHtml(breaksJson)}</textarea>
          <span id="ar-err-breaks" class="hidden text-xs text-red-600"></span>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">${primaryLabel || t('common.action.save')}</button>
          <button type="button" id="ar-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">${t('common.action.cancel')}</button>
        </div>
      </form>
    </dialog>`;
}

// F-28-12: 3rd arg primaryLabel overrides the submit button text (Propose vs Save, AC-05/06).
function openModal(root, entity, onSave, primaryLabel) {
  root.querySelector('#ar-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity, primaryLabel));
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
    try { breaks = JSON.parse(breaksRaw); } catch { setErr('#ar-err-breaks', t('air_rate.err.invalid_json')); return; }
    if (!Array.isArray(breaks) || !breaks.length) { setErr('#ar-err-breaks', t('air_rate.err.break_required')); return; }

    const id = entity?.id || entity?.rate_id || `AR-${origin}-${dest}-${carrier}`;
    const updated = { ...(entity || {}), id, rate_id: id, route_origin: origin, route_dest: dest, carrier_iata: carrier, breaks, valid_from: validFrom, valid_to: validUntil, currency, pricing_key: id };
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
      <td class="px-3 py-2 font-mono font-semibold">${escHtml(e.route_origin)}→${escHtml(e.route_dest)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.carrier_iata)}</td>
      <td class="px-3 py-2 text-[10px] text-slate-500 max-w-xs truncate">${escHtml(breaksLabel(e.breaks))}</td>
      <td class="px-3 py-2">${escHtml(e.valid_from)} – ${escHtml(e.valid_to)}</td>
      <td class="px-3 py-2 font-mono">${escHtml(e.currency)}</td>
      ${isM ? `<td class="px-3 py-2">${actions}</td>` : ''}
    </tr>`;
}

export async function render(root) {
  const repo = window.__vdg_repo;

  // F-28-08/F-28-12: registry-driven writer gate keyed off the single injectable role
  // source (window.__vdg_current_user.role via currentUserRole()) — mirrors local-charges.js.
  const role   = currentUserRole();
  const isM    = canWriteMaster(KIND, role);
  const actCol = isM ? `<th class="px-3 py-2 text-left w-28">${t('common.col.actions')}</th>` : '';

  // F-28-12 AC-05/06/07: owner second-eyes flag forces even the sole maintainer through
  // propose->pending on the SAME shared governance component local-charges uses.
  // readSettings, not loadWorkspaceSettings: since #31 the flag is a row of the
  // `workspace_settings` kind, so there is no Drive read left to bound here — and both priced
  // masters now learn the flag the same way, instead of one reading the DB and one the network.
  const settings   = window.__vdg_workspace_settings ?? await readSettings(repo);
  const secondEyes = !!settings[SECOND_EYES_FIELD];
  const pricedRepo = window.__vdg_priced_repos?.[KIND];
  const panel = pricedRepo ? createPricedGovernancePanel({ pricedRepo, refName: KIND, role, secondEyes, liveRepo: repo }) : null;

  // AC-05: a same-route mount timeout may have already painted the shell fallback into this
  // SAME root while the settings await above was stalled — bail instead of clobbering it.
  if (isViewSuperseded(root)) return;

  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">${t('air_rate.title')}</div>
        ${isM ? `<button id="btn-ar-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">+ ${panel ? panel.primaryActionLabel() : t('air_rate.add_button')}</button>` : ''}
      </div>
      <div id="ar-pending" class="mb-4"></div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">${t('air_rate.field.route')}</th>
              <th class="px-3 py-2 text-left">${t('air_rate.field.carrier')}</th>
              <th class="px-3 py-2 text-left">${t('air_rate.field.break_tiers')}</th>
              <th class="px-3 py-2 text-left">${t('air_rate.col.validity')}</th>
              <th class="px-3 py-2 text-left">${t('air_rate.field.currency')}</th>
              ${actCol}
            </tr>
          </thead>
          <tbody id="ar-tbody"></tbody>
        </table>
        <div id="ar-empty" class="hidden text-center text-xs text-slate-400 py-8">${t('air_rate.empty')}</div>
      </div>
      <div id="ar-status" class="text-xs text-slate-400 mt-2">${t('common.load.loading')}</div>
    </div>`;

  let items = [];

  // F-20-01: bounded — a stalled Drive read/write on a fresh workspace resolves to an
  // actionable retry instead of hanging at "Loading...".
  async function reload() {
    if (isViewSuperseded(root)) return; // AC-05: shell already moved on from this route
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
    if (tbody)   tbody.innerHTML = items.map((e) => rowHtml(e, isM)).join('');
    if (emptyEl) emptyEl.classList.toggle('hidden', items.length > 0);
    if (statusEl) statusEl.textContent = '';
  }

  await reload();

  // F-28-12: maintainer diff+Approve/Reject or the proposer's own-pending banner (AC-02/03).
  // AC-02: bounded — listPending()/getRefState() can each stall on driveFetch; a timeout
  // resolves to the panel's empty state instead of hanging the render.
  const pendingEl = root.querySelector('#ar-pending');
  async function refreshPending() {
    await reload();
    if (isViewSuperseded(root)) return;
    if (panel && pendingEl) await safeMasterLoad(() => panel.renderPendingPanel(pendingEl, refreshPending), 'air-rates:pending');
  }
  if (panel && pendingEl) await safeMasterLoad(() => panel.renderPendingPanel(pendingEl, refreshPending), 'air-rates:pending');

  // AC-05/06: canWriteDirect routes straight to repo.put; otherwise the edit becomes a
  // proposal — the row is never put to the live table (no state.json mutation).
  async function saveEntity(entity) {
    // One call, not a branch plus a guard the branch has to remember: panel.commit routes to
    // repo.put or to a proposal, and refuses an overlapping window on either road.
    if (panel) await panel.commit(entity.id, entity);
    else await repo.put(KIND, entity.id, entity);
    await reload();
  }

  root.querySelector('#btn-ar-add')?.addEventListener('click', () => {
    openModal(root, null, saveEntity, panel?.primaryActionLabel());
  });

  root.querySelector('#ar-tbody')?.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = items.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, saveEntity, panel?.primaryActionLabel());
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: t('air_rate.delete_confirm'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
      });
      if (!ok) return;
      items = items.filter((i) => i.id !== delBtn.dataset.id);
      root.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
