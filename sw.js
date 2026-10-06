// Service worker - Nexos B2B Management
// Sube el número de versión cada vez que publiques cambios para forzar la actualización.
const VERSION = 'nexos-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;
  const url = new URL(req.url);

  // Páginas: red primero, y si no hay conexión, la versión guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { caches.open(VERSION).then((c) => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Archivos propios y librerías de CDN (Tailwind, PapaParse, SMTP.js): rápido desde caché y se actualiza de fondo
  const cdn = /(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com|smtpjs\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (url.origin === location.origin || cdn) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then((c) => c.put(req, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
  // Todo lo demás (envío SMTP, APIs, WhatsApp) pasa directo a la red sin tocarlo
});
