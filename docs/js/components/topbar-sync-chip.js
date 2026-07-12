// Smart sync chip — pure helpers + lit template factory
// html is received as a parameter so this module has no CDN import (unit-testable).

// AC-03/10 named constants (R-C)
export const SYNC_HEALTHY_PENDING_THRESHOLD = 10;
export const SYNC_HEALTHY_RECENT_MS         = 30_000;
export const SYNC_STUCK_NOTIFY_MS           = 5 * 60_000;
export const SYNC_RETRY_PROMOTE_THRESHOLD   = 2;

// Color → Tailwind class map (used by AC-01/03 introspection)
export const DOT_CLASS = {
  green:  'bg-emerald-500',
  yellow: 'bg-amber-400',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
};

// State color → i18n semantic label key (AC-07)
export const STATE_TO_LABEL_KEY = {
  green:  'healthy',
  yellow: 'flushing',
  orange: 'retrying',
  red:    'offline',
};

// AC-07 — aria-label builder; pure, testable without DOM
export function buildAriaLabel(state, outboxCount, t) {
  const key    = STATE_TO_LABEL_KEY[state] ?? 'healthy';
  const suffix = outboxCount > 0
    ? ` (${t('topbar.sync.tooltip.pending').replace('{n}', outboxCount)})`
    : '';
  return `${t('topbar.sync.label')} — ${t(`topbar.sync.state.${key}`)}${suffix}`;
}

// AC-03 — 4-state color machine; clock injected via `now`
export function computeChipState({ pending, retrying, retryStreak, backoff429, offline, signedOut, lastSyncMs, now }) {
  if (offline || signedOut) return 'red';
  if (pending > 0 && lastSyncMs > 0 && (now - lastSyncMs) > SYNC_STUCK_NOTIFY_MS) return 'red';
  if (backoff429) return 'orange';
  if (retrying) return retryStreak >= SYNC_RETRY_PROMOTE_THRESHOLD ? 'orange' : 'yellow';
  return 'green';
}

// AC-10 — whether pending count should surface in UI
export function shouldShowCount({ pending, lastSyncMs, now }) {
  if (pending <= 0) return false;
  if (pending >= SYNC_HEALTHY_PENDING_THRESHOLD) return true;
  return (now - lastSyncMs) > SYNC_HEALTHY_RECENT_MS;
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
export function buildChipTitle({ state, ago, lastError, t, user, online }) {
  if (state === 'red' && !user)   return t('topbar.sync.tooltip.click_to_signin');
  if (state === 'red' && !online) return t('topbar.sync.tooltip.waiting_network');
  const stateKey  = STATE_TO_LABEL_KEY[state] ?? 'healthy';
  const stateText = t(`topbar.sync.state.${stateKey}`);
  if (state === 'green') {
    return ago
      ? t('topbar.sync.tooltip.lastSync').replace('{ago}', ago)
      : t('topbar.sync.tooltip.lastSync.never');
  }
  if (lastError && (state === 'orange' || state === 'red')) {
    return `${stateText} — ${lastError}`;
  }
  return stateText;
}

// AC-01/03/04/05/07/08 — chip-as-button lit template factory (F-18-04)
// Dropdown panel removed. Tooltip via native `title` attr (dismisses on mouseleave, no JS needed).
// `html` from lit is passed by the caller so this file needs no CDN import.
export function renderSyncChip({
  html, state, pending, lastSyncMs, now, online,
  ariaLabel, labelText, lastError, t, onSyncNow, user,
}) {
  const dotClass   = DOT_CLASS[state] ?? DOT_CLASS.green;
  const isFlushing = state === 'yellow';
  const hasPending = pending > 0;
  const pulseClass = hasPending ? 'animate-pulse' : '';
  const ago        = formatLastSyncAgo(lastSyncMs, now);
  const titleText  = buildChipTitle({ state, ago, lastError, t, user, online });

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
      <span class="w-2 h-2 rounded-full ${dotClass} ${pulseClass}" aria-hidden="true"></span>
      <span>${labelText}</span>
    </button>`;
}
