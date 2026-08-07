// sqlite-schema.js — single source of truth for the SQLite/OPFS store DDL + table names.
// No imports: both the worker (sqlite-worker.js) and the host unit tests load it, so the schema
// can't drift between the real engine and what the tests assert against (idb-schema.js's role).

export const DB_PATH  = '/vdg-workspace.sqlite3';
export const VFS_NAME = 'vdg-opfs-pool';

export const TABLE_ENTITIES = 'entities';
export const TABLE_META     = 'meta';
export const TABLE_OUTBOX   = 'outbox';

// The single meta row the sync layer read-modify-writes (change token + last_full_pull_ms).
export const META_SYNC_KEY  = 'sync_state';

// Extracted columns mirror the old IDB by_* indexes; everything else lives in the `body` JSON blob.
// outbox is keyed by `id` (out-of-line string key in the old IDB store) so a re-queued op upserts in
// place instead of duplicating; order is by queued_at, not an autoincrement seq.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS entities (
  kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL,
  sales_rep TEXT, customer_id TEXT, updated_at TEXT, etd TEXT, deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS ix_entities_kind      ON entities(kind, deleted);
CREATE INDEX IF NOT EXISTS ix_entities_kind_rep  ON entities(kind, sales_rep);
CREATE INDEX IF NOT EXISTS ix_entities_kind_cust ON entities(kind, customer_id);
CREATE INDEX IF NOT EXISTS ix_entities_updated   ON entities(updated_at);
CREATE TABLE IF NOT EXISTS meta   (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY, kind TEXT, op TEXT, body TEXT, queued_at INTEGER);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, body TEXT, read INTEGER, type TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS kind_wma (key TEXT PRIMARY KEY, body TEXT);
`;
