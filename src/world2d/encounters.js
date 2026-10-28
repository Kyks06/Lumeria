import { randInt } from '../core/utils.js';

/** Tire une entrée pondérée dans une table [[espèce, nivMin, nivMax, poids, moment?], …]. */
export function rollEncounter(table, timeOfDay) {
  const list = (table || []).filter((e) => !e[4] || e[4] === timeOfDay);
  if (!list.length) return null;
  const tot = list.reduce((a, e) => a + (e[3] || 10), 0);
  let r = Math.random() * tot;
  for (const e of list) { r -= e[3] || 10; if (r <= 0) return { species: e[0], level: randInt(e[1], e[2]) }; }
  const e = list[0];
  return { species: e[0], level: randInt(e[1], e[2]) };
}
