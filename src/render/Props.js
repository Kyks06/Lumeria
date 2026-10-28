import * as THREE from 'three';
import { stdMat, NIGHT } from './Materials.js';
import { labelTexture, surfaceTexture } from './Textures.js';
import { texturedBox } from './Geometry.js';

/**
 * ACCESSOIRES DU DÉCOR ET OBSTACLES DE TERRAIN
 * Lampadaires, panneaux, clôtures, bancs, tonneaux, puits, fontaine, statues, ponts,
 * objets ramassables, arbustes à couper, rochers à pousser, rochers à briser, parois à escalader.
 */
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 10),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  sphereLow: new THREE.SphereGeometry(1, 10, 8),
  torus: new THREE.TorusGeometry(1, 0.12, 8, 32),
  octa: new THREE.OctahedronGeometry(1, 0),
  ico: new THREE.IcosahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 1),
};
const WOOD = () => stdMat('#8a5a3b', { roughness: 0.85 });
const DARKWOOD = () => stdMat('#5a3a24', { roughness: 0.85 });
const METAL = () => stdMat('#2a2d36', { roughness: 0.4, metalness: 0.7 });
const STONE = () => stdMat('#b8b0a2', { roughness: 0.9 });

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

export const PROPS = {
  lamp(style = 'classic') {
    const g = new THREE.Group();
    if (style === 'lantern') {
      mesh(g, G.cylLow, DARKWOOD(), [0, 1.3, 0], [0.08, 2.6, 0.08]);
      mesh(g, G.box, DARKWOOD(), [0.35, 2.55, 0], [0.8, 0.08, 0.08]);
      mesh(g, G.box, NIGHT.lamp, [0.7, 2.25, 0], [0.22, 0.32, 0.22]).castShadow = false;
      g.userData.lightPos = new THREE.Vector3(0.7, 2.25, 0);
      return g;
    }
    if (style === 'modern') {
      mesh(g, G.cylLow, stdMat('#c0c8d0', { metalness: 0.7, roughness: 0.3 }), [0, 2.2, 0], [0.07, 4.4, 0.07]);
      mesh(g, G.box, stdMat('#c0c8d0', { metalness: 0.7 }), [0.5, 4.4, 0], [1.1, 0.1, 0.25]);
      mesh(g, G.box, NIGHT.neon, [0.8, 4.33, 0], [0.5, 0.05, 0.2]).castShadow = false;
      g.userData.lightPos = new THREE.Vector3(0.8, 4.2, 0);
      return g;
    }
    mesh(g, G.cylLow, stdMat('#6f6a63', { roughness: 0.9 }), [0, 0.2, 0], [0.22, 0.4, 0.22]);
    mesh(g, G.cylLow, METAL(), [0, 1.8, 0], [0.06, 3.2, 0.06]);
    mesh(g, G.box, METAL(), [0, 3.45, 0], [0.42, 0.06, 0.42]);
    mesh(g, G.box, NIGHT.lamp, [0, 3.72, 0], [0.3, 0.42, 0.3]).castShadow = false;
    mesh(g, G.cone, METAL(), [0, 4.06, 0], [0.3, 0.26, 0.3], [0, Math.PI / 4, 0]);
    g.userData.lightPos = new THREE.Vector3(0, 3.72, 0);
    return g;
  },
  torch() {
    const g = new THREE.Group();
    mesh(g, G.cylLow, DARKWOOD(), [0, 0.8, 0], [0.06, 1.6, 0.06]);
    mesh(g, G.cone, new THREE.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff7a10', emissiveIntensity: 3 }), [0, 1.75, 0], [0.12, 0.35, 0.12]).castShadow = false;
    g.userData.lightPos = new THREE.Vector3(0, 1.8, 0);
    g.userData.fire = true;
    return g;
  },
  sign(title, { bg = '#5b3a26', fg = '#ffe9b8' } = {}) {
    const g = new THREE.Group();
    mesh(g, G.cylLow, WOOD(), [-0.55, 0.6, 0], [0.06, 1.2, 0.06]);
    mesh(g, G.cylLow, WOOD(), [0.55, 0.6, 0], [0.06, 1.2, 0.06]);
    mesh(g, G.box, new THREE.MeshStandardMaterial({ map: labelTexture(title, { bg, fg }), roughness: 0.8 }), [0, 1.15, 0.03], [1.5, 0.55, 0.08]);
    return g;
  },
  bench() {
    const g = new THREE.Group();
    const w = WOOD();
    mesh(g, G.box, w, [0, 0.45, 0], [1.6, 0.08, 0.45]);
    mesh(g, G.box, w, [0, 0.8, -0.2], [1.6, 0.35, 0.06], [-0.15, 0, 0]);
    for (const s of [-1, 1]) mesh(g, G.box, METAL(), [s * 0.7, 0.22, 0], [0.06, 0.45, 0.4]);
    return g;
  },
  barrel() {
    const g = new THREE.Group();
    mesh(g, G.cyl, stdMat('#8a5a34', { roughness: 0.8 }), [0, 0.45, 0], [0.38, 0.9, 0.38]);
    for (const y of [0.15, 0.75]) mesh(g, G.torus, METAL(), [0, y, 0], [0.39, 0.39, 0.3], [Math.PI / 2, 0, 0]);
    return g;
  },
  crate() {
    const g = new THREE.Group();
    mesh(g, texturedBox(0.9, 0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ map: surfaceTexture('planks'), color: '#c8a070', roughness: 0.85 }), [0, 0.45, 0]);
    return g;
  },
  mailbox() {
    const g = new THREE.Group();
    mesh(g, G.cylLow, WOOD(), [0, 0.5, 0], [0.05, 1, 0.05]);
    mesh(g, G.box, stdMat('#3a7bd5'), [0, 1.1, 0], [0.3, 0.25, 0.45]);
    mesh(g, G.box, stdMat('#ff4f4f'), [0.17, 1.2, 0.1], [0.02, 0.18, 0.05]);
    return g;
  },
  well() {
    const g = new THREE.Group();
    mesh(g, G.cyl, STONE(), [0, 0.45, 0], [0.9, 0.9, 0.9]);
    mesh(g, G.cyl, stdMat('#1a3a4a', { roughness: 0.1 }), [0, 0.86, 0], [0.75, 0.02, 0.75]).castShadow = false;
    for (const s of [-1, 1]) mesh(g, G.box, WOOD(), [s * 0.8, 1.4, 0], [0.12, 1.4, 0.12]);
    mesh(g, G.box, stdMat('#c8553d'), [0, 2.2, 0], [2, 0.12, 1.2], [0, 0, 0]);
    return g;
  },
  fountain() {
    const g = new THREE.Group();
    const st = STONE();
    mesh(g, G.cyl, st, [0, 0.35, 0], [3.2, 0.7, 3.2]);
    const water = new THREE.MeshPhysicalMaterial({ color: '#3d8fd1', roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 });
    mesh(g, G.cyl, water, [0, 0.62, 0], [2.85, 0.1, 2.85]).castShadow = false;
    mesh(g, G.cyl, st, [0, 1.4, 0], [0.32, 2.0, 0.32]);
    mesh(g, G.cyl, st, [0, 2.4, 0], [1.1, 0.3, 1.1]);
    mesh(g, G.cyl, water, [0, 2.56, 0], [0.95, 0.05, 0.95]).castShadow = false;
    const c = mesh(g, G.octa, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb547', emissiveIntensity: 3, roughness: 0.2 }), [0, 3.4, 0], [0.35, 0.6, 0.35]);
    c.castShadow = false;
    g.userData.spinner = c;
    g.userData.collideR = 3.3;
    return g;
  },
  statue(color = '#c8c0b0') {
    const g = new THREE.Group();
    const st = stdMat(color, { roughness: 0.7, metalness: 0.2 });
    mesh(g, G.box, STONE(), [0, 0.5, 0], [1.4, 1, 1.4]);
    mesh(g, G.sphere, st, [0, 1.6, 0], [0.5, 0.45, 0.65]);
    mesh(g, G.sphere, st, [0, 2.2, 0.35], [0.38, 0.35, 0.36]);
    for (const s of [-1, 1]) mesh(g, G.cone, st, [s * 0.18, 2.55, 0.3], [0.1, 0.35, 0.08], [0, 0, -s * 0.4]);
    mesh(g, G.cone, st, [0, 1.8, -0.6], [0.12, 0.6, 0.12], [-1.0, 0, 0]);
    return g;
  },
  planter() {
    const g = new THREE.Group();
    mesh(g, G.box, STONE(), [0, 0.35, 0], [1.4, 0.7, 1.4]);
    mesh(g, G.box, stdMat('#4a3a2a'), [0, 0.68, 0], [1.25, 0.04, 1.25]);
    const leaf = stdMat('#4f8f3a', { roughness: 0.8, flatShading: true });
    mesh(g, G.cylLow, stdMat('#6b4a33'), [0, 1.4, 0], [0.08, 1.6, 0.08]);
    mesh(g, G.ico, leaf, [0, 2.5, 0], [0.9, 0.8, 0.9]);
    return g;
  },
  pedestal() {
    const g = new THREE.Group();
    mesh(g, G.cyl, STONE(), [0, 0.27, 0], [0.72, 0.54, 0.72]);
    mesh(g, G.cyl, stdMat('#6f6a63'), [0, 0.05, 0], [0.85, 0.1, 0.85]);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb547', emissiveIntensity: 0.6, roughness: 0.3 });
    mesh(g, G.torus, ringMat, [0, 0.55, 0], [0.62, 0.62, 0.62], [Math.PI / 2, 0, 0]).castShadow = false;
    g.userData.ringMat = ringMat;
    return g;
  },
  tent(color = '#ff7a3a') {
    const g = new THREE.Group();
    const m = stdMat(color, { roughness: 0.8, side: THREE.DoubleSide });
    mesh(g, new THREE.ConeGeometry(1.4, 1.8, 4, 1, true), m, [0, 0.9, 0], 1, [0, Math.PI / 4, 0]);
    mesh(g, G.box, stdMat('#2a2a2a'), [0, 0.5, 1.0], [0.5, 0.9, 0.02]);
    return g;
  },
  campfire() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) mesh(g, G.cylLow, DARKWOOD(), [0, 0.1, 0], [0.06, 0.9, 0.06], [Math.PI / 2, i * 0.8, 0]);
    for (let i = 0; i < 8; i++) mesh(g, G.sphereLow, STONE(), [Math.cos(i * 0.785) * 0.55, 0.06, Math.sin(i * 0.785) * 0.55], 0.12);
    mesh(g, G.cone, new THREE.MeshStandardMaterial({ color: '#ffb040', emissive: '#ff6a10', emissiveIntensity: 3 }), [0, 0.45, 0], [0.25, 0.7, 0.25]).castShadow = false;
    g.userData.lightPos = new THREE.Vector3(0, 0.6, 0);
    g.userData.fire = true;
    return g;
  },
  stall(color = '#ff7a3a') {
    const g = new THREE.Group();
    mesh(g, G.box, WOOD(), [0, 0.5, 0], [2.4, 1, 1]);
    for (const s of [-1, 1]) mesh(g, G.cylLow, WOOD(), [s * 1.1, 1.3, 0.4], [0.05, 2.6, 0.05]);
    for (let i = 0; i < 6; i++) mesh(g, G.box, stdMat(i % 2 ? '#ffffff' : color), [-1.0 + i * 0.4, 2.55, 0.1], [0.4, 0.05, 1.4], [0.25, 0, 0]);
    for (let i = 0; i < 5; i++) mesh(g, G.sphereLow, stdMat(['#ff4f4f', '#ffd23f', '#7dc860', '#ff9a3c', '#c58bff'][i]), [-0.8 + i * 0.4, 1.1, 0], 0.12);
    return g;
  },
  bridge(len = 10, width = 3) {
    const g = new THREE.Group();
    const plank = new THREE.MeshStandardMaterial({ map: surfaceTexture('planks'), color: '#b08a60', roughness: 0.85 });
    mesh(g, texturedBox(width, 0.25, len, 1.5), plank, [0, 0, 0]);
    for (const s of [-1, 1]) {
      mesh(g, G.box, DARKWOOD(), [s * width / 2, 0.55, 0], [0.1, 0.1, len]);
      for (let i = 0; i <= Math.floor(len / 2); i++) mesh(g, G.box, DARKWOOD(), [s * width / 2, 0.3, -len / 2 + i * 2], [0.12, 0.7, 0.12]);
    }
    return g;
  },
  /** Objet ramassable (Prisme lumineux posé au sol). */
  pickup(color = '#ffb547') {
    const g = new THREE.Group();
    const crystal = new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, clearcoat: 1, emissive: color, emissiveIntensity: 0.5, flatShading: true });
    const gem = mesh(g, G.ico, crystal, [0, 0.35, 0], [0.2, 0.24, 0.2]);
    mesh(g, G.torus, stdMat('#e0b04a', { metalness: 0.9, roughness: 0.3 }), [0, 0.35, 0], 0.2, [Math.PI / 2, 0, 0]);
    g.userData.spinner = gem;
    return g;
  },
  /** Arbuste fin qu'on peut couper (capacité Coupe). */
  cuttree() {
    const g = new THREE.Group();
    mesh(g, G.cylLow, stdMat('#6b4a33'), [0, 0.6, 0], [0.12, 1.2, 0.12]);
    const leaf = stdMat('#3f8a3a', { roughness: 0.8, flatShading: true });
    mesh(g, G.cone, leaf, [0, 1.5, 0], [0.75, 1.5, 0.75]);
    mesh(g, G.cone, leaf, [0, 2.1, 0], [0.55, 1.1, 0.55]);
    mesh(g, G.box, stdMat('#ffd23f'), [0, 0.8, 0.13], [0.12, 0.12, 0.02], [0, 0, Math.PI / 4]);
    return g;
  },
  /** Rocher rond à pousser (capacité Force). */
  boulder() {
    const g = new THREE.Group();
    mesh(g, G.dodeca, stdMat('#8a8070', { roughness: 0.92, flatShading: true }), [0, 0.95, 0], [0.95, 0.9, 0.95]);
    for (let i = 0; i < 3; i++) mesh(g, G.box, stdMat('#5a5248'), [Math.cos(i * 2) * 0.6, 1.0 + i * 0.15, Math.sin(i * 2) * 0.6], [0.4, 0.04, 0.06], [0, i, 0.5]);
    return g;
  },
  /** Rocher fissuré à briser (capacité Éclate-Roc). */
  crackrock() {
    const g = new THREE.Group();
    mesh(g, G.dodeca, stdMat('#a89a84', { roughness: 0.92, flatShading: true }), [0, 0.6, 0], [0.75, 0.6, 0.7]);
    const crack = stdMat('#3a3028');
    mesh(g, G.box, crack, [0, 0.7, 0.62], [0.05, 0.7, 0.04], [0, 0, 0.3]);
    mesh(g, G.box, crack, [0.15, 0.55, 0.6], [0.35, 0.04, 0.04], [0, 0, -0.6]);
    return g;
  },
  /** Paroi d'escalade (prises colorées), hauteur h. */
  climbwall(h = 5, w = 3) {
    const g = new THREE.Group();
    mesh(g, texturedBox(w, h, 0.6, 2), new THREE.MeshStandardMaterial({ map: surfaceTexture('stone'), color: '#9a9084', roughness: 0.9 }), [0, h / 2, 0]);
    const cols = ['#ff4f4f', '#ffd23f', '#3ba7ff', '#7dc860'];
    for (let i = 0; i < 12; i++) mesh(g, G.sphereLow, stdMat(cols[i % 4]), [Math.sin(i * 2.7) * w * 0.35, 0.4 + (i / 12) * (h - 0.6), 0.32], [0.1, 0.08, 0.06]);
    return g;
  },
  /** Table de pique-nique. */
  table() {
    const g = new THREE.Group();
    mesh(g, G.box, WOOD(), [0, 0.75, 0], [1.8, 0.08, 0.9]);
    for (const s of [-1, 1]) mesh(g, G.box, WOOD(), [0, 0.42, s * 0.75], [1.8, 0.06, 0.3]);
    for (const s of [-1, 1]) mesh(g, G.box, DARKWOOD(), [s * 0.75, 0.38, 0], [0.08, 0.75, 1.6]);
    return g;
  },
  snowman() {
    const g = new THREE.Group();
    const w = stdMat('#ffffff', { roughness: 0.9 });
    mesh(g, G.sphere, w, [0, 0.45, 0], 0.5);
    mesh(g, G.sphere, w, [0, 1.15, 0], 0.36);
    mesh(g, G.sphere, w, [0, 1.65, 0], 0.25);
    mesh(g, G.cone, stdMat('#ff8a3a'), [0, 1.65, 0.3], [0.05, 0.22, 0.05], [Math.PI / 2, 0, 0]);
    mesh(g, G.cyl, stdMat('#2a2a2a'), [0, 1.95, 0], [0.18, 0.25, 0.18]);
    return g;
  },
  gate(w = 6, color = '#2a2a3a') {
    const g = new THREE.Group();
    const m = stdMat(color, { metalness: 0.6, roughness: 0.4 });
    for (const s of [-1, 1]) mesh(g, G.box, m, [s * w / 2, 1.6, 0], [0.35, 3.2, 0.35]);
    mesh(g, G.box, m, [0, 3.2, 0], [w + 0.4, 0.3, 0.3]);
    for (let i = 0; i < 10; i++) mesh(g, G.cylLow, m, [-w / 2 + 0.3 + i * (w - 0.6) / 9, 1.5, 0], [0.05, 2.9, 0.05]);
    return g;
  },
  pc() {
    const g = new THREE.Group();
    mesh(g, G.box, stdMat('#d8dce4', { roughness: 0.4 }), [0, 0.55, 0], [0.9, 1.1, 0.6]);
    mesh(g, G.box, NIGHT.neon, [0, 0.95, 0.31], [0.7, 0.45, 0.02]).castShadow = false;
    mesh(g, G.box, stdMat('#3a3a44'), [0, 0.45, 0.31], [0.6, 0.12, 0.02]);
    return g;
  },
};

/** Clôture en bois le long d'une polyligne [[x,z],…] (hauteur du sol via heightFn). */
export function fenceLine(points, heightFn, color = '#8a5a3b') {
  const g = new THREE.Group();
  const wood = stdMat(color, { roughness: 0.85 });
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(len / 2.2));
    const ang = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      mesh(g, G.box, wood, [x, heightFn(x, z) + 0.55, z], [0.14, 1.1, 0.14]);
    }
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const y = heightFn(x, z), seg = len / n;
      mesh(g, G.box, wood, [x, y + 0.75, z], [0.07, 0.11, seg], [0, ang, 0]);
      mesh(g, G.box, wood, [x, y + 0.38, z], [0.07, 0.11, seg], [0, ang, 0]);
    }
  }
  return g;
}

/** Prisme de capture (combat, ramassage). */
export function buildPrisme(color = '#ffb547') {
  const g = new THREE.Group();
  const crystal = new THREE.MeshPhysicalMaterial({ color, roughness: 0.08, metalness: 0.1, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.5, emissive: color, emissiveIntensity: 0.35, flatShading: true });
  const gem = mesh(g, G.ico, crystal, [0, 0, 0], [0.17, 0.2, 0.17]);
  const band = mesh(g, G.torus, stdMat('#e0b04a', { metalness: 0.9, roughness: 0.3 }), [0, 0, 0], 0.17, [Math.PI / 2, 0, 0]);
  const core = mesh(g, G.sphereLow, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff4d0', emissiveIntensity: 2.5 }), [0, 0, 0], 0.06);
  core.castShadow = false;
  g.userData = { gem, band, core, crystal };
  return g;
}

/** Vélo (monture du joueur). */
export function buildBike(color = '#ff4f4f') {
  const g = new THREE.Group();
  const frame = stdMat(color, { roughness: 0.35, metalness: 0.4 });
  const tire = stdMat('#1a1a1a', { roughness: 0.8 });
  const chrome = stdMat('#d0d4dc', { roughness: 0.2, metalness: 0.9 });
  for (const z of [-0.55, 0.55]) {
    mesh(g, new THREE.TorusGeometry(0.34, 0.05, 8, 28), tire, [0, 0.36, z], 1, [0, Math.PI / 2, 0]);
    mesh(g, G.cylLow, chrome, [0, 0.36, z], [0.04, 0.14, 0.04], [0, 0, Math.PI / 2]);
  }
  mesh(g, G.cylLow, frame, [0, 0.6, 0], [0.035, 1.05, 0.035], [Math.PI / 2 - 0.25, 0, 0]);
  mesh(g, G.cylLow, frame, [0, 0.5, -0.25], [0.035, 0.55, 0.035], [0.5, 0, 0]);
  mesh(g, G.cylLow, frame, [0, 0.55, 0.45], [0.03, 0.45, 0.03], [-0.25, 0, 0]);
  mesh(g, G.box, stdMat('#2a2a2a'), [0, 0.86, -0.32], [0.16, 0.06, 0.28]);
  mesh(g, G.cylLow, chrome, [0, 0.95, 0.5], [0.025, 0.55, 0.025], [0, 0, Math.PI / 2]);
  mesh(g, G.box, frame, [0, 0.8, 0.62], [0.2, 0.1, 0.06]);
  return g;
}

/** Planche de surf. */
export function buildSurfboard(color = '#3ba7ff') {
  const g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1 });
  mesh(g, G.sphere, m, [0, 0.08, 0], [0.45, 0.07, 1.25]);
  mesh(g, G.box, stdMat('#ffffff'), [0, 0.14, 0], [0.06, 0.01, 2.2]);
  return g;
}
