// Route prefetch — L2 preload for dashboard

import { toLocalDateStr } from '../../../kernel/core_abstractions/util/today-local.js';
import { listEnvelopes } from '../../core_abstractions/ports/shipment-repo.js';

const PREFETCH_DAYS_BACK = 30;

// Preload shipments with etd in last PREFETCH_DAYS_BACK days into L1 via repo.list
export async function prefetchDashboard(repo) {
  if (!repo) return;
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PREFETCH_DAYS_BACK);
    const cutoffIso = toLocalDateStr(cutoff);
    await listEnvelopes(repo, (r) => (r.etd || '') >= cutoffIso);
  } catch (err) {
    console.warn('[route-prefetch] dashboard prefetch failed:', err.message); // DEV
  }
}
