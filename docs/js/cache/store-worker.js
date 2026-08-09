// store-worker.js — the SQLite engine worker. Loads the RUST engine (vdg_freight wasm) and relays
// postMessage ops to its store fns. This JS is ONLY the bootstrap + transport: import the wasm, init
// the sahpool VFS (worker-only), dispatch each op to Rust. Every query, the schema, and all storage
// logic live in Rust (data_repo/sqlite_engine.rs + sqlite_store.rs) — there is no SQL in JS.
//
// Protocol (from store-client.js): { id, op, kind, id, key, body } — op names map 1:1 to Rust store
// fns. Rust returns plain JS values (objects/arrays/null via the browser's JSON), relayed verbatim.

import init, {
  sqlite_init,
  store_get, store_list, store_put, store_delete,
  store_get_meta, store_put_meta, store_delete_meta,
  store_get_wma, store_put_wma,
  store_list_notifications, store_put_notification,
  store_count_entities,
} from '../../pkg/vdg_freight.js';

// #18: every message carries the account scope; the sahpool VFS + its OPFS directory are opened
// under it, so two accounts in one browser never share a database. No scope = no open.
let _ready = null;
function ready(scope) {
  if (_ready) return _ready;
  if (!scope) return Promise.reject(new Error('sqlite: missing store scope — the database is per-account'));
  _ready = (async () => { await init(); await sqlite_init(scope); })().catch((e) => { _ready = null; throw e; });
  return _ready;
}

function runOp(m) {
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
  // rid = request-correlation id (m.id is the entity id in the payload; never use it to correlate).
  try {
    await ready(m.scope);
    const result = runOp(m);
    self.postMessage({ rid: m.rid, ok: true, result });
  } catch (e) {
    self.postMessage({ rid: m.rid, ok: false, err: (e && e.message) ? e.message : String(e) });
  }
};
