// F-15-07 — Drive-based error log (fire-and-forget)

const ERROR_LOG_PATH           = '_shared/error-log';
const ERROR_LOG_MAX_PER_SESSION = 50;

let _driveApi     = null;
let _getUser      = null;
let _getVersion   = null;
let _sessionCount = 0;
const _rootFolderId = null;

// Session ETag cache: month-key → {fileId, etag}
const _cache = new Map();

export function initErrorLog(driveApi, getCurrentUser, getAppVersion) {
  _driveApi   = driveApi;
  _getUser    = getCurrentUser;
  _getVersion = getAppVersion;

  window.onerror = (msg, src, line, col, err) => {
    _capture('js_error', String(msg), err?.stack || `${src}:${line}:${col}`);
    return false; // don't suppress default browser handling
  };

  window.onunhandledrejection = (e) => {
    const reason = e.reason;
    const msg    = reason instanceof Error ? reason.message : String(reason);
    _capture('unhandled_rejection', msg, reason instanceof Error ? reason.stack : '');
  };

  window.addEventListener('vdg:sync-error', (e) => {
    const detail = e.detail || {};
    _capture('sync_error', `${detail.kind} ${detail.id}`, JSON.stringify(detail));
  });
}

// ── private ────────────────────────────────────────────────────────────────────

function _capture(kind, msg, stack) {
  if (!_driveApi) return;
  if (_sessionCount >= ERROR_LOG_MAX_PER_SESSION) return;
  _sessionCount++;
  _appendAsync(kind, msg, stack).catch((err) => {
    console.error('[error-log] append failed:', err); // DEV
  });
}

async function _appendAsync(kind, msg, stack) {
  const now     = new Date();
  const month   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const user    = _getUser?.() || {};

  const id = `ERR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record = {
    id,
    ts:          now.toISOString(),
    kind,
    msg:         String(msg).slice(0, 500),
    stack:       String(stack || '').slice(0, 2000),
    ua:          navigator.userAgent,
    app_version: _getVersion?.() || 'unknown',
    user_email:  user.email || 'unknown',
    url:         location.href,
    build_hash:  document.documentElement.dataset.buildHash || '',
  };

  const repo = window.__vdg_repo;
  if (repo) {
    await repo.put('error_log', id, record);
  }
}
