// A list view repaints when its kind changes in the store — it does not keep its own copy.
//
// ADO #121: a customer deleted on another machine reached this machine's store in ~5s and stayed
// on the open "Khách hàng" screen for over 115s. The screen had no listener for the store at all
// (only `vdg:locale-changed`), so its rendered array was one read plus whatever this session had
// typed since. Navigating away and back was the only way to see the truth.
//
// The store already announces every change: event_bridge.rs turns RecordChanged/Evicted/
// ResyncCompleted into `vdg:entity-changed` carrying the collection. This is the one place a list
// view subscribes to it, so the pattern cannot be half-implemented view by view again.
//
// Two rules this enforces that a per-view listener kept getting wrong:
//   - ONE listener per kind. A view that re-registers on every render stacked them up, and each
//     stacked handler ran another refresh off the same event.
//   - ONE repaint per burst. A delta tick raises `RecordChanged` PER RECORD, so three changed
//     rows arrive as three events; overlapping refreshes were how a grid came to be mounted twice
//     into the same container.
//
// `reload` must READ and repaint the ROWS — never re-mount the view. Deciding membership is
// wasm's job (operators/data/master_repo.rs::list).
import { isViewSuperseded } from './view-root.js';

const ENTITY_CHANGED_EVENT = 'vdg:entity-changed';

// kind -> the subscription currently live on it.
const _live = new Map();

/**
 * Repaint `root`'s list whenever `kind` changes in the store. Returns the teardown.
 *
 * Unhooks itself once `root` is superseded (navigated away, or a mount timeout replaced it): these
 * views are also mounted as TABS (manager/masters.js), where the route never changes, so
 * `isMountedRoute` cannot answer for them — view-root.js's own predicate can. That is also the
 * guarantee view-mounted.js is about: the list must never repaint over the form the user opened.
 */
export function repaintOnStoreChange(root, kind, reload) {
  _live.get(kind)?.();
  // Per-subscription, not carried across one: `reload` repaints rows and never re-subscribes, so
  // a resubscribe only ever happens from a fresh render() with nothing in flight.
  let busy = false;
  let pending = false;

  const run = () => {
    if (busy) { pending = true; return; } // the burst collapses to this one pass, plus one after it
    busy = true;
    Promise.resolve().then(reload)
      // A reload that throws has no caller to answer to — the retry status line inside `reload`
      // is the user-facing half, so log and let the next change try again.
      .catch((err) => console.warn('[store-repaint] reload failed', kind, err)) // DEV
      .then(() => {
        busy = false;
        if (pending) { pending = false; run(); }
      });
  };

  const onEntity = (e) => {
    if (isViewSuperseded(root)) { teardown(); return; }
    if (e?.detail?.kind !== kind) return;
    run();
  };
  const teardown = () => {
    window.removeEventListener(ENTITY_CHANGED_EVENT, onEntity);
    if (_live.get(kind) === teardown) _live.delete(kind);
  };

  window.addEventListener(ENTITY_CHANGED_EVENT, onEntity);
  _live.set(kind, teardown);
  return teardown;
}
