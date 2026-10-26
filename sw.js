/* Offline support: precache the app shell, then serve cache-first and refresh in the background. */
const VERSION = 'wiggles-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './assets/icon.svg',
  './assets/mr-wiggles-reference.jpg',
  './assets/fonts/Grandstander-variable.woff2',
  './assets/fonts/AtkinsonHyperlegible-400.woff2',
  './assets/fonts/AtkinsonHyperlegible-700.woff2',
  './js/main.js',
  './js/core/camera.js',
  './js/core/difficulty.js',
  './js/core/geometry.js',
  './js/core/nav.js',
  './js/core/projection.js',
  './js/core/rng.js',
  './js/core/storage.js',
  './js/core/mode.js',
  './js/game/agents.js',
  './js/game/draw-person.js',
  './js/game/figure/core.js',
  './js/game/figure/head.js',
  './js/game/figure/clothes.js',
  './js/game/figure/items.js',
  './js/game/sprite-cache.js',
  './js/game/game.js',
  './js/game/input.js',
  './js/game/people.js',
  './js/game/renderer.js',
  './js/game/world.js',
  './js/game/classic.js',
  './js/scenes/index.js',
  './js/scenes/kit.js',
  './js/scenes/builders.js',
  './js/scenes/draw3d.js',
  './js/scenes/props.js',
  './js/scenes/transport.js',
  './js/scenes/train-station.js',
  './js/scenes/airport.js',
  './js/scenes/venue-props.js',
  './js/scenes/galleria.js',
  './js/scenes/market.js',
  './js/scenes/fairground.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
