import { GAME } from '../config/game.js';
import { CREATURE_MAP, baseForm } from '../config/creatures.js';
import { ITEMS } from '../config/items.js';
import { MOVES } from '../config/moves.js';
import { CHALLENGES } from '../config/challenges.js';
import { STATS } from '../config/natures.js';
import { canLearnTM, EGG_MOVES, movesAtLevel } from '../config/learnsets.js';
import { MAPS } from '../maps/index.js';
import { Creature } from '../battle/Creature.js';
import { towerTeam } from './Teams.js';
import { BP_SHOP } from '../config/shops.js';

/**
 * ÉQUIPE, PC, LUMIDEX, OBJETS, PENSION ET ŒUFS, DÉFIS, TOUR DE COMBAT, CHARGEMENT.
 * Méthodes ajoutées au prototype de Game.
 */
export const PartyMixin = {
  loadData(d) {
    const base = this.blankData();
    this.data = { ...base, ...d, stats: { ...base.stats, ...(d.stats || {}) }, dex: { ...base.dex, ...(d.dex || {}) }, daycare: { ...base.daycare, ...(d.daycare || {}) }, nuzlocke: { ...base.nuzlocke, ...(d.nuzlocke || {}) }, tower: { ...base.tower, ...(d.tower || {}) } };
    this.team = (d.team || []).map((o) => Creature.fromJSON(o));
    // anciennes sauvegardes : identifiants d'espèces renommés
    for (const k of ['seen', 'caught']) this.data.dex[k] = Object.fromEntries(Object.entries(this.data.dex[k] || {}).map(([id, v]) => [CREATURE_MAP[id]?.id || id, v]));
    if (!Array.isArray(this.data.boxes) || !this.data.boxes.length) this.data.boxes = base.boxes;
    this.player.setLook(this.data.look || 'garcon');
    this.sky.setHour(d.hour ?? GAME.startHour);
    if (d.mode === 'surf') this.pendingSurf = true;
  },

  healParty() {
    for (const c of this.team) {
      if (c.dead) continue;
      c.heal();
      c.fainted = false;
    }
  },

  /** Lumins autorisés à combattre (Nuzlocke, Monotype). */
  battleEligible(c) {
    if (c.egg || c.dead) return false;
    const R = this.data.rules || {};
    if (R.monotype && this.data.monoType && !c.types.includes(this.data.monoType)) return false;
    return true;
  },

  registerSeen(speciesId) { this.data.dex.seen[speciesId] = true; },

  registerCaught(c) {
    const first = !this.data.dex.caught[c.species];
    this.data.dex.seen[c.species] = true;
    this.data.dex.caught[c.species] = true;
    if (c.shiny) this.data.stats.shinies++;
    if (!this.data.monoType && this.data.rules?.monotype && !c.egg) this.data.monoType = c.types[0];
    return first;
  },

  /** Range un Lumin : équipe si place, sinon première case libre du PC. */
  async storeCreature(c, { silent = false } = {}) {
    if (this.team.length < GAME.maxTeam) { this.team.push(c); this.refreshHUD(); return 'team'; }
    for (let b = 0; b < this.data.boxes.length; b++) {
      const box = this.data.boxes[b];
      const i = box.indexOf(null);
      if (i >= 0) {
        box[i] = c.toJSON();
        if (!silent) await this.say(null, [`${c.name} a été envoyé dans la Boîte ${b + 1} du PC.`]);
        return 'pc';
      }
    }
    if (!silent) await this.say(null, ['Le PC est plein ! Le Lumin a été relâché…']);
    return 'lost';
  },

  removeFromParty(c) {
    const i = this.team.indexOf(c);
    if (i >= 0) this.team.splice(i, 1);
    this.refreshHUD();
  },

  pcCount() { return this.data.boxes.reduce((a, b) => a + b.filter(Boolean).length, 0); },

  // ── Pas : œufs, pension, amitié ────────────────────────────────────
  stepParty() {
    const D = this.data;
    const flame = this.team.some((c) => !c.egg && ['corpsardent', 'flammeche_vive'].includes(c.ability));
    const per = Math.max(1, Math.round(GAME.eggCycleMeters / GAME.stepMeters / (flame ? 2 : 1)));
    if (D.steps % per === 0) {
      for (const c of this.team) {
        if (!c.egg) continue;
        c.eggCycles--;
        if (c.eggCycles <= 0 && !this.hatching) { this.hatching = true; this.queueHatch(c); }
      }
    }
    if (D.steps % 128 === 0) for (const c of this.team) if (!c.egg) c.friendship = Math.min(255, c.friendship + 1);
    // Pension
    const dc = D.daycare;
    if (dc.mons.length) {
      dc.steps++;
      for (const m of dc.mons) m.xpGained = (m.xpGained || 0) + 1;
      if (dc.mons.length === 2 && !dc.egg && dc.steps % 256 === 0) {
        const chance = this.breedChance();
        if (chance && Math.random() * 100 < chance) { dc.egg = true; this.ui.toast('La Pension a quelque chose pour vous…'); }
      }
    }
  },

  queueHatch(egg) {
    const run = async () => {
      while (this.busy || this.state !== 'explore') await new Promise((r) => setTimeout(r, 300));
      this.busy++;
      try {
        await this.say(null, ['Hein ?', 'Quelque chose se passe !']);
        egg.egg = false;
        egg.eggCycles = 0;
        egg.friendship = 120;
        egg.met = `Éclos à ${this.map.def.name}`;
        egg.recalc();
        egg.hp = egg.maxHp;
        await this.ui.screens.hatch(egg);
        this.registerCaught(egg);
        this.data.stats.hatched++;
        await this.say(null, [`${egg.def.name} est sorti de l'Œuf !`]);
        const k = await this.ask(null, `Donner un surnom à ${egg.def.name} ?`);
        if (k === 0) { const n = await this.ui.screens.nameEntry(`Surnom de ${egg.def.name}`, egg.def.name, 12); if (n && n !== egg.def.name) egg.nickname = n; }
        this.checkChallenges();
      } finally {
        this.busy--;
        this.hatching = false;
        this.refreshHUD();
        const next = this.team.find((c) => c.egg && c.eggCycles <= 0);
        if (next) { this.hatching = true; this.queueHatch(next); }
      }
    };
    run();
  },

  // ── Élevage ────────────────────────────────────────────────────────
  breedChance() {
    const [a, b] = this.data.daycare.mons.map((m) => Creature.fromJSON(m));
    if (!a || !b) return 0;
    const ga = a.def.egg, gb = b.def.egg;
    if (ga.includes('inconnu') || gb.includes('inconnu')) return 0;
    const ditto = (c) => c.def.egg.includes('metamorph');
    if (ditto(a) && ditto(b)) return 0;
    if (ditto(a) || ditto(b)) return a.species === b.species ? 0 : 20;
    if (!a.gender || !b.gender || a.gender === b.gender) return 0;
    if (!ga.some((g) => gb.includes(g))) return 0;
    return a.species === b.species ? 50 : 25;
  },

  makeEgg() {
    const [a, b] = this.data.daycare.mons.map((m) => Creature.fromJSON(m));
    const ditto = (c) => c.def.egg.includes('metamorph');
    const mother = ditto(a) ? b : ditto(b) ? a : (a.gender === 'f' ? a : b);
    const father = mother === a ? b : a;
    const species = baseForm(mother.species);
    const odds = this.data.bag.charme_chroma ? GAME.shinyOddsCharm : GAME.shinyOdds;
    const c = Creature.create(species, 1, { shinyOdds: odds, extra: { egg: true, ot: this.data.name } });
    // Potentiels hérités (3, ou 5 avec le Ruban Lié)
    const n = a.item === 'ruban_lie' || b.item === 'ruban_lie' ? 5 : 3;
    const stats = [...STATS].sort(() => Math.random() - 0.5).slice(0, n);
    for (const s of stats) c.iv[s] = (Math.random() < 0.5 ? a : b).iv[s];
    // Nature (Pierre Immuable)
    const ever = [a, b].filter((p) => p.item === 'pierre_immuable');
    if (ever.length) c.nature = ever[Math.floor(Math.random() * ever.length)].nature;
    // Talent de la mère (caché transmis à 60 %)
    const mDef = mother.def;
    if (mother.ability === mDef.hid && c.def.hid && Math.random() < 0.6) c.ability = c.def.hid;
    else if (Math.random() < 0.8 && c.def.ab.includes(mother.ability)) c.ability = mother.ability;
    // Attaques : attaques œuf connues des parents + attaques de base
    const eggMoves = (EGG_MOVES[species] || []).filter((m) => father.knows(m) || mother.knows(m));
    const base = movesAtLevel(species, 1);
    const mv = [...new Set([...eggMoves, ...base])].slice(-4).filter((id) => MOVES[id]);
    if (mv.length) c.moves = mv.map((id) => ({ id, pp: MOVES[id].pp, ppMax: MOVES[id].pp }));
    c.egg = true;
    c.eggCycles = CREATURE_MAP[species].hatch || 20;
    c.recalc();
    c.hp = c.maxHp;
    return c;
  },

  async daycareDesk() {
    const dc = this.data.daycare;
    const host = this.map.npcs.find((n) => n.def.id?.endsWith(':eleveuse')) || 'Éleveuse';
    if (dc.egg) {
      await this.say(host, ['Ah, te voilà ! Pendant que tu voyageais, nous avons trouvé un Œuf près de tes Lumins.', 'On ne sait pas d\'où il vient, mais il est sûrement à toi !']);
      if (this.team.length >= 6) { await this.say(host, ['Ton équipe est pleine… Reviens quand tu auras de la place.']); return; }
      const egg = this.makeEgg();
      dc.egg = false;
      this.team.push(egg);
      this.audio.play('item');
      await this.say(null, ['{player} reçoit un Œuf !']);
      this.refreshHUD();
      return;
    }
    await this.ui.screens.daycare();
  },

  // ── Utilisation des objets hors combat ─────────────────────────────
  /** @returns true si l'objet a été consommé */
  async useItemOnMon(itemId, mon, moveIndex = null) {
    const it = ITEMS[itemId];
    const say = (l) => this.say(null, l);
    if (mon.egg) { await say(['Ça n\'aurait aucun effet sur un Œuf.']); return false; }
    if (it.revive) {
      if (!mon.isFainted || mon.dead) { await say(['Ça n\'aurait aucun effet.']); return false; }
      mon.hp = Math.max(1, Math.floor(mon.maxHp * it.revive));
      mon.fainted = false;
      await say([`${mon.name} reprend connaissance !`]);
      return true;
    }
    if (it.heal || it.cure) {
      if (mon.isFainted) { await say(['Ça n\'aurait aucun effet.']); return false; }
      let used = false;
      if (it.heal && mon.hp < mon.maxHp) {
        const before = mon.hp;
        mon.hp = it.heal === 'full' ? mon.maxHp : Math.min(mon.maxHp, mon.hp + it.heal);
        this.audio.play('heal');
        await say([`${mon.name} récupère ${mon.hp - before} PV.`]);
        used = true;
      }
      if (it.cure && mon.status && (it.cure === 'all' || it.cure.includes(mon.status))) { mon.status = null; mon.statusTurns = 0; await say([`${mon.name} est guéri !`]); used = true; }
      if (!used) await say(['Ça n\'aurait aucun effet.']);
      return used;
    }
    if (it.pp) {
      const list = it.ppOne ? [mon.moves[moveIndex ?? 0]] : mon.moves;
      let used = false;
      for (const m of list) if (m && m.pp < m.ppMax) { m.pp = Math.min(m.ppMax, m.pp + it.pp); used = true; }
      await say([used ? 'Les PP sont restaurés.' : 'Ça n\'aurait aucun effet.']);
      return used;
    }
    if (it.vitamin) {
      const add = mon.addEV(it.vitamin, 10);
      if (!add) { await say(['Ça n\'aurait aucun effet.']); return false; }
      mon.recalc();
      mon.friendship = Math.min(255, mon.friendship + 3);
      await say([`La statistique de ${mon.name} a augmenté !`]);
      return true;
    }
    if (it.candy) {
      if (mon.level >= 100 || (this.levelCap && mon.level >= this.levelCap)) { await say(['Ça n\'aurait aucun effet.']); return false; }
      const ups = mon.gainXp(Math.max(1, mon.xpNext - mon.xp));
      this.audio.play('levelup');
      await say([`${mon.name} monte au niveau ${mon.level} !`]);
      for (const up of ups) for (const mv of up.newMoves) await this.teachMove(mon, mv);
      await this.checkEvolution(mon, { type: 'level', time: this.timeOfDay() });
      return true;
    }
    if (it.ppUp) {
      const i = await this.ui.screens.chooseList('Quelle attaque ?', mon.moves.map((m) => ({ label: MOVES[m.id].name, sub: `PP ${m.pp}/${m.ppMax}` })));
      if (i === null || i === undefined) return false;
      const m = mon.moves[i], base = MOVES[m.id].pp;
      if (m.ppMax >= Math.floor(base * 1.6)) { await say(['Ça n\'aurait aucun effet.']); return false; }
      m.ppMax += Math.max(1, Math.floor(base / 5));
      m.pp += Math.max(1, Math.floor(base / 5));
      await say([`Les PP de ${MOVES[m.id].name} augmentent !`]);
      return true;
    }
    if (it.abilityCapsule) {
      const ab = mon.def.ab;
      if (ab.length < 2) { await say(['Ça n\'aurait aucun effet.']); return false; }
      mon.ability = ab[(ab.indexOf(mon.ability) + 1) % ab.length];
      await say([`Le talent de ${mon.name} a changé !`]);
      return true;
    }
    if (it.evoItem) {
      const to = mon.evolutionFor({ type: 'item', item: itemId });
      if (!to) { await say(['Ça n\'aurait aucun effet.']); return false; }
      await this.evolve(mon, to);
      return true;
    }
    if (it.tm) {
      const mv = it.tm;
      if (!canLearnTM(mon.def, mv)) { await say([`${mon.name} ne peut pas apprendre ${MOVES[mv].name}.`]); return false; }
      await this.teachMove(mon, mv);
      return false; // les DT sont réutilisables
    }
    await say(['Ça n\'aurait aucun effet.']);
    return false;
  },

  async checkEvolution(mon, trigger) {
    const to = mon.evolutionFor(trigger);
    if (to) await this.evolve(mon, to);
  },

  async evolve(mon, to) {
    const fromName = mon.name;
    const ok = await this.battleCtl.evolutionScene(mon, to);
    if (!ok) { await this.say(null, [`${fromName} n'a pas évolué.`]); return false; }
    const newMoves = mon.evolve(to);
    this.registerCaught(mon);
    await this.say(null, [`Félicitations ! ${fromName} a évolué en ${mon.def.name} !`]);
    for (const mv of newMoves) await this.teachMove(mon, mv);
    this.checkChallenges();
    return true;
  },

  // ── Défis ──────────────────────────────────────────────────────────
  challengeStats() {
    const caught = Object.keys(this.data.dex.caught);
    const nonLegend = caught.filter((id) => !CREATURE_MAP[id]?.legendary).length;
    const allMons = [...this.team, ...this.data.boxes.flat().filter(Boolean).map((o) => ({ level: o.level }))];
    const visitedAll = Object.keys(MAPS).filter((id) => MAPS[id].type !== 'grid').every((id) => this.data.visited[id]);
    return {
      ...this.data.stats, caught: caught.length, caughtNonLegend: nonLegend, badges: this.badgeCount, money: this.data.money,
      maxLevel: allMons.reduce((a, c) => Math.max(a, c.level || 0), 0), difficulty: this.data.difficulty, nuzlocke: !!this.data.rules?.nuzlocke && !this.data.nuzlocke.failed,
      guardians: ['terragorn', 'aeroneth', 'thalassyre'].filter((s) => this.data.dex.caught[s]).length, visitedAll, champion: this.flag('champion'),
    };
  },

  checkChallenges() {
    if (!this.data) return;
    const s = this.challengeStats();
    for (const ch of CHALLENGES) {
      if (this.data.challenges[ch.id]) continue;
      let ok = false;
      try { ok = ch.check(s); } catch { ok = false; }
      if (ok) {
        this.data.challenges[ch.id] = 'done';
        this.ui.toast(`Défi réussi : ${ch.name} ! Récompense à réclamer dans le Carnet.`);
        this.audio.play('challenge');
      }
    }
  },

  async claimChallenge(id) {
    const ch = CHALLENGES.find((c) => c.id === id);
    if (!ch || this.data.challenges[id] !== 'done') return;
    this.data.challenges[id] = 'claimed';
    await this.give(ch.reward[0], ch.reward[1]);
  },

  // ── Tour de Combat ─────────────────────────────────────────────────
  async towerDesk() {
    const rec = this.map.npcs.find((n) => n.def.id?.endsWith(':recep')) || 'Réceptionniste';
    const T = this.data.tower;
    await this.say(rec, ['Bienvenue à la Tour de Combat !', 'Choisissez 3 Lumins. Ils combattront au niveau 50 contre une série de dresseurs. Ils sont soignés entre chaque combat.', `Votre série actuelle : ${T.streak} victoire${T.streak > 1 ? 's' : ''} · Record : ${T.best}.`]);
    const c = await this.ask(rec, 'Participer ?');
    if (c !== 0) return;
    const picks = await this.ui.screens.pickTeam(this.team.filter((m) => !m.egg && !m.dead), 3);
    if (!picks || picks.length < 3) return;
    await this.say(rec, ['Très bien. Suivez-moi dans la salle de combat !']);
    let streak = T.streak;
    for (;;) {
      const copies = picks.map((m) => { const o = Creature.fromJSON(m.toJSON()); o.level = 50; o.xp = 0; o.recalc(); o.heal(); return o; });
      const foe = towerTeam(streak, 3);
      const isBoss = (streak + 1) % 21 === 0;
      const res = await this.battleCtl.trainerBattle({ id: `tour_${streak}`, cls: 'tour', name: isBoss ? 'Maître de la Tour Altaïr' : ['Champion Ivo', 'Dresseuse Léonie', 'As Damien', 'Experte Maud', 'Vétéran Paul', 'Prodige Lou'][streak % 6], team: foe.map((f) => [f.species, 50]), towerTeam: foe, playerTeamOverride: copies, noExp: true, noMoney: true, noBlackout: true, tower: true, intro: [isBoss ? 'Vingt victoires… Tu mérites de m\'affronter.' : 'Que le meilleur gagne !'] });
      if (res !== 'win') {
        await this.say(rec, [`Votre série s'arrête à ${streak} victoire${streak > 1 ? 's' : ''}.`, 'Revenez quand vous voulez !']);
        T.streak = 0;
        break;
      }
      streak++;
      const bp = 3 + Math.floor(streak / 7) + (isBoss ? 20 : 0);
      this.data.bp += bp;
      T.best = Math.max(T.best, streak);
      this.data.stats.towerBest = T.best;
      await this.say(rec, [`Victoire ! Série : ${streak}. Vous gagnez ${bp} Points Combat (total : ${this.data.bp} PC).`]);
      const k = await this.ask(rec, 'Continuer la série ?', ['Continuer', 'Faire une pause']);
      if (k !== 0) { T.streak = streak; await this.say(rec, ['Votre série est sauvegardée. À bientôt !']); break; }
    }
    this.checkChallenges();
    this.autosave();
  },

  bpShopList() { return BP_SHOP; },
};
