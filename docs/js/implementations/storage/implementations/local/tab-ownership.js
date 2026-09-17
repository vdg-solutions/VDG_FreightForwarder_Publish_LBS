// tab-ownership.js — the ONE fact the single-tab rule rests on: does THIS document own the
// workspace? Owner rule, 2026-09-17: the app may be open in exactly one tab.
//
// Taking the lock is a platform act, so it lives here. Whether a tab may then run, and what the
// person is told, is a decision and lives in Rust (freight_app/operators/auth/auth_gate.rs ::
// require_auth, reached through the auth port's `holds_tab_ownership`). Nothing in this file
// branches on the answer.
//
// Web Locks and not a flag in storage, for one reason: the browser releases the lock when the
// document dies — closed, crashed, killed, force-quit, power cut. A flag written to localStorage
// would survive all of those and lock an account out of its own app with nothing to clear it. The
// worst a crash can do here is leave the next tab waiting LOCK_HANDOFF_GRACE_MS.
//
// This lock REPLACES store-client.js's 'vdg-sqlite-leader' election. That election existed to let
// two tabs share one engine over a BroadcastChannel — the arrangement the owner just banned — and
// it could not have gated a boot anyway: it was per-account-scope and claimed lazily on the first
// store op, long after the app had rendered.

const TAB_OWNER_LOCK = 'vdg.app.tab-owner';

// How long a boot waits for the lock before calling itself blocked.
//
// This number exists for the RELOAD, not for the second tab — and the reload is the case that
// matters most, because it is the step every customer takes when the update banner appears.
//
// The choice here is WAIT, not probe-and-fail and not take-over. The request below is a QUEUED
// `navigator.locks.request`, never `{ ifAvailable: true }`: for the overlapping moment when a
// reload's outgoing document has not yet been destroyed, a probe would answer "another tab owns
// this" and tell a person their only tab is their second one. Queuing instead means the grant
// lands the instant the old document dies, because the browser releases its locks when it
// destroys it — which is not a hope: store-client.js's old leader election ran on exactly that
// guarantee in production ("on tab close the next waiter is granted and takes over"), and it is
// why a lock beats any flag we could write down. Taking over unconditionally was rejected: it
// would make a genuine second tab silently evict the first, which is the opposite of the rule.
//
// A genuinely live tab never releases, so it always exhausts this grace and is told so honestly.
// 3s sits far above a real handoff and far below the boot budget (repo-bootstrap.js's
// REPO_INIT_TIMEOUT_MS). If a pathological unload ever does exceed it, the failure is a fully
// interactive screen whose one button takes the lock — one click, never a wedge.
const LOCK_HANDOFF_GRACE_MS = 3000;

const HAS_WEB_LOCKS = typeof navigator !== 'undefined' && typeof navigator.locks?.request === 'function';

let _claim = null;   // memoised Promise<boolean> — the question is asked once per document
let _held  = false;

// Held for the document's whole life. Resolving it would release the lock, which is why nothing
// ever does: the browser releases it by destroying the document.
function _holdForever() {
  _held = true;
  return new Promise(() => {});
}

// Another tab took ownership with "use this tab instead" (a Web Locks steal), so this document is
// no longer the owner. Reload rather than un-render: the schedulers, the engine worker and its
// OPFS handles all have to stop, and a reload is the only thing that stops ALL of them — a
// half-torn-down tab that still drains an outbox is the failure this whole rule is about. The
// reload lands back on the gate, finds the lock held, and shows the blocked screen. Symmetric,
// with no cross-tab negotiation beyond the lock itself.
function _yieldToNewOwner() {
  _held = false;
  location.reload();
}

function _requestOwnership() {
  // No Web Locks: exclusivity cannot be enforced, and refusing on a fact we could not obtain would
  // lock someone out of their own app. Boot; the store's sahpool-conflict screen is the backstop.
  if (!HAS_WEB_LOCKS) return Promise.resolve(true);

  const abort = new AbortController();
  let settle;
  const decided = new Promise((resolve) => { settle = resolve; });

  navigator.locks.request(TAB_OWNER_LOCK, { signal: abort.signal }, _holdForever)
    .catch((err) => {
      if (_held) { _yieldToNewOwner(); return; }
      // AbortError here is our own grace expiring below: somebody else holds it. Any other
      // rejection is Web Locks failing, which tells us nothing about a second tab — boot.
      settle(err?.name !== 'AbortError');
    });

  const timer = setTimeout(() => {
    if (!_held) { abort.abort(); settle(false); }
  }, LOCK_HANDOFF_GRACE_MS);

  return decided.finally(() => clearTimeout(timer));
}

/// Does this document own the workspace? Asked once; the answer is this document's for its life.
export function claimTabOwnership() {
  if (!_claim) _claim = _requestOwnership();
  return _claim;
}

/// Synchronous read of the same fact, for callers already past the gate (store-client.js's
/// `hasLockExclusivity`). Meaningful only after `claimTabOwnership()` has settled — which the boot
/// gate guarantees, since nothing reaches the store until it has.
export function holdsTabOwnership() { return _held; }

/// "Use this tab instead": take the lock away from whoever holds it. The other tab's own request
/// rejects, and _yieldToNewOwner above is how it stands down — this side says nothing to it.
/// Resolves once THIS document owns the workspace, so the caller can re-run the boot gate.
export async function takeTabOwnership() {
  if (!HAS_WEB_LOCKS) { _held = true; _claim = Promise.resolve(true); return true; }
  // `steal` never queues behind the current holder, but the grant still lands in a later task —
  // so resolve on the callback itself rather than assuming it has already run.
  await new Promise((granted) => {
    navigator.locks.request(TAB_OWNER_LOCK, { steal: true }, () => { granted(true); return _holdForever(); })
      .catch(() => { if (_held) _yieldToNewOwner(); });
  });
  _claim = Promise.resolve(true);
  return true;
}
