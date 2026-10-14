// Données du jeu : équilibrage, textes, icônes.
window.PD = (function () {
  const T = {
    DAY_LEN: 15,            // secondes par jour de jeu
    PATROL_TIME: 8,         // s par interpellation et par patrouille
    ENQ_TIME: 12,           // s d'audition par GAV
    PTS_TIME: 14,           // s de signalisation par GAV (plus long qu'une audition : il faut plus de PTS que d'enquêteurs)
    CITIZEN_TIME: 5,        // s entre deux usagers à l'accueil
    ACC_TIME: 4,            // s pour enregistrer un usager
    PLA_TIME: 10,           // s pour traiter une plainte
    GAV_VALUE: 14,
    PLAINTE_VALUE: 6,
    PISTE_CHANCE: 0.5,
    PISTE_MAX: 25,
    HALL: 4,
    PRIME_BASE: 0.25,
    OBJ_START: 8,
    STARS_TO_MOVE: 100,     // étoiles à gagner dans un commissariat pour être muté (3 max par semaine)
    // problèmes des commissariats suivants
    DRUNK: 0.3,             // part des GAV ivres (vomi)
    VOMIT_EVERY: 14,        // s entre deux vomis par GAV ivre
    VOMIT_MAX: 40,
    CLEAN_TIME: 4,          // s pour nettoyer une flaque
    SMELLY: 0.3,            // part des GAV qui puent des pieds
    UNMASKED: 0.3,          // vitesse PTS sans masque sur une GAV qui pue
    FAINT_RATE: 0.05,       // risque de malaise par seconde sans masque
    FAINT_TIME: 15,
    GAV_LIMIT: 55,          // délai légal (24 h de jeu)
    LAWYER: 0.25,           // part des GAV avec avocat
    LAWYER_SLOW: 0.6,
    MANIF_EVERY: 140,
    MANIF_LEN: 25,
    MANIF_MULT: 5,
  };

  const C = (bg, fg, path) => ({ bg, svg: `<svg viewBox="0 0 32 32" aria-hidden="true"><g fill="${fg}">${path}</g></svg>` });
  const ICONS = {
    patrols: C('#e8eefc', '#1b2a5c', '<rect x="3" y="15" width="26" height="8" rx="2"/><rect x="8" y="10" width="15" height="7" rx="2"/><circle cx="9" cy="24" r="3" fill="#111"/><circle cx="23" cy="24" r="3" fill="#111"/><rect x="11" y="7" width="4" height="3" fill="#ff4b5c"/><rect x="16" y="7" width="4" height="3" fill="#3d7bff"/>'),
    cells: C('#9aa0aa', '#2a2e36', '<rect x="5" y="5" width="22" height="3"/><rect x="5" y="24" width="22" height="3"/><rect x="7" y="8" width="2.5" height="16"/><rect x="12" y="8" width="2.5" height="16"/><rect x="17.5" y="8" width="2.5" height="16"/><rect x="22.5" y="8" width="2.5" height="16"/>'),
    inv: C('#c08a4e', '#2b1d10', '<circle cx="13" cy="13" r="7" fill="none" stroke="#2b1d10" stroke-width="3"/><rect x="18" y="19" width="4" height="10" transform="rotate(-45 20 24)"/>'),
    pts: C('#ffffff', '#3d7bff', '<path d="M16 4a10 10 0 0 0-10 10v4h3v-4a7 7 0 0 1 14 0v8h3v-8A10 10 0 0 0 16 4z"/><path d="M16 9a5 5 0 0 0-5 5v10h3V14a2 2 0 0 1 4 0v14h3V14a5 5 0 0 0-5-5z"/>'),
    acc: C('#ffc93c', '#3a2700', '<path d="M6 22a10 10 0 0 1 20 0z"/><rect x="4" y="23" width="24" height="3" rx="1"/><rect x="14.5" y="8" width="3" height="4" rx="1"/>'),
    pla: C('#fbf4dc', '#2a2833', '<path d="M5 9h9l2 3h11v13H5z" fill="#e9b949"/><rect x="9" y="15" width="14" height="2"/><rect x="9" y="19" width="10" height="2"/>'),
    coffee: C('#6b3f22', '#fff', '<path d="M7 12h15v9a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6z"/><path d="M22 14h2a3 3 0 0 1 0 6h-2v-2h2a1 1 0 0 0 0-2h-2z"/><rect x="11" y="4" width="2" height="5" rx="1"/><rect x="15" y="5" width="2" height="4" rx="1"/>'),
    bio: C('#3d7bff', '#fff', '<rect x="8" y="4" width="16" height="24" rx="3"/><circle cx="16" cy="13" r="4" fill="#3d7bff"/><rect x="11" y="20" width="10" height="2" fill="#3d7bff"/>'),
    gyro: C('#ff4b5c', '#fff', '<path d="M9 22a7 7 0 0 1 14 0z"/><rect x="6" y="23" width="20" height="4" rx="1"/><rect x="15" y="4" width="2" height="5"/><rect x="4" y="11" width="5" height="2" transform="rotate(30 6 12)"/><rect x="23" y="11" width="5" height="2" transform="rotate(-30 26 12)"/>'),
    lrp: C('#24377a', '#9cc2ff', '<rect x="4" y="6" width="24" height="16" rx="2"/><rect x="7" y="9" width="18" height="10" fill="#24377a"/><rect x="12" y="23" width="8" height="3"/><path d="M10 16l3-3 3 3 5-5" stroke="#36d68a" stroke-width="2" fill="none"/>'),
    beds: C('#9aa0aa', '#2a2e36', '<rect x="4" y="16" width="24" height="5" rx="1"/><rect x="5" y="21" width="3" height="6"/><rect x="24" y="21" width="3" height="6"/><rect x="6" y="12" width="7" height="4" rx="2" fill="#fff"/>'),
    hall: C('#36d68a', '#0d3b23', '<rect x="6" y="14" width="9" height="3"/><rect x="6" y="6" width="3" height="11"/><rect x="6" y="17" width="2" height="8"/><rect x="13" y="17" width="2" height="8"/><rect x="18" y="14" width="9" height="3"/><rect x="18" y="6" width="3" height="11"/><rect x="18" y="17" width="2" height="8"/><rect x="25" y="17" width="2" height="8"/>'),
    tickets: C('#ffc93c', '#3a2700', '<rect x="8" y="4" width="16" height="22" rx="2"/><rect x="11" y="8" width="10" height="5" fill="#ff4b5c"/><rect x="12" y="20" width="8" height="10" fill="#fff"/>'),
    form: C('#fbf4dc', '#2a2833', '<rect x="7" y="4" width="18" height="24" rx="1" fill="#fff" stroke="#2a2833" stroke-width="2"/><rect x="10" y="9" width="12" height="2"/><rect x="10" y="14" width="12" height="2"/><rect x="10" y="19" width="7" height="2"/><path d="M18 22l3 3 6-8" stroke="#36d68a" stroke-width="3" fill="none"/>'),
    com: C('#ff4b5c', '#fff', '<path d="M5 13h5l12-6v18l-12-6H5z"/><rect x="8" y="19" width="4" height="8" rx="1"/>'),
    crois: C('#e9b949', '#8a5a00', '<path d="M4 20c2-9 22-9 24 0-4-3-7-3-8 1-2-4-6-4-8 0-1-4-4-4-8-1z"/>'),
    stamp: C('#c4142a', '#fff', '<rect x="13" y="4" width="6" height="12" rx="3"/><rect x="7" y="16" width="18" height="5" rx="1"/><rect x="5" y="23" width="22" height="4" rx="1"/>'),
    accueil: C('#ffc93c', '#3a2700', '<rect x="4" y="12" width="24" height="15"/><path d="M2 12L16 4l14 8z"/><rect x="13" y="18" width="6" height="9" fill="#fff"/>'),
    plaintes: C('#fbf4dc', '#2a2833', '<rect x="4" y="10" width="24" height="17"/><rect x="7" y="13" width="7" height="6" fill="#e9b949"/><rect x="18" y="13" width="7" height="6" fill="#e9b949"/><rect x="10" y="4" width="12" height="6"/>'),
    hq: C('#3d7bff', '#fff', '<rect x="5" y="8" width="22" height="20"/><rect x="8" y="11" width="4" height="4" fill="#1b2a5c"/><rect x="14" y="11" width="4" height="4" fill="#1b2a5c"/><rect x="20" y="11" width="4" height="4" fill="#1b2a5c"/><rect x="13" y="20" width="6" height="8" fill="#1b2a5c"/><rect x="11" y="3" width="4" height="4" fill="#ff4b5c"/><rect x="17" y="3" width="4" height="4" fill="#3d7bff"/>'),
    mutation: C('#ffc93c', '#3a2700', '<path d="M16 3l3.6 7.6 8.4 1-6.2 5.8 1.6 8.3L16 21.6 8.6 25.7l1.6-8.3L4 11.6l8.4-1z"/>'),
    clean: C('#8fe3a1', '#14532d', '<path d="M8 14h16l-2 14H10z"/><rect x="7" y="12" width="18" height="3" rx="1"/><rect x="18" y="2" width="2.5" height="12" transform="rotate(20 19 8)"/>'),
    masks: C('#3a4152', '#cfe3ff', '<path d="M7 12c0-5 18-5 18 0v6c0 4-4 7-9 7s-9-3-9-7z"/><circle cx="12" cy="14" r="2.6" fill="#3a4152"/><circle cx="20" cy="14" r="2.6" fill="#3a4152"/><circle cx="16" cy="25" r="4" fill="#8a93a6"/>'),
    mop: C('#8fe3a1', '#14532d', '<rect x="15" y="3" width="2.5" height="17"/><path d="M8 20h16l2 8H6z"/>'),
    deo: C('#c8f0ff', '#1b5c7a', '<rect x="11" y="9" width="10" height="19" rx="3"/><rect x="13" y="4" width="6" height="5"/><path d="M22 5h6M22 8h5M22 11h6" stroke="#1b5c7a" stroke-width="1.6"/>'),
    parquet: C('#7a1f2b', '#ffd9a0', '<rect x="14.5" y="4" width="3" height="20"/><path d="M5 10h22l-4 7H9z"/><rect x="8" y="25" width="16" height="3"/>'),
    avocat: C('#1a1a1a', '#ffffff', '<path d="M9 6h14l3 22H6z"/><path d="M14 6l2 6 2-6z" fill="#1a1a1a"/><rect x="15" y="12" width="2" height="9" fill="#1a1a1a"/>'),
    xxl: C('#ff7b1c', '#3a1a00', '<rect x="4" y="10" width="24" height="14" rx="2"/><path d="M8 14l4 6M12 14l-4 6M15 14l4 6M19 14l-4 6M22 14v6h4" stroke="#fff" stroke-width="1.8" fill="none"/>'),
  };

  // Les commissariats de la carte : chacun ajoute son problème
  const PROBLEMS = {
    vomi: { name: 'Vomi dans les couloirs', desc: "Les GAV ivres vomissent dans les couloirs. Plus il y a de flaques, plus tout le monde glisse et ralentit. Il faut une équipe de ménage." },
    pieds: { name: 'Odeur de pieds', desc: "Certaines GAV puent tellement des pieds que la PTS sans masque à gaz travaille au ralenti et tombe dans les pommes." },
    delai: { name: 'Délai légal et avocats', desc: "Une GAV dure 24 h maximum. Au-delà, elle est levée et le dossier est perdu. Les avocats font traîner les auditions." },
    manif: { name: 'Manifestations', desc: "Régulièrement, une manif amène des vagues entières d'interpellations. Il faut de la place en cellule et en salle d'attente." },
  };
  const SITES = [
    { name: 'Saint-Parpaing-les-Choux', biome: 'campagne', kind: 'Campagne', problems: [], style: 'stone', star3: { id: 'sat', label: 'Usagers bien reçus ≥ 90 %' },
      pitch: 'Un village, trois vaches et un tracteur. Les plaintes parlent de poules volées et de clôtures arrachées.' },
    { name: 'Parpaing-Ville', biome: 'ville', kind: 'Ville', problems: ['vomi'], style: 'classic', star3: { id: 'clean', label: 'Propreté des couloirs ≥ 90 %' },
      pitch: 'Les bars ferment à 2 h, les GAV arrivent à 2 h 05. Et certaines vomissent dans les couloirs.' },
    { name: 'Grand-Parpaing', biome: 'metropole', kind: 'Métropole', problems: ['vomi', 'pieds'], style: 'modern', star3: { id: 'faint', label: 'Aucun malaise à la PTS' },
      pitch: 'Des gardés à vue qui sentent si fort des pieds que la PTS tombe dans les pommes. Masques à gaz obligatoires.' },
    { name: 'Parpaing-la-Défense', biome: 'megapole', kind: 'Mégapole', problems: ['vomi', 'pieds', 'delai'], style: 'glass', star3: { id: 'levee', label: 'Aucune GAV levée' },
      pitch: "Des avocats d'affaires partout. Passé le délai légal, la GAV est levée et le dossier part à la poubelle." },
    { name: 'Parpaing-Nord', biome: 'cite', kind: 'Mégapole', problems: ['vomi', 'pieds', 'delai', 'manif'], style: 'bunker', star3: { id: 'lost', label: 'Aucun relâché faute de place' },
      pitch: 'Une manif par jour, minimum. Les interpellations arrivent par cars entiers.' },
  ];
  function site(i) {
    if (i < SITES.length) return SITES[i];
    const k = i - SITES.length + 1;
    return { name: `Secteur Parpaing ${k + 1}`, biome: k % 2 ? 'cite' : 'megapole', kind: 'Mégapole', problems: ['vomi', 'pieds', 'delai', 'manif'], style: k % 2 ? 'bunker' : 'glass', hard: k,
      star3: { id: 'levee', label: 'Aucune GAV levée' }, pitch: 'Tous les problèmes à la fois, en plus gros. Le préfet compte sur vous.' };
  }

  const UNITS = [
    { id: 'patrols', name: 'Patrouille', base: 15, g: 1.17, start: 1, desc: 'Deux collègues, une voiture, un sandwich triangle. Ramène des suspects en GAV.' },
    { id: 'cells', name: 'Cellule de GAV', base: 40, g: 1.25, start: 1, desc: 'Béton, banc, néon qui grésille. Sans place, les suspects repartent libres.' },
    { id: 'inv', name: 'Enquêteur', base: 25, g: 1.16, start: 1, desc: 'Auditionne et boucle les procédures. Chaque GAV bouclée rapporte.' },
    { id: 'pts', name: 'Agent PTS', base: 30, g: 1.16, start: 1, desc: 'Empreintes, photos, ADN. Une GAV non signalisée plombe la prime.' },
    { id: 'acc', name: "Agent d'accueil", base: 20, g: 1.15, start: 1, needs: 'accueil', desc: 'Accueille le public, prend le ticket, garde son calme.' },
    { id: 'pla', name: 'Agent des plaintes', base: 35, g: 1.16, start: 1, needs: 'plaintes', desc: 'Traite les plaintes. Une plainte sur deux donne une piste aux patrouilles.' },
    { id: 'clean', name: "Agent d'entretien", base: 30, g: 1.15, start: 1, prob: 'vomi', desc: "Serpillière, seau et nerfs d'acier. Nettoie le vomi des couloirs." },
    { id: 'masks', name: 'Masque à gaz', base: 20, g: 1.13, start: 0, prob: 'pieds', desc: 'Un masque équipe un agent PTS. Sans masque, les GAV qui puent des pieds ralentissent la PTS et provoquent des malaises.' },
  ];

  const UPGRADES = [
    { id: 'stamp', name: 'Tampon en titane', base: 50, g: 4, desc: 'Coup de tampon ×2' },
    { id: 'coffee', name: 'Machine à café', base: 100, g: 3, desc: '+25 % vitesse des enquêteurs' },
    { id: 'gyro', name: 'Gyrophares turbo', base: 120, g: 3, desc: '+25 % vitesse des patrouilles' },
    { id: 'bio', name: 'Borne biométrique', base: 150, g: 3, desc: '+30 % vitesse PTS' },
    { id: 'tickets', name: 'Distributeur de tickets', base: 180, g: 3, needs: 'accueil', desc: "+30 % vitesse de l'accueil" },
    { id: 'hall', name: 'Chaises en plastique', base: 200, g: 3.5, desc: "+4 places d'attente (suspects et usagers)" },
    { id: 'lrp', name: 'Logiciel qui plante moins', base: 250, g: 3.2, desc: '+30 % recette par dossier' },
    { id: 'form', name: 'Cerfa simplifié', base: 300, g: 3, needs: 'plaintes', desc: '+30 % vitesse des plaintes' },
    { id: 'com', name: 'Affiche « Venez porter plainte »', base: 350, g: 3.3, needs: 'accueil', desc: '+30 % de public à l\'accueil' },
    { id: 'beds', name: 'Bancs plus larges', base: 400, g: 5, desc: '+1 place par cellule' },
    { id: 'crois', name: 'Croissants du vendredi', base: 600, g: 3.5, desc: '+15 % sur la prime hebdo' },
    { id: 'mop', name: 'Serpillière turbo', base: 150, g: 3, prob: 'vomi', desc: '+30 % vitesse de ménage' },
    { id: 'deo', name: 'Déodorant industriel', base: 300, g: 3.5, prob: 'pieds', desc: '−20 % de GAV qui puent des pieds' },
    { id: 'parquet', name: 'Prolongation du parquet', base: 400, g: 3.4, prob: 'delai', desc: '+25 % de délai légal de GAV' },
    { id: 'avocat', name: 'Café offert aux avocats', base: 350, g: 3.2, prob: 'delai', desc: 'Les avocats font moins traîner les auditions' },
    { id: 'xxl', name: "Salle d'attente XXL", base: 500, g: 3.5, prob: 'manif', desc: "+10 places d'attente pour les suspects" },
  ];

  const BUILDINGS = [
    { id: 'accueil', name: "Ouvrir l'accueil", cost: 60, desc: 'Le public entre, prend un ticket et vient déposer plainte.' },
    { id: 'plaintes', name: 'Ouvrir le bureau des plaintes', cost: 180, needs: 'accueil', desc: 'Les plaintes deviennent des dossiers traités, et des pistes pour les patrouilles.' },
  ];

  const TIERS = [
    { name: 'Poste de police', cost: 0 },
    { name: 'Commissariat', cost: 1500 },
    { name: 'Commissariat central', cost: 20000 },
    { name: 'Hôtel de police', cost: 250000 },
    { name: 'Direction territoriale', cost: 3e6 },
    { name: 'Préfecture de police', cost: 4e7 },
    { name: 'Quai des Orfèvres bis', cost: 6e8 },
  ];
  function tier(i) {
    if (i < TIERS.length) return TIERS[i];
    const k = i - TIERS.length + 1;
    return { name: `Tour Parpaing, étage ${k + 1}`, cost: 6e8 * Math.pow(12, k) };
  }

  const RADIO = [
    "Un individu interpellé pour vol de parpaings. Le commissaire se sent visé.",
    "La machine à café est placée en garde à vue pour non-assistance à enquêteur en danger.",
    "Rappel : les stylos de l'accueil sont attachés pour une raison.",
    "Plainte déposée contre un goéland pour vol de frites aggravé.",
    "Le logiciel de procédure a planté. Il a demandé un avocat.",
    "Patrouille 3 signale un chat sur un toit. Patrouille 3 est priée de revenir.",
    "Un usager demande si on peut porter plainte contre le lundi.",
    "La PTS a relevé 412 empreintes sur la photocopieuse. Toutes celles du commissaire.",
    "Le commissaire Parpaing rappelle que le béton, c'est solide, comme ses procédures.",
    "Objet trouvé : une moustache. Si c'est la vôtre, passez au guichet 2.",
    "Le préfet a liké la page du commissariat. Panique générale.",
    "Un suspect a demandé le wifi en cellule. Refusé.",
    "Les croissants du vendredi sont arrivés jeudi. Enquête ouverte.",
    "Plainte pour tapage nocturne : c'était le gyrophare de la patrouille 1.",
    "Un témoin affirme avoir vu le suspect. Il portait des lunettes de soleil. La nuit.",
    "Le distributeur de tickets affiche 999. Personne ne sait pourquoi.",
    "La cellule 1 est très demandée, elle a vue sur la mer.",
    "Note de service : interdiction de tamponner les collègues.",
  ];

  const RADIO_BY = {
    campagne: ["Plainte déposée contre une vache qui a mangé le panneau STOP.", "Course-poursuite à 25 km/h derrière un tracteur volé.", "Le garde champêtre demande si le commissariat a du wifi.", "Vol de 40 poules. Le renard a un alibi."],
    ville: ["Le couloir 2 a été repeint par un gardé à vue. Couleur : kebab.", "L'équipe ménage réclame une prime de bravoure.", "Les bars ferment. Préparez les serpillières."],
    metropole: ["La PTS demande si les masques à gaz couvrent aussi les chaussettes.", "Un gardé à vue a retiré ses chaussures. Évacuation du 1er étage.", "Record battu : odeur détectée depuis le parking."],
    megapole: ["Un avocat a demandé la nullité parce que le café était tiède.", "Le parquet rappelle que 24 h, c'est 24 h.", "Trois avocats pour un vol de trottinette."],
    cite: ["Manifestation devant le commissariat. Les pancartes sont bien écrites.", "Le car de CRS est coincé dans un rond-point.", "Une manif contre les manifs est annoncée pour demain."],
  };

  const GOLDEN = [
    { id: 'prefet', label: 'Visite du préfet : recettes ×5', dur: 30, msg: 'Le préfet passe ! Tout le monde fait semblant de bosser. Recettes ×5 pendant 30 s.' },
    { id: 'bac', label: 'Renfort BAC : patrouilles ×4', dur: 30, msg: 'La BAC arrive en renfort. Patrouilles ×4 pendant 30 s.' },
    { id: 'maxime', label: 'Maxime : PTS +50 %', dur: 30, msg: "Maxime a fait ses dossiers parquet ! La PTS n'a qu'à bien se tenir : efficacité de la PTS augmentée de 50 % pendant 30 secondes." },
    { id: 'laurine', label: 'Laurine : −5 % partout', dur: 5, malus: true, msg: "Ah mince, pas de chance… même si tomber sur Laurine en est une ! Elle sabote vos locaux : −5 % d'efficacité pendant 5 secondes dans tous les services." },
    { id: 'turbo', label: 'Heures sup : traitement ×3', dur: 30, msg: 'Heures sup payées (si si). Enquête, PTS et plaintes ×3 pendant 30 s.' },
    { id: 'cash', label: '', dur: 0, msg: "Saisie d'avoirs criminels ! Le butin part dans la caisse." },
  ];

  const PRIME_TALK = {
    great: ['Le préfet est ravi. Il a presque souri.', 'Statistiques impeccables. On parle de vous au ministère.', 'Bravo commissaire. Une médaille en chocolat vous attend.'],
    ok: ['Correct. Le préfet a haussé un sourcil, en bien.', 'Pas mal, mais la PTS a eu chaud.'],
    meh: ['Le préfet a soupiré. Longuement.', 'Des GAV non signalisées... le fichier pleure.'],
    zero: ['Prime refusée. Le préfet demande « c\'est quoi ce bazar ».', "Zéro prime. Même la machine à café a honte."],
  };

  const SUFFIX = ['', 'k', 'M', 'Md', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n, dec) {
    if (!isFinite(n)) return '∞';
    const neg = n < 0; n = Math.abs(n);
    let s;
    if (n < 1000) s = n < 10 && dec ? n.toFixed(1).replace('.', ',') : Math.floor(n).toString();
    else {
      const e = Math.floor(Math.log10(n) / 3);
      if (e < SUFFIX.length) {
        const v = n / Math.pow(1000, e);
        s = (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v).toString()).replace('.', ',') + ' ' + SUFFIX[e];
      } else s = n.toExponential(2).replace('.', ',');
    }
    return (neg ? '-' : '') + s;
  }
  const eur = (n, dec) => fmt(n, dec) + ' €';
  const pick = a => a[Math.floor(Math.random() * a.length)];

  return { T, ICONS, UNITS, UPGRADES, BUILDINGS, tier, RADIO, RADIO_BY, GOLDEN, PRIME_TALK, PROBLEMS, SITES, site, fmt, eur, pick };
})();
