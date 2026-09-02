// merge-resolve — port: the two writes a person can ask for when two devices edited the same row.
//
// The dialog used to hold both decisions itself: it read the collection off the event payload and
// called `repo.put(kind, id, body)` with a body it composed. That is the generic door the owner's
// law closes — JS renders and captures the click; WHICH row and WHAT body are decided in Rust
// (`operators/data/merge_resolve.rs`), where the collection is checked against the closed set of
// documents a merge resolution may rewrite.
//
// Both calls answer `{ ok, error, record }`. A refusal is an ANSWER, not an exception: the caller
// is a dialog button and has to be able to show why.

let _impl = null;

/// Root bootstrap binds { reapplyMyValues, resolveConflict } once.
export function bindMergeResolve(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/merge-resolve: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// ({ kind, id, fields: [{ field, value }] }) -> reply. Re-applies the user's own values over the
/// freshest stored row — the merge toast's undo.
export const reapplyMyValues = (...a) => _i().reapplyMyValues(...a);

/// ({ kind, id, choice, merged, local, remote, conflicts }) -> reply. `choice` is 'mine' | 'theirs'.
export const resolveConflict = (...a) => _i().resolveConflict(...a);
