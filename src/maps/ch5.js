import { N, S, E, O, tr, pnj, lumin, sign, prop, item, hidden, lamps, en } from './helpers.js';

/* ═══════════════════════════════════════════════════════════════════════
   CHAPITRE 5 — Route 8 (Passerelles Célestes), Astralis, Arène Cosmique,
   Route 9 (Plateau des Vents), Route Victoire, Ligue du Zénith
   ═══════════════════════════════════════════════════════════════════════ */

export const r8 = {
  id: 'r8', name: 'Route 8', sub: 'Passerelles Célestes', type: 'route', biome: 'celeste', music: 'route8', size: [100, 300], seed: 193, hills: 2.4,
  paths: [[[0, 151], [-12, 110], [10, 70], [-8, 30], [12, -10], [-10, -50], [8, -90], [-4, -120], [6, -151]], [[12, -10], [36, -20]]],
  lakes: [[-30, 90, 9], [30, 40, 8], [-30, -80, 8]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'cendrelave', entry: 'north' }, { edge: 'north', at: 6, w: 10, to: 'astralis', entry: 'south' }],
  buildings: [{ id: 'temple', kind: 'temple', x: 38, z: -34, rot: O, to: 'templevent', entry: 'south', name: 'Temple du Vent', closed: { unless: 'champion', msg: ['Une force invisible repousse vos pas.', 'Une inscription : « Seul un Champion peut entendre le chant du vent. »'] } }],
  grass: [[22, 120, 12, 18], [-24, 50, 12, 18], [24, 8, 12, 16], [-26, -26, 12, 16], [22, -64, 12, 18], [-22, -110, 12, 16]],
  props: [
    sign(6, 140, S, 'Route 8', ['ROUTE 8 — PASSERELLES CÉLESTES', 'Nord : Astralis, la cité céleste']),
    prop('veg', -16, 0, 0, { kind: 'crystal0', r: 0.6 }), prop('veg', 18, -40, 0, { kind: 'crystal1', r: 0.6 }), prop('veg', -18, -70, 0, { kind: 'pillar1', r: 0.7 }),
  ],
  trainers: [
    tr('pro_f', 'Juliette', -6, 120, E, 44, 3),
    tr('medium', 'Céline', 4, 84, O, 44, 4),
    tr('gentleman', 'Édouard', -4, 44, E, 45, 3),
    tr('aristo', 'Victoire', 6, 4, O, 46, 3),
    tr('ornithologue', 'Mathis', -4, -36, E, 46, 4),
    tr('karateka', 'Shinji', 2, -76, O, 47, 3),
    tr('pro_m', 'Lucas', 2, -112, S, 49, 4),
  ],
  items: [item(-38, 94, 'dt22'), item(38, 44, 'pierre_soleil'), item(-38, -84, 'dt24'), hidden(40, 120, 'eclat_etoile'), item(-40, 10, 'hyper_potion', 3), hidden(40, -120, 'pepite')],
  encounters: {
    grass: [en('feovire', 40, 43, 14), en('cosmovore', 42, 45, 10), en('lunetrit', 41, 44, 10, 'night'), en('mecarach', 40, 43, 12), en('femireelle', 42, 45, 6), en('aiglarion', 40, 43, 12), en('aceraptor', 40, 43, 10), en('colomage', 40, 43, 10), en('colomagus', 44, 46, 4), en('femiree', 40, 42, 6)],
    surf: [en('corallune', 40, 46, 30), en('sirenote', 42, 46, 20), en('corallys', 44, 48, 10)], fish: [en('drakonet', 40, 44, 6), en('carpaillon', 35, 42, 50), en('carpeclat', 40, 45, 15)],
  },
};

export const astralis = {
  id: 'astralis', name: 'Astralis', sub: 'La cité céleste', type: 'town', biome: 'celeste', style: 'cite', music: 'town9', pathLayer: 'cobble',
  size: [130, 120], seed: 201, fly: [0, 10, 0], shop: 'astralis',
  plazas: [[0, 6, 13]],
  paths: [[[6, 61], [4, 30], [0, 6]], [[0, 6], [0, -61]], [[0, 6], [-28, 0], [-28, -4]], [[0, 6], [30, 0], [30, -2]], [[0, 6], [-30, 24], [-34, 28]], [[0, 6], [30, 24], [34, 28]], [[0, -24], [-24, -36]], [[0, -24], [22, -34]]],
  exits: [{ edge: 'south', at: 6, w: 10, to: 'r8', entry: 'north' }, { edge: 'north', at: 0, w: 10, to: 'r9', entry: 'south' }],
  buildings: [
    { id: 'center', kind: 'center', x: -28, z: -12, rot: S },
    { id: 'dept', kind: 'dept', x: 32, z: -12, rot: S, name: 'Grand Magasin', label: 'GRAND MAGASIN', interior: { preset: 'dept', counters: [
      { name: 'Soins', shop: 'soins' }, { name: 'Prismes', shop: 'prismes' }, { name: 'Combat', shop: 'combat' }, { name: 'Évolution', shop: 'evolution' }, { name: 'Vitamines', shop: 'vitamines' }] } },
    { id: 'gym', kind: 'gym', x: -26, z: -44, rot: E, type: 'psy', to: 'gym8', entry: 'door', label: 'ARÈNE' },
    { id: 'tour', kind: 'tower', x: 26, z: -42, rot: O, name: 'Tour de Combat', label: 'TOUR DE COMBAT', interior: { preset: 'tower' } },
    { id: 'observatoire', kind: 'bighouse', x: -34, z: 36, rot: N, name: 'Observatoire', interior: { npcs: [
      { id: 'astronome', kind: 'savant', name: 'Astronome', x: 0, z: -1, rot: S, talk: ['Les étoiles de Lumeria brillent de nouveau, merci à toi !', 'On raconte qu\'un quatrième Gardien, Zénithar, n\'apparaît qu\'aux Champions ayant rencontré les trois Gardiens de la terre, du ciel et des mers.'] },
    ] } },
    { id: 'maison1', kind: 'house', x: 34, z: 36, rot: N, name: 'Maison du Tuteur', interior: { npcs: [
      { id: 'tuteur_ast', kind: 'savant', name: 'Grand Tuteur', x: 0, z: -0.5, rot: S, script: 'tutor' },
    ] } },
  ],
  props: [
    prop('fountain', 0, 6), ...lamps([[-10, -6], [10, -6], [-10, 18], [10, 18], [-20, 6], [20, 6], [-6, -34], [6, -34]], 'modern'),
    sign(12, 50, S, 'ASTRALIS', ['ASTRALIS', '« La cité céleste, plus proche des étoiles. »']),
    sign(-12, -40, S, 'Arène', ['ARÈNE D\'ASTRALIS', 'Champion : Céleste', '« L\'esprit voit au-delà des étoiles. »']),
    prop('bench', -14, 22, N), prop('bench', 14, 22, N), prop('planter', -16, -10), prop('planter', 16, -10),
  ],
  npcs: [
    pnj('touriste', 'Touriste', 8, 30, S, ['La Tour de Combat accueille les meilleurs dresseurs de la région.', 'Sept victoires d\'affilée, et on gagne des Points Combat !'], { wander: 4 }),
    pnj('homme', 'Citadin', -14, 14, E, ['Céleste, notre Champion, lit dans les étoiles. Ses Lumins Cosmique craignent les types Ténèbres et Cosmique.']),
    pnj('femme', 'Citadine', 18, -24, S, ['Au nord, la Route 9 mène à la Route Victoire, puis à la Ligue du Zénith.', 'Il faut les huit badges pour y entrer !']),
  ],
  items: [hidden(-60, 54, 'eclat_etoile'), item(60, -54, 'hyper_prisme', 3)],
};

/* ARÈNE 8 — Céleste (Cosmique) : salles reliées par des téléporteurs */
export const gym8 = {
  id: 'gym8', name: 'Arène d\'Astralis', type: 'grid', theme: 'psy', music: 'gym', area: 'astralis', cell: 2,
  layout: [
    '#####################',
    '#.....#,,,,,#.......#',
    '#.2...#,,,,,#....5..#',
    '#.....#,,,,,#.......#',
    '#...3.#,,6,,#.7.....#',
    '#####################',
    '#.6...#.....#.......#',
    '#.....#..4..#.3.....#',
    '#.....#.....#.......#',
    '#...7.#.8...#.....4.#',
    '#####################',
    '#...........#..5....#',
    '#........1..#.......#',
    '#..2........#....1..#',
    '#...........#......8#',
    '#####E###############',
  ],
  exit: { to: 'astralis', entry: 'door:gym' },
  lamps: [[-10, -8], [10, -8], [-10, 8], [10, 8]],
  trainers: [
    { id: 'gym8_t1', cls: 'medium', name: 'Médium Aude', cell: [11, 12], rot: O, sight: 4, level: 46, team: [['cosmovore', 45], ['lunetrit', 46]] },
    { id: 'gym8_t2', cls: 'scientifique', name: 'Psychiste Hugo', cell: [19, 12], rot: O, sight: 4, level: 47, team: [['comelune', 46], ['hibouleon', 46], ['cosmodea', 47]] },
    { id: 'gym8_t3', cls: 'medium', name: 'Médium Lise', cell: [4, 7], rot: S, sight: 2, level: 47, team: [['colomagus', 46], ['cosmodenix', 47]] },
    { id: 'gym8_t4', cls: 'gentleman', name: 'Gentleman Paul', cell: [15, 3], rot: E, sight: 3, level: 48, team: [['nuitmopulsar', 47], ['cosmovore', 48]] },
    { id: 'gym8_leader', cls: 'leader', name: 'Céleste', cell: [9, 1], rot: S, sight: 0, leader: { badge: 'zenith', tm: 'dt19', field: null },
      look: { gender: 'm', skin: '#f1c9a5', hair: '#c8a8ff', hairStyle: 'long', top: '#ff6fa8', bottom: '#ffffff', accent: '#ffd23f', outfit: 'robe', cape: '#5a3a8a' },
      team: [['comelune', 47], ['colomagus', 48], ['nebulynx', 49], ['lunetris', 49], ['cosmosia', 51, { item: 'baie_sitrus', moves: ['pulsar', 'onde_stellaire', 'meditation', 'eclat_prisme'] }]],
      intro: ['Je t\'attendais. Les étoiles m\'avaient annoncé ta venue.', 'Je suis Céleste. Ton esprit a traversé huit épreuves… mais celle-ci est la plus redoutable.', 'Que nos pensées s\'affrontent !'],
      defeat: ['Mes visions ne m\'avaient pas montré cette fin… Voici le Badge Zénith, le dernier.'],
      after: ['Avec les huit badges, tu peux franchir la Route Victoire.', 'La Ligue du Zénith t\'attend. Que les étoiles te guident.'] },
  ],
  npcs: [{ id: 'gym8_guide', kind: 'homme', name: 'Guide', cell: [2, 11], rot: E, script: 'gym_guide', guide: ['astral'] }],
  items: [{ cell: [10, 8], item: 'guerison' }, { cell: [19, 6], item: 'hyper_potion' }, { cell: [4, 1], item: 'rappel' }],
};

export const r9 = {
  id: 'r9', name: 'Route 9', sub: 'Plateau des Vents', type: 'route', biome: 'montagne', music: 'route9', size: [96, 260], seed: 211, hills: 3.4,
  paths: [[[0, 131], [10, 96], [-10, 56], [10, 16], [-10, -24], [8, -64], [-6, -100], [0, -126]]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'astralis', entry: 'north' }],
  buildings: [{ id: 'victoire', kind: 'cave', x: 0, z: -132, rot: S, to: 'victoire', entry: 'south', name: 'Route Victoire' }],
  grass: [[-22, 100, 12, 18], [22, 60, 12, 18], [-24, 20, 12, 18], [22, -24, 12, 18], [-22, -70, 12, 16]],
  lakes: [[28, 100, 7]],
  props: [
    sign(6, 120, S, 'Route 9', ['ROUTE 9 — PLATEAU DES VENTS', 'Nord : Route Victoire, Ligue du Zénith']),
    { t: 'gate', x: 6, z: 110, rot: 0.3, w: 8 },
  ],
  npcs: [pnj('garde', 'Garde de la Ligue', 8, 106, S, ['Halte ! Seuls les dresseurs possédant les huit badges peuvent passer.'], { id: 'r9_garde', unless: 'badge:zenith', r: 4 })],
  trainers: [
    tr('pro_m', 'Gabriel', 2, 84, O, 48, 4),
    tr('pro_f', 'Emma', -2, 44, E, 49, 4),
    tr('karateka', 'Takeshi', 4, 4, O, 49, 4),
    tr('gentleman', 'Albéric', -4, -36, E, 50, 3),
    tr('pro_m', 'Raphaël', 2, -76, O, 51, 4),
    tr('pro_f', 'Sarah', -2, -112, E, 52, 4),
  ],
  items: [item(-38, 100, 'dt25'), item(38, -40, 'max_repousse', 2), hidden(-40, 0, 'eclat_etoile'), item(40, 20, 'guerison', 2), item(-36, -96, 'rappel_max')],
  encounters: {
    grass: [en('rochbrutus', 45, 48, 12), en('taurocolosse', 46, 49, 12), en('aceraptor', 46, 49, 8), en('colomagus', 46, 49, 10), en('blindacier', 47, 50, 4), en('drakonet', 45, 48, 4), en('boulixor', 45, 48, 12), en('strateon', 46, 49, 8), en('hibouleon', 45, 48, 10, 'night'), en('chauvampire', 45, 48, 10, 'night')],
    surf: [en('corallys', 45, 50, 40), en('goelarge', 45, 50, 40), en('drakoreal', 48, 52, 5)], fish: [en('drakonet', 42, 48, 10), en('carpeclat', 44, 50, 30), en('carpaillon', 40, 46, 40)],
  },
};

export const victoire = {
  id: 'victoire', name: 'Route Victoire', sub: 'L\'ultime épreuve', type: 'cave', biome: 'grotte', music: 'cave2', size: [96, 190], seed: 221,
  paths: [[[0, 96], [-14, 64], [12, 30], [-16, -4], [14, -40], [-12, -72], [6, -96]], [[12, 30], [32, 40]], [[-16, -4], [-34, -16]], [[14, -40], [34, -54]]],
  plazas: [[0, 80, 7], [32, 42, 7], [-34, -18, 7], [34, -56, 7], [-12, -72, 8]],
  lakes: [[-20, 30, 7]],
  pathWidth: 3.4,
  exits: [{ edge: 'south', at: 0, w: 8, to: 'r9', entry: 'door:victoire' }, { edge: 'north', at: 6, w: 8, to: 'ligue', entry: 'south' }],
  obstacles: [{ t: 'smash', x: 24, z: 36 }, { t: 'boulder', x: -26, z: -10 }, { t: 'boulder', x: 26, z: -48 }, { t: 'smash', x: -4, z: -62 }],
  props: [prop('torch', 4, 86), prop('torch', -4, 86), prop('torch', -10, -80), prop('torch', 10, -86)],
  trainers: [
    tr('pro_m', 'Maxence', -10, 56, E, 50, 4),
    tr('pro_f', 'Clémence', 6, 22, O, 51, 4),
    tr('karateka', 'Bruce', -12, -10, E, 52, 4),
    tr('randonneur', 'Gustave', 10, -34, O, 52, 4),
    tr('pro_m', 'Vincent', -8, -66, S, 53, 4),
    tr('pro_f', 'Adèle', 4, -88, E, 54, 5),
  ],
  items: [item(36, 46, 'dt36'), item(-38, -20, 'pp_plus'), item(38, -60, 'dt38'), hidden(-22, 30, 'eclat_etoile'), item(-16, -76, 'guerison', 2), hidden(0, 80, 'pepite')],
  encounters: {
    cave: [en('cristarque', 49, 52, 8), en('boulixor', 48, 51, 14), en('taupitrepan', 48, 51, 14), en('chauvampire', 48, 52, 14), en('drakoreal', 50, 53, 4), en('blindacier', 49, 52, 6), en('rochbrutus', 48, 51, 12), en('lunetris', 50, 53, 6), en('volriquor', 48, 51, 10), en('geobastion', 49, 52, 8)],
    surf: [en('carpeclat', 48, 54, 50), en('drakoreal', 50, 54, 10), en('goelarge', 48, 54, 40)], fish: [en('carpeclat', 46, 52, 50), en('drakonet', 44, 50, 20), en('carpaillon', 40, 50, 30)],
  },
};

export const ligue = {
  id: 'ligue', name: 'Ligue du Zénith', sub: 'Le sommet des dresseurs', type: 'town', biome: 'celeste', style: 'ligue', music: 'ligue', pathLayer: 'cobble',
  size: [100, 100], seed: 231, fly: [0, 18, 0], shop: 'ligue',
  plazas: [[0, 10, 12]],
  paths: [[[6, 51], [2, 30], [0, 10]], [[0, 10], [0, -22]], [[0, 10], [-24, 2], [-24, -2]], [[0, 10], [26, 4], [32, 0]]],
  exits: [{ edge: 'south', at: 6, w: 10, to: 'victoire', entry: 'north' }],
  buildings: [
    { id: 'center', kind: 'center', x: -24, z: -8, rot: S, interior: { mart: true, shop: 'ligue' } },
    { id: 'ligue', kind: 'league', x: 0, z: -36, rot: S, to: 'conseil1', entry: 'door', name: 'Ligue du Zénith' },
    { id: 'sanctuaire', kind: 'temple', x: 34, z: -10, rot: O, to: 'sanctuaire', entry: 'door', name: 'Sanctuaire du Zénith', closed: { unless: 'guardians', msg: ['Les portes du sanctuaire restent closes.', 'Gravé sur la pierre : « Quand la Terre, le Ciel et les Mers auront répondu, le Zénith s\'ouvrira. »'] } },
  ],
  props: [
    prop('statue', -8, 10, 0, { arg: '#ffd23f' }), prop('statue', 8, 10, 0, { arg: '#ffd23f' }), ...lamps([[-10, -2], [10, -2], [-10, 22], [10, 22], [-4, -20], [4, -20]], 'modern'),
    sign(10, 40, S, 'LIGUE DU ZÉNITH', ['LIGUE DU ZÉNITH', '« Ici se forgent les légendes. »', 'Conseil des 4 et Championne : Orsane']),
  ],
  npcs: [
    pnj('garde', 'Garde', 6, -24, S, ['Au-delà de cette porte, le Conseil des 4 vous attend.', 'Une fois entré, vous devrez vaincre les quatre membres puis la Championne d\'affilée !', 'Préparez bien vos Lumins.']),
    pnj('vieux', 'Ancien Champion', -16, 24, E, ['Il y a quarante ans, j\'étais Champion moi aussi.', 'Le secret ? Une équipe variée qui couvre ses propres faiblesses.']),
  ],
  triggers: [{ x: 0, z: -18, w: 16, d: 4, unless: 'rival5', script: 'rival5' }],
};

/* CONSEIL DES 4 ET CHAMPIONNE — une salle par membre */
const councilRoom = (n, theme, member, nextTo) => ({
  id: `conseil${n}`, name: `Ligue — ${member.title}`, type: 'grid', theme, music: n === 5 ? 'champion' : 'conseil', area: 'ligue', cell: 2, noEscape: true,
  themeOverride: member.themeOverride,
  layout: [
    '#####S#####',
    '#,,,,,,,,,#',
    '#P,,,,,,,P#',
    '#.........#',
    '#P.......P#',
    '#.........#',
    '#P.......P#',
    '#.........#',
    '#####E#####',
  ],
  exit: { to: n === 1 ? 'ligue' : `conseil${n - 1}`, entry: n === 1 ? 'door:ligue' : 'top' },
  entries: { door: [5, 7, Math.PI], top: [5, 1, 0] },
  lamps: [[0, 0]],
  warps: [{ cell: [5, 0], to: nextTo, entry: 'door', if: member.flag }],
  trainers: [{ ...member.trainer, cell: [5, 2], rot: S, sight: 0 }],
});

export const conseil1 = councilRoom(1, 'repaire', { title: 'Sabine', flag: 'e4_1', themeOverride: { floorColor: '#5a3a6a', accent: '#b25ad9', wallColor: '#3a2a4a' }, trainer: {
  id: 'e4_sabine', cls: 'conseil', name: 'Sabine', e4: 1, look: { gender: 'f', skin: '#f1c9a5', hair: '#b25ad9', hairStyle: 'curly', top: '#5a2a6a', bottom: '#2a1a3a', accent: '#7dff9c', outfit: 'dress' },
  team: [['venicobrax', 54], ['dracidiane', 55], ['champignard', 55], ['venimorena', 56], ['venechat', 57, { item: 'restes' }]],
  intro: ['Bienvenue au Conseil des 4. Je suis Sabine, la première épreuve.', 'Mes poisons sont lents… mais personne n\'y échappe.'], defeat: ['Mon venin n\'a pas suffi. Avance, la suite t\'attend.'], after: ['Va. Les autres sont bien plus coriaces que moi.'] } }, 'conseil2');
export const conseil2 = councilRoom(2, 'roche', { title: 'Garrick', flag: 'e4_2', themeOverride: { floorColor: '#8a5a3a', accent: '#d4543e' }, trainer: {
  id: 'e4_garrick', cls: 'conseil', name: 'Garrick', e4: 2, look: { gender: 'm', skin: '#8d5a3b', hair: '#1a1a1a', hairStyle: 'bald', top: '#ffffff', bottom: '#ffffff', outfit: 'gi', belt: '#1a1a1a', big: true },
  team: [['taupitrepan', 55], ['taurocolosse', 56], ['fornaxis', 56], ['draktor', 57], ['teranoth', 58, { item: 'ceinture_noire' }]],
  intro: ['Je suis Garrick ! Mes Lumins Sol ont brisé des montagnes !', 'Pas de stratégie compliquée : la force de la terre ! HAAA !'], defeat: ['Hah ! Quelle puissance ! Tu as gagné, sans discussion !'], after: ['Continue ! Montre ta force aux autres !'] } }, 'conseil3');
export const conseil3 = councilRoom(3, 'centrale', { title: 'Ferrand', flag: 'e4_3', themeOverride: { floorColor: '#a9b4c2', accent: '#5fd4ff' }, trainer: {
  id: 'e4_ferrand', cls: 'conseil', name: 'Ferrand', e4: 3, look: { gender: 'm', skin: '#e8b98f', hair: '#a9b4c2', hairStyle: 'short', top: '#4a5a6a', bottom: '#2a2a3a', accent: '#5fd4ff', glasses: true, elder: true },
  team: [['geobastion', 56], ['forgamurex', 56], ['aceraptor', 57], ['mecarachnis', 57], ['blindacier', 58, { item: 'peau_metal' }]],
  intro: ['Je suis Ferrand. Mes Lumins Acier ont la rigueur du métal forgé.', 'Chaque faille dans ta stratégie, je la trouverai.'], defeat: ['Une défense parfaite… mais une attaque encore meilleure. Bravo.'], after: ['La dernière du Conseil t\'attend. Elle est… d\'un autre monde.'] } }, 'conseil4');
export const conseil4 = councilRoom(4, 'psy', { title: 'Draëlle', flag: 'e4_4', themeOverride: { floorColor: '#2a2a5a', accent: '#5a6cff', wallColor: '#1a1a3a' }, trainer: {
  id: 'e4_draelle', cls: 'conseil', name: 'Draëlle', e4: 4, look: { gender: 'f', skin: '#f3d0b0', hair: '#5a6cff', hairStyle: 'long', top: '#1a1a3a', bottom: '#1a1a3a', accent: '#ffd23f', cape: '#5a6cff', outfit: 'robe' },
  team: [['drakamor', 57], ['hydraconde', 57], ['drakoreal', 58], ['draktanos', 58], ['dracelios', 59, { item: 'cuillere_tordue' }]],
  intro: ['Je suis Draëlle, gardienne des Lumins Dragon, nés avant même les étoiles.', 'Personne ne m\'a vaincue depuis trois ans. Seras-tu le premier ?'], defeat: ['Les étoiles se sont alignées pour toi… Va, la Championne t\'attend.'], after: ['Orsane est derrière cette porte. Elle est la plus forte de Lumeria.'] } }, 'conseil5');
export const conseil5 = councilRoom(5, 'ligue', { title: 'Championne Orsane', flag: 'champion_room', themeOverride: { floorColor: '#f4f0e6', accent: '#ffd23f' }, trainer: {
  id: 'champion_orsane', cls: 'champion', name: 'Orsane', e4: 5, look: { gender: 'f', skin: '#d9a77c', hair: '#ffd23f', hairStyle: 'long', top: '#ffffff', bottom: '#2a3a7a', accent: '#ffd23f', cape: '#c83a3a' },
  team: 'champion',
  intro: ['Te voilà enfin. J\'ai suivi ton voyage depuis Clairvent, tu sais.', 'L\'Ordre du Crépuscule, Nyctaris… Tu as sauvé Lumeria. Mais ici, je ne suis pas ton alliée.', 'Je suis Orsane, Championne de la Ligue du Zénith. Donne-moi tout ce que tu as !'],
  defeat: ['… Magnifique. Tu es le nouveau Champion de Lumeria !'], after: ['Viens, il est temps d\'entrer dans le Panthéon.'], onWin: 'champion_win' } }, 'pantheon');
conseil5.warps = [];
conseil5.layout = conseil5.layout.map((r, i) => (i === 0 ? '###########' : r));

export const sanctuaire = {
  id: 'sanctuaire', name: 'Sanctuaire du Zénith', type: 'grid', theme: 'temple', music: 'legend', area: 'ligue', cell: 2,
  layout: [
    '#############',
    '#P,,,,,,,,,P#',
    '#,,,,,,,,,,,#',
    '#P.........P#',
    '#...........#',
    '#P.........P#',
    '#...........#',
    '######E######',
  ],
  exit: { to: 'ligue', entry: 'door:sanctuaire' },
  lamps: [[0, -2]],
  npcs: [{ id: 'zenithar', creature: 'zenithar', name: 'Zénithar', cell: [6, 2], rot: S, unless: 'zenithar', script: 'legend', legend: { species: 'zenithar', level: 70, flag: 'zenithar' } }],
};
