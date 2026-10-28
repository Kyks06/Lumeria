import { MOVES } from './moves.js';
import { CREATURES } from './creatures.js';

/**
 * ATTAQUES APPRISES (générées automatiquement)
 * Pour chaque espèce sans champ `learn`, on construit une liste cohérente à partir de ses types, de ses
 * statistiques (physique ou spécial), d'un type de couverture et de sa PUISSANCE : les Lumins communs
 * plafonnent à des attaques moyennes et les apprennent plus tard ; les rares, starters, pseudo-légendaires
 * et uniques accèdent aux attaques les plus puissantes. Les attaques d'œuf et la compatibilité avec les
 * Disques Techniques (DT) sont calculées de la même façon.
 */
const SIGNATURE = new Set(['eclipse_totale', 'aube_eternelle', 'colere_tellurique', 'tempete_celeste', 'maree_glaciale', 'zenith_fulgurant', 'lutte']);

/** Type de couverture : la deuxième « arme » naturelle de chaque type. */
export const COVERAGE = {
  normal: 'ombre', feu: 'sol', eau: 'glace', plante: 'sol', foudre: 'metal', glace: 'eau', roche: 'sol', sol: 'roche', vent: 'insecte',
  insecte: 'plante', toxine: 'ombre', spectre: 'ombre', metal: 'roche', dragon: 'feu', ombre: 'spectre', lumiere: 'astral', astral: 'lumiere',
};

const tier = (p) => (p <= 45 ? 1 : p <= 65 ? 2 : p <= 80 ? 3 : p <= 95 ? 4 : 5);
const hashS = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

const POOLS = {};
for (const mv of Object.values(MOVES)) {
  if (SIGNATURE.has(mv.id)) continue;
  const P = (POOLS[mv.type] ||= { P: {}, S: {}, St: [] });
  if (mv.cat === 'St') P.St.push(mv.id);
  else (P[mv.cat][tier(mv.power)] ||= []).push(mv.id);
}
const BUFFS = new Set(Object.values(MOVES).filter((m) => m.cat === 'St' && m.self && Object.values(m.self[0]).some((v) => v > 0)).map((m) => m.id));

/** Choisit une attaque d'un type, au palier voulu (ou le plus proche), variée selon la lignée. */
function pickAttack(type, t, pref, seed = '', maxT = 5) {
  const P = POOLS[type];
  if (!P) return null;
  const order = pref === 'S' ? ['S', 'P'] : ['P', 'S'];
  t = Math.min(t, maxT);
  for (const d of [0, -1, 1, -2, 2]) {
    if (t + d > maxT || t + d < 1) continue;
    for (const c of order) {
      const list = P[c][t + d];
      if (list?.length) return list[hashS(seed + type + t) % list.length];
    }
  }
  return null;
}

function pickStatus(type, kind, seed = '') {
  const list = POOLS[type]?.St || [];
  const pick = (arr) => (arr.length ? arr[hashS(seed + type + kind) % arr.length] : null);
  if (kind === 'buff') return pick(list.filter((m) => BUFFS.has(m)));
  if (kind === 'heal') return pick(list.filter((m) => MOVES[m].heal));
  if (kind === 'debuff') return pick(list.filter((m) => !BUFFS.has(m) && !MOVES[m].heal && !MOVES[m].weather && !MOVES[m].rest && !MOVES[m].protect));
  return list[0] || null;
}

/** Puissance d'une lignée : palier maximal des attaques et décalage des niveaux. */
function powerOf(sp) {
  const g = sp.rar?.[0] || 'u';
  const weak = sp.rar?.includes('f');
  const strong = sp.rar?.includes('F');
  const final = !sp.evo.length;
  if (sp.legendary || g === 'L' || g === 'P' || g === 'S' || g === 'x') return { max: 5, lag: 1 };
  if (g === 'r') return { max: final || strong ? 5 : 4, lag: 1 };
  if (g === 'u') return { max: final ? (strong ? 5 : 4) : 4, lag: 1.04 };
  return { max: weak ? (final ? 4 : 3) : (final ? 4 : 3), lag: weak ? 1.12 : 1.08 };
}

function buildLearnset(sp) {
  const [t1, t2] = sp.types;
  const b = sp.base;
  const seed = sp.line || sp.id;
  const pref = b.atk >= b.spa + 10 ? 'P' : b.spa >= b.atk + 10 ? 'S' : (b.atk >= b.spa ? 'P' : 'S');
  const cov = COVERAGE[t1] !== t2 ? COVERAGE[t1] : COVERAGE[t2 || t1];
  const second = t2 || cov;
  const { max, lag } = powerOf(sp);
  const out = [];
  const L = (lvl) => Math.max(1, Math.round(lvl * lag));
  const add = (lvl, id) => { if (id && MOVES[id] && !SIGNATURE.has(id) && !out.some(([, m]) => m === id)) out.push([lvl, id]); };

  add(1, pref === 'P' ? 'griffure' : 'bousculade');
  add(1, b.atk >= b.spa ? 'grondement' : 'queue_narquoise');
  add(L(5), pickAttack(t1, 1, pref, seed, max));
  add(L(9), pickStatus(t1, 'debuff', seed) || 'regard_noir');
  add(L(12), pickAttack(second, 1, pref, seed, max) || 'elan');
  add(L(16), pickAttack(t1, 2, pref, seed, max));
  add(L(20), pickStatus(t1, 'heal', seed) || pickStatus(t2, 'heal', seed) || pickStatus(t1, 'buff', seed) || 'acceleration');
  add(L(24), t2 ? pickAttack(t2, 2, pref, seed, max) : 'ruee');
  add(L(28), pickAttack(t1, 3, pref, seed, max));
  add(L(33), pickStatus(t1, 'buff', seed) || pickStatus(t2, 'buff', seed) || (pref === 'P' ? 'aiguisage' : 'complot'));
  add(L(37), pickAttack(second, 3, pref, seed, max));
  add(L(42), pickAttack(t1, 4, pref, seed, max));
  add(L(47), pickAttack(cov, 3, pref, seed, max));
  if (max >= 5) add(L(53), pickAttack(t1, 5, pref, seed, max));
  add(L(59), t2 ? pickAttack(t2, 4, pref, seed, max) : pickAttack(cov, 4, pref, seed, max));
  // formes évoluées : une attaque de leur nouveau type dès l'évolution
  if (sp.stage > 1 && t2) add(1, pickAttack(t2, 2, pref, seed + 'evo', max));
  return out.sort((a, b2) => a[0] - b2[0]);
}

function buildEggMoves(sp) {
  const [t1, t2] = sp.types;
  const b = sp.base;
  const pref = b.atk >= b.spa ? 'P' : 'S';
  const cov = COVERAGE[t1];
  const seed = (sp.line || sp.id) + 'egg';
  const prio = pickAttack(t1, 1, 'P', seed);
  const list = [pickAttack(cov, 3, pref, seed), prio && MOVES[prio]?.prio ? prio : 'elan', pref === 'P' ? 'aiguisage' : 'complot', pickAttack(t2 || 'normal', 2, pref, seed)];
  return [...new Set(list.filter(Boolean))].filter((m) => !SIGNATURE.has(m));
}

export const LEARNSETS = {};
export const EGG_MOVES = {};
for (const sp of CREATURES) {
  LEARNSETS[sp.id] = sp.learn ? [...sp.learn] : buildLearnset(sp);
  EGG_MOVES[sp.id] = sp.eggMoves || (sp.legendary ? [] : buildEggMoves(sp));
}

/** Un Lumin peut-il apprendre cette attaque via un Disque Technique ? */
export function canLearnTM(species, moveId) {
  const mv = MOVES[moveId];
  if (!mv || SIGNATURE.has(moveId)) return false;
  if (mv.univ) return true;
  if (species.types.includes(mv.type)) return true;
  if (mv.type === 'normal' && mv.cat !== 'St') return true;
  return mv.type === COVERAGE[species.types[0]] || (species.types[1] && mv.type === COVERAGE[species.types[1]]);
}

/** Attaques apprises exactement à un niveau donné. */
export function movesAtLevel(speciesId, level) {
  return (LEARNSETS[speciesId] || []).filter(([l]) => l === level).map(([, m]) => m);
}

/** Les 4 dernières attaques apprises jusqu'à un niveau (attaques par défaut d'un Lumin sauvage). */
export function defaultMoves(speciesId, level) {
  const learned = (LEARNSETS[speciesId] || []).filter(([l]) => l <= level).map(([, m]) => m);
  return [...new Set(learned)].slice(-4);
}
