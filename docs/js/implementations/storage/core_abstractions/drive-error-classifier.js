// drive-error-classifier.js — classifies a Drive 403 by reason string.
// Missing scope vs. per-file/folder permission are different failures needing different
// handling; mirrors the _isNotAuthorizedToChild reason-string precedent in
// role-assignment-service.js.

export const DRIVE_REASON_SCOPE_INSUFFICIENT     = 'ACCESS_TOKEN_SCOPE_INSUFFICIENT';
export const DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT = 'scope_insufficient';
export const DRIVE_ERROR_KIND_FILE_PERMISSION    = 'file_permission';

// Drive answers a burst of permissions.create with 403 `sharingRateLimitExceeded`, NOT 429 —
// so the 429/503 backoff never saw it and every caller read it as a permanent authorization
// failure. Measured live: 3 of 4 users granted, the 4th died mid fan-out with
// `Rate limit exceeded. User message: "Sorry, you have exceeded your sharing quota"`, and one
// manual share seconds later succeeded — a short-window RATE limit, not a daily allowance.
export const DRIVE_REASON_SHARING_RATE_LIMIT = 'sharingRateLimitExceeded';
export const DRIVE_ERROR_KIND_RATE_LIMITED   = 'rate_limited';

const HTTP_STATUS_FORBIDDEN = 403;

// 403 → one of the three KIND_* constants; anything else (non-403, no status) → null.
// Any 403 reason other than the two named ones → file_permission (AC-04 needs them never to
// collide, not an exhaustive reason catalogue).
export function classifyDriveError(err) {
  if (err?.status !== HTTP_STATUS_FORBIDDEN) return null;
  const message = String(err?.message || '');
  if (message.includes(DRIVE_REASON_SCOPE_INSUFFICIENT))  return DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT;
  if (message.includes(DRIVE_REASON_SHARING_RATE_LIMIT))  return DRIVE_ERROR_KIND_RATE_LIMITED;
  return DRIVE_ERROR_KIND_FILE_PERMISSION;
}
