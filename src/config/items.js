/**
 * OBJETS
 * Poches : soin · prisme · combat · baie · objet · dt · cle
 * price = prix d'achat (revente à moitié prix). 0 = introuvable en boutique.
 */
const I = (name, pocket, price, desc, o = {}) => ({ name, pocket, price, desc, ...o });

export const POCKETS = [
  { id: 'soin', name: 'Soins' },
  { id: 'prisme', name: 'Prismes' },
  { id: 'combat', name: 'Combat' },
  { id: 'baie', name: 'Baies' },
  { id: 'objet', name: 'Objets' },
  { id: 'dt', name: 'Disques' },
  { id: 'cle', name: 'Objets rares' },
];

export const ITEMS = {
  // ── SOINS ──────────────────────────────────────────────
  potion:        I('Potion', 'soin', 200, 'Restaure 20 PV.', { heal: 20, color: '#ff7a9c' }),
  super_potion:  I('Super Potion', 'soin', 600, 'Restaure 60 PV.', { heal: 60, color: '#ff4f7b' }),
  hyper_potion:  I('Hyper Potion', 'soin', 1200, 'Restaure 120 PV.', { heal: 120, color: '#e83a6a' }),
  potion_max:    I('Potion Max', 'soin', 2500, 'Restaure tous les PV.', { heal: 'full', color: '#c83aff' }),
  guerison:      I('Guérison', 'soin', 3000, 'Restaure tous les PV et soigne les statuts.', { heal: 'full', cure: 'all', color: '#ffd23f' }),
  eau_fraiche:   I('Eau Fraîche', 'soin', 200, 'Une eau de source. Restaure 30 PV.', { heal: 30, color: '#5fd4ff' }),
  limonade:      I('Limonade', 'soin', 350, 'Pétillante. Restaure 70 PV.', { heal: 70, color: '#fff07a' }),
  lait_doux:     I('Lait Doux', 'soin', 500, 'Lait des fermes de Clairvent. Restaure 100 PV.', { heal: 100, color: '#fffaf0' }),
  antidote:      I('Antidote', 'soin', 100, 'Soigne le poison.', { cure: ['psn', 'tox'], color: '#b25ad9' }),
  anti_brule:    I('Anti-Brûle', 'soin', 200, 'Soigne les brûlures.', { cure: ['brn'], color: '#ff8a3a' }),
  anti_para:     I('Anti-Para', 'soin', 200, 'Soigne la paralysie.', { cure: ['par'], color: '#ffd23f' }),
  reveil:        I('Réveil', 'soin', 200, 'Réveille un Lumin endormi.', { cure: ['slp'], color: '#9ab8ff' }),
  degel:         I('Dégel', 'soin', 200, 'Dégèle un Lumin.', { cure: ['frz'], color: '#8fe3f2' }),
  total_soin:    I('Total Soin', 'soin', 400, 'Soigne tous les problèmes de statut.', { cure: 'all', color: '#ffe48a' }),
  rappel:        I('Rappel', 'soin', 1500, 'Ranime un Lumin K.O. avec la moitié de ses PV.', { revive: 0.5, color: '#ffd23f' }),
  rappel_max:    I('Rappel Max', 'soin', 0, 'Ranime un Lumin K.O. avec tous ses PV.', { revive: 1, color: '#ffb02e' }),
  ether:         I('Éther', 'soin', 1200, 'Restaure 10 PP d\'une attaque.', { pp: 10, ppOne: true, color: '#7ad0ff' }),
  ether_max:     I('Éther Max', 'soin', 0, 'Restaure tous les PP d\'une attaque.', { pp: 99, ppOne: true, color: '#4aa8ff' }),
  elixir:        I('Élixir', 'soin', 3000, 'Restaure 10 PP de toutes les attaques.', { pp: 10, color: '#c58bff' }),
  elixir_max:    I('Élixir Max', 'soin', 0, 'Restaure tous les PP de toutes les attaques.', { pp: 99, color: '#9a5aff' }),

  // ── PRISMES (capture) ─────────────────────────────────
  prisme:        I('Prisme', 'prisme', 200, 'Un cristal taillé pour capturer les Lumins sauvages.', { ball: 1, color: '#ffb547' }),
  super_prisme:  I('Super Prisme', 'prisme', 600, 'Un Prisme plus pur. Meilleur taux de capture.', { ball: 1.5, color: '#5fd4ff' }),
  hyper_prisme:  I('Hyper Prisme', 'prisme', 1200, 'Un Prisme d\'aube parfait. Capture redoutable.', { ball: 2, color: '#c58bff' }),
  prisme_rapide: I('Prisme Rapide', 'prisme', 1000, 'Très efficace s\'il est lancé au premier tour.', { ball: 1, special: 'quick', color: '#ffe14a' }),
  prisme_sombre: I('Prisme Sombre', 'prisme', 1000, 'Très efficace la nuit et dans les grottes.', { ball: 1, special: 'dusk', color: '#4a3a7a' }),
  prisme_filet:  I('Prisme Filet', 'prisme', 1000, 'Très efficace sur les Lumins Eau et Insecte.', { ball: 1, special: 'net', color: '#3ac0a0' }),
  prisme_chrono: I('Prisme Chrono', 'prisme', 1000, 'De plus en plus efficace au fil des tours.', { ball: 1, special: 'timer', color: '#e0e4ea' }),
  prisme_soin:   I('Prisme Soin', 'prisme', 300, 'Soigne entièrement le Lumin capturé.', { ball: 1, special: 'heal', color: '#ff9ad5' }),
  prisme_amitie: I('Prisme Amitié', 'prisme', 0, 'Le Lumin capturé devient très vite votre ami.', { ball: 1, special: 'friend', color: '#7dff9c' }),
  prisme_maitre: I('Prisme Maître', 'prisme', 0, 'Le Prisme ultime. Capture à coup sûr.', { ball: 255, special: 'master', color: '#ff3a8a' }),

  // ── COMBAT ─────────────────────────────────────────────
  attaque_plus:  I('Attaque +', 'combat', 1000, 'Augmente fortement l\'Attaque pendant le combat.', { battleStat: 'atk', color: '#ff6a3d' }),
  defense_plus:  I('Défense +', 'combat', 1000, 'Augmente fortement la Défense pendant le combat.', { battleStat: 'def', color: '#c09060' }),
  special_plus:  I('Spécial +', 'combat', 1000, 'Augmente fortement l\'Atq. Spé. pendant le combat.', { battleStat: 'spa', color: '#ff6fa8' }),
  defspe_plus:   I('Déf. Spé. +', 'combat', 1000, 'Augmente fortement la Déf. Spé. pendant le combat.', { battleStat: 'spd', color: '#9ab8ff' }),
  vitesse_plus:  I('Vitesse +', 'combat', 1000, 'Augmente fortement la Vitesse pendant le combat.', { battleStat: 'spe', color: '#ffd23f' }),
  precision_plus:I('Précision +', 'combat', 1000, 'Augmente fortement la Précision pendant le combat.', { battleStat: 'acc', color: '#a8c43a' }),

  // ── BAIES (à tenir) ────────────────────────────────────
  baie_oran:     I('Baie Oran', 'baie', 150, 'À tenir. Restaure 20 PV quand les PV passent sous la moitié.', { held: 'berry_heal', amount: 20, heal: 20, color: '#3ba7ff' }),
  baie_sitrus:   I('Baie Sitrus', 'baie', 400, 'À tenir. Restaure un quart des PV quand ils passent sous la moitié.', { held: 'berry_sitrus', color: '#ffd23f' }),
  baie_prine:    I('Baie Prine', 'baie', 300, 'À tenir. Soigne n\'importe quel statut.', { held: 'berry_cure', cure: 'all', color: '#7dff9c' }),
  baie_cerise:   I('Baie Cerise', 'baie', 100, 'À tenir. Soigne la paralysie.', { held: 'berry_par', cure: ['par'], color: '#ff4f7b' }),
  baie_mepo:     I('Baie Mepo', 'baie', 300, 'À tenir. Restaure 10 PP quand une attaque est à court.', { held: 'berry_pp', color: '#ff9a3c' }),

  // ── OBJETS À TENIR ─────────────────────────────────────
  restes:        I('Restes', 'objet', 0, 'À tenir. Restaure un peu de PV à chaque tour.', { held: 'leftovers', color: '#c8a070' }),
  orbe_vie:      I('Orbe Vie', 'objet', 0, 'À tenir. Augmente les dégâts de 30 % mais coûte des PV.', { held: 'lifeorb', color: '#c83aff' }),
  bandeau_ultime:I('Bandeau Ultime', 'objet', 0, 'À tenir. Survit à un coup fatal si les PV sont au max.', { held: 'sash', color: '#ff6a3d' }),
  vive_griffe:   I('Vive Griffe', 'objet', 0, 'À tenir. Permet parfois d\'agir en premier.', { held: 'quickclaw', color: '#e0e4ea' }),
  ceinture_pro:  I('Ceinture Pro', 'objet', 0, 'À tenir. Renforce les attaques super efficaces.', { held: 'expertbelt', color: '#3a3a3a' }),
  oeuf_chance:   I('Œuf Chance', 'objet', 0, 'À tenir. Le porteur gagne plus d\'expérience.', { held: 'luckyegg', color: '#fff6e6' }),
  piece_rune:    I('Pièce Rune', 'objet', 0, 'À tenir. Double l\'argent gagné en combat.', { held: 'amulet', color: '#ffd23f' }),
  pierre_immuable: I('Pierre Immuable', 'objet', 3000, 'À tenir. Empêche l\'évolution. À la Pension, transmet la nature.', { held: 'everstone', color: '#b7b09a' }),
  ruban_lie:     I('Ruban Lié', 'objet', 0, 'À tenir. À la Pension, transmet 5 statistiques cachées des parents.', { held: 'destiny', color: '#ff4f9a' }),
  charbon:       I('Charbon', 'objet', 0, 'À tenir. Renforce les attaques Feu.', { held: 'boost', boost: 'feu', color: '#3a3030' }),
  eau_mystique:  I('Eau Mystique', 'objet', 0, 'À tenir. Renforce les attaques Eau.', { held: 'boost', boost: 'eau', color: '#3ba7ff' }),
  graine_miracle:I('Graine Miracle', 'objet', 0, 'À tenir. Renforce les attaques Plante.', { held: 'boost', boost: 'plante', color: '#56cc6b' }),
  aimant:        I('Aimant', 'objet', 0, 'À tenir. Renforce les attaques Électrik.', { held: 'boost', boost: 'foudre', color: '#ff4f4f' }),
  glace_eternelle: I('Glace Éternelle', 'objet', 0, 'À tenir. Renforce les attaques Glace.', { held: 'boost', boost: 'glace', color: '#8fe3f2' }),
  pierre_dure:   I('Pierre Dure', 'objet', 0, 'À tenir. Renforce les attaques Roche.', { held: 'boost', boost: 'roche', color: '#c09060' }),
  plume_vive:    I('Plume Vive', 'objet', 0, 'À tenir. Renforce les attaques Air.', { held: 'boost', boost: 'vent', color: '#9ab8ff' }),
  pic_venin:     I('Pic Venin', 'objet', 0, 'À tenir. Renforce les attaques Poison.', { held: 'boost', boost: 'toxine', color: '#b25ad9' }),
  ceinture_noire:I('Sable Doux', 'objet', 0, 'À tenir. Renforce les attaques Sol.', { held: 'boost', boost: 'sol', color: '#d8a85a' }),
  cuillere_tordue: I('Croc Dragon', 'objet', 0, 'À tenir. Renforce les attaques Dragon.', { held: 'boost', boost: 'dragon', color: '#2ec8b4' }),
  rune_spectrale: I('Rune Spectrale', 'objet', 0, 'À tenir. Renforce les attaques Spectre.', { held: 'boost', boost: 'spectre', color: '#7a6ac8' }),
  rune_sombre:   I('Rune Sombre', 'objet', 0, 'À tenir. Renforce les attaques Ténèbres.', { held: 'boost', boost: 'ombre', color: '#6c5a8e' }),
  peau_metal:    I('Peau Métal', 'objet', 0, 'À tenir. Renforce les attaques Acier.', { held: 'boost', boost: 'metal', color: '#a9b4c2' }),
  poudre_aurore: I('Poudre Aurore', 'objet', 0, 'À tenir. Renforce les attaques Lumière.', { held: 'boost', boost: 'lumiere', color: '#ffe48a' }),
  poudre_argent: I('Poudre Argentée', 'objet', 0, 'À tenir. Renforce les attaques Insecte.', { held: 'boost', boost: 'insecte', color: '#d8d8d8' }),
  croc_astral:   I('Poussière Stellaire', 'objet', 0, 'À tenir. Renforce les attaques Cosmique.', { held: 'boost', boost: 'astral', color: '#5a6cff' }),
  ruban_soie:    I('Ruban de Soie', 'objet', 0, 'À tenir. Renforce les attaques Neutre.', { held: 'boost', boost: 'normal', color: '#fff6e6' }),

  // ── ÉVOLUTION, VITAMINES, TERRAIN ──────────────────────
  pierre_feu:    I('Pierre Feu', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#ff6a3d' }),
  pierre_eau:    I('Pierre Eau', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#3ba7ff' }),
  pierre_plante: I('Pierre Plante', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#56cc6b' }),
  pierre_foudre: I('Pierre Foudre', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#ffd23f' }),
  pierre_glace:  I('Pierre Glace', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#8fe3f2' }),
  pierre_lune:   I('Pierre Lune', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#6c5a8e' }),
  pierre_soleil: I('Pierre Soleil', 'objet', 3000, 'Fait évoluer certains Lumins.', { evoItem: true, color: '#ffb02e' }),
  cable_lien:    I('Câble de Lien', 'objet', 3000, 'Un câble d\'énergie qui fait évoluer certains Lumins.', { evoItem: true, color: '#c58bff' }),
  pv_plus:       I('PV Plus', 'objet', 9800, 'Augmente les PV d\'un Lumin (points d\'effort).', { vitamin: 'hp', color: '#7dff9c' }),
  proteine:      I('Protéine', 'objet', 9800, 'Augmente l\'Attaque d\'un Lumin (points d\'effort).', { vitamin: 'atk', color: '#ff6a3d' }),
  fer:           I('Fer', 'objet', 9800, 'Augmente la Défense d\'un Lumin (points d\'effort).', { vitamin: 'def', color: '#c09060' }),
  calcium:       I('Calcium', 'objet', 9800, 'Augmente l\'Atq. Spé. d\'un Lumin (points d\'effort).', { vitamin: 'spa', color: '#ff6fa8' }),
  zinc:          I('Zinc', 'objet', 9800, 'Augmente la Déf. Spé. d\'un Lumin (points d\'effort).', { vitamin: 'spd', color: '#9ab8ff' }),
  carbone:       I('Carbone', 'objet', 9800, 'Augmente la Vitesse d\'un Lumin (points d\'effort).', { vitamin: 'spe', color: '#ffd23f' }),
  super_bonbon:  I('Super Bonbon', 'objet', 0, 'Fait monter un Lumin d\'un niveau.', { candy: true, color: '#5fd4ff' }),
  pp_plus:       I('PP Plus', 'objet', 0, 'Augmente les PP maximum d\'une attaque.', { ppUp: true, color: '#9a5aff' }),
  capsule_talent:I('Capsule Talent', 'objet', 0, 'Change le talent d\'un Lumin.', { abilityCapsule: true, color: '#ff4f9a' }),
  repousse:      I('Repousse', 'objet', 400, 'Les Lumins sauvages plus faibles vous évitent pendant 100 pas.', { repel: 100, color: '#a8c43a' }),
  super_repousse:I('Super Repousse', 'objet', 700, 'Les Lumins sauvages plus faibles vous évitent pendant 200 pas.', { repel: 200, color: '#56cc6b' }),
  max_repousse:  I('Max Repousse', 'objet', 900, 'Les Lumins sauvages plus faibles vous évitent pendant 250 pas.', { repel: 250, color: '#2f9e44' }),
  corde_sortie:  I('Corde Sortie', 'objet', 550, 'Ramène instantanément à l\'entrée d\'une grotte ou d\'un donjon.', { escape: true, color: '#c8a070' }),
  pepite:        I('Pépite', 'objet', 0, 'Une pépite d\'or pur. Se revend très cher.', { sell: 5000, color: '#ffd23f' }),
  perle:         I('Perle', 'objet', 0, 'Une jolie perle. Se revend bien.', { sell: 700, color: '#fff6f8' }),
  eclat_etoile:  I('Éclat d\'Étoile', 'objet', 0, 'Un fragment d\'étoile. Se revend très cher.', { sell: 4500, color: '#ffe48a' }),

  // ── OBJETS RARES ───────────────────────────────────────
  lumidex:       I('Lumidex', 'cle', 0, 'Encyclopédie des Lumins rencontrés et capturés.', { key: true, color: '#ff4f4f' }),
  velo:          I('Vélo', 'cle', 0, 'Un vélo pliable. Permet de rouler beaucoup plus vite. Touche B.', { key: true, register: 'bike', color: '#3ba7ff' }),
  canne:         I('Canne', 'cle', 0, 'Une vieille canne à pêche. Utilisez-la face à l\'eau.', { key: true, register: 'fish', rod: 1, color: '#c8a070' }),
  super_canne:   I('Super Canne', 'cle', 0, 'Une canne de qualité. Attire des Lumins plus forts.', { key: true, register: 'fish', rod: 2, color: '#ffb02e' }),
  multi_exp:     I('Multi Exp', 'cle', 0, 'Toute l\'équipe partage l\'expérience gagnée. Activable dans le Sac.', { key: true, toggle: 'expShare', color: '#7dff9c' }),
  charme_chroma: I('Charme Chroma', 'cle', 0, 'Augmente les chances de rencontrer des Lumins chromatiques.', { key: true, color: '#ffd23f' }),
  ticket_ferry:  I('Ticket de Ferry', 'cle', 0, 'Permet de prendre le ferry de Port-Azur vers l\'Île Lointaine.', { key: true, color: '#fff6e6' }),
  carte_acces:   I('Carte d\'Accès', 'cle', 0, 'Une carte magnétique volée à l\'Ordre du Crépuscule.', { key: true, color: '#6c5a8e' }),
  eclat_aube:    I('Éclat de l\'Aube', 'cle', 0, 'Un cristal ancien qui pulse d\'une lumière chaude.', { key: true, color: '#ffb02e' }),
  colis:         I('Colis', 'cle', 0, 'Un colis pour le Professeur Aubin.', { key: true, color: '#c8a070' }),
};

// ── DISQUES TECHNIQUES ────────────────────────────────────
export const TMS = [
  'aiguisage', 'bouclier', 'sieste', 'rage_contenue', 'soleil_ardent', 'pluie_douce', 'tempete_sable', 'chute_neige',
  'jet_incandescent', 'torrent_hurlant', 'bourgeon', 'rayon_ionique', 'rayon_givrant', 'seisme_cristal', 'avalanche', 'lame_air',
  'bombe_fangeuse', 'vague_aura', 'onde_psychique', 'sphere_ombre', 'canon_chrome', 'eclat_prisme', 'bourdonnement', 'pulsar',
  'colere_titan', 'complot', 'posture', 'meditation', 'poing_volcan', 'poing_orage', 'poing_givre', 'broyage_noir',
  'front_acier', 'croc_abyssal', 'taille_sylvestre', 'pouvoir_tellurique', 'brasier_solaire', 'maelstrom', 'fulgurance', 'blizzard',
];
TMS.forEach((move, i) => {
  const num = String(i + 1).padStart(2, '0');
  ITEMS[`dt${num}`] = { name: `DT${num}`, pocket: 'dt', price: 0, desc: '', tm: move, num: i + 1, color: '#9ab8ff' };
});

for (const [id, it] of Object.entries(ITEMS)) it.id = id;
export const sellPrice = (it) => it.sell ?? Math.floor((it.price || 0) / 2);
