// app-events.js — global event listeners wired at bootstrap

import { idbGet, idbPut } from './cache/idb-cache.js';
import { APP_VERSION } from './version.js';
import { onEvent } from './sync/wma-engine.js';
import { loadKindWmaState, saveKindWmaState } from './sync/wma-store.js';

const NEW_FEATURE_BANNER_DAYS = 7;
const BREAKPOINT_TABLET_PX    = 768;
const META_STORE              = 'meta';
const PREFS_META_KEY          = 'preferences';

// F-14-18-3: conflict modal
export function initConflictModal() {
  window.addEventListener('vdg:conflict-detected', (e) => {
    const { kind, id, local, remote, conflicts } = e.detail || {};
    const dlg = document.createElement('dialog');
    dlg.className = 'rounded-xl shadow-2xl p-0 w-[480px] max-w-[95vw] bg-white backdrop:bg-black/40';
    const fieldLabel = conflicts?.[0]?.field || '(multiple fields)';
    const localVal   = String(conflicts?.[0]?.local_val ?? '').slice(0, 60);
    const remoteVal  = String(conflicts?.[0]?.remote_val ?? '').slice(0, 60);
    dlg.innerHTML = `
      <div class="px-6 py-4 border-b border-slate-200">
        <div class="font-semibold text-slate-900 text-sm">Data conflict · ${kind}:${id}</div>
        <div class="text-xs text-slate-500 mt-0.5">Field: <code>${fieldLabel}</code></div>
      </div>
      <div class="px-6 py-4 text-xs">
        <div class="flex gap-4">
          <div class="flex-1 bg-blue-50 rounded p-2">
            <div class="font-medium text-blue-700 mb-1">Yours</div>
            <div class="font-mono break-all">${localVal}</div>
          </div>
          <div class="flex-1 bg-amber-50 rounded p-2">
            <div class="font-medium text-amber-700 mb-1">Theirs</div>
            <div class="font-mono break-all">${remoteVal}</div>
          </div>
        </div>
      </div>
      <div class="px-6 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button id="keep-mine" class="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">Keep mine</button>
        <button id="use-theirs" class="px-4 py-2 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">Use theirs</button>
      </div>`;
    document.body.appendChild(dlg);
    dlg.showModal();
    // F-28-06: re-put the winning body directly — this re-enters the Rust rebase gate
    // (apply_put). Stamp local's _rev to the remote _rev this conflict event just carried
    // (the freshest known state, no extra fetch) so "keep mine" fast-forwards instead of
    // conflicting again against its own stale base.
    const repo = window.__vdg_repo;
    dlg.querySelector('#keep-mine').addEventListener('click', async () => {
      await repo?.put(kind, id, { ...local, _rev: remote?._rev });
      dlg.close(); dlg.remove();
    });
    dlg.querySelector('#use-theirs').addEventListener('click', async () => {
      await repo?.put(kind, id, remote);
      dlg.close(); dlg.remove();
    });
  });
}

// F-14-18-4: import progress bar
export function initImportProgress() {
  let bar = null;
  window.addEventListener('vdg:import-progress', (e) => {
    const { kind, n, total, done } = e.detail || {};
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'fixed top-16 left-0 right-0 z-[9000] px-4 py-1.5 bg-indigo-50 border-b border-indigo-200 flex items-center gap-3 text-xs text-indigo-700';
      document.body.appendChild(bar);
    }
    if (done) { bar.remove(); bar = null; return; }
    bar.innerHTML = `
      <progress value="${n}" max="${total}" class="flex-1 h-2 rounded"></progress>
      <span>Importing ${n}/${total} ${kind}…</span>`;
  });
}

// F-14-20-3: version banner
export async function checkVersionBanner(db) {
  if (!db) return;
  try {
    const prefs = await idbGet(db, META_STORE, PREFS_META_KEY);
    if (!prefs) return;
    if (prefs.last_seen_version === APP_VERSION) return;
    if (prefs.banner_dismissed_at) {
      const days = (Date.now() - new Date(prefs.banner_dismissed_at).getTime()) / 86_400_000;
      if (days < NEW_FEATURE_BANNER_DAYS) return;
    }
    const banner = document.createElement('div');
    banner.className = 'fixed top-16 left-0 right-0 z-[8999] bg-indigo-600 text-white text-xs flex items-center justify-between px-4 py-2';
    banner.innerHTML = `
      <span>What's new in ${APP_VERSION}
        <button id="banner-see" class="ml-2 underline hover:no-underline">See changes</button>
      </span>
      <button id="banner-dismiss" class="ml-4 text-indigo-200 hover:text-white">✕</button>`;
    document.body.appendChild(banner);
    banner.querySelector('#banner-see').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('vdg:open-help', { detail: { section: 'whats-new' } }));
    });
    banner.querySelector('#banner-dismiss').addEventListener('click', async () => {
      banner.remove();
      await idbPut(db, META_STORE, {
        ...prefs, last_seen_version: APP_VERSION, banner_dismissed_at: new Date().toISOString(),
      });
    });
  } catch { /* banner non-critical */ }
}

// F-15-63: WMA shipment-committed listener — learn from each commit
export function initWmaListener() {
  window.addEventListener('vdg:shipment-committed', async (e) => {
    const { rep_id, lines } = e.detail || {};
    if (!rep_id || !lines?.length) return;
    const db = window.__vdg_db;
    if (!db) return;
    for (const ln of lines) {
      if (!ln.observed_kind) continue;
      try {
        const state = await loadKindWmaState(db, rep_id, ln.row_idx);
        onEvent(state, ln.observed_kind, ln.predicted_kind || null);
        await saveKindWmaState(db, rep_id, ln.row_idx, state);
      } catch (err) {
        console.warn('[wma] on_event failed:', err.message); // DEV
      }
    }
  });
}

// F-14-16: mobile breakpoint
export function initBreakpointListener() {
  const mql = window.matchMedia(`(max-width: ${BREAKPOINT_TABLET_PX - 1}px)`);
  const onChange = (e) => {
    document.body.classList.toggle('is-mobile', e.matches);
    window.dispatchEvent(new CustomEvent('vdg:breakpoint-changed', { detail: { mobile: e.matches } }));
  };
  mql.addEventListener('change', onChange);
  onChange(mql);
}
