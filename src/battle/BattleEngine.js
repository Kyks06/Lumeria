import { MOVES } from '../config/moves.js';
import { ITEMS } from '../config/items.js';
import { ABILITIES } from '../config/abilities.js';
import { TYPES, effectiveness, effectivenessText } from '../config/types.js';
import { evYield } from './Creature.js';

/**
 * MOTEUR DE COMBAT (logique pure, sans affichage).
 * Chaque appel renvoie une liste d'événements que la scène de combat joue dans l'ordre :
 *  msg · send · recall · move · damage · heal · status · cure · stat · faint · weather · ability · item · ball · exp · levelup · learnPrompt
 * États : 'choose' (le joueur choisit) · 'forceSwitch' (remplacer un Lumin K.O.) · 'offerSwitch' (style Choix) · 'end'
 */

const STAGE = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
const ACC_STAGE = (s) => (s >= 0 ? (3 + s) / 3 : 3 / (3 - s));
const STAT_FR = { atk: "L'Attaque", def: 'La Défense', spa: "L'Atq. Spé.", spd: 'La Déf. Spé.', spe: 'La Vitesse', acc: 'La Précision', eva: "L'Esquive" };
const STATUS_TXT = {
  brn: ['est brûlé !', 'est déjà brûlé.'],
  psn: ['est empoisonné !', 'est déjà empoisonné.'],
  tox: ['est gravement empoisonné !', 'est déjà empoisonné.'],
  par: ['est paralysé ! Il aura du mal à attaquer.', 'est déjà paralysé.'],
  slp: ["s'endort !", 'dort déjà.'],
  frz: ['est gelé !', 'est déjà gelé.'],
};
const WEATHER_TXT = {
  sun: ['Le soleil brille intensément !', 'Le soleil tape fort.', 'Le soleil se voile.'],
  rain: ['Il commence à pleuvoir !', 'La pluie continue de tomber.', 'La pluie s\'arrête.'],
  sand: ['Une tempête de sable se lève !', 'La tempête de sable fait rage.', 'La tempête de sable se calme.'],
  snow: ['Il commence à neiger !', 'La neige continue de tomber.', 'La neige s\'arrête.'],
};

const freshVolatile = () => ({
  stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
  confuse: 0, flinch: false, leech: false, protect: false, protectCount: 0, trap: 0,
  charging: null, toxN: 1, moved: false, turnsIn: 0, lastMove: null,
});

class Side {
  constructor(team, isPlayer) {
    this.team = team;
    this.isPlayer = isPlayer;
    this.active = Math.max(0, team.findIndex((c) => c.canBattle));
    this.v = freshVolatile();
    this.participants = new Set();
    this.switches = 0;
  }
  get mon() { return this.team[this.active]; }
  hasOthers() { return this.team.some((c, i) => i !== this.active && c.canBattle); }
  alive() { return this.team.filter((c) => c.canBattle); }
}

export class Battle {
  /**
   * @param o { kind:'wild'|'trainer', playerTeam, foeTeam, trainer, aiLevel, foeItems, weather, isNight, isDark,
   *            bag, expShare, expMult, levelCap, style:'choix'|'fixe', canCatch, playerName, rng }
   */
  constructor(o) {
    this.o = o;
    this.kind = o.kind;
    this.rng = o.rng || Math.random;
    this.P = new Side(o.playerTeam, true);
    this.F = new Side(o.foeTeam, false);
    this.trainer = o.trainer || null;
    this.aiLevel = o.aiLevel ?? (o.kind === 'wild' ? 0 : 2);
    this.foeItems = [...(o.foeItems || [])];
    this.fieldWeather = o.weather || null;
    this.weather = o.weather ? { type: o.weather, turns: Infinity } : null;
    this.turnCount = 0;
    this.runAttempts = 0;
    this.state = 'choose';
    this.outcome = null;
    this.caught = null;
    this.ev = [];
    this.pendingFoe = null;
    this.expLog = new Map();
    this.leveled = new Set();
    this.faintedPlayer = new Set();
  }

  // ── Utilitaires ────────────────────────────────────────────────────
  r() { return this.rng(); }
  chance(p) { return this.r() * 100 < p; }
  emit(type, data = {}) { this.ev.push({ type, ...data }); }
  say(text) { this.emit('msg', { text }); }
  other(side) { return side === this.P ? this.F : this.P; }
  sideName(side) { return side === this.P ? 'player' : 'enemy'; }
  label(side, mon = side.mon) {
    if (side === this.P) return mon.name;
    return this.kind === 'wild' ? `${mon.name} sauvage` : `${mon.name} ennemi`;
  }
  flush() { const e = this.ev; this.ev = []; return e; }
  hasAbility(side, ab) { return side.mon.ability === ab; }
  heldId(mon) { return mon.item ? ITEMS[mon.item]?.held : null; }

  // ── Démarrage ──────────────────────────────────────────────────────
  start() {
    const F = this.F, P = this.P;
    if (this.kind === 'wild') {
      this.emit('send', { side: 'enemy', mon: F.mon, wild: true });
    } else {
      this.emit('send', { side: 'enemy', mon: F.mon });
    }
    this.emit('send', { side: 'player', mon: P.mon });
    P.participants.add(P.mon);
    if (this.weather) this.say(WEATHER_TXT[this.weather.type][1]);
    this.onEntry(F);
    this.onEntry(P);
    this.state = 'choose';
    return this.flush();
  }

  onEntry(side) {
    const mon = side.mon;
    side.v = freshVolatile();
    const ab = mon.ability;
    const foe = this.other(side);
    if (ab === 'intimidation' && foe.mon?.canBattle) {
      this.emit('ability', { side: this.sideName(side), ability: ab });
      this.say(`${ABILITIES[ab].name} de ${this.label(side)} !`);
      this.changeStats(foe, { atk: -1 }, true);
    }
    const wmap = { secheresse: 'sun', crachin: 'rain', sablevolant: 'sand', alerteneige: 'snow' };
    if (wmap[ab]) {
      this.emit('ability', { side: this.sideName(side), ability: ab });
      this.setWeather(wmap[ab]);
    }
  }

  setWeather(type) {
    if (this.weather?.type === type && this.weather.turns === Infinity) return;
    this.weather = { type, turns: 5 };
    this.emit('weather', { weather: type });
    this.say(WEATHER_TXT[type][0]);
  }

  // ── Interface joueur ───────────────────────────────────────────────
  usableMoves() {
    return this.P.mon.moves.map((m, i) => ({ ...m, index: i, usable: m.pp > 0 }));
  }

  canEscape() { return this.kind === 'wild' && !this.P.v.trap; }
  canSwitch() { return !this.P.v.trap && !this.P.v.charging && this.P.hasOthers(); }

  /** action : { type:'move', index } | { type:'switch', index } | { type:'item', id, target, moveIndex } | { type:'run' } */
  submit(action) {
    if (this.state !== 'choose') return [];
    this.turnCount++;
    const P = this.P, F = this.F;
    if (P.v.charging) action = { type: 'move', index: P.v.charging.index, forced: true };
    if (action.type === 'move' && !action.forced) {
      const m = P.mon.moves[action.index];
      if (!m || m.pp <= 0) action = P.mon.moves.some((x) => x.pp > 0) ? { type: 'move', index: P.mon.moves.findIndex((x) => x.pp > 0) } : { type: 'struggle' };
    }
    if (action.type === 'move' && P.mon.moves.every((x) => x.pp <= 0)) action = { type: 'struggle' };
    const foeAction = this.chooseFoeAction();

    const acts = [{ side: P, a: action }, { side: F, a: foeAction }];
    const bracket = (x) => (x.a.type === 'run' ? 10 : x.a.type === 'item' || x.a.type === 'ball' ? 9 : x.a.type === 'switch' ? 8 : 0);
    const prio = (x) => {
      if (x.a.type === 'struggle') return 0;
      if (x.a.type !== 'move') return 0;
      return MOVES[x.side.mon.moves[x.a.index]?.id]?.prio || 0;
    };
    const quick = new Map(acts.map((x) => [x, this.heldId(x.side.mon) === 'quickclaw' && this.chance(20)]));
    acts.sort((a, b) => {
      const d = bracket(b) - bracket(a) || prio(b) - prio(a);
      if (d) return d;
      const q = (quick.get(b) ? 1 : 0) - (quick.get(a) ? 1 : 0);
      if (q) return q;
      const sa = this.speedOf(a.side), sb = this.speedOf(b.side);
      return sb - sa || (this.r() < 0.5 ? -1 : 1);
    });

    P.v.moved = false;
    F.v.moved = false;
    for (const x of acts) {
      if (this.outcome) break;
      const side = x.side;
      if (!side.mon.canBattle) continue;
      if (quick.get(x) && x.a.type === 'move') this.say(`La Vive Griffe de ${this.label(side)} lui permet d'agir en premier !`);
      this.doAction(side, x.a);
      side.v.moved = true;
      this.checkFaints();
      if (this.outcome) break;
    }
    if (!this.outcome) this.endOfTurn();
    this.checkFaints();
    this.resolveState();
    return this.flush();
  }

  doAction(side, a) {
    switch (a.type) {
      case 'run': this.tryRun(); break;
      case 'item': this.useItem(side, a); break;
      case 'switch': this.switchTo(side, a.index, false); break;
      case 'struggle': this.useMove(side, 'lutte', -1); break;
      case 'move': this.useMove(side, side.mon.moves[a.index]?.id, a.index); break;
      default: break;
    }
  }

  // ── Fuite ──────────────────────────────────────────────────────────
  tryRun() {
    this.runAttempts++;
    if (this.kind !== 'wild') { this.say('Impossible de fuir un combat de dresseur !'); return; }
    if (this.P.v.trap) { this.say(`${this.label(this.P)} est piégé et ne peut pas fuir !`); return; }
    const ps = this.P.mon.stats.spe, fs = Math.max(1, this.F.mon.stats.spe);
    const odds = ((ps * 128) / fs + 30 * this.runAttempts) % 256;
    if (ps >= fs || this.r() * 256 < odds) {
      this.emit('run');
      this.say('Vous prenez la fuite !');
      this.outcome = 'run';
    } else {
      this.say('Impossible de fuir !');
    }
  }

  // ── Changement de Lumin ────────────────────────────────────────────
  switchTo(side, index, forced) {
    const old = side.mon;
    if (!forced && old.canBattle) {
      this.onExit(side);
      this.emit('recall', { side: this.sideName(side), mon: old });
      if (side === this.P) this.say(`Reviens, ${old.name} !`);
      else this.say(`${this.trainer?.name || 'Le dresseur'} rappelle ${old.name} !`);
    }
    side.active = index;
    side.switches++;
    const mon = side.mon;
    if (side === this.P) {
      this.say(`À toi, ${mon.name} !`);
      this.P.participants.add(mon);
    } else {
      this.say(`${this.trainer?.name || 'Le dresseur'} envoie ${mon.name} !`);
      this.P.participants = new Set([this.P.mon].filter((c) => c.canBattle));
    }
    this.emit('send', { side: this.sideName(side), mon });
    this.onEntry(side);
  }

  onExit(side) {
    const mon = side.mon;
    if (mon.ability === 'mediconature' && mon.status) { mon.status = null; mon.statusTurns = 0; }
    if (mon.ability === 'regeneration' && mon.canBattle) mon.hp = Math.min(mon.maxHp, mon.hp + Math.floor(mon.maxHp / 3));
    side.v = freshVolatile();
  }

  // ── Objets ─────────────────────────────────────────────────────────
  useItem(side, a) {
    const it = ITEMS[a.id];
    if (!it) return;
    if (side === this.F) {
      const mon = side.mon;
      this.say(`${this.trainer?.name || 'Le dresseur'} utilise ${it.name} !`);
      const before = mon.hp;
      if (it.heal === 'full') mon.hp = mon.maxHp; else mon.hp = Math.min(mon.maxHp, mon.hp + (it.heal || 0));
      if (it.cure) { mon.status = null; mon.statusTurns = 0; }
      this.emit('heal', { side: 'enemy', amount: mon.hp - before, hp: mon.hp, mon, source: 'item' });
      return;
    }
    const bag = this.o.bag || {};
    if (it.ball !== undefined) { this.throwBall(a.id); return; }
    if ((bag[a.id] || 0) <= 0) return;
    bag[a.id]--;
    if (it.battleStat) {
      this.say(`Vous utilisez ${it.name}.`);
      this.changeStats(this.P, { [it.battleStat]: 2 }, false);
      return;
    }
    const mon = this.P.team[a.target ?? this.P.active];
    this.say(`Vous utilisez ${it.name} sur ${mon.name}.`);
    const isActive = mon === this.P.mon;
    if (it.revive) {
      mon.hp = Math.max(1, Math.floor(mon.maxHp * it.revive));
      mon.status = null;
      this.say(`${mon.name} reprend connaissance !`);
      return;
    }
    if (it.heal) {
      const before = mon.hp;
      mon.hp = it.heal === 'full' ? mon.maxHp : Math.min(mon.maxHp, mon.hp + it.heal);
      if (isActive) this.emit('heal', { side: 'player', amount: mon.hp - before, hp: mon.hp, mon, source: 'item' });
      this.say(`${mon.name} récupère ${mon.hp - before} PV.`);
    }
    if (it.cure && mon.status && (it.cure === 'all' || it.cure.includes(mon.status))) {
      this.emit('cure', { side: isActive ? 'player' : null, status: mon.status });
      this.say(`${mon.name} est guéri !`);
      mon.status = null;
      mon.statusTurns = 0;
      if (isActive && it.cure === 'all') this.P.v.confuse = 0;
    }
    if (it.pp) {
      const list = it.ppOne ? [mon.moves[a.moveIndex ?? 0]] : mon.moves;
      for (const m of list) if (m) m.pp = Math.min(m.ppMax, m.pp + it.pp);
      this.say('Les PP sont restaurés.');
    }
  }

  throwBall(ballId) {
    const it = ITEMS[ballId];
    const bag = this.o.bag || {};
    if (this.kind !== 'wild') {
      this.emit('ballBlocked');
      this.say('Le dresseur dévie le Prisme ! Voler les Lumins des autres, c\'est mal !');
      return;
    }
    if (this.o.canCatch === false) {
      this.say(this.o.cantCatchReason || 'Vous ne pouvez pas capturer ce Lumin.');
      return;
    }
    if ((bag[ballId] || 0) <= 0) return;
    bag[ballId]--;
    const mon = this.F.mon;
    let mult = it.ball;
    switch (it.special) {
      case 'quick': if (this.turnCount <= 1) mult = 5; break;
      case 'dusk': if (this.o.isNight || this.o.isDark) mult = 3.5; break;
      case 'net': if (mon.types.includes('eau') || mon.types.includes('insecte')) mult = 3.5; break;
      case 'timer': mult = Math.min(4, 1 + this.turnCount * 0.3); break;
      default: break;
    }
    this.say(`Vous lancez un ${it.name} !`);
    let shakes = 0;
    let success = false;
    if (it.special === 'master') { shakes = 3; success = true; } else {
      const statusBonus = mon.status === 'slp' || mon.status === 'frz' ? 2.5 : mon.status ? 1.5 : 1;
      const a = ((3 * mon.maxHp - 2 * mon.hp) * mon.def.catch * mult) / (3 * mon.maxHp) * statusBonus;
      if (a >= 255) { shakes = 3; success = true; } else {
        const b = 1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a)));
        let ok = 0;
        for (let i = 0; i < 4; i++) if (this.r() * 65536 < b) ok++; else break;
        success = ok === 4;
        shakes = Math.min(3, ok);
      }
    }
    this.emit('ball', { item: ballId, shakes, success, mon });
    if (success) {
      this.say(`Et hop ! ${mon.name} est capturé !`);
      mon.ball = ballId;
      if (it.special === 'heal') mon.heal();
      if (it.special === 'friend') mon.friendship = 200;
      this.caught = mon;
      this.awardExp(mon);
      this.outcome = 'caught';
    } else {
      this.say(['Oh non ! Le Lumin s\'est libéré !', 'Raaah ! Presque !', 'Argh ! Il y était presque !', 'Mince ! Si près du but !'][shakes]);
    }
  }

  // ── Statistiques ───────────────────────────────────────────────────
  speedOf(side) {
    const mon = side.mon;
    let s = mon.stats.spe * STAGE(side.v.stages.spe);
    if (mon.status === 'par') s *= 0.5;
    const w = this.weather?.type;
    const ab = mon.ability;
    if ((ab === 'chlorophylle' && w === 'sun') || (ab === 'glissade' && w === 'rain') || (ab === 'baignesable' && w === 'sand') || (ab === 'chasseneige' && w === 'snow')) s *= 2;
    return s;
  }

  changeStats(side, changes, fromFoe, silentFail = false) {
    const mon = side.mon;
    const applied = {};
    for (const [k, n] of Object.entries(changes)) {
      if (fromFoe && n < 0 && k === 'acc' && mon.ability === 'regardvif') { this.say(`${ABILITIES.regardvif.name} empêche la baisse de précision !`); continue; }
      const cur = side.v.stages[k];
      const next = Math.max(-6, Math.min(6, cur + n));
      if (next === cur) {
        if (!silentFail) this.say(`${STAT_FR[k]} de ${this.label(side)} ne peut plus ${n > 0 ? 'augmenter' : 'baisser'} !`);
        continue;
      }
      side.v.stages[k] = next;
      applied[k] = next - cur;
      const d = Math.abs(next - cur);
      const word = n > 0 ? (d >= 2 ? 'augmente beaucoup' : 'augmente') : (d >= 2 ? 'baisse beaucoup' : 'baisse');
      this.say(`${STAT_FR[k]} de ${this.label(side)} ${word} !`);
    }
    if (Object.keys(applied).length) this.emit('stat', { side: this.sideName(side), changes: applied });
  }

  canStatus(side, st) {
    const mon = side.mon;
    if (!mon.canBattle || mon.status) return false;
    const t = mon.types;
    if (st === 'brn' && t.includes('feu')) return false;
    if ((st === 'psn' || st === 'tox') && (t.includes('toxine') || t.includes('metal') || mon.ability === 'immunite')) return false;
    if (st === 'par' && t.includes('foudre')) return false;
    if (st === 'frz' && (t.includes('glace') || this.weather?.type === 'sun')) return false;
    if (st === 'slp' && mon.ability === 'insomnie') return false;
    return true;
  }

  inflict(side, st, fromMove = true) {
    if (!this.canStatus(side, st)) {
      if (fromMove === 'status') {
        if (side.mon.status) this.say(`${this.label(side)} ${STATUS_TXT[side.mon.status][1]}`);
        else this.say(`Ça n'affecte pas ${this.label(side)}…`);
      }
      return false;
    }
    const mon = side.mon;
    mon.status = st;
    mon.statusTurns = st === 'slp' ? 1 + Math.floor(this.r() * 3) : 0;
    if (st === 'tox') side.v.toxN = 1;
    this.emit('status', { side: this.sideName(side), status: st });
    this.say(`${this.label(side)} ${STATUS_TXT[st][0]}`);
    this.berryCure(side);
    return true;
  }

  berryCure(side) {
    const mon = side.mon;
    const h = this.heldId(mon);
    if (!mon.status) return;
    if (h === 'berry_cure' || (h === 'berry_par' && mon.status === 'par')) {
      this.emit('item', { side: this.sideName(side), item: mon.item });
      this.say(`${this.label(side)} mange sa ${ITEMS[mon.item].name} et guérit !`);
      mon.status = null;
      mon.item = null;
    }
  }

  // ── Attaques ───────────────────────────────────────────────────────
  useMove(side, moveId, index) {
    const user = side.mon;
    const tSide = this.other(side);
    const v = side.v;
    const move = MOVES[moveId];
    if (!move) return;

    // Statuts qui empêchent d'agir
    if (v.flinch) { v.flinch = false; this.say(`${this.label(side)} a peur et ne peut pas attaquer !`); v.charging = null; return; }
    if (user.status === 'slp') {
      if (user.statusTurns <= 0) {
        user.status = null;
        this.emit('cure', { side: this.sideName(side), status: 'slp' });
        this.say(`${this.label(side)} se réveille !`);
      } else {
        user.statusTurns--;
        this.emit('sleeping', { side: this.sideName(side) });
        this.say(`${this.label(side)} dort profondément.`);
        v.charging = null;
        return;
      }
    }
    if (user.status === 'frz') {
      if (this.chance(20) || move.type === 'feu') {
        user.status = null;
        this.emit('cure', { side: this.sideName(side), status: 'frz' });
        this.say(`${this.label(side)} n'est plus gelé !`);
      } else {
        this.say(`${this.label(side)} est gelé et ne peut pas bouger !`);
        return;
      }
    }
    if (v.confuse > 0) {
      v.confuse--;
      if (v.confuse === 0) {
        this.say(`${this.label(side)} n'est plus confus !`);
      } else {
        this.emit('confused', { side: this.sideName(side) });
        this.say(`${this.label(side)} est confus…`);
        if (this.chance(33)) {
          const dmg = Math.max(1, Math.floor((Math.floor((2 * user.level) / 5 + 2) * 40 * (user.stats.atk / user.stats.def)) / 50 + 2));
          this.applyDamage(side, dmg, { source: 'confusion' });
          this.say('Il se blesse dans sa confusion !');
          return;
        }
      }
    }
    if (user.status === 'par' && this.chance(25)) {
      this.emit('paralyzed', { side: this.sideName(side) });
      this.say(`${this.label(side)} est paralysé ! Il ne peut pas attaquer !`);
      v.charging = null;
      return;
    }

    // Charge (attaque en deux tours)
    if (move.charge && !v.charging && this.weather?.type !== move.charge) {
      const slot = user.moves[index];
      if (slot) slot.pp = Math.max(0, slot.pp - 1);
      v.charging = { index, moveId };
      this.emit('charge', { side: this.sideName(side), move: moveId });
      this.say(`${this.label(side)} absorbe la lumière !`);
      return;
    }
    const wasCharging = !!v.charging;
    v.charging = null;

    // PP
    if (index >= 0 && !wasCharging) {
      const slot = user.moves[index];
      const cost = tSide.mon.ability === 'pression' ? 2 : 1;
      if (slot) {
        slot.pp = Math.max(0, slot.pp - cost);
        if (slot.pp === 0 && this.heldId(user) === 'berry_pp') {
          slot.pp = Math.min(slot.ppMax, 10);
          this.say(`${this.label(side)} mange sa Baie Mepo et récupère des PP !`);
          user.item = null;
        }
      }
    }
    if (moveId === 'lutte') this.say(`${this.label(side)} n'a plus d'attaques !`);
    this.say(`${this.label(side)} utilise ${move.name} !`);
    v.lastMove = moveId;

    const targetsFoe = move.cat !== 'St' || move.foe || (move.st && !move.self) || move.confuse || move.leech;
    if (!move.protect) v.protectCount = 0;

    // Protection
    if (targetsFoe && tSide.v.protect && moveId !== 'lutte') {
      this.emit('move', { side: this.sideName(side), move: moveId, hit: false, target: this.sideName(tSide) });
      this.say(`${this.label(tSide)} se protège !`);
      return;
    }

    // Précision
    if (targetsFoe && move.acc > 0) {
      const stage = Math.max(-6, Math.min(6, v.stages.acc - tSide.v.stages.eva));
      let acc = move.acc * ACC_STAGE(stage);
      if (user.ability === 'echauffement' && move.cat === 'P') acc *= 0.8;
      if (move.id === 'fulgurance' || move.id === 'ouragan') {
        if (this.weather?.type === 'rain') acc = 999;
        if (this.weather?.type === 'sun') acc *= 0.6;
      }
      if (move.id === 'blizzard' && this.weather?.type === 'snow') acc = 999;
      if (this.r() * 100 >= acc) {
        this.emit('move', { side: this.sideName(side), move: moveId, hit: false, target: this.sideName(tSide) });
        this.say(`${this.label(tSide)} évite l'attaque !`);
        return;
      }
    }

    if (move.cat === 'St') { this.statusMove(side, tSide, move); return; }
    this.damagingMove(side, tSide, move);
  }

  /** Multiplicateur de type en tenant compte des talents. Renvoie { mult, absorbed }. */
  typeCheck(side, tSide, move) {
    const def = tSide.mon;
    const ab = def.ability;
    if (move.ground && ab === 'levitation') return { mult: 0, absorbed: 'levitation' };
    if (move.type === 'eau' && ab === 'absorbeau') return { mult: 0, absorbed: ab };
    if (move.type === 'foudre' && ab === 'absorbvolt') return { mult: 0, absorbed: ab };
    if (move.type === 'feu' && ab === 'torche') return { mult: 0, absorbed: ab };
    if (move.type === 'plante' && ab === 'herbivore') return { mult: 0, absorbed: ab };
    if (move.id === 'lutte') return { mult: 1 };
    return { mult: effectiveness(move.type, def.types, move) };
  }

  /** Calcul des dégâts. opts : { crit, roll } (roll = 0.85 à 1). */
  calcDamage(side, tSide, move, opts = {}) {
    const att = side.mon, def = tSide.mon;
    const phys = move.cat === 'P';
    const aStat = phys ? 'atk' : 'spa', dStat = phys ? 'def' : 'spd';
    let aStage = side.v.stages[aStat], dStage = tSide.v.stages[dStat];
    if (opts.crit) { aStage = Math.max(0, aStage); dStage = Math.min(0, dStage); }
    let A = att.stats[aStat] * STAGE(aStage);
    let D = def.stats[dStat] * STAGE(dStage);
    if (phys && att.ability === 'forcepure') A *= 2;
    if (phys && att.ability === 'cran' && att.status) A *= 1.5;
    if (att.ability === 'echauffement' && phys) A *= 1.3;
    if (this.weather?.type === 'sand' && !phys && def.types.includes('roche')) D *= 1.5;
    if (this.weather?.type === 'snow' && phys && def.types.includes('glace')) D *= 1.5;
    let power = move.power;
    if (move.facade && att.status) power *= 2;
    if (att.ability === 'technicien' && power <= 60) power *= 1.5;
    if (move.fixed === 'level') return { dmg: att.level, mult: 1, crit: false };
    let dmg = Math.floor(Math.floor((Math.floor((2 * att.level) / 5 + 2) * power * A) / D) / 50) + 2;
    const w = this.weather?.type;
    if (w === 'sun') { if (move.type === 'feu') dmg *= 1.5; if (move.type === 'eau') dmg *= 0.5; }
    if (w === 'rain') { if (move.type === 'eau') dmg *= 1.5; if (move.type === 'feu') dmg *= 0.5; }
    if (opts.crit) dmg *= 1.5;
    dmg *= opts.roll ?? 1;
    if (att.types.includes(move.type)) dmg *= att.ability === 'adaptabilite' ? 2 : 1.5;
    const { mult } = this.typeCheck(side, tSide, move);
    dmg *= mult;
    if (phys && att.status === 'brn' && att.ability !== 'cran') dmg *= 0.5;
    const pinch = { brasier: 'feu', torrent: 'eau', engrais: 'plante', essaim: 'insecte', survolt: 'foudre', coeurdegivre: 'glace', coeurdepierre: 'roche', fouisseur: 'sol', tourbillon: 'vent', virulence: 'toxine', revenant: 'spectre', forgeron: 'metal', sangdragon: 'dragon', crepuscule: 'ombre', aurore: 'lumiere', gravite: 'astral' }[att.ability];
    if (pinch === move.type && att.hp <= att.maxHp / 3) dmg *= 1.5;
    if (def.ability === 'isograisse' && (move.type === 'feu' || move.type === 'glace')) dmg *= 0.5;
    if (def.ability === 'filtre' && mult > 1) dmg *= 0.75;
    if (side.v.torche && move.type === 'feu') dmg *= 1.5;
    const h = this.heldId(att);
    if (h === 'boost' && ITEMS[att.item].boost === move.type) dmg *= 1.2;
    if (h === 'lifeorb') dmg *= 1.3;
    if (h === 'expertbelt' && mult > 1) dmg *= 1.2;
    return { dmg: mult === 0 ? 0 : Math.max(1, Math.floor(dmg)), mult, crit: !!opts.crit };
  }

  damagingMove(side, tSide, move) {
    const user = side.mon;
    const target = tSide.mon;
    const tc = this.typeCheck(side, tSide, move);
    this.emit('move', { side: this.sideName(side), move: move.id, hit: true, target: this.sideName(tSide), mult: tc.mult });
    if (tc.absorbed) {
      this.emit('ability', { side: this.sideName(tSide), ability: tc.absorbed });
      if (tc.absorbed === 'levitation') { this.say(`${this.label(tSide)} lévite et évite l'attaque !`); return; }
      if (tc.absorbed === 'torche') { tSide.v.torche = true; this.say(`${ABILITIES.torche.name} de ${this.label(tSide)} renforce ses attaques Feu !`); return; }
      if (tc.absorbed === 'herbivore') { this.say(`${ABILITIES.herbivore.name} de ${this.label(tSide)} !`); this.changeStats(tSide, { atk: 1 }, false); return; }
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + Math.floor(target.maxHp / 4));
      this.emit('heal', { side: this.sideName(tSide), amount: target.hp - before, hp: target.hp, mon: target, source: 'ability' });
      this.say(`${ABILITIES[tc.absorbed].name} de ${this.label(tSide)} le soigne !`);
      return;
    }
    if (tc.mult === 0) { this.say(`Ça n'affecte pas ${this.label(tSide)}…`); return; }

    const hits = move.hits ? move.hits[0] + Math.floor(this.r() * (move.hits[1] - move.hits[0] + 1)) : 1;
    let total = 0, n = 0, lastCrit = false, mult = 1;
    for (let i = 0; i < hits; i++) {
      if (!target.canBattle) break;
      let critStage = (move.crit ? 1 : 0) + (user.ability === 'chanceux' ? 1 : 0);
      const critChance = [1 / 24, 1 / 8, 1 / 2, 1][Math.min(3, critStage)];
      const crit = target.ability !== 'carapacecoque' && this.r() < critChance;
      const r = this.calcDamage(side, tSide, move, { crit, roll: 0.85 + this.r() * 0.15 });
      let dmg = r.dmg;
      mult = r.mult;
      lastCrit = crit;
      // Fermeté / Bandeau Ultime
      if (dmg >= target.hp && target.hp === target.maxHp) {
        if (target.ability === 'fermete') { dmg = target.hp - 1; this.applyDamage(tSide, dmg, { mult, crit, moveType: move.type, source: 'move', move: move.id }); this.say(`${this.label(tSide)} tient bon grâce à Fermeté !`); total += dmg; n++; continue; }
        if (this.heldId(target) === 'sash') { dmg = target.hp - 1; this.applyDamage(tSide, dmg, { mult, crit, moveType: move.type, source: 'move', move: move.id }); this.say(`${this.label(tSide)} tient bon grâce à son Bandeau Ultime !`); target.item = null; total += dmg; n++; continue; }
      }
      this.applyDamage(tSide, dmg, { mult, crit, moveType: move.type, source: 'move', move: move.id });
      total += dmg;
      n++;
      if (crit) this.say('Coup critique !');
      // Talents de contact
      if (move.cat === 'P' && !move.nc && user.canBattle) {
        const ab = target.ability;
        if (ab === 'statik' && this.chance(30)) { this.emit('ability', { side: this.sideName(tSide), ability: ab }); this.inflict(side, 'par', false); }
        if (ab === 'pointpoison' && this.chance(30)) { this.emit('ability', { side: this.sideName(tSide), ability: ab }); this.inflict(side, 'psn', false); }
        if (ab === 'corpsardent' && this.chance(30)) { this.emit('ability', { side: this.sideName(tSide), ability: ab }); this.inflict(side, 'brn', false); }
        if (ab === 'peaudure') {
          const d = Math.max(1, Math.floor(user.maxHp / 8));
          this.applyDamage(side, d, { source: 'ability' });
          this.say(`${this.label(side)} est blessé par Peau Rugueuse !`);
        }
      }
      if (!user.canBattle) break;
    }
    if (hits > 1) this.say(`Touché ${n} fois !`);
    const et = effectivenessText(mult);
    if (et && n > 0) this.say(et);
    if (target.status === 'frz' && move.type === 'feu' && target.canBattle) {
      target.status = null;
      this.emit('cure', { side: this.sideName(tSide), status: 'frz' });
      this.say(`${this.label(tSide)} dégèle !`);
    }
    // Drain / contrecoup / Orbe Vie
    if (move.drain && total > 0 && user.canBattle) {
      const h = Math.max(1, Math.floor(total * move.drain));
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + h);
      this.emit('heal', { side: this.sideName(side), amount: user.hp - before, hp: user.hp, mon: user, source: 'drain' });
      this.say(`L'énergie de ${this.label(tSide)} est drainée !`);
    }
    if (move.recoil && total > 0 && user.canBattle && user.ability !== 'tetederoc') {
      const d = Math.max(1, Math.floor(total * move.recoil));
      this.applyDamage(side, d, { source: 'recoil' });
      this.say(`${this.label(side)} subit le contrecoup !`);
    }
    if (this.heldId(user) === 'lifeorb' && total > 0 && user.canBattle) {
      this.applyDamage(side, Math.max(1, Math.floor(user.maxHp / 10)), { source: 'item' });
      this.say(`${this.label(side)} perd des PV à cause de l'Orbe Vie.`);
    }
    // Effets secondaires
    if (target.canBattle && total > 0 && target.ability !== 'ecranpoudre') {
      if (move.st && this.chance(move.st[1])) this.inflict(tSide, move.st[0], false);
      if (move.foe && this.chance(move.foe[1])) this.changeStats(tSide, move.foe[0], true, true);
      if (move.flinch && !tSide.v.moved && this.chance(move.flinch)) tSide.v.flinch = true;
      if (move.confuse && !tSide.v.confuse && this.chance(move.confuse)) { tSide.v.confuse = 2 + Math.floor(this.r() * 4); this.say(`${this.label(tSide)} devient confus !`); }
      if (move.trap && !tSide.v.trap) { tSide.v.trap = 4 + Math.floor(this.r() * 2); this.say(`${this.label(tSide)} est piégé !`); }
    }
    if (move.self && user.canBattle && this.chance(move.self[1])) this.changeStats(side, move.self[0], false, true);
    if (!target.canBattle && user.canBattle && user.ability === 'acharnement') this.changeStats(side, { atk: 1 }, false, true);
    this.berryHeal(tSide);
    this.berryHeal(side);
  }

  statusMove(side, tSide, move) {
    const user = side.mon;
    this.emit('move', { side: this.sideName(side), move: move.id, hit: true, target: this.sideName(move.self || move.heal || move.weather || move.protect || move.rest ? side : tSide), status: true });
    if (move.protect) {
      if (side.v.protectCount > 0 && this.r() > 1 / (3 ** side.v.protectCount)) { this.say('Mais cela échoue !'); side.v.protectCount = 0; return; }
      side.v.protect = true;
      side.v.protectCount++;
      this.say(`${this.label(side)} se protège !`);
      return;
    }
    if (move.weather) {
      if (this.weather?.type === move.weather && this.weather.turns !== Infinity) { this.say('Mais cela échoue !'); return; }
      this.setWeather(move.weather);
      return;
    }
    if (move.rest) {
      if (user.hp >= user.maxHp) { this.say('Mais cela échoue !'); return; }
      user.status = 'slp';
      user.statusTurns = 2;
      const before = user.hp;
      user.hp = user.maxHp;
      this.emit('status', { side: this.sideName(side), status: 'slp' });
      this.emit('heal', { side: this.sideName(side), amount: user.hp - before, hp: user.hp, mon: user, source: 'move' });
      this.say(`${this.label(side)} s'endort et récupère tous ses PV !`);
      return;
    }
    if (move.heal) {
      if (user.hp >= user.maxHp) { this.say(`Mais les PV de ${this.label(side)} sont déjà au maximum !`); return; }
      let ratio = move.heal;
      if (move.id === 'photosynthese') ratio = this.weather?.type === 'sun' ? 2 / 3 : this.weather ? 0.25 : 0.5;
      const before = user.hp;
      user.hp = Math.min(user.maxHp, user.hp + Math.ceil(user.maxHp * ratio));
      this.emit('heal', { side: this.sideName(side), amount: user.hp - before, hp: user.hp, mon: user, source: 'move' });
      this.say(`${this.label(side)} récupère des PV !`);
      return;
    }
    if (move.haze) {
      this.P.v.stages = freshVolatile().stages;
      this.F.v.stages = freshVolatile().stages;
      this.emit('haze');
      this.say('Toutes les modifications de statistiques sont annulées !');
      return;
    }
    if (move.leech) {
      if (tSide.mon.types.includes('plante') || tSide.v.leech) { this.say(`Ça n'affecte pas ${this.label(tSide)}…`); return; }
      tSide.v.leech = true;
      this.say(`${this.label(tSide)} est infecté par une graine !`);
      return;
    }
    let did = false;
    if (move.st) {
      const st = move.st[0];
      if (move.type === 'plante' && tSide.mon.types.includes('plante')) { this.say(`Ça n'affecte pas ${this.label(tSide)}…`); return; }
      if (st === 'par' && move.type === 'foudre' && tSide.mon.types.includes('roche')) { this.say(`Ça n'affecte pas ${this.label(tSide)}…`); return; }
      did = this.inflict(tSide, st, 'status') || did;
    }
    if (move.confuse) {
      if (tSide.v.confuse) this.say(`${this.label(tSide)} est déjà confus !`);
      else { tSide.v.confuse = 2 + Math.floor(this.r() * 4); this.emit('confusedStart', { side: this.sideName(tSide) }); this.say(`${this.label(tSide)} devient confus !`); did = true; }
    }
    if (move.foe) { this.changeStats(tSide, move.foe[0], true); did = true; }
    if (move.self) { this.changeStats(side, move.self[0], false); did = true; }
    if (!did && !move.st && !move.confuse) this.say('Mais rien ne se passe…');
  }

  applyDamage(side, dmg, info = {}) {
    const mon = side.mon;
    const before = mon.hp;
    mon.hp = Math.max(0, mon.hp - Math.floor(dmg));
    this.emit('damage', { side: this.sideName(side), amount: before - mon.hp, hp: mon.hp, maxHp: mon.maxHp, mon, ...info });
  }

  berryHeal(side) {
    const mon = side.mon;
    if (!mon.canBattle || mon.hp > mon.maxHp / 2) return;
    const h = this.heldId(mon);
    if (h !== 'berry_heal' && h !== 'berry_sitrus') return;
    const amount = h === 'berry_sitrus' ? Math.floor(mon.maxHp / 4) : ITEMS[mon.item].amount;
    const before = mon.hp;
    mon.hp = Math.min(mon.maxHp, mon.hp + amount);
    this.emit('item', { side: this.sideName(side), item: mon.item });
    this.emit('heal', { side: this.sideName(side), amount: mon.hp - before, hp: mon.hp, mon, source: 'item' });
    this.say(`${this.label(side)} mange sa ${ITEMS[mon.item].name} et récupère des PV !`);
    mon.item = null;
  }

  // ── Fin de tour ────────────────────────────────────────────────────
  endOfTurn() {
    const w = this.weather;
    if (w) {
      if (w.turns !== Infinity) w.turns--;
      if (w.turns <= 0) {
        this.say(WEATHER_TXT[w.type][2]);
        this.weather = this.fieldWeather ? { type: this.fieldWeather, turns: Infinity } : null;
        this.emit('weather', { weather: this.weather?.type || null });
      } else {
        this.emit('weatherTick', { weather: w.type });
        for (const side of [this.P, this.F]) {
          const mon = side.mon;
          if (!mon.canBattle) continue;
          if (w.type === 'sand' && !mon.types.some((t) => t === 'roche' || t === 'metal' || t === 'sol') && mon.ability !== 'baignesable') {
            this.applyDamage(side, Math.max(1, Math.floor(mon.maxHp / 16)), { source: 'weather' });
            this.say(`${this.label(side)} est blessé par la tempête de sable !`);
          }
          if (w.type === 'snow' && !mon.types.includes('glace') && mon.ability !== 'chasseneige' && mon.ability !== 'isograisse') {
            this.applyDamage(side, Math.max(1, Math.floor(mon.maxHp / 16)), { source: 'weather' });
            this.say(`${this.label(side)} est blessé par la neige !`);
          }
        }
      }
    }
    for (const side of [this.P, this.F]) {
      const mon = side.mon;
      if (!mon.canBattle) continue;
      const v = side.v;
      if (this.heldId(mon) === 'leftovers' && mon.hp < mon.maxHp) {
        const before = mon.hp;
        mon.hp = Math.min(mon.maxHp, mon.hp + Math.max(1, Math.floor(mon.maxHp / 16)));
        this.emit('heal', { side: this.sideName(side), amount: mon.hp - before, hp: mon.hp, mon, source: 'item' });
        this.say(`${this.label(side)} récupère un peu de PV grâce aux Restes.`);
      }
      if (mon.status === 'brn') { this.applyDamage(side, Math.max(1, Math.floor(mon.maxHp / 16)), { source: 'status', status: 'brn' }); this.say(`${this.label(side)} souffre de sa brûlure !`); }
      if (mon.status === 'psn') { this.applyDamage(side, Math.max(1, Math.floor(mon.maxHp / 8)), { source: 'status', status: 'psn' }); this.say(`${this.label(side)} souffre du poison !`); }
      if (mon.status === 'tox') { this.applyDamage(side, Math.max(1, Math.floor((mon.maxHp * v.toxN) / 16)), { source: 'status', status: 'tox' }); v.toxN = Math.min(15, v.toxN + 1); this.say(`${this.label(side)} souffre du poison !`); }
      if (v.leech && mon.canBattle) {
        const other = this.other(side);
        const d = Math.max(1, Math.floor(mon.maxHp / 8));
        this.applyDamage(side, d, { source: 'leech' });
        this.say(`La graine draine l'énergie de ${this.label(side)} !`);
        if (other.mon.canBattle) {
          const before = other.mon.hp;
          other.mon.hp = Math.min(other.mon.maxHp, other.mon.hp + d);
          this.emit('heal', { side: this.sideName(other), amount: other.mon.hp - before, hp: other.mon.hp, mon: other.mon, source: 'leech' });
        }
      }
      if (v.trap > 0 && mon.canBattle) {
        v.trap--;
        this.applyDamage(side, Math.max(1, Math.floor(mon.maxHp / 8)), { source: 'trap' });
        this.say(v.trap > 0 ? `${this.label(side)} est blessé par le piège !` : `${this.label(side)} se libère du piège !`);
      }
      if (mon.ability === 'turbo' && mon.canBattle && v.turnsIn > 0) this.changeStats(side, { spe: 1 }, false, true);
      v.flinch = false;
      v.protect = false;
      v.turnsIn++;
      this.berryHeal(side);
    }
  }

  // ── K.O. et suite ──────────────────────────────────────────────────
  checkFaints() {
    for (const side of [this.F, this.P]) {
      const mon = side.mon;
      if (mon.hp <= 0 && !mon._faintAnnounced) {
        mon._faintAnnounced = true;
        mon.status = null;
        this.emit('faint', { side: this.sideName(side), mon });
        this.say(`${this.label(side)} est K.O. !`);
        if (side === this.F) {
          this.awardExp(mon);
        } else {
          mon.friendship = Math.max(0, mon.friendship - 1);
          this.faintedPlayer.add(mon);
          this.P.participants.delete(mon);
        }
      }
    }
  }

  resolveState() {
    if (this.outcome) { this.finish(); return; }
    const pDown = !this.P.mon.canBattle, fDown = !this.F.mon.canBattle;
    if (pDown && !this.P.alive().length) { this.outcome = 'lose'; this.finish(); return; }
    if (fDown) {
      if (this.kind === 'wild' || !this.F.alive().length) { this.outcome = 'win'; this.finish(); return; }
      this.pendingFoe = this.pickReplacement();
    }
    if (pDown) { this.state = 'forceSwitch'; return; }
    if (this.pendingFoe !== null) {
      const next = this.F.team[this.pendingFoe];
      if (this.o.style !== 'fixe' && this.P.hasOthers()) {
        this.state = 'offerSwitch';
        this.say(`${this.trainer?.name || 'Le dresseur'} va envoyer ${next.name}.`);
        this.emit('offer', { next });
        return;
      }
      this.sendPendingFoe();
    }
    this.state = 'choose';
  }

  sendPendingFoe() {
    const idx = this.pendingFoe;
    this.pendingFoe = null;
    this.F.active = idx;
    this.say(`${this.trainer?.name || 'Le dresseur'} envoie ${this.F.mon.name} !`);
    this.emit('send', { side: 'enemy', mon: this.F.mon });
    this.P.participants = new Set([this.P.mon].filter((c) => c.canBattle));
    this.onEntry(this.F);
  }

  /** Le joueur remplace un Lumin K.O. */
  chooseReplacement(index) {
    if (this.state !== 'forceSwitch') return [];
    this.P.active = index;
    this.say(`À toi, ${this.P.mon.name} !`);
    this.emit('send', { side: 'player', mon: this.P.mon });
    this.P.participants.add(this.P.mon);
    this.onEntry(this.P);
    if (this.pendingFoe !== null) this.sendPendingFoe();
    this.state = 'choose';
    return this.flush();
  }

  /** Réponse à l'offre de changement (style Choix) : index ou null. */
  respondOffer(index) {
    if (this.state !== 'offerSwitch') return [];
    if (index !== null && index !== undefined && index !== this.P.active) this.switchTo(this.P, index, false);
    this.sendPendingFoe();
    this.state = 'choose';
    return this.flush();
  }

  finish() {
    this.state = 'end';
    this.emit('end', { outcome: this.outcome });
    for (const c of [...this.P.team, ...this.F.team]) delete c._faintAnnounced;
  }

  // ── Expérience ─────────────────────────────────────────────────────
  awardExp(defeated) {
    const L = defeated.level;
    const trainerMult = this.kind === 'wild' ? 1 : 1.5;
    const yieldEv = evYield(defeated.def);
    const parts = this.P.participants;
    for (const mon of this.P.team) {
      if (!mon.canBattle || mon.level >= 100) continue;
      const isPart = parts.has(mon);
      if (!isPart && !this.o.expShare) continue;
      let exp = ((defeated.def.exp * L) / 5) * trainerMult * Math.pow((2 * L + 10) / (L + mon.level + 10), 2.5) + 1;
      if (!isPart) exp *= 0.5;
      if (this.heldId(mon) === 'luckyegg') exp *= 1.5;
      exp *= this.o.expMult || 1;
      exp = Math.floor(exp);
      for (const [s, n] of Object.entries(yieldEv)) mon.addEV(s, n);
      if (this.o.levelCap && mon.level >= this.o.levelCap) {
        if (isPart) this.say(`${mon.name} a atteint le plafond de niveau et ne gagne pas d'expérience.`);
        continue;
      }
      const from = { level: mon.level, progress: mon.xpProgress };
      const ups = mon.gainXp(exp);
      this.say(`${mon.name} gagne ${exp} points d'expérience${isPart ? '' : ' grâce au Multi Exp'} !`);
      this.emit('exp', { mon, amount: exp, from, levels: ups.length, active: mon === this.P.mon });
      for (const up of ups) {
        this.leveled.add(mon);
        this.emit('levelup', { mon, ...up, active: mon === this.P.mon });
        this.say(`${mon.name} monte au niveau ${up.level} !`);
        for (const mv of up.newMoves) {
          if (mon.moves.length < 4) {
            mon.learn(mv);
            this.say(`${mon.name} apprend ${MOVES[mv].name} !`);
          } else {
            this.emit('learnPrompt', { mon, move: mv });
          }
        }
        if (this.o.levelCap && mon.level >= this.o.levelCap) break;
      }
    }
  }

  // ── IA ─────────────────────────────────────────────────────────────
  estimate(attSide, defSide, move) {
    if (!move || move.cat === 'St') return 0;
    const r = this.calcDamage(attSide, defSide, move, { roll: 0.925 });
    return r.dmg * (move.hits ? (move.hits[0] + move.hits[1]) / 2 : 1);
  }

  /** Meilleur pourcentage de dégâts que attSide peut infliger à defSide (0-1+). */
  bestPct(attSide, defSide) {
    let best = 0;
    for (const m of attSide.mon.moves) {
      const mv = MOVES[m.id];
      if (!mv || m.pp <= 0) continue;
      best = Math.max(best, this.estimate(attSide, defSide, mv) / Math.max(1, defSide.mon.hp));
    }
    return best;
  }

  withActive(side, index, fn) {
    const prevA = side.active, prevV = side.v;
    side.active = index;
    side.v = freshVolatile();
    const r = fn();
    side.active = prevA;
    side.v = prevV;
    return r;
  }

  pickReplacement() {
    const F = this.F;
    const options = F.team.map((c, i) => [c, i]).filter(([c, i]) => c.canBattle && i !== F.active);
    if (!options.length) return null;
    if (this.aiLevel < 2) return options[0][1];
    let best = options[0][1], bestScore = -Infinity;
    for (const [, i] of options) {
      const s = this.withActive(F, i, () => this.bestPct(F, this.P) - this.bestPct(this.P, F) * 0.8);
      if (s > bestScore) { bestScore = s; best = i; }
    }
    return best;
  }

  chooseFoeAction() {
    const F = this.F, P = this.P;
    const mon = F.mon;
    if (F.v.charging) return { type: 'move', index: F.v.charging.index, forced: true };
    const usable = mon.moves.map((m, i) => [m, i]).filter(([m]) => m.pp > 0);
    if (!usable.length) return { type: 'struggle' };
    if (this.kind === 'wild' || this.aiLevel === 0) {
      const weights = usable.map(([m]) => (MOVES[m.id].cat === 'St' ? 1 : 3));
      let r = this.r() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < usable.length; i++) { r -= weights[i]; if (r <= 0) return { type: 'move', index: usable[i][1] }; }
      return { type: 'move', index: usable[0][1] };
    }
    // Objets de soin
    if (this.foeItems.length && mon.hp < mon.maxHp * 0.25 && this.bestPct(F, P) < 1 && this.r() < 0.75) {
      const item = this.foeItems.shift();
      return { type: 'item', id: item };
    }
    // Changement tactique (IA experte)
    if (this.aiLevel >= 3 && F.switches < 2 && !F.v.trap && F.hasOthers()) {
      const threat = this.bestPct(P, F), offense = this.bestPct(F, P);
      if (threat >= 0.9 && offense < 0.35 && this.speedOf(P) > this.speedOf(F)) {
        let best = null, bestScore = 0.2;
        F.team.forEach((c, i) => {
          if (i === F.active || !c.canBattle) return;
          const s = this.withActive(F, i, () => {
            const t = this.bestPct(P, F);
            return t < 0.45 ? this.bestPct(F, P) - t * 0.5 : -1;
          });
          if (s > bestScore) { bestScore = s; best = i; }
        });
        if (best !== null && this.r() < 0.8) return { type: 'switch', index: best };
      }
    }
    // Évaluation des attaques
    const scored = usable.map(([m, i]) => [this.scoreMove(F, P, MOVES[m.id]), i]);
    scored.sort((a, b) => b[0] - a[0]);
    const greedy = this.aiLevel >= 3 ? 0.9 : 0.7;
    if (this.r() < greedy || scored.length === 1) return { type: 'move', index: scored[0][1] };
    const pool = scored.filter(([s]) => s > 0);
    const pick = pool.length ? pool[Math.floor(this.r() * pool.length)] : scored[0];
    return { type: 'move', index: pick[1] };
  }

  scoreMove(side, tSide, mv) {
    const me = side.mon, foe = tSide.mon;
    if (mv.cat !== 'St') {
      const tc = this.typeCheck(side, tSide, mv);
      if (tc.mult === 0) return -100;
      const pct = this.estimate(side, tSide, mv) / Math.max(1, foe.hp);
      let s = Math.min(pct, 1) * 100 * (mv.acc ? mv.acc / 100 : 1);
      if (pct >= 1) s += 50 + (mv.prio > 0 ? 40 : 0);
      if (mv.recoil) s -= 8;
      if (mv.charge && this.weather?.type !== 'sun') s *= 0.6;
      if (mv.self && mv.self[0].spa < 0) s -= 10;
      return s;
    }
    const v = side.v, tv = tSide.v;
    if (mv.heal) return me.hp < me.maxHp * 0.45 ? 95 : -20;
    if (mv.rest) return me.hp < me.maxHp * 0.35 ? 70 : -30;
    if (mv.protect) return v.protectCount ? -20 : 8;
    if (mv.weather) {
      if (this.weather?.type === mv.weather) return -30;
      const good = { sun: 'feu', rain: 'eau', sand: 'roche', snow: 'glace' }[mv.weather];
      return me.types.includes(good) ? 30 : -10;
    }
    if (mv.leech) return foe.types.includes('plante') || tv.leech ? -40 : 30;
    if (mv.haze) return Object.values(tv.stages).reduce((a, b) => a + Math.max(0, b), 0) >= 2 ? 45 : -20;
    let s = -10;
    if (mv.st) {
      if (!this.canStatus(tSide, mv.st[0])) return -50;
      s = { slp: 48, par: this.speedOf(tSide) > this.speedOf(side) ? 44 : 30, brn: foe.stats.atk > foe.stats.spa ? 42 : 25, tox: 38, psn: 28, frz: 40 }[mv.st[0]] || 25;
    }
    if (mv.confuse) s = Math.max(s, tv.confuse ? -30 : 24);
    if (mv.self) {
      const sum = Object.entries(mv.self[0]).reduce((a, [k, n]) => a + (v.stages[k] < 3 ? n : 0), 0);
      s = Math.max(s, me.hp > me.maxHp * 0.6 && sum > 0 ? 26 + sum * 6 : -10);
    }
    if (mv.foe && !mv.st) {
      const sum = Object.entries(mv.foe[0]).reduce((a, [k, n]) => a + (tv.stages[k] > -3 ? -n : 0), 0);
      s = Math.max(s, sum > 0 ? 12 + sum * 4 : -15);
    }
    return s;
  }
}
