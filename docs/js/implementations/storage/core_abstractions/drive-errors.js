// drive-errors.js — the two error shapes every Drive-shaped caller branches on (`err.status`,
// `err.name`). Thrown by the tree adapters (Drive REST, the server shim) and the io ports alike.

export class DriveApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name   = 'DriveApiError';
    this.status = status;
  }
}

export class ConcurrencyError extends Error {
  constructor(kind, id, attempts) {
    super(`Concurrency conflict: ${kind}/${id} after ${attempts} attempts`);
    this.name     = 'ConcurrencyError';
    this.kind     = kind;
    this.id       = id;
    this.attempts = attempts;
  }
}
