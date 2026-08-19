// draft-manager.js — SQLite + localStorage draft persistence for sales-new form

const DRAFT_META_KEY = 'draft.sales-new';
const DRAFT_LS_KEY   = 'vdg.draft.sales-new-v2';

const getStore = () => window.__vdg_store || null;

// → FormState | null
export async function loadDraft() {
  try {
    const store = getStore();
    if (store) {
      const rec = await store.cache_get_meta(DRAFT_META_KEY);
      if (rec?.state) return rec.state;
    }
  } catch { /* fall through */ }
  try {
    const raw = localStorage.getItem(DRAFT_LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// store meta + localStorage fallback
export async function saveDraft(state) {
  try {
    const store = getStore();
    if (store) {
      await store.cache_put_meta(DRAFT_META_KEY, { state, last_modified: Date.now() });
      return;
    }
  } catch { /* fall through */ }
  try { localStorage.setItem(DRAFT_LS_KEY, JSON.stringify(state)); }
  catch { /* quota — non-critical */ }
}

// store meta delete + localStorage remove
export async function clearDraft() {
  try {
    const store = getStore();
    if (store) await store.cache_delete_meta(DRAFT_META_KEY);
  } catch { /* non-critical */ }
  try { localStorage.removeItem(DRAFT_LS_KEY); }
  catch { /* ignore */ }
}
