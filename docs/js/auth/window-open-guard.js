// F-49-01 — restore a callable window.open before every GIS token request.
// An ad-blocker (AdGuard) assigns window.open = null on the page; Google GIS
// initTokenClient().requestAccessToken() calls window.open() internally and throws
// "d.open is not a function" synchronously on every refresh — so the reconnect chip is
// permanent and unrecoverable. A fresh same-origin hidden iframe's contentWindow.open is
// the native, un-clobbered function (CDP-proven, reconnect-live-diagnosis.md); copy it
// back onto window.open so the existing popup refresh works despite the extension.

const BLANK_SRC = 'about:blank';

function defaultIframeFactory() {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = BLANK_SRC;
  document.body.appendChild(iframe);
  return iframe;
}

// Ensure win.open is callable. Returns true if it already was, or was restored from a
// native iframe; false if it could not be restored (the caller then surfaces an actionable
// popup-blocked hint instead of a dead reconnect). makeIframe is dependency-injected so the
// helper is unit-testable without a real DOM.
export function ensureWindowOpen(win = window, makeIframe = defaultIframeFactory) {
  if (typeof win.open === 'function') return true;
  let iframe = null;
  try {
    iframe = makeIframe();
    const nativeOpen = iframe?.contentWindow?.open;
    if (typeof nativeOpen !== 'function') return false;
    win.open = nativeOpen.bind(win);   // native, un-clobbered — GIS's internal window.open() now works
    return true;
  } catch {
    // No DOM / iframe creation blocked — un-restorable. Report false so the caller shows the
    // "allow the sign-in window" hint rather than silently retrying a dead refresh.
    return false;
  } finally {
    if (iframe && typeof iframe.remove === 'function') iframe.remove();
  }
}
