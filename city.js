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
  let zoomTarget = null;
  let zoomAnchorX = 0, zoomAnchorY = 0;
  let hover = null, cars = [], orphansList = [];
  let hour = 17.4, auto = false, paused = false, stats = {};
  let dpr = 1, W = 0, H = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

  // Active render target (swapped between worldCanvas, nightCanvas, and main ctx)
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
      const tiles = new Set([null, 'forest', 'road', 'house', 'apt', 'shop', 'office', 'park']);
      if (d && Array.isArray(d.grid) && d.grid.length === N &&
          d.grid.every(row => Array.isArray(row) && row.length === N && row.every(t => tiles.has(t))) &&
          Number.isFinite(d.money) && (d.hour == null || (Number.isFinite(d.hour) && d.hour >= 0 && d.hour <= 24))) {
        grid = d.grid; money = d.money; hour = d.hour ?? 17.4; return true;
      }
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
    $('undoBtn').disabled = history.length === 0;
    $('redoBtn').disabled = redoHistory.length === 0;
    for (const b of toolBtns) b.dataset.unaffordable = String(TYPES[b.dataset.tool].cost > money);
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

  // Lit-only pass baked into nightCanvas (drawn un-multiplied at night)
  function drawTileNight(x, y, t) {
    if (!t) return;
    if (t === 'road') {
      if ((x + y) % 3 === 0) {
        const ax = px(x + 0.5, y + 0.5), ay = py(x + 0.5, y + 0.5);
        rctx.fillStyle = 'rgba(255,214,130,0.28)';
        rctx.beginPath(); rctx.arc(ax, ay, 18 * rcam.z, 0, 7); rctx.fill();
      }
      return;
    }
    const d = TYPES[t];
    if (!d || !d.h) return;
    const i = d.inset;
    const x0 = x + i, y0 = y + i, x1 = x + 1 - i, y1 = y + 1 - i;
    const seed = x * 11 + y * 5;
    const rows = Math.max(1, Math.floor(d.h / 14));
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

  function tree(x, y, s, L, seed = 0, useSprite = true) {
    if (!seed) box(x - 0.025, y - 0.025, x + 0.025, y + 0.025, 0, 8 * s, '#4a3624', L);
    const cx = px(x, y), cy = py(x, y, 19 * s);
    if (useSprite) {
      const k = s * rcam.z;
      const spr = crownSprites[Math.abs(seed) % crownSprites.length];
      rctx.drawImage(spr, cx - SPR_CX * k, cy - SPR_CY * k, SPR_W * k, SPR_H * k);
      return;
    }
    const [dark, light] = CROWNS[Math.abs(seed) % CROWNS.length];
    const R = 10 * s * rcam.z;
    rctx.fillStyle = shade('#16301a', 1, L);
    rctx.beginPath(); rctx.ellipse(cx + 3 * rcam.z, cy + 14 * s * rcam.z, R * 0.95, R * 0.45, 0, 0, 7); rctx.fill();
    rctx.fillStyle = shade(dark, 1, L);
    rctx.beginPath(); rctx.arc(cx, cy, R, 0, 7); rctx.fill();
    rctx.fillStyle = shade(light, 1, L);
    rctx.beginPath(); rctx.arc(cx - R * 0.25, cy - R * 0.3, R * 0.68, 0, 7); rctx.fill();
  }

  const FOREST_SPOTS = [[0.28, 0.25], [0.74, 0.3], [0.5, 0.52], [0.25, 0.78], [0.76, 0.76]];
  const WALLS = ['#efe6d2', '#f2f0ea', '#e8c98a', '#d7d2c4'];
  const REDS = ['#b0412e', '#bd5530', '#923a2c', '#c9612f'];

  function drawGround(x, y, t, L) {
    const base = t === 'forest' ? ((x + y) % 2 ? '#2a4a28' : '#274524')
      : t === 'park' ? '#86b65f' : ((x + y) % 2 ? '#7da663' : '#74a05a');
    quadZ(x, y, x + 1, y + 1, 0, shade(base, 1, L));
  }

  function drawTile(x, y, t, L, hs = 1, skipGround = false, useSprite = true) {
    if (!skipGround && t !== 'road') drawGround(x, y, t, L);
    if (!t) return;
    if (t === 'forest') {
      const sd = x * 17 + y * 31;
      for (let i = 0; i < 5; i++) {
        const [a, b] = FOREST_SPOTS[i];
        const sc = (0.8 + ((Math.imul(sd + i * 331, 2246822519) >>> 24) % 4) * 0.1) * hs;
        const cs = Math.imul(sd + i * 977, 2654435761) >>> 20;
        tree(x + a, y + b, sc, L, cs, useSprite);
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
      tree(x + 0.3, y + 0.3, hs, L, 0, useSprite);
      tree(x + 0.7, y + 0.55, 0.85 * hs, L, 1, useSprite);
      if (sd % 2) tree(x + 0.35, y + 0.78, 0.7 * hs, L, 0, useSprite);
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

  function drawCar(c, L, headlightsOnly = false) {
    const s = 0.12;
    const dx = c.tx - c.fx, dy = c.ty - c.fy;
    const ox = -dy * 0.16, oy = dx * 0.16;
    const x = c.px + 0.5 + ox, y = c.py + 0.5 + oy;
    if (!headlightsOnly) {
      const lx = dx ? 0.16 : s, ly = dy ? 0.16 : s;
      box(x - lx, y - ly, x + lx, y + ly, 0, 7, c.color, L);
    } else if (L < 0.5) {
      const hx = px(x + dx * 0.2, y + dy * 0.2), hy = py(x + dx * 0.2, y + dy * 0.2, 4);
      rctx.fillStyle = 'rgba(255,230,160,0.55)';
      rctx.beginPath(); rctx.arc(hx, hy, 7 * rcam.z, 0, 7); rctx.fill();
    }
  }

  // ---------- offscreen world & night light caches (baked at neutral daylight) ----------
  const PAD_X = 64, OY = 176;
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
          drawTile(x, y, grid[x][y], 1, 1, false, true);
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
          drawTile(x, y, grid[x][y], 1, 1, false, true);
          rctx = nctx;
          drawTileNight(x, y, grid[x][y]);
        }
      }
    }
    wctx.restore();
    nctx.restore();
    warm = savedW;
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

  const seen = new Uint8Array(N * N);
  const ov = [];

  function draw(now) {
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

    // 1 single drawImage for the entire static island
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(worldCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);

    // Collect animating tiles, cars, and foreground occluders
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
      const rx = Math.floor(c.px), ry = Math.floor(c.py);
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
          if (!t || t === 'road') continue;
          if ((dx > 1 || dy > 1) && t !== 'office' && t !== 'apt') continue;
          seen[idx] = 1;
          ov.push({ k: 0, s: tx + ty, x: tx, y: ty, t, hs: 1 });
        }
      }
    }

    // Draw animating tiles, cars, and occluding tiles at daylight (1, warm=0) so they match worldCanvas seamlessly
    if (ov.length) {
      const savedW = warm; warm = 0;
      if (ov.length > 1) ov.sort((a, b) => a.s - b.s || a.k - b.k);
      for (let i = 0; i < ov.length; i++) {
        const it = ov[i];
        if (it.k === 1) drawCar(it.c, 1, false);
        else drawTile(it.x, it.y, it.t, 1, it.hs, true, true);
      }
      warm = savedW;
    }

    // One combined source-over time-of-day tint across worldCanvas + overlay
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

    // Lit windows, streetlights, and car headlights (un-darkened)
    if (L < 0.65) {
      ctx.globalAlpha = Math.min(1, (0.65 - L) * 2.4);
      ctx.drawImage(nightCanvas, cam.x - OX * cam.z, cam.y - OY * cam.z, WW * cam.z, WH * cam.z);
      ctx.globalAlpha = 1;
    }
    if (L < 0.5 && cars.length) {
      for (let i = 0; i < ov.length; i++) if (ov[i].k === 1) drawCar(ov[i].c, L, true);
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
  const history = [], redoHistory = [];
  let activeStroke = null;
  function apply(x, y, defer = false) {
    const cur = grid[x][y];
    if (tool === 'pan') return false;
    const cost = tool === 'bulldoze' ? 0 : TYPES[tool].cost;
    if (tool === 'bulldoze') {
      if (!cur) return false;
    } else {
      const blocked = tool === 'forest' ? !!cur : (cur && cur !== 'forest');
      if (blocked || cur === tool || cost > money) {
        if (!blocked && cost > money) flash('Not enough funds');
        return false;
      }
    }
    const next = tool === 'bulldoze' ? null : tool;
    const group = activeStroke || [];
    if (!group.length) {
      history.push(group);
      if (history.length > 200) history.shift();
    }
    group.push({ x, y, prev: cur, next, cost });
    redoHistory.length = 0;
    grid[x][y] = next; money -= cost;
    animate(x, y, !next, cur);
    dirtyCols.add(x - y);
    if (!defer) { recompute(); scheduleSave(); }
    return true;
  }

  // Fill skipped pointer samples with a connected staircase, including diagonal drags.
  function applyLine(from, to) {
    let [x, y] = from;
    const dx = Math.abs(to[0] - x), dy = Math.abs(to[1] - y);
    const sx = x < to[0] ? 1 : -1, sy = y < to[1] ? 1 : -1;
    let error = dx - dy, changed = apply(x, y, true);
    while (x !== to[0] || y !== to[1]) {
      const twice = error * 2;
      if (twice > -dy) { error -= dy; x += sx; changed = apply(x, y, true) || changed; }
      if (twice < dx) { error += dx; y += sy; changed = apply(x, y, true) || changed; }
    }
    if (changed) { recompute(); scheduleSave(); }
  }

  function undo() {
    activeStroke = null;
    const group = history.pop();
    if (!group) return flash('Nothing to undo');
    for (let i = group.length - 1; i >= 0; i--) {
      const h = group[i];
      grid[h.x][h.y] = h.prev; money += h.cost;
      animate(h.x, h.y, !h.prev, h.next);
      dirtyCols.add(h.x - h.y);
    }
    redoHistory.push(group);
    recompute(); scheduleSave();
  }

  function redo() {
    activeStroke = null;
    const group = redoHistory.at(-1);
    if (!group) return flash('Nothing to redo');
    const cost = group.reduce((total, h) => total + h.cost, 0);
    if (cost > 0 && cost > money) return flash('Not enough funds to redo');
    redoHistory.pop(); history.push(group);
    for (const h of group) {
      grid[h.x][h.y] = h.next; money -= h.cost;
      animate(h.x, h.y, !h.next, h.prev);
      dirtyCols.add(h.x - h.y);
    }
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
    if (t === 'park') return 'Park. Raises happiness.';
    if (t === 'forest') return 'Forest. Clear it with the Bulldoze tool, or build over it.';
    const d = TYPES[t];
    const info = d.pop ? `${d.pop} residents` : `${d.jobs} jobs`;
    return `${d.name}, ${info}.` + (connected(x, y) ? '' : ' No road access, so it does not count.');
  }

  // ---------- input ----------
  let drag = null, lastTile = null, lastTipKey = '';
  const ptrs = new Map();
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    zoomTarget = null;
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('hint').dataset.hidden = 'true';
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      drag = { pinch: true, d: dist(), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      activeStroke = null; hover = null;
      return;
    }
    const panning = e.button === 2 || e.button === 1 || e.shiftKey || tool === 'pan';
    if (panning) { drag = { pan: true, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y }; canvas.style.cursor = 'grabbing'; return; }
    drag = { pan: false, pendingTouch: e.pointerType === 'touch', sx: e.clientX, sy: e.clientY };
    activeStroke = [];
    const t = pick(e.clientX, e.clientY);
    if (t) { if (!drag.pendingTouch) apply(t[0], t[1]); lastTile = t; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag?.pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], nd = dist();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.x += mx - drag.mx; cam.y += my - drag.my;
      if (drag.d > 0 && nd > 0) zoomAt(nd / drag.d, mx, my);
      drag.d = nd; drag.mx = mx; drag.my = my; return;
    }
    if (drag?.pinch) return;
    if (drag?.pendingTouch) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 8) return;
      drag.pendingTouch = false;
      if (lastTile) apply(lastTile[0], lastTile[1]);
    }
    if (drag?.pan) {
      cam.x = drag.cx + e.clientX - drag.sx; cam.y = drag.cy + e.clientY - drag.sy;
      hover = null;
      if (!flashTimer) $('tip').hidden = true;
      return;
    }
    const t = pick(e.clientX, e.clientY);
    hover = t;
    if (drag && !drag.pan && t && (!lastTile || t[0] !== lastTile[0] || t[1] !== lastTile[1])) {
      applyLine(lastTile || t, t); lastTile = t;
    }
    if (!t) lastTile = null;
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
  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (ptrs.size) return;
    if (e.type !== 'pointercancel' && drag?.pendingTouch && lastTile) apply(lastTile[0], lastTile[1]);
    drag = null; lastTile = null; activeStroke = null;
    canvas.style.cursor = tool === 'pan' ? 'grab' : 'crosshair';
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; if (!flashTimer) { $('tip').hidden = true; lastTipKey = ''; } });

  function zoomAt(f, mx = W / 2, my = H / 2) {
    const nz = Math.max(0.15, Math.min(2.4, cam.z * f));
    const k = nz / cam.z;
    cam.x = mx - (mx - cam.x) * k; cam.y = my - (my - cam.y) * k; cam.z = nz;
  }
  function requestZoom(f, mx = W / 2, my = H / 2) {
    if (reduceMotion) return zoomAt(f, mx, my);
    zoomTarget = Math.max(0.15, Math.min(2.4, (zoomTarget ?? cam.z) * f));
    zoomAnchorX = mx; zoomAnchorY = my;
    hover = null;
    if (!flashTimer) $('tip').hidden = true;
  }
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? H : 1;
    // Trackpads send many tiny deltas; one event is not one wheel notch.
    // Horizontal scrolling moves the map and must never trigger zoom-out.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) {
      zoomTarget = null;
      cam.x -= e.deltaX * unit;
      cam.y -= e.deltaY * unit;
      hover = null;
      if (!flashTimer) $('tip').hidden = true;
      return;
    }
    if (!e.deltaY) return;
    const pixels = Math.max(-240, Math.min(240, e.deltaY * unit));
    requestZoom(Math.exp(-pixels * 0.0015), e.clientX, e.clientY);
  }, { passive: false });
  $('zoomIn').onclick = () => requestZoom(1.2);
  $('zoomOut').onclick = () => requestZoom(1 / 1.2);

  function setTool(t) {
    tool = t;
    for (const b of toolBtns) b.setAttribute('aria-pressed', String(b.dataset.tool === t));
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
  }
  const toolIcons = {
    pan: '<path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
    road: '<path d="m7 3-3 18M17 3l3 18M12 3v3m0 4v4m0 4v3"/>',
    house: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
    apt: '<path d="M5 21V3h14v18ZM9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M10 21v-3h4v3"/>',
    shop: '<path d="M4 10v11h16V10M3 10l2-7h14l2 7ZM9 21v-7h6v7M8 3l-1 7m9-7 1 7"/>',
    office: '<path d="M6 21V3h12v18ZM10 7h4m-4 4h4m-4 4h4m-4 6v-3h4v3"/>',
    park: '<path d="M7 14V9m-3 5h16M5 18h14m-12-4v7m10-7v7"/><path d="M7 9a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/>',
    forest: '<path d="m12 2-6 8h3l-5 7h16l-5-7h3ZM12 17v5"/>',
    bulldoze: '<path d="m4 14 8-10 8 7-8 10H7Zm4 3 8-10M12 21h9"/>'
  };
  const toolsEl = $('tools');
  ORDER.forEach((id, i) => {
    const d = TYPES[id];
    const b = document.createElement('button');
    b.className = 'tool'; b.type = 'button'; b.dataset.tool = id;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `${d.name}${d.cost ? ', costs ' + d.cost : ''}, shortcut ${i + 1}`);
    b.innerHTML = `<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">${toolIcons[id]}</svg><span class="name">${d.name}</span><span class="cost">${d.cost ? '$' + d.cost : ''}</span><kbd aria-hidden="true">${i + 1}</kbd>`;
    b.onclick = () => setTool(id);
    toolsEl.appendChild(b);
    toolBtns.push(b);
  });
  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select, [contenteditable]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); return redo(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.toLowerCase() === 'f') { e.preventDefault(); center(); }
    const move = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] }[e.key];
    if (move) { e.preventDefault(); zoomTarget = null; cam.x += move[0]; cam.y += move[1]; hover = null; }
    if (e.code === 'Space' && !e.target.matches('button')) { e.preventDefault(); if (!e.repeat) togglePause(); }
    const n = Number(e.key);
    if (n >= 1 && n <= ORDER.length) setTool(ORDER[n - 1]);
    if (e.key === '+' || e.key === '=') requestZoom(1.2);
    if (e.key === '-') requestZoom(1 / 1.2);
  });

  $('clock').addEventListener('input', (e) => { hour = Number(e.target.value); scheduleSave(); auto = false; $('autoBtn').setAttribute('aria-pressed', 'false'); });
  function togglePause() {
    paused = !paused;
    $('pauseBtn').textContent = paused ? 'Resume' : 'Pause';
    $('pauseBtn').setAttribute('aria-pressed', String(paused));
  }
  $('pauseBtn').onclick = togglePause;
  $('fitBtn').onclick = center;
  $('redoBtn').onclick = redo;
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
    history.length = 0; redoHistory.length = 0; activeStroke = null; anims.clear(); dirtyCols.clear(); starter(); worldDirty = true; recompute(); saveNow(); center();
  };
  $('undoBtn').onclick = undo;

  // ---------- loop ----------
  function resize() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    cam.x += (innerWidth - W) / 2; cam.y += (innerHeight - H) / 2;
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  function center() {
    zoomTarget = null;
    const mobile = W <= 640;
    const viewW = W - (mobile ? 24 : 260), viewH = H - (mobile ? 390 : 160);
    cam.z = Math.max(0.15, Math.min(1.1, viewW / (N * TW), viewH / (N * TH + 120)));
    cam.x = W / 2 + (mobile ? 0 : 110);
    cam.y = 100 + viewH / 2 - (N * TH / 2) * cam.z;
  }
  addEventListener('resize', resize);

  let frameId = 0;
  let last = performance.now(), acc = 0, lastLabel = '';
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (zoomTarget !== null) {
      const next = cam.z + (zoomTarget - cam.z) * (1 - Math.exp(-22 * dt));
      const settled = Math.abs(zoomTarget - next) < 0.00001;
      zoomAt((settled ? zoomTarget : next) / cam.z, zoomAnchorX, zoomAnchorY);
      if (settled) zoomTarget = null;
    }
    if (auto && !paused) hour = (hour + dt * 0.35) % 24;
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60);
    const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (label !== lastLabel) {
      lastLabel = label;
      $('clockText').textContent = label;
      if (document.activeElement !== $('clock')) $('clock').value = hour;
    }
    if (!paused) { stepCars(dt); acc += dt; }
    if (acc >= 3) { acc = 0; money += stats.net; render_stats(); scheduleSave(); }
    draw(now);
    frameId = requestAnimationFrame(frame);
  }

  addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frameId); zoomTarget = null; }
    else { last = performance.now(); frameId = requestAnimationFrame(frame); }
  });

  resize();
  if (!load()) starter();
  center();
  recompute();
  setTool('road');
  frameId = requestAnimationFrame(frame);
})();
