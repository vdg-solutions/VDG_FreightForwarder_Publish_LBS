// AuditLog — append-only transition/audit trail. Repo-backed (F-29-08): append() ->
// repo.put('audit_log', ...), readAll() -> repo.list('audit_log', null), same store both
// ends — Class-5 (immutable, one authoritative copy). Materialization to Drive jsonl (LOG_KINDS)
// happens inside wasm-io-adapters.js, out of scope here.
//
// E-37 (F-37-02): a hash answers "did this change", never "who changed what to what", so it can
// not settle an argument between CS and a rep — which is the whole reason the owner asked for a
// history. Entries now carry `changes: [{field, from, to}]` beside the hash.
//
// A LOG INHERITS THE ACL OF THE THING IT DESCRIBES. `selling_amount: 1000 -> 1200` written into
// the shared trail would publish the number whose FILE is unreadable to CS, so revenue history
// goes to a second store in the rep's own fork. Which change belongs to which store is decided in
// Rust (boundary/shipment_diff.rs) and reaches this class already sorted — see sync/shipment-audit.js.

// TAMPERING. Everyone who writes a shipment can write the shared trail — Drive grants a folder,
// not an operation, so "append-only" is a property of this code and not of the storage. Nothing
// serverless can PREVENT a writer from rewriting their own history. What it can do is make the
// rewrite loud: each entry carries the hash of the previous entry BY THE SAME ACTOR, so deleting
// or editing an entry in the middle breaks the chain and `verifyAuditChain` names the break.
// Two limits stated plainly: deleting the NEWEST entry leaves no successor to notice (only Drive's
// own file revision history shows that), and an actor can rebuild their whole chain from scratch —
// which is itself visible as a restart. See backlog/wiki/shipment-collaboration-model.md §6.

export const AUDIT_STORE_SHARED  = 'audit_log';          // _shared/logs/audit-log
export const AUDIT_STORE_REVENUE = 'revenue_audit_log';  // users/{prefix}/revenue_audit_log

// Hashed by POSITION, not by key order: a renamed or reordered key cannot change the digest, and
// a field added to the record without being added here is visibly outside the chain rather than
// quietly inside it. `entry_hash` is excluded because it is the output.
const HASHED_FIELDS = [
  'id', 'ts', 'actor_email', 'actor_role', 'kind', 'entity_id', 'op',
  'payload_hash', 'changes', 'prev_hash', 'hash_alg',
];

const ALG_SHA256 = 'sha256';
const ALG_FALLBACK = 'djb2';   // non-secure context: a checksum, NOT tamper evidence

export class AuditLog {
  constructor(getCurrentUser, currentRole) {
    this._getUser = getCurrentUser;
    this._getRole = currentRole;
    this._tips    = new Map();          // store -> this actor's latest entry_hash
    this._queue   = Promise.resolve();  // two appends in one tick would otherwise chain off the
                                        // same tip and fork the history (see user-audit-log.js)
  }

  // fire-and-forget — callers do NOT await
  append(kind, entityId, op, body, changes = null) {
    this._enqueue(AUDIT_STORE_SHARED, kind, entityId, op, body, changes, 'append');
  }

  /**
   * The same entry, in the rep's own fork. Reached only from sync/shipment-audit.js, which is the
   * only place that holds a change list already classified by Rust — a caller sorting fields by
   * eye is exactly how a sell figure ends up in the shared trail.
   */
  appendRevenue(kind, entityId, op, body, changes = null) {
    this._enqueue(AUDIT_STORE_REVENUE, kind, entityId, op, body, changes, 'revenue append');
  }

  /** Resolves once every queued append has settled. Appends are fire-and-forget by contract, so
   *  anything that must observe the trail — a verifier, a test, a clean shutdown — needs this. */
  async flush() { await this._queue; }

  _enqueue(store, kind, entityId, op, body, changes, label) {
    this._queue = this._queue
      .then(() => this._appendAsync(store, kind, entityId, op, body, changes))
      .catch((err) => {
        console.error(`[audit-log] ${label} failed:`, err); // DEV — one failure must not stall the queue
      });
  }

  async readAll() {
    const repo = window.__vdg_repo;
    if (!repo) return [];
    const records = await repo.list(AUDIT_STORE_SHARED, null);
    return records.filter((r) => !r._deleted);
  }

  /** Revenue history for this reader's own fork. A reader who holds no such fork gets [] — that
   *  is the CS answer and it is correct, not a failed read. */
  async readRevenueHistory() {
    const repo = window.__vdg_repo;
    if (!repo) return [];
    const records = await repo.list(AUDIT_STORE_REVENUE, null).catch(() => []);
    return records.filter((r) => !r._deleted);
  }

  async readFiltered(email) {
    const all = await this.readAll();
    return all.filter((r) => r.actor_email === email);
  }

  // ── private ────────────────────────────────────────────────────────────────

  async _appendAsync(store, kind, entityId, op, body, changes) {
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
      // Always an array. `changes: []` says "we looked and nothing user-visible moved", which is
      // a different claim from an older entry that predates diffing — and only the array form
      // lets a reader tell the two apart.
      changes:      Array.isArray(changes) ? changes : [],
      prev_hash:    await this._chainTip(store),
      hash_alg:     _hashAlg(),
    };
    record.entry_hash = await _sha256Hex(_canonical(record));

    const repo = window.__vdg_repo;
    if (!repo) throw new Error('[audit-log] repo unavailable — audit entry not persisted');
    await repo.put(store, record.id, record);
    this._tips.set(store, record.entry_hash);
  }

  /** This actor's latest entry hash in a store — read once per store, then kept in memory. */
  async _chainTip(store) {
    if (this._tips.has(store)) return this._tips.get(store);
    const tip = await this._readTip(store);
    this._tips.set(store, tip);
    return tip;
  }

  async _readTip(store) {
    const repo = window.__vdg_repo;
    const me   = this._getUser?.()?.email || 'unknown';
    try {
      const mine = (await repo.list(store, null))
        .filter((r) => !r._deleted && r.actor_email === me && r.entry_hash);
      // The tail is the entry nothing points back at. Sorting by `ts` would be wrong: two entries
      // written in the same millisecond carry the same timestamp, and appending to the wrong one
      // forks the chain — which then reads as tampering.
      const referenced = new Set(mine.map((r) => r.prev_hash).filter(Boolean));
      return mine.find((r) => !referenced.has(r.entry_hash))?.entry_hash ?? null;
    } catch {
      // An unreadable store is not an empty one. Chaining from null here starts a fresh chain,
      // which verifyAuditChain reports as a restart rather than accepting silently.
      return null;
    }
  }

  // F-29-08: legacy shards (shared/audit/transition-log/*.jsonl, F-19-23) are abandoned —
  // greenfield, no prod data; audit reads/writes are now repo-only. No migration path.
  _migrateLegacyShards() {
    console.warn('[audit-log] legacy Drive shards abandoned — audit trail is repo-backed'); // DEV
  }
}

/**
 * Walk each actor's chain and report where it does not hold.
 *
 * Returns `[{ actor, id, problem }]`, empty when every chain is intact. Problems:
 *   `content-edited` — the entry no longer hashes to its own entry_hash
 *   `broken-link`    — prev_hash does not name the actor's preceding entry (one was removed or
 *                      inserted, or two clients raced)
 *   `restart`        — a chain begins again mid-stream
 *   `unverifiable`   — written without SHA-256 (non-secure context); a checksum, not evidence
 *
 * It cannot see a deleted NEWEST entry, because nothing points at it. That gap is Drive's file
 * revision history to close, not this function's — and the two are different channels on purpose.
 */
export async function verifyAuditChain(rows) {
  const byActor = new Map();
  for (const row of rows) {
    if (row?._deleted) continue;
    const actor = row?.actor_email || 'unknown';
    if (!byActor.has(actor)) byActor.set(actor, []);
    byActor.get(actor).push(row);
  }

  const problems = [];
  for (const [actor, entries] of byActor) {
    // Order comes from the LINKS, never from `ts`. Two entries written in the same millisecond
    // share a timestamp, and ordering them by it would report a clean trail as broken — a
    // tamper check that cries wolf is one nobody reads.
    const present = new Set(entries.map((e) => e.entry_hash).filter(Boolean));
    const claimed = new Map();   // prev_hash -> how many entries name it as their predecessor

    for (const entry of entries) {
      if (entry.hash_alg && entry.hash_alg !== ALG_SHA256) {
        problems.push({ actor, id: entry.id, problem: 'unverifiable' });
      } else if (entry.entry_hash) {
        const recomputed = await _sha256Hex(_canonical(entry));
        if (recomputed !== entry.entry_hash) {
          problems.push({ actor, id: entry.id, problem: 'content-edited' });
        }
      }
      const prev = entry.prev_hash ?? null;
      if (prev !== null) {
        // Its predecessor is gone, or was edited and no longer hashes to what this entry names.
        if (!present.has(prev)) problems.push({ actor, id: entry.id, problem: 'broken-link' });
        claimed.set(prev, (claimed.get(prev) || 0) + 1);
      }
    }

    // More than one entry claiming the same predecessor is a fork: one of them was inserted.
    for (const entry of entries) {
      if (entry.prev_hash && claimed.get(entry.prev_hash) > 1) {
        problems.push({ actor, id: entry.id, problem: 'broken-link' });
      }
    }

    // A chain has one beginning. Any further one is a restart — an actor who dropped their history
    // and began again, which is a thing to notice rather than to accept.
    const roots = entries.filter((e) => (e.prev_hash ?? null) === null)
      .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));   // labelling only, not correctness
    for (const extra of roots.slice(1)) {
      problems.push({ actor, id: extra.id, problem: 'restart' });
    }
  }
  return problems;
}

function _canonical(record) {
  // By position, so the digest cannot move because a key was renamed or reordered.
  return JSON.stringify(HASHED_FIELDS.map((f) => record[f] ?? null));
}

function _hashAlg() {
  return (typeof crypto !== 'undefined' && crypto.subtle) ? ALG_SHA256 : ALG_FALLBACK;
}

async function _sha256Hex(text) {
  try {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    /* non-secure context — the entry is already marked hash_alg: djb2 and reads as unverifiable */
    return _djb2(text).toString(16);
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
