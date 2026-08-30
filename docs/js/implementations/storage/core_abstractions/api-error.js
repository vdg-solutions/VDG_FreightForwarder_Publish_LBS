// api-error.js — a refused vdg-server call: the status the server chose (401 sign-in, 403 acl,
// 404, 409, 412 CAS) — the same numbers the Drive-era callers already branch on.
//
// `message` carries whatever the body's `reason` field held (CDB-API-09) -- on a code-bearing
// refusal that IS the code, e.g. `users.already_exists`'s wire value `already_exists`, never a
// sentence. `params` rides along so a caller can render it through i18n instead of showing the
// code itself.

export class ApiError extends Error {
  constructor(status, message, params) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.params = params || {};
  }
}
