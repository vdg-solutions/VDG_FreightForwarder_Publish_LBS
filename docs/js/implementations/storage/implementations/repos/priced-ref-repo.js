// priced-ref-repo.js — facade over the WASM priced-ref store (#11 port).
import { toPricedEnvelope } from '../../core_abstractions/priced-envelope.js';

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

  async getRefState() {
    return await this._repo().pref_get_state(this._refName);
  }

  async listPending() {
    return await this._repo().pref_list_pending(this._refName);
  }

  async propose(recordId, body, authorRole, authorUser) {
    const state = await this.getRefState();
    const input = {
      proposal_id:  crypto.randomUUID?.() || `pr-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      target_ref:   this._refName,
      author_user:  authorUser,
      base_version: state.version,
      record_id:    recordId,
      diff:         body,
    };
    const dto = this._wasm().proposal_propose(JSON.stringify(input), authorRole);
    await this._repo().pref_write_pending(this._refName, JSON.stringify(dto));
    return dto;
  }

  async merge(proposalId, actorRole, actorUser) {
    const proposalDto = await this._repo().pref_read_pending(this._refName, proposalId);
    const refStateDto = await this.getRefState();
    this.assertNoOverlap(proposalDto.record_id, proposalDto.diff, refStateDto);
    const result = this._wasm().proposal_merge(JSON.stringify(proposalDto), JSON.stringify(refStateDto), actorRole, actorUser);
    await this._repo().pref_write_state(this._refName, JSON.stringify(result.ref_state));
    await this._repo().pref_move_closed(this._refName, proposalId, JSON.stringify(result.proposal));
    return result;
  }

  async reject(proposalId, actorRole, actorUser, reason) {
    const wasm = this._wasm();
    if (!wasm.proposal_reject) throw new Error('WASM not ready');
    const proposalDto = await this._repo().pref_read_pending(this._refName, proposalId);
    const dto = wasm.proposal_reject(JSON.stringify(proposalDto), actorRole, actorUser, reason);
    await this._repo().pref_move_closed(this._refName, proposalId, JSON.stringify(dto));
    return dto;
  }

  assertNoOverlap(recordId, row, refState) {
    const wasm = this._wasm();
    if (!wasm.priced_ref_check_overlap) throw new Error('WASM not ready');
    const existing = Object.values(refState?.records || {});
    wasm.priced_ref_check_overlap(JSON.stringify(existing), JSON.stringify(toPricedEnvelope(recordId, row)));
  }

  async assertNoOverlapAgainstRef(recordId, row) {
    this.assertNoOverlap(recordId, row, await this.getRefState());
  }

  async resolveOnDate(pricingKey, dateStr) {
    const wasm = this._wasm();
    if (!wasm.priced_ref_resolve_on_date) throw new Error('WASM not ready');
    const state = await this.getRefState();
    const records = JSON.stringify(Object.values(state.records));
    return wasm.priced_ref_resolve_on_date(records, pricingKey, dateStr);
  }

  async seedIfEmpty(recordsMap) {
    return await this._repo().pref_seed_if_empty(this._refName, JSON.stringify(recordsMap || {}));
  }
}
