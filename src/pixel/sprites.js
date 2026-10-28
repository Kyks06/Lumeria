import * as N from './nature.js';
import { Px } from './Px.js';

/**
 * REGISTRE DES SPRITES DE DÉCOR : clé « famille:variante:graine » → sprite généré une seule fois.
 */
const cache = new Map();
const P = N.PAL;

const ROCKS = { grey: [P.rock, null], moss: [P.rock, '#5ea844'], snow: [P.rock, null, true], sand: [P.sandstone, null], dark: [P.rockDark, null], lava: [P.rockDark, null, false, '#ff7a2a'] };
const CRYSTAL = { violet: '#9a7aff', cyan: '#4ad0ff', rose: '#ff7ad8', gold: '#ffd23f' };

function build(key) {
  const [fam, a, b] = key.split(':');
  const n = Number(b ?? a ?? 0) || 0;
  switch (fam) {
    case 'tree': {
      const seed = n * 7 + 3;
      switch (a) {
        case 'oak': return N.leafyTree({ seed });
        case 'oakDark': return N.leafyTree({ seed, pal: P.oakDark });
        case 'oakLight': return N.leafyTree({ seed, pal: P.oakLight });
        case 'cherry': return N.leafyTree({ seed, pal: P.cherry, blossom: true });
        case 'autumn': return N.leafyTree({ seed, pal: P.autumn });
        case 'celeste': return N.leafyTree({ seed, pal: P.celeste, blossom: n % 2 === 0 });
        case 'apple': return N.leafyTree({ seed, fruit: '#e83a3a' });
        case 'birch': return N.leafyTree({ seed, pal: P.oakLight, birch: true, trunkW: 4, canopyR: 12 });
        case 'pine': return N.pineTree({ seed });
        case 'snowpine': return N.pineTree({ seed, snow: true });
        case 'palm': return N.palmTree({ seed });
        case 'cactus': return N.cactus({ seed, small: n % 3 === 2 });
        case 'deadtree': return N.deadTree({ seed });
        case 'charred': return N.deadTree({ seed, charred: true });
        case 'willow': return N.willowTree({ seed });
        case 'mushroom': return N.giantMushroom({ seed });
        case 'mushroomP': return N.giantMushroom({ seed, purple: true });
        case 'stalagmite': return N.stalagmite({ seed });
        case 'crystal': return N.crystal({ seed, color: Object.values(CRYSTAL)[n % 3] });
        case 'icespike': return N.crystal({ seed, ice: true });
        default: return N.leafyTree({ seed });
      }
    }
    case 'bush': {
      if (a === 'berry') return N.bush({ seed: n + 3, berries: '#e83a4a' });
      if (a === 'dark') return N.bush({ seed: n + 1, pal: P.oakDark });
      if (a === 'snow') return N.bush({ seed: n + 1, pal: P.pine });
      return N.bush({ seed: n + 1 });
    }
    case 'reeds': return N.reeds({ seed: n + 1 });
    case 'fern': return N.fern({ seed: n + 1 });
    case 'rock': { const R = ROCKS[a] || ROCKS.grey; const big = n % 4 === 3; return N.rock({ seed: n + 1, pal: R[0], moss: R[1], snow: !!R[2], glow: R[3] || null, w: big ? 24 : n % 2 ? 16 : 20, h: big ? 18 : n % 2 ? 12 : 15 }); }
    case 'crystal': return a === 'ice' ? N.crystal({ seed: n + 1, ice: true }) : N.crystal({ seed: n + 1, color: CRYSTAL[a] || CRYSTAL.violet });
    case 'stalagmite': return N.stalagmite({ seed: n + 1 });
    case 'pillar': return N.pillar({ seed: 3, broken: a === 'broken' });
    case 'stump': return N.stump();
    case 'log': return N.log();
    case 'snowman': return N.snowman();
    case 'decal': return N.smallDecal(a, n + 1);
    case 'lilypad': return N.lilypad({ seed: n + 1 });
    case 'hedge': return N.hedgeBlock({ seed: n + 1 });
    default: return N.bush({ seed: 1 });
  }
}

export function sprite(key) {
  let s = cache.get(key);
  if (!s) { s = build(key); cache.set(key, s); }
  return s;
}

export function registerSprite(key, s) { cache.set(key, s); return s; }
export { Px };
