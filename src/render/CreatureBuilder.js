import * as THREE from 'three';
import { addRim } from './Materials.js';
import { irisTexture, patternTexture } from './Textures.js';
import { optimizeRig } from './Optimize.js';

/**
 * CRÉATURES DE REMPLACEMENT DÉTAILLÉES
 * Construit un Lumin articulé (yeux à iris, museau, pattes, motifs de pelage, liseré lumineux…)
 * à partir du champ `look` de sa fiche. Le « rig » renvoyé est animé par ProceduralAnimator.
 * Plans : quad · biped · float · serpent · golem · bird · fish · insect · plant · blob · dragon
 */

// ── Géométries partagées ──────────────────────────────────────────────
const G = {
  sphere: new THREE.SphereGeometry(1, 32, 24),
  sphereMid: new THREE.SphereGeometry(1, 18, 12),
  sphereLow: new THREE.SphereGeometry(1, 10, 8),
  hemi: new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: new THREE.ConeGeometry(1, 1, 20),
  coneLow: new THREE.ConeGeometry(1, 1, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  cylLow: new THREE.CylinderGeometry(1, 1, 1, 8),
  taper: new THREE.CylinderGeometry(0.55, 1, 1, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
  octa: new THREE.OctahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  dodeca1: new THREE.DodecahedronGeometry(1, 1),
  ico: new THREE.IcosahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.12, 10, 40),
  smile: new THREE.TorusGeometry(1, 0.22, 8, 20, Math.PI * 0.8),
  wing: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.35, 0.35, 0.8, 0.45, 1.0, 0.3);
    s.bezierCurveTo(0.85, 0.12, 0.92, -0.05, 0.75, -0.12);
    s.bezierCurveTo(0.6, -0.08, 0.55, -0.22, 0.4, -0.2);
    s.bezierCurveTo(0.28, -0.18, 0.2, -0.3, 0.05, -0.15);
    s.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 });
  })(),
  batWing: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(0.3, 0.45); s.lineTo(1.0, 0.35); s.quadraticCurveTo(0.85, 0.1, 0.9, -0.1);
    s.quadraticCurveTo(0.68, 0.0, 0.62, -0.18); s.quadraticCurveTo(0.42, -0.04, 0.32, -0.2); s.quadraticCurveTo(0.18, -0.05, 0, -0.1);
    return new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false, curveSegments: 8 });
  })(),
  leaf: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.4, 0.25, 0, 1);
    s.quadraticCurveTo(-0.4, 0.25, 0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 8 });
  })(),
  flame: (() => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * (1 - t * 0.85) * 0.5 + 0.001, t));
    }
    return new THREE.LatheGeometry(pts, 14);
  })(),
  drop: (() => {
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = Math.sin(t * Math.PI) * (1 - t * 0.55) * (t < 0.5 ? 1 : 1);
      pts.push(new THREE.Vector2(Math.max(0.001, r), t * 1.4 - 0.2));
    }
    return new THREE.LatheGeometry(pts, 24);
  })(),
};
const capCache = new Map();
function capsule(r, len) {
  const k = `${r.toFixed(3)}:${len.toFixed(3)}`;
  if (!capCache.has(k)) capCache.set(k, new THREE.CapsuleGeometry(r, len, 6, 14));
  return capCache.get(k);
}

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

// ── Couleurs chromatiques ─────────────────────────────────────────────
function shinyColor(hex, shift) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  if (hsl.s < 0.12) { c.setHSL((hsl.h + shift) % 1, Math.min(1, hsl.s + 0.18), hsl.l); return `#${c.getHexString()}`; }
  c.setHSL((hsl.h + shift) % 1, Math.min(1, hsl.s * 1.05), Math.min(0.9, hsl.l * 1.04));
  return `#${c.getHexString()}`;
}

function materialsFor(L, shiny, seed) {
  const sh = (x) => (shiny ? shinyColor(x, 0.42) : x);
  const body = sh(L.body), belly = sh(L.belly), accent = sh(L.accent);
  const glowAmt = L.glow ?? 0;
  const rough = L.metal ? 0.32 : L.crystal ? 0.12 : L.plan === 'golem' || L.rocky ? 0.85 : 0.5;
  const mkBody = (color, pattern) => {
    const opts = { color, roughness: rough, metalness: L.metal ? 0.55 : 0, clearcoat: L.crystal ? 1 : L.frog || L.jelly ? 0.8 : 0.25, clearcoatRoughness: 0.3, flatShading: !!(L.plan === 'golem' || L.rocky || L.crystal) };
    if (pattern && L.pattern && L.pattern !== 'none' && L.pattern !== 'socks' && !opts.flatShading) {
      opts.map = patternTexture(L.pattern, color, shiny ? shinyColor(L.pcolor || '#000000', 0.42) : (L.pcolor || '#000000'), seed);
      opts.color = '#ffffff';
      return addRim(new THREE.MeshPhysicalMaterial(opts), '#ffffff', 0.28);
    }
    if (L.jelly || L.wisp) { opts.transparent = true; opts.opacity = 0.78; opts.transmission = 0; }
    return addRim(new THREE.MeshPhysicalMaterial(opts), '#ffffff', L.metal ? 0.18 : 0.3);
  };
  const M = {
    body: mkBody(body, true),
    bodyPlain: mkBody(body, false),
    belly: addRim(new THREE.MeshPhysicalMaterial({ color: belly, roughness: Math.min(0.8, rough + 0.15), clearcoat: 0.1, flatShading: !!(L.plan === 'golem' || L.rocky) }), '#ffffff', 0.2),
    accent: addRim(new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.4, clearcoat: 0.4, metalness: L.metal ? 0.4 : 0 }), '#ffffff', 0.25),
    glow: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.2 + glowAmt * 2, roughness: 0.3 }),
    core: new THREE.MeshStandardMaterial({ color: '#fff6d0', emissive: '#fff1b0', emissiveIntensity: 3.4, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#2a2230', roughness: 0.5 }),
    claw: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.35 }),
    mouth: new THREE.MeshStandardMaterial({ color: '#5a1a2a', roughness: 0.6 }),
    tongue: new THREE.MeshStandardMaterial({ color: '#ff7a8a', roughness: 0.5 }),
    nose: new THREE.MeshPhysicalMaterial({ color: '#2a2028', roughness: 0.2, clearcoat: 1 }),
    eye: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: irisTexture(L.eye || (L.eyes === 'glow' ? '#ffd23f' : '#3a2a20')), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }),
    shine: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    blush: new THREE.MeshStandardMaterial({ color: '#ff8fa3', roughness: 0.7, transparent: true, opacity: 0.5 }),
    wingMem: new THREE.MeshPhysicalMaterial({ color: accent, roughness: 0.35, transparent: true, opacity: L.plan === 'insect' ? 0.55 : 0.92, side: THREE.DoubleSide, clearcoat: 0.6, iridescence: L.plan === 'insect' ? 0.8 : 0 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 + glowAmt, roughness: 0.08, clearcoat: 1, flatShading: true, transparent: true, opacity: 0.92 }),
    ice: new THREE.MeshPhysicalMaterial({ color: '#d8f4ff', emissive: '#5fd4ff', emissiveIntensity: 0.35, roughness: 0.05, clearcoat: 1, flatShading: true, transparent: true, opacity: 0.85 }),
    smoke: new THREE.MeshStandardMaterial({ color: belly, emissive: accent, emissiveIntensity: 0.4, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false }),
  };
  for (const k of ['glow', 'core', 'eye', 'shine', 'blush', 'mouth', 'tongue', 'smoke', 'crystal', 'ice']) M[k].userData.noShadow = true;
  return M;
}

// ═══ PARTIES ════════════════════════════════════════════════════════════
function addEyes(head, M, rig, { r, spread = 0.42, y = 0.05, size = 1, style = 'big', depth = 0.9 }) {
  for (const side of [-1, 1]) {
    const e = pivot(head, Math.sin(spread) * side * r * depth, y, Math.cos(spread) * r * depth);
    e.rotation.y = side * spread * 0.9;
    if (style === 'glow') {
      const g = mesh(e, G.sphereLow, M.glow, [0, 0, 0.01], [0.1 * size * r * 3, 0.045 * size * r * 3, 0.03], [0, 0, side * 0.25]);
      g.castShadow = false;
      continue;
    }
    const k = (style === 'cute' ? 0.125 : style === 'sharp' ? 0.1 : 0.115) * size * (r / 0.33);
    const ey = mesh(e, G.sphere, M.eye, [0, 0, 0], [k, k * (style === 'cute' ? 1.25 : 1.12), k * 0.62]);
    ey.castShadow = false;
    mesh(e, G.sphereLow, M.shine, [k * 0.28 * -side, k * 0.36, k * 0.58], [k * 0.24, k * 0.24, k * 0.1]).castShadow = false;
    mesh(e, G.sphereLow, M.shine, [k * -0.18 * -side, k * -0.3, k * 0.6], [k * 0.11, k * 0.11, k * 0.06]).castShadow = false;
    if (style === 'sharp') {
      const lid = mesh(e, G.hemi, M.bodyPlain, [0, k * 0.15, 0], [k * 1.12, k * 0.9, k * 0.7], [0.1, 0, side * 0.32]);
      lid.castShadow = false;
    } else if (style === 'sleepy') {
      mesh(e, G.hemi, M.bodyPlain, [0, k * 0.02, 0], [k * 1.1, k * 1.1, k * 0.72], [0, 0, 0]).castShadow = false;
    }
    if (style === 'cute') mesh(e, G.box, M.dark, [k * 0.45 * side, k * 1.05, k * 0.2], [k * 0.12, k * 0.35, k * 0.05], [0, 0, side * 0.5]).castShadow = false;
  }
}

function addMouth(head, M, { r, y = -0.12, kind = 'smile', z = 0.95 }) {
  if (kind === 'none') return;
  const p = pivot(head, 0, y * r / 0.33, r * z);
  const s = r / 0.33;
  if (kind === 'smile' || kind === 'fangs') {
    const sm = mesh(p, G.smile, M.mouth, [0, 0.03 * s, 0], [0.05 * s, 0.045 * s, 0.03 * s], [0, 0, Math.PI + Math.PI * 0.1]);
    sm.castShadow = false;
    if (kind === 'fangs') for (const side of [-1, 1]) mesh(p, G.coneLow, M.claw, [side * 0.03 * s, -0.012 * s, 0.01 * s], [0.012 * s, 0.035 * s, 0.012 * s], [Math.PI, 0, 0]).castShadow = false;
  } else if (kind === 'open') {
    mesh(p, G.sphereMid, M.mouth, [0, -0.01 * s, 0], [0.07 * s, 0.045 * s, 0.03 * s]).castShadow = false;
    mesh(p, G.sphereLow, M.tongue, [0, -0.025 * s, 0.012 * s], [0.04 * s, 0.018 * s, 0.02 * s]).castShadow = false;
  } else {
    mesh(p, G.box, M.mouth, [0, 0, 0], [0.06 * s, 0.008 * s, 0.01 * s]).castShadow = false;
  }
}

function addSnout(head, M, { r, kind }) {
  const s = r / 0.33;
  if (!kind || kind === 'none') return 0;
  if (kind === 'beak') {
    mesh(head, G.cone, M.accent, [0, -0.02 * s, r * 0.98], [0.075 * s, 0.2 * s, 0.07 * s], [Math.PI / 2, 0, 0]);
    mesh(head, G.cone, M.accent, [0, -0.07 * s, r * 0.9], [0.055 * s, 0.11 * s, 0.05 * s], [Math.PI / 2 + 0.25, 0, 0]);
    return 0.12;
  }
  const len = kind === 'long' ? 0.24 : kind === 'muzzle' ? 0.16 : 0.12;
  const wid = kind === 'muzzle' ? 0.17 : 0.13;
  mesh(head, G.sphere, M.belly, [0, -0.08 * s, r * 0.82], [wid * s, 0.1 * s, len * s]);
  mesh(head, G.sphereMid, M.nose, [0, -0.04 * s, r * 0.82 + len * s * 0.92], [0.045 * s, 0.032 * s, 0.03 * s]).castShadow = false;
  return len;
}

function addEars(head, M, rig, kind, hr) {
  const s = hr / 0.33;
  const add = (p, side) => { p.userData.side = side; rig.ears.push(p); };
  switch (kind) {
    case 'pointy':
      for (const side of [-1, 1]) {
        const p = pivot(head, side * 0.17 * s, 0.22 * s, -0.02 * s);
        p.rotation.z = -side * 0.38;
        mesh(p, G.cone, M.bodyPlain, [0, 0.13 * s, 0], [0.1 * s, 0.29 * s, 0.065 * s]);
        mesh(p, G.cone, M.belly, [0, 0.11 * s, 0.028 * s], [0.06 * s, 0.2 * s, 0.03 * s]);
        add(p, side);
      }
      break;
    case 'long':
      for (const side of [-1, 1]) {
        const p = pivot(head, side * 0.15 * s, 0.24 * s, -0.04 * s);
        p.rotation.z = -side * 0.22;
        mesh(p, G.sphere, M.bodyPlain, [0, 0.26 * s, 0], [0.09 * s, 0.3 * s, 0.05 * s]);
        mesh(p, G.sphere, M.belly, [0, 0.25 * s, 0.025 * s], [0.055 * s, 0.24 * s, 0.03 * s]);
        add(p, side);
      }
      break;
    case 'round':
      for (const side of [-1, 1]) {
        const p = pivot(head, side * 0.2 * s, 0.22 * s, 0);
        mesh(p, G.sphere, M.bodyPlain, [0, 0, 0], [0.11 * s, 0.11 * s, 0.05 * s]);
        mesh(p, G.sphere, M.belly, [0, 0, 0.025 * s], [0.07 * s, 0.07 * s, 0.03 * s]);
        add(p, side);
      }
      break;
    case 'fins':
      for (const side of [-1, 1]) {
        const p = pivot(head, side * 0.28 * s, 0.06 * s, -0.04 * s);
        p.rotation.z = -side * 1.15;
        mesh(p, G.cone, M.accent, [0, 0.12 * s, 0], [0.12 * s, 0.28 * s, 0.03 * s]);
        mesh(p, G.cone, M.belly, [0, 0.1 * s, 0.012 * s], [0.06 * s, 0.18 * s, 0.02 * s]);
        add(p, side);
      }
      break;
    case 'sprout': case 'leaf': {
      if (kind === 'sprout') {
        const stem = pivot(head, 0, 0.3 * s, 0);
        mesh(stem, G.cylLow, M.accent, [0, 0.07 * s, 0], [0.018 * s, 0.15 * s, 0.018 * s]);
        for (const side of [-1, 1]) {
          const leaf = pivot(stem, side * 0.02 * s, 0.14 * s, 0);
          leaf.rotation.z = -side * 1.0;
          mesh(leaf, G.leaf, M.accent, [0, 0, 0], [0.18 * s, 0.22 * s, 1], [0, 0, 0]);
          add(leaf, side);
        }
      } else {
        for (const side of [-1, 1]) {
          const p = pivot(head, side * 0.18 * s, 0.2 * s, 0);
          p.rotation.z = -side * 0.6;
          mesh(p, G.leaf, M.accent, [0, 0, 0], [0.22 * s, 0.32 * s, 1]);
          add(p, side);
        }
      }
      break;
    }
    case 'antenna':
      for (const side of [-1, 1]) {
        const p = pivot(head, side * 0.12 * s, 0.25 * s, 0);
        p.rotation.z = -side * 0.32;
        mesh(p, G.cylLow, M.dark, [0, 0.14 * s, 0], [0.013 * s, 0.28 * s, 0.013 * s]);
        const tip = mesh(p, G.sphereMid, M.glow, [0, 0.3 * s, 0], [0.055 * s, 0.055 * s, 0.055 * s]);
        tip.castShadow = false;
        rig.flickers.push({ obj: tip, speed: 9, amp: 0.35 });
        add(p, side);
      }
      break;
    default: break;
  }
}

function addTail(parent, M, rig, kind, pos, s = 1, count = 1) {
  if (!kind || kind === 'none') return null;
  let first = null;
  for (let n = 0; n < count; n++) {
    const t = pivot(parent, pos[0] + (count > 1 ? (n - (count - 1) / 2) * 0.12 * s : 0), pos[1], pos[2]);
    if (count > 1) t.rotation.z = (n - (count - 1) / 2) * 0.35;
    switch (kind) {
      case 'flame': {
        t.rotation.x = -0.75;
        mesh(t, G.cone, M.bodyPlain, [0, 0.1 * s, 0], [0.09 * s, 0.22 * s, 0.09 * s]);
        const outer = mesh(t, G.flame, M.glow, [0, 0.18 * s, 0], [0.3 * s, 0.42 * s, 0.3 * s]);
        const inner = mesh(t, G.flame, M.core, [0, 0.2 * s, 0.01 * s], [0.18 * s, 0.3 * s, 0.18 * s]);
        outer.castShadow = inner.castShadow = false;
        rig.flickers.push({ obj: outer, speed: 13, amp: 0.25 }, { obj: inner, speed: 17, amp: 0.3 });
        break;
      }
      case 'leaf':
        t.rotation.x = -1.0;
        mesh(t, G.cylLow, M.accent, [0, 0.08 * s, 0], [0.02 * s, 0.16 * s, 0.02 * s]);
        mesh(t, G.leaf, M.accent, [0, 0.15 * s, 0], [0.35 * s, 0.4 * s, 1]);
        break;
      case 'fin':
        t.rotation.x = -0.35;
        mesh(t, G.sphere, M.accent, [0, 0.08 * s, -0.16 * s], [0.03 * s, 0.2 * s, 0.24 * s]);
        mesh(t, G.sphere, M.belly, [0, 0.05 * s, -0.2 * s], [0.025 * s, 0.12 * s, 0.14 * s]);
        break;
      case 'fishtail':
        mesh(t, G.cone, M.bodyPlain, [0, 0, -0.1 * s], [0.1 * s, 0.25 * s, 0.08 * s], [-Math.PI / 2, 0, 0]);
        for (const side of [-1, 1]) mesh(t, G.sphere, M.accent, [0, side * 0.1 * s, -0.25 * s], [0.025 * s, 0.14 * s, 0.1 * s], [side * 0.5, 0, 0]);
        break;
      case 'bolt': {
        t.rotation.x = -0.8;
        const b1 = mesh(t, G.box, M.glow, [0, 0.09 * s, 0], [0.05 * s, 0.2 * s, 0.05 * s], [0, 0, 0.5]);
        const b2 = mesh(t, G.box, M.glow, [0.05 * s, 0.24 * s, 0], [0.05 * s, 0.2 * s, 0.05 * s], [0, 0, -0.55]);
        const b3 = mesh(t, G.box, M.glow, [0.01 * s, 0.39 * s, 0], [0.1 * s, 0.22 * s, 0.05 * s], [0, 0, 0.5]);
        b1.castShadow = b2.castShadow = b3.castShadow = false;
        rig.flickers.push({ obj: b3, speed: 20, amp: 0.15 });
        break;
      }
      case 'rock':
        t.rotation.x = 0.2;
        [0.12, 0.095, 0.07].forEach((r, i) => mesh(t, G.dodeca, M.accent, [0, 0.02 * s, -(0.1 + i * 0.13) * s], r * s, [i, i * 2, 0]));
        break;
      case 'club':
        t.rotation.x = 0.35;
        mesh(t, capsule(0.06 * s, 0.35 * s), M.bodyPlain, [0, 0, -0.2 * s], 1, [Math.PI / 2, 0, 0]);
        mesh(t, G.dodeca1, M.accent, [0, 0.02 * s, -0.45 * s], 0.13 * s);
        break;
      case 'fluffy':
        t.rotation.x = -0.9;
        mesh(t, G.sphere, M.bodyPlain, [0, 0.12 * s, 0], [0.11 * s, 0.2 * s, 0.11 * s]);
        mesh(t, G.sphere, M.belly, [0, 0.28 * s, 0.01 * s], [0.1 * s, 0.13 * s, 0.1 * s]);
        break;
      case 'long': {
        let prev = t;
        t.rotation.x = 0.4;
        for (let i = 0; i < 4; i++) {
          const seg = pivot(prev, 0, 0, i === 0 ? 0 : -0.12 * s);
          seg.rotation.x = -0.18;
          mesh(seg, G.sphereMid, i === 3 ? M.accent : M.bodyPlain, [0, 0, -0.06 * s], [(0.06 - i * 0.01) * s, (0.06 - i * 0.01) * s, 0.09 * s]);
          prev = seg;
        }
        break;
      }
      case 'stinger': {
        t.rotation.x = -0.6;
        let prev = t;
        for (let i = 0; i < 5; i++) {
          const seg = pivot(prev, 0, i === 0 ? 0 : 0.12 * s, 0);
          seg.rotation.x = -0.32;
          mesh(seg, G.sphereMid, M.bodyPlain, [0, 0.06 * s, 0], [(0.07 - i * 0.006) * s, 0.08 * s, (0.07 - i * 0.006) * s]);
          prev = seg;
        }
        mesh(prev, G.cone, M.accent, [0, 0.18 * s, 0.04 * s], [0.04 * s, 0.14 * s, 0.04 * s], [0.7, 0, 0]);
        break;
      }
      case 'feather':
        t.rotation.x = 0.3;
        for (let i = -2; i <= 2; i++) mesh(t, G.leaf, i === 0 ? M.accent : M.bodyPlain, [i * 0.03 * s, 0, 0], [0.18 * s, 0.38 * s, 1], [-Math.PI / 2 - 0.3, i * 0.25, 0]);
        break;
      default: break;
    }
    if (!first) first = t;
  }
  rig.tail = first;
  return first;
}

function addWings(body, M, rig, y, size, { bat = false, insect = false, z = -0.06, x = 0.3 } = {}) {
  for (const side of [-1, 1]) {
    const w = pivot(body, side * x, y, z);
    w.userData.side = side;
    const geo = bat ? G.batWing : G.wing;
    const mat = bat || insect ? M.wingMem : M.accent;
    const m = mesh(w, geo, mat, [0, 0, 0], [size * side, size, 1], [0, insect ? -0.2 : 0, 0.15]);
    if (insect) mesh(w, geo, mat, [0, -0.05 * size, -0.02], [size * 0.75 * side, size * 0.7, 1], [0, -0.2, -0.45]);
    m.castShadow = true;
    rig.wings.push(w);
  }
}

function addExtras(L, M, rig, { head, hr, back, backY, body, scale = 1 }) {
  const ex = L.extras || [];
  const s = hr / 0.33;
  const has = (k) => ex.includes(k);
  if (has('mane')) {
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = mesh(head, G.flame, L.glow ? M.glow : M.accent, [Math.cos(a) * hr * 0.92, Math.sin(a) * hr * 0.92 + 0.02, -0.06 * s], [0.14 * s, 0.32 * s, 0.14 * s], [0, 0, a - Math.PI / 2]);
      c.castShadow = false;
      if (i % 3 === 0) rig.flickers.push({ obj: c, speed: 9 + i, amp: 0.15 });
    }
  }
  if (has('horns')) {
    for (const side of [-1, 1]) {
      const p = pivot(head, side * 0.13 * s, 0.25 * s, 0.02 * s);
      p.rotation.set(-0.4, 0, -side * 0.35);
      mesh(p, G.cone, M.claw, [0, 0.15 * s, 0], [0.045 * s, 0.32 * s, 0.045 * s]);
      if (L.unicorn && side === 1) { /* une seule corne centrale ci-dessous */ }
    }
    if (L.unicorn) mesh(head, G.cone, M.crystal, [0, 0.36 * s, 0.12 * s], [0.05 * s, 0.4 * s, 0.05 * s], [-0.3, 0, 0]);
  }
  if (has('antlers')) {
    for (const side of [-1, 1]) {
      const p = pivot(head, side * 0.12 * s, 0.26 * s, -0.02 * s);
      p.rotation.z = -side * 0.4;
      mesh(p, G.cylLow, M.accent, [0, 0.16 * s, 0], [0.025 * s, 0.32 * s, 0.025 * s]);
      mesh(p, G.cylLow, M.accent, [side * 0.07 * s, 0.22 * s, 0], [0.02 * s, 0.16 * s, 0.02 * s], [0, 0, -side * 0.8]);
      mesh(p, G.cylLow, M.accent, [-side * 0.04 * s, 0.3 * s, 0], [0.018 * s, 0.12 * s, 0.018 * s], [0, 0, side * 0.6]);
      mesh(p, G.leaf, M.glow, [side * 0.12 * s, 0.28 * s, 0], [0.12 * s, 0.16 * s, 1], [0, 0, -side * 1.1]).castShadow = false;
    }
  }
  if (has('crest')) mesh(head, G.sphere, M.accent, [0, 0.3 * s, -0.05 * s], [0.03 * s, 0.17 * s, 0.22 * s]);
  if (has('cap')) {
    mesh(head, G.sphere, M.accent, [0, hr * 0.72, 0], [hr * 1.45, hr * 0.78, hr * 1.45]);
    mesh(head, G.cyl, M.belly, [0, hr * 0.42, 0], [hr * 1.2, hr * 0.12, hr * 1.2]);
    [[0.4, 0.9, 0.5], [-0.5, 0.95, 0.3], [0.1, 1.15, -0.4], [-0.2, 1.1, 0.75], [0.7, 0.75, -0.3], [-0.75, 0.78, -0.25]]
      .forEach(([x, y, z]) => mesh(head, G.sphereLow, M.claw, [x * hr, y * hr, z * hr], [hr * 0.16, hr * 0.08, hr * 0.16]));
  }
  if (has('whiskers')) {
    for (const side of [-1, 1]) for (const k of [-1, 1]) {
      mesh(head, G.cylLow, M.dark, [side * 0.16 * s, -0.06 * s + k * 0.015 * s, hr * 0.85], [0.004 * s, 0.17 * s, 0.004 * s], [0, 0, side * (Math.PI / 2 + k * 0.15)]).castShadow = false;
    }
  }
  if (has('tusks')) for (const side of [-1, 1]) mesh(head, G.cone, M.claw, [side * 0.07 * s, -0.17 * s, hr * 0.85], [0.03 * s, 0.2 * s, 0.03 * s], [Math.PI + 0.2, 0, 0]);
  if (has('halo')) {
    const h = mesh(head, G.torus, M.glow, [0, hr * 1.35, -0.02], [hr * 0.6, hr * 0.6, hr * 0.6], [Math.PI / 2, 0, 0]);
    h.castShadow = false;
    rig.flickers.push({ obj: h, speed: 2, amp: 0.05 });
  }
  if (has('gem')) mesh(head, G.octa, M.crystal, [0, hr * 0.45, hr * 0.8], [0.05 * s, 0.07 * s, 0.03 * s]).castShadow = false;
  if (has('scarf') && body) {
    mesh(body, G.torus, M.accent, [0, backY * 0.75, 0.02], [0.33 * scale, 0.33 * scale, 0.6 * scale], [Math.PI / 2, 0, 0]);
    mesh(body, G.box, M.accent, [0.12 * scale, backY * 0.55, -0.25 * scale], [0.08 * scale, 0.22 * scale, 0.02], [0.3, 0, 0.2]);
  }
  if (has('collar') && body) {
    mesh(body, G.torus, M.accent, [0, backY * 0.75, 0.25 * scale], [0.22 * scale, 0.22 * scale, 0.5], [Math.PI / 2 - 0.3, 0, 0]);
    mesh(body, G.sphereLow, M.crystal, [0, backY * 0.5, 0.45 * scale], 0.05 * scale).castShadow = false;
  }
  if (has('cape') && body) {
    const cape = mesh(body, G.sphere, M.accent, [0, backY * 0.2, -0.28 * scale], [0.38 * scale, 0.5 * scale, 0.1 * scale], [0.15, 0, 0]);
    cape.material = M.accent;
  }
  if (back) {
    if (has('crystals')) {
      [[0, 0, 0.18], [-0.1, -0.12, 0.13], [0.1, -0.12, 0.13], [0, -0.25, 0.1]].forEach(([x, z, hgt], i) => {
        const c = mesh(back, G.octa, M.crystal, [x * scale, backY, z * scale - 0.05], [0.06 * scale, hgt * scale, 0.06 * scale], [0.2 * (i - 1.5), 0, x * 2]);
        c.castShadow = false;
        rig.flickers.push({ obj: c, speed: 2.5 + i, amp: 0.06 });
      });
    }
    if (has('spikes')) [0.12, -0.04, -0.2, -0.36].forEach((z) => mesh(back, G.cone, M.dark, [0, backY - 0.02, z * scale], [0.05 * scale, 0.14 * scale, 0.05 * scale], [-0.4, 0, 0]));
    if (has('plates')) [0.1, -0.1, -0.3].forEach((z, i) => mesh(back, G.box, M.accent, [0, backY + 0.02, z * scale], [0.32 * scale, 0.04 * scale, 0.16 * scale], [0.15, 0, 0]).rotation.z = (i - 1) * 0.05);
    if (has('shell') && body) {
      mesh(body, G.hemi, M.accent, [0, backY * 0.4, -0.02 * scale], [0.48 * scale, 0.42 * scale, 0.58 * scale]);
      for (let i = 0; i < 5; i++) mesh(body, G.sphereLow, M.belly, [Math.sin(i * 1.3) * 0.2 * scale, backY * 0.4 + 0.33 * scale, Math.cos(i * 1.3) * 0.25 * scale - 0.02], [0.07 * scale, 0.025 * scale, 0.07 * scale]);
    }
    if (has('leaves')) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      mesh(back, G.leaf, M.accent, [Math.cos(a) * 0.12 * scale, backY + 0.02, Math.sin(a) * 0.14 * scale - 0.05], [0.22 * scale, 0.3 * scale, 1], [-0.6 + Math.sin(a) * 0.4, a, Math.cos(a) * 0.4]);
    }
    if (has('flowers')) for (let i = 0; i < 3; i++) {
      const f = pivot(back, (i - 1) * 0.12 * scale, backY + 0.05, -0.08 * scale + (i % 2) * 0.1 * scale);
      for (let p = 0; p < 5; p++) mesh(f, G.sphereLow, M.claw, [Math.cos(p * 1.256) * 0.04 * scale, 0, Math.sin(p * 1.256) * 0.04 * scale], [0.035 * scale, 0.015 * scale, 0.035 * scale]);
      mesh(f, G.sphereLow, M.glow, [0, 0.01, 0], 0.025 * scale).castShadow = false;
    }
    if (has('flames')) for (let i = 0; i < 4; i++) {
      const fl = mesh(back, G.flame, M.glow, [(i - 1.5) * 0.08 * scale, backY - 0.02, -0.1 * scale + Math.sin(i) * 0.08], [0.12 * scale, 0.3 * scale, 0.12 * scale], [-0.2, 0, (i - 1.5) * 0.2]);
      fl.castShadow = false;
      rig.flickers.push({ obj: fl, speed: 11 + i * 2, amp: 0.25 });
    }
    if (has('ice')) for (let i = 0; i < 4; i++) {
      mesh(back, G.octa, M.ice, [(i - 1.5) * 0.09 * scale, backY + 0.04, -0.05 * scale], [0.05 * scale, 0.14 * scale, 0.05 * scale], [0, i, (i - 1.5) * 0.3]).castShadow = false;
    }
    if (has('bolts')) for (let i = 0; i < 3; i++) {
      const b = mesh(back, G.box, M.glow, [(i - 1) * 0.12 * scale, backY + 0.05, -0.05 * scale], [0.03 * scale, 0.16 * scale, 0.03 * scale], [0, 0, (i - 1) * 0.6 + 0.4]);
      b.castShadow = false;
      rig.flickers.push({ obj: b, speed: 25 + i, amp: 0.3 });
    }
    if (has('smoke')) for (let i = 0; i < 3; i++) {
      const sm = mesh(back, G.sphereMid, M.smoke, [(i - 1) * 0.1 * scale, backY + 0.1 + i * 0.05, -0.15 * scale], 0.09 * scale);
      sm.castShadow = false;
      rig.flickers.push({ obj: sm, speed: 2 + i, amp: 0.2 });
    }
    if (has('orbs')) {
      const ring = pivot(back, 0, backY + 0.1, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const o = mesh(ring, G.sphereMid, M.glow, [Math.cos(a) * 0.4 * scale, Math.sin(i) * 0.05, Math.sin(a) * 0.4 * scale], 0.05 * scale);
        o.castShadow = false;
      }
      rig.spinners = rig.spinners || [];
      rig.spinners.push(ring);
    }
    if (has('armor') && body) {
      mesh(body, G.hemi, M.accent, [0, backY * 0.3, 0.12 * scale], [0.36 * scale, 0.32 * scale, 0.32 * scale], [-0.6, 0, 0]);
    }
    if (has('vines')) for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      let prev = pivot(back, Math.cos(a) * 0.18 * scale, -backY * 0.3, Math.sin(a) * 0.18 * scale);
      rig.segments.push(prev);
      for (let k = 0; k < 3; k++) {
        const seg = pivot(prev, 0, -0.12 * scale, 0);
        mesh(seg, G.sphereLow, k === 2 ? M.glow : M.accent, [0, -0.04 * scale, 0], [0.025 * scale, 0.08 * scale, 0.025 * scale]).castShadow = k !== 2;
        prev = seg;
      }
    }
  }
}

function addClaws(parent, M, x, y, z, s) {
  for (let i = -1; i <= 1; i++) mesh(parent, G.coneLow, M.claw, [x + i * 0.03 * s, y, z], [0.012 * s, 0.05 * s, 0.012 * s], [Math.PI / 2 + 0.3, 0, 0]).castShadow = false;
}

// ═══ PLANS DE CORPS ═════════════════════════════════════════════════════
function buildQuad(L, M, rig, root) {
  const chub = L.chubby ? 1.15 : 1;
  const body = pivot(root, 0, 0.56, 0);
  rig.body = body;
  mesh(body, G.sphere, M.body, [0, 0, 0], [0.42 * chub, 0.36 * chub, 0.56]);
  mesh(body, G.sphere, M.belly, [0, -0.1, 0.08], [0.32 * chub, 0.26 * chub, 0.44]);
  const head = pivot(body, 0, 0.3, 0.44);
  rig.head = head;
  if (L.frog) {
    head.position.set(0, 0.18, 0.4);
    mesh(head, G.sphere, M.body, [0, 0, 0], [0.4, 0.26, 0.34]);
    mesh(head, G.sphere, M.belly, [0, -0.08, 0.12], [0.34, 0.16, 0.26]);
    addEyes(head, M, rig, { r: 0.3, spread: 0.55, y: 0.18, style: L.eyes || 'big', size: 1.2 });
    addMouth(head, M, { r: 0.33, y: -0.07, kind: L.mouth || 'smile', z: 0.92 });
  } else {
    mesh(head, G.sphere, M.body, [0, 0, 0], [0.36, 0.33, 0.34]);
    mesh(head, G.sphere, M.belly, [0, -0.12, 0.1], [0.24, 0.17, 0.22]);
    const sn = addSnout(head, M, { r: 0.33, kind: L.snout || 'short' });
    addEyes(head, M, rig, { r: 0.34, spread: 0.43, y: 0.07, style: L.eyes || 'big' });
    addMouth(head, M, { r: 0.33, y: -0.16, kind: L.mouth || 'neutral', z: 0.9 + sn * 0.9 });
    if ((L.eyes || 'big') !== 'sharp') for (const side of [-1, 1]) mesh(head, G.sphereLow, M.blush, [side * 0.22, -0.08, 0.23], [0.06, 0.035, 0.02], [0, side * 0.7, 0]).castShadow = false;
    addEars(head, M, rig, L.ears, 0.33);
  }
  const legLen = L.frog ? 0.12 : 0.2;
  for (const [x, z, ph] of [[-0.24, 0.3, 1], [0.24, 0.3, -1], [-0.24, -0.3, -1], [0.24, -0.3, 1]]) {
    const leg = pivot(root, x * chub, 0.38, z);
    leg.userData.phase = ph;
    mesh(leg, capsule(0.09, legLen), M.bodyPlain, [0, -0.19, 0]);
    mesh(leg, G.sphere, (L.pattern === 'socks' ? M.dark : M.belly), [0, -0.33, 0.03], [0.11, 0.07, 0.13]);
    if (L.extras?.includes('claws')) addClaws(leg, M, 0, -0.34, 0.15, 1);
    rig.legs.push(leg);
  }
  addTail(body, M, rig, L.tail, [0, 0.08, -0.5], 1, L.tails || 1);
  addExtras(L, M, rig, { head, hr: 0.33, back: body, backY: 0.33, body });
  if (L.extras?.includes('bigwings') || L.extras?.includes('wings')) addWings(body, M, rig, 0.25, 0.9, { x: 0.25 });
}

function buildBiped(L, M, rig, root) {
  const chub = L.chubby ? 1.18 : L.slim ? 0.82 : 1;
  const body = pivot(root, 0, 0.58, 0);
  rig.body = body;
  if (L.penguin) {
    mesh(body, G.sphere, M.body, [0, 0.02, 0], [0.34, 0.45, 0.32]);
    mesh(body, G.sphere, M.belly, [0, -0.02, 0.1], [0.27, 0.38, 0.25]);
  } else {
    mesh(body, G.sphere, M.body, [0, 0, 0], [0.36 * chub, 0.42, 0.33 * chub]);
    mesh(body, G.sphere, M.belly, [0, -0.05, 0.14 * chub], [0.27 * chub, 0.32, 0.21 * chub]);
  }
  if (L.fluffy) for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mesh(body, G.sphereMid, M.bodyPlain, [Math.cos(a) * 0.3 * chub, -0.2 + Math.sin(i * 2.1) * 0.15, Math.sin(a) * 0.28 * chub], 0.13);
  }
  const head = pivot(body, 0, 0.5, 0.02);
  rig.head = head;
  mesh(head, G.sphere, M.body, [0, 0, 0], [0.34, 0.31, 0.31]);
  if (!L.penguin) mesh(head, G.sphere, M.belly, [0, -0.1, 0.17], [0.17, 0.12, 0.14]);
  const sn = addSnout(head, M, { r: 0.31, kind: L.snout || 'none' });
  addEyes(head, M, rig, { r: 0.31, spread: 0.4, y: 0.05, style: L.eyes || 'big' });
  addMouth(head, M, { r: 0.31, y: -0.13, kind: L.mouth || 'smile', z: 0.92 + sn });
  if ((L.eyes === 'big' || L.eyes === 'cute')) for (const side of [-1, 1]) mesh(head, G.sphereLow, M.blush, [side * 0.2, -0.08, 0.21], [0.06, 0.035, 0.02], [0, side * 0.6, 0]).castShadow = false;
  addEars(head, M, rig, L.ears, 0.31);
  for (const side of [-1, 1]) {
    const leg = pivot(root, side * 0.15 * chub, 0.3, 0);
    leg.userData.phase = side;
    mesh(leg, capsule(0.09, 0.12), M.bodyPlain, [0, -0.13, 0]);
    mesh(leg, G.sphere, L.penguin ? M.accent : M.belly, [0, -0.26, 0.05], [0.11, 0.06, 0.16]);
    rig.legs.push(leg);
    const armSets = L.fourArms ? [0.12, -0.08] : [0.08];
    for (const ay of armSets) {
      const arm = pivot(body, side * 0.33 * chub, ay, 0.03);
      arm.rotation.z = side * 0.35;
      arm.userData.side = side;
      arm.userData.phase = -side;
      if (L.penguin) mesh(arm, G.sphere, M.bodyPlain, [0, -0.15, 0], [0.05, 0.2, 0.1]);
      else {
        mesh(arm, capsule(0.065, 0.14), M.bodyPlain, [0, -0.12, 0]);
        mesh(arm, G.sphere, M.belly, [0, -0.25, 0], 0.075);
        if (L.extras?.includes('claws')) addClaws(arm, M, 0, -0.29, 0.04, 1);
      }
      rig.arms.push(arm);
    }
  }
  addTail(body, M, rig, L.tail, [0, -0.2, -0.28]);
  addExtras(L, M, rig, { head, hr: 0.31, back: body, backY: 0.3, body });
  if (L.extras?.includes('bigwings') || L.extras?.includes('wings')) addWings(body, M, rig, 0.2, 0.7, { x: 0.22, insect: !!L.glow });
}

function buildFloat(L, M, rig, root) {
  rig.isFloat = true;
  const body = pivot(root, 0, 0.8, 0);
  rig.body = body;
  rig.head = null;
  if (L.jelly) {
    mesh(body, G.hemi, M.body, [0, -0.05, 0], [0.42, 0.42, 0.42]);
    mesh(body, G.cyl, M.belly, [0, -0.05, 0], [0.42, 0.04, 0.42]);
    addEyes(body, M, rig, { r: 0.42, spread: 0.36, y: 0.12, style: L.eyes || 'glow' });
  } else if (L.rocky) {
    mesh(body, G.dodeca1, M.body, [0, 0, 0], [0.4, 0.36, 0.38]);
    addEyes(body, M, rig, { r: 0.38, spread: 0.36, y: 0.04, style: L.eyes || 'glow' });
  } else if (L.crystal) {
    mesh(body, G.octa, M.crystal, [0, 0, 0], [0.32, 0.42, 0.32]);
    mesh(body, G.ico, M.body, [0, 0, 0], 0.28);
    addEyes(body, M, rig, { r: 0.3, spread: 0.36, y: 0.04, style: L.eyes || 'big' });
    addMouth(body, M, { r: 0.3, y: -0.1, kind: L.mouth || 'smile', z: 0.95 });
  } else {
    mesh(body, G.sphere, M.body, [0, 0, 0], [0.4, 0.38, 0.38]);
    mesh(body, G.sphere, M.belly, [0, -0.06, 0.2], [0.3, 0.27, 0.2]);
    addEyes(body, M, rig, { r: 0.38, spread: 0.38, y: 0.07, size: 1.15, style: L.eyes || 'big' });
    addMouth(body, M, { r: 0.38, y: -0.12, kind: L.mouth || 'smile', z: 0.93 });
    if (L.eyes === 'big' || L.eyes === 'cute') for (const side of [-1, 1]) mesh(body, G.sphereLow, M.blush, [side * 0.24, -0.08, 0.28], [0.07, 0.04, 0.02], [0, side * 0.6, 0]).castShadow = false;
  }
  addEars(body, M, rig, L.ears, 0.38);
  if (L.wisp) {
    let prev = body;
    for (let i = 0; i < 4; i++) {
      const seg = pivot(prev, 0, -0.18, -0.06);
      mesh(seg, G.sphereMid, M.smoke, [0, 0, 0], 0.22 - i * 0.045).castShadow = false;
      rig.segments.push(seg);
      prev = seg;
    }
  } else if (!L.jelly) {
    for (const side of [-1, 1]) {
      const arm = pivot(body, side * 0.36, -0.05, 0.08);
      arm.userData.side = side;
      arm.userData.phase = -side;
      mesh(arm, G.sphere, M.bodyPlain, [side * 0.06, -0.06, 0], [0.08, 0.1, 0.08]);
      rig.arms.push(arm);
    }
  }
  const big = L.extras?.includes('bigwings');
  if (big || L.extras?.includes('wings')) addWings(body, M, rig, 0.1, big ? 0.85 : 0.5, { x: 0.32 });
  if (!L.jelly && !L.wisp && !L.crystal) {
    const core = mesh(body, G.sphereMid, M.glow, [0, -0.4, 0], 0.07);
    core.castShadow = false;
    rig.flickers.push({ obj: core, speed: 7, amp: 0.3 });
  }
  addTail(body, M, rig, L.tail, [0, -0.05, -0.36]);
  addExtras(L, M, rig, { head: body, hr: 0.38, back: body, backY: 0.33, body });
}

function buildSerpent(L, M, rig, root) {
  const head = pivot(root, 0, 0.42, 0.5);
  rig.head = head;
  mesh(head, G.sphere, M.body, [0, 0, 0], [0.27, 0.23, 0.31]);
  mesh(head, G.sphere, M.belly, [0, -0.08, 0.15], [0.17, 0.1, 0.17]);
  addEyes(head, M, rig, { r: 0.27, spread: 0.52, y: 0.08, style: L.eyes || 'big' });
  addMouth(head, M, { r: 0.27, y: -0.1, kind: L.mouth || 'smile', z: 0.95 });
  addEars(head, M, rig, L.ears, 0.25);
  const n = 6;
  let last = null;
  for (let i = 0; i < n; i++) {
    const r = 0.25 - i * 0.026;
    const seg = pivot(root, 0, 0.28 - i * 0.022, 0.22 - i * 0.26);
    mesh(seg, G.sphere, i % 2 && L.pattern === 'rings' ? M.accent : M.bodyPlain, [0, 0, 0], [r, r * 0.9, r * 1.25]);
    mesh(seg, G.sphere, M.belly, [0, -r * 0.35, 0], [r * 0.8, r * 0.55, r * 1.1]);
    if (L.extras?.includes('spikes')) mesh(seg, G.cone, M.accent, [0, r * 0.9, 0], [0.04, 0.11, 0.04], [-0.3, 0, 0]);
    if (L.extras?.includes('legs') && (i === 1 || i === 4)) {
      for (const side of [-1, 1]) {
        const leg = pivot(seg, side * r * 0.85, -r * 0.3, 0);
        leg.userData.phase = side * (i === 1 ? 1 : -1);
        mesh(leg, capsule(0.04, 0.08), M.bodyPlain, [side * 0.03, -0.08, 0], 1, [0, 0, side * 0.5]);
        rig.legs.push(leg);
      }
    }
    rig.segments.push(seg);
    last = seg;
  }
  addTail(last, M, rig, L.tail, [0, 0.02, -0.15], 0.9);
  addExtras(L, M, rig, { head, hr: 0.25, back: rig.segments[1], backY: 0.2, body: rig.segments[1], scale: 0.7 });
}

function buildGolem(L, M, rig, root) {
  const body = pivot(root, 0, 0.72, 0);
  rig.body = body;
  const geoBody = L.metal ? G.box : G.dodeca1;
  mesh(body, geoBody, M.body, [0, 0, 0], L.metal ? [0.78, 0.7, 0.62] : [0.5, 0.46, 0.42]);
  const chest = mesh(body, G.octa, M.glow, [0, 0.04, L.metal ? 0.32 : 0.36], [0.12, 0.17, 0.08]);
  chest.castShadow = false;
  rig.flickers.push({ obj: chest, speed: 3, amp: 0.08 });
  for (let i = 0; i < 4; i++) mesh(body, G.dodeca, M.belly, [Math.sin(i * 2.3) * 0.35, Math.cos(i * 1.7) * 0.25, Math.cos(i * 2.3) * 0.25], 0.1 + (i % 2) * 0.04, [i, i * 2, 0]);
  const head = pivot(body, 0, 0.47, 0.06);
  rig.head = head;
  mesh(head, L.metal ? G.box : G.dodeca1, M.body, [0, 0, 0], L.metal ? [0.36, 0.3, 0.34] : [0.24, 0.21, 0.22], [0.2, 0.3, 0]);
  addEyes(head, M, rig, { r: 0.22, spread: 0.38, y: 0.02, style: 'glow' });
  for (const side of [-1, 1]) {
    const arm = pivot(body, side * 0.5, 0.2, 0);
    arm.userData.side = side;
    arm.userData.phase = -side;
    mesh(arm, G.dodeca, M.body, [side * 0.06, -0.12, 0], 0.17, [0.3, side, 0]);
    mesh(arm, G.dodeca1, M.belly, [side * 0.08, -0.42, 0.05], 0.21, [0.5, 0, side]);
    mesh(body, G.dodeca, M.accent, [side * 0.42, 0.35, -0.05], 0.12, [side, 0.4, 0]);
    rig.arms.push(arm);
    const leg = pivot(root, side * 0.22, 0.32, 0);
    leg.userData.phase = side;
    mesh(leg, G.cylLow, M.body, [0, -0.12, 0], [0.13, 0.3, 0.13]);
    mesh(leg, G.dodeca, M.belly, [0, -0.28, 0.04], [0.16, 0.09, 0.2]);
    rig.legs.push(leg);
  }
  addExtras(L, M, rig, { head, hr: 0.22, back: body, backY: 0.38, body });
}

function buildBird(L, M, rig, root) {
  const chub = L.chubby ? 1.2 : 1;
  const body = pivot(root, 0, 0.52, 0);
  rig.body = body;
  if (L.crane) {
    mesh(body, G.sphere, M.body, [0, 0.1, 0], [0.26, 0.28, 0.36]);
  } else {
    mesh(body, G.sphere, M.body, [0, 0, 0], [0.3 * chub, 0.32 * chub, 0.36]);
    mesh(body, G.sphere, M.belly, [0, -0.06, 0.12], [0.24 * chub, 0.25 * chub, 0.26]);
  }
  const head = pivot(body, 0, L.crane ? 0.55 : 0.36, L.crane ? 0.18 : 0.14);
  rig.head = head;
  if (L.crane) mesh(body, capsule(0.06, 0.3), M.bodyPlain, [0, 0.35, 0.12], 1, [0.3, 0, 0]);
  mesh(head, G.sphere, M.body, [0, 0, 0], [0.26, 0.25, 0.25]);
  if (L.pattern === 'mask') mesh(head, G.sphereMid, M.dark, [0, 0.03, 0.12], [0.2, 0.08, 0.14]).castShadow = false;
  if (L.bat) {
    addSnout(head, M, { r: 0.25, kind: 'short' });
    addMouth(head, M, { r: 0.25, y: -0.12, kind: L.mouth || 'fangs', z: 1.15 });
  } else addSnout(head, M, { r: 0.25, kind: 'beak' });
  addEyes(head, M, rig, { r: 0.25, spread: 0.5, y: 0.05, style: L.eyes || 'big', size: L.chubby ? 1.3 : 1 });
  addEars(head, M, rig, L.ears, 0.25);
  addWings(body, M, rig, 0.08, L.extras?.includes('bigwings') ? 1.0 : 0.6, { bat: !!L.bat, x: 0.24 * chub });
  const legH = L.crane ? 0.38 : 0.22;
  for (const side of [-1, 1]) {
    const leg = pivot(root, side * 0.1, legH + 0.04, 0);
    leg.userData.phase = side;
    mesh(leg, G.cylLow, M.accent, [0, -legH / 2, 0], [0.02, legH, 0.02]);
    for (let k = -1; k <= 1; k++) mesh(leg, G.cylLow, M.accent, [k * 0.03, -legH, 0.05], [0.012, 0.1, 0.012], [Math.PI / 2, k * 0.4, 0]);
    rig.legs.push(leg);
  }
  addTail(body, M, rig, L.tail || 'feather', [0, -0.05, -0.32]);
  addExtras(L, M, rig, { head, hr: 0.25, back: body, backY: 0.28, body });
}

function buildFish(L, M, rig, root) {
  const chub = L.chubby ? 1.2 : 1;
  const body = pivot(root, 0, L.upright ? 0.7 : 0.4, 0);
  rig.body = body;
  rig.isFloat = !L.seal;
  if (L.upright) {
    mesh(body, G.sphere, M.body, [0, 0, 0], [0.22, 0.4, 0.24]);
    mesh(body, G.sphere, M.belly, [0, -0.02, 0.08], [0.16, 0.32, 0.18]);
  } else {
    mesh(body, G.sphere, M.body, [0, 0, 0], [0.32 * chub, 0.3 * chub, 0.52]);
    mesh(body, G.sphere, M.belly, [0, -0.1, 0.06], [0.26 * chub, 0.2 * chub, 0.42]);
  }
  const head = pivot(body, 0, L.upright ? 0.38 : 0.06, L.upright ? 0.08 : 0.38);
  rig.head = head;
  mesh(head, G.sphere, M.body, [0, 0, 0], [0.27 * chub, 0.26 * chub, 0.27]);
  if (L.upright) mesh(head, G.cyl, M.bodyPlain, [0, -0.04, 0.25], [0.06, 0.18, 0.06], [Math.PI / 2, 0, 0]);
  if (L.seal) addSnout(head, M, { r: 0.27, kind: 'muzzle' });
  addEyes(head, M, rig, { r: 0.27, spread: 0.55, y: 0.06, style: L.eyes || 'big' });
  addMouth(head, M, { r: 0.27, y: -0.12, kind: L.mouth || 'smile', z: L.seal ? 1.3 : 0.95 });
  if (L.extras?.includes('fins') || !L.seal) {
    mesh(body, G.cone, M.accent, [0, 0.3, -0.05], [0.04, 0.28, 0.22], [-0.3, 0, 0]);
  }
  for (const side of [-1, 1]) {
    const fin = pivot(body, side * 0.28 * chub, -0.1, 0.12);
    fin.userData.side = side;
    mesh(fin, G.sphere, L.seal ? M.bodyPlain : M.accent, [side * 0.08, 0, 0], [0.12, 0.03, 0.08], [0, 0, side * 0.3]);
    rig.wings.push(fin);
  }
  addTail(body, M, rig, L.upright ? 'long' : (L.tail || 'fishtail'), L.upright ? [0, -0.38, -0.02] : [0, 0, -0.48]);
  addExtras(L, M, rig, { head, hr: 0.27, back: body, backY: 0.28, body });
}

function buildInsect(L, M, rig, root) {
  const thorax = pivot(root, 0, 0.42, 0);
  rig.body = thorax;
  const long = L.dragonfly;
  mesh(thorax, G.sphere, M.body, [0, 0, 0], [0.24, 0.22, 0.26]);
  const abd = pivot(thorax, 0, -0.02, -0.25);
  if (long) {
    for (let i = 0; i < 5; i++) mesh(abd, G.sphereMid, i % 2 ? M.accent : M.bodyPlain, [0, 0, -i * 0.15], [0.09, 0.09, 0.1]);
  } else {
    mesh(abd, G.sphere, M.body, [0, 0.02, -0.12], [0.3, 0.26, 0.34]);
    mesh(abd, G.sphere, M.belly, [0, -0.06, -0.1], [0.24, 0.18, 0.28]);
  }
  rig.segments.push(abd);
  const head = pivot(thorax, 0, 0.12, 0.26);
  rig.head = head;
  mesh(head, G.sphere, M.body, [0, 0, 0], [0.24, 0.22, 0.22]);
  addEyes(head, M, rig, { r: 0.22, spread: 0.55, y: 0.04, style: L.eyes || 'big', size: 1.15 });
  addEars(head, M, rig, L.ears, 0.22);
  if (L.extras?.includes('legs') || true) {
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const leg = pivot(thorax, side * 0.18, -0.08, 0.1 - i * 0.12);
      leg.userData.phase = (i % 2 ? 1 : -1) * side;
      leg.rotation.z = side * 0.9;
      mesh(leg, G.cylLow, M.dark, [0, -0.1, 0], [0.018, 0.22, 0.018]);
      mesh(leg, G.cylLow, M.dark, [side * 0.06, -0.22, 0], [0.014, 0.16, 0.014], [0, 0, -side * 1.1]);
      rig.legs.push(leg);
    }
  }
  if (L.extras?.includes('claws')) {
    for (const side of [-1, 1]) {
      const arm = pivot(thorax, side * 0.2, 0, 0.18);
      arm.userData.side = side;
      arm.userData.phase = -side;
      mesh(arm, capsule(0.05, 0.12), M.bodyPlain, [side * 0.06, 0, 0.1], 1, [Math.PI / 2, 0, -side * 0.5]);
      mesh(arm, G.sphere, M.accent, [side * 0.1, 0, 0.26], [0.1, 0.07, 0.12]);
      mesh(arm, G.cone, M.accent, [side * 0.06, 0.04, 0.36], [0.03, 0.12, 0.03], [Math.PI / 2, 0, 0]);
      rig.arms.push(arm);
    }
  }
  if (L.extras?.includes('shell')) mesh(abd, G.hemi, M.accent, [0, 0.06, -0.1], [0.32, 0.26, 0.38]);
  if (L.extras?.includes('horns')) mesh(head, G.cone, M.accent, [0, 0.18, 0.12], [0.05, 0.3, 0.05], [-0.5, 0, 0]);
  const wings = L.extras?.includes('bigwings') || long;
  if (wings) addWings(thorax, M, rig, 0.16, long ? 0.75 : 0.95, { insect: true, x: 0.08, z: -0.05 });
  addTail(abd, M, rig, L.tail, [0, 0.05, long ? -0.65 : -0.38]);
  addExtras(L, M, rig, { head, hr: 0.22, back: abd, backY: 0.24, body: abd, scale: 0.8 });
}

function buildPlant(L, M, rig, root) {
  const body = pivot(root, 0, 0.1, 0);
  rig.body = body;
  if (L.cactus) {
    mesh(body, capsule(0.22, 0.6), M.body, [0, 0.55, 0]);
    for (let i = 0; i < 8; i++) mesh(body, G.cylLow, M.belly, [Math.cos(i * 0.785) * 0.21, 0.55, Math.sin(i * 0.785) * 0.21], [0.015, 0.7, 0.015]);
    for (const side of [-1, 1]) {
      const arm = pivot(body, side * 0.22, 0.55, 0);
      arm.userData.side = side;
      arm.userData.phase = -side;
      mesh(arm, capsule(0.09, 0.12), M.bodyPlain, [side * 0.12, 0, 0], 1, [0, 0, Math.PI / 2]);
      mesh(arm, capsule(0.08, 0.15), M.bodyPlain, [side * 0.22, 0.12, 0]);
      rig.arms.push(arm);
    }
    const head = pivot(body, 0, 0.75, 0.12);
    rig.head = head;
    addEyes(head, M, rig, { r: 0.18, spread: 0.45, y: 0, style: L.eyes || 'big' });
    addMouth(head, M, { r: 0.18, y: -0.12, kind: L.mouth || 'smile', z: 0.6 });
    addExtras(L, M, rig, { head, hr: 0.2, back: body, backY: 1.0, body });
  } else {
    // saule
    mesh(body, G.cyl, M.accent, [0, 0.35, 0], [0.12, 0.7, 0.12]);
    const head = pivot(body, 0, 0.85, 0);
    rig.head = head;
    mesh(head, G.sphere, M.body, [0, 0, 0], [0.45, 0.35, 0.45]);
    addEyes(head, M, rig, { r: 0.42, spread: 0.36, y: -0.05, style: L.eyes || 'sleepy' });
    addMouth(head, M, { r: 0.42, y: -0.18, kind: L.mouth || 'neutral', z: 0.95 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      let prev = pivot(head, Math.cos(a) * 0.36, -0.12, Math.sin(a) * 0.36);
      if (Math.sin(a) > 0.6) continue;
      rig.segments.push(prev);
      for (let k = 0; k < 4; k++) {
        const seg = pivot(prev, 0, -0.12, 0);
        mesh(seg, G.leaf, M.bodyPlain, [0, -0.1, 0], [0.12, 0.16, 1], [Math.PI, a, 0]);
        prev = seg;
      }
    }
    for (const side of [-1, 1]) {
      const leg = pivot(root, side * 0.1, 0.12, 0);
      leg.userData.phase = side;
      mesh(leg, G.cone, M.accent, [side * 0.05, -0.05, 0.05], [0.06, 0.2, 0.06], [0.6, 0, side * 0.6]);
      rig.legs.push(leg);
    }
    addExtras(L, M, rig, { head, hr: 0.42, back: head, backY: 0.3, body: head });
  }
}

function buildBlob(L, M, rig, root) {
  const body = pivot(root, 0, 0.02, 0);
  rig.body = body;
  if (L.snail) {
    mesh(body, capsule(0.18, 0.5), M.belly, [0, 0.16, 0.05], 1, [Math.PI / 2, 0, 0]);
    const shell = mesh(body, G.sphere, M.body, [0, 0.42, -0.1], [0.32, 0.32, 0.3]);
    shell.material = M.body;
    for (let i = 0; i < 3; i++) mesh(body, G.torus, M.accent, [0.02, 0.42, -0.1], [0.26 - i * 0.07, 0.26 - i * 0.07, 0.4], [0, Math.PI / 2, 0]);
    const head = pivot(body, 0, 0.3, 0.38);
    rig.head = head;
    mesh(head, G.sphere, M.belly, [0, 0, 0], 0.17);
    addEyes(head, M, rig, { r: 0.17, spread: 0.45, y: 0.04, style: L.eyes || 'big' });
    addMouth(head, M, { r: 0.17, y: -0.06, kind: L.mouth || 'smile', z: 0.95 });
    for (const side of [-1, 1]) {
      mesh(head, G.cylLow, M.belly, [side * 0.07, 0.18, 0], [0.02, 0.2, 0.02], [0, 0, -side * 0.3]);
      mesh(head, G.sphereLow, M.glow, [side * 0.1, 0.28, 0], 0.035).castShadow = false;
    }
    addExtras(L, M, rig, { head, hr: 0.17, back: body, backY: 0.7, body });
    return;
  }
  const geo = L.crystal ? G.octa : G.drop;
  const main = mesh(body, geo, M.body, [0, L.crystal ? 0.4 : 0.2, 0], L.crystal ? [0.34, 0.42, 0.34] : [0.42, 0.42, 0.42]);
  if (!L.crystal) mesh(body, G.sphere, M.belly, [0, 0.32, 0.18], [0.28, 0.22, 0.2]);
  const head = pivot(body, 0, 0.42, 0.05);
  rig.head = head;
  addEyes(head, M, rig, { r: 0.34, spread: 0.36, y: 0.04, style: L.eyes || 'big' });
  addMouth(head, M, { r: 0.34, y: -0.1, kind: L.mouth || 'smile', z: 0.95 });
  if (L.eyes !== 'glow') for (const side of [-1, 1]) mesh(head, G.sphereLow, M.blush, [side * 0.22, -0.06, 0.26], [0.06, 0.03, 0.02], [0, side * 0.6, 0]).castShadow = false;
  rig.root.userData.squash = main;
  addExtras(L, M, rig, { head, hr: 0.34, back: body, backY: 0.62, body });
}

function buildDragon(L, M, rig, root) {
  if (L.serpentine) {
    // long corps ondulant (type léviathan)
    const head = pivot(root, 0, 1.2, 0.55);
    rig.head = head;
    mesh(head, G.sphere, M.body, [0, 0, 0], [0.3, 0.26, 0.36]);
    addSnout(head, M, { r: 0.3, kind: 'long' });
    addEyes(head, M, rig, { r: 0.3, spread: 0.5, y: 0.08, style: L.eyes || 'sharp' });
    addMouth(head, M, { r: 0.3, y: -0.12, kind: L.mouth || 'fangs', z: 1.5 });
    addEars(head, M, rig, L.ears, 0.3);
    const n = 8;
    let last = null;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = 0.28 - t * 0.16;
      const seg = pivot(root, 0, 1.0 - Math.sin(t * Math.PI) * 0.65, 0.35 - i * 0.22);
      mesh(seg, G.sphere, i % 2 && L.pattern === 'stripes' ? M.accent : M.bodyPlain, [0, 0, 0], [r, r, r * 1.3]);
      mesh(seg, G.sphere, M.belly, [0, -r * 0.4, r * 0.1], [r * 0.8, r * 0.55, r * 1.1]);
      if (i % 2 === 0) mesh(seg, G.cone, M.accent, [0, r * 0.95, 0], [0.04, 0.16, 0.08], [-0.4, 0, 0]);
      rig.segments.push(seg);
      last = seg;
    }
    addTail(last, M, rig, L.tail || 'fin', [0, 0, -0.12], 1.2);
    addExtras(L, M, rig, { head, hr: 0.3, back: rig.segments[1], backY: 0.25, body: rig.segments[1] });
    return;
  }
  const body = pivot(root, 0, 0.65, 0);
  rig.body = body;
  mesh(body, G.sphere, M.body, [0, 0, 0], [0.4, 0.38, 0.6]);
  mesh(body, G.sphere, M.belly, [0, -0.1, 0.1], [0.3, 0.28, 0.48]);
  const neck = pivot(body, 0, 0.25, 0.42);
  mesh(neck, capsule(0.14, 0.3), M.bodyPlain, [0, 0.12, 0.05], 1, [0.6, 0, 0]);
  const head = pivot(neck, 0, 0.36, 0.2);
  rig.head = head;
  mesh(head, G.sphere, M.body, [0, 0, 0], [0.28, 0.25, 0.32]);
  addSnout(head, M, { r: 0.28, kind: 'long' });
  addEyes(head, M, rig, { r: 0.28, spread: 0.48, y: 0.08, style: L.eyes || 'sharp' });
  addMouth(head, M, { r: 0.28, y: -0.14, kind: L.mouth || 'fangs', z: 1.5 });
  addEars(head, M, rig, L.ears, 0.28);
  for (const [x, z, ph] of [[-0.26, 0.32, 1], [0.26, 0.32, -1], [-0.26, -0.32, -1], [0.26, -0.32, 1]]) {
    const leg = pivot(root, x, 0.45, z);
    leg.userData.phase = ph;
    mesh(leg, capsule(0.1, 0.25), M.bodyPlain, [0, -0.22, 0]);
    mesh(leg, G.sphere, M.belly, [0, -0.42, 0.04], [0.12, 0.07, 0.15]);
    addClaws(leg, M, 0, -0.43, 0.17, 1.2);
    rig.legs.push(leg);
  }
  if (L.extras?.includes('bigwings') || L.extras?.includes('wings')) addWings(body, M, rig, 0.3, 1.25, { x: 0.25 });
  addTail(body, M, rig, L.tail || 'long', [0, 0.02, -0.55], 1.4);
  addExtras(L, M, rig, { head, hr: 0.28, back: body, backY: 0.36, body });
}

const PLANS = { quad: buildQuad, biped: buildBiped, float: buildFloat, serpent: buildSerpent, golem: buildGolem, bird: buildBird, fish: buildFish, insect: buildInsect, plant: buildPlant, blob: buildBlob, dragon: buildDragon };

/**
 * Construit une créature de remplacement.
 * @returns {{object:THREE.Group, rig:object}}
 */
export function buildCreature(species, { shiny = false } = {}) {
  const L = species.look || { plan: 'quad', body: '#888', belly: '#ddd', accent: '#fc0' };
  const M = materialsFor(L, shiny, species.num || 1);
  const root = new THREE.Group();
  const rig = { root, ears: [], legs: [], arms: [], wings: [], segments: [], flickers: [], isFloat: false };
  (PLANS[L.plan] || buildQuad)(L, M, rig, root);
  optimizeRig(rig);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  rig.height = Math.max(0.3, box.max.y);
  rig.materials = M;
  return { object: root, rig };
}
