/**
 * Collisions 2D (plan XZ) avec hauteur : cercles (arbres, rochers, PNJ) et boîtes (bâtiments, murs).
 * Grille spatiale pour des requêtes rapides. Sert au joueur ET à la caméra (pas de traversée des murs).
 */
export class Colliders {
  constructor(cell = 8) {
    this.cell = cell;
    this.grid = new Map();
    this.all = new Set();
  }

  key(cx, cz) { return `${cx},${cz}`; }

  insert(c) {
    this.all.add(c);
    const [minX, minZ, maxX, maxZ] = this.bounds(c);
    c.cells = [];
    for (let cx = Math.floor(minX / this.cell); cx <= Math.floor(maxX / this.cell); cx++) {
      for (let cz = Math.floor(minZ / this.cell); cz <= Math.floor(maxZ / this.cell); cz++) {
        const k = this.key(cx, cz);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(c);
        c.cells.push(k);
      }
    }
    return c;
  }

  bounds(c) {
    if (c.type === 'circle') return [c.x - c.r, c.z - c.r, c.x + c.r, c.z + c.r];
    return [c.minX, c.minZ, c.maxX, c.maxZ];
  }

  addCircle(x, z, r, { h = 12, camera = true, tag = null } = {}) {
    return this.insert({ type: 'circle', x, z, r, h, camera, tag, enabled: true });
  }

  /** Boîte centrée (x,z) de taille w×d tournée par pas de 90° (rot en radians). */
  addBox(x, z, w, d, { rot = 0, h = 12, camera = true, tag = null } = {}) {
    const q = Math.round(rot / (Math.PI / 2)) & 1;
    const hw = (q ? d : w) / 2, hd = (q ? w : d) / 2;
    return this.insert({ type: 'box', minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd, h, camera, tag, enabled: true });
  }

  move(c, x, z) {
    if (!c) return;
    this.remove(c);
    if (c.type === 'circle') { c.x = x; c.z = z; } else {
      const hw = (c.maxX - c.minX) / 2, hd = (c.maxZ - c.minZ) / 2;
      c.minX = x - hw; c.maxX = x + hw; c.minZ = z - hd; c.maxZ = z + hd;
    }
    this.insert(c);
  }

  remove(c) {
    if (!c) return;
    this.all.delete(c);
    for (const k of c.cells || []) {
      const list = this.grid.get(k);
      if (list) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); }
    }
  }

  query(x, z, radius, out = []) {
    out.length = 0;
    const seen = new Set();
    for (let cx = Math.floor((x - radius) / this.cell); cx <= Math.floor((x + radius) / this.cell); cx++) {
      for (let cz = Math.floor((z - radius) / this.cell); cz <= Math.floor((z + radius) / this.cell); cz++) {
        const list = this.grid.get(this.key(cx, cz));
        if (!list) continue;
        for (const c of list) if (c.enabled && !seen.has(c)) { seen.add(c); out.push(c); }
      }
    }
    return out;
  }

  /** Repousse un cercle mobile (pos.x, pos.z, rayon r) hors des obstacles. */
  resolve(pos, r, yBase = 0) {
    const list = this.query(pos.x, pos.z, r + 2, this._q || (this._q = []));
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const c of list) {
        if (c.type === 'circle') {
          const dx = pos.x - c.x, dz = pos.z - c.z;
          const d = Math.hypot(dx, dz), min = c.r + r;
          if (d < min && d > 1e-5) {
            const k = (min - d) / d;
            pos.x += dx * k; pos.z += dz * k;
            moved = true;
          }
        } else {
          const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
          const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
          const dx = pos.x - cx, dz = pos.z - cz;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            if (d2 > 1e-8) {
              const d = Math.sqrt(d2), k = (r - d) / d;
              pos.x += dx * k; pos.z += dz * k;
            } else {
              const pushL = pos.x - c.minX + r, pushR = c.maxX - pos.x + r;
              const pushB = pos.z - c.minZ + r, pushF = c.maxZ - pos.z + r;
              const m = Math.min(pushL, pushR, pushB, pushF);
              if (m === pushL) pos.x -= pushL; else if (m === pushR) pos.x += pushR;
              else if (m === pushB) pos.z -= pushB; else pos.z += pushF;
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    return pos;
  }

  /** Le point (x,y,z) est-il dans un obstacle bloquant la caméra ? */
  blocksCamera(x, y, z, pad = 0.3) {
    const list = this.query(x, z, pad + 1, this._qc || (this._qc = []));
    for (const c of list) {
      if (!c.camera || y > c.h) continue;
      if (c.type === 'circle') {
        if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
      } else if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
    }
    return false;
  }
}
