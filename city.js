(() => {
  const N = 26;
  const TW = 64, TH = 32;
  const SAVE_KEY = 'isocity-v3';
  const SLOT_PREFIX = 'isocity-slot-';

  const TYPES = {
    pan:    { name: 'Pan',      cost: 0,   color: '#9aa39d' },
    road:   { name: 'Road',     cost: 10,  color: '#3b3f44' },
    house:  { name: 'House',    cost: 100, color: '#d9a273', pop: 4,  h: 22, inset: 0.2, grow: true },
    apt:    { name: 'Apartment',cost: 400, color: '#c98a8a', pop: 14, h: 72, inset: 0.12, grow: true },
    shop:   { name: 'Shop',     cost: 250, color: '#e0c25b', jobs: 5, h: 28, inset: 0.1, grow: true },
    office: { name: 'Office',   cost: 600, color: '#7fa6c9', jobs: 16, h: 118, inset: 0.1, grow: true },
    park:   { name: 'Park',     cost: 150, color: '#8cbf5c', radius: 2 },
    plaza:  { name: 'Plaza',    cost: 300, color: '#c4b59d', radius: 3 },
    clinic: { name: 'Clinic',   cost: 350, color: '#d95f59', jobs: 6, h: 30, inset: 0.12, radius: 4 },
    school: { name: 'School',   cost: 450, color: '#5f8c7a', jobs: 8, h: 34, inset: 0.1, radius: 4 },
    forest: { name: 'Forest',   cost: 5,   color: '#d9a21f' },
    water:  { name: 'Water',    cost: 15,  color: '#3b7378' },
    bridge: { name: 'Bridge',   cost: 35,  color: '#8e8372' },
    bulldoze:{ name: 'Bulldoze',cost: 0,   color: '#b4513f' },
  };
  const ORDER = ['pan', 'road', 'house', 'apt', 'shop', 'office', 'park', 'plaza', 'clinic', 'school', 'forest', 'water', 'bulldoze'];
  const LVL_MULT = [1, 1, 1.5, 2.2];

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);

  let grid, levels, money, tool = 'road';
  let cam = { x: 0, y: 0, z: 1 };
  let hover = null, cars = [], walkers = [], boats = [], orphansList = [];
  let hour = 17.4, auto = false, simSpeed = 1, stats = {};
  let dpr = 1, W = 0, H = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const isRoad = (t) => t === 'road' || t === 'bridge';
  const isWater = (t) => t === 'water' || t === 'bridge';
  const makeLevels = () => Array.from({ length: N }, () => Array(N).fill(1));

  // Coverage masks (recomputed when grid changes)
  const clinicCov = new Uint8Array(N * N);
  const schoolCov = new Uint8Array(N * N);
  const parkCov = new Uint8Array(N * N);

  let rctx = ctx, rcam = cam;
  let worldDirty = true;
  const dirtyCols = new Set();

  // ---------- motion ----------
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
      if (kind === 'build' || kind === 'upgrade') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(kind === 'upgrade' ? 420 : 300, t);
        osc.frequency.exponentialRampToValueAtTime(kind === 'upgrade' ? 620 : 440, t + 0.06);
        gain.gain.setValueAtTime(0.045, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
        osc.start(t); osc.stop(t + 0.08);
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
      if (k === 18) set(x, j, 'school');
      else if (k === 22) set(x, j, 'office');
      else set(x, j, r < 8 ? 'house' : r < 10 ? 'shop' : r < 12 ? 'park' : 'apt');
    }
  }

  let saveTimer = 0;
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, levels, money, hour })); } catch (e) { /* storage unavailable */ }
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
    return true;
  }

  function load() {
    try {
      return applySaveData(JSON.parse(localStorage.getItem(SAVE_KEY)));
    } catch (e) { return false; }
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

  function recompute() {
    clinicCov.fill(0);
    schoolCov.fill(0);
    parkCov.fill(0);
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      if (t === 'clinic' && connected(x, y)) stampMask(clinicCov, x, y, TYPES.clinic.radius);
      else if (t === 'school' && connected(x, y)) stampMask(schoolCov, x, y, TYPES.school.radius);
      else if (t === 'park' || t === 'plaza') stampMask(parkCov, x, y, TYPES[t].radius);
    }

    let pop = 0, jobs = 0, parks = 0, plazas = 0, roads = 0, orphans = 0, blds = 0, trees = 0, waterfront = 0, coveredPop = 0, schooledPop = 0;
    orphansList = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      if (!t || t === 'water') continue;
      if (t === 'forest') { trees++; continue; }
      if (isRoad(t)) { roads++; continue; }
      if (t === 'park') { parks++; if (nearWater(x, y)) waterfront++; continue; }
      if (t === 'plaza') { plazas++; if (nearWater(x, y)) waterfront++; continue; }
      blds++;
      if (!connected(x, y)) { orphans++; orphansList.push([x, y, TYPES[t].h]); continue; }
      const lv = levels[x][y] || 1;
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
      }
    }
    const employed = Math.min(pop, jobs);
    const income = employed * 3 + Math.min(pop, jobs * 2) * 0.5 + waterfront * 2 + plazas * 4;
    const upkeep = roads * 0.4 + parks * 2 + plazas * 2 + blds * 0.5;
    let happy = 48 + Math.min(parks * 5 + plazas * 6, 24) + Math.min(trees * 0.1, 12) + Math.min(waterfront * 2, 10) - orphans * 6;
    if (pop > 0) {
      happy += (employed / pop - 0.6) * 28;
      happy += (coveredPop / pop) * 8 + (schooledPop / pop) * 8;
    }
    if (jobs > pop * 1.5) happy -= 8;
    happy = Math.max(0, Math.min(100, Math.round(happy)));
    stats = { pop, jobs, roads, parks, orphans, waterfront, net: Math.round(income - upkeep), happy };
    render_stats();
    syncAgents();
  }

  function tryGrow() {
    if (stats.happy < 65 || stats.pop === 0) return;
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
      else if (lv === 2 && stats.happy >= 78 && score >= 2) candidates.push([x, y, 3]);
    }
    if (!candidates.length) return;
    const [gx, gy, nlv] = candidates[Math.floor(Math.random() * candidates.length)];
    levels[gx][gy] = nlv;
    animate(gx, gy, false);
    markCol(gx, gy);
    sfx('upgrade');
    recompute();
    scheduleSave();
  }

  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  let toolBtns = [];
  function render_stats() {
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

  // ---------- cars, walkers & river boats ----------
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

  function box(x0, y0, x1, y1, z0, z1, color, L, opts = {}) {
    poly4(px(x0,y1), py(x0,y1,z0), px(x1,y1), py(x1,y1,z0), px(x1,y1), py(x1,y1,z1), px(x0,y1), py(x0,y1,z1), shade(color, 0.82, L));
    poly4(px(x1,y0), py(x1,y0,z0), px(x1,y1), py(x1,y1,z0), px(x1,y1), py(x1,y1,z1), px(x1,y0), py(x1,y0,z1), shade(color, 0.64, L));
    quadZ(x0, y0, x1, y1, z1, shade(opts.roof || color, 1.05, L));
    if (opts.windows) windows(x0, y0, x1, y1, z0, z1, L, opts.windows);
  }

  function windows(x0, y0, x1, y1, z0, z1, L, seed) {
    const rows = Math.max(1, Math.floor((z1 - z0) / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const night = 1 - L;
    const dx = x1 - x0, dy = y1 - y0;
    const darkL = shade('#27333f', 1, L), darkR = shade('#1f2a35', 1, L);
    for (let r = 0; r < rows; r++) {
      const zz0 = z0 + 6 + r * 14, zz1 = zz0 + 7;
      for (let c = 0; c < cols; c++) {
        const lit = night > 0.35 && ((seed * 31 + r * 17 + c * 13) % 7) < 4;
        const a = (c + 0.25) / cols, b = (c + 0.75) / cols;
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
        const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, z);
        rctx.fillStyle = 'rgba(255,214,130,0.28)';
        rctx.beginPath(); rctx.arc(ax, ay, 18 * rcam.z, 0, 7); rctx.fill();
      }
      return;
    }
    if (t === 'plaza') {
      const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5, 10);
      rctx.fillStyle = 'rgba(255,214,130,0.42)';
      rctx.beginPath(); rctx.arc(ax, ay, 22 * rcam.z, 0, 7); rctx.fill();
      return;
    }
    const h = bldHeight(t, levels[x][y] || 1);
    if (!h) return;
    const i = TYPES[t].inset;
    const x0 = x + i, y0 = y + i, x1 = x + 1 - i, y1 = y + 1 - i;
    const seed = x * 11 + y * 5;
    const rows = Math.max(1, Math.floor(h / 14));
    const cols = Math.max(1, Math.round((x1 - x0) * 3));
    const dx = x1 - x0, dy = y1 - y0;
    for (let r = 0; r < rows; r++) {
      const zz0 = 6 + r * 14, zz1 = zz0 + 7;
      for (let c = 0; c < cols; c++) {
        if (((seed * 31 + r * 17 + c * 13) % 7) >= 4) continue;
        const a = (c + 0.25) / cols, b = (c + 0.75) / cols;
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
      box(x + 0.05, y + 0.05, x + 0.95, y + 0.95, -5, z, '#8c806e', L, { roof: '#525961' });
    } else {
      quadZ(x, y, x + 1, y + 1, 0, shade('#4a5159', 1, L));
    }
    const mx = x + 0.5, my = y + 0.5;
    rctx.strokeStyle = shade('#e9e4cf', 1, L);
    rctx.lineWidth = Math.max(1, 1.4 * rcam.z);
    rctx.setLineDash([5 * rcam.z, 5 * rcam.z]);
    rctx.beginPath();
    const ax = px(mx, my), ay = py(mx, my, z);
    for (let i = 0; i < 4; i++) {
      const dx = NB[i][0], dy = NB[i][1];
      if (inb(x + dx, y + dy) && isRoad(grid[x + dx][y + dy])) {
        rctx.moveTo(ax, ay);
        rctx.lineTo(px(mx + dx * 0.5, my + dy * 0.5), py(mx + dx * 0.5, my + dy * 0.5, z));
      }
    }
    rctx.stroke();
    rctx.setLineDash([]);
  }

  // ---------- cached daylight tree crown sprites ----------
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
      const sd = x * 7 + y * 3;
      tree(x + 0.3, y + 0.3, hs, L, 0);
      tree(x + 0.7, y + 0.55, 0.85 * hs, L, 1);
      if (sd % 2) tree(x + 0.35, y + 0.78, 0.7 * hs, L, 0);
      return;
    }
    if (t === 'plaza') {
      quadZ(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.5, shade('#c8baa3', 1, L));
      box(x + 0.25, y + 0.25, x + 0.75, y + 0.75, 0.5, 4 * hs, '#a79a86', L, { roof: '#3c7b80' });
      box(x + 0.45, y + 0.45, x + 0.55, y + 0.55, 4 * hs, 11 * hs, '#dcd3c2', L, { roof: '#ffd98a' });
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
      : '#5d7e9c';
    const H = Math.max(1, bldHeight(t, lv) * hs);
    box(x + i, y + i, x + 1 - i, y + 1 - i, 0, H, wall, L, { roof, windows: hs > 0.6 ? seed : 0 });

    if (t === 'shop' && hs > 0.6) {
      poly4(
        px(x + i, y + 1 - i + 0.04), py(x + i, y + 1 - i + 0.04, 16),
        px(x + 1 - i, y + 1 - i + 0.04), py(x + 1 - i, y + 1 - i + 0.04, 16),
        px(x + 1 - i, y + 1 - i + 0.12), py(x + 1 - i, y + 1 - i + 0.12, 11),
        px(x + i, y + 1 - i + 0.12), py(x + i, y + 1 - i + 0.12, 11),
        shade('#c0463a', 1, L)
      );
    }
    if (t === 'house') {
      const r0x = px(x + i, y + 0.5), r0y = py(x + i, y + 0.5, H + 10 * hs);
      const r1x = px(x + 1 - i, y + 0.5), r1y = py(x + 1 - i, y + 0.5, H + 10 * hs);
      poly4(px(x + i, y + i), py(x + i, y + i, H), px(x + 1 - i, y + i), py(x + 1 - i, y + i, H), r1x, r1y, r0x, r0y, shade(red, 1.0, L));
      poly4(px(x + i, y + 1 - i), py(x + i, y + 1 - i, H), px(x + 1 - i, y + 1 - i), py(x + 1 - i, y + 1 - i, H), r1x, r1y, r0x, r0y, shade(red, 0.78, L));
    }
    if (t === 'clinic' && hs > 0.7) {
      quadZ(x + 0.34, y + 0.44, x + 0.66, y + 0.56, H + 0.5, shade('#c8443d', 1, L));
      quadZ(x + 0.44, y + 0.34, x + 0.56, y + 0.66, H + 0.5, shade('#c8443d', 1, L));
    }
    if (t === 'school' && hs > 0.7) {
      box(x + 0.36, y + 0.36, x + 0.64, y + 0.64, H, H + 9 * hs, '#e9e3d5', L, { roof: '#3d5856' });
    }
    if ((t === 'apt' || t === 'office') && lv >= 3 && hs > 0.7) {
      box(x + 0.28, y + 0.28, x + 0.72, y + 0.72, H, H + 10 * hs, wall, L, { roof });
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
  const PAD_X = 64, OY = 210;
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
    const clipX = Math.max(0, OX + u * (TW / 2) - 48);
    const clipW = Math.min(WW - clipX, 96);

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

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(worldCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);

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

    if (hover) {
      const [x, y] = hover;
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
      if (tool !== 'pan') {
        const bad = !canApply(x, y);
        const col = tool === 'bulldoze' ? '#b4513f' : bad ? '#b4513f' : '#0f766e';
        quadZ(x, y, x + 1, y + 1, 0, col + '88');
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px(x,y), py(x,y)); ctx.lineTo(px(x+1,y), py(x+1,y));
        ctx.lineTo(px(x+1,y+1), py(x+1,y+1)); ctx.lineTo(px(x,y+1), py(x,y+1));
        ctx.closePath(); ctx.stroke();
      }
    }

    if (L < 0.6) {
      ctx.globalAlpha = (0.6 - L) * 0.6;
      ctx.drawImage(vigCanvas, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- actions ----------
  function nextTile(cur, t) {
    if (t === 'bulldoze') return cur === 'bridge' ? 'water' : null;
    if (t === 'road' && cur === 'water') return 'bridge';
    if (t === 'water') return (!cur || cur === 'forest') ? 'water' : null;
    if (t === 'forest') return !cur ? 'forest' : null;
    return (!cur || cur === 'forest') ? t : null;
  }
  function tileCost(cur, t) {
    if (t === 'road' && cur === 'water') return TYPES.bridge.cost;
    return TYPES[t].cost;
  }
  function canApply(x, y) {
    const cur = grid[x][y];
    if (tool === 'pan') return false;
    if (tool === 'bulldoze') return !!cur;
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
  function apply(x, y) {
    const cur = grid[x][y];
    if (tool === 'pan') return;
    if (tool === 'bulldoze') {
      if (!cur) return;
      const nxt = nextTile(cur, 'bulldoze');
      const prevLv = levels[x][y] || 1;
      history.push({ x, y, prev: cur, next: nxt, prevLv, nextLv: 1, cost: 0, stroke: strokeId });
      redoStack.length = 0;
      grid[x][y] = nxt;
      levels[x][y] = 1;
      animate(x, y, true, cur);
      sfx('bulldoze');
    } else {
      const nxt = nextTile(cur, tool);
      if (!nxt) return;
      const cost = tileCost(cur, tool);
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

  let flashTimer = 0;
  function flash(msg) {
    const tip = $('tip'); tip.textContent = msg; tip.hidden = false;
    tip.style.transform = `translate3d(${Math.round(W / 2 - 70)}px, 84px, 0)`;
    lastTipKey = '';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashTimer = 0; tip.hidden = true; }, 1400);
  }

  function describe(x, y) {
    const t = grid[x][y];
    if (!t) return null;
    if (t === 'road') return 'Road';
    if (t === 'bridge') return 'Bridge. Connects roads across water.';
    if (t === 'water') return 'Water. Build roads across it for bridges, or place homes beside it for a waterfront bonus.';
    if (t === 'park') return 'Park. Raises happiness.' + (nearWater(x, y) ? ' Waterfront bonus.' : '');
    if (t === 'plaza') return 'Town Plaza. Boosts nearby happiness and income.' + (nearWater(x, y) ? ' Waterfront bonus.' : '');
    if (t === 'forest') return 'Forest. Clear it with the Bulldoze tool, or build over it.';
    const d = TYPES[t];
    const lv = levels[x][y] || 1;
    const mult = LVL_MULT[lv] || 1;
    if (!connected(x, y)) return `${d.name}. No road access, so it does not count.`;
    if (t === 'clinic') return `Clinic, ${d.jobs} jobs. Boosts nearby health and happiness.`;
    if (t === 'school') return `School, ${d.jobs} jobs. Helps nearby buildings grow.`;
    const val = d.pop ? `${Math.round(d.pop * mult)} residents` : `${Math.round(d.jobs * mult)} jobs`;
    const tags = [];
    if (d.grow) tags.push(`Level ${lv}`);
    if (nearWater(x, y)) tags.push('Waterfront');
    const idx = x * N + y;
    if (d.pop && clinicCov[idx]) tags.push('Clinic');
    if (d.pop && schoolCov[idx]) tags.push('School');
    return `${d.name} (${tags.join(', ')}), ${val}.`;
  }

  // ---------- save slots & JSON export/import ----------
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
          localStorage.setItem(SLOT_PREFIX + i, JSON.stringify({ grid, levels, money, hour, pop: stats.pop }));
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
        setCitiesOpen(false);
      };
      row.append(meta, saveBtn, loadBtn);
      list.appendChild(row);
    }
  }

  function setCitiesOpen(open) {
    const pop = $('citiesPop');
    const btn = $('citiesBtn');
    if (open) renderSlots();
    pop.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
  }
  $('citiesBtn').onclick = (e) => {
    e.stopPropagation();
    setCitiesOpen($('citiesPop').dataset.open !== 'true');
  };
  addEventListener('pointerdown', (e) => {
    const pop = $('citiesPop');
    if (pop.dataset.open === 'true' && !pop.contains(e.target) && e.target !== $('citiesBtn')) setCitiesOpen(false);
  });
  $('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify({ grid, levels, money, hour }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'isocity-save.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('importBtn').onclick = () => $('importFile').click();
  $('pngBtn').onclick = () => {
    const prevHover = hover;
    hover = null;
    draw(performance.now(), 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'isocity-snapshot.png';
    a.click();
    hover = prevHover;
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
      setCitiesOpen(false);
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
    const panning = e.button === 2 || e.button === 1 || e.shiftKey || tool === 'pan';
    if (panning) { drag = { pan: true, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y }; canvas.style.cursor = 'grabbing'; return; }
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
      cam.x = drag.cx + e.clientX - drag.sx; cam.y = drag.cy + e.clientY - drag.sy;
    }
    const t = pick(e.clientX, e.clientY);
    hover = t;
    if (drag && !drag.pan && t && t.join() !== lastTile) { apply(t[0], t[1]); lastTile = t.join(); }
    if (!flashTimer) {
      const tip = $('tip');
      const txt = t && !drag ? describe(t[0], t[1]) : null;
      if (txt) {
        const tk = t[0] + ',' + t[1] + ':' + txt;
        if (tk !== lastTipKey) { lastTipKey = tk; tip.textContent = txt; }
        if (tip.hidden) tip.hidden = false;
        tip.style.transform = `translate3d(${Math.min(W - 240, e.clientX + 16)}px, ${e.clientY + 16}px, 0)`;
      } else if (!tip.hidden) {
        tip.hidden = true;
        lastTipKey = '';
      }
    }
  });
  const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size) return; drag = null; lastTile = null; canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair'; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; if (!flashTimer) { $('tip').hidden = true; lastTipKey = ''; } });

  function zoomAt(f, mx = W / 2, my = H / 2) {
    const nz = Math.max(0.5, Math.min(2.4, cam.z * f));
    const k = nz / cam.z;
    cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz;
  }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX, e.clientY); }, { passive: false });
  $('zoomIn').onclick = () => zoomAt(1.2);
  $('zoomOut').onclick = () => zoomAt(1 / 1.2);

  function setTool(t) {
    tool = t;
    for (const b of toolBtns) b.setAttribute('aria-pressed', String(b.dataset.tool === t));
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
  }
  const toolsEl = $('tools');
  ORDER.forEach((id, i) => {
    const d = TYPES[id];
    const b = document.createElement('button');
    b.className = 'tool'; b.type = 'button'; b.dataset.tool = id;
    b.setAttribute('aria-pressed', 'false');
    const key = i < 9 ? String(i + 1) : id === 'bulldoze' ? 'B' : '';
    b.setAttribute('aria-label', `${d.name}${d.cost ? ', costs ' + d.cost : ''}${key ? ', shortcut ' + key : ''}`);
    b.innerHTML = `<span class="swatch" style="background:${d.color}"></span><span class="name">${d.name}</span><span class="cost">${d.cost ? '$' + d.cost : ''}</span>`;
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
    if (e.key === 'Escape') setCitiesOpen(false);
    if (e.target.matches('input')) return;
    if (e.code === 'Space') { e.preventDefault(); setSpeed(simSpeed === 0 ? 1 : 0); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    const k = e.key.toLowerCase();
    if (k === 'b' || k === '0') return setTool('bulldoze');
    if (k === 'p') return setTool('pan');
    if (k === 'r') return setTool('road');
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
    history.length = 0; redoStack.length = 0; syncUndoUI(); starter(); worldDirty = true; recompute(); saveNow(); center();
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
        scheduleSave();
        growTick++;
        if (growTick % 2 === 0) tryGrow();
      }
    }
    draw(now, dt);
    requestAnimationFrame(frame);
  }

  resize();
  if (!load()) starter();
  center();
  recompute();
  setTool('road');
  requestAnimationFrame(frame);
})();
