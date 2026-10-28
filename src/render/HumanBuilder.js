import * as THREE from 'three';
import { addRim } from './Materials.js';
import { optimizeRig } from './Optimize.js';

/**
 * PERSONNAGES DÉTAILLÉS (joueur, PNJ, dresseurs)
 * look = { skin, hair, hairStyle, top, bottom, accent, hat, outfit, backpack, kid, elder, big, gender,
 *          cape, scarf, glasses, apron, belt, headband, shoes }
 * hairStyle : short spiky long ponytail twin bun bald beard messy curly bob slick
 * hat       : cap bucket helmet beanie beret top hood explorer
 * outfit    : jacket dress robe uniform swim labcoat gi
 */
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  sphereMid: new THREE.SphereGeometry(1, 16, 12),
  sphereLow: new THREE.SphereGeometry(1, 10, 8),
  hemi: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: new THREE.ConeGeometry(1, 1, 16),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylOpen: new THREE.CylinderGeometry(1, 1, 1, 18, 1, true),
  taper: new THREE.CylinderGeometry(0.75, 1, 1, 18),
  skirt: new THREE.CylinderGeometry(0.55, 1, 1, 20, 1, true),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.15, 8, 24),
  smile: new THREE.TorusGeometry(1, 0.25, 6, 16, Math.PI * 0.7),
};
const capCache = new Map();
const capsule = (r, l) => {
  const k = `${r}:${l}`;
  if (!capCache.has(k)) capCache.set(k, new THREE.CapsuleGeometry(r, l, 6, 14));
  return capCache.get(k);
};
function mesh(parent, geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(pos[0], pos[1], pos[2]);
  if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function pivot(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

const matCache = new Map();
function cloth(color, rough = 0.78, rim = 0.18) {
  const k = `cl:${color}:${rough}:${rim}`;
  if (!matCache.has(k)) matCache.set(k, addRim(new THREE.MeshStandardMaterial({ color, roughness: rough }), '#ffffff', rim));
  return matCache.get(k);
}
function skinMat(color) {
  const k = `sk:${color}`;
  if (!matCache.has(k)) matCache.set(k, addRim(new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.08, sheen: 0.4, sheenColor: new THREE.Color('#ffccaa') }), '#ffe0d0', 0.22));
  return matCache.get(k);
}
const BASIC = {
  eyeWhite: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }),
  shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  mouth: new THREE.MeshStandardMaterial({ color: '#7a2a32', roughness: 0.6 }),
  blush: new THREE.MeshStandardMaterial({ color: '#ff8f9a', roughness: 0.8, transparent: true, opacity: 0.45 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1 }),
  frame: new THREE.MeshStandardMaterial({ color: '#2a2a32', roughness: 0.4, metalness: 0.5 }),
  sole: new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: '#c0c8d2', roughness: 0.3, metalness: 0.8 }),
  prism: new THREE.MeshStandardMaterial({ color: '#ffb547', emissive: '#ff9a20', emissiveIntensity: 0.8, roughness: 0.2 }),
};
for (const k of ['eyeWhite', 'shine', 'mouth', 'blush', 'glass']) BASIC[k].userData.noShadow = true;

const IRIS = ['#3a2a1a', '#2a4a7a', '#2a6a3a', '#5a3a1a', '#4a2a6a'];

/** Construit un humanoïde détaillé. @returns {{object, rig}} */
export function buildHuman(look = {}) {
  const C = { skin: '#f1c9a5', hair: '#3b2a20', hairStyle: 'short', top: '#ff7a4d', bottom: '#2e3550', accent: '#ffd23f', shoes: '#3a3a44', ...look };
  const kid = !!C.kid, elder = !!C.elder, big = !!C.big, fem = C.gender === 'f';
  const S = {
    skin: skinMat(C.skin), hair: addRim(new THREE.MeshPhysicalMaterial({ color: C.hair, roughness: 0.45, clearcoat: 0.4, clearcoatRoughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(C.hair).lerp(new THREE.Color('#ffffff'), 0.4) }), '#ffffff', 0.15),
    top: cloth(C.top), bottom: cloth(C.bottom), accent: cloth(C.accent, 0.6), shoes: cloth(C.shoes, 0.5),
    dark: cloth('#2a2630', 0.5), white: cloth('#f6f4ee', 0.7),
  };
  const root = new THREE.Group();
  const rig = { root, legs: [], arms: [], ears: [], wings: [], segments: [], flickers: [] };
  const legLen = kid ? 0.32 : 0.46;
  const hipY = legLen + 0.48 * (kid ? 0.62 : 1) + (kid ? 0.0 : 0);
  const torsoW = big ? 1.25 : fem ? 0.9 : 1;
  const headS = kid ? 1.28 : elder ? 0.98 : 1;

  const hips = pivot(root, 0, kid ? 0.62 : 0.92, 0);
  rig.body = hips;
  if (elder) hips.rotation.x = 0.12;

  // ── Torse et tenue ──
  const torsoTop = C.outfit === 'swim' && !fem ? S.skin : S.top;
  mesh(hips, capsule(0.18 * torsoW, kid ? 0.16 : 0.26), torsoTop, [0, kid ? 0.2 : 0.3, 0], [1, 1, 0.72]);
  mesh(hips, G.cyl, S.bottom, [0, 0.06, 0], [0.185 * torsoW, 0.14, 0.14]);
  const chestY = kid ? 0.26 : 0.38;
  switch (C.outfit) {
    case 'jacket': case undefined: {
      if (C.outfit === 'jacket' || !C.outfit) {
        mesh(hips, G.box, S.accent, [0, chestY, 0.128], [0.08 * torsoW, kid ? 0.2 : 0.3, 0.02]);
        for (const side of [-1, 1]) mesh(hips, G.box, S.top, [side * 0.075 * torsoW, chestY + 0.02, 0.13], [0.07 * torsoW, kid ? 0.22 : 0.32, 0.025], [0, side * 0.12, 0]);
        mesh(hips, G.torus, S.top, [0, chestY + (kid ? 0.12 : 0.17), 0], [0.13 * torsoW, 0.1, 0.13], [Math.PI / 2, 0, 0]);
      }
      break;
    }
    case 'dress':
      mesh(hips, G.skirt, S.top, [0, -0.12, 0], [0.3 * torsoW, 0.4, 0.26]);
      break;
    case 'robe':
      mesh(hips, G.skirt, S.top, [0, -0.38, 0], [0.32, 0.9, 0.28]);
      mesh(hips, G.box, S.accent, [0, 0.08, 0.14], [0.36, 0.05, 0.02]);
      break;
    case 'labcoat':
      mesh(hips, G.skirt, S.white, [0, -0.15, 0], [0.26 * torsoW, 0.45, 0.2]);
      for (const side of [-1, 1]) mesh(hips, G.box, S.white, [side * 0.09, chestY, 0.125], [0.09, 0.34, 0.025], [0, side * 0.15, 0]);
      mesh(hips, G.box, S.bottom, [0, chestY, 0.12], [0.07, 0.3, 0.02]);
      break;
    case 'uniform':
      mesh(hips, G.box, S.accent, [0, chestY + 0.02, 0.13], [0.03, 0.32, 0.02]);
      mesh(hips, G.box, S.accent, [0.08, chestY + 0.08, 0.13], [0.06, 0.06, 0.02], [0, 0, 0.78]);
      mesh(hips, G.torus, S.accent, [0, 0.12, 0], [0.19 * torsoW, 0.19 * torsoW, 0.3], [Math.PI / 2, 0, 0]);
      break;
    case 'gi':
      mesh(hips, G.box, S.white, [0.04, chestY, 0.13], [0.16, 0.34, 0.02], [0, 0, -0.3]);
      mesh(hips, G.torus, cloth(C.belt || '#2a2a2a', 0.6), [0, 0.12, 0], [0.19, 0.19, 0.35], [Math.PI / 2, 0, 0]);
      break;
    case 'swim':
      if (fem) mesh(hips, G.box, S.top, [0, chestY + 0.02, 0.07], [0.3, 0.12, 0.16]);
      break;
    default: break;
  }
  if (C.apron) mesh(hips, G.box, cloth(C.apron), [0, 0.12, 0.15], [0.3, 0.5, 0.02]);
  if (C.belt && C.outfit !== 'gi') mesh(hips, G.torus, cloth(C.belt, 0.5), [0, 0.12, 0], [0.19 * torsoW, 0.19 * torsoW, 0.35], [Math.PI / 2, 0, 0]);
  if (!kid && C.outfit !== 'robe' && C.outfit !== 'swim') {
    // ceinture à Prismes
    mesh(hips, G.torus, S.dark, [0, 0.13, 0], [0.188 * torsoW, 0.188 * torsoW, 0.3], [Math.PI / 2, 0, 0]);
    for (const a of [-0.7, -0.35, 0.35]) mesh(hips, G.sphereLow, BASIC.prism, [Math.sin(a) * 0.19 * torsoW, 0.13, Math.cos(a) * 0.14], 0.025).castShadow = false;
  }

  // ── Tête et visage ──
  const head = pivot(hips, 0, kid ? 0.46 : 0.62, 0);
  rig.head = head;
  const H = (v) => v * headS;
  mesh(head, G.sphere, S.skin, [0, H(0.14), 0], [H(0.155), H(0.17), H(0.155)]);
  mesh(head, G.sphereMid, S.skin, [0, H(0.08), H(0.06)], [H(0.12), H(0.09), H(0.1)]);
  for (const side of [-1, 1]) mesh(head, G.sphereLow, S.skin, [side * H(0.155), H(0.14), 0], [H(0.03), H(0.045), H(0.03)]);
  mesh(head, G.sphereLow, S.skin, [0, H(0.12), H(0.162)], [H(0.022), H(0.022), H(0.02)]);
  const irisCol = IRIS[(C.skin.charCodeAt(2) + C.hair.charCodeAt(3)) % IRIS.length];
  const iris = cloth(irisCol, 0.2, 0);
  iris.userData.noShadow = true;
  for (const side of [-1, 1]) {
    const e = pivot(head, side * H(0.06), H(0.155), H(0.138));
    e.rotation.y = side * 0.3;
    const ew = kid || fem ? 1.12 : 1;
    mesh(e, G.sphereMid, BASIC.eyeWhite, [0, 0, 0], [H(0.03) * ew, H(0.036) * ew, H(0.014)]).castShadow = false;
    mesh(e, G.sphereMid, iris, [0, -H(0.002), H(0.008)], [H(0.019) * ew, H(0.027) * ew, H(0.01)]).castShadow = false;
    mesh(e, G.sphereLow, BASIC.shine, [side * -H(0.007), H(0.01), H(0.016)], H(0.006)).castShadow = false;
    mesh(e, G.box, S.hair, [0, H(0.05), H(0.004)], [H(0.05), H(0.009), H(0.01)], [0, 0, side * -0.12]).castShadow = false;
    if (kid || fem) mesh(head, G.sphereLow, BASIC.blush, [side * H(0.095), H(0.1), H(0.13)], [H(0.025), H(0.013), H(0.01)], [0, side * 0.5, 0]).castShadow = false;
  }
  mesh(head, G.smile, BASIC.mouth, [0, H(0.088), H(0.152)], [H(0.024), H(0.02), H(0.012)], [0, 0, Math.PI + 0.33]).castShadow = false;
  if (C.glasses) {
    for (const side of [-1, 1]) {
      mesh(head, G.torus, BASIC.frame, [side * H(0.06), H(0.155), H(0.158)], [H(0.035), H(0.035), H(0.035)]);
      mesh(head, G.cyl, BASIC.glass, [side * H(0.06), H(0.155), H(0.156)], [H(0.033), H(0.004), H(0.033)], [Math.PI / 2, 0, 0]).castShadow = false;
    }
    mesh(head, G.box, BASIC.frame, [0, H(0.16), H(0.162)], [H(0.04), H(0.006), H(0.006)]);
  }

  // ── Cheveux ──
  const hs = C.hairStyle;
  if (hs !== 'bald') {
    mesh(head, G.sphere, S.hair, [0, H(0.19), -H(0.025)], [H(0.168), H(0.15), H(0.17)]);
    mesh(head, G.sphere, S.hair, [0, H(0.255), H(0.07)], [H(0.15), H(0.06), H(0.1)], [0.35, 0, 0]);
  }
  switch (hs) {
    case 'spiky':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 1.6 - Math.PI * 0.8;
        mesh(head, G.cone, S.hair, [Math.sin(a) * H(0.12), H(0.28), Math.cos(a) * H(0.08) - H(0.03)], [H(0.05), H(0.13), H(0.05)], [-Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.7]);
      }
      break;
    case 'long':
      mesh(head, G.sphere, S.hair, [0, H(0.04), -H(0.07)], [H(0.17), H(0.26), H(0.12)]);
      for (const side of [-1, 1]) mesh(head, G.sphere, S.hair, [side * H(0.13), H(0.06), H(0.0)], [H(0.05), H(0.2), H(0.08)]);
      break;
    case 'ponytail':
      mesh(head, G.sphereMid, S.hair, [0, H(0.22), -H(0.17)], H(0.05));
      mesh(head, capsule(H(0.05), H(0.18)), S.hair, [0, H(0.08), -H(0.22)], 1, [0.3, 0, 0]);
      break;
    case 'twin':
      for (const side of [-1, 1]) {
        mesh(head, G.sphereMid, S.accent, [side * H(0.14), H(0.24), -H(0.06)], H(0.03));
        mesh(head, capsule(H(0.045), H(0.16)), S.hair, [side * H(0.17), H(0.12), -H(0.07)], 1, [0, 0, side * 0.25]);
      }
      break;
    case 'bun':
      mesh(head, G.sphere, S.hair, [0, H(0.33), -H(0.06)], H(0.075));
      break;
    case 'curly':
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        mesh(head, G.sphereMid, S.hair, [Math.cos(a) * H(0.15), H(0.18) + Math.sin(i * 1.7) * H(0.06), Math.sin(a) * H(0.13) - H(0.03)], H(0.06));
      }
      break;
    case 'bob':
      mesh(head, G.sphere, S.hair, [0, H(0.11), -H(0.03)], [H(0.185), H(0.17), H(0.17)]);
      mesh(head, G.box, S.hair, [0, H(0.24), H(0.12)], [H(0.24), H(0.05), H(0.05)]);
      break;
    case 'slick':
      mesh(head, G.sphere, S.hair, [0, H(0.2), -H(0.06)], [H(0.17), H(0.16), H(0.18)]);
      break;
    case 'beard':
      mesh(head, G.sphere, S.hair, [0, H(0.05), H(0.08)], [H(0.13), H(0.09), H(0.1)]);
      mesh(head, G.box, S.hair, [0, H(0.105), H(0.155)], [H(0.07), H(0.015), H(0.02)]);
      break;
    case 'messy':
      for (let i = 0; i < 10; i++) mesh(head, G.sphereMid, S.hair, [Math.sin(i * 2.4) * H(0.12), H(0.26) + Math.cos(i * 1.3) * H(0.04), Math.cos(i * 2.4) * H(0.1) - H(0.02)], H(0.06));
      break;
    default: break;
  }

  // ── Chapeaux ──
  const hatC = cloth(C.hatColor || C.accent, 0.6);
  switch (C.hat) {
    case 'cap':
      mesh(head, G.hemi, hatC, [0, H(0.24), -H(0.01)], [H(0.175), H(0.11), H(0.175)]);
      mesh(head, G.cyl, S.top, [0, H(0.245), H(0.15)], [H(0.11), H(0.012), H(0.09)]);
      mesh(head, G.sphereLow, S.white, [0, H(0.31), H(0.12)], [H(0.04), H(0.03), H(0.012)]);
      break;
    case 'bucket':
      mesh(head, G.cyl, hatC, [0, H(0.28), 0], [H(0.15), H(0.09), H(0.15)]);
      mesh(head, G.cyl, hatC, [0, H(0.24), 0], [H(0.23), H(0.012), H(0.23)]);
      break;
    case 'helmet':
      mesh(head, G.hemi, cloth(C.hatColor || '#ffd23f', 0.35), [0, H(0.22), 0], [H(0.19), H(0.16), H(0.2)]);
      mesh(head, G.sphereLow, BASIC.shine, [0, H(0.33), H(0.16)], H(0.025)).castShadow = false;
      break;
    case 'beanie':
      mesh(head, G.hemi, hatC, [0, H(0.22), -H(0.01)], [H(0.18), H(0.16), H(0.18)]);
      mesh(head, G.sphereMid, S.white, [0, H(0.39), 0], H(0.04));
      break;
    case 'beret':
      mesh(head, G.sphere, hatC, [H(0.03), H(0.3), 0], [H(0.18), H(0.05), H(0.17)], [0, 0, -0.2]);
      break;
    case 'top':
      mesh(head, G.cyl, S.dark, [0, H(0.36), 0], [H(0.12), H(0.2), H(0.12)]);
      mesh(head, G.cyl, S.dark, [0, H(0.26), 0], [H(0.2), H(0.012), H(0.2)]);
      mesh(head, G.cyl, hatC, [0, H(0.29), 0], [H(0.122), H(0.03), H(0.122)]);
      break;
    case 'hood':
      mesh(head, G.sphere, cloth(C.top, 0.7), [0, H(0.17), -H(0.03)], [H(0.2), H(0.21), H(0.2)]);
      mesh(head, G.box, cloth(C.accent || '#c58bff', 0.4), [0, H(0.28), H(0.17)], [H(0.06), H(0.06), H(0.01)], [0, 0, Math.PI / 4]);
      break;
    case 'explorer':
      mesh(head, G.hemi, cloth('#c8a070', 0.7), [0, H(0.23), 0], [H(0.18), H(0.13), H(0.18)]);
      mesh(head, G.cyl, cloth('#c8a070', 0.7), [0, H(0.24), 0], [H(0.25), H(0.012), H(0.25)]);
      break;
    default: break;
  }
  if (C.headband) mesh(head, G.torus, S.accent, [0, H(0.21), 0], [H(0.162), H(0.162), H(0.2)], [Math.PI / 2, 0, 0]);

  // ── Bras et jambes ──
  const shoulderY = kid ? 0.34 : 0.5;
  const armLen = kid ? 0.18 : 0.26;
  const sleeve = C.outfit === 'swim' ? S.skin : C.outfit === 'labcoat' ? S.white : C.outfit === 'gi' ? S.white : S.top;
  for (const side of [-1, 1]) {
    const arm = pivot(hips, side * 0.235 * torsoW, shoulderY, 0);
    arm.rotation.z = side * 0.08;
    arm.userData.side = side;
    arm.userData.phase = -side;
    mesh(arm, G.sphereMid, sleeve, [0, 0, 0], 0.07);
    mesh(arm, capsule(0.058, armLen * 0.55), sleeve, [0, -armLen * 0.35, 0]);
    mesh(arm, capsule(0.05, armLen * 0.5), C.outfit === 'jacket' || C.outfit === 'labcoat' || C.outfit === 'uniform' ? sleeve : S.skin, [0, -armLen * 0.85, 0.01]);
    mesh(arm, G.sphereMid, S.skin, [0, -armLen * 1.18, 0.015], [0.055, 0.065, 0.05]);
    rig.arms.push(arm);

    const leg = pivot(root, side * 0.1 * torsoW, kid ? 0.62 : 0.92, 0);
    leg.userData.phase = side;
    const pants = C.outfit === 'swim' ? S.skin : C.outfit === 'dress' || (fem && C.outfit === 'robe') ? S.skin : S.bottom;
    mesh(leg, capsule(0.078, legLen * 0.75), pants, [0, -legLen * 0.48, 0]);
    if (C.outfit === 'swim' && !fem) mesh(leg, G.cyl, S.bottom, [0, -0.06, 0], [0.085, 0.12, 0.085]);
    mesh(leg, G.box, S.shoes, [0, -legLen * 1.02 - 0.03, 0.035], [0.12, 0.08, 0.22]);
    mesh(leg, G.box, BASIC.sole, [0, -legLen * 1.02 - 0.065, 0.035], [0.125, 0.025, 0.23]);
    rig.legs.push(leg);
  }
  if (C.backpack) {
    mesh(hips, capsule(0.14, 0.12), cloth(C.packColor || C.accent, 0.6), [0, shoulderY - 0.18, -0.19], [1, 1, 0.55]);
    mesh(hips, G.box, S.dark, [0, shoulderY - 0.28, -0.26], [0.18, 0.1, 0.03]);
    for (const side of [-1, 1]) mesh(hips, G.box, S.dark, [side * 0.1, shoulderY - 0.05, 0.02], [0.03, 0.3, 0.24]);
  }
  if (C.cape) {
    const capeP = pivot(hips, 0, shoulderY + 0.02, -0.12);
    rig.cape = capeP;
    mesh(capeP, G.box, cloth(C.cape, 0.7), [0, -0.38, -0.02], [0.44 * torsoW, 0.78, 0.025], [0.08, 0, 0]);
    mesh(hips, G.torus, cloth(C.cape, 0.7), [0, shoulderY + 0.05, 0], [0.15, 0.15, 0.3], [Math.PI / 2, 0, 0]);
  }
  if (C.scarf) {
    mesh(hips, G.torus, cloth(C.scarf, 0.8), [0, shoulderY + 0.06, 0], [0.13, 0.13, 0.55], [Math.PI / 2, 0, 0]);
    mesh(hips, G.box, cloth(C.scarf, 0.8), [0.08, shoulderY - 0.08, 0.13], [0.07, 0.22, 0.03], [0.1, 0, 0.15]);
  }
  if (elder) mesh(root, G.cyl, cloth('#6a4a2a', 0.7), [0.3, 0.45, 0.15], [0.02, 0.9, 0.02], [0, 0, -0.1]);

  optimizeRig(rig);
  root.updateMatrixWorld(true);
  rig.height = new THREE.Box3().setFromObject(root).max.y;
  return { object: root, rig };
}

/** Taille cible selon l'âge. */
export function humanHeight(look = {}) {
  if (look.kid) return 1.25;
  if (look.elder) return 1.62;
  if (look.big) return 1.85;
  return look.gender === 'f' ? 1.68 : 1.74;
}
