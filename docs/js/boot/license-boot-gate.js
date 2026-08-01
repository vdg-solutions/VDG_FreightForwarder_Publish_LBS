// license-boot-gate.js — boot-layer wiring between the pure resolver (license-boot-flow.js)
// and the single outcome screen (license-gate-screen.js). Keeps repo-init-steps.js under the
// 350-line cap.

import { resolveLicenseState, LICENSE_STATE_VALID } from '../operators/license-boot-flow.js';
import { bootstrapAclTargetFolders } from '../operators/manager/workspace-bootstrap.js';
import {
  renderLicenseGateScreen, licenseGateReasonForState,
} from '../views/license/license-gate-screen.js';

export const DRIVE_ROOT_PARENT_ID = 'root';

// workspace name comes ONLY from the build-injected const — never derived from a licence.
export async function ensureWorkspaceRoot(driveApi, workspaceName) {
  const existing = await driveApi.findWorkspaceRoot(workspaceName);
  if (existing) return { rootId: existing, created: false };
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
// state. Enforcement and the screen are identical for every role — no isManager() branch here.
export async function runLicenseGate({ gate, container }) {
  const state = await resolveLicenseState({ gate });
  if (state.kind === LICENSE_STATE_VALID) return { proceed: true, payload: state.payload };

  renderLicenseGateScreen(container, {
    reason: licenseGateReasonForState(state),
    errorKind: state.error_kind ?? null,
  });
  return { proceed: false };
}
