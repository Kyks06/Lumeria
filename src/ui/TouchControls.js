import { $ } from '../core/utils.js';

/**
 * COMMANDES TACTILES façon console portable :
 *  croix directionnelle (glisser le doigt d'une direction à l'autre, maintien = déplacement continu,
 *  répétition automatique dans les menus) · A (valider / parler) · B (retour ; maintenu = courir)
 *  · Menu · Vélo · Course (course automatique).
 * Chaque appui est suivi par son identifiant de pointeur et relâché sur tout événement de fin
 * (levé, annulation, perte de capture, onglet masqué) : impossible de rester bloqué en marche.
 */
const DIRS = { up: { x: 0, y: 1 }, down: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export class TouchControls {
  constructor(ui) {
    this.ui = ui;
    this.input = ui.game.input;
    this.el = $('#touch');
    this.pad = $('#dpad');
    this.btnA = $('#btn-a');
    this.btnB = $('#btn-b');
    this.btnRun = $('#btn-run');
    this.btnMenu = $('#btn-menu');
    this.btnBike = $('#btn-bike');
    this.padId = null;
    this.dir = null;
    this.repeatT = 0;
    this.bId = null;
    this.mode = 'hidden';
    this.bind();
  }

  bind() {
    const I = this.input;
    const pad = this.pad;
    const unlock = () => { try { this.ui.audio.unlock(); } catch { /* audio indisponible */ } };

    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.padId !== null && this.padId !== e.pointerId) this.releasePad();
      this.padId = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
      I.setDevice('touch');
      unlock();
      this.trackPad(e);
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === this.padId) { e.preventDefault(); this.trackPad(e); } });
    const endPad = (e) => { if (e.pointerId === this.padId) this.releasePad(); };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(ev, endPad);

    // A : valider / interagir
    this.btnA.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlock();
      I.setDevice('touch');
      this.flash(this.btnA);
      I.emit('confirm', { source: 'touch' });
    });
    // B : retour (menus) ; maintenu pendant l'exploration = courir
    this.btnB.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlock();
      I.setDevice('touch');
      this.flash(this.btnB);
      this.bId = e.pointerId;
      try { this.btnB.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
      if (this.ui.nav.active) I.emit('cancel', { source: 'touch', key: 'touch' });
      else I.touchHoldRun = true;
    });
    const endB = (e) => { if (e.pointerId === this.bId) { this.bId = null; I.touchHoldRun = false; } };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.btnB.addEventListener(ev, endB);

    this.btnRun.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      I.touchRun = !I.touchRun;
      this.btnRun.classList.toggle('on', I.touchRun);
    });
    this.btnMenu.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      unlock();
      this.flash(this.btnMenu);
      I.emit('pause', { source: 'touch' });
    });
    this.btnBike.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.flash(this.btnBike);
      I.emit('bike', { source: 'touch' });
    });
    // empêche tout clic « fantôme » sur ce qui se trouve sous les commandes
    this.el.addEventListener('click', (e) => e.preventDefault());

    // sécurité : on relâche tout si la page passe en arrière-plan
    const releaseAll = () => this.releaseAll();
    addEventListener('blur', releaseAll);
    addEventListener('pagehide', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  }

  /** Direction selon la position du doigt par rapport au centre de la croix (zone morte au centre). */
  trackPad(e) {
    const r = this.pad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const dead = r.width * 0.12;
    let dir = null;
    if (Math.hypot(dx, dy) > dead) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.setDir(dir);
  }

  setDir(dir) {
    if (dir === this.dir) return;
    this.dir = dir;
    const I = this.input;
    const v = dir ? DIRS[dir] : { x: 0, y: 0 };
    I.touchMove.x = v.x;
    I.touchMove.y = v.y;
    this.pad.dataset.dir = dir || '';
    if (dir && this.ui.nav.active) { I.emit(dir, { source: 'touch' }); this.repeatT = 0.38; }
  }

  releasePad() {
    this.padId = null;
    this.setDir(null);
  }

  releaseAll() {
    this.releasePad();
    this.bId = null;
    this.input.touchHoldRun = false;
  }

  flash(el) {
    el.classList.add('down');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('down'), 140);
  }

  /** Répétition automatique de la croix dans les menus (appelé à chaque image). */
  update(dt) {
    if (!this.dir || !this.ui.nav.active) return;
    this.repeatT -= dt;
    if (this.repeatT <= 0) { this.repeatT = 0.13; this.input.emit(this.dir, { source: 'touch', repeat: true }); }
  }

  /**
   * explore : tout · menu : croix + A + B (sans Vélo / Course) · hidden : rien (dialogue, combat…).
   */
  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.el.hidden = mode === 'hidden';
    this.el.dataset.mode = mode;
    if (mode !== 'explore') { this.input.touchHoldRun = false; }
    if (mode === 'hidden') this.releaseAll();
  }

  /** Compatibilité : ancien affichage tout ou rien. */
  setVisible(v) { this.setMode(v ? 'explore' : 'hidden'); }
}
