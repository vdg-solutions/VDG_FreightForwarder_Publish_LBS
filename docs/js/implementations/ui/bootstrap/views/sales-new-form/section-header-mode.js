// section-header-mode.js — the transport-mode picker's markup. Split out of section-header.js
// when that file crossed the 350-line cap.
//
// ADO #122: the two options this replaced were hand-written, which is why an air record rendered
// as SEA (`mode || 'SEA'` turned a field nobody had mapped into a valid mode, and the next save
// wrote it down) and why the road mode the domain enum has always carried never reached the
// picker. The vocabulary and the reading of it are kernel/core_abstractions/ports/shipment-mode.js → wasm.

import { t } from '../../../../kernel/core_abstractions/i18n/index.js';
import { modeCodes, modeLabelKey, MODE_STATUS_UNREAD }
  from '../../../../kernel/core_abstractions/ports/shipment-mode.js';

// `code` doubles as the label-key suffix — the convention the publish gate's error reasons and the
// action bar's labels already use.
const MODE_LABEL_PREFIX = 'sales_new.mode_selector.';

// A stored value wasm cannot read keeps an option of its own, selected and flagged, so the record
// round-trips on save instead of being quietly replaced by whatever sorts first.
export function modeSel(res) {
  const opts = modeCodes().map((c) =>
    `<option value="${c}"${c === res.code ? ' selected' : ''}>${t(MODE_LABEL_PREFIX + c)}</option>`).join('');
  const unread = res.status === MODE_STATUS_UNREAD
    ? `<option value="${res.code}" selected>${t(modeLabelKey(res, MODE_LABEL_PREFIX)).replace('{v}', res.code)}</option>`
    : '';
  return `<select name="mode"
    class="w-full border rounded px-2 py-1 text-xs ${unread ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}">
    <option value="">—</option>${opts}${unread}
  </select>`;
}
