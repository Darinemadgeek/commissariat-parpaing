// Interface : HUD, boutique, procès-verbal, carte des affectations, croissant doré, boucle de jeu.
(function () {
  const { T, UNITS, UPGRADES, BUILDINGS, tier, site, fmt, eur, pick, PROBLEMS } = PD;
  const G = GM.G, $ = id => document.getElementById(id);
  const pct = v => (v === null || v === undefined ? '–' : Math.round(v * 100) + ' %');

  // ---------- retours visuels ----------
  function toast(msg) {
    // le temps d'affichage suit la longueur du message ; un tap le ferme
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    el.onclick = () => el.remove();
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), Math.max(4000, Math.min(12000, msg.length * 70)));
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
    const talk = pick(PD.PRIME_TALK[!ok ? 'zero' : p.n === 3 ? 'great' : !p.st[1] ? 'okPts' : 'ok']); // le commentaire colle à ce qui a manqué
    const star = on => `<span style="color:${on ? '#c48a00' : '#b9b3a0'}">★</span>`;
    $('pvSlot').innerHTML = `<div class="pv" role="dialog" aria-label="Rapport de fin de semaine">
      <h2>PROCÈS-VERBAL · SEMAINE ${p.no}</h2>
      <div class="sub">Commissariat de ${GM.here().name}</div>
      <div class="stamp-row"><span class="stamp ${ok ? 'ok' : ''}">${ok ? 'PRIME ACCORDÉE' : 'PRIME REFUSÉE'}</span></div>
      <dl>
        <dt>${star(p.st[0])} Dossiers traités</dt><dd>${fmt(p.dossiers)} / ${fmt(p.objective)}</dd>
        <dt>${star(p.st[1])} Signalisation PTS ≥ 95 %</dt><dd>${pct(p.r)} (${fmt(p.sig)}/${fmt(p.gav)})</dd>
        <dt>${star(p.st[2])} ${p.crit3}</dt><dd>${crit3Val(p)}</dd>
        ${(p.quests || []).map(q => `<dt>${q.double ? '★×2' : q.done ? '✔' : '✘'} Mission : ${q.name}</dt><dd>${q.double ? 'étoiles ×2' : q.done ? '+' + q.reward + ' ★' : '0 ★'}</dd>`).join('')}
        <dt class="opt">dont GAV / plaintes</dt><dd class="opt">${fmt(p.gav)} / ${fmt(p.pla)}</dd>
        <dt class="opt">Recettes de la semaine</dt><dd class="opt">${eur(p.earned)}</dd>
        <dt><b>Prime</b></dt><dd><b>${eur(p.prime)}</b></dd>
      </dl>
      <p class="comment">« ${talk} »${p.quota ? (ok ? '' : ' Signalisation PTS sous 70 % : pas de prime.') : ' Objectif de dossiers manqué : pas de prime.'} +${p.gained ?? p.n} étoile${(p.gained ?? p.n) > 1 ? 's' : ''} pour votre dossier de mutation (${Math.min(G.cstars, T.STARS_TO_MOVE)}/${T.STARS_TO_MOVE}).</p>
      <button type="button" id="pvBtn">${ok ? 'Encaisser la prime' : 'Classer sans suite'}</button>
    </div>`;
    $('pvBtn').onclick = collect;
    pvAuto = 20;
  }
  function crit3Val(p) {
    const id = GM.here().star3.id;
    if (id === 'sat') return pct(p.s);
    if (id === 'clean') return pct(p.clean);
    if (id === 'faint') return p.malaises + ' malaise' + (p.malaises > 1 ? 's' : '');
    if (id === 'levee') return p.levees + ' levée' + (p.levees > 1 ? 's' : '');
    if (id === 'scandal') return p.scandales + ' scandale' + (p.scandales > 1 ? 's' : '');
    if (id === 'igpn') return p.st[2] ? 'respecté' : 'non respecté';
    return p.lost + ' relâché' + (p.lost > 1 ? 's' : '') + (p.inter ? ` (${pct(p.lost / p.inter)})` : '');
  }
  function collect() {
    const v = GM.collect();
    if (v > 0) { floatAt('parp', '+' + eur(v) + ' PRIME'); toast('Prime encaissée : ' + eur(v)); }
    pvAuto = 0; $('pvSlot').innerHTML = '';
  }
  Object.assign(GM.ui, { float: floatAt, toast, pv: showPV });

  // ---------- boutique ----------
  let tab = 'staff', cards = [], shape = '', buyX = 1, installEvt = null;
  // Chrome propose l'installation : on garde l'événement pour le bouton de l'onglet Dossier
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; render(); });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('Le jeu est installé sur votre écran d\'accueil !'); render(); });
  const list = $('list');
  function mkCard(spec, onClick, tipKey) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'item';
    if (tipKey) b.dataset.tip = tipKey; // survol ou appui long : le détail de ce que ça change
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
  // bouton « vide-grenier » sous un équipement acheté : un clic pour armer, un second pour vendre
  function addSell(u) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sell'; b.dataset.tip = 'sell:' + u.id;
    let armed = 0;
    const c = {
      upd: () => {
        const l = GM.lv(u.id); b.hidden = l < 1;
        if (b.hidden) return;
        const on = armed > Date.now(), v = GM.sellValue(u);
        const txt = on ? `Confirmer la vente du niveau ${l} : +${eur(v)}` : `Revendre au vide-grenier · +${eur(v)}`;
        if (b.textContent !== txt) b.textContent = txt;
        b.classList.toggle('arm', on);
      },
    };
    b.onclick = () => {
      if (armed < Date.now()) { armed = Date.now() + 3000; c.upd(); return; }
      armed = 0;
      const v = GM.sellUp(u.id);
      if (v > 0) toast(`Vide-grenier : « ${PD.SELL[u.id] || 'Vends ' + u.name.toLowerCase() + ', bon état.'} » +${eur(v)}`);
      render();
    };
    c.upd(); list.appendChild(b); cards.push(c);
  }
  // nouvelle partie : un clic pour armer, un second pour tout effacer
  function addRestart() {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sell restart';
    let armed = 0;
    const c = {
      upd: () => {
        const on = armed > Date.now(), txt = on ? 'Confirmer : effacer la partie et repartir de zéro' : 'Recommencer une partie';
        if (b.textContent !== txt) b.textContent = txt;
        b.classList.toggle('arm', on);
      },
    };
    b.onclick = () => {
      if (armed < Date.now()) { armed = Date.now() + 3000; c.upd(); return; }
      armed = 0;
      GM.newGame();
      closeMap(); pvAuto = 0; $('pvSlot').innerHTML = '';
      S.setSite(GM.here());
      toast(`Nouvelle partie ! Bienvenue à ${GM.here().name}.`);
      shape = ''; render();
    };
    c.upd(); list.appendChild(b); cards.push(c);
  }
  function addEl(tag, cls, html, live) {
    const el = document.createElement(tag); el.className = cls;
    const c = { upd: () => { const h = typeof html === 'function' ? html() : html; if (h !== c.h) { c.h = h; el.innerHTML = h; } } };
    c.upd(); list.appendChild(el); if (live) cards.push(c);
  }
  const zoneOf = id => ({ patrols: 'cars', cells: 'cells', inv: 'inv', pts: 'pts', acc: 'acc', pla: 'pla', clean: 'clean', masks: 'pts', snow: 'cars', interp: 'inv', press: 'acc' })[id];
  const TIP_HINT = matchMedia('(hover: none)').matches ? 'Appui long sur une carte : le détail de ce qu\'elle change.' : 'Survolez une carte : le détail de ce qu\'elle change.';
  function rebuild() {
    const scroll = list.scrollTop;
    list.innerHTML = ''; cards = [];
    $('buyx').hidden = tab !== 'staff';
    const sec = t => addEl('div', 'section-t', t);
    if (tab === 'staff' || tab === 'up') addEl('p', 'mini', TIP_HINT + (tab === 'up' ? ' Une amélioration déséquilibre vos services ? Revendez-la au vide-grenier du commissariat, à moitié prix.' : ''));
    if (tab === 'staff') {
      for (const u of UNITS) {
        if (!GM.unitOn(u)) continue;
        mkCard(() => {
          const b = GM.bulk(u, buyX), cost = b.k ? b.cost : GM.unitCost(u);
          return { icon: u.id, name: u.name + (buyX !== 1 ? ` ×${b.k || 1}` : ''), desc: u.desc, owned: fmt(G.n[u.id]), cost: eur(cost), can: b.k > 0 && cost <= G.money, eff: effLine(u.id) };
        }, () => { const k = GM.buyUnit(u.id, buyX); if (k) floatAt(zoneOf(u.id), '+' + k + ' ' + u.name.toLowerCase(), 'blue'); }, 'u:' + u.id);
      }
      if (!G.built.accueil) addEl('p', 'mini', "Ouvrez l'accueil dans l'onglet Bâtiment pour recevoir du public et des plaintes.");
    } else if (tab === 'up') {
      for (const u of UPGRADES) {
        if (!GM.upOn(u)) continue;
        mkCard(() => { const c = GM.upCost(u); return { icon: u.id, name: u.name, desc: u.desc, owned: 'niv. ' + G.up[u.id], cost: eur(c), can: c <= G.money }; }, () => { if (GM.buyUp(u.id)) toast(u.name + ' niveau ' + G.up[u.id] + ' !'); }, 'up:' + u.id);
        addSell(u);
      }
    } else if (tab === 'build') {
      sec('Services');
      for (const b of BUILDINGS) {
        mkCard(() => {
          if (G.built[b.id]) return { icon: b.id, name: b.id === 'accueil' ? 'Accueil' : 'Bureau des plaintes', desc: 'Ouvert. ' + b.desc, owned: '✔', cost: 'ouvert', can: false };
          const lockedBy = b.needs && !G.built[b.needs];
          return { icon: b.id, name: b.name, desc: lockedBy ? "Ouvrez d'abord l'accueil." : b.desc, owned: '', cost: eur(b.cost), can: !lockedBy && b.cost <= G.money, locked: lockedBy };
        }, () => { if (GM.build(b.id)) toast(b.id === 'accueil' ? "L'accueil ouvre ses portes. Les usagers arrivent !" : 'Bureau des plaintes ouvert : les plaintes donnent des pistes aux patrouilles.'); }, 'b:' + b.id);
      }
      sec('Le bâtiment');
      mkCard(() => {
        const nt = tier(G.tier + 1);
        return { icon: 'hq', name: 'Agrandir : ' + nt.name, desc: `Actuellement : ${tier(G.tier).name}. Recettes ×1,6, plus de public, une tour plus haute.`, owned: 'P' + (G.tier + 1), cost: eur(nt.cost), can: nt.cost <= G.money };
      }, () => { if (GM.upTier()) { toast('Promotion du bâtiment : ' + tier(G.tier).name + ' ! Recettes ×1,6'); floatAt('hq', tier(G.tier).name.toUpperCase()); } }, 'b:tier');
      sec('Carrière');
      mkCard(() => {
        const nx = site(G.site + 1), ok = GM.canMove();
        return { icon: 'mutation', name: ok ? 'Mutation possible !' : 'Carte des affectations', desc: ok ? `Vous avez ${T.STARS_TO_MOVE} étoiles. Prochain poste : ${nx.name} (${nx.kind}).` : `Gagnez ${T.STARS_TO_MOVE} étoiles pour être muté à ${nx.name}. Chaque semaine rapporte jusqu'à 3 étoiles, plus les missions du préfet.`, owned: '★' + Math.min(G.cstars, T.STARS_TO_MOVE), cost: 'voir la carte', can: true, cls: ok ? 'danger' : '' };
      }, () => openMap(), 'b:move');
    } else {
      // installation sur téléphone
      const inst = document.createElement('div'); inst.className = 'install';
      const standalone = matchMedia('(display-mode: standalone)').matches;
      inst.innerHTML = standalone ? '<b>Le jeu est installé sur cet appareil.</b>'
        : `<b>Installer le jeu sur ce téléphone</b>${installEvt ? '<button type="button" id="installBtn">Installer le jeu</button>' : ''}<span>Sinon, dans Chrome sur Android : menu ⋮ puis « Installer l'application » ou « Ajouter à l'écran d'accueil ». Sur iPhone, dans Safari : bouton Partager puis « Sur l'écran d'accueil ». La partie reste sauvegardée.</span>`;
      list.appendChild(inst);
      const ib = inst.querySelector('#installBtn');
      if (ib) ib.onclick = () => { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); };
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
      addEl('p', 'mini', () => `<b>Cycle d'une GAV.</b> Une patrouille ramène un suspect en cellule. Un enquêteur l'auditionne (${fmt(GM.enqTime(false), 1)} s) et, en même temps, un agent PTS le signalise (${fmt(GM.ptsTime(false), 1)} s). À la fin de l'audition, si sa signalisation a commencé, la GAV attend qu'elle se termine (${T.PTS_WAIT} s au plus) ; si aucun agent PTS n'a pu s'en occuper, elle sort non signalisée. Comme une signalisation est plus longue qu'une audition, il faut un peu plus d'agents PTS que d'enquêteurs, ou la borne biométrique.<br><br><b>Étoiles de la semaine.</b> 1 étoile si la jauge d'objectif est pleine, 1 si la signalisation atteint 95 %, 1 pour le critère local : ${(h.star3.id === 'igpn' ? 'IGPN : ' + GM.igpnLabel() : h.star3.label).toLowerCase()}. À ${T.STARS_TO_MOVE} étoiles, vous pouvez demander votre mutation sur la carte.<br><br><b>Missions du préfet.</b> Certains lundis, une ou deux missions apparaissent dans la carte de la semaine. Réussies dimanche soir, elles rapportent des étoiles en plus ; la « Semaine étoilée » double toutes les étoiles.<br><br><b>Prime.</b> Versée seulement si la jauge d'objectif est pleine : 25 % des recettes de la semaine, réduite si la PTS ne suit pas (rien sous 70 %) ou si des usagers repartent fâchés, +20 % par étoile.<br><br><b>Astuces.</b> Les plaintes donnent des pistes : les patrouilles vont 50 % plus vite tant qu'il en reste. Le tampon accélère un peu la GAV la plus ancienne. Attrapez les croissants dorés (attention, certains sont des pièges).`, true);
      addRestart();
    }
    list.scrollTop = scroll;
  }
  function render() {
    const s = [tab, buyX, G.site, G.built.accueil, G.built.plaintes, GM.canMove(), !!installEvt].join('|');
    if (s !== shape) { shape = s; rebuild(); } else cards.forEach(c => c.upd());
  }
  function effLine(id) {
    const W = G.week;
    if (id === 'patrols') return `${fmt(GM.patrolPerMin(), 1)} interpellations/min${G.pistes ? ' (+50 % avec pistes : ' + G.pistes + ')' : ''}${G.stormLeft > 0 && GM.has('neige') ? ' · tempête !' : ''}${G._patrolWait ? ' · à l\'arrêt : plus de place' : ''}`;
    if (id === 'snow') return `${Math.min(G.n.snow, G.n.patrols)} / ${G.n.patrols} patrouilles roulent pendant les tempêtes`;
    if (id === 'interp') { const w = G.det.filter(d => d.foreign).length; return `${G._interpBusy || 0} / ${G.n.interp} en audition · ${w} étranger${w > 1 ? 's' : ''} en GAV`; }
    if (id === 'press') return `${G.week.scandales} scandale${G.week.scandales > 1 ? 's' : ''} cette semaine · ${G.n.press} étouffable${G.n.press > 1 ? 's' : ''}`;
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
  // Téléphone : boutique repliable (mémorisée pour ce navigateur) et stats de la semaine dépliables
  const app = document.querySelector('.app'), small = matchMedia('(max-width:860px)');
  function setSheet(mini) {
    app.classList.toggle('mini', mini);
    $('sheetBtn').textContent = mini ? '▴ Boutique' : '▾ Réduire';
    $('sheetBtn').setAttribute('aria-expanded', String(!mini));
    try { localStorage.setItem('cp-sheet-mini', mini ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
  }
  $('sheetBtn').onclick = () => setSheet(!app.classList.contains('mini'));
  let sheetMini = false; try { sheetMini = localStorage.getItem('cp-sheet-mini') === '1'; } catch (e) { /* stockage indisponible */ }
  setSheet(sheetMini);
  $('weekBtn').onclick = () => {
    const open = !$('weekCard').classList.contains('open');
    $('weekCard').classList.toggle('open', open);
    $('weekBtn').textContent = open ? '−' : '+'; $('weekBtn').setAttribute('aria-expanded', String(open));
  };
  const tampon = () => {
    if (GM.buffOn('pigeon')) { floatAt('parp', 'Le pigeon a le tampon !', 'bad'); return; }
    GM.tampon(); S.parpaingHit();
  };
  $('tamponBtn').onclick = tampon;
  S.onParpaing = tampon;

  // ---------- carte des affectations ----------
  const NODES = [[85, 395], [200, 330], [110, 245], [225, 175], [345, 235], [460, 310], [580, 375], [655, 270], [565, 175], [450, 95], [610, 58]];
  const ICON = {
    campagne: '<path d="M-22 10 Q-8-8 6 4 T24 8 V16 H-22Z" fill="#7cc45c"/><rect x="-8" y="-4" width="12" height="10" fill="#b5322c"/><path d="M-10-4 L-2-12 L6-4Z" fill="#6b2a24"/>',
    ville: '<rect x="-18" y="-6" width="10" height="20" fill="#efe3c8"/><rect x="-6" y="-12" width="12" height="26" fill="#f6bd60"/><rect x="8" y="-4" width="10" height="18" fill="#84a59d"/>',
    metropole: '<rect x="-18" y="-10" width="10" height="24" fill="#c9ccd1"/><rect x="-6" y="-18" width="11" height="32" fill="#2d4a6b"/><rect x="7" y="-8" width="10" height="22" fill="#c8694a"/>',
    megapole: '<rect x="-17" y="-20" width="9" height="34" fill="#1d2b44"/><rect x="-6" y="-26" width="10" height="40" fill="#2d4a6b"/><rect x="6" y="-16" width="10" height="30" fill="#1d2b44"/><rect x="-4" y="-20" width="2" height="2" fill="#ffd27a"/><rect x="9" y="-10" width="2" height="2" fill="#ffd27a"/>',
    cite: '<rect x="-20" y="-6" width="40" height="8" fill="#e6e1d6"/><rect x="-20" y="4" width="40" height="10" fill="#c9ccd1"/><rect x="-12" y="-16" width="8" height="12" fill="#ffffff"/><rect x="2" y="-12" width="6" height="8" fill="#ff4b5c"/>',
    plage: '<rect x="-22" y="4" width="44" height="12" fill="#5bc0eb"/><path d="M-22 4 Q0 -2 22 4 V8 H-22Z" fill="#f2d49b"/><path d="M-4 -14 Q4 -22 14 -14Z" fill="#ff4b5c"/><rect x="4.4" y="-14" width="1.6" height="18" fill="#6b4a3a"/>',
    neige: '<path d="M-24 14 L-6 -16 L4 0 L12 -10 L24 14Z" fill="#9aa7bd"/><path d="M-12 -6 L-6 -16 L0 -6Z M8 -4 L12 -10 L16 -4Z" fill="#fff"/><rect x="-24" y="10" width="48" height="6" fill="#f4f8ff"/>',
    aeroport: '<rect x="-24" y="8" width="48" height="6" fill="#4b5060"/><path d="M-16 -2 L16 -6 L20 -3 L-14 2Z" fill="#f4f6fb"/><path d="M-2 -4 L6 -16 L10 -16 L6 -4Z M-2 0 L4 8 L8 8 L5 0Z" fill="#3d7bff"/>',
    festival: '<circle cx="8" cy="-4" r="13" fill="none" stroke="#c879ff" stroke-width="2.5"/><path d="M8 -17V9M-5 -4H21" stroke="#c879ff" stroke-width="1.5"/><rect x="-22" y="0" width="16" height="14" fill="#ffc93c"/><path d="M-24 0 L-14 -8 L-4 0Z" fill="#ff4b5c"/>',
    ministere: '<rect x="-22" y="-4" width="44" height="18" fill="#efe3c8"/><path d="M-24 -4 L0 -16 L24 -4Z" fill="#c9b48a"/><rect x="-3" y="2" width="6" height="12" fill="#1b2a5c"/><rect x="-16" y="0" width="4" height="8" fill="#5b6b82"/><rect x="12" y="0" width="4" height="8" fill="#5b6b82"/><rect x="-1" y="-26" width="1.5" height="12" fill="#999"/><rect x="0.5" y="-26" width="3" height="5" fill="#2346a8"/><rect x="3.5" y="-26" width="3" height="5" fill="#fff"/><rect x="6.5" y="-26" width="3" height="5" fill="#e63946"/>',
  };
  let sel = 0, armMove = false;
  function openMap() { sel = Math.min(G.site + (GM.canMove() ? 1 : 0), G.site + 1); armMove = false; drawMap(); $('mapOv').hidden = false; }
  function closeMap() { $('mapOv').hidden = true; }
  $('mapBtn').onclick = openMap;
  $('mapOv').addEventListener('click', e => { if (e.target.id === 'mapOv') closeMap(); });
  // dans les secteurs sans fin, le dernier nœud est le poste actuel et un nœud de plus montre la mutation suivante
  const NODE_HERE = [560, 45], NODE_NEXT = [660, 100];
  function drawMap() {
    const cur = G.site, last = NODES.length - 1;
    const spots = NODES.map((p, i) => ({ p, idx: i < last ? i : Math.max(last, cur) }));
    if (cur >= last) { spots[last].p = NODE_HERE; spots.push({ p: NODE_NEXT, idx: cur + 1 }); }
    const path = spots.map((s, i) => (i ? 'L' : 'M') + s.p[0] + ' ' + s.p[1]).join(' ');
    let svg = `<svg class="mapsvg" viewBox="0 0 720 470" role="group" aria-label="Commissariats">
      <rect width="720" height="470" fill="#e9dfc4"/>
      <path d="M0 430 Q160 360 320 450 T720 400 V470 H0Z" fill="#cfe3b5"/><path d="M430 0 Q540 130 720 120 V0Z" fill="#c9d3dd"/><path d="M520 470 Q600 380 720 420 V470Z" fill="#9fd3ff"/>
      <path d="${path}" fill="none" stroke="#8a6d4a" stroke-width="10" stroke-linecap="round" stroke-dasharray="2 16"/>`;
    for (const { p: [x, y], idx } of spots) {
      const s = site(idx);
      const done = idx < cur, here = idx === cur, next = idx === cur + 1, ring = here ? '#3d7bff' : done ? '#c48a00' : next ? '#e63946' : '#9aa0aa';
      const anchor = x < 110 ? 'start" x="-30' : 'middle'; // le nom du premier poste ne déborde pas à gauche
      svg += `<g class="node" tabindex="0" data-i="${idx}" transform="translate(${x} ${y})">
        <circle r="30" fill="${done || here ? '#ffffff' : '#f4efe1'}" stroke="${ring}" stroke-width="${sel === idx ? 7 : 4}" class="ring"/>
        <g opacity="${done || here || next ? 1 : 0.45}" transform="scale(.9)">${ICON[s.biome]}</g>
        <text y="46" text-anchor="${anchor}" font-family="Rubik, sans-serif" font-weight="800" font-size="12.5" fill="#2a2833">${idx > cur + 1 ? 'Secteurs suivants' : idx < last ? (idx + 1) + '. ' + s.name : s.name.replace('Secteur Parpaing', 'Secteur')}</text>
        <text y="61" text-anchor="${anchor}" font-family="Rubik, sans-serif" font-size="12" fill="#5a5560">${here ? 'Vous êtes ici · ★ ' + Math.min(G.cstars, T.STARS_TO_MOVE) + '/' + T.STARS_TO_MOVE : done ? 'Terminé ★ ' + (G.siteStars[idx] || T.STARS_TO_MOVE) : next ? 'Prochaine mutation' : 'Verrouillé'}</text>
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
        <p style="margin:8px 0 0"><b>3e étoile :</b> ${s.star3.id === 'igpn' ? "inspection de l'IGPN (un critère tiré au sort chaque lundi)" : s.star3.label}</p>
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
  // un vrai croissant : segments feuilletés bombés, pointes, dégradé de cuisson, reflets de beurre
  const CROISSANT = `<svg viewBox="0 0 120 84" aria-hidden="true"><defs>
    <radialGradient id="cgA" cx="45%" cy="30%" r="70%"><stop offset="0" stop-color="#ffe7a6"/><stop offset=".4" stop-color="#f4b955"/><stop offset=".78" stop-color="#cf7f2a"/><stop offset="1" stop-color="#8f4914"/></radialGradient>
    <linearGradient id="cgB" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#eaa84a"/><stop offset="1" stop-color="#97511a"/></linearGradient></defs>
    <ellipse cx="60" cy="74" rx="46" ry="6" fill="#3a2207" opacity=".22"/>
    <path d="M8 58c-5-9 1-19 13-19l9 11z" fill="url(#cgB)" stroke="#8a4512" stroke-width="1.4"/>
    <path d="M112 58c5-9-1-19-13-19l-9 11z" fill="url(#cgB)" stroke="#8a4512" stroke-width="1.4"/>
    <ellipse cx="27" cy="48" rx="13" ry="12" transform="rotate(-38 27 48)" fill="url(#cgA)" stroke="#8a4512" stroke-width="1.5"/>
    <ellipse cx="93" cy="48" rx="13" ry="12" transform="rotate(38 93 48)" fill="url(#cgA)" stroke="#8a4512" stroke-width="1.5"/>
    <ellipse cx="41" cy="37" rx="16" ry="17" transform="rotate(-22 41 37)" fill="url(#cgA)" stroke="#8a4512" stroke-width="1.5"/>
    <ellipse cx="79" cy="37" rx="16" ry="17" transform="rotate(22 79 37)" fill="url(#cgA)" stroke="#8a4512" stroke-width="1.5"/>
    <ellipse cx="60" cy="33" rx="19" ry="22" fill="url(#cgA)" stroke="#8a4512" stroke-width="1.6"/>
    <path d="M46 44q14 8 28 0M49 25q11 6 22 0M33 46q4 6 2 12M87 46q-4 6-2 12" fill="none" stroke="#a5591c" stroke-width="1.5" opacity=".65"/>
    <ellipse cx="54" cy="20" rx="7" ry="3.2" transform="rotate(-18 54 20)" fill="#fff" opacity=".55"/>
    <ellipse cx="37" cy="27" rx="4.5" ry="2.2" transform="rotate(-35 37 27)" fill="#fff" opacity=".45"/>
    <ellipse cx="77" cy="26" rx="4.5" ry="2.2" transform="rotate(10 77 26)" fill="#fff" opacity=".4"/>
    <ellipse cx="24" cy="42" rx="3" ry="1.6" transform="rotate(-50 24 42)" fill="#fff" opacity=".4"/>
  </svg><i class="spark s1"></i><i class="spark s2"></i><i class="spark s3"></i>`;
  let golden = null;
  function spawnGolden() {
    const el = document.createElement("button");
    el.className = "golden"; el.type = "button"; el.setAttribute("aria-label", "Croissant doré : cliquez pour une surprise");
    el.innerHTML = CROISSANT;
    const st = S.stage, dirL = Math.random() < 0.5;
    golden = { el, x: dirL ? -90 : st.clientWidth + 10, y: 90 + Math.random() * Math.max(40, st.clientHeight - 230), vx: (dirL ? 1 : -1) * (55 + Math.random() * 35), t: 0 };
    el.onclick = catchGolden;
    st.appendChild(el);
  }
  function catchGolden() {
    if (!golden) return;
    const r = GM.golden();
    toast(r.msg);
    if (r.g.id === "amelie") S.parpaingHit();
    killGolden(false);
  }
  function killGolden(missed) { if (golden) golden.el.remove(); golden = null; if (missed !== false) G.goldenIn = 60 + Math.random() * 70; }
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
    $('objTxt').textContent = small.matches
      ? (!full ? `Objectif ${fmt(dos)}/${fmt(G.objective)} · PTS ${pct(r)}` : pc.prime > 0 ? `Objectif ✔ · prime ${eur(pc.prime)}` : 'Objectif ✔ · PTS < 70 % : 0 €')
      : (!full ? `Objectif préfectoral : ${fmt(dos)} / ${fmt(G.objective)} dossiers · prime si la jauge est pleine`
        : pc.prime > 0 ? `Objectif atteint ✔ · prime estimée ${eur(pc.prime)}` : 'Objectif atteint, mais signalisation PTS sous 70 % : pas de prime');
    $('objBar').style.width = Math.min(100, (dos / G.objective) * 100) + '%';
    $('objBar').className = state; $('objTxt').parentNode.className = 'obj ' + state;
    // problèmes du lieu
    const rows = [];
    if (GM.has('vomi')) { const p = GM.propre(); rows.push(['Propreté', pct(p), p >= 0.9 ? 'ok' : p >= 0.6 ? 'warn' : 'bad', 'propre']); }
    if (GM.has('pieds')) rows.push(['Malaises PTS', W.malaises, W.malaises ? 'bad' : 'ok', 'malaise']);
    if (GM.has('delai')) rows.push(['GAV levées', W.levees, W.levees ? 'bad' : 'ok', 'levee']);
    if (GM.has('manif')) rows.push(['Manif', G.manifLeft > 0 ? 'EN COURS' : 'dans ' + Math.ceil(G.manifIn) + ' s', G.manifLeft > 0 ? 'bad' : '', 'manif']);
    if (GM.has('neige')) rows.push(['Tempête', G.stormLeft > 0 ? 'EN COURS' : 'dans ' + Math.ceil(G.stormIn) + ' s', G.stormLeft > 0 ? 'bad' : '', 'storm']);
    if (GM.has('interpretes')) rows.push(['Colis suspect', G.colisLeft > 0 ? 'ALERTE' : 'dans ' + Math.ceil(G.colisIn) + ' s', G.colisLeft > 0 ? 'bad' : '', 'colis']);
    if (GM.has('vip')) { const sc = GM.scandals(W); rows.push(['Scandales', `${W.scandales} (${sc} restant${sc > 1 ? 's' : ''})`, sc ? 'bad' : 'ok', 'scandal']); }
    if (GM.has('reunion')) rows.push(['Réunion', G.meetLeft > 0 ? `EN COURS (${G._meeting || 0} bloqués)` : 'dans ' + Math.ceil(G.meetIn) + ' s', G.meetLeft > 0 ? 'warn' : '', 'meeting']);
    if (h.star3.id === 'igpn') rows.push(['IGPN vérifie', GM.igpnLabel(), GM.weekStars(W)[2] ? 'ok' : 'warn', 'igpn']);
    $('probs').hidden = !rows.length;
    setHTML($('probs'), rows.map(([a, b, c, k]) => `<div data-tip="${k}" tabindex="0"><span>${a}</span><b class="${c}">${b}</b></div>`).join(''));
    const st = GM.weekStars(W);
    setHTML($('wStars'), [['Objectif', st[0]], ['PTS ≥ 95 %', st[1]], [h.star3.id === 'igpn' ? 'IGPN' : h.star3.label, st[2]]].map(([l, on], i) => `<span class="${on ? 'on' : ''}" data-tip="st${i + 1}" tabindex="0">${l}</span>`).join(''));
    setHTML($('quests'), (G.quests || []).map((q, i) => {
      const x = GM.questInfo(q); if (!x) return '';
      return `<div class="quest ${x.done && !x.double ? 'done' : ''}" data-tip="q${i}" tabindex="0"><span>Mission : ${x.name} ${x.double ? '(étoiles ×2)' : `(+${x.reward} ★)`}</span><b>${x.double ? 'active' : (x.done ? '✔ ' : '') + x.txt}</b></div>`;
    }).join(''));
    Tips.refresh();
    $('cStars').textContent = `★ ${Math.min(G.cstars, T.STARS_TO_MOVE)}/${T.STARS_TO_MOVE}`;
    $('mapBtn').classList.toggle('ready', GM.canMove());
    $('tierName').textContent = `${tier(G.tier).name} · ${h.name}`;
    $('buffs').innerHTML = G.buffs.map(b => `<span class="buff${b.malus ? ' malus' : ''}">${b.label} · ${Math.ceil(b.until - GM.perf())} s</span>`).join('');
    advice(r, s);
    const tg = S.tags;
    tg.hq.set(`${tier(G.tier).name}`);
    tg.cells.set(`GAV <em>${G.det.length}/${GM.capacity()}</em>${G.hall ? ' · +' + G.hall + ' en attente' : ''}`);
    tg.inv.set(`Enquête <em>${G._invBusy || 0}/${G.n.inv}</em>${G._meeting ? ' · ' + G._meeting + ' en réunion' : ''}`);
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
    const foreignWaiting = GM.has('interpretes') && G.det.filter(d => d.foreign && d.e < 1).length > G.n.interp;
    const toAudit = G.det.filter(d => d.e < 1).length; // sans compter celles qui attendent seulement la PTS
    if (GM.lost()) { msg = 'Manif : plus de place, des manifestants repartent libres ! Il faut des cellules, des chaises et des enquêteurs en réserve.'; lvl = 'bad'; }
    else if (GM.has('neige') && G.stormLeft > 0 && G.n.snow < G.n.patrols) { msg = 'Tempête de neige : sans motoneiges, les patrouilles sont bloquées.'; lvl = 'warn'; }
    else if (foreignWaiting) { msg = 'Des passagers étrangers attendent un interprète pour leur audition.'; lvl = 'warn'; }
    else if (GM.has('vip') && GM.scandals(W) > 0) { msg = "Scandale de star ! La prime est divisée par deux : recrutez un chargé de com'."; lvl = 'bad'; }
    else if (GM.has('reunion') && G.meetLeft > 0) { msg = 'Réunion en cours : une partie des enquêteurs a quitté son bureau.'; lvl = 'warn'; }
    else if (G.manifLeft > 0) { msg = 'Manifestation en cours : il faut de la place en cellule.'; lvl = 'warn'; }
    else if (GM.has('pieds') && smellyNow && G.n.masks < G.n.pts) { msg = 'Ça sent les pieds : équipez la PTS de masques à gaz.'; lvl = 'bad'; }
    else if (GM.has('vomi') && GM.propre() < 0.8) { msg = 'Du vomi partout dans les couloirs : recrutez des agents d\'entretien.'; lvl = 'bad'; }
    else if (GM.has('delai') && W.levees > 0 && toAudit > G.n.inv) { msg = 'Des GAV dépassent le délai légal : il faut plus d\'enquêteurs.'; lvl = 'bad'; }
    else if (r !== null && W.gav >= 3 && r < 0.85) {
      // on juge sur le rythme actuel, pas seulement sur le taux cumulé depuis lundi
      const pm = GM.ptsPerMin(), im = GM.invPerMin(), need = Math.ceil(im / (60 / GM.ptsTime(false)));
      if (pm < im * 0.95) { msg = `La PTS ne suit pas les enquêteurs (${fmt(pm, 1)} contre ${fmt(im, 1)} GAV/min) : il faut environ ${need} agents PTS.`; lvl = 'bad'; }
      else { msg = `Signalisation de la semaine à ${pct(r)} : la PTS suit le rythme maintenant, le taux va remonter.`; lvl = 'warn'; }
    }
    else if (G.built.accueil && s !== null && s < 0.8) { msg = "L'accueil déborde : des usagers repartent fâchés."; lvl = 'warn'; }
    else if (GM.has('manif') && W.lost > 0 && GM.invPerMin() < GM.patrolPerMin() * T.MANIF_MULT) {
      // une manif triple les interpellations : seuls des enquêteurs en réserve vident les cellules à temps
      msg = `Prochaine manif dans ${Math.ceil(G.manifIn)} s : gardez des enquêteurs en réserve (${fmt(GM.invPerMin())} auditions/min pour ${fmt(GM.patrolPerMin() * T.MANIF_MULT)} interpellations/min pendant une manif).`; lvl = 'warn';
    }
    else if (G._patrolWait && !G.manifLeft) { msg = 'Cellules pleines : les patrouilles attendent une place. Recrutez des enquêteurs et des agents PTS, pas des patrouilles.'; lvl = 'warn'; }
    else if (toAudit > G.n.inv + 1) { msg = `${toAudit} GAV attendent leur audition pour ${G.n.inv} enquêteur${G.n.inv > 1 ? 's' : ''} : recrutez des enquêteurs.`; lvl = 'warn'; }
    else if (G.built.plaintes && G.plaQ > G.n.pla * 3) { msg = "Les plaintes s'empilent : recrutez des agents des plaintes."; lvl = 'warn'; }
    else if (!G.det.length && !G.hall) { msg = 'Cellules vides : il faut plus de patrouilles.'; lvl = 'warn'; }
    else if (!G.built.accueil && G.money >= 60) msg = "Vous pouvez ouvrir l'accueil (onglet Bâtiment).";
    else if (GM.canMove()) msg = 'Mutation possible : ouvrez la carte !';
    if (adv.textContent !== msg) adv.textContent = msg;
    adv.className = 'card advice ' + lvl;
  }
  function view() {
    let smelly = 0, lawyers = 0, vips = 0, foreign = 0;
    for (const d of G.det) { if (d.smelly) smelly++; if (d.lawyer) lawyers++; if (d.vip) vips++; if (d.foreign) foreign++; }
    return {
      tier: G.tier, patrols: G.n.patrols, cells: G.n.cells, cellCap: GM.cellCap(), occ: G.det.length, hall: Math.min(G.hall, 6),
      inv: G.n.inv, invBusy: G._invBusy || 0, pts: G.n.pts, ptsBusy: G._ptsBusy || 0,
      accBuilt: G.built.accueil, plaBuilt: G.built.plaintes, acc: G.n.acc, accBusy: G._accBusy || 0,
      pla: G.n.pla, plaBusy: G._plaBusy || 0, queueCit: Math.min(G.cit, 10), plaQueue: G.plaQ, medals: G.medals, up: G.up,
      probs: Object.fromEntries(Object.keys(PD.PROBLEMS).map(k => [k, GM.has(k)])),
      vomit: G.vomit, clean: G.n.clean, smelly, masks: G.n.masks, ptsDown: G.ptsDown.length, lawyers, manif: G.manifLeft > 0,
      storm: GM.has('neige') && G.stormLeft > 0, snow: G.n.snow, colis: GM.has('interpretes') && G.colisLeft > 0, interp: Math.min(G.n.interp, 6), interpBusy: G._interpBusy || 0,
      foreign, vips, press: G.n.press, meeting: G._meeting || 0,
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
    if (!playing) { last = now; S.sync(view()); requestAnimationFrame(frame); return; } // le jeu attend le bouton JOUER
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
      golden.t += Math.min(dt, 0.1); golden.x += golden.vx * Math.min(dt, 0.1);
      golden.el.style.left = golden.x + 'px'; golden.el.style.top = golden.y + Math.sin(golden.t * 2) * 24 + 'px';
      golden.el.style.transform = `rotate(${Math.sin(golden.t * 3) * 12}deg)`;
      if (golden.t > 18) killGolden();
    }
    if (pvAuto > 0 && (pvAuto -= Math.min(dt, 1)) <= 0) collect();
    S.sync(view());
    tickMoney(Math.min(dt, 0.1));
    if ((uiT += Math.min(dt, 1)) > 0.2) { uiT = 0; hud(); render(); }
    if ((saveT += Math.min(dt, 1)) > 5) { saveT = 0; GM.save(); }
    if ((radioT += Math.min(dt, 1)) > 22) { radioT = 0; radio(); }
    requestAnimationFrame(frame);
  }

  // ---------- écran d'accueil ----------
  let playing = false, welcome = null;
  function showTitle(had) {
    $('titleSave').textContent = had
      ? `Partie en cours · ${GM.here().name} · ${moneyFmt(G.money)} · ★ ${Math.min(G.cstars, T.STARS_TO_MOVE)}/${T.STARS_TO_MOVE}`
      : 'Nouvelle partie · sauvegarde automatique dans ce navigateur';
    $('playBtn').onclick = play;
    try { $('playBtn').focus({ preventScroll: true }); } catch (e) { /* ancien navigateur */ }
  }
  function play() {
    if (playing) return;
    playing = true;
    $('title').classList.add('out');
    setTimeout(() => { $('title').hidden = true; }, 450);
    if (welcome) setTimeout(() => toast(welcome), 500);
    if (G.pending) showPV();
  }

  function start(data) {
    const had = GM.load(data);
    if (had && !data) {
      const away = Math.min((Date.now() - (G.lastSave || Date.now())) / 1000, 8 * 3600);
      const gain = (G.rateEst || 0) * away * 0.5;
      if (away > 60 && gain > 0) { G.money += gain; G.runEarned += gain; welcome = `Pendant votre absence, les collègues ont rapporté ${eur(gain)}.`; }
    }
    S.setSite(GM.here());
    render(); hud(); radio();
    if (data) play(); else showTitle(had); // un rechargement à chaud reprend directement la partie
    requestAnimationFrame(t => { last = t; frame(t); });
  }
  // appli installable et jouable hors ligne (en https uniquement, comme sur GitHub Pages)
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('beforeunload', GM.save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) GM.save(); });
  window.claude?.hot?.snapshot?.(() => JSON.parse(JSON.stringify(G)));
  if (window.claude?.hot?.ready) window.claude.hot.ready(d => start(d && d.n ? d : null));
  else start(window.claude?.hot?.data?.n ? window.claude.hot.data : null);
})();
