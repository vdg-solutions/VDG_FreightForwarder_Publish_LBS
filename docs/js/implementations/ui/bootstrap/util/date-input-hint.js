// date-input-hint.js — F4-d: a bare `<input type="date">` renders in the BROWSER's own locale,
// never the page's — `lang="${currentLocale()}"` on the element (already tried, every filter/
// form date input in the app carries it) is not reliably honored across browsers/versions; the
// deployed app still showed `08/30/2026` (MM/DD/YYYY) for a Vietnamese-locale page. Chasing the
// native widget's own rendering further is not this app's decision to make — the fix is to stop
// relying on it: every date input gets a small adjacent hint in the app's ONE convention
// (fmtDate — i18n/index.js, the same function every other date display in the app already
// goes through), kept in sync as the user picks a new value. The `<input>` itself is untouched
// (native picker, native `value`, still always ISO yyyy-mm-dd per the HTML spec regardless of
// display locale) — only a READ affordance is added, so no existing read/parse of `.value`
// anywhere breaks.
import { fmtDate } from '../../../kernel/core_abstractions/i18n/index.js';

const HINT_CLASS = 'vdg-date-hint text-xs text-slate-400 ml-1 whitespace-nowrap';
const WIRED_FLAG = 'vdgDateHintWired';
const DELEGATED_FLAG = 'vdgDateHintDelegated';

function ensureHint(input) {
  let hint = input.nextElementSibling;
  if (!hint || !hint.classList?.contains('vdg-date-hint')) {
    hint = document.createElement('span');
    hint.className = HINT_CLASS;
    input.insertAdjacentElement('afterend', hint);
  }
  hint.textContent = input.value ? `(${fmtDate(input.value)})` : '';
}

/// Wires a hint onto every `input[type="date"]` under `root` (root itself included), and — via
/// ONE delegated listener on `root` — onto any matching input added to `root` LATER (a repeat
/// form-line grid's own "add row" button, e.g. sales-new-form/pnl-line-fx.js). Delegation means a
/// row inserted after this call still gets its hint the moment the user actually touches its date
/// field; a freshly-inserted row's date is blank anyway, so there is nothing to hint before then.
/// Idempotent — safe to call again after a partial re-render.
export function mountDateHints(root) {
  if (!root || root.dataset?.[DELEGATED_FLAG]) {
    if (root) syncExisting(root);
    return;
  }
  syncExisting(root);
  if (root.dataset) {
    root.dataset[DELEGATED_FLAG] = '1';
    const onDateEvent = (e) => {
      const input = e.target.closest?.('input[type="date"]');
      if (input && root.contains(input)) ensureHint(input);
    };
    root.addEventListener('input', onDateEvent);
    root.addEventListener('change', onDateEvent);
  }
}

function syncExisting(root) {
  const inputs = root.matches?.('input[type="date"]') ? [root] : [...root.querySelectorAll('input[type="date"]')];
  for (const input of inputs) {
    if (input.dataset[WIRED_FLAG]) { ensureHint(input); continue; }
    input.dataset[WIRED_FLAG] = '1';
    ensureHint(input);
  }
}
