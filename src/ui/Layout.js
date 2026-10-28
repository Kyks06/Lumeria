/**
 * FORMAT TÉLÉPHONE ET TABLETTE
 * - Écran tactile tenu en portrait : « console » — l'image du jeu en haut, les commandes en bas
 *   (croix, A, B, Menu…). Les dialogues et les menus de combat s'affichent dans la zone des commandes.
 * - Écran tactile à l'horizontale : le jeu occupe tout l'écran, les commandes sont posées par-dessus.
 * - Ordinateur : inchangé.
 * Empêche aussi le zoom accidentel (pincement, double tap, champ de saisie) qui bloquait l'écran.
 */
export class Layout {
  constructor(input) {
    this.input = input;
    this.root = document.documentElement;
    this.mode = null;
    this.lockViewport();
    this.blockZoom();
    const update = () => this.update();
    addEventListener('resize', update);
    addEventListener('orientationchange', () => setTimeout(update, 120));
    window.visualViewport?.addEventListener('resize', () => { this.resetZoom(); update(); });
    input.on('device', update);
    update();
  }

  get touch() {
    return this.input.lastDevice === 'touch' || (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches);
  }

  update() {
    const portrait = innerHeight > innerWidth * 1.05;
    const mode = !this.touch ? 'desktop' : portrait ? 'console' : 'landscape';
    if (mode === this.mode) return;
    this.mode = mode;
    this.root.classList.toggle('layout-console', mode === 'console');
    this.root.classList.toggle('layout-landscape', mode === 'landscape');
    this.root.classList.toggle('layout-touch', mode !== 'desktop');
    this.root.dataset.layout = mode;
    dispatchEvent(new Event('lumeria-layout'));
  }

  /** Fige l'échelle de la page (y compris quand l'hôte a fourni sa propre balise viewport). */
  lockViewport() {
    const content = 'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover';
    let metas = [...document.querySelectorAll('meta[name="viewport"]')];
    if (!metas.length) { const m = document.createElement('meta'); m.name = 'viewport'; document.head.append(m); metas = [m]; }
    for (const m of metas) m.setAttribute('content', content);
    this.viewportContent = content;
  }

  /** Si un zoom a quand même eu lieu, on réapplique l'échelle 1. */
  resetZoom() {
    const vv = window.visualViewport;
    if (!vv || vv.scale <= 1.02) return;
    for (const m of document.querySelectorAll('meta[name="viewport"]')) {
      m.setAttribute('content', 'width=device-width, initial-scale=1.01, maximum-scale=1');
      setTimeout(() => m.setAttribute('content', this.viewportContent), 60);
    }
  }

  blockZoom() {
    const stop = (e) => e.preventDefault();
    // pincement (Safari iOS) et zoom à deux doigts
    for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, stop, { passive: false });
    document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    // double tap : bloqué par « touch-action » (voir css/mobile.css) sans retarder les clics
    document.addEventListener('dblclick', stop, { passive: false });
    // appui long : pas de menu contextuel ni de loupe
    document.addEventListener('contextmenu', (e) => { if (this.mode !== 'desktop') e.preventDefault(); });
  }
}
