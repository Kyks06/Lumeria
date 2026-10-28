/**
 * NATURES : chaque nature augmente une statistique de 10 % et en baisse une autre de 10 %.
 * Les cinq natures où up === down sont neutres.
 */
const S = ['atk', 'def', 'spa', 'spd', 'spe'];
const NAMES = [
  // ligne = stat augmentée (atk, def, spa, spd, spe) ; colonne = stat baissée
  ['Équilibré', 'Fougueux', 'Brutal', 'Téméraire', 'Pesant'],
  ['Robuste', 'Stoïque', 'Bourru', 'Paisible', 'Flegmatique'],
  ['Rusé', 'Rêveur', 'Pensif', 'Distrait', 'Studieux'],
  ['Prudent', 'Tendre', 'Sage', 'Serein', 'Contemplatif'],
  ['Vif', 'Pressé', 'Espiègle', 'Insouciant', 'Calme'],
];

export const NATURES = {};
NAMES.forEach((row, i) => row.forEach((name, j) => {
  const id = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  NATURES[id] = { id, name, up: i === j ? null : S[i], down: i === j ? null : S[j] };
}));

export const NATURE_IDS = Object.keys(NATURES);

export function natureMult(natureId, stat) {
  const n = NATURES[natureId];
  if (!n || !n.up) return 1;
  if (n.up === stat) return 1.1;
  if (n.down === stat) return 0.9;
  return 1;
}

export const STAT_LABELS = { hp: 'PV', atk: 'Attaque', def: 'Défense', spa: 'Atq. Spé.', spd: 'Déf. Spé.', spe: 'Vitesse', acc: 'Précision', eva: 'Esquive' };
export const STAT_SHORT = { hp: 'PV', atk: 'Atq', def: 'Déf', spa: 'AtqS', spd: 'DéfS', spe: 'Vit' };
export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
