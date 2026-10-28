import * as THREE from 'three';
import { mulberry32 } from '../core/utils.js';

/**
 * TEXTURES PROCÉDURALES (générées une fois au chargement, toutes tuilables)
 * Terrain : herbe, terre, pavés, roche, sable, neige, cendre, boue.
 * Bâtiments : enduit, planches, briques, pierres, adobe, tuiles, ardoises, bardeaux, panneaux.
 * Intérieurs : parquet, carrelage, moquette, papier peint.
 * Les textures « grises » sont teintées par la couleur du matériau.
 */
const cache = new Map();

/** Bruit de valeur périodique (période en cellules). */
function periodicNoise(period, seed) {
  const rnd = mulberry32(seed);
  const grid = new Float32Array(period * period);
  for (let i = 0; i < grid.length; i++) grid[i] = rnd();
  const at = (x, y) => grid[((y % period + period) % period) * period + ((x % period + period) % period)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/** Bruit fractal tuilable dans [0,1] sur une image S×S. */
function fbmField(S, base, octaves, seed) {
  const out = new Float32Array(S * S);
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(periodicNoise(base << o, seed + o * 17));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0, amp = 0.5, tot = 0;
      for (let o = 0; o < octaves; o++) {
        const p = base << o;
        v += layers[o]((x / S) * p, (y / S) * p) * amp;
        tot += amp;
        amp *= 0.5;
      }
      out[y * S + x] = v / tot;
    }
  }
  return out;
}

function makeCanvas(S) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  return c;
}

function toTexture(canvas, { srgb = true, repeat = 1, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function fieldToCanvas(S, fn) {
  const c = makeCanvas(S);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * S + x) * 4;
      img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Dessine une forme en la répétant sur les bords (tuilable). */
function wrapDraw(S, x, y, r, draw) {
  for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
    if (x + dx + r < 0 || x + dx - r > S || y + dy + r < 0 || y + dy - r > S) continue;
    draw(x + dx, y + dy);
  }
}

const mix = (a, b, t) => a + (b - a) * t;
const clamp255 = (v) => Math.max(0, Math.min(255, v));
const hex = (h) => { const c = new THREE.Color(h); return [c.r * 255, c.g * 255, c.b * 255]; };

function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// ═══ TERRAIN ═════════════════════════════════════════════════════════
export function terrainTexture(kind) {
  return cached(`terrain:${kind}`, () => {
    const S = 512;
    const rnd = mulberry32(kind.length * 977 + 13);
    const n = fbmField(S, 8, 5, kind.length * 31 + 7);
    const n2 = fbmField(S, 32, 3, kind.length * 53 + 3);
    let canvas;
    if (kind === 'grass') {
      const A = hex('#4c8a32'), B = hex('#7aa845'), C = hex('#3a6e28');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        return [0, 1, 2].map((k) => clamp255(mix(mix(C[k], A[k], t * 1.3), B[k], u * 0.7) * (0.85 + u * 0.3)));
      });
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < 9000; i++) {
        const x = rnd() * S, y = rnd() * S, len = 3 + rnd() * 7, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9;
        const g = 90 + rnd() * 90;
        ctx.strokeStyle = `rgba(${g * 0.55},${g},${g * 0.35},${0.35 + rnd() * 0.3})`;
        ctx.lineWidth = 1 + rnd();
        wrapDraw(S, x, y, len, (px, py) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); ctx.stroke(); });
      }
    } else if (kind === 'dirt') {
      const A = hex('#9a7a52'), B = hex('#c8a878');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t) * (0.8 + u * 0.35)));
      });
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < 1400; i++) {
        const x = rnd() * S, y = rnd() * S, r = 1 + rnd() * 3.5;
        const g = 120 + rnd() * 80;
        ctx.fillStyle = `rgba(${g},${g * 0.9},${g * 0.75},0.7)`;
        wrapDraw(S, x, y, r, (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.75, rnd() * 3, 0, Math.PI * 2); ctx.fill(); });
      }
    } else if (kind === 'cobble') {
      canvas = makeCanvas(S);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#6e665c';
      ctx.fillRect(0, 0, S, S);
      const rows = 10, h = S / rows;
      for (let r = 0; r < rows; r++) {
        let x = (r % 2) * h * 0.5 - h;
        while (x < S) {
          const w = h * (0.8 + rnd() * 0.6);
          const g = 150 + rnd() * 50;
          ctx.fillStyle = `rgb(${g},${g - 6},${g - 16})`;
          const draw = (px, py) => {
            ctx.beginPath();
            const rr = 6;
            ctx.roundRect(px + 2, py + 2, w - 4, h - 4, rr);
            ctx.fill();
          };
          wrapDraw(S, x + w / 2, r * h + h / 2, w, (px, py) => draw(px - w / 2, py - h / 2));
          x += w;
        }
      }
      const img = ctx.getImageData(0, 0, S, S);
      for (let i = 0; i < S * S; i++) { const k = 0.85 + n2[i] * 0.3; img.data[i * 4] *= k; img.data[i * 4 + 1] *= k; img.data[i * 4 + 2] *= k; }
      ctx.putImageData(img, 0, 0);
    } else if (kind === 'rock') {
      const A = hex('#6e6860'), B = hex('#a49c90');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        const strata = Math.sin((y / S) * Math.PI * 14 + t * 6) * 0.5 + 0.5;
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t * 0.8 + strata * 0.2) * (0.78 + u * 0.4)));
      });
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'rgba(40,36,32,0.45)';
      for (let i = 0; i < 90; i++) {
        let x = rnd() * S, y = rnd() * S;
        ctx.lineWidth = 0.6 + rnd() * 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.3) * 30; ctx.lineTo(x, y); }
        ctx.stroke();
      }
    } else if (kind === 'sand') {
      const A = hex('#d4b884'), B = hex('#ecd8a8');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        const ripple = Math.sin((x / S) * Math.PI * 24 + t * 9 + (y / S) * 6) * 0.5 + 0.5;
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t * 0.6 + ripple * 0.4) * (0.9 + u * 0.15)));
      });
    } else if (kind === 'snow') {
      const A = hex('#d8e4f0'), B = hex('#ffffff');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t * 0.8 + u * 0.2)));
      });
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.8})`; ctx.fillRect(rnd() * S, rnd() * S, 1.5, 1.5); }
    } else if (kind === 'ash') {
      const A = hex('#2e2a2a'), B = hex('#5a524c');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t) * (0.8 + u * 0.4)));
      });
      const ctx = canvas.getContext('2d');
      for (let i = 0; i < 260; i++) {
        const x = rnd() * S, y = rnd() * S, r = 2 + rnd() * 6;
        ctx.fillStyle = `rgba(${200 + rnd() * 55},${60 + rnd() * 60},20,${0.15 + rnd() * 0.25})`;
        wrapDraw(S, x, y, r, (px, py) => { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); });
      }
    } else if (kind === 'mud') {
      const A = hex('#3e3a28'), B = hex('#6a6040');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t) * (0.8 + u * 0.35)));
      });
    } else if (kind === 'cave') {
      const A = hex('#3a3634'), B = hex('#6a625a');
      canvas = fieldToCanvas(S, (x, y) => {
        const t = n[y * S + x], u = n2[y * S + x];
        return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t) * (0.75 + u * 0.45)));
      });
    } else {
      const A = hex('#c8c0b0'), B = hex('#e8e0d0');
      canvas = fieldToCanvas(S, (x, y) => { const t = n[y * S + x]; return [0, 1, 2].map((k) => clamp255(mix(A[k], B[k], t))); });
    }
    return toTexture(canvas);
  });
}

/** Carte de normales tuilable dérivée d'un bruit (relief fin du terrain et des roches). */
export function detailNormal(key = 'terrain', base = 16, strength = 2.5) {
  return cached(`normal:${key}`, () => {
    const S = 256;
    const h = fbmField(S, base, 4, key.length * 7 + 101);
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const hx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)];
        const hy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
        const v = new THREE.Vector3(-hx * strength * 8, -hy * strength * 8, 1).normalize();
        const i = (y * S + x) * 4;
        data[i] = (v.x * 0.5 + 0.5) * 255; data[i + 1] = (v.y * 0.5 + 0.5) * 255; data[i + 2] = (v.z * 0.5 + 0.5) * 255; data[i + 3] = 255;
      }
    }
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  });
}

// ═══ BÂTIMENTS ═══════════════════════════════════════════════════════
export function surfaceTexture(kind) {
  return cached(`surface:${kind}`, () => {
    const S = 512;
    const rnd = mulberry32(kind.length * 131 + 5);
    const n = fbmField(S, 8, 4, kind.length * 19 + 9);
    let c = makeCanvas(S);
    let ctx = c.getContext('2d');
    const noiseOver = (amt) => {
      const img = ctx.getImageData(0, 0, S, S);
      for (let i = 0; i < S * S; i++) { const k = 1 - amt + n[i] * amt * 2; img.data[i * 4] = clamp255(img.data[i * 4] * k); img.data[i * 4 + 1] = clamp255(img.data[i * 4 + 1] * k); img.data[i * 4 + 2] = clamp255(img.data[i * 4 + 2] * k); }
      ctx.putImageData(img, 0, 0);
    };
    switch (kind) {
      case 'plaster': {
        ctx.fillStyle = '#f0ece4'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 4000; i++) { const g = 200 + rnd() * 55; ctx.fillStyle = `rgba(${g},${g},${g},0.25)`; ctx.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 3, 2 + rnd() * 3); }
        noiseOver(0.08);
        break;
      }
      case 'planks': case 'floor': {
        ctx.fillStyle = '#d8c0a0'; ctx.fillRect(0, 0, S, S);
        const rows = kind === 'floor' ? 8 : 10, h = S / rows;
        for (let r = 0; r < rows; r++) {
          let x = -rnd() * S * 0.5;
          while (x < S) {
            const w = kind === 'floor' ? S * (0.35 + rnd() * 0.4) : S;
            const g = 0.82 + rnd() * 0.22;
            ctx.fillStyle = `rgb(${216 * g},${192 * g},${160 * g})`;
            ctx.fillRect(x, r * h + 1, w, h - 2);
            ctx.strokeStyle = 'rgba(90,60,30,0.18)';
            for (let k = 0; k < 6; k++) { const yy = r * h + 3 + rnd() * (h - 6); ctx.lineWidth = 0.6 + rnd(); ctx.beginPath(); ctx.moveTo(x, yy); ctx.bezierCurveTo(x + w * 0.3, yy + (rnd() - 0.5) * 6, x + w * 0.6, yy + (rnd() - 0.5) * 6, x + w, yy); ctx.stroke(); }
            ctx.fillStyle = 'rgba(60,40,20,0.5)';
            ctx.fillRect(x, r * h, 2, h);
            x += w;
          }
          ctx.fillStyle = 'rgba(60,40,20,0.55)';
          ctx.fillRect(0, r * h, S, 2);
        }
        noiseOver(0.06);
        break;
      }
      case 'logs': {
        ctx.fillStyle = '#7a5434'; ctx.fillRect(0, 0, S, S);
        const rows = 8, h = S / rows;
        for (let r = 0; r < rows; r++) {
          const grd = ctx.createLinearGradient(0, r * h, 0, r * h + h);
          grd.addColorStop(0, '#5a3a20'); grd.addColorStop(0.3, '#a07448'); grd.addColorStop(0.7, '#8a603a'); grd.addColorStop(1, '#4a2e18');
          ctx.fillStyle = grd; ctx.fillRect(0, r * h, S, h);
        }
        noiseOver(0.1);
        break;
      }
      case 'brick': {
        ctx.fillStyle = '#b8b0a4'; ctx.fillRect(0, 0, S, S);
        const rows = 16, h = S / rows, w = S / 6;
        for (let r = 0; r < rows; r++) for (let k = -1; k < 7; k++) {
          const x = k * w + (r % 2) * w * 0.5;
          const g = 0.8 + rnd() * 0.3;
          ctx.fillStyle = `rgb(${180 * g},${82 * g},${60 * g})`;
          ctx.fillRect(x + 2, r * h + 2, w - 4, h - 4);
        }
        noiseOver(0.12);
        break;
      }
      case 'stone': {
        ctx.fillStyle = '#5a564e'; ctx.fillRect(0, 0, S, S);
        const rows = 7, h = S / rows;
        for (let r = 0; r < rows; r++) {
          let x = -rnd() * 60;
          while (x < S) {
            const w = 50 + rnd() * 70;
            const g = 140 + rnd() * 60;
            ctx.fillStyle = `rgb(${g},${g - 4},${g - 12})`;
            ctx.beginPath(); ctx.roundRect(x + 3, r * h + 3, w - 6, h - 6, 8); ctx.fill();
            x += w;
          }
        }
        noiseOver(0.15);
        break;
      }
      case 'adobe': {
        ctx.fillStyle = '#e0c49a'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 3000; i++) { const g = rnd() * 40; ctx.fillStyle = `rgba(${170 + g},${130 + g},${90 + g},0.3)`; ctx.fillRect(rnd() * S, rnd() * S, 3, 2); }
        noiseOver(0.12);
        break;
      }
      case 'panel': {
        ctx.fillStyle = '#e8ecf2'; ctx.fillRect(0, 0, S, S);
        const n2 = 4, w = S / n2;
        ctx.strokeStyle = 'rgba(80,90,110,0.55)'; ctx.lineWidth = 3;
        for (let i = 0; i <= n2; i++) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * w); ctx.lineTo(S, i * w); ctx.stroke(); }
        noiseOver(0.04);
        break;
      }
      case 'rooftiles': {
        ctx.fillStyle = '#7a7a7a'; ctx.fillRect(0, 0, S, S);
        const rows = 12, h = S / rows, w = S / 10;
        for (let r = 0; r < rows; r++) for (let k = -1; k < 11; k++) {
          const x = k * w + (r % 2) * w * 0.5;
          const g = 0.82 + rnd() * 0.25;
          const grd = ctx.createLinearGradient(0, r * h, 0, r * h + h);
          grd.addColorStop(0, `rgb(${255 * g},${255 * g},${255 * g})`); grd.addColorStop(1, `rgb(${170 * g},${170 * g},${170 * g})`);
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.moveTo(x + 1, r * h); ctx.lineTo(x + w - 1, r * h); ctx.lineTo(x + w - 1, r * h + h * 0.75); ctx.quadraticCurveTo(x + w / 2, r * h + h * 1.05, x + 1, r * h + h * 0.75); ctx.fill();
        }
        noiseOver(0.06);
        break;
      }
      case 'slate': {
        ctx.fillStyle = '#5a5a5a'; ctx.fillRect(0, 0, S, S);
        const rows = 14, h = S / rows, w = S / 8;
        for (let r = 0; r < rows; r++) for (let k = -1; k < 9; k++) {
          const x = k * w + (r % 2) * w * 0.5;
          const g = 170 + rnd() * 60;
          ctx.fillStyle = `rgb(${g},${g},${g})`;
          ctx.fillRect(x + 1, r * h + 1, w - 2, h - 2);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(x + 1, r * h + h - 4, w - 2, 3);
        }
        noiseOver(0.05);
        break;
      }
      case 'shingles': {
        ctx.fillStyle = '#6a5040'; ctx.fillRect(0, 0, S, S);
        const rows = 14, h = S / rows;
        for (let r = 0; r < rows; r++) {
          let x = (r % 2) * 18 - 30;
          while (x < S) {
            const w = 26 + rnd() * 26;
            const g = 0.75 + rnd() * 0.35;
            ctx.fillStyle = `rgb(${200 * g},${200 * g},${200 * g})`;
            ctx.fillRect(x + 1, r * h + 1, w - 2, h - 1);
            x += w;
          }
        }
        noiseOver(0.08);
        break;
      }
      case 'tiles': {
        const n2 = 8, w = S / n2;
        for (let y = 0; y < n2; y++) for (let x = 0; x < n2; x++) {
          const g = (x + y) % 2 ? 235 : 205;
          ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(x * w, y * w, w, w);
        }
        ctx.strokeStyle = 'rgba(120,120,120,0.5)'; ctx.lineWidth = 2;
        for (let i = 0; i <= n2; i++) { ctx.beginPath(); ctx.moveTo(i * w, 0); ctx.lineTo(i * w, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * w); ctx.lineTo(S, i * w); ctx.stroke(); }
        noiseOver(0.04);
        break;
      }
      case 'carpet': {
        ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 20000; i++) { const g = 170 + rnd() * 85; ctx.fillStyle = `rgba(${g},${g},${g},0.35)`; ctx.fillRect(rnd() * S, rnd() * S, 1.2, 1.2); }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 10;
        ctx.strokeRect(30, 30, S - 60, S - 60);
        noiseOver(0.05);
        break;
      }
      case 'wallpaper': {
        ctx.fillStyle = '#eeeae2'; ctx.fillRect(0, 0, S, S);
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let i = 0; i < 16; i++) ctx.fillRect(i * (S / 16), 0, S / 32, S);
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const cx = x * 64 + (y % 2) * 32 + 16, cy = y * 64 + 32;
          ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 6, cy); ctx.fill();
        }
        break;
      }
      case 'metal': {
        ctx.fillStyle = '#9aa2ac'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 800; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.08})`; ctx.fillRect(0, rnd() * S, S, 1); }
        ctx.fillStyle = 'rgba(40,40,50,0.6)';
        for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(i * 128 + 10, k * 128 + 10, 4, 0, Math.PI * 2); ctx.fill(); }
        noiseOver(0.05);
        break;
      }
      default: ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, S, S);
    }
    return toTexture(c);
  });
}

/** Texture d'iris pour les yeux (dégradé, reflet). */
export function irisTexture(color) {
  return cached(`iris:${color}`, () => {
    const S = 128;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, S, S);
    // projection équirectangulaire : l'avant de la sphère (+Z, u = 0.25) au centre de l'iris
    const cx = S * 0.25, cy = S * 0.5;
    const col = new THREE.Color(color);
    const dark = col.clone().multiplyScalar(0.35).getStyle();
    const mid = col.getStyle();
    const light = col.clone().lerp(new THREE.Color('#ffffff'), 0.45).getStyle();
    const g = ctx.createRadialGradient(cx, cy + 6, 2, cx, cy, S * 0.2);
    g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, S * 0.19, S * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0c0a14';
    ctx.beginPath(); ctx.ellipse(cx, cy, S * 0.085, S * 0.17, 0, 0, Math.PI * 2); ctx.fill();
    return toTexture(c, { aniso: 4 });
  });
}

/** Motif de pelage projeté sur une sphère (UV équirectangulaires). */
export function patternTexture(kind, base, pcolor, seed = 1) {
  return cached(`pattern:${kind}:${base}:${pcolor}:${seed}`, () => {
    const W = 256, H = 128;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const rnd = mulberry32(seed * 101 + kind.length);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pcolor;
    ctx.strokeStyle = pcolor;
    switch (kind) {
      case 'stripes':
        for (let i = 0; i < 9; i++) {
          const x = (i / 9) * W + rnd() * 6;
          ctx.beginPath();
          ctx.moveTo(x - 5, 0);
          ctx.quadraticCurveTo(x + 10, H * 0.3, x - 2, H * 0.55);
          ctx.lineTo(x + 6, H * 0.55);
          ctx.quadraticCurveTo(x + 16, H * 0.3, x + 5, 0);
          ctx.fill();
        }
        break;
      case 'spots':
        for (let i = 0; i < 26; i++) {
          const x = rnd() * W, y = H * 0.12 + rnd() * H * 0.5, r = 4 + rnd() * 8;
          ctx.beginPath(); ctx.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2); ctx.fill();
        }
        break;
      case 'rings':
        for (let i = 0; i < 6; i++) { const y = H * (0.12 + i * 0.14); ctx.fillRect(0, y, W, H * 0.05); }
        break;
      case 'gradient': {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, pcolor); g.addColorStop(0.55, base); g.addColorStop(1, base);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        break;
      }
      case 'mask':
        ctx.beginPath(); ctx.ellipse(W * 0.25, H * 0.42, W * 0.14, H * 0.12, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case 'patches':
        for (let i = 0; i < 7; i++) {
          const x = rnd() * W, y = H * 0.1 + rnd() * H * 0.6;
          ctx.beginPath();
          for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, rr = 10 + rnd() * 10; ctx.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); }
          ctx.fill();
        }
        break;
      default: break;
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  });
}

/** Panneau texte (enseignes, panneaux de route). */
export function labelTexture(text, { bg = '#1b2338', fg = '#ffe9b8', w = 512, h = 128, font = '700 64px "Chakra Petch", sans-serif', border = true } = {}) {
  return cached(`label:${text}:${bg}:${fg}:${w}:${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    if (border) {
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = parseInt(font.match(/(\d+)px/)[1], 10);
    ctx.font = font;
    while (ctx.measureText(text).width > w - 40 && size > 14) { size -= 3; ctx.font = font.replace(/\d+px/, `${size}px`); }
    ctx.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

/** Emblème rond d'un type (portes d'arène, badges). */
export function emblemTexture(color, glyph = '◆') {
  return cached(`emblem:${color}:${glyph}`, () => {
    const S = 256;
    const c = makeCanvas(S);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, S, S);
    const g = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, new THREE.Color(color).multiplyScalar(0.4).getStyle());
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe9b8'; ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 120px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, S / 2, S / 2 + 6);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}
