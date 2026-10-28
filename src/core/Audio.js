/**
 * EFFETS SONORES synthétisés en direct (WebAudio) : aucun fichier audio requis.
 * Le contexte audio démarre au premier geste de l'utilisateur (règle des navigateurs).
 * Le même contexte est partagé avec la musique (core/Music.js).
 */
export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.8;
    this.lastBlip = 0;
    this.last = new Map();
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = 1;
      this.out.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32 * this.volume;
      this.master.connect(this.out);
      this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.onUnlock?.(this.ctx, this.out);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(v) { this.enabled = v; }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = 0.32 * v; }

  tone({ freq = 440, to = null, type = 'sine', dur = 0.12, vol = 0.25, attack = 0.005, delay = 0 }) {
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, freq = 1200, to = null, q = 0.8, kind = 'lowpass', delay = 0 }) {
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = c.createBiquadFilter();
    f.type = kind;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  arp(notes, { step = 0.07, type = 'triangle', dur = 0.16, vol = 0.18 } = {}) {
    notes.forEach((n, i) => this.tone({ freq: n, type, dur, vol, delay: i * step }));
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (name !== 'blip' && now - (this.last.get(name) || 0) < 40) return;
    this.last.set(name, now);
    switch (name) {
      case 'blip':
        if (now - this.lastBlip < 45) return;
        this.lastBlip = now;
        this.tone({ freq: 760 + Math.random() * 80, type: 'square', dur: 0.025, vol: 0.022 });
        break;
      case 'move': this.tone({ freq: 620, type: 'triangle', dur: 0.05, vol: 0.08 }); break;
      case 'select': this.tone({ freq: 880, to: 1320, type: 'triangle', dur: 0.09, vol: 0.12 }); break;
      case 'back': this.tone({ freq: 520, to: 340, type: 'triangle', dur: 0.09, vol: 0.1 }); break;
      case 'deny': this.tone({ freq: 180, type: 'square', dur: 0.12, vol: 0.06 }); break;
      case 'hit': this.noise({ dur: 0.16, vol: 0.35, freq: 1800, to: 300 }); this.tone({ freq: 160, to: 60, type: 'sine', dur: 0.18, vol: 0.3 }); break;
      case 'super': this.noise({ dur: 0.28, vol: 0.45, freq: 3200, to: 200 }); this.tone({ freq: 220, to: 50, type: 'sawtooth', dur: 0.3, vol: 0.18 }); break;
      case 'weak': this.noise({ dur: 0.12, vol: 0.2, freq: 700, to: 200 }); break;
      case 'miss': this.noise({ dur: 0.25, vol: 0.12, freq: 2400, to: 600, kind: 'bandpass' }); break;
      case 'faint': this.tone({ freq: 420, to: 70, type: 'sawtooth', dur: 0.7, vol: 0.12 }); break;
      case 'throw': this.noise({ dur: 0.45, vol: 0.18, freq: 400, to: 2600, kind: 'bandpass', q: 2 }); break;
      case 'open': this.tone({ freq: 660, to: 1760, type: 'sine', dur: 0.25, vol: 0.14 }); this.noise({ dur: 0.3, vol: 0.1, freq: 5000, kind: 'highpass' }); break;
      case 'shake': this.tone({ freq: 320, type: 'triangle', dur: 0.06, vol: 0.2 }); this.tone({ freq: 240, type: 'triangle', dur: 0.06, vol: 0.18, delay: 0.12 }); break;
      case 'catch': this.arp([523, 659, 784, 1047], { step: 0.09, vol: 0.16 }); break;
      case 'break': this.noise({ dur: 0.4, vol: 0.3, freq: 6000, to: 800, kind: 'highpass' }); this.tone({ freq: 900, to: 300, dur: 0.2, vol: 0.1 }); break;
      case 'levelup': this.arp([523, 659, 784, 1047, 1319], { step: 0.06, type: 'square', vol: 0.07, dur: 0.12 }); break;
      case 'xp': this.tone({ freq: 500, to: 1400, type: 'triangle', dur: 0.5, vol: 0.05 }); break;
      case 'heal': this.arp([784, 988, 1175, 1568, 1976], { step: 0.11, type: 'sine', vol: 0.14, dur: 0.3 }); break;
      case 'evolve': this.tone({ freq: 220, to: 1760, type: 'sawtooth', dur: 2.2, vol: 0.06 }); break;
      case 'flash': this.noise({ dur: 0.8, vol: 0.25, freq: 8000, to: 400, kind: 'highpass' }); this.arp([1047, 1319, 1568, 2093], { step: 0.08, vol: 0.12 }); break;
      case 'encounter': case 'battle_start': this.arp([392, 523, 392, 659, 784], { step: 0.07, type: 'square', vol: 0.07, dur: 0.1 }); this.noise({ dur: 0.6, vol: 0.12, freq: 300, to: 4000, kind: 'bandpass', q: 1 }); break;
      case 'save': this.arp([659, 988], { step: 0.1, type: 'sine', vol: 0.12, dur: 0.25 }); break;
      case 'buy': this.arp([988, 1319], { step: 0.07, type: 'triangle', vol: 0.12, dur: 0.15 }); break;
      case 'item': this.arp([784, 988, 1175, 1568], { step: 0.08, type: 'triangle', vol: 0.13, dur: 0.22 }); break;
      case 'keyitem': this.arp([523, 659, 784, 1047, 784, 1047, 1319], { step: 0.09, type: 'square', vol: 0.06, dur: 0.2 }); break;
      case 'fanfare_short': this.arp([523, 523, 523, 659, 784, 659, 784, 1047], { step: 0.1, type: 'square', vol: 0.06, dur: 0.18 }); break;
      case 'learn': this.arp([659, 784, 988, 1319], { step: 0.07, type: 'triangle', vol: 0.12, dur: 0.18 }); break;
      case 'challenge': this.arp([784, 1047, 1319, 1568, 2093], { step: 0.07, type: 'sine', vol: 0.12, dur: 0.25 }); break;
      case 'buff': this.tone({ freq: 300, to: 1200, type: 'triangle', dur: 0.45, vol: 0.1 }); break;
      case 'debuff': this.tone({ freq: 900, to: 220, type: 'triangle', dur: 0.45, vol: 0.1 }); break;
      case 'status': this.tone({ freq: 400, to: 250, type: 'square', dur: 0.25, vol: 0.06 }); this.tone({ freq: 300, to: 180, type: 'square', dur: 0.25, vol: 0.05, delay: 0.12 }); break;
      case 'exclaim': this.tone({ freq: 1400, to: 1900, type: 'square', dur: 0.08, vol: 0.08 }); this.tone({ freq: 1900, type: 'square', dur: 0.1, vol: 0.07, delay: 0.09 }); break;
      case 'door': this.noise({ dur: 0.25, vol: 0.15, freq: 900, to: 300 }); this.tone({ freq: 220, to: 160, type: 'triangle', dur: 0.15, vol: 0.08 }); break;
      case 'step': this.noise({ dur: 0.08, vol: 0.06, freq: 800 }); break;
      case 'bump': this.tone({ freq: 110, to: 70, type: 'square', dur: 0.07, vol: 0.07 }); break;
      case 'pc': this.arp([1319, 1568, 1976], { step: 0.05, type: 'square', vol: 0.05, dur: 0.08 }); break;
      case 'push': this.noise({ dur: 0.6, vol: 0.3, freq: 300, to: 120 }); break;
      case 'thud': this.tone({ freq: 90, to: 40, type: 'sine', dur: 0.4, vol: 0.4 }); this.noise({ dur: 0.3, vol: 0.25, freq: 400, to: 100 }); break;
      case 'switch': this.tone({ freq: 600, type: 'square', dur: 0.05, vol: 0.08 }); this.tone({ freq: 900, type: 'square', dur: 0.08, vol: 0.08, delay: 0.06 }); break;
      case 'cut': this.noise({ dur: 0.2, vol: 0.3, freq: 5000, to: 1500, kind: 'highpass' }); break;
      case 'smash': this.noise({ dur: 0.45, vol: 0.4, freq: 1200, to: 120 }); this.tone({ freq: 120, to: 40, type: 'square', dur: 0.3, vol: 0.12 }); break;
      case 'splash': this.noise({ dur: 0.5, vol: 0.22, freq: 1500, to: 400, kind: 'bandpass', q: 1 }); break;
      case 'land': this.noise({ dur: 0.2, vol: 0.12, freq: 600 }); break;
      case 'cast': this.noise({ dur: 0.35, vol: 0.12, freq: 2000, to: 600, kind: 'bandpass', q: 3 }); break;
      case 'bikeon': this.arp([440, 660], { step: 0.06, type: 'triangle', vol: 0.1, dur: 0.1 }); this.tone({ freq: 2200, type: 'sine', dur: 0.08, vol: 0.05, delay: 0.14 }); break;
      case 'bikeoff': this.arp([660, 440], { step: 0.06, type: 'triangle', vol: 0.1, dur: 0.1 }); break;
      case 'alarm': for (let i = 0; i < 4; i++) this.tone({ freq: i % 2 ? 700 : 950, type: 'square', dur: 0.22, vol: 0.07, delay: i * 0.24 }); break;
      case 'powerdown': this.tone({ freq: 800, to: 40, type: 'sawtooth', dur: 1.2, vol: 0.12 }); break;
      case 'powerup': this.tone({ freq: 60, to: 900, type: 'sawtooth', dur: 1.1, vol: 0.1 }); break;
      case 'quake': this.noise({ dur: 1.4, vol: 0.45, freq: 200, to: 60 }); this.tone({ freq: 50, to: 30, type: 'sine', dur: 1.2, vol: 0.4 }); break;
      case 'roar': this.noise({ dur: 1.0, vol: 0.4, freq: 600, to: 200, kind: 'bandpass', q: 1.5 }); this.tone({ freq: 140, to: 70, type: 'sawtooth', dur: 1.0, vol: 0.18 }); break;
      case 'horn': this.tone({ freq: 196, type: 'sawtooth', dur: 1.1, vol: 0.1, attack: 0.1 }); this.tone({ freq: 247, type: 'sawtooth', dur: 1.1, vol: 0.08, attack: 0.1 }); break;
      case 'climb': for (let i = 0; i < 5; i++) this.noise({ dur: 0.1, vol: 0.12, freq: 900, delay: i * 0.35 }); break;
      case 'fly': this.noise({ dur: 1.0, vol: 0.2, freq: 300, to: 3000, kind: 'bandpass', q: 1 }); break;
      case 'shiny': this.arp([1568, 2093, 2637, 3136], { step: 0.05, type: 'sine', vol: 0.1, dur: 0.3 }); break;
      case 'run': this.noise({ dur: 0.4, vol: 0.12, freq: 600, to: 2000, kind: 'bandpass' }); break;
      // Cris par type
      case 'feu': this.noise({ dur: 0.6, vol: 0.28, freq: 900, to: 300, q: 0.5 }); break;
      case 'eau': this.noise({ dur: 0.55, vol: 0.22, freq: 600, to: 2400, kind: 'bandpass', q: 3 }); break;
      case 'plante': case 'insecte': this.noise({ dur: 0.5, vol: 0.18, freq: 3000, to: 5000, kind: 'bandpass', q: 1.5 }); break;
      case 'foudre': this.noise({ dur: 0.35, vol: 0.38, freq: 7000, to: 900, kind: 'highpass' }); this.tone({ freq: 90, to: 40, type: 'sawtooth', dur: 0.4, vol: 0.2 }); break;
      case 'roche': case 'metal': this.noise({ dur: 0.5, vol: 0.35, freq: name === 'metal' ? 2600 : 500, to: 120 }); if (name === 'metal') this.tone({ freq: 1800, to: 1200, type: 'triangle', dur: 0.3, vol: 0.06 }); break;
      case 'glace': this.arp([2093, 2637, 3136], { step: 0.04, type: 'sine', vol: 0.06, dur: 0.2 }); this.noise({ dur: 0.3, vol: 0.12, freq: 6000, kind: 'highpass' }); break;
      case 'vent': this.noise({ dur: 0.7, vol: 0.2, freq: 400, to: 1800, kind: 'bandpass', q: 0.7 }); break;
      case 'toxine': this.tone({ freq: 300, to: 180, type: 'sine', dur: 0.3, vol: 0.12 }); this.tone({ freq: 360, to: 200, type: 'sine', dur: 0.3, vol: 0.1, delay: 0.1 }); break;
      case 'sol': this.noise({ dur: 0.45, vol: 0.38, freq: 300, to: 80 }); this.tone({ freq: 90, to: 40, type: 'sine', dur: 0.35, vol: 0.3 }); break;
      case 'spectre': this.tone({ freq: 600, to: 900, type: 'sine', dur: 0.7, vol: 0.07 }); this.tone({ freq: 606, to: 455, type: 'sine', dur: 0.7, vol: 0.07 }); break;
      case 'dragon': this.tone({ freq: 160, to: 90, type: 'sawtooth', dur: 0.6, vol: 0.12 }); this.noise({ dur: 0.5, vol: 0.25, freq: 700, to: 200, q: 0.6 }); break;
      case 'ombre': this.tone({ freq: 220, to: 110, type: 'sawtooth', dur: 0.6, vol: 0.08 }); this.noise({ dur: 0.6, vol: 0.1, freq: 400, to: 150 }); break;
      case 'lumiere': this.arp([1047, 1568, 2093], { step: 0.05, type: 'sine', vol: 0.09, dur: 0.4 }); break;
      case 'astral': this.tone({ freq: 880, to: 220, type: 'triangle', dur: 0.8, vol: 0.08 }); this.arp([1760, 2637], { step: 0.1, type: 'sine', vol: 0.05, dur: 0.3 }); break;
      case 'normal': this.tone({ freq: 500, to: 700, type: 'triangle', dur: 0.2, vol: 0.12 }); break;
      default: break;
    }
  }
}
