// store-worker.js — the SQLite engine worker. Loads the RUST engine (vdg_freight wasm) and relays
// postMessage ops to its store fns. This JS is ONLY the bootstrap + transport: import the wasm, init
// the sahpool VFS (worker-only), dispatch each op to Rust. Every query, the schema, and all storage
// logic live in Rust (store/implementations/sqlite/engine.rs + store.rs) — there is no SQL in JS.
//
// Protocol (from store-client.js): { id, op, kind, id, key, body } — op names map 1:1 to Rust store
// fns. Rust returns plain JS values (objects/arrays/null via the browser's JSON), relayed verbatim.

// Cache-busted at build time: 4f8a0729 is replaced by build_dist.ps1 with the git commit hash.
// Dynamic import bypasses SW stale cache — static import with ?v= query is not valid ESM.
const WASM_URL = new URL('../../../../../pkg/vdg_freight.js?v=4f8a0729', import.meta.url).href;

// #18: every message carries the account scope; the sahpool VFS + its OPFS directory are opened
// under it, so two accounts in one browser never share a database. No scope = no open.
// hasLockExclusivity is store-client.js's ONE fact about tab liveness (did Web Locks grant this
// tab sole leadership?) — Rust uses it to classify a stale self-lock vs a genuine second tab
// (sahpool_lock_policy.rs); this worker never guesses that itself.
let _ready = null;
let _mod   = null;
function ready(scope, hasLockExclusivity) {
  if (_ready) return _ready;
  if (!scope) return Promise.reject(new Error('sqlite: missing store scope — the database is per-account'));
  const useOpfs = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;
  _ready = (async () => {
    _mod = await import(WASM_URL);
    await _mod.default();
    const mode = await _mod.sqlite_init(scope, useOpfs, !!hasLockExclusivity);
    if (mode === 'memory-stale-self') {
      // Self-healed: a dead context's OPFS handles hadn't let go yet, but Web Locks proved no
      // LIVE tab holds them — degrade to :memory: for this session rather than surface anything.
      console.warn('[store-worker] sahpool stale-self, running on :memory: this session');
    }
  })().catch((e) => { _ready = null; _mod = null; throw e; });
  return _ready;
}

self.addEventListener('unhandledrejection', (event) => {
  console.error('[store-worker unhandledrejection]', event.reason);
  event.preventDefault();
  self.postMessage({ fatal: true, err: String(event.reason?.message ?? event.reason ?? 'wasm panic') });
});
self.addEventListener('error', (event) => {
  console.error('[store-worker error]', event.message);
  event.preventDefault();
  self.postMessage({ fatal: true, err: String(event.message ?? event.error ?? 'wasm error') });
});

function runOp(m) {
  const { store_get, store_list, store_put, store_delete,
          store_get_meta, store_put_meta, store_delete_meta,
          store_get_wma, store_put_wma,
          store_list_notifications, store_put_notification,
          store_count_entities } = _mod;
  switch (m.op) {
    case 'init':              return null;
    case 'get':               return store_get(m.kind, m.id);
    case 'list':              return store_list(m.kind);
    case 'put':               store_put(m.kind, m.id, m.body); return null;
    case 'delete':            store_delete(m.kind, m.id); return null;
    case 'getMeta':           return store_get_meta(m.key);
    case 'putMeta':           store_put_meta(m.key, m.body); return null;
    case 'deleteMeta':        store_delete_meta(m.key); return null;
    case 'getWma':            return store_get_wma(m.key);
    case 'putWma':            store_put_wma(m.key, m.body); return null;
    case 'listNotifications': return store_list_notifications();
    case 'putNotification':   store_put_notification(m.body); return null;
    case 'countEntities':     return store_count_entities();
    default: throw new Error('unknown sqlite op: ' + m.op);
  }
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  // pagehide lifecycle release (store-client.js): close the SQLite handle + pause the sahpool
  // VFS synchronously, right before this worker is torn down, so the NEXT document's install
  // doesn't have to wait on the browser's own worker-teardown GC for these handles to free up —
  // that unbounded wait (observed at 60s+) is what bricked an ordinary reload. No rid: the page
  // is unloading and nothing is waiting on a response.
  if (m.op === 'release') {
    try { _mod?.sqlite_release?.(); } catch (e) { console.error('[store-worker release]', e); }
    self.close();
    return;
  }
  // rid = request-correlation id (m.id is the entity id in the payload; never use it to correlate).
  try {
    await ready(m.scope, m.hasLockExclusivity);
    const result = runOp(m);
    self.postMessage({ rid: m.rid, ok: true, result });
  } catch (e) {
    console.error('[store-worker error]', e);
    self.postMessage({ rid: m.rid, ok: false, err: (e && e.message) ? e.message : String(e) });
  }
};
