// fx-rate-repo.js — facade over the WASM fx store (#11 port).
export class FxRateStoreRepo {
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

  async _ensureAllMonthsLoaded() {
    const wasm = this._wasm();
    for (const { ym, content } of await this._repo().fx_months_to_ingest()) {
      wasm.fx_rate_ingest_month(ym, content);
    }
  }

  async getRate(dateStr, pair) {
    await this._ensureAllMonthsLoaded();
    try {
      return this._wasm().fx_rate_get(dateStr, pair);
    } catch (err) {
      throw new Error(`FxRateNotFound: ${err.message}`);
    }
  }

  async appendRate(entryJson, role) {
    await this._ensureAllMonthsLoaded();
    const writes = this._wasm().fx_rate_prepare_append(entryJson, role);
    await this._repo().fx_apply_writes(JSON.stringify(writes));
  }

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
export { FxRateStoreRepo as FxRateDriveRepo };
