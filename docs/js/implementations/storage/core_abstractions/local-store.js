// local-store.js — port: the local tier (SQLite in a worker) as the operators and the io ports
// touch it: scope it to an account, count what it holds, and the six cache_* calls the wasm repo
// drives. The storage bootstrap binds the worker client (implementations/local/store-client.js).

let _store = null;

export function bindLocalStore(store) { _store = store; }

function _s() {
  if (!_store) throw new Error('storage/local-store: no local store bound');
  return _store;
}

export function setStoreScope(email) { return _s().setStoreScope(email); }
export function sqlCountEntities() { return _s().sqlCountEntities(); }

/// The bound store object itself — the cache_* surface (cache_get/list/put/delete/get_meta/put_meta).
export function localStore() { return _s(); }

/// Test seam.
export function _resetLocalStore() { _store = null; }
