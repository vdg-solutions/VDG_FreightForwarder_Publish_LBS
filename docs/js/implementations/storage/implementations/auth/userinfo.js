// userinfo.js — "whose token is this?", asked of Google over plain HTTP (no GIS, no popup).
//
// Two callers need the same answer for different reasons: sign-in/revive mints the session from
// it (google-oauth.js), and the silent refresh verifies the minted token belongs to the account
// already signed in (access-token.js). They each kept their own copy of the URL, the 8s ceiling
// and the abort plumbing; this is the one implementation.

const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
// F-57-01 AC-01: the only unguarded network await left in the boot chain used to be this one.
// Matches SAFE_AWAIT_DEFAULT_MS/REPO_INIT_TIMEOUT_MS convention.
const USERINFO_FETCH_TIMEOUT_MS = 8000;

// Named so a caller can branch on it, same convention as RoleProbeTimeoutError/RepoInitTimeoutError.
export class UserinfoFetchTimeoutError extends Error {
  constructor() {
    super('userinfo fetch timeout');
    this.name = 'UserinfoFetchTimeoutError';
  }
}

/// (accessToken) -> the userinfo body. Throws UserinfoFetchTimeoutError past the ceiling, and a
/// plain Error on a non-200 — a 401 means the token is dead, never a profile to mint from.
export async function fetchUserinfo(accessToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USERINFO_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USERINFO_URL, {
      headers: { Authorization: 'Bearer ' + accessToken },
      signal:  controller.signal,
    });
    if (!res.ok) throw new Error(`userinfo ${res.status}`);
    return await res.json();
  } catch (err) {
    throw err?.name === 'AbortError' ? new UserinfoFetchTimeoutError() : err;
  } finally {
    clearTimeout(timer);
  }
}
