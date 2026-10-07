const VERSION = "sou-eletricista-offline-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const PUBLIC_API_PREFIXES = [
  "/api/trpc/public.courses",
  "/api/trpc/public.pricing",
  "/api/trpc/public.content",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.add("/")));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith("sou-eletricista-") && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function isPublicApi(url) {
  return PUBLIC_API_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
}

async function networkFirst(request, fallbackRequest = request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || caches.match(fallbackRequest);
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (isPublicApi(url)) {
    // Public catalogue data may be reused offline; authenticated/student APIs are never cached.
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/manus-storage/")) {
    event.respondWith(caches.open(RUNTIME_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response("", { status: 503, statusText: "Offline" });
      }
    }));
  }
});
