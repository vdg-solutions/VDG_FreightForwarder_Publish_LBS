// Manager Approvals — F-14-03

import '../../components/approval-card.js';
import { APPROVAL_SLA_HOURS } from '../../components/approval-card.js';
import { isManager } from '../../auth/auth-gate.js';
import { navigate }  from '../../router.js';
import { showConfirm } from '../../helpers/show-confirm.js';

const TOAST_AUTODISMISS_MS = 5_000;
const KIND_APPROVAL        = 'approval_request';
const KIND_DECISION        = 'approval_decision';

let _items       = [];
const _filter      = { type: null, urgent: false };
const _selectedIds = new Set();
let _onEntity;

function getRepo()  { return window.__vdg_repo; }
function currentUser() { return window.__vdg_auth?.getCurrentUser?.()?.email || 'manager'; }

function ageHours(isoStr) {
  return (Date.now() - new Date(isoStr).getTime()) / 3_600_000;
}

function applyFilter(items) {
  return items.filter((a) => {
    if (_filter.type   && a.type   !== _filter.type)   return false;
    if (_filter.urgent && ageHours(a.requested_at) <= APPROVAL_SLA_HOURS) return false;
    return true;
  });
}

async function loadItems() {
  const repo = getRepo();
  if (!repo) return [];
  const all = await repo.list(KIND_APPROVAL, null);
  return all
    .filter((a) => a.status === 'Pending' && !a._deleted)
    .sort((a, b) => new Date(a.requested_at) - new Date(b.requested_at));
}

async function writeDecision(approvalId, decision, comment, delegatedTo) {
  const repo = getRepo();
  if (!repo) return;
  const now = Date.now();
  const decidedAt = new Date(now).toISOString();
  const by = currentUser();

  // Write decision record
  const decId = crypto.randomUUID?.() || `dec-${Date.now()}`;
  const rec = {
    id:                  decId,
    approval_request_id: approvalId,
    decision,
    comment:    comment || '',
    decided_at: decidedAt,
    decided_by: by,
  };
  if (delegatedTo) rec.delegated_to = delegatedTo;
  await repo.put(KIND_DECISION, decId, rec);

  // Update approval_request status
  const ar = await repo.get(KIND_APPROVAL, approvalId).catch(() => null);
  if (ar) {
    await repo.put(KIND_APPROVAL, approvalId, {
      ...ar,
      status:        decision === 'NeedInfo' ? 'Pending' : decision,
      decided_at_ms: now,
      decided_by:    by,
      decision,
    });
    // Mirror back to quote if QuoteOverride approved
    if (ar.type === 'QuoteOverride' && ar.target_id && decision === 'Approved') {
      const quote = await repo.get('quotations', ar.target_id).catch(() => null);
      if (quote) {
        await repo.put('quotations', quote.id, { ...quote, pending_manager_approval: false });
      }
    }
  }
}

function updateBadge(count) {
  window.dispatchEvent(new CustomEvent('vdg:approval-count', { detail: { count } }));
}

function renderCards(root, items) {
  const list = root.querySelector('#approval-list');
  if (!list) return;

  const filtered = applyFilter(items);
  list.innerHTML = filtered.length === 0
    ? '<div class="text-center text-slate-400 text-sm py-12">No pending approvals</div>'
    : '';

  for (const item of filtered) {
    const card = document.createElement('vdg-approval-card');
    card.item = item;
    card.dataset.id = item.id;

    const chk = document.createElement('input');
    chk.type      = 'checkbox';
    chk.className = 'mt-1 accent-blue-600';
    chk.addEventListener('change', (e) => {
      e.target.checked ? _selectedIds.add(item.id) : _selectedIds.delete(item.id);
      updateBulkBar(root);
    });

    const wrap = document.createElement('div');
    wrap.className = 'flex gap-3 items-start';
    wrap.appendChild(chk);
    wrap.appendChild(card);
    list.appendChild(wrap);
  }

  updateBadge(filtered.length);
}

function updateBulkBar(root) {
  const bar = root.querySelector('#bulk-approve-bar');
  if (!bar) return;
  bar.classList.toggle('hidden', _selectedIds.size === 0);
  const cntEl = bar.querySelector('#bulk-count');
  if (cntEl) cntEl.textContent = `${_selectedIds.size} selected`;
}

export async function render(root) {
  if (!isManager()) { navigate('/dashboard'); return; }

  if (_onEntity) window.removeEventListener('vdg:entity-changed', _onEntity);
  _selectedIds.clear();

  root.innerHTML = `
    <div class="p-6 space-y-4 max-w-[900px] mx-auto">
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex gap-2 flex-wrap">
          <button data-filt="all"
            class="px-3 py-1 rounded-full text-xs bg-blue-600 text-white">All</button>
          <button data-filt="urgent"
            class="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-slate-200">
            Urgent (SLA overdue)
          </button>
        </div>
        <div id="bulk-approve-bar"
          class="hidden flex items-center gap-3 bg-slate-800 text-white rounded-lg px-4 py-2">
          <span id="bulk-count" class="text-xs font-medium"></span>
          <button id="btn-bulk-approve"
            class="px-3 py-1 text-xs bg-emerald-600 rounded hover:bg-emerald-700">
            Bulk approve
          </button>
        </div>
      </div>

      <div id="approval-list" class="space-y-3"></div>
    </div>`;

  _items = await loadItems();
  renderCards(root, _items);

  root.addEventListener('click', (e) => {
    const filtBtn = e.target.closest('[data-filt]');
    if (filtBtn) {
      root.querySelectorAll('[data-filt]').forEach((b) => {
        b.className = 'px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 hover:bg-slate-200';
      });
      filtBtn.className = 'px-3 py-1 rounded-full text-xs bg-blue-600 text-white';
      _filter.urgent = filtBtn.dataset.filt === 'urgent';
      renderCards(root, _items);
    }
  });

  root.querySelector('#btn-bulk-approve')?.addEventListener('click', async () => {
    const n = _selectedIds.size;
    if (!n) return;
    const ok = await showConfirm({
      title: 'Confirm bulk approval',
      body:  `Approve ${n} item${n > 1 ? 's' : ''}? This cannot be undone.`,
      confirmLabel: 'Approve',
      cancelLabel:  'Cancel',
    });
    if (!ok) return;
    const ids = [..._selectedIds];
    await Promise.all(ids.map((id) => writeDecision(id, 'Approved', '', undefined)));
    _selectedIds.clear();
    _items = await loadItems();
    renderCards(root, _items);
  });

  root.addEventListener('vdg:approval-decision', async (e) => {
    const { approval_request_id, decision, comment, delegated_to } = e.detail;
    try {
      await writeDecision(approval_request_id, decision, comment, delegated_to);
      _items = _items.filter((a) => a.id !== approval_request_id || decision === 'NeedInfo');
      renderCards(root, _items);
    } catch (err) {
      console.warn('[approvals] write failed:', err.message); // DEV
    }
  });

  _onEntity = async (e) => {
    const { kind } = e.detail || {};
    if (kind !== KIND_APPROVAL) return;
    _items = await loadItems();
    renderCards(root, _items);
    window.dispatchEvent(new CustomEvent('vdg:toast', {
      detail: { type: 'info', message: 'New approval request received', duration: TOAST_AUTODISMISS_MS },
    }));
  };

  window.addEventListener('vdg:entity-changed', _onEntity);
}
