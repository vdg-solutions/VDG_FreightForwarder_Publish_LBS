import { LitElement, html, svg } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';


const TONES = {
  blue: { dot: 'bg-blue-500', ring: 'ring-blue-100', text: 'text-blue-600' },
  amber: { dot: 'bg-amber-500', ring: 'ring-amber-100', text: 'text-amber-600' },
  red: { dot: 'bg-red-500', ring: 'ring-red-100', text: 'text-red-600' },
  green: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', text: 'text-emerald-600' },
};

const ICONS = {
  ship: svg`<path d="M3 18a9 9 0 0 0 18 0M3 18l1.5-5h15L21 18M6 13V7h12v6M9 7V4h6v3"/>`,
  doc: svg`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>`,
  alert: svg`<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5"/>`,
  dollar: svg`<path d="M12 2v20M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7"/>`,
};

class VdgKpiCard extends LitElement {
  static properties = {
    label: { type: String },
    value: { type: String },
    delta: { type: String },
    tone: { type: String },
    icon: { type: String },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.tone = 'blue';
    this.icon = 'ship';
  }

  render() {
    const tone = TONES[this.tone] || TONES.blue;
    const iconContent = ICONS[this.icon] || ICONS.ship;
    return html`
      <div class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
        <div class="flex items-start justify-between">
          <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">${this.label}</div>
          <div class="w-9 h-9 rounded-lg ring-4 ${tone.ring} ${tone.dot} bg-opacity-10 flex items-center justify-center">
            <svg class="w-4 h-4 ${tone.text}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${iconContent}
            </svg>
          </div>
        </div>
        <div class="mt-3 text-3xl font-bold tracking-tight text-slate-900">${this.value}</div>
        <div class="mt-1 text-xs ${tone.text} font-medium">${this.delta}</div>
      </div>
    `;
  }
}

customElements.define('kpi-card', VdgKpiCard);
