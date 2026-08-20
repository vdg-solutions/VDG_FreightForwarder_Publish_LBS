// platform/cache.js — extra platform methods the Rust cache use-cases import (js_cache.rs extern type).
//
// Every async method is BOUNDED: a boot migrator that never settles is a boot that never finishes,
// so a stalled call REJECTS ("could not tell", retried next boot) while a real absence resolves to
// null. Keeping those two apart is what stops a stalled read from being read as an empty folder and
// deleting the only copy of a row. Nothing here decides anything — the decisions are in Rust.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { toLocalDateStr } from '../../implementations/kernel/core_abstractions/util/today-local.js';
import { storageApi } from '../../implementations/storage/core_abstractions/storage-api.js';
import { activeWorkspaceName } from '../../implementations/storage/core_abstractions/workspace-registry.js';
import { toPricedEnvelope } from '../../implementations/storage/core_abstractions/priced-envelope.js';
import { retireFile } from '../../implementations/storage/implementations/drive/drive-file-retire.js';
import { putShipment } from '../../implementations/ui/core_abstractions/ports/data/shipment-repo.js';
import { pnlLineId } from '../../implementations/ui/core_abstractions/ports/data/pnl-line-id.js';

const repo = () => window.__vdg_repo;
const io   = () => window.__vdg_io;

// The row-key projection each seed migration declares. Registered by the ui port right before the
// wasm engine runs, because the migration list is the VIEW's declaration — the engine (which ids
// are applied, what a lock means, when a stall retries) is Rust's.
const _seedKeys = new Map();

export function registerSeedKeys(migrations) {
  for (const m of migrations || []) {
    if (m && typeof m.key === 'function') _seedKeys.set(m.id, m.key);
  }
}

async function bounded(promise, tag) {
  const res = await safeAwait(promise, SAFE_AWAIT_DEFAULT_MS, null, tag);
  if (!res.ok) throw res.error || new Error(`cache platform: ${tag} did not settle`);
  return res.value ?? null;
}

export const cachePlatform = {
  cache_get:      (kind, id)       => bounded(repo().get(kind, id), `cache:get:${kind}`),
  cache_list:     (kind)           => bounded(repo().list(kind, null), `cache:list:${kind}`).then((r) => r || []),
  cache_put:      (kind, id, body) => bounded(repo().put(kind, id, body), `cache:put:${kind}`),
  cache_meta_get: (key)            => bounded(io().cache_get_meta(key), `cache:meta-get:${key}`),
  cache_meta_put: (key, body)      => bounded(io().cache_put_meta(key, body), `cache:meta-put:${key}`),

  // A seed file that is not there is not a failure — the kind simply has no bundled data.
  cache_fetch_text: async (url) => {
    const res = await bounded(fetch(url), `cache:seed-fetch:${url}`);
    return res && res.ok ? bounded(res.text(), `cache:seed-body:${url}`) : null;
  },
  cache_seed_key: (migrationId, row) => {
    const key = _seedKeys.get(migrationId);
    return String((key ? key(row) : row?.id) ?? '');
  },

  cache_priced_envelope: async (id, row) => toPricedEnvelope(id, row),
  cache_priced_seed: async (kind, records) => {
    const ref = window.__vdg_priced_repos?.[kind];
    if (!ref) return null; // no governance ref for this kind — nothing to materialize into
    // `{}` and not null: null is reserved for "this kind has no ref at all".
    return (await bounded(ref.seedIfEmpty(records), `cache:priced-seed:${kind}`)) ?? {};
  },

  cache_workspace_root: () => bounded(storageApi().findWorkspaceRoot(activeWorkspaceName()), 'cache:ws-root'),
  cache_find_folder:    (parentId, name) => bounded(storageApi().findFolder(parentId, name), `cache:find-folder:${name}`),
  cache_list_children:  (folderId) => bounded(storageApi().listChildren(folderId), 'cache:list-children').then((r) => r || []),
  cache_get_file:       (fileId) => bounded(storageApi().getFile(fileId), 'cache:get-file'),
  cache_delete_file:    (fileId) => bounded(storageApi().driveFetch('DELETE', `/files/${fileId}`), 'cache:delete-file'),

  // A legacy job goes back through the SPLIT write path — a plain put would land the whole record,
  // revenue included, in the folder CS reads. Lines written before E-37 carry no line_id and the
  // split refuses a line without one, so they are stamped with the scheme the form uses.
  cache_replay_shipment: async (record) => {
    const ref   = record.shipment_ref || record.id;
    const lines = (record.pnl_lines || []).map((ln, i) => ({ line_id: ln.line_id || pnlLineId(ref, i + 1), ...ln }));
    return bounded(putShipment(repo(), { ...record, shipment_ref: ref, pnl_lines: lines }), 'cache:replay-shipment');
  },

  cache_ws_list_dir:  (dir)        => bounded(io().ws_list_dir(dir), `cache:ws-list:${dir}`),
  cache_ws_read_file: (dir, name)  => bounded(io().ws_read_file(dir, name), `cache:ws-read:${dir}`),
  cache_ws_write_file: (dir, name, content, fileId) =>
    bounded(io().ws_write_file(dir, name, content, fileId, ''), `cache:ws-write:${dir}`),

  // Not a plain trash: the account that created a file owns it, and only an owner may trash. A
  // non-owner detaches it from the folder instead.
  cache_trash_file: (fileId, parentId) => bounded(retireFile(storageApi(), fileId, parentId || null), 'cache:trash-file'),
  cache_move_file:  (fileId, addParent, removeParent) => bounded(
    storageApi().driveFetch('PATCH', `/files/${fileId}?addParents=${addParent}&removeParents=${removeParent}`, {}),
    'cache:move-file',
  ),

  cache_local_date: (ms) => toLocalDateStr(ms),
};
