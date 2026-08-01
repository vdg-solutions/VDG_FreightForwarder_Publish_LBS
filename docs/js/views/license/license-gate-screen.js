// license-gate-screen.js — the single licence gate outcome screen (F-17-03). A bundled licence
// is either present-and-valid for the whole deploy or it isn't — there is no per-role UI left,
// no upload/paste control, no textarea. Reload is the only action for every failure mode.

import { t } from '../../i18n/index.js';
import { errorKindMessage } from '../../operators/license-messages.js';
import {
  LICENSE_STATE_MISSING, LICENSE_STATE_INVALID, LICENSE_STATE_NETWORK,
} from '../../operators/license-boot-flow.js';

export const LICENSE_GATE_REASON_MISSING = 'missing'; // AC-02
export const LICENSE_GATE_REASON_INVALID = 'invalid'; // AC-03/04/05 — body keyed by error_kind
export const LICENSE_GATE_REASON_NETWORK = 'network'; // AC-07

const RELOAD_BTN_ID = 'license-gate-reload';

// Maps a resolveLicenseState() result to the reason this screen renders.
export function licenseGateReasonForState(state) {
  if (state.kind === LICENSE_STATE_NETWORK) return LICENSE_GATE_REASON_NETWORK;
  if (state.kind === LICENSE_STATE_INVALID) return LICENSE_GATE_REASON_INVALID;
  return LICENSE_GATE_REASON_MISSING; // LICENSE_STATE_MISSING and any other non-valid kind
}

function _title(reason) {
  switch (reason) {
    case LICENSE_GATE_REASON_INVALID: return t('license.gate.invalid_title');
    case LICENSE_GATE_REASON_NETWORK: return t('license.gate.network_title');
    default:                          return t('license.gate.missing_title');
  }
}

// AC-04/05: Expired and WorkspaceMismatch are not special-cased — same _INVALID path as every
// other error_kind, the distinct wording comes from license-messages.js alone.
function _body(reason, errorKind) {
  switch (reason) {
    case LICENSE_GATE_REASON_INVALID: return errorKindMessage(errorKind);
    case LICENSE_GATE_REASON_NETWORK: return t('license.gate.network_body');
    default:                          return t('license.gate.missing_body');
  }
}

// AC-02/03/04/05/07: one render fn, no role branch, no textarea/upload — reload is the only
// action. No isManager() check anywhere in this module or its caller (license-boot-gate.js).
export function renderLicenseGateScreen(container, { reason, errorKind = null } = {}) {
  if (!container) return;
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${_title(reason)}</div>
      <div class="text-sm text-slate-500 max-w-md">${_body(reason, errorKind)}</div>
      <button id="${RELOAD_BTN_ID}"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t('license.gate.retry_button')}
      </button>
    </div>`;
  container.querySelector(`#${RELOAD_BTN_ID}`)?.addEventListener('click', () => location.reload());
}
