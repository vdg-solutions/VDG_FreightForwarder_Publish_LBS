// output/web/js.tmp/implementations/ui/bootstrap/components/topbar-mode-toggle.js
var MODE_LS_KEY = "vdg.manager.mode";
var DEFAULT_MODE = "All";
var VALID_MODES = ["Sea", "Air", "All"];
function readMode() {
  try {
    return localStorage.getItem(MODE_LS_KEY) ?? DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}
function renderModeToggle({ html, currentMode, t, onSelect }) {
  return html`
    <div class="hidden md:flex h-9 items-center rounded-md ring-1 ring-slate-200 overflow-hidden text-[11px] font-semibold"
         data-testid="manager-mode-toggle">
      ${VALID_MODES.map((m) => html`
        <button data-mode="${m}" @click="${() => onSelect(m)}"
                class="h-full px-2.5 border-0 box-border flex items-center transition ${currentMode === m ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}">
          ${t("manager.mode." + m.toLowerCase())}
        </button>`)}
    </div>`;
}

export {
  MODE_LS_KEY,
  DEFAULT_MODE,
  readMode,
  renderModeToggle
};
