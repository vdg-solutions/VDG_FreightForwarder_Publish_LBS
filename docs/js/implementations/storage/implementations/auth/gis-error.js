// gis-error.js — one reading of a Google Identity Services `error_callback`.
//
// The distinction that matters downstream: a POPUP-BLOCKED failure is expected and recoverable
// (the browser refused to open a window without a live gesture — see project_token_refresh_
// constraint), while anything else is a real failure. Classifying them apart is what keeps the
// reconnect scheduler from painting a dead-session red over a blocked popup. Three files needed
// the same two lines and each had grown its own copy.

const GIS_ERROR_POPUP_FAILED = 'popup_failed_to_open';
const GIS_ERROR_POPUP_CLOSED = 'popup_closed';

export const POPUP_BLOCKED_TYPES = Object.freeze([GIS_ERROR_POPUP_FAILED, GIS_ERROR_POPUP_CLOSED]);

export function isPopupBlockedError(type) { return POPUP_BLOCKED_TYPES.includes(type); }

/// `popup-blocked:<type>` or `gis-error:<type>` — the prefix callers branch on.
export function gisErrorMessage(err) {
  const type = err?.type || 'unknown';
  return isPopupBlockedError(type) ? `popup-blocked:${type}` : `gis-error:${type}`;
}
