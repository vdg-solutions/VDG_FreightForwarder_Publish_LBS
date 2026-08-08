// Delta tick — thin 30s scheduler for the WASM delta engine (repo.sync_delta()).
// Every sync DECISION (cursor, change interpretation, version compare, reconcile, events)
// lives in Rust (data_repo/sync_delta.rs). This file owns only: the timer, page-visibility
// pause, the jobs-panel contract (vdg:job-state / vdg:job-cmd:sync-delta), backoff on a
// failed tick, and the hourly Drive-quota piggyback. Replaces the retired DeltaPoller.

import { checkDriveQuota } from './drive-quota.js';

const DELTA_TICK_MS        = 30_000;
const BACKOFF_STEPS_MS     = [30_000, 60_000, 120_000];
const QUOTA_PIGGYBACK_TICK = 120; // check quota once per ~60min (120 × 30s ticks)
const JOB_ID               = 'sync-delta';

export class DeltaTick {
  constructor(driveApi, getRepo = () => window.__vdg_repo) {
    this._api          = driveApi;
    this._getRepo      = getRepo;
    this._timer        = null;
    this._paused       = false; // system visibility pause
    this._userPaused   = false; // user explicit pause
    this._backoffIdx   = 0;
    this._tickCount    = 0;
    this._onVisibility = () => this._handleVisibility();
    this._onCommand    = (e) => this._handleCommand(e);
  }

  start() {
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener(`vdg:job-cmd:${JOB_ID}`, this._onCommand);
    this._schedule(0);
  }

  stop() {
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener(`vdg:job-cmd:${JOB_ID}`, this._onCommand);
    clearTimeout(this._timer);
    this._timer  = null;
    this._paused = false;
    this._reportState();
  }

  // ── private ────────────────────────────────────────────────────────────────

  _reportState(nextRunDelay = null) {
    const nextRunAt = nextRunDelay !== null ? Date.now() + nextRunDelay : undefined;
    window.dispatchEvent(new CustomEvent('vdg:job-state', {
      detail: {
        id: JOB_ID,
        name: 'Sync Changes (Delta)',
        nextRunAt,
        paused: this._userPaused,
        status: (this._paused || this._userPaused) ? 'ready' : (nextRunDelay === 0 ? 'running' : 'ready')
      }
    }));
  }

  _handleCommand(e) {
    const cmd = e.detail.command;
    if (cmd === 'pause') {
      this._userPaused = true;
      clearTimeout(this._timer);
      this._reportState();
    } else if (cmd === 'resume') {
      this._userPaused = false;
      this._reportState(0);
      this._schedule(0);
    } else if (cmd === 'run_now') {
      if (this._userPaused) return; // ignore if paused
      clearTimeout(this._timer);
      this._backoffIdx = 0;
      this._reportState(0);
      this._schedule(0);
    }
  }

  _schedule(delay) {
    clearTimeout(this._timer);
    if (this._userPaused) return; // user paused overrides schedule
    this._reportState(delay);
    this._timer = setTimeout(() => this._tick(), delay);
  }

  _handleVisibility() {
    if (this._userPaused) return;
    if (document.hidden) {
      clearTimeout(this._timer);
      this._paused = true;
      this._reportState();
    } else {
      this._paused = false;
      // _tick() schedules itself — DELTA_TICK_MS on success, the current backoff step on
      // failure. No trailing _schedule() here or a backed-off tick would snap back to 30s
      // the moment the user switches tabs (F-57-01).
      this._tick();
    }
  }

  async _tick() {
    try {
      const repo = this._getRepo();
      if (repo?.sync_delta) await repo.sync_delta();
      this._backoffIdx = 0;
      this._tickCount += 1;
      if (this._tickCount % QUOTA_PIGGYBACK_TICK === 0) {
        checkDriveQuota(this._api).catch(() => { /* quota chip is best-effort, next hour retries */ });
      }
      if (!this._paused) this._schedule(DELTA_TICK_MS);
    } catch (err) {
      const delay = BACKOFF_STEPS_MS[Math.min(this._backoffIdx, BACKOFF_STEPS_MS.length - 1)];
      console.warn(`[delta-tick] ${new Date().toISOString()} error, retry in ${delay}ms:`, err.message); // DEV
      this._backoffIdx = Math.min(this._backoffIdx + 1, BACKOFF_STEPS_MS.length - 1);
      if (!this._paused) this._schedule(delay);
    }
  }
}
