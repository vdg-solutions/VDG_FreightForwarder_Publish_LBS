// drive-errors.js — error class for backward compatible API error handling
export class DriveApiError extends Error {
  constructor(status, message, driveErrorKind = null) {
    super(message || `API error ${status}`);
    this.name = 'DriveApiError';
    this.status = status;
    this.driveErrorKind = driveErrorKind;
  }
}
