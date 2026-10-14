// Le commissariat : un grand bâtiment en coupe (on voit dans les pièces), une tour administrative
// qui grandit avec les paliers, une cour des véhicules. Reconstruit à chaque mutation (style du lieu).
(function () {
  const { THREE, scene, mat, box, cyl, ball, flat, sign, figure } = S;
  const ST = {
    stone: { wall: '#e6d8bb', trim: '#8a6d4a', acc: '#2346a8', lot: '#d8cfba', facade: 'ferme' },
    classic: { wall: '#eef2fb', trim: '#1b2a5c', acc: '#3d6fd6', lot: '#cfd4dc', facade: 'haussmann' },
    modern: { wall: '#dfe4ea', trim: '#1f7a8c', acc: '#3d7bff', lot: '#c9ced6', facade: 'beton' },
    glass: { wall: '#c9d6e6', trim: '#22304d', acc: '#5aa9ff', lot: '#9aa3b0', facade: 'verre' },
    bunker: { wall: '#b8bcc2', trim: '#2b2f36', acc: '#ffc93c', lot: '#a9aeb5', facade: 'beton' },
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
  function grp(p, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; p.add(g); return g; }

  function cellAt(p, x, z, ry, wallC) {
    const g = grp(p, x, z, ry);
    box(g, 2.3, 1.6, 0.14, wallC, 0, Y, -1.08); box(g, 0.14, 1.6, 2.3, wallC, -1.08, Y, 0); box(g, 0.14, 1.6, 2.3, wallC, 1.08, Y, 0);
    for (let b = 0; b < 7; b++) cyl(g, 0.035, 0.035, 1.6, 5, '#30343c', -0.9 + b * 0.3, Y, 1.08);
    box(g, 2.3, 0.1, 0.12, '#30343c', 0, Y + 1.6, 1.08);
    box(g, 1.9, 0.38, 0.45, '#9b7b5a', 0, Y, -0.75);
    const figs = [];
    for (let j = 0; j < 4; j++) { const f = seat(g, 'suspect', -0.55 + (j % 2) * 1.1 + (j > 1 ? 0.25 : 0), j > 1 ? 0.35 : -0.6, (Math.random() - 0.5) * 0.8); f.visible = false; figs.push(f); }
    const stink = new THREE.Group(); g.add(stink); stink.position.y = Y + 1.4;
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(S.geo('stink', () => new THREE.IcosahedronGeometry(0.35, 0)), new THREE.MeshBasicMaterial({ color: '#9be35a', transparent: true, opacity: 0.45, depthWrite: false })); s.position.set(-0.5 + k * 0.5, k * 0.2, 0); stink.add(s); }
    stink.visible = false;
    g.userData = { figs, stink }; g.visible = false;
    return g;
  }

  let root = null;
  function build(style, siteName) {
    if (root) scene.remove(root);
    const c = ST[style] || ST.classic, R = {};
    root = new THREE.Group(); scene.add(root);
    const b = root;

    // ---------- terrain, clôture, parvis, cour ----------
    box(b, 56, 0.1, 44, c.lot, 0, 0, -6);
    flat(b, 22, 14, '#5a5f6e', 15, 0.11, -20.5);
    for (let i = 0; i < 8; i++) flat(b, 0.12, 4, '#ffffff', 5.5 + i * 2.6, 0.12, -25);
    flat(b, 20, 5.6, '#e9e4d8', 0, 0.11, 13.2);
    for (let i = 0; i < 3; i++) box(b, 6 - i * 0.4, 0.07 * (i + 1), 1.6 - i * 0.4, '#d9d2c2', 0, 0.1, 11.2 - i * 0.2);
    const fence = (x0, z0, x1, z1, gaps) => {
      const horiz = z0 === z1, L = horiz ? x1 - x0 : z1 - z0;
      (horiz ? wallX : wallZ)(b, horiz ? z0 : x0, horiz ? x0 : z0, horiz ? x1 : z1, 0.5, 0.35, c.trim, gaps, 0.05);
      for (let k = 0; k <= L; k += 2.5) {
        const x = horiz ? x0 + k : x0, z = horiz ? z0 : z0 + k;
        if ((gaps || []).some(([g0, g1]) => (horiz ? x : z) > g0 - 0.2 && (horiz ? x : z) < g1 + 0.2)) continue;
        cyl(b, 0.05, 0.05, 1.3, 5, '#30343c', x, 0.55, z);
      }
    };
    fence(-28, 16, 28, 16, [[-10, 10]]); fence(-28, -28, 28, -28, [[9, 21]]); fence(-28, -28, -28, 16); fence(28, -28, 28, 16);
    box(b, 10, 0.18, 0.18, '#e63946', 15, 1.0, -28.2); for (let i = 0; i < 4; i++) box(b, 1.2, 0.2, 0.2, '#ffffff', 11 + i * 2.6, 1.0, -28.2);

    // ---------- bâtiment principal (40 × 20), coupe à hauteur de mur ----------
    box(b, 40.6, Y, 20.6, '#9aa0aa', 0, 0, 0);
    const rooms = [
      ['#e8d3b0', -13.5, 5.5, 13, 9], ['#f1e9da', 0, 5.5, 14, 9], ['#e3ecf8', 13.5, 5.5, 13, 9],
      ['#d8dbe0', 0, 0, 40, 2], ['#b9c6dd', -11, -5.5, 18, 9], ['#a8323e', 1, -5.5, 6, 9], ['#c3c7cd', 12, -5.5, 16, 9],
    ];
    for (const [col, x, z, w, d] of rooms) flat(b, w, d, col, x, Y + 0.005, z);
    flat(b, 6, 3.4, '#3d6fd6', 0, Y + 0.01, 7.4); // tapis du hall
    const EH = 2.1, IH = 1.4;
    wallX(b, 10, -20, 20, EH, 0.3, c.wall, [[-2, 2]]); wallX(b, -10, -20, 20, EH, 0.3, c.wall, [[14, 16.4]]);
    wallZ(b, -20, -10, 10, EH, 0.3, c.wall); wallZ(b, 20, -10, 10, EH, 0.3, c.wall);
    wallX(b, 10, -20.2, 20.2, 0.22, 0.42, c.trim, [[-2, 2]], Y + EH); wallX(b, -10, -20.2, 20.2, 0.22, 0.42, c.trim, [[14, 16.4]], Y + EH);
    wallZ(b, -20, -10.2, 10.2, 0.22, 0.42, c.trim, null, Y + EH); wallZ(b, 20, -10.2, 10.2, 0.22, 0.42, c.trim, null, Y + EH);
    [[-20, 10], [20, 10], [-20, -10], [20, -10]].forEach(([x, z]) => box(b, 1.1, 3, 1.1, c.trim, x, 0, z));
    for (let i = 0; i < 8; i++) { const x = -18 + i * 5; if (Math.abs(x) > 3) box(b, 2.2, 0.9, 0.08, glass, x, Y + 0.9, 10.17); }
    wallX(b, 1, -20, 20, IH, 0.16, c.wall, [[-14, -12.4], [-1.6, 1.6], [12.4, 14]]);
    wallX(b, -1, -20, 20, IH, 0.16, c.wall, [[-12, -10.4], [0, 1.6], [11, 13]]);
    wallZ(b, -7, 1, 10, IH, 0.16, c.wall, [[4.6, 6.2]]); wallZ(b, 7, 1, 10, IH, 0.16, c.wall);
    wallZ(b, -2, -10, -1, IH, 0.16, c.wall); wallZ(b, 4, -10, -1, IH, 0.16, c.wall);

    // Entrée monumentale
    const portal = grp(b, 0, 10.6);
    box(portal, 1.1, 5.2, 1.1, c.wall, -5.6, 0, 0); box(portal, 1.1, 5.2, 1.1, c.wall, 5.6, 0, 0);
    box(portal, 12.4, 1.5, 1.3, c.trim, 0, 5.2, 0);
    sign(portal, 'POLICE', 7, 1.1, c.trim, '#ffffff', 0, 5.95, 0.66);
    sign(portal, 'COMMISSARIAT DE ' + siteName.toUpperCase(), 9, 0.42, '#ffffff', c.trim, 0, 4.85, 0.67);
    box(portal, 0.5, 0.5, 0.5, lampB, -5.6, 5.2, 0.7); box(portal, 0.5, 0.5, 0.5, lampB, 5.6, 5.2, 0.7);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 2.4), glass); canopy.position.set(0, 3.6, -0.6); portal.add(canopy);
    [-9.5, -8.2].forEach((x, i) => { cyl(b, 0.06, 0.07, 6.5, 6, '#dfe3ea', x, 0.1, 14.2); ['#2346a8', '#ffffff', '#e63946'].forEach((col, k) => box(b, 0.5, 1.0, 0.05, col, x + 0.3 + k * 0.5, 5.3 - i * 0.2, 14.2)); });

    // ---------- Hall d'accueil ----------
    R.acc = grp(b, 0, 0);
    R.guichets = [];
    box(R.acc, 11.6, 1.0, 0.7, '#ffffff', 0, Y, 3.3); box(R.acc, 11.8, 0.08, 0.9, c.acc, 0, Y + 1.0, 3.3);
    for (let i = 0; i < 6; i++) { const f = seat(R.acc, 'acc', -4.6 + i * 1.85, 2.4, 0); f.visible = false; R.guichets.push({ f }); }
    for (let k = 0; k < 6; k++) { cyl(R.acc, 0.05, 0.06, 0.9, 6, '#c9a227', -4.6 + k * 1.85, Y, 6.7); }
    box(R.acc, 9.3, 0.05, 0.05, '#e63946', 0, Y + 0.85, 6.7);
    R.queue = [];
    for (let i = 0; i < 10; i++) { const row = i < 5 ? 0 : 1, k = i % 5; const f = seat(R.acc, 'civ', row ? -4 + k * 2 : 4 - k * 2, row ? 8.1 : 5.4, row ? 0 : Math.PI); f.visible = false; R.queue.push(f); }
    for (let i = 0; i < 5; i++) box(R.acc, 0.6, 0.45, 0.6, c.acc, -6.3, Y, 2.2 + i * 1.2);
    R.tickets = grp(R.acc, 3.4, 9.2); box(R.tickets, 0.5, 1.3, 0.4, '#ffc93c', 0, Y, 0); box(R.tickets, 0.35, 0.25, 0.05, '#e63946', 0, Y + 1.0, 0.21);
    R.poster = sign(R.acc, 'PORTEZ PLAINTE !', 2.6, 0.9, '#e63946', '#ffffff', -4.2, 1.5, 9.83);
    R.poster.rotation.y = Math.PI;
    R.accSite = site(b, 0, 5.5, 'BIENTÔT : ACCUEIL');

    // ---------- Bureau des plaintes ----------
    R.pla = grp(b, 0, 0);
    R.plaDesks = [];
    for (let i = 0; i < 12; i++) {
      const g = grp(R.pla, -18.4 + (i % 4) * 3.2, 2.8 + Math.floor(i / 4) * 2.6);
      box(g, 1.4, 0.7, 0.62, '#ffffff', 0, Y, 0); box(g, 0.4, 0.05, 0.3, '#e9b949', 0.2, Y + 0.7, 0);
      const f = seat(g, 'pla', 0, -0.62, 0); const cz = seat(g, 'civ', 0, 0.68, Math.PI); cz.visible = false;
      g.userData = { f, c: cz }; g.visible = false; R.plaDesks.push(g);
    }
    R.pile = [];
    for (let i = 0; i < 14; i++) { const p = box(R.pla, 0.7, 0.16, 0.5, i % 2 ? '#e9b949' : '#f2cf72', -19.1 + (i % 2) * 0.05, Y + i * 0.17, 9.2); p.rotation.y = (Math.random() - 0.5) * 0.4; p.visible = false; R.pile.push(p); }
    R.plaSite = site(b, -13.5, 5.5, 'BIENTÔT : PLAINTES');

    // ---------- Labo PTS ----------
    R.kiosks = [];
    for (let i = 0; i < 10; i++) {
      const g = grp(b, 8.6 + (i % 5) * 2.5, 4.0 + Math.floor(i / 5) * 3.6);
      box(g, 0.6, 1.0, 0.42, '#3d7bff', 0, Y, 0);
      const scr = box(g, 0.44, 0.3, 0.03, scrOff, 0, Y + 0.65, 0.22);
      const a = seat(g, 'pts', 0, -0.6, 0), s = seat(g, 'suspect', 0, 0.62, Math.PI); s.visible = false;
      g.userData = { f: a, s, scr }; g.visible = false; R.kiosks.push(g);
    }
    const toise = grp(b, 19.75, 5.5, -Math.PI / 2);
    for (let k = 0; k < 8; k++) box(toise, 2.6, 0.04, 0.03, k % 2 ? '#1b2a5c' : '#9aa0aa', 0, Y + 0.3 + k * 0.22, 0);
    cyl(b, 0.04, 0.06, 1.3, 5, '#2b3245', 17.4, Y, 5.5); box(b, 0.4, 0.3, 0.3, '#111522', 17.4, Y + 1.3, 5.5);

    // ---------- Bureau d'enquête ----------
    R.desks = [];
    for (let i = 0; i < 15; i++) {
      const g = grp(b, -18.2 + (i % 5) * 3.4, -8.4 + Math.floor(i / 5) * 2.8);
      box(g, 1.4, 0.72, 0.7, '#a0683a', 0, Y, 0);
      box(g, 0.6, 0.4, 0.06, '#222833', 0, Y + 0.72, -0.12);
      const scr = box(g, 0.52, 0.32, 0.02, scrOff, 0, Y + 0.76, -0.08);
      box(g, 0.3, 0.06 + Math.random() * 0.3, 0.38, '#ffffff', 0.45, Y + 0.72, 0.05);
      box(g, 0.5, 0.45, 0.5, '#2b3245', 0, Y, 0.75);
      const f = seat(g, 'inv', 0, 0.75, Math.PI, Y + 0.2);
      g.userData = { f, scr }; g.visible = false; R.desks.push(g);
    }
    const board = grp(b, -11, -9.8);
    box(board, 5, 1.2, 0.06, '#c8a165', 0, Y + 0.4, 0);
    for (let k = 0; k < 7; k++) box(board, 0.5, 0.36, 0.02, k % 3 ? '#ffffff' : '#ffe066', -2 + k * 0.65, Y + 0.6 + (k % 2) * 0.4, 0.05);
    for (let k = 0; k < 5; k++) { const s = box(board, 1.2, 0.03, 0.02, '#e63946', -1.6 + k * 0.8, Y + 0.95, 0.07); s.rotation.z = (k % 2 ? 0.4 : -0.35); }
    R.coffee = grp(b, -19.2, -1.9); box(R.coffee, 0.8, 1.5, 0.6, '#6b3f22', 0, Y, 0); box(R.coffee, 0.5, 0.3, 0.05, lampB, 0, Y + 1.0, 0.31);

    // ---------- Bureau du commissaire ----------
    box(b, 3.2, 0.8, 1.2, '#6b3f22', 1, Y, -4.4); box(b, 3.3, 0.06, 1.3, '#3b2414', 1, Y + 0.8, -4.4);
    box(b, 5.6, 1.3, 0.4, '#8a5a35', 1, Y, -9.6);
    sign(b, 'LE PRÉFET', 1.4, 0.9, '#c8a165', '#2a2833', 1, Y + 1.0, -9.38);
    cyl(b, 0.04, 0.05, 2.4, 6, '#dfe3ea', 3.4, Y, -8.4);
    ['#2346a8', '#ffffff', '#e63946'].forEach((col, k) => box(b, 0.3, 0.6, 0.04, col, 3.55 + k * 0.3, Y + 1.6, -8.4));
    R.parp = parpaing(b, 1, -6.3);

    // ---------- Garde à vue : 2 rangées de 6 cellules + extension de 8 ----------
    R.cells = [];
    for (let i = 0; i < 6; i++) R.cells.push(cellAt(b, 5.4 + i * 2.45, -8.8, 0, c.wall));
    for (let i = 0; i < 6; i++) R.cells.push(cellAt(b, 5.4 + i * 2.45, -4.4, Math.PI, c.wall));
    R.ext = grp(b, 0, 0);
    box(R.ext, 6.6, Y, 10.6, '#9aa0aa', 24.1, 0, -4.9);
    wallZ(R.ext, 27.3, -10, 0.2, 1.8, 0.25, c.wall); wallX(R.ext, -10.1, 20.8, 27.4, 1.8, 0.25, c.wall); wallX(R.ext, 0.25, 20.8, 27.4, 1.8, 0.25, c.wall);
    sign(R.ext, 'EXTENSION GAV', 4, 0.5, c.trim, '#ffffff', 24.1, 2.5, 0.4);
    for (let i = 0; i < 8; i++) R.cells.push(cellAt(R.ext, i < 4 ? 22.1 : 26.0, -8.6 + (i % 4) * 2.45, i < 4 ? Math.PI / 2 : -Math.PI / 2, c.wall));
    R.ext.visible = false;
    R.hallSus = [];
    for (let i = 0; i < 6; i++) { const f = seat(b, 'suspect', 6 + i * 1.1, -2.2, Math.PI); f.visible = false; R.hallSus.push(f); }
    box(b, 7, 0.4, 0.5, '#9b7b5a', 8.7, Y, -1.9);
    R.ghost = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.6, 2.3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false }));
    b.add(R.ghost);

    // ---------- Tour administrative (grandit avec les paliers) ----------
    R.tower = grp(b, -8, -19);
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
    R.annex = grp(b, -23.8, -20);
    for (let f = 0; f < 5; f++) { const g = new THREE.Group(); g.position.y = f * 3; R.annex.add(g); S.world.building(g, 7, 3, 13, 'verre', 0, 0, true); }
    box(R.annex, 0.5, 0.35, 0.5, gyR, 0, 15, 0);
    R.statue = grp(b, 9, 13.4);
    box(R.statue, 1.8, 1, 1.8, '#eef2fb', 0, 0, 0);
    box(R.statue, 1.3, 0.9, 0.75, goldM, 0, 1.25, 0); box(R.statue, 0.12, 0.6, 0.12, goldM, -0.3, 1, 0); box(R.statue, 0.12, 0.6, 0.12, goldM, 0.3, 1, 0);
    cyl(R.statue, 0.34, 0.34, 0.3, 10, goldM, 0, 2.15, 0);

    // ---------- problèmes : vomi, ménage, avocats, manifestants ----------
    R.puddles = [];
    const pud = S.geo('pud', () => { const g = new THREE.CircleGeometry(0.55, 8), p = g.attributes.position; for (let i = 1; i < p.count; i++) { const k = 0.7 + Math.random() * 0.6; p.setXY(i, p.getX(i) * k, p.getY(i) * k); } return g; });
    const pudM = mat('#b9c94c', { roughness: 0.3, emissive: '#3a4a00', emissiveIntensity: 0.2 });
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(pud, pudM); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6;
      if (i < 18) m.position.set(-19 + Math.random() * 38, Y + 0.02, -0.7 + Math.random() * 1.4); else m.position.set(4.8 + Math.random() * 14.6, Y + 0.02, -7.4 + Math.random() * 1.7);
      m.scale.setScalar(0.7 + Math.random() * 0.6); m.visible = false; b.add(m); R.puddles.push(m);
    }
    R.cleaners = [];
    for (let i = 0; i < 6; i++) { const f = seat(b, 'clean', 0, i % 3 === 2 ? -6.6 : 0, 0); f.userData.lane = i % 3 === 2 ? [5, 19] : [-18, 18]; f.userData.ph = i * 1.7; f.visible = false; R.cleaners.push(f); }
    R.lawyers = [];
    for (let i = 0; i < 6; i++) { const f = seat(b, 'avocat', 5 + i * 2.4, -6.3 + (i % 2) * 0.5, i % 2 ? Math.PI : 0); f.visible = false; R.lawyers.push(f); }
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
