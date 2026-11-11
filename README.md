# Isocity

A small isometric city builder that runs in the browser. No dependencies, no build step. One canvas, plain HTML, CSS and JavaScript.

Live demo: https://peterachss.github.io/isocity/

## Play

- Pick a tool on the left (or press 1 to 8) and click or drag on the map.
- Buildings only count when they touch a road. Unconnected ones show a red marker.
- Residents need jobs. Parks raise happiness. Roads, parks and buildings cost upkeep.
- Right drag, shift drag or the Pan tool moves the map. Scroll, pinch or +/- to zoom.
- Ctrl+Z undoes. The city saves to local storage.
- The time slider and auto cycle switch between day and night. At night windows, streetlights and headlights light up.

## Run locally

```bash
node server.mjs
```

Then open http://localhost:4173. Any static file server works.

## Files

- `index.html`: layout and metadata
- `city.css`: panels, tools and responsive layout
- `city.js`: simulation, isometric renderer, input and day cycle

## Notes

Build and bulldoze animate height with an ease-out curve under 300ms and are skipped when `prefers-reduced-motion` is set.

MIT licensed.
