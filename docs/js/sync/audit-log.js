// AuditLog — append-only transition/audit trail. Repo-backed (F-29-08): append() ->
// repo.put('audit_log', ...), readAll() -> repo.list('audit_log', null), same store both
// ends — Class-5 (immutable, one authoritative copy). Materialization to Drive jsonl (LOG_KINDS)
// happens inside wasm-io-adapters.js, out of scope here.

export class AuditLog {
  constructor(getCurrentUser, currentRole) {
    this._getUser = getCurrentUser;
    this._getRole = currentRole;
  }

  // fire-and-forget — callers do NOT await
  append(kind, entityId, op, body) {
    this._appendAsync(kind, entityId, op, body).catch((err) => {
      console.error('[audit-log] append failed:', err); // DEV
    });
  }

  async readAll() {
    const repo = window.__vdg_repo;
    if (!repo) return [];
    const records = await repo.list('audit_log', null);
    return records.filter((r) => !r._deleted);
  }

  async readFiltered(email) {
    const all = await this.readAll();
    return all.filter((r) => r.actor_email === email);
  }

  // ── private ────────────────────────────────────────────────────────────────

  async _appendAsync(kind, entityId, op, body) {
    const now      = new Date();
    const user     = this._getUser?.() || {};
    const hash     = await _payloadHash(body);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const id       = `AUD-${monthStr}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
    if (!repo) throw new Error('[audit-log] repo unavailable — audit entry not persisted');
    await repo.put('audit_log', record.id, record);
  }

  // F-29-08: legacy shards (shared/audit/transition-log/*.jsonl, F-19-23) are abandoned —
  // greenfield, no prod data; audit reads/writes are now repo-only. No migration path.
  _migrateLegacyShards() {
    console.warn('[audit-log] legacy Drive shards abandoned — audit trail is repo-backed'); // DEV
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
