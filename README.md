# GitHub City

An interactive Google Maps style workspace for `Peterachss` GitHub repositories. Search projects, pan and zoom the isometric city map, click any labeled building to inspect live commits, files, CI status, and worker bots, or jump straight to the live website or `github.dev` editor.

Live app: https://isocity-mu.vercel.app/ (GitHub Pages: https://peterachss.github.io/isocity/)

## Features

- **Google Maps style search and filters:** Search repositories by name, language, or description, filter by Live web or language stack, and smoothly fly the camera directly to any pinned building.
- **Floating map pin labels:** Every repository landmark carries a clickable pill label above its roof with live/private status indicators and automatic zoom-out collision handling.
- **Workspace place card:** Click any building or label to open its live website link, `github.dev` browser editor, GitHub repository, copyable `git clone` command, live commit feed, root file list, and active bot statuses.
- **2.5D isometric city backdrop:** Plain canvas renderer with animated cars, boats, walkers, patrolling coding bots, orbiting worker bots on the selected building, and Dusk/Day/Night lighting modes.

## Run locally

```bash
node scripts/server.mjs
```

Open http://localhost:4173. Any static file server works.

## Files

- `index.html`: map container, search dock, workspace drawer, and controls
- `city.css`: surface palette, floating dock, responsive sheet, and reduced-motion rules
- `city.js`: isometric renderer, label hit-testing, camera fly-to, and live GitHub REST API client

MIT licensed.
