// wasm-boot-loader.js — the app.js critical-path WASM load, extracted so app.js stays under the
// 350-line cap (same habit as view-fallback.js beside view-loader.js, sw-update-guard.js beside
// sw-register.js). Distinct from boot/wasm-loader.js's loadWasm(): that one is a fire-and-forget
// helper for call sites that degrade gracefully on failure (returns null); this one sits on
// main()'s boot-gating critical path in app.js and must propagate failure so main() can react.

import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';
import { healOrReloadViaServiceWorker } from '../../implementations/ui/bootstrap/util/view-fallback.js';

export async function loadWasmModule() {
  if (window.__vdg_wasm) return window.__vdg_wasm;
  try {
    const mod = await import(new URL('pkg/vdg_freight.js?v=4cc1935', document.baseURI).href);
    const wasmUrl = new URL('pkg/vdg_freight_bg.wasm?v=4cc1935', document.baseURI).href;
    await mod.default({ module_or_path: wasmUrl });
    window.__vdg_wasm = mod;
    return mod;
  } catch (err) {
    // WebAssembly.LinkError — not the bare, un-namespaced `LinkError` this branch checked
    // before, which threw ReferenceError on ANY rejection and skipped this whole recovery path.
    if (err instanceof WebAssembly.LinkError || err?.name === 'LinkError' || String(err).includes('LinkError')) {
      console.warn('[VDG] WebAssembly LinkError detected (stale cache mismatch). Purging caches and reloading...');
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (!sessionStorage.getItem('__wasm_link_reloaded')) {
        sessionStorage.setItem('__wasm_link_reloaded', '1');
        location.reload();
        return new Promise(() => {});
      }
    }
    throw err;
  }
}

// Anything reaching main()'s catch that isn't one of the named boot errors it already handles
// (RoleProbeTimeoutError, RepoInitTimeoutError, IdbOpenFailedError, a classified ServerGate
// error) used to hit a bare `throw err` with nothing attached to main() — a genuine unhandled
// promise rejection, and the user was left on index.html's frozen "Loading view…" placeholder
// with no recovery. A 503 on pkg/vdg_freight.js during a deploy-propagation window rejects
// exactly this way. main() routes here instead of re-throwing.
export function handleUnrecognizedBootError(err, mount) {
  console.error('[VDG] boot failed, unrecognized error:', err); // DEV
  if (!mount) return;
  mount.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div class="text-xl font-semibold text-slate-700">${t('view_mount_failed_title')}</div>
      <div class="text-sm text-slate-500">${t('view_mount_failed_network')}</div>
      <button id="boot-error-reload-btn" data-testid="boot-error-reload"
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        ${t('view_mount_reload')}
      </button>
    </div>`;
  mount.querySelector('#boot-error-reload-btn')?.addEventListener('click', () => healOrReloadViaServiceWorker());
}
