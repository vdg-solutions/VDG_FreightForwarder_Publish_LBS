/**
 * Port: entity persistence.
 * Phase-1 impl: LocalStorageEntityRepo. E-13: swap to DriveEntityRepo.
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
