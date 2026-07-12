// F-12-10 — Quotation list view (all states, role-filtered)

import { currentSalesRepId, isManager } from '../auth/auth-gate.js';
import { sendToCustomer, markAccepted, checkAlreadyConverted } from '../operators/quote-orchestrator.js';
import { navigate } from '../router.js';
import { t } from '../i18n/index.js';

const STATE_COLORS = {
  Draft:    'bg-slate-100 text-slate-700',
  Sent:     'bg-blue-100 text-blue-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Expired:  'bg-amber-100 text-amber-700',
};

const KIND_QUOTATIONS = 'quotations';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('vi-VN');
}

function effectiveState(q) {
  if ((q.state === 'Draft' || q.state === 'Sent') && q.valid_until_ms < Date.now()) return 'Expired';
  return q.state;
}

function stateBadge(state) {
  const cls = STATE_COLORS[state] || 'bg-slate-100 text-slate-600';
  return `<span class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${cls}">${t('quote.status.' + state)}</span>`;
}

// ── row rendering ─────────────────────────────────────────────────────────────

function actionCell(q, displayState, isM) {
  if (displayState === 'Draft') {
    const blocked = q.pending_manager_approval && !isM;
    if (blocked) {
      return `<span class="text-xs text-slate-400" title="Pending manager approval">⏳ Pending approval</span>`;
    }
    return `<button class="btn-send text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700" data-id="${q.id}">Send to Customer</button>`;
  }
  if (displayState === 'Sent') {
    return `<button class="btn-accept text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700" data-id="${q.id}">Mark Accepted</button>`;
  }
  if (displayState === 'Accepted') {
    return `<button class="btn-convert text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700" data-id="${q.id}">Convert to Shipment</button>`;
  }
  return '—';
}

function quoteRow(q, isM) {
  const ds  = effectiveState(q);
  const pol = q.pol || '—';
  const pod = q.pod || '—';
  return `
    <tr class="border-t border-slate-100 hover:bg-slate-50 text-xs" data-qid="${q.id}">
      <td class="px-3 py-2 font-mono">${q.id}</td>
      <td class="px-3 py-2">${q.customer || '—'}</td>
      <td class="px-3 py-2 font-mono">${pol} → ${pod}</td>
      <td class="px-3 py-2">${q.container_type || '—'}</td>
      <td class="px-3 py-2">${stateBadge(ds)}</td>
      <td class="px-3 py-2">${fmtDate(q.valid_until_ms)}</td>
      <td class="px-3 py-2 converted-cell">${actionCell(q, ds, isM)}</td>
    </tr>`;
}

// ── load & render ─────────────────────────────────────────────────────────────

async function loadQuotes(repo, salesId, isM) {
  const filter = isM ? null : (q) => (q.created_by || '').toLowerCase() === salesId.toLowerCase();
  return repo.list(KIND_QUOTATIONS, filter).catch(() => []);
}

function renderTable(root, quotes, isM) {
  const tbody = root.querySelector('#qt-tbody');
  const empty = root.querySelector('#qt-empty');
  if (!tbody) return;
  if (!quotes.length) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');
  tbody.innerHTML = quotes.map((q) => quoteRow(q, isM)).join('');
}

// ── event handling ────────────────────────────────────────────────────────────

async function handleActions(e, root, repo) {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  const id = btn.dataset.id;
  const quotes = window.__qt_quotes || [];
  const quote  = quotes.find((q) => q.id === id);
  if (!quote) return;

  btn.disabled = true;

  if (btn.classList.contains('btn-send')) {
    const updated = await sendToCustomer(repo, quote);
    Object.assign(quote, updated);
    root.querySelector(`tr[data-qid="${id}"] .converted-cell`).innerHTML =
      actionCell(updated, effectiveState(updated), isManager());
    root.querySelector(`tr[data-qid="${id}"] td:nth-child(5)`).innerHTML =
      stateBadge(effectiveState(updated));
  }

  if (btn.classList.contains('btn-accept')) {
    const updated = await markAccepted(repo, quote);
    Object.assign(quote, updated);
    root.querySelector(`tr[data-qid="${id}"] .converted-cell`).innerHTML =
      actionCell(updated, effectiveState(updated), isManager());
    root.querySelector(`tr[data-qid="${id}"] td:nth-child(5)`).innerHTML =
      stateBadge(effectiveState(updated));
  }

  if (btn.classList.contains('btn-convert')) {
    const existing = await checkAlreadyConverted(repo, id);
    const cell = root.querySelector(`tr[data-qid="${id}"] .converted-cell`);
    if (existing) {
      cell.innerHTML = `<span class="text-xs text-slate-500">Already converted → <a href="#/shipments" class="text-blue-600 hover:underline">${existing.shipment_ref || existing.id}</a></span>`;
    } else {
      const q = quote;
      const qs = new URLSearchParams({ quote_id: id, customer: q.customer || '', pol: q.pol || '', pod: q.pod || '', container: q.container_type || '' });
      navigate(`/sales/me/pnl/new?${qs.toString()}`);
    }
  }

  btn.disabled = false;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  const salesId = currentSalesRepId();
  const isM = isManager();

  root.innerHTML = `
    <div class="p-6 max-w-[1200px] mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div class="text-lg font-semibold text-slate-900">Quotations</div>
        <a href="#/sales/quote/new"
           class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition">
          + New Quote
        </a>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table class="w-full min-w-[700px]">
          <thead class="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2 text-left">Quote ID</th>
              <th class="px-3 py-2 text-left">Customer</th>
              <th class="px-3 py-2 text-left">Route</th>
              <th class="px-3 py-2 text-left">Container</th>
              <th class="px-3 py-2 text-left">State</th>
              <th class="px-3 py-2 text-left">Valid Until</th>
              <th class="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody id="qt-tbody"></tbody>
        </table>
        <div id="qt-empty" class="hidden text-center text-xs text-slate-400 py-8">
          No quotations yet. <a href="#/sales/quote/new" class="text-blue-500 hover:underline">Create one →</a>
        </div>
      </div>
      <div id="qt-loading" class="text-xs text-slate-400 mt-2">Loading…</div>
    </div>`;

  const repo = window.__vdg_repo;
  if (!repo) {
    root.querySelector('#qt-loading').textContent = 'Repo not available.';
    return;
  }

  const quotes = await loadQuotes(repo, salesId, isM);
  window.__qt_quotes = quotes;
  renderTable(root, quotes, isM);
  root.querySelector('#qt-loading').textContent = '';

  root.querySelector('#qt-tbody')?.addEventListener('click', (e) => handleActions(e, root, repo));

  window.addEventListener('vdg:locale-changed', () => render(root));
}
