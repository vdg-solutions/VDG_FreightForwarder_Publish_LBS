// Workspace settings — F-15-36 / F-15-38
// Route: /manager/settings

import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { t }         from '../../i18n/index.js';
import { getLastFetchInfo, checkAndFetch as triggerFetch } from '../../boot/fx-auto-fetcher-init.js';
import { activeWorkspaceName } from '../../operators/workspace-registry.js';

const WORKSPACE_JSON_PATH = 'workspace.json';
const DEFAULT_FX_SOURCE   = 'Manual';
const FX_SOURCE_OPTIONS   = ['Vietcombank', 'SBV', 'Manual'];
const TOAST_MS            = 4_000;

function getApi() { return window.__vdg_drive_api; }

function toast(type, msg) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message: msg, duration: TOAST_MS } }));
}

async function getSharedFolder() {
  const api  = getApi();
  const root = await api.findWorkspaceRoot(activeWorkspaceName());
  if (!root) return null;
  return api.findFolder(root, '_shared');
}

async function loadSettings() {
  try {
    const api    = getApi();
    const shared = await getSharedFolder();
    if (!shared) return { fx_source: DEFAULT_FX_SOURCE };
    const q   = `name='${WORKSPACE_JSON_PATH}' and '${shared.id}' in parents and trashed=false`;
    const res = await api.driveFetch(
      'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
    );
    const f = res?.files?.[0];
    if (!f) return { fx_source: DEFAULT_FX_SOURCE };
    const data = await api.getFile(f.id);
    if (!data?.content) return { fx_source: DEFAULT_FX_SOURCE };
    return JSON.parse(data.content);
  } catch { /* Drive unavailable or workspace.json absent — use defaults */ return { fx_source: DEFAULT_FX_SOURCE }; }
}

async function saveSettings(settings) {
  const api    = getApi();
  const root   = await api.findWorkspaceRoot(activeWorkspaceName());
  if (!root) throw new Error('Workspace root not found');
  const shared = await api.getOrCreateFolder(root, '_shared');
  const content = JSON.stringify(settings, null, 2);
  const q   = `name='${WORKSPACE_JSON_PATH}' and '${shared.id}' in parents and trashed=false`;
  const res = await api.driveFetch(
    'GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
  );
  const f = res?.files?.[0];
  if (f) {
    // file exists: fetch etag then PATCH (uploadFile uses PATCH when etag non-null)
    const existing = await api.getFile(f.id);
    const etag     = existing?.etag || `etag-${Date.now()}`;
    await api.uploadFile(f.id, WORKSPACE_JSON_PATH, content, etag);
  } else {
    await api.uploadFile(shared.id, WORKSPACE_JSON_PATH, content, null);
  }
}

function lastFetchLabel(lastInfo) {
  if (!lastInfo?.success) return t('fx.auto_fetch.never');
  return new Date(lastInfo.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function settingsFormHtml(settings) {
  const srcOpts    = FX_SOURCE_OPTIONS.map((s) =>
    `<option value="${s}"${s === settings.fx_source ? ' selected' : ''}>${s}</option>`,
  ).join('');
  const lastInfo   = getLastFetchInfo();
  const isManual   = settings.fx_source === 'Manual';
  const corsBlock  = lastInfo?.error?.type === 'cors';
  const fetchText  = lastFetchLabel(lastInfo);
  return `
    <form id="settings-form" class="space-y-4 max-w-sm">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase tracking-wider" for="fx-source">
          ${t('fx.admin.col_source')} (${t('fx.admin.col_rate')})
        </label>
        <select id="fx-source" name="fx_source"
          class="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white">
          ${srcOpts}
        </select>
      </div>
      <div class="flex gap-3 items-center">
        <button type="submit"
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Save
        </button>
        <span id="settings-status" class="text-xs text-slate-400"></span>
      </div>
    </form>
    <div id="fx-auto-fetch-section" class="mt-4 space-y-2">
      <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
        ${t('fx.auto_fetch.last')}
      </p>
      <p id="fx-last-fetch-label" class="text-sm text-slate-700">${fetchText}</p>
      <button id="fx-refresh-btn" type="button"
        ${isManual ? `disabled title="${t('fx.auto_fetch.disabled_tooltip')}"` : ''}
        class="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50
               disabled:opacity-40 disabled:cursor-not-allowed">
        ${t('fx.auto_fetch.refresh_btn')}
      </button>
      ${corsBlock ? `<p class="text-xs text-red-500">${t('fx.auto_fetch.cors_blocked')}</p>` : ''}
    </div>`;
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  root.innerHTML = `<div class="p-6 max-w-2xl mx-auto"><div id="settings-mount">${t('loading')}</div></div>`;
  const mount = root.querySelector('#settings-mount');

  let settings = { fx_source: DEFAULT_FX_SOURCE };
  try { settings = await loadSettings(); }
  catch { /* use default */ }

  mount.innerHTML = `
    <h2 class="text-lg font-semibold text-slate-800 mb-4">${t('step_settings')}</h2>
    ${settingsFormHtml(settings)}`;

  mount.querySelector('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = mount.querySelector('#settings-status');
    statusEl.textContent = t('loading');
    try {
      const fd   = new FormData(e.target);
      const next = { ...settings, fx_source: fd.get('fx_source') };
      await saveSettings(next);
      settings = next;
      // Keep workspace settings in sync for FX worker
      window.__vdg_workspace_settings = next;
      toast('success', 'Saved');
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  // AC-08: Refresh now button — immediate fetch, label update in-place
  const refreshBtn = mount.querySelector('#fx-refresh-btn');
  if (refreshBtn && !refreshBtn.disabled) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      await triggerFetch();
      const updated = getLastFetchInfo();
      mount.querySelector('#fx-last-fetch-label').textContent = lastFetchLabel(updated);
      refreshBtn.disabled = false;
    });
  }
}
