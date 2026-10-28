import { hexToRgb, outlineOf, rgbToHex } from './color.js';

/**
 * TAMPON DE PIXELS : dessin au pixel près (rectangles, disques, lignes, polygones),
 * contours automatiques, tramage, retournement, conversion en <canvas>.
 * Les couleurs sont des chaînes « #rrggbb » ou des tableaux [r, g, b].
 */
export class Px {
  constructor(w, h) {
    this.w = w | 0;
    this.h = h | 0;
    this.d = new Uint8ClampedArray(this.w * this.h * 4);
  }

  static fromCanvas(c) {
    const p = new Px(c.width, c.height);
    p.d.set(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
    return p;
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  i(x, y) { return ((y | 0) * this.w + (x | 0)) * 4; }
  a(x, y) { return this.inside(x, y) ? this.d[this.i(x, y) + 3] : 0; }
  get(x, y) { const i = this.i(x, y); return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  hex(x, y) { const i = this.i(x, y); return rgbToHex([this.d[i], this.d[i + 1], this.d[i + 2]]); }

  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const [r, g, b] = typeof c === 'string' ? hexToRgb(c) : c;
    const i = (y * this.w + x) * 4;
    if (a >= 255) { this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255; return; }
    const k = a / 255, ia = this.d[i + 3] / 255;
    const oa = k + ia * (1 - k);
    if (oa <= 0) return;
    this.d[i] = (r * k + this.d[i] * ia * (1 - k)) / oa;
    this.d[i + 1] = (g * k + this.d[i + 1] * ia * (1 - k)) / oa;
    this.d[i + 2] = (b * k + this.d[i + 2] * ia * (1 - k)) / oa;
    this.d[i + 3] = oa * 255;
  }

  /** Ne peint que là où il y a déjà un pixel opaque. */
  paint(x, y, c) { if (this.a(x, y) > 0) this.set(x, y, c, 255); }
  clear(x, y) { if (this.inside(x, y)) this.d[this.i(x, y) + 3] = 0; }

  fill(c) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.set(x, y, c); return this; }
  rect(x, y, w, h, c, a = 255) { for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) this.set(x + k, y + j, c, a); return this; }
  hline(x0, x1, y, c) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c); }

  /** Disque plein (centre éventuellement au demi-pixel). */
  disc(cx, cy, r, c, fn = null) {
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) { if (fn) fn(x, y, dx / r, dy / r); else this.set(x, y, c); }
      }
    }
  }

  ellipse(cx, cy, rx, ry, c, fn = null) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) { if (fn) fn(x, y, dx, dy); else this.set(x, y, c); }
      }
    }
  }

  line(x0, y0, x1, y1, c, w = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (w <= 1) this.set(x0, y0, c); else this.rect(x0 - ((w - 1) >> 1), y0 - ((w - 1) >> 1), w, w, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Polygone plein (règle pair-impair), points [[x,y],…]. */
  poly(pts, c, fn = null) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) { if (fn) fn(x, y); else this.set(x, y, c); }
      }
    }
  }

  /** Copie (avec transparence) d'un autre tampon. */
  blit(src, x, y, { flip = false, alpha = 1, only = null } = {}) {
    for (let j = 0; j < src.h; j++) for (let k = 0; k < src.w; k++) {
      const si = src.i(flip ? src.w - 1 - k : k, j);
      const a = src.d[si + 3];
      if (!a) continue;
      if (only && !only(x + k, y + j)) continue;
      this.set(x + k, y + j, [src.d[si], src.d[si + 1], src.d[si + 2]], a * alpha);
    }
    return this;
  }

  /**
   * Contour de 1 px autour des pixels opaques.
   * color : couleur fixe, ou null → assombrissement du pixel voisin intérieur (contour « coloré »).
   * diag : inclure les diagonales (contour plus épais aux angles).
   */
  outline(color = null, { diag = false, k = 0.74, skip = null } = {}) {
    const src = new Uint8ClampedArray(this.d);
    const at = (x, y) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? src[(y * this.w + x) * 4 + 3] : 0);
    const N = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (at(x, y) > 0) continue;
      let best = null;
      for (const [dx, dy] of N) {
        if (at(x + dx, y + dy) > 127) { best = [x + dx, y + dy]; break; }
      }
      if (!best) continue;
      if (skip && skip(x, y)) continue;
      if (color) this.set(x, y, color);
      else {
        const i = (best[1] * this.w + best[0]) * 4;
        this.set(x, y, outlineOf(rgbToHex([src[i], src[i + 1], src[i + 2]]), k));
      }
    }
    return this;
  }

  /** Remplace les pixels du bord intérieur (silhouette) par une version assombrie (contour intérieur). */
  innerEdge(k = 0.55, sides = 'all') {
    const src = new Uint8ClampedArray(this.d);
    const at = (x, y) => (x >= 0 && y >= 0 && x < this.w && y < this.h ? src[(y * this.w + x) * 4 + 3] : 0);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!at(x, y)) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      if (!edge) continue;
      if (sides === 'bottomright' && !(!at(x + 1, y) || !at(x, y + 1))) continue;
      const i = (y * this.w + x) * 4;
      this.set(x, y, outlineOf(rgbToHex([src[i], src[i + 1], src[i + 2]]), k));
    }
    return this;
  }

  /** Retire les pixels isolés (nettoyage après réduction). */
  despeckle() {
    const src = new Uint8ClampedArray(this.d);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = (y * this.w + x) * 4;
      if (!src[i + 3]) continue;
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < this.w && yy < this.h && src[(yy * this.w + xx) * 4 + 3]) n++;
      }
      if (n === 0) this.d[i + 3] = 0;
    }
    return this;
  }

  flipX() {
    const out = new Px(this.w, this.h);
    out.blit(this, 0, 0, { flip: true });
    return out;
  }

  clone() { const p = new Px(this.w, this.h); p.d.set(this.d); return p; }

  /** Boîte englobante des pixels opaques. */
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[(y * this.w + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  toCanvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    if (this.w && this.h) c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }

  /** Silhouette noire (pour les ombres portées). */
  silhouette(color = [0, 0, 0]) {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    if (!this.w || !this.h) return c;
    const d = new Uint8ClampedArray(this.d.length);
    for (let i = 0; i < d.length; i += 4) { if (this.d[i + 3] > 100) { d[i] = color[0]; d[i + 1] = color[1]; d[i + 2] = color[2]; d[i + 3] = 255; } }
    c.getContext('2d').putImageData(new ImageData(d, this.w, this.h), 0, 0);
    return c;
  }
}

/** Canvas 2D vide. */
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  return c;
}

export function ctx2d(c) {
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return x;
}
