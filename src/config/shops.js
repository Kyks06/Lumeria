/**
 * BOUTIQUES : l'inventaire général s'agrandit avec les badges, chaque ville ajoute ses spécialités.
 */
const BY_BADGES = [
  [0, ['potion', 'prisme', 'antidote', 'anti_para', 'repousse']],
  [1, ['super_potion', 'reveil', 'anti_brule', 'degel', 'corde_sortie']],
  [2, ['super_prisme', 'rappel', 'super_repousse']],
  [3, ['total_soin']],
  [4, ['hyper_potion', 'hyper_prisme']],
  [5, ['max_repousse']],
  [6, ['potion_max', 'guerison']],
];

export const SHOP_SPECIALS = {
  clairvent: [],
  sylvebourg: ['baie_oran', 'prisme_filet'],
  portazur: ['prisme_filet', 'eau_fraiche', 'limonade', 'baie_cerise'],
  rocheval: ['prisme_sombre', 'pierre_dure'],
  sablons: ['pierre_foudre', 'prisme_rapide', 'limonade'],
  brumevase: ['prisme_sombre', 'pierre_lune', 'baie_prine'],
  givrecime: ['pierre_glace', 'prisme_chrono', 'lait_doux'],
  cendrelave: ['pierre_feu', 'prisme_chrono', 'baie_sitrus'],
  ligue: ['potion_max', 'guerison', 'rappel', 'hyper_prisme'],
  ile: ['prisme_soin', 'prisme_chrono', 'baie_sitrus', 'baie_mepo'],
};

/** Comptoirs du Grand Magasin d'Astralis. */
export const DEPT = {
  soins: ['potion', 'super_potion', 'hyper_potion', 'potion_max', 'guerison', 'rappel', 'total_soin', 'ether', 'elixir'],
  prismes: ['prisme', 'super_prisme', 'hyper_prisme', 'prisme_rapide', 'prisme_sombre', 'prisme_filet', 'prisme_chrono', 'prisme_soin'],
  combat: ['attaque_plus', 'defense_plus', 'special_plus', 'defspe_plus', 'vitesse_plus', 'precision_plus', 'repousse', 'super_repousse', 'max_repousse'],
  evolution: ['pierre_feu', 'pierre_eau', 'pierre_plante', 'pierre_foudre', 'pierre_glace', 'pierre_lune', 'pierre_soleil', 'cable_lien', 'pierre_immuable'],
  vitamines: ['pv_plus', 'proteine', 'fer', 'calcium', 'zinc', 'carbone', 'baie_oran', 'baie_sitrus', 'baie_prine'],
};

/** Récompenses échangeables contre des Points Combat (Tour de Combat). */
export const BP_SHOP = [
  ['restes', 48], ['orbe_vie', 48], ['bandeau_ultime', 48], ['vive_griffe', 32], ['ceinture_pro', 32],
  ['capsule_talent', 64], ['super_bonbon', 24], ['pp_plus', 16], ['ruban_lie', 40], ['pierre_immuable', 8],
  ['charbon', 16], ['eau_mystique', 16], ['graine_miracle', 16], ['aimant', 16], ['glace_eternelle', 16], ['croc_astral', 24],
];

export function shopList(shopId, badges) {
  if (DEPT[shopId]) return DEPT[shopId];
  const base = [];
  for (const [n, list] of BY_BADGES) if (badges >= n) base.push(...list);
  const extra = SHOP_SPECIALS[shopId] || [];
  return [...new Set([...base, ...extra])];
}
