// BOB의 게임 파일을 저장해 오프라인 실행을 지원합니다.
const CACHE_NAME = "bob-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css?v=3",
  "./game.js?v=3",
  "./manifest.webmanifest",
  "./assets/player_icon.png",
  "./assets/game_background.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
