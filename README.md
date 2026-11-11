# Workspace City

Interactive isometric workspace city combining `Peterachss` GitHub repositories (North Bank) with Google, study, and productivity tools (South Bank across the bridges), plus live city simulation and offline PWA support.

Live app: https://isocity-mu.vercel.app/ (GitHub Pages: https://peterachss.github.io/isocity/)

## Features

- **Time and weather:** Smooth day/night cycle even when simulation is paused, real-time clock option, weekday and date display, moving moon and stars, dynamic lengthening shadows, morning fog, staggered building window lights, dusk streetlamps, and Open-Meteo local weather sync.
- **Traffic, citizens, and bots:** Intersection traffic lights that stop and queue cars, buses with stops, bicycles, pedestrian crossings, clickable vehicle route lines, zoom-in citizen name/role labels, scheduled movement, task progress bars on bots, delivery drones, dogs, birds, and zoom-scaled ambient audio.
- **Buildings and sharp camera:** 2x supersampled map plus vector high-zoom rendering (zero blur), click-to-orbit, double-click zoom, cutaway interior view, rooftop solar/gardens/flags/scaffolding/cranes, minimap, camera presets (`Overview`, `Street`, `Orbit`), photo mode, and PNG / transparent PNG / timelapse capture.
- **GitHub integration:** Bottom live commit ticker, ground contribution heatmap, issues/PR badges, language breakdown bar, commit cadence sparkline, branch switcher, README preview, side-by-side repo compare, and search across repos, commits, and issues.
- **Google and study:** Gmail, Google Chat, SEQTA (with editable 5-day timetable), Google Slides, Google Docs, MyBib, Google Calendar, Pomodoro Studio (with streak counter), Quick Notes scratchpad, per-app remembered Google account index (`u/0`..`u/2`), homework deadline map flags, and School mode filter.
- **Simulation, themes, and PWA:** Economy budget, citizen needs, 1x/2x/5x speeds + Step, disasters + truck dispatch, achievements, bot leaderboard, 7 map themes (`Autumn`, `Alpine`, `Slate`, `Sakura`, `Neon`, `Desert`, `Snow`), Dark UI, color-blind palette, larger text, Ghost Town archive, 3 city save slots, shareable URL hash, and installable offline PWA (`manifest.webmanifest` + `sw.js`).

## Run locally

```bash
node scripts/server.mjs
```

Open http://localhost:4173. MIT licensed.
