// license-boot-gate.js — boot-layer wiring between the pure resolver (license-boot-flow.js)
// and the single outcome screen (license-gate-screen.js). Keeps repo-init-steps.js under the
// 350-line cap.

import {
  resolveLicenseState, LICENSE_STATE_VALID, LICENSE_STATE_GRACE,
} from '../operators/license-boot-flow.js';
import { t } from '../i18n/index.js';
import { bootstrapAclTargetFolders } from '../operators/manager/workspace-bootstrap.js';
import {
  renderLicenseGateScreen, licenseGateReasonForState,
} from '../views/license/license-gate-screen.js';
import { recallGrantAreas } from '../auth/grant-file.js';
import { readCachedIdentityRaw } from '../auth/role-cache.js';

const ROLE_NOT_PROVISIONED = 'NOT_PROVISIONED';

export const DRIVE_ROOT_PARENT_ID = 'root';

// A company has exactly ONE workspace. A second one is not a variant to tolerate — it is a
// defect: the data splits in two, half the company writes into a folder nobody else can read,
// and no reconciliation puts it back. So creation is guarded, not merely avoided.
//
// The way it happened: `findWorkspaceRoot` answers null both for "no workspace exists" and for
// "you cannot see the one that does" — an employee holds no permission on the root, and Drive
// answers a query it cannot authorize with an empty list rather than an error. That null used to
// mean "create", and a duplicate "LBS" folder appeared in the employee's own Drive.
export class SecondWorkspaceForbiddenError extends Error {
  constructor(evidence) {
    super(`Refusing to create a second workspace — this account is already provisioned (${evidence})`);
    this.name     = 'SecondWorkspaceForbiddenError';
    this.evidence = evidence;
  }
}

// Membership evidence held locally. Either one proves a workspace EXISTS and this account is
// already in it, which makes an invisible root a visibility problem, never a missing workspace.
// Same verdict as a predicate, for the UI: a screen must not even OFFER to create a workspace
// to an account that is already in one.
export function isAlreadyProvisionedLocally() { return _existingMembershipEvidence() !== null; }

function _existingMembershipEvidence() {
  if (recallGrantAreas().length > 0) return 'grant manifest names granted folders';
  const cached = readCachedIdentityRaw();
  if (cached?.role && cached.role !== ROLE_NOT_PROVISIONED) return `cached role ${cached.role}`;
  return null;
}

// workspace name comes ONLY from the build-injected const — never derived from a licence.
export async function ensureWorkspaceRoot(driveApi, workspaceName) {
  const existing = await driveApi.findWorkspaceRoot(workspaceName);
  if (existing) return { rootId: existing, created: false };
  const evidence = _existingMembershipEvidence();
  if (evidence) throw new SecondWorkspaceForbiddenError(evidence);
  const root = await driveApi.getOrCreateFolder(DRIVE_ROOT_PARENT_ID, workspaceName, { scoped: false });
  return { rootId: root.id, created: true };
}

// NOT_PROVISIONED first run: create the workspace root + ACL target folders (admin/ makes the
// creator recognised MANAGER on reload). A bundled licence has no per-role provisioning screen
// left to show — the caller reloads into the ordinary licence gate once this resolves (F-17-03).
export async function runFirstRunProvision(driveApi, workspaceName) {
  const { rootId } = await ensureWorkspaceRoot(driveApi, workspaceName);
  await bootstrapAclTargetFolders(driveApi, rootId);
  return { rootId };
}

// AC-01..07: resolve licence state once, render the single outcome screen on any non-valid
// state. Enforcement and the screen are identical for every role — no hasRole(ROLE_MANAGER) branch here.
//
// F-20-11: grace boots the app READ-ONLY. The verdict is stamped on window.__vdg_license_status —
// the write-gate (data/write-gate.js) reads can_write from there, so the read-only claim has
// teeth instead of being a banner nobody enforces.
export async function runLicenseGate({ gate, container }) {
  const state = await resolveLicenseState({ gate });

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
