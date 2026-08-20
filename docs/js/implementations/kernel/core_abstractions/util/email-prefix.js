// util/email-prefix.js — a fork name derived from an email. Mirrors Rust
// freight/core_abstractions/user_prefix.rs::derive_prefix: the WHOLE address, lowercased
// (owner 2026-08-20 — local-part scheme dropped, two companies' "an@" no longer collide).
//
// A leaf on purpose. It lived in auth-gate.js, which touches `window` at module scope through the
// google-oauth chain, so importing it dragged the whole sign-in stack into modules that only
// wanted to name a folder. users-view-composer.js had already answered that by keeping its own
// copy (`deriveUserPrefix`) "so this module stays zero-dependency" — two copies of the rule that
// decides which fork a user's data is in, which is not a rule worth having two of.

/** Lowercased full address. `''` for anything unusable — never throws. */
export function emailPrefix(email) {
  return (email || '').trim().toLowerCase();
}
