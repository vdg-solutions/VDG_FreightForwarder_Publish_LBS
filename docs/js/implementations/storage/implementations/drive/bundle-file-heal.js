// bundle-file-heal.js — duplicate same-name bundle files merged and collapsed to one winner.
//
// Two concurrent first-writers of a (kind, period) bundle both list an empty folder and both
// POST the same fileName — observed live in _shared/shipments: four `all.jsonl` copies with
// DIVERGENT sizes, plus doubled `2026-07.jsonl`. The folder index then mapped name→id by
// Drive's list order, so one session read/wrote copy A and the next copy B: records looked
// stale or absent depending on which copy a boot happened to resolve, and every rebase against
// the wrong copy manufactured a conflict with nobody on the other side.
//
// Folder-level getOrCreateFolder and the log-shard getOrCreateFile already collapse duplicates
// to the lowest-id winner; bundles must additionally MERGE contents first — deleting a
// divergent copy outright would drop the records only it holds.

import { FOLDER_MIME } from '../../core_abstractions/storage-layout.js';

const JSONL_SUFFIX = '.jsonl';

// Union of several JSONL bundle texts. Records carrying an `id` merge by id — the copy with
// the higher `_rev` wins (tie: newer `_rev_at`); lines that don't parse to an id'd object
// (nothing today, but a bundle must never lose data it doesn't understand) dedup by exact
// text. First-seen order is kept so the winner's layout stays stable.
function mergeBundleContents(texts) {
  const byId = new Map();
  const opaque = [];
  const opaqueSeen = new Set();
  const order = [];

  for (const text of texts) {
    for (const line of String(text ?? '').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let rec = null;
      try { rec = JSON.parse(trimmed); } catch { rec = null; /* opaque line — kept verbatim below */ }
      const id = rec && typeof rec === 'object' && !Array.isArray(rec) ? rec.id : undefined;
      if (id === undefined || id === null) {
        if (!opaqueSeen.has(trimmed)) { opaqueSeen.add(trimmed); opaque.push(trimmed); }
        continue;
      }
      const prev = byId.get(id);
      if (!prev) { byId.set(id, { rec, line: trimmed }); order.push(id); continue; }
      if (_wins(rec, prev.rec)) byId.set(id, { rec, line: trimmed });
    }
  }

  const lines = order.map((id) => byId.get(id).line).concat(opaque);
  return lines.length ? lines.join('\n') + '\n' : '';
}

function _wins(a, b) {
  const revA = Number(a?._rev ?? 0);
  const revB = Number(b?._rev ?? 0);
  if (revA !== revB) return revA > revB;
  return Number(a?._rev_at ?? 0) >= Number(b?._rev_at ?? 0);
}

// Collapse one name's duplicate ids to a single winner. Winner = lowest file id — the same
// deterministic pick as drive-folder-dedup / drive-file-dedup, so every session agrees
// WITHOUT coordination. Contents are unioned into the winner before the losers are trashed.
// Any failure mid-heal degrades to "deterministic winner, losers left in place" — strictly
// better than the list-order flip-flop, and the next boot retries the heal.
async function healDuplicateBundle(driveApi, name, ids) {
  const sorted = ids.slice().sort((a, b) => a.localeCompare(b));
  const winner = sorted[0];
  if (sorted.length === 1) return winner;
  if (!name.endsWith(JSONL_SUFFIX)) return _healWholeDocument(driveApi, name, sorted);

  try {
    const texts = [];
    for (const id of sorted) {
      const data = await driveApi.getFile(id);
      texts.push(data?.content ?? '');
    }
    const merged = mergeBundleContents(texts);
    // No etag CAS on purpose: the heal must win over whichever copy a concurrent writer is
    // still talking to; convergence is re-checked every boot.
    await driveApi.uploadFile(winner, name, merged, null, { isUpdate: true });
    for (const loser of sorted.slice(1)) {
      await driveApi.driveFetch('DELETE', `/files/${loser}`);
    }
  } catch (err) {
    console.warn('[bundle-file-heal] heal failed for', name, '—', err.message); // DEV
  }
  return winner;
}

// A whole-document file (`state.json`) has no line structure to union, so its losers used to be
// left in place forever. Reads stayed consistent — every session resolves the lowest id — but the
// dead copies accumulated on Drive with nothing that would ever collect them, and when a loser
// held the NEWER write the app served stale content and said nothing.
//
// Freshest content (Drive's own modifiedTime — the only ordering a document without a `_rev`
// carries) is adopted into the deterministic winner, then the losers are TRASHED rather than
// deleted: a union we cannot prove is one whose evidence we keep for Drive's 30-day window.
//
// A duplicate FOLDER must never reach that trash — it would take its children with it — and
// getOrCreateFolder already collapses those. Anything whose mimeType does not come back as a
// plain file is left exactly as it was found.
async function _healWholeDocument(driveApi, name, sorted) {
  const winner = sorted[0];
  try {
    const metas = [];
    for (const id of sorted) {
      const meta = await driveApi.driveFetch('GET', `/files/${id}?fields=id,mimeType,modifiedTime`);
      metas.push({ id, mime: meta?.mimeType ?? '', at: Date.parse(meta?.modifiedTime ?? '') || 0 });
    }
    // Unknown mime is not "probably a file" — it is a read that did not answer, and the safe
    // move on an unanswered read is to touch nothing.
    if (!metas.every((m) => m.mime && m.mime !== FOLDER_MIME)) return winner;

    const freshest = metas.reduce((best, m) => (m.at > best.at ? m : best), metas[0]);
    if (freshest.id !== winner) {
      const data = await driveApi.getFile(freshest.id);
      await driveApi.uploadFile(winner, name, data?.content ?? '', null, { isUpdate: true });
    }
    for (const loser of sorted.slice(1)) {
      await driveApi.driveFetch('PATCH', `/files/${loser}`, { trashed: true });
    }
  } catch (err) {
    console.warn('[bundle-file-heal] document heal failed for', name, '—', err.message); // DEV
  }
  return winner;
}

/// What the storage bootstrap binds behind the bundle-heal port.
export const bundleHealer = { healDuplicateBundle, mergeBundleContents };
