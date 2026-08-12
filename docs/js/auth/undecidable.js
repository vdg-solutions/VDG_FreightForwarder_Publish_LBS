// undecidable.js — the difference between an ANSWER and a failure to get one.
//
// 403 and 404 are answers. An employee cannot read `admin/`; an absent file means nobody is
// provisioned yet; a revenue fork that was never granted genuinely holds nothing for this reader.
// 401, 429, 5xx and any transport error are NOT answers — they mean "cannot tell", and treating
// them as "no" is how a screen states something false with complete confidence.
//
// It has already happened twice here. An expired access token turned the workspace OWNER into a
// pending-access account: the 401 fell through to "fork exists, no grant" = zero roles. And under
// E-37 the same shape is one step from telling a manager that a rep's job earned nothing, because
// a failed read of the revenue half looks exactly like a CS read of it.
//
// Split out of auth-gate.js (F-37-06) so the data layer can use it without importing the sign-in
// chain — auth-gate touches `window` at module scope, and dragging that into a repo module is what
// pushed the last shared helper (emailPrefix) out into its own file too.

const AUTH_FAILED_STATUS  = 401;
const RATE_LIMITED_STATUS = 429;
const SERVER_ERROR_FLOOR  = 500;

/** True when the error carries no verdict — the caller must not turn it into a negative answer. */
export function isUndecidable(err) {
  if (err?.name !== 'DriveApiError') return true;   // transport/TypeError — no verdict either
  const s = err.status;
  return s === AUTH_FAILED_STATUS || s === RATE_LIMITED_STATUS || s >= SERVER_ERROR_FLOOR;
}

/**
 * Run a read whose absence is meaningful, and say which of the two happened.
 *
 * Returns `{ decided: true, value }` for a real answer (including a legitimate 403/404 → `absent`)
 * and `{ decided: false, error }` when nothing can be concluded. The caller renders those
 * differently — a panel that is not there, versus a panel that could not be loaded.
 */
export async function readOrUndecided(read, absent = null) {
  try {
    return { decided: true, value: await read() };
  } catch (err) {
    if (isUndecidable(err)) return { decided: false, error: err };
    return { decided: true, value: absent };
  }
}
