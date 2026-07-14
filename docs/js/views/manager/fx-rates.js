// FX Rates admin grid — F-15-36
// Route: /manager/fx-rates

import { isManager }                               from '../../auth/auth-gate.js';
import { navigate }                                from '../../router.js';
import { t }                                       from '../../i18n/index.js';
import { FxRateDriveRepo }                         from '../../implementations/fx-rate-drive-repo.js';
import { validateRate, addRateEntry, FX_PAIR_DEFAULT } from '../../util/validate-rate.js';
import { activeWorkspaceName }                     from '../../operators/workspace-registry.js';
import { clearRateCache }                          from '../../util/fx-lookup.js';

const SOURCE_OPTIONS  = ['Vietcombank', 'SBV', 'Manual'];
const WORKSPACE_JSON  = 'workspace.json';
const TOAST_MS        = 4_000;

let _repo = null;

function getApi() { return window.__vdg_drive_api; }

function getFxRepo() {
  if (!_repo) {
    const api = getApi();
    _repo = new FxRateDriveRepo(api, () => api.findWorkspaceRoot(activeWorkspaceName()));
  }
  return _repo;
}

function currentYm() { return new Date().toISOString().slice(0, 7); }

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
      <td class="px-3 py-2 text-sm">${e.date || '—'}</td>
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
            <th class="px-3 py-2">${t('fx.admin.col_date')}</th>
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
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t('fx.admin.col_date')}</label>
        <input name="date" type="date" value="${prefill.date || ''}" required
          class="border border-slate-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase">${t('fx.admin.col_rate')} (${FX_PAIR_DEFAULT})</label>
        <input name="rate" type="number" value="${prefill.rate || ''}" required placeholder="25300"
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

  const ym    = currentYm();
  const repo  = getFxRepo();
  let entries = [], defSrc = 'Manual';
  try {
    [entries, defSrc] = await Promise.all([repo.listByMonth(ym), loadDefaultSource()]);
  } catch (err) {
    console.warn('[fx-rates] load failed:', err.message); // DEV
  }

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-4xl mx-auto">
      <h2 class="text-lg font-semibold text-slate-800">${t('fx.admin.title')} — ${ym}</h2>
      <div id="fx-grid-wrap"></div>
      <div id="fx-form-wrap"></div>
    </div>`;

  const gridWrap = root.querySelector('#fx-grid-wrap');
  const formWrap = root.querySelector('#fx-form-wrap');

  async function refresh(prefill = {}) {
    try { entries = await repo.listByMonth(ym); }
    catch { /* keep existing entries */ }
    renderGrid(gridWrap, entries, onEdit, onDelete);
    formWrap.innerHTML = addFormHtml(defSrc, prefill);
    wireForm(prefill._deleteFirst ?? null);
  }

  function onEdit(entry) {
    formWrap.innerHTML = addFormHtml(defSrc, {
      date: entry.date, rate: entry.rate, source: entry.source, _deleteFirst: entry,
    });
    wireForm(entry);
  }

  async function onDelete(entry) {
    try {
      await repo.deleteEntry(entry.date, entry.pair || FX_PAIR_DEFAULT);
      clearRateCache(); // D3: drop stale lookups so an open PNL form sees the delete
      toast('success', `${t('fx.admin.delete')}: ${entry.date}`);
    } catch (err) {
      toast('error', err.message);
    }
    await refresh();
  }

  function wireForm(deleteFirst) {
    const form  = root.querySelector('#fx-add-form');
    const errEl = root.querySelector('#fx-form-err');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errEl.textContent = '';
      const fd     = new FormData(form);
      const date   = fd.get('date')   || '';
      const rate   = fd.get('rate')   || '';
      const source = fd.get('source') || 'Manual';
      const validErr = validateRate(rate);
      if (validErr) { errEl.textContent = t(validErr); return; }
      // AC-05: dup check + append (or edit: delete-then-append) via util helper
      try {
        const entryErr = await addRateEntry(repo, date, FX_PAIR_DEFAULT, rate, source, deleteFirst);
        if (entryErr) { errEl.textContent = t(entryErr); return; }
        clearRateCache(); // D3: drop stale lookups so an open PNL form sees the new rate
        toast('success', t('fx.admin.add'));
        await refresh();
      } catch (err) {
        errEl.textContent = err.message;
      }
    });
  }

  await refresh();
}
