import * as THREE from 'three';
import { TYPES } from '../config/types.js';
import { ITEMS } from '../config/items.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { BATTLE_SCENES } from '../world/Biomes.js';
import { VEG, instanceFromPrototype } from '../render/Vegetation.js';
import { buildPrisme } from '../render/Props.js';
import { stdMat } from '../render/Materials.js';
import { surfaceTexture } from '../render/Textures.js';
import { mergeStatic } from '../render/Optimize.js';
import { createHuman, PLAYER_LOOKS } from '../world/Actors.js';
import { CreatureView } from './CreatureView.js';
import { BattleFX } from './BattleFX.js';
import { tweens, sleep, Ease, lerp, pick, rand, mulberry32 } from '../core/utils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/** Style de mise en scène d'une attaque. */
export function moveStyle(mv) {
  if (!mv) return 'projectile';
  if (mv.cat === 'St') return 'aura';
  if (mv.ground) return 'quake';
  if (mv.cat === 'P' && !mv.nc) return 'contact';
  if (mv.cat === 'P') return 'area';
  if ((mv.power || 0) >= 95) return 'area';
  if (['lumiere', 'psy', 'astral', 'glace'].includes(mv.type) && (mv.power || 0) >= 75) return 'beam';
  return 'projectile';
}

/**
 * ARÈNE DE COMBAT 3D : décor selon le biome, placement des Lumins et des dresseurs,
 * réalisation des plans de caméra, attaques, captures, évolutions et éclosions.
 */
export class BattleStage {
  constructor(game) {
    this.game = game;
    this.engine = game.engine;
    this.scene = game.engine.scene;
    this.assets = game.assets;
    this.audio = game.audio;
    this.origin = V(0, 0, 5000);
    this.root = new THREE.Group();
    this.root.position.copy(this.origin);
    this.root.visible = false;
    this.scene.add(this.root);
    this.fx = new BattleFX(this.scene, game.fxAdd, game.fxNorm, game.engine);
    this.local = { player: V(-2.7, 0, 2.5), enemy: V(2.7, 0, -2.5), playerTrainer: V(-5.8, 0, 6.8), enemyTrainer: V(6.1, 0, -6.9) };
    this.views = { player: null, enemy: null };
    this.cam = { pos: V(0, 5, 10).add(this.origin), look: this.origin.clone(), tween: null, sway: 0 };
    this.spinners = [];
    this.shakeVec = new THREE.Vector3();
    this.active = false;
    this.decor = new Map();
    this.platform = this.buildPlatform();
    this.root.add(this.platform);
  }

  buildPlatform() {
    const g = new THREE.Group();
    const tiles = surfaceTexture('stone').clone();
    tiles.needsUpdate = true;
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
    tiles.repeat.set(5, 5);
    this.padMat = new THREE.MeshStandardMaterial({ map: tiles, color: '#c8c0b0', roughness: 0.82 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(12, 12.8, 1.0, 80), this.padMat);
    pad.position.y = -0.5;
    pad.receiveShadow = true;
    g.add(pad);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(12.9, 13.4, 0.5, 80), stdMat('#6a6258', { roughness: 0.9 }));
    rim.position.y = -0.75;
    rim.receiveShadow = true;
    g.add(rim);
    this.glowMat = new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffb547', emissiveIntensity: 1.3, roughness: 0.3, side: THREE.DoubleSide });
    for (const [a, b] of [[9.4, 9.75], [2.0, 2.2], [5.8, 5.9]]) {
      const r = new THREE.Mesh(new THREE.RingGeometry(a, b, 96), this.glowMat);
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.012;
      g.add(r);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 3.4), this.glowMat);
      m.position.set(Math.sin(a) * 4, 0.012, Math.cos(a) * 4);
      m.rotation.y = a;
      g.add(m);
    }
    this.crystals = [];
    const cols = ['#ffb547', '#5fd4ff', '#ff6a8a', '#7dff9c', '#ffd23f', '#c58bff'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.sin(a) * 16.5, z = Math.cos(a) * 16.5;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 3.2, 6), stdMat('#5a5248', { roughness: 0.9 }));
      p.position.set(x, 0.6, z);
      p.castShadow = true;
      g.add(p);
      const cm = new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 3.4, roughness: 0.2 });
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), cm);
      c.position.set(x, 3.2, z);
      c.scale.set(0.55, 1, 0.55);
      g.add(c);
      this.crystals.push(c);
    }
    return g;
  }

  /** Décor (sol + végétation en couronne) selon le biome, construit une fois puis réutilisé. */
  decorFor(key) {
    if (this.decor.has(key)) return this.decor.get(key);
    const S = BATTLE_SCENES[key] || BATTLE_SCENES.prairie;
    const g = new THREE.Group();
    const groundMat = new THREE.MeshStandardMaterial({ color: S.ground, roughness: 0.95, map: surfaceTexture(key === 'grotte' ? 'stone' : key === 'interieur' ? 'tiles' : 'stone') });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 72), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.95;
    ground.receiveShadow = true;
    g.add(ground);
    const rnd = mulberry32(key.length * 97 + 13);
    const q = new THREE.Quaternion();
    const protos = {
      oak: () => VEG.oak(0), birch: () => VEG.birch(), pine: () => VEG.pine(0, false), snowpine: () => VEG.pine(0, true), palm: () => VEG.palm(), cactus: () => VEG.cactus(0),
      willow: () => VEG.willow(), deadtree: () => VEG.deadtree(false), charred: () => VEG.deadtree(true), stalagmite: () => VEG.stalagmite(), crystal: () => VEG.crystal('#9a7aff', 1.4),
    };
    const lists = new Map();
    const n = key === 'interieur' ? 0 : key === 'grotte' ? 120 : 170;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = (key === 'grotte' ? 22 : 30) + rnd() * 70;
      const s = 0.9 + rnd() * 0.8;
      q.setFromAxisAngle(UP, rnd() * 6.28);
      const t = S.trees[i % S.trees.length];
      if (!lists.has(t)) lists.set(t, []);
      lists.get(t).push(new THREE.Matrix4().compose(V(Math.cos(a) * r, -0.95, Math.sin(a) * r), q.clone(), V(s, s * (key === 'grotte' ? 2.2 : 1), s)));
    }
    for (const [t, mats] of lists) if (protos[t]) g.add(instanceFromPrototype(protos[t](), mats));
    const rocks = [];
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2, r = 19 + rnd() * 20, s = 0.7 + rnd() * 1.3;
      q.setFromAxisAngle(UP, rnd() * 6.28);
      rocks.push(new THREE.Matrix4().compose(V(Math.cos(a) * r, -0.95, Math.sin(a) * r), q.clone(), V(s, s, s)));
    }
    if (key !== 'interieur') g.add(instanceFromPrototype(VEG.rock(1, key === 'neige' ? '#c8d0d8' : key === 'volcan' ? '#3a3232' : '#8f8a84', key === 'prairie' || key === 'foret' ? '#6d8f4a' : null), rocks));
    if (key === 'interieur') {
      // tribunes et colonnes d'arène
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 14, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#3a3442', roughness: 0.8, side: THREE.BackSide }));
      wall.position.y = 6;
      g.add(wall);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const c = new THREE.Mesh(new THREE.BoxGeometry(1.4, 12, 1.4), stdMat('#5a5266', { roughness: 0.7 }));
        c.position.set(Math.sin(a) * 24.5, 5, Math.cos(a) * 24.5);
        g.add(c);
      }
    }
    if (key !== 'grotte' && key !== 'interieur' && this.game.grass) {
      const field = this.game.grass.createField({
        minX: -40, maxX: 40, minZ: -40, maxZ: 40, density: this.game.settings.quality === 'basse' ? 0.3 : 0.9, seed: key.length, chunk: 40,
        colorA: S.ground, colorB: S.pad,
        sampler: (x, z, r2) => { const d = Math.hypot(x, z); if (d < 13.6 || d > 40) return null; return { y: -0.95, scale: 0.3 + r2() * 0.4 }; },
      });
      g.add(field);
    }
    mergeStatic(g);
    g.visible = false;
    this.root.add(g);
    this.decor.set(key, g);
    return g;
  }

  makeTrainer(key, look, spotName, faceSpot) {
    const m = createHuman(this.assets, key, look);
    const g = new THREE.Group();
    g.add(m.root);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.copy(this.local[spotName]);
    const f = this.local[faceSpot];
    g.rotation.y = Math.atan2(f.x - g.position.x, f.z - g.position.z);
    this.root.add(g);
    m.animator.play('idle');
    return { group: g, animator: m.animator };
  }

  scaled(view) {
    const s = Math.min(2.2, Math.max(1.3, 1.25 / view.height));
    const ss = view.species.legendary ? Math.max(1.05, s * 0.8) : s;
    view.group.scale.setScalar(ss);
    view.height *= ss;
    return view;
  }

  spot(side) { return this.local[side].clone().add(this.origin); }
  other(side) { return side === 'player' ? 'enemy' : 'player'; }

  /** Prépare l'arène pour un combat. cfg : { biome, trainer, playerLook, theme } */
  enter(cfg) {
    this.active = true;
    this.root.visible = true;
    this.fx.clear();
    for (const d of this.decor.values()) d.visible = false;
    const key = cfg.biome || 'prairie';
    this.decorFor(key).visible = true;
    const S = BATTLE_SCENES[key] || BATTLE_SCENES.prairie;
    this.padMat.color.set(S.pad);
    const accent = cfg.accent || '#ffb547';
    this.glowMat.color.set(accent);
    this.glowMat.emissive.set(accent);
    if (this.enemyTrainer) { this.root.remove(this.enemyTrainer.group); this.enemyTrainer = null; }
    if (this.playerTrainer) { this.root.remove(this.playerTrainer.group); this.playerTrainer = null; }
    const pk = this.game.data.look === 'fille' ? 'playerGirl' : 'player';
    this.playerTrainer = this.makeTrainer(pk, PLAYER_LOOKS[this.game.data.look] || PLAYER_LOOKS.garcon, 'playerTrainer', 'enemy');
    if (cfg.trainer) this.enemyTrainer = this.makeTrainer('npc', cfg.trainer.look || {}, 'enemyTrainer', 'player');
    this.cut('wide');
  }

  leave() {
    this.active = false;
    this.root.visible = false;
    for (const s of ['player', 'enemy']) { this.views[s]?.dispose(); this.views[s] = null; }
    this.fx.clear();
    this.engine.setDOF(false);
  }

  setView(side, creature) {
    this.views[side]?.dispose();
    const view = this.scaled(new CreatureView(this.assets, creature.def, { shiny: creature.shiny }));
    const p = this.local[side], o = this.local[this.other(side)];
    view.group.position.copy(p);
    view.group.rotation.y = Math.atan2(o.x - p.x, o.z - p.z);
    this.root.add(view.group);
    this.views[side] = view;
    return view;
  }

  center(side) {
    const v = this.views[side];
    const p = this.spot(side);
    p.y += (v ? v.height : 1) * 0.55;
    return p;
  }

  // ── Caméra ─────────────────────────────────────────────────────────
  shotPose(name, side = 'player') {
    const o = this.origin;
    const A = this.spot(side), B = this.spot(this.other(side));
    const hA = this.views[side]?.height ?? 1, hB = this.views[this.other(side)]?.height ?? 1;
    const toB = B.clone().sub(A).setY(0).normalize();
    const sideV = V(toB.z, 0, -toB.x);
    const sgn = side === 'player' ? 1 : -1;
    switch (name) {
      case 'neutral': return { pos: o.clone().add(V(-6.8, 3.3, 8.6)), look: o.clone().add(V(1.1, 0.35, -0.9)) };
      case 'enemyFocus': return { pos: o.clone().add(V(-2.6, 1.9, 3.6)), look: this.center('enemy') };
      case 'overShoulder': return { pos: A.clone().addScaledVector(toB, -(2.4 + hA)).addScaledVector(sideV, 1.4 * sgn).addScaledVector(UP, 1.0 + hA * 0.9), look: B.clone().addScaledVector(UP, hB * 0.55) };
      case 'heroLow': return { pos: A.clone().addScaledVector(toB, 1.8 + hA).addScaledVector(sideV, (1.5 + hA * 0.5) * sgn).addScaledVector(UP, 0.35), look: A.clone().addScaledVector(UP, hA * 0.65) };
      case 'targetClose': return { pos: B.clone().addScaledVector(toB, -(2.3 + hB * 1.1)).addScaledVector(sideV, -1.6 * sgn).addScaledVector(UP, 0.7 + hB * 0.5), look: B.clone().addScaledVector(UP, hB * 0.5) };
      case 'side': { const mid = A.clone().lerp(B, 0.5); return { pos: mid.clone().addScaledVector(sideV, -8.2 * sgn).addScaledVector(UP, 2.0), look: mid.addScaledVector(UP, 0.8) }; }
      case 'wide': return { pos: o.clone().add(V(0, 7.5, 12)), look: o.clone().add(V(0, 0.6, 0)) };
      case 'top': return { pos: o.clone().add(V(0.5, 14, 6)), look: o.clone() };
      case 'center': { const h = this.views.player?.height ?? 1; return { pos: o.clone().add(V(0.6, 0.5 + h * 0.65, 2.6 + h * 1.5)), look: o.clone().add(V(0, h * 0.5, 0)) }; }
      default: return { pos: o.clone().add(V(-9, 3.5, 10)), look: o.clone() };
    }
  }

  setShot(name, side, duration = 0.8, ease = Ease.inOutCubic) {
    const pose = typeof name === 'string' ? this.shotPose(name, side) : name;
    return this.moveCamera(pose.pos, pose.look, duration, ease);
  }

  cut(name, side) {
    const pose = this.shotPose(name, side);
    this.cam.pos.copy(pose.pos);
    this.cam.look.copy(pose.look);
    this.cam.tween = null;
  }

  moveCamera(pos, look, duration = 0.8, ease = Ease.inOutCubic) {
    if (!this.game.settings.battleAnims) duration = Math.min(duration, 0.25);
    if (duration <= 0) { this.cam.pos.copy(pos); this.cam.look.copy(look); this.cam.tween = null; return Promise.resolve(); }
    const fromP = this.cam.pos.clone(), fromL = this.cam.look.clone();
    const tw = {};
    this.cam.tween = tw;
    return tweens.tween(duration, (t) => { if (this.cam.tween !== tw) return; this.cam.pos.lerpVectors(fromP, pos, t); this.cam.look.lerpVectors(fromL, look, t); }, ease);
  }

  orbit(center, radius, height, a0, a1, duration) {
    const tw = {};
    this.cam.tween = tw;
    return tweens.tween(duration, (t) => {
      if (this.cam.tween !== tw) return;
      const a = lerp(a0, a1, t);
      this.cam.pos.set(center.x + Math.sin(a) * radius, center.y + height, center.z + Math.cos(a) * radius);
      this.cam.look.copy(center);
    }, Ease.inOutSine);
  }

  update(dt) {
    if (!this.active) return;
    for (const s of ['player', 'enemy']) this.views[s]?.update(dt);
    this.playerTrainer?.animator.update(dt);
    this.enemyTrainer?.animator.update(dt);
    for (const c of this.crystals) c.rotation.y += dt * 0.7;
    this.fx.update(dt);
    this.cam.sway += dt;
    const cam = this.engine.camera;
    const sw = this.cam.sway;
    cam.position.copy(this.cam.pos);
    cam.position.x += Math.sin(sw * 0.7) * 0.05;
    cam.position.y += Math.sin(sw * 0.9 + 1) * 0.04;
    cam.position.add(this.engine.getShakeOffset(this.shakeVec));
    cam.lookAt(this.cam.look);
    this.engine.setDOF(true, cam.position.distanceTo(this.cam.look));
    if (this.weatherFx) this.weatherFx(dt);
  }

  // ── Séquences ──────────────────────────────────────────────────────
  async introWild(creature) {
    const v = this.setView('enemy', creature);
    const c = this.center('enemy');
    const face = v.group.rotation.y;
    const r = 3.2 + v.height * 1.4;
    this.fx.sparkles(c, TYPES[creature.types[0]].color, 30, { speed: 2 });
    if (creature.shiny) { await sleep(0.3); this.fx.sparkles(c, '#ffffff', 50, { speed: 4, size: 0.35 }); this.audio.play('shiny'); }
    const orbit = this.orbit(c, r, 0.3 + v.height * 0.35, face - 0.9, face + 0.35, 2.3);
    await sleep(0.5);
    v.play('attack');
    this.audio.play(creature.types[0]);
    await orbit;
  }

  async introTrainer() {
    if (!this.enemyTrainer) return;
    const t = this.enemyTrainer.group.position.clone().add(this.origin);
    const look = t.clone().add(V(0, 1.4, 0));
    this.moveCamera(t.clone().add(V(-2.2, 1.7, 3.6)), look, 0);
    this.enemyTrainer.animator.play('happy');
    await this.moveCamera(t.clone().add(V(-1.4, 1.6, 2.6)), look, 1.6, Ease.inOutSine);
  }

  async throwPrisme(from, to, color = '#ffb547', duration = 0.65) {
    const ball = buildPrisme(color);
    ball.position.copy(from);
    this.scene.add(ball);
    this.audio.play('throw');
    const mid = from.clone().lerp(to, 0.5).add(V(0, 2.6, 0));
    await tweens.tween(duration, (t) => {
      const a = 1 - t;
      ball.position.set(a * a * from.x + 2 * a * t * mid.x + t * t * to.x, a * a * from.y + 2 * a * t * mid.y + t * t * to.y, a * a * from.z + 2 * a * t * mid.z + t * t * to.z);
      ball.rotation.x = t * 14;
      ball.rotation.z = t * 6;
      this.game.fxAdd.emit({ pos: ball.position.toArray(), vel: [0, 0, 0], color: [3, 2.4, 1.4], size: 0.18, size1: 0, life: 0.3, shape: 0 });
    }, Ease.linear);
    return ball;
  }

  async sendOut(side, creature, { throwBall = true } = {}) {
    const v = this.setView(side, creature);
    v.offset.scale.setScalar(0.01);
    const trainer = side === 'player' ? this.playerTrainer : this.enemyTrainer;
    const target = this.center(side);
    if (throwBall && trainer) {
      trainer.animator.play('attack');
      await sleep(0.25);
      const from = trainer.group.position.clone().add(this.origin).add(V(0, 1.5, 0));
      const ball = await this.throwPrisme(from, target, ITEMS[creature.ball]?.color || '#ffb547');
      this.scene.remove(ball);
    }
    this.audio.play('open');
    this.fx.flash(target, '#ffffff', 40, 0.4);
    this.fx.ring(target, '#ffe6a8', 2.2, 0.45, { faceTo: this.engine.camera.position });
    this.fx.sparkles(target, TYPES[creature.types[0]].color, 34, { speed: 3 });
    if (creature.shiny) { this.fx.sparkles(target, '#ffffff', 50, { speed: 4, size: 0.35 }); this.audio.play('shiny'); }
    v.setGlow(3, '#ffffff');
    await tweens.tween(0.45, (t) => v.offset.scale.setScalar(Math.max(0.01, t)), Ease.outBack);
    tweens.tween(0.5, (t) => v.setGlow(3 * (1 - t)));
    v.play('happy');
    this.audio.play(creature.types[0]);
    await sleep(0.45);
  }

  async recall(side) {
    const v = this.views[side];
    if (!v) return;
    const trainer = side === 'player' ? this.playerTrainer : this.enemyTrainer;
    const c = this.center(side);
    const to = trainer ? trainer.group.position.clone().add(this.origin).add(V(0, 1.4, 0)) : c;
    v.setGlow(3, '#ffffff');
    this.fx.motes(c, to, '#ffe6a8', 40, 0.5);
    this.audio.play('back');
    await tweens.tween(0.4, (t) => v.offset.scale.setScalar(Math.max(0.01, 1 - t)), Ease.inCubic);
    v.dispose();
    this.views[side] = null;
  }

  /** Joue une attaque jusqu'à l'impact. */
  async performMove(side, move, hit, targetSide) {
    const atk = this.views[side];
    if (!atk) return;
    const tside = targetSide || this.other(side);
    const def = this.views[tside];
    const type = move.type;
    const A = this.spot(side), B = this.spot(this.other(side));
    const toB = B.clone().sub(A).setY(0).normalize();
    const style = moveStyle(move);
    const fast = !this.game.settings.battleAnims;
    const opening = style === 'contact' ? pick(['heroLow', 'side']) : pick(['overShoulder', 'heroLow', 'side']);
    await this.setShot(opening, side, fast ? 0.2 : 0.5);

    if (style === 'aura') {
      const selfTarget = tside === side;
      const r = atk.play('cast');
      await r.impact;
      const debuff = !!move.foe;
      this.audio.play(debuff ? 'debuff' : 'buff');
      if (selfTarget) {
        this.fx.aura(type, A, atk.height, false);
        atk.flash(TYPES[type].color, 1.6, 0.6);
        if (move.heal || move.rest) this.fx.sparkles(this.center(side), '#9cff6b', 40, { speed: 2.5, up: 2 });
        if (move.weather) this.fx.ring(A, TYPES[type].color, 6, 0.8, { intensity: 2 });
      } else {
        this.fx.projectile(type, this.center(side), this.center(tside), 0.45, 0.6);
        await this.setShot('targetClose', side, 0.45);
        if (hit && def) { this.fx.aura(type, this.spot(tside), def.height, true); def.flash('#6a6aff', 1.2, 0.5); }
      }
      await sleep(fast ? 0.2 : 0.5);
      return;
    }
    this.audio.play(type);
    if (style === 'contact') {
      const start = atk.group.position.clone();
      const reach = (def ? def.height * 0.35 : 0.4) + 0.65 + atk.height * 0.3;
      const local = this.local[this.other(side)].clone().addScaledVector(toB, -reach);
      atk.play('attack', { timeScale: 1.25 });
      await tweens.tween(0.3, (t) => atk.group.position.lerpVectors(start, local, t), Ease.inCubic);
      this.setShot('targetClose', side, 0.25);
      const contact = this.center(this.other(side)).addScaledVector(toB, -0.3);
      if (hit) this.fx.burst(type, contact, 0.7, this.origin.y);
      else this.dodge(this.other(side));
      tweens.tween(0.38, (t) => atk.group.position.lerpVectors(local, start, t), Ease.inOutCubic);
      return;
    }
    if (style === 'quake') {
      const r = atk.play('attack');
      await r.impact;
      await this.setShot('wide', side, 0.3);
      this.fx.quake(this.origin, this.origin.y);
      this.audio.play('quake');
      await sleep(0.35);
      if (hit) this.fx.burst('roche', this.center(this.other(side)), 1.1, this.origin.y);
      else this.dodge(this.other(side));
      return;
    }
    if (style === 'beam') {
      const r = atk.play('cast');
      await r.impact;
      await this.setShot('side', side, 0.4);
      const from = this.center(side).addScaledVector(toB, 0.5);
      const to = this.center(this.other(side));
      this.fx.beam(from, hit ? to : to.clone().add(V(toB.z * 2, 0.5, -toB.x * 2)), TYPES[type].color, 0.6, 0.22);
      this.fx.flash(from, TYPES[type].color, 30, 0.5);
      await sleep(0.25);
      if (hit) this.fx.burst(type, to, 1, this.origin.y); else this.dodge(this.other(side));
      return;
    }
    if (style === 'projectile') {
      const r = atk.play('attack');
      await r.impact;
      const shot = this.setShot(pick(['side', 'targetClose']), side, 0.5);
      const from = this.center(side).addScaledVector(toB, 0.4);
      let to = this.center(this.other(side));
      if (!hit) { to = to.clone().addScaledVector(V(toB.z, 0, -toB.x), 1.6); this.dodge(this.other(side)); }
      await Promise.all([this.fx.projectile(type, from, to, 0.5, 1.0), shot]);
      if (hit) this.fx.burst(type, to, 0.9, this.origin.y);
      return;
    }
    // zone
    const r = atk.play('cast');
    this.fx.sparkles(this.center(side), TYPES[type].color, 30, { speed: 2, up: 2 });
    await r.impact;
    await this.setShot(pick(['targetClose', 'wide']), side, 0.45);
    const tgt = this.center(this.other(side));
    await this.fx.areaCast(type, tgt, this.origin.y);
    if (hit) this.fx.burst(type, tgt, 1.35, this.origin.y);
    else this.dodge(this.other(side));
  }

  dodge(side) {
    const v = this.views[side];
    if (!v) return;
    const start = v.group.position.clone();
    const dir = V(1, 0, 1).normalize().multiplyScalar(side === 'player' ? -1.2 : 1.2);
    this.audio.play('miss');
    tweens.tween(0.5, (t) => { v.group.position.copy(start).addScaledVector(dir, Math.sin(t * Math.PI)); }, Ease.linear);
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
    v.flash(mult > 1 ? '#ffffff' : TYPES[type]?.color || '#ffffff', mult > 1 ? 3 : 2, 0.45);
    const big = mult > 1 || crit || ratio > 0.3;
    this.engine.addShake(0.05 + ratio * 0.4 + (mult > 1 ? 0.12 : 0) + (crit ? 0.1 : 0));
    if (mult > 1) this.engine.bloomBoost = 0.9;
    this.audio.play(mult > 1 ? 'super' : mult < 1 ? 'weak' : 'hit');
    if (big) {
      const p = this.cam.pos.clone(), l = this.cam.look.clone();
      const punch = p.clone().lerp(l, 0.12);
      this.moveCamera(punch, l, 0.12, Ease.outCubic).then(() => this.moveCamera(p, l, 0.4));
    }
    await sleep(0.5);
  }

  healFx(side) {
    const v = this.views[side];
    if (!v) return;
    this.fx.sparkles(this.center(side), '#9cff6b', 30, { speed: 2, up: 2 });
    v.flash('#9cff6b', 1.2, 0.5);
  }

  statFx(side, changes) {
    const v = this.views[side];
    if (!v) return;
    const up = Object.values(changes).some((n) => n > 0);
    this.fx.aura(up ? 'lumiere' : 'astral', this.spot(side), v.height, !up);
    this.audio.play(up ? 'buff' : 'debuff');
  }

  statusFx(side, status) {
    const v = this.views[side];
    if (!v) return;
    this.fx.statusFx(status, this.spot(side), v.height);
    this.audio.play('status');
  }

  async faint(side) {
    const v = this.views[side];
    if (!v) return;
    this.audio.play('faint');
    await this.setShot(side === 'enemy' ? 'enemyFocus' : 'heroLow', 'player', 0.5);
    const r = v.play('faint');
    await r.done;
    const c = this.center(side);
    this.fx.motes(c, c.clone().add(V(0, 2, 0)), '#ffffff', 25, 0.6);
    await tweens.tween(0.45, (t) => { v.offset.scale.setScalar(Math.max(0.01, 1 - t)); v.setGlow(t * 2); }, Ease.inCubic);
    v.group.visible = false;
  }

  /** Effets de météo pendant le combat. */
  setWeather(type) {
    this.game.weather.set(type === 'rain' ? ['rain'] : type === 'snow' ? ['snow'] : type === 'sand' ? ['sand'] : []);
    this.sunBoost = type === 'sun';
  }

  async ballBlocked() {
    const c = this.center('enemy');
    const from = this.playerTrainer.group.position.clone().add(this.origin).add(V(0, 1.6, 0));
    const ball = await this.throwPrisme(from, c.clone().add(V(-1, 0.5, 1)), '#ffb547', 0.5);
    this.audio.play('deny');
    const p0 = ball.position.clone();
    await tweens.tween(0.4, (t) => { ball.position.copy(p0).add(V(-t * 3, Math.sin(t * Math.PI) * 1.5 - t * 1.5, t * 2)); });
    this.scene.remove(ball);
  }

  /** Capture : lancer, absorption, tremblements, succès ou libération. */
  async capture(itemId, shakes, success) {
    const v = this.views.enemy;
    const item = ITEMS[itemId];
    const c = this.center('enemy');
    await this.setShot('side', 'player', 0.5);
    this.playerTrainer.animator.play('attack');
    await sleep(0.2);
    const from = this.playerTrainer.group.position.clone().add(this.origin).add(V(0, 1.6, 0));
    const above = c.clone().add(V(0, v.height * 0.5 + 0.5, 0));
    const ball = await this.throwPrisme(from, above, item.color, 0.8);
    this.audio.play('open');
    this.fx.flash(above, '#ffffff', 50, 0.5);
    this.fx.ring(above, item.color, 2, 0.4, { faceTo: this.engine.camera.position });
    this.moveCamera(c.clone().add(V(-2.6, 0.9, 3.0)), c.clone().add(V(0, -0.2, 0)), 0.8);
    v.setGlow(3, '#ffffff');
    this.fx.motes(c, above, '#ffffff', 50, 0.5);
    await tweens.tween(0.5, (t) => { v.offset.scale.setScalar(Math.max(0.01, 1 - t)); v.offset.position.y = t * v.height * 0.5; }, Ease.inCubic);
    v.group.visible = false;
    const ground = this.spot('enemy').add(V(0, 0.2, 0));
    const top = above.clone();
    await tweens.tween(0.55, (t) => { ball.position.lerpVectors(top, ground, t); ball.rotation.z = Math.sin(t * 8) * 0.2; }, Ease.outBounce);
    ball.rotation.set(0, 0, 0);
    await this.moveCamera(ground.clone().add(V(-1.2, 0.7, 1.6)), ground.clone().add(V(0, 0.1, 0)), 0.6);
    for (let i = 0; i < Math.min(3, shakes); i++) {
      await sleep(0.45);
      this.audio.play('shake');
      await tweens.tween(0.55, (t) => { ball.rotation.z = Math.sin(t * Math.PI * 2) * 0.45; }, Ease.inOutSine);
      ball.rotation.z = 0;
    }
    await sleep(0.4);
    if (success) {
      this.audio.play('catch');
      this.fx.sparkles(ball.position.clone().add(V(0, 0.2, 0)), '#ffd23f', 40, { speed: 2.2, up: 1.5, size: 0.3 });
      this.fx.ring(ball.position, '#ffd23f', 1.6, 0.6);
      ball.userData.core.material.emissiveIntensity = 0.3;
      await sleep(1.0);
      tweens.tween(0.4, (t) => ball.scale.setScalar(Math.max(0.01, 1 - t))).then(() => this.scene.remove(ball));
    } else {
      this.audio.play('break');
      this.fx.flash(ball.position, '#ffffff', 50, 0.4);
      this.fx.sparkles(ball.position, item.color, 40, { speed: 4, shape: 4 });
      this.scene.remove(ball);
      v.group.visible = true;
      v.offset.position.y = 0;
      await tweens.tween(0.4, (t) => v.offset.scale.setScalar(Math.max(0.01, t)), Ease.outBack);
      tweens.tween(0.5, (t) => v.setGlow(3 * (1 - t)));
      v.play('attack');
      await this.setShot('enemyFocus', 'player', 0.6);
    }
  }

  /** Scène d'évolution (peut être annulée par le joueur : onCancel renvoie true). */
  async evolution(fromSpecies, toSpecies, { shiny = false, isCancelled = () => false } = {}) {
    for (const s of ['player', 'enemy']) { this.views[s]?.dispose(); this.views[s] = null; }
    if (this.enemyTrainer) this.enemyTrainer.group.visible = false;
    if (this.playerTrainer) this.playerTrainer.group.visible = false;
    const oldV = this.scaled(new CreatureView(this.assets, CREATURE_MAP[fromSpecies], { shiny }));
    const newV = this.scaled(new CreatureView(this.assets, CREATURE_MAP[toSpecies], { shiny }));
    for (const v of [oldV, newV]) { v.group.position.set(0, 0, 0); this.root.add(v.group); }
    newV.group.visible = false;
    this.views.player = oldV;
    this.cut('center', 'player');
    const h = Math.max(oldV.height, newV.height);
    const center = this.origin.clone().add(V(0, h * 0.5, 0));
    await this.moveCamera(this.origin.clone().add(V(0.4, 0.4 + h * 0.6, 3.4 + h * 1.6)), center, 1.4, Ease.inOutSine);
    this.audio.play('evolve');
    const ringMotes = () => {
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fx.motes(center.clone().add(V(Math.cos(a) * 3, rand(-1, 1.5), Math.sin(a) * 3)), center, '#ffffff', 4, 0.7);
      }
    };
    await tweens.tween(1.6, (t) => { oldV.setGlow(t * 3, '#ffffff'); if (Math.random() < 0.5) ringMotes(); });
    newV.setGlow(3, '#ffffff');
    let interval = 0.42, showNew = false, elapsed = 0, cancelled = false;
    while (elapsed < 3.2) {
      if (isCancelled()) { cancelled = true; break; }
      showNew = !showNew;
      oldV.group.visible = !showNew;
      newV.group.visible = showNew;
      ringMotes();
      await sleep(interval);
      elapsed += interval;
      interval = Math.max(0.05, interval * 0.8);
    }
    if (cancelled) {
      oldV.group.visible = true;
      newV.group.visible = false;
      await tweens.tween(0.8, (t) => oldV.setGlow(3 * (1 - t)));
      newV.dispose();
      this.views.player = oldV;
      oldV.play('idle');
      await sleep(0.6);
      return false;
    }
    oldV.group.visible = false;
    newV.group.visible = true;
    this.audio.play('flash');
    this.engine.bloomBoost = 2.5;
    this.fx.flash(center, '#ffffff', 80, 0.8);
    this.fx.ring(center, '#ffffff', 5, 0.8, { faceTo: this.engine.camera.position });
    this.fx.sparkles(center, TYPES[newV.species.types[0]].color, 90, { speed: 5, size: 0.35, life: 1.4 });
    oldV.dispose();
    this.views.player = newV;
    await tweens.tween(1.3, (t) => newV.setGlow(3 * (1 - t)));
    newV.play('happy');
    this.audio.play(newV.species.types[0]);
    await sleep(0.9);
    return true;
  }

  /** Éclosion d'un Œuf. */
  async hatch(species, shiny) {
    for (const s of ['player', 'enemy']) { this.views[s]?.dispose(); this.views[s] = null; }
    if (this.playerTrainer) this.playerTrainer.group.visible = false;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), new THREE.MeshStandardMaterial({ color: '#fff6e6', roughness: 0.5, emissive: '#ffd27a', emissiveIntensity: 0.1 }));
    egg.scale.set(1, 1.28, 1);
    egg.position.copy(this.origin).add(V(0, 0.64, 0));
    egg.castShadow = true;
    this.scene.add(egg);
    for (let i = 0; i < 6; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), stdMat(TYPES[CREATURE_MAP[species].types[0]].color));
      const a = i * 1.1, y = Math.sin(i * 2.1) * 0.3;
      spot.position.set(Math.cos(a) * 0.42, y, Math.sin(a) * 0.42);
      spot.scale.set(1, 0.4, 1);
      spot.lookAt(0, y, 0);
      egg.add(spot);
    }
    this.cam.pos.copy(this.origin).add(V(0, 1.4, 3.4));
    this.cam.look.copy(egg.position);
    for (let i = 0; i < 4; i++) {
      await sleep(0.6 - i * 0.1);
      this.audio.play('shake');
      await tweens.tween(0.4, (t) => { egg.rotation.z = Math.sin(t * Math.PI * 3) * (0.15 + i * 0.08); });
    }
    egg.material.emissiveIntensity = 2;
    this.audio.play('flash');
    this.engine.bloomBoost = 2;
    this.fx.flash(egg.position, '#ffffff', 70, 0.6);
    this.fx.sparkles(egg.position, '#fff6e6', 60, { speed: 4, shape: 4 });
    this.scene.remove(egg);
    const v = this.scaled(new CreatureView(this.assets, CREATURE_MAP[species], { shiny }));
    v.group.position.set(0, 0, 0);
    v.group.rotation.y = 0;
    this.root.add(v.group);
    this.views.player = v;
    await this.moveCamera(this.origin.clone().add(V(0, 0.5 + v.height * 0.6, 2.6 + v.height * 1.4)), this.origin.clone().add(V(0, v.height * 0.5, 0)), 0.8);
    v.play('happy');
    this.audio.play(CREATURE_MAP[species].types[0]);
    if (shiny) this.fx.sparkles(this.center('player'), '#ffffff', 50, { speed: 4 });
    await sleep(1.2);
  }
}
