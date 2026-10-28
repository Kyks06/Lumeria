import * as THREE from 'three';
import { BIOMES } from './Biomes.js';
import { MapTerrain, WATER_LEVEL } from './MapTerrain.js';
import { GameMap } from './GameMap.js';
import { NPC } from './Actors.js';
import { WildSpawner } from './Wild.js';
import { buildBuilding } from '../render/Buildings.js';
import { VEG, instanceFromPrototype } from '../render/Vegetation.js';
import { PROPS, fenceLine } from '../render/Props.js';
import { waterMaterial, lavaMaterial } from '../render/Materials.js';
import { mergeStatic } from '../render/Optimize.js';
import { MODELS } from '../config/models.js';
import { ITEMS } from '../config/items.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';
import { mulberry32, distToPolyline } from '../core/utils.js';

const UP = new THREE.Vector3(0, 1, 0);
const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

/** Prototypes de végétation (mis en cache) — un .glb de /models/env remplace la forme générée. */
const protoCache = new Map();
function vegProto(key, assets) {
  if (protoCache.has(key)) return protoCache.get(key);
  const glbKey = { oak0: 'tree', oak1: 'tree', oak2: 'tree', pine: 'pine', palm: 'palm', cactus: 'cactus', deadtree: 'deadtree', rock0: 'rock', rock1: 'rock', rock2: 'rock', bush0: 'bush', bush1: 'bush' }[key];
  let obj = null;
  if (glbKey && assets?.has(`env:${glbKey}`)) {
    const cfg = MODELS.env[glbKey];
    obj = assets.instantiate(`env:${glbKey}`, { height: cfg.height, size: cfg.size })?.object || null;
  }
  if (!obj) {
    const v = Number(key.match(/\d$/)?.[0] || 0);
    const base = key.replace(/\d$/, '');
    switch (base) {
      case 'oak': obj = VEG.oak(v, [['#4f8f3a', '#64a040', '#467f34'], ['#5a9a3a', '#78b048', '#4f8a36'], ['#3f7d34', '#56923c', '#3a7030']][v % 3]); break;
      case 'autumn': obj = VEG.oak(v, ['#d8782a', '#e8a03a', '#c85a2a']); break;
      case 'birch': obj = VEG.birch(); break;
      case 'pine': obj = VEG.pine(0, false); break;
      case 'snowpine': obj = VEG.pine(0, true); break;
      case 'palm': obj = VEG.palm(); break;
      case 'cactus': obj = VEG.cactus(v); break;
      case 'deadtree': obj = VEG.deadtree(false); break;
      case 'charred': obj = VEG.deadtree(true); break;
      case 'willow': obj = VEG.willow(); break;
      case 'mushroom': obj = VEG.mushroom(v); break;
      case 'bush': obj = VEG.bush(v); break;
      case 'berrybush': obj = VEG.berrybush(); break;
      case 'rock': obj = VEG.rock(v); break;
      case 'darkrock': obj = VEG.rock(v, '#5a5450', null); break;
      case 'snowrock': obj = VEG.rock(v, '#b8c0c8', '#ffffff'); break;
      case 'sandrock': obj = VEG.rock(v, '#c8a878', null); break;
      case 'fern': obj = VEG.fern(); break;
      case 'reeds': obj = VEG.reeds(); break;
      case 'lilypad': obj = VEG.lilypad(); break;
      case 'log': obj = VEG.log(); break;
      case 'stump': obj = VEG.stump(); break;
      case 'crystal': obj = VEG.crystal(['#9a7aff', '#5fd4ff', '#ff7ad8'][v % 3], 1); break;
      case 'stalagmite': obj = VEG.stalagmite(); break;
      case 'icespike': obj = VEG.icespike(); break;
      case 'bones': obj = VEG.bones(); break;
      case 'shell': obj = VEG.shell(); break;
      case 'pillar': obj = VEG.pillar(v % 2 === 1); break;
      case 'lavarock': obj = VEG.lavarock(); break;
      case 'snowman': obj = PROPS.snowman(); break;
      default: obj = VEG.bush(0);
    }
  }
  protoCache.set(key, obj);
  return obj;
}

/** Rayon de collision et ombre selon le type de décor. */
const VEG_INFO = {
  oak: { r: 0.42, tree: true }, autumn: { r: 0.42, tree: true }, birch: { r: 0.3, tree: true }, pine: { r: 0.4, tree: true }, snowpine: { r: 0.4, tree: true },
  palm: { r: 0.35, tree: true }, cactus: { r: 0.45, tree: true }, deadtree: { r: 0.35, tree: true }, charred: { r: 0.35, tree: true }, willow: { r: 0.5, tree: true },
  mushroom: { r: 0.45, tree: true }, stalagmite: { r: 0.6, tree: true }, crystal: { r: 0.5, tree: true }, pillar: { r: 0.6, tree: true },
  rock: { r: 0.85, h: 1.2 }, darkrock: { r: 0.85, h: 1.2 }, snowrock: { r: 0.85, h: 1.2 }, sandrock: { r: 0.85, h: 1.2 }, lavarock: { r: 0.85, h: 1.2 },
  icespike: { r: 0.5, h: 2 }, snowman: { r: 0.5, h: 2 }, log: { r: 0.6, h: 0.8 }, stump: { r: 0.45, h: 0.8 },
};
const variants = (key) => ({ oak: 3, rock: 3, darkrock: 2, snowrock: 2, sandrock: 2, bush: 2, cactus: 2, mushroom: 3, crystal: 3, autumn: 2 }[key] || 1);

/** Positions réservées (rien n'y pousse). */
class Reserve {
  constructor() { this.circles = []; this.rects = []; }
  circle(x, z, r) { this.circles.push([x, z, r]); }
  rect(x, z, w, d, pad = 0) { this.rects.push([x - w / 2 - pad, x + w / 2 + pad, z - d / 2 - pad, z + d / 2 + pad]); }
  has(x, z, pad = 0) {
    for (const [cx, cz, r] of this.circles) if ((x - cx) ** 2 + (z - cz) ** 2 < (r + pad) ** 2) return true;
    for (const [a, b, c, d] of this.rects) if (x > a - pad && x < b + pad && z > c - pad && z < d + pad) return true;
    return false;
  }
}

/** Position du point devant une porte (repère monde). */
function doorWorld(b, r, dist) {
  const rot = b.rot || 0;
  const lx = r.door.x, lz = r.door.z + dist;
  return { x: b.x + lx * Math.cos(rot) + lz * Math.sin(rot), z: b.z - lx * Math.sin(rot) + lz * Math.cos(rot), rot };
}

/**
 * CONSTRUCTION D'UNE CARTE EXTÉRIEURE OU D'UNE GROTTE à partir de sa définition (src/maps/*.js).
 * @param def  définition de la carte
 * @param g    jeu (assets, drapeaux, réglages, système d'herbe…)
 */
export async function buildOutdoor(def, g) {
  const biome = { ...BIOMES[def.biome || 'prairie'], ...(def.biomeOverride || {}) };
  const cave = !!biome.cave || def.type === 'cave';
  const map = new GameMap(def, cave ? 'cave' : 'outdoor', g);
  map.biome = biome;
  map.dark = !!def.dark;
  const [W, D] = def.size;
  map.bounds = [-W / 2, W / 2, -D / 2, D / 2];
  const rnd = mulberry32((def.seed || 7) * 9973 + 11);
  const low = g.settings.quality === 'basse';
  const mobile = g.engine.isMobile;
  const statics = new THREE.Group();
  const keep = new Set();
  map.group.add(statics);
  const reserve = new Reserve();
  const ok = (o) => g.flagOk(o);

  // ── Bâtiments (emplacements aplanis avant le relief) ──────────────
  const terrain = new MapTerrain(def, biome);
  map.terrain = terrain;
  const buildings = (def.buildings || []).filter(ok).map((b0) => {
    const b = b0.kind === 'dock' ? fitDock(b0, terrain) : b0;
    return { b, r: buildBuilding(b.kind, b.style || def.style || 'village', b) };
  });
  for (const { b, r } of buildings) {
    if (b.kind !== 'dock' && b.kind !== 'boat') terrain.addPad(b.x, b.z, r.w, r.d, b.rot || 0);
    reserve.rect(b.x, b.z, (Math.round((b.rot || 0) / (Math.PI / 2)) & 1) ? r.d : r.w, (Math.round((b.rot || 0) / (Math.PI / 2)) & 1) ? r.w : r.d, 3);
    const dw = doorWorld(b, r, 2);
    reserve.circle(dw.x, dw.z, 3);
  }
  await yieldFrame();

  // ── Relief, eau, lave ─────────────────────────────────────────────
  const tmesh = terrain.buildMesh();
  map.group.add(tmesh);
  map.terrainMesh = tmesh;
  if ((def.lakes?.length || def.rivers?.length || def.sea) && !def.noWater) {
    const wm = waterMaterial({ murky: !!biome.murky, color: biome.water || (biome.murky ? '#3a5a40' : def.type === 'cave' ? '#1a4a6a' : '#1f6c8c'), deep: biome.murky ? '#1a2a1a' : '#0a2a44', opacity: biome.murky ? 0.94 : 0.86 });
    const wg = new THREE.PlaneGeometry(W + (cave ? 30 : 160), D + (cave ? 30 : 160), 1, 1);
    wg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wg, wm);
    water.position.y = WATER_LEVEL;
    water.receiveShadow = true;
    water.renderOrder = 1;
    map.group.add(water);
    map.updaters.push((dt) => { wm.userData.water.uTime.value += dt; });
  }
  if (def.lava?.length) {
    const lm = lavaMaterial();
    for (const [x, z, r] of def.lava) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r + 1.6, 40), lm);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(x, WATER_LEVEL + 0.05, z);
      map.group.add(disc);
      reserve.circle(x, z, r + 2);
    }
    map.updaters.push((dt) => lm.userData.update(dt));
    const big = def.lava.reduce((a, l) => (l[2] > a[2] ? l : a));
    const glow = new THREE.PointLight('#ff6a20', 30, big[2] * 3, 1.6);
    glow.position.set(big[0], 2.5, big[1]);
    map.group.add(glow);
  }
  for (const [x, z, r] of def.lakes || []) reserve.circle(x, z, r + 1);
  for (const [x, z, r] of def.plazas || []) reserve.circle(x, z, r);

  // ── Ponts (franchissables au-dessus de l'eau) ─────────────────────
  map.bridges = [];
  for (const p of (def.props || []).filter((p) => p.t === 'bridge')) {
    const len = p.len || 12, wid = p.w || 3.2, rot = p.rot || 0;
    const ax = p.x - Math.sin(rot) * len / 2, az = p.z - Math.cos(rot) * len / 2;
    const bx = p.x + Math.sin(rot) * len / 2, bz = p.z + Math.cos(rot) * len / 2;
    const y = Math.max(terrain.height(ax, az), terrain.height(bx, bz), WATER_LEVEL + 0.5) + 0.15;
    const obj = PROPS.bridge(len, wid);
    obj.position.set(p.x, y, p.z);
    obj.rotation.y = rot;
    statics.add(obj);
    map.bridges.push({ x: p.x, z: p.z, rot, hl: len / 2 + 0.6, hw: wid / 2 - 0.15, y: y + 0.12 });
  }

  // ── Placement des bâtiments ───────────────────────────────────────
  const lightSpots = [];
  for (const { b, r } of buildings) {
    const y = b.kind === 'dock' || b.kind === 'boat' ? (b.y ?? WATER_LEVEL + 0.05) : terrain.height(b.x, b.z);
    r.group.position.set(b.x, y, b.z);
    r.group.rotation.y = b.rot || 0;
    statics.add(r.group);
    if (!r.noCollide) map.colliders.addBox(b.x, b.z, r.w, r.d, { rot: b.rot || 0, h: r.h, tag: 'building' });
    for (const s of r.spinners) { keep.add(s); map.spinners.push({ obj: s, speed: 1.2 }); }
    for (const l of r.lights) lightSpots.push(l.clone().applyMatrix4(new THREE.Matrix4().compose(r.group.position, new THREE.Quaternion().setFromAxisAngle(UP, b.rot || 0), new THREE.Vector3(1, 1, 1))));
    for (const c of r.chimneys) map.smokes.push(c.clone().applyMatrix4(new THREE.Matrix4().compose(r.group.position, new THREE.Quaternion().setFromAxisAngle(UP, b.rot || 0), new THREE.Vector3(1, 1, 1))));
    if (b.kind === 'dock') {
      const len = r.d, wid = r.w;
      map.bridges.push({ x: b.x, z: b.z, rot: b.rot || 0, hl: len / 2, hw: wid / 2 - 0.1, y: y + 0.5 });
      continue;
    }
    if (b.noDoor || b.kind === 'boat') continue;
    const dw = doorWorld(b, r, 0.45);
    const target = b.to || `${def.id}:${b.id}`;
    map.warps.push({ x: dw.x, z: dw.z, r: 0.95, to: target, entry: b.entry || 'door', building: b, closed: b.closed });
    const out = doorWorld(b, r, 2.2);
    map.entries[`door:${b.id}`] = { x: out.x, z: out.z, rot: b.rot || 0 };
    if (b.label || b.sign) {
      const sg = PROPS.sign(b.sign || b.label);
      const s = doorWorld(b, r, 2.8);
      const sx = s.x + Math.cos(b.rot || 0) * 2.6, sz = s.z - Math.sin(b.rot || 0) * 2.6;
      sg.position.set(sx, terrain.height(sx, sz), sz);
      sg.rotation.y = b.rot || 0;
      statics.add(sg);
      map.colliders.addCircle(sx, sz, 0.6, { camera: false, h: 1.5 });
      if (b.signText) map.addInteractable({ type: 'sign', pos: new THREE.Vector3(sx, 0, sz), lines: b.signText, name: b.sign || b.label });
    }
  }

  // ── Accessoires, panneaux, lampadaires ────────────────────────────
  const lampLights = [];
  for (const p of (def.props || []).filter(ok)) {
    if (p.t === 'bridge') continue;
    let obj;
    switch (p.t) {
      case 'sign': obj = PROPS.sign(p.title || 'Panneau', p.colors || {}); break;
      case 'lamp': obj = PROPS.lamp(p.style || (def.style === 'cite' ? 'modern' : def.type === 'route' ? 'lantern' : 'classic')); break;
      case 'statue': obj = PROPS.statue(p.color); break;
      case 'tent': obj = PROPS.tent(p.color); break;
      case 'stall': obj = PROPS.stall(p.color); break;
      case 'gate': obj = PROPS.gate(p.w || 6, p.color); break;
      case 'tree': obj = vegProto(p.kind || 'oak0', g.assets).clone(); break;
      case 'veg': obj = vegProto(p.kind, g.assets).clone(); break;
      default: obj = PROPS[p.t] ? PROPS[p.t](p.arg) : null;
    }
    if (!obj) continue;
    const y = p.y ?? terrain.height(p.x, p.z);
    obj.position.set(p.x, y, p.z);
    obj.rotation.y = p.rot || 0;
    if (p.scale) obj.scale.setScalar(p.scale);
    statics.add(obj);
    if (obj.userData.spinner) { keep.add(obj.userData.spinner); map.spinners.push({ obj: obj.userData.spinner, speed: 0.8, bob: 0.12, baseY: obj.userData.spinner.position.y }); }
    const cr = p.r ?? obj.userData.collideR ?? { lamp: 0.25, torch: 0.15, sign: 0.6, bench: 0.8, barrel: 0.45, crate: 0.6, mailbox: 0.2, well: 1.1, statue: 0.9, planter: 0.8, tent: 1.4, campfire: 0.7, stall: 1.3, table: 1.0, snowman: 0.5, pedestal: 0.8, pc: 0.5, tree: 0.45, veg: 0.6 }[p.t] ?? 0.6;
    if (p.t === 'gate') map.colliders.addBox(p.x, p.z, (p.w || 6) + 0.6, 0.6, { rot: p.rot || 0, h: 3.5, camera: false, tag: 'gate' });
    else if (cr > 0) map.colliders.addCircle(p.x, p.z, cr, { camera: p.t === 'tree' || p.t === 'well' || p.t === 'statue', h: p.t === 'tree' ? 12 : 2, tag: p.t });
    reserve.circle(p.x, p.z, cr + 1.2);
    if (obj.userData.lightPos) lampLights.push(obj.userData.lightPos.clone().applyMatrix4(new THREE.Matrix4().compose(obj.position, obj.quaternion, obj.scale)));
    if (p.t === 'sign' && p.text) map.addInteractable({ type: 'sign', pos: new THREE.Vector3(p.x, 0, p.z), lines: p.text, name: p.title || 'Panneau', radius: 2.2 });
    if (p.talk || p.script) map.addInteractable({ type: 'prop', pos: new THREE.Vector3(p.x, 0, p.z), def: p, name: p.name || '', radius: p.radius || 2.2 });
  }
  // Lumières réelles (nombre limité pour les performances)
  const maxLights = low ? 2 : mobile ? 4 : 7;
  const spots = [...lampLights, ...lightSpots].slice(0, maxLights);
  for (const s of spots) {
    const l = new THREE.PointLight('#ffc978', 0, 15, 1.6);
    l.position.copy(s);
    map.group.add(l);
    map.lights.push(l);
  }

  // Clôtures
  for (const line of def.fences || []) {
    statics.add(fenceLine(line, (x, z) => terrain.height(x, z), def.fenceColor));
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(len / 0.8));
      for (let k = 0; k <= n; k++) map.colliders.addCircle(ax + (bx - ax) * (k / n), az + (bz - az) * (k / n), 0.32, { camera: false, h: 1.2, tag: 'fence' });
      reserve.circle((ax + bx) / 2, (az + bz) / 2, len / 2 + 0.5);
    }
  }

  // ── Obstacles de terrain (Coupe, Éclate-Roc, Force, Escalade) ─────
  (def.obstacles || []).forEach((o, i) => {
    if (!ok(o)) return;
    const key = `${def.id}:obs${i}`;
    if (o.persist && g.data.cleared?.[key]) return;
    let obj;
    if (o.t === 'cut') obj = PROPS.cuttree();
    else if (o.t === 'smash') obj = PROPS.crackrock();
    else if (o.t === 'boulder') obj = PROPS.boulder();
    else if (o.t === 'climb') obj = PROPS.climbwall(o.h || 5, o.w || 3);
    else if (o.t === 'whirl' || o.t === 'ice') obj = null;
    const y = terrain.height(o.x, o.z);
    if (obj) {
      obj.position.set(o.x, y, o.z);
      obj.rotation.y = o.rot || 0;
      map.group.add(obj);
    }
    const r = o.t === 'boulder' ? 1.0 : o.t === 'climb' ? 0 : 0.75;
    const col = r > 0 ? map.colliders.addCircle(o.x, o.z, r, { camera: false, h: 2.2, tag: o.t }) : null;
    const ob = { ...o, key, obj, collider: col, index: i };
    map.obstacles.push(ob);
    reserve.circle(o.x, o.z, 2.2);
    if (o.t === 'climb') {
      const [tx, tz] = o.to;
      map.addInteractable({ type: 'climb', pos: new THREE.Vector3(o.x, 0, o.z), ob, dest: [tx, tz], radius: 2.6 });
      map.addInteractable({ type: 'climb', pos: new THREE.Vector3(tx, 0, tz), ob, dest: [o.x + Math.sin(o.rot || 0) * 1.6, o.z + Math.cos(o.rot || 0) * 1.6], radius: 2.6 });
      reserve.circle(tx, tz, 2);
    } else {
      ob.inter = map.addInteractable({ type: 'obstacle', pos: new THREE.Vector3(o.x, 0, o.z), ob, radius: 2.4 });
    }
  });

  // ── Objets au sol et cachés ───────────────────────────────────────
  (def.items || []).forEach((it, i) => {
    if (!ok(it)) return;
    const key = `${def.id}:it${i}`;
    if (g.data.picked?.[key]) return;
    const y = terrain.height(it.x, it.z);
    let obj = null;
    if (!it.hidden) {
      const color = ITEMS[it.item]?.pocket === 'dt' ? '#9ab8ff' : ITEMS[it.item]?.pocket === 'prisme' ? '#ffb547' : '#ff6fa8';
      obj = PROPS.pickup(color);
      obj.position.set(it.x, y, it.z);
      map.group.add(obj);
      map.spinners.push({ obj: obj.userData.spinner, speed: 1.6, bob: 0.08, baseY: obj.userData.spinner.position.y });
    }
    map.addInteractable({ type: 'item', pos: new THREE.Vector3(it.x, y, it.z), item: it.item, qty: it.qty || 1, key, obj, hidden: !!it.hidden, radius: it.hidden ? 1.6 : 2.0 });
    reserve.circle(it.x, it.z, 1.4);
  });

  // ── PNJ et dresseurs ──────────────────────────────────────────────
  for (const n of def.npcs || []) {
    const look = n.look || (n.cls ? trainerLook(n.cls, n.id) : npcLook(n.kind || 'homme', n.id, n.lookExtra));
    const npc = new NPC({ ...n, look }, g.assets, map);
    map.group.add(npc.group);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'npc', npc, pos: npc.position, name: n.name || '', radius: n.radius });
    reserve.circle(n.x, n.z, (n.wander || 0) + 1.5);
  }
  for (const t of def.trainers || []) {
    const look = t.look || trainerLook(t.cls, t.id, t.lookExtra);
    const npc = new NPC({ ...t, look, trainer: true, sight: t.sight ?? 5 }, g.assets, map);
    npc.trainer = t;
    map.group.add(npc.group);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'trainer', npc, pos: npc.position, name: t.name || '', trainer: t });
    reserve.circle(t.x, t.z, 1.6);
    const sight = t.sight ?? 5;
    reserve.circle(t.x + Math.sin(t.rot || 0) * sight / 2, t.z + Math.cos(t.rot || 0) * sight / 2, 1.2);
  }

  // Sorties : un couloir dégagé
  for (const e of def.exits || []) {
    const w = (e.w || 10) / 2 + 2;
    if (e.edge === 'north') reserve.rect(e.at, -D / 2 - 10, w * 2, 28);
    if (e.edge === 'south') reserve.rect(e.at, D / 2 + 10, w * 2, 28);
    if (e.edge === 'west') reserve.rect(-W / 2 - 10, e.at, 28, w * 2);
    if (e.edge === 'east') reserve.rect(W / 2 + 10, e.at, 28, w * 2);
  }
  for (const wp of def.warps || []) {
    map.warps.push({ ...wp, r: wp.r || 1.2 });
    reserve.circle(wp.x, wp.z, 3);
    if (wp.visual) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 8, 32), new THREE.MeshStandardMaterial({ color: '#9ab8ff', emissive: '#7fd8ff', emissiveIntensity: 2 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(wp.x, terrain.height(wp.x, wp.z) + 0.08, wp.z);
      map.group.add(ring);
    }
  }
  for (const [name, e] of Object.entries(def.entries || {})) map.entries[name] = { x: e[0], z: e[1], rot: e[2] ?? Math.PI };
  if (def.fly) map.entries.fly = { x: def.fly[0], z: def.fly[1], rot: def.fly[2] ?? 0 };
  for (const tr of def.triggers || []) map.triggers.push(tr);
  await yieldFrame();

  // ── Végétation et rochers ─────────────────────────────────────────
  const tall = def.grass || [];
  for (const [x, z, w, d] of tall) reserve.rect(x, z, w, d, 0.8);
  const isFree = (x, z, pad = 0) => {
    if (terrain.pathDist(x, z) < terrain.pathW + 2.2 + pad) return false;
    if (reserve.has(x, z, pad)) return false;
    const y = terrain.height(x, z);
    if (y < WATER_LEVEL + 0.25) return false;
    if (terrain.isLava(x, z)) return false;
    for (const br of map.bridges) if (Math.hypot(x - br.x, z - br.z) < br.hl + 2) return false;
    return true;
  };
  const lists = new Map();
  const addInst = (key, x, z, s, ry) => {
    if (!lists.has(key)) lists.set(key, []);
    lists.get(key).push(new THREE.Matrix4().compose(new THREE.Vector3(x, terrain.height(x, z) - 0.05, z), new THREE.Quaternion().setFromAxisAngle(UP, ry), new THREE.Vector3(s, s, s)));
  };
  const pickW = (arr) => {
    const tot = arr.reduce((a, e) => a + e[1], 0);
    let r = rnd() * tot;
    for (const e of arr) { r -= e[1]; if (r <= 0) return e[0]; }
    return arr[0][0];
  };
  const qual = low ? 0.55 : mobile ? 0.8 : 1;

  // ── Enclos secrets : une place entourée d'une haie (ou de rochers) dont l'unique accès
  //    est bouché par l'obstacle voisin (Coupe, Éclate-Roc, Force) ──
  for (const [px, pz, pr] of def.plazas || []) {
    const gates = map.obstacles.filter((o) => o.t !== 'climb' && o.collider && (() => { const d = Math.hypot(o.x - px, o.z - pz); return d > pr + 2 && d < pr + 9; })());
    if (!gates.length) continue;
    const R = gates.reduce((a, o) => a + Math.hypot(o.x - px, o.z - pz), 0) / gates.length;
    const danger = map.warps.some((w) => Math.hypot(w.x - px, w.z - pz) < R + 2)
      || Object.values(map.entries).some((e) => Math.hypot(e.x - px, e.z - pz) < R + 2)
      || (def.exits || []).some((e) => { const en = map.entry(e.edge); return Math.hypot(en.x - px, en.z - pz) < R + 3; });
    if (danger) continue;
    for (const o of gates) { o.collider.r = o.t === 'boulder' ? 1.2 : 1.35; map.colliders.move(o.collider, o.x, o.z); }
    const kind = cave ? 'darkrock' : biome.snow ? 'snowrock' : biome.dunes ? 'sandrock' : biome.lava ? 'darkrock' : 'hedge';
    const n = Math.ceil((2 * Math.PI * R) / 1.2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = px + Math.cos(a) * R, z = pz + Math.sin(a) * R;
      if (gates.some((o) => Math.hypot(x - o.x, z - o.z) < 1.3)) continue;
      if (terrain.isWater(x, z) || terrain.outside(x, z) > 0) continue;
      const sc = 1.25 + rnd() * 0.35;
      if (kind === 'hedge') addInst(`bush${i % 2}`, x, z, sc * 1.25, rnd() * 6.28);
      else addInst(`${kind}${i % 2}`, x, z, sc, rnd() * 6.28);
      map.colliders.addCircle(x, z, 1.0, { camera: false, h: 2, tag: 'hedge' });
      reserve.circle(x, z, 1.4);
    }
  }

  const step = cave ? 3.2 : 4.4;
  const margin = cave ? 6 : 46;
  const treeDensity = def.treeDensity ?? biome.treeDensity ?? 0.15;
  const trees = def.trees || biome.trees;
  const extras = def.extras || biome.extras || [];
  for (let gx = -W / 2 - margin; gx < W / 2 + margin; gx += step) {
    for (let gz = -D / 2 - margin; gz < D / 2 + margin; gz += step) {
      const x = gx + (rnd() - 0.5) * step * 0.95, z = gz + (rnd() - 0.5) * step * 0.95;
      const out = terrain.outside(x, z);
      const r = rnd();
      if (!isFree(x, z)) continue;
      if (cave) {
        // grottes : stalagmites le long des parois, cristaux
        const open = terrain.openMask(x, z);
        if (open < 0.15 || open > 0.85) continue;
        if (r < 0.5 * qual) {
          const k = pickW(trees);
          addInst(k === 'crystal' ? `crystal${Math.floor(rnd() * 3)}` : k, x, z, 0.7 + rnd() * 0.8, rnd() * 6.28);
        }
        continue;
      }
      const border = out > -2;
      let p = (border ? 0.62 : treeDensity) * qual;
      if (out > 22) p *= 0.6;
      const s = 0.8 + rnd() * 0.6;
      if (r < p && terrain.height(x, z) < 40) {
        let k = pickW(trees);
        if (k === 'oak') k = `oak${Math.floor(rnd() * 3)}`;
        else if (variants(k) > 1) k = `${k}${Math.floor(rnd() * variants(k))}`;
        addInst(k, x, z, s * (border ? 1.15 : 1), rnd() * 6.28);
        const info = VEG_INFO[k.replace(/\d$/, '')];
        if (out < 1 && info) map.colliders.addCircle(x, z, info.r * s, { camera: false, h: info.h || 12, tag: 'tree' });
      } else if (r < p + 0.09 && !border) {
        if (biome.bushes?.length && rnd() < 0.55) {
          const k = biome.bushes[Math.floor(rnd() * biome.bushes.length)];
          addInst(k === 'bush' ? `bush${Math.floor(rnd() * 2)}` : k, x, z, 0.8 + rnd() * 0.5, rnd() * 6.28);
        } else if (extras.length) {
          const k = pickW(extras);
          if (k === 'flowers') {
            const col = biome.flowers[Math.floor(rnd() * biome.flowers.length)];
            for (let f = 0; f < 6; f++) addInst(`flower:${col}`, x + (rnd() - 0.5) * 2.2, z + (rnd() - 0.5) * 2.2, 0.8 + rnd() * 0.6, rnd() * 6.28);
          } else {
            const kk = variants(k) > 1 ? `${k}${Math.floor(rnd() * variants(k))}` : k;
            const rockKey = k === 'rock' ? (biome.snow ? `snowrock${Math.floor(rnd() * 2)}` : biome.dunes ? `sandrock${Math.floor(rnd() * 2)}` : biome.lava ? `darkrock${Math.floor(rnd() * 2)}` : kk) : kk;
            addInst(rockKey, x, z, 0.7 + rnd() * 0.6, rnd() * 6.28);
            const info = VEG_INFO[rockKey.replace(/\d$/, '')];
            if (info && out < 1) map.colliders.addCircle(x, z, info.r * 0.9, { camera: false, h: info.h || 1.2, tag: 'rock' });
          }
        }
      }
    }
  }
  // Nénuphars et roseaux près de l'eau
  if (!cave && (def.lakes?.length || def.rivers?.length)) {
    for (let i = 0; i < 260 * qual; i++) {
      const x = (rnd() - 0.5) * W, z = (rnd() - 0.5) * D;
      const y = terrain.height(x, z);
      if (y < WATER_LEVEL - 0.5 && y > WATER_LEVEL - 1.6 && rnd() < 0.5) addInst('lilypad', x, z, 0.8 + rnd() * 0.8, rnd() * 6.28);
      else if (y > WATER_LEVEL - 0.2 && y < WATER_LEVEL + 0.5 && biome.bushes?.includes('reeds') !== false && rnd() < 0.3 && isFree(x, z, -2)) addInst('reeds', x, z, 0.8 + rnd() * 0.5, rnd() * 6.28);
    }
  }
  const CH = 96;
  for (const [key, mats] of lists) {
    let proto;
    if (key.startsWith('flower:')) proto = VEG.flower(key.slice(7));
    else proto = vegProto(key, g.assets);
    if (key === 'lilypad') for (const m of mats) { const p = new THREE.Vector3().setFromMatrixPosition(m); p.y = WATER_LEVEL + 0.02; m.setPosition(p); }
    const chunks = new Map();
    const pos = new THREE.Vector3();
    for (const m of mats) {
      pos.setFromMatrixPosition(m);
      const k = `${Math.floor(pos.x / CH)},${Math.floor(pos.z / CH)}`;
      if (!chunks.has(k)) chunks.set(k, []);
      chunks.get(k).push(m);
    }
    const shadow = !/^(flower|bush|fern|lilypad|reeds|shell|bones)/.test(key);
    for (const list of chunks.values()) map.group.add(instanceFromPrototype(proto, list, { castShadow: shadow }));
  }
  await yieldFrame();

  // ── Herbe (décor + hautes herbes) ─────────────────────────────────
  const grassSys = g.grass;
  if (!cave && biome.groundCover > 0) {
    const dens = biome.groundCover * (low ? 0.25 : mobile ? 0.42 : 0.62);
    const field = grassSys.createField({
      minX: -W / 2 - 16, maxX: W / 2 + 16, minZ: -D / 2 - 16, maxZ: D / 2 + 16, density: dens, seed: def.seed || 3, chunk: 40,
      colorA: biome.grass[0], colorB: biome.grass[1],
      sampler: (x, z, rr) => {
        if (terrain.pathDist(x, z) < terrain.pathW + 0.4) return null;
        for (const [px, pz, r] of def.plazas || []) if (Math.hypot(x - px, z - pz) < r + 0.5) return null;
        for (const [a, b, c, d] of reserve.rects) if (x > a + 2 && x < b - 2 && z > c + 2 && z < d - 2) return null;
        const y = terrain.height(x, z);
        if (y < WATER_LEVEL + 0.45 || terrain.outside(x, z) > 4) return null;
        if (biome.sand && y < WATER_LEVEL + 1.2) return null;
        for (const [gx, gz, gw, gd] of tall) if (Math.abs(x - gx) < gw / 2 && Math.abs(z - gz) < gd / 2) return null;
        return { y, scale: 0.28 + rr() * 0.3 };
      },
    });
    map.group.add(field);
  }
  for (const [x0, z0, w, d] of tall) {
    const field = grassSys.createField({
      minX: x0 - w / 2, maxX: x0 + w / 2, minZ: z0 - d / 2, maxZ: z0 + d / 2,
      density: low ? 3.6 : mobile ? 5 : 7.5, chunk: 40, seed: x0 * 3 + z0 + (def.seed || 1),
      colorA: biome.tall[0], colorB: biome.tall[1],
      sampler: (x, z, rr) => {
        const ex = 1 - Math.abs(x - x0) / (w / 2), ez = 1 - Math.abs(z - z0) / (d / 2);
        const edge = Math.min(ex, ez);
        if (edge < 0.15 && rr() > edge / 0.15) return null;
        const y = terrain.height(x, z);
        if (y < WATER_LEVEL + 0.2) return null;
        return { y, scale: 0.55 + rr() * 0.38 };
      },
    });
    map.group.add(field);
  }
  map.tallGrass = tall;

  // ── Lumins sauvages ───────────────────────────────────────────────
  const enc = def.encounters || {};
  map.wild = new WildSpawner(map, g.wildCtx());
  if (enc.grass?.length) for (const rect of tall) map.wild.addZone(rect, enc.grass, Math.max(1, Math.min(6, Math.round((rect[2] * rect[3]) / 70))));
  if (enc.cave?.length) map.wild.caveTable = enc.cave;
  if (enc.surf?.length) map.wild.surfTable = enc.surf;
  map.wild.init();
  map.encounters = enc;

  mergeStatic(statics, keep);
  return map;
}

/**
 * Ponton : prolongé jusqu'à la terre ferme (1,5 m sur la rive) pour qu'on puisse toujours en descendre à pied.
 * Le côté « mer » garde 7 m depuis la position prévue.
 */
function fitDock(b, terrain) {
  const rot = b.rot || 0, ax = Math.sin(rot), az = Math.cos(rot);
  const h = (t) => terrain.height(b.x + ax * t, b.z + az * t);
  const dir = h(12) > h(-12) ? 1 : -1;
  let t = 0;
  while (t < 40 && h(dir * t) < WATER_LEVEL + 0.15) t += 0.5;
  const land = t + 1.5, sea = 7;
  const len = Math.max(8, land + sea);
  const off = ((land - sea) / 2) * dir;
  return { ...b, x: b.x + ax * off, z: b.z + az * off, len };
}

/** Hauteur d'un point le long de la première polyligne (aide à l'écriture des cartes). */
export function nearPath(def, x, z) {
  let d = Infinity;
  for (const p of def.paths || []) d = Math.min(d, distToPolyline(x, z, p));
  return d;
}
