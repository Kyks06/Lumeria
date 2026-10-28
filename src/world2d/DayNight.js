import { GAME } from '../config/game.js';

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * CYCLE JOUR / NUIT (remplace le ciel 3D) : heure de jeu, teinte ambiante (aube dorée, crépuscule
 * orangé, nuit bleutée), direction et longueur des ombres, intensité des lampes et fenêtres.
 * Même interface que l'ancien SkySystem.
 */
export class DayNight {
  constructor() {
    this.hour = GAME.startHour;
    this.mode = 'outdoor';
    this.biome = { lanternOn: false };
    this.day = 1;
    this.night = 0;
    this.lampLights = [];
    this.state = this.compute();
  }

  configure(mode, biome = {}) {
    this.mode = mode;
    this.biome = { lanternOn: false, ...biome };
  }

  addLampLight() {}
  setShadowQuality() {}
  setHour(h) { this.hour = ((h % 24) + 24) % 24; this.state = this.compute(); }
  get isNight() { return this.mode === 'outdoor' ? this.night > 0.5 : this.hour < 6 || this.hour >= 20; }
  timeOfDay() { return this.hour >= 6 && this.hour < 20 ? 'day' : 'night'; }

  clockString() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  update(dt, focus, camera, timeScale = 1) {
    this.hour = (this.hour + dt * timeScale * 24 / GAME.dayLengthSeconds) % 24;
    this.state = this.compute();
  }

  /** Éclairage courant. ambient : couleur multipliée (0–255) ; night 0..1 ; sun : direction des ombres. */
  compute() {
    const h = this.hour;
    const angle = ((h - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(angle);
    const day = smooth(-0.12, 0.25, elev);
    this.day = day;
    this.night = 1 - day;
    const warm = smooth(0.5, 0.05, elev) * smooth(-0.22, 0.02, elev);
    const NIGHT = [78, 92, 150], DAY = [255, 255, 255], DUSK = h < 12 ? [255, 214, 176] : [255, 172, 128];
    let amb = mixC(NIGHT, DAY, day);
    amb = mixC(amb, DUSK, warm * 0.85);
    // ombres : du matin (vers l'ouest) au soir (vers l'est), plus longues quand le soleil est bas
    const t = Math.max(0, Math.min(1, (h - 6) / 14));
    const len = 0.35 + (1 - Math.max(0, elev)) * 0.55;
    const sun = { kx: (t - 0.5) * 1.6 * len, ky: -(0.3 + (1 - Math.max(0, elev)) * 0.28) };
    return {
      day, night: this.night, warm, ambient: amb,
      shadowAlpha: 0.3 * smooth(0.02, 0.3, elev),
      sun,
      lamps: smooth(0.3, 0.75, this.night),
      windows: smooth(0.35, 0.8, this.night),
    };
  }
}
