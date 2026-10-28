import { Map2D } from './Map2D.js';
import { NPC2D } from './Actors2D.js';
import { F } from './tiles.js';
import { addSprite, indexSprites } from './buildOutdoor.js';
import { furniture, floorTile, wallTexel } from '../pixel/furniture.js';
import { propSprite } from '../pixel/props.js';
import { canvas, ctx2d } from '../pixel/Px.js';
import { shade } from '../pixel/color.js';
import { ITEMS } from '../config/items.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';

/**
 * INTÉRIEURS EN PIXEL ART (1 tuile = 1 m) : pièce vue de 3/4 avec mur du fond haut de deux tuiles,
 * fenêtres, plinthes, sol (parquet, carrelage, dalles), tapis d'entrée au sud, mobilier selon le type
 * de bâtiment (maison, Centre Lumin, boutique, grand magasin, laboratoire, pension, musée, tour, salle).
 * Les positions des définitions (mètres, centre de la pièce = 0) tombent sur des centres de tuiles.
 */
export const PRESETS = {
  house:   { size: [12, 9], floor: 'planks', floorColor: '#c89a6a', wall: 'wallpaper', wallColor: '#f0e4cc' },
  home:    { size: [14, 10], floor: 'planks', floorColor: '#d0a070', wall: 'wallpaper', wallColor: '#f4ead8' },
  bighouse:{ size: [16, 11], floor: 'planks', floorColor: '#b88a5a', wall: 'wallpaper', wallColor: '#e8dcc8' },
  center:  { size: [18, 12], floor: 'tiles', floorColor: '#f4f0ec', wall: 'plaster', wallColor: '#fff0f2', accent: '#ff5c8a' },
  shop:    { size: [14, 10], floor: 'tiles', floorColor: '#e8eef4', wall: 'plaster', wallColor: '#eef4ff', accent: '#3f7cff' },
  dept:    { size: [22, 14], floor: 'tiles', floorColor: '#eceef4', wall: 'panel', wallColor: '#f4f6fa', accent: '#5a6cff' },
  lab:     { size: [18, 13], floor: 'tiles', floorColor: '#e4ecf0', wall: 'panel', wallColor: '#f2f6f8', accent: '#3aa0c8' },
  daycare: { size: [14, 10], floor: 'planks', floorColor: '#c8a070', wall: 'wallpaper', wallColor: '#f8ecd0', accent: '#7dc860' },
  museum:  { size: [20, 13], floor: 'planks', floorColor: '#a87a50', wall: 'wallpaper', wallColor: '#e8dcc8', accent: '#c8553d' },
  tower:   { size: [20, 13], floor: 'tiles', floorColor: '#d0d8e8', wall: 'panel', wallColor: '#e0e8f4', accent: '#ffd23f' },
  hall:    { size: [16, 12], floor: 'stone', floorColor: '#d8d0c0', wall: 'stone', wallColor: '#d0c8b8', accent: '#ffd23f' },
  cabin:   { size: [10, 8], floor: 'planks', floorColor: '#a07a50', wall: 'logs', wallColor: '#c8a070' },
};

export async function buildInterior2D(def, game) {
  const P = { ...(PRESETS[def.preset] || PRESETS.house), ...(def.size ? { size: def.size } : {}) };
  const [W, D] = P.size;
  const hw = Math.floor(W / 2), hd = Math.floor(D / 2);
  const cols = W + 2, rows = D + 3;
  const map = new Map2D(def, 'interior', game, { T: 1, cols, rows, ox: -hw - 1.5, oz: -hd - 2.5 });
  map.bounds = [-hw - 0.5, W - hw - 0.5, -hd - 0.5, D - hd - 0.5];
  map.bg = '#08060a';
  map.dark = !!def.dark;
  map.theme = P;
  const accent = P.accent || '#c8553d';
  const ok = (o) => game.flagOk(o);
  const tc = (i) => i + 1, trr = (j) => j + 2;   // sol (i, j) → grille
  const doorI = hw;
  // murs
  for (let c = 0; c < cols; c++) { map.flags.or(c, 0, F.BLOCK); map.flags.or(c, 1, F.BLOCK); map.flags.or(c, rows - 1, F.BLOCK); }
  for (let r = 0; r < rows; r++) { map.flags.or(0, r, F.BLOCK); map.flags.or(cols - 1, r, F.BLOCK); }

  // ── Mobilier ─────────────────────────────────────────────────────
  const place = (key, i, j, fw = 1, fh = 1, o = {}) => {
    const s = furniture(key);
    const c = tc(i), r = trr(j);
    const bx = (c + fw / 2) * 16, by = (r + fh) * 16 - 1;
    let rec = null;
    if (s.kind === 'decal' && !o.stand) map.decals.push({ s, x: Math.round(bx - s.ax), y: Math.round(by - s.ay + 1) });
    else rec = addSprite(map, s, bx, by, { sh: o.sh ?? 0.7 });
    const tiles = [];
    for (let rr = r; rr < r + fh; rr++) for (let cc = c; cc < c + fw; cc++) {
      tiles.push([cc, rr]);
      if (o.solid !== false && s.kind !== 'decal') map.flags.or(cc, rr, F.BLOCK);
      if (o.counter) map.flags.or(cc, rr, F.COUNTER);
    }
    if (o.inter) map.addInteractable({ ...o.inter, tiles: o.interTiles || tiles, ...map.center(c, r) });
    return rec;
  };
  map.decals = [];
  const books = def.books || ['Des livres sur les Lumins et les légendes de la région.', '« Les Éclats de l\'Aube, fragments d\'une étoile tombée… »'];
  const shopNpc = [];
  const npcAt = (i, j) => { const p = map.center(tc(i), trr(j)); return { x: p.x, z: p.z }; };
  switch (def.preset || 'house') {
    case 'home': case 'house': case 'bighouse': case 'cabin': {
      const big = def.preset !== 'house' && def.preset !== 'cabin' && def.preset !== undefined;
      const bedCol = def.bedColor || ['#3a7bd5', '#c8553d', '#7dc860', '#c58bff'][def.id.length % 4];
      place(`bed|${bedCol}`, 0, 0, 1, 2, def.preset === 'home' ? { inter: { type: 'prop', def: { action: 'rest' }, name: 'Lit' } } : {});
      if (def.preset === 'home') { const p = map.center(tc(1), trr(1)); map.entries.bed = { x: p.x, z: p.z, rot: Math.PI / 2 }; }
      const tx = hw - 2, ty = hd - 1;
      place(`rug|${accent}|4|3`, tx - 1, ty - 1, 4, 3);
      place('table|2', tx, ty, 2, 1);
      place('chair', tx - 1, ty, 1, 1, { solid: false, sh: 0.4 });
      place('chair', tx + 2, ty, 1, 1, { solid: false, sh: 0.4 });
      place('bookshelf', W - 3, 0, 2, 1, { inter: { type: 'prop', def: { talk: books }, name: 'Bibliothèque' } });
      place('plant', W - 1, D - 2);
      place('plant', 0, D - 2);
      if (def.preset !== 'cabin') {
        place('tv', W - 5, 0, 1, 1, { inter: { type: 'prop', def: { action: 'tv' }, name: 'Télévision' } });
        place(`sofa|${shade(accent, -0.1)}`, W - 6, 2, 2, 1, { sh: 0.5 });
      }
      if (big || def.preset === 'bighouse') {
        place('fridge', 2, 0);
        place('stove', 3, 0);
        if (W >= 14) place('wardrobe', 5, 0, 2, 1);
      }
      if (def.preset === 'cabin') place('fireplace', hw - 1, 0, 2, 1);
      break;
    }
    case 'center': {
      place('healer', hw - 1, 0, 2, 1);
      place('counter|8|#f4f0e8|#ff5c8a', hw - 4, 3, 8, 1, { counter: true, inter: { type: 'counter', action: 'heal', name: 'Infirmière' }, interTiles: [[tc(hw - 2), trr(3)], [tc(hw - 1), trr(3)], [tc(hw), trr(3)], [tc(hw + 1), trr(3)]] });
      shopNpc.push({ id: `${def.id}:infirmiere`, name: 'Infirmière', kind: 'infirmiere', ...npcAt(hw, 2), rot: 0, counter: 'heal' });
      place('pc', W - 2, 3, 1, 1, { inter: { type: 'prop', def: { action: 'pc' }, name: 'PC' } });
      place('sofa|#ff8aa8|v', 0, 5, 1, 2);
      place('table|1', 1, 5, 1, 1);
      place('plant', 0, 0); place('plant', W - 1, 0);
      map.wallDecor = [{ key: 'poster|CENTRE LUMIN|#ff5c8a', i: Math.max(1, hw - 6) }];
      if (def.mart) {
        place('shelf|#3f7cff', W - 5, 4, 2, 1);
        place('counter|3|#eef4ff|#3f7cff', W - 5, 6, 3, 1, { counter: true, inter: { type: 'counter', action: 'shop', shop: def.shop, name: 'Boutique' } });
        shopNpc.push({ id: `${def.id}:vendeur`, name: 'Vendeur', kind: 'vendeur', ...npcAt(W - 4, 5), rot: 0 });
      }
      break;
    }
    case 'shop': {
      ['#3f7cff', '#ff5c8a', '#7dc860'].forEach((c, k) => place(`shelf|${c}`, 1 + k * 3, 0, 2, 1));
      place('shelf|#ffb02e', 2, 4, 2, 1);
      place('counter|3|#eef4ff|#3f7cff', W - 4, 4, 3, 1, { counter: true, inter: { type: 'counter', action: 'shop', shop: def.shop, name: 'Boutique' } });
      shopNpc.push({ id: `${def.id}:vendeur`, name: 'Vendeur', kind: def.clerk || 'vendeur', ...npcAt(W - 3, 3), rot: 0 });
      place('plant', 0, D - 2);
      break;
    }
    case 'dept': {
      const counters = def.counters || [];
      const n = Math.max(1, counters.length);
      const step = Math.floor((W - 2) / n);
      counters.forEach((cn, k) => {
        const i = 1 + k * step + Math.floor((step - 3) / 2);
        const col = ['#3f7cff', '#ff5c8a', '#7dc860', '#ffb02e', '#c58bff'][k % 5];
        place(`shelf|${col}`, i, 0, 2, 1);
        place(`counter|3|#eef4ff|${col}`, i, 3, 3, 1, { counter: true, inter: { type: 'counter', action: 'shop', shop: cn.shop, name: cn.name || 'Comptoir' } });
        shopNpc.push({ id: `${def.id}:c${k}`, name: cn.name || 'Vendeuse', kind: k % 2 ? 'vendeur' : 'vendeuse', ...npcAt(i + 1, 2), rot: 0 });
      });
      place('plant', 0, D - 2); place('plant', W - 1, D - 2);
      place('elevator', W - 3, 6, 2, 1);
      break;
    }
    case 'lab': {
      for (let k = 0; k < 3; k++) place('labmachine', 1 + k * 2, 0);
      place('bookshelf', W - 3, 0, 2, 1, { inter: { type: 'prop', def: { talk: ['« Étude des Éclats de l\'Aube, par le Pr. Aubin ».', 'Les Éclats réagiraient à la présence des Lumins légendaires…'] }, name: 'Bibliothèque' } });
      place('bookshelf', W - 5, 0, 2, 1);
      place('desk', W - 4, 6, 2, 1);
      place('desk', 1, 7, 2, 1);
      place('pc', 0, 7);
      place('plant', 0, D - 2); place('plant', W - 1, D - 2);
      break;
    }
    case 'daycare': {
      place('counter|4|#f8ecd0|#7dc860', hw - 2, 2, 4, 1, { counter: true, inter: { type: 'counter', action: 'daycare', name: 'Pension' } });
      shopNpc.push({ id: `${def.id}:eleveuse`, name: 'Éleveuse', kind: 'eleveuse', ...npcAt(hw, 1), rot: 0 });
      place('sofa|#7dc860|v', 0, 4, 1, 2);
      place('rug|#7dc860|4|3', hw - 2, 4, 4, 3);
      place('plant', 0, 0); place('plant', W - 1, 0);
      place('fireplace', W - 4, 0, 2, 1);
      break;
    }
    case 'museum': {
      for (let k = 0; k < 4; k++) {
        const i = Math.round(2 + k * ((W - 5) / 3));
        place(`statue|${['#c8c0b0', '#ffd23f', '#9ab8ff', '#c58bff'][k]}`, i, 2, 1, 1, { inter: { type: 'prop', def: { talk: (def.exhibits || [])[k] || ['Une pièce rare de la collection.'] }, name: 'Exposition' } });
      }
      place('counter|3|#e8dcc8|#c8553d', W - 4, 6, 3, 1, { counter: true });
      place('rug|#c8553d|6|3', hw - 3, 5, 6, 3);
      break;
    }
    case 'tower': {
      place('counter|5|#e0e8f4|#ffd23f', hw - 5, 3, 5, 1, { counter: true, inter: { type: 'counter', action: 'tower', name: 'Tour de Combat' } });
      place('counter|5|#e0e8f4|#5fd4ff', hw + 2, 3, 5, 1, { counter: true, inter: { type: 'counter', action: 'bp', name: 'Échange' } });
      shopNpc.push({ id: `${def.id}:recep`, name: 'Réceptionniste', kind: 'receptionniste', ...npcAt(hw - 3, 2), rot: 0 });
      shopNpc.push({ id: `${def.id}:echange`, name: 'Échange PC', kind: 'receptionniste', ...npcAt(hw + 4, 2), rot: 0 });
      place('elevator', hw - 1, 0, 2, 1);
      place('plant', 0, D - 2); place('plant', W - 1, D - 2);
      place('pc', W - 2, 6, 1, 1, { inter: { type: 'prop', def: { action: 'pc' }, name: 'PC' } });
      break;
    }
    case 'hall': {
      for (const i of [1, W - 2]) for (const j of [Math.floor(D / 4), Math.floor((3 * D) / 4) - 1]) place('pillar', i, j);
      place(`rug|${accent}|3|${Math.max(2, D - 3)}`, hw - 1, 1, 3, Math.max(2, D - 3));
      break;
    }
    default: break;
  }
  for (const f of (def.furniture || []).filter(ok)) {
    const [c, r] = map.tileOf(f.x, f.z);
    const key = f.t === 'statue' ? `statue|${f.args?.[0] || '#c8c0b0'}` : f.t;
    const inter = f.talk || f.script || f.action ? { type: 'prop', def: f, name: f.name || '' } : null;
    place(key, c - 1, r - 2, 1, 1, { solid: f.solid !== false, ...(inter ? { inter } : {}) });
  }

  // ── Pièce (sol + murs), peinte une fois ──────────────────────────
  paintRoom(map, P, W, D, doorI);
  // tapis de sortie et porte
  const mc = tc(doorI), mr = trr(D - 1);
  const mp = map.center(mc, mr);
  map.warps.push({ x: mp.x, z: mp.z, tile: [mc, mr], to: def.exitTo, entry: def.exitEntry, exitMat: true });
  const ep = map.center(mc, mr - 1);
  map.entries.door = { x: ep.x, z: ep.z, rot: Math.PI };
  map.entries.default = map.entries.door;

  // ── PNJ, dresseurs, objets ───────────────────────────────────────
  const actorCtx = { baker: game.baker };
  for (const n of [...shopNpc, ...(def.npcs || [])]) {
    const look = n.look || (n.cls ? trainerLook(n.cls, n.id) : npcLook(n.kind || 'homme', n.id, n.lookExtra));
    const npc = new NPC2D({ ...n, look }, map, actorCtx);
    map.npcs.push(npc);
    if (!n.counter) npc.inter = map.addInteractable({ type: 'npc', npc, pos: npc.position, name: n.name || '' });
  }
  for (const t of def.trainers || []) {
    const look = t.look || trainerLook(t.cls, t.id, t.lookExtra);
    const npc = new NPC2D({ ...t, look, trainer: true, sight: t.sight ?? 4 }, map, actorCtx);
    npc.trainer = t;
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'trainer', npc, pos: npc.position, name: t.name || '', trainer: t });
  }
  (def.items || []).forEach((it, i) => {
    if (!ok(it)) return;
    const key = `${def.id}:it${i}`;
    if (game.data.picked?.[key]) return;
    const [c, r] = map.tileOf(it.x, it.z);
    let rec = null;
    if (!it.hidden) {
      rec = addSprite(map, propSprite(`pickup:${ITEMS[it.item]?.pocket === 'dt' ? '#7aa8ff' : '#ff5a7a'}`), c * 16 + 8, r * 16 + 13, { kind: 'item', sh: 0.5 });
      map.flags.or(c, r, F.BLOCK);
    }
    map.addInteractable({ type: 'item', tiles: [[c, r]], item: it.item, qty: it.qty || 1, key, sprite: rec, hidden: !!it.hidden, x: it.x, z: it.z, c, r });
  });
  for (const tr of def.triggers || []) map.addTrigger(tr);
  for (const [name, e] of Object.entries(def.entries || {})) map.entries[name] = { x: e[0], z: e[1], rot: e[2] ?? Math.PI };
  map.encounters = {};
  map.wild = null;
  map.ambient = map.dark ? null : [255, 250, 240];
  indexSprites(map);
  return map;
}

/** Sol, murs, fenêtres, ombres de contact, rais de lumière. */
function paintRoom(map, P, W, D, doorI) {
  const cols = W + 2, rows = D + 3;
  const c = canvas(cols * 16, rows * 16);
  const x = ctx2d(c);
  const img = x.createImageData(cols * 16, rows * 16);
  const put = (X, Y, hex) => { const n = parseInt(hex.slice(1), 16); const k = (Y * cols * 16 + X) * 4; img.data[k] = (n >> 16) & 255; img.data[k + 1] = (n >> 8) & 255; img.data[k + 2] = n & 255; img.data[k + 3] = 255; };
  const edge = shade(P.wallColor, -0.72), edgeHi = shade(P.wallColor, -0.45);
  for (let Y = 0; Y < rows * 16; Y++) for (let X = 0; X < cols * 16; X++) {
    const tcX = Math.floor(X / 16), tcY = Math.floor(Y / 16);
    let col;
    if (tcX === 0 || tcX === cols - 1 || tcY === rows - 1) {
      // dessus des murs (bord sombre) ; ouverture de la porte en bas
      col = edge;
      if ((tcX === 0 && X % 16 === 15) || (tcX === cols - 1 && X % 16 === 0) || (tcY === rows - 1 && Y % 16 === 0)) col = edgeHi;
      if (tcY === rows - 1 && tcX === doorI + 1) col = Y % 16 < 4 ? shade(P.floorColor, -0.4) : '#08060a';
    } else if (tcY < 2) {
      col = Y < 3 ? edge : Y < 4 ? edgeHi : wallTexel(P.wall, P.wallColor, X - 16, Y - 4, 28);
    } else {
      col = floorTile(P.floor, P.floorColor, X - 16, Y - 32, 3);
      // ombres de contact au pied des murs
      const dy = Y - 32, dl = X - 16, dr = W * 16 + 15 - X;
      if (dy < 3 || dl < 2 || dr < 2) col = shade(col, -0.28);
      else if (dy < 5 || dl < 3 || dr < 3) col = shade(col, -0.12);
    }
    put(X, Y, col);
  }
  x.putImageData(img, 0, 0);
  // fenêtres et décor mural
  const wins = [Math.round(W / 3) - 1, Math.round((2 * W) / 3)];
  map.windows = [];
  for (const i of wins) {
    const ws = windowSprite();
    const X = (i + 1) * 16 + 8 - ws.ax, Y = 26 - ws.ay;
    x.drawImage(ws.canvas, X, Y);
    map.windows.push({ x: X, y: Y, w: ws.w, h: ws.h, em: ws.emissive });
  }
  for (const d of map.wallDecor || []) { const s = furnitureSprite(d.key); x.drawImage(s.canvas, (d.i + 1) * 16, 6); }
  // tapis de sortie
  const mx = (doorI + 1) * 16, my = (D + 1) * 16;
  x.fillStyle = shade(P.accent || '#c8553d', -0.2); x.fillRect(mx + 1, my + 3, 14, 12);
  x.fillStyle = P.accent || '#c8553d'; x.fillRect(mx + 2, my + 4, 12, 10);
  x.fillStyle = shade(P.accent || '#c8553d', 0.3); for (let k = 0; k < 12; k += 2) x.fillRect(mx + 2 + k, my + 4, 1, 10);
  // tapis et décors plats
  for (const d of map.decals) x.drawImage(d.s.canvas, d.x, d.y);
  map.floor = { ground: c, water: null, lava: null, x: 0, y: 0 };
  map.pixelW = cols * 16; map.pixelH = rows * 16;
  // rais de lumière des fenêtres (le jour) dessinés sur le sol
  map.drawFloorFx = (ctx, cx, cy, t) => {
    const day = map.ctx.sky?.state?.day ?? 1;
    if (day < 0.2) return;
    ctx.save();
    ctx.globalAlpha = 0.1 * day;
    ctx.fillStyle = '#fff6d8';
    for (const w of map.windows) {
      const X = w.x - cx, Y = 32 - cy;
      ctx.beginPath();
      ctx.moveTo(X + 3, Y); ctx.lineTo(X + w.w - 3, Y); ctx.lineTo(X + w.w + 14, Y + 40); ctx.lineTo(X + 14, Y + 40);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };
  map.overview = () => { const o = canvas(cols, rows); const ox = ctx2d(o); ox.imageSmoothingEnabled = true; ox.drawImage(c, 0, 0, cols, rows); return o; };
}

import { windowWall } from '../pixel/furniture.js';
let winCache = null;
function windowSprite() { return (winCache ||= windowWall()); }
function furnitureSprite(k) { return furniture(k); }
