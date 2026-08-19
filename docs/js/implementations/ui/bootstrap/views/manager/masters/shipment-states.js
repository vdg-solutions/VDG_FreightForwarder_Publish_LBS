// Shipment-state alias registry — F-18-11
// Route: /masters/shipment-states
// Alias-editor only (Q2 locked): the 6 canonical rows are seeded and fixed — no add/delete,
// only aliases/label_vi/label_en are editable, mirrors units-of-measure.js structurally minus
// the add/delete affordances. Manager-only writers (Q3) also gates the migration trigger below.

import { hasRole } from '../../../../../freight_app/core_abstractions/session-roles.js';
import { currentUserRole } from '../../../../../freight_app/operators/manager/route-guard.js';
import { ROLE_MANAGER } from '../../../../../freight_app/core_abstractions/roles.js';
import { MASTER_REGISTRY } from '../../../../../freight_app/core_abstractions/master-registry.js';
import { runSeedMigrations } from '../../../../../freight_app/core_abstractions/ports/seed-migrator.js';
import { safeMasterLoad, renderMasterLoadRetryRow } from '../../../../../kernel/core_abstractions/util/master-load.js';
import { migrateLegacyShipmentState } from '../../../../../freight_app/operators/shipment-state-migrator.js';
import { SHIPMENT_STATES_SEED_MIGRATION } from '../../../../../freight_app/operators/util/shipment-state-aliases.js';
import { SHIPMENT_STATES_KIND } from '../../../../../freight_app/core_abstractions/ports/shipment-state-aliases.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { openModal } from './shipment-states-modal.js';
import { t } from '../../../../../kernel/core_abstractions/i18n/index.js';

// Single source for the kind + versioned seed migration — shared with every consumer
// (util/shipment-state-aliases.js) so this view and the read/write paths can never diverge.
const KIND          = SHIPMENT_STATES_KIND;
const SEED_MIGRATION = SHIPMENT_STATES_SEED_MIGRATION;

const BASE_COL_SPAN = 4;

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// F-18-11 AC-04: registry-driven writer gate — mirrors units-of-measure.js/local-charges.js.
function canWrite() {
  const role = hasRole(ROLE_MANAGER) ? ROLE_MANAGER : currentUserRole();
  return MASTER_REGISTRY[KIND].writers.includes(role);
}

async function loadStates(repo) {
  return safeMasterLoad(async () => {
    await runSeedMigrations(repo, [SEED_MIGRATION]); // versioned + idempotent, never re-invents rows
    return (await repo.list(KIND, null).catch(() => [])) || [];
  }, 'shipment-states:load');
}

function rowHtml(s, isEditor) {
  const aliases = (s.aliases || []).map((a) => `<span class="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-slate-100 text-slate-600 text-[10px]">${escHtml(a)}</span>`).join('');
  const actions = isEditor ? `<button class="btn-edit text-xs text-blue-600 hover:underline" data-code="${escHtml(s.code)}">${t('shipment_states.action.edit')}</button>` : '';
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-code="${escHtml(s.code)}">
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml(s.label_vi)}</td>
      <td class="py-2 px-3 text-xs text-slate-500">${escHtml(s.label_en)}</td>
      <td class="py-2 px-3 text-[10px] font-mono text-slate-400">${escHtml(s.code)}</td>
      <td class="py-2 px-3">${aliases}</td>
      ${isEditor ? `<td class="py-2 px-3">${actions}</td>` : ''}
    </tr>`;
}

function migrationSectionHtml() {
  return `
    <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
      <p class="text-xs text-slate-500 max-w-md">${t('shipment_states.migration.subtitle')}</p>
      <button id="btn-ss-migrate" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap">${t('shipment_states.migration.button')}</button>
    </div>`;
}

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message } }));
}

export async function render(root) {
  const repo     = window.__vdg_repo;
  const isEditor = canWrite();
  const colSpan  = BASE_COL_SPAN + (isEditor ? 1 : 0);
  const headers  = [t('shipment_states.col.label_vi'), t('shipment_states.col.label_en'), t('shipment_states.col.code'), t('shipment_states.col.aliases')];
  if (isEditor) headers.push(t('shipment_states.col.actions'));

  root.innerHTML = `
    <div class="p-6">
      <div class="mb-4">
        <h1 class="text-lg font-semibold text-slate-900">${t('shipment_states.title')}</h1>
        <p class="text-xs text-slate-500">${t('shipment_states.subtitle')}</p>
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50">
            <tr>${headers.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join('')}</tr>
          </thead>
          <tbody id="ss-body"><tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t('loading')}</td></tr></tbody>
        </table>
      </div>
      ${isEditor ? migrationSectionHtml() : ''}
    </div>`;

  const body = root.querySelector('#ss-body');
  if (!repo) { body.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-red-500 text-center text-xs">${t('shipment_states.not_ready')}</td></tr>`; return; }

  let states = [];

  async function loadAndRender() {
    const loadRes = await loadStates(repo);
    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, colSpan, t('shipment_states.load_error'), t('shipment_states.load_retry'), loadAndRender);
      return;
    }
    states = loadRes.value;
    states.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    body.innerHTML = states.length ? states.map((s) => rowHtml(s, isEditor)).join('') : `<tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t('shipment_states.empty')}</td></tr>`;
  }

  await loadAndRender();

  body.addEventListener('click', (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (!editBtn) return;
    const entity = states.find((s) => s.code === editBtn.dataset.code);
    if (entity) openModal(root, entity, async (u) => { await repo.put(KIND, u.code, u); await loadAndRender(); });
  });

  root.querySelector('#btn-ss-migrate')?.addEventListener('click', async () => {
    const ok = await showConfirm({
      title: t('shipment_states.migration.confirm_title'),
      body:  t('shipment_states.migration.confirm_body'),
      confirmLabel: t('shipment_states.migration.button'),
      cancelLabel:  t('common.action.cancel'),
    });
    if (!ok) return;
    try {
      const result = await migrateLegacyShipmentState(repo, states);
      toast('success', t('shipment_states.migration.result', { found: result.found, migrated: result.migrated, skipped: result.skippedUnresolved }));
    } catch (err) {
      console.error('[shipment-states] migration failed:', err); // DEV
      toast('error', err.message);
    }
  });
}
