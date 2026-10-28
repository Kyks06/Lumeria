import { N, S, E, O, tr, pnj, lumin, sign, prop, item, hidden, lamps, en } from './helpers.js';

/* ═══════════════════════════════════════════════════════════════════════
   CHAPITRE 1 — Clairvent, Route 1, Sylvebourg et son arène (Insecte)
   ═══════════════════════════════════════════════════════════════════════ */

export const clairvent = {
  id: 'clairvent', name: 'Clairvent', sub: 'Village des brises marines', type: 'town', biome: 'ville', style: 'village', music: 'town1',
  size: [100, 90], seed: 11, sea: { side: 'south', at: 31 }, fly: [0, 8, 0], shop: 'clairvent',
  plazas: [[0, 0, 9]],
  paths: [[[0, -47], [0, -20], [0, 0]], [[0, 0], [-12, 6], [-24, 14], [-24, 21]], [[0, 0], [12, -6], [24, -9]], [[-12, 6], [-26, -6], [-26, -10]], [[0, 0], [10, 10], [26, 18], [26, 21]], [[0, 0], [0, 22]]],
  exits: [{ edge: 'north', at: 0, w: 10, to: 'r1', entry: 'south' }],
  buildings: [
    { id: 'maison', kind: 'house', x: -24, z: 14, rot: S, roofColor: '#c8553d', name: 'Maison', interior: { preset: 'home', npcs: [
      { id: 'maman', kind: 'mere', name: 'Maman', x: 2.5, z: -1.2, rot: O, script: 'maman' },
      { id: 'maman_lumin', creature: 'feeline', x: 4.4, z: 2.2, rot: O, talk: ['Féeline : « Rrrrou… »'] },
    ] } },
    { id: 'maison2', kind: 'house', x: -26, z: -17, rot: S, roofColor: '#3a7bd5', name: 'Maison de Naël', interior: { preset: 'house', npcs: [
      { id: 'lila', kind: 'femme', name: 'Lila', x: -1.6, z: 0.8, rot: S, script: 'lila' },
    ] } },
    { id: 'labo', kind: 'lab', x: 24, z: -16, rot: S, name: 'Laboratoire du Pr. Aubin', label: 'LABO AUBIN', interior: { preset: 'lab', music: 'lab',
      npcs: [
        { id: 'aubin', kind: 'professeur', name: 'Pr. Aubin', x: 0, z: -3.2, rot: S, script: 'aubin' },
        { id: 'assistante', kind: 'assistante', name: 'Assistante Coline', x: -5.5, z: 2.4, rot: E, wander: 1.5, talk: ['Le Professeur étudie les Éclats de l\'Aube depuis des années.', 'Il dit qu\'ils renferment l\'énergie des Lumins légendaires…'] },
        { id: 'p_leafnix', creature: 'leafnix', x: -1.4, z: -1.5, rot: S, yOff: 0.55, unless: 'took:leafnix', talk: ['Leafnix, le Lumin Faon (type Plante).', 'La pousse sur son front se tourne toujours vers le soleil.'] },
        { id: 'p_pyralis', creature: 'pyralis', x: 0, z: -1.5, rot: S, yOff: 0.55, unless: 'took:pyralis', talk: ['Pyralis, le Lumin Braise (type Feu).', 'Sa queue est une flamme qui ne s\'éteint jamais.'] },
        { id: 'p_aquoret', creature: 'aquoret', x: 1.4, z: -1.5, rot: S, yOff: 0.55, unless: 'took:aquoret', talk: ['Aquorêt, le Lumin Loutre (type Eau).', 'Il crache des bulles irisées pour attirer l\'attention.'] },
      ],
      furniture: [{ t: 'pedestal', x: -1.4, z: -1.5, solid: false }, { t: 'pedestal', x: 0, z: -1.5, solid: false }, { t: 'pedestal', x: 1.4, z: -1.5, solid: false }],
    } },
    { id: 'maison3', kind: 'house', x: 26, z: 14, rot: S, roofColor: '#7dc860', name: 'Maison', interior: { preset: 'house', npcs: [
      { id: 'clv_m3', kind: 'vieille', name: 'Mamie Rose', x: 1.5, z: 0.5, rot: O, script: 'mamie_rose' },
    ] } },
  ],
  props: [
    prop('fountain', 0, 0), ...lamps([[-7, -9], [7, -9], [-9, 7], [9, 7], [-3, -26], [3, -40]]),
    sign(5, -30, S, 'CLAIRVENT', ['CLAIRVENT', '« Là où souffle la première brise. »', 'Nord : Route 1 → Sylvebourg']),
    sign(-19, 22, S, 'Maison', ['Maison de votre famille.']), sign(-21, -9, S, 'Naël', ['Maison de Naël et Lila.']),
    prop('mailbox', -20, 19), prop('mailbox', -22, -12), prop('bench', -6, 12, N), prop('bench', 6, 12, N), prop('planter', -12, -4), prop('planter', 12, 4),
    prop('barrel', 30, 18), prop('crate', 31, 19.5), prop('table', 14, 24, 0), prop('tent', -36, 26, 0.4, { arg: '#ff7a3a' }),
  ],
  fences: [[[-31, 22], [-31, 9], [-28, 9]], [[-19, 9], [-17, 9], [-17, 22]], [[31, 9], [33, 9], [33, 22]]],
  npcs: [
    pnj('fillette', 'Petite Jade', -8, -12, S, ['Les Lumins sauvages vivent dans les hautes herbes !', 'Sans Lumin à toi, c\'est super dangereux d\'y aller.'], { wander: 4 }),
    pnj('vieux', 'Vieux Gaspard', 14, 22, S, ['La mer de Clairvent est bien calme aujourd\'hui.', 'Un jour, tu pourras surfer jusqu\'à l\'horizon sur le dos d\'un Lumin Eau !']),
    pnj('pecheur', 'Pêcheur', 30, 22, S, ['Ça ne mord pas… Il me faudrait une meilleure canne.', 'On dit qu\'à Port-Azur, un vieux loup de mer en offre aux débutants.']),
    pnj('assistante', 'Coline', 0, -37, S, ['Ah, te voilà ! Le Professeur Aubin t\'attend à son laboratoire.', 'N\'entre surtout pas dans les hautes herbes sans Lumin !'], { id: 'clv_coline', unless: 'starter' }),
    lumin('aerion', -36, -4, E, ['Aérion : « Piou piou ! »'], { id: 'clv_piaflet', wander: 5 }),
  ],
  triggers: [{ x: 0, z: -40, w: 14, d: 4, unless: 'starter', script: 'no_starter' }],
  items: [hidden(37, 22, 'potion'), item(-40, 16, 'prisme', 2)],
  encounters: { surf: [en('carpaillon', 5, 10, 40), en('corallune', 5, 10, 20)], fish: [en('carpaillon', 4, 8, 60), en('crabulle', 5, 8, 20)] },
};

export const r1 = {
  id: 'r1', name: 'Route 1', sub: 'Prairie des Premiers Pas', type: 'route', biome: 'prairie', music: 'route1', size: [64, 210], seed: 21,
  paths: [[[0, 106], [0, 70], [-8, 34], [-6, 0], [6, -32], [10, -64], [6, -106]]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'clairvent', entry: 'north' }, { edge: 'north', at: 6, w: 10, to: 'sylvebourg', entry: 'south' }],
  grass: [[12, 72, 14, 24], [-18, 38, 14, 22], [14, 6, 14, 26], [-14, -40, 14, 24], [20, -78, 12, 18], [-20, -84, 12, 16]],
  plazas: [[-22, 70, 6]],
  lakes: [[-20, 8, 7]],
  props: [
    sign(5, 96, S, 'Route 1', ['ROUTE 1', 'Nord : Sylvebourg', 'Sud : Clairvent']),
    sign(13, -96, S, 'Route 1', ['ROUTE 1', 'Sud : Clairvent']),
    sign(-4, 54, S, 'Conseil', ['CONSEIL DE DRESSEUR', 'Maintenez Maj (ou la gâchette) pour courir.', 'Les Lumins sauvages se déplacent dans les hautes herbes : certains vous fuient, d\'autres vous foncent dessus !']),
    prop('tree', -22, 64, 0, { kind: 'oak1', scale: 1.4, r: 0.8 }), prop('table', -24, 72, 0.3), prop('bench', 18, 30, -0.6), prop('campfire', 24, -40), prop('tent', 26, -46, 2.4, { arg: '#3a9adf' }),
  ],
  npcs: [
    pnj('homme', 'Promeneur', -4, 84, S, ['Bienvenue sur la Route 1 !', 'Si ton Lumin est fatigué, retourne voir ta maman à Clairvent.']),
    pnj('vieille', 'Cueilleuse', -24, 66, E, ['Ces baies poussent toute l\'année.', 'Tiens, prends ça. Fais-la tenir à ton Lumin : il la mangera s\'il est en danger.'], { id: 'r1_baie', give: { item: 'baie_oran', qty: 2, flag: 'r1_baie' } }),
  ],
  trainers: [
    tr('gamin', 'Théo', 6, 60, O, 4, 1, { sight: 5, team: [['mulotin', 5]] }),
    tr('fillette', 'Mia', -15, 17, E, 5, 2, { team: [['insectar', 4], ['aerion', 5]] }),
    tr('campeur', 'Hugo', 0, -14, N, 6, 2, { team: [['mulotin', 5], ['feeline', 6]] }),
    tr('pique_niqueuse', 'Léa', 18, -54, O, 6, 2, { sight: 6, team: [['aerion', 6], ['insectar', 6]] }),
    tr('gamin', 'Noé', -2, -88, E, 7, 2, { team: [['scarabose', 6], ['mulotin', 7]] }),
  ],
  items: [item(-26, 30, 'potion'), item(24, -20, 'prisme', 2), item(-24, -96, 'antidote'), hidden(22, 94, 'potion'), hidden(-8, 8, 'baie_oran')],
  encounters: {
    grass: [en('mulotin', 2, 4, 30), en('aerion', 2, 4, 28, 'day'), en('insectar', 2, 4, 22), en('feeline', 3, 5, 10), en('hiboulin', 3, 5, 26, 'night'), en('cosmixie', 4, 5, 3), en('femiree', 3, 5, 2)],
    surf: [en('carpaillon', 5, 10, 50), en('corallune', 5, 10, 20)], fish: [en('carpaillon', 3, 8, 70), en('corallune', 5, 8, 15)],
  },
};

export const sylvebourg = {
  id: 'sylvebourg', name: 'Sylvebourg', sub: 'Le bourg sous les chênes', type: 'town', biome: 'foret', style: 'foret', music: 'town2',
  size: [104, 96], seed: 31, fly: [0, 6, 0], shop: 'sylvebourg', treeDensity: 0.08,
  plazas: [[0, 4, 10]],
  paths: [[[6, 49], [4, 24], [0, 4]], [[0, 4], [0, -24]], [[0, 4], [24, 2], [53, 0]], [[0, 4], [-22, -2], [-24, -6]], [[-22, -2], [-26, 18], [-26, 23]], [[24, 2], [24, -14]], [[24, 2], [30, 20], [30, 24]]],
  exits: [{ edge: 'south', at: 6, w: 10, to: 'r1', entry: 'north' }, { edge: 'east', at: 0, w: 10, to: 'r2', entry: 'west' }],
  buildings: [
    { id: 'center', kind: 'center', x: -24, z: -12, rot: S, style: 'village' },
    { id: 'shop', kind: 'shop', x: 24, z: -20, rot: S, style: 'village' },
    { id: 'gym', kind: 'gym', x: 0, z: -34, rot: S, type: 'insecte', to: 'gym1', entry: 'door', label: 'ARÈNE' },
    { id: 'maison1', kind: 'house', x: -26, z: 12, rot: S, name: 'Maison du Maître des Capacités', interior: { npcs: [
      { id: 'maitre_cap', kind: 'savant', name: 'Maître des Capacités', x: 1.4, z: -0.6, rot: S, script: 'relearn' },
    ] } },
    { id: 'maison2', kind: 'house', x: 30, z: 14, rot: S, interior: { npcs: [
      { id: 'syl_m2', kind: 'homme', name: 'Bûcheron', x: -1, z: 0, rot: E, talk: ['Ces petits arbustes fins qui bloquent les sentiers…', 'Avec le Badge Feuille, ton Lumin pourra les couper. C\'est la capacité Coupe !'] },
      { id: 'syl_m2b', kind: 'garconnet', name: 'Lucas', x: 2.5, z: 1.5, rot: O, talk: ['Ilda, la Championne, adore les Lumins Insecte.', 'Les attaques Feu, Vent et Roche leur font très mal !'] },
    ] } },
    { id: 'maison3', kind: 'bighouse', x: -30, z: 30, rot: E, name: 'Maison de l\'Échange', interior: { npcs: [
      { id: 'syl_trade', kind: 'femme', name: 'Collectionneuse', x: 0, z: -1, rot: S, script: 'trade_syl' },
    ] } },
  ],
  props: [
    prop('well', 0, 4), ...lamps([[-8, -4], [8, -4], [-8, 12], [8, 12], [16, 2], [-16, -2]], 'lantern'),
    sign(10, 40, S, 'SYLVEBOURG', ['SYLVEBOURG', '« Le bourg sous les chênes millénaires. »']),
    sign(-6, -24, S, 'Arène', ['ARÈNE DE SYLVEBOURG', 'Championne : Ilda', '« La reine des Lumins Insecte ! »']),
    prop('stall', 14, 12, N, { arg: '#7dc860' }), prop('bench', -8, 18, N), prop('tree', -12, -20, 0, { kind: 'oak0', scale: 1.6, r: 0.9 }), prop('tree', 12, -26, 0, { kind: 'oak2', scale: 1.5, r: 0.9 }),
  ],
  npcs: [
    pnj('homme', 'Forestier', 14, 16, N, ['Bienvenue à Sylvebourg !', 'Notre Championne Ilda élève des Lumins Insecte dans le grand chêne de l\'arène.']),
    pnj('fillette', 'Zoé', -6, 22, S, ['J\'ai vu des gens bizarres en noir et violet passer vers la Route 2…', 'Ils parlaient d\'« Éclats » et de « nuit éternelle ». Ça fait peur !'], { wander: 3 }),
    pnj('vieux', 'Ancien', -14, -18, S, ['Autrefois, une étoile est tombée sur Lumeria.', 'Ses fragments, les Éclats de l\'Aube, protègent notre ciel. Du moins, c\'est ce que racontent les légendes.']),
    pnj('garde', 'Garde forestier', 46, 0, O, ['La Route 2 traverse le Bois Murmurant jusqu\'à Port-Azur.', 'Bonne route !'], { id: 'syl_garde' }),
    lumin('insectar', 20, 28, S, ['Insectar : « Mrrr ? »'], { wander: 3 }),
  ],
  items: [hidden(-44, -30, 'super_potion'), item(44, 34, 'repousse')],
  encounters: { fish: [en('carpaillon', 6, 10, 80)] },
};

/* ARÈNE 1 — Ilda (Insecte) : labyrinthe de haies dans un sous-bois */
export const gym1 = {
  id: 'gym1', name: 'Arène de Sylvebourg', type: 'grid', theme: 'insecte', music: 'gym', area: 'sylvebourg', cell: 2,
  layout: [
    '###############',
    '#TTTTT,,,TTTTT#',
    '#T....,,,....T#',
    '#T..TTT.TTT..T#',
    '#T..T.....T..T#',
    '#T....TTT....T#',
    '#TT.........TT#',
    '#T..TT...TT..T#',
    '#T..T.....T..T#',
    '#T....TTT....T#',
    '#TTT.......TTT#',
    '#....TT.TT....#',
    '#.............#',
    '######.E.######',
  ],
  exit: { to: 'sylvebourg', entry: 'door:gym' },
  lamps: [[0, -6], [0, 8]],
  trainers: [
    { id: 'gym1_t1', cls: 'scout', name: 'Éclaireuse Anaïs', cell: [4, 10], rot: E, sight: 4, level: 10, team: [['insectar', 9], ['scarabose', 10]] },
    { id: 'gym1_t2', cls: 'gamin', name: 'Gamin Tom', cell: [11, 6], rot: O, sight: 4, level: 10, team: [['insectoral', 10], ['insectar', 10]] },
    { id: 'gym1_t3', cls: 'campeur', name: 'Campeur Malo', cell: [7, 3], rot: S, sight: 2, level: 11, team: [['scarabose', 11], ['eclimect', 11]] },
    { id: 'gym1_leader', cls: 'leader', name: 'Ilda', cell: [7, 1], rot: S, sight: 0, leader: { badge: 'feuille', tm: 'dt23', field: 'Coupe' },
      look: { gender: 'f', skin: '#f3d0b0', hair: '#7dc860', hairStyle: 'twin', top: '#a8c43a', bottom: '#4a6a2a', accent: '#ffd23f', scarf: '#ffd23f' },
      team: [['chlorofly', 13], ['scarabose', 13], ['lunacrys', 15, { moves: ['spores', 'nuee_rageuse', 'brise_lumineuse', 'danse_ailes'] }]],
      intro: ['Bienvenue dans mon sous-bois ! Je suis Ilda, Championne d\'Arène de Sylvebourg.', 'Les Lumins Insecte sont petits, mais ils ne lâchent jamais rien. Montre-moi ta détermination !'],
      defeat: ['Bzzz… tu m\'as battue à plate couture !', 'Tiens, voici le Badge Feuille. Il prouve ta victoire ici.'],
      after: ['Avec le Badge Feuille, tes Lumins peuvent utiliser Coupe hors des combats.', 'La prochaine arène est à Port-Azur, au bout de la Route 2.'] },
  ],
  npcs: [{ id: 'gym1_guide', kind: 'homme', name: 'Guide', cell: [10, 12], rot: N, script: 'gym_guide', guide: ['insecte'] }],
  items: [{ cell: [12, 2], item: 'super_potion' }],
  furniture: [{ t: 'statue', args: ['#a8c43a'], cell: [3, 12], r: 0.8 }, { t: 'statue', args: ['#a8c43a'], cell: [11, 12], r: 0.8 }],
};
