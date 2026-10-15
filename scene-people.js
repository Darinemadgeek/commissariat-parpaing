// Personnages façon Settlers 4 : un bonhomme paramétrable, des tirages au hasard par rôle,
// puis chaque variante est fusionnée en un seul maillage à couleurs de sommets (un seul appel de dessin).
(function () {
  const { THREE, low } = S;
  const SEG = low ? 8 : 12;       // finesse des grosses pièces
  const SCALE = 0.42;             // le modèle fait ~2,7 de haut, les anciens bonshommes ~1,15
  const POOL = low ? 4 : 8;       // variantes gardées par rôle (réutilisées ensuite)

  // ---------- outils de modélisation ----------
  const geos = {};
  const G = (k, f) => geos[k] || (geos[k] = f());
  let LAYER = 'body';
  const DUMMY = new THREE.MeshBasicMaterial();
  function add(g, geo, c, x, y, z, sx, sy, sz) {
    const m = new THREE.Mesh(geo, DUMMY);
    m.position.set(x || 0, y || 0, z || 0);
    if (sx !== undefined) m.scale.set(sx, sy, sz);
    if (c && c.isMaterial) m.userData.tex = c; else m.userData.c = c;
    m.userData.layer = LAYER;
    g.add(m);
    return m;
  }
  const segs = r => (r < 0.12 ? 6 : SEG);
  const sph = (g, r, c, x, y, z, sx = 1, sy = 1, sz = 1) => add(g, G('s' + r, () => new THREE.SphereGeometry(r, segs(r), Math.max(4, Math.round(segs(r) * 0.6)))), c, x, y, z, sx, sy, sz);
  const cyl = (g, rt, rb, h, c, x, y, z) => add(g, G(`c${rt}_${rb}_${h}`, () => new THREE.CylinderGeometry(rt, rb, h, rt < 0.12 && rb < 0.12 ? 6 : SEG)), c, x, y, z);
  const lathe = (g, pts, c) => add(g, G('l' + pts.join(), () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), SEG)), c, 0, 0, 0);
  const dome = (g, r, c, y, sy = 0.8) => add(g, G('d' + r, () => new THREE.SphereGeometry(r, SEG, Math.max(4, SEG / 2), 0, Math.PI * 2, 0, Math.PI / 2)), c, 0, y, 0, 1, sy, 1);
  const visor = (g, r, c, y, z = 0, depth = 0.9) => add(g, G('v' + r, () => new THREE.CylinderGeometry(r, r, 0.05, SEG, 1, false, -Math.PI / 2, Math.PI)), c, 0, y, z, 1, 1, depth);
  const torus = (g, r, t, c, x, y, z, arcA) => add(g, G(`t${r}_${t}_${arcA || 0}`, () => new THREE.TorusGeometry(r, t, 5, SEG, arcA || Math.PI * 2)), c, x, y, z);
  const ring = (g, r, t, c, y, z = 0) => { const m = torus(g, r, t, c, 0, y, z); m.rotation.x = Math.PI / 2; return m; };
  const box = (g, w, h, d, c, x, y, z) => add(g, G(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)), c, x, y, z);
  const tilt = (m, rz) => { m.rotation.z = rz; return m; };
  function arc(g, r, tube, c, x, y, z, smile) { const m = torus(g, r, tube, c, x, y, z, Math.PI); if (smile) m.rotation.z = Math.PI; return m; }
  const UP = new THREE.Vector3(0, 1, 0);
  function limb(g, a, b, r, c) { // cylindre tendu entre deux points
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const m = add(g, G(`k${r}_${len.toFixed(2)}`, () => new THREE.CylinderGeometry(r, r * 1.1, len, 6)), c, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    m.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize());
    return m;
  }
  const darker = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

  // ---------- textures : pancartes et logo PTS ----------
  const texCache = {};
  function signMat(text, bg = '#fffdf2', fg = '#d62828') {
    return texCache[text + bg] || (texCache[text + bg] = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 160;
      const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, 256, 160);
      x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lines = text.split('\n'); let fs = lines.length > 1 ? 50 : 64;
      x.font = `900 ${fs}px "Arial Black", Arial`;
      while (Math.max(...lines.map(l => x.measureText(l).width)) > 236 && fs > 20) { fs -= 2; x.font = `900 ${fs}px "Arial Black", Arial`; }
      lines.forEach((l, i) => x.fillText(l, 128, 80 + (i - (lines.length - 1) / 2) * fs * 1.05));
      return new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), roughness: 0.9 });
    })());
  }
  let logoMat = null;
  function ptsLogo() { // hexagone rouge / bleu, empreinte blanche, pistes de circuit
    if (logoMat) return logoMat;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), cx = 128, cy = 128;
    const hex = r => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); };
    x.strokeStyle = '#1d2a52'; x.lineWidth = 7;
    for (const [s, y, dx] of [[-1, 70, 30], [-1, 186, 30], [1, 70, 30], [1, 186, 30], [-1, 128, 44], [1, 128, 44]]) {
      const x0 = cx + s * 92, x1 = x0 + s * dx;
      x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke();
      x.beginPath(); x.arc(x1 + s * 6, y, 8, 0, Math.PI * 2); x.stroke();
    }
    hex(108); x.fillStyle = '#1d2a52'; x.fill();
    x.save(); hex(94); x.clip();
    x.fillStyle = '#d0202e'; x.fillRect(0, 0, cx, 256);
    x.fillStyle = '#1f4fa8'; x.fillRect(cx, 0, 128, 256);
    x.restore();
    // empreinte : bout de doigt ovale, boucle au centre, crêtes espacées avec quelques coupures
    x.save(); x.translate(cx, cy + 2);
    x.beginPath(); x.ellipse(0, 0, 58, 74, 0, 0, Math.PI * 2); x.clip();
    x.strokeStyle = '#ffffff'; x.lineCap = 'round'; x.lineWidth = 6;
    x.beginPath(); x.moveTo(-7, 22); x.lineTo(-7, -2); x.arc(0, -2, 7, Math.PI, 0); x.lineTo(7, 14); x.stroke();
    const gaps = [[1.1, 1.5], [2.3, 2.6], [0.4, 0.7], [1.9, 2.2], [0.9, 1.2]];
    for (let i = 1; i <= 5; i++) {
      const rx = 7 + i * 13, ry = 12 + i * 15, [g0, g1] = gaps[i - 1];
      x.beginPath(); x.ellipse(0, 4, rx, ry, 0, g1, g0 + Math.PI * 2); x.stroke();
    }
    x.restore();
    x.lineWidth = 5; x.strokeStyle = '#ffffff';
    x.beginPath(); x.ellipse(cx, cy + 2, 58, 74, 0, 0, Math.PI * 2); x.stroke();
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    return (logoMat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.1, roughness: 0.8 }));
  }

  const SSK = '#f2c79a', BROWN = '#6b4a2a', GOLD = '#ffd23f', MUST = '#6b3f1f';
  const GLOVE = '#5aa8ff', MASK = '#8ec5ea', TIE = '#c8102e', FELT = '#4a3222';

  // ---------- le bonhomme, paramétrable ----------
  function settler(g, o) {
    o = Object.assign({ body: '#3a5cb0', legs: BROWN, shoe: '#3a2414', skin: SSK, hairC: '#5a3418', hatC: '#22336e', pose: 'down', belly: 1 }, o);
    const sk = o.skin, hand = o.gloves || sk, w = o.belly;
    // jambes, corps
    const legC = o.dress ? sk : o.legs;
    cyl(g, 0.14, 0.15, 0.5, legC, -0.2, 0.25, 0); cyl(g, 0.14, 0.15, 0.5, legC, 0.2, 0.25, 0);
    sph(g, 0.18, o.shoe, -0.2, 0.07, 0.08, 1, 0.55, 1.4); sph(g, 0.18, o.shoe, 0.2, 0.07, 0.08, 1, 0.55, 1.4);
    const bottom = o.robe ? [[0, 0.14], [0.68, 0.16]] : o.dress ? [[0, 0.5], [0.72, 0.52]] : o.long ? [[0, 0.3], [0.62, 0.32]] : [[0, 0.42], [0.5, 0.46]];
    lathe(g, [...bottom, [0.7, 0.82], [0.64, 1.2], [0.46, 1.52], [0.2, 1.62], [0, 1.62]], o.body).scale.set(w, 1, w);
    const bodyR = y => (y > 1.2 ? 0.64 + (0.46 - 0.64) * (y - 1.2) / 0.32 : 0.7 + (0.64 - 0.7) * (y - 0.82) / 0.38) * w;
    if (o.stripes) for (let i = 0; i < 3; i++) { const k = w * (i === 2 ? 0.95 : 1.02); ring(g, 0.69, 0.045, o.stripes, 0.8 + i * 0.22).scale.set(k, k, 1); }
    if (o.belt) { ring(g, 0.69, 0.06, o.belt, 0.95).scale.set(w, w, 1); if (o.buckle) box(g, 0.2, 0.18, 0.06, '#e8c14a', 0, 0.95, 0.72 * w); }
    if (o.epaulettes) { sph(g, 0.14, GOLD, -0.5 * w, 1.48, 0, 1.2, 0.5, 1); sph(g, 0.14, GOLD, 0.5 * w, 1.48, 0, 1.2, 0.5, 1); }
    if (o.collar) ring(g, 0.3, 0.08, o.collar, 1.56);
    if (o.scarf) { ring(g, 0.32, 0.11, o.scarf, 1.58); box(g, 0.16, 0.4, 0.06, o.scarf, 0.14, 1.35, 0.5 * w).rotation.x = -0.3; }
    if (o.boa) for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; sph(g, 0.13, o.boa, Math.cos(a) * 0.38, 1.56, Math.sin(a) * 0.36); }
    if (o.tie) box(g, 0.12, 0.4, 0.05, o.tie, 0, 1.3, 0.55 * w).rotation.x = -0.25;
    if (o.rabat) { box(g, 0.09, 0.22, 0.04, '#ffffff', -0.055, 1.42, 0.52).rotation.x = -0.3; box(g, 0.09, 0.22, 0.04, '#ffffff', 0.055, 1.42, 0.52).rotation.x = -0.3; }
    if (o.chain) { // collier posé sur le torse, médaillon devant
      for (let i = 0; i <= 12; i++) {
        const a = -1.25 + i / 12 * 2.5, y = 1.5 - 0.26 * Math.cos(a) ** 2, r = bodyR(y) + 0.03;
        sph(g, 0.04, GOLD, Math.sin(a) * r, y, Math.cos(a) * r);
      }
      const my = 1.16, mr = bodyR(my) + 0.04;
      cyl(g, 0.11, 0.11, 0.04, GOLD, 0, my, mr).rotation.x = Math.PI / 2 - 0.25;
      sph(g, 0.05, '#d62828', 0, my, mr + 0.03, 1, 1, 0.4);
    }
    if (o.zip) { box(g, 0.05, 0.9, 0.04, '#b8c2d6', 0, 1.05, 0.66 * w).rotation.x = -0.1; box(g, 0.22, 0.18, 0.04, '#dfe4ee', 0.3, 0.92, 0.66 * w); }
    if (o.bib) box(g, 0.5, 0.42, 0.05, o.bib, 0, 1.12, 0.66 * w).rotation.x = -0.15;
    if (o.vest) {
      lathe(g, [[0.5, 0.5], [0.72, 0.82], [0.66, 1.2], [0.48, 1.5]], o.vest).scale.set(w * 1.02, 1, w * 1.02);
      if (o.vestStripe) ring(g, 0.71, 0.04, o.vestStripe, 0.9).scale.set(w * 1.03, w * 1.03, 1);
    }
    if (o.backLogo) add(g, G('logo', () => new THREE.PlaneGeometry(0.62, 0.62)), ptsLogo(), 0, 1.12, -(0.665 * w + 0.015)).rotation.y = Math.PI;
    if (o.badge) sph(g, 0.08, o.badge, -0.3, 1.25, 0.6 * w, 1, 1, 0.4);
    if (o.backpack) { box(g, 0.6, 0.7, 0.3, o.backpack, 0, 1.05, -0.7 * w); box(g, 0.5, 0.25, 0.08, darker(o.backpack, 0.8), 0, 0.9, -0.87 * w); }
    // bras, mains, objets
    const sx = 0.55 * w, L = [-sx, 1.42, 0], Rt = [sx, 1.42, 0], sleeve = o.sleeve || o.body;
    const armL = to => { limb(g, L, to, 0.11, sleeve); sph(g, 0.13, hand, to[0], to[1] - 0.04, to[2]); };
    const armR = to => { limb(g, Rt, to, 0.11, sleeve); sph(g, 0.13, hand, to[0], to[1] - 0.04, to[2]); };
    const down = s => [s * (0.27 + sx), 0.8, 0.05];
    if (o.pose === 'cuffs') {
      armL([-0.16, 1.02, 0.8 * w]); armR([0.16, 1.02, 0.8 * w]);
      torus(g, 0.11, 0.03, '#b8c0cc', -0.15, 1.03, 0.8 * w).rotation.x = Math.PI / 2;
      torus(g, 0.11, 0.03, '#b8c0cc', 0.15, 1.03, 0.8 * w).rotation.x = Math.PI / 2;
    } else if (o.pose === 'camera') {
      armL([-0.24, 1.62, 0.78]); armR([0.24, 1.62, 0.78]);
      box(g, 0.46, 0.3, 0.24, '#1a1d26', 0, 1.7, 0.86);
      cyl(g, 0.11, 0.13, o.zoom ? 0.5 : 0.22, '#2b2f3a', 0, 1.68, o.zoom ? 1.2 : 1.06).rotation.x = Math.PI / 2;
      LAYER = 'flash'; box(g, 0.2, 0.13, 0.12, '#ffffff', 0.12, 1.92, 0.86); LAYER = 'body';
    } else if (o.pose === 'sign') {
      armL(down(-1)); armR([0.62, 1.95, 0.35]);
      limb(g, [0.62, 0.9, 0.35], [0.62, 3.0, 0.35], 0.04, '#b07a45');
      box(g, 1.3, 0.8, 0.06, '#e8dcc0', 0.62, 3.2, 0.33);
      add(g, G('sp', () => new THREE.PlaneGeometry(1.24, 0.74)), signMat(o.sign, o.signBg, o.signFg), 0.62, 3.2, 0.37);
    } else if (o.pose === 'flag') {
      armL(down(-1)); armR([0.62, 1.95, 0.35]);
      limb(g, [0.62, 0.9, 0.35], [0.62, 3.4, 0.35], 0.035, '#9a9a9a');
      box(g, 0.9, 0.6, 0.04, o.flag, 1.08, 3.1, 0.35).rotation.y = -0.15;
    } else if (o.pose === 'megaphone') {
      armL(down(-1)); armR([0.3, 1.75, 0.6]);
      cyl(g, 0.26, 0.07, 0.7, '#f4f4f4', 0.18, 1.82, 0.9).rotation.x = Math.PI / 2;
      torus(g, 0.26, 0.035, '#d62828', 0.18, 1.82, 1.25);
      box(g, 0.08, 0.22, 0.1, '#2a2a2a', 0.18, 1.66, 0.75);
    } else if (o.pose === 'wave') {
      armL(down(-1)); armR([0.85, 2.3, 0.2]);
    } else {
      const it = o.item, hx = 0.7 * w;
      armL(it === 'bag' ? [-0.5 - 0.27 * w, 1.0, 0.25] : down(-1));
      if (['notebook', 'brush', 'mug', 'papers', 'phone', 'baguette', 'icecream'].includes(it)) armR([hx, 1.02, 0.5]);
      else armR(down(1));
      if (it === 'notebook') box(g, 0.28, 0.36, 0.05, '#fffbea', hx - 0.1, 1.08, 0.62).rotation.y = -0.5;
      if (it === 'brush') { cyl(g, 0.03, 0.03, 0.4, '#2a2a2a', hx, 1.2, 0.52); sph(g, 0.08, '#1a1a1a', hx, 1.42, 0.52, 1, 1.4, 1); }
      if (it === 'mug') cyl(g, 0.1, 0.09, 0.2, o.mugC || '#ffffff', hx + 0.02, 1.14, 0.62);
      if (it === 'papers') for (let i = 0; i < 4; i++) box(g, 0.34, 0.03, 0.44, i % 2 ? '#ffffff' : '#f2f0e6', hx - 0.25 + i * 0.01, 0.98 + i * 0.035, 0.66).rotation.y = i * 0.08;
      if (it === 'phone') box(g, 0.16, 0.26, 0.03, '#1a1a1a', hx - 0.05, 1.18, 0.6).rotation.x = -0.6;
      if (it === 'baguette') cyl(g, 0.06, 0.06, 1.0, '#e0b060', hx, 1.2, 0.5).rotation.x = 0.5;
      if (it === 'icecream') { cyl(g, 0.09, 0.01, 0.25, '#e0b060', hx, 1.12, 0.52).rotation.x = Math.PI; sph(g, 0.1, o.iceC || '#ffb3c1', hx, 1.3, 0.52); }
      if (it === 'broom' || it === 'mop') { // le balai est à part pour pouvoir balayer
        LAYER = 'swing';
        limb(g, [0.86 * w, 0.15, 0.3], [0.8 * w, 2.0, -0.05], 0.035, it === 'mop' ? '#9aa6bf' : '#b07a45');
        if (it === 'mop') sph(g, 0.2, '#e8e4d8', 0.86 * w, 0.1, 0.3, 1.2, 0.5, 1.2);
        else { box(g, 0.5, 0.14, 0.16, '#3a6b3a', 0.86 * w, 0.12, 0.32); box(g, 0.48, 0.1, 0.14, '#e8d27a', 0.86 * w, 0.03, 0.32); }
        LAYER = 'body';
        if (it === 'mop') cyl(g, 0.2, 0.18, 0.35, '#3a78d8', 0.4 + 0.86 * w, 0.18, 0.5);
      }
      if (it === 'briefcase') box(g, 0.48, 0.36, 0.13, o.caseC || '#5a3a22', 0.27 + sx, 0.48, 0.06);
      if (it === 'bag') box(g, 0.34, 0.28, 0.14, o.bagC || '#c23a6b', -0.5 - 0.27 * w, 0.78, 0.3);
      if (it === 'shopping') { box(g, 0.4, 0.45, 0.22, o.bagC || '#e8dcc0', 0.27 + sx, 0.45, 0.06); cyl(g, 0.05, 0.05, 0.7, '#e0b060', 0.27 + sx, 0.8, 0.1).rotation.z = 0.2; }
      if (it === 'cane') limb(g, [0.27 + sx, 0.72, 0.1], [0.35 + sx, 0.02, 0.22], 0.035, '#5a3418');
      if (it === 'umbrella') { limb(g, [0.27 + sx, 0.72, 0.1], [0.35 + sx, 0.02, 0.22], 0.03, '#2a2a2a'); cyl(g, 0.1, 0.05, 0.45, o.umbC || '#2a4a8e', 0.29 + sx, 0.45, 0.13); }
      if (it === 'suitcase') box(g, 0.5, 0.7, 0.28, o.caseC || '#d62828', 0.3 + sx, 0.4, 0.3);
    }
    // tête (repère local centré sur la tête)
    const head = new THREE.Group(); head.position.y = 2.02; head.scale.setScalar(o.headR || 1); g.add(head);
    const ear = darker(sk, 0.93);
    if (o.hat !== 'hood') { sph(head, 0.1, ear, -0.48, -0.02, 0, 0.6, 1, 1); sph(head, 0.1, ear, 0.48, -0.02, 0, 0.6, 1, 1); }
    sph(head, 0.48, sk, 0, 0, 0);
    sph(head, 0.17, darker(sk, 0.92), 0, -0.06, 0.47, o.nose || 1, o.nose || 1, 1);
    if (o.beard) sph(head, 0.42, o.beard, 0, -0.2, 0.12, 1, 0.78, 0.9);
    if (o.stubble) sph(head, 0.3, darker(sk, 0.86), 0, -0.24, 0.28, 1.2, 0.7, 0.6);
    if (o.mustache) { tilt(sph(head, 0.17, o.mustache, -0.14, -0.22, 0.42, 1, 0.42, 0.5), 0.35); tilt(sph(head, 0.17, o.mustache, 0.14, -0.22, 0.42, 1, 0.42, 0.5), -0.35); }
    else if (!o.mask && !o.beard && !o.stubble && o.mouth !== 'none') {
      if (o.mouth === 'open') sph(head, 0.07, '#7a2e2e', 0, -0.27, 0.4, 1.2, 1, 0.5);
      else arc(head, 0.07, 0.022, '#5a2a1a', 0, -0.26, 0.4, o.mouth !== 'frown');
    }
    if (o.lipstick) sph(head, 0.06, o.lipstick, 0, -0.27, 0.41, 1.4, 0.6, 0.5);
    if (o.bandeau) {
      add(head, G('band', () => new THREE.CylinderGeometry(0.49, 0.49, 0.15, SEG, 1, true)), '#151515', 0, 0.1, 0);
      sph(head, 0.065, '#ffffff', -0.16, 0.1, 0.48, 1, 0.8, 0.5); sph(head, 0.065, '#ffffff', 0.16, 0.1, 0.48, 1, 0.8, 0.5);
      sph(head, 0.035, '#2a1a0e', -0.14, 0.1, 0.51); sph(head, 0.035, '#2a1a0e', 0.18, 0.1, 0.51);
    } else if (o.sunglasses) {
      sph(head, 0.12, o.sunglasses, -0.17, 0.1, 0.43, 1.2, 0.8, 0.4); sph(head, 0.12, o.sunglasses, 0.17, 0.1, 0.43, 1.2, 0.8, 0.4);
      box(head, 0.14, 0.03, 0.03, '#111111', 0, 0.13, 0.47);
    } else {
      sph(head, 0.05, '#2a1a0e', -0.16, 0.1, 0.44); sph(head, 0.05, '#2a1a0e', 0.16, 0.1, 0.44);
      const brow = o.brows || 0, bc = o.browC || o.hairC || MUST;
      box(head, 0.16, 0.04, 0.04, bc, -0.16, 0.19, 0.43).rotation.z = -brow; box(head, 0.16, 0.04, 0.04, bc, 0.16, 0.19, 0.43).rotation.z = brow;
      if (o.glasses) { torus(head, 0.1, 0.018, o.glasses, -0.16, 0.1, 0.46); torus(head, 0.1, 0.018, o.glasses, 0.16, 0.1, 0.46); }
    }
    if (o.blush) { sph(head, 0.08, '#ff9c9c', -0.3, -0.08, 0.36, 1, 0.6, 0.4); sph(head, 0.08, '#ff9c9c', 0.3, -0.08, 0.36, 1, 0.6, 0.4); }
    if (o.mask) { // masque chirurgical : plis et élastiques
      sph(head, 0.17, MASK, 0, -0.22, 0.4, 1.5, 0.8, 0.6);
      for (const dy of [-0.17, -0.25]) box(head, 0.36, 0.012, 0.02, darker(MASK, 0.85), 0, dy, 0.5);
      limb(head, [-0.24, -0.16, 0.36], [-0.47, 0.02, 0.05], 0.012, '#ffffff'); limb(head, [0.24, -0.16, 0.36], [0.47, 0.02, 0.05], 0.012, '#ffffff');
    }
    if (o.gasMask) { // masque à gaz (odeur de pieds), affiché seulement quand il est acheté
      LAYER = 'mask';
      sph(head, 0.24, '#2b3245', 0, -0.2, 0.36, 1.45, 1.1, 0.9);
      cyl(head, 0.11, 0.11, 0.18, '#8a93a6', 0, -0.26, 0.62).rotation.x = Math.PI / 2;
      sph(head, 0.11, '#9fd3ff', -0.16, 0.1, 0.45, 1, 1, 0.5); sph(head, 0.11, '#9fd3ff', 0.16, 0.1, 0.45, 1, 1, 0.5);
      ring(head, 0.5, 0.04, '#2b3245', 0.08);
      LAYER = 'body';
    }
    // cheveux
    const hc = o.hairC, h = o.hair, capped = o.hat && o.hat !== 'bandana';
    if (h && h !== 'bald' && h !== 'mohawk' && h !== 'afro' && h !== 'bob') {
      if (capped) sph(head, 0.47, hc, 0, 0.02, -0.12, 1.02, 0.8, 0.95); else sph(head, 0.5, hc, 0, 0.16, -0.1);
    }
    if (h === 'bald') { sph(head, 0.14, hc, -0.42, 0.06, -0.12, 0.7, 1, 1.2); sph(head, 0.14, hc, 0.42, 0.06, -0.12, 0.7, 1, 1.2); }
    if (h === 'bun') sph(head, 0.2, hc, 0, 0.48, -0.38);
    if (h === 'ponytail') { sph(head, 0.18, hc, 0, 0.22, -0.55); sph(head, 0.16, hc, 0, -0.08, -0.6, 0.8, 1.6, 0.8); }
    if (h === 'long') sph(head, 0.46, hc, 0, -0.24, -0.2, 1.12, 1.3, 0.8);
    if (h === 'bob') sph(head, 0.52, hc, 0, 0.04, -0.16, 1.08, 1, 0.95);
    if (h === 'pomp') sph(head, 0.24, hc, 0, 0.53, 0.22, 1.2, 0.8, 1.3);
    if (h === 'afro') sph(head, 0.62, hc, 0, 0.26, -0.24);
    if (h === 'curly') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; sph(head, 0.17, hc, Math.cos(a) * 0.38, 0.4 + Math.sin(i * 1.7) * 0.06, Math.sin(a) * 0.32 - 0.08); }
    if (h === 'mohawk') for (let i = 0; i < 5; i++) sph(head, 0.13, hc, 0, 0.44 + Math.sin(i / 4 * Math.PI) * 0.12, 0.32 - i * 0.17, 0.6, 1.5, 1);
    if (h === 'spiky') for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const c = add(head, G('spk', () => new THREE.ConeGeometry(0.12, 0.3, 5)), hc, Math.cos(a) * 0.25, 0.5, Math.sin(a) * 0.22 - 0.05); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
    // couvre-chefs
    const hat = o.hat;
    if (hat === 'cop') { dome(head, 0.5, o.hatC, 0.14, 0.78); visor(head, 0.56, '#151f45', 0.14, 0.06); sph(head, 0.07, GOLD, 0, 0.4, 0.38, 1, 1, 0.35); }
    if (hat === 'cap' || hat === 'backcap') {
      const c = new THREE.Group(); c.position.y = 0.14; if (hat === 'backcap') c.rotation.y = Math.PI; head.add(c);
      dome(c, 0.5, o.hatC, 0, 0.72); visor(c, 0.6, darker(o.hatC, 0.75), 0, 0.12, 1.2);
    }
    if (hat === 'beanie') { dome(head, 0.5, o.hatC, 0.18, 0.85); ring(head, 0.48, 0.06, darker(o.hatC, 0.8), 0.2); if (o.pompom) sph(head, 0.12, o.pompom, 0, 0.62, 0); }
    if (hat === 'fedora' || hat === 'bowler' || hat === 'top') {
      const c = new THREE.Group(); c.position.set(0, 0.3, 0); c.rotation.z = hat === 'fedora' ? 0.12 : 0; head.add(c);
      const r = hat === 'top' ? 0.6 : 0.68;
      cyl(c, r, r, 0.05, o.hatC, 0, 0, 0);
      if (hat === 'top') cyl(c, 0.4, 0.38, 0.7, o.hatC, 0, 0.36, 0);
      else if (hat === 'bowler') dome(c, 0.42, o.hatC, 0.02, 0.9);
      else cyl(c, 0.36, 0.42, 0.36, o.hatC, 0, 0.18, 0);
      cyl(c, 0.43, 0.43, 0.09, o.bandC || '#2a1a10', 0, 0.06, 0);
    }
    if (hat === 'beret') sph(head, 0.5, o.hatC, 0.06, 0.38, -0.04, 1.05, 0.38, 1.05).rotation.z = -0.25;
    if (hat === 'bucket') { cyl(head, 0.36, 0.44, 0.32, o.hatC, 0, 0.42, 0); cyl(head, 0.62, 0.62, 0.04, o.hatC, 0, 0.27, 0); }
    if (hat === 'straw') { cyl(head, 0.85, 0.85, 0.04, '#e8cf7a', 0, 0.3, 0); cyl(head, 0.38, 0.44, 0.3, '#e8cf7a', 0, 0.45, 0); cyl(head, 0.45, 0.45, 0.08, o.hatC, 0, 0.36, 0); }
    if (hat === 'bandana') ring(head, 0.49, 0.06, o.hatC, 0.24);
    if (hat === 'hood') { sph(head, 0.56, '#ffffff', 0, 0.06, -0.12); torus(head, 0.38, 0.05, '#e6e9f2', 0, 0.02, 0.3).scale.set(1, 1.12, 1); }
    if (hat === 'hoodie') sph(head, 0.56, o.hatC, 0, 0.06, -0.14);
    if (o.headset) {
      torus(head, 0.52, 0.035, '#1d2433', 0, 0.04, 0, Math.PI);
      cyl(head, 0.13, 0.13, 0.1, '#1d2433', -0.52, 0, 0).rotation.z = Math.PI / 2; cyl(head, 0.13, 0.13, 0.1, '#1d2433', 0.52, 0, 0).rotation.z = Math.PI / 2;
      limb(head, [-0.52, -0.06, 0.05], [-0.15, -0.28, 0.42], 0.018, '#1d2433'); sph(head, 0.045, '#1d2433', -0.13, -0.28, 0.44);
    }
    if (o.earrings) { sph(head, 0.05, GOLD, -0.48, -0.16, 0); sph(head, 0.05, GOLD, 0.48, -0.16, 0); }
  }

  // ---------- tirages au hasard ----------
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const rr = (a, b) => a + Math.random() * (b - a);
  const ch = p => Math.random() < p;
  const SKINS = ['#ffdbac', '#f6d0a8', '#f2c79a', '#e0ac69', '#c68642', '#a86b3c', '#8d5524', '#6b3e1f'];
  const HAIRC = ['#1a1a1a', '#2a1a10', '#3a2414', '#5a3418', '#7a3a1a', '#a0521d', '#c8742a', '#e2b04a', '#f0d58a'];
  const GREYS = ['#9a9a9a', '#bdbdbd', '#e8e8e8'];
  const BRIGHT = ['#e85d75', '#5bc0eb', '#9bc53d', '#fde74c', '#c879ff', '#ff9f1c', '#2ec4b6', '#f25f5c', '#7d9be0', '#ff8fab', '#70c1b3', '#b56576', '#ffffff', '#3a3a3a'];
  const PANTS = ['#2a3557', '#3a5a8a', '#4a4a52', '#6a5a4a', '#2a2a2a', '#8a7a5a', '#5a6a3a', '#3a3a5a'];
  const SHOES = ['#3a2414', '#1a1a1a', '#2a2a2a', '#ffffff', '#5a3418', '#c23a3a', '#2a4a8e'];
  const SLOGANS = [
    'RENDEZ\nLE TAMPON', 'LE PIGEON\nEST INNOCENT', 'LIBÉREZ\nAMÉLIE', 'UN PV =\nUN CROISSANT',
    'DÉTACHEZ\nLES STYLOS', 'LA GAV\n0 ÉTOILE', 'PAS DE WIFI\nEN CELLULE', 'NI PV\nNI MAÎTRE',
    '3 H POUR\nUNE PLAINTE', 'PARPAING\nDÉMISSION', 'SOUS LE KÉPI\nLA PLAGE', 'LA PRIME\nOU LA VIE',
    'IGPN\nAU SECOURS', 'MON VÉLO\nEN FOURRIÈRE', 'TOUS FICHÉS\nSAUF LE PRÉFET', 'LA PHOTOCOPIEUSE\nAU POUVOIR',
    'MOINS DE PV\nPLUS DE BISOUS', 'LE CAFÉ DU\nCOMMISSARIAT\nTUE', 'RADAR =\nRACKET', 'GRÈVE !',
  ];
  const UNDER_HAT = () => rnd(['short', 'short', 'bun', 'ponytail', 'long', 'bald']);

  // une personne : peau, cheveux, pilosité, silhouette, lunettes
  function person(o, opt = {}) {
    const old = opt.old ?? ch(0.18), fem = opt.fem ?? ch(0.5);
    const hairC = old ? rnd(GREYS) : rnd(HAIRC);
    const p = {
      skin: rnd(SKINS), hairC, belly: old ? rr(0.95, 1.15) : rr(0.82, 1.14), headR: rr(0.94, 1.06), nose: rr(0.8, 1.25),
      hair: fem ? rnd(old ? ['bun', 'bob', 'short', 'curly'] : ['long', 'bun', 'ponytail', 'bob', 'curly', 'afro', 'long']) : rnd(old ? ['bald', 'bald', 'short'] : ['short', 'short', 'curly', 'spiky', 'bald', 'afro', 'pomp']),
      brows: rr(-0.15, 0.2), shoe: rnd(SHOES), blush: ch(0.3), h: old ? rr(0.88, 0.98) : rr(0.93, 1.07),
    };
    if (!fem) {
      const r = Math.random();
      if (r < 0.25) p.mustache = hairC; else if (r < 0.42) p.beard = hairC; else if (r < 0.52) p.stubble = true;
    } else { if (ch(0.35)) p.lipstick = rnd(['#c2185b', '#e53935', '#ad5a6e']); if (ch(0.3)) p.earrings = true; }
    if (ch(old ? 0.55 : 0.18)) p.glasses = rnd(['#2a2a2a', '#7a4a2a', '#c0c0c0', '#c23a6b']);
    p.mouth = rnd(['smile', 'smile', 'smile', 'none', 'open', 'frown']);
    return Object.assign(p, o);
  }

  const CAST = {
    cop() {
      const p = person({ body: rnd(['#3a5cb0', '#34539e', '#3f62b8']), legs: '#22336e', hat: ch(0.85) ? 'cop' : null, epaulettes: ch(0.6), belt: '#2a2a2a', buckle: true, shoe: '#1a1a1a' });
      if (p.hat) p.hair = UNDER_HAT();
      if (ch(0.15)) p.sunglasses = '#111111';
      return p;
    },
    suspect() {
      const p = person({ body: rnd(['#ff7b1c', '#ff8a2a', '#f26a10']), legs: rnd(['#4a4a52', '#ff7b1c', '#2a2a2a', '#3a5a8a']), pose: ch(0.75) ? 'cuffs' : 'down', mouth: rnd(['frown', 'none', 'open', 'smile']) });
      const look = rnd(['burglar', 'hoodie', 'cap', 'bare', 'bare', 'stripes']);
      if (look === 'burglar') Object.assign(p, { hat: 'beanie', hatC: '#3a3a42', bandeau: true, stubble: true, hair: 'short' });
      if (look === 'hoodie') Object.assign(p, { hat: 'hoodie', hatC: darker(p.body, 0.85), hair: null });
      if (look === 'cap') Object.assign(p, { hat: rnd(['cap', 'backcap']), hatC: rnd(['#1a1a1a', '#d62828', '#2a4a8e', '#ffffff']), hair: UNDER_HAT() });
      if (look === 'stripes') Object.assign(p, { stripes: '#1a1a1a', body: '#ffffff', hat: 'beanie', hatC: '#1a1a1a', bandeau: true });
      if (ch(0.3) && !p.bandeau) p.sunglasses = '#111111';
      return p;
    },
    inv() {
      const coat = rnd(['#a8743f', '#c8a26a', '#8a7a6a', '#5a4a3a', '#6a6a72']);
      const p = person({ body: coat, legs: rnd(['#4a3a2e', '#2a2a2a', '#3a3a44']), long: true, collar: darker(coat, 0.8), tie: rnd([TIE, '#2a4a8e', '#1a1a1a', '#5a8a3a', null]), belt: darker(coat, 0.8), item: rnd(['notebook', 'notebook', 'mug', 'phone']), brows: rr(0.15, 0.4) });
      p.hat = rnd(['fedora', 'fedora', 'bowler', null, null]); p.hatC = rnd([FELT, '#3a3a3a', '#6a5a4a']);
      if (p.hat) p.hair = UNDER_HAT();
      return p;
    },
    pts() {
      const p = person({ body: '#f4f6fb', legs: '#e6e9f2', shoe: GLOVE, gloves: GLOVE, zip: true, hat: 'hood', mask: ch(0.6), gasMask: true, backLogo: true, item: rnd(['brush', 'brush', 'notebook', 'phone']), mustache: null, beard: null, stubble: false });
      if (ch(0.35)) p.glasses = rnd(['#2a2a2a', '#c0c0c0']);
      p.hair = null; p.earrings = false;
      return p;
    },
    acc() {
      const p = person({ body: rnd(['#7fb0ff', '#8ab8ff', '#a8c8f0']), legs: '#22336e', hat: ch(0.5) ? 'cop' : null, hatC: '#2a4a8e', badge: GOLD, item: rnd(['mug', 'mug', 'papers', 'phone', null]), mugC: rnd(['#ffffff', '#d62828', '#ffd23f', '#2ec4b6']) });
      if (p.hat) p.hair = UNDER_HAT();
      if (ch(0.3)) p.headset = true;
      return p;
    },
    pla() {
      const p = person({ body: rnd(['#2c3f86', '#6a3a5a', '#3a6a5a', '#8a5a2a', '#5a5a6a']), legs: rnd(PANTS), collar: rnd(['#e8eef8', '#ffffff', '#f2e8d8']), item: rnd(['papers', 'papers', 'mug', 'notebook']), glasses: rnd(['#2a2a2a', '#7a4a2a', '#c0c0c0', null]) });
      if (ch(0.3)) p.scarf = rnd(BRIGHT);
      return p;
    },
    clean() {
      const suit = rnd(['#3fae5a', '#3a9ad8', '#3fae5a']);
      const p = person({ body: suit, legs: darker(suit, 0.8), shoe: '#2a2a2a', bib: darker(suit, 0.8), gloves: rnd(['#ffd23f', '#ff6fa8', '#5aa8ff']), item: rnd(['broom', 'mop', 'broom']) });
      p.hat = rnd(['cap', 'bandana', null, 'bucket']); p.hatC = darker(suit, 0.6);
      if (p.hat === 'cap' || p.hat === 'bucket') p.hair = UNDER_HAT();
      return p;
    },
    avocat() {
      const p = person({ body: '#1a1a1e', legs: '#1a1a1e', shoe: '#0e0e10', robe: true, rabat: true, item: rnd(['briefcase', 'briefcase', 'papers', 'phone']), caseC: rnd(['#5a3a22', '#1a1a1a', '#8a2a2a']), brows: rr(-0.2, 0.1), mouth: rnd(['smile', 'none']) });
      if (ch(0.4)) p.glasses = rnd(['#2a2a2a', GOLD]);
      return p;
    },
    interp() {
      const p = person({ body: rnd(['#ffd23f', '#ffc93c', '#ffe066']), legs: rnd(PANTS), headset: true, item: rnd(['notebook', null, 'mug']) });
      if (ch(0.4)) p.scarf = rnd(BRIGHT);
      return p;
    },
    vip() {
      const look = rnd(['gold', 'pink', 'white', 'leopard', 'rock']);
      const p = person({ sunglasses: rnd(['#111111', '#c2185b', '#2a4a8e', GOLD]), mouth: 'smile' });
      if (look === 'gold') Object.assign(p, { body: '#ffc93c', sleeve: '#ffb000', legs: '#ffffff', shoe: '#ffffff', chain: true, hair: 'pomp' });
      if (look === 'pink') Object.assign(p, { body: '#ff6fa8', dress: true, boa: '#ffb3d1', hair: rnd(['long', 'bob']), hairC: rnd(['#f0d58a', '#ffffff', '#ff6fa8']), lipstick: '#c2185b', earrings: true, mustache: null, beard: null, stubble: false });
      if (look === 'white') Object.assign(p, { body: '#ffffff', legs: '#ffffff', shoe: GOLD, chain: true, hat: 'top', hatC: '#ffffff', bandC: GOLD, hair: UNDER_HAT() });
      if (look === 'leopard') Object.assign(p, { body: '#e0a040', stripes: '#3a2414', legs: '#1a1a1a', boa: '#1a1a1a', hair: rnd(['afro', 'curly', 'long']) });
      if (look === 'rock') Object.assign(p, { body: '#1a1a1a', legs: '#2a2a2a', vest: '#5a1a1a', chain: true, hair: rnd(['mohawk', 'spiky', 'long']), hairC: rnd(['#d62828', '#3a78d8', '#1a1a1a', '#f0d58a']) });
      if (ch(0.3)) p.pose = 'wave';
      return p;
    },
    papa() {
      const p = person({ body: rnd(['#3a3a3a', '#5a5a52', '#4a4a3a', '#2a3a4a']), legs: rnd(PANTS), pose: 'camera', zoom: ch(0.5), vest: ch(0.6) ? rnd(['#c8b48a', '#6a6a4a', '#8a7a5a']) : null });
      p.hat = rnd(['beret', 'cap', 'backcap', 'bucket', null]); p.hatC = rnd(['#1a1a1a', '#5a4a3a', '#2a4a8e', '#8a2a2a']);
      if (p.hat) p.hair = UNDER_HAT();
      return p;
    },
    demo() {
      const p = person({ body: rnd(BRIGHT), legs: rnd(PANTS), mouth: rnd(['open', 'open', 'frown', 'smile']), brows: rr(0.15, 0.4) });
      p.pose = rnd(['sign', 'sign', 'sign', 'flag', 'megaphone']);
      if (p.pose === 'sign') {
        p.sign = rnd(SLOGANS);
        [p.signBg, p.signFg] = rnd([['#fffdf2', '#d62828'], ['#ffd23f', '#1a1a1a'], ['#ffffff', '#2a4a8e'], ['#d62828', '#ffffff']]);
      }
      if (p.pose === 'flag') p.flag = rnd(['#d62828', '#2a4a8e', '#3fae5a', '#ffd23f', '#1a1a1a']);
      p.hat = rnd(['backcap', 'bandana', 'beanie', 'bucket', null, null]); p.hatC = rnd(BRIGHT); if (ch(0.4)) p.pompom = rnd(BRIGHT);
      if (p.hat && p.hat !== 'bandana') p.hair = UNDER_HAT();
      if (ch(0.35)) { p.vest = '#e8f040'; p.vestStripe = '#d0d0d0'; }
      if (ch(0.25)) p.scarf = rnd(BRIGHT);
      if (ch(0.2)) p.backpack = rnd(BRIGHT);
      return p;
    },
    civ() {
      const kind = rnd(['adult', 'adult', 'adult', 'old', 'old', 'teen', 'kid', 'tourist']), fem = ch(0.5);
      const p = person({ body: rnd(BRIGHT), legs: rnd(PANTS) }, { old: kind === 'old', fem });
      if (fem && ch(0.35)) p.dress = true;
      if (ch(0.3)) p.sleeve = rnd(BRIGHT);
      if (ch(0.15)) p.stripes = rnd(['#ffffff', '#1a1a1a', '#2a4a8e']);
      if (ch(0.2)) p.scarf = rnd(BRIGHT);
      if (kind === 'old') {
        p.body = rnd(['#8a7a6a', '#6a7a5a', '#a87a8a', '#7a8aa8', '#c8b48a', '#5a5a6a']); p.collar = rnd(['#ffffff', '#e8e0d0']);
        p.item = rnd(['cane', 'cane', 'shopping', 'bag', 'umbrella', 'baguette']);
        p.hat = fem ? rnd([null, null, 'straw', 'beret']) : rnd([null, 'beret', 'fedora', 'bowler']);
        p.hatC = rnd(['#5a4a3a', '#2a2a2a', '#8a2a3a', '#2a4a8e']);
      } else if (kind === 'teen') {
        p.item = rnd(['phone', 'phone', 'icecream', null]); p.iceC = rnd(['#ffb3c1', '#b3e0ff', '#fff2a8', '#8a5a3a']);
        p.hat = rnd(['backcap', 'cap', 'hoodie', 'beanie', null]); p.hatC = rnd(BRIGHT);
        if (ch(0.4)) p.backpack = rnd(BRIGHT);
        p.mustache = null; p.beard = null;
      } else if (kind === 'kid') {
        Object.assign(p, { item: rnd(['icecream', null, null]), iceC: rnd(['#ffb3c1', '#b3e0ff', '#fff2a8']), mustache: null, beard: null, stubble: false, lipstick: null, glasses: ch(0.1) ? '#c23a6b' : null, blush: true, scale: rr(0.62, 0.75), headR: 1.12, mouth: 'smile' });
        if (ch(0.3)) p.backpack = rnd(BRIGHT);
      } else if (kind === 'tourist') {
        p.body = rnd(['#ff6fa8', '#5bc0eb', '#fde74c', '#ffffff']); p.stripes = ch(0.5) ? rnd(['#2ec4b6', '#ff9f1c', '#e85d75']) : null;
        p.hat = rnd(['straw', 'bucket', 'cap']); p.hatC = rnd(BRIGHT);
        p.item = rnd(['suitcase', 'phone', 'icecream']); p.caseC = rnd(BRIGHT);
        if (ch(0.5)) p.sunglasses = '#111111';
        if (ch(0.4)) p.backpack = rnd(BRIGHT);
      } else {
        p.item = rnd(['bag', 'phone', 'shopping', 'baguette', 'umbrella', null, null]); p.bagC = rnd(BRIGHT); p.umbC = rnd(BRIGHT);
        if (ch(0.25)) { p.hat = rnd(['cap', 'beanie', 'beret', 'bucket']); p.hatC = rnd(BRIGHT); }
        if (ch(0.15)) p.pose = 'wave';
      }
      if (p.hat && p.hat !== 'hoodie' && !['short', 'bald', 'bun', 'ponytail', 'long'].includes(p.hair)) p.hair = UNDER_HAT();
      if (p.hat === 'hoodie') p.hair = null;
      return p;
    },
  };

  // ---------- fusion : un maillage à couleurs de sommets par couche ----------
  function merge(list) {
    let nv = 0, ni = 0;
    const parts = list.map(m => {
      const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
      nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count;
      return { g, c: new THREE.Color(m.userData.c) };
    });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const { g, c } of parts) {
      const p = g.attributes.position, n = g.attributes.normal;
      pos.set(p.array, vo * 3); nor.set(n.array, vo * 3);
      for (let i = 0; i < p.count; i++) { col[(vo + i) * 3] = c.r; col[(vo + i) * 3 + 1] = c.g; col[(vo + i) * 3 + 2] = c.b; }
      if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; }
      else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
      vo += p.count; g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  function build(kind) {
    const o = (CAST[kind] || CAST.civ)();
    const root = new THREE.Group(), s = SCALE * (o.scale || 1);
    root.scale.set(s, s * (o.h || 1), s);
    settler(root, o);
    root.updateMatrixWorld(true);
    const layers = {}, tex = [];
    root.traverse(m => {
      if (!m.isMesh) return;
      if (m.userData.tex) tex.push({ geo: m.geometry.clone().applyMatrix4(m.matrixWorld), mat: m.userData.tex });
      else (layers[m.userData.layer] = layers[m.userData.layer] || []).push(m);
    });
    const v = { tex };
    for (const k in layers) v[k] = merge(layers[k]);
    return v;
  }

  const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const FLASH = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const PUFF = [0, 1, 2, 3].map(i => new THREE.MeshBasicMaterial({ color: i % 2 ? '#8ad13a' : '#5fbf2a', transparent: true, opacity: 0.7, depthWrite: false }));
  const PUFF_GEO = new THREE.IcosahedronGeometry(0.09, 1);
  const pools = {};
  // Un bonhomme : une variante tirée au hasard (les POOL premières sont toutes différentes, ensuite on réutilise)
  function figure(kind) {
    const pool = pools[kind] || (pools[kind] = []), n = kind === 'civ' || kind === 'demo' ? POOL * 2 : POOL;
    const v = pool.length < n ? (pool.push(build(kind)), pool[pool.length - 1]) : pool[Math.floor(Math.random() * pool.length)];
    const g = new THREE.Group();
    const body = new THREE.Mesh(v.body, MAT); body.castShadow = true; body.receiveShadow = true; g.add(body);
    for (const t of v.tex) g.add(new THREE.Mesh(t.geo, t.mat));
    if (v.mask) { const m = new THREE.Mesh(v.mask, MAT); m.visible = false; g.add(m); g.userData.mask = m; }
    if (v.flash) { const m = new THREE.Mesh(v.flash, FLASH); m.visible = false; g.add(m); g.userData.flash = m; }
    if (v.swing) { const m = new THREE.Mesh(v.swing, MAT); m.castShadow = true; g.add(m); g.userData.swing = m; }
    if (kind === 'suspect') { // odeur de pieds : bouffées vertes, montrées par la vie du commissariat
      const p = new THREE.Group(); p.visible = false; g.add(p); g.userData.puffs = p;
      for (let i = 0; i < 4; i++) { const q = new THREE.Mesh(PUFF_GEO, PUFF[i]); q.userData.k = i / 4; p.add(q); }
    }
    return g;
  }
  // anime toutes les bouffées visibles (mêmes matériaux partagés : on règle l'opacité une fois)
  function puffs(list, t) {
    PUFF.forEach((m, i) => { m.opacity = 0.75 * (1 - ((t * 0.4 + i / 4) % 1)) ** 0.8; });
    for (const f of list) {
      const p = f.userData.puffs; if (!p || !p.visible || !f.visible) continue;
      p.children.forEach((q, i) => {
        const k = (t * 0.4 + q.userData.k) % 1, side = i % 2 ? 1 : -1;
        q.position.set(side * (0.1 + k * 0.15 + Math.sin(k * 9 + i) * 0.06), 0.02 + k * 0.75, 0.08 + Math.cos(k * 7 + i) * 0.06);
        q.scale.setScalar(0.6 + k * 1.8);
      });
    }
  }

  S.figure = figure;
  S.people = { puffs };
})();
