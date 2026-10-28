import { Px } from './Px.js';
import { shade, hash2, bayer, valueNoise, mixHex, outlineOf } from './color.js';
import { drawText, textWidth } from './font.js';
import { TYPES } from '../config/types.js';

/**
 * BÂTIMENTS EN PIXEL ART (vue de 3/4, façade au sud) : maisons, Centres Lumin, boutiques, arènes,
 * laboratoire, pension, tour, grand magasin, phare, entrepôt, centrale, temple, Ligue, entrée de grotte,
 * moulin. Chaque sprite fournit : canvas, emissive (fenêtres allumées), windows, chimneys, height.
 */
export const BSTYLE = {
  village: { wall: 'plaster', wallC: '#f2e6cc', roof: '#c8553d', trim: '#7a4e34', base: '#8a8070', door: '#8a5230' },
  foret: { wall: 'planks', wallC: '#c89a6a', roof: '#5a8a3a', trim: '#4a3020', base: '#6a6258', door: '#5a3a22' },
  port: { wall: 'plaster', wallC: '#f6f6f0', roof: '#2f6fb8', trim: '#2a4a7a', base: '#b8b0a2', door: '#2a5a8a' },
  montagne: { wall: 'stone', wallC: '#d4ccc0', roof: '#5a6070', trim: '#4a4038', base: '#6a6258', door: '#6a4430' },
  desert: { wall: 'adobe', wallC: '#e8c89a', roof: 'flat', roofC: '#d6b07a', trim: '#8a5a30', base: '#c8a878', door: '#8a5a30' },
  marais: { wall: 'planks', wallC: '#8a7a5a', roof: '#4a5a3a', trim: '#3a3020', base: '#5a5440', door: '#3a2e20', stilts: true },
  neige: { wall: 'logs', wallC: '#c89a6a', roof: '#6a7a94', trim: '#5a3a24', base: '#7a7470', door: '#5a3a22', snowRoof: true },
  volcan: { wall: 'stone', wallC: '#8a786e', roof: '#3a2e2e', trim: '#c8501e', base: '#3a3232', door: '#2a1e1a' },
  cite: { wall: 'panel', wallC: '#e8eef6', roof: 'flat', roofC: '#c8d0e0', trim: '#5a6cff', base: '#a8b0c0', door: '#5a6cff', modern: true },
  ligue: { wall: 'stone', wallC: '#f0ece2', roof: '#2a3a7a', trim: '#d8a830', base: '#c8c0b0', door: '#2a3a7a' },
};

const R5 = (c) => [shade(c, -0.62), shade(c, -0.32), c, shade(c, 0.28), shade(c, 0.55)];

/* ═════════ Matières ═════════ */
function wallFill(px, x0, y0, w, h, st, seed = 1) {
  const C = R5(st.wallC);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const lx = x - x0, ly = y - y0;
    let col = C[2];
    switch (st.wall) {
      case 'planks': {
        const row = Math.floor(ly / 4), j = ly % 4;
        const seam = (lx + row * 7 + Math.floor(hash2(row, 2, seed) * 9)) % 13 === 0;
        col = j === 3 || seam ? C[0] : j === 0 ? C[3] : (hash2(x, y, seed) < 0.1 ? C[1] : C[2]);
        break;
      }
      case 'logs': {
        const row = Math.floor(ly / 5), j = ly % 5;
        col = j === 0 ? C[3] : j === 1 ? C[3] : j === 4 ? C[0] : j === 3 ? C[1] : C[2];
        if ((lx === 0 || lx === w - 1) && j > 0) col = j < 3 ? '#e0c090' : '#b08a5a';
        break;
      }
      case 'stone': {
        const row = Math.floor(ly / 5), j = ly % 5;
        const off = (row % 2) * 4;
        const col8 = Math.floor((lx + off) / 8), i8 = (lx + off) % 8;
        if (j === 4 || i8 === 0) col = C[0];
        else if (j === 0 || i8 === 1) col = C[3];
        else col = hash2(col8, row, seed) < 0.3 ? C[1] : C[2];
        break;
      }
      case 'brick': {
        const row = Math.floor(ly / 3), j = ly % 3;
        const off = (row % 2) * 3;
        if (j === 2 || (lx + off) % 6 === 0) col = C[0]; else col = hash2(Math.floor((lx + off) / 6), row, seed) < 0.35 ? C[1] : C[2];
        break;
      }
      case 'adobe': {
        const v = valueNoise(x / 5, y / 5, seed) + (bayer(x, y) - 0.5) * 0.15;
        col = v > 0.7 ? C[3] : v < 0.28 ? C[1] : C[2];
        if (ly > h - 5) col = C[1];
        if (hash2(x, y, seed + 2) < 0.015) col = C[0];
        break;
      }
      case 'panel': {
        const i = lx % 10, j = ly % 10;
        col = i === 0 || j === 0 ? C[1] : i === 1 || j === 1 ? C[4] : C[3];
        break;
      }
      case 'metal': {
        col = lx % 4 === 0 ? C[1] : lx % 4 === 1 ? C[3] : C[2];
        if (ly % 16 === 15) col = C[0];
        break;
      }
      default: { // enduit
        const v = valueNoise(x / 6, y / 6, seed) + (bayer(x, y) - 0.5) * 0.12;
        col = v > 0.72 ? C[3] : C[2];
        if (ly > h - 6 && bayer(x, y) < 0.5) col = C[1];
        if (hash2(x, y, seed + 3) < 0.02) col = C[1];
      }
    }
    px.set(x, y, col);
  }
}

/** Toit à tuiles (vue de face) ; type 'hip' = toit à quatre pans (côtés visibles). */
function roofFill(px, x0, y0, w, h, color, { type = 'hip', snow = false, seed = 1 } = {}) {
  const C = R5(color);
  const side = type === 'hip' ? Math.min(Math.floor(w * 0.18), 14) : 0;
  for (let y = y0; y < y0 + h; y++) {
    const ly = y - y0, t = ly / Math.max(1, h - 1);
    const ins = Math.round(side * (1 - t));
    for (let x = x0; x < x0 + w; x++) {
      const lx = x - x0;
      const row = Math.floor(ly / 4), j = ly % 4;
      const off = (row % 2) * 3;
      const seam = (lx + off) % 6 === 0;
      let k = j === 0 ? 3 : j === 3 ? 1 : 2;
      if (seam && j > 1) k = 1;
      if (t < 0.3) k = Math.min(4, k + 1);
      if (t > 0.8) k = Math.max(0, k - 1);
      let col = C[k];
      if (lx < ins) col = C[Math.min(4, k + 1)]; // pan gauche éclairé
      else if (w - 1 - lx < ins) col = C[Math.max(0, k - 1)]; // pan droit à l'ombre
      if (lx === ins || w - 1 - lx === ins) col = C[0];
      if (ly <= 1) col = ly === 0 ? C[1] : C[4]; // faîtage
      if (snow && (t < 0.45 + hash2(lx, 1, seed) * 0.2)) col = t < 0.15 || bayer(x, y) < 0.8 ? '#f4f8fc' : '#d8e4f0';
      px.set(x, y, col);
    }
  }
  // avant-toit sombre
  for (let x = x0; x < x0 + w; x++) { px.set(x, y0 + h - 1, C[0]); }
  if (snow) for (let x = x0 + 2; x < x0 + w - 2; x += 3 + Math.floor(hash2(x, 3, seed) * 3)) { px.set(x, y0 + h, '#e8f4ff'); if (hash2(x, 4, seed) < 0.6) px.set(x, y0 + h + 1, '#c8e4ff'); }
}

function flatRoof(px, x0, y0, w, h, color, trim) {
  const C = R5(color);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const lx = x - x0, ly = y - y0;
    let col = (lx + ly) % 7 === 0 ? C[3] : C[2];
    if (ly < 2 || lx < 2 || lx >= w - 2) col = C[3];
    if (ly === h - 1 || ly === h - 2) col = trim ? trim : C[1];
    if (ly === h - 1) col = C[0];
    px.set(x, y, col);
  }
}

function windowAt(px, em, list, x, y, w = 10, h = 9, trim = '#5a3a22', opts = {}) {
  const T = R5(trim);
  px.rect(x - 1, y - 1, w + 2, h + 2, T[1]);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const diag = (i + j) % 7 === 0 || (i + j) % 7 === 1;
    let col = j < h / 2 ? '#9ed2ee' : '#6aa4d0';
    if (diag && i < w - 2) col = '#e4f6ff';
    if (opts.curtain && (i < 2 || i > w - 3)) col = opts.curtain;
    px.set(x + i, y + j, col);
    em?.set(x + i, y + j, opts.curtain && (i < 2 || i > w - 3) ? shade(opts.curtain, 0.3) : j < h / 2 ? '#ffe39a' : '#ffc860');
  }
  if (!opts.noCross) { for (let j = 0; j < h; j++) { px.set(x + (w >> 1), y + j, T[3]); em?.set(x + (w >> 1), y + j, '#c88a3a'); } for (let i = 0; i < w; i++) { px.set(x + i, y + (h >> 1), T[3]); em?.set(x + i, y + (h >> 1), '#c88a3a'); } }
  px.rect(x - 2, y + h + 1, w + 4, 2, T[2]); px.rect(x - 2, y + h + 2, w + 4, 1, T[0]);
  if (opts.flowers) for (let i = 0; i < w + 2; i += 2) { px.set(x - 1 + i, y + h, ['#ff6a8a', '#ffd23f', '#ff9ad0'][i % 3]); px.set(x + i, y + h, '#4a9a3a'); }
  list.push({ x: x + w / 2, y: y + h });
}

function doorAt(px, x, y, w, h, color, { glass = false, frame = '#3a2618', arch = false } = {}) {
  const C = R5(color);
  px.rect(x - 1, y - 1, w + 2, h + 1, shade(frame, -0.2));
  if (glass) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const pane = i === (w >> 1) || i === 0 || i === w - 1 || j === 0;
      px.set(x + i, y + j, pane ? '#c8d0d8' : (i + j) % 6 < 2 ? '#d8f0ff' : j < h * 0.5 ? '#7ab8e0' : '#5a92c0');
    }
  } else {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let col = i < 1 ? C[3] : i > w - 2 ? C[1] : C[2];
      if ((j === 2 || j === h - 3) && i > 0 && i < w - 1) col = C[1];
      if ((i === 2 || i === w - 3) && j > 2 && j < h - 3) col = C[1];
      px.set(x + i, y + j, col);
    }
    px.set(x + w - 3, y + (h >> 1) + 1, '#ffd23f'); px.set(x + w - 3, y + (h >> 1) + 2, '#b08a2a');
  }
  if (arch) for (let i = 0; i < w; i++) { if (i < 2 || i > w - 3) px.set(x + i, y, shade(frame, -0.2)); }
}

function chimneyAt(px, x, y, color = '#a85a44') {
  const C = R5(color);
  px.rect(x, y, 6, 10, C[2]); px.rect(x, y, 2, 10, C[3]); px.rect(x + 5, y, 1, 10, C[1]);
  for (let j = 2; j < 10; j += 3) px.rect(x, y + j, 6, 1, C[1]);
  px.rect(x - 1, y - 2, 8, 2, C[0]); px.rect(x - 1, y - 2, 8, 1, C[3]);
  return { x: x + 3, y: y - 3 };
}

function signBoard(px, text, cx, y, bg = '#f6f0e4', fg = '#3a2a1a', border = '#5a3a22') {
  const tw = textWidth(text);
  const w = tw + 6, h = 9;
  const x = Math.round(cx - w / 2);
  px.rect(x, y, w, h, border);
  px.rect(x + 1, y + 1, w - 2, h - 2, bg);
  px.rect(x + 1, y + h - 2, w - 2, 1, shade(bg, -0.2));
  drawText(px, text, x + 3, y + 2, fg);
  return { x, y, w, h };
}

/** Emblème « Éclat » (étoile à 4 branches) du Centre Lumin. */
function shardEmblem(px, em, cx, cy, r, color) {
  const C = R5(color);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.abs(x) + Math.abs(y) * 1.0;
    const star = Math.abs(x) * Math.abs(y) < r * 0.9 && d <= r;
    if (!star) continue;
    const col = x + y < 0 ? C[4] : x + y < 2 ? C[3] : C[2];
    px.set(cx + x, cy + y, col);
    em?.set(cx + x, cy + y, C[3]);
  }
  px.set(cx, cy, '#ffffff'); em?.set(cx, cy, '#ffffff');
}

function finish(px, em, meta) {
  // contour extérieur sombre (dans l'emprise)
  const src = new Uint8ClampedArray(px.d);
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) {
    const i = (y * px.w + x) * 4;
    if (!src[i + 3]) continue;
    const at = (xx, yy) => (xx >= 0 && yy >= 0 && xx < px.w && yy < px.h ? src[(yy * px.w + xx) * 4 + 3] : 0);
    if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) px.set(x, y, outlineOf(px.hex(x, y), 0.72));
  }
  return { canvas: px.toCanvas(), emissive: em ? em.toCanvas() : null, w: px.w, h: px.h, shadow: px.silhouette(), ...meta };
}

/* ═════════ Bâtiment générique (maison, boutique, centre…) ═════════ */
function generic(B, st, o) {
  const W = B.w * 16, H = B.d * 16 + B.rise;
  const px = new Px(W, H), em = new Px(W, H);
  const wallH = o.wallH || 26;
  const roofH = H - wallH;
  const wy = H - wallH;
  const windows = [], chimneys = [];
  wallFill(px, 1, wy, W - 2, wallH - 2, st, o.seed);
  px.rect(1, H - 3, W - 2, 3, st.base); px.rect(1, H - 3, W - 2, 1, shade(st.base, 0.3));
  // poteaux d'angle
  for (const x of [1, W - 3]) for (let y = wy; y < H - 3; y++) { px.set(x, y, shade(st.trim, 0.15)); px.set(x + 1, y, st.trim); }
  // toit
  if (st.roof === 'flat' || o.flat) flatRoof(px, 0, 0, W, roofH + 1, st.roofC || '#c8c0b0', st.trim);
  else roofFill(px, 0, 0, W, roofH + 1, o.roofColor || st.roof, { type: o.roofType || 'hip', snow: st.snowRoof, seed: o.seed });
  // ombre de l'avant-toit
  for (let x = 1; x < W - 1; x++) { px.set(x, wy + 1, shade(px.hex(x, wy + 2), -0.4)); }
  // porte
  const dx = B.doorC * 16 + 3, dw = o.doorW || 10, dh = o.doorH || 16;
  const dX = o.doorX ?? (B.door * 16 + (16 - dw) / 2);
  doorAt(px, dX, H - 3 - dh, dw, dh, st.door, { glass: o.glass, frame: shade(st.trim, -0.2) });
  // marche
  px.rect(dX - 2, H - 3, dw + 4, 3, shade(st.base, 0.2)); px.rect(dX - 2, H - 1, dw + 4, 1, shade(st.base, -0.3));
  // fenêtres
  const wn = o.windows ?? [];
  for (const [x, y, w, h, opts] of wn) windowAt(px, em, windows, x, y, w, h, st.trim, opts || {});
  if (o.chimney && st.roof !== 'flat') chimneys.push(chimneyAt(px, o.chimney, Math.max(2, Math.round(roofH * 0.18))));
  return { px, em, windows, chimneys, wy, roofH, dX, dw, dh };
}

const COLORS_ROOF = ['#c8553d', '#3a7bd5', '#7dc860', '#c58bff', '#e8a33a', '#3aa8a0'];

export function drawBuilding(B, styleKey = 'village', opts = {}) {
  const def = B.def || {};
  const st = { ...(BSTYLE[styleKey] || BSTYLE.village) };
  const seed = (B.c0 * 31 + B.r0 * 17) & 1023;
  const W = B.w * 16;
  const mk = (r, extra = {}) => finish(r.px, r.em, { windows: r.windows, chimneys: r.chimneys, height: r.wy !== undefined ? (B.rise + 26) : 40, ...extra });
  switch (B.kind) {
    case 'house': case 'bighouse': case 'daycare': {
      const big = B.kind !== 'house';
      const roof = def.roofColor || (B.kind === 'daycare' ? '#6ab84a' : st.roof === 'flat' ? null : st.roof);
      const r = generic(B, st, {
        seed, roofColor: roof, wallH: big ? 30 : 26, chimney: W - 18,
        windows: big ? [[6, B.d * 16 + B.rise - 22, 10, 9, { flowers: !st.modern }], [W - 16, B.d * 16 + B.rise - 22, 10, 9, { flowers: !st.modern }]]
          : [[W - 18, B.d * 16 + B.rise - 20, 10, 9, { flowers: styleKey === 'village' || styleKey === 'port' }]],
      });
      if (B.kind === 'daycare') { const s = signBoard(r.px, 'PENSION', W / 2, B.d * 16 + B.rise - 30 - 2, '#fff8e0', '#3a6a2a', '#4a7a2a'); }
      if (st.stilts) for (let x = 3; x < W; x += 12) { r.px.rect(x, B.d * 16 + B.rise - 3, 2, 3, '#3a2a1a'); }
      return mk(r);
    }
    case 'shop': {
      const r = generic(B, { ...st, wall: st.modern ? 'panel' : 'plaster', wallC: '#f4f6fa' }, {
        seed, roofColor: '#3a72d0', wallH: 28, glass: true, doorW: 12, flat: st.roof === 'flat',
        windows: [[4, B.d * 16 + B.rise - 23, 14, 10, { noCross: true }], [W - 18, B.d * 16 + B.rise - 23, 14, 10, { noCross: true }]],
      });
      // auvent rayé
      const ay = B.d * 16 + B.rise - 28;
      for (let x = 2; x < W - 2; x++) for (let y = 0; y < 4; y++) r.px.set(x, ay + y, (Math.floor(x / 4) % 2) ? '#ffffff' : '#3a72d0');
      for (let x = 2; x < W - 2; x += 4) r.px.set(x + 1, ay + 4, '#2a5aa8');
      signBoard(r.px, def.label || 'BOUTIQUE', W / 2, ay - 11, '#ffffff', '#2a5aa8', '#2a5aa8');
      return mk(r);
    }
    case 'center': {
      const r = generic(B, { ...st, wall: 'plaster', wallC: '#fbf6f4' }, {
        seed, roofColor: '#e04a6a', wallH: 30, glass: true, doorW: 14, doorX: B.door * 16 + 1,
        windows: [[5, B.d * 16 + B.rise - 24, 12, 10, { noCross: true }], [W - 17, B.d * 16 + B.rise - 24, 12, 10, { noCross: true }]],
      });
      // bandeau rose et emblème lumineux
      const by = B.d * 16 + B.rise - 30;
      r.px.rect(1, by, W - 2, 3, '#ff7a98'); r.px.rect(1, by + 3, W - 2, 1, '#c83a5a');
      shardEmblem(r.px, r.em, W / 2, Math.round(r.roofH * 0.5), 7, '#ffe36a');
      signBoard(r.px, 'CENTRE LUMIN', W / 2, by - 12, '#ffffff', '#c83a5a', '#c83a5a');
      return mk(r, { glow: [{ x: W / 2, y: Math.round(r.roofH * 0.5), color: '#ffe36a', r: 18 }] });
    }
    case 'gym': {
      const tcol = TYPES[def.type]?.color || '#ffb547';
      const r = generic(B, { ...st, wall: 'stone', wallC: mixHex(st.wallC, '#d8d2c8', 0.5) }, {
        seed, roofColor: mixHex(tcol, '#3a3a4a', 0.25), wallH: 34, doorW: 14, glass: true,
        windows: [[6, B.d * 16 + B.rise - 26, 10, 12, { noCross: true }], [W - 16, B.d * 16 + B.rise - 26, 10, 12, { noCross: true }]],
      });
      const H = B.d * 16 + B.rise;
      // colonnes
      for (const x of [22, W - 26]) { for (let y = H - 34; y < H - 3; y++) { r.px.set(x, y, '#f0ece4'); r.px.set(x + 1, y, '#d8d2c8'); r.px.set(x + 2, y, '#d8d2c8'); r.px.set(x + 3, y, '#a8a298'); } }
      // grand emblème du type sur le toit
      const ey = Math.round(r.roofH * 0.45);
      r.px.disc(W / 2, ey, 9, shade(tcol, -0.5));
      r.px.disc(W / 2, ey, 7.5, null, (x, y, nx, ny) => { r.px.set(x, y, nx + ny < -0.4 ? shade(tcol, 0.5) : nx + ny < 0.5 ? tcol : shade(tcol, -0.25)); r.em.set(x, y, shade(tcol, 0.2)); });
      r.px.disc(W / 2, ey, 3, '#ffffff'); r.em.disc(W / 2, ey, 3, '#ffffff');
      signBoard(r.px, def.label || 'ARÈNE', W / 2, H - 46, '#2a2a3a', '#ffe48a', shade(tcol, -0.3));
      return mk(r, { glow: [{ x: W / 2, y: ey, color: tcol, r: 22 }] });
    }
    case 'lab': {
      const r = generic(B, { ...st, wall: 'panel', wallC: '#eef2f4' }, {
        seed, flat: true, wallH: 30, doorW: 12, glass: true,
        windows: [[5, B.d * 16 + B.rise - 24, 18, 10, { noCross: true }], [W - 23, B.d * 16 + B.rise - 24, 18, 10, { noCross: true }]],
      });
      // antenne parabolique
      const px = r.px;
      px.disc(W - 22, 10, 7, '#d8dce4'); px.disc(W - 21, 9, 4.5, '#f4f6fa'); px.rect(W - 23, 14, 3, 8, '#8a8e98'); px.set(W - 21, 9, '#5fd4ff');
      r.em.set(W - 21, 9, '#5fd4ff');
      for (let x = 10; x < 40; x += 10) { px.rect(x, 8, 8, 6, '#2a3a6a'); px.rect(x, 8, 8, 1, '#5a7ab8'); }
      signBoard(px, def.label || 'LABO', W / 2, B.d * 16 + B.rise - 40, '#ffffff', '#2a6aa8', '#2a6aa8');
      return mk(r);
    }
    case 'tower': case 'dept': {
      const H = B.d * 16 + B.rise;
      const px = new Px(W, H), em = new Px(W, H);
      const windows = [];
      const wallTop = B.kind === 'tower' ? 16 : 12;
      wallFill(px, 1, wallTop, W - 2, H - wallTop - 2, { ...st, wall: 'panel', wallC: B.kind === 'tower' ? '#c8d4ea' : '#e8ecf4' }, seed);
      flatRoof(px, 0, 0, W, wallTop + 1, '#8a96b0', null);
      for (let y = wallTop + 6; y < H - 26; y += 14) for (let x = 6; x < W - 12; x += 14) windowAt(px, em, windows, x, y, 9, 8, '#3a4a7a', { noCross: true });
      doorAt(px, B.door * 16 + 1, H - 19, 14, 16, '#3a4a7a', { glass: true });
      px.rect(1, H - 3, W - 2, 3, '#8a90a0');
      if (B.kind === 'tower') { px.rect(W / 2 - 2, 0, 4, 6, '#5a6070'); px.disc(W / 2, 2, 2.5, '#ffd23f'); em.disc(W / 2, 2, 2.5, '#ffd23f'); }
      signBoard(px, def.label || (B.kind === 'tower' ? 'TOUR' : 'MAGASIN'), W / 2, H - 34, '#ffffff', '#3a4a8a', '#3a4a8a');
      return finish(px, em, { windows, chimneys: [], height: B.rise + 30, glow: B.kind === 'tower' ? [{ x: W / 2, y: 2, color: '#ffd23f', r: 16 }] : [] });
    }
    case 'lighthouse': {
      const H = B.d * 16 + B.rise;
      const px = new Px(W, H), em = new Px(W, H);
      const cx = W / 2;
      for (let y = 18; y < H - 2; y++) {
        const t = (y - 18) / (H - 20);
        const hw = 8 + t * 7;
        for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
          const u = (x - (cx - hw)) / (2 * hw);
          const band = Math.floor((y - 18) / 12) % 2 === 0;
          const base = band ? '#e8404a' : '#f6f4f0';
          px.set(x, y, u < 0.25 ? shade(base, 0.25) : u > 0.75 ? shade(base, -0.3) : base);
        }
      }
      px.rect(cx - 10, 14, 20, 4, '#3a3a44');
      for (let x = cx - 7; x < cx + 7; x++) for (let y = 4; y < 14; y++) { const glass = (x + y) % 3 !== 0; px.set(x, y, glass ? '#ffe7a0' : '#8a8a90'); if (glass) em.set(x, y, '#fff0b0'); }
      px.rect(cx - 8, 1, 16, 3, '#c83a3a'); px.rect(cx - 2, 0, 4, 1, '#8a2a2a');
      doorAt(px, cx - 5, H - 16, 10, 14, '#5a3a22');
      return finish(px, em, { windows: [], chimneys: [], height: B.rise + 30, glow: [{ x: cx, y: 9, color: '#fff0b0', r: 26 }], beacon: { x: cx, y: 9 } });
    }
    case 'warehouse': case 'powerplant': {
      const H = B.d * 16 + B.rise;
      const r = generic(B, { ...st, wall: 'metal', wallC: B.kind === 'powerplant' ? '#9aa2ae' : '#a8a096' }, { seed, flat: true, wallH: 36, doorW: 24, doorX: B.door * 16 - 4, doorH: 20, windows: [[6, H - 30, 10, 6, { noCross: true }], [W - 16, H - 30, 10, 6, { noCross: true }]] });
      const px = r.px;
      // porte roulante
      for (let y = H - 23; y < H - 3; y++) for (let x = B.door * 16 - 4; x < B.door * 16 + 20; x++) px.set(x, y, (y % 3 === 0) ? '#5a5a60' : '#7a7a82');
      if (B.kind === 'powerplant') {
        for (const x of [8, W - 20]) { px.rect(x, 0, 10, 22, '#7a8290'); px.rect(x, 0, 3, 22, '#9aa2ae'); px.rect(x, 0, 10, 2, '#4a4e58'); r.chimneys.push({ x: x + 5, y: -2 }); }
        for (let x = 30; x < W - 30; x += 6) { px.set(x, 12, '#1a1a1a'); px.set(x + 1, 12, '#ffd23f'); px.set(x + 2, 12, '#ffd23f'); }
        px.disc(W / 2, 14, 6, '#ffd23f'); px.line(W / 2 + 2, 9, W / 2 - 2, 15, '#2a2a2a'); px.line(W / 2 - 2, 15, W / 2 + 2, 15, '#2a2a2a'); px.line(W / 2 + 2, 15, W / 2 - 2, 20, '#2a2a2a');
        r.em.disc(W / 2, 14, 6, '#ffd23f');
      }
      return mk(r, { height: B.rise + 36 });
    }
    case 'temple': case 'league': {
      const H = B.d * 16 + B.rise;
      const px = new Px(W, H), em = new Px(W, H);
      const roofC = B.kind === 'league' ? '#2a3a8a' : '#a89c88';
      const stone = B.kind === 'league' ? '#f0ece2' : '#d4ccbc';
      const wallTop = Math.round(H * 0.42);
      // fronton triangulaire
      for (let y = 4; y < wallTop; y++) {
        const t = (y - 4) / (wallTop - 4);
        const hw = 6 + t * (W / 2 - 6);
        for (let x = Math.round(W / 2 - hw); x < Math.round(W / 2 + hw); x++) {
          const C = R5(roofC);
          let col = (y % 4 === 0) ? C[1] : (x < W / 2 ? C[3] : C[2]);
          px.set(x, y, col);
        }
      }
      px.rect(0, wallTop - 2, W, 4, shade(stone, -0.1)); px.rect(0, wallTop - 2, W, 1, '#ffffff');
      wallFill(px, 1, wallTop + 2, W - 2, H - wallTop - 6, { ...st, wall: 'stone', wallC: stone }, seed);
      // colonnes
      for (let x = 6; x < W - 6; x += 14) for (let y = wallTop + 2; y < H - 5; y++) { px.set(x, y, '#ffffff'); px.set(x + 1, y, stone); px.set(x + 2, y, stone); px.set(x + 3, y, shade(stone, -0.3)); }
      // marches
      for (let k = 0; k < 3; k++) px.rect(0 + k * 2, H - 5 + k, W - k * 4, 1, k % 2 ? shade(stone, -0.2) : stone);
      doorAt(px, B.door * 16 - 1, H - 24, 18, 19, B.kind === 'league' ? '#2a3a7a' : '#5a4630', { arch: true });
      const gold = B.kind === 'league' ? '#ffd23f' : '#ff9ad0';
      px.disc(W / 2, wallTop - 10, 4, gold); em.disc(W / 2, wallTop - 10, 4, gold);
      if (B.kind === 'league') { signBoard(px, 'LIGUE DU ZÉNITH', W / 2, wallTop + 4, '#2a3a7a', '#ffd23f', '#d8a830'); for (const x of [10, W - 14]) { px.rect(x, wallTop + 6, 4, 14, '#c83a3a'); px.rect(x, wallTop + 6, 4, 1, '#ffd23f'); } }
      return finish(px, em, { windows: [], chimneys: [], height: B.rise + 30, glow: [{ x: W / 2, y: wallTop - 10, color: gold, r: 20 }] });
    }
    case 'cave': {
      const H = B.d * 16 + B.rise;
      const px = new Px(W, H);
      const C = ['#2e2420', '#4a3c32', '#66564a', '#82705e', '#9c8a74'];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const t = y / H;
        const edge = Math.min(x, W - 1 - x);
        if (y < 6 - Math.min(6, edge * 0.8)) continue;
        let k = t < 0.2 ? 4 : t < 0.5 ? 3 : 2;
        if ((y + Math.floor(hash2(x >> 2, 1, seed) * 5)) % 6 === 0) k--;
        if (hash2(x, y, seed) < 0.08) k = Math.max(0, k - 1);
        px.set(x, y, C[Math.max(0, k)]);
      }
      // ouverture
      const ox = B.door * 16 - 2, ow = 20, oh = 22;
      for (let y = H - oh; y < H; y++) for (let x = ox; x < ox + ow; x++) {
        const nx = (x - ox - ow / 2 + 0.5) / (ow / 2), ny = (y - (H - oh + oh * 0.55)) / (oh * 0.55);
        if (ny < 0 && nx * nx + ny * ny > 1) continue;
        px.set(x, y, y > H - 4 ? '#0a0706' : '#000000');
      }
      return finish(px, null, { windows: [], chimneys: [], height: B.rise + 20 });
    }
    case 'hideout': {
      // moulin : tour de pierre, toit conique, ailes animées à part
      const H = B.d * 16 + B.rise;
      const px = new Px(W, H), em = new Px(W, H);
      const windows = [];
      const cx = W / 2;
      for (let y = 26; y < H - 2; y++) {
        const hw = 14 + ((y - 26) / (H - 28)) * 4;
        for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) {
          const u = (x - (cx - hw)) / (2 * hw);
          const row = Math.floor(y / 5);
          let col = (y % 5 === 0 || (x + row * 4) % 8 === 0) ? '#6a6256' : u < 0.3 ? '#c8c0b0' : u > 0.75 ? '#8a8274' : '#aaa292';
          px.set(x, y, col);
        }
      }
      for (let y = 6; y < 28; y++) { const hw = (y - 6) / 22 * 17; for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) px.set(x, y, x < cx ? '#7a4a32' : '#5a3424'); }
      doorAt(px, cx - 6, H - 17, 12, 15, '#4a3020');
      windowAt(px, em, windows, cx - 4, 36, 8, 7, '#4a3020', { noCross: true });
      return finish(px, em, { windows, chimneys: [], height: B.rise + 30, mill: { x: cx, y: 24 } });
    }
    default: {
      const r = generic(B, st, { seed, wallH: 26, windows: [[W - 18, B.d * 16 + B.rise - 20, 10, 9]] });
      return mk(r);
    }
  }
}

/** Ailes de moulin (4 images). */
export function millBlades(frame) {
  const px = new Px(48, 48);
  const a0 = (frame / 4) * (Math.PI / 2);
  for (let k = 0; k < 4; k++) {
    const a = a0 + (k * Math.PI) / 2;
    for (let s = 3; s < 22; s++) {
      const x = 24 + Math.cos(a) * s, y = 24 + Math.sin(a) * s;
      px.set(Math.round(x), Math.round(y), '#5a3a22');
      if (s > 6) for (let w = 1; w <= 4; w++) px.set(Math.round(x - Math.sin(a) * w), Math.round(y + Math.cos(a) * w), w === 4 ? '#8a8070' : (s + w) % 3 ? '#f0e8d8' : '#c8c0b0');
    }
  }
  px.disc(24, 24, 2.5, '#3a2418');
  px.outline(null, { k: 0.7 });
  return px.toCanvas();
}

/** Ferry (bateau à quai). */
export function boatSprite(horiz) {
  const W = horiz ? 128 : 48, H = horiz ? 56 : 128;
  const px = new Px(W, H);
  if (horiz) {
    px.poly([[6, 30], [122, 30], [112, 52], [16, 52]], '#f4f4f0');
    px.rect(16, 46, 96, 6, '#2a4a8a'); px.rect(6, 30, 116, 3, '#c83a3a');
    px.rect(30, 12, 60, 18, '#e8e8e4'); px.rect(30, 12, 60, 3, '#2a4a8a');
    for (let x = 34; x < 86; x += 10) px.rect(x, 18, 6, 5, '#7ab8e0');
    px.rect(70, 0, 10, 12, '#c83a3a'); px.rect(70, 0, 10, 3, '#2a2a2a');
  } else {
    px.poly([[24, 4], [42, 20], [42, 118], [6, 118], [6, 20]], '#f4f4f0');
    px.rect(6, 112, 36, 6, '#2a4a8a');
    px.rect(12, 40, 24, 40, '#e8e8e4'); for (let y = 46; y < 76; y += 10) px.rect(16, y, 16, 5, '#7ab8e0');
    px.rect(19, 26, 10, 12, '#c83a3a');
  }
  px.outline(null, { k: 0.7 });
  return { canvas: px.toCanvas(), shadow: px.silhouette(), w: W, h: H };
}

export { COLORS_ROOF };
