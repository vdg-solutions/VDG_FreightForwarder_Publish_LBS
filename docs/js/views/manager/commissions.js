// Manager Commission Settlement — F-14-08

import '../../components/commission-slip.js';
import { hasRole, ROLE_MANAGER } from '../../auth/auth-gate.js';
import { renderSuggestionsBanner } from './commission/suggestions-banner.js';
import { t }                  from '../../i18n/index.js';
import { navigate }           from '../../router.js';
import { showConfirm }        from '../../helpers/show-confirm.js';
import {
  computeCommissions, buildPeriodKey,
  KIND_SHIPMENT, KIND_PNL_LINE,
} from '../../operators/manager/commission-calculator.js';
import { compose as composeRules } from '../../operators/manager/commission-composer.js';
import { bulkPut }            from '../../cache/bulk-orchestrator.js';
import { PREF_LOCKED_PERIODS_KEY } from '../../cache/period-lock-ui.js';
import { safeMasterLoad }     from '../../util/master-load.js';

const PAYOUT_KIND          = 'commission_payout';
const KIND_COMMISSION_RULES = 'commission_rules';
const DEFAULT_PERIOD_MODE  = 'month';
const TOAST_AUTODISMISS_MS = 5_000;
const PREFS_META_KEY       = 'preferences';

let _shipments   = [];
let _pnlLines    = [];
let _payouts     = [];
let _rules       = new Map();
let _prefs       = {};
let _periodMode  = DEFAULT_PERIOD_MODE;
const _periodDate  = new Date();
let _onEntity;
let _loadInFlight = false; // AC-06: guards entity-changed re-entry during a bounded load

function getRepo()      { return window.__vdg_repo; }
function currentUser()  { return window.__vdg_auth?.getCurrentUser?.()?.email || 'manager'; }
function fmtNum(n)      { return Number(n ?? 0).toLocaleString('vi-VN'); }

function currentPeriodKey() { return buildPeriodKey(_periodMode, _periodDate); }

function isSettled(salesId, periodKey) {
  return _payouts.some((p) => p.sales_rep === salesId && p.period === periodKey);
}

function renderTable(root, rows) {
  const table = root?.querySelector('#commission-table');
  if (!table) return; // view navigated away — stale entity-changed listener, skip
  const key     = currentPeriodKey();
  const rowHtml = rows.map((r) => {
    const settled = isSettled(r.salesId, key);
    const cls     = settled ? 'opacity-60' : '';
    const badge   = settled
      ? `<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">${t('commission.status.Settled')}</span>`
      : `<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">${t('commission.status.Pending')}</span>`;
    const printBtn = settled
      ? `<button class="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200 btn-print-slip"
           data-sales="${r.salesId}" title="${t('commission.settle.print_slip')}">${t('commission.settle.print_slip')}</button>` : '';
    return `<tr class="${cls}">
      <td class="py-2 px-3 text-xs">${r.salesName}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum(r.margin)}</td>
      <td class="py-2 px-3 text-xs text-right text-red-600">${fmtNum(r.tndn)}</td>
      <td class="py-2 px-3 text-xs text-right text-amber-700">${fmtNum(r.comDeductions)}</td>
      <td class="py-2 px-3 text-xs text-right font-medium">${fmtNum(r.netAfterDeductions)}</td>
      <td class="py-2 px-3 text-xs text-center">${(r.salesSharePct || 0).toFixed(0)}%</td>
      <td class="py-2 px-3 text-xs text-right text-green-700 font-medium">${fmtNum(r.commission)}</td>
      <td class="py-2 px-3 text-xs text-right text-slate-500">${fmtNum(r.lbsShare)}</td>
      <td class="py-2 px-3 text-xs text-right">${fmtNum(r.advances)}</td>
      <td class="py-2 px-3 text-xs text-right font-semibold">${fmtNum(r.netPayable)}</td>
      <td class="py-2 px-3">${badge}</td>
      <td class="py-2 px-3">${printBtn}</td>
    </tr>`;
  }).join('');

  const thead = [
    t('commission.settle.col.sales'), t('commission.settle.col.margin'), t('commission.settle.col.tndn'),
    t('commission.settle.col.com_deductions'), t('commission.settle.col.net'), t('commission.settle.col.sales_pct'),
    t('commission.settle.col.sales_share'), t('commission.settle.col.lbs_share'), t('commission.settle.col.advances'),
    t('commission.settle.col.net_payable'), t('commission.settle.col.status'), '',
  ];
  table.innerHTML = `
    <table class="w-full text-left border-collapse">
      <thead class="bg-slate-50">
        <tr>${thead
          .map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>${rowHtml || `<tr><td colspan="12" class="p-4 text-slate-400 text-center text-xs">${t('commission.settle.no_data')}</td></tr>`}</tbody>
    </table>`;

  const hasUnsettled = rows.some((r) => !isSettled(r.salesId, key));
  root.querySelector('#btn-settle').disabled = !hasUnsettled;

  // Print slip buttons
  root.querySelectorAll('.btn-print-slip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const salesId = btn.dataset.sales;
      const payout  = _payouts.find((p) => p.sales_rep === salesId && p.period === currentPeriodKey());
      if (!payout) return;
      const slip = document.createElement('vdg-commission-slip');
      slip.data  = payout;
      document.body.appendChild(slip);
    });
  });

  return rows;
}

// AC-06: bounded like every other master load (F-20-01) — a stalled Drive read on an
// auth-expired session must settle to an error/retry state within the ceiling, never hang.
// Returns true on success (module globals updated), false on timeout/failure (globals untouched).
async function loadData() {
  const repo = getRepo();
  if (!repo) return true;
  _loadInFlight = true;
  const res = await safeMasterLoad(async () => {
    const [shipments, pnlLines, payouts] = await Promise.all([
      repo.list(KIND_SHIPMENT, null),
      repo.list(KIND_PNL_LINE, null),
      repo.list(PAYOUT_KIND, null),
    ]);
    const composed = await composeRules(repo);
    let prefs = {};
    try {
      const prefList = await repo.list('meta-pref', null);
      prefs = prefList?.find((p) => p.id === PREFS_META_KEY) || {};
    } catch { /* meta-pref absent on a fresh workspace — defaults to {} */ }
    return { shipments, pnlLines, payouts, rules: composed.rules, prefs };
  }, 'commissions:load');
  _loadInFlight = false;
  if (!res.ok) return false;
  ({ shipments: _shipments, pnlLines: _pnlLines, payouts: _payouts, rules: _rules, prefs: _prefs } = res.value);
  return true;
}

export async function render(root) {
  if (!hasRole(ROLE_MANAGER)) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);

  // Pre-select period from URL param
  const urlPeriod = new URLSearchParams(location.search).get('period');
  if (urlPeriod) {
    if (urlPeriod.includes('Q')) _periodMode = 'quarter';
    else _periodMode = 'month';
  }

  const loaded = await loadData();
  if (!loaded) {
    root.innerHTML = `
      <div class="p-6 max-w-[1400px] mx-auto">
        <div class="text-xs text-red-500 mb-2">${t('masters.load_error')}</div>
        <button id="commission-retry" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">${t('retry')}</button>
      </div>`;
    root.querySelector('#commission-retry')?.addEventListener('click', () => render(root));
    return;
  }

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div id="commission-suggest-banner"></div>
      <div class="flex items-center gap-4 flex-wrap">
        <label class="text-xs font-medium text-slate-600">${t('commission.settle.period_label')}</label>
        <select id="period-select" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="month" ${_periodMode === 'month' ? 'selected' : ''}>${t('commission.settle.period.month')}</option>
          <option value="quarter" ${_periodMode === 'quarter' ? 'selected' : ''}>${t('commission.settle.period.quarter')}</option>
        </select>
        <span id="period-label" class="text-xs text-slate-500">${currentPeriodKey()}</span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div class="text-sm font-semibold text-slate-900">${t('commission.settle.preview')}</div>
          <button id="btn-settle"
            class="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
            disabled>${t('commission.settle.action')}</button>
        </div>
        <div id="commission-table" class="overflow-x-auto"></div>
      </div>
    </div>`;

  await renderSuggestionsBanner(root.querySelector('#commission-suggest-banner'), getRepo());

  let currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
  renderTable(root, currentRows);

  root.querySelector('#period-select').addEventListener('change', (e) => {
    _periodMode = e.target.value;
    root.querySelector('#period-label').textContent = currentPeriodKey();
    currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderTable(root, currentRows);
  });

  root.querySelector('#btn-settle').addEventListener('click', async () => {
    const key         = currentPeriodKey();
    const unsettled   = currentRows.filter((r) => !isSettled(r.salesId, key));
    if (!unsettled.length) return;
    const ok = await showConfirm({
      title: t('commission.settle.confirm.title', { key }),
      body:  t('commission.settle.confirm.body', { n: unsettled.length }),
      confirmLabel: t('commission.settle.confirm.ok'),
      cancelLabel:  t('common.action.cancel'),
      destructive:  true,
    });
    if (!ok) return;

    const repo    = getRepo();
    const now     = new Date().toISOString();
    const manager = currentUser();
    const entities = unsettled.map((r) => ({
      id:          `CP-${r.salesId}-${key}`,
      kind:        PAYOUT_KIND,
      sales_rep:   r.salesId,
      period:      key,
      margin:      r.margin,
      tndn:        r.tndn,
      com_deductions: r.comDeductions,
      net_after_deductions: r.netAfterDeductions,
      sales_share_pct: r.salesSharePct,
      commission:  r.commission,
      lbs_share:   r.lbsShare,
      advances:    r.advances,
      net_payable: r.netPayable,
      settled_at:  now,
      settled_by:  manager,
    }));

    if (repo) {
      await bulkPut(repo, PAYOUT_KIND, entities);
      // Lock period in preferences
      const lockedPeriods = [...(_prefs[PREF_LOCKED_PERIODS_KEY] || []),
        { period_key: key, locked_at: now, locked_by: manager }];
      await repo.put('meta-pref', PREFS_META_KEY, { ..._prefs, [PREF_LOCKED_PERIODS_KEY]: lockedPeriods });
      _prefs = { ..._prefs, [PREF_LOCKED_PERIODS_KEY]: lockedPeriods };
      _payouts = await repo.list(PAYOUT_KIND, null);
    }

    window.dispatchEvent(new CustomEvent('vdg:toast', {
      detail: { type: 'success', message: t('commission.settle.toast_success', { key, n: entities.length }), duration: TOAST_AUTODISMISS_MS },
    }));
    renderTable(root, currentRows);
  });

  _onEntity = async (e) => {
    // View navigated away → drop the leaked window listener instead of touching a stale root.
    if (!root.isConnected) { window.removeEventListener('vdg:entity-changed', _onEntity); return; }
    if (_loadInFlight) return; // AC-06: a bounded load is already running — a delta tick can't re-enter
    const kind = e.detail?.kind;
    if (kind !== KIND_SHIPMENT && kind !== PAYOUT_KIND && kind !== KIND_COMMISSION_RULES) return;
    const ok = await loadData();
    if (!ok) return; // stalled Drive read — keep showing the last-known-good rows
    currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderTable(root, currentRows);
  };
  window.addEventListener('vdg:entity-changed', _onEntity);
}
