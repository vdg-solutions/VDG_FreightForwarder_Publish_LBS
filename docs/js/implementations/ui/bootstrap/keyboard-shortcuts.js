// Global keyboard shortcuts — F-14-13 · mounted by app.js

import { navigate } from './router.js';

const CHORD_TIMEOUT_MS = 800;
const CHORD_MAP        = {
  d: '/manager/dashboard',
  s: '/manager/pipeline',
  c: '/masters/customers',
  r: '/manager/reports/pnl',
};

let _chordPending = false;
let _chordTimer   = null;

function _inInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

function _showCheatsheet() {
  const existing = document.getElementById('vdg-cheatsheet-dialog');
  if (existing) { existing.open ? existing.close() : existing.showModal(); return; }

  const d = document.createElement('dialog');
  d.id        = 'vdg-cheatsheet-dialog';
  d.className = 'rounded-xl shadow-2xl p-0 w-[640px] max-w-[95vw] bg-white backdrop:bg-black/40';
  d.innerHTML = `
    <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
      <span class="font-semibold text-slate-900">Keyboard Shortcuts</span>
      <button onclick="this.closest('dialog').close()"
              class="text-slate-400 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Close cheatsheet">✕</button>
    </div>
    <div class="grid grid-cols-2 gap-x-8 gap-y-2 px-6 py-4 text-xs text-slate-700">
      <div class="font-semibold col-span-2 text-slate-500 uppercase text-[10px] mt-2">Navigation</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">Ctrl K</kbd> Command palette</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g d</kbd> Dashboard</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g s</kbd> Pipeline</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g c</kbd> Customers</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">g r</kbd> P&L Report</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">/</kbd> Focus search</div>
      <div class="font-semibold col-span-2 text-slate-500 uppercase text-[10px] mt-2">General</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">?</kbd> This cheatsheet</div>
      <div><kbd class="bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd> Close panel</div>
    </div>`;
  document.body.appendChild(d);
  d.showModal();
}

export function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl/Cmd+K → palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('vdg:cmd-palette'));
      return;
    }

    if (_inInput()) return;

    // Chord g → second key
    if (_chordPending) {
      clearTimeout(_chordTimer);
      _chordPending = false;
      const route = CHORD_MAP[e.key];
      if (route) { e.preventDefault(); navigate(route); }
      return;
    }

    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      _chordPending = true;
      _chordTimer   = setTimeout(() => { _chordPending = false; }, CHORD_TIMEOUT_MS);
      return;
    }

    // ? → cheatsheet
    if (e.key === '?') { e.preventDefault(); _showCheatsheet(); return; }

    // / → topbar search focus
    if (e.key === '/') {
      e.preventDefault();
      document.querySelector('vdg-topbar input[type=search], vdg-topbar input[type=text]')?.focus();
    }
  });
}

export { CHORD_TIMEOUT_MS, CHORD_MAP };
