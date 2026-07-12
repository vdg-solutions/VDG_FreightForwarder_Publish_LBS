// Financial Reports — Trial Balance + P&L + Balance Sheet (F-23-05)
// 3-tab accountant view: same data-tab pattern as manager/cash-flow.js.

import { t, fmtNumber }     from '../../i18n/index.js';
import {
  trialBalance, pnl, pnlMonthlyBreakdown, balanceSheet,
} from '../../operators/manager/ledger-aggregator.js';

const TAB_TB  = 'TB';
const TAB_PNL = 'PNL';
const TAB_BS  = 'BS';
const TABS    = [
  { key: TAB_TB,  labelKey: 'reports.tab.trial_balance' },
  { key: TAB_PNL, labelKey: 'reports.tab.pnl' },
  { key: TAB_BS,  labelKey: 'reports.tab.balance_sheet' },
];
const INTEGRITY_TOLERANCE = 0.01; // float-safe equality for dr===cr / assets===liab+equity

function today() { return new Date().toISOString().slice(0, 10); }

let _tab              = TAB_TB;
let _chart             = [];
let _legsByYear        = new Map(); // year -> { [acc_code]: Leg[] }
let _asOfDateTB        = today();
let _asOfDateBS        = today();
let _pnlYear           = new Date().getFullYear();
let _comparePrevMonth  = false;

function getLedgerRepo() { return window.__vdg_ledger_repo; }

/// Fetch every chart account's legs for `year` in one shot, cached per year.
async function loadYearLegs(year) {
  if (_legsByYear.has(year)) return _legsByYear.get(year);
  const repo = getLedgerRepo();
  if (!repo) return {};
  const entries = await Promise.all(
    _chart.map(async (a) => [a.code, await repo.listLegs(year, a.code, null, null)]),
  );
  const legsByAccount = Object.fromEntries(entries);
  _legsByYear.set(year, legsByAccount);
  return legsByAccount;
}

function fmtAmt(n) { return fmtNumber(n ?? 0); }

function tabButtons() {
  return TABS.map(({ key, labelKey }) => `
    <button data-tab="${key}"
      class="px-4 py-2 text-sm font-medium rounded-tl-lg rounded-tr-lg no-print
             ${_tab === key ? 'bg-white border border-b-0 border-slate-200 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
      ${t(labelKey)}
    </button>`).join('');
}

function shellHtml() {
  return `
    <div class="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-sm font-semibold text-slate-900">${t('reports.title')}</div>
        <button id="btn-export-pdf" class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 no-print">
          ${t('reports.export_pdf')}
        </button>
      </div>
      <div class="flex gap-1">${tabButtons()}</div>
      <div id="tab-content" class="bg-white rounded-xl border border-slate-200 p-5"></div>
    </div>`;
}

function integrityBadge(ok, okKey, mismatchKey) {
  return `<span class="text-xs font-medium ${ok ? 'text-emerald-600' : 'text-red-600'}">
    ${ok ? t(okKey) : t(mismatchKey)}
  </span>`;
}

// ── Trial Balance tab ──────────────────────────────────────────────────────────

async function renderTrialBalance(container) {
  const year = Number(_asOfDateTB.slice(0, 4));
  const legsByAccount = await loadYearLegs(year);
  const rows = trialBalance(_chart, legsByAccount, _asOfDateTB);
  const totalDr = rows.reduce((s, r) => s + r.dr, 0);
  const totalCr = rows.reduce((s, r) => s + r.cr, 0);
  const balanced = Math.abs(totalDr - totalCr) < INTEGRITY_TOLERANCE;

  const trs = rows.map((r) => {
    const account = _chart.find((a) => a.code === r.acc_code);
    return `
      <tr class="border-t border-slate-100 text-xs">
        <td class="px-3 py-1.5 font-mono">${r.acc_code}</td>
        <td class="px-3 py-1.5">${account?.name_vi ?? ''}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.opening)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.dr)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.cr)}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.closing)}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="print-doc print-root" data-report-title="${t('reports.tab.trial_balance')}" data-print-date="${today()}">
      <div class="flex items-center gap-2 mb-3 no-print">
        <label class="text-xs text-slate-500 flex items-center gap-1">${t('reports.as_of_date')}
          <input id="tb-as-of-date" type="date" value="${_asOfDateTB}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
      </div>
      <table class="w-full">
        <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-1.5 text-left">Code</th>
            <th class="px-3 py-1.5 text-left">Name</th>
            <th class="px-3 py-1.5 text-right">${t('reports.column.opening')}</th>
            <th class="px-3 py-1.5 text-right">${t('reports.column.debit')}</th>
            <th class="px-3 py-1.5 text-right">${t('reports.column.credit')}</th>
            <th class="px-3 py-1.5 text-right">${t('reports.column.closing')}</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-300 text-xs font-semibold">
            <td class="px-3 py-1.5" colspan="3">${t('reports.tb.total')}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(totalDr)}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(totalCr)}</td>
            <td class="px-3 py-1.5 text-right">${integrityBadge(balanced, 'reports.tb.integrity_ok', 'reports.tb.integrity_mismatch')}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  container.querySelector('#tb-as-of-date').addEventListener('change', async (e) => {
    _asOfDateTB = e.target.value;
    await renderTrialBalance(container);
  });
}

// ── P&L tab ────────────────────────────────────────────────────────────────────

function monthRow(m, prevM) {
  const delta = prevM ? m.netIncome - prevM.netIncome : null;
  return `
    <tr class="border-t border-slate-100 text-xs">
      <td class="px-3 py-1.5">${_pnlYear}-${m.month}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(m.revenue)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(m.expense)}</td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(m.netIncome)}</td>
      ${_comparePrevMonth ? `<td class="px-3 py-1.5 text-right font-mono ${delta != null && delta < 0 ? 'text-red-500' : 'text-emerald-600'}">${delta != null ? fmtAmt(delta) : '—'}</td>` : ''}
    </tr>`;
}

async function renderPnl(container) {
  const legsByAccount = await loadYearLegs(_pnlYear);
  const months = pnlMonthlyBreakdown(_chart, legsByAccount, _pnlYear);
  const yearTotal = pnl(_chart, legsByAccount, `${_pnlYear}-01-01`, `${_pnlYear}-12-31`);

  const trs = months.map((m, i) => monthRow(m, i > 0 ? months[i - 1] : null)).join('');

  container.innerHTML = `
    <div class="print-doc print-root" data-report-title="${t('reports.tab.pnl')}" data-print-date="${today()}">
      <div class="flex items-center gap-4 mb-3 no-print">
        <label class="text-xs text-slate-500 flex items-center gap-1">${_pnlYear}
          <input id="pnl-year" type="number" value="${_pnlYear}"
            class="border border-slate-300 rounded px-2 py-1 text-xs w-24"></label>
        <label class="text-xs text-slate-600 flex items-center gap-1.5">
          <input id="pnl-compare" type="checkbox" ${_comparePrevMonth ? 'checked' : ''}>
          ${t('reports.pnl.compare_prev_month')}
        </label>
      </div>
      <table class="w-full">
        <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
          <tr>
            <th class="px-3 py-1.5 text-left">${t('reports.pnl.month')}</th>
            <th class="px-3 py-1.5 text-right">${t('reports.pnl.revenue')}</th>
            <th class="px-3 py-1.5 text-right">${t('reports.pnl.expense')}</th>
            <th class="px-3 py-1.5 text-right">${t('reports.pnl.net_income')}</th>
            ${_comparePrevMonth ? `<th class="px-3 py-1.5 text-right uppercase">${t('reports.pnl.delta_prev_month')}</th>` : ''}
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot>
          <tr class="border-t-2 border-slate-300 text-xs font-semibold">
            <td class="px-3 py-1.5">${t('reports.pnl.total_year')}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(yearTotal.revenue.reduce((s, r) => s + r.amt, 0))}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(yearTotal.expense.reduce((s, r) => s + r.amt, 0))}</td>
            <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(yearTotal.netIncome)}</td>
            ${_comparePrevMonth ? '<td></td>' : ''}
          </tr>
        </tfoot>
      </table>
    </div>`;

  container.querySelector('#pnl-year').addEventListener('change', async (e) => {
    _pnlYear = Number(e.target.value) || new Date().getFullYear();
    await renderPnl(container);
  });
  container.querySelector('#pnl-compare').addEventListener('change', async (e) => {
    _comparePrevMonth = e.target.checked;
    await renderPnl(container);
  });
}

// ── Balance Sheet tab ──────────────────────────────────────────────────────────

async function renderBalanceSheet(container) {
  const year = Number(_asOfDateBS.slice(0, 4));
  const legsByAccount = await loadYearLegs(year);
  const { assets, liabilities, equity } = balanceSheet(_chart, legsByAccount, _asOfDateBS);
  const totalAssets = assets.reduce((s, a) => s + a.amt, 0);
  const totalLiab   = liabilities.reduce((s, l) => s + l.amt, 0);
  const totalLiabEquity = totalLiab + equity;
  const balanced = Math.abs(totalAssets - totalLiabEquity) < INTEGRITY_TOLERANCE;

  const rowsFor = (list) => list.map((r) => {
    const account = _chart.find((a) => a.code === r.acc);
    return `
      <tr class="border-t border-slate-100 text-xs">
        <td class="px-3 py-1.5 font-mono">${r.acc}</td>
        <td class="px-3 py-1.5">${account?.name_vi ?? ''}</td>
        <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(r.amt)}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="print-doc print-root" data-report-title="${t('reports.tab.balance_sheet')}" data-print-date="${today()}">
      <div class="flex items-center gap-2 mb-3 no-print">
        <label class="text-xs text-slate-500 flex items-center gap-1">${t('reports.as_of_date')}
          <input id="bs-as-of-date" type="date" value="${_asOfDateBS}"
            class="border border-slate-300 rounded px-2 py-1 text-xs"></label>
      </div>
      <div class="grid grid-cols-2 gap-6">
        <table class="w-full">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr><th class="px-3 py-1.5 text-left" colspan="2">${t('reports.bs.assets')}</th>
              <th class="px-3 py-1.5 text-right">${fmtAmt(totalAssets)}</th></tr>
          </thead>
          <tbody>${rowsFor(assets)}</tbody>
        </table>
        <table class="w-full">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr><th class="px-3 py-1.5 text-left" colspan="2">${t('reports.bs.liabilities')}</th>
              <th class="px-3 py-1.5 text-right">${fmtAmt(totalLiab)}</th></tr>
          </thead>
          <tbody>${rowsFor(liabilities)}
            <tr class="border-t border-slate-100 text-xs">
              <td class="px-3 py-1.5" colspan="2">${t('reports.bs.equity')}</td>
              <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(equity)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-slate-300 text-xs font-semibold">
              <td class="px-3 py-1.5" colspan="2">${t('reports.bs.total_liab_equity')}</td>
              <td class="px-3 py-1.5 text-right font-mono">${fmtAmt(totalLiabEquity)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="mt-3 text-right">${integrityBadge(balanced, 'reports.bs.balanced', 'reports.bs.unbalanced')}</div>
    </div>`;

  container.querySelector('#bs-as-of-date').addEventListener('change', async (e) => {
    _asOfDateBS = e.target.value;
    await renderBalanceSheet(container);
  });
}

// ── Shell / tab switching ──────────────────────────────────────────────────────

async function renderActiveTab(root) {
  const container = root.querySelector('#tab-content');
  if (_tab === TAB_TB)  return renderTrialBalance(container);
  if (_tab === TAB_PNL) return renderPnl(container);
  return renderBalanceSheet(container);
}

export async function render(root) {
  // F-24-09: route-guard (F-24-05) is the authoritative gate for /accounting/*, not this view.
  const repo = getLedgerRepo();
  _chart          = repo ? await repo.chartOfAccounts() : [];
  _legsByYear     = new Map();
  _tab            = TAB_TB;
  _asOfDateTB     = today();
  _asOfDateBS     = today();
  _pnlYear        = new Date().getFullYear();
  _comparePrevMonth = false;

  root.innerHTML = shellHtml();
  await renderActiveTab(root);

  root.querySelector('#btn-export-pdf').addEventListener('click', () => window.print());

  root.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-tab]');
    if (!tabBtn) return;
    _tab = tabBtn.dataset.tab;
    root.querySelectorAll('[data-tab]').forEach((b) => {
      const active = b.dataset.tab === _tab;
      b.className = `px-4 py-2 text-sm font-medium rounded-tl-lg rounded-tr-lg no-print ${active
        ? 'bg-white border border-b-0 border-slate-200 text-blue-700'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;
    });
    await renderActiveTab(root);
  });
}
