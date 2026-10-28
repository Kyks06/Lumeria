import { waterFrames } from '../pixel/ground.js';
import { canvas, ctx2d } from '../pixel/Px.js';
import { bayer, valueNoise } from '../pixel/color.js';
import { F } from './tiles.js';
import { CHUNK } from './buildOutdoor.js';

/**
 * RENDU DU MONDE EN PIXEL ART dans l'image basse résolution du moteur :
 * sol peint par morceaux, eau animée (reflets et scintillement), hautes herbes, ombres portées
 * selon le soleil, ombres de nuages, décor et personnages triés en profondeur, particules,
 * carte de lumière (nuit, grottes), sources émissives envoyées au halo, météo.
 */
const mk = (W, H) => { const c = canvas(W, H); return { c, x: ctx2d(c) }; };

export class Renderer2D {
  constructor(game) {
    this.game = game;
    this.engine = game.engine;
    this.cam = { x: 0, y: 0, fx: 0, fy: 0, init: false };
    this.water = {};
    this.t = 0;
    this.layers = {};
    this.engine.onResize(() => this.resize());
    this.resize();
    this.clouds = null;
  }

  resize() {
    const { W, H } = this.engine;
    for (const k of ['shadow', 'mask', 'fx', 'light', 'refl']) this.layers[k] = mk(W, H);
  }

  waterSet(kind) {
    if (!this.water[kind]) this.water[kind] = waterFrames(kind, 8);
    return this.water[kind];
  }

  cloudTex() {
    if (this.clouds) return this.clouds;
    const S = 192;
    const c = canvas(S, S);
    const x = ctx2d(c);
    const img = x.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      // bruit périodique (raccordable)
      let v = 0, a = 0.6, f = 1;
      for (let o = 0; o < 3; o++) {
        const u = (i / S) * 4 * f, w = (j / S) * 4 * f;
        const P = 4 * f;
        v += a * tileNoise(u, w, P, o + 3); a *= 0.5; f *= 2;
      }
      const on = v + (bayer(i, j) - 0.5) * 0.12 > 0.62;
      const k = (j * S + i) * 4;
      if (on) { img.data[k + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
    this.clouds = c;
    return c;
  }

  /** Coordonnées écran (CSS) d'un point du monde (mètres), relevé de lift pixels. */
  toScreen(x, z, lift = 0) {
    const map = this.game.map;
    if (!map) return { x: 0, y: 0 };
    const X = map.px(x) - this.cam.x, Y = map.pz(z) - lift - this.cam.y;
    return this.engine.toScreen(X, Y);
  }

  /** Caméra centrée sur le point (mètres), bornée à la carte. */
  updateCamera(map, focus, dt, smooth = false) {
    const { W, H } = this.engine;
    let tx = map.px(focus.x) - W / 2, ty = map.pz(focus.z) - 4 - H / 2;
    const PW = map.pixelW, PH = map.pixelH;
    tx = PW > W ? Math.max(0, Math.min(PW - W, tx)) : (PW - W) / 2;
    ty = PH > H ? Math.max(0, Math.min(PH - H, ty)) : (PH - H) / 2;
    if (!this.cam.init || !smooth || Math.hypot(tx - this.cam.fx, ty - this.cam.fy) > 400) { this.cam.fx = tx; this.cam.fy = ty; this.cam.init = true; }
    else { const k = 1 - Math.exp(-dt * 5); this.cam.fx += (tx - this.cam.fx) * k; this.cam.fy += (ty - this.cam.fy) * k; }
    const sh = this.engine.getShakeOffset(this.shk || (this.shk = { x: 0, y: 0 }));
    this.cam.x = Math.round(this.cam.fx) + sh.x;
    this.cam.y = Math.round(this.cam.fy) + sh.y;
  }

  snapCamera() { this.cam.init = false; }

  /** Dessine le monde. */
  render(dt, { map, player, light, weather }) {
    const E = this.engine;
    const ctx = E.fctx, glow = E.gctx;
    const W = E.W, H = E.H;
    this.t += dt;
    const t = this.t;
    const cx = this.cam.x, cy = this.cam.y;
    const L = this.layers;
    glow.clearRect(0, 0, W, H);
    this._glow = glow;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = map.bg || '#0c0a10';
    ctx.fillRect(0, 0, W, H);
    const t0 = performance.now();

    // ── Sol ────────────────────────────────────────────────────────
    const chunks = this.visibleChunks(map, cx, cy, W, H);
    for (const ch of chunks) ctx.drawImage(ch.ground, ch.x - cx, ch.y - cy);

    // ── Eau : masque, scintillement, reflets ───────────────────────
    const wch = chunks.filter((c) => c.water);
    let hasWater = false;
    if (wch.length) {
      hasWater = true;
      const m = L.mask.x;
      m.clearRect(0, 0, W, H);
      for (const ch of wch) m.drawImage(ch.water, ch.x - cx, ch.y - cy);
      const frames = this.waterSet(map.waterKind || 'normal');
      const fr = frames[Math.floor(t * 5) % frames.length];
      const fx = L.fx.x;
      fx.clearRect(0, 0, W, H);
      fx.save();
      fx.fillStyle = fx.createPattern(fr, 'repeat');
      const ox = -((cx + Math.floor(t * 3)) % 64), oy = -(cy % 64);
      fx.translate(ox, oy);
      fx.fillRect(-ox, -oy, W, H);
      fx.restore();
      fx.globalCompositeOperation = 'destination-in';
      fx.drawImage(L.mask.c, 0, 0);
      fx.globalCompositeOperation = 'source-over';
      ctx.drawImage(L.fx.c, 0, 0);
    }
    const lch = chunks.filter((c) => c.lava);
    if (lch.length) {
      const frames = this.waterSet('lava');
      const fr = frames[Math.floor(t * 3) % frames.length];
      const fx = L.fx.x;
      fx.clearRect(0, 0, W, H);
      for (const ch of lch) fx.drawImage(ch.lava, ch.x - cx, ch.y - cy);
      fx.globalCompositeOperation = 'source-in';
      fx.save(); fx.fillStyle = fx.createPattern(fr, 'repeat'); const ox = -(cx % 64), oy = -(cy % 64); fx.translate(ox, oy); fx.fillRect(-ox, -oy, W, H); fx.restore();
      fx.globalCompositeOperation = 'source-over';
      ctx.drawImage(L.fx.c, 0, 0);
      // la lave éclaire et brille
      glow.globalAlpha = 0.55 + Math.sin(t * 2) * 0.1;
      for (const ch of lch) glow.drawImage(ch.lava, ch.x - cx, ch.y - cy);
      glow.globalAlpha = 1;
      glow.globalCompositeOperation = 'source-in'; glow.fillStyle = '#ff6a1a'; glow.fillRect(0, 0, W, H); glow.globalCompositeOperation = 'source-over';
    }

    // ── Tuiles animées : fleurs, herbes qui frémissent ─────────────
    const c0 = Math.floor(cx / 16), r0 = Math.floor(cy / 16), c1 = Math.ceil((cx + W) / 16), r1 = Math.ceil((cy + H) / 16);
    if (map.deco) {
      const f = Math.floor(t * 1.6) % 2;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const dv = map.deco.get(c, r);
        if (dv) ctx.drawImage(map.flowerFrames[dv - 1][f][(c * 7 + r * 3) & 3], c * 16 - cx, r * 16 - cy);
      }
    }
    if (map.grassRustle) for (const g of map.rustles) ctx.drawImage(map.grassRustle[(g.c + g.r) % 2].back, g.c * 16 - cx, g.r * 16 - cy);
    if (map.drawFloorFx) map.drawFloorFx(ctx, cx, cy, t, glow);

    // ── Liste des éléments visibles ────────────────────────────────
    const items = [];
    const rowA = Math.floor((cy - 32) / 64), rowB = Math.floor((cy + H + map.maxSpriteH + 32) / 64);
    for (let k = rowA; k <= rowB; k++) {
      const row = map.spriteRows?.get(k);
      if (!row) continue;
      for (const s of row) {
        if (s.hidden) continue;
        if (s.x - cx > W + 40 || s.x + s.w - cx < -40 || s.y - cy > H + 40 || s.base - cy < -40) continue;
        items.push({ y: s.base, s });
      }
    }
    const actors = [];
    for (const n of map.npcs) if (n.group.visible) actors.push(n);
    if (player && player.group.visible && player.map === map) actors.push(player);
    for (const a of actors) {
      const X = map.px(a.position.x), Y = map.pz(a.position.z);
      if (X - cx < -40 || X - cx > W + 40 || Y - cy < -60 || Y - cy > H + 60) continue;
      items.push({ y: Y + 7.5, a, X, Y });
    }
    items.sort((a, b) => a.y - b.y);

    // ── Ombres (soleil) ────────────────────────────────────────────
    const sun = light.sun;
    const sa = map.kind === 'outdoor' ? light.shadowAlpha : map.kind === 'cave' ? 0.18 : 0.16;
    const sx = L.shadow.x;
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.clearRect(0, 0, W, H);
    sx.fillStyle = '#000';
    const indoorSun = map.kind !== 'outdoor';
    const kxBase = indoorSun ? 0.18 : sun.kx, kyBase = indoorSun ? -0.25 : sun.ky;
    for (const it of items) {
      if (it.s) {
        const s = it.s;
        if (s.shadow && s.sh > 0 && sa > 0.01) {
          const ay = s.base - s.y, kx = kxBase * s.sh, ky = kyBase * s.sh;
          sx.setTransform(1, 0, -kx, -ky, s.x - cx + ay * kx, s.base - cy + ay * ky);
          sx.drawImage(s.shadow, 0, 0);
        }
        if (s.kind === 'tree' || s.kind === 'rock' || s.kind === 'prop' || s.kind === 'obstacle' || s.kind === 'item' || s.kind === 'bush') {
          sx.setTransform(1, 0, 0, 1, 0, 0);
          const bw = Math.min(14, Math.round(s.w * 0.55));
          ellipse(sx, s.x + s.w / 2 - cx, s.base - cy - 1, bw / 2, 2);
        }
      } else {
        sx.setTransform(1, 0, 0, 1, 0, 0);
        const surf = it.a.mode === 'surf';
        ellipse(sx, it.X - cx, it.Y + 6 - cy + (surf ? 3 : 0), surf ? 11 : 5.5, surf ? 3 : 2);
      }
    }
    sx.setTransform(1, 0, 0, 1, 0, 0);
    // ombres des nuages
    if (map.kind === 'outdoor' && light.day > 0.3 && !map.noClouds) {
      sx.save();
      sx.globalAlpha = 0.32;
      sx.fillStyle = sx.createPattern(this.cloudTex(), 'repeat');
      const drift = t * 4;
      const ox = -((cx + drift) % 192), oy = -((cy + drift * 0.4) % 192);
      sx.translate(ox, oy);
      sx.fillRect(-ox, -oy, W, H);
      sx.restore();
    }
    ctx.globalAlpha = Math.max(sa, map.kind === 'outdoor' ? sa : 0.16);
    ctx.drawImage(L.shadow.c, 0, 0);
    ctx.globalAlpha = 1;

    // ── Reflets sur l'eau ──────────────────────────────────────────
    if (hasWater) {
      const rx = L.refl.x;
      rx.setTransform(1, 0, 0, 1, 0, 0);
      rx.clearRect(0, 0, W, H);
      let any = false;
      for (const it of items) {
        if (it.s && it.s.reflect) {
          const s = it.s;
          rx.setTransform(1, 0, 0, -1, 0, 2 * (s.base - cy) + 2);
          rx.drawImage(this.frameOf(s, t), s.x - cx, s.y - cy);
          any = true;
        } else if (it.a) {
          const a = it.a;
          const [tc, tr] = a.tile(map);
          if (map.flags.has(tc, tr + 1, F.WATER) || a.mode === 'surf') {
            rx.setTransform(1, 0, 0, -1, 0, 2 * (it.Y + 8 - cy) + (a.mode === 'surf' ? -2 : 0));
            this.drawActor(rx, map, a, it.X - cx, it.Y - cy, false);
            any = true;
          }
        }
      }
      rx.setTransform(1, 0, 0, 1, 0, 0);
      if (any) {
        rx.globalCompositeOperation = 'destination-in';
        rx.drawImage(L.mask.c, 0, 0);
        rx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.32;
        ctx.drawImage(L.refl.c, 0, 0);
        ctx.globalAlpha = 1;
      }
    }

    // ── Décor et personnages ───────────────────────────────────────
    for (const it of items) {
      if (it.s) ctx.drawImage(this.frameOf(it.s, t), it.s.x - cx, it.s.y - cy);
      else this.drawActor(ctx, map, it.a, it.X - cx, it.Y - cy, true);
    }

    // ── Flotteur de pêche ──────────────────────────────────────────
    if (this.bobber && player) {
      const B = this.bobber;
      const X = Math.round(map.px(B.x) - cx), Y = Math.round(map.pz(B.z) - cy) + (B.y || 0);
      const PX = Math.round(map.px(player.position.x) - cx), PY = Math.round(map.pz(player.position.z) - cy);
      const hx = PX + [5, -6, 6, 4][player.dir], hy = PY - 14;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const n = Math.max(Math.abs(X - hx), Math.abs(Y - hy));
      for (let k = 0; k <= n; k++) { const u = k / Math.max(1, n); ctx.fillRect(Math.round(hx + (X - hx) * u), Math.round(hy + (Y - hy) * u + Math.sin(u * Math.PI) * 3), 1, 1); }
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y, 3, 1);
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(X - 1, Y - 2, 3, 2);
      ctx.fillStyle = '#2a1a1a'; ctx.fillRect(X, Y - 3, 1, 1);
      if (B.bite) { ctx.fillStyle = 'rgba(220,244,255,0.9)'; const r = 3 + Math.floor(t * 12) % 4; ctx.fillRect(X - r, Y + 1, 2, 1); ctx.fillRect(X + r - 1, Y + 1, 2, 1); }
    }

    // ── Particules du monde ────────────────────────────────────────
    const g = this.game;
    const ppm = map.ppm;
    const proj = (x, y, z) => [map.px(x) - cx, map.pz(z) - y * ppm - cy];
    g.fxNorm?.draw(ctx, proj, ppm, glow);
    g.fxAdd?.draw(ctx, proj, ppm, glow);
    if (map.drawOverFx) map.drawOverFx(ctx, cx, cy, t, glow);

    // ── Lumière : nuit, grottes, intérieurs ────────────────────────
    const amb = this.ambientFor(map, light);
    const darkK = 1 - Math.min(amb[0], amb[1], amb[2]) / 255;
    if (darkK > 0.02) {
      const lx = L.light.x;
      lx.globalCompositeOperation = 'source-over';
      lx.fillStyle = `rgb(${amb[0] | 0},${amb[1] | 0},${amb[2] | 0})`;
      lx.fillRect(0, 0, W, H);
      lx.globalCompositeOperation = 'lighter';
      const lampK = map.kind === 'outdoor' ? Math.max(light.lamps, darkK) : 1;
      for (const l of map.lights2d) {
        if (l.window && map.kind === 'outdoor' && light.windows < 0.05) continue;
        if (l.src?.hidden) continue;
        const X = l.x - cx, Y = l.y - cy;
        const R = l.r * (l.flicker ? 1 + Math.sin(t * 13 + l.x) * 0.06 + Math.sin(t * 7.3 + l.y) * 0.04 : 1);
        if (X < -R || X > W + R || Y < -R || Y > H + R) continue;
        const k = (l.window ? light.windows : lampK) * (l.small ? 0.6 : 1);
        radial(lx, X, Y, R, l.color, 0.9 * k);
      }
      if (player && map.player === player) {
        const X = map.px(player.position.x) - cx, Y = map.pz(player.position.z) - cy - 4;
        if (map.dark) radial(lx, X, Y, g.sky.biome.lanternOn ? 96 : 30, '#ffe8c8', g.sky.biome.lanternOn ? 1 : 0.7);
        else if (map.kind === 'cave') radial(lx, X, Y, 70, '#fff0d8', 0.45);
        else if (map.kind === 'outdoor' && darkK > 0.3) radial(lx, X, Y, 34, '#c8d0ff', 0.25);
      }
      lx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'multiply';
      ctx.drawImage(L.light.c, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }

    // ── Sources émissives (fenêtres, lampes, cristaux) + halo ──────
    const winK = map.kind === 'outdoor' ? light.windows : 0;
    const lampVis = map.kind === 'outdoor' ? 0.25 + 0.75 * light.lamps : 1;
    for (const it of items) {
      const s = it.s;
      if (!s || !s.em) continue;
      const k = s.kind === 'building' ? winK : s.glowColor ? Math.max(0.55, darkK) : lampVis;
      if (k < 0.03) continue;
      const em = s.emFrames ? s.emFrames[Math.floor((t * s.fps) + s.phase) % s.emFrames.length] : s.em;
      ctx.globalAlpha = k;
      ctx.drawImage(em, s.x - cx, s.y - cy);
      glow.globalAlpha = k * (s.kind === 'building' ? 0.7 : 0.6);
      glow.drawImage(em, s.x - cx, s.y - cy);
    }
    ctx.globalAlpha = 1; glow.globalAlpha = 1;
    // halo doux des lampes la nuit
    if (darkK > 0.15) {
      glow.globalCompositeOperation = 'lighter';
      for (const l of map.lights2d) {
        if (l.window || l.src?.hidden) continue;
        const X = l.x - cx, Y = l.y - cy;
        if (X < -40 || X > W + 40 || Y < -40 || Y > H + 40) continue;
        radial(glow, X, Y, l.r * 0.3, l.color, 0.22 * darkK);
      }
      glow.globalCompositeOperation = 'source-over';
    }
    // faisceau du phare
    if (map.beacons && darkK > 0.2) for (const b of map.beacons) this.beam(ctx, glow, b.x - cx, b.y - cy, t, darkK);

    // ── Météo ──────────────────────────────────────────────────────
    weather?.draw(ctx, glow, W, H, cx, cy, light.night, dt);

    // préparation des morceaux voisins (dans un budget de temps)
    if (map.paintChunk && performance.now() - t0 < 8) this.prefetch(map, cx, cy, W, H);
  }

  ambientFor(map, light) {
    if (map.dark) return [10, 9, 18];
    if (map.kind === 'cave') return [178, 168, 176];
    if (map.kind === 'interior' || map.kind === 'grid') return map.ambient || [255, 252, 246];
    return light.ambient;
  }

  frameOf(s, t) {
    if (!s.frames) return s.c;
    return s.frames[Math.floor(t * s.fps + s.phase) % s.frames.length];
  }

  /** Personnage : monture de surf, sprite, herbes hautes devant les jambes. */
  drawActor(ctx, map, a, X, Y, grass) {
    const fi = a.frameInfo();
    X = Math.round(X); Y = Math.round(Y);
    if (a.mode === 'surf') {
      const m = a.mountSprite();
      if (m) ctx.drawImage(m, X - 16, Y - 10 + Math.round(Math.sin(a.animT * 4)));
      Y -= 6;
    }
    if (fi.sprite) {
      const s = fi.sprite;
      ctx.drawImage(s.canvas, X - s.ax, Y + 7 - s.ay + (fi.dy || 0));
      if (s.em && this._glow) { this._glow.globalAlpha = 0.75; this._glow.drawImage(s.em, X - s.ax, Y + 7 - s.ay + (fi.dy || 0)); this._glow.globalAlpha = 1; }
    } else {
      ctx.drawImage(fi.sheet, fi.sx, fi.sy, fi.w, fi.h, X - 8, Y + 8 - 24 + (fi.dy || 0), fi.w, fi.h);
    }
    if (grass && a.mode !== 'surf' && map.grassTiles) {
      const [c, r] = a.tile(map);
      if (map.flags.has(c, r, F.TALL)) {
        const gx = c * 16 - this.cam.x, gy = r * 16 - this.cam.y;
        ctx.drawImage(map.grassTiles[(c + r) % 2].front, gx, gy);
      }
    }
  }

  visibleChunks(map, cx, cy, W, H) {
    if (!map.paintChunk) return map.floor ? [map.floor] : [];
    const S = CHUNK * 16;
    const out = [];
    for (let j = Math.floor(cy / S); j <= Math.floor((cy + H) / S); j++) for (let i = Math.floor(cx / S); i <= Math.floor((cx + W) / S); i++) {
      if (i < 0 || j < 0) continue;
      const ch = map.paintChunk(i, j);
      if (ch) out.push(ch);
    }
    return out;
  }

  prefetch(map, cx, cy, W, H) {
    const S = CHUNK * 16;
    const i0 = Math.floor(cx / S) - 1, i1 = Math.floor((cx + W) / S) + 1, j0 = Math.floor(cy / S) - 1, j1 = Math.floor((cy + H) / S) + 1;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (i < 0 || j < 0 || map.chunks.has(`${i},${j}`)) continue;
      map.paintChunk(i, j);
      return;
    }
  }

  /** Préchauffe le sol autour d'un point (pendant les fondus). */
  warm(map, focus, rings = 1) {
    if (!map.paintChunk) return;
    const { W, H } = this.engine;
    const S = CHUNK * 16;
    const X = map.px(focus.x), Y = map.pz(focus.z);
    for (let j = Math.floor((Y - H / 2) / S) - rings; j <= Math.floor((Y + H / 2) / S) + rings; j++) for (let i = Math.floor((X - W / 2) / S) - rings; i <= Math.floor((X + W / 2) / S) + rings; i++) if (i >= 0 && j >= 0) map.paintChunk(i, j);
  }

  beam(ctx, glow, X, Y, t, k) {
    const a = t * 0.8;
    for (const target of [ctx, glow]) {
      target.save();
      target.globalCompositeOperation = 'lighter';
      target.globalAlpha = 0.18 * k * (target === glow ? 1.5 : 1);
      target.fillStyle = '#fff4c0';
      target.beginPath();
      target.moveTo(X, Y);
      target.lineTo(X + Math.cos(a - 0.12) * 220, Y + Math.sin(a - 0.12) * 110);
      target.lineTo(X + Math.cos(a + 0.12) * 220, Y + Math.sin(a + 0.12) * 110);
      target.closePath();
      target.fill();
      target.restore();
    }
  }
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

const gradCache = new Map();
function radial(ctx, x, y, r, color, alpha) {
  if (alpha <= 0.01 || r <= 1) return;
  const key = `${color}`;
  let tex = gradCache.get(key);
  if (!tex) {
    // disque de lumière à paliers tramés (rendu pixel)
    const S = 64;
    tex = canvas(S, S);
    const x2 = ctx2d(tex);
    const img = x2.createImageData(S, S);
    const n = parseInt(color.slice(1), 16);
    const cr = (n >> 16) & 255, cg = (n >> 8) & 255, cb = n & 255;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const d = Math.hypot(i + 0.5 - S / 2, j + 0.5 - S / 2) / (S / 2);
      if (d >= 1) continue;
      let v = Math.pow(1 - d, 1.4);
      v = Math.round(v * 5 + (bayer(i, j) - 0.5) * 0.9) / 5;
      const k = (j * S + i) * 4;
      img.data[k] = cr; img.data[k + 1] = cg; img.data[k + 2] = cb; img.data[k + 3] = Math.max(0, Math.min(255, v * 255));
    }
    x2.putImageData(img, 0, 0);
    gradCache.set(key, tex);
  }
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(tex, Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
  ctx.globalAlpha = prev;
}

/** Bruit de valeur périodique (période P) pour les textures raccordables. */
function tileNoise(x, y, P, seed) {
  const h = (i, j) => { const a = ((i % P) + P) % P, b = ((j % P) + P) % P; let v = (a * 374761393 + b * 668265263 + seed * 982451653) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967295; };
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export { radial, valueNoise };
