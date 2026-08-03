import type { CommunityWebAppDefinition } from "../model/types";

/**
 * PWA assets.
 *
 * The descriptor claimed `offlineShell: true` long before anything backed it:
 * no manifest, no service worker, no registration. ADR-0001 puts offline-first
 * among the project principles, and the document is already a single
 * self-contained HTML file, so the honest options were to ship a small shell
 * cache or drop the claim. This ships it.
 */

export function renderWebManifest(app: CommunityWebAppDefinition): string {
  const manifest = {
    name: app.pwa.name,
    short_name: app.pwa.shortName,
    start_url: app.pwa.startUrl,
    scope: app.pwa.startUrl,
    display: app.pwa.display,
    theme_color: app.pwa.themeColor,
    background_color: app.pwa.backgroundColor,
    description:
      "Signed civic workshop for channel-first repository collaboration.",
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Cache-first for the shell so a reopened tab still renders the last known
 * community; network-first for the Community API so live data is never served
 * stale without saying so. The page's own honesty banner already distinguishes
 * live from snapshot, so a cached shell cannot masquerade as live data.
 */
export function renderServiceWorker(app: CommunityWebAppDefinition): string {
  const shellUrl = app.pwa.startUrl;
  return `const SHELL_CACHE = "epoch-community-shell-v1";
const SHELL_URL = ${JSON.stringify(shellUrl)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.add(SHELL_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: serve the cached shell when the network is unavailable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(SHELL_URL).then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Everything else stays network-first: a cached API response must never be
  // presented as live community state.
  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached ?? Response.error())));
});
`;
}

/** Inlined registration; guarded so unsupported browsers simply skip it. */
export function renderServiceWorkerRegistration(app: CommunityWebAppDefinition): string {
  const scope = app.pwa.startUrl.endsWith("/") ? app.pwa.startUrl : `${app.pwa.startUrl}/`;
  return `if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register(${JSON.stringify(`${scope}sw.js`)}, { scope: ${JSON.stringify(scope)} }).catch(() => undefined);
      });
    }`;
}
