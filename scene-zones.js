// Scène 3D : les zones du commissariat, qui grandissent avec les achats.
(function () {
  const { THREE, world, box, cyl, ball, mesh, mat, figure, addTag, pickables, onFrame } = S;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const MAXV = { cells: 20, inv: 16, pts: 12, acc: 6, pla: 12, cars: 14, queue: 10 };

  const gyR = mat('#ff4b5c', { emissive: '#ff2030', emissiveIntensity: 1 });
  const gyB = mat('#3d7bff', { emissive: '#2050ff', emissiveIntensity: 1 });
  const winMat = mat('#8dbaff', { emissive: '#2a5bd0', emissiveIntensity: 0.25 });
  const scrOn = mat('#7fe3ff', { emissive: '#3fd0ff', emissiveIntensity: 0.9 });
  const scrOff = mat('#1d2433');
  const glass = new THREE.MeshStandardMaterial({ color: '#9fd3ff', transparent: true, opacity: 0.35, roughness: 0.1 });

  function sign(parent, text, w, h, bg, fg, x, y, z, ry) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = c.height * 0.62; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    while (g.measureText(text).width > c.width * 0.9 && fs > 10) { fs -= 2; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; }
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m);
    return m;
  }
  function group(x, z, parent) { const g = new THREE.Group(); g.position.set(x, 0, z); (parent || world).add(g); return g; }
  function site(x, z, w, d, label) { // chantier "à construire"
    const g = group(x, z);
    box(g, w, 0.06, d, '#c9a46a', 0, 0, 0);
    for (let i = 0; i < 4; i++) { const cx = (i % 2 ? 1 : -1) * (w / 2 - 0.4), cz = (i < 2 ? 1 : -1) * (d / 2 - 0.4); cyl(g, 0.02, 0.22, 0.6, 8, '#ff7b1c', cx, 0, cz); box(g, 0.34, 0.06, 0.34, '#ff7b1c', cx, 0, cz); }
    box(g, w * 0.6, 0.35, 0.1, '#ffffff', 0, 0.4, d / 2 - 0.3);
    for (let i = 0; i < 4; i++) box(g, w * 0.08, 0.36, 0.11, '#e63946', -w * 0.24 + i * w * 0.16, 0.4, d / 2 - 0.3);
    box(g, 0.08, 0.8, 0.08, '#2b3245', -w * 0.28, 0, d / 2 - 0.3); box(g, 0.08, 0.8, 0.08, '#2b3245', w * 0.28, 0, d / 2 - 0.3);
    sign(g, label, 3, 0.6, '#ffc93c', '#1b2a5c', 0, 1.3, 0.2);
    return g;
  }
  const seated = (g, kind, x, z, ry) => { const f = figure(kind); f.position.set(x, 0, z); f.rotation.y = ry || 0; g.add(f); f.userData.y0 = 0; return f; };

  // ---------- Hôtel de police (grandit avec les paliers) ----------
  const FH = 2.2;
  const hq = group(0, -10.75);
  const floors = [];
  for (let f = 0; f < 6; f++) {
    const g = new THREE.Group(); g.position.y = f * FH; hq.add(g);
    box(g, 10, FH, 5.5, f === 0 ? '#3d6fd6' : '#eef2fb', 0, 0, 0);
    box(g, 10.1, 0.22, 5.6, f === 0 ? '#1b2a5c' : '#3d6fd6', 0, FH - 0.22, 0);
    for (let i = 0; i < 6; i++) {
      const x = -4.1 + i * 1.64;
      if (!(f === 0 && Math.abs(x) < 1.5)) box(g, 0.95, 0.95, 0.08, winMat, x, 0.55, 2.77);
      box(g, 0.95, 0.95, 0.08, winMat, x, 0.55, -2.77);
    }
    for (let i = 0; i < 3; i++) { box(g, 0.08, 0.95, 0.95, winMat, 5.02, 0.55, -1.8 + i * 1.8); box(g, 0.08, 0.95, 0.95, winMat, -5.02, 0.55, -1.8 + i * 1.8); }
    floors.push(g);
  }
  box(floors[0], 2.2, 1.6, 0.1, '#16224a', 0, 0, 2.76);
  sign(floors[0], 'POLICE', 3.4, 0.62, '#1b2a5c', '#ffffff', 0, 1.95, 2.83);
  const roof = new THREE.Group(); hq.add(roof);
  box(roof, 10.3, 0.25, 5.8, '#8d939e', 0, 0, 0);
  box(roof, 0.5, 0.35, 0.5, gyR, -4.4, 0.25, 2.3); box(roof, 0.5, 0.35, 0.5, gyB, 4.4, 0.25, 2.3);
  box(roof, 1.4, 0.8, 1.1, '#c7ccd4', 2.5, 0.25, -1.2); box(roof, 1.4, 0.8, 1.1, '#c7ccd4', 0.6, 0.25, -1.2);
  const flag = new THREE.Group(); roof.add(flag); flag.position.set(-3.6, 0.25, 0.6);
  cyl(flag, 0.05, 0.06, 3.2, 6, '#dfe3ea', 0, 0, 0);
  ['#2346a8', '#ffffff', '#e63946'].forEach((c, i) => box(flag, 0.45, 0.85, 0.05, c, 0.27 + i * 0.45, 2.25, 0));
  const antenna = new THREE.Group(); roof.add(antenna); antenna.position.set(3.8, 0.25, -1.8);
  cyl(antenna, 0.04, 0.12, 5, 5, '#c7ccd4', 0, 0, 0);
  const blink = ball(antenna, 0.16, mat('#ff4b5c', { emissive: '#ff0000', emissiveIntensity: 1 }), 0, 5.1, 0, 0);
  const pad = new THREE.Group(); roof.add(pad); pad.position.set(-1.2, 0.25, 0.3);
  cyl(pad, 2, 2, 0.08, 16, '#3a4152', 0, 0, 0);
  box(pad, 0.22, 0.02, 1.4, '#ffc93c', -0.45, 0.08, 0); box(pad, 0.22, 0.02, 1.4, '#ffc93c', 0.45, 0.08, 0); box(pad, 0.9, 0.02, 0.22, '#ffc93c', 0, 0.08, 0);
  const heli = new THREE.Group(); pad.add(heli); heli.position.y = 0.1; heli.rotation.y = 0.6;
  ball(heli, 0.75, '#1b2a5c', 0, 0.75, 0, 1).scale.set(1.3, 0.85, 0.9);
  box(heli, 1.8, 0.22, 0.22, '#1b2a5c', -1.4, 0.75, 0); box(heli, 0.1, 0.6, 0.5, '#e8eefc', -2.25, 0.7, 0);
  box(heli, 1.6, 0.06, 0.08, '#2b3245', 0, 0.05, 0.45); box(heli, 1.6, 0.06, 0.08, '#2b3245', 0, 0.05, -0.45);
  const rotor = new THREE.Group(); heli.add(rotor); rotor.position.y = 1.5;
  box(rotor, 4.2, 0.05, 0.22, '#2b3245', 0, 0, 0); box(rotor, 0.22, 0.05, 4.2, '#2b3245', 0, 0, 0);
  const goldTrim = new THREE.Group(); roof.add(goldTrim);
  box(goldTrim, 10.5, 0.3, 0.2, '#ffc93c', 0, 0.25, 2.95); box(goldTrim, 10.5, 0.3, 0.2, '#ffc93c', 0, 0.25, -2.95);
  box(goldTrim, 0.2, 0.3, 5.9, '#ffc93c', 5.2, 0.25, 0); box(goldTrim, 0.2, 0.3, 5.9, '#ffc93c', -5.2, 0.25, 0);
  const annex = new THREE.Group(); world.add(annex);
  [-9, 9].forEach(x => { const g = group(x, -13.2, annex); for (let f = 0; f < 4; f++) { box(g, 4, 2, 4, f % 2 ? '#bcd8ff' : '#e8f1ff', 0, f * 2, 0); box(g, 4.05, 0.9, 4.05, glass, 0, f * 2 + 0.6, 0); } box(g, 0.5, 0.35, 0.5, x < 0 ? gyR : gyB, 0, 8, 0); });
  const statue = group(0, 15.2);
  box(statue, 1.6, 1, 1.6, '#eef2fb', 0, 0, 0);
  const goldM = mat('#ffc93c', { metalness: 0.6, roughness: 0.35, emissive: '#6b4a00', emissiveIntensity: 0.3 });
  box(statue, 1.3, 0.9, 0.75, goldM, 0, 1.25, 0); box(statue, 0.12, 0.6, 0.12, goldM, -0.3, 1, 0); box(statue, 0.12, 0.6, 0.12, goldM, 0.3, 1, 0);
  cyl(statue, 0.34, 0.34, 0.3, 10, goldM, 0, 2.15, 0);

  // Parking
  const park = group(0, 9.4);
  box(park, 7.4, 0.04, 6.4, '#5a5f6e', 0, 0, 0);
  for (let i = 0; i < 4; i++) box(park, 0.1, 0.02, 2.6, '#ffffff', -3 + i * 2, 0.04, -1.6);
  sign(park, 'PARKING POLICE', 3.4, 0.5, '#1b2a5c', '#ffffff', 0, 1.4, 3.1);
  box(park, 0.08, 1.2, 0.08, '#2b3245', -1.5, 0, 3.05); box(park, 0.08, 1.2, 0.08, '#2b3245', 1.5, 0, 3.05);

  // ---------- Commissaire Parpaing ----------
  const parp = group(-3.6, 2.4); parp.rotation.y = 0.55;
  const pBody = new THREE.Group(); parp.add(pBody);
  box(parp, 1.9, 0.35, 1.3, '#1b2a5c', 0, 0, 0);
  cyl(pBody, 0.14, 0.14, 0.55, 6, '#1b2a5c', -0.38, 0.35, 0); cyl(pBody, 0.14, 0.14, 0.55, 6, '#1b2a5c', 0.38, 0.35, 0);
  box(pBody, 1.7, 1.15, 0.95, '#a3a8b0', 0, 0.85, 0);
  [-0.42, 0.42].forEach(x => {
    box(pBody, 0.52, 0.52, 0.06, '#4b4f57', x, 1.17, 0.46);
    ball(pBody, 0.17, '#ffffff', x, 1.43, 0.5, 1);
    ball(pBody, 0.08, '#111111', x + (x < 0 ? 0.03 : -0.03), 1.43, 0.64, 0);
    box(pBody, 0.44, 0.08, 0.1, '#3b2a1e', x, 1.76, 0.48).rotation.z = x < 0 ? -0.28 : 0.28;
  });
  box(pBody, 0.5, 0.15, 0.14, '#3b2a1e', -0.22, 1.05, 0.5).rotation.z = 0.25;
  box(pBody, 0.5, 0.15, 0.14, '#3b2a1e', 0.22, 1.05, 0.5).rotation.z = -0.25;
  cyl(pBody, 0.46, 0.42, 0.4, 12, '#1b2a5c', 0, 2.0, 0);
  cyl(pBody, 0.47, 0.47, 0.1, 12, '#ffc93c', 0, 2.05, 0);
  box(pBody, 0.7, 0.05, 0.35, '#111522', 0, 2.0, 0.42);
  const arm = new THREE.Group(); arm.position.set(0.95, 1.4, 0); pBody.add(arm);
  cyl(arm, 0.12, 0.12, 0.6, 6, '#a3a8b0', 0, 0, 0);
  const stampG = new THREE.Group(); stampG.position.y = 0.6; arm.add(stampG);
  cyl(stampG, 0.1, 0.12, 0.4, 8, '#c4142a', 0, 0, 0); box(stampG, 0.5, 0.18, 0.4, '#8a5a35', 0, 0.4, 0);
  const medals = [];
  for (let i = 0; i < 6; i++) { const m = cyl(pBody, 0.08, 0.08, 0.04, 8, goldM, -0.55 + i * 0.22, 0.55, 0.48); m.rotation.x = Math.PI / 2; m.visible = false; medals.push(m); }
  let bounce = 0;

  // ---------- Cellules de GAV ----------
  const cellBlock = group(0, 0);
  box(cellBlock, 13, 0.08, 11.2, '#b5bac3', 11.6, 0, -0.5);
  const cells = [];
  for (let i = 0; i < MAXV.cells; i++) {
    const c = i % 5, r = Math.floor(i / 5);
    const g = group(6.6 + c * 2.5, -4.6 + r * 2.6, cellBlock);
    box(g, 2.3, 0.1, 2.3, '#8f959f', 0, 0.08, 0);
    box(g, 2.3, 1.5, 0.14, '#c8ccd3', 0, 0.08, -1.08);
    box(g, 0.14, 1.5, 2.3, '#c8ccd3', -1.08, 0.08, 0); box(g, 0.14, 1.5, 2.3, '#c8ccd3', 1.08, 0.08, 0);
    for (let b = 0; b < 7; b++) cyl(g, 0.035, 0.035, 1.5, 5, '#30343c', -0.9 + b * 0.3, 0.08, 1.08);
    box(g, 2.3, 0.1, 0.12, '#30343c', 0, 1.55, 1.08);
    box(g, 1.9, 0.38, 0.45, '#9b7b5a', 0, 0.1, -0.75);
    const figs = [];
    for (let j = 0; j < 4; j++) { const f = seated(g, 'suspect', -0.55 + (j % 2) * 1.1 + (j > 1 ? 0.25 : 0), j > 1 ? 0.35 : -0.6, (Math.random() - 0.5) * 0.8); f.visible = false; figs.push(f); }
    g.userData.figs = figs; g.visible = i === 0;
    cells.push(g);
  }
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, 2.3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, depthWrite: false }));
  ghost.position.y = 0.83; world.add(ghost);

  // ---------- Bureau d'enquête ----------
  const inv = group(-12.5, -1.2);
  box(inv, 10.2, 0.1, 9.6, '#b3c1d9', 0, 0, 0);
  box(inv, 10.2, 0.8, 0.15, '#eef2fb', 0, 0.1, -4.8); box(inv, 0.15, 0.8, 9.6, '#eef2fb', -5.1, 0.1, 0);
  sign(inv, "BUREAU D'ENQUÊTE", 4.2, 0.6, '#1b2a5c', '#ffc93c', 0, 1.35, -4.7);
  const desks = [];
  for (let i = 0; i < MAXV.inv; i++) {
    const c = i % 4, r = Math.floor(i / 4);
    const g = group(-3.75 + c * 2.45, -3.3 + r * 2.3, inv);
    box(g, 1.4, 0.72, 0.7, '#a0683a', 0, 0.1, 0);
    box(g, 0.6, 0.4, 0.06, '#222833', 0, 0.82, -0.12);
    const scr = box(g, 0.52, 0.32, 0.02, scrOff, 0, 0.86, -0.08);
    box(g, 0.3, 0.06 + Math.random() * 0.3, 0.38, '#ffffff', 0.45, 0.82, 0.05);
    box(g, 0.5, 0.45, 0.5, '#2b3245', 0, 0.1, 0.75);
    const f = seated(g, 'inv', 0, 0.75, Math.PI); f.position.y = 0.2;
    g.userData = { f, scr }; g.visible = i === 0;
    desks.push(g);
  }
  const coffee = group(-17, -5.3);
  box(coffee, 0.8, 1.5, 0.7, '#6b3f22', 0, 0.1, 0); box(coffee, 0.5, 0.35, 0.1, scrOn, 0, 1.05, 0.36); box(coffee, 0.3, 0.3, 0.2, '#111', 0, 0.45, 0.32);

  // ---------- Labo PTS ----------
  const pts = group(9.6, 9.6);
  box(pts, 9.2, 0.1, 5.8, '#dfe8f7', 0, 0, 0);
  box(pts, 9.2, 2.6, 1.6, '#f7f9ff', 0, 0, -2.7); box(pts, 9.25, 0.35, 1.65, '#3d7bff', 0, 2.3, -2.7);
  sign(pts, 'POLICE SCIENTIFIQUE', 5, 0.62, '#ffffff', '#3d7bff', 0, 1.4, -1.89);
  const kiosks = [];
  for (let i = 0; i < MAXV.pts; i++) {
    const c = i % 6, r = Math.floor(i / 6);
    const g = group(-3.65 + c * 1.46, -0.6 + r * 2.1, pts);
    box(g, 0.6, 1.0, 0.42, '#3d7bff', 0, 0.1, 0);
    const scr = box(g, 0.44, 0.3, 0.03, scrOff, 0, 0.75, 0.22);
    const a = seated(g, 'pts', 0, -0.6, 0);
    const s = seated(g, 'suspect', 0, 0.62, Math.PI); s.visible = false;
    g.userData = { f: a, s, scr }; g.visible = i === 0;
    kiosks.push(g);
  }

  // ---------- Accueil ----------
  const acc = group(0, -5.6);
  const accOn = new THREE.Group(); acc.add(accOn);
  box(accOn, 7.4, 0.12, 3.6, '#e9dcc4', 0, 0, 0);
  box(accOn, 0.15, 1.1, 3.6, '#eef2fb', -3.7, 0, 0); box(accOn, 0.15, 1.1, 3.6, '#eef2fb', 3.7, 0, 0);
  [-2.35, 2.35].forEach(x => { const gl = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.1, 0.08), glass); gl.position.set(x, 1.12, 1.8); accOn.add(gl); });
  box(accOn, 7.6, 0.14, 1.2, '#ffc93c', 0, 2.2, 1.9);
  sign(accOn, 'ACCUEIL', 2.6, 0.6, '#ffc93c', '#1b2a5c', 0, 2.75, 2.45);
  const guichets = [];
  for (let i = 0; i < MAXV.acc; i++) {
    const g = group(-2.75 + i * 1.1, -0.2, accOn);
    box(g, 0.95, 0.95, 0.45, '#ffffff', 0, 0.12, 0); box(g, 1.0, 0.06, 0.55, '#ffc93c', 0, 1.07, 0);
    const f = seated(g, 'acc', 0, -0.65, 0);
    g.userData = { f }; g.visible = i === 0;
    guichets.push(g);
  }
  const queue = [];
  for (let i = 0; i < MAXV.queue; i++) { const f = seated(acc, 'civ', 0.5 + (i % 2) * 0.25, 2.5 + i * 0.7, Math.PI + (Math.random() - 0.5) * 0.6); f.visible = false; queue.push(f); }
  const tickets = group(3.3, 1.3, accOn); box(tickets, 0.5, 1.3, 0.4, '#ffc93c', 0, 0.12, 0); box(tickets, 0.35, 0.25, 0.05, '#e63946', 0, 1.0, 0.21);
  const poster = group(-2.6, 2.8, acc);
  box(poster, 0.08, 1.6, 0.08, '#2b3245', -0.7, 0, 0); box(poster, 0.08, 1.6, 0.08, '#2b3245', 0.7, 0, 0);
  sign(poster, 'PORTEZ PLAINTE !', 1.6, 0.8, '#e63946', '#ffffff', 0, 1.6, 0.05);
  const accSite = site(0, -5.6, 7, 3.4, 'BIENTÔT : ACCUEIL');

  // ---------- Bureau des plaintes ----------
  const pla = group(-9.2, 9.2);
  const plaOn = new THREE.Group(); pla.add(plaOn);
  box(plaOn, 9.2, 0.1, 6.8, '#d9b98a', 0, 0, 0);
  box(plaOn, 9.2, 0.7, 0.15, '#eef2fb', 0, 0.1, -3.4); box(plaOn, 0.15, 0.7, 6.8, '#eef2fb', -4.6, 0.1, 0);
  sign(plaOn, 'PLAINTES', 2.6, 0.6, '#fbf4dc', '#2a2833', 0, 1.2, -3.3);
  const plaDesks = [];
  for (let i = 0; i < MAXV.pla; i++) {
    const c = i % 4, r = Math.floor(i / 4);
    const g = group(-3.3 + c * 2.15, -2.1 + r * 2.15, plaOn);
    box(g, 1.3, 0.7, 0.62, '#ffffff', 0, 0.1, 0);
    box(g, 0.4, 0.05, 0.3, '#e9b949', 0.2, 0.8, 0);
    const f = seated(g, 'pla', 0, -0.62, 0); f.position.y = 0.12;
    const cz = seated(g, 'civ', 0, 0.68, Math.PI); cz.position.y = 0.12; cz.visible = false;
    g.userData = { f, c: cz }; g.visible = i === 0;
    plaDesks.push(g);
  }
  const pile = [];
  for (let i = 0; i < 12; i++) { const b = box(plaOn, 0.7, 0.16, 0.5, i % 2 ? '#e9b949' : '#f2cf72', 4 - (i % 2) * 0.05, 0.1 + i * 0.17, 2.8); b.rotation.y = (Math.random() - 0.5) * 0.4; b.visible = false; pile.push(b); }
  const plaSite = site(-9.2, 9.2, 8, 5.5, 'BIENTÔT : PLAINTES');

  // ---------- Patrouilles ----------
  const cars = [];
  for (let i = 0; i < MAXV.cars; i++) {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    box(body, 1.9, 0.5, 0.95, '#f4f6fb', 0, 0.2, 0);
    box(body, 1.0, 0.42, 0.85, '#d8e2f5', -0.1, 0.7, 0);
    box(body, 1.92, 0.14, 0.97, '#2346a8', 0, 0.42, 0);
    box(body, 0.22, 0.14, 0.3, gyR, -0.1, 1.12, -0.17); box(body, 0.22, 0.14, 0.3, gyB, -0.1, 1.12, 0.17);
    [[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.45], [0.6, -0.45]].forEach(([x, z]) => { const w = cyl(body, 0.2, 0.2, 0.14, 8, '#151821', x, 0.06, z); w.rotation.x = Math.PI / 2; w.position.y = 0.2; });
    const dir = i % 2 ? -1 : 1;
    g.userData = { a: (i / MAXV.cars) * Math.PI * 2 * 3.7, dir, r: dir > 0 ? 20.1 : 21.6, sp: 0.16 + Math.random() * 0.05 };
    g.visible = false; world.add(g); cars.push(g);
  }

  // ---------- Passants animés ----------
  const walkers = [];
  function walk(kind, pts, speed) {
    const f = figure(kind); world.add(f);
    f.position.copy(pts[0]);
    walkers.push({ f, pts, i: 0, t: 0, sp: speed || 3.2 });
    if (walkers.length > 40) { const w = walkers.shift(); world.remove(w.f); }
  }

  // ---------- étiquettes ----------
  const tags = {
    hq: addTag(0, 4, -10.75), cells: addTag(11.6, 2.3, -6.2), inv: addTag(-12.5, 2.2, -6.3), pts: addTag(9.6, 3.5, 7.2),
    acc: addTag(0, 3.6, -4), pla: addTag(-9.2, 2.2, 5.7), cars: addTag(0, 2.2, 12.5), parp: addTag(-3.6, 3.4, 2.4),
  };
  const anchors = { cells: V(11.6, 2.5, 0), inv: V(-12.5, 2.4, -1), pts: V(9.6, 2.6, 10), acc: V(0, 2.8, -5), pla: V(-9.2, 2.2, 9.2), parp: V(-3.6, 3.2, 2.4), hq: V(0, 5, -9), cars: V(0, 1.5, 9) };

  // ---------- synchro avec l'état du jeu ----------
  let L = {}, busy = { inv: 0, pts: 0, acc: 0, pla: 0 };
  const changed = (k, v) => { if (L[k] === v) return false; L[k] = v; return true; };
  const showN = (arr, n) => arr.forEach((o, i) => { o.visible = i < n; });
  function applyTier(t) {
    const n = Math.min(1 + t, 6);
    floors.forEach((f, i) => { f.visible = i < n; });
    roof.position.y = n * FH;
    flag.visible = t >= 1; antenna.visible = t >= 2; pad.visible = t >= 3; annex.visible = t >= 4; statue.visible = t >= 5; goldTrim.visible = t >= 6;
    tags.hq.pos.y = n * FH + (t >= 3 ? 3.2 : 1.8);
    anchors.hq.y = n * FH;
  }
  function sync(v) {
    if (changed('tier', v.tier)) applyTier(v.tier);
    if (changed('cells', v.cells) | changed('occ', v.occ) | changed('cap', v.cellCap)) {
      let rem = v.occ;
      cells.forEach((c, i) => {
        c.visible = i < v.cells;
        const n = c.visible ? Math.min(v.cellCap, rem) : 0; rem -= n;
        c.userData.figs.forEach((f, j) => { f.visible = j < Math.min(n, 4); });
      });
      if (v.cells < MAXV.cells) { ghost.visible = true; ghost.position.x = cells[v.cells].position.x; ghost.position.z = cells[v.cells].position.z; } else ghost.visible = false;
    }
    if (changed('inv', v.inv)) showN(desks, v.inv);
    if (changed('pts', v.pts)) showN(kiosks, v.pts);
    if (changed('accB', v.accBuilt)) { accOn.visible = v.accBuilt; accSite.visible = !v.accBuilt; tags.acc.show(v.accBuilt); }
    if (changed('plaB', v.plaBuilt)) { plaOn.visible = v.plaBuilt; plaSite.visible = !v.plaBuilt; tags.pla.show(v.plaBuilt); }
    if (changed('acc', v.acc)) showN(guichets, v.acc);
    if (changed('pla', v.pla)) showN(plaDesks, v.pla);
    if (changed('q', v.queueCit)) showN(queue, v.accBuilt ? v.queueCit : 0);
    if (changed('pile', v.plaQueue)) showN(pile, Math.min(v.plaQueue, 12));
    if (changed('cars', v.patrols)) showN(cars, v.patrols);
    if (changed('pb', v.ptsBusy)) kiosks.forEach((k, i) => { k.userData.s.visible = i < v.ptsBusy; k.userData.scr.material = i < v.ptsBusy ? scrOn : scrOff; });
    if (changed('ib', v.invBusy)) desks.forEach((d, i) => { d.userData.scr.material = i < v.invBusy ? scrOn : scrOff; });
    if (changed('lb', v.plaBusy)) plaDesks.forEach((d, i) => { d.userData.c.visible = i < v.plaBusy; });
    if (changed('med', v.medals)) showN(medals, v.medals);
    coffee.visible = v.up.coffee > 0; tickets.visible = v.up.tickets > 0; poster.visible = v.accBuilt && v.up.com > 0;
    busy = { inv: v.invBusy, pts: v.ptsBusy, acc: v.accBusy, pla: v.plaBusy };
  }

  onFrame((dt, t) => {
    const on = Math.floor(t * 4) % 2;
    gyR.emissiveIntensity = on ? 1.6 : 0.1; gyB.emissiveIntensity = on ? 0.1 : 1.6;
    blink.visible = Math.floor(t * 1.5) % 2 === 0;
    if (pad.visible) rotor.rotation.y = t * 9;
    cars.forEach(c => {
      if (!c.visible) return;
      const u = c.userData; u.a += dt * u.sp * u.dir;
      c.position.set(Math.cos(u.a) * u.r, 0, Math.sin(u.a) * u.r);
      c.rotation.y = -u.a + (u.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
      c.children[0].position.y = Math.abs(Math.sin(t * 9 + u.r * u.a)) * 0.03;
    });
    const bob = (list, n, k) => { for (let i = 0; i < Math.min(n, list.length); i++) { const f = list[i].userData.f; f.position.y = (k || 0) + Math.abs(Math.sin(t * 7 + i * 1.7)) * 0.07; } };
    bob(desks, busy.inv, 0.2); bob(kiosks, busy.pts); bob(guichets, busy.acc); bob(plaDesks, busy.pla, 0.12);
    queue.forEach((q, i) => { if (q.visible) q.position.y = Math.abs(Math.sin(t * 2 + i)) * 0.04; });
    for (let i = walkers.length - 1; i >= 0; i--) {
      const w = walkers[i], a = w.pts[w.i], b = w.pts[w.i + 1];
      if (!b) { world.remove(w.f); walkers.splice(i, 1); continue; }
      const d = a.distanceTo(b); w.t += (dt * w.sp) / d;
      if (w.t >= 1) { w.i++; w.t = 0; continue; }
      w.f.position.lerpVectors(a, b, w.t); w.f.position.y = Math.abs(Math.sin(t * 12)) * 0.12;
      w.f.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    }
    if (bounce > 0) {
      bounce = Math.max(0, bounce - dt * 3.5);
      const s = Math.sin(bounce * Math.PI);
      pBody.scale.set(1 + s * 0.12, 1 - s * 0.16, 1 + s * 0.12);
      arm.rotation.z = s * 1.6;
    } else { pBody.scale.set(1, 1 + Math.sin(t * 2) * 0.015, 1); arm.rotation.z = 0.2 + Math.sin(t * 1.5) * 0.08; }
  });

  // ---------- événements visuels ----------
  const P = {
    park: V(1.5, 0, 8), parkL: V(-1, 0, 8),
    cellDoor: V(5, 0, 2.6), cellIn: V(6.5, 0, 1.4),
    out: V(13, 0, 15), road: V(4, 0, 19),
    accDoor: V(0.5, 0, -3), queueEnd: V(0.6, 0, 3.8),
    plaIn: V(-6, 0, 7.2), ptsIn: V(6, 0, 9.5),
  };
  S.arrive = () => {
    walk('cop', [P.park, V(3.6, 0, 4.4), P.cellDoor, P.cellIn], 3);
    walk('suspect', [P.parkL, V(3.0, 0, 4.9), V(4.4, 0, 3.2), P.cellIn], 3);
  };
  S.release = () => walk('suspect', [V(5.2, 0, 3.5), V(8, 0, 13), P.out, V(16, 0, 17.5)], 3.6);
  S.citizenIn = () => walk('civ', [V(-2, 0, 19.5), V(-0.6, 0, 12), P.queueEnd], 3.6);
  S.toPlaintes = () => walk('civ', [V(-1.2, 0, -3.2), V(-3.2, 0, 4), P.plaIn], 3.2);
  S.angry = () => walk('civ', [V(1.2, 0, 3.5), V(2.5, 0, 12), P.road], 5);
  S.parpaingHit = () => { bounce = 1; };
  pickables.push({ obj: parp, cb: () => S.onParpaing && S.onParpaing() });
  S.sync = sync;
  S.tags = tags;
  S.anchors = anchors;
})();
