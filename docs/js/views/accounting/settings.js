// Accounting settings — #31. Route: /accounting/settings
//
// Home for the workspace's finance policy, starting with the default P&L currency. It sits under
// /accounting, not /manager, because accounting sets it and the route rule for /accounting already
// admits Accountant + Manager (boundary/access_policy.rs) — no policy change was needed to give
// the accountant the control they own.
//
// What the default actually does: it seeds the currency a NEW P&L header opens in, which in turn
// seeds each line's currency select. No arithmetic reads it — every conversion is per line and
// every total is in VND — so this is a starting point, not a control over money.

import { hasRole, ROLE_MANAGER, ROLE_ACCOUNTANT } from '../../auth/auth-gate.js';
import { navigate } from '../../router.js';
import { t }        from '../../i18n/index.js';
import { activeWorkspaceName } from '../../operators/workspace-registry.js';
import { loadWorkspaceSettings, saveWorkspaceSettings, DEFAULT_CURRENCY_FIELD }
  from '../../operators/manager/workspace-settings.js';
import { LINE_CURRENCY_OPTIONS, DEFAULT_HEADER_CURRENCY } from '../sales-new-form/pnl-line-fx.js';
import { safeMasterLoad } from '../../util/master-load.js';
import { canEditDefaultCurrency, periodOf, LOCK_REASON_PERIOD_CLOSED }
  from '../../operators/manager/default-currency-lock.js';
import { getCurrentPeriodLock } from '../../operators/manager/period-close-orchestrator.js';
import { listShipments } from '../../data/shipment-repo.js';

const TOAST_MS = 4_000;

function getApi()  { return window.__vdg_drive_api; }
function getRepo() { return window.__vdg_repo; }

function toast(type, msg) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message: msg, duration: TOAST_MS } }));
}

/// Which codes accounting may pick — Rust owns the list (boundary/workspace_config.rs), because a
/// default the P&L line select cannot render would seed a header no line could ever match.
function selectableCurrencies() {
  const bridge = window.workspace_selectable_currencies;
  if (typeof bridge !== 'function') return LINE_CURRENCY_OPTIONS;
  try { return JSON.parse(bridge()); } catch { return LINE_CURRENCY_OPTIONS; }
}

function lockNoticeHtml(lock) {
  if (lock.editable) return '';
  const key = lock.reason === LOCK_REASON_PERIOD_CLOSED
    ? 'settings.default_currency.locked_closed'
    : 'settings.default_currency.locked_in_period';
  return `<span class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
    ${t(key, { n: lock.jobCount })}</span>`;
}

function formHtml(settings, lock) {
  const curOpts = selectableCurrencies().map((c) =>
    `<option value="${c}"${c === settings[DEFAULT_CURRENCY_FIELD] ? ' selected' : ''}>${c}</option>`,
  ).join('');
  const frozen = lock.editable ? '' : ' disabled';
  return `
    <form id="acct-settings-form" class="space-y-4 max-w-sm">
      <div class="flex flex-col gap-1">
        <label class="text-[11px] font-medium text-slate-500 uppercase tracking-wider" for="default-currency">
          ${t('settings.default_currency.label')}
        </label>
        <select id="default-currency" name="${DEFAULT_CURRENCY_FIELD}"${frozen}
          class="border border-slate-200 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100${frozen ? ' bg-slate-50 text-slate-500' : ' bg-white'}">
          ${curOpts}
        </select>
        <span class="text-[11px] text-slate-400">${t('settings.default_currency.hint')}</span>
        ${lockNoticeHtml(lock)}
      </div>
      <div class="flex gap-3 items-center">
        <button type="submit"${frozen}
          class="px-4 py-2 text-white text-sm rounded-lg ${frozen ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700'}">
          ${t('common.action.save')}
        </button>
        <span id="acct-settings-status" class="text-xs text-slate-400"></span>
      </div>
    </form>`;
}

export async function render(root) {
  if (!hasRole(ROLE_ACCOUNTANT) && !hasRole(ROLE_MANAGER)) { navigate('/pending-access'); return; }

  root.innerHTML = `<div class="p-6 max-w-2xl mx-auto"><div id="acct-settings-mount">${t('loading')}</div></div>`;
  const mount = root.querySelector('#acct-settings-mount');

  const api = getApi();
  const ws  = activeWorkspaceName();
  const defaultSettings = { [DEFAULT_CURRENCY_FIELD]: DEFAULT_HEADER_CURRENCY };
  // Cache-first + bounded, same shape as manager/settings.js. The read is a local store hit now
  // (workspace_settings is a repo kind), so this is cheap — the bound only covers the one-time
  // legacy workspace.json migration path.
  const settingsRes = await safeMasterLoad(() => loadWorkspaceSettings(api, ws), 'acct-settings:load');
  let settings = window.__vdg_workspace_settings ?? (settingsRes.ok ? settingsRes.value : defaultSettings);
  window.__vdg_workspace_settings = settings;

  // Owner 2026-08-14: the default may not move once the current period carries jobs. Bounded like
  // every other read on a render path — an unavailable list degrades to "no jobs seen", i.e. the
  // control stays usable rather than freezing the accountant out on a store hiccup; the save guard
  // below re-checks against a fresh read before it writes.
  const period   = periodOf(new Date());
  const shipRes  = await safeMasterLoad(() => listShipments(getRepo(), null), 'acct-settings:ships');
  const periodLock = await getCurrentPeriodLock(getRepo(), period);
  const lock     = canEditDefaultCurrency(shipRes.ok ? shipRes.value : [], period, periodLock.locked);

  mount.innerHTML = `
    <h2 class="text-lg font-semibold text-slate-800 mb-4">${t('nav.accounting.settings')}</h2>
    ${formHtml(settings, lock)}`;

  mount.querySelector('#acct-settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = mount.querySelector('#acct-settings-status');
    statusEl.textContent = t('loading');
    try {
      // Re-check at the write, not just at the render: the screen may have been open since before
      // the period's first job was booked, and a disabled control is a hint, never the rule.
      const fresh    = await safeMasterLoad(() => listShipments(getRepo(), null), 'acct-settings:ships2');
      const thisMonth = periodOf(new Date());
      const freshLock = await getCurrentPeriodLock(getRepo(), thisMonth);
      const now = canEditDefaultCurrency(fresh.ok ? fresh.value : [], thisMonth, freshLock.locked);
      if (!now.editable) {
        statusEl.textContent = t(now.reason === LOCK_REASON_PERIOD_CLOSED
          ? 'settings.default_currency.locked_closed'
          : 'settings.default_currency.locked_in_period', { n: now.jobCount });
        return;
      }
      // Spread over the CURRENT settings, never over defaults: this screen owns one field, and
      // rewriting the row from a partial object would blank fx_source and the second-eyes flag.
      const next = { ...settings, [DEFAULT_CURRENCY_FIELD]: new FormData(e.target).get(DEFAULT_CURRENCY_FIELD) };
      await saveWorkspaceSettings(api, ws, next);
      settings = next;
      toast('success', t('settings.toast.saved'));
      statusEl.textContent = '';
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });
}
