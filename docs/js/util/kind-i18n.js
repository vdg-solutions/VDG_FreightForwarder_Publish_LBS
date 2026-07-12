// kind-i18n.js — i18n label for PNL line kind (AC-01, F-15-62)
import { t } from '../i18n/index.js';

const KIND_EMPTY = '—';

/**
 * kindI18nLabel — pnl.kind.<Kind> i18n lookup; single source of truth.
 * locale param accepted for API consistency; t() uses global _locale.
 * @param {string} kind
 * @param {string} [locale]
 * @returns {string}
 */
export function kindI18nLabel(kind, locale) {
  if (!kind || kind === KIND_EMPTY) return '';
  return t(`pnl.kind.${kind}`);
}
