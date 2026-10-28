/**
 * COULEURS POUR LE PIXEL ART : conversions, mélanges, rampes avec décalage de teinte
 * (ombres plus froides, lumières plus chaudes, comme le font les pixel artistes).
 */
const cache = new Map();

export function hexToRgb(hex) {
  if (Array.isArray(hex)) return hex;
  let c = cache.get(hex);
  if (c) return c;
  let s = String(hex).replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  const n = parseInt(s.slice(0, 6), 16);
  c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  cache.set(hex, c);
  return c;
}

export function rgbToHex([r, g, b]) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}

export function hslToRgb([h, s, l]) {
  h = (((h % 360) + 360) % 360) / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
}
export const mixHex = (a, b, t) => rgbToHex(mix(a, b, t));

/**
 * Variante plus claire (k > 0) ou plus sombre (k < 0) avec décalage de teinte :
 * vers le jaune en lumière, vers le bleu-violet en ombre.
 */
export function shade(hex, k) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const target = k > 0 ? 55 : 245; // jaune chaud / bleu froid
  let dh = ((target - h + 540) % 360) - 180;
  const amount = Math.min(1, Math.abs(k));
  const nh = h + dh * amount * 0.22;
  const ns = Math.max(0, Math.min(1, s * (k > 0 ? 1 - amount * 0.25 : 1 + amount * 0.15)));
  const nl = Math.max(0, Math.min(1, k > 0 ? l + (1 - l) * amount * 0.75 : l * (1 - amount * 0.72)));
  return rgbToHex(hslToRgb([nh, ns, nl]));
}

/** Rampe de n tons du plus sombre au plus clair, le ton de base au milieu (index `mid`). */
export function ramp(hex, n = 5, spread = 0.62) {
  const out = [];
  const mid = Math.floor((n - 1) / 2) + (n % 2 === 0 ? 0 : 0);
  for (let i = 0; i < n; i++) {
    const t = (i - mid) / Math.max(1, mid);
    out.push(i === mid ? (typeof hex === 'string' ? hex : rgbToHex(hex)) : shade(hex, t * spread));
  }
  return out;
}

/** Couleur de contour : très sombre et un peu désaturée, issue de la couleur voisine. */
export function outlineOf(hex, k = 0.78) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h + ((245 - h + 540) % 360 - 180) * 0.18, Math.min(1, s * 0.85 + 0.08), Math.max(0.04, l * (1 - k))]));
}

export const luminance = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/** Couleur du type de RGBA packé utilisé par Px. */
export function rgba(hex, a = 255) {
  const [r, g, b] = hexToRgb(hex);
  return [r | 0, g | 0, b | 0, a];
}

/** Matrice de Bayer 4×4 normalisée (tramage ordonné). */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

/** Bruit de valeur déterministe (rapide) pour les textures. */
export function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbmNoise(x, y, seed = 0, oct = 3) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += valueNoise(x * f, y * f, seed + i * 17) * a; n += a; a *= 0.5; f *= 2; }
  return s / n;
}

/** Générateur pseudo-aléatoire reproductible. */
export function rng(seed) {
  let a = (seed * 9301 + 49297) >>> 0 || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
