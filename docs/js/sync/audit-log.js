// AuditLog — append-only monthly JSONL shards in Drive

// F-19-23 D-02: standardized to _shared/ prefix used by sibling error-log/dunning-log paths.
export const AUDIT_LOG_PATH        = '_shared/logs/audit-log';
const LEGACY_AUDIT_LOG_PATH        = 'shared/audit/transition-log';

// Session ETag cache: month-key → {fileId, etag}
const _sessionCache = new Map();

export class AuditLog {
  constructor(driveApi, getCurrentUser, currentRole) {
    this._api         = driveApi;
    this._getUser     = getCurrentUser;
    this._getRole     = currentRole;
    this._rootFolderId = null;
  }

  // fire-and-forget — callers do NOT await
  append(kind, entityId, op, body) {
    this._appendAsync(kind, entityId, op, body).catch((err) => {
      console.error('[audit-log] append failed:', err); // DEV
    });
  }

  async readAll() {
    const rootId = await this._ensureAuditFolder();
    const files  = await this._api.listChildren(rootId);
    const records = [];
    for (const f of files) {
      if (!f.name.endsWith('.jsonl')) continue;
      const data = await this._api.getFile(f.id);
      if (!data) continue;
      const { parseJsonlBundle } = await import('../auth/drive-api.js');
      records.push(...parseJsonlBundle(data.content));
    }
    return records;
  }

  async readFiltered(email) {
    const all = await this.readAll();
    return all.filter((r) => r.actor_email === email);
  }

  // ── private ────────────────────────────────────────────────────────────────

  async _appendAsync(kind, entityId, op, body) {
    const now     = new Date();
    const user    = this._getUser?.() || {};
    const hash    = await _payloadHash(body);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const id      = `AUD-${monthStr}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const record = {
      id,
      ts:           now.toISOString(),
      actor_email:  user.email   || 'unknown',
      actor_role:   this._getRole?.() || 'unknown',
      kind,
      entity_id:    entityId,
      op,
      payload_hash: hash,
    };

    const repo = window.__vdg_repo;
    if (repo) {
      await repo.put('audit_log', record.id, record);
    }
  }

  async _ensureAuditFolder() {
    // No-op. SyncEngine and wasm-io-adapters handle paths now.
    return this._rootFolderId;
  }

  async _migrateLegacyShards(wsRoot, newFolderId, { findFolder, listChildren, moveToParent }) {
    // Migration logic is now obsolete for new entries. 
    // Wait, let's keep the stub for compatibility if called manually.
  }
}

async function _payloadHash(body) {
  try {
    const encoder = new TextEncoder();
    const data    = encoder.encode(JSON.stringify(body));
    const buffer  = await crypto.subtle.digest('SHA-256', data);
    const hex     = Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 16); // first 16 chars — avoid PII in log
  } catch {
    /* crypto.subtle unavailable (HTTP non-secure context) — use fast fallback */
    return _djb2(JSON.stringify(body)).toString(16).slice(0, 16);
  }
}

function _djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return h >>> 0;
}
