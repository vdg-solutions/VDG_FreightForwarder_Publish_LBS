// show-confirm.js — async Promise<boolean> wrapper around vdg-confirm-dialog (F-24-10).
// Replaces window.confirm()/alert() call sites across views/ — branded, i18n, no native chrome.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { mountConfirmDialog } from '../components/vdg-confirm-dialog.js';

const DEFAULT_CONFIRM_KEY = 'common.dialog.confirm.default_ok';
const DEFAULT_CANCEL_KEY  = 'common.dialog.confirm.default_cancel';

/// AC-01: resolves true on confirm click, false on cancel/backdrop/Escape.
/// F-28-12: pass reasonField:true (AC-03 reject-reason) to instead resolve
/// { confirmed, reason } — opt-in, existing boolean callers are unaffected.
export async function showConfirm({ title, body, confirmLabel, cancelLabel, destructive = false, reasonField = false, reasonLabel } = {}) {
  return new Promise((resolve) => {
    mountConfirmDialog({
      title,
      body,
      confirmLabel: confirmLabel ?? t(DEFAULT_CONFIRM_KEY),
      cancelLabel:  cancelLabel  ?? t(DEFAULT_CANCEL_KEY),
      destructive,
      reasonField,
      reasonLabel: reasonLabel ?? title,
    }, resolve);
  });
}
