(() => {
  const D = window.ISOCITY_DATA;
  const NYC = window.ISOCITY_NYC || null;
  // Classic cities are 32x32; the New York map is 64x64 and is the default for a fresh city.
  // Existing saves keep their own size, so old cities load exactly as before.
  const N = (() => {
    try {
      const d = JSON.parse(localStorage.getItem('isocity-workspace-v5'));
      const n = d && Array.isArray(d.grid) ? d.grid.length : 0;
      if (n === 32 || (n === 64 && NYC)) return n;
    } catch (e) { /* no save */ }
    return NYC ? 64 : 32;
  })();
  const isNYC = N === 64;
  const CLASSIC_KEY = 'workspace-city-classic-backup', NYC_KEY = 'workspace-city-nyc-backup', TRANSFER_KEY = 'isocity-nyc-transfer';
  let switchingCity = false; // set while reloading into a city of another size, so nothing overwrites the save
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
  let ctx = canvas.getContext('2d', { alpha: false });
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
  let acctEmails = { personal: '', school: '' };
  try { const e = JSON.parse(localStorage.getItem('isocity-acct-emails')); if (e) acctEmails = { personal: e.personal || '', school: e.school || '' }; } catch (e) { /* ignore */ }
  let acctSwap = false;
  try { acctSwap = localStorage.getItem('isocity-acct-swap') === '1'; } catch (e) { /* ignore */ }
  const uIdx = (a) => (acctSwap ? 1 - a : a);
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
  let perfForced = false;
  try { perfForced = localStorage.getItem('isocity-smooth') === '1'; } catch (e) { /* ignore */ }
  const weakStart = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let perfMaxDpr = (perfForced || weakStart) ? 1 : 1.25;
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
  const clearObj = (o) => { for (const k of Object.keys(o)) delete o[k]; };
  const safeHref = (u) => {
    try { const p = new URL(String(u || ''), location.href); return (p.protocol === 'https:' || p.protocol === 'http:') ? p.href : '#'; } catch (e) { return '#'; }
  };
  let rotSteps = 0;
  function rotPt(x, y, steps = rotSteps) {
    let rx = x, ry = y;
    for (let i = 0; i < (steps & 3); i++) { const nx = N - 1 - ry, ny = rx; rx = nx; ry = ny; }
    return [rx, ry];
  }
  const unrotPt = (x, y) => rotPt(x, y, (4 - (rotSteps & 3)) & 3);

  function allItems() {
    return [...REPOS, ...GOOGLE_APPS, ...customItems].map((it) => ({ ...it, ...(overrides[it.id] || {}) }));
  }

  // Personal = u/0, School = u/1. Chat always uses the school account; Calendar is personal only.
  const FORCED_ACCT = { 'google-chat': 1, 'google-calendar': 0, 'toddle': 1 };
  const GOOGLE_HOSTS = /^(docs|mail|drive|chat|calendar)\.google\.com$/;
  function applyAccountToUrl(url, acct, email = '') {
    if (!url || (acct === undefined && !email)) return url;
    if (email) {
      try {
        const x = new URL(url);
        if (!GOOGLE_HOSTS.test(x.host)) return url;
        x.pathname = x.pathname.replace(/\/u\/\d+\//, '/');
        x.searchParams.set('authuser', email);
        return x.toString();
      } catch (e) { return url; }
    }
    if (/\/u\/\d+\//.test(url)) return url.replace(/\/u\/\d+\//, `/u/${acct}/`);
    try {
      const x = new URL(url);
      if (!GOOGLE_HOSTS.test(x.host)) return url;
      x.searchParams.set('authuser', acct);
      return x.toString();
    } catch (e) { return url; }
  }

  function getItem(id, acctOv) {
    const base = repoMap.get(id) || googleMap.get(id) || customItems.find((c) => c.id === id) || REPOS[0];
    const merged = { ...base, ...(overrides[base.id] || {}) };
    const acctForced = FORCED_ACCT[merged.id];
    if (merged.kind === 'google' && (acctOv !== undefined || acctForced !== undefined || accountPrefs[merged.id] !== undefined || globalAcct !== 0 || acctSwap || acctEmails.personal || acctEmails.school)) {
      const la = acctForced !== undefined ? acctForced : (acctOv !== undefined ? acctOv : (accountPrefs[merged.id] !== undefined ? accountPrefs[merged.id] : globalAcct));
      const a = uIdx(la);
      const em = la === 1 ? acctEmails.school : acctEmails.personal;
      merged.web = applyAccountToUrl(merged.web, a, em);
      merged.alt = applyAccountToUrl(merged.alt, a, em);
      if (Array.isArray(merged.shortcuts)) {
        merged.shortcuts = merged.shortcuts.map((s) => ({ ...s, url: applyAccountToUrl(s.url, a, em) }));
      }
    }
    return merged;
  }

  // Opens the network connection to a site early (DNS, TCP, TLS), so the page loads sooner when you click.
  const warmedOrigins = new Set();
  function warmUrl(u) {
    try {
      const o = new URL(u, location.href).origin;
      if (!/^https?:/.test(o) || o === location.origin || warmedOrigins.has(o)) return;
      warmedOrigins.add(o);
      const l = document.createElement('link'); l.rel = 'preconnect'; l.href = o;
      document.head.appendChild(l);
    } catch (e) { /* ignore */ }
  }
  let lastWarmId = '';
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
      themeId, timeMode, simSpeed, weather, darkMode, cbMode, largeText, ghostMode, rotSteps,
      showAgents, showLabels, showHeatmap, money, dayCount, hour, needs,
      simStats, grid, levels, pins, customItems, overrides, bookmarks, accountPrefs, timetable, deadlines, quickNoteText, studyStreak,
    };
  }
  function saveNow() {
    if (switchingCity) return;
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
    document.body.style.background = mix(curTheme().skyNight, curTheme().skyDay, daylight(hour));
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
  let nycLots = null;
  function starter() {
    if (isNYC) {
      rotSteps = 0; selectedTile = null;
      const m = NYC.build();
      grid = m.grid; levels = m.levels; pins = makePins(); nycLots = m.lots;
      assignUnpinnedItems();
      return;
    }
    rotSteps = 0;
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
    if (isNYC) {
      if (!nycLots) nycLots = NYC.build().lots;
      for (const [ox, oy] of (kind === 'google' ? nycLots.google : nycLots.github)) {
        const [sx, sy] = rotPt(ox, oy);
        if (!pins[sx][sy] && isBuilding(grid[sx][sy])) return { x: sx, y: sy, t: preferType || grid[sx][sy], lv: levels[sx][sy] || 1 };
      }
      return null;
    }
    const pool = kind === 'google' ? D.SPARE_SOUTH : D.SPARE_NORTH;
    for (const [sx0, sy0, st, slv] of pool) {
      const [sx, sy] = rotPt(sx0, sy0);
      if (!pins[sx][sy] && (grid[sx][sy] === 'forest' || grid[sx][sy] === 'park')) {
        return { x: sx, y: sy, t: preferType || st, lv: slv };
      }
    }
    const yMin = kind === 'google' ? 20 : 3;
    const yMax = kind === 'google' ? N - 3 : 16;
    for (let x = 3; x < N - 3; x++) for (let y = 3; y < N - 3; y++) {
      const [, uy] = unrotPt(x, y);
      if (uy < yMin || uy > yMax) continue;
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
    if (!d || !Array.isArray(d.grid) || d.grid.length !== N || !d.grid.every((row) => Array.isArray(row) && row.length === N)) return false;
    grid = d.grid.map((row) => row.map((t) => (t && TYPES[t]) ? t : null));
    levels = (Array.isArray(d.levels) && d.levels.length === N)
      ? d.levels.map((row) => Array.isArray(row) ? Array.from({ length: N }, (_, j) => Math.max(1, Math.min(3, Number(row[j]) || 1))) : Array(N).fill(1))
      : makeLevels();
    pins = (Array.isArray(d.pins) && d.pins.length === N)
      ? d.pins.map((row) => Array.isArray(row) ? Array.from({ length: N }, (_, j) => (row[j] && typeof row[j] === 'string') ? row[j] : null) : Array(N).fill(null))
      : makePins();
    pins = pins.map((row) => row.map((v) => (v === 'co-bo-u' ? 'uni-plan' : v === 'cham-merch-designs' ? 'cham-merch-design' : (v === 'pomodoro' || v === 'quick-notes') ? null : v)));
    rotSteps = Number.isInteger(d.rotSteps) ? ((d.rotSteps % 4) + 4) % 4 : 0;

    themeId = D.THEMES[d.themeId] ? d.themeId : 'autumn';
    timeMode = (d.timeMode === 'auto' || d.timeMode === 'realtime' || d.timeMode === 'paused') ? d.timeMode : 'auto';
    simSpeed = Number.isFinite(d.simSpeed) ? Math.max(0, Math.min(5, d.simSpeed)) : 1;
    weather = (d.weather === 'clear' || d.weather === 'rain' || d.weather === 'overcast') ? d.weather : 'clear';
    darkMode = !!d.darkMode; cbMode = !!d.cbMode; largeText = !!d.largeText; ghostMode = !!d.ghostMode;
    showAgents = d.showAgents !== false; showLabels = d.showLabels !== false; showHeatmap = d.showHeatmap !== false;
    money = Number.isFinite(d.money) ? d.money : 5000;
    dayCount = Number.isFinite(d.dayCount) ? Math.max(1, d.dayCount) : 1;
    hour = Number.isFinite(d.hour) ? ((d.hour % 24) + 24) % 24 : 17.4;
    if (d.needs && typeof d.needs === 'object' && !Array.isArray(d.needs)) needs = { ...needs, ...d.needs };
    if (d.simStats && typeof d.simStats === 'object' && !Array.isArray(d.simStats)) simStats = { ...simStats, ...d.simStats };
    customItems.splice(0, customItems.length, ...(Array.isArray(d.customItems) ? d.customItems : []));
    clearObj(overrides);
    if (d.overrides && typeof d.overrides === 'object' && !Array.isArray(d.overrides)) Object.assign(overrides, d.overrides);
    clearObj(bookmarks);
    if (d.bookmarks && typeof d.bookmarks === 'object' && !Array.isArray(d.bookmarks)) Object.assign(bookmarks, d.bookmarks);
    clearObj(accountPrefs);
    if (d.accountPrefs && typeof d.accountPrefs === 'object' && !Array.isArray(d.accountPrefs)) Object.assign(accountPrefs, d.accountPrefs);
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
    let shareParsed = null;
    if (location.hash.startsWith('#city=')) {
      try {
        shareParsed = JSON.parse(decodeURIComponent(atob(location.hash.slice(6))));
      } catch (e) {}
    }
    let loadedSave = false;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      loadedSave = applySaveData(saved);
    } catch (e) {}
    if (shareParsed && typeof shareParsed === 'object') {
      if (shareParsed.themeId && D.THEMES[shareParsed.themeId]) themeId = shareParsed.themeId;
      if (Number.isFinite(shareParsed.hour)) hour = ((shareParsed.hour % 24) + 24) % 24;
      if (Array.isArray(shareParsed.customItems)) {
        for (const ci of shareParsed.customItems) {
          if (ci && ci.id && !customItems.some((x) => x.id === ci.id)) customItems.push(ci);
        }
      }
      if (shareParsed.overrides && typeof shareParsed.overrides === 'object') Object.assign(overrides, shareParsed.overrides);
      if (shareParsed.bookmarks && typeof shareParsed.bookmarks === 'object') Object.assign(bookmarks, shareParsed.bookmarks);
      if (loadedSave) { assignUnpinnedItems(); syncBodyPrefs(); rebuildCrownSprites(); }
    }
    return loadedSave;
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
    // Largest connected body of water only, so boats never spawn in a pond or reservoir
    const seenW = new Uint8Array(N * N); let best = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      if (seenW[x * N + y] || !isWater(grid[x][y])) continue;
      const comp = [], q = [[x, y]]; seenW[x * N + y] = 1;
      while (q.length) {
        const [cx, cy] = q.pop(); comp.push([cx, cy]);
        for (const [dx, dy] of NB) { const nx = cx + dx, ny = cy + dy; if (inb(nx, ny) && !seenW[nx * N + ny] && isWater(grid[nx][ny])) { seenW[nx * N + ny] = 1; q.push([nx, ny]); } }
      }
      if (comp.length > best.length) best = comp;
    }
    return best;
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
  const MAX_ZOOM = 2.0;
  const maxZoom = () => (cutawayGeom() ? 6.0 : MAX_ZOOM); // look closer while an interior is open
  let preCutCam = null; // city view to return to when the interior is closed
  const finiteCam = () => Number.isFinite(cam.x) && Number.isFinite(cam.y) && Number.isFinite(cam.z) && cam.z > 0;
  function flyToTile(x, y, targetZ = null, withDrawer = true) {
    if (!finiteCam()) center(false);
    const tz = Math.max(0.45, Math.min(maxZoom(), targetZ || Math.max(cam.z, W >= 760 ? 1.05 : 0.9)));
    const offsetX = (withDrawer && W >= 760 && !viewInset) ? -150 : 0;
    const centerY = (withDrawer && W < 760) ? H * 0.34 : H * 0.54;
    const tx = viewInset + (W - viewInset) / 2 + offsetX - ((x + 0.5) - (y + 0.5)) * (TW / 2) * tz;
    const ty = centerY - ((x + 0.5) + (y + 0.5)) * (TH / 2) * tz + 28 * tz;
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(tz)) return;
    if (reduceMotion) { cam.x = tx; cam.y = ty; cam.z = tz; camAnim = null; return; }
    camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: performance.now(), dur: 380 };
  }

  // ---------- color / light ----------
  function daylight(h) {
    const s = Math.sin(((h - 6) / 24) * Math.PI * 2);
    return Math.max(0, Math.min(1, s * 1.6 + 0.5));
  }
  const hex = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))
    ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
    : [128, 128, 128];
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
    if (opts.windows) windows(x0, y0, x1, y1, z0, z1, L, opts.windows, opts.glass, opts.thresh || 0.35, opts.startRow || 0);
  }
  function windows(x0, y0, x1, y1, z0, z1, L, seed, glass = false, thresh = 0.35, startRow = 0) {
    const rows = Math.max(1, Math.floor((z1 - z0) / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const night = 1 - L;
    const dx = x1 - x0, dy = y1 - y0;
    const darkL = shade(glass ? '#486d8a' : '#27333f', 1, L);
    const darkR = shade(glass ? '#37566f' : '#1f2a35', 1, L);
    for (let r = startRow; r < rows; r++) {
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
    if (isNYC && t === 'house') return 38; // three storeys over a raised basement
    if (!d.grow || lv <= 1) return d.h;
    return Math.round(d.h * (lv === 2 ? 1.32 : 1.68));
  }

  // Ground-floor shopfronts: a recessed frame with two glass panes per street face and a door gap.
  // Drawn once in daylight colours into the world image and again in warm colours into the night window sprites.
  const STOREFRONT = { shop: 1, apt: 1, office: 1 };
  function faceL(x0, x1, y, z0, z1, fill) { poly4(px(x0, y), py(x0, y, z0), px(x1, y), py(x1, y, z0), px(x1, y), py(x1, y, z1), px(x0, y), py(x0, y, z1), fill); }
  function faceR(x, y0, y1, z0, z1, fill) { poly4(px(x, y0), py(x, y0, z0), px(x, y1), py(x, y1, z0), px(x, y1), py(x, y1, z1), px(x, y0), py(x, y0, z1), fill); }
  function storefront(x0, y0, x1, y1, frame, glassL, glassR) {
    const dx = x1 - x0, dy = y1 - y0;
    if (frame) { faceL(x0 + dx * 0.04, x1 - dx * 0.04, y1, 0.5, 10, frame); faceR(x1, y0 + dy * 0.04, y1 - dy * 0.04, 0.5, 10, frame); }
    for (const [a, b] of [[0.08, 0.42], [0.58, 0.92]]) {
      faceL(x0 + dx * a, x0 + dx * b, y1, 1.5, 8.5, glassL);
      faceR(x1, y0 + dy * a, y0 + dy * b, 1.5, 8.5, glassR);
    }
  }

  // NYC district look for a tile, read from its original map position so it is stable under rotation
  function nycInfo(x, y) {
    if (!isNYC) return null;
    const [ux, uy] = unrotPt(x, y);
    return { r: NYC.regionOf(ux, uy), lm: NYC.LANDMARKS[`${ux},${uy}`] || null, h: NYC.hash(ux, uy, 5) };
  }
  // Street walls: row houses and Manhattan blocks fill their lots so façades read as continuous
  function insetFor(x, y, t) {
    const d = TYPES[t];
    if (!d) return 0.1;
    if (!isNYC) return d.inset;
    const r = nycInfo(x, y).r;
    if (t === 'house' && (r === 'brooklyn' || r === 'queens' || r === 'bkwater')) return 0.03;
    if ((t === 'apt' || t === 'shop') && r && r !== 'staten' && r !== 'roosevelt' && r !== 'lic') return 0.04;
    return d.inset;
  }

  // ----- NYC landmark shapes and street-level details -----
  function drawSpireTower(X0, Y0, X1, Y1, L) {
    // Podium, then a glass shaft that tapers as it rises, a parapet and a slender spire
    box(X0, Y0, X1, Y1, 0, 16, '#6f7f8c', L, { roof: '#8a98a3' });
    const steps = 9, top = 230;
    for (let k = 0; k < steps; k++) {
      const f0 = k / steps, z0 = 16 + (top - 16) * f0, z1 = 16 + (top - 16) * (k + 1) / steps, ins = 0.04 + f0 * 0.16;
      box(X0 + ins, Y0 + ins, X1 - ins, Y1 - ins, z0, z1 + 0.5, k % 2 ? '#86a6c0' : '#7c9cb8', L, { roof: '#a9c2d6' });
    }
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    box(cx - 0.05, cy - 0.05, cx + 0.05, cy + 0.05, top, top + 8, '#b8c4cc', L);
    rctx.strokeStyle = shade('#e8ecef', 1, L); rctx.lineWidth = Math.max(0.8, 0.9 * rcam.z);
    rctx.beginPath(); rctx.moveTo(px(cx, cy), py(cx, cy, top + 8)); rctx.lineTo(px(cx, cy), py(cx, cy, top + 70)); rctx.stroke();
  }
  function drawSteppedTower(X0, Y0, X1, Y1, L) {
    // Stone tower with setbacks, a stepped crown and a mast
    const tiers = [[0, 96, 0], [96, 150, 0.09], [150, 182, 0.17], [182, 198, 0.24], [198, 210, 0.3]];
    tiers.forEach(([z0, z1, ins], k) => box(X0 + ins, Y0 + ins, X1 - ins, Y1 - ins, z0, z1, k < 3 ? '#cbbfa9' : '#d9cdb5', L, { roof: '#bfb39c', windows: k < 3 ? 31 + k : 0, thresh: 0.3 }));
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    rctx.strokeStyle = shade('#d9d4c9', 1, L); rctx.lineWidth = Math.max(1, 1.2 * rcam.z);
    rctx.beginPath(); rctx.moveTo(px(cx, cy), py(cx, cy, 210)); rctx.lineTo(px(cx, cy), py(cx, cy, 250)); rctx.stroke();
  }
  function drawFlatiron(X0, Y0, X1, Y1, L) {
    // Wedge on a triangular lot: two street façades meeting at a sharp corner, cornice and window rows
    const H = 72;
    faceL(X0, X1, Y1, 0, H, shade('#d6c8ad', 0.86, L));
    faceR(X1, Y0, Y1, 0, H, shade('#d6c8ad', 0.7, L));
    poly4(px(X0, Y1), py(X0, Y1, H), px(X1, Y1), py(X1, Y1, H), px(X1, Y0), py(X1, Y0, H), px(X1, Y0), py(X1, Y0, H), shade('#c2b49a', 1.05, L));
    for (let r = 0; r < 9; r++) {
      const z0 = 6 + r * 7.2;
      for (let c = 0; c < 6; c++) {
        const a = (c + 0.25) / 6, b = (c + 0.75) / 6;
        faceL(X0 + (X1 - X0) * a, X0 + (X1 - X0) * b, Y1 + 0.002, z0, z0 + 4, shade('#3a4048', 1, L));
        faceR(X1 + 0.002, Y0 + (Y1 - Y0) * a, Y0 + (Y1 - Y0) * b, z0, z0 + 4, shade('#30363d', 1, L));
      }
    }
    faceL(X0, X1, Y1 + 0.004, H - 3, H, shade('#a89a80', 0.9, L)); faceR(X1 + 0.004, Y0, Y1, H - 3, H, shade('#a89a80', 0.75, L));
  }
  function drawRowhouseDetails(X0, Y0, X1, Y1, H, L, ny) {
    // Cornice, stoop with railings up to a parlour-floor door, basement window, occasional fire escape
    box(X0 - 0.012, Y0 - 0.012, X1 + 0.012, Y1 + 0.012, H - 1.6, H + 0.6, '#3f3a36', L, { roof: '#5a524c' });
    const sx0 = X0 + (X1 - X0) * 0.1, sx1 = X0 + (X1 - X0) * 0.32;
    for (let k = 0; k < 4; k++) box(sx0, Y1, sx1, Y1 + 0.13 - k * 0.03, 0, 1.4 + k * 1.3, '#7a6a5a', L, { roof: '#8d7d6b' });
    rctx.strokeStyle = shade('#1f1f1f', 1, L); rctx.lineWidth = Math.max(0.5, 0.45 * rcam.z);
    rctx.beginPath();
    for (const xx of [sx0, sx1]) { rctx.moveTo(px(xx, Y1 + 0.13), py(xx, Y1 + 0.13, 2.4)); rctx.lineTo(px(xx, Y1 + 0.01), py(xx, Y1 + 0.01, 7.4)); }
    rctx.stroke();
    faceL(sx0 + 0.02, sx1 - 0.02, Y1 + 0.003, 5.4, 12.4, shade('#3a2a20', 1, L));                         // door
    faceL(X0 + (X1 - X0) * 0.55, X0 + (X1 - X0) * 0.85, Y1 + 0.003, 0.6, 3, shade('#2a2f33', 1, L));        // basement window
    if (ny.h > 0.72) { // fire escape: landings and ladders on the street façade
      const fx0 = X0 + (X1 - X0) * 0.5, fx1 = X0 + (X1 - X0) * 0.9;
      rctx.beginPath();
      for (const z of [16, 26, 36]) { rctx.moveTo(px(fx0, Y1 + 0.04), py(fx0, Y1 + 0.04, z)); rctx.lineTo(px(fx1, Y1 + 0.04), py(fx1, Y1 + 0.04, z)); }
      rctx.moveTo(px(fx1 - 0.04, Y1 + 0.04), py(fx1 - 0.04, Y1 + 0.04, 16)); rctx.lineTo(px(fx0 + 0.04, Y1 + 0.04), py(fx0 + 0.04, Y1 + 0.04, 26));
      rctx.moveTo(px(fx0 + 0.04, Y1 + 0.04), py(fx0 + 0.04, Y1 + 0.04, 26)); rctx.lineTo(px(fx1 - 0.04, Y1 + 0.04), py(fx1 - 0.04, Y1 + 0.04, 36));
      rctx.stroke();
    }
  }
  function drawWaterTower(cx, cy, z, L) {
    for (const [a, b] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) box(cx + a - 0.008, cy + b - 0.008, cx + a + 0.008, cy + b + 0.008, z, z + 4, '#3a3632', L);
    box(cx - 0.065, cy - 0.065, cx + 0.065, cy + 0.065, z + 4, z + 11, '#7a5a3e', L, { roof: '#6a4c34' });
    const t = z + 14;
    poly4(px(cx - 0.065, cy + 0.065), py(cx - 0.065, cy + 0.065, z + 11), px(cx + 0.065, cy + 0.065), py(cx + 0.065, cy + 0.065, z + 11), px(cx, cy), py(cx, cy, t), px(cx, cy), py(cx, cy, t), shade('#4a3a2c', 1, L));
    poly4(px(cx + 0.065, cy - 0.065), py(cx + 0.065, cy - 0.065, z + 11), px(cx + 0.065, cy + 0.065), py(cx + 0.065, cy + 0.065, z + 11), px(cx, cy), py(cx, cy, t), px(cx, cy), py(cx, cy, t), shade('#3a2c22', 1, L));
  }
  function drawFerryTerminal(x, y, L) {
    // Broad terminal hall with a glass front, deep roof slab, orange signage band and a boarding apron
    quadZ(x, y, x + 1, y + 1, 0.3, shade('#c9c2b2', 1, L));
    box(x + 0.1, y + 0.1, x + 0.9, y + 0.78, 0, 18, '#a9b3ba', L, { roof: '#d9d4c9' });
    faceL(x + 0.14, x + 0.86, y + 0.782, 1, 13, shade('#9cc2cf', 0.9, L));
    box(x + 0.06, y + 0.06, x + 0.94, y + 0.84, 18, 20.5, '#4e4b47', L, { roof: '#e6e1d6' });
    faceL(x + 0.06, x + 0.94, y + 0.842, 14.5, 17, shade('#e8762b', 1, L));
    for (let k = 0; k < 3; k++) faceL(x + 0.3 + k * 0.14, x + 0.38 + k * 0.14, y + 0.785, 1, 9, shade('#2f3a40', 1, L)); // doors
  }

  function drawTileNight(x, y, t) {
    if (!t) return;
    if (STOREFRONT[t] || t === 'house') {
      // Warm pool of light spilling from the entrance onto the pavement
      const ax = px(x + 0.5, y + 0.98), ay = py(x + 0.5, y + 0.98, 1);
      const er = (t === 'house' ? 11 : 17) * rcam.z, eg = rctx.createRadialGradient(ax, ay, 0, ax, ay, er);
      eg.addColorStop(0, 'rgba(255,205,130,0.42)'); eg.addColorStop(1, 'rgba(255,205,130,0)');
      rctx.fillStyle = eg; rctx.beginPath(); rctx.ellipse(ax, ay, er, er * 0.55, 0, 0, 7); rctx.fill();
    }
    if (isRoad(t)) {
      if (crossings.has(x * N + y)) {
        const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 1);
        const cr = 20 * rcam.z, cg = rctx.createRadialGradient(ax, ay, 0, ax, ay, cr);
        cg.addColorStop(0, 'rgba(255,226,170,0.3)'); cg.addColorStop(1, 'rgba(255,226,170,0)');
        rctx.fillStyle = cg; rctx.beginPath(); rctx.ellipse(ax, ay, cr, cr * 0.55, 0, 0, 7); rctx.fill();
      }
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
      for (const [a, b] of [[0.4, 0.4], [0.6, 0.6], [0.4, 0.6], [0.6, 0.4]]) {
        const lx = px(x + a, y + b), ly = py(x + a, y + b, 0.5), lr = 12 * rcam.z, lg = rctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
        lg.addColorStop(0, 'rgba(255,214,140,0.4)'); lg.addColorStop(1, 'rgba(255,214,140,0)');
        rctx.fillStyle = lg; rctx.beginPath(); rctx.ellipse(lx, ly, lr, lr * 0.55, 0, 0, 7); rctx.fill();
      }
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

    if (isNYC && nycInfo(x, y).lm) return;
    const i = insetFor(x, y, t);
    const x0 = x + i, y0 = y + i, x1 = x + 1 - i, y1 = y + 1 - i;
    const seed = x * 11 + y * 5;
    const glass = t === 'office' || (!!pins[x][y] && t !== 'house'); // matches the day window geometry
    const rows = Math.max(1, Math.floor(h / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const dx = x1 - x0, dy = y1 - y0;
    const store = STOREFRONT[t] ? 1 : 0;
    if (store) storefront(x0, y0, x1, y1, 1, '#ffd48a', '#f2b866');
    for (let r = store; r < rows; r++) {
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
    if (isNYC) { winSprites = []; return; } // per-building sprites are too heavy for the big map; it bakes lit windows instead
    winSprites = [];
    const savedR = rctx, savedC = rcam, savedW = warm;
    warm = 0;
    const SS = 2;
    for (const [x, y, t] of buildingsList) {
      if (t === 'wheel' || t === 'windmill') continue;
      if (x === cutX && y === cutY) continue;
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
    const WZ = -7;
    quadZ(x, y, x + 1, y + 1, WZ, shade((x + y) % 2 ? th.waterA : th.waterB, 1, L));
    // Recessed canal: stone retaining walls on the far banks, a darker wet band and a pale waterline
    const wallX = inb(x - 1, y) && !isWater(grid[x - 1][y]);
    const wallY = inb(x, y - 1) && !isWater(grid[x][y - 1]);
    if (wallX) {
      faceR(x, y, y + 1, WZ, 1.2, shade('#8f8b80', 0.92, L));
      faceR(x, y, y + 1, WZ, WZ + 1.6, shade('#4c4a45', 1, L));
      faceR(x, y, y + 1, 0.6, 1.2, shade('#cfcabd', 1, L));
    }
    if (wallY) {
      faceL(x, x + 1, y, WZ, 1.2, shade('#a39f93', 0.95, L));
      faceL(x, x + 1, y, WZ, WZ + 1.6, shade('#55534d', 1, L));
      faceL(x, x + 1, y, 0.6, 1.2, shade('#ddd8cb', 1, L));
    }
    // Soft contact shade on the water under each wall, plus a restrained highlight down the middle
    if (wallX) quadZ(x, y, x + 0.14, y + 1, WZ + 0.05, 'rgba(10,16,24,0.22)');
    if (wallY) quadZ(x, y, x + 1, y + 0.14, WZ + 0.05, 'rgba(10,16,24,0.22)');
    if ((x * 7 + y * 3) % 4 === 0) quadZ(x + 0.35, y + 0.46, x + 0.62, y + 0.52, WZ + 0.1, 'rgba(230,244,248,0.18)');
    // Quayside character: steps down to the water on some walls, mooring posts on others
    const [ux, uy] = unrotPt(x, y), h4 = (ux * 7 + uy * 13) % 5;
    if (wallY && h4 === 0) for (let k = 0; k < 4; k++) box(x + 0.32 + k * 0.03, y, x + 0.5, y + 0.05 + k * 0.035, WZ, 1.2 - k * 2.1, '#b3ad9f', L);
    else if (wallX && h4 === 1) for (let k = 0; k < 4; k++) box(x, y + 0.32 + k * 0.03, x + 0.05 + k * 0.035, y + 0.5, WZ, 1.2 - k * 2.1, '#a8a294', L);
    if (wallY && h4 >= 2) for (const a of [0.25, 0.75]) box(x + a - 0.02, y - 0.06, x + a + 0.02, y - 0.02, 1.2, 3.6, '#3a3632', L, { roof: '#55504a' });
    if (wallX && h4 >= 3) box(x - 0.06, y + 0.48, x - 0.02, y + 0.52, 1.2, 3.6, '#3a3632', L, { roof: '#55504a' });
  }

  function drawRoad(x, y, L, bridge = false, skipWater = false, deckOnly = false) {
    const th = curTheme();
    const z = bridge ? 2 : 0;
    if (bridge) {
      if (!skipWater) drawWater(x, y, L);
      if (!deckOnly) {
        box(x + 0.12, y + 0.12, x + 0.24, y + 0.24, -7, 0, '#6d6a62', L);
        box(x + 0.76, y + 0.76, x + 0.88, y + 0.88, -7, 0, '#6d6a62', L);
      }
      // Thicker deck with a stone fascia, then low rails along the two open sides
      box(x + 0.03, y + 0.03, x + 0.97, y + 0.97, -2.5, z, '#9a958a', L, { roof: th.road });
      const alongX = (inb(x - 1, y) && isRoad(grid[x - 1][y])) || (inb(x + 1, y) && isRoad(grid[x + 1][y]));
      if (alongX) {
        box(x, y + 0.03, x + 1, y + 0.09, z, z + 3.2, '#d8d3c6', L);
        box(x, y + 0.91, x + 1, y + 0.97, z, z + 3.2, '#d8d3c6', L);
      } else {
        box(x + 0.03, y, x + 0.09, y + 1, z, z + 3.2, '#d8d3c6', L);
        box(x + 0.91, y, x + 0.97, y + 1, z, z + 3.2, '#d8d3c6', L);
      }
    } else {
      // Raised pavement (SW = 1.4px kerb) with the carriageway sunk to street level
      const SW = 1.4;
      const nX = inb(x - 1, y) && isRoad(grid[x - 1][y]) ? 0 : 0.11;
      const pX = inb(x + 1, y) && isRoad(grid[x + 1][y]) ? 1 : 0.89;
      const nY = inb(x, y - 1) && isRoad(grid[x][y - 1]) ? 0 : 0.11;
      const pY = inb(x, y + 1) && isRoad(grid[x][y + 1]) ? 1 : 0.89;
      quadZ(x, y, x + 1, y + 1, SW, shade(th.curb, 1, L));
      quadZ(x + nX, y + nY, x + pX, y + pY, 0, shade(th.road, 1, L));
      // Kerb faces on the far sides of the carriageway catch the light; near-side pavement is redrawn on top
      if (nY > 0) faceL(x + nX, x + pX, y + nY, 0, SW, shade(th.curb, 0.78, L));
      if (nX > 0) faceR(x + nX, y + nY, y + pY, 0, SW, shade(th.curb, 0.66, L));
      if (pY < 1) quadZ(x, y + pY, x + 1, y + 1, SW, shade(th.curb, 1, L));
      if (pX < 1) quadZ(x + pX, y, x + 1, y + 1, SW, shade(th.curb, 1, L));
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
  // Each theme colour pair gets three canopy shapes: round, tall and a wide cluster.
  // crownSprites[colour * CROWN_SHAPES + shape]
  const CROWN_SHAPES = 3;
  function rebuildCrownSprites() {
    crownSprites = [];
    for (const [dark, light] of curTheme().crowns) {
      for (let shape = 0; shape < CROWN_SHAPES; shape++) {
        const c = document.createElement('canvas');
        c.width = SPR_W * SPR_S; c.height = SPR_H * SPR_S;
        const sc = c.getContext('2d');
        sc.setTransform(SPR_S, 0, 0, SPR_S, 0, 0);
        const R = 10;
        if (shape === 0) {
          sc.fillStyle = dark; sc.beginPath(); sc.arc(SPR_CX, SPR_CY, R, 0, 7); sc.fill();
          sc.fillStyle = light; sc.beginPath(); sc.arc(SPR_CX - R * 0.25, SPR_CY - R * 0.3, R * 0.68, 0, 7); sc.fill();
        } else if (shape === 1) {
          sc.fillStyle = dark; sc.beginPath(); sc.ellipse(SPR_CX, SPR_CY - 2, R * 0.78, R * 1.32, 0, 0, 7); sc.fill();
          sc.fillStyle = light; sc.beginPath(); sc.ellipse(SPR_CX - R * 0.22, SPR_CY - R * 0.55, R * 0.5, R * 0.85, 0, 0, 7); sc.fill();
        } else {
          sc.fillStyle = dark;
          for (const [ox, oy, r] of [[-6.5, 1.5, 7.2], [6.5, 1.5, 7.2], [0, -3, 8.2]]) { sc.beginPath(); sc.arc(SPR_CX + ox, SPR_CY + oy, r, 0, 7); sc.fill(); }
          sc.fillStyle = light;
          for (const [ox, oy, r] of [[-8, -0.5, 4.2], [2.5, -6, 5]]) { sc.beginPath(); sc.arc(SPR_CX + ox, SPR_CY + oy, r, 0, 7); sc.fill(); }
        }
        crownSprites.push(c);
      }
    }
  }
  rebuildCrownSprites();

  function tree(x, y, s, L, seed = 0) {
    box(x - 0.025, y - 0.025, x + 0.025, y + 0.025, 0, 8 * s, '#4a3624', L);
    const cx = px(x, y), cy = py(x, y, 19 * s);
    const k = s * rcam.z;
    const nCol = crownSprites.length / CROWN_SHAPES;
    const spr = crownSprites[(Math.abs(seed) % nCol) * CROWN_SHAPES + ((Math.abs(seed) >>> 5) % CROWN_SHAPES)];
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
    if (showHeatmap && (t === 'park' || t === 'forest')) {
      const [hx, hy] = unrotPt(x, y);
      if (hx >= 11 && hx <= 17 && hy >= 11 && hy <= 13) {
        const heatLvl = ((hx * 5 + hy * 3) % 4);
        const cols = ['rgba(15,118,110,0.22)', 'rgba(20,184,166,0.34)', 'rgba(52,211,153,0.46)', 'rgba(232,184,50,0.52)'];
        quadZ(x + 0.14, y + 0.14, x + 0.86, y + 0.86, 0.25, cols[heatLvl]);
      }
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
      // Full coverage (all five spots, as originally). Variety comes from height, canopy shape, colour and a
      // small offset. Everything is seeded and positioned in the original map's frame and then turned with
      // the view, so the same trees stay in the same places across reloads, panning, zoom and rotation.
      const [ux, uy] = unrotPt(x, y);
      const sd = ux * 17 + uy * 31;
      const spots = [];
      for (let i = 0; i < 5; i++) {
        const jit = Math.imul(sd + i * 7919, 2654435761) >>> 0;
        let a = FOREST_SPOTS[i][0] + (((jit >>> 4) % 7) - 3) * 0.018;
        let b = FOREST_SPOTS[i][1] + (((jit >>> 9) % 7) - 3) * 0.018;
        for (let r = 0; r < rotSteps; r++) { const t = a; a = 1 - b; b = t; } // original frame -> current view
        spots.push({ a, b, sc: 0.74 + ((jit >>> 24) % 7) * 0.09, cs: Math.imul(sd + i * 977, 2654435761) >>> 20 });
      }
      spots.sort((p, q) => (p.a + p.b) - (q.a + q.b)); // back to front
      for (const t2 of spots) tree(x + t2.a, y + t2.b, t2.sc, L, t2.cs);
      return;
    }
    if (t === 'road' || t === 'bridge') {
      drawRoad(x, y, L, t === 'bridge', skipGround);
      return;
    }
    if (t === 'park') {
      quadZ(x + 0.12, y + 0.44, x + 0.88, y + 0.56, 0.2, shade('#cfc3aa', 1, L));
      box(x + 0.44, y + 0.36, x + 0.58, y + 0.42, 0.2, 2.5, '#7a5436', L);
      const [pux, puy] = unrotPt(x, y);
      const sd = pux * 7 + puy * 3;
      const pt = [[0.26, 0.26, 1, 0], [0.74, 0.65, 0.85, 1]];
      if (sd % 2) pt.push([0.3, 0.78, 0.7, 2]);
      const placed = pt.map(([a, b, sc, k]) => { for (let r = 0; r < rotSteps; r++) { const t = a; a = 1 - b; b = t; } return { a, b, sc, k }; });
      placed.sort((p, q) => (p.a + p.b) - (q.a + q.b));
      for (const t2 of placed) tree(x + t2.a, y + t2.b, t2.sc, L, Math.imul(sd + t2.k * 977, 2654435761) >>> 20);
      return;
    }
    if (t === 'plaza' && isNYC) {
      const ny = nycInfo(x, y);
      if (ny.lm === 'portal' || ny.lm === 'cut') { quadZ(x, y, x + 1, y + 1, 0.3, shade('#b5aea2', 1, L)); return; }
      if (ny.lm === 'ferryMan' || ny.lm === 'ferrySI') { drawFerryTerminal(x, y, L); return; }
      if (!ny.r) { // pier over the water: concrete deck on piles, bollards along the edge
        for (const [a, b] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]) box(x + a - 0.03, y + b - 0.03, x + a + 0.03, y + b + 0.03, -7, 1.2, '#5e5a52', L);
        box(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0, 1.4, '#a49d90', L, { roof: '#bdb6a8' });
        for (let k = 0; k < 4; k++) box(x + 0.12 + k * 0.24, y + 0.9, x + 0.16 + k * 0.24, y + 0.94, 1.4, 3, '#3a3632', L);
        return;
      }
    }
    if (t === 'plaza') {
      // Civic square: patterned paving, a tiered fountain, benches facing it, planted corners and lamps
      const cx = x + 0.5, cy = y + 0.5;
      quadZ(x, y, x + 1, y + 1, 0.4, shade('#cbbfa8', 1, L));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        if ((i + j) % 2) continue;
        quadZ(x + i / 6 + 0.01, y + j / 6 + 0.01, x + (i + 1) / 6 - 0.01, y + (j + 1) / 6 - 0.01, 0.42, shade('#bfb197', 1, L));
      }
      // Paths from the centre to each edge in a warmer stone
      quadZ(x + 0.44, y, x + 0.56, y + 1, 0.44, shade('#d8c9a8', 1, L));
      quadZ(x, y + 0.44, x + 1, y + 0.56, 0.44, shade('#d8c9a8', 1, L));
      const ring = (r, z, fill) => {
        rctx.beginPath();
        for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r; k ? rctx.lineTo(px(ex, ey), py(ex, ey, z)) : rctx.moveTo(px(ex, ey), py(ex, ey, z)); }
        rctx.closePath(); rctx.fillStyle = fill; rctx.fill();
      };
      // Basin wall: draw the rim ring as a short stack so it reads as a raised edge
      for (let z = 0.4; z <= 2.2; z += 0.6) ring(0.26, z, shade('#a39886', 0.85, L));
      ring(0.26, 2.4, shade('#e4dccb', 1, L));
      ring(0.22, 1.9, shade('#5f9aa6', 1, L));
      ring(0.12, 1.95, shade('#7fb6c0', 1, L));
      box(cx - 0.035, cy - 0.035, cx + 0.035, cy + 0.035, 1.9, 6.5, '#e4dccb', L);
      ring(0.09, 6.6, shade('#d6cdbb', 1, L)); ring(0.07, 6.7, shade('#7fb6c0', 1, L));
      box(cx - 0.02, cy - 0.02, cx + 0.02, cy + 0.02, 6.6, 9.4, '#e4dccb', L, { roof: '#f2ece0' });
      // Benches facing the fountain, set back on the paths' sides
      const bench = (bx0, by0, bx1, by1) => { box(bx0, by0, bx1, by1, 0.4, 2.1, '#7a5436', L, { roof: '#9a6b44' }); };
      bench(x + 0.2, y + 0.3, x + 0.25, y + 0.4); bench(x + 0.75, y + 0.6, x + 0.8, y + 0.7);
      bench(x + 0.6, y + 0.2, x + 0.7, y + 0.25); bench(x + 0.3, y + 0.75, x + 0.4, y + 0.8);
      // Planted corners: low hedge with flowers
      for (const [a, b] of [[0.04, 0.04], [0.78, 0.04], [0.04, 0.78], [0.78, 0.78]]) {
        box(x + a, y + b, x + a + 0.18, y + b + 0.18, 0.4, 2.4, '#3d6e3a', L, { roof: '#4f8a46' });
        quadZ(x + a + 0.05, y + b + 0.05, x + a + 0.09, y + b + 0.09, 2.45, shade('#e0a04a', 1, L));
        quadZ(x + a + 0.11, y + b + 0.1, x + a + 0.14, y + b + 0.13, 2.45, shade('#d9707a', 1, L));
      }
      // Lamps by the paths
      for (const [a, b] of [[0.4, 0.4], [0.6, 0.6], [0.4, 0.6], [0.6, 0.4]]) {
        const lx = px(x + a, y + b), ly0 = py(x + a, y + b, 0.4), ly1 = py(x + a, y + b, 9);
        rctx.strokeStyle = shade('#2e3338', 1, L); rctx.lineWidth = Math.max(1, 1.1 * rcam.z);
        rctx.beginPath(); rctx.moveTo(lx, ly0); rctx.lineTo(lx, ly1); rctx.stroke();
        rctx.fillStyle = L < 0.72 ? '#ffe59c' : shade('#e9e4d4', 1, L);
        rctx.beginPath(); rctx.arc(lx, ly1, 1.6 * rcam.z, 0, 7); rctx.fill();
      }
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
    const i = insetFor(x, y, t);
    const ny = nycInfo(x, y);
    const lv = levels[x][y] || 1;
    const seed = x * 11 + y * 5;
    const red = REDS[seed % REDS.length];
    let wall = item?.customColor || (t === 'house' ? WALLS[seed % WALLS.length]
      : t === 'clinic' ? '#f2efe8'
      : t === 'school' ? '#c87c5d'
      : d.color);
    let roof = t === 'house' ? red
      : t === 'apt' ? '#a2432f'
      : t === 'shop' ? red
      : t === 'clinic' ? '#e5dfd3'
      : t === 'school' ? '#4a6b68'
      : '#4b6c8a';
    const brownstone = !!ny && t === 'house' && ny.r !== 'staten';
    if (ny && !item?.customColor) {
      const hh = ny.h;
      const BRICK = ['#8a4a36', '#7a4434', '#94573f', '#6f3f30', '#a06048'], BROWN = ['#6e4a3a', '#7a5341', '#5f4033', '#84604c', '#8a6a52'];
      if (t === 'house') { wall = (ny.r === 'brooklyn' || ny.r === 'bkwater') ? BROWN[Math.floor(hh * BROWN.length)] : ny.r === 'queens' ? BRICK[Math.floor(hh * BRICK.length)] : WALLS[seed % WALLS.length]; if (brownstone) roof = '#4b4440'; }
      else if (t === 'apt') { wall = ny.r === 'lic' ? '#7f9bb0' : ny.r === 'roosevelt' ? '#c9c2b4' : hh < 0.5 ? '#d8cfbd' : BRICK[Math.floor(hh * 10) % BRICK.length]; roof = '#6d6a66'; }
      else if (t === 'office') { wall = hh < 0.55 ? '#6f8ca3' : hh < 0.8 ? '#c8bfae' : '#4f5f6c'; roof = '#5a5f63'; }
      else if (t === 'shop') { wall = ny.r === 'bkwater' ? BRICK[Math.floor(hh * BRICK.length)] : hh < 0.5 ? '#e6dcc6' : '#b9653f'; roof = '#5d5954'; }
    }
    const H = Math.max(1, bldHeight(t, lv));
    const X0 = x + i, Y0 = y + i, X1 = x + 1 - i, Y1 = y + 1 - i;
    if (ny && ny.lm && !pinId) {
      if (!skipGround) castShadow(X0, Y0, X1, Y1, ny.lm === 'flatiron' ? 70 : 160);
      if (ny.lm === 'spire') return drawSpireTower(X0, Y0, X1, Y1, L);
      if (ny.lm === 'stepped') return drawSteppedTower(X0, Y0, X1, Y1, L);
      if (ny.lm === 'flatiron') return drawFlatiron(X0, Y0, X1, Y1, L);
    }
    if (!skipGround) {
      castShadow(X0, Y0, X1, Y1, H);
      // Cheap contact shadow hugging the footprint
      quadZ(X0 - 0.05, Y0 - 0.05, X1 + 0.07, Y1 + 0.07, 0.05, 'rgba(12,16,24,0.2)');
    }
    const thresh = 0.25 + ((x * 13 + y * 7) % 24) * 0.015;
    const store = STOREFRONT[t] ? 1 : 0;
    const dX0 = X0 + (X1 - X0) * 0.42, dX1 = X0 + (X1 - X0) * 0.58; // entrance on the front (y1) face
    if (pinId) quadZ(dX0 - 0.02, Y1, dX1 + 0.02, y + 1, 0.12, shade('#d8cdb6', 1, L)); // paved path to the pavement
    const office = !!pinId && t !== 'house';
    if (office) box(X0 - 0.025, Y0 - 0.025, X1 + 0.025, Y1 + 0.025, 0, 1.6, '#6f6a63', L, { roof: '#8a857c' }); // solid stone base
    box(X0, Y0, X1, Y1, 0, H, wall, L, { roof, windows: seed, glass: t === 'office' || office, thresh, startRow: store });
    if (store) storefront(X0, Y0, X1, Y1, shade('#2b2824', 1, L), shade('#8fb0bf', 0.95, L), shade('#6f8f9e', 0.95, L));
    if (pinId && t !== 'house') {
      // Recognisable entrance: frame, lobby glass door, canopy in the place's accent colour, steps and planters
      const accent = item?.customColor || D.LANG_COLORS[item?.lang || item?.cat || 'Web'] || '#3f7f8a';
      faceL(dX0 - 0.012, dX1 + 0.012, Y1 + 0.002, 0.4, 9.4, shade('#3a3029', 1, L));
      faceL(dX0, dX1, Y1 + 0.004, 0.6, 8.8, shade('#9cc2cf', 0.9, L));
      faceL((dX0 + dX1) / 2 - 0.004, (dX0 + dX1) / 2 + 0.004, Y1 + 0.005, 0.6, 8.8, shade('#3a3029', 1, L));
      box(dX0 - 0.05, Y1, dX1 + 0.05, Y1 + 0.07, 9.6, 10.6, accent, L, { roof: mix(accent, '#ffffff', 0.25) });
      box(dX0 - 0.03, Y1, dX1 + 0.03, Y1 + 0.03, 0, 0.6, '#cfc6b4', L);
      box(dX0 - 0.05, Y1 + 0.03, dX1 + 0.05, Y1 + 0.06, 0, 0.3, '#cfc6b4', L);
      for (const ex of [dX0 - 0.09, dX1 + 0.04]) {
        box(ex, Y1 + 0.015, ex + 0.05, Y1 + 0.065, 0, 1.6, '#8a7a66', L, { roof: '#4f8a46' });
      }
      if (item?.kind === 'github') {
        // Bike rack beside the entrance
        rctx.strokeStyle = shade('#5a6068', 1, L); rctx.lineWidth = Math.max(0.6, 0.6 * rcam.z);
        rctx.beginPath();
        for (let k = 0; k < 3; k++) { const bx = X0 + 0.06 + k * 0.035, by = Y1 + 0.05; rctx.moveTo(px(bx, by), py(bx, by, 0)); rctx.lineTo(px(bx, by), py(bx, by, 2.4)); rctx.lineTo(px(bx + 0.02, by), py(bx + 0.02, by, 2.4)); rctx.lineTo(px(bx + 0.02, by), py(bx + 0.02, by, 0)); }
        rctx.stroke();
      }
    } else if (pinId && t === 'house') {
      faceL(dX0, dX1, Y1 + 0.003, 0.3, 8.4, shade('#6b4a30', 1, L));
      box(dX0 - 0.03, Y1, dX1 + 0.03, Y1 + 0.04, 0, 0.5, '#cfc6b4', L);
    }
    if (office) {
      // Roof with visible thickness: an overhanging slab, a recessed top and a lit front edge
      box(X0 - 0.035, Y0 - 0.035, X1 + 0.035, Y1 + 0.035, H, H + 2, '#4e4b47', L, { roof: '#d9d3c6' });
      quadZ(X0 + 0.03, Y0 + 0.03, X1 - 0.03, Y1 - 0.03, H + 2.02, shade('#8f8a82', 1, L)); // membrane roof
      rctx.strokeStyle = shade('#f2ece0', 1, L); rctx.lineWidth = Math.max(0.6, 0.8 * rcam.z);
      rctx.beginPath(); rctx.moveTo(px(X0 - 0.035, Y1 + 0.035), py(X0 - 0.035, Y1 + 0.035, H + 2)); rctx.lineTo(px(X1 + 0.035, Y1 + 0.035), py(X1 + 0.035, Y1 + 0.035, H + 2)); rctx.lineTo(px(X1 + 0.035, Y0 - 0.035), py(X1 + 0.035, Y0 - 0.035, H + 2)); rctx.stroke();
      if ((t === 'shop' || t === 'school' || t === 'clinic') && lv < 2) box(X0 + 0.14, Y0 + 0.16, X0 + 0.3, Y0 + 0.3, H + 2, H + 4.5, '#b9b6ae', L, { roof: '#d6d3cb' }); // rooftop plant
    } else if (t !== 'house') {
      // Parapet: a lighter coping rim around a slightly darker recessed roof, plus a cornice band under it
      const pi = 0.05;
      quadZ(X0 + pi, Y0 + pi, X1 - pi, Y1 - pi, H, shade(roof, 0.86, L));
      faceL(X0, X1, Y1, H - 2.2, H, shade(wall, 0.62, L));
      faceR(X1, Y0, Y1, H - 2.2, H, shade(wall, 0.48, L));
      rctx.strokeStyle = shade(mix(wall, '#ffffff', 0.45), 1, L);
      rctx.lineWidth = Math.max(0.6, 0.8 * rcam.z);
      rctx.beginPath();
      rctx.moveTo(px(X0, Y1), py(X0, Y1, H)); rctx.lineTo(px(X1, Y1), py(X1, Y1, H)); rctx.lineTo(px(X1, Y0), py(X1, Y0, H));
      rctx.stroke();
      // A rooftop unit or two on mid-size flat roofs, stable per building
      if ((t === 'apt' || t === 'shop' || t === 'school') && lv < 2 && seed % 3 !== 1) {
        box(X0 + 0.16, Y0 + 0.18, X0 + 0.3, Y0 + 0.32, H, H + 3, '#b9b6ae', L, { roof: '#d6d3cb' });
      }
    }

    if (t === 'shop' && ny && !pinId) {
      faceL(X0 + (X1 - X0) * 0.06, X1 - (X1 - X0) * 0.06, Y1 + 0.003, 0.6, 9, shade('#8a8f94', 0.85, L)); // roll-up shutter band
    }
    if (t === 'shop' && !pinId) {
      poly4(px(x + i, y + 1 - i + 0.04), py(x + i, y + 1 - i + 0.04, 16), px(x + 1 - i, y + 1 - i + 0.04), py(x + 1 - i, y + 1 - i + 0.04, 16),
        px(x + 1 - i, y + 1 - i + 0.13), py(x + 1 - i, y + 1 - i + 0.13, 11), px(x + i, y + 1 - i + 0.13), py(x + i, y + 1 - i + 0.13, 11), shade('#c0463a', 1, L));
    }
    if (brownstone) drawRowhouseDetails(X0, Y0, X1, Y1, H, L, ny);
    else if (ny && t === 'apt' && (ny.r === 'uptown' || ny.r === 'midtown' || ny.r === 'brooklyn' || ny.r === 'bkwater') && lv <= 2 && ny.h > 0.35) drawWaterTower(X0 + (X1 - X0) * 0.62, Y0 + (Y1 - Y0) * 0.38, H + 2, L);
    if (t === 'house' && !brownstone) {
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
  // ---------- agent miniatures (people, cars, boats) ----------
  // One world scale for everything that moves: a 3.5 m lane is ~14 px wide and a storey is 14 px tall,
  // so 1 m ~ 4 px of height and a tile edge ~ 9 m. Sizes are in those units and multiplied by rcam.z only
  // at draw time, so they stay correct at every zoom and rotation.
  const MZ = 4, MT = 1 / 9;
  const PERSON_H = 1.8 * MZ; // 7.2 px: ~85% of the 8.5 px shopfront door
  const SW_Z = 1.4;          // raised pavement height (matches drawRoad)
  const WATER_Z = -7;        // canal surface (matches drawWater)

  // Height of whatever surface is under a world point: bridge deck, pavement or carriageway.
  function surfaceZ(x, y) {
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!inb(tx, ty)) return 0;
    const t = grid[tx][ty];
    if (t === 'bridge') return 2;
    if (t !== 'road') return 0;
    const fx = x - tx, fy = y - ty;
    const nX = inb(tx - 1, ty) && isRoad(grid[tx - 1][ty]) ? 0 : 0.11;
    const pX = inb(tx + 1, ty) && isRoad(grid[tx + 1][ty]) ? 1 : 0.89;
    const nY = inb(tx, ty - 1) && isRoad(grid[tx][ty - 1]) ? 0 : 0.11;
    const pY = inb(tx, ty + 1) && isRoad(grid[tx][ty + 1]) ? 1 : 0.89;
    return fx >= nX && fx <= pX && fy >= nY && fy <= pY ? 0 : SW_Z;
  }

  // Facing direction for anything moving along a path. Eases from the previous segment's direction over the
  // first 30% of a new segment, so turns at junctions read as turns instead of snapping. Render-side only.
  function heading(e) {
    const dx = e.tx - e.fx, dy = e.ty - e.fy;
    if (!dx && !dy) return [e._hx ?? 1, e._hy ?? 0];
    if (e._dx !== dx || e._dy !== dy) { e._pdx = e._dx ?? dx; e._pdy = e._dy ?? dy; e._dx = dx; e._dy = dy; }
    const k = Math.min(1, Math.max(0, e.t) / 0.3), s = k * k * (3 - 2 * k);
    let hx = e._pdx + (dx - e._pdx) * s, hy = e._pdy + (dy - e._pdy) * s;
    const l = Math.hypot(hx, hy);
    if (l < 0.3) { hx = dx; hy = dy; } else { hx /= l; hy /= l; }
    e._hx = hx; e._hy = hy;
    return [hx, hy];
  }

  // Oriented box: a along (ux,uy), b along the left-hand perpendicular. Only faces turned toward the camera
  // are filled, shaded by how much they face the lit (+y) or shaded (+x) side, matching box().
  function obox(cx, cy, ux, uy, a0, a1, b0, b1, z0, z1, side, top, L) {
    const vx = -uy, vy = ux;
    const P = (a, b) => [cx + ux * a + vx * b, cy + uy * a + vy * b];
    const c = [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)];
    const nrm = [[-vx, -vy], [ux, uy], [vx, vy], [-ux, -uy]];
    for (let i = 0; i < 4; i++) {
      const nx = Math.max(0, nrm[i][0]), ny = Math.max(0, nrm[i][1]);
      if (nrm[i][0] + nrm[i][1] <= 0.02) continue;
      const k = (0.64 * nx + 0.82 * ny) / ((nx + ny) || 1);
      const p = c[i], q = c[(i + 1) % 4];
      poly4(px(p[0], p[1]), py(p[0], p[1], z0), px(q[0], q[1]), py(q[0], q[1], z0),
        px(q[0], q[1]), py(q[0], q[1], z1), px(p[0], p[1]), py(p[0], p[1], z1),
        typeof side === 'function' ? side(i, k) : shade(side, k, L));
    }
    if (top) poly4(px(c[0][0], c[0][1]), py(c[0][0], c[0][1], z1), px(c[1][0], c[1][1]), py(c[1][0], c[1][1], z1),
      px(c[2][0], c[2][1]), py(c[2][0], c[2][1], z1), px(c[3][0], c[3][1]), py(c[3][0], c[3][1], z1), shade(top, 1.05, L));
  }
  // Soft footprint shadow, nudged away from the light.
  function footShadow(cx, cy, ux, uy, hl, hw, z, a = 0.24) {
    const vx = -uy, vy = ux, ox = 0.02, oy = 0.03;
    const P = (s, t) => [cx + ux * s + vx * t + ox, cy + uy * s + vy * t + oy];
    const c = [P(-hl, -hw), P(hl, -hw), P(hl, hw), P(-hl, hw)];
    poly4(px(c[0][0], c[0][1]), py(c[0][0], c[0][1], z), px(c[1][0], c[1][1]), py(c[1][0], c[1][1], z),
      px(c[2][0], c[2][1]), py(c[2][0], c[2][1], z), px(c[3][0], c[3][1]), py(c[3][0], c[3][1], z), `rgba(10,14,22,${a})`);
  }

  // ---- people ----
  // A handful of outfits so a crowd isn't cloned: jacket over a shirt, backpack, light shirt, etc.
  const LOOKS = [
    { top: '#34495e', pants: '#2a2d33', jacket: '#e9e4d8' },
    { top: '#ece6d8', pants: '#4a5a6e' },
    { top: '#c2553e', pants: '#2f3640', pack: '#5f7350' },
    { top: '#4f7a6a', pants: '#2a2d33', jacket: '#f0d9a8' },
    { top: '#d9b45a', pants: '#3d3a36', pack: '#3a4a5e' },
    { top: '#7c90b2', pants: '#2d3138' },
    { top: '#8a5a7a', pants: '#3a3d44', jacket: '#e6e0d4' },
    { top: '#e2ddd0', pants: '#6b5a44', pack: '#a0563a' },
  ];
  const SKINS = ['#e7c6a5', '#c99a74', '#8d5f3f', '#f0d2b6', '#b07a52'];
  const HAIRS = ['#2b211a', '#5a3b22', '#1b1b1b', '#a07a48', '#3a2c24'];
  const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  function lookFor(key) {
    const h = strHash(String(key));
    return { ...LOOKS[h % LOOKS.length], skin: SKINS[(h >>> 8) % SKINS.length], hair: HAIRS[(h >>> 16) % HAIRS.length] };
  }

  // Stride: each step covers ~0.75 m, so the leg cycle is driven by distance actually travelled (no sliding).
  const STEP_T = 0.75 * MT;
  function trackStride(e, x, y) {
    const d = e._lx === undefined ? 0 : Math.hypot(x - e._lx, y - e._ly);
    e._lx = x; e._ly = y;
    if (d < 0.5) e._dist = (e._dist || 0) + d;
    e._moving = d > 0.0004 ? Math.min(1, (e._moving || 0) + 0.25) : Math.max(0, (e._moving || 0) - 0.1);
    return (e._dist || 0) / STEP_T * Math.PI;
  }

  // Low-poly person at true scale. (x, y) is the ground point in tiles, z the surface height, (hx, hy) the facing.
  function drawHuman(x, y, z, hx, hy, look, phase, amp, opts = {}) {
    const k = rcam.z;
    const sx = px(x, y), sy = py(x, y, z);
    // Screen-space forward vector for this facing
    let fx = px(x + hx * 0.1, y + hy * 0.1) - sx, fy = py(x + hx * 0.1, y + hy * 0.1, z) - sy;
    const fl = Math.hypot(fx, fy) || 1; fx /= fl; fy /= fl;
    rctx.fillStyle = 'rgba(10,14,22,0.28)';
    rctx.beginPath(); rctx.ellipse(sx + 0.4 * k, sy + 0.2 * k, 1.7 * k, 0.85 * k, 0, 0, 7); rctx.fill();
    // Overview / Smooth: keep the true size and silhouette, drop limbs
    if (PERSON_H * k < 7 || opts.simple) {
      rctx.fillStyle = look.pants; rctx.fillRect(sx - 0.7 * k, sy - 3.3 * k, 1.4 * k, 3.3 * k);
      rctx.fillStyle = look.top; rctx.fillRect(sx - 0.95 * k, sy - 5.9 * k, 1.9 * k, 2.7 * k);
      rctx.fillStyle = look.skin; rctx.fillRect(sx - 0.6 * k, sy - 7.2 * k, 1.2 * k, 1.2 * k);
      return;
    }
    const seated = !!opts.seated;
    const hipY = sy - (seated ? 1.9 : 3.3) * k;
    const sw = Math.sin(phase) * amp;
    rctx.lineCap = 'round';
    // Legs: alternate along the facing direction (seated: thighs forward, shins down)
    rctx.strokeStyle = look.pants; rctx.lineWidth = 0.85 * k;
    for (const side of [-1, 1]) {
      const lx = sx + side * 0.45 * k;
      rctx.beginPath(); rctx.moveTo(lx, hipY);
      if (seated) { rctx.lineTo(lx + fx * 1.4 * k, hipY + fy * 1.4 * k); rctx.lineTo(lx + fx * 1.5 * k, sy); }
      else rctx.lineTo(lx + fx * side * sw * 1.1 * k, sy - Math.abs(side * sw) * 0.25 * k);
      rctx.stroke();
    }
    const backFirst = fy < 0; // walking away from camera: pack is in front of the torso on screen
    const drawPack = () => {
      if (!look.pack) return;
      rctx.fillStyle = look.pack;
      rctx.fillRect(sx - fx * 1.0 * k - 0.75 * k, sy - 5.6 * k - fy * 0.6 * k, 1.5 * k, 2.1 * k);
    };
    if (!backFirst) drawPack();
    // Torso: shoulders wider than hips
    // Seated: hips at chair height (~0.46 m), torso ~0.65 m above them
    const top = seated ? hipY - 2.4 * k : sy - 5.9 * k;
    rctx.fillStyle = look.top;
    rctx.beginPath();
    rctx.moveTo(sx - 1.05 * k, top); rctx.lineTo(sx + 1.05 * k, top);
    rctx.lineTo(sx + 0.75 * k, hipY); rctx.lineTo(sx - 0.75 * k, hipY); rctx.closePath(); rctx.fill();
    if (look.jacket && fy > -0.2) { rctx.fillStyle = look.jacket; rctx.fillRect(sx + fx * 0.35 * k - 0.22 * k, top + 0.3 * k, 0.44 * k, hipY - top - 0.4 * k); }
    if (backFirst) drawPack();
    // Arms swing opposite the legs
    rctx.strokeStyle = look.top; rctx.lineWidth = 0.6 * k;
    for (const side of [-1, 1]) {
      const ax = sx + side * 1.0 * k, ay = top + 0.35 * k;
      const s2 = opts.holding && side === 1 ? 0 : -side * sw;
      let hxp = ax + fx * s2 * 1.1 * k + (opts.holding && side === 1 ? fx * 0.9 * k : 0);
      let hyp = ay + 2.3 * k + fy * s2 * 0.5 * k - (opts.holding && side === 1 ? 0.6 * k : 0);
      if (opts.typing) {
        // Forearms forward to the tabletop (0.75 m), small alternating keystrokes
        const tap = Math.max(0, Math.sin((opts.t || 0) * 0.018 + side * 1.7 + (opts.ph || 0))) * 0.25 * k;
        hxp = ax - side * 0.35 * k + fx * 1.35 * k;
        hyp = sy - 3.0 * k + fy * 1.35 * k - tap;
      }
      rctx.beginPath(); rctx.moveTo(ax, ay); rctx.lineTo(hxp, hyp); rctx.stroke();
      rctx.fillStyle = look.skin; rctx.fillRect(hxp - 0.3 * k, hyp - 0.3 * k, 0.6 * k, 0.6 * k);
      if (opts.holding && side === 1) { rctx.fillStyle = '#5ef2d6'; rctx.fillRect(hxp + fx * 0.3 * k - 0.45 * k, hyp - 0.5 * k, 0.9 * k, 0.65 * k); }
    }
    // Head: hair sits toward the back, face toward the facing direction
    const hy0 = top - 0.95 * k;
    rctx.fillStyle = look.hair; rctx.beginPath(); rctx.arc(sx - fx * 0.2 * k, hy0 - 0.12 * k, 0.78 * k, 0, 7); rctx.fill();
    rctx.fillStyle = look.skin; rctx.beginPath(); rctx.arc(sx + fx * 0.22 * k, hy0 + 0.12 * k, 0.62 * k, 0, 7); rctx.fill();
  }

  function drawWalker(w, now) {
    const [hx, hy] = heading(w);
    // Walk on the pavement band (centre ~0.445 tile from the road centre line), same side as before
    const x = w.px + 0.5 - hy * 0.445, y = w.py + 0.5 + hx * 0.445;
    const z = surfaceZ(x, y);
    const phase = trackStride(w, w.px, w.py);
    if (!w._look) w._look = lookFor(w.name || w.color);
    drawHuman(x, y, z, hx, hy, w._look, phase, (w._moving || 0) * 0.55, { simple: perfLevel >= 2 });
  }

  // ---- vehicles ----
  // Dimensions in metres converted to tiles; heights in px. Compact car 3.9 x 1.75 m, truck 5.4 x 2.0 m,
  // minibus 8 x 2.3 m. Each sits in the right-hand lane (lane centre ~0.19 tile from the centre line).
  const VEH = {
    car: { hl: 3.9 * MT / 2, hw: 1.75 * MT / 2 },
    truck: { hl: 5.4 * MT / 2, hw: 2.0 * MT / 2 },
    bus: { hl: 8.0 * MT / 2, hw: 2.3 * MT / 2 },
    bike: { hl: 1.8 * MT / 2, hw: 0.5 * MT / 2 },
  };
  const tailGlow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,70,60,0.55)'); gr.addColorStop(1, 'rgba(255,70,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return c;
  })();
  function drawCar(c, L, headlightsOnly = false) {
    const [ux, uy] = heading(c);
    const kind = VEH[c.kind] ? c.kind : 'car';
    const { hl, hw } = VEH[kind];
    const lane = kind === 'bike' ? 0.3 : 0.19;
    const x = c.px + 0.5 - uy * lane, y = c.py + 0.5 + ux * lane; // same lane side as before
    const z0 = grid[Math.round(c.px)]?.[Math.round(c.py)] === 'bridge' ? 2 : 0;
    if (headlightsOnly) {
      if (L >= 0.5 || kind === 'bike') return;
      const hr = 9 * rcam.z, fx = x + ux * (hl + 0.06), fy = y + uy * (hl + 0.06);
      rctx.drawImage(headGlow, px(fx, fy) - hr, py(fx, fy, z0 + 2) - hr, hr * 2, hr * 2);
      const tr = 3.5 * rcam.z, bx = x - ux * hl, by = y - uy * hl;
      rctx.drawImage(tailGlow, px(bx, by) - tr, py(bx, by, z0 + 2.4) - tr, tr * 2, tr * 2);
      return;
    }
    const detail = rcam.z >= 0.7 && perfLevel < 2;
    footShadow(x, y, ux, uy, hl + 0.01, hw + 0.01, z0 + 0.06);
    if (kind === 'bike') {
      obox(x, y, ux, uy, -hl, hl, -0.012, 0.012, z0, z0 + 2.4, '#22272d', null, L);
      if (!c._look) c._look = lookFor('bike' + c.id);
      drawHuman(x, y, z0 + 1.5, ux, uy, c._look, 0, 0, { seated: true, simple: !detail });
      vehicleHits.push({ sx: px(x, y), sy: py(x, y, z0 + 3), car: c });
      return;
    }
    const paint = c.color;
    const glassF = shade('#6f8a99', 1, L), glassS = shade('#33434f', 1, L), glassR = shade('#283540', 1, L);
    const glassSide = (i, k) => (i === 1 ? glassF : i === 3 ? glassR : glassS);
    const clr = 0.9; // ground clearance (px)
    if (detail) {
      // Wheels peek out under the body at all four corners
      for (const a of [-hl * 0.62, hl * 0.62]) for (const b of [-hw, hw]) {
        obox(x + ux * a + -uy * b * 0.92, y + uy * a + ux * b * 0.92, ux, uy, -0.032, 0.032, -0.014, 0.014, z0, z0 + 2.1, '#1c1f23', '#2a2e33', L);
      }
    }
    if (kind === 'bus') {
      obox(x, y, ux, uy, -hl, hl, -hw, hw, z0 + clr, z0 + 11, paint, '#e9e6de', L);
      obox(x, y, ux, uy, -hl - 0.002, hl + 0.002, -hw - 0.002, hw + 0.002, z0 + 6, z0 + 9.4, glassSide, null, L);
      if (detail) obox(x, y, ux, uy, -hl * 0.9, hl * 0.9, -hw - 0.003, hw + 0.003, z0 + 3.2, z0 + 3.9, shade('#2c3238', 1, L), null, L);
    } else if (kind === 'truck') {
      obox(x, y, ux, uy, -hl, hl * 0.3, -hw, hw, z0 + clr, z0 + 10, '#e4dfd3', '#f1ede4', L);   // cargo box
      obox(x, y, ux, uy, hl * 0.34, hl, -hw * 0.95, hw * 0.95, z0 + clr, z0 + 4.2, paint, null, L); // cab lower
      obox(x, y, ux, uy, hl * 0.34, hl * 0.82, -hw * 0.9, hw * 0.9, z0 + 4.2, z0 + 7.6, glassSide, paint, L); // cab glass
    } else {
      obox(x, y, ux, uy, -hl, hl, -hw, hw, z0 + clr, z0 + 3.5, paint, paint, L);                     // body
      obox(x, y, ux, uy, -hl * 0.62, hl * 0.22, -hw * 0.86, hw * 0.86, z0 + 3.5, z0 + 5.9, glassSide, paint, L); // cabin
    }
    if (detail) {
      // Head- and taillights on the end faces (only the faces turned to the camera actually paint)
      const lamps = (a0, a1, col) => {
        for (const b of [-hw * 0.62, hw * 0.62]) obox(x + -uy * b, y + ux * b, ux, uy, a0, a1, -hw * 0.18, hw * 0.18, z0 + 2.2, z0 + 3.0, col, null, L);
      };
      lamps(hl - 0.004, hl + 0.004, L < 0.6 ? '#fff6d0' : '#f4efd8');
      lamps(-hl - 0.004, -hl + 0.004, L < 0.6 ? '#ff5a4a' : '#c0392f');
    }
    vehicleHits.push({ sx: px(x, y), sy: py(x, y, z0 + 3), car: c });
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
    // Small canal boat, ~6.5 x 2.0 m: tapered bow, square stern, 0.4 m freeboard and a low cabin that
    // stays under the bridge decks (deck underside is at z -2.5, cabin roof at -3.1).
    const [ux, uy] = heading(b);
    const vx = -uy, vy = ux;
    const x = b.px + 0.5, y = b.py + 0.5;
    const hl = 6.5 * MT / 2 * (b.scale || 1), hw = 2.0 * MT / 2 * (b.scale || 1);
    const deckZ = WATER_Z + 1.6;
    const P = (a, s) => [x + ux * a + vx * s, y + uy * a + vy * s];
    const hull = [P(-hl, -hw * 0.86), P(hl * 0.38, -hw), P(hl, 0), P(hl * 0.38, hw), P(-hl, hw * 0.86)];
    const moving = trackStride(b, b.px, b.py) >= 0 && (b._moving || 0) > 0.05;
    // Wake: two thin lines opening out behind the stern, fading as the boat slows
    if (moving && !reduceMotion && perfLevel < 2) {
      const a = (0.28 * (b._moving || 0)).toFixed(2);
      rctx.strokeStyle = `rgba(225,242,246,${a})`; rctx.lineWidth = Math.max(0.6, 0.7 * rcam.z);
      rctx.beginPath();
      for (const s of [-1, 1]) {
        const [sx0, sy0] = P(-hl, s * hw * 0.7), [sx1, sy1] = P(-hl - 0.2, s * hw * 2.2);
        rctx.moveTo(px(sx0, sy0), py(sx0, sy0, WATER_Z)); rctx.lineTo(px(sx1, sy1), py(sx1, sy1, WATER_Z));
      }
      rctx.stroke();
    }
    // Waterline shadow
    const sh = hull.map(([hx, hy]) => [hx + 0.015, hy + 0.02]);
    rctx.fillStyle = 'rgba(8,16,22,0.22)';
    rctx.beginPath(); sh.forEach(([hx, hy], i) => (i ? rctx.lineTo(px(hx, hy), py(hx, hy, WATER_Z)) : rctx.moveTo(px(hx, hy), py(hx, hy, WATER_Z)))); rctx.closePath(); rctx.fill();
    // Hull sides that face the camera, from the waterline up to the deck
    for (let i = 0; i < hull.length; i++) {
      const p = hull[i], q = hull[(i + 1) % hull.length];
      const ex = q[0] - p[0], ey = q[1] - p[1];
      const nx = ey, ny = -ex; // outward for this winding
      if (nx + ny <= 0.001) continue;
      const k = (0.64 * Math.max(0, nx) + 0.82 * Math.max(0, ny)) / ((Math.max(0, nx) + Math.max(0, ny)) || 1);
      poly4(px(p[0], p[1]), py(p[0], p[1], WATER_Z), px(q[0], q[1]), py(q[0], q[1], WATER_Z),
        px(q[0], q[1]), py(q[0], q[1], deckZ), px(p[0], p[1]), py(p[0], p[1], deckZ), shade(b.color, k, L));
    }
    // Deck with a pale gunwale
    rctx.beginPath(); hull.forEach(([hx, hy], i) => (i ? rctx.lineTo(px(hx, hy), py(hx, hy, deckZ)) : rctx.moveTo(px(hx, hy), py(hx, hy, deckZ)))); rctx.closePath();
    rctx.fillStyle = shade('#b89a6e', 1, L); rctx.fill();
    rctx.strokeStyle = shade('#efe7d6', 1, L); rctx.lineWidth = Math.max(0.5, 0.55 * rcam.z); rctx.stroke();
    // Low cabin set toward the stern, with a window band
    obox(x, y, ux, uy, -hl * 0.72, hl * 0.12, -hw * 0.68, hw * 0.68, deckZ, deckZ + 2.5, '#ece6d8', b.color, L);
    if (rcam.z >= 0.7) obox(x, y, ux, uy, -hl * 0.68, hl * 0.1, -hw * 0.69, hw * 0.69, deckZ + 1.0, deckZ + 1.8, shade('#3b4c58', 1, L), null, L);
  }

  // ---------- railway & ferry (NYC map) ----------
  // Lines come from nyc.js in the original map frame. Each is smoothed (Chaikin) and resampled every 0.1 tile
  // so trains follow curves and grades. Trains run on simClock time (simDt), never on frame time: speed,
  // braking, dwell and reversal are identical at any frame rate or quality setting.
  const TRAIN = { VMAX: 1.5, ACC: 0.55, DWELL: 5, CARS: 3, CAR: 0.62, GAP: 0.07, SIDE: 0.11 };
  TRAIN.LEN = TRAIN.CARS * TRAIN.CAR + (TRAIN.CARS - 1) * TRAIN.GAP;
  const rail = { lines: [], trains: [], ferry: null };
  // Continuous point / direction from the original frame into the current rotated view
  const rotC = (x, y) => { for (let i = 0; i < (rotSteps & 3); i++) { const t = x; x = N - y; y = t; } return [x, y]; };
  const rotV = (dx, dy) => { for (let i = 0; i < (rotSteps & 3); i++) { const t = dx; dx = -dy; dy = t; } return [dx, dy]; };
  function railInit() {
    if (!isNYC) return;
    rail.lines = NYC.LINES.map((L) => {
      let pts = L.pts.map((p) => p.slice());
      for (let it = 0; it < 3; it++) {
        const o = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push(a.map((v, k) => v * 0.75 + b[k] * 0.25), a.map((v, k) => v * 0.25 + b[k] * 0.75)); }
        o.push(pts[pts.length - 1]); pts = o;
      }
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const len = cum[cum.length - 1];
      const raw = (s) => {
        s = Math.max(0, Math.min(len, s));
        let lo = 0, hi = cum.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
        const f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1), a = pts[lo], b = pts[hi];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
      };
      const samples = [];
      for (let s = 0; s <= len + 1e-6; s += 0.1) samples.push({ s, p: raw(s) });
      const near = (q) => { let best = 0, bd = 1e9; for (const sm of samples) { const d = Math.hypot(sm.p[0] - q[0], sm.p[1] - q[1]); if (d < bd) { bd = d; best = sm.s; } } return best; };
      const stops = L.stations.map((st) => ({ ...st, s: near(st.at) })).sort((a, b) => a.s - b.s);
      return { ...L, len, raw, samples, stops };
    });
    rail.trains = [];
    rail.lines.forEach((ln, li) => {
      for (let k = 0; k < ln.trains; k++) {
        const atStart = k % 2 === 0, st = atStart ? ln.stops[0] : ln.stops[ln.stops.length - 1];
        rail.trains.push({ li, s: st.s, dir: atStart ? 1 : -1, v: 0, state: 'dwell', wait: 1.5 + k * 2.5, at: st });
      }
    });
    rail.ferry = { s: 0, dir: 1, state: 'dwell', wait: 2, v: 0 };
  }
  function stepTrains(dt) {
    if (!isNYC || !rail.lines.length) return;
    const T = TRAIN;
    for (const tr of rail.trains) {
      const ln = rail.lines[tr.li];
      if (tr.state === 'dwell') {
        tr.wait -= dt;
        if (tr.wait > 0) continue;
        if (tr.at === ln.stops[0] || tr.at === ln.stops[ln.stops.length - 1]) tr.dir = tr.at === ln.stops[0] ? 1 : -1; // terminal reversal
        tr.state = 'run';
      }
      const next = tr.dir > 0 ? ln.stops.find((st) => st.s > tr.s + 0.02) : [...ln.stops].reverse().find((st) => st.s < tr.s - 0.02);
      if (!next) { tr.dir = -tr.dir; continue; }
      let dist = Math.abs(next.s - tr.s);
      // Keep a safe gap behind any train ahead on the same track (same line, same direction)
      for (const o of rail.trains) {
        if (o === tr || o.li !== tr.li || o.dir !== tr.dir) continue;
        const gap = (o.s - tr.s) * tr.dir;
        if (gap > 0) dist = Math.min(dist, gap - (T.LEN + 0.7));
      }
      const target = Math.max(0, Math.min(T.VMAX, Math.sqrt(2 * T.ACC * Math.max(0, dist))));
      tr.v = tr.v < target ? Math.min(target, tr.v + T.ACC * dt) : target;
      tr.s += tr.v * dt * tr.dir;
      if ((next.s - tr.s) * tr.dir <= 0.02) { tr.s = next.s; tr.v = 0; tr.state = 'dwell'; tr.wait = T.DWELL; tr.at = next; }
    }
    // Ferry: across the harbour and back, with a dwell at each terminal
    const f = rail.ferry;
    if (f) {
      const [ax, ay] = NYC.FERRY.from, [bx, by] = NYC.FERRY.to, flen = Math.hypot(bx - ax, by - ay);
      if (f.state === 'dwell') { f.wait -= dt; if (f.wait <= 0) { f.state = 'run'; } }
      else {
        const remain = f.dir > 0 ? flen - f.s : f.s;
        const target = Math.min(0.55, Math.sqrt(2 * 0.25 * Math.max(0, remain)));
        f.v = f.v < target ? Math.min(target, f.v + 0.25 * dt) : target;
        f.s += f.v * dt * f.dir;
        if (remain <= 0.02) { f.s = f.dir > 0 ? flen : 0; f.v = 0; f.dir = -f.dir; f.state = 'dwell'; f.wait = 6; }
      }
    }
  }
  // Ferry as a boat entity for the existing boat renderer (scaled up, in the current view frame)
  function ferryBoat() {
    const f = rail.ferry; if (!f) return null;
    const [ax, ay] = NYC.FERRY.from, [bx, by] = NYC.FERRY.to, flen = Math.hypot(bx - ax, by - ay);
    const k = Math.max(0, Math.min(1, f.s / flen));
    const [cx, cy] = rotC(ax + (bx - ax) * k, ay + (by - ay) * k);
    const [hx, hy] = rotV((bx - ax) * f.dir, (by - ay) * f.dir);
    const fb = ferryBoat.obj || (ferryBoat.obj = { color: '#e8762b', scale: 2.1, t: 1 });
    fb.px = cx - 0.5; fb.py = cy - 0.5; fb.fx = fb.px; fb.fy = fb.py; fb.tx = fb.px + Math.sign(hx) * (Math.abs(hx) > Math.abs(hy) ? 1 : 0); fb.ty = fb.py + Math.sign(hy) * (Math.abs(hy) >= Math.abs(hx) ? 1 : 0);
    fb._hx = hx / flen; fb._hy = hy / flen; fb._dx = undefined;
    return fb;
  }

  // Car geometry along the line at arc length s (original frame -> view frame)
  function railPose(ln, s, side) {
    const p = ln.raw(s), q = ln.raw(s + 0.05), r0 = ln.raw(s - 0.05);
    let tx = q[0] - r0[0], ty = q[1] - r0[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const ox = p[0] - ty * side, oy = p[1] + tx * side;
    const [vx, vy] = rotC(ox, oy), [ux, uy] = rotV(tx, ty);
    return { x: vx, y: vy, z: p[2], ux, uy };
  }
  // Visible train cars this frame (for depth sorting with everything else)
  function trainCars() {
    const out = [];
    for (const tr of rail.trains) {
      const ln = rail.lines[tr.li], T = TRAIN;
      for (let i = 0; i < T.CARS; i++) {
        const sc = tr.s - tr.dir * (T.CAR / 2 + i * (T.CAR + T.GAP));
        const pose = railPose(ln, sc, T.SIDE * tr.dir);
        if (pose.z < -3) continue;                 // underground: not drawn
        out.push({ tr, ln, i, pose });
      }
    }
    return out;
  }
  function drawTrainCar(c, L, lightsOnly = false) {
    const { pose, tr, ln, i } = c, T = TRAIN;
    const dir = tr.dir, ux = pose.ux * dir, uy = pose.uy * dir;
    const hl = T.CAR / 2, hw = 0.13, z = pose.z + 0.5;
    const front = i === 0, rear = i === T.CARS - 1, open = tr.state === 'dwell' && tr.wait < T.DWELL - 0.6 && tr.wait > 0.6;
    if (lightsOnly) {
      if (L >= 0.6) return;
      rctx.globalAlpha = Math.min(1, (0.6 - L) * 3);
      obox(pose.x, pose.y, ux, uy, -hl + 0.02, hl - 0.02, -hw - 0.003, hw + 0.003, z + 5.2, z + 7.6, '#ffd98a', null, 1);
      if (front) { const hr = 8 * rcam.z, fx = pose.x + ux * (hl + 0.05), fy = pose.y + uy * (hl + 0.05); rctx.drawImage(headGlow, px(fx, fy) - hr, py(fx, fy, z + 3) - hr, hr * 2, hr * 2); }
      rctx.globalAlpha = 1;
      return;
    }
    footShadow(pose.x, pose.y, ux, uy, hl, hw, z - 0.3, 0.2);
    const steel = '#c3c8cd', endDark = '#2c3238';
    obox(pose.x, pose.y, ux, uy, -hl, hl, -hw, hw, z + 0.8, z + 10.5, (fi, k) => {
      if ((fi === 1 && front) || (fi === 3 && rear)) return shade(endDark, 1, 1);
      return shade(steel, k + 0.06, 1);
    }, '#9ea4aa', 1);
    // Window band, paired doors (lit doorways while stopped at a platform), roof line
    obox(pose.x, pose.y, ux, uy, -hl + 0.03, hl - 0.03, -hw - 0.002, hw + 0.002, z + 5.2, z + 7.6, shade('#3a4650', 1, 1), null, 1);
    for (const a of [-hl * 0.5, hl * 0.5]) obox(pose.x, pose.y, ux, uy, a - 0.045, a + 0.045, -hw - 0.004, hw + 0.004, z + 1.2, z + 8.6, open ? '#ffe2a8' : shade('#8c939a', 1, 1), null, 1);
    if (front) {
      const fx = pose.x + ux * hl, fy = pose.y + uy * hl;
      obox(fx, fy, ux, uy, -0.004, 0.006, -0.05, 0.05, z + 8.4, z + 9.6, '#ffb648', null, 1);           // destination display
      for (const b of [-0.08, 0.08]) obox(fx - uy * b, fy + ux * b, ux, uy, -0.004, 0.006, -0.018, 0.018, z + 2.2, z + 3.2, L < 0.6 ? '#fff6d0' : '#e9e4cf', null, 1);
      // Route bullet on the front, in the line colour
      const [bx, by] = [px(fx, fy), py(fx, fy, z + 6.4)];
      rctx.fillStyle = ln.color; rctx.beginPath(); rctx.arc(bx, by, 1.4 * rcam.z, 0, 7); rctx.fill();
    }
  }

  // Static railway structures, baked with the city: grouped by the tile each piece belongs to so they are
  // drawn in the same back-to-front order as buildings (correct overlaps without per-frame work).
  let railBake = null;
  function railBakePrep() {
    railBake = new Map();
    if (!isNYC) return;
    const add = (x, y, f) => { const k = Math.floor(x) * N + Math.floor(y); if (!railBake.has(k)) railBake.set(k, []); railBake.get(k).push(f); };
    for (const ln of rail.lines) {
      const sm = ln.samples;
      for (let i = 0; i < sm.length - 1; i++) {
        const a = sm[i].p, b = sm[i + 1].p, z = (a[2] + b[2]) / 2;
        if (z < -10) continue;
        let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const P = (p, off, dz = 0) => { const [vx, vy] = rotC(p[0] - ty * off, p[1] + tx * off); return [vx, vy, p[2] + dz]; };
        const mid = rotC((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        const groundUnder = grid[Math.floor(mid[0])]?.[Math.floor(mid[1])];
        const overWater = groundUnder === 'water' || groundUnder === 'bridge';
        add(mid[0], mid[1], () => {
          const quad = (q, fill) => { rctx.beginPath(); q.forEach(([x, y, zz], j) => (j ? rctx.lineTo(px(x, y), py(x, y, zz)) : rctx.moveTo(px(x, y), py(x, y, zz)))); rctx.closePath(); rctx.fillStyle = fill; rctx.fill(); };
          if (z < 0) { // open cut down to the tunnel: dark trench with concrete lips
            quad([P(a, -0.3, -a[2] + 0.1), P(b, -0.3, -b[2] + 0.1), P(b, 0.3, -b[2] + 0.1), P(a, 0.3, -a[2] + 0.1)], 'rgba(20,22,26,0.85)');
            quad([P(a, -0.34, -a[2] + 0.6), P(b, -0.34, -b[2] + 0.6), P(b, -0.3, -b[2] + 0.6), P(a, -0.3, -a[2] + 0.6)], '#b9b2a4');
            quad([P(a, 0.3, -a[2] + 0.6), P(b, 0.3, -b[2] + 0.6), P(b, 0.34, -b[2] + 0.6), P(a, 0.34, -a[2] + 0.6)], '#b9b2a4');
            return;
          }
          const elev = z > 2;
          if (elev) { // deck fascia then deck
            quad([P(a, 0.3, -1.8), P(b, 0.3, -1.8), P(b, 0.3, 0), P(a, 0.3, 0)], shade('#56636a', 0.9, 1));
            quad([P(a, -0.3, -1.8), P(b, -0.3, -1.8), P(b, -0.3, 0), P(a, -0.3, 0)], shade('#56636a', 0.75, 1));
          }
          quad([P(a, -0.3, 0), P(b, -0.3, 0), P(b, 0.3, 0), P(a, 0.3, 0)], elev ? '#6f777b' : '#8a7d6c');
          if (i % 2 === 0) for (const side of [-1, 1]) quad([P(a, side * 0.11 - 0.06, 0.2), P(b, side * 0.11 - 0.06, 0.2), P(b, side * 0.11 + 0.06, 0.2), P(a, side * 0.11 + 0.06, 0.2)], '#5a4a3a'); // sleepers
          rctx.strokeStyle = '#a7adb2'; rctx.lineWidth = Math.max(0.5, 0.35 * rcam.z);
          rctx.beginPath();
          for (const off of [-0.145, -0.075, 0.075, 0.145]) { const p0 = P(a, off, 0.5), p1 = P(b, off, 0.5); rctx.moveTo(px(p0[0], p0[1]), py(p0[0], p0[1], p0[2])); rctx.lineTo(px(p1[0], p1[1]), py(p1[0], p1[1], p1[2])); }
          rctx.stroke();
          // Steel columns with a cross-beam every tile under elevated track over land (clear of the carriageway)
          if (elev && !overWater && i % 10 === 0) {
            for (const side of [-0.27, 0.27]) { const c = P(a, side); box(c[0] - 0.025, c[1] - 0.025, c[0] + 0.025, c[1] + 0.025, 0, z - 1.8, '#4b5a5e', 1); }
            const c0 = P(a, -0.29, -1.8), c1 = P(a, 0.29, -1.8);
            rctx.strokeStyle = '#4b5a5e'; rctx.lineWidth = Math.max(0.8, 0.7 * rcam.z);
            rctx.beginPath(); rctx.moveTo(px(c0[0], c0[1]), py(c0[0], c0[1], c0[2] - 1)); rctx.lineTo(px(c1[0], c1[1]), py(c1[0], c1[1], c1[2] - 1)); rctx.stroke();
          }
        });
      }
      // Stations: elevated/surface platforms with edges, canopies and stairs; underground stations get entrances
      for (const st of ln.stops) {
        const p = ln.raw(st.s);
        if (p[2] < -2) {
          const [ex0, ey0] = st.entrance || st.at;
          const [ex, ey] = rotC(ex0, ey0);
          add(ex, ey, () => {
            box(ex - 0.06, ey - 0.1, ex + 0.06, ey + 0.1, 0, 0.3, '#3b3f44', 1, { roof: '#1e2226' }); // stairwell opening
            rctx.strokeStyle = '#2f7a4e'; rctx.lineWidth = Math.max(0.7, 0.55 * rcam.z);
            rctx.beginPath();
            for (const [qx, qy] of [[ex - 0.07, ey - 0.11], [ex + 0.07, ey - 0.11], [ex + 0.07, ey + 0.11], [ex - 0.07, ey + 0.11], [ex - 0.07, ey - 0.11]]) rctx.lineTo(px(qx, qy), py(qx, qy, 2.6));
            rctx.stroke();
            for (const [qx, qy] of [[ex - 0.07, ey + 0.11], [ex + 0.07, ey + 0.11]]) {
              rctx.beginPath(); rctx.moveTo(px(qx, qy), py(qx, qy, 0)); rctx.lineTo(px(qx, qy), py(qx, qy, 5)); rctx.stroke();
              rctx.fillStyle = '#e8f4d8'; rctx.beginPath(); rctx.arc(px(qx, qy), py(qx, qy, 5.6), 0.9 * rcam.z, 0, 7); rctx.fill();
            }
            rctx.fillStyle = ln.color; rctx.beginPath(); rctx.arc(px(ex, ey - 0.12), py(ex, ey - 0.12, 3.4), 1.1 * rcam.z, 0, 7); rctx.fill();
          });
          continue;
        }
        const half = TRAIN.LEN / 2 + 0.15;
        for (let s = st.s - half; s < st.s + half; s += 0.1) {
          const a = ln.raw(s), b = ln.raw(s + 0.1);
          let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          const P = (q, off, dz = 0) => { const [vx, vy] = rotC(q[0] - ty * off, q[1] + tx * off); return [vx, vy, q[2] + dz]; };
          const mid = rotC((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), first = s < st.s - half + 0.05;
          add(mid[0] + 0.01, mid[1] + 0.01, () => {
            const quad = (q, fill) => { rctx.beginPath(); q.forEach(([x, y, zz], j) => (j ? rctx.lineTo(px(x, y), py(x, y, zz)) : rctx.moveTo(px(x, y), py(x, y, zz)))); rctx.closePath(); rctx.fillStyle = fill; rctx.fill(); };
            for (const side of [-1, 1]) {
              quad([P(a, side * 0.26, 2.2), P(b, side * 0.26, 2.2), P(b, side * 0.44, 2.2), P(a, side * 0.44, 2.2)], '#b7b2a8');       // platform
              quad([P(a, side * 0.26, 2.25), P(b, side * 0.26, 2.25), P(b, side * 0.29, 2.25), P(a, side * 0.29, 2.25)], '#e2b93b'); // edge strip
              quad([P(a, side * 0.44, 0), P(b, side * 0.44, 0), P(b, side * 0.44, 2.2), P(a, side * 0.44, 2.2)], shade('#8f8a80', 0.8, 1));
              quad([P(a, side * 0.25, 14.5), P(b, side * 0.25, 14.5), P(b, side * 0.47, 15.5), P(a, side * 0.47, 15.5)], '#3f6f6a'); // canopy
              if (first || Math.round((s - st.s) * 10) % 6 === 0) { const c = P(a, side * 0.43); box(c[0] - 0.012, c[1] - 0.012, c[0] + 0.012, c[1] + 0.012, a[2] + 2.2, a[2] + 14.6, '#3f6f6a', 1); }
            }
            if (first && a[2] > 2) { // stairs down to the street at one end
              const s0 = P(a, 0.46, 2.2), s1 = P(a, 0.62, 0);
              const [sx0, sy0] = [Math.min(s0[0], s1[0]) - 0.02, Math.min(s0[1], s1[1]) - 0.02];
              rctx.strokeStyle = '#3f6f6a'; rctx.lineWidth = Math.max(0.8, 0.8 * rcam.z);
              rctx.beginPath(); rctx.moveTo(px(s0[0], s0[1]), py(s0[0], s0[1], s0[2])); rctx.lineTo(px(s1[0], s1[1]), py(s1[0], s1[1], 0)); rctx.stroke();
              box(sx0, sy0, sx0 + 0.06, sy0 + 0.06, 0, 1, '#6b6f73', 1);
            }
          });
        }
      }
    }
    // Manhattan Bridge-style rail crossing: steel towers with an arched portal and suspension cables
    const bridgeLn = rail.lines.find((l) => l.id === 'B');
    if (bridgeLn) {
      const towerAt = [20.85, 22.95].map((x) => [x, 43.5]);
      for (const [tx0, ty0] of towerAt) {
        const [vx, vy] = rotC(tx0, ty0);
        add(vx + 0.02, vy + 0.02, () => {
          for (const side of [-0.36, 0.36]) { const [cx, cy] = rotC(tx0, ty0 + side); box(cx - 0.05, cy - 0.05, cx + 0.05, cy + 0.05, -7, 46, '#5e7d86', 1, { roof: '#7d9aa2' }); }
          const [ax0, ay0] = rotC(tx0, ty0 - 0.36), [ax1, ay1] = rotC(tx0, ty0 + 0.36);
          rctx.strokeStyle = '#5e7d86'; rctx.lineWidth = Math.max(1, 1.4 * rcam.z);
          rctx.beginPath(); rctx.moveTo(px(ax0, ay0), py(ax0, ay0, 40)); rctx.quadraticCurveTo(px((ax0 + ax1) / 2, (ay0 + ay1) / 2), py((ax0 + ax1) / 2, (ay0 + ay1) / 2, 50), px(ax1, ay1), py(ax1, ay1, 40)); rctx.stroke();
          rctx.beginPath(); rctx.moveTo(px(ax0, ay0), py(ax0, ay0, 24)); rctx.lineTo(px(ax1, ay1), py(ax1, ay1, 24)); rctx.stroke();
        });
      }
      // Main cables: tower tops sagging to just above the deck mid-span, then down to the anchorages
      const [m0x, m0y] = rotC(18.9, 43.5);
      add(m0x, m0y, () => {
        rctx.strokeStyle = 'rgba(70,92,100,0.9)'; rctx.lineWidth = Math.max(0.7, 0.6 * rcam.z);
        for (const side of [-0.34, 0.34]) {
          const P = (x, z) => { const [vx, vy] = rotC(x, 43.5 + side); return [px(vx, vy), py(vx, vy, z)]; };
          const pa = P(19.2, 18), t0 = P(20.85, 46), mid = P(21.9, 24), t1 = P(22.95, 46), pb = P(24.6, 16);
          rctx.beginPath(); rctx.moveTo(...pa); rctx.lineTo(...t0); rctx.quadraticCurveTo(mid[0], mid[1] + (mid[1] - (t0[1] + t1[1]) / 2) * 0.2, ...t1); rctx.lineTo(...pb); rctx.stroke();
        }
      });
    }
  }
  function drawRailForTile(x, y) {
    const list = railBake && railBake.get(x * N + y);
    if (list) for (const f of list) f();
  }
  // Night layer: warm pools on platforms, green-white globes at subway entrances
  function drawRailNight() {
    if (!isNYC) return;
    for (const ln of rail.lines) for (const st of ln.stops) {
      const p = ln.raw(st.s), under = p[2] < -2;
      const [qx, qy] = rotC(...(under ? (st.entrance || st.at) : st.at));
      const ax = px(qx, qy), ay = py(qx, qy, under ? 2 : p[2] + 4), r = (under ? 12 : 26) * rcam.z, g = rctx.createRadialGradient(ax, ay, 0, ax, ay, r);
      g.addColorStop(0, under ? 'rgba(210,255,220,0.5)' : 'rgba(255,220,150,0.5)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      rctx.fillStyle = g; rctx.beginPath(); rctx.ellipse(ax, ay, r, r * 0.6, 0, 0, 7); rctx.fill();
    }
  }

  // ---------- world cache + sharp zoom pass ----------
  const PAD_X = isNYC ? 230 : 64, OY = isNYC ? 300 : 220;
  const OX = N * (TW / 2) + PAD_X;
  const WW = N * TW + PAD_X * 2;
  const WH = OY + N * TH + 48;
  let WS = isNYC ? 1.25 : 1.5; // supersampling of the cached world image (kept modest so each frame is cheap to draw)

  const worldCanvas = document.createElement('canvas');
  worldCanvas.width = Math.round(WW * WS);
  worldCanvas.height = Math.round(WH * WS);
  const wctx = worldCanvas.getContext('2d');

  // NYC: windows lit at night, baked once per map build in back-to-front order (each later tile erases what it hides)
  const litCanvas = document.createElement('canvas');
  if (isNYC) { litCanvas.width = WW; litCanvas.height = WH; }
  const litCtx = litCanvas.getContext('2d');
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = WW;
  nightCanvas.height = WH;
  const nctx = nightCanvas.getContext('2d');

  function drawSlab(L) {
    // A thick miniature base: stone lip, earth body and a dark plinth band
    const dep = 40, lip = 4, plinth = 8;
    const bx = px(N, 0), by = py(N, 0);
    const cx = px(N, N), cy = py(N, N);
    const dx = px(0, N), dy = py(0, N);
    poly4(dx, dy, cx, cy, cx, cy + dep, dx, dy + dep, shade('#5e5244', 0.9, L));
    poly4(cx, cy, bx, by, bx, by + dep, cx, cy + dep, shade('#4b4136', 0.9, L));
    poly4(dx, dy, cx, cy, cx, cy + lip, dx, dy + lip, shade('#bdb6a6', 1, L));
    poly4(cx, cy, bx, by, bx, by + lip, cx, cy + lip, shade('#9d968a', 1, L));
    poly4(dx, dy + dep - plinth, cx, cy + dep - plinth, cx, cy + dep, dx, dy + dep, shade('#2d2a28', 1, L));
    poly4(cx, cy + dep - plinth, bx, by + dep - plinth, bx, by + dep, cx, cy + dep, shade('#242220', 1, L));
  }

  // One connected ridge behind the two far map edges: a grass buffer at map level, foothills rising gently,
  // then two or three broad peaks of different heights. Height comes from a few smooth bumps along the back
  // boundary, so the silhouette is continuous. Colours cool and soften with height (distance haze), slopes are
  // shaded from one sun direction, and it is baked once into the cached map image, behind every tile.
  function drawRidge() {
    const th = curTheme();
    const S = 2 * N;                                   // 0..N along the left far edge, N..2N along the right
    const peaks = [[0.62 * N, 88, 0.2 * N], [1.18 * N, 62, 0.16 * N], [1.62 * N, 46, 0.15 * N]];
    const fade = (t) => Math.max(0, Math.min(1, t / (0.2 * S), (S - t) / (0.2 * S))); // taper toward the front corners
    const height = (t) => {
      let h = 0;
      for (const [c, a, w] of peaks) h += a * Math.exp(-((t - c) * (t - c)) / (2 * w * w));
      h += 6 * Math.sin(t * 0.9) + 3.5 * Math.sin(t * 2.3 + 1);
      return Math.max(0, h * fade(t));
    };
    const BUF = 1.3;                                   // grass buffer between the map and the foothills (tiles)
    // Ground point `out` tiles beyond the map edge at path position t; the outward direction turns smoothly
    // through the back corner so the two edges join into one ridge.
    const at = (t, out) => {
      const bx = t <= N ? 0 : t - N, by = t <= N ? N - t : 0;
      const w = 2.2, k = Math.max(0, Math.min(1, (t - (N - w)) / (2 * w))), s2 = k * k * (3 - 2 * k);
      let dx = -1 + s2, dy = -s2; const l = Math.hypot(dx, dy) || 1;
      return [bx + (dx / l) * out, by + (dy / l) * out];
    };
    const V = (t, out, z) => { const [x, y] = at(t, out); return { sx: px(x, y), sy: py(x, y, z), x, y, z }; };
    const shadeTri = (A, B, C, base) => {
      const ux = B.x - A.x, uy = B.y - A.y, uz = (B.z - A.z) / 32, vx = C.x - A.x, vy = C.y - A.y, vz = (C.z - A.z) / 32;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz) || 1;
      return shade(base, 0.64 + 0.4 * Math.max(0, (-0.25 * nx + 0.55 * ny + 0.8 * nz) / l), 1); // sun from above, toward +y
    };
    // Rows from the map edge outward: grass buffer, foothills, mid slopes, crest. Colour cools with height.
    const ROWS = [[0, 0], [BUF, 0], [BUF + 1.1, 0.22], [BUF + 2.2, 0.56], [BUF + 3.2, 1]];
    const COL = [shade(th.grassB, 0.92, 1), mix(th.grassB, '#6f7f62', 0.55), '#7f8d86', '#9aa6b2'];
    const quads = [];
    const STEP = 0.4;
    for (let t = 0; t < S - 1e-6; t += STEP) {
      const t2 = Math.min(S, t + STEP), h1 = height(t), h2 = height(t2), e1 = fade(t), e2 = fade(t2);
      for (let r = 1; r < ROWS.length; r++) {
        const [o0, f0] = ROWS[r - 1], [o1, f1] = ROWS[r];
        // Beyond the buffer, rows pull in toward the corners so the ends stay inside the backdrop
        const oo0 = r - 1 <= 1 ? o0 : BUF + (o0 - BUF) * Math.max(e1, 0.15), oo0b = r - 1 <= 1 ? o0 : BUF + (o0 - BUF) * Math.max(e2, 0.15);
        const oo1 = r <= 1 ? o1 : BUF + (o1 - BUF) * Math.max(e1, 0.15), oo1b = r <= 1 ? o1 : BUF + (o1 - BUF) * Math.max(e2, 0.15);
        const A = V(t, oo0, h1 * f0), B = V(t2, oo0b, h2 * f0), C = V(t2, oo1b, h2 * f1), Dv = V(t, oo1, h1 * f1);
        quads.push({ d: (Dv.x + Dv.y + C.x + C.y) / 2, A, B, C, Dv, flat: r === 1, base: COL[r - 1] });
      }
    }
    quads.sort((p, q) => p.d - q.d); // far first
    for (const q of quads) {
      const fill1 = q.flat ? q.base : shadeTri(q.A, q.B, q.C, q.base), fill2 = q.flat ? q.base : shadeTri(q.A, q.C, q.Dv, q.base);
      rctx.beginPath(); rctx.moveTo(q.A.sx, q.A.sy); rctx.lineTo(q.B.sx, q.B.sy); rctx.lineTo(q.C.sx, q.C.sy); rctx.closePath(); rctx.fillStyle = fill1; rctx.fill();
      rctx.beginPath(); rctx.moveTo(q.A.sx, q.A.sy); rctx.lineTo(q.C.sx, q.C.sy); rctx.lineTo(q.Dv.sx, q.Dv.sy); rctx.closePath(); rctx.fillStyle = fill2; rctx.fill();
    }
  }

  // New York backdrop: open harbour water beyond the two far edges, then low mainland shores with distant
  // blocks. Screen-relative, so it stays behind the map in every rotation. Baked once with the static city.
  function drawShores() {
    const th = curTheme();
    const at = (edge, t, out) => (edge === 0 ? [-out, N - t] : [t, -out]);
    const quad = (pts, fill) => { rctx.beginPath(); pts.forEach(([x, y, z], i) => (i ? rctx.lineTo(px(x, y), py(x, y, z || 0)) : rctx.moveTo(px(x, y), py(x, y, z || 0)))); rctx.closePath(); rctx.fillStyle = fill; rctx.fill(); };
    const water = shade(th.waterB, 0.92, 1), shore = '#7b8784', far = '#8d99a3';
    for (const edge of [0, 1]) {
      const a0 = at(edge, -6, 0), a1 = at(edge, N + 0.5, 0), b0 = at(edge, -6, 2.4), b1 = at(edge, N + 0.5, 2.4), c0 = at(edge, -6, 7), c1 = at(edge, N + 0.5, 7);
      quad([a0, a1, b1, b0], water);
      quad([b0, b1, c1, c0], shore);
    }
    quad([[0, 0], [-2.4, 0], [-2.4, -2.4], [0, -2.4]], water); quad([[-2.4, -2.4], [-7, -2.4], [-7, -7], [-2.4, -7]], shore);
    // Distant blocks: low, hazy boxes; a denser, taller cluster across the river from Lower Manhattan
    const boxes = [];
    for (const edge of [0, 1]) for (let t = -4; t < N; t += 0.7) {
      const hsh = NYC.hash(Math.round(t * 10), edge, 21), hsh2 = NYC.hash(Math.round(t * 10), edge, 22);
      const dense = edge === 0 && t > N * 0.55 && t < N * 0.8;
      const out = 2.9 + hsh * 3.4, w = 0.32 + hsh2 * 0.3, hgt = (dense ? 10 + hsh2 * 30 : 3 + hsh * 9);
      const [cx, cy] = at(edge, t, out);
      boxes.push({ cx, cy, w, hgt, d: cx + cy });
    }
    boxes.sort((p, q) => p.d - q.d);
    for (const b of boxes) box(b.cx - b.w / 2, b.cy - b.w / 2, b.cx + b.w / 2, b.cy + b.w / 2, 0, b.hgt, far, 1, { roof: '#a3adb5' });
  }

  // ---------- time-sliced map bake ----------
  // Rebuilding the cached map (rotation, cutaway, edits, theme) used to run in one go and froze the frame for
  // ~170 ms on the New York map. It now runs as a resumable job of whole diagonals, ~9 ms per frame. While a
  // visible rebuild is in progress the last rendered frame stays on screen, then the new view cross-fades in.
  // The NYC lit-window layer is only needed toward dusk: daytime rebuilds skip it and it is rebuilt in the
  // background before windows start to show (or behind the freeze frame if the clock jumps straight to night).
  let bake = null, litStale = true, fadeFrom = -1e9, drawnOnce = false;
  const freezeCanvas = document.createElement('canvas');
  const freezeCtx = freezeCanvas.getContext('2d');
  const LIT_NEEDED = 0.82;   // build the lit layer once daylight falls below this
  const LIT_VISIBLE = 0.75;  // lit windows start to show below this (see the dusk blend in draw)

  function bakeBegin(world, lit, freeze) {
    if (freeze && drawnOnce) {
      if (freezeCanvas.width !== canvas.width || freezeCanvas.height !== canvas.height) { freezeCanvas.width = canvas.width; freezeCanvas.height = canvas.height; }
      freezeCtx.setTransform(1, 0, 0, 1, 0, 0); freezeCtx.drawImage(canvas, 0, 0);
    }
    const savedR = rctx, savedC = rcam;
    rcam = { x: OX, y: OY, z: 1 };
    if (world) {
      worldDirty = false; // anything that dirties the map again mid-job restarts it
      rctx = wctx; wctx.setTransform(WS, 0, 0, WS, 0, 0); wctx.clearRect(0, 0, WW, WH);
      if (isNYC) drawShores(); else drawRidge();
      drawSlab(1);
      nctx.setTransform(1, 0, 0, 1, 0, 0); nctx.clearRect(0, 0, WW, WH);
      if (isNYC) railBakePrep();
    }
    if (lit) { litCtx.setTransform(1, 0, 0, 1, 0, 0); litCtx.clearRect(0, 0, WW, WH); }
    else if (world && isNYC) litStale = true;
    rctx = savedR; rcam = savedC;
    bake = { s: 0, world, lit, freeze: freeze && drawnOnce, L: daylight(hour) };
  }
  // Runs whole diagonals until the time budget is used; returns true when the job is finished.
  function bakeStep(budgetMs) {
    const savedW = warm, savedR = rctx, savedC = rcam;
    warm = 0; rcam = { x: OX, y: OY, z: 1 };
    const t0 = performance.now(), last = 2 * N - 2;
    while (bake.s <= last) {
      const sd = bake.s;
      for (let x = Math.max(0, sd - N + 1); x <= Math.min(N - 1, sd); x++) {
        const y = sd - x, tt = grid[x][y];
        if (bake.world) {
          rctx = wctx;
          if (x === cutX && y === cutY) drawGround(x, y, tt, 1); // building lifted off for the interior view
          else drawTile(x, y, tt, 1, false);
          if (isNYC) drawRailForTile(x, y);
          rctx = nctx;
          drawTileNight(x, y, tt, bake.L);
        }
        if (bake.lit && tt && tt !== 'water' && !isRoad(tt)) {
          rctx = litCtx;
          litCtx.globalCompositeOperation = 'destination-out'; drawTile(x, y, tt, 1, true);
          litCtx.globalCompositeOperation = 'source-over';
          if (isBuilding(tt) && !(x === cutX && y === cutY)) drawBuildingNightWindows(x, y, tt, 1, true);
        }
      }
      bake.s++;
      if (performance.now() - t0 > budgetMs) break;
    }
    let done = false;
    if (bake.s > last) {
      if (bake.world) { if (isNYC) { rctx = nctx; drawRailNight(); } winDirty = true; }
      if (bake.lit) litStale = false;
      done = true;
    }
    warm = savedW; rctx = savedR; rcam = savedC;
    return done;
  }
  // Synchronous rebuild (startup, exports, and code that needs the map immediately)
  function buildWorld() {
    bakeBegin(true, isNYC && daylight(hour) < LIT_NEEDED, false);
    while (!bakeStep(1e9)) { /* finish in one go */ }
    bake = null;
  }
  // Called at the top of draw(): starts, continues or restarts the job. Returns true if this frame should
  // show the frozen previous frame instead of the half-built map.
  function bakeTick(now, synchronous) {
    const L = daylight(hour);
    if (worldDirty && (!bake || bake.world)) {
      bakeBegin(true, isNYC && L < LIT_NEEDED, true);          // new or restarted map rebuild (visible)
    } else if (!bake && isNYC && litStale && L < LIT_NEEDED) {
      bakeBegin(false, true, L < LIT_VISIBLE);                   // lit layer: in the background unless already dusk
    }
    if (!bake) return false;
    const freeze = bake.freeze;
    if (bakeStep(synchronous || !drawnOnce ? 1e9 : 9)) {
      bake = null;
      if (freeze) fadeFrom = now;
      return false;
    }
    return freeze;
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

  let cutX = -1, cutY = -1, bakedCut = -1; // building currently shown as an interior (lifted out of the baked world)
  const seen = new Uint8Array(N * N);
  const ov = [];
  const boatsVis = [], bridgesOver = [], railOver = new Set();

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
        if (tx === cutX && ty === cutY) continue;
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
    const pomoSec = pomo.running ? Math.floor(now / 1000) : 0;
    const key = [cam.x.toFixed(1), cam.y.toFixed(1), cam.z.toFixed(3), W, H, dpr, selectedTile ? selectedTile.join(',') : '', hover ? hover.join(',') : '', hoveredLabel || '', activeFilter, showLabels, darkMode, cbMode, pomoSec, rotSteps].join('|');
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
    }
  }


  function draw(now, dt, transparentBg = false) {
    const L = daylight(hour);
    warm = Math.max(0, 1 - Math.abs(hour - 17.6) / 2.2, 1 - Math.abs(hour - 6.4) / 1.6);

    {
      const cg = cutawayGeom();
      cutX = cg ? cg.x : -1; cutY = cg ? cg.y : -1;
      const ck = cg ? cg.x * N + cg.y : -1;
      if (ck !== bakedCut) { bakedCut = ck; worldDirty = true; }
    }
    if (bakeTick(now, transparentBg)) {
      // A visible rebuild is in progress: keep the last frame on screen (no half-built map, no long stall)
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(freezeCanvas, 0, 0);
      return;
    }

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
        const sx = px(wx + 0.5, wy + 0.5), sy = py(wx + 0.5, wy + 0.5, -7);
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
    boatsVis.length = 0; bridgesOver.length = 0; railOver.clear();
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
      if (isNYC) {
        for (const c of trainCars()) {
          const tx0 = px(c.pose.x, c.pose.y), ty0 = py(c.pose.x, c.pose.y, c.pose.z);
          if (tx0 < -60 || tx0 > W + 60 || ty0 < -60 || ty0 > H + 60) continue;
          ov.push({ k: 10, s: c.pose.x + c.pose.y + 0.2, c }); addOccluders(Math.floor(c.pose.x), Math.floor(c.pose.y));
        }
        const fb = ferryBoat(); if (fb) boatsVis.push(fb);
        // Cars under an elevated line: redraw that tile's rail pieces after them so the deck stays on top
        for (const c of cars) {
          const tx = Math.round(c.px), ty = Math.round(c.py), key = tx * N + ty;
          if (railBake && railBake.has(key) && !railOver.has(key)) { railOver.add(key); ov.push({ k: 11, s: tx + ty + 0.99, x: tx, y: ty }); }
        }
      }
      for (const b of bots) {
        const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
        if (bx0 < -30 || bx0 > W + 30 || by0 < -30 || by0 > H + 30) continue;
        ov.push({ k: 6, s: b.px + b.py, b }); addOccluders(Math.floor(b.px), Math.floor(b.py));
      }
      for (const b of boats) {
        const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
        if (bx0 < -40 || bx0 > W + 40 || by0 < -40 || by0 > H + 40) continue;
        boatsVis.push(b); addOccluders(Math.floor(b.px), Math.floor(b.py));
        // Bridges the boat is under or about to pass: their decks are redrawn on top of it
        for (const [tx, ty] of [[b.fx, b.fy], [b.tx, b.ty]]) {
          if (grid[tx]?.[ty] !== 'bridge' || tx + ty + 0.35 < b.px + b.py) continue; // only bridges level with or in front of the boat
          if (!bridgesOver.some((q) => q[0] === tx && q[1] === ty)) bridgesOver.push([tx, ty]);
        }
      }
    }

    if (selectedTile) {
      const [sx, sy] = selectedTile;
      const st = grid[sx]?.[sy];
      if (isBuilding(st) && !(sx === cutX && sy === cutY)) {
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

    if (ov.length || boatsVis.length) {
      const savedW = warm; warm = 0;
      // Boats sit lowest (on the water), so they go first; bridge decks over them are then redrawn, and
      // everything on the banks or on the bridges is drawn after in depth order.
      for (const b of boatsVis) drawBoat(b, 1, now);
      for (const [bx, by] of bridgesOver) drawRoad(bx, by, 1, true, true, true);
      if (ov.length > 1) ov.sort((a, b) => a.s - b.s || a.k - b.k);
      for (const it of ov) {
        if (it.k === 1) drawCar(it.c, 1, false);
        else if (it.k === 2) drawWalker(it.w, now);
        else if (it.k === 3) drawBoat(it.b, 1, now);
        else if (it.k === 4) drawWheelSpin(it.x, it.y, now, 1);
        else if (it.k === 5) drawMillSpin(it.x, it.y, now, 1);
        else if (it.k === 6) drawBot(it.b, now, false);
        else if (it.k === 7) drawBot(it.b, now, true);
        else if (it.k === 10) drawTrainCar(it.c, 1, false);
        else if (it.k === 11) drawRailForTile(it.x, it.y);
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
      // Blue hour: a cool blue-grey wash (lighter than before so wall and roof faces stay readable)
      const wa = warm * 0.12;
      const na = (1 - L) * (weather === 'overcast' ? 0.7 : 0.63);
      const a = wa + na * (1 - wa);
      if (a > 0.004) {
        const r = Math.round((255 * wa + 16 * na * (1 - wa)) / a);
        const g = Math.round((155 * wa + 28 * na * (1 - wa)) / a);
        const b = Math.round((45 * wa + 62 * na * (1 - wa)) / a);
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    if (L < 0.72) {
      ctx.globalAlpha = Math.min(1, (0.72 - L) * 2.4);
      ctx.drawImage(nightCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);
      if (isNYC) { ctx.globalAlpha = Math.min(1, Math.max(0, ((1 - L) - 0.25) / 0.2)); ctx.drawImage(litCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z); }
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
    if (L < 0.6 && isNYC) for (const it of ov) if (it.k === 10) drawTrainCar(it.c, L, true);

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

    if (!transparentBg) {
      drawMapLabels(now);
      if (showLabels && repoCache.size) {
        const flash = reduceMotion || ((now >> 8) & 1);
        if (flash) {
          for (const lh of labelHits) {
            const cached = repoCache.get(lh.id);
            if (cached?.failed && lh.rw > 20) {
              ctx.fillStyle = '#ef4444';
              ctx.beginPath(); ctx.arc(lh.rx + lh.rw - 5, lh.ry + 4, 3.5, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
      }
    }
    drawExtras(now, transparentBg);
    // Cross-fade from the frozen frame once a rebuild finishes
    const fadeT = (now - fadeFrom) / 180;
    if (fadeT < 1 && !transparentBg) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - fadeT * fadeT; ctx.drawImage(freezeCanvas, 0, 0); ctx.restore();
    }
    drawnOnce = true;
  }

  // ---------- rotate ----------
  function rotateCity(cw = true) {
    rotSteps = (rotSteps + (cw ? 1 : 3)) % 4;
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
    if (!document.hidden && tickerQueue.length > 1) { tickerIdx++; refreshTickerUI(); }
  }, 4500);
  $('tickerLink').onclick = () => {
    unreadNotifs = 0; $('notifBadge').hidden = true;
    const item = tickerQueue[tickerIdx % Math.max(1, tickerQueue.length)];
    if (item?.repo) focusItemById(item.repo);
  };

  async function fetchUserRepos(force = false) {
    const list = await fetchJsonTimed(`https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=40&sort=updated`);
    if (!Array.isArray(list)) return;
    let added = false;
    for (const r of list) {
      if (!r || !r.name) continue;
      if (r.name === 'co-bo-u' || r.name === 'cham-merch-designs') continue;
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
        if (webUrl && !existing.fixedWeb) existing.web = webUrl;
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

    // Seed bottom commit ticker from top 4 updated public repos
    tickerQueue.length = 0;
    const topRepos = list.filter((r) => r && r.name && r.name !== 'co-bo-u' && r.name !== 'cham-merch-designs').slice(0, 4);
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

  let ghReqSeq = 0;
  async function fetchRepoActivity(repo, force = false, branchOverride = null) {
    if (repo.isCustom || !repo.git) return null;
    const prev = repoCache.get(repo.id);
    const now = Date.now();
    const ttl = prev?.live ? 120000 : 10000;
    if (!force && !branchOverride && prev && (prev.loading || now - prev.at < ttl)) return prev;

    const br = branchOverride || repo.meta?.branch || 'main';
    const reqId = ++ghReqSeq;
    repo._reqId = reqId;
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

    if (repo._reqId !== reqId) return repoCache.get(repo.id) || entry;
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
            if (!pomo.running || document.hidden) return;
            pomo.secLeft--;
            if (pomo.secLeft <= 0) {
              pomo.running = false;
              clearInterval(pomo.timer); pomo.timer = 0;
              if (pomo.mode === 'work') { simStats.pomodoros++; studyStreak++; saveNow(); }
              const ptTile = findItemTile('pomodoro') || selectedTile;
              if (ptTile) spawnConfetti(ptTile[0], ptTile[1], 36);
              pomo.mode = 'work';
              pomo.secLeft = 25 * 60;
              renderLocalStudyTools(getItem('pomodoro'));
              return;
            }
            const pt = $('pomoTime');
            if (pt) pt.textContent = `${String(Math.floor(pomo.secLeft / 60)).padStart(2, '0')}:${String(pomo.secLeft % 60).padStart(2, '0')}`;
          }, 1000);
        } else if (!pomo.running && pomo.timer) {
          clearInterval(pomo.timer); pomo.timer = 0;
        }
        renderLocalStudyTools(item);
      };
      $('pomoBreak').onclick = () => { pomo.running = false; clearInterval(pomo.timer); pomo.timer = 0; pomo.mode = 'break'; pomo.secLeft = 5 * 60; renderLocalStudyTools(item); };
      $('pomoReset').onclick = () => { pomo.running = false; clearInterval(pomo.timer); pomo.timer = 0; pomo.mode = 'work'; pomo.secLeft = 25 * 60; renderLocalStudyTools(item); };
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
    const isGoogleAcct = item.kind === 'google' && !item.localTool && !item.isCustom && item.id !== 'seqta' && item.id !== 'mybib' && item.id !== 'blooket' && item.id !== 'goodnotes';
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
      ['District', item.kind === 'github' ? 'North' : 'South'],
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
          a.href = f.type === 'dir' ? `${item.git}/tree/${branch}/${f.path}` : `https://vscode.dev/github/${GITHUB_OWNER}/${item.api || item.id}/blob/${branch}/${f.path}`;
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
          r.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">4 periods</span></div><div class="detail-sub"></div>`;
          r.querySelector('.detail-title').textContent = row.day || '';
          r.querySelector('.detail-sub').textContent = `${row.p1 || ''} · ${row.p2 || ''} · ${row.p3 || ''} · ${row.p4 || ''}`;
          l2.appendChild(r);
        }
      } else {
        for (const s of (item.shortcuts || [])) {
          const a = document.createElement('a'); a.className = 'detail-row'; a.href = safeHref(s.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
          a.innerHTML = `<div class="detail-top"><span class="detail-title"></span><span class="detail-meta">Open</span></div><div class="detail-sub"></div>`;
          a.querySelector('.detail-title').textContent = s.label;
          a.querySelector('.detail-sub').textContent = s.sub || s.url;
          l2.appendChild(a);
        }
      }

      const bms = bookmarks[item.id] || [];
      bms.forEach((bm, idx) => {
        const wrap = document.createElement('div'); wrap.className = 'bookmark-row';
        const a = document.createElement('a'); a.className = 'detail-row'; a.href = safeHref(bm.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
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

  let lastInspId = null;
  function renderInspect(forceFetch = false) {
    const card = $('inspectCard');
    if (!selectedTile) {
      card.dataset.open = 'false'; card.inert = true; orbitActive = false;
      $('inspEditBox').hidden = true; $('inspEditBtn').setAttribute('aria-expanded', 'false');
      lastInspId = null;
      return;
    }
    const [x, y] = selectedTile;
    const t = grid[x][y], id = pins[x][y];
    if (!t || !id) {
      selectedTile = null; card.dataset.open = 'false'; card.inert = true;
      $('inspEditBox').hidden = true; $('inspEditBtn').setAttribute('aria-expanded', 'false');
      lastInspId = null;
      return;
    }

    $('launchPop').dataset.open = 'false';
    $('launchBtn').setAttribute('aria-expanded', 'false');
    $('launchPop').inert = true;
    card.inert = false;

    const item = getItem(id);
    if (item.id !== lastInspId) {
      $('inspEditBox').hidden = true;
      $('inspEditBtn').setAttribute('aria-expanded', 'false');
      lastInspId = item.id;
    }
    const isGit = item.kind === 'github' && !item.isCustom;
    if (item.kind === 'github') simStats.visitedGit = true;
    else simStats.visitedGoogle = true;

    $('inspTitle').textContent = item.name;
    $('inspSub').textContent = `${TYPES[t].name} (${item.kind === 'google' ? 'South Bank' : 'North Bank'}) · (${x}, ${y})`;
    $('inspDesc').textContent = item.desc || item.web || '';

    $('inspWeb').hidden = !item.web;
    if (item.web) { $('inspWeb').href = safeHref(item.web); $('inspWeb').textContent = isGit ? 'Open live site' : `Open ${item.name}`; warmUrl(item.web); }

    $('inspEditor').hidden = !(isGit || item.alt);
    if (isGit) {
      const br = repoCache.get(item.id)?.branch || 'main';
      $('inspEditor').href = `https://vscode.dev/github/${GITHUB_OWNER}/${item.api || item.id}${item.path ? `/tree/${br}/${item.path}` : ''}`;
      $('inspEditor').textContent = 'Open vscode.dev';
    }
    else if (item.alt) { $('inspEditor').href = safeHref(item.alt); $('inspEditor').textContent = item.altLabel || 'Quick action'; }

    $('inspGit').hidden = !(isGit && item.git);
    if (isGit && item.git) $('inspGit').href = safeHref(item.git);

    $('inspCopy').textContent = isGit && item.git ? 'Copy clone' : 'Copy link';
    $('inspCloneBox').hidden = !(isGit && item.git);
    if (isGit && item.git) $('inspCloneCode').textContent = `git clone ${item.git}.git`;

    $('editName').value = item.name || '';
    $('editWeb').value = item.web || '';
    $('editAlt').value = isGit ? (item.git || '') : (item.alt || '');
    $('editStyle').value = t;
    $('editColor').value = item.customColor || TYPES[t].color;
    $('editDeleteBtn').hidden = !(item.isCustom && !item.builtin);

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
    lastSelKey = ''; // rebuild who is shown (inside vs at the entrance); opening flies in
    if (!cutawayActive && preCutCam) {
      const p = preCutCam; preCutCam = null;
      camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx: p.x, ty: p.y, tz: Math.min(p.z, MAX_ZOOM), start: performance.now(), dur: 380 };
    }
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
    warmUrl(getItem(matches[0].id).web);
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
  let enterState = { id: '', q: '', t: 0 };
  // After a page has been opened, clear the search so it's ready for the next one (the building stays selected and highlighted).
  function resetSearchAfterOpen(keepFocus = true) {
    enterState = { id: '', q: '', t: 0 };
    $('repoSearch').value = '';
    renderSearchResults();
    $('searchResults').hidden = true;
    $('clearSearch').hidden = true;
    if (keepFocus && document.activeElement === $('repoSearch')) $('repoSearch').select();
    center(true); // back to the default overview once the search is finished
  }
  $('repoSearch').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = ($('repoSearch').value || '').trim().toLowerCase();
      const first = allItems().find((r) => matchesFilter(r, q));
      if (!first) return;
      const now = Date.now();
      if (enterState.id === first.id && enterState.q === q && now - enterState.t < 8000) {
        // second Enter: go straight to the page
        const url = getItem(first.id).web || getItem(first.id).git;
        if (url) { window.open(safeHref(url), '_blank', 'noopener,noreferrer'); notify(`Opened ${first.name}`, 1400); }
        resetSearchAfterOpen();
      } else {
        focusItemById(first.id);
        enterState = { id: first.id, q, t: now };
        notify('Press Enter again to open the page', 1800);
      }
    }
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('#inspectCard a[href], #launchPop a[href]');
    if (a && $('repoSearch').value) resetSearchAfterOpen(false);
  }, true);
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
    $('syncBtn').disabled = false;
    audio.sfx('select');
  };

  // ---------- popovers: Economy, Cities, Customize, Compare, Help ----------
  function setPop(id, btnId, open) {
    ['econPop', 'citiesPop', 'customPop', 'comparePop', 'helpPop'].forEach((pid) => {
      if (pid !== id) $(pid).dataset.open = 'false';
      $(pid).inert = (pid !== id || !open);
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
  // Customize panel entry point for the Cities panel (save slots and switching between the classic and NYC maps)
  if ($('openCitiesBtn')) $('openCitiesBtn').onclick = (e) => { e.stopPropagation(); setPop('customPop', 'customBtn', false); setPop('citiesPop', '', true); };
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
      const mTitle = document.createElement('div'); mTitle.className = 'detail-title'; mTitle.textContent = `City Slot ${i}`;
      const mSub = document.createElement('div'); mSub.className = 'detail-sub';
      mSub.textContent = saved ? `${saved.themeId || 'autumn'} · $${fmt(saved.money || 0)}` : 'Empty slot';
      meta.append(mTitle, mSub);
      const btns = document.createElement('div'); btns.className = 'field-row';
      const sBtn = document.createElement('button'); sBtn.type = 'button'; sBtn.className = 'chip tiny'; sBtn.textContent = 'Save';
      sBtn.onclick = () => { localStorage.setItem(SLOT_PREFIX + i, JSON.stringify(serializeState())); renderCitiesUI(); audio.sfx('select'); };
      const lBtn = document.createElement('button'); lBtn.type = 'button'; lBtn.className = 'chip tiny primary'; lBtn.textContent = 'Load'; lBtn.disabled = !saved;
      lBtn.onclick = () => { if (saved && loadCityAnySize(saved)) setPop('citiesPop', 'citiesBtn', false); };
      btns.append(sBtn, lBtn); row.append(meta, btns); list.appendChild(row);
    }
    // Map switching: New York (fresh or with this workspace) and back to the classic city
    const row = document.createElement('div'); row.className = 'detail-row bookmark-row';
    const meta = document.createElement('div');
    const t1 = document.createElement('div'); t1.className = 'detail-title'; t1.textContent = isNYC ? 'New York City map' : 'Classic city map';
    const t2 = document.createElement('div'); t2.className = 'detail-sub';
    t2.textContent = isNYC ? 'Four islands, railway and harbour. Your classic city is kept.' : 'Try the New York map. This city is kept and you can come back.';
    meta.append(t1, t2);
    const btns = document.createElement('div'); btns.className = 'field-row';
    const mk = (label, fn, primary) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip tiny' + (primary ? ' primary' : ''); b.textContent = label; b.onclick = fn; btns.appendChild(b); };
    if (!isNYC) {
      if (NYC) { mk('Open NYC', () => switchToNYC(false), true); mk('Move workspace to NYC', () => switchToNYC(true)); }
    } else if (localStorage.getItem(CLASSIC_KEY)) mk('Back to classic city', () => switchToClassic(), true);
    row.append(meta, btns); list.appendChild(row);
  }

  function reloadInto(saveJson) {
    switchingCity = true; clearTimeout(saveTimer); saveTimer = 0;
    if (saveJson) localStorage.setItem(SAVE_KEY, saveJson); else localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
  function loadCityAnySize(d) {
    if (!d || !Array.isArray(d.grid)) return false;
    if (d.grid.length === N) { if (!applySaveData(d)) return false; worldDirty = true; recompute(); saveNow(); center(true); return true; }
    if (d.grid.length === 32 || (d.grid.length === 64 && NYC)) { reloadInto(JSON.stringify(d)); return true; }
    return false;
  }
  function switchToNYC(transfer) {
    saveNow();
    localStorage.setItem(CLASSIC_KEY, JSON.stringify(serializeState()));
    if (transfer) { localStorage.setItem(TRANSFER_KEY, JSON.stringify(serializeState())); reloadInto(null); return; }
    reloadInto(localStorage.getItem(NYC_KEY) || null);
  }
  function switchToClassic() {
    saveNow();
    localStorage.setItem(NYC_KEY, JSON.stringify(serializeState()));
    reloadInto(localStorage.getItem(CLASSIC_KEY));
  }
  // After "Move workspace to NYC": a fresh NYC map carrying over items, links, preferences and notes
  function applyNycTransfer() {
    let t = null;
    try { t = JSON.parse(localStorage.getItem(TRANSFER_KEY)); } catch (e) { /* none */ }
    if (!t || !isNYC) return;
    localStorage.removeItem(TRANSFER_KEY);
    applySaveData({ ...t, grid, levels, pins: makePins(), rotSteps: 0 });
    notify('Your workspace moved to New York. The classic city is saved under Cities.', 4200);
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
    const buildCol = (r, c) => {
      const col = document.createElement('div'); col.className = 'cmp-col';
      const st = document.createElement('strong'); st.textContent = r.name || '';
      const s1 = document.createElement('span'); s1.className = 'detail-sub';
      s1.textContent = `${r.lang || ''} · Stars: ${r.meta?.stars ?? c?.meta?.stars ?? 0}`;
      const s2 = document.createElement('span'); s2.className = 'detail-sub';
      s2.textContent = `Issues: ${r.meta?.issues ?? c?.issues?.length ?? 0} · PRs: ${c?.prs?.length ?? 0}`;
      const s3 = document.createElement('span'); s3.className = 'detail-sub';
      s3.textContent = `Commits loaded: ${c?.commits?.length ?? 0}`;
      col.append(st, s1, s2, s3);
      if (r.web) {
        const lk = document.createElement('a'); lk.className = 'chip tiny primary link-btn';
        lk.href = safeHref(r.web); lk.target = '_blank'; lk.rel = 'noopener noreferrer';
        lk.textContent = 'Open web';
        col.appendChild(lk);
      }
      return col;
    };
    const gridEl = $('cmpGrid'); gridEl.innerHTML = '';
    gridEl.append(buildCol(a, ca), buildCol(b, cb));
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
    if (isNYC) { notify('Ghost Town is part of the classic city map.'); return; }
    ghostMode = !ghostMode;
    // Move low-activity HTML/old repos to Ghost Town or back
    const targets = ['claude', 'cham-bracelet-plan'];
    targets.forEach((id, idx) => {
      const cur = findItemTile(id);
      if (!cur) return;
      if (ghostMode) {
        const [gx0, gy0, gt] = D.GHOST_TOWN_LOTS[idx];
        const [gx, gy] = rotPt(gx0, gy0);
        if (!pins[gx][gy]) {
          pins[cur[0]][cur[1]] = null; grid[cur[0]][cur[1]] = 'forest';
          pins[gx][gy] = id; grid[gx][gy] = gt;
        }
      } else {
        const lm = D.GITHUB_LANDMARKS.find((l) => l.id === id);
        const [rx, ry] = lm ? rotPt(lm.x, lm.y) : [-1, -1];
        const dest = (rx >= 0 && !pins[rx][ry])
          ? { x: rx, y: ry, lv: lm.lv || 1, t: lm.t }
          : (() => { const f = findFreeLot('github', lm?.t || 'shop'); return f ? { ...f, t: lm?.t || 'shop' } : null; })();
        if (dest) {
          pins[cur[0]][cur[1]] = null; grid[cur[0]][cur[1]] = 'forest';
          pins[dest.x][dest.y] = id; grid[dest.x][dest.y] = dest.t; levels[dest.x][dest.y] = dest.lv;
        }
      }
    });
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
    else if (p === 'street') { orbitActive = false; { const [sx0, sy0] = isNYC ? rotPt(16, 31) : [12, 16]; flyToTile(selectedTile ? selectedTile[0] : sx0, selectedTile ? selectedTile[1] : sy0, 1.75, false); } }
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
      const url = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
      a.href = url;
      a.download = 'workspace-city-timelapse.webm';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
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
    const a = document.createElement('a'); const url = URL.createObjectURL(blob); a.href = url; a.download = 'workspace-city-save.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      loadCityAnySize(d);
    } catch (err) {}
  };
  $('resetBtn').onclick = () => {
    customItems.length = 0; clearObj(overrides); clearObj(bookmarks); clearObj(accountPrefs);
    deadlines = [{ title: 'Maths IA draft review', due: 'Fri', place: 'seqta' }];
    timetable = D.DEFAULT_TIMETABLE.map((r) => ({ ...r }));
    quickNoteText = ''; studyStreak = 1; ghostMode = false; selectedTile = null;
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
      if (drag.d > 4 && nd > 4) zoomAt(nd / drag.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      drag.d = nd; return;
    }
    if (drag?.pinch) return;
    if (drag) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      cam.x = drag.cx + dx; cam.y = drag.cy + dy;
    }

    const lbl = hitLabel(e.clientX, e.clientY);
    hoveredLabel = lbl ? lbl.id : null;
    if (lbl && lbl.id !== lastWarmId) { lastWarmId = lbl.id; warmUrl(getItem(lbl.id).web); }
    const t = lbl ? [lbl.x, lbl.y] : pick(e.clientX, e.clientY);
    hover = t;
    if (toolsActive()) { $('tip').hidden = true; return; }
    if (!drag) canvas.style.cursor = (lbl || (t && pins[t[0]]?.[t[1]])) ? 'pointer' : 'grab';

    const tip = $('tip');
    if (!tip.hidden) tip.hidden = true;
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
    if (!Number.isFinite(f) || f <= 0) return;
    if (!finiteCam()) center(false);
    camAnim = null;
    const nz = Math.max(0.45, Math.min(maxZoom(), cam.z * f));
    const k = nz / cam.z;
    const nx = mx - (mx - cam.x) * k, ny = my - (my - cam.y) * k;
    if (Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz)) {
      cam.x = nx; cam.y = ny; cam.z = nz;
    }
    audio.updateZoomAmbience(cam.z);
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (photoMode) { setPhotoMode(false); return; }
      $('searchResults').hidden = true;
      ['econPop', 'citiesPop', 'customPop', 'comparePop', 'helpPop'].forEach((id) => setPop(id, '', false));
      if ($('launchPop')) { $('launchPop').dataset.open = 'false'; $('launchPop').inert = true; $('launchBtn').setAttribute('aria-expanded', 'false'); }
      if (selectedTile) { selectedTile = null; renderInspect(); }
      return;
    }
    if (e.target.closest && e.target.closest('input, select, textarea, button, a, [role="button"], summary')) return;
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
  let viewInset = 0; // pixels of the screen covered on the left by the workspace screen
  function center(animateMove = false) {
    const VW = Math.max(240, W - viewInset);
    const tz = Math.max(0.35, Math.min(0.95, VW / (N * TW) * 1.12, H / (N * TH + 150) * 1.12));
    const tx = viewInset + VW / 2, ty = H / 2 - (N * TH / 2) * tz + 26;
    if (!animateMove || reduceMotion) { cam.x = tx; cam.y = ty; cam.z = tz; camAnim = null; return; }
    camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: performance.now(), dur: 340 };
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
    const want = isNYC ? 1.25 : 1.5; // fixed: re-rasterising the map caused multi-hundred-millisecond freezes
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
  const weakDevice = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  let perfLevel = perfForced ? 2 : (weakDevice ? 1 : 0), intervalEma = 16.7, slowFrames = 0, lastFrameAt = 0, workEma = 6, perfCheckAt = 0;
  function setPerfLevel(n) {
    if (n === perfLevel) return;
    perfLevel = n;
    perfMaxDpr = n >= 1 ? 1 : 1.25;
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
        perfCheckAt = now + 500;
        const target = perfLevel >= 2 ? 36 : 22;
        if (intervalEma > target) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
        if (!perfForced && slowFrames >= 2 && perfLevel < 2) { setPerfLevel(perfLevel + 1); slowFrames = 0; intervalEma = 16.7; }
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
      const p = Math.max(0, Math.min(1, (now - camAnim.start) / Math.max(1, camAnim.dur)));
      const e = easeOut(p);
      const nx = camAnim.sx + (camAnim.tx - camAnim.sx) * e;
      const ny = camAnim.sy + (camAnim.ty - camAnim.sy) * e;
      const nz = camAnim.sz + (camAnim.tz - camAnim.sz) * e;
      if (Number.isFinite(nx) && Number.isFinite(ny) && Number.isFinite(nz) && nz > 0) {
        cam.x = nx; cam.y = ny; cam.z = nz;
      } else { camAnim = null; }
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
      stepTrains(simDt);
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
    const i = insetFor(x, y, t) || 0.12;
    const H = Math.max(1, bldHeight(t, levels[x][y] || 1));
    return { x, y, t, i, H, x0: x + i, y0: y + i, x1: x + 1 - i, y1: y + 1 - i, F: 1 };
  }

  // ---------- company interior (ground floor, dollhouse cut) ----------
  // Everything in the room uses the same world scale as people: 4 px per metre of height, ~9 m per tile.
  // Layout is in local (u, v) across the footprint: u runs along x, v along y; the entrance is on the
  // front y1 face. Two room kinds so roles read differently: a studio/office and a library.
  const ROOM_H = 3.5 * MZ;          // one storey, 14 px
  const DESK_Z = 0.75 * MZ;         // tabletop at seated elbow height
  const SEAT_Z = 0.46 * MZ;         // chair seat
  let roomCache = null;
  function roomLayout(g) {
    const key = `${g.x},${g.y},${g.t}`;
    if (roomCache?.key === key) return roomCache;
    const lib = g.t === 'school';
    const items = [], seats = [];
    // Workstation: desk, monitor (facing the worker), lamp, notebook, chair; worker faces -v (toward the back wall)
    // Workstation: 1.4 x 0.7 m desk, monitor facing the worker, warm lamp, notebook, chair behind it
    const station = (u, v, accent, occupied) => {
      items.push({ k: 'desk', u0: u - 0.095, v0: v - 0.05, u1: u + 0.095, v1: v + 0.05, accent });
      items.push({ k: 'chair', u, v: v + 0.115 });
      seats.push({ u, v: v + 0.11, fx: 0, fy: -1, typing: true, occupied });
    };
    if (!lib) {
      // Two workstations against the back, a clear aisle from the door, a small lounge to one side
      station(0.2, 0.3, '#3f7f8a', true); station(0.43, 0.3, '#c2553e', false);
      items.push({ k: 'shelf', u0: 0.06, v0: 0.015, u1: 0.56, v1: 0.07, h: 1.9 });
      items.push({ k: 'rug', u0: 0.64, v0: 0.52, u1: 0.95, v1: 0.9, c: '#9a5a46' });
      items.push({ k: 'sofa', u0: 0.68, v0: 0.78, u1: 0.93, v1: 0.89, c: '#4f6f78' });
      items.push({ k: 'table', u0: 0.73, v0: 0.6, u1: 0.87, v1: 0.69, h: 0.42 * MZ, top: '#8a6a4a' });
      items.push({ k: 'flamp', u: 0.9, v: 0.56 });
      items.push({ k: 'plant', u: 0.92, v: 0.12, h: 6 });
      items.push({ k: 'plant', u: 0.07, v: 0.93, h: 5 });
    } else {
      items.push({ k: 'shelf', u0: 0.04, v0: 0.015, u1: 0.96, v1: 0.07, h: 2.6 });
      items.push({ k: 'shelfX', u0: 0.015, v0: 0.08, u1: 0.07, v1: 0.92, h: 2.6 });
      items.push({ k: 'shelf', u0: 0.12, v0: 0.3, u1: 0.42, v1: 0.36, h: 1.9 });
      items.push({ k: 'shelf', u0: 0.12, v0: 0.56, u1: 0.42, v1: 0.62, h: 1.9 });
      items.push({ k: 'table', u0: 0.58, v0: 0.34, u1: 0.9, v1: 0.56, h: DESK_Z, top: '#a3714a', lamps: true });
      for (const [u, v, fy] of [[0.64, 0.64, -1], [0.82, 0.64, -1], [0.64, 0.27, 1], [0.82, 0.27, 1]]) {
        items.push({ k: 'chair', u, v, back: fy > 0 ? -1 : 1 });
        seats.push({ u, v, fx: 0, fy, typing: fy < 0, occupied: fy < 0 && u < 0.7 });
      }
      items.push({ k: 'rug', u0: 0.55, v0: 0.72, u1: 0.95, v1: 0.95, c: '#5d6e4a' });
      items.push({ k: 'sofa', u0: 0.66, v0: 0.84, u1: 0.92, v1: 0.94, c: '#8a4b3c' });
      items.push({ k: 'plant', u: 0.93, v: 0.12, h: 6 });
      items.push({ k: 'plant', u: 0.08, v: 0.95, h: 4 });
    }
    roomCache = { key, lib, items, seats };
    return roomCache;
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
      // Seat anchors from the room layout: one worker per seat, plus one person walking the aisle
      const room = roomLayout(g);
      let k = 0;
      for (const s of room.seats) {
        if (!s.occupied) continue;
        const wx = g.x0 + (g.x1 - g.x0) * s.u, wy = g.y0 + (g.y1 - g.y0) * s.v;
        crew.push(mk(wx, wy, 0.4, k++, { inside: true, floor: 0, desk: true, seat: s, _fx: s.fx, _fy: s.fy }));
      }
      const ax = g.x0 + (g.x1 - g.x0) * 0.66, ay = g.y0 + (g.y1 - g.y0) * 0.9; // just inside, beside the door
      crew.push(mk(ax, ay, 0.4, k++, { inside: true, floor: 0, door: true, _fx: -0.6, _fy: 0.8 }));
    } else {
      for (let k = 0; k < 4; k++) { const [ox, oy] = CREW_SPOTS[k]; crew.push(mk(x + ox, y + oy, 0, k, { sc: 1 })); }
    }
  }

  // Company workers use the same world-scale person as pedestrians (previously a fixed ~21 px figure, about
  // 2.5x the height of the 8.5 px ground-floor door). Feet sit on the pavement, floor or ground under them.
  function drawPerson(a, now) {
    const x = a.px + 0.5, y = a.py + 0.5;
    const z = a.inside ? (a.z0 || 0) : surfaceZ(x, y);
    const phase = trackStride(a, x, y);
    // Face the way they are drifting; keep the last facing when they pause
    if (a._lpx !== undefined) {
      const vx = x - a._lpx, vy = y - a._lpy;
      if (Math.hypot(vx, vy) > 0.0006) { const l = Math.hypot(vx, vy); a._fx = vx / l; a._fy = vy / l; }
    }
    a._lpx = x; a._lpy = y;
    if (!a._look) a._look = lookFor(a.info?.name || a.color);
    drawHuman(x, y, z, a._fx ?? 0, a._fy ?? 1, a._look, phase, a.desk ? 0 : (a._moving || 0) * 0.5,
      { seated: !!a.desk, holding: !a.inside, simple: perfLevel >= 2, typing: !!a.seat?.typing && !reduceMotion, t: now, ph: a.phase });
  }

  function drawCutaway(now) {
    const g = cutawayGeom();
    if (!g) return;
    const { x0, y0, x1, y1 } = g;
    const room = roomLayout(g);
    const L = daylight(hour);
    const evening = Math.max(0, Math.min(1, (0.7 - L) / 0.5)); // 0 by day, 1 at night
    const Z0 = 0.4;                                             // floor slab top
    const WL = (u, v) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * v];
    const P = (u, v, z) => { const [a, b] = WL(u, v); return [px(a, b), py(a, b, z)]; };
    const poly = (pts, fill) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    const quad = (u0, v0, u1, v1, z, fill) => poly([P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z)], fill);
    const faceV = (u0, u1, v, z0, z1, fill) => poly([P(u0, v, z0), P(u1, v, z0), P(u1, v, z1), P(u0, v, z1)], fill);
    const faceU = (u, v0, v1, z0, z1, fill) => poly([P(u, v0, z0), P(u, v1, z0), P(u, v1, z1), P(u, v0, z1)], fill);
    const lbox = (u0, v0, u1, v1, z0, z1, side, top) => { const [a0, b0] = WL(u0, v0), [a1, b1] = WL(u1, v1); box(a0, b0, a1, b1, z0, z1, side, 1, { roof: top || side }); };
    const WALL = room.lib ? '#d9cdb5' : '#cfd6d2', WALL2 = room.lib ? '#c8bb9f' : '#bcc5c1', FLOOR = room.lib ? '#9c6b45' : '#b88a5c';
    const T = Z0 + ROOM_H;
    const WINS = room.lib ? [[0.3, 0.46], [0.56, 0.72]] : [[0.16, 0.36], [0.6, 0.8]];

    // Foundation edge on the open sides
    faceV(0, 1, 1, 0, Z0, '#7d7468'); faceU(1, 0, 1, 0, Z0, '#6a6258');
    // Back walls (x0 and y0), skirting, and the pale cut cap that shows wall thickness
    faceU(0, 0, 1, Z0, T, WALL2); faceV(0, 1, 0, Z0, T, WALL);
    faceU(0, 0, 1, Z0, Z0 + 0.5, '#8b7b66'); faceV(0, 1, 0, Z0, Z0 + 0.5, '#9a8a74');
    poly([P(0, 0, T), P(1, 0, T), P(1, -0.03, T), P(-0.03, -0.03, T), P(-0.03, 1, T), P(0, 1, T)], '#efe9dc');
    // Tall windows: daylight blue by day, dark glass at night
    const glass = evening > 0.5 ? '#2c3a4a' : '#a9cde0';
    for (const [a, b] of WINS) {
      faceU(0, a - 0.01, b + 0.01, Z0 + 2.6, Z0 + 12.4, '#efe9dc');
      faceU(0, a, b, Z0 + 3, Z0 + 12, glass);
      faceU(0, (a + b) / 2 - 0.004, (a + b) / 2 + 0.004, Z0 + 3, Z0 + 12, '#efe9dc');
    }
    if (!room.lib) {
      faceV(0.56, 0.9, 0, Z0 + 2.6, Z0 + 12.4, '#efe9dc'); faceV(0.57, 0.89, 0, Z0 + 3, Z0 + 12, glass);
      // A framed print between the windows: eye-level detail
      faceU(0, 0.43, 0.53, Z0 + 6, Z0 + 10, '#2f3a40'); faceU(0, 0.44, 0.52, Z0 + 6.4, Z0 + 9.6, '#d9b45a');
    }
    // Wall sconces
    for (const v of [0.08, 0.92]) faceU(0, v - 0.015, v + 0.015, Z0 + 9, Z0 + 10.2, evening > 0.3 ? '#ffd48a' : '#e6dcc4');

    // Wooden floor with plank lines
    quad(0, 0, 1, 1, Z0, FLOOR);
    ctx.strokeStyle = 'rgba(60,40,24,0.18)'; ctx.lineWidth = Math.max(0.5, 0.4 * rcam.z);
    ctx.beginPath();
    for (let k = 1; k < 9; k++) { const [a, b] = P(0, k / 9, Z0), [c, d] = P(1, k / 9, Z0); ctx.moveTo(a, b); ctx.lineTo(c, d); }
    ctx.stroke();
    // Daylight falling through the x0 windows onto the floor (fades out toward evening)
    if (L > 0.25) {
      const a = (0.22 * Math.min(1, (L - 0.25) / 0.4)).toFixed(3);
      for (const [w0, w1] of WINS) poly([P(0, w0, Z0), P(0, w1, Z0), P(0.42, w1 + 0.1, Z0), P(0.42, w0 + 0.1, Z0)], `rgba(255,244,214,${a})`);
    }
    // Rugs lie flat; everything else is depth-sorted together with the people
    for (const it of room.items) if (it.k === 'rug') quad(it.u0, it.v0, it.u1, it.v1, Z0 + 0.05, it.c);

    const draws = [];
    const depth = (u, v) => { const [a, b] = WL(u, v); return a + b; };
    for (const it of room.items) {
      if (it.k === 'rug') continue;
      if (it.k === 'desk') draws.push({ d: depth(it.u1, it.v1) - 0.02, f: () => {
        lbox(it.u0, it.v0, it.u1, it.v1, Z0 + DESK_Z - 0.4, Z0 + DESK_Z, '#8a6a4a', '#c49a6c');
        lbox(it.u0 + 0.005, it.v0 + 0.005, it.u0 + 0.015, it.v1 - 0.005, Z0, Z0 + DESK_Z - 0.4, '#5a4632');
        lbox(it.u1 - 0.015, it.v0 + 0.005, it.u1 - 0.005, it.v1 - 0.005, Z0, Z0 + DESK_Z - 0.4, '#5a4632');
        // Monitor facing the worker (+v) with a glowing screen and an accent-coloured app; lamp; notebook
        const mu = (it.u0 + it.u1) / 2, mv = it.v0 + 0.016;
        lbox(mu - 0.006, mv - 0.006, mu + 0.006, mv + 0.006, Z0 + DESK_Z, Z0 + DESK_Z + 0.5, '#22282e');
        lbox(mu - 0.036, mv - 0.004, mu + 0.036, mv + 0.004, Z0 + DESK_Z + 0.5, Z0 + DESK_Z + 2.1, '#22282e');
        faceV(mu - 0.031, mu + 0.031, mv + 0.0045, Z0 + DESK_Z + 0.65, Z0 + DESK_Z + 1.95, evening > 0.3 ? '#bfe9f2' : '#9fd0dc');
        faceV(mu - 0.026, mu - 0.004, mv + 0.005, Z0 + DESK_Z + 0.85, Z0 + DESK_Z + 1.75, it.accent);
        lbox(it.u0 + 0.012, it.v0 + 0.01, it.u0 + 0.018, it.v0 + 0.016, Z0 + DESK_Z, Z0 + DESK_Z + 1.6, '#2f3a40');
        lbox(it.u0 + 0.004, it.v0 + 0.002, it.u0 + 0.03, it.v0 + 0.024, Z0 + DESK_Z + 1.5, Z0 + DESK_Z + 2.1, '#c9a64a', '#ffd48a');
        quad(it.u1 - 0.04, it.v1 - 0.03, it.u1 - 0.015, it.v1 - 0.008, Z0 + DESK_Z + 0.08, '#efe9dc');
      } });
      else if (it.k === 'chair') {
        const b = it.back || 1;
        draws.push({ d: depth(it.u, it.v) - 0.001, f: () => {
          lbox(it.u - 0.004, it.v - 0.004, it.u + 0.004, it.v + 0.004, Z0, Z0 + SEAT_Z - 0.4, '#2a2f33');
          lbox(it.u - 0.022, it.v - 0.022, it.u + 0.022, it.v + 0.022, Z0 + SEAT_Z - 0.4, Z0 + SEAT_Z, '#3b4248', '#4f5860');
        } });
        const bv0 = b > 0 ? it.v + 0.02 : it.v - 0.028, bv1 = bv0 + 0.008;
        draws.push({ d: depth(it.u, (bv0 + bv1) / 2) + 0.002, f: () => lbox(it.u - 0.022, bv0, it.u + 0.022, bv1, Z0 + SEAT_Z, Z0 + SEAT_Z + 1.9, '#3b4248', '#4f5860') });
      }
      else if (it.k === 'table') draws.push({ d: depth(it.u1, it.v1) - 0.02, f: () => {
        for (const [u, v] of [[it.u0 + 0.01, it.v0 + 0.01], [it.u1 - 0.02, it.v0 + 0.01], [it.u0 + 0.01, it.v1 - 0.02], [it.u1 - 0.02, it.v1 - 0.02]]) lbox(u, v, u + 0.01, v + 0.01, Z0, Z0 + it.h - 0.4, '#4a3828');
        lbox(it.u0, it.v0, it.u1, it.v1, Z0 + it.h - 0.4, Z0 + it.h, '#7a5a3e', it.top);
        if (it.lamps) for (const u of [it.u0 + 0.08, it.u1 - 0.08]) {
          const v = (it.v0 + it.v1) / 2;
          lbox(u - 0.004, v - 0.004, u + 0.004, v + 0.004, Z0 + it.h, Z0 + it.h + 1.6, '#c9a64a');
          lbox(u - 0.025, v - 0.012, u + 0.025, v + 0.012, Z0 + it.h + 1.6, Z0 + it.h + 2.3, '#3f8a5a', '#5fb07a');
        } else {
          quad(it.u0 + 0.03, it.v0 + 0.03, it.u0 + 0.07, it.v0 + 0.06, Z0 + it.h + 0.08, '#efe9dc');
          lbox(it.u1 - 0.05, it.v0 + 0.03, it.u1 - 0.035, it.v0 + 0.045, Z0 + it.h, Z0 + it.h + 0.8, '#c2553e');
        }
      } });
      else if (it.k === 'shelf' || it.k === 'shelfX') draws.push({ d: depth(it.u1, it.v1) - 0.05, f: () => {
        const h = it.h * MZ;
        lbox(it.u0, it.v0, it.u1, it.v1, Z0, Z0 + h, '#6b4a30', '#7d5838');
        // Rows of book spines on the visible face
        const along = it.k === 'shelf';
        const rows = Math.floor(h / 2.2), cols = Math.max(2, Math.round((along ? it.u1 - it.u0 : it.v1 - it.v0) * 60));
        const BOOK = ['#7a3b32', '#2f5d6a', '#c9a64a', '#4f6b44', '#8a5a7a', '#d8cbb5', '#3a4a5e'];
        for (let r = 0; r < rows; r++) {
          const zb = Z0 + 0.6 + r * 2.2;
          for (let c = 0; c < cols; c++) {
            const s0 = c / cols, s1 = (c + 0.8) / cols, top = zb + 1.6 - (c % 3) * 0.2;
            const col = BOOK[(c * 7 + r * 3 + Math.round(it.u0 * 50)) % BOOK.length];
            if (along) faceV(it.u0 + (it.u1 - it.u0) * s0, it.u0 + (it.u1 - it.u0) * s1, it.v1 + 0.001, zb, top, col);
            else faceU(it.u1 + 0.001, it.v0 + (it.v1 - it.v0) * s0, it.v0 + (it.v1 - it.v0) * s1, zb, top, col);
          }
        }
      } });
      else if (it.k === 'sofa') draws.push({ d: depth(it.u1, it.v1) - 0.03, f: () => {
        lbox(it.u0, it.v0, it.u1, it.v1, Z0, Z0 + 1.8, it.c);
        lbox(it.u0, it.v1 - 0.03, it.u1, it.v1, Z0 + 1.8, Z0 + 3.4, it.c);
        lbox(it.u0, it.v0, it.u0 + 0.025, it.v1, Z0 + 1.8, Z0 + 2.6, it.c);
        lbox(it.u1 - 0.025, it.v0, it.u1, it.v1, Z0 + 1.8, Z0 + 2.6, it.c);
      } });
      else if (it.k === 'flamp') draws.push({ d: depth(it.u, it.v), f: () => {
        lbox(it.u - 0.012, it.v - 0.012, it.u + 0.012, it.v + 0.012, Z0, Z0 + 0.3, '#2f3a40');
        lbox(it.u - 0.003, it.v - 0.003, it.u + 0.003, it.v + 0.003, Z0, Z0 + 6, '#2f3a40');
        lbox(it.u - 0.025, it.v - 0.025, it.u + 0.025, it.v + 0.025, Z0 + 5.6, Z0 + 7, '#e8d9b8', evening > 0.3 ? '#ffd48a' : '#efe3c4');
      } });
      else if (it.k === 'plant') draws.push({ d: depth(it.u, it.v), f: () => {
        lbox(it.u - 0.02, it.v - 0.02, it.u + 0.02, it.v + 0.02, Z0, Z0 + 1.8, '#b5653f', '#7a5a3e');
        const [cx, cy] = P(it.u, it.v, Z0 + it.h), [bx, by] = P(it.u, it.v, Z0 + 1.8);
        ctx.strokeStyle = '#4a6a3a'; ctx.lineWidth = Math.max(0.6, 0.45 * rcam.z);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = '#3f7a45'; ctx.beginPath(); ctx.arc(cx, cy, 2.2 * rcam.z, 0, 7); ctx.fill();
        ctx.fillStyle = '#5a9a55'; ctx.beginPath(); ctx.arc(cx - 0.6 * rcam.z, cy - 0.8 * rcam.z, 1.4 * rcam.z, 0, 7); ctx.fill();
      } });
    }
    for (const c of crew) if (c.inside) draws.push({ d: c.px + c.py + 1, f: () => drawPerson(c, now) });
    draws.sort((a, b) => a.d - b.d);
    for (const it of draws) it.f();

    // Front walls cut at knee height so the room reads as a dollhouse, entrance gap on the y1 face
    const KW = Z0 + 2.4;
    const front = (u0, u1) => { faceV(u0, u1, 1, Z0, KW, '#b9b2a4'); quad(u0, 1, u1, 1.03, KW, '#efe9dc'); };
    front(0, 0.44); front(0.6, 1);
    faceU(1, 0, 1, Z0, KW, '#a39c8f'); quad(1, 0, 1.03, 1, KW, '#efe9dc');
    // Door frame posts and threshold at the entrance
    faceV(0.44, 0.6, 1.01, Z0, Z0 + 0.25, '#5a4632');
    for (const u of [0.44, 0.6]) faceV(u - 0.012, u + 0.012, 1.015, Z0, Z0 + 2.3 * MZ, '#3a3029');

    // Warm lamp pools on desks, reading tables and the lounge: soft by day, stronger in the evening
    {
      if (evening > 0) quad(0, 0, 1, 1, Z0 + 0.06, `rgba(20,26,44,${(0.22 * evening).toFixed(3)})`);
      const glow = 0.35 + 0.65 * evening;
      ctx.globalCompositeOperation = 'lighter';
      for (const it of room.items) {
        if (it.k !== 'desk' && !(it.k === 'table' && it.lamps) && it.k !== 'sofa') continue;
        const u = it.k === 'desk' ? it.u0 + 0.03 : (it.u0 + it.u1) / 2, v = it.k === 'desk' ? it.v0 + 0.04 : (it.v0 + it.v1) / 2;
        const [cx, cy] = P(u, v, Z0 + (it.k === 'sofa' ? 1 : DESK_Z));
        const r = (it.k === 'sofa' ? 16 : 12) * rcam.z, gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gr.addColorStop(0, `rgba(255,190,110,${(0.24 * glow).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
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
        if (g) { if (!preCutCam) preCutCam = { ...cam }; flyToTile(selectedTile[0], selectedTile[1], Math.max(cam.z, 3.4), true); }
      } else { crew = []; preCutCam = null; }
    }
    for (const a of crew) {
      if (a.desk) { a.px = a.ox; a.py = a.oy; continue; }                 // seated workers stay on their seat anchor
      if (a.door) { a.px = a.ox; a.py = a.oy; continue; } // stands beside the door
      const amp = a.inside ? 0.05 : 0.12;
      a.px = a.ox + Math.sin(now * 0.0006 + a.phase) * amp;
      a.py = a.oy + Math.cos(now * 0.0005 + a.phase * 1.7) * amp * 0.85;
    }
  }


  // ---------- quick account switch + app launcher (bottom bar) ----------
  const LAUNCH = [['google-slides', 'Slides'], ['google-docs', 'Docs'], ['google-sheets', 'Sheets'], ['google-drive', 'Drive'], ['gmail', 'Gmail'], ['google-calendar', 'Calendar'], ['seqta', 'SEQTA']];
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
      a.textContent = label; a.href = it.web || '#'; a.target = '_blank'; a.rel = 'noopener noreferrer'; warmUrl(it.web);
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
    try { localStorage.setItem('isocity-acct', String(globalAcct)); } catch (e) { /* ignore */ }
    syncAcctUI(); scheduleSave();
    if (selectedTile) renderInspect();
    audio.sfx('tap');
  };
  $('launchBtn').onclick = (e) => {
    e.stopPropagation();
    const open = $('launchPop').dataset.open !== 'true';
    $('launchPop').dataset.open = String(open);
    $('launchPop').inert = !open;
    $('launchBtn').setAttribute('aria-expanded', String(open));
    if (open) syncAcctUI();
  };
  addEventListener('pointerdown', (e) => {
    if ($('launchPop').dataset.open === 'true' && !$('launchPop').contains(e.target) && e.target !== $('launchBtn')) {
      $('launchPop').dataset.open = 'false'; $('launchPop').inert = true; $('launchBtn').setAttribute('aria-expanded', 'false');
    }
  });
  syncAcctUI();
  // Small API for workspaces.js (Workona-style spaces, command palette)
  window.ISOCITY_API = {
    allItems, getItem, notify, safeHref, warmUrl,
    focus: (id) => focusItemById(id),
    acctUrl: (url, la) => applyAccountToUrl(url, uIdx(la), la === 1 ? acctEmails.school : acctEmails.personal),
    acct: () => globalAcct,
    setLight: () => $('lightBtn').click(),
    setInset: (px) => { viewInset = Math.max(0, Math.round(px || 0)); center(true); },
  };


  // Read-only hook for visual regression checks; only present with ?debug in the URL.
  if (/[?&]debug\b/.test(location.search)) {
    window.__isocityDebug = {
      agents: () => ({ cars, walkers, boats, crew }),
      screenOf: (x, y, z = 0) => [px(x, y), py(x, y, z)],
      cam: () => ({ ...cam }),
      setCam: (x, y, z) => { camAnim = null; cam.x = x; cam.y = y; cam.z = z; },
      worldImage: () => worldCanvas, // the baked map layer (terrain, trees, buildings), for pixel comparisons
      rail: () => ({ lines: rail.lines.map((l) => ({ id: l.id, len: l.len, stops: l.stops.map((st) => [st.name, +st.s.toFixed(2)]) })), trains: rail.trains.map((t) => ({ li: t.li, s: +t.s.toFixed(2), dir: t.dir, v: +t.v.toFixed(2), state: t.state, at: t.at && t.at.name })), ferry: rail.ferry && { s: +rail.ferry.s.toFixed(2), state: rail.ferry.state } }),
      railPoint: (li, s) => { const p = rail.lines[li].raw(s); const [x, y] = rotC(p[0], p[1]); return [x, y, p[2]]; },
    };
  }

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
  setInterval(() => { if (document.hidden) return; const p = periodOf(hour); if ($('lightBtn').textContent !== p) $('lightBtn').textContent = p; }, 400);

  $('swapAcctBtn').setAttribute('aria-pressed', String(acctSwap));
  $('swapAcctBtn').onclick = () => {
    acctSwap = !acctSwap;
    try { localStorage.setItem('isocity-acct-swap', acctSwap ? '1' : '0'); } catch (e) { /* ignore */ }
    $('swapAcctBtn').setAttribute('aria-pressed', String(acctSwap));
    syncAcctUI();
    if (selectedTile) renderInspect();
    notify(acctSwap ? 'Personal now opens your 2nd Google sign-in (u/1), School your 1st (u/0).' : 'Personal opens your 1st Google sign-in (u/0), School your 2nd (u/1).', 3600);
    audio.sfx('tap');
  };

  // Manual Smooth mode: steady 30 fps and 1x resolution, regardless of what the automatic governor decides.
  const smoothButtons = () => [$('smoothBtn'), $('smoothBarBtn')].filter(Boolean);
  const syncSmoothUI = () => smoothButtons().forEach((b) => b.setAttribute('aria-pressed', String(perfForced)));
  syncSmoothUI();
  const toggleSmooth = () => {
    perfForced = !perfForced;
    try { localStorage.setItem('isocity-smooth', perfForced ? '1' : '0'); } catch (e) { /* ignore */ }
    syncSmoothUI();
    slowFrames = 0; intervalEma = 16.7;
    setPerfLevel(perfForced ? 2 : 0);
    notify(perfForced ? 'Smooth mode on: steady 30 fps, lighter graphics.' : 'Smooth mode off: full quality (auto-lowers if the screen struggles).', 2800);
    audio.sfx('tap');
  };
  smoothButtons().forEach((b) => { b.onclick = toggleSmooth; });

  // Google account emails: with these set, links pick the exact account whatever order you signed in.
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  $('acctEmailP').value = acctEmails.personal; $('acctEmailS').value = acctEmails.school;
  const saveEmails = () => {
    const p = $('acctEmailP').value.trim().toLowerCase(), q = $('acctEmailS').value.trim().toLowerCase();
    acctEmails = { personal: emailOk(p) ? p : '', school: emailOk(q) ? q : '' };
    try { localStorage.setItem('isocity-acct-emails', JSON.stringify(acctEmails)); } catch (e) { /* ignore */ }
    syncAcctUI();
    if (selectedTile) renderInspect();
    notify(acctEmails.personal || acctEmails.school ? 'Google accounts saved in this browser. Links now open the exact account.' : 'Google account emails cleared.', 3000);
  };
  $('acctEmailP').onchange = saveEmails; $('acctEmailS').onchange = saveEmails;

  // Register offline PWA service worker
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  resize();
  if (!load()) { starter(); applyNycTransfer(); }
  railInit();
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
  ['econPop', 'citiesPop', 'customPop', 'comparePop', 'helpPop', 'inspectCard', 'launchPop'].forEach((id) => {
    if ($(id) && $(id).dataset.open !== 'true') $(id).inert = true;
  });
  syncBodyPrefs();
  recompute();
  updateCountUI();
  center(false);
  fetchUserRepos(false);
  fetchLocalWeather();
  requestAnimationFrame(frame);
})();
