// Dev-only console/error overlay — paints console.error and window error/rejection events as
// on-screen divs. Relocated out of index.html (F-15-65 AC-01) so the shipped HTML carries no
// DOM-injecting handler; behavior is unchanged, still gated by isDevHost() (owner 2026-07-15,
// feedback_no_dev_overlays_in_prod).
import { isDevHost } from '../../implementations/kernel/core_abstractions/util/dev-host.js';

const GSI_LOGGER_TAG = '[GSI_LOGGER]';

export function installDevConsoleOverlay() {
  if (!isDevHost(location.hostname, location.protocol)) return;

  const oldErr = console.error;
  console.error = function(...args) {
    if (String(args[0]).includes(GSI_LOGGER_TAG)) {
      oldErr.apply(console, args);
      return;
    }
    document.body.insertAdjacentHTML('afterbegin', '<div onclick="this.remove()" style="cursor:pointer;position:fixed;top:100px;left:50px;background:orange;color:black;z-index:999999;padding:20px;font-size:18px;max-width:800px;overflow:auto;">CONSOLE ERR: ' + String(args[0]) + (args[1] && args[1].stack ? ' ' + args[1].stack : '') + '<br><small>(Click to dismiss)</small></div>');
    oldErr.apply(console, args);
  };
  window.addEventListener('error', e => {
    document.body.insertAdjacentHTML('afterbegin', '<div onclick="this.remove()" style="cursor:pointer;position:fixed;top:50px;left:50px;background:red;color:white;z-index:999999;padding:20px;font-size:24px;">' + e.message + '<br><small>(Click to dismiss)</small></div>');
  });
  window.addEventListener('unhandledrejection', e => {
    document.body.insertAdjacentHTML('afterbegin', '<div onclick="this.remove()" style="cursor:pointer;position:fixed;top:50px;left:50px;background:red;color:white;z-index:999999;padding:20px;font-size:24px;max-width:800px;overflow:auto;">' + (e.reason && e.reason.stack || e.reason) + '<br><small>(Click to dismiss)</small></div>');
  });
}
