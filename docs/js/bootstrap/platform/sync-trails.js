// sync-trails.js — the three append-only trails the workspace keeps about itself, as the rest of
// the app holds them: an object with the same methods it always had. Every entry's SHAPE, its
// hash chain and both gates on the error log are decided in Rust
// (freight_app/operators/sync/{audit_log,user_audit_log,error_log}.rs).
//
// The promise chain is the one thing that stays here: appends are fire-and-forget by contract, and
// two of them in the same tick would otherwise chain off the same tip and fork the history.

const AUTH_DEAD_EVENT        = 'vdg:auth-needs-reconnect';
const AUTH_RECONNECTED_EVENT = 'vdg:auth-reconnected';
const SYNC_ERROR_EVENT       = 'vdg:sync-error';

const AUDIT_STORE_SHARED  = 'audit_log';
const AUDIT_STORE_REVENUE = 'revenue_audit_log';

const ERROR_KIND_JS        = 'js_error';
const ERROR_KIND_REJECTION = 'unhandled_rejection';
const ERROR_KIND_SYNC      = 'sync_error';

const wasm = () => window.__vdg_wasm;

/**
 * The shared/revenue audit trail. `append` and `appendRevenue` do NOT return a promise — callers
 * must not be able to make a shipment save wait on its own history — so anything that has to
 * observe the trail (a verifier, a clean shutdown) awaits `flush()`.
 */
export function createAuditLog({ getUser, getRole }) {
  let queue = Promise.resolve();

  const enqueue = (store, kind, entityId, op, body, changes, label) => {
    queue = queue
      .then(async () => {
        const w = wasm();
        if (!w?.sync_audit_append) throw new Error('wasm bridge not ready — audit entry not persisted');
        const reply = await w.sync_audit_append({
          store,
          kind,
          entity_id: entityId,
          op,
          body: body ?? null,
          changes: Array.isArray(changes) ? changes : null,
          actor_email: getUser?.()?.email ?? null,
          actor_role: getRole?.() ?? null,
        });
        if (!reply.ok) throw new Error(reply.error || 'audit append failed');
      })
      .catch((err) => {
        console.error(`[audit-log] ${label} failed:`, err); // DEV — one failure must not stall the queue
      });
  };

  const read = async (store, actorEmail = null) => {
    const w = wasm();
    if (!w?.sync_audit_read) return [];
    const reply = await w.sync_audit_read({ store, actor_email: actorEmail });
    return reply.rows;
  };

  return {
    append: (kind, entityId, op, body, changes = null) =>
      enqueue(AUDIT_STORE_SHARED, kind, entityId, op, body, changes, 'append'),
    /// The same entry in the rep's own fork. Reached only from the shipment-audit use-case, which
    /// is the only caller holding a change list already sorted by Rust.
    appendRevenue: (kind, entityId, op, body, changes = null) =>
      enqueue(AUDIT_STORE_REVENUE, kind, entityId, op, body, changes, 'revenue append'),
    flush: () => queue,
    readAll: () => read(AUDIT_STORE_SHARED),
    /// A reader who holds no revenue fork gets [] — that is the CS answer and it is correct.
    readRevenueHistory: () => read(AUDIT_STORE_REVENUE),
    readFiltered: (email) => read(AUDIT_STORE_SHARED, email),
  };
}

/**
 * The user/role compliance trail. Revoking a role fires two back-to-back writes (F-24-11); the
 * same chain keeps them in order without making `write` awaitable.
 */
export function createUserAuditLog({ getUser }) {
  let queue = Promise.resolve();
  return {
    write(action, targetEmail, before, after, driveOps = []) {
      queue = queue
        .then(async () => {
          const w = wasm();
          if (!w?.sync_user_audit_write) throw new Error('wasm bridge not ready — audit entry not persisted');
          const reply = await w.sync_user_audit_write({
            action,
            target_email: targetEmail,
            before: before ?? null,
            after: after ?? null,
            drive_ops: driveOps ?? [],
            actor_email: getUser?.()?.email ?? null,
          });
          if (!reply.ok) throw new Error(reply.error || 'user audit write failed');
        })
        .catch((err) => {
          console.error('[user-audit-log] write failed:', err); // DEV — one failure doesn't block the queue
        });
    },
    flush: () => queue,
    async readAll() {
      const w = wasm();
      if (!w?.sync_user_audit_read) return [];
      return (await w.sync_user_audit_read({})).rows;
    },
  };
}

/**
 * Error log. The browser hooks live here because that is what they are; the two bounds that make
 * the log survivable — no writes while auth is dead, a per-session cap — are in Rust, which is
 * also what carries the counter forward.
 */
export function installErrorLog({ getUser, getVersion }) {
  let authDead = false;
  let sessionCount = 0;

  window.addEventListener(AUTH_DEAD_EVENT,        () => { authDead = true; });
  window.addEventListener(AUTH_RECONNECTED_EVENT, () => { authDead = false; });

  const capture = (kind, msg, stack) => {
    const w = wasm();
    if (!w?.sync_error_capture) return;
    w.sync_error_capture({
      kind,
      msg: String(msg),
      stack: String(stack || ''),
      ua: navigator.userAgent,
      url: location.href,
      build_hash: document.documentElement.dataset.buildHash || '',
      app_version: getVersion?.() ?? null,
      user_email: getUser?.()?.email ?? null,
      auth_dead: authDead,
      session_count: sessionCount,
    })
      .then((reply) => {
        sessionCount = reply.session_count;
        if (reply.error) console.error('[error-log] append failed:', reply.error); // DEV
      })
      .catch((err) => console.error('[error-log] append failed:', err)); // DEV
  };

  window.onerror = (msg, src, line, col, err) => {
    capture(ERROR_KIND_JS, String(msg), err?.stack || `${src}:${line}:${col}`);
    return false; // don't suppress default browser handling
  };

  window.onunhandledrejection = (e) => {
    const reason = e.reason;
    capture(
      ERROR_KIND_REJECTION,
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : '',
    );
  };

  window.addEventListener(SYNC_ERROR_EVENT, (e) => {
    const detail = e.detail || {};
    // H4-f: the event never carried an `id` field (its real shape is {kind, period, reason,
    // error} — tick.rs/outbox.rs's own SYNC_ERROR_EVENT dispatches) — `${detail.kind}
    // ${detail.id}` always rendered "<kind> undefined" in the manager's errors grid. `reason` is
    // the one field every dispatch site always sets (outbox.rs's own quarantine_group omits
    // `error`); prefer the richer `error` text when the dispatch carries one.
    capture(ERROR_KIND_SYNC, `${detail.kind}: ${detail.error || detail.reason || 'unknown'}`, JSON.stringify(detail));
  });
}
