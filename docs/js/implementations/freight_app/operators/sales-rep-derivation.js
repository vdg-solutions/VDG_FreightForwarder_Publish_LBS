// sales-rep-derivation.js — F-41-01: who a job belongs to is DERIVED, not "whoever typed it".
//
// The industry rule (CargoWise/Magaya): the ops person creates the file, the salesperson comes
// from data — the attached quote's creator, else the customer master's assigned rep, else an
// explicit pick. The signed-in user is a valid default ONLY when they actually hold a sales
// role: a CS-created job defaulting to the CS account put the revenue fork, the publish fork
// and the Job No namespace on the wrong person.
//
// Everything here is pure so the precedence is testable without a DOM.

const SENTINEL_SHAPE = /^__.*__$/; // '__MANAGER__' — a role token, never a rep

const SALES_ROLES = ['SalesRep', 'SalesManager'];

/// Precedence: explicit route (?sales= — also the quote-convert door) → the draft/prior record's
/// own rep → the customer master's assigned rep → self (only when self IS a sales person).
/// '' means "nobody derivable — the form must ask".
export function deriveSalesRep({ routeRep = null, draftRep = null, customerRep = null, selfRep = null } = {}) {
  return validRep(routeRep) || validRep(draftRep) || validRep(customerRep) || validRep(selfRep) || '';
}

/// The signed-in session as a rep candidate: only when it holds a sales role, and never a
/// sentinel token — '__MANAGER__' is a role, not a fork anybody's revenue should land in.
export function selfRepCandidate(roles, token) {
  const isSales = (roles || []).some((r) => SALES_ROLES.includes(r));
  return isSales ? validRep(token) : '';
}

/// The customer master's assigned rep, by the name the form stores.
export function customerRepFor(customerName, customers) {
  if (!customerName) return '';
  const row = (customers || []).find((c) => (c.name || '') === customerName);
  return validRep(row?.sales_rep_id);
}

function validRep(token) {
  if (!token || typeof token !== 'string') return '';
  return SENTINEL_SHAPE.test(token) ? '' : token;
}
