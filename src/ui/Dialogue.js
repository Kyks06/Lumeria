import { GAME } from '../config/game.js';
import { $, h } from '../core/utils.js';

/**
 * BOÎTE DE DIALOGUE : texte lettre par lettre, nom du locuteur, choix (Oui/Non ou liste).
 * Confirmer pendant l'écriture affiche tout le texte ; confirmer ensuite passe à la suite.
 */
export class Dialogue {
  constructor(ui) {
    this.ui = ui;
    this.el = $('#dialogue');
    this.box = $('.dlg-box', this.el);
    this.nameEl = $('#dlg-name');
    this.textEl = $('#dlg-text');
    this.choicesEl = $('#dlg-choices');
    this.typing = null;
    this.box.addEventListener('click', () => this.ui.nav.handle('confirm'));
  }

  get open() { return !this.el.hidden; }
  get speed() { return GAME.textSpeed[this.ui.game.settings.textSpeed] || 55; }

  /** Affiche des répliques. opts.choices → renvoie l'index choisi. */
  async say(name, lines, opts = {}) {
    const list = Array.isArray(lines) ? lines : [lines];
    this.el.hidden = false;
    this.nameEl.textContent = name || '';
    let result;
    for (let i = 0; i < list.length; i++) {
      const last = i === list.length - 1;
      await this.type(list[i]);
      if (last && opts.choices) result = await this.choose(opts.choices, opts.cancelIndex ?? opts.choices.length - 1);
      else await this.waitConfirm();
    }
    if (!opts.keepOpen) this.hide();
    return result;
  }

  type(text) {
    return new Promise((resolve) => {
      this.full = text;
      this.shown = 0;
      this.lastCount = 0;
      this.box.classList.remove('ready');
      this.textEl.textContent = '';
      const menu = { handle: (a) => { if (a === 'confirm' || a === 'cancel') this.shown = this.full.length; return true; } };
      this.typing = { resolve, menu };
      this.ui.nav.push(menu);
    });
  }

  waitConfirm() {
    return new Promise((resolve) => {
      const menu = {
        handle: (a) => {
          if (a === 'confirm' || a === 'cancel') { this.ui.nav.remove(menu); this.ui.audio.play('move'); resolve(); }
          return true;
        },
      };
      this.ui.nav.push(menu);
    });
  }

  choose(choices, cancelIndex) {
    return new Promise((resolve) => {
      this.choicesEl.innerHTML = '';
      const vertical = choices.length > 3;
      this.choicesEl.classList.toggle('vertical', vertical);
      const items = choices.map((c) => h('button', { class: 'btn', type: 'button' }, c));
      this.choicesEl.append(...items);
      const done = (i) => { this.ui.nav.remove(menu); this.choicesEl.innerHTML = ''; resolve(i); };
      const menu = this.ui.nav.push({ items, cols: vertical ? 1 : items.length, index: 0, onSelect: (i) => done(i), onCancel: () => done(cancelIndex) });
    });
  }

  update(dt) {
    if (!this.typing) return;
    this.shown = Math.min(this.full.length, this.shown + dt * this.speed);
    const n = Math.floor(this.shown);
    if (n !== this.lastCount) {
      this.textEl.textContent = this.full.slice(0, n);
      if (this.full[n - 1] && this.full[n - 1] !== ' ' && n % 2 === 0) this.ui.audio.play('blip');
      this.lastCount = n;
    }
    if (n >= this.full.length) {
      this.textEl.textContent = this.full;
      const { resolve, menu } = this.typing;
      this.typing = null;
      this.ui.nav.remove(menu);
      this.box.classList.add('ready');
      resolve();
    }
  }

  hide() {
    this.el.hidden = true;
    this.choicesEl.innerHTML = '';
  }
}
