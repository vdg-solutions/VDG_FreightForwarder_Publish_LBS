// How a local store is named, and nothing else.
//
// Split out of store-client.js at 350 lines. The seam is real rather than arithmetic: everything
// here is a pure function of (workspace, account) -- no worker, no leader lock, no timers, no
// storage. The client that does have all of those imports one name from here.

import { WORKSPACE_NAME } from '../../core_abstractions/workspace-config.js';

const SCOPE_MAX_LEN = 64;
/// Two dashes: a cleaned part can never contain one, so the join stays reversible.
const SCOPE_SEP = '--';
const DIGEST_LEN = 8;
const HEX_RADIX = 16;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

// The key is (WORKSPACE, account), not the account alone.
//
// OPFS is per ORIGIN, not per path, and dev and prod are two paths on one origin
// (vdg-solutions.github.io). While they used different accounts the account key kept them apart
// by accident. The moment dev was pointed at the same account as prod -- 2026-09-04, to give dev
// an owner who could actually sign in -- both apps began opening the SAME sahpool directory and
// the SAME vdg-workspace.sqlite3. Measured: the dev app listed 19 shipments while the dev SERVER
// held 1. The other 18 were prod rows, read out of the shared local database.
//
// WORKSPACE_NAME is stamped per publish -- one value per deployment, so a tenant and its dev twin
// carry different ones -- which makes it the discriminator the account alone cannot be. An
// unstamped build contributes nothing rather than a fake tenant name, which keeps a localhost run
// on its own key instead of borrowing a deployment's.
//
// No tenant id is written literally anywhere in this file, here or in the example below. The
// publish isolation scan refuses a bundle carrying ANOTHER tenant's id, and it does not read
// comments differently from code -- correctly, since a shipped file is shipped whatever its
// syntax. It caught exactly that on v0.4.72 and cost a tag.
/// One cleaned part can never contain `--`, because the sweep below collapses every run of
/// non-alphanumerics to a single `-`. That makes `--` a separator the key can be read back
/// through, which a single `-` was not: a workspace ending in `-dev` with the account `lucas@x`,
/// and the base workspace with the account `dev-lucas@x`, both flattened to the SAME text and
/// therefore to ONE database.
function cleaned(part) {
  return String(part || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/// FNV-1a, 32-bit. Not a security hash and never used as one: it exists so that two keys the
/// length cap would truncate to the same text stay different. Deterministic and synchronous,
/// which `crypto.subtle` is not.
function digest(text) {
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME) >>> 0;
  }
  return h.toString(HEX_RADIX).padStart(DIGEST_LEN, "0");
}

/// The derivation on its own, taking the workspace explicitly so a test can ask it about a
/// deployment other than the one this bundle was stamped for. `storeScopeKey` is the same
/// question asked about THIS build.
///
/// The key has to be INJECTIVE: two different (workspace, account) pairs that land on one string
/// land on one database, and a shared database is the defect this whole scope exists to prevent.
/// Two ways it was not: an ambiguous join, fixed by `--` above; and blind truncation, where two
/// accounts agreeing for the first SCOPE_MAX_LEN characters became one key. A key over the cap
/// now keeps a readable head and ends in a digest of the WHOLE thing.
export function scopeKeyFor(workspace, email) {
  const account = cleaned(email);
  // No account, no key -- and the empty string is the ONLY way to say that, because
  // store-client's guard reads `if (!key) throw`. Adding the workspace made the key truthy for an
  // empty account (`lbs--`), so that guard stopped firing in every stamped bundle while it kept
  // firing on localhost, where WORKSPACE_NAME is blank: alive exactly where nobody needed it.
  // A key is a name for somebody; with nobody to name there is no key.
  if (!account) return "";
  const space = cleaned(workspace);
  const full = space ? `${space}${SCOPE_SEP}${account}` : account;
  if (full.length <= SCOPE_MAX_LEN) return full;
  const head = full.slice(0, SCOPE_MAX_LEN - DIGEST_LEN - SCOPE_SEP.length);
  return `${head}${SCOPE_SEP}${digest(full)}`;
}

export function storeScopeKey(email) {
  return scopeKeyFor(WORKSPACE_NAME, email);
}
