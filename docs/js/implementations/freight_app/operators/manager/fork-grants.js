// fork-grants.js — F-37-05. Granting a path whose wildcard is in the MIDDLE.
//
// `users/*` is one grant on the `users` folder, and Drive inherits it downward — including to forks
// created LATER. `users/*/billing_published` cannot work that way: it names one subfolder of every
// fork, and each of those is a separate file. So the grant is a CROSS PRODUCT, and it has to be
// maintained from both ends:
//
//   a new Accountant  -> grant them billing_published in every fork that already exists
//   a new sales rep   -> grant their billing_published to every Accountant that already exists
//
// Do only the first and an Accountant hired on Monday silently stops seeing anyone hired after
// Monday. Nothing errors; the invoices just never arrive. That asymmetry is the whole reason this
// module exists rather than one more line in the ACL table.
//
// WHO gets it is not decided here. Rust answers that (`permission_resolve_grants`), and this module
// asks the same function about each existing user rather than keeping its own list of roles — a
// second list is how "Auditor reads published billing too" gets forgotten on one side only.
//
// CS needs none of this: CS holds nothing on any fork by design, which is exactly what keeps them
// out of revenue. The cross product is only for roles that read a NAMED SUBFOLDER of every fork.

const WILDCARD_SEGMENT  = '*';
const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const DRIVE_ROLE_READER = 'reader';
const DRIVE_ROLE_WRITER = 'writer';
const ACCESS_WRITE      = 'write';

/**
 * Splits `users/&#42;/billing_published` into `{ parent: 'users', tail: 'billing_published' }`.
 * Null when the path has no interior wildcard — including `users/&#42;`, which is a trailing one and
 * resolves to a single folder.
 */
function splitInteriorWildcard(path) {
  const marker = `/${WILDCARD_SEGMENT}/`;
  const at = String(path ?? '').indexOf(marker);
  if (at < 0) return null;
  return { parent: path.slice(0, at), tail: path.slice(at + marker.length) };
}

function driveRoleFor(access) {
  return access === ACCESS_WRITE ? DRIVE_ROLE_WRITER : DRIVE_ROLE_READER;
}

async function forkFolders(api, parentId) {
  const children = typeof api.listChildren === 'function' ? await api.listChildren(parentId) : [];
  return children.filter((c) => c.mimeType === DRIVE_FOLDER_MIME);
}

/**
 * The subfolder is created if absent.
 *
 * A rep who has never published has no `billing_published` folder yet, and granting a folder that
 * does not exist fails. Skipping instead would mean the grant silently never happens and the first
 * thing that rep publishes is invisible — the failure would surface as missing money, weeks later.
 */
async function ensureSubfolder(api, forkId, tail) {
  let current = forkId;
  for (const segment of tail.split('/').filter(Boolean)) {
    const folder = await api.getOrCreateFolder(current, segment);
    current = folder.id;
  }
  return current;
}

async function grantOne(api, folderId, email, driveRole) {
  const perms = await api.listPermissions(folderId);
  if (perms.some((p) => p.emailAddress === email && p.role === driveRole)) return null;
  const perm = await api.putPermission(folderId, email, driveRole);
  return { folderId, permissionId: perm.id };
}

/** One reader, every fork. Used when the person holding the wildcard entry is assigned. */
async function grantAcrossForks(api, resolvePath, rootId, email, entry) {
  const parts = splitInteriorWildcard(entry.path);
  if (!parts) return [];
  const parentId = await resolvePath(api, rootId, parts.parent);
  const role     = driveRoleFor(entry.access);

  const granted = [];
  for (const fork of await forkFolders(api, parentId)) {
    const folderId = await ensureSubfolder(api, fork.id, parts.tail);
    const result   = await grantOne(api, folderId, email, role);
    if (result) granted.push(result);
  }
  return granted;
}

async function revokeAcrossForks(api, resolvePath, rootId, email, entry) {
  const parts = splitInteriorWildcard(entry.path);
  if (!parts) return;
  const parentId = await resolvePath(api, rootId, parts.parent);

  for (const fork of await forkFolders(api, parentId)) {
    const folderId = await ensureSubfolder(api, fork.id, parts.tail);
    const perms    = await api.listPermissions(folderId);
    const match    = perms.find((p) => p.emailAddress === email);
    if (match) await api.deletePermission(folderId, match.id);
  }
}

/**
 * The other direction: one NEW fork, every reader who already holds a wildcard entry.
 *
 * `resolveAcl(user)` is asked per user rather than filtering by a role list kept here, so the set
 * of roles that read published billing is stated once, in Rust.
 */
async function grantNewForkToReaders(api, resolvePath, resolveAcl, users, rootId, newPrefix) {
  if (!newPrefix) return [];

  const granted = [];
  for (const user of users) {
    if (!user?.email) continue;
    for (const entry of await resolveAcl(user)) {
      const parts = splitInteriorWildcard(entry.path);
      if (!parts) continue;
      const parentId = await resolvePath(api, rootId, parts.parent);
      const fork     = await api.listChildFolder(parentId, newPrefix);
      if (!fork) continue;   // the fork is created by its owner's own grant, which runs first
      const folderId = await ensureSubfolder(api, fork.id, parts.tail);
      const result   = await grantOne(api, folderId, user.email, driveRoleFor(entry.access));
      if (result) granted.push(result);
    }
  }
  return granted;
}

/// The operator, bound behind core_abstractions/ports/fork-grants.js by the freight_app bootstrap.
export const forkGrants = { splitInteriorWildcard, grantAcrossForks, revokeAcrossForks, grantNewForkToReaders };
