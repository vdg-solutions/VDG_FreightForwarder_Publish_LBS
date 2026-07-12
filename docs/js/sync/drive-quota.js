// F-15-08 — Drive quota check + warning dispatch

const QUOTA_LS_KEY            = 'vdg.quota.last_check_ms';
const QUOTA_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // weekly
const QUOTA_WARN_THRESHOLD    = 0.80;
const QUOTA_ABOUT_FIELDS      = 'storageQuota(limit,usageInDrive,usage)';

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Check Drive storage quota. Dispatches `vdg:quota-warning` if > 80%.
 * No-ops if checked within the past week.
 * @param {object} driveApi — drive-api module (real or mock)
 */
export async function checkDriveQuota(driveApi) {
  const lastMs = parseInt(localStorage.getItem(QUOTA_LS_KEY) || '0', 10);
  if (Date.now() - lastMs < QUOTA_CHECK_INTERVAL_MS) return;

  try {
    const data  = await driveApi.driveFetch('GET', `/about?fields=${encodeURIComponent(QUOTA_ABOUT_FIELDS)}`);
    const quota = data?.storageQuota;
    if (!quota) return;

    const limit = parseInt(quota.limit || '0', 10);
    const used  = parseInt(quota.usage || quota.usageInDrive || '0', 10);

    localStorage.setItem(QUOTA_LS_KEY, String(Date.now()));

    if (limit > 0 && used / limit >= QUOTA_WARN_THRESHOLD) {
      window.dispatchEvent(new CustomEvent('vdg:quota-warning', {
        detail: { used, limit, ratio: used / limit },
      }));
    }
  } catch (err) {
    /* quota check is non-critical — log only */
    console.warn('[drive-quota] check failed:', err?.message ?? err); // DEV
  }
}
