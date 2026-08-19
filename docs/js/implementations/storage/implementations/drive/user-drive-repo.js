// UserDriveRepo — facade over the WASM user store (#11 port, F-24-02). Envelope model
// (latest _ledger_version per email), idempotent upsert, CAS retry and soft-delete live in
// data_repo/user_store.rs behind window.__vdg_repo. Audit-log side effects stay here,
// driven by the flags the store returns ({added} / {removed, prev}).

import { UserRepoPort } from '../../core_abstractions/user-repo-port.js';

// F-24-06 user-audit-log.jsonl action vocabulary (canonical schema)
const USER_AUDIT_ADD_USER        = 'add_user';
const USER_AUDIT_DEACTIVATE_USER = 'deactivate_user';

export class UserDriveRepo extends UserRepoPort {
  constructor(userAuditLog = null) {
    super();
    this._userAuditLog = userAuditLog;
  }

  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.users_list) throw new Error('WASM repo not ready');
    return repo;
  }

  /// AC-01: latest _ledger_version per email, active-only.
  async list() {
    return await this._repo().users_list();
  }

  /// F-24-04: full latest-per-email set including deactivated rows (admin table).
  async listAll() {
    return await this._repo().users_list_all();
  }

  /// AC-03: routed through the active view — a soft-removed user resolves to null.
  async get(email) {
    return await this._repo().users_get(email);
  }

  /// AC-02/AC-06: appends a bumped-version line only when content actually changed.
  async upsert(user) {
    const result = await this._repo().users_upsert(JSON.stringify(user));
    if (result?.added) {
      this._userAuditLog?.write(USER_AUDIT_ADD_USER, user.email, null, { role: user.role, user_prefix: user.user_prefix }, []);
    }
    return result;
  }

  /// AC-03: soft-delete — appends an active:false line, audit trail intact.
  async remove(email) {
    const result = await this._repo().users_remove(email);
    if (result?.removed) {
      this._userAuditLog?.write(
        USER_AUDIT_DEACTIVATE_USER,
        email,
        { role: result.prev?.role, user_prefix: result.prev?.user_prefix },
        { active: false },
        [],
      );
    }
  }

  /// Bootstrap — seed `grants/` with the signing-in manager iff still empty. A grant names one
  /// company, so the active workspace goes in with it.
  async ensureSeeded(currentUser) {
    const { activeWorkspaceName } = await import('../../core_abstractions/workspace-registry.js');
    await this._repo().users_ensure_seeded(
      currentUser.email, currentUser.name || '', activeWorkspaceName() || '');
  }
}
