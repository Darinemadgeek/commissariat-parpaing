// Décors des commissariats 6 à 10 : plage, montagne, aéroport, festival, ministère.
(function () {
  const { THREE, mat, box, cyl, ball, flat, sign, figure, setSky } = S;
  const W = S.world, E = W.EXTRA;
  const rr = W.rr, pick = W.pick, rand = W.rand;
  const noShadow = o => { o.traverse(m => { m.castShadow = false; }); return o; };
  const grp = (p, x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g); return g; };
  // en dehors de l'îlot du commissariat et des rues qui l'entourent
  const free = (x, z) => !(Math.abs(x) < 42 && z > -44 && z < 30) && Math.abs(z - 20) > 7;
  function scatter(n, rMin, rMax, f) {
    if (S.low) n = Math.ceil(n * 0.5); // téléphone : moitié moins d'éléments de décor
    for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
      const a = rand() * Math.PI * 2, r = rr(rMin, rMax), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (free(x, z)) { f(x, z, i); i++; }
    }
  }

  // ---------- 6. Plage ----------
  function palm(p, x, z, s) {
    const g = grp(p, x, z, rand() * 6);
    for (let k = 0; k < 6; k++) cyl(g, 0.22 - k * 0.02, 0.26 - k * 0.02, 1.1, 6, '#9c7048', k * 0.25, k * 1.05, 0);
    const top = grp(g, 1.5, 0); top.position.y = 6.4;
    for (let k = 0; k < 7; k++) { const l = box(top, 3.6, 0.12, 0.9, k % 2 ? '#3fae5a' : '#58c26a', 1.6, 0, 0); const piv = new THREE.Group(); piv.rotation.y = (k / 7) * Math.PI * 2; piv.rotation.z = -0.35; piv.add(l); top.add(piv); }
    g.scale.setScalar(s || 1);
  }
  E.plage = p => {
    setSky({ sky: '#9fe0ff', fogNear: 130, fogFar: 320, hemiGround: '#d9b67a', sunI: 0.95 });
    flat(p, 900, 900, '#ecd5a3', 0, -0.02, 0);
    const sea = flat(p, 900, 420, mat('#2fa8e0', { roughness: 0.3 }), 0, 0.01, 272);
    const foam = flat(p, 900, 2.4, '#ffffff', 0, 0.03, 62.5);
    W.roads(p, false, 320);
    flat(p, 640, 5, '#d9c7a3', 0, 0.025, 27.5); // promenade
    for (let x = -150; x <= 150; x += 16) if (Math.abs(x) > 8) palm(p, x + rr(-2, 2), 29, rr(0.8, 1.1));
    const STR = ['#ff4b5c', '#3d7bff', '#ffc93c', '#36d68a', '#c879ff', '#ff9f1c'];
    for (let i = 0; i < 70; i++) {
      const x = rr(-170, 170), z = rr(34, 58), c = pick(STR);
      flat(p, 1.2, 2.2, pick(STR), x + 1.6, 0.03, z + 0.6).rotation.z = rand();
      if (i % 2) continue;
      cyl(p, 0.05, 0.05, 2.6, 5, '#ffffff', x, 0, z);
      const top = cyl(p, 0, 1.6, 0.7, 8, c, x, 2.3, z); top.castShadow = true;
    }
    for (let i = 0; i < 9; i++) { // voiliers
      const b = grp(p, rr(-160, 160), rr(90, 220), rand() * 6);
      box(b, 6, 1, 2, '#ffffff', 0, 0, 0); box(b, 0.15, 7, 0.15, '#c9ccd1', 0.5, 1, 0);
      const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.6, 1.5, 0), new THREE.Vector3(0.6, 7.5, 0), new THREE.Vector3(3.6, 1.5, 0)]), new THREE.MeshBasicMaterial({ color: pick(['#ffffff', '#ffe066', '#ff8fb8']), side: THREE.DoubleSide, fog: true }));
      sail.geometry.computeVertexNormals(); b.add(sail);
      const ph = rand() * 6; W.anim((dt, t) => { b.position.y = Math.sin(t * 1.3 + ph) * 0.25; b.rotation.z = Math.sin(t + ph) * 0.05; });
    }
    // phare sur son rocher
    const lh = grp(p, 150, 70);
    ball(lh, 7, '#8d939e', 0, 0, 0, 0).scale.set(1, 0.5, 1);
    for (let i = 0; i < 7; i++) cyl(lh, 1.5 - i * 0.12, 1.62 - i * 0.12, 1.6, 10, i % 2 ? '#ffffff' : '#e63946', 0, 2 + i * 1.6, 0);
    cyl(lh, 0.7, 0.7, 1.2, 8, mat('#fff7c2', { emissive: '#ffd84a', emissiveIntensity: 0.9 }), 0, 13.2, 0);
    cyl(lh, 0, 1, 1, 8, '#e63946', 0, 14.4, 0);
    // goélands qui tournent
    for (let i = 0; i < 8; i++) {
      const gl = new THREE.Group(); p.add(gl);
      box(gl, 0.9, 0.3, 0.35, '#ffffff', 0, 0, 0);
      const wl = box(gl, 0.25, 0.06, 1.4, '#dfe3ea', 0, 0.15, 0.7), wr = box(gl, 0.25, 0.06, 1.4, '#dfe3ea', 0, 0.15, -0.7);
      const r = rr(25, 70), h = rr(12, 24), ph = rand() * 6, sp = rr(0.2, 0.4) * (i % 2 ? 1 : -1);
      noShadow(gl);
      W.anim((dt, t) => { const a = t * sp + ph; gl.position.set(Math.cos(a) * r, h + Math.sin(t * 2 + ph), 30 + Math.sin(a) * r * 0.5); gl.rotation.y = -a + (sp > 0 ? 0 : Math.PI); wl.rotation.x = Math.sin(t * 8 + ph) * 0.5; wr.rotation.x = -wl.rotation.x; });
    }
    // villas de bord de mer
    scatter(46, 46, 170, (x, z) => { if (z > 22) return; W.building(p, rr(7, 11), rr(2, 4) * 3, rr(7, 10), pick(['pastelA', 'pastelB', 'pastelC', 'ferme']), x, z, Math.hypot(x, z) < 90); });
    W.anim((dt, t) => { foam.scale.y = 1 + Math.sin(t * 1.4) * 0.4; sea.position.y = 0.01 + Math.sin(t * 0.8) * 0.03; });
    W.addTraffic(p, 6, false, 300);
  };

  // ---------- 7. Montagne ----------
  function pine(p, x, z, s, shadow) {
    const g = grp(p, x, z);
    cyl(g, 0.2, 0.3, 1.2, 6, '#6b4a3a', 0, 0, 0);
    for (let k = 0; k < 3; k++) { cyl(g, 0, 1.9 - k * 0.45, 2.2, 7, '#2f6b4f', 0, 1 + k * 1.3, 0); cyl(g, 0, 0.9 - k * 0.22, 0.9, 7, '#f4f8ff', 0, 2.4 + k * 1.3, 0); }
    g.scale.setScalar(s); if (!shadow) noShadow(g);
  }
  let snow = null;
  E.neige = p => {
    setSky({ sky: '#cfe6ff', fogNear: 100, fogFar: 280, hemiGround: '#e8eef6', hemi: 0.95, sunI: 0.8 });
    flat(p, 900, 900, '#f4f8ff', 0, -0.02, 0);
    W.roads(p, false, 320);
    for (let i = 0; i < 18; i++) { // montagnes
      const a = (i / 18) * Math.PI * 2 + rr(-0.1, 0.1), r = rr(190, 260), h = rr(60, 130), x = Math.cos(a) * r, z = Math.sin(a) * r;
      const m = cyl(p, 0, h * 0.75, h, 6, '#8f9db5', x, 0, z); m.castShadow = false; m.rotation.y = rand();
      const cap = cyl(p, 0, h * 0.27, h * 0.36, 6, '#ffffff', x, h * 0.64, z); cap.castShadow = false; cap.rotation.y = m.rotation.y;
    }
    scatter(150, 44, 180, (x, z) => pine(p, x, z, rr(0.8, 1.5), Math.hypot(x, z) < 80));
    scatter(22, 48, 140, (x, z) => { // chalets
      const c = grp(p, x, z, rand() * 6);
      box(c, 8, 4, 6, '#a0683a', 0, 0, 0);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 8.6, 3), mat('#ffffff')); roof.rotation.z = Math.PI / 2; roof.position.y = 5.2; roof.scale.set(1, 1, 0.7); roof.castShadow = true; c.add(roof);
      box(c, 1.4, 2.2, 0.1, '#6b3f22', 0, 0, 3.05); box(c, 1.2, 1, 0.1, '#ffd27a', -2.5, 1.8, 3.05); box(c, 1.2, 1, 0.1, '#ffd27a', 2.5, 1.8, 3.05);
    });
    for (let i = 0; i < 6; i++) { const sm = grp(p, rr(-30, 30), rr(24, 34)); ball(sm, 0.9, '#ffffff', 0, 0.9, 0, 1); ball(sm, 0.6, '#ffffff', 0, 2.1, 0, 1); box(sm, 0.12, 0.12, 0.5, '#ff9f1c', 0, 2.1, 0.6); }
    // télésiège : pylônes, câble, cabines
    const A = new THREE.Vector3(70, 0, -60), B = new THREE.Vector3(170, 70, -190), n = 6;
    for (let i = 0; i <= n; i++) { const q = A.clone().lerp(B, i / n); cyl(p, 0.3, 0.4, 9, 6, '#3a4152', q.x, q.y, q.z); box(p, 3, 0.3, 0.3, '#3a4152', q.x, q.y + 9, q.z); }
    const cab = [];
    for (let i = 0; i < 10; i++) { const c = new THREE.Group(); box(c, 1.4, 1.2, 1.2, pick(['#e63946', '#ffc93c', '#3d7bff']), 0, -1.8, 0); box(c, 0.08, 1.2, 0.08, '#3a4152', 0, -0.6, 0); p.add(c); cab.push([c, i / 10]); }
    W.anim((dt, t) => cab.forEach(([c, o]) => { const k = (t * 0.02 + o) % 1; c.position.copy(A).lerp(B, k); c.position.y += 9; }));
    // chute de neige (plus forte pendant les tempêtes)
    const N = 1800, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = rr(-90, 90); pos[i * 3 + 1] = rr(0, 60); pos[i * 3 + 2] = rr(-90, 90); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    snow = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.45, transparent: true, opacity: 0.85, fog: true }));
    p.add(snow);
    W.anim((dt) => {
      const storm = !!W.storm, sp = storm ? 14 : 3, drift = storm ? 6 : 0.6;
      snow.geometry.setDrawRange(0, storm ? N : N / 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3 + 1] -= sp * dt; pos[i * 3] += drift * dt;
        if (pos[i * 3 + 1] < 0) { pos[i * 3 + 1] = 60; pos[i * 3] = rr(-90, 90); }
        if (pos[i * 3] > 90) pos[i * 3] = -90;
      }
      g.attributes.position.needsUpdate = true;
    });
    W.addTraffic(p, 5, false, 300);
  };

  // ---------- 8. Aéroport ----------
  function plane(p, x, z, ry, s) {
    const g = grp(p, x, z, ry);
    const fus = cyl(g, 1.6, 1.6, 22, 12, '#f4f6fb', 0, 2.6, 0); fus.rotation.x = Math.PI / 2; fus.position.set(0, 2.6, 0);
    const nose = cyl(g, 0, 1.6, 3, 12, '#f4f6fb', 0, 0, 0); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.6, 12.5);
    box(g, 24, 0.35, 4.2, '#e8eefc', 0, 2.2, 1); box(g, 9, 0.3, 2.2, '#e8eefc', 0, 3.6, -9.6);
    box(g, 0.35, 5, 3, '#3d7bff', 0, 3.6, -9.8);
    box(g, 0.1, 0.5, 20, '#3d7bff', 1.62, 2.8, 0); box(g, 0.1, 0.5, 20, '#3d7bff', -1.62, 2.8, 0);
    [-5.5, 5.5].forEach(ex => { const e = cyl(g, 0.7, 0.7, 2.8, 10, '#c9ccd1', ex, 0, 0); e.rotation.x = Math.PI / 2; e.position.set(ex, 1.6, 2.5); });
    g.scale.setScalar(s || 1);
    return g;
  }
  E.aeroport = p => {
    setSky({ sky: '#a9d8ff', fogNear: 130, fogFar: 320, hemiGround: '#7f9a6c' });
    flat(p, 900, 900, '#9cc48a', 0, -0.02, 0);
    W.roads(p, false, 320);
    flat(p, 440, 150, '#8e939c', 0, 0.012, -125);
    flat(p, 400, 18, '#4b5060', 0, 0.02, -165);
    for (let x = -190; x < 190; x += 12) flat(p, 6, 0.6, '#ffffff', x, 0.03, -165);
    flat(p, 400, 0.5, '#ffffff', 0, 0.03, -156.5); flat(p, 400, 0.5, '#ffffff', 0, 0.03, -173.5);
    // terminal et passerelles
    const term = grp(p, -55, -68);
    W.building(term, 110, 12, 16, 'verre', 0, 0, true);
    box(term, 112, 1, 18, '#e8edf3', 0, 12, 0);
    sign(term, 'ROISSY-PARPAING', 30, 3, '#1b2a5c', '#ffffff', 0, 9, 8.05);
    for (let i = 0; i < 4; i++) box(term, 3, 3, 14, '#c9ccd1', -40 + i * 26, 4, -15);
    // tour de contrôle
    const tw = grp(p, 70, -72);
    cyl(tw, 2.2, 3, 32, 10, '#e8edf3', 0, 0, 0);
    cyl(tw, 5, 3.2, 5, 10, new THREE.MeshStandardMaterial({ color: '#7fc4ff', transparent: true, opacity: 0.7, roughness: 0.1 }), 0, 32, 0);
    cyl(tw, 5.6, 5.6, 0.8, 10, '#3a4152', 0, 37, 0);
    const radar = box(tw, 4, 0.4, 0.4, '#ffffff', 0, 38.4, 0); W.anim((dt, t) => { radar.rotation.y = t * 2; });
    for (let i = 0; i < 4; i++) plane(p, -95 + i * 26, -97, 0, 1); // nez vers le terminal
    // avion qui décolle en boucle (cabré au décollage)
    const fly = plane(p, -200, -165, Math.PI / 2, 1.1); noShadow(fly); fly.rotation.order = 'ZYX';
    W.anim((dt, t) => { const k = (t % 24) / 24, x = -220 + k * 520; fly.position.x = x; fly.position.y = x > 20 ? (x - 20) * 0.22 : 0; fly.rotation.z = x > 20 ? 0.2 : 0; });
    // parkings
    for (let i = 0; i < 2; i++) { const pk = grp(p, i ? 80 : -80, 50); flat(pk, 50, 26, '#5a5f6e', 0, 0.02, 0); for (let k = 0; k < 18; k++) { const c = W.carMesh(pick(['#e63946', '#f1faee', '#ffb703', '#219ebc', '#3a3a3a', '#ffffff']), false); c.position.set(-22 + (k % 9) * 5.5, 0, k < 9 ? -6 : 6); c.rotation.y = Math.PI / 2; pk.add(c); } }
    scatter(40, 60, 200, (x, z) => { if (z < -50) return; W.tree(p, x, z, rr(0.8, 1.2), false); });
    W.addTraffic(p, 8, false, 300);
  };

  // ---------- 9. Festival ----------
  E.festival = p => {
    setSky({ sky: '#ffcfa3', fogNear: 120, fogFar: 300, hemiSky: '#ffe0c2', hemiGround: '#6f9a55', sun: '#ffc48a', sunI: 0.9 });
    flat(p, 900, 900, '#86c76a', 0, -0.02, 0);
    W.roads(p, false, 320);
    flat(p, 4, 6, '#c4142a', 0, 0.04, 20); // tapis rouge jusqu'au commissariat
    // grande scène
    const st = grp(p, 0, -115);
    box(st, 56, 4, 22, '#2b2f36', 0, 0, 0); box(st, 56, 26, 2, '#1d2433', 0, 4, -10);
    const scr = box(st, 30, 12, 0.3, mat('#ff4bd2', { emissive: '#ff4bd2', emissiveIntensity: 0.8 }), 0, 10, -8.8);
    [-26, 26].forEach(x => { box(st, 2, 30, 2, '#9aa0aa', x, 0, -8); box(st, 6, 10, 5, '#111522', x, 4, 2); });
    box(st, 56, 2, 2, '#9aa0aa', 0, 30, -8);
    const lights = [];
    for (let i = 0; i < 8; i++) { const l = cyl(st, 0.3, 1.4, 3, 8, mat(pick(['#ffe066', '#3d7bff', '#ff4b5c', '#36d68a']), { emissive: '#ffffff', emissiveIntensity: 0.6 }), -21 + i * 6, 27, -6); lights.push(l); }
    W.anim((dt, t) => { lights.forEach((l, i) => { l.rotation.z = Math.sin(t * 2 + i) * 0.6; }); scr.material.emissiveIntensity = 0.5 + Math.abs(Math.sin(t * 3)) * 0.6; });
    // la foule qui saute
    const crowd = [];
    for (let i = 0; i < 160; i++) { const f = new THREE.Group(); cyl(f, 0.24, 0.3, 0.75, 6, pick(['#e85d75', '#5bc0eb', '#9bc53d', '#fde74c', '#c879ff', '#ff9f1c', '#2ec4b6']), 0, 0, 0); ball(f, 0.22, pick(['#f1c27d', '#e0ac69', '#c68642', '#8d5524']), 0, 0.95, 0, 0); f.position.set(rr(-30, 30), 0, rr(-90, -58)); noShadow(f); p.add(f); crowd.push([f, rand() * 6]); }
    W.anim((dt, t) => crowd.forEach(([f, o]) => { f.position.y = Math.max(0, Math.sin(t * 6 + o)) * 0.5; }));
    // grande roue
    const wheel = grp(p, 115, -40);
    box(wheel, 1, 22, 1, '#dfe3ea', -3, 0, 0).rotation.z = 0.15; box(wheel, 1, 22, 1, '#dfe3ea', 3, 0, 0).rotation.z = -0.15;
    const rot = new THREE.Group(); rot.position.y = 21; wheel.add(rot);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(15, 0.4, 6, 32), mat('#c879ff')); rot.add(ring);
    const cabins = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const sp = box(rot, 0.2, 15, 0.2, '#dfe3ea', 0, 0, 0); sp.position.set(Math.cos(a) * 7.5, Math.sin(a) * 7.5, 0); sp.rotation.z = a - Math.PI / 2; const c = box(rot, 2, 2, 2, pick(['#ff4b5c', '#ffc93c', '#3d7bff', '#36d68a']), Math.cos(a) * 15, Math.sin(a) * 15 - 1, 0); cabins.push(c); }
    noShadow(wheel);
    W.anim((dt, t) => { rot.rotation.z = t * 0.15; cabins.forEach(c => { c.rotation.z = -rot.rotation.z; }); });
    // camping et food trucks
    scatter(60, 50, 150, (x, z) => { if (z > 10 || x > 60) return; const tent = cyl(p, 0, rr(1.6, 2.4), rr(1.8, 2.6), 4, pick(['#ff4b5c', '#ffc93c', '#3d7bff', '#36d68a', '#ff8fb8']), x, 0, z); tent.rotation.y = rand(); });
    for (let i = 0; i < 6; i++) { const tr = grp(p, 55 + i * 10, 40, Math.PI); box(tr, 7, 3.4, 3, pick(['#ffc93c', '#ff8fb8', '#5bc0eb', '#36d68a']), 0, 0.5, 0); box(tr, 4, 1.2, 0.1, '#1d2433', 0.8, 1.8, 1.55); [-2.4, 2.4].forEach(wx => { const w = cyl(tr, 0.5, 0.5, 0.3, 8, '#151821', wx, 0, 1.4); w.rotation.x = Math.PI / 2; w.position.y = 0.5; }); }
    const arch = grp(p, -40, 40);
    box(arch, 1.2, 9, 1.2, '#c879ff', -8, 0, 0); box(arch, 1.2, 9, 1.2, '#c879ff', 8, 0, 0); box(arch, 17.2, 2.4, 1.2, '#c879ff', 0, 9, 0);
    sign(arch, 'FESTIVAL DE PARPAING', 15, 1.8, '#c879ff', '#ffffff', 0, 10.2, 0.62);
    W.addTraffic(p, 6, false, 300);
  };

  // ---------- 10. Ministère ----------
  E.ministere = p => {
    W.city(p, 'ministere');
    // l'hôtel du ministre, dans le pâté gardé libre en face du commissariat
    const pal = grp(p, 0, 46);
    box(pal, 52, 0.3, 40, '#d9d2c2', 0, 0, 0); // cour pavée
    W.building(pal, 50, 15, 14, 'haussmann', 0, 13, true);
    W.building(pal, 14, 18, 12, 'haussmann', 0, 6, true);
    W.building(pal, 12, 13, 26, 'haussmann', -19, 0, true); W.building(pal, 12, 13, 26, 'haussmann', 19, 0, true);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 50, 4, 1), mat('#5b6b82')); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 4; roof.position.set(0, 15, 13); roof.scale.set(1, 1, 0.45); pal.add(roof);
    const goldM = mat('#ffc93c', { metalness: 0.6, roughness: 0.35, emissive: '#6b4a00', emissiveIntensity: 0.3 });
    for (let i = 0; i < 13; i++) cyl(pal, 0.12, 0.12, 3.2, 5, goldM, -12 + i * 2, 0, -20); // grille dorée
    box(pal, 26, 0.4, 0.4, goldM, 0, 3, -20);
    sign(pal, "MINISTÈRE DE L'INTÉRIEUR DE PARPAING", 13, 1.2, '#efe3c8', '#1b2a5c', 0, 14, -0.08, Math.PI); // face au commissariat
    for (let i = 0; i < 4; i++) { const x = -15 + i * 10; cyl(pal, 0.08, 0.1, 6, 6, '#dfe3ea', x, 18, 13); ['#2346a8', '#ffffff', '#e63946'].forEach((c, k) => box(pal, 0.7, 1.4, 0.06, c, x + 0.45 + k * 0.7, 21.8, 13)); }
    [-6, 6].forEach(x => { const g = figure('cop'); g.position.set(x, 0.3, -21); g.rotation.y = Math.PI; pal.add(g); });
  };
})();
