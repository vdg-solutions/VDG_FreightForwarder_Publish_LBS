// F-17-03 — one-deploy-one-company model (spec 2026-07-09): the active workspace name is the
// build-injected WORKSPACE_NAME, not a registry lookup — see activeWorkspaceName() below.
// WorkspaceRegistry (DI storage, default localStorage) survives as the F-17-05 seam for
// multi-workspace IndexedDB namespacing; it touches the platform default so it lives in
// implementations/local/workspace-registry.js — nothing in the live app instantiates it yet.

import { WORKSPACE_NAME } from './workspace-config.js';

export const LS_WORKSPACES_KEY        = 'vdg.workspaces';
export const LS_CURRENT_WORKSPACE_KEY = 'vdg.current_workspace'; // value = workspace_id

// Module-level convenience: the workspace name every caller (auth, flows, governance, the
// staff-table repo, the settings views) needs — a build-injected constant, not a Drive lookup.
// One deployment = one company, so this is no longer a registry lookup either.
export function activeWorkspaceName() {
  return WORKSPACE_NAME;
}
