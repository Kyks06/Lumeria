import { Map2D } from './Map2D.js';
import { NPC2D } from './Actors2D.js';
import { Wild2D } from './Wild2D.js';
import { F, DIRS } from './tiles.js';
import { addSprite, indexSprites } from './buildOutdoor.js';
import { furniture, floorTile, wallTexel } from '../pixel/furniture.js';
import { propSprite } from '../pixel/props.js';
import { sprite as natureSprite } from '../pixel/sprites.js';
import { Px, canvas, ctx2d } from '../pixel/Px.js';
import { shade, hash2, bayer, valueNoise } from '../pixel/color.js';
import { waterFrames } from '../pixel/ground.js';
import { ITEMS } from '../config/items.js';
import { TYPES } from '../config/types.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';
import { tweens, Ease } from '../core/utils.js';

/**
 * ARÈNES ET DONJONS EN GRILLE (une case de la disposition ASCII = une tuile de 16 px) :
 * murs en relief, glace, tapis roulants animés, interrupteurs et barrières, téléporteurs,
 * rochers à pousser et trous, eau, lave, piliers, caisses, machines, haies, tapis de sortie.
 */
export const GRID_THEMES = {
  insecte:  { floor: 'planks', floorColor: '#b89a6a', wall: 'hedge', wallColor: '#3f7d34', accent: TYPES.insecte.color, bg: '#1a2a12' },
  eau:      { floor: 'tiles', floorColor: '#d8eef8', wall: 'panel', wallColor: '#6ab0e0', accent: TYPES.eau.color, bg: '#0a1a2a' },
  roche:    { floor: 'stone', floorColor: '#a89a84', wall: 'rock', wallColor: '#7a6a58', accent: TYPES.roche.color, bg: '#1a1410' },
  foudre:   { floor: 'metal', floorColor: '#c8ccd4', wall: 'metal', wallColor: '#4a4a5a', accent: TYPES.foudre.color, bg: '#10101a' },
  ombre:    { floor: 'tiles', floorColor: '#4a405a', wall: 'stone', wallColor: '#2a2236', accent: TYPES.ombre.color, bg: '#050308', dark: true },
  glace:    { floor: 'tiles', floorColor: '#e8f4ff', wall: 'ice', wallColor: '#a8d8f0', accent: TYPES.glace.color, bg: '#0a1420' },
  feu:      { floor: 'stone', floorColor: '#6a5048', wall: 'stone', wallColor: '#4a3a34', accent: TYPES.feu.color, bg: '#1a0a06' },
  psy:      { floor: 'tiles', floorColor: '#d0d4f4', wall: 'panel', wallColor: '#5a5ac8', accent: TYPES.astral.color, bg: '#140a1a' },
  entrepot: { floor: 'tiles', floorColor: '#9a9a96', wall: 'metal', wallColor: '#7a8088', accent: '#ffb02e', bg: '#121212' },
  centrale: { floor: 'metal', floorColor: '#b8bcc4', wall: 'panel', wallColor: '#5a6070', accent: '#ffd23f', bg: '#0a0c10' },
  repaire:  { floor: 'tiles', floorColor: '#3a3048', wall: 'metal', wallColor: '#2a2236', accent: '#c58bff', bg: '#06040a' },
  temple:   { floor: 'stone', floorColor: '#d8d0c0', wall: 'stone', wallColor: '#b8ac98', accent: '#ffd23f', bg: '#141008' },
  ligue:    { floor: 'tiles', floorColor: '#e8e4f0', wall: 'stone', wallColor: '#c8c0d8', accent: '#ffd23f', bg: '#0a0a14' },
  tour:     { floor: 'tiles', floorColor: '#d0d8e8', wall: 'panel', wallColor: '#3a4a7a', accent: '#5fd4ff', bg: '#080a14' },
  musee:    { floor: 'planks', floorColor: '#c8a070', wall: 'wallpaper', wallColor: '#e8dcc8', accent: '#c8553d', bg: '#140e08' },
};

const CONV = { '^': 3, v: 0, '<': 1, '>': 2 };
const SOLID = new Set(['#', '=', 'P', 'C', 'M', 'T', '~', 'L', '_']);

class GridLogic2D {
  constructor(map, def, theme) {
    this.map = map;
    this.def = def;
    this.theme = theme;
    this.rows = def.layout.map((r) => r.split(''));
    this.R = this.rows.length;
    this.C = Math.max(...this.rows.map((r) => r.length));
    this.gates = {};
    this.boulders = [];
    this.teleports = {};
    this.switches = {};
    this.pushT = 0;
    this.lastCell = null;
    this.tpGuard = null;
  }

  at(c, r) { return this.rows[r]?.[c] ?? '_'; }
  set(c, r, ch) { if (this.rows[r]) this.rows[r][c] = ch; }
  boulderAt(c, r) { return this.boulders.find((b) => b.c === c && b.r === r); }

  blocked(c, r) {
    const ch = this.at(c, r);
    if (ch === 'H') return true;
    if (/[ABDG]/.test(ch) && !this.gates[ch]?.open) return true;
    if (this.boulderAt(c, r)) return true;
    return false;
  }

  forcedDir(actor, c, r) {
    if (actor.mode && actor.mode !== 'walk') return null;
    const ch = this.at(c, r);
    if (CONV[ch] !== undefined) return CONV[ch];
    if (ch === 'I') return actor.dir;
    return null;
  }

  onArrive(player, c, r) {
    const game = this.map.ctx;
    const key = `${c},${r}`;
    const ch = this.at(c, r);
    if (this.lastCell === null) { this.lastCell = key; this.tpGuard = key; return; }
    if (key === this.lastCell) return;
    this.lastCell = key;
    if (game.busy && !player.sliding) return;
    if (/[abdg]/.test(ch)) { this.toggleGate(ch); game.sfx?.('switch'); }
    if (/[1-9]/.test(ch) && this.tpGuard !== key) {
      const other = this.teleports[ch]?.find(([cc, rr]) => cc !== c || rr !== r);
      if (other) {
        const dst = this.map.center(other[0], other[1]);
        this.tpGuard = `${other[0]},${other[1]}`;
        this.lastCell = this.tpGuard;
        if (game.teleportFx) game.teleportFx(player.position, dst);
        else { player.position.x = dst.x; player.position.z = dst.z; }
      }
    } else if (this.tpGuard && key !== this.tpGuard) this.tpGuard = null;
  }

  toggleGate(letter) {
    const L = letter.toUpperCase();
    const G = this.gates[L];
    if (!G) return;
    G.open = !G.open;
    G.anim = 0;
    this.switches[letter.toLowerCase()] = G.open;
  }

  onBump(player, c, r, dir) {
    const b = this.boulderAt(c, r);
    if (!b) { this.pushT = 0; return; }
    const game = this.map.ctx;
    if (!game.canUseStrength?.()) {
      if (!this.hinted) { this.hinted = true; game.ui?.toast('Un rocher énorme. Il faudrait un Lumin très fort pour le pousser.'); }
      return;
    }
    this.pushT += 1 / 60;
    if (this.pushT < 0.22 || b.moving) return;
    this.pushT = 0;
    const [dc, dr] = DIRS[dir];
    const nc = c + dc, nr = r + dr;
    const ch = this.at(nc, nr);
    const free = ch === 'H' || (!SOLID.has(ch) && !this.blocked(nc, nr) && !this.map.actorAt(nc, nr));
    if (!free) return;
    b.moving = true;
    game.sfx?.('push');
    const fx = b.c * 16 + 8, fy = b.r * 16 + 15, tx = nc * 16 + 8, ty = nr * 16 + 15;
    b.c = nc; b.r = nr;
    tweens.tween(0.28, (t) => { const X = fx + (tx - fx) * t, Y = fy + (ty - fy) * t; b.rec.x = Math.round(X - b.s.ax); b.rec.y = Math.round(Y - b.s.ay); b.rec.base = Y; }, Ease.inOutCubic).then(() => {
      b.moving = false;
      if (ch === 'H') {
        this.set(nc, nr, '.');
        this.boulders.splice(this.boulders.indexOf(b), 1);
        b.rec.hidden = true;
        this.map.filledHoles.push([nc, nr]);
        this.map.patchHole?.(nc, nr);
        game.sfx?.('thud');
        game.engine?.addShake(0.12);
      }
      this.map.reindex?.();
    });
  }

  update(dt) {
    for (const G of Object.values(this.gates)) if (G.anim !== undefined && G.anim < 1) G.anim = Math.min(1, G.anim + dt * 3);
  }
}

export async function buildGrid2D(def, game) {
  const theme = { ...GRID_THEMES[def.theme || 'temple'], ...(def.themeOverride || {}) };
  const cell = def.cell || 2;
  const G0 = new GridLogic2D(null, def, theme);
  const C = G0.C, R = G0.R;
  const map = new Map2D(def, 'grid', game, { T: cell, cols: C, rows: R, ox: -(C * cell) / 2, oz: -(R * cell) / 2 });
  G0.map = map;
  map.grid = G0;
  map.theme = theme;
  map.dark = !!(def.dark ?? theme.dark);
  map.bg = theme.bg;
  map.bounds = [-(C * cell) / 2, (C * cell) / 2, -(R * cell) / 2, (R * cell) / 2];
  map.filledHoles = [];
  map.reindex = () => indexSprites(map);
  const L = G0;
  const ok = (o) => game.flagOk(o);

  // ── Indicateurs ──────────────────────────────────────────────────
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = L.at(c, r);
    if (SOLID.has(ch)) map.flags.or(c, r, F.BLOCK);
    if (ch === '#') map.flags.or(c, r, F.NOSIGHT);
    if (ch === 'I') map.flags.or(c, r, F.ICE);
    if (ch === 'L') map.flags.or(c, r, F.LAVA);
    if (/[ABDG]/.test(ch)) (L.gates[ch] ||= { open: false, cells: [] }).cells.push([c, r]);
    if (/[1-9]/.test(ch)) (L.teleports[ch] ||= []).push([c, r]);
  }

  // ── Sol et murs peints ───────────────────────────────────────────
  paintGrid(map, L, theme);

  // ── Éléments en relief ───────────────────────────────────────────
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = L.at(c, r);
    const bx = c * 16 + 8, by = r * 16 + 15;
    if (ch === 'O') {
      const s = propSprite('boulder');
      const rec = addSprite(map, s, bx, by, { kind: 'obstacle' });
      L.boulders.push({ c, r, rec, s });
      L.set(c, r, '.');
    } else if (ch === 'P') addSprite(map, furniture(`pillar|${theme.wallColor}`), bx, by, { sh: 0.6 });
    else if (ch === 'C') addSprite(map, propSprite((c + r) % 3 === 0 ? 'barrel' : 'crate'), bx, by, { sh: 0.6 });
    else if (ch === 'M') addSprite(map, furniture('labmachine'), bx, by, { sh: 0.6 });
    else if (ch === 'T') addSprite(map, def.theme === 'insecte' ? natureSprite(`tree:oakDark:${(c * 3 + r) % 6}`) : natureSprite(`bush:dark:${(c + r) % 4}`), bx, by, { sh: 0.8 });
  }

  const cellPos = (o) => (o.cell ? map.center(o.cell[0], o.cell[1]) : { x: o.x, z: o.z });
  for (const f of (def.furniture || []).filter(ok)) {
    const p = cellPos(f);
    const [c, r] = map.tileOf(p.x, p.z);
    const key = f.t === 'statue' ? `statue|${f.args?.[0] || '#c8c0b0'}` : f.t;
    const s = furniture(key);
    addSprite(map, s, c * 16 + 8, r * 16 + 15, { sh: 0.6 });
    if (f.solid !== false) map.flags.or(c, r, F.BLOCK);
    if (f.talk || f.script || f.action) map.addInteractable({ type: 'prop', tiles: [[c, r]], def: f, name: f.name || '', x: p.x, z: p.z });
  }
  (def.items || []).forEach((it, i) => {
    if (!ok(it)) return;
    const key = `${def.id}:it${i}`;
    if (game.data.picked?.[key]) return;
    const p = cellPos(it);
    const [c, r] = map.tileOf(p.x, p.z);
    let rec = null;
    if (!it.hidden) { rec = addSprite(map, propSprite(`pickup:${ITEMS[it.item]?.pocket === 'dt' ? '#7aa8ff' : '#ff5a7a'}`), c * 16 + 8, r * 16 + 13, { kind: 'item', sh: 0.5 }); map.flags.or(c, r, F.BLOCK); }
    map.addInteractable({ type: 'item', tiles: [[c, r]], item: it.item, qty: it.qty || 1, key, sprite: rec, hidden: !!it.hidden, x: p.x, z: p.z, c, r });
  });

  // ── PNJ, dresseurs, Champion ─────────────────────────────────────
  const actorCtx = { baker: game.baker };
  for (const n of def.npcs || []) {
    const p = cellPos(n);
    const look = n.look || (n.cls ? trainerLook(n.cls, n.id) : npcLook(n.kind || 'homme', n.id, n.lookExtra));
    const npc = new NPC2D({ ...n, x: p.x, z: p.z, look }, map, actorCtx);
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'npc', npc, pos: npc.position, name: n.name || '' });
  }
  for (const t of def.trainers || []) {
    const p = cellPos(t);
    const look = t.look || trainerLook(t.cls, t.id, t.lookExtra);
    const npc = new NPC2D({ ...t, x: p.x, z: p.z, look, trainer: true, sight: t.sight ?? 4 }, map, actorCtx);
    npc.trainer = t;
    map.npcs.push(npc);
    npc.inter = map.addInteractable({ type: 'trainer', npc, pos: npc.position, name: t.name || '', trainer: t });
  }

  // ── Sorties, escaliers, entrées, déclencheurs ────────────────────
  for (const w of def.warps || []) {
    const p = cellPos(w);
    const [c, r] = map.tileOf(p.x, p.z);
    map.warps.push({ ...w, x: p.x, z: p.z, tile: [c, r] });
    if (w.stairs) addSprite(map, furniture(`stairs|${w.stairs}`), c * 16 + 8, r * 16 + 15, { noShadow: true, base: r * 16 });
  }
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (L.at(c, r) === 'E' && def.exit) {
    const p = map.center(c, r);
    map.warps.push({ x: p.x, z: p.z, tile: [c, r], to: def.exit.to, entry: def.exit.entry, exitMat: true });
    if (!map.entries.door) { const q = map.center(c, r - 1); map.entries.door = { x: q.x, z: q.z, rot: Math.PI }; }
  }
  for (const [name, e] of Object.entries(def.entries || {})) { const p = map.center(e[0], e[1]); map.entries[name] = { x: p.x, z: p.z, rot: e[2] ?? Math.PI }; }
  for (const tr of def.triggers || []) {
    if (tr.cell) { const p = map.center(tr.cell[0], tr.cell[1]); map.addTrigger({ ...tr, x: p.x, z: p.z, w: tr.w || cell, d: tr.d || cell }); } else map.addTrigger(tr);
  }
  if (!map.entries.default) map.entries.default = map.entries.door || { ...map.center(Math.floor(C / 2), R - 2), rot: Math.PI };
  map.encounters = def.encounters || {};
  map.wild = def.encounters?.cave?.length ? new Wild2D(map, game.wildCtx(), { cave: def.encounters.cave }) : null;
  // éclairage des lampes de la définition
  for (const [lx, lz] of def.lamps || []) map.lights2d.push({ x: map.px(lx), y: map.pz(lz), r: 70, color: theme.accent, always: true });
  map.ambient = map.dark ? null : [250, 248, 255];
  indexSprites(map);
  return map;
}

/** Peinture statique (sol, murs, décor au sol) + animations (tapis roulants, téléporteurs, barrières, interrupteurs). */
function paintGrid(map, L, theme) {
  const C = L.C, R = L.R;
  const W = C * 16, H = R * 16;
  const cv = canvas(W, H);
  const x = ctx2d(cv);
  const img = x.createImageData(W, H);
  const wm = new Px(W, H), lm = new Px(W, H);
  const put = (X, Y, hex) => { const n = parseInt(hex.slice(1), 16); const k = (Y * W + X) * 4; img.data[k] = (n >> 16) & 255; img.data[k + 1] = (n >> 8) & 255; img.data[k + 2] = n & 255; img.data[k + 3] = 255; };
  const wallTop = shade(theme.wallColor, theme.wall === 'hedge' ? 0.1 : 0.25), wallTopHi = shade(theme.wallColor, 0.45), wallDark = shade(theme.wallColor, -0.6);
  const isWall = (c, r) => L.at(c, r) === '#';
  const acc = theme.accent;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = L.at(c, r);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const X = c * 16 + i, Y = r * 16 + j;
      let col;
      if (ch === '_') col = theme.bg;
      else if (ch === '#') {
        const front = !isWall(c, r + 1) && r + 1 < R;
        const faceH = 11;
        if (front && j >= 16 - faceH) {
          col = wallTexel(theme.wall, theme.wallColor, X, j - (16 - faceH), faceH + 4);
          if (j === 16 - faceH) col = wallTopHi;
          if (j === 15) col = wallDark;
        } else {
          // dessus du mur : bord clair au sud/est, sombre au nord/ouest
          col = theme.wall === 'hedge' ? (valueNoise(X / 3, Y / 3, 5) > 0.5 ? shade(theme.wallColor, 0.2) : theme.wallColor) : wallTop;
          if (!isWall(c - 1, r) && i < 1) col = wallDark;
          if (!isWall(c + 1, r) && i > 14) col = wallDark;
          if (!isWall(c, r - 1) && j < 1) col = wallDark;
          if (theme.wall !== 'hedge' && (i === 0 || j === 0) && isWall(c - 1, r) && isWall(c, r - 1)) col = shade(wallTop, -0.08);
        }
      } else {
        col = floorTile(theme.floor, theme.floorColor, X, Y, 5);
        if (ch === ',') col = ((i + j) % 4 === 0) ? shade(acc, 0.3) : (i === 0 || j === 0 || i === 15 || j === 15) ? shade(acc, -0.35) : shade(acc, -0.1);
        if (ch === 'I') { const v = (i + j * 2 + c * 5) % 13; col = v < 2 ? '#ffffff' : (j < 3 ? '#e4f6ff' : '#bfe6fa'); if (i === 15 || j === 15) col = '#9ccfe8'; }
        if (ch === '=') { col = j < 6 ? shade(theme.wallColor, 0.35) : j === 6 ? shade(theme.wallColor, 0.55) : j > 13 ? shade(theme.wallColor, -0.5) : theme.wallColor; }
        if (ch === '~') { const up = L.at(c, r - 1) !== '~'; col = up && j < 2 ? '#dcf4ff' : up && j < 4 ? '#8ac6f4' : (valueNoise(X / 6, Y / 6, 3) + (bayer(X, Y) - 0.5) * 0.2 > 0.55 ? '#3a7ed0' : '#2f6cc0'); wm.set(X, Y, '#ffffff'); }
        if (ch === 'L') { col = '#d0461a'; lm.set(X, Y, '#ffffff'); }
        if (ch === 'H') { const d = Math.hypot(i - 7.5, j - 7.5); col = d < 6 ? '#050505' : d < 7.3 ? '#2a2420' : col; }
        if (ch === 'E') { if (i > 1 && i < 14 && j > 3 && j < 14) col = (i % 3 === 0) ? '#e85a4a' : '#c83a3a'; }
        if (/[1-9]/.test(ch)) { const d = Math.hypot(i - 7.5, j - 7.5); if (d < 7) col = d > 5.5 ? '#6a4a9a' : d > 4.5 ? '#c58bff' : '#3a2a5a'; }
        if (/[abdg]/.test(ch)) { const d = Math.hypot(i - 7.5, j - 7.5); if (d < 5.5) col = d > 4.5 ? '#3a3a44' : '#8a8a94'; }
        // ombre portée des murs (au sud des murs)
        if (isWall(c, r - 1) && j < 4) col = shade(col, j < 2 ? -0.38 : -0.2);
        if (isWall(c - 1, r) && i < 2) col = shade(col, -0.18);
      }
      put(X, Y, col);
    }
  }
  x.putImageData(img, 0, 0);
  const hasW = wm.bounds(), hasL = lm.bounds();
  map.floor = { ground: cv, water: hasW ? wm.toCanvas() : null, lava: hasL ? lm.toCanvas() : null, x: 0, y: 0 };
  map.pixelW = W; map.pixelH = H;
  // trou comblé par un rocher : dalle de gravats
  map.patchHole = (c, r) => {
    const g = ctx2d(cv);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const d = Math.hypot(i - 7.5, j - 7.5);
      g.fillStyle = d < 6.5 ? (hash2(i, j, 4) < 0.3 ? '#5a5650' : (i + j) % 5 === 0 ? '#9a948a' : '#76716a') : floorTile(theme.floor, theme.floorColor, c * 16 + i, r * 16 + j, 5);
      g.fillRect(c * 16 + i, r * 16 + j, 1, 1);
    }
  };
  // animations au sol
  const arrows = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (CONV[L.at(c, r)] !== undefined) arrows.push([c, r, CONV[L.at(c, r)]]);
  map.drawFloorFx = (ctx, cx, cy, t, glow) => {
    // tapis roulants : chevrons qui défilent
    for (const [c, r, d] of arrows) {
      const X = c * 16 - cx, Y = r * 16 - cy;
      if (X < -16 || Y < -16 || X > 400 || Y > 300) continue;
      ctx.fillStyle = '#2a2a36'; ctx.fillRect(X, Y, 16, 16);
      ctx.fillStyle = shade(acc, 0.1);
      const off = Math.floor(t * 24) % 8;
      for (let k = -1; k < 2; k++) {
        const s = k * 8 + off;
        for (let w = 0; w < 5; w++) {
          const a = 7 - w, b = 4 + s + w;
          if (b < 0 || b > 15) continue;
          if (d === 0) { ctx.fillRect(X + a - 0, Y + b, 1, 2); ctx.fillRect(X + 15 - a, Y + b, 1, 2); }
          if (d === 3) { ctx.fillRect(X + a, Y + 15 - b, 1, 2); ctx.fillRect(X + 15 - a, Y + 15 - b, 1, 2); }
          if (d === 2) { ctx.fillRect(X + b, Y + a, 2, 1); ctx.fillRect(X + b, Y + 15 - a, 2, 1); }
          if (d === 1) { ctx.fillRect(X + 15 - b, Y + a, 2, 1); ctx.fillRect(X + 15 - b, Y + 15 - a, 2, 1); }
        }
      }
    }
    // téléporteurs : anneau pulsé + halo
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    for (const list of Object.values(L.teleports)) for (const [c, r] of list) {
      const X = c * 16 + 8 - cx, Y = r * 16 + 8 - cy;
      ctx.fillStyle = `rgba(230,200,255,${0.3 + pulse * 0.4})`;
      ctx.fillRect(X - 2, Y - 2, 4, 4);
      glow.fillStyle = `rgba(200,140,255,${0.4 + pulse * 0.4})`;
      glow.fillRect(X - 6, Y - 6, 12, 12);
    }
    // interrupteurs
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const ch = L.at(c, r);
      if (!/[abdg]/.test(ch)) continue;
      const on = !!L.gates[ch.toUpperCase()]?.open;
      const X = c * 16 + 8 - cx, Y = r * 16 + 8 - cy;
      ctx.fillStyle = on ? '#7dff9c' : '#ff4f4f';
      ctx.fillRect(X - 3, Y - 3, 6, 6);
      ctx.fillStyle = on ? '#d8ffe0' : '#ffb0b0'; ctx.fillRect(X - 2, Y - 3, 2, 1);
      glow.fillStyle = on ? '#3aff6a' : '#ff2a2a'; glow.fillRect(X - 4, Y - 4, 8, 8);
    }
  };
  // barrières (dessinées au-dessus du sol, au niveau des personnages)
  map.drawOverFx = (ctx, cx, cy, t, glow) => {
    for (const [letter, G] of Object.entries(L.gates)) {
      const k = G.open ? (G.anim ?? 1) : 1 - (G.anim ?? 1);
      const h = Math.round(18 * (1 - k));
      if (h <= 0) continue;
      for (const [c, r] of G.cells) {
        const X = c * 16 - cx, Y = r * 16 - cy;
        const horiz = L.at(c - 1, r) === '#' || L.at(c + 1, r) === '#' || /[ABDG]/.test(L.at(c - 1, r)) || /[ABDG]/.test(L.at(c + 1, r));
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = '#ff5a5a';
        if (horiz) ctx.fillRect(X, Y + 14 - h, 16, h); else ctx.fillRect(X + 5, Y + 14 - h, 6, h);
        ctx.fillStyle = '#ffd0d0';
        if (horiz) ctx.fillRect(X, Y + 14 - h, 16, 1); else ctx.fillRect(X + 5, Y + 14 - h, 6, 1);
        ctx.globalAlpha = 1;
        glow.fillStyle = 'rgba(255,60,60,0.6)';
        if (horiz) glow.fillRect(X, Y + 14 - h, 16, h); else glow.fillRect(X + 5, Y + 14 - h, 6, h);
      }
    }
  };
  map.overview = () => { const o = canvas(C, R); const ox = ctx2d(o); ox.imageSmoothingEnabled = true; ox.drawImage(cv, 0, 0, C, R); return o; };
}
