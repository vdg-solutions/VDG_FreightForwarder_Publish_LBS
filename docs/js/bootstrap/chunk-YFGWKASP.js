// output/web/js.tmp/bootstrap/platform/sync-schedulers.js
var JOB_PROGRESS_EVENT = "vdg:job-progress";
var JOB_STATE_EVENT = "vdg:job-state";
var JOB_CMD_PREFIX = "vdg:job-cmd:";
var DELTA_JOB_ID = "sync-delta";
var DRAIN_TRIGGER_EVENTS = ["vdg:sync-now", "vdg:sync-force-retry", "online"];
var AUTH_DEAD_EVENT = "vdg:auth-needs-reconnect";
var AUTH_RECONNECTED_EVENT = "vdg:auth-reconnected";
var DELTA_COMMANDS = { pause: "cmd_pause", resume: "cmd_resume", run_now: "cmd_run_now" };
var wasm = () => window.__vdg_wasm;
var _jobMap = {};
var _jobRows = [];
var _listeners = /* @__PURE__ */ new Set();
function _foldJobEvent(event, detail) {
  const w = wasm();
  if (!w?.sync_job_event) return;
  const reply = w.sync_job_event({ jobs: _jobMap, event, detail: detail || {}, now_ms: Date.now() });
  _jobMap = reply.map;
  _jobRows = reply.jobs;
  for (const cb of _listeners) {
    try {
      cb(_jobRows);
    } catch (err) {
      console.error("[job-tracker] listener failed", err);
    }
  }
}
window.addEventListener(JOB_PROGRESS_EVENT, (e) => _foldJobEvent("progress", e.detail));
window.addEventListener(JOB_STATE_EVENT, (e) => _foldJobEvent("state", e.detail));
var jobTracker = {
  getJobs: () => _jobRows,
  subscribe(callback) {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
  },
  sendCommand(jobId, command) {
    window.dispatchEvent(new CustomEvent(`${JOB_CMD_PREFIX}${jobId}`, { detail: { command } }));
  }
};
window.__vdg_job_tracker = jobTracker;
function _announce(jobState) {
  const detail = { id: jobState.id, name: jobState.name, paused: jobState.paused, status: jobState.status };
  if (jobState.next_run_at !== null && jobState.next_run_at !== void 0) detail.nextRunAt = jobState.next_run_at;
  window.dispatchEvent(new CustomEvent(JOB_STATE_EVENT, { detail }));
}
function startDeltaTick({ getRepo = () => window.__vdg_repo } = {}) {
  let state = {};
  let timer = null;
  const tick = async () => {
    try {
      const repo = getRepo();
      if (repo?.sync_delta) await repo.sync_delta();
      apply("tick_ok");
    } catch (err) {
      console.warn("[delta-tick] tick failed, backing off:", err?.message ?? err);
      apply("tick_err");
    }
  };
  const apply = (event) => {
    const w = wasm();
    if (!w?.sync_delta_tick_plan) return;
    const plan = w.sync_delta_tick_plan({ state, event, now_ms: Date.now() });
    state = plan.state;
    if (plan.clear_timer) clearTimeout(timer);
    if (plan.job_state) _announce(plan.job_state);
    if (plan.schedule_ms !== null && plan.schedule_ms !== void 0) {
      timer = setTimeout(tick, plan.schedule_ms);
      timer?.unref?.();
    }
    if (plan.run_tick) tick();
  };
  const onVisibility = () => apply(document.hidden ? "hidden" : "visible");
  const onCommand = (e) => {
    const event = DELTA_COMMANDS[e.detail?.command];
    if (event) apply(event);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener(`${JOB_CMD_PREFIX}${DELTA_JOB_ID}`, onCommand);
  apply("start");
  return {
    stop() {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(`${JOB_CMD_PREFIX}${DELTA_JOB_ID}`, onCommand);
      apply("stop");
    }
  };
}
function startOutboxDrain({ win = window, getRepo = () => window.__vdg_repo } = {}) {
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
    if (plan.schedule_ms !== null && plan.schedule_ms !== void 0) {
      timer = setTimeout(() => apply("timer"), plan.schedule_ms);
      timer?.unref?.();
    }
  };
  const onTrigger = () => apply("trigger");
  const onNeedsReconnect = () => apply("needs_reconnect");
  const onReconnected = () => apply("reconnected");
  for (const name of DRAIN_TRIGGER_EVENTS) win.addEventListener(name, onTrigger);
  win.addEventListener(AUTH_DEAD_EVENT, onNeedsReconnect);
  win.addEventListener(AUTH_RECONNECTED_EVENT, onReconnected);
  apply("start");
  return {
    stop() {
      apply("stop");
      for (const name of DRAIN_TRIGGER_EVENTS) win.removeEventListener(name, onTrigger);
      win.removeEventListener(AUTH_DEAD_EVENT, onNeedsReconnect);
      win.removeEventListener(AUTH_RECONNECTED_EVENT, onReconnected);
    }
  };
}
var HEALTH_POLL_MS = 6e4;
var HEALTH_EVENT = "vdg:server-health";
function startHealthPoll({ getWasm = () => window.__vdg_wasm } = {}) {
  const tick = () => {
    const poll = getWasm()?.server_health_poll;
    if (!poll) return;
    poll().then((detail) => {
      if (detail) window.dispatchEvent(new CustomEvent(HEALTH_EVENT, { detail }));
    }).catch((e) => {
      console.warn("[VDG] health poll failed:", e?.message || e);
    });
  };
  tick();
  const timer = setInterval(tick, HEALTH_POLL_MS);
  timer?.unref?.();
  return { stop() {
    clearInterval(timer);
  } };
}

export {
  jobTracker,
  startDeltaTick,
  startOutboxDrain,
  startHealthPoll
};
