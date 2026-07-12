// Lit component — <vdg-pivot-table>

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { DIM_OPTIONS } from '../operators/manager/pnl-composer.js';

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
  if (delta > 0) return `<span class="text-emerald-600">▲ +${delta.toFixed(1)}%</span>`;
  return `<span class="text-red-500">▼ ${delta.toFixed(1)}%</span>`;
}

class VdgPivotTable extends LitElement {
  static properties = {
    rows:           { type: Array   },
    dims:           { type: Array   },
    showComparison: { type: Boolean },
    _dim0:          { type: String, state: true },
    _dim1:          { type: String, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.rows           = [];
    this.dims           = DEFAULT_DIMS;
    this.showComparison = false;
    this._dim0          = DEFAULT_DIMS[0];
    this._dim1          = DEFAULT_DIMS[1];
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
        <label class="text-xs text-slate-500">Group by</label>
        <select
          class="text-xs border border-slate-200 rounded px-2 py-1"
          @change="${(e) => { this._dim0 = e.target.value; this._emitDimChange(); }}"
        >
          ${DIM_OPTIONS.map((d) => html`
            <option value="${d}" ?selected="${d === this._dim0}">${d.replace('_', ' ')}</option>`)}
        </select>
        <label class="text-xs text-slate-500">then by</label>
        <select
          class="text-xs border border-slate-200 rounded px-2 py-1"
          @change="${(e) => { this._dim1 = e.target.value; this._emitDimChange(); }}"
        >
          ${DIM_OPTIONS.map((d) => html`
            <option value="${d}" ?selected="${d === this._dim1}">${d.replace('_', ' ')}</option>`)}
        </select>
      </div>`;
  }

  _renderHeaderRow() {
    return html`
      <tr class="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider">
        <th class="px-3 py-2 text-left sticky left-0 bg-slate-50">${this._dim0}</th>
        <th class="px-3 py-2 text-left">${this._dim1}</th>
        <th class="px-3 py-2 text-right cursor-pointer hover:text-blue-600"
            @click="${() => {}}">Revenue</th>
        <th class="px-3 py-2 text-right">Cost</th>
        <th class="px-3 py-2 text-right cursor-pointer hover:text-blue-600"
            >Margin</th>
        <th class="px-3 py-2 text-right">Margin %</th>
        <th class="px-3 py-2 text-right"># Ships</th>
        <th class="px-3 py-2 text-right">Avg Margin</th>
        ${this.showComparison ? html`
          <th class="px-3 py-2 text-right text-slate-400">Prev Period</th>
          <th class="px-3 py-2 text-right text-slate-400">YoY</th>` : ''}
      </tr>`;
  }

  _renderGroupRows(groups) {
    const trs = [];
    for (const [g0, subMap] of groups) {
      let first = true;
      for (const [g1, row] of subMap) {
        const marginCls = row.margin_vnd >= 0 ? 'text-emerald-600' : 'text-red-500';
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
            <td class="px-3 py-2 text-right">${row.shipment_count}</td>
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
    const pct = totals.revenue_vnd > 0
      ? (totals.margin_vnd / totals.revenue_vnd) * 100 : 0;
    const cls = totals.margin_vnd >= 0 ? 'text-emerald-600' : 'text-red-500';
    return html`
      <tr class="border-t-2 border-slate-300 bg-slate-50 text-xs font-semibold">
        <td class="px-3 py-2 sticky left-0 bg-slate-50" colspan="2">Grand Total</td>
        <td class="px-3 py-2 text-right font-mono">${fmtVnd(totals.revenue_vnd)}</td>
        <td class="px-3 py-2 text-right font-mono">${fmtVnd(totals.cost_vnd)}</td>
        <td class="px-3 py-2 text-right font-mono ${cls}">${fmtVnd(totals.margin_vnd)}</td>
        <td class="px-3 py-2 text-right ${cls}">${fmtPct(pct)}</td>
        <td class="px-3 py-2 text-right">${totals.shipment_count}</td>
        <td></td>
        ${this.showComparison ? html`<td></td><td></td>` : ''}
      </tr>`;
  }

  render() {
    const groups = this._grouped();
    return html`
      <div>
        ${this._renderDimSelectors()}
        <div class="overflow-x-auto border border-slate-200 rounded-xl">
          <table class="w-full border-collapse text-xs">
            <thead class="sticky top-0 z-10">${this._renderHeaderRow()}</thead>
            <tbody>
              ${this._renderGroupRows(groups)}
              ${this._renderGrandTotal()}
            </tbody>
          </table>
        </div>
        ${!this.rows.length ? html`
          <div class="text-center text-slate-400 text-sm py-10">No data for selected period</div>` : ''}
      </div>`;
  }
}

customElements.define('vdg-pivot-table', VdgPivotTable);
