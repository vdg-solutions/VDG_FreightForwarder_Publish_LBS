/**
 * Port: entity persistence. The live path today is WasmEntityRepo (repo-init-steps.js), which
 * talks to CharterDB through the server — this abstract shape predates that and has no adapter
 * bound to it any more.
 */
export class EntityRepo {
  /** @returns {Promise<object[]>} */
  async list(kind, filter) { throw new Error('abstract'); }

  /** @returns {Promise<object|null>} */
  async get(kind, id) { throw new Error('abstract'); }

  /** @returns {Promise<void>} */
  async put(kind, id, body) { throw new Error('abstract'); }

  /** @returns {Promise<void>} */
  async delete(kind, id) { throw new Error('abstract'); }
}
