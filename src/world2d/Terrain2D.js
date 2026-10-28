import { distToPolyline } from './tiles.js';

/**
 * TERRAIN D'UNE CARTE (logique pure, sans rendu) : chemins, places, lacs, rivières, mer, lave,
 * crêtes, bords de carte avec ouvertures aux sorties, galeries de grotte.
 * Toutes les distances sont en mètres, dans le repère des définitions de cartes (src/maps).
 */
function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export class Terrain2D {
  constructor(def, biome) {
    this.def = def;
    this.biome = biome;
    this.seed = def.seed || 1;
    const [W, D] = def.size;
    this.W = W; this.D = D;
    this.paths = def.paths || [];
    this.pathW = def.pathWidth || (def.type === 'town' ? 3.4 : 2.6);
    this.plazas = def.plazas || [];
    this.lakes = def.lakes || [];
    this.rivers = def.rivers || [];
    this.lava = def.lava || [];
    this.sea = def.sea || null;
    this.exits = def.exits || [];
    this.ridges = def.ridges || [];
    this.cave = !!biome.cave || def.type === 'cave';
  }

  n(x, z, f = 0.05, s = 0) { return noise(x * f, z * f, this.seed * 7 + s); }

  pathDist(x, z) {
    let d = Infinity;
    for (const p of this.paths) d = Math.min(d, distToPolyline(x, z, p));
    return d;
  }

  /** Distance hors du rectangle jouable (négative à l'intérieur) ; les sorties sont des couloirs ouverts. */
  outside(x, z) {
    const W = this.W / 2, D = this.D / 2;
    let o = Math.max(x - W, -W - x, z - D, -D - z);
    if (o > -14) {
      for (const e of this.exits) {
        const w = (e.w || 10) / 2;
        if (e.edge === 'north' && Math.abs(x - e.at) < w && z < 0) o = Math.min(o, Math.max(x - W, -W - x, z - D, -999));
        if (e.edge === 'south' && Math.abs(x - e.at) < w && z > 0) o = Math.min(o, Math.max(x - W, -W - x, -D - z, -999));
        if (e.edge === 'east' && Math.abs(z - e.at) < w && x > 0) o = Math.min(o, Math.max(-W - x, z - D, -D - z, -999));
        if (e.edge === 'west' && Math.abs(z - e.at) < w && x < 0) o = Math.min(o, Math.max(x - W, z - D, -D - z, -999));
      }
    }
    return o;
  }

  seaDepth(x, z) {
    if (!this.sea) return -99;
    const s = this.sea;
    const wob = (this.n(x, z, 0.035, 3) - 0.5) * 12 + (this.n(x, z, 0.14, 13) - 0.5) * 3;
    const coord = s.side === 'east' ? x - s.at : s.side === 'west' ? s.at - x : s.side === 'south' ? z - s.at : s.at - z;
    return coord + wob;
  }

  /** Profondeur continue (m) : > 0 dans l'eau, > 3 en eau profonde. */
  waterDepth(x, z, segs = null) {
    let depth = -99;
    for (const [lx, lz, r] of this.lakes) {
      const d = Math.hypot(x - lx, z - lz) + (this.n(x, z, 0.22, 5) - 0.5) * 2.2;
      depth = Math.max(depth, r + 0.6 - d);
    }
    for (const rv of this.rivers) {
      const d = distToPolyline(x, z, rv.pts) + (this.n(x, z, 0.2, 6) - 0.5) * 1.4;
      depth = Math.max(depth, rv.w / 2 + 0.6 - d);
    }
    if (this.sea) depth = Math.max(depth, this.seaDepth(x, z) + 5.5);
    return depth;
  }

  /** 0 = terre, 1 = eau peu profonde, 2 = eau profonde. */
  water(x, z) {
    const d = this.waterDepth(x, z);
    return d > 3.2 ? 2 : d > 0 ? 1 : 0;
  }

  isLava(x, z) {
    for (const [lx, lz, r] of this.lava) if (Math.hypot(x - lx, z - lz) + (this.n(x, z, 0.3, 8) - 0.5) * 1.4 < r) return true;
    return false;
  }

  /** Segments de chemin proches d'une zone (accélère le dessin). */
  segmentsNear(x0, z0, x1, z1, pad = 6) {
    const out = [];
    for (const p of this.paths) for (let i = 0; i < p.length - 1; i++) {
      const [ax, az] = p[i], [bx, bz] = p[i + 1];
      if (Math.max(ax, bx) < x0 - pad || Math.min(ax, bx) > x1 + pad || Math.max(az, bz) < z0 - pad || Math.min(az, bz) > z1 + pad) continue;
      out.push([ax, az, bx, bz]);
    }
    return out;
  }

  isPath(x, z, segs = null) {
    let pdRaw;
    if (segs) { pdRaw = Infinity; for (const [ax, az, bx, bz] of segs) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; let t = L2 ? ((x - ax) * dx + (z - az) * dz) / L2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const ex = ax + dx * t - x, ez = az + dz * t - z; const d = Math.sqrt(ex * ex + ez * ez); if (d < pdRaw) pdRaw = d; } }
    else pdRaw = this.pathDist(x, z);
    const pd = pdRaw + (this.n(x, z, 0.35, 1) - 0.5) * 0.9;
    if (pd < this.pathW * 0.86) return true;
    for (const [px, pz, r] of this.plazas) if (Math.hypot(x - px, z - pz) + (this.n(x, z, 0.3, 2) - 0.5) * 1.2 < r - 0.2) return true;
    return false;
  }

  ridgeAt(x, z) {
    for (const rg of this.ridges) {
      const d = distToPolyline(x, z, rg.pts) + (this.n(x, z, 0.2, 9) - 0.5) * 1.2;
      if (d < (rg.w || 5) * 0.55) return rg;
    }
    return null;
  }

  /** Grottes : 1 dans les galeries, 0 dans la roche. */
  open(x, z) {
    const pd = this.pathDist(x, z) + (this.n(x, z, 0.15, 4) - 0.5) * 2.8;
    if (pd < this.pathW + 3.2) return true;
    for (const [px, pz, r] of this.plazas) if (Math.hypot(x - px, z - pz) + (this.n(x, z, 0.12, 4) - 0.5) * 3 < r + 1) return true;
    for (const [lx, lz, r] of this.lakes) if (Math.hypot(x - lx, z - lz) < r + 3.5) return true;
    return false;
  }
}

export { noise as terrainNoise, hash as terrainHash };
