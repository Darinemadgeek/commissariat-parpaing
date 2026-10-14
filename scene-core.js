// Scène 3D : moteur, outils de modélisation low-poly, île, route et décor.
window.S = (function () {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('gl');
  const tagsBox = document.getElementById('tags');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a8dcff');
  scene.fog = new THREE.Fog('#a8dcff', 80, 170);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 400);
  camera.position.set(34, 32, 40);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.set(0, 0, 1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 16;
  controls.maxDistance = 115;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.32;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;
  let idleT = 0;
  controls.addEventListener('start', () => { controls.autoRotate = false; idleT = 0; });

  scene.add(new THREE.HemisphereLight('#e4f4ff', '#5d7d3c', 0.8));
  const sun = new THREE.DirectionalLight('#fff0d4', 0.85);
  sun.position.set(26, 42, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 120 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---------- outils ----------
  const mats = {}, geos = {};
  function mat(color, opts) {
    const key = color + (opts ? JSON.stringify(opts) : '');
    return mats[key] || (mats[key] = new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.85, metalness: 0 }, opts || {})));
  }
  const geo = (key, make) => geos[key] || (geos[key] = make());
  const M = c => (c && c.isMaterial ? c : mat(c));
  function mesh(parent, g, color, x, y, z) {
    const m = new THREE.Mesh(g, M(color));
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  // y = base de l'objet (pratique pour empiler)
  const box = (p, w, h, d, c, x, y, z) => mesh(p, geo(`b${w}_${h}_${d}`, () => new THREE.BoxGeometry(w, h, d)), c, x, (y || 0) + h / 2, z);
  const cyl = (p, rt, rb, h, seg, c, x, y, z) => mesh(p, geo(`c${rt}_${rb}_${h}_${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), c, x, (y || 0) + h / 2, z);
  const ball = (p, r, c, x, y, z, det) => mesh(p, geo(`s${r}_${det || 0}`, () => new THREE.IcosahedronGeometry(r, det || 0)), c, x, y, z);

  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  const CIV = ['#e85d75', '#5bc0eb', '#9bc53d', '#fde74c', '#c879ff', '#ff9f1c', '#2ec4b6'];
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  // Petit bonhomme : kind = suspect | inv | pts | cop | civ | acc | pla
  function figure(kind) {
    const g = new THREE.Group();
    const bodyC = { suspect: '#ff7b1c', inv: '#a8743f', pts: '#f4f6fb', cop: '#22336e', acc: '#7fb0ff', pla: '#2c3f86' }[kind] || rnd(CIV);
    cyl(g, 0.24, 0.32, 0.72, 7, bodyC, 0, 0, 0);
    const skin = rnd(SKIN);
    ball(g, 0.22, skin, 0, 0.92, 0, 1);
    if (kind === 'cop' || kind === 'acc') {
      cyl(g, 0.2, 0.2, 0.12, 8, '#1b2a5c', 0, 1.06, 0);
      box(g, 0.3, 0.03, 0.14, '#111522', 0, 1.06, 0.18);
    } else if (kind === 'pts') {
      ball(g, 0.25, '#ffffff', 0, 0.98, -0.03, 1);
      box(g, 0.26, 0.1, 0.06, '#3d7bff', 0, 0.82, 0.19);
    } else if (kind === 'inv') {
      cyl(g, 0.3, 0.3, 0.03, 8, '#4a3222', 0, 1.06, 0);
      cyl(g, 0.17, 0.2, 0.15, 8, '#4a3222', 0, 1.08, 0);
    } else if (kind === 'suspect') {
      box(g, 0.34, 0.06, 0.06, '#222', 0, 0.86, 0.2); // bandeau "anonymat"
    }
    g.userData.skin = skin;
    return g;
  }

  // ---------- île ----------
  const world = new THREE.Group();
  scene.add(world);
  const islandG = new THREE.CylinderGeometry(26, 25, 2, 44);
  const island = new THREE.Mesh(islandG, [mat('#c99f63'), mat('#7fd06b'), mat('#7fd06b')]);
  island.position.y = -1; island.receiveShadow = true; world.add(island);
  const beach = new THREE.Mesh(new THREE.CylinderGeometry(28.5, 27, 1.4, 44), mat('#f2d49b'));
  beach.position.y = -1.55; beach.receiveShadow = true; world.add(beach);
  const water = new THREE.Mesh(new THREE.CircleGeometry(240, 48), mat('#45b4ee', { roughness: 0.35 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -1.25; world.add(water);
  const foam = new THREE.Mesh(new THREE.RingGeometry(28.4, 29.6, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = -1.2; world.add(foam);

  const flat = (g, c, y) => { const m = new THREE.Mesh(g, mat(c)); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; world.add(m); return m; };
  flat(new THREE.CircleGeometry(19.2, 48), '#d3d8e2', 0.01);           // parvis
  flat(new THREE.RingGeometry(19.2, 22.4, 64), '#4b5060', 0.02);        // route
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const d = box(world, 0.12, 0.02, 0.9, '#f4f4f4', Math.cos(a) * 20.8, 0.02, Math.sin(a) * 20.8);
    d.rotation.y = -a; d.castShadow = false;
  }

  // ---------- décor ----------
  function tree(x, z, s) {
    const t = new THREE.Group();
    cyl(t, 0.18, 0.26, 1.3, 6, '#8a5a35', 0, 0, 0);
    const greens = ['#3fae5a', '#58c26a', '#2f9a4f', '#7dd36b'];
    if (Math.random() < 0.5) ball(t, 1.15, rnd(greens), 0, 2.1, 0, 0);
    else { cyl(t, 0, 1.2, 2.2, 7, rnd(greens), 0, 1.0, 0); cyl(t, 0, 0.9, 1.6, 7, rnd(greens), 0, 2.2, 0); }
    t.position.set(x, 0, z); t.scale.setScalar(s); t.rotation.y = Math.random() * 6;
    world.add(t);
  }
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + Math.random() * 0.12;
    if (Math.abs(a - 3.75) < 0.35) continue; // place du phare
    tree(Math.cos(a) * (23.6 + Math.random() * 1.6), Math.sin(a) * (23.6 + Math.random() * 1.6), 0.7 + Math.random() * 0.4);
  }
  [[-17, -6], [-17.5, 2], [17.5, -8], [16.8, 14], [-6, 16.5], [6, 17.2], [-16, -10]].forEach(([x, z]) => tree(x, z, 0.75));

  const lampMat = mat('#fff3b0', { emissive: '#ffcf55', emissiveIntensity: 0.6 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.26;
    const x = Math.cos(a) * 18.7, z = Math.sin(a) * 18.7;
    cyl(world, 0.07, 0.09, 2.6, 6, '#2b3245', x, 0, z);
    ball(world, 0.22, lampMat, x, 2.75, z, 0);
  }

  // Phare de Parpaing-sur-Mer
  const lh = new THREE.Group();
  for (let i = 0; i < 6; i++) cyl(lh, 1.25 - i * 0.12 - 0.12, 1.25 - i * 0.12, 1.2, 10, i % 2 ? '#ffffff' : '#e63946', 0, i * 1.2, 0);
  cyl(lh, 0.95, 0.95, 0.2, 10, '#2b3245', 0, 7.2, 0);
  cyl(lh, 0.55, 0.55, 0.9, 8, mat('#fff7c2', { emissive: '#ffd84a', emissiveIntensity: 0.9 }), 0, 7.4, 0);
  cyl(lh, 0, 0.75, 0.7, 8, '#e63946', 0, 8.3, 0);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2; beam.position.x = 4.6;
  const beamPivot = new THREE.Group(); beamPivot.position.y = 7.85; beamPivot.add(beam); lh.add(beamPivot);
  lh.position.set(Math.cos(3.75) * 24.4, 0, Math.sin(3.75) * 24.4);
  world.add(lh);

  // Kiosque à donuts "Chez Momo"
  const momo = new THREE.Group();
  box(momo, 2.6, 1.6, 1.8, '#ff8fb8', 0, 0, 0);
  box(momo, 2.9, 0.18, 2.1, '#ffffff', 0, 1.6, 0);
  box(momo, 2.0, 0.6, 0.1, '#5a2a3a', 0, 0.85, 0.92);
  const donut = mesh(momo, new THREE.TorusGeometry(0.75, 0.32, 8, 14), '#e7a35a', 0, 2.55, 0);
  const icing = mesh(momo, new THREE.TorusGeometry(0.75, 0.24, 6, 14), '#ff5fa2', 0, 2.68, 0);
  donut.rotation.x = icing.rotation.x = Math.PI / 2 - 0.5;
  momo.position.set(12.4, 0, -12.6); momo.rotation.y = -0.8;
  world.add(momo);

  // Bancs
  [[-3, 15.5, 0], [3.5, 15.5, 0]].forEach(([x, z]) => { box(world, 1.6, 0.12, 0.5, '#b07a45', x, 0.45, z); box(world, 0.12, 0.45, 0.45, '#2b3245', x - 0.6, 0, z); box(world, 0.12, 0.45, 0.45, '#2b3245', x + 0.6, 0, z); });

  // Vedette de police qui fait des ronds dans l'eau
  const boat = new THREE.Group();
  box(boat, 3, 0.6, 1.2, '#ffffff', 0, -0.2, 0);
  box(boat, 3.02, 0.18, 1.22, '#1b2a5c', 0, 0.2, 0);
  box(boat, 1.1, 0.7, 0.9, '#e8eefc', -0.3, 0.4, 0);
  const bl1 = box(boat, 0.25, 0.15, 0.25, mat('#ff4b5c', { emissive: '#ff2030', emissiveIntensity: 0.2 }), -0.45, 1.1, 0);
  const bl2 = box(boat, 0.25, 0.15, 0.25, mat('#3d7bff', { emissive: '#2050ff', emissiveIntensity: 0.2 }), -0.15, 1.1, 0);
  world.add(boat);

  // ---------- étiquettes, projection, clics ----------
  const tags = [];
  function addTag(x, y, z) {
    const el = document.createElement('div');
    el.className = 'tag';
    tagsBox.appendChild(el);
    const t = { pos: new THREE.Vector3(x, y, z), el, text: '' };
    t.set = html => { if (html !== t.text) { t.text = html; el.innerHTML = html; } };
    t.show = v => { el.hidden = !v; };
    tags.push(t);
    return t;
  }
  const v3 = new THREE.Vector3();
  function project(p) {
    v3.copy(p).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * stage.clientWidth, y: (-v3.y * 0.5 + 0.5) * stage.clientHeight, vis: v3.z < 1 };
  }

  const pickables = [];
  const ray = new THREE.Raycaster();
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
    for (const p of pickables) {
      if (p.obj.visible && ray.intersectObject(p.obj, true).length) { p.cb(e); return; }
    }
  });

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 52 : 36;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  const frames = [];
  const clock = new THREE.Clock();
  let time = 0;
  function loop() {
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;
    if (!controls.autoRotate && (idleT += dt) > 25) controls.autoRotate = true;
    controls.update();
    beamPivot.rotation.y = time * 0.9;
    foam.scale.setScalar(1 + Math.sin(time * 1.3) * 0.012);
    const ba = time * 0.12;
    boat.position.set(Math.cos(ba) * 35, -1.0 + Math.sin(time * 2) * 0.08, Math.sin(ba) * 35);
    boat.rotation.y = -ba;
    const on = Math.floor(time * 4) % 2;
    bl1.material.emissiveIntensity = on ? 1.4 : 0.1; bl2.material.emissiveIntensity = on ? 0.1 : 1.4;
    donut.rotation.z = icing.rotation.z = time * 0.8;
    for (const f of frames) f(dt, time);
    for (const t of tags) {
      if (t.el.hidden) continue;
      const s = project(t.pos);
      t.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
      t.el.style.visibility = s.vis ? '' : 'hidden';
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { THREE, scene, world, camera, controls, mat, geo, mesh, box, cyl, ball, figure, rnd, addTag, project, pickables, onFrame: f => frames.push(f), stage };
})();
