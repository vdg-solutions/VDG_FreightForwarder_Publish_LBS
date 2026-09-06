// platform/data.js — extra platform methods the Rust data use-cases import (js_data.rs extern type).
//
// The per-account bundle reader that used to live here is gone with the account-folder concept itself (owner 2026-09-01).
// It listed `users/{email}/{kind}` and read every *.jsonl body in it — a store nothing had written
// since the Drive era, so it answered empty on every call while costing a listing plus a read per
// file, and its failures could fail a whole revenue grid. `shipment_revenue` and
// `billing_published` are flat collections named directly in default_policy.cedar; who sees which
// row is Cedar's answer now, not a folder a reader does or does not hold.
//
// Deleted with it: the scan cache it needed, and `isAnsweredStatus` — the shape where JS held the
// HTTP status, asked wasm for an opinion on it, and then made the decision itself.

// The two audit trails, by kind. They are named here rather than imported because this is the
// adapter that talks to the browser's audit log object; the routing decision is Rust's.
const AUDIT_STORE_REVENUE = 'revenue_audit_log';

export const dataPlatform = {
  /// The licence claim the boot gate stamped; null when it has not run.
  data_license_status: async () => window.__vdg_license_status ?? null,

  /// Append one shipment change list to the trail its readers already hold.
  data_audit_append: async (store, kind, entityId, op, body, changes) => {
    const log = window.__vdg_audit_log;
    if (!log) return false;
    if (store === AUDIT_STORE_REVENUE) log.appendRevenue(kind, entityId, op, body, changes);
    else log.append(kind, entityId, op, body, changes);
    return true;
  },
};
