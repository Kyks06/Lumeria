/**
 * Entrées unifiées : clavier (ZQSD/WASD/flèches, indépendant de la disposition), souris,
 * manette (API Gamepad, mapping standard) et joystick tactile (alimenté par TouchControls).
 *
 * Événements émis : confirm, cancel, pause, up, down, left, right, device
 */
const NAV_KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};
const CONFIRM_KEYS = ['Enter', 'NumpadEnter', 'Space', 'KeyE'];
const CANCEL_KEYS = ['Escape', 'Backspace', 'KeyX'];
const PAUSE_KEYS = ['KeyP', 'Tab'];

const DIR_KEYS = { KeyW: 3, ArrowUp: 3, KeyS: 0, ArrowDown: 0, KeyA: 1, ArrowLeft: 1, KeyD: 2, ArrowRight: 2 };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.listeners = new Map();
    this.look = { dx: 0, dy: 0 };
    this.zoom = 0;
    this.touchMove = { x: 0, y: 0 };
    this.touchRun = false;
    this.touchHoldRun = false;
    this.lastDevice = (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) ? 'touch' : 'keyboard';
    this.dragging = false;
    this.gamepad = { connected: false, prev: [], move: { x: 0, y: 0 }, run: false, navDir: null, navT: 0 };

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); const d = DIR_KEYS[e.code]; if (d !== undefined) this.dirStack = this.dirStack.filter((c) => c !== e.code); });
    window.addEventListener('blur', () => { this.keys.clear(); this.dirStack = []; });
    this.dirStack = [];

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.setDevice('keyboard');
      this.dragging = true;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging || e.pointerType !== 'mouse') return;
      this.look.dx += e.movementX;
      this.look.dy += e.movementY;
    });
    const stopDrag = () => { this.dragging = false; };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });

    window.addEventListener('touchstart', () => this.setDevice('touch'), { passive: true });
    window.addEventListener('gamepadconnected', () => { this.gamepad.connected = true; this.setDevice('gamepad'); });
    window.addEventListener('gamepaddisconnected', () => { this.gamepad.connected = false; });
  }

  on(action, fn) {
    if (!this.listeners.has(action)) this.listeners.set(action, new Set());
    this.listeners.get(action).add(fn);
    return () => this.listeners.get(action).delete(fn);
  }

  emit(action, detail = {}) {
    this.listeners.get(action)?.forEach((fn) => fn(detail));
    this.listeners.get('*')?.forEach((fn) => fn(action, detail));
  }

  setDevice(d) {
    if (this.lastDevice === d) return;
    this.lastDevice = d;
    this.emit('device', { device: d });
  }

  onKeyDown(e) {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (tag === 'BUTTON' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter')) e.preventDefault();
    this.setDevice('keyboard');
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace'].includes(code)) e.preventDefault();
    this.keys.add(code);
    if (DIR_KEYS[code] !== undefined && !e.repeat) { this.dirStack = this.dirStack.filter((c) => c !== code); this.dirStack.push(code); }
    const nav = NAV_KEYS[code];
    if (nav) this.emit(nav, { source: 'keyboard', repeat: e.repeat });
    if (e.repeat) return;
    if (CONFIRM_KEYS.includes(code)) this.emit('confirm', { source: 'keyboard' });
    if (CANCEL_KEYS.includes(code)) this.emit('cancel', { source: 'keyboard', key: code });
    if (PAUSE_KEYS.includes(code)) this.emit('pause', { source: 'keyboard' });
    if (code === 'KeyB') this.emit('bike', { source: 'keyboard' });
    if (code === 'KeyF') this.emit('fish', { source: 'keyboard' });
    if (code === 'KeyM') this.emit('map', { source: 'keyboard' });
  }

  /**
   * Direction de marche sur la grille (0 bas, 1 gauche, 2 droite, 3 haut) ou -1.
   * Clavier : la dernière touche enfoncée l'emporte (pas de diagonale) ; manette / tactile : axe dominant.
   */
  getDir() {
    for (let i = this.dirStack.length - 1; i >= 0; i--) if (this.keys.has(this.dirStack[i])) return DIR_KEYS[this.dirStack[i]];
    const x = this.gamepad.move.x + this.touchMove.x, y = this.gamepad.move.y + this.touchMove.y;
    if (Math.hypot(x, y) < 0.35) return -1;
    if (Math.abs(x) > Math.abs(y)) return x > 0 ? 2 : 1;
    return y > 0 ? 3 : 0;
  }

  /** Vecteur de déplacement { x: droite, y: avant }, norme ≤ 1. */
  getMove() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    const kl = Math.hypot(x, y);
    if (kl > 0) { x /= kl; y /= kl; }
    x += this.gamepad.move.x + this.touchMove.x;
    y += this.gamepad.move.y + this.touchMove.y;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }

  isRunning() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.gamepad.run || this.touchRun || this.touchHoldRun;
  }

  consumeLook() {
    const r = { dx: this.look.dx, dy: this.look.dy };
    this.look.dx = 0; this.look.dy = 0;
    return r;
  }

  consumeZoom() {
    const z = this.zoom;
    this.zoom = 0;
    return z;
  }

  update(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    const G = this.gamepad;
    if (!gp) { G.move.x = G.move.y = 0; G.run = false; return; }

    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    const lx = dz(gp.axes[0] || 0), ly = dz(gp.axes[1] || 0);
    const rx = dz(gp.axes[2] || 0), ry = dz(gp.axes[3] || 0);
    G.move.x = lx; G.move.y = -ly;
    if (rx || ry) { this.look.dx += rx * 520 * dt; this.look.dy += ry * 360 * dt; }

    const pressed = gp.buttons.map((b) => b.pressed || b.value > 0.5);
    const edge = (i) => pressed[i] && !G.prev[i];
    if (pressed.some(Boolean) || Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) > 0) this.setDevice('gamepad');

    if (edge(0)) this.emit('confirm', { source: 'gamepad' });
    if (edge(1)) this.emit('cancel', { source: 'gamepad' });
    if (edge(9) || edge(8)) this.emit('pause', { source: 'gamepad' });
    if (edge(2)) this.emit('bike', { source: 'gamepad' });
    if (edge(3)) this.emit('fish', { source: 'gamepad' });
    G.run = !!(pressed[1] || pressed[6] || pressed[7] || (gp.buttons[7]?.value ?? 0) > 0.3);

    // Navigation (croix directionnelle ou stick gauche) avec répétition
    let dir = null;
    if (pressed[12] || ly < -0.6) dir = 'up';
    else if (pressed[13] || ly > 0.6) dir = 'down';
    else if (pressed[14] || lx < -0.6) dir = 'left';
    else if (pressed[15] || lx > 0.6) dir = 'right';
    if (dir !== G.navDir) {
      G.navDir = dir;
      G.navT = 0.38;
      if (dir) this.emit(dir, { source: 'gamepad' });
    } else if (dir) {
      G.navT -= dt;
      if (G.navT <= 0) { G.navT = 0.11; this.emit(dir, { source: 'gamepad', repeat: true }); }
    }
    G.prev = pressed;
  }
}
