/**
 * BIOMES : couleurs du sol, couches de terrain, végétation, météo, brouillard, ambiance du ciel
 * et décor des combats. Chaque carte choisit un biome ; ses champs peuvent être surchargés.
 */
export const BIOMES = {
  prairie: {
    layers: ['grass', 'dirt', 'rock', 'sand'], tint: '#ffffff', tintB: '#e8f0d8',
    grass: ['#4a8a33', '#8db44c'], tall: ['#3b7a2a', '#79a63c'], groundCover: 0.55,
    trees: [['oak', 0.55], ['birch', 0.2], ['pine', 0.25]], bushes: ['bush', 'berrybush'], extras: [['rock', 0.05], ['flowers', 0.18], ['stump', 0.02], ['fern', 0.04]],
    flowers: ['#ff7aa2', '#ffd23f', '#ffffff', '#9a7dff', '#ff9a4a'],
    sky: { fogDay: '#a7c4dd', clouds: 0.42, turbidity: 2.6, ground: '#6f8a4c' }, weather: ['fireflies'], border: 'forest', treeDensity: 0.16,
  },
  foret: {
    layers: ['grass', 'dirt', 'rock', 'mud'], tint: '#c8d8b8', tintB: '#a8c098',
    grass: ['#3a7a2a', '#6a9a3a'], tall: ['#2f6a24', '#5a8a30'], groundCover: 0.7,
    trees: [['oak', 0.45], ['pine', 0.4], ['mushroom', 0.05], ['birch', 0.1]], bushes: ['bush', 'berrybush'], extras: [['fern', 0.12], ['log', 0.03], ['stump', 0.04], ['rock', 0.04], ['flowers', 0.05]],
    flowers: ['#ffffff', '#c58bff', '#ff9ad5'],
    sky: { fogDay: '#9ab8a8', fogDusk: '#c89a78', near: 35, far: 200, clouds: 0.55, ground: '#4a6a3a', ambient: 0.9 }, weather: ['leaves', 'fireflies'], border: 'forest', treeDensity: 0.42,
  },
  cote: {
    layers: ['grass', 'sand', 'rock', 'sand'], tint: '#ffffff', tintB: '#f0f0e0',
    grass: ['#5a9a3a', '#9ac04c'], tall: ['#4a8a30', '#8ab040'], groundCover: 0.35,
    trees: [['palm', 0.7], ['oak', 0.3]], bushes: ['bush'], extras: [['shell', 0.06], ['rock', 0.05], ['flowers', 0.06]],
    flowers: ['#ff7aa2', '#ffd23f', '#ffffff'],
    sky: { fogDay: '#b8d8ee', clouds: 0.3, turbidity: 2.2, ground: '#c8b880' }, weather: [], border: 'cliff', treeDensity: 0.08, sand: true,
  },
  montagne: {
    layers: ['grass', 'dirt', 'rock', 'rock'], tint: '#e0e4d8', tintB: '#c8ccc0',
    grass: ['#5a8a3a', '#8aa850'], tall: ['#4a7a30', '#7a9a40'], groundCover: 0.35,
    trees: [['pine', 0.85], ['oak', 0.15]], bushes: ['bush'], extras: [['rock', 0.18], ['stump', 0.02]],
    flowers: ['#ffffff', '#9ab8ff'],
    sky: { fogDay: '#b8c8d8', clouds: 0.5, turbidity: 2.0, ground: '#7a7a60' }, weather: [], border: 'mountain', treeDensity: 0.12, rocky: true,
  },
  desert: {
    layers: ['sand', 'dirt', 'rock', 'sand'], tint: '#ffffff', tintB: '#f4e4c8',
    grass: ['#b8a860', '#d8c880'], tall: ['#a89850', '#c8b870'], groundCover: 0.08,
    trees: [['cactus', 0.7], ['palm', 0.15], ['deadtree', 0.15]], bushes: [], extras: [['bones', 0.015], ['rock', 0.06], ['pillar', 0.012]],
    flowers: ['#ff7aa2'],
    sky: { fogDay: '#e8d8b8', fogDusk: '#f0a070', clouds: 0.1, turbidity: 6, sunTint: '#fff0d8', ground: '#c8a878', near: 60, far: 320 }, weather: ['sand'], border: 'mountain', treeDensity: 0.05, dunes: true,
  },
  marais: {
    layers: ['mud', 'dirt', 'rock', 'grass'], tint: '#b8c0a0', tintB: '#9aa888',
    grass: ['#4a6a3a', '#6a7a40'], tall: ['#3a5a2a', '#5a6a30'], groundCover: 0.6,
    trees: [['willow', 0.45], ['deadtree', 0.35], ['mushroom', 0.2]], bushes: ['bush', 'reeds'], extras: [['reeds', 0.12], ['log', 0.03], ['stump', 0.04], ['fern', 0.05]],
    flowers: ['#c58bff'],
    sky: { fogDay: '#8a9a88', fogDusk: '#8a7a68', fogNight: '#0a0e0c', near: 20, far: 140, clouds: 0.85, ground: '#3a4a30', ambient: 0.85, exposure: 0.95 }, weather: ['spores', 'fireflies'], border: 'forest', treeDensity: 0.22, murky: true,
  },
  neige: {
    layers: ['snow', 'dirt', 'rock', 'snow'], tint: '#ffffff', tintB: '#e8f0ff',
    grass: ['#c8d8d0', '#e8f0f0'], tall: ['#a8c0b8', '#d0e0e0'], groundCover: 0.12,
    trees: [['snowpine', 0.9], ['deadtree', 0.1]], bushes: [], extras: [['rock', 0.06], ['icespike', 0.03], ['snowman', 0.003]],
    flowers: ['#ffffff'],
    sky: { fogDay: '#d8e4f0', fogDusk: '#c8b0c8', clouds: 0.7, turbidity: 1.6, ground: '#e0e8f0', near: 40, far: 260 }, weather: ['snow'], border: 'mountain', treeDensity: 0.14, snow: true,
  },
  volcan: {
    layers: ['ash', 'dirt', 'rock', 'ash'], tint: '#ffffff', tintB: '#e0d0c8',
    grass: ['#5a5040', '#6a6048'], tall: ['#6a4a30', '#8a6a40'], groundCover: 0.06,
    trees: [['charred', 0.8], ['deadtree', 0.2]], bushes: [], extras: [['lavarock', 0.06], ['rock', 0.08]],
    flowers: ['#ff6a3d'],
    sky: { fogDay: '#8a7068', fogDusk: '#c8603a', fogNight: '#1a0a08', clouds: 0.8, turbidity: 8, sunTint: '#ffd0a8', ground: '#3a2a22', near: 40, far: 220, exposure: 0.95 }, weather: ['ash'], border: 'mountain', treeDensity: 0.06, lava: true,
  },
  celeste: {
    layers: ['grass', 'cobble', 'rock', 'sand'], tint: '#f0f4ff', tintB: '#e0e8ff',
    grass: ['#7ab86a', '#b8d88a'], tall: ['#6aa85a', '#a8c87a'], groundCover: 0.4,
    trees: [['birch', 0.6], ['oak', 0.4]], bushes: ['bush'], extras: [['crystal', 0.03], ['pillar', 0.01], ['flowers', 0.1]],
    flowers: ['#c8a8ff', '#ffffff', '#ffe48a'],
    sky: { fogDay: '#c8d8ff', clouds: 0.25, turbidity: 1.2, ground: '#a8b8d8', far: 520, exposure: 1.05 }, weather: ['spores'], border: 'cliff', treeDensity: 0.08,
  },
  grotte: {
    layers: ['cave', 'dirt', 'rock', 'cave'], tint: '#d8d0c8', tintB: '#b0a8a0',
    grass: ['#4a4a40', '#5a5a48'], tall: ['#3a3a30', '#4a4a3a'], groundCover: 0,
    trees: [['stalagmite', 0.8], ['crystal', 0.2]], bushes: [], extras: [['rock', 0.1], ['crystal', 0.02]],
    flowers: [],
    sky: { background: '#08070a', caveSky: '#3a4060' }, weather: [], border: 'cave', treeDensity: 0.05, cave: true,
  },
};
BIOMES.ville = { ...BIOMES.prairie, trees: [['oak', 0.5], ['birch', 0.5]], treeDensity: 0.05 };

/** Décor de combat par biome (couleurs du sol et végétation autour de l'arène). */
export const BATTLE_SCENES = {
  prairie: { ground: '#6a9a45', pad: '#a8c070', trees: ['oak', 'birch'] },
  foret: { ground: '#4a7a35', pad: '#7a9a50', trees: ['oak', 'pine'] },
  cote: { ground: '#e0cc98', pad: '#f0e0b0', trees: ['palm'] },
  montagne: { ground: '#8a8a70', pad: '#a8a890', trees: ['pine'] },
  desert: { ground: '#e0c890', pad: '#f0dcaa', trees: ['cactus'] },
  marais: { ground: '#4a5a38', pad: '#6a7a50', trees: ['willow', 'deadtree'] },
  neige: { ground: '#e8eef8', pad: '#ffffff', trees: ['snowpine'] },
  volcan: { ground: '#3a2e2a', pad: '#5a4a40', trees: ['charred'] },
  celeste: { ground: '#a8c8a0', pad: '#e0e8ff', trees: ['birch'] },
  grotte: { ground: '#4a4440', pad: '#6a625a', trees: ['stalagmite', 'crystal'] },
  interieur: { ground: '#8a7a68', pad: '#c8b8a0', trees: [] },
};
