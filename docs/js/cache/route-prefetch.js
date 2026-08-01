// Route prefetch — L2 preload for dashboard + audit scroll-load

import { idbGetAllByIndex, STORE_ENTITIES } from './idb-cache.js';

const PREFETCH_DAYS_BACK = 30;
const AUDIT_INITIAL_ROWS = 100;

// Preload shipments with etd in last PREFETCH_DAYS_BACK days into L1 via repo.list
export async function prefetchDashboard(repo) {
  if (!repo) return;
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PREFETCH_DAYS_BACK);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    await repo.list('shipment', (r) => (r.etd || '') >= cutoffIso);
  } catch (err) {
    console.warn('[route-prefetch] dashboard prefetch failed:', err.message); // DEV
  }
}

// Load first AUDIT_INITIAL_ROWS audit log entries from L2 by updated_at
export async function prefetchAuditPage(db, offset = 0) {
  if (!db) return [];
  try {
    const all = await idbGetAllByIndex(db, STORE_ENTITIES, 'by_updated_at', undefined);
    return all.slice(offset, offset + AUDIT_INITIAL_ROWS);
  } catch (err) {
    console.warn('[route-prefetch] audit prefetch failed:', err.message); // DEV
    return [];
  }
}

// Attach IntersectionObserver on sentinel element for audit scroll-load
export function attachAuditScrollLoad(sentinel, db, renderFn) {
  let offset = AUDIT_INITIAL_ROWS;
  const observer = new IntersectionObserver(async (entries) => {
    if (!entries[0].isIntersecting) return;
    const batch = await prefetchAuditPage(db, offset);
    if (batch.length === 0) { observer.disconnect(); return; }
    offset += AUDIT_INITIAL_ROWS;
    renderFn(batch, offset);
  }, { threshold: 0.1 });
  observer.observe(sentinel);
  return observer;
}
