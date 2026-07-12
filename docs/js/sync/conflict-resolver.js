// Conflict resolver — 3-way merge or manual modal on 412

import { idbGet, idbPut, STORE_META } from '../cache/idb-cache.js';

const MAX_412_RETRIES      = 3;
const ANCESTOR_META_PREFIX = 'etag.'; // IDB meta key: etag.<kind>.<id>

export class ConflictResolver {
  constructor(db, repo) {
    this._db         = db;
    this._repo       = repo;
    this._retryCount = new Map(); // `${kind}.${id}` → count
  }

  // Called by delta-poll outbox flush on HTTP 412
  async on412(kind, id, localBody, remoteBody) {
    const retryKey = `${kind}.${id}`;
    const retries  = (this._retryCount.get(retryKey) || 0) + 1;

    if (retries > MAX_412_RETRIES) {
      this._retryCount.delete(retryKey);
      window.dispatchEvent(new CustomEvent('vdg:sync-error', {
        detail: { kind, id, reason: 'max_retries' },
      }));
      return;
    }
    this._retryCount.set(retryKey, retries);

    const ancestorKey = ANCESTOR_META_PREFIX + retryKey;
    let ancestor = null;
    if (this._db) {
      try {
        const rec = await idbGet(this._db, STORE_META, ancestorKey);
        ancestor = rec?.body ?? null;
      } catch { /* ancestor absent — fall through to manual */ }
    }

    if (!ancestor) {
      this._dispatchConflict(kind, id, localBody, remoteBody, []);
      return;
    }

    const conflicts = this._diff3(ancestor, localBody, remoteBody);
    if (conflicts.length === 0) {
      const merged = this._autoMerge(ancestor, localBody, remoteBody);
      await this._repo.put(kind, id, merged);
      this._appendLog(kind, id, merged, 'auto', null);
    } else {
      this._dispatchConflict(kind, id, localBody, remoteBody, conflicts);
    }
  }

  // Called by UI modal "Keep mine" / "Use theirs"
  async resolveConflict(kind, id, winning, field) {
    await this._repo.put(kind, id, winning);
    this._appendLog(kind, id, winning, 'manual', field);
    const retryKey = `${kind}.${id}`;
    this._retryCount.delete(retryKey);
  }

  // Store ancestor snapshot after successful L3 write
  async storeAncestor(kind, id, body) {
    if (!this._db) return;
    const ancestorKey = ANCESTOR_META_PREFIX + `${kind}.${id}`;
    try {
      await idbPut(this._db, STORE_META, { key: ancestorKey, body });
    } catch { /* non-critical */ }
  }

  // ── private ────────────────────────────────────────────────────────────────

  _diff3(ancestor, local, remote) {
    const conflicting = [];
    const allKeys = new Set([
      ...Object.keys(ancestor || {}),
      ...Object.keys(local   || {}),
      ...Object.keys(remote  || {}),
    ]);
    for (const k of allKeys) {
      if (k.startsWith('_')) continue; // skip internal fields
      const aVal = ancestor?.[k];
      const lVal = local?.[k];
      const rVal = remote?.[k];
      const localChanged  = JSON.stringify(lVal) !== JSON.stringify(aVal);
      const remoteChanged = JSON.stringify(rVal) !== JSON.stringify(aVal);
      if (localChanged && remoteChanged && JSON.stringify(lVal) !== JSON.stringify(rVal)) {
        conflicting.push({ field: k, local_val: lVal, remote_val: rVal });
      }
    }
    return conflicting;
  }

  _autoMerge(ancestor, local, remote) {
    const merged = { ...ancestor };
    const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);
    for (const k of allKeys) {
      const aVal = ancestor?.[k];
      const lVal = local?.[k];
      const rVal = remote?.[k];
      const localChanged  = JSON.stringify(lVal) !== JSON.stringify(aVal);
      const remoteChanged = JSON.stringify(rVal) !== JSON.stringify(aVal);
      if (localChanged)  merged[k] = lVal;
      if (remoteChanged) merged[k] = rVal;
    }
    return merged;
  }

  _appendLog(kind, id, entity, resolution, field) {
    const log = [...(entity.transition_log || [])];
    log.push({
      event: 'ConflictResolved',
      resolution,
      field:       field ?? undefined,
      resolved_by: window.__vdg_auth?.getCurrentUser?.()?.email || 'manager',
      resolved_at: new Date().toISOString(),
    });
    // fire-and-forget — write updated log back
    this._repo.put(kind, id, { ...entity, transition_log: log }).catch(() => {});
  }

  _dispatchConflict(kind, id, local, remote, conflicts) {
    window.dispatchEvent(new CustomEvent('vdg:conflict-detected', {
      detail: { kind, id, local, remote, conflicts },
    }));
  }
}
