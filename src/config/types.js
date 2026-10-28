/**
 * LES 16 TYPES (Feu, Eau, Plante, Électrik, Glace, Roche, Sol, Air, Insecte, Poison, Spectre, Acier, Dragon,
 * Ténèbres, Lumière, Cosmique) ET LA TABLE DES FAIBLESSES
 * CHART[attaquant][défenseur] = 2 (super efficace) · 0.5 (peu efficace) · 0 (aucun effet).
 * Toute combinaison absente vaut 1. Pour une créature à double type, les multiplicateurs se multiplient.
 * Les attaques marquées { ground: true } (séismes, boue…) n'affectent pas le type Air.
 */
export const TYPES = {
  normal:  { id: 'normal',  name: 'Neutre',   color: '#b7b09a', hidden: true },
  feu:     { id: 'feu',     name: 'Feu',      color: '#ff6a3d', icon: '🔥' },
  eau:     { id: 'eau',     name: 'Eau',      color: '#3ba7ff' },
  plante:  { id: 'plante',  name: 'Plante',   color: '#56cc6b' },
  foudre:  { id: 'foudre',  name: 'Électrik', color: '#ffd23f' },
  glace:   { id: 'glace',   name: 'Glace',    color: '#8fe3f2' },
  roche:   { id: 'roche',   name: 'Roche',    color: '#c09060' },
  sol:     { id: 'sol',     name: 'Sol',      color: '#d8a85a' },
  vent:    { id: 'vent',    name: 'Air',      color: '#9ab8ff' },
  insecte: { id: 'insecte', name: 'Insecte',  color: '#a8c43a' },
  toxine:  { id: 'toxine',  name: 'Poison',   color: '#b25ad9' },
  spectre: { id: 'spectre', name: 'Spectre',  color: '#7a6ac8' },
  metal:   { id: 'metal',   name: 'Acier',    color: '#a9b4c2' },
  dragon:  { id: 'dragon',  name: 'Dragon',   color: '#2ec8b4' },
  ombre:   { id: 'ombre',   name: 'Ténèbres', color: '#5a4a6e' },
  lumiere: { id: 'lumiere', name: 'Lumière',  color: '#ffe48a' },
  astral:  { id: 'astral',  name: 'Cosmique', color: '#8a6cff' },
};
/** Types jouables (ceux du bestiaire ; « Neutre » ne sert qu'à quelques attaques de base). */
export const TYPE_LIST = Object.keys(TYPES).filter((t) => !TYPES[t].hidden);

/**
 * TABLE DES TYPES (attaquant → défenseur) : 2 super efficace · 0.5 peu efficace · 0 sans effet.
 */
export const CHART = {
  normal:  { roche: 0.5, metal: 0.5, spectre: 0 },
  feu:     { plante: 2, glace: 2, insecte: 2, metal: 2, feu: 0.5, eau: 0.5, roche: 0.5, dragon: 0.5 },
  eau:     { feu: 2, roche: 2, sol: 2, eau: 0.5, plante: 0.5, dragon: 0.5 },
  plante:  { eau: 2, roche: 2, sol: 2, feu: 0.5, plante: 0.5, toxine: 0.5, vent: 0.5, insecte: 0.5, dragon: 0.5, metal: 0.5 },
  foudre:  { eau: 2, vent: 2, foudre: 0.5, plante: 0.5, dragon: 0.5, sol: 0 },
  glace:   { plante: 2, sol: 2, vent: 2, dragon: 2, feu: 0.5, eau: 0.5, glace: 0.5, metal: 0.5 },
  roche:   { feu: 2, glace: 2, vent: 2, insecte: 2, sol: 0.5, metal: 0.5 },
  sol:     { feu: 2, foudre: 2, toxine: 2, roche: 2, metal: 2, plante: 0.5, insecte: 0.5, vent: 0 },
  vent:    { plante: 2, insecte: 2, foudre: 0.5, roche: 0.5, metal: 0.5 },
  insecte: { plante: 2, ombre: 2, astral: 2, feu: 0.5, vent: 0.5, toxine: 0.5, spectre: 0.5, metal: 0.5, lumiere: 0.5 },
  toxine:  { plante: 2, lumiere: 2, toxine: 0.5, sol: 0.5, roche: 0.5, spectre: 0.5, metal: 0 },
  spectre: { spectre: 2, astral: 2, ombre: 0.5, normal: 0 },
  metal:   { glace: 2, roche: 2, lumiere: 2, feu: 0.5, eau: 0.5, foudre: 0.5, metal: 0.5 },
  dragon:  { dragon: 2, metal: 0.5, lumiere: 0 },
  ombre:   { spectre: 2, astral: 2, ombre: 0.5, lumiere: 0.5, insecte: 0.5 },
  lumiere: { ombre: 2, dragon: 2, spectre: 2, feu: 0.5, toxine: 0.5, metal: 0.5 },
  astral:  { toxine: 2, dragon: 2, astral: 0.5, metal: 0.5, ombre: 0 },
};

/** Multiplicateur d'un type d'attaque contre une liste de types défenseurs. */
export function effectiveness(attackType, defTypes, move = null) {
  let m = 1;
  for (const t of defTypes) {
    if (move?.ground && t === 'vent') return 0;
    m *= CHART[attackType]?.[t] ?? 1;
  }
  return m;
}

export function effectivenessText(mult) {
  if (mult === 0) return "Ça n'a aucun effet…";
  if (mult >= 4) return "C'est extrêmement efficace !";
  if (mult > 1) return "C'est super efficace !";
  if (mult < 1) return "Ce n'est pas très efficace…";
  return null;
}

/** Faiblesses / résistances / immunités défensives d'une combinaison de types (pour l'interface). */
export function defensiveProfile(defTypes) {
  const out = { weak: [], resist: [], immune: [] };
  for (const at of TYPE_LIST) {
    const m = effectiveness(at, defTypes);
    if (m === 0) out.immune.push(at);
    else if (m > 1) out.weak.push([at, m]);
    else if (m < 1) out.resist.push([at, m]);
  }
  return out;
}
