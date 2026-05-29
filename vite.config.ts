/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// starnav — the SPACE axis of codereimagine. Local-first, $0, zero runtime
// network (geolocation is an on-device sensor; only user-initiated geocoding
// hits the net), PWA, gh-pages → codereimagine/starnav.
//   base: './' (relative) so it works at the /starnav/ subpath.
//   preview port 4280 (uptyme=4275, bewthr=4173 — each PWA its own port).
//   allowedHosts: trycloudflare quick tunnels for on-device review.
export default defineConfig({
  base: './',
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { port: 4280, strictPort: true, allowedHosts: ['.trycloudflare.com'] },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' = the new SW installs but waits for the user to confirm via the
      // in-app UpdateBanner + Settings "Check for updates". Same as uptyme/bewthr.
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
      manifest: {
        name: 'starnav — space axis of codereimagine',
        short_name: 'starnav',
        description: 'Local-first night-sky navigator',
        theme_color: '#04060F',
        background_color: '#04060F',
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
  build: { modulePreload: { polyfill: false } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
