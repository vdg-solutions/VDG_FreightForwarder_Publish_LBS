// output/web/js.tmp/implementations/storage/core_abstractions/user-repo-port.js
var UserRepoPort = class {
  /** @returns {Promise<object[]>} active users, latest _ledger_version per email */
  async list() {
    throw new Error("abstract");
  }
  /** @returns {Promise<object[]>} ALL users incl. inactive, latest _ledger_version per email
   *  (F-24-04 admin table needs to show + filter deactivated rows, not just hide them) */
  async listAll() {
    throw new Error("abstract");
  }
  /** @returns {Promise<object|null>} */
  async get(email) {
    throw new Error("abstract");
  }
  /** @returns {Promise<{etag: string, noop: boolean}>} */
  async upsert(user) {
    throw new Error("abstract");
  }
  /** @returns {Promise<void>} soft-delete (active:false) — never hard-deletes */
  async remove(email) {
    throw new Error("abstract");
  }
  /** @returns {Promise<void>} bootstrap: seed with current user iff file is empty */
  async ensureSeeded(currentUser) {
    throw new Error("abstract");
  }
};

// output/web/js.tmp/implementations/storage/implementations/repos/user-repo.js
var USER_AUDIT_ADD_USER = "add_user";
var USER_AUDIT_DEACTIVATE_USER = "deactivate_user";
var UserStoreRepo = class extends UserRepoPort {
  constructor(userAuditLog = null) {
    super();
    this._userAuditLog = userAuditLog;
  }
  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.users_list) throw new Error("WASM repo not ready");
    return repo;
  }
  async list() {
    return await this._repo().users_list();
  }
  async listAll() {
    return await this._repo().users_list_all();
  }
  // H4-e: the raw stored shape, no Users-screen projection — see users_list_raw's own doc
  // comment (store::operators::user_store.rs). The workspace backup export's own reach.
  async listRaw() {
    return await this._repo().users_list_raw();
  }
  async get(email) {
    return await this._repo().users_get(email);
  }
  async upsert(user) {
    const result = await this._repo().users_upsert(JSON.stringify(user));
    if (result?.added) {
      this._userAuditLog?.write(USER_AUDIT_ADD_USER, user.email, null, { role: user.role, fork: user.fork }, []);
    }
    return result;
  }
  async remove(email) {
    const result = await this._repo().users_remove(email);
    if (result?.removed) {
      this._userAuditLog?.write(
        USER_AUDIT_DEACTIVATE_USER,
        email,
        { role: result.prev?.role, fork: result.prev?.fork },
        { active: false },
        []
      );
    }
  }
  async ensureSeeded(currentUser) {
    const { activeWorkspaceName } = await import("./workspace-registry-KXGWRUDH.js");
    await this._repo().users_ensure_seeded(
      currentUser.email,
      currentUser.name || "",
      activeWorkspaceName() || ""
    );
  }
};
export {
  UserStoreRepo
};
