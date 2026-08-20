// compose-ui/platform.js — binds the ui module's root-owned platform ports (wasm loading) to
// their root bootstrap implementations. Same shape as storage.js: no wasm export exists for
// these, the app talks to the root adapter itself.

import { bindWasmLoader } from '../../implementations/ui/core_abstractions/ports/wasm-loader.js';
import { loadWasm } from '../boot/wasm-loader.js';

export function composePlatformUi() {
  bindWasmLoader({ loadWasm });
}
