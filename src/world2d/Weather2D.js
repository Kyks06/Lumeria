/**
 * MÉTÉO EN PIXEL ART : pluie (traits et éclaboussures), neige, tempête de sable, cendres et braises,
 * feuilles mortes, spores lumineuses, lucioles (la nuit). Particules accrochées au monde
 * (elles défilent avec la caméra) dessinées au pixel près ; les plus lumineuses nourrissent le halo.
 */
const KINDS = {
  rain: { n: 150, tint: [0.82, 0.86, 0.95] },
  snow: { n: 110 },
  sand: { n: 120, tint: [1.0, 0.94, 0.8] },
  ash: { n: 80, tint: [0.92, 0.86, 0.84] },
  leaves: { n: 14 },
  spores: { n: 26 },
  fireflies: { n: 22, night: true },
  petals: { n: 18 },
};

const rnd = (a, b) => a + Math.random() * (b - a);

export class Weather2D {
  constructor() {
    this.systems = [];
    this.parts = [];
    this.lastCam = null;
    this.t = 0;
  }

  set(list = []) {
    const types = (Array.isArray(list) ? list : [list]).filter((t) => KINDS[t]);
    const same = types.length === this.systems.length && types.every((t, i) => this.systems[i].type === t);
    if (same) return;
    this.systems = types.map((type) => ({ type }));
    this.parts = [];
    this.spawned = false;
  }

  has(type) { return this.systems.some((s) => s.type === type); }

  /** Teinte globale (pluie, sable…). */
  tint() {
    let t = [1, 1, 1];
    for (const s of this.systems) { const k = KINDS[s.type].tint; if (k) t = [t[0] * k[0], t[1] * k[1], t[2] * k[2]]; }
    return t;
  }

  spawn(type, W, H, init) {
    const p = { type, x: rnd(0, W), y: init ? rnd(0, H) : -4, life: 0, ph: Math.random() * 6.28 };
    switch (type) {
      case 'rain': p.vx = -40; p.vy = rnd(230, 300); p.len = Math.random() < 0.3 ? 5 : 3; p.ground = rnd(H * 0.1, H); break;
      case 'snow': p.vx = rnd(-8, 8); p.vy = rnd(14, 30); p.s = Math.random() < 0.25 ? 2 : 1; break;
      case 'sand': p.x = init ? rnd(0, W) : W + 4; p.y = rnd(0, H); p.vx = rnd(-220, -140); p.vy = rnd(-6, 10); p.len = Math.random() < 0.4 ? 4 : 2; break;
      case 'ash': p.vx = rnd(-6, 6); p.vy = rnd(8, 18); p.ember = Math.random() < 0.25; break;
      case 'leaves': p.vx = rnd(8, 20); p.vy = rnd(10, 20); p.c = ['#6ab040', '#e8a040', '#c86a2a', '#9ac85a'][Math.floor(Math.random() * 4)]; break;
      case 'petals': p.vx = rnd(10, 22); p.vy = rnd(8, 16); p.c = ['#ffb8d8', '#ff9ac8', '#ffe0f0'][Math.floor(Math.random() * 3)]; break;
      case 'spores': p.x = rnd(0, W); p.y = rnd(0, H); p.vx = rnd(-4, 4); p.vy = rnd(-6, -2); p.c = Math.random() < 0.5 ? '#c8ff9a' : '#d8b0ff'; p.max = rnd(4, 8); break;
      case 'fireflies': p.x = rnd(0, W); p.y = rnd(0, H); p.vx = 0; p.vy = 0; p.max = rnd(4, 9); break;
      default: break;
    }
    return p;
  }

  update(dt) { this.t += dt; }

  /**
   * Dessin (écran W × H). camX, camY : position de la caméra (pour accrocher les particules au monde).
   * night : 0..1 ; glow : contexte du halo.
   */
  draw(ctx, glow, W, H, camX, camY, night = 0, dt = 1 / 60) {
    if (!this.systems.length) return;
    const dx = this.lastCam ? camX - this.lastCam[0] : 0, dy = this.lastCam ? camY - this.lastCam[1] : 0;
    this.lastCam = [camX, camY];
    for (const s of this.systems) {
      const K = KINDS[s.type];
      const count = this.parts.filter((p) => p.type === s.type).length;
      const want = K.night ? Math.round(K.n * Math.max(0, (night - 0.35) / 0.65)) : K.n;
      for (let i = count; i < want; i++) this.parts.push(this.spawn(s.type, W, H, !this.spawned || K.night || s.type === 'spores'));
    }
    this.spawned = true;
    const T = this.t;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      p.x -= dx; p.y -= dy;
      let dead = false;
      switch (p.type) {
        case 'rain': {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y >= p.ground) {
            ctx.fillStyle = 'rgba(200,220,255,0.7)';
            ctx.fillRect(Math.round(p.x) - 1, Math.round(p.ground), 1, 1); ctx.fillRect(Math.round(p.x) + 1, Math.round(p.ground), 1, 1);
            dead = true; break;
          }
          ctx.fillStyle = 'rgba(190,210,250,0.75)';
          for (let k = 0; k < p.len; k++) ctx.fillRect(Math.round(p.x + (k * 40) / 280), Math.round(p.y - k), 1, 1);
          break;
        }
        case 'snow': {
          p.x += (p.vx + Math.sin(T * 1.3 + p.ph) * 10) * dt; p.y += p.vy * dt;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
          if (p.y > H + 4) dead = true;
          break;
        }
        case 'sand': {
          p.x += p.vx * dt; p.y += (p.vy + Math.sin(T * 3 + p.ph) * 12) * dt;
          ctx.fillStyle = 'rgba(232,206,150,0.75)';
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.len, 1);
          if (p.x < -8) dead = true;
          break;
        }
        case 'ash': {
          p.x += (p.vx + Math.sin(T + p.ph) * 6) * dt; p.y += p.vy * dt;
          if (p.ember) {
            const a = 0.6 + 0.4 * Math.sin(T * 6 + p.ph);
            ctx.fillStyle = `rgba(255,150,60,${a})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            glow.fillStyle = `rgba(255,120,40,${a})`; glow.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
          } else { ctx.fillStyle = 'rgba(120,112,110,0.8)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1); }
          if (p.y > H + 4) dead = true;
          break;
        }
        case 'leaves': case 'petals': {
          p.x += (p.vx + Math.sin(T * 2 + p.ph) * 14) * dt; p.y += p.vy * dt;
          ctx.fillStyle = p.c;
          const f = Math.sin(T * 5 + p.ph) > 0;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), f ? 2 : 1, 1);
          if (f) ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 1, 1, 1);
          if (p.y > H + 4 || p.x > W + 8) dead = true;
          break;
        }
        case 'spores': case 'fireflies': {
          const ff = p.type === 'fireflies';
          p.vx += (Math.random() - 0.5) * (ff ? 60 : 10) * dt; p.vy += (Math.random() - 0.5) * (ff ? 60 : 10) * dt;
          p.vx *= 0.98; p.vy *= 0.98;
          p.x += p.vx * dt; p.y += (p.vy + (ff ? 0 : -2)) * dt;
          const fade = Math.min(1, p.life / 1, (p.max - p.life) / 1);
          const a = Math.max(0, fade) * (ff ? 0.55 + 0.45 * Math.sin(T * 4 + p.ph) : 0.8);
          const col = ff ? '#f4ff9a' : p.c;
          ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
          glow.globalAlpha = a; glow.fillStyle = ff ? '#d8ff60' : col; glow.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
          ctx.globalAlpha = 1; glow.globalAlpha = 1;
          if (p.life > p.max) dead = true;
          break;
        }
        default: dead = true;
      }
      // reboucle sur les bords (déplacement de caméra)
      if (!dead && (p.x < -40 || p.x > W + 40 || p.y < -60 || p.y > H + 60)) {
        if (p.type === 'spores' || p.type === 'fireflies') { p.x = (p.x + W * 2) % W; p.y = (p.y + H * 2) % H; } else dead = true;
      }
      if (dead) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); }
    }
  }
}
