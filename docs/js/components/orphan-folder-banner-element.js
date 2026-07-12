// F-24-14 — vdg-orphan-folder-banner custom element. Wires the pure logic/template from
// orphan-folder-banner.js to a real LitElement; kept in its own file so boot code can import
// the pure helpers without pulling the lit CDN into the boot path (mirrors topbar.js /
// topbar-sync-chip.js split).

import { LitElement, html } from 'https://cdn.jsdelivr.net/npm/lit@3.1.4/+esm';
import { t } from '../i18n/index.js';
import { ORPHAN_EVENT, DISMISS_KEY, shouldShowOrphanBanner, renderOrphanBanner } from './orphan-folder-banner.js';

const DRIVE_ROOT_URL = 'https://drive.google.com/drive/my-drive';

class VdgOrphanFolderBanner extends LitElement {
  static properties = {
    _count:       { type: Number, state: true },
    _canonicalId: { type: String, state: true },
    _visible:     { type: Boolean, state: true },
  };

  createRenderRoot() { return this; }

  constructor() {
    super();
    this._count       = 0;
    this._canonicalId = null;
    this._visible     = false;
    this._onDetected  = (e) => this._handleDetected(e);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(ORPHAN_EVENT, this._onDetected);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(ORPHAN_EVENT, this._onDetected);
  }

  _handleDetected(e) {
    const { count, canonicalId } = e.detail || {};
    const dismissedFor = localStorage.getItem(DISMISS_KEY);
    if (!shouldShowOrphanBanner(count, canonicalId, dismissedFor)) return;
    this._count       = count;
    this._canonicalId = canonicalId;
    this._visible     = true;
  }

  _goToDrive() {
    window.open(DRIVE_ROOT_URL, '_blank', 'noopener');
  }

  _dismiss() {
    if (this._canonicalId) localStorage.setItem(DISMISS_KEY, this._canonicalId);
    this._visible = false;
  }

  render() {
    if (!this._visible) return html``;
    return renderOrphanBanner({
      html, t, count: this._count,
      onGoToDrive: () => this._goToDrive(),
      onDismiss:   () => this._dismiss(),
    });
  }
}

customElements.define('vdg-orphan-folder-banner', VdgOrphanFolderBanner);
