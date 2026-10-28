import * as THREE from 'three';
import { ITEMS } from '../config/items.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { MOVES } from '../config/moves.js';
import { trainerLook } from '../config/trainers.js';
import { npcLook } from '../config/npcs.js';
import { NPC2D } from '../world2d/Actors2D.js';
import { DIRS } from '../world2d/tiles.js';
import { Creature } from '../battle/Creature.js';
import { STARTERS } from '../config/creatures.js';
import { tweens, sleep, Ease, fillText } from '../core/utils.js';

/**
 * API DE MISE EN SCÈNE utilisée par les scripts (dialogues, dons, déplacements des PNJ, combats…).
 * Méthodes ajoutées au prototype de Game.
 */
export const ScriptAPI = {
  speakerName(who) {
    if (!who) return '';
    if (typeof who === 'string') return who;
    return who.name || who.def?.name || '';
  },

  fmt(text) {
    return fillText(text, { player: this.data.name, rival: 'Naël' });
  },

  async say(who, lines, opts = {}) {
    const list = (Array.isArray(lines) ? lines : [lines]).filter(Boolean).map((l) => this.fmt(l));
    if (!list.length) return;
    if (who && typeof who === 'object' && who.faceTowards && !who.def?.creature) who.faceTowards(this.player.position.x, this.player.position.z, 20);
    if (who && typeof who === 'object' && who.position) this.facePlayerTo(who.position.x, who.position.z);
    return this.ui.dialogue.say(this.speakerName(who), list, opts);
  },

  async ask(who, text, choices = ['Oui', 'Non']) {
    return this.ui.dialogue.say(this.speakerName(who), [this.fmt(text)], { choices });
  },

  async chooseList(title, items) {
    return this.ui.screens.chooseList(title, items);
  },

  wait(s) { return sleep(s); },
  fade(v, d = 0.5) { return this.ui.fade(v, d); },
  shake(a = 0.2) { this.engine.addShake(a); },
  sfx(name) { this.audio.play(name); },
  toast(t) { this.ui.toast(this.fmt(t)); },

  /** Musique : nom du thème, ou rien pour revenir à celle de la carte. */
  music(name, opts) {
    if (!name) { this.bgm.play(this.map?.def.music || 'route1'); return; }
    this.bgm.play(name, opts);
  },

  has(id, qty = 1) { return (this.data.bag[id] || 0) >= qty; },
  take(id, qty = 1) {
    this.data.bag[id] = Math.max(0, (this.data.bag[id] || 0) - qty);
    if (!this.data.bag[id]) delete this.data.bag[id];
  },
  addItem(id, qty = 1) {
    if (!ITEMS[id]) return;
    this.data.bag[id] = (this.data.bag[id] || 0) + qty;
  },

  async give(id, qty = 1, { silent = false, found = false } = {}) {
    const it = ITEMS[id];
    if (!it) return;
    this.addItem(id, qty);
    if (silent) return;
    const name = it.pocket === 'dt' ? `${it.name} (${MOVES[it.tm]?.name || ''})` : it.name;
    this.audio.play(it.pocket === 'cle' || it.pocket === 'dt' ? 'keyitem' : 'item');
    const q = qty > 1 ? ` ×${qty}` : '';
    await this.say(null, [found ? `{player} trouve : ${name}${q} !` : `{player} reçoit : ${name}${q} !`]);
    if (it.pocket === 'cle' && it.register === 'bike') this.ui.toast('Astuce : touche B pour le vélo.');
    this.refreshHUD();
  },

  addMoney(n) {
    this.data.money = Math.max(0, Math.min(9999999, this.data.money + n));
    this.ui.setMoney(this.data.money);
    this.checkChallenges();
  },

  // ── PNJ ────────────────────────────────────────────────────────────
  npc(id) {
    if (!id) return null;
    if (typeof id === 'object') return id;
    return this.map.npcs.find((n) => n.id === id || n.def.id === id) || null;
  },

  hideNpc(n) {
    const npc = this.npc(n);
    if (!npc) return;
    npc.hiddenByScript = true;
    npc.group.visible = false;
    if (npc.collider) npc.collider.enabled = false;
    if (npc.inter) npc.inter.disabled = true;
  },
  hide(id) { this.hideNpc(id); },

  spawnNpc(def) {
    const look = def.look || (def.cls ? trainerLook(def.cls, def.id) : npcLook(def.kind || 'homme', def.id));
    const npc = new NPC2D({ ...def, look }, this.map, { baker: this.baker });
    npc.spawned = true;
    npc.runFast = true;
    this.map.npcs.push(npc);
    if (npc.collider) npc.collider.enabled = false;
    return npc;
  },

  despawn(n) {
    const npc = this.npc(n);
    if (!npc) return;
    const i = this.map.npcs.indexOf(npc);
    if (i >= 0) this.map.npcs.splice(i, 1);
    npc.group.visible = false;
  },

  async walk(n, x, z) {
    const npc = this.npc(n);
    if (!npc || !Number.isFinite(x) || !Number.isFinite(z)) return;
    npc.busy = true;
    if (npc.collider) npc.collider.enabled = false;
    const t0 = performance.now();
    await Promise.race([npc.walkTo(x, z), sleep(Math.max(2, Math.hypot(x - npc.position.x, z - npc.position.z) / 1.5))]);
    npc.path = null;
    npc.move = null;
    npc.position.set(x, 0, z);
    npc.snap(this.map);
    npc.playAnim('idle');
    if (npc.collider && !npc.spawned) npc.collider.enabled = true;
    npc.home?.copy(npc.position);
    npc.busy = false;
    return performance.now() - t0;
  },

  face(n, target) {
    const npc = this.npc(n);
    if (!npc) return;
    if (target === 'player') npc.faceTowards(this.player.position.x, this.player.position.z, 20);
    else if (target && typeof target === 'object') npc.faceTowards(target.x, target.z, 20);
    this.facePlayerTo(npc.position.x, npc.position.z);
  },

  facePlayerTo(x, z) {
    const P = this.player;
    P.rotY = Math.atan2(x - P.position.x, z - P.position.z);
    P.group.rotation.y = P.rotY;
  },

  async exclaim(n) {
    const npc = this.npc(n);
    if (!npc) return;
    this.audio.play('exclaim');
    await this.ui.exclaim(npc.position, npc.height || 1.7);
  },

  /** Recule d'une tuile (sans se retourner). */
  async stepBack() {
    const P = this.player, map = this.map;
    while (P.move) await sleep(0.02);
    const d = P.dir, back = [3, 2, 1, 0][d];
    const [c, r] = P.tile(map);
    const [dc, dr] = DIRS[back];
    if (map.canEnter(P, c + dc, r + dr, back)) { await P.forceStep(back); }
    P.dir = d;
  },

  cameraFocus(x, z) {
    this.camFocus = new THREE.Vector3(x, 0, z);
  },
  cameraRelease() { this.camFocus = null; this.camEase = 0.8; },

  async warp(mapId, entry) {
    const wasBusy = this.transitioning;
    if (wasBusy) return;
    this.transitioning = true;
    await this.ui.fade(1, 0.45);
    await this.enterMap(mapId, entry);
    await this.ui.fade(0, 0.45);
    this.transitioning = false;
  },

  // ── Lumins ─────────────────────────────────────────────────────────
  async chooseStarter() {
    return this.ui.screens.starter(STARTERS);
  },

  async choosePartyMon(title, check) {
    const i = await this.ui.screens.chooseMon(this.team, { title, check });
    return i === null || i === undefined ? null : this.team[i];
  },

  async chooseMove(moveIds, title) {
    const i = await this.ui.screens.chooseList(title, moveIds.map((id) => ({ label: MOVES[id].name, sub: `${MOVES[id].type} · ${MOVES[id].power || '—'}`, type: MOVES[id].type, move: id })));
    return i === null || i === undefined ? null : moveIds[i];
  },

  /** Apprend une attaque (remplacement si 4 attaques). */
  async teachMove(mon, moveId) {
    const mv = MOVES[moveId];
    if (mon.knows(moveId)) { await this.say(null, [`${mon.name} connaît déjà ${mv.name}.`]); return false; }
    if (mon.moves.length < 4) {
      mon.learn(moveId);
      this.audio.play('learn');
      await this.say(null, [`${mon.name} apprend ${mv.name} !`]);
      return true;
    }
    const idx = await this.ui.screens.forgetMove(mon, moveId);
    if (idx === null || idx === undefined || idx < 0) { await this.say(null, [`${mon.name} n'a pas appris ${mv.name}.`]); return false; }
    const old = MOVES[mon.moves[idx].id].name;
    mon.learn(moveId, idx);
    this.audio.play('learn');
    await this.say(null, ['1, 2 et… Tadaa !', `${mon.name} oublie ${old} et apprend ${mv.name} !`]);
    return true;
  },

  /** Donne un Lumin (équipe ou PC), avec surnom facultatif. */
  async giveMon(speciesId, level, opts = {}) {
    const c = Creature.create(speciesId, level, { shinyOdds: this.data.bag.charme_chroma ? 341 : 1024, extra: { ot: opts.ot || this.data.name, ball: 'prisme', met: this.map?.def.name, friendship: opts.friendship ?? 70 } });
    if (opts.nickname) c.nickname = opts.nickname;
    this.registerCaught(c);
    this.audio.play('fanfare_short');
    await this.say(null, [`{player} reçoit ${c.def.name} !`]);
    if (!opts.nickname && !opts.noNick) {
      const k = await this.ask(null, `Donner un surnom à ${c.def.name} ?`);
      if (k === 0) {
        const n = await this.ui.screens.nameEntry(`Surnom de ${c.def.name}`, c.def.name, 12);
        if (n && n !== c.def.name) c.nickname = n;
      }
    }
    await this.storeCreature(c);
    return c;
  },

  async giveEgg(speciesId) {
    if (this.team.length >= 6) { await this.say(null, ['Votre équipe est pleine ! Faites de la place pour recevoir l\'Œuf.']); return false; }
    const c = Creature.create(speciesId, 1, { shinyOdds: this.data.bag.charme_chroma ? 341 : 1024, extra: { egg: true, ot: this.data.name } });
    c.egg = true;
    c.eggCycles = CREATURE_MAP[speciesId].hatch || 20;
    this.team.push(c);
    this.audio.play('item');
    await this.say(null, ['{player} reçoit un Œuf !']);
    this.refreshHUD();
    return true;
  },

  async heal(silent = false) {
    this.audio.play('heal');
    if (!silent) {
      await this.ui.healJingle();
    }
    this.healParty();
    this.refreshHUD();
  },

  /** Combat de dresseur scripté ou placé. */
  async battle(def) {
    const r = await this.battleCtl.trainerBattle(def);
    return r;
  },

  async wildBattle(species, level, opts = {}) {
    return this.battleCtl.wildBattle(species, level, opts);
  },

  async hallOfFame() {
    await this.ui.screens.hallOfFame(this.team, this.data);
  },
};

