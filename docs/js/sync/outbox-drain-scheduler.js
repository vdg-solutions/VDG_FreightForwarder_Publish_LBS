// Outbox drain trigger scheduler (F-19-80 AC-01/03/09) — the missing wiring. Before this,
// vdg:sync-now / vdg:sync-force-retry had zero listeners and the outbox only ever drained
// once, on the write that enqueued it. Every trigger here routes to the same
// window.__vdg_repo.drain_outbox() (rust process_outbox) — a no-op when the outbox is empty.

export const DRAIN_BACKOFF_STEPS_MS = [30_000, 60_000, 120_000];
export const DRAIN_BACKOFF_CAP_MS   = DRAIN_BACKOFF_STEPS_MS[DRAIN_BACKOFF_STEPS_MS.length - 1];

// AC-03 — bounded, monotone backoff: attempt 0 -> first step, clamps at the cap thereafter.
export function nextBackoffDelay(attempt) {
  const idx = Math.min(Math.max(attempt, 0), DRAIN_BACKOFF_STEPS_MS.length - 1);
  return DRAIN_BACKOFF_STEPS_MS[idx];
}

// AC-01/03/09 — wires every drain trigger (manual sync-now, force-retry, reconnect/online,
// bounded interval) to repo.drain_outbox(). win/getRepo are injectable for node:test; real
// boot uses the real window + window.__vdg_repo.
export function startOutboxDrainScheduler({ win = window, getRepo = () => window.__vdg_repo } = {}) {
  let attempt    = 0;
  let timerId    = null;
  let stopped    = false;
  let suspended  = false; // F-19-84 AC-04 — paused while auth is known-dead, no storm on a dead session

  const drain = () => {
    if (suspended) return;
    const repo = getRepo();
    if (repo?.drain_outbox) repo.drain_outbox();
  };

  const scheduleNext = () => {
    if (stopped || suspended) return;
    const delay = nextBackoffDelay(attempt);
    attempt = Math.min(attempt + 1, DRAIN_BACKOFF_STEPS_MS.length - 1);
    timerId = setTimeout(() => { drain(); scheduleNext(); }, delay);
    timerId?.unref?.(); // never keep the process alive on this alone (Node test env)
  };

  // Any explicit trigger resets the backoff — a fresh user/connectivity signal deserves an
  // immediate attempt, not whatever step the ambient interval had drifted to.
  const onTrigger = () => { attempt = 0; drain(); };

  // F-19-84 AC-04 — suspend on reconnect-needed (clears the pending timer so a dead session
  // never gets re-polled), resume on reconnected (drains once, then resumes the ambient interval).
  const onNeedsReconnect = () => { suspended = true; if (timerId) clearTimeout(timerId); };
  const onReconnected    = () => { suspended = false; attempt = 0; drain(); scheduleNext(); };

  win.addEventListener('vdg:sync-now', onTrigger);
  win.addEventListener('vdg:sync-force-retry', onTrigger);
  win.addEventListener('online', onTrigger);
  win.addEventListener('vdg:auth-needs-reconnect', onNeedsReconnect);
  win.addEventListener('vdg:auth-reconnected', onReconnected);
  scheduleNext();

  return {
    stop() {
      stopped = true;
      if (timerId) clearTimeout(timerId);
      win.removeEventListener('vdg:sync-now', onTrigger);
      win.removeEventListener('vdg:sync-force-retry', onTrigger);
      win.removeEventListener('online', onTrigger);
      win.removeEventListener('vdg:auth-needs-reconnect', onNeedsReconnect);
      win.removeEventListener('vdg:auth-reconnected', onReconnected);
    },
  };
}
