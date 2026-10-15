// Scène 3D : moteur, outils de modélisation low-poly, personnages, étiquettes et clics.
window.S = (function () {
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('gl');
  const tagsBox = document.getElementById('tags');

  // Téléphones : résolution et ombres réduites pour ménager la mémoire graphique
  const LOW = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 820;
  function fatal(msg) {
    if (document.getElementById('fatal')) return;
    const d = document.createElement('div'); d.id = 'fatal'; d.className = 'fatal';
    d.innerHTML = `<p>${msg}</p><button type="button">Relancer le jeu</button>`;
    d.querySelector('button').onclick = () => location.reload();
    stage.appendChild(d);
  }
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'default' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (e) {
    renderer = null;
    fatal("Ce navigateur n'arrive pas à afficher la 3D (WebGL indisponible). Essayez avec Chrome à jour, ou réactivez l'accélération matérielle.");
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fatal('La 3D s\'est mise en pause : le téléphone a manqué de mémoire graphique. Votre partie est sauvegardée.'); });
  canvas.addEventListener('webglcontextrestored', () => location.reload());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a8dcff');
  scene.fog = new THREE.Fog('#a8dcff', 110, 260);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 600);
  camera.position.set(36, 40, 50);
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.set(0, 0, -1);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 18;
  controls.maxDistance = 115;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.3;
  // on reste côté façade : la tour administrative (derrière) ne cache jamais les pièces
  controls.minAzimuthAngle = -1.25;
  controls.maxAzimuthAngle = 1.25;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;
  let idleT = 0, userMoved = false;
  controls.addEventListener('start', () => { controls.autoRotate = false; idleT = 0; userMoved = true; });

  const hemi = new THREE.HemisphereLight('#e4f4ff', '#5d7d3c', 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d4', 0.85);
  sun.position.set(34, 56, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 160 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  function setSky(o) {
    scene.background.set(o.sky); scene.fog.color.set(o.sky);
    scene.fog.near = o.fogNear || 110; scene.fog.far = o.fogFar || 260;
    hemi.color.set(o.hemiSky || '#e4f4ff'); hemi.groundColor.set(o.hemiGround || '#5d7d3c'); hemi.intensity = o.hemi || 0.8;
    sun.color.set(o.sun || '#fff0d4'); sun.intensity = o.sunI || 0.85;
  }

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
  const flat = (p, w, d, c, x, y, z) => { const m = mesh(p, geo(`p${w}_${d}`, () => new THREE.PlaneGeometry(w, d)), c, x, y, z); m.rotation.x = -Math.PI / 2; m.castShadow = false; return m; };
  function sign(parent, text, w, h, bg, fg, x, y, z, ry) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(32, Math.round(512 * h / w));
    const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = c.height * 0.62; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`;
    while (g.measureText(text).width > c.width * 0.9 && fs > 10) { fs -= 2; g.font = `900 ${fs}px "Arial Black", Arial, sans-serif`; }
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, fog: true }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m);
    return m;
  }
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const rr = (a, b) => a + Math.random() * (b - a);

  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];
  const CIV = ['#e85d75', '#5bc0eb', '#9bc53d', '#fde74c', '#c879ff', '#ff9f1c', '#2ec4b6'];
  // Petit bonhomme : suspect | inv | pts | cop | civ | acc | pla | clean | demo
  function figure(kind) {
    const g = new THREE.Group();
    const bodyC = { suspect: '#ff7b1c', inv: '#a8743f', pts: '#f4f6fb', cop: '#22336e', acc: '#7fb0ff', pla: '#2c3f86', clean: '#3fae5a', avocat: '#1a1a1a', interp: '#ffd23f', vip: '#ffc93c', papa: '#3a3a3a' }[kind] || rnd(CIV);
    if (kind === 'avocat') { box(g, 0.2, 0.24, 0.06, '#ffffff', 0, 0.46, 0.27); box(g, 0.42, 0.3, 0.1, '#5a3a22', 0.36, 0.12, 0); }
    if (kind === 'interp') { box(g, 0.5, 0.06, 0.06, '#1d2433', 0, 1.14, 0); box(g, 0.08, 0.18, 0.12, '#1d2433', -0.24, 0.92, 0); box(g, 0.08, 0.18, 0.12, '#1d2433', 0.24, 0.92, 0); }
    if (kind === 'vip') { box(g, 0.36, 0.08, 0.06, '#111111', 0, 0.96, 0.2); box(g, 0.3, 0.05, 0.05, '#fff2a8', 0, 0.62, 0.25); }
    if (kind === 'papa') { box(g, 0.3, 0.22, 0.2, '#111522', 0, 0.72, 0.3); const fl = box(g, 0.14, 0.08, 0.08, mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 2 }), 0, 0.88, 0.38); fl.visible = false; g.userData.flash = fl; }
    cyl(g, 0.24, 0.32, 0.72, 7, bodyC, 0, 0, 0);
    ball(g, 0.22, rnd(SKIN), 0, 0.92, 0, 1);
    if (kind === 'cop' || kind === 'acc') {
      cyl(g, 0.2, 0.2, 0.12, 8, '#1b2a5c', 0, 1.06, 0);
      box(g, 0.3, 0.03, 0.14, '#111522', 0, 1.06, 0.18);
    } else if (kind === 'pts') {
      ball(g, 0.25, '#ffffff', 0, 0.98, -0.03, 1);
      const mask = new THREE.Group(); g.add(mask);
      box(mask, 0.36, 0.2, 0.12, '#2b3245', 0, 0.82, 0.18);
      cyl(mask, 0.09, 0.09, 0.12, 8, '#8a93a6', 0, 0.8, 0.28).rotation.x = Math.PI / 2;
      box(mask, 0.3, 0.1, 0.06, '#9fd3ff', 0, 0.94, 0.2);
      mask.visible = false; g.userData.mask = mask;
    } else if (kind === 'inv') {
      cyl(g, 0.3, 0.3, 0.03, 8, '#4a3222', 0, 1.06, 0);
      cyl(g, 0.17, 0.2, 0.15, 8, '#4a3222', 0, 1.08, 0);
    } else if (kind === 'suspect') {
      box(g, 0.34, 0.06, 0.06, '#222', 0, 0.86, 0.2);
    } else if (kind === 'clean') {
      cyl(g, 0.22, 0.22, 0.1, 8, '#1f6b35', 0, 1.06, 0);
      cyl(g, 0.03, 0.03, 1.3, 5, '#b07a45', 0.3, 0.05, 0.25).rotation.z = 0.25;
      box(g, 0.34, 0.08, 0.16, '#d8f5df', 0.48, 0.04, 0.25);
    } else if (kind === 'demo') {
      cyl(g, 0.025, 0.025, 1.2, 5, '#b07a45', 0.32, 0.4, 0);
      box(g, 0.7, 0.45, 0.04, rnd(['#ffffff', '#ffe066', '#ffb3c1']), 0.32, 1.45, 0);
    }
    return g;
  }

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
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
    for (const p of pickables) {
      if (p.obj.visible && ray.intersectObject(p.obj, true).length) { p.cb(e); return; }
    }
  });

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    if (renderer) renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 54 : w / h < 1.4 ? 44 : 36;
    camera.updateProjectionMatrix();
    // téléphone en portrait : vue plus plongeante, tant que le joueur n'a pas bougé la caméra
    if (!userMoved) { if (w / h < 1) camera.position.set(20, 66, 40); else camera.position.set(36, 40, 50); }
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
    if (controls.autoRotate) { // aller-retour devant le bâtiment
      const az = controls.getAzimuthalAngle(), sp = Math.abs(controls.autoRotateSpeed);
      if (az > controls.maxAzimuthAngle - 0.05) controls.autoRotateSpeed = sp;
      else if (az < controls.minAzimuthAngle + 0.05) controls.autoRotateSpeed = -sp;
    }
    controls.update();
    for (const f of frames) f(dt, time);
    for (const t of tags) {
      if (t.el.hidden) continue;
      const s = project(t.pos);
      t.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;
      t.el.style.visibility = s.vis ? '' : 'hidden';
    }
    if (renderer) renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { THREE, scene, camera, controls, renderer, low: LOW, mat, geo, mesh, box, cyl, ball, flat, sign, figure, rnd, rr, addTag, project, pickables, setSky, onFrame: f => frames.push(f), stage };
})();
