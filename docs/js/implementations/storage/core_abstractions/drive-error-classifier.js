// drive-error-classifier.js
export const DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT = 'scope_insufficient';
export const DRIVE_ERROR_KIND_FILE_PERMISSION = 'file_permission';

export function classifyDriveError(err) {
  if (!err) return null;
  if (err.status === 403) return DRIVE_ERROR_KIND_FILE_PERMISSION;
  if (err.status === 401) return DRIVE_ERROR_KIND_SCOPE_INSUFFICIENT;
  return null;
}
