// platform/index.js — the ONE JS object the Rust freight_app ports call (implementations/js_platform.rs).
// Raw passthrough: records over the wasm repo, prefs/events/log/clock over the browser. Groups add
// methods in their own file. Who is signed in is NOT here — that is session_principal, read on the
// Rust side, never asked of JS.
import { localStore } from '../../implementations/storage/core_abstractions/local-store.js';
import { authPlatform } from './auth.js';
import { cachePlatform } from './cache.js';
import { dataPlatform } from './data.js';
import { syncPlatform } from './sync.js';
import { managerPlatform } from './manager.js';
import { governancePlatform } from './governance.js';
import { flowsPlatform } from './flows.js';

const PREFS_NS = 'prefs';

export function createPlatform({ repo }) {
  const base = {
    records_get:      (kind, id)        => repo.get(kind, id),
    records_list:     (kind)            => repo.list(kind),
    records_put:      (kind, id, body)  => repo.put(kind, id, body),
    // CDB-DM-04: whose row it is, when that is not the person typing. Carried, never decided
    // here -- the shell hands the value across, wasm chose it.
    records_put_owned: (kind, id, body, owner) => repo.put_owned(kind, id, body, owner),
    // CDB-DM-15: labels to stamp -- only meaningful on a brand-new record (EntityStoreOperator::
    // put's own rule); `WasmEntityRepo::put_labeled` (wasm_repo.rs) is the CREATE-time path.
    records_put_labeled: (kind, id, body, labels) => repo.put_labeled(kind, id, body, labels),
    // A reopened period invalidates the store module's own "fully cached" marker for it
    // (tick.rs::invalidate_period_cache) -- same-session only, see that fn's own doc comment.
    records_invalidate_period_cache: (kind, period) => repo.invalidate_period_cache(kind, period),
    records_delete:   (kind, id)        => repo.delete(kind, id),
    // meta lives in the same SQLite store the repo's io port uses (window.__vdg_io, set at boot)
    // B-24-04-01: these two answered `null` while `__vdg_io` was still being installed, and the
    // wasm side calls `.then` on whatever comes back -- so the first render of every view after a
    // page load threw "then on undefined", once per view, on every session.
    //
    // A rejected promise, not `Promise.resolve(null)`: the port returns a Result and the callers
    // already decide what an absent value means (license.rs does `.unwrap_or(Value::Null)`).
    // Answering "empty" from here would move that decision into the bridge and turn "the IO layer
    // is not up yet" into "there is no such setting", which is the false zero this project keeps
    // paying for.
    records_get_meta: (key)             => (window.__vdg_io
      ? window.__vdg_io.cache_get_meta(key)
      : Promise.reject(new Error(`io not ready: cache_get_meta(${key})`))),
    records_put_meta: (key, body)       => (window.__vdg_io
      ? window.__vdg_io.cache_put_meta(key, body)
      : Promise.reject(new Error(`io not ready: cache_put_meta(${key})`))),
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
    store: localStore,
  };
  return { ...base, ...authPlatform, ...cachePlatform, ...dataPlatform, ...syncPlatform, ...managerPlatform, ...governancePlatform, ...flowsPlatform };
}
