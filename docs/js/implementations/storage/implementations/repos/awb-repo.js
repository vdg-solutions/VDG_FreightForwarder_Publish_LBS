// awb-repo.js — facade over the WASM awb store (#11 port).
export class AwbStoreRepo {
  _repo() {
    const repo = window.__vdg_repo;
    if (!repo?.awb_list_by_month) throw new Error('WASM repo not ready');
    return repo;
  }

  async listByMonth(ym) {
    return await this._repo().awb_list_by_month(ym);
  }

  async append(awb) {
    await this._repo().awb_append(JSON.stringify(awb));
  }

  async deleteByAwbNo(awbNo, ym) {
    await this._repo().awb_delete(awbNo, ym);
  }
}
