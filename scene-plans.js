// Plans des commissariats : chaque lieu a sa forme, ses pièces, ses couloirs et ses trajets.
// Repère : x vers la droite, z vers la rue (devant). Terrain constructible : x -26..26, z -12.5..12.5
// (derrière : tour administrative et cour des véhicules). Rectangles [x0, z0, x1, z1].
// Côtés : N = z0 (vers l'arrière), S = z1 (vers la rue), W = x0, E = x1.
// rooms : k (hall | pla | pts | inv | gav | boss), door = côté de la porte, at = position le long du mur,
//   ent = côté de l'entrée publique (accueil). La cellule de garde à vue fait toujours 16 × 9.
// corr = couloirs intérieurs, out = allées extérieures (cour, passerelles), spine = ligne de circulation,
// back = sortie vers la cour des véhicules (point de la ligne, puis chemin dehors), ext = extension de la GAV,
// deco = rectangles décoratifs (jardin, patio, garage…), doors = ouvertures en plus [x, z, axe, largeur].
window.PLANS = {
  // Gendarmerie de village : petite, en U autour d'une cour de ferme ouverte sur la rue
  campagne: {
    rooms: [
      { k: 'gav', r: [-18, -12.5, -2, -3.5], door: 'S', at: -6 },
      { k: 'hall', r: [-1.5, -12.5, 9, -3.5], door: 'S' },
      { k: 'boss', r: [9.5, -12.5, 20.5, -6.5], door: 'W', at: -9 },
      { k: 'pts', r: [9.5, -6, 20.5, 2.5], door: 'W', at: -1 },
      { k: 'inv', r: [9.5, 3, 20.5, 11], door: 'W', at: 6.5 },
      { k: 'pla', r: [-18, -3, -8.5, 8], door: 'E', at: 2.5 },
    ],
    out: [[-8.5, -3, 9, 12.5]], ground: 'gravel',
    spine: [[-7, 3], [-7, -1.8], [7.4, -1.8], [7.4, 6]],
    portal: [0, 12.6], gate: true,
    back: { at: [7.4, 6], path: [[8.2, 11.8], [21.8, 11.8], [21.8, -13.2], [15, -20]] },
    ext: [-18.5, 8.6, -7.9, 15.2],
    deco: [{ r: [-26, -12.5, -18.6, 11], kind: 'potager' }],
  },
  // Maison de ville en L : couloir coudé, petit jardin intérieur, jardin devant à droite
  ville: {
    rooms: [
      { k: 'hall', r: [-12, 1.2, 1, 11], ent: 'S', door: 'N' },
      { k: 'pla', r: [-25, 1.2, -12.5, 11], door: 'N' },
      { k: 'pts', r: [1.5, 1.2, 14, 11], door: 'N' },
      { k: 'inv', r: [-25, -12.5, -7.5, -1.4], door: 'S' },
      { k: 'boss', r: [-7, -12.5, -0.5, -1.4], door: 'S' },
      { k: 'gav', r: [14, -12.5, 23, 3.5], door: 'W', at: -5 },
    ],
    corr: [[-25, -1.4, 14, 1.2], [11.4, -12.5, 14, -1.4]],
    spine: [[-23, -0.1], [12.7, -0.1], [12.7, -12.5]],
    back: { at: [12.7, -12.5], path: [[12.7, -13.3], [15, -20]] },
    doors: [[12.7, -12.5, 'x', 2.2]],
    ext: [14, 4.2, 24.6, 10.8],
    deco: [{ r: [-0.5, -12.5, 11.4, -1.4], kind: 'garden' }],
  },
  // Hôtel de police haussmannien : grand, en U autour d'une cour d'honneur à l'arrière
  metropole: {
    rooms: [
      { k: 'pla', r: [-26, 2, -13, 12.5], door: 'N' },
      { k: 'hall', r: [-12.5, 2, 0.5, 12.5], ent: 'S', door: 'N' },
      { k: 'pts', r: [1, 2, 14, 12.5], door: 'N' },
      { k: 'boss', r: [14.5, 2, 21, 12.5], door: 'N' },
      { k: 'inv', r: [-26, -12.5, -13, -0.6], door: 'S' },
      { k: 'gav', r: [5, -9.6, 21, -0.6], door: 'S' },
    ],
    corr: [[-26, -0.6, 21, 2]],
    spine: [[-24, 0.7], [19.5, 0.7]],
    doors: [[-4, -0.6, 'x', 2.4]],
    back: { at: [-4, 0.7], path: [[-4, -2], [3, -4], [3.5, -12.9], [15, -20]] },
    ext: [-12, -12.3, -1.4, -5.7],
    deco: [{ r: [-12.5, -12.5, 4.5, -0.6], kind: 'court' }],
  },
  // Bloc de verre compact autour d'un atrium planté, couloir en anneau
  megapole: {
    rooms: [
      { k: 'hall', r: [-8, 4.4, 8, 12.5], ent: 'S', door: 'N' },
      { k: 'pla', r: [-17, 2, -8, 12.5], door: 'E', at: 8 },
      { k: 'pts', r: [8, 4, 17, 12.5], door: 'W', at: 8 },
      { k: 'inv', r: [-17, -12.5, -8, 1.5], door: 'E', at: -1 },
      { k: 'gav', r: [8, -12.5, 17, 3.5], door: 'W', at: -1 },
      { k: 'boss', r: [-8, -12.5, 5.4, -4], door: 'S', at: -2 },
    ],
    corr: [[-8, 1.8, 8, 4.4], [-8, -4, -5.4, 1.8], [5.4, -4, 8, 1.8], [-5.4, -4, 5.4, -1.4], [5.4, -12.5, 8, -4]],
    spine: [[0, 3.1], [-6.7, 3.1], [-6.7, -2.7], [6.7, -2.7], [6.7, -12.5]],
    doors: [[0, 4.4, 'x', 15], [6.7, -12.5, 'x', 2.2]],
    back: { at: [6.7, -12.5], path: [[6.7, -13.3], [12, -19]] },
    ext: [17.5, -12.5, 24.1, -1.9],
    deco: [{ r: [-5.4, -1.4, 5.4, 1.8], kind: 'atrium', glass: true }],
    glassy: true,
  },
  // Bunker de béton : petit, murs épais, meurtrières, un seul couloir central
  cite: {
    rooms: [
      { k: 'hall', r: [-5, 3.6, 5, 10.5], ent: 'S', door: 'N' },
      { k: 'pla', r: [-16, 3.6, -5, 10.5], door: 'E', at: 7 },
      { k: 'pts', r: [5, 3.6, 16, 10.5], door: 'W', at: 7 },
      { k: 'inv', r: [-16, -12.5, -1.3, 3.6], door: 'E', at: -2 },
      { k: 'gav', r: [1.3, -12.5, 10.3, 3.5], door: 'W', at: -4 },
      { k: 'boss', r: [10.3, -12.5, 16, 3.5], door: 'W', at: -8 },
    ],
    corr: [[-1.3, -12.5, 1.3, 3.6]],
    spine: [[0, 8], [0, -12.5]],
    doors: [[0, -12.5, 'x', 2.2]],
    back: { at: [0, -12.5], path: [[0, -12.9], [2.8, -12.9], [15, -20]] },
    ext: [16.5, -12.5, 23.1, -1.9],
    thick: 0.6, slits: true,
  },
  // Cabanes de plage séparées, reliées par des passerelles en bois
  plage: {
    rooms: [
      { k: 'hall', r: [-6.5, 2.2, 6.5, 11], ent: 'S', door: 'N' },
      { k: 'pla', r: [-19, 2.6, -8, 11], door: 'N' },
      { k: 'pts', r: [8, 2.6, 21, 11], door: 'N' },
      { k: 'inv', r: [-22, -12.5, -3, -2.8], door: 'S' },
      { k: 'gav', r: [3, -11.6, 19, -2.6], door: 'S' },
      { k: 'boss', r: [20.5, -11.6, 26, -2.6], door: 'S' },
    ],
    out: [[-24, -1.6, 24, 1.6], [-1.4, -12.5, 1.4, -1.6]], ground: 'planks',
    spine: [[-21, 0], [23, 0]],
    back: { at: [0, 0], path: [[0, -12.9], [2.8, -12.9], [15, -20]] },
    ext: [-26.5, 1.8, -19.9, 12.4],
    wood: true,
  },
  // Chalet en L, garage à motoneiges devant
  neige: {
    rooms: [
      { k: 'pla', r: [-26, 2, -14.5, 11], door: 'N' },
      { k: 'hall', r: [-14, 2, -1, 11], ent: 'S', door: 'N' },
      { k: 'pts', r: [-0.5, 2, 8, 11], door: 'N' },
      { k: 'inv', r: [-26, -12.5, -8.5, -0.6], door: 'S' },
      { k: 'boss', r: [-8, -12.5, -1.5, -0.6], door: 'S' },
      { k: 'gav', r: [8, -12.5, 17, 3.5], door: 'W', at: -5 },
    ],
    corr: [[-26, -0.6, 8, 2], [5.4, -12.5, 8, -0.6]],
    spine: [[-24, 0.7], [6.7, 0.7], [6.7, -12.5]],
    doors: [[6.7, -12.5, 'x', 2.2]],
    back: { at: [6.7, -12.5], path: [[6.7, -13.3], [15, -20]] },
    ext: [17.5, -12.5, 24.1, -1.9],
    deco: [{ r: [9, 4.5, 20, 11], kind: 'garage' }],
    wood: true,
  },
  // Poste de l'aéroport : tout en longueur, un grand hall vitré le long de la façade
  aeroport: {
    rooms: [
      { k: 'pla', r: [-26, -0.5, -17.5, 9.5], door: 'S' },
      { k: 'hall', r: [-17, -0.5, -5.5, 9.5], door: 'S' },
      { k: 'pts', r: [-2.5, -0.5, 4.5, 9.5], door: 'S' },
      { k: 'gav', r: [5, 0.5, 21, 9.5], door: 'S' },
      { k: 'boss', r: [21.5, -0.5, 26, 9.5], door: 'S' },
      { k: 'inv', r: [-26, -12.5, -5.5, -1], door: 'E', at: -6.75 },
    ],
    corr: [[-26, 9.5, 26, 12.5], [-5.5, -12.5, -3, 9.5]],
    spine: [[24, 11], [-4.25, 11], [-4.25, -12.5]],
    portal: [-11.25, 13.1],
    doors: [[-11.25, 12.5, 'x', 3.6], [-4.25, -12.5, 'x', 2.2]],
    back: { at: [-4.25, -12.5], path: [[-4.25, -12.85], [2.8, -12.85], [15, -20]] },
    ext: [6, -8.1, 16.6, -1.5],
    deco: [{ r: [18, -12.5, 26, -1], kind: 'tarmac' }],
    glassy: true,
  },
  // Commissariat de fortune en containers colorés autour d'une esplanade
  festival: {
    rooms: [
      { k: 'pla', r: [-22, 3.4, -8, 11.5], door: 'N' },
      { k: 'hall', r: [-7.5, 3.4, 5.5, 11.5], ent: 'S', door: 'N' },
      { k: 'pts', r: [6, 3.4, 19, 11.5], door: 'N' },
      { k: 'inv', r: [-24, -12.5, -7, -3], door: 'S' },
      { k: 'gav', r: [-6, -12, 10, -3], door: 'S' },
      { k: 'boss', r: [10.5, -12, 16, -3], door: 'S' },
    ],
    out: [[-24, -2.4, 22, 2.8]], ground: 'plaza',
    spine: [[-21, 0.2], [20, 0.2]],
    back: { at: [20, 0.2], path: [[22, 0.2], [25.6, -1], [25.6, -14], [15, -20]] },
    ext: [17, -12.5, 23.6, -1.9],
    containers: true,
  },
  // Aile du ministère : avant-corps monumental, grande galerie, ailes symétriques
  ministere: {
    rooms: [
      { k: 'hall', r: [-8, 0, 8, 12.5], ent: 'S', door: 'N' },
      { k: 'pla', r: [-26, 0, -8.5, 9], door: 'N' },
      { k: 'pts', r: [8.5, 0, 26, 9], door: 'N' },
      { k: 'inv', r: [-26, -12.5, -9, -3], door: 'S' },
      { k: 'boss', r: [-8.5, -12.5, 3, -3], door: 'S' },
      { k: 'gav', r: [4, -12, 20, -3], door: 'S' },
    ],
    corr: [[-26, -3, 26, 0]], corrColor: '#efe6d6',
    spine: [[-24, -1.5], [24, -1.5]],
    doors: [[-26, -1.5, 'z', 2.2]],
    back: { at: [-24, -1.5], path: [[-26.9, -1.5], [-26.9, -12.85], [3, -12.85], [15, -20]] },
    ext: [20.5, -12.5, 27.1, -1.9],
  },
};
// les secteurs sans fin reprennent les plans des lieux
window.PLAN_OF_STYLE = { stone: 'campagne', classic: 'ville', modern: 'metropole', glass: 'megapole', bunker: 'cite', beach: 'plage', chalet: 'neige', airport: 'aeroport', fest: 'festival', palace: 'ministere' };
