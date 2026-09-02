// compose-ui/data-guard.js — binds the merge-resolution port to its wasm use-cases.
//
// Separate from data.js on purpose: that file is owned by the three migration lanes this session,
// and a fourth hand in it is a merge conflict, not a composition. Wire it from compose-ui/index.js
// beside composeData at final merge — `bindGuardData({ wasm })`.
//
// The replies cross unchanged: `{ ok, error, record }`. A refusal is an ANSWER (the collection was
// not one a merge resolution may rewrite, the row is gone, the period is locked), so it is returned
// for the dialog to render, never thrown and never swallowed.
import { bindMergeResolve } from '../../implementations/ui/core_abstractions/ports/data/merge-resolve.js';

export function bindGuardData(deps) {
  const wasm = deps?.wasm ?? deps;
  bindMergeResolve({
    reapplyMyValues: async (req) => await wasm.data_reapply_my_values(req),
    resolveConflict: async (req) => await wasm.data_resolve_conflict(req),
  });
}
