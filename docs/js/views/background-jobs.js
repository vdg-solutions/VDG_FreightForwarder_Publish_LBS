import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { jobTracker } from '../sync/job-tracker.js';
import { t } from '../i18n/index.js';

class BackgroundJobsView extends LitElement {
  static properties = {
    _jobs: { type: Array, state: true },
    _now: { type: Number, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this._jobs = jobTracker.getJobs();
    this._unsubscribe = null;
    this._now = Date.now();
    this._clockTimer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = jobTracker.subscribe((jobs) => { this._jobs = jobs; });
    this._clockTimer = setInterval(() => { this._now = Date.now(); }, 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) this._unsubscribe();
    clearInterval(this._clockTimer);
  }

  _formatTime(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleTimeString();
  }

  _formatCountdown(targetMs) {
    if (!targetMs) return '';
    const diff = targetMs - this._now;
    if (diff <= 0) return 'Running soon...';
    const s = Math.ceil(diff / 1000);
    if (s < 60) return `Next run in ${s}s`;
    return `Next run in ${Math.floor(s/60)}m ${s%60}s`;
  }

  _sendCommand(jobId, command) {
    jobTracker.sendCommand(jobId, command);
  }

  render() {
    return html`
      <div class="max-w-4xl mx-auto py-6 px-4 md:px-8">
        <h1 class="text-2xl font-bold text-slate-800 mb-6">${t('bg_jobs.title')}</h1>
        
        ${this._jobs.length === 0 ? html`
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <svg class="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <h3 class="text-slate-600 font-medium">${t('bg_jobs.empty.title')}</h3>
            <p class="text-sm text-slate-500 mt-1">${t('bg_jobs.empty.desc')}</p>
          </div>
        ` : html`
          <div class="grid gap-4">
            ${this._jobs.map(job => {
              const isDone = job.status === 'done' || job.status === 'ready';
              const isError = job.status === 'error';
              const isRunning = !isDone && !isError;
              const isPaused = job.paused;
              const isCyclic = job.nextRunAt !== undefined;
              
              return html`
                <div class="bg-white border ${isError ? 'border-red-200' : 'border-slate-200'} rounded-xl p-5 shadow-sm transition-all hover:shadow-md">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg ${isRunning ? 'bg-blue-50 text-blue-600' : isDone ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'} flex items-center justify-center">
                        ${isRunning ? html`
                          <svg class="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ` : isDone ? html`
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"></path></svg>
                        ` : html`
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                        `}
                      </div>
                      <div>
                        <h3 class="font-semibold text-slate-800">${job.name}</h3>
                        <div class="text-xs text-slate-500 mt-0.5">
                          ${isCyclic && !isPaused && !isRunning ? this._formatCountdown(job.nextRunAt) : `Updated: ${this._formatTime(job.updatedAt)}`}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      ${isCyclic ? html`
                        ${isPaused ? html`
                          <button @click="${() => this._sendCommand(job.id, 'resume')}" class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-emerald-200">
                            Resume
                          </button>
                        ` : html`
                          <button @click="${() => this._sendCommand(job.id, 'pause')}" class="bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border border-amber-200">
                            Pause
                          </button>
                        `}
                        <button @click="${() => this._sendCommand(job.id, 'run_now')}" class="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" ?disabled="${isPaused || isRunning}">
                          Run Now
                        </button>
                      ` : ''}
                      <span class="inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${isPaused ? 'bg-amber-100 text-amber-800' : isRunning ? 'bg-blue-50 text-blue-700' : isDone ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}">
                        ${isPaused ? 'Paused' : isRunning ? t('bg_jobs.status.running') : isDone ? t('bg_jobs.status.done') : t('bg_jobs.status.error')}
                      </span>
                    </div>
                  </div>
                  
                  <div class="flex items-center justify-between mb-1.5 mt-4">
                    <span class="text-sm font-medium ${isError ? 'text-red-600' : isDone ? 'text-indigo-600' : 'text-blue-600'}">
                      ${isError ? (job.error || t('bg_jobs.status.error')) : (isDone ? t('bg_jobs.progress.completed') : t('bg_jobs.progress.processing', { progress: (job.progress || 0).toFixed(1) }))}
                    </span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div class="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center 
                      ${isError ? 'bg-red-500' : 
                        isDone ? 'bg-indigo-500' : 
                        'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-[length:200%_auto] animate-[gradient_2s_linear_infinite]'}" 
                      style="width: ${isDone || isError || job.progress === undefined ? '100%' : job.progress + '%'}">
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        `}
      </div>
    `;
  }
}

customElements.define('vdg-background-jobs', BackgroundJobsView);

export function render(root) {
  root.innerHTML = '<vdg-background-jobs></vdg-background-jobs>';
}
