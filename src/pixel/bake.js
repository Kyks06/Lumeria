import * as THREE from 'three';
import { CreatureView } from '../battle/CreatureView.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { buildHuman, humanHeight } from '../render/HumanBuilder.js';
import { ProceduralAnimator } from '../core/Animator.js';
import { normalizeObject } from '../core/Assets.js';
import { Px, canvas as mkCanvas, ctx2d } from './Px.js';
import { creatureFrames } from './creatureArt.js';
import { rgbToHex, shade } from './color.js';

/**
 * CUISSON 3D → PIXEL ART : les modèles 3D des Lumins et des dresseurs sont rendus en ombrage « toon »
 * à double résolution, réduits au pixel près (vote majoritaire), ramenés à une palette de 14 tons
 * puis cernés d'un contour coloré : on obtient des sprites dans l'esprit des jeux GBA,
 * cohérents avec les modèles (formes, couleurs, motifs, yeux).
 * Vues : front (adversaire, 3/4 face), back (votre Lumin, de dos), icon (menus), ow0..ow3 (carte).
 */
const VIEWS = {
  front: { size: [64, 64], yaw: -0.62, elev: 0.16, fill: [0.56, 0.98] },
  back: { size: [80, 80], yaw: Math.PI - 0.55, elev: 0.22, fill: [0.6, 1.0] },
  icon: { size: [40, 40], yaw: 0.55, elev: 0.2, fill: [0.86, 0.98] },
  ow0: { size: [32, 32], yaw: 0, elev: 0.5, fill: [0.6, 0.92] },
  ow1: { size: [32, 32], yaw: -Math.PI / 2, elev: 0.5, fill: [0.6, 0.92] },
  ow2: { size: [32, 32], yaw: Math.PI / 2, elev: 0.5, fill: [0.6, 0.92] },
  ow3: { size: [32, 32], yaw: Math.PI, elev: 0.5, fill: [0.6, 0.92] },
  trainerFront: { size: [56, 80], yaw: -0.45, elev: 0.1, fill: [0.94, 0.94] },
  trainerBack: { size: [72, 96], yaw: Math.PI - 0.5, elev: 0.14, fill: [0.98, 0.98] },
};

let gradient = null;
function toonGradient() {
  if (gradient) return gradient;
  const d = new Uint8Array([72, 72, 72, 255, 150, 150, 150, 255, 225, 225, 225, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

/** Remplace les matériaux par un ombrage en aplats (3 tons). */
function toonify(root) {
  const made = new Map();
  const conv = (m) => {
    if (!m) return m;
    if (made.has(m)) return made.get(m);
    const t = new THREE.MeshToonMaterial({
      color: m.color ? m.color.clone() : new THREE.Color('#ffffff'), map: m.map || null, gradientMap: toonGradient(),
      emissive: m.emissive ? m.emissive.clone() : new THREE.Color('#000000'), emissiveIntensity: Math.min(1.2, (m.emissiveIntensity ?? 0) * 0.5),
      transparent: !!m.transparent, opacity: m.opacity ?? 1, side: m.side ?? THREE.FrontSide, depthWrite: m.depthWrite !== false,
    });
    if (m.type === 'MeshBasicMaterial') { t.emissive.copy(m.color); t.emissiveIntensity = 1; }
    made.set(m, t);
    return t;
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
  return [...made.values()];
}

/** Réduction 2× par vote : un pixel est opaque si au moins 2 des 4 le sont, couleur moyenne. */
function downsample(data, W, H) {
  const w = W >> 1, h = H >> 1;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let n = 0, r = 0, g = 0, b = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const i = ((y * 2 + dy) * W + x * 2 + dx) * 4;
      if (data[i + 3] > 110) { n++; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    }
    const o = (y * w + x) * 4;
    if (n >= 2) { out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255; }
  }
  return out;
}

/** Palette par coupe médiane (K tons) puis association au ton le plus proche. */
function quantize(d, K = 14) {
  const pts = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3]) pts.push([d[i], d[i + 1], d[i + 2]]);
  if (!pts.length) return;
  let boxes = [pts];
  while (boxes.length < K) {
    let bi = -1, bestR = -1, ch = 0;
    boxes.forEach((bx, i) => {
      if (bx.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0;
        for (const p of bx) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        const r = (hi - lo) * (c === 1 ? 1.2 : 1) * Math.sqrt(bx.length);
        if (r > bestR) { bestR = r; bi = i; ch = c; }
      }
    });
    if (bi < 0) break;
    const bx = boxes[bi].sort((a, b) => a[ch] - b[ch]);
    const mid = bx.length >> 1;
    boxes.splice(bi, 1, bx.slice(0, mid), bx.slice(mid));
  }
  const pal = boxes.filter((b) => b.length).map((bx) => {
    let r = 0, g = 0, b = 0;
    for (const p of bx) { r += p[0]; g += p[1]; b += p[2]; }
    return [r / bx.length, g / bx.length, b / bx.length];
  });
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let best = 0, bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const dr = d[i] - pal[k][0], dg = d[i + 1] - pal[k][1], db = d[i + 2] - pal[k][2];
      const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dd < bd) { bd = dd; best = k; }
    }
    d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2];
  }
}

export class Baker {
  constructor(assets) {
    this.assets = assets;
    this.cache = new Map();
    this.renderer = null;
    this.failed = false;
  }

  init() {
    if (this.renderer || this.failed) return !!this.renderer;
    try {
      const r = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      r.setPixelRatio(1);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.setClearColor(0x000000, 0);
      this.renderer = r;
    } catch (e) {
      console.warn('Cuisson des sprites indisponible', e);
      this.failed = true;
      return false;
    }
    this.scene = new THREE.Scene();
    const key = new THREE.DirectionalLight('#fff6ea', 2.9);
    key.position.set(-2.2, 3.4, 3.2);
    const rim = new THREE.DirectionalLight('#b8dcff', 1.1);
    rim.position.set(3, 2, -3);
    this.scene.add(key, rim, new THREE.HemisphereLight('#ffffff', '#4a5a6a', 0.95));
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
    this.read = document.createElement('canvas');
    return true;
  }

  /** Rend un objet 3D selon une vue et renvoie un tampon Px traité. */
  bakeObject(obj, viewName, height, { k = 14, outlineK = 0.72 } = {}) {
    const V = VIEWS[viewName] || VIEWS.front;
    const [w, h] = V.size;
    const W = w * 2, H = h * 2;
    const holder = new THREE.Group();
    holder.add(obj);
    obj.rotation.y = V.yaw;
    this.scene.add(holder);
    holder.updateMatrixWorld(true);
    const dir = new THREE.Vector3(0, Math.sin(V.elev), Math.cos(V.elev));
    const box = new THREE.Box3().setFromObject(holder);
    const center = box.getCenter(new THREE.Vector3());
    const cam = this.camera;
    cam.position.copy(center).addScaledVector(dir, 30);
    cam.up.set(0, 1, 0);
    cam.lookAt(center);
    cam.updateMatrixWorld(true);
    // étendue projetée de la boîte
    const inv = cam.matrixWorldInverse;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
    const ew = x1 - x0, eh = y1 - y0;
    const fill = Math.max(V.fill[0], Math.min(V.fill[1], 0.5 + height * 0.3));
    const upp = Math.max(ew / (w * fill), eh / (h * fill)); // unités par pixel (taille finale)
    const halfW = (w * upp) / 2, halfH = (h * upp) / 2;
    const cx = (x0 + x1) / 2;
    const bottom = y0 - 2 * upp; // pieds à 2 px du bas
    cam.left = cx - halfW; cam.right = cx + halfW;
    cam.bottom = bottom; cam.top = bottom + h * upp;
    cam.near = 0.01; cam.far = 80;
    cam.updateProjectionMatrix();
    this.renderer.setSize(W, H, false);
    this.renderer.render(this.scene, cam);
    this.scene.remove(holder);
    // lecture des pixels
    const rc = this.read;
    rc.width = W; rc.height = H;
    const x2 = rc.getContext('2d', { willReadFrequently: true });
    x2.clearRect(0, 0, W, H);
    x2.drawImage(this.renderer.domElement, 0, 0);
    const big = x2.getImageData(0, 0, W, H).data;
    const small = downsample(big, W, H);
    quantize(small, k);
    const px = new Px(w, h);
    px.d.set(small);
    px.outline(null, { k: outlineK });
    return px;
  }

  /**
   * Sprite de Lumin (mis en cache) : pixel art dessiné à la main par programme (pixel/creatureArt.js),
   * 4 images d'animation + clignement, couche émissive (flammes, cristaux, yeux) et points d'émission
   * de particules (braises, étincelles, bulles, feux follets…).
   */
  creature(id, view = 'front', shiny = false) {
    const key = `${id}|${view}|${shiny ? 1 : 0}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const sp = CREATURE_MAP[id];
    const cfg = CVIEWS[view] || CVIEWS.front;
    let look = sp?.look || FALLBACK_LOOK;
    if (shiny) look = shinyLook(look, sp?.num || 1);
    let scale = cfg.scale || 1;
    if (cfg.fit) scale *= cfg.fit / Math.max(0.6, look.size || 1);
    let out;
    try {
      const set = creatureFrames(look, cfg.view, { W: cfg.size[0], H: cfg.size[1], scale });
      out = cfg.mirror ? mirrorSet(set) : set;
    } catch (e) {
      console.warn('Dessin du Lumin', id, e);
      out = fallbackBlob(sp, cfg.size);
      out.frames = [out]; out.blink = out;
    }
    this.cache.set(key, out);
    return out;
  }

  /** Dresseur en combat (face ou dos). */
  trainer(look, view = 'trainerFront', cacheKey = null) {
    const key = cacheKey ? `T|${cacheKey}|${view}` : null;
    if (key && this.cache.has(key)) return this.cache.get(key);
    let out = null;
    if (this.init()) {
      try {
        const built = buildHuman(look || {});
        const hgt = humanHeight(look || {});
        const scaler = new THREE.Group();
        scaler.add(built.object);
        const obj = normalizeObject(scaler, { height: hgt });
        const anim = new ProceduralAnimator(built.rig);
        anim.play('idle');
        anim.update(0.3);
        const wrap = new THREE.Group();
        wrap.add(obj);
        const mats = toonify(wrap);
        const px = this.bakeObject(wrap, view, 2.4, { k: 16 });
        for (const m of mats) m.dispose();
        out = finishSprite(px);
      } catch (e) { console.warn('Cuisson dresseur', e); }
    }
    if (!out) out = fallbackBlob(null, VIEWS[view].size);
    if (key) this.cache.set(key, out);
    return out;
  }

  /** URL d'image (menus). */
  url(id, shiny = false, view = 'icon') {
    const s = this.creature(id, view, shiny);
    if (!s.url) s.url = s.canvas.toDataURL('image/png');
    return s.url;
  }
}

let shared = null;
/** Cuiseur partagé (un seul contexte WebGL pour tout le jeu). */
export function getBaker(assets = null) {
  if (!shared) shared = new Baker(assets);
  if (assets && !shared.assets) shared.assets = assets;
  return shared;
}

function finishSprite(px) {
  const b = px.bounds() || { x0: 0, y0: 0, x1: px.w - 1, y1: px.h - 1, w: px.w, h: px.h };
  const white = new Px(px.w, px.h);
  for (let i = 0; i < px.d.length; i += 4) if (px.d[i + 3]) { white.d[i] = white.d[i + 1] = white.d[i + 2] = 255; white.d[i + 3] = 255; }
  return { canvas: px.toCanvas(), white: white.toCanvas(), shadow: px.silhouette(), w: px.w, h: px.h, ax: Math.round((b.x0 + b.x1) / 2), ay: b.y1, top: b.y0, bounds: b, px };
}

function fallbackBlob(sp, [w, h]) {
  const px = new Px(w, h);
  const col = sp?.look?.body || '#9a9aa8';
  px.ellipse(w / 2, h * 0.62, w * 0.3, h * 0.28, null, (x, y, nx, ny) => px.set(x, y, shade(col, -(nx + ny) * 0.3)));
  px.set(Math.round(w / 2 - 3), Math.round(h * 0.55), '#1a1a22'); px.set(Math.round(w / 2 + 3), Math.round(h * 0.55), '#1a1a22');
  px.outline(null, { k: 0.75 });
  return finishSprite(px);
}

/** Vues des Lumins : taille du canevas, sens, échelle (fit = remplit la case quelle que soit la taille). */
const CVIEWS = {
  front: { size: [64, 64], view: 'front' },
  back: { size: [80, 80], view: 'back' },
  icon: { size: [48, 48], view: 'front', scale: 0.95, fit: 1 },
  ow0: { size: [40, 40], view: 'front', scale: 0.62 },
  ow1: { size: [40, 40], view: 'front', scale: 0.62 },
  ow2: { size: [40, 40], view: 'front', scale: 0.62, mirror: true },
  ow3: { size: [40, 40], view: 'back', scale: 0.62 },
};
const FALLBACK_LOOK = { plan: 'blob', body: '#9a9aa8', stage: 1, size: 0.9 };

/** Couleurs « chromatiques » (shiny) : teinte décalée, stable pour chaque espèce. */
function hueShift(hex, dh, ds = 0) {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  h = (h + dh + 1) % 1; s = Math.max(0, Math.min(1, s + ds));
  const f = (k0) => { const k = (k0 + h * 12) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}
function shinyLook(L, num) {
  const dh = [0.42, 0.58, 0.16, 0.84][num % 4];
  const sh = (c) => (typeof c === 'string' && c[0] === '#' ? hueShift(c, dh, 0.05) : c);
  return { ...L, body: sh(L.body), belly: sh(L.belly), pcolor: sh(L.pcolor), accent: sh(L.accent), T: { ...(L.T || {}), wing: sh(L.T?.wing), leaf: sh(L.T?.leaf), petal: sh(L.T?.petal) } };
}
/** Retourne horizontalement un jeu d'images (le Lumin regarde vers la droite). */
function mirrorSet(set) {
  const flip = (s) => {
    if (!s) return s;
    const f = (cv) => { if (!cv) return cv; const c = mkCanvas(cv.width, cv.height); const x = ctx2d(c); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0); return c; };
    return { ...s, canvas: f(s.canvas), em: f(s.em), white: f(s.white), emitters: (s.emitters || []).map((e) => ({ ...e, x: s.w - e.x })), ax: s.w - s.ax };
  };
  const frames = set.frames.map(flip);
  return { ...frames[0], frames, blink: flip(set.blink) };
}

export { VIEWS as BAKE_VIEWS, rgbToHex };
