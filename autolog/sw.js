/* ==========================================================================
   sw.js — service worker do Autolog.

   Estratégia: rede primeiro, cache como rede de segurança.

   O contrário (cache primeiro) deixaria o app abrindo offline mais rápido,
   mas prenderia você numa versão antiga depois de cada push — que é justo o
   problema de cache descrito no CLAUDE.md. Assim, com internet você sempre vê
   a versão nova; sem internet, abre a última que funcionou.
   ========================================================================== */
'use strict';

const VERSAO = 'autolog-v4';

// Casca do app: o suficiente para abrir e funcionar sem rede.
const ESSENCIAIS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './ds/modernist.css',
  './js/util.js',
  './js/store.js',
  './js/calc.js',
  './js/gemini.js',
  './js/ui.js',
  './js/auth.js',
  './js/screens.js',
  './js/app.js',
  './icones/icone-192.png',
  './icones/icone-512.png',
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSAO)
      .then((cache) => cache.addAll(ESSENCIAIS))
      // Um arquivo faltando não pode impedir a instalação inteira.
      .catch((err) => console.warn('[sw] pré-cache incompleto:', err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fontes do Google e afins

  ev.respondWith(
    fetch(req)
      .then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(VERSAO).then((cache) => cache.put(req, copia));
        }
        return resp;
      })
      .catch(() => caches.match(req).then((achado) => achado
        || caches.match('./index.html')
        || Response.error()))
  );
});
