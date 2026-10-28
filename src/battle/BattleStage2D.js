import * as THREE from 'three';
import { TYPES } from '../config/types.js';
import { ITEMS } from '../config/items.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { BATTLE_SCENES } from '../world/Biomes.js';
import { PLAYER_LOOKS } from '../world2d/Actors2D.js';
import { BattleFX2D } from './BattleFX2D.js';
import { SHAPE, hdr } from '../world2d/Particles2D.js';
import { moveStyle } from './moveStyle.js';
import { canvas, ctx2d, Px } from '../pixel/Px.js';
import { shade, bayer, valueNoise, hash2, mixHex } from '../pixel/color.js';
import { sprite as natureSprite } from '../pixel/sprites.js';
import { tweens, sleep, Ease, pick, rand } from '../core/utils.js';

/**
 * ARÈNE DE COMBAT 2D FAÇON GBA : décor peint selon le biome (ciel, lointains, sol), plateformes
 * ovales, Lumin adverse de face en haut à droite, votre Lumin de dos en bas à gauche, dresseurs
 * qui glissent hors de l'écran, Prismes lancés en cloche, attaques par type, captures, évolutions
 * et éclosions. Même interface que l'ancienne arène 3D (BattleController inchangé).
 */
const V = (x, y, z) => new THREE.Vector3(x, y, z);


/* ── Auras animées (particules émises par le sprite lui-même) ──────────────── */
const R2 = (a, b) => a + Math.random() * (b - a);
const AURA_P = {
  ember: () => ({ vel: [R2(-6, 6), R2(14, 32), 0], color: hdr('#ffe27a', 2.2), color1: hdr('#ff4a1a', 1.1), size: R2(1, 2), size1: 0.4, life: R2(0.45, 0.85), drag: 0.8, shape: SHAPE.glow }),
  emberBlue: () => ({ vel: [R2(-6, 6), R2(14, 30), 0], color: hdr('#c8e8ff', 2.2), color1: hdr('#3a5aff', 1.1), size: R2(1, 2), size1: 0.4, life: R2(0.45, 0.85), drag: 0.8, shape: SHAPE.glow }),
  emberViolet: () => ({ vel: [R2(-6, 6), R2(12, 26), 0], color: hdr('#f0c8ff', 2.0), color1: hdr('#8a3aff', 1.1), size: R2(1, 2), size1: 0.4, life: R2(0.5, 0.9), drag: 0.8, shape: SHAPE.glow }),
  spark: () => ({ vel: [R2(-26, 26), R2(-12, 30), 0], color: hdr('#fffbd0', 2.6), color1: hdr('#ffd23f', 1.4), size: R2(1.5, 2.5), size1: 0.5, life: R2(0.12, 0.28), shape: SHAPE.spark }),
  frost: () => ({ vel: [R2(-6, 6), R2(-6, 4), 0], color: hdr('#ffffff', 1.6), color1: hdr('#8fe3f2', 1.1), size: R2(1, 1.8), size1: 0.6, life: R2(0.8, 1.4), drag: 0.4, gravity: 6, shape: SHAPE.spark }),
  bubble: () => ({ additive: false, vel: [R2(-3, 3), R2(10, 18), 0], color: hdr('#d8f4ff', 1.0), color1: hdr('#9ad8ff', 1.0), size: R2(1.5, 2.6), size1: 2.4, life: R2(0.8, 1.3), shape: SHAPE.drop, alpha: 0.75 }),
  wisp: () => ({ vel: [R2(-4, 4), R2(6, 16), 0], color: hdr('#d8c8ff', 1.6), color1: hdr('#5a3aa8', 0.8), size: R2(2, 3), size1: 0.5, life: R2(0.7, 1.2), drag: 0.6, shape: SHAPE.glow }),
  star: () => ({ vel: [R2(-8, 8), R2(-4, 10), 0], color: hdr('#fff6c0', 2.4), color1: hdr('#c8a8ff', 1.2), size: R2(1.5, 2.8), size1: 0, life: R2(0.5, 0.9), drag: 1, shape: SHAPE.spark }),
  sparkle: () => ({ vel: [R2(-6, 6), R2(-2, 10), 0], color: hdr('#ffffff', 2.4), color1: hdr('#ffe48a', 1.3), size: R2(1.2, 2.4), size1: 0, life: R2(0.4, 0.8), drag: 1, shape: SHAPE.spark }),
  pollen: () => ({ vel: [R2(-6, 6), R2(4, 10), 0], color: hdr('#fff6a0', 1.6), color1: hdr('#ffd23f', 1.1), size: 1, size1: 0.8, life: R2(1, 1.6), drag: 0.3, shape: SHAPE.glow }),
  leaf: () => ({ additive: false, vel: [R2(-10, 10), R2(2, 10), 0], color: hdr('#7ad85a', 1), color1: hdr('#3f9e34', 1), size: 2, size1: 2, life: R2(1, 1.6), gravity: 4, shape: SHAPE.leaf, spin: R2(-6, 6) }),
  drip: () => ({ additive: false, vel: [R2(-2, 2), R2(-2, 2), 0], color: hdr('#c88aff', 1.1), color1: hdr('#7a2aa0', 1), size: 1.6, size1: 1.2, life: R2(0.5, 0.8), gravity: 60, shape: SHAPE.drop }),
  dark: () => ({ additive: false, vel: [R2(-5, 5), R2(6, 14), 0], color: hdr('#3a2a5a', 1), color1: hdr('#1a1028', 1), size: R2(2, 3.5), size1: 4, life: R2(0.7, 1.1), shape: SHAPE.smoke, alpha: 0.55 }),
  smoke: () => ({ additive: false, vel: [R2(-6, -2), R2(6, 12), 0], color: hdr('#d8d8e0', 1), color1: hdr('#8a8a9a', 1), size: 2, size1: 5, life: R2(0.6, 1), shape: SHAPE.smoke, alpha: 0.5 }),
  scale: () => ({ vel: [R2(-14, 14), R2(-4, 14), 0], color: hdr('#c8fff0', 2.0), color1: hdr('#2ec8b4', 1.2), size: R2(1.2, 2), size1: 0, life: R2(0.3, 0.6), drag: 1.2, shape: SHAPE.spark }),
  glint: () => ({ vel: [0, 0, 0], color: hdr('#ffffff', 2.6), color1: hdr('#a9b4c2', 1.2), size: 2.5, size1: 0, life: 0.25, shape: SHAPE.spark }),
  dust: () => ({ additive: false, vel: [R2(-6, 6), R2(-2, 6), 0], color: hdr('#d8b888', 1), color1: hdr('#a08060', 1), size: 1.5, size1: 1, life: R2(0.5, 0.9), gravity: 30, shape: SHAPE.chunk }),
};
/** Aura de fond selon le type principal (points « back », « hand », « wing »). */
const TYPE_AURA = {
  feu: ['ember', 1.4], foudre: ['spark', 1.6], glace: ['frost', 1.4], eau: ['bubble', 0.7], plante: ['leaf', 0.35], lumiere: ['sparkle', 1.6],
  astral: ['star', 1.5], spectre: ['wisp', 1.4], ombre: ['dark', 1.1], toxine: ['drip', 0.6], dragon: ['scale', 1.2], metal: ['glint', 0.5],
  insecte: ['pollen', 0.5], vent: ['smoke', 0.25], sol: ['dust', 0.4], roche: ['dust', 0.3],
};
/** Points d'émission dessinés dans le sprite → particule et cadence (par seconde). */
function emitterProfile(kind, types, flameColor) {
  switch (kind) {
    case 'ember': return [flameColor === 'bleu' ? 'emberBlue' : flameColor === 'violet' ? 'emberViolet' : 'ember', 5];
    case 'spark': return ['spark', 2.2];
    case 'frost': return ['frost', 1.3];
    case 'bubble': return ['bubble', 0.8];
    case 'wisp': return ['wisp', 3];
    case 'star': return ['star', 1.4];
    case 'pollen': return ['pollen', 0.8];
    case 'drip': return ['drip', 0.9];
    case 'tip': return types.includes('foudre') ? ['spark', 0.9] : types.includes('lumiere') || types.includes('astral') ? ['sparkle', 0.8] : null;
    case 'breath': return types.includes('feu') ? ['ember', 1.2] : ['smoke', 0.4];
    case 'back': case 'hand': case 'wing': { const a = TYPE_AURA[types[0]]; return a ? [a[0], a[1] * (kind === 'back' ? 1 : 0.4)] : null; }
    default: return null;
  }
}

class View {
  constructor(stage, side, creature) {
    this.stage = stage;
    this.side = side;
    this.species = CREATURE_MAP[creature.species] || creature.def;
    this.shiny = !!creature.shiny;
    this.sprite = stage.game.baker.creature(this.species.id, side === 'enemy' ? 'front' : 'back', this.shiny);
    this.height = Math.max(0.5, this.species.height);
    this.scale = 1; this.alpha = 1; this.visible = true;
    this.ox = 0; this.oy = 0; this.sink = 0;
    this.glow = 0; this.glowColor = '#ffffff';
    this.flashAmt = 0; this.flashColor = '#ffffff';
    this.anim = null;
    this.t = Math.random() * 3;
    this.floaty = ['float', 'bird', 'star'].includes(this.species.look?.plan) || this.species.types.includes('vent') || this.sprite.floating > 0;
    this.blinkT = 1.5 + Math.random() * 2.5;
    this.blinking = 0;
    this.emitAcc = new Map();
    this.flameColor = this.species.look?.T?.flameColor;
    this.group = { visible: true, position: V(0, 0, 0), scale: { x: 1, y: 1 } };
    this.offset = { scale: { setScalar: (v) => { this.scale = v; } }, position: { y: 0 } };
  }

  get base() { const P = this.stage.spot(this.side); return { x: P.x + this.ox, y: P.y + this.oy - (this.floaty ? 6 + Math.sin(this.t * 2.2) * 2 : 0) }; }
  /** Centre visuel (pixels). */
  center() { const b = this.base; const s = this.sprite; return { x: b.x, y: b.y - (s.ay - s.top) * 0.5 * this.scale }; }
  topY() { const s = this.sprite; return this.base.y - (s.ay - s.top) * this.scale; }

  setGlow(v, color) { this.glow = v; if (color) this.glowColor = color; }
  flash(color = '#ffffff', strength = 2.2, duration = 0.4) {
    this.flashColor = color; this.flashAmt = Math.min(1, strength / 2.2);
    return tweens.tween(duration, (t) => { this.flashAmt = Math.min(1, strength / 2.2) * (1 - t); });
  }
  /** Image courante : respiration en 4 temps + clignement des yeux. */
  get frame() {
    const s = this.sprite;
    if (!s.frames) return s;
    if (this.blinking > 0 && s.blink) return s.blink;
    if (this.sink > 0 || this.anim?.name === 'hit') return s.frames[0];
    const speed = this.anim?.name === 'attack' || this.anim?.name === 'cast' ? 0.11 : 0.24;
    return s.frames[Math.floor(this.t / speed) % s.frames.length];
  }
  /** Particules d'ambiance émises par le corps (flammes, étincelles, bulles, feux follets…). */
  emitAura(dt, X, Y, k) {
    const fr = this.frame;
    if (!fr.emitters?.length || this.sink > 0 || !this.visible || this.alpha < 0.5 || k < 0.3) return;
    const fx = this.stage.fx;
    for (const e of fr.emitters) {
      const pr = emitterProfile(e.kind, this.species.types, this.flameColor);
      if (!pr) continue;
      const key = e.kind + e.x + ',' + e.y;
      let acc = (this.emitAcc.get(key) || 0) + dt * pr[1];
      while (acc >= 1) {
        acc -= 1;
        const o = AURA_P[pr[0]]();
        fx.emit({ x: X + e.x * k + R2(-1, 1), y: Y + e.y * k + R2(-1, 1) }, o);
      }
      this.emitAcc.set(key, acc);
    }
  }
  update(dt) {
    this.t += dt;
    this.blinkT -= dt;
    if (this.blinking > 0) this.blinking -= dt;
    if (this.blinkT <= 0) { this.blinking = 0.13; this.blinkT = 2.2 + Math.random() * 3; }
    const a = this.anim;
    if (!a) return;
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    const dir = this.side === 'enemy' ? -1 : 1;
    switch (a.name) {
      case 'attack': { const s = k < 0.35 ? Ease.inCubic(k / 0.35) : 1 - Ease.outCubic((k - 0.35) / 0.65); this.ox = dir * 10 * s; this.oy = -dir * 5 * s; break; }
      case 'cast': { const s = Math.sin(k * Math.PI); this.oy = -4 * s; this.glow = Math.max(this.glow, s * 0.8); break; }
      case 'hit': this.ox = Math.round(Math.sin(k * 40) * 3 * (1 - k)); this.visible = Math.floor(k * 10) % 2 === 0 || k > 0.8; break;
      case 'happy': this.oy = -Math.abs(Math.sin(k * Math.PI * 2)) * 6; break;
      case 'faint': this.sink = Ease.inQuad(k); break;
      default: break;
    }
    if (!a.impactDone && a.t >= a.impact) { a.impactDone = true; a.resImpact(); }
    if (a.t >= a.dur) {
      if (a.name !== 'faint') { this.ox = 0; this.oy = 0; this.visible = true; }
      this.anim = null;
      a.resDone();
    }
  }
  play(name, opts = {}) {
    const D = { attack: [0.6, 0.22], cast: [0.7, 0.42], hit: [0.5, 0.05], happy: [0.8, 0.3], faint: [0.7, 0.4], walk: [0.3, 0.1], run: [0.3, 0.1], idle: [0.01, 0] }[name] || [0.3, 0.1];
    const ts = opts.timeScale || 1;
    let resImpact, resDone;
    const impact = new Promise((r) => { resImpact = r; });
    const done = new Promise((r) => { resDone = r; });
    if (this.anim) { this.anim.resImpact(); this.anim.resDone(); }
    this.anim = { name, t: 0, dur: D[0] / ts, impact: D[1] / ts, resImpact, resDone };
    if (name === 'idle') { this.ox = this.oy = 0; }
    return { impact, done };
  }
  dispose() { this.visible = false; }
}

/** Dresseur (sprite cuit), interface minimale de l'ancien acteur 3D. */
class TrainerSprite {
  constructor(stage, sprite, side) {
    this.stage = stage;
    this.sprite = sprite;
    this.side = side;
    this.slide = 0;      // 0 en place, 1 hors écran
    this.visible = true;
    this.group = { position: V(0, 0, 0), visible: true };
    this.animator = { play: (n) => { if (n === 'attack') this.throwT = 0.35; if (n === 'hit') this.hitT = 0.4; return { impact: Promise.resolve(), done: Promise.resolve() }; }, update() {} };
    this.throwT = 0; this.hitT = 0;
  }
  update(dt) { this.throwT = Math.max(0, this.throwT - dt); this.hitT = Math.max(0, this.hitT - dt); }
}

export class BattleStage2D {
  constructor(game) {
    this.game = game;
    this.engine = game.engine;
    this.audio = game.audio;
    this.origin = V(0, 0, 0);
    this.views = { player: null, enemy: null };
    this.fx = new BattleFX2D(this);
    this.active = false;
    this.t = 0;
    this.cam = { x: 0, y: 0 };
    this.bgCache = new Map();
    this.mode = 'battle';
    this.balls = [];
  }

  get W() { return this.engine.W; }
  get H() { return this.engine.H; }

  /** Positions des plateformes (pixels de l'image). */
  spot(side) {
    const W = this.W, H = this.H;
    const s = this.slideIn;
    if (side === 'enemy') return { x: Math.round(W * 0.72 + s * W * 0.7), y: Math.round(H * 0.43) };
    return { x: Math.round(W * 0.25 - s * W * 0.7), y: Math.round(H * 0.69) };
  }
  center(side) { const v = this.views[side]; if (v) return v.center(); const p = this.spot(side); return { x: p.x, y: p.y - 18 }; }
  other(side) { return side === 'player' ? 'enemy' : 'player'; }

  enter(cfg) {
    this.cfg = cfg;
    this.biome = cfg.biome || 'prairie';
    this.accent = cfg.accent || '#ffb547';
    this.active = true;
    this.mode = 'battle';
    this.fx.clear();
    this.balls = [];
    this.sun = false;
    for (const s of ['player', 'enemy']) this.views[s] = null;
    const g = this.game;
    const look = PLAYER_LOOKS[g.data.look] || PLAYER_LOOKS.garcon;
    this.playerTrainer = new TrainerSprite(this, g.baker.trainer(look, 'trainerBack', `player:${g.data.look}`), 'player');
    this.enemyTrainer = cfg.trainer ? new TrainerSprite(this, g.baker.trainer(cfg.trainer.look || {}, 'trainerFront', `t:${cfg.trainer.id || cfg.trainer.name}:${cfg.trainer.cls}`), 'enemy') : null;
    this.slideIn = 1;
    tweens.tween(0.9, (t) => { this.slideIn = 1 - t; }, Ease.outCubic);
    this.shotTo('neutral', 0);
  }

  leave() {
    this.active = false;
    for (const s of ['player', 'enemy']) this.views[s] = null;
    this.fx.clear();
  }

  setView(side, creature) {
    const v = new View(this, side, creature);
    this.views[side] = v;
    return v;
  }

  // ── « Plans de caméra » : légers décalages au pixel près ───────────
  shotTo(name, dur = 0.5) {
    const T = { neutral: [0, 0], enemyFocus: [-10, 6], heroLow: [8, -6], side: [-4, 2], overShoulder: [6, -4], targetClose: [-6, 4], wide: [0, 2], center: [0, 0] }[name] || [0, 0];
    const fx = this.cam.x, fy = this.cam.y;
    if (dur <= 0) { this.cam.x = T[0]; this.cam.y = T[1]; return Promise.resolve(); }
    return tweens.tween(dur, (t) => { this.cam.x = fx + (T[0] - fx) * t; this.cam.y = fy + (T[1] - fy) * t; }, Ease.inOutCubic);
  }
  setShot(name, side, duration = 0.8) { return this.shotTo(typeof name === 'string' ? name : 'enemyFocus', duration * 0.6); }
  cut(name) { this.shotTo(name || 'neutral', 0); }
  moveCamera() { return Promise.resolve(); }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    for (const s of ['player', 'enemy']) this.views[s]?.update(dt);
    this.playerTrainer?.update(dt);
    this.enemyTrainer?.update(dt);
    this.fx.update(dt);
  }

  // ── Dessin ─────────────────────────────────────────────────────────
  background() {
    const W = this.W, H = this.H;
    const night = this.game.sky?.isNight && !['grotte', 'interieur'].includes(this.biome);
    const key = `${this.biome}|${night ? 1 : 0}|${W}x${H}|${this.accent}`;
    let c = this.bgCache.get(key);
    if (!c) { c = paintBattleBg(this.biome, night, W, H, this.accent); this.bgCache.set(key, c); }
    return c;
  }

  platform(side) {
    const key = `pad|${this.biome}|${side}`;
    let c = this.bgCache.get(key);
    if (!c) { c = paintPlatform(this.biome, side); this.bgCache.set(key, c); }
    return c;
  }

  render(dt) {
    this.dtLast = dt;
    const E = this.engine;
    const ctx = E.fctx, glow = E.gctx;
    const W = this.W, H = this.H;
    glow.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const sh = E.getShakeOffset(this.shk || (this.shk = { x: 0, y: 0 }));
    const cx = Math.round(this.cam.x) + sh.x, cy = Math.round(this.cam.y) + sh.y;
    if (this.mode === 'evolution' || this.mode === 'hatch') { this.renderCenter(ctx, glow, W, H, dt); return; }
    ctx.drawImage(this.background(), cx * 0.5 - 8, cy * 0.5 - 4, W + 16, H + 8);
    ctx.save();
    ctx.translate(cx, cy);
    // plateformes
    for (const side of ['enemy', 'player']) {
      const p = this.spot(side), pad = this.platform(side);
      ctx.drawImage(pad, p.x - pad.width / 2, p.y - pad.height / 2 + 2);
    }
    // ombres des Lumins
    for (const side of ['enemy', 'player']) {
      const v = this.views[side];
      if (!v || !v.visible || v.scale < 0.05 || v.sink >= 1) continue;
      const p = this.spot(side);
      ctx.globalAlpha = 0.28 * v.scale;
      ctx.fillStyle = '#000';
      const rx = Math.max(8, (v.sprite.bounds.w * 0.4) * v.scale), ry = Math.max(3, rx * 0.28);
      ctx.beginPath(); ctx.ellipse(p.x + v.ox, p.y + 1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // dresseurs
    for (const tr of [this.enemyTrainer, this.playerTrainer]) {
      if (!tr || !tr.visible || tr.slide >= 1 || !tr.group.visible) continue;
      const p = this.spot(tr.side);
      const s = tr.sprite;
      const off = tr.side === 'enemy' ? tr.slide * W * 0.6 + 14 : -tr.slide * W * 0.6 - 8 - (tr.throwT > 0 ? 4 : 0);
      const X = Math.round(p.x + off - s.ax), Y = Math.round(p.y + (tr.side === 'player' ? 22 : 2) - s.ay);
      ctx.drawImage(s.canvas, X + (tr.hitT > 0 ? Math.round(Math.sin(tr.hitT * 40) * 2) : 0), Y);
    }
    // Lumins (l'adversaire d'abord : il est plus loin)
    for (const side of ['enemy', 'player']) this.drawView(ctx, glow, this.views[side]);
    // Prismes
    for (const b of this.balls) drawBall(ctx, glow, b);
    this.fx.draw(ctx, glow, W, H);
    ctx.restore();
    if (this.sun) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = 'rgba(255,220,150,0.35)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    this.game.weather?.draw(ctx, glow, W, H, 0, 0, 0, dt);
  }

  drawView(ctx, glow, v) {
    if (!v || !v.visible || v.scale < 0.02) return;
    const s = v.sprite;
    const fr = v.frame;
    const b = v.base;
    const k = v.scale;
    const w = s.w * k, h = s.h * k;
    const X = Math.round(b.x - s.ax * k), Y = Math.round(b.y - s.ay * k + v.sink * (s.ay - s.top) * k);
    ctx.save();
    if (v.sink > 0) { ctx.beginPath(); ctx.rect(-200, -200, this.W + 400, b.y + 2 + 200); ctx.clip(); }
    ctx.globalAlpha = v.alpha;
    ctx.drawImage(fr.canvas, X, Y, Math.round(w), Math.round(h));
    // parties lumineuses (flammes, cristaux, yeux) : halo doux + bloom
    if (fr.em && v.alpha > 0.1) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 * v.alpha;
      ctx.drawImage(fr.em, X, Y, Math.round(w), Math.round(h));
      ctx.globalCompositeOperation = 'source-over';
      glow.globalAlpha = 0.85 * v.alpha;
      glow.drawImage(fr.em, X + this.cam.x, Y + this.cam.y, Math.round(w), Math.round(h));
      glow.globalAlpha = 1;
    }
    if (this.fxOn !== false) v.emitAura(this.dtLast || 0.016, X, Y, k);
    const f = Math.max(v.flashAmt, Math.min(1, v.glow));
    if (f > 0.02) {
      const tinted = tint(s, v.flashAmt > v.glow ? v.flashColor : v.glowColor);
      ctx.globalAlpha = Math.min(1, f) * v.alpha;
      ctx.drawImage(tinted, X, Y, Math.round(w), Math.round(h));
      glow.globalAlpha = Math.min(1, f) * 0.8;
      glow.drawImage(tinted, X + this.cam.x, Y + this.cam.y, Math.round(w), Math.round(h));
      glow.globalAlpha = 1;
    }
    ctx.restore();
    if (v.shiny && Math.random() < 0.04) this.fx.sparkles(v.center(), '#ffffff', 2, { speed: 0.6, size: 0.3 });
  }

  renderCenter(ctx, glow, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0e1e'); g.addColorStop(1, '#1e1838');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // rayons tournants
    ctx.save();
    ctx.translate(W / 2, H * 0.55);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffe8b0';
    for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillRect(0, -2, W, 4); }
    ctx.restore();
    ctx.globalAlpha = 1;
    const c = this.centerSprites || [];
    for (const it of c) {
      if (!it.visible) continue;
      const s = it.sprite, k = it.scale || 2;
      const X = Math.round(W / 2 - s.ax * k), Y = Math.round(H * 0.62 - s.ay * k + (it.dy || 0));
      ctx.drawImage(s.canvas, X + (it.dx || 0), Y, s.w * k, s.h * k);
      if (it.glow > 0.02) {
        const tt = tint(s, '#ffffff');
        ctx.globalAlpha = Math.min(1, it.glow); ctx.drawImage(tt, X + (it.dx || 0), Y, s.w * k, s.h * k);
        glow.globalAlpha = Math.min(1, it.glow) * 0.8; glow.drawImage(tt, X + (it.dx || 0), Y, s.w * k, s.h * k);
        ctx.globalAlpha = 1; glow.globalAlpha = 1;
      }
    }
    this.fx.draw(ctx, glow, W, H);
  }

  // ── Séquences ──────────────────────────────────────────────────────
  async introWild(creature) {
    const v = this.setView('enemy', creature);
    v.setGlow(1, '#000000');
    await sleep(0.55);
    tweens.tween(0.5, (t) => v.setGlow(1 - t, '#000000'));
    this.fx.sparkles(v.center(), TYPES[creature.types[0]].color, 24, { speed: 2 });
    if (creature.shiny) { await sleep(0.3); this.fx.sparkles(v.center(), '#ffffff', 40, { speed: 4, size: 0.35 }); this.audio.play('shiny'); }
    v.play('happy');
    this.audio.play(creature.types[0]);
    await sleep(0.6);
  }

  async introTrainer() {
    if (!this.enemyTrainer) return;
    await sleep(0.7);
  }

  /** Prisme lancé en cloche (résout à l'arrivée). */
  throwBall(from, to, color = '#ffb547', duration = 0.6, h = 46) {
    const b = { x: from.x, y: from.y, color, rot: 0, open: 0 };
    this.balls.push(b);
    this.audio.play('throw');
    return tweens.tween(duration, (t) => {
      b.x = from.x + (to.x - from.x) * t;
      b.y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * h;
      b.rot = t * 12;
    }, Ease.linear).then(() => b);
  }
  dropBall(b) { const i = this.balls.indexOf(b); if (i >= 0) this.balls.splice(i, 1); }

  async sendOut(side, creature, { throwBall = true } = {}) {
    const v = this.setView(side, creature);
    v.scale = 0.01;
    const trainer = side === 'player' ? this.playerTrainer : this.enemyTrainer;
    const target = this.center(side);
    if (throwBall && trainer && trainer.slide < 1) {
      trainer.animator.play('attack');
      const p = this.spot(side);
      const from = { x: p.x + (side === 'enemy' ? 20 : -16), y: p.y - 40 };
      tweens.tween(0.45, (t) => { trainer.slide = t; }, Ease.inCubic);
      const ball = await this.throwBall(from, { x: p.x, y: p.y - 14 }, ITEMS[creature.ball]?.color || '#ffb547', 0.55);
      this.dropBall(ball);
    } else if (throwBall) {
      const p = this.spot(side);
      const ball = await this.throwBall({ x: side === 'player' ? -10 : this.W + 10, y: p.y - 50 }, { x: p.x, y: p.y - 14 }, ITEMS[creature.ball]?.color || '#ffb547', 0.45);
      this.dropBall(ball);
    }
    this.audio.play('open');
    const c = { x: this.spot(side).x, y: this.spot(side).y - 16 };
    this.fx.flash(c, '#ffffff', 40, 0.4);
    this.fx.ring(c, '#ffe6a8', 30, 0.45);
    this.fx.sparkles(c, TYPES[creature.types[0]].color, 30, { speed: 3 });
    if (creature.shiny) { this.fx.sparkles(c, '#ffffff', 40, { speed: 4, size: 0.35 }); this.audio.play('shiny'); }
    v.setGlow(1, '#ffffff');
    await tweens.tween(0.4, (t) => { v.scale = Math.max(0.01, Ease.outBack(t)); }, Ease.linear);
    v.scale = 1;
    tweens.tween(0.5, (t) => v.setGlow(1 - t));
    v.play('happy');
    this.audio.play(creature.types[0]);
    await sleep(0.4);
  }

  async recall(side) {
    const v = this.views[side];
    if (!v) return;
    const c = v.center();
    const p = this.spot(side);
    this.fx.motes(c, { x: p.x + (side === 'player' ? -60 : 60), y: p.y - 30 }, '#ff8a8a', 30, 0.5);
    v.setGlow(1, '#ff9a9a');
    this.audio.play('back');
    await tweens.tween(0.4, (t) => { v.scale = Math.max(0.01, 1 - t); }, Ease.inCubic);
    this.views[side] = null;
  }

  async performMove(side, move, hit, targetSide) {
    const atk = this.views[side];
    if (!atk) return;
    const tside = targetSide || this.other(side);
    const def = this.views[tside];
    const type = move.type;
    const style = moveStyle(move);
    const fast = !this.game.settings.battleAnims;
    await this.setShot(style === 'contact' ? 'side' : pick(['overShoulder', 'heroLow', 'side']), side, fast ? 0.15 : 0.35);
    const A = atk.center();
    const tgt = () => (this.views[this.other(side)] ? this.views[this.other(side)].center() : this.center(this.other(side)));
    if (style === 'aura') {
      const selfTarget = tside === side;
      const r = atk.play('cast');
      await r.impact;
      this.audio.play(move.foe ? 'debuff' : 'buff');
      if (selfTarget) {
        this.fx.aura(type, this.spot(side), 36, false);
        atk.flash(TYPES[type].color, 1.6, 0.6);
        if (move.heal || move.rest) this.fx.sparkles(atk.center(), '#9cff6b', 30, { speed: 2.5, up: 2 });
        if (move.weather) this.fx.ring(this.spot(side), TYPES[type].color, 60, 0.8);
      } else {
        await this.fx.projectile(type, A, this.center(tside), 0.4, 0.6);
        if (hit && def) { this.fx.aura(type, this.spot(tside), 36, true); def.flash('#6a6aff', 1.2, 0.5); }
      }
      await sleep(fast ? 0.15 : 0.4);
      return;
    }
    this.audio.play(type);
    if (style === 'contact') {
      const T = tgt();
      const dx = T.x - A.x, dy = T.y - A.y;
      const r = atk.play('attack', { timeScale: 0.8 });
      const ox0 = atk.ox, oy0 = atk.oy;
      atk.anim = null;
      await tweens.tween(0.22, (t) => { atk.ox = ox0 + dx * 0.62 * Ease.inCubic(t); atk.oy = oy0 + dy * 0.62 * Ease.inCubic(t); }, Ease.linear);
      if (hit) this.fx.burst(type, { x: T.x - dx * 0.12, y: T.y - dy * 0.12 }, 0.8); else this.dodge(this.other(side));
      tweens.tween(0.3, (t) => { atk.ox = dx * 0.62 * (1 - t); atk.oy = dy * 0.62 * (1 - t); }, Ease.inOutCubic).then(() => { atk.ox = 0; atk.oy = 0; });
      r.impact.then(() => {});
      return;
    }
    if (style === 'quake') {
      const r = atk.play('attack');
      await r.impact;
      this.fx.quake({ x: this.W / 2, y: this.H * 0.62 });
      this.audio.play('quake');
      await sleep(0.35);
      if (hit) this.fx.burst('roche', tgt(), 1.1); else this.dodge(this.other(side));
      return;
    }
    if (style === 'beam') {
      const r = atk.play('cast');
      await r.impact;
      const T = tgt();
      this.fx.beam(A, hit ? T : { x: T.x + 30, y: T.y - 20 }, TYPES[type].color, 0.6, 0.2);
      this.fx.flash(A, TYPES[type].color, 30, 0.5);
      await sleep(0.28);
      if (hit) this.fx.burst(type, T, 1); else this.dodge(this.other(side));
      return;
    }
    if (style === 'projectile') {
      const r = atk.play('attack');
      await r.impact;
      let T = tgt();
      if (!hit) { T = { x: T.x + 24, y: T.y - 14 }; this.dodge(this.other(side)); }
      await this.fx.projectile(type, A, T, fast ? 0.3 : 0.45, 1.0);
      if (hit) this.fx.burst(type, T, 0.9);
      return;
    }
    const r = atk.play('cast');
    this.fx.sparkles(A, TYPES[type].color, 24, { speed: 2, up: 2 });
    await r.impact;
    const T = tgt();
    await this.fx.areaCast(type, T);
    if (hit) this.fx.burst(type, T, 1.3); else this.dodge(this.other(side));
  }

  dodge(side) {
    const v = this.views[side];
    if (!v) return;
    this.audio.play('miss');
    const d = side === 'player' ? -1 : 1;
    tweens.tween(0.45, (t) => { v.ox = d * 14 * Math.sin(t * Math.PI); }, Ease.linear).then(() => { v.ox = 0; });
  }

  async hitReaction(side, { mult = 1, crit = false, ratio = 0.2, type, source }) {
    const v = this.views[side];
    if (!v) return;
    if (source && source !== 'move') {
      v.flash(source === 'status' ? '#b25ad9' : '#ff6a3d', 1.4, 0.4);
      this.audio.play('hit');
      return;
    }
    v.play('hit');
    v.flash(mult > 1 ? '#ffffff' : TYPES[type]?.color || '#ffffff', mult > 1 ? 2.2 : 1.6, 0.45);
    this.engine.addShake(0.05 + ratio * 0.45 + (mult > 1 ? 0.12 : 0) + (crit ? 0.1 : 0));
    if (mult > 1) { this.engine.bloomBoost = 0.9; this.fx.screenFlash('#ffffff', 0.35); }
    if (crit) this.fx.star(v.center(), '#ffe48a', 24);
    this.audio.play(mult > 1 ? 'super' : mult < 1 ? 'weak' : 'hit');
    await sleep(0.5);
  }

  healFx(side) {
    const v = this.views[side];
    if (!v) return;
    this.fx.sparkles(v.center(), '#9cff6b', 26, { speed: 2, up: 2 });
    v.flash('#9cff6b', 1.2, 0.5);
  }

  statFx(side, changes) {
    const v = this.views[side];
    if (!v) return;
    const up = Object.values(changes).some((n) => n > 0);
    this.fx.aura(up ? 'lumiere' : 'astral', this.spot(side), 36, !up);
    this.audio.play(up ? 'buff' : 'debuff');
  }

  statusFx(side, status) {
    const v = this.views[side];
    if (!v) return;
    this.fx.statusFx(status, this.spot(side), (v.sprite.ay - v.sprite.top) * 0.9);
    this.audio.play('status');
  }

  async faint(side) {
    const v = this.views[side];
    if (!v) return;
    this.audio.play('faint');
    const r = v.play('faint');
    await r.done;
    v.visible = false;
  }

  setWeather(type) {
    this.game.weather.set(type === 'rain' ? ['rain'] : type === 'snow' ? ['snow'] : type === 'sand' ? ['sand'] : []);
    this.sun = type === 'sun';
  }

  async ballBlocked() {
    const p = this.spot('player'), e = this.center('enemy');
    const b = await this.throwBall({ x: p.x - 10, y: p.y - 50 }, { x: e.x - 10, y: e.y + 6 }, '#ffb547', 0.5);
    this.audio.play('deny');
    const x0 = b.x, y0 = b.y;
    await tweens.tween(0.4, (t) => { b.x = x0 - t * 40; b.y = y0 + Math.sin(t * Math.PI) * -16 + t * 30; });
    this.dropBall(b);
  }

  async capture(itemId, shakes, success) {
    const v = this.views.enemy;
    const item = ITEMS[itemId];
    const sp = this.spot('enemy');
    const above = { x: sp.x, y: v ? v.topY() - 4 : sp.y - 40 };
    this.playerTrainer.animator.play('attack');
    const P = this.spot('player');
    const b = await this.throwBall({ x: P.x - 6, y: P.y - 50 }, above, item.color, 0.7, 50);
    this.audio.play('open');
    b.open = 1;
    this.fx.flash(above, '#ffffff', 50, 0.5);
    this.fx.ring(above, item.color, 26, 0.4);
    if (v) {
      v.setGlow(1, '#ffffff');
      this.fx.motes(v.center(), above, '#ffffff', 40, 0.5);
      await tweens.tween(0.5, (t) => { v.scale = Math.max(0.01, 1 - t); }, Ease.inCubic);
      v.visible = false;
    }
    b.open = 0;
    const ground = { x: sp.x, y: sp.y - 4 };
    await tweens.tween(0.5, (t) => { b.x = above.x; b.y = above.y + (ground.y - above.y) * t; }, Ease.outBounce);
    for (let i = 0; i < Math.min(3, shakes); i++) {
      await sleep(0.4);
      this.audio.play('shake');
      await tweens.tween(0.5, (t) => { b.rot = Math.sin(t * Math.PI * 2) * 0.5; b.x = ground.x + Math.sin(t * Math.PI * 2) * 2; }, Ease.inOutSine);
      b.rot = 0;
    }
    await sleep(0.35);
    if (success) {
      this.audio.play('catch');
      this.fx.sparkles({ x: b.x, y: b.y - 4 }, '#ffd23f', 30, { speed: 2.2, up: 1.5 });
      this.fx.ring({ x: b.x, y: b.y }, '#ffd23f', 20, 0.6);
      b.dark = true;
      await sleep(1.0);
      await tweens.tween(0.35, (t) => { b.fade = t; });
      this.dropBall(b);
    } else {
      this.audio.play('break');
      this.fx.flash({ x: b.x, y: b.y }, '#ffffff', 50, 0.4);
      this.fx.sparkles({ x: b.x, y: b.y }, item.color, 30, { speed: 4 });
      this.dropBall(b);
      if (v) {
        v.visible = true;
        await tweens.tween(0.35, (t) => { v.scale = Math.max(0.01, Ease.outBack(t)); }, Ease.linear);
        v.scale = 1;
        tweens.tween(0.5, (t) => v.setGlow(1 - t));
        v.play('attack');
      }
      await sleep(0.3);
    }
  }

  async evolution(fromSpecies, toSpecies, { shiny = false, isCancelled = () => false } = {}) {
    const B = this.game.baker;
    const oldS = { sprite: B.creature(fromSpecies, 'front', shiny), visible: true, glow: 0, scale: 2 };
    const newS = { sprite: B.creature(toSpecies, 'front', shiny), visible: false, glow: 1, scale: 2 };
    this.centerSprites = [oldS, newS];
    this.mode = 'evolution';
    this.fx.clear();
    const W = this.W, H = this.H;
    const C = { x: W / 2, y: H * 0.45 };
    this.audio.play('evolve');
    const ring = () => { for (let i = 0; i < 4; i++) { const a = Math.random() * Math.PI * 2; this.fx.motes({ x: C.x + Math.cos(a) * 90, y: C.y + Math.sin(a) * 60 }, C, '#ffffff', 3, 0.7); } };
    await tweens.tween(1.5, (t) => { oldS.glow = t; if (Math.random() < 0.4) ring(); });
    let interval = 0.42, showNew = false, elapsed = 0, cancelled = false;
    while (elapsed < 3.2) {
      if (isCancelled()) { cancelled = true; break; }
      showNew = !showNew;
      oldS.visible = !showNew; newS.visible = showNew;
      ring();
      await sleep(interval);
      elapsed += interval;
      interval = Math.max(0.05, interval * 0.8);
    }
    if (cancelled) {
      oldS.visible = true; newS.visible = false;
      await tweens.tween(0.8, (t) => { oldS.glow = 1 - t; });
      await sleep(0.5);
      this.mode = 'battle'; this.centerSprites = null;
      return false;
    }
    oldS.visible = false; newS.visible = true;
    this.audio.play('flash');
    this.engine.bloomBoost = 2;
    this.fx.screenFlash('#ffffff', 1);
    this.fx.ring(C, '#ffffff', 80, 0.8);
    this.fx.sparkles(C, TYPES[CREATURE_MAP[toSpecies].types[0]].color, 70, { speed: 5, size: 0.35, life: 1.3 });
    await tweens.tween(1.2, (t) => { newS.glow = 1 - t; });
    newS.dy = 0;
    await tweens.tween(0.5, (t) => { newS.dy = -Math.abs(Math.sin(t * Math.PI * 2)) * 8; });
    this.audio.play(CREATURE_MAP[toSpecies].types[0]);
    await sleep(0.8);
    this.mode = 'battle'; this.centerSprites = null;
    return true;
  }

  async hatch(species, shiny) {
    const egg = { sprite: eggSprite(TYPES[CREATURE_MAP[species].types[0]].color), visible: true, glow: 0, scale: 2, dx: 0 };
    this.centerSprites = [egg];
    this.mode = 'hatch';
    this.fx.clear();
    const C = { x: this.W / 2, y: this.H * 0.45 };
    for (let i = 0; i < 4; i++) {
      await sleep(0.55 - i * 0.1);
      this.audio.play('shake');
      await tweens.tween(0.4, (t) => { egg.dx = Math.round(Math.sin(t * Math.PI * 3) * (2 + i * 1.5)); });
    }
    egg.glow = 1;
    this.audio.play('flash');
    this.engine.bloomBoost = 2;
    this.fx.screenFlash('#ffffff', 1);
    this.fx.sparkles(C, '#fff6e6', 50, { speed: 4, shape: 4 });
    const mon = { sprite: this.game.baker.creature(species, 'front', shiny), visible: true, glow: 1, scale: 2 };
    this.centerSprites = [mon];
    await tweens.tween(0.8, (t) => { mon.glow = 1 - t; });
    this.audio.play(CREATURE_MAP[species].types[0]);
    if (shiny) this.fx.sparkles(C, '#ffffff', 40, { speed: 4 });
    await sleep(1.1);
    this.mode = 'battle'; this.centerSprites = null;
  }
}

/* ═════════ Dessins de l'arène ═════════ */
const tintCache = new WeakMap();
function tint(s, color) {
  let m = tintCache.get(s);
  if (!m) { m = new Map(); tintCache.set(s, m); }
  let c = m.get(color);
  if (!c) {
    c = canvas(s.w, s.h);
    const x = ctx2d(c);
    x.drawImage(s.white, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color; x.fillRect(0, 0, s.w, s.h);
    m.set(color, c);
  }
  return c;
}

function drawBall(ctx, glow, b) {
  const X = Math.round(b.x), Y = Math.round(b.y);
  ctx.save();
  ctx.globalAlpha = 1 - (b.fade || 0);
  ctx.translate(X, Y);
  ctx.rotate(Math.round((b.rot || 0) * 4) / 4);
  const top = b.dark ? shade(b.color, -0.35) : b.color;
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(-4, -4, 8, 8);
  ctx.fillStyle = top; ctx.fillRect(-3, -4, 6, 4); ctx.fillRect(-4, -3, 8, 3);
  ctx.fillStyle = '#f4f4f8'; ctx.fillRect(-3, 1, 6, 3); ctx.fillRect(-4, 1, 8, 2);
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(-4, 0, 8, 1);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -1, 2, 2); ctx.fillRect(-2, -3, 1, 1);
  ctx.restore();
  if (b.open) { glow.fillStyle = '#ffffff'; glow.fillRect(X - 5, Y - 5, 10, 10); }
}

function eggSprite(color) {
  const px = new Px(24, 30);
  px.ellipse(12, 16, 9.5, 12.5, null, (x, y, nx, ny) => px.set(x, y, nx + ny < -0.6 ? '#ffffff' : nx + ny < 0.3 ? '#fff6e6' : '#e8dcc4'));
  for (const [x, y] of [[8, 10], [15, 14], [10, 20], [16, 22], [12, 7]]) px.disc(x, y, 2, null, (xx, yy) => { if (px.a(xx, yy)) px.set(xx, yy, color); });
  px.outline(null, { k: 0.7 });
  const b = px.bounds();
  return { canvas: px.toCanvas(), w: 24, h: 30, ax: 12, ay: b.y1, top: b.y0, white: px.silhouette([255, 255, 255]) };
}

const BG = {
  prairie: { sky: ['#5aa8f0', '#86c4f6', '#b8dcf8', '#e2f2fa'], far: '#6aa858', far2: '#8cc070', ground: ['#7cc456', '#6ab04a', '#96d468'], clouds: true, hills: 'round' },
  foret: { sky: ['#4a8ac8', '#6aa6d8', '#a0c8e0', '#c8e0e8'], far: '#2f6a34', far2: '#3f7d3e', ground: ['#5aa543', '#4a8c38', '#71bb52'], clouds: true, hills: 'trees' },
  cote: { sky: ['#4aa0f0', '#7ac0f8', '#acd8fa', '#dcf0fc'], far: '#3a7ed0', far2: '#5aa2e6', ground: ['#ecd8a0', '#d9be82', '#f6e9c0'], clouds: true, hills: 'sea' },
  montagne: { sky: ['#5a90d0', '#86acd8', '#b4cce4', '#dce6ee'], far: '#7a7480', far2: '#9a94a0', ground: ['#86b257', '#6c9844', '#a0c66c'], clouds: true, hills: 'peaks' },
  desert: { sky: ['#e0a060', '#f0c080', '#f8dca8', '#fcecc8'], far: '#d8aa70', far2: '#e8c48a', ground: ['#ecd8a0', '#d9be82', '#f6e9c0'], clouds: false, hills: 'dunes' },
  marais: { sky: ['#5a6a6a', '#7a8a84', '#9aa89c', '#b8c4b4'], far: '#3a4a34', far2: '#4c5c44', ground: ['#77924e', '#5f7a3c', '#8ca85e'], clouds: true, hills: 'dead' },
  neige: { sky: ['#8aaad8', '#a8c0e4', '#c8d8ee', '#e8f0f8'], far: '#c8d4e8', far2: '#e4ecf6', ground: ['#eef4fb', '#d6e2ef', '#ffffff'], clouds: true, hills: 'snowpeaks' },
  volcan: { sky: ['#3a1a1a', '#6a2a1e', '#a8442a', '#d8703a'], far: '#2a1a18', far2: '#4a2a22', ground: ['#5e544e', '#4b433f', '#706660'], clouds: false, hills: 'volcano' },
  celeste: { sky: ['#8ab0f8', '#a8c4fa', '#c8dafc', '#ecf2ff'], far: '#a8c8a0', far2: '#c8e0c0', ground: ['#94d388', '#78bb72', '#b0e3a2'], clouds: true, hills: 'islands' },
  grotte: { sky: ['#140e0c', '#1e1612', '#2a201a', '#362a22'], far: '#3a2e26', far2: '#52423a', ground: ['#7a6c5c', '#63574a', '#8c7e6a'], clouds: false, hills: 'cave' },
  interieur: { sky: ['#3a3446', '#4a4458', '#5a546a', '#6a647c'], far: '#2a2636', far2: '#3a3446', ground: ['#c8b8a0', '#b0a088', '#dccab0'], clouds: false, hills: 'hall' },
};

function paintBattleBg(biome, night, W, H, accent) {
  const B = BG[biome] || BG.prairie;
  const c = canvas(W + 16, H + 8);
  const x = ctx2d(c);
  const CW = W + 16, CH = H + 8;
  const hz = Math.round(CH * 0.46);
  const img = x.createImageData(CW, CH);
  const put = (X, Y, hex) => { const n = parseInt(hex.slice(1), 16); const k = (Y * CW + X) * 4; img.data[k] = (n >> 16) & 255; img.data[k + 1] = (n >> 8) & 255; img.data[k + 2] = n & 255; img.data[k + 3] = 255; };
  // ciel : bandes tramées
  for (let Y = 0; Y < hz; Y++) for (let X = 0; X < CW; X++) {
    const t = Y / hz * 3 + (bayer(X, Y) - 0.5) * 0.9;
    put(X, Y, B.sky[Math.max(0, Math.min(3, Math.floor(t)))]);
  }
  // sol : bandes de perspective
  for (let Y = hz; Y < CH; Y++) for (let X = 0; X < CW; X++) {
    const d = (Y - hz) / (CH - hz);
    const stripe = Math.floor(Math.pow(d, 0.6) * 9);
    let col = stripe % 2 ? B.ground[0] : B.ground[2];
    if (d < 0.08) col = B.ground[1];
    if (biome === 'interieur') col = ((X >> 4) + stripe) % 2 ? B.ground[0] : B.ground[2];
    if (hash2(X, Y, 3) < 0.025) col = B.ground[1];
    put(X, Y, col);
  }
  x.putImageData(img, 0, 0);
  // étoiles la nuit
  if (night) { x.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) x.fillRect(Math.floor(hash2(i, 1, 9) * CW), Math.floor(hash2(i, 2, 9) * hz * 0.8), 1, 1); }
  // nuages
  if (B.clouds) {
    for (let i = 0; i < 5; i++) {
      const cx = hash2(i, 5, 2) * CW, cy = 10 + hash2(i, 6, 2) * hz * 0.5, w = 22 + hash2(i, 7, 2) * 26;
      for (let k = 0; k < 5; k++) {
        const r = w * (0.22 + hash2(i, k, 4) * 0.14), ox = (k - 2) * w * 0.2;
        x.fillStyle = '#f4f8fc'; x.beginPath(); x.ellipse(Math.round(cx + ox), Math.round(cy - r * 0.3), r, r * 0.65, 0, 0, 7); x.fill();
      }
      x.fillStyle = '#d4e2f0'; x.fillRect(Math.round(cx - w * 0.5), Math.round(cy), Math.round(w), 2);
    }
  }
  // lointains
  const ridge = (fn, col) => { x.fillStyle = col; for (let X = 0; X < CW; X++) { const h = fn(X); x.fillRect(X, hz - h, 1, h + 1); } };
  switch (B.hills) {
    case 'round': ridge((X) => 14 + Math.sin(X * 0.03) * 6 + Math.sin(X * 0.071 + 1) * 4, B.far2); ridge((X) => 8 + Math.sin(X * 0.05 + 2) * 4, B.far); break;
    case 'trees': case 'dead': {
      ridge((X) => 18 + Math.sin(X * 0.09) * 4, B.far);
      const key = B.hills === 'dead' ? 'tree:deadtree:' : 'tree:pine:';
      for (let X = -10; X < CW; X += 14) { const s = natureSprite(`${key}${(X & 7) % 4}`); x.drawImage(s.canvas, X, hz - s.h + 2); }
      break;
    }
    case 'sea': {
      x.fillStyle = B.far; x.fillRect(0, hz - 12, CW, 12);
      x.fillStyle = B.far2; for (let X = 0; X < CW; X += 7) x.fillRect(X + (X % 3), hz - 10 + (X % 5), 3, 1);
      x.fillStyle = '#dcf4ff'; for (let X = 0; X < CW; X += 11) x.fillRect(X, hz - 11 + (X % 4), 2, 1);
      break;
    }
    case 'peaks': case 'snowpeaks': {
      for (let k = 0; k < 6; k++) {
        const px0 = (k / 5) * CW + hash2(k, 1, 3) * 20 - 10, h = 30 + hash2(k, 2, 3) * 26, w = 40 + hash2(k, 3, 3) * 30;
        x.fillStyle = B.far; x.beginPath(); x.moveTo(px0 - w, hz); x.lineTo(px0, hz - h); x.lineTo(px0 + w, hz); x.fill();
        x.fillStyle = B.far2; x.beginPath(); x.moveTo(px0 - w * 0.2, hz - h * 0.8); x.lineTo(px0, hz - h); x.lineTo(px0 + w * 0.25, hz - h * 0.75); x.lineTo(px0 + w * 0.05, hz - h * 0.7); x.fill();
        if (B.hills === 'snowpeaks' || k % 2 === 0) { x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(px0 - w * 0.18, hz - h * 0.82); x.lineTo(px0, hz - h); x.lineTo(px0 + w * 0.18, hz - h * 0.82); x.fill(); }
      }
      break;
    }
    case 'dunes': ridge((X) => 10 + Math.sin(X * 0.025) * 7 + Math.sin(X * 0.06) * 3, B.far); ridge((X) => 5 + Math.sin(X * 0.04 + 1) * 3, B.far2); break;
    case 'volcano': {
      x.fillStyle = B.far; x.beginPath(); x.moveTo(CW * 0.35, hz); x.lineTo(CW * 0.55, hz - 50); x.lineTo(CW * 0.62, hz - 50); x.lineTo(CW * 0.85, hz); x.fill();
      x.fillStyle = '#ff6a1a'; x.fillRect(Math.round(CW * 0.555), hz - 52, Math.round(CW * 0.06), 3);
      ridge((X) => 8 + Math.sin(X * 0.05) * 4, B.far2);
      break;
    }
    case 'islands': {
      for (let k = 0; k < 4; k++) {
        const ix = (k + 0.5) / 4 * CW, iy = hz - 28 - hash2(k, 4, 6) * 20, w = 18 + hash2(k, 5, 6) * 16;
        x.fillStyle = '#8a7a9a'; x.beginPath(); x.moveTo(ix - w, iy); x.lineTo(ix + w, iy); x.lineTo(ix, iy + w * 0.8); x.fill();
        x.fillStyle = '#a8d896'; x.fillRect(Math.round(ix - w), Math.round(iy - 3), Math.round(w * 2), 4);
      }
      ridge((X) => 10 + Math.sin(X * 0.04) * 5, B.far);
      break;
    }
    case 'cave': {
      x.fillStyle = B.far; x.fillRect(0, 0, CW, hz);
      for (let X = 0; X < CW; X += 9) { const h = 10 + hash2(X, 1, 5) * 26; x.fillStyle = B.far2; x.beginPath(); x.moveTo(X, 0); x.lineTo(X + 9, 0); x.lineTo(X + 4.5, h); x.fill(); }
      for (let i = 0; i < 6; i++) { const s = natureSprite(`crystal:${['violet', 'cyan', 'rose'][i % 3]}:${i % 3}`); x.drawImage(s.canvas, Math.round(hash2(i, 3, 3) * CW), hz - s.h + 4); }
      break;
    }
    case 'hall': {
      x.fillStyle = B.far; x.fillRect(0, hz - 40, CW, 40);
      x.fillStyle = accent; x.fillRect(0, hz - 6, CW, 3);
      for (let X = 10; X < CW; X += 40) { x.fillStyle = B.far2; x.fillRect(X, hz - 40, 10, 34); x.fillStyle = shade(accent, 0.3); x.fillRect(X, hz - 40, 10, 2); }
      break;
    }
    default: break;
  }
  if (night) { x.globalCompositeOperation = 'multiply'; x.fillStyle = '#5a6aa8'; x.fillRect(0, 0, CW, CH); x.globalCompositeOperation = 'source-over'; }
  return c;
}

function paintPlatform(biome, side) {
  const S = BATTLE_SCENES[biome] || BATTLE_SCENES.prairie;
  const rx = side === 'enemy' ? 54 : 66, ry = side === 'enemy' ? 13 : 16;
  const px = new Px(rx * 2 + 4, ry * 2 + 8);
  const cx = rx + 2, cy = ry + 2;
  const pad = S.pad, gr = S.ground;
  // bord en relief
  px.ellipse(cx, cy + 3, rx, ry, null, (x, y) => px.set(x, y, shade(gr, -0.45)));
  px.ellipse(cx, cy, rx, ry, null, (x, y, nx, ny) => {
    const d = nx * nx + ny * ny;
    let col = d > 0.78 ? shade(pad, -0.22) : d > 0.62 ? pad : ((Math.floor(x / 3) + Math.floor(y / 2)) % 5 === 0 ? shade(pad, 0.15) : shade(pad, 0.06));
    if (ny < -0.6 && d > 0.7) col = shade(pad, 0.25);
    px.set(x, y, col);
  });
  // touffes sur le bord
  if (!['grotte', 'interieur', 'desert', 'volcan', 'neige'].includes(biome)) for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    const X = Math.round(cx + Math.cos(t) * rx * 0.96), Y = Math.round(cy + Math.sin(t) * ry * 0.96);
    px.set(X, Y - 1, shade(gr, 0.2)); px.set(X, Y - 2, shade(gr, 0.35));
  }
  px.outline(null, { k: 0.6 });
  return px.toCanvas();
}

export { BG as BATTLE_BG };
