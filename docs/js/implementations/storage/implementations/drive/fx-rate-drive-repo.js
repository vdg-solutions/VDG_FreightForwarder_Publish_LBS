// FxRateDriveRepo — facade over the WASM fx store (#11 port). All storage orchestration
// (month cache, listing, append, delete, CAS) lives in data_repo/fx_store.rs behind
// window.__vdg_repo; domain math (resolve/overlap/write-gate) in the fx island behind
// window.__vdg_wasm. This class only pumps between the two — no caches, no Drive calls.

export class FxRateDriveRepo {
  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.fx_months_to_ingest) throw new Error('WASM repo not ready');
    return repo;
  }

  _wasm() {
    const wasm = window.__vdg_wasm;
    if (!wasm?.fx_rate_get) throw new Error('WASM not ready');
    return wasm;
  }

  /// Pump every not-yet-loaded month from the store island into the fx domain island.
  async _ensureAllMonthsLoaded() {
    const wasm = this._wasm();
    for (const { ym, content } of await this._repo().fx_months_to_ingest()) {
      wasm.fx_rate_ingest_month(ym, content);
    }
  }

  /// Load full history for the pair, push to WASM, call fx_rate_get.
  async getRate(dateStr, pair) {
    await this._ensureAllMonthsLoaded();
    try {
      return this._wasm().fx_rate_get(dateStr, pair);
    } catch (err) {
      throw new Error(`FxRateNotFound: ${err.message}`);
    }
  }

  /// Validate + write-gate + queue via WASM, then apply pending writes in the store island.
  async appendRate(entryJson, role) {
    await this._ensureAllMonthsLoaded();
    const writes = this._wasm().fx_rate_prepare_append(entryJson, role);
    await this._repo().fx_apply_writes(JSON.stringify(writes));
  }

  /// Invalidate the WASM-side month cache (e.g. after external write).
  invalidateMonth(ym) {
    this._repo().fx_invalidate_month(ym);
  }

  async listByMonth(ym) {
    return await this._repo().fx_list_by_month(ym);
  }

  async listAll() {
    return await this._repo().fx_list_all();
  }

  async deleteEntry(validFrom, validTo, pair) {
    await this._repo().fx_delete_entry(validFrom, validTo, pair);
  }
}
