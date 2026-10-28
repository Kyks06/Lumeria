import { N, S, E, O, tr, pnj, lumin, sign, prop, item, hidden, lamps, en } from './helpers.js';

/* ═══════════════════════════════════════════════════════════════════════
   CHAPITRE 4 — Route 6 (Marais des Saules), Col Givré, Givrecime, Arène Glace,
   Route 7 (Coulées de Cendre), Cendrelave, Arène Feu, Sommet de Cendrelave
   ═══════════════════════════════════════════════════════════════════════ */

export const r6 = {
  id: 'r6', name: 'Route 6', sub: 'Marais des Saules', type: 'route', biome: 'marais', music: 'route6', size: [92, 270], seed: 133, hills: 1.2,
  paths: [[[0, 136], [8, 100], [-10, 64], [4, 24], [-14, -16], [6, -56], [-8, -96], [6, -126]], [[4, 24], [24, 30]]],
  lakes: [[24, 80, 10], [-26, 0, 9], [26, -40, 8], [-24, -110, 7]],
  rivers: [{ pts: [[-46, 44], [-10, 44], [20, 50], [46, 46]], w: 6 }],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'brumevase', entry: 'north' }],
  buildings: [{ id: 'col', kind: 'cave', x: 6, z: -133, rot: S, to: 'col', entry: 'south', name: 'Col Givré' }],
  grass: [[-22, 112, 14, 18], [22, 110, 12, 14], [-26, 44 - 16, 14, 12], [24, 4, 12, 18], [-24, -60, 12, 18], [22, -90, 12, 18]],
  props: [
    { t: 'bridge', x: -3.5, z: 45.3, rot: -0.337, len: 15, w: 3.4 },
    sign(6, 124, S, 'Route 6', ['ROUTE 6 — MARAIS DES SAULES', 'Nord : Col Givré → Givrecime']),
    prop('tent', 26, 30, 1.2, { arg: '#5a7a3a' }), prop('campfire', 28, 34),
  ],
  npcs: [pnj('eleveuse', 'Herboriste', 24, 34, O, ['Les marais regorgent de plantes médicinales.', 'Tiens, prends quelques baies.'], { id: 'r6_herbo', give: { item: 'baie_sitrus', qty: 3, flag: 'r6_baies' } })],
  trainers: [
    tr('medium', 'Agathe', 6, 112, O, 32, 3),
    tr('pecheur', 'Gaston', 11, 75, O, 33, 3),
    tr('eleveuse', 'Rosalie', -14, 30, S, 33, 3),
    tr('scout', 'Manon', 10, -4, O, 34, 3),
    tr('ornithologue', 'Hector', -18, -40, E, 34, 3),
    tr('campeur', 'Bastien', 12, -72, S, 35, 3),
    tr('medium', 'Sibylle', -12, -106, E, 36, 3),
  ],
  items: [item(30, 84, 'dt17'), item(-32, 4, 'hyper_prisme', 2), item(32, -44, 'pierre_plante'), item(-30, -114, 'guerison'), hidden(40, 120, 'pepite'), hidden(-40, -60, 'eclat_etoile'), item(-38, 70, 'rappel', 2)],
  encounters: {
    grass: [en('grenouflet', 30, 33, 16), en('spectrouille', 30, 34, 14), en('libellux', 31, 34, 12), en('viiraule', 30, 33, 12), en('champignard', 32, 35, 8), en('champex', 30, 32, 10), en('pipereux', 32, 35, 12, 'night'), en('gloupy', 31, 34, 4), en('hydrollon', 33, 35, 4)],
    surf: [en('grenouflet', 32, 38, 35), en('libellux', 32, 36, 25), en('grenoufle', 35, 38, 8), en('hydrollon', 33, 38, 12), en('corallune', 30, 36, 20)],
    fish: [en('grenouflet', 28, 34, 45), en('carpeclat', 32, 36, 12), en('carpaillon', 28, 34, 40), en('hydrolle', 30, 34, 10)],
  },
};

export const col = {
  id: 'col', name: 'Col Givré', sub: 'Galeries de glace obscures', type: 'cave', biome: 'grotte', music: 'cave2', size: [74, 150], seed: 141, dark: true,
  biomeOverride: { tint: '#e0ecff', tintB: '#b8c8e0', layers: ['snow', 'dirt', 'rock', 'cave'], trees: [['icespike', 0.6], ['crystal', 0.4]], sky: { background: '#06080e', caveSky: '#4a5a80' } },
  paths: [[[0, 76], [-8, 46], [10, 16], [-6, -14], [12, -44], [-4, -76]], [[10, 16], [26, 26]], [[-6, -14], [-24, -28]]],
  plazas: [[-8, 46, 7], [26, 28, 6], [-24, -30, 7], [12, -44, 7]],
  pathWidth: 3.2,
  exits: [{ edge: 'south', at: 0, w: 8, to: 'r6', entry: 'door:col' }, { edge: 'north', at: -4, w: 8, to: 'givrecime', entry: 'south' }],
  warps: [{ x: -28, z: -36, r: 1.3, to: 'grotteglace', entry: 'south', if: 'champion', visual: true }],
  entries: { gg: [-28, -32, 0] },
  props: [prop('torch', 3, 66), prop('torch', -3, 66), prop('crate', -12, 50)],
  obstacles: [{ t: 'smash', x: 22, z: 22 }, { t: 'boulder', x: -18, z: -24 }],
  trainers: [
    tr('skieuse', 'Célia', -4, 40, E, 34, 3),
    tr('mineur', 'Albert', 6, 6, O, 35, 3),
    tr('montagnard', 'Igor', 4, -30, S, 36, 3),
    tr('skieuse', 'Inès', 6, -60, O, 37, 3),
  ],
  items: [item(28, 30, 'dt18'), item(-26, -26, 'pierre_glace'), hidden(14, -48, 'eclat_etoile'), item(-12, 40, 'hyper_potion', 2)],
  encounters: { cave: [en('flocounet', 32, 35, 16), en('chauvampire', 33, 36, 14), en('cristalis', 33, 36, 8), en('glenuos', 32, 35, 12), en('grivelynx', 33, 36, 10), en('boulixor', 33, 36, 10), en('taupitrepan', 33, 36, 8), en('gelusros', 32, 35, 8)] },
};

export const givrecime = {
  id: 'givrecime', name: 'Givrecime', sub: 'La cité des neiges éternelles', type: 'town', biome: 'neige', style: 'neige', music: 'town7',
  size: [110, 100], seed: 151, fly: [0, 6, 0], shop: 'givrecime', hills: 1,
  plazas: [[0, 4, 10]],
  paths: [[[0, 51], [0, 4]], [[0, 4], [-10, -51]], [[0, 4], [-24, -6], [-24, -8]], [[0, 4], [24, -6], [24, -10]], [[0, 4], [26, 22], [26, 26]], [[0, 4], [-26, 20], [-30, 22]], [[-6, -38], [10, -38]]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'col', entry: 'north' }, { edge: 'north', at: -10, w: 10, to: 'r7', entry: 'south' }],
  buildings: [
    { id: 'center', kind: 'center', x: -24, z: -16, rot: S },
    { id: 'shop', kind: 'shop', x: 24, z: -18, rot: S },
    { id: 'gym', kind: 'gym', x: 18, z: -38, rot: O, type: 'glace', to: 'gym6', entry: 'door', label: 'ARÈNE' },
    { id: 'chalet', kind: 'house', x: 26, z: 32, rot: N, name: 'Chalet', interior: { preset: 'cabin', npcs: [
      { id: 'giv_m1', kind: 'vieille', name: 'Grand-mère', x: 0, z: -0.5, rot: S, talk: ['Bois un bon chocolat chaud, petit.', 'Hivane, notre Championne, a une arène de glace. On y glisse jusqu\'à toucher un obstacle !'] },
    ] } },
    { id: 'maison2', kind: 'house', x: -30, z: 30, rot: E, interior: { preset: 'cabin', npcs: [
      { id: 'giv_m2', kind: 'homme', name: 'Guide de montagne', x: 0, z: 0, rot: S, talk: ['La Route 7 descend vers le volcan de Cendrelave.', 'Avec le Badge Givre, tes Lumins pourront escalader les parois rocheuses.'] },
    ] } },
    { id: 'maison3', kind: 'bighouse', x: -36, z: -36, rot: E, name: 'Maison de l\'Éleveur', interior: { npcs: [
      { id: 'giv_oeuf', kind: 'eleveur', name: 'Éleveur', x: 0, z: -1, rot: S, script: 'oeuf_cadeau' },
    ] } },
  ],
  props: [
    prop('statue', 0, 4, 0, { arg: '#e8f4ff' }), ...lamps([[-8, -6], [8, -6], [-8, 14], [8, 14], [-6, 30], [6, 30]]),
    sign(6, 40, S, 'GIVRECIME', ['GIVRECIME', '« La cité des neiges éternelles. »']),
    sign(4, -30, S, 'Arène', ['ARÈNE DE GIVRECIME', 'Championne : Hivane', '« Glisse, et ne tombe jamais. »']),
    prop('snowman', 14, 12), prop('snowman', -16, -10), prop('bench', -12, 14, N),
  ],
  npcs: [
    pnj('skieuse', 'Skieuse', 12, 20, S, ['Les pistes autour de Givrecime sont les meilleures de la région !'], { cls: 'skieuse', wander: 4 }),
    pnj('garconnet', 'Enfant', -12, -20, E, ['Les Lumins Glace de Hivane craignent le Feu, la Roche et l\'Acier !']),
    lumin('glacpille', 18, 2, O, ['Glacpille : « Pin pin ! »'], { wander: 3 }),
  ],
  items: [hidden(-48, 44, 'pepite'), item(48, -44, 'hyper_potion', 2)],
};

/* ARÈNE 6 — Hivane (Glace) : glissades sur la glace */
export const gym6 = {
  id: 'gym6', name: 'Arène de Givrecime', type: 'grid', theme: 'glace', music: 'gym', area: 'givrecime', cell: 2,
  layout: [
    '################',
    '#P....,,,,....P#',
    '#..............#',
    '######I#########',
    '#IIIIPIIIIIIIII#',
    '#IIIIPIIIIIIIPI#',
    '#IPIIIIIIIIIIII#',
    '#IIIIIIPIIIIIII#',
    '#IIIIIPIIIPIIII#',
    '#IIIPIIIIIIIIII#',
    '#IIIIIIIIIIIIII#',
    '#..............#',
    '#..............#',
    '#######E########',
  ],
  exit: { to: 'givrecime', entry: 'door:gym' },
  lamps: [[0, -6], [0, 6]],
  trainers: [
    { id: 'gym6_t1', cls: 'skieuse', name: 'Skieuse Léna', cell: [3, 12], rot: E, sight: 3, level: 37, team: [['flocounet', 36], ['glacpille', 37]] },
    { id: 'gym6_t2', cls: 'montagnard', name: 'Montagnard Boris', cell: [12, 11], rot: O, sight: 3, level: 38, team: [['gelusros', 37], ['glenuos', 37], ['grivelynx', 38]] },
    { id: 'gym6_t3', cls: 'skieuse', name: 'Skieuse Alix', cell: [11, 2], rot: O, sight: 4, level: 38, team: [['grivelynx', 37], ['glacpilleur', 38]] },
    { id: 'gym6_leader', cls: 'leader', name: 'Hivane', cell: [7, 1], rot: S, sight: 0, leader: { badge: 'givre', tm: 'dt13', field: 'Escalade' },
      look: { gender: 'f', skin: '#f3d0b0', hair: '#e8f4ff', hairStyle: 'long', top: '#8fe3f2', bottom: '#ffffff', accent: '#3a7bd5', hat: 'beanie', hatColor: '#ffffff', scarf: '#3a7bd5' },
      team: [['glacpille', 37], ['glenuar', 38], ['flocoura', 39], ['grivelion', 39], ['gelurse', 41, { item: 'baie_sitrus' }]],
      intro: ['Tu as su garder l\'équilibre jusqu\'ici. Impressionnant.', 'Je suis Hivane. Mes Lumins ont la froideur des glaciers et leur patience.', 'Voyons si ta flamme résiste au grand froid !'],
      defeat: ['La glace a fondu… Tu mérites le Badge Givre.'],
      after: ['Le Badge Givre permet d\'utiliser Escalade pour gravir les parois rocheuses.', 'Cendrelave t\'attend au bout de la Route 7. Prends garde : la terre y gronde depuis peu.'] },
  ],
  npcs: [{ id: 'gym6_guide', kind: 'homme', name: 'Guide', cell: [9, 12], rot: N, script: 'gym_guide', guide: ['glace'] }],
  items: [{ cell: [1, 2], item: 'hyper_potion' }],
};

export const r7 = {
  id: 'r7', name: 'Route 7', sub: 'Coulées de Cendre', type: 'route', biome: 'volcan', music: 'route7', size: [96, 290], seed: 163, hills: 3,
  paths: [[[-10, 146], [-4, 110], [12, 80], [-8, 40], [8, 0], [-10, -40], [10, -80], [-6, -116], [4, -146]], [[8, 0], [30, 8]]],
  ridges: [{ pts: [[-60, 40], [-20, 38], [20, 42], [60, 40]], w: 5, h: 8 }, { pts: [[-60, -80], [-20, -78], [20, -82], [60, -80]], w: 5, h: 8 }],
  lava: [[-26, 96, 8], [28, 58, 7], [-28, -16, 9], [28, -54, 7], [-24, -124, 7]],
  exits: [{ edge: 'south', at: -10, w: 10, to: 'givrecime', entry: 'north' }, { edge: 'north', at: 4, w: 10, to: 'cendrelave', entry: 'south' }],
  obstacles: [{ t: 'climb', x: -6, z: 45.5, rot: S, to: [-6, 32] }, { t: 'climb', x: 10, z: -74.5, rot: S, to: [10, -88] }, { t: 'smash', x: 28, z: 12 }],
  grass: [[16, 120, 12, 18], [-24, 64, 12, 16], [24, 20, 12, 18], [-26, -56, 12, 16], [22, -108, 12, 16]],
  plazas: [[30, 10, 6]],
  props: [
    sign(-4, 134, S, 'Route 7', ['ROUTE 7 — COULÉES DE CENDRE', 'Nord : Cendrelave', 'Attention : lave ! Parois à escalader.']),
    sign(-12, 52, S, 'Paroi', ['Une paroi rocheuse.', 'Un Lumin entraîné à l\'Escalade pourrait la gravir.']),
  ],
  trainers: [
    tr('pyromane', 'Flavien', 4, 124, O, 37, 3),
    tr('randonneur', 'Basile', 8, 92, S, 38, 3),
    tr('montagnard', 'Sven', -6, 16, E, 39, 3),
    tr('pyromane', 'Carmen', 2, -20, O, 40, 3, { lookExtra: { gender: 'f', hairStyle: 'long' } }),
    tr('karateka', 'Daisuke', -4, -56, E, 40, 3),
    tr('pro_m', 'Arthur', 6, -100, S, 41, 3),
    tr('scientifique', 'Pascal', -2, -132, E, 42, 3),
  ],
  triggers: [{ x: -8, z: 128, w: 14, d: 4, unless: 'rival4', script: 'rival4' }],
  items: [item(32, 14, 'dt30'), item(-40, 4, 'pierre_feu'), item(40, -96, 'hyper_prisme', 3), hidden(-40, 120, 'eclat_etoile'), item(38, 70, 'guerison'), hidden(-36, -100, 'pepite')],
  encounters: {
    grass: [en('pyroli', 36, 39, 16), en('flammout', 36, 40, 14), en('skronaiel', 37, 40, 10), en('braseroc', 36, 39, 14), en('galopin', 37, 40, 12), en('salamandrix', 40, 41, 3), en('braserocher', 40, 41, 2), en('boulixor', 36, 39, 8), en('pipereux', 37, 40, 10, 'night')],
  },
};

export const cendrelave = {
  id: 'cendrelave', name: 'Cendrelave', sub: 'La forge au pied du volcan', type: 'town', biome: 'volcan', style: 'volcan', music: 'town8',
  size: [110, 100], seed: 171, fly: [0, 6, 0], shop: 'cendrelave', hills: 0.8, lava: [[-42, -36, 7], [44, 36, 6]],
  plazas: [[0, 4, 10]],
  paths: [[[4, 51], [0, 4]], [[0, 4], [0, -51]], [[0, 4], [56, -10]], [[0, 4], [-24, -6], [-24, -8]], [[0, 4], [-26, 22], [-30, 24]], [[0, 4], [24, 20], [26, 24]], [[0, -40], [-12, -40]]],
  exits: [{ edge: 'south', at: 4, w: 10, to: 'r7', entry: 'north' }, { edge: 'north', at: 0, w: 10, to: 'r8', entry: 'south' }, { edge: 'east', at: -10, w: 10, to: 'sommet', entry: 'west' }],
  buildings: [
    { id: 'center', kind: 'center', x: -24, z: -16, rot: S },
    { id: 'shop', kind: 'shop', x: 22, z: -16, rot: S },
    { id: 'gym', kind: 'gym', x: -20, z: -40, rot: E, type: 'feu', to: 'gym7', entry: 'door', label: 'ARÈNE' },
    { id: 'forge', kind: 'bighouse', x: 28, z: 32, rot: N, name: 'Forge', interior: { npcs: [
      { id: 'forgeron', kind: 'ouvrier', name: 'Forgeron', x: 0, z: -1, rot: S, script: 'forgeron' },
    ] } },
    { id: 'maison2', kind: 'house', x: -30, z: 32, rot: E, interior: { npcs: [
      { id: 'cen_m2', kind: 'vieux', name: 'Sage', x: 0, z: -0.5, rot: S, talk: ['Le volcan gronde depuis que l\'Ordre est monté au sommet.', 'S\'ils réveillent Nyctaris… le soleil ne se lèvera plus jamais.'] },
    ] } },
  ],
  props: [
    prop('campfire', 0, 4), ...lamps([[-8, -6], [8, -6], [-8, 14], [8, 14], [30, -4], [44, -8]], 'lantern'),
    sign(10, 40, S, 'CENDRELAVE', ['CENDRELAVE', '« La forge au pied du volcan. »', 'Est : Sommet de Cendrelave']),
    sign(-8, -30, S, 'Arène', ['ARÈNE DE CENDRELAVE', 'Championne : Pyra', '« La flamme qui forge les héros. »']),
    prop('barrel', 14, 12), prop('crate', 16, 12), prop('stall', -12, 14, N, { arg: '#ff6a3d' }),
  ],
  npcs: [
    pnj('sbire', 'Sbire', 0, -44, S, ['Le chemin du nord est fermé par ordre de Vesper !', 'Personne ne doit déranger la cérémonie.'], { id: 'cen_blocage_n', cls: 'sbire', unless: 'sommet_done' }),
    pnj('garde', 'Garde', 48, -10, O, ['Le sentier du sommet est dangereux : la lave déborde.', 'Je ne laisse passer que les dresseurs ayant battu Pyra.'], { id: 'cen_garde', unless: 'badge:brasier' }),
    pnj('ouvrier', 'Forgeron', 14, 18, S, ['Les Lumins Feu de Pyra craignent l\'Eau, la Roche et… le Sol !'], { wander: 2 }),
  ],
  items: [hidden(-50, 44, 'pepite'), item(50, -44, 'guerison')],
};

/* ARÈNE 7 — Pyra (Feu) : tapis roulants au-dessus de la lave */
export const gym7 = {
  id: 'gym7', name: 'Arène de Cendrelave', type: 'grid', theme: 'feu', music: 'gym', area: 'cendrelave', cell: 2,
  layout: [
    '################',
    '#LLL..,,,,..LLL#',
    '#L............L#',
    '#LLLLL^LLLLLLvL#',
    '#LL>>>^<<<<<.vL#',
    '#LL^LLLLLLLL^vL#',
    '#L..>>>>>>>v...#',
    '#L^LLLLLLLLvvL^#',
    '#L^LLLLLLLLvvL^#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#######E########',
  ],
  exit: { to: 'cendrelave', entry: 'door:gym' },
  lamps: [[0, -6], [0, 6]],
  trainers: [
    { id: 'gym7_t1', cls: 'pyromane', name: 'Cracheur Lucien', cell: [5, 10], rot: E, sight: 4, level: 42, team: [['pyroli', 41], ['flammout', 41], ['galopin', 42]] },
    { id: 'gym7_t2', cls: 'karateka', name: 'Karatéka Mina', cell: [11, 1], rot: S, sight: 1, level: 43, team: [['galopyre', 42], ['galopin', 43]] },
    { id: 'gym7_t3', cls: 'pyromane', name: 'Cracheuse Vesta', cell: [2, 2], rot: E, sight: 4, level: 43, lookExtra: { gender: 'f', hairStyle: 'long' }, team: [['skronaiel', 42], ['braseroc', 42], ['salamandrix', 43]] },
    { id: 'gym7_leader', cls: 'leader', name: 'Pyra', cell: [7, 1], rot: S, sight: 0, leader: { badge: 'brasier', tm: 'dt09', field: 'Vol' },
      look: { gender: 'f', skin: '#c68863', hair: '#ff6a2a', hairStyle: 'ponytail', top: '#c83a2a', bottom: '#2a2a2a', accent: '#ffd23f', headband: true },
      team: [['skronaiel', 43], ['salamandrix', 44], ['galopyre', 44], ['braserocher', 45], ['brasillor', 46, { item: 'charbon' }]],
      intro: ['Hé ! Tu as traversé ma fournaise sans te brûler. J\'aime ça !', 'Je suis Pyra. Mes Lumins brûlent d\'une flamme que rien n\'éteint.', 'Montre-moi que ton cœur est plus chaud que la lave !'],
      defeat: ['Wouah… tu as soufflé ma flamme ! Le Badge Brasier est à toi !'],
      after: ['Avec le Badge Brasier, tes Lumins peuvent t\'emmener dans les airs : c\'est Vol !', 'Mais… regarde le sommet. L\'Ordre y prépare quelque chose de terrible. Fonce !'] },
  ],
  npcs: [{ id: 'gym7_guide', kind: 'homme', name: 'Guide', cell: [9, 11], rot: N, script: 'gym_guide', guide: ['feu'] }],
  items: [{ cell: [12, 4], item: 'guerison' }],
};

/* SOMMET DE CENDRELAVE — l'éveil de Nyctaris */
export const sommet = {
  id: 'sommet', name: 'Sommet de Cendrelave', sub: 'Le cratère des étoiles', type: 'special', biome: 'volcan', music: 'ordre', size: [90, 130], seed: 181, hills: 2.2, border: 'mountain', area: 'cendrelave',
  paths: [[[-46, 40], [-20, 34], [0, 12], [-6, -14], [0, -36]]],
  plazas: [[0, -38, 15]],
  lava: [[-30, -40, 7], [30, -36, 8], [24, 30, 7], [-30, 0, 6]],
  exits: [{ edge: 'west', at: 40, w: 10, to: 'cendrelave', entry: 'east' }],
  props: [prop('statue', -8, -50, 0.4, { arg: '#6c5a8e' }), prop('statue', 8, -50, -0.4, { arg: '#6c5a8e' }), prop('torch', -12, -30), prop('torch', 12, -30), prop('pedestal', 0, -46, 0)],
  npcs: [
    { id: 'som_vesper', name: 'Vesper', cls: 'chef', look: { gender: 'm', skin: '#e8b98f', hair: '#1a1a1a', hairStyle: 'slick', top: '#0e0818', bottom: '#0e0818', outfit: 'uniform', cape: '#2a1050', accent: '#ffd23f', big: true }, x: 0, z: -44, rot: S, unless: 'sommet_done', script: 'sommet_vesper' },
    { id: 'som_kessel', name: 'Kessel', cls: 'admin', look: { gender: 'm', skin: '#e8b98f', hair: '#c8c8d8', hairStyle: 'long', top: '#1a1030', bottom: '#120a20', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff', glasses: true }, x: -5, z: -32, rot: S, unless: 'sommet_done', script: 'sommet_vesper' },
    { id: 'som_morvane', name: 'Morvane', cls: 'admin_f', look: { gender: 'f', skin: '#f1c9a5', hair: '#ff4f7b', hairStyle: 'bob', top: '#1a1030', bottom: '#120a20', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff' }, x: 5, z: -32, rot: S, unless: 'sommet_done', script: 'sommet_vesper' },
    { id: 'som_nyctaris', creature: 'nyctaris', name: 'Nyctaris', x: 0, z: -50, rot: S, if: 'sommet_done', unless: 'nyctaris', script: 'nyctaris_retry' },
    pnj('professeur', 'Pr. Aubin', -10, 20, E, ['Les Éclats ont retrouvé leur lumière. Grâce à toi, le soleil se lèvera demain.', 'Va maintenant à Astralis, la cité céleste. La dernière arène t\'y attend.'], { id: 'som_aubin', if: 'sommet_done' }),
  ],
  trainers: [
    tr('sbire', 'Sbire', -6, 6, S, 43, 3, { id: 'som_t1', unless: 'sommet_done' }),
    tr('sbire_f', 'Sbire', 6, -14, O, 44, 3, { id: 'som_t2', unless: 'sommet_done' }),
  ],
  triggers: [{ x: 0, z: -26, w: 20, d: 4, unless: 'sommet_done', script: 'sommet_vesper' }],
  items: [item(30, -8, 'max_repousse'), hidden(-36, 20, 'eclat_etoile')],
};
