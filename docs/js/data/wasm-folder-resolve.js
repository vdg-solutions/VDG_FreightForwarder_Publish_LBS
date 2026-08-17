// wasm-folder-resolve.js — "where does this kind/path live on Drive?", split out of
// wasm-io-adapters.js at the 350-line cap. One responsibility: turn a kind or a path into a
// folder id, by descending from the workspace root when the caller can see it and off the grant
// manifest when they cannot. The port is passed in (`port`) rather than these being methods,
// because none of it touches the port's Drive/ledger duties — only its caches.

import { getOrCreateFolder, findWorkspaceRoot } from '../auth/drive-api.js';
import { activeWorkspaceName } from '../operators/workspace-registry.js';
import { recallGrantAreas } from '../auth/grant-file.js';

// F-37-02: the revenue audit trail is deliberately NOT here. A log inherits the ACL of the thing
// it describes, and revenue history describes a record CS was never granted — listing it as a
// shared log would move `selling_amount: 1000 -> 1200` into the folder CS reads, undoing the split
// without touching the split. It falls through to the per-user fork below, which IS the wall.
// A residue guard in tests/unit/f-37-02-shipment-audit.test.mjs fails the build if it appears here.
export const LOG_KINDS   = ['error_log', 'audit_log'];
export const USERS_PATH   = 'users';

// Only the kinds whose home is neither this user's fork nor the storage registry. Every table
// with a registry row (cache_policy::PER_RECORD_REGISTRY) is addressed by PATH through the
// per-record adapters, so it never reaches this map — the framework already knows where it lives.
// What is left is the two shared LOGS, which are appended bundles rather than tables.
export const KIND_PATH_OVERRIDES = {
  error_log: '_shared/error-log',
  audit_log: '_shared/logs/audit-log',
};

// Resolve each path segment ONCE per session. The boot migrators (seed/master-scope/priced-ref)
// all resolve masters/<kind>, re-doing getOrCreateFolder for the shared 'masters' segment every
// time — dozens of sequential Drive round-trips that blew their 8s bounds on a cold cache. Cache
// per (parentId,name), and dedupe concurrent resolves of the same segment onto one in-flight call.
export async function ensureNestedFolder(port, rootId, path) {
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

export async function resolveFolder(port, kind) {
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
    const prefix = port.userEmail.split('@')[0].toLowerCase();
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
export async function resolveFromManifest(port, kind) {
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
  const prefix = port.userEmail.split('@')[0].toLowerCase();
  const fork   = areas.find((a) => a.path === `${USERS_PATH}/${prefix}`)
              ?? areas.find((a) => a.path.startsWith(`${USERS_PATH}/`) && !a.path.includes('/', USERS_PATH.length + 1));
  if (!fork) return null;
  const id = await ensureNestedFolder(port, fork.folder_id, kind);
  port.folderIds.set(kind, id); port._folderKind.set(id, kind);
  return id;
}

export async function resolveDir(port, dirPath) {
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

export async function resolveDirFromManifest(port, dirPath) {
  const areas = recallGrantAreas();
  if (!areas.length) return null;
  const exact = areas.find((a) => a.path === dirPath);
  if (exact) return exact.folder_id;
  const anchor = areas
    .filter((a) => dirPath.startsWith(`${a.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (!anchor) return null;
  return ensureNestedFolder(port, anchor.folder_id, dirPath.slice(anchor.path.length + 1));
}
