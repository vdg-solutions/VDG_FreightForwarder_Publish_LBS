// sync-schedulers.js — the timers and window events behind the sync group. Thin by construction:
// each handler hands the carried state and the event that just happened to Rust
// (freight_app/operators/sync/{delta_tick,outbox_drain,job_tracker}.rs) and does exactly what
// comes back. No delay, no backoff step and no jobs-panel field is decided here.

const JOB_PROGRESS_EVENT = 'vdg:job-progress';
const JOB_STATE_EVENT    = 'vdg:job-state';
const JOB_CMD_PREFIX     = 'vdg:job-cmd:';
const DELTA_JOB_ID       = 'sync-delta';

const DRAIN_TRIGGER_EVENTS  = ['vdg:sync-now', 'vdg:sync-force-retry', 'online'];
const AUTH_DEAD_EVENT       = 'vdg:auth-needs-reconnect';
const AUTH_RECONNECTED_EVENT = 'vdg:auth-reconnected';

const DELTA_COMMANDS = { pause: 'cmd_pause', resume: 'cmd_resume', run_now: 'cmd_run_now' };

const wasm = () => window.__vdg_wasm;

// ── background job tracker ────────────────────────────────────────────────────
// Listens from module load: a job that reports before the panel is opened must still show up.
// The merge itself waits for wasm, which is live long before any job runs.

let _jobMap = {};
let _jobRows = [];
const _listeners = new Set();

function _foldJobEvent(event, detail) {
  const w = wasm();
  if (!w?.sync_job_event) return;
  const reply = w.sync_job_event({ jobs: _jobMap, event, detail: detail || {}, now_ms: Date.now() });
  _jobMap  = reply.map;
  _jobRows = reply.jobs;
  for (const cb of _listeners) {
    try { cb(_jobRows); } catch (err) { console.error('[job-tracker] listener failed', err); } // DEV
  }
}

window.addEventListener(JOB_PROGRESS_EVENT, (e) => _foldJobEvent('progress', e.detail));
window.addEventListener(JOB_STATE_EVENT,    (e) => _foldJobEvent('state', e.detail));

export const jobTracker = {
  getJobs: () => _jobRows,
  subscribe(callback) {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
  },
  sendCommand(jobId, command) {
    window.dispatchEvent(new CustomEvent(`${JOB_CMD_PREFIX}${jobId}`, { detail: { command } }));
  },
};
window.__vdg_job_tracker = jobTracker;

// `next_run_at: null` is Rust for "no next run"; the panel's merge reads an ABSENT key as
// "unchanged", so the key is omitted rather than sent as null.
function _announce(jobState) {
  const detail = { id: jobState.id, name: jobState.name, paused: jobState.paused, status: jobState.status };
  if (jobState.next_run_at !== null && jobState.next_run_at !== undefined) detail.nextRunAt = jobState.next_run_at;
  window.dispatchEvent(new CustomEvent(JOB_STATE_EVENT, { detail }));
}

// ── delta tick ────────────────────────────────────────────────────────────────
// The 30s pull over store's delta engine (repo.sync_delta). The hourly Drive-quota check
// rides one of these ticks — Rust says which.

export function startDeltaTick({ getRepo = () => window.__vdg_repo } = {}) {
  let state = {};
  let timer = null;

  const tick = async () => {
    try {
      const repo = getRepo();
      if (repo?.sync_delta) await repo.sync_delta();
      apply('tick_ok');
    } catch (err) {
      console.warn('[delta-tick] tick failed, backing off:', err?.message ?? err); // DEV
      apply('tick_err');
    }
  };

  const apply = (event) => {
    const w = wasm();
    if (!w?.sync_delta_tick_plan) return;
    const plan = w.sync_delta_tick_plan({ state, event, now_ms: Date.now() });
    state = plan.state;
    if (plan.clear_timer) clearTimeout(timer);
    if (plan.job_state) _announce(plan.job_state);
    if (plan.check_quota) {
      w.sync_quota_check({}).catch(() => { /* headroom chip is best-effort; next hour retries */ });
    }
    if (plan.schedule_ms !== null && plan.schedule_ms !== undefined) {
      timer = setTimeout(tick, plan.schedule_ms);
      timer?.unref?.();
    }
    if (plan.run_tick) tick();
  };

  const onVisibility = () => apply(document.hidden ? 'hidden' : 'visible');
  const onCommand    = (e) => {
    const event = DELTA_COMMANDS[e.detail?.command];
    if (event) apply(event);
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener(`${JOB_CMD_PREFIX}${DELTA_JOB_ID}`, onCommand);
  apply('start');

  return {
    stop() {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(`${JOB_CMD_PREFIX}${DELTA_JOB_ID}`, onCommand);
      apply('stop');
    },
  };
}

// ── outbox drain ──────────────────────────────────────────────────────────────
// Every trigger — the manual "Đồng bộ", a force retry, coming back online, the ambient interval —
// routes to the same repo.drain_outbox(), a no-op on an empty outbox.

export function startOutboxDrain({ win = window, getRepo = () => window.__vdg_repo } = {}) {
  let state = {};
  let timer = null;

  const apply = (event) => {
    const w = wasm();
    if (!w?.sync_drain_plan) return;
    const plan = w.sync_drain_plan({ state, event });
    state = plan.state;
    if (plan.clear_timer) clearTimeout(timer);
    if (plan.drain) {
      const repo = getRepo();
      if (repo?.drain_outbox) repo.drain_outbox();
    }
    if (plan.schedule_ms !== null && plan.schedule_ms !== undefined) {
      timer = setTimeout(() => apply('timer'), plan.schedule_ms);
      timer?.unref?.(); // never keep the process alive on this alone
    }
  };

  const onTrigger        = () => apply('trigger');
  const onNeedsReconnect = () => apply('needs_reconnect');
  const onReconnected    = () => apply('reconnected');

  for (const name of DRAIN_TRIGGER_EVENTS) win.addEventListener(name, onTrigger);
  win.addEventListener(AUTH_DEAD_EVENT, onNeedsReconnect);
  win.addEventListener(AUTH_RECONNECTED_EVENT, onReconnected);
  apply('start');

  return {
    stop() {
      apply('stop');
      for (const name of DRAIN_TRIGGER_EVENTS) win.removeEventListener(name, onTrigger);
      win.removeEventListener(AUTH_DEAD_EVENT, onNeedsReconnect);
      win.removeEventListener(AUTH_RECONNECTED_EVENT, onReconnected);
    },
  };
}

// ── server health chip ───────────────────────────────────────────────────────
// F-58-02: used to ride every Changes-feed page inside the delta engine (server-io-adapters.js),
// roughly doubling its HTTP volume for a signal that only needs to move a few times a minute. One
// slow independent timer instead — the io port's poll_health() already dispatches vdg:server-health
// itself, so this owns nothing but the interval.
const HEALTH_POLL_MS = 60_000;

export function startHealthPoll({ getIo = () => window.__vdg_io } = {}) {
  const tick = () => { getIo()?.poll_health?.().catch(() => {}); };
  tick();
  const timer = setInterval(tick, HEALTH_POLL_MS);
  timer?.unref?.();
  return { stop() { clearInterval(timer); } };
}
