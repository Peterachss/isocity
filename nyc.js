// NYC map for IsoCity: four playable islands (Manhattan, Brooklyn–Queens, Staten Island, Roosevelt Island)
// on a 64x64 grid, plus the passenger rail lines that run across them. Data only: city.js builds the grid
// from this, renders it, and runs the trains on the simulation clock.
//
// Map frame: x grows east, y grows south. Distances are compressed; relative positions follow the real city:
// Manhattan is the long island in the middle with the broad Hudson to the west and the East River to the east,
// Brooklyn–Queens is the landmass east and south-east, Staten Island sits south-west across the harbour, and
// Roosevelt Island is the narrow strip in the East River.
window.ISOCITY_NYC = (() => {
  const N = 64;
  const hash = (x, y, s = 0) => {
    let h = Math.imul(x * 374761393 + y * 668265263 + s * 1442695041, 1) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------- land ----------
  // Smooth, deterministic coastline wobble (sum of a few sines), so every shore is irregular but stable.
  const wob = (t, k) => 0.55 * Math.sin(t * 0.61 + k * 1.7) + 0.3 * Math.sin(t * 1.37 + k * 2.9) + 0.15 * Math.sin(t * 2.71 + k * 4.1);
  // Tiles that must stay land whatever the wobble: bridge landings, tunnel mouths, ferry terminals, el ramps
  const FORCE_LAND = new Set(['19,27', '25,27', '19,40', '24,40', '25,40', '18,43', '24,43', '25,43', '16,59', '24,59',
    '25,23', '26,23', '27,23', '16,46', '14,52', '13,52', '14,53', '22,23', '23,23']);
  const MAN_CX = 16.6;
  const manHalf = (y) => (y < 3 || y > 46 ? -1 : y < 8 ? 2.6 + (y - 3) * 0.06 : y <= 40 ? 3.7 : 3.7 - (y - 40) * 0.5);
  const isManhattan = (x, y) => {
    const w = manHalf(y); if (w <= 0) return false;
    const c = x + 0.5, west = MAN_CX - w - 1.0 * wob(y, 1), east = MAN_CX + w + 0.9 * wob(y, 2);
    return c >= Math.min(west, 14.4) && c <= Math.max(east, 18.6);       // avenues x=14 and x=18 always on land
  };
  const isRoosevelt = (x, y) => (x === 22 || x === 23) && y >= 14 && y <= 23 && !(x === 23 && (y === 14 || y === 23 && false));
  // Brooklyn–Queens: one broad landmass, framed by water on every side
  const isBQ = (x, y) => {
    const c = x + 0.5, r = y + 0.5;
    const west = (y < 30 ? 25 : 24) + Math.max(0, 0.9 * wob(y, 3));
    const east = 57.5 + 2.4 * wob(y * 0.7, 5);
    const north = 6.5 + 1.6 * Math.abs(wob(x * 0.8, 6));
    const south = 57.5 + 2.2 * wob(x * 0.6, 7);
    if (c < west || c > east || r < north || r > south) return false;
    if (y >= 51 && x >= 41 && x <= 53 && r < south - 1) return false;           // Jamaica Bay
    if (y <= 9 && x >= 25 && x <= 29) return false;                               // inlet on the north shore
    return true;
  };
  const isStaten = (x, y) => {
    const dx = (x + 0.5 - 9.5) / 8, dy = (y + 0.5 - 57) / 6.5, ang = Math.atan2(dy, dx);
    return Math.hypot(dx, dy) <= 1 + 0.1 * wob(ang * 3, 8);
  };
  const isLand = (x, y) => FORCE_LAND.has(`${x},${y}`) || isManhattan(x, y) || isRoosevelt(x, y) || isBQ(x, y) || isStaten(x, y);
  const regionOf = (x, y) => {
    if (!isLand(x, y)) return null;
    if (isManhattan(x, y) || (x <= 19 && x >= 13 && y <= 46 && !isStaten(x, y))) return y >= 37 ? 'lower' : y >= 21 ? 'midtown' : 'uptown';
    if (isRoosevelt(x, y)) return 'roosevelt';
    if (isStaten(x, y)) return 'staten';
    if (isBQ(x, y) || x >= 24) return y <= 30 ? (x <= 28 ? 'lic' : 'queens') : (x <= 26 ? 'bkwater' : 'brooklyn');
    return null;
  };

  // ---------- landmarks (original map frame) ----------
  const LANDMARKS = {
    '17,41': 'spire',        // tapering glass tower with a spire, Lower Manhattan
    '16,28': 'flatiron',     // wedge where the diagonal avenue meets the grid
    '15,25': 'stepped',      // stepped stone tower with a crown, Midtown
    '16,46': 'ferryMan',     // ferry terminal at the southern tip
    '14,52': 'ferrySI',      // ferry terminal on Staten Island's north-east shore
    '18,43': 'portal',       // tunnel mouth where the Bridge Line leaves Manhattan for the bridge
    '26,23': 'cut', '27,23': 'cut', // open cut where the Queens El climbs out of its tunnel
  };

  // ---------- rail lines ----------
  // Points are [x, y, z]: z < 0 is underground (hidden), 0 is street level, > 0 is elevated or bridge deck (px).
  // Underground stations get street entrances at `entrance` (a point on a pavement).
  const LINES = [
    {
      id: 'B', name: 'Bridge Line', color: '#f4772a', trains: 2,
      pts: [[16.5, 18.6, -14], [16.5, 21.5, -14], [16.5, 31.5, -14], [16.5, 38.5, -14], [17.2, 41.2, -14], [17.9, 42.6, -8], [18.6, 43.5, 0],
        [19.6, 43.5, 8], [20.6, 43.5, 18], [23.2, 43.5, 18], [24.3, 43.5, 16], [39.4, 43.5, 16]],
      stations: [
        { name: 'Central Park South', at: [16.5, 21.5], entrance: [17.82, 21.5] },
        { name: 'Times Square', at: [16.5, 31.5], entrance: [17.82, 31.2] },
        { name: 'Fulton Street', at: [16.5, 38.5], entrance: [17.82, 38.6] },
        { name: 'DeKalb Avenue', at: [31.5, 43.5] },
        { name: 'Atlantic Terminal', at: [36.6, 43.5] },
      ],
    },
    {
      id: 'Q', name: 'Queens El', color: '#a44cc0', trains: 2,
      pts: [[14.8, 23.5, -14], [17.5, 23.5, -14], [20.0, 23.5, -14], [22.5, 23.5, -14], [24.6, 23.5, -14], [26.0, 23.5, -6], [27.0, 23.5, 6], [28.6, 23.5, 24], [44.2, 23.5, 24]],
      stations: [
        { name: 'Lexington Avenue', at: [17.5, 23.5], entrance: [17.82, 23.3] },
        { name: 'Roosevelt Island', at: [22.5, 23.5], entrance: [22.55, 22.2] },
        { name: 'Queens Plaza', at: [30.5, 23.5] },
        { name: 'Junction Boulevard', at: [36.5, 23.5] },
        { name: 'Flushing Terminal', at: [41.6, 23.5] },
      ],
    },
    {
      id: 'S', name: 'Staten Island Railway', color: '#2f6fd6', trains: 1,
      pts: [[14.6, 53.3, 0], [12.5, 53.6, 0], [10.8, 55.2, 0], [9.6, 57.6, 0], [7.6, 60.0, 0], [5.8, 61.0, 0]],
      stations: [
        { name: 'St. George', at: [12.0, 53.75] },
        { name: 'Stapleton', at: [9.9, 56.8] },
        { name: 'Tottenville', at: [8.4, 59.1] },
      ],
    },
  ];
  // Ferry between the two terminals (water route)
  const FERRY = { from: [16.5, 47.45], to: [15.35, 51.6] };

  function segDist(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l2));
    return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
  }

  // ---------- build the grid ----------
  function build() {
    const grid = Array.from({ length: N }, () => Array(N).fill('water'));
    const levels = Array.from({ length: N }, () => Array(N).fill(1));
    const lots = { github: [], google: [] };
    const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
    const land = (x, y) => inb(x, y) && regionOf(x, y);
    const set = (x, y, t, lv = 1) => { if (inb(x, y)) { grid[x][y] = t; levels[x][y] = lv; } };
    const road = (x, y) => { if (inb(x, y)) set(x, y, land(x, y) ? 'road' : 'bridge'); };

    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if (land(x, y)) set(x, y, null);

    // Manhattan: two avenues, cross streets, the diagonal avenue, irregular downtown streets
    for (let y = 3; y <= 45; y++) { if (land(14, y)) road(14, y); if (land(18, y) && y !== 43) road(18, y); }
    for (const y of [5, 9, 20, 24, 27, 30, 33, 36, 38, 40]) for (let x = 13; x <= 20; x++) if (land(x, y)) road(x, y);
    for (let x = 14; x <= 16; x++) road(x, 42);
    for (let x = 15; x <= 17; x++) road(x, 44);
    for (let k = 0; k <= 12; k++) { const dx = 17 - Math.floor(k / 2), dy = 27 + k; if (land(dx, dy)) road(dx, dy); } // the diagonal avenue
    // Central Park: a full rectangle between the avenues, with the reservoir
    for (let x = 15; x <= 17; x++) for (let y = 10; y <= 19; y++) set(x, y, (x === 16 && (y === 12 || y === 13)) ? 'water' : (y % 3 === 1 && x !== 16 ? 'park' : 'forest'));

    // Roosevelt Island: a central road with mid-rises on the east side
    for (let y = 14; y <= 23; y++) road(22, y);

    // Brooklyn–Queens grid
    for (let x = 25; x < N; x += 4) for (let y = 6; y <= 60; y++) if (land(x, y)) road(x, y);
    for (let y = 7; y <= 59; y += 4) for (let x = 24; x < N; x++) if (land(x, y)) road(x, y);
    // Staten Island streets
    for (let x = 2; x <= 16; x++) if (land(x, 55)) road(x, 55);
    for (let y = 50; y <= 63; y++) { if (land(9, y)) road(9, y); if (land(13, y)) road(13, y); }
    for (let x = 2; x <= 16; x++) if (land(x, 59)) road(x, 59);

    // Road bridges: Queensboro (y 27), Brooklyn (y 40), Verrazzano (y 59). The rail bridge at y 43.5 is a structure.
    for (let x = 20; x <= 24; x++) road(x, 27);
    for (let x = 20; x <= 25; x++) road(x, 40);
    for (let x = 17; x <= 24; x++) road(x, 59);

    // Brooklyn piers off the waterfront
    for (const y of [31, 33, 35]) set(23, y, 'plaza');

    // Fill land with district-appropriate buildings (keeping the Staten Island Railway corridor clear)
    const sir = LINES[2].pts;
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      if (grid[x][y] !== null) continue;
      const r = regionOf(x, y);
      const h = hash(x, y, 7), h2 = hash(x, y, 9);
      const nearRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[x + dx]?.[y + dy] === 'road');
      if (sir.some((p, i) => i < sir.length - 1 && segDist(x + 0.5, y + 0.5, p, sir[i + 1]) < 0.75)) continue;
      if (r === 'lower') set(x, y, h < 0.55 ? 'office' : h < 0.8 ? 'apt' : 'shop', h < 0.55 ? (h2 < 0.6 ? 3 : 2) : h2 < 0.5 ? 2 : 1);
      else if (r === 'midtown') set(x, y, h < 0.5 ? 'office' : h < 0.85 ? 'apt' : 'shop', h < 0.5 ? (h2 < 0.55 ? 3 : 2) : h < 0.85 ? (h2 < 0.4 ? 3 : 2) : 1);
      else if (r === 'uptown') set(x, y, h < 0.8 ? 'apt' : 'shop', h < 0.8 ? (h2 < 0.5 ? 2 : 1) : 1);
      else if (r === 'roosevelt') set(x, y, h < 0.55 ? 'apt' : 'park', h < 0.55 ? 2 : 1);
      else if (r === 'lic') set(x, y, h < 0.6 ? 'apt' : 'shop', h < 0.6 ? (h2 < 0.6 ? 3 : 2) : 1);
      else if (r === 'queens') set(x, y, (y === 22 || y === 24) && x >= 28 ? 'shop' : (y === 22 || y === 24) ? (h < 0.6 ? 'shop' : 'house') : h < 0.08 ? 'forest' : h < 0.78 ? 'house' : 'shop', 1);
      else if (r === 'bkwater') set(x, y, h < 0.75 ? 'shop' : 'apt', h2 < 0.5 ? 2 : 1);
      else if (r === 'brooklyn') {
        const prospect = x >= 33 && x <= 37 && y >= 47 && y <= 51;
        set(x, y, prospect ? (h < 0.8 ? 'forest' : 'park') : h < 0.06 ? 'forest' : h < 0.85 ? 'house' : 'shop', 1);
      } else if (r === 'staten') set(x, y, h < 0.45 ? 'forest' : nearRoad ? 'house' : (h < 0.75 ? 'forest' : 'house'), 1);
      if (nearRoad && (grid[x][y] === 'office' || grid[x][y] === 'apt' || grid[x][y] === 'shop')) {
        if (r === 'lower' || r === 'midtown') lots.github.push([x, y]);
        else if (r === 'brooklyn' || r === 'bkwater' || r === 'lic' || r === 'queens') lots.google.push([x, y]);
      }
    }
    for (const k of Object.keys(LANDMARKS)) {
      const [x, y] = k.split(',').map(Number), kind = LANDMARKS[k];
      if (kind === 'ferryMan' || kind === 'ferrySI' || kind === 'portal' || kind === 'cut') set(x, y, 'plaza');
      else if (kind === 'flatiron') set(x, y, 'office', 2);
      else set(x, y, 'office', 3);
    }
    // Workspace buildings go on lots away from landmarks, spread out so labels don't pile up
    const spread = (list) => list.filter(([x, y]) => !LANDMARKS[`${x},${y}`]).sort((a, b) => hash(a[0], a[1], 11) - hash(b[0], b[1], 11));
    lots.github = spread(lots.github); lots.google = spread(lots.google);
    return { grid, levels, lots };
  }

  return { N, build, regionOf, LANDMARKS, LINES, FERRY, hash };
})();
