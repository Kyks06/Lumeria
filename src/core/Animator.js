import * as THREE from 'three';
import { CLIP_NAMES } from '../config/models.js';
import { tweens, lerp, Ease, clamp } from './utils.js';

/**
 * Deux animateurs partageant la même interface :
 *  - ClipAnimator : AnimationMixer sur les clips d'un .glb, avec fondus enchaînés.
 *  - ProceduralAnimator : poses calculées pour les formes de remplacement, avec mélange fluide.
 * play(name) renvoie { impact, done } (promesses) pour synchroniser les combats.
 */

const STATES = {
  rest:   { loop: true },
  idle:   { loop: true },
  walk:   { loop: true },
  run:    { loop: true },
  attack: { duration: 0.8, impact: 0.44 },
  hit:    { duration: 0.55, impact: 0.08 },
  faint:  { duration: 1.15, impact: 0.6, hold: true },
  happy:  { duration: 1.1, impact: 0.4 },
  cast:   { duration: 0.95, impact: 0.5 },
  ride:   { loop: true },
  surf:   { loop: true },
  fish:   { loop: true },
  climb:  { loop: true },
  sit:    { loop: true },
};

const POSES = {
  rest: () => ({}),
  idle: (t) => ({
    bodyY: Math.sin(t * 2.4) * 0.012,
    rootSy: 1 + Math.sin(t * 2.4) * 0.022,
    headRx: Math.sin(t * 1.25) * 0.06,
    headRy: Math.sin(t * 0.63) * 0.14,
    earRz: Math.sin(t * 3.1) * 0.07,
    tailRy: Math.sin(t * 2.6) * 0.35,
    tailRx: Math.sin(t * 1.3) * 0.1,
    armSwing: Math.sin(t * 2.4) * 0.07,
    wingFlap: Math.sin(t * 7) * 0.45,
    segWave: 0.035, segSpeed: 2.2,
    hover: Math.sin(t * 1.9) * 0.06,
  }),
  walk: (t) => ({
    legSwing: Math.sin(t * 9) * 0.65,
    armSwing: Math.sin(t * 9) * 0.55,
    bodyY: Math.abs(Math.sin(t * 9)) * 0.035,
    bodyRz: Math.sin(t * 9) * 0.035,
    headRx: Math.sin(t * 18) * 0.025,
    tailRy: Math.sin(t * 9) * 0.45,
    earRz: Math.sin(t * 9) * 0.06,
    wingFlap: Math.sin(t * 12) * 0.7,
    segWave: 0.08, segSpeed: 7,
    hover: Math.sin(t * 4) * 0.05,
  }),
  run: (t) => ({
    legSwing: Math.sin(t * 14) * 0.95,
    armSwing: Math.sin(t * 14) * 0.85,
    bodyY: Math.abs(Math.sin(t * 14)) * 0.07,
    bodyRx: 0.14,
    bodyRz: Math.sin(t * 14) * 0.04,
    headRx: -0.08,
    tailRy: Math.sin(t * 14) * 0.5,
    tailRx: -0.3,
    earRz: -0.25,
    wingFlap: Math.sin(t * 18) * 0.9,
    segWave: 0.11, segSpeed: 11,
    hover: Math.sin(t * 6) * 0.06,
  }),
  attack: (t, d) => {
    const u = clamp(t / d, 0, 1);
    let lunge, rx, head;
    if (u < 0.35) { const k = Ease.outCubic(u / 0.35); lunge = -0.18 * k; rx = -0.22 * k; head = -0.18 * k; }
    else if (u < 0.5) { const k = Ease.outCubic((u - 0.35) / 0.15); lunge = lerp(-0.18, 0.55, k); rx = lerp(-0.22, 0.3, k); head = lerp(-0.18, 0.32, k); }
    else { const k = Ease.inOutCubic((u - 0.5) / 0.5); lunge = lerp(0.55, 0, k); rx = lerp(0.3, 0, k); head = lerp(0.32, 0, k); }
    const s = Math.sin(u * Math.PI);
    return {
      lungeZ: lunge, bodyRx: rx, headRx: head,
      earRz: -0.3 * s, tailRx: 0.45 * s, tailRy: Math.sin(t * 18) * 0.3 * s,
      legSwing: Math.sin(u * Math.PI * 3) * 0.45,
      armRaise: s * 1.0, armSwing: -s * 0.8,
      wingFlap: Math.sin(t * 22) * 0.9,
      segWave: 0.12 * s, segSpeed: 9,
      rootSy: 1 + (u > 0.35 && u < 0.5 ? -0.08 : 0.05 * s),
    };
  },
  hit: (t, d) => {
    const u = clamp(t / d, 0, 1);
    const k = Math.exp(-u * 5);
    return {
      lungeZ: -0.35 * Math.sin(Math.min(1, u * 4) * Math.PI / 2) * k,
      bodyRz: Math.sin(t * 46) * 0.16 * k,
      bodyRx: -0.26 * k, headRx: -0.32 * k,
      rootSy: 1 - 0.12 * k, earRz: 0.45 * k, armRaise: 0.5 * k,
      wingFlap: -0.6 * k,
    };
  },
  faint: (t, d) => {
    const u = clamp(t / d, 0, 1);
    const fall = Ease.outBounce(clamp((u - 0.15) / 0.85, 0, 1));
    const wobble = u < 0.15 ? Math.sin(u / 0.15 * Math.PI) * 0.15 : 0;
    return {
      rootRz: 1.42 * fall + wobble, rootY: -0.08 * fall,
      rootSy: 1 - 0.08 * fall, headRx: 0.35 * fall,
      earRz: 0.5 * fall, tailRy: 0, armRaise: 0.3 * fall,
      wingFlap: -0.8 * fall, hover: -0.5 * fall,
    };
  },
  happy: (t, d) => {
    const u = clamp(t / d, 0, 1);
    const j = Math.abs(Math.sin(u * Math.PI * 2));
    return {
      rootY: j * 0.32, rootSy: 1 + (j < 0.12 ? -0.12 : 0.05),
      earRz: 0.3 * j, tailRy: Math.sin(t * 20) * 0.6, armRaise: 1.3 * j,
      wingFlap: Math.sin(t * 25) * 0.9, headRx: -0.2 * j, segWave: 0.1, segSpeed: 10,
    };
  },
  cast: (t, d) => {
    const u = clamp(t / d, 0, 1);
    const k = Math.sin(u * Math.PI);
    return {
      rootY: 0.12 * k, bodyRx: -0.16 * k, headRx: -0.35 * k, armRaise: 1.4 * k,
      earRz: 0.3 * k, tailRx: 0.5 * k, wingFlap: Math.sin(t * 22) * 0.9 * k,
      rootSy: 1 + 0.06 * k, segWave: 0.08 * k, segSpeed: 6,
    };
  },
};

POSES.ride = (t) => ({ legBase: 1.15, legSwing: Math.sin(t * 9) * 0.45, bodyRx: 0.28, bodyY: -0.02, armRaise: 0.15, armBase: 0.9, headRx: -0.18 });
POSES.surf = (t) => ({ bodyY: Math.sin(t * 2) * 0.015, bodyRx: 0.12, armRaise: 0.7, legBase: 0.35, bodyRz: Math.sin(t * 1.5) * 0.06 });
POSES.fish = (t) => ({ armBase: 1.1, armRaise: 0.1, bodyRx: -0.04, headRx: 0.12 + Math.sin(t * 1.5) * 0.03 });
POSES.climb = (t) => ({ armBase: 2.6, armSwing: Math.sin(t * 7) * 0.4, legSwing: Math.sin(t * 7) * 0.5, bodyRx: -0.15 });
POSES.sit = (t) => ({ legBase: 1.5, bodyY: -0.22, bodyRx: -0.05, armBase: 0.4, headRx: Math.sin(t * 0.6) * 0.05 });

const DEFAULTS = { rootSy: 1 };

function mixPose(a, b, k) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const d = DEFAULTS[key] ?? 0;
    out[key] = lerp(a[key] ?? d, b[key] ?? d, k);
  }
  return out;
}

function storeBase(o) {
  o.userData.base = {
    px: o.position.x, py: o.position.y, pz: o.position.z,
    rx: o.rotation.x, ry: o.rotation.y, rz: o.rotation.z,
    sx: o.scale.x, sy: o.scale.y, sz: o.scale.z,
  };
}

function setPart(o, v) {
  const b = o.userData.base;
  o.position.set(b.px + (v.px || 0), b.py + (v.py || 0), b.pz + (v.pz || 0));
  o.rotation.set(b.rx + (v.rx || 0), b.ry + (v.ry || 0), b.rz + (v.rz || 0));
  if (v.sy !== undefined) {
    const inv = 1 / Math.sqrt(Math.max(0.2, v.sy));
    o.scale.set(b.sx * inv, b.sy * v.sy, b.sz * inv);
  }
}

const resolved = () => ({ impact: Promise.resolve(), done: Promise.resolve() });

export class ProceduralAnimator {
  /**
   * @param rig { root, body?, head?, ears[], tail?, legs[], arms[], wings[], segments[], flickers[], height, isFloat }
   */
  constructor(rig, { rest = 'idle' } = {}) {
    this.rig = Object.assign({ ears: [], legs: [], arms: [], wings: [], segments: [], flickers: [] }, rig);
    this.H = rig.height || 1;
    this.restState = rest;
    const r = this.rig;
    [r.root, r.body, r.head, r.tail, r.cape, ...r.ears, ...r.legs, ...r.arms, ...r.wings, ...r.segments]
      .filter(Boolean).forEach((o) => { if (!o.userData.base) storeBase(o); });
    r.flickers.forEach((f) => { f.base = f.obj.scale.clone(); f.seed = Math.random() * 100; });
    this.state = rest;
    this.t = 0;
    this.time = 0;
    this.segPhase = 0;
    this.duration = 1;
    this.loop = true;
    this.hold = false;
    this.timeScale = 1;
    this.blendFrom = {};
    this.blendT = 1;
    this.blendDur = 0.2;
    this.current = {};
  }

  has(name) { return !!POSES[name]; }

  play(name, opts = {}) {
    name = POSES[name] ? name : 'idle';
    const def = STATES[name];
    const loop = opts.loop ?? !!def.loop;
    if (loop && this.state === name) { this.timeScale = opts.timeScale ?? this.timeScale; return resolved(); }
    this.blendFrom = { ...this.current };
    this.blendT = 0;
    this.blendDur = opts.fade ?? 0.18;
    this.state = name;
    this.t = 0;
    this.timeScale = opts.timeScale ?? 1;
    this.duration = opts.duration ?? def.duration ?? 1;
    this.loop = loop;
    this.hold = !!(def.hold || opts.hold);
    if (loop) return resolved();
    const dur = this.duration / this.timeScale;
    return { impact: tweens.sleep(dur * (def.impact ?? 0.5)), done: tweens.sleep(dur) };
  }

  setTimeScale(s) { this.timeScale = s; }

  update(dt) {
    this.time += dt;
    this.t += dt * this.timeScale;
    if (!this.loop && !this.hold && this.t >= this.duration) this.play(this.restState, { fade: 0.25 });
    const tt = this.loop ? this.t : Math.min(this.t, this.duration);
    const target = POSES[this.state](tt, this.duration);
    let pose = target;
    if (this.blendT < 1) {
      this.blendT = Math.min(1, this.blendT + dt / this.blendDur);
      const k = this.blendT * this.blendT * (3 - 2 * this.blendT);
      pose = mixPose(this.blendFrom, target, k);
    }
    this.current = pose;
    this.segPhase += dt * (pose.segSpeed || 2);
    this.apply(pose);
    this.updateFlickers();
    if (this.rig.spinners) for (const sp of this.rig.spinners) sp.rotation.y += dt * 1.6;
  }

  apply(p) {
    const r = this.rig, H = this.H;
    const g = (k, d = 0) => (p[k] !== undefined ? p[k] : d);
    const hover = r.isFloat ? g('hover') : 0;
    if (r.root) {
      setPart(r.root, {
        py: (g('rootY') + (r.body ? 0 : g('bodyY') + hover)) * H,
        pz: g('lungeZ') * H,
        rx: g('rootRx') + (r.body ? 0 : g('bodyRx') * 0.5),
        rz: g('rootRz') + (r.body ? 0 : g('bodyRz')),
        sy: g('rootSy', 1),
      });
    }
    if (r.body) setPart(r.body, { py: (g('bodyY') + hover) * H, rx: g('bodyRx'), rz: g('bodyRz'), ry: g('bodyRy') });
    if (r.head && r.head !== r.body) setPart(r.head, { rx: g('headRx'), ry: g('headRy'), rz: g('headRz') });
    for (const e of r.ears) setPart(e, { rz: -g('earRz') * e.userData.side });
    if (r.tail) setPart(r.tail, { ry: g('tailRy'), rx: g('tailRx') });
    for (const l of r.legs) setPart(l, { rx: g('legSwing') * l.userData.phase - g('legBase') });
    for (const a of r.arms) setPart(a, { rx: g('armSwing') * a.userData.phase - g('armBase'), rz: g('armRaise') * a.userData.side * 0.9 });
    if (r.cape) setPart(r.cape, { rx: Math.min(0.9, Math.abs(g('legSwing')) * 0.3 + g('bodyRx') * 0.5 + 0.05) });
    for (const w of r.wings) setPart(w, { rz: g('wingFlap') * w.userData.side });
    const wave = g('segWave');
    r.segments.forEach((s, i) => {
      setPart(s, {
        py: Math.sin(this.segPhase - i * 0.85) * wave * H,
        px: Math.cos(this.segPhase * 0.8 - i * 0.65) * wave * 0.9 * H,
      });
    });
  }

  updateFlickers() {
    const t = this.time;
    for (const f of this.rig.flickers) {
      const n = Math.sin(t * f.speed + f.seed) * 0.5 + Math.sin(t * f.speed * 2.3 + f.seed * 1.7) * 0.3;
      f.obj.scale.set(f.base.x * (1 + n * f.amp * 0.4), f.base.y * (1 + n * f.amp), f.base.z * (1 + n * f.amp * 0.4));
    }
  }
}

export class ClipAnimator {
  constructor(model, clips, overlayRoot, height, { rest = 'idle' } = {}) {
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = clips;
    this.cache = new Map();
    this.restName = rest;
    this.current = null;
    this.currentName = null;
    this.overlay = new ProceduralAnimator({ root: overlayRoot, height }, { rest: 'rest' });
    this.finishCbs = new Map();
    this.mixer.addEventListener('finished', (e) => {
      const cb = this.finishCbs.get(e.action);
      if (cb) { this.finishCbs.delete(e.action); cb(); }
    });
  }

  findClip(name) {
    const aliases = CLIP_NAMES[name] || [name];
    const norm = (s) => s.toLowerCase().replace(/^.*[|:]/, '').trim();
    for (const a of aliases) { const c = this.clips.find((c) => norm(c.name) === a); if (c) return c; }
    for (const a of aliases) { const c = this.clips.find((c) => norm(c.name).includes(a)); if (c) return c; }
    return null;
  }

  action(name) {
    if (!this.cache.has(name)) {
      const clip = this.findClip(name);
      this.cache.set(name, clip ? this.mixer.clipAction(clip) : null);
    }
    return this.cache.get(name);
  }

  has(name) { return !!this.action(name); }

  play(name, opts = {}) {
    const a = this.action(name);
    const loco = name === 'idle' || name === 'walk' || name === 'run';
    if (!a) {
      if (name === 'run' && this.has('walk')) return this.play('walk', { ...opts, timeScale: (opts.timeScale || 1) * 1.55 });
      if (loco) {
        if (this.has('idle')) this.play('idle', opts);
        return this.overlay.play(name === 'idle' ? 'rest' : name, opts);
      }
      return this.overlay.play(name, opts);
    }
    if (loco) this.overlay.play('rest');
    const loop = opts.loop ?? loco;
    const fade = opts.fade ?? 0.25;
    const ts = opts.timeScale ?? 1;
    if (loop && this.current === a) { a.setEffectiveTimeScale(ts); return resolved(); }
    a.reset();
    a.enabled = true;
    a.setEffectiveTimeScale(ts);
    a.setEffectiveWeight(1);
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = !loop;
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    else a.fadeIn(fade);
    a.play();
    this.current = a;
    this.currentName = name;
    if (loop) return resolved();
    const dur = a.getClip().duration / ts;
    const frac = { attack: 0.45, hit: 0.1, cast: 0.5, faint: 0.6 }[name] ?? 0.5;
    const impact = tweens.sleep(dur * frac);
    const done = new Promise((res) => {
      let finished = false;
      const fin = () => {
        if (finished) return;
        finished = true;
        res();
        if (name !== 'faint' && !opts.hold && this.current === a) this.play(this.restName, { fade: 0.3 });
      };
      this.finishCbs.set(a, fin);
      tweens.sleep(dur + 0.25).then(fin);
    });
    return { impact, done };
  }

  setTimeScale(s) { this.current?.setEffectiveTimeScale(s); }

  update(dt) {
    this.mixer.update(dt);
    this.overlay.update(dt);
  }
}
