// util/due-soon-guard.js — once-per-day persistence for the "payment due soon" reminder
// (F-34-01, AC-02). due-soon-checker.js is now the sole compute path (sw-due-soon.js is
// gone), so this lives on the main thread where localStorage is available — same guard key
// the SW-side IDB `meta` store used, just relocated with the compute.
const GUARD_KEY = 'vdg.due_soon.last_check_date';

export function hasCheckedToday(today) {
  return localStorage.getItem(GUARD_KEY) === today;
}

export function markCheckedToday(today) {
  localStorage.setItem(GUARD_KEY, today);
}
