import { Px } from './Px.js';
import { shade, mixHex, hexToRgb, rgbToHex, bayer, hash2, valueNoise, rng, outlineOf } from './color.js';

/**
 * CRÉATURES EN PIXEL ART (générées en 2D, dans l'esprit des jeux GBA, ambiance féerique) :
 * silhouettes chibi (grosse tête, grands yeux brillants), ombrage 4 tons avec décalage de teinte,
 * liseré lumineux, contours colorés intérieurs et extérieurs, motifs (rayures, taches, chaussettes),
 * attributs de type (flammes animées, feuilles, éclairs, cristaux, plaques, ailes, auréoles, étoiles…).
 * Chaque appel dessine une image : vue « front » (3/4 face, regard vers la gauche) ou « back » (de dos),
 * frame 0..3 (respiration, queue, flammes), blink (yeux fermés). Renvoie aussi les parties émissives
 * (halo) et des points d'émission de particules (bout de la queue, crinière, mains…).
 */
const L = (() => { const v = [-0.55, -0.62, 0.56]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

export function ramp5(c) { return [shade(c, -0.6), shade(c, -0.3), c, shade(c, 0.26), shade(c, 0.55)]; }

/** Peintre : formes ombrées, contour par pièce, couche émissive. */
class Painter {
  constructor(W, H, ox, oy, S, flip) {
    this.W = W; this.H = H; this.ox = ox; this.oy = oy; this.S = S; this.f = flip;
    this.px = new Px(W, H);
    this.em = new Px(W, H);
    this.owner = new Int16Array(W * H).fill(-1);
    this.n = 0;
    this.emitters = [];
    this.rim = null;
  }
  X(x) { return this.ox + x * this.S * this.f; }
  Y(y) { return this.oy + y * this.S; }

  /** Pose une pièce : fn(px, py) → couleur | null ; options : contour, émissif. */
  part(bbox, fn, { outline = true, okK = 0.72, glow = false, under = false } = {}) {
    const id = this.n++;
    const [x0, y0, x1, y1] = bbox.map((v, i) => (i < 2 ? Math.floor(v) - 1 : Math.ceil(v) + 1));
    const mask = [];
    for (let y = Math.max(0, y0); y <= Math.min(this.H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(this.W - 1, x1); x++) {
      const k = y * this.W + x;
      if (under && this.owner[k] >= 0) continue;
      const c = fn(x, y);
      if (!c) continue;
      this.px.set(x, y, c);
      this.owner[k] = id;
      mask.push(k);
      if (glow) this.em.set(x, y, typeof glow === 'string' ? glow : c);
    }
    if (outline && mask.length) {
      const set = new Set(mask);
      const W = this.W;
      const out = new Map();
      for (const k of mask) {
        const x = k % W, y = (k / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= this.H) continue;
          const nk = ny * W + nx;
          if (set.has(nk) || out.has(nk)) continue;
          if (under && this.owner[nk] >= 0) continue;
          out.set(nk, k);
        }
      }
      for (const [nk, k] of out) {
        const i = k * 4;
        const src = rgbToHex([this.px.d[i], this.px.d[i + 1], this.px.d[i + 2]]);
        const nx = nk % W, ny = (nk / W) | 0;
        this.px.set(nx, ny, outlineOf(src, okK));
        this.owner[nk] = id;
        this.em.clear(nx, ny);
      }
    }
    return id;
  }

  /** Ellipse ombrée (ramp de 5 tons), rotation facultative, motif facultatif. */
  ell(cx, cy, rx, ry, R, o = {}) {
    const X = this.X(cx), Y = this.Y(cy), RX = Math.max(1, rx * this.S), RY = Math.max(1, ry * this.S);
    const rot = (o.rot || 0) * this.f, cs = Math.cos(rot), sn = Math.sin(rot);
    const ext = Math.max(RX, RY) + 1;
    return this.part([X - ext, Y - ext, X + ext, Y + ext], (x, y) => {
      const dx = x + 0.5 - X, dy = y + 0.5 - Y;
      const u = (dx * cs + dy * sn) / RX, v = (-dx * sn + dy * cs) / RY;
      const d2 = u * u + v * v;
      if (d2 > 1) return null;
      if (o.cut && o.cut(u, v, x, y)) return null;
      const nz = Math.sqrt(1 - d2);
      const nx = (dx / RX) * this.f, ny = dy / RY;
      let I = (nx * L[0] * this.f + ny * L[1] + nz * L[2]);
      I = 0.5 + I * 0.62 + (o.lift || 0);
      if (o.pat) { const pc = o.pat(u, v, x, y, I); if (pc) return pc; }
      return tone(R, I, x, y, o, u * this.f, v);
    }, o);
  }

  /** Polygone (points en coordonnées de dessin), ombrage par la hauteur. */
  poly(pts, R, o = {}) {
    const P = pts.map(([x, y]) => [this.X(x), this.Y(y)]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return this.part([x0, y0, x1, y1], (x, y) => {
      if (!inPoly(x + 0.5, y + 0.5, P)) return null;
      const t = (y - y0) / Math.max(1, y1 - y0), s = (x - x0) / Math.max(1, x1 - x0);
      const I = o.flat ?? (0.85 - t * 0.55 - (this.f > 0 ? (1 - s) : s) * 0.15);
      if (o.pat) { const pc = o.pat(s, t, x, y, I); if (pc) return pc; }
      return tone(R, I + (o.lift || 0), x, y, o);
    }, o);
  }

  /** Membre (capsule) de (ax, ay) à (bx, by), épaisseur w. */
  limb(ax, ay, bx, by, w, R, o = {}) {
    const A = [this.X(ax), this.Y(ay)], B = [this.X(bx), this.Y(by)], W = Math.max(1, (w * this.S) / 2);
    const dx = B[0] - A[0], dy = B[1] - A[1], L2 = dx * dx + dy * dy || 1;
    return this.part([Math.min(A[0], B[0]) - W, Math.min(A[1], B[1]) - W, Math.max(A[0], B[0]) + W, Math.max(A[1], B[1]) + W], (x, y) => {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - A[0]) * dx + (py - A[1]) * dy) / L2; t = Math.max(0, Math.min(1, t));
      const ex = px - (A[0] + dx * t), ey = py - (A[1] + dy * t);
      const d = Math.hypot(ex, ey);
      const ww = W * (o.taper ? 1 - t * o.taper : 1);
      if (d > ww) return null;
      const side = (ex * -dy + ey * dx) / Math.sqrt(L2) / ww;
      const I = 0.55 - side * 0.35 * this.f - t * 0.1 + (o.lift || 0);
      return tone(R, I, x, y, o);
    }, o);
  }

  /** Œil chibi : contour, iris dégradé, pupille, reflets ; regard vers l'avant. */
  eye(cx, cy, size, iris, { closed = false, sharp = false, glow = false, far = false, squint = false } = {}) {
    const X = this.X(cx), Y = this.Y(cy);
    const rx = Math.max(1.2, size * this.S * (far ? 0.62 : 0.78)), ry = Math.max(1.5, size * this.S * (squint ? 0.7 : 1.05));
    const I = [shade(iris, -0.55), shade(iris, -0.2), iris, shade(iris, 0.35)];
    if (closed) {
      this.part([X - rx - 1, Y - 1, X + rx + 1, Y + 2], (x, y) => {
        const dx = (x + 0.5 - X) / rx;
        if (Math.abs(dx) > 1) return null;
        const yy = Y + 0.5 - Math.round(Math.sqrt(1 - dx * dx) * 1.2);
        return Math.round(yy) === y ? '#2a1a28' : null;
      }, { outline: false });
      return;
    }
    this.part([X - rx - 1, Y - ry - 1, X + rx + 1, Y + ry + 1], (x, y) => {
      const u = (x + 0.5 - X) / rx, v = (y + 0.5 - Y) / ry;
      if (u * u + v * v > 1) return null;
      if (sharp && v < -0.35 + u * 0.5 * this.f) return null;
      const d = Math.hypot(u, v);
      if (d > 0.82) return '#1a1020';
      const pu = u + 0.18 * -this.f, pv = v + 0.05;
      if (Math.hypot(pu * 1.1, pv * 0.9) < 0.34) return '#120a18';
      return v < -0.3 ? I[0] : v < 0.15 ? I[1] : v < 0.5 ? I[2] : I[3];
    }, { outline: false, glow: glow ? shade(iris, 0.2) : false });
    // reflets
    const hx = Math.round(X - rx * 0.35 * this.f), hy = Math.round(Y - ry * 0.4);
    this.px.set(hx, hy, '#ffffff');
    if (rx >= 2.4) { this.px.set(hx, hy + 1, '#ffffff'); this.px.set(hx - this.f, hy, '#ffffff'); }
    if (rx >= 2) this.px.set(Math.round(X + rx * 0.3 * this.f), Math.round(Y + ry * 0.45), '#f4f0ff');
  }

  dot(x, y, c) { this.px.set(Math.round(this.X(x)), Math.round(this.Y(y)), c); }
  emit(x, y, kind) { this.emitters.push({ x: this.X(x), y: this.Y(y), kind }); }
}

function inPoly(x, y, P) {
  let inside = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Ton (0..4) selon l'intensité, tramage léger aux frontières, liseré lumineux à l'arrière. */
function tone(R, I, x, y, o = {}, u = 0, v = 0) {
  const b = (bayer(x, y) - 0.5) * 0.1;
  let k = I + b < 0.2 ? 0 : I + b < 0.42 ? 1 : I + b < 0.72 ? 2 : I + b < 0.9 ? 3 : 4;
  if (o.noSpec && k === 4) k = 3;
  if (o.rim && u > 0.3 && u * u + v * v > 0.8 && v < 0.4) return o.rim;
  return R[k];
}

/* ════════════════════════ ATTRIBUTS DE TYPE ════════════════════════ */
/** Flamme animée (pointe vers le haut), émissive. */
function flame(P, x, y, h, w, frame, { color = 'feu', lean = 0 } = {}) {
  const pal = color === 'bleu' ? ['#2a4aff', '#5a8aff', '#a8d0ff', '#ffffff'] : color === 'violet' ? ['#5a1a9a', '#9a4aff', '#d8a8ff', '#ffffff'] : color === 'vert' ? ['#1a7a3a', '#3ac85a', '#a8ff8a', '#ffffff'] : ['#c8301a', '#ff7a1a', '#ffd23f', '#fff6c0'];
  const X = P.X(x), Y = P.Y(y), H = h * P.S, Wd = w * P.S;
  const ph = frame * 1.7;
  P.part([X - Wd - 3, Y - H - 2, X + Wd + 3, Y + 2], (px, py) => {
    const t = (Y - (py + 0.5)) / H;
    if (t < -0.1 || t > 1) return null;
    const sway = Math.sin(t * 3.2 + ph) * Wd * 0.35 * t + lean * t * H * 0.3 * P.f;
    const hw = Wd * Math.pow(Math.max(0, 1 - t), 0.85) * (0.75 + 0.25 * Math.sin(t * 6 + ph * 1.3));
    const dx = px + 0.5 - (X + sway);
    if (Math.abs(dx) > hw + 0.2) return null;
    const core = Math.abs(dx) / Math.max(0.5, hw);
    const k = t > 0.75 ? 0 : core > 0.72 ? 1 : t < 0.45 && core < 0.4 ? 3 : 2;
    return pal[k];
  }, { outline: false, glow: true });
  P.emit(x, y - h * 0.9, 'ember');
}

function leafShape(P, x, y, len, w, ang, R, o = {}) {
  const cs = Math.cos(ang), sn = Math.sin(ang);
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; const hw = Math.sin(t * Math.PI) * w; pts.push([x + cs * len * t - sn * hw, y + sn * len * t + cs * hw]); }
  for (let i = 10; i >= 0; i--) { const t = i / 10; const hw = Math.sin(t * Math.PI) * w; pts.push([x + cs * len * t + sn * hw, y + sn * len * t - cs * hw]); }
  P.poly(pts, R, { ...o, pat: (s, t, px, py) => { const mid = Math.abs((px - P.X(x)) * sn * P.f - (py - P.Y(y)) * cs) < 0.7; return mid ? R[1] : null; } });
}

function crystal(P, x, y, h, w, color, lean = 0) {
  const R = [shade(color, -0.5), shade(color, -0.2), color, shade(color, 0.4), '#ffffff'];
  P.poly([[x - w, y], [x - w * 0.7 + lean, y - h * 0.75], [x + lean * 1.2, y - h], [x + w * 0.7 + lean, y - h * 0.75], [x + w, y]], R, {
    glow: shade(color, 0.2), pat: (s, t) => (s < 0.45 ? (t < 0.35 ? R[4] : R[3]) : t < 0.5 ? R[2] : R[1]),
  });
}

function bolt(P, x, y, s, R) {
  P.poly([[x, y], [x + 4 * s, y - 5 * s], [x + 2 * s, y - 5 * s], [x + 6 * s, y - 11 * s], [x + 1 * s, y - 5.5 * s], [x + 3 * s, y - 5.5 * s], [x - 1 * s, y]], R, { glow: '#fff6a0' });
}

function star(P, x, y, r, color) {
  const pts = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.42 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  P.poly(pts, ramp5(color), { glow: shade(color, 0.3), flat: 0.8 });
}

/* ════════════════════════ PLANS ════════════════════════ */
function headFace(P, k, hx, hy, hr, o) {
  const { eye, back, closed, sharp, glowEyes, snout, mouth, cheek, R } = o;
  if (back) {
    // vue de dos (3/4 arrière) : on devine la joue et le museau, une mèche sur le crâne
    if (snout !== 'none' && snout !== 'beak') P.ell(hx - hr * 0.86, hy + hr * 0.3, hr * 0.26, hr * 0.22, o.RB, { lift: 0.05 });
    else if (snout === 'beak') P.poly([[hx - hr * 0.8, hy + hr * 0.12], [hx - hr * 1.22, hy + hr * 0.3], [hx - hr * 0.8, hy + hr * 0.45]], ramp5(o.beak || '#ffb02e'));
    P.ell(hx - hr * 0.84, hy - hr * 0.08, Math.max(0.8, hr * 0.08), Math.max(1, hr * 0.16), ['#1a1020', '#1a1020', '#2a1a28', '#2a1a28', '#3a2a38'], { outline: false });
    const RA2 = o.RA || R;
    P.poly([[hx - hr * 0.15, hy - hr * 0.86], [hx + hr * 0.12, hy - hr * 1.12], [hx + hr * 0.2, hy - hr * 0.84], [hx + hr * 0.42, hy - hr * 1.0], [hx + hr * 0.45, hy - hr * 0.7]], R.map((c) => shade(c, 0.08)), {});
    P.ell(hx + hr * 0.15, hy + hr * 0.35, hr * 0.55, hr * 0.28, R.map((c) => shade(c, -0.12)), { outline: false, cut: (u, v) => v < 0 });
    return;
  }
  // museau
  if (snout === 'fox' || snout === 'dog' || snout === 'long') {
    const len = snout === 'long' ? 0.78 : snout === 'fox' ? 0.66 : 0.55;
    P.ell(hx - hr * len, hy + hr * 0.3, hr * (snout === 'long' ? 0.44 : 0.38), hr * 0.28, o.RB, { lift: 0.08 });
    P.ell(hx - hr * (len + (snout === 'long' ? 0.38 : 0.32)), hy + hr * 0.2, Math.max(0.9, hr * 0.13), Math.max(0.8, hr * 0.1), ['#120a14', '#1e1420', '#2a1e2a', '#4a3a48', '#6a5a68'], { outline: false });
  } else if (snout === 'beak') {
    const Rb = ramp5(o.beak || '#ffb02e');
    P.poly([[hx - hr * 0.62, hy + hr * 0.05], [hx - hr * 1.35, hy + hr * 0.3], [hx - hr * 0.62, hy + hr * 0.55]], Rb);
  } else if (snout === 'muzzle') {
    P.ell(hx - hr * 0.52, hy + hr * 0.36, hr * 0.36, hr * 0.26, o.RB, { lift: 0.1 });
    P.dot(hx - hr * 0.78, hy + hr * 0.24, '#1e1420');
  }
  // yeux (le proche et le lointain)
  const es = hr * (o.eyeSize || 0.36);
  const ey = hy + hr * (snout === 'beak' ? -0.1 : 0.0);
  P.eye(hx + hr * 0.38, ey, es * 0.9, eye, { closed, sharp, glow: glowEyes, far: true });
  P.eye(hx - hr * 0.3, ey, es, eye, { closed, sharp, glow: glowEyes });
  if (cheek) { P.ell(hx - hr * 0.62, hy + hr * 0.42, Math.max(1, hr * 0.16), Math.max(0.8, hr * 0.1), ramp5(cheek), { outline: false, glow: cheek === '#ffd23f' ? '#ffe66a' : false }); }
  if (mouth === 'fangs' && snout !== 'beak') { P.dot(hx - hr * 0.62, hy + hr * 0.62, '#ffffff'); P.dot(hx - hr * 0.42, hy + hr * 0.6, '#ffffff'); }
  else if (mouth !== 'none' && snout !== 'beak' && snout !== 'fox' && snout !== 'dog' && snout !== 'long') { P.dot(hx - hr * 0.42, hy + hr * 0.58, '#3a1a28'); P.dot(hx - hr * 0.32, hy + hr * 0.62, '#3a1a28'); }
}

function ears(P, kind, hx, hy, hr, R, RA, frame) {
  const tw = frame === 2 ? 0.08 : 0;
  const pairs = [[0.45, -1], [-0.25, 1]];
  for (const [ox, side] of pairs) {
    const far = side > 0;
    const Rr = far ? R.map((c) => shade(c, -0.18)) : R;
    const bx = hx + hr * ox, by = hy - hr * 0.62;
    switch (kind) {
      case 'fox': case 'cat': {
        const h = hr * (kind === 'fox' ? 1.05 : 0.8), w = hr * (kind === 'fox' ? 0.42 : 0.4);
        const tip = [bx + (far ? 0.25 : -0.15) * hr + tw * hr, by - h];
        P.poly([[bx - w, by + hr * 0.15], tip, [bx + w, by + hr * 0.2]], Rr, { pat: (s, t) => (s > 0.3 && s < 0.7 && t > 0.35 ? RA[3] : null) });
        break;
      }
      case 'round': P.ell(bx, by - hr * 0.1, hr * 0.32, hr * 0.3, Rr, { pat: (u, v) => (u * u + v * v < 0.3 ? RA[3] : null) }); break;
      case 'long': P.ell(bx + (far ? 0.2 : -0.1) * hr, by - hr * 0.75, hr * 0.22, hr * 0.85, Rr, { rot: -0.15 + tw, pat: (u, v) => (Math.abs(u) < 0.4 && v > -0.6 ? RA[3] : null) }); break;
      case 'fin': P.poly([[bx - hr * 0.3, by + hr * 0.3], [bx + hr * 0.1, by - hr * 0.7], [bx + hr * 0.45, by + hr * 0.25]], RA, {}); break;
      case 'horn': P.poly([[bx - hr * 0.15, by + hr * 0.2], [bx + (far ? 0.25 : -0.05) * hr, by - hr * 0.8], [bx + hr * 0.18, by + hr * 0.2]], ramp5('#f0e6d0'), {}); break;
      case 'antenna': {
        P.limb(bx, by + hr * 0.2, bx - hr * 0.25 * (far ? -1 : 1), by - hr * 0.9, Math.max(1, hr * 0.12), R, { outline: true });
        P.ell(bx - hr * 0.25 * (far ? -1 : 1), by - hr * 0.95, hr * 0.17, hr * 0.17, RA, { glow: RA[3] });
        P.emit(bx - hr * 0.25 * (far ? -1 : 1), by - hr * 0.95, 'tip');
        break;
      }
      case 'feather': P.poly([[bx - hr * 0.2, by + hr * 0.25], [bx - hr * 0.55, by - hr * 0.7], [bx + hr * 0.05, by - hr * 0.2], [bx + hr * 0.2, by + hr * 0.25]], RA, {}); break;
      case 'sprout': if (!far) { P.limb(hx, hy - hr * 0.9, hx, hy - hr * 1.3, Math.max(1, hr * 0.12), ramp5('#3f8a34'), {}); leafShape(P, hx, hy - hr * 1.3, hr * 0.7, hr * 0.22, -2.5, ramp5('#6fcf5a')); leafShape(P, hx, hy - hr * 1.3, hr * 0.7, hr * 0.22, -0.6, ramp5('#6fcf5a')); } break;
      default: break;
    }
  }
}

function tail(P, kind, x, y, s, R, RA, frame, T) {
  const sway = Math.sin((frame / 4) * Math.PI * 2) * 0.18;
  switch (kind) {
    case 'fluffy': {
      P.ell(x + 6 * s, y - 7 * s, 5.5 * s, 9 * s, R, { rot: -0.6 + sway, pat: (u, v) => (v < -0.55 ? RA[3] : null) });
      break;
    }
    case 'flame': {
      P.limb(x, y, x + 5 * s, y - 6 * s, 3.2 * s, R, { taper: 0.4 });
      flame(P, x + 6 * s, y - 6 * s, 11 * s, 4.5 * s, frame, { color: T.flameColor || 'feu', lean: 0.3 + sway });
      break;
    }
    case 'leaf': P.limb(x, y, x + 5 * s, y - 4 * s, 2.4 * s, R, { taper: 0.4 }); leafShape(P, x + 5 * s, y - 4 * s, 10 * s, 3.4 * s, -1.0 + sway, ramp5(T.leaf || '#5fc84a')); break;
    case 'bolt': P.limb(x, y, x + 4 * s, y - 3 * s, 2.4 * s, R, {}); bolt(P, x + 3 * s, y - 2 * s, 1.1 * s, RA); P.emit(x + 6 * s, y - 12 * s, 'spark'); break;
    case 'fin': P.poly([[x, y - 2 * s], [x + 12 * s, y - 9 * s + sway * 8 * s], [x + 9 * s, y], [x + 12 * s, y + 6 * s - sway * 6 * s], [x, y + 2 * s]], RA, {}); break;
    case 'thin': P.limb(x, y, x + 7 * s, y - 9 * s + sway * 6 * s, 1.8 * s, R, { taper: 0.5 }); P.ell(x + 7.5 * s, y - 10 * s + sway * 6 * s, 2 * s, 2 * s, RA, {}); break;
    case 'club': P.limb(x, y, x + 6 * s, y - 3 * s, 3.4 * s, R, {}); P.ell(x + 8 * s, y - 4 * s, 4 * s, 3.4 * s, RA, {}); break;
    case 'wisp': P.poly([[x - 2 * s, y - 4 * s], [x + 6 * s, y - 2 * s], [x + 13 * s + sway * 10 * s, y + 3 * s], [x + 5 * s, y + 3 * s]], R, { glow: T.glowEdge ? RA[3] : false }); P.emit(x + 12 * s, y + 2 * s, 'wisp'); break;
    case 'star': P.limb(x, y, x + 6 * s, y - 7 * s, 2 * s, R, { taper: 0.4 }); star(P, x + 7 * s, y - 9 * s + sway * 4 * s, 4.5 * s, T.starColor || '#ffe48a'); P.emit(x + 7 * s, y - 9 * s, 'star'); break;
    case 'crystal': P.limb(x, y, x + 5 * s, y - 4 * s, 2.6 * s, R, {}); crystal(P, x + 6 * s, y - 3 * s, 11 * s, 3.2 * s, T.crystal || '#8fe3f2', 2 * s); P.emit(x + 7 * s, y - 13 * s, 'frost'); break;
    case 'long': P.limb(x, y, x + 9 * s, y - 2 * s, 3.6 * s, R, { taper: 0.55 }); P.limb(x + 8 * s, y - 2 * s, x + 14 * s, y - 7 * s + sway * 6 * s, 2 * s, R, { taper: 0.6 }); break;
    case 'spade': P.limb(x, y, x + 9 * s, y - 6 * s + sway * 4 * s, 2.2 * s, R, { taper: 0.3 }); P.poly([[x + 9 * s, y - 3 * s], [x + 15 * s, y - 9 * s], [x + 9 * s, y - 12 * s], [x + 6 * s, y - 7 * s]], RA, {}); break;
    default: break;
  }
}

/** Accessoires de stade / de type autour d'une tête ou d'un corps. */
function extras(P, list, ctx) {
  const { hx, hy, hr, bx, by, br, R, RA, frame, T, s } = ctx;
  for (const e of list) switch (e) {
    case 'mane': for (let i = 0; i < 7; i++) { const a = -2.6 + (i / 6) * 2.2; const rr = hr * 1.05; P.ell(hx + Math.cos(a) * rr * 0.9 + hr * 0.35, hy + Math.sin(a) * rr * 0.9 + hr * 0.15, hr * 0.42, hr * 0.32, RA, { rot: a, under: true }); } break;
    case 'flamemane': for (let i = 0; i < 3; i++) flame(P, hx + hr * (0.1 + i * 0.45), hy - hr * (0.7 - i * 0.1), hr * (0.95 - i * 0.15), hr * 0.32, (frame + i) % 4, { color: T.flameColor || 'feu', lean: 0.5 }); break;
    case 'headflame': flame(P, hx + hr * 0.1, hy - hr * 0.75, hr * 1.0, hr * 0.38, frame, { color: T.flameColor || 'feu' }); break;
    case 'horns': for (const [ox, far] of [[-0.1, false], [0.45, true]]) P.poly([[hx + hr * ox - hr * 0.14, hy - hr * 0.7], [hx + hr * (ox - 0.35), hy - hr * 1.55], [hx + hr * ox + hr * 0.16, hy - hr * 0.72]], ramp5(T.horn || '#f0e6d0').map((c) => (far ? shade(c, -0.2) : c)), {}); break;
    case 'antlers': for (const [ox, far] of [[-0.05, false], [0.5, true]]) { const Rr = ramp5(T.horn || '#c8a070').map((c) => (far ? shade(c, -0.2) : c)); P.limb(hx + hr * ox, hy - hr * 0.7, hx + hr * (ox - 0.2), hy - hr * 1.6, Math.max(1, hr * 0.16), Rr, {}); P.limb(hx + hr * (ox - 0.12), hy - hr * 1.15, hx + hr * (ox - 0.6), hy - hr * 1.45, Math.max(1, hr * 0.12), Rr, {}); P.limb(hx + hr * (ox - 0.17), hy - hr * 1.4, hx + hr * (ox + 0.2), hy - hr * 1.75, Math.max(1, hr * 0.12), Rr, {}); } break;
    case 'crest': P.poly([[hx + hr * 0.1, hy - hr * 0.85], [hx + hr * 0.35, hy - hr * 1.6], [hx + hr * 0.7, hy - hr * 1.3], [hx + hr * 0.6, hy - hr * 0.7]], RA, {}); break;
    case 'halo': {
      const X = P.X(hx + hr * 0.1), Y = P.Y(hy - hr * 1.25), rx = hr * 0.75 * P.S, ry = hr * 0.22 * P.S;
      P.part([X - rx - 2, Y - ry - 2, X + rx + 2, Y + ry + 2], (x, y) => { const u = (x + 0.5 - X) / rx, v = (y + 0.5 - Y) / ry; const d = u * u + v * v; return d <= 1 && d > 0.45 ? (v < 0 ? '#fff6c0' : '#ffd23f') : null; }, { outline: false, glow: '#ffe48a' });
      P.emit(hx + hr * 0.1, hy - hr * 1.25, 'mote');
      break;
    }
    case 'crown': P.poly([[hx - hr * 0.35, hy - hr * 0.75], [hx - hr * 0.4, hy - hr * 1.3], [hx - hr * 0.1, hy - hr * 1.0], [hx + hr * 0.15, hy - hr * 1.45], [hx + hr * 0.35, hy - hr * 1.0], [hx + hr * 0.65, hy - hr * 1.3], [hx + hr * 0.6, hy - hr * 0.72]], ramp5('#ffd23f'), { glow: '#ffe48a' }); break;
    case 'crystals': for (let i = 0; i < 3; i++) crystal(P, bx + br * (0.1 + i * 0.4), by - br * 0.7 + Math.abs(i - 1) * br * 0.15, br * (0.7 - Math.abs(i - 1) * 0.15), br * 0.18, T.crystal || '#8fe3f2', br * 0.08); P.emit(bx + br * 0.5, by - br * 1.3, 'frost'); break;
    case 'spikes': for (let i = 0; i < 4; i++) P.poly([[bx + br * (-0.4 + i * 0.35), by - br * 0.75], [bx + br * (-0.3 + i * 0.35), by - br * 1.35], [bx + br * (-0.1 + i * 0.35), by - br * 0.8]], RA, { under: true }); break;
    case 'plates': for (let i = 0; i < 3; i++) P.ell(bx + br * (-0.3 + i * 0.4), by - br * 0.72, br * 0.32, br * 0.22, ramp5(T.plate || '#a8a098'), { rot: 0.3 }); break;
    case 'shell': P.ell(bx + br * 0.25, by - br * 0.35, br * 0.95, br * 0.8, ramp5(T.shell || '#c8805a'), { pat: (u, v, x, y) => ((Math.round(u * 4) + Math.round(v * 4)) % 3 === 0 && u * u + v * v < 0.8 ? shade(T.shell || '#c8805a', 0.3) : null) }); break;
    case 'wings': case 'bigwings': {
      const big = e === 'bigwings';
      const wc = T.wing || RA[2];
      const Rw = ramp5(wc);
      const flap = Math.sin((frame / 4) * Math.PI * 2) * (big ? 2.5 : 1.5) * s;
      const wx = bx + br * 0.2, wy = by - br * 0.55;
      const span = br * (big ? 2.0 : 1.3);
      // bras de l'aile puis plumes / membrane en festons
      const tipX = wx + span * 0.95, tipY = wy - span * 0.7 - flap;
      const pts = [[wx, wy], [wx + span * 0.4, wy - span * 0.62 - flap * 0.7], [tipX, tipY]];
      const N = big ? 5 : 4;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const ex = tipX - t * span * 0.75, ey = tipY + span * (0.35 + t * 0.55);
        pts.push([ex + span * 0.08, ey - span * 0.12]);
        pts.push([ex, ey]);
      }
      pts.push([wx + span * 0.05, wy + span * 0.2]);
      P.poly(pts, Rw, { under: true, glow: T.wingGlow ? shade(wc, 0.25) : false, pat: (u, v, x, y) => (v < 0.22 ? Rw[3] : (Math.round(u * N * 2) % 2 === 0 ? Rw[1] : null)) });
      P.emit(tipX, tipY, 'wing');
      break;
    }
    case 'bugwings': {
      const flap = frame % 2 ? 1.5 * s : 0;
      for (const [ox, sc] of [[0, 1], [br * 0.25, 0.8]]) {
        const wx = bx + ox, wy = by - br * 0.7;
        const X = P.X(wx + br * 0.5 * sc), Y = P.Y(wy - br * 0.8 * sc - flap / P.S), rx = br * 0.6 * sc * P.S, ry = br * 0.95 * sc * P.S;
        const wid = P.part([X - rx - 1, Y - ry - 1, X + rx + 1, Y + ry + 1], (x, y) => {
          const u = (x + 0.5 - X) / rx, v = (y + 0.5 - Y) / ry;
          if (u * u + v * v > 1) return null;
          return u * u + v * v > 0.75 ? shade(T.wing || '#c8f0ff', -0.35) : (x + y) % 4 === 0 ? '#ffffff' : (T.wing || '#c8f0ff');
        }, { outline: false, under: true });
        if (T.wingGlow) {
          // seules quelques nervures scintillent (sinon le halo noie l'aile)
          for (let y = Math.floor(Y - ry); y <= Math.ceil(Y + ry); y++) for (let x = Math.floor(X - rx); x <= Math.ceil(X + rx); x++) {
            if (x < 0 || y < 0 || x >= P.W || y >= P.H || P.owner[y * P.W + x] !== wid) continue;
            const u = (x + 0.5 - X) / rx, v = (y + 0.5 - Y) / ry, d = u * u + v * v;
            if (d > 0.6 && (x + y + frame) % 3 === 0) P.em.set(x, y, shade(T.wing || '#c8f0ff', 0.3));
          }
        }
      }
      break;
    }
    case 'leaves': for (let i = 0; i < 4; i++) leafShape(P, bx + br * (-0.2 + i * 0.3), by - br * 0.6, br * 0.7, br * 0.2, -2.2 + i * 0.45, ramp5(T.leaf || '#5fc84a'), { under: true }); break;
    case 'flower': {
      const fx = hx + hr * 0.2, fy = hy - hr * 1.05;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; P.ell(fx + Math.cos(a) * hr * 0.32, fy + Math.sin(a) * hr * 0.25, hr * 0.26, hr * 0.2, ramp5(T.petal || '#ff8ac0'), { rot: a }); }
      P.ell(fx, fy, hr * 0.17, hr * 0.15, ramp5('#ffd23f'), { glow: '#ffe66a' });
      P.emit(fx, fy, 'pollen');
      break;
    }
    case 'bubbles': for (let i = 0; i < 3; i++) P.ell(bx - br * 0.2 + i * br * 0.4, by - br * (1.0 + (i % 2) * 0.3), br * 0.12, br * 0.12, ['#5aa2e6', '#8ac6f4', '#c8ecff', '#ffffff', '#ffffff'], { outline: false }); P.emit(bx, by - br, 'bubble'); break;
    case 'stars': for (let i = 0; i < 3; i++) { const a = frame * 0.6 + i * 2.1; star(P, bx + Math.cos(a) * br * 1.3, by - br * 0.6 + Math.sin(a) * br * 0.5, br * 0.16, T.starColor || '#ffe48a'); } P.emit(bx, by - br, 'star'); break;
    case 'orbs': for (let i = 0; i < 2; i++) { const a = frame * 0.8 + i * Math.PI; P.ell(bx + Math.cos(a) * br * 1.35, by - br * 0.9 + Math.sin(a) * br * 0.4, br * 0.15, br * 0.15, ramp5(T.orb || RA[3]), { glow: T.orb || RA[3], outline: false }); } break;
    case 'scarf': P.ell(hx + hr * 0.3, hy + hr * 0.9, hr * 0.75, hr * 0.28, ramp5(T.scarf || '#e83a4a'), { rot: 0.1 }); P.poly([[hx + hr * 0.7, hy + hr * 0.9], [hx + hr * 1.5, hy + hr * 1.2 + Math.sin(frame) * 1.5], [hx + hr * 0.8, hy + hr * 1.25]], ramp5(T.scarf || '#e83a4a'), {}); break;
    case 'gem': P.ell(hx - hr * 0.05, hy - hr * 0.55, hr * 0.16, hr * 0.16, ramp5(T.gem || '#ff5a8a'), { glow: T.gem || '#ff5a8a' }); break;
    case 'drips': for (let i = 0; i < 3; i++) { const dx = bx - br * 0.5 + i * br * 0.5, dy = by + br * 0.15 + ((frame + i) % 4) * 0.8 * s; P.ell(dx, dy, br * 0.08, br * 0.13, ramp5(T.drip || '#b25ad9'), { outline: false, glow: T.drip }); } P.emit(bx, by, 'drip'); break;
    case 'gears': P.ell(bx + br * 0.4, by - br * 0.3, br * 0.32, br * 0.32, ramp5('#a9b4c2'), { pat: (u, v) => (u * u + v * v < 0.18 ? '#4a4e5a' : Math.round(Math.atan2(v, u) * 2.5) % 2 === 0 && u * u + v * v > 0.7 ? '#e4ecf6' : null) }); break;
    default: break;
  }
}

/* ── Quadrupède (renard, félin, loup, cerf, lion…) ── */
function paw(P, x, y, w, R) { P.ell(x - w * 0.15, y - w * 0.32, w * 0.62, w * 0.42, R, { lift: 0.05 }); }
function drawQuad(P, k, o) {
  const { s, R, RB, RA, RD, frame, back } = o;
  const breath = frame === 1 || frame === 2 ? 1 : 0;
  const bulk = o.bulk || 1;
  const legH = (o.legs || 1) * 6 * s;
  const brx = 12 * s * bulk, bry = 8.2 * s * bulk;
  const bx = 5 * s, by = -legH - bry * 0.55;
  const hr = 11.5 * s * (o.headK || 1);
  const hx = -8.5 * s, hy = by - bry * 0.55 - hr * 0.62 + breath * 0.5;
  // pattes du côté lointain
  for (const lx of [-0.55, 0.62]) { P.limb(bx + brx * lx + 1.5 * s, by + bry * 0.3, bx + brx * lx + 1.5 * s, -2 * s, 4.4 * s, RD, {}); paw(P, bx + brx * lx + 1.5 * s, 0, 4.4 * s, RD); }
  tail(P, o.tail, bx + brx * 0.8, by - bry * 0.25, s, R, RA, frame, o.T);
  if (o.wool) {
    // toison en nuage : boucles claires autour du corps
    const W = ramp5(o.wool);
    P.ell(bx, by, brx * 0.95, bry * 0.95, W, {});
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.3; P.ell(bx + Math.cos(a) * brx * 0.78, by + Math.sin(a) * bry * 0.72 - breath * 0.3, brx * 0.36, bry * 0.42, W, { lift: 0.06 }); }
  } else
  P.ell(bx, by - breath * 0.3, brx, bry - breath * 0.2, R, { rim: o.rim, pat: (u, v, x, y) => (!back && v > 0.45 && u < 0.4 ? RB[2] : pattern(o, u, v, x, y, 'body')) });
  if (o.extrasBody.length) extras(P, o.extrasBody, { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: o.T, s });
  // pattes du côté proche
  for (const lx of [-0.72, 0.42]) {
    const X = bx + brx * lx;
    P.limb(X, by + bry * 0.35, X - 0.5 * s, -2 * s, 5 * s, R, {});
    paw(P, X - 0.5 * s, 0, 5 * s, o.socks ? ramp5(o.socks) : R);
  }
  // poitrail duveteux
  if (!back) P.poly([[hx + hr * 0.15, hy + hr * 0.55], [hx + hr * 0.95, hy + hr * 0.75], [hx + hr * 0.55, hy + hr * 1.45], [hx + hr * 0.25, hy + hr * 1.15], [hx - hr * 0.05, hy + hr * 1.3]], RB, {});
  ears(P, o.ears, hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr, hr * 0.9, R, { rim: o.rim, pat: (u, v, x, y) => pattern(o, u, v, x, y, 'head') });
  if (o.extrasHead.length) extras(P, o.extrasHead, { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: o.snout || 'fox' });
  P.emit(bx + brx * 0.9, by - bry * 1.2, 'back');
}

/* ── Bipède (ours, loutre, humanoïde, kangourou…) ── */
function drawBiped(P, k, o) {
  const { s, R, RB, RA, RD, frame, back } = o;
  const breath = frame === 1 || frame === 2 ? 1 : 0;
  const bx = 1 * s, by = -12 * s, brx = 9.5 * s * (o.bulk || 1), bry = 11 * s * (o.bulk || 1);
  const hr = 11 * s * (o.headK || 1);
  const hx = -2 * s, hy = by - bry - hr * 0.55 + breath * 0.5;
  tail(P, o.tail, bx + brx * 0.7, by + 2 * s, s, R, RA, frame, o.T);
  P.limb(bx + 4 * s, by + bry * 0.5, bx + 5 * s, -1, 5 * s, RD, {});
  P.ell(bx + 4.5 * s, -1.5 * s, 4 * s, 2.4 * s, RD, {});
  P.ell(bx, by, brx, bry, R, { rim: o.rim, pat: (u, v, x, y) => (!back && u < 0.35 && Math.hypot(u + 0.12, v - 0.1) < 0.62 ? RB[Math.min(4, 2 + (v < -0.2 ? 1 : 0))] : pattern(o, u, v, x, y, 'body')) });
  if (o.extrasBody.length) extras(P, o.extrasBody, { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: o.T, s });
  P.limb(bx - 4 * s, by + bry * 0.5, bx - 5 * s, -1, 5.2 * s, R, {});
  P.ell(bx - 5.5 * s, -1.5 * s, 4.4 * s, 2.5 * s, R, {});
  // bras
  P.limb(bx + brx * 0.6, by - bry * 0.4, bx + brx * 0.9, by + 2 * s - breath * 0.5, 3.6 * s, RD, {});
  P.limb(bx - brx * 0.55, by - bry * 0.45, bx - brx * 1.05, by + 1 * s + breath * 0.5, 3.8 * s, R, {});
  P.emit(bx - brx * 1.05, by + 1 * s, 'hand');
  ears(P, o.ears, hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr, hr * 0.95, R, { rim: o.rim, pat: (u, v, x, y) => pattern(o, u, v, x, y, 'head') });
  if (o.extrasHead.length) extras(P, o.extrasHead, { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: o.snout || 'muzzle' });
}

/* ── Oiseau ── */
function drawBird(P, k, o) {
  const { s, R, RB, RA, frame, back } = o;
  const bob = frame === 1 || frame === 2 ? 1 : 0;
  const bx = 3 * s, by = -14 * s - bob * 0.5, br = 10.5 * s * (o.bulk || 1);
  const hr = 9 * s * (o.headK || 1);
  const hx = -6 * s, hy = by - br * 0.95;
  if (o.stage >= 3 || o.extrasBody.includes('bigwings')) extras(P, ['bigwings'], { hx, hy, hr, bx, by, br, R, RA, frame, T: { ...o.T, wing: o.T.wing || R[2] }, s });
  // queue en éventail
  const sway = Math.sin(frame * 1.57) * 0.1;
  for (let i = 0; i < 3; i++) P.poly([[bx + br * 0.6, by - br * 0.1], [bx + br * (1.5 + i * 0.1), by - br * (0.5 - i * 0.4) + sway * 6], [bx + br * (1.3 + i * 0.1), by - br * (0.15 - i * 0.4)]], i === 1 ? RA : R, {});
  for (const lx of [-2, 3]) { P.limb(bx + lx * s, by + br * 0.7, bx + lx * s, -1, 1.6 * s, ramp5(o.T.beak || '#ffb02e'), { outline: true }); }
  P.ell(bx, by, br * 1.05, br * 0.92, R, { rim: o.rim, pat: (u, v, x, y) => (!back && u < 0.1 && v > -0.2 ? RB[u < -0.5 ? 3 : 2] : pattern(o, u, v, x, y, 'body')) });
  // aile repliée
  const flap = frame % 2 ? -1 : 0;
  P.ell(bx + br * 0.25, by - br * 0.05 + flap, br * 0.75, br * 0.5, RA.map((c) => shade(c, -0.05)), { rot: 0.35, pat: (u, v, x, y) => (u > 0.2 && Math.round((u + v) * 5) % 2 === 0 ? RA[1] : null) });
  extras(P, o.extrasBody.filter((e) => e !== 'bigwings' && e !== 'wings'), { hx, hy, hr, bx, by, br, R, RA, frame, T: o.T, s });
  ears(P, o.ears, hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr, hr, R, { rim: o.rim, pat: (u, v, x, y) => pattern(o, u, v, x, y, 'head') });
  extras(P, o.extrasHead, { hx, hy, hr, bx, by, br, R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: 'beak', beak: o.T.beak || '#ffb02e' });
  P.emit(bx + br, by - br * 0.6, 'wing');
}

/* ── Insecte ── */
function drawInsect(P, k, o) {
  if (o.variant && INSECT_VARIANTS[o.variant]) return INSECT_VARIANTS[o.variant](P, k, o);
  const { s, R, RB, RA, RD, frame } = o;
  const bob = frame % 2;
  const hr = 7.5 * s * (o.headK || 1);
  const ax = 10 * s, ay = -10 * s, ar = 8.5 * s * (o.bulk || 1);
  const tx = 0, ty = -11 * s - bob * 0.5;
  const hx = -9 * s, hy = -16 * s - bob * 0.5;
  if (o.extrasBody.includes('bugwings')) extras(P, ['bugwings'], { hx, hy, hr, bx: tx, by: ty, br: ar, R, RA, frame, T: o.T, s });
  for (let i = 0; i < 3; i++) P.limb(tx + (i - 1) * 4 * s + 2 * s, ty + 3 * s, tx + (i - 1) * 6 * s + 5 * s, -1, 1.6 * s, RD, {});
  P.ell(ax, ay, ar * 1.15, ar * 0.85, R, { rim: o.rim, pat: (u, v, x, y) => (Math.round((u + 1) * 3.2) % 2 === 0 && v > -0.85 ? RA[Math.min(4, 2 + (v < 0 ? 1 : 0))] : pattern(o, u, v, x, y, 'body')) });
  P.ell(tx, ty, ar * 0.62, ar * 0.62, RA, {});
  for (let i = 0; i < 3; i++) P.limb(tx + (i - 1) * 4 * s, ty + 3 * s, tx + (i - 1) * 6 * s - 2 * s, -1, 1.8 * s, R, {});
  extras(P, o.extrasBody.filter((e) => e !== 'bugwings'), { hx, hy, hr, bx: ax, by: ay, br: ar, R, RA, frame, T: o.T, s });
  ears(P, o.ears || 'antenna', hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr, hr * 0.95, R, { rim: o.rim });
  if (o.mandibles && !o.back) for (const dy of [0.35, 0.6]) P.poly([[hx - hr * 0.7, hy + hr * dy], [hx - hr * 1.4, hy + hr * (dy - 0.05)], [hx - hr * 0.8, hy + hr * (dy + 0.2)]], ramp5('#e8dcc0'), {});
  extras(P, o.extrasHead, { hx, hy, hr, bx: ax, by: ay, br: ar, R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: 'none', eyeSize: 0.42 });
}


/* Variantes d'arthropodes */
const INSECT_VARIANTS = {
  spider(P, k, o) {
    const { s, R, RA, RD, frame, back } = o;
    const bob = frame % 2 ? 0.6 : 0;
    const ax = 8 * s, ay = -13 * s - bob, ar = 10 * s * (o.bulk || 1);
    const cx = -5 * s, cy = -9 * s - bob, cr = 6.8 * s;
    // pattes lointaines puis abdomen, céphalothorax, pattes proches
    const legs = (far) => { for (let i = 0; i < 4; i++) { const bxL = cx + (i - 1.5) * 3 * s, kx = bxL + (i - 1.5) * 4 * s + (far ? 2 * s : -1 * s), kyy = cy - 9 * s + Math.abs(i - 1.5) * 1.5 * s + (frame + i) % 2 * 0.6; P.limb(bxL, cy, kx, kyy, 1.7 * s, far ? RD : R, {}); P.limb(kx, kyy, kx + (i - 1.5) * 3.2 * s, -0.5, 1.4 * s, far ? RD : R, { taper: 0.4 }); } };
    legs(true);
    P.ell(ax, ay, ar * 1.05, ar * 0.9, R, { rim: o.rim, pat: (u, v, x, y) => (Math.abs(u) < 0.18 && v < 0.6 ? RA[3] : (u * u + (v + 0.35) ** 2 < 0.06 ? RA[2] : pattern(o, u, v, x, y, 'body'))) });
    P.ell(cx, cy, cr, cr * 0.85, R, { rim: o.rim });
    legs(false);
    extras(P, o.extrasBody, { hx: cx, hy: cy, hr: cr, bx: ax, by: ay, br: ar, R, RA, frame, T: o.T, s });
    if (!back) {
      P.eye(cx - cr * 0.45, cy - cr * 0.15, cr * 0.32, o.eye, { closed: o.closed, glow: o.glowEyes });
      P.eye(cx + cr * 0.1, cy - cr * 0.2, cr * 0.26, o.eye, { closed: o.closed, glow: o.glowEyes, far: true });
      P.dot(cx - cr * 0.15, cy - cr * 0.62, RA[3]); P.dot(cx + cr * 0.25, cy - cr * 0.6, RA[3]);
      for (const dy of [0.45]) P.poly([[cx - cr * 0.8, cy + cr * dy], [cx - cr * 1.1, cy + cr * (dy + 0.55)], [cx - cr * 0.55, cy + cr * (dy + 0.25)]], ramp5('#e8dcc0'), {});
    }
    P.emit(ax, ay - ar, 'back');
  },
  scorpion(P, k, o) {
    const { s, R, RB, RA, RD, frame, back } = o;
    const sw = Math.sin((frame / 4) * Math.PI * 2) * 1.2 * s;
    const bx = 3 * s, by = -6.5 * s, brx = 10 * s * (o.bulk || 1), bry = 5 * s;
    for (let i = 0; i < 3; i++) P.limb(bx + (i - 1) * 5 * s + 2 * s, by + 2 * s, bx + (i - 1) * 6 * s + 5 * s, -0.5, 1.5 * s, RD, {});
    // queue recourbée et dard
    const seg = [[bx + brx * 0.9, by - 1 * s], [bx + brx * 1.25, by - 7 * s], [bx + brx * 1.2, by - 14 * s], [bx + brx * 0.85, by - 20 * s + sw], [bx + brx * 0.35, by - 23 * s + sw]];
    seg.forEach(([x, y], i) => P.ell(x, y, (4 - i * 0.4) * s, (3.4 - i * 0.3) * s, i % 2 ? R : RA, {}));
    const [tx, ty] = seg[4];
    P.poly([[tx - 1 * s, ty - 1.5 * s], [tx - 5.5 * s, ty + 1.5 * s], [tx - 0.5 * s, ty + 2 * s]], ramp5(o.T.flameColor ? '#ffb02e' : '#f0e0c0'), { glow: o.T.flameColor ? '#ffd23f' : false });
    P.emit(tx - 5 * s, ty + 1 * s, o.T.flameColor ? 'ember' : 'drip');
    P.ell(bx, by, brx, bry, R, { rim: o.rim, pat: (u, v, x, y) => (Math.round((u + 1) * 3) % 2 === 0 && v < 0.3 ? RA[2] : null) });
    for (let i = 0; i < 3; i++) P.limb(bx + (i - 1) * 5 * s, by + 2 * s, bx + (i - 1) * 6 * s - 2 * s, -0.5, 1.6 * s, R, {});
    // pinces
    for (const [oy, far] of [[-1.5, true], [1.5, false]]) {
      const Rr = far ? RD : R;
      P.limb(bx - brx * 0.8, by + oy * s, bx - brx * 1.25, by - 3 * s + oy * s, 2.2 * s, Rr, {});
      P.ell(bx - brx * 1.45, by - 4 * s + oy * s, 3.2 * s, 2.4 * s, Rr, { rot: -0.4 });
      P.poly([[bx - brx * 1.6, by - 5.5 * s + oy * s], [bx - brx * 1.95, by - 7 * s + oy * s], [bx - brx * 1.7, by - 3.8 * s + oy * s]], Rr, {});
    }
    const hx = bx - brx * 0.75, hy = by - 2.5 * s, hr = 5 * s;
    P.ell(hx, hy, hr, hr * 0.8, R, {});
    extras(P, o.extrasHead, { hx, hy, hr, bx, by, br: brx, R, RA, frame, T: o.T, s });
    headFace(P, k, hx, hy, hr, { ...o, snout: 'none', eyeSize: 0.4 });
  },
  mantis(P, k, o) {
    const { s, R, RB, RA, RD, frame, back } = o;
    const bob = frame === 1 || frame === 2 ? 0.6 : 0;
    // abdomen allongé, thorax dressé, tête triangulaire, faux
    for (let i = 0; i < 2; i++) P.limb(2 * s + i * 6 * s, -9 * s, 4 * s + i * 7 * s, -0.5, 1.4 * s, RD, {});
    P.ell(9 * s, -10 * s, 10 * s * (o.bulk || 1), 4.6 * s, R, { rot: -0.35, rim: o.rim, pat: (u, v) => (Math.round((u + 1) * 3) % 2 === 0 ? RA[2] : null) });
    if (o.extrasBody.includes('bugwings')) extras(P, ['bugwings'], { hx: 0, hy: -20 * s, hr: 5 * s, bx: 6 * s, by: -12 * s, br: 7 * s, R, RA, frame, T: o.T, s });
    P.limb(0, -10 * s, -2.5 * s, -21 * s - bob, 4.4 * s, R, {});
    for (let i = 0; i < 2; i++) P.limb(-1 * s + i * 5 * s, -9 * s, -2 * s + i * 6 * s, -0.5, 1.5 * s, R, {});
    const hx = -4 * s, hy = -26 * s - bob, hr = 5.5 * s;
    ears(P, o.ears || 'antenna', hx, hy, hr, R, RA, frame);
    P.poly([[hx - hr * 1.15, hy - hr * 0.55], [hx + hr * 1.0, hy - hr * 0.7], [hx - hr * 0.1, hy + hr * 0.95]], R, { rim: o.rim });
    if (!back) {
      P.eye(hx - hr * 0.62, hy - hr * 0.3, hr * 0.46, o.eye, { closed: o.closed, glow: o.glowEyes, sharp: o.sharp });
      P.eye(hx + hr * 0.45, hy - hr * 0.35, hr * 0.38, o.eye, { closed: o.closed, glow: o.glowEyes, far: true, sharp: o.sharp });
    }
    // faux
    const raise = frame === 2 ? -1.5 * s : 0;
    for (const far of [true, false]) {
      const Rr = far ? RD : RA;
      const ox = far ? 2 * s : 0;
      P.limb(-3 * s + ox, -19 * s, -9 * s + ox, -15 * s + raise, 2 * s, Rr, {});
      P.poly([[-9 * s + ox, -15 * s + raise], [-12 * s + ox, -27 * s + raise], [-7 * s + ox, -16 * s + raise]], ramp5(o.T.blade || shade(RA[2], 0.3)), { glow: o.T.flameColor ? '#ffd23f' : false });
    }
    P.emit(-12 * s, -27 * s, 'tip');
  },
  crab(P, k, o) {
    const { s, R, RB, RA, RD, frame, back } = o;
    const snap = frame === 2 ? 1 : 0;
    const bx = 1 * s, by = -9 * s, brx = 12.5 * s * (o.bulk || 1), bry = 7.5 * s * (o.bulk || 1);
    for (let i = 0; i < 3; i++) P.limb(bx + (i - 0.5) * 5 * s, by + 3 * s, bx + (i - 0.5) * 6 * s + 7 * s, -0.5, 1.8 * s, RD, { taper: 0.4 });
    // pince lointaine
    P.limb(bx - brx * 0.5, by - 1 * s, bx - brx * 0.95, by - 7 * s, 2.6 * s, RD, {});
    P.ell(bx - brx * 1.05, by - 10 * s, 4.2 * s, 3.4 * s, RD, { rot: -0.3 });
    P.ell(bx, by, brx, bry, R, { rim: o.rim, cut: (u, v) => v > 0.75, pat: (u, v, x, y) => (v > 0.35 ? RB[2] : pattern(o, u, v, x, y, 'body')) });
    extras(P, o.extrasBody, { hx: bx - brx * 0.3, hy: by - bry, hr: 5 * s, bx, by, br: brx, R, RA, frame, T: o.T, s });
    for (let i = 0; i < 3; i++) P.limb(bx + (i - 1) * 5 * s, by + 4 * s, bx + (i - 1) * 6 * s - 6 * s, -0.5, 2 * s, R, { taper: 0.4 });
    // pince proche (s'ouvre et se ferme)
    P.limb(bx - brx * 0.7, by + 1 * s, bx - brx * 1.15, by - 3 * s, 3 * s, R, {});
    const cx = bx - brx * 1.3, cy = by - 6.5 * s;
    P.ell(cx, cy, 5.2 * s, 4.2 * s, RA, { rot: -0.2 });
    P.poly([[cx - 3 * s, cy - 2.5 * s], [cx - 8 * s, cy - 6 * s - snap * s], [cx - 4.5 * s, cy - 0.5 * s]], RA, {});
    // yeux pédonculés
    for (const [ex, far] of [[-0.45, false], [0.05, true]]) {
      const X = bx + brx * ex, Y = by - bry * 1.45;
      P.limb(X, by - bry * 0.7, X, Y + 1 * s, 1.4 * s, far ? RD : R, {});
      if (!back) P.eye(X, Y, 2.6 * s, o.eye, { closed: o.closed, glow: o.glowEyes, far });
    }
    if (!back) { P.dot(bx - brx * 0.45, by - bry * 0.2, '#3a1a28'); P.dot(bx - brx * 0.35, by - bry * 0.15, '#3a1a28'); }
    P.emit(cx - 6 * s, cy - 5 * s, 'bubble');
  },
};

/* ── Serpent / anguille (enroulé, cou dressé) ── */
function drawSerpent(P, k, o) {
  const { s, R, RB, RA, frame, back } = o;
  const ph = (frame / 4) * Math.PI * 2;
  const bulk = o.bulk || 1;
  const cx = 3 * s, cy = -7 * s, crx = 12 * s * bulk, cry = 6 * s * bulk, th = 4.2 * s * bulk;
  // anneau arrière (plus sombre)
  const ring = (front) => {
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (front ? 0 : Math.PI) + (i / n) * Math.PI;
      const x = cx + Math.cos(a) * crx, y = cy + Math.sin(a) * cry;
      P.ell(x, y, th, th * 0.85, front ? R : R.map((c) => shade(c, -0.2)), { outline: i === 0 || i === n, pat: (u, v, xx, yy) => (front && v > 0.2 ? RB[2] : pattern(o, u, v, xx, yy, 'body')) });
    }
  };
  P.ell(cx, cy, crx * 0.95, cry * 0.85, R.map((c) => shade(c, -0.35)), { outline: false });
  ring(false);
  // bout de queue
  P.limb(cx + crx, cy, cx + crx + 6 * s, cy - 4 * s + Math.sin(ph) * 2 * s, th * 1.2, R, { taper: 0.75 });
  // cou qui se dresse
  const pts = [];
  const n = 7;
  for (let i = 0; i < n; i++) { const t = i / (n - 1); pts.push([cx - crx * 0.55 + Math.sin(t * 2.6 + ph * 0.25) * 3 * s - t * 4 * s, cy - t * 20 * s * (o.tall || 1)]); }
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i], t = i / (n - 1);
    P.ell(x, y, th * (1.05 - t * 0.15), th * 0.95, R, { outline: i % 2 === 0, pat: (u, v, xx, yy) => (!back && u < -0.15 ? RB[2 + (v < 0 ? 1 : 0)] : pattern(o, u, v, xx, yy, 'body')) });
    if (o.extrasBody.includes('spikes') && i % 2 === 1) P.poly([[x + th * 0.4, y - th * 0.4], [x + th * 1.5, y - th * 0.9], [x + th * 0.6, y + th * 0.3]], RA, {});
  }
  ring(true);
  const [hx0, hy0] = pts[n - 1];
  const hr = 8.5 * s * (o.headK || 1);
  const hx = hx0 - 2 * s, hy = hy0 - 4 * s;
  if (o.hood) P.ell(hx + 2 * s, hy + 3 * s, hr * 1.4, hr * 1.3, RA, { pat: (u, v) => (Math.abs(u) < 0.28 && v > -0.1 ? RB[2] : null) });
  ears(P, o.ears, hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr * 1.05, hr * 0.85, R, { rim: o.rim });
  extras(P, o.extrasHead, { hx, hy, hr, bx: cx, by: cy, br: crx * 0.7, R, RA, frame, T: o.T, s });
  extras(P, o.extrasBody.filter((e) => e !== 'spikes'), { hx, hy, hr, bx: cx, by: cy - 6 * s, br: crx * 0.7, R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: o.snout || 'muzzle', eyeSize: 0.34 });
  if (!back && frame === 2) P.limb(hx - hr * 0.9, hy + hr * 0.35, hx - hr * 1.5, hy + hr * 0.45, 1.2 * s, ramp5('#ff4a6a'), { outline: false });
}

/* ── Spectre / fée flottante / feu follet ── */
function drawFloat(P, k, o) {
  const { s, R, RB, RA, frame } = o;
  const bob = Math.round(Math.sin((frame / 4) * Math.PI * 2) * 1.5);
  const hr = 12 * s * (o.headK || 1);
  const hx = 0, hy = -24 * s + bob;
  const wisp = o.T.ghost;
  // traîne (ou tentacules)
  const sway = Math.sin((frame / 4) * Math.PI * 2) * 2.5 * s;
  if (o.tentacles) {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const tx = hx + (i - (n - 1) / 2) * hr * 0.36, ph = frame * 1.57 + i * 1.3;
      const pts = [];
      for (let j = 0; j <= 4; j++) pts.push([tx + Math.sin(ph + j * 0.9) * 1.6 * s * (j / 4), hy + hr * 0.45 + j * hr * 0.32]);
      for (let j = 0; j < 4; j++) P.limb(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], (2.8 - j * 0.45) * s, i % 2 ? R : RA, { outline: j === 0 || j === 3, glow: o.T.jelly ? shade(R[3], 0.15) : false });
    }
    P.emit(hx, hy + hr * 1.6, o.T.jelly ? 'bubble' : 'drip');
  } else
  P.poly([[hx - hr * 0.8, hy + hr * 0.3], [hx + hr * 0.85, hy + hr * 0.25], [hx + hr * 0.7 + sway, hy + hr * 1.5], [hx + hr * 0.25 + sway * 1.5, hy + hr * 2.0], [hx - hr * 0.2, hy + hr * 1.35], [hx - hr * 0.6, hy + hr * 1.55], [hx - hr * 0.55, hy + hr * 0.9]], R, {
    glow: wisp ? shade(R[3], 0.1) : false, pat: (u, v, x, y) => (wisp && v > 0.6 && (x + y + frame) % 3 === 0 ? R[3] : null),
  });
  P.emit(hx + hr * 0.25 + sway * 1.5, hy + hr * 1.9, 'wisp');
  extras(P, o.extrasBody, { hx, hy, hr, bx: hx, by: hy + hr * 0.6, br: hr * 0.8, R, RA, frame, T: o.T, s });
  // petits bras
  P.ell(hx - hr * 0.95, hy + hr * 0.55, hr * 0.28, hr * 0.2, R, { rot: 0.5 });
  P.ell(hx + hr * 0.95, hy + hr * 0.5, hr * 0.26, hr * 0.18, R.map((c) => shade(c, -0.15)), { rot: -0.5 });
  ears(P, o.ears, hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr, hr * 0.95, R, { rim: o.rim, pat: (u, v, x, y) => pattern(o, u, v, x, y, 'head') });
  extras(P, o.extrasHead, { hx, hy, hr, bx: hx, by: hy + hr, br: hr * 0.8, R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: 'none', eyeSize: 0.4 });
  o.floating = 6 * s;
}

/* ── Poisson ── */
function drawFish(P, k, o) {
  const { s, R, RB, RA, frame } = o;
  const bob = Math.round(Math.sin((frame / 4) * Math.PI * 2));
  const bx = 2 * s, by = -18 * s + bob, rx = 15 * s * (o.bulk || 1), ry = 10 * s * (o.bulk || 1);
  const sway = Math.sin((frame / 4) * Math.PI * 2) * 3 * s;
  P.poly([[bx + rx * 0.75, by], [bx + rx * 1.55, by - ry * 0.95 + sway], [bx + rx * 1.35, by], [bx + rx * 1.55, by + ry * 0.95 - sway], ], RA, {});
  P.poly([[bx - rx * 0.1, by - ry * 0.7], [bx + rx * 0.3, by - ry * 1.55], [bx + rx * 0.65, by - ry * 0.75]], RA, {});
  P.ell(bx, by, rx, ry, R, { rim: o.rim, pat: (u, v, x, y) => (v > 0.25 ? RB[v > 0.6 ? 2 : 3] : pattern(o, u, v, x, y, 'body')) });
  P.poly([[bx - rx * 0.05, by + ry * 0.2], [bx + rx * 0.35, by + ry * 0.75 + sway * 0.3], [bx + rx * 0.3, by + ry * 0.25]], RA.map((c) => shade(c, 0.1)), {});
  extras(P, [...o.extrasBody, ...o.extrasHead], { hx: bx - rx * 0.5, hy: by - ry * 0.2, hr: ry * 0.8, bx, by, br: ry, R, RA, frame, T: o.T, s });
  if (!o.back) {
    P.eye(bx - rx * 0.55, by - ry * 0.12, ry * 0.36, o.eye, { closed: o.closed, glow: o.glowEyes });
    P.dot(bx - rx * 0.92, by + ry * 0.25, '#2a1a28');
  }
  o.floating = 4 * s;
  P.emit(bx - rx, by, 'bubble');
}

/* ── Golem / roc vivant ── */
function drawGolem(P, k, o) {
  const { s, R, RB, RA, RD, frame, back } = o;
  if (o.round) {
    // rocher rond à facettes, bras courts, sourcils épais
    const breath = frame === 1 || frame === 2 ? 0.6 : 0;
    const bx = 0, by = -12.5 * s, r = 12 * s * (o.bulk || 1);
    P.ell(bx + r * 0.95, by + r * 0.15 - breath, 3.8 * s, 3.2 * s, RD, {});
    P.ell(bx, by, r * 1.08, r - breath * 0.3, R, { rim: o.rim, pat: (u, v, x, y) => { const n = valueNoise(x / 3, y / 3, 5); return n > 0.7 ? R[3] : n < 0.22 ? R[1] : hash2(x, y >> 1, 3) < 0.035 ? R[0] : null; } });
    extras(P, o.extrasBody, { hx: bx, hy: by - r * 0.5, hr: r * 0.6, bx, by, br: r, R, RA, frame, T: o.T, s });
    extras(P, o.extrasHead, { hx: bx - r * 0.2, hy: by - r * 0.6, hr: r * 0.5, bx, by, br: r, R, RA, frame, T: o.T, s });
    if (!back) {
      P.eye(bx - r * 0.42, by - r * 0.12, r * 0.2, o.eye, { closed: o.closed, glow: o.glowEyes, sharp: true });
      P.eye(bx + r * 0.08, by - r * 0.14, r * 0.17, o.eye, { closed: o.closed, glow: o.glowEyes, sharp: true, far: true });
      P.limb(bx - r * 0.62, by - r * 0.42, bx - r * 0.22, by - r * 0.36, 2 * s, R.map((c) => shade(c, -0.35)), { outline: false });
      P.limb(bx - r * 0.05, by - r * 0.4, bx + r * 0.25, by - r * 0.44, 1.8 * s, R.map((c) => shade(c, -0.35)), { outline: false });
      P.limb(bx - r * 0.35, by + r * 0.32, bx - r * 0.05, by + r * 0.3, 1.2 * s, ['#2a1a20', '#2a1a20', '#3a2a30', '#3a2a30', '#3a2a30'], { outline: false });
    }
    P.ell(bx - r * 1.05, by + r * 0.2 + breath, 4.2 * s, 3.6 * s, R, { lift: 0.05 });
    P.emit(bx - r * 1.05, by + r * 0.2, 'hand');
    return;
  }
  const breath = frame === 1 || frame === 2 ? 1 : 0;
  const bx = 1 * s, by = -15 * s, w = 13 * s * (o.bulk || 1), h = 12 * s * (o.bulk || 1);
  // jambes
  for (const lx of [-6, 6]) P.poly([[bx + lx * s - 4 * s, by + h * 0.5], [bx + lx * s + 4 * s, by + h * 0.5], [bx + lx * s + 4.5 * s, 0], [bx + lx * s - 4.5 * s, 0]], lx > 0 ? RD : R, {});
  // corps rocheux à facettes
  P.poly([[bx - w, by - h * 0.2], [bx - w * 0.6, by - h], [bx + w * 0.5, by - h * 1.05], [bx + w, by - h * 0.3], [bx + w * 0.9, by + h * 0.6], [bx - w * 0.85, by + h * 0.65]], R, {
    rim: o.rim, pat: (u, v, x, y) => { const n = valueNoise(x / 3.5, y / 3.5, 3); return n > 0.68 ? R[3] : n < 0.25 ? R[1] : null; },
  });
  extras(P, o.extrasBody, { hx: bx, hy: by - h, hr: h * 0.6, bx, by, br: Math.max(w, h), R, RA, frame, T: o.T, s });
  // tête encastrée
  const hr = 6.5 * s * (o.headK || 1);
  const hx = bx - w * 0.3, hy = by - h * 0.85 + breath * 0.5;
  P.ell(hx, hy, hr * 1.1, hr, RB, {});
  extras(P, o.extrasHead, { hx, hy, hr, bx, by, br: w, R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: 'none', eyeSize: 0.36, sharp: o.sharp ?? true });
  // bras massifs
  P.ell(bx + w * 0.95, by + h * 0.1 + breath * 0.5, 4.5 * s, 6.5 * s, RD, { rot: 0.2 });
  P.ell(bx - w * 1.05, by + h * 0.15 - breath * 0.5, 5 * s, 7 * s, R, { rot: -0.2 });
  P.ell(bx - w * 1.1, by + h * 0.65, 4 * s, 3.4 * s, RA, {});
  P.emit(bx - w * 1.1, by + h * 0.65, 'hand');
}

/* ── Slime / gelée ── */
function drawBlob(P, k, o) {
  const { s, R, RB, RA, frame } = o;
  const sq = [0, 0.6, 1, 0.6][frame];
  const rx = 15 * s * (o.bulk || 1) * (1 + sq * 0.04), ry = 12.5 * s * (o.bulk || 1) * (1 - sq * 0.05);
  const bx = 0, by = -ry + 0.5;
  P.ell(bx, by, rx, ry, R, {
    rim: o.rim, cut: (u, v) => v > 0.82, glow: o.T.jelly ? shade(R[2], 0.1) : false,
    pat: (u, v, x, y) => (u < -0.3 && v < -0.3 && u * u + v * v > 0.35 && u * u + v * v < 0.55 ? '#ffffff' : pattern(o, u, v, x, y, 'body')),
  });
  extras(P, [...o.extrasBody, ...o.extrasHead], { hx: bx, hy: by - ry * 0.3, hr: ry * 0.8, bx, by, br: rx, R, RA, frame, T: o.T, s });
  if (!o.back) {
    P.eye(bx - rx * 0.35, by - ry * 0.05, ry * 0.3, o.eye, { closed: o.closed, glow: o.glowEyes });
    P.eye(bx + rx * 0.2, by - ry * 0.05, ry * 0.27, o.eye, { closed: o.closed, glow: o.glowEyes, far: true });
    P.dot(bx - rx * 0.08, by + ry * 0.35, '#3a1a28');
  }
}

/* ── Plante (bulbe, fleur, champignon) ── */
function drawPlant(P, k, o) {
  const { s, R, RB, RA, frame } = o;
  const sway = Math.sin((frame / 4) * Math.PI * 2) * 0.1;
  const bx = 0, by = -11 * s, br = 10 * s * (o.bulk || 1);
  // racines / pieds
  for (const lx of [-5, 4]) P.ell(bx + lx * s, -1.5 * s, 3.4 * s, 2.2 * s, ramp5(o.T.root || '#8a5a3a'), {});
  // feuilles de base
  for (const a of [-2.7, -0.45]) leafShape(P, bx, by + br * 0.4, br * 1.1, br * 0.3, a + sway, ramp5(o.T.leaf || '#4fae44'), {});
  P.ell(bx, by, br, br * 0.92, R, { rim: o.rim, pat: (u, v, x, y) => pattern(o, u, v, x, y, 'body') });
  // tête-fleur / chapeau
  const hx = bx - 1 * s, hy = by - br * 1.05;
  if (o.cap) {
    P.ell(hx, hy - br * 0.1, br * 1.25, br * 0.7, ramp5(o.T.cap || RA[2]), { cut: (u, v) => v > 0.45, pat: (u, v, x, y) => (hash2(Math.round(u * 3), Math.round(v * 3), 7) < 0.28 && u * u + v * v < 0.7 ? '#ffffff' : null) });
  } else {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + sway; P.ell(hx + Math.cos(a) * br * 0.62, hy + Math.sin(a) * br * 0.5, br * 0.45, br * 0.32, ramp5(o.T.petal || RA[2]), { rot: a }); }
    P.ell(hx, hy, br * 0.35, br * 0.32, ramp5(o.T.heart || '#ffd23f'), { glow: o.T.heartGlow ? '#ffe66a' : false });
    P.emit(hx, hy, 'pollen');
  }
  extras(P, [...o.extrasBody, ...o.extrasHead], { hx, hy, hr: br * 0.7, bx, by, br, R, RA, frame, T: o.T, s });
  if (!o.back) {
    P.eye(bx - br * 0.35, by + br * 0.0, br * 0.3, o.eye, { closed: o.closed, glow: o.glowEyes });
    P.eye(bx + br * 0.2, by + br * 0.0, br * 0.27, o.eye, { closed: o.closed, glow: o.glowEyes, far: true });
    P.dot(bx - br * 0.1, by + br * 0.42, '#3a1a28');
  }
}


/* ── Chrysalide (posée, pointe en haut, endormie) ── */
function drawPod(P, k, o) {
  const { s, R, RB, RA, frame, back } = o;
  const sway = Math.sin((frame / 4) * Math.PI * 2) * 0.05;
  const bx = 0, by = -14 * s, rx = 9.5 * s * (o.bulk || 1), ry = 14 * s;
  P.poly([[bx - rx * 0.55, by - ry * 0.55], [bx + rx * 0.1 + sway * 20 * s, by - ry * 1.55], [bx + rx * 0.62, by - ry * 0.5]], R, {});
  P.ell(bx, by, rx, ry, R, { rot: sway, rim: o.rim, pat: (u, v, x, y) => (Math.abs(((v + 1) * 3.2) % 1 - 0.5) < 0.09 && Math.abs(u) < 0.95 ? R[1] : u < -0.1 && v > -0.2 && v < 0.6 ? RB[3] : null) });
  // ailes repliées visibles sous la peau
  P.ell(bx + rx * 0.35, by - ry * 0.05, rx * 0.4, ry * 0.55, RA.map((c) => shade(c, -0.05)), { rot: 0.25, outline: false, glow: o.T.wingGlow ? shade(RA[3], 0.2) : false });
  extras(P, [...o.extrasHead, ...o.extrasBody.filter((e) => e !== 'bugwings')], { hx: bx, hy: by - ry * 0.6, hr: rx * 0.6, bx, by, br: rx, R, RA, frame, T: o.T, s });
  if (!back) {
    P.eye(bx - rx * 0.4, by - ry * 0.18, rx * 0.26, o.eye, { closed: o.closed || frame === 3, squint: true, sharp: true });
    P.eye(bx + rx * 0.1, by - ry * 0.2, rx * 0.22, o.eye, { closed: o.closed || frame === 3, squint: true, sharp: true, far: true });
  }
  P.emit(bx, by - ry * 1.3, 'tip');
}

/* ── Cactus (colonne, bras levés, épines, fleur) ── */
function drawCactus(P, k, o) {
  const { s, R, RB, RA, RD, frame, back } = o;
  const wig = frame === 1 || frame === 2 ? 0.8 : 0;
  const spine = (u, v, x, y) => (hash2(x, y, 11) < 0.07 ? '#fff6d8' : Math.abs(u) < 0.08 && v > -0.9 ? R[1] : null);
  P.limb(4 * s, -15 * s, 11 * s, -15 * s, 4.6 * s, RD, {});
  P.limb(11 * s, -15 * s, 11 * s, -23 * s - wig, 4.6 * s, RD, {});
  P.ell(0, -15 * s, 8 * s * (o.bulk || 1), 15 * s, R, { rim: o.rim, pat: spine });
  P.limb(-4 * s, -12 * s, -11 * s, -12 * s, 5 * s, R, {});
  P.limb(-11 * s, -12 * s, -11 * s, -20 * s + wig, 5 * s, R, {});
  P.ell(-11 * s, -20.5 * s + wig, 2.5 * s, 2.5 * s, R, {});
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; P.ell(Math.cos(a) * 2.6 * s - 1 * s, -30.5 * s + Math.sin(a) * 1.8 * s, 2.4 * s, 1.7 * s, ramp5(o.T.petal || '#ff6aa0'), { rot: a }); }
  P.ell(-1 * s, -30.5 * s, 1.4 * s, 1.4 * s, ramp5('#ffd23f'), { glow: '#ffe66a' });
  P.emit(-1 * s, -31 * s, 'pollen');
  extras(P, o.extrasBody.filter((e) => e !== 'spikes' && e !== 'leaves'), { hx: 0, hy: -26 * s, hr: 6 * s, bx: 0, by: -15 * s, br: 9 * s, R, RA, frame, T: o.T, s });
  if (!back) {
    P.eye(-3.2 * s, -19 * s, 2.8 * s, o.eye, { closed: o.closed, glow: o.glowEyes, sharp: o.sharp });
    P.eye(2 * s, -19 * s, 2.4 * s, o.eye, { closed: o.closed, glow: o.glowEyes, far: true, sharp: o.sharp });
    P.dot(-0.8 * s, -15 * s, '#3a1a28'); P.dot(0.2 * s, -14.6 * s, '#3a1a28');
  }
}

/* ── Grappe (raisin, baies) ── */
function drawGrape(P, k, o) {
  const { s, R, RA, frame, back } = o;
  const b = frame === 1 || frame === 2 ? 0.6 : 0;
  const balls = [[-5, -27], [4, -27], [-9, -19], [0, -19.5], [8, -19], [-4, -11.5], [5, -11.5], [0, -4.5]];
  P.limb(0, -31 * s, 1.5 * s, -36 * s, 1.6 * s, ramp5('#7a5a2a'), {});
  leafShape(P, 1.5 * s, -34 * s, 10 * s, 3.4 * s, -0.4, ramp5(o.T.leaf || '#4fae44'));
  for (const [x, y] of balls.slice().reverse()) if (!(x === 0 && y === -19.5)) P.ell(x * s, y * s - b, 5.4 * s, 5.4 * s, R, { rim: o.rim, pat: (u, v) => (u < -0.2 && v < -0.3 && u * u + v * v < 0.5 ? '#ffffff' : null) });
  P.ell(0, -19.5 * s - b, 7 * s, 6.6 * s, R, { rim: o.rim });
  extras(P, [...o.extrasHead, ...o.extrasBody.filter((e) => e !== 'leaves')], { hx: 0, hy: -26 * s, hr: 6 * s, bx: 0, by: -18 * s, br: 10 * s, R, RA, frame, T: o.T, s });
  if (!back) {
    P.eye(-2.6 * s, -20.5 * s - b, 2.4 * s, o.eye, { closed: o.closed, glow: o.glowEyes });
    P.eye(2.2 * s, -20.5 * s - b, 2 * s, o.eye, { closed: o.closed, glow: o.glowEyes, far: true });
    P.dot(-0.4 * s, -16.5 * s - b, '#3a1a28');
  }
}

/* ── Étoile de mer / étoile tombée ── */
function drawStar(P, k, o) {
  const { s, R, RB, RA, frame, back } = o;
  const spin = Math.sin((frame / 4) * Math.PI * 2) * 0.06;
  const cx = 0, cy = -16 * s, r = 15 * s * (o.bulk || 1);
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + spin; const rr = i % 2 ? r * 0.48 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92]); }
  P.poly(pts, R, { rim: o.rim, flat: undefined, pat: (u, v, x, y) => (hash2(x >> 1, y >> 1, 5) < 0.08 ? RA[3] : null), glow: o.T.starGlow ? shade(R[3], 0.1) : false });
  P.ell(cx, cy, r * 0.32, r * 0.3, RB, { outline: false });
  extras(P, [...o.extrasHead, ...o.extrasBody], { hx: cx, hy: cy - r * 0.4, hr: r * 0.5, bx: cx, by: cy, br: r * 0.7, R, RA, frame, T: o.T, s });
  if (!back) {
    P.eye(cx - r * 0.18, cy - r * 0.05, r * 0.15, o.eye, { closed: o.closed, glow: o.glowEyes });
    P.eye(cx + r * 0.16, cy - r * 0.05, r * 0.13, o.eye, { closed: o.closed, glow: o.glowEyes, far: true });
    P.dot(cx, cy + r * 0.17, '#3a1a28');
  }
  o.floating = 5 * s;
  P.emit(cx, cy - r, 'star');
}

/* ── Dragon (bipède trapu, ailes, cornes, longue queue) ── */
function drawDragon(P, k, o) {
  const { s, R, RB, RA, RD, frame, back } = o;
  const breath = frame === 1 || frame === 2 ? 1 : 0;
  const bx = 3 * s, by = -13 * s, brx = 11 * s * (o.bulk || 1), bry = 10.5 * s * (o.bulk || 1);
  const hr = 10 * s * (o.headK || 1);
  const hx = -6 * s, hy = by - bry - hr * 0.35 + breath * 0.5;
  if (o.stage >= 2) extras(P, [o.stage >= 3 ? 'bigwings' : 'wings'], { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: { ...o.T, wing: o.T.wing || RA[2] }, s });
  tail(P, 'long', bx + brx * 0.7, by + 3 * s, s * 1.2, R, RA, frame, o.T);
  P.limb(bx + 4 * s, by + bry * 0.4, bx + 5 * s, -1, 5.5 * s, RD, {});
  P.ell(bx, by, brx, bry, R, { rim: o.rim, pat: (u, v, x, y) => (!back && u < 0.2 && u > -0.85 && v > -0.6 ? (Math.round(v * 6) % 2 === 0 ? RB[3] : RB[2]) : pattern(o, u, v, x, y, 'body')) });
  extras(P, o.extrasBody.filter((e) => !e.includes('wings')), { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: o.T, s });
  P.limb(bx - 4 * s, by + bry * 0.4, bx - 5 * s, -1, 6 * s, R, {});
  P.limb(bx - brx * 0.6, by - bry * 0.3, bx - brx * 1.0, by + 2 * s, 3.4 * s, R, {});
  ears(P, o.ears || 'horn', hx, hy, hr, R, RA, frame);
  P.ell(hx, hy, hr * 1.05, hr * 0.9, R, { rim: o.rim });
  extras(P, o.extrasHead, { hx, hy, hr, bx, by, br: Math.max(brx, bry), R, RA, frame, T: o.T, s });
  headFace(P, k, hx, hy, hr, { ...o, snout: o.snout || 'long', mouth: o.mouth || 'fangs' });
  P.emit(hx - hr * 1.2, hy + hr * 0.2, 'breath');
}

const PLANS = { quad: drawQuad, biped: drawBiped, bird: drawBird, insect: drawInsect, serpent: drawSerpent, float: drawFloat, fish: drawFish, golem: drawGolem, blob: drawBlob, plant: drawPlant, dragon: drawDragon, pod: drawPod, cactus: drawCactus, grape: drawGrape, star: drawStar };

/** Motifs de pelage. */
function pattern(o, u, v, x, y, part) {
  const p = o.pattern;
  if (!p || p === 'none') return null;
  const C = o.RP;
  switch (p) {
    case 'stripes': { const w = Math.abs(((u * 1.6 + 0.2 - v * v * 0.6) * 2.2) % 1); return part !== 'head' && v < 0.35 && u > -0.6 && w < 0.16 ? C[2] : part === 'head' && v < -0.55 && Math.abs(u) < 0.35 && w < 0.2 ? C[2] : null; }
    case 'spots': return part !== 'head' && v < 0.4 && hash2(Math.round(u * 3.2 + 7), Math.round(v * 3.2 + 3), 9) < 0.2 && u * u + v * v < 0.7 ? C[3] : null;
    case 'mask': return part === 'head' && v > -0.35 && v < 0.15 && u < 0.55 ? C[1] : null;
    case 'gradient': return v > 0.3 ? C[v > 0.6 ? 2 : 3] : null;
    case 'stars': return (hash2(x, y, 4) < 0.05 ? '#ffffff' : hash2(x >> 1, y >> 1, 6) < 0.06 ? C[4] : null);
    case 'tips': return part === 'head' && v < -0.6 ? C[3] : null;
    case 'cracks': return hash2(x, y >> 1, 3) < 0.05 ? C[1] : null;
    case 'bands': return part === 'body' && Math.round((u + 1) * 3) % 2 === 0 ? C[2] : null;
    default: return null;
  }
}

/* ════════════════════════ API ════════════════════════ */
/**
 * Dessine une créature.
 * look : { plan, body, belly, accent, eye, pcolor, pattern, ears, tail, snout, mouth, extras[], stage, size, glowEyes, T{…} }
 * opts : { view: 'front'|'back', frame, blink, W, H }
 */
export function drawCreature(look, opts = {}) {
  const W = opts.W || 64, H = opts.H || 64;
  const back = opts.view === 'back';
  const flip = back ? 1 : -1 * -1; // dessin de base : regard vers la gauche
  const scale = (opts.scale || 1) * (look.size || 1);
  const P = new Painter(W, H, W / 2, H - 4, scale * (W / 64), back ? -1 : 1);
  const frame = opts.frame || 0;
  const R = ramp5(look.body || '#9a9aa8');
  const RB = ramp5(look.belly || mixHex(look.body || '#9a9aa8', '#ffffff', 0.55));
  const RA = ramp5(look.accent || shade(look.body || '#9a9aa8', 0.3));
  const RD = R.map((c) => shade(c, -0.22));
  const RP = ramp5(look.pcolor || shade(look.body || '#9a9aa8', -0.35));
  const T = look.T || {};
  const ex = look.extras || [];
  const HEAD = new Set(['horns', 'antlers', 'crest', 'halo', 'crown', 'flower', 'headflame', 'flamemane', 'mane', 'gem', 'scarf']);
  const o = {
    s: 1, R, RB, RA, RD, RP, frame, back, T, stage: look.stage || 1,
    ears: look.ears || 'none', tail: look.tail || 'none', snout: look.snout, mouth: look.mouth, eye: look.eye || '#3a2a20',
    pattern: look.pattern, socks: look.socks, bulk: look.bulk, headK: look.headK, cheek: look.cheek, mandibles: look.mandibles,
    hood: look.hood, tall: look.tall, cap: look.cap, sharp: look.sharp, eyeSize: look.eyeSize, wool: look.wool, tentacles: look.tentacles, variant: look.variant, round: look.round,
    closed: !!opts.blink, glowEyes: !!look.glowEyes, rim: look.rim || null,
    extrasHead: ex.filter((e) => HEAD.has(e)), extrasBody: ex.filter((e) => !HEAD.has(e)),
  };
  (PLANS[look.plan] || drawQuad)(P, 0, o);
  // contour extérieur foncé (complète les contours de pièces sur le vide)
  const px = P.px;
  const b = px.bounds() || { x0: 0, y0: 0, x1: W - 1, y1: H - 1, w: W, h: H };
  const white = new Px(W, H);
  for (let i = 0; i < px.d.length; i += 4) if (px.d[i + 3]) { white.d[i] = white.d[i + 1] = white.d[i + 2] = 255; white.d[i + 3] = 255; }
  return {
    canvas: px.toCanvas(), em: P.em.bounds() ? P.em.toCanvas() : null, white: white.toCanvas(), shadow: px.silhouette(),
    w: W, h: H, ax: Math.round(W / 2), ay: H - 4 + Math.round(o.floating || 0) * 0, top: b.y0, bounds: b, emitters: P.emitters, floating: o.floating || 0, px,
  };
}

/** Jeu complet d'images pour une vue : 4 images + clignement. */
export function creatureFrames(look, view = 'front', { W = 64, H = 64, scale = 1 } = {}) {
  const frames = [0, 1, 2, 3].map((f) => drawCreature(look, { view, frame: f, W, H, scale }));
  const blink = drawCreature(look, { view, frame: 0, blink: true, W, H, scale });
  return { ...frames[0], frames, blink };
}
