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
      <span class="relative inline-flex">
        <button type="button" @click=${this._toggle}
          aria-expanded=${this.open ? 'true' : 'false'} aria-describedby=${this._id}
          aria-label=${this.text}
          class="info-tip-btn w-[15px] h-[15px] inline-flex items-center justify-center rounded-full
                 border border-slate-300 bg-white text-slate-400 text-[10px] font-semibold leading-none
                 transition-colors hover:text-slate-600 hover:border-slate-400
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >i</button>
        <span id=${this._id} role="tooltip"
          class="absolute z-30 left-1/2 -translate-x-1/2 top-[22px] w-60 max-w-[80vw] rounded-lg
                 bg-slate-800 text-slate-100 text-[11px] font-normal normal-case tracking-normal
                 leading-relaxed text-left px-3 py-2 shadow-xl ring-1 ring-black/5
                 transition-opacity duration-150 ${this.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}"
        >${this.text}</span>
      </span>
    `;
  }
}

customElements.define('info-tip', VdgInfoTip);
