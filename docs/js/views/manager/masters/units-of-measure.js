// Đơn vị tính (Unit of Measure) master — E-25 / F-25-02, CRUD added F-28-08
// Route: /masters/units-of-measure
// Sales-friendly: hiển thị label_vi + aliases; mã ISO 6346 chỉ ở cột phụ mờ.

import { isManager } from '../../../auth/auth-gate.js';
import { currentUserRole, ROLE_MANAGER } from '../../../operators/manager/route-guard.js';
import { MASTER_REGISTRY } from '../../../data/master-registry.js';
import { showConfirm } from '../../../helpers/show-confirm.js';
import { runSeedMigrations } from '../../../cache/seed-migrator.js';
import { safeMasterLoad, renderMasterLoadRetryRow } from '../../../util/master-load.js';
import { genUnitId, validateUnit, checkCodeUnique } from '../../../util/uom-validators.js';

const KIND     = 'units-of-measure';
const SEED_URL = 'seed/masters/units-of-measure.jsonl';
// Bump this id (or add a new one) when the seed file gains rows — versioned, idempotent.
// Exported for AC-03 direct materialization testing (F-28-08).
export const SEED_MIGRATION = { id: '2026-07-09-units-of-measure-v1', kind: KIND, url: SEED_URL, key: (e) => e.code };

const LOAD_ERROR_MSG   = 'Không tải được dữ liệu.';
const LOAD_RETRY_LABEL = 'Thử lại';
const BASE_COL_SPAN    = 5;

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

// F-28-08: registry-driven writer gate — mirrors app.js/sidebar.js's effectiveRole pattern.
function canWrite() {
  const role = isManager() ? ROLE_MANAGER : currentUserRole();
  return MASTER_REGISTRY[KIND].writers.includes(role);
}

function buildModal(entity) {
  const e = entity || {};
  const aliases = (e.aliases || []).join(', ');
  return `
    <dialog id="uom-modal" class="rounded-xl border border-slate-200 shadow-xl p-0 w-full max-w-lg backdrop:bg-black/30">
      <form id="uom-modal-form" method="dialog" class="p-6 space-y-4">
        <div class="text-base font-semibold text-slate-900 mb-1">${entity ? 'Sửa đơn vị tính' : 'Thêm đơn vị tính'}</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Mã <span class="text-red-500">*</span></label>
            <input id="m-code" type="text" value="${escHtml(e.code)}" ${entity ? 'readonly' : ''} required
                   class="w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400 ${entity ? 'bg-slate-50 text-slate-500' : ''}" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Nhóm</label>
            <select id="m-category" class="w-full border rounded-lg px-3 py-2 text-sm">
              ${Object.entries(CATEGORY_LABEL).map(([v, l]) => `<option value="${v}" ${e.category === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <span id="m-err-code" class="hidden text-xs text-red-600"></span>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Tên (VI) <span class="text-red-500">*</span></label>
            <input id="m-label-vi" type="text" value="${escHtml(e.label_vi)}" required
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Tên (EN)</label>
            <input id="m-label-en" type="text" value="${escHtml(e.label_en)}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <span id="m-err-label-vi" class="hidden text-xs text-red-600"></span>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Cỡ (feet)</label>
            <input id="m-size-ft" type="number" min="0" value="${e.size_ft ?? ''}"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Loại thiết bị</label>
            <input id="m-equip" type="text" value="${escHtml(e.equipment_kind)}" placeholder="dry / reefer / high_cube / open_top / flat_rack / tank"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Cách gọi khác (alias)</label>
          <input id="m-aliases" type="text" value="${escHtml(aliases)}" placeholder="comma-separated, vd 20DC, cont 20 khô"
                 class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Mô tả</label>
          <textarea id="m-desc" rows="2"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">${escHtml(e.description)}</textarea>
        </div>
        <div class="flex gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Lưu</button>
          <button type="button" id="btn-uom-cancel" class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Hủy</button>
        </div>
      </form>
    </dialog>`;
}

function openModal(root, entity, items, onSave) {
  root.querySelector('#uom-modal')?.remove();
  root.insertAdjacentHTML('beforeend', buildModal(entity));
  const dialog = root.querySelector('#uom-modal');
  dialog.showModal();
  dialog.querySelector('#btn-uom-cancel').addEventListener('click', () => dialog.close());
  dialog.querySelector('#uom-modal-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const code       = entity ? entity.code : dialog.querySelector('#m-code').value.trim().toUpperCase();
    const category   = dialog.querySelector('#m-category').value;
    const labelVi    = dialog.querySelector('#m-label-vi').value.trim();
    const labelEn    = dialog.querySelector('#m-label-en').value.trim();
    const sizeFtRaw  = dialog.querySelector('#m-size-ft').value;
    const equip      = dialog.querySelector('#m-equip').value.trim();
    const aliases    = dialog.querySelector('#m-aliases').value.split(',').map((a) => a.trim()).filter(Boolean);
    const desc       = dialog.querySelector('#m-desc').value.trim();

    const setErr = (id, msg) => {
      const el = dialog.querySelector(id);
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('hidden', !msg);
    };
    setErr('#m-err-code', ''); setErr('#m-err-label-vi', '');

    const err = validateUnit(code, labelVi);
    if (err) { setErr(err.includes('Mã') ? '#m-err-code' : '#m-err-label-vi', err); return; }

    if (!entity) {
      const dupErr = checkCodeUnique(items, code);
      if (dupErr) { setErr('#m-err-code', dupErr); return; }
    }

    const updated = {
      ...(entity || {}),
      id: entity?.id || genUnitId(code),
      code,
      category,
      label_vi: labelVi,
      label_en: labelEn,
      aliases,
      description: desc,
    };
    if (sizeFtRaw !== '') updated.size_ft = Number(sizeFtRaw); else delete updated.size_ft;
    if (equip) updated.equipment_kind = equip; else delete updated.equipment_kind;

    await onSave(updated);
    dialog.close();
  });
}

function rowHtml(u, isEditor) {
  const aliases = (u.aliases || []).slice(0, 6).map((a) => `<span class="inline-block px-1.5 py-0.5 mr-1 mb-1 rounded bg-slate-100 text-slate-600 text-[10px]">${escHtml(a)}</span>`).join('');
  const actions = isEditor ? `
    <button class="btn-edit text-xs text-blue-600 hover:underline mr-2" data-id="${escHtml(u.id)}">Sửa</button>
    <button class="btn-delete text-xs text-red-500 hover:underline" data-id="${escHtml(u.id)}">Xóa</button>` : '';
  return `
    <tr class="border-b border-slate-100 hover:bg-slate-50" data-id="${escHtml(u.id)}" data-search="${escHtml(norm([u.code, u.label_vi, u.label_en, ...(u.aliases || [])].join(' ')))}">
      <td class="py-2 px-3 text-xs font-medium text-slate-900">${escHtml(u.label_vi)}</td>
      <td class="py-2 px-3 text-xs text-slate-500">${escHtml(u.label_en)}</td>
      <td class="py-2 px-3 text-xs"><span class="px-2 py-0.5 rounded ${u.category === 'container' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}">${CATEGORY_LABEL[u.category] || u.category}</span></td>
      <td class="py-2 px-3">${aliases}</td>
      <td class="py-2 px-3 text-[10px] font-mono text-slate-400" title="Mã chuẩn quốc tế">${escHtml(u.iso6346 || u.unece_code || u.code)}</td>
      ${isEditor ? `<td class="py-2 px-3">${actions}</td>` : ''}
    </tr>`;
}

// F-20-01: bounded — a stalled Drive write on a fresh workspace resolves to
// { ok: false } instead of hanging the caller at "Đang tải…".
async function loadUnits(repo) {
  return safeMasterLoad(async () => {
    await runSeedMigrations(repo, [SEED_MIGRATION]); // versioned + idempotent, không đè user edit
    return (await repo.list(KIND, null).catch(() => [])) || [];
  }, 'units-of-measure:load');
}

export async function render(root) {
  const repo      = window.__vdg_repo;
  const isEditor  = canWrite();
  const colSpan   = BASE_COL_SPAN + (isEditor ? 1 : 0);
  const headers   = ['Tên (VI)', 'Tên (EN)', 'Nhóm', 'Cách gọi khác (alias)', 'Mã chuẩn'];
  if (isEditor) headers.push('Thao tác');

  root.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-lg font-semibold text-slate-900">Đơn vị tính</h1>
          <p class="text-xs text-slate-500">Chuẩn quốc tế ISO 6346 (container) + UN/ECE (cách tính) — tìm theo bất kỳ tên gọi nào.</p>
        </div>
        <div class="flex gap-2 items-center">
          <input id="uom-search" type="search" placeholder="Tìm: 20DC, cont 20 khô, per bill…"
            class="w-64 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          ${isEditor ? `<button id="btn-uom-add" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap">+ Thêm</button>` : ''}
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50">
            <tr>${headers.map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600">${h}</th>`).join('')}</tr>
          </thead>
          <tbody id="uom-body"><tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">Đang tải…</td></tr></tbody>
        </table>
      </div>
    </div>`;

  const body = root.querySelector('#uom-body');
  if (!repo) { body.innerHTML = `<tr><td colspan="${colSpan}" class="p-4 text-red-500 text-center text-xs">Chưa sẵn sàng dữ liệu.</td></tr>`; return; }

  let units = [];

  async function loadAndRender() {
    const loadRes = await loadUnits(repo);
    if (!loadRes.ok) {
      renderMasterLoadRetryRow(body, colSpan, LOAD_ERROR_MSG, LOAD_RETRY_LABEL, loadAndRender);
      return;
    }
    units = loadRes.value;
    units.sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.label_vi || '').localeCompare(b.label_vi || ''));
    body.innerHTML = units.length ? units.map((u) => rowHtml(u, isEditor)).join('') : `<tr><td colspan="${colSpan}" class="p-4 text-slate-400 text-center text-xs">Chưa có đơn vị.</td></tr>`;
  }

  await loadAndRender();

  root.querySelector('#uom-search').addEventListener('input', (e) => {
    const q = norm(e.target.value);
    body.querySelectorAll('tr[data-search]').forEach((tr) => {
      tr.style.display = !q || tr.dataset.search.includes(q) ? '' : 'none';
    });
  });

  root.querySelector('#btn-uom-add')?.addEventListener('click', () => {
    openModal(root, null, units, async (entity) => { await repo.put(KIND, entity.id, entity); await loadAndRender(); });
  });

  body.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const entity = units.find((i) => i.id === editBtn.dataset.id);
      if (entity) openModal(root, entity, units, async (u) => { await repo.put(KIND, u.id, u); await loadAndRender(); });
    }
    const delBtn = ev.target.closest('.btn-delete');
    if (delBtn) {
      const ok = await showConfirm({
        title: 'Xóa đơn vị tính này?', confirmLabel: 'Xóa', cancelLabel: 'Hủy', destructive: true,
      });
      if (!ok) return;
      units = units.filter((i) => i.id !== delBtn.dataset.id);
      body.querySelector(`tr[data-id="${delBtn.dataset.id}"]`)?.remove();
      await repo.delete(KIND, delBtn.dataset.id);
    }
  });
}
