import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/utils.js';

/**
 * CAMÉRA
 * - 'orbit'  : troisième personne libre (souris, stick droit, glisser), avec collisions (extérieurs, grottes)
 * - 'fixed'  : vue plongeante fixe façon jeux de monstres classiques (intérieurs, arènes)
 */
export class CameraRig {
  constructor(camera, input, settings) {
    this.camera = camera;
    this.input = input;
    this.settings = settings;
    this.mode = 'orbit';
    this.yaw = 0;
    this.pitch = 0.36;
    this.distance = 7.4;
    this.curDist = 7.4;
    this.minD = 2.6;
    this.maxD = 13;
    this.target = new THREE.Vector3();
    this.idleLook = 0;
    this.dir = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.fixed = { pitch: 0.95, distance: 11.5, yaw: 0 };
    this.bounds = null;
  }

  setMode(mode, opts = {}) {
    this.mode = mode;
    if (mode === 'fixed') {
      this.fixed = { pitch: opts.pitch ?? 0.92, distance: opts.distance ?? 11.5, yaw: opts.yaw ?? 0 };
      this.bounds = opts.bounds || null;
    } else {
      this.distance = opts.distance ?? this.distance;
      this.maxD = opts.maxD ?? 13;
    }
  }

  snapBehind(rotY, focus) {
    this.yaw = this.mode === 'fixed' ? this.fixed.yaw : rotY + Math.PI;
    if (focus) this.target.set(focus.x, focus.y + 1.45, focus.z);
    this.curDist = this.mode === 'fixed' ? this.fixed.distance : this.distance;
  }

  update(dt, focus, map, playerMoving, playerRotY, shake) {
    const cam = this.camera;
    if (this.mode === 'fixed') {
      this.input.consumeLook();
      this.input.consumeZoom();
      const f = this.fixed;
      // en mode portrait (téléphone), la vue est étroite : on suit le joueur horizontalement
      const tx = this.bounds && cam.aspect >= 1 ? clamp(focus.x, this.bounds[0], this.bounds[1]) : focus.x;
      const tz = this.bounds ? clamp(focus.z, this.bounds[2], this.bounds[3]) : focus.z;
      this.target.x = damp(this.target.x, tx, 8, dt);
      this.target.y = damp(this.target.y, focus.y + 1.0, 8, dt);
      this.target.z = damp(this.target.z, tz, 8, dt);
      this.yaw = f.yaw;
      const cp = Math.cos(f.pitch);
      cam.position.set(this.target.x + Math.sin(f.yaw) * cp * f.distance, this.target.y + Math.sin(f.pitch) * f.distance, this.target.z + Math.cos(f.yaw) * cp * f.distance);
      if (shake) cam.position.add(shake);
      cam.lookAt(this.target);
      return;
    }
    const look = this.input.consumeLook();
    const sens = this.settings.sensitivity || 1;
    const inv = this.settings.invertY ? -1 : 1;
    if (look.dx || look.dy) this.idleLook = 0; else this.idleLook += dt;
    this.yaw -= look.dx * 0.0045 * sens;
    this.pitch = clamp(this.pitch + look.dy * 0.0035 * sens * inv, -0.15, 1.2);
    this.distance = clamp(this.distance + this.input.consumeZoom() * 0.8, this.minD, this.maxD);
    const portrait = cam.aspect < 0.85;
    const dist = portrait ? Math.min(this.maxD, this.distance * 1.15) : this.distance;
    if (playerMoving && this.idleLook > 2.2) this.yaw = dampAngle(this.yaw, playerRotY + Math.PI, 0.9, dt);

    this.tmp.set(focus.x, focus.y + 1.45, focus.z);
    this.target.x = damp(this.target.x, this.tmp.x, 14, dt);
    this.target.y = damp(this.target.y, this.tmp.y, 8, dt);
    this.target.z = damp(this.target.z, this.tmp.z, 14, dt);
    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    let allowed = dist;
    const p = this.tmp;
    for (let d = 0.5; d <= dist; d += 0.25) {
      p.copy(this.target).addScaledVector(this.dir, d);
      if (map.colliders.blocksCamera(p.x, p.y, p.z, 0.32) || p.y < map.heightAt(p.x, p.z) + 0.35) {
        allowed = Math.max(0.9, d - 0.35);
        break;
      }
    }
    this.curDist = allowed < this.curDist ? allowed : damp(this.curDist, allowed, 3.5, dt);
    cam.position.copy(this.target).addScaledVector(this.dir, this.curDist);
    const ground = map.heightAt(cam.position.x, cam.position.z) + 0.4;
    if (cam.position.y < ground) cam.position.y = ground;
    if (shake) cam.position.add(shake);
    cam.lookAt(this.target);
  }
}
