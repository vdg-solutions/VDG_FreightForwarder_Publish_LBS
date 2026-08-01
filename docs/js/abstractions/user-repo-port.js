// Port: user store (`admin/users.jsonl`) — mirrors abstractions/ports/user_repo.rs (F-24-01).
// Phase-1 impl: UserDriveRepo (F-24-02).
export class UserRepoPort {
  /** @returns {Promise<object[]>} active users, latest _ledger_version per email */
  async list() { throw new Error('abstract'); }

  /** @returns {Promise<object[]>} ALL users incl. inactive, latest _ledger_version per email
   *  (F-24-04 admin table needs to show + filter deactivated rows, not just hide them) */
  async listAll() { throw new Error('abstract'); }

  /** @returns {Promise<object|null>} */
  async get(email) { throw new Error('abstract'); }

  /** @returns {Promise<{etag: string, noop: boolean}>} */
  async upsert(user) { throw new Error('abstract'); }

  /** @returns {Promise<void>} soft-delete (active:false) — never hard-deletes */
  async remove(email) { throw new Error('abstract'); }

  /** @returns {Promise<void>} bootstrap: seed with current user iff file is empty */
  async ensureSeeded(currentUser) { throw new Error('abstract'); }
}
