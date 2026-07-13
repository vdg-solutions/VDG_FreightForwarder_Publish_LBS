// seed-migrator.js — versioned, idempotent master-data seeding (như DB migration).
//
// Vấn đề của seedIfEmpty cũ: chỉ chạy khi store rỗng → thêm hãng/đơn vị ở bản sau
// không bao giờ được nạp; re-seed đè lên sửa tay của user; không truy vết version.
//
// Cơ chế:
//   - Mỗi migration: { id, kind, url, key }  — `id` là dấu version duy nhất (vd
//     '2026-07-09-local-charges-v1'). Thêm dữ liệu = thêm migration id MỚI.
//   - Danh sách id đã áp dụng lưu ở store '_seed_migrations'.
//   - Chạy: bỏ qua id đã áp dụng; với id mới, fetch url, upsert từng dòng theo
//     key(row), gắn cờ `_seed = id`. Chạy lại = no-op. Thêm migration mới = chỉ nó chạy.
//   - KHÔNG đè user edit: dòng nào có `_seed_locked` (user đã sửa) thì giữ nguyên.

import { safeAwait, SAFE_AWAIT_DEFAULT_MS } from '../util/safe-await.js';

const MIGRATION_KIND = '_seed_migrations';

/**
 * @param {object} repo  CachedEntityRepo (get/put/list)
 * @param {Array<{id:string, kind:string, url:string, key:(row:object)=>string}>} migrations
 * @param {number} _ms   injectable timeout (unit-test seam, mirrors util/view-loader.js::loadView)
 * @returns {Promise<{applied:string[], skipped:string[]}>}
 */
export async function runSeedMigrations(repo, migrations, _ms = SAFE_AWAIT_DEFAULT_MS) {
  // F-20-01: repo.list/get/put on a freshly provisioned workspace can hang (Drive
  // folder not yet ready) — bound every repo call so this always settles.
  const listRes = await safeAwait(repo.list(MIGRATION_KIND, null), _ms, null, 'seed-migrator:list');
  const done = new Set((listRes.ok ? listRes.value : []).map((m) => m.id));
  const applied = [];
  const skipped = [];

  for (const mig of migrations) {
    if (done.has(mig.id)) { skipped.push(mig.id); continue; }
    try {
      const res = await fetch(mig.url);
      if (!res.ok) { skipped.push(mig.id); continue; }
      const lines = (await res.text()).trim().split('\n').filter(Boolean);
      let rows = 0;
      let rowStalled = false;
      for (const line of lines) {
        const row = JSON.parse(line);
        const id  = mig.key(row);
        const getRes   = await safeAwait(repo.get(mig.kind, id), _ms, null, 'seed-migrator:get');
        const existing = getRes.ok ? getRes.value : null;
        if (existing && existing._seed_locked) continue; // user-edited → tôn trọng
        const putRes = await safeAwait(repo.put(mig.kind, id, { ...row, _seed: mig.id }), _ms, null, 'seed-migrator:put');
        if (!putRes.ok) { rowStalled = true; continue; } // stalled write — retry next boot
        rows++;
      }
      if (rowStalled) { skipped.push(mig.id); continue; }
      const markRes = await safeAwait(
        repo.put(MIGRATION_KIND, mig.id, { id: mig.id, kind: mig.kind, rows, applied_at: new Date().toISOString() }),
        _ms, null, 'seed-migrator:mark',
      );
      if (!markRes.ok) { skipped.push(mig.id); continue; } // stalled write — retry next boot
      applied.push(mig.id);
    } catch {
      // seed optional — bỏ qua, thử lại lần boot sau (chưa ghi vào _seed_migrations)
      skipped.push(mig.id);
    }
  }
  return { applied, skipped };
}
