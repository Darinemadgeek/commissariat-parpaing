// Le commissariat : un bâtiment en coupe (on voit dans les pièces), une tour administrative
// qui grandit avec les paliers, une cour des véhicules. Reconstruit à chaque mutation : la forme,
// les pièces, les murs et les trajets viennent du plan du lieu (scene-plans.js).
(function () {
  const { THREE, scene, mat, box, cyl, ball, flat, sign, figure } = S;
  const ST = {
    stone: { wall: '#e6d8bb', trim: '#8a6d4a', acc: '#2346a8', lot: '#d8cfba', facade: 'ferme' },
    classic: { wall: '#eef2fb', trim: '#1b2a5c', acc: '#3d6fd6', lot: '#cfd4dc', facade: 'haussmann' },
    modern: { wall: '#dfe4ea', trim: '#1f7a8c', acc: '#3d7bff', lot: '#c9ced6', facade: 'beton' },
    glass: { wall: '#c9d6e6', trim: '#22304d', acc: '#5aa9ff', lot: '#9aa3b0', facade: 'verre' },
    bunker: { wall: '#b8bcc2', trim: '#2b2f36', acc: '#ffc93c', lot: '#a9aeb5', facade: 'beton' },
    beach: { wall: '#fdf6e9', trim: '#2a9d8f', acc: '#ff9f1c', lot: '#f2e3c4', facade: 'pastelB' },
    chalet: { wall: '#e2c39c', trim: '#6b4a3a', acc: '#e63946', lot: '#e9eef5', facade: 'ferme' },
    airport: { wall: '#e8edf3', trim: '#3a4152', acc: '#3d7bff', lot: '#b8bec8', facade: 'verre' },
    fest: { wall: '#fff3e6', trim: '#7b2cbf', acc: '#ff4b5c', lot: '#d9cbb8', facade: 'pastelC' },
    palace: { wall: '#efe3c8', trim: '#7a5a2a', acc: '#c9a227', lot: '#d6cfbf', facade: 'haussmann' },
  };
  const gyR = mat('#ff4b5c', { emissive: '#ff2030', emissiveIntensity: 1 });
  const gyB = mat('#3d7bff', { emissive: '#2050ff', emissiveIntensity: 1 });
  const lampB = mat('#9cc2ff', { emissive: '#3d7bff', emissiveIntensity: 1.2 });
  const scrOff = mat('#1d2433');
  const goldM = mat('#ffc93c', { metalness: 0.6, roughness: 0.35, emissive: '#6b4a00', emissiveIntensity: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#9fd3ff', transparent: true, opacity: 0.35, roughness: 0.1 });
  const Y = 0.2; // dessus de la dalle

  function cut(a0, a1, gaps) {
    let s = [[a0, a1]];
    for (const [g0, g1] of gaps || []) s = s.flatMap(([a, b]) => (g1 <= a || g0 >= b ? [[a, b]] : [[a, g0], [g1, b]].filter(([u, v]) => v - u > 0.05)));
    return s;
  }
  const wallX = (p, z, x0, x1, h, t, c, gaps, y) => cut(x0, x1, gaps).forEach(([a, b]) => box(p, +(b - a).toFixed(2), h, t, c, (a + b) / 2, y === undefined ? Y : y, z));
  const wallZ = (p, x, z0, z1, h, t, c, gaps, y) => cut(z0, z1, gaps).forEach(([a, b]) => box(p, t, h, +(b - a).toFixed(2), c, x, y === undefined ? Y : y, (a + b) / 2));
  const seat = (p, kind, x, z, ry, y) => { const f = figure(kind); f.position.set(x, y === undefined ? Y : y, z); f.rotation.y = ry || 0; p.add(f); return f; };
  const darker = (col, k = 0.82) => '#' + new THREE.Color(col).multiplyScalar(k).getHexString();
  const tree = (p, x, z, s = 1) => { cyl(p, 0.18 * s, 0.24 * s, 1.6 * s, 6, '#8a5a32', x, 0.1, z); ball(p, 1.2 * s, '#6fbf4a', x, 2.4 * s, z, 1); ball(p, 0.8 * s, '#8ad05a', x + 0.6 * s, 2.9 * s, z + 0.3 * s, 1); };
  // décors des plans : potager, jardin, cour d'honneur, atrium, garage, tarmac
  function decor(b, dc, c) {
    const [x0, z0, x1, z1] = dc.r, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (dc.kind === 'potager') {
      flat(b, w, d, '#8a6a42', cx, 0.12, cz);
      for (let i = 0; i < Math.floor(d / 2.2); i++) for (let j = 0; j < Math.floor(w / 1.6); j++) ball(b, 0.45, ['#7ec850', '#6fb848', '#a8d878'][(i + j) % 3], x0 + 0.8 + j * 1.6, 0.4, z0 + 1.1 + i * 2.2, 1);
    } else if (dc.kind === 'garden' || dc.kind === 'atrium') {
      flat(b, w, d, '#7fc45a', cx, Y + 0.006, cz);
      ball(b, 1.6, '#4f9a3a', x0 + 1.8, 0.9, z0 + 1.8, 1).scale.set(1, 0.6, 1);
      tree(b, cx - w / 4, cz, dc.kind === 'atrium' ? 1.1 : 1); tree(b, cx + w / 4, cz + d / 5, 0.9);
      cyl(b, 1, 1.1, 0.5, 14, '#e2dacb', cx, Y, cz); flat(b, 1.7, 1.7, '#6ac0e8', cx, Y + 0.52, cz);
    } else if (dc.kind === 'court') {
      flat(b, w, d, '#d9cfbd', cx, 0.12, cz);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tree(b, cx + dx * w / 3.2, cz + dz * d / 3.4, 0.9);
      cyl(b, 1.8, 2, 0.6, 16, '#efe6d6', cx, 0.1, cz); flat(b, 3.2, 3.2, '#6ac0e8', cx, 0.72, cz); cyl(b, 0.3, 0.4, 1.6, 8, '#efe6d6', cx, 0.6, cz);
    } else if (dc.kind === 'garage') {
      flat(b, w, d, '#e6ecf6', cx, 0.12, cz);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(b, 0.3, 3, 0.3, '#7a4a2a', cx + dx * (w / 2 - 0.4), 0.1, cz + dz * (d / 2 - 0.4));
      box(b, w + 0.6, 0.3, d + 0.6, '#f8faff', cx, 3.1, cz);
      for (let i = 0; i < 2; i++) { const sx = cx - 2 + i * 4; box(b, 1.1, 0.6, 2.4, ['#e63946', '#3d6fd6'][i], sx, 0.35, cz); box(b, 0.9, 0.5, 0.8, '#1b1f2a', sx, 0.95, cz - 0.3); box(b, 1.4, 0.08, 0.4, '#c7ccd4', sx, 0.2, cz + 1.4); }
    } else if (dc.kind === 'tarmac') {
      flat(b, w, d, '#6d7077', cx, 0.12, cz);
      for (let i = 0; i < Math.floor(d / 3); i++) flat(b, w - 1, 0.18, '#ffd23f', cx, 0.13, z0 + 1.5 + i * 3);
      for (let i = 0; i < 3; i++) box(b, 1.4, 0.5, 2, '#8a8f98', cx - 2 + i * 2, 0.1, cz); box(b, 1.4, 1, 1.8, '#ffd23f', cx - 4.2, 0.1, cz);
    }
  }
  function grp(p, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g); return g; }

  function cellAt(p, x, z, ry, wallC) {
    const g = grp(p, x, z, ry);
    box(g, 2.3, 1.6, 0.14, wallC, 0, Y, -1.08); box(g, 0.14, 1.6, 2.3, wallC, -1.08, Y, 0); box(g, 0.14, 1.6, 2.3, wallC, 1.08, Y, 0);
    for (let b = 0; b < 7; b++) cyl(g, 0.035, 0.035, 1.6, 5, '#30343c', -0.9 + b * 0.3, Y, 1.08);
    box(g, 2.3, 0.1, 0.12, '#30343c', 0, Y + 1.6, 1.08);
    box(g, 1.9, 0.38, 0.45, '#9b7b5a', 0, Y, -0.75);
    const figs = [];
    for (let j = 0; j < 4; j++) { const f = seat(g, 'suspect', -0.55 + (j % 2) * 1.1 + (j > 1 ? 0.25 : 0), j > 1 ? 0.35 : -0.6, (Math.random() - 0.5) * 0.8); f.visible = false; figs.push(f); }
    const vip = seat(g, 'vip', 0.3, 0.45, Math.PI * 0.9); vip.visible = false; // une star en lunettes noires
    g.userData = { figs, vip }; g.visible = false;
    return g;
  }

  let root = null;
  function build(style, siteName) {
    if (root) scene.remove(root);
    const c = ST[style] || ST.classic, R = {};
    root = new THREE.Group(); scene.add(root);
    const b = root;

    const P = PLANS[PLAN_OF_STYLE[style] || 'ville'] || PLANS.ville;
    const SIDE = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }, ROT = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };
    const inR = (r, x, z, m = 0) => x > r[0] + m && x < r[2] - m && z > r[1] + m && z < r[3] - m;
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const indoor = [...P.rooms.map(o => o.r), ...(P.corr || [])];
    const yAt = (x, z) => (indoor.some(r => inR(r, x, z, -0.05)) || (P.ext && inR(P.ext, x, z)) ? Y : (P.out || []).some(r => inR(r, x, z, -0.05)) ? 0.12 : 0.06);
    const wallC = k => (P.containers ? { hall: '#ff6fa8', pla: '#3fb8a0', pts: '#ffd23f', inv: '#ff7b1c', gav: '#3d6fd6', boss: '#7b2cbf' }[k] : P.wood ? '#c8955a' : c.wall);
    // repère local d'une pièce : +z local = côté de la porte (ou de l'entrée pour l'accueil)
    function frame(o) {
      const s = o.ent || o.door, [x0, z0, x1, z1] = o.r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, th = ROT[s];
      const w = s === 'N' || s === 'S' ? x1 - x0 : z1 - z0, d = s === 'N' || s === 'S' ? z1 - z0 : x1 - x0;
      const toW = (lx, lz) => [cx + lx * Math.cos(th) + lz * Math.sin(th), cz - lx * Math.sin(th) + lz * Math.cos(th)];
      return { s, cx, cz, th, w, d, toW };
    }
    function doorOf(o, side, at, w) {
      const [x0, z0, x1, z1] = o.r, a = at !== undefined ? at : (side === 'N' || side === 'S' ? (x0 + x1) / 2 : (z0 + z1) / 2);
      const p = { N: [a, z0], S: [a, z1], W: [x0, a], E: [x1, a] }[side], n = SIDE[side];
      return { x: p[0], z: p[1], axis: side === 'N' || side === 'S' ? 'x' : 'z', w: w || 2.2, n, side, at: a };
    }
    const doors = [];
    for (const o of P.rooms) {
      o.f = frame(o);
      o.dr = doorOf(o, o.door, o.at); doors.push(o.dr);
      if (o.ent && o.ent !== o.door) { o.en = doorOf(o, o.ent, undefined, 3.6); doors.push(o.en); } else if (o.k === 'hall') o.en = o.dr;
    }
    for (const [x, z, axis, w] of P.doors || []) doors.push({ x, z, axis, w });
    const room = k => P.rooms.find(o => o.k === k);
    const isDoor = (axis, line, a) => doors.some(d => d.axis === axis && Math.abs((axis === 'x' ? d.z : d.x) - line) < 0.3 && Math.abs((axis === 'x' ? d.x : d.z) - a) < d.w / 2);

    // ---------- terrain, clôture, cour des véhicules ----------
    const portal = P.portal || [room('hall').en.x, room('hall').en.z + 0.6];
    const gx = Math.max(-16, Math.min(16, portal[0]));
    box(b, 56, 0.1, 44, c.lot, 0, 0, -6);
    flat(b, 22, 14, '#5a5f6e', 15, 0.11, -20.5);
    for (let i = 0; i < 8; i++) flat(b, 0.12, 4, '#ffffff', 5.5 + i * 2.6, 0.12, -25);
    const fence = (x0, z0, x1, z1, gaps) => {
      const horiz = z0 === z1, L = horiz ? x1 - x0 : z1 - z0;
      (horiz ? wallX : wallZ)(b, horiz ? z0 : x0, horiz ? x0 : z0, horiz ? x1 : z1, 0.5, 0.35, c.trim, gaps, 0.05);
      for (let k = 0; k <= L; k += 2.5) {
        const x = horiz ? x0 + k : x0, z = horiz ? z0 : z0 + k;
        if ((gaps || []).some(([g0, g1]) => (horiz ? x : z) > g0 - 0.2 && (horiz ? x : z) < g1 + 0.2)) continue;
        cyl(b, 0.05, 0.05, 1.3, 5, '#30343c', x, 0.55, z);
      }
    };
    fence(-28, 16, 28, 16, [[gx - 10, gx + 10]]); fence(-28, -28, 28, -28, [[9, 21]]); fence(-28, -28, -28, 16); fence(28, -28, 28, 16);
    box(b, 10, 0.18, 0.18, '#e63946', 15, 1.0, -28.2); for (let i = 0; i < 4; i++) box(b, 1.2, 0.2, 0.2, '#ffffff', 11 + i * 2.6, 1.0, -28.2);

    // ---------- sols : dalles des pièces et couloirs, allées extérieures, décors ----------
    const FLOOR = { hall: '#f1e9da', pla: '#e8d3b0', pts: '#e3ecf8', inv: '#b9c6dd', gav: '#c3c7cd', boss: '#a8323e' };
    for (const r of indoor) box(b, r[2] - r[0], Y, r[3] - r[1], '#9aa0aa', (r[0] + r[2]) / 2, 0, (r[1] + r[3]) / 2);
    for (const o of P.rooms) flat(b, o.r[2] - o.r[0], o.r[3] - o.r[1], FLOOR[o.k], o.f.cx, Y + 0.005, o.f.cz);
    for (const r of P.corr || []) flat(b, r[2] - r[0], r[3] - r[1], P.corrColor || '#d8dbe0', (r[0] + r[2]) / 2, Y + 0.005, (r[1] + r[3]) / 2);
    const GROUND = { gravel: '#d9c79e', planks: '#c79a62', plaza: '#6e6888' };
    for (const r of P.out || []) {
      const w = r[2] - r[0], d = r[3] - r[1];
      flat(b, w, d, GROUND[P.ground] || '#d8d2c4', (r[0] + r[2]) / 2, 0.12, (r[1] + r[3]) / 2);
      if (P.ground === 'planks') { const along = w > d; for (let k = 1; k < (along ? w : d) / 0.9; k++) flat(b, along ? 0.06 : w, along ? d : 0.06, '#9a7244', along ? r[0] + k * 0.9 : (r[0] + r[2]) / 2, 0.125, along ? (r[1] + r[3]) / 2 : r[1] + k * 0.9); }
    }
    for (const dc of P.deco || []) decor(b, dc, c);

    // ---------- murs générés : extérieurs hauts avec fenêtres, cloisons basses, portes ----------
    const EH = 2.1, IH = 1.4, T = P.thick || 0.3;
    const rects = [...P.rooms.map((o, i) => ({ r: o.r, kind: 'room', i, k: o.k })), ...(P.corr || []).map(r => ({ r, kind: 'corr' }))];
    const glassDeco = (P.deco || []).filter(dc => dc.glass).map(dc => dc.r);
    function edgeType(self, x, z, n) {
      const qx = x + n[0] * 0.35, qz = z + n[1] * 0.35;
      for (const o of rects) if (o !== self && inR(o.r, qx, qz)) {
        if (o.kind === 'room') return self.kind === 'room' ? (self.i < o.i ? 'in' : null) : null;
        return self.kind === 'room' ? 'in' : null;
      }
      if (glassDeco.some(r => inR(r, qx, qz))) return 'glass';
      return 'ext';
    }
    const runs = [];
    for (const o of rects) {
      const [x0, z0, x1, z1] = o.r;
      for (const [ax, line, a0, a1, n] of [['x', z0, x0, x1, SIDE.N], ['x', z1, x0, x1, SIDE.S], ['z', x0, z0, z1, SIDE.W], ['z', x1, z0, z1, SIDE.E]]) {
        let cur = null;
        const flush = () => { if (cur) runs.push(cur); cur = null; };
        for (let a = a0; a < a1 - 1e-6; a += 0.25) {
          const m = Math.min(a + 0.125, a1), x = ax === 'x' ? m : line, z = ax === 'x' ? line : m;
          let t = edgeType(o, x, z, n);
          if (t && isDoor(ax, line, m)) t = 'door';
          const col = o.kind === 'room' ? wallC(o.k) : c.wall;
          if (cur && cur.t === t && cur.col === col) cur.a1 = Math.min(a + 0.25, a1);
          else { flush(); if (t && t !== 'door') cur = { t, ax, line, a0: a, a1: Math.min(a + 0.25, a1), n, col }; else if (t === 'door') runs.push({ t: 'door', ax, line, a0: a, a1: a + 0.25, n }); }
        }
        flush();
      }
    }
    R.walls = runs.filter(w => w.t !== 'door'); // gardés pour vérifier les trajets
    for (const w of runs) {
      if (w.t === 'door') continue;
      const L = w.a1 - w.a0, mid = (w.a0 + w.a1) / 2;
      const put = (h, th, col, y) => (w.ax === 'x' ? box(b, L, h, th, col, mid, y, w.line) : box(b, th, h, L, col, w.line, y, mid));
      if (w.t === 'in') { put(IH, 0.16, w.col, Y); continue; }
      if (w.t === 'glass') { const g = put(1.8, 0.08, glass, Y); g.castShadow = false; continue; }
      put(EH, T, w.col, Y); put(0.22, T + 0.12, c.trim, Y + EH);
      if (L < 2.5) continue;
      // fenêtres sur la face extérieure (meurtrières pour le bunker)
      const off = T / 2 + 0.03, pw = P.slits ? 0.9 : 2.0, ph = P.slits ? 0.22 : 0.9, py = P.slits ? Y + 1.5 : Y + 0.9;
      for (let a = w.a0 + 1.8; a < w.a1 - 1.6; a += P.slits ? 4 : 4.5) {
        const px = w.ax === 'x' ? a : w.line + w.n[0] * off, pz = w.ax === 'x' ? w.line + w.n[1] * off : a;
        if (doors.some(d => Math.hypot(d.x - px, d.z - pz) < d.w / 2 + 1.4)) continue;
        w.ax === 'x' ? box(b, pw, ph, 0.06, glass, px, py, pz) : box(b, 0.06, ph, pw, glass, px, py, pz);
      }
    }
    // poteaux aux angles extérieurs et encadrements des portes : un contour plus « maquette »
    for (const w of runs) if (w.t === 'ext') for (const a of [w.a0, w.a1]) { const x = w.ax === 'x' ? a : w.line, z = w.ax === 'x' ? w.line : a; box(b, T + 0.35, EH + 0.35, T + 0.35, c.trim, x, 0, z); }
    if (P.containers) for (const o of P.rooms) { const [x0, z0, x1, z1] = o.r; for (let x = x0 + 1.2; x < x1 - 0.6; x += 1.2) { box(b, 0.08, EH, 0.12, darker(wallC(o.k)), x, Y, z1 + 0.17); box(b, 0.08, EH, 0.12, darker(wallC(o.k)), x, Y, z0 - 0.17); } }

    // ---------- entrée : portail monumental (ou porche de la cour) ----------
    const pg = grp(b, portal[0], portal[1]);
    box(pg, 1.1, 5.2, 1.1, c.wall, -5.6, 0, 0); box(pg, 1.1, 5.2, 1.1, c.wall, 5.6, 0, 0);
    box(pg, 12.4, 1.5, 1.3, c.trim, 0, 5.2, 0);
    sign(pg, 'POLICE', 7, 1.1, c.trim, '#ffffff', 0, 5.95, 0.66);
    sign(pg, (P.gate ? 'GENDARMERIE DE ' : 'COMMISSARIAT DE ') + siteName.toUpperCase(), 9, 0.42, '#ffffff', c.trim, 0, 4.85, 0.67);
    box(pg, 0.5, 0.5, 0.5, lampB, -5.6, 5.2, 0.7); box(pg, 0.5, 0.5, 0.5, lampB, 5.6, 5.2, 0.7);
    if (!P.gate) { const canopy = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 2.4), glass); canopy.position.set(0, 3.6, -0.6); pg.add(canopy); }
    const front = Math.min(15.4, portal[1] + 3.4);
    flat(b, 20, Math.max(1, 16 - portal[1]), '#e9e4d8', gx, 0.11, (portal[1] + 16) / 2);
    [-9.5, -8.2].forEach((dx, i) => { const x = portal[0] + dx; cyl(b, 0.06, 0.07, 6.5, 6, '#dfe3ea', x, 0.1, front); ['#2346a8', '#ffffff', '#e63946'].forEach((col, k) => box(b, 0.5, 1.0, 0.05, col, x + 0.3 + k * 0.5, 5.3 - i * 0.2, front)); });

    // ---------- contenu de chaque pièce, dans son repère ----------
    const fill = (w, d, sx, sz, max, front = 1.4) => { // grille la plus remplie qui tient dans la pièce
      let best = null;
      for (let cols = 1; cols <= max; cols++) {
        const rows = Math.min(Math.ceil(max / cols), Math.floor((d - front - 0.5) / sz));
        if (cols * sx > w - 1.0 || rows < 1) continue;
        const n = Math.min(max, cols * rows);
        if (!best || n > best.n || (n === best.n && Math.abs(cols * sx - rows * sz) < Math.abs(best.cols * sx - best.rows * sz))) best = { cols, rows, n };
      }
      const out = []; if (!best) return out;
      for (let i = 0; i < best.n; i++) { const cI = i % best.cols, rI = Math.floor(i / best.cols); out.push([(cI - (best.cols - 1) / 2) * sx, -d / 2 + 0.5 + sz / 2 + rI * sz]); }
      return out;
    };
    const G = {};
    for (const o of P.rooms) G[o.k] = grp(b, o.f.cx, o.f.cz, o.f.th);
    const F = k => room(k).f;
    const doorLocal = o => { const d = o.dr, f = o.f; const lx = { S: d.at - f.cx, N: -(d.at - f.cx), E: -(d.at - f.cz), W: d.at - f.cz }[f.s]; return lx; };

    // Accueil
    const H = F('hall'), hg = G.hall;
    R.acc = grp(hg, 0, 0);
    R.guichets = [];
    const ng = Math.max(2, Math.min(6, Math.floor((H.w - 2.4) / 1.85))), cz = -H.d / 2 + 2.3;
    box(R.acc, ng * 1.85 + 0.5, 1.0, 0.7, '#ffffff', 0, Y, cz); box(R.acc, ng * 1.85 + 0.7, 0.08, 0.9, c.acc, 0, Y + 1.0, cz);
    for (let i = 0; i < ng; i++) { const f = seat(R.acc, 'acc', (i - (ng - 1) / 2) * 1.85, cz - 0.9, 0); f.visible = false; R.guichets.push({ f }); }
    const qz = Math.min(cz + 3.4, H.d / 2 - 1.4);
    for (let k = 0; k < ng; k++) cyl(R.acc, 0.05, 0.06, 0.9, 6, '#c9a227', (k - (ng - 1) / 2) * 1.85, Y, qz);
    box(R.acc, (ng - 1) * 1.85, 0.05, 0.05, '#e63946', 0, Y + 0.85, qz);
    R.queue = [];
    const nq = Math.min(5, Math.floor((H.w - 2) / 2));
    for (let i = 0; i < 10; i++) { const row = i < 5 ? 0 : 1, k = i % 5; if (k >= nq) continue; const z = row ? qz + 1.3 : cz + 2.1; if (z > H.d / 2 - 0.6) continue; const f = seat(R.acc, 'civ', ((row ? -1 : 1) * (k - (nq - 1) / 2)) * 2, z, row ? 0 : Math.PI); f.visible = false; R.queue.push(f); }
    for (let i = 0; i < Math.min(5, Math.floor((H.d - 3) / 1.2)); i++) box(R.acc, 0.6, 0.45, 0.6, c.acc, -H.w / 2 + 0.8, Y, -H.d / 2 + 1.5 + i * 1.2);
    R.tickets = grp(R.acc, H.w / 2 - 1.2, H.d / 2 - 1.2); box(R.tickets, 0.5, 1.3, 0.4, '#ffc93c', 0, Y, 0); box(R.tickets, 0.35, 0.25, 0.05, '#e63946', 0, Y + 1.0, 0.21);
    R.poster = sign(R.acc, 'PORTEZ PLAINTE !', 2.6, 0.9, '#e63946', '#ffffff', -H.w / 2 + 2.4, 1.5, H.d / 2 - 0.25);
    R.poster.rotation.y = Math.PI;
    flat(hg, 5, 2.6, '#3d6fd6', 0, Y + 0.01, H.d / 2 - 1.5);
    R.accSite = site(hg, 0, 0, 'BIENTÔT : ACCUEIL');

    // Bureau des plaintes
    const PL = F('pla');
    R.pla = grp(G.pla, 0, 0);
    R.plaDesks = [];
    for (const [x, z] of fill(PL.w, PL.d, 3.0, 2.5, 12)) {
      const g = grp(R.pla, x, z);
      box(g, 1.4, 0.7, 0.62, '#ffffff', 0, Y, 0); box(g, 0.4, 0.05, 0.3, '#e9b949', 0.2, Y + 0.7, 0);
      const f = seat(g, 'pla', 0, -0.62, 0); const cz2 = seat(g, 'civ', 0, 0.68, Math.PI); cz2.visible = false;
      g.userData = { f, c: cz2 }; g.visible = false; R.plaDesks.push(g);
    }
    R.pile = [];
    for (let i = 0; i < 14; i++) { const p = box(R.pla, 0.7, 0.16, 0.5, i % 2 ? '#e9b949' : '#f2cf72', -PL.w / 2 + 0.7 + (i % 2) * 0.05, Y + i * 0.17, PL.d / 2 - 0.9); p.rotation.y = (Math.random() - 0.5) * 0.4; p.visible = false; R.pile.push(p); }
    R.plaSite = site(G.pla, 0, 0, 'BIENTÔT : PLAINTES');

    // Labo PTS
    const PT = F('pts');
    R.kiosks = [];
    for (const [x, z] of fill(PT.w, PT.d, 2.4, 3.0, 10)) {
      const g = grp(G.pts, x, z);
      box(g, 0.6, 1.0, 0.42, '#3d7bff', 0, Y, 0);
      const scr = box(g, 0.44, 0.3, 0.03, scrOff, 0, Y + 0.65, 0.22);
      const a = seat(g, 'pts', 0, -0.6, 0), s = seat(g, 'suspect', 0, 0.62, Math.PI); s.visible = false;
      g.userData = { f: a, s, scr }; g.visible = false; R.kiosks.push(g);
    }
    const toise = grp(G.pts, PT.w / 2 - 0.3, 0, -Math.PI / 2);
    for (let k = 0; k < 8; k++) box(toise, 2.6, 0.04, 0.03, k % 2 ? '#1b2a5c' : '#9aa0aa', 0, Y + 0.3 + k * 0.22, 0);

    // Bureau d'enquête
    const IV = F('inv');
    R.desks = [];
    for (const [x, z] of fill(IV.w, IV.d, 3.2, 2.6, 15)) {
      const g = grp(G.inv, x, z);
      box(g, 1.4, 0.72, 0.7, '#a0683a', 0, Y, 0);
      box(g, 0.6, 0.4, 0.06, '#222833', 0, Y + 0.72, -0.12);
      const scr = box(g, 0.52, 0.32, 0.02, scrOff, 0, Y + 0.76, -0.08);
      box(g, 0.3, 0.06 + Math.random() * 0.3, 0.38, '#ffffff', 0.45, Y + 0.72, 0.05);
      box(g, 0.5, 0.45, 0.5, '#2b3245', 0, Y, 0.75);
      const f = seat(g, 'inv', 0, 0.75, Math.PI, Y + 0.2);
      g.userData = { f, scr }; g.visible = false; R.desks.push(g);
    }
    const board = grp(G.inv, 0, -IV.d / 2 + 0.2);
    box(board, Math.min(5, IV.w - 2), 1.2, 0.06, '#c8a165', 0, Y + 0.4, 0);
    for (let k = 0; k < 7; k++) box(board, 0.5, 0.36, 0.02, k % 3 ? '#ffffff' : '#ffe066', -2 + k * 0.65, Y + 0.6 + (k % 2) * 0.4, 0.05);
    R.coffee = grp(G.inv, -IV.w / 2 + 0.7, IV.d / 2 - 1.2); box(R.coffee, 0.8, 1.5, 0.6, '#6b3f22', 0, Y, 0); box(R.coffee, 0.5, 0.3, 0.05, lampB, 0, Y + 1.0, 0.31);

    // Bureau du commissaire
    const BO = F('boss'), bg = G.boss;
    box(bg, 3.2, 0.8, 1.2, '#6b3f22', 0, Y, Math.min(1.1, BO.d / 2 - 2.5)); box(bg, 3.3, 0.06, 1.3, '#3b2414', 0, Y + 0.8, Math.min(1.1, BO.d / 2 - 2.5));
    box(bg, Math.min(5.6, BO.w - 0.6), 1.3, 0.4, '#8a5a35', 0, Y, -BO.d / 2 + 0.3);
    sign(bg, 'LE PRÉFET', 1.4, 0.9, '#c8a165', '#2a2833', 0, Y + 1.0, -BO.d / 2 + 0.52);
    cyl(bg, 0.04, 0.05, 2.4, 6, '#dfe3ea', BO.w / 2 - 0.7, Y, -BO.d / 2 + 1.1);
    ['#2346a8', '#ffffff', '#e63946'].forEach((col, k) => box(bg, 0.3, 0.6, 0.04, col, BO.w / 2 - 0.55 + k * 0.3 - 0.6, Y + 1.6, -BO.d / 2 + 1.1));
    R.parp = parpaing(bg, 0, Math.min(1.1, BO.d / 2 - 2.5) - 1.9);
    R.meet = [];
    const mt = fill(BO.w, BO.d, 1.45, 1.1, 8, 0.6).slice(-8);
    for (let i = 0; i < 8; i++) { const [x, z] = mt[i] || [((i % 4) - 1.5) * 1.2, BO.d / 2 - 1.2 - Math.floor(i / 4)]; const f = seat(bg, 'inv', x, Math.max(z, BO.d / 2 - 2.6 + Math.floor(i / 4) * 1.1), Math.PI); f.visible = false; R.meet.push(f); }

    // Garde à vue : 2 rangées de 6 cellules, banc des gardés à vue devant
    const GV = F('gav'), gg = G.gav, gd = GV.d;
    R.cells = [];
    const gL = GV.w >= 15.5 ? 6 : 4;
    for (let i = 0; i < 6; i++) R.cells.push(cellAt(gg, -6.125 + i * 2.45, -gd / 2 + 1.2, 0, c.wall));
    for (let i = 0; i < 6; i++) R.cells.push(cellAt(gg, -6.125 + i * 2.45, -gd / 2 + 5.6, Math.PI, c.wall));
    R.hallSus = [];
    const bx = doorLocal(room('gav')) > 0 ? -2.5 : 2.5;
    box(gg, 7, 0.4, 0.5, '#9b7b5a', bx, Y, gd / 2 - 1.2);
    for (let i = 0; i < 6; i++) { const f = seat(gg, 'suspect', bx - 2.75 + i * 1.1, gd / 2 - 1.5, Math.PI); f.visible = false; R.hallSus.push(f); }
    R.lawyers = [];
    for (let i = 0; i < 6; i++) { const f = seat(gg, 'avocat', -6 + i * 2.4, -gd / 2 + 3.1 + (i % 2) * 0.5, i % 2 ? Math.PI : 0); f.visible = false; R.lawyers.push(f); }
    // extension (8 cellules) : bloc à part, construit quand on dépasse 12 cellules
    R.ext = grp(b, 0, 0);
    const E = P.ext, ew = E[2] - E[0], ed = E[3] - E[1], ecx = (E[0] + E[2]) / 2, ecz = (E[1] + E[3]) / 2, eLong = ew > ed;
    box(R.ext, ew, Y, ed, '#9aa0aa', ecx, 0, ecz);
    wallX(R.ext, E[1], E[0], E[2], 1.8, 0.25, c.wall); wallX(R.ext, E[3], E[0], E[2], 1.8, 0.25, c.wall); wallZ(R.ext, E[0], E[1], E[3], 1.8, 0.25, c.wall); wallZ(R.ext, E[2], E[1], E[3], 1.8, 0.25, c.wall);
    sign(R.ext, 'EXTENSION GAV', 4, 0.5, c.trim, '#ffffff', ecx, 2.5, E[3] + 0.15);
    for (let i = 0; i < 8; i++) {
      const k = i % 4, sideA = i < 4, along = -3.675 + k * 2.45;
      if (eLong) R.cells.push(cellAt(R.ext, ecx + along, sideA ? E[1] + 1.25 : E[3] - 1.25, sideA ? 0 : Math.PI, c.wall));
      else R.cells.push(cellAt(R.ext, sideA ? E[0] + 1.25 : E[2] - 1.25, ecz + along, sideA ? Math.PI / 2 : -Math.PI / 2, c.wall));
    }
    R.ext.visible = false;
    R.ghost = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.6, 2.3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false }));
    b.add(R.ghost);

    // ---------- trajets : de porte en porte par la ligne de circulation ----------
    const SP = P.spine.map(([x, z]) => ({ x, z }));
    const segs = []; let acc0 = 0;
    for (let i = 0; i < SP.length - 1; i++) { const a = SP[i], q = SP[i + 1], L = Math.hypot(q.x - a.x, q.z - a.z); segs.push({ a, q, L, s0: acc0 }); acc0 += L; }
    const proj = (x, z) => { let best = null; for (const s of segs) { const dx = s.q.x - s.a.x, dz = s.q.z - s.a.z, t = Math.max(0, Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / (s.L * s.L))); const px = s.a.x + dx * t, pz = s.a.z + dz * t, dd = Math.hypot(px - x, pz - z); if (!best || dd < best.dd) best = { x: px, z: pz, s: s.s0 + t * s.L, dd }; } return best; };
    const along = (p, q) => { const a = proj(p[0], p[1]), z = proj(q[0], q[1]), out = [[a.x, a.z]]; const mids = segs.map(s => s.s0).slice(1); const vx = SP.slice(1, -1); if (a.s < z.s) vx.forEach((v, i) => { if (mids[i] > a.s && mids[i] < z.s) out.push([v.x, v.z]); }); else for (let i = vx.length - 1; i >= 0; i--) if (mids[i] < a.s && mids[i] > z.s) out.push([vx[i].x, vx[i].z]); out.push([z.x, z.z]); return out; };
    const node = (o, door, inner) => { const d = door || o.dr; return { inner: o.f.toW(...inner), dIn: [d.x - d.n[0] * 1.0, d.z - d.n[1] * 1.0], out: [d.x + d.n[0] * 1.2, d.z + d.n[1] * 1.2] }; };
    const hallR = room('hall'), gavR = room('gav');
    const N = {
      hall: node(hallR, hallR.dr, [0, cz + 2.4]), pla: node(room('pla'), null, [0, PL.d / 2 - 1.4]), pts: node(room('pts'), null, [0, PT.d / 2 - 1.4]),
      gav: node(gavR, null, [bx, gd / 2 - 2.2]), ent: node(hallR, hallR.en, [0, qz + 0.6]),
    };
    const route = (A, B) => [A.inner, A.dIn, A.out, ...along(A.out, B.out), B.out, B.dIn, B.inner];
    const toV = pts => pts.map(([x, z]) => V(x, yAt(x, z), z));
    const court = [[12, -22], ...P.back.path.slice().reverse()];
    const fromCourt = [...court, P.back.at, ...along(P.back.at, N.gav.out), N.gav.out, N.gav.dIn];
    const streetL = [[-34, 25], [-7, 18.5], [gx, 17.2]], streetR = [[gx, 17.2], [7 + gx, 18.5], [34, 25]];
    const inFront = [[portal[0], portal[1] + 1.4], N.ent.out, N.ent.dIn, N.ent.inner];
    const hallIn = hallR.en === hallR.dr ? [N.hall.inner] : [N.hall.inner];
    R.paths = {
      cop: toV([...fromCourt, N.gav.inner]),
      sus: toV([...fromCourt, N.gav.inner].map(([x, z], i, a) => (i === a.length - 1 ? [x - 1.5, z] : [x - 0.4, z]))),
      release: toV([...route(N.gav, N.hall), ...inFront.slice().reverse(), ...streetR]),
      toPts: toV(route(N.gav, N.pts)),
      citizenIn: toV([...streetL, ...inFront]),
      toPlaintes: toV([...hallIn, ...route(N.hall, N.pla).slice(1)]),
      angry: toV([N.ent.inner, ...inFront.slice().reverse(), ...streetL.slice().reverse()]),
    };
    // zones des étiquettes et des effets à l'écran
    const cen = k => { const f = F(k); return V(f.cx, 2.7, f.cz); };
    const parpW = new THREE.Vector3(); R.parp.g.updateWorldMatrix(true, false); R.parp.g.getWorldPosition(parpW);
    R.zones = { cells: cen('gav'), inv: cen('inv'), pts: cen('pts'), acc: cen('hall'), pla: cen('pla'), parp: V(parpW.x, 4.4, parpW.z), clean: V(SP[0].x, 2.2, SP[0].z) };

    // ---------- tour administrative (grandit avec les paliers) ----------
    const TW = P.tower || [-8, -19];
    R.tower = grp(b, TW[0], TW[1]);
    R.floors = [];
    for (let f = 0; f < 10; f++) {
      const g = new THREE.Group(); g.position.y = f * 3; R.tower.add(g);
      S.world.building(g, 20, 3, 12, c.facade, 0, 0, true);
      box(g, 20.3, 0.3, 12.3, c.trim, 0, 2.75, 0);
      R.floors.push(g);
    }
    box(R.floors[0], 3, 2.4, 0.2, '#16224a', 6, 0, 6.05);
    R.roof = new THREE.Group(); R.tower.add(R.roof);
    box(R.roof, 20.4, 0.3, 12.4, '#8d939e', 0, 0, 0);
    box(R.roof, 0.6, 0.4, 0.6, gyR, -9.4, 0.3, 5.6); box(R.roof, 0.6, 0.4, 0.6, gyB, 9.4, 0.3, 5.6);
    box(R.roof, 2, 1, 1.4, '#c7ccd4', 6, 0.3, -3); box(R.roof, 2, 1, 1.4, '#c7ccd4', 3.4, 0.3, -3);
    R.roofSign = sign(R.roof, 'POLICE', 9, 1.6, c.trim, '#ffffff', 0, 1.3, 6.25);
    R.antenna = grp(R.roof, 8, -4.5); cyl(R.antenna, 0.05, 0.15, 7, 5, '#c7ccd4', 0, 0.3, 0);
    R.blink = ball(R.antenna, 0.2, mat('#ff4b5c', { emissive: '#ff0000', emissiveIntensity: 1 }), 0, 7.4, 0, 0);
    R.pad = grp(R.roof, -4, -0.5);
    cyl(R.pad, 2.6, 2.6, 0.1, 16, '#3a4152', 0, 0.3, 0);
    box(R.pad, 0.28, 0.02, 1.8, '#ffc93c', -0.6, 0.4, 0); box(R.pad, 0.28, 0.02, 1.8, '#ffc93c', 0.6, 0.4, 0); box(R.pad, 1.2, 0.02, 0.28, '#ffc93c', 0, 0.4, 0);
    const heli = grp(R.pad, 0, 0, 0.6); heli.position.y = 0.4;
    ball(heli, 0.85, c.trim, 0, 0.85, 0, 1).scale.set(1.3, 0.85, 0.9);
    box(heli, 2, 0.25, 0.25, c.trim, -1.6, 0.85, 0); box(heli, 0.12, 0.7, 0.55, '#e8eefc', -2.55, 0.8, 0);
    box(heli, 1.8, 0.07, 0.09, '#2b3245', 0, 0.05, 0.5); box(heli, 1.8, 0.07, 0.09, '#2b3245', 0, 0.05, -0.5);
    R.rotor = grp(heli, 0, 0); R.rotor.position.y = 1.7;
    box(R.rotor, 4.6, 0.05, 0.24, '#2b3245', 0, 0, 0); box(R.rotor, 0.24, 0.05, 4.6, '#2b3245', 0, 0, 0);
    R.gold = grp(R.roof, 0, 0);
    box(R.gold, 20.8, 0.4, 0.25, goldM, 0, 0.3, 6.3); box(R.gold, 20.8, 0.4, 0.25, goldM, 0, 0.3, -6.3); box(R.gold, 0.25, 0.4, 12.8, goldM, 10.3, 0.3, 0); box(R.gold, 0.25, 0.4, 12.8, goldM, -10.3, 0.3, 0);
    R.annex = grp(b, Math.max(-23.8, TW[0] - 15.8), TW[1] - 1);
    for (let f = 0; f < 5; f++) { const g = new THREE.Group(); g.position.y = f * 3; R.annex.add(g); S.world.building(g, 7, 3, 13, 'verre', 0, 0, true); }
    box(R.annex, 0.5, 0.35, 0.5, gyR, 0, 15, 0);
    R.statue = grp(b, portal[0] + 9, Math.min(15.2, portal[1] + 2.8));
    box(R.statue, 1.8, 1, 1.8, '#eef2fb', 0, 0, 0);
    box(R.statue, 1.3, 0.9, 0.75, goldM, 0, 1.25, 0); box(R.statue, 0.12, 0.6, 0.12, goldM, -0.3, 1, 0); box(R.statue, 0.12, 0.6, 0.12, goldM, 0.3, 1, 0);
    cyl(R.statue, 0.34, 0.34, 0.3, 10, goldM, 0, 2.15, 0);

    // ---------- problèmes : vomi, ménage, avocats, manifestants ----------
    R.puddles = [];
    const pud = S.geo('pud', () => { const g = new THREE.CircleGeometry(0.55, 8), p = g.attributes.position; for (let i = 1; i < p.count; i++) { const k = 0.7 + Math.random() * 0.6; p.setXY(i, p.getX(i) * k, p.getY(i) * k); } return g; });
    const pudM = mat('#b9c94c', { roughness: 0.3, emissive: '#3a4a00', emissiveIntensity: 0.2 });
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(pud, pudM); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
      const sg = segs[i % segs.length], t = Math.random(), off = (Math.random() - 0.5) * 1.2, nx = -(sg.q.z - sg.a.z) / sg.L, nz = (sg.q.x - sg.a.x) / sg.L;
      const px = sg.a.x + (sg.q.x - sg.a.x) * t + nx * off, pz = sg.a.z + (sg.q.z - sg.a.z) * t + nz * off;
      m.position.set(px, yAt(px, pz) + 0.02, pz);
      m.scale.setScalar(0.7 + Math.random() * 0.6); m.visible = false; b.add(m); R.puddles.push(m);
    }
    R.cleaners = [];
    for (let i = 0; i < 6; i++) { const sg = segs[i % segs.length], f = seat(b, 'clean', sg.a.x, sg.a.z, 0); f.position.y = yAt(sg.a.x, sg.a.z); f.userData.lane = [V(sg.a.x, f.position.y, sg.a.z), V(sg.q.x, f.position.y, sg.q.z)]; f.userData.ph = i * 1.7; f.visible = false; R.cleaners.push(f); }
    // interprètes à côté des enquêteurs, réunion dans le bureau du commissaire, paparazzis, colis suspect
    R.interps = R.desks.slice(0, 6).map(d => { const f = seat(d, 'interp', 0.95, 0.55, Math.PI); f.visible = false; return f; });
    R.papa = [];
    for (let i = 0; i < 8; i++) { const f = figure('papa'); f.position.set(gx - 8 + i * 2.2 + (Math.random() - 0.5), 0.1, (portal[1] > 11.5 ? 17.6 : 14.6) + (i % 2) * 1.4); f.rotation.y = Math.PI + (Math.random() - 0.5) * 0.6; f.visible = false; b.add(f); R.papa.push(f); }
    R.colis = grp(b, portal[0] + 6.5, Math.min(15, portal[1] + 2.6));
    box(R.colis, 1, 0.7, 0.7, '#8a5a35', 0, 0.1, 0); box(R.colis, 1.02, 0.12, 0.72, '#e9d3a2', 0, 0.45, 0);
    R.colisLamp = box(R.colis, 0.25, 0.25, 0.25, gyR, 0, 0.8, 0);
    for (let k = 0; k < 4; k++) cyl(R.colis, 0.03, 0.03, 0.9, 4, '#ffc93c', (k % 2 ? 1 : -1) * 1.2, 0, (k < 2 ? 1 : -1) * 1.2);
    R.colis.visible = false;
    R.demo = [];
    for (let i = 0; i < 36; i++) { const f = figure('demo'); f.position.set(-22 + (i % 12) * 4 + Math.random() * 2, 0, 19 + Math.floor(i / 12) * 2.4 + Math.random()); f.rotation.y = Math.PI + (Math.random() - 0.5); f.visible = false; b.add(f); R.demo.push(f); }

    // ---------- patrouilles ----------
    R.cars = []; R.parked = [];
    for (let i = 0; i < 8; i++) { const car = patrolCar(); car.userData = { d: i * 30, sp: 9 + Math.random() * 2 }; car.visible = false; b.add(car); R.cars.push(car); }
    for (let i = 0; i < 8; i++) { const car = patrolCar(); car.position.set(6.8 + i * 2.6, 0.1, -25); car.rotation.y = -Math.PI / 2; car.visible = false; b.add(car); R.parked.push(car); }

    S.B = R;
    R.style = c;
    return R;
  }

  function site(p, x, z, label) {
    const g = grp(p, x, z);
    for (let i = 0; i < 4; i++) { const cx = (i % 2 ? 1 : -1) * 5, cz = (i < 2 ? 1 : -1) * 3.4; cyl(g, 0.02, 0.22, 0.6, 8, '#ff7b1c', cx, Y, cz); }
    for (let i = 0; i < 5; i++) box(g, 1.6, 0.35, 0.1, i % 2 ? '#ffffff' : '#e63946', -3.2 + i * 1.6, Y + 0.4, 3.6);
    box(g, 2.4, 1.6, 2.4, '#c9a46a', -2.5, Y, -1); box(g, 1.2, 0.8, 1.2, '#b08a52', 2.5, Y, 0.5);
    sign(g, label, 4.2, 0.7, '#ffc93c', '#1b2a5c', 0, Y + 1.6, 1.5);
    return g;
  }
  function patrolCar() {
    const g = new THREE.Group();
    box(g, 1.9, 0.5, 0.95, '#f4f6fb', 0, 0.2, 0); box(g, 1.0, 0.42, 0.85, '#d8e2f5', -0.1, 0.7, 0);
    box(g, 1.92, 0.14, 0.97, '#2346a8', 0, 0.42, 0);
    box(g, 0.22, 0.14, 0.3, gyR, -0.1, 1.12, -0.17); box(g, 0.22, 0.14, 0.3, gyB, -0.1, 1.12, 0.17);
    [[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.45], [0.6, -0.45]].forEach(([x, z]) => { const w = cyl(g, 0.2, 0.2, 0.14, 8, '#151821', x, 0.06, z); w.rotation.x = Math.PI / 2; w.position.y = 0.2; });
    g.scale.setScalar(1.25);
    return g;
  }
  function parpaing(p, x, z) {
    const g = grp(p, x, z);
    const body = new THREE.Group(); body.position.y = Y; g.add(body);
    cyl(body, 0.14, 0.14, 0.55, 6, '#1b2a5c', -0.38, 0, 0); cyl(body, 0.14, 0.14, 0.55, 6, '#1b2a5c', 0.38, 0, 0);
    box(body, 1.7, 1.15, 0.95, '#a3a8b0', 0, 0.5, 0);
    [-0.42, 0.42].forEach(xx => {
      box(body, 0.52, 0.52, 0.06, '#4b4f57', xx, 0.82, 0.46);
      ball(body, 0.17, '#ffffff', xx, 1.08, 0.5, 1);
      ball(body, 0.08, '#111111', xx + (xx < 0 ? 0.03 : -0.03), 1.08, 0.64, 0);
      box(body, 0.44, 0.08, 0.1, '#3b2a1e', xx, 1.41, 0.48).rotation.z = xx < 0 ? -0.28 : 0.28;
    });
    box(body, 0.5, 0.15, 0.14, '#3b2a1e', -0.22, 0.7, 0.5).rotation.z = 0.25;
    box(body, 0.5, 0.15, 0.14, '#3b2a1e', 0.22, 0.7, 0.5).rotation.z = -0.25;
    cyl(body, 0.46, 0.42, 0.4, 12, '#1b2a5c', 0, 1.65, 0);
    cyl(body, 0.47, 0.47, 0.1, 12, '#ffc93c', 0, 1.7, 0);
    box(body, 0.7, 0.05, 0.35, '#111522', 0, 1.65, 0.42);
    const arm = new THREE.Group(); arm.position.set(0.95, 1.05, 0); body.add(arm);
    cyl(arm, 0.12, 0.12, 0.6, 6, '#a3a8b0', 0, 0, 0);
    const st = new THREE.Group(); st.position.y = 0.6; arm.add(st);
    cyl(st, 0.1, 0.12, 0.4, 8, '#c4142a', 0, 0, 0); box(st, 0.5, 0.18, 0.4, '#8a5a35', 0, 0.4, 0);
    const medals = [];
    for (let i = 0; i < 6; i++) { const m = cyl(body, 0.08, 0.08, 0.04, 8, goldM, -0.55 + i * 0.22, 0.2, 0.48); m.rotation.x = Math.PI / 2; m.visible = false; medals.push(m); }
    g.scale.setScalar(1.25);
    return { g, body, arm, medals };
  }

  S.building = { build };
})();
