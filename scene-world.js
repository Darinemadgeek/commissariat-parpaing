// Décor autour du commissariat : campagne, ville, métropole, mégapole, cité.
// Le commissariat occupe l'îlot x -28..28, z -28..16 ; des rues l'entourent.
(function () {
  const { THREE, scene, mat, box, cyl, ball, flat, sign, figure, onFrame, setSky } = S;
  let env = null, traffic = [], spinners = [], seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rr = (a, b) => a + rand() * (b - a);
  const pick = a => a[Math.floor(rand() * a.length)];

  // ---------- façades texturées (une texture répétée par style) ----------
  const STY = {
    haussmann: { wall: '#efe3c8', win: '#3b4a66', frame: '#d2c19c', roof: '#5b6b82', balcony: true },
    brique: { wall: '#c8694a', win: '#2f3b52', frame: '#ead8c0', roof: '#6b4a3a' },
    pastelA: { wall: '#f6bd60', win: '#33415c', frame: '#ffffff', roof: '#9a6b4f' },
    pastelB: { wall: '#84a59d', win: '#33415c', frame: '#f5f0e6', roof: '#5c4b51' },
    pastelC: { wall: '#f28482', win: '#33415c', frame: '#ffffff', roof: '#6d597a' },
    beton: { wall: '#c9ccd1', win: '#4a5a70', frame: '#a9adb3', roof: '#8d939e' },
    verre: { wall: '#2d4a6b', win: '#86c5f0', frame: '#1d3550', roof: '#3a4152', full: true },
    nuit: { wall: '#1d2b44', win: '#2a3b5c', frame: '#141e33', roof: '#2a3142', full: true, lit: '#ffd27a' },
    hlm: { wall: '#e6e1d6', win: '#3b4a66', frame: '#e0a91f', roof: '#9aa0aa', balcony: true },
    ferme: { wall: '#f3ede0', win: '#4a3a2a', frame: '#7a5233', roof: '#a8432e' },
  };
  const facadeMats = {};
  function facade(name) {
    if (facadeMats[name]) return facadeMats[name];
    const s = STY[name], N = 4, c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = s.wall; g.fillRect(0, 0, 256, 256);
    let e = null, ge = null;
    if (s.lit) { e = document.createElement('canvas'); e.width = e.height = 256; ge = e.getContext('2d'); ge.fillStyle = '#000'; ge.fillRect(0, 0, 256, 256); }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = i * 64, y = j * 64;
      if (s.full) { g.fillStyle = s.frame; g.fillRect(x, y, 64, 64); g.fillStyle = s.win; g.fillRect(x + 3, y + 4, 58, 52); }
      else { g.fillStyle = s.frame; g.fillRect(x + 14, y + 10, 36, 42); g.fillStyle = s.win; g.fillRect(x + 17, y + 13, 30, 36); g.fillStyle = s.frame; g.fillRect(x + 31, y + 13, 2, 36); }
      if (s.balcony) { g.fillStyle = s.frame; g.fillRect(x + 8, y + 50, 48, 6); }
      if (ge && Math.random() < 0.45) { ge.fillStyle = s.lit; ge.fillRect(x + 3, y + 4, 58, 52); }
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
    const o = { map: tex, flatShading: true, roughness: s.full ? 0.35 : 0.9, metalness: s.full ? 0.2 : 0 };
    if (e) { const et = new THREE.CanvasTexture(e); et.wrapS = et.wrapT = THREE.RepeatWrapping; o.emissiveMap = et; o.emissive = new THREE.Color('#ffffff'); o.emissiveIntensity = 0.9; }
    const wallM = new THREE.MeshStandardMaterial(o), roofM = mat(s.roof);
    return (facadeMats[name] = [wallM, wallM, roofM, roofM, wallM, wallM]);
  }
  // Immeuble : chaque mètre de façade reçoit la même densité de fenêtres
  function building(p, w, h, d, style, x, z, shadow) {
    const gm = new THREE.BoxGeometry(w, h, d), uv = gm.attributes.uv;
    const sx = [d, d, 0, 0, w, w], TILE = 3.2 * 4;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      if (f === 2 || f === 3) { uv.setXY(i, 0, 0); continue; }
      uv.setXY(i, uv.getX(i) * sx[f] / TILE, uv.getY(i) * h / (3 * 4));
    }
    const m = new THREE.Mesh(gm, facade(style));
    m.position.set(x, h / 2, z);
    m.castShadow = !!shadow; m.receiveShadow = true;
    p.add(m);
    return m;
  }

  // ---------- rues ----------
  const XS = [-160, -96, -32, 32, 96, 160], ZS = [-136, -84, -32, 20, 72, 124];
  const isLot = (x0, x1, z0, z1) => x0 > -40 && x1 < 40 && z0 > -40 && z1 < 25;
  function roads(p, grid, extent) {
    const asph = '#4b5060', line = '#f4f4f4';
    const zs = grid ? ZS : [20, -32], xs = grid ? XS : [-32, 32];
    for (const z of zs) {
      const L = grid || z === 20 ? extent * 2 : 64;
      flat(p, L, 8, asph, 0, 0.02, z);
      for (let x = -L / 2; x < L / 2; x += 6) flat(p, 2.4, 0.18, line, x, 0.03, z);
    }
    for (const x of xs) {
      const L = grid ? extent * 2 : x === -32 ? extent * 2 : 60, cz = grid ? 0 : x === -32 ? 0 : -6;
      flat(p, 8, L, asph, x, 0.021, cz);
      for (let z = cz - L / 2; z < cz + L / 2; z += 6) flat(p, 0.18, 2.4, line, x, 0.031, z);
    }
    for (let i = 0; i < 6; i++) flat(p, 0.9, 6, '#f4f4f4', -6 + i * 1.6, 0.035, 20); // passage piéton devant l'entrée
  }

  // ---------- voitures ----------
  function carMesh(color, big) {
    const g = new THREE.Group();
    if (big) { box(g, 5.2, 1.6, 1.5, color, 0, 0.3, 0); box(g, 5.25, 0.5, 1.55, '#bfe3ff', 0, 1.15, 0); }
    else { box(g, 2.0, 0.55, 1.0, color, 0, 0.2, 0); box(g, 1.05, 0.45, 0.9, '#cfe0f5', -0.1, 0.75, 0); }
    [[-0.65, 0.48], [0.65, 0.48], [-0.65, -0.48], [0.65, -0.48]].forEach(([x, z]) => { const w = cyl(g, 0.22, 0.22, 0.14, 8, '#151821', x * (big ? 2.2 : 1), 0.06, z * (big ? 1.5 : 1)); w.rotation.x = Math.PI / 2; w.position.y = 0.22; });
    return g;
  }
  function addTraffic(p, n, grid, extent, tractor) {
    // autour de l'îlot, les voies intérieures sont réservées aux patrouilles
    const lanes = [];
    for (const z of grid ? ZS : [20]) {
      if (z === 20) lanes.push({ ax: 'x', c: 22, dir: 1 });
      else if (z === -32) lanes.push({ ax: 'x', c: -34, dir: -1 });
      else { lanes.push({ ax: 'x', c: z + 2, dir: 1 }); lanes.push({ ax: 'x', c: z - 2, dir: -1 }); }
    }
    for (const x of grid ? XS : [-32]) {
      if (x === -32) lanes.push({ ax: 'z', c: -34, dir: 1 });
      else if (x === 32) lanes.push({ ax: 'z', c: 34, dir: -1 });
      else { lanes.push({ ax: 'z', c: x - 2, dir: 1 }); lanes.push({ ax: 'z', c: x + 2, dir: -1 }); }
    }
    const colors = ['#e63946', '#f1faee', '#ffb703', '#219ebc', '#8ecae6', '#2a9d8f', '#3a3a3a', '#ffffff', '#c879ff'];
    for (let i = 0; i < n; i++) {
      const L = tractor && i === 0 ? lanes[0] : pick(lanes);
      const big = rand() < 0.12, g = tractor && i === 0 ? tractorMesh() : carMesh(pick(colors), big);
      g.userData = { L, s: rr(-extent, extent), sp: (tractor && i === 0 ? 2.5 : rr(6, 10)) * L.dir, ext: extent };
      p.add(g); traffic.push(g);
    }
  }
  function tractorMesh() {
    const g = new THREE.Group();
    box(g, 1.8, 0.8, 1.1, '#3fae5a', 0, 0.5, 0); box(g, 0.9, 0.9, 1.0, '#2f8a45', -0.4, 1.3, 0);
    [[-0.6, 0.6, 0.55], [-0.6, -0.6, 0.55], [0.7, 0.55, 0.35], [0.7, -0.55, 0.35]].forEach(([x, z, r]) => { const w = cyl(g, r, r, 0.3, 10, '#1d1d1d', x, 0, z); w.rotation.x = Math.PI / 2; w.position.y = r; });
    return g;
  }

  // ---------- végétation, mobilier ----------
  function tree(p, x, z, s, shadow) {
    const t = new THREE.Group();
    cyl(t, 0.18, 0.26, 1.3, 6, '#8a5a35', 0, 0, 0);
    const greens = ['#3fae5a', '#58c26a', '#2f9a4f', '#7dd36b'];
    if (rand() < 0.55) ball(t, 1.15, pick(greens), 0, 2.1, 0, 0);
    else { cyl(t, 0, 1.2, 2.2, 7, pick(greens), 0, 1.0, 0); cyl(t, 0, 0.9, 1.6, 7, pick(greens), 0, 2.2, 0); }
    t.position.set(x, 0, z); t.scale.setScalar(s); t.rotation.y = rand() * 6;
    if (!shadow) t.traverse(o => { o.castShadow = false; });
    p.add(t);
  }

  // ---------- campagne ----------
  function campagne(p) {
    setSky({ sky: '#a8dcff', fogNear: 120, fogFar: 300, hemiGround: '#5d7d3c' });
    flat(p, 900, 900, '#86c76a', 0, -0.02, 0);
    roads(p, false, 320);
    const crops = ['#e9c46a', '#a7c957', '#8d6e4a', '#f4d35e', '#6a994e', '#c5a880'];
    for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
      const x = i * 30, z = j * 30;
      if (Math.abs(x) < 55 && z > -60 && z < 40) continue;
      if (Math.abs(z - 20) < 18 || Math.abs(x + 32) < 16) continue;
      if (rand() < 0.15) continue;
      const c = pick(crops), w = rr(22, 27), d = rr(22, 27);
      flat(p, w, d, c, x, 0.01, z);
      if (c === '#8d6e4a' || c === '#e9c46a') for (let k = 0; k < 6; k++) flat(p, w - 2, 0.5, c === '#8d6e4a' ? '#6f5438' : '#d4ad4f', x, 0.015, z - d / 2 + 2 + k * (d - 4) / 5);
      if (rand() < 0.5) for (let k = 0; k < 5; k++) tree(p, x - w / 2 + rand() * w, z + d / 2 + 1.5, rr(0.6, 1), false);
    }
    // fermes
    [[70, -60], [-90, -40], [95, 70]].forEach(([x, z], i) => {
      const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = i * 1.3; p.add(f);
      box(f, 10, 5, 7, '#b5322c', 0, 0, 0); box(f, 10.4, 0.5, 7.4, '#f3ede0', 0, 5, 0);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 10.4, 3), mat('#6b2a24')); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 6; roof.position.set(0, 6.6, 0); roof.scale.set(1, 1, 0.9); roof.castShadow = true; f.add(roof);
      box(f, 3.4, 3.4, 0.1, '#f3ede0', 0, 0, 3.55);
      building(f, 7, 6, 6, 'ferme', 12, 2, true);
      cyl(f, 2, 2, 9, 12, '#c9ccd1', -9, 0, -2); ball(f, 2.05, '#9aa0aa', -9, 9, -2, 1);
      for (let k = 0; k < 4; k++) { const h = cyl(f, 0.9, 0.9, 1.6, 10, '#e9c46a', 4 + k * 2.2, 0, 8); h.rotation.x = Math.PI / 2; h.position.y = 0.9; }
    });
    // vaches
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Group(); c.position.set(rr(48, 80), 0, rr(-20, 5)); c.rotation.y = rand() * 6; p.add(c);
      box(c, 1.6, 0.8, 0.8, '#ffffff', 0, 0.6, 0); box(c, 0.5, 0.5, 0.5, '#ffffff', 1.0, 1.0, 0);
      box(c, 0.6, 0.4, 0.82, '#222222', -0.2, 0.8, 0); box(c, 0.2, 0.2, 0.52, '#f2a3b3', 1.3, 0.95, 0);
      [[-0.6, 0.3], [0.6, 0.3], [-0.6, -0.3], [0.6, -0.3]].forEach(([x, z]) => box(c, 0.16, 0.6, 0.16, '#ffffff', x, 0, z));
    }
    // village et église
    const vil = new THREE.Group(); vil.position.set(-62, 0, 52); p.add(vil);
    box(vil, 7, 6, 14, '#e6dcc5', 0, 0, 0); box(vil, 7.6, 0.6, 14.6, '#8a5a35', 0, 6, 0);
    box(vil, 4, 14, 4, '#e6dcc5', 0, 0, -8); cyl(vil, 0, 3, 7, 4, '#5b6b82', 0, 14, -8).rotation.y = Math.PI / 4;
    sign(vil, 'MAIRIE', 3, 0.7, '#2346a8', '#ffffff', 10, 3.6, 3.6);
    for (let i = 0; i < 9; i++) {
      const x = -14 + (i % 3) * 14 + rr(-2, 2), z = -10 + Math.floor(i / 3) * 13;
      if (Math.abs(x) < 6 && Math.abs(z) < 10) continue;
      building(vil, rr(6, 8), rr(5, 7), rr(6, 8), pick(['ferme', 'pastelA', 'ferme']), x, z, true);
      tree(vil, x + 5, z + 4, 0.8, true);
    }
    // éoliennes
    [[-40, -150], [0, -170], [40, -150], [140, -60]].forEach(([x, z]) => {
      cyl(p, 0.5, 0.9, 30, 8, '#f4f6fb', x, 0, z);
      const hub = new THREE.Group(); hub.position.set(x, 30, z + 0.8); p.add(hub);
      for (let k = 0; k < 3; k++) { const b = box(hub, 0.6, 12, 0.2, '#ffffff', 0, 0, 0); b.geometry = b.geometry; const piv = new THREE.Group(); piv.rotation.z = (k * Math.PI * 2) / 3; piv.add(b); hub.add(piv); }
      spinners.push(hub);
    });
    for (let i = 0; i < 60; i++) { const a = rand() * 6.28, r = rr(45, 160); tree(p, Math.cos(a) * r, Math.sin(a) * r, rr(0.8, 1.4), r < 70); }
    addTraffic(p, 5, false, 300, true);
  }

  // ---------- villes ----------
  const CITY = {
    ville: { sky: '#9fd0f5', ground: '#8fae84', styles: ['haussmann', 'haussmann', 'brique', 'pastelA', 'pastelB', 'pastelC'], fl: [3, 6], tower: 0.05, tf: [8, 10], cars: 26 },
    metropole: { sky: '#b9d3e6', ground: '#8e9b8a', styles: ['beton', 'verre', 'haussmann', 'brique', 'beton'], fl: [5, 10], tower: 0.3, tf: [14, 26], cars: 34 },
    megapole: { sky: '#f7b38c', ground: '#5d6470', styles: ['nuit', 'verre', 'nuit', 'beton'], fl: [8, 16], tower: 0.65, tf: [22, 55], cars: 44, dusk: true },
    cite: { sky: '#c3cad4', ground: '#7f8a7c', styles: ['hlm', 'hlm', 'beton', 'brique'], fl: [6, 12], tower: 0.2, tf: [14, 18], cars: 30, slabs: true },
  };
  function city(p, kind) {
    const C = CITY[kind];
    setSky(C.dusk ? { sky: C.sky, fogNear: 90, fogFar: 260, hemiSky: '#ffd6b8', hemiGround: '#3c4250', hemi: 0.7, sun: '#ffb27a', sunI: 0.8 } : { sky: C.sky, fogNear: 100, fogFar: 270, hemiGround: '#5a6658' });
    flat(p, 900, 900, C.ground, 0, -0.02, 0);
    roads(p, true, 200);
    for (let i = 0; i < XS.length - 1; i++) for (let j = 0; j < ZS.length - 1; j++) {
      const x0 = XS[i] + 4, x1 = XS[i + 1] - 4, z0 = ZS[j] + 4, z1 = ZS[j + 1] - 4;
      if (isLot(x0, x1, z0, z1)) continue;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, near = Math.hypot(cx, cz) < 90;
      box(p, x1 - x0, 0.15, z1 - z0, '#c9c4b8', cx, 0, cz);
      if (kind === 'ville' && i === 3 && j === 3) { park(p, x0, x1, z0, z1); continue; }
      if (kind === 'cite' && i === 1 && j === 3) { court(p, x0, x1, z0, z1); continue; }
      const m = 2, X0 = x0 + m, X1 = x1 - m, Z0 = z0 + m, Z1 = z1 - m;
      const H = () => Math.round(rr(C.fl[0], C.fl[1])) * 3;
      if (C.slabs && rand() < 0.6) { building(p, X1 - X0 - 4, H() + 6, 11, 'hlm', cx, Z0 + 6, near); building(p, X1 - X0 - 4, H() + 6, 11, 'hlm', cx, Z1 - 6, near); continue; }
      for (let x = X0; x < X1 - 5;) { const w = Math.min(rr(9, 15), X1 - x), d = rr(9, 12), st = pick(C.styles); building(p, w - 0.4, H(), d, st, x + w / 2, Z1 - d / 2, near); building(p, w - 0.4, H(), d, pick(C.styles), x + w / 2, Z0 + d / 2, near); x += w; }
      for (let z = Z0 + 12; z < Z1 - 12 - 5;) { const w = Math.min(rr(9, 14), Z1 - 12 - z), d = rr(9, 12); building(p, d, H(), w - 0.4, pick(C.styles), X0 + d / 2, z + w / 2, near); building(p, d, H(), w - 0.4, pick(C.styles), X1 - d / 2, z + w / 2, near); z += w; }
      if (rand() < C.tower) building(p, rr(12, 16), Math.round(rr(C.tf[0], C.tf[1])) * 3, rr(12, 16), pick(C.styles), cx, cz, near);
      for (let k = 0; k < 4; k++) tree(p, x0 + 1 + k * (x1 - x0 - 2) / 3, z1 + 1.2, 0.7, near);
    }
    // silhouette lointaine
    for (let i = 0; i < 70; i++) {
      const a = rand() * 6.28, r = rr(205, 300), h = C.dusk ? rr(30, 140) : rr(12, 60);
      const b = box(p, rr(10, 22), h, rr(10, 22), C.dusk ? '#4a4f6a' : '#a3adb8', Math.cos(a) * r, 0, Math.sin(a) * r); b.castShadow = false;
    }
    if (kind === 'megapole') arche(p);
    if (kind === 'ville' || kind === 'metropole') sign(p, kind === 'ville' ? 'BOULANGERIE' : 'GRAND PARPAING', 6, 1, '#e63946', '#ffffff', 50, 4, 22.2);
    addTraffic(p, C.cars, true, 175);
  }
  function park(p, x0, x1, z0, z1) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box(p, x1 - x0 - 2, 0.2, z1 - z0 - 2, '#7cc45c', cx, 0, cz);
    cyl(p, 3, 3.2, 0.6, 16, '#c9ccd1', cx, 0.2, cz); cyl(p, 2.6, 2.6, 0.1, 16, mat('#5bc0eb', { roughness: 0.2 }), cx, 0.75, cz); cyl(p, 0.3, 0.4, 2, 8, '#c9ccd1', cx, 0.2, cz);
    for (let k = 0; k < 18; k++) tree(p, rr(x0 + 3, x1 - 3), rr(z0 + 3, z1 - 3), rr(0.8, 1.2), true);
  }
  function court(p, x0, x1, z0, z1) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    box(p, 26, 0.2, 15, '#d9773a', cx, 0, cz);
    [-11, 11].forEach(dx => { cyl(p, 0.1, 0.1, 3.4, 6, '#ffffff', cx + dx, 0.2, cz); box(p, 0.1, 1, 1.6, '#ffffff', cx + dx * 0.97, 3, cz); });
    ['#ff4b5c', '#ffc93c', '#3d7bff', '#36d68a', '#c879ff'].forEach((c, k) => box(p, 5, 2.4, 0.3, c, x0 + 4 + k * 5.2, 0.2, z1 - 3));
  }
  function arche(p) {
    const g = new THREE.Group(); g.position.set(10, 0, -190); p.add(g);
    const w = '#f4f6fb';
    box(g, 44, 6, 40, w, 0, 0, 0); box(g, 44, 6, 40, w, 0, 38, 0); box(g, 6, 32, 40, w, -19, 6, 0); box(g, 6, 32, 40, w, 19, 6, 0);
    g.traverse(o => { o.castShadow = false; });
  }

  function build(biome) {
    if (env) { scene.remove(env); env.traverse(o => { if (o.geometry && !o.geometry.parameters) o.geometry.dispose(); }); }
    env = new THREE.Group(); scene.add(env); traffic = []; spinners = [];
    seed = { campagne: 11, ville: 22, metropole: 33, megapole: 44, cite: 55 }[biome] || 7;
    if (biome === 'campagne') campagne(env); else city(env, biome);
  }

  onFrame((dt, t) => {
    for (const c of traffic) {
      const u = c.userData; u.s += u.sp * dt;
      if (u.s > u.ext) u.s = -u.ext; if (u.s < -u.ext) u.s = u.ext;
      if (u.L.ax === 'x') { c.position.set(u.s, 0, u.L.c); c.rotation.y = u.sp > 0 ? 0 : Math.PI; }
      else { c.position.set(u.L.c, 0, u.s); c.rotation.y = u.sp > 0 ? -Math.PI / 2 : Math.PI / 2; }
    }
    for (const s of spinners) s.rotation.z = t * 0.8;
  });

  S.world = { build, building, carMesh };
})();
