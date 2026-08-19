// storage-layout.js — where things live in the workspace tree, as every adapter agrees on it.

export const FOLDER_MIME = 'application/vnd.google-apps.folder';

// F-37-02: the revenue audit trail is deliberately NOT here. A log inherits the ACL of the thing
// it describes, and revenue history describes a record CS was never granted — listing it as a
// shared log would move `selling_amount: 1000 -> 1200` into the folder CS reads, undoing the split
// without touching the split. It falls through to the per-user fork, which IS the wall.
// A residue guard in tests/unit/f-37-02-shipment-audit.test.mjs fails the build if it appears here.
export const LOG_KINDS  = ['error_log', 'audit_log'];
export const USERS_PATH = 'users';

// Only the kinds whose home is neither this user's fork nor the storage registry. Every table
// with a registry row (cache_policy::PER_RECORD_REGISTRY) is addressed by PATH through the
// per-record adapters, so it never reaches this map — the framework already knows where it lives.
// What is left is the two shared LOGS, which are appended bundles rather than tables.
export const KIND_PATH_OVERRIDES = {
  error_log: '_shared/error-log',
  audit_log: '_shared/logs/audit-log',
};
