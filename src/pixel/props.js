import { Px } from './Px.js';
import { shade, hash2, valueNoise, bayer, mixHex, rng } from './color.js';
import { makeSprite, PAL } from './nature.js';
import { drawText, textWidth } from './font.js';

/**
 * ACCESSOIRES EN PIXEL ART : lampadaires, torches, panneaux, bancs, boîtes aux lettres, jardinières,
 * tonneaux, caisses, tables, tentes, feux de camp, puits, étals, fontaines, statues, socles, portails,
 * obstacles de terrain (arbuste à couper, rocher fissuré, rocher rond, paroi), Prismes au sol,
 * clôtures auto-raccordées, ponts et pontons.
 * Chaque sprite : { canvas, shadow, w, h, ax, ay } + éventuellement frames (animation), emissive, lights.
 */
const R5 = (c) => [shade(c, -0.62), shade(c, -0.32), c, shade(c, 0.28), shade(c, 0.55)];
const WOOD = ['#2e1c12', '#4e3020', '#7a5032', '#a6764a', '#cfa070'];
const STONE = ['#2c2a30', '#56525a', '#86828a', '#b4b0b4', '#dedad8'];
const METAL = ['#1e2028', '#3a3e4a', '#5e6474', '#8a92a4', '#c4cad8'];

/** Boîte vue de 3/4 : face avant (h) + dessus (top), lumière en haut à gauche. */
function box3d(px, x, y, w, h, top, C, { grain = null, seed = 1 } = {}) {
  for (let j = 0; j < top; j++) for (let i = 0; i < w; i++) px.set(x + i, y + j, j === 0 ? C[4] : i === w - 1 ? C[2] : C[3]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let k = i === 0 ? 3 : i >= w - 2 ? 1 : 2;
    if (j === h - 1) k = 0;
    if (grain === 'planks' && (j % 4 === 3)) k = Math.max(0, k - 1);
    if (grain === 'noise' && hash2(x + i, y + j, seed) < 0.12) k = Math.max(0, k - 1);
    px.set(x + i, y + top + j, C[k]);
  }
}

function fin(px, ax, ay, extra = {}) {
  px.outline(null, { k: 0.78 });
  return makeSprite(px, ax, ay, extra);
}

/* ═════════ LUMIÈRES ═════════ */
export function lamp(style = 'classic') {
  if (style === 'modern') {
    const px = new Px(12, 34), em = new Px(12, 34);
    for (let y = 6; y < 32; y++) { px.set(5, y, METAL[3]); px.set(6, y, METAL[2]); }
    px.rect(3, 31, 6, 2, METAL[1]); px.rect(4, 30, 4, 1, METAL[2]);
    px.rect(1, 3, 10, 3, METAL[3]); px.rect(1, 2, 10, 1, METAL[4]);
    px.rect(2, 6, 8, 1, '#fff6d0'); em.rect(2, 6, 8, 1, '#fff2c0');
    return fin(px, 6, 32, { emissive: em.toCanvas(), lights: [{ x: 6, y: 7, r: 46, color: '#fff2c8' }], kind: 'prop' });
  }
  if (style === 'lantern') {
    const px = new Px(14, 30), em = new Px(14, 30);
    for (let y = 4; y < 29; y++) { px.set(3, y, WOOD[3]); px.set(4, y, WOOD[2]); }
    px.rect(3, 4, 9, 2, WOOD[2]); px.rect(3, 4, 9, 1, WOOD[3]);
    px.set(10, 6, '#3a3030'); px.set(10, 7, '#3a3030');
    px.rect(8, 8, 5, 7, '#3a2a22'); px.rect(9, 9, 3, 5, '#ffcf6a'); px.set(9, 9, '#fff4c0');
    em.rect(9, 9, 3, 5, '#ffc860');
    px.rect(2, 28, 4, 1, WOOD[1]);
    return fin(px, 4, 28, { emissive: em.toCanvas(), lights: [{ x: 10, y: 11, r: 40, color: '#ffc870' }], kind: 'prop' });
  }
  // classique : réverbère noir à lanterne carrée
  const px = new Px(12, 32), em = new Px(12, 32);
  for (let y = 10; y < 30; y++) { px.set(5, y, '#2a2c38'); px.set(6, y, '#4a4e60'); }
  px.rect(3, 29, 6, 2, '#2a2c38'); px.rect(4, 28, 4, 1, '#4a4e60');
  px.rect(4, 9, 4, 1, '#2a2c38');
  px.rect(2, 2, 8, 1, '#2a2c38'); px.rect(3, 1, 6, 1, '#4a4e60'); px.set(5, 0, '#4a4e60'); px.set(6, 0, '#2a2c38');
  px.rect(3, 3, 6, 6, '#ffd77a'); px.rect(3, 3, 1, 6, '#3a3c4a'); px.rect(8, 3, 1, 6, '#3a3c4a'); px.rect(5, 3, 2, 6, '#fff2c0');
  em.rect(3, 3, 6, 6, '#ffd070');
  return fin(px, 6, 30, { emissive: em.toCanvas(), lights: [{ x: 6, y: 6, r: 44, color: '#ffe0a0' }], kind: 'prop' });
}

function flame(px, em, cx, by, f, big = 1) {
  const H = Math.round((5 + (f % 2)) * big), W = Math.round(3 * big);
  for (let j = 0; j < H; j++) {
    const t = j / H, hw = Math.max(0, (1 - t) * W * (0.6 + 0.4 * Math.sin(t * 3 + f)));
    for (let i = -Math.ceil(hw); i <= Math.ceil(hw); i++) {
      if (Math.abs(i) > hw + 0.3) continue;
      const inner = Math.abs(i) < hw * 0.45 && t < 0.7;
      const c = inner ? (t < 0.35 ? '#fff6c0' : '#ffd23f') : t > 0.7 ? '#e8501e' : '#ff8a2a';
      const x = Math.round(cx + i + (f === 1 && t > 0.5 ? 1 : f === 2 && t > 0.5 ? -1 : 0)), y = by - j;
      px.set(x, y, c); em?.set(x, y, c);
    }
  }
}

export function torch() {
  const frames = [], emf = [];
  let base = null;
  for (let f = 0; f < 3; f++) {
    const px = new Px(10, 22), em = new Px(10, 22);
    for (let y = 9; y < 21; y++) { px.set(4, y, WOOD[3]); px.set(5, y, WOOD[1]); }
    px.rect(3, 8, 4, 2, METAL[2]); px.rect(3, 8, 4, 1, METAL[3]);
    flame(px, em, 4.5, 7, f, 1);
    px.outline(null, { k: 0.78 });
    frames.push(px.toCanvas()); emf.push(em.toCanvas());
    if (!base) base = px;
  }
  return makeSprite(base, 5, 20, { frames, emFrames: emf, emissive: emf[0], lights: [{ x: 5, y: 4, r: 40, color: '#ff9a4a', flicker: true }], kind: 'prop' });
}

export function campfire() {
  const frames = [], emf = [];
  let base = null;
  for (let f = 0; f < 3; f++) {
    const px = new Px(18, 16), em = new Px(18, 16);
    for (const [x, y] of [[2, 13], [5, 14], [9, 14], [13, 14], [15, 13], [3, 11], [14, 11]]) { px.rect(x - 1, y - 1, 3, 2, STONE[2]); px.set(x - 1, y - 1, STONE[3]); }
    px.line(4, 13, 13, 10, WOOD[2], 2); px.line(4, 10, 13, 13, WOOD[3], 2);
    flame(px, em, 9, 11, f, 1.4);
    px.outline(null, { k: 0.78 });
    frames.push(px.toCanvas()); emf.push(em.toCanvas());
    if (!base) base = px;
  }
  return makeSprite(base, 9, 14, { frames, emFrames: emf, emissive: emf[0], lights: [{ x: 9, y: 8, r: 56, color: '#ff9040', flicker: true }], kind: 'prop' });
}

/* ═════════ MOBILIER URBAIN ═════════ */
export function sign(title = '') {
  const px = new Px(16, 20);
  px.rect(7, 12, 2, 7, WOOD[1]); px.set(7, 12, WOOD[2]);
  box3d(px, 1, 2, 14, 9, 1, WOOD);
  px.rect(2, 4, 12, 6, WOOD[3]);
  for (let x = 3; x < 13; x += 2) px.set(x, 6, WOOD[1]);
  for (let x = 4; x < 12; x += 3) px.set(x, 8, WOOD[1]);
  return fin(px, 8, 18, { kind: 'prop' });
}

export function mailbox(color = '#d84a3a') {
  const px = new Px(10, 18);
  const C = R5(color);
  px.rect(4, 9, 2, 8, WOOD[1]);
  for (let y = 2; y < 10; y++) for (let x = 1; x < 9; x++) px.set(x, y, y === 2 ? C[4] : x === 1 ? C[3] : x >= 7 ? C[1] : C[2]);
  px.rect(2, 1, 6, 1, C[3]);
  px.rect(3, 5, 4, 1, C[0]);
  px.rect(8, 3, 1, 3, '#ffd23f');
  return fin(px, 5, 16, { kind: 'prop' });
}

export function bench() {
  const px = new Px(32, 18);
  for (const x of [3, 27]) { px.rect(x, 10, 2, 7, METAL[1]); px.set(x, 10, METAL[2]); }
  for (let j = 0; j < 3; j++) px.rect(1, 2 + j * 3, 30, 2, j === 0 ? WOOD[4] : WOOD[3]), px.rect(1, 3 + j * 3, 30, 1, WOOD[2]);
  px.rect(1, 11, 30, 2, WOOD[3]); px.rect(1, 12, 30, 1, WOOD[1]);
  return fin(px, 16, 16, { kind: 'prop' });
}

export function planter(seed = 1) {
  const px = new Px(16, 18);
  box3d(px, 1, 8, 14, 7, 2, WOOD, { grain: 'planks' });
  const R = rng(seed * 7 + 2);
  const cols = [['#ff7aa2', '#ffd23f'], ['#ffffff', '#c58bff'], ['#ff9a4a', '#ffffff']][seed % 3];
  for (let i = 0; i < 9; i++) { const x = 2 + Math.floor(R() * 12), y = 4 + Math.floor(R() * 5); px.disc(x, y, 1.8, i % 2 ? '#3f8a34' : '#57a842'); }
  for (let i = 0; i < 6; i++) { const x = 2 + Math.floor(R() * 12), y = 3 + Math.floor(R() * 5); const c = cols[i % 2]; px.set(x, y, c); px.set(x + 1, y, c); px.set(x, y + 1, shade(c, -0.4)); }
  return fin(px, 8, 16, { kind: 'prop' });
}

export function barrel() {
  const px = new Px(14, 17);
  for (let y = 2; y < 16; y++) {
    const t = (y - 2) / 13, bulge = Math.sin(t * Math.PI) * 1.2;
    const x0 = Math.round(1.5 - bulge), x1 = Math.round(12.5 + bulge);
    for (let x = x0; x < x1; x++) { const u = (x - x0) / (x1 - x0); px.set(x, y, WOOD[u < 0.2 ? 3 : u < 0.6 ? 2 : u < 0.85 ? 1 : 0]); }
  }
  for (const y of [4, 12]) for (let x = 1; x < 13; x++) if (px.a(x, y)) px.set(x, y, x < 4 ? METAL[3] : METAL[1]);
  px.ellipse(7, 2.5, 5.5, 1.8, null, (x, y, nx, ny) => px.set(x, y, Math.hypot(nx, ny) > 0.7 ? WOOD[1] : WOOD[3]));
  return fin(px, 7, 15, { kind: 'prop' });
}

export function crate() {
  const px = new Px(16, 18);
  const C = ['#3a2818', '#6a4a2c', '#a07a4a', '#c89e68', '#e6c48a'];
  box3d(px, 1, 2, 14, 12, 3, C, { grain: 'planks' });
  px.line(2, 6, 13, 15, C[1]); px.line(2, 15, 13, 6, C[1]);
  px.rect(1, 5, 14, 1, C[1]);
  return fin(px, 8, 16, { kind: 'prop' });
}

export function table() {
  const px = new Px(32, 22);
  box3d(px, 1, 4, 30, 3, 6, WOOD, { grain: 'planks' });
  for (let x = 1; x < 31; x += 6) px.vline(x, 4, 9, WOOD[2]);
  for (const x of [3, 26]) { px.rect(x, 13, 3, 7, WOOD[1]); px.set(x, 13, WOOD[2]); }
  px.rect(2, 16, 28, 2, WOOD[2]); px.rect(2, 17, 28, 1, WOOD[1]);
  return fin(px, 16, 20, { kind: 'prop' });
}

export function tent(color = '#ff7a3a') {
  const px = new Px(36, 30);
  const C = R5(color);
  // toile : deux pans en triangle (gauche éclairé, droite dans l'ombre) et ouverture sombre
  px.poly([[18, 2], [33, 27], [3, 27]], null, (x, y) => {
    const left = x < 18;
    const stripe = Math.floor((x + y * 0.5) / 5) % 2 === 0;
    px.set(x, y, left ? (stripe ? C[3] : C[2]) : (stripe ? C[1] : C[2]));
  });
  px.poly([[18, 10], [24, 27], [12, 27]], '#2a1a14');
  px.poly([[18, 13], [22, 27], [14, 27]], '#3e2a20');
  px.line(18, 2, 18, 9, C[4]);
  px.rect(17, 0, 2, 3, WOOD[2]);
  px.set(2, 28, WOOD[1]); px.set(34, 28, WOOD[1]);
  return fin(px, 18, 28, { kind: 'prop' });
}

export function well() {
  const px = new Px(32, 36);
  // toit
  px.poly([[16, 2], [30, 11], [2, 11]], null, (x, y) => px.set(x, y, (x + y) % 4 === 0 ? '#8a3a2a' : x < 16 ? '#c8553d' : '#a8442e'));
  px.rect(2, 11, 28, 1, '#6a2a1e');
  for (const x of [5, 25]) { px.rect(x, 12, 2, 12, WOOD[2]); px.set(x, 12, WOOD[3]); }
  px.rect(7, 15, 18, 1, WOOD[3]); px.rect(15, 16, 2, 4, '#3a3030');
  // margelle en pierre
  for (let y = 22; y < 34; y++) for (let x = 2; x < 30; x++) {
    const row = Math.floor((y - 22) / 3), off = (row % 2) * 3;
    let k = (x + off) % 6 === 0 || (y - 22) % 3 === 2 ? 1 : x < 6 ? 3 : x > 26 ? 1 : 2;
    px.set(x, y, STONE[k]);
  }
  px.ellipse(16, 23, 13, 3, null, (x, y, nx, ny) => px.set(x, y, Math.hypot(nx, ny) > 0.72 ? STONE[4] : '#1a2a3a'));
  return fin(px, 16, 33, { kind: 'prop' });
}

export function stall(color = '#ff7a3a') {
  const px = new Px(48, 34);
  const C = R5(color);
  // auvent rayé
  for (let y = 2; y < 11; y++) for (let x = 1; x < 47; x++) {
    const st = Math.floor(x / 6) % 2 === 0;
    px.set(x, y, y === 2 ? (st ? C[4] : '#ffffff') : st ? (y < 6 ? C[3] : C[2]) : (y < 6 ? '#ffffff' : '#e8e4dc'));
  }
  for (let x = 1; x < 47; x += 6) { px.set(x + 2, 11, Math.floor(x / 6) % 2 === 0 ? C[1] : '#c8c4bc'); px.set(x + 3, 11, Math.floor(x / 6) % 2 === 0 ? C[1] : '#c8c4bc'); }
  for (const x of [3, 43]) { px.rect(x, 11, 2, 12, WOOD[2]); px.set(x, 11, WOOD[3]); }
  // comptoir et marchandises
  box3d(px, 1, 20, 46, 10, 3, WOOD, { grain: 'planks' });
  const goods = ['#e83a3a', '#ffd23f', '#7dc860', '#ff9a4a', '#c58bff', '#3a9adf'];
  for (let i = 0; i < 9; i++) { const x = 4 + i * 4.6, c = goods[i % goods.length]; px.disc(x, 19, 1.9, c); px.set(Math.round(x) - 1, 18, shade(c, 0.5)); }
  return fin(px, 24, 31, { kind: 'prop' });
}

export function fountainFrames() {
  const frames = [];
  let base = null;
  for (let f = 0; f < 4; f++) {
    const px = new Px(48, 42);
    // bassin
    for (let y = 22; y < 40; y++) for (let x = 1; x < 47; x++) {
      const nx = (x - 24) / 23, ny = (y - 31) / 9;
      if (nx * nx + ny * ny > 1) continue;
      const rim = nx * nx + ny * ny > 0.62;
      px.set(x, y, rim ? (ny < 0 ? STONE[4] : nx < -0.3 ? STONE[3] : STONE[2]) : y > 32 ? STONE[1] : STONE[2]);
    }
    px.ellipse(24, 29, 18, 5.5, null, (x, y, nx, ny) => {
      const v = Math.sin(x * 0.7 + f * 1.6) + Math.sin(y * 1.3 - f);
      px.set(x, y, v > 1.3 ? '#dcf4ff' : v > 0.4 ? '#7ac0f0' : ny < 0 ? '#4a96dc' : '#3a7ed0');
    });
    // colonne et vasque
    px.rect(21, 12, 6, 18, STONE[2]); px.rect(21, 12, 2, 18, STONE[3]); px.rect(26, 12, 1, 18, STONE[1]);
    px.ellipse(24, 12, 8, 2.5, null, (x, y, nx, ny) => px.set(x, y, ny < 0 ? STONE[4] : STONE[2]));
    px.ellipse(24, 11.5, 6, 1.6, '#5aa8e8');
    // jets
    for (let k = 0; k < 3; k++) {
      const s = (f + k) % 4;
      px.set(24, 4 + k * 2, '#e8f8ff'); px.set(23, 6 - s % 2, '#bfe6ff');
      px.set(17 - s, 14 + s * 2, '#dcf4ff'); px.set(31 + s, 14 + s * 2, '#dcf4ff');
    }
    px.rect(23, 2, 2, 8, '#cfefff');
    px.outline(null, { k: 0.75 });
    frames.push(px.toCanvas());
    if (!base) base = px;
  }
  return makeSprite(base, 24, 39, { frames, kind: 'prop' });
}

export function statue(color = '#c8c0b0') {
  const px = new Px(20, 36);
  const C = R5(color);
  // socle
  box3d(px, 2, 24, 16, 9, 2, STONE);
  px.rect(3, 23, 14, 1, STONE[4]);
  // silhouette de Lumin légendaire (oiseau stylisé)
  px.ellipse(10, 16, 5, 6, null, (x, y, nx, ny) => px.set(x, y, C[nx + ny < -0.5 ? 4 : nx + ny < 0.4 ? 3 : 1]));
  px.disc(10, 8, 3.6, null, (x, y, nx, ny) => px.set(x, y, C[nx + ny < -0.4 ? 4 : 2]));
  px.poly([[5, 14], [0, 6], [3, 16]], C[2]); px.poly([[15, 14], [20, 6], [17, 16]], C[1]);
  px.set(9, 7, C[0]); px.set(11, 7, C[0]); px.poly([[10, 9], [12, 10], [10, 11]], '#e8b04a');
  return fin(px, 10, 33, { kind: 'prop' });
}

export function pedestal() {
  const px = new Px(16, 24), em = new Px(16, 24);
  box3d(px, 2, 10, 12, 10, 2, STONE);
  px.rect(1, 9, 14, 2, STONE[4]); px.rect(1, 21, 14, 2, STONE[2]); px.rect(1, 22, 14, 1, STONE[1]);
  px.disc(8, 6, 3.5, null, (x, y, nx, ny) => { const c = nx + ny < -0.4 ? '#ffffff' : nx + ny < 0.3 ? '#b8a8ff' : '#7a5ae0'; px.set(x, y, c); em.set(x, y, c); });
  return fin(px, 8, 22, { emissive: em.toCanvas(), lights: [{ x: 8, y: 6, r: 30, color: '#b8a0ff' }], kind: 'prop' });
}

export function gate(wTiles = 3) {
  const W = wTiles * 16;
  const px = new Px(W, 30);
  for (const x of [0, W - 6]) { px.rect(x, 2, 6, 26, STONE[2]); px.rect(x, 2, 2, 26, STONE[3]); px.rect(x + 5, 2, 1, 26, STONE[1]); px.rect(x - 1, 0, 8, 3, STONE[4]); }
  for (let x = 7; x < W - 7; x += 3) { px.vline(x, 6, 26, '#2a2c38'); px.set(x, 5, '#5a5e70'); }
  px.rect(6, 8, W - 12, 2, '#3a3c4a'); px.rect(6, 20, W - 12, 2, '#3a3c4a');
  px.disc(W / 2, 14, 3, '#d8a830');
  return fin(px, W / 2, 28, { kind: 'prop' });
}

/* ═════════ OBSTACLES DE TERRAIN ═════════ */
/** Arbuste fin à couper (Coupe). */
export function cutTree() {
  const px = new Px(16, 22);
  const P = PAL.oak;
  px.rect(7, 13, 2, 8, PAL.trunk[2]); px.set(7, 13, PAL.trunk[3]);
  const blobs = [[8, 9, 6], [5, 11, 3.6], [11, 11, 3.6], [8, 5, 4]];
  for (const [x0, y0, r] of blobs) px.disc(x0, y0, r, null, (x, y, nx, ny) => {
    const I = 0.55 - nx * 0.3 - ny * 0.35 + (valueNoise(x / 2, y / 2, 3) - 0.5) * 0.3;
    px.set(x, y, P[I > 0.8 ? 4 : I > 0.55 ? 3 : I > 0.3 ? 2 : 1]);
  });
  // feuilles en dents de scie sur le bas (typique de l'arbuste à couper)
  for (let x = 2; x < 14; x += 3) { px.set(x, 14, P[1]); px.set(x + 1, 15, P[1]); }
  return fin(px, 8, 20, { kind: 'obstacle' });
}

/** Rocher fissuré (Éclate-Roc). */
export function crackRock() {
  const px = new Px(18, 16);
  const P = ['#3a3028', '#62564a', '#8e8070', '#b8aa96', '#ded2bc'];
  px.ellipse(9, 9, 8, 6.5, null, (x, y, nx, ny) => {
    let I = 0.62 - nx * 0.3 - ny * 0.35;
    if (Math.abs(nx * 6 - ny * 3) < 0.5 || Math.abs((nx + 0.3) * 4 + ny * 5) < 0.4) I = -1;
    px.set(x, y, I < -0.5 ? P[0] : P[I > 0.8 ? 4 : I > 0.55 ? 3 : I > 0.25 ? 2 : 1]);
  });
  return fin(px, 9, 15, { kind: 'obstacle' });
}

/** Gros rocher rond (Force). */
export function boulder() {
  const px = new Px(18, 18);
  const P = ['#26222a', '#4a4650', '#76727c', '#a6a2aa', '#d4d0d6'];
  px.disc(9, 9.5, 8, null, (x, y, nx, ny) => {
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let I = 0.5 + 0.55 * (-nx * 0.55 - ny * 0.6 + nz * 0.5) + (bayer(x, y) - 0.5) * 0.12;
    px.set(x, y, P[I > 0.92 ? 4 : I > 0.66 ? 3 : I > 0.4 ? 2 : I > 0.18 ? 1 : 0]);
  });
  px.set(6, 11, P[1]); px.set(7, 12, P[1]); px.set(12, 8, P[1]);
  return fin(px, 9, 17, { kind: 'obstacle' });
}

/** Paroi d'escalade (prises et lianes). */
export function climbWall() {
  const px = new Px(32, 36);
  const P = ['#2c2420', '#4e4238', '#74665a', '#9c8c7c', '#c4b4a0'];
  for (let y = 2; y < 34; y++) for (let x = 2; x < 30; x++) {
    const t = (y - 2) / 32;
    let I = 0.7 - t * 0.35 - (x - 16) / 40 + (valueNoise(x / 4, y / 3, 5) - 0.5) * 0.4;
    if ((y + Math.floor(hash2(x >> 2, 1, 3) * 5)) % 6 === 0) I -= 0.25;
    px.set(x, y, P[Math.max(0, Math.min(4, Math.round(I * 4)))]);
  }
  for (let i = 0; i < 9; i++) { const x = 6 + (i * 7) % 20, y = 5 + i * 3.2; px.rect(Math.round(x), Math.round(y), 3, 2, '#d8c8a8'); px.set(Math.round(x), Math.round(y) + 1, P[0]); }
  for (let y = 2; y < 30; y++) { const x = 24 + Math.round(Math.sin(y * 0.4) * 1.5); px.set(x, y, y % 4 === 0 ? '#7cc85a' : '#3f8a34'); }
  return fin(px, 16, 34, { kind: 'obstacle' });
}

/** Prisme au sol (objet à ramasser). */
export function pickup(color = '#ff6fa8') {
  const px = new Px(12, 12);
  const C = R5(color);
  px.disc(6, 6, 5, null, (x, y, nx, ny) => {
    const top = ny < -0.05;
    const I = 0.55 - nx * 0.3 - ny * 0.3;
    px.set(x, y, top ? C[I > 0.75 ? 4 : I > 0.45 ? 3 : 2] : (I > 0.5 ? '#ffffff' : '#d8d8e0'));
  });
  px.hline(1, 10, 6, '#2a2a34');
  px.disc(6, 6, 1.6, '#2a2a34'); px.set(6, 6, '#ffffff');
  px.set(4, 3, '#ffffff');
  return fin(px, 6, 11, { kind: 'item' });
}

/* ═════════ CLÔTURES (raccords automatiques) ═════════ */
const fenceCache = new Map();
/** Tuile de clôture selon les voisins : n=1 nord, e=2 est, s=4 sud, w=8 ouest. */
export function fenceTile(mask, style = 'wood') {
  const k = `${style}:${mask}`;
  if (fenceCache.has(k)) return fenceCache.get(k);
  const px = new Px(16, 24);
  const C = style === 'white' ? ['#5a5a66', '#a8a8b4', '#d8d8e0', '#f0f0f4', '#ffffff'] : style === 'iron' ? METAL : WOOD;
  const post = (x) => { px.rect(x, 9, 4, 13, C[2]); px.rect(x, 9, 1, 13, C[3]); px.rect(x + 3, 9, 1, 13, C[1]); px.rect(x, 8, 4, 1, C[4]); px.set(x, 8, C[3]); };
  const railH = (x0, x1) => { for (const y of [12, 17]) { px.hline(x0, x1, y, C[3]); px.hline(x0, x1, y + 1, C[1]); } };
  const railV = (y0, y1) => { for (let y = y0; y <= y1; y++) { px.set(7, y, C[3]); px.set(8, y, C[1]); } };
  if (mask & 1) railV(0, 9);
  if (mask & 4) railV(20, 23), railV(16, 23);
  if (mask & 8) railH(0, 7);
  if (mask & 2) railH(8, 15);
  post(6);
  px.outline(null, { k: 0.78 });
  const s = makeSprite(px, 8, 22, { kind: 'fence' });
  fenceCache.set(k, s);
  return s;
}

/* ═════════ PONTS ET PONTONS ═════════ */
/** Tuile de pont. horiz = le pont va d'ouest en est ; edge : 'top' | 'bottom' | null (rambardes). */
export function bridgeTile(horiz, edge = null, seed = 0) {
  const px = new Px(16, 16);
  const C = ['#3a2616', '#6a4628', '#94683e', '#b88a58', '#d8ae7a'];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const u = horiz ? x : y, v = horiz ? y : x;
    const plank = Math.floor(u / 4), j = u % 4;
    let k = j === 3 ? 1 : j === 0 ? 3 : 2;
    if (hash2(plank + seed * 5, v >> 2, 7) < 0.15 && j === 1) k = 1;
    if (hash2(x, y, plank) < 0.06) k = 4;
    px.set(x, y, C[k]);
  }
  if (edge) {
    const rail = (a) => { for (let i = 0; i < 16; i++) { const [x, y] = horiz ? [i, a] : [a, i]; px.set(x, y, C[4]); const [x2, y2] = horiz ? [i, a + 1] : [a + 1, i]; px.set(x2, y2, C[1]); } };
    if (edge === 'top' || edge === 'left') rail(horiz ? 0 : 0);
    if (edge === 'bottom' || edge === 'right') rail(14);
  }
  return px.toCanvas();
}

/** Poteau de ponton / pont (dépasse de l'eau). */
export function pierPost() {
  const px = new Px(6, 10);
  px.rect(1, 1, 4, 8, WOOD[2]); px.rect(1, 1, 1, 8, WOOD[3]); px.rect(4, 1, 1, 8, WOOD[1]); px.rect(1, 0, 4, 1, WOOD[4]);
  return fin(px, 3, 8, { kind: 'prop' });
}

/* ═════════ PANNEAU DE BÂTIMENT (avec texte) ═════════ */
export function labelSign(text) {
  const w = Math.max(16, textWidth(text) + 6);
  const px = new Px(w, 18);
  px.rect(w / 2 - 1, 10, 2, 7, WOOD[1]);
  box3d(px, 0, 1, w, 8, 1, WOOD);
  px.rect(1, 3, w - 2, 6, WOOD[3]);
  drawText(px, text, 3, 3, '#3a2414');
  return fin(px, Math.round(w / 2), 17, { kind: 'prop' });
}

/* ═════════ Registre ═════════ */
const cache = new Map();
export function propSprite(key) {
  let s = cache.get(key);
  if (s) return s;
  const [t, a, b] = key.split(':');
  switch (t) {
    case 'lamp': s = lamp(a || 'classic'); break;
    case 'torch': s = torch(); break;
    case 'campfire': s = campfire(); break;
    case 'sign': s = sign(); break;
    case 'mailbox': s = mailbox(a || '#d84a3a'); break;
    case 'bench': s = bench(); break;
    case 'planter': s = planter(Number(a) || 1); break;
    case 'barrel': s = barrel(); break;
    case 'crate': s = crate(); break;
    case 'table': s = table(); break;
    case 'tent': s = tent(a || '#ff7a3a'); break;
    case 'well': s = well(); break;
    case 'stall': s = stall(a || '#ff7a3a'); break;
    case 'fountain': s = fountainFrames(); break;
    case 'statue': s = statue(a || '#c8c0b0'); break;
    case 'pedestal': s = pedestal(); break;
    case 'gate': s = gate(Number(a) || 3); break;
    case 'cut': s = cutTree(); break;
    case 'smash': s = crackRock(); break;
    case 'boulder': s = boulder(); break;
    case 'climb': s = climbWall(); break;
    case 'pickup': s = pickup(a || '#ff6fa8'); break;
    case 'post': s = pierPost(); break;
    case 'label': s = labelSign(a || ''); break;
    default: s = crate();
  }
  cache.set(key, s);
  return s;
}

export { box3d, R5, WOOD, STONE, METAL, fin };
