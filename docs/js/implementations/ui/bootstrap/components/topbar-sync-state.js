// Sync-pipeline listener lifecycle — vdg:sync-started/complete/error, vdg:delta-synced,
// vdg:server-health, and the stuck-notification recheck timer built on top of them.
//
// Split out of topbar.js at the 350-line cap (backlog/wiki/file-size-doctrine.md). The seam: this
// is a small state machine with its own subscribe/unsubscribe lifecycle (connectedCallback wires
// it up, disconnectedCallback tears it down) riding on top of the bar's render — same host-DI
// shape as topbar-menus.js/topbar-import.js, where `host` (the vdg-topbar element) owns the
// reactive fields and this module only reads/writes them by name.

import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { shouldFireStuckNotification } from './topbar-sync-chip.js';

export const STUCK_RECHECK_INTERVAL_MS = 30_000;

/// Builds the bound handler set once (constructor time) so connect/disconnect add/remove the
/// SAME function references. `host` is the vdg-topbar element.
export function createSyncHandlers(host) {
  return {
    // vdg:sync-started (charter_event_bridge.rs: SyncEvent::SyncStarted/ResyncStarted) — a pass
    // just began; cleared by whichever of sync-complete/sync-error ends it (below).
    onSyncStarted: () => { host._syncing = true; },
    onSyncComplete: (e) => {
      host._lastSyncMs = e.detail?.ts ?? Date.now(); host._retryStreak = 0;
      host._retrying = false; host._lastError = null; host._lastNotifiedStuckEpisode = 0;
      host._syncing = false;
      // outbox.rs's own drain-complete check is gated on PENDING rows only (a quarantined row is
      // excluded on purpose, see outbox.rs::outbox_len) — this event can fire true while a
      // quarantined row still sits in the outbox. Carrying the count here is what stops that
      // from reading as "fully healthy" (topbar-sync-chip.js::computeChipState checks it first).
      if (e.detail?.quarantined !== undefined) host._quarantinedCount = e.detail.quarantined;
    },
    // Pull heartbeat only — must NOT clear retry/error state (those are push-side signals)
    onDeltaSynced: (e) => { host._lastPullMs = e.detail?.ts ?? Date.now(); },
    onSyncError: (e) => {
      host._retryStreak++; host._retrying = true; host._syncing = false;
      // F-19-20 / F-58-02: known reason codes get a localized string; raw error text otherwise.
      // rate_budget is deliberately its own branch, not folded into the generic fallback — a
      // reader must be able to tell "my own client is refusing calls" from an ordinary network
      // blip, which is exactly the distinction that stayed invisible through the 2026-08-25
      // incident (a console.warn nobody watches is not a report).
      host._lastError = e.detail?.reason === 'max_retries'
        ? t('topbar.sync.tooltip.max_retries_reason')
        : e.detail?.reason === 'rate_budget'
        ? t('topbar.sync.tooltip.rate_budget_reason')
        : (e.detail?.error ?? null);
      // D12: a remote-decode skip (event_bridge.rs's own "record_skipped" reason) never touches
      // the outbox, so the vdg:outbox-changed/vdg:sync-complete events this chip already reads
      // `_quarantinedCount` from may never fire again this session (a read-only session has no
      // outbox activity at all) — re-read the Rust-decided snapshot right here instead of
      // waiting on an outbox event that might never come. Still Rust's own count (outbox.rs's
      // snapshot() now folds sync_health::skipped_len() in), not a count kept in JS.
      if (e.detail?.reason === 'record_skipped') {
        window.__vdg_repo?.outbox_snapshot?.()
          .then((snap) => { if (snap) host._quarantinedCount = snap.quarantined ?? host._quarantinedCount; })
          .catch(() => { /* best-effort — the next outbox event corrects it if this read fails */ });
      }
    },
    onServerHealth: (e) => {
      // A probe that could not reach the server carries no backlog number, and the one we last
      // read is now unknowable — not zero, not still valid. Left standing it froze at whatever it
      // last saw and painted "đang sao lưu" forever, through a whole outage, with nothing pending
      // and nothing changed. Drop it: `unreachable` is the honest state, and the next successful
      // poll re-establishes the real count.
      if (e.detail?.unreachable) {
        host._serverBacklog = 0;
        // Same rule, same reason: a probe that never landed makes the last count unknowable, not
        // zero. Holding a stale 1 here would paint "Cần xử lý" through an outage that says nothing
        // about whether anything is actually parked.
        host._serverQuarantined = 0;
        host._serverOldestPendingAgeMs = null;
        host.requestUpdate();
        return;
      }
      if (e.detail?.backlog_depth !== undefined) host._serverBacklog = Number(e.detail.backlog_depth) || 0;
      // Guarded on !== undefined, not truthiness: backend.js's HEADER branch dispatches this same
      // event carrying backlog alone, and must not be read as "the server says zero quarantined".
      if (e.detail?.server_quarantined_depth !== undefined) {
        host._serverQuarantined = Number(e.detail.server_quarantined_depth) || 0;
      }
      if (e.detail?.oldest_pending_age_ms !== undefined) host._serverOldestPendingAgeMs = e.detail.oldest_pending_age_ms;
      if (e.detail?.provider) host._serverProvider = e.detail.provider;
      // F-58-02: sync_delta.rs only sends this field when one tick's own call count went above
      // its stated steady-state budget — reusing vdg:server-health rather than a new channel. It
      // rides the SAME visible tooltip vdg:sync-error already uses (topbar-sync-chip renders
      // `_lastError`), not a devtools-only log — a "successful" but abnormally large tick must be
      // as visible as an outright failure, which is exactly what stayed invisible on 2026-08-25.
      if (e.detail?.sync_tick_calls !== undefined) {
        host._lastError = t('topbar.sync.tooltip.high_volume_reason', { n: e.detail.sync_tick_calls });
      }
      host.requestUpdate();
    },
  };
}

/// Stuck-outbox desktop notification — one-shot per stuck episode, gated on Notification
/// permission. Called from the recheck interval below and from the bar's online/offline flips
/// (an offline->online transition can itself cross the stuck threshold).
export function recomputeAndMaybeNotify(host) {
  const now = Date.now();
  const perm = (typeof Notification !== 'undefined') ? Notification.permission : undefined;
  if (shouldFireStuckNotification({
    now, lastSyncMs: host._lastSyncMs, pending: host._outboxCount,
    lastNotifiedStuckEpisode: host._lastNotifiedStuckEpisode, permission: perm,
  })) {
    const body = t('topbar.sync.stuck.body').replace('{n}', String(host._outboxCount));
    new Notification(t('topbar.sync.stuck.title'), { body }); // eslint-disable-line no-new
    host._lastNotifiedStuckEpisode = host._lastSyncMs;
  }
  host.requestUpdate();
}

/// Adds the 5 sync-pipeline listeners + starts the stuck-recheck interval. `host._syncHandlers`
/// must already hold the set built by createSyncHandlers (constructor time).
export function attachSyncListeners(host) {
  window.addEventListener('vdg:sync-started',  host._syncHandlers.onSyncStarted);
  window.addEventListener('vdg:sync-complete', host._syncHandlers.onSyncComplete);
  window.addEventListener('vdg:delta-synced',  host._syncHandlers.onDeltaSynced);
  window.addEventListener('vdg:sync-error',    host._syncHandlers.onSyncError);
  window.addEventListener('vdg:server-health', host._syncHandlers.onServerHealth);
  host._stuckTickId = setInterval(() => recomputeAndMaybeNotify(host), STUCK_RECHECK_INTERVAL_MS);
}

export function detachSyncListeners(host) {
  window.removeEventListener('vdg:sync-started',  host._syncHandlers.onSyncStarted);
  window.removeEventListener('vdg:sync-complete', host._syncHandlers.onSyncComplete);
  window.removeEventListener('vdg:delta-synced',  host._syncHandlers.onDeltaSynced);
  window.removeEventListener('vdg:sync-error',    host._syncHandlers.onSyncError);
  window.removeEventListener('vdg:server-health', host._syncHandlers.onServerHealth);
  clearInterval(host._stuckTickId);
}
