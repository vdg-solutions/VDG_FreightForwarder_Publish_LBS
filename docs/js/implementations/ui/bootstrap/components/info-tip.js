// info-tip — small "i" affordance next to a heading/KPI that explains what it means. Click/tap or
// keyboard-Enter toggles (not hover-only, so it works on touch); Escape and click-away close it.
// The panel stays in the DOM (opacity toggle, not `hidden`) so aria-describedby keeps working for
// a screen reader that focuses the button regardless of the open state.
import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

let _seq = 0;

class VdgInfoTip extends LitElement {
  static properties = {
    text: { type: String },
    open: { type: Boolean, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.text = '';
    this.open = false;
    this._id = `info-tip-${++_seq}`;
    this._onDocClick = this._onDocClick.bind(this);
    this._onKeydown = this._onKeydown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onKeydown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeydown);
  }

  _onDocClick(e) {
    if (this.open && !this.contains(e.target)) this.open = false;
  }

  _onKeydown(e) {
    if (this.open && e.key === 'Escape') {
      this.open = false;
      this.querySelector('button')?.focus();
    }
  }

  _toggle(e) {
    e.stopPropagation();
    this.open = !this.open;
  }

  render() {
    return html`
      <span class="relative inline-flex align-middle">
        <button type="button" @click=${this._toggle}
          aria-expanded=${this.open ? 'true' : 'false'} aria-describedby=${this._id}
          class="w-4 h-4 inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-400 text-[10px] font-semibold leading-none hover:text-slate-600 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >i</button>
        <span id=${this._id} role="tooltip"
          class="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-1.5 w-56 rounded-lg bg-slate-900 text-white text-[11px] leading-snug px-2.5 py-2 shadow-lg transition-opacity ${this.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
        >${this.text}</span>
      </span>
    `;
  }
}

customElements.define('info-tip', VdgInfoTip);
