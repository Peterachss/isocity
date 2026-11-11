# Workspace City

An interactive Google Maps style isometric workspace uniting `Peterachss` GitHub repositories (North Bank) and Google & Study apps (across the bridges on the South Bank). Switch tabs between GitHub, Google & Study, and Full City, search and customize buildings or biome themes, and launch live sites or `github.dev` directly.

Live app: https://isocity-mu.vercel.app/ (GitHub Pages: https://peterachss.github.io/isocity/)

## Features

- **Two-sided 32x32 district map:** North Bank hosts GitHub repositories; three bridges cross the river to the South Bank hosting Gmail, Google Chat, SEQTA, Google Slides, Google Docs, MyBib, and Google Calendar.
- **Edition tabs and search:** Switch between `GitHub`, `Google & Study`, and `Full City`, filter by stack or category, and smoothly fly the camera onto any building.
- **Place workspace drawer:** Click any building or floating map label to open live sites, `github.dev` editor, quick shortcuts, live GitHub commits/files/worker bots, or pin custom study/doc bookmarks.
- **Customization:** Change biome themes (Autumn, Alpine, Slate, Spring), toggle traffic/bots and labels, cycle Dusk/Day/Night lighting, edit any place's name, URL, or building architecture, or add new shortcut buildings onto the map.

## Run locally

```bash
node scripts/server.mjs
```

Open http://localhost:4173. Any static file server works.

## Files

- `index.html`: map canvas, edition switcher, search dock, customize popover, and place drawer
- `city.css`: surface palette, floating controls, responsive bottom sheet, and reduced-motion rules
- `city.js`: 32x32 isometric renderer, label picking, two-district state, customization CRUD, and GitHub API client

MIT licensed.
