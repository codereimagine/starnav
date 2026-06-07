# starnav

A night-sky navigator. The **space** axis of codereimagine.

Live: [codereimagine.github.io/starnav](https://codereimagine.github.io/starnav/)

By **Bert Peters**.

## Screenshots

<table>
  <tr>
    <th>Mobile</th>
    <th>Desktop</th>
  </tr>
  <tr>
    <td><img src="docs/screenshots/starnav-mobile.png" alt="starnav — mobile" width="280"></td>
    <td><img src="docs/screenshots/starnav-desktop.png" alt="starnav — desktop" width="500"></td>
  </tr>
  <tr>
    <td colspan="2"><sub>Point your device at the sky; starnav tells you what you're looking at. Sun, moon, planets, constellations — all computed in-browser.</sub></td>
  </tr>
</table>

## What it does

- **Point-me**: device-orientation aware. Aim your phone at the sky and starnav identifies what's overhead.
- **Arc-min engine**: precise positions for sun, moon, planets, and constellations from your coordinates.
- **Dual search**: find places + find objects in one bar.
- **Themed settings**: light / dark / sky-matched theme.
- **Atmospheric starfield** behind the navigator UI.
- Installable PWA; works offline once cached.
- Local-first: on-device astronomy, zero runtime network calls for sky math.

## Stack

React 19 · Vite · TypeScript · Space Grotesk · JetBrains Mono · vite-plugin-pwa.

## Develop

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc --noEmit && vite build
npm run preview   # serves the production bundle on :4280
npm run test
```

## Project layout

```
src/
  components/   # search bar, sky panel, settings, themed UI
  hooks/        # device orientation, arc-min positions
  lib/          # astronomy + geocoding
  store/        # settings, places (persisted)
public/         # PWA manifest + icons
docs/
  screenshots/  # README images
```

## Related

starnav is one of three axes of codereimagine:

- **[bewthr](https://github.com/codereimagine/bewthr)** — continuum (weather)
- **[uptyme](https://github.com/codereimagine/uptyme)** — time
- **starnav** — space

## License

Apache License 2.0 — see [LICENSE](./LICENSE).
