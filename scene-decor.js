// Décors des 10 lieux, dans le style des personnages : façades peintes, toits qui débordent, formes rondes.
// Composition commune (vue du jeu) : devant la route = vie du quartier, basse ; sur les côtés = éléments
// secondaires ; derrière = le monument, qui dépasse au-dessus du commissariat.
// Zones réservées : le terrain du commissariat (x ±29, z -29..17) et la boucle des patrouilles
// (route avant z 20, arrière z -32, côtés x ±32, 8 m de large). Chaque lieu remplace son décor dans S.world.EXTRA.
(function () {
  const { THREE, mat, setSky } = S;
  const W = S.world, E = W.EXTRA, LOW = S.low;
  const rr = (a, b) => a + W.rand() * (b - a), pick = a => a[Math.floor(W.rand() * a.length)];

  // ---------- outils ----------
  const M = c => (c && c.isMaterial ? c : mat(c));
  function add(p, geo, c, x = 0, y = 0, z = 0, shadow) {
    const m = new THREE.Mesh(geo, Array.isArray(c) ? c : M(c)); m.position.set(x, y, z);
    m.castShadow = shadow !== undefined ? shadow : Math.abs(x) < 80 && Math.abs(z) < 80; m.receiveShadow = true; p.add(m); return m;
  }
  const box = (p, w, h, d, c, x, y, z) => add(p, new THREE.BoxGeometry(w, h, d), c, x, (y || 0) + h / 2, z);
  const cyl = (p, rt, rb, h, c, x, y, z, seg = 12) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, (y || 0) + h / 2, z);
  const sph = (p, r, c, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = add(p, new THREE.SphereGeometry(r, 12, 9), c, x, y, z); m.scale.set(sx, sy, sz); return m; };
  const cone = (p, r, h, c, x, y, z, seg = 10) => add(p, new THREE.ConeGeometry(r, h, seg), c, x, (y || 0) + h / 2, z);
  const grp = (p, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g); return g; };
  const flat = (p, w, d, c, x, z, y = 0.02) => { const m = add(p, new THREE.PlaneGeometry(w, d), c, x, y, z, false); m.rotation.x = -Math.PI / 2; return m; };
  const ring = (p, r, t, c, x, y, z) => { const m = add(p, new THREE.TorusGeometry(r, t, 6, 20), c, x, y, z); m.rotation.x = Math.PI / 2; return m; };
  function prism(p, w, h, d, c, x, y, z, ry = 0) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
    const m = add(p, g, c, x, y, z); m.rotation.y = ry; return m;
  }
  function mansard(p, w, h, d, c, x, y, z) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2 - h * 0.45, h); s.lineTo(-w / 2 + h * 0.45, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
    return add(p, g, c, x, y, z);
  }
  const darken = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

  // textures dessinées (gardées en cache)
  const texs = {};
  function tex(key, w, h, draw, rep) {
    if (!texs[key]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; texs[key] = t; }
    const t = texs[key].clone(); t.needsUpdate = true; if (rep) t.repeat.set(rep[0], rep[1]); return t;
  }
  const texMat = (t, o) => new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.92 }, o || {}));
  const cobbles = (rep, base = '#c9b9a0') => texMat(tex('cob' + base, 128, 128, (x, w) => {
    x.fillStyle = darken(base, 0.88); x.fillRect(0, 0, w, w);
    for (let j = 0; j < 4; j++) for (let i = -1; i < 5; i++) { x.fillStyle = darken(base, 0.97 + Math.random() * 0.07); x.beginPath(); x.roundRect((i + (j % 2) * 0.5) * 32 + 2, j * 32 + 2, 28, 28, 9); x.fill(); }
  }, rep));
  const planks = rep => texMat(tex('plank', 128, 128, (x, w) => {
    for (let i = 0; i < 8; i++) { x.fillStyle = darken('#c79a62', 0.9 + Math.random() * 0.16); x.fillRect(0, i * 16, w, 15); x.fillStyle = '#8a643a'; x.fillRect(0, i * 16 + 15, w, 1); x.fillRect((i * 37) % w, i * 16, 2, 15); }
  }, rep));
  const tarmac = rep => texMat(tex('tarmac', 128, 128, (x, w) => {
    x.fillStyle = '#6d7077'; x.fillRect(0, 0, w, w);
    for (let i = 0; i < 400; i++) { x.fillStyle = Math.random() < 0.5 ? '#63666d' : '#777a81'; x.fillRect(Math.random() * w, Math.random() * w, 2, 2); }
  }, rep));
  const dalle = rep => texMat(tex('dalle', 128, 128, (x, w) => { x.fillStyle = '#c8c2ba'; x.fillRect(0, 0, w, w); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { x.fillStyle = darken('#ece8e0', 0.96 + Math.random() * 0.06); x.beginPath(); x.roundRect(i * 64 + 2, j * 64 + 2, 60, 60, 4); x.fill(); } }, rep));
  // façade peinte : une travée par tuile, grosse fenêtre encadrée, appui, volets, balcon ou mur-rideau
  function facade(key, wall, win, opts = {}) {
    return tex('f' + key, 128, 128, (x, w, h) => {
      x.fillStyle = wall; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; x.fillRect(Math.random() * w, Math.random() * h, 6, 6); }
      if (opts.curtain) {
        x.fillStyle = win; x.fillRect(0, 0, w, h * 0.78);
        if (opts.lit && Math.random() < opts.lit) { x.fillStyle = '#ffe2a0'; x.fillRect(6, 6, w * 0.45, h * 0.66); }
        if (opts.lit && Math.random() < opts.lit) { x.fillStyle = '#ffe9b8'; x.fillRect(w * 0.52, 6, w * 0.42, h * 0.66); }
        x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.moveTo(10, h * 0.7); x.lineTo(40, 6); x.lineTo(58, 6); x.lineTo(28, h * 0.7); x.fill();
        x.fillStyle = opts.frame || '#dfe6ee'; x.fillRect(0, 0, 5, h); x.fillRect(w - 5, 0, 5, h); x.fillRect(w / 2 - 2, 0, 4, h * 0.78);
        x.fillStyle = darken(wall, 0.8); x.fillRect(0, h * 0.78, w, h * 0.22);
        return;
      }
      const ww = w * (opts.ww || 0.42), wh = h * (opts.tall || 0.5), x0 = (w - ww) / 2, y0 = h * 0.2;
      if (opts.shutters) { for (const sx of [x0 - ww * 0.42, x0 + ww + 2]) { x.fillStyle = opts.shutters; x.beginPath(); x.roundRect(sx, y0, ww * 0.4, wh, 3); x.fill(); x.fillStyle = 'rgba(0,0,0,0.18)'; for (let k = 1; k < 5; k++) x.fillRect(sx + 2, y0 + k * wh / 5, ww * 0.4 - 4, 2); } }
      const fr = opts.frame || '#fbf6ea';
      x.fillStyle = fr; x.beginPath(); x.roundRect(x0 - 5, y0 - 5, ww + 10, wh + 10, opts.arch ? [ww / 2 + 5, ww / 2 + 5, 4, 4] : 8); x.fill();
      x.fillStyle = opts.lit && Math.random() < opts.lit ? '#ffe2a0' : win; x.beginPath(); x.roundRect(x0, y0, ww, wh, opts.arch ? [ww / 2, ww / 2, 3, 3] : 5); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.28)'; x.beginPath(); x.moveTo(x0 + 4, y0 + wh * 0.6); x.lineTo(x0 + ww * 0.55, y0 + 4); x.lineTo(x0 + ww * 0.8, y0 + 4); x.lineTo(x0 + 4, y0 + wh * 0.9); x.fill();
      x.fillStyle = fr; x.fillRect(x0 + ww / 2 - 2, y0, 4, wh); x.fillRect(x0, y0 + wh * 0.45, ww, 4);
      x.fillStyle = darken(wall, 0.78); x.beginPath(); x.roundRect(x0 - 9, y0 + wh + 4, ww + 18, 8, 3); x.fill();
      if (opts.balcony) { x.fillStyle = opts.balcony; x.fillRect(x0 - 10, y0 + wh * 0.62, ww + 20, 4); for (let k = 0; k <= 8; k++) x.fillRect(x0 - 10 + k * (ww + 18) / 8, y0 + wh * 0.62, 3, wh * 0.38 + 6); x.fillRect(x0 - 12, y0 + wh + 2, ww + 24, 5); }
      if (opts.panel) { x.fillStyle = opts.panel[Math.floor(Math.random() * opts.panel.length)]; x.beginPath(); x.roundRect(6, y0 + wh + 14, w - 12, h - (y0 + wh + 18), 4); x.fill(); }
    });
  }
  // immeuble : façades peintes, socle et corniche qui débordent
  function house(p, w, h, d, face, top, x, z, ry = 0, o = {}) {
    const bay = o.bay || 3.6, floors = Math.max(1, Math.round(h / 3));
    const mk = n => { const t = face.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(n / bay)), floors); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: o.glow ? '#ffffff' : '#000000', emissiveMap: o.glow ? t : null, emissiveIntensity: o.glow || 0, metalness: o.metal || 0 }); };
    const g = grp(p, x, 0, z, ry), t = M(top), mf = mk(w), ms = mk(d);
    const m = add(g, new THREE.BoxGeometry(w, h, d), [ms, ms, t, t, mf, mf], 0, h / 2, 0, Math.abs(x) < 80 && Math.abs(z) < 90);
    box(g, w + 0.35, 0.9, d + 0.35, o.base || darken(top, 0.72), 0, 0, 0);
    if (!o.noCornice) box(g, w + 0.6, 0.45, d + 0.6, o.cornice || darken(top, 0.9), 0, h - 0.3, 0);
    return g;
  }
  function tree(p, x, z, s = 1, leaf = '#6fbf4a') {
    const g = grp(p, x, 0, z); g.scale.setScalar(s);
    cyl(g, 0.25, 0.35, 2, '#8a5a32', 0, 0, 0, 7);
    sph(g, 1.5, leaf, 0, 3, 0); sph(g, 1.1, darken(leaf, 1.1), 0.8, 3.6, 0.4); sph(g, 1, darken(leaf, 0.9), -0.7, 3.4, -0.5);
    return g;
  }
  function pine(p, x, z, s = 1, snow) {
    const g = grp(p, x, 0, z); g.scale.setScalar(s);
    cyl(g, 0.2, 0.3, 1, '#6b4a2a', 0, 0, 0, 6);
    [[1.8, 2.2, 0.8], [1.4, 1.9, 2.0], [1, 1.6, 3.1]].forEach(([r, h, y]) => { cone(g, r, h, '#2f7a4a', 0, y, 0, 8); if (snow) cone(g, r * 0.62, h * 0.45, '#ffffff', 0, y + h * 0.55, 0, 8); });
    return g;
  }
  function palm(p, x, z, s = 1) {
    const g = grp(p, x, 0, z); g.scale.setScalar(s);
    for (let i = 0; i < 6; i++) cyl(g, 0.22, 0.26, 1, '#b08a5a', i * 0.12, i * 0.95, 0, 7).rotation.z = -0.08;
    for (let i = 0; i < 7; i++) { const l = sph(g, 1, '#3fae5a', 0.7 + Math.cos(i * 0.9) * 1.3, 5.9, Math.sin(i * 0.9) * 1.3, 1.6, 0.18, 0.5); l.rotation.y = -i * 0.9; l.rotation.z = -0.3; }
    return g;
  }
  const glowM = (c, k = 1.2) => mat(c, { emissive: c, emissiveIntensity: k });
  function lamp(p, x, z, on) { cyl(p, 0.07, 0.09, 3.2, '#2a2f3a', x, 0, z, 6); sph(p, 0.28, on ? glowM('#ffe2a0') : '#f4f0e0', x, 3.3, z); }
  function bench(p, x, z, ry = 0) { const g = grp(p, x, 0, z, ry); box(g, 1.8, 0.12, 0.5, '#9a6a3a', 0, 0.45, 0); box(g, 1.8, 0.5, 0.1, '#9a6a3a', 0, 0.6, -0.22); box(g, 0.1, 0.45, 0.45, '#2a2f3a', -0.8, 0, 0); box(g, 0.1, 0.45, 0.45, '#2a2f3a', 0.8, 0, 0); }
  function car(p, x, z, ry, c, official) {
    const g = grp(p, x, 0, z, ry);
    box(g, 1.8, 0.7, 3.6, c, 0, 0.35, 0); box(g, 1.6, 0.6, 1.9, official ? '#20242c' : '#bfe3ff', 0, 1.05, -0.2);
    for (const [a, b] of [[-0.85, 1.1], [0.85, 1.1], [-0.85, -1.1], [0.85, -1.1]]) { const w = cyl(g, 0.35, 0.35, 0.25, '#1a1a1a', a, 0.35, b, 10); w.rotation.z = Math.PI / 2; w.position.y = 0.35; }
    return g;
  }
  function panel(p, text, w, h, bg, fg, x, y, z, ry = 0, glow) {
    const t = tex('sign' + text + bg + fg, 256, 96, (cx) => {
      cx.fillStyle = bg; cx.fillRect(0, 0, 256, 96); cx.fillStyle = fg; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      let fs = 58; cx.font = `900 ${fs}px "Arial Black", Arial`; while (cx.measureText(text).width > 232 && fs > 10) { fs -= 2; cx.font = `900 ${fs}px "Arial Black", Arial`; }
      cx.fillText(text, 128, 50);
    });
    const m = add(p, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: glow ? '#ffffff' : '#000000', emissiveMap: glow ? t : null, emissiveIntensity: glow || 0, side: THREE.DoubleSide }), x, y, z, false);
    m.rotation.y = ry; return m;
  }
  // routes de la boucle des patrouilles (et quelques avenues), couleur au choix
  function ringRoads(p, asph = '#4b5060', line = '#f4f4f4', extent = 260) {
    flat(p, extent * 2, 8, asph, 0, 20, 0.02); flat(p, extent * 2, 8, asph, 0, -32, 0.02);
    flat(p, 8, 60, asph, -32, -6, 0.021); flat(p, 8, 60, asph, 32, -6, 0.021);
    if (line) { for (let x = -extent; x < extent; x += 6) { flat(p, 2.4, 0.18, line, x, 20, 0.03); flat(p, 2.4, 0.18, line, x, -32, 0.03); } for (let z = -36; z < 24; z += 6) { flat(p, 0.18, 2.4, line, -32, z, 0.031); flat(p, 0.18, 2.4, line, 32, z, 0.031); } }
    for (let i = 0; i < 6; i++) flat(p, 0.9, 6, '#f4f4f4', -6 + i * 1.6, 20, 0.035);
  }
  function traffic(p, n, tractor) {
    const colors = ['#e63946', '#f1faee', '#ffb703', '#219ebc', '#8ecae6', '#2a9d8f', '#3a3a3a', '#ffffff', '#c879ff'], cars = [];
    for (let i = 0; i < n; i++) { const front = i % 2 === 0, g = W.carMesh(pick(colors), W.rand() < 0.12); g.userData = { z: front ? 22 : -34, s: rr(-150, 150), sp: rr(6, 10) * (front ? 1 : -1) }; if (tractor && i === 0) g.userData.sp = 2.5; p.add(g); cars.push(g); }
    W.anim(dt => { for (const c of cars) { const u = c.userData; u.s += u.sp * dt; if (u.s > 150) u.s = -150; if (u.s < -150) u.s = 150; c.position.set(u.s, 0, u.z); c.rotation.y = u.sp > 0 ? 0 : Math.PI; } });
  }
  const sidewalk = (p, c = '#d8d2c6', z = 25.4) => flat(p, 200, 2.4, c, 0, z, 0.03);
  // silhouettes lointaines (dans la brume)
  function horizon(p, col, h0, h1, n = LOW ? 20 : 50) { for (let i = 0; i < n; i++) { const a = W.rand() * 6.28, r = rr(200, 290), hx = Math.cos(a) * r, hz = Math.sin(a) * r; if (Math.abs(hz - 20) < 18 || Math.abs(hz + 32) < 18) continue; const b = box(p, rr(10, 22), rr(h0, h1), rr(10, 22), col, Math.cos(a) * r, 0, Math.sin(a) * r); b.castShadow = false; } }
  // emplacement libre pour un placement au hasard : ni sur les routes, ni près du commissariat
  const free = (x, z) => Math.abs(z - 20) > 8 && Math.abs(z + 32) > 8 && !(Math.abs(x) < 40 && z > -40 && z < 28);
  const ground = (p, c) => flat(p, 900, 900, c, 0, 0, -0.02);
  const sky = o => setSky(o);

  // ---------- 1. campagne ----------
  E.campagne = p => {
    sky({ sky: '#a8dcff', fogNear: 120, fogFar: 300, hemiGround: '#5d7d3c', sunI: 0.9 });
    ground(p, '#8fd16a'); ringRoads(p, '#c4a070', null, 320);
    // pré aux vaches (devant à gauche)
    const fence = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 2.2); for (let i = 0; i <= n; i++) box(p, 0.2, 1.2, 0.2, '#9a7a52', x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n); const r = box(p, L, 0.15, 0.1, '#9a7a52', (x0 + x1) / 2, 0.9, (z0 + z1) / 2); r.rotation.y = -Math.atan2(z1 - z0, x1 - x0); };
    fence(-46, 27, -12, 27); fence(-46, 27, -46, 48); fence(-12, 27, -12, 48);
    for (let i = 0; i < 5; i++) {
      const v = grp(p, -40 + i * 6 + rr(-1, 1), 0, 32 + rr(0, 11), rr(0, 6));
      box(v, 1.1, 1, 2, '#ffffff', 0, 0.7, 0); box(v, 0.6, 0.5, 0.62, '#2a2a2a', 0.3, 1.4, 0.4); box(v, 0.45, 0.45, 0.45, '#2a2a2a', -0.25, 1.1, -0.6);
      box(v, 0.7, 0.7, 0.8, '#ffffff', 0, 1.2, 1.3); box(v, 0.6, 0.35, 0.3, '#f4b8b8', 0, 1.1, 1.75);
      for (const [a, b] of [[-0.4, -0.7], [0.4, -0.7], [-0.4, 0.7], [0.4, 0.7]]) box(v, 0.22, 0.7, 0.22, '#f0f0f0', a, 0, b);
    }
    // mare aux canards (devant à droite)
    const pond = add(p, new THREE.CircleGeometry(7, 28), mat('#5ab8e0', { roughness: 0.2, metalness: 0.1 }), 30, 0.06, 38, false); pond.rotation.x = -Math.PI / 2; pond.scale.set(1.3, 0.8, 1);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; cyl(p, 0.06, 0.06, rr(1, 1.8), '#5a8a3a', 30 + Math.cos(a) * 9.4, 0, 38 + Math.sin(a) * 5.8, 4); }
    const ducks = [];
    for (let i = 0; i < 3; i++) { const d = grp(p); sph(d, 0.4, '#ffffff', 0, 0.3, 0, 1, 0.7, 1.3); sph(d, 0.25, '#3a8a4a', 0, 0.65, 0.45); box(d, 0.15, 0.08, 0.25, '#f0a020', 0, 0.6, 0.75); ducks.push(d); }
    W.anim((dt, t) => ducks.forEach((d, i) => { const a = t * 0.3 + i * 2.1; d.position.set(30 + Math.cos(a) * 5.5, 0.1, 38 + Math.sin(a) * 3); d.rotation.y = -a; }));
    // ferme et foin (côté gauche)
    const f = grp(p, -50, 0, -4, Math.PI / 2);
    house(f, 10, 4.5, 7, facade('ferme', '#f2e4c8', '#5a6a7a', { shutters: '#3a7a5a', ww: 0.36 }), '#f2e4c8', 0, 0);
    prism(f, 11, 3.2, 8, '#c0603a', 0, 4.5, 0); box(f, 0.8, 1.8, 0.8, '#a05030', 3, 6.2, 0.8);
    const barn = grp(p, -50, 0, -20, Math.PI / 2); box(barn, 7, 5, 9, '#b8402a', 0, 0, 0); prism(barn, 7.8, 3.4, 9.8, '#7a2a1a', 0, 5, 0); box(barn, 3, 3.4, 0.1, '#f2f2f2', 0, 0, 4.55);
    for (let i = 0; i < 6; i++) { const b = cyl(p, 1, 1, 1.6, '#e8c860', -44 + (i % 3) * 2.4, 0, -12 + Math.floor(i / 3) * 2.6, 14); b.rotation.z = Math.PI / 2; b.position.y = 1; }
    // champ de choux, moulin, église (derrière)
    flat(p, 22, 14, '#8a6a42', -18, -48, 0.04);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 11; j++) sph(p, 0.7, pick(['#7ec850', '#6fb848', '#a8d878']), -27.5 + j * 1.9, 0.5, -53.5 + i * 2.2, 1, 0.75, 1);
    const ml = grp(p, 46, 0, -46);
    cone(ml, 3.2, 11, '#f2ead8', 0, 0, 0, 10); cone(ml, 2.1, 3, '#a05030', 0, 9.6, 0, 10);
    const blades = grp(ml, 0, 10.2, 2.4);
    for (let i = 0; i < 4; i++) { const b = add(blades, new THREE.BoxGeometry(1.2, 7, 0.15), '#f8f4ea'); b.geometry.translate(0, 3.6, 0); b.rotation.z = i * Math.PI / 2; }
    W.anim((dt, t) => { blades.rotation.z = t * 0.8; });
    const ch = grp(p, 6, 0, -62);
    box(ch, 8, 7, 13, '#e8dcc0', 0, 0, 0); prism(ch, 8.8, 4, 13.6, '#8a5a3a', 0, 7, 0);
    box(ch, 4, 14, 4, '#e8dcc0', 0, 0, 8); cone(ch, 3, 8, '#5a6a7a', 0, 14, 8, 4).rotation.y = Math.PI / 4;
    cyl(ch, 1, 1, 0.15, '#ffffff', 0, 10.4, 10.05).rotation.x = Math.PI / 2;
    cyl(ch, 0.1, 0.1, 1.6, '#d4a020', 0, 22, 8, 6); box(ch, 0.9, 0.12, 0.12, '#d4a020', 0, 22.9, 8);
    // haies, arbres, champs lointains, éoliennes
    for (let i = 0; i < 10; i++) { sph(p, 1.2, '#4f9a3a', -80 + i * 3.4, 1, 25.6, 1.4, 0.9, 1); sph(p, 1.2, '#4f9a3a', 48 + i * 3.4, 1, 25.6, 1.4, 0.9, 1); }
    const crops = ['#e9c46a', '#a7c957', '#c5a880', '#6a994e'];
    for (let i = 0; i < (LOW ? 10 : 22); i++) { const a = W.rand() * 6.28, r = rr(80, 170); if (!free(Math.cos(a) * r, Math.sin(a) * r)) continue; flat(p, rr(18, 26), rr(18, 26), pick(crops), Math.cos(a) * r, Math.sin(a) * r, 0.01); }
    for (const [x, z, s] of [[-62, 12, 1.3], [-66, -46, 1.2], [62, 6, 1.3], [64, -16, 1.1], [22, -56, 1.2], [-34, -64, 1.1], [62, 40, 1.2], [-66, 46, 1.1]]) tree(p, x, z, s);
    for (let i = 0; i < (LOW ? 20 : 45); i++) { const a = W.rand() * 6.28, r = rr(75, 160); if (!free(Math.cos(a) * r, Math.sin(a) * r)) continue; tree(p, Math.cos(a) * r, Math.sin(a) * r, rr(0.9, 1.4)); }
    [[-40, -150], [0, -170], [40, -150]].forEach(([x, z]) => {
      cyl(p, 0.5, 0.9, 30, '#f4f6fb', x, 0, z, 8);
      const hub = grp(p, x, 30, z + 0.8);
      for (let k = 0; k < 3; k++) { const piv = grp(hub); piv.rotation.z = k * Math.PI * 2 / 3; box(piv, 0.6, 12, 0.2, '#ffffff', 0, 0, 0); }
      W.spin(hub);
    });
    traffic(p, 5, true);
  };

  // ---------- 2. ville ----------
  E.ville = p => {
    sky({ sky: '#f8dcb4', fogNear: 100, fogFar: 260, hemiSky: '#fff0dc', hemiGround: '#a8987a', hemi: 0.8, sun: '#ffe2b8', sunI: 0.95 });
    ground(p, '#cdbf9e'); flat(p, 240, 240, cobbles([60, 60], '#d8ccb2'), 0, 0, 0.005);
    ringRoads(p); sidewalk(p, '#e8dcc6');
    // place et fontaine (devant)
    const fo = grp(p, 6, 0, 40);
    cyl(fo, 4, 4.3, 0.9, '#e2dacb', 0, 0, 0, 24); add(fo, new THREE.CircleGeometry(3.6, 24), mat('#6ac0e8', { roughness: 0.2 }), 0, 0.85, 0, false).rotation.x = -Math.PI / 2;
    cyl(fo, 0.5, 0.8, 2.6, '#e2dacb', 0, 0.9, 0); cyl(fo, 1.6, 0.6, 0.5, '#e2dacb', 0, 3.4, 0, 16); sph(fo, 0.4, '#e2dacb', 0, 4.2, 0);
    const jets = []; for (let i = 0; i < 10; i++) jets.push(sph(fo, 0.16, mat('#cfeeff', { transparent: true, opacity: 0.85 }), 0, 4, 0));
    W.anim((dt, t) => jets.forEach((j, i) => { const k = (t * 0.8 + i / 10) % 1, a = i / 10 * Math.PI * 2; j.position.set(Math.cos(a) * k * 2.8, 4.2 + k * 1.5 - k * k * 3.5, Math.sin(a) * k * 2.8); }));
    for (const a of [0, 1.6, 3.2, 4.8]) bench(p, 6 + Math.cos(a) * 8, 40 + Math.sin(a) * 8, -a + Math.PI / 2);
    // café et sa terrasse (devant à gauche)
    const caf = grp(p, -40, 0, 40, Math.PI / 2);
    house(caf, 12, 7, 8, facade('cafe', '#f8e8d0', '#4a5a6a', { shutters: '#3a6a3a', ww: 0.36 }), '#f8e8d0', 0, 0);
    prism(caf, 13, 3.2, 9, '#c86a3a', 0, 7, 0); panel(caf, 'CAFÉ DU COMMERCE', 8, 1.1, '#2a5a3a', '#ffe9a8', 0, 3.9, 4.06);
    box(caf, 12, 0.14, 2.8, '#c84a3a', 0, 3.1, 5.2).rotation.x = 0.28;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const tx = -4.5 + i * 3, tz = 8 + j * 3.2; cyl(caf, 0.55, 0.55, 0.08, '#f2f2f2', tx, 1.05, tz, 14); cyl(caf, 0.06, 0.06, 1.05, '#2a2a2a', tx, 0, tz, 6); if (j === 0) { cone(caf, 1.5, 0.7, pick(['#ffffff', '#c84a3a', '#2a5a3a']), tx, 2.6, tz, 10); cyl(caf, 0.04, 0.04, 2.6, '#2a2a2a', tx, 0, tz, 5); } }
    // boulangerie (devant à droite)
    const bo = grp(p, 42, 0, 38, -Math.PI / 2 + 0.3);
    house(bo, 9, 5, 7, facade('boul', '#f4dcc8', '#5a4a3a', { arch: true }), '#f4dcc8', 0, 0); prism(bo, 9.8, 2.6, 7.8, '#b85a32', 0, 5, 0);
    panel(bo, 'BOULANGERIE', 6.5, 1, '#7a3a1a', '#ffe0a0', 0, 3.2, 3.56);
    // halle du marché (côté droit)
    const hal = grp(p, 50, 0, -6, Math.PI / 2);
    for (let i = 0; i < 5; i++) for (const z of [-4.5, 4.5]) cyl(hal, 0.35, 0.4, 5, '#8a5a32', -10 + i * 5, 0, z, 8);
    prism(hal, 11.5, 4, 22, '#b85a32', 0, 5, 0, Math.PI / 2);
    const aw = ['#e85d75', '#2ec4b6', '#ffd23f', '#7d9be0'];
    for (let i = 0; i < 4; i++) { const s = grp(hal, -7.5 + i * 5, 0, 0); box(s, 3, 1, 1.6, '#a07040', 0, 0, 0); box(s, 3.2, 0.1, 2, aw[i], 0, 2.2, 0); for (let k = 0; k < 6; k++) sph(s, 0.24, pick(['#e84a3a', '#ffb020', '#7ec850', '#c879ff']), -1.2 + k * 0.48, 1.2, 0.2); }
    // maisons à toits de tuiles (derrière et sur les côtés)
    const walls = ['#f4e0c0', '#f2d2b0', '#e8c8a0', '#f8e8d0', '#f0c8b8', '#e0d8b8', '#d8e0c8'], shut = ['#4a7ab8', '#3a8a5a', '#b84a3a', '#6a5a9a'];
    const maison = (x, z, ry) => { const w = rr(6.5, 8), hh = rr(7, 11), wc = pick(walls), sc = pick(shut), g = grp(p, x, 0, z, ry);
      house(g, w, hh, 8, facade('ville' + wc + sc, wc, '#5a6a7a', { shutters: sc, ww: 0.36 }), wc, 0, 0);
      prism(g, w + 0.8, 3, 8.8, pick(['#c86a3a', '#b85a32', '#d07848']), 0, hh, 0); box(g, 0.8, 1.6, 0.8, '#a05030', w / 3, hh + 1.6, 1); };
    for (let i = 0; i < 7; i++) maison(-25 + i * 8.4, -44, 0);
    for (let i = 0; i < 7; i++) maison(-25 + i * 8.4, -56, Math.PI);
    for (let i = 0; i < 4; i++) { maison(-46, -24 + i * 9, Math.PI / 2); maison(-58, -24 + i * 9, -Math.PI / 2); }
    for (let i = 0; i < 3; i++) maison(64, -20 + i * 9, -Math.PI / 2);
    for (let i = 0; i < 9; i++) { tree(p, -64 + i * 16, 27.2, 1, '#8ab84a'); lamp(p, -56 + i * 16, 24.6); }
    horizon(p, '#d8b898', 10, 30);
    traffic(p, LOW ? 12 : 20);
  };

  // ---------- 3. métropole ----------
  E.metropole = p => {
    sky({ sky: '#bcd4ec', fogNear: 100, fogFar: 270, hemiSky: '#dce8f8', hemiGround: '#8a8f98', sun: '#f4f8ff', sunI: 0.85 });
    ground(p, '#cfd2d6'); ringRoads(p); sidewalk(p);
    const fac = facade('hauss', '#efe2c4', '#4a5568', { balcony: '#2a2f3a', tall: 0.58, frame: '#f6eedc' });
    const haus = (x, z, w, d, ry, hh = 16) => { const g = grp(p, x, 0, z, ry); house(g, w, hh, d, fac, '#efe2c4', 0, 0, 0, { cornice: '#e2d4b4' }); mansard(g, w + 0.4, 4, d + 0.4, '#7a8a9a', 0, hh, 0); for (let i = 0; i < 3; i++) cyl(g, 0.5, 0.5, 1.6, '#c86a4a', -w / 3 + i * w / 3, hh + 3.4, 0, 8); };
    for (let i = 0; i < 3; i++) haus(-18 + i * 18, -48, 17, 12, 0, rr(15, 19));
    for (let i = 0; i < 2; i++) { haus(-52, -18 + i * 16, 15, 12, Math.PI / 2, rr(14, 18)); haus(52, -18 + i * 16, 15, 12, -Math.PI / 2, rr(14, 18)); }
    for (let i = 0; i < 4; i++) { haus(-18 + i * 18 - 9, 62, 17, 12, Math.PI, 14); }
    // square devant le boulevard
    flat(p, 70, 18, '#9ac87a', 0, 38, 0.03); flat(p, 70, 1, '#cfc6b4', 0, 28.6, 0.04);
    for (let i = 0; i < 10; i++) tree(p, -54 + i * 12, 27.4, 0.9, '#7aa84a');
    const me = grp(p, 14, 0, 35);
    flat(me, 3, 5, '#2a2a2a', 0, 0, 0.06);
    for (const s of [-1, 1]) { box(me, 0.12, 1.1, 5, '#2f6a4a', s * 1.5, 0, 0); cyl(me, 0.1, 0.1, 3.4, '#2f6a4a', s * 1.5, 0, -2.6, 6); sph(me, 0.35, glowM('#ffb040', 0.8), s * 1.5, 3.6, -2.6); }
    panel(me, 'MÉTROPOLITAIN', 3.4, 0.6, '#f2e6c4', '#2f6a4a', 0, 3.2, -2.6);
    const mo = grp(p, -14, 0, 35); cyl(mo, 1, 1, 4, '#2f6a4a', 0, 0, 0, 16); cyl(mo, 0.95, 0.95, 3, '#f2e2b0', 0, 0.5, 0, 16); cone(mo, 1.3, 1.4, '#2f6a4a', 0, 4, 0, 16); sph(mo, 0.25, '#2f6a4a', 0, 5.5, 0);
    const ki = grp(p, -28, 0, 36); box(ki, 2.6, 2.6, 2, '#2f6a4a', 0, 0, 0); cone(ki, 2.2, 1.4, '#2f6a4a', 0, 2.6, 0, 8); panel(ki, 'JOURNAUX', 2.2, 0.5, '#2f6a4a', '#ffe9a8', 0, 2.2, 1.02);
    for (let i = 0; i < 6; i++) { const v = grp(p, 26 + i * 1.1, 0, 32, Math.PI / 2); for (const z of [-0.6, 0.6]) { const w = add(v, new THREE.TorusGeometry(0.4, 0.06, 6, 14), '#2a2a2a', 0, 0.45, z); w.rotation.y = Math.PI / 2; } box(v, 0.08, 0.08, 1.2, '#8ab84a', 0, 0.75, 0); }
    for (let i = 0; i < 4; i++) bench(p, -8 + i * 6, 44, Math.PI);
    for (let i = 0; i < 6; i++) lamp(p, -50 + i * 20, 24.6);
    horizon(p, '#a3adb8', 20, 70);
    traffic(p, LOW ? 18 : 30);
  };

  // ---------- 4. quartier d'affaires ----------
  E.megapole = p => {
    sky({ sky: '#f4a68a', fogNear: 100, fogFar: 300, hemiSky: '#ffd8c0', hemiGround: '#7a6a8a', hemi: 0.8, sun: '#ffc090', sunI: 1 });
    ground(p, '#c8c2ba'); flat(p, 260, 260, dalle([60, 60]), 0, 0, 0.005);
    ringRoads(p, '#5a5a66', '#e8e0d8', 200);
    const ar = grp(p, 0, 0, -62);
    box(ar, 5, 32, 8, '#f6f6f2', -16, 0, 0); box(ar, 5, 32, 8, '#f6f6f2', 16, 0, 0); box(ar, 37, 5, 8, '#f6f6f2', 0, 32, 0); box(ar, 37, 2, 8, '#e8e8e2', 0, 0, 0);
    add(ar, new THREE.PlaneGeometry(27, 30), mat('#bcd8f0', { transparent: true, opacity: 0.25, side: THREE.DoubleSide }), 0, 17, -3.9, false);
    const glass = ['#3a6a9a', '#2a5a7a', '#4a7aa8', '#5a6aa0'];
    for (const [x, z, w, hh] of [[-50, -46, 13, 58], [-36, -82, 12, 72], [50, -48, 14, 64], [36, -86, 12, 80], [-58, -6, 11, 38], [60, -2, 12, 44], [-64, 40, 12, 30]]) {
      const gc = pick(glass), g = house(p, w, hh, w * 0.9, facade('tour' + gc, darken(gc, 0.9), gc, { curtain: true, lit: 0.3 }), darken(gc, 0.75), x, z, 0, { bay: 3, glow: 0.5, metal: 0.25 });
      box(g, w * 0.6, 3, w * 0.5, '#d8dce4', 0, hh, 0);
    }
    panel(p, 'TAMPON+', 10, 3.4, '#ff3a8a', '#ffffff', -50, 24, -39.4, 0, 0.9);
    panel(p, 'PARPAING BANK', 10, 3.4, '#1a1a2a', '#3fe0ff', 50, 28, -40.9, 0, 0.9);
    for (const x of [-22, 22]) { box(p, 16, 0.6, 7, '#d0ccc4', x, 0, 36); add(p, new THREE.PlaneGeometry(15, 6), mat('#5aa8d8', { roughness: 0.1, metalness: 0.2 }), x, 0.62, 36, false).rotation.x = -Math.PI / 2; }
    for (let i = 0; i < 9; i++) { const x = -48 + i * 12; if (Math.abs(x) < 8) continue; cyl(p, 1.3, 1.3, 0.9, '#bfb8ac', x, 0, 27.5, 12); tree(p, x, 27.5, 0.65, '#5a9a4a').position.y = 0.8; }
    const sc = grp(p, 0, 0, 38); for (let i = 0; i < 5; i++) cyl(sc, 0.5, 0.5, 6, ['#ff4a5a', '#3a8aff', '#ffd23f', '#ff4a5a', '#3a8aff'][i], -1.2 + i * 0.6, 0, 0, 10).rotation.z = -0.4 + i * 0.2;
    for (let i = 0; i < 10; i++) lamp(p, -45 + i * 10, 24.6, true);
    horizon(p, '#4a4f6a', 40, 140);
    traffic(p, LOW ? 6 : 10);
  };

  // ---------- 5. banlieue ----------
  E.cite = p => {
    sky({ sky: '#c4cad2', fogNear: 80, fogFar: 230, hemiSky: '#dfe6ee', hemiGround: '#7a7a72', hemi: 0.95, sun: '#eef2f6', sunI: 0.65 });
    ground(p, '#a8b09a'); ringRoads(p); sidewalk(p, '#c0bcb4');
    const pans = [['#f2c84a', '#e85d4a', '#4ab8a8'], ['#8ac85a', '#f2a03a', '#5a8ae8'], ['#e86a8a', '#f2d24a', '#4ab8e8']];
    const barre = (x, z, w, hh, d, k, ry = 0) => {
      house(p, w, hh, d, facade('hlm' + k, '#ece8e0', '#5a6470', { panel: pans[k % 3], tall: 0.42, ww: 0.5 }), '#b8b4ac', x, z, ry, { bay: 3.2 });
      for (let i = 0; i < 5; i++) { const dish = add(p, new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, 1), '#f4f4f4', x - w / 3 + i * w / 6, hh * rr(0.3, 0.8), z + d / 2 + 0.3); dish.rotation.x = Math.PI / 2.3; }
    };
    barre(-6, -58, 56, 21, 10, 0); barre(46, -56, 11, 42, 11, 1); barre(-58, -14, 11, 30, 26, 2); barre(60, -4, 11, 18, 22, 1); barre(-60, 46, 11, 24, 22, 0);
    // RER aérien entre la route arrière et les barres
    for (let i = 0; i < 9; i++) cyl(p, 0.8, 1, 9, '#b8b4ac', -80 + i * 20, 0, -42, 8);
    box(p, 200, 1.4, 6, '#a8a49c', 0, 9, -42);
    const rer = grp(p, 0, 10.4, -42);
    for (let i = 0; i < 4; i++) { box(rer, 14, 3.4, 3.4, '#f4f4f4', i * 14.5, 0, 0); box(rer, 14.1, 0.8, 3.5, '#3a7ad8', i * 14.5, 1.2, 0); box(rer, 14.1, 0.5, 3.5, '#e84a3a', i * 14.5, 0.4, 0); }
    W.anim((dt, t) => { rer.position.x = -150 + ((t * 18) % 300); });
    // city-stade et mur graffé (devant)
    const cs = grp(p, -30, 0, 38);
    flat(cs, 20, 12, '#4aa86a', 0, 0, 0.05); flat(cs, 0.3, 12, '#ffffff', 0, 0, 0.07);
    const fen = mat('#3a5a7a', { transparent: true, opacity: 0.45 });
    for (const s of [-1, 1]) { box(cs, 20, 3, 0.1, fen, 0, 0, s * 6); box(cs, 0.1, 3, 12, fen, s * 10, 0, 0); box(cs, 0.3, 2, 3, '#ffffff', s * 9.6, 0, 0); }
    const ball = sph(cs, 0.3, '#ffffff', 0, 0.3, 0);
    W.anim((dt, t) => { ball.position.set(Math.sin(t * 1.3) * 7, 0.3 + Math.abs(Math.sin(t * 4)) * 1.5, Math.sin(t * 0.9) * 3); });
    const graf = tex('graf', 256, 96, (x, w, h) => {
      x.fillStyle = '#c8c4bc'; x.fillRect(0, 0, w, h);
      ['#ff3a8a', '#3fe0ff', '#ffd23f', '#7ee04a'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.ellipse(32 + i * 64, 50, 36, 28, (i - 1.5) * 0.3, 0, 7); x.fill(); });
      x.font = '900 46px Arial Black'; x.lineWidth = 6; x.strokeStyle = '#1a1a1a'; x.fillStyle = '#ffffff'; x.textAlign = 'center';
      x.strokeText('PARPAING', w / 2, 64); x.fillText('PARPAING', w / 2, 64);
    });
    const gm = texMat(graf), cw = M('#c8c4bc');
    add(p, new THREE.BoxGeometry(16, 4, 0.6), [cw, cw, cw, cw, gm, gm], 28, 2, 36);
    // terrain vague et chariot abandonné (côté droit)
    for (let i = 0; i < 6; i++) sph(p, rr(0.8, 1.4), '#8a9a6a', 50 + rr(-5, 5), 0.3, 36 + rr(-3, 3), 1, 0.5, 1);
    const cart = grp(p, 46, 0, 42, 0.7); box(cart, 1.4, 0.9, 2, mat('#c0c4cc', { metalness: 0.6, roughness: 0.4 }), 0, 0.6, 0); for (const [a, b] of [[-0.6, -0.8], [0.6, -0.8], [-0.6, 0.8], [0.6, 0.8]]) sph(cart, 0.15, '#2a2a2a', a, 0.15, b);
    for (let i = 0; i < 6; i++) car(p, 4 + i * 4, 27.4, Math.PI / 2, pick(['#8a8a8a', '#c84a3a', '#f2f2f2', '#3a4a6a']));
    for (const [x, z] of [[-48, 26], [62, 26], [-12, 46], [14, 50]]) tree(p, x, z, 0.8, '#7a9a5a');
    horizon(p, '#a8aeb6', 25, 60);
    traffic(p, LOW ? 14 : 24);
  };

  // ---------- 6. plage ----------
  E.plage = p => {
    sky({ sky: '#8fd8ff', fogNear: 130, fogFar: 330, hemiSky: '#e8f8ff', hemiGround: '#e8d0a0', sun: '#fff4dc', sunI: 1.05 });
    ground(p, '#e6cc8a'); ringRoads(p, '#8a8a8a', '#ffffff', 200);
    const seaG = new THREE.PlaneGeometry(320, 110, LOW ? 30 : 60, LOW ? 10 : 20); seaG.rotateX(-Math.PI / 2);
    add(p, seaG, mat('#3fc1d8', { roughness: 0.25, metalness: 0.1, flatShading: true }), 0, 0.45, -118, false);
    const base = seaG.attributes.position.array.slice();
    W.anim((dt, t) => { const q = seaG.attributes.position; for (let i = 0; i < q.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; q.array[i * 3 + 1] = Math.sin(x * 0.15 + t * 1.5) * 0.22 + Math.cos(z * 0.2 + t) * 0.18; } q.needsUpdate = true; seaG.computeVertexNormals(); });
    const foam = flat(p, 320, 4, mat('#ffffff', { transparent: true, opacity: 0.7 }), 0, -63, 0.7);
    W.anim((dt, t) => { foam.position.z = -64 + Math.sin(t * 0.8) * 1.2; });
    flat(p, 200, 6, planks([40, 2]), 0, -39.5, 0.06);
    for (let i = 0; i < 10; i++) lamp(p, -63 + i * 14, -37.2);
    const cols = ['#e85d75', '#2ec4b6', '#ffd23f', '#7d9be0', '#ff9f1c', '#9bc53d'];
    for (let i = 0; i < 11; i++) { const c = cols[i % cols.length], st = tex('cab' + c, 64, 64, (x) => { for (let k = 0; k < 8; k++) { x.fillStyle = k % 2 ? '#ffffff' : c; x.fillRect(k * 8, 0, 8, 64); } });
      const g = grp(p, -54 + i * 4.2, 0, -46); add(g, new THREE.BoxGeometry(3, 3.4, 2.6), texMat(st), 0, 1.7, 0); prism(g, 3.6, 1.4, 3, '#ffffff', 0, 3.4, 0); box(g, 1.2, 2.4, 0.08, darken(c, 0.8), 0, 0, 1.32); }
    for (let i = 0; i < 14; i++) {
      const x = -6 + (i % 7) * 9 + rr(-1, 1), z = -51 - Math.floor(i / 7) * 6, c = cols[(i * 5) % cols.length];
      const g = grp(p, x, 0, z); cyl(g, 0.06, 0.06, 3, '#ffffff', 0, 0, 0, 5);
      const top = add(g, new THREE.ConeGeometry(2, 0.9, 12, 1, true), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }), 0, 3.1, 0);
      flat(g, 1.2, 2.4, cols[(i * 3 + 1) % cols.length], 1.5, 0.5, 0.04);
    }
    const ph = grp(p, 60, 0, -74);
    cyl(ph, 6, 7, 2, '#8a8a8a', 0, 0, 0, 12);
    for (let i = 0; i < 6; i++) cyl(ph, 2.2 - i * 0.12, 2.3 - i * 0.12, 3, i % 2 ? '#ffffff' : '#d8322a', 0, 2 + i * 3, 0, 16);
    cyl(ph, 1.6, 1.6, 2, glowM('#ffe9a8', 0.8), 0, 20, 0, 12); cone(ph, 2, 2, '#d8322a', 0, 22, 0, 12);
    const bp = grp(ph, 0, 21, 0);
    const beam = add(bp, new THREE.ConeGeometry(2, 30, 12, 1, true), mat('#fff6c8', { transparent: true, opacity: 0.18, emissive: '#fff6c8', side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0, false);
    beam.geometry.translate(0, -15, 0); beam.rotation.z = Math.PI / 2;
    W.anim((dt, t) => { bp.rotation.y = t * 0.8; });
    const gl = grp(p, 42, 0, -42); box(gl, 4, 2.4, 3, '#ffffff', 0, 0, 0); cone(gl, 3.2, 1.2, '#ff8fab', 0, 2.4, 0, 4).rotation.y = Math.PI / 4;
    sph(gl, 0.8, '#ffb3c1', 0, 4.4, 0); panel(gl, 'GLACES', 3, 0.7, '#ff6fa8', '#ffffff', 0, 1.8, 1.52);
    for (let i = 0; i < 9; i++) palm(p, -60 + i * 15 + rr(-2, 2), -41.5, rr(0.85, 1.1));
    for (const [x, z] of [[-44, 32], [-26, 40], [26, 36], [46, 42], [-48, 4], [50, 2], [-64, -16], [66, -18]]) palm(p, x, z, rr(0.9, 1.15));
    const gulls = []; for (let i = 0; i < 5; i++) { const g = grp(p); for (const s of [-1, 1]) box(g, 1.2, 0.08, 0.4, '#ffffff', s * 0.6, 0, 0).rotation.z = s * 0.35; gulls.push(g); }
    W.anim((dt, t) => gulls.forEach((g, i) => { const a = t * 0.25 + i * 1.3; g.position.set(Math.cos(a) * (26 + i * 5), 16 + i * 2 + Math.sin(t * 2 + i), -60 + Math.sin(a) * 18); g.rotation.y = -a; g.children.forEach((w, k) => { w.rotation.z = (k ? -1 : 1) * (0.35 + Math.sin(t * 6 + i) * 0.3); }); }));
    for (let i = 0; i < 6; i++) { const c = ['#ffffff', '#f8f0e0', '#e8f4f8', '#fff4e0'][i % 4]; house(p, 11, rr(7, 10), 9, facade('mer' + c, c, '#3ab0d0', { balcony: '#3ab0d0', ww: 0.5 }), c, i < 3 ? -62 + i * 13 : 36 + (i - 3) * 13, 44); }
    traffic(p, LOW ? 4 : 6);
  };

  // ---------- 7. montagne ----------
  E.neige = p => {
    sky({ sky: '#f2c4d4', fogNear: 100, fogFar: 300, hemiSky: '#ffe0f0', hemiGround: '#a8b8d8', hemi: 0.95, sun: '#ffd0b8', sunI: 0.9 });
    ground(p, '#f6f8ff'); ringRoads(p, '#c8ccd8', null, 260);
    const mtn = add(p, new THREE.ConeGeometry(80, 85, 9, 3), mat('#d8deec', { flatShading: true }), 10, 42.5, -170, false); mtn.scale.set(1.4, 1, 0.8);
    add(p, new THREE.ConeGeometry(34, 25, 9), mat('#ffffff', { flatShading: true }), 10, 72, -170, false).scale.set(1.4, 1, 0.8);
    add(p, new THREE.ConeGeometry(50, 55, 8, 2), mat('#c8d0e0', { flatShading: true }), -80, 27, -150, false);
    flat(p, 16, 100, '#ffffff', 10, -100, 0.04);
    const chalet = (x, z, s, ry) => { const g = grp(p, x, 0, z, ry); g.scale.setScalar(s);
      house(g, 8, 6, 7, facade('chal', '#a86a3a', '#3a2a1a', { shutters: '#c84a3a', frame: '#f2e2c8', ww: 0.34 }), '#a86a3a', 0, 0, 0, { base: '#7a7a7a' });
      prism(g, 9.8, 4, 8.8, '#7a4a2a', 0, 6, 0); prism(g, 10, 3.4, 9, '#ffffff', 0, 6.6, 0);
      box(g, 8, 0.2, 1.4, '#7a4a2a', 0, 3.2, 4.2); for (let i = 0; i < 6; i++) box(g, 0.12, 1, 0.12, '#7a4a2a', -3.6 + i * 1.44, 3.4, 4.8);
      box(g, 1, 2.4, 1, '#8a8a8a', 2.4, 8, -1); };
    chalet(-48, -4, 1.1, Math.PI / 2); chalet(-50, -22, 1, Math.PI / 2); chalet(-26, -46, 1.1, 0); chalet(-10, -48, 0.95, 0); chalet(-60, 40, 1, Math.PI / 2); chalet(60, 34, 1.1, -Math.PI / 2);
    for (let i = 0; i < (LOW ? 24 : 50); i++) { const x = rr(-110, 110), z = rr(-120, 90); if (!free(x, z)) continue; if (Math.abs(x - 10) < 10 && z < -50) continue; if (Math.abs(x - 46) < 6 && z < 10 && z > -130) continue; pine(p, x, z, rr(0.9, 1.6), true); }
    const pyl = [[46, 6, 8], [46, -40, 20], [46, -86, 32], [46, -126, 44]];
    for (const [x, z, hh] of pyl) { cyl(p, 0.4, 0.5, hh, '#8a8f98', x, 0, z, 8); box(p, 5, 0.4, 0.4, '#8a8f98', x, hh, z); }
    for (const off of [-2.2, 2.2]) add(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pyl.map(([x, z, hh]) => new THREE.Vector3(x + off, hh - 0.2, z))), 40, 0.06, 4), '#2a2a2a', 0, 0, 0, false);
    const base = grp(p, 46, 0, 12); box(base, 7, 3, 5, '#a86a3a', 0, 0, 0); prism(base, 8, 1.6, 6, '#ffffff', 0, 3, 0);
    const chairs = []; for (let i = 0; i < 12; i++) { const c = grp(p); cyl(c, 0.04, 0.04, 2, '#2a2a2a', 0, -2, 0, 4); box(c, 1.6, 0.15, 0.8, '#d8322a', 0, -2.1, 0); box(c, 1.6, 0.8, 0.12, '#d8322a', 0, -2.1, -0.4); chairs.push(c); }
    W.anim((dt, t) => chairs.forEach((c, i) => { const k = (t * 0.03 + i / 12) % 1, up = k < 0.5, u = up ? k * 2 : 2 - k * 2; c.position.set(46 + (up ? -2.2 : 2.2), 8 + u * 36 - 0.2, 6 - u * 132); }));
    const dm = grp(p, 10, 0, -60); box(dm, 3.4, 1.4, 4.6, '#d8322a', 0, 0.8, 0); box(dm, 2.6, 1.4, 2, '#bfe3ff', 0, 2.2, 0.6); box(dm, 3.8, 0.8, 4.8, '#2a2a2a', 0, 0, 0); box(dm, 4.2, 1, 0.4, '#d8d8d8', 0, 0.3, 2.8);
    W.anim((dt, t) => { dm.position.z = -55 - ((t * 3) % 60); });
    const ice = add(p, new THREE.CircleGeometry(8, 28), mat('#cfeaff', { roughness: 0.1, metalness: 0.2 }), 28, 0.06, 38, false); ice.rotation.x = -Math.PI / 2; ice.scale.set(1.3, 0.75, 1);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; box(p, 0.15, 0.7, 0.15, '#a86a3a', 28 + Math.cos(a) * 10.6, 0, 38 + Math.sin(a) * 6.2); }
    const sn = grp(p, -22, 0, 36); sph(sn, 1.3, '#ffffff', 0, 1.2, 0); sph(sn, 0.95, '#ffffff', 0, 3, 0); sph(sn, 0.7, '#ffffff', 0, 4.4, 0); cone(sn, 0.15, 0.7, '#ff8a20', 0, 4.3, 0.7, 6).rotation.x = Math.PI / 2; cyl(sn, 0.5, 0.5, 0.8, '#1a1a1a', 0, 4.9, 0, 10); ring(sn, 0.75, 0.12, '#d8322a', 0, 3.7, 0);
    // chute de neige (plus forte pendant les tempêtes)
    const N = LOW ? 900 : 1800, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rr(-90, 90); pos[i * 3 + 1] = rr(0, 60); pos[i * 3 + 2] = rr(-90, 90); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const snow = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.45, transparent: true, opacity: 0.85, fog: true })); p.add(snow);
    W.anim((dt) => {
      const storm = !!W.storm, sp = storm ? 14 : 3, drift = storm ? 6 : 0.6;
      g.setDrawRange(0, storm ? N : N / 3);
      for (let i = 0; i < N; i++) { pos[i * 3 + 1] -= sp * dt; pos[i * 3] += drift * dt; if (pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = 60; pos[i * 3] = rr(-90, 90); } if (pos[i * 3] > 90) pos[i * 3] = -90; }
      g.attributes.position.needsUpdate = true;
    });
    traffic(p, 5);
  };

  // ---------- 8. aéroport ----------
  E.aeroport = p => {
    sky({ sky: '#9fd0ff', fogNear: 140, fogFar: 340, hemiGround: '#7f9a6c', sun: '#ffffff', sunI: 0.95 });
    ground(p, '#9ac87a'); ringRoads(p, '#4a4f5a', '#ffffff', 220); sidewalk(p, '#d8dce4');
    flat(p, 240, 56, tarmac([44, 10]), 0, -66, 0.02);
    flat(p, 240, 12, '#3a3d44', 0, -84, 0.03);
    for (let i = 0; i < 22; i++) flat(p, 5, 0.6, '#ffffff', -105 + i * 10, -84, 0.05);
    for (let i = 0; i < 40; i++) flat(p, 3, 0.35, '#ffd23f', -98 + i * 5, -52, 0.05);
    const term = house(p, 37, 9, 14, facade('term', '#e8ecf2', '#7ab8d8', { curtain: true }), '#e8ecf2', -54, -8, Math.PI / 2, { bay: 3, metal: 0.25 });
    const rf = add(p, new THREE.CylinderGeometry(8.5, 8.5, 39, 24, 1, false, 0, Math.PI), '#f2f4f8', -54, 9, -8); rf.rotation.set(0, Math.PI / 2, Math.PI / 2, 'YXZ'); rf.scale.set(1, 1, 0.45);
    panel(p, 'ROISSY-PARPAING', 16, 2, '#ffffff', '#1f3a8a', -46.8, 6.5, -8, Math.PI / 2);
    const tw = grp(p, 50, 0, -22); cyl(tw, 2, 3, 26, '#e8ecf2', 0, 0, 0, 14); cyl(tw, 4.4, 3.6, 3.4, mat('#4a8ab8', { metalness: 0.4, roughness: 0.2 }), 0, 26, 0, 14); cyl(tw, 4.8, 4.8, 0.6, '#d8dce4', 0, 29.4, 0, 14);
    const rad = box(tw, 4, 0.3, 0.6, '#8a8f98', 0, 31, 0); W.anim((dt, t) => { rad.rotation.y = t * 2; });
    const plane = c => { const g = grp(p);
      add(g, new THREE.CylinderGeometry(1.4, 1.4, 18, 16), '#f4f6fa', 0, 2.6, 0).rotation.x = Math.PI / 2;
      sph(g, 1.4, '#f4f6fa', 0, 2.6, 9, 1, 1, 1.6); const tail = cone(g, 1.4, 4, '#f4f6fa', 0, 0, 0, 16); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 2.6, -11);
      box(g, 20, 0.3, 3.4, '#e8ecf2', 0, 2.2, 0.5); box(g, 7, 0.25, 2, '#e8ecf2', 0, 3, -10); box(g, 0.3, 4, 3, c, 0, 3, -10.5);
      box(g, 0.2, 0.5, 18, c, 1.42, 2.3, 0); box(g, 0.2, 0.5, 18, c, -1.42, 2.3, 0);
      for (const s of [-1, 1]) { const e = cyl(g, 0.7, 0.7, 2.6, '#c8ccd4', s * 5, 0, 1.4, 12); e.rotation.x = Math.PI / 2; e.position.y = 1.5; }
      return g; };
    const p1 = plane('#d8322a'); p1.position.set(-14, 0, -60); p1.rotation.y = Math.PI / 2;
    const p3 = plane('#2ec4b6'); p3.position.set(20, 0, -62); p3.rotation.y = -Math.PI / 2.4;
    const p2 = plane('#1f4fa8');
    W.anim((dt, t) => { const k = (t * 0.06) % 1, x = -110 + k * 240; p2.position.set(x, Math.max(0, (x - 10) * 0.22), -84); p2.rotation.set(x > 10 ? -0.2 : 0, Math.PI / 2, 0, 'YXZ'); });
    const tr = grp(p); box(tr, 1.6, 1.2, 2.4, '#ffd23f', 0, 0.4, 0); for (let i = 1; i < 4; i++) { box(tr, 1.6, 0.4, 2.2, '#8a8f98', 0, 0.4, -i * 2.8); for (let k = 0; k < 3; k++) box(tr, 0.6, 0.5, 0.8, ['#d8322a', '#1f4fa8', '#3a3a3a'][k], -0.4 + (k % 2) * 0.8, 0.8, -i * 2.8 - 0.6 + k * 0.6); }
    W.anim((dt, t) => { const a = t * 0.15; tr.position.set(Math.cos(a) * 18 + 4, 0, -50 + Math.sin(a) * 4); tr.rotation.y = -a; });
    const ws = grp(p, 62, 0, -60); cyl(ws, 0.1, 0.1, 6, '#c8ccd4', 0, 0, 0, 6);
    const sock = add(ws, new THREE.CylinderGeometry(0.4, 0.7, 3, 10, 1, true), mat('#ff8a20', { side: THREE.DoubleSide }), 1.6, 6, 0); W.anim((dt, t) => { sock.rotation.z = Math.PI / 2 - 0.2 + Math.sin(t * 2) * 0.1; });
    const bl = []; for (let i = 0; i < 22; i++) for (const z of [-90.5, -77.5]) bl.push(sph(p, 0.2, glowM(i % 2 ? '#ff3a3a' : '#3aff6a', 1), -105 + i * 10, 0.2, z));
    W.anim((dt, t) => bl.forEach((b, i) => { b.visible = Math.floor(t * 3 + i * 0.3) % 2 === 0; }));
    for (let i = 0; i < 4; i++) car(p, -30 + i * 5, 28, Math.PI / 2, '#ffd23f');
    const bus = grp(p, 22, 0, 29, Math.PI / 2); box(bus, 2.4, 2.6, 9, '#1f4fa8', 0, 0.4, 0); box(bus, 2.45, 1, 8.6, '#bfe3ff', 0, 1.6, 0);
    const ab = grp(p, 34, 0, 30.5); box(ab, 4, 0.15, 1.6, '#d8dce4', 0, 2.6, 0); box(ab, 4, 2.6, 0.08, mat('#bfe3ff', { transparent: true, opacity: 0.5 }), 0, 0, -0.75); panel(ab, 'NAVETTE', 1.8, 0.5, '#1f4fa8', '#ffffff', 0, 2.95, 0.82);
    for (let i = 0; i < 12; i++) { const x = rr(-90, 90); if (Math.abs(x - 22) > 16) tree(p, x, rr(36, 70), rr(0.8, 1.1)); }
    traffic(p, 8);
  };

  // ---------- 9. festival ----------
  E.festival = p => {
    sky({ sky: '#2a1b4a', fogNear: 80, fogFar: 240, hemiSky: '#6a5aa8', hemiGround: '#1a2a1a', hemi: 0.6, sun: '#8a7aff', sunI: 0.35 });
    ground(p, '#3f6b3a'); ringRoads(p, '#3a3d48', '#e8e0c0', 220); flat(p, 200, 2.2, '#5a5868', 0, 25.4, 0.035);
    for (let i = 0; i < 9; i++) lamp(p, -64 + i * 16, 24.6, true);
    // parking (devant à gauche) et tapis rouge jusqu'à l'entrée
    flat(p, 32, 18, '#4a4d58', -44, 38, 0.04);
    for (let i = 0; i < 5; i++) flat(p, 0.3, 4.5, '#e8e0c0', -56 + i * 5.6, 34, 0.06);
    for (let i = 0; i < 8; i++) car(p, -55 + (i % 4) * 5.6, 34 + Math.floor(i / 4) * 8, i < 4 ? 0 : Math.PI, ['#d84a3a', '#3a6ab8', '#f2f2f2', '#ffd23f', '#2ec4b6', '#2a2a2a', '#c879ff', '#f2f2f2'][i]);
    flat(p, 4, 14, '#c8102e', -1, 31, 0.05);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) cyl(p, 0.12, 0.15, 1.2, '#d4a020', -1 + s * 2.6, 0, 26 + i * 3, 8);
    const flashes = []; for (let i = 0; i < 6; i++) flashes.push(sph(p, 0.25, glowM('#ffffff', 3), (i % 2 ? 3.5 : -5.5), 1.9, 27 + Math.floor(i / 2) * 3));
    W.anim((dt, t) => flashes.forEach((f, i) => { f.visible = Math.sin(t * 9 + i * 2.3) > 0.9; }));
    // barrières, arche d'entrée, scène, projecteurs (derrière)
    for (let i = 0; i < 40; i++) { const x = -70 + i * 3.5; if (Math.abs(x - 40) < 5) continue; const b = grp(p, x, 0, -40); box(b, 3.3, 0.08, 0.08, '#c8ccd4', 0, 1.1, 0); box(b, 3.3, 0.08, 0.08, '#c8ccd4', 0, 0.3, 0); for (const s of [-1.6, 1.6]) box(b, 0.08, 1.2, 0.5, '#c8ccd4', s, 0, 0); }
    const gate = grp(p, 40, 0, -40);
    for (const s of [-1, 1]) { box(gate, 1.2, 7, 1.2, '#6a4a9a', s * 4.4, 0, 0); sph(gate, 0.6, glowM('#ffd36a'), s * 4.4, 7.5, 0); }
    box(gate, 10, 1.8, 1, '#6a4a9a', 0, 6, 0); panel(gate, 'ENTRÉE', 7, 1.3, '#1a0a2a', '#ffd36a', 0, 6.9, 0.52, 0, 1);
    const st = grp(p, -4, 0, -66);
    box(st, 30, 2, 14, '#2a2a34', 0, 0, 0);
    for (const x of [-15, 15]) for (const z of [-7, 7]) box(st, 0.6, 14, 0.6, '#8a8f98', x, 2, z);
    box(st, 31, 0.8, 15, '#8a8f98', 0, 16, 0);
    panel(st, 'PARPAING FEST', 24, 7, '#1a0a2a', '#ff3a9a', 0, 9.5, -6.5, 0, 1);
    for (const x of [-19, 19]) { box(st, 4, 7, 3, '#1a1a1a', x, 0, 4); for (let k = 0; k < 2; k++) cyl(st, 1, 1, 0.1, '#3a3a3a', x, 1.8 + k * 3, 5.55, 14).rotation.x = Math.PI / 2; }
    const beams = [];
    ['#ff3a9a', '#3fe0ff', '#ffd23f', '#7ee04a', '#a05aff'].forEach((c, i) => {
      const q = grp(st, -12 + i * 6, 16, 6);
      add(q, new THREE.ConeGeometry(2.5, 24, 14, 1, true), mat(c, { transparent: true, opacity: 0.22, emissive: c, emissiveIntensity: 1, depthWrite: false, side: THREE.DoubleSide }), 0, 0, 0, false).geometry.translate(0, -12, 0);
      beams.push(q);
    });
    W.anim((dt, t) => beams.forEach((q, i) => { q.rotation.z = Math.sin(t * 1.2 + i) * 0.6; q.rotation.x = -0.5 + Math.cos(t * 0.9 + i * 2) * 0.3; }));
    const bulbs = [];
    for (let k = 0; k < 3; k++) { const z = -56 + k * 5; for (let i = 0; i < 26; i++) { const c = ['#ffd36a', '#ff6a9a', '#6ad0ff'][i % 3]; bulbs.push(sph(p, 0.18, glowM(c, 1.4), -30 + i * 2, 7 - Math.sin(i / 25 * Math.PI) * 2.2, z)); } cyl(p, 0.1, 0.1, 7, '#5a5a5a', -30, 0, z, 5); cyl(p, 0.1, 0.1, 7, '#5a5a5a', 22, 0, z, 5); }
    W.anim((dt, t) => bulbs.forEach((b, i) => { b.visible = (Math.floor(t * 2) + i) % 5 !== 0; }));
    const phones = []; for (let i = 0; i < (LOW ? 20 : 40); i++) phones.push(sph(p, 0.12, glowM('#ffffff', 1.5), rr(-18, 10), 2, rr(-56, -46)));
    W.anim((dt, t) => phones.forEach((q, i) => { q.position.y = 2 + Math.sin(t * 3 + i) * 0.3; }));
    // grande roue (côté droit), food trucks (côté gauche), camping
    const wh = grp(p, 54, 0, -50);
    for (const z of [-1.4, 1.4]) { box(wh, 0.6, 18, 0.6, '#d8dce4', -4, 0, z).rotation.z = -0.22; box(wh, 0.6, 18, 0.6, '#d8dce4', 4, 0, z).rotation.z = 0.22; }
    const wheel = grp(wh, 0, 17, 0), cabs = [];
    add(wheel, new THREE.TorusGeometry(12, 0.3, 6, 48), mat('#ffffff', { emissive: '#ff6ad0', emissiveIntensity: 0.8 }), 0, 0, 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, sp = add(wheel, new THREE.BoxGeometry(0.2, 12, 0.2), '#d8dce4'); sp.position.set(Math.cos(a) * 6, Math.sin(a) * 6, 0); sp.rotation.z = a - Math.PI / 2;
      const c = grp(wh); box(c, 1.6, 1.4, 1.6, ['#ff3a9a', '#3fe0ff', '#ffd23f', '#7ee04a'][i % 4], 0, -1.6, 0); c.userData.a = a; cabs.push(c); }
    W.anim((dt, t) => { wheel.rotation.z = t * 0.15; cabs.forEach(c => { const a = c.userData.a + t * 0.15; c.position.set(Math.cos(a) * 12, 17 + Math.sin(a) * 12, 0); }); });
    ['FRITES', 'CRÊPES', 'KEBAB'].forEach((txt, i) => { const g = grp(p, -46, 0, -16 + i * 11, Math.PI / 2); box(g, 7, 3.2, 3, ['#ffd23f', '#ff6fa8', '#3fb8a0'][i], 0, 0.6, 0); box(g, 3, 1.4, 0.1, '#1a1a1a', 0, 1.8, 1.52); panel(g, txt, 4, 1, '#ffffff', '#d8322a', 0, 3.4, 1.55, 0, 0.6); });
    for (let i = 0; i < 12; i++) cone(p, 2.2, 2.4, ['#ff6a3a', '#3a8aff', '#ffd23f', '#7ee04a', '#ff6fa8'][i % 5], -70 + (i % 4) * 6 + rr(-1, 1), 0, -56 - Math.floor(i / 4) * 6, 4).rotation.y = rr(0, 3);
    traffic(p, 5);
  };

  // ---------- 10. ministère ----------
  E.ministere = p => {
    sky({ sky: '#cfe3f5', fogNear: 110, fogFar: 290, hemiSky: '#eef4fa', hemiGround: '#8a9a7a', sun: '#fff8ec', sunI: 0.9 });
    ground(p, '#9ab87a'); ringRoads(p); sidewalk(p, '#ddd6c8');
    flat(p, 150, 34, cobbles([36, 8], '#d9d2c3'), 0, -52, 0.025);
    const stone = facade('beauvau', '#f4eee0', '#4a5568', { tall: 0.62, arch: true, frame: '#fbf8f0', balcony: '#2a2a2a' });
    const h = grp(p, 0, 0, -62);
    house(h, 64, 14, 12, stone, '#f4eee0', 0, 0, 0, { base: '#cfc6b4' }); mansard(h, 64.5, 6, 12.5, '#4a5a6a', 0, 14, 0);
    for (let i = 0; i < 8; i++) box(h, 1.2, 2.4, 1.2, '#f4eee0', -28 + i * 8, 19, 0);
    const portico = grp(h, 0, 0, 6.2);
    for (let i = 0; i < 6; i++) cyl(portico, 0.6, 0.7, 12, '#fbf8f0', -7.5 + i * 3, 0, 0.8, 14);
    prism(portico, 20, 3.4, 2.4, '#f4eee0', 0, 12, 0.8);
    for (const s of [-1, 1]) { const w = grp(p, s * 48, 0, -50); house(w, 12, 13, 24, stone, '#f4eee0', 0, 0, 0, { base: '#cfc6b4' }); mansard(w, 12.5, 5.5, 24.5, '#4a5a6a', 0, 13, 0); }
    const flags = [];
    for (const x of [-14, 14]) { cyl(p, 0.1, 0.1, 12, '#d4a020', x, 0, -46, 6); const f = grp(p, x, 10.5, -46);
      box(f, 0.8, 1.6, 0.05, '#1f4fa8', 0.4, -0.8, 0); box(f, 0.8, 1.6, 0.05, '#ffffff', 1.2, -0.8, 0); box(f, 0.8, 1.6, 0.05, '#d0202e', 2, -0.8, 0); flags.push(f); }
    W.anim((dt, t) => flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 2 + i) * 0.25; }));
    car(p, -26, -48, 0.1, '#15171c', true); car(p, -21, -48, -0.1, '#15171c', true); car(p, 24, -48, Math.PI - 0.1, '#15171c', true);
    // jardin à la française, gardes, voitures officielles (devant)
    const gd = grp(p, 0, 0, 44);
    flat(gd, 84, 18, '#ddd2b8', 0, 0, 0.03);
    for (let i = 0; i < 4; i++) { const x = -28.5 + i * 19;
      flat(gd, 13, 10, '#6aa84a', x, 0, 0.05);
      for (const [a, b, w, d] of [[0, -5, 13, 0.6], [0, 5, 13, 0.6], [-6.5, 0, 0.6, 10], [6.5, 0, 0.6, 10]]) box(gd, w, 0.7, d, '#3f7a3a', x + a, 0, b);
      sph(gd, 1, '#ff8fab', x, 0.5, 0, 1.6, 0.5, 1.6); for (const s of [-1, 1]) cone(gd, 0.9, 3, '#2f6a3a', x + s * 5, 0, s * 3.6, 12); }
    cyl(gd, 3.4, 3.6, 0.7, '#e8e2d4', 0, 0, 0, 24); add(gd, new THREE.CircleGeometry(3.1, 24), mat('#6ac0e8', { roughness: 0.2 }), 0, 0.72, 0, false).rotation.x = -Math.PI / 2;
    for (const x of [-14, 14]) { const g = grp(p, x, 0, 28); box(g, 1.6, 2.8, 1.6, '#f4eee0', 0, 0, 0); prism(g, 2.1, 0.9, 2.1, '#4a5a6a', 0, 2.8, 0); for (let k = 0; k < 4; k++) box(g, 0.4, 2.8, 0.05, k % 2 ? '#1f4fa8' : '#d0202e', -0.6 + k * 0.4, 0, 0.82); }
    for (let i = 0; i < 7; i++) lamp(p, -48 + i * 16, 24.6);
    for (let i = 0; i < 8; i++) tree(p, -66 + i * 19, 58, 1.1, '#5a8a4a');
    horizon(p, '#c8ccd2', 14, 30);
    traffic(p, LOW ? 14 : 22);
  };
})();
