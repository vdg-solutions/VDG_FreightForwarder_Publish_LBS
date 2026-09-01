// output/web/js.tmp/bootstrap/platform/sync-trails.js
var AUTH_DEAD_EVENT = "vdg:auth-needs-reconnect";
var AUTH_RECONNECTED_EVENT = "vdg:auth-reconnected";
var SYNC_ERROR_EVENT = "vdg:sync-error";
var AUDIT_STORE_SHARED = "audit_log";
var AUDIT_STORE_REVENUE = "revenue_audit_log";
var ERROR_KIND_JS = "js_error";
var ERROR_KIND_REJECTION = "unhandled_rejection";
var ERROR_KIND_SYNC = "sync_error";
var wasm = () => window.__vdg_wasm;
function createAuditLog({ getUser, getRole }) {
  let queue = Promise.resolve();
  const enqueue = (store, kind, entityId, op, body, changes, label) => {
    queue = queue.then(async () => {
      const w = wasm();
      if (!w?.sync_audit_append) throw new Error("wasm bridge not ready \u2014 audit entry not persisted");
      const reply = await w.sync_audit_append({
        store,
        kind,
        entity_id: entityId,
        op,
        body: body ?? null,
        changes: Array.isArray(changes) ? changes : null,
        actor_email: getUser?.()?.email ?? null,
        actor_role: getRole?.() ?? null
      });
      if (!reply.ok) throw new Error(reply.error || "audit append failed");
    }).catch((err) => {
      console.error(`[audit-log] ${label} failed:`, err);
    });
  };
  const read = async (store, actorEmail = null) => {
    const w = wasm();
    if (!w?.sync_audit_read) return [];
    const reply = await w.sync_audit_read({ store, actor_email: actorEmail });
    return reply.rows;
  };
  return {
    append: (kind, entityId, op, body, changes = null) => enqueue(AUDIT_STORE_SHARED, kind, entityId, op, body, changes, "append"),
    /// The same entry in the rep's own fork. Reached only from the shipment-audit use-case, which
    /// is the only caller holding a change list already sorted by Rust.
    appendRevenue: (kind, entityId, op, body, changes = null) => enqueue(AUDIT_STORE_REVENUE, kind, entityId, op, body, changes, "revenue append"),
    flush: () => queue,
    readAll: () => read(AUDIT_STORE_SHARED),
    /// A reader who holds no revenue fork gets [] — that is the CS answer and it is correct.
    readRevenueHistory: () => read(AUDIT_STORE_REVENUE),
    readFiltered: (email) => read(AUDIT_STORE_SHARED, email)
  };
}
function createUserAuditLog({ getUser }) {
  let queue = Promise.resolve();
  return {
    write(action, targetEmail, before, after) {
      queue = queue.then(async () => {
        const w = wasm();
        if (!w?.sync_user_audit_write) throw new Error("wasm bridge not ready \u2014 audit entry not persisted");
        const reply = await w.sync_user_audit_write({
          action,
          target_email: targetEmail,
          before: before ?? null,
          after: after ?? null,
          actor_email: getUser?.()?.email ?? null
        });
        if (!reply.ok) throw new Error(reply.error || "user audit write failed");
      }).catch((err) => {
        console.error("[user-audit-log] write failed:", err);
      });
    },
    flush: () => queue,
    async readAll() {
      const w = wasm();
      if (!w?.sync_user_audit_read) return [];
      return (await w.sync_user_audit_read({})).rows;
    }
  };
}
function installErrorLog({ getUser, getVersion }) {
  let authDead = false;
  let sessionCount = 0;
  window.addEventListener(AUTH_DEAD_EVENT, () => {
    authDead = true;
  });
  window.addEventListener(AUTH_RECONNECTED_EVENT, () => {
    authDead = false;
  });
  const capture = (kind, msg, stack) => {
    const w = wasm();
    if (!w?.sync_error_capture) return;
    w.sync_error_capture({
      kind,
      msg: String(msg),
      stack: String(stack || ""),
      ua: navigator.userAgent,
      url: location.href,
      build_hash: document.documentElement.dataset.buildHash || "",
      app_version: getVersion?.() ?? null,
      user_email: getUser?.()?.email ?? null,
      auth_dead: authDead,
      session_count: sessionCount
    }).then((reply) => {
      sessionCount = reply.session_count;
      if (reply.error) console.error("[error-log] append failed:", reply.error);
    }).catch((err) => console.error("[error-log] append failed:", err));
  };
  window.onerror = (msg, src, line, col, err) => {
    capture(ERROR_KIND_JS, String(msg), err?.stack || `${src}:${line}:${col}`);
    return false;
  };
  window.onunhandledrejection = (e) => {
    const reason = e.reason;
    capture(
      ERROR_KIND_REJECTION,
      reason instanceof Error ? reason.message : String(reason),
      reason instanceof Error ? reason.stack : ""
    );
  };
  window.addEventListener(SYNC_ERROR_EVENT, (e) => {
    const detail = e.detail || {};
    capture(ERROR_KIND_SYNC, `${detail.kind}: ${detail.error || detail.reason || "unknown"}`, JSON.stringify(detail));
  });
}
export {
  createAuditLog,
  createUserAuditLog,
  installErrorLog
};
