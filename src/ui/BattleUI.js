import { TYPES, effectiveness } from '../config/types.js';
import { MOVES, categoryLabel } from '../config/moves.js';
import { STAT_SHORT, STATS } from '../config/natures.js';
import { GAME } from '../config/game.js';
import { $, h, escapeHtml, tweens, Ease, lerp, clamp, sleep } from '../core/utils.js';

const hpClass = (r) => (r <= 0.2 ? 'low' : r <= 0.5 ? 'mid' : '');
export const STATUS_CHIP = { brn: ['BRÛ', '#ff6a3d'], psn: ['PSN', '#b25ad9'], tox: ['PSN+', '#8a2ab9'], par: ['PAR', '#ffd23f'], slp: ['SOM', '#9ab8ff'], frz: ['GEL', '#8fe3f2'] };
export const typeChip = (t) => `<span class="type-chip" style="background:${TYPES[t].color}">${TYPES[t].name}</span>`;
export const statusChip = (s) => (s && STATUS_CHIP[s] ? `<span class="status-chip" style="background:${STATUS_CHIP[s][1]}">${STATUS_CHIP[s][0]}</span>` : '');
export const genderMark = (g) => (g === 'm' ? '<span class="gender m">♂</span>' : g === 'f' ? '<span class="gender f">♀</span>' : '');

/** Interface de combat : panneaux PV/XP animés, messages, menus Attaque / Sac / Lumins / Fuite. */
export class BattleUI {
  constructor(ui) {
    this.ui = ui;
    this.nav = ui.nav;
    this.audio = ui.audio;
    this.el = $('#battle-ui');
    this.panels = { enemy: $('#bp-enemy'), player: $('#bp-player') };
    this.textEl = $('#battle-text');
    this.msgBox = $('#battle-msg');
    this.bottom = $('.battle-bottom', this.el);
    this.actionsEl = $('#battle-actions');
    this.movesEl = $('#battle-moves');
    this.sheetEl = $('#battle-sheet');
    this.levelEl = $('#levelup');
    this.dotsEl = $('#enemy-dots');
    this.bannerEl = $('#ability-banner');
    this.hpShown = { player: 0, enemy: 0 };
    this.maxHp = { player: 1, enemy: 1 };
    this.creature = { player: null, enemy: null };
    this.typing = null;
    this.pending = null;
    this.msgBox.addEventListener('click', () => { if (this.typing || this.pending) this.nav.handle('confirm'); });
  }

  get speed() { return GAME.textSpeed[this.ui.game.settings.textSpeed] || 55; }

  show(kind, trainer, enemyTeam) {
    this.el.hidden = false;
    this.bottom.hidden = false;
    this.panelVisible('enemy', false);
    this.panelVisible('player', false);
    this.textEl.textContent = '';
    this.actionsEl.hidden = true;
    this.movesEl.hidden = true;
    this.sheetEl.hidden = true;
    this.levelEl.hidden = true;
    this.dotsEl.innerHTML = '';
    if (kind !== 'wild') this.updateTeamIndicator(enemyTeam);
  }

  hide() {
    this.cancelMessage();
    this.panelVisible('enemy', false);
    this.panelVisible('player', false);
    this.dotsEl.innerHTML = '';
    this.actionsEl.hidden = true;
    this.movesEl.hidden = true;
    this.levelEl.hidden = true;
  }

  hideAll() { this.hide(); this.el.hidden = true; }

  updateTeamIndicator(team) {
    this.dotsEl.innerHTML = '';
    for (const c of team) this.dotsEl.append(h('i', { class: c.hp <= 0 ? 'ko' : '' }));
  }

  panelVisible(side, v) { this.panels[side].classList.toggle('hide', !v); }

  setPanel(side, c, opts = {}) {
    this.creature[side] = c;
    this.hpShown[side] = opts.hp ?? c.hp;
    this.maxHp[side] = c.maxHp;
    this.panels[side].innerHTML = `
      <div class="bp-head">
        <span class="bp-name">${escapeHtml(c.name)}${genderMark(c.gender)}</span>
        ${opts.caught ? '<span class="bp-caught" title="Déjà capturé"></span>' : ''}
        ${c.shiny ? '<span class="bp-shiny" title="Chromatique">✦</span>' : ''}
        <span class="bp-lv">N.<b>${c.level}</b></span>
      </div>
      <div class="bp-types">${c.types.map(typeChip).join('')}<span class="bp-status">${statusChip(opts.status !== undefined ? opts.status : c.status)}</span></div>
      <div class="bp-hp"><span class="tag">PV</span><div class="hpbar"><i></i></div></div>
      ${side === 'player' ? `<div class="bp-nums"><span class="hp-cur"></span> / <span class="hp-max">${c.maxHp}</span></div><div class="bp-xp"><i style="width:${(c.xpProgress * 100).toFixed(1)}%"></i></div>` : ''}`;
    this.renderHp(side);
  }

  setStatus(side, status) {
    const el = $('.bp-status', this.panels[side]);
    if (el) el.innerHTML = statusChip(status);
  }

  refreshLevel(c) {
    const p = this.panels.player;
    if (this.creature.player !== c) return;
    const lv = $('.bp-lv b', p);
    if (lv) lv.textContent = c.level;
    const mx = $('.hp-max', p);
    if (mx) mx.textContent = c.maxHp;
    this.maxHp.player = c.maxHp;
  }

  renderHp(side) {
    const c = this.creature[side];
    if (!c) return;
    const ratio = clamp(this.hpShown[side] / Math.max(1, this.maxHp[side]), 0, 1);
    const bar = $('.hpbar i', this.panels[side]);
    if (bar) { bar.style.width = `${(ratio * 100).toFixed(1)}%`; bar.className = hpClass(ratio); }
    const cur = $('.hp-cur', this.panels[side]);
    if (cur) cur.textContent = Math.round(this.hpShown[side]);
  }

  animateHp(side, to, maxHp) {
    if (!this.creature[side]) return Promise.resolve();
    if (maxHp) this.maxHp[side] = maxHp;
    const from = this.hpShown[side];
    const dur = clamp((Math.abs(to - from) / Math.max(1, this.maxHp[side])) * 1.6, 0.25, 1.2);
    return tweens.tween(dur, (t) => { this.hpShown[side] = lerp(from, to, t); this.renderHp(side); }, Ease.outCubic);
  }

  async animateXp(c, before, levels) {
    if (this.creature.player !== c) return;
    const bar = () => $('.bp-xp i', this.panels.player);
    const run = (a, b, d) => tweens.tween(d, (t) => { const el = bar(); if (el) el.style.width = `${lerp(a, b, t) * 100}%`; }, Ease.inOutSine);
    this.audio.play('xp');
    let start = before.progress;
    for (let i = 0; i < levels; i++) { await run(start, 1, 0.5); start = 0; }
    await run(start, c.xpProgress, 0.6);
  }

  abilityBanner(side, name) {
    const b = this.bannerEl;
    b.textContent = name;
    b.className = `ability-banner ${side} show`;
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(() => { b.className = `ability-banner ${side}`; }, 1600);
  }

  // ── Messages ───────────────────────────────────────────────────────
  cancelMessage() {
    this.msgToken = (this.msgToken || 0) + 1;
    if (this.typing) { this.nav.remove(this.typing.menu); this.typing.resolve(); this.typing = null; }
    if (this.pending) { this.nav.remove(this.pending.menu); this.pending.resolve(); this.pending = null; }
  }

  message(text, { wait = true } = {}) {
    this.cancelMessage();
    this.el.hidden = false;
    this.bottom.hidden = false;
    const token = this.msgToken;
    this.msgBox.classList.remove('ready');
    this.textEl.textContent = '';
    return new Promise((resolve) => {
      const typed = new Promise((res) => {
        const menu = { handle: (a) => { if ((a === 'confirm' || a === 'cancel') && this.typing) this.typing.shown = text.length; return true; } };
        this.typing = { text, shown: 0, last: 0, resolve: res, menu };
        this.nav.push(menu);
      });
      typed.then(() => {
        if (token !== this.msgToken) { resolve(); return; }
        if (!wait) { sleep(0.2).then(resolve); return; }
        this.msgBox.classList.add('ready');
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          if (this.pending?.menu === menu) { this.nav.remove(menu); this.pending = null; }
          resolve();
        };
        const menu = { handle: (a) => { if (a === 'confirm' || a === 'cancel') { this.audio.play('move'); finish(); } return true; } };
        this.pending = { menu, resolve: finish };
        this.nav.push(menu);
        sleep(1.1 + text.length * 0.014).then(finish);
      });
    });
  }

  messageOnly(text) { return this.message(text); }

  prompt(text) {
    this.cancelMessage();
    this.msgBox.classList.remove('ready');
    this.textEl.textContent = text;
  }

  update(dt) {
    const t = this.typing;
    if (!t) return;
    t.shown = Math.min(t.text.length, t.shown + dt * this.speed * 1.2);
    const n = Math.floor(t.shown);
    if (n !== t.last) {
      this.textEl.textContent = t.text.slice(0, n);
      if (t.text[n - 1] && t.text[n - 1] !== ' ' && n % 2 === 0) this.audio.play('blip');
      t.last = n;
    }
    if (n >= t.text.length) {
      this.textEl.textContent = t.text;
      this.typing = null;
      this.nav.remove(t.menu);
      t.resolve();
    }
  }

  // ── Menus ──────────────────────────────────────────────────────────
  chooseAction({ canRun = true } = {}) {
    return new Promise((resolve) => {
      const defs = [['fight', 'Attaque', 'atk'], ['bag', 'Sac', 'bag'], ['team', 'Lumins', 'team'], ['run', 'Fuite', 'run']];
      this.actionsEl.innerHTML = '';
      const items = defs.map(([id, label, ico]) => h('button', { class: `btn act-${ico}${id === 'run' && !canRun ? ' is-dim' : ''}`, type: 'button' }, h('span', { class: 'lbl' }, h('i', { class: 'ico' }), label)));
      this.actionsEl.append(...items);
      this.actionsEl.hidden = false;
      const menu = this.nav.push({
        items, cols: 2, index: this.lastAction || 0,
        onSelect: (i) => { this.lastAction = i; this.nav.remove(menu); this.actionsEl.hidden = true; resolve(defs[i][0]); },
      });
    });
  }

  chooseMove(c, enemy) {
    return new Promise((resolve) => {
      this.movesEl.innerHTML = '';
      const items = c.moves.map((mv) => {
        const m = MOVES[mv.id];
        const t = TYPES[m.type];
        const mult = m.cat !== 'St' && enemy ? effectiveness(m.type, enemy.types, m) : 1;
        const eff = m.cat === 'St' ? '' : mult === 0 ? '<span class="eff none">Sans effet</span>' : mult > 1 ? '<span class="eff up">Super efficace</span>' : mult < 1 ? '<span class="eff down">Peu efficace</span>' : '';
        const pp = mv.pp / mv.ppMax;
        return h('button', { class: `btn move-btn${mv.pp <= 0 ? ' is-disabled' : ''}`, type: 'button', style: `--tc:${t.color}`, html: `
          <span class="mv-name">${escapeHtml(m.name)}</span>
          <span class="type-chip" style="background:${t.color}">${t.name}</span>
          <span class="mv-meta"><span class="cat cat-${m.cat}">${categoryLabel(m.cat)}</span>${m.power ? `<span>Puiss. ${m.power}</span>` : ''}<span class="acc">Préc. ${m.acc || '—'}</span><span class="pp ${pp <= 0.25 ? 'low' : pp <= 0.5 ? 'mid' : ''}">PP ${mv.pp}/${mv.ppMax}</span>${eff}</span>` });
      });
      const back = h('button', { class: 'btn btn-ghost move-back', type: 'button' }, 'Retour');
      this.movesEl.append(...items, back);
      this.movesEl.hidden = false;
      const all = [...items, back];
      const close = (v) => { this.nav.remove(menu); this.movesEl.hidden = true; resolve(v); };
      const menu = this.nav.push({
        items: all, cols: 2, index: Math.min(this.lastMove || 0, items.length - 1),
        onSelect: (i) => { if (i >= items.length) close(null); else { this.lastMove = i; close(i); } },
        onCancel: () => close(null),
      });
    });
  }

  openSheet(title, rightLabel = '') {
    this.sheetEl.innerHTML = '';
    const list = h('div', { class: 'sheet-list' });
    const panel = h('div', { class: 'sheet-panel shard' }, h('div', { class: 'sheet-title' }, title, rightLabel ? h('small', {}, rightLabel) : null), list);
    this.sheetEl.append(panel);
    this.sheetEl.hidden = false;
    return { panel, list };
  }

  closeSheet() { this.sheetEl.hidden = true; this.sheetEl.innerHTML = ''; }

  chooseFromList({ title, items: defs, cancel = true }) {
    return new Promise((resolve) => {
      const { panel, list } = this.openSheet(title);
      const items = defs.map((d) => h('button', { class: `btn${d.disabled ? ' is-disabled' : ''}`, type: 'button' },
        h('span', { class: 'lbl' }, d.color ? h('i', { class: 'item-dot', style: `background:${d.color}` }) : null, h('span', {}, d.label, d.sub ? h('span', { class: 'btn-sub' }, d.sub) : null)),
        d.right ? h('span', { class: 'btn-right' }, d.right) : null));
      list.append(...items);
      let back = null;
      if (cancel) { back = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Retour'); panel.append(back); }
      const all = back ? [...items, back] : items;
      const close = (v) => { this.nav.remove(menu); this.closeSheet(); resolve(v); };
      const menu = this.nav.push({ items: all, onSelect: (i) => close(i >= items.length ? null : i), onCancel: cancel ? () => close(null) : null });
    });
  }

  chooseCreature(team, { title, check = () => null, cancel = true }) {
    return new Promise((resolve) => {
      const { panel, list } = this.openSheet(title);
      const items = team.map((c, i) => {
        const why = check(c, i);
        const r = c.maxHp ? c.hp / c.maxHp : 0;
        return h('button', { class: `btn mon-btn${why ? ' is-disabled' : ''}${c.hp <= 0 ? ' ko' : ''}`, type: 'button', html: `
          ${this.ui.portraitHtml(c.species, c.shiny)}
          <span class="mon-mid">
            <span class="mon-top"><span>${escapeHtml(c.name)}${genderMark(c.gender)}</span><span class="lvl">N.${c.level}</span>${statusChip(c.status)}</span>
            <span class="mon-hp"><span class="hpbar"><i class="${hpClass(r)}" style="width:${r * 100}%"></i></span><span>${c.hp}/${c.maxHp}</span></span>
          </span>
          <span class="why">${why || ''}</span>` });
      });
      list.append(...items);
      let back = null;
      if (cancel) { back = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Retour'); panel.append(back); }
      const all = back ? [...items, back] : items;
      const close = (v) => { this.nav.remove(menu); this.closeSheet(); resolve(v); };
      const menu = this.nav.push({ items: all, onSelect: (i) => close(i >= items.length ? null : i), onCancel: cancel ? () => close(null) : null });
    });
  }

  askYesNo(text) {
    this.prompt(text);
    return new Promise((resolve) => {
      this.actionsEl.innerHTML = '';
      const items = ['Oui', 'Non'].map((l) => h('button', { class: 'btn', type: 'button' }, l));
      this.actionsEl.append(...items);
      this.actionsEl.hidden = false;
      const close = (v) => { this.nav.remove(menu); this.actionsEl.hidden = true; resolve(v); };
      const menu = this.nav.push({ items, cols: 2, onSelect: (i) => close(i === 0), onCancel: () => close(false) });
    });
  }

  showLevelUp(c, ev) {
    return new Promise((resolve) => {
      const el = this.levelEl;
      el.innerHTML = `<h4>${escapeHtml(c.name)} · Niveau ${ev.level}</h4>${STATS.map((s) => `<div class="row"><span>${STAT_SHORT[s]}</span><span>${ev.stats[s]}</span><b>+${ev.gains[s]}</b></div>`).join('')}`;
      el.hidden = false;
      const close = () => { this.nav.remove(menu); el.hidden = true; resolve(); };
      const menu = this.nav.push({ handle: (a) => { if (a === 'confirm' || a === 'cancel') close(); return true; } });
      setTimeout(() => { if (!el.hidden) close(); }, 3500);
    });
  }
}
