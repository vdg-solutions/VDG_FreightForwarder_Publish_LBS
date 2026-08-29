// Lit component — <vdg-pivot-table>

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { DIM_OPTIONS } from '../../core_abstractions/ports/manager/pnl-composer.js';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { dimLabel } from '../../../kernel/core_abstractions/util/pnl-dim-i18n.js';

const DEFAULT_DIMS = ['period', 'sales_rep'];

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtPct(n) { return `${Number(n || 0).toFixed(1)}%`; }

function deltaArrow(curr, prev) {
  if (prev == null || prev === 0) return '—';
  const delta = ((curr - prev) / Math.abs(prev)) * 100;
  const isPositive = delta > 0;
  if (isPositive) {
    return `<span class="text-emerald-600">▲ +${delta.toFixed(1)}%</span>`;
  }
  return `<span class="text-red-500">▼ ${delta.toFixed(1)}%</span>`;
}

class VdgPivotTable extends LitElement {
  static properties = {
    rows:           { type: Array   },
    dims:           { type: Array   },
    showComparison: { type: Boolean },
    // sync_health.rs's own verdict for this pivot's source kinds (shipment/pnl_line) — an empty
    // `rows` array must render this, never `pivot.no_data`, when the load itself failed.
    loadFailed:     { type: Boolean },
    // Widened alongside empty-state.js's own LoadOutcome: a collection load can land as "N good,
    // M skipped" instead of aborting on one bad record (sync_health.rs's own per-kind remote-skip
    // count, D13) — rendered even when `rows` is non-empty, so a partial load never presents as a
    // complete one just because the good rows happened to be enough to fill the table.
    skippedCount:   { type: Number },
    _dim0:          { type: String, state: true },
    _dim1:          { type: String, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.rows           = [];
    this.dims           = DEFAULT_DIMS;
    this.showComparison = false;
    this.loadFailed     = false;
    this.skippedCount   = 0;
    this._dim0          = DEFAULT_DIMS[0];
    this._dim1          = DEFAULT_DIMS[1];
  }

  _retry() {
    this.dispatchEvent(new CustomEvent('vdg:pivot-retry', { bubbles: true, composed: true }));
  }

  updated(changed) {
    if (changed.has('dims') && this.dims) {
      this._dim0 = this.dims[0] || DEFAULT_DIMS[0];
      this._dim1 = this.dims[1] || DEFAULT_DIMS[1];
    }
  }

  _emitDimChange() {
    this.dispatchEvent(new CustomEvent('vdg:pivot-dims-changed', {
      bubbles: true, composed: true,
      detail: { dims: [this._dim0, this._dim1] },
    }));
  }

  _cellClick(row, metric) {
    this.dispatchEvent(new CustomEvent('vdg:pivot-cell-click', {
      bubbles: true, composed: true,
      detail: { rowDims: row.dims, colMetric: metric },
    }));
  }

  _grouped() {
    const groups = new Map();
    for (const row of this.rows) {
      const k0 = row.dims[this._dim0] || '—';
      const k1 = row.dims[this._dim1] || '—';
      if (!groups.has(k0)) groups.set(k0, new Map());
      groups.get(k0).set(k1, row);
    }
    return groups;
  }

  _renderDimSelectors() {
    return html`
      <div class="flex items-center gap-3 mb-3">
        <label class="text-xs text-slate-500">${t('pivot.group_by')}</label>
        <select
          class="text-xs border border-slate-200 rounded px-2 py-1"
          @change="${(e) => { this._dim0 = e.target.value; this._emitDimChange(); }}"
        >
          ${DIM_OPTIONS.map((d) => html`
            <option value="${d}" ?selected="${d === this._dim0}">${dimLabel(d)}</option>`)}
        </select>
        <label class="text-xs text-slate-500">${t('pivot.then_by')}</label>
        <select
          class="text-xs border border-slate-200 rounded px-2 py-1"
          @change="${(e) => { this._dim1 = e.target.value; this._emitDimChange(); }}"
        >
          ${DIM_OPTIONS.map((d) => html`
            <option value="${d}" ?selected="${d === this._dim1}">${dimLabel(d)}</option>`)}
        </select>
      </div>`;
  }

  _renderHeaderRow() {
    return html`
      <tr class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
        <th class="px-3 py-2 text-left sticky left-0 bg-slate-50">${dimLabel(this._dim0)}</th>
        <th class="px-3 py-2 text-left">${dimLabel(this._dim1)}</th>
        <th class="px-3 py-2 text-right cursor-pointer hover:text-blue-600"
            @click="${() => {}}">${t('revenue')}</th>
        <th class="px-3 py-2 text-right">${t('cost')}</th>
        <th class="px-3 py-2 text-right cursor-pointer hover:text-blue-600"
            >${t('margin')}</th>
        <th class="px-3 py-2 text-right">${t('margin_pct')}</th>
        <th class="px-3 py-2 text-right">${t('pivot.ships_count')}</th>
        <th class="px-3 py-2 text-right">${t('pivot.avg_margin')}</th>
        ${this.showComparison ? html`
          <th class="px-3 py-2 text-right text-slate-400">${t('pivot.prev_period')}</th>
          <th class="px-3 py-2 text-right text-slate-400">${t('pivot.yoy')}</th>` : ''}
      </tr>`;
  }

  _renderGroupRows(groups) {
    const trs = [];
    for (const [g0, subMap] of groups) {
      let first = true;
      for (const [g1, row] of subMap) {
        const marginCls     = row.margin_vnd >= 0 ? 'text-emerald-600' : 'text-red-500';
        const shipmentCount = row.shipment_count;
        trs.push(html`
          <tr class="border-t border-slate-100 hover:bg-blue-50 transition text-xs">
            ${first ? html`
              <td class="px-3 py-2 font-semibold text-slate-800 sticky left-0 bg-white"
                  rowspan="${subMap.size}">${g0}</td>` : ''}
            <td class="px-3 py-2 text-slate-600">${g1}</td>
            <td class="px-3 py-2 text-right font-mono cursor-pointer"
                @click="${() => this._cellClick(row, 'revenue_vnd')}">${fmtVnd(row.revenue_vnd)}</td>
            <td class="px-3 py-2 text-right font-mono">${fmtVnd(row.cost_vnd)}</td>
            <td class="px-3 py-2 text-right font-mono ${marginCls} cursor-pointer"
                @click="${() => this._cellClick(row, 'margin_vnd')}">${fmtVnd(row.margin_vnd)}</td>
            <td class="px-3 py-2 text-right ${marginCls}">${fmtPct(row.margin_pct)}</td>
            <td class="px-3 py-2 text-right">${shipmentCount}</td>
            <td class="px-3 py-2 text-right font-mono">${fmtVnd(row.avg_margin)}</td>
            ${this.showComparison ? html`
              <td class="px-3 py-2 text-right text-[11px]">
                ${html([deltaArrow(row.margin_vnd, row.prev_margin_vnd)])}
              </td>
              <td class="px-3 py-2 text-right text-[11px]">
                ${html([deltaArrow(row.margin_vnd, row.yoy_margin_vnd)])}
              </td>` : ''}
          </tr>`);
        first = false;
      }
    }
    return trs;
  }

  _renderGrandTotal() {
    if (!this.rows.length) return html``;
    const totals = this.rows.reduce(
      (acc, r) => {
        acc.revenue_vnd    += r.revenue_vnd;
        acc.cost_vnd       += r.cost_vnd;
        acc.margin_vnd     += r.margin_vnd;
        acc.shipment_count += r.shipment_count;
        return acc;
      },
      { revenue_vnd: 0, cost_vnd: 0, margin_vnd: 0, shipment_count: 0 },
    );
    const pct           = totals.revenue_vnd > 0
      ? (totals.margin_vnd / totals.revenue_vnd) * 100 : 0;
    const cls           = totals.margin_vnd >= 0 ? 'text-emerald-600' : 'text-red-500';
    const shipmentTotal = totals.shipment_count;
    return html`
      <tr class="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold">
        <td class="px-3 py-2 sticky left-0 bg-slate-50" colspan="2">${t('pivot.grand_total')}</td>
        <td class="px-3 py-2 text-right font-mono">${fmtVnd(totals.revenue_vnd)}</td>
        <td class="px-3 py-2 text-right font-mono">${fmtVnd(totals.cost_vnd)}</td>
        <td class="px-3 py-2 text-right font-mono ${cls}">${fmtVnd(totals.margin_vnd)}</td>
        <td class="px-3 py-2 text-right ${cls}">${fmtPct(pct)}</td>
        <td class="px-3 py-2 text-right">${shipmentTotal}</td>
        <td></td>
        ${this.showComparison ? html`<td></td><td></td>` : ''}
      </tr>`;
  }

  render() {
    const groups = this._grouped();
    // D13: a partial load (some rows present, some skipped) must still warn — the empty-rows
    // branch below already covers a total loss, but a skip riding alongside REAL data used to
    // render as a plain, complete-looking table with no notice at all (the exact defect: real
    // figures presented as complete when they were not).
    const showPartialBanner = this.rows.length > 0 && this.skippedCount > 0;
    return html`
      <div>
        ${this._renderDimSelectors()}
        ${showPartialBanner ? html`
          <div class="text-xs text-amber-600 px-1 pb-2">${t('empty_state.load_failed.partial', { n: this.skippedCount })}</div>` : ''}
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="w-full border-collapse text-xs">
            <thead class="sticky top-0 z-10">${this._renderHeaderRow()}</thead>
            <tbody>
              ${this._renderGroupRows(groups)}
              ${this._renderGrandTotal()}
            </tbody>
          </table>
        </div>
        ${!this.rows.length && this.loadFailed ? html`
          <div class="flex flex-col items-center gap-3 py-10">
            <div class="text-sm text-red-600 font-medium">${t('pivot.load_failed')}</div>
            ${this.skippedCount > 0 ? html`
              <div class="text-xs text-amber-600">${t('empty_state.load_failed.partial', { n: this.skippedCount })}</div>` : ''}
            <button type="button" @click="${() => this._retry()}"
              class="px-4 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors">
              ${t('empty_state.load_failed.retry')}
            </button>
          </div>` : !this.rows.length ? html`
          <div class="text-center text-slate-400 text-sm py-10">${t('pivot.no_data')}</div>` : ''}
      </div>`;
  }
}

customElements.define('vdg-pivot-table', VdgPivotTable);
