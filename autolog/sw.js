/* ==========================================================================
   sw.js — service worker do Autolog.

   Estratégia: rede primeiro, cache como rede de segurança.

   O contrário (cache primeiro) deixaria o app abrindo offline mais rápido,
   mas prenderia você numa versão antiga depois de cada push — que é justo o
   problema de cache descrito no CLAUDE.md. Assim, com internet você sempre vê
   a versão nova; sem internet, abre a última que funcionou.

   ATENÇÃO AO `cache: 'no-store'` ABAIXO
   "Rede primeiro" não bastava. O GitHub Pages responde com
   `Cache-Control: max-age=600`, então o `fetch()` daqui era atendido pelo
   cache HTTP do navegador — sem sair para a rede — e o app continuava
   mostrando a versão de até dez minutos atrás mesmo depois do push. Pedir
   `no-store` obriga a ida real ao servidor; o nosso cache (`caches`) segue
   guardando a cópia para quando não houver rede.
   ========================================================================== */
'use strict';

const VERSAO = 'autolog-v14';

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
  './js/dados.js',
  './js/foto.js',
  './js/avisos.js',
  './js/regiao.js',
  './js/fipe.js',
  './dados/veiculos.json',
  './dados/combustiveis.json',
  './dados/ipva.json',
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
      // `reload` para o pré-cache não nascer já velho, vindo do cache HTTP.
      .then((cache) => cache.addAll(ESSENCIAIS.map((u) => new Request(u, { cache: 'reload' }))))
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

// Tocar na notificação traz o app para a frente em vez de abrir outra aba.
self.addEventListener('notificationclick', (ev) => {
  ev.notification.close();
  ev.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
    for (const aba of abas) {
      if (aba.url.includes('/autolog/') && 'focus' in aba) return aba.focus();
    }
    return clients.openWindow ? clients.openWindow('./') : null;
  }));
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fontes do Google e afins

  ev.respondWith(
    fetch(req, { cache: 'no-store' })
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
