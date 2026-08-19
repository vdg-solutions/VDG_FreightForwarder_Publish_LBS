// boot-fsm-view.js — paints the boot FSM's current phase into #view-loading. The boot loading
// affordance is no longer a blind "Loading view…" spinner: it names the exact phase the
// event-driven FSM is in (opening storage → loading app → building data → …). Subscribed as
// createBootFsm's onEnter. READY/ERROR own their own DOM (the real view / a retry-reconnect
// banner), so this only paints the transient phases and leaves the terminals alone.

import { BootState } from './boot-fsm.js';
import { t } from '../../implementations/kernel/core_abstractions/i18n/index.js';

const LOADING_EL_ID = 'view-loading';

const PHASE_KEY = {
  [BootState.OPENING_DB]:     'boot.opening_db',
  [BootState.LOADING_WASM]:   'boot.loading_wasm',
  [BootState.PROVISIONING]:   'boot.provisioning',
  [BootState.BUILDING_REPO]:  'boot.building_repo',
  [BootState.GATING_LICENSE]: 'boot.gating_license',
  [BootState.RENDERING]:      'boot.rendering',
};

export function renderBootPhase(state) {
  const key = PHASE_KEY[state];
  if (!key) return; // READY / ERROR — leave the DOM to the real view / banner
  const el = document.getElementById(LOADING_EL_ID);
  if (el) el.textContent = t(key);
}
