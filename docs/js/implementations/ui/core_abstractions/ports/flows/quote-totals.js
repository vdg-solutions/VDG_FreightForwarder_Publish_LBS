// quote-totals — port: the sales-quote form's Σvnd_pay / Σvnd_collect / mục C net total, and the
// POL/POD receipt+payment split the waterfall panel and quick-stat cards render (F-15-27). Root
// bootstrap binds it to the wasm freight_app export; JS only shapes the lines and reads the sums.

let _impl = null;

/// Root bootstrap binds { compute } once.
export function bindQuoteTotals(impl) { _impl = impl; }

function _i() {
  if (!_impl) throw new Error('ui/quote-totals: no implementation bound (root bootstrap binds it)');
  return _impl;
}

/// (lines, commissionNetAfterTax) ->
/// { sumReceipt, sumPayment, commissionTotal, polReceiptSum, podReceiptSum, polPaymentSum, podPaymentSum }
export const computeQuoteTotals = (...a) => _i().compute(...a);
