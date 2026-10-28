/**
 * Petites aides pour écrire les cartes de façon compacte.
 * Rotation : 0 = regarde vers le sud (+z) · Math.PI = nord · Math.PI/2 = est · -Math.PI/2 = ouest
 */
export const N = Math.PI, S = 0, E = Math.PI / 2, O = -Math.PI / 2;

/** Dresseur : classe, nom, position, orientation, niveau de base, nombre de Lumins, options (team, sight, intro, defeat, after…). */
export const tr = (cls, name, x, z, rot, level, n = 2, o = {}) => ({ cls, name, x, z, rot, level, n, ...o });
/** Habitant : apparence, nom, position, orientation, répliques. */
export const pnj = (kind, name, x, z, rot, talk, o = {}) => ({ kind, name, x, z, rot, talk, ...o });
/** Lumin posé dans le décor (cri + réplique). */
export const lumin = (creature, x, z, rot, talk, o = {}) => ({ creature, name: '', x, z, rot, talk, ...o });
export const sign = (x, z, rot, title, text, o = {}) => ({ t: 'sign', x, z, rot, title, text, ...o });
export const prop = (t, x, z, rot = 0, o = {}) => ({ t, x, z, rot, ...o });
export const item = (x, z, it, qty = 1, o = {}) => ({ x, z, item: it, qty, ...o });
export const hidden = (x, z, it, qty = 1) => ({ x, z, item: it, qty, hidden: true });
/** Lampadaires le long d'une liste de points. */
export const lamps = (pts, style) => pts.map(([x, z]) => ({ t: 'lamp', x, z, style }));
/** Entrée de rencontre : [espèce, niv. min, niv. max, poids, moment ('day'|'night')] */
export const en = (sp, a, b, w = 10, time) => (time ? [sp, a, b, w, time] : [sp, a, b, w]);
