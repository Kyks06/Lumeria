import { N, S, E, O, tr, pnj, lumin, sign, prop, item, hidden, lamps, en } from './helpers.js';

/* ═══════════════════════════════════════════════════════════════════════
   CHAPITRE 2 — Route 2 (Bois Murmurant), Port-Azur, Entrepôt, Arène Eau,
   Route 3 (Côte des Embruns, Pension), Mine de Rocheval, Rocheval, Arène Roche
   ═══════════════════════════════════════════════════════════════════════ */

export const r2 = {
  id: 'r2', name: 'Route 2', sub: 'Bois Murmurant', type: 'route', biome: 'foret', music: 'route2', size: [250, 76], seed: 42,
  paths: [[[-126, 0], [-90, -6], [-60, 8], [-30, 4], [0, -10], [30, -4], [60, 10], [90, 6], [126, 4]], [[-60, 8], [-56, -18]]],
  rivers: [{ pts: [[10, -48], [6, -10], [14, 20], [10, 48]], w: 7 }],
  exits: [{ edge: 'west', at: 0, w: 10, to: 'sylvebourg', entry: 'east' }, { edge: 'east', at: 4, w: 10, to: 'portazur', entry: 'west' }],
  grass: [[-100, 18, 18, 14], [-74, -18, 18, 12], [-40, 20, 18, 12], [-18, -24, 14, 12], [38, 20, 18, 12], [66, -14, 18, 12], [98, 22, 16, 12]],
  plazas: [[-56, -26, 6], [82, -26, 5]],
  props: [
    { t: 'bridge', x: 6.6, z: -8.6, rot: 1.373, len: 15, w: 3.4 },
    sign(-112, 8, S, 'Route 2', ['ROUTE 2 — BOIS MURMURANT', 'Est : Port-Azur', 'Ouest : Sylvebourg']),
    sign(-2, -2, S, 'Attention', ['ATTENTION !', 'Le pont est glissant par temps de pluie.']),
    prop('campfire', -50, -30), prop('tent', -60, -32, 0.8, { arg: '#7dc860' }), prop('log', -46, -24),
  ],
  obstacles: [{ t: 'cut', x: -56, z: -16 }, { t: 'cut', x: 82, z: -16 }],
  npcs: [
    pnj('vieux', 'Ermite', -54, -28, N, ['Les sentiers cachés du bois regorgent de trésors.', 'Mais il faut pouvoir couper ces arbustes…']),
    pnj('sportif', 'Coureur', 40, 2, O, ['Le Bois Murmurant… on dit que des Skipuctre y chuchotent la nuit !'], { wander: 6 }),
  ],
  trainers: [
    tr('campeur', 'Bastien', -86, -1, S, 10, 2, { sight: 5 }),
    tr('scout', 'Inès', -58, 16, O, 10, 2),
    tr('ornithologue', 'Paul', -22, 12, S, 11, 2, { team: [['aerion', 10], ['hiboulin', 11], ['aerion', 11]] }),
    tr('pique_niqueuse', 'Clara', 26, 4, N, 11, 2),
    tr('gamin', 'Enzo', 52, 4, S, 12, 2),
    tr('sbire', 'Sbire', 72, 16, O, 12, 2, { id: 'r2_sbire', team: [['venicobra', 11], ['chauvelin', 12]], intro: ['Hé ! Ne te mêle pas des affaires de l\'Ordre du Crépuscule !', 'On a rendez-vous à Port-Azur. Dégage de là !'], defeat: ['Grr… L\'Admin Kessel saura te remettre à ta place !'] }),
  ],
  triggers: [{ x: 108, z: 4, w: 6, d: 16, unless: 'rival2', if: 'starter', script: 'rival2' }],
  items: [item(-58, -30, 'dt11'), item(84, -30, 'super_prisme', 2), item(-118, -22, 'potion', 2), item(112, 26, 'repousse'), hidden(0, 30, 'pepite'), hidden(-30, -30, 'super_potion'), item(46, -30, 'prisme', 3)],
  encounters: {
    grass: [en('insectar', 6, 9, 16), en('insectoral', 7, 9, 6), en('scarabose', 7, 10, 14), en('champex', 7, 10, 14), en('herbiquod', 7, 10, 14), en('aerion', 7, 10, 10, 'day'), en('skipuctre', 8, 11, 12, 'night'), en('hiboulin', 8, 11, 14, 'night'), en('voltbulle', 9, 11, 4), en('chauvelin', 8, 10, 8, 'night'), en('feeline', 8, 10, 6)],
    surf: [en('carpaillon', 10, 20, 50), en('corallune', 10, 20, 30), en('grenouflet', 15, 20, 5)], fish: [en('carpaillon', 6, 12, 70), en('corallune', 8, 12, 20), en('grenouflet', 10, 14, 5)],
  },
};

export const portazur = {
  id: 'portazur', name: 'Port-Azur', sub: 'La cité des marées', type: 'town', biome: 'cote', style: 'port', music: 'town3',
  size: [130, 110], seed: 52, sea: { side: 'east', at: 34 }, fly: [-6, 14, 0], shop: 'portazur', entries: { dock: [37, 10, O] },
  plazas: [[-6, 4, 12]],
  paths: [[[-66, 4], [-30, 4], [-6, 4]], [[-6, 4], [-14, -20], [-24, -56]], [[-6, 4], [14, 4], [30, 10]], [[-6, 4], [-6, 30]], [[-6, 4], [8, 20], [16, 30]], [[-14, -20], [10, -22]], [[-30, 4], [-46, -22]], [[-30, 4], [-46, 30]]],
  exits: [{ edge: 'west', at: 4, w: 10, to: 'r2', entry: 'east' }, { edge: 'north', at: -24, w: 10, to: 'r3', entry: 'south' }],
  buildings: [
    { id: 'center', kind: 'center', x: -30, z: -16, rot: S },
    { id: 'shop', kind: 'shop', x: -36, z: 16, rot: N },
    { id: 'gym', kind: 'gym', x: 10, z: -32, rot: S, type: 'eau', to: 'gym2', entry: 'door', label: 'ARÈNE', closed: { unless: 'entrepot_done', msg: ['La porte est verrouillée.', '« Arène fermée : le Champion Marin enquête sur le vol au musée. »'] } },
    { id: 'musee', kind: 'bighouse', x: -6, z: 36, rot: N, name: 'Musée Maritime', label: 'MUSÉE', interior: { preset: 'museum', exhibits: [
      ['Une maquette du premier ferry de Port-Azur.'], ['Un fossile de Hydrolle vieux de dix mille ans.'],
      ['Le socle de l\'Éclat de l\'Aube.', 'Une plaque indique : « Fragment d\'étoile tombé sur Lumeria il y a mille ans. »'], ['La boussole du capitaine Azur, fondateur de la ville.']],
      npcs: [{ id: 'conservateur', kind: 'savant', name: 'Conservateur', x: 6.5, z: 2, rot: O, script: 'conservateur' }] } },
    { id: 'entrepot', kind: 'warehouse', x: 24, z: 32, rot: O, to: 'entrepot', entry: 'door', name: 'Entrepôt', closed: { unless: 'museum_alarm', msg: ['L\'entrepôt est fermé à clé.'] } },
    { id: 'phare', kind: 'lighthouse', x: 28, z: -38, rot: O, name: 'Phare d\'Azur', interior: { preset: 'hall', size: [10, 10], npcs: [
      { id: 'gardien_phare', kind: 'marin', name: 'Gardien du phare', x: 0, z: -1.5, rot: S, talk: ['Ce phare guide les bateaux depuis deux siècles.', 'Au large, il y a l\'Île Lointaine. Seuls les Champions de la Ligue ont le droit de s\'y rendre.'] },
    ] } },
    { id: 'pecheur', kind: 'house', x: -48, z: -32, rot: E, name: 'Maison du Pêcheur', interior: { npcs: [
      { id: 'vieux_pecheur', kind: 'pecheur', name: 'Vieux Loup de Mer', x: 0, z: -0.5, rot: S, script: 'canne' },
    ] } },
    { id: 'velos', kind: 'shop', x: -46, z: 38, rot: N, name: 'Vélos Azur', label: 'VÉLOS', interior: { preset: 'shop', clerk: 'sportif', npcs: [
      { id: 'velociste', kind: 'sportif', name: 'Vélociste', x: 0, z: -2, rot: S, script: 'velo' },
    ] } },
    { id: 'maison1', kind: 'house', x: 12, z: 18, rot: O, interior: { npcs: [
      { id: 'paz_m1', kind: 'femme', name: 'Marinière', x: 0, z: 0, rot: S, talk: ['Mon mari est marin. Il dit que la mer devient étrange la nuit depuis quelque temps…', 'Comme si quelque chose aspirait la lumière des étoiles.'] },
    ] } },
    { id: 'dock', kind: 'dock', x: 40, z: 10, rot: E },
    { id: 'ferry', kind: 'boat', x: 46, z: 20, rot: E, y: -1.2 },
  ],
  props: [
    prop('statue', -6, 4, 0, { arg: '#9ab8ff' }), ...lamps([[-16, -6], [4, -6], [-16, 14], [4, 14], [-40, 0], [20, 6], [-24, -40], [30, 2]]),
    sign(-56, 10, S, 'PORT-AZUR', ['PORT-AZUR', '« La cité des marées. »', 'Arène : Marin, maître des Lumins Eau.']),
    sign(14, -22, S, 'Arène', ['ARÈNE DE PORT-AZUR', 'Champion : Marin', '« Le flot qui ne recule jamais ! »']),
    prop('barrel', 30, 4), prop('barrel', 31, 5.5), prop('crate', 31, 2), prop('crate', 32.4, 2.2), prop('bench', -14, 16, N), prop('stall', 18, -6, S, { arg: '#3a7bd5' }), prop('stall', 24, -6, S, { arg: '#ff7a3a' }),
  ],
  npcs: [
    pnj('marin', 'Matelot', 23, 7, E, ['Ahoy ! Le ferry pour l\'Île Lointaine ne prend que les détenteurs d\'un Ticket de Ferry.'], { id: 'paz_matelot', script: 'ferry' }),
    pnj('touriste', 'Touriste', 4, 26, S, ['Port-Azur est magnifique au coucher du soleil !'], { wander: 4 }),
    pnj('marin', 'Marin', -20, -8, E, ['Il paraît que l\'Ordre du Crépuscule cherche les Éclats de l\'Aube.', 'Mais qu\'est-ce qu\'ils veulent en faire ?']),
    pnj('garde', 'Garde', -24, -48, S, ['Désolé, la Route 3 est réservée aux dresseurs ayant le Badge Vague.', 'Va donc défier Marin à l\'arène !'], { id: 'paz_garde', unless: 'badge:vague' }),
    pnj('homme', 'Marin', 2, -28, S, ['Je suis Marin, le Champion de cette ville. On a besoin d\'aide à l\'entrepôt !'], { id: 'paz_marin', kind: 'marin', look: { gender: 'm', skin: '#d9a77c', hair: '#1a3a6a', hairStyle: 'spiky', top: '#3ba7ff', bottom: '#ffffff', accent: '#ffffff', scarf: '#ffffff' }, if: 'museum_alarm', unless: 'entrepot_done' }),
    lumin('goelux', 25, 23, S, ['Goélux : « Kiaa ! »'], { wander: 4 }),
  ],
  triggers: [{ x: -52, z: 4, w: 6, d: 14, unless: 'museum_alarm', script: 'alarme_musee' }],
  items: [hidden(56, -40, 'perle'), item(-58, -46, 'super_potion'), hidden(-60, 40, 'pepite')],
  encounters: { surf: [en('goelux', 15, 22, 30), en('corallune', 15, 22, 25), en('elerocto', 18, 24, 15), en('carpaillon', 15, 22, 30)], fish: [en('carpaillon', 10, 16, 50), en('crabulle', 12, 16, 25), en('hydrolle', 12, 16, 15), en('elerocto', 14, 18, 5)] },
};

/* ENTREPÔT — repaire temporaire de l'Ordre du Crépuscule (Admin Kessel) */
export const entrepot = {
  id: 'entrepot', name: 'Entrepôt de Port-Azur', type: 'grid', theme: 'entrepot', music: 'ordre', area: 'portazur', cell: 2,
  layout: [
    '######################',
    '#CC......CC.....,,,.C#',
    '#C.......CC.....,,,..#',
    '#C.......CC.....,,,.C#',
    '#...CCCC.....=====..C#',
    '#...CCCC..CCC.......C#',
    '#.........CCC...CCC..#',
    '#..CC...........CCC..#',
    '#..CC..CCCC..........#',
    '#......CCCC....CC..CC#',
    '#...............CC...#',
    '#CCCC..C....C........#',
    '#......C....C...CC...#',
    '#..........CC...CC...#',
    '#CC..CC..............#',
    '#CC..CC..............#',
    '##########E###########',
  ],
  exit: { to: 'portazur', entry: 'door:entrepot' },
  lamps: [[-10, 8], [10, 8], [-8, -8], [10, -10]],
  trainers: [
    { id: 'ent_s1', cls: 'sbire', name: 'Sbire', cell: [5, 13], rot: E, sight: 5, level: 12, n: 2 },
    { id: 'ent_s2', cls: 'sbire_f', name: 'Sbire', cell: [2, 7], rot: S, sight: 4, level: 13, n: 2 },
    { id: 'ent_s3', cls: 'sbire', name: 'Sbire', cell: [14, 7], rot: O, sight: 4, level: 13, n: 2 },
    { id: 'ent_s4', cls: 'sbire_f', name: 'Sbire', cell: [5, 2], rot: E, sight: 3, level: 14, n: 3 },
    { id: 'ent_kessel', cls: 'admin', name: 'Admin Kessel', cell: [17, 2], rot: S, sight: 2, level: 17,
      look: { gender: 'm', skin: '#e8b98f', hair: '#c8c8d8', hairStyle: 'long', top: '#1a1030', bottom: '#120a20', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff', glasses: true },
      team: [['venicobra', 15], ['skipuctre', 16], ['chauvelin', 17]],
      intro: ['Tiens, tiens… Un enfant qui joue au héros.', 'Je suis Kessel, Admin de l\'Ordre du Crépuscule. Cet Éclat nous revient de droit.', 'Quand Nyctaris s\'éveillera, la nuit éternelle recouvrira Lumeria. Et tu n\'y pourras rien !'],
      defeat: ['Impossible… battu par un gamin ?'],
      after: ['Hmph. Garde ton caillou, pour l\'instant.', 'L\'Ordre possède déjà d\'autres Éclats…'], onWin: 'kessel1' },
  ],
  npcs: [{ id: 'ent_otage', kind: 'vendeur', name: 'Employé', cell: [19, 13], rot: O, talk: ['Merci ! Ces brutes m\'ont enfermé ici toute la nuit !', 'Leur chef est dans le bureau, au fond à droite.'] }],
  items: [{ cell: [1, 10], item: 'super_potion' }, { cell: [20, 6], item: 'prisme_sombre', qty: 2 }, { cell: [8, 4], item: 'rappel' }, { cell: [12, 13], item: 'repousse', hidden: true }],
};

/* ARÈNE 2 — Marin (Eau) : interrupteurs et barrières au-dessus des bassins */
export const gym2 = {
  id: 'gym2', name: 'Arène de Port-Azur', type: 'grid', theme: 'eau', music: 'gym', area: 'portazur', cell: 2,
  layout: [
    '###################',
    '#~~~~~~~,,,~~~~~~~#',
    '#~.....~,,,~.....~#',
    '#~.b...~.,.~...a.~#',
    '#~.....~~B~~.....~#',
    '#~~~.~~~~,~~~~.~~~#',
    '#.......~A~.......#',
    '#..~~~..~.~..~~~..#',
    '#..~~~.......~~~..#',
    '#.................#',
    '#~~~.~~~...~~~.~~~#',
    '#.................#',
    '#########E#########',
  ],
  exit: { to: 'portazur', entry: 'door:gym' },
  lamps: [[0, -4], [0, 6]],
  trainers: [
    { id: 'gym2_t1', cls: 'nageur', name: 'Nageur Kylian', cell: [3, 6], rot: E, sight: 4, level: 17, team: [['carpaillon', 16], ['goelux', 17]] },
    { id: 'gym2_t2', cls: 'nageuse', name: 'Nageuse Maëlle', cell: [15, 6], rot: O, sight: 4, level: 17, team: [['corallune', 16], ['hydrolle', 17]] },
    { id: 'gym2_t3', cls: 'pecheur', name: 'Pêcheur Yvon', cell: [12, 9], rot: O, sight: 3, level: 18, team: [['crabulle', 17], ['elerocto', 18]] },
    { id: 'gym2_leader', cls: 'leader', name: 'Marin', cell: [9, 1], rot: S, sight: 0, leader: { badge: 'vague', tm: 'dt06', field: 'Éclate-Roc' },
      look: { gender: 'm', skin: '#d9a77c', hair: '#1a3a6a', hairStyle: 'spiky', top: '#3ba7ff', bottom: '#ffffff', accent: '#ffffff', scarf: '#ffffff' },
      team: [['goelux', 18], ['elerocto', 19], ['sirenote', 21, { item: 'baie_oran' }]],
      intro: ['Merci encore pour l\'entrepôt, champion en herbe !', 'Mais ici, pas de cadeau : je suis Marin, et mes Lumins Eau vont te submerger !'],
      defeat: ['La marée s\'est retournée… Tu mérites le Badge Vague !'],
      after: ['Avec le Badge Vague, tes Lumins peuvent utiliser Éclate-Roc pour briser les rochers fissurés.', 'La Route 3 longe la côte jusqu\'à la Mine de Rocheval.'] },
  ],
  npcs: [{ id: 'gym2_guide', kind: 'homme', name: 'Guide', cell: [11, 11], rot: N, script: 'gym_guide', guide: ['eau'] }],
  items: [{ cell: [2, 2], item: 'super_potion' }, { cell: [16, 2], item: 'eau_fraiche', qty: 3 }],
};

export const r3 = {
  id: 'r3', name: 'Route 3', sub: 'Côte des Embruns', type: 'route', biome: 'cote', music: 'route3', size: [84, 280], seed: 63, sea: { side: 'east', at: 20 },
  paths: [[[-14, 141], [-10, 100], [-18, 60], [-6, 20], [-14, -20], [-8, -60], [-16, -100], [-6, -124]], [[-12, 40], [-22, 40]]],
  exits: [{ edge: 'south', at: -14, w: 10, to: 'portazur', entry: 'north' }],
  buildings: [
    { id: 'pension', kind: 'daycare', x: -28, z: 40, rot: E, name: 'Pension Lumin', label: 'PENSION', interior: { preset: 'daycare', npcs: [
      { id: 'eleveur', kind: 'eleveur', name: 'Papi Gustave', x: -4, z: 1.5, rot: E, talk: ['Ma femme s\'occupe des Lumins qu\'on nous confie.', 'Parfois, deux Lumins qui s\'entendent bien… on retrouve un Œuf ! Personne ne sait d\'où il vient.'] },
    ] } },
    { id: 'mine', kind: 'cave', x: -6, z: -130, rot: S, to: 'mine', entry: 'south', name: 'Mine de Rocheval' },
  ],
  fences: [[[-36, 30], [-36, 52], [-20, 52]], [[-36, 30], [-24, 30]]],
  grass: [[-30, 110, 14, 22], [-2, 82, 12, 20], [-30, 2, 14, 22], [-28, -42, 12, 20], [4, -84, 10, 18], [-30, -108, 12, 16]],
  props: [
    sign(-8, 128, S, 'Route 3', ['ROUTE 3 — CÔTE DES EMBRUNS', 'Nord : Mine de Rocheval', 'Sud : Port-Azur']),
    sign(-16, 34, S, 'Pension', ['PENSION LUMIN', 'On s\'occupe de vos Lumins pendant votre voyage !']),
    prop('tent', 10, 60, 0.4, { arg: '#ff5c8a' }), prop('campfire', 6, 54), prop('table', -2, 10, 0.3), prop('barrel', -26, 48),
  ],
  npcs: [
    pnj('eleveuse', 'Mamie Lucette', -16, 44, O, ['Je garde la porte de la Pension. Entre donc !']),
    lumin('feeline', -30, 46, E, ['Féeline : « Mrraou ? »'], { wander: 4 }),
    lumin('mulotin', -32, 36, O, ['Mulotin : « Grii ! »'], { wander: 3 }),
    pnj('vieux', 'Promeneur', 0, -40, O, ['Ces rochers fissurés cachent une crique.', 'Avec Éclate-Roc, on peut y accéder !']),
  ],
  obstacles: [{ t: 'smash', x: 6, z: -38 }, { t: 'smash', x: 10, z: -34 }],
  trainers: [
    tr('pecheur', 'Marc', 6, 102, O, 15, 2),
    tr('nageuse', 'Lina', 12, 66, O, 15, 2, { sight: 6 }),
    tr('randonneur', 'Bruno', -22, 18, E, 16, 2),
    tr('pique_niqueuse', 'Emma', -4, -12, S, 16, 2),
    tr('ornithologue', 'Félix', -20, -70, E, 17, 3),
    tr('campeur', 'Yann', -2, -100, O, 18, 2),
  ],
  items: [item(14, -44, 'pepite'), item(16, -28, 'hyper_potion'), item(-36, 120, 'super_repousse'), item(-34, -120, 'prisme_filet', 2), hidden(18, 130, 'perle'), hidden(-36, -10, 'super_potion'), item(13, 86, 'dt07')],
  encounters: {
    grass: [en('goelux', 13, 16, 20), en('crabulle', 13, 16, 16), en('hydrolle', 14, 17, 14), en('feeline', 14, 16, 8), en('aerilion', 16, 18, 8, 'day'), en('aerion', 13, 15, 8, 'day'), en('gloupy', 15, 17, 3), en('hibouleon', 16, 18, 6, 'night'), en('hiboulin', 14, 17, 12, 'night'), en('eclimect', 14, 17, 6), en('corallune', 13, 16, 6)],
    surf: [en('corallune', 18, 26, 25), en('goelux', 18, 26, 25), en('elerocto', 20, 26, 20), en('sirenote', 22, 28, 5), en('crabulle', 18, 26, 15)],
    fish: [en('carpaillon', 10, 18, 45), en('crabulle', 12, 18, 25), en('hydrolle', 12, 18, 20), en('elerocto', 15, 20, 8), en('carpeclat', 20, 25, 1)],
  },
};

export const mine = {
  id: 'mine', name: 'Mine de Rocheval', sub: 'Galeries de cristal', type: 'cave', biome: 'grotte', music: 'cave', size: [80, 150], seed: 71,
  paths: [[[0, 76], [0, 50], [-20, 30], [-18, 0], [6, -10], [20, -30], [14, -56], [10, -76]], [[-18, 0], [-30, -20]], [[6, -10], [28, 10]]],
  plazas: [[-20, 30, 8], [-30, -22, 6], [28, 12, 7], [14, -56, 8], [0, 60, 6]],
  lakes: [[12, 44, 4]],
  pathWidth: 3.2,
  exits: [{ edge: 'south', at: 0, w: 8, to: 'r3', entry: 'door:mine' }, { edge: 'north', at: 10, w: 8, to: 'rocheval', entry: 'south' }],
  props: [prop('crate', 4, 62), prop('barrel', -4, 64), prop('torch', 3, 56), prop('torch', -3, 56), prop('torch', -16, 26), prop('torch', 12, -52), prop('crate', 30, 16), prop('torch', 26, 8)],
  obstacles: [{ t: 'smash', x: 20, z: 4 }, { t: 'boulder', x: -26, z: -12 }],
  npcs: [pnj('ouvrier', 'Mineur blessé', -2, 66, E, ['Ouille… Les Lumins de la mine sont nerveux en ce moment.', 'Des gens en noir ont creusé partout pour trouver des cristaux qui brillent !'])],
  trainers: [
    tr('mineur', 'Roger', -14, 24, S, 17, 2),
    tr('mineur', 'Gérard', -10, -4, E, 18, 2),
    tr('campeur', 'Loïc', 18, -24, O, 18, 2),
    tr('mineur', 'Patrick', 26, 14, O, 19, 3),
    tr('randonneur', 'Alain', 8, -60, S, 19, 2),
  ],
  triggers: [{ x: 12, z: -66, w: 10, d: 4, unless: 'rival3', script: 'rival3' }],
  items: [item(-32, -26, 'pierre_lune'), item(32, 16, 'dt14'), item(-24, 36, 'super_potion'), hidden(18, -60, 'eclat_etoile'), item(-30, -16, 'corde_sortie'), hidden(-4, 30, 'super_repousse')],
  encounters: {
    cave: [en('gravillon', 15, 18, 22), en('boulix', 15, 18, 20), en('chauvelin', 15, 19, 20), en('taupipeur', 16, 19, 16), en('metalisk', 17, 19, 10), en('cristalis', 18, 20, 3), en('scarabose', 16, 18, 5)],
    surf: [en('carpaillon', 18, 24, 60), en('grenouflet', 20, 24, 20)], fish: [en('carpaillon', 15, 20, 70), en('grenouflet', 16, 20, 30)],
  },
};

export const rocheval = {
  id: 'rocheval', name: 'Rocheval', sub: 'La ville taillée dans la montagne', type: 'town', biome: 'montagne', style: 'montagne', music: 'town4',
  size: [110, 100], seed: 81, fly: [0, 6, 0], shop: 'rocheval', hills: 1.2,
  plazas: [[0, 4, 10]],
  paths: [[[0, 51], [0, 4]], [[0, 4], [10, -51]], [[0, 4], [-24, -2], [-24, -4]], [[0, 4], [22, -4], [22, -6]], [[0, 4], [-26, 22], [-30, 24]], [[0, 4], [26, 20], [28, 24]], [[4, -20], [-8, -26]]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'mine', entry: 'north' }, { edge: 'north', at: 10, w: 10, to: 'r4', entry: 'south' }],
  buildings: [
    { id: 'center', kind: 'center', x: -24, z: -12, rot: S },
    { id: 'shop', kind: 'shop', x: 22, z: -14, rot: S },
    { id: 'gym', kind: 'gym', x: -12, z: -36, rot: S, type: 'roche', to: 'gym3', entry: 'door', label: 'ARÈNE' },
    { id: 'graveur', kind: 'house', x: -30, z: 30, rot: N, name: 'Maison du Juge', interior: { npcs: [
      { id: 'juge', kind: 'vieux', name: 'Juge des Potentiels', x: 0, z: -0.8, rot: S, script: 'juge' },
    ] } },
    { id: 'maison2', kind: 'house', x: 28, z: 30, rot: N, interior: { npcs: [
      { id: 'roc_m2', kind: 'ouvrier', name: 'Tailleur de pierre', x: 0, z: 0, rot: S, talk: ['Brann, notre Championne, est la meilleure tailleuse de la région.', 'Ses Lumins Roche craignent l\'Eau, la Plante, le Sol et l\'Acier.'] },
    ] } },
    { id: 'maison3', kind: 'bighouse', x: 34, z: -32, rot: O, name: 'Maison du Tuteur', interior: { npcs: [
      { id: 'tuteur_roc', kind: 'moine', name: 'Tuteur', x: 0, z: -1, rot: S, script: 'tutor' },
    ] } },
  ],
  props: [
    prop('statue', 0, 4, 0, { arg: '#c09060' }), ...lamps([[-8, -6], [8, -6], [-8, 14], [8, 14], [6, -30], [6, 30]]),
    sign(6, 40, S, 'ROCHEVAL', ['ROCHEVAL', '« Taillée dans la montagne, solide comme le roc. »']),
    sign(-4, -26, S, 'Arène', ['ARÈNE DE ROCHEVAL', 'Championne : Brann', '« La montagne ne plie jamais. »']),
    prop('crate', 14, 8), prop('barrel', 15, 10), prop('bench', -12, 14, N),
  ],
  npcs: [
    pnj('ouvrier', 'Mineur', 12, 16, S, ['La Route 4 grimpe dans la montagne vers le désert de Sablons.', 'Il y a de gros rochers ronds : sans le Badge Roc, impossible de les pousser !'], { wander: 3 }),
    pnj('garconnet', 'Petit Max', -10, -16, E, ['Dans l\'arène, il faut pousser des rochers dans les trous pour avancer !', 'Si tu te trompes, sors et reviens : tout se remet en place.']),
  ],
  items: [hidden(-48, -40, 'pepite'), item(48, 40, 'super_potion', 2)],
};

/* ARÈNE 3 — Brann (Roche) : pousser les rochers dans les trous */
export const gym3 = {
  id: 'gym3', name: 'Arène de Rocheval', type: 'grid', theme: 'roche', music: 'gym', area: 'rocheval', cell: 2, allowPush: true,
  layout: [
    '################',
    '#P....,,,,....P#',
    '#.....,,,,.....#',
    '#..............#',
    '#HHHHHHH#HHHHHH#',
    '#..............#',
    '#..O.......O...#',
    '#....##..##....#',
    '#.O..........O.#',
    '#HHHHH#HH#HHHHH#',
    '#..............#',
    '#....O....O....#',
    '#..............#',
    '#######E########',
  ],
  exit: { to: 'rocheval', entry: 'door:gym' },
  lamps: [[0, -6], [0, 6]],
  trainers: [
    { id: 'gym3_t1', cls: 'mineur', name: 'Mineur Bertrand', cell: [12, 10], rot: O, sight: 4, level: 22, team: [['boulix', 21], ['taupipeur', 22]] },
    { id: 'gym3_t2', cls: 'randonneur', name: 'Randonneur Hervé', cell: [2, 5], rot: E, sight: 4, level: 23, team: [['gravillon', 22], ['taurulithe', 23]] },
    { id: 'gym3_leader', cls: 'leader', name: 'Brann', cell: [7, 1], rot: S, sight: 0, leader: { badge: 'roc', tm: 'dt15', field: 'Force' },
      look: { gender: 'f', skin: '#c68863', hair: '#5a3a22', hairStyle: 'bun', top: '#c09060', bottom: '#4a3a2a', accent: '#ffd23f', hat: 'helmet', big: true },
      team: [['boulix', 23], ['taurulithe', 24], ['gravillon', 24], ['cristalis', 26, { item: 'baie_oran', moves: ['coup_eboulis', 'joyau', 'carapace', 'brise_lumineuse'] }]],
      intro: ['Tu as réussi à traverser ma salle ? Pas mal du tout.', 'Je suis Brann. Mes Lumins sont aussi durs que la pierre de Rocheval. Prépare-toi !'],
      defeat: ['Hmph… La pierre s\'est fendue. Tu as gagné le Badge Roc !'],
      after: ['Avec le Badge Roc, tes Lumins peuvent utiliser Force pour pousser les gros rochers ronds.', 'La Route 4 mène à Sablons, la ville du désert.'] },
  ],
  npcs: [{ id: 'gym3_guide', kind: 'homme', name: 'Guide', cell: [9, 12], rot: N, script: 'gym_guide', guide: ['roche'] }],
  items: [{ cell: [1, 3], item: 'super_potion' }],
};
