// PricedRefRepo — facade over the WASM priced-ref store (#11 port). Storage (state.json
// etag-CAS, _pending/_closed files) lives in data_repo/priced_ref_store.rs behind
// window.__vdg_repo; the proposal FSM (propose/merge/reject) and rate resolution stay in
// the wasm island behind window.__vdg_wasm (F-28-04(a): no JS reimplementation of the
// merge/denial logic). This class only sequences FSM calls against store reads/writes.

export class PricedRefRepo {
  constructor(refName) {
    this._refName = refName;
  }

  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.pref_get_state) throw new Error('WASM repo not ready');
    return repo;
  }

  _wasm() {
    const wasm = window.__vdg_wasm;
    if (!wasm?.proposal_propose) throw new Error('WASM not ready');
    return wasm;
  }

  /// AC-02, AC-04: current authoritative RefStateDto {ref_name, version, records}.
  async getRefState() {
    return await this._repo().pref_get_state(this._refName);
  }

  /// AC-01, AC-04: Pending proposals under `_pending/`.
  async listPending() {
    return await this._repo().pref_list_pending(this._refName);
  }

  /// AC-01: real FSM builds a Pending ProposalDto; only `_pending/{id}.json`
  /// is written — `state.json` is never touched here.
  async propose(recordId, body, authorRole) {
    const state = await this.getRefState();
    const input = {
      proposal_id:  crypto.randomUUID?.() || `pr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      target_ref:   this._refName,
      base_version: state.version,
      record_id:    recordId,
      diff:         body,
    };
    const dto = this._wasm().proposal_propose(JSON.stringify(input), authorRole);
    await this._repo().pref_write_pending(this._refName, JSON.stringify(dto));
    return dto;
  }

  /// AC-02, AC-03, AC-04: wasm FSM decides before any Drive write — a denial
  /// throws and propagates untouched (never caught here), so `state.json`
  /// stays at its current version and the proposal stays Pending.
  async merge(proposalId, actorRole) {
    const proposalDto = await this._repo().pref_read_pending(this._refName, proposalId);
    const refStateDto = await this.getRefState(); // caches the CAS etag store-side

    // Denial throws here — before any Drive write (AC-03).
    const result = this._wasm().proposal_merge(JSON.stringify(proposalDto), JSON.stringify(refStateDto), actorRole);

    await this._repo().pref_write_state(this._refName, JSON.stringify(result.ref_state));
    await this._repo().pref_move_closed(this._refName, proposalId, JSON.stringify(result.proposal));
    return result;
  }

  /// R-3 (exercised by sub-c AC-07): maintainer declines without merging.
  async reject(proposalId, actorRole, reason) {
    const wasm = this._wasm();
    if (!wasm.proposal_reject) throw new Error('WASM not ready');
    const proposalDto = await this._repo().pref_read_pending(this._refName, proposalId);
    const dto = wasm.proposal_reject(JSON.stringify(proposalDto), actorRole, reason);
    await this._repo().pref_move_closed(this._refName, proposalId, JSON.stringify(dto));
    return dto;
  }

  /// AC-05: rate resolved effective-on-date in Rust — no JS-side date/rate
  /// selection (priced-math-single-source).
  async resolveOnDate(pricingKey, dateStr) {
    const wasm = this._wasm();
    if (!wasm.priced_ref_resolve_on_date) throw new Error('WASM not ready');
    const state = await this.getRefState();
    const records = JSON.stringify(Object.values(state.records));
    return wasm.priced_ref_resolve_on_date(records, pricingKey, dateStr);
  }

  /// F-28-14(d): one-time no-loss materialize of the master bundle into an empty ref.
  /// Idempotency authority = the shared state.json (records non-empty), never a per-device flag.
  async seedIfEmpty(recordsMap) {
    return await this._repo().pref_seed_if_empty(this._refName, JSON.stringify(recordsMap || {}));
  }
}
