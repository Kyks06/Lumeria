import * as THREE from 'three';
import { Colliders } from './Colliders.js';
import { WATER_LEVEL } from './MapTerrain.js';

/**
 * CARTE CHARGÉE (extérieur, grotte, intérieur ou grille d'arène).
 * Regroupe la scène 3D, le relief, les collisions, les PNJ, les objets, les sorties et les portes.
 */
export class GameMap {
  constructor(def, kind, ctx) {
    this.def = def;
    this.id = def.id;
    this.kind = kind; // outdoor | cave | interior | grid
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.group.name = `map:${def.id}`;
    this.colliders = new Colliders(8);
    this.npcs = [];
    this.interactables = [];
    this.exits = def.exits || [];
    this.doors = [];
    this.warps = [];
    this.entries = {};
    this.items = [];
    this.obstacles = [];
    this.triggers = [];
    this.wild = null;
    this.spinners = [];
    this.updaters = [];
    this.smokes = [];
    this.lights = [];
    this.owned = [];
    this.waterY = WATER_LEVEL;
    this.terrain = null;
    this.bounds = null; // [minX, maxX, minZ, maxZ]
    this.canLandFromSurf = true;
  }

  /** Pont ou ponton sous ce point ? */
  bridgeAt(x, z) {
    if (!this.bridges) return null;
    for (const b of this.bridges) {
      const dx = x - b.x, dz = z - b.z;
      const along = dx * Math.sin(b.rot) + dz * Math.cos(b.rot);
      const across = dx * Math.cos(b.rot) - dz * Math.sin(b.rot);
      if (Math.abs(along) < b.hl && Math.abs(across) < b.hw) return b;
    }
    return null;
  }

  heightAt(x, z) {
    if (this.grid) return this.grid.heightAt(x, z);
    if (!this.terrain) return this.floorY ?? 0;
    const b = this.bridges?.length ? this.bridgeAt(x, z) : null;
    if (b) return Math.max(b.y, this.terrain.height(x, z));
    return this.terrain.height(x, z);
  }

  isWaterAt(x, z) {
    if (!this.terrain) return false;
    if (this.bridges?.length && this.bridgeAt(x, z)) return false;
    return this.terrain.isWater(x, z);
  }

  isIce(x, z) { return this.grid ? this.grid.isIce(x, z) : false; }
  snapToGrid(p, perpendicular) { this.grid?.snap(p, perpendicular); }

  inBounds(x, z, margin = 0) {
    if (!this.bounds) return true;
    const [a, b, c, d] = this.bounds;
    return x >= a - margin && x <= b + margin && z >= c - margin && z <= d + margin;
  }

  /** Peut-on aller de (x0,z0) à (x1,z1) ? (relief, eau, lave, bords) */
  canWalk(x0, z0, x1, z1, player) {
    if (this.grid) return this.grid.canWalk(x0, z0, x1, z1, player);
    if (!this.inBounds(x1, z1) && !this.exitGapAt(x1, z1)) return false;
    if (!this.terrain) return true;
    const surf = player?.mode === 'surf';
    if (this.terrain.isLava(x1, z1)) return false;
    const water1 = this.isWaterAt(x1, z1);
    if (!surf && water1) return false;
    if (surf) return water1 || (this.heightAt(x1, z1) < WATER_LEVEL + 1.0 && !this.bridgeAt(x1, z1));
    const d = Math.hypot(x1 - x0, z1 - z0) || 0.01;
    const rise = this.heightAt(x1, z1) - this.heightAt(x0, z0);
    return rise / d < 1.25;
  }

  exitGapAt(x, z) {
    if (!this.bounds) return null;
    const [a, b, c, d] = this.bounds;
    for (const e of this.exits) {
      const w = (e.w || 10) / 2;
      if (e.edge === 'north' && z < c + 1 && Math.abs(x - e.at) < w) return e;
      if (e.edge === 'south' && z > d - 1 && Math.abs(x - e.at) < w) return e;
      if (e.edge === 'west' && x < a + 1 && Math.abs(z - e.at) < w) return e;
      if (e.edge === 'east' && x > b - 1 && Math.abs(z - e.at) < w) return e;
    }
    return null;
  }

  /** Sortie franchie par le joueur ? */
  exitAt(x, z) {
    if (!this.bounds) return null;
    const [a, b, c, d] = this.bounds;
    for (const e of this.exits) {
      const w = (e.w || 10) / 2 + 1;
      if (e.edge === 'north' && z < c - 2.5 && Math.abs(x - e.at) < w) return e;
      if (e.edge === 'south' && z > d + 2.5 && Math.abs(x - e.at) < w) return e;
      if (e.edge === 'west' && x < a - 2.5 && Math.abs(z - e.at) < w) return e;
      if (e.edge === 'east' && x > b + 2.5 && Math.abs(z - e.at) < w) return e;
    }
    return null;
  }

  /** Porte ou téléporteur sous les pieds du joueur ? */
  warpAt(x, z) {
    for (const w of this.warps) {
      if (w.disabled || (this.ctx.flagOk && !this.ctx.flagOk(w))) continue;
      if (Math.hypot(x - w.x, z - w.z) < (w.r || 0.9)) return w;
    }
    return null;
  }

  entry(name) {
    if (this.entries[name]) return this.entries[name];
    const [a, b, c, d] = this.bounds || [-10, 10, -10, 10];
    const ex = this.exits.find((e) => e.edge === name);
    if (ex) {
      if (name === 'north') return { x: ex.at, z: c + 2.5, rot: Math.PI };
      if (name === 'south') return { x: ex.at, z: d - 2.5, rot: 0 };
      if (name === 'west') return { x: a + 2.5, z: ex.at, rot: Math.PI / 2 };
      if (name === 'east') return { x: b - 2.5, z: ex.at, rot: -Math.PI / 2 };
    }
    return this.entries.default || { x: 0, z: 0, rot: Math.PI };
  }

  addInteractable(it) { this.interactables.push(it); return it; }

  /** Élément interactif devant le joueur. */
  findInteractable(pos, rotY, reach = 2.4) {
    const fx = Math.sin(rotY), fz = Math.cos(rotY);
    let best = null, bestScore = Infinity;
    for (const it of this.interactables) {
      if (it.disabled) continue;
      const ip = it.pos;
      const dx = ip.x - pos.x, dz = ip.z - pos.z;
      const d = Math.hypot(dx, dz);
      const r = it.radius || reach;
      if (d > r) continue;
      if (d > 0.7 && (dx * fx + dz * fz) / d < 0.2) continue;
      const score = d / r;
      if (score < bestScore) { best = it; bestScore = score; }
    }
    return best;
  }

  update(dt, ctx) {
    for (const s of this.spinners) {
      s.obj.rotation.y += dt * (s.speed || 1);
      if (s.bob) s.obj.position.y = s.baseY + Math.sin(performance.now() * 0.002 + (s.phase || 0)) * s.bob;
    }
    for (const u of this.updaters) u(dt, ctx);
    for (const n of this.npcs) {
      if (!n.group.visible) continue;
      if (ctx.focus && n.position.distanceToSquared(ctx.focus) > 6400 && !n.target) continue;
      n.update(dt);
    }
    if (this.grid) this.grid.update(dt, ctx);
  }

  dispose() {
    for (const n of this.npcs) n.view?.dispose?.();
    this.wild?.clear();
    for (const g of this.owned) g.dispose?.();
    this.group.traverse((o) => { if (o.isInstancedMesh) o.dispose?.(); });
    this.group.parent?.remove(this.group);
  }
}
