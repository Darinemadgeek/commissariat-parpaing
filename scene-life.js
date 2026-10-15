// Vie du commissariat : synchro avec la partie, animations, personnages qui circulent, patrouilles.
(function () {
  const { THREE, scene, figure, addTag, pickables, onFrame } = S;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Y = 0.2;
  let L = {}, busy = { inv: 0, pts: 0, acc: 0, pla: 0 }, manifOn = false, bounce = 0, probs = {};

  const tags = {
    hq: addTag(-8, 10, -19), cells: addTag(12, 2.7, -10.6), inv: addTag(-11, 2.7, -10.6), pts: addTag(13.5, 2.7, 10.6),
    acc: addTag(-3.6, 2.7, 10.6), pla: addTag(-13.5, 2.7, 10.6), cars: addTag(15, 2.6, -26.5), parp: addTag(1, 4.4, -6.3), clean: addTag(-6, 2.2, 0),
  };
  const anchors = { cells: V(12, 2.4, -6.6), inv: V(-11, 2.2, -5.5), pts: V(13.5, 2.2, 5.5), acc: V(0, 2.2, 5), pla: V(-13.5, 2.2, 5.5), parp: V(1, 3.6, -6.3), hq: V(-8, 10, -13), cars: V(15, 2, -20), clean: V(-6, 1.6, 0) };

  // ---------- passants ----------
  const walkers = [];
  function walk(kind, pts, speed) {
    const f = figure(kind); scene.add(f);
    f.position.copy(pts[0]);
    walkers.push({ f, pts, i: 0, t: 0, sp: speed || 3.4 });
    if (walkers.length > 46) { const w = walkers.shift(); scene.remove(w.f); }
  }
  const P = {
    yard: [V(12, 0.12, -22), V(15.2, 0.12, -14), V(15.2, Y, -10.6), V(15.2, Y, -6.6)],
    out: [V(12, Y, -6.6), V(12, Y, 0), V(0, Y, 0), V(0, Y, 9.6), V(0, 0.12, 13), V(7, 0.06, 18.5), V(34, 0.06, 25)],
  };
  S.arrive = () => {
    walk('cop', [...P.yard, V(9, Y, -6.6)], 3.2);
    walk('suspect', [V(11, 0.12, -22.6), V(14.4, 0.12, -14), V(14.4, Y, -10.6), V(14.4, Y, -6.9), V(8.4, Y, -6.9)], 3.2);
  };
  S.release = () => walk('suspect', P.out, 3.8);
  S.toPts = () => walk('suspect', [V(9, Y, -6.6), V(12, Y, -6.6), V(12, Y, 0), V(13.2, Y, 0), V(13.2, Y, 2.2), V(11, Y, 3.2)], 3.4);
  S.citizenIn = () => walk('civ', [V(-34, 0.06, 25), V(-7, 0.06, 18), V(0, 0.12, 13), V(0, Y, 10), V(0, Y, 8.6)], 3.8);
  S.toPlaintes = () => walk('civ', [V(-3, Y, 4.6), V(-6, Y, 5.4), V(-8.6, Y, 5.4), V(-10.5, Y, 6.4)], 3.2);
  S.angry = () => walk('civ', [V(0, Y, 8.6), V(0, Y, 10.6), V(0, 0.12, 13), V(-8, 0.06, 18.5), V(-34, 0.06, 25)], 5.5);
  S.parpaingHit = () => { bounce = 1; };
  const dummy = new THREE.Object3D(); dummy.visible = false;
  pickables.push({ get obj() { return S.B ? S.B.parp.g : dummy; }, cb: () => S.onParpaing && S.onParpaing() });

  // ---------- changement de commissariat ----------
  S.setSite = (site) => {
    S.world.build(site.biome);
    S.building.build(site.style, site.name);
    L = {}; walkers.splice(0).forEach(w => scene.remove(w.f));
  };

  // ---------- synchro ----------
  const changed = (k, v) => { if (L[k] === v) return false; L[k] = v; return true; };
  const showN = (arr, n) => arr.forEach((o, i) => { o.visible = i < n; });
  function sync(v) {
    const R = S.B; if (!R) return;
    probs = v.probs;
    if (changed('tier', v.tier)) {
      const n = Math.min(2 + v.tier, 10), t = v.tier;
      R.floors.forEach((f, i) => { f.visible = i < n; });
      R.roof.position.y = n * 3;
      R.roofSign.visible = t >= 1; R.antenna.visible = t >= 2; R.pad.visible = t >= 3; R.annex.visible = t >= 4; R.statue.visible = t >= 5; R.gold.visible = t >= 6;
      tags.hq.pos.y = n * 3 + (t >= 3 ? 3.4 : 2.2); anchors.hq.y = n * 3;
    }
    if (changed('cells', v.cells) | changed('occ', v.occ) | changed('cap', v.cellCap) | changed('smelly', v.smelly) | changed('vips', v.vips)) {
      let rem = v.occ, stink = v.smelly, vips = v.vips || 0;
      R.cells.forEach(c => { c.userData.vip.visible = false; });
      R.cells.forEach((c, i) => {
        c.visible = i < v.cells;
        const n = c.visible ? Math.min(v.cellCap, rem) : 0; rem -= n;
        c.userData.figs.forEach((f, j) => { // les gardés à vue qui puent des pieds dégagent une fumée verte
          f.visible = j < Math.min(n, 4);
          f.userData.puffs.visible = f.visible && stink > 0; if (f.userData.puffs.visible) stink--;
        });
        if (n > 0 && vips > 0) { c.userData.vip.visible = true; c.userData.figs[0].visible = false; vips--; }
      });
      R.ext.visible = v.cells > 12;
      const nx = R.cells[v.cells];
      if (nx) { R.ghost.visible = true; nx.getWorldPosition(R.ghost.position); R.ghost.position.y = Y + 0.8; } else R.ghost.visible = false;
    }
    if (changed('hall', v.hall)) showN(R.hallSus, v.hall);
    if (changed('inv', v.inv)) showN(R.desks, v.inv);
    if (changed('pts', v.pts) | changed('masks', v.masks) | changed('down', v.ptsDown)) {
      showN(R.kiosks, v.pts);
      const vis = Math.min(v.pts, R.kiosks.length);
      R.kiosks.forEach((k, i) => {
        const f = k.userData.f, down = i >= vis - v.ptsDown && i < vis;
        f.userData.mask.visible = probs.pieds && i < v.masks;
        f.rotation.x = down ? -Math.PI / 2 : 0; f.position.y = down ? 0.45 : Y; f.position.z = down ? -1.0 : -0.6;
        k.userData.down = down;
      });
    }
    if (changed('accB', v.accBuilt)) { R.acc.visible = v.accBuilt; R.accSite.visible = !v.accBuilt; tags.acc.show(v.accBuilt); }
    if (changed('plaB', v.plaBuilt)) { R.pla.visible = v.plaBuilt; R.plaSite.visible = !v.plaBuilt; tags.pla.show(v.plaBuilt); }
    if (changed('acc', v.acc)) R.guichets.forEach((g, i) => { g.f.visible = i < v.acc; });
    if (changed('pla', v.pla)) showN(R.plaDesks, v.pla);
    if (changed('q', v.queueCit)) showN(R.queue, v.accBuilt ? v.queueCit : 0);
    if (changed('pile', v.plaQueue)) showN(R.pile, Math.min(v.plaQueue, R.pile.length));
    if (changed('cars', v.patrols)) { showN(R.cars, Math.min(Math.ceil(v.patrols / 2), 8)); showN(R.parked, Math.min(Math.floor(v.patrols / 2), 8)); }
    if (changed('pb', v.ptsBusy)) R.kiosks.forEach((k, i) => { k.userData.s.visible = i < v.ptsBusy; k.userData.scr.material = i < v.ptsBusy ? S.mat('#7fe3ff', { emissive: '#3fd0ff', emissiveIntensity: 0.9 }) : S.mat('#1d2433'); });
    if (changed('ib', v.invBusy)) R.desks.forEach((d, i) => { d.userData.scr.material = i < v.invBusy ? S.mat('#7fe3ff', { emissive: '#3fd0ff', emissiveIntensity: 0.9 }) : S.mat('#1d2433'); });
    if (changed('lb', v.plaBusy)) R.plaDesks.forEach((d, i) => { d.userData.c.visible = i < v.plaBusy; });
    if (changed('med', v.medals)) showN(R.parp.medals, v.medals);
    if (changed('vom', probs.vomi ? v.vomit : 0)) showN(R.puddles, Math.min(L.vom, R.puddles.length));
    if (changed('cln', probs.vomi ? v.clean : 0)) showN(R.cleaners, Math.min(L.cln, R.cleaners.length));
    if (changed('law', probs.delai ? v.lawyers : 0)) showN(R.lawyers, Math.min(L.law, R.lawyers.length));
    if (changed('manif', v.manif)) { manifOn = v.manif; showN(R.demo, v.manif ? R.demo.length : 0); }
    if (changed('ip', probs.interpretes ? v.interpBusy : 0)) showN(R.interps, L.ip);
    if (changed('meet', probs.reunion ? v.meeting : 0) | changed('inv2', v.inv)) {
      showN(R.meet, Math.min(L.meet, R.meet.length));
      R.desks.forEach((d, i) => { d.userData.f.visible = !(i < L.meet); }); // ceux qui sont en réunion quittent leur bureau
    }
    if (changed('papa', probs.vip ? Math.min(2 + (v.vips || 0) * 2, R.papa.length) : 0)) showN(R.papa, L.papa);
    R.colis.visible = !!v.colis;
    S.world.storm = !!v.storm;
    tags.clean.show(!!probs.vomi);
    R.coffee.visible = v.up.coffee > 0; R.tickets.visible = v.up.tickets > 0; R.poster.visible = v.up.com > 0;
    busy = { inv: v.invBusy, pts: v.ptsBusy, acc: v.accBusy, pla: v.plaBusy };
  }

  // ---------- animation ----------
  const loop = [[-30, 18], [30, 18], [30, -30], [-30, -30]];
  const seg = loop.map((p, i) => { const q = loop[(i + 1) % 4]; return { p, q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) }; });
  const PER = seg.reduce((s, x) => s + x.len, 0);
  function along(d) {
    d = ((d % PER) + PER) % PER;
    for (const s of seg) { if (d <= s.len) { const k = d / s.len, dx = s.q[0] - s.p[0], dz = s.q[1] - s.p[1]; return { x: s.p[0] + dx * k, z: s.p[1] + dz * k, a: Math.atan2(-dz, dx) }; } d -= s.len; }
    return { x: 0, z: 0, a: 0 };
  }
  onFrame((dt, t) => {
    const R = S.B; if (!R) return;
    const on = Math.floor(t * 4) % 2;
    const gr = S.mat('#ff4b5c', { emissive: '#ff2030', emissiveIntensity: 1 }), gb = S.mat('#3d7bff', { emissive: '#2050ff', emissiveIntensity: 1 });
    gr.emissiveIntensity = on ? 1.6 : 0.1; gb.emissiveIntensity = on ? 0.1 : 1.6;
    R.blink.visible = Math.floor(t * 1.5) % 2 === 0;
    if (R.pad.visible) R.rotor.rotation.y = t * 9;
    for (const c of R.cars) {
      if (!c.visible) continue;
      c.userData.d += c.userData.sp * dt;
      const p = along(c.userData.d); c.position.set(p.x, 0.05, p.z); c.rotation.y = p.a;
    }
    const bob = (list, n, k, key) => { for (let i = 0; i < Math.min(n, list.length); i++) { const it = list[i], f = it.userData ? it.userData.f : it.f; if (!f || (it.userData && it.userData.down)) continue; f.position.y = (k || Y) + Math.abs(Math.sin(t * 7 + i * 1.7)) * 0.07; } };
    bob(R.desks, busy.inv, Y + 0.2); bob(R.kiosks, busy.pts); bob(R.guichets, busy.acc); bob(R.plaDesks, busy.pla);
    R.queue.forEach((q, i) => { if (q.visible) q.position.y = Y + Math.abs(Math.sin(t * 2 + i)) * 0.04; });
    R.cleaners.forEach(f => {
      if (!f.visible) return;
      const [a, b] = f.userData.lane, s = Math.sin(t * 0.22 + f.userData.ph);
      f.position.x = a + (b - a) * (0.5 + 0.5 * s);
      f.rotation.y = Math.cos(t * 0.22 + f.userData.ph) > 0 ? Math.PI / 2 : -Math.PI / 2;
      f.userData.swing.rotation.y = Math.sin(t * 6) * 0.35;
    });
    S.people.puffs(R.cells.flatMap(c => (c.visible ? c.userData.figs : [])), t);
    if (manifOn) R.demo.forEach((f, i) => { f.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.3; });
    R.papa.forEach((f, i) => { if (f.visible) f.userData.flash.visible = Math.sin(t * 9 + i * 2.3) > 0.93; });
    if (R.colis.visible) R.colisLamp.visible = Math.floor(t * 4) % 2 === 0;
    for (let i = walkers.length - 1; i >= 0; i--) {
      const w = walkers[i], a = w.pts[w.i], b = w.pts[w.i + 1];
      if (!b) { scene.remove(w.f); walkers.splice(i, 1); continue; }
      w.t += (dt * w.sp) / Math.max(0.01, a.distanceTo(b));
      if (w.t >= 1) { w.i++; w.t = 0; continue; }
      w.f.position.lerpVectors(a, b, w.t); w.f.position.y += Math.abs(Math.sin(t * 12)) * 0.12;
      w.f.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    }
    const P = R.parp;
    if (bounce > 0) {
      bounce = Math.max(0, bounce - dt * 3.5);
      const s = Math.sin(bounce * Math.PI);
      P.body.scale.set(1 + s * 0.12, 1 - s * 0.16, 1 + s * 0.12); P.arm.rotation.z = s * 1.6;
    } else { P.body.scale.set(1, 1 + Math.sin(t * 2) * 0.015, 1); P.arm.rotation.z = 0.2 + Math.sin(t * 1.5) * 0.08; }
  });

  S.sync = sync;
  S.tags = tags;
  S.anchors = anchors;
})();
