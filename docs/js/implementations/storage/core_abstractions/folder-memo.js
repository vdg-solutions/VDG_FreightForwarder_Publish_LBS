// drive-folder-memo.js — what Drive's own files.create told us, remembered until its index
// agrees (F-42-03). Split out of drive-api.js at the 350-line cap, beside drive-folder-dedup.js.
//
// Drive's files.list index is EVENTUALLY CONSISTENT: a folder whose create call just returned an
// id is absent from a name query for seconds afterwards (measured well past 4s on the LBS
// workspace). That broke Add User outright — the flow created users/{prefix}, assignRole's path
// walk queried for it, got nothing, threw, and the new user was rolled back while the folder
// stayed behind, burning a prefix per attempt.
//
// Retrying the query only trades a hard failure for a slow one. What removes the race is not
// asking: the create response already carried the id. Entries are short-lived — long enough to
// outlast the index lag, short enough that a folder deleted later in the session is not
// resurrected from here.

import { nowMs } from '../../kernel/core_abstractions/ports/clock.js';

const CREATED_FOLDER_TTL_MS = 300_000;

const _folders = new Map(); // `${parentId}/${name}` -> { id, at }

const _key = (parentId, name) => `${parentId}/${name}`;

/// Record a folder id learned from Drive (create response, or a query that did see it).
export function rememberFolder(parentId, name, id) {
  if (id) _folders.set(_key(parentId, name), { id, at: nowMs() });
}

/// The remembered id, or null when nothing was recorded or the record has aged out.
export function recallFolder(parentId, name) {
  const key = _key(parentId, name);
  const hit = _folders.get(key);
  if (!hit) return null;
  if (nowMs() - hit.at > CREATED_FOLDER_TTL_MS) {
    _folders.delete(key);
    return null;
  }
  return hit.id;
}

/// Drop a record — for a folder this session deletes, so a later lookup asks Drive again.
export function forgetFolder(parentId, name) {
  _folders.delete(_key(parentId, name));
}

/// Drop everything. Real Drive never reuses a folder id, so production has no reason to call
/// this; a test that resets its fake Drive does — the fake DOES reuse ids across resets, and a
/// memory of the previous run's ids would answer for folders that no longer exist.
export function clearFolderMemo() {
  _folders.clear();
}

export { CREATED_FOLDER_TTL_MS };
