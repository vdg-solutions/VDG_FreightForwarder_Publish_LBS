// drive-access-gate-screen.js — Drive-permission gate screens. Mirrors
// license-gate-screen.js: reason-branched, one action button, no textarea/mailto (AC-09).

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

export const DRIVE_ACCESS_REASON_SCOPE      = 'scope';      // AC-03/05
export const DRIVE_ACCESS_REASON_PERMISSION = 'permission'; // AC-06
export const DRIVE_ACCESS_REASON_TRANSIENT  = 'transient';  // F-24-19: Drive unreachable / 5xx / quota
export const DRIVE_ACCESS_REASON_SESSION    = 'session';    // 401: the token died, the network is fine

const GRANT_BTN_ID            = 'drive-access-grant-btn';
const PERMISSION_RETRY_BTN_ID = 'drive-access-permission-retry';
const TRANSIENT_RETRY_BTN_ID  = 'drive-access-transient-retry';
const SESSION_RECONNECT_BTN_ID = 'drive-access-session-reconnect';
const DECLINED_HINT_ID        = 'drive-access-declined-hint';

const TITLE_KEY = {
  [DRIVE_ACCESS_REASON_SCOPE]:      'drive_access.scope.title',
  [DRIVE_ACCESS_REASON_PERMISSION]: 'drive_access.permission.title',
  [DRIVE_ACCESS_REASON_TRANSIENT]:  'drive_access.transient.title',
  [DRIVE_ACCESS_REASON_SESSION]:    'drive_access.session.title',
};
const BODY_KEY = {
  [DRIVE_ACCESS_REASON_SCOPE]:      'drive_access.scope.body',
  [DRIVE_ACCESS_REASON_PERMISSION]: 'drive_access.permission.body',
  [DRIVE_ACCESS_REASON_TRANSIENT]:  'drive_access.transient.body',
  [DRIVE_ACCESS_REASON_SESSION]:    'drive_access.session.body',
};
const BTN_ID = {
  [DRIVE_ACCESS_REASON_SCOPE]:      GRANT_BTN_ID,
  [DRIVE_ACCESS_REASON_PERMISSION]: PERMISSION_RETRY_BTN_ID,
  [DRIVE_ACCESS_REASON_TRANSIENT]:  TRANSIENT_RETRY_BTN_ID,
  [DRIVE_ACCESS_REASON_SESSION]:    SESSION_RECONNECT_BTN_ID,
};
// A reason whose button does something other than reload names its own label.
const BTN_LABEL_KEY = {
  [DRIVE_ACCESS_REASON_SCOPE]:   'drive_access.scope.button',
  [DRIVE_ACCESS_REASON_SESSION]: 'drive_access.session.button',
};
// The line shown when the action was taken and did not work — a click that changes nothing on
// screen reads as a dead button.
const RETRY_HINT_KEY = {
  [DRIVE_ACCESS_REASON_SCOPE]:   'drive_access.scope.declined_again',
  [DRIVE_ACCESS_REASON_SESSION]: 'drive_access.session.retry_failed',
};

// reason: DRIVE_ACCESS_REASON_SCOPE | _PERMISSION | _TRANSIENT | _SESSION.
// actionFailed: the button was clicked and the thing it promised did not happen (scope declined
// again, reconnect refused) — adds an inline hint line, never a silent no-op (AC-09).
// onAction: click handler for the reasons that have a real remedy (re-consent, reconnect).
// Omitted → the button falls back to location.reload(), which only makes sense for a failure a
// fresh boot can genuinely retry.
export function renderDriveAccessGateScreen(container, { reason, actionFailed = false, onAction } = {}) {
  if (!container) return;
  const btnId    = BTN_ID[reason] || PERMISSION_RETRY_BTN_ID;
  const labelKey = BTN_LABEL_KEY[reason];
  const btnLabel = labelKey ? t(labelKey) : t('license.gate.retry_button');
  const hintKey  = actionFailed ? RETRY_HINT_KEY[reason] : null;

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t(TITLE_KEY[reason])}</div>
      <div class="text-sm text-slate-500 max-w-md">${t(BODY_KEY[reason])}</div>
      ${hintKey
        ? `<div id="${DECLINED_HINT_ID}" data-testid="${DECLINED_HINT_ID}" class="text-sm text-amber-600 max-w-md">${t(hintKey)}</div>`
        : ''}
      <button id="${btnId}" data-testid="${btnId}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${btnLabel}
      </button>
    </div>`;

  container.querySelector(`#${btnId}`)?.addEventListener('click', () => {
    if (onAction) onAction();
    else location.reload();
  });
}
