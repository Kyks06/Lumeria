/**
 * RENCONTRES SAUVAGES PAR HABITAT
 * Chaque Lumin du bestiaire déclare ses biomes (dex.js : prairie, foret, cote, mer, lac, marais, montagne,
 * desert, neige, volcan, celeste, grotte) et éventuellement le moment (jour / nuit). Les tables des routes
 * sont construites ici à partir de ces habitats : un Lumin des glaces ne sort que dans la neige ou les grottes
 * gelées, un Lumin des abysses ne se pêche qu'en mer, etc. Les niveaux de chaque carte sont conservés et la
 * forme (de base ou évoluée) dépend du niveau de la zone.
 *
 * Pour modifier une zone : changez MAP_HABITATS ci-dessous (biomes principaux et secondaires « biome:poids »).
 */
import { CREATURES, CREATURE_MAP } from '../config/creatures.js';

export const MAP_HABITATS = {
  clairvent: { water: 'mer' },
  r1: { grass: ['prairie'], water: 'lac' },
  sylvebourg: { water: 'lac' },
  r2: { grass: ['foret', 'prairie:0.25'], water: 'lac' },
  portazur: { water: 'mer' },
  r3: { grass: ['cote', 'prairie:0.35'], water: 'mer' },
  mine: { cave: ['grotte'], water: 'lac' },
  r4: { grass: ['montagne', 'prairie:0.25'], water: 'lac' },
  sablons: { water: 'lac' },
  r5: { grass: ['desert'], water: 'lac' },
  brumevase: { water: 'marais' },
  r6: { grass: ['marais', 'foret:0.3'], water: 'marais' },
  col: { cave: ['neige', 'grotte:0.7'] },
  r7: { grass: ['volcan', 'montagne:0.2'] },
  r8: { grass: ['celeste'], water: 'lac' },
  r9: { grass: ['montagne', 'neige:0.4', 'prairie:0.2'], water: 'lac' },
  victoire: { cave: ['grotte', 'montagne:0.3'], water: 'lac' },
  ile: { grass: ['cote', 'foret:0.5', 'prairie:0.4', 'desert:0.3', 'marais:0.3'], water: 'mer' },
  grotteglace: { cave: ['neige', 'grotte:0.6'] },
  pic: { grass: ['montagne', 'neige:0.6', 'celeste:0.3'] },
  templevent: { grass: ['celeste', 'prairie:0.3'] },
};

const SWIM = new Set(['otter', 'seal', 'octopus', 'coral', 'serpent', 'shark', 'fish', 'seadragon', 'jelly', 'ray', 'mermaid', 'eel', 'puffer', 'crab', 'starfish', 'manatee', 'hippo', 'axolotl', 'frog', 'flyfish', 'slime']);
const FISH = new Set(['fish', 'shark', 'eel', 'puffer', 'ray', 'octopus', 'coral', 'crab', 'starfish', 'jelly', 'seadragon', 'serpent', 'flyfish']);
const WEIGHT = { c: 30, u: 13, r: 5, P: 2, L: 1 };
const MIN_LEVEL = { c: 0, u: 0, r: 12, P: 18, L: 30 };

const parseBiomes = (list) => (list || []).map((x) => { const [b, w] = x.split(':'); return [b, w ? parseFloat(w) : 1]; });
const BASES = CREATURES.filter((c) => c.stage === 1 && c.hab?.length && !'Sx'.includes(c.rar[0]));

/** Forme de la lignée adaptée au niveau, plus la suivante si elle apparaît dans la tranche. */
function formsFor(base, lo, hi) {
  const out = [];
  let cur = base, need = 0;
  for (let guard = 0; guard < 3; guard++) {
    const e = cur.evo?.[0];
    if (!e) break;
    const lvl = e.level || (e.friend ? 99 : e.item ? 36 : 99);
    if (lo >= lvl + 2) { cur = CREATURE_MAP[e.to]; need = lvl; continue; }
    if (e.level && hi > lvl + 1) out.push({ id: e.to, lo: Math.max(lo, lvl + 1), hi, k: 0.35 });
    break;
  }
  out.unshift({ id: cur.id, lo: Math.max(lo, need), hi, k: 1 });
  return out;
}

function scoreFor(base, method, cfg) {
  const arch = base.arch;
  let best = 0, time = null;
  const habs = base.hab;
  const consider = (biome, w) => {
    for (const h of habs) if (h.biome === biome && w > best) { best = w; time = h.time; }
  };
  if (method === 'grass' || method === 'cave') {
    const aquatic = SWIM.has(arch) && habs.some((h) => ['lac', 'mer', 'marais', 'cote'].includes(h.biome));
    if (aquatic && method === 'grass' && !['frog', 'axolotl', 'crab'].includes(arch)) return null;
    for (const [b, w] of parseBiomes(cfg[method])) consider(b, w);
  } else {
    if (!SWIM.has(arch) || (method === 'fish' && !FISH.has(arch)) || !habs.some((h) => ['lac', 'mer', 'marais', 'cote'].includes(h.biome))) return null;
    const water = cfg.water;
    consider(water, 1);
    if (water === 'mer') consider('cote', 0.6);
    if (water === 'marais') consider('lac', 0.5);
    if (water === 'lac') consider('marais', 0.4);
  }
  return best > 0 ? { w: best, time } : null;
}

const QUOTA = { grass: { c: 6, u: 5, r: 2, P: 1, L: 1 }, cave: { c: 5, u: 4, r: 2, P: 1, L: 1 }, surf: { c: 3, u: 3, r: 1, P: 1, L: 0 }, fish: { c: 3, u: 2, r: 1, P: 1, L: 0 } };
const hashS = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * Construit toutes les tables (les niveaux et les modes existants de chaque carte sont conservés).
 * Les places sont réparties par rareté ; les Lumins à l'habitat le plus restreint passent en priorité,
 * puis chaque lignée encore absente est ajoutée là où elle est la plus à sa place.
 */
export function assignEncounters(MAPS) {
  const tables = [];
  for (const def of Object.values(MAPS)) {
    const cfg = MAP_HABITATS[def.id];
    if (!cfg || !def.encounters) continue;
    const old = def.encounters;
    const range = (m) => { const t = old[m]; return t?.length ? [Math.min(...t.map((e) => e[1])), Math.max(...t.map((e) => e[2]))] : null; };
    const methods = [];
    if (cfg.grass) methods.push('grass');
    if (cfg.cave) methods.push('cave');
    if (cfg.water) methods.push('surf', 'fish');
    for (const m of methods) {
      const rg = range(m);
      if (!rg) continue;
      const [lo, hi] = rg;
      const cands = [];
      for (const b of BASES) {
        const g = b.rar[0];
        if (lo < MIN_LEVEL[g]) continue;
        const sc = scoreFor(b, m, cfg);
        if (!sc) continue;
        cands.push({ b, g, fit: sc.w, time: sc.time });
      }
      tables.push({ def, m, lo, hi, cands, picked: [] });
    }
  }
  // nombre de tables où chaque lignée peut vivre
  const reach = {};
  for (const t of tables) for (const c of t.cands) reach[c.b.id] = (reach[c.b.id] || 0) + c.fit;
  const order = (t, list) => list.sort((a, b) => (b.fit >= 1) - (a.fit >= 1) || reach[a.b.id] - reach[b.b.id] || hashS(t.def.id + a.b.id) - hashS(t.def.id + b.b.id));
  const used = {};
  for (const t of tables) {
    for (const g of ['c', 'u', 'r', 'P', 'L']) {
      const q = g === 'L' && t.lo < 45 ? 0 : QUOTA[t.m][g] || 0;
      const list = order(t, t.cands.filter((c) => c.g === g));
      for (const c of list.slice(0, q)) { t.picked.push(c); used[c.b.id] = (used[c.b.id] || 0) + 1; }
    }
  }
  // lignées encore absentes : on les place dans la table où elles s'intègrent le mieux
  for (const b of BASES) {
    if (used[b.id]) continue;
    let best = null;
    for (const t of tables) {
      const c = t.cands.find((x) => x.b.id === b.id);
      if (!c) continue;
      const score = c.fit * 10 - t.picked.length + (c.g === 'L' || c.g === 'P' ? t.lo / 4 : 0);
      if (!best || score > best.score) best = { t, c, score };
    }
    if (best) { best.t.picked.push(best.c); used[b.id] = 1; }
  }
  for (const t of tables) {
    const table = [];
    for (const c of t.picked) {
      const w0 = WEIGHT[c.g] * c.fit * (c.b.rar.includes('f') ? 1.25 : 1) * (c.b.rar.includes('F') ? 0.7 : 1);
      const lo = c.g === 'L' ? Math.max(t.lo, 50) : t.lo, hi = c.g === 'L' ? Math.max(t.hi, 55) : t.hi;
      for (const f of formsFor(c.b, lo, hi)) {
        const w = Math.max(1, Math.round(w0 * f.k));
        table.push(c.time ? [f.id, f.lo, f.hi, w, c.time] : [f.id, f.lo, f.hi, w]);
      }
    }
    table.sort((a, b) => b[3] - a[3]);
    t.def.encounters[t.m] = table;
  }
  for (const def of Object.values(MAPS)) if (MAP_HABITATS[def.id] && def.encounters) for (const m of Object.keys(def.encounters)) if (!tables.some((t) => t.def === def && t.m === m)) delete def.encounters[m];
  return used;
}

/** Où trouver chaque lignée (pour le Lumidex et les vérifications). */
export function habitatIndex(MAPS) {
  const idx = {};
  for (const def of Object.values(MAPS)) for (const [m, t] of Object.entries(def.encounters || {})) for (const e of t || []) (idx[e[0]] ||= []).push({ map: def.id, method: m, time: e[4] || null });
  return idx;
}
