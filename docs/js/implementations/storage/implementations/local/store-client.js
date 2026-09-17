// store-client.js — MAIN-THREAD client for the SQLite/OPFS engine (replaces the IndexedDB stack).
//
// The engine + ALL storage logic run in Rust/wasm inside store-worker.js (a dedicated module
// Worker) because the OPFS SAH Pool VFS needs createSyncAccessHandle, which is worker-only — and
// those handles are EXCLUSIVE per context: with one engine per tab, only the FIRST tab gets the
// database; every later tab dies at install (NoModificationAllowedError — 2-tab CDP repro) and
// looks like a blank machine (login screen again, views timing out, "đang đồng bộ" forever).
// (SharedWorker routing is not an option — Chromium's SharedWorkerGlobalScope has no nested
// Worker, CDP-proven "Worker is not defined".)
//
// Tabs used to SHARE one engine by leader election: the tab holding a 'vdg-sqlite-leader' Web
// Lock spawned the engine worker and every other tab relayed its ops to it over a
// BroadcastChannel. That arrangement is gone (2026-09-17). The owner's rule is that the app may be
// open in exactly ONE tab, so there is no follower to relay for — and the election could never
// have enforced it anyway: it was per-account-scope and claimed lazily on the first store op, long
// after a second tab had already rendered an app it could not save from. Ownership is decided once
// at boot now, before anything here is reachable (tab-ownership.js takes the lock, auth_gate.rs
// decides on it), so this document owns the engine by the time any op arrives.
//
// This module stays a thin async client: correlate requests by rid, bound each op so a dead engine
// rejects instead of hanging, and expose the store surface the Rust IO port (StoreIoPort) +
// window.__vdg_store consumers call. There is NO SQL here — every query lives in Rust
// (store/implementations/sqlite/store.rs). The worker's single message loop serializes every
// statement → the IndexedDB concurrent-transaction wedge class is gone by construction.
//
// CharterDB (vdg-server) stays the source of truth; SQLite is the local materialized cache + query
// engine. See backlog/wiki/archives/sqlite-opfs-migration.md (archived), client-server-pivot.md.

// First op pays the cold cost (module fetch + wasm compile + VFS install); give it room. Every later
// op is a local SQL call in Rust — milliseconds — so a short backstop is a dead-worker detector.

import { storeScopeKey } from './store-scope.js';
import { holdsTabOwnership } from './tab-ownership.js';

// Exported because the boot canary has to bound the SAME op and must not re-type this number. It
// wrapped the first store op in 8s while this budgeted 20s for it, so the 20s was unreachable and
// a cold open that was merely downloading got reported as an unresponsive store (the upgrade
// path's "Dữ liệu trên máy phản hồi quá chậm" modal — repo-init-steps.js).
export const INIT_TIMEOUT_MS = 20_000;
const OP_TIMEOUT_MS    = 5_000;

export class SqliteUnavailableError extends Error {
  constructor(msg) { super(msg); this.name = 'SqliteUnavailableError'; }
}

// OPFS sahpool handles are exclusive per context. sahpool-genuine-conflict is Rust's own
// classification (sahpool_lock_policy.rs): the retry budget was exhausted with NO Web Locks
// exclusivity guarantee, so a live second tab is a real possibility — the only case this message
// is honest. A raw NoModificationAllowedError is kept as a belt-and-suspenders match for whatever
// slips past Rust unclassified (a browser DOMException surfacing untranslated).
const LOCKED_ERR_RE = /sahpool-genuine-conflict|NoModificationAllowedError/i;
let _lockedAnnounced = false;
function _announceLockedIf(errMsg) {
  if (_lockedAnnounced || !errMsg || !LOCKED_ERR_RE.test(String(errMsg))) return;
  _lockedAnnounced = true;
  window.dispatchEvent(new CustomEvent('vdg:store-locked', { detail: { kind: 'genuine-conflict', reason: String(errMsg) } }));
}

// #18: the database is per-account. It used to be origin-wide, so two accounts open in one
// browser shared ONE engine over ONE database — account B read account A's cached rows. The
// single-tab rule makes two accounts open at once impossible in the first place, but the scope
// stays: it is what keeps one browser's two accounts in two databases across a sign-out.
let _scope = null;


// Called as soon as an identity is established, before any store op. First call wins; a genuine
// account switch happens only across a reload (signOut reloads), so a differing key mid-life is a
// wiring bug and must fail loudly rather than serve another account's data.
function setStoreScope(email) {
  const key = storeScopeKey(email);
  if (!key) throw new SqliteUnavailableError('store scope requires a signed-in account');
  if (_scope && _scope !== key) {
    throw new SqliteUnavailableError(`store scope changed (${_scope} → ${key}) — reload required`);
  }
  _scope = key;
}

let _engine   = null;              // this document's engine worker
let _ready    = null;              // open handshake promise; null until first ensureReady()
let _seq      = 0;
const _pending = new Map();        // local rid -> { resolve, reject, timer, msg }
let _injected  = null;             // test seam: a fake store (no worker) so unit tests run without OPFS

// rid = request-correlation id, deliberately NOT `id`: an op's payload carries the entity `id`
// (put/get/delete), so a bare `id` field would clobber the correlation key and every such op
// would hang unmatched. rid namespaces the transport apart from the payload.
function _deliver(payload) {
  const { rid, ok, result, err } = payload || {};
  const p = _pending.get(rid);
  if (!p) return;
  _pending.delete(rid);
  clearTimeout(p.timer);
  if (ok) p.resolve(result);
  else {
    _announceLockedIf(err);
    p.reject(new SqliteUnavailableError(err || 'sqlite worker error'));
  }
}

function _spawnEngine() {
  // store-worker.js lives at a fixed path from the app root — use an absolute URL so this
  // works after esbuild bundles store-client.js into js/bootstrap/app.js (where import.meta.url
  // would make ./store-worker.js resolve to js/bootstrap/store-worker.js → 404).
  const workerUrl = new URL('js/implementations/storage/implementations/local/store-worker.js', document.baseURI);
  _engine = new Worker(workerUrl, { type: 'module' });
  _engine.onmessage = (ev) => {
    // fatal = worker-side unhandled error forwarded via postMessage (has real err string)
    if (ev.data?.fatal) {
      console.error('[store-client worker fatal]', ev.data.err);
      const dead = new SqliteUnavailableError('sqlite worker crashed: ' + ev.data.err);
      for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(dead); }
      _pending.clear();
      _announceLockedIf(ev.data.err);
      try { _engine.terminate(); } catch { /* already gone */ }
      _engine = null;
      _ready  = null;
      return;
    }
    // rid is this document's own correlation id. It used to be namespaced `${tabId}|${rid}` so two
    // tabs' requests could share one engine — the sharing that no longer happens.
    _deliver(ev.data || {});
  };
  // An engine crash must fail every in-flight op and drop the handle so the next call respawns.
  _engine.onerror = (e) => {
    console.error('[store-client worker onerror]', e);
    const dead = new SqliteUnavailableError('sqlite worker crashed: ' + (e?.message || 'unknown'));
    for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(dead); }
    _pending.clear();
    _engine = null;
    _ready  = null;
  };
}

function _sendToEngine(msg) {
  if (!_engine) _spawnEngine();
  _engine.postMessage(msg);
}

// Ask a healthy engine to release its OPFS handles (sqlite_release) and close itself, instead of
// a hard engine.terminate() that would leave those handles for the browser's own worker-teardown
// GC — the actual defect behind an ordinary reload bricking the app (store-worker.js's 'release'
// handler). Fires on pagehide (below), which covers a reload, a close, and a tab standing down
// after another one took ownership (tab-ownership.js reloads it).
function _releaseEngine() {
  if (!_engine) return;
  try { _engine.postMessage({ op: 'release' }); } catch { /* already gone */ }
  _engine = null;
  _ready  = null;
}

// A plain reload leaves the OLD document's engine worker (and its OPFS sahpool handles) to the
// browser's own teardown GC unless something releases them first — that gap, not a live second
// tab, is what a routine F5 bricked (repo-init-ok observed at 62533ms against a ~1s clean boot).
// pagehide fires reliably before the new document's worker tries to install the same pool.
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pagehide', _releaseEngine);
}

function ensureScope() {
  if (!_scope) throw new SqliteUnavailableError('store scope not set — the local database is per-account');
}

function send(op, extra, timeoutMs) {
  ensureScope();
  const rid = ++_seq;
  // rid first, then op/extra: extra may carry an entity `id` — it must never overwrite `rid`.
  // scope/hasLockExclusivity last so no payload key can shadow either.
  //
  // hasLockExclusivity used to be `typeof navigator.locks?.request === 'function'` — the PRESENCE
  // of the API, not a grant. sahpool_lock_policy.rs reads it as "Web Locks confirmed this document
  // is the only live one", which that value never established: a follower tab sent true too. It is
  // the real grant now, which is exactly the claim Rust is making on it.
  const msg = { rid, op, ...extra, scope: _scope, hasLockExclusivity: holdsTabOwnership() };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      _pending.delete(rid);
      reject(new SqliteUnavailableError(op + ' timed out — sqlite worker unresponsive'));
    }, timeoutMs);
    _pending.set(rid, { resolve, reject, timer });
    _sendToEngine(msg);
  });
}

// Rust's durability verdict for the local store ({kind, mode, cause?} — durability_verdict.rs,
// relayed verbatim as the 'init' op's result). Kept on window so the topbar reads it even when it
// mounts after init resolved, and re-announced whenever the engine (re)opens — a respawn can land
// in a different mode.
const STORE_DURABILITY_EVENT = 'vdg:store-durability';
function _announceDurability(verdict) {
  if (!verdict || typeof window === 'undefined') return;
  window.__vdg_storeDurability = verdict;
  window.dispatchEvent(new CustomEvent(STORE_DURABILITY_EVENT, { detail: verdict }));
}

// One open handshake, shared by every caller. A failed open clears the memo so a later op retries.
function ensureReady() {
  ensureScope();
  if (!_ready) {
    _ready = send('init', {}, INIT_TIMEOUT_MS)
      .then((verdict) => { _announceDurability(verdict); return verdict; })
      .catch((e) => { _ready = null; throw e; });
  }
  return _ready;
}

async function op(name, extra) {
  await ensureReady();
  return send(name, extra, OP_TIMEOUT_MS);
}

// ── store surface — thin transport to the Rust worker; the Rust side owns all SQL + schema ────────
// Method names are the Rust IO-port contract (cache_*) + the on-demand consumer contract; identical
// to the old JS store's signatures so StoreIoPort and window.__vdg_store callers are untouched.
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
  intent_list: ()              => (_injected ? _injected.intent_list()            : op('intentList', {})),
  intent_pending_pack: ()      => (_injected ? _injected.intent_pending_pack()    : op('intentPendingPack', {})),
  intent_parked_list: ()       => (_injected ? _injected.intent_parked_list()     : op('intentParkedList', {})),
  intent_commit: (txn)         => (_injected ? _injected.intent_commit(txn)       : op('intentCommit', { body: txn })),
};

// auth-gate cold-boot entity count (was sqlSelectValue('SELECT count(*) …')). Rust owns the query.
function sqlCountEntities() {
  return _injected ? _injected.count_entities() : op('countEntities', {});
}

// Drop the engine + memo so the next call respawns (mirrors resetVdgDbMemo). Tab ownership is
// untouched — only the engine worker restarts.
export function resetVdgSqliteMemo() {
  if (_engine) { try { _engine.terminate(); } catch { /* already gone */ } }
  _engine = null;
  _ready  = null;
  for (const [, p] of _pending) { clearTimeout(p.timer); p.reject(new SqliteUnavailableError('sqlite reset')); }
  _pending.clear();
}

// Test seam: inject a synchronous fake store (no worker) so unit tests run without OPFS.
export function _setSqliteStore(fake) { _injected = fake; }

/// What the storage bootstrap binds behind the local-store port: the cache_* surface plus scope/count.
export const localStoreClient = { ...sqliteStore, setStoreScope, sqlCountEntities };
