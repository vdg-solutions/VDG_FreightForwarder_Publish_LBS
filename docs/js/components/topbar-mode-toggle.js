// Mode toggle helper — segmented control Sea/Air/All
// html received as param so this module has no CDN import (unit-testable).

export const MODE_LS_KEY  = 'vdg.manager.mode';
export const DEFAULT_MODE = 'All';
export const VALID_MODES  = ['Sea', 'Air', 'All'];

// Read persisted mode; falls back to DEFAULT_MODE on error or missing
export function readMode() {
  try { return localStorage.getItem(MODE_LS_KEY) ?? DEFAULT_MODE; }
  catch { /* storage disabled */ return DEFAULT_MODE; }
}

// Persist mode without firing the event (event fired by topbar._handleModeSelect)
export function saveMode(mode) {
  try { localStorage.setItem(MODE_LS_KEY, mode); }
  catch { /* storage disabled */ }
}

// Lit template factory — html tag fn passed by caller (no CDN import here).
// Renders three segmented buttons; active one highlighted blue.
export function renderModeToggle({ html, currentMode, t, onSelect }) {
  return html`
    <div class="hidden md:flex h-9 items-center rounded-md ring-1 ring-slate-200 overflow-hidden text-[11px] font-semibold"
         data-testid="manager-mode-toggle">
      ${VALID_MODES.map((m) => html`
        <button data-mode="${m}" @click="${() => onSelect(m)}"
                class="h-full px-2.5 border-0 box-border flex items-center transition ${currentMode === m
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'}">
          ${t('manager.mode.' + m.toLowerCase())}
        </button>`)}
    </div>`;
}
