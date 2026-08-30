import {
  fmtDate,
  fmtDatePattern
} from "./chunk-5L442NSS.js";

// output/web/js.tmp/implementations/ui/bootstrap/util/date-input-hint.js
var HINT_CLASS = "vdg-date-hint text-xs text-slate-400 ml-1 whitespace-nowrap";
var WIRED_FLAG = "vdgDateHintWired";
var DELEGATED_FLAG = "vdgDateHintDelegated";
function ensureHint(input) {
  let hint = input.nextElementSibling;
  if (!hint || !hint.classList?.contains("vdg-date-hint")) {
    hint = document.createElement("span");
    hint.className = HINT_CLASS;
    input.insertAdjacentElement("afterend", hint);
  }
  hint.textContent = input.value ? `(${fmtDate(input.value)})` : `(${fmtDatePattern()})`;
}
function mountDateHints(root) {
  if (!root || root.dataset?.[DELEGATED_FLAG]) {
    if (root) syncExisting(root);
    return;
  }
  syncExisting(root);
  if (root.dataset) {
    root.dataset[DELEGATED_FLAG] = "1";
    const onDateEvent = (e) => {
      const input = e.target.closest?.('input[type="date"]');
      if (input && root.contains(input)) ensureHint(input);
    };
    root.addEventListener("input", onDateEvent);
    root.addEventListener("change", onDateEvent);
  }
}
function syncExisting(root) {
  const inputs = root.matches?.('input[type="date"]') ? [root] : [...root.querySelectorAll('input[type="date"]')];
  for (const input of inputs) {
    if (input.dataset[WIRED_FLAG]) {
      ensureHint(input);
      continue;
    }
    input.dataset[WIRED_FLAG] = "1";
    ensureHint(input);
  }
}

export {
  mountDateHints
};
