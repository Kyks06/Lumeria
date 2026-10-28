import * as THREE from 'three';
import { GameMap } from './GameMap.js';
import { NPC } from './Actors.js';
import { PROPS } from '../render/Props.js';
import { FURN } from '../render/Furniture.js';
import { VEG } from '../render/Vegetation.js';
import { stdMat } from '../render/Materials.js';
import { surfaceTexture } from '../render/Textures.js';
import { mergeStatic } from '../render/Optimize.js';
import { ITEMS } from '../config/items.js';
import { TYPES } from '../config/types.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';
import { tweens, Ease, clamp } from '../core/utils.js';

/**
 * CARTES EN GRILLE : arènes à énigmes et donjons intérieurs (entrepôt, centrale, repaire, temple, Ligue).
 * La disposition est écrite en ASCII (une ligne = une rangée, nord en haut) :
 *   #  mur            =  muret / comptoir       .  sol          ,  tapis / sol décoré
 *   I  glace (glissade)                      ^ v < >  tapis roulant (pousse le joueur)
 *   O  rocher (Force) H  trou (comblé par un rocher)
 *   a b c d  interrupteurs → A B C D  barrières correspondantes (fermées au départ)
 *   1-9 téléporteurs (par paires)   ~  eau   L  lave   P  pilier   C  caisses   M  machine   T  arbre/haie
 *   E  tapis de sortie (warp « exit »)   S  escalier (voir warps)   _  vide (rien)
 */
export const GRID_THEMES = {
  insecte:  { floor: 'planks', floorColor: '#b89a6a', wall: 'hedge', wallColor: '#3f7d34', accent: TYPES.insecte.color, light: '#fff0d0', bg: '#1a2a12' },
  eau:      { floor: 'tiles', floorColor: '#d8eef8', wall: 'panel', wallColor: '#6ab0e0', accent: TYPES.eau.color, light: '#e0f4ff', bg: '#0a1a2a', pool: true },
  roche:    { floor: 'stone', floorColor: '#a89a84', wall: 'rock', wallColor: '#7a6a58', accent: TYPES.roche.color, light: '#ffe8c8', bg: '#1a1410' },
  foudre:   { floor: 'metal', floorColor: '#c8ccd4', wall: 'panel', wallColor: '#4a4a5a', accent: TYPES.foudre.color, light: '#fff8c8', bg: '#10101a' },
  ombre:    { floor: 'tiles', floorColor: '#4a405a', wall: 'stone', wallColor: '#2a2236', accent: TYPES.ombre.color, light: '#c8a8ff', bg: '#050308', dark: true },
  glace:    { floor: 'tiles', floorColor: '#e8f4ff', wall: 'ice', wallColor: '#a8d8f0', accent: TYPES.glace.color, light: '#e8f8ff', bg: '#0a1420' },
  feu:      { floor: 'stone', floorColor: '#6a5048', wall: 'stone', wallColor: '#4a3a34', accent: TYPES.feu.color, light: '#ffc890', bg: '#1a0a06' },
  psy:      { floor: 'tiles', floorColor: '#d0d4f4', wall: 'panel', wallColor: '#5a5ac8', accent: TYPES.astral.color, light: '#ffe8ff', bg: '#140a1a' },
  entrepot: { floor: 'tiles', floorColor: '#9a9a96', wall: 'metal', wallColor: '#7a8088', accent: '#ffb02e', light: '#fff0d8', bg: '#121212' },
  centrale: { floor: 'metal', floorColor: '#b8bcc4', wall: 'panel', wallColor: '#5a6070', accent: '#ffd23f', light: '#f0f8ff', bg: '#0a0c10' },
  repaire:  { floor: 'tiles', floorColor: '#3a3048', wall: 'metal', wallColor: '#2a2236', accent: '#c58bff', light: '#d8b8ff', bg: '#06040a' },
  temple:   { floor: 'stone', floorColor: '#d8d0c0', wall: 'stone', wallColor: '#b8ac98', accent: '#ffd23f', light: '#fff4dc', bg: '#141008' },
  ligue:    { floor: 'tiles', floorColor: '#e8e4f0', wall: 'stone', wallColor: '#c8c0d8', accent: '#ffd23f', light: '#ffffff', bg: '#0a0a14' },
  tour:     { floor: 'tiles', floorColor: '#d0d8e8', wall: 'panel', wallColor: '#3a4a7a', accent: '#5fd4ff', light: '#f0f8ff', bg: '#080a14' },
  musee:    { floor: 'planks', floorColor: '#c8a070', wall: 'wallpaper', wallColor: '#e8dcc8', accent: '#c8553d', light: '#fff0d8', bg: '#140e08' },
};

const DIRS = { '^': [0, -1], v: [0, 1], '<': [-1, 0], '>': [1, 0] };
const SOLID = new Set(['#', '=', 'P', 'C', 'M', 'T', '~', 'L', '_']);

class GridLogic {
  constructor(map, def, theme) {
    this.map = map;
    this.def = def;
    this.theme = theme;
    this.cell = def.cell || 2;
    this.rows = def.layout.map((r) => r.split(''));
    this.R = this.rows.length;
    this.C = Math.max(...this.rows.map((r) => r.length));
    this.ox = -(this.C * this.cell) / 2;
    this.oz = -(this.R * this.cell) / 2;
    this.gates = {};         // lettre → { open, cells, meshes, colliders }
    this.boulders = [];      // { c, r, obj }
    this.holes = new Set();
    this.teleports = {};     // chiffre → [[c,r],[c,r]]
    this.lastCell = null;
    this.tpGuard = null;
    this.pushT = 0;
    this.pushDir = null;
    this.player = null;
  }

  at(c, r) { return this.rows[r]?.[c] ?? '_'; }
  set(c, r, ch) { if (this.rows[r]) this.rows[r][c] = ch; }
  center(c, r) { return { x: this.ox + (c + 0.5) * this.cell, z: this.oz + (r + 0.5) * this.cell }; }
  cellOf(x, z) { return [Math.floor((x - this.ox) / this.cell), Math.floor((z - this.oz) / this.cell)]; }
  heightAt() { return 0; }

  boulderAt(c, r) { return this.boulders.find((b) => b.c === c && b.r === r); }

  blocked(c, r) {
    const ch = this.at(c, r);
    if (SOLID.has(ch) || ch === undefined) return true;
    if (ch === 'H') return true;
    if (/[ABDG]/.test(ch) && !this.gates[ch]?.open) return true;
    if (this.boulderAt(c, r)) return true;
    return false;
  }

  isIce(x, z) {
    const [c, r] = this.cellOf(x, z);
    const ch = this.at(c, r);
    return ch === 'I' || !!DIRS[ch];
  }

  snap(p, perpendicular) {
    const [c, r] = this.cellOf(p.x, p.z);
    const ctr = this.center(c, r);
    const d = this.player?.slideDir;
    if (perpendicular && d) {
      if (d.x) p.z = ctr.z; else p.x = ctr.x;
    } else { p.x = ctr.x; p.z = ctr.z; }
  }

  canWalk(x0, z0, x1, z1, player) {
    const rad = 0.34;
    const pts = [[x1 - rad, z1 - rad], [x1 + rad, z1 - rad], [x1 - rad, z1 + rad], [x1 + rad, z1 + rad]];
    const [c0, r0] = this.cellOf(x0, z0);
    for (const [px, pz] of pts) {
      const [c, r] = this.cellOf(px, pz);
      if (c === c0 && r === r0) continue;
      if (this.blocked(c, r)) {
        if (player && this.boulderAt(c, r)) this.tryPush(c, r, c - c0, r - r0, player);
        return false;
      }
    }
    return true;
  }

  tryPush(c, r, dc, dr, player) {
    if (!dc && !dr) return;
    if (Math.abs(dc) + Math.abs(dr) !== 1) return;
    const ctx = this.map.ctx;
    if (!ctx.canUseStrength?.()) { this.pushHint = true; return; }
    if (!this.pushDir || this.pushDir[0] !== dc || this.pushDir[1] !== dr) { this.pushDir = [dc, dr]; this.pushT = 0; }
    this.pushT += 1 / 60;
    if (this.pushT < 0.3 || this.moving) return;
    const b = this.boulderAt(c, r);
    const nc = c + dc, nr = r + dr;
    const ch = this.at(nc, nr);
    const free = ch === 'H' || (!this.blocked(nc, nr) && !this.npcAt(nc, nr));
    if (!free) return;
    this.moving = true;
    this.pushT = 0;
    const from = this.center(c, r), to = this.center(nc, nr);
    b.c = nc; b.r = nr;
    ctx.sfx?.('push');
    tweens.tween(0.35, (t) => { b.obj.position.x = from.x + (to.x - from.x) * t; b.obj.position.z = from.z + (to.z - from.z) * t; b.obj.rotation.x += dr * 0.08; b.obj.rotation.z -= dc * 0.08; }, Ease.inOutCubic).then(() => {
      this.moving = false;
      if (ch === 'H') {
        this.set(nc, nr, '.');
        this.holes.delete(`${nc},${nr}`);
        this.boulders.splice(this.boulders.indexOf(b), 1);
        tweens.tween(0.3, (t) => { b.obj.position.y = -t * 1.6; }).then(() => { b.obj.parent?.remove(b.obj); this.holeMeshes?.[`${nc},${nr}`]?.parent?.remove(this.holeMeshes[`${nc},${nr}`]); });
        ctx.sfx?.('thud');
        ctx.engine?.addShake(0.12);
      }
    });
  }

  npcAt(c, r) {
    for (const n of this.map.npcs) {
      const [nc, nr] = this.cellOf(n.position.x, n.position.z);
      if (nc === c && nr === r && n.group.visible) return n;
    }
    return null;
  }

  toggleGate(letter) {
    const G = this.gates[letter.toUpperCase()];
    if (!G) return;
    G.open = !G.open;
    for (const m of G.meshes) tweens.tween(0.4, (t) => { m.position.y = G.open ? -t * 1.4 : -1.4 + t * 1.4; }, Ease.inOutCubic);
    for (const col of G.colliders) col.enabled = !G.open;
    for (const s of this.switchMeshes[letter.toLowerCase()] || []) s.material = G.open ? this.switchOn : this.switchOff;
  }

  update(dt, ctx) {
    const p = this.player;
    if (!p) return;
    const pos = p.position;
    const [c, r] = this.cellOf(pos.x, pos.z);
    const key = `${c},${r}`;
    const ch = this.at(c, r);
    // tapis roulants
    if (DIRS[ch] && p.mode === 'walk') {
      const [dx, dz] = DIRS[ch];
      if (!p.slideDir || p.slideDir.x !== dx || p.slideDir.z !== dz) {
        const ctr = this.center(c, r);
        const off = dx ? Math.abs(pos.z - ctr.z) : Math.abs(pos.x - ctr.x);
        if (off < 0.6 || p.slideDir) {
          p.slideDir = new THREE.Vector3(dx, 0, dz);
          if (dx) pos.z = ctr.z; else pos.x = ctr.x;
        }
      }
    }
    const game = this.map.ctx; // le jeu (sons, téléportation, état occupé)
    if (game.busy || game.state !== 'explore') {
      // aucun déclencheur pendant un événement (téléportation en cours, dialogue, combat…)
    } else if (key !== this.lastCell) {
      const prev = this.lastCell;
      this.lastCell = key;
      if (prev === null) { this.tpGuard = key; return; }
      if (/[abdg]/.test(ch)) { this.toggleGate(ch); game.sfx?.('switch'); }
      if (/[1-9]/.test(ch) && this.tpGuard !== key) {
        const pair = this.teleports[ch];
        const other = pair?.find(([cc, rr]) => cc !== c || rr !== r);
        if (other) {
          const dst = this.center(other[0], other[1]);
          this.tpGuard = `${other[0]},${other[1]}`;
          this.lastCell = this.tpGuard;
          p.slideDir = null;
          if (game.teleportFx) game.teleportFx(pos, dst);
          else { pos.x = dst.x; pos.z = dst.z; }
        }
      } else if (this.tpGuard && key !== this.tpGuard) this.tpGuard = null;
    }
    if (!this.moving) this.pushT = Math.max(0, this.pushT - dt * 0.5);
    // animation des téléporteurs
    if (this.tpMat) this.tpMat.emissiveIntensity = 1.6 + Math.sin(performance.now() * 0.004) * 0.8;
  }
}

function wallMaterial(theme) {
  switch (theme.wall) {
    case 'hedge': return stdMat(theme.wallColor, { roughness: 0.9, flatShading: true });
    case 'rock': return new THREE.MeshStandardMaterial({ map: surfaceTexture('stone'), color: theme.wallColor, roughness: 0.95 });
    case 'ice': return new THREE.MeshPhysicalMaterial({ color: theme.wallColor, roughness: 0.1, transmission: 0.2, thickness: 0.5, clearcoat: 1 });
    default: return new THREE.MeshStandardMaterial({ map: surfaceTexture(theme.wall), color: theme.wallColor, roughness: 0.75 });
  }
}

/** Construit une carte en grille. */
export async function buildGrid(def, g) {
  const theme = { ...GRID_THEMES[def.theme || 'temple'], ...(def.themeOverride || {}) };
  const map = new GameMap(def, 'grid', g);
  map.dark = !!(def.dark ?? theme.dark);
  map.theme = theme;
  const L = new GridLogic(map, def, theme);
  map.grid = L;
  const cell = L.cell;
  const W = L.C * cell, D = L.R * cell;
  map.bounds = [-W / 2, W / 2, -D / 2, D / 2];
  map.floorY = 0;
  const statics = new THREE.Group();
  map.group.add(statics);
  const keep = new Set();
  const ok = (o) => g.flagOk(o);

  // Sol
  const floorTex = surfaceTexture(theme.floor).clone();
  floorTex.needsUpdate = true;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 4, D / 4);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, color: theme.floorColor, roughness: 0.55, metalness: theme.floor === 'metal' ? 0.3 : 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  map.group.add(floor);
  // Fond (sol sombre autour)
  const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 120, D + 120), stdMat(theme.bg, { roughness: 1 }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.02;
  map.group.add(under);

  const wallMat = wallMaterial(theme);
  const trimMat = stdMat(theme.accent, { roughness: 0.4, emissive: theme.accent, emissiveIntensity: 0.25 });
  const lowMat = stdMat(theme.wallColor, { roughness: 0.6 });
  const wallH = def.wallH || (theme.wall === 'hedge' ? 2.2 : 3.2);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const tileGeo = new THREE.PlaneGeometry(cell * 0.94, cell * 0.94);
  tileGeo.rotateX(-Math.PI / 2);
  const iceMat = new THREE.MeshPhysicalMaterial({ color: '#cfefff', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 });
  const arrowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#2a2a3a'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = theme.accent;
    for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(64, 14 + i * 50); x.lineTo(110, 56 + i * 50); x.lineTo(86, 56 + i * 50); x.lineTo(64, 36 + i * 50); x.lineTo(42, 56 + i * 50); x.lineTo(18, 56 + i * 50); x.closePath(); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const arrowMat = new THREE.MeshStandardMaterial({ map: arrowTex, emissive: '#ffffff', emissiveMap: arrowTex, emissiveIntensity: 0.4, roughness: 0.5 });
  L.switchOff = new THREE.MeshStandardMaterial({ color: '#ff4f4f', emissive: '#ff2a2a', emissiveIntensity: 1.2 });
  L.switchOn = new THREE.MeshStandardMaterial({ color: '#7dff9c', emissive: '#3aff6a', emissiveIntensity: 1.4 });
  L.switchMeshes = {};
  L.tpMat = new THREE.MeshStandardMaterial({ color: '#c58bff', emissive: '#c58bff', emissiveIntensity: 2, transparent: true, opacity: 0.85 });
  L.holeMeshes = {};
  const waterMat = new THREE.MeshPhysicalMaterial({ color: '#3a9adf', roughness: 0.05, transparent: true, opacity: 0.8, clearcoat: 1 });
  const lavaMat = new THREE.MeshStandardMaterial({ color: '#ff5a10', emissive: '#ff3a00', emissiveIntensity: 2.2 });

  // Murs regroupés en segments horizontaux (collisions + ligne de vue)
  for (let r = 0; r < L.R; r++) {
    let c = 0;
    while (c < L.C) {
      if (L.at(c, r) !== '#') { c++; continue; }
      let e = c;
      while (e + 1 < L.C && L.at(e + 1, r) === '#') e++;
      const a = L.center(c, r), b = L.center(e, r);
      const cx = (a.x + b.x) / 2, len = (e - c + 1) * cell;
      if (theme.wall === 'hedge') {
        for (let k = c; k <= e; k++) {
          const p = L.center(k, r);
          const m = new THREE.Mesh(box, wallMat);
          m.position.set(p.x, wallH / 2, p.z); m.scale.set(cell, wallH, cell); m.castShadow = m.receiveShadow = true;
          statics.add(m);
          const top = new THREE.Mesh(new THREE.IcosahedronGeometry(cell * 0.62, 0), wallMat);
          top.position.set(p.x, wallH, p.z); top.castShadow = true;
          statics.add(top);
        }
      } else {
        const m = new THREE.Mesh(box, wallMat);
        m.position.set(cx, wallH / 2, a.z); m.scale.set(len, wallH, cell);
        m.castShadow = m.receiveShadow = true;
        statics.add(m);
        const t = new THREE.Mesh(box, trimMat);
        t.position.set(cx, wallH + 0.06, a.z); t.scale.set(len + 0.02, 0.12, cell + 0.02);
        statics.add(t);
      }
      map.colliders.addBox(cx, a.z, len, cell, { h: wallH + 4, tag: 'wall' });
      c = e + 1;
    }
  }

  const deco = (x, z, ch) => {
    const p = { x, z };
    switch (ch) {
      case '=': {
        const m = new THREE.Mesh(box, lowMat); m.position.set(p.x, 0.5, p.z); m.scale.set(cell, 1, cell * 0.8); m.castShadow = m.receiveShadow = true; statics.add(m);
        map.colliders.addBox(p.x, p.z, cell, cell, { h: 1, camera: false });
        break;
      }
      case 'P': {
        const pil = FURN.pillar(theme.wallColor); pil.position.set(p.x, 0, p.z); statics.add(pil);
        map.colliders.addCircle(p.x, p.z, cell * 0.42, { h: 6 });
        break;
      }
      case 'C': {
        const cr = FURN.crates(); cr.position.set(p.x, 0, p.z); cr.rotation.y = (x * 7 + z * 3) % 3; statics.add(cr);
        map.colliders.addBox(p.x, p.z, cell, cell, { h: 2.2, camera: true });
        break;
      }
      case 'M': {
        const mm = FURN.labmachine(); mm.position.set(p.x, 0, p.z); mm.scale.setScalar(1.3); statics.add(mm);
        map.colliders.addBox(p.x, p.z, cell, cell, { h: 2.5 });
        break;
      }
      case 'T': {
        const t = def.theme === 'insecte' ? VEG.oak(Math.abs(Math.round(x + z)) % 3) : VEG.bush(0);
        t.position.set(p.x, 0, p.z); t.scale.setScalar(def.theme === 'insecte' ? 0.75 : 1.2); statics.add(t);
        map.colliders.addCircle(p.x, p.z, cell * 0.48, { h: 6 });
        break;
      }
      case '~': {
        const m = new THREE.Mesh(tileGeo, waterMat); m.position.set(p.x, 0.03, p.z); m.scale.setScalar(1.07); statics.add(m);
        map.colliders.addBox(p.x, p.z, cell, cell, { h: 0.5, camera: false });
        break;
      }
      case 'L': {
        const m = new THREE.Mesh(tileGeo, lavaMat); m.position.set(p.x, 0.03, p.z); m.scale.setScalar(1.07); statics.add(m);
        map.colliders.addBox(p.x, p.z, cell, cell, { h: 0.5, camera: false });
        break;
      }
      case ',': {
        const m = new THREE.Mesh(tileGeo, stdMat(theme.accent, { roughness: 0.9 })); m.position.set(p.x, 0.012, p.z); m.receiveShadow = true; statics.add(m);
        break;
      }
      case 'I': {
        const m = new THREE.Mesh(tileGeo, iceMat); m.position.set(p.x, 0.015, p.z); m.scale.setScalar(1.06); m.receiveShadow = true; statics.add(m);
        break;
      }
      case 'E': {
        const m = new THREE.Mesh(tileGeo, stdMat('#c83a3a', { roughness: 0.9 })); m.position.set(p.x, 0.014, p.z); m.scale.set(0.9, 1, 0.6); statics.add(m);
        break;
      }
      default: break;
    }
  };

  for (let r = 0; r < L.R; r++) {
    for (let c = 0; c < L.C; c++) {
      const ch = L.at(c, r);
      const p = L.center(c, r);
      if (DIRS[ch]) {
        const m = new THREE.Mesh(tileGeo, arrowMat);
        m.position.set(p.x, 0.015, p.z);
        m.rotation.y = { '^': 0, v: Math.PI, '<': Math.PI / 2, '>': -Math.PI / 2 }[ch];
        statics.add(m);
      } else if (ch === 'O') {
        const b = PROPS.boulder();
        b.position.set(p.x, 0, p.z);
        b.scale.setScalar(cell / 2.1);
        map.group.add(b);
        L.boulders.push({ c, r, obj: b });
        L.set(c, r, '.');
      } else if (ch === 'H') {
        const m = new THREE.Mesh(new THREE.CircleGeometry(cell * 0.46, 24), stdMat('#050505', { roughness: 1 }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(p.x, 0.02, p.z);
        map.group.add(m);
        L.holeMeshes[`${c},${r}`] = m;
        L.holes.add(`${c},${r}`);
      } else if (/[abdg]/.test(ch)) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.3, cell * 0.34, 0.12, 24), L.switchOff);
        m.position.set(p.x, 0.06, p.z);
        map.group.add(m);
        (L.switchMeshes[ch] ||= []).push(m);
      } else if (/[ABDG]/.test(ch)) {
        const G = (L.gates[ch] ||= { open: false, cells: [], meshes: [], colliders: [] });
        G.cells.push([c, r]);
        const gm = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: '#ff5a5a', emissive: '#ff3030', emissiveIntensity: 1.6, transparent: true, opacity: 0.75 }));
        gm.position.set(p.x, 0, p.z);
        gm.scale.set(cell * 0.96, 2.6, cell * 0.25);
        const holder = new THREE.Group();
        holder.add(gm);
        gm.position.set(0, 1.3, 0);
        holder.position.set(p.x, 0, p.z);
        if (L.at(c - 1, r) === '#' || L.at(c + 1, r) === '#') holder.rotation.y = 0; else holder.rotation.y = Math.PI / 2;
        map.group.add(holder);
        G.meshes.push(holder);
        G.colliders.push(map.colliders.addBox(p.x, p.z, cell, cell, { h: 3, camera: false, tag: 'gate' }));
      } else if (/[1-9]/.test(ch)) {
        (L.teleports[ch] ||= []).push([c, r]);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(cell * 0.4, cell * 0.44, 0.1, 24), L.tpMat);
        m.position.set(p.x, 0.05, p.z);
        map.group.add(m);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(cell * 0.42, 0.04, 8, 32), L.tpMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(p.x, 0.6, p.z);
        map.group.add(ring);
        map.spinners.push({ obj: ring, speed: 0, bob: 0.25, baseY: 0.6, phase: c + r });
      } else deco(p.x, p.z, ch);
    }
  }

  // Décor spécifique au thème
  if (theme.pool) {
    for (const [x, z] of [[-W / 2 + 1.2, 0], [W / 2 - 1.2, 0]]) {
      const pl = FURN.plant(); pl.position.set(x, 0, z); statics.add(pl);
    }
  }

  // Lumières
  const lamps = def.lamps || [[0, 0]];
  for (const [lx, lz] of lamps) {
    const l = new THREE.PointLight(theme.light, map.dark ? 0 : 28, 30, 1.4);
    l.position.set(lx, 5, lz);
    map.group.add(l);
    map.lights.push(l);
  }

  const cellPos = (o) => (o.cell ? L.center(o.cell[0], o.cell[1]) : { x: o.x, z: o.z });

  // Mobilier libre (meubles, statues)
  for (const f of (def.furniture || []).filter(ok)) {
    const make = FURN[f.t] || PROPS[f.t];
    if (!make) continue;
    const obj = make(...(f.args || []));
    const p = cellPos(f);
    obj.position.set(p.x, f.y || 0, p.z);
    obj.rotation.y = f.rot || 0;
    if (f.scale) obj.scale.setScalar(f.scale);
    statics.add(obj);
    if (obj.userData.spinner) { keep.add(obj.userData.spinner); map.spinners.push({ obj: obj.userData.spinner, speed: 1 }); }
    const sz = obj.userData.size;
    if (f.solid !== false && sz && sz[0] > 0) map.colliders.addBox(p.x, p.z, sz[0] * (f.scale || 1), sz[1] * (f.scale || 1), { rot: f.rot || 0, h: 2, camera: false });
    else if (f.solid !== false && f.r) map.colliders.addCircle(p.x, p.z, f.r, { camera: false });
    if (f.talk || f.script || f.action) map.addInteractable({ type: 'prop', pos: new THREE.Vector3(p.x, 0, p.z), def: f, name: f.name || '', radius: f.radius || 2.2 });
  }

  // Objets
  (def.items || []).forEach((it, i) => {
    if (!ok(it)) return;
    const key = `${def.id}:it${i}`;
    if (g.data.picked?.[key]) return;
    const p = cellPos(it);
    let obj = null;
    if (!it.hidden) {
      const color = ITEMS[it.item]?.pocket === 'dt' ? '#9ab8ff' : '#ff6fa8';
      obj = PROPS.pickup(color);
      obj.position.set(p.x, 0, p.z);
      map.group.add(obj);
      map.spinners.push({ obj: obj.userData.spinner, speed: 1.6, bob: 0.08, baseY: obj.userData.spinner.position.y });
    }
    map.addInteractable({ type: 'item', pos: new THREE.Vector3(p.x, 0, p.z), item: it.item, qty: it.qty || 1, key, obj, hidden: !!it.hidden, radius: 1.9 });
  });

  // PNJ, dresseurs, Champion
  for (const n of def.npcs || []) {
    const p = cellPos(n);
    const look = n.look || (n.cls ? trainerLook(n.cls, n.id) : npcLook(n.kind || 'homme', n.id, n.lookExtra));
    const npc = new NPC({ ...n, x: p.x, z: p.z, look }, g.assets, map);
    map.group.add(npc.group);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'npc', npc, pos: npc.position, name: n.name || '', radius: n.radius });
  }
  for (const t of def.trainers || []) {
    const p = cellPos(t);
    const look = t.look || trainerLook(t.cls, t.id, t.lookExtra);
    const npc = new NPC({ ...t, x: p.x, z: p.z, look, trainer: true, sight: t.sight ?? 4 }, g.assets, map);
    npc.trainer = t;
    map.group.add(npc.group);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'trainer', npc, pos: npc.position, name: t.name || '', trainer: t });
  }

  // Sorties / escaliers / entrées
  for (const w of def.warps || []) {
    const p = cellPos(w);
    map.warps.push({ ...w, x: p.x, z: p.z, r: w.r || 0.8 });
    if (w.stairs) {
      const st = FURN.stairs(w.stairs === 'up');
      st.position.set(p.x, 0, p.z);
      st.rotation.y = w.rot || 0;
      statics.add(st);
    }
  }
  for (let r = 0; r < L.R; r++) for (let c = 0; c < L.C; c++) if (L.at(c, r) === 'E' && def.exit) {
    const p = L.center(c, r);
    map.warps.push({ x: p.x, z: p.z + 0.4, r: 0.8, to: def.exit.to, entry: def.exit.entry });
    map.entries.door ||= { x: p.x, z: p.z - cell * 0.9, rot: Math.PI };
  }
  for (const [name, e] of Object.entries(def.entries || {})) {
    const p = L.center(e[0], e[1]);
    map.entries[name] = { x: p.x, z: p.z, rot: e[2] ?? Math.PI };
  }
  for (const tr of def.triggers || []) {
    if (tr.cell) { const p = L.center(tr.cell[0], tr.cell[1]); map.triggers.push({ ...tr, x: p.x, z: p.z, w: tr.w || cell, d: tr.d || cell }); } else map.triggers.push(tr);
  }
  if (!map.entries.default) map.entries.default = map.entries.door || { x: 0, z: D / 2 - cell, rot: Math.PI };
  map.wild = null;
  if (def.encounters?.cave?.length) {
    const { WildSpawner } = await import('./Wild.js');
    map.wild = new WildSpawner(map, g.wildCtx());
    map.wild.caveTable = def.encounters.cave;
  }
  map.encounters = def.encounters || {};
  mergeStatic(statics, keep);
  map.cameraBounds = [-W / 2 + 6, W / 2 - 6, -D / 2 + 4, D / 2 - 6].map((v, i) => (i % 2 === 0 ? Math.min(v, 0) : Math.max(v, 0)));
  return map;
}

export { clamp };
