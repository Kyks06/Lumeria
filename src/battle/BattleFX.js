import * as THREE from 'three';
import { TYPES } from '../config/types.js';
import { hdr, SHAPE } from '../render/Particles.js';
import { rand, tweens, Ease, lerp } from '../core/utils.js';

const R = (a, b) => rand(a, b);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * EFFETS DE COMBAT POUR LES 16 TYPES
 * Chaque type a un impact (burst), un projectile et une préparation de zone (areaCast) propres :
 * flammes, gerbes d'eau, feuilles, éclairs, roches, éclats de glace, tourbillons, bulles toxiques,
 * ondes de choc, anneaux psychiques, fumée d'ombre, étincelles d'acier, rayons de lumière, nuées, étoiles.
 */
const LOOK = {
  normal:  { core: '#ffffff', glow: '#fff4dc', trail: SHAPE.glow },
  feu:     { core: '#ffd36a', glow: '#ff5a1a', trail: SHAPE.glow },
  eau:     { core: '#bfeaff', glow: '#3ba7ff', trail: SHAPE.drop },
  plante:  { core: '#9cff6b', glow: '#3fa045', trail: SHAPE.leaf },
  foudre:  { core: '#fff8c0', glow: '#ffd23f', trail: SHAPE.spark },
  glace:   { core: '#e8fbff', glow: '#8fe3f2', trail: SHAPE.spark },
  roche:   { core: '#d8c0a0', glow: '#a08060', trail: SHAPE.chunk },
  vent:    { core: '#f0f6ff', glow: '#9ab8ff', trail: SHAPE.smoke },
  toxine:  { core: '#e8a8ff', glow: '#b25ad9', trail: SHAPE.drop },
  combat:  { core: '#ffe0b0', glow: '#ff7a3a', trail: SHAPE.spark },
  psy:     { core: '#ffd0e8', glow: '#ff6fa8', trail: SHAPE.glow },
  ombre:   { core: '#c8a8ff', glow: '#6c3a9e', trail: SHAPE.smoke },
  metal:   { core: '#ffffff', glow: '#a9b4c2', trail: SHAPE.spark },
  lumiere: { core: '#fffbe0', glow: '#ffe48a', trail: SHAPE.glow },
  insecte: { core: '#e8ff9a', glow: '#a8c43a', trail: SHAPE.spark },
  astral:  { core: '#d8e0ff', glow: '#5a6cff', trail: SHAPE.spark },
};

export class BattleFX {
  constructor(scene, fxAdd, fxNorm, engine) {
    this.scene = scene;
    this.add = fxAdd;
    this.norm = fxNorm;
    this.engine = engine;
    this.active = [];
    this.light = new THREE.PointLight('#ffffff', 0, 20, 1.5);
    scene.add(this.light);
    this.lightTween = 0;
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 64);
    this.orbGeo = new THREE.SphereGeometry(1, 20, 14);
    this.rockGeo = new THREE.DodecahedronGeometry(1, 0);
    this.shardGeo = new THREE.OctahedronGeometry(1, 0);
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.t += dt;
      if (a.update(dt, a.t) === false || a.t > a.life) {
        a.dispose?.();
        this.active.splice(i, 1);
      }
    }
  }

  clear() {
    for (const a of this.active) a.dispose?.();
    this.active = [];
    this.light.intensity = 0;
  }

  flash(pos, color = '#ffffff', intensity = 30, duration = 0.35) {
    this.light.position.copy(pos);
    this.light.color.set(color);
    const id = ++this.lightTween;
    this.light.intensity = intensity;
    tweens.tween(duration, (t) => { if (id === this.lightTween) this.light.intensity = intensity * (1 - t); }, Ease.outQuad);
  }

  ring(pos, color, radius = 3, duration = 0.5, { vertical = false, faceTo = null, intensity = 3 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(this.ringGeo, mat);
    m.position.copy(pos);
    if (faceTo) m.lookAt(faceTo);
    else if (!vertical) m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    this.active.push({
      t: 0, life: duration,
      update: (dt, t) => { const k = t / duration; const s = lerp(0.2, radius, Ease.outCubic(k)); m.scale.set(s, s, s); mat.opacity = 1 - k; },
      dispose: () => { this.scene.remove(m); mat.dispose(); },
    });
  }

  bolt(from, to, color = '#fff2a0', life = 0.32, width = 0.05) {
    const pts = [];
    const n = 9;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const upv = new THREE.Vector3().crossVectors(dir, side).normalize();
    for (let i = 0; i <= n; i++) {
      const p = from.clone().addScaledVector(dir, i / n);
      if (i > 0 && i < n) { const amp = len * 0.08; p.addScaledVector(side, R(-amp, amp)).addScaledVector(upv, R(-amp, amp)); }
      pts.push(p);
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0), 40, width, 5, false);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    this.scene.add(m);
    this.active.push({ t: 0, life, update: (dt, t) => { mat.opacity = (Math.sin(t * 90) > -0.3 ? 1 : 0.2) * (1 - t / life); }, dispose: () => { this.scene.remove(m); geo.dispose(); mat.dispose(); } });
  }

  /** Rayon lumineux entre deux points (Lumière, Psy, Astral, Glace). */
  beam(from, to, color, life = 0.5, width = 0.18) {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(this.beamGeo, mat);
    const mid = from.clone().lerp(to, 0.5);
    m.position.copy(mid);
    m.lookAt(to);
    m.rotateX(Math.PI / 2);
    const len = from.distanceTo(to);
    this.scene.add(m);
    this.active.push({ t: 0, life, update: (dt, t) => { const k = t / life; const w = width * (1 - k * 0.7) * (1 + Math.sin(t * 60) * 0.15); m.scale.set(w, len * Math.min(1, k * 4), w); mat.opacity = 1 - k * k; }, dispose: () => { this.scene.remove(m); mat.dispose(); } });
  }

  sparkles(pos, color, n = 30, { speed = 3, size = 0.25, life = 0.9, up = 1, spread = 0.4, shape = SHAPE.spark } = {}) {
    const c = hdr(color, 3.5);
    for (let i = 0; i < n; i++) {
      const a = R(0, Math.PI * 2), e = R(-0.3, 1), v = R(0.4, 1) * speed;
      this.add.emit({ pos: [pos.x + R(-spread, spread), pos.y + R(-spread, spread), pos.z + R(-spread, spread)], vel: [Math.cos(a) * v * Math.cos(e), (Math.sin(e) + up * 0.5) * v, Math.sin(a) * v * Math.cos(e)], color: c, color1: [1.2, 1.2, 1.2], size, size1: 0, life: life * R(0.6, 1.2), drag: 2.5, shape });
    }
  }

  motes(from, to, color, n = 40, duration = 0.6) {
    const c = hdr(color, 4);
    for (let i = 0; i < n; i++) {
      const p = from.clone().add(V(R(-0.5, 0.5), R(-0.5, 0.5), R(-0.5, 0.5)));
      const life = duration * R(0.6, 1);
      const v = new THREE.Vector3().subVectors(to, p).divideScalar(life);
      this.add.emit({ pos: p.toArray(), vel: v.toArray(), color: c, color1: [1.5, 1.5, 1.5], size: 0.22, size1: 0.05, life, shape: SHAPE.glow });
    }
  }

  smoke(pos, color = [0.3, 0.28, 0.28], n = 12, size = 1, alpha = 0.55) {
    for (let i = 0; i < n; i++) this.norm.emit({ pos: [pos.x + R(-0.5, 0.5), pos.y + R(-0.2, 0.4), pos.z + R(-0.5, 0.5)], vel: [R(-0.6, 0.6), R(0.4, 1.4), R(-0.6, 0.6)], color, color1: color.map((c) => Math.min(1, c * 1.6)), size: size * 0.8, size1: size * 2.6, life: R(1, 1.6), shape: SHAPE.smoke, alpha });
  }

  /** Impact propre à chaque type. */
  burst(type, pos, scale = 1, floorY = pos.y - 1) {
    const s = scale;
    const L = LOOK[type] || LOOK.normal;
    const floor = V(pos.x, floorY + 0.05, pos.z);
    switch (type) {
      case 'feu':
        for (let i = 0; i < 70 * s; i++) { const a = R(0, 6.28), v = R(1.5, 5) * s; this.add.emit({ pos: [pos.x + R(-0.3, 0.3), pos.y + R(-0.3, 0.3), pos.z + R(-0.3, 0.3)], vel: [Math.cos(a) * v, R(1, 4) * s, Math.sin(a) * v], color: hdr('#ffd36a', 5), color1: hdr('#ff3010', 2), size: R(0.4, 0.75) * s, size1: 0.1, life: R(0.45, 0.9), drag: 3, gravity: -2.5, shape: SHAPE.glow }); }
        for (let i = 0; i < 25 * s; i++) { const a = R(0, 6.28), v = R(3, 7); this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * v, R(2, 6), Math.sin(a) * v], color: hdr('#ffb040', 4), size: 0.12, size1: 0, life: R(0.6, 1.1), gravity: 6, drag: 1, shape: SHAPE.spark, floor: floorY }); }
        this.smoke(pos, [0.12, 0.1, 0.1], 12 * s, 1);
        this.flash(pos, '#ff8a3d', 40 * s, 0.5);
        break;
      case 'eau':
        for (let i = 0; i < 70 * s; i++) { const a = R(0, 6.28), v = R(2, 6) * s; this.norm.emit({ pos: [pos.x + R(-0.3, 0.3), pos.y + R(-0.2, 0.3), pos.z + R(-0.3, 0.3)], vel: [Math.cos(a) * v, R(2.5, 7) * s, Math.sin(a) * v], color: hdr('#bfeaff', 1.2), color1: hdr('#2f86e0', 1), size: R(0.14, 0.3) * s, size1: 0.08, life: R(0.7, 1.2), gravity: 13, drag: 0.6, shape: SHAPE.drop, floor: floorY }); }
        for (let i = 0; i < 30 * s; i++) { const a = R(0, 6.28), v = R(1, 3); this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * v, R(0, 2), Math.sin(a) * v], color: hdr('#8fdcff', 2.5), size: R(0.3, 0.6), size1: 0, life: R(0.4, 0.8), drag: 3, shape: SHAPE.glow }); }
        this.ring(floor, '#7fd0ff', 3.2 * s, 0.7);
        this.flash(pos, '#5fc0ff', 25 * s, 0.4);
        break;
      case 'plante':
        for (let i = 0; i < 55 * s; i++) { const a = R(0, 6.28), r = R(0.2, 1.2), tang = R(3, 6); this.norm.emit({ pos: [pos.x + Math.cos(a) * r, pos.y + R(-0.6, 0.6), pos.z + Math.sin(a) * r], vel: [-Math.sin(a) * tang + Math.cos(a) * 1.5, R(0.5, 3), Math.cos(a) * tang + Math.sin(a) * 1.5], color: hdr(['#5fcf5a', '#8be05a', '#3fa045'][i % 3], 1.1), size: R(0.28, 0.45) * s, size1: 0.2, life: R(1.0, 1.7), drag: 1.6, gravity: 1.2, shape: SHAPE.leaf, spin: R(-8, 8) }); }
        for (let i = 0; i < 16 * s; i++) { const a = R(0, 6.28); this.norm.emit({ pos: pos.toArray(), vel: [Math.cos(a) * R(2, 4), R(1, 3), Math.sin(a) * R(2, 4)], color: hdr('#ff9ad5', 1.1), size: 0.22, size1: 0.15, life: R(1, 1.6), drag: 1.5, gravity: 1, shape: SHAPE.leaf, spin: R(-10, 10) }); }
        this.sparkles(pos, '#9cff6b', 22 * s, { speed: 3 });
        this.flash(pos, '#7dff7a', 18 * s, 0.4);
        break;
      case 'foudre':
        for (let i = 0; i < 3; i++) this.bolt(pos.clone().add(V(R(-1.5, 1.5), R(5, 7), R(-1.5, 1.5))), pos.clone().add(V(R(-0.3, 0.3), R(-0.3, 0.3), R(-0.3, 0.3))), '#fff6b0', R(0.25, 0.4), 0.06);
        for (let i = 0; i < 60 * s; i++) { const a = R(0, 6.28), e = R(-0.5, 1), v = R(4, 10) * s; this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v], color: hdr('#fff8c0', 5), color1: hdr('#ffd23f', 3), size: R(0.15, 0.35), size1: 0, life: R(0.25, 0.55), drag: 5, shape: SHAPE.spark }); }
        this.ring(pos, '#fff2a0', 2.5 * s, 0.35, { faceTo: this.engine.camera.position });
        this.flash(pos, '#fff3b0', 60 * s, 0.3);
        break;
      case 'glace':
        for (let i = 0; i < 45 * s; i++) { const a = R(0, 6.28), v = R(2, 6) * s; this.norm.emit({ pos: pos.toArray(), vel: [Math.cos(a) * v, R(1, 5) * s, Math.sin(a) * v], color: hdr('#e8fbff', 1.3), color1: hdr('#8fe3f2', 1.2), size: R(0.18, 0.4) * s, size1: 0.1, life: R(0.8, 1.3), gravity: 9, drag: 0.8, shape: SHAPE.chunk, spin: R(-6, 6), floor: floorY }); }
        for (let i = 0; i < 40 * s; i++) { const a = R(0, 6.28), v = R(0.5, 2.5); this.add.emit({ pos: [pos.x + R(-0.5, 0.5), pos.y + R(-0.5, 0.5), pos.z + R(-0.5, 0.5)], vel: [Math.cos(a) * v, R(-0.5, 1.5), Math.sin(a) * v], color: hdr('#ffffff', 3), color1: hdr('#8fe3f2', 2), size: R(0.08, 0.2), size1: 0, life: R(0.8, 1.6), drag: 1, shape: SHAPE.spark }); }
        this.spikes(floor, '#bff4ff', 7, 1.6 * s);
        this.ring(floor, '#bff4ff', 3 * s, 0.6);
        this.flash(pos, '#bff4ff', 30 * s, 0.4);
        break;
      case 'vent':
        for (let i = 0; i < 80 * s; i++) { const a = R(0, 6.28), r = R(0.5, 1.8), h = R(-0.8, 1.6); this.norm.emit({ pos: [pos.x + Math.cos(a) * r, pos.y + h, pos.z + Math.sin(a) * r], vel: [-Math.sin(a) * 7 + Math.cos(a), R(1, 3), Math.cos(a) * 7 + Math.sin(a)], color: [0.9, 0.93, 1], color1: [1, 1, 1], size: R(0.15, 0.35), size1: 0.8, life: R(0.5, 0.9), drag: 1.2, shape: SHAPE.smoke, alpha: 0.5 }); }
        for (let i = 0; i < 20; i++) { const a = R(0, 6.28); this.norm.emit({ pos: pos.toArray(), vel: [Math.cos(a) * 5, R(1, 4), Math.sin(a) * 5], color: hdr('#e0e8ff', 1), size: 0.25, size1: 0.1, life: 1, drag: 1.5, shape: SHAPE.leaf, spin: 12 }); }
        this.ring(pos, '#c8d8ff', 3 * s, 0.5, { vertical: true, faceTo: this.engine.camera.position, intensity: 1.5 });
        this.flash(pos, '#d8e4ff', 18 * s, 0.35);
        break;
      case 'toxine':
        for (let i = 0; i < 50 * s; i++) { const a = R(0, 6.28), v = R(1, 4) * s; this.norm.emit({ pos: pos.toArray(), vel: [Math.cos(a) * v, R(2, 5), Math.sin(a) * v], color: hdr('#c87aff', 1.1), color1: hdr('#6a2a9a', 1), size: R(0.2, 0.4) * s, size1: 0.1, life: R(0.7, 1.2), gravity: 8, shape: SHAPE.drop, floor: floorY }); }
        for (let i = 0; i < 20 * s; i++) this.add.emit({ pos: [pos.x + R(-0.8, 0.8), pos.y + R(-0.5, 0.8), pos.z + R(-0.8, 0.8)], vel: [R(-0.3, 0.3), R(0.5, 1.5), R(-0.3, 0.3)], color: hdr('#d898ff', 2), size: R(0.25, 0.5), size1: 0.6, life: R(0.8, 1.4), shape: SHAPE.glow });
        this.smoke(pos, [0.35, 0.18, 0.45], 14 * s, 1.1, 0.5);
        this.flash(pos, '#c06aff', 22 * s, 0.4);
        break;
      case 'combat':
        for (let i = 0; i < 50 * s; i++) { const a = R(0, 6.28), e = R(-0.3, 0.8), v = R(5, 11) * s; this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v], color: hdr('#ffe0b0', 5), color1: hdr('#ff6a2a', 2), size: R(0.15, 0.3), size1: 0, life: R(0.2, 0.45), drag: 6, shape: SHAPE.spark }); }
        this.ring(pos, '#ffd0a0', 2.4 * s, 0.3, { faceTo: this.engine.camera.position, intensity: 4 });
        this.ring(pos, '#ffffff', 1.4 * s, 0.22, { faceTo: this.engine.camera.position, intensity: 5 });
        this.ring(floor, '#ffb070', 3.5 * s, 0.5, { intensity: 1.5 });
        this.smoke(floor, [0.55, 0.47, 0.36], 10 * s, 1, 0.5);
        this.engine.addShake(0.15 * s);
        this.flash(pos, '#ffd0a0', 35 * s, 0.25);
        break;
      case 'psy':
        for (let k = 0; k < 3; k++) setTimeout(() => this.ring(pos, '#ff8ac8', 2.6 * s, 0.6, { faceTo: this.engine.camera.position, intensity: 2.5 }), k * 110);
        for (let i = 0; i < 50 * s; i++) { const a = R(0, 6.28), r = R(0.3, 1.4); this.add.emit({ pos: [pos.x + Math.cos(a) * r, pos.y + R(-0.6, 0.8), pos.z + Math.sin(a) * r], vel: [-Math.sin(a) * 3, R(0.2, 1.2), Math.cos(a) * 3], color: hdr('#ffb0e0', 3), color1: hdr('#c060ff', 2), size: R(0.15, 0.3), size1: 0, life: R(0.6, 1.1), drag: 1, shape: SHAPE.glow }); }
        this.flash(pos, '#ff8ad0', 30 * s, 0.5);
        break;
      case 'ombre':
        this.smoke(pos, [0.08, 0.04, 0.12], 22 * s, 1.3, 0.75);
        for (let i = 0; i < 50 * s; i++) { const a = R(0, 6.28), r = R(1.2, 2.2); const p = V(pos.x + Math.cos(a) * r, pos.y + R(-0.6, 1), pos.z + Math.sin(a) * r); const life = R(0.4, 0.7); this.add.emit({ pos: p.toArray(), vel: [(pos.x - p.x) / life, (pos.y - p.y) / life, (pos.z - p.z) / life], color: hdr('#b080ff', 3), color1: hdr('#3a1050', 1), size: R(0.15, 0.3), size1: 0.05, life, shape: SHAPE.spark }); }
        this.ring(floor, '#6c3a9e', 3 * s, 0.6, { intensity: 2 });
        this.flash(pos, '#8a5aff', 20 * s, 0.4);
        break;
      case 'metal':
        for (let i = 0; i < 60 * s; i++) { const a = R(0, 6.28), e = R(-0.2, 1), v = R(4, 9) * s; this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v], color: hdr('#ffffff', 5), color1: hdr('#ffd08a', 2), size: R(0.08, 0.2), size1: 0, life: R(0.3, 0.7), gravity: 9, drag: 2, shape: SHAPE.spark, floor: floorY }); }
        for (let i = 0; i < 18 * s; i++) { const a = R(0, 6.28), v = R(2, 5); this.norm.emit({ pos: pos.toArray(), vel: [Math.cos(a) * v, R(2, 5), Math.sin(a) * v], color: [0.75, 0.78, 0.85], size: R(0.15, 0.3), size1: 0.12, life: R(0.8, 1.2), gravity: 12, shape: SHAPE.chunk, spin: R(-8, 8), floor: floorY }); }
        this.ring(pos, '#e0e8ff', 2.2 * s, 0.3, { faceTo: this.engine.camera.position, intensity: 3 });
        this.flash(pos, '#e8f0ff', 35 * s, 0.3);
        break;
      case 'lumiere':
        for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; this.beam(pos, pos.clone().add(V(Math.cos(a) * 3 * s, R(-1, 2), Math.sin(a) * 3 * s)), '#fff0b0', 0.4, 0.05); }
        this.sparkles(pos, '#fff4c0', 60 * s, { speed: 5, size: 0.3, life: 1.1 });
        this.ring(pos, '#fff0b0', 3 * s, 0.5, { faceTo: this.engine.camera.position, intensity: 4 });
        this.engine.bloomBoost = 1.2;
        this.flash(pos, '#fff4c8', 70 * s, 0.5);
        break;
      case 'insecte':
        for (let i = 0; i < 70 * s; i++) { const a = R(0, 6.28), r = R(0.3, 1.5); this.add.emit({ pos: [pos.x + Math.cos(a) * r, pos.y + R(-0.8, 0.8), pos.z + Math.sin(a) * r], vel: [R(-3, 3), R(-1, 2), R(-3, 3)], color: hdr(i % 2 ? '#e8ff9a' : '#a8c43a', 3), size: R(0.08, 0.16), size1: 0.05, life: R(0.5, 1.1), drag: 0.5, shape: SHAPE.spark }); }
        for (let i = 0; i < 20 * s; i++) { const a = R(0, 6.28); this.norm.emit({ pos: pos.toArray(), vel: [Math.cos(a) * 3, R(1, 3), Math.sin(a) * 3], color: hdr('#c8e05a', 1), size: 0.2, size1: 0.1, life: 1, drag: 1.5, shape: SHAPE.leaf, spin: 10 }); }
        this.flash(pos, '#d8ff6a', 18 * s, 0.35);
        break;
      case 'astral':
        for (let i = 0; i < 60 * s; i++) { const a = R(0, 6.28), e = R(-0.4, 1), v = R(2, 6) * s; this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v], color: hdr(['#8a9aff', '#ffffff', '#c58bff'][i % 3], 4), color1: hdr('#2a2a8a', 1), size: R(0.15, 0.35), size1: 0, life: R(0.6, 1.2), drag: 1.5, shape: SHAPE.spark }); }
        for (let k = 0; k < 4; k++) { const from = pos.clone().add(V(R(-3, 3), R(5, 8), R(-3, 3))); this.motes(from, pos, '#8a9aff', 10, 0.4); }
        this.ring(pos, '#7a8aff', 3 * s, 0.6, { faceTo: this.engine.camera.position, intensity: 3 });
        this.flash(pos, '#7a8aff', 40 * s, 0.5);
        break;
      case 'roche':
        for (let i = 0; i < 40 * s; i++) { const a = R(0, 6.28), v = R(2, 6) * s; this.norm.emit({ pos: [pos.x + R(-0.3, 0.3), pos.y + R(-0.2, 0.3), pos.z + R(-0.3, 0.3)], vel: [Math.cos(a) * v, R(3, 7) * s, Math.sin(a) * v], color: hdr(['#8a7458', '#a89070', '#6e6458'][i % 3], 1), size: R(0.2, 0.45) * s, size1: 0.18, life: R(0.9, 1.4), gravity: 14, drag: 0.4, shape: SHAPE.chunk, spin: R(-6, 6), floor: floorY }); }
        this.smoke(floor, [0.55, 0.47, 0.36], 18 * s, 1, 0.6);
        this.ring(floor, '#ffcf8a', 3 * s, 0.6, { intensity: 1.5 });
        this.flash(pos, '#ffcf8a', 20 * s, 0.4);
        break;
      default:
        for (let i = 0; i < 40 * s; i++) { const a = R(0, 6.28), e = R(-0.3, 0.9), v = R(3, 7) * s; this.add.emit({ pos: pos.toArray(), vel: [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v], color: hdr(L.core, 4), color1: hdr(L.glow, 1.5), size: R(0.15, 0.3), size1: 0, life: R(0.3, 0.6), drag: 4, shape: SHAPE.spark }); }
        this.ring(pos, '#ffffff', 2 * s, 0.3, { faceTo: this.engine.camera.position, intensity: 3 });
        this.flash(pos, '#fff4dc', 25 * s, 0.3);
    }
  }

  /** Pics de glace ou de roche qui jaillissent du sol. */
  spikes(center, color, n = 6, radius = 1.5) {
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, transparent: true, opacity: 0.9, emissive: color, emissiveIntensity: 0.4 });
    const group = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + R(-0.3, 0.3), r = R(0.4, radius);
      const m = new THREE.Mesh(this.shardGeo, mat);
      m.position.set(center.x + Math.cos(a) * r, center.y, center.z + Math.sin(a) * r);
      m.rotation.set(R(-0.4, 0.4), R(0, 6), R(-0.4, 0.4));
      m.userData.h = R(0.5, 1.2);
      group.add(m);
    }
    this.scene.add(group);
    this.active.push({
      t: 0, life: 1.1,
      update: (dt, t) => { const k = t < 0.15 ? Ease.outBack(t / 0.15) : t > 0.8 ? 1 - (t - 0.8) / 0.3 : 1; for (const m of group.children) m.scale.set(0.18 * k, m.userData.h * k, 0.18 * k); },
      dispose: () => { this.scene.remove(group); mat.dispose(); },
    });
  }

  /** Projectile en arc de `from` à `to`. Résout à l'impact. */
  projectile(type, from, to, duration = 0.55, arc = 1.2) {
    const L = LOOK[type] || LOOK.normal;
    let mesh, mat;
    if (type === 'roche' || type === 'metal') {
      mat = new THREE.MeshStandardMaterial({ color: type === 'metal' ? '#c8d0dc' : '#8a7458', roughness: type === 'metal' ? 0.2 : 0.9, metalness: type === 'metal' ? 0.9 : 0, flatShading: true });
      mesh = new THREE.Mesh(type === 'metal' ? this.shardGeo : this.rockGeo, mat);
      mesh.scale.setScalar(0.32);
    } else if (type === 'glace') {
      mat = new THREE.MeshPhysicalMaterial({ color: '#cff6ff', roughness: 0.05, transparent: true, opacity: 0.9, emissive: '#8fe3f2', emissiveIntensity: 0.8 });
      mesh = new THREE.Mesh(this.shardGeo, mat);
      mesh.scale.set(0.18, 0.4, 0.18);
    } else {
      mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(type === 'ombre' ? '#4a2a7a' : L.glow).multiplyScalar(type === 'ombre' ? 1.2 : 2.6), transparent: true, blending: type === 'ombre' ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, opacity: type === 'ombre' ? 0.9 : 1 });
      mesh = new THREE.Mesh(this.orbGeo, mat);
      mesh.scale.setScalar(type === 'eau' || type === 'toxine' ? 0.3 : 0.26);
    }
    this.scene.add(mesh);
    const mid = from.clone().lerp(to, 0.5);
    mid.y += arc;
    const p = new THREE.Vector3();
    const trailCol = hdr(L.core, 3.5), trailCol1 = hdr(L.glow, 1.5);
    return new Promise((resolve) => {
      this.active.push({
        t: 0, life: duration + 0.05,
        update: (dt, t) => {
          const k = Math.min(1, t / duration), a = 1 - k;
          p.set(a * a * from.x + 2 * a * k * mid.x + k * k * to.x, a * a * from.y + 2 * a * k * mid.y + k * k * to.y, a * a * from.z + 2 * a * k * mid.z + k * k * to.z);
          mesh.position.copy(p);
          mesh.rotation.x += dt * 12;
          mesh.rotation.y += dt * 9;
          for (let i = 0; i < 3; i++) {
            if (L.trail === SHAPE.drop) this.norm.emit({ pos: [p.x + R(-0.1, 0.1), p.y + R(-0.1, 0.1), p.z + R(-0.1, 0.1)], vel: [R(-0.5, 0.5), R(-0.2, 0.8), R(-0.5, 0.5)], color: hdr(L.core, 1.2), size: 0.16, size1: 0.05, life: 0.5, gravity: 6, shape: SHAPE.drop });
            else if (L.trail === SHAPE.leaf) this.norm.emit({ pos: p.toArray(), vel: [R(-1, 1), R(-0.5, 1), R(-1, 1)], color: hdr('#6fd65a', 1.1), size: 0.25, size1: 0.1, life: 0.7, drag: 2, shape: SHAPE.leaf, spin: R(-8, 8) });
            else if (L.trail === SHAPE.smoke) this.norm.emit({ pos: p.toArray(), vel: [R(-0.4, 0.4), R(0, 0.5), R(-0.4, 0.4)], color: type === 'ombre' ? [0.12, 0.06, 0.18] : [0.85, 0.88, 0.95], size: 0.4, size1: 1, life: 0.6, shape: SHAPE.smoke, alpha: 0.45 });
            else if (L.trail === SHAPE.chunk) this.norm.emit({ pos: p.toArray(), vel: [R(-0.4, 0.4), R(0, 0.5), R(-0.4, 0.4)], color: [0.6, 0.52, 0.42], size: 0.4, size1: 1, life: 0.6, shape: SHAPE.smoke, alpha: 0.4 });
            this.add.emit({ pos: [p.x + R(-0.08, 0.08), p.y + R(-0.08, 0.08), p.z + R(-0.08, 0.08)], vel: [R(-0.4, 0.4), R(-0.2, 0.6), R(-0.4, 0.4)], color: trailCol, color1: trailCol1, size: L.trail === SHAPE.spark ? 0.2 : 0.35, size1: 0, life: 0.35, drag: 2, gravity: type === 'feu' ? -2 : 0, shape: L.trail === SHAPE.spark ? SHAPE.spark : SHAPE.glow });
          }
          if (type === 'foudre' && Math.random() < 0.25) this.bolt(p, p.clone().add(V(R(-0.6, 0.6), R(-0.6, 0.6), R(-0.6, 0.6))), '#fff6b0', 0.1, 0.02);
          if (k >= 1) { resolve(); return false; }
          return true;
        },
        dispose: () => { this.scene.remove(mesh); mat.dispose(); },
      });
    });
  }

  /** Préparation d'une attaque de zone (colonne, vague, tempête, pluie d'éclats…). */
  async areaCast(type, target, floorY) {
    const L = LOOK[type] || LOOK.normal;
    switch (type) {
      case 'feu':
        for (let i = 0; i < 6; i++) {
          for (let k = 0; k < 18; k++) { const a = R(0, 6.28), r = R(0, 0.9); this.add.emit({ pos: [target.x + Math.cos(a) * r, floorY + 0.1, target.z + Math.sin(a) * r], vel: [R(-0.5, 0.5), R(5, 9), R(-0.5, 0.5)], color: hdr('#ffe08a', 5), color1: hdr('#ff2a00', 2), size: R(0.5, 0.9), size1: 0.1, life: R(0.5, 0.8), drag: 1.5, shape: SHAPE.glow }); }
          await tweens.sleep(0.07);
        }
        break;
      case 'eau': case 'toxine':
        for (let i = 0; i < 5; i++) {
          for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.28, r = 3.2 - i * 0.6; this.norm.emit({ pos: [target.x + Math.cos(a) * r, floorY + 0.2, target.z + Math.sin(a) * r], vel: [-Math.cos(a) * 3, R(3, 6), -Math.sin(a) * 3], color: hdr(L.core, 1.2), color1: hdr(L.glow, 1), size: 0.3, size1: 0.1, life: 0.8, gravity: 10, shape: SHAPE.drop, floor: floorY }); }
          await tweens.sleep(0.08);
        }
        break;
      case 'plante': case 'insecte': case 'vent':
        for (let i = 0; i < 8; i++) {
          for (let k = 0; k < 10; k++) { const a = R(0, 6.28), r = R(1.5, 2.5); this.norm.emit({ pos: [target.x + Math.cos(a) * r, floorY + R(0.2, 2.5), target.z + Math.sin(a) * r], vel: [-Math.sin(a) * 6 - Math.cos(a), R(0, 1), Math.cos(a) * 6 - Math.sin(a)], color: type === 'vent' ? [0.9, 0.93, 1] : hdr(k % 3 ? L.glow : '#ff9ad5', 1.1), size: type === 'vent' ? 0.5 : 0.32, size1: type === 'vent' ? 1.2 : 0.2, life: 1.0, drag: 0.5, shape: type === 'vent' ? SHAPE.smoke : SHAPE.leaf, spin: R(-8, 8), alpha: 0.6 }); }
          await tweens.sleep(0.06);
        }
        break;
      case 'foudre':
        for (let i = 0; i < 4; i++) {
          this.bolt(target.clone().add(V(R(-2, 2), 8, R(-2, 2))), target.clone().add(V(R(-1, 1), R(-0.5, 0.5), R(-1, 1))), '#fff6b0', 0.2, 0.05);
          this.flash(target, '#fff3b0', 30, 0.15);
          await tweens.sleep(0.09);
        }
        break;
      case 'glace':
        for (let i = 0; i < 14; i++) { this.norm.emit({ pos: [target.x + R(-1.4, 1.4), floorY + R(6, 9), target.z + R(-1.4, 1.4)], vel: [0, -R(8, 12), 0], color: hdr('#e8fbff', 1.3), size: R(0.3, 0.55), size1: 0.2, life: 1, gravity: 10, shape: SHAPE.chunk, spin: R(-4, 4), floor: floorY }); await tweens.sleep(0.04); }
        break;
      case 'lumiere': case 'psy': case 'astral':
        this.beam(target.clone().add(V(0, 9, 0)), V(target.x, floorY, target.z), L.glow, 0.7, 0.9);
        this.flash(target, L.glow, 50, 0.6);
        await tweens.sleep(0.35);
        break;
      case 'ombre':
        this.smoke(V(target.x, floorY + 0.2, target.z), [0.06, 0.03, 0.1], 30, 1.6, 0.8);
        await tweens.sleep(0.4);
        break;
      case 'combat': case 'normal': case 'metal':
        this.ring(V(target.x, floorY + 0.05, target.z), L.glow, 4, 0.4, { intensity: 2 });
        await tweens.sleep(0.25);
        break;
      default:
        for (let i = 0; i < 10; i++) { this.norm.emit({ pos: [target.x + R(-1.2, 1.2), floorY + R(6, 9), target.z + R(-1.2, 1.2)], vel: [0, -R(6, 10), 0], color: hdr('#8a7458', 1), size: R(0.5, 0.9), size1: 0.4, life: 1.2, gravity: 12, shape: SHAPE.chunk, spin: R(-4, 4), floor: floorY }); await tweens.sleep(0.05); }
        await tweens.sleep(0.2);
        break;
    }
  }

  /** Séisme : onde au sol, poussière, tremblement. */
  quake(center, floorY) {
    this.engine.addShake(0.45);
    for (let k = 0; k < 3; k++) setTimeout(() => this.ring(V(center.x, floorY + 0.05, center.z), '#d8b88a', 6, 0.6, { intensity: 1.2 }), k * 120);
    this.smoke(V(center.x, floorY + 0.2, center.z), [0.55, 0.47, 0.36], 30, 1.4, 0.6);
  }

  /** Aura d'une attaque de statut (montante = bonus, descendante = malus). */
  aura(type, pos, height = 1.5, debuff = false) {
    const col = hdr(TYPES[type]?.color || '#ffffff', 3);
    for (let i = 0; i < 50; i++) {
      const a = R(0, 6.28), r = R(0.4, 1.0);
      const y = debuff ? pos.y + height * R(0.8, 1.4) : pos.y + R(0, 0.3);
      this.add.emit({ pos: [pos.x + Math.cos(a) * r, y, pos.z + Math.sin(a) * r], vel: [-Math.cos(a) * 0.2, debuff ? -R(1.2, 2.2) : R(1.5, 3), -Math.sin(a) * 0.2], color: col, color1: debuff ? [0.3, 0.3, 0.5] : [1.4, 1.4, 1.4], size: R(0.2, 0.35), size1: 0, life: R(0.8, 1.3), drag: 0.5, shape: SHAPE.spark });
    }
    this.ring(V(pos.x, pos.y + 0.05, pos.z), TYPES[type]?.color || '#ffffff', 1.8, 0.8);
  }

  /** Effet visuel d'un statut infligé. */
  statusFx(status, pos, height) {
    const top = pos.clone().add(V(0, height, 0));
    switch (status) {
      case 'brn': this.burst('feu', pos.clone().add(V(0, height * 0.5, 0)), 0.5, pos.y); break;
      case 'psn': case 'tox': this.burst('toxine', pos.clone().add(V(0, height * 0.5, 0)), 0.5, pos.y); break;
      case 'par': for (let i = 0; i < 3; i++) this.bolt(top.clone().add(V(R(-0.6, 0.6), 0.4, R(-0.6, 0.6))), pos.clone().add(V(R(-0.5, 0.5), R(0, height), R(-0.5, 0.5))), '#fff6b0', 0.3, 0.03); break;
      case 'slp': for (let i = 0; i < 6; i++) this.add.emit({ pos: top.toArray(), vel: [R(-0.3, 0.3), R(0.6, 1), R(-0.3, 0.3)], color: hdr('#c8d8ff', 2), size: 0.3, size1: 0.5, life: 1.6, shape: SHAPE.glow }); break;
      case 'frz': this.spikes(pos, '#bff4ff', 8, 0.9); this.sparkles(pos.clone().add(V(0, height * 0.5, 0)), '#e8fbff', 30); break;
      default: break;
    }
  }
}

export { LOOK as FX_LOOK };
