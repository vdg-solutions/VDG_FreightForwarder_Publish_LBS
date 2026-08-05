// IndexedDB schema — store/index definitions + the versioned onupgradeneeded migration. Split out
// of idb-cache.js so the connection/helper layer stays under the line cap; the two share these
// constants (idb-cache re-exports them for its existing importers).

import { OUTBOX_INDEX_KIND_ID_OP, dedupeOutboxStore, purgeStaleFailedOutboxRows } from './outbox-dedupe.js';

export const IDB_DB_NAME         = 'vdg-workspace';
export const IDB_DB_VERSION      = 6;  // v6: ensure entities indexes exist
export const STORE_NOTIFICATIONS = 'notifications';
export const STORE_KIND_WMA      = 'kind_wma';
export const STORE_ENTITIES      = 'entities';
export const STORE_META          = 'meta';
export const STORE_OUTBOX        = 'outbox';
export const META_SYNC_KEY       = 'sync_state';

const DEFAULT_WIDGET_LAYOUT = [
  'kpi', 'leaderboard', 'exceptions', 'ar', 'bar',
  'donut', 'activity', 'timeline', 'pipeline', 'top-customers',
];

// onupgradeneeded handler — creates/migrates stores by version. Runs only on a version bump.
export function applyUpgrade(ev) {
  const db = ev.target.result;

  if (!db.objectStoreNames.contains(STORE_ENTITIES)) {
    const s = db.createObjectStore(STORE_ENTITIES, { keyPath: ['kind', 'id'] });
    s.createIndex('by_kind',             'kind',                         { unique: false });
    s.createIndex('by_kind_sales_rep',   ['kind', 'sales_rep'],          { unique: false });
    s.createIndex('by_kind_customer_id', ['kind', 'customer_id'],        { unique: false });
    s.createIndex('by_updated_at',       'updated_at',                   { unique: false });
  }

  if (!db.objectStoreNames.contains(STORE_META)) {
    const m = db.createObjectStore(STORE_META, { keyPath: 'key' });
    m.transaction.oncomplete = () => {
      const tx = db.transaction(STORE_META, 'readwrite');
      tx.objectStore(STORE_META).add({
        key: META_SYNC_KEY, last_change_token: null, last_full_pull_ms: 0, user_role: null,
      });
    };
  }

  if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
    db.createObjectStore(STORE_OUTBOX, { autoIncrement: true });
  }

  // v2: notifications store
  if (ev.oldVersion < 2 && !db.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
    const n = db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: 'id' });
    n.createIndex('by_read',    'read',       { unique: false });
    n.createIndex('by_type',    'type',       { unique: false });
    n.createIndex('by_created', 'created_at', { unique: false });
  }

  // v3: per-rep kind WMA store
  if (ev.oldVersion < 3 && !db.objectStoreNames.contains(STORE_KIND_WMA)) {
    db.createObjectStore(STORE_KIND_WMA, { keyPath: 'key' });
  }

  // v4: outbox dedupe index + one-time collapse of duplicate rows (F-24-12 snowball fix)
  if (ev.oldVersion < 4 && db.objectStoreNames.contains(STORE_OUTBOX)) {
    const outboxStore = ev.target.transaction.objectStore(STORE_OUTBOX);
    if (!outboxStore.indexNames.contains(OUTBOX_INDEX_KIND_ID_OP)) {
      outboxStore.createIndex(OUTBOX_INDEX_KIND_ID_OP, ['kind', 'id', 'op'], { unique: false });
    }
    dedupeOutboxStore(outboxStore);
  }

  // v5: purge outbox rows failed >7d ago — a stale row predates whatever fix would have unstuck
  // it (e.g. F-15-57 pnl_lines rename) and would otherwise sit as a permanent poison (F-24-17).
  if (ev.oldVersion < 5 && db.objectStoreNames.contains(STORE_OUTBOX)) {
    const outboxStore = ev.target.transaction.objectStore(STORE_OUTBOX);
    purgeStaleFailedOutboxRows(outboxStore);
  }

  // v6: ensure entities store indexes exist (fix missing by_kind index)
  if (ev.oldVersion < 6 && db.objectStoreNames.contains(STORE_ENTITIES)) {
    const s = ev.target.transaction.objectStore(STORE_ENTITIES);
    if (!s.indexNames.contains('by_kind')) {
      s.createIndex('by_kind',             'kind',                         { unique: false });
      s.createIndex('by_kind_sales_rep',   ['kind', 'sales_rep'],          { unique: false });
      s.createIndex('by_kind_customer_id', ['kind', 'customer_id'],        { unique: false });
      s.createIndex('by_updated_at',       'updated_at',                   { unique: false });
    }
  }

  // v2 migration: by_kind_etd index + preferences seed
  if (ev.oldVersion < 2 && db.objectStoreNames.contains(STORE_ENTITIES)) {
    const s = ev.target.transaction.objectStore(STORE_ENTITIES);
    if (!s.indexNames.contains('by_kind_etd')) {
      s.createIndex('by_kind_etd', ['kind', 'etd'], { unique: false });
    }
    ev.target.transaction.oncomplete = () => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const ms = tx.objectStore(STORE_META);
      ms.get('preferences').onsuccess = (ge) => {
        if (!ge.target.result) {
          ms.add({
            key: 'preferences',
            widget_layout: DEFAULT_WIDGET_LAYOUT,
            locale: 'vi',
            theme: 'light',
            pipeline_view_mode: 'board',
            dismissed_credit_alerts: [],
          });
        }
      };
    };
  }
}
