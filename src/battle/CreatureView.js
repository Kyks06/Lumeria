import * as THREE from 'three';
import { buildCreature } from '../render/CreatureBuilder.js';
import { ProceduralAnimator, ClipAnimator } from '../core/Animator.js';
import { normalizeObject } from '../core/Assets.js';
import { tweens, Ease } from '../core/utils.js';

/**
 * Représentation 3D d'un Lumin : modèle .glb (AnimationMixer) ou forme générée détaillée.
 * Hiérarchie : group (placement) → offset (apparition, lancer) → anim (superpositions) → modèle.
 */
const cache = new Map();

export class CreatureView {
  constructor(assets, species, { shadows = true, shiny = false } = {}) {
    this.species = species;
    this.shiny = shiny;
    this.height = species.height;
    this.group = new THREE.Group();
    this.offset = new THREE.Group();
    this.anim = new THREE.Group();
    this.group.add(this.offset);
    this.offset.add(this.anim);

    const inst = assets ? assets.instantiate(`creature:${species.id}`, { height: species.height }) : null;
    if (inst) {
      this.isGLB = true;
      this.anim.add(inst.object);
      if (shiny) inst.object.traverse((o) => { if (o.isMesh && o.material?.color) o.material.color.offsetHSL(0.42, 0.05, 0); });
      this.animator = new ClipAnimator(inst.model, inst.animations, this.anim, species.height);
    } else {
      this.isGLB = false;
      const built = buildCreature(species, { shiny });
      const scaler = new THREE.Group();
      scaler.add(built.object);
      this.anim.add(normalizeObject(scaler, { height: species.height }));
      this.animator = new ProceduralAnimator(built.rig);
      this.ownMaterials = built.rig.materials;
    }
    this.mats = [];
    const seen = new Set();
    this.group.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = shadows && !o.material?.userData?.noShadow && o.castShadow !== false;
      o.receiveShadow = shadows;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (!m || seen.has(m) || !m.emissive) continue;
        seen.add(m);
        this.mats.push({ m, base: m.emissive.clone(), baseI: m.emissiveIntensity ?? 1 });
      }
    });
    this.glow = 0;
    this.glowColor = new THREE.Color('#ffffff');
    this.flashAmt = 0;
    this.flashColor = new THREE.Color('#ffffff');
    this.lastG = -1;
    this.animator.play('idle');
  }

  play(name, opts) { return this.animator.play(name, opts); }

  update(dt) {
    this.animator.update(dt);
    this.updateGlow();
  }

  flash(color = '#ffffff', strength = 2.2, duration = 0.4) {
    this.flashColor.set(color);
    this.flashAmt = strength;
    return tweens.tween(duration, (t) => { this.flashAmt = strength * (1 - t); }, Ease.outQuad);
  }

  setGlow(value, color) {
    this.glow = value;
    if (color) this.glowColor.set(color);
  }

  updateGlow() {
    const g = Math.max(this.glow, this.flashAmt);
    if (Math.abs(g - this.lastG) < 0.001) return;
    this.lastG = g;
    const col = this.flashAmt > this.glow ? this.flashColor : this.glowColor;
    for (const { m, base, baseI } of this.mats) {
      if (g <= 0.001) { m.emissive.copy(base); m.emissiveIntensity = baseI; continue; }
      m.emissive.copy(base).multiplyScalar(baseI).lerp(col, Math.min(1, g)).multiplyScalar(Math.max(1, g));
      m.emissiveIntensity = 1;
    }
  }

  center(out = new THREE.Vector3()) {
    this.group.getWorldPosition(out);
    out.y += this.height * 0.5 * this.group.scale.y * this.offset.scale.y;
    return out;
  }

  faceTowards(x, z) {
    const p = this.group.position;
    this.group.rotation.y = Math.atan2(x - p.x, z - p.z);
  }

  dispose() {
    this.group.parent?.remove(this.group);
    if (!this.isGLB && this.ownMaterials) for (const m of Object.values(this.ownMaterials)) m.dispose?.();
  }
}

export { cache as creatureViewCache };
