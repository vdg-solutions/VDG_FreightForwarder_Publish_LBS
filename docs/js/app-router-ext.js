// Parameterised route handlers for app.js — extracted to stay under 350-line limit
import { loadView } from './util/view-loader.js';

const CUSTOMER360_RE = /^\/manager\/customers\/([^/]+)$/;
const MASTERS_RE     = /^\/manager\/masters\/([^/]+)$/;
const SALES_EDIT_RE  = /^\/sales\/edit\/([^/]+)$/;        // AC-06 reload path
const SALES_PNL_NEW_RE = /^\/sales\/([^/]+)\/pnl\/new$/;  // create PNL; salesId 'me' = self

/**
 * Attempts to match parameterised routes. Returns true if handled, false otherwise.
 * @param {string} route  full route string including query
 * @returns {Promise<boolean>}
 */
export async function tryParamRoute(route) {
  const basePath = route.split('?')[0];
  const root     = document.getElementById('view-root');

  const c360Match = CUSTOMER360_RE.exec(basePath);
  if (c360Match) {
    root.innerHTML = '';
    const mod = await loadView(() => import('./views/manager/customer360.js'), root, basePath);
    if (!mod) return true;
    await mod.render(root, { id: c360Match[1], route: basePath });
    return true;
  }

  const mastersMatch = MASTERS_RE.exec(basePath);
  if (mastersMatch) {
    root.innerHTML = '';
    const mod = await loadView(() => import('./views/manager/masters.js'), root, basePath);
    if (!mod) return true;
    await mod.render(root, { kind: mastersMatch[1], route: basePath });
    return true;
  }

  // AC-01..AC-07: edit mode — load existing shipment into the 4-section form
  const salesEditMatch = SALES_EDIT_RE.exec(basePath);
  if (salesEditMatch) {
    root.innerHTML = '';
    const mod = await loadView(() => import('./views/sales-new.js'), root, basePath);
    if (!mod) return true;
    await mod.render(root, { editRef: salesEditMatch[1], mode: 'edit' });
    return true;
  }

  // Create PNL: /sales/:salesId/pnl/new  (salesId 'me' → current user)
  const pnlNewMatch = SALES_PNL_NEW_RE.exec(basePath);
  if (pnlNewMatch) {
    root.innerHTML = '';
    const mod = await loadView(() => import('./views/sales-new.js'), root, basePath);
    if (!mod) return true;
    await mod.render(root, { salesId: pnlNewMatch[1], mode: 'create' });
    return true;
  }

  return false;
}
