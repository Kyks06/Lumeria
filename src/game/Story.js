/**
 * OBJECTIF EN COURS (affiché dans le HUD) selon l'avancée de l'histoire.
 */
const STEPS = [
  [(g) => !g.flag('starter'), 'Rendez-vous au laboratoire du Pr. Aubin, à l\'est de la place de Clairvent.'],
  [(g) => !g.hasBadge('feuille'), 'Suivez la Route 1 vers le nord et défiez Ilda à l\'arène de Sylvebourg.'],
  [(g) => !g.flag('museum_alarm'), 'Traversez le Bois Murmurant (Route 2, à l\'est de Sylvebourg) jusqu\'à Port-Azur.'],
  [(g) => !g.flag('entrepot_done'), 'Chassez l\'Ordre du Crépuscule de l\'entrepôt, sur les quais de Port-Azur.'],
  [(g) => !g.hasBadge('vague'), 'Défiez Marin à l\'arène de Port-Azur.'],
  [(g) => !g.hasBadge('roc'), 'Longez la Route 3, traversez la Mine et défiez Brann à Rocheval.'],
  [(g) => !g.flag('blackout'), 'Gravissez la Route 4 jusqu\'à Sablons, la ville du désert.'],
  [(g) => !g.flag('centrale_done'), 'Libérez la centrale de Sablons (au nord-est de la ville).'],
  [(g) => !g.hasBadge('eclair'), 'Défiez Volta à l\'arène de Sablons.'],
  [(g) => !g.hasBadge('brume'), 'Traversez le Désert Ocre (Route 5) et défiez Nyx à Brumevase.'],
  [(g) => !g.flag('repaire_done'), 'Infiltrez le Repaire du Crépuscule, sous le vieux moulin de Brumevase.'],
  [(g) => !g.hasBadge('givre'), 'Remontez la Route 6, traversez le Col Givré et défiez Hivane à Givrecime.'],
  [(g) => !g.hasBadge('brasier'), 'Descendez les Coulées de Cendre (Route 7) et défiez Pyra à Cendrelave.'],
  [(g) => !g.flag('sommet_done'), 'Arrêtez Vesper au Sommet de Cendrelave (sortie est de la ville) !'],
  [(g) => !g.hasBadge('zenith'), 'Gagnez Astralis par les Passerelles Célestes (Route 8) et défiez Céleste.'],
  [(g) => !g.flag('champion'), 'Franchissez la Route Victoire et triomphez de la Ligue du Zénith.'],
  [(g) => !g.flag('solarion') || !g.flag('guardians'), 'Explorez l\'Île Lointaine, le Pic Millénaire, le Temple du Vent et la Grotte Glacée.'],
  [(g) => !g.flag('zenithar'), 'Le Sanctuaire du Zénith s\'est ouvert à la Ligue…'],
  [() => true, 'Complétez le Lumidex, relevez les défis du Carnet et battez des records à la Tour de Combat !'],
];

export function objectiveText(g) {
  if (!g.data?.flags?.intro) return '';
  for (const [test, text] of STEPS) if (test(g)) return text;
  return '';
}
