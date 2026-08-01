// due-soon-tier.js — pure delivery-tier cascade for the "payment due soon" 4-tier ladder
// (F-48-01 B5). No DOM/browser-API access — callers pass plain booleans detected from
// real feature checks (registration.periodicSync, permissions.query, etc.), same shape as
// sw-update-guard.js / topbar-sync-chip.js's decideChipAction/shouldFireStuckNotification.

export const DUE_SOON_TIER = { PBS: 1, SW_ACTIVE: 2, OPEN_TAB_NOTIFY: 3, LIST_ONLY: 4 };

/**
 * Resolves which OS-notification delivery tier applies (B1 table). Tiers 3/4 (the in-app
 * badge/list) always run whenever the tab is open — this fn only picks the single
 * OS-level notification mechanism, cascading top-down: PBS granted > SW registered >
 * Notification permission granted > list-only floor.
 */
export function resolveDueSoonTier({
  hasPeriodicSync, periodicSyncGranted,
  hasServiceWorker, hasBackgroundSync,
  hasNotificationApi, notificationPermission,
}) {
  if (hasPeriodicSync && periodicSyncGranted) return DUE_SOON_TIER.PBS;
  if (hasServiceWorker || hasBackgroundSync) return DUE_SOON_TIER.SW_ACTIVE;
  if (hasNotificationApi && notificationPermission === 'granted') return DUE_SOON_TIER.OPEN_TAB_NOTIFY;
  return DUE_SOON_TIER.LIST_ONLY;
}
