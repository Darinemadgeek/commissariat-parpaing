// Logique du jeu : simulation, prime hebdo, sauvegarde.
(function () {
  const { T, UNITS, UPGRADES, BUILDINGS, tier, fmt, eur, pick } = PD;
  const SAVE_KEY = 'commissaire-parpaing-v1';

  function fresh(stars) {
    return {
      money: 0, runEarned: 0, stars: stars || 0, medals: 0,
      n: { patrols: 1, cells: 1, inv: 1, pts: 1, acc: 1, pla: 1 },
      up: Object.fromEntries(UPGRADES.map(u => [u.id, 0])),
      built: { accueil: false, plaintes: false },
      tier: 0,
      det: [],           // GAV en cours : {e: progression enquête, p: progression PTS}
      hall: 0,           // suspects en attente d'une cellule
      cit: 0,            // usagers dans la file de l'accueil
      citT: 0,           // progression de l'usager au guichet
      plaQ: 0,           // plaintes en attente
      plaW: [],          // plaintes en cours de traitement
      pistes: 0,
      acc: { patrol: 0, cit: 0 },
      week: { no: 1, t: 0, gav: 0, sig: 0, unsig: 0, pla: 0, recus: 0, partis: 0, lost: 0, earned: 0 },
      objective: T.OBJ_START,
      buffs: [],         // {id, until}
      pending: null,     // rapport de fin de semaine à encaisser
      total: { gav: 0, pla: 0, primes: 0 },
      goldenIn: 40,
      lastSave: Date.now(), rateEst: 0,
    };
  }
  let G = fresh();

  // ---------- dérivés ----------
  const buffOn = id => G.buffs.some(b => b.id === id);
  const tierMult = () => Math.pow(1.6, G.tier);
  const valMult = () => tierMult() * (1 + 0.3 * G.up.lrp) * (1 + 0.1 * G.stars) * (buffOn('prefet') ? 5 : 1);
  const turbo = () => (buffOn('turbo') ? 3 : 1);
  const cellCap = () => 2 + G.up.beds;
  const capacity = () => G.n.cells * cellCap();
  const hallCap = () => T.HALL + 4 * G.up.hall;
  const gavValue = () => T.GAV_VALUE * valMult();
  const plaValue = () => T.PLAINTE_VALUE * valMult();
  const tamponValue = () => Math.max(1, gavValue() * 0.12) * Math.pow(2, G.up.stamp);
  const unitCost = (u, k) => u.base * Math.pow(u.g, G.n[u.id] - u.start + (k || 0));
  const upCost = u => u.base * Math.pow(u.g, G.up[u.id]);
  function bulk(u, x) {
    let cost = 0, k = 0;
    const lim = x === 'max' ? 1000 : x;
    while (k < lim) { const c = unitCost(u, k); if (x === 'max' && cost + c > G.money) break; cost += c; k++; }
    return { k, cost };
  }
  const sigRate = w => (w.gav ? w.sig / w.gav : null);
  const satRate = w => (w.recus + w.partis ? w.recus / (w.recus + w.partis) : null);
  function primeCalc(w) {
    const r = sigRate(w), s = satRate(w);
    const q = r === null ? 1 : r >= 0.95 ? 1 : r >= 0.85 ? 0.6 : r >= 0.7 ? 0.3 : 0;
    const sat = s === null ? 1 : 0.5 + 0.5 * s;
    const dossiers = w.gav + w.pla;
    const quota = dossiers >= G.objective;
    const prime = w.earned * T.PRIME_BASE * q * sat * (quota ? 2 : 1) * (1 + 0.15 * G.up.crois);
    return { prime, q, sat, quota, dossiers, r, s };
  }

  // ---------- simulation ----------
  const fx = { arrive: 0, release: 0, citizen: 0, toPla: 0, angry: 0 };
  let lostFlash = 0, earnedLog = [];
  function earn(v, zone, cls) {
    G.money += v; G.runEarned += v; G.week.earned += v;
    earnedLog.push([perfNow, v]);
    if (zone) floatAt(zone, '+' + eur(v), cls);
  }
  let perfNow = 0;

  function step(dt) {
    perfNow += dt;
    G.buffs = G.buffs.filter(b => b.until > perfNow);
    const W = G.week;

    // Patrouilles : plus vite quand le bureau des plaintes fournit des pistes
    const pRate = (G.n.patrols / T.PATROL_TIME) * (1 + 0.25 * G.up.gyro) * (buffOn('bac') ? 4 : 1) * (G.pistes > 0 ? 2 : 1);
    G.acc.patrol += pRate * dt;
    while (G.acc.patrol >= 1) {
      G.acc.patrol -= 1;
      if (G.pistes > 0) G.pistes--;
      if (G.det.length < capacity()) { G.det.push({ e: 0, p: 0 }); fx.arrive++; }
      else if (G.hall < hallCap()) { G.hall++; fx.arrive++; }
      else { W.lost++; lostFlash = 6; }
    }
    while (G.hall > 0 && G.det.length < capacity()) { G.hall--; G.det.push({ e: 0, p: 0 }); }

    // Enquêteurs : un enquêteur par GAV, les plus anciennes d'abord
    const eSp = ((1 + 0.25 * G.up.coffee) * turbo()) / T.ENQ_TIME;
    const pSp = ((1 + 0.3 * G.up.bio) * turbo()) / T.PTS_TIME;
    let ib = 0, pb = 0;
    for (const d of G.det) if (ib < G.n.inv) { d.e += eSp * dt; ib++; }
    // PTS : on termine les signalisations commencées, puis on prend les derniers arrivés
    // (ceux qui ont le plus de temps devant eux avant la fin de leur GAV)
    for (const d of G.det) if (d.p > 0 && d.p < 1 && pb < G.n.pts) { d.p += pSp * dt; pb++; }
    for (let i = G.det.length - 1; i >= 0 && pb < G.n.pts; i--) { const d = G.det[i]; if (d.p === 0) { d.p += pSp * dt; pb++; } }
    G._invBusy = ib; G._ptsBusy = pb;
    for (let i = G.det.length - 1; i >= 0; i--) {
      const d = G.det[i];
      if (d.e < 1) continue;
      G.det.splice(i, 1);
      W.gav++; G.total.gav++;
      if (d.p >= 1) W.sig++; else W.unsig++;
      earn(gavValue(), 'cells', d.p >= 1 ? '' : 'bad');
      fx.release++;
    }

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
          if (G.built.plaintes) { G.plaQ++; fx.toPla++; }
          else earn(plaValue() * 0.2, 'acc');
        }
      } else G.citT = 0;
    }
    G._accBusy = ab;

    // Bureau des plaintes
    let lb = 0;
    if (G.built.plaintes) {
      while (G.plaW.length < G.n.pla && G.plaQ > 0) { G.plaQ--; G.plaW.push(0); }
      const lSp = ((1 + 0.3 * G.up.form) * turbo()) / T.PLA_TIME;
      lb = G.plaW.length;
      for (let i = G.plaW.length - 1; i >= 0; i--) {
        G.plaW[i] += lSp * dt;
        if (G.plaW[i] >= 1) {
          G.plaW.splice(i, 1);
          W.pla++; G.total.pla++;
          earn(plaValue(), 'pla', 'blue');
          if (Math.random() < T.PISTE_CHANCE && G.pistes < T.PISTE_MAX) G.pistes++;
        }
      }
    }
    G._plaBusy = lb;

    // Semaine
    W.t += dt;
    if (W.t >= T.DAY_LEN * 7) endWeek();

    // Croissant doré
    G.goldenIn -= dt;
    if (G.goldenIn <= 0 && !golden) spawnGolden();

    lostFlash = Math.max(0, lostFlash - dt);
    while (earnedLog.length && earnedLog[0][0] < perfNow - 20) earnedLog.shift();
  }

  function endWeek() {
    const w = G.week, p = primeCalc(w);
    if (G.pending) collect();
    G.pending = { no: w.no, ...p, gav: w.gav, sig: w.sig, pla: w.pla, lost: w.lost, recus: w.recus, partis: w.partis, earned: w.earned, objective: G.objective };
    if (p.quota) G.objective = Math.ceil(Math.max(G.objective * 1.2, p.dossiers * 1.05));
    else G.objective = Math.max(T.OBJ_START, Math.ceil(G.objective * 0.9));
    if (p.prime > 0 && p.q >= 1 && p.quota) G.medals = Math.min(G.medals + 1, 6);
    G.week = { no: w.no + 1, t: 0, gav: 0, sig: 0, unsig: 0, pla: 0, recus: 0, partis: 0, lost: 0, earned: 0 };
    showPV();
  }
  function collect() {
    if (!G.pending) return;
    const v = G.pending.prime;
    if (v > 0) { G.money += v; G.runEarned += v; G.total.primes += v; floatAt('parp', '+' + eur(v) + ' PRIME'); toast('Prime encaissée : ' + eur(v)); }
    G.pending = null; pvAuto = 0;
    document.getElementById('pvSlot').innerHTML = '';
  }

  // ---------- achats ----------
  let buyX = 1;
  function buyUnit(id) {
    const u = UNITS.find(x => x.id === id);
    const b = bulk(u, buyX);
    if (!b.k || b.cost > G.money) return;
    G.money -= b.cost; G.n[id] += b.k;
    floatAt(zoneOf(id), '+' + b.k + ' ' + u.name.toLowerCase(), 'blue');
    render(true);
  }
  function buyUp(id) {
    const u = UPGRADES.find(x => x.id === id), c = upCost(u);
    if (c > G.money) return;
    G.money -= c; G.up[id]++;
    toast(u.name + ' niveau ' + G.up[id] + ' !');
    render(true);
  }
  function build(id) {
    const b = BUILDINGS.find(x => x.id === id);
    if (G.built[id] || b.cost > G.money) return;
    G.money -= b.cost; G.built[id] = true;
    toast(id === 'accueil' ? "L'accueil ouvre ses portes. Les usagers arrivent !" : 'Bureau des plaintes ouvert : les plaintes donnent des pistes aux patrouilles.');
    render(true);
  }
  function upTier() {
    const nt = tier(G.tier + 1);
    if (nt.cost > G.money) return;
    G.money -= nt.cost; G.tier++;
    toast('Promotion du bâtiment : ' + nt.name + ' ! Recettes ×1,6');
    floatAt('hq', nt.name.toUpperCase());
    render(true);
  }
  const pendingStars = () => Math.floor(Math.sqrt(G.runEarned / 1e6));
  let mutArm = false;
  function mutate() {
    const s = pendingStars();
    if (s < 1) return;
    if (!mutArm) { mutArm = true; render(true); return; }
    const keepMedals = G.medals, total = G.total;
    G = fresh(G.stars + s); G.medals = keepMedals; G.total = total;
    mutArm = false;
    toast(`Mutation acceptée : +${s} étoile${s > 1 ? 's' : ''}. Nouveau poste, mêmes moustaches.`);
    render(true);
  }
  function tampon() {
    const v = tamponValue();
    earn(v, 'parp');
    const d = G.det[0], k = 0.06 * Math.pow(1.5, G.up.stamp);
    if (d) { d.e = Math.min(1, d.e + k); if (d.p > 0) d.p = Math.min(1, d.p + k); }
    S.parpaingHit();
  }
  const zoneOf = id => ({ patrols: 'cars', cells: 'cells', inv: 'inv', pts: 'pts', acc: 'acc', pla: 'pla' })[id];

  // ---------- croissant doré ----------
  let golden = null;
  function spawnGolden() {
    const el = document.createElement('button');
    el.className = 'golden'; el.type = 'button'; el.setAttribute('aria-label', 'Croissant doré : cliquez pour un bonus');
    el.innerHTML = '<svg viewBox="0 0 64 64"><path d="M6 40C10 18 54 18 58 40c-8-6-14-6-16 2-4-8-12-8-16 0-2-8-8-8-20-2z" fill="#ffcf4a" stroke="#8a5a00" stroke-width="3"/><path d="M22 30l4 8M32 27v10M42 30l-4 8" stroke="#8a5a00" stroke-width="2.5"/></svg>';
    const st = S.stage, y0 = 90 + Math.random() * (st.clientHeight - 220);
    const dirL = Math.random() < 0.5;
    golden = { el, x: dirL ? -70 : st.clientWidth + 10, y: y0, vx: (dirL ? 1 : -1) * (60 + Math.random() * 40), t: 0 };
    el.onclick = () => { catchGolden(); };
    st.appendChild(el);
  }
  function catchGolden() {
    if (!golden) return;
    const g = pick(PD.GOLDEN);
    if (g.id === 'cash') { const v = Math.max(50, rate() * 90 + G.money * 0.05); earn(v); toast(g.msg + ' +' + eur(v)); }
    else { G.buffs.push({ id: g.id, until: perfNow + g.dur, label: g.label }); toast(g.msg); }
    killGolden();
  }
  function killGolden() { if (golden) golden.el.remove(); golden = null; G.goldenIn = 60 + Math.random() * 70; }

  // ---------- interface ----------
  const $ = id => document.getElementById(id);
  const rate = () => earnedLog.reduce((s, e) => s + e[1], 0) / Math.min(20, Math.max(5, perfNow));
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3800);
    while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
  }
  let floats = 0;
  function floatAt(zone, text, cls) {
    if (floats > 14) return;
    const p = S.project(S.anchors[zone] || S.anchors.parp);
    if (!p.vis) return;
    const el = document.createElement('div');
    el.className = 'float ' + (cls || '');
    el.textContent = text;
    el.style.left = p.x + (Math.random() - 0.5) * 30 + 'px'; el.style.top = p.y + 'px';
    S.stage.appendChild(el); floats++;
    setTimeout(() => { el.remove(); floats--; }, 1400);
  }

  let pvAuto = 0;
  function showPV() {
    const p = G.pending;
    const ok = p.prime > 0;
    const pct = v => (v === null ? '–' : Math.round(v * 100) + ' %');
    const talk = pick(PD.PRIME_TALK[!ok ? 'zero' : p.q >= 1 && p.quota ? 'great' : p.q >= 0.6 ? 'ok' : 'meh']);
    $('pvSlot').innerHTML = `<div class="pv" role="dialog" aria-label="Rapport de fin de semaine">
      <h2>PROCÈS-VERBAL · SEMAINE ${p.no}</h2>
      <div class="sub">Commissariat de Parpaing-sur-Mer</div>
      <div class="stamp-row"><span class="stamp ${ok ? 'ok' : ''}">${ok ? 'PRIME ACCORDÉE' : 'PRIME REFUSÉE'}</span></div>
      <dl>
        <dt>Dossiers traités</dt><dd>${fmt(p.dossiers)} / ${fmt(p.objective)} ${p.quota ? '✔' : '✘'}</dd>
        <dt class="opt">dont GAV</dt><dd class="opt">${fmt(p.gav)}</dd>
        <dt class="opt">dont plaintes</dt><dd class="opt">${fmt(p.pla)}</dd>
        <dt>Signalisation PTS</dt><dd>${pct(p.r)}</dd>
        <dt>Usagers reçus</dt><dd>${pct(p.s)}</dd>
        <dt class="opt">Relâchés faute de place</dt><dd class="opt">${fmt(p.lost)}</dd>
        <dt class="opt">Recettes de la semaine</dt><dd class="opt">${eur(p.earned)}</dd>
        <dt><b>Prime</b></dt><dd><b>${eur(p.prime)}</b></dd>
      </dl>
      <p class="comment">« ${talk} »${p.quota ? '' : ' Objectif préfectoral manqué : prime non doublée.'}</p>
      <button type="button" id="pvBtn">${ok ? 'Encaisser la prime' : 'Classer sans suite'}</button>
    </div>`;
    $('pvBtn').onclick = collect;
    pvAuto = 14;
  }

  let tab = 'staff', cards = [], shape = '';
  const list = $('list');
  function mkCard(spec, onClick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'item';
    b.innerHTML = '<span class="ic"></span><span class="nm"></span><span class="ow"><span></span><small></small></span><span class="ds"></span><span class="eff"></span>';
    const [ic, nm, ow, ds, ef] = b.children;
    const c = { last: {} };
    c.upd = () => {
      const d = spec(), L = c.last;
      if (d.icon !== L.icon) { const I = PD.ICONS[d.icon]; ic.style.background = I.bg; ic.innerHTML = I.svg; }
      if (d.name !== L.name) nm.textContent = d.name;
      if (d.desc !== L.desc) ds.textContent = d.desc;
      if (d.owned !== L.owned) ow.firstChild.textContent = d.owned;
      if (d.cost !== L.cost) ow.lastChild.textContent = d.cost;
      if (d.eff !== L.eff) { ef.textContent = d.eff || ''; ef.hidden = !d.eff; }
      b.disabled = !d.can;
      b.className = 'item' + (d.can ? '' : ' cant') + (d.locked ? ' locked' : '') + (d.cls ? ' ' + d.cls : '');
      c.last = d;
    };
    b.onclick = () => { onClick(); render(true); };
    c.upd(); list.appendChild(b); cards.push(c);
  }
  function addEl(tag, cls, html, upd) {
    const el = document.createElement(tag); el.className = cls;
    const c = { upd: () => { const h = typeof html === 'function' ? html() : html; if (h !== c.h) { c.h = h; el.innerHTML = h; } } };
    c.upd(); list.appendChild(el); if (upd) cards.push(c);
  }
  function rebuild() {
    const scroll = list.scrollTop;
    list.innerHTML = ''; cards = [];
    $('buyx').hidden = tab !== 'staff';
    const sec = t => addEl('div', 'section-t', t);
    if (tab === 'staff') {
      for (const u of UNITS) {
        if (u.needs && !G.built[u.needs]) continue;
        mkCard(() => {
          const b = bulk(u, buyX), cost = b.k ? b.cost : unitCost(u);
          return { icon: u.id, name: u.name + (buyX !== 1 ? ` ×${b.k || 1}` : ''), desc: u.desc, owned: fmt(G.n[u.id]), cost: eur(cost), can: b.k > 0 && cost <= G.money, eff: effLine(u.id) };
        }, () => buyUnit(u.id));
      }
      if (!G.built.accueil) addEl('p', 'mini', "Ouvrez l'accueil dans l'onglet Bâtiment pour recevoir du public et des plaintes.");
    } else if (tab === 'up') {
      for (const u of UPGRADES) {
        if (u.needs && !G.built[u.needs]) continue;
        mkCard(() => { const c = upCost(u); return { icon: u.id, name: u.name, desc: u.desc, owned: 'niv. ' + G.up[u.id], cost: eur(c), can: c <= G.money }; }, () => buyUp(u.id));
      }
    } else if (tab === 'build') {
      sec('Services');
      for (const b of BUILDINGS) {
        mkCard(() => {
          if (G.built[b.id]) return { icon: b.id, name: b.id === 'accueil' ? 'Accueil' : 'Bureau des plaintes', desc: 'Ouvert. ' + b.desc, owned: '✔', cost: 'ouvert', can: false };
          const lockedBy = b.needs && !G.built[b.needs];
          return { icon: b.id, name: b.name, desc: lockedBy ? "Ouvrez d'abord l'accueil." : b.desc, owned: '', cost: eur(b.cost), can: !lockedBy && b.cost <= G.money, locked: lockedBy };
        }, () => build(b.id));
      }
      sec('Le bâtiment');
      mkCard(() => {
        const nt = tier(G.tier + 1);
        return { icon: 'hq', name: 'Agrandir : ' + nt.name, desc: `Actuellement : ${tier(G.tier).name}. Recettes ×1,6, plus de public, un bâtiment plus classe.`, owned: 'P' + (G.tier + 1), cost: eur(nt.cost), can: nt.cost <= G.money };
      }, upTier);
      sec('Carrière');
      mkCard(() => {
        const s = pendingStars();
        return {
          icon: 'mutation', name: mutArm ? 'Confirmer la mutation ?' : 'Demander une mutation',
          desc: s < 1 ? `Repartez de zéro avec des étoiles (+10 % de recettes chacune). Disponible dès 1 M € gagnés sur ce poste (actuellement ${eur(G.runEarned)}).` : `Tout repart à zéro, sauf vos étoiles et médailles. Vous gagnez +${s} étoile${s > 1 ? 's' : ''}.${mutArm ? ' Cliquez encore pour confirmer.' : ''}`,
          owned: '★' + G.stars, cost: s >= 1 ? '+' + s + ' ★' : 'verrouillé', can: s >= 1, cls: mutArm ? 'danger' : '',
        };
      }, mutate);
    } else {
      addEl('div', 'dossier', () => {
        const p = primeCalc(G.week);
        return `<h3>Dossier du commissaire Parpaing</h3><dl>
        <dt>Poste</dt><dd>${tier(G.tier).name}</dd>
        <dt>Étoiles</dt><dd>★ ${G.stars} (+${G.stars * 10} %)</dd>
        <dt>Médailles</dt><dd>${G.medals}</dd>
        <dt>GAV bouclées</dt><dd>${fmt(G.total.gav)}</dd>
        <dt>Plaintes traitées</dt><dd>${fmt(G.total.pla)}</dd>
        <dt>Primes touchées</dt><dd>${eur(G.total.primes)}</dd>
        <dt>Pistes en stock</dt><dd>${G.pistes}</dd>
        <dt>Recette par GAV</dt><dd>${eur(gavValue(), 1)}</dd>
        <dt>Recette par plainte</dt><dd>${eur(plaValue(), 1)}</dd>
        <dt>Prime estimée (semaine)</dt><dd>${eur(p.prime)}</dd></dl>`;
      }, true);
      addEl('p', 'mini', `<b>Règles de la prime hebdo.</b> Prime = 25 % des recettes de la semaine, × qualité de signalisation PTS (100 % si ≥ 95 %, 60 % si ≥ 85 %, 30 % si ≥ 70 %, sinon rien), × satisfaction des usagers, × 2 si l'objectif de dossiers (GAV + plaintes) est atteint. Objectif atteint : il monte la semaine suivante.<br><br><b>Astuces.</b> Les plaintes donnent des pistes : avec des pistes, les patrouilles interpellent deux fois plus vite. Un clic sur le commissaire ou sur le tampon accélère la GAV la plus ancienne. Attrapez les croissants dorés qui traversent l'écran.`);
    }
    list.scrollTop = scroll;
  }
  function render(force) {
    const s = [tab, buyX, mutArm, G.built.accueil, G.built.plaintes].join('|');
    if (s !== shape) { shape = s; rebuild(); }
    else cards.forEach(c => c.upd());
  }
  function effLine(id) {
    const per = (n, t) => `${fmt(n, 1)} / ${t}`;
    if (id === 'patrols') return `${per((60 * G.n.patrols / T.PATROL_TIME) * (1 + 0.25 * G.up.gyro), 'min')} interpellations${G.pistes ? ' (×2 avec pistes : ' + G.pistes + ')' : ''}`;
    if (id === 'cells') return `${G.det.length} / ${capacity()} places occupées · ${G.hall} en attente`;
    if (id === 'inv') return `${G._invBusy || 0} / ${G.n.inv} en audition · ${eur(gavValue(), 1)} par GAV`;
    if (id === 'pts') { const r = sigRate(G.week); return `${G._ptsBusy || 0} / ${G.n.pts} au travail · signalisation ${r === null ? '–' : Math.round(r * 100) + ' %'}`; }
    if (id === 'acc') return `${G.cit} usager${G.cit > 1 ? 's' : ''} dans la file · ${G.week.partis} repartis fâchés`;
    if (id === 'pla') return `${G.plaQ} plainte${G.plaQ > 1 ? 's' : ''} en attente · ${eur(plaValue(), 1)} par plainte`;
    return '';
  }

  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    mutArm = false; render(true);
  });
  document.querySelectorAll('#buyx button').forEach(b => b.onclick = () => {
    buyX = b.dataset.x === 'max' ? 'max' : Number(b.dataset.x);
    document.querySelectorAll('#buyx button').forEach(x => x.setAttribute('aria-pressed', x === b));
    render(true);
  });
  $('tamponBtn').onclick = tampon;
  S.onParpaing = tampon;

  function hud() {
    const W = G.week;
    $('money').textContent = eur(G.money);
    $('rate').textContent = eur(rate(), 1);
    $('tamponVal').textContent = '+' + eur(tamponValue(), 1);
    $('weekNo').textContent = 'Semaine ' + W.no;
    const day = Math.min(6, Math.floor(W.t / T.DAY_LEN));
    $('dayName').textContent = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][day];
    $('weekBar').style.width = (W.t / (T.DAY_LEN * 7)) * 100 + '%';
    const dos = W.gav + W.pla;
    $('sDos').textContent = fmt(dos);
    const r = sigRate(W), s = satRate(W);
    const sig = $('sSig'); sig.textContent = r === null ? '–' : Math.round(r * 100) + ' %';
    sig.className = r === null ? '' : r >= 0.95 ? 'ok' : r >= 0.7 ? 'warn' : 'bad';
    $('sGav').textContent = fmt(W.gav); $('sPla').textContent = fmt(W.pla);
    const sat = $('sSat'); sat.textContent = s === null ? '–' : Math.round(s * 100) + ' %';
    sat.className = s === null ? '' : s >= 0.9 ? 'ok' : s >= 0.6 ? 'warn' : 'bad';
    const lost = $('sLost'); lost.textContent = fmt(W.lost); lost.className = W.lost ? 'bad' : '';
    $('objTxt').textContent = `Objectif préfectoral : ${fmt(dos)} / ${fmt(G.objective)} dossiers`;
    $('objBar').style.width = Math.min(100, (dos / G.objective) * 100) + '%';
    $('buffs').innerHTML = G.buffs.map(b => `<span class="buff">${b.label} · ${Math.ceil(b.until - perfNow)} s</span>`).join('');
    $('tierName').textContent = tier(G.tier).name + ' de Parpaing-sur-Mer';
    // conseil
    const adv = $('advice');
    let msg = 'Tout roule, commissaire.', lvl = '';
    if (lostFlash > 0) { msg = 'Cellules pleines : des suspects repartent libres ! Construisez des cellules.'; lvl = 'bad'; }
    else if (r !== null && W.gav >= 3 && r < 0.85) { msg = 'La PTS est débordée : la prime est en danger. Recrutez des agents PTS.'; lvl = 'bad'; }
    else if (G.built.accueil && s !== null && s < 0.8) { msg = "L'accueil déborde : des usagers repartent fâchés."; lvl = 'warn'; }
    else if (G.det.length > G.n.inv) { msg = 'Plus de GAV que d\'enquêteurs : recrutez des enquêteurs.'; lvl = 'warn'; }
    else if (G.built.plaintes && G.plaQ > G.n.pla * 3) { msg = 'Les plaintes s\'empilent : recrutez des agents des plaintes.'; lvl = 'warn'; }
    else if (!G.det.length && !G.hall) { msg = 'Cellules vides : il faut plus de patrouilles.'; lvl = 'warn'; }
    else if (!G.built.accueil && G.money >= 60) { msg = "Vous pouvez ouvrir l'accueil (onglet Bâtiment)."; }
    adv.textContent = msg; adv.className = 'card advice ' + lvl;
    // tabs avec achat possible
    // étiquettes 3D
    const tg = S.tags;
    tg.hq.set(`${tier(G.tier).name}`);
    tg.cells.set(`GAV <em>${G.det.length}/${capacity()}</em>${G.hall ? ' · +' + G.hall + ' en attente' : ''}`);
    tg.inv.set(`Enquêteurs <em>${G._invBusy || 0}/${G.n.inv}</em>`);
    tg.pts.set(`PTS <em>${G._ptsBusy || 0}/${G.n.pts}</em>`);
    tg.acc.set(`Accueil · file <em>${G.cit}</em>`);
    tg.pla.set(`Plaintes · <em>${G.plaQ}</em> en attente`);
    tg.cars.set(`Patrouilles <em>${G.n.patrols}</em>${G.pistes ? ' · pistes ' + G.pistes : ''}`);
    tg.parp.set('Cliquez-moi !');
    tg.parp.show(G.total.gav < 3 && perfNow < 60);
  }

  function view() {
    return {
      tier: G.tier, patrols: G.n.patrols, cells: G.n.cells, cellCap: cellCap(), occ: G.det.length,
      inv: G.n.inv, invBusy: G._invBusy || 0, pts: G.n.pts, ptsBusy: G._ptsBusy || 0,
      accBuilt: G.built.accueil, plaBuilt: G.built.plaintes, acc: G.n.acc, accBusy: G._accBusy || 0,
      pla: G.n.pla, plaBusy: G._plaBusy || 0, queueCit: Math.min(G.cit, 10), plaQueue: G.plaQ,
      medals: G.medals, up: G.up,
    };
  }

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
    G = Object.assign(f, d, { n: Object.assign(f.n, d.n), up: Object.assign(f.up, d.up), built: Object.assign(f.built, d.built), week: Object.assign(f.week, d.week), total: Object.assign(f.total, d.total), acc: Object.assign(f.acc, d.acc), buffs: [] });
    if (G.pending && !(G.pending.prime >= 0)) G.pending = null;
    return true;
  }

  // ---------- boucle ----------
  let last = performance.now(), uiT = 0, saveT = 0, radioT = 0;
  const fxQ = [];
  function frame(now) {
    const real = Math.max(0, (now - last) / 1000);
    last = now;
    const dt = Math.min(real, 300);
    if (real > dt) { const g = rate() * (real - dt) * 0.5; G.money += g; G.runEarned += g; }
    let left = dt;
    while (left > 0) { const s = Math.min(left, 0.1); step(s); left -= s; }
    // effets visuels, étalés
    const fire = (k, fn, max) => { if (fx[k] > 0) { const n = Math.min(fx[k], max); for (let i = 0; i < n; i++) fxQ.push(fn); fx[k] = 0; } };
    fire('arrive', S.arrive, 2); fire('release', S.release, 2); fire('citizen', S.citizenIn, 1); fire('toPla', S.toPlaintes, 1); fire('angry', S.angry, 1);
    if (fxQ.length > 10) fxQ.splice(0, fxQ.length - 10);
    if (fxQ.length && Math.random() < 0.25) fxQ.shift()();
    if (golden) {
      golden.t += dt; golden.x += golden.vx * dt;
      golden.el.style.left = golden.x + 'px'; golden.el.style.top = golden.y + Math.sin(golden.t * 2) * 24 + 'px';
      if (golden.t > 16) killGolden();
    }
    if (pvAuto > 0 && (pvAuto -= dt) <= 0) collect();
    S.sync(view());
    if ((uiT += Math.min(dt, 1)) > 0.2) { uiT = 0; hud(); render(); }
    if ((saveT += dt) > 5) { saveT = 0; save(); }
    if ((radioT += dt) > 22) { radioT = 0; $('radio').textContent = pick(PD.RADIO); }
    requestAnimationFrame(frame);
  }

  function start(data) {
    const had = load(data);
    if (had && !data) {
      const away = Math.min((Date.now() - (G.lastSave || Date.now())) / 1000, 8 * 3600);
      const gain = (G.rateEst || 0) * away * 0.5;
      if (away > 60 && gain > 0) { G.money += gain; G.runEarned += gain; setTimeout(() => toast(`Pendant votre absence, les collègues ont rapporté ${eur(gain)}.`), 600); }
    }
    if (G.pending) showPV();
    render(true); hud();
    $('radio').textContent = pick(PD.RADIO);
    requestAnimationFrame(t => { last = t; frame(t); });
  }
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.claude?.hot?.snapshot?.(() => JSON.parse(JSON.stringify(G)));
  if (window.claude?.hot?.ready) window.claude.hot.ready(d => start(d && d.n ? d : null));
  else start(window.claude?.hot?.data?.n ? window.claude.hot.data : null);
})();
