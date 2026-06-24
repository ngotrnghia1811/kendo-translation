/**
 * Kendo Translation — Service Worker (Phase 5.1)
 *
 * Caching strategy:
 *   /_next/static/*            cache-first       (immutable build assets)
 *   /documents/* /read         stale-while-reval (offline reader, last 5 LRU)
 *   /api/*                     network-only      (never cache auth/API)
 *   /* (HTML navigations)      network-first     (fresh auth state)
 *   /manifest.json, icons      precache          (app shell)
 *
 * LRU eviction: maintains last 5 opened article URLs; evicts older entries
 * from CACHE_ARTICLES on activate and after each new article cache write.
 *
 * Dev-mode guard: when hostname is localhost or 127.0.0.1, all caching is
 * skipped except precache — the dev server (Turbopack HMR, RSC) passes
 * through untouched.
 */

const CACHE_STATIC = 'kendo-static-v1';
const CACHE_ARTICLES = 'kendo-articles-v1';
const MAX_ARTICLES = 5;
const LRU_KEY = '/__pwa-lru__';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Helpers ──────────────────────────────────────────────────────────────

function isDev() {
  const host = self.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
}

function isReaderPage(pathname) {
  return /^\/documents\/[^/]+\/read/.test(pathname);
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/');
}

function isApiRoute(pathname) {
  return pathname.startsWith('/api/') || pathname.includes('/auth/');
}

// ── LRU management (stored in Cache Storage as JSON blob) ────────────────

async function getLRUArticles() {
  try {
    const cache = await caches.open(CACHE_ARTICLES);
    const resp = await cache.match(LRU_KEY);
    if (!resp) return [];
    const data = await resp.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

async function setLRUArticles(articles) {
  const cache = await caches.open(CACHE_ARTICLES);
  const body = JSON.stringify({ articles });
  const resp = new Response(body, {
    headers: { 'Content-Type': 'application/json' },
  });
  await cache.put(LRU_KEY, resp);
}

async function touchArticle(url) {
  let articles = await getLRUArticles();
  articles = articles.filter((a) => a.url !== url);
  articles.unshift({ url, lastAccess: Date.now() });
  articles = articles.slice(0, MAX_ARTICLES);
  await setLRUArticles(articles);
  return articles;
}

async function evictExcessArticles() {
  const articles = await getLRUArticles();
  const cache = await caches.open(CACHE_ARTICLES);
  const keys = await cache.keys();
  const keepUrls = new Set(articles.map((a) => a.url));
  keepUrls.add(self.location.origin + LRU_KEY);

  for (const req of keys) {
    if (!keepUrls.has(req.url)) {
      await cache.delete(req);
    }
  }
}

// ── Install — precache app shell ─────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] App-shell precache partial:', err.message);
      });
    }).then(() => {
      if (!isDev()) self.skipWaiting();
    })
  );
});

// ── Activate — clean old caches, evict LRU overflow, claim clients ───────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (!isDev()) {
        // Clean unknown cache versions
        const keys = await caches.keys();
        for (const key of keys) {
          if (key !== CACHE_STATIC && key !== CACHE_ARTICLES) {
            await caches.delete(key);
          }
        }
        await evictExcessArticles();
      }
      await self.clients.claim();
    })()
  );
});

// ── Fetch — routing with strategy per path pattern ────────────────────────

self.addEventListener('fetch', (event) => {
  // Never handle non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only intercept same-origin requests
  if (url.origin !== self.location.origin) return;

  // ── API routes: never cache ──────────────────────────────────────────
  if (isApiRoute(url.pathname)) return;

  // ── Dev-mode guard: skip caching for Next.js dev-server internals
  //    (Turbopack HMR, RSC data requests, WebSocket) so the dev server
  //    works correctly. Reader page and static asset caching remain
  //    active on localhost so PWA tests can verify offline behaviour. ───
  if (isDev()) {
    if (
      url.pathname.startsWith('/_next/') ||
      url.searchParams.has('_rsc') ||
      event.request.headers.get('accept')?.includes('text/x-component')
    ) {
      return;
    }
  }

  // ── Static assets: cache-first (immutable, content-hashed) ───────────
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Reader pages: stale-while-revalidate (offline capable) ───────────
  if (isReaderPage(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ARTICLES);
        const cached = await cache.match(event.request);

        const networkFetch = fetch(event.request)
          .then(async (response) => {
            if (response.ok && response.status < 500) {
              const clone = response.clone();
              await cache.put(event.request, clone);
              await touchArticle(event.request.url);
              if (isDev()) {} else { await evictExcessArticles(); }
            }
            return response;
          })
          .catch(() => cached);

        // Return cached immediately if available, or wait for network
        if (cached) {
          // Fire network update in background (don't block response)
          networkFetch.catch(() => {});
          return cached;
        }
        return networkFetch;
      })()
    );
    return;
  }

  // ── HTML navigations: network-first, cache fallback ──────────────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // ── Default (images, fonts, etc.): network-first, cache fallback ─────
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Message handler — allow main thread to query offline status ──────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_OFFLINE_ARTICLES') {
    event.waitUntil(
      getLRUArticles().then((articles) => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ articles });
        }
      })
    );
  }
});
