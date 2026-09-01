// compose-ui/governance.js — binds the ui's governance ports to the wasm freight_app exports.
//
// The `repo` arguments some views still pass are ignored on purpose: the Rust use-cases hold
// that port themselves (bootstrap/platform), so the signatures stay what the views already call
// while the store is reached through one path instead of two.
import {
  bindRouteGuard, ROLE_READ_ONLY, UNKNOWN_USER_ID,
} from '../../implementations/ui/core_abstractions/ports/governance/route-guard.js';
import { bindActionGuard } from '../../implementations/ui/core_abstractions/ports/governance/action-guard.js';
import { bindWorkspaceSettings } from '../../implementations/ui/core_abstractions/ports/governance/workspace-settings.js';
import { bindPeriodClose } from '../../implementations/ui/core_abstractions/ports/governance/period-close.js';
import { bindPeriodLockRegistry } from '../../implementations/ui/core_abstractions/ports/governance/period-lock-registry.js';
import { bindPeriodOpeningBalance } from '../../implementations/ui/core_abstractions/ports/governance/period-opening-balance.js';
import { bindDefaultCurrencyLock } from '../../implementations/ui/core_abstractions/ports/governance/default-currency-lock.js';
import { bindErrorLogStore } from '../../implementations/ui/core_abstractions/ports/governance/error-log-store.js';

/// A reply carries its failure inside it; the ui contract is a thrown error, so this is where the
/// two meet. Only the calls whose callers already have a catch are raised.
function raise(reply) {
  if (reply?.error) throw new Error(reply.error);
  return reply;
}

function roleList(roles) {
  return (Array.isArray(roles) ? roles : [roles]).filter(Boolean);
}

export function composeGovernance(wasm) {
  bindRouteGuard({
    routeGuard: (route, roles) => {
      const verdict = wasm.governance_route_guard({ route: route ?? '', roles: roleList(roles) });
      return verdict.allow ? 'allow' : { redirect: verdict.redirect, reason: verdict.reason };
    },
    homeRouteForRole: (roles) => wasm.governance_home_route({ roles: roleList(roles) }).route,
    filterSidebarItems: (items, roles) =>
      wasm.governance_filter_sidebar({ items: items || [], roles: roleList(roles) }).items,
    resolveUserRoles: (record) => wasm.governance_user_roles({ record: record ?? null }).roles,
    normalizeRole: (role) => wasm.governance_normalize_role({ role: role ?? null }).role,
    // The Rust principal (session_principal, via auth_session_roles) — ONE source, not a boot
    // mirror plus a browser-memory fallback.
    currentUserRoles: () => wasm.auth_session_roles({}).roles,
    currentUserRole:  () => wasm.auth_session_roles({}).roles[0] || ROLE_READ_ONLY,
    currentUserId:    () => wasm.auth_session_roles({}).token || UNKNOWN_USER_ID,
    currentUserEmail: () => wasm.auth_session_roles({}).email || '',
  });

  bindActionGuard({
    can: (action) => wasm.governance_action_guard({ action, roles: [] }).allow,
    allowedActions: () => wasm.governance_allowed_actions({ roles: [] }).actions,
  });

  bindWorkspaceSettings({
    readSettings: async () => (await wasm.governance_load_settings({})).settings,
    loadWorkspaceSettings: async () => (await wasm.governance_load_settings({})).settings,
    saveWorkspaceSettings: async (settings) => {
      const saved = raise(await wasm.governance_save_settings({ settings }));
      // What already-mounted views read; the delta tick brings OTHER machines up to date.
      window.__vdg_workspace_settings = saved.settings;
      return saved.settings;
    },
  });

  bindPeriodClose({
    getCurrentPeriodLock: async (_repo, period) => {
      const lock = await wasm.governance_find_lock({ period_key: period ?? null });
      return lock.locked ? { locked: true, record: lock.record } : { locked: false };
    },
    loadClosedPeriods: async () => (await wasm.governance_locked_periods({})).keys,
    listCloseRecords:  async () => (await wasm.governance_close_records({})).records,
    runPreCloseChecks: async (_repo, period) =>
      raise(await wasm.governance_pre_close_checks({ period })).checks,
    closePeriod: async (_repo, period, user, checklist, ledgerRepo = null) =>
      raise(await wasm.governance_close_period({
        period, user: user ?? null, checklist: checklist ?? [], with_ledger: !!ledgerRepo,
      })),
    reopenPeriod: async (_repo, period, reason, user) =>
      raise(await wasm.governance_reopen_period({ period, reason: reason ?? null, user: user ?? null })),
  });

  bindPeriodLockRegistry({
    readLockedPeriods: async () => (await wasm.governance_locked_periods({})).locks,
    lockedPeriodKeys:  async () => (await wasm.governance_locked_periods({})).keys,
    findLock: async (_repo, periodKey) =>
      (await wasm.governance_find_lock({ period_key: periodKey ?? null })).record ?? null,
    lockPeriod: async (_repo, periodKey, user) =>
      raise(await wasm.governance_lock_period({ period_key: periodKey ?? null, user: user ?? null })).record,
    unlockPeriod: async (_repo, periodKey) =>
      raise(await wasm.governance_unlock_period({ period_key: periodKey ?? null })).unlocked,
  });

  bindPeriodOpeningBalance({
    previousPeriod: (period) => wasm.governance_period_math({ period: period ?? null }).previous,
    nextPeriod:     (period) => wasm.governance_period_math({ period: period ?? null }).next,
    periodBounds:   (period) => {
      const math = wasm.governance_period_math({ period: period ?? null });
      return math.bounds_start ? { start: math.bounds_start, end: math.bounds_end } : null;
    },
    dayBefore:      (date) => wasm.governance_period_math({ date: date ?? null }).day_before,
    periodOfDate:   (date) => wasm.governance_period_math({ date: date ?? null }).period_of_date,
    isPeriodStart:  (date) => wasm.governance_period_math({ date: date ?? null }).is_period_start,
    openingBalanceFor: (closeRecords, period, accountCode) => {
      const found = wasm.governance_opening_balance({
        close_records: closeRecords || [], period: period ?? null, account_code: accountCode ?? '',
      });
      return found.found
        ? { balance: found.balance, source_period: found.source_period, closed_at: found.closed_at, closed_by: found.closed_by }
        : null;
    },
  });

  bindDefaultCurrencyLock({
    canEditDefaultCurrency: (shipments, period, periodClosed = false) =>
      wasm.governance_can_edit_default_currency({
        shipments: shipments || [], period: period ?? null, period_closed: !!periodClosed,
      }),
    periodOf: (date) => wasm.governance_period_of({ date: date == null ? null : String(date) }).period,
  });

  bindErrorLogStore({
    listErrorRecords: async () => (await wasm.governance_error_records({})).records,
    purgeErrorMonth:  async (month) => raise(await wasm.governance_purge_error_month({ month })),
  });
}
