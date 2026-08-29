/**
 * Port: ledger persistence (Drive-backed double-entry journal).
 * Phase-1 impl: LedgerDriveRepo.
 */
export class LedgerRepo {
  /** @returns {Promise<{etag: string}>} */
  async appendLeg(year, acc_code, leg) { throw new Error('abstract'); }

  /** @returns {Promise<object[]>} */
  async listLegs(year, acc_code, dateFrom, dateTo) { throw new Error('abstract'); }

  /** F-19-78: each returned leg carries its account_code (additive). @returns {Promise<object[]>} */
  async listAllLegsInEntry(entry_id) { throw new Error('abstract'); }

  /** @returns {Promise<{debit_sum: number, credit_sum: number, balance: number}>} */
  async getBalance(acc_code, asOfDate) { throw new Error('abstract'); }

  /** @returns {Promise<void>} */
  async ensureSeedFiles() { throw new Error('abstract'); }

  /** @returns {Promise<object[]>} chart of accounts, Account[] */
  async chartOfAccounts() { throw new Error('abstract'); }

  /** @returns {Promise<object>} PostingRulesSeed (pnl_lines/tax_accrual/commissions/pnl_kind_live) */
  async postingRules() { throw new Error('abstract'); }

  /** @returns {Promise<boolean>} F-23-03: has this dedup key already been posted? */
  async isAlreadyPosted(postedIndex) { throw new Error('abstract'); }

  /** @returns {Promise<void>} F-23-03: record entry_ids written for this dedup key */
  async recordPosted(postedIndex, entry_ids) { throw new Error('abstract'); }

  /** @returns {Promise<object|null>} F1: the posted-index row for this dedup key, or null */
  async findPosted(postedIndex) { throw new Error('abstract'); }

  /** @returns {Promise<void>} F1: drop a posted-index row (only after reversing its entries) */
  async releasePosted(postedIndex) { throw new Error('abstract'); }

  /** F-29-24: overwrite a persisted leg in place, keyed on (entry_id, leg_idx). Repost-only —
   *  never invents a leg: throws if no persisted leg matches (entry_id, leg_idx). Same (year,
   *  acc_code, leg) shape as appendLeg for symmetry; single-leg granularity (not a whole-file
   *  rewrite) keeps the write's blast radius identical to a normal post.
   *  @returns {Promise<{etag: string}>} */
  async replaceLeg(year, acc_code, leg) { throw new Error('abstract'); }

  /** F-29-24: append one repost-run record to repost-log.jsonl (reconciliation-log.jsonl
   *  precedent, AC-03). Always appends — no dedup, one row per run including zero-op runs.
   *  @returns {Promise<{etag: string}>} */
  async appendRepostRecord(record) { throw new Error('abstract'); }

  /** F-29-24: most recent repost-log record by run_at, or null if none yet (manager review /
   *  panel status line, mirrors getLastReconciliation()).
   *  @returns {Promise<object|null>} */
  async getLastRepost() { throw new Error('abstract'); }
}

let _repo = null;

/// The live LedgerRepo, bound once by the boot (repo-init-steps) for the io ports' ledger_* calls.
export function bindLedgerRepo(repo) { _repo = repo; }

export function ledgerRepo() {
  if (!_repo) throw new Error('Ledger Repo not initialized');
  return _repo;
}

/// Test seam.
export function _resetLedgerRepo() { _repo = null; }
