// Имя кэша. Меняйте при обновлении приложения, чтобы сбросить старый кэш.
const CACHE_NAME = 'sklad-cache-v1';

// Список файлов для кэширования (обязательные ресурсы)
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo.svg'
  // Если у вас есть другие локальные файлы (шрифты, изображения), добавьте их сюда
];

// Установка: кэшируем все перечисленные файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование ресурсов...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting()) // Активируем SW сразу
  );
});

// Активация: удаляем старые кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Берём контроль над страницей
  );
});

// Обработка запросов: стратегия "сначала кэш, потом сеть"
self.addEventListener('fetch', event => {
  // Пропускаем запросы, которые не являются GET (например, POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Если есть в кэше — возвращаем оттуда
        if (cachedResponse) {
          return cachedResponse;
        }

        // Иначе идём в сеть
        return fetch(event.request)
          .then(networkResponse => {
            // Если ответ успешный, кэшируем его копию
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Если сеть недоступна и нет в кэше — ничего не делаем
            console.log('Офлайн: ресурс недоступен и не закэширован', event.request.url);
          });
      })
  );
});