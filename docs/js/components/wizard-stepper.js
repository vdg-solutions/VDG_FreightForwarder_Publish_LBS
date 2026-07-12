import { LitElement, html, css } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

// Visual step indicator for multi-step wizards.
// Props: steps (string[]), current (number), completed (Set<number>)
// Emits: vdg:step-click({ step }) when user clicks a completed past step.

class VdgWizardStepper extends LitElement {
  static properties = {
    steps:     { type: Array  },
    current:   { type: Number },
    completed: { type: Object }, // Set<number>
  };

  static styles = css`
    :host { display: block; }
  `;

  // Use light DOM so Tailwind applies
  createRenderRoot() { return this; }

  constructor() {
    super();
    this.steps     = [];
    this.current   = 0;
    this.completed = new Set();
  }

  _clickStep(idx) {
    if (!this.completed.has(idx) && idx !== this.current) return;
    this.dispatchEvent(new CustomEvent('vdg:step-click', { bubbles: true, detail: { step: idx } }));
  }

  render() {
    return html`
      <nav class="flex items-center gap-0" aria-label="progress">
        ${this.steps.map((label, idx) => this._renderStep(label, idx))}
      </nav>
    `;
  }

  _renderStep(label, idx) {
    const done    = this.completed.has(idx);
    const active  = idx === this.current;
    const clickable = done && !active;
    const isLast  = idx === this.steps.length - 1;

    const circleCls = active
      ? 'bg-blue-600 text-white ring-2 ring-blue-300'
      : done
        ? 'bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600'
        : 'bg-slate-200 text-slate-400';

    const labelCls = active
      ? 'text-blue-700 font-semibold'
      : done
        ? 'text-emerald-700 cursor-pointer'
        : 'text-slate-400';

    const connectorCls = done ? 'bg-emerald-400' : 'bg-slate-200';

    return html`
      <div class="flex items-center">
        <button
          class="flex flex-col items-center gap-1 group"
          ?disabled=${!clickable}
          @click=${() => this._clickStep(idx)}
        >
          <span class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${circleCls}">
            ${done && !active
              ? html`<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`
              : idx + 1
            }
          </span>
          <span class="text-[10px] whitespace-nowrap ${labelCls}">${label}</span>
        </button>
        ${!isLast ? html`
          <div class="h-0.5 w-8 sm:w-12 mx-1 mb-5 rounded ${connectorCls}"></div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('vdg-wizard-stepper', VdgWizardStepper);
