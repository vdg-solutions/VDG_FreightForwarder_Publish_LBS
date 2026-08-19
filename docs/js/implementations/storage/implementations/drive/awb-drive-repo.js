// AwbDriveRepo — facade over the WASM awb store (#11 port). Storage orchestration
// (month files, append, delete-by-awb_no, CAS) lives in data_repo/awb_store.rs behind
// window.__vdg_repo.

export class AwbDriveRepo {
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
