// platform/cache.js — extra platform methods the Rust cache use-cases import (js_cache.rs extern type).
//
// Every async method is BOUNDED: a boot migrator that never settles is a boot that never finishes,
// so a stalled call REJECTS ("could not tell", retried next boot) while a real absence resolves to
// null. Keeping those two apart is what stops a stalled read from being read as an empty folder and
// deleting the only copy of a row. Nothing here decides anything — the decisions are in Rust.
//
// cache_get_file/cache_delete_file/cache_trash_file/cache_move_file (the old per-user Drive path —
// js_cache.rs's own CacheStore comment already called it out as dead: "the folder resolver no
// longer points there") are gone with server-drive-shim.js: CacheStore::get_file/delete_file/
// trash_file/move_file have zero callers anywhere in freight_app (only route_prefetch.rs holds a
// `dyn CacheStore`, and it only calls `.list`/`.local_date`) — confirmed dead, not just unused.
// cache_move_file in particular had no CharterDB equivalent to convert to: addParents/removeParents
// is folder membership, and CharterDB records have no folder to be a member of.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../implementations/kernel/core_abstractions/util/safe-await.js';
import { toLocalDateStr } from '../../implementations/kernel/core_abstractions/util/today-local.js';
import { toPricedEnvelope } from '../../implementations/storage/core_abstractions/priced-envelope.js';
import { putShipment } from '../../implementations/ui/core_abstractions/ports/data/shipment-repo.js';
import { pnlLineId } from '../../implementations/ui/core_abstractions/ports/data/pnl-line-id.js';

const repo = () => window.__vdg_repo;
const io   = () => window.__vdg_io;

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

  cache_priced_envelope: async (id, row) => toPricedEnvelope(id, row),
  cache_priced_seed: async (kind, records) => {
    const ref = window.__vdg_priced_repos?.[kind];
    if (!ref) return null; // no governance ref for this kind — nothing to materialize into
    // `{}` and not null: null is reserved for "this kind has no ref at all".
    return (await bounded(ref.seedIfEmpty(records), `cache:priced-seed:${kind}`)) ?? {};
  },

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

  cache_local_date: (ms) => toLocalDateStr(ms),
};
