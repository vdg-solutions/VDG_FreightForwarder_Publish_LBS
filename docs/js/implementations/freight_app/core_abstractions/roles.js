// roles.js — the role names as the grant files, the session and the route guard spell them. One
// vocabulary: vdg_freight's Role enum serializes these exact strings.

export const ROLE_MANAGER          = 'Manager';
export const ROLE_SALES_MANAGER    = 'SalesManager';
export const ROLE_SALES_REP        = 'SalesRep';
export const ROLE_CUSTOMER_SERVICE = 'CustomerService';
export const ROLE_ACCOUNTANT       = 'Accountant';
export const ROLE_AUDITOR          = 'Auditor';
export const ROLE_PRICING          = 'Pricing';
export const ROLE_READ_ONLY        = 'ReadOnly'; // AC-06: default for a user absent from admin/users.jsonl
