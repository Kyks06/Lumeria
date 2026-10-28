import * as THREE from 'three';
import { GAME } from '../config/game.js';
import { MODELS } from '../config/models.js';
import { buildHuman, humanHeight } from '../render/HumanBuilder.js';
import { buildBike, buildSurfboard } from '../render/Props.js';
import { ProceduralAnimator, ClipAnimator } from '../core/Animator.js';
import { normalizeObject } from '../core/Assets.js';
import { CreatureView } from '../battle/CreatureView.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { damp, dampAngle, clamp } from '../core/utils.js';

export const PLAYER_LOOKS = {
  garcon: { gender: 'm', skin: '#f1c9a5', hair: '#2d1e17', hairStyle: 'spiky', top: '#ff7a3d', bottom: '#2b3352', accent: '#ffd23f', hat: 'cap', hatColor: '#ff5a3d', backpack: true, packColor: '#ffd23f', shoes: '#e8e4dc' },
  fille: { gender: 'f', skin: '#f3d0b0', hair: '#6a3a22', hairStyle: 'ponytail', top: '#3a9adf', bottom: '#2a2a3a', accent: '#ffe48a', hat: 'beret', hatColor: '#ff5c8a', backpack: true, packColor: '#ff7aa2', shoes: '#ffffff' },
};

/** Modèle humanoïde : .glb si disponible, sinon personnage détaillé généré. */
export function createHuman(assets, key, look, heightOverride) {
  const height = heightOverride || humanHeight(look);
  const anim = new THREE.Group();
  const inst = assets ? assets.instantiate(key, { height }) : null;
  if (inst) {
    anim.add(inst.object);
    return { root: anim, animator: new ClipAnimator(inst.model, inst.animations, anim, height), isGLB: true, height };
  }
  const built = buildHuman(look);
  const scaler = new THREE.Group();
  scaler.add(built.object);
  anim.add(normalizeObject(scaler, { height }));
  return { root: anim, animator: new ProceduralAnimator(built.rig), isGLB: false, height };
}

/**
 * JOUEUR : marche, course, vélo, surf, escalade, glissade sur la glace, poussée de rochers.
 * Le déplacement est relatif à la caméra ; les collisions viennent de la carte courante.
 */
export class Player {
  constructor(assets, lookId = 'garcon') {
    this.assets = assets;
    this.group = new THREE.Group();
    this.velocity = new THREE.Vector3();
    this.speed = 0;
    this.rotY = Math.PI;
    this.mode = 'walk'; // walk | bike | surf | climb | slide | cine
    this.anim = 'idle';
    this.mount = null;
    this.slideDir = null;
    this.stepAcc = 0;
    this.setLook(lookId);
  }

  setLook(lookId) {
    if (this.model) this.group.remove(this.model.root);
    this.lookId = lookId;
    const key = lookId === 'fille' ? 'playerGirl' : 'player';
    this.model = createHuman(this.assets, key, PLAYER_LOOKS[lookId] || PLAYER_LOOKS.garcon, lookId === 'fille' ? MODELS.playerGirl.height : MODELS.player.height);
    this.group.add(this.model.root);
    this.animator = this.model.animator;
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.anim = '';
    this.playAnim('idle');
  }

  get position() { return this.group.position; }

  playAnim(name, opts) {
    if (name === this.anim) return;
    this.anim = name;
    this.animator.play(name, { fade: 0.2, ...opts });
  }

  place(x, z, rot, map) {
    this.group.position.set(x, map.heightAt(x, z), z);
    if (rot !== undefined) this.rotY = rot;
    this.group.rotation.y = this.rotY;
    this.velocity.set(0, 0, 0);
    this.slideDir = null;
  }

  setMode(mode, opts = {}) {
    if (this.mount) { this.group.remove(this.mount); this.mount.traverse?.((o) => o.geometry?.dispose?.()); this.mount = null; }
    if (this.mountView) { this.mountView.dispose(); this.mountView = null; }
    this.mode = mode;
    this.model.root.position.set(0, 0, 0);
    if (mode === 'bike') {
      this.mount = buildBike(opts.color || '#ff4f4f');
      this.group.add(this.mount);
      this.model.root.position.set(0, 0.12, -0.12);
      this.playAnim('ride');
    } else if (mode === 'surf') {
      const sp = opts.species ? CREATURE_MAP[opts.species] : null;
      if (sp) {
        this.mountView = new CreatureView(this.assets, { ...sp, height: Math.max(1.0, Math.min(1.6, sp.height)) });
        this.mountView.group.position.set(0, -0.55, 0.1);
        this.group.add(this.mountView.group);
        this.model.root.position.set(0, this.mountView.height * 0.55 - 0.45, -0.05);
      } else {
        this.mount = buildSurfboard();
        this.mount.position.y = -0.12;
        this.group.add(this.mount);
        this.model.root.position.set(0, -0.02, 0);
      }
      this.playAnim('surf');
    } else {
      this.playAnim('idle');
    }
  }

  /**
   * @param ctx { input, cameraYaw, map, control, onStep(dist) }
   */
  update(dt, ctx) {
    const { input, cameraYaw, map, control } = ctx;
    const p = this.group.position;
    if (this.mode === 'cine' || this.mode === 'climb') {
      this.animator.update(dt);
      this.mountView?.update(dt);
      return;
    }
    // Glissade sur la glace : déplacement forcé jusqu'à un obstacle
    if (this.slideDir) {
      const sp = 9;
      const nx = p.x + this.slideDir.x * sp * dt, nz = p.z + this.slideDir.z * sp * dt;
      if (map.canWalk(p.x, p.z, nx, nz, this, true)) {
        p.x = nx; p.z = nz;
        p.y = map.heightAt(p.x, p.z);
        if (!map.isIce?.(p.x, p.z)) { this.slideDir = null; map.snapToGrid?.(p); }
      } else {
        this.slideDir = null;
        map.snapToGrid?.(p);
      }
      this.playAnim('idle');
      this.animator.update(dt);
      return;
    }
    let mx = 0, mz = 0, run = false;
    if (control) {
      const mv = input.getMove();
      const fx = -Math.sin(cameraYaw), fz = -Math.cos(cameraYaw);
      const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
      mx = rx * mv.x + fx * mv.y;
      mz = rz * mv.x + fz * mv.y;
      run = input.isRunning() !== !!ctx.autoRun;
    }
    const mag = Math.min(1, Math.hypot(mx, mz));
    const P = GAME.player;
    const max = (this.mode === 'bike' ? P.bikeSpeed : this.mode === 'surf' ? P.surfSpeed * (run ? 1.3 : 1) : run ? P.runSpeed : P.walkSpeed) * mag;
    const len = Math.hypot(mx, mz) || 1;
    const tx = (mx / len) * max, tz = (mz / len) * max;
    const accel = this.mode === 'bike' ? 4.5 : this.mode === 'surf' ? 3 : 11;
    this.velocity.x = damp(this.velocity.x, tx, accel, dt);
    this.velocity.z = damp(this.velocity.z, tz, accel, dt);

    const ox = p.x, oz = p.z;
    let nx = p.x + this.velocity.x * dt, nz = p.z + this.velocity.z * dt;
    const surf = this.mode === 'surf';
    if (!map.canWalk(ox, oz, nx, nz, this)) {
      if (map.canWalk(ox, oz, nx, oz, this)) nz = oz;
      else if (map.canWalk(ox, oz, ox, nz, this)) nx = ox;
      else { nx = ox; nz = oz; this.velocity.multiplyScalar(0.5); }
    }
    p.x = nx; p.z = nz;
    map.colliders.resolve(p, P.radius);
    if (!surf && map.isWaterAt?.(p.x, p.z)) { p.x = ox; p.z = oz; }
    if (surf && !map.isWaterAt?.(p.x, p.z) && !map.canLandFromSurf) { p.x = ox; p.z = oz; }
    const ground = map.heightAt(p.x, p.z);
    p.y = surf ? map.waterY ?? -0.35 : ground;
    const moved = Math.hypot(p.x - ox, p.z - oz);
    if (moved > 0) ctx.onStep?.(moved);

    // Arrivée sur une case de glace : on glisse
    if (map.isIce?.(p.x, p.z) && mag > 0.3 && this.mode === 'walk') {
      const ax = Math.abs(mx) > Math.abs(mz) ? Math.sign(mx) : 0, az = ax ? 0 : Math.sign(mz);
      this.slideDir = new THREE.Vector3(ax, 0, az);
      map.snapToGrid?.(p, true);
    }

    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.speed > 0.2) this.rotY = dampAngle(this.rotY, Math.atan2(this.velocity.x, this.velocity.z), this.mode === 'bike' ? 7 : 12, dt);
    this.group.rotation.y = this.rotY;
    if (this.mode === 'bike') {
      this.playAnim('ride');
      this.animator.setTimeScale(clamp(this.speed / 6, 0, 2));
      this.mount.rotation.z = damp(this.mount.rotation.z, -(this.velocity.x * Math.cos(this.rotY) - this.velocity.z * Math.sin(this.rotY)) * 0.02, 6, dt);
    } else if (this.mode === 'surf') {
      this.playAnim('surf');
      this.group.position.y += Math.sin(performance.now() * 0.002) * 0.05;
      if (this.mountView) this.mountView.play(this.speed > 1 ? 'walk' : 'idle');
    } else {
      let next = 'idle';
      if (this.speed > 5.2) next = 'run';
      else if (this.speed > 0.25) next = 'walk';
      this.playAnim(next);
      if (next === 'walk') this.animator.setTimeScale(clamp(this.speed / P.walkSpeed, 0.5, 1.3));
      if (next === 'run') this.animator.setTimeScale(clamp(this.speed / P.runSpeed, 0.7, 1.2));
    }
    this.animator.update(dt);
    this.mountView?.update(dt);
  }

  idle(dt) {
    if (this.mode === 'walk') this.playAnim('idle');
    this.velocity.set(0, 0, 0);
    this.speed = 0;
    this.animator.update(dt);
    this.mountView?.update(dt);
  }
}

/**
 * PERSONNAGE NON JOUEUR : humain ou Lumin, peut se promener, tourner la tête vers le joueur,
 * et — pour les dresseurs — repérer le joueur dans son champ de vision.
 */
export class NPC {
  constructor(def, assets, map) {
    this.def = def;
    this.id = def.id;
    this.name = def.name || '';
    this.map = map;
    this.group = new THREE.Group();
    if (def.creature) {
      const sp = CREATURE_MAP[def.creature];
      this.view = new CreatureView(assets, sp, { shiny: !!def.shiny });
      this.group.add(this.view.group);
      this.animator = this.view.animator;
      this.height = sp.height;
    } else {
      const m = createHuman(assets, 'npc', def.look || {});
      this.group.add(m.root);
      this.animator = m.animator;
      this.height = m.height;
    }
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.home = new THREE.Vector3(def.x, 0, def.z);
    this.yOff = def.yOff || 0;
    this.group.position.set(def.x, map.heightAt(def.x, def.z) + this.yOff, def.z);
    this.baseRot = def.rot ?? 0;
    this.rotY = this.baseRot;
    this.targetRot = this.baseRot;
    this.group.rotation.y = this.rotY;
    this.talkTimer = 0;
    this.wanderT = 1 + Math.random() * 4;
    this.target = null;
    this.walkSpeed = 1.6;
    this.anim = '';
    this.spinT = 2 + Math.random() * 3;
    this.collider = map.colliders.addCircle(def.x, def.z, def.creature ? Math.max(0.4, this.height * 0.35) : 0.45, { camera: false, tag: 'npc' });
    this.playAnim(def.pose || 'idle');
    this.animator.update(Math.random() * 3);
  }

  get position() { return this.group.position; }

  playAnim(name, opts) {
    if (name === this.anim) return;
    this.anim = name;
    this.animator.play(name, opts);
  }

  faceTowards(x, z, hold = 6) {
    const p = this.group.position;
    this.targetRot = Math.atan2(x - p.x, z - p.z);
    this.talkTimer = hold;
  }

  /** Le dresseur voit-il le joueur ? (ligne droite devant lui) */
  sees(px, pz) {
    const sight = this.def.sight ?? 6;
    if (sight <= 0) return false;
    const p = this.group.position;
    const fx = Math.sin(this.rotY), fz = Math.cos(this.rotY);
    const dx = px - p.x, dz = pz - p.z;
    const ahead = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (ahead < 0.5 || ahead > sight || side > 1.1) return false;
    for (let t = 0.6; t < ahead - 0.6; t += 0.5) {
      if (this.map.colliders.blocksCamera(p.x + fx * t, p.y + 1, p.z + fz * t, 0.05)) return false;
    }
    return true;
  }

  walkTo(x, z) {
    this.target = new THREE.Vector3(x, 0, z);
    return new Promise((res) => { this.onArrive = res; });
  }

  update(dt) {
    const p = this.group.position;
    if (this.target) {
      const dx = this.target.x - p.x, dz = this.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        this.target = null;
        this.playAnim('idle');
        this.map.colliders.move(this.collider, p.x, p.z);
        const cb = this.onArrive; this.onArrive = null; cb?.();
      } else {
        const step = Math.min(d, (this.def.trainer || this.runFast ? 3.8 : this.walkSpeed) * dt);
        p.x += (dx / d) * step; p.z += (dz / d) * step;
        p.y = this.map.heightAt(p.x, p.z) + this.yOff;
        this.rotY = dampAngle(this.rotY, Math.atan2(dx, dz), 10, dt);
        this.playAnim(this.def.trainer || this.runFast ? 'run' : 'walk');
      }
    } else if (this.talkTimer > 0) {
      this.talkTimer -= dt;
      if (this.talkTimer <= 0) this.targetRot = this.baseRot;
      this.rotY = dampAngle(this.rotY, this.targetRot, 6, dt);
    } else if (this.def.wander && !this.busy) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 5;
        const a = Math.random() * Math.PI * 2, r = Math.random() * this.def.wander;
        const tx = this.home.x + Math.cos(a) * r, tz = this.home.z + Math.sin(a) * r;
        if (this.map.canWalk(p.x, p.z, tx, tz, null) && !this.map.colliders.blocksCamera(tx, p.y + 0.5, tz, 0.4)) this.walkTo(tx, tz);
      }
      this.rotY = dampAngle(this.rotY, this.targetRot, 6, dt);
    } else if (this.def.spin && !this.busy) {
      this.spinT -= dt;
      if (this.spinT <= 0) {
        this.spinT = 2 + Math.random() * 3;
        this.baseRot = this.targetRot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][Math.floor(Math.random() * 4)];
      }
      this.rotY = dampAngle(this.rotY, this.targetRot, 8, dt);
    } else {
      this.rotY = dampAngle(this.rotY, this.targetRot, 6, dt);
    }
    this.group.rotation.y = this.rotY;
    this.animator.update(dt);
    if (this.view) this.view.updateGlow();
  }
}
