// ledger-reconcile-control.js — the ledger viewer's reconciliation status line + manual run
// (F-23-06), lifted out of ledger-viewer.js so the viewer keeps room for the opening-balance
// seam (F-42-02). Same split as ledger-reverse-control.js / ledger-viewer-unbalanced.js: one
// control, its own file, the viewer owns only the state.

import { t } from '../../i18n/index.js';
import { runAndRecord } from '../../operators/manager/ledger-reconciler.js';
import { renderUnbalancedList } from './ledger-viewer-unbalanced.js';

function fmtRunDate(runAt) { return runAt ? new Date(runAt).toLocaleDateString('vi-VN') : ''; }

export function renderReconcileStatus(root, rec) {
  const status = root.querySelector('#reconcile-status');
  if (!status) return;
  if (!rec) { status.textContent = t('ledger.reconcile.never_run'); return; }
  status.textContent = rec.balanced
    ? t('ledger.reconcile.status_ok').replace('{date}', fmtRunDate(rec.run_at))
    : t('ledger.reconcile.status_bad')
        .replace('{date}', fmtRunDate(rec.run_at))
        .replace('{n}', String(rec.unbalanced_ids?.length ?? 0));
}

/**
 * AC-07: manual trigger — disables the button while running, surfaces errors instead of a
 * stale/false "balanced" status (AC-09).
 * @returns {Promise<object|null>} the new reconciliation record, or null when it failed
 */
export async function runReconciliationNow(root, repo) {
  if (!repo) return null;
  const btn    = root.querySelector('#btn-reconcile-now');
  const status = root.querySelector('#reconcile-status');
  if (btn) btn.disabled = true;
  if (status) status.textContent = t('ledger.reconcile.running');

  try {
    const rec = await runAndRecord(repo);
    renderReconcileStatus(root, rec);
    renderUnbalancedList(root, repo, rec?.unbalanced_ids ?? []);
    return rec;
  } catch (err) {
    if (status) status.textContent = t('ledger.reconcile.error');
    console.error('[ledger-viewer] reconcile failed:', err); // DEV
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}
