// grant-file.js — the grant AREAS manifest cache (E-43): `[{path, folder_id}]` the manager
// resolved when they granted, kept locally so the data layer can reach it without re-reading.
//
// F1-b: the per-user grant FILE reader/parser that used to live here (`grants/grant.{workspace}.
// {fork}`, a Drive-era convention read via sharedWithMe) is gone — vdg-server writes and reads the
// grants collection keyed by the bare email (server/src/operators/users.rs,
// server/src/implementations/freight_grants.rs), and this file's own `parseGrant` disagreed with
// that shape (required a `workspace` field, addressed by `grant.{workspace}.{fork}`), which is
// exactly what locked a signed-in, correctly-provisioned account onto pending-access. The areas
// manifest below is unrelated to that contract and still has a live caller
// (bootstrap/platform/auth.js's `auth_remember_grant_areas`).

import { kvGet, kvSet, kvRemove } from '../../kernel/core_abstractions/ports/key-value.js';

/// Where the session keeps its manifest so the data layer can reach it without re-reading Drive.
///
/// localStorage, NOT sessionStorage. It was session-scoped first, on the reasoning that a stale
/// manifest would outlive a revoke — but the manifest is only written when the ROLE PROBE runs, and
/// a warm role cache short-circuits that probe. So a second tab, or any reload with a cached role,
/// had a role and no manifest, and every Drive read threw "Workspace root not found" (measured: a
/// shipment saved locally and its bundle write failed). It shares the role cache's lifetime because
/// it answers the same question — what this user was granted — and `clearCachedRole` drops both.
export const GRANT_AREAS_KEY = 'vdg.grant.areas';

export function rememberGrantAreas(areas) {
  if (!Array.isArray(areas) || areas.length === 0) return; // never overwrite a good manifest with nothing
  try { kvSet(GRANT_AREAS_KEY, JSON.stringify(areas)); }
  catch { /* storage-less context (tests) — the data layer falls back to the root walk */ }
}

export function recallGrantAreas() {
  try { return JSON.parse(kvGet(GRANT_AREAS_KEY) || '[]'); }
  catch { return []; }
}

export function clearGrantAreas() {
  try { kvRemove(GRANT_AREAS_KEY); } catch { /* nothing stored */ }
}
