// UserDriveRepo — Drive-backed admin/users.jsonl envelope store (F-24-02).
// Pattern: fx-rate-drive-repo.js (JSONL read/rewrite + folder-id cache) blended with
// ledger-drive-repo.js (etag-CAS retry -> ConcurrencyError on conflicting admin writes).

import { UserRepoPort } from '../abstractions/user-repo-port.js';
import {
  parseJsonlBundle, serializeJsonlBundle,
  DriveApiError, ConcurrencyError,
} from '../auth/drive-api.js';

const ADMIN_FOLDER_NAME            = 'admin';
const USERS_FILE_NAME              = 'users.jsonl';
const USERS_APPEND_MAX_ATTEMPTS    = 3;
const USERS_APPEND_BACKOFF_BASE_MS = 200; // 200ms, 400ms, 800ms (exponential)
const SEED_ROLE_MANAGER            = 'Manager';

// F-24-06 user-audit-log.jsonl action vocabulary (canonical schema)
const USER_AUDIT_ADD_USER        = 'add_user';
const USER_AUDIT_DEACTIVATE_USER = 'deactivate_user';

export class UserDriveRepo extends UserRepoPort {
  constructor(driveApi, findWorkspaceRootFn, userAuditLog = null) {
    super();
    this._api           = driveApi;
    this._findRoot      = findWorkspaceRootFn;
    this._userAuditLog  = userAuditLog;
    this._adminFolderId = null;
    this._file          = null; // { id, etag } for admin/users.jsonl
  }

  /// AC-01: latest _ledger_version per email, active-only.
  async list() {
    const { items } = await this._loadUsersBundle();
    return [..._latestByEmail(items).values()].filter((u) => u.active);
  }

  /// F-24-04: admin table needs deactivated rows too — list() hides them for the ACL/runtime
  /// path, this returns the full latest-per-email set so the UI can show + filter active/inactive.
  async listAll() {
    const { items } = await this._loadUsersBundle();
    return [..._latestByEmail(items).values()];
  }

  /// AC-03: routed through list() — a soft-removed (active:false) user resolves to null.
  async get(email) {
    const users = await this.list();
    return users.find((u) => u.email === email) ?? null;
  }

  /// AC-02/AC-06: appends a bumped-version line only when content actually changed.
  async upsert(user) {
    return this._appendIfChanged(user);
  }

  /// AC-03: soft-delete — never removes the audit trail, just appends an active:false line.
  async remove(email) {
    const { items } = await this._loadUsersBundle();
    const existing = _latestByEmail(items).get(email);
    if (!existing || existing.active === false) return; // nothing to remove
    const { _ledger_version, ...rest } = existing;
    await this._appendIfChanged({ ...rest, active: false });
    this._userAuditLog?.write(
      USER_AUDIT_DEACTIVATE_USER,
      email,
      { role: existing.role, sales_prefix: existing.sales_prefix },
      { active: false },
      [],
    );
  }

  /// AC-04: bootstrap — seed admin/users.jsonl with the signing-in manager iff the file is
  /// still empty. Never overwrites once any line exists (mirrors ledger ensureSeedFiles).
  async ensureSeeded(currentUser) {
    const { items } = await this._loadUsersBundle();
    if (items.length) return;
    await this._appendIfChanged({
      email:        currentUser.email,
      display_name: currentUser.name || currentUser.email,
      role:         SEED_ROLE_MANAGER,
      sales_prefix: null,
      created_at:   new Date().toISOString(),
      active:       true,
    });
  }

  // ── private ──────────────────────────────────────────────────────────────

  /// Read-modify-write with etag-CAS retry (F-23-02 pattern) — skips the upload entirely
  /// when the latest envelope for this email already matches (idempotent upsert).
  async _appendIfChanged(user, attempt = 0) {
    if (attempt >= USERS_APPEND_MAX_ATTEMPTS) {
      throw new ConcurrencyError('users', 'upsert', USERS_APPEND_MAX_ATTEMPTS);
    }

    const { items, fileId, etag, folderId } = await this._loadUsersBundle();
    const existing = _latestByEmail(items).get(user.email);
    if (existing && _sameContent(existing, user)) return { etag, noop: true };

    const nextVersion = (existing?._ledger_version || 0) + 1;
    items.push({ ...user, _ledger_version: nextVersion });

    try {
      const content    = serializeJsonlBundle(items);
      const uploadId   = fileId ?? folderId; // POST uses folderId as parent; PATCH uses fileId
      const uploadEtag = fileId ? etag : null;
      // F-19-22: fileId presence (not etag) decides PATCH vs POST.
      const result     = await this._api.uploadFile(uploadId, USERS_FILE_NAME, content, uploadEtag, { isUpdate: Boolean(fileId) });
      this._file = { id: result.id, etag: result.etag };
      if (!existing) {
        this._userAuditLog?.write(USER_AUDIT_ADD_USER, user.email, null, { role: user.role, sales_prefix: user.sales_prefix }, []);
      }
      return { etag: result.etag, noop: false };
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 412) {
        this._file = null; // stale etag — reload + retry
        await this._sleep(USERS_APPEND_BACKOFF_BASE_MS * 2 ** attempt);
        return this._appendIfChanged(user, attempt + 1);
      }
      throw err;
    }
  }

  async _loadUsersBundle() {
    const folderId  = await this._ensureAdminFolder();
    const fileEntry = this._file ?? await this._findUsersFile(folderId);
    if (!fileEntry) return { items: [], fileId: null, etag: null, folderId };

    const data = await this._api.getFile(fileEntry.id);
    if (!data) return { items: [], fileId: null, etag: null, folderId };

    const etag = data.etag || fileEntry.etag || null;
    this._file = { id: fileEntry.id, etag };
    return { items: parseJsonlBundle(data.content), fileId: fileEntry.id, etag, folderId };
  }

  async _findUsersFile(folderId) {
    const q     = `name='${USERS_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
    const res   = await this._api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const entry = res?.files?.[0] ?? null;
    return entry ? { id: entry.id, etag: null } : null;
  }

  async _ensureAdminFolder() {
    if (this._adminFolderId) return this._adminFolderId;
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    const folder = await this._api.getOrCreateFolder(root, ADMIN_FOLDER_NAME);
    this._adminFolderId = folder.id;
    return this._adminFolderId;
  }

  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}

// ── module-level helpers ─────────────────────────────────────────────────────

function _latestByEmail(items) {
  const latest = new Map();
  for (const line of items) {
    const prev = latest.get(line.email);
    if (!prev || (line._ledger_version || 0) > (prev._ledger_version || 0)) latest.set(line.email, line);
  }
  return latest;
}

/// True if every field in `next` matches the corresponding field on `existing`
/// (ignoring the envelope's own version counter).
function _sameContent(existing, next) {
  const { _ledger_version, ...prevFields } = existing;
  const keys = new Set([...Object.keys(prevFields), ...Object.keys(next)]);
  for (const key of keys) {
    if (prevFields[key] !== next[key]) return false;
  }
  return true;
}
