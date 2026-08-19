// F-49-01 — restore a callable window.open before every GIS token request.
// An ad-blocker (AdGuard) assigns window.open = null on the page; Google GIS
// initTokenClient().requestAccessToken() calls window.open() internally and throws
// "d.open is not a function" synchronously on every refresh — so the reconnect chip is
// permanent and unrecoverable. A fresh same-origin hidden iframe's contentWindow.open is
// the native, un-clobbered function (CDP-proven, reconnect-live-diagnosis.md); copy it
// back onto window.open so the existing popup refresh works despite the extension.

// #21 — the same defect has a second shape. A wallet/blocker extension (TronLink et al.)
// REPLACES window.open with its own wrapper instead of nulling it: typeof is still 'function',
// so the old guard passed it straight through. GIS then holds a handle that is not the real
// popup, polls it forever ("Cross-Origin-Opener-Policy would block the window.closed call"),
// and fires NEITHER callback — the login screen hangs with no error (QC 2026-08-09). Only a
// native open (or our own bound-native one) is trusted.

const BLANK_SRC = 'about:blank';
const NATIVE_FN_MARKER = '[native code]';

function defaultIframeFactory() {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = BLANK_SRC;
  document.body.appendChild(iframe);
  return iframe;
}

// A bound native function still reports [native code], so our own restore is trusted on the
// next call and the iframe is only built once. A proxy that throws on toString is patched.
function isNativeOpen(fn) {
  if (typeof fn !== 'function') return false;
  try {
    return Function.prototype.toString.call(fn).includes(NATIVE_FN_MARKER);
  } catch {
    return false; // exotic wrapper — treat as patched and prefer the iframe's own open
  }
}

// Ensure win.open is the native one. Returns true if it already was, or was restored from a
// native iframe; false only when there is no callable open at all (the caller then surfaces an
// actionable popup-blocked hint instead of a dead reconnect). A patched-but-callable open that
// we failed to replace still reports true — it may be a harmless logging wrapper, and blocking
// sign-in outright would be a worse failure than letting GIS try. makeIframe is
// dependency-injected so the helper is unit-testable without a real DOM.
function ensureWindowOpen(win = window, makeIframe = defaultIframeFactory) {
  if (isNativeOpen(win.open)) return true;
  let iframe = null;
  try {
    iframe = makeIframe();
    const nativeOpen = iframe?.contentWindow?.open;
    if (typeof nativeOpen === 'function') {
      win.open = nativeOpen.bind(win); // native, un-clobbered — GIS's internal window.open() now works
      return true;
    }
  } catch {
    // No DOM / iframe creation blocked — fall through to whatever open the page still has.
  } finally {
    if (iframe && typeof iframe.remove === 'function') iframe.remove();
  }
  return typeof win.open === 'function';
}

/// What the storage bootstrap binds behind the popup-guard port.
export const popupGuard = { ensureWindowOpen, isNativeOpen };
