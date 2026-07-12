// Boundary layer — Manager Workspace ViewModels. Zero deps.

/**
 * @typedef {Object} KpiCardVm
 * @property {string} label
 * @property {string} value
 * @property {string} tone   blue|slate|green|red|amber
 * @property {string} icon
 */

/**
 * @typedef {Object} PivotRow
 * @property {Record<string,string>} dims
 * @property {number}  revenue_vnd
 * @property {number}  cost_vnd
 * @property {number}  margin_vnd
 * @property {number}  margin_pct
 * @property {number}  shipment_count
 * @property {number}  avg_margin
 * @property {number|null} prev_margin_vnd
 * @property {number|null} yoy_margin_vnd
 */

/**
 * @typedef {Object} ARRow
 * @property {string} customer_id
 * @property {string} customer
 * @property {number} current_vnd     ≤30d
 * @property {number} bucket_31_60
 * @property {number} bucket_61_90
 * @property {number} bucket_91_plus
 * @property {number} total_outstanding
 * @property {number} avg_dso
 * @property {number} credit_limit
 * @property {number} utilization_pct
 */

/**
 * @typedef {Object} APRow
 * @property {string} carrier
 * @property {number} shipment_count
 * @property {number} total_payable_vnd
 * @property {number} avg_per_job
 * @property {string} oldest_outstanding  ISO date
 */

/**
 * @typedef {Object} ApprovalRequestVm
 * @property {string} id
 * @property {string} type
 * @property {string} requester
 * @property {string} target_kind
 * @property {string} target_id
 * @property {number} amount_impact
 * @property {string} requested_at
 * @property {string} status
 * @property {string} comment
 */

/**
 * @typedef {Object} ApprovalDecisionDto
 * @property {string} id
 * @property {string} approval_request_id
 * @property {string} decision             Approved|Rejected|NeedInfo|Delegated
 * @property {string} comment
 * @property {string} decided_at
 * @property {string} decided_by
 * @property {string|undefined} delegated_to
 */

/**
 * @typedef {Object} CommissionPayoutVm
 * @property {string} id              "CP-{salesRepId}-{periodKey}"
 * @property {string} kind            'commission_payout'
 * @property {string} sales_rep
 * @property {string} period          "2025-06" | "2025-Q2"
 * @property {number} margin
 * @property {number} commission_pct
 * @property {number} commission
 * @property {number} advances
 * @property {number} net_payable
 * @property {string} [settled_at]    ISO8601 — present when settled
 * @property {string} [settled_by]
 */

/**
 * @typedef {Object} ExceptionVm
 * @property {string} id
 * @property {string} type
 * @property {'Low'|'Medium'|'High'|'Critical'} severity
 * @property {string} raised_at       ISO8601
 * @property {string} [resolved_at]
 * @property {string} [resolved_by]
 * @property {object} payload
 * @property {number} slaRemainingMs
 * @property {string} slaStatus       'red'|'amber'|'green'
 */

/**
 * @typedef {Object} Customer360Vm
 * @property {object} customer
 * @property {number} lifetimeRevenue
 * @property {number} outstanding
 * @property {string} salesRep
 * @property {string} lastTouchDate   ISO8601
 * @property {number} healthScore     0–100
 * @property {string[]} healthBreakdown
 */

/**
 * @typedef {Object} UserMasterVm
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {'admin'|'sales'} role
 * @property {'Active'|'Inactive'} status
 * @property {string} invited_at
 * @property {string} [last_login]
 */
