// Onboarding orchestrator — wizard state + WASM calls (graceful skip)

import { idbGet, idbPut, STORE_META } from '../../cache/idb-cache.js';

const DEFAULT_COMMISSION_PCT = 10;
const ONBOARDING_TOTAL_STEPS = 6;
const PREFS_META_KEY         = 'preferences';

export class OnboardingOrchestrator {
  constructor(db) {
    this._db = db;
  }

  async _prefs() {
    if (!this._db) return null;
    return idbGet(this._db, STORE_META, PREFS_META_KEY);
  }

  async _savePrefs(patch) {
    if (!this._db) return;
    const prefs = (await this._prefs()) || { key: PREFS_META_KEY };
    await idbPut(this._db, STORE_META, { ...prefs, ...patch });
  }

  async isComplete() {
    const prefs = await this._prefs();
    return prefs?.onboarding_complete === true;
  }

  async getStep() {
    const prefs = await this._prefs();
    return prefs?.onboarding_step ?? 1;
  }

  async saveStep(n) {
    await this._savePrefs({ onboarding_step: n });
  }

  async markComplete() {
    await this._savePrefs({ onboarding_complete: true, onboarding_step: ONBOARDING_TOTAL_STEPS });
  }

  // OQ-B4-7: graceful skip if E-13 not deployed
  async provisionWorkspace(userId) {
    if (!window.__vdg_wasm?.provision_workspace) {
      console.warn('[onboarding] provision_workspace not available — skipping'); // DEV
      return { ok: true, skipped: true };
    }
    try {
      await window.__vdg_wasm.provision_workspace(userId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async addSalesRep(name, email) {
    if (!window.__vdg_wasm?.provision_sales_rep) {
      console.warn('[onboarding] provision_sales_rep not available — skipping'); // DEV
      return { ok: true, skipped: true };
    }
    try {
      await window.__vdg_wasm.provision_sales_rep(name, email);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async saveSettings({ currency, commissionPct, fiscalMonth }) {
    await this._savePrefs({ currency, commissionPct, fiscalMonth });
  }
}

export { DEFAULT_COMMISSION_PCT, ONBOARDING_TOTAL_STEPS };
