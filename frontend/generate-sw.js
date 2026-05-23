// generate-sw.js
// Executado após "expo export -p web" para gerar o service-worker.js na pasta dist/
// Uso: node generate-sw.js

const { generateSW } = require('workbox-build');

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

generateSW({
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,json,woff,woff2,ttf}'],
  swDest: 'dist/service-worker.js',

  runtimeCaching: [
    {
      // Cache das chamadas à API — tenta rede primeiro, cai no cache se offline
      urlPattern: ({ url }) => url.href.startsWith(API_URL),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 86400, // 1 dia
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // Cache de imagens — serve do cache, mais rápido
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 604800, // 7 dias
        },
      },
    },
    {
      // Cache de fontes
      urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'font-cache',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 2592000, // 30 dias
        },
      },
    },
    {
      // JS e CSS — serve cache e atualiza em segundo plano
      urlPattern: /\.(?:js|css)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-cache',
      },
    },
  ],

  skipWaiting: true,   // Ativa novo SW imediatamente
  clientsClaim: true,  // Controla todas as abas abertas
  cleanupOutdatedCaches: true,

}).then(({ count, size }) => {
  console.log(`✅ Service Worker gerado com ${count} arquivos em cache (${(size / 1024).toFixed(1)} KB)`);
}).catch(err => {
  console.error('❌ Erro ao gerar Service Worker:', err);
  process.exit(1);
});
