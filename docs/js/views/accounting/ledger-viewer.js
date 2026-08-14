// Accountant Ledger Viewer — F-23-04
// Browse chart of accounts -> per-account legs, filter, running balance, CSV export.

import { t, currentLocale }  from '../../i18n/index.js';
import { todayLocal } from '../../util/today-local.js';
import {
  groupChartByType, filterLegs, computeRunningBalances, buildLedgerCSV,
} from '../../operators/manager/ledger-composer.js';
import { renderReconcileStatus, runReconciliationNow } from './ledger-reconcile-control.js';
import { loadOpeningBalance, openingRowHtml } from './ledger-opening-balance.js';
import { currentUserRole, ROLE_MANAGER } from '../../operators/manager/route-guard.js';
import { mountRepostPanelIfReady } from './ledger-repost-panel.js';
import { refreshReverseControl, renderReversalBadge, bindLegRowInteractions } from './ledger-reverse-control.js';
import { renderUnbalancedList } from './ledger-viewer-unbalanced.js';
import { safeMasterLoad, renderMasterLoadRetryStatus } from '../../util/master-load.js';
import { isViewSuperseded } from '../../util/view-root.js';

const TYPE_LABEL_KEYS = {
  Asset: 'ledger.type.asset', Liability: 'ledger.type.liability',
  Revenue: 'ledger.type.revenue', Expense: 'ledger.type.expense',
};

const CHART_TAG      = 'ledger:chart';
const RECON_TAG      = 'ledger:recon';
const LEGS_TAG       = 'ledger:legs';
const BALANCE_TAG    = 'ledger:balance';
const REPOST_TAG     = 'ledger:repost-panel';
const OPENING_TAG    = 'ledger:opening-balance';
// F-19-75: below RENDER_MOUNT_TIMEOUT_MS (8000ms) so a stalled initial load's inline retry
// paints before mount-view.js's outer mount-timeout fallback can fire.
const VIEW_DATA_LOAD_BUDGET_MS = 6_000;

function getLedgerRepo() { return window.__vdg_ledger_repo; }

function defaultFilter() {
  const year = new Date().getFullYear();
  return {
    dateFrom: `${year}-01-01`,
    dateTo:   todayLocal(),
    minAmount: '', maxAmount: '', search: '',
  };
}

let _accounts        = [];
let _selectedAccount = null;
let _rawLegs          = [];
let _filter           = defaultFilter();
let _lastReconciliation = null; // F-23-06: latest reconciliation-log.jsonl record, or null
let _selectedEntryId = null, _selectedLeg = null; // F-19-78: selected posted entry_id + its leg
let _opening = null; // F-42-02: số dư đầu kỳ of the filter window, for the selected account

function accountName(account) {
  return currentLocale() === 'vi' ? account.name_vi : account.name_en;
}

function fmtAmount(n) { return n ? Number(n).toLocaleString('vi-VN') : '—'; }

function displayedRows() {
  if (!_selectedAccount) return [];
  const filtered = filterLegs(_rawLegs, _filter);
  return computeRunningBalances(filtered, _selectedAccount.balance_side, _opening?.live ?? 0)
    .slice().reverse();
}

function shellHtml() {
  return `
    <div class="p-6 max-w-[1600px] mx-auto print-root" data-report-title="Ledger">
      <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div class="text-sm font-semibold text-slate-900">${t('ledger.title')}</div>
        <button id="btn-export-csv"
          class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          aria-label="${t('ledger.export_csv')}">${t('ledger.export_csv')}</button>
      </div>

      <div class="flex flex-wrap gap-2 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 mb-4">
        <label class="text-xs text-slate-500 flex items-center gap-1">${t('ledger.filter.date_from')}
          <input id="f-date-from" type="date" value="${_filter.dateFrom}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
        <label class="text-xs text-slate-500 flex items-center gap-1">${t('ledger.filter.date_to')}
          <input id="f-date-to" type="date" value="${_filter.dateTo}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
        <input id="f-min-amount" type="number" placeholder="${t('ledger.filter.min_amount')}"
          class="border border-slate-300 rounded px-2 py-1 text-xs w-32">
        <input id="f-max-amount" type="number" placeholder="${t('ledger.filter.max_amount')}"
          class="border border-slate-300 rounded px-2 py-1 text-xs w-32">
        <input id="f-search" type="text" placeholder="${t('ledger.filter.search')}"
          class="border border-slate-300 rounded px-2 py-1 text-xs flex-1 min-w-[160px]">
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200 mb-2">
        <div id="reconcile-status" class="text-xs text-slate-600"></div>
        <button id="btn-reconcile-now"
          class="px-3 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
          aria-label="${t('ledger.reconcile.button')}">${t('ledger.reconcile.button')}</button>
      </div>
      <div id="reconcile-unbalanced-list" class="mb-4"></div>

      ${currentUserRole() === ROLE_MANAGER ? '<div id="repost-panel-root" class="mb-4"></div>' : ''}

      <div class="flex items-center justify-between flex-wrap gap-3 mb-2">
        <div id="closing-balance-banner" class="text-xs text-slate-500"></div>
        ${currentUserRole() === ROLE_MANAGER ? '<div id="reverse-control-root"></div>' : ''}</div>

      <div class="flex gap-4">
        <div id="chart-tree" class="w-64 shrink-0 border border-slate-200 rounded-lg p-2 h-[560px] overflow-y-auto"></div>
        <div id="legs-panel" class="flex-1 border border-slate-200 rounded-lg overflow-auto h-[560px]">
          <div class="p-8 text-center text-xs text-slate-400">${t('ledger.empty_account')}</div>
        </div>
      </div>
    </div>`;
}

function renderChartTree(root) {
  const tree = root.querySelector('#chart-tree');
  const groups = groupChartByType(_accounts);
  tree.innerHTML = groups.map((g) => `
    <div class="mb-3" data-acct-group="${g.type}">
      <div class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 pb-1">
        ${t(TYPE_LABEL_KEYS[g.type])}
      </div>
      ${g.accounts.map((a) => `
        <button data-acct-code="${a.code}"
          class="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 ${_selectedAccount?.code === a.code ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}">
          ${a.code} — ${accountName(a)}
        </button>`).join('')}
    </div>`).join('');

  tree.querySelectorAll('[data-acct-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const account = _accounts.find((a) => a.code === btn.dataset.acctCode);
      if (account) selectAccount(root, account);
    });
  });
}

function renderLegsTable(root) {
  const panel = root.querySelector('#legs-panel');
  const rows  = displayedRows();

  // F-42-02: a window with no movement still has an opening balance, and "no legs" must not
  // read as "nothing here" when the account carries a balance into the period.
  if (!rows.length && !_opening?.live) {
    panel.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">${t('ledger.empty_legs')}</div>`;
    updateReverseControl(root);
    return;
  }

  const trs = rows.map((r) => `
    <tr data-entry-id="${r.entry_id}" class="border-t border-slate-100 text-xs cursor-pointer ${r.entry_id === _selectedEntryId ? 'bg-blue-50' : 'hover:bg-slate-50'}">
      <td class="px-3 py-1.5">${r.date}</td>
      <td class="px-3 py-1.5 font-mono">${r.entry_id}</td>
      <td class="px-3 py-1.5">${r.desc ?? ''}${renderReversalBadge(r)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount(r.debit)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount(r.credit)}</td>
      <td class="px-3 py-1.5">${r.party ?? '—'}</td>
      <td class="px-3 py-1.5">
        <button data-source-type="${r.source?.type ?? ''}" data-source-id="${r.source?.id ?? ''}"
          class="text-blue-600 hover:underline">${r.source ? `${r.source.type}:${r.source.id}` : '—'}</button>
      </td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount(r.running_balance)}</td>
    </tr>`).join('');

  panel.innerHTML = `
    <table class="w-full">
      <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase sticky top-0">
        <tr>
          <th class="px-3 py-1.5 text-left">${t('ledger.column.date')}</th>
          <th class="px-3 py-1.5 text-left">${t('ledger.column.entry')}</th>
          <th class="px-3 py-1.5 text-left">${t('ledger.column.desc')}</th>
          <th class="px-3 py-1.5 text-right">${t('ledger.column.debit')}</th>
          <th class="px-3 py-1.5 text-right">${t('ledger.column.credit')}</th>
          <th class="px-3 py-1.5 text-left">${t('ledger.column.party')}</th>
          <th class="px-3 py-1.5 text-left">${t('ledger.column.source')}</th>
          <th class="px-3 py-1.5 text-right">${t('ledger.column.balance')}</th>
        </tr>
      </thead>
      <tbody>${openingRowHtml(_opening, fmtAmount)}${trs}</tbody>
    </table>`;

  panel.querySelectorAll('[data-source-id]').forEach((btn) => {
    if (!btn.dataset.sourceId) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('vdg:open-detail', {
        detail: { kind: btn.dataset.sourceType, id: btn.dataset.sourceId },
      }));
    });
  });

  // AC-07: row click selects the posted entry the Reverse control targets.
  bindLegRowInteractions(panel, rows, {
    onSelectRow: (entryId, leg) => { _selectedEntryId = entryId; _selectedLeg = leg; renderLegsTable(root); },
  });

  updateReverseControl(root);
}

function updateReverseControl(root) {
  refreshReverseControl(root, {
    selectedEntryId: _selectedEntryId, selectedLeg: _selectedLeg,
    actorId:         window.__vdg_current_user?.email, ledgerRepo: getLedgerRepo(),
    onDone: () => {
      _selectedEntryId = null; _selectedLeg = null;
      if (_selectedAccount) selectAccount(root, _selectedAccount);
    },
  });
}

async function refreshBalanceBanner(repo, account) {
  const banner = document.getElementById('closing-balance-banner');
  if (!banner) return;
  if (!repo) { banner.textContent = ''; return; }
  const balRes = await safeMasterLoad(() => repo.getBalance(account.code, _filter.dateTo), BALANCE_TAG);
  banner.textContent = balRes.ok ? `${t('ledger.closing_balance')}: ${fmtAmount(balRes.value.balance)}` : '';
}

// F-19-75 AC-06: single account-year file is one bounded Drive read; a stall paints an
// inline retry in #legs-panel that re-runs this same call, instead of hanging the render.
async function selectAccount(root, account) {
  _selectedAccount = account;
  _selectedEntryId = null; _selectedLeg = null; // F-19-78: prior selection belonged to the previous account
  renderChartTree(root);
  const repo  = getLedgerRepo();
  const panel = root.querySelector('#legs-panel');
  if (!repo) { _rawLegs = []; renderLegsTable(root); return; }

  const year = Number(_filter.dateFrom.slice(0, 4));
  const legsRes = await safeMasterLoad(
    () => repo.listLegs(year, account.code, _filter.dateFrom, _filter.dateTo), LEGS_TAG,
  );
  if (!legsRes.ok) {
    renderMasterLoadRetryStatus(panel, t('masters.load_error'), t('retry'), () => selectAccount(root, account));
    return;
  }
  _rawLegs = legsRes.value;
  // F-42-02: the window's opening balance — seeds the running column and heads the table.
  const openRes = await safeMasterLoad(
    () => loadOpeningBalance(repo, window.__vdg_repo, account.code, _filter.dateFrom), OPENING_TAG,
  );
  _opening = openRes.ok ? openRes.value : null;
  await refreshBalanceBanner(repo, account);
  renderLegsTable(root);
}

function bindFilterInputs(root) {
  const bind = (id, key, onDateChange) => {
    root.querySelector(`#${id}`)?.addEventListener('input', async (e) => {
      _filter[key] = e.target.value;
      if (onDateChange && _selectedAccount) await selectAccount(root, _selectedAccount);
      else renderLegsTable(root);
    });
  };
  bind('f-date-from',  'dateFrom',  true);
  bind('f-date-to',    'dateTo',    true);
  bind('f-min-amount', 'minAmount', false);
  bind('f-max-amount', 'maxAmount', false);
  bind('f-search',     'search',    false);
}

function exportCsv() {
  if (!_selectedAccount) return;
  const csv  = buildLedgerCSV(displayedRows());
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vdg-ledger-${_selectedAccount.code}-${todayLocal()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// F-19-75: paint-shell-first + bounded initial load, mirrors masters-customers.js/air-rates.js.
async function loadInitial(root, repo) {
  if (!repo) { _accounts = []; _lastReconciliation = null; renderChartTree(root); return; }
  if (isViewSuperseded(root)) return;

  const [chartRes, reconRes] = await Promise.all([
    safeMasterLoad(() => repo.chartOfAccounts(), CHART_TAG, VIEW_DATA_LOAD_BUDGET_MS),
    safeMasterLoad(() => repo.getLastReconciliation(), RECON_TAG, VIEW_DATA_LOAD_BUDGET_MS),
  ]);
  if (isViewSuperseded(root)) return;

  if (!chartRes.ok) { // chart is essential — no account tree without it
    const tree = root.querySelector('#chart-tree');
    renderMasterLoadRetryStatus(tree, t('masters.load_error'), t('retry'), () => loadInitial(root, repo));
    return;
  }
  _accounts           = chartRes.value;
  _lastReconciliation = reconRes.ok ? reconRes.value : null; // reconciliation optional
  renderChartTree(root);
  renderReconcileStatus(root, _lastReconciliation);
  renderUnbalancedList(root, repo, _lastReconciliation?.unbalanced_ids ?? []);
}

export async function render(root) {
  // F-24-09: route-guard (F-24-05) is the authoritative gate for /accounting/*, not this view.
  const repo = getLedgerRepo();

  _selectedAccount    = null;
  _rawLegs            = [];
  _filter             = defaultFilter();
  _lastReconciliation = null;
  _selectedEntryId    = null; _selectedLeg = null;
  _opening            = null;

  // Paint shell first — before any Drive await — so a stalled load degrades to an inline
  // retry inside the painted shell instead of a pre-paint blank (AC-08).
  root.innerHTML = shellHtml();
  bindFilterInputs(root);
  root.querySelector('#btn-export-csv').addEventListener('click', exportCsv);
  root.querySelector('#btn-reconcile-now').addEventListener('click', async () => {
    _lastReconciliation = await runReconciliationNow(root, getLedgerRepo()) ?? _lastReconciliation;
  });

  await loadInitial(root, repo);

  // F-29-24: manager-only repost trigger — never boot-wired, only mounted here on demand.
  // route-guard.js's role check, not auth-gate.js's legacy inline gate (F-24-09 AC-01: this
  // view must not reintroduce the check route-guard.js already superseded).
  if (currentUserRole() === ROLE_MANAGER) {
    const panelRoot = root.querySelector('#repost-panel-root');
    await safeMasterLoad(() => mountRepostPanelIfReady(panelRoot), REPOST_TAG);
  }
}
