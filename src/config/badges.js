/**
 * BADGES D'ARÈNE : ordre, Champion, type et capacité de terrain débloquée.
 */
export const BADGES = [
  { id: 'feuille', name: 'Badge Feuille', leader: 'Ilda', town: 'Sylvebourg', type: 'insecte', color: '#a8c43a', field: 'cut', fieldName: 'Coupe' },
  { id: 'vague', name: 'Badge Vague', leader: 'Marin', town: 'Port-Azur', type: 'eau', color: '#3ba7ff', field: 'smash', fieldName: 'Éclate-Roc' },
  { id: 'roc', name: 'Badge Roc', leader: 'Brann', town: 'Rocheval', type: 'roche', color: '#c09060', field: 'strength', fieldName: 'Force' },
  { id: 'eclair', name: 'Badge Éclair', leader: 'Volta', town: 'Sablons', type: 'foudre', color: '#ffd23f', field: 'surf', fieldName: 'Surf' },
  { id: 'brume', name: 'Badge Brume', leader: 'Nyx', town: 'Brumevase', type: 'ombre', color: '#6c5a8e', field: 'flash', fieldName: 'Lanterne' },
  { id: 'givre', name: 'Badge Givre', leader: 'Hivane', town: 'Givrecime', type: 'glace', color: '#8fe3f2', field: 'climb', fieldName: 'Escalade' },
  { id: 'brasier', name: 'Badge Brasier', leader: 'Pyra', town: 'Cendrelave', type: 'feu', color: '#ff6a3d', field: 'fly', fieldName: 'Vol' },
  { id: 'zenith', name: 'Badge Zénith', leader: 'Céleste', town: 'Astralis', type: 'astral', color: '#8a6cff', field: null, fieldName: null },
];
export const BADGE_MAP = Object.fromEntries(BADGES.map((b, i) => [b.id, { ...b, index: i }]));
/** Badge requis pour chaque capacité de terrain. */
export const FIELD_BADGE = Object.fromEntries(BADGES.filter((b) => b.field).map((b) => [b.field, b.id]));
/** Types de Lumins qui « réalisent » une capacité (pour l'animation). */
export const FIELD_TYPES = {
  cut: ['plante', 'insecte', 'metal', 'dragon', 'ombre'],
  smash: ['sol', 'roche', 'metal', 'dragon'],
  strength: ['sol', 'roche', 'metal', 'glace', 'dragon'],
  surf: ['eau'],
  flash: ['lumiere', 'foudre', 'feu', 'astral'],
  climb: ['roche', 'sol', 'plante', 'insecte'],
  fly: ['vent', 'dragon', 'astral'],
};
