/**
 * MODÈLES 3D (.glb) — tous optionnels.
 * Déposez vos fichiers dans /models ; tout fichier absent est remplacé par une forme générée.
 * Les créatures sont listées dans config/creatures.js → models/creatures/<id>.glb
 * Orientation attendue : le modèle regarde vers +Z, pieds à y = 0 (recalé et mis à l'échelle automatiquement).
 */
export const MODELS = {
  player: { url: 'models/player.glb', height: 1.72 },       // animations : Idle, Walk, Run
  playerGirl: { url: 'models/player_f.glb', height: 1.66 },
  npc: { url: 'models/npc.glb', height: 1.72 },
  bike: { url: 'models/env/bike.glb', height: 1.0 },

  env: {
    tree:        { url: 'models/env/tree.glb',        height: 5.6 },
    pine:        { url: 'models/env/pine.glb',        height: 7.5 },
    palm:        { url: 'models/env/palm.glb',        height: 6.5 },
    cactus:      { url: 'models/env/cactus.glb',      height: 3.2 },
    deadtree:    { url: 'models/env/deadtree.glb',    height: 5.0 },
    rock:        { url: 'models/env/rock.glb',        height: 1.3 },
    bush:        { url: 'models/env/bush.glb',        height: 1.0 },
    grass:       { url: 'models/env/grass.glb',       height: 0.55 },
    house:       { url: 'models/env/house.glb',       height: 6.4 },
    healcenter:  { url: 'models/env/healcenter.glb',  height: 7.6 },
    shop:        { url: 'models/env/shop.glb',        height: 6.8 },
    gym:         { url: 'models/env/gym.glb',         height: 10 },
    arena:       { url: 'models/env/arena.glb',       size: 26 },
  },

  creatureDir: 'models/creatures/',
};

/** Noms des animations recherchées dans les .glb (insensible à la casse). */
export const CLIP_NAMES = {
  idle: ['idle', 'stand', 'breath'],
  walk: ['walk'],
  run: ['run', 'sprint'],
  attack: ['attack', 'atk', 'bite', 'punch'],
  hit: ['hit', 'hurt', 'damage'],
  faint: ['faint', 'death', 'die', 'ko'],
};
