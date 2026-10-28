import { CREATURE_MAP } from '../config/creatures.js';
import { rollEncounter } from './encounters.js';
import { F } from './tiles.js';

/**
 * RENCONTRES ALÉATOIRES « À L'ANCIENNE » : chaque pas dans les hautes herbes, dans une grotte ou sur
 * l'eau peut déclencher un combat. Les herbes frémissent à chaque pas (dessiné par le rendu).
 */
export class Wild2D {
  constructor(map, ctx, tables) {
    this.map = map;
    this.ctx = ctx;
    this.grass = tables.grass || null;
    this.cave = tables.cave || null;
    this.surf = tables.surf || null;
    this.steps = 0;
  }

  clear() {}
  remove() {}

  /** @returns une « rencontre » { sp, level, shiny, method } ou null */
  update(dt, player, opts) {
    const ev = player.stepEvent;
    if (!ev) return null;
    player.stepEvent = null;
    if (!opts.canEncounter) return null;
    this.steps++;
    let table = null, method = null, rate = 0;
    if (player.mode === 'surf' && this.surf) { table = this.surf; method = 'surf'; rate = 0.07; }
    else if (ev.tall && this.grass) { table = this.grass; method = 'grass'; rate = player.mode === 'bike' ? 0.08 : 0.11; }
    else if (this.cave && player.mode !== 'surf' && !this.map.flags.has(ev.c, ev.r, F.BRIDGE)) { table = this.cave; method = 'cave'; rate = 0.055; }
    if (!table) return null;
    if (this.steps < 3) return null; // jamais dès les premiers pas après une transition
    if (Math.random() >= rate) return null;
    const enc = rollEncounter(table, this.ctx.timeOfDay());
    if (!enc) return null;
    if (opts.repel && opts.leadLevel > enc.level) return null;
    const sp = CREATURE_MAP[enc.species];
    if (!sp) return null;
    this.steps = 0;
    const shiny = Math.random() < 1 / (this.ctx.shinyOdds?.() || 1024);
    return { sp, level: enc.level, shiny, method, state: 'idle', timer: 0 };
  }
}
