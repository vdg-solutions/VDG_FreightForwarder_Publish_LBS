// Manager Commission Settlement — F-14-08

import '../../components/commission-slip.js';
import { isManager }          from '../../auth/auth-gate.js';
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
           data-sales="${r.salesId}" title="Print slip">Print slip</button>` : '';
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

  table.innerHTML = `
    <table class="w-full text-left border-collapse">
      <thead class="bg-slate-50">
        <tr>${['Sales','Margin (VND)','TNDN 20%','Com KH/Line','Net (VND)','Sales %','Sales Share','LBS Share','Advances','Net Payable','Status','']
          .map((h) => `<th class="py-2 px-3 text-xs font-medium text-slate-600 whitespace-nowrap">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>${rowHtml || '<tr><td colspan="12" class="p-4 text-slate-400 text-center text-xs">No data for period.</td></tr>'}</tbody>
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

async function loadData() {
  const repo = getRepo();
  if (!repo) return;
  [_shipments, _pnlLines, _payouts] = await Promise.all([
    repo.list(KIND_SHIPMENT, null),
    repo.list(KIND_PNL_LINE, null),
    repo.list(PAYOUT_KIND, null),
  ]);
  const composed = await composeRules(repo);
  _rules = composed.rules;
  try {
    const prefList = await repo.list('meta-pref', null);
    _prefs = prefList?.find((p) => p.id === PREFS_META_KEY) || {};
  } catch { _prefs = {}; }
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }
  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);

  // Pre-select period from URL param
  const urlPeriod = new URLSearchParams(location.search).get('period');
  if (urlPeriod) {
    if (urlPeriod.includes('Q')) _periodMode = 'quarter';
    else _periodMode = 'month';
  }

  await loadData();

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div id="commission-suggest-banner"></div>
      <div class="flex items-center gap-4 flex-wrap">
        <label class="text-xs font-medium text-slate-600">Period:</label>
        <select id="period-select" class="border rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="month" ${_periodMode === 'month' ? 'selected' : ''}>Month</option>
          <option value="quarter" ${_periodMode === 'quarter' ? 'selected' : ''}>Quarter</option>
        </select>
        <span id="period-label" class="text-xs text-slate-500">${currentPeriodKey()}</span>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div class="text-sm font-semibold text-slate-900">Commission Preview</div>
          <button id="btn-settle"
            class="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40"
            disabled>Settle period</button>
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
      title: `Settle commissions for ${key}?`,
      body:  `Settle commissions for ${unsettled.length} sales rep(s). This locks the period for sales edits.`,
      confirmLabel: 'Settle',
      cancelLabel:  'Cancel',
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
      detail: { type: 'success', message: `Period ${key} settled for ${entities.length} rep(s).`, duration: TOAST_AUTODISMISS_MS },
    }));
    renderTable(root, currentRows);
  });

  _onEntity = async (e) => {
    // View navigated away → drop the leaked window listener instead of touching a stale root.
    if (!root.isConnected) { window.removeEventListener('vdg:entity-changed', _onEntity); return; }
    const kind = e.detail?.kind;
    if (kind !== KIND_SHIPMENT && kind !== PAYOUT_KIND && kind !== KIND_COMMISSION_RULES) return;
    await loadData();
    currentRows = computeCommissions(_shipments, _pnlLines, _rules, [], currentPeriodKey());
    renderTable(root, currentRows);
  };
  window.addEventListener('vdg:entity-changed', _onEntity);
}
