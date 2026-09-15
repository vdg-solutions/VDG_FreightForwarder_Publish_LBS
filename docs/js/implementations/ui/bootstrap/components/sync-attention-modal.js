// sync-attention-modal.js — drill-through view for the chip's own "quarantined" count
// (owner: "cần làm 1 cái view để nhấn vô đó nó hiển thị ra các mục lỗi"). Same native-<dialog>
// pattern as ledger-unbalanced-modal.js. Read-only for now — no retry/discard action yet; the
// table is laid out with room for one (a CAS 412 write path is being designed separately,
// backlog/wiki/cas-write-path.md).

import { t, currentLocale, fmtNumber } from '../../../kernel/core_abstractions/i18n/index.js';

// reason_code (Rust-minted, vdg_freight::outbox::attention::REASON_CODE_*) -> i18n key. Computed
// lookup, not a literal t() call — mirrors guard-messages.js's own GUARD_MESSAGE_KEYS table, and
// its own i18n test (sync-attention-i18n.test.mjs) closes the same blind spot
// i18n-completeness.mjs's detectUnknownTKeys has for a computed key.
const REASON_CODE_TO_KEY = {
  undecodable_content: 'topbar.sync.attention.reason.undecodable_content',
  permission_denied:   'topbar.sync.attention.reason.permission_denied',
  not_found:           'topbar.sync.attention.reason.not_found',
  validation_refused:  'topbar.sync.attention.reason.validation_refused',
  unsupported_kind:    'topbar.sync.attention.reason.unsupported_kind',
  other:               'topbar.sync.attention.reason.other',
};
const REASON_FALLBACK_KEY = 'topbar.sync.attention.reason.other';

// Exported for the unit test only (pure, no DOM) — this repo has no jsdom harness, so a dialog-
// building function stays untested end-to-end (same gap ledger-unbalanced-modal.js already has);
// the pure row/text builders below are what a test CAN reach without one.
export function reasonText(reasonCode) {
  return t(REASON_CODE_TO_KEY[reasonCode] ?? REASON_FALLBACK_KEY);
}

export function fmtWhen(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(currentLocale() === 'vi' ? 'vi-VN' : 'en-US');
}

export function itemRow(item) {
  const label = item.record_label || `${item.collection} / ${item.record_id}`;
  return `
    <tr class="border-b border-slate-100">
      <td class="px-3 py-2">
        <div class="font-medium text-slate-800">${label}</div>
        <div class="text-[11px] text-slate-400 font-mono">${item.collection} · ${item.record_id}</div>
      </td>
      <td class="px-3 py-2">${reasonText(item.reason_code)}</td>
      <td class="px-3 py-2 text-slate-500 whitespace-nowrap">${fmtWhen(item.last_seen_ms)}</td>
      <td class="px-3 py-2 text-right font-mono">${fmtNumber(item.attempts)}</td>
    </tr>`;
  // A future action column (retry/discard) goes here as one more <td> — not built in this pass.
}

// AC: clicking the quarantined chip opens this list (topbar-sync-chip.js::decideChipAction ->
// CHIP_ACTION.SHOW_ATTENTION_ITEMS). Read-only.
export async function openSyncAttentionModal() {
  let items = [];
  try {
    items = (await window.__vdg_repo?.sync_attention_items?.()) || [];
  } catch (e) {
    window.dispatchEvent(new CustomEvent('vdg:toast', {
      detail: { type: 'error', message: t('topbar.sync.attention.load_failed') },
    }));
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
           </tr>
         </thead>
         <tbody>${items.map(itemRow).join('')}</tbody>
       </table>`
    : `<div class="px-6 py-10 text-center text-slate-400 text-sm">${t('topbar.sync.attention.empty')}</div>`;

  const dlg = document.createElement('dialog');
  dlg.className = 'rounded-xl shadow-2xl p-0 w-[640px] max-w-[95vw] bg-white backdrop:bg-black/40';
  dlg.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
      <div class="font-semibold text-slate-900 text-sm">${t('topbar.sync.attention.title')}</div>
      <button class="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500" onclick="this.closest('dialog').close()">✕</button>
    </div>
    <div class="max-h-[70vh] overflow-y-auto">${body}</div>
  `;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}
