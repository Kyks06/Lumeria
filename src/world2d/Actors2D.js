import * as THREE from 'three';
import { characterSheet, extraSheet, surfMount, FW, FH } from '../pixel/characters.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { TYPES } from '../config/types.js';
import { F, DIRS, dirFromRot, rotFromDir, dirFromDelta } from './tiles.js';

export const PLAYER_LOOKS = {
  garcon: { gender: 'm', skin: '#f1c9a5', hair: '#2d1e17', hairStyle: 'spiky', top: '#ff7a3d', bottom: '#2b3352', accent: '#ffd23f', hat: 'cap', hatColor: '#ff5a3d', backpack: true, packColor: '#ffd23f', shoes: '#e8e4dc' },
  fille: { gender: 'f', skin: '#f3d0b0', hair: '#6a3a22', hairStyle: 'ponytail', top: '#3a9adf', bottom: '#2a2a3a', accent: '#ffe48a', hat: 'beret', hatColor: '#ff5c8a', backpack: true, packColor: '#ff7aa2', shoes: '#ffffff' },
};

/** Vitesses en tuiles par seconde (une tuile = 16 px, comme sur GBA). */
export const SPEED = { walk: 3.75, run: 7.2, bike: 10.5, surf: 6.2, surfRun: 7.6, slide: 9, npc: 3.4, npcFast: 6.4 };

const sheets = new Map();
function sheetsFor(look) {
  const k = JSON.stringify(look || {});
  let s = sheets.get(k);
  if (!s) { s = { walk: characterSheet(look).toCanvas(), extra: null, look }; sheets.set(k, s); }
  return s;
}
function extraFor(S) { if (!S.extra) S.extra = extraSheet(S.look).toCanvas(); return S.extra; }
const mounts = new Map();
function mountFor(color, f) { const k = `${color}:${f}`; if (!mounts.has(k)) mounts.set(k, surfMount(color, f)); return mounts.get(k); }

/**
 * PERSONNAGE SUR LA GRILLE : position continue (mètres) qui va d'un centre de tuile à l'autre,
 * direction (0 bas, 1 gauche, 2 droite, 3 haut), cycle de marche à 4 temps comme sur GBA.
 * L'interface (position, rotY, group.visible, animator.play) reste celle des anciens acteurs 3D.
 */
class Actor2D {
  constructor() {
    this.position = new THREE.Vector3();
    this.group = { visible: true, position: this.position, rotation: { y: 0 }, parent: null, scale: { x: 1 } };
    this.dir = 0;
    this.move = null;
    this.parity = 0;
    this.animT = Math.random() * 3;
    this.anim = 'idle';
    this.hop = 0;            // saut en pixels (émotions, sauts de rebord)
    this.lift = 0;           // élévation imposée (escalade, scènes)
    this.speed = 0;
    this.animator = { play: (n) => { this.playAnim(n); return { impact: Promise.resolve(), done: Promise.resolve() }; }, update() {}, setTimeScale() {} };
  }

  get rotY() { return rotFromDir(this.dir); }
  set rotY(v) { this.dir = dirFromRot(v); }
  get moving() { return !!this.move; }

  tile(map = this.map) { return map.tileOf(this.position.x, this.position.z); }
  /** Tuile de destination (pendant un pas) ou tuile actuelle. */
  targetTile(map = this.map) { return this.move ? [this.move.tc, this.move.tr] : this.tile(map); }

  playAnim(name) {
    this.anim = name;
    if (name === 'happy' || name === 'attack') this.hopT = 0.5;
  }

  snap(map = this.map) {
    const [c, r] = map.tileOf(this.position.x, this.position.z);
    const p = map.center(c, r);
    this.position.x = p.x; this.position.z = p.z;
  }

  /** Lance un pas vers la tuile voisine (sans vérification). */
  startStep(dir, speed, map = this.map) {
    const [c, r] = this.tile(map);
    const [dc, dr] = DIRS[dir];
    const to = map.center(c + dc, r + dr);
    this.dir = dir;
    this.move = { fx: this.position.x, fz: this.position.z, tx: to.x, tz: to.z, tc: c + dc, tr: r + dr, t: 0, speed };
    this.parity ^= 1;
    this.speed = speed * map.T;
  }

  /** Avance le pas en cours ; renvoie true à l'arrivée. */
  advance(dt) {
    const m = this.move;
    if (!m) return false;
    m.t += dt * m.speed;
    const t = Math.min(1, m.t);
    this.position.x = m.fx + (m.tx - m.fx) * t;
    this.position.z = m.fz + (m.tz - m.fz) * t;
    if (m.t >= 1) {
      this.leftover = (m.t - 1) / m.speed;
      this.move = null;
      this.speed = 0;
      return true;
    }
    return false;
  }

  /** Image de la feuille de sprites : colonne (0 debout, 1 pas G, 2 pas D). */
  walkFrame() {
    if (this.move) return this.move.t < 0.5 ? 1 + this.parity : 0;
    if (this.bumpT > 0) return Math.floor(this.animT * 4) % 2 ? 1 + this.parity : 0;
    return 0;
  }

  update(dt) {
    this.animT += dt;
    if (this.hopT > 0) { this.hopT -= dt; this.hop = Math.round(Math.sin((1 - this.hopT / 0.5) * Math.PI) * 4); } else this.hop = 0;
  }
}

/* ═════════════════════════════════════════ JOUEUR ═════════ */
export class Player2D extends Actor2D {
  constructor(lookId = 'garcon') {
    super();
    this.mode = 'walk';
    this.turnT = 0;
    this.bumpT = 0;
    this.stepEvent = null;
    this.mountColor = '#3ba7ff';
    this.slideDir = null;
    this.setLook(lookId);
    this.height = 1.6;
  }

  setLook(lookId) {
    this.lookId = lookId;
    this.look = PLAYER_LOOKS[lookId] || PLAYER_LOOKS.garcon;
    this.sheets = sheetsFor(this.look);
  }

  place(x, z, rot, map) {
    this.map = map;
    this.position.set(x, 0, z);
    this.snap(map);
    if (rot !== undefined) this.rotY = rot;
    this.move = null;
    this.speed = 0;
    this.slideDir = null;
  }

  setMode(mode, opts = {}) {
    this.mode = mode;
    if (mode === 'surf') {
      const sp = opts.species ? CREATURE_MAP[opts.species] : null;
      this.mountColor = sp?.look?.body || TYPES.eau.color;
      this.mountSpecies = sp?.id || null;
    }
  }

  speedFor(run) {
    if (this.mode === 'bike') return SPEED.bike;
    if (this.mode === 'surf') return run ? SPEED.surfRun : SPEED.surf;
    return run ? SPEED.run : SPEED.walk;
  }

  /** Peut-on avancer vers (c, r) ? (eau, murs, PNJ, rochers à pousser…) */
  canEnter(map, c, r, dir) {
    return map.canEnter(this, c, r, dir);
  }

  /**
   * @param ctx { input, map, control, autoRun, onStep(dist), onBump() }
   */
  update(dt, ctx) {
    super.update(dt);
    const { map } = ctx;
    this.map = map;
    if (this.mode === 'cine' || this.mode === 'climb') return;
    this.bumpT = Math.max(0, this.bumpT - dt);
    if (this.move) {
      if (this.advance(dt)) this.arrive(ctx);
      return;
    }
    if (ctx.control) this.readInput(dt, ctx);
  }

  arrive(ctx) {
    const map = ctx.map;
    const [c, r] = this.tile(map);
    ctx.onStep?.(map.T);
    this.stepEvent = { c, r, tall: map.flags.has(c, r, F.TALL) };
    if (this.stepEvent.tall) { map.rustle?.(c, r); this.stepFx = true; }
    map.onArrive?.(this, c, r);
    // glissade (glace) ou tapis roulant
    const forced = map.forcedDir?.(this, c, r);
    if (forced !== null && forced !== undefined) {
      const [dc, dr] = DIRS[forced];
      if (map.canEnter(this, c + dc, r + dr, forced, true)) { this.startStep(forced, SPEED.slide, map); this.sliding = true; this.slideDir = { x: dc, z: dr }; return; }
    }
    this.sliding = false;
    this.slideDir = null;
    if (ctx.control) this.readInput(this.leftover || 0, ctx, true);
  }

  readInput(dt, ctx, chained = false) {
    const map = ctx.map;
    const d = ctx.input.getDir();
    if (d < 0) { this.turnT = 0; this.wasHeld = false; return; }
    // une pression brève change seulement la direction (comme sur GBA)
    if (!chained && d !== this.dir && !this.wasHeld) { this.dir = d; this.turnT = 0.1; this.wasHeld = true; return; }
    if (this.turnT > 0) { this.turnT -= dt; if (this.turnT > 0) return; }
    this.wasHeld = true;
    this.dir = d;
    const [c, r] = this.tile(map);
    const [dc, dr] = DIRS[d];
    if (map.canEnter(this, c + dc, r + dr, d)) {
      const run = ctx.input.isRunning() !== !!ctx.autoRun;
      this.startStep(d, this.speedFor(run), map);
      if (dt > 0) this.advance(dt);
    } else {
      if (this.bumpT <= 0) ctx.onBump?.(c + dc, r + dr);
      this.bumpT = 0.25;
      map.onBump?.(this, c + dc, r + dr, d);
    }
  }

  /** Pas imposé (script) : renvoie une promesse résolue à l'arrivée. */
  forceStep(dir, speed = SPEED.walk) {
    return new Promise((res) => {
      this.startStep(dir, speed, this.map);
      const tick = () => {
        if (!this.move) { res(); return; }
        requestAnimationFrame(tick);
      };
      this.forced = true;
      tick();
    });
  }

  idle(dt) {
    // un pas commencé se termine toujours (on ne reste pas entre deux tuiles)
    super.update(dt);
    if (this.move && this.advance(dt)) {
      const [c, r] = this.tile(this.map);
      this.stepEvent = null;
      this.map?.onArrive?.(this, c, r);
    }
    this.bumpT = 0;
  }

  /** Informations de dessin : feuille, case, décalages. */
  frameInfo() {
    let sheet = this.sheets.walk, col = this.walkFrame(), row = this.dir, dy = 0;
    if (this.mode === 'bike') { sheet = extraFor(this.sheets); col = this.move ? (this.move.t < 0.5 ? 0 : 1) : 0; }
    else if (this.mode === 'surf') { sheet = extraFor(this.sheets); col = 2; dy = Math.round(Math.sin(this.animT * 4)); }
    else if (this.anim === 'fish') { sheet = extraFor(this.sheets); col = 3; }
    return { sheet, sx: col * FW, sy: row * FH, w: FW, h: FH, dy: dy - this.hop - this.lift };
  }

  mountSprite() {
    if (this.mode !== 'surf') return null;
    return mountFor(this.mountColor, Math.floor(this.animT * 3) % 2);
  }
}

/* ═════════════════════════════════════════ PNJ ═════════ */
let idSeq = 0;
export class NPC2D extends Actor2D {
  constructor(def, map, ctx = {}) {
    super();
    this.def = def;
    this.id = def.id || `npc${++idSeq}`;
    this.name = def.name || '';
    this.map = map;
    this.ctx = ctx;
    this.creature = def.creature ? CREATURE_MAP[def.creature] : null;
    this.height = this.creature ? Math.max(0.6, this.creature.height) : 1.7;
    if (!this.creature) this.sheets = sheetsFor(def.look || {});
    this.position.set(def.x, 0, def.z);
    this.snap(map);
    this.home = this.position.clone();
    this.baseDir = dirFromRot(def.rot ?? 0);
    this.dir = this.baseDir;
    this.talkTimer = 0;
    this.wanderT = 1 + Math.random() * 4;
    this.spinT = 2 + Math.random() * 3;
    this.path = null;
    this.collider = { enabled: true };
    this.view = this.creature ? { updateGlow() {}, dispose() {} } : null;
  }

  faceTowards(x, z, hold = 6) {
    const dx = x - this.position.x, dz = z - this.position.z;
    if (Math.abs(dx) < 0.01 && Math.abs(dz) < 0.01) return;
    this.dir = dirFromDelta(dx, dz);
    this.talkTimer = hold;
  }

  /** Portée de vue en tuiles. */
  sightTiles() {
    const s = this.def.sight ?? 5;
    return Math.max(2, Math.min(6, Math.round((s * 1.6) / this.map.T)));
  }

  /** Le dresseur voit-il le joueur ? (même ligne, devant lui, rien entre les deux) */
  sees(px, pz) {
    if ((this.def.sight ?? 5) <= 0 || this.move) return false;
    const map = this.map;
    const [c, r] = this.tile();
    const [pc, pr] = map.tileOf(px, pz);
    const [dc, dr] = DIRS[this.dir];
    const n = this.sightTiles();
    for (let k = 1; k <= n; k++) {
      const cc = c + dc * k, rr = r + dr * k;
      if (cc === pc && rr === pr) return true;
      if (map.solidForSight(cc, rr, this)) return false;
    }
    return false;
  }

  /** Marche jusqu'à (x, z) en suivant les tuiles ; résout à l'arrivée. */
  walkTo(x, z) {
    const map = this.map;
    const [tc, tr] = map.tileOf(x, z);
    const [c, r] = this.tile();
    this.path = map.findPath(c, r, tc, tr, this) || manhattan(c, r, tc, tr);
    this.target = { x, z };
    return new Promise((res) => { this.onArrive = res; if (!this.path.length) this.finishPath(); });
  }

  finishPath() {
    this.path = null;
    this.target = null;
    const cb = this.onArrive; this.onArrive = null; cb?.();
  }

  playAnim(name) {
    super.playAnim(name);
  }

  update(dt) {
    super.update(dt);
    const map = this.map;
    if (this.move) { this.advance(dt); return; }
    if (this.path) {
      if (!this.path.length) { this.finishPath(); return; }
      const [nc, nr] = this.path[0];
      const [c, r] = this.tile();
      const d = dirFromDelta(nc - c, nr - r);
      if (nc === c && nr === r) { this.path.shift(); return; }
      if (Math.abs(nc - c) + Math.abs(nr - r) !== 1) { this.path = manhattan(c, r, nc, nr).concat(this.path.slice(1)); return; }
      // un personnage bloque le chemin : on attend un peu puis on passe quand même (scène)
      if (map.actorAt(nc, nr, this) && (this.waitT = (this.waitT || 0) + dt) < 0.8) { this.dir = d; return; }
      this.waitT = 0;
      this.path.shift();
      this.startStep(d, this.def.trainer || this.runFast ? SPEED.npcFast : SPEED.npc, map);
      return;
    }
    if (this.talkTimer > 0) {
      this.talkTimer -= dt;
      if (this.talkTimer <= 0) this.dir = this.baseDir;
      return;
    }
    if (this.busy) return;
    if (this.def.wander) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 1.6 + Math.random() * 3.5;
        const d = Math.floor(Math.random() * 4);
        const [c, r] = this.tile();
        const [dc, dr] = DIRS[d];
        const hp = map.center(c + dc, r + dr);
        const far = Math.hypot(hp.x - this.home.x, hp.z - this.home.z) > Math.max(map.T, this.def.wander);
        this.dir = d;
        if (!far && map.canEnter(this, c + dc, r + dr, d)) this.startStep(d, SPEED.npc * 0.8, map);
      }
    } else if (this.def.spin) {
      this.spinT -= dt;
      if (this.spinT <= 0) { this.spinT = 1.5 + Math.random() * 3; this.baseDir = this.dir = Math.floor(Math.random() * 4); }
    }
  }

  frameInfo() {
    if (this.creature) {
      const set = this.ctx.baker?.creature(this.creature.id, `ow${this.dir}`, !!this.def.shiny);
      const s = set?.frames ? set.frames[Math.floor(this.animT / 0.26) % set.frames.length] : set;
      return { sprite: s, dy: -this.hop - Math.round((this.def.yOff || 0) * this.map.ppm * 0.9) - (['float', 'bird', 'star'].includes(this.creature.look?.plan) ? 3 + Math.round(Math.sin(this.animT * 3) * 1.5) : Math.abs(Math.round(Math.sin(this.animT * 2.2))) ) };
    }
    return { sheet: this.sheets.walk, sx: this.walkFrame() * FW, sy: this.dir * FH, w: FW, h: FH, dy: -this.hop };
  }
}

/** Chemin en L (d'abord horizontal) quand aucun chemin n'est trouvé. */
function manhattan(c, r, tc, tr) {
  const out = [];
  if (![c, r, tc, tr].every(Number.isFinite)) return out; // cible invalide : pas de chemin
  let x = c, y = r;
  while (x !== tc) { x += Math.sign(tc - x); out.push([x, y]); }
  while (y !== tr) { y += Math.sign(tr - y); out.push([x, y]); }
  return out;
}

export { FW, FH };
