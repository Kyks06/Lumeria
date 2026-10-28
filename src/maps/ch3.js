import { N, S, E, O, tr, pnj, lumin, sign, prop, item, hidden, lamps, en } from './helpers.js';

/* ═══════════════════════════════════════════════════════════════════════
   CHAPITRE 3 — Route 4 (Sentier des Crêtes), Sablons, Centrale, Arène Foudre,
   Route 5 (Désert Ocre), Brumevase, Repaire du Crépuscule, Arène Ombre
   ═══════════════════════════════════════════════════════════════════════ */

export const r4 = {
  id: 'r4', name: 'Route 4', sub: 'Sentier des Crêtes', type: 'route', biome: 'montagne', music: 'route4', size: [92, 300], seed: 94, hills: 4.2,
  paths: [[[0, 151], [10, 110], [-14, 70], [12, 30], [-10, -10], [14, -50], [-12, -90], [6, -120], [-10, -151]], [[14, -50], [34, -60]], [[-14, 70], [-32, 84]]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'rocheval', entry: 'north' }, { edge: 'north', at: -10, w: 10, to: 'sablons', entry: 'south' }],
  plazas: [[-32, 86, 6], [34, -62, 6]],
  buildings: [{ id: 'pic', kind: 'cave', x: 38, z: -70, rot: S, to: 'pic', entry: 'south', name: 'Pic Millénaire', closed: { unless: 'champion', msg: ['Un éboulement bloque l\'entrée.', 'Un panneau : « Accès réservé aux Champions de la Ligue. »'] } }],
  grass: [[-16, 122, 14, 18], [24, 84, 12, 22], [-28, 30, 12, 20], [26, -14, 12, 20], [-28, -64, 12, 20], [22, -104, 12, 18]],
  lakes: [[-30, -124, 6]],
  props: [
    sign(6, 140, S, 'Route 4', ['ROUTE 4 — SENTIER DES CRÊTES', 'Nord : Sablons', 'Sud : Rocheval']),
    sign(-4, -140, S, 'Route 4', ['ROUTE 4', 'Sud : Rocheval']),
    prop('tent', -34, 80, 1.2, { arg: '#ffb547' }), prop('campfire', -28, 88),
  ],
  obstacles: [{ t: 'boulder', x: -24, z: 78 }, { t: 'smash', x: 26, z: -56 }, { t: 'smash', x: 30, z: -52 }],
  npcs: [pnj('randonneur', 'Alpiniste', -34, 88, E, ['Plus haut, il y a le Pic Millénaire.', 'On raconte qu\'un Gardien de pierre y dort depuis la nuit des temps.'], { cls: 'randonneur' })],
  trainers: [
    tr('randonneur', 'Gilles', 8, 124, O, 21, 2),
    tr('karateka', 'Kenji', -6, 84, S, 22, 2),
    tr('cycliste', 'Sacha', 16, 44, O, 22, 2),
    tr('mineur', 'Henri', -16, 8, E, 23, 3),
    tr('sportive', 'Laura', 8, -30, S, 24, 2),
    tr('campeur', 'Rémi', -18, -78, E, 24, 3),
    tr('randonneur', 'Olivier', 12, -112, O, 26, 2),
  ],
  items: [item(-38, 92, 'dt29'), item(40, -60, 'hyper_potion'), item(38, 120, 'super_prisme', 3), item(-38, -10, 'rappel'), hidden(30, 10, 'pepite'), hidden(-36, -128, 'perle'), item(-30, 54, 'pierre_dure')],
  encounters: {
    grass: [en('taurulithe', 19, 22, 18), en('boulix', 20, 23, 12), en('colomage', 20, 23, 14), en('aceraptor', 21, 24, 4), en('rochbras', 20, 23, 12), en('venicobra', 19, 22, 12), en('taupipeur', 20, 23, 10), en('aerilion', 20, 23, 10, 'day'), en('hibouleon', 21, 24, 8, 'night'), en('chauvelin', 20, 23, 10, 'night')],
    surf: [en('carpaillon', 20, 30, 60), en('corallune', 20, 30, 30)], fish: [en('carpaillon', 18, 25, 60), en('carpeclat', 22, 28, 4), en('grenouflet', 18, 24, 20)],
  },
};

export const sablons = {
  id: 'sablons', name: 'Sablons', sub: 'L\'oasis aux mille lanternes', type: 'town', biome: 'desert', style: 'desert', music: 'town5',
  size: [116, 104], seed: 101, fly: [0, 6, 0], shop: 'sablons', hills: 1, lakes: [[-26, 28, 8]],
  plazas: [[0, 4, 10]],
  paths: [[[-10, 53], [-4, 30], [0, 4]], [[0, 4], [0, -26]], [[0, 4], [30, 2], [59, 0]], [[0, 4], [-26, -2], [-26, -6]], [[0, 4], [24, -6], [24, -8]], [[30, 2], [30, 18], [34, 24]], [[-4, 30], [-8, 40], [-30, 44]]],
  exits: [{ edge: 'south', at: -10, w: 10, to: 'r4', entry: 'north' }, { edge: 'east', at: 0, w: 10, to: 'r5', entry: 'west' }],
  buildings: [
    { id: 'center', kind: 'center', x: -26, z: -14, rot: S },
    { id: 'shop', kind: 'shop', x: 24, z: -16, rot: S },
    { id: 'gym', kind: 'gym', x: 0, z: -40, rot: S, type: 'foudre', to: 'gym4', entry: 'door', label: 'ARÈNE', closed: { unless: 'centrale_done', msg: ['Les portes automatiques ne s\'ouvrent pas…', '« Panne de courant générale. Arène fermée. »'] } },
    { id: 'centrale', kind: 'powerplant', x: 34, z: 34, rot: N, to: 'centrale', entry: 'door', name: 'Centrale de Sablons', closed: { unless: 'blackout', msg: ['La centrale est fermée.'] } },
    { id: 'maison1', kind: 'house', x: -34, z: 44, rot: E, interior: { npcs: [
      { id: 'sab_m1', kind: 'vieille', name: 'Conteuse', x: 0, z: -0.5, rot: S, talk: ['Au-delà de Brumevase s\'étendent les terres gelées de Givrecime…', 'Et plus loin encore, le volcan de Cendrelave, où dort, dit-on, une créature qui dévore les étoiles.'] },
    ] } },
    { id: 'maison2', kind: 'house', x: 40, z: -20, rot: O, name: 'Maison du Nommeur', interior: { npcs: [
      { id: 'nommeur', kind: 'artiste', name: 'Nommeur', x: 0, z: -0.5, rot: S, script: 'nommeur' },
    ] } },
    { id: 'maison3', kind: 'house', x: -40, z: 14, rot: E, interior: { npcs: [
      { id: 'sab_m3', kind: 'homme', name: 'Ingénieur', x: 0, z: 0, rot: S, talk: ['L\'Ordre du Crépuscule a pris la centrale ! Ils détournent l\'énergie pour une machine…', 'Une machine qui ferait « sortir quelque chose de l\'Éclat », d\'après ce que j\'ai entendu.'] },
    ] } },
  ],
  props: [
    prop('well', 0, 4), ...lamps([[-8, -6], [8, -6], [-8, 14], [8, 14], [18, 2], [-16, -2]], 'lantern'),
    sign(-4, 44, S, 'SABLONS', ['SABLONS', '« L\'oasis aux mille lanternes. »']),
    sign(-6, -30, S, 'Arène', ['ARÈNE DE SABLONS', 'Champion : Volta', '« L\'éclair qui ne frappe jamais deux fois… sauf moi ! »']),
    prop('stall', 12, 14, N, { arg: '#ff9a3c' }), prop('stall', -12, 14, N, { arg: '#c58bff' }), prop('tent', -40, -34, 0.8, { arg: '#ff7a3a' }),
  ],
  npcs: [
    pnj('homme', 'Volta', 10, 24, O, ['Je suis Volta, le Champion. L\'Ordre a pris la centrale et tout est en panne !', 'Mon arène ne fonctionne plus. Aide-moi à les chasser !'], { id: 'sab_volta', look: { gender: 'm', skin: '#8d5a3b', hair: '#ffd23f', hairStyle: 'spiky', top: '#ffd23f', bottom: '#2a2a3a', accent: '#2a2a3a', glasses: true }, if: 'blackout', unless: 'centrale_done' }),
    pnj('touriste', 'Voyageuse', 6, 30, S, ['Sans électricité, impossible d\'avoir de la glace au café de l\'oasis…'], { wander: 3 }),
    pnj('garconnet', 'Gamin', -16, 18, E, ['Les Lumins Électrik de Volta craignent les attaques Sol !', 'Ah, et le Sol ne craint pas du tout l\'Électrik !']),
  ],
  triggers: [{ x: -10, z: 46, w: 14, d: 4, unless: 'blackout', script: 'blackout' }],
  items: [hidden(50, 46, 'pepite'), item(-52, -44, 'hyper_potion'), item(-16, 36, 'eau_fraiche', 3)],
  encounters: { surf: [en('elerocto', 25, 32, 40), en('corallune', 25, 30, 30), en('grenouflet', 25, 30, 30)], fish: [en('carpaillon', 20, 26, 60), en('grenouflet', 22, 28, 30), en('carpeclat', 25, 30, 5)] },
};

/* CENTRALE DE SABLONS — Admin Morvane */
export const centrale = {
  id: 'centrale', name: 'Centrale de Sablons', type: 'grid', theme: 'centrale', music: 'ordre', area: 'sablons', cell: 2,
  layout: [
    '#####################',
    '#M.......,,,.......M#',
    '#M.......,,,.......M#',
    '#M..M....,,,....M..M#',
    '#####MMMM#D#MMMM#####',
    '#d..................#',
    '#..MM...MM...MM..M..#',
    '#...................#',
    '##########B##########',
    '#.......M...M......b#',
    '#..MMM......MMM.....#',
    '#...................#',
    '####A################',
    '#...........M.......#',
    '#.a....MM...M....MM.#',
    '#...................#',
    '##########E##########',
  ],
  exit: { to: 'sablons', entry: 'door:centrale' },
  lamps: [[0, -10], [0, 0], [0, 10]],
  trainers: [
    { id: 'cen_s1', cls: 'sbire', name: 'Sbire', cell: [15, 13], rot: O, sight: 5, level: 25, n: 2 },
    { id: 'cen_s2', cls: 'sbire_f', name: 'Sbire', cell: [8, 11], rot: O, sight: 4, level: 26, n: 2 },
    { id: 'cen_sc', cls: 'scientifique', name: 'Scientifique du Crépuscule', cell: [16, 9], rot: O, sight: 4, level: 26, n: 2, lookExtra: { accent: '#c58bff' } },
    { id: 'cen_s3', cls: 'sbire', name: 'Sbire', cell: [6, 7], rot: E, sight: 4, level: 27, n: 3 },
    { id: 'cen_morvane', cls: 'admin_f', name: 'Admin Morvane', cell: [10, 2], rot: S, sight: 2, level: 30,
      look: { gender: 'f', skin: '#f1c9a5', hair: '#ff4f7b', hairStyle: 'bob', top: '#1a1030', bottom: '#120a20', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff' },
      team: [['viiraule', 27], ['chauvampire', 28], ['volriquor', 29], ['venicobrax', 30]],
      intro: ['Encore toi ? Kessel m\'avait prévenue.', 'Je suis Morvane. Cette centrale alimente notre Extracteur : il arrache l\'énergie des Éclats.', 'Tu es venu jouer les héros ? Alors je vais éteindre ta petite lumière !'],
      defeat: ['Quelle… insolence.'], after: ['Peu importe. L\'Extracteur a déjà fait son travail.', 'Rendez-vous à Brumevase, si tu l\'oses.'], onWin: 'morvane1' },
  ],
  items: [{ cell: [1, 15], item: 'hyper_potion' }, { cell: [19, 13], item: 'pierre_foudre' }, { cell: [1, 9], item: 'rappel', qty: 2 }, { cell: [19, 5], item: 'dt12' }, { cell: [5, 2], item: 'guerison', hidden: true }],
};

/* ARÈNE 4 — Volta (Foudre) : barrières électriques et interrupteurs */
export const gym4 = {
  id: 'gym4', name: 'Arène de Sablons', type: 'grid', theme: 'foudre', music: 'gym', area: 'sablons', cell: 2,
  layout: [
    '###################',
    '#MM.....,,,.....MM#',
    '#.......,,,.......#',
    '#M.....M,,,M.....M#',
    '#########B#########',
    '#b......M.M.......#',
    '#.MMM.MMM.MMM.MMM.#',
    '#.................#',
    '#######A###A#######',
    '#.....M.....M....a#',
    '#..MM...MMM...MM..#',
    '#.................#',
    '#########E#########',
  ],
  exit: { to: 'sablons', entry: 'door:gym' },
  lamps: [[0, -6], [0, 6]],
  trainers: [
    { id: 'gym4_t1', cls: 'scientifique', name: 'Scientifique Jules', cell: [4, 9], rot: E, sight: 4, level: 27, team: [['voltbulle', 26], ['metalisk', 27]] },
    { id: 'gym4_t2', cls: 'cycliste', name: 'Cycliste Nina', cell: [15, 7], rot: O, sight: 4, level: 28, team: [['eclimect', 27], ['voltgat', 28]] },
    { id: 'gym4_t3', cls: 'sportive', name: 'Sportive Elsa', cell: [3, 7], rot: E, sight: 3, level: 28, team: [['elerocto', 27], ['voltbulle', 28]] },
    { id: 'gym4_leader', cls: 'leader', name: 'Volta', cell: [9, 1], rot: S, sight: 0, leader: { badge: 'eclair', tm: 'dt12', field: 'Surf' },
      look: { gender: 'm', skin: '#8d5a3b', hair: '#ffd23f', hairStyle: 'spiky', top: '#ffd23f', bottom: '#2a2a3a', accent: '#2a2a3a', glasses: true },
      team: [['voltbulle', 28], ['elerocto', 29], ['voltgat', 29], ['volriquor', 31, { item: 'baie_sitrus' }]],
      intro: ['Le courant est revenu grâce à toi ! Mon arène crépite de nouveau !', 'Je suis Volta. Un combat contre moi, c\'est 100 000 volts d\'adrénaline. Allez, on s\'électrise !'],
      defeat: ['Court-circuit total ! Tu mérites le Badge Éclair !'],
      after: ['Avec le Badge Éclair, tes Lumins Eau peuvent te porter sur l\'eau : c\'est Surf !', 'La Route 5 traverse le désert jusqu\'à Brumevase.'] },
  ],
  npcs: [{ id: 'gym4_guide', kind: 'homme', name: 'Guide', cell: [11, 11], rot: N, script: 'gym_guide', guide: ['foudre'] }],
  items: [{ cell: [1, 11], item: 'hyper_potion' }],
};

export const r5 = {
  id: 'r5', name: 'Route 5', sub: 'Désert Ocre', type: 'route', biome: 'desert', music: 'route5', size: [280, 92], seed: 115, weather: ['sand'], battleWeather: 'sand',
  paths: [[[-141, 0], [-100, 10], [-60, -8], [-20, 6], [20, 14], [60, -6], [100, 8], [141, 6]], [[-20, 6], [-24, 30]]],
  lakes: [[24, -24, 11]],
  plazas: [[-24, 32, 7]],
  exits: [{ edge: 'west', at: 0, w: 10, to: 'sablons', entry: 'east' }, { edge: 'east', at: 6, w: 10, to: 'brumevase', entry: 'west' }],
  grass: [[-116, -20, 16, 14], [-80, 22, 18, 12], [-44, -26, 16, 14], [44, 24, 18, 12], [76, -24, 18, 14], [112, 24, 16, 12]],
  props: [
    sign(-128, 8, S, 'Route 5', ['ROUTE 5 — DÉSERT OCRE', 'Est : Brumevase', 'Attention : tempêtes de sable fréquentes.']),
    prop('veg', -30, 34, 0, { kind: 'pillar0', r: 0.7 }), prop('veg', -18, 34, 0, { kind: 'pillar1', r: 0.7 }), prop('veg', -24, 40, 0, { kind: 'pillar0', r: 0.7 }), prop('veg', -32, 26, 0, { kind: 'pillar1', r: 0.7 }),
    prop('tent', 60, 18, 0.3, { arg: '#c8a070' }), prop('campfire', 66, 16),
  ],
  npcs: [pnj('archeologue', 'Archéologue', -26, 30, S, ['Ces ruines datent de l\'époque où l\'Éclat est tombé du ciel.', 'Les gravures montrent un Lumin noir dévorant le soleil…'], { cls: 'archeologue' })],
  trainers: [
    tr('archeologue', 'Edith', -96, 6, S, 27, 2),
    tr('campeur', 'Jordan', -64, -14, N, 28, 3),
    tr('randonneur', 'Marcel', -30, 14, O, 28, 2),
    tr('karateka', 'Ryo', 4, 4, E, 29, 2),
    tr('archeologue', 'Victor', 56, 2, O, 29, 3),
    tr('sbire', 'Sbire', 90, 14, O, 30, 3),
    tr('pyromane', 'Ignace', 120, -2, S, 31, 2),
  ],
  items: [item(39, -30, 'eclat_etoile'), item(-34, 40, 'dt07'), item(130, -36, 'hyper_prisme', 2), hidden(-120, 40, 'pepite'), hidden(80, 40, 'perle'), item(-60, 40, 'pierre_soleil')],
  encounters: {
    grass: [en('draktion', 25, 28, 18), en('cactupin', 25, 28, 16), en('venomoray', 26, 29, 14), en('voltgat', 26, 29, 8, 'night'), en('skronaie', 25, 28, 12), en('venicobra', 25, 28, 10), en('eclimect', 26, 29, 8), en('draktor', 28, 30, 2), en('voltbulle', 26, 28, 4)],
    surf: [en('elerocto', 26, 32, 40), en('carpaillon', 25, 32, 40), en('grenouflet', 26, 32, 20)], fish: [en('carpaillon', 22, 28, 50), en('carpeclat', 26, 30, 8), en('grenouflet', 24, 28, 30)],
  },
};

export const brumevase = {
  id: 'brumevase', name: 'Brumevase', sub: 'Le village sur pilotis', type: 'town', biome: 'marais', style: 'marais', music: 'town6',
  size: [116, 104], seed: 121, fly: [0, 6, 0], shop: 'brumevase', lakes: [[-34, 28, 9], [46, -36, 6]], hills: 0.6,
  plazas: [[0, 4, 10]],
  paths: [[[-59, 6], [-30, 4], [0, 4]], [[0, 4], [0, -53]], [[0, -38], [10, -38]], [[0, 4], [26, 2], [26, -4]], [[0, 4], [-24, -10], [-24, -12]], [[0, 4], [14, 22], [19, 30]], [[-30, 4], [-34, -20]]],
  exits: [{ edge: 'west', at: 6, w: 10, to: 'r5', entry: 'east' }, { edge: 'north', at: 0, w: 10, to: 'r6', entry: 'south' }],
  buildings: [
    { id: 'center', kind: 'center', x: -24, z: -20, rot: S },
    { id: 'shop', kind: 'shop', x: 26, z: -12, rot: S },
    { id: 'gym', kind: 'gym', x: 18, z: -38, rot: O, type: 'ombre', to: 'gym5', entry: 'door', label: 'ARÈNE' },
    { id: 'moulin', kind: 'hideout', x: 28, z: 32, rot: O, to: 'repaire', entry: 'door', name: 'Vieux Moulin' },
    { id: 'maison1', kind: 'house', x: -36, z: -26, rot: S, interior: { npcs: [
      { id: 'bru_m1', kind: 'vieux', name: 'Doyen du village', x: 0, z: -0.5, rot: S, talk: ['Des gens en noir entrent et sortent du vieux moulin la nuit.', 'Depuis, une brume épaisse bloque la route du nord…'] },
    ] } },
    { id: 'maison2', kind: 'house', x: -14, z: 30, rot: N, interior: { npcs: [
      { id: 'bru_m2', kind: 'medium', name: 'Voyante', x: 0, z: -0.5, rot: S, cls: 'medium', talk: ['Nyx, la Championne, voit dans le noir comme en plein jour.', 'Ses Lumins Ténèbres craignent la Lumière et l\'Insecte.'] },
    ] } },
  ],
  props: [
    prop('campfire', 0, 4), ...lamps([[-8, -6], [8, -6], [-8, 14], [8, 14], [-20, 4], [16, 2]], 'lantern'),
    sign(-46, 12, S, 'BRUMEVASE', ['BRUMEVASE', '« Le village sur pilotis, où la brume ne se lève jamais. »']),
    sign(8, -30, S, 'Arène', ['ARÈNE DE BRUMEVASE', 'Championne : Nyx', '« Les ombres voient tout. »']),
  ],
  npcs: [
    pnj('sbire', 'Sbire', 0, -44, S, ['Personne ne passe ! La brume, c\'est notre œuvre !', 'Le Chef est au moulin, mais tu n\'oseras jamais y aller.'], { id: 'bru_blocage', cls: 'sbire', unless: 'repaire_done' }),
    pnj('femme', 'Pêcheuse', -24, 18, E, ['Les marais regorgent de Lumins Poison et Plante.', 'Fais attention au poison !'], { wander: 2 }),
    lumin('grenouflet', -30, 15, E, ['Grenouflet : « Croâ ! »'], { wander: 3 }),
  ],
  items: [hidden(-50, -46, 'pepite'), item(50, 46, 'super_repousse', 2), item(-46, 40, 'baie_prine', 2)],
  encounters: { surf: [en('grenouflet', 30, 36, 40), en('libellux', 30, 34, 20), en('corallune', 30, 34, 20)], fish: [en('grenouflet', 26, 32, 50), en('carpaillon', 25, 30, 30), en('carpeclat', 30, 34, 8)] },
};

/* REPAIRE DU CRÉPUSCULE — labyrinthe de téléporteurs sous le vieux moulin */
export const repaire = {
  id: 'repaire', name: 'Repaire du Crépuscule', type: 'grid', theme: 'repaire', music: 'ordre', area: 'brumevase', cell: 2,
  layout: [
    '######################',
    '#,,,,,,#.....#.......#',
    '#,,,,,,#.4...#...3...#',
    '#,,,,,,#.....#.......#',
    '#,,5,,,#...5.#.4.....#',
    '#,,,,,,#.....#.......#',
    '######################',
    '#..1...#.........#...#',
    '#......#..C...C..#.2.#',
    '#......#.........#...#',
    '#..2...#.........#...#',
    '#......#.........#.3.#',
    '#......#....1....#...#',
    '#......#.........#...#',
    '##########E###########',
  ],
  exit: { to: 'brumevase', entry: 'door:moulin' },
  lamps: [[-10, -8], [10, -8], [-10, 8], [10, 8]],
  trainers: [
    { id: 'rep_s1', cls: 'sbire', name: 'Sbire', cell: [15, 10], rot: O, sight: 5, level: 31, n: 3 },
    { id: 'rep_s2', cls: 'sbire_f', name: 'Sbire', cell: [5, 9], rot: O, sight: 4, level: 31, n: 3 },
    { id: 'rep_s3', cls: 'sbire', name: 'Sbire', cell: [19, 10], rot: N, sight: 2, level: 32, n: 3 },
    { id: 'rep_s4', cls: 'scientifique', name: 'Scientifique du Crépuscule', cell: [17, 5], rot: O, sight: 3, level: 32, n: 3, lookExtra: { accent: '#c58bff' } },
    { id: 'rep_kessel', cls: 'admin', name: 'Admin Kessel', cell: [10, 1], rot: S, sight: 3, level: 34,
      look: { gender: 'm', skin: '#e8b98f', hair: '#c8c8d8', hairStyle: 'long', top: '#1a1030', bottom: '#120a20', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff', glasses: true },
      team: [['venicobrax', 32], ['pipereux', 33], ['chauvampire', 33], ['viiraulis', 34]],
      intro: ['Toi, encore toi ! Tu ne connais donc pas la peur ?', 'Le Chef Vesper est juste derrière. Je ne te laisserai pas l\'approcher !'], defeat: ['Non… pas une seconde fois !'], after: ['Va donc voir le Chef. Il saura te briser.'] },
    { id: 'rep_vesper', cls: 'chef', name: 'Vesper', cell: [3, 2], rot: S, sight: 2, level: 36,
      look: { gender: 'm', skin: '#e8b98f', hair: '#1a1a1a', hairStyle: 'slick', top: '#0e0818', bottom: '#0e0818', outfit: 'uniform', cape: '#2a1050', accent: '#ffd23f', big: true },
      team: [['venicobrax', 34], ['piperax', 35], ['carpeclat', 35], ['grivelion', 36]],
      intro: ['Alors c\'est toi, l\'enfant qui dérange mes plans depuis Port-Azur.', 'Je suis Vesper, chef de l\'Ordre du Crépuscule.', 'Le jour a assez duré. La lumière n\'apporte que des illusions. Quand Nyctaris s\'éveillera, tout sera enfin… silencieux.', 'Montre-moi ce que vaut ta lumière.'],
      defeat: ['Intéressant. Vraiment intéressant.'], after: ['Les quatre Éclats sont réunis. L\'éveil aura lieu au sommet du volcan de Cendrelave.', 'Viens, si tu veux assister à la fin du jour.'], onWin: 'vesper1' },
  ],
  items: [{ cell: [1, 13], item: 'hyper_potion' }, { cell: [20, 7], item: 'rappel' }, { cell: [5, 5], item: 'dt20' }, { cell: [12, 3], item: 'carte_acces' }, { cell: [16, 1], item: 'guerison', hidden: true }],
};

/* ARÈNE 5 — Nyx (Ombre) : labyrinthe plongé dans le noir */
export const gym5 = {
  id: 'gym5', name: 'Arène de Brumevase', type: 'grid', theme: 'ombre', music: 'gym', area: 'brumevase', cell: 2, dark: true,
  layout: [
    '#################',
    '#P.....,,,.....P#',
    '#.......,.......#',
    '#.#####.#.#####.#',
    '#.#...#...#...#.#',
    '#.#.#.#####.#.#.#',
    '#...#.......#...#',
    '###.###.#.###.###',
    '#.....#.#.#.....#',
    '#.###.#...#.###.#',
    '#...#...#...#...#',
    '###.#####.#####.#',
    '#...............#',
    '########E########',
  ],
  exit: { to: 'brumevase', entry: 'door:gym' },
  lamps: [[0, 0]],
  trainers: [
    { id: 'gym5_t1', cls: 'medium', name: 'Médium Irma', cell: [3, 10], rot: N, sight: 3, level: 32, team: [['poisombre', 31], ['crolombre', 32]] },
    { id: 'gym5_t2', cls: 'medium', name: 'Médium Odile', cell: [13, 6], rot: O, sight: 3, level: 33, team: [['noctiowl', 31], ['sombreon', 32], ['chauvelin', 33]] },
    { id: 'gym5_t3', cls: 'gentleman', name: 'Gentleman Arsène', cell: [8, 6], rot: S, sight: 2, level: 33, team: [['nocturn', 32], ['chauvampire', 33]] },
    { id: 'gym5_leader', cls: 'leader', name: 'Nyx', cell: [8, 1], rot: S, sight: 0, leader: { badge: 'brume', tm: 'dt20', field: 'Lanterne' },
      look: { gender: 'f', skin: '#f3d0b0', hair: '#2a1a4a', hairStyle: 'long', top: '#3a2a5a', bottom: '#1a1428', accent: '#c58bff', outfit: 'robe', cape: '#1a1030' },
      team: [['crolomancien', 33], ['venechat', 34], ['noctihibou', 35], ['sombreor', 36, { item: 'baie_sitrus', moves: ['onde_tenebreuse', 'broyage_noir', 'complot', 'ricanement'] }]],
      intro: ['… Tu m\'as trouvée dans le noir. Peu y parviennent.', 'Je suis Nyx. L\'ombre n\'est pas le mal : c\'est là que la lumière se repose.', 'Mais ce combat, je ne te laisserai pas le gagner facilement.'],
      defeat: ['Ta lumière perce même mes ténèbres. Voici le Badge Brume.'],
      after: ['Le Badge Brume permet d\'utiliser Lanterne : tes Lumins éclaireront les grottes obscures.', 'Au nord, le Col Givré est plongé dans le noir. Tu en auras besoin.'] },
  ],
  npcs: [{ id: 'gym5_guide', kind: 'homme', name: 'Guide', cell: [10, 12], rot: N, script: 'gym_guide', guide: ['ombre'] }],
  items: [{ cell: [1, 8], item: 'hyper_potion' }, { cell: [15, 8], item: 'rappel' }],
};
