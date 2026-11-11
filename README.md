# Isocity

A small isometric city builder set in an autumn forest at golden hour. It runs in the browser. No dependencies, no build step. One canvas, plain HTML, CSS and JavaScript.

Live demo: https://peterachss.github.io/isocity/

## Play

- Pick a tool on the left (or press 1 to 9) and click or drag on the map.
- Forest tiles clear with Bulldoze or get built over.
- Buildings only count when they touch a road. Unconnected ones show a red marker.
- Residents need jobs. Parks raise happiness. Roads, parks and buildings cost upkeep.
- Right drag, shift drag or the Pan tool moves the map. Scroll, pinch or +/- to zoom.
- Road modes: Freehand paints immediately; Line snaps to a grid axis; Block previews a rectangular road loop. Planned roads show cost and commit on release. Escape cancels. Buildings or insufficient funds reject the entire plan.
- Move (M): select a building or park, then an empty or forest tile. Relocation is free and undoable.
- Photo mode (P): frame the city with pan/zoom, then Save PNG. The interface and warning markers are excluded; simulation pauses until you exit.
- Fast build drags fill gaps between pointer samples. Ctrl+Z undoes a whole stroke; Ctrl+Shift+Z or Ctrl+Y redoes it.
- F fits the whole city; arrow keys move the camera. Trackpad scrolling zooms proportionally and horizontal scrolling pans.
- Pause (or Space) stops traffic, income, and the automatic day cycle while you plan.
- The city saves to local storage. Hidden tabs stop rendering.
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

## Checks

Run `node --test tests/camera.test.mjs` for camera, building, undo/redo, touch, and saved-state regression checks.

MIT licensed.
