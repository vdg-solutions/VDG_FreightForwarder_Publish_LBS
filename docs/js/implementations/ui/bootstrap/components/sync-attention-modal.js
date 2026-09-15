// sync-attention-modal.js — drill-through view for the chip's own "quarantined" count
// (owner: "cần làm 1 cái view để nhấn vô đó nó hiển thị ra các mục lỗi"). Same native-<dialog>
// pattern as ledger-unbalanced-modal.js. A refused save (`write_rejected`, cas-write-path.md §7)
// carries its actions and its changed fields, decided in Rust; this view draws them and forwards a
// click to `sync_intent_reapply` / `sync_intent_discard`. It decides nothing.

import { t, currentLocale, fmtNumber } from '../../../kernel/core_abstractions/i18n/index.js';

// reason_code (Rust-minted, vdg_freight::outbox::attention::REASON_CODE_* and
// attention_intent_rules::CODE_*) -> i18n key. Computed lookup, not a literal t() call — mirrors
// guard-messages.js's own GUARD_MESSAGE_KEYS table, and its own i18n test
// (sync-attention-i18n.test.mjs) closes the same blind spot i18n-completeness.mjs's
// detectUnknownTKeys has for a computed key.
const REASON_CODE_TO_KEY = {
  undecodable_content: 'topbar.sync.attention.reason.undecodable_content',
  permission_denied:   'topbar.sync.attention.reason.permission_denied',
  not_found:           'topbar.sync.attention.reason.not_found',
  validation_refused:  'topbar.sync.attention.reason.validation_refused',
  unsupported_kind:    'topbar.sync.attention.reason.unsupported_kind',
  record_changed:      'topbar.sync.attention.reason.record_changed',
  state_moved:         'topbar.sync.attention.reason.state_moved',
  create_collided:     'topbar.sync.attention.reason.create_collided',
  other:               'topbar.sync.attention.reason.other',
};
const REASON_FALLBACK_KEY = 'topbar.sync.attention.reason.other';

// Rust's action codes (attention_intent_rules::ACTION_*) -> button label key.
const ACTION_TO_KEY = {
  reapply: 'attention.action.reapply',
  discard: 'attention.action.discard',
  open:    'attention.action.open',
};

// Where "open" goes for a record kind — navigation is the shell's job.
const OPEN_ROUTE = { shipment: (id) => `#/sales/edit/${encodeURIComponent(id)}` };
const OUTCOME_STALE = 'stale';
const ACTION_ATTR = 'data-intent-action';

export function reasonText(reasonCode) {
  return t(REASON_CODE_TO_KEY[reasonCode] ?? REASON_FALLBACK_KEY);
}

export function fmtWhen(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(currentLocale() === 'vi' ? 'vi-VN' : 'en-US');
}

const shown = (v) => (v === null || v === undefined || v === '' ? '—' : (typeof v === 'object' ? JSON.stringify(v) : String(v)));

export function changeLines(item) {
  const changes = item.changes || [];
  const lines = changes.map((c) => `
    <div class="text-[11px] text-slate-600"><span class="font-mono">${c.field}</span>:
      ${t('attention.change.yours')} <b>${shown(c.yours)}</b> ·
      ${t('attention.change.from')} ${shown(c.from)} ·
      ${t('attention.change.now')} ${shown(c.now)}</div>`);
  if (item.dependents) lines.push(`<div class="text-[11px] text-slate-400">${t('attention.dependents', { n: fmtNumber(item.dependents) })}</div>`);
  return lines.join('');
}

export function actionButtons(item) {
  if (!item.intent_id) return '';
  return (item.actions || []).filter((a) => ACTION_TO_KEY[a] && (a !== 'open' || OPEN_ROUTE[item.collection])).map((a) => `
    <button type="button" ${ACTION_ATTR}="${a}" data-intent-id="${item.intent_id}"
      class="px-2 py-1 text-[11px] rounded border border-slate-300 hover:bg-slate-100">${t(ACTION_TO_KEY[a])}</button>`).join(' ');
}

export function itemRow(item) {
  const label = item.record_label || `${item.collection} / ${item.record_id}`;
  return `
    <tr class="border-b border-slate-100 align-top">
      <td class="px-3 py-2">
        <div class="font-medium text-slate-800">${label}</div>
        <div class="text-[11px] text-slate-400 font-mono">${item.collection} · ${item.record_id}</div>
      </td>
      <td class="px-3 py-2">${reasonText(item.reason_code)}${changeLines(item)}</td>
      <td class="px-3 py-2 text-slate-500 whitespace-nowrap">${fmtWhen(item.last_seen_ms)}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtNumber(item.attempts)}</td>
      <td class="px-3 py-2 text-right whitespace-nowrap">${actionButtons(item)}</td>
    </tr>`;
}

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message } }));
}

async function onAction(dlg, button, items) {
  const action = button.getAttribute(ACTION_ATTR);
  const intentId = button.getAttribute('data-intent-id');
  const item = items.find((i) => i.intent_id === intentId);
  if (action === 'open') {
    window.location.hash = OPEN_ROUTE[item.collection](item.record_id);
    dlg.close();
    return;
  }
  const wasm = window.__vdg_wasm;
  const call = action === 'reapply' ? wasm?.sync_intent_reapply : wasm?.sync_intent_discard;
  try {
    const reply = await call({ intent_id: intentId });
    if (!reply?.ok) toast('error', t('attention.action.failed', { error: reply?.error ?? '' }));
    else if (reply.outcome === OUTCOME_STALE) toast('info', t('save.error.stale_base'));
  } catch (e) {
    toast('error', t('attention.action.failed', { error: e?.message ?? String(e) }));
  }
  dlg.close();
  openSyncAttentionModal();
}

// AC: clicking the quarantined chip opens this list (topbar-sync-chip.js::decideChipAction ->
// CHIP_ACTION.SHOW_ATTENTION_ITEMS).
export async function openSyncAttentionModal() {
  let items = [];
  try {
    items = (await window.__vdg_repo?.sync_attention_items?.()) || [];
  } catch (e) {
    toast('error', t('topbar.sync.attention.load_failed'));
    return;
  }

  const body = items.length
    ? `<table class="w-full text-left border-collapse text-xs">
         <thead>
           <tr class="bg-slate-50 text-slate-500 uppercase text-[10px]">
             <th class="px-3 py-2">${t('topbar.sync.attention.col_record')}</th>
             <th class="px-3 py-2">${t('topbar.sync.attention.col_reason')}</th>
             <th class="px-3 py-2">${t('topbar.sync.attention.col_when')}</th>
             <th class="px-3 py-2 text-right">${t('topbar.sync.attention.col_attempts')}</th>
             <th class="px-3 py-2 text-right">${t('topbar.sync.attention.col_actions')}</th>
           </tr>
         </thead>
         <tbody>${items.map(itemRow).join('')}</tbody>
       </table>`
    : `<div class="px-6 py-10 text-center text-slate-400 text-sm">${t('topbar.sync.attention.empty')}</div>`;

  const dlg = document.createElement('dialog');
  dlg.className = 'rounded-xl shadow-2xl p-0 w-[760px] max-w-[95vw] bg-white backdrop:bg-black/40';
  dlg.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <div class="font-semibold text-slate-900 text-sm">${t('topbar.sync.attention.title')}</div>
      <button class="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500" onclick="this.closest('dialog').close()">✕</button>
    </div>
    <div class="max-h-[70vh] overflow-y-auto">${body}</div>
  `;
  dlg.addEventListener('click', (ev) => {
    const button = ev.target.closest?.(`[${ACTION_ATTR}]`);
    if (button) onAction(dlg, button, items);
  });
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

// vdg:intent-settled (FsmIntentRevalidate): the job was already where the refused click wanted it.
export function bindIntentNotices() {
  window.addEventListener('vdg:intent-settled', () => toast('info', t('intent.settled.already_in_state')));
}
