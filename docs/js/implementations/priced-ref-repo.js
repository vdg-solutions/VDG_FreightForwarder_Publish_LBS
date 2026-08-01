// PricedRefRepo — Drive `_shared/{ref}` propose/merge wiring for priced-kind
// masters (local-charges, air-rates, ocean-tariff, ...). Mirrors
// FxRateDriveRepo's folder/etag pattern; routes propose/merge through the
// real wasm proposal FSM (proposal_propose/proposal_merge) — no parallel
// Drive layer, no JS reimplementation of the merge/denial logic (F-28-04(a)).

const SHARED_FOLDER = '_shared';
const STATE_FILE    = 'state.json';
const PENDING_DIR   = '_pending';
const CLOSED_DIR    = '_closed';

export class PricedRefRepo {
  constructor(driveApi, findWorkspaceRootFn, refName) {
    this._api             = driveApi;
    this._findRoot         = findWorkspaceRootFn;
    this._refName          = refName;
    this._refFolderId      = null;
    this._pendingFolderId  = null;
    this._closedFolderId   = null;
    this._stateFileInfo    = null; // { id, etag } | null (absent)
  }

  /// AC-02, AC-04: current authoritative RefStateDto {ref_name, version, records}.
  async getRefState() {
    return this._readState();
  }

  /// AC-01, AC-04: Pending proposals under `_pending/`.
  async listPending() {
    const folderId = await this._pendingFolder();
    const res = await this._listFolder(folderId);
    const out = [];
    for (const f of res) {
      const data = await this._api.getFile(f.id);
      if (data?.content) out.push(JSON.parse(data.content));
    }
    return out;
  }

  /// AC-01: real FSM builds a Pending ProposalDto; only `_pending/{id}.json`
  /// is written — `state.json` is never touched here.
  async propose(recordId, body, authorRole) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.proposal_propose) throw new Error('WASM not ready');
    const state = await this._readState();
    const input = {
      proposal_id:  crypto.randomUUID?.() || `pr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      target_ref:   this._refName,
      base_version: state.version,
      record_id:    recordId,
      diff:         body,
    };
    const dto = wasm.proposal_propose(JSON.stringify(input), authorRole);
    await this._writePending(dto);
    return dto;
  }

  /// AC-02, AC-03, AC-04: wasm FSM decides before any Drive write — a denial
  /// throws and propagates untouched (never caught here), so `state.json`
  /// stays at its current version and the proposal stays Pending.
  async merge(proposalId, actorRole) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.proposal_merge) throw new Error('WASM not ready');
    const proposalDto = await this._readPending(proposalId);
    const refStateDto = await this._readState();
    const etag = this._stateFileInfo?.etag ?? null;

    // Denial throws here — before any Drive write (AC-03).
    const result = wasm.proposal_merge(JSON.stringify(proposalDto), JSON.stringify(refStateDto), actorRole);

    await this._writeState(result.ref_state, etag);
    await this._movePendingToClosed(proposalId, result.proposal);
    return result;
  }

  /// R-3 (exercised by sub-c AC-07): maintainer declines without merging.
  async reject(proposalId, actorRole, reason) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.proposal_reject) throw new Error('WASM not ready');
    const proposalDto = await this._readPending(proposalId);
    const dto = wasm.proposal_reject(JSON.stringify(proposalDto), actorRole, reason);
    await this._movePendingToClosed(proposalId, dto);
    return dto;
  }

  /// AC-05: rate resolved effective-on-date in Rust — no JS-side date/rate
  /// selection (priced-math-single-source).
  async resolveOnDate(pricingKey, dateStr) {
    const wasm = window.__vdg_wasm;
    if (!wasm?.priced_ref_resolve_on_date) throw new Error('WASM not ready');
    const state = await this._readState();
    const records = JSON.stringify(Object.values(state.records));
    return wasm.priced_ref_resolve_on_date(records, pricingKey, dateStr);
  }

  /// F-28-14(d): one-time no-loss materialize of the master bundle into an empty ref.
  /// Idempotency authority = the shared state.json (records non-empty), never a per-device flag.
  /// Empty recordsMap OR already-populated ref => no write.
  async seedIfEmpty(recordsMap) {
    const state = await this._readState();                 // caches {id, etag}
    if (Object.keys(state.records || {}).length > 0) {
      return { migrated: false, reason: 'already-populated', version: state.version };
    }
    const ids = Object.keys(recordsMap || {});
    if (ids.length === 0) {
      return { migrated: false, reason: 'empty-bundle', version: state.version };
    }
    const dto = { ref_name: this._refName, version: ids.length, records: recordsMap };
    await this._writeState(dto, this._stateFileInfo?.etag ?? null); // reuses etag-gated upload
    return { migrated: true, count: ids.length, version: ids.length };
  }

  // ── private ──────────────────────────────────────────────────────────────

  /// Find/create `_shared/{refName}/` under workspace root.
  async _ensureRefFolder() {
    if (this._refFolderId) return this._refFolderId;
    const root = await this._findRoot();
    if (!root) throw new Error('Workspace root not found');
    const shared = await this._api.getOrCreateFolder(root, SHARED_FOLDER);
    const refDir = await this._api.getOrCreateFolder(shared.id, this._refName);
    this._refFolderId = refDir.id;
    return this._refFolderId;
  }

  async _pendingFolder() {
    if (this._pendingFolderId) return this._pendingFolderId;
    const refFolderId = await this._ensureRefFolder();
    this._pendingFolderId = (await this._api.getOrCreateFolder(refFolderId, PENDING_DIR)).id;
    return this._pendingFolderId;
  }

  async _closedFolder() {
    if (this._closedFolderId) return this._closedFolderId;
    const refFolderId = await this._ensureRefFolder();
    this._closedFolderId = (await this._api.getOrCreateFolder(refFolderId, CLOSED_DIR)).id;
    return this._closedFolderId;
  }

  /// Reads + caches `{id, etag}` for `state.json`; default empty RefStateDto
  /// when absent (fresh ref, never mutated by this read).
  async _readState() {
    const refFolderId = await this._ensureRefFolder();
    const info = await this._findFileByName(refFolderId, STATE_FILE);
    if (!info) { this._stateFileInfo = null; return this._emptyState(); }
    const data = await this._api.getFile(info.id);
    if (!data) { this._stateFileInfo = null; return this._emptyState(); }
    this._stateFileInfo = { id: info.id, etag: data.etag };
    return JSON.parse(data.content);
  }

  _emptyState() {
    return { ref_name: this._refName, version: 0, records: {} };
  }

  /// Etag-gated `uploadFile` — PATCH when a cached fileId exists, else create.
  async _writeState(dto, etag) {
    const refFolderId = await this._ensureRefFolder();
    const content = JSON.stringify(dto);
    const result = this._stateFileInfo?.id
      ? await this._api.uploadFile(this._stateFileInfo.id, STATE_FILE, content, etag, { isUpdate: true })
      : await this._api.uploadFile(refFolderId, STATE_FILE, content, null);
    this._stateFileInfo = { id: result.id, etag: result.etag };
  }

  async _writePending(dto) {
    const folderId = await this._pendingFolder();
    await this._api.uploadFile(folderId, `${dto.proposal_id}.json`, JSON.stringify(dto), null);
  }

  async _readPending(id) {
    const folderId = await this._pendingFolder();
    const info = await this._findFileByName(folderId, `${id}.json`);
    if (!info) throw new Error(`Pending proposal not found: ${id}`);
    const data = await this._api.getFile(info.id);
    if (!data) throw new Error(`Pending proposal not found: ${id}`);
    return JSON.parse(data.content);
  }

  /// Writes `_closed/{id}.json`, then deletes the `_pending/{id}.json` file.
  async _movePendingToClosed(id, dto) {
    const closedFolderId = await this._closedFolder();
    await this._api.uploadFile(closedFolderId, `${id}.json`, JSON.stringify(dto), null);
    const pendingFolderId = await this._pendingFolder();
    const info = await this._findFileByName(pendingFolderId, `${id}.json`);
    if (info?.id) await this._api.driveFetch('DELETE', `/files/${info.id}`);
  }

  async _listFolder(folderId) {
    const q = `'${folderId}' in parents and trashed=false`;
    const res = await this._api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    return res?.files ?? [];
  }

  async _findFileByName(folderId, name) {
    const q = `name='${name}' and '${folderId}' in parents and trashed=false`;
    const res = await this._api.driveFetch('GET', `/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`);
    return res?.files?.[0] ?? null;
  }
}
