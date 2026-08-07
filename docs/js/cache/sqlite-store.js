// sqlite-store.js — the storage half of the Rust IO port, backed by SQLite instead of IndexedDB.
//
// Method names are the Rust wasm-bindgen import contract (idb_get/idb_list/idb_put/idb_delete/
// idb_get_meta/idb_put_meta) — kept verbatim so the Rust side (io_adapters.rs) is untouched; the
// "idb_" prefix is now just the port name, the substrate is SQL. Behaviour is byte-identical to
// WasmIoPort's storage methods (same inputs → same return shapes) so the sync-engine can't tell the
// store changed. Standalone (imports only sqlite-conn) so host unit tests exercise it against a real
// SQLite without pulling the browser-coupled Drive/auth chain.

import { sqlSelect, sqlSelectValue, sqlExec } from './sqlite-conn.js';
import { TABLE_OUTBOX } from './sqlite-schema.js';

// Extracted columns mirror the old by_* indexes; pulled from the body on write for query power.
function _cols(body) {
  return {
    sales_rep:   body?.sales_rep ?? null,
    customer_id: body?.customer_id ?? null,
    updated_at:  body?.updated_at ?? null,
    etd:         body?.etd ?? null,
    deleted:     body?._deleted ? 1 : 0,
  };
}

// Rehydrate a stored row to the exact shape WasmIoPort returned: the raw body with id/kind
// guaranteed present. The blob keeps the record verbatim, so a domain `kind` inside it survives;
// the entity-type fills in only when the body carried none.
function _hydrate(kind, id, bodyJson) {
  if (bodyJson == null) return null;
  const parsed = JSON.parse(bodyJson);
  return { ...parsed, id: parsed.id ?? id, kind: parsed.kind ?? kind };
}

export class SqliteStore {
  async idb_get(kind, id) {
    if (kind === TABLE_OUTBOX) {
      const row = await sqlSelectValue('SELECT body FROM outbox WHERE id = ?', [id]);
      return row == null ? null : JSON.parse(row);
    }
    const body = await sqlSelectValue('SELECT body FROM entities WHERE kind = ? AND id = ?', [kind, id]);
    return _hydrate(kind, id, body);
  }

  async idb_list(kind) {
    if (kind === TABLE_OUTBOX) {
      const rows = await sqlSelect('SELECT body FROM outbox ORDER BY queued_at', []);
      return rows.map((r) => JSON.parse(r.body));
    }
    const rows = await sqlSelect('SELECT id, body FROM entities WHERE kind = ?', [kind]);
    return rows.map((r) => _hydrate(kind, r.id, r.body));
  }

  async idb_put(kind, id, body) {
    if (kind === TABLE_OUTBOX) {
      // out-of-line string key `id`, upsert in place (mirrors idbPut(OUTBOX, body, id))
      await sqlExec(
        'INSERT INTO outbox (id, kind, op, body, queued_at) VALUES (?,?,?,?,?) ' +
        'ON CONFLICT(id) DO UPDATE SET kind=excluded.kind, op=excluded.op, body=excluded.body, queued_at=excluded.queued_at',
        [id, body?.kind ?? null, body?.op ?? null, JSON.stringify(body), body?.queued_at ?? null],
      );
      return;
    }
    const c = _cols(body);
    await sqlExec(
      'INSERT INTO entities (kind, id, body, sales_rep, customer_id, updated_at, etd, deleted) ' +
      'VALUES (?,?,?,?,?,?,?,?) ' +
      'ON CONFLICT(kind, id) DO UPDATE SET body=excluded.body, sales_rep=excluded.sales_rep, ' +
      'customer_id=excluded.customer_id, updated_at=excluded.updated_at, etd=excluded.etd, deleted=excluded.deleted',
      [kind, id, JSON.stringify(body), c.sales_rep, c.customer_id, c.updated_at, c.etd, c.deleted],
    );
  }

  async idb_delete(kind, id) {
    if (kind === TABLE_OUTBOX) { await sqlExec('DELETE FROM outbox WHERE id = ?', [id]); return; }
    await sqlExec('DELETE FROM entities WHERE kind = ? AND id = ?', [kind, id]);
  }

  async idb_get_meta(key) {
    const val = await sqlSelectValue('SELECT value FROM meta WHERE key = ?', [key]);
    return val == null ? null : JSON.parse(val);
  }

  async idb_put_meta(key, body) {
    await sqlExec(
      'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, JSON.stringify({ ...body, key })],
    );
  }

  async idb_delete_meta(key) {
    await sqlExec('DELETE FROM meta WHERE key = ?', [key]);
  }

  // ── kind_wma: single-key body-JSON store (F-15-63 weighted moving average) ──────────────────────
  async idb_get_wma(key) {
    const body = await sqlSelectValue('SELECT body FROM kind_wma WHERE key = ?', [key]);
    return body == null ? null : JSON.parse(body);
  }

  async idb_put_wma(key, body) {
    await sqlExec(
      'INSERT INTO kind_wma (key, body) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET body = excluded.body',
      [key, JSON.stringify({ ...body, key })],
    );
  }

  // ── notifications: id-keyed body-JSON store with read/type/created_at query columns ─────────────
  async idb_list_notifications() {
    const rows = await sqlSelect('SELECT body FROM notifications ORDER BY created_at DESC', []);
    return rows.map((r) => JSON.parse(r.body));
  }

  async idb_put_notification(notif) {
    await sqlExec(
      'INSERT INTO notifications (id, body, read, type, created_at) VALUES (?,?,?,?,?) ' +
      'ON CONFLICT(id) DO UPDATE SET body=excluded.body, read=excluded.read, type=excluded.type, created_at=excluded.created_at',
      [notif.id, JSON.stringify(notif), notif.read ? 1 : 0, notif.type ?? null, notif.created_at ?? null],
    );
  }
}
