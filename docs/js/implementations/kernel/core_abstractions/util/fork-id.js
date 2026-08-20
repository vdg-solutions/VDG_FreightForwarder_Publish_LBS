// util/fork-id.js — a fork id derived from an email. Mirrors Rust
// freight/core_abstractions/fork.rs::derive_fork: the WHOLE address, lowercased
// (owner 2026-08-20 — local-part scheme dropped, two companies' "an@" no longer collide).
//
// A leaf on purpose. It lived in auth-gate.js, which touches `window` at module scope through the
// google-oauth chain, so importing it dragged the whole sign-in stack into modules that only
// wanted to name a folder. users-view-composer.js had already answered that by keeping its own
// copy (`deriveFork`) "so this module stays zero-dependency" — two copies of the rule that
// decides which fork a user's data is in, which is not a rule worth having two of.

/** Lowercased full address. `''` for anything unusable — never throws. */
export function forkId(email) {
  return (email || '').trim().toLowerCase();
}
