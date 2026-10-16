// Données du jeu : équilibrage, textes, icônes.
window.PD = (function () {
  const T = {
    DAY_LEN: 15,            // secondes par jour de jeu
    PATROL_TIME: 8,         // s par interpellation et par patrouille
    ENQ_TIME: 12,           // s d'audition par GAV
    PTS_TIME: 14,           // s de signalisation par GAV (plus long qu'une audition : il faut plus de PTS que d'enquêteurs)
    PTS_WAIT: 20,           // audition finie, la GAV attend au plus 20 s la fin d'une signalisation commencée
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
    STARS_TO_MOVE: 75,      // étoiles pour être muté des 5 premiers postes (3 par semaine + missions)…
    STARS_STEP: 25,         // …puis 25 de plus à chaque poste à partir du 6e (100, 125… 200 au ministère)…
    STARS_MAX: 500,         // …et ainsi de suite dans les secteurs, jusqu'à 500
    NG_MULT: 4,             // chaque partie terminée multiplie toutes les recettes de la suivante par 4
    PISTE_BOOST: 1.5,       // patrouilles plus rapides tant qu'il reste des pistes
    TOURIST_MULT: 3,        // touristes : public ×3, plaintes plus rapides mais moins payées
    TOURIST_VALUE: 0.5,
    TOURIST_SPEED: 1.6,
    STORM_EVERY: 110,       // neige : tempête régulière qui bloque les patrouilles sans motoneige
    STORM_LEN: 20,
    FOREIGN: 0.3,           // aéroport : GAV étrangères qui attendent un interprète
    COLIS_EVERY: 90,        // colis suspect : une partie de la PTS est mobilisée
    COLIS_LEN: 15,
    COLIS_SHARE: 0.3,
    VIP: 0.1,               // festival : GAV de stars
    VIP_MULT: 10,
    VIP_MAX_T: 40,          // au-delà, la star fait scandale
    MEETING_EVERY: 60,      // ministère : réunions qui bloquent des enquêteurs
    MEETING_LEN: 15,
    MEETING_SHARE: 0.4,
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
    MANIF_DAY: [0.5, 5],    // une manif par semaine, entre le lundi midi et le samedi midi
    MANIF_LEN: 25,
    MANIF_WAVE: 2,          // pendant une manif, les manifestants arrivent deux fois plus vite que les auditions
    LOST_TOL: 0.1,
    // clicker : un coup de tampon vaut une part de la recette par seconde (hors clics), avec un plafond anti-autoclic
    CLICK_SHARE: 0.05,      // 5 % de la recette passive par seconde et par coup, +50 % par niveau de tampon
    CLICK_MAX: 12,          // coups comptés par seconde au maximum
    RUSH_CLICK: 0.02,       // jauge « Coup de bourre » : remplissage par coup…
    RUSH_DECAY: 0.04,       // …et vidage par seconde quand on arrête
    RUSH_LEN: 15,           // jauge pleine : tout le commissariat ×2 pendant 15 s          // étoile « relâchés » : au plus 10 % des interpellations de la semaine
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
    snow: C('#e8f4ff', '#1b2a5c', '<path d="M4 22h18l6-6h-6l-3-5H9l-3 5H4z"/><rect x="3" y="24" width="26" height="2.5" rx="1"/><rect x="10" y="7" width="7" height="4" rx="2" fill="#ff4b5c"/>'),
    interp: C('#ffe066', '#3a2700', '<path d="M5 6h13v9H10l-4 4v-4H5z"/><path d="M14 13h13v9h-1v4l-4-4h-8z" fill="#3d7bff"/><rect x="8" y="9" width="7" height="1.6" fill="#ffe066"/><rect x="17" y="16" width="7" height="1.6" fill="#fff"/>'),
    press: C('#ff8fb8', '#3a0d1f', '<rect x="5" y="11" width="22" height="14" rx="2"/><circle cx="16" cy="18" r="5" fill="#ff8fb8"/><circle cx="16" cy="18" r="2.5"/><rect x="9" y="7" width="7" height="4" rx="1"/><path d="M24 4l2 4M28 8l-3 1" stroke="#3a0d1f" stroke-width="1.6"/>'),
    chains: C('#cfe3ff', '#1b2a5c', '<circle cx="9" cy="16" r="5" fill="none" stroke="#1b2a5c" stroke-width="2.6"/><circle cx="16" cy="16" r="5" fill="none" stroke="#3d7bff" stroke-width="2.6"/><circle cx="23" cy="16" r="5" fill="none" stroke="#1b2a5c" stroke-width="2.6"/>'),
    visio: C('#24377a', '#9cc2ff', '<rect x="4" y="7" width="18" height="14" rx="2"/><path d="M22 12l6-4v12l-6-4z"/><circle cx="13" cy="13" r="3" fill="#24377a"/><rect x="9" y="17" width="8" height="3" rx="1.5" fill="#24377a"/>'),
    mailr: C('#fbf4dc', '#2a2833', '<rect x="4" y="8" width="24" height="16" rx="2" fill="#fff" stroke="#2a2833" stroke-width="2"/><path d="M5 9l11 8 11-8" fill="none" stroke="#2a2833" stroke-width="2"/>'),
  };

  // Les commissariats de la carte : chacun garde au plus 3 problèmes actifs
  const PROBLEMS = {
    vomi: { name: 'Vomi dans les couloirs', desc: "Les GAV ivres vomissent dans les couloirs. Chaque flaque fait glisser tout le monde et ralentit tous les services. Il faut une équipe de ménage.", tip: "Recrutez des agents d'entretien dès les premières flaques : chaque flaque ralentit tous les services." },
    pieds: { name: 'Odeur de pieds', desc: "Certaines GAV puent tellement des pieds qu'un agent PTS sans masque à gaz travaille au ralenti et peut tomber dans les pommes.", tip: "Un masque à gaz par agent PTS (onglet Matériel), sinon malaises. Le déodorant industriel réduit le nombre de GAV qui puent." },
    delai: { name: 'Délai légal et avocats', desc: "Une GAV dure 24 h maximum. Au-delà, elle est levée et le dossier est perdu. Les avocats font traîner les auditions.", tip: "Gardez assez d'enquêteurs pour que personne n'attende : passé 24 h, la GAV est levée et le dossier perdu." },
    manif: { name: 'Manifestations', desc: "Chaque semaine, un jour annoncé dans la carte de la semaine, une manif amène des vagues entières d'interpellations, deux fois plus vite que les auditions. Le surplus doit tenir en salle d'attente, que les patrouilles laissent libre pour l'occasion.", tip: "Le jour de la manif est annoncé dans la carte de la semaine : prévoyez des cellules, et tamponnez sans relâche ce jour-là." },
    touristes: { name: 'Touristes', desc: "Trois fois plus de public, qui perd tout : lunettes, enfants, voiture de location. Les plaintes vont plus vite mais rapportent moitié moins. Il faut un accueil costaud.", tip: "Musclez l'accueil et les plaintes : trois fois plus de public, et chaque usager fâché fait baisser la prime." },
    neige: { name: 'Tempêtes de neige', desc: "Régulièrement, une tempête bloque les patrouilles : seules les motoneiges continuent d'interpeller. Les chaînes à neige raccourcissent les tempêtes.", tip: "Achetez des motoneiges : pendant une tempête, ce sont les seules patrouilles qui interpellent. Les chaînes raccourcissent les tempêtes." },
    interpretes: { name: 'Passagers étrangers', desc: "Une partie des GAV ne parle pas français : leur audition attend un interprète libre. De temps en temps, un colis suspect mobilise une partie de la PTS.", tip: "Recrutez des interprètes : sans eux, les auditions des étrangers attendent. Un colis suspect immobilise une partie de la PTS." },
    vip: { name: 'GAV de stars', desc: "Des stars en garde à vue : elles rapportent dix fois plus, mais si elles sortent non signalisées ou restent trop longtemps, c'est le scandale. Un scandale divise la prime par deux, sauf si un chargé de com' l'étouffe.", tip: "Les stars rapportent dix fois plus : faites-les signaliser vite et embauchez un chargé de com' pour étouffer les scandales." },
    reunion: { name: 'Réunionite', desc: "Toutes les minutes, une réunion bloque une partie des enquêteurs.", tip: "Prévoyez plus d'enquêteurs que nécessaire : une partie part régulièrement en réunion." },
  };
  const SITES = [
    { name: 'Saint-Glinglin-les-Choux', biome: 'campagne', kind: 'Campagne', problems: [], style: 'stone', star3: { id: 'sat', min: 0.9, label: 'Usagers bien reçus ≥ 90 %' },
      pitch: 'Un village, trois vaches et un tracteur. Les plaintes parlent de poules volées et de clôtures arrachées.' },
    { name: 'Bourg-en-Paperasse', biome: 'ville', kind: 'Ville', problems: ['vomi'], style: 'classic', star3: { id: 'clean', label: 'Propreté des couloirs ≥ 90 %' },
      pitch: 'Les bars ferment à 2 h, les GAV arrivent à 2 h 05. Et certaines vomissent dans les couloirs.' },
    { name: 'Grand-Bouchon', biome: 'metropole', kind: 'Métropole', problems: ['vomi', 'pieds'], style: 'modern', star3: { id: 'faint', label: 'Aucun malaise à la PTS' },
      pitch: 'Des gardés à vue qui sentent si fort des pieds que la PTS tombe dans les pommes. Masques à gaz obligatoires.' },
    { name: 'La Dalle-sur-Bourse', biome: 'megapole', kind: 'Mégapole', problems: ['vomi', 'pieds', 'delai'], style: 'glass', star3: { id: 'levee', label: 'Aucune GAV levée' },
      pitch: "Des avocats d'affaires partout. Passé le délai légal, la GAV est levée et le dossier part à la poubelle." },
    { name: 'Pontcassé-sous-Bois', biome: 'cite', kind: 'Banlieue', problems: ['pieds', 'delai', 'manif'], style: 'bunker', star3: { id: 'lost', label: 'Relâchés faute de place ≤ 10 %' },
      pitch: 'Une grosse manif chaque semaine. Les interpellations arrivent par cars entiers.' },
    { name: 'Sainte-Crème-sur-Mer', biome: 'plage', kind: 'Bord de mer', problems: ['touristes', 'pieds', 'vomi'], style: 'beach', star3: { id: 'sat', min: 0.85, label: 'Usagers bien reçus ≥ 85 %' },
      pitch: 'Tongs, sangria et coups de soleil. Les touristes perdent tout, les mouettes volent le reste.' },
    { name: 'Les Deux-Moufles', biome: 'neige', kind: 'Montagne', problems: ['neige', 'vomi', 'touristes'], style: 'chalet', star3: { id: 'clean', label: 'Propreté des couloirs ≥ 90 %' },
      pitch: "Tempêtes de neige, skieurs perdus et après-ski qui finit mal. Prévoyez des motoneiges et des serpillières." },
    { name: 'Roissy-en-Retard', biome: 'aeroport', kind: 'Aéroport', problems: ['interpretes', 'delai', 'touristes'], style: 'airport', star3: { id: 'levee', label: 'Aucune GAV levée' },
      pitch: 'Des passagers du monde entier, des valises oubliées partout et des correspondances à ne pas rater.' },
    { name: 'Festival de Cannettes', biome: 'festival', kind: 'Festival', problems: ['vip', 'manif', 'vomi'], style: 'fest', star3: { id: 'scandal', label: 'Aucun scandale de star' },
      pitch: "Paillettes, tapis rouge et stars en garde à vue. Les paparazzis campent devant l'entrée." },
    { name: 'Place Beauvau', biome: 'ministere', kind: 'Ministère', problems: ['reunion', 'delai', 'vip'], style: 'palace', star3: { id: 'igpn', label: "Inspection de l'IGPN réussie" },
      pitch: "Le sommet de la carrière : des réunions toute la journée et l'IGPN dans le bureau d'à côté." },
  ];
  // Au-delà : des secteurs sans fin, 3 ou 4 problèmes tirés au sort (toujours les mêmes pour un secteur donné)
  const ALLP = Object.keys(PROBLEMS);
  const BIOMES = ['ville', 'metropole', 'megapole', 'cite', 'plage', 'neige', 'aeroport', 'festival', 'ministere'];
  const STYLE_OF = { ville: 'classic', metropole: 'modern', megapole: 'glass', cite: 'bunker', plage: 'beach', neige: 'chalet', aeroport: 'airport', festival: 'fest', ministere: 'palace' };
  const STAR3_OF = {
    vomi: { id: 'clean', label: 'Propreté des couloirs ≥ 90 %' }, pieds: { id: 'faint', label: 'Aucun malaise à la PTS' },
    delai: { id: 'levee', label: 'Aucune GAV levée' }, manif: { id: 'lost', label: 'Relâchés faute de place ≤ 10 %' },
    touristes: { id: 'sat', min: 0.85, label: 'Usagers bien reçus ≥ 85 %' }, neige: { id: 'lost', label: 'Relâchés faute de place ≤ 10 %' },
    interpretes: { id: 'levee', label: 'Aucune GAV levée' }, vip: { id: 'scandal', label: 'Aucun scandale de star' },
    reunion: { id: 'igpn', label: "Inspection de l'IGPN réussie" },
  };
  function site(i) {
    if (i < SITES.length) return SITES[i];
    const k = i - SITES.length + 1;
    // mulberry32 : un tirage bien réparti (l'ancien générateur ramenait presque toujours la neige)
    let s = (i * 2654435761) >>> 0;
    const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const pool = ALLP.slice(), probs = [];
    while (probs.length < 3 + (k % 2)) probs.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const biome = BIOMES[Math.floor(r() * BIOMES.length)];
    // un critère qui ne peut pas rater ne compte pas : les levées viennent du délai légal, les relâchés des manifs
    const NEEDS = { levee: 'delai', lost: 'manif' };
    const star3 = STAR3_OF[probs.find(p => !NEEDS[STAR3_OF[p].id] || probs.includes(NEEDS[STAR3_OF[p].id]))];
    return { name: `Secteur spécial n° ${k}`, biome, kind: 'Secteur spécial', problems: probs, style: STYLE_OF[biome], hard: k, star3,
      pitch: 'Plusieurs problèmes tirés au sort, en plus gros. Le préfet compte sur vous.' };
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
    { id: 'snow', name: 'Motoneige', base: 60, g: 1.2, start: 0, prob: 'neige', desc: 'Garde une patrouille en service pendant les tempêtes de neige.' },
    { id: 'interp', name: 'Interprète', base: 50, g: 1.17, start: 0, prob: 'interpretes', desc: "Accompagne l'audition d'un passager étranger. Sans interprète libre, sa GAV attend." },
    { id: 'press', name: "Chargé de com'", base: 120, g: 1.25, start: 0, prob: 'vip', desc: 'Étouffe un scandale de star par semaine (paparazzis, réseaux sociaux…).' },
  ];

  // per = effet par niveau : le jeu ET les infobulles lisent cette même valeur
  const UPGRADES = [
    { id: 'stamp', name: 'Tampon en titane', base: 80, g: 6, per: 0.5, desc: 'Coup de tampon : +50 % de gain par niveau (un coup vaut 5 % de la recette par seconde au niveau 0)' },
    { id: 'coffee', name: 'Machine à café', base: 300, g: 3.2, per: 0.2, desc: "+20 % de vitesse d'audition par niveau" },
    { id: 'gyro', name: 'Gyrophares turbo', base: 300, g: 3.2, per: 0.2, desc: '+20 % de vitesse des patrouilles par niveau' },
    { id: 'bio', name: 'Borne biométrique', base: 450, g: 3.2, per: 0.25, desc: '+25 % de vitesse de signalisation par niveau' },
    { id: 'tickets', name: 'Distributeur de tickets', base: 300, g: 3, per: 0.25, needs: 'accueil', desc: "+25 % de vitesse de l'accueil par niveau" },
    { id: 'hall', name: 'Chaises en plastique', base: 200, g: 3.5, per: 4, desc: "+4 places d'attente par niveau (suspects et usagers)" },
    { id: 'lrp', name: 'Logiciel qui plante moins', base: 750, g: 3.4, per: 0.25, desc: '+25 % de recette par dossier, par niveau' },
    { id: 'form', name: 'Cerfa simplifié', base: 500, g: 3, per: 0.25, needs: 'plaintes', desc: '+25 % de vitesse des plaintes par niveau' },
    { id: 'com', name: 'Affiche « Venez porter plainte »', base: 350, g: 3.3, per: 0.3, needs: 'accueil', desc: "+30 % de public à l'accueil par niveau" },
    { id: 'beds', name: 'Bancs plus larges', base: 1500, g: 6, per: 1, scale: 'cells', desc: '+1 place dans chaque cellule par niveau' },
    { id: 'crois', name: 'Croissants du vendredi', base: 600, g: 3.5, per: 0.15, desc: '+15 % sur la prime hebdo par niveau' },
    { id: 'mop', name: 'Serpillière turbo', base: 300, g: 3, per: 0.3, prob: 'vomi', desc: '+30 % de vitesse de ménage par niveau' },
    { id: 'deo', name: 'Déodorant industriel', base: 300, g: 3.5, per: 0.2, prob: 'pieds', desc: '−20 % de GAV qui puent des pieds par niveau' },
    { id: 'parquet', name: 'Prolongation du parquet', base: 400, g: 3.4, per: 0.25, prob: 'delai', desc: '+25 % de délai légal de GAV par niveau' },
    { id: 'avocat', name: 'Café offert aux avocats', base: 350, g: 3.2, per: 0.1, prob: 'delai', desc: 'Les avocats ralentissent moins les auditions, par niveau' },
    { id: 'xxl', name: "Salle d'attente XXL", base: 500, g: 3.5, per: 10, prob: 'manif', desc: "+10 places d'attente pour les suspects par niveau" },
    { id: 'chains', name: 'Chaînes à neige', base: 400, g: 3.3, per: 0.2, prob: 'neige', desc: '−20 % de durée des tempêtes par niveau' },
    { id: 'visio', name: 'Visioconférence', base: 600, g: 3.4, per: 0.25, prob: 'reunion', desc: "−25 % d'enquêteurs bloqués en réunion par niveau" },
    { id: 'mailr', name: 'Réunion qui aurait pu être un mail', base: 450, g: 3.2, per: 0.25, prob: 'reunion', desc: '−25 % de durée des réunions par niveau' },
  ];

  // Vide-grenier du commissariat : revendre un niveau d'équipement à moitié prix, avec sa petite annonce
  const SELL = {
    stamp: 'Vends tampon en titane, quasi neuf, ne tamponne que le mardi.',
    coffee: 'Vends machine à café, détartrée en 2009. Les enquêteurs pleurent déjà.',
    gyro: 'Vends gyrophare turbo, a déjà fait danser tout un quartier.',
    bio: 'Vends borne biométrique, quelques empreintes de stagiaire encore dessus.',
    tickets: 'Vends distributeur de tickets, bloqué sur le 999.',
    hall: 'Vends chaises en plastique, un peu collantes, cause déménagement.',
    lrp: 'Vends logiciel qui plante moins. Depuis la vente, il replante.',
    form: 'Vends Cerfa simplifié, 47 pages seulement.',
    com: 'Vends affiche « Venez porter plainte », légèrement trop efficace.',
    beds: 'Vends bancs larges, idéal sieste, vue sur barreaux.',
    crois: 'Vends abonnement croissants. Le moral des troupes est en chute libre.',
    mop: 'Vends serpillière turbo. Elle a vu des choses.',
    deo: 'Vends déodorant industriel, parfum « forêt de pins et chaussettes ».',
    parquet: "Vends prolongation du parquet, le procureur n'en voulait plus.",
    avocat: 'Vends machine à café pour avocats. Ils réclament déjà la nullité.',
    xxl: "Vends salle d'attente XXL, légère odeur de manif.",
    chains: 'Vends chaînes à neige, il a fait beau.',
    visio: 'Vends visioconférence. On se reverra en vrai, en réunion.',
    mailr: 'Vends « réunion qui aurait pu être un mail ». Il y aura donc une réunion.',
  };

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
    plage: ["Un touriste a perdu son enfant. Puis sa femme. Puis sa voiture de location.", "Une mouette a volé un dossier. Elle est en fuite.", "Plainte contre le soleil pour coups et blessures."],
    neige: ["Tempête annoncée : les patrouilles sortent les moufles.", "Un skieur interpellé pour excès de vitesse sur piste verte.", "L'après-ski a encore mal fini. Serpillières en renfort."],
    aeroport: ["Bagage abandonné au terminal 2 : c'était un sandwich.", "Un passager demande un interprète en klingon.", "Correspondance ratée : le suspect porte plainte contre lui-même."],
    festival: ["Une star exige des cellules avec vue sur la mer.", "Les paparazzis ont pris en photo le distributeur de café.", "Tapis rouge déroulé jusqu'aux cellules. Le préfet n'a pas été prévenu."],
    ministere: ["Réunion pour préparer la réunion de demain.", "L'IGPN demande où sont rangés les trombones.", "Note de service n°4 812 : merci de lire les notes de service."],
  };

  // Ce qu'apporte le croissant doré. w = poids du tirage (environ 75 % de bonus, 25 % de malus).
  const GOLDEN = [
    { id: 'prefet', w: 3, label: 'Visite du préfet : recettes ×3', dur: 20, msg: 'Le préfet passe ! Tout le monde fait semblant de bosser. Recettes ×3 pendant 20 secondes.' },
    { id: 'major', w: 3, label: 'Aura du major : recettes ×3', dur: 10, msg: "L'aura du major irradie le commissariat : rentabilité de tout le commissariat +200 % pendant 10 secondes !" },
    { id: 'bac', w: 3, label: 'Renfort BAC : patrouilles ×3', dur: 25, msg: 'La BAC arrive en renfort. Patrouilles ×3 pendant 25 secondes.' },
    { id: 'maxime', w: 3, label: 'Maxime : PTS +50 %', dur: 30, msg: "Maxime a fait ses dossiers parquet ! La PTS n'a qu'à bien se tenir : efficacité de la PTS augmentée de 50 % pendant 30 secondes." },
    { id: 'lrpmail', w: 3, label: 'Mail LRP : PTS +50 %', dur: 20, msg: "Le mail LRP du jour est arrivé ! La PTS s'active et augmente son efficacité de 50 % pendant 20 secondes !" },
    { id: 'turbo', w: 2, label: 'Heures sup : tout ×2', dur: 20, msg: 'Heures sup payées (si si) : enquête, PTS, accueil, plaintes et ménage ×2 pendant 20 secondes.' },
    { id: 'pizza', w: 3, label: 'Pizzas : tout +25 %', dur: 30, msg: "Livraison de pizzas pour toute l'équipe ! Tous les services +25 % pendant 30 secondes." },
    { id: 'cash', w: 3, msg: "Saisie d'avoirs criminels ! Le butin part dans la caisse." },
    { id: 'stagiaire', w: 2, needs: 'plaintes', msg: "Le stagiaire a rangé les archives : toutes les plaintes en attente sont traitées d'un coup !" },
    { id: 'bbq', w: 2, needs: 'accueil', msg: "Barbecue du commissariat ! La file de l'accueil se vide, tout le monde repart ravi (et repu)." },
    { id: 'igpn', w: 2, msg: "Inspection surprise de l'IGPN !" },
    { id: 'amelie', w: 2, msg: 'La folle du bus Amélie fait des bruits étranges : les GAV sortent en masse du commissariat ! Les cellules repartent de zéro.' },
    { id: 'laurine', w: 3, malus: true, label: 'Laurine : −5 % partout', dur: 20, msg: "Ah mince, pas de chance… même si tomber sur Laurine en est une ! Elle sabote vos locaux : −5 % d'efficacité pendant 20 secondes dans tous les services." },
    { id: 'corbeaux', w: 3, malus: true, label: 'Corbeaux : PTS −10 %', dur: 10, msg: 'Les corbeaux réclament à manger : productivité de la PTS −10 % pendant 10 secondes.' },
    { id: 'photocop', w: 1, malus: true, needs: 'plaintes', label: 'Photocopieuse en panne : plaintes −50 %', dur: 15, msg: 'Panne de la photocopieuse ! Le bureau des plaintes tourne à moitié pendant 15 secondes.' },
    { id: 'pigeon', w: 1, malus: true, label: 'Pigeon : tampon volé', dur: 15, msg: 'Un pigeon a volé le tampon ! Impossible de tamponner pendant 15 secondes.' },
  ];

  const PRIME_TALK = {
    great: ['Le préfet est ravi. Il a presque souri.', 'Statistiques impeccables. On parle de vous au ministère.', 'Bravo commissaire. Une médaille en chocolat vous attend.'],
    ok: ['Correct. Le préfet a haussé un sourcil, en bien.', 'Pas mal. Le préfet a dit « bon ». Venant de lui, c\'est énorme.'],
    okPts: ['Pas mal, mais la PTS a eu chaud.', 'Bien, mais il manque des empreintes dans le fichier.'],
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

  // Note de service affichée à l'arrivée dans chaque poste : le topo du lieu, puis les conseils
  const TOPO = {
    campagne: "Votre premier poste : une gendarmerie de village entre les choux, les vaches et la mare aux canards. Aucun problème particulier ici : c'est le moment d'apprendre le métier.",
    ville: "Une petite ville tranquille… jusqu'au samedi soir. Les gardés à vue arrivent éméchés et ne savent pas se tenir dans les couloirs.",
    metropole: "Un grand hôtel de police haussmannien, des boulevards bouchés et des gardés à vue qui marchent toute la journée. Dans les cellules, ça sent fort.",
    megapole: "Le quartier d'affaires : des tours de verre, des costumes et des avocats pressés. Ici, chaque heure de garde à vue compte.",
    cite: "Un commissariat-bunker au pied des barres. Les manifestations arrivent par vagues, annoncées une semaine à l'avance.",
    plage: "Le poste de plage, sur pilotis. L'été amène trois fois plus de public, qui perd tout : lunettes, enfants, voiture de location.",
    neige: "Un chalet au pied des pistes. Les tempêtes bloquent les routes et les vacanciers ne tiennent pas l'altitude.",
    aeroport: "Le poste de l'aéroport, tout en longueur. Des passagers du monde entier, des valises abandonnées et des vols qui n'attendent pas.",
    festival: "Le festival : paillettes, tapis rouge et stars en garde à vue. Les paparazzis guettent le moindre scandale.",
    ministere: "Le sommet de la carrière : une aile du ministère, place Beauvau. Les réunions s'enchaînent et l'IGPN passe en inspection.",
  };
  const GENERAL_TIPS = [
    "Une GAV n'est bouclée que si une patrouille, un enquêteur et un agent PTS suivent : faites grandir les trois ensemble, avec un agent PTS de plus que d'enquêteurs.",
    "Tamponnez vite et sans vous arrêter : la jauge « Coup de bourre » fait tourner tout le commissariat deux fois plus vite.",
    "Attrapez les croissants dorés qui traversent l'écran, mais attention : certains sont des pièges.",
  ];
  function briefing(s) {
    const intro = TOPO[s.biome] && !s.hard ? TOPO[s.biome] : `Secteur spécial : ${s.problems.length} problèmes tirés au hasard, plus coriaces qu'ailleurs. Lisez bien la liste avant de recruter.`;
    return { intro, problems: s.problems.map(p => ({ name: PROBLEMS[p].name, tip: PROBLEMS[p].tip })), star: s.star3.label, tips: GENERAL_TIPS };
  }
  // « commissariat de Grand-Bouchon », « des Deux-Moufles », « de la Place Beauvau », « du Festival de Cannettes »
  const ofPlace = n => (/^Les /.test(n) ? 'des ' + n.slice(4) : /^Le /.test(n) ? 'du ' + n.slice(3) : /^La /.test(n) ? 'de la ' + n.slice(3) : /^(Festival|Secteur) /.test(n) ? 'du ' + n.charAt(0).toLowerCase() + n.slice(1) : /^Place /.test(n) ? 'de la ' + n.charAt(0).toLowerCase() + n.slice(1) : 'de ' + n);
  return { briefing, ofPlace, T, ICONS, UNITS, UPGRADES, SELL, BUILDINGS, tier, RADIO, RADIO_BY, GOLDEN, PRIME_TALK, PROBLEMS, SITES, site, fmt, eur, pick };
})();
