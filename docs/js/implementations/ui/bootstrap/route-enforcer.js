// route-enforcer.js — the side-effecting half of the route guard: toast + navigate away. The
// decision (freight_app/operators/manager/route-guard.js::routeGuard) is pure; this is the UI
// edge that acts on it, called from app.js::renderView.

import { navigate } from './router.js';
import { t } from '../../kernel/core_abstractions/i18n/index.js';
import { routeGuard } from '../../freight_app/operators/manager/route-guard.js';

const TOAST_EVENT       = 'vdg:toast';
const TOAST_TYPE_WARN   = 'warn';
const TOAST_DURATION_MS = 4000;

/** Returns true when navigation was blocked (caller should stop rendering the route). */
export function enforceRouteGuard(route, role) {
  const decision = routeGuard(route, role);
  if (decision === 'allow') return false;
  // Second belt on the same loop: if the policy would bounce us to where we already are, stop —
  // navigating to the current route re-enters the router synchronously.
  if (decision.redirect === route) {
    console.warn('[route-guard] denied on its own redirect target:', route); // DEV
    return true;
  }
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, {
    detail: { type: TOAST_TYPE_WARN, message: t(decision.reason), duration: TOAST_DURATION_MS },
  }));
  navigate(decision.redirect);
  return true;
}
