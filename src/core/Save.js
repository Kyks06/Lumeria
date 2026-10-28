import { GAME, DEFAULT_SETTINGS } from '../config/game.js';

/** Sauvegarde locale (localStorage) — toutes les opérations tolèrent un stockage indisponible. */
export const Save = {
  exists() {
    try { return !!localStorage.getItem(GAME.saveKey); } catch { return false; }
  },

  load() {
    try {
      const raw = localStorage.getItem(GAME.saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  write(data) {
    try {
      localStorage.setItem(GAME.saveKey, JSON.stringify({ ...data, savedAt: Date.now(), version: GAME.version }));
      return true;
    } catch { return false; }
  },

  clear() {
    try { localStorage.removeItem(GAME.saveKey); } catch { /* stockage indisponible */ }
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(GAME.settingsKey);
      return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
    } catch { return { ...DEFAULT_SETTINGS }; }
  },

  writeSettings(s) {
    try { localStorage.setItem(GAME.settingsKey, JSON.stringify(s)); } catch { /* stockage indisponible */ }
  },
};
