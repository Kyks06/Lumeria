/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  LUMIDEX — construit à partir du bestiaire (config/dex.js)           ║
 * ╚════════════════════════════════════════════════════════════════════╝
 * Chaque lignée du bestiaire donne une à trois espèces. Ce fichier calcule pour chacune :
 *  statistiques de base (selon la rareté, le stade, les types et la forme) · talents (selon le type et la
 *  puissance) · évolutions · taux de capture · expérience · groupes d'œufs · taille · description · apparence.
 * Pour retoucher une espèce, modifiez son entrée dans dex.js ; pour forcer des valeurs, utilisez OVERRIDES.
 */
import { DEX, LEGENDS } from './dex.js';
import { lookFor } from './looks.js';

export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const hashS = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed, i) => { let x = (hashS(seed) + i * 374761393) >>> 0; x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0; x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

/* ── Puissance (total des statistiques de base) ───────────────────────── */
const BST = {
  1: { c: [405], u: [460], r: [500], P: [560], L: [590], x: [600] },
  2: { c: [290, 440], u: [315, 475], r: [340, 505], P: [330, 525], S: [320, 500] },
  3: { c: [240, 345, 450], u: [290, 400, 500], r: [300, 410, 515], S: [314, 405, 530], P: [300, 420, 600] },
};
/** Totaux des Lumins uniques (forme de base sans évolution, très puissants). */
const UNIQUE_TOTAL = { 35: 600, 85: 580, 121: 590, 142: 600, 144: 600, 156: 590, 157: 620, 160: 600, 162: 580, 170: 590, 179: 640, 180: 660 };

/* ── Profils : [PV, Atq, Déf, AtqSpé, DéfSpé, Vit] ───────────────────── */
const TP = {
  feu: [0.9, 1.05, 0.85, 1.2, 0.95, 1.1], eau: [1.1, 0.95, 1.05, 1.0, 1.05, 0.9], plante: [1.0, 0.95, 1.0, 1.1, 1.1, 0.85],
  foudre: [0.85, 0.95, 0.85, 1.15, 0.95, 1.3], glace: [1.0, 0.95, 1.0, 1.15, 1.05, 0.85], roche: [1.0, 1.15, 1.35, 0.7, 0.9, 0.65],
  sol: [1.15, 1.2, 1.1, 0.75, 0.85, 0.8], vent: [0.9, 1.05, 0.85, 0.95, 0.9, 1.3], insecte: [0.9, 1.15, 1.0, 0.8, 0.95, 1.15],
  toxine: [1.0, 0.95, 1.05, 1.0, 1.15, 0.9], spectre: [0.8, 0.9, 0.95, 1.25, 1.1, 1.05], metal: [0.95, 1.15, 1.35, 0.8, 1.0, 0.75],
  dragon: [1.05, 1.2, 0.95, 1.1, 0.95, 1.0], ombre: [0.9, 1.2, 0.85, 1.0, 0.85, 1.2], lumiere: [1.0, 0.85, 0.95, 1.15, 1.2, 0.95],
  astral: [0.95, 0.85, 0.9, 1.25, 1.1, 1.05],
};
const AP = [
  [['golem', 'rock', 'turtle', 'armadillo', 'mammoth', 'crystal', 'mech', 'treant', 'volcano'], [1.1, 1.05, 1.3, 0.85, 1.0, 0.65]],
  [['mouse', 'cat', 'fox', 'raptor', 'sparrow', 'dragonfly', 'bee', 'rabbit', 'horse', 'flyfish', 'crow', 'bat', 'wisp'], [0.9, 1.0, 0.88, 1.0, 0.95, 1.28]],
  [['brute', 'bull', 'lion', 'wolf', 'bear', 'beast', 'mantis', 'scorpion', 'shark', 'dog', 'ant', 'beetle', 'robodog'], [1.05, 1.28, 1.0, 0.8, 0.9, 1.0]],
  [['orb', 'fairy', 'ghost', 'jelly', 'moon', 'angel', 'dove', 'flower', 'coral', 'starfish', 'mermaid', 'octopus'], [0.92, 0.78, 0.95, 1.28, 1.15, 1.0]],
  [['hippo', 'yak', 'manatee', 'seal', 'panda', 'slime', 'cocoon'], [1.38, 1.0, 1.08, 0.88, 1.0, 0.7]],
];
const ARCH_PROFILE = {};
for (const [list, p] of AP) for (const a of list) ARCH_PROFILE[a] = p;

function statsFor(seed, types, arch, total) {
  const w = [1, 1, 1, 1, 1, 1];
  for (const t of types) { const p = TP[t] || TP.feu; for (let i = 0; i < 6; i++) w[i] *= Math.pow(p[i], types.length > 1 ? (t === types[0] ? 0.65 : 0.45) : 1); }
  const a = ARCH_PROFILE[arch];
  if (a) for (let i = 0; i < 6; i++) w[i] *= a[i];
  for (let i = 0; i < 6; i++) w[i] *= 0.9 + rnd(seed, i) * 0.2;
  const sum = w.reduce((x, y) => x + y, 0);
  const s = w.map((v) => Math.max(10, Math.round((total * v) / sum)));
  s[0] += total - s.reduce((x, y) => x + y, 0);
  return { hp: s[0], atk: s[1], def: s[2], spa: s[3], spd: s[4], spe: s[5] };
}

/* ── Talents ───────────────────────────────────────────────────────── */
const AB = {
  feu: { weak: 'ramassage', mid: ['corpsardent', 'torche'], pinch: 'brasier', strong: ['secheresse', 'echauffement'] },
  eau: { weak: 'regardvif', mid: ['absorbeau', 'glissade'], pinch: 'torrent', strong: ['crachin', 'regeneration'] },
  plante: { weak: 'ramassage', mid: ['chlorophylle', 'herbivore'], pinch: 'engrais', strong: ['regeneration', 'mediconature'] },
  foudre: { weak: 'regardvif', mid: ['statik', 'absorbvolt'], pinch: 'survolt', strong: ['turbo', 'technicien'] },
  glace: { weak: 'insomnie', mid: ['isograisse', 'chasseneige'], pinch: 'coeurdegivre', strong: ['alerteneige', 'fermete'] },
  roche: { weak: 'ramassage', mid: ['tetederoc', 'fermete'], pinch: 'coeurdepierre', strong: ['sablevolant', 'filtre'] },
  sol: { weak: 'ramassage', mid: ['baignesable', 'tetederoc'], pinch: 'fouisseur', strong: ['sablevolant', 'forcepure'] },
  vent: { weak: 'regardvif', mid: ['chanceux', 'regardvif'], pinch: 'tourbillon', strong: ['turbo', 'technicien'] },
  insecte: { weak: 'ramassage', mid: ['ecranpoudre', 'technicien'], pinch: 'essaim', strong: ['turbo', 'adaptabilite'] },
  toxine: { weak: 'immunite', mid: ['pointpoison', 'immunite'], pinch: 'virulence', strong: ['regeneration', 'adaptabilite'] },
  spectre: { weak: 'insomnie', mid: ['levitation', 'insomnie'], pinch: 'revenant', strong: ['pression', 'filtre'] },
  metal: { weak: 'carapacecoque', mid: ['carapacecoque', 'peaudure'], pinch: 'forgeron', strong: ['filtre', 'forcepure'] },
  dragon: { weak: 'pression', mid: ['intimidation', 'pression'], pinch: 'sangdragon', strong: ['adaptabilite', 'acharnement'] },
  ombre: { weak: 'insomnie', mid: ['insomnie', 'acharnement'], pinch: 'crepuscule', strong: ['intimidation', 'chanceux'] },
  lumiere: { weak: 'chanceux', mid: ['mediconature', 'filtre'], pinch: 'aurore', strong: ['regeneration', 'adaptabilite'] },
  astral: { weak: 'insomnie', mid: ['levitation', 'insomnie'], pinch: 'gravite', strong: ['filtre', 'technicien'] },
};
const FLOATERS = new Set(['ghost', 'wisp', 'orb', 'moon', 'jelly', 'fairy']);
const FIERCE = new Set(['lion', 'wolf', 'bull', 'beast', 'shark', 'dragon', 'griffin', 'mammoth']);

function abilitiesFor(seed, types, arch, rar) {
  const [t1, t2] = types;
  const P1 = AB[t1] || AB.feu, P2 = AB[t2] || P1;
  const r = (i, n) => Math.floor(rnd(seed + 'ab', i) * n);
  let ab, hid;
  const grade = rar[0];
  if (grade === 'S') { ab = [P1.pinch]; hid = P1.strong[0]; }
  else if (grade === 'c') { ab = [rar.includes('f') ? P1.weak : P1.mid[r(1, 2)], P2.weak]; hid = P1.mid[r(2, 2)]; }
  else if (grade === 'u') { ab = [P1.mid[r(1, 2)], r(4, 3) === 0 ? P1.pinch : P2.mid[r(2, 2)]]; hid = P1.strong[r(3, 2)]; }
  else if (grade === 'r') { ab = [P1.mid[r(1, 2)], P2.strong[r(2, 2)]]; hid = P1.strong[r(3, 2)]; }
  else { ab = [P1.strong[r(1, 2)]]; hid = P2.strong[r(2, 2)]; }
  if (FLOATERS.has(arch) && !types.includes('sol')) ab[0] = 'levitation';
  if (FIERCE.has(arch) && grade !== 'c' && !ab.includes('intimidation')) ab[ab.length > 1 ? 1 : 0] = 'intimidation';
  ab = [...new Set(ab)];
  if (ab.includes(hid)) hid = P1.strong.find((x) => !ab.includes(x)) || P2.mid.find((x) => !ab.includes(x)) || 'chanceux';
  return { ab, hid };
}

/* ── Groupes d'œufs, taille, sexe ──────────────────────────────────── */
const EGG = [
  [['fox', 'cat', 'dog', 'wolf', 'lion', 'deer', 'mouse', 'ram', 'yak', 'bull', 'horse', 'bear', 'panda', 'hippo', 'mammoth', 'armadillo', 'rabbit', 'porcupine', 'mole', 'beast', 'angel'], 'terrestre'],
  [['lizard', 'dragon', 'drake', 'wyvern', 'wyrm', 'turtle', 'ptero', 'sphinx', 'griffin', 'snake', 'cobra'], 'monstre'],
  [['raptor', 'owl', 'sparrow', 'gull', 'crow', 'dove', 'heron', 'kiwi', 'penguin', 'bat', 'phoenix'], 'vol'],
  [['otter', 'seal', 'fish', 'shark', 'flyfish', 'puffer', 'ray', 'coral', 'octopus', 'jelly', 'mermaid', 'manatee', 'eel', 'seadragon', 'serpent', 'crab', 'starfish', 'frog', 'axolotl'], 'eau'],
  [['larva', 'cocoon', 'butterfly', 'moth', 'dragonfly', 'bee', 'beetle', 'ant', 'spider', 'scorpion', 'mantis'], 'insecte'],
  [['vine', 'flower', 'mushroom', 'bulb', 'cactus', 'grape', 'pumpkin', 'treant'], 'plante'],
  [['ghost', 'wisp', 'slime', 'orb', 'moon'], 'amorphe'],
  [['fairy'], 'fee'],
  [['golem', 'rock', 'crystal', 'mech', 'volcano', 'robodog'], 'mineral'],
];
const EGG_OF = {};
for (const [list, g] of EGG) for (const a of list) EGG_OF[a] = g;
const GENDERLESS = new Set(['golem', 'rock', 'crystal', 'mech', 'orb', 'wisp', 'slime', 'moon', 'starfish', 'volcano', 'coral', 'robodog']);
const HEIGHT = {
  mouse: 0.3, sparrow: 0.3, larva: 0.3, cocoon: 0.4, fairy: 0.3, orb: 0.4, rock: 0.4, bee: 0.3, slime: 0.4, frog: 0.4, kiwi: 0.4,
  fox: 0.6, cat: 0.55, rabbit: 0.5, otter: 0.7, seal: 1.0, dog: 0.7, wolf: 1.1, lion: 1.0, deer: 1.1, horse: 1.5, bear: 1.1, panda: 1.2,
  ram: 0.9, yak: 1.6, bull: 1.5, hippo: 1.6, mammoth: 2.8, golem: 1.3, crystal: 1.0, mech: 2.0, treant: 1.9, volcano: 1.8,
  dragon: 1.4, drake: 1.2, wyvern: 2.2, wyrm: 3.0, serpent: 2.5, seadragon: 3.5, eel: 1.6, snake: 1.8, cobra: 1.8, vine: 1.0,
  raptor: 0.7, owl: 0.6, gull: 0.6, crow: 0.5, dove: 0.5, heron: 1.1, phoenix: 2.0, griffin: 1.8, angel: 2.0, sphinx: 1.8, ptero: 1.8,
  fish: 0.5, shark: 1.8, flyfish: 0.6, puffer: 0.5, ray: 1.2, manatee: 2.6, jelly: 0.8, octopus: 0.9, coral: 0.6, starfish: 0.4, mermaid: 1.4,
  ghost: 0.8, wisp: 0.5, moon: 0.8, butterfly: 0.9, moth: 0.9, dragonfly: 0.9, beetle: 0.7, ant: 0.5, spider: 0.6, scorpion: 0.7, mantis: 1.2,
  flower: 0.4, mushroom: 0.4, bulb: 0.6, cactus: 0.8, grape: 0.5, pumpkin: 0.6, turtle: 0.7, armadillo: 0.6, lizard: 0.6, mole: 0.5,
  porcupine: 0.6, axolotl: 0.4, brute: 1.6, beast: 2.2, robodog: 0.9, penguin: 0.7, bat: 0.6,
};

/* ── Descriptions des formes évoluées ───────────────────────────────── */
const TYPE_LINES = {
  feu: ['Ses flammes peuvent atteindre mille degrés quand il se met en colère.', 'Un brasier brûle dans son ventre et ne s\'éteint jamais, même sous la pluie.'],
  eau: ['Il nage plus vite qu\'un bateau et peut retenir son souffle des heures.', 'L\'eau qu\'il projette est assez puissante pour creuser la roche.'],
  plante: ['Il se nourrit de lumière. Des fleurs poussent partout où il se repose.', 'Ses feuilles dégagent un parfum apaisant qui calme les Lumins agités.'],
  foudre: ['Il accumule l\'énergie des orages et la libère en éclairs aveuglants.', 'Les jours d\'orage, il grimpe sur les hauteurs pour se recharger.'],
  glace: ['Son souffle gèle l\'air autour de lui en un instant.', 'Il vit là où le froid ne cesse jamais. La chaleur le rend somnolent.'],
  roche: ['Sa carapace minérale est plus dure que le diamant.', 'Il dort enfoui sous terre et ressemble alors à un simple rocher.'],
  sol: ['Ses pas font trembler le sol à des kilomètres à la ronde.', 'Il creuse des galeries immenses en quelques heures seulement.'],
  vent: ['Il vole si haut qu\'on le perd de vue au-dessus des nuages.', 'Le battement de ses ailes soulève de véritables bourrasques.'],
  insecte: ['Sa carapace luit au soleil. Il protège farouchement son territoire.', 'Il communique avec ses congénères grâce à de minuscules vibrations.'],
  toxine: ['Son venin est si puissant qu\'une seule goutte assomme un Lumin adulte.', 'Les marais où il vit prennent une teinte violette étrange.'],
  spectre: ['On raconte qu\'il emporte les âmes égarées dans un monde de brume.', 'Il traverse les murs et adore surprendre les voyageurs la nuit.'],
  metal: ['Son corps d\'acier ne rouille jamais. Il se polit avec du sable fin.', 'Il ressent la moindre vibration du métal à des lieues à la ronde.'],
  dragon: ['Une force ancienne coule dans ses veines. Peu de dresseurs savent le maîtriser.', 'Son rugissement résonne dans les montagnes comme le tonnerre.'],
  ombre: ['Il se fond dans l\'obscurité et ne laisse voir que ses yeux brillants.', 'Il chasse uniquement par les nuits sans lune.'],
  lumiere: ['La lumière qu\'il diffuse guérit les blessures des Lumins qui l\'entourent.', 'On dit qu\'apercevoir son éclat porte bonheur pour toute une année.'],
  astral: ['Il capte l\'énergie des étoiles. Son corps scintille comme une nuit d\'été.', 'Il serait venu sur Lumeria à bord d\'une étoile filante.'],
};
const STAGE_LINES = [
  ['Il a beaucoup grandi et devient très protecteur envers son dresseur.', 'Plus confiant qu\'avant, il défie volontiers des adversaires plus grands que lui.', 'Il s\'entraîne sans relâche pour devenir encore plus fort.'],
  ['Sa puissance est redoutée dans toute la région de Lumeria.', 'Les légendes locales parlent de lui comme d\'un gardien bienveillant.', 'Rares sont les dresseurs qui en ont vu un en pleine nature.'],
];

function parseChain(chain) {
  return chain.split('>').map((part) => {
    const [name, cond] = part.split('@');
    let evo = null;
    if (cond) {
      if (cond === 'ami') evo = { friend: true };
      else if (/^\d+n$/.test(cond)) evo = { level: parseInt(cond, 10), time: 'night' };
      else if (/^\d+j$/.test(cond)) evo = { level: parseInt(cond, 10), time: 'day' };
      else if (/^\d+$/.test(cond)) evo = { level: parseInt(cond, 10) };
      else evo = { item: cond };
    }
    return { name, evo };
  });
}
const perStage = (spec, i, n) => { const parts = spec.split(';'); return parts[Math.min(i, parts.length - 1)]; };
export function parseHabitat(h) {
  if (!h) return [];
  return h.split(',').map((x) => { const [biome, t] = x.split('!'); return { biome, time: t === 'n' ? 'night' : t === 'j' ? 'day' : null }; });
}

/* ── Construction ──────────────────────────────────────────────────── */
export const CREATURES = [];
let NUM = 0;
const OVERRIDES = {};

function buildLine(d) {
  const stages = parseChain(d.chain);
  const n = stages.length;
  const grade = d.rar[0];
  const mod = d.rar.includes('F') ? 1.06 : d.rar.includes('f') ? 0.92 : 1;
  const isBug3 = n === 3 && perStage(d.arch, 1, n) === 'cocoon';
  const table = BST[n][grade] || BST[n].u || BST[n].c;
  const lineId = d.id || slug(stages[0].name);
  const hab = parseHabitat(d.hab);
  const { ab, hid } = abilitiesFor(lineId, perStage(d.types, 0, n).split('/'), perStage(d.arch, 0, n), d.rar);
  const ids = stages.map((s, i) => (i === 0 ? lineId : slug(s.name)));
  const out = [];
  stages.forEach((s, i) => {
    const types = perStage(d.types, i, n).split('/');
    const arch = perStage(d.arch, i, n);
    let total = d.total || (n === 1 && UNIQUE_TOTAL[d.num]) || Math.round(table[i] * mod);
    if (isBug3) total = [195, 210, 400][i] + (d.rar.includes('f') ? 0 : 20);
    const base = statsFor(ids[i], types, perStage(d.arch, 0, n) === arch ? arch : arch, total);
    const isFinal = i === n - 1;
    const posK = n === 1 ? (d.legendary || grade === 'L' ? 0.52 : 0.4) : isFinal ? 0.46 : i === 0 ? 0.21 : 0.33;
    const catchRate = d.legendary ? 3 : grade === 'L' ? 5
      : grade === 'S' || grade === 'P' ? 45
      : grade === 'r' ? [75, 45, 30][i]
      : grade === 'u' ? (n === 1 ? 75 : [190, 75, 45][i])
      : (n === 1 ? 120 : [255, 120, 45][i]);
    const next = stages[i + 1];
    const evo = next ? [{ to: ids[i + 1], ...next.evo }] : [];
    const baseArch = perStage(d.arch, 0, n);
    const egg = d.legendary || grade === 'L' ? ['inconnu'] : [...new Set([EGG_OF[baseArch] || 'terrestre', types.includes('dragon') ? 'dragon' : types.includes('plante') && EGG_OF[baseArch] !== 'plante' ? 'plante' : null].filter(Boolean))];
    const desc = i === 0 ? d.desc
      : `${TYPE_LINES[types[i === n - 1 && types[1] ? 1 : 0]]?.[Math.floor(rnd(ids[i], 9) * 2)] || ''} ${STAGE_LINES[isFinal ? 1 : 0][Math.floor(rnd(ids[i], 10) * 3)]}`.trim();
    const sp = {
      num: ++NUM, dexNum: d.num, id: ids[i], name: s.name, types, base,
      ab: [...ab], hid, evo,
      catch: catchRate, exp: Math.round(total * posK), growth: d.legendary || grade === 'L' || grade === 'P' ? 'lent' : grade === 'S' || grade === 'r' ? 'parabolique' : d.rar.includes('f') ? 'rapide' : 'moyen',
      gender: d.legendary || grade === 'L' || GENDERLESS.has(baseArch) ? null : grade === 'S' || grade === 'P' ? 0.875 : baseArch === 'fairy' ? 0.25 : 0.5,
      egg, hatch: d.legendary || grade === 'L' ? 120 : grade === 'S' || grade === 'P' ? 40 : grade === 'r' ? 30 : grade === 'u' ? 20 : 15,
      height: Math.round((HEIGHT[arch] || 0.8) * (n === 1 ? 1.2 : n === 2 ? [0.7, 1.2][i] : [0.55, 1.0, 1.6][i]) * 10) / 10,
      desc, arch, color: d.color, line: lineId, stage: i + 1, stages: n, rar: d.rar, hab: i === 0 ? hab : [], legendary: !!d.legendary,
      look: lookFor({ arch, types, color: d.color, stage: i + 1, stages: n, num: d.num, legendary: d.legendary || grade === 'L' }),
      ...(OVERRIDES[ids[i]] || {}),
    };
    out.push(sp);
  });
  return out;
}

const ORDERED = [...DEX].sort((a, b) => a.num - b.num);
for (const d of [...ORDERED, ...LEGENDS]) CREATURES.push(...buildLine(d));

/** Attaques signatures des légendaires (le reste est généré par learnsets.js). */
const LEGEND_LEARN = {
  terragorn: [[1, 'avalanche'], [1, 'taille_sylvestre'], [1, 'carapace'], [1, 'colere_tellurique'], [60, 'seisme_cristal'], [70, 'marteau_racine']],
  aeroneth: [[1, 'lame_air'], [1, 'rayon_ionique'], [1, 'charge_statique'], [1, 'tempete_celeste'], [60, 'ouragan'], [70, 'fulgurance']],
  thalassyre: [[1, 'vague_lame'], [1, 'rayon_givrant'], [1, 'source_vive'], [1, 'maree_glaciale'], [60, 'maelstrom'], [70, 'blizzard']],
  nyctaris: [[1, 'sphere_ombre'], [1, 'pulsar'], [1, 'complot'], [1, 'eclipse_totale'], [65, 'pluie_cometes'], [75, 'cauchemar']],
  solarion: [[1, 'eclat_prisme'], [1, 'jet_incandescent'], [1, 'halo'], [1, 'aube_eternelle'], [65, 'brasier_solaire'], [75, 'rayon_aurore']],
  zenithar: [[1, 'rayon_ionique'], [1, 'pulsar'], [1, 'charge_statique'], [1, 'zenith_fulgurant'], [65, 'pluie_cometes'], [70, 'fulgurance']],
};
const LEGEND_STATS = {
  terragorn: [100, 125, 130, 75, 100, 70], aeroneth: [90, 90, 85, 125, 100, 110], thalassyre: [100, 85, 100, 110, 125, 80],
  nyctaris: [100, 110, 90, 150, 100, 130], solarion: [100, 120, 100, 140, 100, 120], zenithar: [96, 110, 85, 135, 90, 124],
};
for (const c of CREATURES) {
  if (LEGEND_LEARN[c.id]) { c.learn = LEGEND_LEARN[c.id]; c.ab = ['pression']; c.hid = null; c.exp = c.id === 'nyctaris' || c.id === 'solarion' ? 340 : 300; }
  if (LEGEND_STATS[c.id]) { const s = LEGEND_STATS[c.id]; c.base = { hp: s[0], atk: s[1], def: s[2], spa: s[3], spd: s[4], spe: s[5] }; }
}

export const CREATURE_MAP = Object.fromEntries(CREATURES.map((c) => [c.id, c]));
export const STARTERS = ['leafnix', 'pyralis', 'aquoret'];

/**
 * Anciens identifiants (versions précédentes du jeu) → nouvelles espèces.
 * Utilisé pour charger les anciennes sauvegardes : CREATURE_MAP['germelin'] renvoie Leafnix.
 */
export const LEGACY_IDS = {
  germelin: 'leafnix', sylvaran: 'feudlius', arbrorex: 'drakarca', cendrino: 'pyralis', pyrolion: 'pyroleon', heliorax: 'pyrokais',
  ondelin: 'aquoret', abyssor: 'marecrine', leviathorn: 'oceanis', piaflet: 'aerion', ventaplume: 'aerilion', cyclonaire: 'strateon',
  grignou: 'mulotin', ronflard: 'mulotard', larvelle: 'insectar', cocolune: 'insectoral', papillume: 'lunacrys', scaraboc: 'scarabose',
  cornegard: 'scaracorne', voltignon: 'voltbulle', fulgurix: 'voltawisp', mousseron: 'champex', champaro: 'champignard', ronronce: 'feeline',
  felinoble: 'feelynx', spectrelle: 'skipuctre', lanterlune: 'pipereux', lucifade: 'piperax', hiboulune: 'hiboulin', duclune: 'hibouleon',
  venisouffle: 'venicobra', cobrasque: 'venicobrax', fourmire: 'skronaie', fourmagma: 'skronaiel', glandouille: 'herbiquod', noiseraie: 'herbiquor',
  bulline: 'corallune', bullaria: 'corallys', carpillon: 'carpaillon', gyralame: 'carpeclat', pincrabe: 'crabulle', krabastion: 'crabrasque',
  goelix: 'goelux', albatrombe: 'goelarge', meduvolt: 'elerocto', medulgor: 'electopus', coquibou: 'hydrolle', carapalme: 'hydrollon',
  coralys: 'sirenote', rocaillon: 'gravillon', bastionyx: 'geobastion', galetron: 'boulix', galetonne: 'boulixor', chauvelin: 'chauvelin',
  vampyrix: 'chauvampire', boulonix: 'metalisk', mecarion: 'volriquor', cristalis: 'cristalis', prismalith: 'cristarque', taupinox: 'taupipeur',
  excavor: 'taupitrepan', brisolet: 'colomage', tornadis: 'colomagus', cabriroc: 'taurulithe', bouquetor: 'taurocolosse', aquilame: 'aceraptor',
  aquilacier: 'aceraptor', cactardent: 'cactupin', cactoros: 'cactorve', sablard: 'draktion', sablaurus: 'draktor', desertor: 'draktanos',
  scorpiaride: 'venomoray', scorpiroi: 'venomorax', fennevolt: 'voltgat', fennolux: 'voltigrel', mimoplasme: 'gloupy', marecroa: 'grenouflet',
  bourbaroa: 'grenoufle', toxilime: 'viiraule', toxilith: 'viiraulis', pleurolle: 'spectrouille', saulombre: 'spectrouillard', libelame: 'libellux',
  odonastre: 'libellumen', floconnet: 'flocounet', givrelle: 'flocoura', morsglace: 'glenuos', morsabyss: 'glenuar', morsatlas: 'glenuar',
  pingrelot: 'glacpille', empereglace: 'glacpilleur', neigeot: 'gelusros', yetigrond: 'gelurse', givrenard: 'grivelynx', blizzenard: 'grivelion',
  tisonnet: 'pyroli', salamandrex: 'salamandrix', magmolle: 'braseroc', volcarapace: 'braserocher', fumerolle: 'flammout', brasaigle: 'brasillor',
  charbonnet: 'galopin', brasipoing: 'galopyre', halorin: 'feovire', seraphyne: 'feoviris', psylou: 'cosmixie', psymage: 'cosmovore',
  arcaneon: 'cosmosia', cometin: 'lunetrit', meteorion: 'lunetris', robotin: 'mecarach', androidum: 'mecarachnis', lumifee: 'femiree',
  lumirelle: 'femireelle', lumicorne: 'auravilis', boxeroc: 'rochbras', titanpoing: 'rochbrutus', colossard: 'teranoth', karaplume: 'aiglarion',
  martiale: 'aiglarius', drakonet: 'drakonet', drakor: 'drakoreal', astradrake: 'dracelios', sabrelame: 'blindacier', gresilon: 'eclimect',
  electrapode: 'eclimectra',
};
for (const [old, now] of Object.entries(LEGACY_IDS)) if (!CREATURE_MAP[old] && CREATURE_MAP[now]) Object.defineProperty(CREATURE_MAP, old, { value: CREATURE_MAP[now], enumerable: false });

/** Espèce de base d'une lignée (pour l'élevage). */
export const PRE_EVO = {};
for (const c of CREATURES) for (const e of c.evo) PRE_EVO[e.to] = c.id;
export function baseForm(id) {
  let cur = CREATURE_MAP[id]?.id || id;
  while (PRE_EVO[cur]) cur = PRE_EVO[cur];
  return cur;
}
