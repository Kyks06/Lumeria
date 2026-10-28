import { Px } from './Px.js';
import { rng, bayer, valueNoise, hash2, shade, outlineOf, mixHex, hexToRgb } from './color.js';

/**
 * VÉGÉTATION ET ROCHERS EN PIXEL ART, générés procéduralement (lumière en haut à gauche,
 * 5 tons par matière, tramage ordonné, contours colorés) dans l'esprit des RPG GBA.
 * Chaque sprite : { canvas, shadow, w, h, ax, ay } — (ax, ay) = point posé au sol.
 */
export const PAL = {
  oak: ['#173419', '#2a5f2a', '#45923a', '#73bf4c', '#b4e468'],
  oakDark: ['#11281a', '#1f4a26', '#327236', '#539c46', '#86c65c'],
  oakLight: ['#24461f', '#3f7a2e', '#66ad40', '#98d25a', '#d2f282'],
  cherry: ['#55203f', '#8e3a66', '#c86595', '#eb9dc2', '#ffdcee'],
  autumn: ['#4a1c10', '#8a3816', '#c8642a', '#eda040', '#ffd77a'],
  willow: ['#22301a', '#3b5826', '#5f8038', '#8aa850', '#bdd57c'],
  pine: ['#0f2a22', '#1c4834', '#2c6a44', '#4a9257', '#7cbc6c'],
  palm: ['#1c3a18', '#2c6428', '#4c9236', '#7abc48', '#b2e272'],
  celeste: ['#28463a', '#3e7458', '#5ea47a', '#8ed09a', '#d0f4c8'],
  charred: ['#120d0c', '#231a17', '#3a2c26', '#56443a', '#776052'],
  trunk: ['#24160f', '#432a1a', '#684428', '#8f6a40', '#b48f5c'],
  birchBark: ['#3a3a40', '#8a8a92', '#c8c8cc', '#e8e8ea', '#ffffff'],
  dead: ['#241c18', '#40342c', '#5e4e42', '#7e6c5c', '#a08c78'],
  rock: ['#2a2830', '#4c4a54', '#76747e', '#a4a2aa', '#d4d2d6'],
  rockWarm: ['#2e2620', '#544638', '#7e6c58', '#a8967e', '#d4c4a8'],
  rockDark: ['#141216', '#26222a', '#3c3640', '#58505c', '#7a7080'],
  sandstone: ['#4a3222', '#7c5838', '#ac8256', '#d0aa78', '#eed4a2'],
  snow: ['#5a6a88', '#8a9cbc', '#bccce4', '#e4eef8', '#ffffff'],
  ice: ['#1a4a6a', '#3a82aa', '#6ab8dc', '#a8e0f4', '#ecfcff'],
  cactus: ['#143a22', '#22603a', '#348a4c', '#58b064', '#98d884'],
  mushroomRed: ['#4a0e14', '#8a1e26', '#c83a36', '#ee6a54', '#ffb09a'],
  mushroomPurple: ['#2a1244', '#4e2276', '#7a3cae', '#a868d8', '#dcaaff'],
  stem: ['#5a4a3a', '#9a8a70', '#d0c4a8', '#ece4d0', '#fffaf0'],
};

const L = (() => { const v = [-0.55, -0.68, 0.48]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

export function makeSprite(px, ax, ay, extra = {}) {
  const canvas = px.toCanvas();
  return { canvas, shadow: px.silhouette(), w: px.w, h: px.h, ax, ay, px, ...extra };
}

/** Choisit un ton 0..n-1 à partir d'une intensité 0..1 avec tramage. */
function tone(I, x, y, n = 5, dither = 0.12, thr = null) {
  const t = thr || [0.16, 0.36, 0.6, 0.83];
  const v = I + (bayer(x, y) - 0.5) * dither;
  let k = 0;
  while (k < t.length && v > t[k]) k++;
  return Math.min(n - 1, k);
}

/* ═════════ ARBRES FEUILLUS (houppier en grappes) ═════════ */
export function leafyTree({ seed = 1, pal = PAL.oak, trunk = PAL.trunk, w = 32, h = 40, canopyR = 14, blossom = false, fruit = null, trunkW = 6, birch = false } = {}) {
  const R = rng(seed * 131 + 7);
  const px = new Px(w, h);
  const cx = w / 2, baseY = h - 2;
  const ccy = Math.round(canopyR + 1);
  // Tronc court avec racines
  const tTop = ccy + Math.round(canopyR * 0.5), tw = trunkW;
  const bark = birch ? PAL.birchBark : trunk;
  for (let y = tTop; y <= baseY; y++) {
    const flare = y >= baseY ? 3 : y >= baseY - 1 ? 2 : y >= baseY - 2 ? 1 : 0;
    const x0 = Math.round(cx - tw / 2) - flare, x1 = Math.round(cx + tw / 2) - 1 + flare;
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      let k = u < 0.25 ? 3 : u < 0.62 ? 2 : 1;
      if (y < tTop + 5) k = Math.max(0, k - 1); // ombre du houppier
      if (birch && hash2(x, y >> 1, seed) < 0.2) k = 0;
      if (!birch && (x - x0) % 3 === 1 && hash2(x, y, seed) < 0.45) k = Math.max(0, k - 1);
      px.set(x, y, bark[k]);
    }
  }
  // Grappes du houppier (chacune éclairée comme une petite sphère)
  const blobs = [];
  const n = 8 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * 0.45;
    const d = canopyR * (0.5 + R() * 0.12);
    blobs.push({ x: cx + Math.cos(a) * d * 1.02, y: ccy + Math.sin(a) * d * 0.84 + 1, r: canopyR * (0.44 + R() * 0.1) });
  }
  blobs.push({ x: cx + (R() - 0.5) * 3, y: ccy, r: canopyR * 0.62 });
  for (let i = 0; i < 3; i++) blobs.push({ x: cx + (i - 1) * canopyR * 0.42 + (R() - 0.5) * 2, y: ccy - canopyR * (0.32 + R() * 0.12), r: canopyR * (0.38 + R() * 0.08) });
  for (let i = 0; i < 2; i++) blobs.push({ x: cx + (i ? 1 : -1) * canopyR * 0.38, y: ccy + canopyR * 0.42, r: canopyR * 0.42 });
  blobs.sort((a, b) => a.y + a.r * 0.3 - (b.y + b.r * 0.3));
  const owner = new Int16Array(w * h).fill(-1);
  blobs.forEach((b, bi) => {
    for (let y = Math.floor(b.y - b.r); y <= Math.ceil(b.y + b.r); y++) for (let x = Math.floor(b.x - b.r); x <= Math.ceil(b.x + b.r); x++) {
      if (x < 1 || y < 0 || x >= w - 1 || y >= h) continue;
      const dx = x + 0.5 - b.x, dy = y + 0.5 - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) owner[y * w + x] = bi;
    }
  });
  let top = h, bot = 0;
  for (let i = 0; i < owner.length; i++) if (owner[i] >= 0) { top = Math.min(top, (i / w) | 0); bot = Math.max(bot, (i / w) | 0); }
  const own = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : owner[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const bi = own(x, y);
    if (bi < 0) continue;
    const b = blobs[bi];
    const nx = (x + 0.5 - b.x) / b.r, ny = (y + 0.5 - b.y) / b.r;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const dot = nx * L[0] + ny * L[1] + nz * L[2];
    let I = 0.3 + 0.72 * dot;
    I -= ((y - top) / Math.max(1, bot - top)) * 0.16;
    // creux : bord d'une grappe devant une grappe plus lointaine
    let crevice = false;
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [1, 1]]) {
      const o = own(x + dx, y + dy);
      if (o >= 0 && o < bi) { const ob = blobs[o]; const ex = (x + dx + 0.5 - b.x) / b.r, ey = (y + dy + 0.5 - b.y) / b.r; if (ex * ex + ey * ey > 1) crevice = true; }
    }
    if (crevice) I = Math.min(I, 0.2);
    I += (valueNoise(x / 1.7, y / 1.7, seed) - 0.5) * 0.18;
    let k = tone(I, x, y, 5, 0.1, [0.17, 0.36, 0.58, 0.8]);
    if (dot > 0.62 && hash2(x, y, seed + 3) < 0.35) k = 4;
    px.set(x, y, pal[k]);
  }
  if (blossom) {
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(R() * w), y = Math.floor(R() * (bot + 1));
      if (own(x, y) < 0) continue;
      px.set(x, y, R() < 0.5 ? '#ffffff' : '#fff0f8');
    }
  }
  if (fruit) {
    for (let i = 0; i < 7; i++) {
      const x = Math.floor(cx + (R() - 0.5) * canopyR * 1.4), y = Math.floor(ccy + (R() - 0.3) * canopyR * 0.9);
      if (own(x, y) < 0 || own(x + 1, y + 1) < 0) continue;
      px.set(x, y, shade(fruit, 0.35)); px.set(x + 1, y, fruit); px.set(x, y + 1, fruit); px.set(x + 1, y + 1, shade(fruit, -0.4));
    }
  }
  px.outline(null, { k: 0.82 });
  return makeSprite(px, Math.round(cx), baseY, { kind: 'tree', canopyTop: top });
}

/* ═════════ CONIFÈRES ═════════ */
export function pineTree({ seed = 1, pal = PAL.pine, snow = false, w = 26, h = 46, tiers = 4 } = {}) {
  const R = rng(seed * 53 + 11);
  const px = new Px(w, h);
  const cx = w / 2, baseY = h - 2;
  // tronc
  for (let y = baseY - 6; y <= baseY; y++) for (let x = cx - 2; x < cx + 2; x++) px.set(x, y, PAL.trunk[x < cx - 1 ? 3 : x < cx ? 2 : 1]);
  const topY = 2, bottom = baseY - 5;
  const span = bottom - topY;
  // étages du bas vers le haut (le haut recouvre le bas)
  for (let t = tiers - 1; t >= 0; t--) {
    const yb = topY + Math.round(span * ((t + 1) / tiers)) + (t === tiers - 1 ? 0 : 1);
    const yt = topY + Math.round(span * (t / tiers) * 0.82);
    const half = 3 + (w / 2 - 3) * ((t + 1) / tiers);
    for (let y = yt; y <= yb; y++) {
      const f = (y - yt) / Math.max(1, yb - yt);
      const hw = 1 + (half - 1) * f;
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw) - 1; x++) {
        // bord inférieur dentelé
        if (y === yb && ((x + t) % 3 === 0)) continue;
        if (y >= yb - 1 && Math.abs(x + 0.5 - cx) > hw - 1 && (x % 2 === 0)) continue;
        const u = (x + 0.5 - cx) / Math.max(1, hw);
        let I = 0.7 - u * 0.42 - f * 0.32 + (valueNoise(x / 1.6, y / 1.6, seed) - 0.5) * 0.25;
        if (t < tiers - 1 && y > yb - 2) I -= 0.1;
        let k = tone(I, x, y);
        if (snow && f < 0.45 && u < 0.4 && hash2(x, y, seed) < 0.85 - f) k = -1;
        px.set(x, y, k < 0 ? (f < 0.2 || u < -0.3 ? PAL.snow[4] : PAL.snow[3]) : pal[k]);
      }
    }
    // ombre portée de l'étage sur celui du dessous
    if (t > 0) {
      const ys = topY + Math.round(span * (t / tiers)) + 1;
      for (let x = 0; x < w; x++) if (px.a(x, ys + 1)) px.paint(x, ys + 1, pal[1]);
    }
  }
  if (snow) for (let i = 0; i < 6; i++) { const x = Math.floor(cx + (R() - 0.5) * w * 0.7), y = Math.floor(topY + R() * span); px.paint(x, y, PAL.snow[4]); }
  px.outline(null, { k: 0.8 });
  return makeSprite(px, Math.round(cx), baseY, { kind: 'tree' });
}

/* ═════════ PALMIER ═════════ */
export function palmTree({ seed = 1, w = 38, h = 50 } = {}) {
  const R = rng(seed * 97 + 3);
  const px = new Px(w, h);
  const baseY = h - 2;
  const lean = (R() - 0.5) * 10;
  const bx = w / 2 - 1, tx = w / 2 + lean, ty = 14;
  // tronc courbé
  const seg = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = bx + (tx - bx) * (t * t) ;
    const y = baseY - (baseY - ty) * t;
    seg.push([x, y, 2.6 - t * 0.6]);
  }
  for (const [x, y, r] of seg) {
    for (let k = -Math.ceil(r); k <= Math.ceil(r); k++) {
      const xx = Math.round(x + k);
      const u = (k + r) / (2 * r);
      let tn = u < 0.3 ? 3 : u < 0.7 ? 2 : 1;
      if (Math.round(y) % 3 === 0) tn = Math.max(0, tn - 1);
      px.set(xx, Math.round(y), PAL.trunk[tn]);
    }
  }
  // palmes
  const nf = 7;
  const P = PAL.palm;
  for (let f = 0; f < nf; f++) {
    const a = (f / nf) * Math.PI * 2 + R() * 0.4;
    const len = 13 + R() * 5;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.55 - 0.15;
    for (let s = 0; s <= len; s++) {
      const t = s / len;
      const droop = t * t * 7;
      const x = tx + dx * s, y = ty + dy * s + droop;
      const wid = Math.max(0.6, 2.4 * (1 - t) + 0.6);
      for (let k = -Math.ceil(wid); k <= Math.ceil(wid); k++) {
        const xx = Math.round(x - dy * k), yy = Math.round(y + dx * k * 0.6);
        const side = k / wid;
        let tn = 2 + (side < -0.3 ? 1 : side > 0.4 ? -1 : 0) - (t > 0.75 ? 1 : 0);
        if ((s + k) % 3 === 0 && t > 0.2) tn = Math.max(0, tn - 1);
        px.set(xx, yy, P[Math.max(0, Math.min(4, tn + (dy < 0 ? 1 : 0)))]);
      }
    }
  }
  // noix de coco
  for (let i = 0; i < 3; i++) px.disc(tx - 2 + i * 2, ty + 3 + (i % 2), 1.6, '#6a4424');
  px.set(tx - 2, ty + 2, '#a8784a');
  px.outline(null, { k: 0.8 });
  return makeSprite(px, Math.round(bx), baseY, { kind: 'tree' });
}

/* ═════════ CACTUS ═════════ */
export function cactus({ seed = 1, small = false } = {}) {
  const R = rng(seed * 71 + 5);
  const P = PAL.cactus;
  if (small) {
    const px = new Px(14, 14);
    px.ellipse(7, 7.5, 5.5, 5.5, null, (x, y, nx, ny) => {
      const I = 0.62 - nx * 0.38 - ny * 0.25;
      let k = tone(I, x, y);
      if (x % 2 === 0 && k > 1) k--;
      px.set(x, y, P[k]);
    });
    px.set(7, 2, '#ff7ab0'); px.set(6, 2, '#ff9ac8'); px.set(8, 2, '#d84a8a');
    px.outline(null, { k: 0.8 });
    return makeSprite(px, 7, 12, { kind: 'rock' });
  }
  const w = 22, h = 34;
  const px = new Px(w, h);
  const col = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / Math.max(1, x1 - x0);
      let I = 0.75 - u * 0.5;
      if (y <= y0 + 1 && (x === x0 || x === x1)) continue;
      let k = tone(I, x, y);
      if ((x - x0) % 2 === 1 && k > 0) k--;
      px.set(x, y, P[k]);
    }
  };
  col(7, 3, 14, h - 2);
  const ay1 = 12 + Math.floor(R() * 5), ay2 = 9 + Math.floor(R() * 5);
  col(2, ay1 - 7, 6, ay1 - 1); col(2, ay1 - 2, 8, ay1 + 2);
  col(15, ay2 - 6, 19, ay2); col(13, ay2 - 1, 19, ay2 + 3);
  for (let i = 0; i < 18; i++) { const x = Math.floor(R() * w), y = Math.floor(R() * h); if (px.a(x, y)) px.set(x, y, '#e8f4c8'); }
  if (R() < 0.5) { px.set(10, 2, '#ff7ab0'); px.set(11, 2, '#ffb0d0'); }
  px.outline(null, { k: 0.8 });
  return makeSprite(px, 11, h - 2, { kind: 'tree' });
}

/* ═════════ ARBRE MORT / CALCINÉ ═════════ */
export function deadTree({ seed = 1, charred = false } = {}) {
  const R = rng(seed * 41 + 9);
  const w = 30, h = 40;
  const px = new Px(w, h);
  const P = charred ? PAL.charred : PAL.dead;
  const embers = [];
  const branch = (x, y, a, len, wid, depth) => {
    let cx = x, cy = y;
    for (let s = 0; s < len; s++) {
      cx += Math.cos(a); cy += Math.sin(a);
      a += (R() - 0.5) * 0.3;
      for (let k = 0; k < wid; k++) px.set(Math.round(cx + k), Math.round(cy), P[k === 0 ? 3 : 1]);
      if (charred && R() < 0.04) embers.push([Math.round(cx), Math.round(cy)]);
    }
    if (depth > 0) {
      const n = 2;
      for (let i = 0; i < n; i++) branch(cx, cy, a + (i ? 0.6 : -0.6) + (R() - 0.5) * 0.4, len * 0.62, Math.max(1, wid - 1), depth - 1);
    }
  };
  // tronc
  for (let y = h - 2; y > 16; y--) for (let x = 13; x < 18; x++) px.set(x, y, P[x < 14 ? 3 : x < 16 ? 2 : 1]);
  px.set(11, h - 2, P[2]); px.set(12, h - 2, P[2]); px.set(18, h - 2, P[1]); px.set(19, h - 2, P[1]);
  branch(15, 17, -Math.PI / 2 - 0.5, 9, 2, 2);
  branch(15, 18, -Math.PI / 2 + 0.55, 9, 2, 2);
  branch(15, 14, -Math.PI / 2, 7, 2, 1);
  px.outline(null, { k: 0.75 });
  let emissive = null;
  if (charred) {
    for (const [x, y] of embers) { px.set(x, y, '#ff7a2a'); px.set(x, y + 1, '#c8401a'); }
    emissive = new Px(w, h);
    for (const [x, y] of embers) emissive.set(x, y, '#ff8a3a');
  }
  return makeSprite(px, 15, h - 2, { kind: 'tree', emissive: emissive?.toCanvas() || null });
}

/* ═════════ SAULE (marais) ═════════ */
export function willowTree({ seed = 1 } = {}) {
  const base = leafyTree({ seed, pal: PAL.willow, w: 36, h: 44, canopyR: 13, trunkW: 6 });
  const px = base.px;
  const R = rng(seed + 99);
  // lianes tombantes
  for (let i = 0; i < 16; i++) {
    const x = 4 + Math.floor(R() * 28);
    let y0 = -1;
    for (let y = 0; y < 30; y++) if (px.a(x, y) && !px.a(x, y + 1)) { y0 = y; break; }
    if (y0 < 0) continue;
    const len = 5 + Math.floor(R() * 10);
    for (let k = 1; k <= len; k++) px.set(x, y0 + k, PAL.willow[k > len - 2 ? 1 : (k % 3 === 0 ? 2 : 3)]);
  }
  px.outline(null, { k: 0.8 });
  return makeSprite(px, base.ax, base.ay, { kind: 'tree' });
}

/* ═════════ CHAMPIGNON GÉANT ═════════ */
export function giantMushroom({ seed = 1, purple = false } = {}) {
  const R = rng(seed * 13 + 1);
  const w = 26, h = 30;
  const px = new Px(w, h);
  const P = purple ? PAL.mushroomPurple : PAL.mushroomRed;
  for (let y = 14; y < h - 1; y++) for (let x = 10; x < 16; x++) px.set(x, y, PAL.stem[x < 12 ? 3 : x < 14 ? 2 : 1]);
  px.ellipse(13, 12, 12, 9, null, (x, y, nx, ny) => {
    if (ny > 0.35) return;
    const I = 0.7 - nx * 0.35 - ny * 0.4;
    px.set(x, y, P[tone(I, x, y)]);
  });
  for (let x = 2; x < 24; x++) if (px.a(x, 14)) px.set(x, 15, P[0]);
  const spots = [];
  for (let i = 0; i < 7; i++) {
    const x = 4 + Math.floor(R() * 18), y = 5 + Math.floor(R() * 7);
    if (!px.a(x, y)) continue;
    px.set(x, y, '#fff6ec'); px.set(x + 1, y, '#fff6ec'); px.set(x, y + 1, '#e8d8c8');
    spots.push([x, y]);
  }
  px.outline(null, { k: 0.8 });
  let emissive = null;
  if (purple) { emissive = new Px(w, h); for (const [x, y] of spots) { emissive.set(x, y, '#c8a0ff'); emissive.set(x + 1, y, '#c8a0ff'); } }
  return makeSprite(px, 13, h - 2, { kind: 'tree', emissive: emissive?.toCanvas() || null, glowColor: purple ? '#b78aff' : null });
}

/* ═════════ BUISSONS, HAIES ═════════ */
export function bush({ seed = 1, pal = PAL.oak, w = 20, h = 15, berries = null } = {}) {
  const R = rng(seed * 29 + 4);
  const px = new Px(w, h);
  const blobs = [];
  const n = 4 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) blobs.push({ x: 5.5 + (w - 11) * (i / (n - 1)) + (R() - 0.5) * 1.5, y: h - 6 - R() * 2.5, r: 4 + R() * 1.3 });
  blobs.push({ x: w / 2, y: h - 8, r: 5.2 });
  blobs.sort((a, b) => a.y - b.y);
  for (const b of blobs) px.disc(b.x, b.y, b.r, null, (x, y, nx, ny) => {
    if (y >= h - 1) return;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let I = 0.5 + 0.55 * (nx * L[0] + ny * L[1] + nz * L[2]) + (valueNoise(x / 2, y / 2, seed) - 0.5) * 0.25;
    if (nx * nx + ny * ny > 0.65 && ny > 0.3) I -= 0.25;
    px.set(x, y, pal[tone(I, x, y)]);
  });
  if (berries) for (let i = 0; i < 6; i++) { const x = 2 + Math.floor(R() * (w - 4)), y = 3 + Math.floor(R() * (h - 7)); if (px.a(x, y) && px.a(x, y + 1)) { px.set(x, y, berries); px.set(x, y + 1, shade(berries, -0.4)); } }
  px.outline(null, { k: 0.8 });
  return makeSprite(px, Math.round(w / 2), h - 1, { kind: 'bush' });
}

/** Haie carrée (bordures d'enclos, arène Insecte). */
export function hedgeBlock({ seed = 1, pal = PAL.oakDark } = {}) {
  const px = new Px(16, 24);
  for (let y = 4; y < 23; y++) for (let x = 0; x < 16; x++) {
    let I;
    if (y < 10) I = 0.78 - (y - 4) * 0.05;
    else I = 0.45 - (y - 10) * 0.018;
    I += (valueNoise((x + seed * 16) / 2.2, y / 2.2, 9) - 0.5) * 0.35;
    if (y === 10) I -= 0.15;
    px.set(x, y, pal[tone(I, x, y)]);
  }
  for (let x = 0; x < 16; x++) { if (hash2(x, seed, 2) < 0.5) px.clear(x, 4); }
  return makeSprite(px, 8, 23, { kind: 'wall' });
}

/* ═════════ ROCHERS ═════════ */
export function rock({ seed = 1, pal = PAL.rock, w = 20, h = 16, moss = null, snow = false, glow = null } = {}) {
  const R = rng(seed * 17 + 3);
  const px = new Px(w, h);
  const cx = w / 2, cy = h * 0.56;
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = 0.78 + R() * 0.24;
    let y = cy + Math.sin(a) * (h * 0.46) * rr;
    y = Math.min(h - 1.5, y);
    pts.push([cx + Math.cos(a) * (w * 0.47) * rr, y]);
  }
  const facetY = cy - h * 0.05;
  px.poly(pts, null, (x, y) => {
    const nx = (x + 0.5 - cx) / (w / 2), ny = (y + 0.5 - cy) / (h / 2);
    let I = y < facetY ? 0.82 - nx * 0.22 + ny * 0.1 : 0.5 - nx * 0.25 - (y - facetY) / h * 0.5;
    I += (valueNoise(x / 2.4, y / 2.4, seed) - 0.5) * 0.22;
    let k = tone(I, x, y, 5, 0.14);
    px.set(x, y, pal[k]);
  });
  // fissures
  for (let i = 0; i < 2; i++) {
    let x = Math.floor(cx + (R() - 0.5) * w * 0.5), y = Math.floor(facetY + R() * h * 0.3);
    for (let s = 0; s < 4; s++) { px.paint(x, y, pal[0]); x += R() < 0.5 ? 1 : -1; y += 1; }
  }
  if (moss) for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (px.a(x, y) && !px.a(x, y - 1) && hash2(x, y, seed) < 0.8) { px.set(x, y, moss); if (hash2(x, y + 1, seed) < 0.5) px.paint(x, y + 1, shade(moss, -0.25)); }
  if (snow) for (let x = 0; x < w; x++) { let first = true; for (let y = 0; y < h; y++) if (px.a(x, y)) { if (first) { px.set(x, y, '#ffffff'); if (y < facetY) px.set(x, y + 1, '#e4eef8'); first = false; } } }
  let emissive = null;
  if (glow) {
    emissive = new Px(w, h);
    let x = Math.floor(cx - 3), y = Math.floor(facetY + 1);
    for (let s = 0; s < 9; s++) { if (px.a(x, y)) { px.set(x, y, glow); emissive.set(x, y, glow); } x += 1; y += hash2(s, seed, 4) < 0.5 ? 1 : 0; }
  }
  px.outline(null, { k: 0.75 });
  return makeSprite(px, Math.round(cx), h - 2, { kind: 'rock', emissive: emissive?.toCanvas() || null, glowColor: glow });
}

/* ═════════ CRISTAUX, STALAGMITES, PIC DE GLACE ═════════ */
export function crystal({ seed = 1, color = '#9a7aff', w = 18, h = 24, ice = false } = {}) {
  const R = rng(seed * 61 + 2);
  const px = new Px(w, h);
  const em = new Px(w, h);
  const P = ice ? PAL.ice : [shade(color, -0.7), shade(color, -0.35), color, shade(color, 0.4), shade(color, 0.8)];
  const shards = [{ x: w / 2, hgt: h - 3, wd: 3.4, lean: 0 }, { x: w / 2 - 5, hgt: h * 0.55, wd: 2.6, lean: -0.25 }, { x: w / 2 + 5, hgt: h * 0.68, wd: 2.6, lean: 0.25 }];
  for (const s of shards) {
    const base = h - 2;
    for (let y = 0; y < s.hgt; y++) {
      const t = y / s.hgt;
      const hw = t > 0.82 ? s.wd * (1 - (t - 0.82) / 0.18) : s.wd;
      const xc = s.x + s.lean * y;
      for (let x = Math.floor(xc - hw); x <= Math.ceil(xc + hw) - 1; x++) {
        const u = (x + 0.5 - xc) / Math.max(0.5, hw);
        let k = u < -0.35 ? 3 : u < 0.3 ? 2 : 1;
        if (Math.abs(u + 0.5) < 0.2 && t < 0.8 && t > 0.2) k = 4;
        px.set(x, base - y, P[k]);
        if (k >= 3) em.set(x, base - y, P[k]);
      }
    }
  }
  if (R() < 2) px.set(Math.round(w / 2) - 1, 4, '#ffffff');
  px.outline(null, { k: 0.7 });
  return makeSprite(px, Math.round(w / 2), h - 2, { kind: 'rock', emissive: em.toCanvas(), glowColor: ice ? '#a8e8ff' : color });
}

export function stalagmite({ seed = 1 } = {}) {
  const R = rng(seed * 7 + 1);
  const w = 18, h = 26;
  const px = new Px(w, h);
  const P = PAL.rockWarm;
  const spikes = [{ x: 9, hgt: 22, wd: 4.5 }, { x: 4, hgt: 11 + R() * 4, wd: 3 }, { x: 14, hgt: 13 + R() * 4, wd: 3 }];
  for (const s of spikes) for (let y = 0; y < s.hgt; y++) {
    const hw = s.wd * (1 - y / s.hgt) + 0.4;
    for (let x = Math.floor(s.x - hw); x <= Math.ceil(s.x + hw) - 1; x++) {
      const u = (x + 0.5 - s.x) / hw;
      px.set(x, h - 2 - y, P[tone(0.68 - u * 0.4 - (y / s.hgt) * -0.1 + (valueNoise(x / 2, y / 3, seed) - 0.5) * 0.2, x, y)]);
    }
  }
  px.outline(null, { k: 0.75 });
  return makeSprite(px, 9, h - 2, { kind: 'rock' });
}

/* ═════════ DÉCORS DIVERS ═════════ */
export function pillar({ seed = 1, broken = false } = {}) {
  const w = 14, h = broken ? 22 : 32;
  const px = new Px(w, h);
  const P = ['#4a4640', '#7a746a', '#aaa498', '#d2ccbe', '#f0ece2'];
  for (let y = 4; y < h - 3; y++) for (let x = 2; x < 12; x++) {
    const u = (x - 2) / 9;
    let k = u < 0.2 ? 3 : u < 0.55 ? 2 : u < 0.85 ? 1 : 0;
    if ((x - 2) % 3 === 2 && k > 0) k--;
    px.set(x, y, P[k]);
  }
  px.rect(0, h - 3, 14, 2, P[2]); px.rect(0, h - 1, 14, 1, P[1]);
  if (!broken) { px.rect(0, 1, 14, 3, P[3]); px.rect(1, 0, 12, 1, P[4]); px.rect(0, 4, 14, 1, P[1]); } else { for (let x = 2; x < 12; x++) if (hash2(x, seed, 5) < 0.6) px.clear(x, 4); px.set(5, 5, P[0]); px.set(8, 6, P[0]); }
  for (let i = 0; i < 6; i++) px.paint(3 + (i * 5) % 8, h - 5 - i * 3, '#6a8a4a');
  px.outline(null, { k: 0.75 });
  return makeSprite(px, 7, h - 1, { kind: 'rock' });
}

export function stump() {
  const px = new Px(14, 11);
  px.ellipse(7, 7, 6, 3.5, null, (x, y, nx, ny) => px.set(x, y, PAL.trunk[ny > 0.1 ? 1 : nx < -0.3 ? 3 : 2]));
  px.rect(1, 4, 12, 3, PAL.trunk[2]);
  px.ellipse(7, 4, 6, 2.8, null, (x, y, nx, ny) => { const r = Math.hypot(nx, ny); px.set(x, y, r < 0.35 ? '#c8a070' : r < 0.7 ? '#b08a5a' : '#d8b484'); });
  px.outline(null, { k: 0.75 });
  return makeSprite(px, 7, 9, { kind: 'rock' });
}

export function log() {
  const px = new Px(26, 12);
  for (let y = 2; y < 11; y++) for (let x = 2; x < 23; x++) { const v = (y - 2) / 8; px.set(x, y, PAL.trunk[v < 0.2 ? 4 : v < 0.45 ? 3 : v < 0.75 ? 2 : 1]); }
  px.ellipse(22, 6.5, 2.6, 4.5, null, (x, y, nx, ny) => px.set(x, y, Math.hypot(nx, ny) < 0.5 ? '#b08a5a' : '#d8b484'));
  for (let x = 4; x < 20; x += 5) px.set(x, 5, PAL.trunk[1]);
  px.outline(null, { k: 0.75 });
  return makeSprite(px, 13, 10, { kind: 'rock' });
}

export function snowman() {
  const px = new Px(16, 24);
  const S = PAL.snow;
  px.disc(8, 16, 6.5, null, (x, y, nx, ny) => px.set(x, y, S[tone(0.75 - nx * 0.3 - ny * 0.3, x, y)]));
  px.disc(8, 7, 4.5, null, (x, y, nx, ny) => px.set(x, y, S[tone(0.8 - nx * 0.3 - ny * 0.3, x, y)]));
  px.set(6, 6, '#1a1a1a'); px.set(9, 6, '#1a1a1a'); px.set(8, 8, '#ff8a2a'); px.set(9, 8, '#e06a1a');
  px.rect(4, 11, 8, 2, '#c83a3a'); px.rect(9, 12, 2, 4, '#a82a2a');
  px.rect(4, 1, 8, 2, '#2a2a3a'); px.rect(5, -1, 6, 3, '#2a2a3a');
  px.outline(null, { k: 0.7 });
  return makeSprite(px, 8, 22, { kind: 'rock' });
}

/** Ossements / coquillage : petits décors au sol (non bloquants). */
export function smallDecal(kind, seed = 1) {
  const R = rng(seed);
  const px = new Px(10, 8);
  if (kind === 'bones') { px.rect(1, 4, 7, 1, '#e8e0cc'); px.set(0, 3, '#f4ecd8'); px.set(0, 5, '#f4ecd8'); px.set(8, 3, '#f4ecd8'); px.set(8, 5, '#f4ecd8'); px.disc(6, 2, 1.6, '#e8e0cc'); px.set(6, 2, '#6a6050'); }
  else if (kind === 'shell') { px.ellipse(5, 4, 3.5, 2.5, null, (x, y, nx) => px.set(x, y, (x % 2) ? '#ffd8c0' : '#f0b0a0')); px.set(5, 6, '#c88a7a'); }
  else if (kind === 'pebbles') { for (let i = 0; i < 3; i++) { const x = 1 + Math.floor(R() * 7), y = 2 + Math.floor(R() * 4); px.set(x, y, '#9a948a'); px.set(x + 1, y, '#c8c2b6'); px.set(x, y + 1, '#6a645a'); } }
  px.outline(null, { k: 0.6 });
  return makeSprite(px, 5, 6, { kind: 'decal' });
}

/* ═════════ PETITES PLANTES (fougère, roseaux, nénuphar) ═════════ */
export function fern({ seed = 1, pal = PAL.oak } = {}) {
  const px = new Px(16, 12);
  const R = rng(seed * 3 + 7);
  for (let f = 0; f < 5; f++) {
    const a = -Math.PI / 2 + (f - 2) * 0.55 + (R() - 0.5) * 0.2;
    for (let s = 0; s < 8; s++) {
      const x = 8 + Math.cos(a) * s * 1.1, y = 11 + Math.sin(a) * s * 1.1 + s * s * 0.06;
      px.set(Math.round(x), Math.round(y), pal[s < 2 ? 1 : s > 5 ? 3 : 2]);
      if (s % 2 === 0 && s > 1) { px.set(Math.round(x - Math.sin(a)), Math.round(y + Math.cos(a) * 0.5), pal[3]); }
    }
  }
  px.outline(null, { k: 0.7 });
  return makeSprite(px, 8, 11, { kind: 'plant' });
}

export function reeds({ seed = 1 } = {}) {
  const px = new Px(14, 20);
  const R = rng(seed * 5 + 1);
  for (let i = 0; i < 6; i++) {
    const x = 2 + i * 2 + Math.floor(R() * 2), hgt = 9 + Math.floor(R() * 8);
    for (let y = 0; y < hgt; y++) px.set(x + (y > hgt * 0.7 ? (i % 2 ? 1 : 0) : 0), 19 - y, PAL.willow[y < 3 ? 1 : y > hgt - 3 ? 4 : 3]);
    if (R() < 0.6) { px.rect(x, 19 - hgt - 3, 2, 4, '#6a3a1e'); px.set(x, 19 - hgt - 3, '#8a5a32'); }
  }
  px.outline(null, { k: 0.7 });
  return makeSprite(px, 7, 19, { kind: 'plant' });
}

export function lilypad({ seed = 1 } = {}) {
  const px = new Px(14, 9);
  px.ellipse(7, 4.5, 6, 3.6, null, (x, y, nx, ny) => { if (nx > 0.05 && Math.abs(ny) < 0.25) return; px.set(x, y, ny < -0.2 ? '#7cc85a' : nx < -0.4 ? '#5ea844' : '#4a9238'); });
  if (seed % 3 === 0) { px.set(5, 3, '#ffb8d8'); px.set(6, 3, '#ff8ac0'); px.set(5, 2, '#ffe0f0'); px.set(4, 3, '#ff8ac0'); }
  px.outline('#1e4a2a');
  return makeSprite(px, 7, 6, { kind: 'decal' });
}

/* ═════════ HAUTES HERBES (2 images + partie avant) ═════════ */
/**
 * Tuile 16×16 de hautes herbes : rangées de touffes pointues (Λ) avec pointes claires et ombres.
 * pal : [ombre, sombre, base, clair, contour]. Renvoie { back, front } (front = rangée du bas
 * dessinée PAR-DESSUS les personnages pour cacher leurs jambes).
 */
export function tallGrass(pal, frame = 0, variant = 0) {
  const [sh, dk, base, lt, ol] = pal;
  const hi = shade(lt, 0.5);
  // brin pointu 5 × 7 ; posés tous les 4 px ils forment la ligne de pointes typique des hautes herbes
  const BLADE = [
    '..o..',
    '.oho.',
    '.olo.',
    'ollBo',
    'olBBo',
    'oBBdo',
    'oBddd',
  ];
  const stamp = (px, ox, oy, short) => {
    if (!px.inner) px.inner = new Uint8Array(16 * 16);
    BLADE.forEach((row, j) => {
      if (short && j === 0) return;
      const yy = oy + j + (short ? -1 : 0) + 1;
      for (let i = 0; i < 5; i++) {
        const ch = row[i];
        if (ch === '.') continue;
        const xx = ox + i;
        if (xx < 0 || xx > 15 || yy < 0 || yy > 15) continue;
        const col = ch === 'o' ? ol : ch === 'h' ? hi : ch === 'l' ? lt : ch === 'B' ? base : dk;
        // le contour d'un brin ne recouvre pas l'intérieur d'un brin déjà posé
        if (ch === 'o' && px.inner[yy * 16 + xx]) continue;
        px.set(xx, yy, col);
        if (ch !== 'o') px.inner[yy * 16 + xx] = 1;
      }
    });
  };
  const sway = frame ? 1 : 0;
  const back = new Px(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) back.set(x, y, y > 12 ? sh : dk);
  const off = (variant % 2) * 2;
  for (let k = -1; k <= 4; k++) stamp(back, k * 4 + off - 2 + (sway && k % 2 ? 1 : 0), -1, k % 2 === 0);
  back.inner = null;
  for (let k = -1; k <= 4; k++) stamp(back, k * 4 + off + (sway && k % 2 === 0 ? 1 : 0), 4, k % 2 === 1);
  const front = new Px(16, 16);
  for (let k = -1; k <= 4; k++) stamp(front, k * 4 + off - 2 + (sway && k % 2 ? 1 : 0), 8, k % 2 === 0);
  const full = back.clone(); full.blit(front, 0, 0);
  return { back: full.toCanvas(), front: front.toCanvas() };
}

/* ═════════ FLEURS (tuile animée) ═════════ */
export function flowerTile(colors, frame = 0, seed = 1) {
  const px = new Px(16, 16);
  const R = rng(seed * 11 + 3);
  const n = 3 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) {
    const x = 2 + Math.floor(R() * 11), y = 3 + Math.floor(R() * 10);
    const c = colors[Math.floor(R() * colors.length)];
    const sx = frame && i % 2 ? 1 : 0;
    px.set(x, y + 2, '#2f6a2a'); px.set(x, y + 3, '#2f6a2a');
    px.set(x + sx, y - 1, c); px.set(x - 1 + sx, y, c); px.set(x + 1 + sx, y, c); px.set(x + sx, y + 1, c);
    px.set(x + sx, y, c === '#ffffff' ? '#ffd23f' : '#fff6a8');
    px.set(x + 1 + sx, y + 1, shade(c, -0.45));
  }
  return px.toCanvas();
}

export { tone, mixHex, hexToRgb, outlineOf };
