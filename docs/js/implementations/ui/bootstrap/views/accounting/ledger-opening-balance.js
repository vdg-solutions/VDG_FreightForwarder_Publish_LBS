// ledger-opening-balance.js — số dư đầu kỳ on the ledger viewer (F-42-02).
//
// Two numbers meet here and they are not the same claim:
//   live    — what the legs say the account held the day before the window opens. Always
//             available, always the correct seed for the running balance.
//   stamped — what the manager CLOSED the previous period at (period-opening-balance.js).
//             Only exists once that period has been closed, and it is the figure the books
//             were signed off on.
// When both exist and disagree, someone wrote into a period after it was closed — the ledger
// says so instead of quietly showing whichever number it happened to read.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { listCloseRecords } from '../../../../freight_app/operators/manager/period-close-orchestrator.js';
import { openingBalanceFor, periodOfDate, isPeriodStart, dayBefore } from '../../../../freight_app/core_abstractions/ports/period-opening-balance.js';

/**
 * @returns {Promise<{live:number, stamped:object|null, mismatch:boolean}>}
 */
export async function loadOpeningBalance(ledgerRepo, dataRepo, accountCode, dateFrom) {
  const asOf = dayBefore(dateFrom);
  if (!ledgerRepo || !asOf) return { live: 0, stamped: null, mismatch: false };

  let live = 0;
  try {
    const res = await ledgerRepo.getBalance(accountCode, asOf);
    live = Number(res?.balance) || 0;
  } catch (err) {
    console.error('[ledger] opening balance read failed:', err); // DEV — seed stays 0, row says so
    return { live: 0, stamped: null, mismatch: false };
  }

  // A stamped opening belongs to a period, so it may only be claimed when the window opens on
  // the period's first day; mid-month, the signed-off figure answers a different question.
  if (!isPeriodStart(dateFrom)) return { live, stamped: null, mismatch: false };
  const closes  = await listCloseRecords(dataRepo);
  const stamped = openingBalanceFor(closes, periodOfDate(dateFrom), accountCode);
  return { live, stamped, mismatch: !!stamped && stamped.balance !== live };
}

/// The leading row of the legs table — the balance every line below it builds on.
export function openingRowHtml(opening, fmtAmount) {
  if (!opening) return '';
  const note = opening.stamped
    ? t('ledger.opening.closed_by', { p: opening.stamped.source_period, u: opening.stamped.closed_by })
    : '';
  const warn = opening.mismatch
    ? `<div class="text-[11px] text-amber-700">${t('ledger.opening.mismatch', { b: fmtAmount(opening.stamped.balance) })}</div>`
    : '';
  return `
    <tr class="bg-slate-50 border-t border-slate-200 text-xs font-medium">
      <td class="px-3 py-1.5" colspan="6">
        ${t('ledger.opening.label')}
        ${note ? `<span class="ml-2 text-[11px] font-normal text-slate-500">${note}</span>` : ''}
        ${warn}
      </td>
      <td class="px-3 py-1.5"></td>
      <td class="px-3 py-1.5 text-right font-mono">${fmtAmount(opening.live)}</td>
    </tr>`;
}
