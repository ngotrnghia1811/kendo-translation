/*
 * Service worker of the offline copy (unit VW131, Q-A 3:134.3 rows 2 to 6).
 * The page registers it only when an approved reader, translator, or admin saves a book (lib/offline-copy-client.ts). The last removed copy unregisters it.
 * It keeps no general offline site. It answers from the caches only these requests:
 *   a page load of /read/<book>, /read, /search, or /dictionary   network first. With no network and a saved copy: the shell page /read/offline-copy.
 *   GET /api/read/image/<book>/<page>                            the saved image of a saved book, else the network.
 *   GET /api/read/page?ids=...                                   network first. With no network: the saved text of the pages.
 *   GET /_next/static/...                                        network first. With no network: the saved screen files. A file that a reader
 *                                                                page (/read...) loads online goes into the screen cache, when that cache exists.
 * Row 6: a GET /api/read/* that answers 401 or 403 (the sign-in check failed, or the account waits) removes every copy of this device.
 * Every other request goes to the network as if no service worker were there. The names below are the names of lib/offline-copy.ts.
 */
const PREFIX = "kendo-offline-";
const SHELL_CACHE = "kendo-offline-shell-v1";
const SHELL_PATH = "/read/offline-copy";
const bookCache = (slug) => "kendo-offline-book-" + slug + "-v1";
const dataKey = (slug) => SHELL_PATH + "/data/" + slug;
const pageKey = (id) => "/api/read/page?ids=" + encodeURIComponent(id);

function routeOf(pathname) {
  const m = /^\/read\/([a-z0-9_]+)\/?$/.exec(pathname);
  if (m) return { kind: "book", slug: m[1] };
  if (pathname === "/read" || pathname === "/read/" || pathname === "/search" || pathname === "/dictionary") return { kind: "list" };
  return null;
}

async function hasCopy(slug) {
  if (!(await caches.has(bookCache(slug)))) return false;
  return Boolean(await (await caches.open(bookCache(slug))).match(dataKey(slug)));
}

async function anyCopy() {
  for (const name of await caches.keys()) {
    const m = /^kendo-offline-book-([a-z0-9_]+)-v1$/.exec(name);
    if (m && (await hasCopy(m[1]))) return true;
  }
  return false;
}

async function clearAll() {
  for (const name of await caches.keys()) if (name.startsWith(PREFIX)) await caches.delete(name);
}

async function watched(response) {
  if (response.status === 401 || response.status === 403) await clearAll();
  return response;
}

async function pageLoad(request, route) {
  try {
    return await fetch(request);
  } catch (err) {
    const ok = route.kind === "book" ? await hasCopy(route.slug) : await anyCopy();
    const shell = ok && (await caches.has(SHELL_CACHE)) ? await (await caches.open(SHELL_CACHE)).match(SHELL_PATH) : undefined;
    if (shell) return shell;
    throw err;
  }
}

async function pageImage(request, url, slug) {
  if (await caches.has(bookCache(slug))) {
    const hit = await (await caches.open(bookCache(slug))).match(url.pathname);
    if (hit) return hit;
  }
  return watched(await fetch(request));
}

async function pageText(request, url) {
  try {
    return await watched(await fetch(request));
  } catch (err) {
    const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean);
    const slug = (ids[0] || "").split("/")[0];
    if (!/^[a-z0-9_]+$/.test(slug) || !(await caches.has(bookCache(slug)))) throw err;
    const cache = await caches.open(bookCache(slug));
    const pages = [];
    for (const id of ids) {
      const hit = await cache.match(pageKey(id));
      if (hit) pages.push(...(await hit.json()).pages);
    }
    if (pages.length === 0) throw err;
    return new Response(JSON.stringify({ pages }), { headers: { "Content-Type": "application/json" } });
  }
}

async function screenFile(event) {
  const request = event.request;
  try {
    const response = await fetch(request);
    if (response.ok && (await caches.has(SHELL_CACHE))) {
      const client = event.clientId ? await self.clients.get(event.clientId) : null;
      if (client && new URL(client.url).pathname.startsWith("/read")) await (await caches.open(SHELL_CACHE)).put(request, response.clone());
    }
    return response;
  } catch (err) {
    const hit = (await caches.has(SHELL_CACHE)) ? await (await caches.open(SHELL_CACHE)).match(request) : undefined;
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    const route = routeOf(url.pathname);
    if (route) event.respondWith(pageLoad(request, route));
    return;
  }
  const image = /^\/api\/read\/image\/([a-z0-9_]+)\/p\d{3,4}$/.exec(url.pathname);
  if (image) return event.respondWith(pageImage(request, url, image[1]));
  if (url.pathname === "/api/read/page") return event.respondWith(pageText(request, url));
  if (url.pathname.startsWith("/api/read/")) return event.respondWith(fetch(request).then(watched));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(screenFile(event));
});
