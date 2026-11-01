/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';

// Content-Security-Policy: only this origin, plus the two network paths documented
// below (city geocoding, ipwho.is location fallback). Fonts allow data: (one inline
// face ships in the CSS). Build only — Vite dev injects CSS as inline <style> tags.
const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'", "font-src 'self' data:", "img-src 'self'",
  "connect-src 'self' https://geocoding-api.open-meteo.com https://ipwho.is",
  "manifest-src 'self'", "worker-src 'self'", "base-uri 'self'", "form-action 'none'", "object-src 'none'",
].join('; ');
const csp = (): Plugin => ({
  name: 'csp-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace(/<meta charset="UTF-8" \/>/, `$&\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// starnav — the SPACE axis of codereimagine. Local-first, $0, PWA, gh-pages →
// codereimagine/starnav. Network: user-initiated geocoding, plus the location
// fallback (ipwho.is, only when location is ON and GPS failed — src/engine/geo.ts).
//   base: './' (relative) so it works at the /starnav/ subpath.
//   preview port 4280 (uptyme=4275, bewthr=4173 — each PWA its own port).
//   allowedHosts: trycloudflare quick tunnels for on-device review.
export default defineConfig({
  base: './',
  server: { allowedHosts: ['.trycloudflare.com'] },
  preview: { port: 4280, strictPort: true, allowedHosts: ['.trycloudflare.com'] },
  plugins: [
    csp(),
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
