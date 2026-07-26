// FX Rates admin grid — F-15-36 / F-29-11 (explicit valid_from/valid_to ranges)
// Route: /manager/fx-rates

import { isManager }                               from '../../auth/auth-gate.js';
import { navigate }                                from '../../router.js';
import { t }                                       from '../../i18n/index.js';
import { FxRateDriveRepo }                         from '../../implementations/fx-rate-drive-repo.js';
import { validateRate, addRateEntry, FX_PAIR_DEFAULT } from '../../util/validate-rate.js';
import { activeWorkspaceName }                     from '../../operators/workspace-registry.js';
import { clearRateCache }                          from '../../util/fx-lookup.js';
import { currentUserRole }                         from '../../operators/manager/route-guard.js';
import { safeMasterLoad, renderMasterLoadRetryStatus } from '../../util/master-load.js';
import { isViewSuperseded }                        from '../../util/view-root.js';

const SOURCE_OPTIONS  = ['Vietcombank', 'SBV', 'Manual'];
const WORKSPACE_JSON  = 'workspace.json';
const TOAST_MS        = 4_000;
const LOAD_TAG        = 'fx-rates:list';
const SOURCE_TAG      = 'fx-rates:source';
// F-19-75: below RENDER_MOUNT_TIMEOUT_MS (8000ms) so a stalled load's inline retry paints
// before mount-view.js's outer mount-timeout fallback can fire.
const VIEW_DATA_LOAD_BUDGET_MS = 6_000;

let _repo = null;

function getApi() { return window.__vdg_drive_api; }

function getFxRepo() {
  if (!_repo) {
    const api = getApi();
    _repo = new FxRateDriveRepo(api, () => api.findWorkspaceRoot(activeWorkspaceName()));
  }
  return _repo;
}

function toast(type, msg) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message: msg, duration: TOAST_MS } }));
}

/// Load fx_source from workspace.json; returns 'Manual' as default.
async function loadDefaultSource() {
  try {
    const api    = getApi();
    const root   = await api.findWorkspaceRoot(activeWorkspaceName());
    if (!root) return 'Manual';
    const shared = await api.findFolder(root, '_shared');
    if (!shared) return 'Manual';
    const q   = `name='${WORKSPACE_JSON}' and '${shared.id}' in parents and trashed=false`;
    const res = await api.driveFetch(
      'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    );
    const f = res?.files?.[0];
    if (!f) return 'Manual';
    const data = await api.getFile(f.id);
    if (!data?.content) return 'Manual';
    return JSON.parse(data.content).fx_source || 'Manual';
  } catch { return 'Manual'; }
}

function sourceLabel(src) {
  const map = { SBV: 'fx.source.sbv', Vietcombank: 'fx.source.vcb', Manual: 'fx.source.manual' };
  return t(map[src] || 'fx.source.manual');
}

function renderGrid(container, entries, onEdit, onDelete) {
  if (!entries.length) {
    container.innerHTML = `<p class="text-sm text-slate-400 py-4">${t('no_data')}</p>`;
    return;
  }
  const rows = entries.map((e, i) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50">
      <td class="px-3 py-2 text-sm">${e.valid_from || '—'}</td>
      <td class="px-3 py-2 text-sm">${e.valid_to || '—'}</td>
      <td class="px-3 py-2 text-sm">${e.pair || FX_PAIR_DEFAULT}</td>
      <td class="px-3 py-2 text-sm font-mono text-right">${
        e.rate != null ? Number(e.rate).toLocaleString('vi-VN') : '—'
      }</td>
      <td class="px-3 py-2 text-sm">${sourceLabel(e.source)}</td>
      <td class="px-3 py-2 text-xs flex gap-2">
        <button data-edit="${i}" class="text-blue-600 hover:underline">${t('fx.admin.edit')}</button>
        <button data-delete="${i}" class="text-red-500 hover:underline">${t('fx.admin.delete')}</button>
      </td>
    </tr>`).join('');
  container.innerHTML = `
    <div class="overflow-x-auto rounded-lg border border-slate-200">
      <table class="w-full text-left" id="fx-grid">
        <thead class="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
          <tr>
            <th class="px-3 py-2">${t('fx.admin.col_valid_from')}</th>
            <th class="px-3 py-2">${t('fx.admin.col_valid_to')}</th>
            <th class="px-3 py-2">${t('fx.admin.col_pair')}</th>
            <th class="px-3 py-2 text-right">${t('fx.admin.col_rate')}</th>
            <th class="px-3 py-2">${t('fx.admin.col_source')}</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => onEdit(entries[Number(btn.dataset.edit)]));
  });
  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => onDelete(entries[Number(btn.dataset.delete)]));
  });
}

function addFormHtml(defaultSource, prefill = {}) {
  const srcOpts = SOURCE_OPTIONS.map((s) =>
    `<option value="${s}"${s === (prefill.source || defaultSource) ? ' selected' : ''}>${sourceLabel(s)}</option>`,
  ).join('');
  return `
    <form id="fx-add-form" class="flex flex-wrap gap-3 items-end mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t('fx.admin.col_valid_from')}</label>
        <input name="valid_from" type="date" value="${prefill.valid_from || ''}" required
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t('fx.admin.col_valid_to')}</label>
        <input name="valid_to" type="date" value="${prefill.valid_to || ''}" required
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t('fx.admin.col_rate')} (${FX_PAIR_DEFAULT})</label>
        <input name="rate" type="number" value="${prefill.rate || ''}" required placeholder="26460"
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t('fx.admin.col_source')}</label>
        <select name="source"
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
          ${srcOpts}
        </select>
      </div>
      <button type="submit"
        class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        ${t('fx.admin.add')}
      </button>
      <span id="fx-form-err" class="text-xs text-red-500 self-center"></span>
    </form>`;
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  const repo  = getFxRepo();
  let entries = [], defSrc = 'Manual';

  // Paint shell first — before any Drive await — so a stalled load degrades to an inline
  // retry inside the painted shell instead of a pre-paint blank (AC-08).
  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-4xl mx-auto">
      <h2 class="text-lg font-semibold text-slate-800">${t('fx.admin.title')}</h2>
      <div id="fx-grid-wrap"></div>
      <div id="fx-form-wrap"></div>
      <div id="fx-status" class="text-xs text-slate-400"></div>
    </div>`;

  const gridWrap = root.querySelector('#fx-grid-wrap');
  const formWrap = root.querySelector('#fx-form-wrap');
  const statusEl = root.querySelector('#fx-status');

  // F-19-75: single bounded reload — subsumes the old refresh(); listAll() runs at most
  // once per call (AC-03), never a pre-paint + post-paint double fetch.
  async function reload(prefill = {}) {
    if (isViewSuperseded(root)) return;
    const [listRes, srcRes] = await Promise.all([
      safeMasterLoad(() => repo.listAll(), LOAD_TAG, VIEW_DATA_LOAD_BUDGET_MS),
      safeMasterLoad(loadDefaultSource, SOURCE_TAG, VIEW_DATA_LOAD_BUDGET_MS),
    ]);
    if (isViewSuperseded(root)) return;
    defSrc = srcRes.ok ? srcRes.value : 'Manual';
    if (!listRes.ok) {
      gridWrap.innerHTML = '';
      renderMasterLoadRetryStatus(statusEl, t('masters.load_error'), t('retry'), () => reload());
      return;
    }
    entries = listRes.value;
    statusEl.textContent = '';
    renderGrid(gridWrap, entries, onEdit, onDelete);
    formWrap.innerHTML = addFormHtml(defSrc, prefill);
    wireForm(prefill._deleteFirst ?? null);
  }

  function onEdit(entry) {
    formWrap.innerHTML = addFormHtml(defSrc, {
      valid_from: entry.valid_from, valid_to: entry.valid_to,
      rate: entry.rate, source: entry.source, _deleteFirst: entry,
    });
    wireForm(entry);
  }

  async function onDelete(entry) {
    try {
      await repo.deleteEntry(entry.valid_from, entry.valid_to, entry.pair || FX_PAIR_DEFAULT);
      clearRateCache(); // drop stale lookups so an open PNL form sees the delete
      toast('success', `${t('fx.admin.delete')}: ${entry.valid_from}`);
    } catch (err) {
      toast('error', err.message);
    }
    await reload();
  }

  function wireForm(deleteFirst) {
    const form  = root.querySelector('#fx-add-form');
    const errEl = root.querySelector('#fx-form-err');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.textContent = '';
      const fd        = new FormData(form);
      const validFrom = fd.get('valid_from') || '';
      const validTo   = fd.get('valid_to')   || '';
      const rate      = fd.get('rate')       || '';
      const source    = fd.get('source')     || 'Manual';
      const validErr = validateRate(rate);
      if (validErr) { errEl.textContent = t(validErr); return; }
      try {
        const entryErr = await addRateEntry(
          repo, validFrom, validTo, FX_PAIR_DEFAULT, rate, source, currentUserRole(), deleteFirst,
        );
        if (entryErr) { errEl.textContent = t(entryErr); return; }
        clearRateCache(); // drop stale lookups so an open PNL form sees the new rate
        toast('success', t('fx.admin.add'));
        await reload();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  await reload();
}
