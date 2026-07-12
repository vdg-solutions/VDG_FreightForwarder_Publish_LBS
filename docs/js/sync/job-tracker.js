// Global Background Job Tracker Service

export class BackgroundJobTracker {
  constructor() {
    this._jobs = {};
    this._listeners = new Set();
    this._onJobProgress = this._onJobProgress.bind(this);
    this._onJobState = this._onJobState.bind(this);
    window.addEventListener('vdg:job-progress', this._onJobProgress);
    window.addEventListener('vdg:job-state', this._onJobState);
  }

  _onJobProgress(e) {
    const { id, name, progress, status, error } = e.detail;
    const existing = this._jobs[id] || {};
    this._jobs[id] = { ...existing, id, name, progress, status, error, updatedAt: Date.now() };
    this._notifyListeners();
  }

  _onJobState(e) {
    // For sync pollers: { id, name, nextRunAt, paused }
    const { id, name, nextRunAt, paused, status, error } = e.detail;
    const existing = this._jobs[id] || {};
    this._jobs[id] = { 
      ...existing, 
      id, 
      name: name || existing.name, 
      nextRunAt: nextRunAt !== undefined ? nextRunAt : existing.nextRunAt,
      paused: paused !== undefined ? paused : existing.paused,
      status: status !== undefined ? status : (existing.status || 'ready'),
      error: error !== undefined ? error : existing.error,
      updatedAt: Date.now() 
    };
    this._notifyListeners();
  }

  getJobs() {
    return Object.values(this._jobs).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  sendCommand(jobId, command) {
    // Dispatch a command event that the specific job will listen for
    window.dispatchEvent(new CustomEvent(`vdg:job-cmd:${jobId}`, { detail: { command } }));
  }

  _notifyListeners() {
    for (const cb of this._listeners) {
      try { cb(this.getJobs()); } catch (err) { console.error('JobTracker listener failed', err); } // DEV
    }
  }

  destroy() {
    window.removeEventListener('vdg:job-progress', this._onJobProgress);
    window.removeEventListener('vdg:job-state', this._onJobState);
    this._listeners.clear();
  }
}

// Singleton instance
export const jobTracker = new BackgroundJobTracker();
window.__vdg_job_tracker = jobTracker;
