// F-15-09 — Manager Backup / DR view — route /manager/backup

import { isManager }       from '../../auth/auth-gate.js';
import { exportWorkspace } from '../../operators/backup-exporter.js';

const NOT_MANAGER_MSG = 'Manager access required';

function getRepo()     { return window.__vdg_repo; }
function getDriveApi() { return window.__vdg_drive_api; }

// ── HTML skeleton ─────────────────────────────────────────────────────────────

function _html() {
  return `
    <div class="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Backup &amp; Disaster Recovery</h1>
        <p class="text-sm text-slate-500 mt-1">Export all workspace JSONL bundles as a single zip file for offline backup.</p>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div class="text-sm font-medium text-slate-700">Export Workspace</div>
        <p class="text-xs text-slate-500">Downloads a zip containing every JSONL bundle currently stored in your Drive workspace folder (masters + all user monthly bundles).</p>

        <div id="backup-progress" class="hidden space-y-2">
          <div class="flex items-center justify-between text-xs text-slate-600">
            <span id="backup-label">Preparing…</span>
            <span id="backup-pct">0%</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-2">
            <div id="backup-bar" class="bg-blue-500 h-2 rounded-full transition-all" style="width:0%"></div>
          </div>
        </div>

        <div id="backup-result" class="hidden text-xs text-emerald-700 font-medium"></div>
        <div id="backup-error"  class="hidden text-xs text-red-600"></div>

        <button id="btn-export"
                class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 transition disabled:opacity-50">
          Export Workspace Zip
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-1">
        <div class="font-semibold">Restore procedure</div>
        <p>If the workspace folder is accidentally deleted, it remains in <strong>Drive Trash</strong> for 30 days.
          Go to <a href="https://drive.google.com/drive/trash" target="_blank" rel="noreferrer"
                   class="underline">drive.google.com/drive/trash</a> and restore the <code>LBS</code> folder.
          See <code>docs/operations/disaster-recovery.md</code> for the full restore script procedure.</p>
      </div>
    </div>`;
}

// ── wiring ────────────────────────────────────────────────────────────────────

export async function render(root) {
  if (!isManager()) {
    root.innerHTML = `<div class="p-8 text-sm text-slate-500">${NOT_MANAGER_MSG}</div>`;
    return;
  }

  root.innerHTML = _html();

  const btnExport   = root.querySelector('#btn-export');
  const progressEl  = root.querySelector('#backup-progress');
  const barEl       = root.querySelector('#backup-bar');
  const pctEl       = root.querySelector('#backup-pct');
  const labelEl     = root.querySelector('#backup-label');
  const resultEl    = root.querySelector('#backup-result');
  const errorEl     = root.querySelector('#backup-error');

  btnExport?.addEventListener('click', async () => {
    const repo     = getRepo();
    const driveApi = getDriveApi();
    if (!repo || !driveApi) {
      errorEl.textContent = 'Drive not initialized.';
      errorEl.classList.remove('hidden');
      return;
    }

    btnExport.disabled = true;
    progressEl.classList.remove('hidden');
    resultEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    try {
      const filename = await exportWorkspace(repo, driveApi, (pct, label) => {
        barEl.style.width  = `${pct}%`;
        pctEl.textContent  = `${pct}%`;
        labelEl.textContent = label;
      });
      progressEl.classList.add('hidden');
      resultEl.textContent = `Downloaded: ${filename}`;
      resultEl.classList.remove('hidden');
    } catch (err) {
      progressEl.classList.add('hidden');
      errorEl.textContent = `Export failed: ${err?.message ?? err}`;
      errorEl.classList.remove('hidden');
    } finally {
      btnExport.disabled = false;
    }
  });
}
