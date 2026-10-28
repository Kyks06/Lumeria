/**
 * CONSTANTES DU MONDE EN TUILES.
 * Une tuile = 16 px. Extérieurs, grottes et arènes : 1 tuile = 2 m ; intérieurs : 1 tuile = 1 m.
 */
export const TILE = 16;

/** Indicateurs de collision / nature d'une tuile (bits). */
export const F = {
  BLOCK: 1,      // infranchissable à pied
  WATER: 2,      // eau (Surf)
  TALL: 4,       // hautes herbes (rencontres)
  LAVA: 8,
  BRIDGE: 16,    // pont ou ponton (franchissable au-dessus de l'eau)
  ICE: 32,       // glace (glissade)
  BORDER: 64,    // bord de carte (arbres, falaises, parois)
  WARP: 128,     // porte / téléporteur
};

/** Matières du sol. */
export const GROUND = { GRASS: 0, SAND: 1, SNOW: 2, ASH: 3, MUD: 4, CAVE: 5, GRAVEL: 6, FLOOR: 7 };

/** Directions : 0 bas (sud), 1 gauche (ouest), 2 droite (est), 3 haut (nord). */
export const DIRS = [[0, 1], [-1, 0], [1, 0], [0, -1]];
export const DIR_NAMES = ['down', 'left', 'right', 'up'];

/** Direction (0..3) depuis un angle « rotY » (0 = sud, π = nord, π/2 = est). */
export function dirFromRot(rot = 0) {
  const s = Math.sin(rot), c = Math.cos(rot);
  if (Math.abs(s) > Math.abs(c)) return s > 0 ? 2 : 1;
  return c >= 0 ? 0 : 3;
}
export function rotFromDir(d) { return [0, -Math.PI / 2, Math.PI / 2, Math.PI][d]; }
export function dirFromDelta(dx, dz) {
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 2 : 1;
  return dz >= 0 ? 0 : 3;
}

/** Grille de tuiles générique. */
export class Grid {
  constructor(cols, rows, Type = Uint8Array) {
    this.cols = cols; this.rows = rows;
    this.a = new Type(cols * rows);
  }
  inside(c, r) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  get(c, r, def = 0) { return c >= 0 && r >= 0 && c < this.cols && r < this.rows ? this.a[r * this.cols + c] : def; }
  set(c, r, v) { if (c >= 0 && r >= 0 && c < this.cols && r < this.rows) this.a[r * this.cols + c] = v; }
  or(c, r, v) { if (c >= 0 && r >= 0 && c < this.cols && r < this.rows) this.a[r * this.cols + c] |= v; }
  and(c, r, v) { if (c >= 0 && r >= 0 && c < this.cols && r < this.rows) this.a[r * this.cols + c] &= v; }
  has(c, r, bit) { return (this.get(c, r) & bit) !== 0; }
  fill(v) { this.a.fill(v); return this; }
}

/** Distances. */
export function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const L = dx * dx + dz * dz;
  let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t, z = az + dz * t;
  return Math.hypot(px - x, pz - z);
}
export function distToPolyline(px, pz, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distToSegment(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  return d;
}
