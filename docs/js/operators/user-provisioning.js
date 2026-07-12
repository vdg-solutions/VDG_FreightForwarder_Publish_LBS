// Operator: user lifecycle (invite, promote, disable, edit)

import { activeWorkspaceName } from './workspace-registry.js';

const KIND_USER            = 'user';
const GRANTS_FILE          = 'permission-grants.jsonl';
const ROLE_SALES           = 'sales';
const ROLE_ADMIN           = 'admin';
const STATUS_ACTIVE        = 'active';
const STATUS_DISABLED      = 'disabled';
const PERM_WRITER          = 'writer';
const USERS_FOLDER         = 'users';
const ADMIN_FOLDER         = 'admin';

// Allowed fields for editProfile
const EDITABLE_FIELDS = ['name', 'sales_code', 'commission_pct_override', 'dunning_threshold_days_override', 'sales_share_pct'];

// ── invite ────────────────────────────────────────────────────────────────────

export async function inviteSales(email, name, driveApi, repo, workspaceRootId) {
  const prefix   = email.split('@')[0].toLowerCase();
  const usersId  = await _ensureFolder(driveApi, workspaceRootId, USERS_FOLDER);
  const existing = await driveApi.findFolder(usersId, prefix);
  const folder   = existing || await driveApi.createFolder(usersId, prefix);
  const perm     = await driveApi.putPermission(folder.id, email, PERM_WRITER);

  const actor    = window.__vdg_auth?.getCurrentUser?.()?.email || 'unknown';
  const now      = new Date().toISOString();

  // Audit grant
  const adminId  = await _findFolder(driveApi, workspaceRootId, ADMIN_FOLDER);
  if (adminId) {
    const grant = {
      ts:           now,
      granted_by:   actor,
      granted_to:   email,
      folder:       `${USERS_FOLDER}/${prefix}/`,
      permission_id: perm.id,
    };
    await _appendGrant(driveApi, adminId, grant);
  }

  const user = {
    id:            `user:${prefix}`,
    email,
    prefix,
    name:          name || prefix,
    role:          ROLE_SALES,
    status:        STATUS_ACTIVE,
    invited_at:    now,
    last_login_at: null,
    folder_id:     folder.id,
    permission_id: perm.id,
    sales_share_pct: null,   // null = use workspace default (50)
  };

  if (repo) {
    await repo.put(KIND_USER, user.id, user);
  }

  return user;
}

// ── promote ───────────────────────────────────────────────────────────────────

export async function promoteToManager(userId, driveApi, repo, adminFolderId) {
  const user = await repo.get(KIND_USER, userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  const perm  = await driveApi.putPermission(adminFolderId, user.email, PERM_WRITER);
  const now   = new Date().toISOString();
  const actor = window.__vdg_auth?.getCurrentUser?.()?.email || 'unknown';

  await repo.put(KIND_USER, userId, { ...user, role: ROLE_ADMIN });

  await _appendGrant(driveApi, adminFolderId, {
    ts:            now,
    granted_by:    actor,
    granted_to:    user.email,
    folder:        ADMIN_FOLDER,
    permission_id: perm.id,
  });
}

// ── disable ───────────────────────────────────────────────────────────────────

export async function disableUser(userId, driveApi, repo) {
  const user = await repo.get(KIND_USER, userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  // Revoke user folder permission
  if (user.folder_id && user.permission_id) {
    await _revokePermission(driveApi, user.folder_id, user.permission_id, user.email);
  }

  // Revoke admin folder permission if admin role
  if (user.role === ROLE_ADMIN && user.admin_permission_id) {
    const wsRoot  = await driveApi.findWorkspaceRoot(activeWorkspaceName());
    const adminId = wsRoot ? await _findFolder(driveApi, wsRoot, ADMIN_FOLDER) : null;
    if (adminId) {
      await _revokePermission(driveApi, adminId, user.admin_permission_id, user.email);
    }
  }

  await repo.put(KIND_USER, userId, {
    ...user,
    status:      STATUS_DISABLED,
    disabled_at: new Date().toISOString(),
  });
}

// ── edit profile ──────────────────────────────────────────────────────────────

export async function editProfile(userId, fields, repo) {
  const user = await repo.get(KIND_USER, userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  const patch = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in fields) patch[key] = fields[key];
  }

  await repo.put(KIND_USER, userId, { ...user, ...patch });
}

// ── internal ──────────────────────────────────────────────────────────────────

async function _ensureFolder(driveApi, parentId, name) {
  const f = await driveApi.findFolder(parentId, name);
  if (f) return f.id;
  const created = await driveApi.createFolder(parentId, name);
  return created.id;
}

async function _findFolder(driveApi, parentId, name) {
  const f = await driveApi.findFolder(parentId, name);
  return f?.id ?? null;
}

async function _revokePermission(driveApi, folderId, permissionId, email) {
  try {
    // Try by stored permission_id first
    await driveApi.driveFetch('DELETE', `/files/${folderId}/permissions/${permissionId}`);
  } catch {
    // Fall back: list permissions and find by email
    try {
      const perms = await driveApi.listPermissions(folderId);
      const match = perms.find((p) => p.emailAddress === email);
      if (match) {
        await driveApi.driveFetch('DELETE', `/files/${folderId}/permissions/${match.id}`);
      }
    } catch (err) {
      console.error('[user-provisioning] revoke fallback failed:', err); // DEV
    }
  }
}

async function _appendGrant(driveApi, adminFolderId, grant) {
  const { serializeJsonlBundle, parseJsonlBundle } = await import('../auth/drive-api.js');
  const q   = `name='${GRANTS_FILE}' and '${adminFolderId}' in parents and trashed=false`;
  try {
    const res  = await driveApi.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const f    = res.files?.[0];
    let   rows = [];
    let   fileId = null;
    let   etag   = null;

    if (f) {
      const data = await driveApi.getFile(f.id);
      if (data) { rows = parseJsonlBundle(data.content); etag = data.etag; fileId = f.id; }
    }
    rows.push(grant);
    const content  = serializeJsonlBundle(rows);
    const uploadId = fileId ?? adminFolderId;
    await driveApi.uploadFile(uploadId, GRANTS_FILE, content, fileId ? etag : null, { isUpdate: Boolean(fileId) });
  } catch (err) {
    console.error('[user-provisioning] grant log failed (non-blocking):', err); // DEV
  }
}
