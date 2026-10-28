/**
 * PARTICULES 2D (même interface emit() que l'ancien système 3D) : positions en mètres (x, y = hauteur, z),
 * projetées par une fonction fournie au dessin. Formes au pixel près : point, étincelle en croix,
 * feuille, goutte, éclat, fumée. Les systèmes « additifs » alimentent aussi le halo lumineux.
 */
export const SHAPE = { glow: 0, spark: 1, leaf: 2, drop: 3, chunk: 4, smoke: 5 };

const toS = (v) => Math.round(255 * Math.min(1, Math.pow(Math.max(0, v), 1 / 2.2)));

export class Particles2D {
  constructor(cap = 2000, { additive = false } = {}) {
    this.cap = cap;
    this.additive = additive;
    this.list = [];
  }

  emit(o) {
    if (this.list.length >= this.cap) return;
    const P = o.pos || [0, 0, 0], V = o.vel || [0, 0, 0];
    const c0 = o.color || [1, 1, 1], c1 = o.color1 || c0;
    this.list.push({
      x: P[0], y: P[1], z: P[2], vx: V[0], vy: V[1], vz: V[2],
      c0, c1, life: 0, max: o.life || 1, s0: o.size ?? 0.3, s1: o.size1 ?? (o.size ?? 0.3) * 0.2,
      g: o.gravity ?? 0, drag: o.drag ?? 0, shape: o.shape ?? 0, alpha: o.alpha ?? 1, floor: o.floor ?? -1e9, rot: Math.random() * 6.28, spin: o.spin ?? 0,
      hot: Math.max(c0[0], c0[1], c0[2]) > 1.2,
    });
  }

  clear() { this.list.length = 0; }
  setViewport() {}

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.max) { L[i] = L[L.length - 1]; L.pop(); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy *= k; p.vz *= k;
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      p.rot += p.spin * dt;
    }
  }

  /**
   * Dessine dans ctx ; project(x, y, z) → [X, Y] en pixels écran ; ppm = pixels par mètre.
   * glow : contexte du halo (facultatif).
   */
  draw(ctx, project, ppm, glow = null) {
    const L = this.list;
    if (!L.length) return;
    const prevOp = ctx.globalCompositeOperation;
    if (this.additive) ctx.globalCompositeOperation = 'lighter';
    for (const p of L) {
      const t = p.life / p.max;
      const [X0, Y0] = project(p.x, p.y, p.z);
      const X = Math.round(X0), Y = Math.round(Y0);
      const r = p.c0[0] + (p.c1[0] - p.c0[0]) * t, g = p.c0[1] + (p.c1[1] - p.c0[1]) * t, b = p.c0[2] + (p.c1[2] - p.c0[2]) * t;
      const a = p.alpha * (p.shape === SHAPE.smoke ? Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.05)) * (1 - t * 0.6) : t > 0.7 ? (1 - t) / 0.3 : 1);
      if (a <= 0.02) continue;
      const size = Math.max(1, Math.round((p.s0 + (p.s1 - p.s0) * t) * ppm));
      const col = `rgb(${toS(r)},${toS(g)},${toS(b)})`;
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = col;
      drawShape(ctx, p, X, Y, size);
      if (glow && (this.additive || p.hot)) {
        glow.globalAlpha = Math.min(1, a) * 0.8;
        glow.fillStyle = col;
        drawShape(glow, p, X, Y, size + 1);
      }
    }
    ctx.globalAlpha = 1;
    if (glow) glow.globalAlpha = 1;
    ctx.globalCompositeOperation = prevOp;
  }
}

function drawShape(ctx, p, X, Y, s) {
  switch (p.shape) {
    case SHAPE.spark:
      if (s <= 2) { ctx.fillRect(X, Y, 1, 1); ctx.fillRect(X - 1, Y, 3, 1); ctx.fillRect(X, Y - 1, 1, 3); }
      else { const h = s >> 1; ctx.fillRect(X - h, Y, s, 1); ctx.fillRect(X, Y - h, 1, s); ctx.fillRect(X - 1, Y - 1, 3, 3); }
      break;
    case SHAPE.leaf: {
      const o = Math.cos(p.rot) > 0 ? 1 : 0;
      ctx.fillRect(X, Y, 2, 1); ctx.fillRect(X + o, Y + 1, 1, 1);
      break;
    }
    case SHAPE.drop: ctx.fillRect(X, Y, 1, Math.max(2, s)); break;
    case SHAPE.chunk: ctx.fillRect(X, Y, Math.max(1, s - 1), Math.max(1, s - 1)); break;
    case SHAPE.smoke: {
      const r = Math.max(1, s >> 1);
      ctx.fillRect(X - r, Y - r + 1, r * 2, r * 2 - 2); ctx.fillRect(X - r + 1, Y - r, r * 2 - 2, r * 2);
      break;
    }
    default:
      if (s <= 1) ctx.fillRect(X, Y, 1, 1);
      else { const h = s >> 1; ctx.fillRect(X - h, Y - h + (s > 3 ? 1 : 0), s, s - (s > 3 ? 2 : 0)); if (s > 3) ctx.fillRect(X - h + 1, Y - h, s - 2, s); }
  }
}

/** Couleur CSS → composantes linéaires × intensité (compatibilité avec hdr()). */
export function hdr(hex, k = 1) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const lin = (v) => Math.pow(v / 255, 2.2);
  return [lin((n >> 16) & 255) * k, lin((n >> 8) & 255) * k, lin(n & 255) * k];
}
