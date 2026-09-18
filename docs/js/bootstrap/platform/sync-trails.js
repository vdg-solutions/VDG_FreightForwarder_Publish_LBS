// sync-trails.js — the three append-only trails the workspace keeps about itself, as the rest of
// the app holds them: an object with the same methods it always had. Every entry's SHAPE, its
// hash chain and both gates on the error log are decided in Rust
// (freight_app/operators/sync/{audit_log,user_audit_log,error_log}.rs).
//
// The promise chain is the one thing that stays here: appends are fire-and-forget by contract, and
// two of them in the same tick would otherwise chain off the same tip and branch the history.

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
 * The shared/revenue audit trail. `append` does NOT return a promise — a governance action must
 * not be able to wait on its own history — so anything that has to observe the trail (a verifier,
 * a clean shutdown) awaits `flush()`.
 *
 * A SHIPMENT change no longer comes through here (cas-write-path.md D27): its trail rows are ops
 * in the same intent as the change they describe, so they cannot be written on their own and
 * cannot outlive a refusal. What is left on the write side is the governance trail.
 */
export function createAuditLog({ getUser }) {
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
          // No actor_role: wasm reads the roles off the session principal itself. An audit trail
          // whose subject supplies its own role is not evidence, and JS was passing the session's
          // role TOKEN anyway -- `__MANAGER__` for the owner, an address for everyone else.
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
    flush: () => queue,
    readAll: () => read(AUDIT_STORE_SHARED),
    /// A reader the policy grants no revenue rows gets [] — that is the CS answer and it is correct.
    readRevenueHistory: () => read(AUDIT_STORE_REVENUE),
    readFiltered: (email) => read(AUDIT_STORE_SHARED, email),
  };
}

// No user/role compliance trail reader here. It existed to hand the trail to the admin screen,
// which handed it straight back in to be filtered, ordered and exported; `manager_audit_log_rows`
// reads the trail where it lives. Writing was already the user repo's own business
// (bootstrap/js_repo_user.rs).

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
