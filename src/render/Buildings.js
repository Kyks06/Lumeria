import * as THREE from 'three';
import { stdMat, NIGHT, addRim } from './Materials.js';
import { surfaceTexture, labelTexture, emblemTexture } from './Textures.js';
import { texturedBox, gable, gableRoof } from './Geometry.js';
import { TYPES } from '../config/types.js';

/**
 * BÂTIMENTS EXTÉRIEURS
 * buildBuilding(kind, style, opts) → { group, w, d, h, door:{x,z}, lights:[Vector3], chimneys:[Vector3], spinners:[] }
 * La porte est toujours au centre de la façade avant (+Z). Le style dépend de la ville.
 */
export const STYLES = {
  village:  { wall: 'plaster', wallColor: '#f2e8d4', roof: 'rooftiles', roofColor: '#c8553d', trim: '#6b4a33', base: '#8a8378' },
  foret:    { wall: 'planks', wallColor: '#c89a6a', roof: 'shingles', roofColor: '#5a7a3a', trim: '#4a3020', base: '#6a6258' },
  port:     { wall: 'plaster', wallColor: '#f6f6f2', roof: 'rooftiles', roofColor: '#2f6fb8', trim: '#2a4a7a', base: '#b8b0a2' },
  montagne: { wall: 'stone', wallColor: '#d8d2c8', roof: 'slate', roofColor: '#5a6070', trim: '#4a4038', base: '#6a6258' },
  desert:   { wall: 'adobe', wallColor: '#e8c89a', roof: 'flat', roofColor: '#c8a070', trim: '#8a5a30', base: '#c8a878' },
  marais:   { wall: 'planks', wallColor: '#8a7a5a', roof: 'shingles', roofColor: '#4a5a3a', trim: '#3a3020', base: '#5a5440', stilts: true },
  neige:    { wall: 'logs', wallColor: '#e8d8c8', roof: 'slate', roofColor: '#f4f8ff', trim: '#5a3a24', base: '#7a7470', snowRoof: true },
  volcan:   { wall: 'stone', wallColor: '#7a6a62', roof: 'slate', roofColor: '#3a2e2e', trim: '#ff6a2a', base: '#3a3232' },
  cite:     { wall: 'panel', wallColor: '#eef2f8', roof: 'flat', roofColor: '#c8d0e0', trim: '#5a6cff', base: '#a8b0c0', modern: true },
  ligue:    { wall: 'stone', wallColor: '#f4f0e6', roof: 'slate', roofColor: '#2a3a7a', trim: '#ffd23f', base: '#c8c0b0' },
};

const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 12),
  sphere: new THREE.SphereGeometry(1, 18, 12),
  hemi: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  torus: new THREE.TorusGeometry(1, 0.1, 8, 32),
  octa: new THREE.OctahedronGeometry(1, 0),
};

const surfMats = new Map();
function surfMat(kind, color, opts = {}) {
  const k = `${kind}:${color}:${JSON.stringify(opts)}`;
  if (!surfMats.has(k)) surfMats.set(k, new THREE.MeshStandardMaterial({ map: surfaceTexture(kind), color, roughness: 0.85, ...opts }));
  return surfMats.get(k);
}

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

function addWindow(g, x, y, z, ry, st, w = 1.1, h = 1.0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.rotation.y = ry;
  g.add(p);
  const trim = stdMat(st.modern ? '#c8d0e0' : '#f4efe6', { roughness: 0.6 });
  mesh(p, G.box, trim, [0, 0, 0], [w + 0.16, h + 0.16, 0.1]);
  mesh(p, G.box, NIGHT.window, [0, 0, 0.04], [w, h, 0.06]).castShadow = false;
  mesh(p, G.box, trim, [0, 0, 0.08], [0.06, h, 0.03]);
  mesh(p, G.box, trim, [0, 0, 0.08], [w, 0.06, 0.03]);
  mesh(p, G.box, trim, [0, -h / 2 - 0.09, 0.12], [w + 0.3, 0.07, 0.24]);
  if (!st.modern) {
    const shutter = stdMat(st.trim, { roughness: 0.7 });
    for (const s of [-1, 1]) mesh(p, G.box, shutter, [s * (w / 2 + 0.24), 0, 0.03], [0.3, h + 0.1, 0.05]);
    if (Math.random() < 0.6) {
      mesh(p, G.box, stdMat('#6a4a2a'), [0, -h / 2 - 0.2, 0.25], [w * 0.9, 0.18, 0.22]);
      const cols = ['#ff7aa2', '#ffd23f', '#ffffff', '#9a7dff', '#ff8a3a'];
      for (let i = 0; i < 5; i++) mesh(p, G.sphere, stdMat(cols[(((i + Math.floor(x * 3)) % 5) + 5) % 5], { roughness: 0.6 }), [(-0.4 + i * 0.2) * w, -h / 2 - 0.06, 0.27], 0.07);
    }
  }
}

function addDoor(g, w, d, st, { width = 1.3, height = 2.2, color, double = false, glass = false } = {}) {
  const z = d / 2;
  const frame = stdMat(st.trim, { roughness: 0.6 });
  mesh(g, G.box, frame, [0, height / 2 + 0.3, z + 0.04], [width + 0.3, height + 0.2, 0.14]);
  const doorMat = glass ? new THREE.MeshPhysicalMaterial({ color: '#9fd0ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1 }) : stdMat(color || '#6b4226', { roughness: 0.55 });
  if (double) for (const s of [-1, 1]) mesh(g, G.box, doorMat, [s * width / 4, height / 2 + 0.3, z + 0.1], [width / 2 - 0.04, height, 0.06]);
  else mesh(g, G.box, doorMat, [0, height / 2 + 0.3, z + 0.1], [width, height, 0.06]);
  if (!glass) mesh(g, G.sphere, stdMat('#e0b04a', { metalness: 0.9, roughness: 0.3 }), [width * 0.3, height * 0.5 + 0.3, z + 0.15], 0.06);
  mesh(g, G.box, stdMat(st.base, { roughness: 0.9 }), [0, 0.12, z + 0.55], [width + 0.9, 0.24, 1.0]);
  // lanterne de porte
  const lamp = mesh(g, G.box, NIGHT.lamp, [width / 2 + 0.45, height + 0.1, z + 0.18], [0.18, 0.26, 0.18]);
  lamp.castShadow = false;
  mesh(g, G.cone, stdMat('#2a2d36', { metalness: 0.7, roughness: 0.4 }), [width / 2 + 0.45, height + 0.32, z + 0.18], [0.16, 0.14, 0.16]);
  return new THREE.Vector3(width / 2 + 0.45, height + 0.1, z + 0.5);
}

/** Corps de bâtiment : soubassement, murs texturés, fenêtres sur chaque face. */
function shell(g, w, d, h, st, { windows = true, floors = 1 } = {}) {
  const base = surfMat('stone', st.base);
  const wall = surfMat(st.wall, st.wallColor);
  mesh(g, texturedBox(w + 0.3, 0.6, d + 0.3, 1.5), base, [0, 0.3, 0]);
  mesh(g, texturedBox(w, h, d, 2.2), wall, [0, h / 2 + 0.5, 0]);
  if (st.wall === 'plaster' || st.wall === 'adobe' || st.wall === 'panel') {
    const trim = stdMat(st.trim, { roughness: 0.7 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(g, G.box, trim, [sx * w / 2, h / 2 + 0.5, sz * d / 2], [0.22, h, 0.22]);
    mesh(g, G.box, trim, [0, h + 0.45, 0], [w + 0.1, 0.16, d + 0.1]);
  }
  if (!windows) return;
  for (let f = 0; f < floors; f++) {
    const y = 0.5 + (h / floors) * (f + 0.6);
    const nx = Math.max(1, Math.floor(w / 3.2));
    for (let i = 0; i < nx; i++) {
      const x = -w / 2 + (w / nx) * (i + 0.5);
      if (f === 0 && Math.abs(x) < 1.4) continue;
      addWindow(g, x, y, d / 2 + 0.02, 0, st);
      addWindow(g, x, y, -d / 2 - 0.02, Math.PI, st);
    }
    const nz = Math.max(1, Math.floor(d / 3.4));
    for (let i = 0; i < nz; i++) {
      const z = -d / 2 + (d / nz) * (i + 0.5);
      addWindow(g, w / 2 + 0.02, y, z, Math.PI / 2, st);
      addWindow(g, -w / 2 - 0.02, y, z, -Math.PI / 2, st);
    }
  }
}

function roof(g, w, d, h, st, { color } = {}) {
  const top = h + 0.5;
  const chimneys = [];
  if (st.roof === 'flat') {
    const rm = stdMat(color || st.roofColor, { roughness: 0.8 });
    mesh(g, G.box, rm, [0, top + 0.12, 0], [w + 0.5, 0.24, d + 0.5]);
    mesh(g, G.box, rm, [0, top + 0.42, d / 2 + 0.1], [w + 0.5, 0.4, 0.2]);
    mesh(g, G.box, rm, [0, top + 0.42, -d / 2 - 0.1], [w + 0.5, 0.4, 0.2]);
    if (!st.modern) for (let i = 0; i < 4; i++) mesh(g, G.cylLow, stdMat('#8a5a30'), [-w / 2 + 0.5 + i * (w - 1) / 3, top - 0.1, d / 2 + 0.35], [0.09, 0.09, 0.8], [Math.PI / 2, 0, 0]);
    return { top: top + 0.6, chimneys };
  }
  const rise = Math.min(3.2, w * 0.38);
  const rm = surfMat(st.roof, color || st.roofColor, { roughness: 0.62 });
  const r = gableRoof(w, d, rise, 0.55, rm);
  r.position.y = top;
  g.add(r);
  const gm = surfMat(st.wall, st.wallColor);
  for (const s of [-1, 1]) {
    const gb = new THREE.Mesh(gable(w, rise, 0.2), gm);
    gb.position.set(0, top, s * (d / 2 - 0.1));
    gb.castShadow = true;
    gb.receiveShadow = true;
    g.add(gb);
  }
  if (st.snowRoof) {
    const snow = stdMat('#ffffff', { roughness: 0.9 });
    const sr = gableRoof(w, d, rise, 0.62, snow, 2, 0.12);
    sr.position.y = top + 0.12;
    g.add(sr);
  }
  const cx = w * 0.26, cz = -d * 0.18;
  mesh(g, texturedBox(0.7, 1.8, 0.7, 1), surfMat('brick', '#ffffff'), [cx, top + rise * 0.55 + 0.4, cz]);
  mesh(g, G.box, stdMat('#3a3232'), [cx, top + rise * 0.55 + 1.35, cz], [0.8, 0.12, 0.8]);
  chimneys.push(new THREE.Vector3(cx, top + rise * 0.55 + 1.5, cz));
  return { top: top + rise, chimneys };
}

function sign(g, text, y, z, w = 3.4, bg = '#1b2338', fg = '#ffe9b8') {
  const m = mesh(g, G.box, new THREE.MeshStandardMaterial({ map: labelTexture(text, { bg, fg }), roughness: 0.5 }), [0, y, z], [w, w / 4, 0.1]);
  m.castShadow = false;
  return m;
}

function stilts(g, w, d) {
  const wood = stdMat('#5a4630', { roughness: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) mesh(g, G.cylLow, wood, [sx * (w / 2 - 0.3), -0.8, sz * (d / 2 - 0.3)], [0.18, 2.2, 0.18]);
}

// ═══ TYPES DE BÂTIMENTS ═══════════════════════════════════════════════
const BUILDERS = {
  house(st, o) {
    const g = new THREE.Group();
    const w = o.w || 7, d = o.d || 6.5, h = o.h || 3.4;
    if (st.stilts) stilts(g, w, d);
    shell(g, w, d, h, st);
    const lamp = addDoor(g, w, d, st, { color: o.doorColor });
    const { top, chimneys } = roof(g, w, d, h, st, { color: o.roofColor });
    return { group: g, w: w + 0.3, d: d + 0.3, h: top, lights: [lamp], chimneys };
  },
  bighouse(st, o) {
    const g = new THREE.Group();
    const w = o.w || 9.5, d = o.d || 8, h = o.h || 6;
    shell(g, w, d, h, st, { floors: 2 });
    mesh(g, G.box, stdMat(st.trim), [0, h / 2 + 0.5, d / 2 + 0.06], [w, 0.18, 0.1]);
    const lamp = addDoor(g, w, d, st, { color: o.doorColor, double: true, width: 1.8 });
    const { top, chimneys } = roof(g, w, d, h, st, { color: o.roofColor });
    return { group: g, w: w + 0.3, d: d + 0.3, h: top, lights: [lamp], chimneys };
  },
  center(st) {
    const g = new THREE.Group();
    const w = 11, d = 9, h = 4.4;
    const sst = { ...st, wall: 'plaster', wallColor: '#fbf7f2', roof: st.roof === 'flat' ? 'flat' : 'rooftiles', roofColor: '#ff5c8a', trim: '#ff5c8a' };
    shell(g, w, d, h, sst);
    const lamp = addDoor(g, w, d, sst, { glass: true, double: true, width: 2.2 });
    const { top } = roof(g, w, d, h, sst);
    sign(g, 'CENTRE DE SOIN', 3.95, d / 2 + 0.12, 4.2, '#ff5c8a', '#ffffff');
    const emblem = new THREE.Group();
    emblem.position.set(0, top + 0.9, d / 2 - 0.4);
    g.add(emblem);
    const ring = new THREE.MeshStandardMaterial({ color: '#ff8fb1', emissive: '#ff5c8a', emissiveIntensity: 2.4, roughness: 0.3 });
    mesh(emblem, G.torus, ring, [0, 0, 0], 0.6).castShadow = false;
    mesh(emblem, G.octa, ring, [0, 0, 0], [0.28, 0.42, 0.12]).castShadow = false;
    return { group: g, w: w + 0.3, d: d + 0.3, h: top, lights: [lamp], chimneys: [], spinners: [emblem] };
  },
  shop(st) {
    const g = new THREE.Group();
    const w = 9.5, d = 7.5, h = 4;
    const sst = { ...st, roofColor: '#3f7cff' };
    shell(g, w, d, h, sst);
    const lamp = addDoor(g, w, d, sst, { glass: true, double: true, width: 2 });
    const { top } = roof(g, w, d, h, sst);
    sign(g, 'BOUTIQUE', 3.65, d / 2 + 0.12, 3.6, '#2f5fd0', '#ffe9b8');
    const blue = stdMat('#3f7cff', { roughness: 0.7 }), white = stdMat('#f8f6f0', { roughness: 0.7 });
    for (let i = 0; i < 9; i++) mesh(g, G.box, i % 2 ? white : blue, [-3.2 + i * 0.8, 3.0, d / 2 + 0.75], [0.8, 0.06, 1.5], [0.35, 0, 0]);
    return { group: g, w: w + 0.3, d: d + 0.3, h: top, lights: [lamp], chimneys: [] };
  },
  gym(st, o) {
    const g = new THREE.Group();
    const w = 16, d = 14, h = 6.5;
    const type = TYPES[o.type] || TYPES.normal;
    const sst = { ...st, roof: 'flat', roofColor: type.color, trim: type.color };
    shell(g, w, d, h, sst, { windows: false });
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 1.6 + i * ((w - 3.2) / 5);
      if (Math.abs(x) < 2.5) continue;
      mesh(g, G.box, stdMat(type.color, { roughness: 0.5 }), [x, h / 2 + 0.5, d / 2 + 0.1], [0.6, h, 0.25]);
    }
    const lamp = addDoor(g, w, d, sst, { double: true, width: 3, height: 3.2, color: '#2a2a3a' });
    const { top } = roof(g, w, d, h, sst);
    sign(g, `ARÈNE ${o.town ? '' : ''}${(o.label || '').toUpperCase()}`.trim(), 4.4, d / 2 + 0.16, 5.2, '#1b2338', type.color);
    // emblème du type au-dessus de l'entrée
    const em = mesh(g, G.cyl, new THREE.MeshStandardMaterial({ map: emblemTexture(type.color, '◆'), transparent: true, emissive: type.color, emissiveIntensity: 0.4, roughness: 0.4 }), [0, h + 1.6, d / 2 - 0.2], [1.2, 0.12, 1.2], [Math.PI / 2, 0, 0]);
    em.castShadow = false;
    const crystalMat = new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 2.2, roughness: 0.2 });
    const spinners = [];
    for (const s of [-1, 1]) {
      mesh(g, G.cylLow, stdMat('#3a3a44', { metalness: 0.4 }), [s * (w / 2 + 0.6), 2.2, d / 2 + 0.8], [0.35, 4.4, 0.35]);
      const c = mesh(g, G.octa, crystalMat, [s * (w / 2 + 0.6), 4.9, d / 2 + 0.8], [0.4, 0.7, 0.4]);
      c.castShadow = false;
      spinners.push(c);
    }
    return { group: g, w: w + 0.3, d: d + 0.3, h: top + 2, lights: [lamp], chimneys: [], spinners };
  },
  lab(st) {
    const g = new THREE.Group();
    const w = 13, d = 9, h = 4.6;
    const sst = { ...st, wall: 'panel', wallColor: '#f4f6fa', roof: 'flat', roofColor: '#3a7bd5', trim: '#3a7bd5', modern: true };
    shell(g, w, d, h, sst);
    const lamp = addDoor(g, w, d, sst, { glass: true, double: true, width: 2.2 });
    const { top } = roof(g, w, d, h, sst);
    sign(g, 'LABORATOIRE', 4.15, d / 2 + 0.12, 4.2, '#3a7bd5', '#ffffff');
    const dish = new THREE.Group();
    dish.position.set(w * 0.3, top + 0.2, -d * 0.2);
    g.add(dish);
    mesh(dish, G.cylLow, stdMat('#c0c8d0', { metalness: 0.6 }), [0, 0.5, 0], [0.12, 1, 0.12]);
    mesh(dish, G.hemi, stdMat('#e8eef4', { metalness: 0.4, side: THREE.DoubleSide }), [0, 1.2, 0], [0.9, 0.4, 0.9], [Math.PI * 0.75, 0, 0]);
    return { group: g, w: w + 0.3, d: d + 0.3, h: top, lights: [lamp], chimneys: [], spinners: [dish] };
  },
  daycare(st) {
    const r = BUILDERS.bighouse({ ...st, roofColor: '#7dc860' }, { w: 10, d: 8, h: 5.4 });
    sign(r.group, 'PENSION', 5.6, 4.15, 3.2, '#4a8a2a', '#fff6e6');
    return r;
  },
  tower(st) {
    const g = new THREE.Group();
    const w = 12, d = 12, h = 22;
    const sst = { ...st, wall: 'panel', wallColor: '#e8ecf6', roof: 'flat', roofColor: '#2a3a7a', trim: '#ffd23f', modern: true };
    shell(g, w, d, h, sst, { floors: 5 });
    const lamp = addDoor(g, w, d, sst, { glass: true, double: true, width: 3, height: 3 });
    const { top } = roof(g, w, d, h, sst);
    sign(g, 'TOUR DE COMBAT', 4.2, d / 2 + 0.12, 5, '#2a3a7a', '#ffd23f');
    const beacon = mesh(g, G.octa, new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb547', emissiveIntensity: 3, roughness: 0.2 }), [0, top + 1.5, 0], [0.8, 1.4, 0.8]);
    beacon.castShadow = false;
    return { group: g, w: w + 0.3, d: d + 0.3, h: top + 3, lights: [lamp], chimneys: [], spinners: [beacon] };
  },
  dept(st) {
    const g = new THREE.Group();
    const w = 16, d = 11, h = 12;
    const sst = { ...st, wall: 'panel', wallColor: '#f6f2ea', roof: 'flat', roofColor: '#ff7a3a', trim: '#ff7a3a', modern: true };
    shell(g, w, d, h, sst, { floors: 3 });
    const lamp = addDoor(g, w, d, sst, { glass: true, double: true, width: 3.2 });
    const { top } = roof(g, w, d, h, sst);
    sign(g, 'GRAND MAGASIN', 4.0, d / 2 + 0.12, 5.4, '#ff7a3a', '#ffffff');
    return { group: g, w: w + 0.3, d: d + 0.3, h: top, lights: [lamp], chimneys: [] };
  },
  lighthouse(st) {
    const g = new THREE.Group();
    const red = stdMat('#d8402a', { roughness: 0.6 }), white = stdMat('#f6f6f2', { roughness: 0.6 });
    for (let i = 0; i < 6; i++) mesh(g, G.cyl, i % 2 ? red : white, [0, 1.5 + i * 3, 0], [2.6 - i * 0.22, 3, 2.6 - i * 0.22]);
    const lampM = mesh(g, G.cyl, NIGHT.lamp, [0, 19.5, 0], [1.2, 1.6, 1.2]);
    lampM.castShadow = false;
    mesh(g, G.cone, red, [0, 21, 0], [1.6, 1.4, 1.6]);
    mesh(g, G.box, stdMat('#3a3a3a'), [0, 1.2, 2.5], [1.2, 2.2, 0.2]);
    return { group: g, w: 5.4, d: 5.4, h: 22, lights: [new THREE.Vector3(0, 19.5, 0)], chimneys: [], door: { x: 0, z: 2.7 } };
  },
  warehouse(st) {
    const g = new THREE.Group();
    const w = 16, d = 12, h = 6;
    const sst = { ...st, wall: 'metal', wallColor: '#a8b0b8', roof: 'flat', roofColor: '#6a7078', trim: '#3a4048' };
    mesh(g, texturedBox(w, h, d, 2), surfMat('metal', '#a8b0b8'), [0, h / 2, 0]);
    mesh(g, G.box, stdMat('#6a7078', { metalness: 0.5 }), [0, h + 0.2, 0], [w + 0.4, 0.4, d + 0.4]);
    mesh(g, G.box, stdMat('#4a5058', { metalness: 0.6 }), [0, 2, d / 2 + 0.05], [4.4, 4, 0.1]);
    for (let i = 0; i < 8; i++) mesh(g, G.box, stdMat('#3a4048'), [0, 0.3 + i * 0.5, d / 2 + 0.12], [4.4, 0.05, 0.04]);
    sign(g, 'ENTREPÔT 3', 4.6, d / 2 + 0.12, 3, '#3a4048', '#ffd23f');
    return { group: g, w, d, h: h + 0.5, lights: [], chimneys: [] };
  },
  powerplant(st) {
    const g = new THREE.Group();
    const w = 18, d = 14, h = 7;
    mesh(g, texturedBox(w, h, d, 2), surfMat('panel', '#d8dce4'), [0, h / 2, 0]);
    mesh(g, G.box, stdMat('#ffd23f'), [0, h + 0.2, 0], [w + 0.4, 0.4, d + 0.4]);
    const spinners = [];
    for (let i = 0; i < 3; i++) {
      mesh(g, G.cyl, stdMat('#a8b0bc', { metalness: 0.4 }), [-5 + i * 5, h + 3, -3], [1.2, 6, 1.2]);
      const bolt = mesh(g, G.octa, new THREE.MeshStandardMaterial({ color: '#ffe14a', emissive: '#ffd23f', emissiveIntensity: 3 }), [-5 + i * 5, h + 6.8, -3], [0.5, 0.9, 0.5]);
      bolt.castShadow = false;
      spinners.push(bolt);
    }
    mesh(g, G.box, stdMat('#4a5058', { metalness: 0.6 }), [0, 2, d / 2 + 0.05], [4, 4, 0.1]);
    sign(g, 'CENTRALE DE SABLONS', 5.0, d / 2 + 0.12, 5.6, '#2a2a3a', '#ffe14a');
    return { group: g, w, d, h: h + 7, lights: [], chimneys: [], spinners };
  },
  temple(st) {
    const g = new THREE.Group();
    const w = 14, d = 12, h = 7;
    const stone = surfMat('stone', st.wallColor || '#e8e4dc');
    mesh(g, texturedBox(w + 3, 1, d + 3, 2), stone, [0, 0.5, 0]);
    mesh(g, texturedBox(w + 1.5, 0.6, d + 1.5, 2), stone, [0, 1.3, 0]);
    mesh(g, texturedBox(w, h, d, 2.4), stone, [0, h / 2 + 1.6, 0]);
    for (let i = 0; i < 6; i++) mesh(g, G.cyl, stone, [-w / 2 + 1 + i * (w - 2) / 5, h / 2 + 1.6, d / 2 + 0.9], [0.5, h, 0.5]);
    mesh(g, G.box, stdMat(st.roofColor || '#5a6070'), [0, h + 2.2, 0.4], [w + 1.6, 0.6, d + 2.4]);
    const pg = new THREE.Mesh(gable(w + 1.6, 2.4, d + 2.4), stdMat(st.roofColor || '#5a6070'));
    pg.position.set(0, h + 2.5, 0.4);
    pg.castShadow = true;
    g.add(pg);
    mesh(g, G.box, stdMat('#1a1a24'), [0, 2.9, d / 2 + 0.02], [2.6, 3.2, 0.1]);
    const orb = mesh(g, G.octa, new THREE.MeshStandardMaterial({ color: st.trim, emissive: st.trim, emissiveIntensity: 2.4 }), [0, h + 5.4, 0.4], [0.6, 1, 0.6]);
    orb.castShadow = false;
    return { group: g, w: w + 3, d: d + 3, h: h + 6, lights: [], chimneys: [], spinners: [orb], door: { x: 0, z: d / 2 + 1.5 } };
  },
  league(st) {
    const r = BUILDERS.temple({ ...st, wallColor: '#f4f0e6', roofColor: '#2a3a7a', trim: '#ffd23f' });
    sign(r.group, 'LIGUE DU ZÉNITH', 9.4, 7.2, 6, '#2a3a7a', '#ffd23f');
    return r;
  },
  cave(st) {
    const g = new THREE.Group();
    const rock = new THREE.MeshStandardMaterial({ color: '#7a7268', roughness: 0.95, flatShading: true });
    const geo = new THREE.DodecahedronGeometry(1, 1);
    mesh(g, geo, rock, [-3, 2.5, -1], [3, 3.2, 3]);
    mesh(g, geo, rock, [3, 2.5, -1], [3, 3.4, 3]);
    mesh(g, geo, rock, [0, 5, -1.5], [4.5, 2.4, 3]);
    mesh(g, G.box, stdMat('#0a0808', { roughness: 1 }), [0, 1.8, 0.8], [3, 3.6, 0.3]);
    const beam = stdMat('#6a4a2a');
    mesh(g, G.box, beam, [-1.6, 1.9, 1.1], [0.3, 3.8, 0.3]);
    mesh(g, G.box, beam, [1.6, 1.9, 1.1], [0.3, 3.8, 0.3]);
    mesh(g, G.box, beam, [0, 3.85, 1.1], [3.6, 0.3, 0.3]);
    return { group: g, w: 9, d: 4, h: 7, lights: [new THREE.Vector3(1.9, 3.3, 1.6)], chimneys: [], door: { x: 0, z: 1.2 } };
  },
  hideout(st) {
    const r = BUILDERS.warehouse({ ...st });
    const g = r.group;
    const em = mesh(g, G.cyl, new THREE.MeshStandardMaterial({ map: emblemTexture('#6c5a8e', '☾'), emissive: '#c58bff', emissiveIntensity: 0.5, transparent: true }), [0, 5.4, 6.15], [1.1, 0.1, 1.1], [Math.PI / 2, 0, 0]);
    em.castShadow = false;
    return r;
  },
  dock(st, o = {}) {
    const g = new THREE.Group();
    const len = o.len || 14;
    const wood = surfMat('planks', '#b08a60');
    mesh(g, texturedBox(4, 0.3, len, 1.5), wood, [0, 0.35, 0]);
    const n = Math.max(2, Math.round(len / 2.4));
    for (let i = 0; i <= n; i++) for (const s of [-1, 1]) mesh(g, G.cylLow, stdMat('#5a4630'), [s * 1.8, -0.5, -len / 2 + 0.4 + i * ((len - 0.8) / n)], [0.15, 2.2, 0.15]);
    return { group: g, w: 4, d: len, h: 1, lights: [], chimneys: [], noCollide: true };
  },
  boat() {
    const g = new THREE.Group();
    const hull = stdMat('#f4f6f8', { roughness: 0.5 });
    mesh(g, G.box, hull, [0, 1, 0], [5, 2, 14]);
    mesh(g, G.cone, hull, [0, 1, 8.5], [2.5, 3, 2.5], [Math.PI / 2, 0, 0]);
    mesh(g, G.box, stdMat('#3a7bd5'), [0, 0.3, 0], [5.1, 0.4, 14.1]);
    mesh(g, G.box, hull, [0, 3, -2], [3.6, 2, 5]);
    mesh(g, G.cyl, stdMat('#d8402a'), [0, 5, -2], [0.6, 2.4, 0.6]);
    return { group: g, w: 5, d: 16, h: 6, lights: [], chimneys: [] };
  },
};

/** Construit un bâtiment. opts : { roofColor, doorColor, type (arène), label, w, d, h } */
export function buildBuilding(kind, styleId = 'village', opts = {}) {
  const st = { ...(STYLES[styleId] || STYLES.village), ...(opts.style || {}) };
  const make = BUILDERS[kind] || BUILDERS.house;
  const r = make(st, opts);
  r.door = r.door || { x: 0, z: r.d / 2 };
  r.lights = r.lights || [];
  r.chimneys = r.chimneys || [];
  r.spinners = r.spinners || [];
  r.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; } });
  return r;
}

export const BUILDING_KINDS = Object.keys(BUILDERS);
