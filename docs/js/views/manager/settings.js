// Workspace settings — F-15-36 / F-29-11
// Route: /manager/settings
// F-29-11: runtime FX auto-fetch retired. fx_source stays as the default
// attribution label for a manually entered rate, not a fetch trigger.

import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { t }         from '../../i18n/index.js';
import { activeWorkspaceName } from '../../operators/workspace-registry.js';
import { loadWorkspaceSettings, saveWorkspaceSettings, SECOND_EYES_FIELD } from '../../operators/manager/workspace-settings.js';

const DEFAULT_FX_SOURCE = 'Manual';
const FX_SOURCE_OPTIONS = ['Vietcombank', 'SBV', 'Manual'];
const TOAST_MS          = 4_000;

function getApi() { return window.__vdg_drive_api; }

function toast(type, msg) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message: msg, duration: TOAST_MS } }));
}

function settingsFormHtml(settings) {
  const srcOpts = FX_SOURCE_OPTIONS.map((s) =>
    `<option value="${s}"${s === settings.fx_source ? ' selected' : ''}>${s}</option>`,
  ).join('');
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
      <div class="flex items-center gap-2">
        <input id="second-eyes" name="${SECOND_EYES_FIELD}" type="checkbox" ${settings[SECOND_EYES_FIELD] ? 'checked' : ''}
          class="rounded border-slate-300 focus:ring-2 focus:ring-blue-100" />
        <label class="text-xs text-slate-600" for="second-eyes">${t('settings.second_eyes.label')}</label>
      </div>
      <div class="flex gap-3 items-center">
        <button type="submit"
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          ${t('common.action.save')}
        </button>
        <span id="settings-status" class="text-xs text-slate-400"></span>
      </div>
    </form>`;
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  root.innerHTML = `<div class="p-6 max-w-2xl mx-auto"><div id="settings-mount">${t('loading')}</div></div>`;
  const mount = root.querySelector('#settings-mount');

  const api  = getApi();
  const ws   = activeWorkspaceName();
  let settings = { fx_source: DEFAULT_FX_SOURCE, [SECOND_EYES_FIELD]: false };
  try { settings = await loadWorkspaceSettings(api, ws); }
  catch { /* use default */ }
  window.__vdg_workspace_settings = settings;

  mount.innerHTML = `
    <h2 class="text-lg font-semibold text-slate-800 mb-4">${t('step_settings')}</h2>
    ${settingsFormHtml(settings)}`;

  mount.querySelector('#settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = mount.querySelector('#settings-status');
    statusEl.textContent = t('loading');
    try {
      const fd   = new FormData(e.target);
      const next = { ...settings, fx_source: fd.get('fx_source'), [SECOND_EYES_FIELD]: fd.get(SECOND_EYES_FIELD) === 'on' };
      await saveWorkspaceSettings(api, ws, next);
      settings = next;
      toast('success', 'Saved');
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });
}
