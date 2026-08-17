// Repo-init bootstrap: timeout race, singleton lifecycle, diagnostic emit.
// AC-01: REPO_INIT_TIMEOUT_MS is the single named constant for this timeout.

import { runRepoInitBounded } from './repo-init-steps.js';
import { pushDiag, DIAG_KIND_REPO_INIT_OK, DIAG_KIND_REPO_INIT_TIMEOUT } from './repo-diag.js';
import { visibleDeadline } from '../util/visible-deadline.js';

// Total budget for the render-critical boot chain. 8s was too tight: on a COLD cache the
// wasm-init step downloads the ~2.1MB vdg_freight_bg.wasm and compiles it, then hits Drive for
// the first time — legitimately > 8s on a slow pilot link, so 8s rendered a FALSE "phản hồi
// chậm, thử lại" over a boot that was merely downloading. The #view-loading spinner shows for the
// whole wait, so a longer budget is honest, not a hang. Local/fast steps that SHOULD be quick
// keep their own inner bounds (openVdgDb: IDB_OP_TIMEOUT_MS), so a real jam still fails fast — this
// budget only needs to cover the one legitimately network-bound step.
export const REPO_INIT_TIMEOUT_MS = 30000; // AC-01: only occurrence of this magic number in boot/

export class RepoInitTimeoutError extends Error {
  constructor(step, elapsedMs) {
    super(`Repo init timed out after ${elapsedMs}ms at step: ${step}`);
    this.name      = 'RepoInitTimeoutError';
    this.step      = step;
    this.elapsedMs = elapsedMs;
  }
}

// Module-level singleton registry — AC-06 idempotency
const _singletons = { poller: null, flusher: null, auditLog: null, db: null };

// AC-06: stop prior workers before retry. db is INTENTIONALLY retained (IDB reuse).
function disposePriorSingletons() {
  try { _singletons.poller?.stop?.(); }
  catch (e) { console.warn('[repo-init] poller stop failed:', e); } // DEV
  try { _singletons.flusher?.destroy?.(); }
  catch (e) { console.warn('[repo-init] flusher destroy failed:', e); } // DEV
  _singletons.poller   = null;
  _singletons.flusher  = null;
  _singletons.auditLog = null;
}

// Run the post-OAuth repo-init chain. Throws RepoInitTimeoutError if bounded phase
// exceeds REPO_INIT_TIMEOUT_MS. Safe to call repeatedly (retry) — AC-06.
// bootFn = bootApp passed from app.js (avoids circular import).
export async function runRepoInit(user, bootFn) {
  disposePriorSingletons();

  const startedAt     = performance.now();
  const stepRef       = { value: 'init' };

  // Measured in VISIBLE time, not wall-clock. A plain setTimeout is deferred in a hidden tab, so
  // this budget once reported `step=wasm-init elapsedMs=382471` - a 30-second timer firing six and
  // a half minutes late. And the right question is not "how long has this taken" but "how long has
  // the PERSON waited": while the tab is hidden nobody is waiting, so that time must not count.
  const deadline = visibleDeadline(
    REPO_INIT_TIMEOUT_MS,
    (visibleMs) => new RepoInitTimeoutError(stepRef.value, visibleMs),
  );
  const timeoutPromise = deadline.promise;

  // AC-06: pass existing db so retry reuses open IDBDatabase; callback fires on first open
  const innerPromise = runRepoInitBounded(
    user, stepRef, bootFn, _singletons.db,
    (db) => { _singletons.db = db; },
  );

  try {
    const singletons = await Promise.race([innerPromise, timeoutPromise]);
    deadline.cancel();
    if (singletons) {
      _singletons.db       = singletons.db;
      _singletons.poller   = singletons.poller;
      _singletons.flusher  = singletons.flusher;
      _singletons.auditLog = singletons.auditLog;
    }
    const elapsedMs = Math.round(performance.now() - startedAt);
    // AC-08: observable success signal
    console.info(`[repo-init-ok] elapsedMs=${elapsedMs}`); // DEV
    pushDiag({ kind: DIAG_KIND_REPO_INIT_OK, step: stepRef.value, elapsedMs,
               ts: new Date().toISOString() });
  } catch (err) {
    deadline.cancel();
    if (err?.name === 'RepoInitTimeoutError') {
      // AC-04: telemetry on timeout
      console.warn(`[repo-init-timeout] step=${err.step} elapsedMs=${err.elapsedMs}`); // DEV
      pushDiag({ kind: DIAG_KIND_REPO_INIT_TIMEOUT, step: err.step,
                 elapsedMs: err.elapsedMs, ts: new Date().toISOString(),
                 errorName: err.name });
    }
    throw err;
  }
}
