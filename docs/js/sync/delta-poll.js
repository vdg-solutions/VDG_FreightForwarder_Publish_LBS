// DeltaPoller — 30s Drive changes feed, page-visibility pause/resume

import { idbGet, idbPut, META_SYNC_KEY, STORE_ENTITIES, STORE_META } from '../cache/idb-cache.js';
import { parseJsonlBundle } from '../auth/drive-api.js';
import { checkDriveQuota } from './drive-quota.js';

const DELTA_POLL_MS       = 30_000;
const BACKOFF_STEPS_MS    = [30_000, 60_000, 120_000];
const CHANGES_FIELDS      = 'nextPageToken,newStartPageToken,changes(fileId,removed,file(name,parents,modifiedTime))';
const KIND_FOLDER_RE      = /\/([^/]+)\/\d{4}-\d{2}\.jsonl$/; // .../kind/YYYY-MM.jsonl
const BUNDLE_NAME_RE      = /^(\d{4}-\d{2})\.jsonl$/;
const QUOTA_PIGGYBACK_TICK = 120; // check quota once per ~60min (120 × 30s ticks)

const HTTP_CONFLICT = 412; // Precondition Failed — triggers conflict resolution

export class DeltaPoller {
  constructor(driveApi, db) {
    this._api          = driveApi;
    this._db           = db;
    this._timer        = null;
    this._paused       = false; // system visibility pause
    this._userPaused   = false; // user explicit pause
    this._backoffIdx   = 0;
    this._tickCount    = 0;
    this._resolver     = null; // set via setResolver()
    this._onVisibility = () => this._handleVisibility();
    this._onCommand    = (e) => this._handleCommand(e);
  }

  // Inject ConflictResolver after construction (circular dep avoided)
  setResolver(resolver) { this._resolver = resolver; }

  start() {
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('vdg:job-cmd:sync-delta', this._onCommand);
    this._schedule(0);
  }

  stop() {
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('vdg:job-cmd:sync-delta', this._onCommand);
    clearTimeout(this._timer);
    this._timer  = null;
    this._paused = false;
    this._reportState();
  }

  // ── private ────────────────────────────────────────────────────────────────

  _reportState(nextRunDelay = null) {
    const nextRunAt = nextRunDelay !== null ? Date.now() + nextRunDelay : undefined;
    window.dispatchEvent(new CustomEvent('vdg:job-state', {
      detail: {
        id: 'sync-delta',
        name: 'Sync Changes (Delta Poller)',
        nextRunAt,
        paused: this._userPaused,
        status: (this._paused || this._userPaused) ? 'ready' : (nextRunDelay === 0 ? 'running' : 'ready')
      }
    }));
  }

  _handleCommand(e) {
    const cmd = e.detail.command;
    if (cmd === 'pause') {
      this._userPaused = true;
      clearTimeout(this._timer);
      this._reportState();
    } else if (cmd === 'resume') {
      this._userPaused = false;
      this._reportState(0);
      this._schedule(0);
    } else if (cmd === 'run_now') {
      if (this._userPaused) return; // ignore if paused
      clearTimeout(this._timer);
      this._backoffIdx = 0;
      this._reportState(0);
      this._schedule(0);
    }
  }

  _schedule(delay) {
    clearTimeout(this._timer);
    if (this._userPaused) return; // user paused overrides schedule
    this._reportState(delay);
    this._timer = setTimeout(() => this._tick(), delay);
  }

  _handleVisibility() {
    if (this._userPaused) return;
    if (document.hidden) {
      clearTimeout(this._timer);
      this._paused = true;
      this._reportState();
    } else {
      this._paused = false;
      this._tick().then(() => this._schedule(DELTA_POLL_MS));
    }
  }

  async _tick() {
    try {
      await this._poll();
      this._backoffIdx = 0;
      this._tickCount += 1;
      if (this._tickCount % QUOTA_PIGGYBACK_TICK === 0) {
        checkDriveQuota(this._api).catch(() => {}); // fire-and-forget
      }
      if (!this._paused) this._schedule(DELTA_POLL_MS);
    } catch (err) {
      const delay = BACKOFF_STEPS_MS[Math.min(this._backoffIdx, BACKOFF_STEPS_MS.length - 1)];
      console.warn(`[delta-poll] ${new Date().toISOString()} error, retry in ${delay}ms:`, err.message); // DEV
      this._backoffIdx = Math.min(this._backoffIdx + 1, BACKOFF_STEPS_MS.length - 1);
      if (!this._paused) this._schedule(delay);
    }
  }

  async _poll() {
    if (!this._db) return; // IDB unavailable — skip
    const meta  = await idbGet(this._db, STORE_META, META_SYNC_KEY);
    const token = meta?.last_change_token ?? null;

    if (!token) {
      await this._fullPull(meta);
      return;
    }

    const resp = await this._api.driveFetch(
      'GET',
      `/changes?pageToken=${encodeURIComponent(token)}&fields=${encodeURIComponent(CHANGES_FIELDS)}&spaces=drive`,
    );

    for (const change of resp.changes || []) {
      await this._applyChange(change);
    }

    const nextToken = resp.nextPageToken ?? resp.newStartPageToken;
    if (nextToken) {
      const current = await idbGet(this._db, STORE_META, META_SYNC_KEY) || { key: META_SYNC_KEY };
      await idbPut(this._db, STORE_META, { ...current, last_change_token: nextToken });
    }
  }

  async _fullPull(meta) {
    // Get initial page token for future delta polls
    const resp      = await this._api.driveFetch('GET', '/changes/startPageToken');
    const initToken = resp.startPageToken;
    const current   = meta || { key: META_SYNC_KEY };
    await idbPut(this._db, STORE_META, {
      ...current,
      last_change_token: initToken,
      last_full_pull_ms: Date.now(),
    });
  }

  // Flush pending outbox ops; on HTTP 412 delegate to ConflictResolver
  async flushOutbox(outboxItems) {
    for (const item of outboxItems) {
      try {
        const { kind, id, op, body } = item;
        if (op === 'delete') {
          await this._api.driveFetch('DELETE', `/vdg/${kind}/${id}`);
        } else {
          const res = await this._api.driveFetch('PUT', `/vdg/${kind}/${id}`, body);
          if (res?.status === HTTP_CONFLICT && this._resolver) {
            const remote = await this._api.driveFetch('GET', `/vdg/${kind}/${id}`).catch(() => null);
            if (remote) await this._resolver.on412(kind, id, body, remote);
          }
        }
      } catch (err) {
        const status = err?.status ?? err?.code;
        if (status === HTTP_CONFLICT && this._resolver) {
          const { kind, id, body } = item;
          const remote = await this._api.driveFetch('GET', `/vdg/${kind}/${id}`).catch(() => null);
          if (remote) await this._resolver.on412(kind, id, body, remote);
        } else {
          console.warn('[delta-poll] outbox flush error:', err?.message ?? err); // DEV
        }
      }
    }
  }

  async _applyChange(change) {
    if (!this._db) return;
    if (change.removed) {
      // fileId removed — evict from IDB (we don't know kind/id here without parsing)
      window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { fileId: change.fileId } }));
      return;
    }

    const file = change.file;
    if (!file) return;

    // Parse kind from file name
    const nameMatch = BUNDLE_NAME_RE.exec(file.name);
    if (!nameMatch) return; // not a bundle file

    // Download updated bundle + diff against IDB
    const data = await this._api.getFile(change.fileId);
    if (!data) return;

    const incoming = parseJsonlBundle(data.content);
    const parentId = file.parents?.[0];
    // kind inferred from folder name — fetch parent metadata
    const parentMeta = parentId
      ? await this._api.driveFetch('GET', `/files/${parentId}?fields=name`).catch(() => null)
      : null;
    const kind = parentMeta?.name || 'unknown';

    for (const entity of incoming) {
      if (!entity.id) continue;
      await idbPut(this._db, STORE_ENTITIES, { ...entity, kind });
      window.dispatchEvent(new CustomEvent('vdg:entity-changed', { detail: { kind, id: entity.id } }));
    }
  }
}
