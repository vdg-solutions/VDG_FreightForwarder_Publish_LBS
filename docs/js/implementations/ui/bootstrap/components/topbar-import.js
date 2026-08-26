// JSON bulk-import handler for the topbar's "Import Data" menu action.
//
// Split out of topbar.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The seam:
// this reads a file and writes envelopes into the repo — it renders nothing and shares no state
// with the bar's own render cycle beyond the handful of fields `host` hands it, same shape as the
// menu/banner split in topbar-menus.js.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { putEnvelope } from '../../core_abstractions/ports/data/shipment-repo.js';

/// `host` is the vdg-topbar element — used only to close the menu once the import settles.
export async function handleFileUpload(host, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const repo = window.__vdg_repo;
  if (!repo) return;

  window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'info', message: t('topbar.import.processing') } }));
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Invalid JSON format, expected array.');

    let count = 0;
    for (const item of data) {
      if (!item?.id) throw new Error('Import item missing "id" field.');
      await putEnvelope(repo, item.id, item); // envelope only — an undo of a list edit never touches money
      count++;
      if (count % 500 === 0) {
        window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'info', message: t('topbar.import.progress', { count, total: data.length }) } }));
      }
    }

    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'success', message: t('topbar.import.success', { count }) } }));
    setTimeout(() => window.location.reload(), 1500);
  } catch (err) {
    window.dispatchEvent(new CustomEvent('vdg:toast', { detail: { type: 'error', message: t('topbar.import.error', { error: err.message }) } }));
  }
  e.target.value = ''; // Reset input
  host._menuOpen = false;
}
