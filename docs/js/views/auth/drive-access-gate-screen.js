// drive-access-gate-screen.js — Drive-permission gate screens. Mirrors
// license-gate-screen.js: reason-branched, one action button, no textarea/mailto (AC-09).

import { t } from '../../i18n/index.js';

export const DRIVE_ACCESS_REASON_SCOPE      = 'scope';      // AC-03/05
export const DRIVE_ACCESS_REASON_PERMISSION = 'permission'; // AC-06
export const DRIVE_ACCESS_REASON_TRANSIENT  = 'transient';  // F-24-19: Drive unreachable / 5xx / quota

const GRANT_BTN_ID            = 'drive-access-grant-btn';
const PERMISSION_RETRY_BTN_ID = 'drive-access-permission-retry';
const TRANSIENT_RETRY_BTN_ID  = 'drive-access-transient-retry';
const DECLINED_HINT_ID        = 'drive-access-declined-hint';

const TITLE_KEY = {
  [DRIVE_ACCESS_REASON_SCOPE]:      'drive_access.scope.title',
  [DRIVE_ACCESS_REASON_PERMISSION]: 'drive_access.permission.title',
  [DRIVE_ACCESS_REASON_TRANSIENT]:  'drive_access.transient.title',
};
const BODY_KEY = {
  [DRIVE_ACCESS_REASON_SCOPE]:      'drive_access.scope.body',
  [DRIVE_ACCESS_REASON_PERMISSION]: 'drive_access.permission.body',
  [DRIVE_ACCESS_REASON_TRANSIENT]:  'drive_access.transient.body',
};
// Non-scope reasons resolve to a plain reload button; scope gets its own re-consent button.
const RETRY_BTN_ID = {
  [DRIVE_ACCESS_REASON_PERMISSION]: PERMISSION_RETRY_BTN_ID,
  [DRIVE_ACCESS_REASON_TRANSIENT]:  TRANSIENT_RETRY_BTN_ID,
};

// reason: DRIVE_ACCESS_REASON_SCOPE | _PERMISSION | _TRANSIENT.
// declinedAgain (scope reason only): user clicked grant and declined again — adds an inline
// hint line, never a silent no-op (AC-09).
// onRequestScope (scope reason only): grant-button click handler; omitted (permission/
// transient reason, or missing) → button falls back to location.reload().
export function renderDriveAccessGateScreen(container, { reason, declinedAgain = false, onRequestScope } = {}) {
  if (!container) return;
  const isScope  = reason === DRIVE_ACCESS_REASON_SCOPE;
  const btnId    = isScope ? GRANT_BTN_ID : (RETRY_BTN_ID[reason] || PERMISSION_RETRY_BTN_ID);
  const btnLabel = isScope ? t('drive_access.scope.button') : t('license.gate.retry_button');

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t(TITLE_KEY[reason])}</div>
      <div class="text-sm text-slate-500 max-w-md">${t(BODY_KEY[reason])}</div>
      ${isScope && declinedAgain
        ? `<div id="${DECLINED_HINT_ID}" data-testid="${DECLINED_HINT_ID}" class="text-sm text-amber-600 max-w-md">${t('drive_access.scope.declined_again')}</div>`
        : ''}
      <button id="${btnId}" data-testid="${btnId}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${btnLabel}
      </button>
    </div>`;

  container.querySelector(`#${btnId}`)?.addEventListener('click', () => {
    if (isScope && onRequestScope) onRequestScope();
    else location.reload();
  });
}
