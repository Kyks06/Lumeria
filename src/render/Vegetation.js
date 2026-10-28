import * as THREE from 'three';
import { stdMat } from './Materials.js';
import { bucketsByMaterial } from './Optimize.js';

/**
 * VÉGÉTATION ET ÉLÉMENTS NATURELS (prototypes instanciés par milliers)
 * Feuillages à couleurs de sommets (un seul matériau par essence) et formes bruitées.
 */
function jitter(geo, amount, seed = 1) {
  const g = geo.clone();
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.sin(v.x * 12.9898 * seed + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    v.multiplyScalar(1 + ((h - Math.floor(h)) * 2 - 1) * amount);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Couleurs de sommets : dégradé vertical + bruit (lumière douce sur le dessus des feuillages). */
function tint(geo, color, { top = 1.18, bottom = 0.72, noise = 0.12 } = {}) {
  const g = geo.clone();
  const c = new THREE.Color(color);
  const p = g.attributes.position;
  g.computeBoundingBox();
  const { min, max } = g.boundingBox;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - min.y) / Math.max(1e-4, max.y - min.y);
    const h = Math.sin(p.getX(i) * 31.1 + p.getZ(i) * 17.3 + p.getY(i) * 7.7) * 0.5 + 0.5;
    const k = (bottom + (top - bottom) * t) * (1 - noise + h * noise * 2);
    arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

const V = {
  ico1: new THREE.IcosahedronGeometry(1, 1),
  ico2: new THREE.IcosahedronGeometry(1, 2),
  dodeca1: new THREE.DodecahedronGeometry(1, 1),
  cone8: new THREE.ConeGeometry(1, 1, 9),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  taper: new THREE.CylinderGeometry(0.6, 1, 1, 9),
  sphere: new THREE.SphereGeometry(1, 12, 9),
  box: new THREE.BoxGeometry(1, 1, 1),
};
const leafGeos = [1, 2, 3].map((s) => jitter(V.ico2, 0.13, s));
const rockGeos = [3, 4, 5].map((s) => jitter(V.dodeca1, 0.22, s));
const LEAF = () => stdMat('#ffffff', { roughness: 0.82, vertexColors: true, flatShading: true });
const SMOOTHLEAF = () => stdMat('#ffffff', { roughness: 0.75, vertexColors: true });
const BARK = () => stdMat('#6b4a33', { roughness: 0.95 });

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

const P = {};

P.oak = (v = 0, pal = ['#4f8f3a', '#64a040', '#467f34']) => {
  const g = new THREE.Group();
  const bark = BARK();
  mesh(g, V.taper, bark, [0, 1.3, 0], [0.24, 2.6, 0.24]);
  mesh(g, V.cyl8, bark, [0.4, 2.3, 0.1], [0.07, 1.2, 0.07], [0, 0, -0.75]);
  mesh(g, V.cyl8, bark, [-0.35, 2.5, -0.1], [0.06, 1.0, 0.06], [0, 0, 0.7]);
  for (let i = 0; i < 3; i++) mesh(g, V.cone8, bark, [Math.cos(i * 2.1) * 0.25, 0.15, Math.sin(i * 2.1) * 0.25], [0.1, 0.35, 0.1], [Math.sin(i * 2.1) * 0.6, 0, -Math.cos(i * 2.1) * 0.6]);
  const leaf = LEAF();
  const spots = [[0, 3.6, 0, 1.6], [0.95, 3.1, 0.35, 1.05], [-0.8, 3.25, -0.4, 1.1], [0.15, 4.5, -0.15, 0.9], [-0.3, 3.0, 0.8, 0.85], [0.5, 3.9, -0.7, 0.8]];
  spots.forEach(([x, y, z, s], i) => mesh(g, tint(leafGeos[(i + v) % 3], pal[i % pal.length]), leaf, [x, y, z], [s, s * 0.86, s]));
  return g;
};

P.birch = () => {
  const g = new THREE.Group();
  const bark = stdMat('#e8e4dc', { roughness: 0.8 });
  mesh(g, V.taper, bark, [0, 2.2, 0], [0.16, 4.4, 0.16]);
  for (let i = 0; i < 8; i++) mesh(g, V.box, stdMat('#2a2a2a'), [0, 0.6 + i * 0.5, 0.15], [0.12, 0.04, 0.03], [0, i, 0]);
  const leaf = LEAF();
  [[0, 4.4, 0, 1.1], [0.5, 3.8, 0.2, 0.8], [-0.45, 4.0, -0.2, 0.85], [0, 5.1, 0, 0.7]].forEach(([x, y, z, s], i) => mesh(g, tint(leafGeos[i % 3], ['#a8c84a', '#c0d860', '#98b840'][i % 3]), leaf, [x, y, z], [s, s * 1.1, s]));
  return g;
};

P.pine = (v = 0, snow = false) => {
  const g = new THREE.Group();
  mesh(g, V.taper, BARK(), [0, 1.1, 0], [0.2, 2.2, 0.2]);
  const leaf = LEAF();
  const cone = jitter(V.cone8, 0.06, 5 + v);
  [[1.7, 2.2, 1.6], [1.38, 2.0, 3.0], [1.02, 1.8, 4.3], [0.62, 1.5, 5.4]].forEach(([r, h, y], i) => {
    mesh(g, tint(cone, i % 2 ? '#3a7d4f' : '#2f6b44', { top: 1.1, bottom: 0.6 }), leaf, [0, y, 0], [r, h, r], [0, i * 0.4, 0]);
    if (snow) mesh(g, tint(cone, '#f4f8ff', { top: 1.05, bottom: 0.9, noise: 0.03 }), leaf, [0, y + h * 0.18, 0], [r * 0.82, h * 0.66, r * 0.82], [0, i * 0.4 + 0.2, 0]);
  });
  return g;
};

P.palm = () => {
  const g = new THREE.Group();
  const bark = stdMat('#a8865a', { roughness: 0.9 });
  let x = 0, y = 0;
  for (let i = 0; i < 8; i++) {
    const nx = x + 0.12 + i * 0.02, ny = y + 0.75;
    mesh(g, V.taper, bark, [(x + nx) / 2, (y + ny) / 2, 0], [0.2 - i * 0.012, 0.8, 0.2 - i * 0.012], [0, 0, -0.15 - i * 0.02]);
    x = nx; y = ny;
  }
  const leaf = SMOOTHLEAF();
  const frond = tint(new THREE.SphereGeometry(1, 10, 6), '#3a9a3a', { top: 1.15, bottom: 0.7 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mesh(g, frond, leaf, [x + Math.cos(a) * 1.1, y - 0.25, Math.sin(a) * 1.1], [1.3, 0.08, 0.32], [0, -a, -0.45]);
  }
  for (let i = 0; i < 3; i++) mesh(g, V.sphere, stdMat('#6a4a2a'), [x + Math.cos(i * 2) * 0.22, y - 0.25, Math.sin(i * 2) * 0.22], 0.17);
  return g;
};

P.cactus = (v = 0) => {
  const g = new THREE.Group();
  const m = stdMat('#3f8a44', { roughness: 0.7 });
  if (v % 2 === 0) {
    mesh(g, new THREE.CapsuleGeometry(0.32, 2.6, 6, 12), m, [0, 1.6, 0]);
    for (const s of [-1, 1]) {
      mesh(g, new THREE.CapsuleGeometry(0.2, 0.5, 6, 10), m, [s * 0.45, 1.5, 0], 1, [0, 0, s * Math.PI / 2]);
      mesh(g, new THREE.CapsuleGeometry(0.2, 0.7 + (s > 0 ? 0.3 : 0), 6, 10), m, [s * 0.75, 1.9 + (s > 0 ? 0.15 : 0), 0]);
    }
    mesh(g, V.sphere, stdMat('#ff7aa2'), [0, 3.05, 0], 0.14);
  } else {
    mesh(g, new THREE.SphereGeometry(0.6, 14, 10), m, [0, 0.45, 0], [1, 0.8, 1]);
    for (let i = 0; i < 4; i++) mesh(g, V.sphere, stdMat(['#ffd23f', '#ff7aa2'][i % 2]), [Math.cos(i * 1.6) * 0.2, 0.92, Math.sin(i * 1.6) * 0.2], 0.08);
  }
  return g;
};

P.deadtree = (charred = false) => {
  const g = new THREE.Group();
  const bark = stdMat(charred ? '#2a2422' : '#6a5a48', { roughness: 0.95 });
  mesh(g, V.taper, bark, [0, 1.6, 0], [0.22, 3.2, 0.22]);
  [[0.5, 2.6, 0, -0.8, 1.4], [-0.45, 2.3, 0.2, 0.9, 1.2], [0.1, 3.3, -0.4, 0.5, 1.0], [-0.2, 3.6, 0.3, -0.4, 0.8]].forEach(([x, y, z, r, l]) => mesh(g, V.taper, bark, [x, y, z], [0.05, l, 0.05], [z, 0, r]));
  if (charred) for (let i = 0; i < 4; i++) mesh(g, V.sphere, new THREE.MeshStandardMaterial({ color: '#ff6a2a', emissive: '#ff4a10', emissiveIntensity: 1.5 }), [Math.cos(i) * 0.15, 0.5 + i * 0.6, Math.sin(i) * 0.2], 0.04).castShadow = false;
  return g;
};

P.willow = () => {
  const g = new THREE.Group();
  mesh(g, V.taper, stdMat('#4a3e30', { roughness: 0.95 }), [0, 1.4, 0], [0.3, 2.8, 0.3]);
  const leaf = LEAF();
  mesh(g, tint(leafGeos[0], '#5a7a4a'), leaf, [0, 3.4, 0], [2.1, 1.2, 2.1]);
  const drape = tint(new THREE.CylinderGeometry(1, 1.5, 1, 14, 1, true), '#4a6a3a', { top: 1, bottom: 0.55 });
  const dm = stdMat('#ffffff', { roughness: 0.9, vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  mesh(g, drape, dm, [0, 2.2, 0], [1.6, 2.2, 1.6]);
  return g;
};

P.mushroom = (v = 0) => {
  const g = new THREE.Group();
  const caps = ['#d9485f', '#8a5ac0', '#e8a030'];
  mesh(g, new THREE.CylinderGeometry(0.25, 0.35, 1, 12), stdMat('#f4ece0', { roughness: 0.7 }), [0, 1.2, 0], [1, 2.4, 1]);
  mesh(g, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), stdMat(caps[v % 3], { roughness: 0.5 }), [0, 2.3, 0], [1.4, 0.9, 1.4]);
  for (let i = 0; i < 7; i++) mesh(g, V.sphere, stdMat('#ffffff'), [Math.cos(i * 0.9) * 0.9 * (i % 2 ? 0.6 : 1), 2.7 + (i % 2) * 0.25, Math.sin(i * 0.9) * 0.9 * (i % 2 ? 0.6 : 1)], [0.14, 0.06, 0.14]);
  return g;
};

P.bush = (v = 0, pal = ['#4c8a3c', '#5a9a42', '#3f7d3a']) => {
  const g = new THREE.Group();
  const leaf = LEAF();
  mesh(g, tint(leafGeos[v % 3], pal[v % 3]), leaf, [0, 0.45, 0], [0.75, 0.6, 0.75]);
  mesh(g, tint(leafGeos[(v + 1) % 3], pal[(v + 1) % 3]), leaf, [0.45, 0.35, 0.2], [0.5, 0.42, 0.5]);
  mesh(g, tint(leafGeos[(v + 2) % 3], pal[(v + 2) % 3]), leaf, [-0.4, 0.32, -0.15], [0.5, 0.4, 0.5]);
  return g;
};

P.berrybush = () => {
  const g = P.bush(1, ['#3a7a34', '#4a8a3a', '#2f6a2e']);
  const berry = new THREE.MeshPhysicalMaterial({ color: '#3a6aff', roughness: 0.2, clearcoat: 1 });
  for (let i = 0; i < 9; i++) mesh(g, V.sphere, berry, [Math.cos(i * 0.7) * 0.55, 0.3 + (i % 3) * 0.2, Math.sin(i * 0.7) * 0.55], 0.08);
  return g;
};

P.rock = (v = 0, color = '#8f8a84', moss = '#6d8f4a') => {
  const g = new THREE.Group();
  const geo = rockGeos[v % 3].clone();
  const n = geo.attributes.normal;
  const base = new THREE.Color(color), m = new THREE.Color(moss), c = new THREE.Color();
  const cols = [];
  for (let k = 0; k < n.count; k++) {
    c.copy(base).lerp(m, THREE.MathUtils.smoothstep(n.getY(k), 0.55, 0.95) * (moss ? 0.85 : 0));
    const vv = 0.88 + Math.random() * 0.24;
    cols.push(c.r * vv, c.g * vv, c.b * vv);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  mesh(g, geo, stdMat('#ffffff', { roughness: 0.92, flatShading: true, vertexColors: true }), [0, 0.45, 0], [1.1, 0.75, 0.95], [0, v, 0]);
  return g;
};

P.flower = (color) => {
  const g = new THREE.Group();
  mesh(g, V.cyl8, stdMat('#3e7a35'), [0, 0.15, 0], [0.015, 0.3, 0.015]).castShadow = false;
  for (let i = 0; i < 5; i++) mesh(g, V.sphere, stdMat(color, { roughness: 0.6 }), [Math.cos(i * 1.256) * 0.05, 0.31, Math.sin(i * 1.256) * 0.05], [0.045, 0.018, 0.045]).castShadow = false;
  mesh(g, V.sphere, stdMat('#ffd84a', { roughness: 0.5 }), [0, 0.325, 0], [0.025, 0.02, 0.025]).castShadow = false;
  return g;
};

P.fern = () => {
  const g = new THREE.Group();
  const m = stdMat('#ffffff', { roughness: 0.8, vertexColors: true, side: THREE.DoubleSide });
  const leaf = tint(new THREE.SphereGeometry(1, 8, 6), '#3a8a3a');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    mesh(g, leaf, m, [Math.cos(a) * 0.35, 0.3, Math.sin(a) * 0.35], [0.45, 0.04, 0.12], [0, -a, 0.6]).castShadow = false;
  }
  return g;
};

P.reeds = () => {
  const g = new THREE.Group();
  const m = stdMat('#6a8a3a', { roughness: 0.8 });
  const top = stdMat('#6a4a2a');
  for (let i = 0; i < 7; i++) {
    const x = Math.cos(i * 2.3) * 0.3, z = Math.sin(i * 2.3) * 0.3, h = 1.1 + (i % 3) * 0.3;
    mesh(g, V.cyl8, m, [x, h / 2, z], [0.02, h, 0.02], [Math.sin(i) * 0.1, 0, Math.cos(i) * 0.1]).castShadow = false;
    if (i % 2) mesh(g, new THREE.CapsuleGeometry(0.04, 0.2, 4, 6), top, [x, h, z]).castShadow = false;
  }
  return g;
};

P.lilypad = () => {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16, 0.3, Math.PI * 1.8), stdMat('#3a8a3a', { roughness: 0.6, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.02;
  g.add(pad);
  mesh(g, V.sphere, stdMat('#ff9ad5'), [0.15, 0.08, 0.1], [0.1, 0.07, 0.1]).castShadow = false;
  return g;
};

P.log = () => {
  const g = new THREE.Group();
  mesh(g, V.cyl8, BARK(), [0, 0.3, 0], [0.3, 2.4, 0.3], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) mesh(g, V.cyl8, stdMat('#c8a070'), [s * 1.2, 0.3, 0], [0.28, 0.02, 0.28], [0, 0, Math.PI / 2]);
  return g;
};

P.stump = () => {
  const g = new THREE.Group();
  mesh(g, V.taper, BARK(), [0, 0.3, 0], [0.45, 0.6, 0.45]);
  mesh(g, V.cyl8, stdMat('#c8a070'), [0, 0.61, 0], [0.42, 0.02, 0.42]);
  return g;
};

P.crystal = (color = '#9a7aff', h = 1) => {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.15, flatShading: true });
  const geo = new THREE.OctahedronGeometry(1, 0);
  [[0, 0.6, 0, 0.25, 0.9], [0.3, 0.4, 0.1, 0.16, 0.6, 0.4], [-0.25, 0.35, -0.1, 0.14, 0.5, -0.4], [0.05, 0.3, 0.3, 0.12, 0.4, 0.3]]
    .forEach(([x, y, z, r, hh, tz = 0]) => mesh(g, geo, m, [x, y * h, z], [r, hh * h, r], [0, 0, tz]).castShadow = false);
  return g;
};

P.stalagmite = () => {
  const g = new THREE.Group();
  const m = stdMat('#6a625a', { roughness: 0.95, flatShading: true });
  const geo = jitter(V.cone8, 0.08, 9);
  mesh(g, geo, m, [0, 1.2, 0], [0.5, 2.4, 0.5]);
  mesh(g, geo, m, [0.5, 0.6, 0.2], [0.3, 1.2, 0.3]);
  return g;
};

P.icespike = () => {
  const g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color: '#cfefff', emissive: '#5fc0ff', emissiveIntensity: 0.25, roughness: 0.05, clearcoat: 1, flatShading: true, transparent: true, opacity: 0.88 });
  const geo = new THREE.ConeGeometry(1, 1, 5);
  [[0, 0, 0.4, 2.2], [0.5, 0.2, 0.25, 1.4], [-0.4, -0.2, 0.25, 1.2]].forEach(([x, z, r, h]) => mesh(g, geo, m, [x, h / 2, z], [r, h, r], [x * 0.3, 0, z * 0.3]));
  return g;
};

P.bones = () => {
  const g = new THREE.Group();
  const m = stdMat('#f0e8d8', { roughness: 0.7 });
  mesh(g, V.sphere, m, [0, 0.35, 0], [0.45, 0.35, 0.55]);
  for (let i = 0; i < 4; i++) mesh(g, V.cyl8, m, [-0.3 + i * 0.2, 0.15, 0.6 + i * 0.1], [0.04, 0.8, 0.04], [Math.PI / 2, 0, 0.2 * i]);
  return g;
};

P.shell = () => {
  const g = new THREE.Group();
  mesh(g, new THREE.ConeGeometry(0.2, 0.3, 7), stdMat('#ffd8c8', { roughness: 0.5 }), [0, 0.08, 0], 1, [Math.PI / 2, 0, 0.3]).castShadow = false;
  return g;
};

P.pillar = (broken = false) => {
  const g = new THREE.Group();
  const m = stdMat('#d8c8a8', { roughness: 0.9 });
  mesh(g, V.box, m, [0, 0.2, 0], [1.1, 0.4, 1.1]);
  mesh(g, V.cyl8, m, [0, broken ? 1.3 : 2.4, 0], [0.4, broken ? 2.2 : 4.4, 0.4]);
  if (!broken) mesh(g, V.box, m, [0, 4.7, 0], [1.1, 0.4, 1.1]);
  return g;
};

P.lavarock = () => {
  const g = new THREE.Group();
  g.add(P.rock(1, '#3a3232', null));
  for (let i = 0; i < 3; i++) mesh(g, V.box, new THREE.MeshStandardMaterial({ color: '#ff5a10', emissive: '#ff3a00', emissiveIntensity: 2 }), [Math.cos(i * 2) * 0.4, 0.5 + i * 0.1, Math.sin(i * 2) * 0.4], [0.5, 0.04, 0.06], [0, i, 0.3]).castShadow = false;
  return g;
};

export const VEG = P;

/** Instancie un prototype à de nombreuses positions : un InstancedMesh par matériau. */
export function instanceFromPrototype(proto, matrices, { castShadow = true, receiveShadow = true } = {}) {
  const group = new THREE.Group();
  if (!matrices.length) return group;
  const { buckets } = bucketsByMaterial(proto);
  for (const [mat, b] of buckets) {
    const geo = b.geos.length === 1 ? b.geos[0] : mergeAll(b.geos);
    const im = new THREE.InstancedMesh(geo, mat, matrices.length);
    for (let i = 0; i < matrices.length; i++) im.setMatrixAt(i, matrices[i]);
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = castShadow && b.cast;
    im.receiveShadow = receiveShadow;
    im.computeBoundingSphere();
    group.add(im);
  }
  return group;
}

function mergeAll(geos) {
  const n = geos.reduce((a, g) => a + g.attributes.position.count, 0);
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(geos[0].attributes)) {
    const size = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(n * size);
    let off = 0;
    for (const g of geos) { if (g.attributes[name]) arr.set(g.attributes[name].array, off); off += g.attributes.position.count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
