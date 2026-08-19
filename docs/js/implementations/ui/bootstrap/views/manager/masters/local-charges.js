// Local Charge Tariff master — E-26 / F-26-03
// Route: /masters/local-charges
// Sales tra cứu biểu phí local charge theo hãng tàu; tên Việt, VAT kép, search alias.

import { runSeedMigrations } from '../../../../../freight_app/core_abstractions/ports/seed-migrator.js';
import { safeMasterLoad, renderMasterLoadRetryRow } from '../../../../../kernel/core_abstractions/util/master-load.js';
import { currentUserRole } from '../../../../../freight_app/operators/manager/route-guard.js';
import { readSettings, SECOND_EYES_FIELD } from '../../../../../freight_app/operators/manager/workspace-settings.js';
import { MASTER_REGISTRY } from '../../../../../freight_app/core_abstractions/master-registry.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { openModal, statusLabels } from './local-charges-modal.js';
import { createPricedGovernancePanel } from './priced-governance-panel.js';
import { t, currentLocale } from '../../../../../kernel/core_abstractions/i18n/index.js';

const LOAD_COL_SPAN    = 6;

const KIND         = 'local-charges';
const UNIT_KIND    = 'units-of-measure';
const CARRIER_KIND = 'ocean-carriers';
const SEED_URL     = 'seed/masters/local-charges.jsonl';
const UNIT_SEED    = 'seed/masters/units-of-measure.jsonl';
const CARRIER_SEED = 'seed/masters/ocean-carriers.jsonl';
// Matches ocean-carriers.js genId()'s KIND_PREFIX — same row must resolve to the same id
// whichever view seeds it first (this migration or the ocean-carriers master's own seed).
const CARRIER_ID_PREFIX = 'OCR';

// Versioned seeds — add a new migration id when a shipping line / rows are appended.
// Exported for AC-03 direct materialization testing (F-28-08).
//
// Each local-charges version REPLACES the last rather than sitting next to it, because the same
// rows keep being CORRECTED, not appended — and a workspace already seeded holds the old values
// until a NEW id runs, so the id is the only thing that reaches it. Listing the old ids too would
// just make a fresh workspace write all 90 rows once per version. `_seed_locked` rows survive all.
//   v2: vat_pct carried 0.0526315789 (20/19 — dividing by 0.95 instead of multiplying by 1.05,
//       and not a legal VN rate); 65 of 90 descriptions had no Vietnamese diacritics.
//   v3: effective_from -> valid_from, explicit valid_to, and a declared pricing_key. The envelope
//       used to DERIVE pricing_key from the row id, which made every record its own key — no two
//       could share one, so the overlap guard could never fire and resolveOnDate matched nothing.
export const SEED_MIGRATIONS = [
  { id: '2026-07-09-units-of-measure-v1', kind: UNIT_KIND,    url: UNIT_SEED,    key: (e) => e.code },
  { id: '2026-08-10-local-charges-v3',    kind: KIND,         url: SEED_URL,     key: (e) => e.id },
  { id: '2026-07-13-ocean-carriers-v1',   kind: CARRIER_KIND, url: CARRIER_SEED, key: (e) => `${CARRIER_ID_PREFIX}-${e.scac}` },
];

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function fmtVnd(n) { return (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '—'; }

// ISO 6346 size-type: the FIRST character is the length code (2 = 20', 4 = 40', L = 45'). Derived
// rather than table-mapped so a code the seed has not used yet still reads as a size instead of
// falling through to raw. Anything non-ISO (the seed's own "20SPECIAL") shows verbatim — better an
// unfamiliar code than a wrong size.
const ISO_LENGTH_BY_CODE = { '2': "20'", '4': "40'", 'L': "45'" };

function containerLabel(iso) {
  if (!iso) return '—';
  const len = ISO_LENGTH_BY_CODE[iso[0]];
  return len && iso.length === 4 ? `${len} (${iso})` : iso;
}

// AC-01 rework: locale-pick mirrors reports.js accountName — label_en in EN, label_vi in VI.
function uomLabel(u) {
  return currentLocale() === 'en' ? (u?.label_en || u?.label_vi || u?.code) : (u?.label_vi || u?.code);
}

// F-28-08/F-28-12: registry-driven writer gate, keyed off the single injectable role source
// (window.__vdg_current_user.role via currentUserRole()) — QA simulates a non-maintainer by
// overriding that one boot field, never the private auth-gate _resolvedRole.
function canWrite(role) {
  return MASTER_REGISTRY[KIND].writers.includes(role);
}

function rowHtml(c, unitLabel, carrierLabel, isEditor) {
  const amt = c.amount_status
    ? `<span class="text-slate-400 italic">${statusLabels()[c.amount_status] || c.amount_status}</span>`
    : `${fmtVnd(c.amount_exclude_vat)} <span class="text-slate-300">/</span> <span class="text-slate-900 font-medium">${fmtVnd(c.amount_include_vat)}</span>`;
  const kindBadge = c.charge_kind !== 'standard'
    ? `<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700">${c.charge_kind === 'demurrage' ? t('local_charges.badge.dem') : t('local_charges.badge.det')}</span>` : '';
  const searchStr = norm([c.line_name, c.charge_name, c.charge_code, unitLabel, ...(c.line_aliases || []), ...(c.charge_aliases || [])].join(' '));
  const actions = isEditor ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${escHtml(c.id)}">${t('common.action.edit')}</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${escHtml(c.id)}">${t('common.action.delete')}</button>` : '';
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${escHtml(c.id)}" data-line="${escHtml(c.line_scac)}" data-dir="${escHtml(c.direction)}" data-search="${escHtml(searchStr)}">
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml(carrierLabel)}</td>
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml(c.charge_name)}${kindBadge}
        <div class="text-[10px] text-slate-400 font-normal">${escHtml(c.charge_description || '')}</div></td>
      <td class="py-2 px-3 text-xs text-slate-600 whitespace-nowrap">${escHtml(containerLabel(c.container_iso6346))}</td>
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml(unitLabel)}</td>
      <td class="py-2 px-3 text-xs text-right whitespace-nowrap">${amt}</td>
      <td class="py-2 px-3 text-[10px] text-slate-400">${c.route_via_unlocode ? t('local_charges.route_via_cai_mep') : ''} ${c.free_days != null ? `FreeDay ${c.free_days}` : ''}</td>
      ${isEditor ? `<td class="py-2 px-3">${actions}</td>` : ''}
    </tr>`;
}

export async function render(root) {
  const repo       = window.__vdg_repo;
  const role       = currentUserRole();
  const isEditor   = canWrite(role);
  const pricedRepo = window.__vdg_priced_repos?.[KIND];
  // The four-eyes flag is a property of the priced refs as a set, not of air-rates: with it
  // wired only there, turning the workspace's second-eyes on left this tariff — the one a
  // sales rep can actually edit — still writing straight through.
  // readSettings, not loadWorkspaceSettings: since #31 the flag is a row of the
  // `workspace_settings` kind, so this is a local read. A grid has no business opening a Drive
  // connection to learn whether its save button says "Save" or "Propose" — and the legacy-JSON
  // migration keeps its single owner in the settings screens.
  const settings   = window.__vdg_workspace_settings ?? await readSettings(repo);
  const secondEyes = !!settings[SECOND_EYES_FIELD];
  const panel      = pricedRepo ? createPricedGovernancePanel({ pricedRepo, refName: KIND, role, secondEyes, liveRepo: repo }) : null;
  const colSpan    = LOAD_COL_SPAN + (isEditor ? 1 : 0);
  // Container is what separates otherwise identical tariff rows (a 20' and a 40' Empty Reposition
  // differ ONLY here) — without the column the grid renders five distinct charges as five copies.
  const headers    = [t('local_charges.col.carrier'), t('local_charges.col.charge'), t('local_charges.col.container'), t('local_charges.col.unit'), t('local_charges.col.amount_vat'), ''];
  if (isEditor) headers.push(t('common.col.actions'));

  root.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">${t('local_charges.title')}</h1>
          <p class="text-xs text-slate-500">${t('local_charges.subtitle')}</p>
        </div>
        <div class="flex gap-2 items-center">
          <select id="lc-line" class="border border-slate-200 rounded-lg px-2 py-2 text-sm"></select>
          <select id="lc-dir" class="border border-slate-200 rounded-lg px-2 py-2 text-sm">
            <option value="">${t('local_charges.dir.all')}</option><option value="export">${t('local_charges.dir.export')}</option><option value="import">${t('local_charges.dir.import')}</option>
          </select>
          <input id="lc-search" type="search" placeholder="${t('local_charges.search_placeholder')}" class="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          ${isEditor ? `<button id="btn-lc-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">${panel ? panel.primaryActionLabel() : t('common.action.add')}</button>` : ''}
        </div>
      </div>
      <div id="lc-pending" class="mb-4"></div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50"><tr>${headers.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join('')}</tr></thead>
          <tbody id="lc-body"><tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t('common.load.loading')}</td></tr></tbody>
        </table>
      </div>
    </div>`;

  const body = root.querySelector('#lc-body');
  if (!repo) { body.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-red-500 text-center text-xs">${t('common.load.not_ready')}</td></tr>`; return; }

  let charges  = [];
  let units    = [];
  let carriers = [];

  // F-20-01: seed + list bounded as one sequence — a stalled Drive write on a fresh
  // workspace resolves to a caught failure instead of hanging at "Đang tải…".
  async function loadAndRender() {
    const loadRes = await safeMasterLoad(async () => {
      await runSeedMigrations(repo, SEED_MIGRATIONS); // versioned + idempotent
      return Promise.all([
        repo.list(KIND, null).catch(() => []),
        repo.list(UNIT_KIND, null).catch(() => []),
        repo.list(CARRIER_KIND, null).catch(() => []),
      ]);
    }, 'local-charges:load');

    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, colSpan, t('common.load.error'), t('common.load.retry'), loadAndRender);
      return;
    }

    [charges, units, carriers] = loadRes.value;
    const unitLabel = new Map(units.map((u) => [u.code, uomLabel(u)]));
    // FK resolve: line_scac -> ocean-carrier master name (single source, AC-05)
    const carrierName = new Map(carriers.map((oc) => [oc.scac, oc.name]));

    // line filter options (tên thân thiện, không SCAC)
    const lines = [...new Map(charges.map((c) => [c.line_scac, c.line_name])).entries()];
    root.querySelector('#lc-line').innerHTML = `<option value="">${t('local_charges.filter.all_carriers')}</option>` + lines.map(([scac, name]) => `<option value="${escHtml(scac)}">${escHtml(name)}</option>`).join('');

    charges.sort((a, b) => (a.line_name || '').localeCompare(b.line_name || '') || (a.direction || '').localeCompare(b.direction || '') || (a.charge_code || '').localeCompare(b.charge_code || ''));
    body.innerHTML = charges.length
      ? charges.map((c) => rowHtml(c, unitLabel.get(c.unit_code) || c.unit_code, carrierName.get(c.line_scac) || c.line_name, isEditor)).join('')
      : `<tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">${t('local_charges.empty')}</td></tr>`;
  }

  await loadAndRender();

  const apply = () => {
    const line = root.querySelector('#lc-line').value;
    const dir  = root.querySelector('#lc-dir').value;
    const q    = norm(root.querySelector('#lc-search').value);
    body.querySelectorAll('tr[data-search]').forEach((tr) => {
      const ok = (!line || tr.dataset.line === line) && (!dir || tr.dataset.dir === dir) && (!q || tr.dataset.search.includes(q));
      tr.style.display = ok ? '' : 'none';
    });
  };
  root.querySelector('#lc-line').addEventListener('change', apply);
  root.querySelector('#lc-dir').addEventListener('change', apply);
  root.querySelector('#lc-search').addEventListener('input', apply);

  // F-28-12: maintainer diff+Approve/Reject or the proposer's own-pending banner (AC-01/02/03).
  const pendingEl = root.querySelector('#lc-pending');
  async function refreshPending() {
    await loadAndRender();
    apply();
    if (panel && pendingEl) await panel.renderPendingPanel(pendingEl, refreshPending);
  }
  if (panel && pendingEl) await panel.renderPendingPanel(pendingEl, refreshPending);

  // AC-01/05: canWriteDirect routes straight to repo.put; otherwise the edit becomes a
  // proposal — the row is never put to the live table (no state.json mutation).
  async function saveEntity(entity) {
    // One call, not a branch plus a guard the branch has to remember: panel.commit routes to
    // repo.put or to a proposal, and refuses an overlapping window on either road.
    if (panel) await panel.commit(entity.id, entity);
    else await repo.put(KIND, entity.id, entity);
    await loadAndRender();
    apply();
  }

  root.querySelector('#btn-lc-add')?.addEventListener('click', () => {
    openModal(root, null, carriers, units, saveEntity, panel?.primaryActionLabel());
  });

  body.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = charges.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, carriers, units, saveEntity, panel?.primaryActionLabel());
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: t('local_charges.confirm_delete'), confirmLabel: t('common.action.delete'), cancelLabel: t('common.action.cancel'), destructive: true,
      });
      if (!ok) return;
      charges = charges.filter((i) => i.id !== delBtn.dataset.id);
      body.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
