// Lit component — <vdg-sparkline> — inline SVG polyline, no external chart dep

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

const SPARKLINE_W_PX    = 80;
const SPARKLINE_H_PX    = 28;
const SPARKLINE_STROKE_COLOR = '#3b82f6';
const SPARKLINE_MIDPOINT_Y   = SPARKLINE_H_PX / 2;
const SPARKLINE_PADDING      = 2;

class VdgSparkline extends LitElement {
  static properties = {
    values: { type: Array },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.values = [];
  }

  _polylinePoints() {
    const vals = this.values || [];
    if (!vals.length) {
      // flat line at midpoint
      return `0,${SPARKLINE_MIDPOINT_Y} ${SPARKLINE_W_PX},${SPARKLINE_MIDPOINT_Y}`;
    }

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const usableH = SPARKLINE_H_PX - SPARKLINE_PADDING * 2;

    return vals.map((v, i) => {
      const x = (i / Math.max(vals.length - 1, 1)) * SPARKLINE_W_PX;
      const y = SPARKLINE_PADDING + usableH - ((v - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  render() {
    return html`
      <svg width="${SPARKLINE_W_PX}" height="${SPARKLINE_H_PX}"
           viewBox="0 0 ${SPARKLINE_W_PX} ${SPARKLINE_H_PX}"
           xmlns="http://www.w3.org/2000/svg"
           style="display:inline-block;vertical-align:middle;">
        <polyline
          points="${this._polylinePoints()}"
          fill="none"
          stroke="${SPARKLINE_STROKE_COLOR}"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>`;
  }
}

customElements.define('vdg-sparkline', VdgSparkline);
