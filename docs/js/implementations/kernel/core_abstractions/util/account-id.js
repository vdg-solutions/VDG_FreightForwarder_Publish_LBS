// util/account-id.js — is this token an ACCOUNT, the thing a person signs in as?
//
// F-47-05: the client used to answer a different question — "does this sanitize into a valid-
// looking id?" — and `derive_fork` says yes to anything. A display name 'Khánh Lê' became
// `kh-nh-l-`, which reads exactly like a folder belonging to somebody else, and travelled all the
// way to the revenue writer before failing. What a job's rep field has to hold is an account; ask
// that instead. Mirrors Rust freight_app/core_abstractions/fork_paths.rs::is_account, and outlives
// the fork — F-47-06 removes the folders, not the need for a job to name its owner.
//
// A leaf, and deliberately shallow: accounts are issued by the identity provider, not validated
// here. This only refuses what could never be one.

/** True when `token` is already-normalised and could be an account. Never throws. */
export function isAccountId(token) {
  const s = String(token ?? '');
  return s.includes('@') && !/\s/.test(s) && s === s.toLowerCase();
}
