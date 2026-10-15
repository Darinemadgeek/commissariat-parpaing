// Simulation d'équilibrage : un joueur automatique raisonnable joue N heures de jeu.
// Usage : node tools/sim.js [heures] [clics par seconde]
const fs = require('fs'), path = require('path'), vm = require('vm');
const HOURS = +process.argv[2] || 6, CPS = +process.argv[3] || 0;
const ctx = { window: {}, Math, Date, console, JSON, Object, Array, Number, String, setTimeout: () => 0 };
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
load('data.js'); ctx.PD = ctx.window.PD; load('game-core.js');
const GM = ctx.window.GM, G = GM.G, PD = ctx.PD, T = PD.T;
if (process.argv[4]) { G.site = +process.argv[4]; G.galons = +process.argv[4]; } // démarrer sur un commissariat donné

const log = [], tierAt = {}, siteAt = {};
let t = 0, lastLost = 0, clickAcc = 0;
const cost = id => GM.unitCost(PD.UNITS.find(u => u.id === id));
const buy = id => { const u = PD.UNITS.find(x => x.id === id); return GM.unitOn(u) && GM.buyUnit(id, 1); };
function think() {
  if (G.pending) GM.collect();
  if (!G.built.accueil && G.n.inv >= 3) GM.build('accueil');
  if (G.built.accueil && !G.built.plaintes && G.n.acc >= 2) GM.build('plaintes');
  // améliorations bon marché d'abord (moins de 25 % de la caisse)
  const ups = PD.UPGRADES.filter(u => GM.upOn(u)).map(u => [u, GM.upCost(u)]).sort((a, b) => a[1] - b[1]);
  for (const [u, c] of ups) if (c < G.money * 0.25) GM.buyUp(u.id);
  if (PD.tier(G.tier + 1).cost < G.money * 0.6) { if (GM.upTier()) tierAt[`${G.site}:${G.tier}`] = t; }
  // goulots d'étranglement
  const W = G.week, need = [];
  if (W.lost > lastLost) need.push('cells'); lastLost = W.lost;
  if (GM.has('vomi') && G.vomit > 4) need.push('clean');
  if (GM.has('pieds') && G.n.masks < G.n.pts) need.push('masks');
  if (GM.has('neige') && G.n.snow < Math.ceil(G.n.patrols / 2)) need.push('snow');
  if (GM.has('interpretes') && G.n.interp < Math.ceil(G.n.inv / 3)) need.push('interp');
  if (GM.has('vip') && G.n.press < 2) need.push('press');
  if (GM.ptsPerMin() < GM.invPerMin() * 1.1) need.push('pts');
  if (G.det.length > G.n.inv) need.push('inv');
  if (G.det.length + G.hall < G.n.inv) need.push('patrols');
  if (G.built.plaintes && G.plaQ > G.n.pla * 2) need.push('pla');
  if (G.built.accueil && G.cit > G.n.acc * 2) need.push('acc');
  if (G.det.length >= GM.capacity() * 0.9) need.push('cells');
  for (const id of need) if (cost(id) < G.money) buy(id);
  if (G.goldenIn <= 0) GM.golden();
  if (GM.canMove()) { siteAt[G.site + 1] = t; GM.move(); lastLost = 0; }
}
const DT = 0.1, END = HOURS * 3600;
let nextThink = 0, nextLog = 0, weeks = 0, starsW = [], primeShare = [], lastWeek = 1, weekEarn = 0;
while (t < END) {
  GM.step(DT); t += DT;
  if (CPS) { clickAcc += CPS * DT; while (clickAcc >= 1) { GM.tampon(); clickAcc--; } }
  if (G.week.no !== lastWeek) {
    lastWeek = G.week.no; weeks++;
    const p = G.pending; if (p) { starsW.push(p.gained); primeShare.push(p.earned ? p.prime / p.earned : 0); }
  }
  if (t >= nextThink) { think(); nextThink += 1; }
  if (t >= nextLog) { log.push([Math.round(t / 60), G.site, G.tier, Math.round(GM.rate()), G.cstars, G.objective, G.n.inv, G.n.pts, G.n.patrols, G.n.cells]); nextLog += 900; }
}
const fmtT = s => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
console.log(`Simulation ${HOURS} h, ${CPS} clic/s`);
console.log('min  site tier  €/s     ★   obj  enq  pts  pat  cel');
for (const r of log) console.log(r.map((v, i) => String(v).padStart([4, 4, 4, 9, 5, 5, 4, 4, 4, 4][i])).join(' '));
console.log('Paliers (site:palier → temps) :', Object.entries(tierAt).map(([k, v]) => `${k}→${fmtT(v)}`).join('  '));
console.log('Mutations (site → temps) :', Object.entries(siteAt).map(([k, v]) => `${k}→${fmtT(v)}`).join('  '));
const avg = a => (a.reduce((s, x) => s + x, 0) / Math.max(1, a.length));
console.log(`Semaines : ${weeks} · étoiles/semaine moy. ${avg(starsW).toFixed(2)} · prime/recettes moy. ${(avg(primeShare) * 100).toFixed(0)} %`);
