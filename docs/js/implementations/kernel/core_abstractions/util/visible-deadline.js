// visible-deadline.js — a budget measured in the time a USER actually waited.
//
// The defect this exists for: repo-init raced its 30s budget with a plain `setTimeout`. A boot
// diagnostic came back `step=wasm-init elapsedMs=382471` — the 30-second timer fired six and a
// half minutes late. Not a slow boot: browsers CLAMP and defer timers in a hidden tab, and that
// tab had been in the background. So the budget was being enforced by the one clock the platform
// is free to ignore.
//
// The fix is not a bigger number. It is the right question. A boot budget answers "has the person
// been staring at a spinner too long?" — and while the tab is hidden, nobody is staring. Time
// spent hidden is not time the user waited, so it must not be counted, and a tab that comes back
// after an hour must not be greeted with a timeout it earned while nobody was looking.

import { nowMs } from '../ports/clock.js';
import { startInterval, stopInterval } from '../ports/timer.js';
import { isPageVisible, onVisibilityChange } from '../ports/visibility.js';

const TICK_MS = 1000;

/// A promise that rejects with `makeError(visibleElapsedMs)` after `budgetMs` of VISIBLE time.
/// Never resolves; race it against real work. Call the returned `cancel()` when that work settles,
/// or the interval outlives the boot.
export function visibleDeadline(budgetMs, makeError, tickMs = TICK_MS) {
  let visibleMs = 0;
  let last      = nowMs();
  // The state the CURRENT slice began in. Billing by the state at the END of a slice charged a
  // hidden stretch as visible whenever the tab came back mid-slice — the first version of this
  // file did exactly that, and its own test caught it.
  let sliceVisible = isPageVisible();
  let timer   = null;
  let offFlip = null;

  const cancel = () => {
    if (timer !== null) { stopInterval(timer); timer = null; }
    if (offFlip) { offFlip(); offFlip = null; }
  };

  const promise = new Promise((_resolve, reject) => {
    // Close the open slice and start a new one. Called on every tick AND on every visibility flip,
    // so a slice never spans a boundary and is always billed by the state it was actually in.
    const settle = () => {
      const now = nowMs();
      if (sliceVisible) visibleMs += now - last;
      last = now;
      sliceVisible = isPageVisible();
      if (visibleMs >= budgetMs) {
        cancel();
        reject(makeError(Math.round(visibleMs)));
      }
    };

    timer   = startInterval(settle, tickMs);
    offFlip = onVisibilityChange(settle);
  });

  return { promise, cancel };
}
