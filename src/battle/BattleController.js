import { Battle } from './BattleEngine.js';
import { Creature } from './Creature.js';
import { MOVES } from '../config/moves.js';
import { ITEMS } from '../config/items.js';
import { TYPES } from '../config/types.js';
import { ABILITIES } from '../config/abilities.js';
import { GAME, DIFFICULTY } from '../config/game.js';
import { TRAINER_CLASSES } from '../config/trainers.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { buildTrainerTeam, trainerItems, thirdStarterFor } from '../game/Teams.js';
import { sleep } from '../core/utils.js';

const ORDRE = new Set(['sbire', 'sbire_f', 'admin', 'admin_f', 'chef']);

/**
 * DÉROULEMENT D'UN COMBAT : relie le moteur (règles) à l'arène 3D et à l'interface.
 * Joue les événements dans l'ordre, demande les choix du joueur, gère la fin (argent, capture,
 * K.O. définitifs du Nuzlocke, évolutions, défaite).
 */
export class BattleController {
  constructor(game) {
    this.game = game;
  }

  get stage() { return this.game.battleStage; }
  get ui() { return this.game.ui.battle; }

  async trainerBattle(def) {
    const g = this.game;
    const ctx = { difficulty: g.data.difficulty, rivalStarter: g.data.rivalStarter || 'pyralis', thirdStarter: thirdStarterFor(g.data.starter || 'leafnix') };
    let team = def.towerTeam || buildTrainerTeam(def, def.mapId || g.map.id, ctx);
    if (def.e4 && g.flag('champion')) team = team.map((c) => { const n = Creature.create(c.species, Math.min(100, c.level + 10), { shiny: false }); n.item = c.item; n.iv = c.iv; n.ev = c.ev; n.recalc(); n.hp = n.maxHp; return n; });
    const items = def.tower ? [] : trainerItems(def, g.data.difficulty, Math.max(...team.map((c) => c.level)));
    return this.run({ kind: 'trainer', trainer: def, foeTeam: team, foeItems: items, ...def });
  }

  async wildBattle(species, level, opts = {}) {
    const g = this.game;
    const odds = g.data.bag.charme_chroma ? GAME.shinyOddsCharm : GAME.shinyOdds;
    const c = Creature.create(species, level, { shinyOdds: odds, hiddenChance: 0.04, perfectIvs: opts.perfectIvs });
    if (opts.shiny !== undefined) c.shiny = opts.shiny;
    g.registerSeen(species);
    // Nuzlocke : seule la première rencontre d'une zone peut être capturée
    let canCatch = true, reason = null;
    const R = g.data.rules || {};
    const area = g.map.def.area || g.map.id.split(':')[0];
    if (R.nuzlocke && !g.data.nuzlocke.failed && !opts.legend) {
      if (g.data.nuzlocke.areas[area] && !c.shiny) { canCatch = false; reason = 'Nuzlocke : vous avez déjà fait votre rencontre dans cette zone.'; } else g.data.nuzlocke.areas[area] = true;
    }
    return this.run({ kind: 'wild', foeTeam: [c], canCatch, cantCatchReason: reason, ...opts });
  }

  biomeKey() {
    const m = this.game.map;
    if (!m) return 'prairie';
    if (m.kind === 'cave') return 'grotte';
    if (m.kind === 'interior' || m.kind === 'grid') return 'interieur';
    const b = m.def.biome || 'prairie';
    return b === 'ville' ? 'prairie' : b;
  }

  musicFor(cfg) {
    if (cfg.music) return cfg.music;
    if (cfg.kind === 'wild') return cfg.legend ? 'legend' : 'wild';
    const t = cfg.trainer;
    if (t.cls === 'champion') return 'champion';
    if (t.leader || t.e4) return 'leader';
    if (t.cls === 'rival') return 'rival';
    if (ORDRE.has(t.cls) || t.lookExtra?.accent === '#c58bff') return 'ordre';
    if (t.tower) return 'tower';
    return 'trainer';
  }

  async run(cfg) {
    const g = this.game;
    const st = this.stage, ui = this.ui;
    const prevState = g.state;
    g.state = 'battle';
    g.busy++;
    g.ui.showHUD(false);
    g.bgm.play(this.musicFor(cfg));
    await g.ui.battleIn();
    const map = g.map;
    map.group.visible = false;
    g.player.group.visible = false;
    const prevWeather = g.weather.systems.map((s) => s.type);
    const D = DIFFICULTY[g.data.difficulty] || DIFFICULTY.normal;
    const trainer = cfg.kind === 'trainer' ? cfg.trainer : null;
    const tcls = trainer ? TRAINER_CLASSES[trainer.cls] : null;
    const accent = trainer?.leader ? TYPES[map.def.theme === undefined ? 'normal' : map.def.theme]?.color : null;
    st.enter({ biome: this.biomeKey(), trainer, accent: accent || (cfg.legend ? '#c58bff' : '#ffb547') });
    const playerTeam = cfg.playerTeamOverride || g.team.filter((c) => g.battleEligible(c));
    const tLabel = trainer ? `${tcls?.name && !['leader', 'conseil', 'champion', 'rival', 'admin', 'admin_f', 'chef', 'tour'].includes(trainer.cls) ? `${tcls.name} ` : ''}${trainer.name}` : '';
    const mapWeather = (map.def.battleWeather) || (g.weather.systems.some((s) => s.type === 'rain') ? 'rain' : g.weather.systems.some((s) => s.type === 'snow') ? 'snow' : null);
    const aiLevel = trainer ? (g.data.difficulty === 'facile' ? 1 : g.data.difficulty === 'difficile' ? 3 : Math.max(tcls?.ai || 1, trainer.leader || trainer.e4 ? 3 : 1)) : 0;
    const battle = new Battle({
      kind: cfg.kind, playerTeam, foeTeam: cfg.foeTeam, trainer: trainer ? { name: tLabel } : null, aiLevel, foeItems: cfg.foeItems || [],
      weather: cfg.weather || mapWeather, isNight: g.sky.isNight, isDark: map.kind === 'cave' || map.dark,
      bag: g.data.bag, expShare: !!(g.data.expShare && g.data.bag.multi_exp), expMult: cfg.noExp ? 0.0001 : D.expMult, levelCap: g.levelCap,
      style: D.style, canCatch: cfg.canCatch !== false, cantCatchReason: cfg.cantCatchReason, playerName: g.data.name,
    });
    this.battle = battle;
    this.cfg = cfg;
    this.faintedThisBattle = new Set();
    ui.show(cfg.kind, trainer, cfg.foeTeam, { caught: cfg.kind === 'wild' && !!g.data.dex.caught[cfg.foeTeam[0].species] });
    if (battle.weather) st.setWeather(battle.weather.type);
    else st.setWeather(null);
    await g.ui.battleReveal();

    // Introduction
    if (cfg.kind === 'wild') {
      await st.introWild(cfg.foeTeam[0]);
      await ui.message(`${cfg.legend ? '' : 'Un '}${cfg.foeTeam[0].name}${cfg.legend ? ' apparaît' : ' sauvage apparaît'} !`);
    } else {
      await st.introTrainer();
      await ui.message(`${tLabel} veut se battre !`);
    }
    st.cut('neutral');
    let events = battle.start();
    await this.play(events);

    // Boucle de combat
    while (battle.state !== 'end') {
      if (battle.state === 'choose') {
        const action = await this.chooseAction(battle);
        if (!action) continue;
        events = battle.submit(action);
      } else if (battle.state === 'forceSwitch') {
        const idx = await ui.chooseCreature(battle.P.team, { title: 'Envoyer quel Lumin ?', cancel: false, check: (c, i) => (!c.canBattle ? 'K.O.' : null) });
        events = battle.chooseReplacement(idx);
      } else if (battle.state === 'offerSwitch') {
        const yes = await ui.askYesNo(`${tLabel} va envoyer ${battle.F.team[battle.pendingFoe].name}. Changer de Lumin ?`);
        let idx = null;
        if (yes) idx = await ui.chooseCreature(battle.P.team, { title: 'Quel Lumin envoyer ?', cancel: true, check: (c, i) => (!c.canBattle ? 'K.O.' : i === battle.P.active ? 'Au combat' : null) });
        events = battle.respondOffer(idx);
      } else break;
      await this.play(events);
    }
    const outcome = battle.outcome;
    st.cut('neutral');

    // Fin du combat
    if (outcome === 'win' && trainer) {
      const defeat = trainer.defeat || trainer.leader?.defeat || [];
      if (st.enemyTrainer) { st.enemyTrainer.animator.play('hit'); await st.setShot({ pos: st.enemyTrainer.group.position.clone().add(st.origin).add({ x: -1.5, y: 1.6, z: 2.6 }), look: st.enemyTrainer.group.position.clone().add(st.origin).add({ x: 0, y: 1.3, z: 0 }) }, 'player', 0.8); }
      for (const l of defeat) await ui.message(g.fmt(l));
      if (!cfg.noMoney) {
        const last = cfg.foeTeam[cfg.foeTeam.length - 1];
        let pay = Math.round((tcls?.pay || 20) * last.level * (D.moneyMult || 1));
        if (g.team.some((c) => c.item === 'piece_rune')) pay *= 2;
        g.addMoney(pay);
        await ui.message(`Vous remportez ${pay.toLocaleString('fr-FR')} ${GAME.currencySymbol} !`);
      }
      if (!trainer.e4 && !trainer.tower) g.data.defeated[trainer.id] = true;
      g.data.stats.trainers++;
    }
    if (outcome === 'caught') await this.afterCatch(battle.caught, cfg);
    g.lastBattleNoFaint = this.faintedThisBattle.size === 0;
    // Nuzlocke : les Lumins K.O. sont perdus
    if (g.data.rules?.nuzlocke && !g.data.nuzlocke.failed && !cfg.tower && !cfg.noBlackout) {
      for (const c of playerTeam) if (c.hp <= 0 && !c.dead) { c.dead = true; g.data.nuzlocke.dead++; await ui.message(`${c.name} ne se relèvera pas… (Nuzlocke)`); }
    }
    for (const c of playerTeam) delete c._faintAnnounced;
    g.data.stats.battles++;

    // Évolutions par niveau
    const toEvolve = outcome !== 'lose' && !cfg.tower ? [...battle.leveled].filter((c) => !c.dead && c.hp > 0 && c.evolutionFor({ type: 'level', time: g.timeOfDay() })) : [];
    ui.hide();
    for (const c of toEvolve) {
      const to = c.evolutionFor({ type: 'level', time: g.timeOfDay() });
      await ui.messageOnly(`Hein ? ${c.name} évolue !`);
      const ok = await this.evolutionInStage(c, to);
      if (ok) {
        const fromName = c.name;
        const newMoves = c.evolve(to);
        g.registerCaught(c);
        await ui.messageOnly(`Félicitations ! ${fromName} a évolué en ${c.def.name} !`);
        for (const mv of newMoves) await this.learnPrompt(c, mv);
      } else await ui.messageOnly(`${c.name} n'a pas évolué.`);
    }
    for (const c of g.team) if (c.friendship >= 220 && c.evolutionFor({ type: 'friend', time: g.timeOfDay() }) && battle.leveled.has(c)) {
      const to = c.evolutionFor({ type: 'friend', time: g.timeOfDay() });
      if (await this.evolutionInStage(c, to)) { const n = c.name; const mv = c.evolve(to); g.registerCaught(c); await ui.messageOnly(`${n} a évolué en ${c.def.name} !`); for (const m of mv) await this.learnPrompt(c, m); }
    }
    ui.hideAll();

    // Retour au monde
    await g.ui.battleOut(true);
    st.leave();
    map.group.visible = true;
    g.player.group.visible = true;
    g.weather.set(prevWeather);
    g.configureEnvironment(map);
    g.camRig.snapBehind(g.player.rotY, g.player.position);
    g.state = prevState === 'battle' ? 'explore' : prevState;
    g.ui.showHUD(true);
    g.busy--;
    if (outcome === 'lose' && !cfg.noBlackout && !cfg.canLose) await this.blackout(trainer);
    else if (outcome === 'lose' && cfg.canLose) g.healParty();
    g.music();
    g.refreshHUD();
    g.checkChallenges();
    await g.ui.battleOut(false);
    return outcome;
  }

  async blackout(trainer) {
    const g = this.game;
    const lost = Math.min(g.data.money, Math.floor(g.data.money / 2));
    if (trainer) g.addMoney(-lost);
    if (g.data.rules?.nuzlocke && !g.data.nuzlocke.failed && g.team.every((c) => c.dead || c.egg)) {
      g.data.nuzlocke.failed = true;
      await g.say(null, ['Tous vos Lumins sont tombés…', 'Le défi Nuzlocke est terminé. Vos compagnons perdus sont ranimés et vous pouvez continuer l\'aventure sans cette règle.']);
      for (const c of g.team) c.dead = false;
    }
    await g.ui.fade(1, 0.6);
    await g.say(null, ['Vous n\'avez plus de Lumin en état de se battre…', trainer ? `Vous donnez ${lost.toLocaleString('fr-FR')} ${GAME.currencySymbol} au vainqueur.` : 'Vous paniquez et perdez connaissance…', 'Vous vous réveillez au dernier lieu de repos.'].filter(Boolean));
    if (g.player.mode !== 'walk') g.player.setMode('walk');
    const L = g.data.lastHeal || { map: 'clairvent:maison', entry: 'door' };
    await g.enterMap(L.map, L.entry);
    g.healParty();
    await g.ui.fade(0, 0.6);
  }

  async afterCatch(mon, cfg) {
    const g = this.game, ui = this.ui;
    const first = g.registerCaught(mon);
    mon.ot = g.data.name;
    mon.met = g.map.def.name;
    mon.friendship = mon.ball === 'prisme_amitie' ? 200 : 70;
    g.data.stats.captures++;
    if (first) await ui.message(`Les données de ${mon.def.name} sont ajoutées au Lumidex.`);
    const k = await ui.askYesNo(`Donner un surnom à ${mon.def.name} ?`);
    if (k) {
      const n = await g.ui.screens.nameEntry(`Surnom de ${mon.def.name}`, mon.def.name, 12);
      if (n && n !== mon.def.name) mon.nickname = n;
    }
    mon.status = mon.status || null;
    delete mon._faintAnnounced;
    const where = await g.storeCreature(mon, { silent: true });
    if (where === 'pc') await ui.message(`${mon.name} a été envoyé dans le PC.`);
    if (cfg.legend) g.data.stats.legendCaught = (g.data.stats.legendCaught || 0) + 1;
  }

  // ── Choix du joueur ────────────────────────────────────────────────
  async chooseAction(battle) {
    const g = this.game, ui = this.ui;
    const mon = battle.P.mon;
    if (battle.P.v.charging) return { type: 'move', index: battle.P.v.charging.index };
    for (;;) {
      ui.prompt(`Que doit faire ${mon.name} ?`);
      const a = await ui.chooseAction({ canRun: battle.kind === 'wild' });
      if (a === 'fight') {
        if (mon.moves.every((m) => m.pp <= 0)) { await ui.message(`${mon.name} n'a plus d'attaques !`); return { type: 'struggle' }; }
        const i = await ui.chooseMove(mon, battle.F.mon);
        if (i === null) continue;
        if (mon.moves[i].pp <= 0) { await ui.message('Plus de PP pour cette attaque !'); continue; }
        return { type: 'move', index: i };
      }
      if (a === 'bag') {
        const r = await this.bagMenu(battle);
        if (r) return r;
        continue;
      }
      if (a === 'team') {
        const r = await this.teamMenu(battle);
        if (r) return r;
        continue;
      }
      if (a === 'run') {
        if (battle.kind !== 'wild') { await ui.message('Impossible de fuir un combat de dresseur !'); continue; }
        if (this.cfg.noRun) { await ui.message('Impossible de fuir !'); continue; }
        return { type: 'run' };
      }
    }
  }

  async bagMenu(battle) {
    const g = this.game, ui = this.ui;
    const noItems = !!g.data.rules?.noitems;
    const pockets = [['soin', 'Soins'], ['prisme', 'Prismes'], ['combat', 'Combat'], ['baie', 'Baies']].filter(([p]) => !noItems || p === 'prisme');
    for (;;) {
      const p = await ui.chooseFromList({ title: 'Sac', items: pockets.map(([id, n]) => ({ label: n, right: `${Object.keys(g.data.bag).filter((k) => ITEMS[k]?.pocket === id && g.data.bag[k] > 0).length}` })) });
      if (p === null) return null;
      const pocket = pockets[p][0];
      const ids = Object.keys(g.data.bag).filter((k) => ITEMS[k]?.pocket === pocket && g.data.bag[k] > 0 && (pocket !== 'baie' || ITEMS[k].heal || ITEMS[k].cure));
      if (!ids.length) { await ui.message('Cette poche est vide.'); continue; }
      const i = await ui.chooseFromList({ title: pockets[p][1], items: ids.map((k) => ({ label: ITEMS[k].name, sub: ITEMS[k].desc, right: `×${g.data.bag[k]}`, color: ITEMS[k].color })) });
      if (i === null) continue;
      const id = ids[i], it = ITEMS[id];
      if (it.ball !== undefined) {
        if (battle.kind !== 'wild') { await ui.message('On ne peut pas capturer le Lumin d\'un dresseur !'); continue; }
        return { type: 'item', id };
      }
      if (it.battleStat) return { type: 'item', id };
      const t = await ui.chooseCreature(battle.P.team, { title: `Utiliser ${it.name} sur…`, cancel: true, check: (c) => {
        if (it.revive) return c.hp > 0 || c.dead ? 'Sans effet' : null;
        if (c.hp <= 0) return 'K.O.';
        if (it.heal && c.hp >= c.maxHp && !(it.cure && c.status)) return 'PV au max';
        if (!it.heal && it.cure && !c.status) return 'Aucun statut';
        return null;
      } });
      if (t === null) continue;
      let moveIndex;
      if (it.ppOne) {
        const mon = battle.P.team[t];
        const m = await ui.chooseFromList({ title: 'Quelle attaque ?', items: mon.moves.map((mv) => ({ label: MOVES[mv.id].name, right: `${mv.pp}/${mv.ppMax}` })) });
        if (m === null) continue;
        moveIndex = m;
      }
      return { type: 'item', id, target: t, moveIndex };
    }
  }

  async teamMenu(battle) {
    const g = this.game, ui = this.ui;
    for (;;) {
      const i = await ui.chooseCreature(battle.P.team, { title: 'Équipe', cancel: true, check: () => null });
      if (i === null) return null;
      const c = battle.P.team[i];
      const opts = ['Envoyer', 'Résumé', 'Retour'];
      const k = await ui.chooseFromList({ title: c.name, items: opts.map((o) => ({ label: o })) });
      if (k === 0) {
        if (!c.canBattle) { await ui.message(`${c.name} ne peut pas se battre !`); continue; }
        if (i === battle.P.active) { await ui.message(`${c.name} est déjà au combat !`); continue; }
        if (!battle.canSwitch()) { await ui.message(`${battle.P.mon.name} ne peut pas être rappelé !`); continue; }
        return { type: 'switch', index: i };
      }
      if (k === 1) await g.ui.screens.summary(battle.P.team, i, { inBattle: true });
    }
  }

  async learnPrompt(mon, moveId) {
    const ui = this.ui, g = this.game;
    if (mon.knows(moveId)) return;
    if (mon.moves.length < 4) { mon.learn(moveId); g.audio.play('learn'); await ui.messageOnly(`${mon.name} apprend ${MOVES[moveId].name} !`); return; }
    await ui.messageOnly(`${mon.name} veut apprendre ${MOVES[moveId].name}, mais il connaît déjà 4 attaques.`);
    const idx = await g.ui.screens.forgetMove(mon, moveId);
    if (idx === null || idx === undefined || idx < 0) { await ui.messageOnly(`${mon.name} n'a pas appris ${MOVES[moveId].name}.`); return; }
    const old = MOVES[mon.moves[idx].id].name;
    mon.learn(moveId, idx);
    g.audio.play('learn');
    await ui.messageOnly(`1, 2 et… Tadaa ! ${mon.name} oublie ${old} et apprend ${MOVES[moveId].name} !`);
  }

  // ── Lecture des événements ─────────────────────────────────────────
  hpBefore(events, i, mon) {
    for (let k = i + 1; k < events.length; k++) {
      const e = events[k];
      if (e.mon !== mon) continue;
      if (e.type === 'damage') return e.hp + e.amount;
      if (e.type === 'heal') return e.hp - e.amount;
      if (e.type === 'send' && k > i) break;
    }
    return mon.hp;
  }

  statusBefore(events, i, mon, side) {
    for (let k = i + 1; k < events.length; k++) {
      const e = events[k];
      if (e.side !== side) continue;
      if (e.type === 'status') return null;
      if (e.type === 'cure') return e.status;
      if (e.type === 'send') break;
    }
    return mon.status;
  }

  async play(events) {
    const st = this.stage, ui = this.ui, g = this.game;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      switch (e.type) {
        case 'msg': await ui.message(g.fmt(e.text)); break;
        case 'send': {
          const hp = this.hpBefore(events, i, e.mon);
          ui.setPanel(e.side, e.mon, { hp, status: this.statusBefore(events, i, e.mon, e.side), caught: e.side === 'enemy' && this.cfg.kind === 'wild' && !!g.data.dex.caught[e.mon.species] });
          if (e.side === 'enemy') g.registerSeen(e.mon.species);
          if (e.wild) { ui.panelVisible('enemy', true); st.cut('neutral'); break; }
          await st.setShot(e.side === 'player' ? 'heroLow' : 'enemyFocus', 'player', 0.5);
          await st.sendOut(e.side, e.mon, { throwBall: e.side === 'player' || this.cfg.kind === 'trainer' });
          ui.panelVisible(e.side, true);
          if (e.side === 'enemy') ui.updateTeamIndicator(this.battle.F.team);
          await st.setShot('neutral', 'player', 0.6);
          break;
        }
        case 'recall': ui.panelVisible(e.side, false); await st.recall(e.side); break;
        case 'move': {
          const mv = MOVES[e.move];
          if (!mv) break;
          await st.performMove(e.side, mv, e.hit, e.target);
          break;
        }
        case 'damage': {
          const ratio = e.amount / Math.max(1, e.maxHp);
          const p1 = ui.animateHp(e.side, e.hp, e.maxHp);
          const p2 = st.hitReaction(e.side, { mult: e.mult || 1, crit: e.crit, ratio, type: e.moveType, source: e.source });
          await Promise.all([p1, p2]);
          break;
        }
        case 'heal': st.healFx(e.side); if (e.amount > 0) g.audio.play('heal'); await ui.animateHp(e.side, e.hp, e.mon.maxHp); break;
        case 'status': ui.setStatus(e.side, e.status); st.statusFx(e.side, e.status); break;
        case 'cure': if (e.side) ui.setStatus(e.side, null); break;
        case 'stat': st.statFx(e.side, e.changes); await sleep(0.3); break;
        case 'faint': {
          if (e.side === 'player') this.faintedThisBattle.add(e.mon);
          await st.faint(e.side);
          ui.panelVisible(e.side, false);
          if (e.side === 'enemy') ui.updateTeamIndicator(this.battle.F.team);
          break;
        }
        case 'weather': st.setWeather(e.weather); break;
        case 'weatherTick': break;
        case 'ability': ui.abilityBanner(e.side, ABILITIES[e.ability]?.name || e.ability); break;
        case 'item': g.audio.play('item'); break;
        case 'ball': await st.capture(e.item, e.shakes, e.success); break;
        case 'ballBlocked': await st.ballBlocked(); break;
        case 'exp': if (e.active) await ui.animateXp(e.mon, e.from, e.levels); break;
        case 'levelup': g.audio.play('levelup'); if (e.active) { ui.refreshLevel(e.mon); await ui.showLevelUp(e.mon, e); } break;
        case 'learnPrompt': await this.learnPrompt(e.mon, e.move); break;
        case 'run': g.audio.play('run'); break;
        case 'haze': st.fx.ring(st.origin, '#ffffff', 10, 0.8, { intensity: 1 }); break;
        case 'charge': st.views[e.side]?.setGlow(1.5, '#ffffff'); break;
        case 'sleeping': case 'confused': case 'paralyzed': case 'confusedStart': if (e.side) st.statusFx(e.side, e.type === 'sleeping' ? 'slp' : e.type === 'paralyzed' ? 'par' : 'none'); break;
        case 'end': break;
        default: break;
      }
    }
  }

  // ── Évolution / éclosion hors combat ───────────────────────────────
  async withStage(fn, biome) {
    const g = this.game;
    const inBattle = g.state === 'battle';
    if (inBattle) return fn();
    const prev = g.state;
    g.state = 'battle';
    g.ui.showHUD(false);
    await g.ui.fade(1, 0.4);
    g.map.group.visible = false;
    g.player.group.visible = false;
    this.stage.enter({ biome: biome || this.biomeKey(), trainer: null });
    await g.ui.fade(0, 0.4);
    let r;
    try { r = await fn(); } finally {
      await g.ui.fade(1, 0.4);
      this.stage.leave();
      g.map.group.visible = true;
      g.player.group.visible = true;
      g.configureEnvironment(g.map);
      g.state = prev;
      g.ui.showHUD(true);
      await g.ui.fade(0, 0.4);
    }
    return r;
  }

  evolutionInStage(mon, to) {
    const g = this.game;
    let cancel = false;
    const menu = g.ui.nav.push({ handle: (a) => { if (a === 'cancel') cancel = true; return true; } });
    g.bgm.play('evolution');
    return this.stage.evolution(mon.species, to, { shiny: mon.shiny, isCancelled: () => cancel }).finally(() => g.ui.nav.remove(menu));
  }

  async evolutionScene(mon, to) {
    const g = this.game;
    await g.say(null, [`Hein ? ${mon.name} évolue !`]);
    const ok = await this.withStage(() => this.evolutionInStage(mon, to));
    g.music();
    return ok;
  }

  async hatchScene(mon) {
    const g = this.game;
    g.bgm.play('evolution');
    await this.withStage(() => this.stage.hatch(mon.species, mon.shiny));
    g.music();
  }
}

export { CREATURE_MAP };
