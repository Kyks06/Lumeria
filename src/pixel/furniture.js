import { Px } from './Px.js';
import { shade, hash2, valueNoise, mixHex, rng } from './color.js';
import { makeSprite } from './nature.js';
import { drawText, textWidth } from './font.js';
import { box3d, R5, WOOD, STONE, METAL, fin, propSprite } from './props.js';

/**
 * MOBILIER ET MATIÈRES D'INTÉRIEUR EN PIXEL ART : lits, tables, chaises, tapis, bibliothèques,
 * plantes, télévision, canapés, cuisine, armoire, cheminée, comptoirs, machine de soin, PC,
 * étagères, ascenseur, machines de laboratoire, bureaux, piliers, escaliers, affiches, fenêtres ;
 * sols (parquet, carrelage, dalles, métal) et murs (papier peint, plâtre, panneaux, pierre, rondins).
 */
const C5 = (c) => R5(c);

export function bed(color = '#3a7bd5') {
  const px = new Px(16, 34);
  const C = C5(color);
  box3d(px, 0, 1, 16, 5, 4, WOOD);                 // tête de lit
  px.rect(1, 9, 14, 23, '#f4f0e8'); px.rect(1, 9, 1, 23, '#ffffff'); px.rect(14, 9, 1, 23, '#d8d0c4');
  px.rect(2, 10, 12, 6, '#ffffff'); px.rect(2, 15, 12, 1, '#d8d4cc');   // oreiller
  for (let y = 17; y < 32; y++) for (let x = 1; x < 15; x++) px.set(x, y, y === 17 ? C[4] : x === 1 ? C[3] : x === 14 ? C[1] : (y - 17) % 5 === 0 ? C[1] : C[2]);
  px.rect(1, 32, 14, 2, WOOD[1]);
  return fin(px, 8, 33);
}

export function table(w = 2) {
  const W = w * 16;
  const px = new Px(W, 24);
  box3d(px, 1, 4, W - 2, 4, 8, WOOD);
  for (let x = 1; x < W - 1; x++) px.set(x, 5, (x % 7) ? WOOD[4] : WOOD[3]);
  for (const x of [3, W - 6]) { px.rect(x, 16, 3, 6, WOOD[1]); px.set(x, 16, WOOD[2]); }
  return fin(px, W / 2, 22);
}

export function chair(color = '#a6764a') {
  const px = new Px(16, 20);
  const C = C5(color);
  box3d(px, 3, 2, 10, 6, 1, C);
  box3d(px, 3, 9, 10, 3, 3, C);
  px.rect(4, 15, 2, 4, C[0]); px.rect(10, 15, 2, 4, C[0]);
  return fin(px, 8, 18);
}

export function rug(color = '#c8553d', w = 3, h = 2) {
  const px = new Px(w * 16, h * 16);
  const C = C5(color);
  for (let y = 1; y < h * 16 - 1; y++) for (let x = 1; x < w * 16 - 1; x++) {
    const bx = Math.min(x, w * 16 - 1 - x), by = Math.min(y, h * 16 - 1 - y);
    const b = Math.min(bx, by);
    let col = b < 2 ? C[1] : b < 3 ? C[3] : ((x >> 2) + (y >> 2)) % 2 ? C[2] : shade(color, 0.1);
    if (b > 4 && b < 6) col = C[4];
    px.set(x, y, col);
  }
  for (let x = 2; x < w * 16 - 2; x += 2) { px.set(x, 0, C[3]); px.set(x, h * 16 - 1, C[3]); }
  return makeSprite(px, 0, h * 16, { kind: 'decal' });
}

export function bookshelf() {
  const px = new Px(32, 34);
  box3d(px, 0, 1, 32, 30, 2, WOOD);
  const R = rng(5);
  const books = ['#c8553d', '#3a7bd5', '#7dc860', '#ffd23f', '#c58bff', '#e8e4dc', '#ff9a4a'];
  for (let s = 0; s < 3; s++) {
    const y0 = 5 + s * 9;
    px.rect(2, y0, 28, 8, WOOD[0]);
    let x = 3;
    while (x < 29) {
      const bw = 1 + Math.floor(R() * 2), bh = 5 + Math.floor(R() * 3), c = books[Math.floor(R() * books.length)];
      for (let i = 0; i < bw && x + i < 29; i++) for (let j = 0; j < bh; j++) px.set(x + i, y0 + 8 - bh + j, j === 0 ? shade(c, 0.3) : i === 0 ? shade(c, 0.15) : c);
      x += bw + (R() < 0.2 ? 1 : 0);
    }
    px.rect(2, y0 + 8, 28, 1, WOOD[3]);
  }
  return fin(px, 16, 32);
}

export function plant() {
  const px = new Px(16, 26);
  const L = ['#1e4a22', '#2f6e30', '#4a9a3e', '#78c25a', '#b0e07a'];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42;
    for (let s = 0; s < 9; s++) {
      const x = 8 + Math.cos(a) * s * 0.9, y = 15 + Math.sin(a) * s * 1.1 + (s * s) * 0.04;
      px.disc(x, y, s < 6 ? 1.6 : 1.2, L[s < 3 ? 1 : s < 6 ? 2 : 3]);
    }
  }
  box3d(px, 4, 16, 8, 6, 2, ['#5a2a1e', '#8a4a32', '#b8683e', '#d88a5a', '#f0b080']);
  return fin(px, 8, 24);
}

export function tv() {
  const px = new Px(16, 24), em = new Px(16, 24);
  box3d(px, 1, 13, 14, 7, 2, WOOD);
  px.rect(1, 2, 14, 10, '#2a2a34'); px.rect(1, 2, 14, 1, '#4a4a5a');
  px.rect(2, 3, 12, 8, '#3a6ab0');
  for (let y = 3; y < 11; y++) for (let x = 2; x < 14; x++) if ((x + y) % 5 === 0) px.set(x, y, '#8ac8ff');
  em.rect(2, 3, 12, 8, '#7ab8ff');
  px.set(6, 0, '#5a5a6a'); px.set(10, 0, '#5a5a6a'); px.set(7, 1, '#5a5a6a'); px.set(9, 1, '#5a5a6a');
  return fin(px, 8, 22, { emissive: em.toCanvas(), glowColor: '#7ab8ff', lights: [{ x: 8, y: 7, r: 20, color: '#8ac0ff' }] });
}

export function sofa(color = '#c8553d', vertical = false) {
  const C = C5(color);
  if (vertical) {
    const px = new Px(16, 34);
    box3d(px, 1, 1, 6, 28, 2, C);
    box3d(px, 5, 6, 10, 20, 3, C);
    px.rect(2, 2, 13, 3, C[3]); px.rect(2, 29, 13, 3, C[3]);
    for (let y = 12; y < 26; y += 7) px.hline(6, 14, y, C[1]);
    return fin(px, 8, 33);
  }
  const px = new Px(32, 22);
  box3d(px, 1, 1, 30, 8, 2, C);
  box3d(px, 1, 9, 30, 8, 3, C);
  px.rect(0, 5, 4, 14, C[3]); px.rect(28, 5, 4, 14, C[1]);
  px.vline(16, 10, 18, C[1]);
  return fin(px, 16, 20);
}

export function fridge() {
  const px = new Px(16, 32);
  box3d(px, 1, 1, 14, 27, 2, ['#5a6070', '#b8c0cc', '#dce2ea', '#eef2f6', '#ffffff']);
  px.rect(1, 13, 14, 1, '#8a92a0');
  px.rect(12, 6, 1, 5, '#8a92a0'); px.rect(12, 16, 1, 7, '#8a92a0');
  return fin(px, 8, 30);
}

export function stove() {
  const px = new Px(16, 24);
  box3d(px, 1, 2, 14, 14, 5, ['#2a2a30', '#5a5a64', '#9a9aa4', '#c4c4cc', '#e4e4ea']);
  px.disc(5, 4.5, 2, '#2a2a30'); px.disc(11, 4.5, 2, '#2a2a30');
  px.rect(3, 11, 10, 6, '#2a2a30'); px.rect(4, 12, 8, 4, '#4a3a3a');
  return fin(px, 8, 22);
}

export function wardrobe() {
  const px = new Px(32, 34);
  box3d(px, 1, 1, 30, 29, 2, WOOD, { grain: 'planks' });
  px.vline(16, 4, 30, WOOD[0]);
  px.rect(13, 16, 1, 4, '#ffd23f'); px.rect(18, 16, 1, 4, '#ffd23f');
  return fin(px, 16, 32);
}

export function fireplace() {
  const frames = [], emf = [];
  let base = null;
  for (let f = 0; f < 3; f++) {
    const px = new Px(32, 30), em = new Px(32, 30);
    box3d(px, 0, 2, 32, 24, 3, STONE);
    for (let y = 5; y < 28; y += 4) for (let x = (y % 8 ? 0 : 4); x < 32; x += 8) px.set(x, y, STONE[1]);
    px.rect(7, 12, 18, 16, '#1a1210');
    for (let i = 0; i < 3; i++) {
      const cx = 11 + i * 5, h = 6 + ((f + i) % 3) * 2;
      for (let j = 0; j < h; j++) for (let k = -2; k <= 2; k++) {
        if (Math.abs(k) > (h - j) * 0.4) continue;
        const c = j < 2 ? '#fff0a0' : Math.abs(k) < 1 ? '#ffd23f' : j > h - 3 ? '#e8501e' : '#ff8a2a';
        px.set(cx + k, 26 - j, c); em.set(cx + k, 26 - j, c);
      }
    }
    px.rect(0, 1, 32, 2, WOOD[3]); px.rect(0, 2, 32, 1, WOOD[1]);
    px.outline(null, { k: 0.78 });
    frames.push(px.toCanvas()); emf.push(em.toCanvas());
    if (!base) base = px;
  }
  return makeSprite(base, 16, 28, { frames, emFrames: emf, emissive: emf[0], lights: [{ x: 16, y: 20, r: 60, color: '#ff9a4a', flicker: true }], kind: 'prop' });
}

export function counter(w = 4, top = '#f4f0e8', accent = '#ff5c8a') {
  const W = w * 16;
  const px = new Px(W, 24);
  const T = C5(top), A = C5(accent);
  box3d(px, 0, 4, W, 13, 6, T);
  for (let x = 0; x < W; x++) { px.set(x, 10, A[3]); px.set(x, 11, A[2]); px.set(x, 12, A[1]); }
  for (let x = 6; x < W; x += 12) px.vline(x, 13, 22, T[1]);
  return fin(px, W / 2, 22);
}

export function healer() {
  const px = new Px(32, 30), em = new Px(32, 30);
  box3d(px, 1, 4, 30, 16, 8, ['#8a2a40', '#c84a6a', '#ff7a98', '#ffb0c4', '#ffe0ea']);
  for (let i = 0; i < 6; i++) { const x = 6 + (i % 3) * 8, y = 7 + Math.floor(i / 3) * 4; px.disc(x, y, 1.7, '#ffffff'); px.set(x, y, '#ff3a5a'); em.set(x, y, '#ff8aa8'); }
  px.rect(4, 16, 24, 6, '#3a3a4a'); px.rect(5, 17, 22, 4, '#7af0c8'); em.rect(5, 17, 22, 4, '#7af0c8');
  return fin(px, 16, 28, { emissive: em.toCanvas(), glowColor: '#7af0c8' });
}

export function pc() {
  const px = new Px(16, 28), em = new Px(16, 28);
  box3d(px, 1, 4, 14, 20, 2, ['#3a4250', '#6a7486', '#a8b2c4', '#d0d8e6', '#eef2f8']);
  px.rect(3, 7, 10, 7, '#1e2a3a'); px.rect(4, 8, 8, 5, '#5ad0ff');
  for (let x = 4; x < 12; x += 2) px.set(x, 10, '#c8f4ff');
  em.rect(4, 8, 8, 5, '#5ad0ff');
  px.rect(4, 17, 8, 2, '#3a4250'); px.set(11, 21, '#7aff9a'); em.set(11, 21, '#7aff9a');
  return fin(px, 8, 26, { emissive: em.toCanvas(), glowColor: '#5ad0ff' });
}

export function shelf(color = '#3f7cff') {
  const px = new Px(32, 34);
  box3d(px, 0, 1, 32, 29, 2, ['#3a4250', '#8a94a6', '#c4ccd8', '#e2e8f0', '#ffffff']);
  const R = rng(color.length * 7);
  const goods = [color, '#ff5c8a', '#ffd23f', '#7dc860', '#ffffff', '#ff9a4a'];
  for (let s = 0; s < 3; s++) {
    const y0 = 5 + s * 9;
    px.rect(2, y0 + 7, 28, 1, '#8a94a6');
    for (let x = 3; x < 29; x += 3 + Math.floor(R() * 2)) {
      const c = goods[Math.floor(R() * goods.length)], h = 3 + Math.floor(R() * 3);
      px.rect(x, y0 + 7 - h, 2, h, c); px.set(x, y0 + 7 - h, shade(c, 0.4));
    }
  }
  return fin(px, 16, 32);
}

export function elevator() {
  const px = new Px(32, 34), em = new Px(32, 34);
  box3d(px, 0, 1, 32, 30, 2, METAL);
  px.rect(4, 6, 24, 24, '#c4cad8'); px.vline(16, 6, 30, '#5e6474');
  px.rect(5, 7, 10, 22, '#dce2ec'); px.rect(17, 7, 10, 22, '#dce2ec');
  px.rect(13, 2, 6, 3, '#1e2028'); px.set(15, 3, '#ffd23f'); px.set(16, 3, '#ffd23f'); em.rect(15, 3, 2, 1, '#ffd23f');
  return fin(px, 16, 32, { emissive: em.toCanvas() });
}

export function labMachine() {
  const px = new Px(16, 32), em = new Px(16, 32);
  box3d(px, 1, 2, 14, 26, 2, ['#2a3440', '#5a6a7e', '#8a9ab0', '#bccadc', '#e4eef8']);
  px.rect(3, 6, 10, 8, '#102028'); px.rect(4, 7, 8, 6, '#3affb0');
  for (let x = 4; x < 12; x++) px.set(x, 10 + Math.round(Math.sin(x) * 1.5), '#c8ffe8');
  em.rect(4, 7, 8, 6, '#3affb0');
  for (let i = 0; i < 3; i++) { px.set(4 + i * 3, 18, ['#ff5a5a', '#ffd23f', '#5aff8a'][i]); em.set(4 + i * 3, 18, ['#ff5a5a', '#ffd23f', '#5aff8a'][i]); }
  px.rect(3, 21, 10, 4, '#3a4a5a');
  return fin(px, 8, 30, { emissive: em.toCanvas(), glowColor: '#3affb0' });
}

export function desk() {
  const px = new Px(32, 24);
  box3d(px, 1, 4, 30, 12, 6, WOOD);
  px.rect(4, 5, 8, 4, '#f4f0e8'); px.rect(5, 6, 6, 1, '#a8a49c'); px.rect(5, 7, 4, 1, '#a8a49c');
  px.rect(20, 3, 6, 5, '#3a4250'); px.rect(21, 4, 4, 3, '#5ad0ff');
  px.rect(20, 12, 9, 4, WOOD[1]); px.rect(23, 13, 3, 1, '#ffd23f');
  return fin(px, 16, 22);
}

export function pillar(color = '#d0c8b8') {
  const px = new Px(16, 44);
  const C = C5(color);
  for (let y = 6; y < 39; y++) for (let x = 3; x < 13; x++) { const u = (x - 3) / 9; px.set(x, y, C[u < 0.2 ? 4 : u < 0.5 ? 3 : u < 0.8 ? 2 : 1]); }
  for (let x = 5; x < 12; x += 3) px.vline(x, 7, 38, C[1]);
  box3d(px, 1, 1, 14, 3, 2, C);
  box3d(px, 1, 38, 14, 3, 2, C);
  return fin(px, 8, 42);
}

export function stairs(up = true) {
  const px = new Px(32, 24);
  for (let s = 0; s < 5; s++) {
    const y = up ? 2 + s * 4 : 2 + s * 4;
    const k = up ? 4 - s : s;
    px.rect(1, y, 30, 4, STONE[Math.max(1, 4 - Math.floor(k * 0.8))]);
    px.rect(1, y + 3, 30, 1, STONE[0]);
  }
  px.rect(0, 0, 2, 24, WOOD[2]); px.rect(30, 0, 2, 24, WOOD[1]);
  return fin(px, 16, 22, { kind: 'decal' });
}

export function poster(text = '', color = '#ff5c8a') {
  const tw = Math.max(20, textWidth(text) + 6);
  const px = new Px(tw, 14);
  px.rect(0, 0, tw, 14, '#ffffff'); px.rect(1, 1, tw - 2, 12, color);
  px.rect(1, 1, tw - 2, 1, shade(color, 0.4));
  if (text) drawText(px, text, 3, 5, '#ffffff', shade(color, -0.5));
  return fin(px, tw / 2, 13, { kind: 'decal' });
}

export function windowWall(night = false) {
  const px = new Px(22, 18), em = new Px(22, 18);
  px.rect(0, 0, 22, 16, WOOD[1]); px.rect(1, 1, 20, 14, WOOD[3]);
  for (let y = 2; y < 14; y++) for (let x = 2; x < 20; x++) {
    const c = (x + y) % 9 < 2 ? '#e4f6ff' : y < 8 ? '#9ed2ee' : '#7ab8e0';
    px.set(x, y, c); em.set(x, y, '#ffe0a0');
  }
  px.vline(11, 2, 13, WOOD[3]); px.hline(2, 19, 8, WOOD[3]);
  px.rect(0, 15, 22, 2, WOOD[2]); px.rect(0, 16, 22, 1, WOOD[0]);
  return makeSprite(px, 11, 17, { kind: 'decal', emissive: em.toCanvas() });
}

/* ═════════ Sols et murs ═════════ */
export function floorTile(kind, color, x, y, seed = 1) {
  const C = C5(color);
  switch (kind) {
    case 'planks': {
      const row = y >> 2, j = y & 3;
      const seam = ((x + Math.floor(hash2(row, 3, seed) * 32)) % 32) === 0;
      if (j === 3 || seam) return C[1];
      if (j === 0) return C[3];
      return hash2(x >> 2, y, seed) < 0.03 ? C[1] : C[2];
    }
    case 'tiles': {
      const tx = x >> 3, ty = y >> 3, lx = x & 7, ly = y & 7;
      if (lx === 7 || ly === 7) return C[1];
      const base = (tx + ty) % 2 ? C[2] : shade(color, 0.12);
      return lx === 0 || ly === 0 ? shade(base, 0.25) : base;
    }
    case 'stone': {
      const tx = x >> 4, ty = y >> 4, lx = x & 15, ly = y & 15;
      const off = (ty % 2) * 8, lx2 = (x + off) & 15;
      if (ly === 15 || lx2 === 15) return C[0];
      if (ly === 0 || lx2 === 0) return C[3];
      return valueNoise(x / 4, y / 4, seed + tx) < 0.35 ? C[1] : C[2];
    }
    case 'metal': {
      const lx = x & 15, ly = y & 15;
      if (lx === 15 || ly === 15) return C[0];
      if ((lx === 2 || lx === 13) && (ly === 2 || ly === 13)) return C[4];
      return (lx + ly) % 6 === 0 ? C[3] : C[2];
    }
    default: return C[2];
  }
}

export function wallTexel(kind, color, x, y, h) {
  const C = C5(color);
  const yy = y, base = h - 6;
  if (yy >= base) return yy === base ? C[0] : yy >= h - 2 ? WOOD[1] : WOOD[2]; // plinthe
  switch (kind) {
    case 'wallpaper': return (x % 8 < 4) ? C[2] : shade(color, -0.06);
    case 'plaster': return yy < 2 ? C[3] : (hash2(x, y, 9) < 0.06 ? C[1] : C[2]);
    case 'panel': { const lx = x % 24; return lx === 0 ? C[1] : lx === 1 ? C[3] : yy % 12 === 0 ? C[1] : C[2]; }
    case 'stone': { const row = yy >> 3, off = (row % 2) * 6, lx = (x + off) % 12; return (yy & 7) === 7 || lx === 0 ? C[1] : (yy & 7) === 0 ? C[3] : C[2]; }
    case 'logs': { const j = yy % 6; return j === 0 || j === 1 ? C[3] : j === 5 ? C[0] : j === 4 ? C[1] : C[2]; }
    case 'hedge': return valueNoise(x / 3, y / 3, 2) > 0.5 ? C[3] : C[2];
    case 'ice': return (x + yy) % 9 < 2 ? C[4] : yy < 4 ? C[3] : C[2];
    case 'rock': return valueNoise(x / 4, y / 5, 7) > 0.55 ? C[3] : valueNoise(x / 3, y / 3, 3) < 0.3 ? C[1] : C[2];
    case 'metal': { const lx = x % 16; return lx === 0 ? C[0] : lx === 1 ? C[3] : (yy % 10 === 0) ? C[1] : C[2]; }
    default: return C[2];
  }
}

/* ═════════ Registre ═════════ */
const cache = new Map();
export function furniture(key) {
  let s = cache.get(key);
  if (s) return s;
  const [t, a, b, c] = key.split('|');
  switch (t) {
    case 'bed': s = bed(a); break;
    case 'table': s = table(Number(a) || 2); break;
    case 'chair': s = chair(); break;
    case 'rug': s = rug(a, Number(b) || 3, Number(c) || 2); break;
    case 'bookshelf': s = bookshelf(); break;
    case 'plant': s = plant(); break;
    case 'tv': s = tv(); break;
    case 'sofa': s = sofa(a || '#c8553d', b === 'v'); break;
    case 'fridge': s = fridge(); break;
    case 'stove': s = stove(); break;
    case 'wardrobe': s = wardrobe(); break;
    case 'fireplace': s = fireplace(); break;
    case 'counter': s = counter(Number(a) || 4, b || '#f4f0e8', c || '#ff5c8a'); break;
    case 'healer': s = healer(); break;
    case 'pc': s = pc(); break;
    case 'shelf': s = shelf(a || '#3f7cff'); break;
    case 'elevator': s = elevator(); break;
    case 'labmachine': s = labMachine(); break;
    case 'desk': s = desk(); break;
    case 'pillar': s = pillar(a || '#d0c8b8'); break;
    case 'stairs': s = stairs(a !== 'down'); break;
    case 'poster': s = poster(a || '', b || '#ff5c8a'); break;
    case 'window': s = windowWall(); break;
    case 'statue': s = propSprite(`statue:${a || '#c8c0b0'}`); break;
    case 'pedestal': s = propSprite('pedestal'); break;
    case 'crates': s = propSprite('crate'); break;
    case 'barrel': s = propSprite('barrel'); break;
    default: s = propSprite('crate');
  }
  cache.set(key, s);
  return s;
}
