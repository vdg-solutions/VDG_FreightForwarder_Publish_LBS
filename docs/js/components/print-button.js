import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { navigate } from '../router.js';

class VdgPrintButton extends LitElement {
  static properties = {
    docId:   { type: String, attribute: 'doc-id'   },
    docType: { type: String, attribute: 'doc-type'  },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.docId   = '';
    this.docType = '';
  }

  _openPrint() {
    // Navigate to print view, then trigger window.print after render settles
    navigate(`/document/${this.docId}/print`);
    // Small rAF delay so the print view can mount before dialog opens
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  render() {
    return html`
      <button
        @click=${() => this._openPrint()}
        class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium
               bg-slate-900 text-white rounded-md hover:bg-slate-800 transition no-print"
        title="Print ${this.docType || 'document'} as PDF"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9V2h12v7"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print PDF
      </button>
    `;
  }
}

customElements.define('vdg-print-button', VdgPrintButton);
