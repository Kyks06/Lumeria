import * as THREE from 'three';
import { CREATURE_MAP } from '../config/creatures.js';
import { TYPES } from '../config/types.js';
import { CreatureView } from '../battle/CreatureView.js';
import { hdr, SHAPE } from '../render/Particles.js';
import { rand, randInt, dampAngle, tweens, Ease } from '../core/utils.js';

/** Tire une entrée pondérée dans une table [[espèce, nivMin, nivMax, poids, moment?], …]. */
export function rollEncounter(table, timeOfDay) {
  const list = (table || []).filter((e) => !e[4] || e[4] === timeOfDay);
  if (!list.length) return null;
  const tot = list.reduce((a, e) => a + (e[3] || 10), 0);
  let r = Math.random() * tot;
  for (const e of list) { r -= e[3] || 10; if (r <= 0) return { species: e[0], level: randInt(e[1], e[2]) }; }
  const e = list[0];
  return { species: e[0], level: randInt(e[1], e[2]) };
}

/**
 * LUMINS SAUVAGES VISIBLES : ils se promènent dans les hautes herbes, les grottes et sur l'eau.
 * Certains s'approchent par curiosité, d'autres s'enfuient. Les toucher déclenche un combat.
 */
export class WildSpawner {
  constructor(map, ctx) {
    this.map = map;
    this.ctx = ctx;
    this.entities = [];
    this.respawns = [];
    this.zones = [];
    this.caveTable = null;
    this.surfTable = null;
    this.t = 0;
  }

  addZone(rect, table, count) { this.zones.push({ rect, table, count }); }

  init() {
    for (const z of this.zones) for (let i = 0; i < z.count; i++) this.spawnInZone(z, false);
  }

  clear() {
    for (const e of this.entities) e.view.dispose();
    this.entities = [];
    this.respawns = [];
  }

  makeEntity(enc, x, z, zone, method) {
    const sp = CREATURE_MAP[enc.species];
    if (!sp) return null;
    const shiny = Math.random() < 1 / (this.ctx.shinyOdds?.() || 1024);
    const view = new CreatureView(this.ctx.assets, sp, { shiny });
    view.group.position.set(x, method === 'surf' ? this.map.waterY - 0.2 : this.map.heightAt(x, z), z);
    view.group.rotation.y = rand(0, Math.PI * 2);
    this.map.group.add(view.group);
    const roll = Math.random();
    const e = {
      view, sp, level: enc.level, zone, method, shiny,
      state: 'idle', timer: rand(0.5, 3), target: new THREE.Vector3(), speed: 0.9 + sp.base.spe / 60,
      temper: roll < 0.22 ? 'curious' : roll < 0.5 ? 'shy' : 'calm', noticed: false, life: method === 'grass' ? Infinity : rand(25, 45),
    };
    this.entities.push(e);
    view.offset.scale.setScalar(0.01);
    tweens.tween(0.5, (t) => view.offset.scale.setScalar(Math.max(0.01, t)), Ease.outBack);
    return e;
  }

  spawnInZone(zone, animate = true) {
    const enc = rollEncounter(zone.table, this.ctx.timeOfDay());
    if (!enc) return;
    const [x0, z0, w, d] = zone.rect;
    for (let k = 0; k < 8; k++) {
      const x = x0 + rand(-w / 2 + 0.6, w / 2 - 0.6), z = z0 + rand(-d / 2 + 0.6, d / 2 - 0.6);
      if (this.map.isWaterAt(x, z)) continue;
      const e = this.makeEntity(enc, x, z, zone, 'grass');
      if (e && animate) this.sparkle(e.view.group.position, e.sp.types[0]);
      return;
    }
  }

  spawnNear(player, table, method) {
    const enc = rollEncounter(table, this.ctx.timeOfDay());
    if (!enc) return;
    for (let k = 0; k < 10; k++) {
      const a = rand(0, Math.PI * 2), r = rand(10, 24);
      const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
      if (!this.map.inBounds(x, z, -2)) continue;
      const water = this.map.isWaterAt(x, z);
      if (method === 'surf' ? !water : water) continue;
      if (method === 'cave' && this.map.heightAt(x, z) > this.map.heightAt(player.x, player.z) + 1.2) continue;
      if (this.map.colliders.blocksCamera(x, this.map.heightAt(x, z) + 0.5, z, 0.6)) continue;
      const e = this.makeEntity(enc, x, z, { rect: [x, z, 10, 10], table }, method);
      if (e) this.sparkle(e.view.group.position, e.sp.types[0]);
      return;
    }
  }

  sparkle(pos, type) {
    const fx = this.ctx.fxAdd;
    if (!fx) return;
    const col = hdr(TYPES[type].color, 3);
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.6;
      fx.emit({ pos: [pos.x + Math.cos(a) * r, pos.y + Math.random() * 0.8, pos.z + Math.sin(a) * r], vel: [Math.cos(a) * 0.6, 1.2 + Math.random() * 1.5, Math.sin(a) * 0.6], color: col, color1: [1, 1, 1], size: 0.25, size1: 0, life: 0.9, drag: 1.5, shape: SHAPE.spark });
    }
  }

  remove(e, respawnDelay = 25) {
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
    e.view.dispose();
    if (e.method === 'grass') this.respawns.push({ zone: e.zone, t: respawnDelay });
  }

  /** @returns l'entité touchée par le joueur (ou null) */
  update(dt, player, opts) {
    this.t += dt;
    const P = player.position;
    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      r.t -= dt;
      if (r.t <= 0) {
        const near = Math.hypot(P.x - r.zone.rect[0], P.z - r.zone.rect[1]) < 9;
        if (!near) { this.respawns.splice(i, 1); this.spawnInZone(r.zone); } else r.t = 3;
      }
    }
    // apparitions dynamiques (grottes, surf)
    const dyn = this.entities.filter((e) => e.method !== 'grass');
    if (this.caveTable && player.mode !== 'surf' && dyn.filter((e) => e.method === 'cave').length < 5 && Math.random() < dt * 0.4) this.spawnNear(P, this.caveTable, 'cave');
    if (this.surfTable && player.mode === 'surf' && dyn.filter((e) => e.method === 'surf').length < 4 && Math.random() < dt * 0.5) this.spawnNear(P, this.surfTable, 'surf');

    let hit = null;
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      const g = e.view.group;
      const dx = P.x - g.position.x, dz = P.z - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (e.method !== 'grass') {
        e.life -= dt;
        if (e.life <= 0 || dist > 45 || (e.method === 'surf' && player.mode !== 'surf')) {
          tweens.tween(0.4, (t) => e.view.offset.scale.setScalar(Math.max(0.01, 1 - t))).then(() => e.view.dispose());
          this.entities.splice(i, 1);
          continue;
        }
      }
      if (dist > 70) { g.visible = false; continue; }
      g.visible = true;
      const repelled = opts.repel && opts.leadLevel > e.level;
      if (dist < 7 && !e.noticed) {
        e.noticed = true;
        e.state = e.temper === 'curious' && !repelled ? 'chase' : e.temper === 'shy' || repelled ? 'flee' : 'watch';
        e.timer = e.state === 'chase' ? rand(3, 5) : rand(1.5, 2.5);
        if (e.state === 'chase') e.view.play('happy');
      }
      if (dist > 11) e.noticed = false;
      const zr = e.zone.rect;
      const moveTo = (tx, tz, speed) => {
        const mx = tx - g.position.x, mz = tz - g.position.z, d = Math.hypot(mx, mz);
        if (d < 0.05) return true;
        const nx = g.position.x + (mx / d) * speed * dt, nz = g.position.z + (mz / d) * speed * dt;
        const okWater = e.method === 'surf' ? this.map.isWaterAt(nx, nz) : !this.map.isWaterAt(nx, nz);
        if (okWater && (e.method !== 'grass' || (Math.abs(nx - zr[0]) < zr[2] / 2 + 1.5 && Math.abs(nz - zr[1]) < zr[3] / 2 + 1.5))) {
          g.position.x = nx; g.position.z = nz;
        }
        g.rotation.y = dampAngle(g.rotation.y, Math.atan2(mx, mz), 7, dt);
        return d < 0.3;
      };
      switch (e.state) {
        case 'idle':
          e.timer -= dt;
          if (e.timer <= 0) {
            e.target.set(zr[0] + rand(-zr[2] / 2 + 0.6, zr[2] / 2 - 0.6), 0, zr[1] + rand(-zr[3] / 2 + 0.6, zr[3] / 2 - 0.6));
            e.state = 'walk';
            e.view.play('walk', { timeScale: 0.8 + e.speed * 0.25 });
          }
          break;
        case 'walk':
          if (moveTo(e.target.x, e.target.z, e.speed)) { e.state = 'idle'; e.timer = rand(1.5, 4.5); e.view.play('idle'); }
          break;
        case 'watch':
          g.rotation.y = dampAngle(g.rotation.y, Math.atan2(dx, dz), 5, dt);
          e.timer -= dt;
          if (e.timer <= 0) { e.state = 'idle'; e.timer = rand(0.5, 2); }
          break;
        case 'chase':
          e.view.play('run');
          moveTo(P.x, P.z, e.speed * 1.9);
          e.timer -= dt;
          if (e.timer <= 0) { e.state = 'idle'; e.timer = rand(2, 4); e.view.play('idle'); }
          break;
        case 'flee': {
          e.view.play('run');
          moveTo(g.position.x - dx, g.position.z - dz, e.speed * 1.6);
          e.timer -= dt;
          if (e.timer <= 0) { e.state = 'idle'; e.timer = rand(2, 4); e.view.play('idle'); }
          break;
        }
        default: break;
      }
      g.position.y = e.method === 'surf' ? this.map.waterY - 0.25 + Math.sin(this.t * 2 + i) * 0.06 : this.map.heightAt(g.position.x, g.position.z);
      e.view.update(dt);
      if (e.shiny && Math.random() < dt * 2.5) this.sparkle(e.view.center(), 'lumiere');
      if (opts.canEncounter && !hit && !repelled && dist < 0.8 + e.sp.height * 0.45 * (e.view.group.scale.x || 1)) hit = e;
    }
    return hit;
  }
}
