/* GitHub City: lush 3D renderer (three.js). Replaces the 2D canvas when WebGL is available. */
(function () {
  const B = window.CityBridge;
  const THREE = window.THREE;
  if (!B || !THREE) return;

  const N = B.N;
  const T = 4; // world units per tile
  const HSCALE = 0.3; // 2D building height -> world units
  const HALF = (N * T) / 2;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  const stage = document.getElementById('stage');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const dom = renderer.domElement;
  dom.id = 'stage3d';
  dom.setAttribute('aria-label', 'Interactive 3D workspace city. Drag to orbit, scroll to zoom, click a building to open it.');
  stage.parentNode.insertBefore(dom, stage.nextSibling);
  document.body.classList.add('mode3d');
  B.setHeadless(true);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.5, 2000);
  const fog = new THREE.FogExp2(0xbfe0cf, 0.0021);
  scene.fog = fog;

  // ---------- helpers ----------
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const col = (h) => new THREE.Color(h);
  const tileX = (x) => (x + 0.5) * T - HALF;
  const tileZ = (y) => (y + 0.5) * T - HALF;
  const CROWNS = ['#2f7a33', '#3f9a3f', '#58b04a', '#1f5f33', '#4a9a3c', '#72c25a', '#2c7a45', '#86cf63'];
  const VINES = ['#2f8a3a', '#1f6b2e', '#4aa648', '#175a2c'];

  // ---------- lights & sky ----------
  const hemi = new THREE.HemisphereLight(0xdff5e6, 0x2f5a35, 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -100; sc.right = 100; sc.top = 100; sc.bottom = -100; sc.near = 1; sc.far = 400;
  sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: col('#6fb7d8') }, horizon: { value: col('#cfe9d8') }, glow: { value: col('#ffe2a0') },
      sunDir: { value: new THREE.Vector3(0, 0.3, -1) }, glowAmt: { value: 0.6 },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; uniform vec3 glow; uniform vec3 sunDir; uniform float glowAmt; varying vec3 vP; void main(){ float h = clamp(vP.y,0.0,1.0); vec3 c = mix(horizon, top, pow(h,0.55)); float s = max(dot(normalize(vP), normalize(sunDir)),0.0); c += glow * (pow(s,8.0)*0.45 + pow(s,64.0)*0.9) * glowAmt; gl_FragColor = vec4(c,1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat);
  scene.add(sky);

  // ---------- world group (rebuilt when the layout changes) ----------
  const world = new THREE.Group();
  scene.add(world);
  const anim = { wheels: [], mills: [] };
  let pickMeshes = [];
  let labelData = [];
  let heatDiscs = [];
  let carsMesh = null, boatsMesh = null;

  // static far scenery (built once)
  (function buildFar() {
    const r = rng(777);
    const mounds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.95 }), 46);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sv = new THREE.Vector3();
    const farTowers = [];
    for (let i = 0; i < 46; i++) {
      const ang = r() * Math.PI * 2, dist = 230 + r() * 260;
      const rad = 22 + r() * 46;
      p.set(Math.cos(ang) * dist, -2 + rad * 0.12, Math.sin(ang) * dist);
      sv.set(rad, rad * (0.28 + r() * 0.2), rad * (0.8 + r() * 0.4));
      q.setFromEuler(new THREE.Euler(0, r() * 6, 0));
      m.compose(p, q, sv);
      mounds.setMatrixAt(i, m);
      mounds.setColorAt(i, col(CROWNS[Math.floor(r() * CROWNS.length)]).multiplyScalar(0.8));
      if (r() < 0.6) farTowers.push([p.x + (r() - 0.5) * rad, p.z + (r() - 0.5) * rad, 40 + r() * 90, 6 + r() * 7]);
    }
    scene.add(mounds);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xcfe0e6, roughness: 0.35, metalness: 0.3 });
    const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, farTowers.length + 90);
    let k = 0;
    for (const [x, z, h, w] of farTowers) {
      m.compose(new THREE.Vector3(x, h / 2, z), q.identity(), new THREE.Vector3(w, h, w)); towers.setMatrixAt(k++, m);
    }
    for (let i = 0; i < 90; i++) {
      const ang = r() * Math.PI * 2, dist = 330 + r() * 200, h = 30 + r() * 110, w = 8 + r() * 12;
      m.compose(new THREE.Vector3(Math.cos(ang) * dist, h / 2 - 2, Math.sin(ang) * dist), q.identity(), new THREE.Vector3(w, h, w)); towers.setMatrixAt(k++, m);
    }
    towers.count = k;
    scene.add(towers);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x4d9a98, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.94 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.9; water.receiveShadow = true;
    scene.add(water);
    scene.userData.water = water;
    // sun beams
    const bc = document.createElement('canvas'); bc.width = 8; bc.height = 128;
    const bx = bc.getContext('2d'); const bg = bx.createLinearGradient(0, 0, 0, 128);
    bg.addColorStop(0, 'rgba(255,240,190,0.0)'); bg.addColorStop(0.3, 'rgba(255,240,190,0.55)'); bg.addColorStop(1, 'rgba(255,240,190,0)');
    bx.fillStyle = bg; bx.fillRect(0, 0, 8, 128);
    const beamTex = new THREE.CanvasTexture(bc);
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const beams = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(6 + r() * 8, 150), beamMat);
      b.position.set((r() - 0.5) * 150, 55, (r() - 0.5) * 150 - 30);
      b.rotation.set(0.25 + r() * 0.2, r() * 3, 0.35 + r() * 0.2);
      beams.add(b);
    }
    scene.add(beams);
    scene.userData.beams = beamMat;
  })();

  // ---------- build the city from the grid ----------
  const winTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#5a7686'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#c9e4ee';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(j * 16 + 2, i * 16 + 3, 12, 10);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const litTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64);
    const r = rng(5);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (r() < 0.55) { x.fillStyle = '#ffd98a'; x.fillRect(j * 16 + 2, i * 16 + 3, 12, 10); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const glassMats = [];

  function glassMaterial(color, w, h) {
    const map = winTex.clone(); map.needsUpdate = true; map.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 3.2)));
    const em = litTex.clone(); em.needsUpdate = true; em.repeat.copy(map.repeat);
    const m = new THREE.MeshStandardMaterial({ color, map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0, roughness: 0.3, metalness: 0.45 });
    glassMats.push(m);
    return m;
  }

  function disposeGroup(g) {
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.userData.shared) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); }); } });
    while (g.children.length) g.remove(g.children[0]);
  }

  function instanced(geo, mat, list, opts = {}) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4();
    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      m.compose(it.p, it.q || new THREE.Quaternion(), it.s || new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m);
      if (it.c) im.setColorAt(i, it.c);
    }
    im.castShadow = !!opts.cast; im.receiveShadow = opts.receive !== false;
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    world.add(im);
    return im;
  }

  let signature = '';
  function sig() {
    const { grid, levels, pins } = B.getGrid();
    let s = '';
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) s += (grid[x][y] || '-') + (levels[x][y] || '') + (pins[x][y] || '') + ',';
    return s;
  }

  function build() {
    disposeGroup(world);
    glassMats.length = 0; anim.wheels.length = 0; anim.mills.length = 0; pickMeshes = []; labelData = []; heatDiscs = [];
    const { grid, levels, pins } = B.getGrid();
    const r = rng(2024);
    const tops = [], soils = [], roads = [], crowns = [], trunks = [], ledges = [], leaves = [], vines = [], decor = [];
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const Q = new THREE.Quaternion();
    const qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);

    const tree = (x, z, s = 1, big = false) => {
      const sc = (0.85 + r() * 0.6) * s * (big ? 1.5 : 1);
      trunks.push({ p: V(x, sc * 0.7, z), s: V(0.18 * sc, sc * 1.4, 0.18 * sc), c: col('#5a4430') });
      crowns.push({ p: V(x, sc * 1.9, z), s: V(sc * 1.2, sc * 1.05, sc * 1.2), c: col(CROWNS[Math.floor(r() * CROWNS.length)]) });
      if (r() < 0.6) crowns.push({ p: V(x + (r() - 0.5) * sc, sc * 2.7, z + (r() - 0.5) * sc), s: V(sc * 0.8, sc * 0.75, sc * 0.8), c: col(CROWNS[Math.floor(r() * CROWNS.length)]) });
    };

    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      const wx = tileX(x), wz = tileZ(y);
      if (t === 'water') continue;
      if (t === 'bridge') {
        decor.push({ kind: 'box', p: V(wx, 0.25, wz), s: V(T, 0.5, T), c: col('#9a9484') });
        decor.push({ kind: 'box', p: V(wx, 1.1, wz), s: V(T, 0.15, T), c: col('#6e7378') });
        continue;
      }
      // ground
      soils.push({ p: V(wx, -1.6, wz), s: V(T, 3, T), c: col((x + y) % 2 ? '#5b4636' : '#54402f') });
      let topColor;
      if (t === 'road') topColor = '#4a4f54';
      else if (t === 'plaza') topColor = '#cfc4ad';
      else if (t === 'park') topColor = '#86cf63';
      else if (t === 'forest') topColor = (x + y) % 2 ? '#2f6b32' : '#2a6030';
      else topColor = (x + y) % 2 ? '#6fb85a' : '#64ad52';
      tops.push({ p: V(wx, -0.15, wz), s: V(T, 0.3, T), c: col(topColor).offsetHSL(0, 0, (r() - 0.5) * 0.04) });
      if (t === 'road') {
        if ((x * 7 + y * 3) % 3 === 0) decor.push({ kind: 'box', p: V(wx, 0.03, wz), s: V(T * 0.12, 0.05, T * 0.5), c: col('#e8e2cf') });
      }
      if (t === 'forest') {
        for (let i = 0; i < 6; i++) tree(wx + (r() - 0.5) * T * 0.9, wz + (r() - 0.5) * T * 0.9, 1.05, r() < 0.2);
      } else if (t === 'park') {
        tree(wx - 1, wz - 1, 1.1); tree(wx + 1.1, wz + 0.8, 0.9);
        decor.push({ kind: 'box', p: V(wx, 0.35, wz + 0.1), s: V(1.6, 0.2, 0.5), c: col('#7a5436') });
      } else if (!t && r() < 0.3) {
        tree(wx + (r() - 0.5) * 2, wz + (r() - 0.5) * 2, 0.9);
      }
    }

    // buildings
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      const t = grid[x][y];
      if (!B.isBuilding(t) || t === 'park' || t === 'plaza') {
        const wx = tileX(x), wz = tileZ(y);
        if (t === 'plaza') {
          decor.push({ kind: 'cyl', p: V(wx, 0.5, wz), s: V(1.5, 1, 1.5), c: col('#8fb8b0') });
          decor.push({ kind: 'cyl', p: V(wx, 1.3, wz), s: V(0.5, 1.6, 0.5), c: col('#dcd3c2') });
        }
        const pid = pins[x][y];
        if (pid && (t === 'plaza' || t === 'park')) {
          const grp0 = new THREE.Group(); grp0.position.set(wx, 0, wz); world.add(grp0);
          const pk = new THREE.Mesh(new THREE.BoxGeometry(T * 0.9, 6, T * 0.9), new THREE.MeshBasicMaterial({ visible: false }));
          pk.position.y = 3; pk.userData.tile = [x, y]; grp0.add(pk); pickMeshes.push(pk);
          labelData.push({ id: pid, x, y, wx, wz, top: 6 });
        }
        continue;
      }
      const d = B.TYPES[t];
      const lv = levels[x][y] || 1;
      const wx = tileX(x), wz = tileZ(y);
      const seed = x * 11 + y * 5;
      const rr = rng(seed + 99);
      const H = Math.max(2, B.bldHeight(t, lv) * HSCALE);
      const inset = d.inset || 0.15;
      const w = T * (1 - inset * 1.1) * (t === 'school' ? 1.05 : 1);
      const grp = new THREE.Group();
      grp.position.set(wx, 0, wz);
      world.add(grp);

      const wallColor = { house: '#efe6d2', apt: '#d9cdbb', shop: '#e8c98a', office: '#7fa6c9', clinic: '#f2efe8', school: '#c9d8c4', windmill: '#ebe6da', wheel: '#d67e49' }[t] || '#cfd8d0';
      let topY = H;

      if (t === 'house') {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(w, H, w), new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 }));
        walls.position.y = H / 2; walls.castShadow = walls.receiveShadow = true; grp.add(walls);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, H * 0.7, 4), new THREE.MeshStandardMaterial({ color: ['#b0412e', '#bd5530', '#923a2c', '#c9612f'][seed % 4], roughness: 0.7 }));
        roof.position.y = H + H * 0.35; roof.rotation.y = Math.PI / 4; roof.castShadow = true; grp.add(roof);
        topY = H + H * 0.7;
      } else if (t === 'wheel') {
        const R = H * 0.42;
        for (const s of [-1, 1]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, R * 1.5, 0.3), new THREE.MeshStandardMaterial({ color: '#d9d4c9' }));
          leg.position.set(s * R * 0.35, R * 0.7, 0); leg.rotation.z = -s * 0.28; leg.castShadow = true; grp.add(leg);
        }
        const wheel = new THREE.Group(); wheel.position.y = R + 1.4;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.18, 6, 40), new THREE.MeshStandardMaterial({ color: '#f2ece0' })); wheel.add(ring);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(R * 0.5, 0.12, 6, 30), new THREE.MeshStandardMaterial({ color: '#f2ece0' })); wheel.add(ring2);
        const cols = ['#d95f59', '#e0c25b', '#5f8c7a', '#7fa6c9'];
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: '#d4cdbe' }));
          spoke.rotation.z = a; if (i < 5) wheel.add(spoke);
          const g = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: cols[i % 4] }));
          g.position.set(Math.cos(a) * R, Math.sin(a) * R, 0); g.userData.gondola = true; wheel.add(g);
        }
        grp.add(wheel); anim.wheels.push(wheel);
        topY = R * 2 + 2;
      } else if (t === 'windmill') {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.2, w * 0.38, H, 12), new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 }));
        tower.position.y = H / 2; tower.castShadow = true; grp.add(tower);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.28, 2.2, 12), new THREE.MeshStandardMaterial({ color: '#7ea89b' }));
        cap.position.y = H + 1.1; grp.add(cap);
        const rotor = new THREE.Group(); rotor.position.set(0, H, w * 0.3);
        for (let i = 0; i < 4; i++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, H * 0.55, 0.08), new THREE.MeshStandardMaterial({ color: '#f4f1ea' }));
          blade.position.y = H * 0.28; const pivot = new THREE.Group(); pivot.rotation.z = (i * Math.PI) / 2; pivot.add(blade); rotor.add(pivot);
        }
        grp.add(rotor); anim.mills.push(rotor);
        topY = H + 2.2;
      } else {
        // glass tower (apt / office / shop / clinic / school)
        const glassCol = { office: '#9fc3dc', apt: '#d9c3b6', shop: '#e8d6a8', clinic: '#f2efe8', school: '#b8d2c8' }[t] || '#cfd8d0';
        const mat = glassMaterial(glassCol, w, H);
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, H, w), mat);
        body.position.y = H / 2; body.castShadow = body.receiveShadow = true; grp.add(body);
        if (lv >= 2 && (t === 'apt' || t === 'office')) {
          const th = lv >= 3 ? 7 : 4;
          const up = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, th, w * 0.66), glassMaterial(glassCol, w * 0.66, th));
          up.position.y = H + th / 2; up.castShadow = true; grp.add(up); topY = H + th;
        }
        // vertical-forest terraces: planter ledge + foliage on every ~3 units
        if (H > 8 || t === 'clinic' || t === 'school') {
          const floors = Math.max(2, Math.floor(H / 3.2));
          for (let f = 1; f <= floors; f++) {
            const fy = f * (H / floors);
            const ext = 0.55;
            for (const side of [0, 1, 2, 3]) {
              const horiz = side < 2;
              const sgn = side % 2 ? -1 : 1;
              const len = w * (0.55 + rr() * 0.45);
              const px = horiz ? wx + (rr() - 0.5) * (w - len) : wx + sgn * (w / 2 + ext / 2);
              const pz = horiz ? wz + sgn * (w / 2 + ext / 2) : wz + (rr() - 0.5) * (w - len);
              ledges.push({ p: V(px, fy - 0.1, pz), s: V(horiz ? len : ext, 0.28, horiz ? ext : len), c: col('#3a4a3a') });
              const nb = 2 + Math.floor(rr() * 3);
              for (let k = 0; k < nb; k++) {
                const ox = horiz ? (rr() - 0.5) * len : sgn * (w / 2 + ext * 0.6);
                const oz = horiz ? sgn * (w / 2 + ext * 0.6) : (rr() - 0.5) * len;
                const sz = 0.5 + rr() * 0.7;
                leaves.push({ p: V(wx + ox, fy + 0.45 + rr() * 0.3, wz + oz), s: V(sz * 1.15, sz * 0.9, sz * 1.15), c: col(CROWNS[Math.floor(rr() * CROWNS.length)]) });
              }
            }
          }
          // hanging vines
          const nv = Math.round(H * 1.6);
          for (let k = 0; k < nv; k++) {
            const face = Math.floor(rr() * 4);
            const off = (rr() - 0.5) * (w - 0.6);
            const len = 2 + rr() * Math.min(H * 0.6, 11);
            const y1 = H - rr() * H * 0.8;
            const px = face < 2 ? wx + off : wx + (face === 2 ? 1 : -1) * (w / 2 + 0.08);
            const pz = face < 2 ? wz + (face === 0 ? 1 : -1) * (w / 2 + 0.08) : wz + off;
            vines.push({ p: V(px, Math.max(len / 2, y1 - len / 2), pz), s: V(face < 2 ? 0.35 + rr() * 0.4 : 0.1, len, face < 2 ? 0.1 : 0.35 + rr() * 0.4), c: col(VINES[Math.floor(rr() * VINES.length)]) });
          }
        }
        // rooftop garden
        const rw = (lv >= 2 && (t === 'apt' || t === 'office') ? w * 0.66 : w) * 0.5;
        for (let k = 0; k < 7; k++) {
          const sz = 0.9 + rr() * 1.1;
          leaves.push({ p: V(wx + (rr() - 0.5) * rw * 1.6, topY + sz * 0.5, wz + (rr() - 0.5) * rw * 1.6), s: V(sz * 1.3, sz, sz * 1.3), c: col(CROWNS[Math.floor(rr() * CROWNS.length)]) });
        }
        if (t === 'clinic') {
          const cross1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.2, w * 0.14), new THREE.MeshStandardMaterial({ color: '#c8443d' }));
          const cross2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.14, 0.2, w * 0.5), new THREE.MeshStandardMaterial({ color: '#c8443d' }));
          cross1.position.y = cross2.position.y = topY + 0.15; grp.add(cross1, cross2);
        }
        if (t === 'shop') {
          const aw = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.25, 0.9), new THREE.MeshStandardMaterial({ color: '#c0463a' }));
          aw.position.set(0, 3.4, w / 2 + 0.4); grp.add(aw);
        }
        if (t === 'office') {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 5, 6), new THREE.MeshStandardMaterial({ color: '#9cb3c9' }));
          mast.position.y = topY + 2.5; grp.add(mast);
        }
      }

      // pick box + label for pinned items
      const id = pins[x][y];
      if (id) {
        const pick = new THREE.Mesh(new THREE.BoxGeometry(T * 0.9, topY + 2, T * 0.9), new THREE.MeshBasicMaterial({ visible: false }));
        pick.position.set(0, (topY + 2) / 2, 0); pick.userData.tile = [x, y]; grp.add(pick); pickMeshes.push(pick);
        labelData.push({ id, x, y, wx, wz, top: topY + 3 });
        const disc = new THREE.Mesh(new THREE.CircleGeometry(T * 1.5, 40), new THREE.MeshBasicMaterial({ color: 0xff8c28, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        disc.rotation.x = -Math.PI / 2; disc.position.set(wx, 0.12, wz); world.add(disc);
        heatDiscs.push({ mesh: disc, id, phase: x + y });
      }
    }

    // build instanced meshes
    const box = new THREE.BoxGeometry(1, 1, 1);
    instanced(box, new THREE.MeshStandardMaterial({ roughness: 1 }), soils, { receive: true });
    instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.95 }), tops, { receive: true });
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 7);
    instanced(cyl, new THREE.MeshStandardMaterial({ roughness: 0.9 }), trunks.map((o) => ({ ...o })), { cast: true });
    const ico = new THREE.IcosahedronGeometry(1, 1);
    instanced(ico, new THREE.MeshStandardMaterial({ roughness: 0.85 }), crowns, { cast: true });
    instanced(ico, new THREE.MeshStandardMaterial({ roughness: 0.85 }), leaves, { cast: true });
    instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.9 }), ledges, { cast: true });
    instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.9 }), vines, {});
    const boxes = decor.filter((d) => d.kind === 'box'), cyls = decor.filter((d) => d.kind === 'cyl');
    instanced(box, new THREE.MeshStandardMaterial({ roughness: 0.8 }), boxes, { cast: true });
    instanced(cyl, new THREE.MeshStandardMaterial({ roughness: 0.7 }), cyls, { cast: true });

    carsMesh = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.5 }), 160);
    carsMesh.castShadow = true; carsMesh.count = 0; world.add(carsMesh);
    boatsMesh = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.6 }), 30);
    boatsMesh.count = 0; world.add(boatsMesh);

    signature = sig();
  }

  // ---------- selection marker ----------
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(T * 0.8, 0.12, 8, 48), new THREE.MeshBasicMaterial({ color: 0x5ef2d6, fog: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.25;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.55, T * 0.55, 60, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x5ef2d6, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 30;
  marker.add(ring, beam); marker.visible = false; scene.add(marker);

  // ---------- labels ----------
  const labelsEl = document.createElement('div');
  labelsEl.id = 'labels3d';
  document.body.appendChild(labelsEl);
  let labelEls = new Map();
  function syncLabels() {
    labelsEl.innerHTML = ''; labelEls = new Map();
    for (const d of labelData) {
      const it = B.getItem(d.id);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lbl3d';
      b.innerHTML = '<i></i><span></span>';
      b.lastChild.textContent = it.name;
      b.firstChild.className = it.kind === 'google' ? 'g' : (it.isPrivate ? 'p' : '');
      b.onclick = (e) => { e.stopPropagation(); B.select(d.x, d.y); };
      labelsEl.appendChild(b);
      labelEls.set(d.id, { el: b, w: 0 });
    }
  }

  // ---------- camera controls ----------
  const cam = { az: Math.PI * 0.25, pol: 0.95, dist: 175, tx: 0, ty: 4, tz: 0 };
  const goal = { az: cam.az, pol: cam.pol, dist: cam.dist, tx: 0, ty: 4, tz: 0 };
  const HOME = { pol: 0.95, dist: 175, tx: 0, ty: 4, tz: 0 };
  function fitDist() { const a = innerWidth / innerHeight; return a < 0.9 ? 175 / Math.max(0.55, a) * 0.95 : 175; }
  HOME.dist = goal.dist = cam.dist = fitDist();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const pts = new Map();
  let dragInfo = null;
  dom.addEventListener('contextmenu', (e) => e.preventDefault());
  dom.addEventListener('pointerdown', (e) => {
    dom.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragInfo = { moved: false, sx: e.clientX, sy: e.clientY, pan: e.button === 2 || e.shiftKey, pd: pts.size === 2 ? pinchDist() : 0 };
  });
  function pinchDist() { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
  dom.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) { hoverPick(e.clientX, e.clientY); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (!dragInfo) return;
    if (Math.hypot(e.clientX - dragInfo.sx, e.clientY - dragInfo.sy) > 5) dragInfo.moved = true;
    if (pts.size === 2) {
      const d = pinchDist();
      if (dragInfo.pd) goal.dist = clamp(goal.dist * (dragInfo.pd / d), 25, 420);
      dragInfo.pd = d; dragInfo.moved = true;
    } else if (dragInfo.pan) {
      const k = goal.dist * 0.0016;
      const cx = Math.cos(goal.az), sx = Math.sin(goal.az);
      goal.tx -= (dx * cx + dy * sx) * k; goal.tz -= (-dx * sx + dy * cx) * k;
    } else {
      goal.az -= dx * 0.006; goal.pol = clamp(goal.pol - dy * 0.005, 0.25, 1.45);
    }
  });
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickAt(cx, cy) {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickMeshes, false);
    return hits.length ? hits[0].object.userData.tile : null;
  }
  function hoverPick(cx, cy) { dom.style.cursor = pickAt(cx, cy) ? 'pointer' : 'grab'; }
  function up(e) {
    const had = pts.delete(e.pointerId);
    if (had && dragInfo && !dragInfo.moved && !pts.size) {
      const t = pickAt(e.clientX, e.clientY);
      if (t) B.select(t[0], t[1]); else B.clear();
    }
    if (!pts.size) dragInfo = null;
  }
  dom.addEventListener('pointerup', up);
  dom.addEventListener('pointercancel', up);
  dom.addEventListener('wheel', (e) => { e.preventDefault(); goal.dist = clamp(goal.dist * (e.deltaY < 0 ? 0.9 : 1.1), 25, 420); }, { passive: false });

  // Intercept the 2D controls
  const rotate = () => { goal.az += Math.PI / 2; };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('#rotBtn, #zoomIn, #zoomOut, #centerBtn');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    if (b.id === 'rotBtn') rotate();
    else if (b.id === 'zoomIn') goal.dist = clamp(goal.dist * 0.8, 25, 420);
    else if (b.id === 'zoomOut') goal.dist = clamp(goal.dist * 1.25, 25, 420);
    else { goal.tx = HOME.tx; goal.ty = HOME.ty; goal.tz = HOME.tz; goal.dist = fitDist(); goal.pol = HOME.pol; }
  }, true);
  addEventListener('keydown', (e) => {
    if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
    if (e.key === 'r' || e.key === 'R' || e.key === 'q' || e.key === 'Q') { e.stopImmediatePropagation(); e.key.toLowerCase() === 'q' ? (goal.az -= Math.PI / 2) : rotate(); }
    else if (e.key === '+' || e.key === '=') { e.stopImmediatePropagation(); goal.dist = clamp(goal.dist * 0.8, 25, 420); }
    else if (e.key === '-' || e.key === '_') { e.stopImmediatePropagation(); goal.dist = clamp(goal.dist * 1.25, 25, 420); }
  }, true);

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  });

  // ---------- frame loop ----------
  const skyTopDay = col('#6fb7d8'), skyTopNight = col('#050d14');
  const horDay = col('#cfe9d8'), horNight = col('#08141a');
  const tmp = col('#fff');
  let lastSel = '';
  let tPrev = performance.now();
  let lastSigCheck = 0;
  const mat4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const upV = new THREE.Vector3(0, 1, 0);

  function updateAgents() {
    const ag = B.agents();
    let n = 0;
    for (const c of ag.cars || []) {
      if (n >= 160) break;
      const dx = c.tx - c.fx, dy = c.ty - c.fy;
      p3.set(tileX(c.px - 0.5 + 0.5) + (-dy) * 0.55, 0.45, tileZ(c.py - 0.5 + 0.5) + dx * 0.55);
      q4.setFromAxisAngle(upV, Math.atan2(-dy, dx));
      s3.set(1.7, 0.7, 0.85);
      mat4.compose(p3, q4, s3); carsMesh.setMatrixAt(n, mat4);
      carsMesh.setColorAt(n, tmp.set(c.color)); n++;
    }
    carsMesh.count = n; carsMesh.instanceMatrix.needsUpdate = true; if (carsMesh.instanceColor) carsMesh.instanceColor.needsUpdate = true;
    n = 0;
    for (const b of ag.boats || []) {
      if (n >= 30) break;
      const dx = b.tx - b.fx, dy = b.ty - b.fy;
      p3.set(tileX(b.px), -0.55, tileZ(b.py));
      q4.setFromAxisAngle(upV, Math.atan2(-dy, dx));
      s3.set(2.2, 0.5, 0.9);
      mat4.compose(p3, q4, s3); boatsMesh.setMatrixAt(n++, mat4);
    }
    boatsMesh.count = n; boatsMesh.instanceMatrix.needsUpdate = true;
  }

  function frame(now) {
    const dt = Math.min(0.1, (now - tPrev) / 1000); tPrev = now;
    if (now - lastSigCheck > 700) {
      lastSigCheck = now;
      if (sig() !== signature) { build(); syncLabels(); }
    }
    // day / night
    const L = B.getL();
    const hr = B.getHour();
    const s = Math.max(0, Math.sin(((hr - 6) / 24) * Math.PI * 2));
    const elev = 7 + 45 * s;
    const sa = 2.35; // sun azimuth
    const sd = new THREE.Vector3(Math.cos(sa) * Math.cos(elev * Math.PI / 180), Math.sin(elev * Math.PI / 180), Math.sin(sa) * Math.cos(elev * Math.PI / 180));
    sun.position.copy(sd).multiplyScalar(220); sun.target.position.set(0, 0, 0);
    const warm = clamp(1 - elev / 45, 0, 1);
    sun.color.setRGB(1, 0.94 - warm * 0.3, 0.82 - warm * 0.45);
    sun.intensity = 0.15 + 1.5 * L;
    hemi.intensity = 0.28 + 0.62 * L;
    skyMat.uniforms.top.value.copy(skyTopNight).lerp(skyTopDay, L);
    skyMat.uniforms.horizon.value.copy(horNight).lerp(horDay, L);
    skyMat.uniforms.sunDir.value.copy(sd);
    skyMat.uniforms.glowAmt.value = 0.15 + 0.85 * L;
    fog.color.copy(skyMat.uniforms.horizon.value);
    scene.userData.beams.opacity = 0.02 + 0.07 * L;
    for (const m of glassMats) m.emissiveIntensity = (1 - L) * 1.4;
    scene.userData.water.material.color.copy(col('#2a5a5c')).lerp(col('#4d9a98'), L);

    // selection -> camera focus
    const selT = B.getSelected();
    const selKey = selT ? selT.join(',') : '';
    if (selKey !== lastSel) {
      lastSel = selKey;
      if (selT) {
        goal.tx = tileX(selT[0]); goal.tz = tileZ(selT[1]); goal.ty = 5;
        goal.dist = clamp(Math.min(goal.dist, 80), 25, 420);
        marker.position.set(tileX(selT[0]), 0, tileZ(selT[1])); marker.visible = true;
      } else marker.visible = false;
    }
    if (marker.visible) { const pu = 1 + Math.sin(now * 0.005) * 0.08; ring.scale.set(pu, pu, pu); }

    // camera easing
    const k = 1 - Math.pow(0.0008, dt);
    for (const key of ['az', 'pol', 'dist', 'tx', 'ty', 'tz']) cam[key] += (goal[key] - cam[key]) * k;
    camera.position.set(
      cam.tx + cam.dist * Math.sin(cam.pol) * Math.cos(cam.az),
      cam.ty + cam.dist * Math.cos(cam.pol),
      cam.tz + cam.dist * Math.sin(cam.pol) * Math.sin(cam.az));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    sky.position.copy(camera.position);

    // animation
    for (const w of anim.wheels) { w.rotation.z += dt * 0.25; w.children.forEach((c) => { if (c.userData.gondola) c.rotation.z = -w.rotation.z; }); }
    for (const m of anim.mills) m.rotation.z += dt * 0.9;
    scene.userData.water.material.opacity = 0.92 + Math.sin(now * 0.0015) * 0.02;
    if (carsMesh) updateAgents();

    // heat glow
    const showHeat = B.getShowHeat();
    for (const d of heatDiscs) {
      const h = showHeat ? B.heat(d.id) : 0;
      const m = d.mesh.material;
      if (h > 0) {
        m.color.set(h >= 0.7 ? 0xff8c28 : h >= 0.4 ? 0xf0c846 : 0x5ef2d6);
        m.opacity = (0.28 + 0.3 * h) * (0.8 + 0.2 * Math.sin(now * 0.003 + d.phase));
        d.mesh.visible = true;
      } else d.mesh.visible = false;
    }

    renderer.render(scene, camera);
    positionLabels();
    requestAnimationFrame(frame);
  }

  const v3 = new THREE.Vector3();
  function positionLabels() {
    const show = B.getShowLabels();
    labelsEl.style.display = show ? '' : 'none';
    if (!show) return;
    const sel = B.getSelected();
    const items = [];
    for (const d of labelData) {
      v3.set(d.wx, d.top, d.wz).project(camera);
      const entry = labelEls.get(d.id);
      if (!entry) continue;
      if (v3.z > 1 || v3.z < -1) { entry.el.style.display = 'none'; continue; }
      const isSel = sel && sel[0] === d.x && sel[1] === d.y;
      items.push({ d, entry, sx: (v3.x * 0.5 + 0.5) * innerWidth, sy: (-v3.y * 0.5 + 0.5) * innerHeight, z: v3.z, isSel });
    }
    items.sort((a, b) => (b.isSel - a.isSel) || (a.z - b.z));
    const placed = [];
    for (const it of items) {
      const el = it.entry.el;
      el.style.display = '';
      if (!it.entry.w) it.entry.w = el.offsetWidth || 90;
      const w = it.entry.w, h = 24;
      let x = it.sx - w / 2, y = it.sy - h - 6;
      const hit = placed.some((p) => !(x + w + 4 < p.x || p.x + p.w + 4 < x || y + h + 4 < p.y || p.y + p.h + 4 < y));
      const compact = hit && !it.isSel;
      el.classList.toggle('dot', compact);
      el.classList.toggle('sel', !!it.isSel);
      if (!compact) placed.push({ x, y, w, h });
      else { x = it.sx - 9; y = it.sy - 20; }
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      el.style.zIndex = String(1000 - Math.round(it.z * 500));
    }
  }

  // Leafy foreground framing, like the reference photos.
  const leaf = document.createElement('div');
  leaf.id = 'leafFrame';
  leaf.innerHTML = '<svg viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d3d1c"/><stop offset="1" stop-color="#1f6b2e"/></linearGradient></defs><path d="M0 0 L360 0 C300 60 230 90 150 150 C90 195 40 260 0 380 Z" fill="url(#lg)"/><path d="M0 40 C90 70 170 70 330 6" stroke="#4aa648" stroke-opacity=".35" stroke-width="3" fill="none"/><path d="M0 120 C70 130 150 110 250 40" stroke="#4aa648" stroke-opacity=".3" stroke-width="3" fill="none"/></svg>';
  document.body.appendChild(leaf);

  build();
  syncLabels();
  requestAnimationFrame(frame);
})();
