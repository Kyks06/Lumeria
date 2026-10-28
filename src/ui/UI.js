import * as THREE from 'three';
import { Nav } from './Nav.js';
import { Dialogue } from './Dialogue.js';
import { BattleUI } from './BattleUI.js';
import { Menus } from './Menus.js';
import { Screens } from './Screens.js';
import { TouchControls } from './TouchControls.js';
import { Layout } from './Layout.js';
import { Minimap } from './Minimap.js';
import { Portraits } from './Portraits.js';
import { GAME } from '../config/game.js';
import { TYPES } from '../config/types.js';
import { hdr, SHAPE } from '../world2d/Particles2D.js';
import { $, h, escapeHtml, sleep, tweens, Ease } from '../core/utils.js';

const TIPS = [
  'Affaiblissez un Lumin sauvage avant de lancer un Prisme : moins il lui reste de PV, plus la capture est facile.',
  'Le sommeil et le gel facilitent énormément les captures.',
  'Les Lumins sauvages se promènent dans les hautes herbes : certains vous foncent dessus, d\'autres s\'enfuient.',
  'À la Pension de la Route 3, deux Lumins compatibles peuvent vous laisser un Œuf.',
  'Le Ruban Lié transmet 5 potentiels des parents, la Pierre Immuable transmet la nature.',
  'Chaque badge débloque une capacité de terrain : Coupe, Éclate-Roc, Force, Surf, Lanterne, Escalade, Vol.',
  'Certains Lumins n\'apparaissent que la nuit. Une journée dure 24 minutes.',
  'Le mode Difficile utilise le style « Fixe » : pas de changement gratuit quand l\'adversaire envoie un Lumin.',
  'Touche B : vélo · F : pêche · M : carte de la région.',
  'Le Carnet de Défis récompense vos exploits : Lumidex, éclosions, Tour de Combat…',
];

/** Point central de l'interface : chargement, HUD, transitions, notifications et sous-modules. */
export class UI {
  constructor(game) {
    this.game = game;
    this.audio = game.audio;
    this.nav = new Nav(game.audio);
    this.portraits = new Portraits(game.assets);
    this.dialogue = new Dialogue(this);
    this.battle = new BattleUI(this);
    this.menus = new Menus(this);
    this.screens = new Screens(this);
    this.layout = new Layout(game.input);
    this.touch = new TouchControls(this);
    this.el = {
      loading: $('#loading'), loadFill: $('#load-fill'), loadLabel: $('#load-label'), loadPct: $('#load-pct'), loadTip: $('#load-tip'),
      hud: $('#hud'), area: $('#area-banner'), clock: $('#clock'), money: $('#money'), objective: $('#objective'), mount: $('#mount'),
      team: $('#team-strip'), labels: $('#labels'), prompt: $('#prompt'), promptKey: $('#prompt-key'), promptText: $('#prompt-text'),
      help: $('#controls-help'), fade: $('#fade'), flash: $('#flash'), swirl: $('#swirl'), toasts: $('#toasts'), pause: $('#btn-pause'),
      cutin: $('#cutin'), bubble: $('#bubble'),
    };
    this.minimap = new Minimap($('#minimap'), game);
    this.labelEls = new Map();
    this.tipIndex = Math.floor(Math.random() * TIPS.length);
    this.el.loadTip.textContent = TIPS[this.tipIndex];
    this.tipTimer = setInterval(() => { this.tipIndex = (this.tipIndex + 1) % TIPS.length; this.el.loadTip.textContent = TIPS[this.tipIndex]; }, 3800);
    this.el.pause.addEventListener('click', () => { this.audio.unlock(); this.game.openPause(); });
    // toucher l'invite « A Parler » revient à appuyer sur A
    this.el.prompt.addEventListener('pointerdown', (e) => { e.preventDefault(); this.game.input.emit('confirm', { source: 'touch' }); });
    const shards = $('.swirl-shards', this.el.swirl);
    for (let i = 0; i < 12; i++) shards.append(h('i', { style: `--r:${i * 30}deg` }));
    this.tmpV = new THREE.Vector3();
    this.fishing = new Fishing(this);
    this.updateControlsHelp(game.input.lastDevice);
  }

  portrait(id, shiny) { return this.portraits.get(id, shiny); }
  portraitHtml(id, shiny, cls = '') { return this.portraits.html(id, shiny, cls); }

  // ── Chargement ─────────────────────────────────────────────────────
  setLoading(f, label) {
    const pct = Math.round(f * 100);
    this.el.loadFill.style.width = `${pct}%`;
    this.el.loadPct.textContent = `${pct} %`;
    if (label) this.el.loadLabel.textContent = label;
  }

  async hideLoading() {
    clearInterval(this.tipTimer);
    this.el.loading.classList.add('out');
    await sleep(0.8);
    this.el.loading.hidden = true;
  }

  // ── HUD ────────────────────────────────────────────────────────────
  showHUD(v) {
    this.el.hud.hidden = !v;
    if (!v) { this.hidePrompt(); this.clearLabels(); }
  }

  clearLabels() { this.el.labels.innerHTML = ''; this.labelEls.clear(); }

  showArea(area) {
    const a = this.el.area;
    $('.area-sub', a).textContent = area.sub || '';
    $('.area-name', a).textContent = area.name;
    a.classList.add('show');
    clearTimeout(this.areaTimer);
    this.areaTimer = setTimeout(() => a.classList.remove('show'), 3200);
  }

  setObjective(text) { this.el.objective.innerHTML = text ? `<b>Objectif</b>${escapeHtml(text)}` : ''; }

  setClock(str, night, outdoor = true) {
    $('.clock-time', this.el.clock).textContent = str;
    $('.clock-icon', this.el.clock).classList.toggle('night', night);
    this.el.clock.classList.toggle('dim', !outdoor);
  }

  setMoney(m) { this.el.money.textContent = `${GAME.currencySymbol} ${m.toLocaleString('fr-FR')}`; }

  setMount(mode) {
    const el = this.el.mount;
    if (!el) return;
    el.textContent = mode === 'bike' ? 'Vélo' : mode === 'surf' ? 'Surf' : '';
    el.hidden = !(mode === 'bike' || mode === 'surf');
    const rep = this.game.data?.repel;
    if (rep > 0) { el.hidden = false; el.textContent = `${el.textContent ? `${el.textContent} · ` : ''}Repousse ${rep}`; }
  }

  updateTeamStrip(team) {
    this.el.team.innerHTML = '';
    for (const c of team) {
      const r = c.maxHp ? c.hp / c.maxHp : 0;
      this.el.team.append(h('div', { class: `ts-item${c.hp <= 0 && !c.egg ? ' ko' : ''}${c.egg ? ' egg' : ''}${c.dead ? ' dead' : ''}`, title: `${c.name} N.${c.level}`, html: `
        ${c.egg ? '<span class="egg-ico"></span>' : this.portraitHtml(c.species, c.shiny)}
        <span class="hpbar"><i class="${r <= 0.2 ? 'low' : r <= 0.5 ? 'mid' : ''}" style="width:${c.egg ? 0 : r * 100}%"></i></span>
        <span class="lv">${c.egg ? 'Œuf' : `N.${c.level}`}</span>` }));
    }
  }

  keyGlyph(device = this.game.input.lastDevice) { return device === 'keyboard' ? 'E' : 'A'; }

  updateControlsHelp(device) {
    const help = this.el.help;
    if (device === 'gamepad') help.innerHTML = '<span><kbd>B</kbd> courir</span><span><kbd>A</kbd> interagir</span><span><kbd>X</kbd> vélo</span><span><kbd>Y</kbd> pêche</span><span><kbd>Start</kbd> menu</span>';
    else if (device === 'touch') help.innerHTML = '';
    else help.innerHTML = '<span><kbd>Maj</kbd> courir</span><span><kbd>E</kbd> interagir</span><span><kbd>B</kbd> vélo</span><span><kbd>F</kbd> pêche</span><span><kbd>M</kbd> carte</span><span><kbd>Échap</kbd> menu</span>';
  }

  showPrompt(text) {
    this.el.promptKey.textContent = this.keyGlyph();
    if (this.el.promptText.textContent !== text) this.el.promptText.textContent = text;
    this.el.prompt.hidden = false;
  }

  hidePrompt() { this.el.prompt.hidden = true; }

  updateLabels(npcs, view, playerPos, stateOf) {
    const w = window.innerWidth, hgt = this.game.engine.offY + this.game.engine.cssH;
    const seen = new Set();
    const T = this.game.map?.T || 2;
    for (const n of npcs) {
      seen.add(n);
      let el = this.labelEls.get(n);
      const d = n.position.distanceTo(playerPos) / T;
      const lift = n.creature ? 26 : 28;
      const v = view.toScreen(n.position.x, n.position.z, lift);
      const visible = d < 5 && v.x > -40 && v.x < w + 40 && v.y > -20 && v.y < hgt + 20;
      if (!visible) { if (el) el.style.opacity = '0'; continue; }
      if (!el) { el = h('div', { class: 'npc-label' }, n.name); this.el.labels.append(el); this.labelEls.set(n, el); }
      const st = stateOf(n);
      el.className = `npc-label${st ? ` ${st}` : ''}`;
      el.style.opacity = String(Math.min(1, (5 - d) / 1.5));
      el.style.left = `${v.x}px`;
      el.style.top = `${v.y}px`;
    }
    for (const [n, el] of this.labelEls) if (!seen.has(n)) { el.remove(); this.labelEls.delete(n); }
  }

  /** Bulle « ! » au-dessus d'un PNJ (dresseur qui repère le joueur). */
  async exclaim(pos, height) {
    const el = this.el.bubble;
    const place = () => {
      const v = this.game.view.toScreen(pos.x, pos.z, height < 0.5 ? 6 : 32);
      el.style.left = `${v.x}px`;
      el.style.top = `${v.y}px`;
    };
    place();
    el.hidden = false;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    await tweens.tween(0.75, () => place());
    el.hidden = true;
  }

  /** Incrustation du Lumin qui utilise une capacité de terrain. */
  async fieldCutin(mon, name) {
    const el = this.el.cutin;
    el.innerHTML = `${this.portraitHtml(mon.species, mon.shiny)}<span>${escapeHtml(name)}</span>`;
    el.style.setProperty('--tc', TYPES[mon.types[0]].color);
    el.hidden = false;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
    await sleep(1.0);
    el.hidden = true;
  }

  async healJingle() {
    this.flash();
    await sleep(0.9);
  }

  toast(text) {
    const t = h('div', { class: 'toast' }, text);
    this.el.toasts.append(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ── Transitions ────────────────────────────────────────────────────
  fade(to, duration = 0.5) {
    this.el.fade.style.transition = `opacity ${duration}s ease`;
    this.el.fade.style.opacity = String(to);
    this.el.fade.style.pointerEvents = to > 0.5 ? 'auto' : 'none';
    return sleep(duration);
  }

  flash() {
    const f = this.el.flash;
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
  }

  async battleIn() {
    const s = this.el.swirl;
    s.classList.remove('out');
    void s.offsetWidth;
    s.classList.add('in');
    this.audio.play('battle_start');
    await sleep(0.75);
  }

  /** Révèle la scène de combat derrière les éclats (après battleIn). */
  async battleReveal() {
    const s = this.el.swirl;
    s.classList.remove('in');
    void s.offsetWidth;
    s.classList.add('out');
    await sleep(0.6);
    s.classList.remove('out');
  }

  /** Sortie de combat : toBlack=true → fondu au noir ; false → retour à l'image. */
  async battleOut(toBlack) {
    const s = this.el.swirl;
    if (toBlack) {
      await this.fade(1, 0.35);
      s.classList.remove('in');
      return;
    }
    s.classList.remove('in', 'out');
    await this.fade(0, 0.45);
  }

  update(dt) {
    this.dialogue.update(dt);
    this.battle.update(dt);
    this.fishing.update(dt);
    this.syncTouch();
    this.touch.update(dt);
  }

  /** Commandes tactiles selon la situation : exploration, menu, ou masquées (dialogue, combat). */
  syncTouch() {
    const g = this.game;
    let mode = 'hidden';
    if (this.layout.mode !== 'desktop') {
      const dlg = this.dialogueEl || (this.dialogueEl = $('#dialogue'));
      if (!dlg.hidden || g.state === 'battle') mode = 'hidden';
      else if (this.nav.active) mode = 'menu';
      else if (!this.el.hud.hidden && g.state === 'explore') mode = 'explore';
    }
    this.touch.setMode(mode);
    document.documentElement.dataset.touch = mode;
  }
}

/** Mini-jeu de pêche : flotteur, attente, touche à saisir. */
class Fishing {
  constructor(ui) {
    this.ui = ui;
    this.active = null;
  }

  begin(pos) {
    const g = this.ui.game;
    const bob = { x: pos.x, z: pos.z, y: 0, bite: false };
    g.view.bobber = bob;
    const st = { bob, t: 0, bite: false, base: 0 };
    this.active = st;
    const self = this;
    return {
      waitBite(wait, window) {
        return new Promise((resolve) => {
          let phase = 'wait';
          let timer = wait;
          const menu = {
            handle: (a) => {
              if (a !== 'confirm' && a !== 'cancel') return true;
              if (a === 'cancel') { finish(false); return true; }
              finish(phase === 'bite');
              return true;
            },
          };
          const finish = (ok) => { if (phase === 'done') return; phase = 'done'; self.ui.nav.remove(menu); self.ui.el.bubble.hidden = true; resolve(ok); };
          self.ui.nav.push(menu);
          st.tick = (dt) => {
            if (phase === 'done') return;
            timer -= dt;
            if (phase === 'wait' && timer <= 0) {
              phase = 'bite'; timer = window; st.bite = true;
              self.ui.audio.play('exclaim');
              for (let i = 0; i < 14; i++) g.fxNorm.emit({ pos: [pos.x, pos.y + 0.05, pos.z], vel: [(Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2], color: hdr('#cfefff', 1.2), size: 0.12, size1: 0.04, life: 0.6, gravity: 9, shape: SHAPE.drop });
              self.ui.exclaim(pos, 0.2);
            } else if (phase === 'bite' && timer <= 0) finish(false);
          };
        });
      },
      end() { if (g.view.bobber === bob) g.view.bobber = null; self.active = null; },
    };
  }

  update(dt) {
    const st = this.active;
    if (!st) return;
    st.t += dt;
    st.bob.y = st.bite ? -1 + Math.round(Math.sin(st.t * 30)) : Math.round(Math.sin(st.t * 3));
    st.bob.bite = st.bite;
    st.tick?.(dt);
  }
}

export { Ease };
