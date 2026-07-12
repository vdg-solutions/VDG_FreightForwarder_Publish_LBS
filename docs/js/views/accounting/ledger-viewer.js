// Accountant Ledger Viewer — F-23-04
// Browse chart of accounts -> per-account legs, filter, running balance, CSV export.

import { t, currentLocale }  from '../../i18n/index.js';
import {
  groupChartByType, filterLegs, computeRunningBalances, buildLedgerCSV,
} from '../../operators/manager/ledger-composer.js';
import { runAndRecord } from '../../operators/manager/ledger-reconciler.js';
import { jumpToUnbalancedEntry } from './ledger-unbalanced-modal.js';

const TYPE_LABEL_KEYS = {
  Asset: 'ledger.type.asset', Liability: 'ledger.type.liability',
  Revenue: 'ledger.type.revenue', Expense: 'ledger.type.expense',
};

function getLedgerRepo() { return window.__vdg_ledger_repo; }

function defaultFilter() {
  const year = new Date().getFullYear();
  return {
    dateFrom: `${year}-01-01`,
    dateTo:   new Date().toISOString().slice(0, 10),
    minAmount: '', maxAmount: '', search: '',
  };
}

let _accounts        = [];
let _selectedAccount = null;
let _rawLegs          = [];
let _filter           = defaultFilter();
let _lastReconciliation = null; // F-23-06: latest reconciliation-log.jsonl record, or null

function accountName(account) {
  return currentLocale() === 'vi' ? account.name_vi : account.name_en;
}

function fmtAmount(n) { return n ? Number(n).toLocaleString('vi-VN') : '—'; }

function displayedRows() {
  if (!_selectedAccount) return [];
  const filtered = filterLegs(_rawLegs, _filter);
  return computeRunningBalances(filtered, _selectedAccount.balance_side).slice().reverse();
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

      <div id="closing-balance-banner" class="text-xs text-slate-500 mb-3"></div>

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

  if (!rows.length) {
    panel.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">${t('ledger.empty_legs')}</div>`;
    return;
  }

  const trs = rows.map((r) => `
    <tr class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${r.date}</td>
      <td class="px-3 py-1.5 font-mono">${r.entry_id}</td>
      <td class="px-3 py-1.5">${r.desc ?? ''}</td>
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
          <th class="px-3 py-1.5 text-left">Date</th>
          <th class="px-3 py-1.5 text-left">Entry</th>
          <th class="px-3 py-1.5 text-left">Desc</th>
          <th class="px-3 py-1.5 text-right">Debit</th>
          <th class="px-3 py-1.5 text-right">Credit</th>
          <th class="px-3 py-1.5 text-left">Party</th>
          <th class="px-3 py-1.5 text-left">Source</th>
          <th class="px-3 py-1.5 text-right">${t('ledger.column.balance')}</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;

  panel.querySelectorAll('[data-source-id]').forEach((btn) => {
    if (!btn.dataset.sourceId) return;
    btn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('vdg:open-detail', {
        detail: { kind: btn.dataset.sourceType, id: btn.dataset.sourceId },
      }));
    });
  });
}

async function refreshBalanceBanner(repo, account) {
  const banner = document.getElementById('closing-balance-banner');
  if (!banner) return;
  if (!repo) { banner.textContent = ''; return; }
  const { balance } = await repo.getBalance(account.code, _filter.dateTo);
  banner.textContent = `${t('ledger.closing_balance')}: ${fmtAmount(balance)}`;
}

async function selectAccount(root, account) {
  _selectedAccount = account;
  renderChartTree(root);
  const repo = getLedgerRepo();
  const year = Number(_filter.dateFrom.slice(0, 4));
  _rawLegs = repo ? await repo.listLegs(year, account.code, _filter.dateFrom, _filter.dateTo) : [];
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

// F-23-06: reconciliation status line + unbalanced-entry list, driven by `_lastReconciliation`.
function fmtRunDate(runAt) { return runAt ? new Date(runAt).toLocaleDateString('vi-VN') : ''; }

function renderReconcileStatus(root) {
  const status = root.querySelector('#reconcile-status');
  if (!status) return;
  const rec = _lastReconciliation;
  if (!rec) { status.textContent = t('ledger.reconcile.never_run'); return; }
  status.textContent = rec.balanced
    ? t('ledger.reconcile.status_ok').replace('{date}', fmtRunDate(rec.run_at))
    : t('ledger.reconcile.status_bad')
        .replace('{date}', fmtRunDate(rec.run_at))
        .replace('{n}', String(rec.unbalanced_ids?.length ?? 0));
}

async function renderUnbalancedList(root) {
  const list = root.querySelector('#reconcile-unbalanced-list');
  if (!list) return;
  const ids = _lastReconciliation?.unbalanced_ids ?? [];
  if (!ids.length) { list.innerHTML = ''; return; }

  const repo = getLedgerRepo();
  const entryDetails = [];
  if (repo) {
    for (const entryId of ids) {
      const legs = await repo.listAllLegsInEntry(entryId);
      const desc = legs.find(l => l.desc)?.desc || '';
      entryDetails.push({ entryId, desc, legs });
    }
  } else {
    ids.forEach(entryId => entryDetails.push({ entryId, desc: '', legs: [] }));
  }

  list.innerHTML = `
    <div class="border border-amber-200 bg-amber-50 rounded-lg p-2 flex flex-col gap-1">
      ${entryDetails.map(({ entryId, desc }) => `
        <button data-unbalanced-entry="${entryId}"
          class="w-full text-left px-3 py-2 text-xs font-mono text-amber-900 bg-amber-100 hover:bg-amber-200 rounded flex justify-between items-center group transition-colors">
          <div class="flex flex-col gap-0.5">
            <span class="font-bold">${entryId}</span>
            ${desc ? `<span class="font-sans text-amber-700/80">${desc}</span>` : ''}
          </div>
          <svg class="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>`).join('')}
    </div>`;

  list.querySelectorAll('[data-unbalanced-entry]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const detail = entryDetails.find(d => d.entryId === btn.dataset.unbalancedEntry);
      if (detail) jumpToUnbalancedEntry(detail.entryId, detail.legs);
    });
  });
}

// AC-07: manual trigger — disables the button while running, surfaces errors instead of a
// stale/false "balanced" status (AC-09).
async function runReconciliationNow(root) {
  const repo = getLedgerRepo();
  if (!repo) return;
  const btn    = root.querySelector('#btn-reconcile-now');
  const status = root.querySelector('#reconcile-status');
  btn.disabled = true;
  if (status) status.textContent = t('ledger.reconcile.running');

  try {
    _lastReconciliation = await runAndRecord(repo);
    renderReconcileStatus(root);
    renderUnbalancedList(root);
  } catch (err) {
    if (status) status.textContent = t('ledger.reconcile.error');
    console.error('[ledger-viewer] reconcile failed:', err); // DEV
  } finally {
    btn.disabled = false;
  }
}

function exportCsv() {
  if (!_selectedAccount) return;
  const csv  = buildLedgerCSV(displayedRows());
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vdg-ledger-${_selectedAccount.code}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export async function render(root) {
  // F-24-09: route-guard (F-24-05) is the authoritative gate for /accounting/*, not this view.
  const repo = getLedgerRepo();
  _accounts            = repo ? await repo.chartOfAccounts() : [];
  _selectedAccount     = null;
  _rawLegs             = [];
  _filter              = defaultFilter();
  _lastReconciliation  = repo ? await repo.getLastReconciliation() : null;

  root.innerHTML = shellHtml();
  renderChartTree(root);
  bindFilterInputs(root);
  renderReconcileStatus(root);
  renderUnbalancedList(root);
  root.querySelector('#btn-export-csv').addEventListener('click', exportCsv);
  root.querySelector('#btn-reconcile-now').addEventListener('click', () => runReconciliationNow(root));
}
