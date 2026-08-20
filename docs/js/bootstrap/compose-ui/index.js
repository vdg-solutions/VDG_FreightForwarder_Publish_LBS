// compose-ui/index.js — the root composes the ui module: every ui port is bound to a wasm
// freight_app export (or a platform adapter) here, after the wasm module is ready.
import { composeAuth } from './auth.js';
import { composeCache } from './cache.js';
import { composeData } from './data.js';
import { composeSync } from './sync.js';
import { composeManager } from './manager.js';
import { composeGovernance } from './governance.js';
import { composeFlows } from './flows.js';
import { composeStorageUi } from './storage.js';
import { composePlatformUi } from './platform.js';

export function composeUi(wasm) {
  composeAuth(wasm);
  composeCache(wasm);
  composeData(wasm);
  composeSync(wasm);
  composeManager(wasm);
  composeGovernance(wasm);
  composeFlows(wasm);
  composeStorageUi();
  composePlatformUi();
}
