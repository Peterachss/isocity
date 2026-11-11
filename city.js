(() => {
  const N = 26;
  const TW = 64, TH = 32;
  const SAVE_KEY = 'isocity-v2';

  const TYPES = {
    pan:    { name: 'Pan',      cost: 0,   color: '#9aa39d' },
    road:   { name: 'Road',     cost: 10,  color: '#3b3f44' },
    house:  { name: 'House',    cost: 100, color: '#d9a273', pop: 4,  h: 22, inset: 0.2 },
    apt:    { name: 'Apartment',cost: 400, color: '#c98a8a', pop: 14, h: 72, inset: 0.12 },
    shop:   { name: 'Shop',     cost: 250, color: '#e0c25b', jobs: 5, h: 28, inset: 0.1 },
    office: { name: 'Office',   cost: 600, color: '#7fa6c9', jobs: 16, h: 118, inset: 0.1 },
    park:   { name: 'Park',     cost: 150, color: '#8cbf5c' },
    forest: { name: 'Forest',   cost: 5,   color: '#d9a21f' },
    bulldoze:{ name: 'Bulldoze',cost: 0,   color: '#b4513f' },
  };
  const ORDER = ['pan', 'road', 'house', 'apt', 'shop', 'office', 'park', 'forest', 'bulldoze'];

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d', { alpha: false });
  const $ = (id) => document.getElementById(id);

  let grid, money, tool = 'road';
  let cam = { x: 0, y: 0, z: 1 };
  let hover = null, cars = [], orphansList = [];
  let hour = 17.4, auto = false, stats = {};
  let dpr = 1, W = 0, H = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

  // Active render target (swapped between offscreen worldCanvas and main ctx)
  let rctx = ctx, rcam = cam;
  let worldDirty = true;

  // ---------- motion ----------
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = (p) => 1 - Math.pow(1 - p, 4);
  const anims = new Map();
  const animate = (x, y, out, type) => {
    if (reduceMotion) return;
    anims.set(x * 100 + y, { start: performance.now(), dur: out ? 180 : 280, out, type });
  };

  // ---------- state ----------
  function starter() {
    grid = Array.from({ length: N }, () => Array(N).fill('forest'));
    money = 5000;
    hour = 17.4;
    const set = (x, y, t) => { grid[x][y] = t; };
    let y = 4;
    for (let x = 3; x < 23; x++) { set(x, y, 'road'); if (x % 5 === 0) { y += x % 10 === 0 ? 1 : -1; set(x, y, 'road'); } }
    for (let j = 4; j < 20; j++) set(11, j, 'road');
    for (let i = 11; i <= 17; i++) set(i, 15, 'road');
    for (let j = 9; j <= 15; j++) set(17, j, 'road');
    const lots = [];
    for (let x = 0; x < N; x++) for (let j = 0; j < N; j++) {
      if (grid[x][j] !== 'forest') continue;
      const near = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => inb(x+dx,j+dy) && grid[x+dx][j+dy] === 'road');
      if (near) lots.push([x, j]);
    }
    let k = 0;
    for (const [x, j] of lots) {
      k++;
      if (k % 4 === 0) continue;
      const r = (x * 7 + j * 13) % 13;
      set(x, j, k === 22 ? 'office' : r < 8 ? 'house' : r < 10 ? 'shop' : r < 12 ? 'park' : 'apt');
    }
  }

  let saveTimer = 0;
  function saveNow() {
    clearTimeout(saveTimer); saveTimer = 0;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ grid, money, hour })); } catch (e) { /* storage unavailable */ }
  }
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(saveNow, 400);
  }
  addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
  addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (d && d.grid && d.grid.length === N) { grid = d.grid; money = d.money; hour = d.hour ?? 17.4; return true; }
    } catch (e) { /* ignore */ }
    return false;
  }

  // ---------- simulation ----------
  const NB = [[1,0],[-1,0],[0,1],[0,-1]];
  const connected = (x, y) => NB.some(([dx,dy]) => inb(x+dx,y+dy) && grid[x+dx][y+dy] === 'road');

  function recompute() {
    let pop = 0, jobs = 0, parks = 0, roads = 0, orphans = 0, blds = 0, trees = 0;
    orphansList = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      if (!t) continue;
      if (t === 'forest') { trees++; continue; }
      if (t === 'road') { roads++; continue; }
      if (t === 'park') { parks++; continue; }
      blds++;
      if (!connected(x, y)) { orphans++; orphansList.push([x, y, TYPES[t].h]); continue; }
      pop += TYPES[t].pop || 0;
      jobs += TYPES[t].jobs || 0;
    }
    const employed = Math.min(pop, jobs);
    const income = employed * 3 + Math.min(pop, jobs * 2) * 0.5;
    const upkeep = roads * 0.4 + parks * 2 + blds * 0.5;
    let happy = 50 + Math.min(parks * 5, 25) + Math.min(trees * 0.1, 15) - orphans * 6;
    if (pop > 0) happy += (employed / pop - 0.6) * 30;
    if (jobs > pop * 1.5) happy -= 8;
    happy = Math.max(0, Math.min(100, Math.round(happy)));
    stats = { pop, jobs, roads, parks, orphans, net: Math.round(income - upkeep), happy };
    render_stats();
    syncCars();
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

  // ---------- cars ----------
  function roadTiles() {
    const r = [];
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (grid[x][y] === 'road') r.push([x, y]);
    return r;
  }
  function syncCars() {
    cars = cars.filter((c) => grid[c.tx]?.[c.ty] === 'road' && grid[c.fx]?.[c.fy] === 'road');
    const r = roadTiles();
    const want = Math.min(48, Math.floor(r.length / 3));
    while (cars.length < want) {
      const [x, y] = r[Math.floor(Math.random() * r.length)];
      cars.push({ fx: x, fy: y, tx: x, ty: y, t: 1, px: x, py: y, speed: rnd(0.9, 1.7),
        color: ['#c0463a', '#2f5d8a', '#e6e2d6', '#d89a2b', '#3d3f45', '#4f8f6a'][Math.floor(Math.random() * 6)] });
    }
    if (cars.length > want) cars.length = want;
  }
  function stepCars(dt) {
    for (const c of cars) {
      c.t += dt * c.speed;
      if (c.t >= 1) {
        const opts = NB.map(([dx,dy]) => [c.tx+dx, c.ty+dy]).filter(([x,y]) => inb(x,y) && grid[x][y] === 'road');
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
  const P = (x, y, z = 0) => [px(x, y), py(x, y, z)];
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
    // left face (y = y1)
    poly4(px(x0,y1), py(x0,y1,z0), px(x1,y1), py(x1,y1,z0), px(x1,y1), py(x1,y1,z1), px(x0,y1), py(x0,y1,z1), shade(color, 0.82, L));
    // right face (x = x1)
    poly4(px(x1,y0), py(x1,y0,z0), px(x1,y1), py(x1,y1,z0), px(x1,y1), py(x1,y1,z1), px(x1,y0), py(x1,y0,z1), shade(color, 0.64, L));
    // top face
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

  function drawRoad(x, y, L) {
    quadZ(x, y, x + 1, y + 1, 0, shade('#4a5159', 1, L));
    const mx = x + 0.5, my = y + 0.5;
    rctx.strokeStyle = shade('#e9e4cf', 1, L);
    rctx.lineWidth = Math.max(1, 1.4 * rcam.z);
    rctx.setLineDash([5 * rcam.z, 5 * rcam.z]);
    rctx.beginPath();
    const ax = px(mx, my), ay = py(mx, my);
    for (let i = 0; i < 4; i++) {
      const dx = NB[i][0], dy = NB[i][1];
      if (inb(x + dx, y + dy) && grid[x + dx][y + dy] === 'road') {
        rctx.moveTo(ax, ay);
        rctx.lineTo(px(mx + dx * 0.5, my + dy * 0.5), py(mx + dx * 0.5, my + dy * 0.5));
      }
    }
    rctx.stroke();
    rctx.setLineDash([]);
    if (L < 0.5 && (x + y) % 3 === 0) {
      rctx.fillStyle = `rgba(255,214,130,${(0.5 - L) * 0.5})`;
      rctx.beginPath(); rctx.arc(ax, ay, 18 * rcam.z, 0, 7); rctx.fill();
    }
  }

  // ---------- cached tree crown sprites ----------
  const CROWNS = [
    ['#2c5a2b', '#3f7a35'], ['#3a6b2e', '#5a8f3c'], ['#c98a14', '#e8b832'],
    ['#d9a21f', '#f0c64a'], ['#b8601a', '#e08a2c'], ['#8a9a2a', '#b7b93a'],
  ];
  const SPR_W = 36, SPR_H = 42, SPR_CX = 16, SPR_CY = 14, SPR_S = 2;
  let crownSprites = [];
  let spriteLightKey = '';

  function ensureTreeSprites(L) {
    const key = `${Math.round(L * 48)}|${Math.round(warm * 24)}`;
    if (key === spriteLightKey && crownSprites.length) return;
    spriteLightKey = key;
    if (!crownSprites.length) {
      crownSprites = CROWNS.map(() => {
        const c = document.createElement('canvas');
        c.width = SPR_W * SPR_S; c.height = SPR_H * SPR_S;
        return c;
      });
    }
    const sh = shade('#16301a', 1, L);
    for (let i = 0; i < CROWNS.length; i++) {
      const [dark, light] = CROWNS[i];
      const sc = crownSprites[i].getContext('2d');
      sc.setTransform(SPR_S, 0, 0, SPR_S, 0, 0);
      sc.clearRect(0, 0, SPR_W, SPR_H);
      const R = 10;
      sc.fillStyle = sh;
      sc.beginPath(); sc.ellipse(SPR_CX + 3, SPR_CY + 14, R * 0.95, R * 0.45, 0, 0, 7); sc.fill();
      sc.fillStyle = shade(dark, 1, L);
      sc.beginPath(); sc.arc(SPR_CX, SPR_CY, R, 0, 7); sc.fill();
      sc.fillStyle = shade(light, 1, L);
      sc.beginPath(); sc.arc(SPR_CX - R * 0.25, SPR_CY - R * 0.3, R * 0.68, 0, 7); sc.fill();
    }
  }

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
    const base = t === 'forest' ? ((x + y) % 2 ? '#2a4a28' : '#274524')
      : t === 'park' ? '#86b65f' : ((x + y) % 2 ? '#7da663' : '#74a05a');
    quadZ(x, y, x + 1, y + 1, 0, shade(base, 1, L));
  }

  function drawTile(x, y, t, L, hs = 1, skipGround = false) {
    if (!skipGround && t !== 'road') drawGround(x, y, t, L);
    if (!t) return;
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
    if (t === 'road') {
      if (hs < 1) rctx.globalAlpha = hs;
      drawRoad(x, y, L);
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
    const d = TYPES[t];
    const i = d.inset;
    const seed = x * 11 + y * 5;
    const red = REDS[seed % REDS.length];
    const wall = t === 'house' ? WALLS[seed % WALLS.length] : d.color;
    const roof = t === 'house' ? red : t === 'apt' ? '#a2432f' : t === 'shop' ? red : '#5d7e9c';
    const H = Math.max(1, d.h * hs);
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
  }

  function drawCar(c, L) {
    const s = 0.12;
    const dx = c.tx - c.fx, dy = c.ty - c.fy;
    const ox = -dy * 0.16, oy = dx * 0.16;
    const x = c.px + 0.5 + ox, y = c.py + 0.5 + oy;
    const lx = dx ? 0.16 : s, ly = dy ? 0.16 : s;
    box(x - lx, y - ly, x + lx, y + ly, 0, 7, c.color, L);
    if (L < 0.5) {
      const hx = px(x + dx * 0.2, y + dy * 0.2), hy = py(x + dx * 0.2, y + dy * 0.2, 4);
      rctx.fillStyle = 'rgba(255,230,160,0.55)';
      rctx.beginPath(); rctx.arc(hx, hy, 7 * rcam.z, 0, 7); rctx.fill();
    }
  }

  // ---------- offscreen world cache & vignette cache ----------
  const PAD_X = 64, OY = 176;
  const OX = N * (TW / 2) + PAD_X;
  const WW = N * TW + PAD_X * 2;
  const WH = OY + N * TH + 48;
  const WS = 2;

  const worldCanvas = document.createElement('canvas');
  worldCanvas.width = WW * WS;
  worldCanvas.height = WH * WS;
  const wctx = worldCanvas.getContext('2d');
  let worldLightKey = '';

  function buildWorld(L) {
    ensureTreeSprites(L);
    rctx = wctx;
    rcam = { x: OX, y: OY, z: 1 };
    wctx.setTransform(WS, 0, 0, WS, 0, 0);
    wctx.clearRect(0, 0, WW, WH);

    const dep = 26;
    const bx = px(N, 0), by = py(N, 0);
    const cx = px(N, N), cy = py(N, N);
    const dx = px(0, N), dy = py(0, N);
    poly4(dx, dy, cx, cy, cx, cy + dep, dx, dy + dep, shade('#7a6a55', 0.9, L));
    poly4(cx, cy, bx, by, bx, by + dep, cx, cy + dep, shade('#675846', 0.9, L));

    for (let s = 0; s <= 2 * N - 2; s++) {
      for (let x = Math.max(0, s - N + 1); x <= Math.min(N - 1, s); x++) {
        const y = s - x;
        const key = x * 100 + y;
        if (anims.has(key)) drawGround(x, y, grid[x][y], L);
        else drawTile(x, y, grid[x][y], L, 1);
      }
    }
    worldDirty = false;
    worldLightKey = `${Math.round(L * 48)}|${Math.round(warm * 24)}`;
  }

  // Pre-rendered night vignette
  const vigCanvas = document.createElement('canvas');
  vigCanvas.width = 256; vigCanvas.height = 256;
  (() => {
    const vc = vigCanvas.getContext('2d');
    const g = vc.createRadialGradient(128, 128, 76, 128, 128, 192);
    g.addColorStop(0, 'rgba(8,14,34,0)');
    g.addColorStop(1, 'rgba(8,14,34,1)');
    vc.fillStyle = g; vc.fillRect(0, 0, 256, 256);
  })();

  // Reusable buffers for depth-sorted car + occluder + animation overlay
  const seen = new Uint8Array(N * N);
  const ov = [];

  function draw(now) {
    const L = daylight(hour);
    warm = Math.max(0, 1 - Math.abs(hour - 17.6) / 2.2, 1 - Math.abs(hour - 6.4) / 1.6);
    const lk = `${Math.round(L * 48)}|${Math.round(warm * 24)}`;

    if (worldDirty || lk !== worldLightKey) buildWorld(L);

    rctx = ctx;
    rcam = cam;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = mix('#07110c', '#1f3b2a', L);
    ctx.fillRect(0, 0, W, H);

    // 1 single drawImage for the entire static island
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(worldCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);

    // Collect only: (a) cars, (b) animating tiles, (c) static non-road tiles in front of any car
    seen.fill(0);
    ov.length = 0;

    if (anims.size) {
      for (const [key, an] of anims) {
        const x = (key / 100) | 0, y = key % 100;
        const p = Math.min(1, (now - an.start) / an.dur);
        if (p >= 1) {
          anims.delete(key);
          worldDirty = true;
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
      const rx = Math.floor(c.px), ry = Math.floor(c.py);
      for (let dx = 0; dx <= 4; dx++) {
        const tx = rx + dx;
        if (tx < 0 || tx >= N) continue;
        for (let dy = 0; dy <= 4; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (Math.abs(dx - dy) > 2) continue;
          const ty = ry + dy;
          if (ty < 0 || ty >= N) continue;
          const idx = tx * N + ty;
          if (seen[idx]) continue;
          const t = grid[tx][ty];
          if (!t || t === 'road') continue;
          seen[idx] = 1;
          ov.push({ k: 0, s: tx + ty, x: tx, y: ty, t, hs: 1 });
        }
      }
    }

    if (ov.length) {
      if (ov.length > 1) ov.sort((a, b) => a.s - b.s || a.k - b.k);
      for (let i = 0; i < ov.length; i++) {
        const it = ov[i];
        if (it.k === 1) drawCar(it.c, L);
        else drawTile(it.x, it.y, it.t, L, it.hs, true);
      }
    }

    // Bobbing markers only for disconnected buildings
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

    // Hover highlight
    if (hover && tool !== 'pan') {
      const [x, y] = hover;
      const T = TYPES[tool];
      const cur = grid[x][y];
      const bad = tool === 'bulldoze' ? !cur
        : (T.cost > money || (tool === 'forest' ? !!cur : (cur && cur !== 'forest')));
      const col = tool === 'bulldoze' ? '#b4513f' : bad ? '#b4513f' : '#0f766e';
      quadZ(x, y, x + 1, y + 1, 0, col + '88');
      ctx.strokeStyle = col; ctx.lineWidth = 2;
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

  // ---------- actions ----------
  const history = [];
  function apply(x, y) {
    const cur = grid[x][y];
    if (tool === 'pan') return;
    if (tool === 'bulldoze') {
      if (!cur) return;
      history.push({ x, y, prev: cur, cost: 0 });
      grid[x][y] = null;
      animate(x, y, true, cur);
    } else {
      const cost = TYPES[tool].cost;
      const blocked = tool === 'forest' ? !!cur : (cur && cur !== 'forest');
      if (blocked || cur === tool || cost > money) { if (!blocked && cost > money) flash('Not enough funds'); return; }
      history.push({ x, y, prev: cur, cost });
      grid[x][y] = tool; money -= cost;
      animate(x, y, false);
    }
    if (history.length > 200) history.shift();
    worldDirty = true;
    recompute(); scheduleSave();
  }

  function undo() {
    const h = history.pop();
    if (!h) return flash('Nothing to undo');
    if (h.prev) { grid[h.x][h.y] = h.prev; animate(h.x, h.y, false); }
    else { animate(h.x, h.y, true, grid[h.x][h.y]); grid[h.x][h.y] = null; }
    money += h.cost;
    worldDirty = true;
    recompute(); scheduleSave();
  }

  let flashTimer;
  function flash(msg) {
    const tip = $('tip'); tip.textContent = msg; tip.hidden = false;
    tip.style.left = '50%'; tip.style.top = '84px'; tip.style.transform = 'translateX(-50%)';
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { tip.hidden = true; tip.style.transform = ''; }, 1400);
  }

  function describe(x, y) {
    const t = grid[x][y];
    if (!t) return null;
    if (t === 'road') return 'Road';
    if (t === 'park') return 'Park. Raises happiness.';
    if (t === 'forest') return 'Forest. Clear it with the Bulldoze tool, or build over it.';
    const d = TYPES[t];
    const info = d.pop ? `${d.pop} residents` : `${d.jobs} jobs`;
    return `${d.name}, ${info}.` + (connected(x, y) ? '' : ' No road access, so it does not count.');
  }

  // ---------- input ----------
  let drag = null, lastTile = null;
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
    const tip = $('tip');
    const txt = t && !drag ? describe(t[0], t[1]) : null;
    if (txt) {
      tip.textContent = txt; tip.hidden = false;
      tip.style.transform = '';
      tip.style.left = Math.min(W - 240, e.clientX + 16) + 'px';
      tip.style.top = (e.clientY + 16) + 'px';
    } else if (!flashTimer || tip.style.transform === '') tip.hidden = true;
  });
  const end = (e) => { ptrs.delete(e.pointerId); if (ptrs.size) return; drag = null; lastTile = null; canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair'; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; $('tip').hidden = true; });

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
    b.setAttribute('aria-label', `${d.name}${d.cost ? ', costs ' + d.cost : ''}, shortcut ${i + 1}`);
    b.innerHTML = `<span class="swatch" style="background:${d.color}"></span><span class="name">${d.name}</span><span class="cost">${d.cost ? '$' + d.cost : ''}</span>`;
    b.onclick = () => setTool(id);
    toolsEl.appendChild(b);
    toolBtns.push(b);
  });
  addEventListener('keydown', (e) => {
    if (e.target.matches('input')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return undo(); }
    const n = Number(e.key);
    if (n >= 1 && n <= ORDER.length) setTool(ORDER[n - 1]);
    if (e.key === '+' || e.key === '=') zoomAt(1.2);
    if (e.key === '-') zoomAt(1 / 1.2);
  });

  $('clock').addEventListener('input', (e) => { hour = Number(e.target.value); auto = false; $('autoBtn').setAttribute('aria-pressed', 'false'); });
  $('autoBtn').onclick = () => { auto = !auto; $('autoBtn').setAttribute('aria-pressed', String(auto)); };
  let resetArmed = 0;
  $('resetBtn').onclick = () => {
    const b = $('resetBtn');
    if (!resetArmed) {
      b.textContent = 'Replace city?';
      resetArmed = setTimeout(() => { resetArmed = 0; b.textContent = 'New city'; }, 2500);
      return;
    }
    clearTimeout(resetArmed); resetArmed = 0; b.textContent = 'New city';
    history.length = 0; starter(); worldDirty = true; recompute(); saveNow(); center();
  };
  $('undoBtn').onclick = undo;

  // ---------- loop ----------
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  }
  function center() {
    cam.z = Math.max(0.55, Math.min(1.1, W / (N * TW) * 1.15, H / (N * TH + 120) * 1.15));
    cam.x = W / 2; cam.y = H / 2 - (N * TH / 2) * cam.z;
  }
  addEventListener('resize', resize);

  let last = performance.now(), acc = 0, lastLabel = '';
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (auto) hour = (hour + dt * 0.35) % 24;
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (label !== lastLabel) {
      lastLabel = label;
      $('clockText').textContent = label;
      if (document.activeElement !== $('clock')) $('clock').value = hour;
    }
    stepCars(dt);
    acc += dt;
    if (acc >= 3) { acc = 0; money += stats.net; render_stats(); scheduleSave(); }
    draw(now);
    requestAnimationFrame(frame);
  }

  resize();
  if (!load()) starter();
  center();
  recompute();
  setTool('road');
  requestAnimationFrame(frame);
})();
