// UserAuditLog — append-only admin/user-audit-log.jsonl (F-24-06). Compliance trail for
// user/role changes: assign/change/revoke role + add/deactivate user. Single file, kept
// indefinitely (backlog notes yearly rollover as a post-Phase-1 follow-up).
// Pattern: audit-log.js (F-19-21 hardened) — fire-and-forget write(), uploadFile with
// isUpdate keyed off fileId presence (F-19-22 mandatory).
//
// F-24-11: revokeRole fires 2 back-to-back writes (deactivate_user from UserDriveRepo.remove,
// revoke_role from RoleAssignmentService.revokeRole) against the same file. Unserialized, the
// 2nd write reads the etag before the 1st's PATCH lands -> 412 CAS conflict -> entry lost. A
// per-instance promise chain serializes writes so every caller's entry actually lands, without
// changing the fire-and-forget public contract (write() still returns undefined).

const ADMIN_FOLDER_NAME = 'admin';
const AUDIT_FILE_NAME   = 'user-audit-log.jsonl';

export class UserAuditLog {
  constructor(driveApi, getCurrentUser, findWorkspaceRootFn) {
    this._api      = driveApi;
    this._getUser  = getCurrentUser;
    this._findRoot = findWorkspaceRootFn;
    this._folderId = null;
    this._file     = null; // { id, etag }
    this._queue    = Promise.resolve(); // F-24-11: serialize concurrent writes
  }

  // fire-and-forget — callers do NOT await (mirrors audit-log.js::append). Internally
  // chained onto _queue so concurrent callers append in order instead of racing on etag.
  write(action, targetEmail, before, after, driveOps = []) {
    this._queue = this._queue
      .then(() => this._writeAsync(action, targetEmail, before, after, driveOps))
      .catch((err) => {
        console.error('[user-audit-log] write failed:', err); // DEV — one failure doesn't block the queue
      });
  }

  async readAll() {
    const folderId = await this._ensureFolder();
    const entry     = this._file ?? await this._findFile(folderId);
    if (!entry) return [];
    const data = await this._api.getFile(entry.id);
    if (!data) return [];
    const { parseJsonlBundle } = await import('../auth/drive-api.js');
    return parseJsonlBundle(data.content);
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
    if (repo) {
      await repo.put('user_audit_log', record.id, record);
    }
  }

  async _findFile(folderId) {
    const q   = `name='${AUDIT_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
    const res = await this._api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const f   = res?.files?.[0] ?? null;
    return f ? { id: f.id, etag: null } : null;
  }

  async _ensureFolder() {
    if (this._folderId) return this._folderId;
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    const folder = await this._api.getOrCreateFolder(root, ADMIN_FOLDER_NAME);
    this._folderId = folder.id;
    return this._folderId;
  }
}
