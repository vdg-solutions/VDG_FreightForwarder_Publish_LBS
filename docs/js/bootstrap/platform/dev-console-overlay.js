// Dev-only console/error overlay — paints console.error and window error/rejection events as
// on-screen divs. Relocated out of index.html (F-15-65 AC-01) so the shipped HTML carries no
// DOM-injecting handler; behavior is unchanged, still gated by isDevHost() (owner 2026-07-15,
// feedback_no_dev_overlays_in_prod).
import { isDevHost } from '../../implementations/kernel/core_abstractions/util/dev-host.js';

const GSI_LOGGER_TAG = '[GSI_LOGGER]';

// Built with the DOM API, not insertAdjacentHTML + an inline onclick — CSP's script-src-attr
// blocks the latter even on this dev-only path (ADO #124); a plain `click` listener on the node
// itself needs no attribute at all.
function showOverlay({ top, fontSize, maxWidth, color, text }) {
  const div = document.createElement('div');
  div.style.cssText = `cursor:pointer;position:fixed;top:${top}px;left:50px;background:${color};color:${color === 'orange' ? 'black' : 'white'};z-index:999999;padding:20px;font-size:${fontSize}px;overflow:auto;` + (maxWidth ? `max-width:${maxWidth}px;` : '');
  div.textContent = text;
  const hint = document.createElement('small');
  hint.textContent = '(Click to dismiss)';
  div.appendChild(document.createElement('br'));
  div.appendChild(hint);
  div.addEventListener('click', () => div.remove());
  document.body.insertAdjacentElement('afterbegin', div);
}

export function installDevConsoleOverlay() {
  if (!isDevHost(location.hostname, location.protocol)) return;

  const oldErr = console.error;
  console.error = function(...args) {
    if (String(args[0]).includes(GSI_LOGGER_TAG)) {
      oldErr.apply(console, args);
      return;
    }
    const text = 'CONSOLE ERR: ' + String(args[0]) + (args[1] && args[1].stack ? ' ' + args[1].stack : '');
    showOverlay({ top: 100, fontSize: 18, maxWidth: 800, color: 'orange', text });
    oldErr.apply(console, args);
  };
  window.addEventListener('error', e => {
    showOverlay({ top: 50, fontSize: 24, maxWidth: 0, color: 'red', text: e.message });
  });
  window.addEventListener('unhandledrejection', e => {
    const text = (e.reason && e.reason.stack) || e.reason;
    showOverlay({ top: 50, fontSize: 24, maxWidth: 800, color: 'red', text });
  });
}
