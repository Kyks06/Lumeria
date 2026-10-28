import * as THREE from 'three';
import { F, DIRS, Grid, dirFromRot } from './tiles.js';

/** Bit supplémentaire : comptoir (on parle par-dessus). */
F.COUNTER = 256;
F.NOSIGHT = 512;

/**
 * CARTE EN TUILES (extérieur, grotte, intérieur ou arène) avec l'interface de l'ancienne GameMap :
 * PNJ, éléments interactifs, portes, sorties, déclencheurs, entrées, rencontres.
 * Les coordonnées restent en mètres (celles des définitions de cartes) ; T mètres par tuile.
 */
export class Map2D {
  constructor(def, kind, ctx, { T, cols, rows, ox, oz }) {
    this.def = def;
    this.id = def.id;
    this.kind = kind;
    this.ctx = ctx;
    this.T = T;
    this.cols = cols; this.rows = rows;
    this.ox = ox; this.oz = oz;
    this.ppm = 16 / T;
    this.flags = new Grid(cols, rows, Uint16Array);
    this.group = { visible: true };
    this.npcs = [];
    this.interactables = [];
    this.exits = def.exits || [];
    this.warps = [];
    this.entries = {};
    this.items = [];
    this.obstacles = [];
    this.triggers = [];
    this.wild = null;
    this.smokes = [];
    this.lights = [];          // compatibilité (lumières 3D)
    this.lights2d = [];        // { x, y, r, color, flicker } en pixels du monde
    this.sprites = [];         // décor fixe trié en Y
    this.rustles = [];
    this.tallGrass = [];
    this.bounds = null;
    this.player = null;
    this.time = 0;
    this.colliders = {
      all: new Set(),
      remove: (c) => { if (!c) return; c.enabled = false; c.onRemove?.(); },
      move: () => {},
      addCircle: () => ({ enabled: true }),
      addBox: () => ({ enabled: true }),
      blocksCamera: () => false,
      resolve: (p) => p,
    };
  }

  // ── Repères ────────────────────────────────────────────────────────
  tileOf(x, z) { return [Math.floor((x - this.ox) / this.T), Math.floor((z - this.oz) / this.T)]; }
  center(c, r) { return { x: this.ox + (c + 0.5) * this.T, z: this.oz + (r + 0.5) * this.T }; }
  inside(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  /** Mètres → pixels du monde. */
  px(x) { return (x - this.ox) * this.ppm; }
  pz(z) { return (z - this.oz) * this.ppm; }
  worldOfPx(X, Y) { return { x: this.ox + X / this.ppm, z: this.oz + Y / this.ppm }; }

  heightAt() { return 0; }
  isWaterAt(x, z) {
    const [c, r] = this.tileOf(x, z);
    const f = this.flags.get(c, r);
    return (f & F.WATER) !== 0 && (f & F.BRIDGE) === 0;
  }
  isLavaAt(x, z) { const [c, r] = this.tileOf(x, z); return this.flags.has(c, r, F.LAVA); }
  isIce(x, z) { const [c, r] = this.tileOf(x, z); return this.flags.has(c, r, F.ICE); }
  snapToGrid(p) { const [c, r] = this.tileOf(p.x, p.z); const q = this.center(c, r); p.x = q.x; p.z = q.z; }

  inBounds(x, z, margin = 0) {
    if (!this.bounds) return true;
    const [a, b, c, d] = this.bounds;
    return x >= a - margin && x <= b + margin && z >= c - margin && z <= d + margin;
  }

  // ── Déplacements ───────────────────────────────────────────────────
  /** Personnage sur (ou en route vers) la tuile. */
  actorAt(c, r, except = null) {
    for (const n of this.npcs) {
      if (n === except || !n.group.visible || !n.collider.enabled) continue;
      const [a, b] = n.tile(this);
      if (a === c && b === r) return n;
      if (n.move && n.move.tc === c && n.move.tr === r) return n;
    }
    const P = this.player;
    if (P && P !== except && P.group.visible && P.map === this) {
      const [a, b] = P.tile(this);
      if (a === c && b === r) return P;
      if (P.move && P.move.tc === c && P.move.tr === r) return P;
    }
    return null;
  }

  canEnter(actor, c, r, dir, sliding = false) {
    if (!this.inside(c, r)) return false;
    const f = this.flags.get(c, r);
    if (this.grid && this.grid.blocked(c, r, actor)) return false;
    if (f & F.LAVA) return false;
    if (actor?.mode === 'surf') {
      if (f & F.BRIDGE) return false;
      if (f & F.BLOCK) return false;
      return !this.actorAt(c, r, actor);
    }
    if (f & F.BLOCK) return false;
    if ((f & F.WATER) && !(f & F.BRIDGE)) return false;
    if (this.actorAt(c, r, actor)) return false;
    return true;
  }

  /** Compatibilité (scripts, rochers) : la destination est-elle praticable à pied ? */
  canWalk(x0, z0, x1, z1, actor) {
    const [c, r] = this.tileOf(x1, z1);
    return this.canEnter(actor || null, c, r, 0);
  }

  solidForSight(c, r, except) {
    const f = this.flags.get(c, r);
    if (f & (F.BLOCK | F.NOSIGHT)) return true;
    if (this.grid && this.grid.blocked(c, r, null)) return true;
    for (const n of this.npcs) {
      if (n === except || !n.group.visible) continue;
      const [a, b] = n.tile(this);
      if (a === c && b === r) return true;
    }
    return false;
  }

  /** Chemin le plus court sur la grille (BFS borné) ; null si aucun. */
  findPath(c0, r0, c1, r1, actor) {
    if (c0 === c1 && r0 === r1) return [];
    const key = (c, r) => r * this.cols + c;
    const prev = new Map([[key(c0, r0), -1]]);
    const q = [[c0, r0]];
    let found = false;
    while (q.length && prev.size < 2500) {
      const [c, r] = q.shift();
      if (c === c1 && r === r1) { found = true; break; }
      for (const [dc, dr] of DIRS) {
        const nc = c + dc, nr = r + dr, k = key(nc, nr);
        if (prev.has(k) || !this.inside(nc, nr)) continue;
        const end = nc === c1 && nr === r1;
        if (!end) {
          const f = this.flags.get(nc, nr);
          if (f & (F.BLOCK | F.LAVA) || ((f & F.WATER) && !(f & F.BRIDGE))) continue;
          if (this.grid && this.grid.blocked(nc, nr, actor)) continue;
        }
        prev.set(k, key(c, r));
        q.push([nc, nr]);
      }
    }
    if (!found) return null;
    const out = [];
    let k = key(c1, r1);
    while (k !== key(c0, r0) && k !== -1) { out.unshift([k % this.cols, Math.floor(k / this.cols)]); k = prev.get(k); }
    return out;
  }

  // ── Portes, sorties, entrées ───────────────────────────────────────
  warpAt(x, z) {
    const [c, r] = this.tileOf(x, z);
    for (const w of this.warps) {
      if (w.disabled || (this.ctx.flagOk && !this.ctx.flagOk(w))) continue;
      const [wc, wr] = w.tile || this.tileOf(w.x, w.z);
      if (wc === c && wr === r) return w;
    }
    return null;
  }

  exitAt(x, z) {
    if (!this.bounds) return null;
    const [a, b, c, d] = this.bounds;
    const m = this.T * 1.2;
    for (const e of this.exits) {
      const w = (e.w || 10) / 2 + this.T;
      if (e.edge === 'north' && z < c - m && Math.abs(x - e.at) < w) return e;
      if (e.edge === 'south' && z > d + m && Math.abs(x - e.at) < w) return e;
      if (e.edge === 'west' && x < a - m && Math.abs(z - e.at) < w) return e;
      if (e.edge === 'east' && x > b + m && Math.abs(z - e.at) < w) return e;
    }
    return null;
  }

  entry(name) {
    if (this.entries[name]) return this.entries[name];
    const [a, b, c, d] = this.bounds || [-10, 10, -10, 10];
    const ex = this.exits.find((e) => e.edge === name);
    const T = this.T;
    if (ex) {
      const at = (x, z, rot) => {
        let [cc, rr] = this.tileOf(x, z);
        // tuile praticable la plus proche dans le couloir
        for (let k = 0; k < 6 && !this.canEnter(null, cc, rr, 0); k++) {
          if (name === 'north') rr++; else if (name === 'south') rr--; else if (name === 'west') cc++; else cc--;
        }
        const p = this.center(cc, rr);
        return { x: p.x, z: p.z, rot };
      };
      if (name === 'north') return at(ex.at, c + T * 0.6, Math.PI * 0 + 0);
      if (name === 'south') return at(ex.at, d - T * 0.6, Math.PI);
      if (name === 'west') return at(a + T * 0.6, ex.at, Math.PI / 2);
      if (name === 'east') return at(b - T * 0.6, ex.at, -Math.PI / 2);
    }
    return this.entries.default || { x: 0, z: 0, rot: Math.PI };
  }

  /** Déclencheur aligné sur les tuiles (il contient toujours au moins un centre de tuile). */
  addTrigger(tr) {
    const T = this.T;
    let [c0, r0] = this.tileOf(tr.x - tr.w / 2 + 0.001, tr.z - tr.d / 2 + 0.001);
    let [c1, r1] = this.tileOf(tr.x + tr.w / 2 - 0.001, tr.z + tr.d / 2 - 0.001);
    if (c1 < c0) c1 = c0; if (r1 < r0) r1 = r0;
    const a = this.center(c0, r0), b = this.center(c1, r1);
    const out = { ...tr, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, w: (c1 - c0 + 1) * T, d: (r1 - r0 + 1) * T, orig: tr };
    this.triggers.push(out);
    return out;
  }

  // ── Interactions ───────────────────────────────────────────────────
  addInteractable(it) {
    if (!it.pos && it.x !== undefined) it.pos = new THREE.Vector3(it.x, 0, it.z);
    this.interactables.push(it);
    return it;
  }

  /** Élément interactif sur la tuile située devant le personnage (ou derrière un comptoir). */
  findInteractable(pos, rotY) {
    const [c, r] = this.tileOf(pos.x, pos.z);
    const [dc, dr] = DIRS[dirFromRot(rotY)];
    const look = (fc, fr) => {
      for (const it of this.interactables) {
        if (it.disabled) continue;
        if (it.npc && (!it.npc.group.visible)) continue;
        if (it.tiles) { for (const [a, b] of it.tiles) if (a === fc && b === fr) return it; continue; }
        const [a, b] = it.npc ? it.npc.tile(this) : this.tileOf(it.pos.x, it.pos.z);
        if (a === fc && b === fr) return it;
      }
      return null;
    };
    const f1 = look(c + dc, r + dr);
    if (f1) return f1;
    if (this.flags.has(c + dc, r + dr, F.COUNTER)) return look(c + dc * 2, r + dr * 2);
    return null;
  }

  rustle(c, r) { this.rustles.push({ c, r, t: 0 }); }

  onArrive(actor, c, r) { if (this.grid && actor === this.player) this.grid.onArrive(actor, c, r); }
  forcedDir(actor, c, r) { return this.grid ? this.grid.forcedDir(actor, c, r) : null; }
  onBump(actor, c, r, dir) { if (this.grid && actor === this.player) this.grid.onBump(actor, c, r, dir); }

  update(dt, ctx) {
    this.time += dt;
    for (const n of this.npcs) {
      if (!n.group.visible) continue;
      n.update(dt);
    }
    for (let i = this.rustles.length - 1; i >= 0; i--) { const g = this.rustles[i]; g.t += dt; if (g.t > 0.35) this.rustles.splice(i, 1); }
    if (this.grid) this.grid.update(dt, ctx);
  }

  dispose() {
    this.wild?.clear?.();
    this.disposed = true;
  }
}
