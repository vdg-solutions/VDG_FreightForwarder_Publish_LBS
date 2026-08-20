// wasm-folder-resolve.js — "where does this kind/path live on Drive?", split out of
// wasm-io-adapters.js at the 350-line cap. One responsibility: turn a kind or a path into a
// folder id, by descending from the workspace root when the caller can see it and off the grant
// manifest when they cannot. The port is passed in (`port`) rather than these being methods,
// because none of it touches the port's Drive/ledger duties — only its caches.

import { getOrCreateFolder, findWorkspaceRoot } from '../../core_abstractions/storage-api.js';
import { USERS_PATH, KIND_PATH_OVERRIDES } from '../../core_abstractions/storage-layout.js';
import { readGrant } from '../../core_abstractions/grant-reader.js';
import { activeWorkspaceName } from '../../core_abstractions/workspace-registry.js';
import { recallGrantAreas } from '../../core_abstractions/grant-file.js';
import { emailPrefix } from '../../../kernel/core_abstractions/util/email-prefix.js';

// Where the shared logs and the users tree live is contract: storage/core_abstractions/storage-layout.js.

// Resolve each path segment ONCE per session. The boot migrators (seed/master-scope/priced-ref)
// all resolve masters/<kind>, re-doing getOrCreateFolder for the shared 'masters' segment every
// time — dozens of sequential Drive round-trips that blew their 8s bounds on a cold cache. Cache
// per (parentId,name), and dedupe concurrent resolves of the same segment onto one in-flight call.
async function ensureNestedFolder(port, rootId, path) {
  let current = rootId;
  for (const part of path.split('/')) {
    const key = `${current}/${part}`;
    let id = port._pathSegment.get(key);
    if (!id) {
      let inflight = port._segInflight.get(key);
      if (!inflight) {
        inflight = getOrCreateFolder(current, part).then((f) => f.id).finally(() => port._segInflight.delete(key));
        port._segInflight.set(key, inflight);
      }
      id = await inflight;
      port._pathSegment.set(key, id);
    }
    current = id;
  }
  return current;
}

async function resolveFolder(port, kind) {
  if (port.folderIds.has(kind)) return port.folderIds.get(kind);
  const rootId = await findWorkspaceRoot(activeWorkspaceName());
  if (!rootId) {
    // E-43: an employee holds no permission on the workspace root — `resolve_grants` never emits
    // it, and granting it would inherit read into every table. So there is nothing to descend
    // from, and Drive will not help: a `'<root>' in parents` list from an account that cannot
    // read the root returns 200 with an EMPTY array. The manifest in their grant file carries the
    // folder ids the manager resolved when granting, which is the only map they have.
    const viaManifest = await resolveFromManifest(port, kind);
    if (viaManifest) return viaManifest;
    throw new Error('Workspace root not found');
  }

  let folderId;
  // An explicit override wins outright: it is the only way to say "this kind does NOT live
  // in the signed-in user's fork".
  if (KIND_PATH_OVERRIDES[kind]) {
    folderId = await ensureNestedFolder(port, rootId, KIND_PATH_OVERRIDES[kind]);
  } else {
    const prefix = emailPrefix(port.userEmail);
    folderId = await ensureNestedFolder(port, rootId, `${USERS_PATH}/${prefix}/${kind}`);
  }
  port.folderIds.set(kind, folderId);
  port._folderKind.set(folderId, kind);
  return folderId;
}

/// The employee route: find this kind's folder among the ids the manager wrote into the grant
/// file. The manifest is keyed by the SAME path the fan-out granted, so the match is exact — no
/// name search, and no ambiguity between two folders that share a leaf name, which a name
/// lookup cannot tell apart.
///
/// A kind that lives in this user's own fork (`users/<prefix>/<kind>`) resolves off the fork
/// entry: the fork itself is granted, so its children can be created and listed from there.
async function resolveFromManifest(port, kind) {
  const areas = recallGrantAreas();
  if (!areas.length) return null;

  const kindPath = KIND_PATH_OVERRIDES[kind] ?? null;
  if (kindPath) {
    // Same anchor rule the path-addressed adapters use — one implementation, so a kind and a
    // raw path can never disagree about which folder they mean.
    const id = await resolveDirFromManifest(port, kindPath);
    if (!id) return null;
    port.folderIds.set(kind, id); port._folderKind.set(id, kind);
    return id;
  }

  // Per-user kind: its home is this user's own fork.
  const prefix = emailPrefix(port.userEmail);
  const fork   = areas.find((a) => a.path === `${USERS_PATH}/${prefix}`)
              ?? areas.find((a) => a.path.startsWith(`${USERS_PATH}/`) && !a.path.includes('/', USERS_PATH.length + 1));
  if (!fork) return null;
  const id = await ensureNestedFolder(port, fork.folder_id, kind);
  port.folderIds.set(kind, id); port._folderKind.set(id, kind);
  return id;
}

async function resolveDir(port, dirPath) {
  const rootId = await findWorkspaceRoot(activeWorkspaceName());
  if (rootId) return ensureNestedFolder(port, rootId, dirPath);
  // E-43: the ws_* adapters address folders by PATH, not by kind, so they needed the manifest
  // route too. Without it `resolveFolder` worked and every path-addressed write still died —
  // measured: a shipment saved locally and its per-record flush failed at ws_read_file with the
  // whole outbox behind it. The anchor is the LONGEST granted prefix, so a specific grant always
  // beats a shorter ancestor, and the remainder is walked from there.
  const viaManifest = await resolveDirFromManifest(port, dirPath);
  if (viaManifest) return viaManifest;
  throw new Error('Workspace root not found');
}

async function resolveDirFromManifest(port, dirPath, allowRefresh = true) {
  const areas = recallGrantAreas();
  const anchorIn = (list) => {
    const exact = list.find((a) => a.path === dirPath);
    if (exact) return { folder_id: exact.folder_id, rest: '' };
    const a = list
      .filter((x) => dirPath.startsWith(`${x.path}/`))
      .sort((x, y) => y.path.length - x.path.length)[0];
    return a ? { folder_id: a.folder_id, rest: dirPath.slice(a.path.length + 1) } : null;
  };

  const hit = areas.length ? anchorIn(areas) : null;
  if (hit) return hit.rest ? ensureNestedFolder(port, hit.folder_id, hit.rest) : hit.folder_id;

  // The manifest is a CACHE of folder ids, and a table's home can MOVE. When it does, an employee
  // holding no permission on the root has a map that no longer names the place — measured live:
  // the roster moved to `roster/`, the manifest still said `admin`, and every screen that needed a
  // colleague's name died with "Workspace root not found".
  //
  // Moving a table is two moves: the DATA and the PERMISSION. The manager's re-grant republishes
  // the grant file; this is the other half — re-read it before failing, so a client heals itself
  // instead of waiting for someone to notice. Once per session: a path that is genuinely not
  // granted must still fail fast, not re-fetch on every call.
  if (!allowRefresh || _manifestRefreshed) return null;
  _manifestRefreshed = true;
  const fresh = await _refreshManifest(port);
  if (!fresh.length) return null;
  const retry = anchorIn(fresh);
  if (!retry) return null;
  return retry.rest ? ensureNestedFolder(port, retry.folder_id, retry.rest) : retry.folder_id;
}

/// One re-read of this user's grant file, per session. Returns the areas it now names.
let _manifestRefreshed = false;

async function _refreshManifest(port) {
  try {
    const { rememberGrantAreas } = await import('../../core_abstractions/grant-file.js');
    const email = String(port.userEmail || '');
    const grant = await readGrant(activeWorkspaceName(), emailPrefix(email), email);
    const areas = grant?.areas ?? [];
    rememberGrantAreas(areas);
    // The ids just changed under every cached resolution, so the memo has to go with them.
    port.folderIds.clear();
    port._pathSegment.clear();
    return areas;
  } catch (err) {
    console.warn('[folder-resolve] grant refresh failed:', err.message); // DEV — next boot retries
    return [];
  }
}

/// Test seam: a fresh session starts having refreshed nothing.
function _resetManifestRefresh() { _manifestRefreshed = false; }

/// What the storage bootstrap binds behind the folder-resolve port.
export const folderResolver = { resolveFolder, resolveFromManifest, ensureNestedFolder, resolveDir, resolveDirFromManifest, _resetManifestRefresh };
