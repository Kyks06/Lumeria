import * as THREE from 'three';
import { GAME, DIFFICULTY, LEVEL_CAPS } from '../config/game.js';
import { MODELS } from '../config/models.js';
import { ITEMS } from '../config/items.js';
import { TYPES } from '../config/types.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { TRAINER_CLASSES, trainerLine } from '../config/trainers.js';
import { BADGE_MAP } from '../config/badges.js';
import { Assets } from '../core/Assets.js';
import { Save } from '../core/Save.js';
import { tweens, sleep, damp, clamp } from '../core/utils.js';
import { DayNight } from '../world2d/DayNight.js';
import { Weather2D } from '../world2d/Weather2D.js';
import { Particles2D, hdr, SHAPE } from '../world2d/Particles2D.js';
import { Player2D } from '../world2d/Actors2D.js';
import { MapManager2D } from '../world2d/MapManager2D.js';
import { Renderer2D } from '../world2d/Renderer2D.js';
import { F, DIRS } from '../world2d/tiles.js';
import { getBaker } from '../pixel/bake.js';
import { BIOMES } from '../world/Biomes.js';
import { BattleStage2D as BattleStage } from '../battle/BattleStage2D.js';
import { BattleController } from '../battle/BattleController.js';
import { UI } from '../ui/UI.js';
import { SCRIPTS } from './Scripts.js';
import { objectiveText } from './Story.js';
import { ScriptAPI } from './ScriptAPI.js';
import { FieldActions } from './Field.js';
import { PartyMixin } from './Party.js';

/**
 * JEU : boucle principale, exploration, cartes, interactions, sauvegarde.
 * Les méthodes de mise en scène (ScriptAPI), de terrain (Field) et d'équipe (Party) sont ajoutées en mixins.
 */
export class Game {
  constructor(engine, input, audio, bgm, settings) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.bgm = bgm;
    this.settings = settings;
    this.assets = new Assets();
    this.state = 'boot';
    this.busy = 0;
    this.data = this.blankData();
    this.team = [];
    this.timeScale = 1;
    this.tmpV = new THREE.Vector3();
    this.shakeV = new THREE.Vector3();
    this.stepAcc = 0;
    this.encounterCooldown = 0;
    this.triggerInside = new Set();
    this.smokeT = 0;
    this.playTimeAcc = 0;
  }

  get map() { return this.maps?.current; }
  get party() { return this.team; }
  get badgeCount() { return this.data.badges.length; }
  hasBadge(id) { return this.data.badges.includes(id); }
  get levelCap() { return this.data.rules?.levelcap ? LEVEL_CAPS[Math.min(this.badgeCount, LEVEL_CAPS.length - 1)] : 0; }
  timeOfDay() { return this.sky.timeOfDay(); }
  typeName(t) { return TYPES[t]?.name || t; }

  // ── Démarrage ──────────────────────────────────────────────────────
  async boot() {
    this.ui = new UI(this);
    this.ui.setLoading(0.02, 'Préparation du moteur…');
    this.sky = new DayNight();
    this.weather = new Weather2D();
    this.fxAdd = new Particles2D(3000, { additive: true });
    this.fxNorm = new Particles2D(2500, { additive: false });
    this.baker = getBaker(this.assets);
    this.view = new Renderer2D(this);
    this.camRig = { yaw: 0, setMode() {}, update() {}, snapBehind: () => this.view.snapCamera() };
    this.maps = new MapManager2D(this);

    // Modèles .glb listés dans models/manifest.json (facultatifs)
    this.ui.setLoading(0.06, 'Recherche des modèles 3D…');
    const manifest = await this.loadManifest();
    await this.assets.load(manifest, (f, label) => this.ui.setLoading(0.06 + f * 0.5, `Modèles : ${label.split('/').pop()}`));
    this.player = new Player2D('garcon');
    this.player.group.visible = false;
    this.battleStage = new BattleStage(this);
    this.battleCtl = new BattleController(this);

    this.ui.setLoading(0.65, 'Construction de Clairvent…');
    await this.loadTitleMap();
    this.ui.setLoading(1, 'Prêt !');
    this.bindInput();
    await this.ui.hideLoading();
    this.showTitle();
  }

  async loadManifest() {
    const out = [];
    try {
      const res = await fetch('models/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return out;
      const m = await res.json();
      for (const f of m.characters || []) {
        const key = f.replace(/\.glb$/, '');
        const k = key === 'player' ? 'player' : key === 'player_f' ? 'playerGirl' : key === 'npc' ? 'npc' : key;
        out.push({ key: k, url: `models/${f}` });
      }
      for (const f of m.env || []) out.push({ key: `env:${f.replace(/\.glb$/, '')}`, url: `models/env/${f}` });
      for (const f of m.creatures || []) out.push({ key: `creature:${f.replace(/\.glb$/, '')}`, url: `${MODELS.creatureDir}${f}` });
    } catch { /* pas de manifeste : formes générées */ }
    return out;
  }

  blankData() {
    return {
      name: 'Alex', look: 'garcon', difficulty: 'normal', rules: {}, monoType: null, money: GAME.startMoney, playTime: 0, hour: GAME.startHour,
      team: [], boxes: Array.from({ length: GAME.boxes }, () => Array(GAME.boxSize).fill(null)), bag: {}, expShare: false,
      flags: {}, badges: [], defeated: {}, picked: {}, cleared: {}, map: 'clairvent:maison', pos: null, lastHeal: { map: 'clairvent:maison', entry: 'door' },
      dex: { seen: {}, caught: {} }, daycare: { mons: [], steps: 0, egg: false }, repel: 0, visited: {}, fly: {},
      stats: { captures: 0, hatched: 0, shinies: 0, trainers: 0, fishCatches: 0, towerBest: 0, perfectGyms: 0, champion: false, battles: 0 },
      challenges: {}, nuzlocke: { areas: {}, dead: 0, failed: false }, bp: 0, tower: { streak: 0, best: 0 }, starter: null, rivalStarter: null,
    };
  }

  async loadTitleMap() {
    this.data = this.blankData();
    const map = await this.maps.load('clairvent');
    this.configureEnvironment(map);
    this.sky.setHour(17.6);
    this.titleT = 0;
    this.view.snapCamera();
  }

  showTitle() {
    this.state = 'title';
    this.ui.showHUD(false);
    this.bgm.play('title');
    this.ui.screens.title(Save.exists() ? Save.load() : null).then((choice) => this.onTitleChoice(choice));
  }

  async onTitleChoice(choice) {
    if (choice.action === 'continue') {
      const d = Save.load();
      if (!d) { this.showTitle(); return; }
      await this.ui.fade(1, 0.6);
      this.loadData(d);
      await this.enterMap(this.data.map, null, this.data.pos);
      this.startExplore();
      await this.ui.fade(0, 0.6);
      this.ui.toast('Partie chargée.');
    } else if (choice.action === 'new') {
      await this.newGame(choice.setup);
    }
  }

  /** Nouvelle partie : intro du Professeur, puis réveil dans la chambre. */
  async newGame(setup) {
    this.data = this.blankData();
    Object.assign(this.data, { name: setup.name || 'Alex', look: setup.look, difficulty: setup.difficulty, rules: setup.rules || {} });
    this.team = [];
    this.player.setLook(setup.look);
    await this.ui.fade(1, 0.8);
    this.bgm.play('intro');
    await this.ui.screens.intro(this.data.name);
    this.data.flags.intro = true;
    this.sky.setHour(GAME.startHour);
    await this.enterMap('clairvent:maison', 'bed');
    this.startExplore();
    await this.ui.fade(0, 0.8);
    this.ui.showArea({ name: 'Clairvent', sub: 'Village des brises marines' });
    await this.say('Maman', ['{player} ! Debout, mon grand !', 'C\'est le grand jour : le Professeur Aubin t\'attend au laboratoire !']);
    this.autosave(true);
  }

  startExplore() {
    this.state = 'explore';
    this.player.group.visible = true;
    this.ui.showHUD(true);
    this.refreshHUD();
  }

  // ── Drapeaux et conditions ─────────────────────────────────────────
  flag(name) {
    if (name.startsWith('badge:')) return this.hasBadge(name.slice(6));
    if (name.startsWith('has:')) return (this.data.bag[name.slice(4)] || 0) > 0;
    if (name === 'guardians') return !!(this.data.flags.terragorn && this.data.flags.aeroneth && this.data.flags.thalassyre);
    return !!this.data.flags[name];
  }

  setFlag(name, v = true) { if (v) this.data.flags[name] = v; else delete this.data.flags[name]; }

  flagOk(o) {
    if (!o) return true;
    const test = (c) => (typeof c === 'function' ? !!c(this) : Array.isArray(c) ? c.every((x) => this.flag(x)) : this.flag(c));
    if (o.if && !test(o.if)) return false;
    if (o.unless && (typeof o.unless === 'function' ? o.unless(this) : Array.isArray(o.unless) ? o.unless.some((x) => this.flag(x)) : this.flag(o.unless))) return false;
    return true;
  }

  wildCtx() {
    return {
      assets: this.assets,
      timeOfDay: () => this.sky.timeOfDay(),
      shinyOdds: () => (this.data.bag.charme_chroma ? GAME.shinyOddsCharm : GAME.shinyOdds),
      fxAdd: this.fxAdd,
    };
  }

  /** Visibilité des PNJ selon les drapeaux (après un événement). */
  refresh() {
    const map = this.map;
    if (!map) return;
    for (const n of map.npcs) {
      const def = n.trainer || n.def;
      const vis = !n.hiddenByScript && !n.spawned ? this.flagOk(def) : !n.hiddenByScript;
      n.group.visible = vis;
      if (n.collider) n.collider.enabled = vis;
      if (n.inter) n.inter.disabled = !vis;
    }
    this.ui.clearLabels?.();
  }

  // ── Entrées ────────────────────────────────────────────────────────
  bindInput() {
    this.input.on('*', (action, detail) => this.onAction(action, detail));
    this.input.on('device', ({ device }) => this.ui.updateControlsHelp(device));
    const unlock = () => { this.audio.unlock(); this.bgm.unlock(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  onAction(action, detail) {
    if (this.ui.nav.handle(action)) return;
    if (this.state !== 'explore' || this.busy) return;
    if (action === 'confirm') this.interact();
    else if (action === 'pause') this.openPause();
    else if (action === 'cancel' && detail?.key === 'Escape') this.openPause();
    else if (action === 'bike') this.toggleBike();
    else if (action === 'fish') this.tryFish();
    else if (action === 'map') this.openRegionMap();
  }

  openPause() {
    if (this.state !== 'explore' || this.busy) return;
    this.busy++;
    this.player.idle(0);
    this.ui.hidePrompt();
    this.ui.menus.pause().finally(() => { this.busy--; this.refreshHUD(); });
  }

  async openRegionMap() {
    this.busy++;
    try { await this.ui.screens.regionMap(this.map?.kind === 'outdoor'); } finally { this.busy--; }
  }

  // ── Boucle ─────────────────────────────────────────────────────────
  update(dt) {
    if (!this.ui) return;
    this.input.update(dt);
    tweens.update(dt);
    this.ui.update(dt);
    this.bgm.update(dt);
    let present = null;
    if (this.state === 'battle') {
      this.battleStage.update(dt);
      this.weather.update(dt);
      this.fxAdd.update(dt);
      this.fxNorm.update(dt);
      this.battleStage.render(dt);
      present = { tilt: 0, bloom: 1.1, vignette: 0.35, tint: this.weather.tint() };
    } else if (this.state === 'title' && this.map) {
      this.titleT += dt;
      const map = this.map;
      const b = map.bounds;
      const a = this.titleT * 0.05;
      const focus = { x: Math.sin(a) * (b[1] - b[0]) * 0.32, z: Math.cos(a * 0.7) * (b[3] - b[2]) * 0.22 };
      this.sky.update(dt * 0.15, null, null, 1);
      map.update(dt, { game: this });
      this.weather.update(dt);
      this.fxAdd.update(dt);
      this.fxNorm.update(dt);
      this.view.updateCamera(map, focus, dt, true);
      this.view.render(dt, { map, player: null, light: this.sky.state, weather: this.weather });
      present = { tint: this.weather.tint(), heat: this.heatFor(map) };
    } else if (this.map && this.state !== 'boot') {
      this.updateWorld(dt);
      this.watchPerformance(dt);
      this.fxAdd.update(dt);
      this.fxNorm.update(dt);
      this.view.render(dt, { map: this.map, player: this.player, light: this.sky.state, weather: this.weather });
      present = { tint: this.weather.tint(), heat: this.heatFor(this.map), tilt: this.map.kind === 'outdoor' ? undefined : 0.15 };
    }
    this.engine.update(dt);
    if (present) this.engine.present(present);
  }

  heatFor(map) {
    if (map.kind !== 'outdoor') return 0;
    return map.biome?.dunes || map.biome?.lava ? 1 : 0;
  }

  /**
   * Au premier lancement : si l'exploration tourne nettement sous 26 images/s,
   * la qualité graphique descend d'un cran (une seule fois, modifiable dans Options).
   */
  watchPerformance(dt) {
    const S = this.settings;
    if (this.perfDone || S.autoQualityChecked) return;
    if (this.state !== 'explore' || this.busy || this.transitioning) return;
    this.perfT = (this.perfT || 0) + dt;
    if (this.perfT < 4) return;
    (this.perfS ||= []).push(dt);
    if (this.perfS.length < 300 && this.perfT < 16) return;
    this.perfDone = true;
    const sorted = [...this.perfS].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    S.autoQualityChecked = true;
    if (med > 1 / 26 && S.quality !== 'basse') {
      S.quality = S.quality === 'ultra' ? 'haute' : 'basse';
      this.engine.applyQuality();
      this.sky.setShadowQuality(S.quality);
      this.ui.toast(`Qualité graphique réglée sur « ${S.quality === 'basse' ? 'Basse' : 'Haute'} » pour plus de fluidité (Options).`);
    }
    Save.writeSettings(S);
  }

  updateWorld(dt) {
    const map = this.map;
    const P = this.player;
    const menuOpen = this.ui.nav.active && !this.ui.dialogue.open;
    const control = this.state === 'explore' && !this.busy;
    if (!menuOpen) {
      this.playTimeAcc += dt;
      if (this.playTimeAcc >= 1) { this.data.playTime += Math.floor(this.playTimeAcc); this.playTimeAcc %= 1; }
      if (control) {
        P.update(dt, { input: this.input, map, control: true, autoRun: this.settings.autoRun, onStep: (m) => this.onStep(m), onBump: () => this.audio.play('bump') });
        this.afterMove();
      } else P.idle(dt);
      this.sky.update(dt, P.position, null, this.timeScale);
      map.update(dt, { focus: P.position, game: this });
      this.weather.update(dt);
      if (map.wild && this.state === 'explore') {
        const hit = map.wild.update(dt, P, { canEncounter: control && this.encounterCooldown <= 0, repel: this.data.repel > 0, leadLevel: this.leadLevel() });
        this.encounterCooldown -= dt;
        if (hit) this.wildEncounter(hit);
      }
      this.updateSmoke(dt);
    }
    this.view.updateCamera(map, this.camFocus || P.position, dt, !!this.camFocus || this.camEase > 0);
    this.camEase = Math.max(0, (this.camEase || 0) - dt);
    if (control && !this.busy) {
      // une seule action par image : chaque vérification peut lancer un événement (busy++)
      this.checkWarps();
      if (!this.busy) this.checkExits();
      if (!this.busy && !this.transitioning) this.checkTriggers();
      if (!this.busy && !this.transitioning) this.checkSight();
      if (!this.busy) this.updatePrompt(); else this.ui.hidePrompt();
    } else this.ui.hidePrompt();
    this.ui.updateLabels(map.npcs.filter((n) => n.group.visible && n.name), this.view, P.position, (n) => (n.trainer && !this.trainerDefeated(n.trainer) ? 'trainer' : ''));
    if (this.hudT === undefined || (this.hudT -= dt) <= 0) {
      this.hudT = 0.5;
      this.ui.setClock(this.sky.clockString(), this.sky.isNight, this.map.kind === 'outdoor');
      this.ui.minimap.update(map, P);
    }
  }

  updateSmoke(dt) {
    const map = this.map;
    if (!map.smokes.length) return;
    this.smokeT -= dt;
    if (this.smokeT > 0) return;
    this.smokeT = 0.18;
    for (const s of map.smokes) {
      if (s.distanceToSquared(this.player.position) > 3600) continue;
      this.fxNorm.emit({ pos: [s.x, s.y, s.z], vel: [0.25 + Math.random() * 0.2, 0.9 + Math.random() * 0.4, 0], color: [0.75, 0.74, 0.72], color1: [0.95, 0.95, 0.95], size: 0.35, size1: 1.0, life: 2.4, shape: SHAPE.smoke, alpha: 0.55 });
    }
  }

  leadLevel() {
    const c = this.team.find((m) => m.canBattle);
    return c ? c.level : 0;
  }

  /** Après chaque déplacement : surf ↔ terre, hautes herbes, éclaboussures. */
  afterMove() {
    const P = this.player, map = this.map;
    if (P.mode === 'surf' && !P.moving && !map.isWaterAt(P.position.x, P.position.z)) {
      P.setMode('walk');
      this.audio.play('land');
      this.ui.setMount('walk');
      this.music();
    }
    // brins d'herbe soulevés à chaque pas dans les hautes herbes
    const ev = P.stepFx;
    if (ev) {
      P.stepFx = null;
      const p = P.position, T = map.T;
      for (let i = 0; i < 4; i++) this.fxNorm.emit({ pos: [p.x + (Math.random() - 0.5) * 0.5 * T, 0.2, p.z + 0.2 * T], vel: [(Math.random() - 0.5) * 2, 2 + Math.random(), 0], color: hdr(map.biome?.tall?.[1] || '#79a63c', 1), size: 0.12, size1: 0.1, life: 0.45, gravity: 9, shape: SHAPE.leaf, spin: 6 });
    }
  }

  onStep(meters) {
    this.stepAcc += meters;
    while (this.stepAcc >= GAME.stepMeters) {
      this.stepAcc -= GAME.stepMeters;
      this.data.steps = (this.data.steps || 0) + 1;
      if (this.data.repel > 0) {
        this.data.repel--;
        if (this.data.repel === 0) this.ui.toast('L\'effet de la Repousse s\'est dissipé.');
      }
      this.stepParty();
    }
  }

  // ── Interactions ───────────────────────────────────────────────────
  updatePrompt() {
    const it = this.map.findInteractable(this.player.position, this.player.rotY);
    if (!it || it.hidden) { this.ui.hidePrompt(); return; }
    const label = { npc: 'Parler', trainer: 'Parler', sign: 'Lire', item: 'Ramasser', counter: 'Parler', obstacle: 'Examiner', climb: 'Escalader', prop: 'Examiner' }[it.type] || 'Interagir';
    this.ui.showPrompt(label);
  }

  async interact() {
    const P = this.player;
    const it = this.map.findInteractable(P.position, P.rotY);
    if (!it) {
      if (this.facingWater()) await this.offerSurfOrFish();
      return;
    }
    this.busy++;
    this.ui.hidePrompt();
    P.idle(0);
    try {
      switch (it.type) {
        case 'npc': await this.talkNpc(it.npc); break;
        case 'trainer': await this.talkTrainer(it.npc); break;
        case 'sign': await this.say(null, it.lines); break;
        case 'item': await this.pickItem(it); break;
        case 'counter': await this.counterAction(it); break;
        case 'obstacle': await this.useObstacle(it.ob); break;
        case 'climb': await this.climb(it); break;
        case 'prop': await this.propAction(it.def); break;
        default: break;
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.busy--;
      this.refresh();
      this.refreshHUD();
    }
  }

  async talkNpc(npc) {
    const def = npc.def;
    npc.busy = true;
    if (!def.creature) npc.faceTowards(this.player.position.x, this.player.position.z, 30);
    else { npc.faceTowards(this.player.position.x, this.player.position.z, 6); npc.animator.play?.('happy'); this.audio.play(CREATURE_MAP[def.creature].types[0]); }
    try {
      if (def.script) await this.runScript(def.script, { npc, def });
      else if (def.give && !this.flag(def.give.flag)) {
        await this.say(npc, def.talk || []);
        this.setFlag(def.give.flag);
        await this.give(def.give.item, def.give.qty || 1);
      } else if (def.give && def.talk) await this.say(npc, def.give.after || [def.talk[def.talk.length - 1]]);
      else if (def.talk) await this.say(npc, typeof def.talk === 'function' ? def.talk(this) : def.talk);
    } finally {
      npc.busy = false;
      npc.talkTimer = 2;
    }
  }

  async runScript(name, ctx = {}) {
    const fn = SCRIPTS[name];
    if (!fn) { console.warn('Script inconnu', name); return; }
    await fn(this, { map: this.map, ...ctx });
  }

  trainerDefeated(t) {
    if (t.e4) return this.flag(`e4_${t.e4}`);
    return !!this.data.defeated[t.id];
  }

  async talkTrainer(npc) {
    const t = npc.trainer;
    npc.faceTowards(this.player.position.x, this.player.position.z, 30);
    if (this.trainerDefeated(t)) {
      const line = t.after || t.leader?.after || [trainerLine(t.cls, t.id, 'defeat') || 'Quel combat, c\'était !'];
      await this.say(npc, line);
      return;
    }
    await this.trainerBattle(npc);
  }

  /** Combat contre un dresseur placé sur la carte. */
  async trainerBattle(npc) {
    const t = npc.trainer;
    const intro = t.intro || [trainerLine(t.cls, t.id, 'intro') || 'Combat !'];
    this.bgm.play(t.leader || t.e4 ? 'leader' : ['sbire', 'sbire_f', 'admin', 'admin_f', 'chef', 'scientifique'].includes(t.cls) && t.lookExtra?.accent ? 'ordre' : ['sbire', 'sbire_f', 'admin', 'admin_f', 'chef'].includes(t.cls) ? 'ordre' : 'trainer_intro');
    await this.say(npc, intro);
    const res = await this.battle({ ...t, mapId: this.map.id });
    if (res === 'win') {
      if (t.leader) await this.leaderReward(t, npc);
      if (t.e4) this.setFlag(`e4_${t.e4}`);
      if (t.onWin) await this.runScript(t.onWin, { npc, trainer: t });
      else if (!t.leader && t.after) await this.say(npc, t.after);
    }
    return res;
  }

  async leaderReward(t, npc) {
    const b = BADGE_MAP[t.leader.badge];
    if (!this.hasBadge(b.id)) {
      this.data.badges.push(b.id);
      this.bgm.play('fanfare', { once: true });
      await this.ui.screens.badge(b);
      await this.say(null, [`{player} reçoit le ${b.name} de ${b.leader} !`]);
      if (this.lastBattleNoFaint) this.data.stats.perfectGyms++;
      if (t.leader.tm) {
        await this.say(npc, ['Prends aussi ceci : un Disque Technique. Il apprend une attaque à un Lumin compatible, autant de fois que tu veux.']);
        await this.give(t.leader.tm, 1);
      }
      if (t.leader.after) await this.say(npc, t.leader.after);
      if (this.data.rules?.levelcap) this.ui.toast(`Plafond de niveau : ${this.levelCap}`);
      this.checkChallenges();
      this.autosave();
    }
  }

  checkSight() {
    if (this.busy) return;
    const P = this.player.position;
    for (const n of this.map.npcs) {
      const t = n.trainer;
      if (!t || !n.group.visible || this.trainerDefeated(t) || (t.sight ?? 5) <= 0) continue;
      if (n.position.distanceToSquared(P) > 144) continue;
      if (n.sees(P.x, P.z)) { this.spotted(n); return; }
    }
  }

  async spotted(npc) {
    this.busy++;
    this.player.idle(0);
    try {
      this.bgm.play('trainer_intro');
      await this.exclaim(npc);
      const map = this.map;
      const [pc, pr] = this.player.tile(map), [nc, nr] = npc.tile(map);
      const [dc, dr] = DIRS[npc.dir];
      if (Math.abs(pc - nc) + Math.abs(pr - nr) > 1) { const t = map.center(pc - dc, pr - dr); await this.walk(npc, t.x, t.z); }
      npc.dir = npc.dir;
      this.facePlayerTo(npc.position.x, npc.position.z);
      await this.trainerBattle(npc);
    } finally {
      this.busy--;
      this.refresh();
    }
  }

  async pickItem(it) {
    const id = it.item, qty = it.qty;
    this.data.picked[it.key] = true;
    it.disabled = true;
    if (it.sprite) it.sprite.hidden = true;
    if (it.c !== undefined) this.map.flags.and(it.c, it.r, ~F.BLOCK);
    await this.give(id, qty, { found: true });
  }

  async counterAction(it) {
    switch (it.action) {
      case 'heal': await this.nurseHeal(); break;
      case 'shop': await this.ui.screens.shop(it.shop || this.map.def.shop || this.map.def.parent || 'clairvent'); break;
      case 'daycare': await this.daycareDesk(); break;
      case 'tower': await this.towerDesk(); break;
      case 'bp': await this.ui.screens.bpShop(); break;
      default: break;
    }
  }

  async propAction(def) {
    if (def.action === 'pc') { this.audio.play('pc'); await this.ui.screens.pc(); return; }
    if (def.action === 'rest') {
      const c = await this.ask(null, 'Faire une sieste ?');
      if (c === 0) {
        await this.ui.fade(1, 0.6);
        this.healParty();
        this.sky.setHour(this.sky.hour + 4);
        this.audio.play('heal');
        await sleep(0.6);
        await this.ui.fade(0, 0.6);
        await this.say(null, ['Vous vous sentez reposé. Vos Lumins aussi !']);
        this.data.lastHeal = { map: this.map.id, entry: 'door' };
      }
      return;
    }
    if (def.action === 'tv') {
      const lines = [
        ['« … et la Ligue du Zénith annonce un nouveau record d\'affluence ! »'],
        ['Un documentaire sur les Lumins des abysses. Un Carpéclat dévore un banc entier de Carpaillon !'],
        ['« Ce soir, la météo annonce une pluie d\'étoiles filantes au-dessus d\'Astralis. »'],
        ['Une publicité : « Prismes Rapides : capturez au premier tour ! »'],
      ];
      await this.say(null, lines[Math.floor(Math.random() * lines.length)]);
      return;
    }
    if (def.script) { await this.runScript(def.script, { def }); return; }
    if (def.talk) await this.say(null, def.talk);
  }

  async nurseHeal() {
    const nurse = this.map.npcs.find((n) => n.def.counter === 'heal');
    await this.say(nurse || 'Infirmière', ['Bienvenue au Centre Lumin !', 'Nous soignons vos Lumins gratuitement.']);
    const c = await this.ask(nurse || 'Infirmière', 'Voulez-vous soigner vos Lumins ?');
    if (c !== 0) { await this.say(nurse || 'Infirmière', ['À bientôt !']); return; }
    await this.heal();
    this.data.lastHeal = { map: this.map.id, entry: 'door' };
    await this.say(nurse || 'Infirmière', ['Vos Lumins sont en pleine forme !', 'À bientôt !']);
    this.autosave();
  }

  // ── Portes, sorties, déclencheurs ──────────────────────────────────
  checkWarps() {
    const P = this.player.position;
    const w = this.map.warpAt(P.x, P.z);
    if (!w) return;
    if (w.closed && this.flagOk(w.closed)) {
      this.busy++;
      this.player.idle(0);
      (async () => {
        await this.say(null, w.closed.msg || ['C\'est fermé.']);
        await this.stepBack(1.6);
      })().finally(() => { this.busy--; });
      return;
    }
    if (w.to === 'pantheon') return;
    this.goto(w.to, w.entry || 'door');
  }

  checkExits() {
    const P = this.player.position;
    const e = this.map.exitAt(P.x, P.z);
    if (e) this.goto(e.to, e.entry);
  }

  checkTriggers() {
    const P = this.player.position;
    for (const tr of this.map.triggers) {
      const inside = Math.abs(P.x - tr.x) < tr.w / 2 && Math.abs(P.z - tr.z) < tr.d / 2;
      const key = `${tr.x},${tr.z}`;
      if (!inside) { this.triggerInside.delete(key); continue; }
      if (this.triggerInside.has(key) || !this.flagOk(tr)) continue;
      this.triggerInside.add(key);
      this.busy++;
      this.player.idle(0);
      this.runScript(tr.script, { trigger: tr }).catch((e) => console.error(e)).finally(() => { this.busy--; this.refresh(); this.refreshHUD(); });
      return;
    }
  }

  /** Changement de carte avec fondu. */
  async goto(mapId, entry, opts = {}) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.busy++;
    this.player.idle(0);
    this.audio.play(mapId.includes(':') || this.map?.id.includes(':') ? 'door' : 'step');
    await this.ui.fade(1, opts.fast ? 0.2 : 0.35);
    try {
      await this.enterMap(mapId, entry);
    } catch (e) {
      console.error(e);
    }
    await this.ui.fade(0, 0.4);
    this.busy--;
    this.transitioning = false;
    this.encounterCooldown = 1.2;
  }

  /** Construit la carte et place le joueur (sans fondu). */
  async enterMap(mapId, entry, pos = null) {
    const prev = this.map?.id;
    if (this.player.mode === 'bike' && (mapId.includes(':') || this.maps.getDef(mapId)?.type === 'grid')) this.player.setMode('walk');
    const map = await this.maps.load(mapId);
    const def = map.def;
    map.player = this.player;
    this.data.map = mapId;
    const e = pos || map.entry(entry || 'default');
    const surfing = this.player.mode === 'surf';
    this.player.place(e.x, e.z, e.rot ?? Math.PI, map);
    if (surfing && !map.isWaterAt(this.player.position.x, this.player.position.z)) this.player.setMode('walk');
    if (!surfing && map.isWaterAt(this.player.position.x, this.player.position.z) && this.canSurf()) this.startSurfMount();
    this.configureEnvironment(map);
    this.view.snapCamera();
    this.view.warm(map, this.player.position, 1);
    this.fxAdd.clear(); this.fxNorm.clear();
    this.triggerInside.clear();
    this.refresh();
    // première visite
    const area = def.area || (mapId.includes(':') ? def.parent : mapId);
    if (!this.data.visited[mapId]) this.data.visited[mapId] = true;
    if (def.type === 'town' && def.fly) this.data.fly[mapId] = true;
    if (mapId === 'ligue' && prev?.startsWith('conseil')) for (const k of ['e4_1', 'e4_2', 'e4_3', 'e4_4']) this.setFlag(k, false);
    if (!mapId.includes(':') && def.type !== 'grid' && prev !== mapId) {
      const parentPrev = prev?.split(':')[0];
      if (parentPrev !== mapId) this.ui.showArea({ name: def.name, sub: def.sub || '' });
    }
    if (map.dark && this.hasBadge('brume')) {
      this.sky.biome.lanternOn = true;
      if (prev !== mapId) this.ui.toast('Votre Lumin éclaire les ténèbres avec Lanterne !');
    }
    this.bgm.play(def.music || (map.kind === 'interior' ? 'house' : 'route1'));
    this.ui.minimap.setMap(map);
    if (this.state === 'explore') this.autosave(true);
    return map;
  }

  configureEnvironment(map) {
    const def = map.def;
    if (map.kind === 'outdoor') {
      const b = map.biome;
      this.sky.configure('outdoor', { ...(b.sky || {}) });
      this.weather.set(def.weather || b.weather || []);
    } else if (map.kind === 'cave') {
      this.sky.configure('cave', { dark: !!map.dark, lanternOn: map.dark && this.hasBadge('brume') });
      this.weather.set([]);
    } else {
      if (map.dark) this.sky.configure('cave', { dark: true, lanternOn: false });
      else this.sky.configure('indoor', {});
      this.weather.set([]);
    }
  }

  // ── Rencontres ─────────────────────────────────────────────────────
  async wildEncounter(entity) {
    this.busy++;
    this.player.idle(0);
    try {
      const map = this.map;
      const res = await this.wildBattle(entity.sp.id, entity.level, { shiny: entity.shiny, method: entity.method, entity });
      if (res === 'run' || res === 'lose') {
        entity.state = 'flee'; entity.timer = 3; entity.noticed = true;
        this.encounterCooldown = 2.5;
      } else map.wild?.remove(entity, 20);
    } finally {
      this.busy--;
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────
  refreshHUD() {
    this.ui.setMoney(this.data.money);
    this.ui.updateTeamStrip(this.team);
    this.ui.setObjective(objectiveText(this));
    this.ui.setMount(this.player.mode);
  }

  // ── Sauvegarde ─────────────────────────────────────────────────────
  serialize() {
    const P = this.player;
    return {
      ...this.data,
      team: this.team.map((c) => c.toJSON()),
      hour: this.sky.hour,
      pos: this.map && !this.map.id.startsWith('conseil') ? { x: P.position.x, z: P.position.z, rot: P.rotY } : null,
      map: this.map?.id.startsWith('conseil') ? 'ligue' : this.data.map,
      mode: P.mode === 'surf' ? 'surf' : 'walk',
    };
  }

  saveGame() {
    const ok = Save.write(this.serialize());
    return ok;
  }

  autosave(silent = false) {
    if (!this.settings.autosave && silent === true && this.data.flags.intro && this.state !== 'explore') return;
    if (this.state !== 'explore' && !silent) return;
    if (this.saveGame() && !silent) this.ui.toast('Partie sauvegardée.');
  }
}

Object.assign(Game.prototype, ScriptAPI, FieldActions, PartyMixin);
export { DIFFICULTY, ITEMS, TRAINER_CLASSES, BIOMES, damp, clamp };
