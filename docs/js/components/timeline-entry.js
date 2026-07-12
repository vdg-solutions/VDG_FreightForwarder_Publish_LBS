import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

class VdgTimelineEntry extends LitElement {
  static properties = {
    entry: { type: Object },
    last:  { type: Boolean },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.entry = null;
    this.last  = false;
  }

  render() {
    if (!this.entry) return html``;
    const e   = this.entry;
    // YYYY-MM-DD HH:mm local
    const ts  = new Date(e.timestamp_ms).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
    return html`
      <div class="flex gap-3 pb-4 relative">
        <div class="shrink-0 flex flex-col items-center">
          <div class="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1"></div>
          ${!this.last ? html`<div class="w-px flex-1 bg-slate-200 mt-1"></div>` : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-mono text-xs text-slate-400">${ts}</div>
          <div class="text-sm font-medium text-slate-900 mt-0.5">${e.event}</div>
          <div class="text-xs text-slate-500">${e.from_state} → ${e.to_state}</div>
          ${e.emitted?.length ? html`
            <div class="flex flex-wrap gap-1 mt-1">
              ${e.emitted.map(ev => html`<span class="inline-flex items-center text-[10px] bg-teal-50 text-teal-700 rounded px-1.5 py-0.5">↗ ${ev}</span>`)}
            </div>` : ''}
        </div>
      </div>`;
  }
}

customElements.define('vdg-timeline-entry', VdgTimelineEntry);
