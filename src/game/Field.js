import * as THREE from 'three';
import { CREATURE_MAP } from '../config/creatures.js';
import { FIELD_BADGE, FIELD_TYPES, BADGE_MAP } from '../config/badges.js';
import { rollEncounter } from '../world2d/encounters.js';
import { hdr, SHAPE } from '../world2d/Particles2D.js';
import { F, DIRS } from '../world2d/tiles.js';
import { SPEED } from '../world2d/Actors2D.js';
import { indexSprites } from '../world2d/buildOutdoor.js';
const WATER_LEVEL = 0;
import { tweens, sleep, Ease } from '../core/utils.js';

/**
 * CAPACITÉS DE TERRAIN ET DÉPLACEMENTS : vélo, surf, pêche, Coupe, Éclate-Roc, Force, Escalade, Vol,
 * Corde Sortie. Méthodes ajoutées au prototype de Game.
 */
export const FieldActions = {
  canField(field) {
    const b = FIELD_BADGE[field];
    return !b || this.hasBadge(b);
  },

  /** Lumin de l'équipe le plus adapté à une capacité (pour l'annonce). */
  fieldMon(field) {
    const types = FIELD_TYPES[field] || [];
    return this.team.find((c) => c.canBattle && c.types.some((t) => types.includes(t))) || this.team.find((c) => c.canBattle) || null;
  },

  async announceField(field, name) {
    const mon = this.fieldMon(field);
    if (mon) {
      this.audio.play(mon.types[0]);
      await this.ui.fieldCutin(mon, name);
      await this.say(null, [`${mon.name} utilise ${name} !`]);
    }
  },

  // ── Vélo ───────────────────────────────────────────────────────────
  toggleBike() {
    const P = this.player;
    if (!this.has('velo')) { this.ui.toast('Vous n\'avez pas de vélo.'); return; }
    if (P.mode === 'surf') return;
    if (this.map.kind === 'interior' || this.map.kind === 'grid') { this.ui.toast('Impossible de rouler à l\'intérieur !'); return; }
    if (P.mode === 'bike') { P.setMode('walk'); this.audio.play('bikeoff'); } else { P.setMode('bike'); this.audio.play('bikeon'); }
    this.bgm.setLayer?.('bike', P.mode === 'bike');
    this.ui.setMount(P.mode);
  },

  /** Dalle de téléportation (arènes, repaire) : éclair, fondu bref et réapparition sur la dalle jumelle. */
  async teleportFx(pos, dst) {
    this.busy++;
    try {
      const P = this.player;
      P.idle(0);
      P.slideDir = null;
      this.audio.play('cast');
      const burst = (x, y, z) => {
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 0.7;
          this.fxAdd.emit({ pos: [x + Math.cos(a) * r, y + Math.random() * 1.8, z + Math.sin(a) * r], vel: [0, 2 + Math.random() * 3, 0], color: [0.6, 0.9, 3], color1: [1, 1, 1], size: 0.22, size1: 0, life: 0.7, drag: 1.2, shape: SHAPE.spark });
        }
      };
      burst(pos.x, 0, pos.z);
      await this.ui.fade(1, 0.16);
      P.move = null;
      P.position.set(dst.x, 0, dst.z);
      P.snap(this.map);
      this.view.snapCamera();
      await sleep(0.08);
      await this.ui.fade(0, 0.2);
      burst(dst.x, P.position.y, dst.z);
    } finally {
      this.busy--;
    }
  },

  // ── Eau : surf et pêche ────────────────────────────────────────────
  /** Tuile d'eau juste devant le joueur ? */
  facingWater() {
    const P = this.player, map = this.map;
    if (P.mode === 'surf') return false;
    const [c, r] = P.tile(map);
    const [dc, dr] = DIRS[P.dir];
    const f = map.flags.get(c + dc, r + dr);
    if ((f & F.WATER) && !(f & F.BRIDGE) && !(f & F.BLOCK) && !map.actorAt(c + dc, r + dr)) return map.center(c + dc, r + dr);
    return false;
  },

  canSurf() { return this.canField('surf'); },

  async offerSurfOrFish() {
    this.busy++;
    this.player.idle(0);
    try {
      const options = [];
      if (this.canSurf()) options.push('Surfer');
      if (this.has('canne') || this.has('super_canne')) options.push('Pêcher');
      if (!options.length) { await this.say(null, ['L\'eau est d\'un bleu profond.', this.hasBadge('eclair') ? '' : 'Un Lumin Eau pourrait vous porter… avec le Badge Éclair.'].filter(Boolean)); return; }
      options.push('Rien');
      const c = await this.ask(null, 'L\'eau est calme. Que faire ?', options);
      if (options[c] === 'Surfer') await this.startSurf();
      else if (options[c] === 'Pêcher') await this.fish();
    } finally { this.busy--; }
  },

  startSurfMount() {
    const mon = this.team.find((c) => c.canBattle && c.types.includes('eau'));
    this.player.setMode('surf', { species: mon?.species });
    this.ui.setMount('surf');
  },

  async startSurf() {
    if (this.player.mode === 'bike') this.player.setMode('walk');
    const w = this.facingWater(2.6);
    if (!w) return;
    await this.announceField('surf', 'Surf');
    const P = this.player;
    this.startSurfMount();
    this.audio.play('splash');
    P.hopT = 0.5;
    await P.forceStep(P.dir, SPEED.surf * 0.8);
    const tx = w.x, tz = w.z;
    for (let i = 0; i < 24; i++) this.fxNorm.emit({ pos: [tx, 0.1, tz], vel: [(Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 1.5], color: hdr('#cfefff', 1.2), size: 0.16, size1: 0.06, life: 0.7, gravity: 10, shape: SHAPE.drop });
    this.bgm.play('surf');
  },

  tryFish() {
    if (this.busy || this.state !== 'explore') return;
    if (!this.has('canne') && !this.has('super_canne')) { this.ui.toast('Vous n\'avez pas de canne à pêche.'); return; }
    if (!this.facingWater() && this.player.mode !== 'surf') { this.ui.toast('Placez-vous face à l\'eau pour pêcher.'); return; }
    this.busy++;
    this.player.idle(0);
    this.fish().finally(() => { this.busy--; });
  },

  /** Pêche : attendre la touche, appuyer au bon moment. */
  async fish() {
    const table = this.map.encounters?.fish;
    const rod = this.has('super_canne') ? 2 : 1;
    const P = this.player;
    const [pc, pr] = P.tile(this.map), [dc, dr] = DIRS[P.dir];
    const spot = this.facingWater() || this.map.center(pc + dc * (P.mode === 'surf' ? 1 : 1), pr + dr);
    this.audio.play('cast');
    const bob = this.ui.fishing.begin(new THREE.Vector3(spot.x, WATER_LEVEL, spot.z));
    P.playAnim('fish');
    if (!table?.length) {
      await sleep(2.2);
      bob.end();
      P.playAnim('idle');
      await this.say(null, ['Rien ne mord ici…']);
      return;
    }
    const wait = 1.2 + Math.random() * 2.8;
    const ok = await bob.waitBite(wait, rod === 2 ? 1.0 : 0.75);
    bob.end();
    P.playAnim('idle');
    if (!ok) { await this.say(null, ['Raté ! Le Lumin s\'est échappé…']); return; }
    let enc = rollEncounter(table, this.timeOfDay());
    if (rod === 2 && enc) {
      enc.level += 4;
      if (Math.random() < 0.35) {
        const rare = [...table].sort((a, b) => (a[3] || 10) - (b[3] || 10))[0];
        enc = { species: rare[0], level: Math.round((rare[1] + rare[2]) / 2) + 4 };
      }
    }
    if (!enc) return;
    this.audio.play('splash');
    await this.say(null, ['Ça mord !']);
    const res = await this.wildBattle(enc.species, enc.level, { method: 'fish' });
    if (res === 'caught') { this.data.stats.fishCatches++; this.checkChallenges(); }
  },

  // ── Obstacles ──────────────────────────────────────────────────────
  async useObstacle(ob) {
    const info = {
      cut: ['cut', 'Coupe', 'Cet arbuste fin pourrait être coupé.'],
      smash: ['smash', 'Éclate-Roc', 'Ce rocher est fissuré. Un Lumin puissant pourrait le briser.'],
      boulder: ['strength', 'Force', 'Un énorme rocher rond. Un Lumin très fort pourrait le pousser.'],
    }[ob.t];
    if (!info) return;
    const [field, name, desc] = info;
    if (!this.canField(field)) {
      const b = BADGE_MAP[FIELD_BADGE[field]];
      await this.say(null, [desc, `(Il faut le ${b.name} pour utiliser ${name}.)`]);
      return;
    }
    if (ob.t === 'boulder') { await this.pushBoulder(ob, name); return; }
    const c = await this.ask(null, `${desc} Utiliser ${name} ?`);
    if (c !== 0) return;
    await this.announceField(field, name);
    this.audio.play(ob.t === 'cut' ? 'cut' : 'smash');
    const pos = new THREE.Vector3(ob.x, 0.6, ob.z);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * 6.28, v = 2 + Math.random() * 3;
      (ob.t === 'cut' ? this.fxNorm : this.fxNorm).emit({ pos: pos.toArray(), vel: [Math.cos(a) * v, 2 + Math.random() * 3, Math.sin(a) * v], color: ob.t === 'cut' ? hdr('#5fae44', 1) : [0.6, 0.55, 0.48], size: 0.3, size1: 0.15, life: 1, gravity: 9, shape: ob.t === 'cut' ? SHAPE.leaf : SHAPE.chunk, spin: 6, floor: pos.y - 0.8 });
    }
    this.engine.addShake(ob.t === 'smash' ? 0.2 : 0.05);
    if (ob.sprite) { for (let k = 0; k < 4; k++) { ob.sprite.hidden = k % 2 === 0; await sleep(0.07); } }
    this.map.colliders.remove(ob.collider);
    ob.inter.disabled = true;
    if (ob.persist) this.data.cleared[ob.key] = true;
    if (ob.t === 'smash' && Math.random() < 0.25) {
      const loot = ['pepite', 'perle', 'super_potion', 'eclat_etoile', 'pierre_dure'][Math.floor(Math.random() * 5)];
      await this.give(loot, 1, { found: true });
    }
  },

  async pushBoulder(ob, name) {
    const P = this.player;
    if (!this.strengthOn) {
      const c = await this.ask(null, 'Un énorme rocher rond. Utiliser Force ?');
      if (c !== 0) return;
      await this.announceField('strength', name);
      this.strengthOn = this.map.id;
      await this.say(null, ['Vous pouvez maintenant pousser les rochers sur cette carte.']);
    }
    if (this.strengthOn !== this.map.id) { this.strengthOn = null; return this.pushBoulder(ob, name); }
    // le rocher avance d'une tuile dans la direction du regard
    const map = this.map;
    const [dc, dr] = DIRS[P.dir];
    const nc = ob.c + dc, nr = ob.r + dr;
    const free = map.inside(nc, nr) && !(map.flags.get(nc, nr) & (F.BLOCK | F.WATER | F.LAVA)) && !map.actorAt(nc, nr);
    if (!free) { this.audio.play('deny'); await this.say(null, ['Le rocher ne bouge pas.']); return; }
    this.audio.play('push');
    const rec = ob.sprite;
    const fx = rec.x, fy = rec.y, fb = rec.base;
    map.flags.and(ob.c, ob.r, ~F.BLOCK);
    map.flags.or(nc, nr, F.BLOCK);
    await tweens.tween(0.4, (t) => { rec.x = Math.round(fx + dc * 16 * t); rec.y = Math.round(fy + dr * 16 * t); rec.base = fb + dr * 16 * t; }, Ease.inOutCubic);
    ob.c = nc; ob.r = nr;
    const p = map.center(nc, nr);
    ob.x = p.x; ob.z = p.z;
    ob.inter.tiles = [[nc, nr]];
    ob.inter.pos?.set(p.x, 0, p.z);
    ob.collider.onRemove = () => { map.flags.and(ob.c, ob.r, ~F.BLOCK); rec.hidden = true; };
    indexSprites(map);
    this.engine.addShake(0.08);
  },

  canUseStrength() {
    return !!this.map?.def.allowPush || this.hasBadge('roc');
  },

  async climb(it) {
    if (!this.canField('climb')) { await this.say(null, ['Une paroi rocheuse.', '(Il faut le Badge Givre pour utiliser Escalade.)']); return; }
    const c = await this.ask(null, 'Une paroi rocheuse. Utiliser Escalade ?');
    if (c !== 0) return;
    if (this.player.mode !== 'walk') this.player.setMode('walk');
    await this.announceField('climb', 'Escalade');
    const P = this.player, map = this.map;
    const from = P.position.clone();
    const [tx, tz] = it.dest;
    P.mode = 'climb';
    P.rotY = Math.atan2(tx - from.x, tz - from.z);
    this.audio.play('climb');
    await tweens.tween(1.4, (t) => {
      P.position.x = from.x + (tx - from.x) * t;
      P.position.z = from.z + (tz - from.z) * t;
      P.lift = Math.round(Math.sin(t * Math.PI) * 10);
      P.animT += 0.03;
    }, Ease.inOutSine);
    P.lift = 0;
    P.mode = 'walk';
    P.place(tx, tz, P.rotY, map);
  },

  // ── Vol et Corde Sortie ────────────────────────────────────────────
  async flyTo(townId) {
    if (!this.canField('fly')) return false;
    if (this.map.kind !== 'outdoor') { await this.say(null, ['Impossible de s\'envoler ici !']); return false; }
    const mon = this.fieldMon('fly');
    if (mon) await this.say(null, [`${mon.name} utilise Vol !`]);
    this.audio.play('fly');
    if (this.player.mode !== 'walk') this.player.setMode('walk');
    await this.goto(townId, 'fly');
    return true;
  },

  async escapeRope() {
    const d = this.map.def;
    if (!(this.map.kind === 'cave' || this.map.kind === 'grid') || d.noEscape) { await this.say(null, ['Ça ne peut pas être utilisé ici.']); return false; }
    // sortie : première sortie de bord vers l'extérieur
    const ex = (d.exits || [])[0] || d.exit;
    if (!ex) return false;
    this.audio.play('fly');
    await this.goto(ex.to, ex.entry);
    return true;
  },
};
