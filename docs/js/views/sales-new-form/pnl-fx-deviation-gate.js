// pnl-fx-deviation-gate.js — VR-03 async wiring: resolve reference rates, run the detector,
// drive the hard-confirm dialog, build audit records (F-29-04). Impure (fx repo + DOM confirm) —
// exercised at integ/CDP level, see design.md §5/§6.
import { getRateForDate } from '../../util/fx-lookup.js';
import { showConfirm }    from '../../helpers/show-confirm.js';
import { t }              from '../../i18n/index.js';
import { detectFxDeviation, buildFxOverrideRecord, FX_DEVIATION_THRESHOLD }
  from './pnl-save-validations.js';

const VND_CURRENCY = 'VND';

// currency VND is a locked self-pair (rate=1, no lookup needed); missing repo/date → no reference
// (band check is skipped downstream, ≤0 check still applies) — mirrors pnl-line-fx.js's prefillFxRate.
async function _resolveReference(fxRepo, fxDate, currency) {
  if (currency === VND_CURRENCY) return 1;
  if (!fxRepo || !fxDate) return null;
  return getRateForDate(fxRepo, fxDate, currency);
}

// Only check a side that actually carries an amount — an untouched/padding row has no fx data
// to evaluate, same gating as validateNiForm's VR-01 hard-block (amount present → checks apply).
async function _checkSide(flagged, fxRepo, lineRef, { amount, currency, fxRate, fxDate }) {
  if (!amount || !currency) return;
  const referenceRate = await _resolveReference(fxRepo, fxDate, currency);
  const { flagged: isFlagged, reason } = detectFxDeviation({ currency, fxRate, referenceRate });
  if (isFlagged) {
    flagged.push({ lineRef, currency, fxRate, referenceRate, fxDate, reason });
  }
}

/** findFxDeviations — AC-04 wiring: scan mục B (buy/sell) + mục C lines for VR-03 flags. */
export async function findFxDeviations(state = {}, fxRepo) {
  const flagged = [];
  const lines           = state.lines || [];
  const commissionLines = state.commission_lines || [];

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await _checkSide(flagged, fxRepo, `${i}:buy:${l.desc || ''}`,
      { amount: l.buy_amt, currency: l.buy_currency, fxRate: l.buy_fx_rate, fxDate: l.buy_fx_date });
    await _checkSide(flagged, fxRepo, `${i}:sell:${l.desc || ''}`,
      { amount: l.sell_amt, currency: l.sell_currency, fxRate: l.sell_fx_rate, fxDate: l.sell_fx_date });
  }

  for (let i = 0; i < commissionLines.length; i++) {
    const l = commissionLines[i];
    await _checkSide(flagged, fxRepo, `C${i}:${l.kind || ''}`,
      { amount: l.amount_fx, currency: l.currency, fxRate: l.fx_rate, fxDate: l.fx_date });
  }

  return flagged;
}

function _confirmBody(flagged) {
  return flagged.map((f) => {
    const reasonLabel = f.reason === 'non_positive'
      ? t('sales_new.fx_deviation.reason_non_positive')
      : t('sales_new.fx_deviation.reason_deviation');
    return `${f.lineRef}: ${f.currency} @ ${f.fxRate} — ${reasonLabel}`;
  }).join('\n');
}

/** confirmFxDeviations — AC-05/AC-06: single hard-confirm gate + override record building. */
export async function confirmFxDeviations(flagged, { confirmedBy } = {}) {
  if (!flagged.length) return { proceed: true, overrides: [] };

  const proceed = await showConfirm({
    title: t('sales_new.fx_deviation.title'),
    body:  `${t('sales_new.fx_deviation.body')}\n${_confirmBody(flagged)}`,
    confirmLabel: t('sales_new.fx_deviation.confirm'),
    cancelLabel:  t('sales_new.fx_deviation.cancel'),
    destructive:  true,
  });

  if (!proceed) return { proceed: false, overrides: [] };

  const confirmedAt = new Date().toISOString();
  const overrides = flagged.map((f) => buildFxOverrideRecord(f.lineRef, {
    currency:      f.currency,
    fxRate:        f.fxRate,
    referenceRate: f.referenceRate,
    fxDate:        f.fxDate,
    threshold:     FX_DEVIATION_THRESHOLD,
    reason:        f.reason,
    confirmedBy,
    confirmedAt,
  }));

  return { proceed: true, overrides };
}
