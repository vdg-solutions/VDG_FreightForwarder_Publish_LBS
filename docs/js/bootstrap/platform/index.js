// platform/index.js — the ONE JS object the Rust freight_app ports call (implementations/js_platform.rs).
// Raw passthrough: records over the wasm repo, prefs/events/log/clock over the browser, workspace
// over the bound storage-api, http over fetch. Groups add methods in their own file. Who is signed
// in is NOT here — that is session_principal, read on the Rust side, never asked of JS.
import { localStore } from '../../implementations/storage/core_abstractions/local-store.js';
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { authPlatform } from './auth.js';
import { cachePlatform } from './cache.js';
import { dataPlatform } from './data.js';
import { syncPlatform } from './sync.js';
import { managerPlatform } from './manager.js';
import { governancePlatform } from './governance.js';
import { flowsPlatform } from './flows.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';

const PREFS_NS = 'prefs';

export function createPlatform({ repo }) {
  const base = {
    records_get:      (kind, id)        => repo.get(kind, id),
    records_list:     (kind)            => repo.list(kind),
    records_put:      (kind, id, body)  => repo.put(kind, id, body),
    // CDB-DM-15: labels to stamp -- only meaningful on a brand-new record (EntityStoreOperator::
    // put's own rule); `WasmEntityRepo::put_labeled` (wasm_repo.rs) is the CREATE-time path.
    records_put_labeled: (kind, id, body, labels) => repo.put_labeled(kind, id, body, labels),
    // A reopened period invalidates the store module's own "fully cached" marker for it
    // (tick.rs::invalidate_period_cache) -- same-session only, see that fn's own doc comment.
    records_invalidate_period_cache: (kind, period) => repo.invalidate_period_cache(kind, period),
    records_delete:   (kind, id)        => repo.delete(kind, id),
    // meta lives in the same SQLite store the repo's io port uses (window.__vdg_io, set at boot)
    records_get_meta: (key)             => window.__vdg_io ? window.__vdg_io.cache_get_meta(key) : null,
    records_put_meta: (key, body)       => window.__vdg_io ? window.__vdg_io.cache_put_meta(key, body) : null,
    // H4-d: the two bespoke stores (month-partitioned, no `kind` records_list can route to) the
    // workspace backup export reaches directly — same repo object, dedicated dump methods
    // (store::bootstrap::wasm_repo_stores::fx_list_all/awb_list_all).
    records_fx_list_all: ()             => repo.fx_list_all(),
    records_awb_list_all: ()            => repo.awb_list_all(),
    prefs_get:  async (key)             => { const v = localStorage.getItem(`${PREFS_NS}:${key}`); return v == null ? null : JSON.parse(v); },
    prefs_set:  async (key, value)      => { localStorage.setItem(`${PREFS_NS}:${key}`, JSON.stringify(value)); },
    events_emit: async (name, detail)   => { window.dispatchEvent(new CustomEvent(name, { detail })); },
    log: (level, message)               => { (console[level] || console.log)(`[freight_app] ${message}`); },
    now_ms: ()                          => Date.now(),
    workspace_call: async (op, args)    => { const api = storageApi(); if (typeof api[op] !== 'function') throw new Error(`workspace_call: unknown op ${op}`); return api[op](...(Array.isArray(args) ? args : [args])); },
    http_json: async (method, url, body) => {
      // `Http` is a #[catch] wasm_bindgen extern: a rejected promise here is what becomes
      // Err(PlatformError) on the Rust side, so a transport failure/timeout must still reject —
      // never resolve as if there were a response.
      const { ok, value: res, error } = await safeAwait(
        fetch(url, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body) }),
        SAFE_AWAIT_DEFAULT_MS,
        undefined,
        `http_json:${method}:${url}`,
      );
      if (!ok) throw error;
      const text = await res.text();
      return { status: res.status, ok: res.ok, body: text ? JSON.parse(text) : null };
    },
    store: localStore,
  };
  return { ...base, ...authPlatform, ...cachePlatform, ...dataPlatform, ...syncPlatform, ...managerPlatform, ...governancePlatform, ...flowsPlatform };
}
