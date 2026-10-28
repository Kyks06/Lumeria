import * as THREE from 'three';
import { GameMap } from './GameMap.js';
import { NPC } from './Actors.js';
import { FURN } from '../render/Furniture.js';
import { PROPS } from '../render/Props.js';
import { stdMat } from '../render/Materials.js';
import { surfaceTexture } from '../render/Textures.js';
import { mergeStatic } from '../render/Optimize.js';
import { ITEMS } from '../config/items.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';

/**
 * INTÉRIEURS GÉNÉRÉS : chaque bâtiment d'une ville a son intérieur (maison, Centre Lumin, boutique,
 * laboratoire, pension, musée, Tour de Combat…). Les PNJ et objets viennent de la définition du bâtiment.
 * Repère : porte au sud (+Z), caméra plongeante depuis le sud.
 */
const PRESETS = {
  house:   { size: [12, 9], floor: 'planks', floorColor: '#c89a6a', wall: 'wallpaper', wallColor: '#f0e4cc' },
  home:    { size: [14, 10], floor: 'planks', floorColor: '#d0a070', wall: 'wallpaper', wallColor: '#f4ead8' },
  bighouse:{ size: [16, 11], floor: 'planks', floorColor: '#b88a5a', wall: 'wallpaper', wallColor: '#e8dcc8' },
  center:  { size: [18, 12], floor: 'tiles', floorColor: '#f4f0ec', wall: 'plaster', wallColor: '#fff4f4', accent: '#ff5c8a' },
  shop:    { size: [14, 10], floor: 'tiles', floorColor: '#e8eef4', wall: 'plaster', wallColor: '#eef4ff', accent: '#3f7cff' },
  dept:    { size: [22, 14], floor: 'tiles', floorColor: '#eceef4', wall: 'panel', wallColor: '#f4f6fa', accent: '#5a6cff' },
  lab:     { size: [18, 13], floor: 'tiles', floorColor: '#e4ecf0', wall: 'panel', wallColor: '#f2f6f8', accent: '#3aa0c8' },
  daycare: { size: [14, 10], floor: 'planks', floorColor: '#c8a070', wall: 'wallpaper', wallColor: '#f8ecd0', accent: '#7dc860' },
  museum:  { size: [20, 13], floor: 'planks', floorColor: '#a87a50', wall: 'wallpaper', wallColor: '#e8dcc8', accent: '#c8553d' },
  tower:   { size: [20, 13], floor: 'tiles', floorColor: '#d0d8e8', wall: 'panel', wallColor: '#e0e8f4', accent: '#ffd23f' },
  hall:    { size: [16, 12], floor: 'stone', floorColor: '#d8d0c0', wall: 'stone', wallColor: '#d0c8b8', accent: '#ffd23f' },
  cabin:   { size: [10, 8], floor: 'planks', floorColor: '#a07a50', wall: 'logs', wallColor: '#c8a070' },
};

export async function buildInterior(def, g) {
  const P = { ...(PRESETS[def.preset] || PRESETS.house), ...(def.size ? { size: def.size } : {}) };
  const map = new GameMap(def, 'interior', g);
  map.floorY = 0;
  const [W, D] = P.size;
  map.bounds = [-W / 2 + 0.6, W / 2 - 0.6, -D / 2 + 0.6, D / 2 - 0.4];
  const statics = new THREE.Group();
  map.group.add(statics);
  const keep = new Set();
  const ok = (o) => g.flagOk(o);
  const add = (obj, x, z, rot = 0, solid = true, scale = 1) => {
    obj.position.set(x, 0, z);
    obj.rotation.y = rot;
    if (scale !== 1) obj.scale.setScalar(scale);
    statics.add(obj);
    const sz = obj.userData.size;
    if (solid && sz && sz[0] > 0) map.colliders.addBox(x, z, sz[0] * scale, sz[1] * scale, { rot, h: 2.2, camera: false });
    return obj;
  };
  const inter = (o) => map.addInteractable({ radius: 2.2, ...o, pos: new THREE.Vector3(o.x, 0, o.z) });

  // Sol, murs (le mur sud est bas : vue en coupe)
  const ft = surfaceTexture(P.floor).clone();
  ft.needsUpdate = true;
  ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
  ft.repeat.set(W / 3, D / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ft, color: P.floorColor, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  map.group.add(floor);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, D + 80), stdMat('#0e0a08', { roughness: 1 }));
  under.rotation.x = -Math.PI / 2;
  under.position.y = -0.03;
  map.group.add(under);
  const wt = surfaceTexture(P.wall).clone();
  wt.needsUpdate = true;
  wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
  const wallMat = new THREE.MeshStandardMaterial({ map: wt, color: P.wallColor, roughness: 0.85 });
  const baseMat = stdMat('#6a4a30', { roughness: 0.7 });
  const H = 3.4;
  const wall = (x, z, w, d, h) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    m.position.set(x, h / 2, z);
    m.receiveShadow = true;
    m.castShadow = h > 1;
    statics.add(m);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.18, d + 0.02), baseMat);
    b.position.set(x, 0.09, z);
    statics.add(b);
    map.colliders.addBox(x, z, w, d, { h, camera: h > 1 });
  };
  wall(0, -D / 2 - 0.15, W + 0.6, 0.3, H);
  wall(-W / 2 - 0.15, 0, 0.3, D, H);
  wall(W / 2 + 0.15, 0, 0.3, D, H);
  wall(-W / 4 - 0.9, D / 2 + 0.15, W / 2 - 1.8, 0.3, 0.55);
  wall(W / 4 + 0.9, D / 2 + 0.15, W / 2 - 1.8, 0.3, 0.55);
  // Tapis d'entrée et sortie
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), stdMat(P.accent || '#c8553d', { roughness: 0.95 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.012, D / 2 - 0.7);
  map.group.add(mat);
  map.warps.push({ x: 0, z: D / 2 + 0.25, r: 1.15, to: def.exitTo, entry: def.exitEntry });
  map.entries.door = { x: 0, z: D / 2 - 1.7, rot: Math.PI };
  map.entries.default = map.entries.door;
  // Fenêtres sur le mur du fond
  for (const x of [-W / 3, W / 3]) {
    const w = FURN.window();
    w.position.set(x, 1.7, -D / 2 + 0.02);
    statics.add(w);
  }
  const accent = P.accent || '#c8553d';

  // ── Mobilier selon le type ────────────────────────────────────────
  const shopNpc = [];
  switch (def.preset) {
    case 'home':
    case 'house':
    case 'bighouse':
    case 'cabin': {
      const big = def.preset !== 'house' && def.preset !== 'cabin';
      add(FURN.bed(def.bedColor || ['#3a7bd5', '#c8553d', '#7dc860', '#c58bff'][def.id.length % 4]), -W / 2 + 1.1, -D / 2 + 1.5, 0);
      if (def.preset === 'home') {
        inter({ type: 'prop', x: -W / 2 + 1.1, z: -D / 2 + 1.5, def: { action: 'rest' }, name: 'Lit' });
        map.entries.bed = { x: -W / 2 + 2.7, z: -D / 2 + 1.7, rot: Math.PI / 2 };
      }
      add(FURN.table(), -1.2, -0.4, 0);
      add(FURN.chair(), -2.3, -0.4, Math.PI / 2, false);
      add(FURN.chair(), -0.1, -0.4, -Math.PI / 2, false);
      add(FURN.rug(accent, 3.2, 2.2), -1.2, -0.4, 0, false);
      add(FURN.bookshelf(), W / 2 - 1.6, -D / 2 + 0.45, 0);
      inter({ type: 'prop', x: W / 2 - 1.6, z: -D / 2 + 0.9, def: { talk: def.books || ['Des livres sur les Lumins et les légendes de la région.', '« Les Éclats de l\'Aube, fragments d\'une étoile tombée… »'] }, name: 'Bibliothèque' });
      add(FURN.plant(), W / 2 - 0.6, D / 2 - 1.4, 0);
      add(FURN.plant(), -W / 2 + 0.6, D / 2 - 1.4, 0);
      if (big || def.preset === 'house') {
        add(FURN.tv(), W / 2 - 0.6, 0.6, -Math.PI / 2);
        add(FURN.sofa(), W / 2 - 2.6, 0.6, Math.PI / 2);
        inter({ type: 'prop', x: W / 2 - 0.6, z: 0.6, def: { action: 'tv' }, name: 'Télévision' });
      }
      if (big) {
        add(FURN.fridge(), -W / 2 + 3.3, -D / 2 + 0.55, 0);
        add(FURN.stove(), -W / 2 + 4.4, -D / 2 + 0.55, 0);
        add(FURN.wardrobe(), W / 2 - 3.2, -D / 2 + 0.5, 0);
      }
      if (def.preset === 'cabin') add(FURN.fireplace(), 0, -D / 2 + 0.5, 0);
      break;
    }
    case 'center': {
      add(FURN.counter(8, '#f4f0e8', '#ff5c8a'), 0, -D / 2 + 3.2, 0);
      add(FURN.healer(), 0, -D / 2 + 1.0, 0);
      shopNpc.push({ id: `${def.id}:infirmiere`, name: 'Infirmière', kind: 'infirmiere', x: 0, z: -D / 2 + 2.1, rot: 0, counter: 'heal' });
      inter({ type: 'counter', x: 0, z: -D / 2 + 3.4, action: 'heal', radius: 2.6, name: 'Infirmière' });
      add(FURN.pc(), W / 2 - 0.8, -D / 2 + 3.4, -Math.PI / 2);
      inter({ type: 'prop', x: W / 2 - 0.8, z: -D / 2 + 3.4, def: { action: 'pc' }, name: 'PC', radius: 2.0 });
      add(FURN.sofa('#ff8aa8'), -W / 2 + 1.2, 1.4, Math.PI / 2);
      add(FURN.table(1.2, 0.8), -W / 2 + 2.8, 1.4, 0);
      add(FURN.plant(), -W / 2 + 0.7, -D / 2 + 0.7, 0);
      add(FURN.plant(), W / 2 - 0.7, -D / 2 + 0.7, 0);
      add(FURN.poster('CENTRE LUMIN', '#ff5c8a'), -W / 4, 0, 0, false).position.set(-W / 4, 2.2, -D / 2 + 0.05);
      if (def.mart) {
        add(FURN.counter(3.6, '#eef4ff', '#3f7cff'), W / 2 - 2.6, 1.6, -Math.PI / 2);
        add(FURN.shelf('#3f7cff'), W / 2 - 0.5, 1.6, -Math.PI / 2);
        shopNpc.push({ id: `${def.id}:vendeur`, name: 'Vendeur', kind: 'vendeur', x: W / 2 - 1.5, z: 1.6, rot: -Math.PI / 2 });
        inter({ type: 'counter', x: W / 2 - 3.0, z: 1.6, action: 'shop', shop: def.shop, radius: 2.4, name: 'Boutique' });
      }
      break;
    }
    case 'shop': {
      add(FURN.counter(4.6, '#eef4ff', '#3f7cff'), W / 2 - 2.8, -0.6, -Math.PI / 2);
      shopNpc.push({ id: `${def.id}:vendeur`, name: 'Vendeur', kind: def.clerk || 'vendeur', x: W / 2 - 1.6, z: -0.6, rot: -Math.PI / 2 });
      inter({ type: 'counter', x: W / 2 - 3.2, z: -0.6, action: 'shop', shop: def.shop, radius: 2.4, name: 'Boutique' });
      for (let i = 0; i < 3; i++) add(FURN.shelf(['#3f7cff', '#ff5c8a', '#7dc860'][i]), -W / 2 + 2 + i * 2.6, -D / 2 + 0.5, 0);
      add(FURN.shelf('#ffb02e'), -1.5, 1.2, Math.PI / 2);
      add(FURN.plant(), -W / 2 + 0.6, D / 2 - 1.4, 0);
      break;
    }
    case 'dept': {
      const counters = def.counters || [];
      counters.forEach((c, i) => {
        const x = -W / 2 + 3 + i * ((W - 6) / Math.max(1, counters.length - 1 || 1));
        add(FURN.counter(3.2, '#eef4ff', ['#3f7cff', '#ff5c8a', '#7dc860', '#ffb02e', '#c58bff'][i % 5]), x, -D / 2 + 3, 0);
        add(FURN.shelf(['#3f7cff', '#ff5c8a', '#7dc860', '#ffb02e', '#c58bff'][i % 5]), x, -D / 2 + 0.5, 0);
        shopNpc.push({ id: `${def.id}:c${i}`, name: c.name || 'Vendeuse', kind: i % 2 ? 'vendeur' : 'vendeuse', x, z: -D / 2 + 1.9, rot: 0 });
        inter({ type: 'counter', x, z: -D / 2 + 3.2, action: 'shop', shop: c.shop, radius: 2.3, name: c.name || 'Comptoir' });
      });
      add(FURN.plant(), -W / 2 + 0.7, D / 2 - 1.5, 0);
      add(FURN.plant(), W / 2 - 0.7, D / 2 - 1.5, 0);
      add(FURN.elevator(), W / 2 - 1.2, 1, -Math.PI / 2);
      break;
    }
    case 'lab': {
      for (let i = 0; i < 3; i++) add(FURN.labmachine(), -W / 2 + 2 + i * 2.2, -D / 2 + 0.6, 0);
      add(FURN.bookshelf(), W / 2 - 1.2, -D / 2 + 0.45, 0);
      add(FURN.bookshelf(), W / 2 - 3.0, -D / 2 + 0.45, 0);
      add(FURN.desk(), W / 2 - 2.2, 1.0, 0);
      add(FURN.desk(), -W / 2 + 2.2, 1.6, 0);
      add(FURN.pc(), -W / 2 + 0.7, 1.6, Math.PI / 2);
      add(FURN.table(2.4, 1.0), 0, -1.6, 0);
      add(FURN.plant(), -W / 2 + 0.6, D / 2 - 1.4, 0);
      add(FURN.plant(), W / 2 - 0.6, D / 2 - 1.4, 0);
      inter({ type: 'prop', x: W / 2 - 1.2, z: -D / 2 + 0.9, def: { talk: ['« Étude des Éclats de l\'Aube, par le Pr. Aubin ».', 'Les Éclats réagiraient à la présence des Lumins légendaires…'] }, name: 'Bibliothèque' });
      break;
    }
    case 'daycare': {
      add(FURN.counter(4, '#f8ecd0', '#7dc860'), 0, -D / 2 + 2.8, 0);
      shopNpc.push({ id: `${def.id}:eleveuse`, name: 'Éleveuse', kind: 'eleveuse', x: 0, z: -D / 2 + 1.7, rot: 0 });
      inter({ type: 'counter', x: 0, z: -D / 2 + 3.0, action: 'daycare', radius: 2.6, name: 'Pension' });
      add(FURN.sofa('#7dc860'), -W / 2 + 1.2, 1, Math.PI / 2);
      add(FURN.rug('#7dc860', 3, 2), 0, 1, 0, false);
      add(FURN.plant(), W / 2 - 0.6, -D / 2 + 0.6, 0);
      add(FURN.plant(), -W / 2 + 0.6, -D / 2 + 0.6, 0);
      add(FURN.fireplace(), W / 2 - 1.2, 1, -Math.PI / 2);
      break;
    }
    case 'museum': {
      for (let i = 0; i < 4; i++) {
        const x = -W / 2 + 3 + i * ((W - 6) / 3);
        add(FURN.statue(['#c8c0b0', '#ffd23f', '#9ab8ff', '#c58bff'][i]), x, -D / 2 + 2.2, 0);
        inter({ type: 'prop', x, z: -D / 2 + 2.2, def: { talk: (def.exhibits || [])[i] || ['Une pièce rare de la collection.'] }, name: 'Exposition', radius: 2.6 });
      }
      add(FURN.counter(3, '#e8dcc8', '#c8553d'), W / 2 - 2.5, 2, -Math.PI / 2);
      add(FURN.rug('#c8553d', 6, 3), 0, 1.2, 0, false);
      break;
    }
    case 'tower': {
      add(FURN.counter(5, '#e0e8f4', '#ffd23f'), -3, -D / 2 + 3, 0);
      add(FURN.counter(5, '#e0e8f4', '#5fd4ff'), 4, -D / 2 + 3, 0);
      shopNpc.push({ id: `${def.id}:recep`, name: 'Réceptionniste', kind: 'receptionniste', x: -3, z: -D / 2 + 1.9, rot: 0 });
      shopNpc.push({ id: `${def.id}:echange`, name: 'Échange PC', kind: 'receptionniste', x: 4, z: -D / 2 + 1.9, rot: 0 });
      inter({ type: 'counter', x: -3, z: -D / 2 + 3.2, action: 'tower', radius: 2.6, name: 'Tour de Combat' });
      inter({ type: 'counter', x: 4, z: -D / 2 + 3.2, action: 'bp', radius: 2.6, name: 'Échange' });
      add(FURN.elevator(), 0, -D / 2 + 0.6, 0);
      add(FURN.plant(), -W / 2 + 0.7, D / 2 - 1.5, 0);
      add(FURN.plant(), W / 2 - 0.7, D / 2 - 1.5, 0);
      add(FURN.pc(), W / 2 - 0.8, 0.8, -Math.PI / 2);
      inter({ type: 'prop', x: W / 2 - 0.8, z: 0.8, def: { action: 'pc' }, name: 'PC', radius: 2.0 });
      break;
    }
    case 'hall': {
      for (const x of [-W / 2 + 1.5, W / 2 - 1.5]) for (const z of [-D / 4, D / 4]) add(FURN.pillar(), x, z, 0);
      add(FURN.rug(accent, 3, D - 3), 0, 0, 0, false);
      break;
    }
    default: break;
  }
  for (const f of (def.furniture || []).filter(ok)) {
    const make = FURN[f.t] || PROPS[f.t];
    if (!make) continue;
    const o = add(make(...(f.args || [])), f.x, f.z, f.rot || 0, f.solid !== false, f.scale || 1);
    if (f.y) o.position.y = f.y;
    if (f.talk || f.script || f.action) inter({ type: 'prop', x: f.x, z: f.z, def: f, name: f.name || '', radius: f.radius || 2.2 });
  }

  // Lumières chaudes
  const lamp = new THREE.PointLight('#ffe2b8', 20, 26, 1.3);
  lamp.position.set(0, 3.2, -0.5);
  map.group.add(lamp);
  map.lights.push(lamp);

  // PNJ
  for (const n of [...shopNpc, ...(def.npcs || [])]) {
    const look = n.look || (n.cls ? trainerLook(n.cls, n.id) : npcLook(n.kind || 'homme', n.id, n.lookExtra));
    const npc = new NPC({ ...n, look }, g.assets, map);
    map.group.add(npc.group);
    map.npcs.push(npc);
    if (!n.counter) npc.inter = map.addInteractable({ type: 'npc', npc, pos: npc.position, name: n.name || '', radius: n.radius });
  }
  for (const t of def.trainers || []) {
    const look = t.look || trainerLook(t.cls, t.id, t.lookExtra);
    const npc = new NPC({ ...t, look, trainer: true, sight: t.sight ?? 4 }, g.assets, map);
    npc.trainer = t;
    map.group.add(npc.group);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'trainer', npc, pos: npc.position, name: t.name || '', trainer: t });
  }
  // Objets
  (def.items || []).forEach((it, i) => {
    if (!ok(it)) return;
    const key = `${def.id}:it${i}`;
    if (g.data.picked?.[key]) return;
    let obj = null;
    if (!it.hidden) {
      obj = PROPS.pickup(ITEMS[it.item]?.pocket === 'dt' ? '#9ab8ff' : '#ff6fa8');
      obj.position.set(it.x, 0, it.z);
      map.group.add(obj);
      map.spinners.push({ obj: obj.userData.spinner, speed: 1.6, bob: 0.08, baseY: obj.userData.spinner.position.y });
    }
    map.addInteractable({ type: 'item', pos: new THREE.Vector3(it.x, 0, it.z), item: it.item, qty: it.qty || 1, key, obj, hidden: !!it.hidden, radius: 1.8 });
  });
  for (const tr of def.triggers || []) map.triggers.push(tr);
  for (const [name, e] of Object.entries(def.entries || {})) map.entries[name] = { x: e[0], z: e[1], rot: e[2] ?? Math.PI };
  mergeStatic(statics, keep);
  map.cameraBounds = [-Math.max(0, W / 2 - 7), Math.max(0, W / 2 - 7), -Math.max(0, D / 2 - 5), Math.max(0, D / 2 - 4)];
  return map;
}

export { PRESETS as INTERIOR_PRESETS };
