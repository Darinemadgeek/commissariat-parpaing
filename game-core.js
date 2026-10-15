// Cœur du jeu : état, simulation, problèmes des commissariats, prime et étoiles, événements, achats, sauvegarde.
window.GM = (function () {
  const { T, UNITS, UPGRADES, BUILDINGS, tier, site } = PD;
  const SAVE_KEY = 'commissaire-parpaing-v1'; // même clé qu'avant : les parties en cours sont reprises
  const G = {};
  const ui = { float() {}, toast() {}, pv() {}, fx: { arrive: 0, release: 0, citizen: 0, toPla: 0, angry: 0, toPts: 0 } };
  const UPG = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

  const newWeek = no => ({ no, t: 0, gav: 0, sig: 0, unsig: 0, pla: 0, recus: 0, partis: 0, lost: 0, earned: 0, levees: 0, malaises: 0, cleanSum: 0, tampons: 0, scandales: 0 });
  function fresh(keep) {
    keep = keep || {};
    return {
      ver: 3, money: keep.money || 0, runEarned: 0, stars: keep.stars || 0, medals: keep.medals || 0,
      site: keep.site || 0, cstars: 0, galons: keep.galons || 0, siteStars: keep.siteStars || [],
      n: { patrols: 1, cells: 1, inv: 1, pts: 1, acc: 1, pla: 1, clean: 1, masks: 0, snow: 0, interp: 0, press: 0 },
      up: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      built: { accueil: false, plaintes: false },
      tier: 0, det: [], hall: 0, cit: 0, citT: 0, plaQ: 0, plaW: [], pistes: 0,
      vomit: 0, cleanT: 0, ptsDown: [],
      manifIn: T.MANIF_EVERY, manifLeft: 0, stormIn: T.STORM_EVERY, stormLeft: 0, colisIn: T.COLIS_EVERY, colisLeft: 0,
      meetIn: T.MEETING_EVERY, meetLeft: 0, igpn: 'sig98',
      acc: { patrol: 0, cit: 0 },
      week: newWeek(1), objective: T.OBJ_START, buffs: [], pending: null, quests: [],
      total: keep.total || { gav: 0, pla: 0, primes: 0 }, goldenIn: 40, lastSave: Date.now(), rateEst: 0,
    };
  }
  function reset(obj) { for (const k of Object.keys(G)) delete G[k]; Object.assign(G, obj); }
  reset(fresh());

  // ---------- multiplicateurs (une seule source pour le jeu et les infobulles) ----------
  let perf = 0, earnedLog = [];
  const here = () => site(G.site);
  const has = p => here().problems.includes(p);
  const hardK = () => 1 + 0.25 * (here().hard || 0);
  const buffOn = id => G.buffs.some(b => b.id === id);
  const lv = id => G.up[id] || 0;
  const up = id => 1 + UPG[id].per * lv(id);            // bonus linéaire d'un équipement
  const down = id => Math.pow(1 - UPG[id].per, lv(id)); // réduction d'un équipement (multiplicative)
  const valMult = () => Math.pow(1.6, G.tier) * up('lrp') * (1 + 0.1 * G.stars) * (1 + 0.5 * G.galons) * Math.pow(2, here().hard || 0)
    * (buffOn('prefet') ? 3 : 1) * (buffOn('major') ? 3 : 1);
  const allSpeed = () => (buffOn('turbo') ? 2 : 1) * (buffOn('pizza') ? 1.25 : 1) * (buffOn('laurine') ? 0.95 : 1);
  const ptsBuff = () => (buffOn('maxime') ? 1.5 : 1) * (buffOn('lrpmail') ? 1.5 : 1) * (buffOn('corbeaux') ? 0.9 : 1);
  const cellCap = () => 2 + lv('beds');
  const capacity = () => G.n.cells * cellCap();
  const hallCap = () => T.HALL + UPG.hall.per * lv('hall') + UPG.xxl.per * lv('xxl');
  const gavValue = () => T.GAV_VALUE * valMult();
  const plaValue = () => T.PLAINTE_VALUE * valMult() * (has('touristes') ? T.TOURIST_VALUE : 1);
  const tamponValue = () => Math.max(1, gavValue() * 0.05 * up('stamp'));
  const tamponPush = () => Math.min(0.12, 0.04 + 0.01 * lv('stamp'));
  const propre = () => Math.max(0, 1 - G.vomit * 0.04);
  const slip = () => (has('vomi') ? 1 - Math.min(0.6, G.vomit * 0.03) : 1);
  const gavLimit = () => T.GAV_LIMIT * up('parquet');
  const lawK = () => Math.min(1, T.LAWYER_SLOW + UPG.avocat.per * lv('avocat'));
  const unitCost = (u, k) => u.base * Math.pow(u.g, G.n[u.id] - u.start + (k || 0));
  const upCost = u => u.base * Math.pow(u.g, lv(u.id)) * (u.scale === 'cells' ? Math.max(1, G.n.cells / 4) : 1);
  const unitOn = u => (!u.needs || G.built[u.needs]) && (!u.prob || has(u.prob));
  const upOn = u => (!u.needs || G.built[u.needs]) && (!u.prob || has(u.prob));
  function bulk(u, x) {
    let cost = 0, k = 0;
    const lim = x === 'max' ? 1000 : x;
    while (k < lim) { const c = unitCost(u, k); if (x === 'max' && cost + c > G.money) break; cost += c; k++; }
    return { k, cost };
  }
  // Durées d'un cycle et débits par minute (sans les bonus passagers, sauf `live`)
  const enqTime = live => T.ENQ_TIME / (up('coffee') * (live ? allSpeed() * slip() : 1));
  const ptsTime = live => T.PTS_TIME / (up('bio') * (live ? allSpeed() * ptsBuff() * slip() : 1));
  const meetingBlocked = () => (has('reunion') && G.meetLeft > 0 ? Math.round(G.n.inv * T.MEETING_SHARE * down('visio')) : 0);
  const invAvail = () => Math.max(0, G.n.inv - meetingBlocked());
  const ptsAvail = () => { let a = Math.max(0, G.n.pts - G.ptsDown.length); if (has('interpretes') && G.colisLeft > 0) a = Math.floor(a * (1 - T.COLIS_SHARE)); return a; };
  const invPerMin = () => (60 * invAvail()) / enqTime(true);
  const ptsPerMin = () => (60 * ptsAvail()) / ptsTime(true);
  const patrolPerMin = () => (60 * G.n.patrols / T.PATROL_TIME) * up('gyro');
  const citPerMin = () => (G.built.accueil ? (60 / T.CITIZEN_TIME) * (1 + 0.4 * G.tier) * up('com') * Math.max(1, Math.sqrt(G.n.acc)) * (has('touristes') ? T.TOURIST_MULT : 1) : 0);
  const accPerMin = () => (60 * G.n.acc * up('tickets')) / T.ACC_TIME;
  const plaTime = () => T.PLA_TIME / (up('form') * (has('touristes') ? T.TOURIST_SPEED : 1));
  const plaPerMin = () => (G.built.plaintes ? (60 * G.n.pla) / plaTime() : 0);
  const cleanPerMin = () => (60 * G.n.clean * up('mop')) / T.CLEAN_TIME;
  // capacité théorique d'une semaine : sert à garder l'objectif préfectoral atteignable
  function weekCapacity() {
    const wk = (T.DAY_LEN * 7) / 60;
    const gav = Math.min((60 * G.n.inv) / enqTime(false), patrolPerMin() * (G.built.plaintes ? 1.25 : 1));
    const pla = G.built.plaintes ? Math.min(plaPerMin(), accPerMin(), citPerMin()) : 0;
    return (gav + pla) * wk;
  }

  const sigRate = w => (w.gav ? w.sig / w.gav : null);
  const satRate = w => (w.recus + w.partis ? w.recus / (w.recus + w.partis) : null);
  const cleanRate = w => (w.t > 0 ? w.cleanSum / w.t : 1);
  const scandals = w => Math.max(0, (w.scandales || 0) - G.n.press);
  const IGPN = {
    sig98: { label: 'signalisation ≥ 98 %', ok: w => { const r = sigRate(w); return r !== null && r >= 0.98; } },
    sat90: { label: 'usagers bien reçus ≥ 90 %', ok: w => { const s = satRate(w); return s !== null && s >= 0.9; } },
    nolost: { label: 'aucun relâché faute de place', ok: w => w.gav > 0 && w.lost === 0 },
    nolevee: { label: 'aucune GAV levée', ok: w => w.gav > 0 && w.levees === 0 },
    obj: { label: "objectif préfectoral atteint", ok: w => w.gav + w.pla >= G.objective },
  };
  function rollIgpn() { const ids = Object.keys(IGPN).filter(k => k !== 'sat90' || G.built.accueil); G.igpn = ids[Math.floor(Math.random() * ids.length)]; }
  const igpnLabel = () => (IGPN[G.igpn] || IGPN.sig98).label;
  // Les 3 étoiles d'une semaine : objectif de dossiers, signalisation, critère du commissariat
  function weekStars(w) {
    const r = sigRate(w), s3d = here().star3, id = s3d.id, any = w.gav > 0;
    const s1 = w.gav + w.pla >= G.objective;
    const s2 = r !== null && r >= 0.95;
    let s3 = false;
    if (id === 'sat') { const s = satRate(w); s3 = s !== null && s >= (s3d.min || 0.9); }
    else if (id === 'clean') s3 = any && cleanRate(w) >= 0.9;
    else if (id === 'faint') s3 = any && w.malaises === 0;
    else if (id === 'levee') s3 = any && w.levees === 0;
    else if (id === 'lost') s3 = any && w.lost === 0;
    else if (id === 'scandal') s3 = any && scandals(w) === 0;
    else if (id === 'igpn') s3 = (IGPN[G.igpn] || IGPN.sig98).ok(w);
    return [s1, s2, s3];
  }
  function primeCalc(w) {
    const r = sigRate(w), s = satRate(w), st = weekStars(w), n = st.filter(Boolean).length;
    const q = r === null ? 1 : r >= 0.95 ? 1 : r >= 0.85 ? 0.6 : r >= 0.7 ? 0.3 : 0;
    const sat = s === null ? 1 : 0.5 + 0.5 * s;
    const scan = has('vip') && scandals(w) > 0 ? 0.5 : 1;
    const dossiers = w.gav + w.pla, quota = st[0];
    // pas de jauge pleine, pas de prime ; la qualité PTS, les usagers et les scandales en modulent le montant
    const prime = quota ? w.earned * T.PRIME_BASE * 2 * q * sat * scan * (1 + 0.25 * n) * up('crois') : 0;
    return { prime, q, sat, scan, quota, dossiers, r, s, st, n };
  }

  // ---------- missions du préfet (tirées certains lundis, étoiles en plus) ----------
  const pc = v => Math.round(v * 100) + ' %';
  const QUESTS = {
    double: { w: 1, name: 'Semaine étoilée', reward: 0, desc: () => 'Le préfet est de bonne humeur : toutes les étoiles de la semaine comptent double.', prog: () => ({ done: true, txt: 'étoiles ×2' }) },
    over: { w: 3, name: 'Au-delà des attentes', reward: 2, target: () => Math.ceil(G.objective * 1.5), desc: q => `Traitez ${q.target} dossiers, 50 % de plus que l'objectif préfectoral.`, prog: (w, q) => ({ done: w.gav + w.pla >= q.target, txt: `${w.gav + w.pla}/${q.target} dossiers` }) },
    sig100: { w: 3, name: 'Zéro oubli', reward: 2, desc: () => 'Finissez la semaine à 100 % de signalisation, avec au moins 10 GAV auditionnées.', prog: w => ({ done: w.gav >= 10 && w.sig === w.gav, txt: w.gav ? `${w.sig}/${w.gav} signalisées` : '0 GAV' }) },
    sat95: { w: 2, ok: () => G.built.accueil, name: 'Accueil cinq étoiles', reward: 2, desc: () => "Au moins 95 % d'usagers bien reçus, sur 10 usagers minimum.", prog: w => { const n = w.recus + w.partis; return { done: n >= 10 && w.recus / n >= 0.95, txt: n ? `${pc(w.recus / n)} (${w.recus}/${n})` : '0 usager' }; } },
    pla: { w: 2, ok: () => G.built.plaintes, name: 'Opération guichet', reward: 1, target: () => Math.max(6, Math.round(G.objective * 0.5)), desc: q => `Traitez au moins ${q.target} plaintes cette semaine.`, prog: (w, q) => ({ done: w.pla >= q.target, txt: `${w.pla}/${q.target} plaintes` }) },
    nolost: { w: 2, name: 'Pas un de perdu', reward: 1, desc: () => 'Aucun suspect relâché faute de place, avec au moins 10 GAV auditionnées.', prog: w => ({ done: w.gav >= 10 && w.lost === 0, txt: `${w.lost} relâché${w.lost > 1 ? 's' : ''} · ${w.gav} GAV` }) },
    tampon: { w: 2, name: "Bras d'acier", reward: 1, target: () => 150, desc: q => `Donnez ${q.target} coups de tampon cette semaine.`, prog: (w, q) => ({ done: w.tampons >= q.target, txt: `${w.tampons}/${q.target} coups` }) },
    clean97: { w: 2, ok: () => has('vomi'), name: 'Couloirs nickel', reward: 2, desc: () => 'Propreté moyenne des couloirs ≥ 97 % sur la semaine.', prog: w => ({ done: cleanRate(w) >= 0.97, txt: pc(cleanRate(w)) }) },
    nofaint: { w: 2, ok: () => has('pieds') && here().star3.id !== 'faint', name: 'Nez bouchés', reward: 1, desc: () => 'Aucun malaise à la PTS de toute la semaine.', prog: w => ({ done: w.malaises === 0 && w.gav > 0, txt: `${w.malaises} malaise${w.malaises > 1 ? 's' : ''}` }) },
    nolevee: { w: 2, ok: () => has('delai') && here().star3.id !== 'levee', name: 'Dans les délais', reward: 1, desc: () => 'Aucune GAV levée pour délai dépassé.', prog: w => ({ done: w.levees === 0 && w.gav > 0, txt: `${w.levees} levée${w.levees > 1 ? 's' : ''}` }) },
  };
  function rollQuests() {
    G.quests = [];
    const n = Math.random() < 0.6 ? (Math.random() < 0.25 ? 2 : 1) : 0;
    for (let k = 0; k < n; k++) {
      const pool = Object.entries(QUESTS).filter(([id, q]) => (!q.ok || q.ok()) && !G.quests.some(x => x.id === id));
      const tot = pool.reduce((s, [, q]) => s + q.w, 0);
      let r = Math.random() * tot;
      for (const [id, q] of pool) { if ((r -= q.w) <= 0) { G.quests.push({ id, target: q.target ? q.target() : 0 }); break; } }
    }
  }
  function questInfo(q, w) {
    const d = QUESTS[q.id]; if (!d) return null;
    const p = d.prog(w || G.week, q);
    return { id: q.id, name: d.name, reward: d.reward, double: q.id === 'double', desc: d.desc(q), done: p.done, txt: p.txt };
  }

  // ---------- simulation ----------
  function earn(v, zone, cls) {
    G.money += v; G.runEarned += v; G.week.earned += v;
    earnedLog.push([perf, v]);
    if (zone) ui.float(zone, '+' + PD.eur(v), cls);
  }
  function newDet() {
    const k = hardK(), r = () => Math.random();
    return {
      e: 0, p: 0, t: 0,
      drunk: has('vomi') && r() < T.DRUNK * k,
      smelly: has('pieds') && r() < T.SMELLY * down('deo') * k,
      lawyer: has('delai') && r() < T.LAWYER * k,
      foreign: has('interpretes') && r() < T.FOREIGN * k,
      vip: has('vip') && r() < T.VIP * k,
    };
  }
  // événements réguliers d'un lieu : renvoie true pendant l'événement
  function cycle(prob, inKey, leftKey, every, len, startMsg, endMsg, dt) {
    if (!has(prob)) return false;
    if (G[leftKey] > 0) { G[leftKey] -= dt; if (G[leftKey] <= 0 && endMsg) ui.toast(endMsg); return G[leftKey] > 0; }
    if ((G[inKey] -= dt) <= 0) { G[inKey] = every * (0.8 + Math.random() * 0.4); G[leftKey] = len; if (startMsg) ui.toast(startMsg); return true; }
    return false;
  }
  let lostFlash = 0;
  function step(dt) {
    perf += dt;
    G.buffs = G.buffs.filter(b => b.until > perf);
    const W = G.week, fx = ui.fx;

    const manif = cycle('manif', 'manifIn', 'manifLeft', T.MANIF_EVERY, T.MANIF_LEN, 'Manifestation ! Les interpellations arrivent par cars entiers.', 'Fin de la manif. Les pancartes rentrent à la maison.', dt);
    const storm = cycle('neige', 'stormIn', 'stormLeft', T.STORM_EVERY, T.STORM_LEN * down('chains'), 'Tempête de neige ! Seules les motoneiges peuvent encore patrouiller.', 'La tempête est passée, les patrouilles repartent.', dt);
    cycle('interpretes', 'colisIn', 'colisLeft', T.COLIS_EVERY, T.COLIS_LEN, 'Colis suspect au terminal 2 ! Une partie de la PTS est mobilisée.', 'Fausse alerte : c\'était un sandwich.', dt);
    cycle('reunion', 'meetIn', 'meetLeft', T.MEETING_EVERY, T.MEETING_LEN * down('mailr'), 'Réunion ! Une partie des enquêteurs quitte son bureau.', 'Fin de la réunion. Décision : faire une autre réunion.', dt);

    // Patrouilles : plus vite avec des pistes, bloquées par la neige (sauf motoneiges)
    const patrolsOn = storm ? Math.min(G.n.patrols, G.n.snow) : G.n.patrols;
    const pRate = (patrolsOn / T.PATROL_TIME) * up('gyro') * (buffOn('bac') ? 3 : 1) * (G.pistes > 0 ? T.PISTE_BOOST : 1) * (manif ? T.MANIF_MULT : 1) * (buffOn('laurine') ? 0.95 : 1);
    G.acc.patrol += pRate * dt;
    while (G.acc.patrol >= 1) {
      G.acc.patrol -= 1;
      if (G.pistes > 0) G.pistes--;
      if (G.det.length < capacity()) { G.det.push(newDet()); fx.arrive++; }
      else if (G.hall < hallCap()) { G.hall++; fx.arrive++; }
      else { W.lost++; lostFlash = 6; }
    }
    while (G.hall > 0 && G.det.length < capacity()) { G.hall--; G.det.push(newDet()); }

    // Enquêteurs : les GAV les plus anciennes d'abord ; un étranger attend un interprète libre
    const eSp = 1 / enqTime(true), lk = lawK();
    let ib = 0, ip = 0;
    const invN = invAvail();
    for (const d of G.det) {
      d.t += dt;
      if (ib >= invN) continue;
      if (d.foreign) { if (ip >= G.n.interp) continue; ip++; }
      d.e += eSp * dt * (d.lawyer ? lk : 1); ib++;
    }
    G._invBusy = ib; G._interpBusy = ip; G._meeting = meetingBlocked();

    // PTS : on finit ce qui est commencé, puis on prend les derniers arrivés.
    // Sur une GAV qui pue des pieds, un agent sans masque ralentit et risque le malaise.
    G.ptsDown = G.ptsDown.map(x => x - dt).filter(x => x > 0);
    const avail = ptsAvail();
    let masks = Math.min(G.n.masks, avail), pb = 0;
    const pSp = 1 / ptsTime(true);
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
    G._ptsBusy = pb;

    const lim = gavLimit();
    for (let i = G.det.length - 1; i >= 0; i--) {
      const d = G.det[i];
      if (d.vip && !d.scandal && d.t > T.VIP_MAX_T) { d.scandal = true; W.scandales++; ui.float('cells', 'Scandale : la star attend !', 'bad'); }
      if (d.e >= 1) {
        G.det.splice(i, 1); W.gav++; G.total.gav++;
        if (d.p >= 1) W.sig++; else W.unsig++;
        if (d.vip && d.p < 1 && !d.scandal) { W.scandales++; ui.float('cells', 'Scandale : star non signalisée', 'bad'); }
        earn(gavValue() * (d.vip ? T.VIP_MULT : 1), 'cells', d.p >= 1 ? '' : 'bad'); fx.release++;
      } else if (has('delai') && d.t > lim) {
        G.det.splice(i, 1); W.levees++; fx.release++;
        ui.float('cells', 'GAV levée : délai dépassé', 'bad');
      }
    }

    // Vomi et ménage
    if (has('vomi')) {
      for (const d of G.det) if (d.drunk && Math.random() < dt / T.VOMIT_EVERY && G.vomit < T.VOMIT_MAX) G.vomit++;
      if (G.vomit > 0) {
        G.cleanT += (dt * G.n.clean * up('mop') * allSpeed()) / T.CLEAN_TIME;
        while (G.cleanT >= 1 && G.vomit > 0) { G.cleanT -= 1; G.vomit--; }
      } else G.cleanT = 0;
      W.cleanSum += propre() * dt;
    } else W.cleanSum += dt;

    // Accueil
    let ab = 0;
    if (G.built.accueil) {
      G.acc.cit += (citPerMin() / 60) * dt;
      while (G.acc.cit >= 1) {
        G.acc.cit -= 1;
        if (G.cit < hallCap() + 6) { G.cit++; fx.citizen++; } else { W.partis++; fx.angry++; }
      }
      const aSp = (G.n.acc * up('tickets') * allSpeed()) / T.ACC_TIME;
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
      const lSp = (allSpeed() * slip() * (buffOn('photocop') ? 0.5 : 1)) / plaTime();
      lb = G.plaW.length;
      for (let i = G.plaW.length - 1; i >= 0; i--) {
        G.plaW[i] += lSp * dt;
        if (G.plaW[i] >= 1) { G.plaW.splice(i, 1); plainteDone(); }
      }
    }
    G._plaBusy = lb;

    W.t += dt;
    if (W.t >= T.DAY_LEN * 7) endWeek();
    G.goldenIn -= dt;
    lostFlash = Math.max(0, lostFlash - dt);
    while (earnedLog.length && earnedLog[0][0] < perf - 20) earnedLog.shift();
  }
  function plainteDone(silent) {
    G.week.pla++; G.total.pla++;
    earn(plaValue(), silent ? null : 'pla', 'blue');
    if (Math.random() < T.PISTE_CHANCE && G.pistes < T.PISTE_MAX) G.pistes++;
  }

  function endWeek() {
    const w = G.week, p = primeCalc(w);
    if (G.pending) collect();
    const before = G.cstars;
    const quests = (G.quests || []).map(q => questInfo(q, w)).filter(Boolean);
    const bonus = quests.reduce((s, q) => s + (q.done ? q.reward : 0), 0);
    const dbl = quests.some(q => q.double);
    const gained = (p.n + bonus) * (dbl ? 2 : 1);
    G.cstars += gained;
    const crit3 = here().star3.id === 'igpn' ? `IGPN : ${igpnLabel()}` : here().star3.label;
    G.pending = { no: w.no, ...p, quests, bonus, dbl, gained, gav: w.gav, sig: w.sig, pla: w.pla, lost: w.lost, recus: w.recus, partis: w.partis, earned: w.earned, objective: G.objective, levees: w.levees, malaises: w.malaises, clean: cleanRate(w), scandales: scandals(w), crit3 };
    // objectif suivant : il suit vos résultats mais reste sous ~85 % de ce que vos équipes peuvent traiter
    const cap = Math.ceil(weekCapacity() * 0.85);
    const next = p.quota ? Math.ceil(p.dossiers * 1.1) : Math.ceil(G.objective * 0.9);
    G.objective = Math.max(T.OBJ_START, Math.min(next, cap));
    if (p.n === 3) G.medals = Math.min(G.medals + 1, 6);
    G.week = newWeek(w.no + 1);
    rollQuests();
    if (has('reunion')) rollIgpn();
    ui.pv();
    if (G.quests.length) setTimeout(() => G.quests.forEach(q => { const i = questInfo(q); if (i) ui.toast(`Lundi : mission du préfet « ${i.name} » ! ${i.desc}${i.double ? '' : ` Récompense : +${i.reward} ★.`}`); }), 900);
    if (has('reunion')) setTimeout(() => ui.toast(`Lundi : cette semaine, l'IGPN vérifie : ${igpnLabel()}.`), 1300);
    if (before < T.STARS_TO_MOVE && G.cstars >= T.STARS_TO_MOVE) setTimeout(() => ui.toast(`${T.STARS_TO_MOVE} étoiles ! Une mutation est possible : ouvrez la carte.`), 1700);
  }
  function collect() {
    if (!G.pending) return 0;
    const v = G.pending.prime;
    if (v > 0) { G.money += v; G.runEarned += v; G.total.primes += v; }
    G.pending = null;
    return v;
  }

  // ---------- croissant doré ----------
  // un même effet tiré deux fois prolonge sa durée au lieu de s'empiler
  function addBuff(id, dur, label, malus) {
    const b = G.buffs.find(x => x.id === id);
    if (b) b.until = Math.max(b.until, perf) + dur; else G.buffs.push({ id, until: perf + dur, label, malus: !!malus });
  }
  function golden() {
    const pool = PD.GOLDEN.filter(g => !g.needs || G.built[g.needs]);
    let r = Math.random() * pool.reduce((s, g) => s + g.w, 0), g = pool[0];
    for (const x of pool) { if ((r -= x.w) <= 0) { g = x; break; } }
    let msg = g.msg;
    if (g.id === 'cash') { const v = Math.max(50, rate() * 90 + G.money * 0.05); earn(v); msg += ' +' + PD.eur(v); }
    else if (g.id === 'stagiaire') { const n = G.plaQ + G.plaW.length; G.plaQ = 0; G.plaW = []; for (let i = 0; i < n; i++) plainteDone(true); msg += ` ${n} plainte${n > 1 ? 's' : ''} bouclée${n > 1 ? 's' : ''}.`; }
    else if (g.id === 'bbq') { const n = G.cit; G.cit = 0; G.week.recus += n; if (G.built.plaintes) G.plaQ += n; else for (let i = 0; i < n; i++) earn(plaValue() * 0.2); msg += ` ${n} usager${n > 1 ? 's' : ''} reçu${n > 1 ? 's' : ''} d'un coup.`; }
    else if (g.id === 'amelie') { const n = G.det.length + G.hall; G.det = []; G.hall = 0; ui.fx.release += Math.min(n, 6); msg += ` ${n} personne${n > 1 ? 's' : ''} dans la nature (sans effet sur vos stats).`; }
    else if (g.id === 'igpn') {
      const r2 = sigRate(G.week);
      if (G.week.gav >= 5 && r2 >= 0.95) { G.cstars += 1; msg += ` Signalisation à ${pc(r2)} : félicitations, +1 ★ !`; }
      else msg += G.week.gav < 5 ? ' Pas assez de GAV cette semaine pour juger. Rien à signaler.' : ` Signalisation à ${pc(r2)} : pas d'étoile cette fois (il faut 95 %).`;
    } else addBuff(g.id, g.dur, g.label, g.malus);
    G.goldenIn = 60 + Math.random() * 70;
    return { g, msg };
  }

  // ---------- achats ----------
  function buyUnit(id, x) {
    const u = UNITS.find(q => q.id === id), b = bulk(u, x);
    if (!b.k || b.cost > G.money) return 0;
    G.money -= b.cost; G.n[id] += b.k; return b.k;
  }
  function buyUp(id) {
    const u = UPG[id], c = upCost(u);
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
    if (has('reunion')) rollIgpn();
    return true;
  }
  function tampon() {
    if (buffOn('pigeon')) return 0;
    const v = tamponValue();
    earn(v, 'parp');
    G.week.tampons = (G.week.tampons || 0) + 1;
    const d = G.det[0], k = tamponPush();
    if (d) { d.e = Math.min(1, d.e + k); if (d.p > 0) d.p = Math.min(1, d.p + k); }
    return v;
  }
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
      ver: 3, n: Object.assign(f.n, d.n), up: Object.assign(f.up, d.up), built: Object.assign(f.built, d.built),
      week: Object.assign(newWeek(1), d.week), total: Object.assign(f.total, d.total), acc: Object.assign(f.acc, d.acc), buffs: [],
      siteStars: Array.isArray(d.siteStars) ? d.siteStars : [], ptsDown: Array.isArray(d.ptsDown) ? d.ptsDown : [],
    });
    m.det = (Array.isArray(d.det) ? d.det : []).map(x => ({ e: +x.e || 0, p: +x.p || 0, t: +x.t || 0, drunk: !!x.drunk, smelly: !!x.smelly, lawyer: !!x.lawyer, foreign: !!x.foreign, vip: !!x.vip, scandal: !!x.scandal }));
    m.plaW = Array.isArray(d.plaW) ? d.plaW : [];
    m.quests = Array.isArray(d.quests) ? d.quests.filter(q => q && QUESTS[q.id]) : [];
    if (!IGPN[m.igpn]) m.igpn = 'sig98';
    if (m.pending && !(m.pending.prime >= 0)) m.pending = null;
    if (m.pending && !m.pending.st) { m.money += m.pending.prime || 0; m.pending = null; } // PV de l'ancienne version : prime versée
    reset(m);
    return true;
  }

  return {
    G, T, ui, here, has, step, collect, weekStars, primeCalc, sigRate, satRate, cleanRate, propre, gavLimit, scandals, igpnLabel,
    gavValue, plaValue, tamponValue, tamponPush, capacity, hallCap, cellCap, unitCost, upCost, bulk, unitOn, upOn, lv, up, down,
    buyUnit, buyUp, build, upTier, canMove, move, tampon, rate, save, load, golden, weekCapacity,
    enqTime, ptsTime, plaTime, invPerMin, ptsPerMin, patrolPerMin, citPerMin, accPerMin, plaPerMin, cleanPerMin, lawK, valMult,
    perf: () => perf, lost: () => lostFlash > 0, buffOn,
    addBuff,
    earn, slip, questInfo,
  };
})();
