// api-error.js — a refused vdg-server call: the status the server chose (401 sign-in, 403 acl,
// 404, 409, 412 CAS) — the same numbers the Drive-era callers already branch on.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
  }
}
