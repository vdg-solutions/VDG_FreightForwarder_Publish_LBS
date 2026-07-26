// pnl-dim-i18n.js — dimension key -> i18n label for pivot-table group-by headers/dropdowns
// (F-19-32). t()-miss detection mirrors kind-i18n.js, but falls back to a humanized label
// instead of the raw token — DIM_OPTIONS values must never reach the DOM as a raw snake_case key.
import { t } from '../i18n/index.js';

// dim -> i18n key. Generic dims reuse existing top-level keys (no duplication, AC-03);
// PNL-specific / air-mode dims use the pnl.col.* namespace already pre-staged for this.
const DIM_I18N_KEY = {
  period:         'period',
  sales_rep:      'sales_rep',
  customer:       'customer',
  trade_lane:     'pnl.col.trade_lane',
  container_type: 'pnl.col.container_type',
  carrier:        'carrier',
  route_lane:     'pnl.col.route_lane',
  carrier_iata:   'pnl.col.carrier_iata',
  mode:           'pnl.mode_filter',
};

function humanize(dim) {
  return String(dim).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function dimLabel(dim) {
  if (!dim) return '';
  const key = DIM_I18N_KEY[dim];
  if (!key) return humanize(dim);
  const label = t(key);
  return label === key ? humanize(dim) : label; // t() echoes key on miss — never leak it
}

// drill-summary value half: only the mode dim's raw enum ('air'/'sea') is copy needing
// translation; every other dim value is business data (customer name, sales-rep code,
// formatted period) — passed through untouched.
export function drillDimValueLabel(dim, value) {
  if (dim !== 'mode' || typeof value !== 'string') return value; // business data — passthrough
  const key   = `pnl.mode.${value.toLowerCase()}`;
  const label = t(key);
  return label === key ? value : label; // unrecognized/placeholder ('—') — passthrough, never mistranslate
}

export function formatDrillDimDesc(rowDims) {
  return Object.entries(rowDims)
    .map(([k, v]) => `${dimLabel(k)}:${drillDimValueLabel(k, v)}`)
    .join(' · ');
}
