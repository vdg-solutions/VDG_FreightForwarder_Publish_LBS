// Actionable fallback banner for repo-init timeout (AC-03).
// Replaces #view-loading with i18n error text + Retry button.

import { t } from '../i18n/index.js';

const RETRY_BTN_ID     = 'repo-init-retry-btn';
const RETRY_BTN_TESTID = 'repo-init-retry';

export function renderRepoInitTimeoutBanner(mount, onRetry) {
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t('repo_init_timeout_title')}</div>
      <div class="text-sm text-slate-500">${t('repo_init_timeout_body')}</div>
      <button id="${RETRY_BTN_ID}" data-testid="${RETRY_BTN_TESTID}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t('repo_init_retry')}
      </button>
    </div>`;
  mount.querySelector(`#${RETRY_BTN_ID}`)?.addEventListener('click', () => onRetry());
}
