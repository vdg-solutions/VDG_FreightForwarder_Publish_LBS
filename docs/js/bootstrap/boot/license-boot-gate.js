// license-boot-gate.js — boot-layer wiring between the pure resolver (license-boot-flow.js)
// and the single outcome screen (license-gate-screen.js). Keeps repo-init-steps.js under the
// 350-line cap.

import {
  resolveLicenseState, LICENSE_STATE_VALID, LICENSE_STATE_GRACE,
} from '../../implementations/ui/core_abstractions/ports/flows/license.js';
import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import {
  renderLicenseGateScreen, licenseGateReasonForState,
} from '../../implementations/ui/bootstrap/views/license/license-gate-screen.js';

// AC-01..07: resolve licence state once, render the single outcome screen on any non-valid
// state. Enforcement and the screen are identical for every role — no per-role branch here.
//
// F-20-11: grace boots the app READ-ONLY. The verdict is stamped on window.__vdg_license_status —
// the write-gate (data/write-gate.js) reads can_write from there, so the read-only claim has
// teeth instead of being a banner nobody enforces.
export async function runLicenseGate({ container }) {
  const state = await resolveLicenseState();

  if (state.kind === LICENSE_STATE_VALID || state.kind === LICENSE_STATE_GRACE) {
    window.__vdg_license_status = state.status
      ?? { state: 'active', can_write: true, grace_days_left: 0 };
    if (state.kind === LICENSE_STATE_GRACE) {
      window.dispatchEvent(new CustomEvent('vdg:toast', {
        detail: { kind: 'warn', message: t('license.grace.toast', { d: state.status?.grace_days_left ?? 0 }) },
      }));
    }
    return { proceed: true, payload: state.payload };
  }

  renderLicenseGateScreen(container, {
    reason: licenseGateReasonForState(state),
    errorKind: state.error_kind ?? null,
    daysPastExp: state.status?.days_past_exp ?? null,
  });
  return { proceed: false };
}
