// audit-stores.js — where the two audit trails live (kinds), shared by the audit log and the
// shipment audit operators.

export const AUDIT_STORE_SHARED  = 'audit_log';          // _shared/logs/audit-log
export const AUDIT_STORE_REVENUE = 'revenue_audit_log';  // users/{prefix}/revenue_audit_log
