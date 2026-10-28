/**
 * CARNET DE DÉFIS : objectifs à long terme, récompensés par des objets.
 * check(stats) reçoit les statistiques de la partie et renvoie true quand le défi est réussi.
 */
export const CHALLENGES = [
  { id: 'capture1',  name: 'Premier lien',          desc: 'Capturer un Lumin sauvage.',                  check: (s) => s.captures >= 1,   reward: ['super_prisme', 5] },
  { id: 'dex15',     name: 'Collectionneur',        desc: 'Capturer 15 espèces différentes.',            check: (s) => s.caught >= 15,    reward: ['hyper_prisme', 5] },
  { id: 'dex40',     name: 'Naturaliste',           desc: 'Capturer 40 espèces différentes.',            check: (s) => s.caught >= 40,    reward: ['oeuf_chance', 1] },
  { id: 'dex80',     name: 'Encyclopédiste',        desc: 'Capturer 80 espèces différentes.',            check: (s) => s.caught >= 80,    reward: ['charme_chroma', 1] },
  { id: 'dex127',    name: 'Lumidex complet',       desc: 'Capturer toutes les espèces hors légendaires.', check: (s) => s.caughtNonLegend >= 127, reward: ['prisme_maitre', 1] },
  { id: 'badge1',    name: 'Premier badge',         desc: 'Obtenir le Badge Feuille.',                   check: (s) => s.badges >= 1,     reward: ['super_potion', 5] },
  { id: 'badge4',    name: 'À mi-chemin',           desc: 'Obtenir quatre badges.',                      check: (s) => s.badges >= 4,     reward: ['restes', 1] },
  { id: 'badge8',    name: 'Collection complète',   desc: 'Obtenir les huit badges.',                    check: (s) => s.badges >= 8,     reward: ['ruban_lie', 1] },
  { id: 'champion',  name: 'Maître de Lumeria',     desc: 'Devenir Champion de la Ligue du Zénith.',     check: (s) => s.champion,        reward: ['ticket_ferry', 1] },
  { id: 'hardleague',name: 'Légende du Zénith',     desc: 'Devenir Champion en mode Difficile.',          check: (s) => s.champion && s.difficulty === 'difficile', reward: ['orbe_vie', 1] },
  { id: 'nuzlocke',  name: 'Survivant',             desc: 'Devenir Champion avec le défi Nuzlocke actif.', check: (s) => s.champion && s.nuzlocke, reward: ['bandeau_ultime', 1] },
  { id: 'egg1',      name: 'Premier œuf',           desc: 'Faire éclore un œuf.',                        check: (s) => s.hatched >= 1,    reward: ['pierre_immuable', 1] },
  { id: 'egg20',     name: 'Éleveur passionné',     desc: 'Faire éclore 20 œufs.',                       check: (s) => s.hatched >= 20,   reward: ['ruban_lie', 1] },
  { id: 'shiny',     name: 'Reflet rare',           desc: 'Capturer ou faire éclore un Lumin chromatique.', check: (s) => s.shinies >= 1, reward: ['pepite', 3] },
  { id: 'trainers50',name: 'Combattant aguerri',    desc: 'Vaincre 50 dresseurs.',                       check: (s) => s.trainers >= 50,  reward: ['vive_griffe', 1] },
  { id: 'trainers120',name: 'Vétéran',              desc: 'Vaincre 120 dresseurs.',                      check: (s) => s.trainers >= 120, reward: ['ceinture_pro', 1] },
  { id: 'level50',   name: 'Force tranquille',      desc: 'Amener un Lumin au niveau 50.',               check: (s) => s.maxLevel >= 50,  reward: ['pp_plus', 3] },
  { id: 'level100',  name: 'Sommet absolu',         desc: 'Amener un Lumin au niveau 100.',              check: (s) => s.maxLevel >= 100, reward: ['prisme_maitre', 1] },
  { id: 'fish10',    name: 'Pêcheur du dimanche',   desc: 'Capturer 10 Lumins à la pêche.',              check: (s) => s.fishCatches >= 10, reward: ['super_canne', 1] },
  { id: 'tower7',    name: 'Tour de Combat I',      desc: 'Réussir une série de 7 victoires à la Tour de Combat.', check: (s) => s.towerBest >= 7, reward: ['capsule_talent', 1] },
  { id: 'tower21',   name: 'Tour de Combat II',     desc: 'Réussir une série de 21 victoires à la Tour de Combat.', check: (s) => s.towerBest >= 21, reward: ['super_bonbon', 5] },
  { id: 'legend',    name: 'Gardiens éveillés',     desc: 'Capturer les trois Gardiens (Terragorn, Aéroneth, Thalassyre).', check: (s) => s.guardians >= 3, reward: ['eclat_etoile', 3] },
  { id: 'explore',   name: 'Grand voyageur',        desc: 'Visiter toutes les zones de la région.',      check: (s) => s.visitedAll,      reward: ['max_repousse', 10] },
  { id: 'rich',      name: 'Fortune',               desc: 'Posséder 200 000 ◆.',                         check: (s) => s.money >= 200000, reward: ['piece_rune', 1] },
  { id: 'nofaint',   name: 'Sans une égratignure',  desc: 'Battre un Champion d\'Arène sans qu\'aucun Lumin ne soit K.O.', check: (s) => s.perfectGyms >= 1, reward: ['hyper_potion', 5] },
];
