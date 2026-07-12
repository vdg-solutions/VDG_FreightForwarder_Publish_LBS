// F-17-03 — DI storage (default localStorage). One-deploy-one-company model (spec 2026-07-09):
// the active workspace name is the build-injected WORKSPACE_NAME, not a registry lookup — see
// activeWorkspaceName() below. WorkspaceRegistry itself survives as the F-17-05 seam for
// multi-workspace IndexedDB namespacing; its storage/list/add surface is otherwise unchanged.

import { WORKSPACE_NAME } from '../auth/workspace-root.js';

export const LS_WORKSPACES_KEY        = 'vdg.workspaces';
export const LS_CURRENT_WORKSPACE_KEY = 'vdg.current_workspace'; // value = workspace_id

export class WorkspaceRegistry {
  constructor(storage = globalThis.localStorage) {
    this._storage = storage;
  }

  list() {
    try {
      const raw = this._storage.getItem(LS_WORKSPACES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; } // corrupt entry — treat as empty, never throw on read
  }

  currentId() {
    // storage can be legitimately absent/inaccessible (private-mode browsers, non-DOM
    // test runners) — activeWorkspaceName() is called from ~15 read sites and must
    // resolve to "not registered" rather than throw and break an unrelated flow.
    try { return this._storage.getItem(LS_CURRENT_WORKSPACE_KEY) || null; }
    catch { return null; }
  }

  currentName() {
    const id = this.currentId();
    if (!id) return null;
    const entry = this.list().find((w) => w.workspace_id === id);
    return entry?.name ?? null;
  }

  // AC-05: append if new, dedupe by workspace_id, always set current_workspace
  add({ workspace_id, name }) {
    const workspaces = this.list();
    const idx = workspaces.findIndex((w) => w.workspace_id === workspace_id);
    if (idx === -1) workspaces.push({ workspace_id, name });
    else workspaces[idx] = { workspace_id, name };
    this._storage.setItem(LS_WORKSPACES_KEY, JSON.stringify(workspaces));
    this._storage.setItem(LS_CURRENT_WORKSPACE_KEY, workspace_id);
  }
}

// Module-level convenience: what every findWorkspaceRoot(name) caller passes.
// One deployment = one company (build-injected), so this is no longer a registry lookup.
export function activeWorkspaceName() {
  return WORKSPACE_NAME;
}
