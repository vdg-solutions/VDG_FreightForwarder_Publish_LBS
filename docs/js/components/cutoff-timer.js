import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

class VdgCutoffTimer extends LitElement {
  static properties = {
    deadline: { type: String },
    label: { type: String },
    now: { type: Number, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.deadline = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
    this.label = 'Cutoff';
    this.now = Date.now();
  }

  connectedCallback() {
    super.connectedCallback();
    this._timer = setInterval(() => { this.now = Date.now(); }, 30 * 1000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this._timer);
  }

  _format(ms) {
    if (ms <= 0) return 'Expired';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h`;
    }
    return `${h}h ${m}m`;
  }

  _tone(ms) {
    if (ms <= 0) return 'text-slate-400 line-through';
    if (ms < 4 * 3600 * 1000) return 'text-red-600 font-semibold';
    if (ms < 24 * 3600 * 1000) return 'text-amber-600 font-medium';
    return 'text-emerald-600';
  }

  render() {
    const ms = new Date(this.deadline).getTime() - this.now;
    return html`
      <div class="inline-flex items-center gap-2 text-xs">
        <span class="text-slate-500">${this.label}</span>
        <span class="${this._tone(ms)} font-mono">${this._format(ms)}</span>
      </div>
    `;
  }
}

customElements.define('cutoff-timer', VdgCutoffTimer);
