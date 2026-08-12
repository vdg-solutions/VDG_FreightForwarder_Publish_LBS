// Parameterised route handlers for app.js — extracted to stay under 350-line limit
import { loadView } from './util/view-loader.js';
import { mountView } from './util/mount-view.js';
import { freshViewRoot } from './util/view-root.js';

const CUSTOMER360_RE = /^\/manager\/customers\/([^/]+)$/;
const MASTERS_RE     = /^\/manager\/masters\/([^/]+)$/;
const SALES_EDIT_RE  = /^\/sales\/edit\/([^/]+)$/;        // AC-06 reload path
// F-37-03: the create route is no longer keyed by a sales rep. A shipment is not owned by one
// person any more — the envelope is shared and the rep is a FIELD on it — so the rep rides in the
// query like every other prefill, and CS can open the same URL without it reading as theirs.
const SHIPMENT_NEW_RE = /^\/shipments\/new$/;

/**
 * Attempts to match parameterised routes. Returns true if handled, false otherwise.
 * @param {string} route  full route string including query
 * @returns {Promise<boolean>}
 */
export async function tryParamRoute(route) {
  const basePath = route.split('?')[0];

  const c360Match = CUSTOMER360_RE.exec(basePath);
  if (c360Match) {
    const root = freshViewRoot();
    const mod = await loadView(() => import('./views/manager/customer360.js'), root, basePath);
    if (!mod) return true;
    await mountView(() => mod.render(root, { id: c360Match[1], route: basePath }), root, basePath);
    return true;
  }

  const mastersMatch = MASTERS_RE.exec(basePath);
  if (mastersMatch) {
    const root = freshViewRoot();
    const mod = await loadView(() => import('./views/manager/masters.js'), root, basePath);
    if (!mod) return true;
    await mountView(() => mod.render(root, { kind: mastersMatch[1], route: basePath }), root, basePath);
    return true;
  }

  // AC-01..AC-07: edit mode — load existing shipment into the 4-section form
  const salesEditMatch = SALES_EDIT_RE.exec(basePath);
  if (salesEditMatch) {
    const root = freshViewRoot();
    const mod = await loadView(() => import('./views/sales-new.js'), root, basePath);
    if (!mod) return true;
    await mountView(() => mod.render(root, { editRef: salesEditMatch[1], mode: 'edit' }), root, basePath);
    return true;
  }

  // Create a shipment: /shipments/new[?sales=<rep>]  ('me' or absent → the signed-in user)
  if (SHIPMENT_NEW_RE.test(basePath)) {
    const root = freshViewRoot();
    const mod = await loadView(() => import('./views/sales-new.js'), root, basePath);
    if (!mod) return true;
    const qs = new URLSearchParams(route.split('?')[1] || '');
    const quoteId = qs.get('quote_id');
    // job-first path has no quote_id param → quotePrefill stays undefined, opts shape
    // identical to today (AC-01/AC-06 regression guard).
    const quotePrefill = quoteId
      ? { quote_id: quoteId, customer: qs.get('customer') || '', pol: qs.get('pol') || '',
          pod: qs.get('pod') || '', container: qs.get('container') || '' }
      : undefined;
    await mountView(() => mod.render(root, { salesId: qs.get('sales') || 'me', mode: 'create', quotePrefill }), root, basePath);
    return true;
  }

  return false;
}
