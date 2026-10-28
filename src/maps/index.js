import * as ch1 from './ch1.js';
import * as ch2 from './ch2.js';
import * as ch3 from './ch3.js';
import * as ch4 from './ch4.js';
import * as ch5 from './ch5.js';
import * as post from './post.js';
import { assignEncounters } from './encounters.js';

/**
 * REGISTRE DES CARTES. Chaque fichier exporte des définitions ; l'identifiant des dresseurs
 * sans `id` est généré automatiquement (carte + numéro).
 */
export const MAPS = {};
for (const mod of [ch1, ch2, ch3, ch4, ch5, post]) {
  for (const def of Object.values(mod)) {
    if (!def || typeof def !== 'object' || !def.id) continue;
    MAPS[def.id] = def;
  }
}
/* Rencontres sauvages générées selon l'habitat de chaque Lumin (voir encounters.js). */
assignEncounters(MAPS);
for (const def of Object.values(MAPS)) {
  (def.trainers || []).forEach((t, i) => { if (!t.id) t.id = `${def.id}_t${i}`; });
  (def.npcs || []).forEach((n, i) => { if (!n.id) n.id = `${def.id}_n${i}`; });
}

/** Ordre de progression (sert au niveau des équipes générées et au Lumidex « habitat »). */
export const MAP_ORDER = ['clairvent', 'r1', 'sylvebourg', 'gym1', 'r2', 'portazur', 'entrepot', 'gym2', 'r3', 'mine', 'rocheval', 'gym3', 'r4', 'sablons', 'centrale', 'gym4', 'r5', 'brumevase', 'repaire', 'gym5', 'r6', 'col', 'givrecime', 'gym6', 'r7', 'cendrelave', 'gym7', 'sommet', 'r8', 'astralis', 'gym8', 'r9', 'victoire', 'ligue', 'conseil1', 'conseil2', 'conseil3', 'conseil4', 'conseil5', 'ile', 'grotteglace', 'pic', 'templevent', 'sanctuaire'];

/** Carte de la région (coordonnées sur une toile 1000 × 640) — villes et routes. */
export const REGION = {
  nodes: {
    clairvent: [140, 560], sylvebourg: [140, 380], portazur: [380, 380], rocheval: [380, 140], sablons: [600, 140],
    brumevase: [820, 140], givrecime: [820, 380], cendrelave: [820, 580], astralis: [600, 580], ligue: [480, 470], ile: [520, 300],
  },
  links: [
    ['r1', 'clairvent', 'sylvebourg'], ['r2', 'sylvebourg', 'portazur'], ['r3', 'portazur', 'mine'], ['mine', 'r3', 'rocheval'],
    ['r4', 'rocheval', 'sablons'], ['r5', 'sablons', 'brumevase'], ['r6', 'brumevase', 'col'], ['col', 'r6', 'givrecime'],
    ['r7', 'givrecime', 'cendrelave'], ['r8', 'cendrelave', 'astralis'], ['r9', 'astralis', 'victoire'], ['victoire', 'r9', 'ligue'],
  ],
  points: { mine: [380, 250], col: [820, 260], victoire: [540, 520], sommet: [920, 620], pic: [490, 110], templevent: [700, 640], grotteglace: [900, 300] },
};
