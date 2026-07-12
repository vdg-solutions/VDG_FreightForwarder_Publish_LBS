// Manager Period Close — F-14-11

import {
  getCurrentPeriodLock, runPreCloseChecks, closePeriod, reopenPeriod, loadClosedPeriods,
  PERIOD_CLOSE_KIND, REASON_MAX_CHARS,
} from '../../operators/manager/period-close-orchestrator.js';
import { isManager }  from '../../auth/auth-gate.js';
import { navigate }   from '../../router.js';
import { showConfirm } from '../../helpers/show-confirm.js';

const SHEETJS_CDN      = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
const MONTH_COUNT_BACK = 12;

let _selectedPeriod  = null;
let _checkResults    = [];
let _closedPeriods   = new Set();
let _sheetJsLoaded   = false;

function getRepo() { return window.__vdg_repo; }
function getDb()   { return window.__vdg_db || null; }
function currentUser() { return window.__vdg_auth?.getCurrentUser?.()?.email || 'manager'; }

function _monthOptions() {
  const now  = new Date();
  const opts = [];
  for (let i = 0; i < MONTH_COUNT_BACK; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ key, label: d.toLocaleString('default', { year: 'numeric', month: 'long' }) });
  }
  return opts;
}

function _checkIcon(severity, failCount) {
  if (failCount === 0) return '✅';
  return severity === 'warn' ? '⚠️' : 'ℹ️';
}

function _checkClass(severity, failCount) {
  if (failCount === 0) return 'text-emerald-700';
  return severity === 'warn' ? 'text-amber-600' : 'text-blue-600';
}

function _canProceed(results) {
  return results.every((r) => !(r.severity === 'warn' && r.failCount > 0));
}

function renderChecklist(root, results) {
  const tbody = root.querySelector('#check-tbody');
  if (!tbody) return;
  tbody.innerHTML = results.map((r) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-2 text-base">${_checkIcon(r.severity, r.failCount)}</td>
      <td class="px-4 py-2 text-sm text-slate-700">${r.label}</td>
      <td class="px-4 py-2 text-sm font-mono ${_checkClass(r.severity, r.failCount)}">${r.failCount}</td>
      <td class="px-4 py-2">
        ${r.failCount > 0 ? `<button data-view-check="${r.id}"
          class="text-xs text-blue-600 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500">View</button>` : ''}
      </td>
    </tr>`).join('');

  const proceedBtn = root.querySelector('#btn-proceed');
  if (proceedBtn) {
    proceedBtn.disabled = !_canProceed(results);
    proceedBtn.className = proceedBtn.disabled
      ? 'px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500';
  }
}

function renderPeriodSelect(root, periods, closed) {
  const sel = root.querySelector('#period-select');
  if (!sel) return;
  sel.innerHTML = periods.map(({ key, label }) => {
    const isLocked = closed.has(key);
    const isNow    = new Date().toISOString().slice(0, 7) === key;
    const disabled = isNow ? 'disabled' : '';
    return `<option value="${key}" ${disabled}>${isLocked ? '🔒 ' : ''}${label}</option>`;
  }).join('');
  if (periods.length) _selectedPeriod = periods[0].key;
}

function renderLockBanner(root, period) {
  const banner = root.querySelector('#lock-banner');
  if (!banner) return;
  const lock = getCurrentPeriodLock(period);
  if (lock.locked) {
    banner.className = 'mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between';
    banner.innerHTML = `
      <span>🔒 Period <strong>${period}</strong> is locked — closed by ${lock.record.closed_by}</span>
      <button id="btn-reopen" class="ml-4 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Reopen period">Reopen</button>`;
  } else {
    banner.className = 'hidden';
    banner.innerHTML = '';
  }
}

async function loadSheetJs() {
  if (_sheetJsLoaded || window.XLSX) { _sheetJsLoaded = true; return; }
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src   = SHEETJS_CDN;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  _sheetJsLoaded = true;
}

async function handleExport(period) {
  const repo = getRepo();
  if (!repo || !period) return;
  const records = await repo.list(PERIOD_CLOSE_KIND, null).catch(() => []);
  const rec     = records.find((r) => r.period === period);

  await loadSheetJs();
  if (!window.XLSX) { window.print(); return; }

  const XLSX    = window.XLSX;
  const date    = new Date().toISOString().slice(0, 10);
  const snapshot = rec?.checklist_snapshot || [];

  const ws1Data = [
    ['Period', 'Closed At', 'Closed By'],
    [period, rec?.closed_at || '—', rec?.closed_by || '—'],
  ];
  const ws2Data = [
    ['Check', 'Severity', 'Fail Count'],
    ...snapshot.map((r) => [r.label, r.severity, r.failCount]),
  ];

  const wb  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws1Data), 'PnL Locked');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ws2Data), 'Checklist');
  XLSX.writeFile(wb, `vdg-period-close-${period}-${date}.xlsx`);
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  const repo   = getRepo();
  const months = _monthOptions();

  _closedPeriods = new Set(repo ? await loadClosedPeriods(repo) : []);
  _checkResults  = [];
  _selectedPeriod = months[0]?.key || null;

  root.innerHTML = `
    <div class="p-6 space-y-5 max-w-[860px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-base font-semibold text-slate-900">Period Close</div>
          <div class="text-xs text-slate-500">Financial lock · admin only</div>
        </div>
        <div class="flex gap-2">
          <button id="btn-export"
            class="px-3 py-1.5 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 btn-export
                   focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Export locked report">Export locked report</button>
        </div>
      </div>

      <div id="lock-banner" class="hidden"></div>

      <div class="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div class="flex items-center gap-3">
          <label class="text-sm font-medium text-slate-700" for="period-select">Period</label>
          <select id="period-select"
            class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Select period">
          </select>
          <button id="btn-run-checks"
            class="px-3 py-1.5 text-xs rounded-lg bg-slate-800 text-white hover:bg-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Run pre-close checks">Run pre-close checks</button>
        </div>

        <table class="w-full text-sm" role="grid">
          <thead class="bg-slate-50 text-[11px] text-slate-500 uppercase">
            <tr>
              <th class="px-4 py-2 text-left w-8" scope="col"></th>
              <th class="px-4 py-2 text-left" scope="col">Check</th>
              <th class="px-4 py-2 text-left w-24" scope="col">Failing</th>
              <th class="px-4 py-2 w-16" scope="col"></th>
            </tr>
          </thead>
          <tbody id="check-tbody">
            <tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 text-xs">Run checks to begin</td></tr>
          </tbody>
        </table>

        <div class="flex items-center gap-3">
          <button id="btn-proceed" disabled
            class="px-4 py-2 text-sm rounded-lg bg-slate-200 text-slate-400 cursor-not-allowed"
            aria-label="Proceed to close">Proceed to close</button>
          <span class="text-xs text-slate-400">All warn-level checks must pass</span>
        </div>
      </div>

      <!-- Reopen form (hidden) -->
      <div id="reopen-form" class="hidden bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div class="text-sm font-medium text-slate-800">Reason for reopening</div>
        <textarea id="reopen-reason" rows="3" maxlength="${REASON_MAX_CHARS}"
          placeholder="Required — describe the business reason"
          class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Reopen reason"></textarea>
        <div class="flex gap-2">
          <button id="btn-confirm-reopen"
            class="px-4 py-2 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Confirm reopen">Confirm reopen</button>
          <button id="btn-cancel-reopen"
            class="px-4 py-2 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Cancel">Cancel</button>
        </div>
      </div>
    </div>`;

  renderPeriodSelect(root, months, _closedPeriods);
  renderLockBanner(root, _selectedPeriod);

  // Period change
  root.querySelector('#period-select').addEventListener('change', (e) => {
    _selectedPeriod = e.target.value;
    _checkResults   = [];
    renderChecklist(root, []);
    renderLockBanner(root, _selectedPeriod);
    root.querySelector('#btn-proceed').disabled = true;
  });

  // Run checks
  root.querySelector('#btn-run-checks').addEventListener('click', async () => {
    if (!repo || !_selectedPeriod) return;
    const btn = root.querySelector('#btn-run-checks');
    btn.textContent = 'Running…';
    btn.disabled    = true;
    try {
      _checkResults = await runPreCloseChecks(repo, _selectedPeriod);
      renderChecklist(root, _checkResults);
    } catch (err) {
      console.error('[period-close] checks failed:', err); // DEV
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'error', message: 'Check failed: ' + err.message } }));
    } finally {
      btn.textContent = 'Run pre-close checks';
      btn.disabled    = false;
    }
  });

  // Proceed → confirm close
  root.querySelector('#btn-proceed').addEventListener('click', async () => {
    if (!_selectedPeriod || !_canProceed(_checkResults)) return;
    const ok = await showConfirm({
      title: `Close period ${_selectedPeriod}?`,
      body:  'This will lock all shipments.',
      confirmLabel: 'Close period',
      cancelLabel:  'Cancel',
      destructive:  true,
    });
    if (!ok) return;
    try {
      await closePeriod(repo, getDb(), _selectedPeriod, currentUser(), _checkResults);
      _closedPeriods.add(_selectedPeriod);
      renderPeriodSelect(root, months, _closedPeriods);
      renderLockBanner(root, _selectedPeriod);
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: `Period ${_selectedPeriod} closed` } }));
    } catch (err) {
      console.error('[period-close] close failed:', err); // DEV
      window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'error', message: err.message } }));
    }
  });

  // Export
  root.querySelector('#btn-export').addEventListener('click', () => handleExport(_selectedPeriod));

  // Delegated: reopen + view-check
  root.addEventListener('click', (e) => {
    if (e.target.id === 'btn-reopen') {
      root.querySelector('#reopen-form').classList.remove('hidden');
    }
    if (e.target.id === 'btn-cancel-reopen') {
      root.querySelector('#reopen-form').classList.add('hidden');
    }
    if (e.target.id === 'btn-confirm-reopen') {
      const reason = root.querySelector('#reopen-reason')?.value?.trim();
      if (!reason) return;
      reopenPeriod(repo, getDb(), _selectedPeriod, reason, currentUser()).then(() => {
        _closedPeriods.delete(_selectedPeriod);
        renderPeriodSelect(root, months, _closedPeriods);
        renderLockBanner(root, _selectedPeriod);
        root.querySelector('#reopen-form').classList.add('hidden');
        window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'info', message: `Period ${_selectedPeriod} reopened` } }));
      }).catch((err) => {
        console.error('[period-close] reopen failed:', err); // DEV
        window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'error', message: err.message } }));
      });
    }
    const viewBtn = e.target.closest('[data-view-check]');
    if (viewBtn) {
      const checkId = viewBtn.dataset.viewCheck;
      const result  = _checkResults.find((r) => r.id === checkId);
      if (result?.failIds?.length) {
        window.dispatchEvent(new CustomEvent('vdg:open-detail', {
          detail: { kind: 'shipment', id: result.failIds[0] },
        }));
      }
    }
  });
}
