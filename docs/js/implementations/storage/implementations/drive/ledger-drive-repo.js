// LedgerDriveRepo — facade over the WASM ledger store (#11 port). Per-account×year JSONL,
// posted-index, reconciliation/repost logs, balances and seed-ensure live in
// data_repo/ledger_store.rs behind window.__vdg_repo. What stays here: fetching the two
// bundled seed assets (chart-of-accounts/posting-rules — static app files, not Drive) and
// pushing the chart into the store once. Public method set unchanged (sync_ledger.rs
// reaches these via IoPort).

import { LedgerRepo } from '../../core_abstractions/ledger-repo.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../../../kernel/core_abstractions/util/safe-await.js';

const CHART_FILE_NAME          = 'chart-of-accounts.json';
const POSTING_RULES_FILE_NAME  = 'posting-rules.json';
const CHART_SEED_URL           = 'js/implementations/freight_app/operators/data/ledger-seed/chart-of-accounts.json';
const POSTING_RULES_SEED_URL   = 'js/implementations/freight_app/operators/data/ledger-seed/posting-rules.json';
const RECONCILIATION_LOG_FILE  = 'reconciliation-log.jsonl';
const REPOST_LOG_FILE          = 'repost-log.jsonl';

export class LedgerDriveRepo extends LedgerRepo {
  constructor() {
    super();
    this._chartCache        = null; // acc_code -> Account (also pushed into the WASM store)
    this._postingRulesCache = null;
    this._chartPushed       = false;
  }

  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.lgr_append_leg) throw new Error('WASM repo not ready');
    return repo;
  }

  /// Append one leg; idempotent on (entry_id, leg_idx), etag-CAS retry on 412.
  async appendLeg(year, acc_code, leg) {
    return await this._repo().lgr_append_leg(year, acc_code, JSON.stringify(leg));
  }

  /// F-23-03: full chart as an array (Account[]) — public form of the cached _loadChart() map.
  async chartOfAccounts() {
    const chart = await this._loadChart();
    return Object.values(chart);
  }

  /// F-23-03: posting-rules seed (pnl_lines/tax_accrual/commissions/pnl_kind_live), cached.
  async postingRules() {
    if (this._postingRulesCache) return this._postingRulesCache;
    const result = await safeAwait(fetch(POSTING_RULES_SEED_URL), SAFE_AWAIT_DEFAULT_MS, null, 'ledger:loadPostingRules');
    if (!result.ok) throw new Error(`Failed to load posting rules: ${result.error.message}`);
    this._postingRulesCache = await result.value.json();
    return this._postingRulesCache;
  }

  /// F-23-03 AC-05: has this dedup key (e.g. `shipment:<ref>:v<version>`) already been posted?
  async isAlreadyPosted(postedIndex) {
    return await this._repo().lgr_is_posted(postedIndex);
  }

  /// F-23-03 AC-05: append `{ source_id, entry_ids, posted_at }` to posted-index.jsonl.
  async recordPosted(postedIndex, entry_ids) {
    return await this._repo().lgr_record_posted(postedIndex, JSON.stringify(entry_ids));
  }

  /// F-23-06 AC-03: append one reconciliation run record to reconciliation-log.jsonl.
  async appendReconciliationRecord(record) {
    return await this._repo().lgr_append_log(RECONCILIATION_LOG_FILE, JSON.stringify(record));
  }

  /// F-23-06 AC-05/AC-06: most recent reconciliation record by run_at, or null if none yet.
  async getLastReconciliation() {
    return await this._repo().lgr_last_log(RECONCILIATION_LOG_FILE);
  }

  /// F-29-24 AC-01/AC-02: overwrite a persisted leg in place, keyed on (entry_id, leg_idx).
  /// Repost-only — never invents/appends a leg; throws when no persisted leg matches.
  async replaceLeg(year, acc_code, leg) {
    return await this._repo().lgr_replace_leg(year, acc_code, JSON.stringify(leg));
  }

  /// Drops every leg of an ORPHANED entry (source record no longer exists) and returns the count.
  /// Not a general delete — a live entry is corrected via replaceLeg or neutralised via a reversal.
  async removeEntry(year, entry_id) {
    await this._loadChart(); // store needs the chart's account codes to know which files to scan
    return await this._repo().lgr_remove_entry(year, entry_id);
  }

  /// F-29-24 AC-03: append one repost-run record to repost-log.jsonl.
  async appendRepostRecord(record) {
    return await this._repo().lgr_append_log(REPOST_LOG_FILE, JSON.stringify(record));
  }

  /// F-29-24: most recent repost-log record by run_at, or null if none yet.
  async getLastRepost() {
    return await this._repo().lgr_last_log(REPOST_LOG_FILE);
  }

  /// Legs for one account-year file, optionally filtered by inclusive date range.
  async listLegs(year, acc_code, dateFrom, dateTo) {
    return await this._repo().lgr_list_legs(year, acc_code, dateFrom || '', dateTo || '');
  }

  /// Cross-account scan for one entry_id, bounded to the current fiscal year (Phase-1).
  /// F-19-78: each returned leg carries its account_code (additive).
  async listAllLegsInEntry(entry_id) {
    await this._loadChart(); // store needs the chart's account codes
    return await this._repo().lgr_list_entry_legs(new Date().getFullYear(), entry_id);
  }

  /// Aggregate debit/credit up to asOfDate; balance sign follows Account.balance_side.
  async getBalance(acc_code, asOfDate) {
    await this._loadChart(); // store reads balance_side from the pushed chart
    return await this._repo().lgr_get_balance(acc_code, asOfDate);
  }

  /// Upload bundled chart-of-accounts/posting-rules to Drive iff missing (never overwrites).
  async ensureSeedFiles() {
    const [chartText, rulesText] = await Promise.all([
      this._fetchSeedText(CHART_SEED_URL),
      this._fetchSeedText(POSTING_RULES_SEED_URL),
    ]);
    await this._repo().lgr_ensure_seed_file(CHART_FILE_NAME, chartText);
    await this._repo().lgr_ensure_seed_file(POSTING_RULES_FILE_NAME, rulesText);
  }

  // ── private ──────────────────────────────────────────────────────────────

  async _loadChart() {
    if (this._chartCache && this._chartPushed) return this._chartCache;
    const result = await safeAwait(fetch(CHART_SEED_URL), SAFE_AWAIT_DEFAULT_MS, null, 'ledger:loadChart');
    if (!result.ok) throw new Error(`Failed to load chart of accounts: ${result.error.message}`);
    const accounts = await result.value.json();
    this._chartCache = Object.fromEntries(accounts.map((a) => [a.code, a]));
    this._repo().lgr_set_chart(JSON.stringify(accounts));
    this._chartPushed = true;
    return this._chartCache;
  }

  async _fetchSeedText(url) {
    const result = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, null, 'ledger:fetchSeed');
    if (!result.ok) throw new Error(`Failed to fetch seed file ${url}: ${result.error.message}`);
    return result.value.text();
  }
}
