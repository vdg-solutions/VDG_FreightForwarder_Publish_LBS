// sqlite-io-adapters.js — the IO port the Rust wasm calls, with storage on SQLite instead of IDB.
//
// Reuses WasmIoPort wholesale for the non-storage half (drive_read_bundle/drive_write_bundle,
// dispatch_event, current_user_email, ledger_*) — only the six storage methods are overridden to
// delegate to SqliteStore. The Rust side (io_adapters.rs) imports the same idb_* names, so it is
// untouched; the substrate under those names is now SQL. db is unused (passed null) — storage lives
// in the worker, not an IDB handle.

import { WasmIoPort } from './wasm-io-adapters.js';
import { SqliteStore } from '../cache/sqlite-store.js';

export class SqliteIoPort extends WasmIoPort {
  constructor(driveApi, userEmail) {
    super(null, driveApi, userEmail);
    this._store = new SqliteStore();
  }

  idb_get(kind, id)       { return this._store.idb_get(kind, id); }
  idb_list(kind)          { return this._store.idb_list(kind); }
  idb_put(kind, id, body) { return this._store.idb_put(kind, id, body); }
  idb_delete(kind, id)    { return this._store.idb_delete(kind, id); }
  idb_get_meta(key)       { return this._store.idb_get_meta(key); }
  idb_put_meta(key, body) { return this._store.idb_put_meta(key, body); }
}
