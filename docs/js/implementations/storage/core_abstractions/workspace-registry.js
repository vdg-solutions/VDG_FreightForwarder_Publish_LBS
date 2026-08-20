// F-17-03 — one-deploy-one-company model (spec 2026-07-09): the active workspace name is the
// build-injected WORKSPACE_NAME, not a registry lookup — see activeWorkspaceName() below.
// WorkspaceRegistry (DI storage, default localStorage) survives as the F-17-05 seam for
// multi-workspace IndexedDB namespacing; it touches the platform default so it lives in
// implementations/local/workspace-registry.js — nothing in the live app instantiates it yet.

import { WORKSPACE_NAME } from './workspace-config.js';

export const LS_WORKSPACES_KEY        = 'vdg.workspaces';
export const LS_CURRENT_WORKSPACE_KEY = 'vdg.current_workspace'; // value = workspace_id

// Module-level convenience: what every findWorkspaceRoot(name) caller passes.
// One deployment = one company (build-injected), so this is no longer a registry lookup.
export function activeWorkspaceName() {
  return WORKSPACE_NAME;
}
