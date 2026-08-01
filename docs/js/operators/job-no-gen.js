// Job No generation — F-32-01
// Format: REP_CODE(4) + LOCAL_SEQ(6) = 10 digits, no separator, no year element.
// Generated 100% locally (no network call) — nextLocalSeq is scoped by REP_CODE and mirrors
// shipment-ref-gen.js::nextSeq's local repo.list max+1 pattern, reused verbatim.
// Uniqueness: cross-rep by construction (REP_CODE is globally unique, see rep-code-registry.js);
// within-rep by max-of-own-records+1 (cannot repeat a value this device already wrote).

const REP_CODE_LEN  = 4;
const LOCAL_SEQ_LEN  = 6;

export const JOB_NO_REGEX = /^\d{4}\d{6}$/;

// session guard: prevents seq reuse when two calls land in the same repo.list snapshot window
const _sessionSeq = new Map(); // repCode → maxSeqUsed

// (repCode, localSeq) → '0007000042'
export function formatJobNo(repCode, localSeq) {
  return `${repCode}${String(localSeq).padStart(LOCAL_SEQ_LEN, '0')}`;
}

// Query local repo + session max for this rep code, return max + 1. The session slot is
// claimed SYNCHRONOUSLY before the repo.list await (not after) — two calls issued in the
// same tick each bump _sessionSeq before either yields, so neither can observe the other's
// stale pre-await value. Reconciled against repoMax on resume in case a synced-in record
// from another device already advanced past the provisional claim.
export async function nextLocalSeq(repo, repCode) {
  if (!repo) return 1;
  const provisional = (_sessionSeq.get(repCode) || 0) + 1;
  _sessionSeq.set(repCode, provisional); // claim before the await — guards same-tick concurrency
  let repoMax = 0;
  try {
    const all = await repo.list('shipment', (s) => {
      const jobNo = s.job_no || '';
      return jobNo.startsWith(repCode) && jobNo.length === REP_CODE_LEN + LOCAL_SEQ_LEN;
    });
    for (const s of all) {
      const seq = parseInt(s.job_no.slice(REP_CODE_LEN), 10);
      if (!Number.isNaN(seq) && seq > repoMax) repoMax = seq;
    }
  } catch { /* repo unavailable — use the provisional claim */ }
  if (repoMax >= provisional) {
    // repo already carries a higher seq (another device's write synced in) — jump past it.
    const seq = repoMax + 1;
    _sessionSeq.set(repCode, seq);
    return seq;
  }
  return provisional;
}

export async function assignJobNo(repo, repCode) {
  const seq = await nextLocalSeq(repo, repCode);
  return formatJobNo(repCode, seq);
}
