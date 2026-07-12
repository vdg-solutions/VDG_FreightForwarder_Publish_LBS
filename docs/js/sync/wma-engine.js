// wma-engine.js — WMA per-sales-rep kind prediction + reinforcement math (F-15-63)

const ALPHA              = 0.15;  // saturating learning rate
const DECAY_BASE         = 0.98;  // per-day decay factor (β)
const PENALTY_MULTIPLIER = 0.85;  // wrong-predict weight shrink
const THRESHOLD_RATIO    = 1.8;   // top / 2nd weight required
const MIN_OBSERVATIONS   = 5;     // cold-start guard
const BADGE_DISMISS_MULT = 0.7;   // explicit-dismiss penalty (sharper than commit-time 0.85)
const DECAY_MIN_DAYS     = 1;     // skip decay if < 1 day since last update

/** Fresh state for a (rep_id, row_idx) pair not yet seen */
export function defaultWmaState() {
  return {
    kind_weights:       {},
    total_observations: 0,
    last_decay_ts:      new Date().toISOString(),
  };
}

/**
 * apply_decay_if_needed — multiply all weights by 0.98^days; mutates state in place.
 * No-op if last update was < 1 day ago.
 */
export function applyDecayIfNeeded(state) {
  const days = (Date.now() - new Date(state.last_decay_ts).getTime()) / 86_400_000;
  if (days < DECAY_MIN_DAYS) return;
  const factor = Math.pow(DECAY_BASE, days);
  for (const k of Object.keys(state.kind_weights)) {
    state.kind_weights[k] *= factor;
  }
  state.last_decay_ts = new Date().toISOString();
}

/**
 * on_event — decay → penalize mispredict → reinforce observed (saturating).
 * Mutates state in place. predicted may be null (pure observe path).
 */
export function onEvent(state, observed, predicted) {
  applyDecayIfNeeded(state);
  if (predicted && predicted !== observed) {
    state.kind_weights[predicted] = (state.kind_weights[predicted] || 0) * PENALTY_MULTIPLIER;
  }
  const w = state.kind_weights[observed] || 0;
  state.kind_weights[observed] = w + ALPHA * (1 - w);
  state.total_observations += 1;
}

/**
 * predict — return top-weighted kind or null.
 * classifyKindFn is passed by the caller to avoid circular dependency with section-lines.js.
 * Returns null when: cold start, threshold not met, or anchoring guard fires.
 *
 * @param {object} state — WMA state
 * @param {string} descriptionText — current Description field value
 * @param {function} classifyKindFn — (desc:string)=>kind:string, same as section-lines classifyKind
 * @returns {string|null}
 */
export function predict(state, descriptionText, classifyKindFn) {
  if (state.total_observations < MIN_OBSERVATIONS) return null;
  const sorted = Object.entries(state.kind_weights).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const top = sorted[0][0];
  // threshold guard: top must be ≥ 1.8× second
  if (sorted.length >= 2 && sorted[0][1] < THRESHOLD_RATIO * sorted[1][1]) return null;
  // anchoring guard: Description-derived kind differs → WMA suppressed
  if (descriptionText && descriptionText.trim() && classifyKindFn) {
    const descKind = classifyKindFn(descriptionText);
    if (descKind !== 'Other' && descKind !== top) return null;
  }
  return top;
}

/**
 * dismissPrediction — badge click aggressive penalty (0.7 × weight).
 * Mutates state in place. Does NOT call on_event (no observation increment).
 */
export function dismissPrediction(state, predictedKind) {
  const w = state.kind_weights[predictedKind] || 0;
  state.kind_weights[predictedKind] = w * BADGE_DISMISS_MULT;
}
