// Lit component — <vdg-dup-wizard> — duplicate cluster modal

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { t } from '../../../kernel/core_abstractions/i18n/index.js';
import { suppressDuplicatePair } from '../../core_abstractions/ports/data/report-reads.js';

const SCORE_PRECISION = 2;

class VdgDupWizard extends LitElement {
  // No `repo` property any more: the suppression goes through a named use-case, so the component
  // needs nothing but the pairs. masters.js still assigns `wizard.repo` — a harmless no-op on an
  // undeclared property, to be dropped when that view is converted.
  static properties = {
    clusters: { type: Array },
    _clusters: { type: Array, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this.clusters  = [];
    this._clusters = [];
  }

  updated(changed) {
    if (changed.has('clusters')) {
      this._clusters = [...(this.clusters || [])];
    }
  }

  // "These two are not the same thing" is a judgement about the data — where the suppression
  // list lives and what a suppressed pair looks like are wasm's, not this component's.
  async _suppress(pair) {
    try {
      await suppressDuplicatePair(pair.a.id, pair.b.id);
    } catch (err) {
      console.warn('[dup-wizard] suppress write failed:', err.message); // DEV
    }
    this._clusters = this._clusters.filter((c) => c !== pair);
  }

  _close() {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    this.remove();
  }

  render() {
    const clusters = this._clusters;
    return html`
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" @click="${(e) => { if (e.target === e.currentTarget) this._close(); }}">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div class="font-semibold text-slate-900">${t('dup_wizard.title')}</div>
            <button @click="${this._close}"
                    class="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            ${clusters.length === 0 ? html`
              <div class="text-center py-10 text-slate-400 text-sm">${t('dup_wizard.empty')}</div>
            ` : clusters.map((pair) => html`
              <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span class="font-medium text-slate-700">${t('common.score_label')}</span>
                  ${Number(pair.score).toFixed(SCORE_PRECISION)}
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-50 rounded-lg p-3 text-sm">
                    <div class="font-medium text-slate-900 truncate">${pair.a.name}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${pair.a.id}</div>
                  </div>
                  <div class="bg-slate-50 rounded-lg p-3 text-sm">
                    <div class="font-medium text-slate-900 truncate">${pair.b.name}</div>
                    <div class="text-xs text-slate-500 mt-0.5">${pair.b.id}</div>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button @click="${() => this._suppress(pair)}"
                          class="flex-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
                    ${t('dup_wizard.action.not_duplicate')}
                  </button>
                </div>
              </div>
            `)}
          </div>

          <div class="px-6 py-3 border-t border-slate-100 text-xs text-slate-400 text-right">
            ${t('dup_wizard.remaining', { n: clusters.length })}
          </div>
        </div>
      </div>`;
  }
}

customElements.define('vdg-dup-wizard', VdgDupWizard);
