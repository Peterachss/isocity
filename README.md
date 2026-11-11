# Isocity

A small isometric city builder set in an autumn forest at golden hour. It runs in the browser. No dependencies, no build step. One canvas, plain HTML, CSS and JavaScript.

Live demo: https://isocity-mu.vercel.app/ (GitHub Pages: https://peterachss.github.io/isocity/)

## Play

- Pick a tool on the left (keys 1 to 9, U for Upgrade, B for Bulldoze, P for Pan) and click or drag on the map.
- Click any building to inspect it, view animated worker bots (CommitBot, DeployBot, ReviewBot) pulling live status from its linked GitHub repository, switch which repository it represents, or open its live website and GitHub repo links.
- Lay roads over water to build bridges. Homes and parks beside water earn a waterfront bonus.
- Place Parks, Town Plazas, Clinics, Schools, Windmills, and a Ferris Wheel to raise happiness, generate clean energy, and grow buildings from Level 1 to Level 3.
- Open Economy in the top bar to adjust tax rates (6%, 10%, 15%) and view service coverage and income vs upkeep.
- Press R or Q (or Rotate) to turn the camera 90 degrees, Space (or the speed toggle) to pause or run at 2x speed, and Saves for 3 local slots, JSON export/import, or a PNG snapshot.
- Forest tiles clear with Bulldoze or get built over.
- Buildings only count when they touch a road. Unconnected ones show a red marker.
- Residents need jobs. Parks raise happiness. Roads, parks and buildings cost upkeep.
- Right drag, shift drag or the Pan tool moves the map. Scroll, pinch or +/- to zoom.
- Ctrl+Z undoes. The city saves to local storage.
- The time slider and auto cycle switch between day and night. At night windows, streetlights and headlights light up.

## Run locally

```bash
node scripts/server.mjs
```

Then open http://localhost:4173. Any static file server works.

## Files

- `index.html`: layout and metadata
- `city.css`: panels, tools and responsive layout
- `city.js`: simulation, isometric renderer, input and day cycle

## Notes

Build and bulldoze animate height with an ease-out curve under 300ms and are skipped when `prefers-reduced-motion` is set.

MIT licensed.
