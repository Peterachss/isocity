# Isocity

A small isometric city builder set in an autumn forest at golden hour. It runs in the browser. No dependencies, no build step. One canvas, plain HTML, CSS and JavaScript.

Live demo: https://peterachss.github.io/isocity/

## Play

- Pick a tool on the left (keys 1 to 9, U for Upgrade, B for Bulldoze, P for Pan) and click or drag on the map.
- Lay roads over water to build bridges. Homes and parks beside water earn a waterfront bonus.
- Place Parks, Town Plazas, Clinics, Schools, and a Ferris Wheel to raise happiness and help nearby buildings upgrade from Level 1 to Level 3.
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


## GitHub workspace

Workspace is the default mode. Click a building or use the department dock:

- Houses / Headquarters: pinned repositories and personal shortcuts.
- Offices / Engineering: public repositories, with Code, Issues, PRs, and Actions links.
- Schools and apartments / Research: starred projects.
- Clinics / Operations: assigned issues, review requests, pull requests, and notifications.
- Shops / Launch: websites listed on repositories, plus deployment shortcuts you add.
- Plazas, parks, and Ferris wheels / Workshop: Codespaces, Projects, Gists, documentation, and custom tools.

The directory supports search, language filters, sorting, and pins. `/` opens search; Escape closes the panel. Change the GitHub username to load another public catalog. Use Build city to return to the simulation controls.

Public repositories and stars load from GitHub's REST API, following every pagination page. Only 40 result rows are rendered at a time. Refresh reloads the catalog; successful public data is cached locally for 15 minutes. Requests never run inside the drawing loop. API limits, unavailable accounts, and offline failures appear in the directory while direct links stay available.

Private repositories are accessed using the GitHub profile/dashboard links and your GitHub browser session. The static site does not request or store access tokens. You can add a private repository URL as a personal shortcut; shortcuts and pins stay in local storage for this browser and account, not in this public repository. No GitHub content is changed by the workspace.

Run `node --test tests/workspace.test.cjs` for catalog, pagination, filtering, and URL validation checks.
