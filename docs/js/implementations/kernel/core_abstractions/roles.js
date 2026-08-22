// roles.js — the ONE place JS spells a role name.
//
// The names belong to Rust (`freight/core_abstractions/role.rs::Role`), which serializes exactly
// these strings into every grant file, session and `/api/users` reply. JS keeps a copy because the
// auth gate decides what to render BEFORE the wasm module is loaded and cannot ask the enum then.
//
// A copy is only safe while something checks it: `role.rs::the_js_vocabulary_lists_exactly_these_roles`
// reads THIS file and fails the build if the two lists differ, and lint-js's `no-raw-role-literal`
// fails any other .js that spells a role name itself. Import from here — never re-declare.

export const ROLE_MANAGER          = 'Manager';
export const ROLE_SALES_MANAGER    = 'SalesManager';
export const ROLE_SALES_REP        = 'SalesRep';
export const ROLE_CUSTOMER_SERVICE = 'CustomerService';
export const ROLE_ACCOUNTANT       = 'Accountant';
export const ROLE_AUDITOR          = 'Auditor';
export const ROLE_PRICING          = 'Pricing';
// AC-06: what an account with no grant is called on screen — the ABSENCE of a role, not one of
// them. Rust declares the same sentinel beside the enum (`role.rs::ROLE_READ_ONLY`).
export const ROLE_READ_ONLY        = 'ReadOnly';

// Role::ALL, in the enum's order. An unknown name refuses the WHOLE grant file rather than being
// dropped — a silently dropped hat reads to the user as an unexplained access denial.
export const ROLE_NAMES = [ROLE_MANAGER, ROLE_SALES_MANAGER, ROLE_SALES_REP, ROLE_CUSTOMER_SERVICE,
                           ROLE_ACCOUNTANT, ROLE_AUDITOR, ROLE_PRICING];
