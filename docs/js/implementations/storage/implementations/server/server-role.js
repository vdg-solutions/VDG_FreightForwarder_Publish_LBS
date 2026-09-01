// server-role.js — the server adapter of the workspace-authority port. One call: GET /api/me,
// performed in Rust (store::implementations::http_io::fetch_me).
//
// This file used to DERIVE the verdict: which roles counted, which token to use, whether an
// account was provisioned — and it kept a JS copy of `derive_fork` (fork-id.js, now deleted) to do
// it. Owner law 2026-09-01: JS does not decide. The raw body goes straight to Rust, and
// freight_app::core_abstractions::me_verdict builds the verdict auth_gate matches on.
//
// /me never legitimately answers with an HTTP error — its verdicts are all in the 200 body
// (is_owner, roles, or an empty roles array for not-provisioned) — so ANY error here, 401 cookie
// expiry included, is undecidable by construction: it propagates, and is never swallowed into a
// verdict. auth_gate.rs's probe() is what turns that into "no cache write, no role" instead of the
// 2026-08-11 lockout.

function repo() {
  const r = window.__vdg_repo;
  if (!r?.auth_fetch_me) throw new Error('WASM repo not ready');
  return r;
}

export async function probeRole(_user, _wsName) {
  return await repo().auth_fetch_me();
}

export const serverWorkspaceAuthority = { probeRole };
