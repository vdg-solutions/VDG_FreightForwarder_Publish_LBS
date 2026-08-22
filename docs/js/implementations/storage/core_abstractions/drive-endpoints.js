// drive-endpoints.js — the Drive REST origins the tree helpers address and the shim emulates. A
// relative path handed to the transport is resolved against DRIVE_API_BASE; uploads name their
// own origin (multipart lives on the upload host).

export const DRIVE_API_BASE    = 'https://www.googleapis.com/drive/v3';
export const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// ── OAuth scopes ────────────────────────────────────────────────────────────────────────────────
// One declaration each, because a scope string that exists twice eventually differs, and the
// difference shows up as a Google consent screen nobody meant to ask for.

/// Identity only. What a SERVER-backed build asks Google for: the server owns Drive, so the token
/// the browser mints has one job — prove who is signing in. These three are non-sensitive, so
/// Google shows no verification warning for them.
export const IDENTITY_SCOPE = 'openid email profile';

/// The full Drive scope, used ONLY by the Drive-direct flavour (frozen on branch `serverless`),
/// where the browser IS the client of Drive. It is a RESTRICTED scope: an unverified app asking
/// for it gets Google's "hasn't verified this app" interstitial. A server build must never
/// request it — see the runbook wiki/runbooks/google-oauth-edge.md, which is why the server's own
/// credentials use `drive.file` instead.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
