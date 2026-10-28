/**
 * Navigation unifiée des menus (clavier, manette, souris, tactile).
 * Pile de menus : seul le menu du dessus reçoit les actions.
 * Un menu = { items: HTMLElement[], index, cols, onSelect(i), onCancel(), onChange(i), handle(action) }
 */
export class Nav {
  constructor(audio) {
    this.audio = audio;
    this.stack = [];
  }

  get active() { return this.stack.length > 0; }
  top() { return this.stack[this.stack.length - 1] || null; }

  push(menu) {
    menu.index = Math.max(0, Math.min(menu.index ?? 0, (menu.items?.length || 1) - 1));
    if (menu.items) {
      if (menu.items[menu.index]?.classList.contains('is-disabled')) {
        const first = menu.items.findIndex((el) => !el.classList.contains('is-disabled'));
        if (first >= 0) menu.index = first;
      }
      this.bindPointer(menu);
    }
    this.stack.push(menu);
    if (menu.items) this.refresh(menu);
    return menu;
  }

  remove(menu) {
    const i = this.stack.indexOf(menu);
    if (i >= 0) this.stack.splice(i, 1);
    menu?.items?.forEach((el) => el.classList.remove('is-focus'));
  }

  clear() { this.stack.length = 0; }

  bindPointer(menu) {
    menu.items.forEach((el, i) => {
      el.tabIndex = -1;
      el.onpointerenter = (e) => { if (e.pointerType === 'mouse' && this.top() === menu && !el.classList.contains('is-disabled')) this.setIndex(menu, i, false); };
      el.onclick = (e) => {
        e.preventDefault();
        el.blur();
        if (this.top() !== menu) return;
        this.setIndex(menu, i, false);
        this.select(menu);
      };
    });
  }

  setIndex(menu, i, sound = true) {
    if (i === menu.index) return;
    menu.index = i;
    this.refresh(menu);
    if (sound) this.audio.play('move');
    menu.onChange?.(i);
  }

  refresh(menu) {
    menu.items.forEach((el, i) => el.classList.toggle('is-focus', i === menu.index));
    menu.items[menu.index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  select(menu) {
    const el = menu.items[menu.index];
    if (!el) return;
    if (el.classList.contains('is-disabled')) { this.audio.play('deny'); return; }
    this.audio.play('select');
    menu.onSelect?.(menu.index, el);
  }

  /** Traite une action ; renvoie true si un menu l'a consommée. */
  handle(action) {
    const m = this.top();
    if (!m) return false;
    if (m.handle && m.handle(action)) return true;
    if (!m.items) return ['confirm', 'cancel', 'up', 'down', 'left', 'right', 'pause'].includes(action);
    const n = m.items.length, cols = m.cols || 1;
    const i = m.index;
    switch (action) {
      case 'up': {
        if (cols === n && n > 1) return true;
        let j = i - cols;
        if (j < 0) j = cols === 1 ? n - 1 : Math.min(n - 1, i + cols * Math.floor((n - 1 - i) / cols));
        this.setIndex(m, j);
        return true;
      }
      case 'down': {
        if (cols === n && n > 1) return true;
        let j = i + cols;
        if (j >= n) j = cols === 1 ? 0 : i % cols;
        this.setIndex(m, j);
        return true;
      }
      case 'left':
        if (cols > 1) this.setIndex(m, (i - 1 + n) % n);
        else m.onLeft?.();
        return true;
      case 'right':
        if (cols > 1) this.setIndex(m, (i + 1) % n);
        else m.onRight?.();
        return true;
      case 'confirm':
        this.select(m);
        return true;
      case 'cancel':
        if (m.onCancel) { this.audio.play('back'); m.onCancel(); }
        return true;
      case 'pause':
        if (m.onPause) m.onPause();
        else if (m.onCancel) { this.audio.play('back'); m.onCancel(); }
        return true;
      default:
        return false;
    }
  }
}
