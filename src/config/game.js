/**
 * RÉGLAGES GÉNÉRAUX ET DIFFICULTÉ
 */
export const GAME = {
  title: 'Éclats de Lumeria',
  subtitle: "L'Ordre du Crépuscule",
  version: '3.0.0',
  saveKey: 'eclats-de-lumeria/v2/save',
  settingsKey: 'eclats-de-lumeria/v2/settings',
  currencySymbol: '◆',
  startMoney: 3000,
  startHour: 9,
  /** Durée d'une journée complète en secondes réelles (24 min). */
  dayLengthSeconds: 1440,
  maxTeam: 6,
  boxes: 16,
  boxSize: 30,
  /** Probabilité d'un Lumin chromatique (1 / n). */
  shinyOdds: 1024,
  shinyOddsCharm: 341,
  /** Mètres parcourus par « pas » (œufs, Repousse, Pension). */
  stepMeters: 1.4,
  /** Mètres par cycle d'éclosion. */
  eggCycleMeters: 22,
  textSpeed: { lente: 26, normale: 55, rapide: 130 },
  interactDistance: 2.4,
  player: { height: 1.7, radius: 0.38, walkSpeed: 4.2, runSpeed: 7.6, bikeSpeed: 12.5, surfSpeed: 7.2 },
};

/**
 * Modes de difficulté (choisis au début d'une partie).
 * levelMod : bonus de niveau des dresseurs · ai : intelligence (1 à 3) · expMult : multiplicateur d'XP
 * style : 'choix' (on peut changer de Lumin quand l'adversaire en envoie un nouveau) ou 'fixe'
 */
export const DIFFICULTY = {
  facile:    { name: 'Facile',    desc: 'Dresseurs moins forts, plus d\'expérience. Idéal pour découvrir.', levelMod: -2, ai: 1, expMult: 1.5, moneyMult: 1.2, style: 'choix', trainerItems: 0 },
  normal:    { name: 'Normal',    desc: 'L\'expérience classique, équilibrée comme les grands jeux du genre.', levelMod: 0, ai: 2, expMult: 1.0, moneyMult: 1.0, style: 'choix', trainerItems: 1 },
  difficile: { name: 'Difficile', desc: 'Dresseurs plus forts et plus malins, style « Fixe », soins limités. Pour les vétérans.', levelMod: 3, ai: 3, expMult: 0.85, moneyMult: 0.8, style: 'fixe', trainerItems: 2 },
};

/** Défis optionnels activables en début de partie. */
export const CHALLENGE_RULES = {
  nuzlocke:  { name: 'Nuzlocke', desc: 'Un Lumin K.O. est perdu pour toujours. Seule la première rencontre de chaque zone peut être capturée. Perdre tous ses Lumins termine le défi.' },
  levelcap:  { name: 'Plafond de niveau', desc: 'Vos Lumins ne gagnent plus d\'expérience au-delà du niveau du prochain Champion d\'Arène.' },
  noitems:   { name: 'Sans objets en combat', desc: 'Impossible d\'utiliser des objets de soin pendant les combats.' },
  monotype:  { name: 'Monotype', desc: 'Seuls les Lumins partageant le type de votre premier partenaire peuvent combattre.' },
};

export const DEFAULT_SETTINGS = {
  quality: 'haute',       // 'ultra' | 'haute' | 'basse'
  sound: true,
  music: 0.5,
  sfx: 0.8,
  textSpeed: 'normale',
  invertY: false,
  sensitivity: 1,
  battleAnims: true,
  autoRun: false,
};

/** Niveau plafond selon le nombre de badges (option « Plafond de niveau »). */
export const LEVEL_CAPS = [15, 21, 26, 31, 36, 41, 46, 51, 60, 100];
