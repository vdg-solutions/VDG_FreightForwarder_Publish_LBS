// LedgerDriveRepo — Drive-backed double-entry ledger: per-account x fiscal-year JSONL.
// Pattern: fx-rate-drive-repo.js (JSONL append + folder-id cache) blended with
// drive-entity-repo.js (nested folder chain, etag CAS retry -> ConcurrencyError).

import { LedgerRepo } from '../abstractions/ledger-repo.js';
import {
  parseJsonlBundle, serializeJsonlBundle,
  DriveApiError, ConcurrencyError,
} from '../auth/drive-api.js';
import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';

const LEDGER_BASE_PATH              = '_shared/ledger';
const BY_ACCOUNT_DIR                = 'by-account';
const CHART_FILE_NAME               = 'chart-of-accounts.json';
const POSTING_RULES_FILE_NAME       = 'posting-rules.json';
const POSTED_INDEX_FILE_NAME        = 'posted-index.jsonl'; // F-23-03: source+version -> entry_ids dedup log
const RECONCILIATION_LOG_FILE_NAME  = 'reconciliation-log.jsonl'; // F-23-06: weekly balance-check run log
const CHART_SEED_URL                = '/js/data/ledger-seed/chart-of-accounts.json';
const POSTING_RULES_SEED_URL        = '/js/data/ledger-seed/posting-rules.json';
const LEDGER_APPEND_MAX_ATTEMPTS    = 3;
const LEDGER_APPEND_BACKOFF_BASE_MS = 200; // 200ms, 400ms, 800ms (exponential)

export class LedgerDriveRepo extends LedgerRepo {
  constructor(driveApi, findWorkspaceRootFn) {
    super();
    this._api               = driveApi;
    this._findRoot          = findWorkspaceRootFn;
    this._yearFolderIds     = new Map(); // year -> folderId
    this._ledgerFolderId    = null;      // _shared/ledger/ (seed files live here)
    this._fileCache         = new Map(); // `${year}:${acc_code}` -> { id, etag }
    this._chartCache        = null;      // acc_code -> Account
    this._postingRulesCache = null;      // PostingRulesSeed
    this._postedIndexFile   = null;      // { id, etag } for posted-index.jsonl
    this._reconciliationLogFile = null;  // { id, etag } for reconciliation-log.jsonl
  }

  /// Append one leg; idempotent on (entry_id, leg_idx), etag-CAS retry on 412.
  async appendLeg(year, acc_code, leg) {
    return this._appendJsonlLine({
      loadBundle:      async () => this._toItemsBundle(await this._loadAccountBundle(year, acc_code)),
      findDup:         (legs) => legs.find((l) => l.entry_id === leg.entry_id && l.leg_idx === leg.leg_idx),
      invalidateCache: () => this._fileCache.delete(this._fileKey(year, acc_code)),
      cacheSet:        (result) => this._fileCache.set(this._fileKey(year, acc_code), { id: result.id, etag: result.etag }),
    }, leg);
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
    const { items } = await this._loadPostedIndexBundle();
    return items.some((entry) => entry.source_id === postedIndex);
  }

  /// F-23-03 AC-05: append `{ source_id, entry_ids, posted_at }` to posted-index.jsonl.
  async recordPosted(postedIndex, entry_ids) {
    return this._appendJsonlLine({
      loadBundle:      () => this._loadPostedIndexBundle(),
      findDup:         null,
      invalidateCache: () => { this._postedIndexFile = null; },
      cacheSet:        (result) => { this._postedIndexFile = { id: result.id, etag: result.etag }; },
    }, { source_id: postedIndex, entry_ids, posted_at: new Date().toISOString() });
  }

  /// F-23-06 AC-03: append one reconciliation run record to reconciliation-log.jsonl.
  async appendReconciliationRecord(record) {
    return this._appendJsonlLine({
      loadBundle:      () => this._loadReconciliationLogBundle(),
      findDup:         null,
      invalidateCache: () => { this._reconciliationLogFile = null; },
      cacheSet:        (result) => { this._reconciliationLogFile = { id: result.id, etag: result.etag }; },
    }, record);
  }

  /// F-23-06 AC-05/AC-06: most recent reconciliation record by run_at, or null if none yet.
  async getLastReconciliation() {
    const { items } = await this._loadReconciliationLogBundle();
    if (!items.length) return null;
    return items.reduce((latest, r) => (!latest || r.run_at > latest.run_at ? r : latest), null);
  }

  /// Legs for one account-year file, optionally filtered by inclusive date range.
  async listLegs(year, acc_code, dateFrom, dateTo) {
    const legs = await this._readAccountFile(year, acc_code);
    if (!dateFrom && !dateTo) return legs;
    return legs.filter((l) => (!dateFrom || l.date >= dateFrom) && (!dateTo || l.date <= dateTo));
  }

  /// Cross-account scan for one entry_id, bounded to the current fiscal year (Phase-1).
  async listAllLegsInEntry(entry_id) {
    const year   = new Date().getFullYear();
    const chart  = await this._loadChart();
    const result = [];
    for (const acc_code of Object.keys(chart)) {
      const legs = await this._readAccountFile(year, acc_code);
      for (const leg of legs) {
        if (leg.entry_id === entry_id) result.push(leg);
      }
    }
    return result;
  }

  /// Aggregate debit/credit up to asOfDate; balance sign follows Account.balance_side.
  async getBalance(acc_code, asOfDate) {
    const chart   = await this._loadChart();
    const account = chart[acc_code];
    if (!account) throw new Error(`Unknown account code: ${acc_code}`);

    const year = Number(asOfDate.slice(0, 4));
    const legs = await this._readAccountFile(year, acc_code);

    let debit_sum  = 0;
    let credit_sum = 0;
    for (const leg of legs) {
      if (leg.date > asOfDate) continue;
      debit_sum  += leg.debit  || 0;
      credit_sum += leg.credit || 0;
    }
    const balance = account.balance_side === 'Debit'
      ? debit_sum - credit_sum
      : credit_sum - debit_sum;
    return { debit_sum, credit_sum, balance };
  }

  /// Upload bundled chart-of-accounts/posting-rules to Drive iff missing (never overwrites).
  async ensureSeedFiles() {
    const folderId = await this._ensureLedgerFolder();
    await this._ensureSeedFile(folderId, CHART_FILE_NAME, CHART_SEED_URL);
    await this._ensureSeedFile(folderId, POSTING_RULES_FILE_NAME, POSTING_RULES_SEED_URL);
  }

  // ── private ──────────────────────────────────────────────────────────────

  /// Generic JSONL append with etag-CAS retry — shared by appendLeg + recordPosted so both
  /// stay bounded to LEDGER_APPEND_MAX_ATTEMPTS on a 412 (F-23-03 design.md).
  async _appendJsonlLine({ loadBundle, findDup, invalidateCache, cacheSet }, record, attempt = 0) {
    if (attempt >= LEDGER_APPEND_MAX_ATTEMPTS) {
      throw new ConcurrencyError('ledger', 'append', LEDGER_APPEND_MAX_ATTEMPTS);
    }

    const { items, fileId, etag, folderId, fileName } = await loadBundle();
    const dup = findDup?.(items);
    if (dup) return { etag }; // AC-02: idempotent no-op on caller-supplied dedup key

    const nextSeq = items.reduce((max, l) => Math.max(max, l.seq || 0), 0) + 1;
    items.push({ ...record, seq: nextSeq });

    try {
      const content    = serializeJsonlBundle(items);
      const uploadId   = fileId ?? folderId; // POST uses folderId as parent; PATCH uses fileId
      const uploadEtag = fileId ? etag : null;
      // D-01 fix: fileId presence (not etag) decides PATCH vs POST — a re-fetched file can
      // legitimately come back with etag:null while still being an update target.
      const result     = await this._api.uploadFile(uploadId, fileName, content, uploadEtag, { isUpdate: Boolean(fileId) });
      cacheSet(result);
      return { etag: result.etag };
    } catch (err) {
      if (err instanceof DriveApiError && err.status === 412) {
        invalidateCache(); // stale etag — reload + retry
        await this._sleep(LEDGER_APPEND_BACKOFF_BASE_MS * 2 ** attempt);
        return this._appendJsonlLine({ loadBundle, findDup, invalidateCache, cacheSet }, record, attempt + 1);
      }
      throw err;
    }
  }

  async _readAccountFile(year, acc_code) {
    const { legs } = await this._loadAccountBundle(year, acc_code);
    return legs;
  }

  async _loadAccountBundle(year, acc_code) {
    const folderId  = await this._ensureYearFolder(year);
    const fileName  = `${acc_code}.jsonl`;
    const key       = this._fileKey(year, acc_code);
    const fileEntry = this._fileCache.get(key) ?? await this._findAccountFile(folderId, fileName);
    if (!fileEntry) return { legs: [], fileId: null, etag: null, folderId, fileName };

    const data = await this._api.getFile(fileEntry.id);
    if (!data) return { legs: [], fileId: null, etag: null, folderId, fileName };

    const etag = data.etag || fileEntry.etag || null;
    this._fileCache.set(key, { id: fileEntry.id, etag });
    return { legs: parseJsonlBundle(data.content), fileId: fileEntry.id, etag, folderId, fileName };
  }

  /// Adapts _loadAccountBundle's `{ legs, ... }` shape to the generic `{ items, ... }`
  /// contract _appendJsonlLine expects.
  _toItemsBundle({ legs, fileId, etag, folderId, fileName }) {
    return { items: legs, fileId, etag, folderId, fileName };
  }

  async _loadPostedIndexBundle() {
    const folderId  = await this._ensureLedgerFolder();
    const fileName  = POSTED_INDEX_FILE_NAME;
    const fileEntry = this._postedIndexFile ?? await this._findAccountFile(folderId, fileName);
    if (!fileEntry) return { items: [], fileId: null, etag: null, folderId, fileName };

    const data = await this._api.getFile(fileEntry.id);
    if (!data) return { items: [], fileId: null, etag: null, folderId, fileName };

    const etag = data.etag || fileEntry.etag || null;
    this._postedIndexFile = { id: fileEntry.id, etag };
    return { items: parseJsonlBundle(data.content), fileId: fileEntry.id, etag, folderId, fileName };
  }

  async _loadReconciliationLogBundle() {
    const folderId  = await this._ensureLedgerFolder();
    const fileName  = RECONCILIATION_LOG_FILE_NAME;
    const fileEntry = this._reconciliationLogFile ?? await this._findAccountFile(folderId, fileName);
    if (!fileEntry) return { items: [], fileId: null, etag: null, folderId, fileName };

    const data = await this._api.getFile(fileEntry.id);
    if (!data) return { items: [], fileId: null, etag: null, folderId, fileName };

    const etag = data.etag || fileEntry.etag || null;
    this._reconciliationLogFile = { id: fileEntry.id, etag };
    return { items: parseJsonlBundle(data.content), fileId: fileEntry.id, etag, folderId, fileName };
  }

  async _findAccountFile(folderId, fileName) {
    const q     = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const res   = await this._api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    const entry = res?.files?.[0] ?? null;
    return entry ? { id: entry.id, etag: null } : null;
  }

  async _ensureYearFolder(year) {
    if (this._yearFolderIds.has(year)) return this._yearFolderIds.get(year);
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    const folderId = await this._ensureNestedFolder(root, `${LEDGER_BASE_PATH}/${BY_ACCOUNT_DIR}/${year}`);
    this._yearFolderIds.set(year, folderId);
    return folderId;
  }

  async _ensureLedgerFolder() {
    if (this._ledgerFolderId) return this._ledgerFolderId;
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    this._ledgerFolderId = await this._ensureNestedFolder(root, LEDGER_BASE_PATH);
    return this._ledgerFolderId;
  }

  async _ensureNestedFolder(rootId, path) {
    let current = rootId;
    for (const part of path.split('/')) {
      const folder = await this._api.getOrCreateFolder(current, part);
      current = folder.id;
    }
    return current;
  }

  async _ensureSeedFile(folderId, fileName, seedUrl) {
    const q   = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
    const res = await this._api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    if (res?.files?.length) return; // AC-07: present — never overwrite a hand-edited file
    const content = await this._fetchSeedText(seedUrl);
    await this._api.uploadFile(folderId, fileName, content, null);
  }

  async _loadChart() {
    if (this._chartCache) return this._chartCache;
    const result = await safeAwait(fetch(CHART_SEED_URL), SAFE_AWAIT_DEFAULT_MS, null, 'ledger:loadChart');
    if (!result.ok) throw new Error(`Failed to load chart of accounts: ${result.error.message}`);
    const accounts = await result.value.json();
    this._chartCache = Object.fromEntries(accounts.map((a) => [a.code, a]));
    return this._chartCache;
  }

  async _fetchSeedText(url) {
    const result = await safeAwait(fetch(url), SAFE_AWAIT_DEFAULT_MS, null, 'ledger:fetchSeed');
    if (!result.ok) throw new Error(`Failed to fetch seed file ${url}: ${result.error.message}`);
    return result.value.text();
  }

  _fileKey(year, acc_code) { return `${year}:${acc_code}`; }

  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}
