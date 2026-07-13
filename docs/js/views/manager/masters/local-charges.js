// Local Charge Tariff master — E-26 / F-26-03
// Route: /masters/local-charges
// Sales tra cứu biểu phí local charge theo hãng tàu; tên Việt, VAT kép, search alias.

import { runSeedMigrations } from '../../../cache/seed-migrator.js';
import { safeMasterLoad, renderMasterLoadRetryRow } from '../../../util/master-load.js';

const LOAD_ERROR_MSG   = 'Không tải được dữ liệu.';
const LOAD_RETRY_LABEL = 'Thử lại';
const LOAD_COL_SPAN    = 4;

const KIND      = 'local-charges';
const UNIT_KIND = 'units-of-measure';
const SEED_URL  = 'seed/masters/local-charges.jsonl';
const UNIT_SEED = 'seed/masters/units-of-measure.jsonl';
// Versioned seeds — add a new migration id when a shipping line / rows are appended.
const SEED_MIGRATIONS = [
  { id: '2026-07-09-units-of-measure-v1', kind: UNIT_KIND, url: UNIT_SEED, key: (e) => e.code },
  { id: '2026-07-09-local-charges-v1',    kind: KIND,      url: SEED_URL,  key: (e) => e.id },
];

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');
}
function fmtVnd(n) { return (n || n === 0) ? Number(n).toLocaleString('vi-VN') : '—'; }

const STATUS_LABEL = { free: 'Miễn phí', not_applicable: 'Không áp dụng', on_request: 'Theo yêu cầu' };
const DIR_LABEL    = { export: 'Xuất', import: 'Nhập' };


function rowHtml(c, unitLabel) {
  const amt = c.amount_status
    ? `<span class="text-slate-400 italic">${STATUS_LABEL[c.amount_status] || c.amount_status}</span>`
    : `${fmtVnd(c.amount_exclude_vat)} <span class="text-slate-300">/</span> <span class="text-slate-900 font-medium">${fmtVnd(c.amount_include_vat)}</span>`;
  const kindBadge = c.charge_kind !== 'standard'
    ? `<span class="ml-1 px-1 py-0.5 rounded text-[9px] bg-amber-100 text-amber-700">${c.charge_kind === 'demurrage' ? 'DEM' : 'DET'}</span>` : '';
  const searchStr = norm([c.line_name, c.charge_name, c.charge_code, unitLabel, ...(c.line_aliases || []), ...(c.charge_aliases || [])].join(' '));
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-line="${escHtml(c.line_scac)}" data-dir="${escHtml(c.direction)}" data-search="${escHtml(searchStr)}">
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml(c.charge_name)}${kindBadge}
        <div class="text-[10px] text-slate-400 font-normal">${escHtml(c.charge_description || '')}</div></td>
      <td class="py-2 px-3 text-xs text-slate-600">${escHtml(unitLabel)}</td>
      <td class="py-2 px-3 text-xs text-right whitespace-nowrap">${amt}</td>
      <td class="py-2 px-3 text-[10px] text-slate-400">${c.route_via_unlocode ? 'qua Cái Mép' : ''} ${c.free_days != null ? `FreeDay ${c.free_days}` : ''}</td>
    </tr>`;
}

export async function render(root) {
  const repo = window.__vdg_repo;
  root.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">Biểu phí Local Charge</h1>
          <p class="text-xs text-slate-500">Theo hãng tàu — cột phí: <b>chưa VAT / có VAT</b>. Tìm theo tên phí, hãng, hay mã.</p>
        </div>
        <div class="flex gap-2 items-center">
          <select id="lc-line" class="border border-slate-200 rounded-lg px-2 py-2 text-sm"></select>
          <select id="lc-dir" class="border border-slate-200 rounded-lg px-2 py-2 text-sm">
            <option value="">Xuất + Nhập</option><option value="export">Xuất</option><option value="import">Nhập</option>
          </select>
          <input id="lc-search" type="search" placeholder="Tìm phí…" class="w-48 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50"><tr>${['Phí', 'Đơn vị tính', 'VND (chưa / có VAT)', ''].map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join('')}</tr></thead>
          <tbody id="lc-body"><tr><td colspan="4" class="p-4 text-slate-400 text-center text-xs">Đang tải…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  const body = root.querySelector('#lc-body');
  if (!repo) { body.innerHTML = `<tr><td colspan="4" class="p-4 text-red-500 text-center text-xs">Chưa sẵn sàng dữ liệu.</td></tr>`; return; }

  // F-20-01: seed + list bounded as one sequence — a stalled Drive write on a fresh
  // workspace resolves to a caught failure instead of hanging at "Đang tải…".
  async function loadAndRender() {
    const loadRes = await safeMasterLoad(async () => {
      await runSeedMigrations(repo, SEED_MIGRATIONS); // versioned + idempotent
      return Promise.all([
        repo.list(KIND, null).catch(() => []),
        repo.list(UNIT_KIND, null).catch(() => []),
      ]);
    }, 'local-charges:load');

    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, LOAD_COL_SPAN, LOAD_ERROR_MSG, LOAD_RETRY_LABEL, loadAndRender);
      return;
    }

    const [charges, units] = loadRes.value;
    const unitLabel = new Map(units.map((u) => [u.code, u.label_vi || u.code]));

    // line filter options (tên thân thiện, không SCAC)
    const lines = [...new Map(charges.map((c) => [c.line_scac, c.line_name])).entries()];
    root.querySelector('#lc-line').innerHTML = `<option value="">Tất cả hãng</option>` + lines.map(([scac, name]) => `<option value="${escHtml(scac)}">${escHtml(name)}</option>`).join('');

    charges.sort((a, b) => (a.line_name || '').localeCompare(b.line_name || '') || (a.direction || '').localeCompare(b.direction || '') || (a.charge_code || '').localeCompare(b.charge_code || ''));
    body.innerHTML = charges.length
      ? charges.map((c) => rowHtml(c, unitLabel.get(c.unit_code) || c.unit_code)).join('')
      : `<tr><td colspan="4" class="p-4 text-slate-400 text-center text-xs">Chưa có biểu phí.</td></tr>`;
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
}
