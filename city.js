(() => {
  const N = 32;
  const TW = 64, TH = 32;
  const SAVE_KEY = 'isocity-workspace-v4';
  const GITHUB_OWNER = 'Peterachss';

  const DEFAULT_REPOS = [
    { id: 'isocity', kind: 'github', name: 'isocity', lang: 'JavaScript', desc: 'Interactive isometric city workspace and live repository explorer.', web: 'https://isocity-mu.vercel.app', git: 'https://github.com/Peterachss/isocity' },
    { id: '3d-shirt-and-hoodie', kind: 'github', name: '3d-shirt-and-hoodie', lang: 'Python', desc: 'Interactive 3D Blender crewneck T-shirt and pullover hoodie studio.', web: 'https://peterachss.github.io/3d-shirt-and-hoodie/', git: 'https://github.com/Peterachss/3d-shirt-and-hoodie' },
    { id: 'finance-tracker-template', kind: 'github', name: 'finance-tracker-template', lang: 'TypeScript', desc: 'Spreadsheet-first personal finance tracker built with Next.js and Supabase.', web: 'https://finance-tracker-template.vercel.app', git: 'https://github.com/Peterachss/finance-tracker-template' },
    { id: 'finance-tracker', kind: 'github', name: 'finance-tracker', lang: 'JavaScript', desc: 'Personal finance tracker with a spreadsheet-first workflow.', web: 'https://finance-tracker-phi-ashen.vercel.app', git: 'https://github.com/Peterachss/finance-tracker', isPrivate: true },
    { id: 'maths-ia-explorer', kind: 'github', name: 'maths-ia-explorer', lang: 'TypeScript', desc: 'Interactive explorer for an IB Maths AA SL IA on income and life expectancy.', web: 'https://peterachss.github.io/maths-ia-explorer/', git: 'https://github.com/Peterachss/maths-ia-explorer' },
    { id: 'greenkeep', kind: 'github', name: 'greenkeep', lang: 'HTML', desc: 'Greenkeep notes web app.', web: 'https://peterachss.github.io/greenkeep/', git: 'https://github.com/Peterachss/greenkeep' },
    { id: 'cham-hq', kind: 'github', name: 'cham-hq', lang: 'JavaScript', desc: 'CHAM headquarters project hub.', web: 'https://peterachss.github.io/cham-hq/', git: 'https://github.com/Peterachss/cham-hq' },
    { id: 'cham-merch-designs', kind: 'github', name: 'cham-merch-designs', lang: 'HTML', desc: 'Hoodie and T-shirt design gallery.', web: 'https://peterachss.github.io/cham-merch-designs/', git: 'https://github.com/Peterachss/cham-merch-designs' },
    { id: 'cham-bracelet-plan', kind: 'github', name: 'cham-bracelet-plan', lang: 'HTML', desc: 'Fundraiser plan for friendship bracelet booth and lucky draw.', web: 'https://peterachss.github.io/cham-bracelet-plan/', git: 'https://github.com/Peterachss/cham-bracelet-plan' },
    { id: 'claude', kind: 'github', name: 'claude', lang: 'HTML', desc: 'Claude web notes and experiments.', web: 'https://peterachss.github.io/claude/', git: 'https://github.com/Peterachss/claude' },
    { id: 'co-bo-u', kind: 'github', name: 'co-bo-u', lang: 'HTML', desc: 'Co Bo U web project.', web: 'https://peterachss.github.io/co-bo-u/', git: 'https://github.com/Peterachss/co-bo-u' },
  ];

  const DEFAULT_GOOGLE_APPS = [
    {
      id: 'gmail', kind: 'google', name: 'Gmail', cat: 'Google',
      desc: 'Email inbox, threads, and compose workspace.',
      web: 'https://mail.google.com/mail/u/0/#inbox',
      alt: 'https://mail.google.com/mail/u/0/#inbox?compose=new', altLabel: 'Compose',
      shortcuts: [
        { label: 'Inbox', url: 'https://mail.google.com/mail/u/0/#inbox', sub: 'Primary mail feed' },
        { label: 'Compose message', url: 'https://mail.google.com/mail/u/0/#inbox?compose=new', sub: 'Write a new email' },
        { label: 'Starred', url: 'https://mail.google.com/mail/u/0/#starred', sub: 'Flagged conversations' },
        { label: 'Sent', url: 'https://mail.google.com/mail/u/0/#sent', sub: 'Sent archive' },
      ],
    },
    {
      id: 'google-chat', kind: 'google', name: 'Google Chat', cat: 'Google',
      desc: 'Direct messages, group chats, and shared team spaces.',
      web: 'https://chat.google.com/',
      alt: 'https://mail.google.com/chat/u/0/#chat/spaces', altLabel: 'Spaces',
      shortcuts: [
        { label: 'Chat Home', url: 'https://chat.google.com/', sub: 'Unread threads and DMs' },
        { label: 'Team Spaces', url: 'https://mail.google.com/chat/u/0/#chat/spaces', sub: 'Shared channels' },
      ],
    },
    {
      id: 'seqta', kind: 'google', name: 'SEQTA', cat: 'Study',
      desc: 'Timetable, courses, assessments, and notices. Click Edit to save your school SEQTA link.',
      web: 'https://learn.seqta.com.au/',
      alt: 'https://seqta.com.au/', altLabel: 'Portal info',
      shortcuts: [
        { label: 'SEQTA Learn', url: 'https://learn.seqta.com.au/', sub: 'Courses and assessments (customizable via Edit)' },
      ],
    },
    {
      id: 'google-slides', kind: 'google', name: 'Google Slides', cat: 'Google',
      desc: 'Presentations, class decks, and collaborative slide editing.',
      web: 'https://docs.google.com/presentation/u/0/',
      alt: 'https://docs.google.com/presentation/create', altLabel: 'New deck',
      shortcuts: [
        { label: 'All presentations', url: 'https://docs.google.com/presentation/u/0/', sub: 'Recent slide decks' },
        { label: 'Create blank deck', url: 'https://docs.google.com/presentation/create', sub: 'Start a fresh deck' },
        { label: 'Google Drive', url: 'https://drive.google.com/', sub: 'Folders and shared decks' },
      ],
    },
    {
      id: 'google-docs', kind: 'google', name: 'Google Docs', cat: 'Google',
      desc: 'Essays, coursework drafts, and collaborative notes.',
      web: 'https://docs.google.com/document/u/0/',
      alt: 'https://docs.google.com/document/create', altLabel: 'New doc',
      shortcuts: [
        { label: 'All documents', url: 'https://docs.google.com/document/u/0/', sub: 'Browse existing docs' },
        { label: 'Create blank document', url: 'https://docs.google.com/document/create', sub: 'Open an empty document' },
        { label: 'Google Drive', url: 'https://drive.google.com/', sub: 'Open Drive folders' },
      ],
    },
    {
      id: 'mybib', kind: 'google', name: 'MyBib', cat: 'Study',
      desc: 'Citation generator, bibliography folders, and formatted references.',
      web: 'https://www.mybib.com/app',
      alt: 'https://www.mybib.com/', altLabel: 'Cite tool',
      shortcuts: [
        { label: 'MyBib Projects', url: 'https://www.mybib.com/app', sub: 'Saved bibliographies and exports' },
        { label: 'Quick Citation Generator', url: 'https://www.mybib.com/', sub: 'Cite a URL, book, or journal' },
      ],
    },
    {
      id: 'google-calendar', kind: 'google', name: 'Google Calendar', cat: 'Google',
      desc: 'Schedule, classes, deadlines, and quick event planning.',
      web: 'https://calendar.google.com/calendar/u/0/r',
      alt: 'https://calendar.google.com/calendar/render?action=TEMPLATE', altLabel: 'New event',
      shortcuts: [
        { label: 'Calendar View', url: 'https://calendar.google.com/calendar/u/0/r', sub: 'Week and month grid' },
        { label: 'Create new event', url: 'https://calendar.google.com/calendar/render?action=TEMPLATE', sub: 'Add a class or reminder' },
        { label: 'Agenda list', url: 'https://calendar.google.com/calendar/u/0/r/agenda', sub: 'Upcoming schedule' },
      ],
    },
  ];

  // North District (y = 3..15): GitHub City
  const GITHUB_LANDMARKS = [
    { id: 'isocity',                  x: 8,  y: 4,  t: 'office',   lv: 3 },
    { id: 'finance-tracker-template', x: 15, y: 4,  t: 'office',   lv: 2 },
    { id: 'finance-tracker',          x: 21, y: 7,  t: 'apt',      lv: 2 },
    { id: '3d-shirt-and-hoodie',      x: 5,  y: 13, t: 'wheel',    lv: 1 },
    { id: 'maths-ia-explorer',        x: 4,  y: 8,  t: 'school',   lv: 1 },
    { id: 'greenkeep',                x: 10, y: 11, t: 'clinic',   lv: 1 },
    { id: 'cham-hq',                  x: 14, y: 13, t: 'plaza',    lv: 1 },
    { id: 'cham-merch-designs',       x: 8,  y: 12, t: 'shop',     lv: 2 },
    { id: 'cham-bracelet-plan',       x: 11, y: 15, t: 'shop',     lv: 1 },
    { id: 'claude',                   x: 17, y: 15, t: 'windmill', lv: 1 },
    { id: 'co-bo-u',                  x: 23, y: 12, t: 'house',    lv: 2 },
  ];

  // South Side of the Bridges (y = 20..29): Google & Study District
  const GOOGLE_LANDMARKS = [
    { id: 'gmail',           x: 10, y: 22, t: 'office', lv: 3 },
    { id: 'google-chat',     x: 16, y: 22, t: 'apt',    lv: 2 },
    { id: 'seqta',           x: 7,  y: 24, t: 'school', lv: 1 },
    { id: 'google-docs',     x: 14, y: 24, t: 'clinic', lv: 1 },
    { id: 'google-slides',   x: 21, y: 24, t: 'wheel',  lv: 1 },
    { id: 'mybib',           x: 11, y: 27, t: 'shop',   lv: 2 },
    { id: 'google-calendar', x: 17, y: 27, t: 'plaza',  lv: 1 },
  ];

  const SCENIC_PARKS = [
    // North district
    [10, 6], [17, 11], [9, 15], [20, 15], [5, 6], [24, 9], [15, 6],
    // South bank waterfront & avenues across the bridge
    [9, 20], [14, 20], [22, 20], [13, 27], [23, 27], [6, 22], [20, 27],
  ];

  const SPARE_NORTH = [
    [21, 11, 'shop', 2], [16, 9, 'apt', 2], [5, 11, 'house', 2],
    [24, 6, 'clinic', 1], [9, 7, 'house', 2], [20, 4, 'shop', 1],
    [26, 11, 'house', 2], [23, 15, 'school', 1],
  ];
  const SPARE_SOUTH = [
    [23, 22, 'shop', 2], [24, 24, 'house', 2], [15, 29, 'house', 2],
    [7, 27, 'clinic', 1], [21, 27, 'windmill', 1], [9, 29, 'apt', 1],
    [26, 24, 'office', 1], [6, 26, 'house', 1],
  ];

  const THEMES = {
    autumn: {
      skyNight: '#07110c', skyDay: '#1f3b2a', forestA: '#2a4a28', forestB: '#274524',
      grassA: '#7da663', grassB: '#74a05a', park: '#86b65f', waterA: '#295b60', waterB: '#26565b',
      crowns: [['#2c5a2b', '#3f7a35'], ['#3a6b2e', '#5a8f3c'], ['#c98a14', '#e8b832'], ['#d9a21f', '#f0c64a'], ['#b8601a', '#e08a2c'], ['#8a9a2a', '#b7b93a']],
    },
    alpine: {
      skyNight: '#061014', skyDay: '#183238', forestA: '#1d3c2e', forestB: '#1a3629',
      grassA: '#648f6e', grassB: '#5c8566', park: '#76a47f', waterA: '#225468', waterB: '#1f4d60',
      crowns: [['#1e4a35', '#2f6b4e'], ['#25583f', '#387b59'], ['#2e664b', '#478b68'], ['#1a3d2e', '#2b5944'], ['#417556', '#5e9674'], ['#346348', '#4d8262']],
    },
    slate: {
      skyNight: '#0b0f12', skyDay: '#1e272b', forestA: '#24312b', forestB: '#212c27',
      grassA: '#6c8070', grassB: '#657869', park: '#7c937f', waterA: '#2f5360', waterB: '#2b4d59',
      crowns: [['#374f43', '#4f6d5e'], ['#4c6256', '#678072'], ['#9e894c', '#bda562'], ['#435a4f', '#5d776a'], ['#677867', '#849684'], ['#2d4137', '#425b4f']],
    },
    sakura: {
      skyNight: '#0a1210', skyDay: '#223828', forestA: '#2a4629', forestB: '#274126',
      grassA: '#7fa869', grassB: '#77a061', park: '#8fbd76', waterA: '#2d666e', waterB: '#295e66',
      crowns: [['#d98498', '#f5bcc9'], ['#e29aab', '#f8cad5'], ['#3c6e38', '#59914d'], ['#cf798e', '#eea8b8'], ['#588443', '#77a65c'], ['#7a9c56', '#9cc074']],
    },
  };

  const TYPES = {
    road:     { name: 'Avenue',        color: '#3b3f44' },
    house:    { name: 'Villa',         color: '#d9a273', h: 22, inset: 0.2, grow: true },
    apt:      { name: 'Vault Tower',   color: '#c98a8a', h: 72, inset: 0.12, grow: true },
    shop:     { name: 'Studio',        color: '#e0c25b', h: 28, inset: 0.1, grow: true },
    office:   { name: 'Tower',         color: '#7fa6c9', h: 118, inset: 0.1, grow: true },
    park:     { name: 'Park',          color: '#8cbf5c' },
    plaza:    { name: 'Civic Plaza',   color: '#c4b59d' },
    clinic:   { name: 'Terrace Hub',   color: '#d95f59', h: 30, inset: 0.12 },
    school:   { name: 'Research Hall', color: '#5f8c7a', h: 34, inset: 0.1 },
    windmill: { name: 'Lab Mill',      color: '#7ea89b', h: 48, inset: 0.24 },
    wheel:    { name: 'Wheel Studio',  color: '#d67e49', h: 78, inset: 0.12 },
    forest:   { name: 'Forest',        color: '#d9a21f' },
    water:    { name: 'River',         color: '#3b7378' },
    bridge:   { name: 'Bridge',        color: '#8e8372' },
  };
  const LVL_MULT = [1, 1, 1.5, 2.2];

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);

  let edition = 'all'; // 'github' | 'google' | 'all'
  let themeId = 'autumn';
  let showAgents = true;
  let showLabels = true;

  const REPOS = DEFAULT_REPOS.map((r) => ({ ...r }));
  const GOOGLE_APPS = DEFAULT_GOOGLE_APPS.map((a) => ({ ...a, shortcuts: a.shortcuts.map((s) => ({ ...s })) }));
  const repoMap = new Map(REPOS.map((r) => [r.id, r]));
  const googleMap = new Map(GOOGLE_APPS.map((a) => [a.id, a]));
  const customItems = [];
  const overrides = {};
  const bookmarks = {};
  const repoCache = new Map();

  let grid, levels, pins;
  let cam = { x: 0, y: 0, z: 1 };
  let camAnim = null;
  let hover = null, hoveredLabel = null, selectedTile = null;
  let showHeat = true;
  let activeTab = 'overview';
  let activeFilter = 'all';
  let cars = [], walkers = [], boats = [], bots = [], wheelsList = [], millsList = [], beaconsList = [], housesList = [], waterCells = [];
  let labelHits = [];
  let hour = 17.4;
  let dpr = 1, W = 0, H = 0;

  const LIGHT_MODES = [
    { label: 'Dusk', hour: 17.4 },
    { label: 'Day', hour: 13.0 },
    { label: 'Night', hour: 22.4 },
  ];
  let lightIdx = 0;

  const BOT_COLORS = ['#0f766e', '#0284c7', '#d97706'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const isRoad = (t) => t === 'road' || t === 'bridge';
  const isWater = (t) => t === 'water' || t === 'bridge';
  const isBuilding = (t) => !!t && t !== 'road' && t !== 'bridge' && t !== 'water' && t !== 'forest';
  const makeLevels = () => Array.from({ length: N }, () => Array(N).fill(1));
  const makePins = () => Array.from({ length: N }, () => Array(N).fill(null));
  const curTheme = () => THEMES[themeId] || THEMES.autumn;

  function allItems() {
    return [...REPOS, ...GOOGLE_APPS, ...customItems].map((it) => ({ ...it, ...(overrides[it.id] || {}) }));
  }
  function activeCatalog() {
    const list = allItems();
    return edition === 'all' ? list : list.filter((it) => it.kind === edition);
  }
  function getItem(id) {
    const base = repoMap.get(id) || googleMap.get(id) || customItems.find((c) => c.id === id) || REPOS[0];
    return { ...base, ...(overrides[base.id] || {}) };
  }

  let rctx = ctx, rcam = cam;
  let worldDirty = true;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);

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
  const smokes = [];

  // ---------- sound ----------
  let soundOn = false, audioCtx = null, lastSfx = 0;
  function sfx(kind) {
    if (!soundOn) return;
    const now = performance.now();
    if (now - lastSfx < 48) return;
    lastSfx = now;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(kind === 'select' ? 320 : 210, t);
      osc.frequency.exponentialRampToValueAtTime(kind === 'select' ? 440 : 140, t + 0.045);
      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.start(t); osc.stop(t + 0.055);
    } catch (e) { /* audio blocked */ }
  }

  // ---------- two-sided city builder & persistence ----------
  function starter() {
    grid = Array.from({ length: N }, () => Array(N).fill('forest'));
    levels = makeLevels();
    pins = makePins();
    selectedTile = null;

    const set = (x, y, t, lv = 1, id = null) => {
      if (!inb(x, y)) return;
      grid[x][y] = t; levels[x][y] = lv; pins[x][y] = id;
    };

    // Scenic river dividing North (GitHub) and South (Google & Study)
    let ry = 18;
    for (let rx = 0; rx < N; rx++) {
      set(rx, ry, 'water');
      set(rx, ry + 1, 'water');
      if (rx % 7 === 4 && ry > 16) { ry--; set(rx, ry, 'water'); }
    }

    // North avenues (GitHub district)
    for (let x = 4; x <= 26; x++) { set(x, 5, 'road'); set(x, 10, 'road'); set(x, 14, 'road'); }
    for (let y = 4; y <= 15; y++) set(6, y, 'road');

    // South avenues (Other side of the bridges: Google & Study district)
    for (let x = 5; x <= 26; x++) { set(x, 21, 'road'); set(x, 25, 'road'); }
    for (let x = 7; x <= 25; x++) set(x, 28, 'road');
    for (let y = 21; y <= 28; y++) set(8, y, 'road');

    // Three North-South cross-river bridges connecting both districts
    for (const bx of [12, 19, 25]) {
      for (let y = 4; y <= 28; y++) set(bx, y, isWater(grid[bx][y]) ? 'bridge' : 'road');
    }

    // Parks across both banks
    for (const [px0, py0] of SCENIC_PARKS) set(px0, py0, 'park', 1, null);

    // Populate GitHub landmarks (North) and Google & Study landmarks (South)
    for (const lm of GITHUB_LANDMARKS) set(lm.x, lm.y, lm.t, lm.lv, lm.id);
    for (const lm of GOOGLE_LANDMARKS) set(lm.x, lm.y, lm.t, lm.lv, lm.id);

    assignUnpinnedItems();
  }

  function findItemTile(id) {
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      if (pins[x][y] === id) return [x, y];
    }
    return null;
  }

  function findFreeLot(kind, preferType = null) {
    const pool = kind === 'google' ? SPARE_SOUTH : SPARE_NORTH;
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

  let saveTimer = 0;
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        edition, themeId, showAgents, showLabels, hour,
        customItems, overrides, bookmarks, grid, levels, pins,
      }));
    } catch (e) { /* storage unavailable */ }
  }
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(saveNow, 400);
  }
  addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
  addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

  function syncLightUI() {
    const m = LIGHT_MODES[lightIdx] || LIGHT_MODES[0];
    $('lightBtn').textContent = m.label;
    $('lightBtn').setAttribute('aria-label', `Lighting mode: ${m.label}. Click to cycle.`);
  }

  function syncThemeUI() {
    document.querySelectorAll('.theme-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.theme === themeId));
    });
    document.body.style.background = curTheme().skyDay;
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

    edition = 'all'; // single Full City view
    themeId = THEMES[d.themeId] ? d.themeId : 'autumn';
    showAgents = d.showAgents !== false;
    showLabels = d.showLabels !== false;
    hour = Number.isFinite(d.hour) ? d.hour : 17.4;
    lightIdx = LIGHT_MODES.findIndex((m) => Math.abs(m.hour - hour) < 1);
    if (lightIdx < 0) lightIdx = 0;

    if (Array.isArray(d.customItems)) customItems.splice(0, customItems.length, ...d.customItems);
    if (d.overrides && typeof d.overrides === 'object') Object.assign(overrides, d.overrides);
    if (d.bookmarks && typeof d.bookmarks === 'object') Object.assign(bookmarks, d.bookmarks);

    assignUnpinnedItems();
    selectedTile = null;
    $('labelsBtn').setAttribute('aria-pressed', String(showLabels));
    $('agentsBtn').setAttribute('aria-pressed', String(showAgents));
    syncLightUI();
    syncThemeUI();
    rebuildCrownSprites();
    return true;
  }

  function load() {
    try { return applySaveData(JSON.parse(localStorage.getItem(SAVE_KEY))); }
    catch (e) { return false; }
  }

  // ---------- agents ----------
  const NB = [[1,0],[-1,0],[0,1],[0,-1]];

  function recompute() {
    wheelsList = [];
    millsList = [];
    beaconsList = [];
    housesList = [];
    waterCells = [];

    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      const lv = levels[x][y] || 1;
      if (t === 'water') waterCells.push([x, y]);
      else if (t === 'windmill') millsList.push([x, y]);
      else if (t === 'wheel') wheelsList.push([x, y]);
      else if (t === 'office') beaconsList.push([x, y, bldHeight(t, lv) + (lv >= 3 ? 20 : 12)]);
      else if (t === 'house') housesList.push([x, y, bldHeight(t, lv) + 12]);
    }
    syncAgents();
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
    if (!showAgents) { cars.length = 0; walkers.length = 0; bots.length = 0; boats.length = 0; return; }
    cars = cars.filter((c) => isRoad(grid[c.tx]?.[c.ty]) && isRoad(grid[c.fx]?.[c.fy]));
    walkers = walkers.filter((w) => isRoad(grid[w.tx]?.[w.ty]) && isRoad(grid[w.fx]?.[w.fy]));
    bots = bots.filter((b) => isRoad(grid[b.tx]?.[b.ty]) && isRoad(grid[b.fx]?.[b.fy]));
    boats = boats.filter((b) => isWater(grid[b.tx]?.[b.ty]) && isWater(grid[b.fx]?.[b.fy]));

    const r = roadTiles();
    if (!r.length) { cars.length = 0; walkers.length = 0; bots.length = 0; }
    else {
      const wantCars = Math.min(32, Math.floor(r.length / 4));
      while (cars.length < wantCars) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        cars.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.85, 1.5),
          color: ['#c0463a', '#2f5d8a', '#e6e2d6', '#d89a2b', '#3d3f45', '#4f8f6a'][Math.floor(Math.random() * 6)] });
      }
      if (cars.length > wantCars) cars.length = wantCars;

      const wantWalkers = Math.min(18, Math.floor(r.length / 6));
      while (walkers.length < wantWalkers) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        walkers.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.28, 0.45),
          color: ['#e6ded0', '#c95d43', '#3b6978', '#d4a23a', '#5b7a52'][Math.floor(Math.random() * 5)] });
      }
      if (walkers.length > wantWalkers) walkers.length = wantWalkers;

      const wantBots = 18;
      while (bots.length < wantBots) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        bots.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.45, 0.78),
          phase: Math.random() * 6.28, color: BOT_COLORS[bots.length % BOT_COLORS.length] });
      }
      if (bots.length > wantBots) bots.length = wantBots;
    }

    const w = waterTiles();
    const wantBoats = Math.min(4, Math.floor(w.length / 14));
    while (boats.length < wantBoats) {
      const [x, y] = w[Math.floor(Math.random() * w.length)];
      boats.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.32, 0.5),
        color: ['#b35a38', '#d8cbb5', '#3d6e70', '#c48f36'][Math.floor(Math.random() * 4)] });
    }
    if (boats.length > wantBoats) boats.length = wantBoats;
  }

  function stepList(list, dt, passable = isRoad) {
    for (const c of list) {
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
  function flyToTile(x, y, targetZ = null, withDrawer = true) {
    const tz = targetZ || Math.max(cam.z, W >= 760 ? 1.02 : 0.88);
    const screenOffsetX = (withDrawer && W >= 760) ? -150 : 0;
    const screenCenterY = (withDrawer && W < 760) ? H * 0.34 : H * 0.54;
    const tx = W / 2 + screenOffsetX - ((x + 0.5) - (y + 0.5)) * (TW / 2) * tz;
    const ty = screenCenterY - ((x + 0.5) + (y + 0.5)) * (TH / 2) * tz + 28 * tz;
    if (reduceMotion) { cam.x = tx; cam.y = ty; cam.z = tz; camAnim = null; return; }
    camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: performance.now(), dur: 400 };
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
    const sx = Math.min(0.65, h * 0.0065), sy = Math.min(0.32, h * 0.003);
    poly4(px(x1, y0), py(x1, y0, 0), px(x1 + sx, y0 + sy), py(x1 + sx, y0 + sy, 0), px(x1 + sx, y1 + sy), py(x1 + sx, y1 + sy, 0), px(x0 + sx, y1 + sy), py(x0 + sx, y1 + sy, 0), 'rgba(10, 18, 12, 0.22)');
    poly4(px(x0, y1), py(x0, y1, 0), px(x1, y1), py(x1, y1, 0), px(x1 + sx, y1 + sy), py(x1 + sx, y1 + sy, 0), px(x0 + sx, y1 + sy), py(x0 + sx, y1 + sy, 0), 'rgba(10, 18, 12, 0.22)');
  }
  function box(x0, y0, x1, y1, z0, z1, color, L, opts = {}) {
    poly4(px(x0, y1), py(x0, y1, z0), px(x1, y1), py(x1, y1, z0), px(x1, y1), py(x1, y1, z1), px(x0, y1), py(x0, y1, z1), shade(color, 0.82, L));
    poly4(px(x1, y0), py(x1, y0, z0), px(x1, y1), py(x1, y1, z0), px(x1, y1), py(x1, y1, z1), px(x1, y0), py(x1, y0, z1), shade(color, 0.64, L));
    quadZ(x0, y0, x1, y1, z1, shade(opts.roof || color, 1.05, L));
    if (opts.windows) windows(x0, y0, x1, y1, z0, z1, L, opts.windows, opts.glass);
  }
  function windows(x0, y0, x1, y1, z0, z1, L, seed, glass = false) {
    const rows = Math.max(1, Math.floor((z1 - z0) / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const night = 1 - L;
    const dx = x1 - x0, dy = y1 - y0;
    const darkL = shade(glass ? '#486d8a' : '#27333f', 1, L);
    const darkR = shade(glass ? '#37566f' : '#1f2a35', 1, L);
    for (let r = 0; r < rows; r++) {
      const zz0 = z0 + 6 + r * 14, zz1 = zz0 + (glass ? 8 : 7);
      for (let c = 0; c < cols; c++) {
        const lit = night > 0.35 && ((seed * 31 + r * 17 + c * 13) % 7) < 4;
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
        rctx.fillStyle = 'rgba(255,214,130,0.34)';
        rctx.beginPath(); rctx.arc(ax, ay, 18 * rcam.z, 0, 7); rctx.fill();
      }
      return;
    }
    if (t === 'plaza') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 11);
      rctx.fillStyle = 'rgba(255,214,130,0.45)';
      rctx.beginPath(); rctx.arc(ax, ay, 24 * rcam.z, 0, 7); rctx.fill();
      return;
    }
    if (t === 'clinic') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 31);
      rctx.fillStyle = 'rgba(235, 95, 85, 0.35)';
      rctx.beginPath(); rctx.arc(ax, ay, 14 * rcam.z, 0, 7); rctx.fill();
    }
    if (t === 'wheel') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 42);
      rctx.fillStyle = 'rgba(255, 200, 115, 0.25)';
      rctx.beginPath(); rctx.arc(ax, ay, 34 * rcam.z, 0, 7); rctx.fill();
      return;
    }
    if (t === 'windmill') return;
    const h = bldHeight(t, levels[x][y] || 1);
    if (!h) return;
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

  function drawWater(x, y, L) {
    const th = curTheme();
    quadZ(x, y, x + 1, y + 1, -5, shade((x + y) % 2 ? th.waterA : th.waterB, 1, L));
    if ((x * 3 + y * 5) % 4 === 0) {
      poly4(px(x + 0.2, y + 0.35), py(x + 0.2, y + 0.35, -5), px(x + 0.75, y + 0.35), py(x + 0.75, y + 0.35, -5),
        px(x + 0.85, y + 0.47), py(x + 0.85, y + 0.47, -5), px(x + 0.3, y + 0.47), py(x + 0.3, y + 0.47, -5), shade('#3c7b80', 1, L));
    }
    if (inb(x - 1, y) && !isWater(grid[x - 1][y])) poly4(px(x, y), py(x, y, 0), px(x, y + 1), py(x, y + 1, 0), px(x, y + 1), py(x, y + 1, -5), px(x, y), py(x, y, -5), shade('#5b4c39', 1, L));
    if (inb(x, y - 1) && !isWater(grid[x][y - 1])) poly4(px(x, y), py(x, y, 0), px(x + 1, y), py(x + 1, y, 0), px(x + 1, y), py(x + 1, y, -5), px(x, y), py(x, y, -5), shade('#6b5a44', 1, L));
  }

  function drawRoad(x, y, L, bridge = false, skipWater = false) {
    const z = bridge ? 2 : 0;
    if (bridge) {
      if (!skipWater) drawWater(x, y, L);
      box(x + 0.12, y + 0.12, x + 0.24, y + 0.24, -5, 0, '#5a4e3f', L);
      box(x + 0.76, y + 0.76, x + 0.88, y + 0.88, -5, 0, '#5a4e3f', L);
      box(x + 0.05, y + 0.05, x + 0.95, y + 0.95, -1, z, '#8c806e', L, { roof: '#525961' });
    } else {
      quadZ(x, y, x + 1, y + 1, 0, shade('#9c9586', 1, L));
      const nX = inb(x - 1, y) && isRoad(grid[x - 1][y]) ? 0 : 0.09;
      const pX = inb(x + 1, y) && isRoad(grid[x + 1][y]) ? 1 : 0.91;
      const nY = inb(x, y - 1) && isRoad(grid[x][y - 1]) ? 0 : 0.09;
      const pY = inb(x, y + 1) && isRoad(grid[x][y + 1]) ? 1 : 0.91;
      quadZ(x + nX, y + nY, x + pX, y + pY, 0.2, shade('#454c54', 1, L));
    }
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
    if ((x + y) % 3 === 0) {
      const lx = px(x + 0.14, y + 0.14), ly0 = py(x + 0.14, y + 0.14, z), ly1 = py(x + 0.14, y + 0.14, z + 8);
      rctx.strokeStyle = shade('#2e3338', 1, L);
      rctx.lineWidth = Math.max(1, 1.3 * rcam.z);
      rctx.beginPath(); rctx.moveTo(lx, ly0); rctx.lineTo(lx, ly1); rctx.stroke();
      rctx.fillStyle = shade('#f7dfa0', 1, L);
      rctx.beginPath(); rctx.arc(lx, ly1, 1.8 * rcam.z, 0, 7); rctx.fill();
    }
  }

  const SPR_W = 36, SPR_H = 42, SPR_CX = 16, SPR_CY = 14, SPR_S = 2;
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
    const ang = reduceMotion ? 0.4 : now * 0.00055;
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
    const ang = reduceMotion ? 0.3 : now * 0.002;
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

    const d = TYPES[t];
    const i = d.inset;
    const lv = levels[x][y] || 1;
    const seed = x * 11 + y * 5;
    const red = REDS[seed % REDS.length];
    const wall = t === 'house' ? WALLS[seed % WALLS.length]
      : t === 'clinic' ? '#f2efe8'
      : t === 'school' ? '#c87c5d'
      : d.color;
    const roof = t === 'house' ? red
      : t === 'apt' ? '#a2432f'
      : t === 'shop' ? red
      : t === 'clinic' ? '#e5dfd3'
      : t === 'school' ? '#4a6b68'
      : '#4b6c8a';
    const H = Math.max(1, bldHeight(t, lv));
    if (!skipGround) castShadow(x + i, y + i, x + 1 - i, y + 1 - i, H);
    box(x + i, y + i, x + 1 - i, y + 1 - i, 0, H, wall, L, { roof, windows: seed, glass: t === 'office' });

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
    }
    if (t === 'office') {
      const sx = px(x + 0.5, y + 0.5), sy0 = py(x + 0.5, y + 0.5, H + (lv >= 3 ? 12 : 7)), sy1 = py(x + 0.5, y + 0.5, H + (lv >= 3 ? 22 : 14));
      rctx.strokeStyle = shade('#9cb3c9', 1, L);
      rctx.lineWidth = Math.max(1, 1.4 * rcam.z);
      rctx.beginPath(); rctx.moveTo(sx, sy0); rctx.lineTo(sx, sy1); rctx.stroke();
    }
  }

  function drawCar(c, L, headlightsOnly = false) {
    const s = 0.12;
    const dx = c.tx - c.fx, dy = c.ty - c.fy;
    const ox = -dy * 0.16, oy = dx * 0.16;
    const x = c.px + 0.5 + ox, y = c.py + 0.5 + oy;
    const z0 = grid[Math.round(c.px)]?.[Math.round(c.py)] === 'bridge' ? 2 : 0;
    if (!headlightsOnly) {
      const lx = dx ? 0.16 : s, ly = dy ? 0.16 : s;
      box(x - lx, y - ly, x + lx, y + ly, z0, z0 + 7, c.color, L);
    } else if (L < 0.5) {
      const hx = px(x + dx * 0.2, y + dy * 0.2), hy = py(x + dx * 0.2, y + dy * 0.2, z0 + 4);
      rctx.fillStyle = 'rgba(255,230,160,0.55)';
      rctx.beginPath(); rctx.arc(hx, hy, 7 * rcam.z, 0, 7); rctx.fill();
    }
  }

  function drawWalker(w) {
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
  }

  function drawBot(b, now, orbit = false) {
    let x, y, z0 = 0;
    if (orbit) {
      x = b.px; y = b.py;
    } else {
      const dx = b.tx - b.fx, dy = b.ty - b.fy;
      x = b.px + 0.5 + dy * 0.34;
      y = b.py + 0.5 - dx * 0.34;
      z0 = grid[Math.round(b.px)]?.[Math.round(b.py)] === 'bridge' ? 2 : 0;
    }
    const hoverZ = reduceMotion ? 1.5 : 2 + Math.sin(now * 0.008 + (b.phase || 0)) * 1.4;
    const sx = px(x, y), sy = py(x, y, z0 + hoverZ);
    const sz = rcam.z * (orbit ? 1.25 : 1);
    rctx.fillStyle = 'rgba(8, 16, 18, 0.25)';
    rctx.beginPath();
    rctx.ellipse(sx, py(x, y, z0), 2.4 * sz, 1.2 * sz, 0, 0, Math.PI * 2);
    rctx.fill();
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
  }

  function drawBoat(b, L) {
    const dx = b.tx - b.fx, dy = b.ty - b.fy;
    const x = b.px + 0.5, y = b.py + 0.5;
    const lx = dx ? 0.22 : 0.1, ly = dy ? 0.22 : 0.1;
    box(x - lx, y - ly, x + lx, y + ly, -5, -1, b.color, L, { roof: '#efe7d6' });
    box(x - 0.06, y - 0.06, x + 0.06, y + 0.06, -1, 3, '#f2ece0', L);
  }

  // ---------- offscreen world & night light caches ----------
  const PAD_X = 64, OY = 220;
  const OX = N * (TW / 2) + PAD_X;
  const WW = N * TW + PAD_X * 2;
  const WH = OY + N * TH + 48;
  const WS = 1.5;

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
        drawTileNight(x, y, grid[x][y]);
      }
    }
    warm = savedW;
    worldDirty = false;
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

  // Activity heat: glow under each building based on how recently it was pushed to.
  function heatOf(repo) {
    const iso = repo.meta && repo.meta.pushedAt || repo.commits?.[0]?.commit?.author?.date;
    if (!iso) return 0;
    const days = (Date.now() - new Date(iso).getTime()) / 864e5;
    if (days < 1) return 1;
    if (days < 7) return 0.7;
    if (days < 30) return 0.4;
    if (days < 90) return 0.2;
    return 0;
  }

  function drawHeat(now) {
    if (!showHeat) return;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const id = pins[x][y];
      if (!id || !isBuilding(grid[x][y])) continue;
      const item = getItem(id);
      if (!item || item.kind !== 'github') continue;
      const h = heatOf(item);
      if (h <= 0) continue;
      const cx = px(x + 0.5, y + 0.5), cy = py(x + 0.5, y + 0.5);
      if (cx < -120 || cx > W + 120 || cy < -80 || cy > H + 80) continue;
      const pulse = 0.85 + 0.15 * Math.sin(now * 0.003 + x * 1.7 + y);
      const rad = (TW * 0.75 + h * TW * 0.5) * rcam.z * pulse;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const col = h >= 0.7 ? '255,140,40' : h >= 0.4 ? '240,200,70' : '94,242,214';
      g.addColorStop(0, `rgba(${col},${(0.5 * h + 0.1).toFixed(2)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(1, 0.5); ctx.translate(-cx, -cy);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  function drawMapLabels() {
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
      if (edition !== 'all' && item.kind !== edition && !isSel && !isHov) continue;
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

      const label = it.item.name;
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
      const dotCol = active ? '#5ef2d6' : it.item.isPrivate ? '#d9a21f' : it.item.kind === 'google' ? '#0284c7' : '#0f766e';
      ctx.fillStyle = 'rgba(12, 20, 16, 0.22)';
      ctx.beginPath(); ctx.roundRect(rx, ry + 2, rw, rh, 99); ctx.fill();

      ctx.fillStyle = active ? '#0f766e' : 'rgba(244, 241, 234, 0.96)';
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 99); ctx.fill();

      ctx.strokeStyle = active ? '#0a5c55' : 'rgba(29, 35, 32, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.strokeStyle = active ? '#0f766e' : 'rgba(244, 241, 234, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(ax, ry + rh); ctx.lineTo(ax, ay + 2); ctx.stroke();

      ctx.fillStyle = dotCol;
      ctx.beginPath(); ctx.arc(rx + 10, ry + rh / 2, 3.3, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = active ? '#f4fbf9' : '#1d2320';
      ctx.textAlign = 'left';
      ctx.fillText(label, rx + 17, ry + rh / 2 + 0.5);
    }
  }

  function draw(now, dt) {
    const L = daylight(hour);
    warm = Math.max(0, 1 - Math.abs(hour - 17.6) / 2.2, 1 - Math.abs(hour - 6.4) / 1.6);

    if (worldDirty) buildWorld();

    const th = curTheme();
    rctx = ctx;
    rcam = cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = mix(th.skyNight, th.skyDay, L);
    ctx.fillRect(0, 0, W, H);

    if (L < 0.45) {
      const sa = (0.45 - L) * 1.8;
      ctx.fillStyle = '#e7ecff';
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        ctx.globalAlpha = sa * (0.45 + 0.55 * Math.sin(now * 0.002 + st.phase));
        ctx.fillRect(st.x * W, st.y * H * 0.6, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(worldCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);

    if (!reduceMotion && waterCells.length && L > 0.25) {
      ctx.fillStyle = `rgba(195, 240, 238, ${(L * 0.32).toFixed(2)})`;
      const step = Math.max(1, Math.floor(waterCells.length / 16));
      const t = now * 0.002;
      for (let i = 0; i < waterCells.length; i += step) {
        const [wx, wy] = waterCells[i];
        if (Math.sin(t + wx * 2.1 + wy * 3.7) < 0.55) continue;
        const sx = px(wx + 0.5, wy + 0.5), sy = py(wx + 0.5, wy + 0.5, -5);
        if (sx >= 0 && sx <= W && sy >= 0 && sy <= H) ctx.fillRect(sx, sy, 4 * cam.z, 1.5 * cam.z);
      }
    }

    seen.fill(0);
    ov.length = 0;

    for (let i = 0; i < wheelsList.length; i++) {
      const [wx, wy] = wheelsList[i];
      ov.push({ k: 4, s: wx + wy + 0.1, x: wx, y: wy });
    }
    for (let i = 0; i < millsList.length; i++) {
      const [mx, my] = millsList[i];
      ov.push({ k: 5, s: mx + my + 0.1, x: mx, y: my });
    }

    if (showAgents) {
      for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        const cx0 = px(c.px + 0.5, c.py + 0.5), cy0 = py(c.px + 0.5, c.py + 0.5);
        if (cx0 < -40 || cx0 > W + 40 || cy0 < -40 || cy0 > H + 40) continue;
        ov.push({ k: 1, s: c.px + c.py, c });
        addOccluders(Math.floor(c.px), Math.floor(c.py));
      }
      for (let i = 0; i < walkers.length; i++) {
        const w = walkers[i];
        const wx0 = px(w.px + 0.5, w.py + 0.5), wy0 = py(w.px + 0.5, w.py + 0.5);
        if (wx0 < -30 || wx0 > W + 30 || wy0 < -30 || wy0 > H + 30) continue;
        ov.push({ k: 2, s: w.px + w.py, w });
        addOccluders(Math.floor(w.px), Math.floor(w.py));
      }
      for (let i = 0; i < bots.length; i++) {
        const b = bots[i];
        const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
        if (bx0 < -30 || bx0 > W + 30 || by0 < -30 || by0 > H + 30) continue;
        ov.push({ k: 6, s: b.px + b.py, b });
        addOccluders(Math.floor(b.px), Math.floor(b.py));
      }
      for (let i = 0; i < boats.length; i++) {
        const b = boats[i];
        const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
        if (bx0 < -40 || bx0 > W + 40 || by0 < -40 || by0 > H + 40) continue;
        ov.push({ k: 3, s: b.px + b.py, b });
        const rx = Math.round(b.px), ry = Math.round(b.py);
        if (inb(rx, ry) && grid[rx][ry] === 'bridge' && !seen[rx * N + ry]) {
          seen[rx * N + ry] = 1;
          ov.push({ k: 0, s: rx + ry + 1.1, x: rx, y: ry, t: 'bridge' });
        }
        addOccluders(Math.floor(b.px), Math.floor(b.py));
      }
    }

    if (selectedTile) {
      const [sx, sy] = selectedTile;
      const st = grid[sx]?.[sy];
      if (isBuilding(st)) {
        if (!seen[sx * N + sy]) {
          seen[sx * N + sy] = 1;
          ov.push({ k: 0, s: sx + sy, x: sx, y: sy, t: st });
        }
        if (showAgents) {
          for (let i = 0; i < 3; i++) {
            const ang = (reduceMotion ? 0.6 : now * 0.0022) + i * 2.0944;
            const bx = sx + 0.5 + Math.cos(ang) * 0.58;
            const by = sy + 0.5 + Math.sin(ang) * 0.58;
            ov.push({ k: 7, s: bx + by, b: { px: bx, py: by, phase: i * 2.1, color: BOT_COLORS[i] } });
          }
        }
        addOccluders(sx, sy);
      }
    }

    if (ov.length) {
      const savedW = warm; warm = 0;
      if (ov.length > 1) ov.sort((a, b) => a.s - b.s || a.k - b.k);
      for (let i = 0; i < ov.length; i++) {
        const it = ov[i];
        if (it.k === 1) drawCar(it.c, 1, false);
        else if (it.k === 2) drawWalker(it.w);
        else if (it.k === 3) drawBoat(it.b, 1);
        else if (it.k === 4) drawWheelSpin(it.x, it.y, now, 1);
        else if (it.k === 5) drawMillSpin(it.x, it.y, now, 1);
        else if (it.k === 6) drawBot(it.b, now, false);
        else if (it.k === 7) drawBot(it.b, now, true);
        else drawTile(it.x, it.y, it.t, 1, it.t !== 'bridge');
      }
      warm = savedW;
    }

    if (warm > 0.02 || L < 0.98) {
      const wa = warm * 0.14;
      const na = (1 - L) * 0.68;
      const a = wa + na * (1 - wa);
      if (a > 0.004) {
        const r = Math.round((255 * wa + 10 * na * (1 - wa)) / a);
        const g = Math.round((155 * wa + 18 * na * (1 - wa)) / a);
        const b = Math.round((45 * wa + 40 * na * (1 - wa)) / a);
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    if (L < 0.65) {
      ctx.globalAlpha = Math.min(1, (0.65 - L) * 2.4);
      ctx.drawImage(nightCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);
      ctx.globalAlpha = 1;
    }
    if (L < 0.5 && cars.length && showAgents) {
      for (let i = 0; i < ov.length; i++) if (ov[i].k === 1) drawCar(ov[i].c, L, true);
    }

    if (L < 0.65 && beaconsList.length && Math.sin(now * 0.006) > 0.2) {
      ctx.fillStyle = '#ff594a';
      for (let i = 0; i < beaconsList.length; i++) {
        const [bx, by, bz] = beaconsList[i];
        ctx.beginPath(); ctx.arc(px(bx + 0.5, by + 0.5), py(bx + 0.5, by + 0.5, bz), 2.2 * cam.z, 0, 7); ctx.fill();
      }
    }

    if (!reduceMotion && housesList.length && (hour < 9 || hour > 16.5)) {
      if (smokes.length < 6 && Math.random() < 0.05) {
        const [hx, hy, hz] = housesList[Math.floor(Math.random() * housesList.length)];
        smokes.push({ x: hx + 0.68, y: hy + 0.38, z: hz, life: 0 });
      }
      for (let i = smokes.length - 1; i >= 0; i--) {
        const sm = smokes[i];
        sm.life += dt * 0.45;
        if (sm.life >= 1) { smokes.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(236, 232, 224, ${((1 - sm.life) * 0.28).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(px(sm.x + sm.life * 0.2, sm.y - sm.life * 0.1), py(sm.x, sm.y, sm.z + sm.life * 18), (2.2 + sm.life * 3) * cam.z, 0, 7);
        ctx.fill();
      }
    }

    if (!reduceMotion && L > 0.25) {
      ctx.globalAlpha = Math.min(0.85, L);
      for (let i = 0; i < leaves.length; i++) {
        const lf = leaves[i];
        lf.x = (lf.x + lf.vx * dt + Math.sin(now * 0.0015 + lf.phase) * 0.003 * dt) % 1;
        lf.y = (lf.y + lf.vy * dt) % 1;
        ctx.fillStyle = lf.col;
        ctx.fillRect(lf.x * W, lf.y * H, 3, 2);
      }
      ctx.globalAlpha = 1;
    } else if (!reduceMotion && L <= 0.45) {
      for (let i = 0; i < fireflies.length; i++) {
        const ff = fireflies[i];
        const a = Math.max(0, Math.sin(now * 0.003 + ff.phase)) * (0.45 - L) * 1.8;
        if (a < 0.05) continue;
        ctx.fillStyle = `rgba(255,235,140,${a.toFixed(2)})`;
        const fx = (ff.x + Math.sin(now * 0.0005 + ff.phase) * 0.02) * W;
        const fy = (ff.y + Math.cos(now * 0.0006 + ff.phase) * 0.02) * H;
        ctx.fillRect(fx, fy, 2.5, 2.5);
      }
    }

    if (hover && pins[hover[0]]?.[hover[1]]) {
      const [x, y] = hover;
      ctx.strokeStyle = 'rgba(15, 118, 110, 0.8)';
      ctx.lineWidth = 2;
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
      ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 2.2;
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

    if (L < 0.6) {
      ctx.globalAlpha = (0.6 - L) * 0.6;
      ctx.drawImage(vigCanvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    drawHeat(now);
    drawMapLabels();
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
      ng[nx][ny] = grid[x][y];
      nl[nx][ny] = levels[x][y];
      np[nx][ny] = pins[x][y];
    }
    grid = ng; levels = nl; pins = np;
    for (const list of [cars, walkers, boats, bots]) {
      for (const c of list) {
        const fx = rx(c.fx, c.fy), fy = ry(c.fx, c.fy);
        const tx = rx(c.tx, c.ty), ty = ry(c.tx, c.ty);
        c.fx = fx; c.fy = fy; c.tx = tx; c.ty = ty;
        c.px = c.fx + (c.tx - c.fx) * c.t;
        c.py = c.fy + (c.ty - c.fy) * c.t;
      }
    }
    if (selectedTile) selectedTile = [rx(selectedTile[0], selectedTile[1]), ry(selectedTile[0], selectedTile[1])];
    smokes.length = 0;
    worldDirty = true;
    recompute(); scheduleSave();
    sfx('tap');
  }

  // ---------- GitHub API ----------
  function timeAgo(iso) {
    if (!iso) return 'active';
    const sec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }

  function buildFallbackBots(repo, stateNote) {
    const lang = repo.lang || 'Web';
    const host = repo.web ? repo.web.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'GitHub';
    return [
      { name: 'CommitBot', state: 'ok', task: `${stateNote || 'Tracking main branch'} on ${GITHUB_OWNER}/${repo.name}` },
      { name: 'DeployBot', state: 'ok', task: `Serving ${host} live build` },
      { name: 'ReviewBot', state: 'busy', task: `Scanning ${lang} modules and workspace checks` },
    ];
  }

  function buildLiveBots(repo, commits, runs) {
    const c0 = Array.isArray(commits) && commits[0];
    const sha = c0?.sha ? c0.sha.slice(0, 7) : 'main';
    const msg = c0?.commit?.message ? c0.commit.message.split('\n')[0].slice(0, 48) : 'Latest commit';
    const when = c0?.commit?.author?.date ? timeAgo(c0.commit.author.date) : 'active';
    const host = repo.web ? repo.web.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'GitHub';
    const run0 = Array.isArray(runs) && runs[0];
    let deployTask = `Live on ${host} and ready`;
    let deployState = 'ok';
    if (run0) {
      const ok = run0.conclusion === 'success';
      const active = run0.status === 'in_progress' || run0.status === 'queued';
      deployState = active ? 'busy' : ok ? 'ok' : 'err';
      deployTask = `${run0.name || 'CI deploy'}: ${active ? run0.status.replace('_', ' ') : (run0.conclusion || run0.status)} (${timeAgo(run0.updated_at)})`;
    }
    return [
      { name: 'CommitBot', state: 'ok', task: `${sha} (${when}): ${msg}` },
      { name: 'DeployBot', state: deployState, task: deployTask },
      { name: 'ReviewBot', state: 'busy', task: `Watching ${repo.lang || 'Web'} files (${Array.isArray(commits) ? commits.length : 1} recent commits)` },
    ];
  }

  async function fetchJsonTimed(url, ms = 5000) {
    const ac = new AbortController();
    const tid = setTimeout(() => ac.abort(), ms);
    try {
      const res = await fetch(url, { signal: ac.signal, headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(tid);
    }
  }

  function updateCountUI() {
    const list = activeCatalog();
    $('repoCount').textContent = edition === 'github' ? `${list.length} repos`
      : edition === 'google' ? `${list.length} apps` : `${list.length} places`;
  }

  async function fetchUserRepos(force = false) {
    const list = await fetchJsonTimed(`https://api.github.com/users/${GITHUB_OWNER}/repos?per_page=40&sort=updated`);
    if (!Array.isArray(list)) return;
    let added = false;
    for (const r of list) {
      if (!r || !r.name) continue;
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
    }
    if (added) {
      assignUnpinnedItems();
      if (worldDirty) buildWorld();
    }
    if (force) repoCache.clear();
    updateCountUI();
    if (!$('searchResults').hidden) renderSearchResults();
    if (selectedTile && getItem(pins[selectedTile[0]][selectedTile[1]]).kind === 'github') renderInspect(force);
  }

  async function fetchRepoActivity(repo, force = false) {
    if (repo.isCustom || !repo.git) return null;
    const prev = repoCache.get(repo.id);
    const now = Date.now();
    if (!force && prev && (prev.loading || now - prev.at < 120000)) return prev;

    const entry = {
      at: now, loading: true, live: false,
      bots: buildFallbackBots(repo, 'Syncing repo status'), commits: [], files: [],
    };
    repoCache.set(repo.id, entry);

    if (repo.isPrivate) {
      entry.loading = false;
      entry.bots = buildFallbackBots(repo, 'Private repo mirror synced');
      if (selectedTile && pins[selectedTile[0]][selectedTile[1]] === repo.id) renderDetailsUI(repo);
      return entry;
    }

    const [repoInfo, commits, runs, files] = await Promise.all([
      repo.meta ? Promise.resolve(null) : fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.id}`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.id}/commits?per_page=6`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.id}/actions/runs?per_page=2`),
      fetchJsonTimed(`https://api.github.com/repos/${GITHUB_OWNER}/${repo.id}/contents`),
    ]);

    if (repoInfo) {
      repo.meta = {
        stars: repoInfo.stargazers_count ?? 0,
        issues: repoInfo.open_issues_count ?? 0,
        branch: repoInfo.default_branch || 'main',
        pushedAt: repoInfo.pushed_at || repoInfo.updated_at,
      };
      if (repoInfo.description) repo.desc = repoInfo.description;
    }

    entry.at = Date.now();
    entry.loading = false;
    if (Array.isArray(commits) && commits.length) {
      entry.live = true;
      entry.commits = commits;
      entry.bots = buildLiveBots(repo, commits, runs?.workflow_runs);
    } else {
      entry.live = false;
      entry.bots = buildFallbackBots(repo, 'Cached branch snapshot');
    }
    if (Array.isArray(files)) {
      entry.files = [...files].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    }
    if (selectedTile && pins[selectedTile[0]][selectedTile[1]] === repo.id) renderDetailsUI(repo);
    return entry;
  }

  // ---------- inspector workspace panel ----------
  function buildGoogleBots(app) {
    let host = 'Google Workspace';
    try { host = new URL(app.web).hostname.replace(/^www\./, ''); } catch (e) {}
    const bmCount = (bookmarks[app.id] || []).length;
    return [
      { name: 'LinkBot', state: 'ok', task: `Direct portal ready at ${host}` },
      { name: 'SyncBot', state: 'ok', task: `${(app.shortcuts || []).length} quick shortcuts available` },
      { name: 'PinBot', state: 'busy', task: `${bmCount} pinned bookmark${bmCount === 1 ? '' : 's'} saved` },
    ];
  }

  function renderDetailsUI(item) {
    const isGit = item.kind === 'github' && !item.isCustom;
    const cached = isGit ? repoCache.get(item.id) : null;
    const meta = item.meta || {};
    const branch = meta.branch || 'main';
    let host = 'Web';
    try { host = item.web ? new URL(item.web).hostname.replace(/^www\./, '') : 'Local'; } catch (e) {}

    const metricsEl = $('inspMetrics');
    metricsEl.innerHTML = '';
    const cells = isGit ? [
      ['Lang', item.lang || 'Web'],
      ['Access', item.isPrivate ? 'Private' : 'Public'],
      ['Stars', meta.stars !== undefined ? String(meta.stars) : (item.isPrivate ? '-' : '0')],
      ['Updated', meta.pushedAt ? timeAgo(meta.pushedAt) : (cached?.commits?.[0]?.commit?.author?.date ? timeAgo(cached.commits[0].commit.author.date) : 'Active')],
    ] : [
      ['District', item.kind === 'google' ? 'South' : 'North'],
      ['Category', item.cat || 'App'],
      ['Host', host.split('.')[0]],
      ['Pinned', String((bookmarks[item.id] || []).length)],
    ];
    for (const [lbl, val] of cells) {
      const cell = document.createElement('div'); cell.className = 'metric-cell';
      const lEl = document.createElement('span'); lEl.className = 'stat-label'; lEl.textContent = lbl;
      const vEl = document.createElement('span'); vEl.className = 'metric-val'; vEl.textContent = val;
      cell.append(lEl, vEl);
      metricsEl.appendChild(cell);
    }

    const botsData = isGit ? (cached?.bots || buildFallbackBots(item)) : buildGoogleBots(item);
    $('botsLive').textContent = isGit
      ? (cached?.loading ? 'Syncing' : cached?.live ? 'Live GitHub' : item.isPrivate ? 'Private app' : 'Active')
      : 'Ready';
    const botsEl = $('inspBots');
    botsEl.innerHTML = '';
    for (const bot of botsData) {
      const row = document.createElement('div'); row.className = 'bot-item';
      const dot = document.createElement('span');
      dot.className = 'bot-dot' + (bot.state === 'busy' ? ' busy' : bot.state === 'err' ? ' err' : '');
      const body = document.createElement('div');
      const nEl = document.createElement('div'); nEl.className = 'bot-name'; nEl.textContent = bot.name;
      const tEl = document.createElement('div'); tEl.className = 'bot-task'; tEl.textContent = bot.task;
      body.append(nEl, tEl); row.append(dot, body);
      botsEl.appendChild(row);
    }

    $('tab2Btn').textContent = isGit ? 'Commits' : 'Shortcuts';
    $('tab3Btn').textContent = isGit ? 'Files' : 'Pinned links';
    $('pinBookmarkForm').hidden = isGit;

    const list2 = $('inspSecondList');
    list2.innerHTML = '';
    const list3 = $('inspThirdList');
    list3.innerHTML = '';

    if (isGit) {
      if (cached?.loading) {
        const p = document.createElement('p'); p.className = 'insp-body'; p.textContent = 'Loading commits from GitHub...';
        list2.appendChild(p);
      } else if (cached?.commits?.length) {
        for (const c of cached.commits) {
          const a = document.createElement('a');
          a.className = 'detail-row';
          a.href = c.html_url || `${item.git}/commits/${branch}`;
          a.target = '_blank'; a.rel = 'noopener noreferrer';
          const top = document.createElement('div'); top.className = 'detail-top';
          const sha = document.createElement('code'); sha.className = 'sha'; sha.textContent = (c.sha || '').slice(0, 7);
          const dtEl = document.createElement('span'); dtEl.className = 'detail-meta'; dtEl.textContent = timeAgo(c.commit?.author?.date);
          top.append(sha, dtEl);
          const msg = document.createElement('div'); msg.className = 'detail-sub';
          msg.textContent = (c.commit?.message || '').split('\n')[0];
          a.append(top, msg); list2.appendChild(a);
        }
      } else {
        const p = document.createElement('p'); p.className = 'insp-body';
        p.textContent = item.isPrivate ? 'Commit history is private on GitHub. Open github.dev or GitHub to inspect commits.' : 'No public commits loaded.';
        list2.appendChild(p);
      }

      if (cached?.loading) {
        const p = document.createElement('p'); p.className = 'insp-body'; p.textContent = 'Loading repository files...';
        list3.appendChild(p);
      } else if (cached?.files?.length) {
        for (const f of cached.files.slice(0, 24)) {
          const a = document.createElement('a');
          a.className = 'detail-row';
          const isDir = f.type === 'dir';
          a.href = isDir ? `${item.git}/tree/${branch}/${f.path}` : `https://github.dev/${GITHUB_OWNER}/${item.id}/blob/${branch}/${f.path}`;
          a.target = '_blank'; a.rel = 'noopener noreferrer';
          const top = document.createElement('div'); top.className = 'detail-top';
          const name = document.createElement('span'); name.className = 'detail-title'; name.textContent = isDir ? `${f.name}/` : f.name;
          const kind = document.createElement('span'); kind.className = 'detail-meta'; kind.textContent = isDir ? 'Folder' : 'Edit';
          top.append(name, kind); a.append(top); list3.appendChild(a);
        }
      } else {
        const p = document.createElement('p'); p.className = 'insp-body';
        p.textContent = item.isPrivate ? 'File tree requires GitHub sign-in. Click Open github.dev above.' : 'Open github.dev or GitHub repo above to browse files.';
        list3.appendChild(p);
      }
    } else {
      const sc = item.shortcuts || [];
      if (sc.length) {
        for (const s of sc) {
          const a = document.createElement('a');
          a.className = 'detail-row';
          a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          const top = document.createElement('div'); top.className = 'detail-top';
          const title = document.createElement('span'); title.className = 'detail-title'; title.textContent = s.label;
          const metaEl = document.createElement('span'); metaEl.className = 'detail-meta'; metaEl.textContent = 'Open';
          top.append(title, metaEl);
          const sub = document.createElement('div'); sub.className = 'detail-sub'; sub.textContent = s.sub || s.url;
          a.append(top, sub); list2.appendChild(a);
        }
      } else {
        const p = document.createElement('p'); p.className = 'insp-body'; p.textContent = 'Use Edit above to customize URLs for this building.';
        list2.appendChild(p);
      }

      const bms = bookmarks[item.id] || [];
      if (bms.length) {
        bms.forEach((bm, idx) => {
          const wrap = document.createElement('div'); wrap.className = 'bookmark-row';
          const a = document.createElement('a'); a.className = 'detail-row';
          a.href = bm.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
          const top = document.createElement('div'); top.className = 'detail-top';
          const title = document.createElement('span'); title.className = 'detail-title'; title.textContent = bm.label;
          const metaEl = document.createElement('span'); metaEl.className = 'detail-meta'; metaEl.textContent = 'Open';
          top.append(title, metaEl);
          const sub = document.createElement('div'); sub.className = 'detail-sub'; sub.textContent = bm.url;
          a.append(top, sub);

          const del = document.createElement('button');
          del.type = 'button'; del.className = 'chip icon tiny'; del.setAttribute('aria-label', `Remove ${bm.label}`);
          del.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
          del.onclick = () => {
            bookmarks[item.id].splice(idx, 1);
            scheduleSave();
            renderDetailsUI(item);
          };
          wrap.append(a, del);
          list3.appendChild(wrap);
        });
      } else {
        const p = document.createElement('p'); p.className = 'insp-body';
        p.textContent = `Pin specific ${item.name} links above (for example a Google Doc draft, Slides deck, or SEQTA link) for 1-click access.`;
        list3.appendChild(p);
      }
    }
  }

  function setTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.tab === name));
    });
    $('tabOverview').hidden = name !== 'overview';
    $('tabSecond').hidden = name !== 'second';
    $('tabThird').hidden = name !== 'third';
  }
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.onclick = () => { setTab(b.dataset.tab); sfx('tap'); };
  });

  function closeEditForm() {
    $('inspEditBox').hidden = true;
    $('inspEditBtn').setAttribute('aria-expanded', 'false');
  }

  function renderInspect(forceFetch = false) {
    const card = $('inspectCard');
    if (!selectedTile) { card.dataset.open = 'false'; closeEditForm(); return; }
    const [x, y] = selectedTile;
    const t = grid[x][y];
    const id = pins[x][y];
    if (!t || !id) { selectedTile = null; card.dataset.open = 'false'; closeEditForm(); return; }

    const item = getItem(id);
    const d = TYPES[t];
    const isGit = item.kind === 'github' && !item.isCustom;

    $('inspTitle').textContent = item.name;
    $('inspSub').textContent = `${d.name} (${item.kind === 'google' ? 'South Bank' : 'North Bank'}) · (${x}, ${y})`;
    $('inspDesc').textContent = item.desc || item.web || '';

    const webLink = $('inspWeb');
    if (item.web) {
      webLink.href = item.web;
      webLink.textContent = isGit ? 'Open live site' : `Open ${item.name}`;
      webLink.hidden = false;
    } else {
      webLink.hidden = true;
    }

    const editorLink = $('inspEditor');
    if (isGit) {
      editorLink.href = `https://github.dev/${GITHUB_OWNER}/${item.id}`;
      editorLink.textContent = 'Open github.dev';
      editorLink.hidden = false;
    } else if (item.alt) {
      editorLink.href = item.alt;
      editorLink.textContent = item.altLabel || 'Quick action';
      editorLink.hidden = false;
    } else {
      editorLink.hidden = true;
    }

    const gitLink = $('inspGit');
    if (isGit && item.git) {
      gitLink.href = item.git;
      gitLink.hidden = false;
    } else {
      gitLink.hidden = true;
    }

    $('inspCopy').textContent = isGit && item.git ? 'Copy clone' : 'Copy link';
    $('inspCloneBox').hidden = !(isGit && item.git);
    if (isGit && item.git) $('inspCloneCode').textContent = `git clone ${item.git}.git`;

    const catalog = allItems();
    const sel = $('inspRepo');
    sel.innerHTML = '';
    for (const c of catalog) {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.kind === 'github' ? `${c.name} (${c.lang || 'GitHub'})` : `${c.name} (${c.cat || 'Google'})`;
      sel.appendChild(opt);
    }
    sel.value = item.id;

    $('editName').value = item.name || '';
    $('editWeb').value = item.web || '';
    $('editAlt').value = isGit ? (item.git || '') : (item.alt || '');
    $('editStyle').value = t;
    $('editDeleteBtn').hidden = !item.isCustom;

    setTab(activeTab);
    if (isGit) fetchRepoActivity(item, forceFetch);
    renderDetailsUI(item);
    card.dataset.open = 'true';
  }

  $('inspRepo').onchange = (e) => {
    if (!selectedTile) return;
    const [x, y] = selectedTile;
    pins[x][y] = e.target.value;
    scheduleSave();
    sfx('tap');
    renderInspect();
  };
  $('inspClose').onclick = () => { selectedTile = null; renderInspect(); };
  $('inspCopy').onclick = async () => {
    if (!selectedTile) return;
    const id = pins[selectedTile[0]][selectedTile[1]];
    if (!id) return;
    const item = getItem(id);
    const val = (item.kind === 'github' && item.git && !item.isCustom) ? `git clone ${item.git}.git` : (item.web || item.git || '');
    try { await navigator.clipboard.writeText(val); } catch (e) {}
    const b = $('inspCopy');
    const prev = b.textContent;
    b.textContent = 'Copied';
    setTimeout(() => { b.textContent = prev; }, 1400);
  };

  $('inspEditBtn').onclick = () => {
    const box = $('inspEditBox');
    const open = box.hidden;
    box.hidden = !open;
    $('inspEditBtn').setAttribute('aria-expanded', String(open));
  };

  $('inspEditBox').onsubmit = (e) => {
    e.preventDefault();
    if (!selectedTile) return;
    const [x, y] = selectedTile;
    const id = pins[x][y];
    if (!id) return;
    const name = $('editName').value.trim();
    const web = $('editWeb').value.trim();
    const alt = $('editAlt').value.trim();
    const style = $('editStyle').value;
    const base = getItem(id);

    const patch = { ...(overrides[id] || {}) };
    if (name) patch.name = name;
    patch.web = web;
    if (base.kind === 'github' && !base.isCustom) patch.git = alt || base.git;
    else patch.alt = alt;
    overrides[id] = patch;

    if (style && TYPES[style] && grid[x][y] !== style) {
      grid[x][y] = style;
      worldDirty = true;
      recompute();
    }
    scheduleSave();
    closeEditForm();
    renderInspect();
    if (!$('searchResults').hidden) renderSearchResults();
    sfx('select');
  };

  $('editDeleteBtn').onclick = () => {
    if (!selectedTile) return;
    const [x, y] = selectedTile;
    const id = pins[x][y];
    const idx = customItems.findIndex((c) => c.id === id);
    if (idx < 0) return;
    customItems.splice(idx, 1);
    delete overrides[id];
    pins[x][y] = null;
    grid[x][y] = 'forest';
    levels[x][y] = 1;
    selectedTile = null;
    worldDirty = true;
    recompute();
    updateCountUI();
    scheduleSave();
    renderInspect();
    sfx('tap');
  };

  $('pinBookmarkForm').onsubmit = (e) => {
    e.preventDefault();
    if (!selectedTile) return;
    const id = pins[selectedTile[0]][selectedTile[1]];
    if (!id) return;
    const label = $('bmLabel').value.trim();
    const url = $('bmUrl').value.trim();
    if (!label || !url) return;
    if (!bookmarks[id]) bookmarks[id] = [];
    bookmarks[id].unshift({ label, url });
    $('bmLabel').value = '';
    $('bmUrl').value = '';
    scheduleSave();
    renderDetailsUI(getItem(id));
    sfx('select');
  };

  // ---------- edition tabs, search & filters ----------
  function renderFiltersUI() {
    const row = $('filterRow');
    row.innerHTML = '';
    const filters = edition === 'github'
      ? [['all', 'All'], ['web', 'Live web'], ['js', 'JS / TS'], ['other', 'Python / HTML']]
      : edition === 'google'
        ? [['all', 'All'], ['google', 'Google'], ['study', 'Study'], ['custom', 'Custom']]
        : [['all', 'All city'], ['github', 'GitHub'], ['google', 'Google & Study'], ['custom', 'Custom']];
    for (const [key, lbl] of filters) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'filter-chip'; b.dataset.filter = key;
      b.setAttribute('aria-pressed', String(activeFilter === key));
      b.textContent = lbl;
      b.onclick = () => {
        activeFilter = key;
        renderFiltersUI();
        renderSearchResults();
        $('searchResults').hidden = false;
        sfx('tap');
      };
      row.appendChild(b);
    }
  }

  function setEdition(ed, focusCamera = true) {
    if (ed !== 'github' && ed !== 'google' && ed !== 'all') return;
    edition = ed;
    activeFilter = 'all';
    activeTab = 'overview';
    selectedTile = null;
    hover = null; hoveredLabel = null;
    document.querySelectorAll('.edition-btn').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.edition === ed));
    });
    $('repoSearch').value = '';
    $('repoSearch').placeholder = ed === 'github' ? 'Search GitHub repos...' : ed === 'google' ? 'Search Gmail, Docs, SEQTA...' : 'Search all city places...';
    $('searchResults').hidden = true;
    renderFiltersUI();
    updateCountUI();
    renderInspect();
    if (focusCamera) {
      if (ed === 'github') flyToTile(13, 9, W >= 760 ? 0.94 : 0.78, false);
      else if (ed === 'google') flyToTile(14, 24, W >= 760 ? 0.96 : 0.82, false);
      else center(true);
    }
    scheduleSave();
    sfx('tap');
  }

  document.querySelectorAll('.edition-btn').forEach((b) => {
    b.onclick = () => setEdition(b.dataset.edition, true);
  });

  function matchesFilter(item, q) {
    if (edition === 'github') {
      if (activeFilter === 'web' && !item.web) return false;
      if (activeFilter === 'js' && item.lang !== 'JavaScript' && item.lang !== 'TypeScript') return false;
      if (activeFilter === 'other' && (item.lang === 'JavaScript' || item.lang === 'TypeScript')) return false;
    } else if (edition === 'google') {
      if (activeFilter === 'google' && item.cat !== 'Google') return false;
      if (activeFilter === 'study' && item.cat !== 'Study') return false;
      if (activeFilter === 'custom' && !item.isCustom) return false;
    } else {
      if (activeFilter === 'github' && item.kind !== 'github') return false;
      if (activeFilter === 'google' && item.kind !== 'google') return false;
      if (activeFilter === 'custom' && !item.isCustom) return false;
    }
    if (!q) return true;
    const hay = `${item.name} ${item.lang || ''} ${item.cat || ''} ${item.desc || ''}`.toLowerCase();
    return hay.includes(q);
  }

  function focusItemById(id) {
    let tile = findItemTile(id);
    if (!tile) {
      assignUnpinnedItems();
      if (worldDirty) buildWorld();
      tile = findItemTile(id);
    }
    if (!tile) return;
    selectedTile = tile;
    flyToTile(tile[0], tile[1], null, true);
    renderInspect();
    $('searchResults').hidden = true;
    $('hint').dataset.hidden = 'true';
    sfx('select');
  }

  function renderSearchResults() {
    const q = ($('repoSearch').value || '').trim().toLowerCase();
    $('clearSearch').hidden = !q;
    const boxEl = $('searchResults');
    boxEl.innerHTML = '';
    const matches = activeCatalog().filter((item) => matchesFilter(item, q));
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'detail-row';
      const sub = document.createElement('div'); sub.className = 'detail-sub'; sub.textContent = 'No matching places found.';
      empty.appendChild(sub); boxEl.appendChild(empty);
      return;
    }
    const selId = selectedTile ? pins[selectedTile[0]][selectedTile[1]] : null;
    for (const item of matches) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'search-item';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', String(item.id === selId));
      const dot = document.createElement('span');
      dot.className = 'search-dot' + (item.isPrivate ? ' priv' : '');
      const main = document.createElement('div'); main.className = 'search-main';
      const title = document.createElement('div'); title.className = 'search-title'; title.textContent = item.name;
      const sub = document.createElement('div'); sub.className = 'search-sub';
      sub.textContent = `${item.lang || item.cat || 'App'} · ${item.desc || item.web || ''}`;
      main.append(title, sub);
      const tag = document.createElement('span'); tag.className = 'search-tag';
      tag.textContent = item.kind === 'github' ? (item.web ? 'Live' : 'GitHub') : 'Open';
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
      const first = activeCatalog().find((r) => matchesFilter(r, q));
      if (first) focusItemById(first.id);
    }
  });
  $('clearSearch').onclick = () => {
    $('repoSearch').value = '';
    renderSearchResults();
    $('repoSearch').focus();
  };
  $('syncBtn').onclick = async () => {
    const b = $('syncBtn');
    b.disabled = true;
    await fetchUserRepos(true);
    b.disabled = false;
    sfx('select');
  };

  // ---------- customization panel & map controls ----------
  function setPop(id, btnId, open) {
    const pop = $(id), btn = $(btnId);
    if (open) {
      if (id === 'customPop') setPop('morePop', 'moreBtn', false);
      if (id === 'morePop') setPop('customPop', 'customBtn', false);
    }
    pop.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
  }

  $('customBtn').onclick = (e) => { e.stopPropagation(); setPop('customPop', 'customBtn', $('customPop').dataset.open !== 'true'); };
  $('customClose').onclick = () => setPop('customPop', 'customBtn', false);
  $('moreBtn').onclick = (e) => { e.stopPropagation(); setPop('morePop', 'moreBtn', $('morePop').dataset.open !== 'true'); };

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.onclick = () => {
      themeId = btn.dataset.theme;
      syncThemeUI();
      rebuildCrownSprites();
      worldDirty = true;
      scheduleSave();
      sfx('tap');
    };
  });

  $('agentsBtn').onclick = () => {
    showAgents = !showAgents;
    $('agentsBtn').setAttribute('aria-pressed', String(showAgents));
    syncAgents();
    scheduleSave();
    sfx('tap');
  };

  $('addPlaceForm').onsubmit = (e) => {
    e.preventDefault();
    const name = $('addName').value.trim();
    const url = $('addUrl').value.trim();
    const style = $('addBuilding').value || 'shop';
    if (!name || !url) return;
    const targetKind = edition === 'google' ? 'google' : 'github';
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Date.now().toString(36).slice(-4);
    const entry = {
      id, kind: targetKind, name, web: url,
      lang: 'Custom', cat: 'Custom', style, isCustom: true,
      desc: `Custom shortcut on ${targetKind === 'google' ? 'South Bank (Google & Study)' : 'North Bank (GitHub)'}.`,
      shortcuts: [{ label: `Open ${name}`, url, sub: url }],
    };
    customItems.push(entry);
    const lot = findFreeLot(targetKind, style);
    if (lot) {
      grid[lot.x][lot.y] = style;
      levels[lot.x][lot.y] = lot.lv;
      pins[lot.x][lot.y] = id;
      worldDirty = true;
      recompute();
    }
    $('addName').value = '';
    $('addUrl').value = '';
    updateCountUI();
    scheduleSave();
    setPop('customPop', 'customBtn', false);
    focusItemById(id);
  };

  $('labelsBtn').onclick = () => {
    showLabels = !showLabels;
    $('labelsBtn').setAttribute('aria-pressed', String(showLabels));
    scheduleSave();
    sfx('tap');
  };
  $('heatBtn').onclick = () => {
    showHeat = !showHeat;
    $('heatBtn').setAttribute('aria-pressed', String(showHeat));
    sfx('tap');
  };
  $('lightBtn').onclick = () => {
    lightIdx = (lightIdx + 1) % LIGHT_MODES.length;
    hour = LIGHT_MODES[lightIdx].hour;
    syncLightUI();
    scheduleSave();
    sfx('tap');
  };
  $('centerBtn').onclick = () => { center(true); sfx('tap'); };
  $('rotBtn').onclick = () => rotateCity(true);
  $('zoomIn').onclick = () => zoomAt(1.2);
  $('zoomOut').onclick = () => zoomAt(1 / 1.2);

  $('soundBtn').onclick = () => {
    soundOn = !soundOn;
    const b = $('soundBtn');
    b.setAttribute('aria-pressed', String(soundOn));
    b.textContent = soundOn ? 'Sound on' : 'Sound off';
    if (soundOn) sfx('tap');
  };

  $('pngBtn').onclick = () => {
    const prevHover = hover, prevSel = selectedTile;
    hover = null; selectedTile = null;
    draw(performance.now(), 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `workspace-city-${edition}.png`;
    a.click();
    hover = prevHover; selectedTile = prevSel;
    setPop('morePop', 'moreBtn', false);
  };

  $('exportBtn').onclick = () => {
    const payload = { edition, themeId, showAgents, showLabels, hour, customItems, overrides, bookmarks, grid, levels, pins };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'workspace-city-config.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setPop('morePop', 'moreBtn', false);
  };

  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!applySaveData(d)) return;
      setEdition(edition, false);
      worldDirty = true; recompute(); saveNow(); center(false);
      setPop('morePop', 'moreBtn', false);
    } catch (err) { /* ignore invalid JSON */ }
  };

  $('resetBtn').onclick = () => {
    customItems.length = 0;
    for (const k of Object.keys(overrides)) delete overrides[k];
    starter();
    themeId = 'autumn'; showAgents = true; showLabels = true;
    syncThemeUI(); rebuildCrownSprites();
    $('agentsBtn').setAttribute('aria-pressed', 'true');
    $('labelsBtn').setAttribute('aria-pressed', 'true');
    worldDirty = true; recompute(); renderFiltersUI(); updateCountUI(); renderInspect(); saveNow(); center(true);
    setPop('morePop', 'moreBtn', false);
    sfx('tap');
  };

  addEventListener('pointerdown', (e) => {
    const dock = document.querySelector('.search-dock');
    if (!$('searchResults').hidden && !dock.contains(e.target)) $('searchResults').hidden = true;
    const cp = $('customPop'), mp = $('morePop');
    if (cp.dataset.open === 'true' && !cp.contains(e.target) && e.target !== $('customBtn')) setPop('customPop', 'customBtn', false);
    if (mp.dataset.open === 'true' && !mp.contains(e.target) && e.target !== $('moreBtn')) setPop('morePop', 'moreBtn', false);
  });

  // ---------- canvas pan, zoom, label & building click ----------
  let drag = null;
  const ptrs = new Map();
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('hint').dataset.hidden = 'true';
    camAnim = null;
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
      const txt = `${item.name} (${item.lang || item.cat || 'App'}) · Click to open`;
      if (tip.textContent !== txt) tip.textContent = txt;
      if (tip.hidden) tip.hidden = false;
      tip.style.transform = `translate3d(${Math.min(W - 250, e.clientX + 16)}px, ${e.clientY + 16}px, 0)`;
    } else if (!tip.hidden) {
      tip.hidden = true;
    }
  });

  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size) return;
    if (drag && !drag.moved && !drag.pinch) {
      const lbl = hitLabel(e.clientX, e.clientY);
      const t = lbl ? [lbl.x, lbl.y] : pick(e.clientX, e.clientY);
      if (t && pins[t[0]]?.[t[1]]) {
        selectedTile = t;
        renderInspect();
        sfx('select');
      } else {
        selectedTile = null;
        renderInspect();
      }
    }
    drag = null;
    canvas.style.cursor = hoveredLabel ? 'pointer' : 'grab';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; hoveredLabel = null; $('tip').hidden = true; });

  function zoomAt(f, mx = W / 2, my = H / 2) {
    camAnim = null;
    const nz = Math.max(0.45, Math.min(2.4, cam.z * f));
    const k = nz / cam.z;
    cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz;
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('searchResults').hidden = true;
      setPop('customPop', 'customBtn', false);
      setPop('morePop', 'moreBtn', false);
      if (selectedTile) { selectedTile = null; renderInspect(); }
      return;
    }
    if (e.target.matches('input, select')) return;
    if (e.key === '/') { e.preventDefault(); $('repoSearch').focus(); return; }
    const k = e.key.toLowerCase();
    if (k === 'r' || k === 'e') return rotateCity(true);
    if (k === 'q') return rotateCity(false);
    if (e.key === '+' || e.key === '=') zoomAt(1.2);
    if (e.key === '-') zoomAt(1 / 1.2);
  });

  // ---------- loop ----------
  function resize() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function center(animateMove = false) {
    const tz = Math.max(0.45, Math.min(0.95, W / (N * TW) * 1.12, H / (N * TH + 150) * 1.12));
    const tx = W / 2, ty = H / 2 - (N * TH / 2) * tz + 26;
    if (!animateMove || reduceMotion) { cam.x = tx; cam.y = ty; cam.z = tz; camAnim = null; return; }
    camAnim = { sx: cam.x, sy: cam.y, sz: cam.z, tx, ty, tz, start: performance.now(), dur: 360 };
  }
  addEventListener('resize', resize);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (camAnim) {
      const p = Math.min(1, (now - camAnim.start) / camAnim.dur);
      const e = easeOut(p);
      cam.x = camAnim.sx + (camAnim.tx - camAnim.sx) * e;
      cam.y = camAnim.sy + (camAnim.ty - camAnim.sy) * e;
      cam.z = camAnim.sz + (camAnim.tz - camAnim.sz) * e;
      if (p >= 1) camAnim = null;
    }
    if (showAgents) {
      stepList(cars, dt, isRoad);
      stepList(walkers, dt, isRoad);
      stepList(bots, dt, isRoad);
      stepList(boats, dt, isWater);
    }
    draw(now, dt);
    requestAnimationFrame(frame);
  }

  resize();
  if (!load()) starter();
  recompute();
  setEdition(edition, false);
  center(false);
  fetchUserRepos(false);
  requestAnimationFrame(frame);
})();

(function () {
  const $ = (id) => document.getElementById(id);
  const KEY = 'isocity-account';
  // u/0 = first signed-in Google account (personal), u/1 = second (school).
  const urls = (u) => ({
    lnkSlides: `https://docs.google.com/presentation/u/${u}/`,
    lnkDocs: `https://docs.google.com/document/u/${u}/`,
    lnkGmail: `https://mail.google.com/mail/u/${u}/`,
  });
  function apply(kind) {
    const school = kind === 'school';
    const u = urls(school ? 1 : 0);
    for (const id in u) $(id).href = u[id];
    $('lnkCal').href = 'https://calendar.google.com/calendar/u/0/r';
    $('acctPersonal').setAttribute('aria-pressed', String(!school));
    $('acctSchool').setAttribute('aria-pressed', String(school));
    $('acctBtn').textContent = school ? 'School' : 'Personal';
    $('inspAcctP').setAttribute('aria-pressed', String(!school));
    $('inspAcctS').setAttribute('aria-pressed', String(school));
    window.isoAcctIdx = school ? 1 : 0;
    $('acctNote').textContent = school
      ? 'School account opens as your second signed-in Google account. Calendar stays personal.'
      : 'Calendar is personal only.';
    try { localStorage.setItem(KEY, kind); } catch (e) { /* storage unavailable */ }
  }
  let saved = 'personal';
  try { saved = localStorage.getItem(KEY) === 'school' ? 'school' : 'personal'; } catch (e) { /* ignore */ }
  $('acctPersonal').onclick = () => apply('personal');
  $('acctBtn').onclick = () => apply($('acctSchool').getAttribute('aria-pressed') === 'true' ? 'personal' : 'school');
  $('acctSchool').onclick = () => apply('school');
  apply(saved);
  $('inspAcctP').onclick = () => apply('personal');
  $('inspAcctS').onclick = () => apply('school');

  // Google Docs/Slides/Gmail/Drive links follow the chosen account; Calendar stays personal.
  const GOOGLE_HOST = /^(docs|mail|drive)\.google\.com$/;
  function acctize(url, u) {
    try {
      const x = new URL(url);
      if (!GOOGLE_HOST.test(x.host)) return url;
      if (/\/u\/\d+\//.test(x.pathname)) x.pathname = x.pathname.replace(/\/u\/\d+\//, `/u/${u}/`);
      else x.searchParams.set('authuser', u);
      return x.toString();
    } catch (e) { return url; }
  }
  const card = $('inspectCard');
  card.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a) a.href = acctize(a.href, window.isoAcctIdx || 0);
  }, true);
  const web = $('inspWeb');
  const sync = () => { $('inspAcct').hidden = !GOOGLE_HOST.test((web.href && web.href !== '#' ? new URL(web.href, location.href).host : '')); };
  new MutationObserver(sync).observe(web, { attributes: true, attributeFilter: ['href', 'hidden'] });
  sync();
})();

(function () {
  const btn = document.getElementById('autoRotBtn');
  const KEY = 'isocity-autorotate';
  const EVERY = 8000;
  let timer = null;
  const card = () => document.getElementById('inspectCard');
  function tick() {
    // Skip while a building card is open or the tab is hidden so it never rotates under the user.
    if (document.hidden || (card() && card().dataset.open === 'true')) return;
    document.getElementById('rotBtn').click();
  }
  function set(on) {
    btn.setAttribute('aria-pressed', String(on));
    clearInterval(timer);
    timer = on ? setInterval(tick, EVERY) : null;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* storage unavailable */ }
  }
  btn.onclick = () => set(btn.getAttribute('aria-pressed') !== 'true');
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
  if (saved) set(true);
})();
