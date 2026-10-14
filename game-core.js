// Cœur du jeu : état, simulation, problèmes des commissariats, prime et étoiles, achats, sauvegarde.
window.GM = (function () {
  const { T, UNITS, UPGRADES, BUILDINGS, tier, site } = PD;
  const SAVE_KEY = 'commissaire-parpaing-v1'; // même clé qu'avant : les parties en cours sont reprises
  const G = {};
  const ui = { float() {}, toast() {}, pv() {}, fx: { arrive: 0, release: 0, citizen: 0, toPla: 0, angry: 0, toPts: 0 } };

  const newWeek = no => ({ no, t: 0, gav: 0, sig: 0, unsig: 0, pla: 0, recus: 0, partis: 0, lost: 0, earned: 0, levees: 0, malaises: 0, cleanSum: 0 });
  function fresh(keep) {
    keep = keep || {};
    return {
      ver: 2, money: keep.money || 0, runEarned: 0, stars: keep.stars || 0, medals: keep.medals || 0,
      site: keep.site || 0, cstars: 0, galons: keep.galons || 0, siteStars: keep.siteStars || [],
      n: { patrols: 1, cells: 1, inv: 1, pts: 1, acc: 1, pla: 1, clean: 1, masks: 0 },
      up: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      built: { accueil: false, plaintes: false },
      tier: 0, det: [], hall: 0, cit: 0, citT: 0, plaQ: 0, plaW: [], pistes: 0,
      vomit: 0, cleanT: 0, ptsDown: [], manifIn: T.MANIF_EVERY, manifLeft: 0,
      acc: { patrol: 0, cit: 0 },
      week: newWeek(1), objective: T.OBJ_START, buffs: [], pending: null,
      total: keep.total || { gav: 0, pla: 0, primes: 0 }, goldenIn: 40, lastSave: Date.now(), rateEst: 0,
    };
  }
  function reset(obj) { for (const k of Object.keys(G)) delete G[k]; Object.assign(G, obj); }
  reset(fresh());

  // ---------- dérivés ----------
  let perf = 0, earnedLog = [];
  const here = () => site(G.site);
  const has = p => here().problems.includes(p);
  const hardK = () => 1 + 0.25 * (here().hard || 0);
  const buffOn = id => G.buffs.some(b => b.id === id);
  const valMult = () => Math.pow(1.6, G.tier) * (1 + 0.3 * G.up.lrp) * (1 + 0.1 * G.stars) * (1 + 0.5 * G.galons) * Math.pow(2, here().hard || 0) * (buffOn('prefet') ? 5 : 1);
  const turbo = () => (buffOn('turbo') ? 3 : 1);
  const maxime = () => (buffOn('maxime') ? 1.5 : 1); // Maxime a fait ses dossiers parquet
  const cellCap = () => 2 + G.up.beds;
  const capacity = () => G.n.cells * cellCap();
  const hallCap = () => T.HALL + 4 * G.up.hall + 10 * G.up.xxl;
  const gavValue = () => T.GAV_VALUE * valMult();
  const plaValue = () => T.PLAINTE_VALUE * valMult();
  const tamponValue = () => Math.max(1, gavValue() * 0.12) * Math.pow(2, G.up.stamp);
  const propre = () => Math.max(0, 1 - G.vomit * 0.04);
  const slip = () => (has('vomi') ? 1 - Math.min(0.6, G.vomit * 0.03) : 1);
  const gavLimit = () => T.GAV_LIMIT * (1 + 0.25 * G.up.parquet);
  const unitCost = (u, k) => u.base * Math.pow(u.g, G.n[u.id] - u.start + (k || 0));
  const upCost = u => u.base * Math.pow(u.g, G.up[u.id]);
  const unitOn = u => (!u.needs || G.built[u.needs]) && (!u.prob || has(u.prob));
  const upOn = u => (!u.needs || G.built[u.needs]) && (!u.prob || has(u.prob));
  function bulk(u, x) {
    let cost = 0, k = 0;
    const lim = x === 'max' ? 1000 : x;
    while (k < lim) { const c = unitCost(u, k); if (x === 'max' && cost + c > G.money) break; cost += c; k++; }
    return { k, cost };
  }
  const sigRate = w => (w.gav ? w.sig / w.gav : null);
  const satRate = w => (w.recus + w.partis ? w.recus / (w.recus + w.partis) : null);
  const cleanRate = w => (w.t > 0 ? w.cleanSum / w.t : 1);
  // Les 3 étoiles d'une semaine : objectif de dossiers, signalisation, critère du commissariat
  function weekStars(w) {
    const r = sigRate(w), id = here().star3.id, any = w.gav > 0;
    const s1 = w.gav + w.pla >= G.objective;
    const s2 = r !== null && r >= 0.95;
    let s3 = false;
    if (id === 'sat') { const s = satRate(w); s3 = s !== null && s >= 0.9; }
    else if (id === 'clean') s3 = any && cleanRate(w) >= 0.9;
    else if (id === 'faint') s3 = any && w.malaises === 0;
    else if (id === 'levee') s3 = any && w.levees === 0;
    else if (id === 'lost') s3 = any && w.lost === 0;
    return [s1, s2, s3];
  }
  function primeCalc(w) {
    const r = sigRate(w), s = satRate(w), st = weekStars(w), n = st.filter(Boolean).length;
    const q = r === null ? 1 : r >= 0.95 ? 1 : r >= 0.85 ? 0.6 : r >= 0.7 ? 0.3 : 0;
    const sat = s === null ? 1 : 0.5 + 0.5 * s;
    const dossiers = w.gav + w.pla, quota = st[0];
    // pas de jauge pleine, pas de prime ; la qualité PTS et les usagers en modulent le montant
    const prime = quota ? w.earned * T.PRIME_BASE * 2 * q * sat * (1 + 0.25 * n) * (1 + 0.15 * G.up.crois) : 0;
    return { prime, q, sat, quota, dossiers, r, s, st, n };
  }

  // ---------- simulation ----------
  function earn(v, zone, cls) {
    G.money += v; G.runEarned += v; G.week.earned += v;
    earnedLog.push([perf, v]);
    if (zone) ui.float(zone, '+' + PD.eur(v), cls);
  }
  function newDet() {
    const k = hardK();
    return {
      e: 0, p: 0, t: 0,
      drunk: has('vomi') && Math.random() < T.DRUNK * k,
      smelly: has('pieds') && Math.random() < T.SMELLY * Math.pow(0.8, G.up.deo) * k,
      lawyer: has('delai') && Math.random() < T.LAWYER * k,
    };
  }
  let lostFlash = 0;
  function step(dt) {
    perf += dt;
    G.buffs = G.buffs.filter(b => b.until > perf);
    const W = G.week, fx = ui.fx;

    // Manifestations : vagues d'interpellations
    let manif = 1;
    if (has('manif')) {
      if (G.manifLeft > 0) { G.manifLeft -= dt; manif = T.MANIF_MULT; if (G.manifLeft <= 0) ui.toast('Fin de la manif. Les pancartes rentrent à la maison.'); }
      else if ((G.manifIn -= dt) <= 0) { G.manifIn = T.MANIF_EVERY * (0.8 + Math.random() * 0.4); G.manifLeft = T.MANIF_LEN; ui.toast('Manifestation ! Les interpellations arrivent par cars entiers.'); }
    }

    // Patrouilles (deux fois plus vite avec des pistes)
    const pRate = (G.n.patrols / T.PATROL_TIME) * (1 + 0.25 * G.up.gyro) * (buffOn('bac') ? 4 : 1) * (G.pistes > 0 ? 2 : 1) * manif;
    G.acc.patrol += pRate * dt;
    while (G.acc.patrol >= 1) {
      G.acc.patrol -= 1;
      if (G.pistes > 0) G.pistes--;
      if (G.det.length < capacity()) { G.det.push(newDet()); fx.arrive++; }
      else if (G.hall < hallCap()) { G.hall++; fx.arrive++; }
      else { W.lost++; lostFlash = 6; }
    }
    while (G.hall > 0 && G.det.length < capacity()) { G.hall--; G.det.push(newDet()); }

    const sl = slip();
    // Enquêteurs : les GAV les plus anciennes d'abord ; les avocats font traîner
    const eSp = ((1 + 0.25 * G.up.coffee) * turbo() * sl) / T.ENQ_TIME;
    const lawK = Math.min(1, T.LAWYER_SLOW + 0.1 * G.up.avocat);
    let ib = 0;
    for (const d of G.det) { d.t += dt; if (ib < G.n.inv) { d.e += eSp * dt * (d.lawyer ? lawK : 1); ib++; } }

    // PTS : on finit ce qui est commencé, puis on prend les derniers arrivés.
    // Sur une GAV qui pue des pieds, un agent sans masque ralentit et risque le malaise.
    G.ptsDown = G.ptsDown.map(x => x - dt).filter(x => x > 0);
    const avail = Math.max(0, G.n.pts - G.ptsDown.length);
    let masks = Math.min(G.n.masks, avail), pb = 0;
    const pSp = ((1 + 0.3 * G.up.bio) * turbo() * maxime() * sl) / T.PTS_TIME;
    const work = d => {
      let sp = pSp;
      if (d.smelly) {
        if (masks > 0) masks--;
        else { sp *= T.UNMASKED; if (Math.random() < T.FAINT_RATE * dt) { G.ptsDown.push(T.FAINT_TIME); W.malaises++; ui.float('pts', 'Malaise à la PTS !', 'bad'); } }
      }
      if (d.p === 0) fx.toPts++;
      d.p = Math.min(1, d.p + sp * dt); pb++;
    };
    for (const d of G.det) if (d.p > 0 && d.p < 1 && pb < avail) work(d);
    for (let i = G.det.length - 1; i >= 0 && pb < avail; i--) if (G.det[i].p === 0) work(G.det[i]);
    G._invBusy = ib; G._ptsBusy = pb;

    const lim = gavLimit();
    for (let i = G.det.length - 1; i >= 0; i--) {
      const d = G.det[i];
      if (d.e >= 1) {
        G.det.splice(i, 1); W.gav++; G.total.gav++;
        if (d.p >= 1) W.sig++; else W.unsig++;
        earn(gavValue(), 'cells', d.p >= 1 ? '' : 'bad'); fx.release++;
      } else if (has('delai') && d.t > lim) {
        G.det.splice(i, 1); W.levees++; fx.release++;
        ui.float('cells', 'GAV levée : délai dépassé', 'bad');
      }
    }

    // Vomi et ménage
    if (has('vomi')) {
      for (const d of G.det) if (d.drunk && Math.random() < dt / T.VOMIT_EVERY && G.vomit < T.VOMIT_MAX) G.vomit++;
      if (G.vomit > 0) {
        G.cleanT += (dt * G.n.clean * (1 + 0.3 * G.up.mop) * turbo()) / T.CLEAN_TIME;
        while (G.cleanT >= 1 && G.vomit > 0) { G.cleanT -= 1; G.vomit--; }
      } else G.cleanT = 0;
      W.cleanSum += propre() * dt;
    } else W.cleanSum += dt;

    // Accueil
    let ab = 0;
    if (G.built.accueil) {
      const cRate = (1 / T.CITIZEN_TIME) * (1 + 0.4 * G.tier) * (1 + 0.3 * G.up.com) * Math.max(1, Math.sqrt(G.n.acc));
      G.acc.cit += cRate * dt;
      while (G.acc.cit >= 1) {
        G.acc.cit -= 1;
        if (G.cit < hallCap() + 6) { G.cit++; fx.citizen++; } else { W.partis++; fx.angry++; }
      }
      const aSp = (G.n.acc * (1 + 0.3 * G.up.tickets) * turbo()) / T.ACC_TIME;
      if (G.cit > 0) {
        ab = Math.min(G.n.acc, G.cit);
        G.citT += aSp * dt * (ab / G.n.acc);
        while (G.citT >= 1 && G.cit > 0) {
          G.citT -= 1; G.cit--; W.recus++;
          if (G.built.plaintes) { G.plaQ++; fx.toPla++; } else earn(plaValue() * 0.2, 'acc');
        }
      } else G.citT = 0;
    }
    G._accBusy = ab;

    // Bureau des plaintes
    let lb = 0;
    if (G.built.plaintes) {
      while (G.plaW.length < G.n.pla && G.plaQ > 0) { G.plaQ--; G.plaW.push(0); }
      const lSp = ((1 + 0.3 * G.up.form) * turbo() * sl) / T.PLA_TIME;
      lb = G.plaW.length;
      for (let i = G.plaW.length - 1; i >= 0; i--) {
        G.plaW[i] += lSp * dt;
        if (G.plaW[i] >= 1) {
          G.plaW.splice(i, 1); W.pla++; G.total.pla++;
          earn(plaValue(), 'pla', 'blue');
          if (Math.random() < T.PISTE_CHANCE && G.pistes < T.PISTE_MAX) G.pistes++;
        }
      }
    }
    G._plaBusy = lb;

    W.t += dt;
    if (W.t >= T.DAY_LEN * 7) endWeek();
    G.goldenIn -= dt;
    lostFlash = Math.max(0, lostFlash - dt);
    while (earnedLog.length && earnedLog[0][0] < perf - 20) earnedLog.shift();
  }

  function endWeek() {
    const w = G.week, p = primeCalc(w);
    if (G.pending) collect();
    const before = G.cstars;
    G.cstars += p.n;
    G.pending = { no: w.no, ...p, gav: w.gav, sig: w.sig, pla: w.pla, lost: w.lost, recus: w.recus, partis: w.partis, earned: w.earned, objective: G.objective, levees: w.levees, malaises: w.malaises, clean: cleanRate(w), crit3: here().star3.label };
    if (p.quota) G.objective = Math.ceil(Math.max(G.objective * 1.2, p.dossiers * 1.05));
    else G.objective = Math.max(T.OBJ_START, Math.ceil(G.objective * 0.9));
    if (p.n === 3) G.medals = Math.min(G.medals + 1, 6);
    G.week = newWeek(w.no + 1);
    ui.pv();
    if (before < T.STARS_TO_MOVE && G.cstars >= T.STARS_TO_MOVE) setTimeout(() => ui.toast(`${T.STARS_TO_MOVE} étoiles ! Une mutation est possible : ouvrez la carte.`), 1500);
  }
  function collect() {
    if (!G.pending) return 0;
    const v = G.pending.prime;
    if (v > 0) { G.money += v; G.runEarned += v; G.total.primes += v; }
    G.pending = null;
    return v;
  }

  // ---------- achats ----------
  function buyUnit(id, x) {
    const u = UNITS.find(q => q.id === id), b = bulk(u, x);
    if (!b.k || b.cost > G.money) return 0;
    G.money -= b.cost; G.n[id] += b.k; return b.k;
  }
  function buyUp(id) {
    const u = UPGRADES.find(q => q.id === id), c = upCost(u);
    if (c > G.money) return false;
    G.money -= c; G.up[id]++; return true;
  }
  function build(id) {
    const b = BUILDINGS.find(q => q.id === id);
    if (G.built[id] || b.cost > G.money || (b.needs && !G.built[b.needs])) return false;
    G.money -= b.cost; G.built[id] = true; return true;
  }
  function upTier() {
    const nt = tier(G.tier + 1);
    if (nt.cost > G.money) return false;
    G.money -= nt.cost; G.tier++; return true;
  }
  const canMove = () => G.cstars >= T.STARS_TO_MOVE;
  function move() {
    if (!canMove()) return false;
    const ss = G.siteStars.slice(); ss[G.site] = G.cstars;
    reset(fresh({ stars: G.stars, medals: G.medals, galons: G.galons + 1, siteStars: ss, total: G.total, site: G.site + 1, money: 300 * (G.galons + 1) }));
    return true;
  }
  function tampon() {
    const v = tamponValue();
    earn(v, 'parp');
    const d = G.det[0], k = 0.06 * Math.pow(1.5, G.up.stamp);
    if (d) { d.e = Math.min(1, d.e + k); if (d.p > 0) d.p = Math.min(1, d.p + k); }
    return v;
  }
  // débits par minute : ce que les enquêteurs bouclent, ce que la PTS peut signaliser
  const invPerMin = () => (60 * G.n.inv * (1 + 0.25 * G.up.coffee) * turbo() * slip()) / T.ENQ_TIME;
  const ptsPerMin = () => (60 * Math.max(0, G.n.pts - G.ptsDown.length) * (1 + 0.3 * G.up.bio) * turbo() * maxime() * slip()) / T.PTS_TIME;
  const rate = () => earnedLog.reduce((s, e) => s + e[1], 0) / Math.min(20, Math.max(5, perf));

  // ---------- sauvegarde ----------
  function save() {
    G.lastSave = Date.now(); G.rateEst = rate();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* stockage indisponible */ }
  }
  function load(data) {
    let d = data;
    if (!d) { try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; } }
    if (!d || typeof d !== 'object' || !d.n) return false;
    const f = fresh();
    const m = Object.assign(f, d, {
      ver: 2, n: Object.assign(f.n, d.n), up: Object.assign(f.up, d.up), built: Object.assign(f.built, d.built),
      week: Object.assign(newWeek(1), d.week), total: Object.assign(f.total, d.total), acc: Object.assign(f.acc, d.acc), buffs: [],
      siteStars: Array.isArray(d.siteStars) ? d.siteStars : [], ptsDown: Array.isArray(d.ptsDown) ? d.ptsDown : [],
    });
    m.det = (Array.isArray(d.det) ? d.det : []).map(x => ({ e: +x.e || 0, p: +x.p || 0, t: +x.t || 0, drunk: !!x.drunk, smelly: !!x.smelly, lawyer: !!x.lawyer }));
    m.plaW = Array.isArray(d.plaW) ? d.plaW : [];
    if (m.pending && !(m.pending.prime >= 0)) m.pending = null;
    if (m.pending && !m.pending.st) { m.money += m.pending.prime || 0; m.pending = null; } // PV de l'ancienne version : prime versée
    reset(m);
    return true;
  }

  return {
    G, T, ui, here, has, step, collect, weekStars, primeCalc, sigRate, satRate, cleanRate, propre, gavLimit,
    gavValue, plaValue, tamponValue, capacity, hallCap, cellCap, unitCost, upCost, bulk, unitOn, upOn,
    buyUnit, buyUp, build, upTier, canMove, move, tampon, rate, save, load,
    perf: () => perf, lost: () => lostFlash > 0, buffOn, addBuff: (id, dur, label) => G.buffs.push({ id, until: perf + dur, label }),
    earn, slip, invPerMin, ptsPerMin,
  };
})();
