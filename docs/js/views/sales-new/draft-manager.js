// draft-manager.js — IDB + localStorage draft persistence for sales-new form

import { openVdgDb, idbGet, idbPut, idbDelete, STORE_META } from '../../cache/idb-cache.js';

const DRAFT_IDB_KEY = 'draft.sales-new';
const DRAFT_LS_KEY  = 'vdg.draft.sales-new-v2';

async function getDb() {
  try { return await openVdgDb(); }
  catch { return null; }
}

// → FormState | null
export async function loadDraft() {
  try {
    const db = await getDb();
    if (db) {
      const rec = await idbGet(db, STORE_META, DRAFT_IDB_KEY);
      if (rec?.state) return rec.state;
    }
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(DRAFT_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// idbPut + localStorage fallback
export async function saveDraft(state) {
  try {
    const db = await getDb();
    if (db) {
      await idbPut(db, STORE_META, { key: DRAFT_IDB_KEY, state, last_modified: Date.now() });
      return;
    }
  } catch { /* fall through */ }
  try { localStorage.setItem(DRAFT_LS_KEY, JSON.stringify(state)); }
  catch { /* quota — non-critical */ }
}

// idbDelete + localStorage remove
export async function clearDraft() {
  try {
    const db = await getDb();
    if (db) await idbDelete(db, STORE_META, DRAFT_IDB_KEY);
  } catch { /* non-critical */ }
  try { localStorage.removeItem(DRAFT_LS_KEY); }
  catch { /* ignore */ }
}
