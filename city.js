(() => {
  const N = 26;
  const TW = 64, TH = 32;
  const SAVE_KEY = 'isocity-v5';
  const SLOT_PREFIX = 'isocity-slot-';

  const TYPES = {
    pan:      { name: 'Pan',          cost: 0,   color: '#9aa39d' },
    road:     { name: 'Road',         cost: 10,  color: '#3b3f44' },
    house:    { name: 'House',        cost: 100, color: '#d9a273', pop: 4,  h: 22, inset: 0.2, grow: true },
    apt:      { name: 'Apartment',    cost: 400, color: '#c98a8a', pop: 14, h: 72, inset: 0.12, grow: true },
    shop:     { name: 'Shop',         cost: 250, color: '#e0c25b', jobs: 5, h: 28, inset: 0.1, grow: true },
    office:   { name: 'Office',       cost: 600, color: '#7fa6c9', jobs: 16, h: 118, inset: 0.1, grow: true },
    park:     { name: 'Park',         cost: 150, color: '#8cbf5c', radius: 2 },
    plaza:    { name: 'Plaza',        cost: 300, color: '#c4b59d', radius: 3 },
    clinic:   { name: 'Clinic',       cost: 350, color: '#d95f59', jobs: 6, h: 30, inset: 0.12, radius: 4 },
    school:   { name: 'School',       cost: 450, color: '#5f8c7a', jobs: 8, h: 34, inset: 0.1, radius: 4 },
    windmill: { name: 'Windmill',     cost: 500, color: '#7ea89b', jobs: 3, h: 48, inset: 0.24, radius: 5 },
    wheel:    { name: 'Ferris Wheel', cost: 900, color: '#d67e49', jobs: 6, h: 78, inset: 0.12, radius: 4 },
    upgrade:  { name: 'Upgrade',      cost: 0,   color: '#2e8b7a' },
    forest:   { name: 'Forest',       cost: 5,   color: '#d9a21f' },
    water:    { name: 'Water',        cost: 15,  color: '#3b7378' },
    bridge:   { name: 'Bridge',       cost: 35,  color: '#8e8372' },
    bulldoze: { name: 'Bulldoze',     cost: 0,   color: '#b4513f' },
  };
  const ORDER = [
    'pan', 'road', 'house', 'apt', 'shop', 'office', 'park', 'plaza',
    'clinic', 'school', 'windmill', 'wheel', 'upgrade', 'forest', 'water', 'bulldoze',
  ];
  const ICONS = {
    pan:      '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
    road:     '<path d="M6 3l-2 18M18 3l2 18M12 5v3M12 11v3M12 17v2"/>',
    house:    '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6h6v6"/>',
    apt:      '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    shop:     '<path d="M4 9l1.5-5h13L20 9v2a2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0 2 2 0 0 1-4 0z"/><path d="M5 13v8h14v-8"/>',
    office:   '<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    park:     '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M8 21h8"/>',
    plaza:    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    clinic:   '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
    school:   '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 2 3 3 6 3s6-1 6-3v-5"/>',
    windmill: '<path d="M12 10v11M9 21h6"/><path d="M12 10l-5-4M12 10l6-3M12 10l-1 6"/>',
    wheel:    '<circle cx="12" cy="10" r="7"/><path d="M12 10v0M7 20l5-10 5 10M5 10h14M12 3v14"/>',
    upgrade:  '<path d="M12 19V5M6 11l6-6 6 6"/>',
    forest:   '<path d="M12 3l5 7h-3l4 6H6l4-6H7z"/><path d="M12 16v5"/>',
    water:    '<path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
    bulldoze: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  };
  const LVL_MULT = [1, 1, 1.5, 2.2];

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);

  let grid, levels, money, tool = 'road', taxRate = 1, milestoneReached = 0;
  let workspaceMode = true;
  let cam = { x: 0, y: 0, z: 1 };
  let hover = null, selectedTile = null;
  let cars = [], walkers = [], boats = [], orphansList = [], wheelsList = [], millsList = [], beaconsList = [], housesList = [], waterCells = [];
  let hour = 17.4, auto = false, simSpeed = 1, stats = {};
  let dpr = 1, W = 0, H = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const isRoad = (t) => t === 'road' || t === 'bridge';
  const isWater = (t) => t === 'water' || t === 'bridge';
  const makeLevels = () => Array.from({ length: N }, () => Array(N).fill(1));

  const clinicCov = new Uint8Array(N * N);
  const schoolCov = new Uint8Array(N * N);
  const parkCov = new Uint8Array(N * N);

  let rctx = ctx, rcam = cam;
  let worldDirty = true;
  const dirtyCols = new Set();

  // ---------- motion & particles ----------
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);
  const anims = new Map();
  const animate = (x, y, out, type) => {
    if (reduceMotion) return;
    anims.set(x * 100 + y, { start: performance.now(), dur: out ? 180 : 280, out, type });
  };

  const leaves = Array.from({ length: 14 }, (_, i) => ({
    x: ((i * 197) % 1000) / 1000,
    y: ((i * 353) % 1000) / 1000,
    vx: rnd(0.008, 0.018),
    vy: rnd(0.012, 0.025),
    phase: rnd(0, 6.28),
    col: ['#d9a21f', '#e08a2c', '#c9612f', '#e8b832'][i % 4],
  }));

  const fireflies = Array.from({ length: 12 }, (_, i) => ({
    x: ((i * 271 + 91) % 1000) / 1000,
    y: ((i * 419 + 43) % 1000) / 1000,
    phase: rnd(0, 6.28),
  }));

  const stars = Array.from({ length: 42 }, (_, i) => ({
    x: ((i * 317 + 73) % 1000) / 1000,
    y: ((i * 541 + 29) % 1000) / 1000,
    s: (i % 3 === 0) ? 2 : 1.3,
    phase: rnd(0, 6.28),
  }));

  const smokes = [];
  const popups = [];
  function addPopup(x, y, z, text, color = '#f4f1ea') {
    if (reduceMotion) return;
    popups.push({ x, y, z, text, color, start: performance.now(), dur: 1100 });
  }

  // ---------- sound ----------
  let soundOn = true, audioCtx = null, lastSfx = 0;
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
      if (kind === 'build' || kind === 'upgrade' || kind === 'milestone') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(kind === 'milestone' ? 520 : kind === 'upgrade' ? 420 : 300, t);
        osc.frequency.exponentialRampToValueAtTime(kind === 'milestone' ? 780 : kind === 'upgrade' ? 620 : 440, t + 0.08);
        gain.gain.setValueAtTime(0.048, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
        osc.start(t); osc.stop(t + 0.1);
      } else if (kind === 'bulldoze') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(55, t + 0.07);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
        osc.start(t); osc.stop(t + 0.08);
      } else if (kind === 'undo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.055);
        gain.gain.setValueAtTime(0.045, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.start(t); osc.stop(t + 0.065);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(210, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        osc.start(t); osc.stop(t + 0.05);
      }
    } catch (e) { /* audio blocked */ }
  }

  // ---------- state ----------
  function starter() {
    grid = Array.from({ length: N }, () => Array(N).fill('forest'));
    levels = makeLevels();
    money = 5000;
    hour = 17.4;
    taxRate = 1;
    milestoneReached = 0;
    selectedTile = null;
    const set = (x, y, t, lv = 1) => { if (inb(x, y)) { grid[x][y] = t; levels[x][y] = lv; } };

    let ry = 19;
    for (let rx = 0; rx < N; rx++) {
      set(rx, ry, 'water');
      set(rx, ry + 1, 'water');
      if (rx % 5 === 3 && ry > 12) { ry--; set(rx, ry, 'water'); }
    }

    let y = 4;
    for (let x = 3; x < 23; x++) { set(x, y, 'road'); if (x % 5 === 0) { y += x % 10 === 0 ? 1 : -1; set(x, y, 'road'); } }
    for (let j = 4; j < 21; j++) set(11, j, grid[11][j] === 'water' ? 'bridge' : 'road');
    for (let i = 11; i <= 17; i++) set(i, 14, grid[i][14] === 'water' ? 'bridge' : 'road');
    for (let j = 9; j <= 19; j++) set(17, j, grid[17][j] === 'water' ? 'bridge' : 'road');

    const lots = [];
    for (let x = 0; x < N; x++) for (let j = 0; j < N; j++) {
      if (grid[x][j] !== 'forest') continue;
      const near = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => inb(x+dx,j+dy) && isRoad(grid[x+dx][j+dy]));
      if (near) lots.push([x, j]);
    }
    let k = 0;
    for (const [x, j] of lots) {
      k++;
      if (k % 4 === 0) continue;
      const r = (x * 7 + j * 13) % 13;
      if (k === 8) set(x, j, 'clinic');
      else if (k === 14) set(x, j, 'plaza');
      else if (k === 18) set(x, j, 'school');
      else if (k === 22) set(x, j, 'office', 2);
      else if (k === 26) set(x, j, 'wheel');
      else set(x, j, r < 8 ? 'house' : r < 10 ? 'shop' : r < 12 ? 'park' : 'apt', r < 4 ? 2 : 1);
    }
    set(7, 3, 'windmill');
  }

  let saveTimer = 0;
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, levels, money, hour, taxRate, milestoneReached })); } catch (e) { /* storage unavailable */ }
  }
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(saveNow, 400);
  }
  addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
  addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

  function applySaveData(d) {
    if (!d || !Array.isArray(d.grid) || d.grid.length !== N || !Array.isArray(d.grid[0]) || d.grid[0].length !== N) return false;
    grid = d.grid.map((row) => row.map((t) => (t && TYPES[t]) ? t : null));
    levels = (Array.isArray(d.levels) && d.levels.length === N)
      ? d.levels.map((row) => row.map((v) => Math.max(1, Math.min(3, Number(v) || 1))))
      : makeLevels();
    money = Number.isFinite(d.money) ? d.money : 5000;
    hour = Number.isFinite(d.hour) ? d.hour : 17.4;
    taxRate = Number.isFinite(d.taxRate) ? d.taxRate : 1;
    milestoneReached = Number.isFinite(d.milestoneReached) ? d.milestoneReached : 0;
    selectedTile = null;
    syncTaxUI();
    return true;
  }

  function load() {
    try { return applySaveData(JSON.parse(localStorage.getItem(SAVE_KEY))); }
    catch (e) { return false; }
  }

  // ---------- simulation ----------
  const NB = [[1,0],[-1,0],[0,1],[0,-1]];
  const connected = (x, y) => NB.some(([dx,dy]) => inb(x+dx,y+dy) && isRoad(grid[x+dx][y+dy]));
  const nearWater = (x, y) => NB.some(([dx,dy]) => inb(x+dx,y+dy) && isWater(grid[x+dx][y+dy]));

  function stampMask(mask, cx, cy, r) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= N) continue;
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) + Math.abs(dy) > r + 1) continue;
        const y = cy + dy;
        if (y < 0 || y >= N) continue;
        mask[x * N + y] = 1;
      }
    }
  }

  function cityTier(pop) {
    if (pop >= 1000) return 'Metropolis';
    if (pop >= 500) return 'City';
    if (pop >= 250) return 'Town';
    if (pop >= 100) return 'Village';
    return 'Hamlet';
  }

  function recompute() {
    clinicCov.fill(0);
    schoolCov.fill(0);
    parkCov.fill(0);
    wheelsList = [];
    millsList = [];
    beaconsList = [];
    housesList = [];
    waterCells = [];

    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      if (t === 'clinic' && connected(x, y)) stampMask(clinicCov, x, y, TYPES.clinic.radius);
      else if (t === 'school' && connected(x, y)) stampMask(schoolCov, x, y, TYPES.school.radius);
      else if (t === 'park' || t === 'plaza' || t === 'wheel') stampMask(parkCov, x, y, TYPES[t].radius);
      if (t === 'water') waterCells.push([x, y]);
    }

    let pop = 0, jobs = 0, parks = 0, plazas = 0, wheels = 0, mills = 0, clinics = 0, schools = 0, roads = 0, orphans = 0, blds = 0, trees = 0, waterfront = 0;
    let coveredPop = 0, schooledPop = 0, parkedPop = 0;
    orphansList = [];

    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      if (!t || t === 'water') continue;
      if (t === 'forest') { trees++; continue; }
      if (isRoad(t)) { roads++; continue; }
      if (t === 'park') { parks++; if (nearWater(x, y)) waterfront++; continue; }
      if (t === 'plaza') { plazas++; if (nearWater(x, y)) waterfront++; continue; }
      if (t === 'windmill') { mills++; millsList.push([x, y]); continue; }
      blds++;
      if (!connected(x, y)) { orphans++; orphansList.push([x, y, bldHeight(t, levels[x][y] || 1)]); continue; }
      const lv = levels[x][y] || 1;
      if (t === 'wheel') { wheelsList.push([x, y]); wheels++; }
      if (t === 'clinic') clinics++;
      if (t === 'school') schools++;
      if (t === 'office') beaconsList.push([x, y, bldHeight(t, lv) + (lv >= 3 ? 20 : 12)]);
      if (t === 'house') housesList.push([x, y, bldHeight(t, lv) + 12]);
      const mult = LVL_MULT[lv] || 1;
      const p = Math.round((TYPES[t].pop || 0) * mult);
      const j = Math.round((TYPES[t].jobs || 0) * mult);
      pop += p;
      jobs += j;
      if (nearWater(x, y)) waterfront++;
      if (p > 0) {
        const idx = x * N + y;
        if (clinicCov[idx]) coveredPop += p;
        if (schoolCov[idx]) schooledPop += p;
        if (parkCov[idx]) parkedPop += p;
      }
    }

    const employed = Math.min(pop, jobs);
    const taxIncome = Math.round((employed * 3 + Math.min(pop, jobs * 2) * 0.5) * taxRate);
    const bonusIncome = waterfront * 2 + plazas * 4 + wheels * 14 + mills * 18;
    const roadCost = Math.round(roads * 0.4);
    const civicCost = Math.round(parks * 2 + plazas * 2 + clinics * 4 + schools * 5 + wheels * 4 + mills * 3 + blds * 0.5);
    const income = taxIncome + bonusIncome;
    const upkeep = roadCost + civicCost;

    let happy = 48 + Math.min(parks * 5 + plazas * 6 + wheels * 8 + mills * 3, 28) + Math.min(trees * 0.1, 12) + Math.min(waterfront * 2, 10) - orphans * 6;
    if (taxRate < 0.8) happy += 7;
    else if (taxRate > 1.2) happy -= 8;
    if (pop > 0) {
      happy += (employed / pop - 0.6) * 28;
      happy += (coveredPop / pop) * 8 + (schooledPop / pop) * 8;
    }
    if (jobs > pop * 1.5) happy -= 8;
    happy = Math.max(0, Math.min(100, Math.round(happy)));

    const pct = (n) => pop > 0 ? Math.min(100, Math.round((n / pop) * 100)) : 0;
    stats = {
      tier: cityTier(pop),
      pop, jobs, roads, parks, orphans, waterfront,
      taxIncome, bonusIncome, roadCost, civicCost,
      net: Math.round(income - upkeep), happy,
      healthPct: pct(coveredPop),
      schoolPct: pct(schooledPop),
      leisurePct: pct(parkedPop),
      empPct: pct(employed),
    };

    const MILESTONES = [[100, 'Village', 300], [250, 'Town', 600], [500, 'City', 1200], [1000, 'Metropolis', 2500]];
    for (const [target, title, bonus] of MILESTONES) {
      if (pop >= target && milestoneReached < target) {
        milestoneReached = target;
        money += bonus;
        sfx('milestone');
        flash(`${title} reached! +$${fmt(bonus)} bonus`);
      }
    }

    render_stats();
    if ($('budgetPop').dataset.open === 'true') renderBudget();
    if (selectedTile) renderInspect();
    syncAgents();
  }

  function tryGrow() {
    const minHappy = taxRate < 0.8 ? 58 : taxRate > 1.2 ? 72 : 65;
    if (stats.happy < minHappy || stats.pop === 0) return;
    const candidates = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      const d = t && TYPES[t];
      if (!d || !d.grow || !connected(x, y)) continue;
      const lv = levels[x][y] || 1;
      if (lv >= 3) continue;
      const idx = x * N + y;
      const score = (parkCov[idx] ? 1 : 0) + (nearWater(x, y) ? 1 : 0) + (schoolCov[idx] ? 1 : 0) + (clinicCov[idx] ? 1 : 0);
      if (lv === 1 && score >= 1) candidates.push([x, y, 2]);
      else if (lv === 2 && stats.happy >= 76 && score >= 2) candidates.push([x, y, 3]);
    }
    if (!candidates.length) return;
    const [gx, gy, nlv] = candidates[Math.floor(Math.random() * candidates.length)];
    levels[gx][gy] = nlv;
    animate(gx, gy, false);
    markCol(gx, gy);
    addPopup(gx + 0.5, gy + 0.5, bldHeight(grid[gx][gy], nlv) + 12, `Level ${nlv}!`, '#ffd98a');
    sfx('upgrade');
    recompute();
    scheduleSave();
  }

  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  let toolBtns = [];
  function render_stats() {
    $('sTier').textContent = stats.tier;
    $('sMoney').textContent = '$' + fmt(money);
    $('sPop').textContent = fmt(stats.pop);
    $('sJobs').textContent = fmt(stats.jobs);
    $('sHappy').textContent = stats.happy + '%';
    $('sNet').textContent = (stats.net >= 0 ? '+' : '') + fmt(stats.net);
    for (const b of toolBtns) {
      const op = TYPES[b.dataset.tool].cost > money ? '0.45' : '1';
      if (b.style.opacity !== op) b.style.opacity = op;
    }
  }

  function renderBudget() {
    const meters = [
      ['Employment', stats.empPct],
      ['Health coverage', stats.healthPct],
      ['Education', stats.schoolPct],
      ['Parks & plazas', stats.leisurePct],
    ];
    $('meters').innerHTML = meters.map(([lbl, pct]) => `
      <div class="meter">
        <div class="meter-top"><span>${lbl}</span><span class="tnum">${pct}%</span></div>
        <div class="meter-track"><div class="meter-fill" style="width:${pct}%"></div></div>
      </div>`).join('');
    $('ledger').innerHTML = `
      <div class="ledger-row"><span>Taxes (${Math.round(taxRate * 10)}%)</span><span>+$${fmt(stats.taxIncome)}</span></div>
      <div class="ledger-row"><span>Waterfront, landmarks & wind</span><span>+$${fmt(stats.bonusIncome)}</span></div>
      <div class="ledger-row"><span>Roads & bridges upkeep</span><span>-$${fmt(stats.roadCost)}</span></div>
      <div class="ledger-row"><span>Services & buildings upkeep</span><span>-$${fmt(stats.civicCost)}</span></div>`;
  }

  function syncTaxUI() {
    document.querySelectorAll('.tax-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.tax) - taxRate) < 0.05));
    });
  }

  // ---------- agents ----------
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
    cars = cars.filter((c) => isRoad(grid[c.tx]?.[c.ty]) && isRoad(grid[c.fx]?.[c.fy]));
    walkers = walkers.filter((w) => isRoad(grid[w.tx]?.[w.ty]) && isRoad(grid[w.fx]?.[w.fy]));
    boats = boats.filter((b) => isWater(grid[b.tx]?.[b.ty]) && isWater(grid[b.fx]?.[b.fy]));

    const r = roadTiles();
    if (!r.length) { cars.length = 0; walkers.length = 0; }
    else {
      const wantCars = Math.min(48, Math.floor(r.length / 3));
      while (cars.length < wantCars) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        cars.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.9, 1.7),
          color: ['#c0463a', '#2f5d8a', '#e6e2d6', '#d89a2b', '#3d3f45', '#4f8f6a'][Math.floor(Math.random() * 6)] });
      }
      if (cars.length > wantCars) cars.length = wantCars;

      const wantWalkers = Math.min(24, Math.floor(stats.pop / 8));
      while (walkers.length < wantWalkers) {
        const [x, y] = r[Math.floor(Math.random() * r.length)];
        walkers.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.28, 0.48),
          color: ['#e6ded0', '#c95d43', '#3b6978', '#d4a23a', '#5b7a52'][Math.floor(Math.random() * 5)] });
      }
      if (walkers.length > wantWalkers) walkers.length = wantWalkers;
    }

    const w = waterTiles();
    const wantBoats = Math.min(5, Math.floor(w.length / 12));
    while (boats.length < wantBoats) {
      const [x, y] = w[Math.floor(Math.random() * w.length)];
      boats.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.35, 0.55),
        color: ['#b35a38', '#d8cbb5', '#3d6e70', '#c48f36'][Math.floor(Math.random() * 4)] });
    }
    if (boats.length > wantBoats) boats.length = wantBoats;
  }
  function stepList(list, dt, passable = isRoad) {
    for (const c of list) {
      c.t += dt * c.speed;
      if (c.t >= 1) {
        const opts = NB.map(([dx,dy]) => [c.tx+dx, c.ty+dy]).filter(([x,y]) => inb(x,y) && passable(grid[x][y]));
        if (!opts.length) { c.t = 1; continue; }
        const fwd = opts.filter(([x,y]) => !(x === c.fx && y === c.fy));
        const pool = fwd.length ? fwd : opts;
        const [nx, ny] = pool[Math.floor(Math.random() * pool.length)];
        c.fx = c.tx; c.fy = c.ty; c.tx = nx; c.ty = ny; c.t = 0;
      }
      c.px = c.fx + (c.tx - c.fx) * c.t;
      c.py = c.fy + (c.ty - c.fy) * c.t;
    }
  }

  // ---------- projection ----------
  const px = (x, y) => (x - y) * (TW / 2) * rcam.z + rcam.x;
  const py = (x, y, z = 0) => (x + y) * (TH / 2) * rcam.z + rcam.y - z * rcam.z;
  function pick(mx, my) {
    const u = (mx - cam.x) / cam.z / (TW / 2);
    const v = (my - cam.y) / cam.z / (TH / 2);
    const x = Math.floor((u + v) / 2), y = Math.floor((v - u) / 2);
    return inb(x, y) ? [x, y] : null;
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
    out = `rgb(${f(r,0)},${f(g,1)},${f(b,2)})`;
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
    poly4(px(x0,y0), py(x0,y0,z), px(x1,y0), py(x1,y0,z), px(x1,y1), py(x1,y1,z), px(x0,y1), py(x0,y1,z), fill);
  }

  function castShadow(x0, y0, x1, y1, h) {
    const sx = Math.min(0.65, h * 0.0065), sy = Math.min(0.32, h * 0.003);
    poly4(
      px(x1, y0), py(x1, y0, 0),
      px(x1 + sx, y0 + sy), py(x1 + sx, y0 + sy, 0),
      px(x1 + sx, y1 + sy), py(x1 + sx, y1 + sy, 0),
      px(x0 + sx, y1 + sy), py(x0 + sx, y1 + sy, 0),
      'rgba(10, 18, 12, 0.22)'
    );
    poly4(
      px(x0, y1), py(x0, y1, 0),
      px(x1, y1), py(x1, y1, 0),
      px(x1 + sx, y1 + sy), py(x1 + sx, y1 + sy, 0),
      px(x0 + sx, y1 + sy), py(x0 + sx, y1 + sy, 0),
      'rgba(10, 18, 12, 0.22)'
    );
  }

  function box(x0, y0, x1, y1, z0, z1, color, L, opts = {}) {
    poly4(px(x0,y1), py(x0,y1,z0), px(x1,y1), py(x1,y1,z0), px(x1,y1), py(x1,y1,z1), px(x0,y1), py(x0,y1,z1), shade(color, 0.82, L));
    poly4(px(x1,y0), py(x1,y0,z0), px(x1,y1), py(x1,y1,z0), px(x1,y1), py(x1,y1,z1), px(x1,y0), py(x1,y0,z1), shade(color, 0.64, L));
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
        poly4(px(lx0,y1), py(lx0,y1,zz0), px(lx1,y1), py(lx1,y1,zz0), px(lx1,y1), py(lx1,y1,zz1), px(lx0,y1), py(lx0,y1,zz1), lit ? '#ffd98a' : darkL);
        const ry0 = y0 + dy * a, ry1 = y0 + dy * b;
        poly4(px(x1,ry0), py(x1,ry0,zz0), px(x1,ry1), py(x1,ry1,zz0), px(x1,ry1), py(x1,ry1,zz1), px(x1,ry0), py(x1,ry0,zz1), lit ? '#f0b862' : darkR);
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
        poly4(px(lx0,y1), py(lx0,y1,zz0), px(lx1,y1), py(lx1,y1,zz0), px(lx1,y1), py(lx1,y1,zz1), px(lx0,y1), py(lx0,y1,zz1), '#ffd98a');
        const ry0 = y0 + dy * a, ry1 = y0 + dy * b;
        poly4(px(x1,ry0), py(x1,ry0,zz0), px(x1,ry1), py(x1,ry1,zz0), px(x1,ry1), py(x1,ry1,zz1), px(x1,ry0), py(x1,ry0,zz1), '#f0b862');
      }
    }
  }

  function drawWater(x, y, L) {
    quadZ(x, y, x + 1, y + 1, -5, shade((x + y) % 2 ? '#295b60' : '#26565b', 1, L));
    if ((x * 3 + y * 5) % 4 === 0) {
      poly4(px(x + 0.2, y + 0.35), py(x + 0.2, y + 0.35, -5), px(x + 0.75, y + 0.35), py(x + 0.75, y + 0.35, -5),
        px(x + 0.85, y + 0.47), py(x + 0.85, y + 0.47, -5), px(x + 0.3, y + 0.47), py(x + 0.3, y + 0.47, -5),
        shade('#3c7b80', 1, L));
    }
    if (inb(x - 1, y) && !isWater(grid[x - 1][y])) {
      poly4(px(x, y), py(x, y, 0), px(x, y + 1), py(x, y + 1, 0), px(x, y + 1), py(x, y + 1, -5), px(x, y), py(x, y, -5), shade('#5b4c39', 1, L));
    }
    if (inb(x, y - 1) && !isWater(grid[x][y - 1])) {
      poly4(px(x, y), py(x, y, 0), px(x + 1, y), py(x + 1, y, 0), px(x + 1, y), py(x + 1, y, -5), px(x, y), py(x, y, -5), shade('#6b5a44', 1, L));
    }
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

  const CROWNS = [
    ['#2c5a2b', '#3f7a35'], ['#3a6b2e', '#5a8f3c'], ['#c98a14', '#e8b832'],
    ['#d9a21f', '#f0c64a'], ['#b8601a', '#e08a2c'], ['#8a9a2a', '#b7b93a'],
  ];
  const SPR_W = 36, SPR_H = 42, SPR_CX = 16, SPR_CY = 14, SPR_S = 2;
  const crownSprites = CROWNS.map(([dark, light]) => {
    const c = document.createElement('canvas');
    c.width = SPR_W * SPR_S; c.height = SPR_H * SPR_S;
    const sc = c.getContext('2d');
    sc.setTransform(SPR_S, 0, 0, SPR_S, 0, 0);
    const R = 10;
    sc.fillStyle = '#16301a';
    sc.beginPath(); sc.ellipse(SPR_CX + 3, SPR_CY + 14, R * 0.95, R * 0.45, 0, 0, 7); sc.fill();
    sc.fillStyle = dark;
    sc.beginPath(); sc.arc(SPR_CX, SPR_CY, R, 0, 7); sc.fill();
    sc.fillStyle = light;
    sc.beginPath(); sc.arc(SPR_CX - R * 0.25, SPR_CY - R * 0.3, R * 0.68, 0, 7); sc.fill();
    return c;
  });

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
    const base = t === 'forest' ? ((x + y) % 2 ? '#2a4a28' : '#274524')
      : t === 'park' ? '#86b65f' : ((x + y) % 2 ? '#7da663' : '#74a05a');
    quadZ(x, y, x + 1, y + 1, 0, shade(base, 1, L));
  }

  function drawWheelBase(x, y, L, hs = 1) {
    quadZ(x + 0.08, y + 0.08, x + 0.92, y + 0.92, 0.5, shade('#c8baa3', 1, L));
    rctx.strokeStyle = shade('#d9d4c9', 1, L);
    rctx.lineWidth = Math.max(1.5, 2.5 * rcam.z);
    const cx = px(x + 0.5, y + 0.5), cy = py(x + 0.5, y + 0.5, 42 * hs);
    rctx.beginPath();
    rctx.moveTo(px(x + 0.22, y + 0.25), py(x + 0.22, y + 0.25, 1)); rctx.lineTo(cx, cy);
    rctx.moveTo(px(x + 0.78, y + 0.75), py(x + 0.78, y + 0.75, 1)); rctx.lineTo(cx, cy);
    rctx.stroke();
  }

  function drawWheelSpin(x, y, now, L) {
    const cx = px(x + 0.5, y + 0.5), cy = py(x + 0.5, y + 0.5, 42);
    const rx = 20 * rcam.z, ry = 26 * rcam.z;
    const ang = (now * 0.00055 * (simSpeed || 0)) || 0.4;
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
    const ang = (now * 0.002 * (simSpeed || 0)) || 0.3;
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

  function drawTile(x, y, t, L, hs = 1, skipGround = false) {
    if (!skipGround && t !== 'road' && t !== 'bridge') drawGround(x, y, t, L);
    if (!t || t === 'water') return;
    if (t === 'forest') {
      const sd = x * 17 + y * 31;
      for (let i = 0; i < 5; i++) {
        const [a, b] = FOREST_SPOTS[i];
        const sc = (0.8 + ((Math.imul(sd + i * 331, 2246822519) >>> 24) % 4) * 0.1) * hs;
        const cs = Math.imul(sd + i * 977, 2654435761) >>> 20;
        tree(x + a, y + b, sc, L, cs);
      }
      return;
    }
    if (t === 'road' || t === 'bridge') {
      if (hs < 1) rctx.globalAlpha = hs;
      drawRoad(x, y, L, t === 'bridge', skipGround);
      if (hs < 1) rctx.globalAlpha = 1;
      return;
    }
    if (t === 'park') {
      quadZ(x + 0.12, y + 0.44, x + 0.88, y + 0.56, 0.2, shade('#cfc3aa', 1, L));
      box(x + 0.44, y + 0.36, x + 0.58, y + 0.42, 0.2, 2.5 * hs, '#7a5436', L);
      const sd = x * 7 + y * 3;
      tree(x + 0.26, y + 0.26, hs, L, 0);
      tree(x + 0.74, y + 0.65, 0.85 * hs, L, 1);
      if (sd % 2) tree(x + 0.3, y + 0.78, 0.7 * hs, L, 0);
      return;
    }
    if (t === 'plaza') {
      if (!skipGround) castShadow(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 10 * hs);
      quadZ(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.5, shade('#c8baa3', 1, L));
      box(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0.5, 4 * hs, '#a79a86', L, { roof: '#3c7b80' });
      box(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 4 * hs, 11 * hs, '#dcd3c2', L, { roof: '#ffd98a' });
      return;
    }
    if (t === 'wheel') {
      if (!skipGround) castShadow(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 52 * hs);
      drawWheelBase(x, y, L, hs);
      return;
    }
    if (t === 'windmill') {
      if (!skipGround) castShadow(x + 0.38, y + 0.38, x + 0.62, y + 0.62, 46 * hs);
      quadZ(x + 0.24, y + 0.24, x + 0.76, y + 0.76, 1, shade('#b6ab96', 1, L));
      box(x + 0.41, y + 0.41, x + 0.59, y + 0.59, 1, 48 * hs, '#ebe6da', L, { roof: '#7ea89b' });
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
    const H = Math.max(1, bldHeight(t, lv) * hs);
    if (!skipGround && hs > 0.5) castShadow(x + i, y + i, x + 1 - i, y + 1 - i, H);
    box(x + i, y + i, x + 1 - i, y + 1 - i, 0, H, wall, L, { roof, windows: hs > 0.6 ? seed : 0, glass: t === 'office' });

    if (t === 'shop' && hs > 0.6) {
      poly4(
        px(x + i, y + 1 - i + 0.04), py(x + i, y + 1 - i + 0.04, 16),
        px(x + 1 - i, y + 1 - i + 0.04), py(x + 1 - i, y + 1 - i + 0.04, 16),
        px(x + 1 - i, y + 1 - i + 0.13), py(x + 1 - i, y + 1 - i + 0.13, 11),
        px(x + i, y + 1 - i + 0.13), py(x + i, y + 1 - i + 0.13, 11),
        shade('#c0463a', 1, L)
      );
    }
    if (t === 'house') {
      const r0x = px(x + i, y + 0.5), r0y = py(x + i, y + 0.5, H + 10 * hs);
      const r1x = px(x + 1 - i, y + 0.5), r1y = py(x + 1 - i, y + 0.5, H + 10 * hs);
      poly4(px(x + i, y + i), py(x + i, y + i, H), px(x + 1 - i, y + i), py(x + 1 - i, y + i, H), r1x, r1y, r0x, r0y, shade(red, 1.0, L));
      poly4(px(x + i, y + 1 - i), py(x + i, y + 1 - i, H), px(x + 1 - i, y + 1 - i), py(x + 1 - i, y + 1 - i, H), r1x, r1y, r0x, r0y, shade(red, 0.78, L));
      if (hs > 0.7) box(x + 0.64, y + 0.34, x + 0.73, y + 0.43, H + 3 * hs, H + 13 * hs, '#8a4a3a', L, { roof: '#5a3a30' });
    }
    if (t === 'clinic' && hs > 0.7) {
      quadZ(x + 0.34, y + 0.44, x + 0.66, y + 0.56, H + 0.5, shade('#c8443d', 1, L));
      quadZ(x + 0.44, y + 0.34, x + 0.56, y + 0.66, H + 0.5, shade('#c8443d', 1, L));
    }
    if (t === 'school' && hs > 0.7) {
      box(x + 0.36, y + 0.36, x + 0.64, y + 0.64, H, H + 9 * hs, '#e9e3d5', L, { roof: '#3d5856' });
    }
    if ((t === 'apt' || t === 'office') && lv >= 2 && hs > 0.7) {
      const th = lv >= 3 ? 12 * hs : 7 * hs;
      box(x + 0.24, y + 0.24, x + 0.76, y + 0.76, H, H + th, wall, L, { roof });
    }
    if (t === 'office' && hs > 0.8) {
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
        const key = x * 100 + y;
        rctx = wctx;
        if (anims.has(key)) drawGround(x, y, grid[x][y], 1);
        else {
          drawTile(x, y, grid[x][y], 1, 1, false);
          rctx = nctx;
          drawTileNight(x, y, grid[x][y]);
        }
      }
    }
    warm = savedW;
    worldDirty = false;
    dirtyCols.clear();
  }

  function patchColumn(u) {
    const savedW = warm; warm = 0;
    rcam = { x: OX, y: OY, z: 1 };
    const clipX = Math.max(0, OX + u * (TW / 2) - 52);
    const clipW = Math.min(WW - clipX, 104);

    rctx = wctx;
    wctx.save();
    wctx.setTransform(WS, 0, 0, WS, 0, 0);
    wctx.beginPath(); wctx.rect(clipX, 0, clipW, WH); wctx.clip();
    wctx.clearRect(clipX, 0, clipW, WH);
    drawSlab(1);

    rctx = nctx;
    nctx.save();
    nctx.setTransform(1, 0, 0, 1, 0, 0);
    nctx.beginPath(); nctx.rect(clipX, 0, clipW, WH); nctx.clip();
    nctx.clearRect(clipX, 0, clipW, WH);

    for (let s = 0; s <= 2 * N - 2; s++) {
      for (let x = Math.max(0, s - N + 1); x <= Math.min(N - 1, s); x++) {
        const y = s - x;
        if (Math.abs((x - y) - u) > 2) continue;
        const key = x * 100 + y;
        rctx = wctx;
        if (anims.has(key)) drawGround(x, y, grid[x][y], 1);
        else {
          drawTile(x, y, grid[x][y], 1, 1, false);
          rctx = nctx;
          drawTileNight(x, y, grid[x][y]);
        }
      }
    }
    wctx.restore();
    nctx.restore();
    warm = savedW;
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
        ov.push({ k: 0, s: tx + ty, x: tx, y: ty, t, hs: 1 });
      }
    }
  }

  function draw(now, dt) {
    const L = daylight(hour);
    warm = Math.max(0, 1 - Math.abs(hour - 17.6) / 2.2, 1 - Math.abs(hour - 6.4) / 1.6);

    if (worldDirty) buildWorld();
    else if (dirtyCols.size) {
      if (dirtyCols.size > 18) buildWorld();
      else {
        for (const u of dirtyCols) patchColumn(u);
        dirtyCols.clear();
      }
    }

    rctx = ctx;
    rcam = cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = mix('#07110c', '#1f3b2a', L);
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

    if (anims.size) {
      for (const [key, an] of anims) {
        const x = (key / 100) | 0, y = key % 100;
        const p = Math.min(1, (now - an.start) / an.dur);
        if (p >= 1) {
          anims.delete(key);
          dirtyCols.add(x - y);
        } else {
          const hs = an.out ? 1 - easeOut(p) : easeOut(p);
          const t = an.out ? an.type : grid[x][y];
          seen[x * N + y] = 1;
          ov.push({ k: 0, s: x + y, x, y, t, hs });
        }
      }
    }

    for (let i = 0; i < wheelsList.length; i++) {
      const [wx, wy] = wheelsList[i];
      if (!anims.has(wx * 100 + wy)) ov.push({ k: 4, s: wx + wy + 0.1, x: wx, y: wy });
    }
    for (let i = 0; i < millsList.length; i++) {
      const [mx, my] = millsList[i];
      if (!anims.has(mx * 100 + my)) ov.push({ k: 5, s: mx + my + 0.1, x: mx, y: my });
    }

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

    for (let i = 0; i < boats.length; i++) {
      const b = boats[i];
      const bx0 = px(b.px + 0.5, b.py + 0.5), by0 = py(b.px + 0.5, b.py + 0.5);
      if (bx0 < -40 || bx0 > W + 40 || by0 < -40 || by0 > H + 40) continue;
      ov.push({ k: 3, s: b.px + b.py, b });
      const rx = Math.round(b.px), ry = Math.round(b.py);
      if (inb(rx, ry) && grid[rx][ry] === 'bridge' && !seen[rx * N + ry]) {
        seen[rx * N + ry] = 1;
        ov.push({ k: 0, s: rx + ry + 1.1, x: rx, y: ry, t: 'bridge', hs: 1 });
      }
      addOccluders(Math.floor(b.px), Math.floor(b.py));
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
        else drawTile(it.x, it.y, it.t, 1, it.hs, it.t !== 'bridge');
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
    if (L < 0.5 && cars.length) {
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
      if (smokes.length < 10 && Math.random() < 0.08 * (simSpeed || 0.2)) {
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

    if (orphansList.length) {
      const bob = Math.sin(now / 260) * 3;
      const rad = 9 * cam.z;
      ctx.font = `700 ${Math.round(12 * cam.z)}px system-ui`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < orphansList.length; i++) {
        const [ox0, oy0, oh] = orphansList[i];
        if (anims.has(ox0 * 100 + oy0)) continue;
        const bx = px(ox0 + 0.5, oy0 + 0.5), by = py(ox0 + 0.5, oy0 + 0.5, oh + 22 + bob);
        ctx.fillStyle = '#b4513f';
        ctx.beginPath(); ctx.arc(bx, by, rad, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('!', bx, by + 1);
      }
    }

    if (popups.length) {
      ctx.font = `700 ${Math.round(13 * cam.z)}px system-ui`;
      ctx.textAlign = 'center';
      for (let i = popups.length - 1; i >= 0; i--) {
        const pp = popups[i];
        const p = (now - pp.start) / pp.dur;
        if (p >= 1) { popups.splice(i, 1); continue; }
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = pp.color;
        ctx.fillText(pp.text, px(pp.x, pp.y), py(pp.x, pp.y, pp.z + p * 26));
      }
      ctx.globalAlpha = 1;
    }

    const focusTile = hover || selectedTile;
    if (focusTile) {
      const [x, y] = focusTile;
      const ht = grid[x][y];
      const covType = TYPES[tool].radius ? tool : (ht && TYPES[ht].radius ? ht : null);
      if (covType) {
        const r = TYPES[covType].radius;
        const ccol = TYPES[covType].color + '38';
        for (let dx = -r; dx <= r; dx++) {
          const tx = x + dx; if (tx < 0 || tx >= N) continue;
          for (let dy = -r; dy <= r; dy++) {
            if (Math.abs(dx) + Math.abs(dy) > r + 1) continue;
            const ty = y + dy; if (ty < 0 || ty >= N) continue;
            quadZ(tx, ty, tx + 1, ty + 1, 0, ccol);
          }
        }
      }
    }

    if (hover && tool !== 'pan') {
      const [x, y] = hover;
      const bad = !canApply(x, y);
      const col = tool === 'bulldoze' ? '#b4513f' : bad ? '#b4513f' : '#0f766e';
      quadZ(x, y, x + 1, y + 1, 0, col + '88');
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(x,y), py(x,y)); ctx.lineTo(px(x+1,y), py(x+1,y));
      ctx.lineTo(px(x+1,y+1), py(x+1,y+1)); ctx.lineTo(px(x,y+1), py(x,y+1));
      ctx.closePath(); ctx.stroke();
    } else if (selectedTile) {
      const [x, y] = selectedTile;
      ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(x,y), py(x,y)); ctx.lineTo(px(x+1,y), py(x+1,y));
      ctx.lineTo(px(x+1,y+1), py(x+1,y+1)); ctx.lineTo(px(x,y+1), py(x,y+1));
      ctx.closePath(); ctx.stroke();
    }

    if (L < 0.6) {
      ctx.globalAlpha = (0.6 - L) * 0.6;
      ctx.drawImage(vigCanvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- actions & rotation ----------
  function upgradeCost(t) { return Math.round(TYPES[t].cost * 0.6); }
  function nextTile(cur, t) {
    if (t === 'bulldoze') return cur === 'bridge' ? 'water' : null;
    if (t === 'upgrade') return (cur && TYPES[cur]?.grow) ? cur : null;
    if (t === 'road' && cur === 'water') return 'bridge';
    if (t === 'water') return (!cur || cur === 'forest') ? 'water' : null;
    if (t === 'forest') return !cur ? 'forest' : null;
    return (!cur || cur === 'forest') ? t : null;
  }
  function tileCost(cur, t) {
    if (t === 'upgrade') return cur && TYPES[cur]?.grow ? upgradeCost(cur) : 0;
    if (t === 'road' && cur === 'water') return TYPES.bridge.cost;
    return TYPES[t].cost;
  }
  function canApply(x, y) {
    const cur = grid[x][y];
    if (tool === 'pan') return false;
    if (tool === 'bulldoze') return !!cur;
    if (tool === 'upgrade') return !!(cur && TYPES[cur]?.grow && (levels[x][y] || 1) < 3 && upgradeCost(cur) <= money);
    const nxt = nextTile(cur, tool);
    return !!nxt && tileCost(cur, tool) <= money;
  }

  const history = [], redoStack = [];
  let strokeId = 0;
  function syncUndoUI() {
    $('undoBtn').disabled = !history.length;
    $('redoBtn').disabled = !redoStack.length;
  }
  function markCol(x, y) {
    dirtyCols.add(x - y);
    dirtyCols.add(x - y + 1);
    dirtyCols.add(x - y - 1);
  }
  function apply(x, y, forceTool = tool) {
    const cur = grid[x][y];
    if (forceTool === 'pan') return;
    if (forceTool === 'bulldoze') {
      if (!cur) return;
      const nxt = nextTile(cur, 'bulldoze');
      const prevLv = levels[x][y] || 1;
      history.push({ x, y, prev: cur, next: nxt, prevLv, nextLv: 1, cost: 0, stroke: strokeId });
      redoStack.length = 0;
      grid[x][y] = nxt;
      levels[x][y] = 1;
      animate(x, y, true, cur);
      sfx('bulldoze');
    } else if (forceTool === 'upgrade') {
      if (!cur || !TYPES[cur]?.grow) return;
      const prevLv = levels[x][y] || 1;
      if (prevLv >= 3) return flash('Already max level');
      const cost = upgradeCost(cur);
      if (cost > money) return flash('Not enough funds');
      const nextLv = prevLv + 1;
      history.push({ x, y, prev: cur, next: cur, prevLv, nextLv, cost, stroke: strokeId });
      redoStack.length = 0;
      levels[x][y] = nextLv;
      money -= cost;
      animate(x, y, false);
      addPopup(x + 0.5, y + 0.5, bldHeight(cur, nextLv) + 12, `Level ${nextLv}!`, '#ffd98a');
      sfx('upgrade');
    } else {
      const nxt = nextTile(cur, forceTool);
      if (!nxt) return;
      const cost = tileCost(cur, forceTool);
      if (cost > money) return flash('Not enough funds');
      const prevLv = levels[x][y] || 1;
      history.push({ x, y, prev: cur, next: nxt, prevLv, nextLv: 1, cost, stroke: strokeId });
      redoStack.length = 0;
      grid[x][y] = nxt; money -= cost;
      levels[x][y] = 1;
      animate(x, y, false);
      sfx(nxt === 'road' || nxt === 'bridge' || nxt === 'water' || nxt === 'forest' ? 'tap' : 'build');
    }
    if (history.length > 400) history.shift();
    markCol(x, y);
    syncUndoUI();
    recompute(); scheduleSave();
  }

  function undo() {
    if (!history.length) return flash('Nothing to undo');
    const sid = history[history.length - 1].stroke;
    while (history.length && history[history.length - 1].stroke === sid) {
      const h = history.pop();
      const cur = grid[h.x][h.y];
      grid[h.x][h.y] = h.prev;
      levels[h.x][h.y] = h.prevLv || 1;
      if (h.prev) animate(h.x, h.y, false);
      else animate(h.x, h.y, true, cur);
      money += h.cost;
      redoStack.push(h);
      markCol(h.x, h.y);
    }
    sfx('undo');
    syncUndoUI();
    recompute(); scheduleSave();
  }

  function redo() {
    if (!redoStack.length) return flash('Nothing to redo');
    const sid = redoStack[redoStack.length - 1].stroke;
    let totalCost = 0;
    for (let i = redoStack.length - 1; i >= 0 && redoStack[i].stroke === sid; i--) totalCost += redoStack[i].cost;
    if (totalCost > money) return flash('Not enough funds');
    while (redoStack.length && redoStack[redoStack.length - 1].stroke === sid) {
      const h = redoStack.pop();
      const cur = grid[h.x][h.y];
      grid[h.x][h.y] = h.next;
      levels[h.x][h.y] = h.nextLv || 1;
      if (h.next) animate(h.x, h.y, false);
      else animate(h.x, h.y, true, cur);
      money -= h.cost;
      history.push(h);
      markCol(h.x, h.y);
    }
    sfx('build');
    syncUndoUI();
    recompute(); scheduleSave();
  }

  function rotateCity(cw = true) {
    const ng = Array.from({ length: N }, () => Array(N).fill(null));
    const nl = makeLevels();
    const rx = (x, y) => cw ? N - 1 - y : y;
    const ry = (x, y) => cw ? x : N - 1 - x;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const nx = rx(x, y), ny = ry(x, y);
      ng[nx][ny] = grid[x][y];
      nl[nx][ny] = levels[x][y];
    }
    grid = ng; levels = nl;
    for (const list of [cars, walkers, boats]) {
      for (const c of list) {
        const fx = rx(c.fx, c.fy), fy = ry(c.fx, c.fy);
        const tx = rx(c.tx, c.ty), ty = ry(c.tx, c.ty);
        c.fx = fx; c.fy = fy; c.tx = tx; c.ty = ty;
        c.px = c.fx + (c.tx - c.fx) * c.t;
        c.py = c.fy + (c.ty - c.fy) * c.t;
      }
    }
    for (const st of [history, redoStack]) {
      for (const h of st) { const nx = rx(h.x, h.y), ny = ry(h.x, h.y); h.x = nx; h.y = ny; }
    }
    if (selectedTile) selectedTile = [rx(selectedTile[0], selectedTile[1]), ry(selectedTile[0], selectedTile[1])];
    anims.clear(); smokes.length = 0;
    worldDirty = true;
    recompute(); scheduleSave();
    sfx('tap');
  }

  let flashTimer = 0;
  function flash(msg) {
    const tip = $('tip'); tip.textContent = msg; tip.hidden = false;
    tip.style.transform = `translate3d(${Math.round(W / 2 - 90)}px, 84px, 0)`;
    lastTipKey = '';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashTimer = 0; tip.hidden = true; }, 1600);
  }

  function describe(x, y) {
    const t = grid[x][y];
    if (!t) return null;
    if (t === 'road') return 'Road';
    if (t === 'bridge') return 'Bridge. Connects roads across water.';
    if (t === 'water') return 'Water. Build roads across it for bridges, or place homes beside it for a waterfront bonus.';
    if (t === 'park') return 'Park. Raises happiness.' + (nearWater(x, y) ? ' Waterfront bonus.' : '');
    if (t === 'plaza') return 'Town Plaza. Boosts nearby happiness and income.' + (nearWater(x, y) ? ' Waterfront bonus.' : '');
    if (t === 'forest') return 'Forest. Clear it with Bulldoze, or build over it.';
    const d = TYPES[t];
    const lv = levels[x][y] || 1;
    const mult = LVL_MULT[lv] || 1;
    if (t === 'windmill') return `Windmill, ${d.jobs} jobs. Generates clean energy income (+$18/tick) and raises happiness.`;
    if (!connected(x, y)) return `${d.name}. No road access, so it does not count.`;
    if (t === 'clinic') return `Clinic, ${d.jobs} jobs. Boosts nearby health and happiness.`;
    if (t === 'school') return `School, ${d.jobs} jobs. Helps nearby buildings grow.`;
    if (t === 'wheel') return `Ferris Wheel, ${d.jobs} jobs. Landmark boosting nearby happiness and income.`;
    const val = d.pop ? `${Math.round(d.pop * mult)} residents` : `${Math.round(d.jobs * mult)} jobs`;
    const tags = [];
    if (d.grow) tags.push(`Level ${lv}`);
    if (nearWater(x, y)) tags.push('Waterfront');
    const idx = x * N + y;
    if (d.pop && clinicCov[idx]) tags.push('Clinic');
    if (d.pop && schoolCov[idx]) tags.push('School');
    return `${d.name} (${tags.join(', ')}), ${val}.` + (tool === 'upgrade' && lv < 3 ? ` Click to upgrade ($${upgradeCost(t)}).` : '');
  }

  // ---------- tile inspector & popovers ----------
  function renderInspect() {
    const card = $('inspectCard');
    if (!selectedTile) { card.dataset.open = 'false'; return; }
    const [x, y] = selectedTile;
    const t = grid[x][y];
    if (!t) { selectedTile = null; card.dataset.open = 'false'; return; }
    const d = TYPES[t];
    const lv = levels[x][y] || 1;
    $('inspTitle').textContent = d.grow ? `${d.name} (Level ${lv}/3)` : d.name;
    $('inspBody').textContent = describe(x, y) || '';
    const up = $('inspUpgrade');
    if (d.grow && lv < 3) {
      const uc = upgradeCost(t);
      up.hidden = false;
      up.textContent = `Upgrade ($${uc})`;
      up.disabled = uc > money;
    } else {
      up.hidden = true;
    }
    $('inspDemolish').textContent = t === 'bridge' ? 'Remove bridge' : 'Demolish';
    card.dataset.open = 'true';
  }
  $('inspClose').onclick = () => { selectedTile = null; renderInspect(); };
  $('inspUpgrade').onclick = () => {
    if (!selectedTile) return;
    strokeId++;
    apply(selectedTile[0], selectedTile[1], 'upgrade');
    renderInspect();
  };
  $('inspDemolish').onclick = () => {
    if (!selectedTile) return;
    strokeId++;
    apply(selectedTile[0], selectedTile[1], 'bulldoze');
    if (!grid[selectedTile[0]][selectedTile[1]]) selectedTile = null;
    renderInspect();
  };

  function setPop(id, btnId, open) {
    const pop = $(id), btn = $(btnId);
    if (open) {
      if (id === 'citiesPop') { renderSlots(); setPop('budgetPop', 'budgetBtn', false); }
      if (id === 'budgetPop') { renderBudget(); setPop('citiesPop', 'citiesBtn', false); }
    }
    pop.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
  }
  $('budgetBtn').onclick = (e) => { e.stopPropagation(); setPop('budgetPop', 'budgetBtn', $('budgetPop').dataset.open !== 'true'); };
  $('citiesBtn').onclick = (e) => { e.stopPropagation(); setPop('citiesPop', 'citiesBtn', $('citiesPop').dataset.open !== 'true'); };

  document.querySelectorAll('.tax-btn').forEach((b) => {
    b.onclick = () => {
      taxRate = Number(b.dataset.tax);
      syncTaxUI();
      recompute();
      scheduleSave();
      sfx('tap');
    };
  });

  function renderSlots() {
    const list = $('slotList');
    list.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(SLOT_PREFIX + i)); } catch (e) {}
      const row = document.createElement('div');
      row.className = 'slot';
      const meta = document.createElement('div');
      meta.className = 'slot-meta';
      const sub = saved ? `${fmt(saved.pop || 0)} residents, $${fmt(saved.money || 0)}` : 'Empty slot';
      meta.innerHTML = `<span class="slot-title">Slot ${i}</span><span class="slot-sub">${sub}</span>`;
      const saveBtn = document.createElement('button');
      saveBtn.className = 'chip small'; saveBtn.type = 'button'; saveBtn.textContent = 'Save';
      saveBtn.onclick = () => {
        try {
          localStorage.setItem(SLOT_PREFIX + i, JSON.stringify({ grid, levels, money, hour, taxRate, milestoneReached, pop: stats.pop }));
          sfx('build');
          renderSlots();
        } catch (e) { flash('Storage full'); }
      };
      const loadBtn = document.createElement('button');
      loadBtn.className = 'chip small'; loadBtn.type = 'button'; loadBtn.textContent = 'Load';
      loadBtn.disabled = !saved;
      loadBtn.onclick = () => {
        if (!saved || !applySaveData(saved)) return;
        history.length = 0; redoStack.length = 0; syncUndoUI();
        worldDirty = true; recompute(); saveNow(); center();
        sfx('undo');
        setPop('citiesPop', 'citiesBtn', false);
      };
      row.append(meta, saveBtn, loadBtn);
      list.appendChild(row);
    }
  }

  addEventListener('pointerdown', (e) => {
    const cp = $('citiesPop'), bp = $('budgetPop');
    if (cp.dataset.open === 'true' && !cp.contains(e.target) && e.target !== $('citiesBtn')) setPop('citiesPop', 'citiesBtn', false);
    if (bp.dataset.open === 'true' && !bp.contains(e.target) && e.target !== $('budgetBtn')) setPop('budgetPop', 'budgetBtn', false);
  });

  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ grid, levels, money, hour, taxRate, milestoneReached }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'isocity-save.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('pngBtn').onclick = () => {
    const prevHover = hover, prevSel = selectedTile;
    hover = null; selectedTile = null;
    draw(performance.now(), 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'isocity-snapshot.png';
    a.click();
    hover = prevHover; selectedTile = prevSel;
    sfx('build');
  };
  $('importFile').onchange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!applySaveData(data)) return flash('Invalid city file');
      history.length = 0; redoStack.length = 0; syncUndoUI();
      worldDirty = true; recompute(); saveNow(); center();
      sfx('build');
      setPop('citiesPop', 'citiesBtn', false);
    } catch (err) { flash('Could not read file'); }
  };

  // ---------- input ----------
  let drag = null, lastTile = null, lastTipKey = '';
  const ptrs = new Map();
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('hint').dataset.hidden = 'true';
    if (ptrs.size === 2) { drag = { pinch: true, d: dist() }; return; }
    const panning = e.button === 2 || e.button === 1 || e.shiftKey || tool === 'pan' || workspaceMode;
    if (panning) { drag = { pan: true, moved: false, workspaceTap: workspaceMode && e.button === 0 && !e.shiftKey, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y }; canvas.style.cursor = 'grabbing'; return; }
    strokeId++;
    drag = { pan: false };
    const t = pick(e.clientX, e.clientY);
    if (t) { apply(t[0], t[1]); lastTile = t.join(); }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag?.pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], nd = dist();
      zoomAt(nd / drag.d, (a.x + b.x) / 2, (a.y + b.y) / 2); drag.d = nd; return;
    }
    if (drag?.pinch) return;
    if (drag?.pan) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (Math.hypot(dx, dy) > 4) drag.moved = true;
      cam.x = drag.cx + dx; cam.y = drag.cy + dy;
    }
    const t = pick(e.clientX, e.clientY);
    hover = t;
    if (workspaceMode) {
      const tip = $('tip'), building = !drag ? workspaceBuilding(e.clientX, e.clientY) : null;
      const department = building && window.WorkspaceData?.departments.find(d => d.types.includes(building.type));
      if (department) {
        tip.textContent = department.name + ' - click to open'; tip.hidden = false;
        tip.style.transform = `translate3d(${Math.max(8, Math.min(W - 240, e.clientX + 16))}px, ${Math.max(8, Math.min(H - 60, e.clientY + 16))}px, 0)`;
      } else tip.hidden = true;
      return;
    }
    if (drag && !drag.pan && t && t.join() !== lastTile) { apply(t[0], t[1]); lastTile = t.join(); }
    if (!flashTimer) {
      const tip = $('tip');
      const txt = t && !drag ? describe(t[0], t[1]) : null;
      if (txt) {
        const tk = t[0] + ',' + t[1] + ':' + txt;
        if (tk !== lastTipKey) { lastTipKey = tk; tip.textContent = txt; }
        if (tip.hidden) tip.hidden = false;
        tip.style.transform = `translate3d(${Math.min(W - 250, e.clientX + 16)}px, ${e.clientY + 16}px, 0)`;
      } else if (!tip.hidden) {
        tip.hidden = true;
        lastTipKey = '';
      }
    }
  });
  function workspaceBuilding(mx, my) {
    // Test frontmost buildings first, including their roofs, not just the ground tile.
    for (let sum = N * 2 - 2; sum >= 0; sum--) {
      for (let x = Math.min(N - 1, sum); x >= Math.max(0, sum - N + 1); x--) {
        const y = sum - x, type = grid[x][y], def = TYPES[type];
        if (!def || !['house', 'apt', 'office', 'shop', 'school', 'clinic', 'plaza', 'wheel', 'park', 'windmill'].includes(type)) continue;
        const cx = (x - y) * 32 * cam.z + cam.x;
        const bottom = (x + y + 1) * 16 * cam.z + cam.y;
        const height = (def.h || 8) * (LVL_MULT[levels[x][y]] || 1) * cam.z;
        const half = 32 * (1 - 2 * (def.inset || 0)) * cam.z;
        if (Math.abs(mx - cx) <= half && my >= bottom - height - 16 * cam.z && my <= bottom + 16 * cam.z) return {x, y, type};
      }
    }
    return null;
  }
  const end = (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size) return;
    if (e.type !== 'pointercancel' && drag?.workspaceTap && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 7) {
      const building = workspaceBuilding(e.clientX, e.clientY);
      if (building) dispatchEvent(new CustomEvent('isocity:building', {detail: building}));
    }
    if (!workspaceMode && e.type !== 'pointercancel' && drag?.pan && !drag.moved && tool === 'pan') {
      const t = pick(e.clientX, e.clientY); selectedTile = t && grid[t[0]][t[1]] ? t : null; renderInspect();
    }
    drag = null; lastTile = null; canvas.style.cursor = workspaceMode || tool === 'pan' ? 'grab' : 'crosshair';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; if (!flashTimer) { $('tip').hidden = true; lastTipKey = ''; } });

  function zoomAt(f, mx = W / 2, my = H / 2) {
    const nz = Math.max(0.5, Math.min(2.4, cam.z * f));
    const k = nz / cam.z;
    cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz;
  }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { cam.x -= e.deltaX * unit; cam.y -= e.deltaY * unit; return; }
    if (e.deltaY) zoomAt(Math.exp(-Math.max(-240, Math.min(240, e.deltaY * unit)) * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  $('zoomIn').onclick = () => zoomAt(1.2);
  $('zoomOut').onclick = () => zoomAt(1 / 1.2);
  $('rotBtn').onclick = () => rotateCity(true);

  function setTool(t) {
    tool = t;
    if (t !== 'pan' && selectedTile) { selectedTile = null; renderInspect(); }
    for (const b of toolBtns) b.setAttribute('aria-pressed', String(b.dataset.tool === t));
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
  }
  const toolsEl = $('tools');
  ORDER.forEach((id, i) => {
    const d = TYPES[id];
    const b = document.createElement('button');
    b.className = 'tool'; b.type = 'button'; b.dataset.tool = id;
    b.setAttribute('aria-pressed', 'false');
    const key = i < 9 ? String(i + 1) : id === 'upgrade' ? 'U' : id === 'bulldoze' ? 'B' : '';
    b.setAttribute('aria-label', `${d.name}${d.cost ? ', costs ' + d.cost : ''}${key ? ', shortcut ' + key : ''}`);
    b.innerHTML = `<svg class="ticon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg><span class="name"><span class="tdot" style="background:${d.color}"></span>${d.name}</span><span class="cost">${d.cost ? '$' + d.cost : 'Tool'}</span>`;
    b.onclick = () => setTool(id);
    toolsEl.appendChild(b);
    toolBtns.push(b);
  });

  const SPEEDS = [1, 2, 0];
  function setSpeed(s) {
    simSpeed = s;
    const b = $('speedBtn');
    b.textContent = s === 0 ? 'Paused' : s + 'x';
    b.setAttribute('aria-pressed', String(s !== 1));
    b.setAttribute('aria-label', `Simulation speed: ${s === 0 ? 'Paused' : s + 'x'}`);
  }
  $('speedBtn').onclick = () => {
    const idx = (SPEEDS.indexOf(simSpeed) + 1) % SPEEDS.length;
    setSpeed(SPEEDS[idx]);
    sfx('tap');
  };

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setPop('citiesPop', 'citiesBtn', false); setPop('budgetPop', 'budgetBtn', false);
      if (selectedTile) { selectedTile = null; renderInspect(); }
    }
    if (e.defaultPrevented || e.target.matches('input, textarea, select, [contenteditable]') || e.target.closest?.('#workspacePanel')) return;
    if (e.code === 'Space' && e.target.matches('button, a')) return;
    if (workspaceMode) {
      if (e.key === '+' || e.key === '=') zoomAt(1.2);
      if (e.key === '-') zoomAt(1 / 1.2);
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); setSpeed(simSpeed === 0 ? 1 : 0); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    const k = e.key.toLowerCase();
    if (k === 'b' || k === '0') return setTool('bulldoze');
    if (k === 'p') return setTool('pan');
    if (k === 'u') return setTool('upgrade');
    if (k === 'r' || k === 'e') return rotateCity(true);
    if (k === 'q') return rotateCity(false);
    const n = Number(e.key);
    if (n >= 1 && n <= 9 && ORDER[n - 1]) setTool(ORDER[n - 1]);
    if (e.key === '+' || e.key === '=') zoomAt(1.2);
    if (e.key === '-') zoomAt(1 / 1.2);
  });

  $('clock').addEventListener('input', (e) => { hour = Number(e.target.value); auto = false; $('autoBtn').setAttribute('aria-pressed', 'false'); });
  $('autoBtn').onclick = () => { auto = !auto; $('autoBtn').setAttribute('aria-pressed', String(auto)); };
  $('soundBtn').onclick = () => {
    soundOn = !soundOn;
    $('soundBtn').setAttribute('aria-pressed', String(soundOn));
    if (soundOn) sfx('tap');
  };
  let resetArmed = 0;
  $('resetBtn').onclick = () => {
    const b = $('resetBtn');
    if (!resetArmed) {
      b.textContent = 'Replace city?';
      resetArmed = setTimeout(() => { resetArmed = 0; b.textContent = 'New city'; }, 2500);
      return;
    }
    clearTimeout(resetArmed); resetArmed = 0; b.textContent = 'New city';
    history.length = 0; redoStack.length = 0; syncUndoUI(); starter(); worldDirty = true; recompute(); renderInspect(); saveNow(); center();
  };
  $('undoBtn').onclick = undo;
  $('redoBtn').onclick = redo;

  // ---------- loop ----------
  function resize() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function center() {
    cam.z = Math.max(0.55, Math.min(1.1, W / (N * TW) * 1.15, H / (N * TH + 120) * 1.15));
    cam.x = W / 2; cam.y = H / 2 - (N * TH / 2) * cam.z;
  }
  addEventListener('resize', resize);

  let last = performance.now(), acc = 0, growTick = 0, lastLabel = '';
  function frame(now) {
    const rawDt = Math.min(0.1, (now - last) / 1000); last = now;
    const dt = rawDt * simSpeed;
    if (auto && simSpeed > 0) hour = (hour + dt * 0.35) % 24;
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (label !== lastLabel) {
      lastLabel = label;
      $('clockText').textContent = label;
      if (document.activeElement !== $('clock')) $('clock').value = hour;
    }
    if (simSpeed > 0) {
      stepList(cars, dt, isRoad);
      stepList(walkers, dt, isRoad);
      stepList(boats, dt, isWater);
      acc += dt;
      if (acc >= 3) {
        acc = 0;
        money += stats.net;
        render_stats();
        if ($('budgetPop').dataset.open === 'true') renderBudget();
        scheduleSave();
        growTick++;
        if (growTick % 2 === 0) tryGrow();
      }
    }
    draw(now, dt);
    requestAnimationFrame(frame);
  }

  window.Isocity = {
    setWorkspace(enabled) {
      workspaceMode = enabled; drag = null; ptrs.clear(); hover = null;
      setTool(enabled ? 'pan' : 'road');
      canvas.style.cursor = enabled ? 'grab' : 'crosshair';
      setPop('citiesPop', 'citiesBtn', false); setPop('budgetPop', 'budgetBtn', false);
      selectedTile = null; renderInspect();
    },
    focusBuilding(types) {
      for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (types.includes(grid[x][y])) {
        cam.z = Math.max(0.7, Math.min(1.25, cam.z));
        const centerX = W > 900 ? (W - 440) / 2 : W / 2;
        cam.x = centerX - (x - y) * 32 * cam.z;
        cam.y = H * 0.48 - (x + y + 1) * 16 * cam.z + (TYPES[grid[x][y]].h || 0) * cam.z / 2;
        return true;
      }
      return false;
    },
    fit: center
  };
  resize();
  if (!load()) starter();
  center();
  recompute();
  setTool('pan');
  requestAnimationFrame(frame);
})();
