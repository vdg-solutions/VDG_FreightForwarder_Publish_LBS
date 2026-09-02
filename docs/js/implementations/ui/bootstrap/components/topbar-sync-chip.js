// Smart sync chip — pure helpers + lit template factory
// html is received as a parameter so this module has no CDN import (unit-testable).

// AC-03/10 named constants (R-C)
export const SYNC_HEALTHY_PENDING_THRESHOLD = 10;
export const SYNC_HEALTHY_RECENT_MS         = 30_000;
export const SYNC_STUCK_NOTIFY_MS           = 5 * 60_000;

// durability_verdict.rs contract — the store's own verdict on whether local writes survive a
// reload ({kind, mode, cause?}, relayed via vdg:store-durability). JS only maps kind → chip
// state; the classification (unknown modes included — Rust fails those closed) happened in Rust.
export const DURABILITY_VOLATILE = 'volatile';
export const DURABILITY_REBUILT  = 'rebuilt';

// mirror_backlog_verdict.rs contract — the secondary (Drive) backup queue's own verdict
// ({kind, age_ms}), relayed on vdg:server-health under this property. Drive is not on the write
// path: a record is durable on the server before a mirror row exists, so a moving queue is
// INFORMATION. "Is it moving?" is a decision and it is Rust's — these names are that module's
// constants and mirror-backlog-verdict-drift.test.mjs fails if they stop matching it.
export const MIRROR_BACKLOG_PROP = 'mirror_backlog';
export const MIRROR_IDLE     = 'idle';
export const MIRROR_DRAINING = 'draining';
export const MIRROR_STALE    = 'stale';
export const MIRROR_UNKNOWN  = 'unknown';

// Backlog-age wording. Display only — the staleness DECISION is mirror_backlog_verdict.rs's, and
// this file never compares an age to anything.
const MS_PER_MINUTE    = 60_000;
const MINUTES_PER_HOUR = 60;

// volatile cause → tooltip key; a cause this build doesn't know gets the generic wording rather
// than a raw key on screen.
const VOLATILE_CAUSE_TO_TOOLTIP_KEY = {
  no_opfs:    'topbar.sync.tooltip.volatile_no_opfs',
  stale_self: 'topbar.sync.tooltip.volatile_stale_self',
};
const VOLATILE_TOOLTIP_FALLBACK_KEY = 'topbar.sync.tooltip.volatile';

// Color → Tailwind class map (used by AC-01/03 introspection)
export const DOT_CLASS = {
  green:       'bg-emerald-500',
  yellow:      'bg-amber-400',
  backing_up:  'bg-sky-500',   // informational, NOT amber: the record is already durable on the
                                // server and the queue is moving. It wore the warning amber, which
                                // is how a reader learns to ignore the dot that also carries a
                                // quarantined row.
  backup_stale: 'bg-amber-400', // the backup queue has stopped moving (mirror_backlog_verdict.rs)
                                // — the one backlog shape that IS a warning short of quarantine
  orange:      'bg-orange-500',
  red:         'bg-red-500',
  pending:     'bg-slate-400', // F-50-01 — calm, distinct from red: expected structural wait, not a failure
  quarantined: 'bg-rose-700',  // a decided, permanent refusal (outbox.rs::quarantine_group) —
                                // its own shade, never the plain 'red' used for an ordinary
                                // offline/reconnect wait that resolves on its own
  unreachable: 'bg-red-500',   // H4-b: the server cannot be reached at all — as alarming as
                                // offline, but its own STATE key so decideChipAction/tooltip
                                // never reuse the signin/reconnect wording 'red' carries
  volatile:    'bg-rose-700',  // the local store is RAM (durability_verdict.rs) — every queued
                                // write dies with the tab; same decided-severe shade family as
                                // quarantined, never the transient offline red
  rebuilt:     'bg-amber-400', // the on-disk cache (old outbox included) was dropped for a
                                // schema change — a local wipe re-syncing, not a failure
};

// State color → i18n semantic label key (AC-07)
export const STATE_TO_LABEL_KEY = {
  green:       'healthy',
  yellow:      'flushing',
  backing_up:  'backing_up',
  backup_stale: 'backup_stale', // own key — "the backup stopped moving" is not "retrying"
  orange:      'retrying',
  red:         'offline',
  pending:     'auth_pending', // F-50-01 AC-10 — distinct key, never reuses offline/healthy
  quarantined: 'quarantined',
  unreachable: 'unreachable',  // H4-b — own key, never folded into 'offline' or 'retrying'
  volatile:    'volatile',     // own key — "not saved on this machine" is neither offline nor retrying
  rebuilt:     'rebuilt',
};

// AC-07 — aria-label builder; pure, testable without DOM
export function buildAriaLabel(state, outboxCount, t, serverBacklog = 0) {
  const key    = STATE_TO_LABEL_KEY[state] ?? 'healthy';
  let suffix = '';
  if (outboxCount > 0) {
    suffix = ` (${t('topbar.sync.tooltip.pending').replace('{n}', outboxCount)})`;
  } else if ((state === 'backing_up' || state === 'backup_stale') && serverBacklog > 0) {
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
  authReconnect, authPending, storeDurability = null, mirrorBacklog = null,
}) {
  if (authReconnect) return 'red';          // F-29-13 AC-05 — genuine reconnect need
  if (offline || signedOut) return 'red';
  if (pending > 0 && lastSyncMs > 0 && (now - lastSyncMs) > SYNC_STUCK_NOTIFY_MS) return 'red';
  // The local store is RAM (durability_verdict.rs: no OPFS, a stale-handle fallback, or a mode
  // this build doesn't know — Rust fails those closed): EVERY queued write dies with the tab, the
  // outbox included. Outranks quarantined (some rows parked is narrower than the whole store
  // volatile); only the red trio ranks higher, because signing in / getting network back is the
  // way anything gets to the server at all.
  if (storeDurability?.kind === DURABILITY_VOLATILE) return 'volatile';
  // A quarantined row is Rust's own decided, permanent fact (outbox.rs::quarantine_group) — no
  // amount of waiting fixes it, so it outranks every other domain signal and must never fold
  // into "just still retrying" or, worse, the healthy "nothing pending" case.
  if (quarantined) return 'quarantined';
  if (authPending) return 'pending';        // F-50-01 AC-06 — expected structural popup-blocked wait
  // H4-b: `unreachable` is Rust's own sync_health::is_unreachable() — the whole-session delta
  // pull itself failing, never a single master kind's bootstrap miss. Ranked ABOVE the softer
  // 'orange' signals below (a rate-limit backoff / one narrow kind failing) because "nothing can
  // reach the server" is strictly worse than any of those, and deliberately independent of the
  // secondary backup's own backlog (further below) — a queue with rows in it says nothing about
  // whether the server is reachable, and must never be read as an outage.
  if (unreachable) return 'unreachable';
  if (backoff429) return 'orange';
  // syncFailed is Rust's own sync_health verdict — a real bootstrap/push attempt came back with
  // an error this session and has not since succeeded, never a JS-tracked streak.
  if (syncFailed) return 'orange';
  if (pending > 0 && lastSyncMs === 0) return 'yellow'; // F-19-80 D-B — never-synced baseline with pending backlog must not be green
  if (pending > 0) return 'yellow';
  // Ranked below every signal above and above the informational ones below. A stalled SECONDARY
  // copy is a real warning, but strictly less urgent than anything on the write path — a local
  // outbox row is not on the server yet at all, and an 'orange' is the primary tier itself
  // failing. Above 'rebuilt'/'backing_up' because those two report facts, not faults.
  const mirrorKind = mirrorBacklog?.kind;
  if (mirrorKind === MIRROR_STALE) return 'backup_stale';
  // One-time boot fact: the schema rebuild dropped the cache AND the old outbox. Shown whenever
  // nothing more urgent is, so a local wipe never reads as an ordinary green boot.
  if (storeDurability?.kind === DURABILITY_REBUILT) return 'rebuilt';
  // Two kinds, one rendering, deliberately: a timed queue that is moving and a queue Rust could
  // not time at all (an older server with no `oldest_pending_age_ms`) are both "queued, no fault
  // shown". They stay distinct in the verdict so neither can be widened into `stale` later.
  if (mirrorKind === MIRROR_DRAINING || mirrorKind === MIRROR_UNKNOWN) return 'backing_up';
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

// How long the secondary backup's oldest queued item has been waiting, in words. Rendering only:
// mirror_backlog_verdict.rs already decided whether that duration is a fault.
export function formatBacklogAge(ageMs) {
  if (ageMs === null || ageMs === undefined) return null;
  const mins = Math.round(ageMs / MS_PER_MINUTE);
  return mins < MINUTES_PER_HOUR ? `${mins}m` : `${Math.round(mins / MINUTES_PER_HOUR)}h`;
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
  storeDurability = null, mirrorBacklog = null,
  serverBacklog = 0, serverProvider = null,
}) {
  if (state === 'red' && popupBlocked)    return t('auth.popup_blocked');              // F-49-01 — ad-blocker nulled window.open
  if (state === 'red' && authReconnect)   return t('topbar.sync.tooltip.reconnect');   // F-29-13 AC-05
  if (state === 'red' && !user)   return t('topbar.sync.tooltip.click_to_signin');
  if (state === 'red' && !online) return t('topbar.sync.tooltip.waiting_network');
  if (state === 'volatile') {
    return t(VOLATILE_CAUSE_TO_TOOLTIP_KEY[storeDurability?.cause] ?? VOLATILE_TOOLTIP_FALLBACK_KEY);
  }
  if (state === 'rebuilt')        return t('topbar.sync.tooltip.rebuilt');
  if (state === 'quarantined')    return t('topbar.sync.tooltip.quarantined').replace('{n}', String(quarantinedCount));
  if (state === 'pending')        return t('topbar.sync.tooltip.auth_pending'); // F-50-01 AC-10 — calm, no "hết hạn"/expired wording
  // The provider comes from /api/health's own `mirror.provider` (dispatch.rs:
  // drive_port.provider_name() — "Google Drive" or "GitHub"). Until the server has said it, the
  // client does not know it and must not invent one — neutral "secondary" wording instead.
  if (state === 'backing_up') {
    return t('topbar.sync.tooltip.backing_up')
      .replace('{provider}', serverProvider || t('topbar.sync.provider.secondary'))
      .replace('{n}', String(serverBacklog));
  }
  // The age is Rust's own `age_ms`, printed, not judged. `{ago}` falls back to the plain count
  // wording if the verdict somehow carried no age — never a blank in the sentence.
  if (state === 'backup_stale') {
    const waited = formatBacklogAge(mirrorBacklog?.age_ms);
    const key = waited ? 'topbar.sync.tooltip.backup_stale' : 'topbar.sync.tooltip.backup_stale_untimed';
    return t(key)
      .replace('{provider}', serverProvider || t('topbar.sync.provider.secondary'))
      .replace('{ago}', waited ?? '')
      .replace('{n}', String(serverBacklog));
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
  quarantinedCount = 0, storeDurability = null, mirrorBacklog = null,
  serverBacklog = 0, serverProvider = null,
  syncing = false, // vdg:sync-started (charter_event_bridge.rs) — a pass is in flight even with no backlog
}) {
  const dotClass   = DOT_CLASS[state] ?? DOT_CLASS.green;
  const isFlushing = state === 'yellow' || syncing;
  const hasPending = pending > 0;
  const pulseClass = (hasPending || syncing) ? 'animate-pulse' : '';
  const ago        = formatLastSyncAgo(lastSyncMs, now);
  const titleText  = buildChipTitle({
    state, ago, lastError, t, user, online, authReconnect, popupBlocked, quarantinedCount,
    storeDurability, mirrorBacklog, serverBacklog, serverProvider,
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
  // Only the server's own drain (its write kick and its alarm) moves the secondary queue — a
  // client push cannot, and pretending otherwise is a placebo button. Same NOOP, same reason, as
  // the quarantined case below.
  if (state === 'backup_stale')               return CHIP_ACTION.NOOP;
  if (state === 'pending')                    return CHIP_ACTION.NOOP; // F-50-01 AC-12 — click isn't swallowed: the window-level gesture listener still fires independently
  // A quarantined row needs a code fix, not a retry — nothing behind this click could resolve it.
  if (state === 'quarantined')                return CHIP_ACTION.NOOP;
  // Volatile store: the one useful act is pushing the outbox to the server NOW, before the tab
  // (and the RAM database under it) goes away. 'rebuilt' takes the same default further down.
  if (state === 'volatile')                   return CHIP_ACTION.SYNC_NOW;
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
