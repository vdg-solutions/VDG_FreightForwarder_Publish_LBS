// jobno-lease.js — F-41-06: Job No mints LOCALLY and cannot collide (owner 2026-08-14).
//
// The counted max+1 could not keep that promise across two clients: both compute the same max,
// both mint the same number, and the post-write heal (F-41-04) only repairs it after the fact.
// This is the HiLo answer over the storage we have: a per-rep-code counter file in
// `_shared/jobno-leases/<repCode>.json` hands each device a disjoint BLOCK of sequence numbers,
// claimed with Drive's real compare-and-swap (files.update + If-Match etag → 412 on a lost
// race). Minting then never touches the network: it takes the next number from the locally-held
// block. Two devices can never overlap because their blocks came from CAS'd increments.
//
// The counter lives under `_shared/` — NOT the rep's fork — because the minter is whoever opens
// the job (CS-first), and CS holds nothing on the rep's fork. Block gaps at the end of an
// abandoned lease are accepted: freight job sequences tolerate small gaps, duplicate legal doc
// numbers tolerate none. When no lease can be had (offline before ever leasing, or a Drive
// response without an ETag), the caller falls back to counted+heal — local-first survives, and
// the heal remains the backstop for exactly that corner.

const SHARED_DIR       = '_shared';
const LEASE_DIR        = 'jobno-leases';
const BLOCK_SIZE       = 50;
const CAS_MAX_ATTEMPTS = 4;
const FIRST_SEQ        = 1;
const LS_PREFIX        = 'vdg.jobno.lease.';

function _defaultStore() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

/** The locally-held block for a rep code: `{ from, to }` (to exclusive), or null. */
export function peekLease(repCode, store = _defaultStore()) {
  if (!store) return null;
  try {
    const raw = store.getItem(LS_PREFIX + repCode);
    if (!raw) return null;
    const { from, to } = JSON.parse(raw);
    return Number.isInteger(from) && Number.isInteger(to) && from < to ? { from, to } : null;
  } catch { return null; /* a corrupt lease reads as no lease — re-acquire */ }
}

export function saveLease(repCode, from, to, store = _defaultStore()) {
  if (!store) return;
  store.setItem(LS_PREFIX + repCode, JSON.stringify({ from, to }));
}

/** Take the next number from the held block — synchronous, zero network. null = block empty. */
export function takeFromLease(repCode, store = _defaultStore()) {
  const lease = peekLease(repCode, store);
  if (!lease) return null;
  const seq = lease.from;
  if (lease.from + 1 >= lease.to) store?.removeItem(LS_PREFIX + repCode);
  else saveLease(repCode, lease.from + 1, lease.to, store);
  return seq;
}

/** Where a fresh counter starts: past everything the repo has already used. Seeding at 1 on a
 *  workspace with existing jobs would lease numbers that are already on printed documents. */
export function seedNext(repoMaxSeq) {
  return Math.max(FIRST_SEQ, (Number(repoMaxSeq) || 0) + 1);
}

/** What the counter should hold after a claim; also guards a corrupt/foreign file body —
 *  a counter that cannot be read as an integer restarts past the repo max, never at 1. */
export function claimRange(rawContent, repoMaxSeq, blockSize = BLOCK_SIZE) {
  let next = null;
  try { next = JSON.parse(rawContent)?.next; } catch { next = null; /* corrupt body — reseed */ }
  const from = Number.isInteger(next) && next >= FIRST_SEQ ? Math.max(next, seedNext(repoMaxSeq)) : seedNext(repoMaxSeq);
  return { from, to: from + blockSize, body: JSON.stringify({ next: from + blockSize }) };
}

/**
 * Claim a block via CAS and hold it locally. Returns `{ from, to }` or null when no lease can
 * be had here (no workspace, no ETag to CAS against, attempts exhausted) — null is the caller's
 * cue to fall back, never an error.
 */
export async function acquireLease(repCode, repoMaxSeq, { blockSize = BLOCK_SIZE, store = _defaultStore() } = {}) {
  try {
    const api = await import('../auth/drive-api.js');
    const { getOrCreateFile } = await import('../auth/drive-file-dedup.js');
    const { activeWorkspaceName } = await import('./workspace-registry.js');

    const wsRoot = await api.findWorkspaceRoot(activeWorkspaceName());
    if (!wsRoot) return null;
    const shared = await api.findFolder(wsRoot, SHARED_DIR);
    if (!shared) return null;
    const dir = await api.getOrCreateFolder(shared.id, LEASE_DIR);
    const fileName = `${repCode}.json`;

    for (let attempt = 0; attempt < CAS_MAX_ATTEMPTS; attempt++) {
      const file = await getOrCreateFile(api.driveFetch, api.uploadFile, dir.id, fileName,
        JSON.stringify({ next: seedNext(repoMaxSeq) }));
      const read = await api.getFile(file.id);
      if (!read?.etag) return null; // nothing to CAS against — the fallback is safer than a blind write
      const { from, to, body } = claimRange(read.content, repoMaxSeq, blockSize);
      try {
        await api.uploadFile(file.id, fileName, body, read.etag, { isUpdate: true });
        saveLease(repCode, from, to, store);
        return { from, to };
      } catch (err) {
        if (err?.status === 412) continue; // lost the race — re-read the moved counter
        return null;
      }
    }
    return null;
  } catch { return null; /* offline / auth gap — the counted fallback carries the mint */ }
}
