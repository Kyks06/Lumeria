import { generateOutdoor } from './OutdoorGen.js';
import { Map2D } from './Map2D.js';
import { NPC2D } from './Actors2D.js';
import { Wild2D } from './Wild2D.js';
import { F } from './tiles.js';
import { paintChunk, groundFields, GRASS } from '../pixel/ground.js';
import { sprite as natureSprite } from '../pixel/sprites.js';
import { propSprite, fenceTile, bridgeTile } from '../pixel/props.js';
import { drawBuilding, millBlades, boatSprite } from '../pixel/buildings.js';
import { tallGrass, flowerTile } from '../pixel/nature.js';
import { canvas, ctx2d } from '../pixel/Px.js';
import { shade } from '../pixel/color.js';
import { ITEMS } from '../config/items.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';

export const CHUNK = 8; // tuiles par morceau de sol

/** Ajoute un sprite de décor (ancre = point posé au sol, en pixels du monde). */
export function addSprite(map, s, bx, by, opts = {}) {
  const rec = {
    c: s.canvas, frames: s.frames || null, emFrames: s.emFrames || null, fps: opts.fps || s.fps || 6,
    x: Math.round(bx - s.ax), y: Math.round(by - s.ay), w: s.w, h: s.h, base: opts.base ?? by,
    shadow: opts.noShadow ? null : s.shadow, sh: opts.sh ?? (s.kind === 'decal' ? 0 : 1), em: s.emissive || null,
    glowColor: s.glowColor || null, kind: opts.kind || s.kind || 'prop', hidden: false, flat: !!opts.flat, phase: opts.phase || 0,
    emNight: opts.emNight ?? true, reflect: false,
  };
  if (s.lights) for (const l of s.lights) map.lights2d.push({ x: rec.x + l.x, y: rec.y + l.y, r: l.r, color: l.color, flicker: !!l.flicker, src: rec });
  map.sprites.push(rec);
  return rec;
}

/** Construction d'une carte extérieure ou d'une grotte. */
export async function buildOutdoor2D(def, game) {
  const L = generateOutdoor(def, { flagOk: (o) => game.flagOk(o), picked: game.data.picked || {}, cleared: game.data.cleared || {} });
  const map = new Map2D(def, L.kind, game, { T: L.T, cols: L.cols, rows: L.rows, ox: L.ox, oz: L.oz });
  map.L = L;
  map.biome = L.biome;
  map.biomeKey = L.biomeKey;
  map.dark = !!def.dark;
  map.bounds = L.bounds;
  map.flags.a.set(L.flags.a);
  const T = L.T;
  const tileBase = (c, r) => [c * 16 + 8, r * 16 + 15];

  // ── Bâtiments ────────────────────────────────────────────────────
  for (const B of L.buildings) {
    const style = B.def.style || def.style || 'village';
    const s = drawBuilding(B, style, {});
    const bx = B.c0 * 16, by = (B.r0 + B.d) * 16;
    const rec = addSprite(map, { ...s, ax: 0, ay: s.h }, bx, by, { kind: 'building', sh: 0.42 });
    rec.building = B;
    for (const ch of s.chimneys || []) {
      const w = map.worldOfPx(bx + ch.x, by);
      map.smokes.push({ x: w.x, z: w.z, y: (s.h - ch.y) / map.ppm, distanceToSquared(p) { return (p.x - this.x) ** 2 + (p.z - this.z) ** 2; } });
    }
    for (const g of s.glow || []) map.lights2d.push({ x: bx + g.x, y: by - s.h + g.y, r: g.r * 2, color: g.color, always: true, small: true });
    if (s.windows) for (const w of s.windows) map.lights2d.push({ x: bx + w.x, y: by - s.h + w.y + 6, r: 26, color: '#ffc870', window: true });
    if (s.mill) {
      const frames = [0, 1, 2, 3].map((f) => millBlades(f));
      map.sprites.push({ c: frames[0], frames, fps: 5, x: bx + s.mill.x - 24, y: by - s.h + s.mill.y - 24, w: 48, h: 48, base: by + 1, shadow: null, kind: 'overlay' });
    }
    if (s.beacon) map.beacons = [...(map.beacons || []), { x: bx + s.beacon.x, y: by - s.h + s.beacon.y }];
  }

  // ── Panneaux des bâtiments ───────────────────────────────────────
  for (const sg of L.signs) {
    const [bx, by] = tileBase(sg.c, sg.r);
    addSprite(map, propSprite('sign'), bx, by - 1);
    map.addInteractable({ type: 'sign', tiles: [[sg.c, sg.r]], lines: sg.lines || [`« ${sg.title} »`], name: sg.title, ...center(map, sg.c, sg.r) });
  }

  // ── Accessoires ──────────────────────────────────────────────────
  for (const p of L.props) {
    const key = propKey(p, def);
    const s = key.startsWith('n:') ? natureSprite(key.slice(2)) : propSprite(key);
    const bx = (p.c + p.w / 2) * 16, by = (p.r + 1) * 16 - 1;
    addSprite(map, s, bx, by, { phase: (p.c * 7 + p.r * 3) % 10 });
    if (p.t === 'sign' && p.text) map.addInteractable({ type: 'sign', tiles: [[p.cx, p.cy]], lines: p.text, name: p.title || 'Panneau', ...center(map, p.cx, p.cy) });
    if (p.talk || p.script) {
      const tiles = [];
      for (let rr = p.r - p.h + 1; rr <= p.r; rr++) for (let cc = p.c; cc < p.c + p.w; cc++) tiles.push([cc, rr]);
      map.addInteractable({ type: 'prop', tiles, def: p, name: p.name || '', ...center(map, p.cx, p.cy) });
    }
  }

  // ── Clôtures ─────────────────────────────────────────────────────
  const fstyle = def.fenceColor === '#ffffff' || def.style === 'port' ? 'white' : def.style === 'cite' ? 'iron' : 'wood';
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
    if (!L.fence.get(c, r)) continue;
    const m = (L.fence.get(c, r - 1) ? 1 : 0) | (L.fence.get(c + 1, r) ? 2 : 0) | (L.fence.get(c, r + 1) ? 4 : 0) | (L.fence.get(c - 1, r) ? 8 : 0);
    addSprite(map, fenceTile(m, fstyle), c * 16 + 8, r * 16 + 14, { sh: 0.6 });
  }

  // ── Obstacles ────────────────────────────────────────────────────
  for (const ob of L.obstacles) {
    const p = map.center(ob.c, ob.r);
    if (ob.t === 'climb') {
      const [dc, dr] = ob.dest;
      const q = map.center(dc, dr);
      const s = propSprite('climb');
      addSprite(map, s, ob.c * 16 + 8, ob.r * 16 - 1, { sh: 0 });
      map.addInteractable({ type: 'climb', tiles: [[ob.c, ob.r - 1]], ob, dest: [q.x, q.z], x: p.x, z: p.z });
      map.addInteractable({ type: 'climb', tiles: [[dc, dr + 1]], ob, dest: [p.x, p.z], x: q.x, z: q.z });
      map.obstacles.push(ob);
      continue;
    }
    const s = propSprite(ob.t === 'cut' ? 'cut' : ob.t === 'smash' ? 'smash' : 'boulder');
    const [bx, by] = tileBase(ob.c, ob.r);
    const rec = addSprite(map, s, bx, by, { kind: 'obstacle' });
    const o = { ...ob, x: p.x, z: p.z, sprite: rec };
    o.collider = { enabled: true, onRemove: () => { map.flags.and(o.c, o.r, ~F.BLOCK); rec.hidden = true; } };
    o.inter = map.addInteractable({ type: 'obstacle', tiles: [[ob.c, ob.r]], ob: o, x: p.x, z: p.z });
    map.obstacles.push(o);
  }

  // ── Objets au sol ────────────────────────────────────────────────
  for (const it of L.items) {
    const p = map.center(it.c, it.r);
    let rec = null;
    if (!it.hidden) {
      const pocket = ITEMS[it.item]?.pocket;
      rec = addSprite(map, propSprite(`pickup:${pocket === 'dt' ? '#7aa8ff' : pocket === 'prisme' ? '#ffb547' : '#ff5a7a'}`), it.c * 16 + 8, it.r * 16 + 13, { kind: 'item', sh: 0.5 });
    }
    map.addInteractable({ type: 'item', tiles: [[it.c, it.r]], item: it.item, qty: it.qty || 1, key: it.key, sprite: rec, hidden: !!it.hidden, x: p.x, z: p.z, c: it.c, r: it.r });
  }

  // ── Décor généré (arbres, rochers, plantes…) ─────────────────────
  for (const o of L.objects) {
    if (o.key.startsWith('boat')) {
      const s = boatSprite(o.key === 'boat:h');
      addSprite(map, { ...s, ax: 0, ay: s.h }, o.c * 16, (o.r + 1) * 16, { kind: 'boat', sh: 0.15 });
      continue;
    }
    const s = natureSprite(o.key);
    const [bx, by] = tileBase(o.c, o.r);
    const flat = o.kind === 'decal';
    const rec = addSprite(map, s, bx + (o.dx || 0), by + (o.dy || 0), { kind: o.kind, flat, sh: flat ? 0 : o.kind === 'plant' ? 0.5 : 1, noShadow: flat, phase: (o.c * 13 + o.r * 7) % 10 });
    rec.border = !!o.border;
    rec.tile = [o.c, o.r];
  }

  // ── PNJ et dresseurs ─────────────────────────────────────────────
  const actorCtx = { baker: game.baker };
  for (const n of L.npcs) {
    const p = map.center(n.c, n.r);
    const look = n.look || (n.cls ? trainerLook(n.cls, n.id) : npcLook(n.kind || 'homme', n.id, n.lookExtra));
    const npc = new NPC2D({ ...n, x: p.x, z: p.z, look }, map, actorCtx);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'npc', npc, pos: npc.position, name: n.name || '' });
  }
  for (const t0 of L.trainers) {
    const t = (def.trainers || []).find((x) => x.id && x.id === t0.id) || t0;
    const p = map.center(t0.c, t0.r);
    const look = t.look || trainerLook(t.cls, t.id, t.lookExtra);
    const npc = new NPC2D({ ...t, x: p.x, z: p.z, look, trainer: true, sight: t.sight ?? 5 }, map, actorCtx);
    npc.trainer = t;
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'trainer', npc, pos: npc.position, name: t.name || '', trainer: t });
  }

  // ── Portes, entrées, déclencheurs ────────────────────────────────
  for (const w of L.warps) map.warps.push({ ...w, tile: [w.c, w.r] });
  Object.assign(map.entries, L.entries);
  for (const tr of L.triggers) map.addTrigger(tr);

  // ── Rencontres ───────────────────────────────────────────────────
  const enc = def.encounters || {};
  map.encounters = enc;
  map.wild = new Wild2D(map, game.wildCtx(), enc);

  // ── Sol peint par morceaux, à la demande ─────────────────────────
  setupGround(map, L);
  markReflections(map);
  indexSprites(map);
  return map;
}

function center(map, c, r) { const p = map.center(c, r); return { x: p.x, z: p.z }; }

function propKey(p, def) {
  switch (p.t) {
    case 'lamp': return `lamp:${p.style || (def.style === 'cite' ? 'modern' : def.type === 'route' ? 'lantern' : 'classic')}`;
    case 'tent': case 'stall': case 'statue': case 'mailbox': return p.arg ? `${p.t}:${p.arg}` : p.t;
    case 'gate': return `gate:${p.w}`;
    case 'planter': return `planter:${(p.c + p.r) % 3 + 1}`;
    case 'veg': {
      const k = p.kind || 'rock0';
      if (k.startsWith('pillar')) return `n:pillar:${k.endsWith('1') ? 'broken' : 'full'}`;
      if (k.startsWith('crystal')) return `n:crystal:${['violet', 'cyan', 'rose'][Number(k.slice(-1)) % 3]}:1`;
      if (k.startsWith('rock')) return `n:rock:grey:${Number(k.slice(-1)) || 0}`;
      return 'n:bush:green:1';
    }
    case 'tree': { const k = (p.kind || 'oak0').replace(/\d$/, ''); return `n:tree:${k === 'oak' ? 'oak' : k}:${Number((p.kind || '0').slice(-1)) || 0}`; }
    case 'log': return 'n:log';
    case 'snowman': return 'n:snowman';
    default: return p.t;
  }
}

/** Sprites près de l'eau : reflet sur l'eau juste en dessous. */
function markReflections(map) {
  for (const s of map.sprites) {
    if (s.flat || s.kind === 'overlay') continue;
    const c = Math.floor((s.x + s.w / 2) / 16), r = Math.floor((s.base - 1) / 16);
    for (let k = 1; k <= 2; k++) if (map.flags.has(c, r + k, F.WATER) && !map.flags.has(c, r + k, F.BRIDGE)) { s.reflect = true; break; }
  }
}

/** Index spatial (par bandes de 64 px de base) pour ne parcourir que le décor visible. */
export function indexSprites(map) {
  map.spriteRows = new Map();
  for (const s of map.sprites) {
    const k = Math.floor(s.base / 64);
    if (!map.spriteRows.has(k)) map.spriteRows.set(k, []);
    map.spriteRows.get(k).push(s);
  }
  map.maxSpriteH = Math.max(64, ...map.sprites.map((s) => s.base - s.y));
}

/** Prépare le sol : champs lissés, cache des morceaux, hautes herbes, ponts. */
function setupGround(map, L) {
  map.fields = groundFields(L);
  map.chunks = new Map();
  const G = GRASS[L.biomeKey] || GRASS.prairie;
  const pal = [G.under, G.dark, G.base, G.light, shade(G.tuft, -0.55)];
  map.grassTiles = [0, 1].map((v) => tallGrass(pal, 0, v));
  map.grassRustle = [0, 1].map((v) => tallGrass(pal, 1, v));
  const flowerSets = L.biome.flowers?.length ? [L.biome.flowers.slice(0, 3), [L.biome.flowers[1] || '#ffffff', '#ffffff'], [L.biome.flowers[2] || '#ffd23f', L.biome.flowers[0]]] : [['#ff7aa2', '#ffffff', '#ffd23f'], ['#ffffff', '#c58bff'], ['#ff9a4a', '#ffd23f']];
  map.flowerFrames = flowerSets.map((cols, i) => [0, 1].map((f) => [0, 1, 2, 3].map((s) => flowerTile(cols, f, s * 5 + i + 1))));
  map.deco = L.deco;
  map.tall = L.tall;
  const bridgeTiles = new Map();
  for (const b of L.bridges) for (const [c, r] of b.tiles) {
    const horiz = b.horiz;
    const first = b.tiles[0];
    const edge = horiz ? (r === first[1] ? 'top' : 'bottom') : (c === first[0] ? 'left' : 'right');
    bridgeTiles.set(`${c},${r}`, bridgeTile(horiz, edge, c + r));
  }
  for (const d of L.docks) for (const [c, r] of d.tiles) bridgeTiles.set(`${c},${r}`, bridgeTile(!d.horiz, null, c * 3 + r));
  map.bridgeTiles = bridgeTiles;
  const flats = map.sprites.filter((s) => s.flat);
  map.paintChunk = (cx, cy) => {
    const k = `${cx},${cy}`;
    let ch = map.chunks.get(k);
    if (ch) return ch;
    const c0 = cx * CHUNK, r0 = cy * CHUNK;
    const cw = Math.min(CHUNK, L.cols - c0), rh = Math.min(CHUNK, L.rows - r0);
    if (cw <= 0 || rh <= 0) return null;
    ch = paintChunk(L, map.fields, c0, r0, cw, rh);
    const g = ctx2d(ch.ground);
    const wm = ch.water ? ctx2d(ch.water) : null;
    for (let r = r0; r < r0 + rh; r++) for (let c = c0; c < c0 + cw; c++) {
      const x = (c - c0) * 16, y = (r - r0) * 16;
      if (L.tall.get(c, r)) g.drawImage(map.grassTiles[(c + r) % 2].back, x, y);
      const bt = bridgeTiles.get(`${c},${r}`);
      if (bt) { g.drawImage(bt, x, y); wm?.clearRect(x, y, 16, 16); }
    }
    // décors plats (cailloux, coquillages, nénuphars) peints dans le sol
    for (const s of flats) {
      const X = s.x - c0 * 16, Y = s.y - r0 * 16;
      if (X > cw * 16 || Y > rh * 16 || X + s.w < 0 || Y + s.h < 0) continue;
      g.drawImage(s.c, X, Y);
      if (wm) { wm.globalCompositeOperation = 'destination-out'; wm.drawImage(s.c, X, Y); wm.globalCompositeOperation = 'source-over'; }
    }
    ch.x = c0 * 16; ch.y = r0 * 16;
    map.chunks.set(k, ch);
    return ch;
  };
  map.sprites = map.sprites.filter((s) => !s.flat);
  map.pixelW = L.cols * 16; map.pixelH = L.rows * 16;
  // vue d'ensemble pour la mini-carte
  map.overview = () => overview(map, L);
}

function overview(map, L) {
  const c = canvas(L.cols, L.rows);
  const x = ctx2d(c);
  const img = x.createImageData(L.cols, L.rows);
  const G = GRASS[L.biomeKey] || GRASS.prairie;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const base = hex(L.kind === 'cave' ? '#6a5c4c' : L.biome.snow ? '#e4ecf4' : L.biome.dunes ? '#e0c890' : L.biome.lava ? '#5a4e48' : G.base);
  for (let r = 0; r < L.rows; r++) for (let cc = 0; cc < L.cols; cc++) {
    const f = map.flags.get(cc, r);
    let col = base;
    if (L.path.get(cc, r)) col = hex(L.kind === 'cave' ? '#968670' : '#e0c890');
    if (L.tall.get(cc, r)) col = hex(shade(G.dark, -0.3));
    if (f & F.WATER) col = L.water.get(cc, r) > 1 ? [40, 96, 180] : [70, 140, 220];
    if (f & F.LAVA) col = [230, 90, 30];
    if (L.border.get(cc, r)) col = L.kind === 'cave' ? [26, 22, 20] : L.borderStyle === 'forest' ? hex(shade(G.dark, -0.55)) : [96, 88, 92];
    if (f & F.BRIDGE) col = [170, 120, 70];
    const i = (r * L.cols + cc) * 4;
    img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  for (const B of L.buildings) { x.fillStyle = '#d8cbb8'; x.fillRect(B.c0, B.r0, B.w, B.d); x.fillStyle = B.kind === 'center' ? '#ff5c8a' : B.kind === 'shop' ? '#3a7bd5' : B.kind === 'gym' ? '#ffb547' : '#c8553d'; x.fillRect(B.c0, B.r0, B.w, Math.max(1, B.d - 1)); }
  return c;
}
