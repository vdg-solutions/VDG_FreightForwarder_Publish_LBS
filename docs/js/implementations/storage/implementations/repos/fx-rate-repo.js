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

  /** direction: 'Buy'|'Sell' — Circular 200 values assets at the buying rate and liabilities
   *  at the selling rate; every caller states which side it wants. Returns the resolved rate. */
  async getRate(dateStr, pair, direction) {
    await this._ensureAllMonthsLoaded();
    try {
      return this._wasm().fx_rate_get(dateStr, pair, direction);
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

  // F-29-01: the fx-lookup rules (VND self-pair, Buy/Sell direction requirement, session cache)
  // moved to wasm — fx-lookup.js is core_abstractions (no tech), so it reaches them through this
  // adapter, same as every other wasm call in this class.
  pnlFxLookupPair(currency) {
    return this._wasm().pnl_fx_lookup_pair(currency);
  }

  pnlFxRequireDirection(direction) {
    this._wasm().pnl_fx_require_direction(direction);
  }

  pnlFxCacheGet(dateStr, pair, direction) {
    return this._wasm().pnl_fx_cache_get(dateStr, pair, direction);
  }

  pnlFxCachePut(dateStr, pair, direction, rate) {
    this._wasm().pnl_fx_cache_put(dateStr, pair, direction, rate);
  }

  pnlFxCacheClear() {
    this._wasm().pnl_fx_cache_clear();
  }
}
