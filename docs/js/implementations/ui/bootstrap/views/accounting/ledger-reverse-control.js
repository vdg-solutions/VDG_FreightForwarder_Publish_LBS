// ledger-reverse-control.js — F-19-78: manager-only Reverse-entry affordance.
// Extracted from ledger-viewer.js for the 350-line cap (mirrors ledger-repost-panel.js split).
// refreshReverseControl carries the ROLE_MANAGER + host-existence guard so the viewer's
// #reverse-control-root (only present in the DOM for a manager, see shellHtml) stays the sole
// call site (AC-07).

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { showConfirm } from '../../helpers/show-confirm.js';
import { postReversal } from '../../../core_abstractions/ports/flows/ledger-poster.js';
import { ROLE_MANAGER } from '../../../../ui/core_abstractions/roles.js';
import { currentUserRole } from '../../../core_abstractions/ports/governance/route-guard.js';

const SOURCE_REVERSAL = 'reversal';

function toast(type, message) {
  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type, message } }));
}

/// AC-08: pure — `{ isReversal, originalId }` for a leg row. Used by renderLegsTable to render
/// the row_label tag + link back to the original entry_id on contra rows.
export function reversalLabelFor(leg) {
  return {
    isReversal: leg.source?.type === SOURCE_REVERSAL,
    originalId: leg.source?.id ?? null,
  };
}

/// AC-08: row_label tag + link-to-original markup for a contra row, '' for a non-reversal row.
export function renderReversalBadge(r) {
  const { isReversal, originalId } = reversalLabelFor(r);
  if (!isReversal) return '';
  return `
    <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700">${t('ledger.reversal.row_label')}</span>
    <button data-reversal-of="${originalId}" class="ml-1 text-blue-600 hover:underline text-[10px]">${t('ledger.reversal.of', { entry: originalId })}</button>`;
}

/// AC-07: binds row-select (data-entry-id -> onSelectRow) + reversal link (data-reversal-of ->
/// open-detail) clicks inside `panel`. `rows` is the same array renderLegsTable rendered.
export function bindLegRowInteractions(panel, rows, { onSelectRow }) {
  panel.querySelectorAll('[data-reversal-of]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.dispatchEvent(new CustomEvent('vdg:open-detail', {
        detail: { kind: 'journal_entry', id: btn.dataset.reversalOf },
      }));
    });
  });

  panel.querySelectorAll('[data-entry-id]').forEach((tr) => {
    tr.addEventListener('click', () => {
      const entryId = tr.dataset.entryId;
      onSelectRow(entryId, rows.find((r) => r.entry_id === entryId) ?? null);
    });
  });
}

/// AC-07: renders a Reverse button for `selectedEntryId`, or clears the host when nothing is
/// selected / the selected entry is itself a reversal (cannot reverse a reversal, mirrors the
/// postReversal guard). Re-invoked by the caller on every row-selection change — cheap, no
/// persistent state kept here.
export function mountReverseControl(host, { selectedEntryId, selectedLeg, actorId, ledgerRepo, onDone }) {
  if (!host) return;
  if (!selectedEntryId || reversalLabelFor(selectedLeg ?? {}).isReversal) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <button id="btn-reverse-entry"
      class="px-3 py-1.5 text-xs rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
      aria-label="${t('ledger.reversal.button')}">${t('ledger.reversal.button')}</button>`;

  host.querySelector('#btn-reverse-entry').addEventListener('click', async () => {
    const ok = await showConfirm({
      title: t('ledger.reversal.confirm_title'),
      body:  t('ledger.reversal.confirm_body', { entry: selectedEntryId }),
      destructive: true,
    });
    if (!ok) return;

    const btn = host.querySelector('#btn-reverse-entry');
    btn.disabled = true;
    try {
      await postReversal(selectedEntryId, actorId, ledgerRepo);
      onDone?.();
    } catch (err) {
      console.error('[ledger-reverse-control] reversal failed:', err); // DEV
      toast('error', t('ledger.reversal.error'));
    } finally {
      btn.disabled = false;
    }
  });
}

/// AC-07: manager-only, re-invoked on every selection change. `root` is the view root (holds
/// #reverse-control-root); `state` is forwarded to mountReverseControl.
export function refreshReverseControl(root, state) {
  if (currentUserRole() !== ROLE_MANAGER) return;
  const host = root.querySelector('#reverse-control-root');
  if (host) mountReverseControl(host, state);
}
