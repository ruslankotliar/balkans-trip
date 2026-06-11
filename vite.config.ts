import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Project Pages site lives at https://<user>.github.io/balkans-trip/, so every
// asset, the service worker, and the manifest must resolve under this subpath.
// (OSM tiles + OSRM are absolute https:// URLs, unaffected by the base.)
const BASE = '/balkans-trip/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // new deploy → SW updates silently next load
      // Keep the SW + manifest scoped under the subpath (default would be '/').
      scope: BASE,
      base: BASE,
      manifest: {
        name: 'Balkans Trip — Jun 16–28',
        short_name: 'Balkans',
        theme_color: '#8e44ad',
        background_color: '#ffffff',
        display: 'standalone', // "Add to Home Screen" → opens like an app
        // Relative to the manifest (which itself lives under BASE) → resolves to
        // /balkans-trip/. id pins the app identity to the subpath.
        id: BASE,
        start_url: '.',
        scope: BASE,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Navigation requests fall back to the app shell under the subpath so a
        // hard refresh / offline open at any in-app URL still loads index.html.
        navigateFallback: `${BASE}index.html`,
        // App shell: every built JS/CSS/HTML asset is precached → app opens with
        // zero signal. The places JSON is compiled INTO the JS bundle
        // (import.meta.glob eager), so it is precached automatically.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The main bundle is ~650 KB and will grow with data; keep headroom.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // OSM raster tiles: cache-first, cache ONLY what the user actually
            // views (bulk prefetch is against the OSM tile policy).
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*\.png$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }, // 0 = opaque cross-origin
            },
          },
          {
            // OSRM responses: network-first so fresh edits win, fall back to
            // cache offline (the app also persists routes in localStorage).
            urlPattern: /^https:\/\/router\.project-osrm\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'osrm', expiration: { maxEntries: 200 } },
          },
        ],
      },
    }),
  ],
});
