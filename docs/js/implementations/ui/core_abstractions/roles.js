// roles.js — the role names as the views spell them. The ui owns its own vocabulary: the same
// strings the grant files, the session and vdg_freight's Role enum use, mirrored here so a view
// never reaches across into another module for a constant.

export const ROLE_MANAGER          = 'Manager';
export const ROLE_SALES_MANAGER    = 'SalesManager';
export const ROLE_SALES_REP        = 'SalesRep';
export const ROLE_CUSTOMER_SERVICE = 'CustomerService';
export const ROLE_ACCOUNTANT       = 'Accountant';
export const ROLE_AUDITOR          = 'Auditor';
export const ROLE_PRICING          = 'Pricing';
export const ROLE_READ_ONLY        = 'ReadOnly'; // AC-06: default for a user absent from the roster

// F-42-05: role-gated chrome mounts BEFORE sign-in resolves, so it must be told to look again.
// Fired by the platform whenever the resolved role set genuinely changes.
export const ROLES_RESOLVED_EVENT = 'vdg:roles-resolved';
