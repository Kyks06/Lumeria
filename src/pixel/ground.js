import { hash2, valueNoise, bayer, hexToRgb, shade } from './color.js';
import { canvas, ctx2d } from './Px.js';
import { GROUND, F } from '../world2d/tiles.js';

/**
 * PEINTRE DE SOL : textures continues (herbe, sable, neige, cendre, boue, grotte, gravier),
 * chemins (terre, pavés, marbre, planches…), eau avec rivages et profondeurs, lave,
 * bords de carte (falaises, parois de grotte, sous-bois) avec raccords arrondis au pixel.
 * Les raccords utilisent le voisinage 3×3 de chaque tuile (équivalent des 47 tuiles « blob »).
 */
export const GRASS = {
  prairie: { base: '#7cc456', dark: '#63ab43', light: '#96d668', tuft: '#4c9234', hi: '#b6e67c', under: '#4e9638' },
  ville: { base: '#7cc456', dark: '#63ab43', light: '#96d668', tuft: '#4c9234', hi: '#b6e67c', under: '#4e9638' },
  foret: { base: '#5aa543', dark: '#468c35', light: '#71bb52', tuft: '#36762a', hi: '#93d26a', under: '#3a7c2e' },
  marais: { base: '#77924e', dark: '#5f7a3c', light: '#8ca85e', tuft: '#4c6630', hi: '#a6c072', under: '#526e36' },
  montagne: { base: '#86b257', dark: '#6c9844', light: '#a0c66c', tuft: '#567f39', hi: '#bcd786', under: '#5c883e' },
  celeste: { base: '#94d388', dark: '#78bb72', light: '#b0e3a2', tuft: '#5ea35f', hi: '#d2f4c2', under: '#68ac66' },
  cote: { base: '#84c85a', dark: '#68ae46', light: '#9ed86e', tuft: '#4e9436', hi: '#bce882', under: '#559a3e' },
  desert: { base: '#c2bc72', dark: '#a8a25e', light: '#d4ce88', tuft: '#8e8a4c', hi: '#e2dca0', under: '#9a944e' },
  neige: { base: '#a8c8b4', dark: '#8eb09c', light: '#c0dac8', tuft: '#7a9c88', hi: '#dcecdf', under: '#86a892' },
  volcan: { base: '#6e7a4e', dark: '#5a643e', light: '#828e5c', tuft: '#4a5232', hi: '#9aa672', under: '#535c38' },
  grotte: { base: '#6a6a4e', dark: '#585840', light: '#7c7c5c', tuft: '#48483a', hi: '#909070', under: '#505040' },
};
export const MATS = {
  sand: { base: '#ecd8a0', dark: '#d9be82', light: '#f6e9c0', speck: '#c8a468', hi: '#fff6dc' },
  snow: { base: '#eef4fb', dark: '#d6e2ef', light: '#ffffff', speck: '#b9c9dc', hi: '#ffffff' },
  ash: { base: '#5e544e', dark: '#4b433f', light: '#706660', speck: '#867a70', hi: '#cf5f2c' },
  mud: { base: '#6e5c42', dark: '#594933', light: '#816e50', speck: '#4a5a44', hi: '#93805e' },
  cave: { base: '#7a6c5c', dark: '#63574a', light: '#8c7e6a', speck: '#54483e', hi: '#a09078' },
  gravel: { base: '#a29a8a', dark: '#857e70', light: '#bab2a2', speck: '#6e685c', hi: '#d0c8b8' },
};
export const PATHS = {
  dirt: { base: '#dcbd82', dark: '#c6a167', light: '#ead4a2', speck: '#a8885a', edge: '#b38f5d' },
  sandpath: { base: '#e6cd92', dark: '#d1b274', light: '#f3e2b4', speck: '#b89a62', edge: '#c4a46c' },
  snowpath: { base: '#d6e1ee', dark: '#bccbdc', light: '#e8f0f8', speck: '#a4b4c8', edge: '#aebdd0' },
  ashpath: { base: '#85796f', dark: '#6e645c', light: '#988c80', speck: '#5a524c', edge: '#5c524c' },
  mudpath: { base: '#8c7656', dark: '#755f44', light: '#9e8864', speck: '#5e4c36', edge: '#604c36' },
  cavepath: { base: '#968670', dark: '#80725e', light: '#a8987e', speck: '#6c604e', edge: '#6a5e4c' },
  cobble: { stone: ['#cfc6b4', '#c3b9a5', '#d9d2c2'], grout: '#8e8676', hi: '#ece6d8', sh: '#a89f8d', edge: '#8a8272' },
  snowcobble: { stone: ['#dfe6ef', '#d2dbe7', '#e8eef5'], grout: '#98a6ba', hi: '#ffffff', sh: '#b6c2d2', edge: '#8e9cb0' },
  darkcobble: { stone: ['#6f645c', '#655a53', '#7a6f66'], grout: '#3e3632', hi: '#8e8278', sh: '#564c46', edge: '#3a322e' },
  adobe: { stone: ['#e2c58e', '#d8b980', '#ebd19e'], grout: '#b08c5a', hi: '#f6e2b6', sh: '#c8a670', edge: '#a8844e' },
  marble: { stone: ['#e6eaf5', '#dbe0ee', '#f0f3fa'], grout: '#a9b1cb', hi: '#ffffff', sh: '#c4cade', edge: '#9aa2c0' },
  boardwalk: { plank: ['#a8805a', '#9a744f', '#b48c64'], gap: '#5a4030', hi: '#c8a47c', edge: '#4a3426' },
};
export const WATER = {
  normal: { deep: '#2a5fb2', mid: '#3a7ed0', shallow: '#5aa2e6', light: '#8ac6f4', foam: '#dcf4ff', wet: '#4a8a5c' },
  murky: { deep: '#2a4636', mid: '#365a44', shallow: '#4a7456', light: '#6a9472', foam: '#b8d4b4', wet: '#3c5a34' },
  cave: { deep: '#163e6a', mid: '#1f5486', shallow: '#2e6ea4', light: '#4e92c4', foam: '#a8d8f0', wet: '#3a342c' },
  lava: { deep: '#9a1e0a', mid: '#d0461a', shallow: '#f06a22', light: '#ffa03a', foam: '#ffe07a', wet: '#2a1a14' },
};
export const CLIFF = {
  mountain: { face: ['#3e3a40', '#5a5560', '#78727c', '#958e96', '#b4aeb4'], top: ['#6e8a4a', '#86a25a', '#9ab86c'], rim: '#c4d48e', base: '#262228' },
  cliff: { face: ['#5a4434', '#7a5e46', '#98785a', '#b4946e', '#d0b28a'], top: null, rim: null, base: '#2e2018' },
  cave: { face: ['#3a2e26', '#52423a', '#6a584c', '#827060', '#9a8874'], top: ['#1a1412', '#221a16', '#2a211c'], rim: '#5a4a3e', base: '#140e0c' },
  snow: { face: ['#4e5a72', '#6a7a94', '#8a9cb4', '#b0c2d6', '#dce8f4'], top: ['#e4ecf6', '#f0f5fb', '#ffffff'], rim: '#ffffff', base: '#2a3248' },
  volcan: { face: ['#241c1a', '#362a26', '#4a3a34', '#5e4c44', '#76625a'], top: ['#3a302c', '#463a34', '#52443c'], rim: '#8a5a3a', base: '#120c0a' },
  desert: { face: ['#6a4428', '#8e5e38', '#b07c4c', '#cc9a62', '#e4ba80'], top: ['#d4b278', '#dec088', '#e8cc98'], rim: '#f4dcae', base: '#3a2414' },
  celeste: { face: ['#56607a', '#727e9a', '#929eb8', '#b4bed2', '#d8e0ee'], top: ['#a2d896', '#b4e4a4', '#c6eeb6'], rim: '#e4f8d4', base: '#2e3446' },
};

const rgbCache = new Map();
function rgb(hex) { let v = rgbCache.get(hex); if (!v) { v = hexToRgb(hex); rgbCache.set(hex, v); } return v; }

/* ═════════ Texels (couleur d'un pixel du monde pour une matière) ═════════ */
function grassTexel(G, x, y, seed, tallUnder) {
  if (tallUnder) {
    const v = hash2(x, y, seed + 9);
    return v < 0.2 ? G.tuft : v < 0.6 ? G.under : G.dark;
  }
  const n = valueNoise(x / 26, y / 26, seed) * 0.7 + valueNoise(x / 9, y / 9, seed + 1) * 0.3;
  const b = bayer(x, y) - 0.5;
  let col = G.base;
  if (n + b * 0.14 > 0.64) col = G.light;
  else if (n + b * 0.14 < 0.3) col = G.dark;
  // hachures diagonales dans les zones claires
  if (col === G.light && (x + y) % 4 === 0 && hash2(x >> 2, y >> 2, seed) < 0.5) col = G.base;
  // touffes en V
  const cx = x >> 3, cy = y >> 3;
  if (hash2(cx, cy, seed + 2) < 0.42) {
    const tx = (cx << 3) + 1 + Math.floor(hash2(cx, cy, seed + 3) * 5), ty = (cy << 3) + 2 + Math.floor(hash2(cx, cy, seed + 4) * 4);
    const dx = x - tx, dy = y - ty;
    if ((dy === 0 && (dx === 0 || dx === 2)) || (dy === 1 && dx === 1)) col = G.tuft;
    else if (dy === -1 && dx === 1 && hash2(cx, cy, seed + 5) < 0.6) col = G.hi;
  }
  const s = hash2(x, y, seed + 6);
  if (s < 0.012) col = G.hi; else if (s < 0.024) col = G.tuft;
  return col;
}

function matTexel(name, M, x, y, seed) {
  const n = valueNoise(x / 14, y / 14, seed);
  const b = bayer(x, y) - 0.5;
  let col = M.base;
  if (n + b * 0.12 > 0.66) col = M.light; else if (n + b * 0.12 < 0.32) col = M.dark;
  const s = hash2(x, y, seed + 7);
  if (name === 'sand') {
    if (((y + Math.round(Math.sin(x / 7 + seed) * 2.2)) % 12 === 0) && n > 0.42) col = M.dark;
    if (s < 0.03) col = M.speck; else if (s < 0.045) col = M.hi;
  } else if (name === 'snow') {
    if (s < 0.008) col = M.speck; else if (s < 0.02 && n > 0.5) col = M.hi;
    if (n < 0.25 && (x + y * 2) % 5 === 0) col = M.speck;
  } else if (name === 'ash') {
    if (s < 0.04) col = M.speck; else if (s < 0.043) col = M.hi;
  } else if (name === 'mud') {
    if (valueNoise(x / 6, y / 6, seed + 3) > 0.78) col = M.speck;
    if (s < 0.03) col = M.dark;
  } else if (name === 'cave' || name === 'gravel') {
    const cx = x >> 2, cy = y >> 2;
    if (hash2(cx, cy, seed + 8) < 0.16 && (x & 3) < 2 && (y & 3) === 1) col = M.speck;
    if (hash2(cx, cy, seed + 8) < 0.16 && (x & 3) < 2 && (y & 3) === 0) col = M.hi;
    if (s < 0.025) col = M.dark;
  }
  return col;
}

function pathTexel(name, P, x, y, seed) {
  if (P.stone) {
    // pavés en quinconce, taille irrégulière
    const rowH = name === 'marble' ? 8 : 6;
    const row = Math.floor(y / rowH), ly = y - row * rowH;
    const off = (row % 2) * (name === 'marble' ? 8 : 4) + Math.floor(hash2(row, 0, seed) * 3);
    const cw = name === 'marble' ? 16 : 8;
    const col = Math.floor((x + off) / cw), lx = x + off - col * cw;
    if (lx === 0 || ly === 0) return P.grout;
    const v = hash2(col, row, seed);
    if (lx === 1 || ly === 1) return P.hi;
    if (lx === cw - 1 || ly === rowH - 1) return P.sh;
    const base = P.stone[Math.floor(v * 3) % 3];
    if (hash2(x, y, seed + 1) < 0.05) return P.sh;
    return base;
  }
  if (P.plank) {
    const row = Math.floor(y / 5), ly = y - row * 5;
    const off = Math.floor(hash2(row, 1, seed) * 16);
    const seg = Math.floor((x + off) / 24), lx = (x + off) % 24;
    if (ly === 4) return P.gap;
    if (lx === 0) return P.gap;
    if (ly === 0) return P.hi;
    const base = P.plank[Math.floor(hash2(seg, row, seed) * 3)];
    if ((x + row * 7) % 9 === 0 && hash2(x, y, seed) < 0.5) return P.gap;
    return base;
  }
  const n = valueNoise(x / 11, y / 11, seed + 5);
  const b = bayer(x, y) - 0.5;
  let col = P.base;
  if (n + b * 0.12 > 0.68) col = P.light; else if (n + b * 0.12 < 0.3) col = P.dark;
  // cailloux
  const cx = x >> 3, cy = y >> 3;
  if (hash2(cx, cy, seed + 11) < 0.3) {
    const tx = (cx << 3) + 1 + Math.floor(hash2(cx, cy, seed + 12) * 5), ty = (cy << 3) + 1 + Math.floor(hash2(cx, cy, seed + 13) * 5);
    if (y === ty && (x === tx || x === tx + 1)) col = P.light;
    if (y === ty + 1 && (x === tx || x === tx + 1)) col = P.speck;
  }
  if (hash2(x, y, seed + 14) < 0.03) col = P.speck;
  return col;
}

/* ═════════ Champs lissés (raccords arrondis) ═════════ */
function makeField(L, test) {
  const { cols, rows } = L;
  const occ = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) occ[r * cols + c] = test(c, r) ? 1 : 0;
  const at = (c, r) => occ[Math.max(0, Math.min(rows - 1, r)) * cols + Math.max(0, Math.min(cols - 1, c))];
  return (px, py) => {
    const tx = px / 16 - 0.5, ty = py / 16 - 0.5;
    const i = Math.floor(tx), j = Math.floor(ty);
    let fx = tx - i, fy = ty - j;
    fx = fx * fx * fx * (fx * (fx * 6 - 15) + 10); fy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

const C_BASE = 0, C_SAND = 1, C_PATH = 2, C_BORDER = 3, C_WATER = 4, C_LAVA = 5;

/**
 * Peint un morceau de carte (tuiles c0..c0+cw-1, r0..r0+rh-1) :
 * { ground (opaque), water (masque de l'eau, alpha), lava (masque) }
 */
export function paintChunk(L, fields, c0, r0, cw, rh) {
  const W = cw * 16, H = rh * 16;
  const img = new ImageData(W, H);
  const wimg = new ImageData(W, H);
  const limg = fields.lava ? new ImageData(W, H) : null;
  const d = img.data, wd = wimg.data;
  const seed = (L.def.seed || 1) * 13;
  const biomeKey = L.biomeKey;
  const G = GRASS[biomeKey] || GRASS.prairie;
  const P = PATHS[L.pathMat] || PATHS.dirt;
  const Wt = L.biome.murky ? WATER.murky : L.kind === 'cave' ? WATER.cave : WATER.normal;
  const LV = WATER.lava;
  const style = L.borderStyle;
  const cliffKey = style === 'cave' ? 'cave' : L.biome.snow ? 'snow' : L.biome.lava ? 'volcan' : L.biome.dunes ? 'desert' : biomeKey === 'celeste' ? 'celeste' : style === 'cliff' ? 'cliff' : 'mountain';
  const CL = CLIFF[cliffKey];
  const FACE = style === 'cave' ? 26 : 22;
  const matName = (g) => (g === GROUND.SAND ? 'sand' : g === GROUND.SNOW ? 'snow' : g === GROUND.ASH ? 'ash' : g === GROUND.MUD ? 'mud' : g === GROUND.CAVE ? 'cave' : g === GROUND.GRAVEL ? 'gravel' : null);
  const noiseAt = (x, y) => (valueNoise(x / 3.1, y / 3.1, seed + 17) - 0.5) * 0.36;

  const TR = L.terrain;
  const cave = L.kind === 'cave';
  let segs = null;
  const classify = (x, y) => {
    const n = noiseAt(x, y);
    if (cave && fields.border(x, y) > 0.5 + n * 0.5) return C_BORDER;
    if (TR) {
      const xm = L.ox + ((x + 0.5) / 16) * L.T, zm = L.oz + ((y + 0.5) / 16) * L.T;
      if (fields.lava && TR.isLava(xm, zm)) return C_LAVA;
      if (fields.water && TR.waterDepth(xm, zm) > 0) return C_WATER;
      if (!cave && style !== 'forest' && style !== 'sea' && fields.border(x, y) > 0.5 + n * 0.5) return C_BORDER;
      if (TR.isPath(xm, zm, segs) || (fields.carve && fields.carve(x, y) > 0.5 + n)) return C_PATH;
    } else {
      if (fields.lava && fields.lava(x, y) > 0.5 + n * 0.8) return C_LAVA;
      if (fields.water(x, y) > 0.5 + n * 0.8) return C_WATER;
      if (style !== 'forest' && style !== 'sea' && fields.border(x, y) > 0.5 + n * 0.5) return C_BORDER;
      if (fields.path(x, y) > 0.5 + n) return C_PATH;
    }
    if (fields.sand && fields.sand(x, y) > 0.5 + n) return C_SAND;
    return C_BASE;
  };
  const deepAt = (x, y) => {
    if (!TR) return fields.deep(x, y);
    const xm = L.ox + ((x + 0.5) / 16) * L.T, zm = L.oz + ((y + 0.5) / 16) * L.T;
    return (TR.waterDepth(xm, zm) - 2.2) / 2.5;
  };
  const put = (buf, i, hex) => { const v = rgb(hex); buf[i] = v[0]; buf[i + 1] = v[1]; buf[i + 2] = v[2]; buf[i + 3] = 255; };

  for (let tr = 0; tr < rh; tr++) for (let tc = 0; tc < cw; tc++) {
    const c = c0 + tc, r = r0 + tr;
    const g = L.ground.get(c, r);
    const mname = matName(g);
    const tallUnder = L.tall.get(c, r) === 1;
    const forestFloor = style === 'forest' && L.border.get(c, r);
    // tuile uniforme ? (aucun raccord dans le voisinage)
    const key = (cc, rr) => (L.water.get(cc, rr) ? 1 : 0) | (L.path.get(cc, rr) ? 2 : 0) | (L.border.get(cc, rr) ? 4 : 0) | (L.sand.get(cc, rr) ? 8 : 0) | ((L.flags.get(cc, rr) & F.LAVA) ? 16 : 0);
    const k0 = key(c, r);
    let uniform = true;
    for (let dr = -2; dr <= 2 && uniform; dr++) for (let dc = -2; dc <= 2; dc++) if (key(c + dc, r + dr) !== k0) { uniform = false; break; }
    if (TR && !uniform) segs = TR.segmentsNear(L.ox + c * L.T, L.oz + r * L.T, L.ox + (c + 1) * L.T, L.oz + (r + 1) * L.T, 8);
    // falaises : la face peut déborder sur la tuile au-dessus
    if (uniform && (k0 & 4) && style !== 'forest' && (!L.border.get(c, r + 1) || !L.border.get(c, r + 2))) uniform = false;
    for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
      const x = c * 16 + px, y = r * 16 + py;
      const i = ((tr * 16 + py) * W + tc * 16 + px) * 4;
      const cls = uniform ? (k0 & 16 ? C_LAVA : k0 & 1 ? C_WATER : (k0 & 4) && style !== 'forest' && style !== 'sea' ? C_BORDER : k0 & 2 ? C_PATH : k0 & 8 ? C_SAND : C_BASE) : classify(x, y);
      let col;
      if (cls === C_WATER || cls === C_LAVA) {
        const T = cls === C_LAVA ? LV : Wt;
        const f = cls === C_LAVA ? fields.lava(x, y) : fields.water(x, y);
        const deep = cls === C_LAVA ? 0 : deepAt(x, y);
        const b = bayer(x, y) - 0.5;
        col = deep + b * 0.35 > 0.5 ? T.deep : deep + b * 0.35 > -0.2 ? T.mid : T.shallow;
        // écume et bord
        if (!uniform) {
          let edge = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = classify(x + dx, y + dy); if (k !== C_WATER && k !== C_LAVA) { edge = true; break; } }
          if (edge) col = T.foam;
          else {
            let near = false;
            for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1]]) { const k = classify(x + dx, y + dy); if (k !== C_WATER && k !== C_LAVA) { near = true; break; } }
            if (near) col = T.light;
          }
        }
        put(d, i, col);
        if (cls === C_WATER) { wd[i] = wd[i + 1] = wd[i + 2] = 255; wd[i + 3] = 255; }
        else { limg.data[i] = limg.data[i + 1] = limg.data[i + 2] = 255; limg.data[i + 3] = 255; }
        continue;
      }
      if (cls === C_BORDER) {
        // distance au bas de la zone de bord (face de falaise)
        let fromBottom = FACE + 1;
        if (!uniform) {
          let k = 0;
          while (k < FACE + 1 && (classify(x, y + k + 1) === C_BORDER)) k++;
          fromBottom = k + 1; // 1 = dernier pixel du bord
        }
        if (fromBottom <= FACE) {
          const t = fromBottom / FACE; // 0 en bas, 1 en haut
          const crack = hash2(x >> 1, 3, seed) < 0.18 && hash2(x, y >> 2, seed) < 0.8;
          const ledge = (y + (hash2(x >> 3, 1, seed) * 6 | 0)) % 7 === 0;
          let tn = t > 0.85 ? 4 : t > 0.6 ? 3 : t > 0.3 ? 2 : 1;
          if (fromBottom <= 2) tn = 0;
          if (crack && tn > 0) tn--;
          if (ledge && tn < 4 && t < 0.85) tn = Math.min(4, tn + 1);
          if (x % 5 === 0 && hash2(x, y >> 1, seed + 4) < 0.5 && tn > 0) tn--;
          col = CL.face[tn];
          if (fromBottom === FACE && CL.rim) col = CL.rim;
          // bords latéraux de la face
          if (!uniform) {
            const l = classify(x - 1, y) !== C_BORDER, rr = classify(x + 1, y) !== C_BORDER;
            if (l) col = CL.face[3]; if (rr) col = CL.base;
          }
        } else {
          // plateau
          if (CL.top) {
            const v = valueNoise(x / 8, y / 8, seed + 30) + (bayer(x, y) - 0.5) * 0.16;
            col = CL.top[v > 0.62 ? 2 : v > 0.36 ? 1 : 0];
          } else col = grassTexel(G, x, y, seed, false);
          if (!uniform) {
            let edge = false;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) if (classify(x + dx, y + dy) !== C_BORDER) edge = true;
            if (edge) col = CL.rim || shade(col, 0.4);
            else {
              for (const [dx, dy] of [[2, 0], [-2, 0], [0, -2]]) if (classify(x + dx, y + dy) !== C_BORDER) edge = true;
              if (edge) col = CL.face[1];
            }
          }
        }
        put(d, i, col);
        continue;
      }
      if (cls === C_PATH) {
        col = pathTexel(L.pathMat, P, x, y, seed);
        if (!uniform) {
          let e1 = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (classify(x + dx, y + dy) !== C_PATH) { e1 = true; break; } }
          if (e1) col = P.edge;
        }
      } else if (cls === C_SAND) {
        col = matTexel('sand', MATS.sand, x, y, seed);
      } else {
        col = mname ? matTexel(mname, MATS[mname], x, y, seed) : grassTexel(G, x, y, seed, tallUnder);
        if (forestFloor) col = shade(col, -0.32);
        // herbe qui déborde sur le chemin (ombre au bord)
        if (!uniform && !mname) {
          let nearPath = false;
          for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) if (classify(x + dx, y + dy) === C_PATH) nearPath = true;
          if (nearPath && hash2(x, y, seed) < 0.55) col = G.tuft;
        }
      }
      // rives : bande humide côté terre
      if (!uniform) {
        let wet = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = classify(x + dx, y + dy); if (kk === C_WATER) { wet = true; break; } }
        if (wet) col = cls === C_SAND ? MATS.sand.dark : Wt.wet;
        // ombre portée au pied des falaises
        if (style !== 'forest' && cls !== C_BORDER) {
          if (classify(x, y - 1) === C_BORDER || classify(x, y - 2) === C_BORDER) col = shade(col, -0.35);
        }
      }
      put(d, i, col);
    }
  }
  const out = { ground: canvas(W, H), water: null, lava: null };
  out.ground.getContext('2d').putImageData(img, 0, 0);
  let hasWater = false;
  for (let i = 3; i < wd.length; i += 64) if (wd[i]) { hasWater = true; break; }
  if (hasWater) { out.water = canvas(W, H); out.water.getContext('2d').putImageData(wimg, 0, 0); }
  if (limg) { out.lava = canvas(W, H); out.lava.getContext('2d').putImageData(limg, 0, 0); }
  return out;
}

/** Prépare les champs lissés d'une carte. */
export function groundFields(L) {
  const f = {
    water: makeField(L, (c, r) => L.water.get(c, r) > 0),
    deep: makeField(L, (c, r) => L.water.get(c, r) > 1),
    path: makeField(L, (c, r) => L.path.get(c, r) === 1),
    carve: L.carve ? makeField(L, (c, r) => L.carve.get(c, r) === 1) : null,
    border: makeField(L, (c, r) => L.border.get(c, r) === 1),
    sand: null,
    lava: null,
  };
  let sand = false, lava = false;
  for (let i = 0; i < L.sand.a.length; i++) { if (L.sand.a[i]) sand = true; if (L.flags.a[i] & F.LAVA) lava = true; }
  if (sand) f.sand = makeField(L, (c, r) => L.sand.get(c, r) === 1);
  if (lava) f.lava = makeField(L, (c, r) => (L.flags.get(c, r) & F.LAVA) !== 0);
  return f;
}

/* ═════════ Animations d'eau et de lave (motifs raccordables 64×64) ═════════ */
export function waterFrames(kind = 'normal', n = 8) {
  const T = WATER[kind] || WATER.normal;
  if (kind !== 'lava') return waveFrames(T, n);
  const frames = [];
  const TAU = Math.PI * 2;
  for (let f = 0; f < n; f++) {
    const c = canvas(64, 64);
    const x2 = ctx2d(c);
    const img = x2.createImageData(64, 64);
    const ph = (f / n) * TAU;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = Math.sin((x / 64) * TAU * 2 + (y / 64) * TAU + ph) + Math.sin((x / 64) * TAU * 3 - (y / 64) * TAU * 2 - ph * 2) * 0.7 + Math.sin((y / 64) * TAU * 4 + ph) * 0.4;
      const i = (y * 64 + x) * 4;
      let col = null;
      if (v > 1.55) col = kind === 'lava' ? T.foam : T.foam;
      else if (v > 1.2) col = T.light;
      if (kind === 'lava' && v < -1.6) col = T.deep;
      if (col) { const q = rgb(col); img.data[i] = q[0]; img.data[i + 1] = q[1]; img.data[i + 2] = q[2]; img.data[i + 3] = kind === 'lava' ? 255 : (v > 1.55 ? 230 : 140); }
    }
    x2.putImageData(img, 0, 0);
    frames.push(c);
  }
  return frames;
}

/**
 * Eau façon GBA : petits traits de houle qui ondulent et s'estompent, éclats de soleil ponctuels
 * (étoiles de 1 px qui scintillent). Motif 64 × 64 raccordable.
 */
function waveFrames(T, n) {
  const TAU = Math.PI * 2;
  const H = (i, k) => { let x = (i * 374761393 + k * 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const light = rgb(T.light), foam = rgb(T.foam);
  const frames = [];
  for (let f = 0; f < n; f++) {
    const c = canvas(64, 64);
    const x2 = ctx2d(c);
    const img = x2.createImageData(64, 64);
    const put = (x, y, q, a) => { const i = ((((y % 64) + 64) % 64) * 64 + (((x % 64) + 64) % 64)) * 4; if (img.data[i + 3] >= a) return; img.data[i] = q[0]; img.data[i + 1] = q[1]; img.data[i + 2] = q[2]; img.data[i + 3] = a; };
    const ph = (f / n) * TAU;
    // traits de houle
    for (let i = 0; i < 26; i++) {
      const x0 = Math.floor(H(i, 1) * 64), y0 = Math.floor(H(i, 2) * 64), len = 3 + Math.floor(H(i, 3) * 6), p0 = H(i, 4) * TAU;
      const k = 0.5 + 0.5 * Math.sin(ph + p0);
      if (k < 0.3) continue;
      const dx = Math.round(Math.sin(ph * 2 + p0) * 1.5);
      const L = Math.max(2, Math.round(len * (0.55 + k * 0.45)));
      for (let j = 0; j < L; j++) put(x0 + dx + j, y0, j === 0 || j === L - 1 ? light : (k > 0.85 && j === (L >> 1) ? foam : light), j === 0 || j === L - 1 ? 90 : 120 + Math.round(k * 90));
    }
    // éclats de soleil
    for (let i = 0; i < 5; i++) {
      const x0 = Math.floor(H(i + 50, 1) * 64), y0 = Math.floor(H(i + 50, 2) * 64);
      const on = (f + Math.floor(H(i + 50, 3) * n)) % n;
      if (on > 1) continue;
      put(x0, y0, foam, 255);
      if (on === 0) { put(x0 - 1, y0, light, 200); put(x0 + 1, y0, light, 200); put(x0, y0 - 1, light, 200); put(x0, y0 + 1, light, 200); }
    }
    x2.putImageData(img, 0, 0);
    frames.push(c);
  }
  return frames;
}
