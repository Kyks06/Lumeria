/**
 * APPARENCE DES LUMINS (pixel art procédural, voir pixel/creatureArt.js)
 * lookFor({ arch, types, color, stage, stages, num, legendary }) → look
 *  arch   forme de base (fox, cat, golem, butterfly…) · types → attributs animés (flammes, feuilles, cristaux…)
 *  stage  1, 2 ou 3 : la créature grandit, gagne des accessoires, un regard plus affirmé.
 * Pour retoucher une espèce précise, ajoutez une entrée dans LOOK_PATCH (numéro du Lumidex → options).
 */
import { TYPES } from './types.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex([r, g, b]) { return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
export function mix(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v + (B[i] - v) * t)); }
export function shade(c, k) { return k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k); }
function hsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}
/** Couleur plus saturée et légèrement plus sombre (formes évoluées). */
function deepen(c, k) { const [h, s, l] = hsl(c); return fromHsl(h, clamp(s + k * 0.12, 0, 1), clamp(l - k * 0.07, 0.08, 0.92)); }
const hashN = (n, salt = 0) => { let x = (n * 2654435761 + salt * 40503) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822507) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };

/* ── Gabarits par forme ─────────────────────────────────────────────── */
const A = {
  fox:       { plan: 'quad', ears: 'fox', tail: 'fluffy', snout: 'fox' },
  cat:       { plan: 'quad', ears: 'cat', tail: 'thin', snout: 'muzzle' },
  dog:       { plan: 'quad', ears: 'round', tail: 'fluffy', snout: 'dog', bulk: 1.05 },
  wolf:      { plan: 'quad', ears: 'fox', tail: 'fluffy', snout: 'long', sharp: true, legs: 1.1 },
  lion:      { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', mane: 2, bulk: 1.08 },
  deer:      { plan: 'quad', ears: 'long', tail: 'fluffy', snout: 'dog', legs: 1.35, antlers: 2 },
  mouse:     { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', headK: 1.15, bulk: 0.85, legs: 0.8 },
  ram:       { plan: 'quad', ears: 'round', tail: 'fluffy', snout: 'muzzle', bulk: 1.12, horns: 2, wool: true },
  yak:       { plan: 'quad', ears: 'round', tail: 'fluffy', snout: 'muzzle', bulk: 1.3, horns: 1, mane: 1, legs: 0.9 },
  bull:      { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', bulk: 1.25, horns: 1, sharp: true },
  horse:     { plan: 'quad', ears: 'fox', tail: 'fluffy', snout: 'dog', legs: 1.45, mane: 1 },
  bear:      { plan: 'biped', ears: 'round', tail: 'none', snout: 'muzzle', bulk: 1.15 },
  panda:     { plan: 'biped', ears: 'round', tail: 'none', snout: 'muzzle', bulk: 1.12, pattern: 'mask' },
  otter:     { plan: 'biped', ears: 'round', tail: 'long', snout: 'muzzle', bulk: 0.95 },
  seal:      { plan: 'biped', ears: 'none', tail: 'fin', snout: 'muzzle', bulk: 1.1, headK: 1.05 },
  hippo:     { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', bulk: 1.4, legs: 0.75, headK: 1.1 },
  mammoth:   { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', bulk: 1.45, legs: 1.0, horns: 1, mane: 1 },
  armadillo: { plan: 'quad', ears: 'round', tail: 'thin', snout: 'dog', legs: 0.7, shell: 1, pattern: 'bands' },
  turtle:    { plan: 'quad', ears: 'none', tail: 'thin', snout: 'muzzle', legs: 0.7, shell: 1, bulk: 1.05 },
  lizard:    { plan: 'quad', ears: 'none', tail: 'long', snout: 'long', legs: 0.7, headK: 0.92, spikes: 1, bulk: 0.95 },
  mole:      { plan: 'quad', ears: 'none', tail: 'thin', snout: 'long', legs: 0.6, bulk: 1.05, headK: 1.05 },
  rabbit:    { plan: 'quad', ears: 'long', tail: 'fluffy', snout: 'muzzle', headK: 1.15, bulk: 0.9 },
  porcupine: { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', spikes: 1, bulk: 1.05, legs: 0.75 },
  axolotl:   { plan: 'quad', ears: 'fin', tail: 'fin', snout: 'muzzle', legs: 0.6, headK: 1.15 },
  beast:     { plan: 'quad', ears: 'horn', tail: 'spade', snout: 'long', bulk: 1.2, sharp: true, glowEyes: true },
  robodog:   { plan: 'quad', ears: 'fox', tail: 'thin', snout: 'dog', plates: 1, gears: 1 },
  griffin:   { plan: 'quad', ears: 'feather', tail: 'thin', snout: 'beak', wings: 1, legs: 1.15 },
  angel:     { plan: 'quad', ears: 'round', tail: 'thin', snout: 'muzzle', wings: 1, halo: 1, mane: 1 },
  sphinx:    { plan: 'quad', ears: 'cat', tail: 'thin', snout: 'muzzle', wings: 1, crown: 1, legs: 1.1 },
  frog:      { plan: 'biped', ears: 'round', tail: 'none', snout: 'none', bulk: 1.1, headK: 1.1 },
  brute:     { plan: 'golem', bulk: 1.05, sharp: true },
  mermaid:   { plan: 'biped', ears: 'fin', tail: 'fin', snout: 'none', bulk: 0.9, bubbles: 1 },
  bat:       { plan: 'biped', ears: 'cat', tail: 'none', snout: 'none', wings: 0, bulk: 0.85, headK: 1.1 },
  penguin:   { plan: 'biped', ears: 'none', tail: 'none', snout: 'beak', bulk: 1.05, headK: 1.05 },
  kiwi:      { plan: 'bird', ears: 'none', bulk: 1.15 },
  raptor:    { plan: 'bird', ears: 'feather', sharp: true },
  owl:       { plan: 'bird', ears: 'feather', headK: 1.15, bulk: 1.05 },
  sparrow:   { plan: 'bird', ears: 'none', headK: 1.05 },
  gull:      { plan: 'bird', ears: 'none' },
  crow:      { plan: 'bird', ears: 'feather', sharp: true },
  dove:      { plan: 'bird', ears: 'feather' },
  heron:     { plan: 'bird', ears: 'feather' },
  phoenix:   { plan: 'bird', ears: 'feather', bigwings: true },
  ptero:     { plan: 'dragon', ears: 'horn', snout: 'long', wings: 0 },
  dragon:    { plan: 'dragon', ears: 'horn' },
  drake:     { plan: 'dragon', ears: 'horn', bulk: 1.05 },
  wyvern:    { plan: 'dragon', ears: 'horn', wings: 0 },
  wyrm:      { plan: 'serpent', ears: 'horn', snout: 'long' },
  seadragon: { plan: 'serpent', ears: 'fin', snout: 'long', crest: 1 },
  serpent:   { plan: 'serpent', ears: 'fin', snout: 'muzzle' },
  snake:     { plan: 'serpent', ears: 'none', snout: 'muzzle' },
  cobra:     { plan: 'serpent', ears: 'none', snout: 'muzzle', hood: true, pattern: 'bands' },
  eel:       { plan: 'serpent', ears: 'fin', snout: 'muzzle', tall: 0.8 },
  vine:      { plan: 'serpent', ears: 'sprout', snout: 'none', leaves: 1 },
  fish:      { plan: 'fish' },
  shark:     { plan: 'fish', bulk: 1.1, sharp: true },
  flyfish:   { plan: 'fish', wings: 0 },
  puffer:    { plan: 'fish', bulk: 1.15, spikes: 1 },
  ray:       { plan: 'fish', bulk: 1.05 },
  manatee:   { plan: 'fish', bulk: 1.3 },
  crab:      { plan: 'insect', variant: 'crab', ears: 'none' },
  larva:     { plan: 'insect', ears: 'antenna', pattern: 'bands', bulk: 1.1 },
  cocoon:    { plan: 'pod' },
  butterfly: { plan: 'insect', ears: 'antenna', bugwings: true },
  moth:      { plan: 'insect', ears: 'feather', bugwings: true },
  dragonfly: { plan: 'insect', ears: 'none', bugwings: true },
  bee:       { plan: 'insect', ears: 'antenna', bugwings: true, pattern: 'bands' },
  beetle:    { plan: 'insect', ears: 'antenna', horns: 1, mandibles: true, bulk: 1.1 },
  ant:       { plan: 'insect', ears: 'antenna', mandibles: true },
  spider:    { plan: 'insect', variant: 'spider', ears: 'none' },
  scorpion:  { plan: 'insect', variant: 'scorpion', ears: 'none' },
  mantis:    { plan: 'insect', variant: 'mantis', ears: 'antenna', sharp: true },
  ghost:     { plan: 'float', ghost: true, glowEyes: true },
  wisp:      { plan: 'float', ghost: true },
  fairy:     { plan: 'float', bugwings: true, ears: 'long' },
  orb:       { plan: 'float', ears: 'none' },
  moon:      { plan: 'float', ears: 'none', halo: 1, stars: 1 },
  jelly:     { plan: 'float', ears: 'none', jelly: true, tentacles: true },
  octopus:   { plan: 'float', ears: 'none', tentacles: true },
  starfish:  { plan: 'star' },
  slime:     { plan: 'blob' },
  grape:     { plan: 'grape' },
  pumpkin:   { plan: 'blob', pattern: 'bands', leaves: 1 },
  golem:     { plan: 'golem' },
  rock:      { plan: 'golem', round: true, bulk: 0.95 },
  crystal:   { plan: 'golem', crystals: 1 },
  treant:    { plan: 'golem', leaves: 1, flower: 1 },
  mech:      { plan: 'golem', gears: 1, plates: 1, glowEyes: true },
  volcano:   { plan: 'golem', bulk: 1.15 },
  flower:    { plan: 'plant' },
  bulb:      { plan: 'plant', cap: true, leaves: 1 },
  mushroom:  { plan: 'plant', cap: true },
  cactus:    { plan: 'cactus' },
  coral:     { plan: 'plant', cap: false },
  kiwi2:     { plan: 'bird' },
};

/* ── Attributs de type (stade où ils apparaissent) ──────────────────── */
const ACC = {
  feu: '#ffc23a', eau: '#7fe3ff', plante: '#2f9e44', foudre: '#3a2a10', glace: '#bff6ff', roche: '#d8c8a8', sol: '#8a5a2a',
  vent: '#ffffff', insecte: '#3a8a2a', toxine: '#6a2aa0', spectre: '#c8a8ff', metal: '#5a6474', dragon: '#1a6a7a',
  ombre: '#c8304a', lumiere: '#fff0a0', astral: '#c8a8ff', normal: '#d8c8b0',
};
const EYE = { ombre: '#ff3a3a', spectre: '#ff5aa8', astral: '#ffe48a', dragon: '#ffd23f', metal: '#5ad0ff', toxine: '#ffe66a', lumiere: '#7a2a8a' };
const RIM = { ombre: '#a84aff', spectre: '#c8a8ff', lumiere: '#fff6c0', astral: '#c8a8ff', metal: '#e8f4ff', glace: '#e8fbff', feu: '#ffb060' };

function addTypeFeatures(L, t, st, primary, ctx) {
  const ex = L.extras;
  const tailFree = L.tail === 'none' || L.tail === 'fluffy' || L.tail === 'thin' || L.tail === 'long';
  const hasHead = L.plan === 'quad' || L.plan === 'biped' || L.plan === 'dragon' || L.plan === 'float' || L.plan === 'bird';
  const T = L.T;
  switch (t) {
    case 'feu':
      T.flameColor = ctx.types.includes('spectre') ? 'violet' : ctx.types.includes('ombre') ? 'bleu' : ctx.types.includes('dragon') && !primary ? 'bleu' : 'feu';
      if (tailFree && L.tail !== 'none' && (L.plan === 'quad' || L.plan === 'biped' || L.plan === 'dragon')) L.tail = 'flame';
      if (primary) {
        if (st >= 2 && hasHead) ex.push(L.plan === 'quad' ? 'flamemane' : 'headflame');
        else if (L.tail !== 'flame' && hasHead) ex.push('headflame');
        if (L.plan === 'golem' || L.plan === 'blob') ex.push('headflame');
      } else if (st >= 2 && hasHead && !ex.includes('flamemane')) ex.push('headflame');
      if (L.plan === 'insect') L.tail = 'flame';
      L.rim = L.rim || (st >= 3 ? RIM.feu : null);
      break;
    case 'eau':
      if (L.plan === 'quad' || L.plan === 'biped') { if (L.ears === 'round' || L.ears === 'none') L.ears = 'fin'; if (L.tail === 'thin' || L.tail === 'fluffy') L.tail = 'fin'; }
      if (primary ? st <= 2 : st >= 2) ex.push('bubbles');
      if (primary && st >= 3 && hasHead) ex.push('crest');
      if (!L.pattern && primary) { L.pattern = 'gradient'; }
      break;
    case 'plante':
      T.leaf = mix(ctx.body, '#3fae3a', 0.5);
      if (L.plan === 'quad' && st === 1 && (L.ears === 'round' || L.ears === 'none')) L.ears = 'sprout';
      if (L.tail === 'fluffy' || L.tail === 'thin') L.tail = 'leaf';
      if ((st >= 2 || !primary || L.plan === 'golem' || L.plan === 'serpent') && !['blob', 'cactus', 'grape', 'pod'].includes(L.plan)) ex.push('leaves');
      if (st >= 3 && hasHead && L.plan !== 'cactus') ex.push('flower');
      T.petal = ctx.accent2 || '#ff8ac0';
      break;
    case 'foudre':
      if (tailFree && L.plan !== 'bird' && L.plan !== 'insect') L.tail = 'bolt';
      if (L.plan === 'quad' || L.plan === 'biped') L.cheek = '#ffd23f';
      if (L.plan === 'float' || L.plan === 'blob' || L.plan === 'golem' || L.plan === 'fish') ex.push('orbs'), T.orb = '#fff07a';
      if (st >= 3 && hasHead) ex.push('crest');
      break;
    case 'glace':
      T.crystal = '#a8eaff';
      if (tailFree && (L.plan === 'quad') && L.tail !== 'none') L.tail = 'crystal';
      if (st >= 2 || !primary || L.plan === 'golem' || L.plan === 'float') ex.push('crystals');
      L.rim = L.rim || RIM.glace;
      break;
    case 'roche':
      T.crystal = ctx.types.includes('lumiere') ? '#e8c8ff' : '#ffb547';
      if (L.plan === 'golem') { if (st >= 2) ex.push('crystals'); }
      else if (st >= 2 || !primary) ex.push(L.plan === 'quad' ? 'spikes' : 'plates');
      T.plate = '#b8a890';
      if (!L.pattern && primary) L.pattern = 'cracks';
      break;
    case 'sol':
      if (!L.pattern && primary) L.pattern = L.plan === 'quad' ? 'bands' : 'spots';
      if (st >= 2 && L.plan !== 'golem' && L.plan !== 'insect') ex.push('plates');
      T.plate = mix(ctx.body, '#8a6a4a', 0.5);
      break;
    case 'vent':
      if (L.plan === 'quad' || L.plan === 'biped' || L.plan === 'float') { if (st >= 2 || !primary) ex.push('wings'); if (L.ears === 'round') L.ears = 'feather'; }
      if (L.plan === 'bird' && st >= 3) ex.push('bigwings');
      if (L.plan === 'bird' && st >= 2) ex.push('crest');
      T.wing = T.wing || mix(ctx.body, '#ffffff', 0.35);
      break;
    case 'insecte':
      if (L.plan !== 'insect') { if (L.ears === 'none' || L.ears === 'round') L.ears = 'antenna'; if (st >= 2) ex.push('bugwings'); }
      T.wing = T.wing || '#d8f8ff';
      T.wingGlow = st >= 3;
      break;
    case 'toxine':
      T.drip = ctx.types.includes('eau') ? '#a868ff' : '#b25ad9';
      ex.push('drips');
      if (!L.pattern && !['blob', 'pod', 'grape', 'star'].includes(L.plan)) { L.pattern = 'spots'; L.pcolor = ctx.types.includes('plante') ? '#b25ad9' : shade(ctx.body, 0.3); }
      if (st >= 2) L.glowEyes = true;
      break;
    case 'spectre':
      T.ghost = true;
      if (L.plan !== 'float' && tailFree && L.tail !== 'none') L.tail = 'wisp';
      L.glowEyes = true;
      L.rim = RIM.spectre;
      T.glowEdge = true;
      break;
    case 'metal':
      T.plate = '#c8d0dc';
      if (L.plan !== 'golem' || st >= 2) ex.push(st >= 2 ? 'plates' : 'gears');
      L.rim = L.rim || RIM.metal;
      if (primary) L.glowEyes = L.glowEyes || st >= 2;
      break;
    case 'dragon':
      if (L.plan !== 'dragon') { if (st >= 2 || !primary) ex.push('horns'); if (st >= 3 && (L.plan === 'quad' || L.plan === 'serpent')) ex.push('wings'); }
      T.horn = '#f0e6d0';
      T.wing = T.wing || mix(ctx.body, '#1a6a7a', 0.25);
      if (st >= 2) L.glowEyes = true;
      if (st >= 3) L.sharp = true;
      break;
    case 'ombre':
      L.eye = EYE.ombre;
      L.glowEyes = true;
      L.rim = L.rim || RIM.ombre;
      if (tailFree && L.tail === 'thin') L.tail = 'spade';
      if (st >= 2 || !primary) L.sharp = true;
      if (!L.pattern && primary && L.plan === 'quad') L.pattern = 'mask';
      break;
    case 'lumiere':
      L.rim = RIM.lumiere;
      if (st >= 2 || !primary || L.plan === 'float') ex.push('halo');
      T.wing = T.wing || '#fff0b0';
      T.wingGlow = true;
      T.heartGlow = true;
      if (L.plan === 'float' && st >= 2) ex.push('stars'), T.starColor = '#fff6c0';
      break;
    case 'astral':
      L.pattern = L.pattern || 'stars';
      L.pcolor = L.pcolor || '#c8a8ff';
      T.starColor = '#fff0a0';
      T.orb = '#c8a8ff';
      if (tailFree && L.tail !== 'none' && (L.plan === 'quad' || L.plan === 'biped')) L.tail = 'star';
      if (st >= 2 || !primary) ex.push(st >= 3 ? 'orbs' : 'stars');
      L.glowEyes = L.glowEyes || st >= 2;
      L.rim = L.rim || RIM.astral;
      break;
    default: break;
  }
}

/** Retouches par numéro (pour les espèces « vedettes »). */
export const LOOK_PATCH = {
  1: [{ socks: '#5a2a14' }, { pattern: 'stripes', pcolor: '#8a2a10' }, { extras: ['horns'], pattern: 'stripes', pcolor: '#5a1a08', snout: 'long' }],
  2: [{}, { extras: ['scarf'], T: { scarf: '#ffffff' } }, { extras: ['halo'] }],
  3: [{ ears: 'sprout' }, { extras: ['antlers'] }, { extras: ['antlers', 'flower'] }],
  10: [{ mane: 0 }, { extras: ['mane'] }, { extras: ['mane', 'flamemane'] }],
  57: [{ body: '#f2f2ea', belly: '#ffffff', pattern: 'mask', pcolor: '#2e4a2e', accent: '#3a6a34', ears: 'round' }, { body: '#ecece2', belly: '#ffffff', pattern: 'mask', pcolor: '#24402a', accent: '#3a6a34' }],
  35: [{ extras: ['antlers', 'stars', 'halo'], T: { horn: '#c8b8ff' }, rim: '#e0d8ff' }],
  142: [{ extras: ['headflame', 'halo'], T: { wing: '#ffcf6a', wingGlow: true } }],
  144: [{ extras: ['flamemane', 'horns', 'bigwings'], T: { wing: '#c83a1a' } }],
  157: [{ extras: ['stars', 'bigwings', 'horns'], T: { wing: '#6a5ad8', wingGlow: true } }],
  179: [{ extras: ['bigwings', 'crown', 'orbs'], T: { wing: '#3a2a9a', wingGlow: true } }],
  180: [{ extras: ['horns', 'orbs'], eye: '#ff3aff', glowEyes: true }],
};

/**
 * Construit l'apparence d'un stade.
 * @param {{arch:string, types:string[], color:string, stage:number, stages:number, num:number, legendary?:boolean}} s
 */
export function lookFor(s) {
  const base = A[s.arch] || A.fox;
  const st = s.stage, n = s.stages;
  const k = st - 1; // 0, 1, 2
  const body = deepen(s.color, k * 0.8);
  const t1 = s.types[0], t2 = s.types[1];
  const accent2 = t2 ? TYPES[t2]?.color : null;
  const L = {
    plan: base.plan, body,
    belly: mix(body, '#ffffff', ['lumiere', 'glace', 'vent'].includes(t1) ? 0.75 : 0.58),
    accent: accent2 && !['normal'].includes(t2) ? mix(accent2, body, 0.15) : (ACC[t1] || shade(body, 0.3)),
    eye: EYE[t1] && st >= 2 ? EYE[t1] : '#2a1a14',
    ears: base.ears || 'none', tail: base.tail || 'none', snout: base.snout, pattern: base.pattern || null, pcolor: shade(body, -0.32),
    bulk: (base.bulk || 1) * (1 + k * 0.04), legs: base.legs, headK: (base.headK || 1) * (n === 1 ? 1 : [1.12, 1.0, 0.92][k]),
    sharp: base.sharp ? st >= 2 || n === 1 : st >= 3, glowEyes: !!base.glowEyes && st >= 2, mandibles: base.mandibles, hood: base.hood, tall: base.tall, cap: base.cap,
    variant: base.variant, round: base.round, tentacles: base.tentacles, wool: base.wool ? mix(s.color, '#fff8ec', 0.72) : null,
    stage: n === 1 ? (s.legendary ? 3 : 2) : st,
    size: n === 1 ? (s.legendary ? 1.16 : 1.04) : n === 2 ? [0.84, 1.08][k] : [0.78, 0.96, 1.14][k],
    extras: [], T: {},
  };
  if (base.ghost) L.T.ghost = true;
  if (base.jelly) L.T.jelly = true;
  if (base.plan === 'plant' && !base.cap) L.T.petal = s.color;
  // accessoires de forme (selon le stade)
  const want = (lvl) => lvl && st >= lvl;
  if (want(base.mane)) L.extras.push('mane');
  if (want(base.antlers)) L.extras.push('antlers');
  if (base.horns && st >= base.horns) L.extras.push('horns');
  if (base.shell) L.extras.push('shell'), L.T.shell = mix(body, '#8a6a4a', 0.4);
  if (base.spikes) L.extras.push('spikes');
  if (base.plates) L.extras.push('plates');
  if (base.gears) L.extras.push('gears');
  if (base.crystals) L.extras.push('crystals'), L.T.crystal = mix(s.color, '#ffffff', 0.35);
  if (base.leaves) L.extras.push('leaves');
  if (base.flower && st >= 2) L.extras.push('flower');
  if (base.halo) L.extras.push('halo');
  if (base.crown && st >= 1) L.extras.push('crown');
  if (base.stars) L.extras.push('stars');
  if (base.crest) L.extras.push('crest');
  if (base.bubbles) L.extras.push('bubbles');
  if (base.bugwings) L.extras.push('bugwings'), L.T.wing = mix(s.color, '#ffffff', 0.55), L.T.wingGlow = st >= 2;
  if (base.wings !== undefined && (st >= 2 || n === 1 || base.wings === 0)) L.extras.push(st >= 3 || (n === 1 && s.legendary) ? 'bigwings' : 'wings');
  if (base.bigwings) L.extras.push('bigwings');
  // attributs de type
  const ctx = { types: s.types, body, accent2 };
  addTypeFeatures(L, t1, st, true, ctx);
  if (t2) addTypeFeatures(L, t2, st, false, ctx);
  // motif aléatoire mais stable pour les formes sans motif
  if (!L.pattern && hashN(s.num, 3) < 0.35 && ['quad', 'biped', 'dragon'].includes(L.plan)) L.pattern = hashN(s.num, 4) < 0.5 ? 'tips' : 'spots';
  if (L.pattern === 'spots' && !L.pcolor) L.pcolor = shade(body, 0.25);
  if (s.legendary || n === 1) { L.glowEyes = L.glowEyes || ['astral', 'spectre', 'ombre', 'dragon', 'lumiere', 'feu'].includes(t1); L.rim = L.rim || RIM[t1] || '#ffffff'; }
  if (st >= 3 && !L.rim) L.rim = mix(body, '#ffffff', 0.6);
  // retouche spécifique
  const patch = LOOK_PATCH[s.num]?.[Math.min(k, (LOOK_PATCH[s.num]?.length || 1) - 1)];
  if (patch) {
    const { extras: pe, T: pT, mane, ...rest } = patch;
    Object.assign(L, rest);
    if (mane === 0) L.extras = L.extras.filter((e) => e !== 'mane');
    if (pe) for (const e of pe) if (!L.extras.includes(e)) L.extras.push(e);
    if (pT) Object.assign(L.T, pT);
  }
  // évite les doublons et les combinaisons trop chargées
  L.extras = [...new Set(L.extras)];
  if (L.extras.includes('flamemane') && L.extras.includes('headflame')) L.extras = L.extras.filter((e) => e !== 'headflame');
  if (L.extras.includes('bigwings')) L.extras = L.extras.filter((e) => e !== 'wings');
  if (L.extras.includes('mane') && L.extras.includes('flamemane')) L.extras = L.extras.filter((e) => e !== 'mane');
  const MAX = 2 + st;
  if (L.extras.length > MAX) L.extras = L.extras.slice(0, MAX);
  return L;
}
