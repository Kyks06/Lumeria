import { CREATURES, CREATURE_MAP, STARTERS, baseForm } from '../config/creatures.js';
import { MOVES } from '../config/moves.js';
import { ITEMS } from '../config/items.js';
import { DIFFICULTY } from '../config/game.js';
import { TRAINER_CLASSES } from '../config/trainers.js';
import { STATS } from '../config/natures.js';
import { Creature } from '../battle/Creature.js';
import { MAPS, MAP_ORDER } from '../maps/index.js';
import { mulberry32 } from '../core/utils.js';
import { COVERAGE } from '../config/learnsets.js';

/**
 * ÉQUIPES DES DRESSEURS : équipes écrites à la main ou générées (classe + zone + niveau),
 * rival, Championne, Tour de Combat. La difficulté ajuste niveaux, potentiels et objets.
 */

/**
 * Espèces préférées de chaque classe de dresseur (formes de base), choisies dans le bestiaire selon
 * leurs types, leur forme, leur habitat et leur rareté : un Pêcheur sort des poissons, une Skieuse des
 * Lumins Glace, un Médium des Spectres… (les formes trop rares ou uniques sont exclues).
 */
const BASES = CREATURES.filter((c) => c.stage === 1 && !c.legendary && !'SLx'.includes(c.rar[0]));
const has = (c, ...t) => c.types.some((x) => t.includes(x));
const lives = (c, ...b) => c.hab.some((h) => b.includes(h.biome));
const arch = (c, ...a) => a.includes(c.arch);
const common = (c) => 'cu'.includes(c.rar[0]);
const sel = (fn) => BASES.filter(fn).map((c) => c.id);
const BIRDS = ['raptor', 'owl', 'sparrow', 'gull', 'crow', 'dove', 'heron', 'kiwi', 'penguin', 'bat', 'griffin', 'ptero'];
const FISHY = ['fish', 'shark', 'eel', 'puffer', 'ray', 'octopus', 'coral', 'crab', 'starfish', 'jelly', 'seadragon', 'serpent', 'flyfish'];
const CUTE = ['cat', 'fox', 'rabbit', 'flower', 'fairy', 'mouse', 'ram', 'dog', 'panda', 'slime', 'otter', 'seal', 'penguin'];
export const CLASS_POOLS = {
  gamin: sel((c) => c.rar[0] === 'c' && lives(c, 'prairie', 'foret')),
  fillette: sel((c) => common(c) && (arch(c, ...CUTE) || has(c, 'lumiere'))),
  campeur: sel((c) => common(c) && lives(c, 'prairie', 'foret', 'montagne', 'desert') && has(c, 'sol', 'roche', 'insecte', 'plante', 'feu')),
  pique_niqueuse: sel((c) => common(c) && has(c, 'plante', 'insecte', 'lumiere') && lives(c, 'prairie', 'foret')),
  randonneur: sel((c) => common(c) && (has(c, 'roche', 'sol') || lives(c, 'montagne'))),
  pecheur: sel((c) => common(c) && arch(c, ...FISHY)),
  nageuse: sel((c) => common(c) && has(c, 'eau') && !arch(c, ...FISHY.slice(0, 5))),
  nageur: sel((c) => common(c) && has(c, 'eau')),
  ornithologue: sel((c) => common(c) && (arch(c, ...BIRDS) || has(c, 'vent'))),
  scout: sel((c) => common(c) && has(c, 'insecte')),
  mineur: sel((c) => common(c) && lives(c, 'grotte') && has(c, 'roche', 'sol', 'metal', 'ombre')),
  karateka: sel((c) => common(c) && (arch(c, 'brute', 'bull', 'wolf', 'mantis', 'bear', 'lion', 'yak', 'mammoth') || (has(c, 'sol', 'roche') && c.base.atk >= 55))),
  sportive: sel((c) => common(c) && c.base.spe >= 55),
  cycliste: sel((c) => common(c) && has(c, 'foudre', 'metal', 'vent')),
  medium: sel((c) => common(c) && has(c, 'spectre', 'astral', 'ombre')),
  pyromane: sel((c) => common(c) && has(c, 'feu')),
  skieuse: sel((c) => common(c) && has(c, 'glace')),
  montagnard: sel((c) => common(c) && lives(c, 'montagne', 'neige')),
  archeologue: sel((c) => (has(c, 'roche', 'sol') && lives(c, 'desert', 'grotte')) || arch(c, 'crystal', 'ptero', 'sphinx', 'mammoth')),
  scientifique: sel((c) => common(c) && (has(c, 'metal', 'foudre', 'toxine') || arch(c, 'mech', 'robodog', 'slime'))),
  eleveuse: sel((c) => common(c) && arch(c, ...CUTE)),
  gentleman: sel((c) => 'ur'.includes(c.rar[0]) && arch(c, 'lion', 'deer', 'owl', 'horse', 'cat', 'griffin', 'raptor', 'wolf')),
  aristo: sel((c) => 'ur'.includes(c.rar[0]) && (has(c, 'lumiere') || arch(c, 'fairy', 'flower', 'mermaid', 'coral', 'cat'))),
  pro_m: sel((c) => 'urP'.includes(c.rar[0]) && c.base.atk >= c.base.spa),
  pro_f: sel((c) => 'urP'.includes(c.rar[0]) && c.base.spa >= c.base.atk),
  sbire: sel((c) => common(c) && has(c, 'ombre', 'toxine', 'spectre')),
  sbire_f: sel((c) => common(c) && has(c, 'ombre', 'toxine', 'spectre') && !arch(c, 'brute', 'bull')),
  tour: CREATURES.filter((c) => !c.legendary && !c.evo.length && c.rar[0] !== 'L').map((c) => c.id),
};
CLASS_POOLS.nageur ||= CLASS_POOLS.nageuse;

/** Étape de progression où chaque lignée apparaît pour la première fois (pour ne pas sortir des Lumins trop tôt). */
export const SPECIES_STAGE = {};
MAP_ORDER.forEach((id, i) => {
  const enc = MAPS[id]?.encounters || {};
  for (const table of Object.values(enc)) for (const e of table || []) {
    const b = baseForm(e[0]);
    if (SPECIES_STAGE[b] === undefined) SPECIES_STAGE[b] = i;
  }
});
for (const s of STARTERS) SPECIES_STAGE[s] = 0;
for (const c of CREATURES) if (SPECIES_STAGE[baseForm(c.id)] === undefined) SPECIES_STAGE[baseForm(c.id)] = c.legendary ? 999 : 20;

export function mapStage(mapId) {
  const parent = mapId.includes(':') ? mapId.split(':')[0] : mapId;
  const i = MAP_ORDER.indexOf(parent);
  return i < 0 ? 30 : i;
}

/** Forme évoluée correspondant au niveau (les dresseurs font évoluer leurs Lumins). */
export function evolveFor(id, level) {
  let cur = id;
  for (let guard = 0; guard < 4; guard++) {
    const sp = CREATURE_MAP[cur];
    if (!sp?.evo?.length) break;
    const e = sp.evo[0];
    const stage = baseForm(cur) === cur ? 1 : 2;
    const need = e.level || (e.friend ? 22 : e.item ? (stage === 1 ? 30 : 42) : 99);
    if (level >= need) cur = e.to; else break;
  }
  return cur;
}

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Potentiels et objets selon la difficulté et le rang du dresseur. */
function tune(c, { boss, difficulty, rnd }) {
  const d = difficulty;
  const [lo, hi] = d === 'facile' ? [0, 12] : d === 'difficile' ? (boss ? [31, 31] : [16, 31]) : (boss ? [20, 31] : [6, 22]);
  for (const s of STATS) c.iv[s] = Math.floor(lo + rnd() * (hi - lo + 1));
  if (boss && d !== 'facile') {
    const best = [...STATS].sort((a, b) => c.def.base[b] - c.def.base[a]).slice(0, 2);
    for (const s of best) c.ev[s] = d === 'difficile' ? 252 : 120;
    c.ev.hp = d === 'difficile' ? 6 : 40;
  }
  c.recalc();
  c.hp = c.maxHp;
}

/** Construit l'équipe d'un dresseur défini dans une carte. */
export function buildTrainerTeam(t, mapId, ctx) {
  const diff = ctx.difficulty || 'normal';
  const D = DIFFICULTY[diff];
  const boss = !!(t.leader || t.e4 || ['admin', 'admin_f', 'chef', 'rival', 'champion', 'conseil', 'leader'].includes(t.cls));
  const rnd = mulberry32(hash(t.id + (ctx.seedSalt || '')));
  let spec = t.team;
  if (spec === 'champion') spec = championTeam(ctx.thirdStarter);
  if (spec === 'rival') spec = rivalTeam(t.rivalStage, ctx.rivalStarter);
  if (!spec) {
    const stage = mapStage(mapId);
    let pool = (t.pool || CLASS_POOLS[t.cls] || CLASS_POOLS.campeur).filter((id) => (SPECIES_STAGE[baseForm(id)] ?? 99) <= stage + 1);
    if (!pool.length) pool = (MAPS[mapId.split(':')[0]]?.encounters?.grass || MAPS[mapId.split(':')[0]]?.encounters?.cave || [['mulotin']]).map((e) => e[0]);
    const n = t.n || 2;
    spec = [];
    for (let i = 0; i < n; i++) {
      const lvl = Math.max(2, (t.level || 5) - (n - 1 - i) + (i === n - 1 ? 0 : Math.floor(rnd() * 2) - 1));
      const sp = pool[Math.floor(rnd() * pool.length)];
      spec.push([evolveFor(sp, lvl), lvl]);
    }
  }
  const mod = D.levelMod || 0;
  return spec.map(([sp0, lvl, o = {}]) => {
    const level = Math.max(2, Math.min(100, lvl + mod));
    const sp = t.team === 'rival' && level <= 5 ? sp0 : evolveFor(CREATURE_MAP[sp0]?.id || sp0, level);
    const c = Creature.create(sp, level, { shiny: false });
    if (o.moves) {
      const types = CREATURE_MAP[sp].types;
      const ok = o.moves.filter((m) => MOVES[m] && (types.includes(MOVES[m].type) || MOVES[m].type === 'normal' || MOVES[m].cat === 'St' || types.some((x) => COVERAGE[x] === MOVES[m].type)));
      if (ok.length >= 2) c.moves = ok.map((id) => ({ id, pp: MOVES[id].pp, ppMax: MOVES[id].pp }));
    }
    if (o.item && ITEMS[o.item]) c.item = o.item;
    else if (boss && diff === 'difficile' && rnd() < 0.5) c.item = ['baie_sitrus', 'restes', 'baie_prine', 'vive_griffe'][Math.floor(rnd() * 4)];
    if (o.ability) c.ability = o.ability;
    if (o.nature) c.nature = o.nature;
    tune(c, { boss, difficulty: diff, rnd });
    c.ot = t.name;
    return c;
  });
}

/** Objets de soin utilisés par le dresseur pendant le combat. */
export function trainerItems(t, difficulty, level) {
  const boss = !!(t.leader || t.e4 || ['admin', 'admin_f', 'chef', 'rival', 'champion', 'conseil'].includes(t.cls));
  const n = (DIFFICULTY[difficulty]?.trainerItems ?? 1) * (boss ? 1 : 0) + (difficulty === 'difficile' && !boss ? 1 : 0);
  const pot = level >= 45 ? 'potion_max' : level >= 30 ? 'hyper_potion' : level >= 15 ? 'super_potion' : 'potion';
  return Array.from({ length: n }, () => pot);
}

const STARTER_LINES = {
  leafnix: ['leafnix', 'feudlius', 'drakarca'],
  pyralis: ['pyralis', 'pyroleon', 'pyrokais'],
  aquoret: ['aquoret', 'marecrine', 'oceanis'],
};
/** Le rival choisit le starter qui a l'avantage sur le vôtre. */
export function rivalStarterFor(playerStarter) {
  const p = CREATURE_MAP[playerStarter]?.id || playerStarter;
  return { leafnix: 'pyralis', pyralis: 'aquoret', aquoret: 'leafnix' }[p] || 'pyralis';
}
export function thirdStarterFor(playerStarter) {
  const p = CREATURE_MAP[playerStarter]?.id || playerStarter;
  const r = rivalStarterFor(p);
  return STARTERS.find((s) => s !== p && s !== r);
}

export function rivalTeam(stage, starter) {
  const L = STARTER_LINES[CREATURE_MAP[starter]?.id] || STARTER_LINES.pyralis;
  switch (stage) {
    case 1: return [[L[0], 5, { moves: ['bousculade', 'queue_narquoise'] }]]; // premier combat : pas encore d'attaque de type
    case 2: return [['aerion', 12], ['voltbulle', 12], [L[0], 14]];
    case 3: return [['aerilion', 20], ['voltawisp', 20], ['cristalis', 21], [L[1], 23]];
    case 4: return [['strateon', 38], ['zephelek', 37], ['cristarque', 38], ['draklion', 38], [L[2], 40]];
    default: return [['strateon', 56], ['zephelek', 56], ['cristarque', 55], ['electopus', 56], ['dracelios', 57], [L[2], 59, { item: 'baie_sitrus' }]];
  }
}

export function championTeam(third) {
  const L = STARTER_LINES[CREATURE_MAP[third]?.id] || STARTER_LINES.aquoret;
  return [['aiglarius', 60], ['braserocher', 60], ['hydraconde', 61], ['cosmosia', 61], ['draktanos', 61], [L[2], 63, { item: 'restes' }]];
}

/** Équipe aléatoire de la Tour de Combat (niveau 50), de plus en plus forte avec la série. */
export function towerTeam(streak, n = 3) {
  const tier = Math.min(4, Math.floor(streak / 7));
  const [lo, hi] = [[380, 470], [430, 500], [460, 520], [480, 560], [500, 610]][tier];
  const pool = CREATURES.filter((c) => !c.legendary && (() => { const b = Object.values(c.base).reduce((a, x) => a + x, 0); return b >= lo && b <= hi; })());
  const out = [];
  const used = new Set();
  while (out.length < n && used.size < pool.length) {
    const sp = pool[Math.floor(Math.random() * pool.length)];
    if (used.has(sp.id)) continue;
    used.add(sp.id);
    const c = Creature.create(sp.id, 50, { shiny: false });
    for (const s of STATS) c.iv[s] = 10 + Math.floor(Math.random() * 22) + tier;
    c.recalc();
    c.hp = c.maxHp;
    if (Math.random() < 0.3 + tier * 0.15) c.item = ['baie_sitrus', 'restes', 'vive_griffe', 'baie_prine', 'ceinture_pro', 'orbe_vie'][Math.floor(Math.random() * 6)];
    out.push(c);
  }
  return out;
}
