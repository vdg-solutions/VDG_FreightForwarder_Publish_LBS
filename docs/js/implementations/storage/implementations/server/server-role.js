// server-role.js — the server adapter of the workspace-authority port. One call: GET /api/me,
// performed in Rust (store::implementations::http_io::fetch_me).
//
// This file used to DERIVE the verdict: which roles counted, which token to use, whether an
// account was provisioned — and it kept a JS copy of the account-folder derivation (now deleted) to do
// it. Owner law 2026-09-01: JS does not decide. The raw body goes straight to Rust, and
// freight_app::core_abstractions::me_verdict builds the verdict auth_gate matches on.
//
// /me never legitimately answers with an HTTP error — its verdicts are all in the 200 body
// (is_owner, roles, or an empty roles array for not-provisioned) — so ANY error here, 401 cookie
// expiry included, is undecidable by construction: it propagates, and is never swallowed into a
// verdict. auth_gate.rs's probe() is what turns that into "no cache write, no role" instead of the
// 2026-08-11 lockout.

// The wasm MODULE, not the repo store. This used to reach `window.__vdg_repo`, which does not
// exist yet when the auth gate probes: app.js runs `requireAuth` BEFORE `runRepoInit`, and the
// repo is created inside the latter. Every cold-cache boot therefore died on "WASM repo not
// ready" (prod v0.4.52/v0.4.53); a warm RoleCache skips the probe entirely, which is why it took a
// first-ever load to surface. `auth_fetch_me` never needed repo state — see its own doc comment —
// and `window.__vdg_wasm` is set by wasm-loader.js before requireAuth is reached.
function wasm() {
  const m = window.__vdg_wasm;
  if (!m?.auth_fetch_me) throw new Error('WASM module not loaded');
  return m;
}

export async function probeRole(_user, _wsName) {
  return await wasm().auth_fetch_me();
}

export const serverWorkspaceAuthority = { probeRole };
