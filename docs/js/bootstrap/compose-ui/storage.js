// compose-ui/storage.js — binds the ui module's storage ports to the wasm repo objects.
// There are no JS repo classes any more: `awbRepo()` / `fxRateRepo()` are wasm exports carrying
// the same method names the ports forward, so this file only routes.
//
// Ordering: composeUi() runs after repo-init-steps.js has set window.__vdg_repo (build-repo-stack,
// step 3) — that is the only requirement here.

import { bindFxRateRepo } from '../../implementations/ui/core_abstractions/ports/storage/fx-rate-repo.js';
import { bindAwbRepo } from '../../implementations/ui/core_abstractions/ports/storage/awb-repo.js';

export function composeStorageUi() {
  const repo = window.__vdg_repo;
  if (!repo?.fxRateRepo) throw new Error('composeStorageUi: wasm repo not built yet');
  bindFxRateRepo(repo.fxRateRepo());
  bindAwbRepo(repo.awbRepo());
}
