// server-access-gate-screen.js — Server-permission gate screens.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';

export const SERVER_ACCESS_REASON_TRANSIENT  = 'transient';  // Server unreachable / 5xx
export const SERVER_ACCESS_REASON_SESSION    = 'session';    // 401: the token died, the network is fine

const TRANSIENT_RETRY_BTN_ID  = 'server-access-transient-retry';
const SESSION_RECONNECT_BTN_ID = 'server-access-session-reconnect';
const DECLINED_HINT_ID        = 'server-access-declined-hint';

const TITLE_KEY = {
  [SERVER_ACCESS_REASON_TRANSIENT]:  'server_access.transient.title',
  [SERVER_ACCESS_REASON_SESSION]:    'server_access.session.title',
};
const BODY_KEY = {
  [SERVER_ACCESS_REASON_TRANSIENT]:  'server_access.transient.body',
  [SERVER_ACCESS_REASON_SESSION]:    'server_access.session.body',
};
const BTN_ID = {
  [SERVER_ACCESS_REASON_TRANSIENT]:  TRANSIENT_RETRY_BTN_ID,
  [SERVER_ACCESS_REASON_SESSION]:    SESSION_RECONNECT_BTN_ID,
};
const BTN_LABEL_KEY = {
  [SERVER_ACCESS_REASON_SESSION]: 'server_access.session.button',
};
const RETRY_HINT_KEY = {
  [SERVER_ACCESS_REASON_SESSION]: 'server_access.session.retry_failed',
};

export function renderServerAccessGateScreen(container, { reason, actionFailed = false, onAction } = {}) {
  if (!container) return;
  const btnId    = BTN_ID[reason] || TRANSIENT_RETRY_BTN_ID;
  const labelKey = BTN_LABEL_KEY[reason];
  const btnLabel = labelKey ? t(labelKey) : t('license.gate.retry_button');
  const hintKey  = actionFailed ? RETRY_HINT_KEY[reason] : null;

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${TITLE_KEY[reason] ? t(TITLE_KEY[reason]) : 'Lỗi'}</div>
      <div class="text-sm text-slate-500 max-w-md">${BODY_KEY[reason] ? t(BODY_KEY[reason]) : 'Đã có lỗi xảy ra.'}</div>
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
