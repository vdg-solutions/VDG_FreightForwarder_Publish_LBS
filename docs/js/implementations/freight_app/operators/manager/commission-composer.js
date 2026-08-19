// Derive commission rules map from commission_rules master. No DOM, no external I/O.
// commission_rules entities: { id: salesId, sales_id, rule_id } — set by manager.
// rules Map is used by commission-calculator.js for waterfall calc.

const KIND_COMMISSION_RULES = 'commission_rules';

/**
 * @param {object} repo  CachedEntityRepo
 * @returns {{ rules: Map<string, object> }}
 */
export async function compose(repo) {
  const ruleEntities = await repo.list(KIND_COMMISSION_RULES, null).catch(() => []);

  // salesId → assignment entity { rule_id, ... }
  const rules = new Map();
  for (const r of ruleEntities) {
    const key = r.sales_id || r.salesId || r.id;
    if (key) rules.set(key, r);
  }

  return { rules };
}
