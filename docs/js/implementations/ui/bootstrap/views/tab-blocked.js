// tab-blocked.js — the screen a tab that does not own the workspace gets (owner rule 2026-09-17:
// the app may be open in exactly ONE tab).
//
// This screen is the whole point of the rule. A refused tab was never the problem; the problem was
// that the refused tab rendered a form with a Save button and nothing behind either of them — no
// router, no submit handler, no network call, no message, and a person who believed their record
// had saved. So: say plainly what is true, and offer exactly one action that resolves it.
//
// One action, not two. "Close this tab" is not an action a page can take, and "retry" would be a
// button whose answer cannot change while the other tab is open. Taking ownership is the only move
// that changes the situation, and it is symmetric: the other tab loses the lock and comes back
// through this same screen.
import { t } from '../../../kernel/core_abstractions/i18n/index.js';

const USE_THIS_TAB_BTN_ID = 'tab-blocked-use-this';

/// Replaces whatever the container held — index.html's pre-rendered "Đang tải…" placeholder
/// included. A silent await that resolves to a stuck loading string is banned, and this is the
/// resolution: a real view with real words.
export function renderTabBlockedScreen(container, { onUseThisTab } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-3xl">🗂️</div>
      <div class="text-xl font-semibold text-slate-700">${t('tab_blocked.title')}</div>
      <div class="text-sm text-slate-500 max-w-md leading-relaxed">${t('tab_blocked.body')}</div>
      <button id="${USE_THIS_TAB_BTN_ID}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t('tab_blocked.use_this_tab')}
      </button>
    </div>`;
  // The handler's promise is RETURNED, not dropped: taking ownership and re-running the gate is
  // async, and a caller (a test, a later re-render) has to be able to wait for it to finish.
  container.querySelector(`#${USE_THIS_TAB_BTN_ID}`)
    ?.addEventListener('click', () => onUseThisTab?.());
}
