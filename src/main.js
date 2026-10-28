import { Engine2D as Engine } from './core/Engine2D.js';
import { Input } from './core/Input.js';
import { AudioFX } from './core/Audio.js';
import { Music } from './core/Music.js';
import { Save } from './core/Save.js';
import { Game } from './game/Game.js';

/** Point d'entrée : crée le moteur, charge les ressources puis affiche l'écran titre. */
async function boot() {
  const label = document.getElementById('load-label');
  try {
    const settings = Save.loadSettings();
    const engine = new Engine(document.getElementById('game'), settings);
    const input = new Input(engine.renderer.domElement);
    const audio = new AudioFX();
    audio.setVolume(settings.sfx ?? 0.8);
    const music = new Music(audio, settings);
    const game = new Game(engine, input, audio, music, settings);
    window.lumeria = game;

    // Boucle principale (pas de temps borné pour rester stable si l'onglet ralentit)
    let last = performance.now();
    const frame = (now) => {
      const maxDt = window.__lumeriaMaxDt || 0.05;
      const dt = Math.min(maxDt, Math.max(0, (now - last) / 1000));
      last = now;
      try {
        game.update(dt);
        if (!window.__lumeriaNoRender) engine.render();
      } catch (e) {
        console.error(e);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    await game.boot();
  } catch (err) {
    console.error(err);
    if (label) {
      label.textContent = /WebGL/i.test(String(err))
        ? 'WebGL est indisponible : activez l\'accélération matérielle de votre navigateur.'
        : `Erreur au démarrage : ${err.message || err}`;
      label.style.color = '#ff8a7a';
    }
  }
}

boot();
