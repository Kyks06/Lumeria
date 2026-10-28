import { CREATURE_MAP } from '../config/creatures.js';
import { MOVES } from '../config/moves.js';
import { NATURE_IDS, natureMult, STATS } from '../config/natures.js';
import { LEARNSETS, defaultMoves, movesAtLevel } from '../config/learnsets.js';
import { ITEMS } from '../config/items.js';

/** Expérience totale nécessaire pour atteindre un niveau, selon la courbe de croissance. */
export function expForLevel(growth, n) {
  if (n <= 1) return 0;
  switch (growth) {
    case 'rapide': return Math.floor((4 * n ** 3) / 5);
    case 'parabolique': return Math.max(0, Math.floor((6 / 5) * n ** 3 - 15 * n ** 2 + 100 * n - 140));
    case 'lent': return Math.floor((5 * n ** 3) / 4);
    default: return n ** 3;
  }
}

export function calcStat(stat, base, iv, ev, level, nature) {
  if (stat === 'hp') return base === 1 ? 1 : Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMult(nature, stat));
}

/** Points d'effort donnés quand cette espèce est vaincue. */
export function evYield(sp) {
  const best = STATS.reduce((a, s) => (sp.base[s] > sp.base[a] ? s : a), 'hp');
  const n = sp.legendary ? 3 : sp.exp >= 200 ? 3 : sp.exp >= 130 ? 2 : 1;
  return { [best]: n };
}

let uidCounter = 0;
const newUid = () => `${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const rnd = (n) => Math.floor(Math.random() * n);

/** Un Lumin : statistiques, IV/EV, nature, talent, attaques avec PP, statut, amitié, objet tenu. */
export class Creature {
  constructor(o) {
    this.uid = o.uid || newUid();
    this.species = CREATURE_MAP[o.species]?.id || o.species; // anciens identifiants → nouvelles espèces
    this.level = o.level ?? 5;
    const def = this.def;
    this.xp = o.xp ?? expForLevel(def.growth, this.level);
    this.iv = o.iv || Object.fromEntries(STATS.map((s) => [s, rnd(32)]));
    this.ev = o.ev || Object.fromEntries(STATS.map((s) => [s, 0]));
    this.nature = o.nature || NATURE_IDS[rnd(NATURE_IDS.length)];
    this.ability = o.ability || def.ab[rnd(def.ab.length)];
    this.gender = o.gender !== undefined ? o.gender : (def.gender === null ? null : (Math.random() < def.gender ? 'm' : 'f'));
    this.shiny = !!o.shiny;
    this.nickname = o.nickname || null;
    this.item = o.item || null;
    this.status = o.status || null;
    this.statusTurns = o.statusTurns || 0;
    this.friendship = o.friendship ?? 70;
    this.ot = o.ot || null;
    this.ball = o.ball || 'prisme';
    this.met = o.met || null;
    this.egg = !!o.egg;
    this.eggCycles = o.eggCycles || 0;
    this.fainted = false;
    const mv = o.moves && o.moves.length ? o.moves : defaultMoves(this.species, this.level).map((id) => ({ id }));
    this.moves = mv.map((m) => (typeof m === 'string' ? { id: m } : m)).filter((m) => MOVES[m.id]).map((m) => {
      const max = m.ppMax ?? MOVES[m.id].pp;
      return { id: m.id, ppMax: max, pp: m.pp ?? max };
    });
    this.recalc();
    this.hp = o.hp ?? this.maxHp;
    if (this.hp <= 0 && !this.egg) this.hp = 0;
  }

  static create(speciesId, level, opts = {}) {
    const odds = opts.shinyOdds || 1024;
    const c = new Creature({ species: speciesId, level, shiny: opts.shiny ?? Math.random() < 1 / odds, ...opts.extra });
    if (opts.hiddenChance && CREATURE_MAP[speciesId].hid && Math.random() < opts.hiddenChance) c.ability = CREATURE_MAP[speciesId].hid;
    if (opts.perfectIvs) for (const s of STATS) c.iv[s] = Math.max(c.iv[s], opts.perfectIvs);
    c.recalc();
    c.hp = c.maxHp;
    return c;
  }

  static fromJSON(o) { return new Creature(o); }

  toJSON() {
    return {
      uid: this.uid, species: this.species, level: this.level, xp: this.xp, iv: this.iv, ev: this.ev, nature: this.nature,
      ability: this.ability, gender: this.gender, shiny: this.shiny, nickname: this.nickname, item: this.item, status: this.status,
      statusTurns: this.statusTurns, friendship: this.friendship, ot: this.ot, ball: this.ball, met: this.met, hp: this.hp,
      moves: this.moves.map((m) => ({ id: m.id, pp: m.pp, ppMax: m.ppMax })), egg: this.egg, eggCycles: this.eggCycles,
    };
  }

  get def() { return CREATURE_MAP[this.species]; }
  get name() { return this.egg ? 'Œuf' : (this.nickname || this.def.name); }
  get types() { return this.def.types; }
  get isFainted() { return !this.egg && this.hp <= 0; }
  get hpRatio() { return this.maxHp ? this.hp / this.maxHp : 0; }
  get canBattle() { return !this.egg && this.hp > 0; }

  recalc() {
    const b = this.def.base;
    this.stats = {};
    for (const s of STATS) this.stats[s] = calcStat(s, b[s], this.iv[s], this.ev[s], this.level, this.nature);
    const oldMax = this.maxHp;
    this.maxHp = this.stats.hp;
    if (oldMax && this.hp > 0) this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - oldMax));
  }

  heal() {
    if (this.egg) return;
    this.hp = this.maxHp;
    this.status = null;
    this.statusTurns = 0;
    for (const m of this.moves) m.pp = m.ppMax;
  }

  get xpThis() { return expForLevel(this.def.growth, this.level); }
  get xpNext() { return expForLevel(this.def.growth, this.level + 1); }
  get xpToNext() { return Math.max(0, this.xpNext - this.xp); }
  get xpProgress() {
    if (this.level >= 100) return 1;
    return Math.max(0, Math.min(1, (this.xp - this.xpThis) / (this.xpNext - this.xpThis)));
  }

  /** Ajoute de l'XP ; renvoie la liste des montées de niveau. */
  gainXp(amount) {
    const events = [];
    if (this.level >= 100) return events;
    this.xp += Math.max(1, Math.floor(amount));
    while (this.level < 100 && this.xp >= this.xpNext) {
      const before = { ...this.stats };
      this.level++;
      this.recalc();
      this.friendship = Math.min(255, this.friendship + (this.friendship < 100 ? 5 : this.friendship < 200 ? 3 : 2));
      const gains = {};
      for (const s of STATS) gains[s] = this.stats[s] - before[s];
      events.push({ level: this.level, gains, stats: { ...this.stats }, newMoves: movesAtLevel(this.species, this.level).filter((m) => !this.knows(m)) });
    }
    if (this.level >= 100) this.xp = this.xpThis;
    return events;
  }

  addEV(stat, n) {
    const total = STATS.reduce((a, s) => a + this.ev[s], 0);
    const add = Math.max(0, Math.min(n, 252 - this.ev[stat], 510 - total));
    this.ev[stat] += add;
    return add;
  }

  knows(moveId) { return this.moves.some((m) => m.id === moveId); }

  learn(moveId, replaceIndex = -1) {
    if (this.knows(moveId) || !MOVES[moveId]) return false;
    const entry = { id: moveId, pp: MOVES[moveId].pp, ppMax: MOVES[moveId].pp };
    if (this.moves.length < 4) { this.moves.push(entry); return true; }
    if (replaceIndex >= 0 && replaceIndex < 4) { this.moves[replaceIndex] = entry; return true; }
    return false;
  }

  /** Évolution possible ? trigger = { type: 'level' | 'item' | 'friend', item, time } */
  evolutionFor(trigger = { type: 'level' }) {
    if (this.egg || this.item === 'pierre_immuable') return null;
    for (const e of this.def.evo) {
      if (!CREATURE_MAP[e.to]) continue;
      if (trigger.type === 'item') { if (e.item && e.item === trigger.item) return e.to; continue; }
      if (e.item) continue;
      if (e.friend) { if (this.friendship >= 220 && (!e.time || e.time === trigger.time)) return e.to; continue; }
      if (e.level && this.level >= e.level && (!e.time || e.time === trigger.time)) return e.to;
    }
    return null;
  }

  evolve(to) {
    const wasNamed = !!this.nickname;
    const hpLost = this.maxHp - this.hp;
    this.species = to;
    if (!this.def.ab.includes(this.ability) && this.ability !== this.def.hid) this.ability = this.def.ab[0];
    this.recalc();
    this.hp = Math.max(1, this.maxHp - hpLost);
    this.nickname = wasNamed ? this.nickname : null;
    return movesAtLevel(to, this.level).filter((m) => !this.knows(m));
  }

  get heldItem() { return this.item ? ITEMS[this.item] : null; }
}

export { LEARNSETS };
