import { TYPES } from '../config/types.js';
import { Particles2D, SHAPE, hdr } from '../world2d/Particles2D.js';
import { rand, tweens, Ease } from '../core/utils.js';

/**
 * EFFETS DE COMBAT EN PIXEL ART POUR LES 16 TYPES (coordonnées = pixels de l'image du jeu) :
 * projectiles à traînée, rayons, éclairs en zigzag, anneaux, explosions par type (flammes, gerbes,
 * feuilles, étincelles, éclats de glace, rochers, tourbillons, bulles, chocs, ondes psy, fumée d'ombre,
 * étincelles d'acier, rayons de lumière, nuées, étoiles), auras de bonus / malus, statuts.
 * Les sources lumineuses vont aussi dans le halo (bloom).
 */
export const LOOK = {
  normal:  { core: '#ffffff', glow: '#fff4dc', trail: SHAPE.glow },
  feu:     { core: '#ffe08a', glow: '#ff5a1a', trail: SHAPE.glow },
  eau:     { core: '#d8f4ff', glow: '#3ba7ff', trail: SHAPE.drop },
  plante:  { core: '#c8ff9a', glow: '#3fa045', trail: SHAPE.leaf },
  foudre:  { core: '#fffbd0', glow: '#ffd23f', trail: SHAPE.spark },
  glace:   { core: '#f0fcff', glow: '#8fe3f2', trail: SHAPE.spark },
  roche:   { core: '#e0ccaa', glow: '#a08060', trail: SHAPE.chunk },
  vent:    { core: '#f4f8ff', glow: '#9ab8ff', trail: SHAPE.smoke },
  toxine:  { core: '#f0c0ff', glow: '#b25ad9', trail: SHAPE.drop },
  sol:     { core: '#f0d8a0', glow: '#c8904a', trail: SHAPE.chunk },
  spectre: { core: '#e0d0ff', glow: '#7a5ac8', trail: SHAPE.smoke },
  dragon:  { core: '#c8fff0', glow: '#2ec8b4', trail: SHAPE.spark },
  ombre:   { core: '#d0b8ff', glow: '#6c3a9e', trail: SHAPE.smoke },
  metal:   { core: '#ffffff', glow: '#a9b4c2', trail: SHAPE.spark },
  lumiere: { core: '#fffdf0', glow: '#ffe48a', trail: SHAPE.glow },
  insecte: { core: '#f0ffb0', glow: '#a8c43a', trail: SHAPE.spark },
  astral:  { core: '#e0e6ff', glow: '#5a6cff', trail: SHAPE.spark },
};
const look = (t) => LOOK[t] || LOOK.normal;
const R = (a, b) => rand(a, b);

export class BattleFX2D {
  constructor(stage) {
    this.stage = stage;
    this.add = new Particles2D(2500, { additive: true });
    this.norm = new Particles2D(1500);
    this.shapes = [];
    this.flashA = 0;
    this.flashC = '#ffffff';
  }

  clear() { this.add.clear(); this.norm.clear(); this.shapes.length = 0; this.flashA = 0; }

  update(dt) {
    this.add.update(dt);
    this.norm.update(dt);
    for (let i = this.shapes.length - 1; i >= 0; i--) { const s = this.shapes[i]; s.t += dt; if (s.t >= s.life) this.shapes.splice(i, 1); }
    this.flashA = Math.max(0, this.flashA - dt * 3.2);
  }

  draw(ctx, glow, W, H) {
    const proj = (x, y, z) => [x, z - y];
    this.norm.draw(ctx, proj, 1, glow);
    for (const s of this.shapes) s.draw(ctx, glow, s.t / s.life, s);
    this.add.draw(ctx, proj, 1, glow);
    if (this.flashA > 0.01) {
      ctx.globalAlpha = Math.min(1, this.flashA);
      ctx.fillStyle = this.flashC;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /* ── Primitives ─────────────────────────────────────────────────── */
  emit(p, o) { (o.additive === false ? this.norm : this.add).emit({ ...o, pos: [p.x, o.h || 0, p.y] }); }

  screenFlash(color = '#ffffff', a = 0.8) { this.flashC = color; this.flashA = a; }

  flash(pos, color = '#ffffff', intensity = 30, duration = 0.35) {
    const life = duration;
    this.shapes.push({ t: 0, life, draw: (ctx, glow, k) => {
      const r = 6 + k * 20;
      glow.globalAlpha = (1 - k) * Math.min(1, intensity / 30);
      glow.fillStyle = color;
      glow.beginPath(); glow.arc(pos.x, pos.y, r, 0, 7); glow.fill();
      glow.globalAlpha = 1;
      ctx.globalAlpha = (1 - k) * 0.7; ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(pos.x) - 2, Math.round(pos.y) - 2, 4, 4);
      ctx.globalAlpha = 1;
    } });
  }

  ring(pos, color = '#ffffff', radius = 3, duration = 0.5, { intensity = 3 } = {}) {
    const Rr = radius > 8 ? radius : radius * 9;
    this.shapes.push({ t: 0, life: duration, draw: (ctx, glow, k) => {
      const r = Math.round(4 + k * Rr);
      ctx.globalAlpha = 1 - k;
      pixelRing(ctx, pos.x, pos.y, r, r * 0.45, color);
      glow.globalAlpha = (1 - k) * Math.min(1, intensity / 3);
      pixelRing(glow, pos.x, pos.y, r, r * 0.45, color, 2);
      ctx.globalAlpha = 1; glow.globalAlpha = 1;
    } });
  }

  bolt(from, to, color = '#fff2a0', life = 0.32) {
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([from.x + (to.x - from.x) * t + (i && i < n ? R(-6, 6) : 0), from.y + (to.y - from.y) * t + (i && i < n ? R(-6, 6) : 0)]); }
    this.shapes.push({ t: 0, life, draw: (ctx, glow, k) => {
      if (Math.floor(k * 10) % 3 === 2) return;
      for (const [target, w, c] of [[glow, 3, color], [ctx, 1, '#ffffff']]) {
        target.globalAlpha = 1 - k * 0.6;
        target.fillStyle = c;
        for (let i = 0; i < pts.length - 1; i++) line(target, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w);
        target.globalAlpha = 1;
      }
    } });
  }

  beam(from, to, color, life = 0.5, width = 0.18) {
    const w = Math.max(3, Math.round(width * 28));
    this.shapes.push({ t: 0, life, draw: (ctx, glow, k) => {
      const grow = Math.min(1, k * 4), fade = k > 0.75 ? (1 - k) / 0.25 : 1;
      const x1 = from.x + (to.x - from.x) * grow, y1 = from.y + (to.y - from.y) * grow;
      const ww = Math.max(1, Math.round(w * fade * (0.85 + Math.sin(k * 60) * 0.15)));
      glow.fillStyle = color; glow.globalAlpha = 0.9 * fade;
      line(glow, from.x, from.y, x1, y1, ww + 4);
      ctx.fillStyle = color; ctx.globalAlpha = fade;
      line(ctx, from.x, from.y, x1, y1, ww);
      ctx.fillStyle = '#ffffff';
      line(ctx, from.x, from.y, x1, y1, Math.max(1, ww - 2));
      ctx.globalAlpha = 1; glow.globalAlpha = 1;
    } });
    for (let i = 0; i < 14; i++) { const t = Math.random(); this.emit({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, { vel: [R(-20, 20), R(10, 40), R(-20, 20)], color: hdr(color, 2), color1: [1, 1, 1], size: 2, size1: 0, life: R(0.3, 0.6), shape: SHAPE.spark }); }
  }

  sparkles(pos, color, n = 30, { speed = 3, size = 0.25, life = 0.9, up = 1, spread = 0.4, shape = SHAPE.spark } = {}) {
    const c = hdr(color, 2.2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = R(0.3, 1) * speed * 12;
      this.emit({ x: pos.x + Math.cos(a) * spread * 10, y: pos.y + Math.sin(a) * spread * 6 }, { vel: [Math.cos(a) * v, R(0, up * 30), Math.sin(a) * v * 0.5], color: c, color1: [1, 1, 1], size: Math.max(1, size * 7), size1: 0, life: R(life * 0.5, life), drag: 1.4, shape });
    }
  }

  motes(from, to, color, n = 40, duration = 0.6) {
    const c = hdr(color, 2.2);
    for (let i = 0; i < n; i++) {
      const delay = Math.random() * duration * 0.5;
      setTimeout(() => {
        const sx = from.x + R(-8, 8), sy = from.y + R(-10, 10);
        const life = duration * 0.6;
        this.emit({ x: sx, y: sy }, { vel: [(to.x - sx) / life, 0, (to.y - sy) / life], color: c, color1: [1, 1, 1], size: 2, size1: 1, life, shape: SHAPE.glow });
      }, delay * 1000);
    }
  }

  smoke(pos, color = [0.3, 0.28, 0.28], n = 12, size = 1, alpha = 0.55) {
    for (let i = 0; i < n; i++) this.emit({ x: pos.x + R(-10, 10), y: pos.y + R(-4, 4) }, { additive: false, vel: [R(-10, 10), R(8, 22), R(-4, 4)], color, color1: color, size: 5 * size, size1: 10 * size, life: R(0.7, 1.2), shape: SHAPE.smoke, alpha });
  }

  /** Impact selon le type. */
  burst(type, pos, scale = 1) {
    const L = look(type);
    const core = hdr(L.core, 2.4), gl = hdr(L.glow, 2);
    const n = Math.round(26 * scale);
    this.flash(pos, L.glow, 30 * scale, 0.3);
    switch (type) {
      case 'feu':
        for (let i = 0; i < n * 1.4; i++) this.emit({ x: pos.x + R(-10, 10) * scale, y: pos.y + R(-6, 6) }, { vel: [R(-14, 14), R(20, 60), 0], color: core, color1: hdr('#c8301a', 1.5), size: R(2, 4) * scale, size1: 0, life: R(0.4, 0.8), drag: 1, shape: SHAPE.glow });
        this.smoke(pos, [0.25, 0.2, 0.2], 6, scale, 0.5);
        break;
      case 'eau':
        for (let i = 0; i < n * 1.3; i++) { const a = R(0, Math.PI * 2); this.emit(pos, { additive: false, vel: [Math.cos(a) * R(20, 60), R(20, 70), Math.sin(a) * 20], color: hdr('#bfeaff', 1.2), size: R(1, 2), size1: 1, life: R(0.4, 0.8), gravity: 140, shape: SHAPE.drop }); }
        this.ring(pos, '#bfeaff', 26 * scale, 0.45);
        break;
      case 'plante': case 'insecte':
        for (let i = 0; i < n; i++) { const a = R(0, Math.PI * 2); this.emit(pos, { additive: false, vel: [Math.cos(a) * R(20, 50), R(10, 50), Math.sin(a) * 20], color: hdr(type === 'plante' ? '#5fc84a' : '#c8e04a', 1.1), size: 2, size1: 2, life: R(0.6, 1.1), gravity: 40, shape: SHAPE.leaf, spin: 8 }); }
        this.sparkles(pos, L.core, 12, { speed: 2 });
        break;
      case 'foudre':
        for (let k = 0; k < 3; k++) this.bolt({ x: pos.x + R(-20, 20), y: pos.y - 50 }, { x: pos.x + R(-6, 6), y: pos.y + R(-4, 4) }, L.glow, 0.3);
        this.sparkles(pos, L.core, n, { speed: 5, size: 0.3, life: 0.5 });
        this.stage.engine.bloomBoost = Math.max(this.stage.engine.bloomBoost, 0.6);
        break;
      case 'glace':
        for (let i = 0; i < n; i++) { const a = R(0, Math.PI * 2); this.emit(pos, { vel: [Math.cos(a) * R(20, 60), Math.sin(a) * R(10, 40), 0], color: core, color1: hdr('#8fe3f2', 1.5), size: 2, size1: 1, life: R(0.4, 0.8), drag: 2, shape: SHAPE.spark }); }
        this.ring(pos, '#e8fbff', 24 * scale, 0.5);
        break;
      case 'roche':
        for (let i = 0; i < n; i++) this.emit({ x: pos.x + R(-12, 12), y: pos.y }, { additive: false, vel: [R(-40, 40), R(30, 80), 0], color: hdr(['#a08060', '#806040', '#c0a080'][i % 3], 1), size: R(2, 4), size1: 2, life: R(0.6, 1), gravity: 220, shape: SHAPE.chunk, floor: -14 });
        this.smoke(pos, [0.45, 0.4, 0.34], 8, scale);
        this.stage.engine.addShake(0.15 * scale);
        break;
      case 'vent':
        for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 4; this.emit({ x: pos.x + Math.cos(a) * 12, y: pos.y + Math.sin(a) * 5 }, { additive: false, vel: [-Math.sin(a) * 40, R(10, 30), Math.cos(a) * 16], color: hdr('#e8f0ff', 1), size: 3, size1: 6, life: R(0.4, 0.7), shape: SHAPE.smoke, alpha: 0.6 }); }
        break;
      case 'toxine':
        for (let i = 0; i < n; i++) this.emit({ x: pos.x + R(-10, 10), y: pos.y + R(-6, 6) }, { vel: [R(-10, 10), R(10, 40), 0], color: hdr('#d89aff', 1.6), color1: hdr('#7a2aa0', 1), size: R(2, 3), size1: 1, life: R(0.6, 1.1), shape: SHAPE.glow });
        this.smoke(pos, [0.4, 0.2, 0.5], 6, scale, 0.45);
        break;
      case 'sol':
        for (let i = 0; i < n; i++) this.emit({ x: pos.x + R(-14, 14), y: pos.y + 6 }, { additive: false, vel: [R(-50, 50), R(40, 90), 0], color: hdr(['#d8a85a', '#a8783a', '#e8c88a'][i % 3], 1), size: R(2, 3.5), size1: 1.5, life: R(0.5, 0.9), gravity: 240, shape: SHAPE.chunk, floor: -14 });
        this.smoke(pos, [0.62, 0.5, 0.34], 10, scale, 0.6);
        this.stage.engine.addShake(0.2 * scale);
        break;
      case 'spectre':
        for (let k = 0; k < 2; k++) setTimeout(() => this.ring(pos, '#b89aff', 20 * scale, 0.45), k * 120);
        this.smoke(pos, [0.3, 0.22, 0.45], 10, scale, 0.6);
        this.sparkles(pos, '#e0d0ff', 10, { speed: 1.5 });
        break;
      case 'dragon':
        for (let i = 0; i < n; i++) { const a = R(0, Math.PI * 2); this.emit(pos, { vel: [Math.cos(a) * R(30, 70), Math.sin(a) * R(20, 50), 0], color: hdr('#a8fff0', 1.8), color1: hdr('#2e7ab4', 1.2), size: R(2, 3), size1: 0, life: R(0.4, 0.8), drag: 1.2, shape: SHAPE.spark }); }
        this.ring(pos, '#5ae8d0', 26 * scale, 0.4);
        this.stage.engine.addShake(0.12 * scale);
        break;
      case 'normal': case 'metal':
        this.star(pos, type === 'metal' ? '#e8eef8' : '#ffffff', 18 * scale);
        this.sparkles(pos, L.core, Math.round(n * 0.8), { speed: 5, life: 0.45 });
        break;
      case 'ombre':
        this.smoke(pos, [0.18, 0.1, 0.28], 14, scale * 1.2, 0.75);
        this.sparkles(pos, '#b08aff', 14, { speed: 2.5 });
        break;
      case 'lumiere':
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; this.beam(pos, { x: pos.x + Math.cos(a) * 28 * scale, y: pos.y + Math.sin(a) * 18 * scale }, '#fff4b0', 0.35, 0.08); }
        this.screenFlash('#fffbe0', 0.35);
        break;
      case 'astral':
        for (let i = 0; i < n; i++) { const a = R(0, Math.PI * 2); this.emit(pos, { vel: [Math.cos(a) * R(20, 50), Math.sin(a) * R(15, 40), 0], color: hdr('#c8d0ff', 2), color1: hdr('#5a6cff', 1.5), size: 2, size1: 0, life: R(0.5, 0.9), drag: 1.6, shape: SHAPE.spark }); }
        this.star(pos, '#c8d0ff', 14 * scale);
        break;
      default:
        this.sparkles(pos, L.core, n);
    }
    for (let i = 0; i < 10 * scale; i++) { const a = R(0, Math.PI * 2); this.emit(pos, { vel: [Math.cos(a) * 50, Math.sin(a) * 30, 0], color: gl, color1: [1, 1, 1], size: 2, size1: 0, life: 0.3, drag: 3, shape: SHAPE.glow }); }
  }

  /** Étoile d'impact (choc). */
  star(pos, color, r = 16) {
    this.shapes.push({ t: 0, life: 0.28, draw: (ctx, glow, k) => {
      const s = r * (0.5 + k * 0.8);
      for (const target of [glow, ctx]) {
        target.globalAlpha = 1 - k;
        target.fillStyle = target === ctx ? '#ffffff' : color;
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2 + 0.3, len = a % 2 ? s * 0.5 : s;
          line(target, pos.x, pos.y, pos.x + Math.cos(ang) * len, pos.y + Math.sin(ang) * len * 0.8, target === ctx ? 1 : 3);
        }
        target.globalAlpha = 1;
      }
    } });
  }

  /** Projectile du type, avec traînée ; résout à l'arrivée. */
  projectile(type, from, to, duration = 0.55, arc = 1.2) {
    const L = look(type);
    const core = hdr(L.core, 2.4), gl = hdr(L.glow, 2);
    const p = { x: from.x, y: from.y };
    const lift = 14 * arc;
    this.shapes.push({ t: 0, life: duration, draw: (ctx, glow, k) => {
      const X = from.x + (to.x - from.x) * k, Y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * lift;
      p.x = X; p.y = Y;
      const r = type === 'roche' ? 4 : type === 'eau' ? 3 : 3;
      glow.fillStyle = L.glow; glow.globalAlpha = 0.9;
      glow.beginPath(); glow.arc(X, Y, r + 4, 0, 7); glow.fill(); glow.globalAlpha = 1;
      ctx.fillStyle = type === 'roche' ? '#8a6a48' : L.glow;
      ctx.fillRect(Math.round(X - r), Math.round(Y - r + 1), r * 2, r * 2 - 2); ctx.fillRect(Math.round(X - r + 1), Math.round(Y - r), r * 2 - 2, r * 2);
      ctx.fillStyle = type === 'roche' ? '#c0a080' : L.core;
      ctx.fillRect(Math.round(X - r + 1), Math.round(Y - r + 1), r, r);
      if (Math.random() < 0.9) this.emit(p, { additive: L.trail !== SHAPE.leaf && L.trail !== SHAPE.chunk && L.trail !== SHAPE.drop && L.trail !== SHAPE.smoke, vel: [R(-10, 10), R(-5, 10), 0], color: L.trail === SHAPE.smoke ? hdr(L.core, 1) : core, color1: gl, size: 2, size1: 0, life: 0.35, shape: L.trail, alpha: 0.8 });
    } });
    return new Promise((res) => setTimeout(res, duration * 1000));
  }

  /** Attaque de zone : pluie de projectiles sur la cible. */
  async areaCast(type, target) {
    const L = look(type);
    const jobs = [];
    for (let i = 0; i < 5; i++) {
      jobs.push(new Promise((res) => setTimeout(() => {
        const to = { x: target.x + R(-16, 16), y: target.y + R(-6, 6) };
        this.projectile(type, { x: to.x + R(-30, 10), y: to.y - 90 }, to, 0.35, 0).then(() => { this.burst(type, to, 0.6); res(); });
      }, i * 90)));
    }
    this.sparkles(target, L.core, 10, { speed: 1 });
    await Promise.all(jobs);
  }

  quake(center) {
    this.stage.engine.addShake(0.6);
    for (let i = 0; i < 26; i++) this.emit({ x: center.x + R(-120, 120), y: center.y + R(-10, 30) }, { additive: false, vel: [R(-10, 10), R(10, 40), 0], color: [0.55, 0.48, 0.38], size: R(2, 4), size1: 1, life: R(0.5, 0.9), gravity: 120, shape: SHAPE.chunk });
  }

  /** Aura de bonus (flèches montantes) ou de malus (descendantes). */
  aura(type, pos, height = 30, debuff = false) {
    const col = debuff ? '#7a8aff' : TYPES[type]?.color || '#ffe48a';
    const c = hdr(col, 2);
    for (let i = 0; i < 26; i++) {
      const x = pos.x + R(-18, 18);
      this.emit({ x, y: pos.y + (debuff ? -height : 0) }, { vel: [0, debuff ? -R(20, 40) : R(20, 50), 0], color: c, color1: [1, 1, 1], size: 2, size1: 1, life: R(0.5, 0.9), shape: SHAPE.drop });
    }
    this.shapes.push({ t: 0, life: 0.7, draw: (ctx, glow, k) => {
      glow.globalAlpha = Math.sin(k * Math.PI) * 0.8; glow.fillStyle = col;
      glow.fillRect(Math.round(pos.x - 20), Math.round(pos.y - height), 40, height); glow.globalAlpha = 1;
    } });
  }

  statusFx(status, pos, height = 30) {
    const top = { x: pos.x, y: pos.y - height };
    switch (status) {
      case 'par': this.bolt({ x: top.x - 10, y: top.y }, { x: top.x + 8, y: pos.y - 4 }, '#ffd23f', 0.3); this.sparkles(top, '#ffe88a', 16, { speed: 3 }); break;
      case 'brn': this.burst('feu', { x: pos.x, y: pos.y - height * 0.4 }, 0.6); break;
      case 'psn': case 'tox': this.burst('toxine', { x: pos.x, y: pos.y - height * 0.4 }, 0.6); break;
      case 'slp': for (let i = 0; i < 3; i++) setTimeout(() => this.zzz(top), i * 250); break;
      case 'frz': this.burst('glace', { x: pos.x, y: pos.y - height * 0.4 }, 0.8); break;
      default: this.sparkles(top, '#ffffff', 12, { speed: 1.5 });
    }
  }

  zzz(pos) {
    this.shapes.push({ t: 0, life: 1, draw: (ctx, glow, k) => {
      const X = Math.round(pos.x + 8 + k * 10), Y = Math.round(pos.y - k * 16);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff';
      ctx.fillRect(X, Y, 4, 1); ctx.fillRect(X + 2, Y + 1, 1, 1); ctx.fillRect(X + 1, Y + 2, 1, 1); ctx.fillRect(X, Y + 3, 4, 1);
      ctx.globalAlpha = 1;
    } });
  }
}

function line(ctx, x0, y0, x1, y1, w = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const h = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(x0 + (x1 - x0) * t) - h, Math.round(y0 + (y1 - y0) * t) - h, w, w); }
}

function pixelRing(ctx, x, y, rx, ry, color, w = 1) {
  ctx.fillStyle = color;
  const n = Math.max(12, Math.round(rx * 2.2));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ctx.fillRect(Math.round(x + Math.cos(a) * rx) - (w >> 1), Math.round(y + Math.sin(a) * ry) - (w >> 1), w, w); }
}

export { line, pixelRing, tweens, Ease };
