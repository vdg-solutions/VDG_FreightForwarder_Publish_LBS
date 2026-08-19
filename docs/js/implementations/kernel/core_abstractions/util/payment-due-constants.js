// payment-due-constants.js — shared JS-side constant for the "payment due soon" ladder.
// Mirrors Rust's operators::payment_due::PAYMENT_DUE_WARN_DAYS (owner-fixed at 7). Both the
// SW-side (sw-due-soon.js) and main-thread (due-soon-checker.js) handlers import this single
// source instead of hardcoding the number in two places.
export const PAYMENT_DUE_WARN_DAYS = 7;
