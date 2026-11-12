(() => {
  const D = window.ISOCITY_DATA;
  const N = 32;
  const TW = 64, TH = 32;
  const SAVE_KEY = 'isocity-workspace-v5';
  const LINKS_KEY = 'workspace-city-links-v1';
  const SLOT_PREFIX = 'workspace-city-slot-';
  const GITHUB_OWNER = D.GITHUB_OWNER;

  const TYPES = {
    road:     { name: 'Avenue',        color: '#3b3f44' },
    house:    { name: 'Villa',         color: '#d9a273', h: 22, inset: 0.2, grow: true, pop: 10 },
    apt:      { name: 'Vault Tower',   color: '#c98a8a', h: 72, inset: 0.12, grow: true, pop: 24 },
    shop:     { name: 'Studio',        color: '#e0c25b', h: 28, inset: 0.1, grow: true, jobs: 12 },
    office:   { name: 'Tower',         color: '#7fa6c9', h: 118, inset: 0.1, grow: true, jobs: 28 },
    park:     { name: 'Park',          color: '#8cbf5c' },
    plaza:    { name: 'Civic Plaza',   color: '#c4b59d' },
    clinic:   { name: 'Terrace Hub',   color: '#d95f59', h: 30, inset: 0.12, jobs: 14 },
    school:   { name: 'Research Hall', color: '#5f8c7a', h: 34, inset: 0.1, jobs: 18 },
    windmill: { name: 'Lab Mill',      color: '#7ea89b', h: 48, inset: 0.24, jobs: 8 },
    wheel:    { name: 'Wheel Studio',  color: '#d67e49', h: 78, inset: 0.12, jobs: 12 },
    forest:   { name: 'Forest',        color: '#d9a21f' },
    water:    { name: 'River',         color: '#3b7378' },
    bridge:   { name: 'Bridge',        color: '#8e8372' },
  };
  const LVL_MULT = [1, 1, 1.5, 2.2];

  const canvas = document.getElementById('stage');
  let ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const labelCanvas = document.createElement('canvas');
  const labelCtx = labelCanvas.getContext('2d');
  let labelKey = '';
  const $ = (id) => document.getElementById(id);

  const audio = new D.CityAudio();

  // Persistent state
  let themeId = 'autumn';
  let timeMode = 'auto'; // 'auto' | 'realtime' | 'paused'
  let simSpeed = 1;
  let weather = 'clear'; // 'clear' | 'rain' | 'overcast'
  let darkMode = false;
  let cbMode = false;
  let largeText = false;
  let ghostMode = false;
  let showAgents = true;
  let showLabels = true;
  let showHeatmap = true;
  let photoMode = false;
  let orbitActive = false;
  let cutawayActive = true;
  let activeFilter = 'all';
  let activeTab = 'overview';

  // Economy & Simulator
  let money = 5000;
  let dayCount = 1;
  let hour = 17.4;
  let needs = { energy: 86, mood: 91, hunger: 82 };
  let activeDisaster = null; // null | 'storm' | 'power' | 'bugs'
  let simStats = { pop: 0, jobs: 0, income: 0, upkeep: 0, net: 0, inspected: 0, pomodoros: 0, customized: 0, visitedGit: false, visitedGoogle: false };
  let simClock = 0;

  // Catalogs & remembered user links
  const REPOS = D.DEFAULT_REPOS.map((r) => ({ ...r }));
  const GOOGLE_APPS = D.DEFAULT_GOOGLE_APPS.map((a) => ({ ...a, shortcuts: (a.shortcuts || []).map((s) => ({ ...s })) }));
  const repoMap = new Map(REPOS.map((r) => [r.id, r]));
  const googleMap = new Map(GOOGLE_APPS.map((a) => [a.id, a]));
  const customItems = [];
  const overrides = {};
  const bookmarks = {};
  const accountPrefs = {};
  let globalAcct = 0;
  try { globalAcct = localStorage.getItem('isocity-acct') === '1' ? 1 : 0; } catch (e) { /* ignore */ }
  let timetable = D.DEFAULT_TIMETABLE.map((r) => ({ ...r }));
  let deadlines = [{ title: 'Maths IA draft review', due: 'Fri', place: 'seqta' }];
  let quickNoteText = 'Workspace notes:\n- Check open PRs\n- Review Maths IA charts\n- Focus sprint 25m';
  let studyStreak = 1;

  // Live GitHub cache & ticker
  const repoCache = new Map();
  const tickerQueue = [];
  let tickerIdx = 0;
  let unreadNotifs = 0;
  let recentRepoErrors = new Set();

  // Map grid & entities
  let grid, levels, pins;
  let cam = { x: 0, y: 0, z: 1 };
  let camAnim = null;
  let hover = null, hoveredLabel = null, selectedTile = null, selectedVehicle = null;
  let cars = [], walkers = [], boats = [], bots = [], drones = [], birds = [], dogs = [], confetti = [], raindrops = [];
  let wheelsList = [], millsList = [], beaconsList = [], housesList = [], buildingsList = [], waterCells = [], crossings = new Set(), busStops = [];
  let labelHits = [], vehicleHits = [];
  let perfMaxDpr = 1.5;
  let dpr = 1, W = 0, H = 0;

  // Pomodoro state
  let pomo = { running: false, secLeft: 25 * 60, mode: 'work', timer: 0 };

  const BOT_COLORS = ['#0f766e', '#0284c7', '#d97706'];
  const NB = [[1,0],[-1,0],[0,1],[0,-1]];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const isRoad = (t) => t === 'road' || t === 'bridge';
  const isWater = (t) => t === 'water' || t === 'bridge';
  const isBuilding = (t) => !!t && t !== 'road' && t !== 'bridge' && t !== 'water' && t !== 'forest';
  const makeLevels = () => Array.from({ length: N }, () => Array(N).fill(1));
  const makePins = () => Array.from({ length: N }, () => Array(N).fill(null));
  const curTheme = () => D.THEMES[themeId] || D.THEMES.autumn;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');

  function allItems() {
    return [...REPOS, ...GOOGLE_APPS, ...customItems].map((it) => ({ ...it, ...(overrides[it.id] || {}) }));
  }

  // Personal = u/0, School = u/1. Chat always uses the school account; Calendar is personal only.
  const FORCED_ACCT = { 'google-chat': 1, 'google-calendar': 0, 'toddle': 1 };
  const GOOGLE_HOSTS = /^(docs|mail|drive|chat|calendar)\.google\.com$/;
  function applyAccountToUrl(url, acct) {
    if (!url || acct === undefined) return url;
    if (/\/u\/\d+\//.test(url)) return url.replace(/\/u\/\d+\//, `/u/${acct}/`);
    try {
      const x = new URL(url);
      if (!GOOGLE_HOSTS.test(x.host)) return url;
      x.searchParams.set('authuser', acct);
      return x.toString();
    } catch (e) { return url; }
  }

  function getItem(id) {
    const base = repoMap.get(id) || googleMap.get(id) || customItems.find((c) => c.id === id) || REPOS[0];
    const merged = { ...base, ...(overrides[base.id] || {}) };
    const acctForced = FORCED_ACCT[merged.id];
    if (merged.kind === 'google' && (acctForced !== undefined || accountPrefs[merged.id] !== undefined || globalAcct !== 0)) {
      const a = acctForced !== undefined ? acctForced : (accountPrefs[merged.id] !== undefined ? accountPrefs[merged.id] : globalAcct);
      merged.web = applyAccountToUrl(merged.web, a);
      merged.alt = applyAccountToUrl(merged.alt, a);
      if (Array.isArray(merged.shortcuts)) {
        merged.shortcuts = merged.shortcuts.map((s) => ({ ...s, url: applyAccountToUrl(s.url, a) }));
      }
    }
    return merged;
  }

  let toastTimer = 0;
  function notify(msg, ms = 2600) {
    const t = $('carToast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }
  let rctx = ctx, rcam = cam;
  let worldDirty = true;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);

  // Sky stars & ambient foliage
  const leaves = Array.from({ length: 14 }, (_, i) => ({
    x: ((i * 197) % 1000) / 1000, y: ((i * 353) % 1000) / 1000,
    vx: rnd(0.008, 0.018), vy: rnd(0.012, 0.025), phase: rnd(0, 6.28),
    col: ['#d9a21f', '#e08a2c', '#c9612f', '#e8b832'][i % 4],
  }));
  const fireflies = Array.from({ length: 14 }, (_, i) => ({
    x: ((i * 271 + 91) % 1000) / 1000, y: ((i * 419 + 43) % 1000) / 1000, phase: rnd(0, 6.28),
  }));
  const stars = Array.from({ length: 48 }, (_, i) => ({
    x: ((i * 317 + 73) % 1000) / 1000, y: ((i * 541 + 29) % 1000) / 1000, s: (i % 3 === 0) ? 2 : 1.3, phase: rnd(0, 6.28),
  }));
  raindrops = Array.from({ length: 55 }, () => ({ x: Math.random(), y: Math.random(), len: rnd(8, 15), sp: rnd(0.65, 1.1) }));
  birds = Array.from({ length: 5 }, (_, i) => ({ x: rnd(0.1, 0.9), y: rnd(0.12, 0.42), vx: rnd(0.02, 0.038), phase: i * 1.1 }));
  const smokes = [];

  // ---------- persistence ----------
  function saveLinksOnly() {
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify({
        customItems, overrides, bookmarks, accountPrefs, timetable, deadlines, quickNoteText, studyStreak,
      }));
    } catch (e) {}
  }

  function loadLinksOnly() {
    try {
      const d = JSON.parse(localStorage.getItem(LINKS_KEY));
      if (!d) return;
      if (Array.isArray(d.customItems)) customItems.splice(0, customItems.length, ...d.customItems);
      if (d.overrides && typeof d.overrides === 'object') Object.assign(overrides, d.overrides);
      if (d.bookmarks && typeof d.bookmarks === 'object') Object.assign(bookmarks, d.bookmarks);
      if (d.accountPrefs && typeof d.accountPrefs === 'object') Object.assign(accountPrefs, d.accountPrefs);
      if (Array.isArray(d.timetable) && d.timetable.length) timetable = d.timetable;
      if (Array.isArray(d.deadlines)) deadlines = d.deadlines;
      if (typeof d.quickNoteText === 'string') quickNoteText = d.quickNoteText;
      if (Number.isFinite(d.studyStreak)) studyStreak = d.studyStreak;
    } catch (e) {}
  }

  let saveTimer = 0;
  function serializeState() {
    return {
      themeId, timeMode, simSpeed, weather, darkMode, cbMode, largeText, ghostMode,
      showAgents, showLabels, showHeatmap, money, dayCount, hour, needs,
      simStats, grid, levels, pins, customItems, overrides, bookmarks, accountPrefs, timetable, deadlines, quickNoteText, studyStreak,
    };
  }
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    saveLinksOnly();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeState())); } catch (e) {}
  }
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(saveNow, 500);
  }
  addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
  addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

  function syncBodyPrefs() {
    const r = document.documentElement;
    r.dataset.dark = String(darkMode);
    r.dataset.cb = String(cbMode);
    r.dataset.large = String(largeText);
    r.dataset.photo = String(photoMode);
    document.body.style.background = curTheme().skyDay;
    $('darkModeBtn').setAttribute('aria-pressed', String(darkMode));
    $('cbModeBtn').setAttribute('aria-pressed', String(cbMode));
    $('largeTextBtn').setAttribute('aria-pressed', String(largeText));
    $('ghostBtn').setAttribute('aria-pressed', String(ghostMode));
    $('agentsBtn').setAttribute('aria-pressed', String(showAgents));
    $('heatBtn').setAttribute('aria-pressed', String(showHeatmap));
    $('labelsBtn').setAttribute('aria-pressed', String(showLabels));
    $('realTimeBtn').setAttribute('aria-pressed', String(timeMode === 'realtime'));
    $('autoTimeBtn').textContent = timeMode === 'auto' ? 'Auto' : timeMode === 'realtime' ? 'Real' : 'Fixed';
    $('autoTimeBtn').setAttribute('aria-pressed', String(timeMode !== 'paused'));
    $('weatherBtn').textContent = weather.charAt(0).toUpperCase() + weather.slice(1);
    document.querySelectorAll('.theme-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === themeId)));
    document.querySelectorAll('.speed-btn').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === simSpeed)));
  }

  // ---------- city builder ----------
  function starter() {
    grid = Array.from({ length: N }, () => Array(N).fill('forest'));
    levels = makeLevels();
    pins = makePins();
    selectedTile = null;

    const set = (x, y, t, lv = 1, id = null) => {
      if (!inb(x, y)) return;
      grid[x][y] = t; levels[x][y] = lv; pins[x][y] = id;
    };

    let ry = 18;
    for (let rx = 0; rx < N; rx++) {
      set(rx, ry, 'water'); set(rx, ry + 1, 'water');
      if (rx % 7 === 4 && ry > 16) { ry--; set(rx, ry, 'water'); }
    }

    for (let x = 4; x <= 26; x++) { set(x, 5, 'road'); set(x, 10, 'road'); set(x, 14, 'road'); }
    for (let y = 4; y <= 15; y++) set(6, y, 'road');

    for (let x = 5; x <= 26; x++) { set(x, 21, 'road'); set(x, 25, 'road'); }
    for (let x = 7; x <= 25; x++) set(x, 28, 'road');
    for (let y = 21; y <= 28; y++) set(8, y, 'road');

    for (const bx of [12, 19, 25]) {
      for (let y = 4; y <= 28; y++) set(bx, y, isWater(grid[bx][y]) ? 'bridge' : 'road');
    }

    for (const [px0, py0] of D.SCENIC_PARKS) set(px0, py0, 'park', 1, null);
    for (const lm of D.GITHUB_LANDMARKS) set(lm.x, lm.y, lm.t, lm.lv, lm.id);
    for (const lm of D.GOOGLE_LANDMARKS) set(lm.x, lm.y, lm.t, lm.lv, lm.id);

    assignUnpinnedItems();
  }

  function findItemTile(id) {
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (pins[x][y] === id) return [x, y];
    return null;
  }

  function findFreeLot(kind, preferType = null) {
    const pool = kind === 'google' ? D.SPARE_SOUTH : D.SPARE_NORTH;
    for (const [sx, sy, st, slv] of pool) {
      if (!pins[sx][sy] && (grid[sx][sy] === 'forest' || grid[sx][sy] === 'park')) {
        return { x: sx, y: sy, t: preferType || st, lv: slv };
      }
    }
    const yMin = kind === 'google' ? 20 : 3;
    const yMax = kind === 'google' ? N - 3 : 16;
    for (let x = 3; x < N - 3; x++) for (let y = yMin; y <= yMax; y++) {
      if (!pins[x][y] && grid[x][y] === 'forest') {
        const nearRoad = NB.some(([dx, dy]) => inb(x + dx, y + dy) && isRoad(grid[x + dx][y + dy]));
        if (nearRoad) return { x, y, t: preferType || 'house', lv: 1 };
      }
    }
    return null;
  }

  function assignUnpinnedItems() {
    for (const item of allItems()) {
      if (findItemTile(item.id)) continue;
      const lot = findFreeLot(item.kind, item.style || null);
      if (lot) {
        grid[lot.x][lot.y] = lot.t;
        levels[lot.x][lot.y] = lot.lv;
        pins[lot.x][lot.y] = item.id;
        worldDirty = true;
      }
    }
  }

  function applySaveData(d) {
    if (!d || !Array.isArray(d.grid) || d.grid.length !== N || !Array.isArray(d.grid[0]) || d.grid[0].length !== N) return false;
    grid = d.grid.map((row) => row.map((t) => (t && TYPES[t]) ? t : null));
    levels = (Array.isArray(d.levels) && d.levels.length === N)
      ? d.levels.map((row) => row.map((v) => Math.max(1, Math.min(3, Number(v) || 1))))
      : makeLevels();
    pins = (Array.isArray(d.pins) && d.pins.length === N)
      ? d.pins.map((row) => Array.isArray(row) ? row.map((v) => (v && typeof v === 'string') ? v : null) : Array(N).fill(null))
      : makePins();
    pins = pins.map((row) => row.map((v) => (v === 'co-bo-u' ? 'uni-plan' : v))); // renamed building

    themeId = D.THEMES[d.themeId] ? d.themeId : 'autumn';
    timeMode = d.timeMode || 'auto';
    simSpeed = Number.isFinite(d.simSpeed) ? d.simSpeed : 1;
    weather = d.weather || 'clear';
    darkMode = !!d.darkMode; cbMode = !!d.cbMode; largeText = !!d.largeText; ghostMode = !!d.ghostMode;
    showAgents = d.showAgents !== false; showLabels = d.showLabels !== false; showHeatmap = d.showHeatmap !== false;
    money = Number.isFinite(d.money) ? d.money : 5000;
    dayCount = Number.isFinite(d.dayCount) ? d.dayCount : 1;
    hour = Number.isFinite(d.hour) ? d.hour : 17.4;
    if (d.needs) needs = { ...needs, ...d.needs };
    if (d.simStats) simStats = { ...simStats, ...d.simStats };
    if (Array.isArray(d.customItems)) customItems.splice(0, customItems.length, ...d.customItems);
    if (d.overrides) Object.assign(overrides, d.overrides);
    if (d.bookmarks) Object.assign(bookmarks, d.bookmarks);
    if (d.accountPrefs) Object.assign(accountPrefs, d.accountPrefs);
    if (Array.isArray(d.timetable)) timetable = d.timetable;
    if (Array.isArray(d.deadlines)) deadlines = d.deadlines;
    if (typeof d.quickNoteText === 'string') quickNoteText = d.quickNoteText;

    assignUnpinnedItems();
    selectedTile = null;
    syncBodyPrefs();
    rebuildCrownSprites();
    return true;
  }

  function load() {
    loadLinksOnly();
    // Try hash share link first
    if (location.hash.startsWith('#city=')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(atob(location.hash.slice(6))));
        if (parsed.themeId && D.THEMES[parsed.themeId]) themeId = parsed.themeId;
        if (Number.isFinite(parsed.hour)) hour = parsed.hour;
        if (Array.isArray(parsed.customItems)) customItems.push(...parsed.customItems);
        if (parsed.overrides) Object.assign(overrides, parsed.overrides);
        if (parsed.bookmarks) Object.assign(bookmarks, parsed.bookmarks);
      } catch (e) {}
    }
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (applySaveData(saved)) return true;
    } catch (e) {}
    return false;
  }

  // ---------- schedule, traffic crossings, simulation & agents ----------
  function schedulePhase(h) {
    if (h >= 6.5 && h < 9.5) return 'Commuting to work';
    if (h >= 11.75 && h < 13.5) return 'Lunch break';
    if (h >= 13.5 && h < 17.5) return 'Working & studying';
    if (h >= 17.5 && h < 22) return 'Heading home';
    return 'Night shift';
  }

  function recompute() {
    wheelsList = []; millsList = []; beaconsList = []; housesList = []; buildingsList = []; waterCells = [];
    crossings.clear(); busStops = [];
    let pop = 0, jobs = 0, buildings = 0, roads = 0;

    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      const lv = levels[x][y] || 1;
      const d = TYPES[t];
      if (t === 'water') waterCells.push([x, y]);
      else if (isRoad(t)) {
        roads++;
        const deg = NB.filter(([dx, dy]) => inb(x + dx, y + dy) && isRoad(grid[x + dx][y + dy])).length;
        if (deg >= 3) crossings.add(x * N + y);
        else if (deg === 2 && ((x + y) % 9 === 0)) busStops.push([x, y]);
      } else if (isBuilding(t)) {
        buildings++;
        if (t === 'windmill') millsList.push([x, y]);
        else if (t === 'wheel') wheelsList.push([x, y]);
        else if (t === 'office') beaconsList.push([x, y, bldHeight(t, lv) + (lv >= 3 ? 20 : 12)]);
        else if (t === 'house') housesList.push([x, y, bldHeight(t, lv) + 12]);
        if (bldHeight(t, lv) > 0) buildingsList.push([x, y, t]);
        const mult = LVL_MULT[lv] || 1;
        pop += Math.round((d.pop || 0) * mult);
        jobs += Math.round((d.jobs || 0) * mult);
      }
    }

    const income = Math.round(jobs * 3 + pop * 1.4 + buildings * 8);
    const upkeep = Math.round(roads * 0.6 + buildings * 2.5);
    simStats.pop = pop;
    simStats.jobs = jobs;
    simStats.income = income;
    simStats.upkeep = upkeep;
    simStats.net = income - upkeep;
    $('sPop').textContent = fmt(pop);
    $('sMoney').textContent = '$' + fmt(money);
    syncAgents();
    if ($('econPop').dataset.open === 'true') renderEconomyUI();
  }

  function roadTiles() {
    const r = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (isRoad(grid[x][y])) r.push([x, y]);
    return r;
  }
  function waterTiles() {
    const w = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (isWater(grid[x][y])) w.push([x, y]);
    return w;
  }

  function syncAgents() {
    if (!showAgents) { cars.length = 0; walkers.length = 0; bots.length = 0; boats.length = 0; drones.length = 0; dogs.length = 0; return; }
    cars = cars.filter((c) => isRoad(grid[c.tx]?.[c.ty]) && isRoad(grid[c.fx]?.[c.fy]));
    walkers = walkers.filter((w) => isRoad(grid[w.tx]?.[w.ty]) && isRoad(grid[w.fx]?.[w.fy]));
    bots = bots.filter((b) => isRoad(grid[b.tx]?.[b.ty]) && isRoad(grid[b.fx]?.[b.fy]));
    boats = boats.filter((b) => isWater(grid[b.tx]?.[b.ty]) && isWater(grid[b.fx]?.[b.fy]));

    bots.length = 0; drones.length = 0; dogs.length = 0;
    if (cars.length > 14) cars.length = 14;
    if (walkers.length > 12) walkers.length = 12;
    const r = roadTiles();
    if (r.length) {
      const wantCars = 14;
      while (cars.length < wantCars) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        const idx = cars.length;
        const kind = idx % 9 === 0 ? 'bus' : idx % 6 === 0 ? 'bike' : idx === 3 ? 'truck' : 'car';
        const palette = kind === 'bus' ? '#e6d8a8' : kind === 'bike' ? '#38bdf8' : kind === 'truck' ? '#d97706'
          : ['#c0463a', '#2f5d8a', '#e6e2d6', '#d89a2b', '#3d3f45', '#4f8f6a'][idx % 6];
        cars.push({ id: idx + 1, kind, fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, wait: 0,
          speed: kind === 'bike' ? rnd(1.3, 1.8) : kind === 'bus' ? 0.72 : rnd(0.85, 1.35), color: palette,
          route: [[x, y]], dest: kind === 'bus' ? 'Loop Route' : kind === 'truck' ? 'Repair Dispatch' : 'Commute' });
      }
      if (cars.length > wantCars) cars.length = wantCars;

      const wantWalkers = 12;
      while (walkers.length < wantWalkers) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        const [cname, crole] = D.CITIZEN_NAMES[walkers.length % D.CITIZEN_NAMES.length];
        walkers.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.28, 0.45),
          name: cname, role: crole, bench: walkers.length % 5 === 0,
          color: ['#e6ded0', '#c95d43', '#3b6978', '#d4a23a', '#5b7a52'][walkers.length % 5] });
      }

      const wantBots = 0;
      while (bots.length < wantBots) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        bots.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.45, 0.78),
          phase: Math.random() * 6.28, prog: Math.random(), carry: bots.length % 3 === 0,
          color: BOT_COLORS[bots.length % BOT_COLORS.length] });
      }

      while (dogs.length < 0) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        dogs.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: 0.44 });
      }
    }

    const w = waterTiles();
    while (boats.length < 4 && w.length) {
      const [x, y] = w[Math.floor(Math.random() * w.length)];
      boats.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.3, 0.46),
        color: ['#b35a38', '#d8cbb5', '#3d6e70', '#c48f36'][boats.length % 4] });
    }

    while (drones.length < 0) {
      drones.push({ x: rnd(5, 25), y: rnd(5, 27), vx: rnd(-1.1, 1.1) || 0.7, vy: rnd(-1.1, 1.1) || 0.6, phase: rnd(0, 6.28) });
    }
  }

  function trafficSignalNS() {
    const c = simClock % 12;
    if (c < 5) return 'green';
    if (c < 6) return 'yellow';
    return 'red';
  }
  function trafficSignalEW() {
    const c = simClock % 12;
    if (c >= 6 && c < 11) return 'green';
    if (c >= 11) return 'yellow';
    return 'red';
  }

  function stepVehicles(dt) {
    const ns = trafficSignalNS();
    const ew = trafficSignalEW();
    for (let idx = 0; idx < cars.length; idx++) {
      const c = cars[idx];
      if (c.wait > 0) { c.wait = Math.max(0, c.wait - dt); continue; }

      // Stop at red traffic lights before entering crossing
      if (crossings.has(c.tx * N + c.ty) && c.t > 0.55 && c.t < 0.92 && c.kind !== 'bike') {
        const isNS = Math.abs(c.tx - c.fx) > 0;
        const sig = isNS ? ns : ew;
        if (sig !== 'green') continue;
      }

      // Queue spacing behind ahead car
      const ahead = cars.some((o, oi) => oi !== idx && o.tx === c.tx && o.ty === c.ty && o.t > c.t && o.t - c.t < 0.35);
      if (ahead) continue;

      c.t += dt * c.speed;
      if (c.t >= 1) {
        if (c.kind === 'bus' && busStops.some(([bx, by]) => bx === c.tx && by === c.ty)) c.wait = 1.0;
        const opts = NB.map(([dx, dy]) => [c.tx + dx, c.ty + dy]).filter(([x, y]) => inb(x, y) && isRoad(grid[x][y]));
        if (!opts.length) { c.t = 1; continue; }
        const fwd = opts.filter(([x, y]) => !(x === c.fx && y === c.fy));
        const pool = fwd.length ? fwd : opts;
        // Schedule bias toward south bank or north bank depending on hour
        let chosen = pool[Math.floor(Math.random() * pool.length)];
        if (hour >= 8 && hour <= 16 && Math.random() < 0.35) {
          chosen = pool.reduce((best, p) => (p[1] < best[1] ? p : best), chosen);
        }
        c.fx = c.tx; c.fy = c.ty; c.tx = chosen[0]; c.ty = chosen[1]; c.t = 0;
        c.route.push([c.tx, c.ty]);
        if (c.route.length > 7) c.route.shift();
      }
      c.px = c.fx + (c.tx - c.fx) * c.t;
      c.py = c.fy + (c.ty - c.fy) * c.t;
    }
  }

  function stepList(list, dt, passable = isRoad) {
    for (const c of list) {
      if (c.prog !== undefined) c.prog = (c.prog + dt * 0.22) % 1;
      c.t += dt * c.speed;
      if (c.t >= 1) {
        const opts = NB.map(([dx, dy]) => [c.tx + dx, c.ty + dy]).filter(([x, y]) => inb(x, y) && passable(grid[x][y]));
        if (!opts.length) { c.t = 1; continue; }
        const fwd = opts.filter(([x, y]) => !(x === c.fx && y === c.fy));
        const pool = fwd.length ? fwd : opts;
        const [nx, ny] = pool[Math.floor(Math.random() * pool.length)];
        c.fx = c.tx; c.fy = c.ty; c.tx = nx; c.ty = ny; c.t = 0;
      }
      c.px = c.fx + (c.tx - c.fx) * c.t;
      c.py = c.fy + (c.ty - c.fy) * c.t;
    }
  }

  function stepDronesAndBirds(dt) {
    for (const d of drones) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < 4 || d.x > N - 4) d.vx *= -1;
      if (d.y < 4 || d.y > N - 4) d.vy *= -1;
    }
    for (const b of birds) {
      b.x = (b.x + b.vx * dt) % 1;
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const cf = confetti[i];
      cf.life += dt;
      cf.z -= dt * 14;
      cf.x += cf.vx * dt; cf.y += cf.vy * dt;
      if (cf.life > 1.6) confetti.splice(i, 1);
    }
  }

  function spawnConfetti(x, y, z = 40) {
    if (reduceMotion) return;
    for (let i = 0; i < 18; i++) {
      confetti.push({ x: x + 0.5, y: y + 0.5, z: z + rnd(0, 12), vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), life: 0,
        col: ['#34d399', '#0f766e', '#fbbf24', '#38bdf8'][i % 4] });
    }
    audio.sfx('celebrate');
  }

  // ---------- projection & picking ----------
  const px = (x, y) => (x - y) * (TW / 2) * rcam.z + rcam.x;
  const py = (x, y, z = 0) => (x + y) * (TH / 2) * rcam.z + rcam.y - z * rcam.z;
  function pick(mx, my) {
    const u = (mx - cam.x) / cam.z / (TW / 2);
    const v = (my - cam.y) / cam.z / (TH / 2);
    const x = Math.floor((u + v) / 2), y = Math.floor((v - u) / 2);
    return inb(x, y) ? [x, y] : null;
  }
  function hitLabel(mx, my) {
    if (!showLabels) return null;
    for (let i = labelHits.length - 1; i >= 0; i--) {
      const h = labelHits[i];
      if (mx >= h.rx && mx <= h.rx + h.rw && my >= h.ry && my <= h.ry + h.rh) return h;
    }
    return null;
  }
  function hitVehicle(mx, my) {
    for (let i = vehicleHits.length - 1; i >= 0; i--) {
      const v = vehicleHits[i];
      if (Math.hypot(mx - v.sx, my - v.sy) < 12) return v.car;
    }
    return null;
  }
  function flyToTile(x, y, targetZ = null, withDrawer = true) {
    const tz = targetZ || Math.max(cam.z, W >= 760 ? 1.05 : 0.9);
    const offsetX = (withDrawer && W >= 760) ? -150 : 0;
    const centerY = (withDrawer && W < 760) ? H * 0.34 : H * 0.54;
    const tx = W / 2 + offsetX - ((x + 0.5) - (y + 0.5)) * (TW / 2) * tz;
    const ty = centerY - ((x + 0.5) + (y + 0.5)) * (TH / 2) * tz + 28 * tz;
    if (reduceMotion) { cam.x = tx; cam.y = ty; cam.z = tz; camAnim = null; return; }
    camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: performance.now(), dur: 380 };
  }

  // ---------- color / light ----------
  function daylight(h) {
    const s = Math.sin(((h - 6) / 24) * Math.PI * 2);
    return Math.max(0, Math.min(1, s * 1.6 + 0.5));
  }
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  let warm = 0;
  const shadeCache = new Map();
  function shade(c, k, light) {
    const lq = Math.round(light * 48) / 48, wq = Math.round(warm * 24) / 24;
    const key = c + k + '|' + lq + '|' + wq;
    let out = shadeCache.get(key);
    if (out) return out;
    const [r, g, b] = hex(c);
    light = lq;
    const n = 1 - light;
    const tint = [0.55, 0.62, 0.9];
    const w = [1 + 0.2 * wq, 1 + 0.05 * wq, 1 - 0.28 * wq];
    const f = (v, i) => Math.round(Math.min(255, v * w[i] * k * (light + n * 0.38 * tint[i] / 0.55 * 0.75)));
    out = `rgb(${f(r, 0)},${f(g, 1)},${f(b, 2)})`;
    if (shadeCache.size > 4000) shadeCache.clear();
    shadeCache.set(key, out);
    return out;
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  // ---------- drawing primitives ----------
  function poly4(x0, y0, x1, y1, x2, y2, x3, y3, fill) {
    rctx.beginPath();
    rctx.moveTo(x0, y0); rctx.lineTo(x1, y1); rctx.lineTo(x2, y2); rctx.lineTo(x3, y3);
    rctx.closePath();
    rctx.fillStyle = fill;
    rctx.fill();
  }
  function quadZ(x0, y0, x1, y1, z, fill) {
    poly4(px(x0, y0), py(x0, y0, z), px(x1, y0), py(x1, y0, z), px(x1, y1), py(x1, y1, z), px(x0, y1), py(x0, y1, z), fill);
  }
  function castShadow(x0, y0, x1, y1, h) {
    // Shadows stretch smoothly toward evening & morning
    const stretch = 0.55 + Math.min(1.1, Math.abs(hour - 12) / 6.5);
    const dir = hour < 12 ? -0.55 : 1.0;
    const sx = Math.min(0.95, h * 0.0065 * stretch) * dir;
    const sy = Math.min(0.45, h * 0.003 * stretch);
    poly4(px(x1, y0), py(x1, y0, 0), px(x1 + sx, y0 + sy), py(x1 + sx, y0 + sy, 0), px(x1 + sx, y1 + sy), py(x1 + sx, y1 + sy, 0), px(x0 + sx, y1 + sy), py(x0 + sx, y1 + sy, 0), 'rgba(10, 18, 12, 0.2)');
    poly4(px(x0, y1), py(x0, y1, 0), px(x1, y1), py(x1, y1, 0), px(x1 + sx, y1 + sy), py(x1 + sx, y1 + sy, 0), px(x0 + sx, y1 + sy), py(x0 + sx, y1 + sy, 0), 'rgba(10, 18, 12, 0.2)');
  }
  function box(x0, y0, x1, y1, z0, z1, color, L, opts = {}) {
    poly4(px(x0, y1), py(x0, y1, z0), px(x1, y1), py(x1, y1, z0), px(x1, y1), py(x1, y1, z1), px(x0, y1), py(x0, y1, z1), shade(color, 0.82, L));
    poly4(px(x1, y0), py(x1, y0, z0), px(x1, y1), py(x1, y1, z0), px(x1, y1), py(x1, y1, z1), px(x1, y0), py(x1, y0, z1), shade(color, 0.64, L));
    quadZ(x0, y0, x1, y1, z1, shade(opts.roof || color, 1.05, L));
    if (opts.windows) windows(x0, y0, x1, y1, z0, z1, L, opts.windows, opts.glass, opts.thresh || 0.35);
  }
  function windows(x0, y0, x1, y1, z0, z1, L, seed, glass = false, thresh = 0.35) {
    const rows = Math.max(1, Math.floor((z1 - z0) / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const night = 1 - L;
    const dx = x1 - x0, dy = y1 - y0;
    const darkL = shade(glass ? '#486d8a' : '#27333f', 1, L);
    const darkR = shade(glass ? '#37566f' : '#1f2a35', 1, L);
    for (let r = 0; r < rows; r++) {
      const zz0 = z0 + 6 + r * 14, zz1 = zz0 + (glass ? 8 : 7);
      for (let c = 0; c < cols; c++) {
        const lit = night > thresh && ((seed * 31 + r * 17 + c * 13) % 7) < 4;
        const a = (c + (glass ? 0.14 : 0.25)) / cols, b = (c + (glass ? 0.86 : 0.75)) / cols;
        const lx0 = x0 + dx * a, lx1 = x0 + dx * b;
        poly4(px(lx0, y1), py(lx0, y1, zz0), px(lx1, y1), py(lx1, y1, zz0), px(lx1, y1), py(lx1, y1, zz1), px(lx0, y1), py(lx0, y1, zz1), lit ? '#ffd98a' : darkL);
        const ry0 = y0 + dy * a, ry1 = y0 + dy * b;
        poly4(px(x1, ry0), py(x1, ry0, zz0), px(x1, ry1), py(x1, ry1, zz0), px(x1, ry1), py(x1, ry1, zz1), px(x1, ry0), py(x1, ry0, zz1), lit ? '#f0b862' : darkR);
      }
    }
  }
  function bldHeight(t, lv) {
    const d = TYPES[t];
    if (!d || !d.h) return 0;
    if (!d.grow || lv <= 1) return d.h;
    return Math.round(d.h * (lv === 2 ? 1.32 : 1.68));
  }

  function drawTileNight(x, y, t) {
    if (!t) return;
    if (isRoad(t)) {
      if ((x + y) % 3 === 0) {
        const z = t === 'bridge' ? 2 : 0;
        const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, z + 6);
        const gr = 16 * rcam.z, gg = rctx.createRadialGradient(ax, ay, 0, ax, ay, gr);
        gg.addColorStop(0, 'rgba(255,214,130,0.5)'); gg.addColorStop(1, 'rgba(255,214,130,0)');
        rctx.fillStyle = gg; rctx.beginPath(); rctx.arc(ax, ay, gr, 0, 7); rctx.fill();
      }
      return;
    }
    if (t === 'plaza') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 11);
      const pr = 24 * rcam.z, pg = rctx.createRadialGradient(ax, ay, 0, ax, ay, pr);
      pg.addColorStop(0, 'rgba(255,214,130,0.55)'); pg.addColorStop(1, 'rgba(255,214,130,0)');
      rctx.fillStyle = pg; rctx.beginPath(); rctx.arc(ax, ay, pr, 0, 7); rctx.fill();
      return;
    }
    if (t === 'clinic') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 31);
      const cr = 14 * rcam.z, cg = rctx.createRadialGradient(ax, ay, 0, ax, ay, cr);
      cg.addColorStop(0, 'rgba(235, 95, 85, 0.5)'); cg.addColorStop(1, 'rgba(235, 95, 85, 0)');
      rctx.fillStyle = cg; rctx.beginPath(); rctx.arc(ax, ay, cr, 0, 7); rctx.fill();
    }
    if (t === 'wheel') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 42);
      const wr = 34 * rcam.z, wg = rctx.createRadialGradient(ax, ay, 0, ax, ay, wr);
      wg.addColorStop(0, 'rgba(255, 200, 115, 0.35)'); wg.addColorStop(1, 'rgba(255, 200, 115, 0)');
      rctx.fillStyle = wg; rctx.beginPath(); rctx.arc(ax, ay, wr, 0, 7); rctx.fill();
    }
  }

  function drawBuildingNightWindows(x, y, t, L, force = false) {
    if (t === 'wheel' || t === 'windmill') return;
    const h = bldHeight(t, levels[x][y] || 1);
    if (!h) return;
    const winThresh = 0.22 + ((x * 13 + y * 7) % 24) * 0.015;
    if (!force && (1 - L) <= winThresh) return;

    const i = TYPES[t].inset;
    const x0 = x + i, y0 = y + i, x1 = x + 1 - i, y1 = y + 1 - i;
    const seed = x * 11 + y * 5;
    const glass = t === 'office';
    const rows = Math.max(1, Math.floor(h / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const dx = x1 - x0, dy = y1 - y0;
    for (let r = 0; r < rows; r++) {
      const zz0 = 6 + r * 14, zz1 = zz0 + (glass ? 8 : 7);
      for (let c = 0; c < cols; c++) {
        if (((seed * 31 + r * 17 + c * 13) % 7) >= 4) continue;
        const a = (c + (glass ? 0.14 : 0.25)) / cols, b = (c + (glass ? 0.86 : 0.75)) / cols;
        const lx0 = x0 + dx * a, lx1 = x0 + dx * b;
        poly4(px(lx0, y1), py(lx0, y1, zz0), px(lx1, y1), py(lx1, y1, zz0), px(lx1, y1), py(lx1, y1, zz1), px(lx0, y1), py(lx0, y1, zz1), '#ffd98a');
        const ry0 = y0 + dy * a, ry1 = y0 + dy * b;
        poly4(px(x1, ry0), py(x1, ry0, zz0), px(x1, ry1), py(x1, ry1, zz0), px(x1, ry1), py(x1, ry1, zz1), px(x1, ry0), py(x1, ry0, zz1), '#f0b862');
      }
    }
  }


  // Lit windows are pre-drawn once per building into a small sprite, with every tile in front of the building
  // (trees, other buildings) cut out of it, so windows never show through trees. At night only the sprites are blitted.
  let winSprites = [], winDirty = true;
  function buildWinSprites() {
    winDirty = false;
    winSprites = [];
    const savedR = rctx, savedC = rcam, savedW = warm;
    warm = 0;
    const SS = 2;
    for (const [x, y, t] of buildingsList) {
      if (t === 'wheel' || t === 'windmill') continue;
      const lv = levels[x][y] || 1;
      const h = bldHeight(t, lv);
      if (!h || !TYPES[t]) continue;
      const i = TYPES[t].inset;
      const X0 = x + i, Y0 = y + i, X1 = x + 1 - i, Y1 = y + 1 - i;
      const wx = (a, b) => (a - b) * (TW / 2) + OX;
      const wy = (a, b, z = 0) => (a + b) * (TH / 2) + OY - z;
      const left = Math.floor(wx(X0, Y1)) - 6, right = Math.ceil(wx(X1, Y0)) + 6;
      const top = Math.floor(wy(X0, Y0, h)) - 6, bottom = Math.ceil(wy(X1, Y1, 0)) + 6;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round((right - left) * SS)); c.height = Math.max(1, Math.round((bottom - top) * SS));
      const g = c.getContext('2d');
      g.setTransform(SS, 0, 0, SS, 0, 0);
      rctx = g; rcam = { x: OX - left, y: OY - top, z: 1 };
      drawBuildingNightWindows(x, y, t, 1, true);
      g.globalCompositeOperation = 'destination-out';
      for (let dx = 0; dx <= 3; dx++) for (let dy = 0; dy <= 3; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx - dy) > 2) continue;
        const tx = x + dx, ty = y + dy;
        if (tx >= N || ty >= N) continue;
        const tt = grid[tx][ty];
        if (!tt || isRoad(tt) || tt === 'water') continue;
        drawTile(tx, ty, tt, 1, true);
      }
      winSprites.push({ x, y, c, left, top, w: right - left, h: bottom - top });
    }
    rctx = savedR; rcam = savedC; warm = savedW;
  }

  function drawWater(x, y, L) {
    const th = curTheme();
    quadZ(x, y, x + 1, y + 1, -5, shade((x + y) % 2 ? th.waterA : th.waterB, 1, L));
    if (inb(x - 1, y) && !isWater(grid[x - 1][y])) poly4(px(x, y), py(x, y, 0), px(x, y + 1), py(x, y + 1, 0), px(x, y + 1), py(x, y + 1, -5), px(x, y), py(x, y, -5), shade('#5b4c39', 1, L));
    if (inb(x, y - 1) && !isWater(grid[x][y - 1])) poly4(px(x, y), py(x, y, 0), px(x + 1, y), py(x + 1, y, 0), px(x + 1, y), py(x + 1, y, -5), px(x, y), py(x, y, -5), shade('#6b5a44', 1, L));
  }

  function drawRoad(x, y, L, bridge = false, skipWater = false) {
    const th = curTheme();
    const z = bridge ? 2 : 0;
    if (bridge) {
      if (!skipWater) drawWater(x, y, L);
      box(x + 0.12, y + 0.12, x + 0.24, y + 0.24, -5, 0, '#5a4e3f', L);
      box(x + 0.76, y + 0.76, x + 0.88, y + 0.88, -5, 0, '#5a4e3f', L);
      box(x + 0.05, y + 0.05, x + 0.95, y + 0.95, -1, z, '#8c806e', L, { roof: th.road });
    } else {
      quadZ(x, y, x + 1, y + 1, 0, shade(th.curb, 1, L));
      const nX = inb(x - 1, y) && isRoad(grid[x - 1][y]) ? 0 : 0.09;
      const pX = inb(x + 1, y) && isRoad(grid[x + 1][y]) ? 1 : 0.91;
      const nY = inb(x, y - 1) && isRoad(grid[x][y - 1]) ? 0 : 0.09;
      const pY = inb(x, y + 1) && isRoad(grid[x][y + 1]) ? 1 : 0.91;
      quadZ(x + nX, y + nY, x + pX, y + pY, 0.2, shade(th.road, 1, L));
    }

    // Pedestrian crosswalk stripes at crossings
    if (crossings.has(x * N + y)) {
      rctx.fillStyle = shade('#e9e4cf', 0.95, L);
      for (let k = -1; k <= 1; k++) {
        quadZ(x + 0.18 + k * 0.22, y + 0.1, x + 0.28 + k * 0.22, y + 0.22, z + 0.25, shade('#e9e4cf', 0.9, L));
        quadZ(x + 0.1, y + 0.44 + k * 0.18, x + 0.22, y + 0.52 + k * 0.18, z + 0.25, shade('#e9e4cf', 0.9, L));
      }
    } else {
      const mx = x + 0.5, my = y + 0.5;
      rctx.strokeStyle = shade('#e9e4cf', 1, L);
      rctx.lineWidth = Math.max(1, 1.4 * rcam.z);
      rctx.setLineDash([5 * rcam.z, 5 * rcam.z]);
      rctx.beginPath();
      const ax = px(mx, my), ay = py(mx, my, z + 0.2);
      for (let i = 0; i < 4; i++) {
        const dx = NB[i][0], dy = NB[i][1];
        if (inb(x + dx, y + dy) && isRoad(grid[x + dx][y + dy])) {
          rctx.moveTo(ax, ay);
          rctx.lineTo(px(mx + dx * 0.5, my + dy * 0.5), py(mx + dx * 0.5, my + dy * 0.5, z + 0.2));
        }
      }
      rctx.stroke();
      rctx.setLineDash([]);
    }

    // Street lamps that illuminate warmly at dusk
    if ((x + y) % 3 === 0) {
      const lx = px(x + 0.14, y + 0.14), ly0 = py(x + 0.14, y + 0.14, z), ly1 = py(x + 0.14, y + 0.14, z + 8);
      rctx.strokeStyle = shade('#2e3338', 1, L);
      rctx.lineWidth = Math.max(1, 1.3 * rcam.z);
      rctx.beginPath(); rctx.moveTo(lx, ly0); rctx.lineTo(lx, ly1); rctx.stroke();
      rctx.fillStyle = L < 0.72 ? '#ffe59c' : shade('#d6d0c0', 1, L);
      rctx.beginPath(); rctx.arc(lx, ly1, 1.9 * rcam.z, 0, 7); rctx.fill();
    }
  }

  // Better multi-lobe 3x supersampled organic trees
  const SPR_W = 40, SPR_H = 46, SPR_CX = 20, SPR_CY = 16, SPR_S = 3;
  let crownSprites = [];
  function rebuildCrownSprites() {
    crownSprites = curTheme().crowns.map(([dark, light]) => {
      const c = document.createElement('canvas');
      c.width = SPR_W * SPR_S; c.height = SPR_H * SPR_S;
      const sc = c.getContext('2d');
      sc.setTransform(SPR_S, 0, 0, SPR_S, 0, 0);
      const R = 10;
      sc.fillStyle = dark;
      sc.beginPath(); sc.arc(SPR_CX, SPR_CY, R, 0, 7); sc.fill();
      sc.fillStyle = light;
      sc.beginPath(); sc.arc(SPR_CX - R * 0.25, SPR_CY - R * 0.3, R * 0.68, 0, 7); sc.fill();
      return c;
    });
  }
  rebuildCrownSprites();

  function tree(x, y, s, L, seed = 0) {
    if (!seed) box(x - 0.025, y - 0.025, x + 0.025, y + 0.025, 0, 8 * s, '#4a3624', L);
    const cx = px(x, y), cy = py(x, y, 19 * s);
    const k = s * rcam.z;
    const spr = crownSprites[Math.abs(seed) % crownSprites.length];
    rctx.drawImage(spr, cx - SPR_CX * k, cy - SPR_CY * k, SPR_W * k, SPR_H * k);
  }

  const FOREST_SPOTS = [[0.28, 0.25], [0.74, 0.3], [0.5, 0.52], [0.25, 0.78], [0.76, 0.76]];
  const WALLS = ['#efe6d2', '#f2f0ea', '#e8c98a', '#d7d2c4'];
  const REDS = ['#b0412e', '#bd5530', '#923a2c', '#c9612f'];

  function drawGround(x, y, t, L) {
    if (t === 'water' || t === 'bridge') return drawWater(x, y, L);
    const th = curTheme();
    const base = t === 'forest' ? ((x + y) % 2 ? th.forestA : th.forestB)
      : t === 'park' ? th.park : ((x + y) % 2 ? th.grassA : th.grassB);
    quadZ(x, y, x + 1, y + 1, 0, shade(base, 1, L));

    // Ground GitHub contribution heatmap near central north plaza
    if (showHeatmap && x >= 11 && x <= 17 && y >= 11 && y <= 13 && (t === 'park' || t === 'forest')) {
      const heatLvl = ((x * 5 + y * 3) % 4);
      const cols = ['rgba(15,118,110,0.22)', 'rgba(20,184,166,0.34)', 'rgba(52,211,153,0.46)', 'rgba(232,184,50,0.52)'];
      quadZ(x + 0.14, y + 0.14, x + 0.86, y + 0.86, 0.25, cols[heatLvl]);
    }
  }

  function drawWheelBase(x, y, L) {
    quadZ(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0.5, shade('#c8baa3', 1, L));
    rctx.strokeStyle = shade('#d9d4c9', 1, L);
    rctx.lineWidth = Math.max(1.5, 2.5 * rcam.z);
    const cx = px(x + 0.5, y + 0.5), cy = py(x + 0.5, y + 0.5, 42);
    rctx.beginPath();
    rctx.moveTo(px(x + 0.22, y + 0.25), py(x + 0.22, y + 0.25, 1)); rctx.lineTo(cx, cy);
    rctx.moveTo(px(x + 0.78, y + 0.75), py(x + 0.78, y + 0.75, 1)); rctx.lineTo(cx, cy);
    rctx.stroke();
  }

  function drawWheelSpin(x, y, now, L) {
    const cx = px(x + 0.5, y + 0.5), cy = py(x + 0.5, y + 0.5, 42);
    const rx = 20 * rcam.z, ry = 26 * rcam.z;
    const ang = reduceMotion || simSpeed === 0 ? 0.4 : now * 0.00055 * simSpeed;
    const cols = ['#d95f59', '#e0c25b', '#5f8c7a', '#7fa6c9'];
    rctx.strokeStyle = shade('#f2ece0', 1, L);
    rctx.lineWidth = Math.max(1, 1.5 * rcam.z);
    rctx.beginPath(); rctx.ellipse(cx, cy, rx, ry, 0, 0, 7); rctx.stroke();
    rctx.beginPath(); rctx.ellipse(cx, cy, rx * 0.55, ry * 0.55, 0, 0, 7); rctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = ang + (i * Math.PI) / 4;
      const gx = cx + Math.cos(a) * rx, gy = cy + Math.sin(a) * ry;
      rctx.strokeStyle = shade('#d4cdbe', 1, L);
      rctx.beginPath(); rctx.moveTo(cx, cy); rctx.lineTo(gx, gy); rctx.stroke();
      rctx.fillStyle = L < 0.55 ? '#ffd98a' : shade(cols[i % 4], 1, L);
      rctx.fillRect(gx - 3 * rcam.z, gy, 6 * rcam.z, 5 * rcam.z);
    }
  }

  function drawMillSpin(x, y, now, L) {
    const hx = px(x + 0.5, y + 0.5), hy = py(x + 0.5, y + 0.5, 48);
    const ang = reduceMotion || simSpeed === 0 ? 0.3 : now * 0.002 * simSpeed;
    const r = 17 * rcam.z;
    rctx.strokeStyle = shade('#f4f1ea', 1, L);
    rctx.lineWidth = Math.max(1.5, 2.2 * rcam.z);
    for (let i = 0; i < 3; i++) {
      const a = ang + (i * Math.PI * 2) / 3;
      rctx.beginPath(); rctx.moveTo(hx, hy); rctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); rctx.stroke();
    }
    rctx.fillStyle = shade('#d8d2c6', 1, L);
    rctx.beginPath(); rctx.arc(hx, hy, 2.6 * rcam.z, 0, 7); rctx.fill();
  }

  function drawTile(x, y, t, L, skipGround = false) {
    if (!skipGround && t !== 'road' && t !== 'bridge') drawGround(x, y, t, L);
    if (!t || t === 'water') return;
    if (t === 'forest') {
      const sd = x * 17 + y * 31;
      for (let i = 0; i < 5; i++) {
        const [a, b] = FOREST_SPOTS[i];
        const sc = 0.8 + ((Math.imul(sd + i * 331, 2246822519) >>> 24) % 4) * 0.1;
        const cs = Math.imul(sd + i * 977, 2654435761) >>> 20;
        tree(x + a, y + b, sc, L, cs);
      }
      return;
    }
    if (t === 'road' || t === 'bridge') {
      drawRoad(x, y, L, t === 'bridge', skipGround);
      return;
    }
    if (t === 'park') {
      quadZ(x + 0.12, y + 0.44, x + 0.88, y + 0.56, 0.2, shade('#cfc3aa', 1, L));
      box(x + 0.44, y + 0.36, x + 0.58, y + 0.42, 0.2, 2.5, '#7a5436', L);
      const sd = x * 7 + y * 3;
      tree(x + 0.26, y + 0.26, 1, L, 0);
      tree(x + 0.74, y + 0.65, 0.85, L, 1);
      if (sd % 2) tree(x + 0.3, y + 0.78, 0.7, L, 0);
      return;
    }
    if (t === 'plaza') {
      if (!skipGround) castShadow(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 10);
      quadZ(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.5, shade('#c8baa3', 1, L));
      box(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0.5, 4, '#a79a86', L, { roof: '#3c7b80' });
      box(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 4, 11, '#dcd3c2', L, { roof: '#ffd98a' });
      return;
    }
    if (t === 'wheel') {
      if (!skipGround) castShadow(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 52);
      drawWheelBase(x, y, L);
      return;
    }
    if (t === 'windmill') {
      if (!skipGround) castShadow(x + 0.38, y + 0.38, x + 0.62, y + 0.62, 46);
      quadZ(x + 0.24, y + 0.24, x + 0.76, y + 0.76, 1, shade('#b6ab96', 1, L));
      box(x + 0.41, y + 0.41, x + 0.59, y + 0.59, 1, 48, '#ebe6da', L, { roof: '#7ea89b' });
      return;
    }

    const pinId = pins[x][y];
    const item = pinId ? getItem(pinId) : null;
    const d = TYPES[t];
    const i = d.inset;
    const lv = levels[x][y] || 1;
    const seed = x * 11 + y * 5;
    const red = REDS[seed % REDS.length];
    const wall = item?.customColor || (t === 'house' ? WALLS[seed % WALLS.length]
      : t === 'clinic' ? '#f2efe8'
      : t === 'school' ? '#c87c5d'
      : d.color);
    const roof = t === 'house' ? red
      : t === 'apt' ? '#a2432f'
      : t === 'shop' ? red
      : t === 'clinic' ? '#e5dfd3'
      : t === 'school' ? '#4a6b68'
      : '#4b6c8a';
    const H = Math.max(1, bldHeight(t, lv));
    if (!skipGround) castShadow(x + i, y + i, x + 1 - i, y + 1 - i, H);
    const thresh = 0.25 + ((x * 13 + y * 7) % 24) * 0.015;
    box(x + i, y + i, x + 1 - i, y + 1 - i, 0, H, wall, L, { roof, windows: seed, glass: t === 'office', thresh });

    if (t === 'shop') {
      poly4(px(x + i, y + 1 - i + 0.04), py(x + i, y + 1 - i + 0.04, 16), px(x + 1 - i, y + 1 - i + 0.04), py(x + 1 - i, y + 1 - i + 0.04, 16),
        px(x + 1 - i, y + 1 - i + 0.13), py(x + 1 - i, y + 1 - i + 0.13, 11), px(x + i, y + 1 - i + 0.13), py(x + i, y + 1 - i + 0.13, 11), shade('#c0463a', 1, L));
    }
    if (t === 'house') {
      const r0x = px(x + i, y + 0.5), r0y = py(x + i, y + 0.5, H + 10);
      const r1x = px(x + 1 - i, y + 0.5), r1y = py(x + 1 - i, y + 0.5, H + 10);
      poly4(px(x + i, y + i), py(x + i, y + i, H), px(x + 1 - i, y + i), py(x + 1 - i, y + i, H), r1x, r1y, r0x, r0y, shade(red, 1.0, L));
      poly4(px(x + i, y + 1 - i), py(x + i, y + 1 - i, H), px(x + 1 - i, y + 1 - i), py(x + 1 - i, y + 1 - i, H), r1x, r1y, r0x, r0y, shade(red, 0.78, L));
      box(x + 0.64, y + 0.34, x + 0.73, y + 0.43, H + 3, H + 13, '#8a4a3a', L, { roof: '#5a3a30' });
    }
    if (t === 'clinic') {
      quadZ(x + 0.34, y + 0.44, x + 0.66, y + 0.56, H + 0.5, shade('#c8443d', 1, L));
      quadZ(x + 0.44, y + 0.34, x + 0.56, y + 0.66, H + 0.5, shade('#c8443d', 1, L));
    }
    if (t === 'school') {
      box(x + 0.36, y + 0.36, x + 0.64, y + 0.64, H, H + 9, '#e9e3d5', L, { roof: '#3d5856' });
    }
    if ((t === 'apt' || t === 'office') && lv >= 2) {
      const th = lv >= 3 ? 12 : 7;
      box(x + 0.24, y + 0.24, x + 0.76, y + 0.76, H, H + th, wall, L, { roof });
      // Rooftop solar panel or green garden
      if (t === 'apt') quadZ(x + 0.3, y + 0.3, x + 0.7, y + 0.7, H + th + 0.4, shade('#5a8f49', 1, L));
      else quadZ(x + 0.28, y + 0.28, x + 0.52, y + 0.5, H + th + 0.4, shade('#284c73', 1, L));
    }
    if (t === 'office') {
      const sx = px(x + 0.5, y + 0.5), sy0 = py(x + 0.5, y + 0.5, H + (lv >= 3 ? 12 : 7)), sy1 = py(x + 0.5, y + 0.5, H + (lv >= 3 ? 22 : 14));
      rctx.strokeStyle = shade('#9cb3c9', 1, L);
      rctx.lineWidth = Math.max(1, 1.4 * rcam.z);
      rctx.beginPath(); rctx.moveTo(sx, sy0); rctx.lineTo(sx, sy1); rctx.stroke();
    }

    // Repo & special building details: language flag, private gate, weather/moss, scaffolding, cranes
    if (item) {
      const cached = item.kind === 'github' ? repoCache.get(item.id) : null;
      const meta = item.meta || cached?.meta || {};
      const langColor = D.LANG_COLORS[item.lang || item.cat || 'Web'] || '#0f766e';
      // Language/district rooftop flag
      const topZ = buildingTopZ(x, y, t);
      const fx = px(x + 0.25, y + 0.25), fy0 = py(x + 0.25, y + 0.25, topZ - 4), fy1 = py(x + 0.25, y + 0.25, topZ + 6);
      rctx.strokeStyle = shade('#d4cdbe', 1, L);
      rctx.lineWidth = Math.max(1, rcam.z);
      rctx.beginPath(); rctx.moveTo(fx, fy0); rctx.lineTo(fx, fy1); rctx.stroke();
      rctx.fillStyle = langColor;
      rctx.fillRect(fx, fy1, 7 * rcam.z, 4 * rcam.z);

      // Private repo security gate at curb
      if (item.isPrivate) {
        box(x + 0.04, y + 0.88, x + 0.96, y + 0.96, 0, 5, '#d9a21f', L);
      }
      // Stars shown as warm garden lamps at lot corners
      if ((meta.stars || 0) >= 1) {
        const starN = Math.min(4, meta.stars);
        for (let si = 0; si < starN; si++) {
          const lx = px(x + 0.1 + si * 0.25, y + 0.94), ly = py(x + 0.1 + si * 0.25, y + 0.94, 4);
          rctx.fillStyle = '#fde047';
          rctx.beginPath(); rctx.arc(lx, ly, 1.8 * rcam.z, 0, 7); rctx.fill();
        }
      }
      // Scaffolding when open issues > 0
      if ((meta.issues || 0) > 0) {
        rctx.strokeStyle = '#d97706';
        rctx.lineWidth = Math.max(1, rcam.z);
        const sx0 = px(x + i, y + 1 - i), sy0 = py(x + i, y + 1 - i, 2);
        const sx1 = px(x + 1 - i, y + 1 - i), sy1 = py(x + 1 - i, y + 1 - i, H * 0.7);
        rctx.strokeRect(sx0, sy1, sx1 - sx0, sy0 - sy1);
      }
      // Construction crane for freshly added custom items or brand-new repos
      if (item.isCustom) {
        const cx0 = px(x + 0.85, y + 0.15), cy0 = py(x + 0.85, y + 0.15, 0), cy1 = py(x + 0.85, y + 0.15, H + 18);
        rctx.strokeStyle = '#e0a020'; rctx.lineWidth = Math.max(1.2, 1.8 * rcam.z);
        rctx.beginPath(); rctx.moveTo(cx0, cy0); rctx.lineTo(cx0, cy1); rctx.lineTo(cx0 - 16 * rcam.z, cy1 + 4 * rcam.z); rctx.stroke();
      }
      // Open PRs shown as small parked cars at door
      if ((cached?.prs?.length || 0) > 0) {
        box(x + 0.25, y + 0.92, x + 0.55, y + 0.98, 0, 4, '#38bdf8', L);
      }
      // Interior cutaway desks & glowing screens when toggled or zoomed in on selected building
      if (selectedTile && selectedTile[0] === x && selectedTile[1] === y && false) {
        const cx0 = px(x + i + 0.1, y + 1 - i), cy0 = py(x + i + 0.1, y + 1 - i, 6);
        const cw = (px(x + 1 - i - 0.1, y + 1 - i) - cx0);
        const ch = 14 * rcam.z;
        rctx.fillStyle = '#241f1a';
        rctx.fillRect(cx0, cy0 - ch, cw, ch);
        rctx.fillStyle = '#fef08a';
        rctx.fillRect(cx0 + cw * 0.2, cy0 - ch * 0.65, cw * 0.22, ch * 0.35);
        rctx.fillStyle = '#5ef2d6';
        rctx.fillRect(cx0 + cw * 0.58, cy0 - ch * 0.65, cw * 0.22, ch * 0.35);
      }
    }
  }

  const headGlow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,230,160,0.6)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  })();
  function drawCar(c, L, headlightsOnly = false) {
    const s = c.kind === 'bike' ? 0.06 : 0.12;
    const dx = c.tx - c.fx, dy = c.ty - c.fy;
    const ox = -dy * (c.kind === 'bike' ? 0.26 : 0.16), oy = dx * (c.kind === 'bike' ? 0.26 : 0.16);
    const x = c.px + 0.5 + ox, y = c.py + 0.5 + oy;
    const z0 = grid[Math.round(c.px)]?.[Math.round(c.py)] === 'bridge' ? 2 : 0;
    if (!headlightsOnly) {
      const len = c.kind === 'bus' ? 0.25 : c.kind === 'bike' ? 0.09 : 0.16;
      const lx = dx ? len : s, ly = dy ? len : s;
      const h = c.kind === 'bus' ? 9 : c.kind === 'bike' ? 4 : 7;
      box(x - lx, y - ly, x + lx, y + ly, z0, z0 + h, c.color, L);
      vehicleHits.push({ sx: px(x, y), sy: py(x, y, z0 + 3), car: c });
    } else if (L < 0.5) {
      const hx = px(x + dx * 0.2, y + dy * 0.2), hy = py(x + dx * 0.2, y + dy * 0.2, z0 + 4);
      const hr = 9 * rcam.z;
      rctx.drawImage(headGlow, hx - hr, hy - hr, hr * 2, hr * 2);
    }
  }

  function drawWalker(w, now) {
    const dx = w.tx - w.fx, dy = w.ty - w.fy;
    const ox = -dy * 0.34, oy = dx * 0.34;
    const x = w.px + 0.5 + ox, y = w.py + 0.5 + oy;
    const z0 = grid[Math.round(w.px)]?.[Math.round(w.py)] === 'bridge' ? 2 : 0;
    const sx = px(x, y), sy = py(x, y, z0);
    const sz = rcam.z;
    rctx.fillStyle = w.color;
    rctx.fillRect(sx - 1.5 * sz, sy - 5 * sz, 3 * sz, 5 * sz);
    rctx.fillStyle = '#e7c6a5';
    rctx.fillRect(sx - 1 * sz, sy - 7 * sz, 2 * sz, 2 * sz);
    if (w.bench && Math.sin(now * 0.004 + w.px) > 0.7) {
      rctx.fillRect(sx + 2 * sz, sy - 6 * sz, 1.5 * sz, 1.5 * sz);
    }
  }

  function drawBot(b, now, orbit = false) {
    let x, y, z0 = 0;
    if (orbit) { x = b.px; y = b.py; }
    else {
      const dx = b.tx - b.fx, dy = b.ty - b.fy;
      x = b.px + 0.5 + dy * 0.34; y = b.py + 0.5 - dx * 0.34;
      z0 = grid[Math.round(b.px)]?.[Math.round(b.py)] === 'bridge' ? 2 : 0;
    }
    const hoverZ = reduceMotion ? 1.5 : 2 + Math.sin(now * 0.008 + (b.phase || 0)) * 1.4;
    const sx = px(x, y), sy = py(x, y, z0 + hoverZ);
    const sz = rcam.z * (orbit ? 1.25 : 1);
    rctx.fillStyle = 'rgba(8, 16, 18, 0.25)';
    rctx.beginPath(); rctx.ellipse(sx, py(x, y, z0), 2.4 * sz, 1.2 * sz, 0, 0, Math.PI * 2); rctx.fill();
    rctx.fillStyle = b.color;
    rctx.fillRect(sx - 2 * sz, sy - 5 * sz, 4 * sz, 4.4 * sz);
    rctx.fillStyle = '#18242b';
    rctx.fillRect(sx - 1.6 * sz, sy - 7.8 * sz, 3.2 * sz, 2.8 * sz);
    rctx.fillStyle = Math.sin(now * 0.006 + (b.phase || 0)) > 0 ? '#5ef2d6' : '#38bdf8';
    rctx.fillRect(sx - 1.1 * sz, sy - 7 * sz, 2.2 * sz, 1.1 * sz);
    rctx.fillStyle = b.color;
    rctx.fillRect(sx - 0.4 * sz, sy - 10 * sz, 0.8 * sz, 2.2 * sz);
    rctx.fillStyle = orbit ? '#fbbf24' : '#5ef2d6';
    rctx.fillRect(sx - 0.9 * sz, sy - 10.8 * sz, 1.8 * sz, 1.4 * sz);
    // Package held by carrier bot
    if (b.carry) {
      rctx.fillStyle = '#fbbf24';
      rctx.fillRect(sx + 2 * sz, sy - 4 * sz, 2.5 * sz, 2.5 * sz);
    }
    // Task progress bar above bot
    if (b.prog !== undefined && rcam.z >= 0.8) {
      rctx.fillStyle = 'rgba(0,0,0,0.45)';
      rctx.fillRect(sx - 4 * sz, sy - 13.5 * sz, 8 * sz, 1.8 * sz);
      rctx.fillStyle = '#34d399';
      rctx.fillRect(sx - 4 * sz, sy - 13.5 * sz, 8 * sz * b.prog, 1.8 * sz);
    }
  }

  function drawBoat(b, L, now) {
    const dx = b.tx - b.fx, dy = b.ty - b.fy;
    const x = b.px + 0.5, y = b.py + 0.5;
    const lx = dx ? 0.22 : 0.1, ly = dy ? 0.22 : 0.1;
    box(x - lx, y - ly, x + lx, y + ly, -5, -1, b.color, L, { roof: '#efe7d6' });
    box(x - 0.06, y - 0.06, x + 0.06, y + 0.06, -1, 3, '#f2ece0', L);
    // Ripple wake behind boat
    const wx = px(x - dx * 0.25, y - dy * 0.25), wy = py(x - dx * 0.25, y - dy * 0.25, -5);
    rctx.strokeStyle = 'rgba(205, 245, 245, 0.35)';
    rctx.lineWidth = 1;
    rctx.beginPath(); rctx.ellipse(wx, wy, (3 + Math.sin(now * 0.008) * 1.5) * rcam.z, 1.5 * rcam.z, 0, 0, 7); rctx.stroke();
  }

  // ---------- world cache + sharp zoom pass ----------
  const PAD_X = 64, OY = 220;
  const OX = N * (TW / 2) + PAD_X;
  const WW = N * TW + PAD_X * 2;
  const WH = OY + N * TH + 48;
  let WS = 2; // supersampling of the cached world image; raised after zooming settles

  const worldCanvas = document.createElement('canvas');
  worldCanvas.width = Math.round(WW * WS);
  worldCanvas.height = Math.round(WH * WS);
  const wctx = worldCanvas.getContext('2d');

  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = WW;
  nightCanvas.height = WH;
  const nctx = nightCanvas.getContext('2d');

  function drawSlab(L) {
    const dep = 26;
    const bx = px(N, 0), by = py(N, 0);
    const cx = px(N, N), cy = py(N, N);
    const dx = px(0, N), dy = py(0, N);
    poly4(dx, dy, cx, cy, cx, cy + dep, dx, dy + dep, shade('#7a6a55', 0.9, L));
    poly4(cx, cy, bx, by, bx, by + dep, cx, cy + dep, shade('#675846', 0.9, L));
  }

  function buildWorld() {
    const savedW = warm; warm = 0;
    rcam = { x: OX, y: OY, z: 1 };
    const L = daylight(hour);

    rctx = wctx;
    wctx.setTransform(WS, 0, 0, WS, 0, 0);
    wctx.clearRect(0, 0, WW, WH);
    drawSlab(1);

    rctx = nctx;
    nctx.setTransform(1, 0, 0, 1, 0, 0);
    nctx.clearRect(0, 0, WW, WH);

    for (let s = 0; s <= 2 * N - 2; s++) {
      for (let x = Math.max(0, s - N + 1); x <= Math.min(N - 1, s); x++) {
        const y = s - x;
        rctx = wctx;
        drawTile(x, y, grid[x][y], 1, false);
        rctx = nctx;
        drawTileNight(x, y, grid[x][y], L);
      }
    }
    warm = savedW;
    worldDirty = false;
    winDirty = true;
  }

  const vigCanvas = document.createElement('canvas');
  vigCanvas.width = 256; vigCanvas.height = 256;
  (() => {
    const vc = vigCanvas.getContext('2d');
    const g = vc.createRadialGradient(128, 128, 76, 128, 128, 192);
    g.addColorStop(0, 'rgba(8,14,34,0)');
    g.addColorStop(1, 'rgba(8,14,34,1)');
    vc.fillStyle = g; vc.fillRect(0, 0, 256, 256);
  })();

  const seen = new Uint8Array(N * N);
  const ov = [];

  function addOccluders(rx, ry) {
    if (perfLevel >= 1) return;
    for (let dx = 0; dx <= 3; dx++) {
      const tx = rx + dx;
      if (tx < 0 || tx >= N) continue;
      for (let dy = 0; dy <= 3; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx - dy) > 2) continue;
        const ty = ry + dy;
        if (ty < 0 || ty >= N) continue;
        const idx = tx * N + ty;
        if (seen[idx]) continue;
        const t = grid[tx][ty];
        if (!t || isRoad(t) || t === 'water') continue;
        if ((dx > 1 || dy > 1) && t !== 'office' && t !== 'apt') continue;
        seen[idx] = 1;
        ov.push({ k: 0, s: tx + ty, x: tx, y: ty, t });
      }
    }
  }

  function buildingTopZ(x, y, t) {
    const lv = levels[x][y] || 1;
    let z = bldHeight(t, lv);
    if (t === 'office') z += lv >= 3 ? 22 : 14;
    else if (t === 'apt') z += lv >= 2 ? 10 : 4;
    else if (t === 'house' || t === 'school') z += 12;
    else if (t === 'wheel') z = 64;
    else if (t === 'windmill') z = 58;
    else if (t === 'plaza') z = 14;
    else z += 6;
    return z;
  }

  // Labels are expensive to lay out, so they are drawn to their own layer and only redrawn when something changes.
  function drawMapLabels(now) {
    const key = [cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(3), W, H, dpr, selectedTile ? selectedTile.join(',') : '', hover ? hover.join(',') : '', hoveredLabel || '', activeFilter, showLabels, darkMode, cbMode, Math.floor(now / 1000)].join('|');
    if (key !== labelKey) {
      labelKey = key;
      const saved = ctx;
      ctx = labelCtx;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      drawMapLabelsRaw(now);
      ctx = saved;
    }
    if (showLabels) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(labelCanvas, 0, 0); ctx.restore(); }
  }

  function drawMapLabelsRaw(now) {
    labelHits.length = 0;
    if (!showLabels) return;

    const items = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const id = pins[x][y];
      const t = grid[x][y];
      if (!id || !isBuilding(t)) continue;
      const item = getItem(id);
      const isSel = selectedTile && selectedTile[0] === x && selectedTile[1] === y;
      const isHov = (hover && hover[0] === x && hover[1] === y) || hoveredLabel === id;
      if (activeFilter === 'school' && !item.study && !isSel) continue;
      if (activeFilter === 'github' && item.kind !== 'github' && !isSel) continue;
      if (activeFilter === 'google' && item.kind !== 'google' && !isSel) continue;
      items.push({ x, y, t, item, prio: isSel ? 2 : isHov ? 1 : 0, depth: x + y });
    }
    items.sort((a, b) => b.prio - a.prio || b.depth - a.depth);

    ctx.font = '600 11.5px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    const placed = [];
    const overlaps = (rx, ry, rw, rh) => placed.some((p) => !(rx + rw + 4 < p.rx || p.rx + p.rw + 4 < rx || ry + rh + 4 < p.ry || p.ry + p.rh + 4 < ry));

    for (const it of items) {
      const z = buildingTopZ(it.x, it.y, it.t) + 8;
      const ax = px(it.x + 0.5, it.y + 0.5);
      const ay = py(it.x + 0.5, it.y + 0.5, z);
      if (ax < -90 || ax > W + 90 || ay < -40 || ay > H + 40) continue;

      const cached = it.item.kind === 'github' ? repoCache.get(it.item.id) : null;
      const issues = it.item.meta?.issues || cached?.meta?.issues || 0;
      const hasDeadline = deadlines.some((d) => d.place === it.item.id);
      const badgeTxt = it.item.id === 'pomodoro' && pomo.running
        ? ` · ${Math.floor(pomo.secLeft / 60)}:${String(pomo.secLeft % 60).padStart(2, '0')}`
        : issues > 0 ? ` (${issues})` : '';
      const label = it.item.name + badgeTxt;
      const tw = ctx.measureText(label).width;
      const rw = Math.round(tw + 24);
      const rh = 22;
      let rx = Math.round(ax - rw / 2);
      let ry = Math.round(ay - rh - 6);

      if (rx < 8) rx = 8;
      if (rx + rw > W - 8) rx = W - rw - 8;
      if (ry < 10) ry = 10;

      if (it.prio === 0 && overlaps(rx, ry, rw, rh)) {
        const altRy = ry - 24;
        if (altRy > 68 && !overlaps(rx, altRy, rw, rh)) ry = altRy;
        else {
          ctx.fillStyle = it.item.isPrivate ? '#d9a21f' : it.item.kind === 'google' ? '#0284c7' : '#0f766e';
          ctx.beginPath(); ctx.arc(ax, ay - 6, 5.5, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 1.6; ctx.stroke();
          labelHits.push({ x: it.x, y: it.y, rx: ax - 9, ry: ay - 15, rw: 18, rh: 18, id: it.item.id });
          continue;
        }
      }

      placed.push({ rx, ry, rw, rh });
      labelHits.push({ x: it.x, y: it.y, rx, ry, rw, rh, id: it.item.id });

      const active = it.prio > 0;
      const accentHex = cbMode ? '#0072b2' : '#0f766e';
      const dotCol = active ? '#5ef2d6' : hasDeadline ? '#ef4444' : it.item.isPrivate ? '#e69f00' : it.item.kind === 'google' ? '#0284c7' : accentHex;
      ctx.fillStyle = 'rgba(12, 20, 16, 0.22)';
      ctx.beginPath(); ctx.roundRect(rx, ry + 2, rw, rh, 99); ctx.fill();

      ctx.fillStyle = active ? accentHex : (darkMode ? 'rgba(51, 61, 41, 0.95)' : 'rgba(244, 241, 234, 0.96)');
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 99); ctx.fill();

      ctx.strokeStyle = active ? accentHex : 'rgba(29, 35, 32, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = dotCol;
      ctx.beginPath(); ctx.arc(rx + 10, ry + rh / 2, 3.3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = active ? '#ffffff' : (darkMode ? '#edf2ee' : '#1d2320');
      ctx.textAlign = 'left';
      ctx.fillText(label, rx + 17, ry + rh / 2 + 0.5);

      // Homework deadline flag badge on roof corner
      if (hasDeadline) {
        ctx.fillStyle = cbMode ? '#d55e00' : '#ef4444';
        ctx.fillRect(ax + 12, ay - 2, 10, 6);
      }

      // Billboard on selected high-zoom office showing latest commit text
      if (active && cam.z >= 1.25 && cached?.commits?.[0]) {
        const msg = (cached.commits[0].commit?.message || '').split('\n')[0].slice(0, 26);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(rx, ry - 18, Math.max(rw, 120), 15);
        ctx.fillStyle = '#5ef2d6';
        ctx.font = '600 9.5px system-ui, sans-serif';
        ctx.fillText(msg, rx + 5, ry - 10);
        ctx.font = '600 11.5px system-ui, -apple-system, "Segoe UI", sans-serif';
      }

      // Flashing red CI failure alarm or CI smoke
      if (cached?.failed) {
        if (Math.sin(now * 0.014) > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath(); ctx.arc(ax, ay - 2, 4, 0, 7); ctx.fill();
        }
      }
    }
  }


  function draw(now, dt, transparentBg = false) {
    const L = daylight(hour);
    warm = Math.max(0, 1 - Math.abs(hour - 17.6) / 2.2, 1 - Math.abs(hour - 6.4) / 1.6);

    if (worldDirty) buildWorld();

    const th = curTheme();
    rctx = ctx;
    rcam = cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (transparentBg) {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.fillStyle = mix(th.skyNight, th.skyDay, L);
      ctx.fillRect(0, 0, W, H);

      // Moving stars & Moon arc
      if (L < 0.5) {
        const sa = (0.5 - L) * 1.8;
        ctx.fillStyle = '#e7ecff';
        const drift = (hour / 24) * 0.2;
        for (let i = 0; i < stars.length; i++) {
          const st = stars[i];
          ctx.globalAlpha = sa * (0.45 + 0.55 * Math.sin(now * 0.002 + st.phase));
          ctx.fillRect(((st.x + drift) % 1) * W, st.y * H * 0.58, st.s, st.s);
        }
        ctx.globalAlpha = Math.min(0.95, sa);
        const moonP = ((hour >= 18 ? hour - 18 : hour + 6) / 12);
        const mx = moonP * W * 0.8 + W * 0.1;
        const my = H * 0.18 - Math.sin(moonP * Math.PI) * (H * 0.1);
        ctx.fillStyle = '#f8f5dc';
        ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = mix(th.skyNight, th.skyDay, L);
        ctx.beginPath(); ctx.arc(mx - 4, my - 2, 11, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Always blit the cached world image (fast). Its resolution is raised when zoomed in (see ensureWorldRes).
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(worldCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);

    // Animated water ripples
    if (!reduceMotion && perfLevel < 1 && waterCells.length && L > 0.25) {
      ctx.fillStyle = `rgba(195, 240, 238, ${(L * 0.36).toFixed(2)})`;
      const step = Math.max(1, Math.floor(waterCells.length / 18));
      const t = now * 0.0022;
      for (let i = 0; i < waterCells.length; i += step) {
        const [wx, wy] = waterCells[i];
        if (Math.sin(t + wx * 2.1 + wy * 3.7) < 0.45) continue;
        const sx = px(wx + 0.5, wy + 0.5), sy = py(wx + 0.5, wy + 0.5, -5);
        if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) ctx.fillRect(sx, sy, 5 * cam.z, 1.5 * cam.z);
      }
    }

    // Traffic lights at intersections
    const nsCol = trafficSignalNS() === 'green' ? '#34d399' : trafficSignalNS() === 'yellow' ? '#fbbf24' : '#ef4444';
    const ewCol = trafficSignalEW() === 'green' ? '#34d399' : trafficSignalEW() === 'yellow' ? '#fbbf24' : '#ef4444';
    for (const cidx of crossings) {
      const cx = (cidx / N) | 0, cy = cidx % N;
      const sx = px(cx + 0.12, cy + 0.88), sy = py(cx + 0.12, cy + 0.88, 7);
      if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(sx - 1 * cam.z, sy, 2 * cam.z, 7 * cam.z);
      ctx.fillStyle = nsCol;
      ctx.beginPath(); ctx.arc(sx, sy, 2.2 * cam.z, 0, 7); ctx.fill();
      ctx.fillStyle = ewCol;
      ctx.beginPath(); ctx.arc(sx + 4 * cam.z, sy, 2.2 * cam.z, 0, 7); ctx.fill();
    }

    seen.fill(0);
    ov.length = 0;
    vehicleHits.length = 0;

    for (let i = 0; i < wheelsList.length; i++) ov.push({ k: 4, s: wheelsList[i][0] + wheelsList[i][1] + 0.1, x: wheelsList[i][0], y: wheelsList[i][1] });
    for (let i = 0; i < millsList.length; i++) ov.push({ k: 5, s: millsList[i][0] + millsList[i][1] + 0.1, x: millsList[i][0], y: millsList[i][1] });

    if (showAgents) {
      for (const c of cars) {
        const cx0 = px(c.px + 0.5, c.py + 0.5), cy0 = py(c.px + 0.5, c.py + 0.5);
        if (cx0 < -40 || cx0 > W + 40 || cy0 < -40 || cy0 > H + 40) continue;
        ov.push({ k: 1, s: c.px + c.py, c }); addOccluders(Math.floor(c.px), Math.floor(c.py));
      }
      for (const w of walkers) {
        const wx0 = px(w.px + 0.5, w.py + 0.5), wy0 = py(w.px + 0.5, w.py + 0.5);
        if (wx0 < -30 || wx0 > W + 30 || wy0 < -30 || wy0 > H + 30) continue;
        ov.push({ k: 2, s: w.px + w.py, w }); addOccluders(Math.floor(w.px), Math.floor(w.py));
      }
      for (const b of bots) {
        const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
        if (bx0 < -30 || bx0 > W + 30 || by0 < -30 || by0 > H + 30) continue;
        ov.push({ k: 6, s: b.px + b.py, b }); addOccluders(Math.floor(b.px), Math.floor(b.py));
      }
      for (const b of boats) {
        const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
        if (bx0 < -40 || bx0 > W + 40 || by0 < -40 || by0 > H + 40) continue;
        ov.push({ k: 3, s: b.px + b.py, b }); addOccluders(Math.floor(b.px), Math.floor(b.py));
      }
    }

    if (selectedTile) {
      const [sx, sy] = selectedTile;
      const st = grid[sx]?.[sy];
      if (isBuilding(st)) {
        if (!seen[sx * N + sy]) { seen[sx * N + sy] = 1; ov.push({ k: 0, s: sx + sy, x: sx, y: sy, t: st }); }
        if (false) {
          for (let i = 0; i < 3; i++) {
            const ang = (reduceMotion ? 0.6 : now * 0.0022) + i * 2.0944;
            const bx = sx + 0.5 + Math.cos(ang) * 0.58, by = sy + 0.5 + Math.sin(ang) * 0.58;
            ov.push({ k: 7, s: bx + by, b: { px: bx, py: by, phase: i * 2.1, prog: ((now * 0.0003 + i * 0.3) % 1), color: BOT_COLORS[i] } });
          }
        }
        addOccluders(sx, sy);
      }
    }

    if (ov.length) {
      const savedW = warm; warm = 0;
      if (ov.length > 1) ov.sort((a, b) => a.s - b.s || a.k - b.k);
      for (const it of ov) {
        if (it.k === 1) drawCar(it.c, 1, false);
        else if (it.k === 2) drawWalker(it.w, now);
        else if (it.k === 3) drawBoat(it.b, 1, now);
        else if (it.k === 4) drawWheelSpin(it.x, it.y, now, 1);
        else if (it.k === 5) drawMillSpin(it.x, it.y, now, 1);
        else if (it.k === 6) drawBot(it.b, now, false);
        else if (it.k === 7) drawBot(it.b, now, true);
        else drawTile(it.x, it.y, it.t, 1, it.t !== 'bridge');
      }
      warm = savedW;
    }

    // Tiny dogs in parks/roads & flying delivery drones over rooftops
    if (showAgents) {
      for (const dg of dogs) {
        const dx = px(dg.px + 0.3, dg.py + 0.7), dy = py(dg.px + 0.3, dg.py + 0.7, 1);
        ctx.fillStyle = '#9a6338';
        ctx.fillRect(dx - 1.5 * cam.z, dy - 2 * cam.z, 3 * cam.z, 2 * cam.z);
      }
      for (const dr of drones) {
        const dx = px(dr.x, dr.y), dy = py(dr.x, dr.y, 68 + Math.sin(now * 0.007 + dr.phase) * 3);
        ctx.fillStyle = '#1e293b'; ctx.fillRect(dx - 3 * cam.z, dy - 1.5 * cam.z, 6 * cam.z, 2.5 * cam.z);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(dx - 1.5 * cam.z, dy + 1 * cam.z, 3 * cam.z, 2.2 * cam.z);
      }
      for (const bd of birds) {
        const bx = bd.x * W, by = bd.y * H + Math.sin(now * 0.005 + bd.phase) * 8;
        ctx.strokeStyle = 'rgba(20, 26, 22, 0.65)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(bx - 4, by - 2); ctx.lineTo(bx, by); ctx.lineTo(bx + 4, by - 2); ctx.stroke();
      }
    }

    // Route line for selected vehicle
    if (selectedVehicle && selectedVehicle.route?.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      selectedVehicle.route.forEach(([rx, ry], idx) => {
        const x0 = px(rx + 0.5, ry + 0.5), y0 = py(rx + 0.5, ry + 0.5, 4);
        if (idx === 0) ctx.moveTo(x0, y0); else ctx.lineTo(x0, y0);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Sunrise/sunset & night grading
    if (!transparentBg && (warm > 0.02 || L < 0.98)) {
      const wa = warm * 0.14;
      const na = (1 - L) * (weather === 'overcast' ? 0.74 : 0.68);
      const a = wa + na * (1 - wa);
      if (a > 0.004) {
        const r = Math.round((255 * wa + 10 * na * (1 - wa)) / a);
        const g = Math.round((155 * wa + 18 * na * (1 - wa)) / a);
        const b = Math.round((45 * wa + 40 * na * (1 - wa)) / a);
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    if (L < 0.72) {
      ctx.globalAlpha = Math.min(1, (0.72 - L) * 2.4);
      ctx.drawImage(nightCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);
      ctx.globalAlpha = 1;
      if (winDirty) buildWinSprites();
      for (let i = 0; i < winSprites.length; i++) {
        const ws = winSprites[i];
        const winThresh = 0.22 + ((ws.x * 13 + ws.y * 7) % 24) * 0.015;
        const fade = Math.min(1, ((1 - L) - winThresh) / 0.07); // smooth switch-on over a short span of dusk
        if (fade <= 0) continue;
        const sx = cam.x + (ws.left - OX) * cam.z, sy = cam.y + (ws.top - OY) * cam.z;
        if (sx > W || sy > H || sx + ws.w * cam.z < 0 || sy + ws.h * cam.z < 0) continue;
        ctx.globalAlpha = fade;
        ctx.drawImage(ws.c, sx, sy, ws.w * cam.z, ws.h * cam.z);
      }
      ctx.globalAlpha = 1;
    }
    if (L < 0.5 && cars.length && showAgents) {
      for (const it of ov) if (it.k === 1) drawCar(it.c, L, true);
    }

    // Rain weather overlay
    if (!transparentBg && (weather === 'rain' || activeDisaster === 'storm')) {
      ctx.strokeStyle = 'rgba(180, 215, 235, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const rd of raindrops) {
        rd.x = (rd.x + dt * 0.12) % 1;
        rd.y = (rd.y + dt * rd.sp) % 1;
        const rx = rd.x * W, ry = rd.y * H;
        ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + rd.len);
      }
      ctx.stroke();
    }

    // Confetti particles
    for (const cf of confetti) {
      ctx.fillStyle = cf.col;
      ctx.fillRect(px(cf.x, cf.y), py(cf.x, cf.y, cf.z), 4, 4);
    }

    if (hover && pins[hover[0]]?.[hover[1]]) {
      const [x, y] = hover;
      ctx.strokeStyle = 'rgba(15, 118, 110, 0.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(x, y), py(x, y)); ctx.lineTo(px(x + 1, y), py(x + 1, y));
      ctx.lineTo(px(x + 1, y + 1), py(x + 1, y + 1)); ctx.lineTo(px(x, y + 1), py(x, y + 1));
      ctx.closePath(); ctx.stroke();
    }

    if (selectedTile) {
      const [x, y] = selectedTile;
      const pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(now * 0.006);
      const pad = 0.06 + pulse * 0.06;
      quadZ(x, y, x + 1, y + 1, 0, 'rgba(15, 118, 110, 0.18)');
      ctx.strokeStyle = cbMode ? '#0072b2' : '#0f766e'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(px(x, y), py(x, y)); ctx.lineTo(px(x + 1, y), py(x + 1, y));
      ctx.lineTo(px(x + 1, y + 1), py(x + 1, y + 1)); ctx.lineTo(px(x, y + 1), py(x, y + 1));
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = `rgba(94, 242, 214, ${(0.35 + pulse * 0.45).toFixed(2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px(x - pad, y - pad), py(x - pad, y - pad));
      ctx.lineTo(px(x + 1 + pad, y - pad), py(x + 1 + pad, y - pad));
      ctx.lineTo(px(x + 1 + pad, y + 1 + pad), py(x + 1 + pad, y + 1 + pad));
      ctx.lineTo(px(x - pad, y + 1 + pad), py(x - pad, y + 1 + pad));
      ctx.closePath(); ctx.stroke();
    }

    if (!transparentBg && L < 0.6) {
      ctx.globalAlpha = (0.6 - L) * 0.6;
      ctx.drawImage(vigCanvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    if (!transparentBg) drawMapLabels(now);
    drawExtras(now, transparentBg);
  }

  // ---------- rotate ----------
  function rotateCity(cw = true) {
    const ng = Array.from({ length: N }, () => Array(N).fill(null));
    const nl = makeLevels();
    const np = makePins();
    const rx = (x, y) => cw ? N - 1 - y : y;
    const ry = (x, y) => cw ? x : N - 1 - x;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const nx = rx(x, y), ny = ry(x, y);
      ng[nx][ny] = grid[x][y]; nl[nx][ny] = levels[x][y]; np[nx][ny] = pins[x][y];
    }
    grid = ng; levels = nl; pins = np;
    for (const list of [cars, walkers, boats, bots, dogs]) {
      for (const c of list) {
        const fx = rx(c.fx, c.fy), fy = ry(c.fx, c.fy);
        const tx = rx(c.tx, c.ty), ty = ry(c.tx, c.ty);
        c.fx = fx; c.fy = fy; c.tx = tx; c.ty = ty;
        c.px = c.fx + (c.tx - c.fx) * c.t; c.py = c.fy + (c.ty - c.fy) * c.t;
      }
    }
    if (selectedTile) selectedTile = [rx(selectedTile[0], selectedTile[1]), ry(selectedTile[0], selectedTile[1])];
    smokes.length = 0;
    worldDirty = true;
    recompute(); scheduleSave();
    audio.sfx('tap');
  }

  // ---------- GitHub API & Weather ----------
  function timeAgo(iso) {
    if (!iso) return 'active';
    const sec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }

  // GitHub allows only 60 anonymous requests per hour, so responses are cached for 3 hours and
  // requests pause (serving cached data) after a rate-limit response, with one notice per pause.
  const GH_TTL = 3 * 60 * 60 * 1000; // repo data rarely changes, so keep it 3 hours (saved across visits)
  let ghBlockedUntil = 0, ghToastFor = 0;
  function ghCacheGet(url) { try { const v = JSON.parse(localStorage.getItem('ghc:' + url)); return v && v.d !== undefined ? v : null; } catch (e) { return null; } }
  function ghCacheSet(url, d) { try { localStorage.setItem('ghc:' + url, JSON.stringify({ t: Date.now(), d })); } catch (e) { /* quota */ } }
  async function fetchJsonTimed(url, ms = 5000) {
    const isGh = url.startsWith('https://api.github.com/');
    const cached = isGh ? ghCacheGet(url) : null;
    if (cached && Date.now() - cached.t < GH_TTL) return cached.d;
    if (isGh && Date.now() < ghBlockedUntil) return cached ? cached.d : null;
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), ms);
    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        if (isGh && (res.status === 403 || res.status === 429)) {
          const reset = Number(res.headers.get('x-ratelimit-reset'));
          ghBlockedUntil = reset ? reset * 1000 + 2000 : Date.now() + 10 * 60 * 1000;
          if (ghToastFor !== ghBlockedUntil) { ghToastFor = ghBlockedUntil; notify('GitHub rate limit reached. Showing saved data until it resets.', 3500); }
        }
        return cached ? cached.d : null;
      }
      const d = await res.json();
      if (isGh) ghCacheSet(url, d);
      return d;
    } catch (e) { return cached ? cached.d : null; }
    finally { clearTimeout(tid); }
  }

  function updateCountUI() {
    $('repoCount').textContent = `${allItems().length} places`;
  }

  function refreshTickerUI() {
    const btn = $('tickerLink');
    if (!tickerQueue.length) {
      btn.textContent = 'Full City ready: explore North Bank (GitHub) or South Bank (Google & Study)';
      return;
    }
    const item = tickerQueue[tickerIdx % tickerQueue.length];
    btn.textContent = `${item.repo} · ${item.sha}: ${item.msg} (${item.ago})`;
  }
  setInterval(() => {
    if (tickerQueue.length > 1) { tickerIdx++; refreshTickerUI(); }
  }, 4500);
  $('tickerLink').onclick = () => {
    const item = tickerQueue[tickerIdx % Math.max(1, tickerQueue.length)];
    if (item?.repo) focusItemById(item.repo);
  };

  async function fetchUserRepos(force = false) {
    const list = await fetchJsonTimed(`https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=40&sort=updated`);
    if (!Array.isArray(list)) return;
    let added = false;
    for (const r of list) {
      if (!r || !r.name) continue;
      if (r.name === 'co-bo-u') continue;
      const existing = repoMap.get(r.name);
      const webUrl = r.homepage && r.homepage.startsWith('http')
        ? r.homepage
        : (r.has_pages ? `https://${GITHUB_OWNER.toLowerCase()}.github.io/${r.name}/` : existing?.web || '');
      const meta = {
        stars: r.stargazers_count ?? 0,
        issues: r.open_issues_count ?? 0,
        branch: r.default_branch || 'main',
        pushedAt: r.pushed_at || r.updated_at,
      };
      if (existing) {
        if (r.description) existing.desc = r.description;
        if (r.language) existing.lang = r.language;
        if (webUrl) existing.web = webUrl;
        existing.meta = meta;
      } else {
        const entry = {
          id: r.name, kind: 'github', name: r.name, lang: r.language || 'Web',
          desc: r.description || `${r.name} repository by ${GITHUB_OWNER}.`,
          web: webUrl, git: r.html_url || `https://github.com/${GITHUB_OWNER}/${r.name}`, meta,
        };
        REPOS.push(entry);
        repoMap.set(entry.id, entry);
        added = true;
      }
      // Grow tower floor automatically for active repos
      const tile = findItemTile(r.name);
      if (tile && r.size > 200) levels[tile[0]][tile[1]] = Math.max(levels[tile[0]][tile[1]], 2);
    }
    if (added) assignUnpinnedItems();
    worldDirty = true;
    if (force) repoCache.clear();
    updateCountUI();

    // Seed bottom commit ticker from top 3 updated public repos
    tickerQueue.length = 0;
    const topRepos = list.slice(0, 4);
    await Promise.all(topRepos.map(async (r) => {
      const commits = await fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${r.name}/commits?per_page=2`);
      if (Array.isArray(commits)) {
        for (const c of commits) {
          tickerQueue.push({
            repo: r.name,
            sha: (c.sha || '').slice(0, 7),
            msg: (c.commit?.message || '').split('\n')[0].slice(0, 48),
            ago: timeAgo(c.commit?.author?.date),
          });
        }
      }
    }));
    unreadNotifs = tickerQueue.length;
    const badge = $('notifBadge');
    badge.textContent = String(unreadNotifs);
    badge.hidden = unreadNotifs === 0;
    refreshTickerUI();
  }

  async function fetchLocalWeather() {
    const res = await fetchJsonTimed('https://api.open-meteo.com/v1/forecast?latitude=10.82&longitude=106.63&current_weather=true');
    if (!res?.current_weather) return;
    const code = res.current_weather.weathercode;
    weather = (code >= 51 && code <= 99) ? 'rain' : (code >= 2 && code <= 3) ? 'overcast' : 'clear';
    syncBodyPrefs();
    scheduleSave();
  }

  async function fetchRepoActivity(repo, force = false, branchOverride = null) {
    if (repo.isCustom || !repo.git) return null;
    const prev = repoCache.get(repo.id);
    const now = Date.now();
    if (!force && !branchOverride && prev && (prev.loading || now - prev.at < 120000)) return prev;

    const br = branchOverride || repo.meta?.branch || 'main';
    const entry = {
      at: now, loading: true, live: false, branch: br,
      bots: [{ name: 'CommitBot', state: 'ok', task: 'Syncing commits' }, { name: 'DeployBot', state: 'ok', task: 'Checking workflows' }, { name: 'ReviewBot', state: 'busy', task: 'Reading tree' }],
      commits: [], files: [], branches: [], langs: {}, prs: [], issues: [], readme: '', failed: false,
    };
    repoCache.set(repo.id, entry);

    if (repo.isPrivate) {
      entry.loading = false;
      entry.bots = [
        { name: 'CommitBot', state: 'ok', task: `Private mirror on ${GITHUB_OWNER}/${repo.name}` },
        { name: 'DeployBot', state: 'ok', task: `Live web app configured` },
        { name: 'ReviewBot', state: 'busy', task: `Sign-in skipped; open URL directly` },
      ];
      if (selectedTile && pins[selectedTile[0]][selectedTile[1]] === repo.id) renderDetailsUI(repo);
      return entry;
    }

    const [repoInfo, commits, runs, files, branches, langs, prs, issues, readmeObj] = await Promise.all([
      repo.meta ? Promise.resolve(null) : fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/commits?sha=${encodeURIComponent(br)}&per_page=8${repo.path ? '&path=' + encodeURIComponent(repo.path) : ''}`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/actions/runs?per_page=2`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/contents${repo.path ? '/' + repo.path : ''}?ref=${encodeURIComponent(br)}`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/branches?per_page=8`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/languages`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/pulls?state=open&per_page=6`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/issues?state=open&per_page=6`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.api || repo.id}/readme`),
    ]);

    if (repoInfo) {
      repo.meta = { stars: repoInfo.stargazers_count ?? 0, issues: repoInfo.open_issues_count ?? 0, branch: repoInfo.default_branch || 'main', pushedAt: repoInfo.pushed_at };
      if (repoInfo.description) repo.desc = repoInfo.description;
    }

    entry.at = Date.now();
    entry.loading = false;
    entry.meta = repo.meta;
    if (Array.isArray(commits) && commits.length) {
      entry.live = true;
      entry.commits = commits;
      const run0 = runs?.workflow_runs?.[0];
      entry.failed = run0?.conclusion === 'failure';
      if (entry.failed) recentRepoErrors.add(repo.id); else recentRepoErrors.delete(repo.id);
      if (run0?.conclusion === 'success' && selectedTile && pins[selectedTile[0]][selectedTile[1]] === repo.id) {
        spawnConfetti(selectedTile[0], selectedTile[1], 45);
      }
      const c0 = commits[0];
      entry.bots = [
        { name: 'CommitBot', state: 'ok', task: `${(c0.sha || '').slice(0, 7)} (${timeAgo(c0.commit?.author?.date)}): ${(c0.commit?.message || '').split('\n')[0].slice(0, 44)}` },
        { name: 'DeployBot', state: entry.failed ? 'err' : 'ok', task: run0 ? `${run0.name}: ${run0.conclusion || run0.status}` : `Live site ready` },
        { name: 'ReviewBot', state: 'busy', task: `Tracking ${commits.length} commits on ${br}` },
      ];
    }
    if (Array.isArray(files)) entry.files = [...files].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    if (Array.isArray(branches)) entry.branches = branches.map((b) => b.name);
    if (langs && typeof langs === 'object') entry.langs = langs;
    if (Array.isArray(prs)) entry.prs = prs;
    if (Array.isArray(issues)) entry.issues = issues.filter((i) => !i.pull_request);
    if (readmeObj?.content) {
      try { entry.readme = atob(readmeObj.content.replace(/\n/g, '')).slice(0, 650); } catch (e) {}
    }

    if (selectedTile && pins[selectedTile[0]][selectedTile[1]] === repo.id) renderDetailsUI(repo);
    return entry;
  }

  // ---------- inspector workspace panel ----------
  function renderLocalStudyTools(item) {
    const box = $('localStudyBox');
    box.innerHTML = '';
    if (!item.localTool) { box.hidden = true; return; }
    box.hidden = false;

    if (item.localTool === 'pomodoro') {
      const mm = String(Math.floor(pomo.secLeft / 60)).padStart(2, '0');
      const ss = String(pomo.secLeft % 60).padStart(2, '0');
      box.innerHTML = `
        <div class="bots-head"><span class="stat-label">Study focus timer · Streak ${studyStreak}d</span><span class="bots-live">${pomo.mode === 'work' ? 'Focus' : 'Break'}</span></div>
        <div class="pomo-display" id="pomoTime">${mm}:${ss}</div>
        <div class="field-row">
          <button id="pomoToggle" class="chip small primary" type="button">${pomo.running ? 'Pause' : 'Start 25m'}</button>
          <button id="pomoBreak" class="chip small" type="button">5m Break</button>
          <button id="pomoReset" class="chip small" type="button">Reset</button>
        </div>`;
      $('pomoToggle').onclick = () => {
        pomo.running = !pomo.running;
        if (pomo.running && !pomo.timer) {
          pomo.timer = setInterval(() => {
            if (!pomo.running) return;
            pomo.secLeft--;
            if (pomo.secLeft <= 0) {
              pomo.running = false;
              clearInterval(pomo.timer); pomo.timer = 0;
              if (pomo.mode === 'work') { simStats.pomodoros++; studyStreak++; saveNow(); }
              if (selectedTile) spawnConfetti(selectedTile[0], selectedTile[1], 36);
              pomo.secLeft = 25 * 60;
            }
            const pt = $('pomoTime');
            if (pt) pt.textContent = `${String(Math.floor(pomo.secLeft / 60)).padStart(2, '0')}:${String(pomo.secLeft % 60).padStart(2, '0')}`;
          }, 1000);
        }
        renderLocalStudyTools(item);
      };
      $('pomoBreak').onclick = () => { pomo.running = false; pomo.mode = 'break'; pomo.secLeft = 5 * 60; renderLocalStudyTools(item); };
      $('pomoReset').onclick = () => { pomo.running = false; pomo.mode = 'work'; pomo.secLeft = 25 * 60; renderLocalStudyTools(item); };
    } else if (item.localTool === 'notes') {
      const lbl = document.createElement('span'); lbl.className = 'stat-label'; lbl.textContent = 'Local study scratchpad (auto-saved)';
      const ta = document.createElement('textarea'); ta.className = 'field-input note-area'; ta.value = quickNoteText;
      ta.oninput = () => { quickNoteText = ta.value; scheduleSave(); };
      box.append(lbl, ta);
    }
  }

  function renderDetailsUI(item) {
    const isGit = item.kind === 'github' && !item.isCustom;
    const cached = isGit ? repoCache.get(item.id) : null;
    const meta = item.meta || {};
    const branch = cached?.branch || meta.branch || 'main';
    let host = 'Local';
    try { host = item.web ? new URL(item.web).hostname.replace(/^www\./, '') : 'Local'; } catch (e) {}

    // Account chooser visible for Google web apps
    const isGoogleAcct = item.kind === 'google' && !item.localTool && !item.isCustom && item.id !== 'seqta' && item.id !== 'mybib';
    $('accountRow').hidden = !isGoogleAcct;
    if (isGoogleAcct) {
      const forced = FORCED_ACCT[item.id];
      const curA = String(forced !== undefined ? forced : (accountPrefs[item.id] ?? globalAcct));
      $('acctNote').textContent = item.id === 'google-chat' ? 'Chat always uses your school account' : item.id === 'google-calendar' ? 'Calendar is personal only' : item.id === 'toddle' ? 'Toddle is school only' : '';
      document.querySelectorAll('.acct-btn').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.acct === curA));
        b.disabled = forced !== undefined;
        b.onclick = () => {
          accountPrefs[item.id] = Number(b.dataset.acct);
          scheduleSave();
          renderInspect();
        };
      });
    }

    renderLocalStudyTools(item);

    // Metrics
    const metricsEl = $('inspMetrics');
    metricsEl.innerHTML = '';
    const cells = isGit ? [
      ['Lang', item.lang || 'Web'],
      ['Stars', meta.stars !== undefined ? String(meta.stars) : (item.isPrivate ? '-' : '0')],
      ['Issues', String(meta.issues ?? cached?.issues?.length ?? 0)],
      ['PRs', String(cached?.prs?.length ?? 0)],
    ] : [
      ['District', 'South'],
      ['Category', item.cat || 'App'],
      ['Host', host.split('.')[0]],
      ['Pinned', String((bookmarks[item.id] || []).length)],
    ];
    for (const [lbl, val] of cells) {
      const cell = document.createElement('div'); cell.className = 'metric-cell';
      const lEl = document.createElement('span'); lEl.className = 'stat-label'; lEl.textContent = lbl;
      const vEl = document.createElement('span'); vEl.className = 'metric-val'; vEl.textContent = val;
      cell.append(lEl, vEl); metricsEl.appendChild(cell);
    }

    // Bots
    const botsData = isGit ? (cached?.bots || []) : [
      { name: 'LinkBot', state: 'ok', task: `Portal saved (${host}); zero sign-in prompts` },
      { name: 'SyncBot', state: 'ok', task: `${(item.shortcuts || []).length} quick shortcuts ready` },
      { name: 'StudyBot', state: 'busy', task: `${deadlines.filter((d) => d.place === item.id).length} map deadline flags` },
    ];
    $('botsLive').textContent = isGit ? (cached?.loading ? 'Syncing' : cached?.live ? 'Live' : 'Ready') : 'Ready';
    const botsEl = $('inspBots'); botsEl.innerHTML = '';
    for (const bot of botsData) {
      const row = document.createElement('div'); row.className = 'bot-item';
      const dot = document.createElement('span');
      dot.className = 'bot-dot' + (bot.state === 'busy' ? ' busy' : bot.state === 'err' ? ' err' : '');
      const body = document.createElement('div');
      const nEl = document.createElement('div'); nEl.className = 'bot-name'; nEl.textContent = bot.name;
      const tEl = document.createElement('div'); tEl.className = 'bot-task'; tEl.textContent = bot.task;
      body.append(nEl, tEl); row.append(dot, body); botsEl.appendChild(row);
    }

    // Language breakdown pie/bar & commit sparkline
    const langEntries = cached?.langs ? Object.entries(cached.langs) : [];
    $('langBarBox').hidden = !isGit || !langEntries.length;
    if (langEntries.length) {
      const total = langEntries.reduce((s, [, v]) => s + v, 0) || 1;
      const bar = $('langBar'), leg = $('langLegend');
      bar.innerHTML = ''; leg.innerHTML = '';
      for (const [ln, val] of langEntries.slice(0, 5)) {
        const pct = Math.max(2, Math.round((val / total) * 100));
        const seg = document.createElement('div');
        seg.style.width = pct + '%';
        seg.style.background = D.LANG_COLORS[ln] || '#64748b';
        bar.appendChild(seg);
        const sp = document.createElement('span'); sp.textContent = `${ln} ${pct}%`; leg.appendChild(sp);
      }
    }

    $('sparkBox').hidden = !isGit || !(cached?.commits?.length);
    if (cached?.commits?.length) {
      const bins = [2, 3, 1, 4, 2, Math.min(6, cached.commits.length), 3, 5];
      $('sparkWrap').innerHTML = `<svg width="100%" height="26" viewBox="0 0 160 26" aria-hidden="true">${
        bins.map((v, i) => `<rect x="${i * 20}" y="${26 - v * 4}" width="14" height="${v * 4}" rx="3" fill="var(--accent)" opacity="${0.45 + i * 0.07}"/>`).join('')
      }</svg>`;
    }

    // Tabs 2, 3, 4
    $('tab2Btn').textContent = isGit ? 'Commits' : (item.id === 'seqta' ? 'Timetable' : 'Shortcuts');
    $('tab3Btn').textContent = isGit ? 'Files' : 'Pinned';
    $('tab4Btn').textContent = isGit ? 'Issues/PRs' : 'Deadlines';

    $('branchBar').hidden = !isGit || !(cached?.branches?.length);
    if (cached?.branches?.length) {
      const bs = $('branchSelect'); bs.innerHTML = '';
      for (const b of cached.branches) {
        const o = document.createElement('option'); o.value = b; o.textContent = b; bs.appendChild(o);
      }
      bs.value = branch;
      bs.onchange = () => fetchRepoActivity(item, true, bs.value);
    }

    $('pinBookmarkForm').hidden = isGit || !!item.localTool;
    $('deadlineForm').hidden = isGit;

    const l2 = $('inspSecondList'); l2.innerHTML = '';
    const l3 = $('inspThirdList'); l3.innerHTML = '';
    const l4 = $('inspFourthList'); l4.innerHTML = '';
    $('readmeBox').hidden = true;

    if (isGit) {
      if (cached?.commits?.length) {
        for (const c of cached.commits) {
          const a = document.createElement('a'); a.className = 'detail-row';
          a.href = c.html_url || `${item.git}/commits/${branch}`; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.innerHTML = `<div class="detail-top"><code class="sha">${(c.sha || '').slice(0, 7)}</code><span class="detail-meta">${timeAgo(c.commit?.author?.date)}</span></div><div class="detail-sub"></div>`;
          a.querySelector('.detail-sub').textContent = (c.commit?.message || '').split('\n')[0];
          l2.appendChild(a);
        }
      } else {
        const p = document.createElement('p'); p.className = 'insp-body';
        p.textContent = item.isPrivate ? 'Private repo mirror. Use Open live site above without sign-up.' : 'No public commits loaded.';
        l2.appendChild(p);
      }

      if (cached?.readme) {
        $('readmeBox').hidden = false;
        $('readmeBox').textContent = cached.readme;
      }
      if (cached?.files?.length) {
        for (const f of cached.files.slice(0, 20)) {
          const a = document.createElement('a'); a.className = 'detail-row';
          a.href = f.type === 'dir' ? `${item.git}/tree/${branch}/${f.path}` : `https://vscode.dev/github/${GITHUB_OWNER}/${item.id}/blob/${branch}/${f.path}`;
          a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">${f.type === 'dir' ? 'Folder' : 'View'}</span></div>`;
          a.querySelector('.detail-title').textContent = f.type === 'dir' ? `${f.name}/` : f.name;
          l3.appendChild(a);
        }
      }

      for (const pr of (cached?.prs || [])) {
        const a = document.createElement('a'); a.className = 'detail-row'; a.href = pr.html_url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">PR #${pr.number}</span></div>`;
        a.querySelector('.detail-title').textContent = pr.title;
        l4.appendChild(a);
      }
      for (const iss of (cached?.issues || [])) {
        const a = document.createElement('a'); a.className = 'detail-row'; a.href = iss.html_url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">Issue #${iss.number}</span></div>`;
        a.querySelector('.detail-title').textContent = iss.title;
        l4.appendChild(a);
      }
      if (!l4.children.length) {
        const p = document.createElement('p'); p.className = 'insp-body'; p.textContent = 'No open issues or pull requests.';
        l4.appendChild(p);
      }
    } else {
      if (item.id === 'seqta') {
        for (const row of timetable) {
          const r = document.createElement('div'); r.className = 'detail-row';
          r.innerHTML = `<div class="detail-top"><span class="detail-title">${row.day}</span><span class="detail-meta">4 periods</span></div><div class="detail-sub">${row.p1} · ${row.p2} · ${row.p3} · ${row.p4}</div>`;
          l2.appendChild(r);
        }
      } else {
        for (const s of (item.shortcuts || [])) {
          const a = document.createElement('a'); a.className = 'detail-row'; a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">Open</span></div><div class="detail-sub"></div>`;
          a.querySelector('.detail-title').textContent = s.label;
          a.querySelector('.detail-sub').textContent = s.sub || s.url;
          l2.appendChild(a);
        }
      }

      const bms = bookmarks[item.id] || [];
      bms.forEach((bm, idx) => {
        const wrap = document.createElement('div'); wrap.className = 'bookmark-row';
        const a = document.createElement('a'); a.className = 'detail-row'; a.href = bm.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">Open</span></div>`;
        a.querySelector('.detail-title').textContent = bm.label;
        const del = document.createElement('button'); del.type = 'button'; del.className = 'chip icon tiny'; del.textContent = '×';
        del.setAttribute('aria-label', `Remove ${bm.label}`);
        del.onclick = () => { bookmarks[item.id].splice(idx, 1); saveLinksOnly(); renderDetailsUI(item); };
        wrap.append(a, del); l3.appendChild(wrap);
      });

      deadlines.filter((d) => d.place === item.id).forEach((dl) => {
        const idx = deadlines.indexOf(dl);
        const wrap = document.createElement('div'); wrap.className = 'bookmark-row';
        const box = document.createElement('div'); box.className = 'detail-row';
        box.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta"></span></div>`;
        box.querySelector('.detail-title').textContent = dl.title;
        box.querySelector('.detail-meta').textContent = dl.due;
        const del = document.createElement('button'); del.type = 'button'; del.className = 'chip icon tiny'; del.textContent = '×';
        del.setAttribute('aria-label', `Remove deadline ${dl.title}`);
        del.onclick = () => { deadlines.splice(idx, 1); saveLinksOnly(); renderDetailsUI(item); };
        wrap.append(box, del); l4.appendChild(wrap);
      });
    }
  }

  function setTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab-btn').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    $('tabOverview').hidden = name !== 'overview';
    $('tabSecond').hidden = name !== 'second';
    $('tabThird').hidden = name !== 'third';
    $('tabFourth').hidden = name !== 'fourth';
  }
  document.querySelectorAll('.tab-btn').forEach((b) => { b.onclick = () => { setTab(b.dataset.tab); audio.sfx('tap'); }; });

  function renderInspect(forceFetch = false) {
    const card = $('inspectCard');
    if (!selectedTile) { card.dataset.open = 'false'; orbitActive = false; $('inspEditBox').hidden = true; return; }
    const [x, y] = selectedTile;
    const t = grid[x][y], id = pins[x][y];
    if (!t || !id) { selectedTile = null; card.dataset.open = 'false'; return; }

    const item = getItem(id);
    const isGit = item.kind === 'github' && !item.isCustom;
    if (item.kind === 'github') simStats.visitedGit = true;
    else simStats.visitedGoogle = true;

    $('inspTitle').textContent = item.name;
    $('inspSub').textContent = `${TYPES[t].name} (${item.kind === 'google' ? 'South Bank' : 'North Bank'}) · (${x}, ${y})`;
    $('inspDesc').textContent = item.desc || item.web || '';

    $('inspWeb').hidden = !item.web;
    if (item.web) { $('inspWeb').href = item.web; $('inspWeb').textContent = isGit ? 'Open live site' : `Open ${item.name}`; }

    $('inspEditor').hidden = !(isGit || item.alt);
    if (isGit) { $('inspEditor').href = `https://vscode.dev/github/${GITHUB_OWNER}/${item.id}`; $('inspEditor').textContent = 'Open vscode.dev'; }
    else if (item.alt) { $('inspEditor').href = item.alt; $('inspEditor').textContent = item.altLabel || 'Quick action'; }

    $('inspGit').hidden = !(isGit && item.git);
    if (isGit && item.git) $('inspGit').href = item.git;

    $('inspCopy').textContent = isGit && item.git ? 'Copy clone' : 'Copy link';
    $('inspCloneBox').hidden = !(isGit && item.git);
    if (isGit && item.git) $('inspCloneCode').textContent = `git clone ${item.git}.git`;

    $('editName').value = item.name || '';
    $('editWeb').value = item.web || '';
    $('editAlt').value = isGit ? (item.git || '') : (item.alt || '');
    $('editStyle').value = t;
    $('editColor').value = item.customColor || TYPES[t].color;
    $('editDeleteBtn').hidden = !item.isCustom;

    setTab(activeTab);
    if (isGit) fetchRepoActivity(item, forceFetch);
    renderDetailsUI(item);
    card.dataset.open = 'true';
  }

  $('inspClose').onclick = () => { selectedTile = null; renderInspect(); };
  $('inspCutBtn').onclick = () => {
    cutawayActive = !cutawayActive;
    $('inspCutBtn').setAttribute('aria-pressed', String(cutawayActive));
    worldDirty = true;
  };
  $('inspEditBtn').onclick = () => {
    const open = $('inspEditBox').hidden;
    $('inspEditBox').hidden = !open;
    $('inspEditBtn').setAttribute('aria-expanded', String(open));
  };
  $('inspCopy').onclick = async () => {
    if (!selectedTile) return;
    const item = getItem(pins[selectedTile[0]][selectedTile[1]]);
    const val = (item.kind === 'github' && item.git && !item.isCustom) ? `git clone ${item.git}.git` : (item.web || item.git || '');
    try { await navigator.clipboard.writeText(val); } catch (e) {}
    const b = $('inspCopy'), prev = b.textContent; b.textContent = 'Copied';
    setTimeout(() => { b.textContent = prev; }, 1400);
  };

  $('inspEditBox').onsubmit = (e) => {
    e.preventDefault();
    if (!selectedTile) return;
    const [x, y] = selectedTile;
    const id = pins[x][y];
    const base = getItem(id);
    const patch = { ...(overrides[id] || {}) };
    if ($('editName').value.trim()) patch.name = $('editName').value.trim();
    patch.web = $('editWeb').value.trim();
    if (base.kind === 'github' && !base.isCustom) patch.git = $('editAlt').value.trim() || base.git;
    else patch.alt = $('editAlt').value.trim();
    patch.customColor = $('editColor').value;
    overrides[id] = patch;
    simStats.customized++;
    const style = $('editStyle').value;
    if (style && TYPES[style]) grid[x][y] = style;
    worldDirty = true; recompute(); scheduleSave();
    $('inspEditBox').hidden = true;
    $('inspEditBtn').setAttribute('aria-expanded', 'false');
    renderInspect();
    audio.sfx('select');
  };

  $('editResetColor').onclick = () => {
    if (!selectedTile) return;
    const id = pins[selectedTile[0]][selectedTile[1]];
    if (overrides[id]) delete overrides[id].customColor;
    worldDirty = true; scheduleSave(); renderInspect();
  };

  $('editDeleteBtn').onclick = () => {
    if (!selectedTile) return;
    const [x, y] = selectedTile;
    const id = pins[x][y];
    const idx = customItems.findIndex((c) => c.id === id);
    if (idx < 0) return;
    customItems.splice(idx, 1); delete overrides[id];
    pins[x][y] = null; grid[x][y] = 'forest'; levels[x][y] = 1;
    selectedTile = null; worldDirty = true; recompute(); updateCountUI(); scheduleSave(); renderInspect();
  };

  $('pinBookmarkForm').onsubmit = (e) => {
    e.preventDefault();
    if (!selectedTile) return;
    const id = pins[selectedTile[0]][selectedTile[1]];
    if (!bookmarks[id]) bookmarks[id] = [];
    bookmarks[id].unshift({ label: $('bmLabel').value.trim(), url: $('bmUrl').value.trim() });
    $('bmLabel').value = ''; $('bmUrl').value = '';
    saveLinksOnly(); renderDetailsUI(getItem(id));
  };

  $('deadlineForm').onsubmit = (e) => {
    e.preventDefault();
    if (!selectedTile) return;
    const id = pins[selectedTile[0]][selectedTile[1]];
    deadlines.unshift({ title: $('dlTitle').value.trim(), due: $('dlDate').value.trim(), place: id });
    $('dlTitle').value = ''; $('dlDate').value = '';
    saveLinksOnly(); renderDetailsUI(getItem(id));
  };

  // ---------- search & filter ----------
  function matchesFilter(item, q) {
    if (activeFilter === 'github' && item.kind !== 'github') return false;
    if (activeFilter === 'google' && item.kind !== 'google') return false;
    if (activeFilter === 'school' && !item.study) return false;
    if (!q) return true;
    const cached = repoCache.get(item.id);
    const commitText = (cached?.commits || []).map((c) => c.commit?.message || '').join(' ');
    const issueText = (cached?.issues || []).map((i) => i.title || '').join(' ');
    return `${item.name} ${item.lang || ''} ${item.cat || ''} ${item.desc || ''} ${commitText} ${issueText}`.toLowerCase().includes(q);
  }

  function focusItemById(id) {
    let tile = findItemTile(id);
    if (!tile) { assignUnpinnedItems(); if (worldDirty) buildWorld(); tile = findItemTile(id); }
    if (!tile) return;
    selectedTile = tile;
    simStats.inspected++;
    flyToTile(tile[0], tile[1], null, true);
    renderInspect();
    $('searchResults').hidden = true;
    audio.sfx('select');
  }

  function renderSearchResults() {
    const q = ($('repoSearch').value || '').trim().toLowerCase();
    $('clearSearch').hidden = !q;
    const boxEl = $('searchResults'); boxEl.innerHTML = '';
    let matches = allItems().filter((item) => matchesFilter(item, q));
    if (activeFilter === 'recent') {
      matches.sort((a, b) => Date.parse(b.meta?.pushedAt || 0) - Date.parse(a.meta?.pushedAt || 0));
    }
    if (!matches.length) {
      boxEl.innerHTML = '<div class="detail-row"><div class="detail-sub">No matching places or commits.</div></div>';
      return;
    }
    for (const item of matches) {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'search-item';
      const dot = document.createElement('span'); dot.className = 'search-dot' + (item.isPrivate ? ' priv' : '');
      const main = document.createElement('div'); main.className = 'search-main';
      const title = document.createElement('div'); title.className = 'search-title'; title.textContent = item.name;
      const sub = document.createElement('div'); sub.className = 'search-sub';
      sub.textContent = `${item.lang || item.cat || 'App'} · ${item.desc || item.web || ''}`;
      main.append(title, sub);
      const tag = document.createElement('span'); tag.className = 'search-tag';
      tag.textContent = item.kind === 'github' ? 'Repo' : 'App';
      btn.append(dot, main, tag);
      btn.onclick = () => focusItemById(item.id);
      boxEl.appendChild(btn);
    }
  }

  $('repoSearch').addEventListener('focus', () => { renderSearchResults(); $('searchResults').hidden = false; });
  $('repoSearch').addEventListener('input', () => { renderSearchResults(); $('searchResults').hidden = false; });
  $('repoSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = ($('repoSearch').value || '').trim().toLowerCase();
      const first = allItems().find((r) => matchesFilter(r, q));
      if (first) focusItemById(first.id);
    }
  });
  $('clearSearch').onclick = () => { $('repoSearch').value = ''; renderSearchResults(); $('repoSearch').focus(); };
  document.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.onclick = () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-chip').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      renderSearchResults();
      if (activeFilter === 'school') flyToTile(13, 24, W >= 760 ? 0.96 : 0.8, false);
      else if (activeFilter === 'github') flyToTile(13, 9, W >= 760 ? 0.94 : 0.78, false);
      else if (activeFilter === 'google') flyToTile(14, 24, W >= 760 ? 0.96 : 0.8, false);
      else center(true);
      audio.sfx('tap');
    };
  });

  $('syncBtn').onclick = async () => {
    $('syncBtn').disabled = true;
    await Promise.all([fetchUserRepos(true), fetchLocalWeather()]);
    unreadNotifs = 0; $('notifBadge').hidden = true;
    $('syncBtn').disabled = false;
    audio.sfx('select');
  };

  // ---------- popovers: Economy, Cities, Customize, Compare, Help ----------
  function setPop(id, btnId, open) {
    ['econPop', 'citiesPop', 'customPop', 'comparePop', 'helpPop'].forEach((pid) => {
      if (pid !== id) $(pid).dataset.open = 'false';
    });
    ['econBtn', 'citiesBtn', 'customBtn', 'compareBtn'].forEach((bid) => {
      if ($(bid)) $(bid).setAttribute('aria-expanded', String(bid === btnId && open));
    });
    $(id).dataset.open = String(open);
    if (open && id === 'econPop') renderEconomyUI();
    if (open && id === 'citiesPop') renderCitiesUI();
    if (open && id === 'comparePop') renderCompareUI();
    if (open && id === 'helpPop') renderHelpUI();
  }

  document.querySelectorAll('.pop-close').forEach((b) => {
    b.onclick = () => setPop(b.dataset.target, b.dataset.btn, false);
  });
  $('econBtn').onclick = (e) => { e.stopPropagation(); setPop('econPop', 'econBtn', $('econPop').dataset.open !== 'true'); };
  if ($('citiesBtn')) $('citiesBtn').onclick = (e) => { e.stopPropagation(); setPop('citiesPop', 'citiesBtn', $('citiesPop').dataset.open !== 'true'); };
  $('customBtn').onclick = (e) => { e.stopPropagation(); setPop('customPop', 'customBtn', $('customPop').dataset.open !== 'true'); };
  if ($('compareBtn')) $('compareBtn').onclick = (e) => { e.stopPropagation(); setPop('comparePop', 'compareBtn', $('comparePop').dataset.open !== 'true'); };
  $('helpBtn').onclick = (e) => { e.stopPropagation(); setPop('helpPop', 'helpBtn', $('helpPop').dataset.open !== 'true'); };

  function renderEconomyUI() {
    $('econStats').innerHTML = `
      <div class="detail-row"><div class="detail-top"><span class="detail-title">Income per tick</span><span class="detail-meta">+$${fmt(simStats.income)}</span></div></div>
      <div class="detail-row"><div class="detail-top"><span class="detail-title">Upkeep per tick</span><span class="detail-meta">-$${fmt(simStats.upkeep)}</span></div></div>
      <div class="detail-row"><div class="detail-top"><span class="detail-title">Net balance</span><span class="detail-meta">${simStats.net >= 0 ? '+' : ''}$${fmt(simStats.net)}</span></div></div>`;
    $('needsMeters').innerHTML = `<span class="stat-label">Citizen needs</span>` +
      [['Energy', needs.energy], ['Mood', needs.mood], ['Hunger', needs.hunger]].map(([k, v]) => `
        <div class="meter"><div class="meter-top"><span>${k}</span><span class="tnum">${Math.round(v)}%</span></div>
        <div class="meter-track"><div class="meter-fill" style="width:${Math.round(v)}%"></div></div></div>`).join('');
    $('leaderboardList').innerHTML = `
      <div class="detail-row"><div class="detail-top"><span class="detail-title">1. CommitBot</span><span class="detail-meta">${tickerQueue.length + 14} syncs</span></div></div>
      <div class="detail-row"><div class="detail-top"><span class="detail-title">2. DeployBot</span><span class="detail-meta">${REPOS.length} builds</span></div></div>
      <div class="detail-row"><div class="detail-top"><span class="detail-title">3. StudyBot</span><span class="detail-meta">${studyStreak}d streak</span></div></div>`;
    $('goalsList').innerHTML = D.ACHIEVEMENTS.map((a) => {
      const done = a.check({ ...simStats, pop: simStats.pop });
      return `<div class="detail-row"><div class="detail-top"><span class="detail-title">${a.title}</span><span class="detail-meta">${done ? 'Unlocked' : 'Locked'}</span></div><div class="detail-sub">${a.desc}</div></div>`;
    }).join('');
  }

  document.querySelectorAll('.disaster-btn').forEach((b) => {
    b.onclick = () => { activeDisaster = b.dataset.disaster; audio.sfx('alert'); };
  });
  $('repairBtn').onclick = () => {
    activeDisaster = null;
    if (selectedTile) spawnConfetti(selectedTile[0], selectedTile[1], 40);
    audio.sfx('celebrate');
  };

  function renderCitiesUI() {
    const list = $('slotList'); list.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(SLOT_PREFIX + i)); } catch (e) {}
      const row = document.createElement('div'); row.className = 'detail-row bookmark-row';
      const meta = document.createElement('div');
      meta.innerHTML = `<div class="detail-title">City Slot ${i}</div><div class="detail-sub">${saved ? `${saved.themeId || 'autumn'} · $${fmt(saved.money || 0)}` : 'Empty slot'}</div>`;
      const btns = document.createElement('div'); btns.className = 'field-row';
      const sBtn = document.createElement('button'); sBtn.type = 'button'; sBtn.className = 'chip tiny'; sBtn.textContent = 'Save';
      sBtn.onclick = () => { localStorage.setItem(SLOT_PREFIX + i, JSON.stringify(serializeState())); renderCitiesUI(); audio.sfx('select'); };
      const lBtn = document.createElement('button'); lBtn.type = 'button'; lBtn.className = 'chip tiny primary'; lBtn.textContent = 'Load'; lBtn.disabled = !saved;
      lBtn.onclick = () => { if (saved && applySaveData(saved)) { worldDirty = true; recompute(); saveNow(); center(true); setPop('citiesPop', 'citiesBtn', false); } };
      btns.append(sBtn, lBtn); row.append(meta, btns); list.appendChild(row);
    }
  }

  function renderCompareUI() {
    const selA = $('cmpA'), selB = $('cmpB');
    if (selA.options.length !== REPOS.length) {
      [selA, selB].forEach((sel, idx) => {
        sel.innerHTML = '';
        REPOS.forEach((r) => { const o = document.createElement('option'); o.value = r.id; o.textContent = r.name; sel.appendChild(o); });
        sel.value = REPOS[Math.min(idx, REPOS.length - 1)].id;
        sel.onchange = renderCompareCols;
      });
    }
    renderCompareCols();
  }
  async function renderCompareCols() {
    const a = getItem($('cmpA').value), b = getItem($('cmpB').value);
    const [ca, cb] = await Promise.all([fetchRepoActivity(a), fetchRepoActivity(b)]);
    const colHtml = (r, c) => `
      <div class="cmp-col">
        <strong>${r.name}</strong>
        <span class="detail-sub">${r.lang} · Stars: ${r.meta?.stars ?? c?.meta?.stars ?? 0}</span>
        <span class="detail-sub">Issues: ${r.meta?.issues ?? c?.issues?.length ?? 0} · PRs: ${c?.prs?.length ?? 0}</span>
        <span class="detail-sub">Commits loaded: ${c?.commits?.length ?? 0}</span>
        ${r.web ? `<a class="chip tiny primary link-btn" href="${r.web}" target="_blank" rel="noopener noreferrer">Open web</a>` : ''}
      </div>`;
    $('cmpGrid').innerHTML = colHtml(a, ca) + colHtml(b, cb);
  }

  function renderHelpUI() {
    $('helpList').innerHTML = D.SHORTCUTS_HELP.map(([k, v]) =>
      `<div class="detail-row"><div class="detail-top"><code class="sha">${k}</code><span class="detail-sub">${v}</span></div></div>`
    ).join('');
  }

  // ---------- customization controls & presets ----------
  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.onclick = () => { themeId = b.dataset.theme; syncBodyPrefs(); rebuildCrownSprites(); worldDirty = true; scheduleSave(); };
  });
  $('clockSlider').addEventListener('input', (e) => {
    hour = Number(e.target.value);
    timeMode = 'paused';
    syncBodyPrefs();
    scheduleSave();
  });
  $('autoTimeBtn').onclick = () => {
    timeMode = timeMode === 'auto' ? 'realtime' : timeMode === 'realtime' ? 'paused' : 'auto';
    syncBodyPrefs(); scheduleSave();
  };
  $('realTimeBtn').onclick = () => {
    timeMode = timeMode === 'realtime' ? 'auto' : 'realtime';
    syncBodyPrefs(); scheduleSave();
  };
  $('weatherBtn').onclick = () => {
    const order = ['clear', 'rain', 'overcast'];
    weather = order[(order.indexOf(weather) + 1) % order.length];
    syncBodyPrefs(); scheduleSave();
  };
  $('localWeatherBtn').onclick = fetchLocalWeather;
  $('darkModeBtn').onclick = () => { darkMode = !darkMode; syncBodyPrefs(); scheduleSave(); };
  $('cbModeBtn').onclick = () => { cbMode = !cbMode; syncBodyPrefs(); scheduleSave(); };
  $('largeTextBtn').onclick = () => { largeText = !largeText; syncBodyPrefs(); scheduleSave(); };
  $('ghostBtn').onclick = () => {
    ghostMode = !ghostMode;
    // Move low-activity HTML/old repos to Ghost Town or back
    const targets = ['claude', 'cham-bracelet-plan'];
    targets.forEach((id, idx) => {
      const cur = findItemTile(id);
      if (!cur) return;
      if (ghostMode) {
        const [gx, gy, gt] = D.GHOST_TOWN_LOTS[idx];
        pins[cur[0]][cur[1]] = null; grid[cur[0]][cur[1]] = 'forest';
        pins[gx][gy] = id; grid[gx][gy] = gt;
      }
    });
    if (!ghostMode) starter();
    worldDirty = true; recompute(); syncBodyPrefs(); scheduleSave();
  };
  $('agentsBtn').onclick = () => { showAgents = !showAgents; syncAgents(); syncBodyPrefs(); scheduleSave(); };
  $('heatBtn').onclick = () => { showHeatmap = !showHeatmap; worldDirty = true; syncBodyPrefs(); scheduleSave(); };
  $('soundBtn').onclick = () => {
    audio.sfxOn = !audio.sfxOn;
    $('soundBtn').textContent = audio.sfxOn ? 'Sound on' : 'Sound off';
    $('soundBtn').setAttribute('aria-pressed', String(audio.sfxOn));
    audio.updateZoomAmbience(cam.z);
    if (audio.sfxOn) audio.sfx('tap');
  };
  $('musicBtn').onclick = () => {
    audio.setMusic(!audio.musicOn);
    $('musicBtn').setAttribute('aria-pressed', String(audio.musicOn));
  };

  $('addPlaceForm').onsubmit = (e) => {
    e.preventDefault();
    const name = $('addName').value.trim(), url = $('addUrl').value.trim();
    const kind = $('addDistrict').value, style = $('addBuilding').value;
    if (!name || !url) return;
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) + '-' + Date.now().toString(36).slice(-3);
    customItems.push({ id, kind, name, web: url, lang: 'Custom', cat: 'Custom', style, isCustom: true, study: kind === 'google', desc: `Custom building shortcut.`, shortcuts: [{ label: `Open ${name}`, url, sub: url }] });
    simStats.customized++;
    const lot = findFreeLot(kind, style);
    if (lot) { grid[lot.x][lot.y] = style; levels[lot.x][lot.y] = lot.lv; pins[lot.x][lot.y] = id; worldDirty = true; recompute(); }
    $('addName').value = ''; $('addUrl').value = '';
    updateCountUI(); scheduleSave(); setPop('customPop', 'customBtn', false); focusItemById(id);
  };

  // Speed & Step
  document.querySelectorAll('.speed-btn').forEach((b) => {
    b.onclick = () => { simSpeed = Number(b.dataset.speed); syncBodyPrefs(); scheduleSave(); };
  });
  $('stepBtn').onclick = () => { stepSimTick(); };

  // Camera presets, labels, photo, exports, share link, timelapse
  function applyPreset(p) {
    if (p === 'overview') { orbitActive = false; center(true); }
    else if (p === 'street') { orbitActive = false; flyToTile(selectedTile ? selectedTile[0] : 12, selectedTile ? selectedTile[1] : 16, 1.75, false); }
  }
  document.querySelectorAll('.preset-btn').forEach((b) => { b.onclick = () => applyPreset(b.dataset.preset); });
  $('labelsBtn').onclick = () => { showLabels = !showLabels; syncBodyPrefs(); scheduleSave(); };
  $('rotBtn').onclick = () => rotateCity(true);
  $('zoomIn').onclick = () => zoomAt(1.2);
  $('zoomOut').onclick = () => zoomAt(1 / 1.2);

  function setPhotoMode(on) {
    photoMode = on;
    syncBodyPrefs();
    $('exitPhotoBtn').hidden = !on;
  }
  $('exitPhotoBtn').onclick = () => setPhotoMode(false);

  function capturePng(transparent) {
    const prevHover = hover, prevSel = selectedTile;
    hover = null; selectedTile = null;
    draw(performance.now(), 0, transparent);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = transparent ? 'workspace-city-transparent.png' : 'workspace-city.png';
    a.click();
    hover = prevHover; selectedTile = prevSel;
  }
  $('pngBtn').onclick = () => capturePng(false);
  $('pngTransBtn').onclick = () => capturePng(true);

  $('timelapseBtn').onclick = () => {
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) return;
    const prevSpeed = simSpeed; simSpeed = 5;
    const chunks = [];
    const rec = new MediaRecorder(canvas.captureStream(30));
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      simSpeed = prevSpeed;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      a.download = 'workspace-city-timelapse.webm';
      a.click();
    };
    rec.start();
    setTimeout(() => rec.stop(), 3500);
    setPop('citiesPop', 'citiesBtn', false);
  };

  $('shareLinkBtn').onclick = async () => {
    const payload = { themeId, hour: Math.round(hour * 10) / 10, customItems, overrides, bookmarks };
    const url = location.origin + location.pathname + '#city=' + btoa(encodeURIComponent(JSON.stringify(payload)));
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    const b = $('shareLinkBtn'); b.textContent = 'Link copied';
    setTimeout(() => { b.textContent = 'Copy share link'; }, 1500);
  };

  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(serializeState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'workspace-city-save.json'; a.click();
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (applySaveData(d)) { worldDirty = true; recompute(); saveNow(); center(true); }
    } catch (err) {}
  };
  $('resetBtn').onclick = () => {
    customItems.length = 0; Object.keys(overrides).forEach((k) => delete overrides[k]);
    starter(); themeId = 'autumn'; money = 5000; dayCount = 1; hour = 17.4;
    worldDirty = true; recompute(); syncBodyPrefs(); rebuildCrownSprites(); renderInspect(); saveNow(); center(true);
    setPop('citiesPop', 'citiesBtn', false);
  };



  // Outside click closes dropdowns/popovers
  addEventListener('pointerdown', (e) => {
    const dock = document.querySelector('.search-dock');
    if (!$('searchResults').hidden && !dock.contains(e.target)) $('searchResults').hidden = true;
    const openPop = ['econPop', 'citiesPop', 'customPop', 'comparePop', 'helpPop'].find((id) => $(id).dataset.open === 'true');
    if (openPop && !$(openPop).contains(e.target) && !e.target.closest('.map-controls') && e.target !== $('econBtn')) {
      setPop(openPop, '', false);
    }
  });

  // ---------- canvas pan, zoom, double-click, label/car/building click ----------
  let drag = null;
  const ptrs = new Map();
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or released pointer */ }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camAnim = null; orbitActive = false;
    if (ptrs.size === 2) { drag = { pinch: true, d: dist() }; return; }
    drag = { moved: false, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag?.pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], nd = dist();
      zoomAt(nd / drag.d, (a.x + b.x) / 2, (a.y + b.y) / 2); drag.d = nd; return;
    }
    if (drag?.pinch) return;
    if (drag) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      cam.x = drag.cx + dx; cam.y = drag.cy + dy;
    }

    const lbl = hitLabel(e.clientX, e.clientY);
    hoveredLabel = lbl ? lbl.id : null;
    const t = lbl ? [lbl.x, lbl.y] : pick(e.clientX, e.clientY);
    hover = t;
    if (!drag) canvas.style.cursor = (lbl || (t && pins[t[0]]?.[t[1]])) ? 'pointer' : 'grab';

    const tip = $('tip');
    if (t && !drag && pins[t[0]]?.[t[1]]) {
      const item = getItem(pins[t[0]][t[1]]);
      tip.textContent = `${item.name} (${item.lang || item.cat || 'App'}) · Click to open`;
      tip.hidden = false;
      tip.style.transform = `translate3d(${Math.min(W - 260, e.clientX + 16)}px, ${e.clientY + 16}px, 0)`;
    } else if (!tip.hidden) { tip.hidden = true; }
  });

  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size) return;
    if (drag && !drag.moved && !drag.pinch) {
      const lbl = hitLabel(e.clientX, e.clientY);
      const veh = !lbl ? hitVehicle(e.clientX, e.clientY) : null;
      if (veh) {
        selectedVehicle = veh;
        notify(`${veh.kind.toUpperCase()} #${veh.id} · ${veh.dest} · ${schedulePhase(hour)}`, 4000);
        audio.sfx('select');
      } else {
        $('carToast').hidden = true; clearTimeout(toastTimer);
        selectedVehicle = null;
        const t = lbl ? [lbl.x, lbl.y] : pick(e.clientX, e.clientY);
        if (t && pins[t[0]]?.[t[1]]) {
          selectedTile = t;
          simStats.inspected++;
          flyToTile(t[0], t[1], cam.z, true);
          renderInspect();
          audio.sfx('select');
        } else {
          selectedTile = null;
          renderInspect();
        }
      }
    }
    drag = null;
    canvas.style.cursor = hoveredLabel ? 'pointer' : 'grab';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', (e) => {
    const lbl = hitLabel(e.clientX, e.clientY);
    const t = lbl ? [lbl.x, lbl.y] : pick(e.clientX, e.clientY);
    if (t && pins[t[0]]?.[t[1]]) {
      selectedTile = t;
      flyToTile(t[0], t[1], 1.8, true);
      renderInspect();
    }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; hoveredLabel = null; $('tip').hidden = true; });

  function zoomAt(f, mx = W / 2, my = H / 2) {
    camAnim = null;
    const nz = Math.max(0.45, Math.min(2.0, cam.z * f));
    const k = nz / cam.z;
    cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz;
    audio.updateZoomAmbience(cam.z);
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (photoMode) { setPhotoMode(false); return; }
      $('searchResults').hidden = true;
      ['econPop', 'citiesPop', 'customPop', 'comparePop', 'helpPop'].forEach((id) => setPop(id, '', false));
      if ($('launchPop')) { $('launchPop').dataset.open = 'false'; $('launchBtn').setAttribute('aria-expanded', 'false'); }
      if (selectedTile) { selectedTile = null; renderInspect(); }
      return;
    }
    if (e.target.matches && e.target.matches('input, select, textarea')) return;
    if (e.key === '/') { e.preventDefault(); $('repoSearch').focus(); return; }
    if (e.key === '?') { e.preventDefault(); setPop('helpPop', 'helpBtn', $('helpPop').dataset.open !== 'true'); return; }
    if (e.code === 'Space') { e.preventDefault(); simSpeed = simSpeed === 0 ? 1 : 0; syncBodyPrefs(); return; }
    const k = e.key.toLowerCase();
    if (k === 'p') return setPhotoMode(!photoMode);
    if (k === 'r' || k === 'e') return rotateCity(true);
    if (k === 'q') return rotateCity(false);
    if (k === '1') return applyPreset('overview');
    if (k === '2') return applyPreset('street');
    if (e.key === '+' || e.key === '=') zoomAt(1.2);
    if (e.key === '-') zoomAt(1 / 1.2);
  });

  // ---------- simulation step & render loop ----------
  function stepSimTick() {
    money += simStats.net;
    needs.energy = Math.max(20, Math.min(100, needs.energy + (hour >= 22 || hour < 6 ? 6 : -1.5)));
    needs.hunger = Math.max(20, Math.min(100, needs.hunger + (hour >= 11.5 && hour <= 13.5 ? 10 : -2)));
    needs.mood = Math.max(20, Math.min(100, needs.mood + (activeDisaster ? -4 : 1.2)));
    $('sMoney').textContent = '$' + fmt(money);
    if ($('econPop').dataset.open === 'true') renderEconomyUI();
    scheduleSave();
  }

  function resize() {
    dpr = Math.max(1, Math.min(perfMaxDpr, devicePixelRatio || 1, Math.sqrt(2400000 / Math.max(1, innerWidth * innerHeight))));
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    labelCanvas.width = canvas.width; labelCanvas.height = canvas.height; labelKey = '';
  }
  function center(animateMove = false) {
    const tz = Math.max(0.45, Math.min(0.95, W / (N * TW) * 1.12, H / (N * TH + 150) * 1.12));
    const tx = W / 2, ty = H / 2 - (N * TH / 2) * tz + 26;
    if (!animateMove || reduceMotion) { cam.x = tx; cam.y = ty; cam.z = tz; camAnim = null; return; }
    camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: performance.now(), dur: 360 };
  }
  addEventListener('resize', resize);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let last = performance.now(), acc = 0, lastClockTxt = '', lastDateTxt = '';


  // Re-render the cached world at a higher resolution once zooming has settled (keeps zoomed-in views sharp without per-frame redraws).
  let resLastZ = 0, resStableAt = 0, resWantSince = 0;
  function ensureWorldRes(now) {
    if (Math.abs(cam.z - resLastZ) > 0.002) { resLastZ = cam.z; resStableAt = now; }
    if (now - resStableAt < 350) return;
    const need = cam.z * dpr * 0.9;
    const want = 2; // fixed: re-rasterising the map caused multi-hundred-millisecond freezes
    if (want === WS) { resWantSince = 0; return; }
    if (want < WS && now - (resWantSince || (resWantSince = now)) < 1500) return;
    resWantSince = 0;
    WS = want;
    worldCanvas.width = Math.round(WW * WS);
    worldCanvas.height = Math.round(WH * WS);
    worldDirty = true;
  }

  // Performance governor: measures the real time between frames (this includes GPU work).
  // Level 0 = full quality. Level 1 = render at 1x resolution and skip water shimmer.
  // Level 2 = also lock to a steady 30 fps, which looks smoother than an uneven 40-50.
  let perfLevel = 0, intervalEma = 16.7, slowFrames = 0, lastFrameAt = 0, workEma = 6, perfCheckAt = 0;
  function setPerfLevel(n) {
    if (n === perfLevel) return;
    perfLevel = n;
    perfMaxDpr = n >= 1 ? 1 : 1.5;
    resize();
  }
  function frame(now) {
    if (weather === 'fog') weather = 'clear';
    const gap = now - lastFrameAt;
    if (perfLevel >= 2 && gap < 30) { requestAnimationFrame(frame); return; }
    if (lastFrameAt && gap < 200) {
      intervalEma = intervalEma * 0.95 + gap * 0.05;
      if (now > perfCheckAt) {
        // judge at most once per second, and only while the page is visible and active
        perfCheckAt = now + 1000;
        const target = perfLevel >= 2 ? 36 : 22;
        if (intervalEma > target) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames >= 3 && perfLevel < 2) { setPerfLevel(perfLevel + 1); slowFrames = 0; intervalEma = 16.7; }
      }
    }
    lastFrameAt = now;
    const t0 = performance.now();
    const rawDt = Math.min(0.1, (now - last) / 1000); last = now;
    ensureWorldRes(now);
    const effSpeed = isSim() ? simSpeed : 1;
    const simDt = rawDt * effSpeed;
    simClock += simDt;

    // Smooth continuous day/night cycle even when simSpeed === 0 if timeMode === 'auto', or frozen cleanly in 'paused'
    if (timeMode === 'realtime') {
      const nd = new Date();
      hour = nd.getHours() + nd.getMinutes() / 60 + nd.getSeconds() / 3600;
      const dtStr = `${DAYS[nd.getDay()]}, ${MONTHS[nd.getMonth()]} ${nd.getDate()}`;
      if (dtStr !== lastDateTxt) { lastDateTxt = dtStr; $('dateText').textContent = dtStr; }
    } else {
      if (timeMode === 'auto') {
        const rate = isSim() ? (effSpeed > 0 ? 0.14 * effSpeed : 0.12) : 0.05;
        const prevH = hour;
        hour = (hour + rawDt * rate) % 24;
        if (hour < prevH) {
          if (isSim()) {
            dayCount++;
            notify(`Day ${dayCount} report · Pop ${fmt(simStats.pop)} · Net ${simStats.net >= 0 ? '+' : '-'}$${fmt(Math.abs(simStats.net))}/tick`, 3200);
          }
        }
      }
      const d = new Date(Date.now() + (isSim() ? (dayCount - 1) * 86400000 : 0));
      const dtStr = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
      if (dtStr !== lastDateTxt) { lastDateTxt = dtStr; $('dateText').textContent = dtStr; }
    }

    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    const cStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (cStr !== lastClockTxt) {
      lastClockTxt = cStr;
      $('clockText').textContent = cStr;
      if (document.activeElement !== $('clockSlider')) $('clockSlider').value = hour;
    }

    if (camAnim) {
      const p = Math.min(1, (now - camAnim.start) / camAnim.dur);
      const e = easeOut(p);
      cam.x = camAnim.sx + (camAnim.tx - camAnim.sx) * e;
      cam.y = camAnim.sy + (camAnim.ty - camAnim.sy) * e;
      cam.z = camAnim.sz + (camAnim.tz - camAnim.sz) * e;
      if (p >= 1) camAnim = null;
    } else if (orbitActive && selectedTile && !reduceMotion) {
      const [ox, oy] = selectedTile;
      const rad = 0.65;
      const a = now * 0.0008;
      const offsetX = W >= 760 ? -140 : 0;
      cam.x = W / 2 + offsetX - ((ox + 0.5 + Math.cos(a) * rad) - (oy + 0.5 + Math.sin(a) * rad)) * (TW / 2) * cam.z;
      cam.y = H * 0.52 - ((ox + 0.5 + Math.cos(a) * rad) + (oy + 0.5 + Math.sin(a) * rad)) * (TH / 2) * cam.z + 24 * cam.z;
    }

    if (simDt > 0 && showAgents) {
      stepVehicles(simDt);
      stepList(walkers, simDt, isRoad);
      stepList(bots, simDt, isRoad);
      stepList(dogs, simDt, isRoad);
      stepList(boats, simDt, isWater);
      stepDronesAndBirds(simDt);
    }
    if (simDt > 0) {
      acc += simDt;
      if (acc >= 3) { acc = 0; if (isSim()) stepSimTick(); }
    }

    tickCrew(now);
    draw(now, rawDt, false);
    workEma = workEma * 0.9 + (performance.now() - t0) * 0.1;
    requestAnimationFrame(frame);
  }

  // =====================================================================
  // Access / Simulator modes, building tools, and building cutaway with workers
  // =====================================================================
  let appMode = 'access';
  try { appMode = localStorage.getItem('isocity-mode') === 'sim' ? 'sim' : 'access'; } catch (e) { /* ignore */ }
  const isSim = () => appMode === 'sim';

  function setMode(m) {
    appMode = m === 'sim' ? 'sim' : 'access';
    document.documentElement.dataset.mode = appMode;
    document.querySelectorAll('.mode-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === appMode)));
    try { localStorage.setItem('isocity-mode', appMode); } catch (e) { /* ignore */ }
    if (appMode !== 'sim') { activeDisaster = null; setBuildTool('select'); }
    syncBodyPrefs();
    audio.sfx('tap');
  }
  document.querySelectorAll('.mode-btn').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });

  // ---------- building tools (Simulator mode) ----------
  const TOOLS = {
    select:  { label: 'Select' },
    road:    { label: 'Road',      cost: 20,  type: 'road' },
    house:   { label: 'Villa',     cost: 120, type: 'house' },
    shop:    { label: 'Studio',    cost: 200, type: 'shop' },
    apt:     { label: 'Apartments', cost: 400, type: 'apt' },
    office:  { label: 'Tower',     cost: 800, type: 'office' },
    park:    { label: 'Park',      cost: 60,  type: 'park' },
    forest:  { label: 'Trees',     cost: 15,  type: 'forest' },
    upgrade: { label: 'Upgrade' },
    bulldoze: { label: 'Bulldoze' },
  };
  let buildTool = 'select';
  function setBuildTool(t) {
    buildTool = TOOLS[t] ? t : 'select';
    document.querySelectorAll('.tool-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === buildTool)));
    canvas.style.cursor = buildTool === 'select' ? 'grab' : 'crosshair';
    $('buildHint').textContent = buildTool === 'select' ? 'Pick a tool, then click or drag on the map.' : buildTool === 'bulldoze' ? 'Bulldoze: removes your own buildings (repos and apps are protected).' : buildTool === 'upgrade' ? 'Upgrade a building one level.' : `${TOOLS[buildTool].label}: $${TOOLS[buildTool].cost} each`;
  }
  document.querySelectorAll('.tool-btn').forEach((b) => { b.onclick = () => setBuildTool(b.dataset.tool); });

  function toast(msg) { notify(msg, 2200); }
  function applyTool(x, y) {
    if (!inb(x, y) || buildTool === 'select') return false;
    const cur = grid[x][y];
    if (cur === 'water' || cur === 'bridge') return false;
    if (buildTool === 'bulldoze') {
      if (pins[x][y]) { toast('Repos and apps are protected'); return false; }
      if (!cur) return false;
      const refund = Math.round((({ road: 20, house: 120, shop: 200, apt: 400, office: 800, park: 60, forest: 15 })[cur] || 0) * 0.4);
      grid[x][y] = null; levels[x][y] = 1; money += refund;
    } else if (buildTool === 'upgrade') {
      const d = TYPES[cur];
      if (!cur || !d || !d.grow) return false;
      const lv = levels[x][y] || 1;
      if (lv >= 3) { toast('Already max level'); return false; }
      const price = Math.round((TOOLS[cur] ? TOOLS[cur].cost : 300) * 0.8 * lv) || 300;
      if (money < price) { toast(`Need $${fmt(price)} to upgrade`); return false; }
      money -= price; levels[x][y] = lv + 1;
    } else {
      const tool = TOOLS[buildTool];
      if (pins[x][y]) { toast('That plot holds a repo or app'); return false; }
      if (cur === tool.type) return false;
      if (cur && cur !== 'forest' && cur !== 'park') { toast('Bulldoze that tile first'); return false; }
      if (money < tool.cost) { toast(`Need $${fmt(tool.cost)}`); return false; }
      money -= tool.cost; grid[x][y] = tool.type; levels[x][y] = 1;
    }
    worldDirty = true; recompute(); scheduleSave(); audio.sfx('tap');
    return true;
  }
  let paintLast = '';
  const paintAt = (e) => {
    const t = pick(e.clientX, e.clientY);
    if (!t) return;
    const k = t.join(',');
    if (k === paintLast) return;
    paintLast = k; applyTool(t[0], t[1]);
  };
  const toolsActive = () => isSim() && buildTool !== 'select';
  canvas.addEventListener('pointerdown', (e) => {
    if (!toolsActive() || e.button === 2) return;
    e.stopImmediatePropagation(); e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    paintLast = ''; canvas.__paint = true; paintAt(e);
  }, true);
  canvas.addEventListener('pointermove', (e) => {
    if (!toolsActive()) return;
    hover = pick(e.clientX, e.clientY);
    if (canvas.__paint) { e.stopImmediatePropagation(); paintAt(e); }
  }, true);
  const endPaint = (e) => { if (canvas.__paint) { canvas.__paint = false; paintLast = ''; e.stopImmediatePropagation(); } };
  canvas.addEventListener('pointerup', endPaint, true);
  canvas.addEventListener('pointercancel', endPaint, true);

  function drawBuildPreview() {
    if (!toolsActive() || !hover) return;
    const [x, y] = hover;
    const z = rcam.z;
    ctx.beginPath();
    ctx.moveTo(px(x, y), py(x, y)); ctx.lineTo(px(x + 1, y), py(x + 1, y)); ctx.lineTo(px(x + 1, y + 1), py(x + 1, y + 1)); ctx.lineTo(px(x, y + 1), py(x, y + 1)); ctx.closePath();
    ctx.fillStyle = buildTool === 'bulldoze' ? 'rgba(224,113,95,0.35)' : 'rgba(94,242,214,0.28)'; ctx.fill();
    ctx.strokeStyle = buildTool === 'bulldoze' ? '#e0715f' : '#5ef2d6'; ctx.lineWidth = 2 * Math.max(1, z * 0.8); ctx.stroke();
  }

  // ---------- workers ----------
  const FIRST = ['Mai', 'Linh', 'Tuan', 'Hana', 'Minh', 'Kai', 'Sora', 'An', 'Bao', 'Lan', 'Noah', 'Eli', 'Mia', 'Leo', 'Zoe', 'Ken', 'Yuki', 'Ravi', 'Nina', 'Omar'];
  const ROLE_TASKS = {
    Developer: ['writing a feature', 'fixing a bug', 'refactoring a module', 'merging main', 'pairing on a PR'],
    Designer: ['sketching a screen', 'tuning colours', 'exporting icons', 'reviewing spacing'],
    'QA tester': ['running test suite', 'reproducing a bug', 'writing a test plan', 'checking mobile layout'],
    DevOps: ['watching deploys', 'rotating keys', 'scaling servers', 'reading build logs'],
    Manager: ['planning the sprint', 'answering messages', 'triaging issues', 'booking a demo'],
    Student: ['revising notes', 'writing an essay', 'making slides', 'checking the timetable'],
  };
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  const initial = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const SLOTS = [[0.3, 0.3], [0.72, 0.3], [0.3, 0.72], [0.72, 0.72], [0.5, 0.5]];
  const SHIRTS = ['#e6ded0', '#c95d43', '#3b6978', '#d4a23a', '#5b7a52', '#8a6fb0', '#2f7a8a'];
  const CREW_SPOTS = [[1.0, 0.3], [0.35, 1.0], [1.1, 0.85], [0.75, 1.15], [1.15, 0.05]];
  let crew = [], lastSelKey = '';

  function cutawayGeom() {
    if (!selectedTile || !cutawayActive) return null;
    const [x, y] = selectedTile;
    const t = grid[x][y];
    if (!isBuilding(t) || t === 'windmill' || t === 'wheel') return null;
    const d = TYPES[t];
    if (!d || !d.h) return null;
    const i = d.inset || 0.12;
    const H = Math.max(1, bldHeight(t, levels[x][y] || 1));
    return { x, y, t, i, H, x0: x + i, y0: y + i, x1: x + 1 - i, y1: y + 1 - i, F: Math.max(1, Math.min(5, Math.floor(H / 26))) };
  }
  function buildCrew() {
    crew = [];
    if (!selectedTile) return;
    const [x, y] = selectedTile;
    const id = pins[x][y];
    const item = id ? getItem(id) : { kind: 'github', name: 'Building' };
    const g = cutawayGeom();
    const rolesFor = (k) => item.kind === 'google' ? ['Student', 'Student', 'Manager', 'Designer'][k % 4] : ['Developer', 'QA tester', 'DevOps', 'Designer', 'Manager'][k % 5];
    const mk = (px0, py0, z0, k, extra = {}) => {
      const role = rolesFor(k);
      return Object.assign({ px: px0 - 0.5, py: py0 - 0.5, ox: px0 - 0.5, oy: py0 - 0.5, z0, color: SHIRTS[k % SHIRTS.length], phase: Math.random() * 6, crew: true,
        info: { name: `${pickOne(FIRST)} ${initial()}.`, role, task: pickOne(ROLE_TASKS[role]), nextTask: 0 } }, extra);
    };
    if (g) {
      const fh = g.H / g.F;
      let k = 0;
      for (let f = 0; f < g.F && crew.length < 9; f++) {
        const per = g.F >= 4 ? 2 : 3;
        for (let j = 0; j < per; j++) {
          const [u, v] = SLOTS[(j + f) % SLOTS.length];
          crew.push(mk(g.x0 + (g.x1 - g.x0) * u, g.y0 + (g.y1 - g.y0) * v, f * fh, k++, { inside: true, floor: f, fh, desk: j % 2 === 0, sc: Math.min(1, (fh - 4) / 19) }));
        }
      }
    } else {
      for (let k = 0; k < 4; k++) { const [ox, oy] = CREW_SPOTS[k]; crew.push(mk(x + ox, y + oy, 0, k, { sc: 1 })); }
    }
  }

  function drawPerson(a, now) {
    const z = rcam.z * (a.sc || 1);
    const z0 = a.z0 || 0;
    const x = px(a.px + 0.5, a.py + 0.5), y = py(a.px + 0.5, a.py + 0.5, z0);
    const seated = a.desk;
    const bob = Math.sin(now * 0.008 + a.phase) * (seated ? 0.4 : 1.2) * z;
    ctx.fillStyle = 'rgba(8,16,18,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 5 * z, 2.4 * z, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a2f33'; ctx.fillRect(x - 2.6 * z, y - 5 * z, 2.2 * z, 5 * z); ctx.fillRect(x + 0.4 * z, y - 5 * z, 2.2 * z, 5 * z);
    ctx.fillStyle = a.color; ctx.beginPath(); ctx.roundRect(x - 3.6 * z, y - 14 * z + bob, 7.2 * z, 9.5 * z, 2 * z); ctx.fill();
    ctx.fillStyle = '#e7c6a5'; ctx.beginPath(); ctx.arc(x, y - 17.5 * z + bob, 3.3 * z, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a1c'; ctx.beginPath(); ctx.arc(x, y - 18.6 * z + bob, 3.3 * z, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = a.color; ctx.lineWidth = 1.8 * z; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 3.4 * z, y - 12 * z + bob); ctx.lineTo(x + 6 * z, y - 8.5 * z + (seated ? Math.sin(now * 0.03 + a.phase) * 1.2 * z : Math.sin(now * 0.004 + a.phase) * 2 * z)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3.4 * z, y - 12 * z + bob); ctx.lineTo(x - 5.8 * z, y - 8 * z); ctx.stroke();
    if (!a.inside) { ctx.fillStyle = '#5ef2d6'; ctx.fillRect(x + 4 * z, y - 9 * z + bob, 4 * z, 3 * z); }
  }

  function drawCutaway(now) {
    const g = cutawayGeom();
    if (!g) return;
    const { x0, y0, x1, y1, H, F } = g;
    const fh = H / F;
    const P = (xx, yy, zz) => [px(xx, yy), py(xx, yy, zz)];
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const edge = (pts, c, w) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); };
    const lw = Math.max(1.2, 2 * rcam.z);
    poly([P(x0, y0, H), P(x1, y0, H), P(x1, y1, H), P(x1, y1, 0), P(x0, y1, 0), P(x0, y0, 0)], '#26313a');
    for (let f = 0; f < F; f++) {
      const z0 = f * fh, z1 = (f + 1) * fh;
      poly([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)], f % 2 ? '#51636d' : '#5a6d78');
      poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], f % 2 ? '#3f505a' : '#46585f');
      const wz0 = z0 + fh * 0.38, wz1 = z1 - fh * 0.14;
      for (let c = 0; c < 2; c++) {
        const a = 0.12 + c * 0.46, b = a + 0.34;
        const lx0 = x0 + (x1 - x0) * a, lx1 = x0 + (x1 - x0) * b;
        poly([P(lx0, y0, wz0), P(lx1, y0, wz0), P(lx1, y0, wz1), P(lx0, y0, wz1)], 'rgba(170,215,235,0.55)');
        const ly0 = y0 + (y1 - y0) * a, ly1 = y0 + (y1 - y0) * b;
        poly([P(x0, ly0, wz0), P(x0, ly1, wz0), P(x0, ly1, wz1), P(x0, ly0, wz1)], 'rgba(150,200,225,0.5)');
      }
      poly([P(x0, y0 + (y1 - y0) * 0.55, z0 + fh * 0.32), P(x0, y0 + (y1 - y0) * 0.85, z0 + fh * 0.32), P(x0, y0 + (y1 - y0) * 0.85, z0 + fh * 0.72), P(x0, y0 + (y1 - y0) * 0.55, z0 + fh * 0.72)], '#eef1ee');
      poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)], f % 2 ? '#cdbb9c' : '#d8c7aa');
      poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z0 - 3), P(x0, y1, z0 - 3)], '#8f7f66');
      poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z0 - 3), P(x1, y0, z0 - 3)], '#78694f');
      const here = crew.filter((c) => c.inside && c.floor === f).sort((p, q) => (p.px + p.py) - (q.px + q.py));
      for (const c of here) {
        drawPerson(c, now);
        if (c.desk) {
          const dxp = c.px + 0.5 + 0.05, dyp = c.py + 0.5 + 0.05;
          const dh = 6 * (c.sc || 1);
          box(dxp - 0.07, dyp - 0.04, dxp + 0.14, dyp + 0.14, z0, z0 + dh, '#8a6a4a', 1, { roof: '#b08a62' });
          const mx = px(dxp + 0.03, dyp + 0.02), my = py(dxp + 0.03, dyp + 0.02, z0 + dh + 3 * (c.sc || 1));
          ctx.fillStyle = '#7ef2de'; ctx.fillRect(mx - 3 * rcam.z * (c.sc || 1), my - 2 * rcam.z * (c.sc || 1), 6 * rcam.z * (c.sc || 1), 4 * rcam.z * (c.sc || 1));
        }
      }
    }
    edge([P(x1, y1, 0), P(x1, y1, H)], '#1a232a', lw * 1.4);
    edge([P(x0, y1, 0), P(x0, y1, H)], '#1a232a', lw * 1.2);
    edge([P(x1, y0, 0), P(x1, y0, H)], '#1a232a', lw * 1.2);
    edge([P(x0, y0, H), P(x1, y0, H), P(x1, y1, H), P(x0, y1, H), P(x0, y0, H)], '#1a232a', lw * 1.4);
  }

  function drawExtras(now, tbg) {
    drawBuildPreview();
    if (tbg) return;
    drawCutaway(now);
    for (const a of crew.slice().sort((p, q) => (p.py + p.px) - (q.py + q.px))) if (!a.inside) drawPerson(a, now);
  }

  function tickCrew(now) {
    const key = selectedTile ? selectedTile.join(',') : '';
    if (key !== lastSelKey || (cutawayActive && !crew.length && selectedTile)) {
      lastSelKey = key;
      if (selectedTile) {
        buildCrew();
        const g = cutawayGeom();
        if (g) flyToTile(selectedTile[0], selectedTile[1], Math.max(cam.z, 2.0), true);
      } else crew = [];
    }
    for (const a of crew) {
      const amp = a.inside ? (a.desk ? 0.01 : 0.05) : 0.12;
      a.px = a.ox + Math.sin(now * 0.0006 + a.phase) * amp;
      a.py = a.oy + Math.cos(now * 0.0005 + a.phase * 1.7) * amp * 0.85;
    }
  }


  // ---------- quick account switch + app launcher (bottom bar) ----------
  const LAUNCH = [['google-slides', 'Slides'], ['google-docs', 'Docs'], ['gmail', 'Gmail'], ['google-calendar', 'Calendar'], ['seqta', 'SEQTA']];
  function syncAcctUI() {
    const school = globalAcct === 1;
    $('acctBtn').textContent = school ? 'School' : 'Personal';
    $('acctBtn').setAttribute('aria-pressed', String(school));
    $('acctBtn').title = school ? 'School account (Slides, Docs, Gmail). Calendar stays personal, Chat always uses school.' : 'Personal account (Slides, Docs, Gmail). Chat always uses school.';
    $('launchNote').textContent = school ? 'Opening with your school account. Calendar stays personal. Toddle is school only.' : 'Opening with your personal account.';
    $('launchGrid').innerHTML = '';
    for (const [id, label] of (school ? [...LAUNCH, ['toddle', 'Toddle']] : LAUNCH)) {
      const it = getItem(id);
      const a = document.createElement('a');
      a.className = 'chip small link-btn';
      a.textContent = label; a.href = it.web || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer';
      $('launchGrid').appendChild(a);
    }
    const gh = document.createElement('a');
    gh.className = 'chip small link-btn';
    gh.textContent = 'GitHub'; gh.href = 'https://github.com/Peterachss?tab=repositories'; gh.target = '_blank'; gh.rel = 'noopener noreferrer';
    gh.title = 'All my repositories on GitHub';
    $('launchGrid').appendChild(gh);
    const code = document.createElement('a');
    code.className = 'chip small link-btn';
    code.textContent = 'App code'; code.href = 'https://github.com/Peterachss/isocity'; code.target = '_blank'; code.rel = 'noopener noreferrer';
    code.title = 'This app on GitHub';
    $('launchGrid').appendChild(code);
  }
  $('acctBtn').onclick = () => {
    globalAcct = globalAcct === 1 ? 0 : 1;
    for (const k of Object.keys(accountPrefs)) delete accountPrefs[k];
    try { localStorage.setItem('isocity-acct', String(globalAcct)); } catch (e) { /* ignore */ }
    syncAcctUI(); scheduleSave();
    if (selectedTile) renderInspect();
    audio.sfx('tap');
  };
  $('launchBtn').onclick = (e) => {
    e.stopPropagation();
    const open = $('launchPop').dataset.open !== 'true';
    $('launchPop').dataset.open = String(open);
    $('launchBtn').setAttribute('aria-expanded', String(open));
    if (open) syncAcctUI();
  };
  addEventListener('pointerdown', (e) => {
    if ($('launchPop').dataset.open === 'true' && !$('launchPop').contains(e.target) && e.target !== $('launchBtn')) {
      $('launchPop').dataset.open = 'false'; $('launchBtn').setAttribute('aria-expanded', 'false');
    }
  });
  syncAcctUI();


  // ---------- Dusk / Day / Night button ----------
  const LIGHT_MODES = [{ label: 'Dusk', hour: 17.4 }, { label: 'Day', hour: 13.0 }, { label: 'Night', hour: 22.4 }];
  const periodOf = (h) => (h >= 5 && h < 8 ? 'Dawn' : h >= 8 && h < 16.5 ? 'Day' : h >= 16.5 && h < 19.5 ? 'Dusk' : 'Night');
  $('lightBtn').onclick = () => {
    const i = LIGHT_MODES.findIndex((m) => m.label === periodOf(hour));
    const next = LIGHT_MODES[(i + 1) % LIGHT_MODES.length];
    hour = next.hour; timeMode = 'paused';
    syncBodyPrefs(); scheduleSave(); audio.sfx('tap');
    $('lightBtn').textContent = next.label;
  };
  setInterval(() => { const p = periodOf(hour); if ($('lightBtn').textContent !== p) $('lightBtn').textContent = p; }, 400);

  // Register offline PWA service worker
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  resize();
  if (!load()) starter();
  // One-time switch back to the classic look (cream cards, deep teal, autumn trees).
  try {
    if (!localStorage.getItem('isocity-classic-look-v1')) {
      localStorage.setItem('isocity-classic-look-v1', '1');
      darkMode = false; themeId = 'autumn';
    }
  } catch (e) { /* storage unavailable */ }
  document.documentElement.dataset.mode = appMode;
  document.querySelectorAll('.mode-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === appMode)));
  $('inspCutBtn').setAttribute('aria-pressed', 'true');
  syncBodyPrefs();
  recompute();
  updateCountUI();
  center(false);
  fetchUserRepos(false);
  fetchLocalWeather();
  requestAnimationFrame(frame);
})();
