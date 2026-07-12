import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';

const MOBILE_BREAKPOINT_PX = 768; // F-14-16

function isMobileTouch() {
  return navigator.maxTouchPoints > 0 && window.innerWidth < MOBILE_BREAKPOINT_PX;
}

class VdgUploadZone extends LitElement {
  static properties = {
    accept: { type: String },
    hover:  { type: Boolean, state: true },
    file:   { type: Object,  state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.accept = '.xlsx';
    this.hover = false;
    this.file = null;
  }

  _dispatch(file) {
    this.file = file;
    this.dispatchEvent(new CustomEvent('vdg:file', { detail: { file }, bubbles: true }));
  }

  _onDrop(e) {
    e.preventDefault();
    this.hover = false;
    const f = e.dataTransfer.files?.[0];
    if (f) this._validateAndDispatch(f);
  }

  _onPicker(e) {
    const f = e.target.files?.[0];
    if (f) this._validateAndDispatch(f);
  }

  _validateAndDispatch(file) {
    const name = file.name.toLowerCase();
    const ok = name.endsWith('.xlsx') || name.endsWith('.xls');
    if (!ok) {
      this.dispatchEvent(new CustomEvent('vdg:file-rejected', {
        detail: { reason: 'unsupported-format', name: file.name },
        bubbles: true, composed: true
      }));
      return;
    }
    this._dispatch(file);
  }

  render() {
    // F-14-16: mobile branch — hide drag UI, show native picker
    if (isMobileTouch()) {
      return html`
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <div class="text-sm font-medium text-slate-700 mb-3">
            ${this.file ? this.file.name : 'Choose file to import'}
          </div>
          <label class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg cursor-pointer">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Browse file
            <input type="file" accept="${this.accept}" class="hidden" @change=${(e) => this._onPicker(e)} />
          </label>
          ${this.file ? html`
            <div class="mt-2 text-xs text-slate-500">${(this.file.size / 1024).toFixed(1)} KB · ready</div>` : ''}
        </div>`;
    }

    const cls = this.hover
      ? 'border-blue-400 bg-blue-50/60'
      : 'border-slate-300 bg-white hover:border-slate-400';
    return html`
      <label
        class="block rounded-xl border-2 border-dashed ${cls} p-10 text-center cursor-pointer transition"
        @dragover=${(e) => { e.preventDefault(); this.hover = true; }}
        @dragleave=${() => { this.hover = false; }}
        @drop=${(e) => this._onDrop(e)}
      >
        <input type="file" accept=${this.accept} class="hidden" @change=${(e) => this._onPicker(e)} />
        <div class="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div class="mt-4 text-sm font-medium text-slate-800">
          ${this.file ? this.file.name : 'Drop .xlsx file or click to browse'}
        </div>
        <div class="mt-1 text-xs text-slate-500">
          ${this.file
            ? `${(this.file.size / 1024).toFixed(1)} KB · ready for WASM validation`
            : 'Bytes passed to Rust WASM — no upload to server'}
        </div>
      </label>`;
  }
}

customElements.define('upload-zone', VdgUploadZone);
