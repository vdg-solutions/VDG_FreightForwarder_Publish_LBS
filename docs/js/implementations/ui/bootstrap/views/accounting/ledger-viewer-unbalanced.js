// ledger-viewer-unbalanced.js — F-19-75: reconciliation unbalanced-entry list + drill-through.
// Extracted from ledger-viewer.js for the 350-line cap (mirrors ledger-unbalanced-modal.js /
// ledger-repost-panel.js). Synchronous render straight off unbalanced_ids — no per-id leg
// pre-fetch. The cross-account entry scan (O(accounts) file reads per id) is bounded and deferred
// to the button click handler, off the render path entirely (AC-06); it now happens behind the
// wasm boundary, which also totals what it read.

import { safeMasterLoad } from '../../../../kernel/core_abstractions/util/master-load.js';
import { entryTotals } from '../../../core_abstractions/ports/manager/ledger-aggregator.js';
import { jumpToUnbalancedEntry } from './ledger-unbalanced-modal.js';

const ENTRY_LEGS_TAG = 'ledger:entry-legs';

export function renderUnbalancedList(root, ids) {
  const list = root.querySelector('#reconcile-unbalanced-list');
  if (!list) return;
  if (!ids.length) { list.innerHTML = ''; return; }

  list.innerHTML = `
    <div class="border border-amber-200 bg-amber-50 rounded-lg p-2 flex flex-col gap-1">
      ${ids.map((entryId) => `
        <button data-unbalanced-entry="${entryId}"
          class="w-full text-left px-3 py-2 text-xs font-mono text-amber-900 bg-amber-100 hover:bg-amber-200 rounded flex justify-between items-center group transition-colors">
          <span class="font-bold">${entryId}</span>
          <svg class="w-4 h-4 opacity-50 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>`).join('')}
    </div>`;

  list.querySelectorAll('[data-unbalanced-entry]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const entryId = btn.dataset.unbalancedEntry;
      // The entry names itself; wasm scans the year's account files for its legs and totals them.
      const res = await safeMasterLoad(() => entryTotals(entryId), ENTRY_LEGS_TAG);
      if (res.ok && res.value.ok) jumpToUnbalancedEntry(entryId, res.value);
    });
  });
}
