import { getBaker } from '../pixel/bake.js';
import { CREATURE_MAP } from '../config/creatures.js';

/**
 * PORTRAITS PIXEL ART DES LUMINS pour l'interface (équipe, Lumidex, PC…) : sprites « icône »
 * cuits depuis les modèles 3D (palette réduite, contour coloré), agrandis sans lissage.
 * Les images demandées avant d'être prêtes sont remplies dès que la cuisson est faite.
 */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export class Portraits {
  constructor(assets) {
    this.assets = assets;
    this.cache = new Map();
    this.queue = [];
    this.waiting = new Map();
    this.busy = false;
  }

  get baker() { return getBaker(this.assets); }
  key(id, shiny) { return shiny ? `${id}*` : id; }

  render(id, shiny = false) {
    if (!CREATURE_MAP[id]) return '';
    return this.baker.url(id, shiny, 'icon');
  }

  get(id, shiny = false) {
    const k = this.key(id, shiny);
    if (this.cache.has(k)) return this.cache.get(k);
    if (!this.waiting.has(k)) { this.waiting.set(k, true); this.queue.push([id, shiny]); this.pump(); }
    return BLANK;
  }

  img(id, shiny = false, cls = '') {
    const el = document.createElement('img');
    el.alt = '';
    el.className = `px-portrait${cls ? ` ${cls}` : ''}`;
    el.dataset.portrait = this.key(id, shiny);
    el.src = this.get(id, shiny);
    return el;
  }

  html(id, shiny = false, cls = '') {
    return `<img alt="" class="px-portrait ${cls}" data-portrait="${this.key(id, shiny)}" src="${this.get(id, shiny)}">`;
  }

  pump() {
    if (this.busy) return;
    this.busy = true;
    const step = () => {
      const t0 = performance.now();
      while (this.queue.length && performance.now() - t0 < 20) {
        const [id, shiny] = this.queue.shift();
        const k = this.key(id, shiny);
        try { this.cache.set(k, this.render(id, shiny)); } catch (e) { console.warn('Portrait', id, e); this.cache.set(k, ''); }
        this.waiting.delete(k);
        const url = this.cache.get(k);
        document.querySelectorAll(`img[data-portrait="${CSS.escape(k)}"]`).forEach((im) => { im.src = url; });
      }
      if (this.queue.length) requestAnimationFrame(step);
      else this.busy = false;
    };
    requestAnimationFrame(step);
  }

  warm(ids) { for (const id of ids) this.get(id); }
}
