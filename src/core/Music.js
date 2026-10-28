import { mulberry32 } from './utils.js';

/**
 * MUSIQUE PROCÉDURALE (WebAudio) : chaque thème est composé à partir d'une graine
 * (tempo, tonalité, mode, progression d'accords, motif mélodique en phrases A-A'-A-cadence),
 * puis joué par un petit séquenceur : mélodie, basse, nappe, arpèges et batterie synthétique.
 * Aucun fichier audio : tout est généré dans le navigateur.
 */
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  mixo: [0, 2, 4, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], harm: [0, 2, 3, 5, 7, 8, 11],
};
const ROOT = { C: 48, D: 50, E: 52, F: 53, G: 55, A: 57, B: 59, Bb: 58, Eb: 51, Ab: 56, Fs: 54, Cs: 49 };

/** Thèmes : bpm, tonalité, mode, progression (degrés), caractère, timbres, batterie (0-3), nombre de mesures. */
export const THEMES = {
  title:      { bpm: 86, root: 'D', mode: 'major', prog: [0, 5, 3, 4], feel: 'epic', lead: 'triangle', drums: 1, bars: 8, pad: true },
  intro:      { bpm: 70, root: 'F', mode: 'lydian', prog: [0, 4, 5, 3], feel: 'calm', lead: 'sine', drums: 0, bars: 8, pad: true },
  town1:      { bpm: 100, root: 'G', mode: 'major', prog: [0, 3, 4, 0], feel: 'calm', lead: 'triangle', drums: 1, bars: 8 },
  town2:      { bpm: 92, root: 'C', mode: 'dorian', prog: [0, 6, 3, 4], feel: 'calm', lead: 'sine', drums: 1, bars: 8, pad: true },
  town3:      { bpm: 112, root: 'A', mode: 'mixo', prog: [0, 6, 3, 0], feel: 'bouncy', lead: 'square', drums: 2, bars: 8 },
  town4:      { bpm: 96, root: 'E', mode: 'minor', prog: [0, 5, 6, 4], feel: 'calm', lead: 'triangle', drums: 1, bars: 8 },
  town5:      { bpm: 104, root: 'D', mode: 'harm', prog: [0, 3, 4, 0], feel: 'bouncy', lead: 'sawtooth', drums: 2, bars: 8 },
  town6:      { bpm: 78, root: 'B', mode: 'minor', prog: [0, 3, 5, 4], feel: 'mysterious', lead: 'sine', drums: 1, bars: 8, pad: true },
  town7:      { bpm: 88, root: 'F', mode: 'major', prog: [0, 4, 5, 3], feel: 'calm', lead: 'sine', drums: 0, bars: 8, pad: true, bells: true },
  town8:      { bpm: 108, root: 'E', mode: 'phryg', prog: [0, 1, 0, 6], feel: 'bouncy', lead: 'sawtooth', drums: 2, bars: 8 },
  town9:      { bpm: 96, root: 'Eb', mode: 'lydian', prog: [0, 1, 4, 3], feel: 'epic', lead: 'triangle', drums: 1, bars: 8, pad: true, bells: true },
  ligue:      { bpm: 92, root: 'C', mode: 'major', prog: [0, 3, 4, 5], feel: 'epic', lead: 'square', drums: 2, bars: 8, pad: true },
  ile:        { bpm: 98, root: 'A', mode: 'major', prog: [0, 4, 5, 3], feel: 'calm', lead: 'triangle', drums: 1, bars: 8, pad: true },
  route1:     { bpm: 128, root: 'D', mode: 'major', prog: [0, 4, 5, 3], feel: 'adventure', lead: 'square', drums: 2, bars: 8 },
  route2:     { bpm: 118, root: 'E', mode: 'dorian', prog: [0, 3, 6, 4], feel: 'adventure', lead: 'triangle', drums: 2, bars: 8 },
  route3:     { bpm: 124, root: 'F', mode: 'mixo', prog: [0, 6, 3, 4], feel: 'adventure', lead: 'square', drums: 2, bars: 8 },
  route4:     { bpm: 132, root: 'G', mode: 'major', prog: [0, 5, 3, 4], feel: 'adventure', lead: 'sawtooth', drums: 2, bars: 8 },
  route5:     { bpm: 120, root: 'D', mode: 'harm', prog: [0, 5, 3, 4], feel: 'adventure', lead: 'sawtooth', drums: 2, bars: 8 },
  route6:     { bpm: 110, root: 'C', mode: 'minor', prog: [0, 5, 2, 6], feel: 'mysterious', lead: 'triangle', drums: 1, bars: 8, pad: true },
  route7:     { bpm: 136, root: 'A', mode: 'minor', prog: [0, 6, 5, 4], feel: 'adventure', lead: 'sawtooth', drums: 3, bars: 8 },
  route8:     { bpm: 116, root: 'Bb', mode: 'lydian', prog: [0, 1, 4, 5], feel: 'epic', lead: 'triangle', drums: 2, bars: 8, pad: true },
  route9:     { bpm: 130, root: 'E', mode: 'major', prog: [0, 5, 3, 4], feel: 'epic', lead: 'square', drums: 3, bars: 8, pad: true },
  bike:       { bpm: 148, root: 'G', mode: 'major', prog: [0, 3, 4, 3], feel: 'bouncy', lead: 'square', drums: 3, bars: 8 },
  surf:       { bpm: 104, root: 'Bb', mode: 'major', prog: [0, 5, 3, 4], feel: 'calm', lead: 'triangle', drums: 1, bars: 8, pad: true },
  cave:       { bpm: 84, root: 'D', mode: 'minor', prog: [0, 6, 0, 5], feel: 'mysterious', lead: 'sine', drums: 1, bars: 8, pad: true },
  cave2:      { bpm: 76, root: 'Fs', mode: 'phryg', prog: [0, 1, 0, 6], feel: 'mysterious', lead: 'sine', drums: 1, bars: 8, pad: true },
  house:      { bpm: 90, root: 'F', mode: 'major', prog: [0, 3, 1, 4], feel: 'calm', lead: 'sine', drums: 0, bars: 8, pad: true },
  lab:        { bpm: 102, root: 'C', mode: 'lydian', prog: [0, 1, 4, 0], feel: 'bouncy', lead: 'triangle', drums: 1, bars: 8 },
  center:     { bpm: 96, root: 'G', mode: 'major', prog: [0, 4, 5, 3], feel: 'calm', lead: 'sine', drums: 1, bars: 8, bells: true },
  gym:        { bpm: 132, root: 'C', mode: 'minor', prog: [0, 5, 6, 4], feel: 'tense', lead: 'square', drums: 2, bars: 8 },
  conseil:    { bpm: 140, root: 'B', mode: 'harm', prog: [0, 5, 4, 0], feel: 'tense', lead: 'sawtooth', drums: 3, bars: 8, pad: true },
  ordre:      { bpm: 128, root: 'Cs', mode: 'phryg', prog: [0, 1, 0, 6], feel: 'tense', lead: 'sawtooth', drums: 3, bars: 8 },
  tower:      { bpm: 144, root: 'A', mode: 'dorian', prog: [0, 6, 3, 4], feel: 'battle', lead: 'square', drums: 3, bars: 8 },
  wild:       { bpm: 152, root: 'E', mode: 'minor', prog: [0, 5, 6, 4], feel: 'battle', lead: 'square', drums: 3, bars: 4 },
  trainer:    { bpm: 158, root: 'G', mode: 'minor', prog: [0, 6, 5, 4], feel: 'battle', lead: 'sawtooth', drums: 3, bars: 8 },
  trainer_intro: { bpm: 150, root: 'G', mode: 'minor', prog: [0, 6], feel: 'tense', lead: 'square', drums: 2, bars: 2 },
  rival:      { bpm: 164, root: 'D', mode: 'dorian', prog: [0, 3, 6, 4], feel: 'battle', lead: 'sawtooth', drums: 3, bars: 8 },
  leader:     { bpm: 168, root: 'F', mode: 'harm', prog: [0, 5, 3, 4], feel: 'battle', lead: 'sawtooth', drums: 3, bars: 8, pad: true },
  champion:   { bpm: 172, root: 'Ab', mode: 'harm', prog: [0, 5, 6, 4], feel: 'battle', lead: 'sawtooth', drums: 3, bars: 8, pad: true },
  legend:     { bpm: 120, root: 'C', mode: 'phryg', prog: [0, 1, 6, 0], feel: 'epic', lead: 'sawtooth', drums: 3, bars: 8, pad: true },
  evolution:  { bpm: 100, root: 'Eb', mode: 'lydian', prog: [0, 1, 4, 5], feel: 'epic', lead: 'triangle', drums: 0, bars: 4, pad: true, bells: true },
  fanfare:    { bpm: 120, root: 'C', mode: 'major', prog: [0, 3, 4, 0], feel: 'fanfare', lead: 'square', drums: 2, bars: 2, once: true },
};

const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/** Compose un thème : renvoie la liste des notes par pas de double-croche. */
function compose(name, T) {
  const rnd = mulberry32(hash(name) + 7);
  const scale = SCALES[T.mode] || SCALES.major;
  const root = ROOT[T.root] ?? 50;
  const steps = T.bars * 16;
  const deg = (d, oct = 0) => root + scale[((d % 7) + 7) % 7] + 12 * (Math.floor(d / 7) + oct);
  const chordAt = (bar) => T.prog[bar % T.prog.length];
  const density = { calm: 0.32, mysterious: 0.26, adventure: 0.5, bouncy: 0.55, epic: 0.42, tense: 0.5, battle: 0.62, fanfare: 0.6 }[T.feel] || 0.45;
  // Motif de deux mesures, répété avec variations
  const motif = [];
  let d = 4 + Math.floor(rnd() * 3);
  for (let s = 0; s < 32; s++) {
    const strong = s % 4 === 0;
    const on = strong ? rnd() < 0.85 : rnd() < density * (s % 2 ? 0.6 : 1);
    if (!on) { motif.push(null); continue; }
    const c = chordAt(Math.floor(s / 16));
    if (strong) d = c + [0, 2, 4][Math.floor(rnd() * 3)] + 7;
    else d += [-2, -1, -1, 1, 1, 2][Math.floor(rnd() * 6)];
    d = Math.max(5, Math.min(16, d));
    const len = strong && rnd() < 0.5 ? 3 : rnd() < 0.3 ? 2 : 1;
    motif.push({ d, len });
  }
  const lead = [];
  for (let s = 0; s < steps; s++) {
    const bar = Math.floor(s / 16), within = s % 32;
    const phrase = Math.floor(bar / 2) % 4;
    let n = motif[within];
    if (n && phrase === 1) n = { ...n, d: n.d + (within >= 16 ? 2 : 0) };
    if (n && phrase === 3 && within >= 16) { n = within === 16 ? { d: chordAt(bar) + 7, len: 8 } : within > 24 ? null : n; }
    if (n && T.feel === 'fanfare') n = { ...n, len: Math.max(2, n.len) };
    lead.push(n ? { m: deg(n.d), len: n.len } : null);
  }
  const bass = [], pad = [], arp = [];
  for (let s = 0; s < steps; s++) {
    const bar = Math.floor(s / 16), c = chordAt(bar), b = s % 16;
    const battle = T.feel === 'battle' || T.feel === 'tense';
    if (battle ? b % 2 === 0 : b % 8 === 0 || (T.feel !== 'calm' && b % 8 === 6)) bass.push({ m: deg(c, -1) - (battle && b % 4 === 2 ? 0 : 0) + (battle && b % 8 === 6 ? 7 - 7 : 0), len: battle ? 2 : 6 });
    else bass.push(null);
    pad.push(b === 0 ? { ms: [deg(c), deg(c + 2), deg(c + 4)], len: 16 } : null);
    arp.push(T.feel !== 'mysterious' && T.feel !== 'calm' ? (b % 2 === 0 ? { m: deg(c + [0, 2, 4, 7][(b / 2) % 4], 1), len: 1 } : null) : (b % 4 === 0 ? { m: deg(c + [0, 4, 2, 4][(b / 4) % 4], 1), len: 2 } : null));
  }
  return { lead, bass, pad, arp, steps };
}

export class Music {
  constructor(audio, settings) {
    this.audio = audio;
    this.settings = settings;
    this.ctx = null;
    this.current = null;
    this.wanted = null;
    this.cache = new Map();
    this.bike = false;
    this.volume = settings.music ?? 0.5;
    audio.onUnlock = (ctx, out) => this.init(ctx, out);
  }

  unlock() { this.audio.unlock(); }

  init(ctx, out) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.bus.gain.value = this.volume * 0.5 * (this.settings.sound === false ? 0 : 1);
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.ratio.value = 3;
    this.bus.connect(this.comp).connect(out);
    // Réverbération légère (impulsion générée)
    const len = ctx.sampleRate * 1.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    this.rev = ctx.createConvolver();
    this.rev.buffer = ir;
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.22;
    this.rev.connect(this.revGain).connect(this.bus);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (this.wanted) { const w = this.wanted; this.wanted = null; this.play(w.name, w.opts); }
  }

  setVolume(v) {
    this.volume = v;
    if (this.bus) this.bus.gain.setTargetAtTime(v * 0.5 * (this.settings.sound === false ? 0 : 1), this.ctx.currentTime, 0.1);
  }

  setLayer(name, on) {
    if (name === 'bike') { this.bike = on; if (this.base) this.play(this.base); }
  }

  /** Joue un thème (fondu enchaîné). opts.once : joue une fois puis revient au thème précédent. */
  play(name, opts = {}) {
    if (!THEMES[name]) name = 'route1';
    if (!opts.once && !THEMES[name].once) this.base = name;
    let eff = name;
    if (this.bike && !opts.once && (name.startsWith('route') || name.startsWith('town'))) eff = 'bike';
    if (!this.ctx) { this.wanted = { name: eff, opts }; return; }
    if (this.current?.name === eff && !opts.restart) return;
    const T = THEMES[eff];
    if (!this.cache.has(eff)) this.cache.set(eff, compose(eff, T));
    const song = this.cache.get(eff);
    const now = this.ctx.currentTime;
    if (this.current) {
      const old = this.current;
      old.gain.gain.setTargetAtTime(0, now, 0.25);
      setTimeout(() => old.gain.disconnect(), 1500);
      old.stopped = true;
    }
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(1, now + 0.05, 0.3);
    gain.connect(this.bus);
    gain.connect(this.rev);
    this.current = { name: eff, T, song, gain, step: 0, next: now + 0.12, once: !!(opts.once || T.once), prev: opts.once || T.once ? this.base : null };
  }

  stop() {
    if (!this.current) return;
    this.current.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    this.current.stopped = true;
    this.current = null;
  }

  update() {
    const c = this.current;
    if (!c || !this.ctx || c.stopped) return;
    const spb = 60 / c.T.bpm / 4;
    while (c.next < this.ctx.currentTime + 0.2) {
      this.scheduleStep(c, c.step, c.next, spb);
      c.step++;
      c.next += spb;
      if (c.step >= c.song.steps) {
        c.step = 0;
        if (c.once) { const back = c.prev || 'route1'; this.current = null; c.gain.gain.setTargetAtTime(0, c.next, 0.3); this.play(back); return; }
      }
    }
  }

  voice(dest, freq, t, dur, { type = 'triangle', vol = 0.1, attack = 0.01, release = 0.12, filter = 2600, vibrato = 0, detune = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setTargetAtTime(vol * 0.7, t + attack, dur * 0.4);
    g.gain.setTargetAtTime(0.0001, t + dur, release / 3);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t + 0.15);
      lfo.stop(t + dur + release + 0.1);
    }
    o.connect(f).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + release + 0.1);
  }

  drum(dest, kind, t, vol) {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(dest);
      o.start(t); o.stop(t + 0.25);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = ctx.createGain();
    const d = kind === 'hat' ? 0.04 : 0.14;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + d + 0.02);
  }

  scheduleStep(c, s, t, spb) {
    const { song, T, gain } = c;
    const L = song.lead[s];
    const battle = T.feel === 'battle' || T.feel === 'tense';
    if (L) this.voice(gain, mtof(L.m), t, L.len * spb * 0.92, { type: T.lead, vol: T.lead === 'sawtooth' ? 0.045 : T.lead === 'square' ? 0.05 : 0.09, filter: T.lead === 'sine' ? 4000 : 2400, vibrato: L.len > 2 ? 4 : 0 });
    const B = song.bass[s];
    if (B) this.voice(gain, mtof(B.m), t, B.len * spb, { type: battle ? 'sawtooth' : 'triangle', vol: battle ? 0.06 : 0.1, filter: battle ? 900 : 700 });
    const P = song.pad[s];
    if (P && T.pad) for (const m of P.ms) this.voice(gain, mtof(m), t, P.len * spb, { type: 'sawtooth', vol: 0.014, attack: 0.4, release: 0.6, filter: 1200, detune: (m % 3) * 4 - 4 });
    const A = song.arp[s];
    if (A && (T.feel !== 'calm' || T.bells)) this.voice(gain, mtof(A.m), t, A.len * spb * 0.6, { type: T.bells ? 'sine' : 'square', vol: T.bells ? 0.03 : 0.018, filter: 3000, release: T.bells ? 0.6 : 0.08 });
    const dr = T.drums;
    if (dr > 0) {
      const b = s % 16;
      if (b % (dr >= 3 ? 4 : 8) === 0) this.drum(gain, 'kick', t, dr >= 2 ? 0.5 : 0.3);
      if (dr >= 2 && (b === 4 || b === 12)) this.drum(gain, 'snare', t, 0.18);
      if (dr >= 1 && b % 2 === 0) this.drum(gain, 'hat', t, dr >= 3 ? 0.06 : 0.035);
      if (dr >= 3 && b === 14) this.drum(gain, 'snare', t, 0.1);
    }
  }
}
