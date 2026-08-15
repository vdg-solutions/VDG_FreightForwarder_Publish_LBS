// F-17-03 — workspace root resolution + rename. Split out of drive-api.js (350-line cap);
// re-exported from there so `driveApi.findWorkspaceRoot` keeps working for every caller.

import { driveFetch, findFolder, FOLDER_MIME } from './drive-api.js';
import { globalOwnerQuery, dedupeGlobalOwnerFolders } from './drive-folder-dedup.js';

// Legacy-only: used by onboarding's checkWorkspaceExists() to offer a one-time migrate/bind
// prompt for a pre-license folder (greenfield rule — NOT a fallback for findWorkspaceRoot).
export const WORKSPACE_NAME = (() => {
  const raw = 'LBS';
  return raw.startsWith('WORKSPACE_NAME_') ? 'LBS' : raw;
})();

// F-42-07: the tenant's ACTUAL Drive folder, stamped into the bundle at publish time from
// tenants/<id>.json. Until this existed a tenant build carried only a NAME, and every signed-in
// account resolved that name against ITS OWN Drive, owner-first — so a user who happened to own a
// folder called "LBS" was bound to their own private folder instead of the customer's workspace,
// and the first-run rule ("admin/ not seeded → the creator is Manager") then made them Manager of
// it. Observed live: sol.vdg01 opening the customer's published build landed in sol.vdg01's own
// retired LBS folder. A name is a search term; identity is an id.
const BUILD_ROOT_ID = (() => {
  const raw = '17hMgfvZLnPTfuB8A-HTSyk1t-ytxcVoU';
  return raw.startsWith('WORKSPACE_ROOT_ID_') ? '' : raw; // unsubstituted = dev build, resolve by name
})();

const DRIVE_ROOT_PARENT_ID = 'root';

// F-24-20: Drive query boolean term for "shared to me, not owned by me" — named so the
// query string composition below isn't an opaque literal concat.
const SHARED_WITH_ME_CLAUSE = 'sharedWithMe';

// F-24-20: separate from globalOwnerQuery on purpose — that query is consumed unchanged by
// repo-init-steps.js's owner-wide orphan re-count (AC-02) and must stay owner-only. This
// query is owner-blind by design and its result is NEVER fed to dedupeGlobalOwnerFolders,
// moveToParent, or any delete helper — the signed-in user does not own a shared folder, so
// this app must never reparent or trash it.
async function sharedWorkspaceQuery(name) {
  const q = `name='${name}' and ${SHARED_WITH_ME_CLAUSE} and mimeType='${FOLDER_MIME}' and trashed=false`;
  return (await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`)).files || [];
}

// PM decision (F-17-03): the workspace registry is the SOLE source of `name` — no
// localStorage read here, no hardcoded fallback. A missing name means NOT_PROVISIONED;
// resolve to null WITHOUT probing Drive. globalOwnerQuery only ever queries the signed-in
// user's OWN Drive, so a fallback could never bind another company's folder — the only
// hazard it would reopen is one user holding several workspaces in a single Drive and
// binding the wrong one (F-17-05).
//
// F-24-19 contract: `null` means exactly one thing — the query ran and no such folder
// exists. A missing Drive scope, a transport failure, a 5xx, a quota error are NOT that;
// each is an error and MUST reach the caller. A blanket catch here previously mapped all of
// them to null, which boot read as "workspace absent" and answered by CREATING a second
// workspace folder — the duplicate-folder class dedupeGlobalOwnerFolders exists to clean up.
// No catch: errors propagate. (dedupeGlobalOwnerFolders keeps its own narrow, documented
// /files/root-404 degradation — that is a specific classify step, not an error swallow.)
// Session-memoized. The root's id is stable for the whole session, but resolving it costs 2-3
// Drive round-trips (globalOwnerQuery + dedupe + shared fallback). It was UNCACHED and called on
// every kind's first folder-resolve (WasmIoPort._resolveFolder), so a cold boot re-resolved the
// SAME root a dozen times over → dozens of sequential Drive calls → repo reads (fsm-rehydrate,
// seed-migrator, the shipments view) all blew their 8/12s bounds at once. Cache a single in-flight
// promise per name; only a REAL hit is kept — a null (not-yet-provisioned) or an error re-resolves
// so a just-created / transiently-unreachable workspace is still picked up.
const _rootCache = new Map(); // name → Promise<rootId|null>
export function findWorkspaceRoot(name) {
  if (!name) return Promise.resolve(null);
  const cached = _rootCache.get(name);
  if (cached) return cached;
  const p = _resolveWorkspaceRoot(name).then(
    (id)  => { if (!id) _rootCache.delete(name); return id; },
    (err) => { _rootCache.delete(name); throw err; },
  );
  _rootCache.set(name, p);
  return p;
}

// Test/boot seam: after first-run provisioning creates the workspace, drop the cached null so the
// post-provision reload resolves the freshly-created root.
export function resetWorkspaceRootCache() { _rootCache.clear(); }

// The root the app is BOUND to is identity, not a search result. Once a root has resolved, its
// id is pinned here and later sessions verify the pin with one files.get instead of re-running
// the owner-wide search — because the search is a name lookup, and a name is forgeable by
// accident: a QA-created duplicate "LBS" folder won the blind lowest-id pick (drive.file scope
// cannot classify parents) and the whole app silently bound an empty shadow workspace, reading
// as "chưa ai cấp quyền" for the OWNER. The pin only lets go when Drive itself says the folder
// is gone (404/trashed) — a transient error propagates rather than unbinding.
const ROOT_PIN_PREFIX = 'vdg.workspace.root_id.';

function _readRootPin(name)      { try { return localStorage.getItem(ROOT_PIN_PREFIX + name); } catch { return null; /* storage-less context (tests) — resolve by search */ } }
function _writeRootPin(name, id) { try { localStorage.setItem(ROOT_PIN_PREFIX + name, id); } catch { /* storage-less context — nothing to pin */ } }
function _clearRootPin(name)     { try { localStorage.removeItem(ROOT_PIN_PREFIX + name); } catch { /* already absent */ } }

async function _verifyPinnedRoot(id) {
  const res = await driveFetch('GET', `/files/${id}?fields=id,trashed`);
  return res && res.trashed !== true ? id : null;
}

async function _resolveWorkspaceRoot(name) {
  // F-42-07: a tenant build IS bound to one folder. Verify it and stop — no pin, no name search,
  // no shared fallback. Those three exist to FIND a workspace; here we already know which one,
  // and every one of them is a way to be bound to the wrong Drive. Cannot see it (403/404 under
  // drive.file) = not a member of this tenant: answer null and let the caller fall through to the
  // employee fork path, exactly as an unshared root does today.
  if (BUILD_ROOT_ID) {
    try {
      return await _verifyPinnedRoot(BUILD_ROOT_ID);
    } catch (err) {
      if (err?.status === 404 || err?.status === 403) return null;
      throw err; // transient carries no verdict — never silently unbind the tenant
    }
  }

  const pinned = _readRootPin(name);
  if (pinned) {
    try {
      const ok = await _verifyPinnedRoot(pinned);
      if (ok) return ok;
      _clearRootPin(name); // Drive answered: the pinned folder is gone — fall to search
    } catch (err) {
      // 404 is an answer (folder gone); anything else carries no verdict and must propagate —
      // unbinding on a transient is how a workspace flips identity mid-flight.
      if (err?.status === 404) _clearRootPin(name);
      else throw err;
    }
  }

  const found = await globalOwnerQuery(driveFetch, name);
  const winner = found.length > 1
    ? await _pickSeededRoot(found) ?? await dedupeGlobalOwnerFolders(driveFetch, found, DRIVE_ROOT_PARENT_ID)
    : await dedupeGlobalOwnerFolders(driveFetch, found, DRIVE_ROOT_PARENT_ID);
  if (winner) { _writeRootPin(name, winner.id); return winner.id; }

  // AC-01/AC-03: not owned by the signed-in user — check whether it was shared instead.
  const shared = await findSharedSubfolder(name);
  if (shared) _writeRootPin(name, shared);
  return shared;
}

// Several same-name candidates and no pin: the real workspace is the one that has been
// PROVISIONED — its admin/ holds users.jsonl. A shell that merely shares the name (empty
// skeleton, backup, accident) must never win on id order. Ties break to the oldest folder;
// nothing is deleted here — cleanup stays with dedupeGlobalOwnerFolders, which only deletes
// what it can actually classify.
async function _pickSeededRoot(found) {
  const seeded = [];
  for (const f of found) {
    try {
      const admin = await findFolder(f.id, 'admin');
      if (!admin) continue;
      const q = `name='users.jsonl' and '${admin.id}' in parents and trashed=false`;
      const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
      if ((res.files || []).length > 0) seeded.push(f);
    } catch { /* unreadable candidate — treated as unseeded, the classified path still runs */ }
  }
  if (seeded.length === 0) return null;
  return seeded.slice().sort((a, b) =>
    String(a.createdTime || '').localeCompare(String(b.createdTime || '')) || a.id.localeCompare(b.id))[0];
}

// F-27-04: resolve a folder shared directly TO the signed-in user by exact name, with no
// root/parent dependency. An employee's users/{prefix} fork is granted to them individually
// (F-27-01 resolve_grants), so it surfaces via sharedWithMe even though the root never does.
// Read-only: pick an id off the list, never dedupe/move/delete (mirrors findWorkspaceRoot).
export async function findSharedSubfolder(name) {
  if (!name) return null;
  const shared = await sharedWorkspaceQuery(name);
  if (shared.length === 0) return null;
  const sorted = shared.slice().sort((a, b) => a.id.localeCompare(b.id));
  return sorted[0].id;
}

// #30: shared FILES whose name starts with `base`. Exact-name lookup is not usable here — a
// colliding prefix gets 4 random digits appended (user_prefix.rs::allocate_prefix), so the user
// cannot know their own fork name at sign-in. They search on what they DO know, the local-part of
// their email, and the grant file itself reports the real user_prefix back.
//
// The mimeType clause is what separates the grant file from the fork folder: both are shared to
// this user and both carry the same name. Drive's `contains` is word-prefix-ish rather than a
// strict startsWith, so the result is filtered again here. Read-only, same rules as
// findSharedSubfolder: never dedupe, move or delete a folder this user does not own.
export async function findSharedFilesByNamePrefix(base) {
  if (!base) return [];
  const q = `name contains '${base}' and ${SHARED_WITH_ME_CLAUSE} and mimeType!='${FOLDER_MIME}' and trashed=false`;
  const res = await driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
  return (res.files || [])
    .filter((f) => typeof f.name === 'string' && f.name.startsWith(base))
    .sort((a, b) => a.name.length - b.name.length || a.id.localeCompare(b.id));
}

export async function listChildFolder(parentId, name) {
  return findFolder(parentId, name);
}

// AC-11: rename an existing folder in place for migrate/bind — children preserved,
// no delete/recreate.
export async function renameFolder(fileId, newName) {
  return driveFetch('PATCH', `/files/${fileId}`, { name: newName });
}
