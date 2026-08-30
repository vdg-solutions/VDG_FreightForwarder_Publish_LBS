import {
  LedgerRepo
} from "./chunk-IBTSRPFB.js";
import {
  SAFE_AWAIT_DEFAULT_MS,
  safeAwait
} from "./chunk-JAZY43GR.js";

// output/web/js.tmp/implementations/storage/implementations/repos/ledger-repo.js
var CHART_FILE_NAME = "chart-of-accounts.json";
var POSTING_RULES_FILE_NAME = "posting-rules.json";
var CHART_SEED_URL = "js/implementations/storage/implementations/repos/ledger-seed/chart-of-accounts.json";
var POSTING_RULES_SEED_URL = "js/implementations/storage/implementations/repos/ledger-seed/posting-rules.json";
var RECONCILIATION_LOG_FILE = "reconciliation-log.jsonl";
var REPOST_LOG_FILE = "repost-log.jsonl";
var LedgerStoreRepo = class extends LedgerRepo {
  constructor() {
    super();
    this._chartCache = null;
    this._postingRulesCache = null;
    this._chartPushed = false;
  }
  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.lgr_append_leg) throw new Error("WASM repo not ready");
    return repo;
  }
  async appendLeg(year, acc_code, leg) {
    return await this._repo().lgr_append_leg(year, acc_code, JSON.stringify(leg));
  }
  async chartOfAccounts() {
    const chart = await this._loadChart();
    return Object.values(chart);
  }
  async postingRules() {
    if (this._postingRulesCache) return this._postingRulesCache;
    const result = await safeAwait(fetch(POSTING_RULES_SEED_URL), SAFE_AWAIT_DEFAULT_MS, null, "ledger:loadPostingRules");
    if (!result.ok) throw new Error(`Failed to load posting rules: ${result.error.message}`);
    this._postingRulesCache = await result.value.json();
    return this._postingRulesCache;
  }
  async isAlreadyPosted(postedIndex) {
    return await this._repo().lgr_is_posted(postedIndex);
  }
  async recordPosted(postedIndex, entry_ids) {
    return await this._repo().lgr_record_posted(postedIndex, JSON.stringify(entry_ids));
  }
  /** F1: the posted-index row (with entry_ids) for a dedup key, or null. */
  async findPosted(postedIndex) {
    return await this._repo().lgr_find_posted(postedIndex);
  }
  /** F1: drop a posted-index row — only after its entries were reversed. */
  async releasePosted(postedIndex) {
    return await this._repo().lgr_release_posted(postedIndex);
  }
  async appendReconciliationRecord(record) {
    return await this._repo().lgr_append_log(RECONCILIATION_LOG_FILE, JSON.stringify(record));
  }
  async getLastReconciliation() {
    return await this._repo().lgr_last_log(RECONCILIATION_LOG_FILE);
  }
  async replaceLeg(year, acc_code, leg) {
    return await this._repo().lgr_replace_leg(year, acc_code, JSON.stringify(leg));
  }
  async removeEntry(year, entry_id) {
    await this._loadChart();
    return await this._repo().lgr_remove_entry(year, entry_id);
  }
  async appendRepostRecord(record) {
    return await this._repo().lgr_append_log(REPOST_LOG_FILE, JSON.stringify(record));
  }
  async getLastRepost() {
    return await this._repo().lgr_last_log(REPOST_LOG_FILE);
  }
  async listLegs(year, acc_code, dateFrom, dateTo) {
    return await this._repo().lgr_list_legs(year, acc_code, dateFrom || "", dateTo || "");
  }
  async listAccountCodes(year) {
    return await this._repo().lgr_list_account_codes(year);
  }
  async listAllLegsInEntry(entry_id) {
    await this._loadChart();
    return await this._repo().lgr_list_entry_legs((/* @__PURE__ */ new Date()).getFullYear(), entry_id);
  }
  async getBalance(acc_code, asOfDate) {
    await this._loadChart();
    return await this._repo().lgr_get_balance(acc_code, asOfDate);
  }
  async ensureSeedFiles() {
    const [chartText, rulesText] = await Promise.all([
      this._fetchSeedText(CHART_SEED_URL),
      this._fetchSeedText(POSTING_RULES_SEED_URL)
    ]);
    await this._repo().lgr_ensure_seed_file(CHART_FILE_NAME, chartText);
    await this._repo().lgr_ensure_seed_file(POSTING_RULES_FILE_NAME, rulesText);
  }
  async _loadChart() {
    if (this._chartCache && this._chartPushed) return this._chartCache;
    const result = await safeAwait(fetch(CHART_SEED_URL), SAFE_AWAIT_DEFAULT_MS, null, "ledger:loadChart");
    if (!result.ok) throw new Error(`Failed to load chart of accounts: ${result.error.message}`);
    const accounts = await result.value.json();
    this._chartCache = Object.fromEntries(accounts.map((a) => [a.code, a]));
    this._repo().lgr_set_chart(JSON.stringify(accounts));
    this._chartPushed = true;
    return this._chartCache;
  }
  async _fetchSeedText(url) {
    const result = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, null, "ledger:fetchSeed");
    if (!result.ok) throw new Error(`Failed to fetch seed file ${url}: ${result.error.message}`);
    return result.value.text();
  }
};
export {
  LedgerStoreRepo
};
