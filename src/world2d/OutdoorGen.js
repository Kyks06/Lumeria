import { BIOMES } from '../world/Biomes.js';
import { Terrain2D, terrainHash } from './Terrain2D.js';
import { F, GROUND, Grid, TILE, distToPolyline, dirFromRot } from './tiles.js';

/**
 * GÉNÉRATION LOGIQUE D'UNE CARTE EXTÉRIEURE OU D'UNE GROTTE EN TUILES (sans dessin).
 * À partir d'une définition de src/maps : sol, eau, chemins, bords, bâtiments (toujours portes au sud),
 * accessoires, clôtures, obstacles, objets, PNJ, végétation, ponts, pontons, entrées et sorties.
 * Le résultat (« layout ») est dessiné par src/pixel et animé par src/world2d.
 */
export const T_OUT = 2; // mètres par tuile

/** Emprises des bâtiments en tuiles : w × d, colonne de la porte, hauteur ajoutée au-dessus (px). */
export const BUILD = {
  house: { w: 4, d: 3, door: 1, rise: 12 },
  bighouse: { w: 5, d: 4, door: 2, rise: 14 },
  center: { w: 5, d: 4, door: 2, rise: 14 },
  shop: { w: 5, d: 3, door: 2, rise: 12 },
  gym: { w: 7, d: 5, door: 3, rise: 18 },
  lab: { w: 7, d: 4, door: 3, rise: 18 },
  daycare: { w: 5, d: 4, door: 2, rise: 12 },
  tower: { w: 5, d: 4, door: 2, rise: 64 },
  dept: { w: 7, d: 4, door: 3, rise: 44 },
  lighthouse: { w: 3, d: 3, door: 1, rise: 72 },
  warehouse: { w: 7, d: 5, door: 3, rise: 8 },
  powerplant: { w: 9, d: 5, door: 4, rise: 24 },
  temple: { w: 7, d: 5, door: 3, rise: 18 },
  league: { w: 9, d: 6, door: 4, rise: 34 },
  cave: { w: 5, d: 2, door: 2, rise: 20 },
  hideout: { w: 5, d: 4, door: 2, rise: 34 },
};

/** Taille (tuiles) et blocage des accessoires. */
const PROP = {
  sign: [1, 1], lamp: [1, 1], torch: [1, 1], bench: [2, 1], mailbox: [1, 1], planter: [1, 1], barrel: [1, 1], crate: [1, 1],
  table: [2, 1], tent: [2, 2], campfire: [1, 1], well: [2, 2], stall: [3, 1], fountain: [3, 3], statue: [1, 1], snowman: [1, 1],
  pedestal: [1, 1], log: [2, 1], veg: [1, 1], tree: [1, 1], gate: [3, 1],
};

function pickW(arr, R) {
  const tot = arr.reduce((a, e) => a + e[1], 0);
  let r = R() * tot;
  for (const e of arr) { r -= e[1]; if (r <= 0) return e[0]; }
  return arr[0][0];
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Matière des chemins selon la carte. */
function pathMaterial(def, biome, biomeKey) {
  if (def.pathLayer === 'sand') return 'sandpath';
  if (def.pathLayer === 'cobble') return 'cobble';
  if (biome.cave) return 'cavepath';
  if (def.type === 'town') {
    if (biomeKey === 'desert') return 'adobe';
    if (biomeKey === 'neige') return 'snowcobble';
    if (biomeKey === 'volcan') return 'darkcobble';
    if (biomeKey === 'celeste') return 'marble';
    if (biomeKey === 'marais') return 'boardwalk';
    return 'cobble';
  }
  if (biomeKey === 'desert' || biomeKey === 'cote') return 'sandpath';
  if (biomeKey === 'neige') return 'snowpath';
  if (biomeKey === 'volcan') return 'ashpath';
  if (biomeKey === 'celeste') return 'marble';
  if (biomeKey === 'marais') return 'mudpath';
  return 'dirt';
}

export function generateOutdoor(def, ctx = {}) {
  const flagOk = ctx.flagOk || (() => true);
  const picked = ctx.picked || {};
  const cleared = ctx.cleared || {};
  const biomeKey = def.biome || 'prairie';
  const biome = { ...BIOMES[biomeKey], ...(def.biomeOverride || {}) };
  const cave = !!biome.cave || def.type === 'cave';
  const T = T_OUT;
  const terrain = new Terrain2D(def, biome);
  const [W, D] = def.size;
  const M = cave ? 8 : 12;
  const cols = Math.ceil(W / T) + M * 2, rows = Math.ceil(D / T) + M * 2;
  const ox = -Math.ceil(W / T / 2) * T - M * T, oz = -Math.ceil(D / T / 2) * T - M * T;
  const R = mulberry((def.seed || 7) * 7919 + 13);
  const L = {
    id: def.id, def, kind: cave ? 'cave' : 'outdoor', T, M, cols, rows, ox, oz, biome, biomeKey,
    bounds: [-W / 2, W / 2, -D / 2, D / 2],
    flags: new Grid(cols, rows), ground: new Grid(cols, rows), path: new Grid(cols, rows), water: new Grid(cols, rows), sand: new Grid(cols, rows),
    border: new Grid(cols, rows), reserved: new Grid(cols, rows), carve: new Grid(cols, rows), tall: new Grid(cols, rows), fence: new Grid(cols, rows), deco: new Grid(cols, rows),
    pathMat: pathMaterial(def, biome, biomeKey),
    borderStyle: cave ? 'cave' : (def.border || biome.border || 'forest'),
    objects: [], buildings: [], props: [], fences: [], obstacles: [], items: [], npcs: [], trainers: [], warps: [], entries: {}, triggers: [],
    bridges: [], docks: [], lights: [], smokes: [], interact: [], signs: [], climbs: [],
  };
  const { flags, ground, path, water, sand, border, reserved, tall } = L;
  const cx = (c) => ox + (c + 0.5) * T, cz = (r) => oz + (r + 0.5) * T;
  const tc = (x) => Math.floor((x - ox) / T), tr = (z) => Math.floor((z - oz) / T);
  L.toTile = (x, z) => [tc(x), tr(z)];
  L.center = (c, r) => ({ x: cx(c), z: cz(r) });

  // ── Sol, eau, chemins, bords ─────────────────────────────────────
  const baseGround = cave ? GROUND.CAVE : biome.snow ? GROUND.SNOW : biome.lava ? GROUND.ASH : biome.dunes ? GROUND.SAND : GROUND.GRASS;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = cx(c), z = cz(r);
    let g = baseGround;
    if (biome.murky && terrain.n(x, z, 0.06, 11) > 0.68) g = GROUND.MUD;
    if (biome.rocky && terrain.n(x, z, 0.07, 12) > 0.7) g = GROUND.GRAVEL;
    ground.set(c, r, g);
    const o = terrain.outside(x, z);
    let isBorder = cave ? !terrain.open(x, z) || o > -1 : o > -1;
    const wd = terrain.water(x, z);
    if (wd && !(cave && !terrain.open(x, z))) {
      water.set(c, r, wd);
      flags.or(c, r, F.WATER);
      if (o > -1 && !cave) isBorder = false; // la mer reste de l'eau au bord
    }
    if (terrain.isLava(x, z)) { flags.or(c, r, F.LAVA | F.BLOCK); }
    if (!cave && terrain.ridgeAt(x, z)) isBorder = true;
    if (isBorder && !water.get(c, r)) { border.set(c, r, 1); flags.or(c, r, F.BORDER | F.BLOCK); }
    if (!water.get(c, r) && !border.get(c, r) && terrain.isPath(x, z)) path.set(c, r, 1);
  }
  // plages : terre ferme proche de l'eau (biomes côtiers et lacs du désert)
  if (biome.sand || biome.dunes) {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (water.get(c, r) || border.get(c, r)) continue;
      let near = false;
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) if (water.get(c + dc, r + dr) && Math.abs(dc) + Math.abs(dr) <= 3) { near = true; break; }
      if (near) sand.set(c, r, 1);
    }
  }
  // isthmes : une tuile de terre isolée entre deux eaux devient de l'eau (rivages propres)
  for (let pass = 0; pass < 2; pass++) for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    if (water.get(c, r) || border.get(c, r)) continue;
    const n = (water.get(c - 1, r) ? 1 : 0) + (water.get(c + 1, r) ? 1 : 0) + (water.get(c, r - 1) ? 1 : 0) + (water.get(c, r + 1) ? 1 : 0);
    if (n >= 3) { water.set(c, r, 1); flags.or(c, r, F.WATER); path.set(c, r, 0); }
  }
  // ── Utilitaires de placement ─────────────────────────────────────
  const free = (c, r) => flags.inside(c, r) && !(flags.get(c, r) & (F.BLOCK | F.WATER)) && !reserved.get(c, r);
  const walkable = (c, r) => flags.inside(c, r) && !(flags.get(c, r) & (F.BLOCK | F.WATER));
  const block = (c, r) => flags.or(c, r, F.BLOCK);
  const reserve = (c0, r0, w, h, pad = 0) => { for (let r = r0 - pad; r < r0 + h + pad; r++) for (let c = c0 - pad; c < c0 + w + pad; c++) reserved.set(c, r, 1); };
  /** Tuile libre la plus proche (spirale). */
  const nearestFree = (c, r, test = walkable, max = 6) => {
    if (test(c, r)) return [c, r];
    for (let d = 1; d <= max; d++) for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
      if (Math.max(Math.abs(dc), Math.abs(dr)) !== d) continue;
      if (test(c + dc, r + dr)) return [c + dc, r + dr];
    }
    return [c, r];
  };
  L.nearestFree = nearestFree;

  // ── Bâtiments ────────────────────────────────────────────────────
  for (const b of def.buildings || []) {
    if (!flagOk(b)) continue;
    if (b.kind === 'dock' || b.kind === 'boat') continue;
    const S = BUILD[b.kind] || BUILD.house;
    const c0 = Math.round(tc(b.x) + 0.5 - S.w / 2), r0 = Math.round(tr(b.z) + 0.5 - S.d / 2);
    const doorC = c0 + S.door, doorR = r0 + S.d - 1;
    for (let r = r0; r < r0 + S.d; r++) for (let c = c0; c < c0 + S.w; c++) { block(c, r); path.set(c, r, 0); }
    reserve(c0, r0, S.w, S.d, 1);
    // la porte est franchissable (téléporteur), la tuile devant reste dégagée
    flags.and(doorC, doorR, ~F.BLOCK);
    flags.or(doorC, doorR, F.WARP);
    for (const [dc, dr] of [[0, 1], [0, 2], [-1, 1], [1, 1]]) { flags.and(doorC + dc, doorR + dr, ~(F.BLOCK | F.BORDER)); border.set(doorC + dc, doorR + dr, 0); }
    path.set(doorC, doorR + 1, 1); L.carve.set(doorC, doorR + 1, 1);
    const B = { def: b, kind: b.kind, c0, r0, w: S.w, d: S.d, rise: S.rise, door: S.door, doorC, doorR, id: b.id };
    L.buildings.push(B);
    if (!b.noDoor) {
      const target = b.to || `${def.id}:${b.id}`;
      const p = L.center(doorC, doorR);
      L.warps.push({ x: p.x, z: p.z, c: doorC, r: doorR, to: target, entry: b.entry || 'door', building: b, closed: b.closed, door: true });
      const o = L.center(doorC, doorR + 1);
      L.entries[`door:${b.id}`] = { x: o.x, z: o.z, rot: 0 };
    }
    if (b.label || b.sign) {
      const sc = doorC + 2 <= c0 + S.w ? c0 + S.w : doorC + 2, sr = doorR + 1;
      L.signs.push({ c: sc, r: sr, title: b.sign || b.label, lines: b.signText || null, building: b });
    }
  }
  // chemins jusqu'aux portes (les bâtiments sont toujours orientés vers le sud)
  const carvePath = (c, r) => {
    const seen = new Map();
    const q = [[c, r]];
    seen.set(`${c},${r}`, null);
    let found = null;
    while (q.length && !found) {
      const [x, y] = q.shift();
      if (path.get(x, y) && !(x === c && y === r) && seen.size > 1) { found = [x, y]; break; }
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (seen.has(k) || !flags.inside(nx, ny)) continue;
        if (flags.get(nx, ny) & (F.BLOCK | F.WATER)) continue;
        if (seen.size > 900) continue;
        seen.set(k, [x, y]);
        q.push([nx, ny]);
      }
    }
    if (!found) return;
    let cur = seen.get(`${found[0]},${found[1]}`);
    while (cur) { path.set(cur[0], cur[1], 1); L.carve.set(cur[0], cur[1], 1); cur = seen.get(`${cur[0]},${cur[1]}`); }
  };
  for (const B of L.buildings) carvePath(B.doorC, B.doorR + 1);

  // ── Pontons et bateaux ───────────────────────────────────────────
  for (const b of def.buildings || []) {
    if (!flagOk(b)) continue;
    if (b.kind !== 'dock' && b.kind !== 'boat') continue;
    const d = dirFromRot(b.rot || 0);
    const horiz = d === 1 || d === 2;
    let c = tc(b.x), r = tr(b.z);
    if (b.kind === 'dock') {
      // ponton : de la terre ferme jusqu'à 6 tuiles dans l'eau, 2 tuiles de large
      const sx = horiz ? (d === 2 ? 1 : -1) : 0, sz = horiz ? 0 : (d === 0 ? 1 : -1);
      // recule jusqu'à la terre
      let k = 0;
      while (k < 20 && water.get(c - sx * k, r - sz * k)) k++;
      const startC = c - sx * k, startR = r - sz * k;
      const tiles = [];
      for (let s = -1; s < 8 + k; s++) {
        const pc = startC + sx * s, pr = startR + sz * s;
        if (s > 0 && !water.get(pc, pr) && !water.get(pc + sx, pr + sz)) { if (s > k + 2) break; }
        for (let wv = 0; wv < 2; wv++) {
          const qc = pc + (horiz ? 0 : wv), qr = pr + (horiz ? wv : 0);
          if (water.get(qc, qr)) { flags.or(qc, qr, F.BRIDGE); flags.and(qc, qr, ~F.BLOCK); }
          tiles.push([qc, qr]);
        }
        if (s > k + 6) break;
      }
      L.docks.push({ tiles, horiz, def: b });
    } else {
      const w = horiz ? 8 : 3, h = horiz ? 3 : 8;
      const c0 = c - (w >> 1), r0 = r - (h >> 1);
      for (let rr = r0; rr < r0 + h; rr++) for (let cc = c0; cc < c0 + w; cc++) block(cc, rr);
      L.objects.push({ key: horiz ? 'boat:h' : 'boat:v', c: c0, r: r0 + h - 1, w, h, kind: 'boat', onWater: true });
    }
  }

  // ── Ponts ────────────────────────────────────────────────────────
  for (const p of (def.props || []).filter((p) => p.t === 'bridge')) {
    const d = dirFromRot(p.rot || 0);
    const horiz = d === 1 || d === 2;
    const c = tc(p.x), r = tr(p.z);
    const sx = horiz ? 1 : 0, sz = horiz ? 0 : 1;
    // trouve les deux rives
    let a = 0, b2 = 0;
    while (a < 14 && (water.get(c - sx * a, r - sz * a) || water.get(c - sx * a + sz, r - sz * a + sx))) a++;
    while (b2 < 14 && (water.get(c + sx * b2, r + sz * b2) || water.get(c + sx * b2 + sz, r + sz * b2 + sx))) b2++;
    const tiles = [];
    for (let s = -a; s <= b2; s++) for (let wv = 0; wv < 2; wv++) {
      const qc = c + sx * s + (horiz ? 0 : wv), qr = r + sz * s + (horiz ? wv : 0);
      tiles.push([qc, qr]);
      flags.or(qc, qr, F.BRIDGE);
      flags.and(qc, qr, ~(F.BLOCK | F.BORDER));
      border.set(qc, qr, 0);
      reserved.set(qc, qr, 1);
    }
    L.bridges.push({ tiles, horiz, c0: horiz ? c - a : c, r0: horiz ? r : r - a, len: a + b2 + 1 });
  }

  // ── Accessoires ──────────────────────────────────────────────────
  for (const p of (def.props || []).filter((p) => p.t !== 'bridge' && flagOk(p))) {
    const S = PROP[p.t] || [1, 1];
    let [c, r] = nearestFree(tc(p.x), tr(p.z), (cc, rr) => free(cc, rr), 3);
    const w = p.t === 'gate' ? Math.max(2, Math.round((p.w || 6) / T)) : S[0], h = S[1];
    const c0 = c - Math.floor((w - 1) / 2), r0 = r - (h - 1);
    const rec = { ...p, c: c0, r: r0 + h - 1, w, h, cx: c, cy: r };
    L.props.push(rec);
    const solid = !['campfire_open'].includes(p.t);
    for (let rr = r0; rr < r0 + h; rr++) for (let cc = c0; cc < c0 + w; cc++) { if (solid) block(cc, rr); reserved.set(cc, rr, 1); }
    reserve(c0, r0, w, h, 1);
    if (p.t === 'sign' && p.text) L.interact.push({ type: 'sign', c, r, lines: p.text, name: p.title || 'Panneau' });
    if (p.talk || p.script) L.interact.push({ type: 'prop', c, r, def: p, name: p.name || '' });
    if (['lamp', 'torch', 'campfire'].includes(p.t)) L.lights.push({ c, r, kind: p.t, style: p.style || (def.style === 'cite' ? 'modern' : def.type === 'route' ? 'lantern' : 'classic') });
  }
  for (const s of L.signs) {
    const [c, r] = nearestFree(s.c, s.r, (cc, rr) => free(cc, rr), 2);
    s.c = c; s.r = r;
    block(c, r); reserved.set(c, r, 1);
    if (s.lines) L.interact.push({ type: 'sign', c, r, lines: s.lines, name: s.title });
  }

  // ── Clôtures ─────────────────────────────────────────────────────
  for (const line of def.fences || []) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, az] = line[i], [bx, bz] = line[i + 1];
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (T * 0.5));
      for (let k = 0; k <= steps; k++) {
        const x = ax + (bx - ax) * (k / steps), z = az + (bz - az) * (k / steps);
        const c = tc(x), r = tr(z);
        if (flags.get(c, r) & (F.WARP | F.WATER)) continue;
        if (L.buildings.some((B) => c >= B.c0 && c < B.c0 + B.w && r >= B.r0 && r < B.r0 + B.d)) continue;
        if (L.buildings.some((B) => c === B.doorC && (r === B.doorR + 1 || r === B.doorR + 2))) continue;
        L.fence.set(c, r, 1);
        block(c, r); reserved.set(c, r, 1); path.set(c, r, 0);
      }
    }
  }

  // ── Obstacles de terrain ─────────────────────────────────────────
  (def.obstacles || []).forEach((o, i) => {
    if (!flagOk(o)) return;
    const key = `${def.id}:obs${i}`;
    if (o.persist && cleared[key]) return;
    if (o.t === 'climb') {
      // paroi : la tuile de départ est au pied (côté sud), l'arrivée sur la crête
      const [c, r] = nearestFree(tc(o.x), tr(o.z) + 1, walkable, 3);
      const [dc, dr] = nearestFree(tc(o.to[0]), tr(o.to[1]), walkable, 3);
      const ob = { ...o, key, index: i, c, r, dest: [dc, dr] };
      L.climbs.push(ob);
      L.obstacles.push(ob);
      reserve(c - 1, r - 1, 3, 3);
      reserve(dc - 1, dr - 1, 3, 3);
      return;
    }
    const [c, r] = nearestFree(tc(o.x), tr(o.z), (cc, rr) => !(flags.get(cc, rr) & (F.WATER | F.BORDER)) && !L.buildings.some((B) => cc >= B.c0 && cc < B.c0 + B.w && rr >= B.r0 && rr < B.r0 + B.d), 3);
    const ob = { ...o, key, index: i, c, r };
    L.obstacles.push(ob);
    block(c, r); reserved.set(c, r, 1);
    reserve(c - 1, r - 1, 3, 3);
  });

  // ── Objets au sol ────────────────────────────────────────────────
  (def.items || []).forEach((it, i) => {
    if (!flagOk(it)) return;
    const key = `${def.id}:it${i}`;
    if (picked[key]) return;
    const [c, r] = nearestFree(tc(it.x), tr(it.z), free, 4);
    L.items.push({ ...it, key, c, r });
    if (!it.hidden) block(c, r);
    reserved.set(c, r, 1);
  });

  // ── PNJ et dresseurs (une tuile chacun, jamais dans un mur) ──────
  const taken = new Set();
  const placeActor = (n) => {
    const [c, r] = nearestFree(tc(n.x), tr(n.z), (cc, rr) => walkable(cc, rr) && !taken.has(`${cc},${rr}`) && !(flags.get(cc, rr) & F.WARP), 5);
    taken.add(`${c},${r}`);
    reserve(c - 1, r - 1, 3, 3);
    return [c, r];
  };
  for (const n of def.npcs || []) { const [c, r] = placeActor(n); L.npcs.push({ ...n, c, r }); if (n.wander) reserve(c - 2, r - 2, 5, 5); }
  for (const t of def.trainers || []) {
    const [c, r] = placeActor(t);
    L.trainers.push({ ...t, c, r });
    // ligne de vue dégagée
    const d = dirFromRot(t.rot || 0);
    const [dx, dz] = [[0, 1], [-1, 0], [1, 0], [0, -1]][d];
    const sight = Math.round((t.sight ?? 5) / T) + 1;
    for (let k = 1; k <= sight; k++) reserved.set(c + dx * k, r + dz * k, 1);
  }

  // ── Sorties, entrées, téléporteurs, déclencheurs ─────────────────
  const [bx0, bx1, bz0, bz1] = L.bounds;
  for (const e of def.exits || []) {
    const w = Math.ceil((e.w || 10) / T / 2) + 1;
    const c = tc(e.edge === 'west' ? bx0 : e.edge === 'east' ? bx1 - 0.01 : e.at), r = tr(e.edge === 'north' ? bz0 : e.edge === 'south' ? bz1 - 0.01 : e.at);
    if (e.edge === 'north' || e.edge === 'south') { for (let k = -w; k <= w; k++) for (let rr = 0; rr < rows; rr++) if (e.edge === 'north' ? rr <= r + 2 : rr >= r - 2) reserved.set(c + k, rr, 1); }
    else for (let k = -w; k <= w; k++) for (let cc = 0; cc < cols; cc++) if (e.edge === 'west' ? cc <= c + 2 : cc >= c - 2) reserved.set(cc, r + k, 1);
  }
  for (const wp of def.warps || []) {
    if (wp.cell) continue;
    const [c, r] = nearestFree(tc(wp.x), tr(wp.z), walkable, 3);
    const p = L.center(c, r);
    L.warps.push({ ...wp, x: p.x, z: p.z, c, r });
    flags.or(c, r, F.WARP);
    reserve(c - 1, r - 1, 3, 3);
  }
  for (const [name, e] of Object.entries(def.entries || {})) {
    const [c, r] = nearestFree(tc(e[0]), tr(e[1]), (cc, rr) => walkable(cc, rr) || (flags.get(cc, rr) & F.BRIDGE) > 0, 5);
    const p = L.center(c, r);
    L.entries[name] = { x: p.x, z: p.z, rot: e[2] ?? Math.PI };
    reserve(c - 1, r - 1, 3, 3);
  }
  if (def.fly) {
    const [c, r] = nearestFree(tc(def.fly[0]), tr(def.fly[1]), walkable, 6);
    const p = L.center(c, r);
    L.entries.fly = { x: p.x, z: p.z, rot: def.fly[2] ?? 0 };
    reserve(c - 1, r - 1, 3, 3);
  }
  for (const t of def.triggers || []) L.triggers.push(t);

  // ── Hautes herbes ────────────────────────────────────────────────
  for (const [x, z, w, d] of def.grass || []) {
    for (let r = tr(z - d / 2 + 0.01); r <= tr(z + d / 2 - 0.01); r++) for (let c = tc(x - w / 2 + 0.01); c <= tc(x + w / 2 - 0.01); c++) {
      const f = flags.get(c, r);
      if (f & (F.BLOCK | F.WATER | F.WARP)) continue;
      if (path.get(c, r)) continue;
      // bords irréguliers
      const edge = Math.min(c - tc(x - w / 2), tc(x + w / 2) - c, r - tr(z - d / 2), tr(z + d / 2) - r);
      if (edge === 0 && terrainHash(c, r, 77) < 0.35) continue;
      tall.set(c, r, 1);
      flags.or(c, r, F.TALL);
      reserved.set(c, r, 1);
    }
  }

  // ── Bords de carte : forêt dense ─────────────────────────────────
  const style = L.borderStyle;
  const trees = def.trees || biome.trees || [['oak', 1]];
  const treeKey = (k, near) => {
    const v = Math.floor(R() * 6);
    if (k === 'oak') {
      if (biomeKey === 'ville' && R() < 0.22) return `tree:cherry:${v}`;
      if (biomeKey === 'foret' || biomeKey === 'marais') return `tree:${R() < 0.6 ? 'oakDark' : 'oak'}:${v}`;
      if (biomeKey === 'celeste') return `tree:celeste:${v}`;
      return `tree:${R() < 0.75 ? 'oak' : 'oakLight'}:${v}`;
    }
    if (k === 'birch') return `tree:birch:${v}`;
    if (k === 'mushroom') return `tree:${biomeKey === 'marais' ? 'mushroomP' : 'mushroom'}:${v}`;
    return `tree:${k}:${v}`;
  };
  if (style === 'forest') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!border.get(c, r)) continue;
      // quinconce dense, quelques variations
      const inner = !border.get(c, r + 1) || !border.get(c, r - 1) || !border.get(c - 1, r) || !border.get(c + 1, r);
      if ((c + (r % 2)) % 2 !== 0 && !inner) continue;
      if (inner && (c + r) % 2 !== 0 && R() < 0.5) continue;
      const k = pickW(trees, R);
      L.objects.push({ key: treeKey(k), c, r, dx: Math.round((R() - 0.5) * 6), dy: Math.round((R() - 0.5) * 4), kind: 'tree', border: true });
    }
  } else if (style === 'mountain' || style === 'cliff') {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!border.get(c, r)) continue;
      // décor sur les plateaux (loin du bord)
      let deep = true;
      for (let k = 1; k <= 3; k++) if (!border.get(c, r + k) || !border.get(c, r - 1) || !border.get(c - 1, r) || !border.get(c + 1, r)) deep = false;
      if (!deep) continue;
      const roll = R();
      if (roll < 0.08) L.objects.push({ key: biome.snow ? `tree:snowpine:${Math.floor(R() * 4)}` : biomeKey === 'volcan' ? `rock:dark:${Math.floor(R() * 4)}` : `tree:pine:${Math.floor(R() * 4)}`, c, r, kind: 'tree', border: true });
      else if (roll < 0.14) L.objects.push({ key: `rock:${biome.snow ? 'snow' : biomeKey === 'volcan' ? 'dark' : 'grey'}:${Math.floor(R() * 4)}`, c, r, kind: 'rock', border: true });
    }
  }

  // ── Enclos secrets (place entourée d'une haie, ouverte par un obstacle) ──
  for (const [px, pz, pr] of def.plazas || []) {
    const gates = L.obstacles.filter((o) => o.t !== 'climb' && (() => { const d = Math.hypot(cx(o.c) - px, cz(o.r) - pz); return d > pr + 1 && d < pr + 9; })());
    if (!gates.length) continue;
    const Rr = gates.reduce((a, o) => a + Math.hypot(cx(o.c) - px, cz(o.r) - pz), 0) / gates.length;
    const danger = L.warps.some((w) => Math.hypot(w.x - px, w.z - pz) < Rr + 2) || Object.values(L.entries).some((e) => Math.hypot(e.x - px, e.z - pz) < Rr + 2);
    if (danger) continue;
    const kind = cave ? 'rock:dark' : biome.snow ? 'rock:snow' : biome.dunes ? 'rock:sand' : biome.lava ? 'rock:dark' : 'hedge';
    for (let r = tr(pz - Rr - T); r <= tr(pz + Rr + T); r++) for (let c = tc(px - Rr - T); c <= tc(px + Rr + T); c++) {
      const d = Math.hypot(cx(c) - px, cz(r) - pz);
      if (Math.abs(d - Rr) > T * 0.6) continue;
      if (gates.some((o) => Math.abs(o.c - c) <= 0 && Math.abs(o.r - r) <= 0)) continue;
      if (flags.get(c, r) & (F.WATER | F.BORDER | F.WARP)) continue;
      if (gates.some((o) => o.c === c && o.r === r)) continue;
      block(c, r); reserved.set(c, r, 1); path.set(c, r, 0);
      L.objects.push({ key: kind === 'hedge' ? 'hedge' : `${kind}:${(c + r) % 4}`, c, r, kind: kind === 'hedge' ? 'wall' : 'rock' });
    }
    // l'obstacle complète l'anneau : on bouche aussi ses voisins latéraux s'ils sont libres
  }

  // ── Végétation dans la zone jouable ──────────────────────────────
  const density = (def.treeDensity ?? biome.treeDensity ?? 0.15);
  const extras = def.extras || biome.extras || [];
  const bushes = biome.bushes || [];
  const nearPath = (c, r, d) => { for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) if (path.get(c + dc, r + dr)) return true; return false; };
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const f = flags.get(c, r);
    if (f & (F.BLOCK | F.WATER | F.TALL | F.WARP | F.BRIDGE)) continue;
    if (reserved.get(c, r) || path.get(c, r)) continue;
    const x = cx(c), z = cz(r);
    if (terrain.outside(x, z) > -1) continue;
    const clump = terrain.n(x, z, 0.08, 21);
    const roll = R();
    if (cave) {
      // stalagmites et cristaux le long des parois
      let wall = false;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (border.get(c + dc, r + dr)) wall = true;
      if (wall && roll < 0.14 && !nearPath(c, r, 0)) { const k = pickW(trees, R); L.objects.push({ key: k === 'crystal' ? `crystal:${['violet', 'cyan', 'rose'][Math.floor(R() * 3)]}:${Math.floor(R() * 3)}` : `stalagmite:${Math.floor(R() * 4)}`, c, r, kind: 'rock' }); block(c, r); }
      else if (roll < 0.03) L.objects.push({ key: `decal:pebbles:${Math.floor(R() * 4)}`, c, r, kind: 'decal' });
      continue;
    }
    const pTree = density * (0.25 + clump * 1.2) * (nearPath(c, r, 1) ? 0.25 : 1);
    if (roll < pTree && (c + r) % 2 === 0) {
      const k = pickW(trees, R);
      L.objects.push({ key: treeKey(k), c, r, dx: Math.round((R() - 0.5) * 4), kind: 'tree' });
      block(c, r);
      continue;
    }
    const r2 = R();
    if (r2 < 0.035 && bushes.length && !nearPath(c, r, 0)) {
      const k = bushes[Math.floor(R() * bushes.length)];
      L.objects.push({ key: k === 'reeds' ? `reeds:${Math.floor(R() * 3)}` : k === 'berrybush' ? `bush:berry:${Math.floor(R() * 3)}` : `bush:${biomeKey === 'foret' ? 'dark' : 'green'}:${Math.floor(R() * 4)}`, c, r, kind: k === 'reeds' ? 'plant' : 'bush' });
      if (k !== 'reeds') block(c, r);
      continue;
    }
    if (r2 < 0.035 + 0.06 && extras.length) {
      const k = pickW(extras, R);
      if (k === 'flowers') { L.deco.set(c, r, 1 + Math.floor(R() * 3)); continue; }
      if (k === 'rock') { L.objects.push({ key: `rock:${biome.snow ? 'snow' : biome.dunes ? 'sand' : biome.lava ? 'dark' : biome.rocky ? 'grey' : 'moss'}:${Math.floor(R() * 4)}`, c, r, kind: 'rock' }); block(c, r); continue; }
      if (['stump', 'log', 'pillar', 'icespike', 'snowman', 'lavarock', 'crystal'].includes(k)) {
        const key = k === 'pillar' ? `pillar:${R() < 0.5 ? 'full' : 'broken'}` : k === 'icespike' ? `crystal:ice:${Math.floor(R() * 3)}` : k === 'lavarock' ? `rock:lava:${Math.floor(R() * 3)}` : k === 'crystal' ? `crystal:${['violet', 'cyan', 'rose'][Math.floor(R() * 3)]}:${Math.floor(R() * 3)}` : k;
        L.objects.push({ key, c, r, kind: 'rock' }); block(c, r); continue;
      }
      if (k === 'fern') { L.objects.push({ key: `fern:${Math.floor(R() * 3)}`, c, r, kind: 'plant' }); continue; }
      if (k === 'reeds') { L.objects.push({ key: `reeds:${Math.floor(R() * 3)}`, c, r, kind: 'plant' }); continue; }
      if (k === 'shell' || k === 'bones') { L.objects.push({ key: `decal:${k}:${Math.floor(R() * 3)}`, c, r, kind: 'decal' }); continue; }
    }
    // fleurs isolées dans les prairies
    if (!biome.snow && !biome.dunes && !biome.lava && !biome.murky && R() < 0.02) L.deco.set(c, r, 1 + Math.floor(R() * 3));
  }
  // Nénuphars sur les lacs et roseaux sur les rives
  if (!cave) for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    if (water.get(c, r) === 1 && !(flags.get(c, r) & F.BRIDGE) && def.type !== 'town' && !def.sea && R() < 0.05) L.objects.push({ key: `lilypad:${Math.floor(R() * 4)}`, c, r, kind: 'decal', onWater: true });
  }

  L.terrain = terrain;
  return L;
}

export { TILE };
