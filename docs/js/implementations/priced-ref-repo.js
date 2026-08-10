// PricedRefRepo — facade over the WASM priced-ref store (#11 port). Storage (state.json
// etag-CAS, _pending/_closed files) lives in data_repo/priced_ref_store.rs behind
// window.__vdg_repo; the proposal FSM (propose/merge/reject) and rate resolution stay in
// the wasm island behind window.__vdg_wasm (F-28-04(a): no JS reimplementation of the
// merge/denial logic). This class only sequences FSM calls against store reads/writes.

import { toPricedEnvelope } from '../cache/priced-ref-migrator.js';

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
  async propose(recordId, body, authorRole, authorUser) {
    const state = await this.getRefState();
    const input = {
      proposal_id:  crypto.randomUUID?.() || `pr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      target_ref:   this._refName,
      author_user:  authorUser, // the ROLE goes in as authorRole; this is the PERSON
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
  async merge(proposalId, actorRole, actorUser) {
    const proposalDto = await this._repo().pref_read_pending(this._refName, proposalId);
    const refStateDto = await this.getRefState(); // caches the CAS etag store-side

    // Same guard the direct save runs — an approved proposal lands the same row in the same
    // ref, so guarding only the direct path would guard neither (AC-03 overlap).
    this.assertNoOverlap(proposalDto.record_id, proposalDto.diff, refStateDto);

    // Denial throws here — before any Drive write (AC-03).
    const result = this._wasm().proposal_merge(JSON.stringify(proposalDto), JSON.stringify(refStateDto), actorRole, actorUser);

    await this._repo().pref_write_state(this._refName, JSON.stringify(result.ref_state));
    await this._repo().pref_move_closed(this._refName, proposalId, JSON.stringify(result.proposal));
    return result;
  }

  /// R-3 (exercised by sub-c AC-07): maintainer declines without merging.
  async reject(proposalId, actorRole, actorUser, reason) {
    const wasm = this._wasm();
    if (!wasm.proposal_reject) throw new Error('WASM not ready');
    const proposalDto = await this._repo().pref_read_pending(this._refName, proposalId);
    const dto = wasm.proposal_reject(JSON.stringify(proposalDto), actorRole, actorUser, reason);
    await this._repo().pref_move_closed(this._refName, proposalId, JSON.stringify(dto));
    return dto;
  }

  /// Two windows for one `pricing_key` must not overlap, or "the rate on date D" has more
  /// than one answer and `resolveOnDate` returns whichever it met first. The decision is
  /// Rust's (`priced_ref_check_overlap`); this only shapes the rows and throws what it says.
  /// `refState` is optional so a caller that already read it does not read it twice.
  assertNoOverlap(recordId, row, refState) {
    const wasm = this._wasm();
    if (!wasm.priced_ref_check_overlap) throw new Error('WASM not ready');
    const existing = Object.values(refState?.records || {});
    wasm.priced_ref_check_overlap(JSON.stringify(existing), JSON.stringify(toPricedEnvelope(recordId, row)));
  }

  /// The direct-save half of the same guard, for a maintainer writing straight to the
  /// master table (no proposal). Reads the ref state itself; a ref not materialized yet
  /// has no records and therefore nothing to collide with.
  async assertNoOverlapAgainstRef(recordId, row) {
    this.assertNoOverlap(recordId, row, await this.getRefState());
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
