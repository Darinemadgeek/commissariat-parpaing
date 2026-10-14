// Interface : HUD, boutique, procès-verbal, carte des affectations, croissant doré, boucle de jeu.
(function () {
  const { T, UNITS, UPGRADES, BUILDINGS, tier, site, fmt, eur, pick, PROBLEMS } = PD;
  const G = GM.G, $ = id => document.getElementById(id);
  const pct = v => (v === null || v === undefined ? '–' : Math.round(v * 100) + ' %');

  // ---------- retours visuels ----------
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
    el.className = 'float ' + (cls || ''); el.textContent = text;
    el.style.left = p.x + (Math.random() - 0.5) * 30 + 'px'; el.style.top = p.y + 'px';
    S.stage.appendChild(el); floats++;
    setTimeout(() => { el.remove(); floats--; }, 1400);
  }

  // ---------- procès-verbal de fin de semaine ----------
  let pvAuto = 0;
  function showPV() {
    const p = G.pending; if (!p) return;
    const ok = p.prime > 0;
    const talk = pick(PD.PRIME_TALK[!ok ? 'zero' : p.n === 3 ? 'great' : p.n >= 1 ? 'ok' : 'meh']);
    const star = on => `<span style="color:${on ? '#c48a00' : '#b9b3a0'}">★</span>`;
    $('pvSlot').innerHTML = `<div class="pv" role="dialog" aria-label="Rapport de fin de semaine">
      <h2>PROCÈS-VERBAL · SEMAINE ${p.no}</h2>
      <div class="sub">Commissariat de ${GM.here().name}</div>
      <div class="stamp-row"><span class="stamp ${ok ? 'ok' : ''}">${ok ? 'PRIME ACCORDÉE' : 'PRIME REFUSÉE'}</span></div>
      <dl>
        <dt>${star(p.st[0])} Dossiers traités</dt><dd>${fmt(p.dossiers)} / ${fmt(p.objective)}</dd>
        <dt>${star(p.st[1])} Signalisation PTS ≥ 95 %</dt><dd>${pct(p.r)} (${fmt(p.sig)}/${fmt(p.gav)})</dd>
        <dt>${star(p.st[2])} ${p.crit3}</dt><dd>${crit3Val(p)}</dd>
        <dt class="opt">dont GAV / plaintes</dt><dd class="opt">${fmt(p.gav)} / ${fmt(p.pla)}</dd>
        <dt class="opt">Recettes de la semaine</dt><dd class="opt">${eur(p.earned)}</dd>
        <dt><b>Prime</b></dt><dd><b>${eur(p.prime)}</b></dd>
      </dl>
      <p class="comment">« ${talk} »${p.quota ? (ok ? '' : ' Signalisation PTS sous 70 % : pas de prime.') : ' Objectif de dossiers manqué : pas de prime.'} +${p.n} étoile${p.n > 1 ? 's' : ''} pour votre dossier de mutation (${Math.min(G.cstars, T.STARS_TO_MOVE)}/${T.STARS_TO_MOVE}).</p>
      <button type="button" id="pvBtn">${ok ? 'Encaisser la prime' : 'Classer sans suite'}</button>
    </div>`;
    $('pvBtn').onclick = collect;
    pvAuto = 14;
  }
  function crit3Val(p) {
    const id = GM.here().star3.id;
    if (id === 'sat') return pct(p.s);
    if (id === 'clean') return pct(p.clean);
    if (id === 'faint') return p.malaises + ' malaise' + (p.malaises > 1 ? 's' : '');
    if (id === 'levee') return p.levees + ' levée' + (p.levees > 1 ? 's' : '');
    return p.lost + ' relâché' + (p.lost > 1 ? 's' : '');
  }
  function collect() {
    const v = GM.collect();
    if (v > 0) { floatAt('parp', '+' + eur(v) + ' PRIME'); toast('Prime encaissée : ' + eur(v)); }
    pvAuto = 0; $('pvSlot').innerHTML = '';
  }
  Object.assign(GM.ui, { float: floatAt, toast, pv: showPV });

  // ---------- boutique ----------
  let tab = 'staff', cards = [], shape = '', buyX = 1;
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
    b.onclick = () => { onClick(); render(); };
    c.upd(); list.appendChild(b); cards.push(c);
  }
  function addEl(tag, cls, html, live) {
    const el = document.createElement(tag); el.className = cls;
    const c = { upd: () => { const h = typeof html === 'function' ? html() : html; if (h !== c.h) { c.h = h; el.innerHTML = h; } } };
    c.upd(); list.appendChild(el); if (live) cards.push(c);
  }
  const zoneOf = id => ({ patrols: 'cars', cells: 'cells', inv: 'inv', pts: 'pts', acc: 'acc', pla: 'pla', clean: 'clean', masks: 'pts' })[id];
  function rebuild() {
    const scroll = list.scrollTop;
    list.innerHTML = ''; cards = [];
    $('buyx').hidden = tab !== 'staff';
    const sec = t => addEl('div', 'section-t', t);
    if (tab === 'staff') {
      for (const u of UNITS) {
        if (!GM.unitOn(u)) continue;
        mkCard(() => {
          const b = GM.bulk(u, buyX), cost = b.k ? b.cost : GM.unitCost(u);
          return { icon: u.id, name: u.name + (buyX !== 1 ? ` ×${b.k || 1}` : ''), desc: u.desc, owned: fmt(G.n[u.id]), cost: eur(cost), can: b.k > 0 && cost <= G.money, eff: effLine(u.id) };
        }, () => { const k = GM.buyUnit(u.id, buyX); if (k) floatAt(zoneOf(u.id), '+' + k + ' ' + u.name.toLowerCase(), 'blue'); });
      }
      if (!G.built.accueil) addEl('p', 'mini', "Ouvrez l'accueil dans l'onglet Bâtiment pour recevoir du public et des plaintes.");
    } else if (tab === 'up') {
      for (const u of UPGRADES) {
        if (!GM.upOn(u)) continue;
        mkCard(() => { const c = GM.upCost(u); return { icon: u.id, name: u.name, desc: u.desc, owned: 'niv. ' + G.up[u.id], cost: eur(c), can: c <= G.money }; }, () => { if (GM.buyUp(u.id)) toast(u.name + ' niveau ' + G.up[u.id] + ' !'); });
      }
    } else if (tab === 'build') {
      sec('Services');
      for (const b of BUILDINGS) {
        mkCard(() => {
          if (G.built[b.id]) return { icon: b.id, name: b.id === 'accueil' ? 'Accueil' : 'Bureau des plaintes', desc: 'Ouvert. ' + b.desc, owned: '✔', cost: 'ouvert', can: false };
          const lockedBy = b.needs && !G.built[b.needs];
          return { icon: b.id, name: b.name, desc: lockedBy ? "Ouvrez d'abord l'accueil." : b.desc, owned: '', cost: eur(b.cost), can: !lockedBy && b.cost <= G.money, locked: lockedBy };
        }, () => { if (GM.build(b.id)) toast(b.id === 'accueil' ? "L'accueil ouvre ses portes. Les usagers arrivent !" : 'Bureau des plaintes ouvert : les plaintes donnent des pistes aux patrouilles.'); });
      }
      sec('Le bâtiment');
      mkCard(() => {
        const nt = tier(G.tier + 1);
        return { icon: 'hq', name: 'Agrandir : ' + nt.name, desc: `Actuellement : ${tier(G.tier).name}. Recettes ×1,6, plus de public, une tour plus haute.`, owned: 'P' + (G.tier + 1), cost: eur(nt.cost), can: nt.cost <= G.money };
      }, () => { if (GM.upTier()) { toast('Promotion du bâtiment : ' + tier(G.tier).name + ' ! Recettes ×1,6'); floatAt('hq', tier(G.tier).name.toUpperCase()); } });
      sec('Carrière');
      mkCard(() => {
        const nx = site(G.site + 1), ok = GM.canMove();
        return { icon: 'mutation', name: ok ? 'Mutation possible !' : 'Carte des affectations', desc: ok ? `Vous avez ${T.STARS_TO_MOVE} étoiles. Prochain poste : ${nx.name} (${nx.kind}).` : `Gagnez ${T.STARS_TO_MOVE} étoiles en fin de semaine pour être muté à ${nx.name}. Chaque semaine rapporte jusqu'à 3 étoiles.`, owned: '★' + Math.min(G.cstars, T.STARS_TO_MOVE), cost: 'voir la carte', can: true, cls: ok ? 'danger' : '' };
      }, () => openMap());
    } else {
      addEl('div', 'dossier', () => {
        const p = GM.primeCalc(G.week), h = GM.here();
        return `<h3>Dossier du commissaire Parpaing</h3><dl>
        <dt>Affectation</dt><dd>${h.name}</dd>
        <dt>Bâtiment</dt><dd>${tier(G.tier).name}</dd>
        <dt>Étoiles (mutation)</dt><dd>★ ${G.cstars} / ${T.STARS_TO_MOVE}</dd>
        <dt>Galons</dt><dd>${G.galons} (+${G.galons * 50} % de recettes)</dd>
        <dt>Médailles</dt><dd>${G.medals}</dd>
        <dt>GAV bouclées</dt><dd>${fmt(G.total.gav)}</dd>
        <dt>Plaintes traitées</dt><dd>${fmt(G.total.pla)}</dd>
        <dt>Primes touchées</dt><dd>${eur(G.total.primes)}</dd>
        <dt>Recette par GAV</dt><dd>${eur(GM.gavValue(), 1)}</dd>
        <dt>Prime estimée (semaine)</dt><dd>${eur(p.prime)}</dd></dl>`;
      }, true);
      const h = GM.here();
      if (h.problems.length) addEl('p', 'mini', '<b>Problèmes de ce commissariat.</b><br>' + h.problems.map(k => `<b>${PROBLEMS[k].name} :</b> ${PROBLEMS[k].desc}`).join('<br>'));
      addEl('p', 'mini', `<b>Étoiles de la semaine.</b> 1 étoile si l'objectif de dossiers (GAV + plaintes) est atteint, 1 si la signalisation PTS atteint 95 %, 1 pour le critère local : ${h.star3.label.toLowerCase()}. À ${T.STARS_TO_MOVE} étoiles, vous pouvez demander votre mutation sur la carte.<br><br><b>Taux de signalisation.</b> Personnes signalisées par la PTS, divisées par les personnes passées en GAV et auditionnées par les enquêteurs cette semaine. Une personne qui sort avant la fin de sa signalisation compte comme non signalisée. Une signalisation (14 s) est plus longue qu'une audition (12 s) : il faut plus d'agents PTS que d'enquêteurs, ou la borne biométrique.<br><br><b>Prime.</b> Versée uniquement si la jauge d'objectif est pleine : 50 % des recettes de la semaine, réduite si la PTS ne suit pas (rien sous 70 %) ou si des usagers repartent fâchés, +25 % par étoile. Objectif manqué : il baisse un peu la semaine suivante.<br><br><b>Astuces.</b> Les plaintes donnent des pistes : avec des pistes, les patrouilles vont deux fois plus vite. Un clic sur le commissaire ou sur le tampon accélère la GAV la plus ancienne. Attrapez les croissants dorés.`);
    }
    list.scrollTop = scroll;
  }
  function render() {
    const s = [tab, buyX, G.site, G.built.accueil, G.built.plaintes, GM.canMove()].join('|');
    if (s !== shape) { shape = s; rebuild(); } else cards.forEach(c => c.upd());
  }
  function effLine(id) {
    const W = G.week;
    if (id === 'patrols') return `${fmt((60 * G.n.patrols / T.PATROL_TIME) * (1 + 0.25 * G.up.gyro), 1)} / min interpellations${G.pistes ? ' (×2 avec pistes : ' + G.pistes + ')' : ''}`;
    if (id === 'cells') return `${G.det.length} / ${GM.capacity()} places occupées · ${G.hall} en attente`;
    if (id === 'inv') return `${G._invBusy || 0} / ${G.n.inv} en audition · ${eur(GM.gavValue(), 1)} par GAV`;
    if (id === 'pts') {
      const pm = GM.ptsPerMin(), im = GM.invPerMin();
      return `Signalise ${fmt(pm, 1)} GAV/min · les enquêteurs en bouclent ${fmt(im, 1)}/min${pm < im * 0.95 ? ' → pas assez de PTS' : ' → ça suit'}${G.ptsDown.length ? ' · ' + G.ptsDown.length + ' en malaise' : ''}`;
    }
    if (id === 'acc') return `${G.cit} usager${G.cit > 1 ? 's' : ''} dans la file · ${W.partis} repartis fâchés`;
    if (id === 'pla') return `${G.plaQ} plainte${G.plaQ > 1 ? 's' : ''} en attente · ${eur(GM.plaValue(), 1)} par plainte`;
    if (id === 'clean') return `${G.vomit} flaque${G.vomit > 1 ? 's' : ''} · propreté ${pct(GM.propre())}`;
    if (id === 'masks') return `${Math.min(G.n.masks, G.n.pts)} / ${G.n.pts} agents PTS équipés · ${W.malaises} malaise${W.malaises > 1 ? 's' : ''} cette semaine`;
    return '';
  }
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
    render();
  });
  document.querySelectorAll('#buyx button').forEach(b => b.onclick = () => {
    buyX = b.dataset.x === 'max' ? 'max' : Number(b.dataset.x);
    document.querySelectorAll('#buyx button').forEach(x => x.setAttribute('aria-pressed', x === b));
    render();
  });
  const tampon = () => { GM.tampon(); S.parpaingHit(); };
  $('tamponBtn').onclick = tampon;
  S.onParpaing = tampon;

  // ---------- carte des affectations ----------
  const NODES = [[115, 315], [235, 225], [345, 300], [440, 160], [520, 270], [530, 62]];
  const ICON = {
    campagne: '<path d="M-22 10 Q-8-8 6 4 T24 8 V16 H-22Z" fill="#7cc45c"/><rect x="-8" y="-4" width="12" height="10" fill="#b5322c"/><path d="M-10-4 L-2-12 L6-4Z" fill="#6b2a24"/>',
    ville: '<rect x="-18" y="-6" width="10" height="20" fill="#efe3c8"/><rect x="-6" y="-12" width="12" height="26" fill="#f6bd60"/><rect x="8" y="-4" width="10" height="18" fill="#84a59d"/>',
    metropole: '<rect x="-18" y="-10" width="10" height="24" fill="#c9ccd1"/><rect x="-6" y="-18" width="11" height="32" fill="#2d4a6b"/><rect x="7" y="-8" width="10" height="22" fill="#c8694a"/>',
    megapole: '<rect x="-17" y="-20" width="9" height="34" fill="#1d2b44"/><rect x="-6" y="-26" width="10" height="40" fill="#2d4a6b"/><rect x="6" y="-16" width="10" height="30" fill="#1d2b44"/><rect x="-4" y="-20" width="2" height="2" fill="#ffd27a"/><rect x="9" y="-10" width="2" height="2" fill="#ffd27a"/>',
    cite: '<rect x="-20" y="-6" width="40" height="8" fill="#e6e1d6"/><rect x="-20" y="4" width="40" height="10" fill="#c9ccd1"/><rect x="-12" y="-16" width="8" height="12" fill="#ffffff"/><rect x="2" y="-12" width="6" height="8" fill="#ff4b5c"/>',
  };
  let sel = 0, armMove = false;
  function openMap() { sel = Math.min(G.site + (GM.canMove() ? 1 : 0), G.site + 1); armMove = false; drawMap(); $('mapOv').hidden = false; }
  function closeMap() { $('mapOv').hidden = true; }
  $('mapBtn').onclick = openMap;
  $('mapOv').addEventListener('click', e => { if (e.target.id === 'mapOv') closeMap(); });
  function drawMap() {
    const n = NODES.length, cur = G.site;
    const path = NODES.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
    let svg = `<svg class="mapsvg" viewBox="0 0 620 400" role="group" aria-label="Commissariats">
      <rect width="620" height="400" fill="#e9dfc4"/>
      <path d="M0 360 Q160 300 300 380 T620 330 V400 H0Z" fill="#cfe3b5"/><path d="M380 0 Q470 120 620 120 V0Z" fill="#c9d3dd"/>
      <path d="${path}" fill="none" stroke="#8a6d4a" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 16"/>`;
    for (let i = 0; i < n; i++) {
      const [x, y] = NODES[i], idx = i < n - 1 ? i : Math.max(n - 1, cur), s = site(idx);
      const done = idx < cur, here = idx === cur, next = idx === cur + 1, ring = here ? '#3d7bff' : done ? '#c48a00' : next ? '#e63946' : '#9aa0aa';
      svg += `<g class="node" tabindex="0" data-i="${idx}" transform="translate(${x} ${y})">
        <circle r="34" fill="${done || here ? '#ffffff' : '#f4efe1'}" stroke="${ring}" stroke-width="${sel === idx ? 7 : 4}" class="ring"/>
        <g opacity="${done || here || next ? 1 : 0.45}">${ICON[s.biome]}</g>
        <text y="52" text-anchor="middle" font-family="Rubik, sans-serif" font-weight="800" font-size="13" fill="#2a2833">${i === n - 1 && idx >= n - 1 && cur < n - 1 ? 'Secteurs suivants' : s.name}</text>
        <text y="68" text-anchor="middle" font-family="Rubik, sans-serif" font-size="12" fill="#5a5560">${here ? 'Vous êtes ici · ★ ' + Math.min(G.cstars, T.STARS_TO_MOVE) + '/' + T.STARS_TO_MOVE : done ? 'Terminé ★ ' + (G.siteStars[idx] || T.STARS_TO_MOVE) : next ? 'Prochaine mutation' : 'Verrouillé'}</text>
      </g>`;
    }
    svg += '</svg>';
    const s = site(sel), isNext = sel === cur + 1, prevProbs = sel > 0 ? site(sel - 1).problems : [];
    const probs = s.problems.length ? s.problems.map(k => `<div class="pb"><b>${PROBLEMS[k].name}${prevProbs.includes(k) ? '' : ' · nouveau'}</b>${PROBLEMS[k].desc}</div>`).join('') : '<div class="pb"><b>Aucun problème particulier</b>Le poste idéal pour apprendre le métier.</div>';
    let btn;
    if (sel === cur) btn = '<button class="go" disabled>Vous êtes ici</button>';
    else if (sel < cur) btn = '<button class="go" disabled>Mission accomplie</button>';
    else if (isNext && GM.canMove()) btn = `<button class="go ${armMove ? 'arm' : ''}" id="goMove">${armMove ? 'Confirmer : tout repart à zéro, sauf vos galons' : 'Demander ma mutation'}</button>`;
    else if (isNext) btn = `<button class="go" disabled>Encore ${T.STARS_TO_MOVE - G.cstars} étoile${T.STARS_TO_MOVE - G.cstars > 1 ? 's' : ''} à gagner</button>`;
    else btn = '<button class="go" disabled>Verrouillé</button>';
    $('mapOv').innerHTML = `<div class="mapcard">
      <header><h2>Carte des affectations</h2><button type="button" id="mapClose">Fermer</button></header>
      ${svg}
      <div class="mapinfo"><h3>${s.name}</h3><div class="kind">${s.kind}</div><p style="margin:0 0 6px">${s.pitch}</p>${probs}
        <p style="margin:8px 0 0"><b>3e étoile :</b> ${s.star3.label}</p>
        ${isNext ? `<p style="margin:6px 0 0">Bonus de mutation : +1 galon (+50 % de recettes pour toujours), ${eur(300 * (G.galons + 1))} de départ.</p>` : ''}
        ${btn}</div></div>`;
    $('mapClose').onclick = closeMap;
    $('mapOv').querySelectorAll('.node').forEach(g => {
      const go = () => { sel = +g.dataset.i; armMove = false; drawMap(); };
      g.onclick = go; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
    const gm = $('goMove');
    if (gm) gm.onclick = () => {
      if (!armMove) { armMove = true; drawMap(); return; }
      if (GM.move()) {
        closeMap(); $('pvSlot').innerHTML = '';
        S.setSite(GM.here());
        toast(`Bienvenue à ${GM.here().name} ! Nouveau poste, nouveaux problèmes.`);
        render();
      }
    };
  }

  // ---------- croissant doré ----------
  let golden = null;
  function spawnGolden() {
    const el = document.createElement('button');
    el.className = 'golden'; el.type = 'button'; el.setAttribute('aria-label', 'Croissant doré : cliquez pour un bonus');
    el.innerHTML = '<svg viewBox="0 0 64 64"><path d="M6 40C10 18 54 18 58 40c-8-6-14-6-16 2-4-8-12-8-16 0-2-8-8-8-20-2z" fill="#ffcf4a" stroke="#8a5a00" stroke-width="3"/><path d="M22 30l4 8M32 27v10M42 30l-4 8" stroke="#8a5a00" stroke-width="2.5"/></svg>';
    const st = S.stage, dirL = Math.random() < 0.5;
    golden = { el, x: dirL ? -70 : st.clientWidth + 10, y: 90 + Math.random() * Math.max(40, st.clientHeight - 220), vx: (dirL ? 1 : -1) * (60 + Math.random() * 40), t: 0 };
    el.onclick = catchGolden;
    st.appendChild(el);
  }
  function catchGolden() {
    if (!golden) return;
    const g = pick(PD.GOLDEN);
    if (g.id === 'cash') { const v = Math.max(50, GM.rate() * 90 + G.money * 0.05); GM.earn(v); toast(g.msg + ' +' + eur(v)); }
    else { GM.addBuff(g.id, g.dur, g.label, g.malus); toast(g.msg); }
    killGolden();
  }
  function killGolden() { if (golden) golden.el.remove(); golden = null; G.goldenIn = 60 + Math.random() * 70; }

  // ---------- infobulles : comment chaque stat est calculée ----------
  const calc = s => `<span class="calc">${s}</span>`;
  const TIPS = {
    cash: () => `<strong>Caisse du commissariat</strong>L'argent disponible pour recruter, équiper et agrandir.<br><b>€/s</b> : moyenne de vos gains sur les 20 dernières secondes.${calc(`${eur(GM.rate(), 1)} / s en ce moment`)}`,
    dos: () => `<strong>Dossiers traités</strong>GAV auditionnées + plaintes traitées depuis lundi. C'est ce qui remplit la jauge d'objectif.${calc(`${G.week.gav} GAV + ${G.week.pla} plaintes = ${G.week.gav + G.week.pla} dossiers`)}`,
    sig: () => { const W = G.week, r = GM.sigRate(W); return `<strong>Taux de signalisation</strong>Personnes signalisées par la PTS ÷ personnes passées en GAV et auditionnées par les enquêteurs cette semaine. Si la personne sort avant la fin de sa signalisation, elle compte comme non signalisée.${calc(W.gav ? `${W.sig} signalisées / ${W.gav} auditionnées = ${pct(r)}` : 'Aucune GAV auditionnée cette semaine')}≥ 95 % : 1 étoile · sous 85 % : prime réduite · sous 70 % : pas de prime.${calc(`PTS : ${fmt(GM.ptsPerMin(), 1)} signalisations/min · enquêteurs : ${fmt(GM.invPerMin(), 1)} auditions/min`)}`; },
    gav: () => `<strong>GAV auditionnées</strong>Gardes à vue dont l'audition est terminée cette semaine. Chacune rapporte de l'argent.${calc(`${G.week.gav} × ${eur(GM.gavValue(), 1)}`)}`,
    pla: () => `<strong>Plaintes traitées</strong>Plaintes bouclées par le bureau des plaintes cette semaine. Une sur deux donne une piste : avec des pistes, les patrouilles interpellent deux fois plus vite.${calc(`${G.week.pla} × ${eur(GM.plaValue(), 1)} · ${G.pistes} piste${G.pistes > 1 ? 's' : ''} en stock`)}`,
    sat: () => { const W = G.week; return `<strong>Usagers bien reçus</strong>Usagers enregistrés au guichet ÷ tous les usagers venus (enregistrés + repartis fâchés parce que la file était pleine). Un accueil débordé réduit la prime, jusqu'à moitié.${calc(W.recus + W.partis ? `${W.recus} reçus / ${W.recus + W.partis} venus = ${pct(GM.satRate(W))}` : "Personne n'est encore venu cette semaine")}`; },
    lost: () => `<strong>Relâchés faute de place</strong>Suspects ramenés par les patrouilles mais relâchés parce que les cellules et la salle d'attente étaient pleines. Rien n'est encaissé pour eux.${calc(`${GM.capacity()} places en cellule + ${GM.hallCap()} en attente`)}`,
    obj: () => { const p = GM.primeCalc(G.week); return `<strong>Objectif préfectoral et prime</strong>Dossiers à traiter avant dimanche soir. Jauge pleine : la prime est versée et vous gagnez 1 étoile. Atteint, l'objectif monte de 20 % ; manqué, il baisse de 10 %.${calc(`Prime = 50 % des recettes × qualité PTS × satisfaction usagers × (1 + 25 % par étoile)`)}${calc(`Recettes : ${eur(G.week.earned)} · qualité PTS ${Math.round(p.q * 100)} % · satisfaction ${Math.round(p.sat * 100)} % → ${p.quota ? eur(p.prime) : 'jauge pas pleine : 0 €'}`)}`; },
    propre: () => `<strong>Propreté des couloirs</strong>100 % moins 4 % par flaque de vomi. Chaque flaque ralentit aussi tout le monde de 3 % (on glisse). Les agents d'entretien nettoient une flaque toutes les ${T.CLEAN_TIME} s chacun.${calc(`${G.vomit} flaque${G.vomit > 1 ? 's' : ''} → ${pct(GM.propre())} · moyenne semaine ${pct(GM.cleanRate(G.week))}`)}`,
    malaise: () => `<strong>Malaises à la PTS</strong>Un agent PTS sans masque qui signalise une GAV qui pue des pieds travaille à ${T.UNMASKED * 100} % de sa vitesse et peut faire un malaise (${T.FAINT_TIME} s au sol). Un masque équipe un agent.${calc(`${Math.min(G.n.masks, G.n.pts)} / ${G.n.pts} agents équipés · ${G.week.malaises} malaise${G.week.malaises > 1 ? 's' : ''} cette semaine`)}`,
    levee: () => `<strong>GAV levées</strong>Une GAV dure au maximum ${Math.round(GM.gavLimit())} s (les 24 h légales). Au-delà, elle est levée : pas d'argent, et elle ne compte pas dans les dossiers. Les GAV avec avocat sont auditionnées plus lentement.${calc(`${G.week.levees} levée${G.week.levees > 1 ? 's' : ''} cette semaine`)}`,
    manif: () => `<strong>Manifestations</strong>Pendant ${T.MANIF_LEN} s, les patrouilles ramènent ${T.MANIF_MULT} fois plus de monde. Prévoyez des cellules et la salle d'attente XXL.${calc(G.manifLeft > 0 ? `Manif en cours : encore ${Math.ceil(G.manifLeft)} s` : `Prochaine manif dans ${Math.ceil(G.manifIn)} s`)}`,
    st1: () => `<strong>Étoile 1 : objectif</strong>Gagnée si la jauge d'objectif est pleine dimanche soir.${calc(`${G.week.gav + G.week.pla} / ${G.objective} dossiers`)}`,
    st2: () => `<strong>Étoile 2 : signalisation</strong>Gagnée si au moins 95 % des personnes auditionnées cette semaine ont été signalisées.${calc(G.week.gav ? `${G.week.sig} / ${G.week.gav} = ${pct(GM.sigRate(G.week))}` : 'Aucune GAV auditionnée')}`,
    st3: () => `<strong>Étoile 3 : ${GM.here().star3.label}</strong>Le critère propre à ${GM.here().name}, mesuré sur toute la semaine.`,
    cstars: () => `<strong>Étoiles de mutation</strong>Étoiles gagnées dans ce commissariat, 3 au maximum par semaine. À ${T.STARS_TO_MOVE}, la carte permet d'être muté au poste suivant.${calc(`${Math.min(G.cstars, T.STARS_TO_MOVE)} / ${T.STARS_TO_MOVE} étoiles`)}`,
  };
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let tipKey = null, tipEl = null, lastPtr = 'mouse';
  function placeTip() {
    if (!tipKey || !tipEl || !tipEl.isConnected) { tipEl = tipKey && document.querySelector(`[data-tip="${tipKey}"]`); if (!tipEl) return hideTip(); }
    const h = TIPS[tipKey](); if (tip.innerHTML !== h) tip.innerHTML = h;
    const r = tipEl.getBoundingClientRect(), w = tip.offsetWidth, hh = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = Math.min(Math.max(16, r.left + r.width / 2 - w / 2), vw - w - 16), y = r.bottom + 8;
    if (y + hh > vh - 8) y = Math.max(8, r.top - hh - 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function showTip(el) { tipEl = el; tipKey = el.dataset.tip; tip.hidden = false; placeTip(); }
  function hideTip() { tip.hidden = true; tipKey = null; tipEl = null; }
  document.addEventListener('pointerdown', e => { lastPtr = e.pointerType; }, true);
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('[data-tip]'); if (el && TIPS[el.dataset.tip]) showTip(el); });
  document.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener('click', e => {
    if (lastPtr === 'mouse') return;
    const el = e.target.closest('[data-tip]');
    if (el && el.tagName !== 'BUTTON' && TIPS[el.dataset.tip]) { if (tipKey === el.dataset.tip) hideTip(); else showTip(el); }
    else if (!el) hideTip();
  });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el && TIPS[el.dataset.tip]) showTip(el); });
  document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  const setHTML = (el, h) => { if (el.innerHTML !== h) el.innerHTML = h; };

  // ---------- HUD ----------
  const cls = (el, v, good, warn) => { el.className = v === null ? '' : v >= good ? 'ok' : v >= warn ? 'warn' : 'bad'; };
  function hud() {
    const W = G.week, h = GM.here();
    $('tamponVal').textContent = '+' + eur(GM.tamponValue(), 1);
    $('weekNo').textContent = 'Semaine ' + W.no;
    $('dayName').textContent = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][Math.min(6, Math.floor(W.t / T.DAY_LEN))];
    $('weekBar').style.width = (W.t / (T.DAY_LEN * 7)) * 100 + '%';
    const dos = W.gav + W.pla, r = GM.sigRate(W), s = GM.satRate(W);
    $('sDos').textContent = fmt(dos);
    const sig = $('sSig'); sig.textContent = r === null ? '–' : `${pct(r)} (${W.sig}/${W.gav})`; cls(sig, r, 0.95, 0.7);
    $('sGav').textContent = fmt(W.gav); $('sPla').textContent = fmt(W.pla);
    const sat = $('sSat'); sat.textContent = pct(s); cls(sat, s, 0.9, 0.6);
    const lost = $('sLost'); lost.textContent = fmt(W.lost); lost.className = W.lost ? 'bad' : '';
    // la jauge dit exactement si la prime tombera
    const pc = GM.primeCalc(W), full = dos >= G.objective, state = !full ? '' : pc.prime > 0 ? 'full' : 'void';
    $('objTxt').textContent = !full ? `Objectif préfectoral : ${fmt(dos)} / ${fmt(G.objective)} dossiers · prime si la jauge est pleine`
      : pc.prime > 0 ? `Objectif atteint ✔ · prime estimée ${eur(pc.prime)}` : 'Objectif atteint, mais signalisation PTS sous 70 % : pas de prime';
    $('objBar').style.width = Math.min(100, (dos / G.objective) * 100) + '%';
    $('objBar').className = state; $('objTxt').parentNode.className = 'obj ' + state;
    // problèmes du lieu
    const rows = [];
    if (GM.has('vomi')) { const p = GM.propre(); rows.push(['Propreté', pct(p), p >= 0.9 ? 'ok' : p >= 0.6 ? 'warn' : 'bad', 'propre']); }
    if (GM.has('pieds')) rows.push(['Malaises PTS', W.malaises, W.malaises ? 'bad' : 'ok', 'malaise']);
    if (GM.has('delai')) rows.push(['GAV levées', W.levees, W.levees ? 'bad' : 'ok', 'levee']);
    if (GM.has('manif')) rows.push(['Manif', G.manifLeft > 0 ? 'EN COURS' : 'dans ' + Math.ceil(G.manifIn) + ' s', G.manifLeft > 0 ? 'bad' : '', 'manif']);
    $('probs').hidden = !rows.length;
    setHTML($('probs'), rows.map(([a, b, c, k]) => `<div data-tip="${k}" tabindex="0"><span>${a}</span><b class="${c}">${b}</b></div>`).join(''));
    const st = GM.weekStars(W);
    setHTML($('wStars'), [['Objectif', st[0]], ['PTS ≥ 95 %', st[1]], [h.star3.label, st[2]]].map(([l, on], i) => `<span class="${on ? 'on' : ''}" data-tip="st${i + 1}" tabindex="0">${l}</span>`).join(''));
    if (tipKey) placeTip();
    $('cStars').textContent = `★ ${Math.min(G.cstars, T.STARS_TO_MOVE)}/${T.STARS_TO_MOVE}`;
    $('mapBtn').classList.toggle('ready', GM.canMove());
    $('tierName').textContent = `${tier(G.tier).name} · ${h.name}`;
    $('buffs').innerHTML = G.buffs.map(b => `<span class="buff${b.malus ? ' malus' : ''}">${b.label} · ${Math.ceil(b.until - GM.perf())} s</span>`).join('');
    advice(r, s);
    const tg = S.tags;
    tg.hq.set(`${tier(G.tier).name}`);
    tg.cells.set(`GAV <em>${G.det.length}/${GM.capacity()}</em>${G.hall ? ' · +' + G.hall + ' en attente' : ''}`);
    tg.inv.set(`Enquête <em>${G._invBusy || 0}/${G.n.inv}</em>`);
    tg.pts.set(`PTS <em>${G._ptsBusy || 0}/${G.n.pts}</em>${GM.has('pieds') ? ' · masques ' + Math.min(G.n.masks, G.n.pts) : ''}`);
    tg.acc.set(`Accueil · file <em>${G.cit}</em>`);
    tg.pla.set(`Plaintes · <em>${G.plaQ}</em> en attente`);
    tg.cars.set(`Patrouilles <em>${G.n.patrols}</em>${G.pistes ? ' · pistes ' + G.pistes : ''}`);
    tg.clean.set(`Propreté <em>${pct(GM.propre())}</em>`);
    tg.parp.set('Cliquez-moi !');
    tg.parp.show(G.total.gav < 3 && GM.perf() < 60);
  }
  function advice(r, s) {
    const W = G.week, adv = $('advice');
    let msg = 'Tout roule, commissaire.', lvl = '';
    const smellyNow = G.det.some(d => d.smelly);
    if (GM.lost()) { msg = 'Cellules pleines : des suspects repartent libres ! Construisez des cellules.'; lvl = 'bad'; }
    else if (G.manifLeft > 0) { msg = 'Manifestation en cours : il faut de la place en cellule.'; lvl = 'warn'; }
    else if (GM.has('pieds') && smellyNow && G.n.masks < G.n.pts) { msg = 'Ça sent les pieds : équipez la PTS de masques à gaz.'; lvl = 'bad'; }
    else if (GM.has('vomi') && GM.propre() < 0.8) { msg = 'Du vomi partout dans les couloirs : recrutez des agents d\'entretien.'; lvl = 'bad'; }
    else if (GM.has('delai') && W.levees > 0 && G.det.length > G.n.inv) { msg = 'Des GAV dépassent le délai légal : il faut plus d\'enquêteurs.'; lvl = 'bad'; }
    else if (r !== null && W.gav >= 3 && r < 0.85) { msg = 'La PTS est débordée : la prime est en danger. Recrutez des agents PTS.'; lvl = 'bad'; }
    else if (G.built.accueil && s !== null && s < 0.8) { msg = "L'accueil déborde : des usagers repartent fâchés."; lvl = 'warn'; }
    else if (G.det.length > G.n.inv) { msg = "Plus de GAV que d'enquêteurs : recrutez des enquêteurs."; lvl = 'warn'; }
    else if (G.built.plaintes && G.plaQ > G.n.pla * 3) { msg = "Les plaintes s'empilent : recrutez des agents des plaintes."; lvl = 'warn'; }
    else if (!G.det.length && !G.hall) { msg = 'Cellules vides : il faut plus de patrouilles.'; lvl = 'warn'; }
    else if (!G.built.accueil && G.money >= 60) msg = "Vous pouvez ouvrir l'accueil (onglet Bâtiment).";
    else if (GM.canMove()) msg = 'Mutation possible : ouvrez la carte !';
    if (adv.textContent !== msg) adv.textContent = msg;
    adv.className = 'card advice ' + lvl;
  }
  function view() {
    let smelly = 0, lawyers = 0;
    for (const d of G.det) { if (d.smelly) smelly++; if (d.lawyer) lawyers++; }
    return {
      tier: G.tier, patrols: G.n.patrols, cells: G.n.cells, cellCap: GM.cellCap(), occ: G.det.length, hall: Math.min(G.hall, 6),
      inv: G.n.inv, invBusy: G._invBusy || 0, pts: G.n.pts, ptsBusy: G._ptsBusy || 0,
      accBuilt: G.built.accueil, plaBuilt: G.built.plaintes, acc: G.n.acc, accBusy: G._accBusy || 0,
      pla: G.n.pla, plaBusy: G._plaBusy || 0, queueCit: Math.min(G.cit, 10), plaQueue: G.plaQ, medals: G.medals, up: G.up,
      probs: { vomi: GM.has('vomi'), pieds: GM.has('pieds'), delai: GM.has('delai'), manif: GM.has('manif') },
      vomit: G.vomit, clean: G.n.clean, smelly, masks: G.n.masks, ptsDown: G.ptsDown.length, lawyers, manif: G.manifLeft > 0,
    };
  }

  // ---------- caisse qui défile ----------
  // L'affichage rattrape la vraie somme en douceur ; une dépense se voit tout de suite.
  const SUF = ['', 'k', 'M', 'Md', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function moneyFmt(n) {
    if (n < 1e7) return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
    const e = Math.floor(Math.log10(n) / 3);
    if (e >= SUF.length) return n.toExponential(3).replace('.', ',') + ' €';
    return (n / Math.pow(1000, e)).toFixed(3).replace('.', ',') + ' ' + SUF[e] + ' €';
  }
  let dispMoney = null, dispRate = 0, lastMoneyTxt = '', lastRateTxt = '';
  function tickMoney(dt) {
    if (dispMoney === null || G.money < dispMoney) dispMoney = G.money;
    else { dispMoney += (G.money - dispMoney) * Math.min(1, dt * 3); if (G.money - dispMoney < 0.5) dispMoney = G.money; }
    dispRate += (GM.rate() - dispRate) * Math.min(1, dt * 2);
    const m = moneyFmt(dispMoney), r = eur(dispRate, 1);
    if (m !== lastMoneyTxt) { lastMoneyTxt = m; $('money').textContent = m; }
    if (r !== lastRateTxt) { lastRateTxt = r; $('rate').textContent = r; }
  }

  // ---------- boucle ----------
  let last = performance.now(), uiT = 0, saveT = 0, radioT = 0;
  const fxQ = [];
  function radio() { const b = PD.RADIO_BY[GM.here().biome] || []; $('radio').textContent = pick(Math.random() < 0.5 && b.length ? b : PD.RADIO); }
  function frame(now) {
    const real = Math.max(0, (now - last) / 1000);
    last = now;
    const dt = Math.min(real, 300);
    if (real > dt) { const g = GM.rate() * (real - dt) * 0.5; G.money += g; G.runEarned += g; }
    let left = dt;
    while (left > 0) { const s = Math.min(left, 0.1); GM.step(s); left -= s; }
    const fx = GM.ui.fx;
    const fire = (k, fn, max) => { if (fx[k] > 0) { const n = Math.min(fx[k], max); for (let i = 0; i < n; i++) fxQ.push(fn); fx[k] = 0; } };
    fire('arrive', S.arrive, 2); fire('release', S.release, 2); fire('citizen', S.citizenIn, 1); fire('toPla', S.toPlaintes, 1); fire('angry', S.angry, 1); fire('toPts', S.toPts, 1);
    if (fxQ.length > 10) fxQ.splice(0, fxQ.length - 10);
    if (fxQ.length && Math.random() < 0.25) fxQ.shift()();
    if (G.goldenIn <= 0 && !golden) spawnGolden();
    if (golden) {
      golden.t += dt; golden.x += golden.vx * Math.min(dt, 0.1);
      golden.el.style.left = golden.x + 'px'; golden.el.style.top = golden.y + Math.sin(golden.t * 2) * 24 + 'px';
      if (golden.t > 16) killGolden();
    }
    if (pvAuto > 0 && (pvAuto -= Math.min(dt, 1)) <= 0) collect();
    S.sync(view());
    tickMoney(Math.min(dt, 0.1));
    if ((uiT += Math.min(dt, 1)) > 0.2) { uiT = 0; hud(); render(); }
    if ((saveT += Math.min(dt, 1)) > 5) { saveT = 0; GM.save(); }
    if ((radioT += Math.min(dt, 1)) > 22) { radioT = 0; radio(); }
    requestAnimationFrame(frame);
  }

  function start(data) {
    const had = GM.load(data);
    if (had && !data) {
      const away = Math.min((Date.now() - (G.lastSave || Date.now())) / 1000, 8 * 3600);
      const gain = (G.rateEst || 0) * away * 0.5;
      if (away > 60 && gain > 0) { G.money += gain; G.runEarned += gain; setTimeout(() => toast(`Pendant votre absence, les collègues ont rapporté ${eur(gain)}.`), 600); }
    }
    S.setSite(GM.here());
    if (G.pending) showPV();
    render(); hud(); radio();
    requestAnimationFrame(t => { last = t; frame(t); });
  }
  window.addEventListener('beforeunload', GM.save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) GM.save(); });
  window.claude?.hot?.snapshot?.(() => JSON.parse(JSON.stringify(G)));
  if (window.claude?.hot?.ready) window.claude.hot.ready(d => start(d && d.n ? d : null));
  else start(window.claude?.hot?.data?.n ? window.claude.hot.data : null);
})();
