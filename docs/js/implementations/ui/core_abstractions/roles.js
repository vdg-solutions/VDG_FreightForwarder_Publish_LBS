// roles.js — the role names as the views spell them. The vocabulary itself is the kernel's
// (kernel/core_abstractions/roles.js, checked against Rust's Role enum); this re-export keeps the
// import path a view already knows, without a second copy of the names to keep in step.

export {
  ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_SALES_REP, ROLE_CUSTOMER_SERVICE,
  ROLE_ACCOUNTANT, ROLE_AUDITOR, ROLE_PRICING, ROLE_READ_ONLY,
} from '../../kernel/core_abstractions/roles.js';

// F-42-05: role-gated chrome mounts BEFORE sign-in resolves, so it must be told to look again.
// Fired by the platform whenever the resolved role set genuinely changes.
export const ROLES_RESOLVED_EVENT = 'vdg:roles-resolved';
