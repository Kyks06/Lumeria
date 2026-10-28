import * as THREE from 'three';
import { createNoise2D, fbm, smoothstep, lerp, distToPolyline, clamp } from '../core/utils.js';
import { terrainMaterial } from '../render/Materials.js';

/**
 * RELIEF D'UNE CARTE : collines, chemins aplanis, places, lacs, rivières, mer, lave,
 * bordures (montagnes, falaises, forêt, parois de grotte) avec ouvertures aux sorties.
 * height(x, z) sert au rendu ET aux déplacements.
 */
export const WATER_LEVEL = -0.35;

export class MapTerrain {
  constructor(def, biome) {
    this.def = def;
    this.biome = biome;
    const seed = def.seed || 1;
    this.n1 = createNoise2D(seed * 7 + 1);
    this.n2 = createNoise2D(seed * 13 + 5);
    this.n3 = createNoise2D(seed * 31 + 9);
    const [W, D] = def.size;
    this.W = W; this.D = D;
    this.hills = def.hills ?? (biome.cave ? 0.4 : 2.6);
    this.paths = def.paths || [];
    this.pathW = def.pathWidth || (def.type === 'town' ? 3.4 : 2.6);
    this.plazas = def.plazas || [];
    this.lakes = def.lakes || [];
    this.rivers = def.rivers || [];
    this.lava = def.lava || [];
    this.sea = def.sea || null;
    this.pads = [];
    this.exits = def.exits || [];
    this.cave = !!biome.cave || def.type === 'cave';
    this.border = def.border || biome.border || 'forest';
    this.flatTowns = def.type === 'town';
    this.ridges = def.ridges || [];
  }

  addPad(x, z, w, d, rot = 0) {
    const q = Math.round(rot / (Math.PI / 2)) & 1;
    this.pads.push({ x, z, hw: (q ? d : w) / 2 + 1.5, hd: (q ? w : d) / 2 + 1.5, y: this.lowFreq(x, z) });
  }

  lowFreq(x, z) {
    if (this.flatTowns || this.cave) return 0;
    return fbm(this.n1, x * 0.006, z * 0.006, 2) * this.hills * 0.9;
  }

  pathDist(x, z) {
    let d = Infinity;
    for (const p of this.paths) d = Math.min(d, distToPolyline(x, z, p));
    return d;
  }

  /** Distance hors du rectangle jouable (négative à l'intérieur), ouvertures aux sorties. */
  outside(x, z) {
    const W = this.W / 2, D = this.D / 2;
    let o = Math.max(x - W, -W - x, z - D, -D - z);
    if (o > -14) {
      for (const e of this.exits) {
        const w = (e.w || 10) / 2 + 2;
        if (e.edge === 'north' && Math.abs(x - e.at) < w && z < 0) o = Math.min(o, Math.max(x - W, -W - x, z - D, -999));
        if (e.edge === 'south' && Math.abs(x - e.at) < w && z > 0) o = Math.min(o, Math.max(x - W, -W - x, -D - z, -999));
        if (e.edge === 'east' && Math.abs(z - e.at) < w && x > 0) o = Math.min(o, Math.max(-W - x, z - D, -D - z, -999));
        if (e.edge === 'west' && Math.abs(z - e.at) < w && x < 0) o = Math.min(o, Math.max(x - W, z - D, -D - z, -999));
      }
    }
    return o;
  }

  seaDepth(x, z) {
    if (!this.sea) return 0;
    const s = this.sea;
    const wob = this.n2(x * 0.03, z * 0.03) * 4;
    const coord = s.side === 'east' ? x - s.at : s.side === 'west' ? s.at - x : s.side === 'south' ? z - s.at : s.at - z;
    return coord + wob;
  }

  /** Masque d'ouverture des grottes : 1 dans les galeries, 0 dans la roche. */
  openMask(x, z) {
    const pd = this.pathDist(x, z);
    let m = 1 - smoothstep(this.pathW + 1.5, this.pathW + 4.5, pd + this.n3(x * 0.15, z * 0.15) * 1.4);
    for (const [px, pz, r] of this.plazas) m = Math.max(m, 1 - smoothstep(r - 1, r + 2.5, Math.hypot(x - px, z - pz) + this.n3(x * 0.12, z * 0.12) * 2));
    for (const [lx, lz, r] of this.lakes) m = Math.max(m, 1 - smoothstep(r + 2, r + 5, Math.hypot(x - lx, z - lz)));
    for (const p of this.pads) m = Math.max(m, (Math.abs(x - p.x) < p.hw + 1 && Math.abs(z - p.z) < p.hd + 1) ? 1 : 0);
    return m;
  }

  height(x, z) {
    const B = this.biome;
    let h = fbm(this.n1, x * 0.014, z * 0.014, 4) * this.hills + fbm(this.n2, x * 0.06, z * 0.06, 2) * 0.35 + this.hills * 0.25;
    if (B.dunes) h += (Math.abs(Math.sin(x * 0.045 + this.n3(x * 0.01, z * 0.01) * 3)) * 1.6 - 0.6) * (this.hills / 2.6);
    if (this.cave) h = this.n2(x * 0.08, z * 0.08) * 0.25;

    // aplanissement : chemins, places, emplacements de bâtiments
    const pd = this.pathDist(x, z);
    let flat = 1 - smoothstep(this.pathW, this.pathW + (this.flatTowns ? 6 : 7), pd);
    for (const [px, pz, r] of this.plazas) flat = Math.max(flat, 1 - smoothstep(r, r + 8, Math.hypot(x - px, z - pz)));
    let padY = null;
    for (const p of this.pads) {
      const dx = Math.max(0, Math.abs(x - p.x) - p.hw), dz = Math.max(0, Math.abs(z - p.z) - p.hd);
      const k = 1 - smoothstep(0, 5, Math.hypot(dx, dz));
      if (k > flat) { flat = k; padY = p.y; }
    }
    if (this.flatTowns) flat = Math.max(flat, 0.86);
    const target = padY ?? this.lowFreq(x, z);
    h = lerp(h, target, flat);
    // seuls les lacs, rivières et la mer creusent sous le niveau de l'eau (pas de mares accidentelles)
    h = Math.max(h, WATER_LEVEL + 0.3);

    // eau
    for (const [lx, lz, r] of this.lakes) {
      const d = Math.hypot(x - lx, z - lz);
      if (d < r + 9) h = lerp(h, -2.4, smoothstep(r + 7, r - 2, d));
    }
    for (const rv of this.rivers) {
      const d = distToPolyline(x, z, rv.pts);
      if (d < rv.w + 6) h = lerp(h, -1.9, smoothstep(rv.w / 2 + 4, rv.w / 2 - 0.5, d));
    }
    for (const [lx, lz, r] of this.lava) {
      const d = Math.hypot(x - lx, z - lz);
      if (d < r + 6) h = lerp(h, -1.4, smoothstep(r + 4, r - 1, d));
    }
    if (this.sea) {
      const sd = this.seaDepth(x, z);
      if (sd > -14) h = lerp(h, -3.2, smoothstep(-12, 6, sd));
    }

    // crêtes rocheuses (franchissables par Escalade)
    for (const rg of this.ridges) {
      const d = distToPolyline(x, z, rg.pts);
      const w = rg.w || 5;
      if (d < w + 1) h += (rg.h || 7) * smoothstep(w, w * 0.35, d) + this.n3(x * 0.2, z * 0.2) * smoothstep(w, 0, d) * 1.2;
    }

    // bordures
    const o = this.outside(x, z);
    if (this.cave) {
      const open = this.openMask(x, z);
      const wall = 7 + fbm(this.n3, x * 0.07, z * 0.07, 3) * 3;
      h = lerp(wall, h, open);
      if (o > -2) h = Math.max(h, lerp(h, wall + 2, smoothstep(-2, 3, o)));
      return h;
    }
    if (o > -10) {
      const t = smoothstep(-10, 30, o);
      const n = fbm(this.n3, x * 0.035, z * 0.035, 4) * 0.5 + 0.5;
      switch (this.border) {
        case 'mountain': h += t * t * 34 + t * n * 16; break;
        case 'cliff': h += smoothstep(-6, 4, o) * (9 + n * 6) + t * 10; break;
        case 'forest': h += t * 6 + t * n * 5; break;
        default: h += t * 12;
      }
      if (this.sea && this.seaDepth(x, z) > -4) h = Math.min(h, lerp(h, -3.2, smoothstep(-6, 6, this.seaDepth(x, z))));
    }
    return h;
  }

  isWater(x, z) { return this.height(x, z) < WATER_LEVEL - 0.25 && !this.isLava(x, z); }
  isLava(x, z) {
    for (const [lx, lz, r] of this.lava) if (Math.hypot(x - lx, z - lz) < r) return true;
    return false;
  }

  /** Pente locale (pour bloquer les falaises et parois). */
  steep(x0, z0, x1, z1) {
    return this.height(x1, z1) - this.height(x0, z0);
  }

  buildMesh() {
    const B = this.biome;
    const margin = this.cave ? 14 : 70;
    const W = this.W + margin * 2, D = this.D + margin * 2;
    const res = this.cave ? 1.2 : 2;
    const SX = Math.ceil(W / res), SZ = Math.ceil(D / res);
    const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const splat = new Float32Array(pos.count * 4);
    const tA = new THREE.Color(B.tint), tB = new THREE.Color(B.tintB), c = new THREE.Color();
    const hs = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = this.height(x, z);
      pos.setY(i, y);
      hs[i] = y;
    }
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = hs[i];
      const n = fbm(this.n2, x * 0.03, z * 0.03, 3) * 0.5 + 0.5;
      c.copy(tA).lerp(tB, n);
      const slope = 1 - nrm.getY(i);
      let wGrass = 1, wPath = 0, wRock = 0, wSpecial = 0;
      const pd = this.pathDist(x, z);
      wPath = 1 - smoothstep(this.pathW * 0.75, this.pathW + 1.4, pd + this.n3(x * 0.4, z * 0.4) * 0.6);
      for (const [px, pz, r] of this.plazas) wPath = Math.max(wPath, 1 - smoothstep(r - 1.5, r + 0.5, Math.hypot(x - px, z - pz) + this.n3(x * 0.3, z * 0.3) * 0.8));
      wRock = smoothstep(0.18, 0.42, slope) + (this.outside(x, z) > 6 && !this.cave ? smoothstep(6, 22, this.outside(x, z)) * 0.8 : 0);
      if (B.rocky) wRock += smoothstep(0.3, 0.7, this.n3(x * 0.05, z * 0.05)) * 0.6;
      const special = smoothstep(0.15, 0.55, this.n1(x * 0.02 + 40, z * 0.02 - 30));
      if (B.snow) wSpecial = 0.8 + special * 0.6;
      else if (B.lava) wSpecial = 0.7 + special * 0.6;
      else if (B.murky) wSpecial = special * 0.9;
      else if (B.dunes) wSpecial = 0.4;
      else wSpecial = smoothstep(WATER_LEVEL + 1.4, WATER_LEVEL - 0.2, y) * 2.5;
      if (this.cave) { wGrass = 1; wRock = smoothstep(0.5, 2.5, y) + smoothstep(0.2, 0.5, slope); wSpecial = special * 0.4; }
      if (B.snow && y > 18) wSpecial += 2;
      const k = i * 4;
      splat[k] = Math.max(0, wGrass * (1 - wPath) * (1 - Math.min(1, wRock)));
      splat[k + 1] = wPath;
      splat[k + 2] = wRock;
      splat[k + 3] = wSpecial * (1 - wPath * 0.8);
      const shade = this.cave ? 0.85 + n * 0.25 : 1;
      colors[i * 3] = c.r * shade; colors[i * 3 + 1] = c.g * shade; colors[i * 3 + 2] = c.b * shade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('splat', new THREE.BufferAttribute(splat, 4));
    const layers = [...B.layers];
    if (this.flatTowns && layers[1] === 'dirt') layers[1] = this.def.pathLayer || 'cobble';
    if (this.def.pathLayer) layers[1] = this.def.pathLayer;
    const scales = [0.22, layers[1] === 'cobble' ? 0.25 : 0.28, 0.12, 0.2];
    const mat = terrainMaterial(layers, scales);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }
}
