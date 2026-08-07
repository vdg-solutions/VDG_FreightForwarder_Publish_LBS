// store-io-adapters.js — the IO port the Rust wasm calls, with storage on SQLite instead of IDB.
//
// Reuses WasmIoPort wholesale for the non-storage half (drive_read_bundle/drive_write_bundle,
// dispatch_event, current_user_email, ledger_*) — only the six storage methods are overridden to
// delegate to the sqliteStore transport. All SQL + schema now live in Rust (data_repo/sqlite_store.rs);
// this class carries zero query logic. `_store` is exposed on window.__vdg_store (repo-init-steps.js)
// so on-demand views (prefs, drafts, wma, notifications) reach the same worker. db is unused (null) —
// storage lives in the worker, not an IDB handle.

import { WasmIoPort } from './wasm-io-adapters.js';
import { sqliteStore } from '../cache/store-client.js';

export class StoreIoPort extends WasmIoPort {
  constructor(driveApi, userEmail) {
    super(null, driveApi, userEmail);
    this._store = sqliteStore;
  }

  cache_get(kind, id)       { return this._store.cache_get(kind, id); }
  cache_list(kind)          { return this._store.cache_list(kind); }
  cache_put(kind, id, body) { return this._store.cache_put(kind, id, body); }
  cache_delete(kind, id)    { return this._store.cache_delete(kind, id); }
  cache_get_meta(key)       { return this._store.cache_get_meta(key); }
  cache_put_meta(key, body) { return this._store.cache_put_meta(key, body); }
}
