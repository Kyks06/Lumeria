import * as THREE from 'three';
import { stdMat, NIGHT } from './Materials.js';
import { surfaceTexture, labelTexture } from './Textures.js';
import { texturedBox } from './Geometry.js';

/**
 * MOBILIER DES INTÉRIEURS : lits, tables, étagères, comptoirs, machine de soin, PC, cuisine,
 * canapé, télévision, plantes, tapis, cheminée, bureaux de laboratoire…
 * Chaque fonction renvoie un groupe posé au sol, face à +Z, avec userData.size = [w, d] pour les collisions.
 */
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 14, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
  ico: new THREE.IcosahedronGeometry(1, 1),
  torus: new THREE.TorusGeometry(1, 0.12, 8, 24),
};
const wood = () => new THREE.MeshStandardMaterial({ map: surfaceTexture('planks'), color: '#c89a6a', roughness: 0.75 });
const darkwood = () => stdMat('#6a4a30', { roughness: 0.7 });
const metal = () => stdMat('#c0c8d2', { roughness: 0.3, metalness: 0.8 });
let woodMat = null;
const W = () => (woodMat ||= wood());

function mesh(parent, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(...scale);
  m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const grp = (size) => { const g = new THREE.Group(); g.userData.size = size; return g; };

export const FURN = {
  bed(color = '#3a7bd5') {
    const g = grp([1.4, 2.2]);
    mesh(g, G.box, W(), [0, 0.25, 0], [1.4, 0.5, 2.2]);
    mesh(g, G.box, stdMat('#f6f4ee'), [0, 0.55, 0.05], [1.3, 0.14, 2.0]);
    mesh(g, G.box, stdMat(color, { roughness: 0.9 }), [0, 0.64, 0.35], [1.34, 0.08, 1.35]);
    mesh(g, G.box, stdMat('#ffffff'), [0, 0.7, -0.75], [0.9, 0.16, 0.42]);
    mesh(g, G.box, W(), [0, 0.75, -1.08], [1.4, 1.0, 0.1]);
    return g;
  },
  table(w = 1.6, d = 1.0) {
    const g = grp([w, d]);
    mesh(g, G.box, W(), [0, 0.76, 0], [w, 0.08, d]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(g, G.box, darkwood(), [sx * (w / 2 - 0.08), 0.37, sz * (d / 2 - 0.08)], [0.08, 0.74, 0.08]);
    mesh(g, G.cyl, stdMat('#ffffff'), [0.2, 0.83, 0.1], [0.14, 0.04, 0.14]);
    mesh(g, G.cyl, stdMat('#ff7a3a'), [-0.3, 0.86, -0.1], [0.07, 0.1, 0.07]);
    return g;
  },
  chair() {
    const g = grp([0.5, 0.5]);
    mesh(g, G.box, W(), [0, 0.45, 0], [0.48, 0.06, 0.48]);
    mesh(g, G.box, W(), [0, 0.8, -0.22], [0.48, 0.65, 0.05]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(g, G.box, darkwood(), [sx * 0.2, 0.22, sz * 0.2], [0.05, 0.45, 0.05]);
    return g;
  },
  sofa(color = '#c8553d') {
    const g = grp([2.2, 0.9]);
    const m = stdMat(color, { roughness: 0.95 });
    mesh(g, G.box, m, [0, 0.3, 0], [2.2, 0.45, 0.9]);
    mesh(g, G.box, m, [0, 0.7, -0.35], [2.2, 0.7, 0.2]);
    for (const s of [-1, 1]) mesh(g, G.box, m, [s * 1.0, 0.55, 0], [0.2, 0.5, 0.9]);
    for (const s of [-1, 1]) mesh(g, G.box, stdMat('#f4efe6', { roughness: 0.95 }), [s * 0.45, 0.6, -0.15], [0.7, 0.2, 0.5]);
    return g;
  },
  tv() {
    const g = grp([1.6, 0.5]);
    mesh(g, G.box, darkwood(), [0, 0.3, 0], [1.6, 0.6, 0.5]);
    mesh(g, G.box, stdMat('#1a1a22', { roughness: 0.3 }), [0, 1.05, 0], [1.3, 0.8, 0.08]);
    mesh(g, G.box, NIGHT.neon, [0, 1.05, 0.045], [1.2, 0.7, 0.01]).castShadow = false;
    return g;
  },
  bookshelf() {
    const g = grp([1.6, 0.45]);
    mesh(g, G.box, darkwood(), [0, 1.0, 0], [1.6, 2.0, 0.45]);
    const cols = ['#c8553d', '#3a7bd5', '#56cc6b', '#ffd23f', '#9a5aff', '#f4efe6'];
    for (let r = 0; r < 4; r++) {
      mesh(g, G.box, W(), [0, 0.15 + r * 0.48, 0.02], [1.5, 0.04, 0.42]);
      for (let i = 0; i < 9; i++) mesh(g, G.box, stdMat(cols[(i + r * 2) % cols.length]), [-0.66 + i * 0.16, 0.33 + r * 0.48, 0.05], [0.12, 0.3 + (i % 3) * 0.04, 0.32]);
    }
    return g;
  },
  plant() {
    const g = grp([0.6, 0.6]);
    mesh(g, G.cyl, stdMat('#c8704a', { roughness: 0.7 }), [0, 0.25, 0], [0.25, 0.5, 0.25]);
    const leaf = stdMat('#3f8a3a', { roughness: 0.8, flatShading: true });
    for (let i = 0; i < 6; i++) mesh(g, G.sphere, leaf, [Math.cos(i) * 0.15, 0.7 + (i % 3) * 0.2, Math.sin(i) * 0.15], [0.22, 0.32, 0.22]);
    return g;
  },
  rug(color = '#c8553d', w = 3, d = 2) {
    const g = grp([0, 0]);
    const m = new THREE.MeshStandardMaterial({ map: surfaceTexture('carpet'), color, roughness: 1 });
    const r = mesh(g, texturedBox(w, 0.02, d, w), m, [0, 0.012, 0]);
    r.castShadow = false;
    return g;
  },
  counter(w = 4, color = '#f4f0e8', accent = '#ff5c8a') {
    const g = grp([w, 0.9]);
    mesh(g, G.box, stdMat(color, { roughness: 0.5 }), [0, 0.55, 0], [w, 1.1, 0.9]);
    mesh(g, G.box, stdMat(accent, { roughness: 0.4 }), [0, 1.12, 0], [w + 0.1, 0.06, 1.0]);
    mesh(g, G.box, stdMat(accent, { roughness: 0.5 }), [0, 0.55, 0.46], [w, 0.12, 0.02]);
    return g;
  },
  healer() {
    const g = grp([1.6, 0.8]);
    mesh(g, G.box, stdMat('#e8ecf2', { roughness: 0.3, metalness: 0.3 }), [0, 0.6, 0], [1.6, 1.2, 0.8]);
    for (let i = 0; i < 6; i++) {
      const s = mesh(g, G.sphere, new THREE.MeshStandardMaterial({ color: '#ffb547', emissive: '#ff9a20', emissiveIntensity: 0.6, roughness: 0.2 }), [-0.5 + (i % 3) * 0.5, 1.28, -0.15 + Math.floor(i / 3) * 0.3], 0.1);
      s.castShadow = false;
    }
    mesh(g, G.box, NIGHT.neon, [0, 0.8, 0.41], [1.2, 0.4, 0.02]).castShadow = false;
    return g;
  },
  pc() {
    const g = grp([1, 0.6]);
    mesh(g, G.box, stdMat('#d8dce4', { roughness: 0.4 }), [0, 0.55, 0], [0.9, 1.1, 0.6]);
    mesh(g, G.box, NIGHT.neon, [0, 0.95, 0.31], [0.7, 0.45, 0.02]).castShadow = false;
    mesh(g, G.box, stdMat('#3a3a44'), [0, 0.45, 0.31], [0.6, 0.12, 0.02]);
    return g;
  },
  shelf(color = '#3f7cff') {
    const g = grp([2.4, 0.6]);
    mesh(g, G.box, stdMat('#e8e4dc'), [0, 0.9, 0], [2.4, 1.8, 0.6]);
    const cols = ['#ff7a9c', '#5fd4ff', '#ffb547', '#c58bff', '#7dff9c', '#ffd23f'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) mesh(g, i % 2 ? G.box : G.cyl, stdMat(cols[(i + r) % cols.length], { roughness: 0.4 }), [-1.0 + i * 0.33, 0.35 + r * 0.55, 0.12], i % 2 ? [0.2, 0.25, 0.2] : [0.1, 0.25, 0.1]);
    mesh(g, G.box, stdMat(color), [0, 1.85, 0.25], [2.4, 0.12, 0.1]);
    return g;
  },
  fridge() {
    const g = grp([0.8, 0.7]);
    mesh(g, G.box, stdMat('#f4f6f8', { roughness: 0.3 }), [0, 0.95, 0], [0.8, 1.9, 0.7]);
    mesh(g, G.box, metal(), [0.3, 1.2, 0.36], [0.04, 0.4, 0.04]);
    return g;
  },
  stove() {
    const g = grp([1.2, 0.7]);
    mesh(g, G.box, stdMat('#e8e4dc'), [0, 0.45, 0], [1.2, 0.9, 0.7]);
    for (const s of [-1, 1]) mesh(g, G.cyl, stdMat('#2a2a2a'), [s * 0.28, 0.91, 0], [0.18, 0.02, 0.18]);
    mesh(g, G.cyl, stdMat('#c8553d', { metalness: 0.5 }), [0.28, 1.0, 0], [0.16, 0.16, 0.16]);
    return g;
  },
  wardrobe() {
    const g = grp([1.4, 0.6]);
    mesh(g, G.box, darkwood(), [0, 1.05, 0], [1.4, 2.1, 0.6]);
    mesh(g, G.box, W(), [-0.34, 1.05, 0.31], [0.64, 1.9, 0.02]);
    mesh(g, G.box, W(), [0.34, 1.05, 0.31], [0.64, 1.9, 0.02]);
    return g;
  },
  fireplace() {
    const g = grp([2, 0.7]);
    const st = new THREE.MeshStandardMaterial({ map: surfaceTexture('stone'), color: '#c8c0b4', roughness: 0.9 });
    mesh(g, texturedBox(2, 1.6, 0.7, 1), st, [0, 0.8, 0]);
    mesh(g, G.box, stdMat('#1a1210'), [0, 0.55, 0.3], [1.1, 0.9, 0.2]);
    mesh(g, G.cone, new THREE.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff6a10', emissiveIntensity: 3 }), [0, 0.45, 0.32], [0.25, 0.5, 0.15]).castShadow = false;
    mesh(g, G.box, W(), [0, 1.65, 0.05], [2.2, 0.1, 0.8]);
    g.userData.fire = new THREE.Vector3(0, 0.6, 0.6);
    return g;
  },
  desk() {
    const g = grp([1.8, 0.8]);
    mesh(g, G.box, stdMat('#e8ecf2', { roughness: 0.4 }), [0, 0.76, 0], [1.8, 0.06, 0.8]);
    for (const s of [-1, 1]) mesh(g, G.box, stdMat('#a8b0bc'), [s * 0.8, 0.37, 0], [0.06, 0.74, 0.75]);
    mesh(g, G.box, stdMat('#2a2a32'), [0, 1.1, -0.2], [0.8, 0.5, 0.05]);
    mesh(g, G.box, NIGHT.neon, [0, 1.1, -0.17], [0.72, 0.42, 0.01]).castShadow = false;
    return g;
  },
  labmachine() {
    const g = grp([1.4, 1.0]);
    mesh(g, G.box, stdMat('#d8dce4', { roughness: 0.3, metalness: 0.4 }), [0, 0.9, 0], [1.4, 1.8, 1.0]);
    mesh(g, G.cyl, new THREE.MeshPhysicalMaterial({ color: '#7fd8ff', transparent: true, opacity: 0.5, roughness: 0.05, clearcoat: 1 }), [0, 2.2, 0], [0.35, 0.8, 0.35]).castShadow = false;
    mesh(g, G.sphere, new THREE.MeshStandardMaterial({ color: '#5fd4ff', emissive: '#5fd4ff', emissiveIntensity: 2 }), [0, 2.2, 0], 0.15).castShadow = false;
    for (let i = 0; i < 4; i++) mesh(g, G.box, stdMat(['#ff4f4f', '#7dff9c', '#ffd23f', '#5fd4ff'][i], { emissive: ['#ff4f4f', '#7dff9c', '#ffd23f', '#5fd4ff'][i], emissiveIntensity: 1 }), [-0.45 + i * 0.3, 1.4, 0.51], [0.12, 0.08, 0.02]).castShadow = false;
    return g;
  },
  poster(text, color = '#3a7bd5') {
    const g = grp([0, 0]);
    const m = mesh(g, G.box, new THREE.MeshStandardMaterial({ map: labelTexture(text, { bg: color, fg: '#ffffff', w: 384, h: 256, font: '700 46px "Chakra Petch", sans-serif' }), roughness: 0.7 }), [0, 1.8, 0.02], [1.2, 0.8, 0.02]);
    m.castShadow = false;
    return g;
  },
  window() {
    const g = grp([0, 0]);
    mesh(g, G.box, stdMat('#f4efe6'), [0, 1.6, 0], [1.4, 1.3, 0.1]);
    mesh(g, G.box, new THREE.MeshStandardMaterial({ color: '#9fd0ff', emissive: '#bfe4ff', emissiveIntensity: 0.6, roughness: 0.1 }), [0, 1.6, 0.03], [1.2, 1.1, 0.04]).castShadow = false;
    mesh(g, G.box, stdMat('#f4efe6'), [0, 1.6, 0.06], [0.06, 1.1, 0.03]);
    return g;
  },
  barrel() {
    const g = grp([0.8, 0.8]);
    mesh(g, G.cyl, stdMat('#8a5a34'), [0, 0.45, 0], [0.38, 0.9, 0.38]);
    return g;
  },
  crates() {
    const g = grp([1.8, 1]);
    const m = new THREE.MeshStandardMaterial({ map: surfaceTexture('planks'), color: '#c8a070', roughness: 0.85 });
    mesh(g, texturedBox(0.9, 0.9, 0.9, 0.9), m, [-0.45, 0.45, 0]);
    mesh(g, texturedBox(0.9, 0.9, 0.9, 0.9), m, [0.5, 0.45, 0.05], 1, [0, 0.2, 0]);
    mesh(g, texturedBox(0.8, 0.8, 0.8, 0.8), m, [0, 1.3, 0], 1, [0, -0.3, 0]);
    return g;
  },
  statue(color = '#ffd23f') {
    const g = grp([1.2, 1.2]);
    mesh(g, G.box, stdMat('#c8c0b0'), [0, 0.5, 0], [1.1, 1, 1.1]);
    const m = stdMat(color, { metalness: 0.8, roughness: 0.3 });
    mesh(g, G.sphere, m, [0, 1.5, 0], [0.45, 0.42, 0.55]);
    mesh(g, G.sphere, m, [0, 2.05, 0.3], [0.35, 0.32, 0.33]);
    for (const s of [-1, 1]) mesh(g, G.cone, m, [s * 0.15, 2.38, 0.28], [0.09, 0.3, 0.07], [0, 0, -s * 0.4]);
    return g;
  },
  pillar(color = '#e8e4dc') {
    const g = grp([0.9, 0.9]);
    const m = stdMat(color, { roughness: 0.7 });
    mesh(g, G.box, m, [0, 0.15, 0], [0.9, 0.3, 0.9]);
    mesh(g, G.cyl, m, [0, 2.2, 0], [0.32, 4, 0.32]);
    mesh(g, G.box, m, [0, 4.3, 0], [0.9, 0.3, 0.9]);
    return g;
  },
  elevator() {
    const g = grp([2, 0.4]);
    mesh(g, G.box, metal(), [0, 1.3, 0], [2, 2.6, 0.3]);
    mesh(g, G.box, stdMat('#8a929c', { metalness: 0.7, roughness: 0.25 }), [-0.45, 1.15, 0.16], [0.85, 2.2, 0.02]);
    mesh(g, G.box, stdMat('#8a929c', { metalness: 0.7, roughness: 0.25 }), [0.45, 1.15, 0.16], [0.85, 2.2, 0.02]);
    mesh(g, G.box, NIGHT.neon, [0, 2.45, 0.17], [0.5, 0.15, 0.02]).castShadow = false;
    return g;
  },
  stairs(up = true) {
    const g = grp([1.6, 3]);
    const m = W();
    for (let i = 0; i < 8; i++) mesh(g, G.box, m, [0, 0.15 + i * 0.3 * (up ? 1 : -0.2), -1.3 + i * 0.35], [1.6, 0.3 + i * 0.3 * (up ? 1 : 0), 0.35]);
    return g;
  },
  arenaFloor(w, d, color) {
    const g = grp([0, 0]);
    const ring = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3, side: THREE.DoubleSide });
    const r = mesh(g, new THREE.RingGeometry(Math.min(w, d) * 0.3, Math.min(w, d) * 0.32, 64), ring, [0, 0.02, 0], 1, [-Math.PI / 2, 0, 0]);
    r.castShadow = false;
    const r2 = mesh(g, new THREE.RingGeometry(0.9, 1.05, 32), ring, [0, 0.02, 0], 1, [-Math.PI / 2, 0, 0]);
    r2.castShadow = false;
    return g;
  },
};
