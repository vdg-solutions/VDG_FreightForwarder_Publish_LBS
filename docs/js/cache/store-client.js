// store-client.js — MAIN-THREAD client for the SQLite/OPFS engine (replaces the IndexedDB stack).
//
// The engine + ALL storage logic run in Rust/wasm inside store-worker.js (a dedicated module
// Worker) because the OPFS SAH Pool VFS needs createSyncAccessHandle, which is worker-only. This
// module is a thin async client: spawn the worker, correlate requests by id over postMessage, bound
// each op so a dead worker rejects instead of hanging, and expose the store surface the Rust IO port
// (StoreIoPort) + on-demand UI consumers (window.__vdg_store) call. There is NO SQL here — every
// query lives in Rust (data_repo/sqlite_store.rs). The worker's single message loop serializes every
// statement → the IndexedDB concurrent-transaction wedge class is gone by construction.
//
// Drive stays the source of truth (JSONL bundles); SQLite is the local materialized cache + query
// engine. See backlog/wiki/sqlite-opfs-migration.md.

// First op pays the cold cost (module fetch + wasm compile + VFS install); give it room. Every later
// op is a local SQL call in Rust — milliseconds — so a short backstop is a dead-worker detector.
const INIT_TIMEOUT_MS = 20_000;
const OP_TIMEOUT_MS    = 5_000;

export class SqliteUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'SqliteUnavailableError'; }
}

let _worker   = null;
let _ready    = null;              // open handshake promise; null until first ensureReady()
let _seq      = 0;
const _pending = new Map();        // id -> { resolve, reject, timer }
let _injected  = null;             // test seam: a fake store (no worker) so unit tests run without OPFS

function ensureWorker() {
  if (_worker) return _worker;
  _worker = new Worker(new URL('./store-worker.js', import.meta.url), { type: 'module' });
  _worker.onmessage = (ev) => {
    // rid = request-correlation id, deliberately NOT `id`: an op's payload carries the entity `id`
    // (put/get/delete), so a bare `id` field would clobber the correlation key and every such op
    // would hang unmatched. rid namespaces the transport apart from the payload.
    const { rid, ok, result, err } = ev.data || {};
    const p = _pending.get(rid);
    if (!p) return;
    _pending.delete(rid);
    clearTimeout(p.timer);
    if (ok) p.resolve(result);
    else    p.reject(new SqliteUnavailableError(err || 'sqlite worker error'));
  };
  // A worker crash must fail every in-flight op and drop the handle so the next call respawns —
  // never leave a caller awaiting a promise the dead worker can no longer settle.
  _worker.onerror = (e) => {
    const dead = new SqliteUnavailableError('sqlite worker crashed: ' + (e?.message || 'unknown'));
    for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(dead); }
    _pending.clear();
    _worker = null;
    _ready  = null;
  };
  return _worker;
}

function send(op, extra, timeoutMs) {
  const w   = ensureWorker();
  const rid = ++_seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(rid);
      reject(new SqliteUnavailableError(op + ' timed out — sqlite worker unresponsive'));
    }, timeoutMs);
    _pending.set(rid, { resolve, reject, timer });
    // rid first, then op/extra: extra may carry an entity `id` — it must never overwrite `rid`.
    w.postMessage({ rid, op, ...extra });
  });
}

// One open handshake, shared by every caller. A failed open clears the memo so a later op retries.
function ensureReady() {
  ensureWorker();
  if (!_ready) _ready = send('init', {}, INIT_TIMEOUT_MS).catch((e) => { _ready = null; throw e; });
  return _ready;
}

async function op(name, extra) {
  await ensureReady();
  return send(name, extra, OP_TIMEOUT_MS);
}

// ── store surface — thin transport to the Rust worker; the Rust side owns all SQL + schema ────────
// Method names are the Rust IO-port contract (idb_*) + the on-demand consumer contract; identical to
// the old JS store's signatures so StoreIoPort and window.__vdg_store callers are untouched.
export const sqliteStore = {
  cache_get:  (kind, id)       => (_injected ? _injected.cache_get(kind, id)       : op('get',    { kind, id })),
  cache_list: (kind)           => (_injected ? _injected.cache_list(kind)          : op('list',   { kind })),
  cache_put:  (kind, id, body) => (_injected ? _injected.cache_put(kind, id, body) : op('put',    { kind, id, body })),
  cache_delete: (kind, id)     => (_injected ? _injected.cache_delete(kind, id)    : op('delete', { kind, id })),
  cache_get_meta: (key)        => (_injected ? _injected.cache_get_meta(key)       : op('getMeta',    { key })),
  cache_put_meta: (key, body)  => (_injected ? _injected.cache_put_meta(key, body) : op('putMeta',    { key, body })),
  cache_delete_meta: (key)     => (_injected ? _injected.cache_delete_meta(key)    : op('deleteMeta', { key })),
  cache_get_wma: (key)         => (_injected ? _injected.cache_get_wma(key)        : op('getWma',     { key })),
  cache_put_wma: (key, body)   => (_injected ? _injected.cache_put_wma(key, body)  : op('putWma',     { key, body })),
  cache_list_notifications: () => (_injected ? _injected.cache_list_notifications() : op('listNotifications', {})),
  cache_put_notification: (n)  => (_injected ? _injected.cache_put_notification(n) : op('putNotification', { body: n })),
};

// auth-gate cold-boot entity count (was sqlSelectValue('SELECT count(*) …')). Rust owns the query.
export function sqlCountEntities() {
  return _injected ? _injected.count_entities() : op('countEntities', {});
}

// Drop the worker + memo so the next call respawns (mirrors resetVdgDbMemo).
export function resetVdgSqliteMemo() {
  if (_worker) { try { _worker.terminate(); } catch { /* already gone */ } }
  _worker = null;
  _ready  = null;
  for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(new SqliteUnavailableError('sqlite reset')); }
  _pending.clear();
}

// Test seam: inject a synchronous fake store (no worker) so unit tests run without OPFS.
export function _setSqliteStore(fake) { _injected = fake; }
