// Infobulles : un format unique pour toutes les stats et tous les boutons.
// Titre · ce que c'est · chiffres (avant → après) · encadré de calcul · « Agit sur » · conseil.
window.Tips = (function () {
  const { T, UNITS, UPGRADES, tier, site, fmt, eur } = PD;
  const G = GM.G;
  const pct = v => (v === null || v === undefined ? '–' : Math.round(v * 100) + ' %');
  const sec = v => fmt(v, 1) + ' s';
  const pm = v => fmt(v, 1) + '/min';
  const arrow = (a, b) => (a === b ? a : `${a} → <b>${b}</b>`);
  // calcule une valeur « comme si » on avait acheté, sans rien modifier
  function withTemp(apply, fn) { const undo = apply(); try { return fn(); } finally { undo(); } }
  const plusUnit = (id, f) => withTemp(() => { G.n[id]++; return () => { G.n[id]--; }; }, f);
  const plusUp = (id, f) => withTemp(() => { G.up[id]++; return () => { G.up[id]--; }; }, f);
  const minusUp = (id, f) => withTemp(() => { G.up[id]--; return () => { G.up[id]++; }; }, f);
  function box(o) {
    let h = `<strong>${o.title}</strong>`;
    if (o.text) h += `<p>${o.text}</p>`;
    if (o.rows && o.rows.length) h += '<dl>' + o.rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('') + '</dl>';
    for (const c of [].concat(o.calc || [])) if (c) h += `<span class="calc">${c}</span>`;
    if (o.acts) h += `<p class="acts"><b>Agit sur :</b> ${o.acts}</p>`;
    if (o.tip) h += `<p class="hint">${o.tip}</p>`;
    return h;
  }
  const cycle = () => `Cycle d'une GAV : patrouille → cellule → audition par un enquêteur (${sec(GM.enqTime(false))}) et, en même temps, signalisation par la PTS (${sec(GM.ptsTime(false))}). À la fin de l'audition, si sa signalisation a commencé, la GAV attend qu'elle se termine (${T.PTS_WAIT} s au plus) ; si aucun agent PTS n'a pu s'en occuper, elle sort non signalisée.`;
  function ptsAdvice() {
    const perAgent = 60 / GM.ptsTime(false), need = Math.ceil(GM.invPerMin() / perAgent);
    return need > G.n.pts ? `Pour suivre vos enquêteurs, il faut environ <b>${need} agents PTS</b> (vous en avez ${G.n.pts}).` : `Vos ${G.n.pts} agents PTS suivent le rythme de vos enquêteurs.`;
  }

  // ---------- stats du HUD ----------
  const HUD = {
    cash: () => box({ title: 'Caisse du commissariat', text: "L'argent disponible pour recruter, équiper et agrandir.", calc: `${eur(GM.rate(), 1)} / s en moyenne sur les 20 dernières secondes`, acts: 'tous vos achats.' }),
    dos: () => box({ title: 'Dossiers traités', text: 'GAV auditionnées + plaintes traitées depuis lundi. Ils remplissent la jauge d\'objectif.', calc: `${G.week.gav} GAV + ${G.week.pla} plaintes = ${G.week.gav + G.week.pla} dossiers`, acts: 'étoile 1 et versement de la prime.' }),
    sig: () => { const W = G.week; return box({ title: 'Taux de signalisation', text: 'Personnes signalisées par la PTS ÷ personnes passées en GAV et auditionnées par les enquêteurs cette semaine.', calc: [W.gav ? `${W.sig} signalisées / ${W.gav} auditionnées = ${pct(GM.sigRate(W))}` : 'Aucune GAV auditionnée cette semaine', `PTS : ${pm(GM.ptsPerMin())} · enquêteurs : ${pm(GM.invPerMin())}`], acts: 'étoile 2 (≥ 95 %) et montant de la prime (réduite sous 85 %, nulle sous 70 %).', tip: ptsAdvice() }); },
    gav: () => box({ title: 'GAV auditionnées', text: "Gardes à vue dont l'audition est terminée cette semaine.", calc: `${G.week.gav} × ${eur(GM.gavValue(), 1)}`, acts: 'argent, dossiers (objectif).' }),
    pla: () => box({ title: 'Plaintes traitées', text: 'Plaintes bouclées par le bureau des plaintes cette semaine. Une sur deux donne une piste aux patrouilles.', calc: `${G.week.pla} × ${eur(GM.plaValue(), 1)} · ${G.pistes} piste${G.pistes > 1 ? 's' : ''} en stock`, acts: 'argent, dossiers (objectif), vitesse des patrouilles (+50 % tant qu\'il reste des pistes).' }),
    sat: () => { const W = G.week, n = W.recus + W.partis; return box({ title: 'Usagers bien reçus', text: "Usagers enregistrés au guichet ÷ tous les usagers venus (enregistrés + repartis fâchés parce que la file était pleine).", calc: n ? `${W.recus} reçus / ${n} venus = ${pct(GM.satRate(W))}` : "Personne n'est encore venu cette semaine", acts: 'montant de la prime (jusqu\'à −50 %), étoile 3 de certains commissariats.' }); },
    lost: () => box({ title: 'Relâchés faute de place', text: "Suspects ramenés par les patrouilles mais relâchés : cellules et salle d'attente pleines. Rien n'est encaissé pour eux.", calc: `${GM.capacity()} places en cellule + ${GM.hallCap()} en salle d'attente`, acts: 'missions et étoile « aucun relâché ».', tip: 'Ajoutez des cellules, des bancs plus larges ou des chaises.' }),
    obj: () => { const p = GM.primeCalc(G.week); return box({ title: 'Objectif préfectoral et prime', text: 'Dossiers à traiter avant dimanche soir. Jauge pleine : la prime est versée et vous gagnez 1 étoile. Atteint, l\'objectif suit vos résultats (+10 %) ; manqué, il baisse de 10 %. Il ne dépasse jamais 85 % de ce que vos équipes peuvent traiter.', calc: ['Prime = 25 % des recettes × qualité PTS × usagers × (1 + 20 % par étoile)', `${eur(G.week.earned)} × ${pct(p.q)} × ${pct(p.sat)}${p.scan < 1 ? ' × 50 % (scandale)' : ''} → ${p.quota ? eur(p.prime) : 'jauge pas pleine : 0 €'}`] }); },
    propre: () => box({ title: 'Propreté des couloirs', text: '100 % moins 4 % par flaque de vomi. Chaque flaque ralentit aussi tous les services de 3 %.', calc: `${G.vomit} flaque${G.vomit > 1 ? 's' : ''} → ${pct(GM.propre())} · moyenne de la semaine ${pct(GM.cleanRate(G.week))} · ménage ${pm(GM.cleanPerMin())}`, acts: 'vitesse de tout le commissariat, étoile « propreté ».' }),
    malaise: () => box({ title: 'Malaises à la PTS', text: `Un agent PTS sans masque qui signalise une GAV qui pue des pieds travaille à ${T.UNMASKED * 100} % de sa vitesse et peut faire un malaise (${T.FAINT_TIME} s au sol).`, calc: `${Math.min(G.n.masks, G.n.pts)} / ${G.n.pts} agents équipés · ${G.week.malaises} malaise${G.week.malaises > 1 ? 's' : ''} cette semaine`, acts: 'signalisation, étoile « aucun malaise ».' }),
    levee: () => box({ title: 'GAV levées', text: `Une GAV dure au maximum ${sec(GM.gavLimit())} (les 24 h légales). Au-delà, elle est levée : pas d'argent et pas de dossier.`, calc: `${G.week.levees} levée${G.week.levees > 1 ? 's' : ''} cette semaine · avec avocat, audition à ${pct(GM.lawK())} de la vitesse`, acts: 'argent, dossiers, étoile « aucune GAV levée ».' }),
    manif: () => box({ title: 'Manifestations', text: `Pendant ${T.MANIF_LEN} s, les patrouilles ramènent ${T.MANIF_MULT} fois plus de monde.`, calc: G.manifLeft > 0 ? `Manif en cours : encore ${Math.ceil(G.manifLeft)} s` : `Prochaine manif dans ${Math.ceil(G.manifIn)} s`, acts: 'remplissage des cellules et de la salle d\'attente.' }),
    storm: () => box({ title: 'Tempêtes de neige', text: 'Pendant une tempête, seules les motoneiges permettent aux patrouilles de continuer.', calc: G.stormLeft > 0 ? `Tempête en cours : encore ${Math.ceil(G.stormLeft)} s · ${Math.min(G.n.snow, G.n.patrols)}/${G.n.patrols} patrouilles en service` : `Prochaine tempête dans ${Math.ceil(G.stormIn)} s`, acts: 'interpellations.' }),
    colis: () => box({ title: 'Colis suspects', text: `Pendant ${T.COLIS_LEN} s, ${T.COLIS_SHARE * 100} % de la PTS est mobilisée au terminal.`, calc: G.colisLeft > 0 ? `Alerte en cours : encore ${Math.ceil(G.colisLeft)} s` : `Prochaine alerte dans ${Math.ceil(G.colisIn)} s`, acts: 'signalisation.' }),
    meeting: () => box({ title: 'Réunions', text: 'Pendant une réunion, une partie des enquêteurs quitte son bureau.', calc: G.meetLeft > 0 ? `Réunion en cours : ${G._meeting || 0} enquêteurs bloqués, encore ${Math.ceil(G.meetLeft)} s` : `Prochaine réunion dans ${Math.ceil(G.meetIn)} s`, acts: 'auditions, donc argent et dossiers.' }),
    scandal: () => box({ title: 'Scandales de stars', text: `Une star qui sort non signalisée, ou qui reste plus de ${T.VIP_MAX_T} s en GAV, fait scandale. Chaque chargé de com' en étouffe un par semaine.`, calc: `${G.week.scandales} scandale${G.week.scandales > 1 ? 's' : ''} · ${G.n.press} étouffé${G.n.press > 1 ? 's' : ''} au maximum → ${GM.scandals(G.week)} restant${GM.scandals(G.week) > 1 ? 's' : ''}`, acts: 'prime divisée par deux s\'il en reste un, étoile « aucun scandale ».' }),
    igpn: () => box({ title: "Inspection de l'IGPN", text: "Chaque lundi, l'IGPN tire un critère au sort. S'il est respecté dimanche soir, vous gagnez l'étoile 3.", calc: `Cette semaine : ${GM.igpnLabel()} · ${GM.weekStars(G.week)[2] ? 'respecté pour l\'instant ✔' : 'pas encore respecté'}` }),
    st1: () => box({ title: 'Étoile 1 : objectif', text: "Gagnée si la jauge d'objectif est pleine dimanche soir.", calc: `${G.week.gav + G.week.pla} / ${G.objective} dossiers` }),
    st2: () => box({ title: 'Étoile 2 : signalisation', text: 'Gagnée si au moins 95 % des personnes auditionnées cette semaine ont été signalisées.', calc: G.week.gav ? `${G.week.sig} / ${G.week.gav} = ${pct(GM.sigRate(G.week))}` : 'Aucune GAV auditionnée', tip: ptsAdvice() }),
    st3: () => box({ title: `Étoile 3 : ${GM.here().star3.id === 'igpn' ? 'IGPN : ' + GM.igpnLabel() : GM.here().star3.label}`, text: `Le critère propre à ${GM.here().name}, mesuré sur toute la semaine.` }),
    cstars: () => box({ title: 'Étoiles de mutation', text: `Étoiles gagnées dans ce commissariat : 3 par semaine au maximum, plus les missions du préfet. À ${T.STARS_TO_MOVE}, la carte permet d'être muté au poste suivant.`, calc: `${Math.min(G.cstars, T.STARS_TO_MOVE)} / ${T.STARS_TO_MOVE} étoiles` }),
    q0: () => quest(0), q1: () => quest(1),
  };
  function quest(i) {
    const q = G.quests && G.quests[i], x = q && GM.questInfo(q);
    if (!x) return box({ title: 'Mission terminée' });
    return box({ title: `Mission du préfet : ${x.name}`, text: x.desc, calc: x.double ? 'Toutes les étoiles gagnées dimanche (missions comprises) sont doublées.' : `Récompense : +${x.reward} ★ si c'est réussi dimanche soir · en ce moment : ${x.txt}${x.done ? ' ✔' : ''}` });
  }

  // ---------- effectifs ----------
  const UNIT = {
    patrols: () => ({ text: 'Une voiture et deux collègues qui ramènent des suspects en garde à vue.', rows: [['Interpellations', arrow(pm(GM.patrolPerMin()), pm(plusUnit('patrols', GM.patrolPerMin)))], ['Bonus pistes', G.pistes ? `+50 % (${G.pistes} en stock)` : 'aucune piste en stock']], acts: 'remplissage des cellules. Utile si les cellules sont souvent vides, inutile si elles débordent.', tip: cycle() }),
    cells: () => ({ text: 'Une cellule de plus, de ' + GM.cellCap() + ' places.', rows: [['Places en cellule', arrow(GM.capacity(), plusUnit('cells', GM.capacity))], ["Salle d'attente", GM.hallCap() + ' places']], acts: 'relâchés faute de place (missions, étoile « aucun relâché »).', tip: cycle() }),
    inv: () => ({ text: "Un enquêteur auditionne une GAV à la fois.", rows: [['Auditions', arrow(pm(GM.invPerMin()), pm(plusUnit('inv', GM.invPerMin)))], ['Durée d\'une audition', sec(GM.enqTime(false))], ['Recette par GAV', eur(GM.gavValue(), 1)]], acts: 'argent et dossiers. La PTS doit suivre, sinon le taux de signalisation baisse.', tip: cycle() + '<br>' + ptsAdvice() }),
    pts: () => ({ text: 'Un agent PTS signalise une GAV à la fois : empreintes, photos, ADN.', rows: [['Signalisations', arrow(pm(GM.ptsPerMin()), pm(plusUnit('pts', GM.ptsPerMin)))], ['Durée d\'une signalisation', sec(GM.ptsTime(false))], ['Auditions à suivre', pm(GM.invPerMin())]], acts: 'taux de signalisation (étoile 2, montant de la prime).', tip: cycle() + '<br>' + ptsAdvice() }),
    acc: () => ({ text: 'Un agent au guichet enregistre les usagers.', rows: [['Enregistrements', arrow(pm(GM.accPerMin()), pm(plusUnit('acc', GM.accPerMin)))], ['Public qui arrive', pm(GM.citPerMin())]], acts: 'usagers bien reçus (prime) et plaintes déposées.' }),
    pla: () => ({ text: 'Un agent traite une plainte à la fois.', rows: [['Plaintes', arrow(pm(GM.plaPerMin()), pm(plusUnit('pla', GM.plaPerMin)))], ['Durée d\'une plainte', sec(GM.plaTime())], ['Recette par plainte', eur(GM.plaValue(), 1)]], acts: 'argent, dossiers (objectif), pistes pour les patrouilles.' }),
    clean: () => ({ text: 'Nettoie les flaques de vomi dans les couloirs.', rows: [['Ménage', arrow(pm(GM.cleanPerMin()), pm(plusUnit('clean', GM.cleanPerMin)))], ['Flaques en ce moment', G.vomit]], acts: 'propreté (étoile) et vitesse de tous les services (−3 % par flaque).' }),
    masks: () => ({ text: 'Équipe un agent PTS contre les GAV qui puent des pieds.', rows: [['Agents équipés', arrow(`${Math.min(G.n.masks, G.n.pts)}/${G.n.pts}`, `${Math.min(G.n.masks + 1, G.n.pts)}/${G.n.pts}`)]], acts: 'vitesse de la PTS et malaises.', tip: G.n.masks >= G.n.pts ? 'Tous vos agents sont déjà équipés : un masque de plus ne sert à rien.' : '' }),
    snow: () => ({ text: 'Garde une patrouille en service pendant les tempêtes.', rows: [['Patrouilles pendant une tempête', arrow(`${Math.min(G.n.snow, G.n.patrols)}/${G.n.patrols}`, `${Math.min(G.n.snow + 1, G.n.patrols)}/${G.n.patrols}`)]], acts: 'interpellations pendant les tempêtes.' }),
    interp: () => { const wait = G.det.filter(d => d.foreign && d.e < 1).length; return { text: "Accompagne l'audition d'un passager étranger.", rows: [['Interprètes', arrow(G.n.interp, G.n.interp + 1)], ['Étrangers en GAV', wait]], acts: 'auditions des étrangers (sans interprète libre, elles attendent et risquent d\'être levées).' }; },
    press: () => ({ text: "Étouffe un scandale de star par semaine.", rows: [['Scandales étouffés par semaine', arrow(G.n.press, G.n.press + 1)], ['Scandales cette semaine', G.week.scandales]], acts: 'prime (÷2 s\'il reste un scandale), étoile « aucun scandale ».' }),
  };
  // ---------- équipements : ce qui change, avant → après ----------
  const UPM = {
    stamp: [['Gain par clic', () => eur(GM.tamponValue(), 1)], ['Accélération de la plus vieille GAV', () => pct(GM.tamponPush())]],
    coffee: [["Durée d'une audition", () => sec(GM.enqTime(false))], ['Auditions', () => pm(GM.invPerMin())]],
    gyro: [['Interpellations', () => pm(GM.patrolPerMin())]],
    bio: [["Durée d'une signalisation", () => sec(GM.ptsTime(false))], ['Signalisations', () => pm(GM.ptsPerMin())]],
    tickets: [['Enregistrements', () => pm(GM.accPerMin())]],
    hall: [["Places d'attente", () => GM.hallCap()]],
    lrp: [['Recette par GAV', () => eur(GM.gavValue(), 1)], ['Recette par plainte', () => eur(GM.plaValue(), 1)]],
    form: [["Durée d'une plainte", () => sec(GM.plaTime())], ['Plaintes', () => pm(GM.plaPerMin())]],
    com: [['Public qui arrive', () => pm(GM.citPerMin())]],
    beds: [['Places par cellule', () => GM.cellCap()], ['Places en cellule', () => GM.capacity()]],
    crois: [['Prime estimée cette semaine', () => eur(GM.primeCalc(G.week).prime)]],
    mop: [['Ménage', () => pm(GM.cleanPerMin())]],
    deo: [['GAV qui puent des pieds', () => pct(T.SMELLY * GM.down('deo'))]],
    parquet: [['Délai légal de GAV', () => sec(GM.gavLimit())]],
    avocat: [['Vitesse d\'audition avec avocat', () => pct(GM.lawK())]],
    xxl: [["Places d'attente", () => GM.hallCap()]],
    chains: [["Durée d'une tempête", () => sec(T.STORM_LEN * GM.down('chains'))]],
    visio: [['Enquêteurs bloqués en réunion', () => pct(T.MEETING_SHARE * GM.down('visio'))]],
    mailr: [["Durée d'une réunion", () => sec(T.MEETING_LEN * GM.down('mailr'))]],
  };
  const UPA = {
    stamp: 'gain des clics sur le tampon (le jeu tourne très bien sans cliquer).', coffee: 'auditions, donc argent et dossiers. La PTS devra suivre.', gyro: 'interpellations, donc remplissage des cellules.',
    bio: 'taux de signalisation (étoile 2, prime).', tickets: 'usagers bien reçus et plaintes déposées.', hall: 'relâchés faute de place et usagers fâchés.',
    lrp: 'toutes les recettes (GAV et plaintes) et donc la prime.', form: 'plaintes traitées, dossiers et pistes.', com: "public à l'accueil. Attention : il faut assez d'agents d'accueil.",
    beds: 'places en cellule, sans acheter de cellule.', crois: 'montant de la prime hebdo.', mop: 'propreté et vitesse des services.', deo: 'odeur, donc vitesse de la PTS et malaises.',
    parquet: 'GAV levées.', avocat: 'durée des auditions avec avocat, donc GAV levées.', xxl: 'relâchés faute de place pendant les manifs.', chains: 'interpellations pendant les tempêtes.',
    visio: 'auditions pendant les réunions.', mailr: 'auditions pendant les réunions.',
  };

  function content(key) {
    const [kind, id] = key.split(':');
    if (!id) return HUD[key] ? HUD[key]() : '';
    if (kind === 'u') { const u = UNITS.find(x => x.id === id), d = UNIT[id] ? UNIT[id]() : {}; return box({ title: u.name, ...d }); }
    if (kind === 'up') {
      const u = UPGRADES.find(x => x.id === id), lines = UPM[id] || [];
      const rows = lines.map(([k, f]) => [k, arrow(f(), plusUp(id, f))]);
      return box({ title: `${u.name} · niveau ${GM.lv(id)} → ${GM.lv(id) + 1}`, text: u.desc + '.', rows, acts: UPA[id] });
    }
    if (kind === 'sell') {
      const u = UPGRADES.find(x => x.id === id), l = GM.lv(id);
      if (l < 1) return '';
      const rows = [['Remboursement', eur(GM.sellValue(u))]].concat((UPM[id] || []).map(([k, f]) => [k, arrow(f(), minusUp(id, f))]));
      return box({ title: `Revendre : ${u.name} · niveau ${l} → ${l - 1}`, text: 'Le vide-grenier du commissariat rachète le dernier niveau à moitié prix. Pratique si une amélioration a déséquilibré vos services (des enquêteurs trop rapides pour la PTS, par exemple).', rows, acts: UPA[id], tip: 'Deux clics : le premier arme la vente, le second la confirme.' });
    }
    if (kind === 'b') {
      if (id === 'accueil') return box({ title: "Ouvrir l'accueil", text: 'Le public entre, fait la queue au guichet et vient déposer plainte.', rows: [['Public attendu', pm(withTemp(() => { G.built.accueil = true; return () => { G.built.accueil = false; }; }, GM.citPerMin))]], acts: 'usagers (prime) et, avec le bureau des plaintes, des dossiers en plus.' });
      if (id === 'plaintes') return box({ title: 'Ouvrir le bureau des plaintes', text: 'Les usagers enregistrés deviennent des plaintes à traiter.', acts: 'argent, dossiers (objectif) et pistes : les patrouilles vont 50 % plus vite tant qu\'il en reste.' });
      if (id === 'tier') { const nt = tier(G.tier + 1); return box({ title: 'Agrandir : ' + nt.name, text: 'Le bâtiment passe au palier suivant et la tour grandit.', rows: [['Recette par GAV', arrow(eur(GM.gavValue(), 1), eur(withTemp(() => { G.tier++; return () => { G.tier--; }; }, GM.gavValue), 1))], ['Public à l\'accueil', '+40 %']], acts: 'toutes les recettes (×1,6).' }); }
      if (id === 'move') { const nx = site(G.site + 1); return box({ title: 'Mutation : ' + nx.name, text: nx.pitch, rows: [['Étoiles', `${Math.min(G.cstars, T.STARS_TO_MOVE)} / ${T.STARS_TO_MOVE}`], ['Bonus', '+1 galon : +50 % de recettes pour toujours']], acts: 'tout repart à zéro dans le nouveau commissariat, sauf vos galons, médailles et étoiles de carrière.' }); }
    }
    return '';
  }

  // ---------- affichage : survol, focus, tap (stats) et appui long (boutons) ----------
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  let key = null, anchor = null, lastPtr = 'mouse', lpTimer = 0, lpFired = false;
  function place() {
    if (!key) return;
    if (!anchor || !anchor.isConnected) { anchor = document.querySelector(`[data-tip="${key}"]`); if (!anchor) return hide(); }
    const h = content(key); if (tip.innerHTML !== h) tip.innerHTML = h;
    const r = anchor.getBoundingClientRect(), w = tip.offsetWidth, hh = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8), y = r.bottom + 8;
    if (y + hh > vh - 8) y = Math.max(8, r.top - hh - 8);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function show(el) { anchor = el; key = el.dataset.tip; tip.hidden = false; place(); }
  function hide() { tip.hidden = true; key = null; anchor = null; }
  document.addEventListener('pointerdown', e => {
    lastPtr = e.pointerType; lpFired = false; clearTimeout(lpTimer);
    const el = e.target.closest && e.target.closest('.item[data-tip]');
    if (el && e.pointerType !== 'mouse') lpTimer = setTimeout(() => { lpFired = true; show(el); }, 450);
  }, true);
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, e => { if (t !== 'pointermove' || e.pointerType === 'mouse') return; clearTimeout(lpTimer); }, true));
  document.addEventListener('pointerup', () => clearTimeout(lpTimer), true);
  document.addEventListener('click', e => {
    if (lpFired) { e.preventDefault(); e.stopPropagation(); lpFired = false; return; } // appui long : on montre l'infobulle sans acheter
    if (lastPtr === 'mouse') return;
    const el = e.target.closest('[data-tip]');
    if (el && el.tagName !== 'BUTTON') { if (key === el.dataset.tip) hide(); else show(el); }
    else if (!el || el.tagName === 'BUTTON') hide();
  }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.item')) e.preventDefault(); });
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const el = e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hide(); });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-tip]')) hide(); });

  return { refresh: () => { if (key) place(); }, hide, content };
})();
