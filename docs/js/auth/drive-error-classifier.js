// drive-error-classifier.js — classifies a Drive 403 by reason string.
// Missing scope vs. per-file/folder permission are different failures needing different
// handling; mirrors the _isNotAuthorizedToChild reason-string precedent in
// role-assignment-service.js.

export const DRIVE_REASON_SCOPE_INSUFFICIENT     = 'ACCESS_TOKEN_SCOPE_INSUFFICIENT';
export const DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT = 'scope_insufficient';
export const DRIVE_ERROR_KIND_FILE_PERMISSION    = 'file_permission';

const HTTP_STATUS_FORBIDDEN = 403;

// 403 → one of the two KIND_* constants; anything else (non-403, no status) → null.
// Any 403 reason other than ACCESS_TOKEN_SCOPE_INSUFFICIENT → file_permission (AC-04 needs
// the two never to collide, not an exhaustive reason catalogue).
export function classifyDriveError(err) {
  if (err?.status !== HTTP_STATUS_FORBIDDEN) return null;
  const message = String(err?.message || '');
  return message.includes(DRIVE_REASON_SCOPE_INSUFFICIENT)
    ? DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT
    : DRIVE_ERROR_KIND_FILE_PERMISSION;
}
