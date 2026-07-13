// Đơn vị tính (Unit of Measure) master — E-25 / F-25-02
// Route: /masters/units-of-measure
// Sales-friendly: hiển thị label_vi + aliases; mã ISO 6346 chỉ ở cột phụ mờ.

import { runSeedMigrations } from '../../../cache/seed-migrator.js';
import { safeMasterLoad, renderMasterLoadRetryRow } from '../../../util/master-load.js';

const KIND     = 'units-of-measure';
const SEED_URL = 'seed/masters/units-of-measure.jsonl';
// Bump this id (or add a new one) when the seed file gains rows — versioned, idempotent.
const SEED_MIGRATION = { id: '2026-07-09-units-of-measure-v1', kind: KIND, url: SEED_URL, key: (e) => e.code };

const LOAD_ERROR_MSG   = 'Không tải được dữ liệu.';
const LOAD_RETRY_LABEL = 'Thử lại';
const LOAD_COL_SPAN    = 5;

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Chuẩn hóa để search: bỏ dấu tiếng Việt + non-alphanumeric.
function norm(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

const CATEGORY_LABEL = { container: 'Container', billing: 'Cách tính' };

// F-20-01: bounded — a stalled Drive write on a fresh workspace resolves to
// { ok: false } instead of hanging the caller at "Đang tải…".
async function loadUnits(repo) {
  return safeMasterLoad(async () => {
    await runSeedMigrations(repo, [SEED_MIGRATION]); // versioned + idempotent, không đè user edit
    return (await repo.list(KIND, null).catch(() => [])) || [];
  }, 'units-of-measure:load');
}

function rowHtml(u) {
  const aliases = (u.aliases || []).slice(0, 6).map((a) => `<span class="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-slate-100 text-slate-600 text-[10px]">${escHtml(a)}</span>`).join('');
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-search="${escHtml(norm([u.code, u.label_vi, u.label_en, ...(u.aliases || [])].join(' ')))}">
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml(u.label_vi)}</td>
      <td class="py-2 px-3 text-xs text-slate-500">${escHtml(u.label_en)}</td>
      <td class="py-2 px-3 text-xs"><span class="px-2 py-0.5 rounded ${u.category === 'container' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">${CATEGORY_LABEL[u.category] || u.category}</span></td>
      <td class="py-2 px-3">${aliases}</td>
      <td class="py-2 px-3 text-[10px] font-mono text-slate-400" title="Mã chuẩn quốc tế">${escHtml(u.iso6346 || u.unece_code || u.code)}</td>
    </tr>`;
}

export async function render(root) {
  const repo = window.__vdg_repo;
  root.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">Đơn vị tính</h1>
          <p class="text-xs text-slate-500">Chuẩn quốc tế ISO 6346 (container) + UN/ECE (cách tính) — tìm theo bất kỳ tên gọi nào.</p>
        </div>
        <input id="uom-search" type="search" placeholder="Tìm: 20DC, cont 20 khô, per bill…"
          class="w-64 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50">
            <tr>${['Tên (VI)', 'Tên (EN)', 'Nhóm', 'Cách gọi khác (alias)', 'Mã chuẩn'].map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join('')}</tr>
          </thead>
          <tbody id="uom-body"><tr><td colspan="5" class="p-4 text-slate-400 text-center text-xs">Đang tải…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  const body = root.querySelector('#uom-body');
  if (!repo) { body.innerHTML = `<tr><td colspan="5" class="p-4 text-red-500 text-center text-xs">Chưa sẵn sàng dữ liệu.</td></tr>`; return; }

  async function loadAndRender() {
    const loadRes = await loadUnits(repo);
    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, LOAD_COL_SPAN, LOAD_ERROR_MSG, LOAD_RETRY_LABEL, loadAndRender);
      return;
    }
    const units = loadRes.value;
    units.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.label_vi || '').localeCompare(b.label_vi || ''));
    body.innerHTML = units.length ? units.map(rowHtml).join('') : `<tr><td colspan="5" class="p-4 text-slate-400 text-center text-xs">Chưa có đơn vị.</td></tr>`;
  }

  await loadAndRender();

  root.querySelector('#uom-search').addEventListener('input', (e) => {
    const q = norm(e.target.value);
    body.querySelectorAll('tr[data-search]').forEach((tr) => {
      tr.style.display = !q || tr.dataset.search.includes(q) ? '' : 'none';
    });
  });
}
