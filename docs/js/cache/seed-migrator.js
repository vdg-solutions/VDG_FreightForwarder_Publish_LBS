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

const MIGRATION_KIND = '_seed_migrations';

/**
 * @param {object} repo  CachedEntityRepo (get/put/list)
 * @param {Array<{id:string, kind:string, url:string, key:(row:object)=>string}>} migrations
 * @returns {Promise<{applied:string[], skipped:string[]}>}
 */
export async function runSeedMigrations(repo, migrations) {
  const done = new Set(
    (await repo.list(MIGRATION_KIND, null).catch(() => [])).map((m) => m.id),
  );
  const applied = [];
  const skipped = [];

  for (const mig of migrations) {
    if (done.has(mig.id)) { skipped.push(mig.id); continue; }
    try {
      const res = await fetch(mig.url);
      if (!res.ok) { skipped.push(mig.id); continue; }
      const lines = (await res.text()).trim().split('\n').filter(Boolean);
      let rows = 0;
      for (const line of lines) {
        const row = JSON.parse(line);
        const id  = mig.key(row);
        const existing = await repo.get(mig.kind, id).catch(() => null);
        if (existing && existing._seed_locked) continue; // user-edited → tôn trọng
        await repo.put(mig.kind, id, { ...row, _seed: mig.id });
        rows++;
      }
      await repo.put(MIGRATION_KIND, mig.id, {
        id: mig.id, kind: mig.kind, rows, applied_at: new Date().toISOString(),
      });
      applied.push(mig.id);
    } catch {
      // seed optional — bỏ qua, thử lại lần boot sau (chưa ghi vào _seed_migrations)
      skipped.push(mig.id);
    }
  }
  return { applied, skipped };
}
