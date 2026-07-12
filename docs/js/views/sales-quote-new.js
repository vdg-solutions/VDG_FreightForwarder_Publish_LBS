// F-12-10 — New quotation form (Draft creation)

import { currentSalesRepId } from '../auth/auth-gate.js';
import { saveDraft } from '../operators/quote-orchestrator.js';
import { navigate } from '../router.js';

const DEFAULT_VALIDITY_DAYS  = 7;
const OVERRIDE_THRESHOLD_PCT = 0.15;

const CONTAINER_TYPES = ['20GP', '40HC', '40GP', 'LCL', 'AIR'];
const VALID_CURRENCIES = ['VND', 'USD', 'EUR', 'SGD', 'JPY'];

// ── helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showError(root, fieldId, msg) {
  const el = root.querySelector(`#err-${fieldId}`);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function clearErrors(root) {
  root.querySelectorAll('.field-err').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
}

// ── autocomplete dropdown ──────────────────────────────────────────────────────

function attachAutocomplete(inputEl, items, labelKey) {
  if (!inputEl) return;
  const list = document.createElement('ul');
  list.className = 'absolute z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto w-full';
  list.style.display = 'none';
  inputEl.parentElement.style.position = 'relative';
  inputEl.parentElement.appendChild(list);

  function show(filtered) {
    list.innerHTML = filtered.slice(0, 10).map((item) =>
      `<li class="px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-100" data-val="${escHtml(item[labelKey] || item.name || item)}">${escHtml(item[labelKey] || item.name || item)}</li>`
    ).join('');
    list.style.display = filtered.length ? 'block' : 'none';
  }

  inputEl.addEventListener('input', () => {
    const q = inputEl.value.toLowerCase();
    show(q ? items.filter((i) => (i[labelKey] || i.name || i).toLowerCase().includes(q)) : []);
  });
  list.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li[data-val]');
    if (li) { inputEl.value = li.dataset.val; list.style.display = 'none'; }
  });
  inputEl.addEventListener('blur', () => setTimeout(() => { list.style.display = 'none'; }, 150));
}

// ── rate lines table ───────────────────────────────────────────────────────────

let _lines = [{ description: '', amount: '', currency: 'VND' }];

function renderLinesTable(root) {
  const tbody = root.querySelector('#lines-tbody');
  if (!tbody) return;
  tbody.innerHTML = _lines.map((l, i) => `
    <tr data-idx="${i}">
      <td class="px-2 py-1">
        <input type="text" value="${escHtml(l.description)}" placeholder="Description"
               class="w-full border rounded px-2 py-1 text-xs" data-field="description" data-idx="${i}" />
      </td>
      <td class="px-2 py-1">
        <input type="number" value="${escHtml(l.amount)}" placeholder="0"
               class="w-full border rounded px-2 py-1 text-xs" data-field="amount" data-idx="${i}" />
      </td>
      <td class="px-2 py-1">
        <select class="border rounded px-2 py-1 text-xs" data-field="currency" data-idx="${i}">
          ${VALID_CURRENCIES.map((c) => `<option ${c === l.currency ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </td>
      <td class="px-2 py-1 text-center">
        <button class="text-red-500 hover:text-red-700 text-xs font-bold" data-rm="${i}">✕</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const idx = Number(el.dataset.idx);
      _lines[idx][el.dataset.field] = el.value;
    });
    el.addEventListener('input', () => {
      const idx = Number(el.dataset.idx);
      _lines[idx][el.dataset.field] = el.value;
    });
  });
  tbody.querySelectorAll('[data-rm]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.rm);
      _lines.splice(idx, 1);
      if (!_lines.length) _lines.push({ description: '', amount: '', currency: 'VND' });
      renderLinesTable(root);
    });
  });
}

// ── form scaffold ─────────────────────────────────────────────────────────────

function formHtml(presetSales) {
  const ctOptions = CONTAINER_TYPES.map((t) => `<option value="${t}">${t}</option>`).join('');
  return `
    <div class="p-6 max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <div>
          <div class="text-lg font-semibold text-slate-900">New Quotation</div>
          <div class="text-xs text-slate-500 mt-0.5">Draft saved immediately — send when ready</div>
        </div>
        <a href="#/sales/quote" class="text-sm text-slate-500 hover:text-slate-700">← Back to list</a>
      </div>
      <div id="override-banner" class="hidden mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Override &gt;15% — requires manager approval before sending
      </div>
      <form id="quote-form" class="bg-white rounded-xl border border-slate-200 p-6 space-y-4" novalidate>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Customer <span class="text-red-500">*</span></label>
            <div class="relative">
              <input id="f-customer" type="text" autocomplete="off" placeholder="Customer name"
                     class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <span id="err-customer" class="field-err hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Carrier</label>
            <div class="relative">
              <input id="f-carrier" type="text" autocomplete="off" placeholder="Carrier name (optional)"
                     class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">POL <span class="text-red-500">*</span></label>
            <input id="f-pol" type="text" placeholder="Port of Loading"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="err-pol" class="field-err hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">POD <span class="text-red-500">*</span></label>
            <input id="f-pod" type="text" placeholder="Port of Discharge"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="err-pod" class="field-err hidden text-xs text-red-600"></span>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Container Type <span class="text-red-500">*</span></label>
            <select id="f-container" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              ${ctOptions}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-700 mb-1">Validity (days) <span class="text-red-500">*</span></label>
            <input id="f-validity" type="number" value="${DEFAULT_VALIDITY_DAYS}" min="1" max="365"
                   class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span id="err-validity" class="field-err hidden text-xs text-red-600"></span>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-medium text-slate-700">Rate Lines <span class="text-red-500">*</span></label>
            <button type="button" id="btn-add-line"
                    class="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Line</button>
          </div>
          <span id="err-lines" class="field-err hidden text-xs text-red-600 block mb-1"></span>
          <div class="rounded-lg border border-slate-200 overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-2 py-1.5 text-left text-slate-500 font-medium">Description</th>
                  <th class="px-2 py-1.5 text-left text-slate-500 font-medium w-28">Amount</th>
                  <th class="px-2 py-1.5 text-left text-slate-500 font-medium w-20">Currency</th>
                  <th class="w-8"></th>
                </tr>
              </thead>
              <tbody id="lines-tbody"></tbody>
            </table>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <textarea id="f-notes" rows="2" placeholder="Optional notes for this quotation"
                    class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"></textarea>
        </div>

        <div class="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition">
            Save Draft
          </button>
          <a href="#/sales/quote" class="text-sm text-slate-500 hover:text-slate-700">Cancel</a>
          <span id="form-status" class="text-xs text-slate-500 ml-auto"></span>
        </div>
      </form>
    </div>`;
}

// ── entry point ───────────────────────────────────────────────────────────────

export async function render(root) {
  _lines = [{ description: '', amount: '', currency: 'VND' }];
  const salesId = currentSalesRepId();
  if (!salesId) {
    root.innerHTML = `<div class="p-6 text-red-600 text-sm">Not authenticated.</div>`;
    return;
  }

  root.innerHTML = formHtml(salesId);
  renderLinesTable(root);

  // Load masters for autocomplete
  const repo = window.__vdg_repo;
  let customers = [], carriers = [];
  if (repo) {
    [customers, carriers] = await Promise.all([
      repo.list('customers', null).catch(() => []),
      repo.list('carriers', null).catch(() => []),
    ]);
  }
  attachAutocomplete(root.querySelector('#f-customer'), customers, 'name');
  attachAutocomplete(root.querySelector('#f-carrier'),  carriers,  'name');

  root.querySelector('#btn-add-line')?.addEventListener('click', () => {
    _lines.push({ description: '', amount: '', currency: 'VND' });
    renderLinesTable(root);
  });

  root.querySelector('#quote-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(root);
    const customer  = root.querySelector('#f-customer').value.trim();
    const pol       = root.querySelector('#f-pol').value.trim();
    const pod       = root.querySelector('#f-pod').value.trim();
    const validity  = root.querySelector('#f-validity').value.trim();
    const container_type = root.querySelector('#f-container').value;
    const carrier   = root.querySelector('#f-carrier').value.trim();
    const notes     = root.querySelector('#f-notes').value.trim();

    let ok = true;
    if (!customer) { showError(root, 'customer', 'Customer is required'); ok = false; }
    if (!pol)      { showError(root, 'pol',      'POL is required');      ok = false; }
    if (!pod)      { showError(root, 'pod',      'POD is required');      ok = false; }
    if (!validity || Number(validity) < 1) { showError(root, 'validity', 'Validity must be ≥ 1 day'); ok = false; }
    const validLines = _lines.filter((l) => l.description && Number(l.amount) > 0);
    if (!validLines.length) { showError(root, 'lines', 'At least one rate line required'); ok = false; }
    if (!ok) return;

    const statusEl = root.querySelector('#form-status');
    if (statusEl) statusEl.textContent = 'Saving…';

    try {
      const { id, pending_manager_approval } = await saveDraft(repo, salesId, {
        customer, pol, pod, container_type, carrier, notes,
        lines: validLines, validity_days: Number(validity),
      });

      if (pending_manager_approval) {
        root.querySelector('#override-banner')?.classList.remove('hidden');
        if (statusEl) statusEl.textContent = 'Saved — pending approval';
      }
      setTimeout(() => navigate('/sales/quote'), pending_manager_approval ? 2000 : 400);
    } catch (err) {
      if (statusEl) statusEl.textContent = `Error: ${err.message}`;
    }
  });
}
