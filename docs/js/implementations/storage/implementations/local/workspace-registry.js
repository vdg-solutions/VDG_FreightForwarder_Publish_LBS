// workspace-registry.js — F-17-05 seam: localStorage-backed multi-workspace registry. Nothing in
// the live app instantiates this yet — one-deploy-one-company reads WORKSPACE_NAME directly (see
// core_abstractions/workspace-registry.js::activeWorkspaceName); kept for the future namespacing
// seam, storage/list/add surface unchanged.

import { LS_WORKSPACES_KEY, LS_CURRENT_WORKSPACE_KEY } from '../../core_abstractions/workspace-registry.js';

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
