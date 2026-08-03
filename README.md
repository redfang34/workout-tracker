# 6-Week Strength — workout tracker

Set-by-set tracker for a 6-week, 3-phase strength program (4 training days per
two-week phase, circuit-based with auto rest timers and drop-set support).

**Live app:** https://redfang34.github.io/workout-tracker/

## Install on your phone

- **Android (Chrome):** open the link → ⋮ menu → **Add to Home screen** (or tap the install prompt).
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**.

Works offline after the first load (service worker). All workout data is stored
on the device in `localStorage` — use the **Export** button on the home screen
for a JSON backup, **Import** to restore.

## Develop

```
npm install
npm run build   # bundles src/ into docs/index.html (single file) + artifact/ variant
```

- `src/program.js` — the entire program definition (phases, days, circuits, targets)
- `src/app.jsx` — UI: home grid, live workout logging, rest timer, history
- `docs/` — build output, served by GitHub Pages
- `tools/gen_icons.py` — regenerates the PWA icons (Pillow)

Built with React 18 + esbuild; ships as one self-contained HTML file.
