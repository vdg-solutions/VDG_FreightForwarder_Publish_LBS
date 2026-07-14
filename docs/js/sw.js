// Service Worker — cache-first static, SWR Drive metadata, update notification

const STATIC_CACHE     = 'vdg-static-v9552dcb';
const DRIVE_META_CACHE = 'vdg-drive-meta-v1';
const DRIVE_META_TTL_MS = 30_000;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/router.js',
  '/js/wasm-loader.js',
  '/js/auth/auth-gate.js',
  '/js/auth/drive-api.js',
  '/js/auth/google-oauth.js',
  '/js/cache/idb-cache.js',
  '/js/cache/memory-lru-cache.js',
  '/js/sync/delta-poll.js',
  '/js/sync/outbox.js',
  '/js/sync/audit-log.js',
  '/js/abstractions/entity-repo.js',
  '/js/abstractions/drive-rbac.js',
  '/js/implementations/drive-entity-repo.js',
  '/js/implementations/mock-drive-backend.js',
  '/js/implementations/local-storage-entity-repo.js',
  '/js/components/topbar.js',
  '/js/components/sidebar.js',
  '/js/components/offline-banner.js',
  '/css/styles.css',
  '/pkg/vdg_freight.js',
  '/pkg/vdg_freight_bg.wasm',
];

const DRIVE_META_HOST  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_CONTENT_RE = /\/drive\/v3\/files\/[^?]+\?alt=media/;
const AUTH_RE          = /\/(oauth2|token)/;
// Lazy view modules — URL path is stable across builds but content hash changes,
// so cache-first serves stale chunks after a rebuild and breaks ESM resolution.
// Network-first for these: fetch fresh, fall back to cache only when offline.
const VIEW_MODULE_RE   = /\/js\/(views|components|operators|implementations|abstractions|util|sync|cache)\//;
const VIEW_NETWORK_TIMEOUT_MS = 3500;

// ── install ───────────────────────────────────────────────────────────────────

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
  // Auto-activate a freshly-deployed build. The client reloads once on controllerchange
  // (guarded, only when a controller already existed) so users get updates without a
  // manual cache clear. The SKIP_WAITING message path below is kept as a belt-and-suspenders.
  self.skipWaiting();
});

// ── activate ──────────────────────────────────────────────────────────────────

let _updateNotified = false;

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then(async (keys) => {
      const validCaches = [STATIC_CACHE, DRIVE_META_CACHE];
      await Promise.all(
        keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k))
      );
      await self.clients.claim();

      if (!_updateNotified) {
        _updateNotified = true;
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((c) => c.postMessage({ type: 'VDG_SW_UPDATE_AVAILABLE' }));
      }
    })
  );
});

// ── fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (ev) => {
  const { request } = ev;
  const url = request.url;

  // Pass through: auth tokens
  if (AUTH_RE.test(url)) return;

  // Pass through: Drive file content (IDB is content cache)
  if (DRIVE_CONTENT_RE.test(url)) return;

  // Stale-while-revalidate: Drive metadata
  if (url.startsWith(DRIVE_META_HOST)) {
    ev.respondWith(_swr(request));
    return;
  }

  // Network-first: lazy view modules (cache-first would serve stale across rebuilds → ESM
  // import resolves to module referencing chunks with mismatched build hash → stuck view)
  if (request.method === 'GET' && VIEW_MODULE_RE.test(url)) {
    ev.respondWith(_networkFirst(request));
    return;
  }

  // Cache-first: static shell
  if (request.method === 'GET') {
    ev.respondWith(_cacheFirst(request));
    return;
  }
});

async function _cacheFirst(request) {
  const cache  = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const network = await fetch(request).catch(() => null);
  if (network?.ok) cache.put(request, network.clone());
  return network || new Response('Offline', { status: 503 });
}

async function _networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VIEW_NETWORK_TIMEOUT_MS);
    const network = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (network?.ok) cache.put(request, network.clone());
    return network;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}

async function _swr(request) {
  const cache   = await caches.open(DRIVE_META_CACHE);
  const cached  = await cache.match(request);
  const now     = Date.now();

  if (cached) {
    const dateHeader = cached.headers.get('Date');
    const cacheAge   = dateHeader ? now - new Date(dateHeader).getTime() : Infinity;
    if (cacheAge < DRIVE_META_TTL_MS) {
      _revalidateInBackground(cache, request);
      return cached;
    }
    // Stale: revalidate and return stale while waiting
    _revalidateInBackground(cache, request);
    return cached;
  }

  // No cache — fetch network
  const response = await fetch(request).catch(() => null);
  if (response?.ok) cache.put(request, response.clone());
  return response || new Response('Offline', { status: 503 });
}

function _revalidateInBackground(cache, request) {
  fetch(request)
    .then((res) => { if (res?.ok) cache.put(request, res); })
    .catch(() => { /* network error during background revalidation — ignore */ });
}

// ── messages ──────────────────────────────────────────────────────────────────

self.addEventListener('message', async (ev) => {
  if (ev.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (ev.data?.type === 'VDG_BUST_VIEW_CACHE') {
    const cache = await caches.open(STATIC_CACHE);
    const keys = await cache.keys();
    await Promise.all(
      keys.filter((r) => VIEW_MODULE_RE.test(r.url)).map((r) => cache.delete(r))
    );
  }
});
