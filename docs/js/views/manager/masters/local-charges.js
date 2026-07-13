// Local Charge Tariff master — E-26 / F-26-03
// Route: /masters/local-charges
// Sales tra cứu biểu phí local charge theo hãng tàu; tên Việt, VAT kép, search alias.

import { runSeedMigrations } from '../../../cache/seed-migrator.js';
import { safeMasterLoad, renderMasterLoadRetryRow } from '../../../util/master-load.js';
import { isManager } from '../../../auth/auth-gate.js';
import { currentUserRole, ROLE_MANAGER } from '../../../operators/manager/route-guard.js';
import { MASTER_REGISTRY } from '../../../data/master-registry.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { openModal, STATUS_LABEL } from './local-charges-modal.js';

const LOAD_ERROR_MSG   = 'Không tải được dữ liệu.';
const LOAD_RETRY_LABEL = 'Thử lại';
const LOAD_COL_SPAN    = 5;

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
export const SEED_MIGRATIONS = [
  { id: '2026-07-09-units-of-measure-v1', kind: UNIT_KIND,    url: UNIT_SEED,    key: (e) => e.code },
  { id: '2026-07-09-local-charges-v1',    kind: KIND,         url: SEED_URL,     key: (e) => e.id },
  { id: '2026-07-13-ocean-carriers-v1',   kind: CARRIER_KIND, url: CARRIER_SEED, key: (e) => `${CARRIER_ID_PREFIX}-${e.scac}` },
];

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function fmtVnd(n) { return (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '—'; }

// F-28-08: registry-driven writer gate — mirrors app.js/sidebar.js's effectiveRole pattern.
function canWrite() {
  const role = isManager() ? ROLE_MANAGER : currentUserRole();
  return MASTER_REGISTRY[KIND].writers.includes(role);
}

function rowHtml(c, unitLabel, carrierLabel, isEditor) {
  const amt = c.amount_status
    ? `<span class="text-slate-400 italic">${STATUS_LABEL[c.amount_status] || c.amount_status}</span>`
    : `${fmtVnd(c.amount_exclude_vat)} <span class="text-slate-300">/</span> <span class="text-slate-900 font-medium">${fmtVnd(c.amount_include_vat)}</span>`;
  const kindBadge = c.charge_kind !== 'standard'
    ? `<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700">${c.charge_kind === 'demurrage' ? 'DEM' : 'DET'}</span>` : '';
  const searchStr = norm([c.line_name, c.charge_name, c.charge_code, unitLabel, ...(c.line_aliases || []), ...(c.charge_aliases || [])].join(' '));
  const actions = isEditor ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${escHtml(c.id)}">Sửa</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${escHtml(c.id)}">Xóa</button>` : '';
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${escHtml(c.id)}" data-line="${escHtml(c.line_scac)}" data-dir="${escHtml(c.direction)}" data-search="${escHtml(searchStr)}">
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml(carrierLabel)}</td>
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml(c.charge_name)}${kindBadge}
        <div class="text-[10px] text-slate-400 font-normal">${escHtml(c.charge_description || '')}</div></td>
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml(unitLabel)}</td>
      <td class="py-2 px-3 text-xs text-right whitespace-nowrap">${amt}</td>
      <td class="py-2 px-3 text-[10px] text-slate-400">${c.route_via_unlocode ? 'qua Cái Mép' : ''} ${c.free_days != null ? `FreeDay ${c.free_days}` : ''}</td>
      ${isEditor ? `<td class="py-2 px-3">${actions}</td>` : ''}
    </tr>`;
}

export async function render(root) {
  const repo     = window.__vdg_repo;
  const isEditor = canWrite();
  const colSpan  = LOAD_COL_SPAN + (isEditor ? 1 : 0);
  const headers  = ['Hãng tàu', 'Phí', 'Đơn vị tính', 'VND (chưa / có VAT)', ''];
  if (isEditor) headers.push('Thao tác');

  root.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">Biểu phí địa phương</h1>
          <p class="text-xs text-slate-500">Theo hãng tàu — cột phí: <b>chưa VAT / có VAT</b>. Tìm theo tên phí, hãng, hay mã.</p>
        </div>
        <div class="flex gap-2 items-center">
          <select id="lc-line" class="border border-slate-200 rounded-lg px-2 py-2 text-sm"></select>
          <select id="lc-dir" class="border border-slate-200 rounded-lg px-2 py-2 text-sm">
            <option value="">Xuất + Nhập</option><option value="export">Xuất</option><option value="import">Nhập</option>
          </select>
          <input id="lc-search" type="search" placeholder="Tìm phí…" class="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          ${isEditor ? `<button id="btn-lc-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">+ Thêm</button>` : ''}
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50"><tr>${headers.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join('')}</tr></thead>
          <tbody id="lc-body"><tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">Đang tải…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  const body = root.querySelector('#lc-body');
  if (!repo) { body.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-red-500 text-center text-xs">Chưa sẵn sàng dữ liệu.</td></tr>`; return; }

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
      renderMasterLoadRetryRow(body, colSpan, LOAD_ERROR_MSG, LOAD_RETRY_LABEL, loadAndRender);
      return;
    }

    [charges, units, carriers] = loadRes.value;
    const unitLabel = new Map(units.map((u) => [u.code, u.label_vi || u.code]));
    // FK resolve: line_scac -> ocean-carrier master name (single source, AC-05)
    const carrierName = new Map(carriers.map((oc) => [oc.scac, oc.name]));

    // line filter options (tên thân thiện, không SCAC)
    const lines = [...new Map(charges.map((c) => [c.line_scac, c.line_name])).entries()];
    root.querySelector('#lc-line').innerHTML = `<option value="">Tất cả hãng</option>` + lines.map(([scac, name]) => `<option value="${escHtml(scac)}">${escHtml(name)}</option>`).join('');

    charges.sort((a, b) => (a.line_name || '').localeCompare(b.line_name || '') || (a.direction || '').localeCompare(b.direction || '') || (a.charge_code || '').localeCompare(b.charge_code || ''));
    body.innerHTML = charges.length
      ? charges.map((c) => rowHtml(c, unitLabel.get(c.unit_code) || c.unit_code, carrierName.get(c.line_scac) || c.line_name, isEditor)).join('')
      : `<tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">Chưa có biểu phí.</td></tr>`;
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

  root.querySelector('#btn-lc-add')?.addEventListener('click', () => {
    openModal(root, null, carriers, units, async (entity) => { await repo.put(KIND, entity.id, entity); await loadAndRender(); apply(); });
  });

  body.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = charges.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, carriers, units, async (u) => { await repo.put(KIND, u.id, u); await loadAndRender(); apply(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Xóa biểu phí này?', confirmLabel: 'Xóa', cancelLabel: 'Hủy', destructive: true,
      });
      if (!ok) return;
      charges = charges.filter((i) => i.id !== delBtn.dataset.id);
      body.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
