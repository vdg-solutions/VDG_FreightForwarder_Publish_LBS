// Smart sync chip — pure helpers + lit template factory
// html is received as a parameter so this module has no CDN import (unit-testable).

// AC-03/10 named constants (R-C)
export const SYNC_HEALTHY_PENDING_THRESHOLD = 10;
export const SYNC_HEALTHY_RECENT_MS         = 30_000;
export const SYNC_STUCK_NOTIFY_MS           = 5 * 60_000;

// Color → Tailwind class map (used by AC-01/03 introspection)
export const DOT_CLASS = {
  green:       'bg-emerald-500',
  yellow:      'bg-amber-400',
  backing_up:  'bg-amber-400',
  orange:      'bg-orange-500',
  red:         'bg-red-500',
  pending:     'bg-slate-400', // F-50-01 — calm, distinct from red: expected structural wait, not a failure
  quarantined: 'bg-rose-700',  // a decided, permanent refusal (outbox.rs::quarantine_group) —
                                // its own shade, never the plain 'red' used for an ordinary
                                // offline/reconnect wait that resolves on its own
  unreachable: 'bg-red-500',   // H4-b: the server cannot be reached at all — as alarming as
                                // offline, but its own STATE key so decideChipAction/tooltip
                                // never reuse the signin/reconnect wording 'red' carries
};

// State color → i18n semantic label key (AC-07)
export const STATE_TO_LABEL_KEY = {
  green:       'healthy',
  yellow:      'flushing',
  backing_up:  'backing_up',
  orange:      'retrying',
  red:         'offline',
  pending:     'auth_pending', // F-50-01 AC-10 — distinct key, never reuses offline/healthy
  quarantined: 'quarantined',
  unreachable: 'unreachable',  // H4-b — own key, never folded into 'offline' or 'retrying'
};

// AC-07 — aria-label builder; pure, testable without DOM
export function buildAriaLabel(state, outboxCount, t, serverBacklog = 0) {
  const key    = STATE_TO_LABEL_KEY[state] ?? 'healthy';
  let suffix = '';
  if (outboxCount > 0) {
    suffix = ` (${t('topbar.sync.tooltip.pending').replace('{n}', outboxCount)})`;
  } else if (state === 'backing_up' && serverBacklog > 0) {
    suffix = ` (${serverBacklog})`;
  }
  return `${t('topbar.sync.label')} — ${t(`topbar.sync.state.${key}`)}${suffix}`;
}

// AC-03 — state machine; clock injected via `now`. F-50-01 added the calm 'pending' state
// (AC-06/07/08); this fn's OWN decision beyond that is browser-only (online/auth/backoff) —
// whether the DATA itself is trustworthy right now (pending/failed/unreachable/quarantined) is
// Rust's own verdict (sync_health.rs), passed in as `syncFailed`/`unreachable`/`quarantined`
// rather than re-derived here from a JS-tracked retry counter (owner: "mọi business đều phải
// nằm trong wasm" — a failed collection or a quarantined row is exactly that kind of decision,
// not a render).
export function computeChipState({
  pending, syncFailed, unreachable = false, quarantined, backoff429, offline, signedOut, lastSyncMs, now,
  authReconnect, authPending,
  serverBacklog = 0, serverOldestPendingAgeMs = null, serverProvider = 'Google Drive',
}) {
  if (authReconnect) return 'red';          // F-29-13 AC-05 — genuine reconnect need
  if (offline || signedOut) return 'red';
  if (pending > 0 && lastSyncMs > 0 && (now - lastSyncMs) > SYNC_STUCK_NOTIFY_MS) return 'red';
  // A quarantined row is Rust's own decided, permanent fact (outbox.rs::quarantine_group) — no
  // amount of waiting fixes it, so it outranks every other domain signal and must never fold
  // into "just still retrying" or, worse, the healthy "nothing pending" case.
  if (quarantined) return 'quarantined';
  if (authPending) return 'pending';        // F-50-01 AC-06 — expected structural popup-blocked wait
  // H4-b: `unreachable` is Rust's own sync_health::is_unreachable() — the whole-session delta
  // pull itself failing, never a single master kind's bootstrap miss. Ranked ABOVE the softer
  // 'orange' signals below (a slow secondary backup / a rate-limit backoff / one narrow kind
  // failing) because "nothing can reach the server" is strictly worse than any of those, and
  // deliberately independent of `serverBacklog` (backing_up, further below) — that counter stays
  // permanently non-zero while its own drain bug is open, and must never be read as an outage.
  if (unreachable) return 'unreachable';
  if (serverOldestPendingAgeMs !== null && serverOldestPendingAgeMs !== undefined && serverOldestPendingAgeMs > 300_000) {
    return 'orange';
  }
  if (backoff429) return 'orange';
  // syncFailed is Rust's own sync_health verdict — a real bootstrap/push attempt came back with
  // an error this session and has not since succeeded, never a JS-tracked streak.
  if (syncFailed) return 'orange';
  if (pending > 0 && lastSyncMs === 0) return 'yellow'; // F-19-80 D-B — never-synced baseline with pending backlog must not be green
  if (pending > 0) return 'yellow';
  if (serverBacklog > 0) return 'backing_up';
  return 'green';
}

// AC-10 — whether pending count should surface in UI
export function shouldShowCount({ pending, lastSyncMs, now }) {
  if (pending <= 0) return false;
  if (pending >= SYNC_HEALTHY_PENDING_THRESHOLD) return true;
  return (now - lastSyncMs) > SYNC_HEALTHY_RECENT_MS;
}

// Display timestamp = freshest of push drain (vdg:sync-complete) and pull heartbeat
// (vdg:delta-synced). Display only — stuck detection stays push-based (pending is outbox).
export function displayLastSyncMs(pushMs, pullMs) {
  return Math.max(pushMs || 0, pullMs || 0);
}

// AC-02 — last-sync human label; returns '30s', '2m', or null when never synced
export function formatLastSyncAgo(lastSyncMs, now) {
  if (!lastSyncMs) return null;
  const s = Math.round((now - lastSyncMs) / 1_000);
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)}m`;
}

// AC-06 — pure stuck-notification gate (caller constructs Notification)
export function shouldFireStuckNotification({ now, lastSyncMs, pending, lastNotifiedStuckEpisode, permission }) {
  if (permission !== 'granted') return false;
  if (pending <= 0) return false;
  if (!lastSyncMs || (now - lastSyncMs) <= SYNC_STUCK_NOTIFY_MS) return false;
  return lastSyncMs !== lastNotifiedStuckEpisode; // one-shot per stuck episode
}

// AC-01 — native tooltip text; pure, no DOM
// user/online added for red-signedOut and red-offline branch (F-19-19)
export function buildChipTitle({
  state, ago, lastError, t, user, online, authReconnect, popupBlocked, quarantinedCount = 0,
  serverBacklog = 0, serverOldestPendingAgeMs = null, serverProvider = 'Google Drive',
}) {
  if (state === 'red' && popupBlocked)    return t('auth.popup_blocked');              // F-49-01 — ad-blocker nulled window.open
  if (state === 'red' && authReconnect)   return t('topbar.sync.tooltip.reconnect');   // F-29-13 AC-05
  if (state === 'red' && !user)   return t('topbar.sync.tooltip.click_to_signin');
  if (state === 'red' && !online) return t('topbar.sync.tooltip.waiting_network');
  if (state === 'quarantined')    return t('topbar.sync.tooltip.quarantined').replace('{n}', String(quarantinedCount));
  if (state === 'pending')        return t('topbar.sync.tooltip.auth_pending'); // F-50-01 AC-10 — calm, no "hết hạn"/expired wording
  if (state === 'backing_up') {
    return t('topbar.sync.tooltip.backing_up')
      .replace('{provider}', serverProvider || 'Google Drive')
      .replace('{n}', String(serverBacklog));
  }
  if (state === 'orange' && serverOldestPendingAgeMs !== null && serverOldestPendingAgeMs !== undefined && serverOldestPendingAgeMs > 300_000) {
    return t('topbar.sync.tooltip.backup_retry')
      .replace('{provider}', serverProvider || 'Google Drive');
  }
  const stateKey  = STATE_TO_LABEL_KEY[state] ?? 'healthy';
  const stateText = t(`topbar.sync.state.${stateKey}`);
  if (state === 'green') {
    if (serverProvider) {
      return t('topbar.sync.tooltip.healthy_secondary').replace('{provider}', serverProvider);
    }
    return ago
      ? t('topbar.sync.tooltip.lastSync').replace('{ago}', ago)
      : t('topbar.sync.tooltip.lastSync.never');
  }
  if (lastError && (state === 'orange' || state === 'red' || state === 'unreachable')) {
    return `${stateText} — ${lastError}`;
  }
  return stateText;
}

// AC-01/03/04/05/07/08 — chip-as-button lit template factory (F-18-04)
// Dropdown panel removed. Tooltip via native `title` attr (dismisses on mouseleave, no JS needed).
// `html` from lit is passed by the caller so this file needs no CDN import.
export function renderSyncChip({
  html, state, pending, lastSyncMs, now, online,
  ariaLabel, labelText, lastError, t, onSyncNow, user, authReconnect, popupBlocked,
  quarantinedCount = 0,
  serverBacklog = 0, serverOldestPendingAgeMs = null, serverProvider = 'Google Drive',
  syncing = false, // vdg:sync-started (charter_event_bridge.rs) — a pass is in flight even with no backlog
}) {
  const dotClass   = DOT_CLASS[state] ?? DOT_CLASS.green;
  const isFlushing = state === 'yellow' || syncing;
  const hasPending = pending > 0;
  const pulseClass = (hasPending || syncing) ? 'animate-pulse' : '';
  const ago        = formatLastSyncAgo(lastSyncMs, now);
  const titleText  = buildChipTitle({
    state, ago, lastError, t, user, online, authReconnect, popupBlocked, quarantinedCount,
    serverBacklog, serverOldestPendingAgeMs, serverProvider,
  });

  return html`
    <button type="button"
            data-sync-chip
            class="sync-chip hidden md:inline-flex h-9 items-center gap-1.5 px-2.5 rounded-md
                   text-[11px] font-medium text-slate-600 hover:bg-slate-100
                   focus-visible:ring-2 focus-visible:ring-blue-500 transition"
            role="button"
            tabindex="0"
            aria-label="${ariaLabel}"
            aria-busy="${isFlushing ? 'true' : 'false'}"
            title="${titleText}"
            @click="${onSyncNow}">
      ${authReconnect
        ? html`<svg class="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        : html`<span class="w-2 h-2 rounded-full ${dotClass} ${pulseClass}" aria-hidden="true"></span>`}
      <span class="${authReconnect ? 'text-red-600 font-semibold' : ''}">${labelText}</span>
    </button>`;
}

// AC-06 — chip click actions; centralizes the reconnect-click decision (unit-testable)
export const CHIP_ACTION = { NOOP:'noop', SIGNIN:'signin', WAITING_NETWORK:'waiting_network',
  FORCE_RETRY:'force_retry', RECONNECT:'reconnect', SYNC_NOW:'sync_now' };

// AC-06 — pure click decision; reconnect wins over signin/offline when authReconnect is set
/// This deployment keeps its data on the server, so the browser holds a SERVER session — the
/// credential that expires is that session, and the way back is a plain sign-in, never a Drive
/// re-consent (which would ask Google for a scope this build never uses, raising the "Google
/// hasn't verified this app" warning on a perfectly ordinary session timeout).
export function decideChipAction({ state, user, online, lastError, authReconnect }) {
  if (state === 'yellow')                     return CHIP_ACTION.NOOP;
  if (state === 'backing_up')                 return CHIP_ACTION.NOOP;
  if (state === 'pending')                    return CHIP_ACTION.NOOP; // F-50-01 AC-12 — click isn't swallowed: the window-level gesture listener still fires independently
  // A quarantined row needs a code fix, not a retry — nothing behind this click could resolve it.
  if (state === 'quarantined')                return CHIP_ACTION.NOOP;
  if (state === 'red' && authReconnect)       return CHIP_ACTION.SIGNIN;
  if (state === 'red' && !user)               return CHIP_ACTION.SIGNIN;
  if (state === 'red' && !online)             return CHIP_ACTION.WAITING_NETWORK;
  // H4-b: a click can't fix "the server is down" any faster than the delta tick's own retry —
  // same FORCE_RETRY affordance a narrow failed kind already gets, never NOOP (a genuine outage
  // is exactly the case a manager wants a manual nudge for, unlike the quarantined/pending waits
  // above which a click cannot resolve at all).
  if (state === 'unreachable')                return CHIP_ACTION.FORCE_RETRY;
  if (state === 'orange' && lastError)        return CHIP_ACTION.FORCE_RETRY;
  return CHIP_ACTION.SYNC_NOW;
}
