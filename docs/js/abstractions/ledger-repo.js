/**
 * Port: ledger persistence (Drive-backed double-entry journal).
 * Phase-1 impl: LedgerDriveRepo.
 */
export class LedgerRepo {
  /** @returns {Promise<{etag: string}>} */
  async appendLeg(year, acc_code, leg) { throw new Error('abstract'); }

  /** @returns {Promise<object[]>} */
  async listLegs(year, acc_code, dateFrom, dateTo) { throw new Error('abstract'); }

  /** @returns {Promise<object[]>} */
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
}
