// UserAuditLog — append-only compliance trail for user/role changes: assign/change/revoke
// role + add/deactivate user (F-24-06). Repo-backed (F-29-08): write() -> repo.put, readAll()
// -> repo.list, same store both ends — Class-5 (immutable, one authoritative copy).
//
// F-24-11: revokeRole fires 2 back-to-back writes (deactivate_user from UserDriveRepo.remove,
// revoke_role from RoleAssignmentService.revokeRole). A per-instance promise chain serializes
// writes so both land in order, without changing the fire-and-forget public contract (write()
// still returns undefined).

export class UserAuditLog {
  constructor(getCurrentUser) {
    this._getUser = getCurrentUser;
    this._queue   = Promise.resolve(); // F-24-11: serialize concurrent writes
  }

  // fire-and-forget — callers do NOT await (mirrors audit-log.js::append). Internally
  // chained onto _queue so concurrent callers append in order instead of racing.
  write(action, targetEmail, before, after, driveOps = []) {
    this._queue = this._queue
      .then(() => this._writeAsync(action, targetEmail, before, after, driveOps))
      .catch((err) => {
        console.error('[user-audit-log] write failed:', err); // DEV — one failure doesn't block the queue
      });
  }

  async readAll() {
    const repo = window.__vdg_repo;
    if (!repo) return []; // read: nothing to lose, honest empty
    const records = await repo.list('user_audit_log', null);
    return records.filter((r) => !r._deleted); // parity with views/manager/audit.js
  }

  // ── private ────────────────────────────────────────────────────────────────

  async _writeAsync(action, targetEmail, before, after, driveOps) {
    const user   = this._getUser?.() || {};
    const record = {
      id:           `UAU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts:           new Date().toISOString(),
      actor_email:  user.email || 'unknown',
      action,
      target_email: targetEmail,
      before:       before ?? null,
      after:        after ?? null,
      drive_ops:    driveOps ?? [],
    };

    const repo = window.__vdg_repo;
    if (!repo) throw new Error('[user-audit-log] repo unavailable — audit entry not persisted');
    await repo.put('user_audit_log', record.id, record);
  }
}
