import { N, S, E, O, tr, pnj, lumin, sign, prop, item, hidden, lamps, en } from './helpers.js';

/* ═══════════════════════════════════════════════════════════════════════
   APRÈS LA LIGUE — Île Lointaine (Solarion), Grotte Glacée (Thalassyre),
   Pic Millénaire (Terragorn), Temple du Vent (Aéroneth)
   ═══════════════════════════════════════════════════════════════════════ */

const legendNpc = (id, species, level, x, z, name) => ({ id, creature: species, name, x, z, rot: S, unless: species, script: 'legend', legend: { species, level, flag: species }, radius: 3.4 });

export const ile = {
  id: 'ile', name: 'Île Lointaine', sub: 'Là où dort l\'aube', type: 'town', biome: 'cote', style: 'port', music: 'ile', size: [110, 150], seed: 241, sea: { side: 'south', at: 52 }, border: 'cliff', fly: [0, 26, 0], shop: 'ile',
  plazas: [[0, 26, 10], [0, -60, 12]],
  paths: [[[0, 50], [0, 26]], [[0, 26], [-20, 0], [10, -30], [0, -60]], [[0, 26], [-26, 20], [-26, 16]], [[0, 26], [24, 18], [24, 16]]],
  entries: { dock: [0, 52, Math.PI] },
  buildings: [
    { id: 'center', kind: 'center', x: -26, z: 8, rot: S, interior: { mart: true, shop: 'ile' } },
    { id: 'maison1', kind: 'house', x: 24, z: 10, rot: S, interior: { npcs: [
      { id: 'ile_m1', kind: 'vieille', name: 'Insulaire', x: 0, z: -0.5, rot: S, talk: ['Au sommet de l\'île brille une lumière qui ne s\'éteint jamais.', 'Les anciens disent que c\'est Solarion, l\'astre de l\'aube, qui dort là-haut.'] },
    ] } },
    { id: 'dock', kind: 'dock', x: 0, z: 56, rot: S },
    { id: 'ferry', kind: 'boat', x: 8, z: 62, rot: S, y: -1.2 },
  ],
  grass: [[-28, -10, 14, 18], [28, -20, 14, 18], [-26, -44, 12, 14], [26, -50, 12, 14]],
  props: [prop('statue', 0, 26, 0, { arg: '#ffe48a' }), prop('pedestal', 0, -66), prop('veg', -8, -64, 0, { kind: 'pillar0', r: 0.7 }), prop('veg', 8, -64, 0, { kind: 'pillar0', r: 0.7 }), ...lamps([[-8, 20], [8, 20], [-8, 32], [8, 32]], 'lantern'),
    sign(6, 40, S, 'ÎLE LOINTAINE', ['ÎLE LOINTAINE', '« Là où dort l\'aube. »'])],
  npcs: [
    pnj('marin', 'Matelot', -3.5, 39, S, ['On retourne à Port-Azur quand tu veux !'], { id: 'ile_matelot', script: 'ferry' }),
    legendNpc('ile_solarion', 'solarion', 70, 0, -68, 'Solarion'),
  ],
  trainers: [
    tr('pro_m', 'Augustin', -12, 8, E, 60, 4), tr('aristo', 'Margaux', 10, -10, O, 60, 4), tr('pro_f', 'Hélène', -6, -36, E, 62, 5),
    tr('gentleman', 'Hubert', 8, -48, O, 63, 5), tr('pro_m', 'Kylian', -10, -52, E, 64, 6),
  ],
  items: [item(-40, -60, 'prisme_maitre'), item(40, -60, 'ruban_lie'), hidden(-44, 30, 'eclat_etoile'), item(44, 30, 'super_bonbon', 2)],
  encounters: {
    grass: [en('sirenote', 55, 58, 12), en('blindacier', 56, 60, 10), en('gloupy', 55, 58, 10), en('drakoreal', 57, 60, 6), en('femireelle', 55, 58, 12), en('lunetrit', 56, 60, 10, 'night'), en('goelarge', 55, 58, 12), en('hydrollon', 55, 58, 10), en('corallys', 56, 59, 10), en('auravilis', 58, 60, 1)],
    surf: [en('carpeclat', 55, 62, 40), en('sirenote', 55, 60, 30), en('oceanis', 60, 62, 1)], fish: [en('carpeclat', 50, 60, 40), en('drakonet', 50, 58, 20), en('sirenote', 50, 58, 20)],
  },
};

export const grotteglace = {
  id: 'grotteglace', name: 'Grotte Glacée', sub: 'Le sanctuaire des mers gelées', type: 'cave', biome: 'grotte', music: 'cave2', size: [64, 100], seed: 251,
  biomeOverride: { tint: '#e8f4ff', tintB: '#c0d8f0', layers: ['snow', 'dirt', 'rock', 'cave'], trees: [['icespike', 0.7], ['crystal', 0.3]], sky: { background: '#08101a', caveSky: '#6a8ac0' } },
  paths: [[[0, 51], [-8, 20], [8, -10], [0, -34]]],
  plazas: [[0, -36, 10]],
  lakes: [[16, 20, 7]],
  exits: [{ edge: 'south', at: 0, w: 8, to: 'col', entry: 'gg' }],
  npcs: [legendNpc('gg_thalassyre', 'thalassyre', 65, 0, -40, 'Thalassyre')],
  items: [item(-20, -36, 'glace_eternelle'), hidden(20, -40, 'eclat_etoile')],
  encounters: { cave: [en('glenuar', 55, 60, 16), en('grivelion', 55, 60, 16), en('flocoura', 55, 60, 12), en('cristarque', 56, 60, 10), en('glacpilleur', 55, 60, 12)] },
};

export const pic = {
  id: 'pic', name: 'Pic Millénaire', sub: 'Le toit de Lumeria', type: 'special', biome: 'montagne', music: 'route9', size: [80, 150], seed: 261, hills: 5, border: 'mountain',
  paths: [[[0, 76], [12, 40], [-12, 0], [10, -36], [0, -60]]],
  plazas: [[0, -62, 10]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'r4', entry: 'door:pic' }],
  grass: [[-20, 40, 12, 16], [20, 0, 12, 16], [-20, -30, 12, 14]],
  npcs: [legendNpc('pic_terragorn', 'terragorn', 65, 0, -66, 'Terragorn')],
  trainers: [tr('randonneur', 'Edmond', 6, 20, O, 60, 5), tr('karateka', 'Sora', -6, -20, E, 62, 5)],
  items: [item(30, -60, 'pierre_dure'), hidden(-30, 60, 'eclat_etoile')],
  encounters: { grass: [en('taurocolosse', 55, 60, 16), en('rochbrutus', 55, 60, 14), en('boulixor', 55, 60, 14), en('taupitrepan', 55, 60, 12), en('aceraptor', 56, 60, 12), en('draktanos', 58, 60, 2), en('teranoth', 58, 60, 2)] },
};

export const templevent = {
  id: 'templevent', name: 'Temple du Vent', sub: 'Là où chante le ciel', type: 'special', biome: 'celeste', music: 'legend', size: [80, 130], seed: 271, hills: 2, border: 'cliff',
  paths: [[[0, 66], [-10, 30], [10, -6], [0, -44]]],
  plazas: [[0, -46, 12]],
  exits: [{ edge: 'south', at: 0, w: 10, to: 'r8', entry: 'door:temple' }],
  grass: [[-20, 30, 12, 16], [20, -10, 12, 16]],
  props: [prop('veg', -10, -50, 0, { kind: 'pillar0', r: 0.7 }), prop('veg', 10, -50, 0, { kind: 'pillar0', r: 0.7 }), prop('veg', -12, -38, 0, { kind: 'pillar1', r: 0.7 }), prop('veg', 12, -38, 0, { kind: 'pillar0', r: 0.7 })],
  npcs: [legendNpc('tv_aeroneth', 'aeroneth', 65, 0, -50, 'Aéroneth')],
  items: [item(30, -46, 'plume_vive'), hidden(-30, 40, 'eclat_etoile')],
  encounters: { grass: [en('colomagus', 55, 60, 16), en('strateon', 55, 60, 14), en('aceraptor', 55, 60, 14), en('aiglarius', 55, 60, 14), en('brasillor', 56, 60, 10), en('voltawisp', 55, 60, 10)] },
};
