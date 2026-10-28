import { CREATURE_MAP, STARTERS } from '../config/creatures.js';
import { MOVES } from '../config/moves.js';
import { ITEMS } from '../config/items.js';
import { STAT_LABELS, STATS } from '../config/natures.js';
import { movesAtLevel, LEARNSETS } from '../config/learnsets.js';
import { rivalStarterFor, thirdStarterFor } from './Teams.js';
import { CHART, TYPE_LIST, TYPES } from '../config/types.js';

/**
 * SCRIPTS DE L'HISTOIRE ET DES PNJ
 * Chaque script : async (g, ctx) où g est le jeu (API de mise en scène) et ctx = { npc, def, trainer, map }.
 */
const N = Math.PI, S = 0, E = Math.PI / 2, O = -Math.PI / 2;
const NAEL = { gender: 'm', skin: '#f1c9a5', hair: '#2a1a4a', hairStyle: 'spiky', top: '#3a7bd5', bottom: '#2a2a3a', scarf: '#ffd23f', backpack: true, packColor: '#3a7bd5' };
const rivalDef = (stage, extra = {}) => ({ id: `rival${stage}`, cls: 'rival', name: 'Naël', team: 'rival', rivalStage: stage, look: NAEL, ...extra });

async function rivalEncounter(g, stage, lines) {
  const p = g.player.position;
  const from = { x: p.x + Math.sin(g.player.rotY) * 9, z: p.z + Math.cos(g.player.rotY) * 9 };
  const nael = g.spawnNpc({ id: `nael${stage}`, name: 'Naël', look: NAEL, x: from.x, z: from.z, rot: 0 });
  g.music('rival');
  await g.exclaim(nael);
  await g.walk(nael, p.x + Math.sin(g.player.rotY) * 1.6, p.z + Math.cos(g.player.rotY) * 1.6);
  g.face(nael, 'player');
  await g.say(nael, lines.intro);
  const res = await g.battle(rivalDef(stage, { defeat: lines.defeat, canLose: stage === 1 }));
  if (res === 'lose' && stage !== 1) return res;
  await g.say(nael, res === 'win' ? lines.after : lines.afterLose || lines.after);
  if (lines.heal) { await g.heal(); }
  await g.walk(nael, from.x, from.z);
  g.despawn(nael);
  g.setFlag(`rival${stage}`);
  g.music();
  return res;
}

export const SCRIPTS = {
  // ── CLAIRVENT ────────────────────────────────────────────────────────
  async maman(g, { npc }) {
    if (!g.flag('starter')) {
      await g.say(npc, ['Bonjour mon grand ! Bien dormi ?', 'Le Professeur Aubin t\'attend à son laboratoire, de l\'autre côté de la place.', 'Il paraît qu\'il a une surprise pour toi… Allez, file !']);
      return;
    }
    if (!g.flag('maman_cadeau')) {
      g.setFlag('maman_cadeau');
      await g.say(npc, ['Ton tout premier Lumin ! Je suis si fière de toi.', 'Tiens, prends ça pour la route. Et n\'oublie pas : tu peux toujours rentrer te reposer ici.']);
      await g.give('potion', 3);
      await g.give('repousse', 2);
    } else {
      const b = g.badgeCount;
      await g.say(npc, b === 0 ? ['Ilda, la Championne de Sylvebourg, t\'attend au bout de la Route 1.'] : b < 8 ? [`Déjà ${b} badge${b > 1 ? 's' : ''} ! Ton père aurait été si fier.`] : ['Mon petit Champion… Tu as tant grandi.']);
    }
    await g.say(npc, ['Tu as l\'air fatigué. Repose-toi un peu.']);
    await g.heal();
    await g.say(npc, ['Voilà ! Tes Lumins sont en pleine forme.']);
  },

  async no_starter(g) {
    const coline = g.npc('clv_coline');
    await g.say(coline || 'Coline', ['Attends ! Ne t\'aventure pas dans les hautes herbes sans Lumin !', 'Le Professeur Aubin t\'attend à son laboratoire, à l\'est de la place.']);
    await g.stepBack(3);
  },

  async lila(g, { npc }) {
    if (!g.flag('starter')) { await g.say(npc, ['Mon frère Naël est parti en courant au labo ce matin…', 'Il veut absolument devenir Champion. Toi aussi, non ?']); return; }
    if (!g.flag('lila_cadeau')) {
      g.setFlag('lila_cadeau');
      await g.say(npc, ['Alors tu as eu ton Lumin ! Naël va être jaloux, hihi.', 'Prends ces Prismes. Affaiblis un Lumin sauvage, puis lance-en un pour le capturer !']);
      await g.give('prisme', 5);
      return;
    }
    await g.say(npc, ['Plus un Lumin sauvage est affaibli, plus il est facile à capturer.', 'Le sommeil et le gel aident beaucoup aussi !']);
  },

  async mamie_rose(g, { npc }) {
    if (!g.flag('rose_cadeau') && g.flag('starter')) {
      g.setFlag('rose_cadeau');
      await g.say(npc, ['Oh, un jeune dresseur ! Ça me rappelle ma jeunesse.', 'Tiens, ces baies m\'ont toujours porté chance.']);
      await g.give('baie_oran', 3);
      return;
    }
    await g.say(npc, [g.timeOfDay() === 'night' ? 'La nuit, d\'autres Lumins sortent : des Crolombre, des Noctiowl…' : 'Certains Lumins ne sortent que la nuit, tu sais. Le monde change quand le soleil se couche.']);
  },

  async aubin(g, { npc }) {
    if (!g.flag('starter')) {
      await g.say(npc, ['Ah, {player} ! Te voilà enfin !', 'Bienvenue dans le monde des Lumins. Ces créatures vivent partout à Lumeria : dans les herbes, les grottes, les mers…', 'Aujourd\'hui, tu vas recevoir ton tout premier partenaire.', 'Ces trois Lumins sont nés ici. Choisis bien : il t\'accompagnera dans toute ton aventure !']);
      const sp = await g.chooseStarter();
      g.setFlag(`took:${sp}`);
      g.data.starter = sp;
      g.refresh();
      await g.giveMon(sp, 5, { friendship: 120, noNick: false });
      g.setFlag('starter');
      const rs = rivalStarterFor(sp);
      g.data.rivalStarter = rs;
      const nael = g.spawnNpc({ id: 'nael1', name: 'Naël', look: NAEL, x: 0, z: 4.6, rot: N });
      g.music('rival');
      await g.walk(nael, 0.2, 0.4);
      await g.say(nael, ['Grand-père ! J\'ai couru tout le chemin depuis la maison !', 'Hein ?! {player} a déjà choisi ?! Pas grave. Je prends celui-là, il est bien plus fort !']);
      const ped = { leafnix: -1.4, pyralis: 0, aquoret: 1.4 }[rs] ?? 0;
      await g.walk(nael, ped, -0.4);
      g.setFlag(`took:${rs}`);
      g.refresh();
      g.sfx('catch');
      await g.say(nael, [`Naël reçoit ${CREATURE_MAP[rs].name} !`]);
      g.face(nael, 'player');
      await g.say(nael, ['Hé {player} ! Un dresseur doit toujours accepter un défi. Combat !']);
      const res = await g.battle(rivalDef(1, { defeat: ['Quoi ?! J\'ai perdu… ? Je te battrai la prochaine fois !'], canLose: true, noBlackout: true }));
      await g.say(nael, res === 'win' ? ['Pff… J\'ai juste choisi le mauvais moment.', 'Je vais m\'entraîner et je serai le meilleur dresseur de Lumeria !'] : ['Ha ! Tu vois ? Je suis déjà le meilleur !', 'Bon, je vais m\'entraîner encore plus. À plus !']);
      g.setFlag('rival1');
      await g.heal(true);
      await g.say(npc, ['Quel combat ! Vos Lumins se sont donnés à fond.', 'Je les ai soignés. Tenez, voici un Lumidex chacun : il enregistre les Lumins que vous rencontrez et capturez.']);
      await g.give('lumidex', 1);
      await g.say(npc, ['Mon rêve est de compléter le Lumidex. Mais je suis trop vieux pour voyager…', 'Et puis… il se passe des choses étranges. Les Éclats de l\'Aube, ces fragments d\'étoile qui protègent notre ciel, perdent leur éclat.', 'Va défier les Champions d\'Arène, {player}. Ouvre l\'œil en chemin !']);
      await g.walk(nael, 0, 4.8);
      g.despawn(nael);
      g.music();
      return;
    }
    const seen = Object.keys(g.data.dex.seen).length, caught = Object.keys(g.data.dex.caught).length;
    if (g.flag('champion') && !g.flag('aubin_oeufs')) {
      g.setFlag('aubin_oeufs');
      await g.say(npc, ['Champion de la Ligue ! Je n\'en reviens pas.', 'Tiens. Les deux derniers Lumins du laboratoire ont pondu des Œufs. Ils te reviennent.']);
      for (const s of STARTERS.filter((x) => x !== g.data.starter)) await g.giveEgg(s);
      return;
    }
    await g.say(npc, [`Voyons ton Lumidex… ${seen} espèces vues, ${caught} capturées.`, caught < 15 ? 'C\'est un bon début ! Continue d\'explorer les hautes herbes.' : caught < 50 ? 'Remarquable ! Pense aussi à pêcher et à surfer : certains Lumins ne vivent que dans l\'eau.' : caught < 120 ? 'Extraordinaire ! Certains Lumins n\'évoluent qu\'avec une pierre, d\'autres grâce à l\'amitié.' : 'Incroyable… Tu as presque tout trouvé !']);
  },

  // ── ROUTE 2 / PORT-AZUR ──────────────────────────────────────────────
  async rival2(g) {
    await rivalEncounter(g, 2, {
      intro: ['{player} ! Te voilà enfin !', 'J\'ai vu des types louches de l\'Ordre du Crépuscule filer vers Port-Azur.', 'Mais d\'abord : montre-moi si tu as progressé !'],
      defeat: ['Grr ! Encore toi !'],
      after: ['Bon, d\'accord, tu es fort. Pour l\'instant !', 'Port-Azur est juste là. Méfie-toi de l\'Ordre !'],
      afterLose: ['Je savais que j\'étais le meilleur !', 'Va soigner tes Lumins à Port-Azur.'],
    });
  },

  async alarme_musee(g) {
    g.setFlag('museum_alarm');
    g.sfx('alarm');
    g.shake(0.15);
    await g.say('???', ['DRIIIIIING ! Au voleur ! Au voleur !']);
    const sb = g.spawnNpc({ id: 'paz_voleur', name: 'Sbire', cls: 'sbire', x: -6, z: 30, rot: N });
    g.cameraFocus(-6, 22);
    await g.walk(sb, 4, 22);
    await g.walk(sb, 18, 30);
    g.despawn(sb);
    g.cameraRelease();
    const marin = g.npc('paz_marin');
    g.refresh();
    await g.say('Marin', ['Toi, là ! Tu as vu ce type ? Il vient de voler l\'Éclat de l\'Aube du musée !', 'Je suis Marin, le Champion de cette ville. L\'Ordre du Crépuscule s\'est barricadé dans l\'entrepôt, sur les quais.', 'Je surveille la ville. Si tu veux m\'aider, va jeter un œil à l\'entrepôt !']);
    if (marin) g.face(marin, 'player');
  },

  async kessel1(g) {
    await g.say('Kessel', ['Tch… Garde ton caillou, gamin.', 'L\'Ordre possède déjà d\'autres Éclats. Le jour de l\'éveil approche !']);
    const k = g.npc('ent_kessel');
    if (k) { await g.fade(1, 0.3); g.hideNpc(k); await g.fade(0, 0.3); }
    g.setFlag('entrepot_done');
    await g.say(null, ['Vous récupérez l\'Éclat de l\'Aube !', 'Il faut le rapporter au musée de Port-Azur.']);
    g.refresh();
  },

  async conservateur(g, { npc }) {
    if (!g.flag('entrepot_done')) { await g.say(npc, ['L\'Éclat de l\'Aube… volé sous mes yeux !', 'Il était exposé ici depuis cent ans. Qui pourrait vouloir s\'en servir ?']); return; }
    if (!g.flag('musee_reward')) {
      g.setFlag('musee_reward');
      await g.say(npc, ['Tu l\'as retrouvé ! L\'Éclat de l\'Aube ! Merci, merci mille fois !', 'Regarde comme il brille faiblement… Comme s\'il avait perdu une partie de sa lumière.', 'Accepte ce cadeau. Le Multi Exp permet à toute ton équipe de profiter de l\'expérience des combats.']);
      await g.give('multi_exp', 1);
      g.data.expShare = true;
      await g.say(null, ['Le Multi Exp est activé. Vous pouvez le désactiver depuis le Sac.']);
      await g.give('super_prisme', 3);
      return;
    }
    await g.say(npc, ['Les Éclats seraient des fragments d\'une étoile tombée il y a mille ans.', 'Une légende parle d\'une créature, Nyctaris, qui dévorerait leur lumière pour plonger le monde dans la nuit.']);
  },

  async canne(g, { npc }) {
    if (!g.has('canne')) {
      await g.say(npc, ['Ohé, moussaillon ! Tu sais pêcher ?', 'Tiens, prends ma vieille canne. Utilise-la face à l\'eau (touche F ou depuis le Sac) !']);
      await g.give('canne', 1);
      return;
    }
    if (!g.has('super_canne') && g.hasBadge('brume')) {
      await g.say(npc, ['Tu as bien pêché, on dirait ! Tu mérites mieux que ma vieille canne.']);
      await g.give('super_canne', 1);
      return;
    }
    await g.say(npc, ['Plus ta canne est bonne, plus les Lumins qui mordent sont rares et costauds.', 'Le soir, les Carpéclat remontent à la surface…']);
  },

  async velo(g, { npc }) {
    if (!g.flag('entrepot_done')) { await g.say(npc, ['Ces brutes de l\'Ordre bloquent les quais : plus aucune livraison !', 'Si quelqu\'un pouvait les chasser…']); return; }
    if (!g.has('velo')) {
      await g.say(npc, ['C\'est toi qui as chassé l\'Ordre de l\'entrepôt ? Mes pièces détachées sont enfin arrivées !', 'Pour te remercier, je t\'offre mon plus beau vélo pliable !']);
      await g.give('velo', 1);
      await g.say(null, ['Appuyez sur B (ou le bouton Vélo) pour monter et descendre du vélo.']);
      return;
    }
    await g.say(npc, ['Alors, il roule bien ? On ne peut pas l\'utiliser à l\'intérieur, attention.']);
  },

  async ferry(g, { npc }) {
    const here = g.map.id;
    if (here === 'ile') {
      const c = await g.ask(npc, 'On rentre à Port-Azur ?');
      if (c === 0) await g.warp('portazur', 'dock');
      return;
    }
    if (!g.has('ticket_ferry')) { await g.say(npc, ['Le ferry pour l\'Île Lointaine ne prend que les détenteurs d\'un Ticket de Ferry.', 'Seuls les Champions de la Ligue en reçoivent un.']); return; }
    const c = await g.ask(npc, 'Embarquer pour l\'Île Lointaine ?');
    if (c === 0) { g.sfx('horn'); await g.warp('ile', 'dock'); }
  },

  // ── ARÈNES (guides) ─────────────────────────────────────────────────
  async gym_guide(g, { npc, def }) {
    const [type] = def.guide || ['normal'];
    const weak = TYPE_LIST.filter((a) => CHART[a]?.[type] === 2).map((a) => TYPES[a].name).join(', ') || 'variées';
    const key = `guide:${g.map.id}`;
    await g.say(npc, [`Hé, futur Champion ! Cette arène est spécialisée dans le type ${g.typeName(type)}.`, `Utilise des attaques ${weak} pour prendre l'avantage !`]);
    if (!g.flag(key)) { g.setFlag(key); await g.say(npc, ['Tiens, un petit remontant.']); await g.give('eau_fraiche', 2); }
  },

  // ── PNJ UTILITAIRES ─────────────────────────────────────────────────
  async relearn(g, { npc }) {
    await g.say(npc, ['Je suis le Maître des Capacités. Je peux faire se souvenir à un Lumin d\'une attaque oubliée.', 'Mon tarif : 1 000 ◆ par attaque.']);
    if (g.data.money < 1000) { await g.say(npc, ['Reviens quand tu auras de quoi payer.']); return; }
    const mon = await g.choosePartyMon('Quel Lumin ?', (c) => (c.egg ? 'Œuf' : null));
    if (!mon) return;
    const list = (LEARNSETS[mon.species] || []).filter(([lv, id]) => lv <= mon.level && !mon.knows(id)).map(([, id]) => id);
    const uniq = [...new Set(list)];
    if (!uniq.length) { await g.say(npc, [`${mon.name} ne peut se souvenir d'aucune attaque.`]); return; }
    const mv = await g.chooseMove(uniq, `${mon.name} — attaque à retrouver`);
    if (!mv) return;
    const ok = await g.teachMove(mon, mv);
    if (ok) { g.addMoney(-1000); await g.say(npc, ['Et voilà ! Merci de ta visite.']); }
  },

  async tutor(g, { npc }) {
    const pool = g.map.id.startsWith('astralis') ? ['onde_psychique', 'canon_chrome', 'pulsar', 'eclat_prisme', 'sphere_ombre', 'blizzard', 'fulgurance', 'maelstrom', 'brasier_solaire', 'colere_titan']
      : ['poing_volcan', 'poing_orage', 'poing_givre', 'coup_eboulis', 'balayette', 'lame_air', 'jet_ondulant', 'seve'];
    const price = g.map.id.startsWith('astralis') ? 8000 : 3000;
    await g.say(npc, [`J'enseigne des attaques rares, pour ${price.toLocaleString('fr-FR')} ◆ chacune.`]);
    if (g.data.money < price) { await g.say(npc, ['Il te faut plus d\'argent.']); return; }
    const mon = await g.choosePartyMon('Quel Lumin ?', (c) => (c.egg ? 'Œuf' : null));
    if (!mon) return;
    const ok = pool.filter((id) => MOVES[id] && !mon.knows(id) && (mon.types.includes(MOVES[id].type) || MOVES[id].type === 'normal' || MOVES[id].univ || ['sol', 'roche', 'normal'].includes(MOVES[id].type) && mon.def.base.atk >= 70));
    if (!ok.length) { await g.say(npc, [`Je n'ai rien à enseigner à ${mon.name}.`]); return; }
    const mv = await g.chooseMove(ok, `Enseigner à ${mon.name}`);
    if (!mv) return;
    if (await g.teachMove(mon, mv)) { g.addMoney(-price); await g.say(npc, ['Excellent choix.']); }
  },

  async juge(g, { npc }) {
    await g.say(npc, ['Je juge le potentiel caché des Lumins. Montre-m\'en un.']);
    const mon = await g.choosePartyMon('Quel Lumin juger ?', (c) => (c.egg ? 'Œuf' : null));
    if (!mon) return;
    const tot = STATS.reduce((a, s) => a + mon.iv[s], 0);
    const best = STATS.reduce((a, s) => (mon.iv[s] > mon.iv[a] ? s : a), 'hp');
    const verdict = tot >= 151 ? 'un potentiel prodigieux' : tot >= 121 ? 'un potentiel remarquable' : tot >= 91 ? 'un potentiel supérieur à la moyenne' : 'un potentiel modeste';
    const perfect = STATS.filter((s) => mon.iv[s] === 31).map((s) => STAT_LABELS[s]);
    await g.say(npc, [`Ce ${mon.def.name} a ${verdict}.`, `Son point fort : ${STAT_LABELS[best]}.${mon.iv[best] === 31 ? ' C\'est parfait, on ne peut pas faire mieux !' : ''}`, perfect.length ? `Potentiel parfait en : ${perfect.join(', ')}.` : 'Aucune statistique n\'est parfaite.']);
  },

  async nommeur(g, { npc }) {
    await g.say(npc, ['Je donne des surnoms qui rendent les Lumins encore plus beaux !']);
    const mon = await g.choosePartyMon('Quel Lumin renommer ?', (c) => (c.egg ? 'Œuf' : c.ot && c.ot !== g.data.name ? 'Pas votre Lumin' : null));
    if (!mon) return;
    const name = await g.ui.screens.nameEntry(`Nouveau nom pour ${mon.name}`, mon.nickname || mon.def.name, 12);
    if (name) { mon.nickname = name === mon.def.name ? null : name; await g.say(npc, [`${mon.def.name} s'appelle désormais ${mon.name} !`]); }
  },

  async trade_syl(g, { npc }) {
    if (g.flag('trade_syl')) { await g.say(npc, ['Prends bien soin de Fémirée !']); return; }
    await g.say(npc, ['Je collectionne les Lumins Insecte. Tu aurais un Scarabose ?', 'En échange, je te donne ma Fémirée. Elle est adorable, mais elle déteste les insectes…']);
    const mon = g.party.find((c) => c.species === 'scarabose' && !c.egg);
    if (!mon) { await g.say(npc, ['Reviens si tu en attrapes un ! On en trouve sur la Route 2, dans les sous-bois.']); return; }
    const c = await g.ask(npc, `Échanger ${mon.name} contre Fémirée ?`);
    if (c !== 0) return;
    g.removeFromParty(mon);
    g.setFlag('trade_syl');
    await g.giveMon('femiree', Math.max(8, mon.level), { ot: 'Collectionneuse', nickname: 'Fifi', friendship: 160, traded: true });
    await g.say(npc, ['Merci ! Fifi va adorer voyager avec toi.']);
  },

  async oeuf_cadeau(g, { npc }) {
    if (g.flag('oeuf_drakonet')) { await g.say(npc, ['Les Œufs éclosent plus vite si un Lumin au talent Corps Ardent voyage avec toi.']); return; }
    await g.say(npc, ['Un Œuf m\'a été confié par un dresseur de passage… mais je suis trop vieux pour m\'en occuper.', 'Promets-moi d\'en prendre soin : marche beaucoup, il éclora !']);
    if (await g.giveEgg('drakonet')) g.setFlag('oeuf_drakonet');
  },

  async forgeron(g, { npc }) {
    await g.say(npc, ['Je forge des pierres d\'évolution à partir d\'Éclats d\'Étoile.', 'Un Éclat d\'Étoile = une pierre au choix.']);
    if (!g.has('eclat_etoile')) { await g.say(npc, ['Tu n\'as pas d\'Éclat d\'Étoile. On en trouve cachés un peu partout.']); return; }
    const stones = ['pierre_feu', 'pierre_eau', 'pierre_plante', 'pierre_foudre', 'pierre_glace', 'pierre_lune', 'pierre_soleil', 'cable_lien'];
    const i = await g.chooseList('Quelle pierre forger ?', stones.map((s) => ({ label: ITEMS[s].name, color: ITEMS[s].color })));
    if (i === null || i === undefined) return;
    g.take('eclat_etoile', 1);
    g.sfx('smash');
    await g.give(stones[i], 1);
  },

  // ── SABLONS / CENTRALE ──────────────────────────────────────────────
  async blackout(g) {
    g.setFlag('blackout');
    g.sfx('powerdown');
    await g.fade(0.85, 0.4);
    await g.wait(0.6);
    await g.fade(0, 0.4);
    g.refresh();
    await g.say('Volta', ['Hé, toi ! Tu tombes à pic.', 'L\'Ordre du Crépuscule a pris le contrôle de la centrale, au nord-est de la ville. Plus une goutte d\'électricité !', 'Mon arène est fermée tant que le courant n\'est pas revenu. Je t\'en prie, chasse-les !']);
  },

  async morvane1(g) {
    const m = g.npc('cen_morvane');
    if (m) { await g.fade(1, 0.3); g.hideNpc(m); await g.fade(0, 0.3); }
    g.setFlag('centrale_done');
    g.sfx('powerup');
    await g.say(null, ['Le générateur se remet à vrombir… Le courant est rétabli !']);
    await g.give('carte_acces', 1, { silent: true });
    g.refresh();
  },

  // ── BRUMEVASE / REPAIRE ─────────────────────────────────────────────
  async vesper1(g) {
    const v = g.npc('rep_vesper');
    await g.say('Vesper', ['Tu es plus coriace que je ne le pensais.', 'Mais l\'Extracteur a déjà aspiré la lumière des quatre Éclats. Il ne manque plus que le cratère de Cendrelave…', 'Adieu, enfant de l\'aube.']);
    if (v) { await g.fade(1, 0.4); g.hideNpc(v); await g.fade(0, 0.4); }
    g.setFlag('repaire_done');
    await g.say(null, ['La brume qui bloquait la route du nord commence à se dissiper…']);
    g.refresh();
  },

  // ── ROUTE 7 / SOMMET ─────────────────────────────────────────────────
  async rival3(g) {
    await rivalEncounter(g, 3, {
      intro: ['{player} ! Je t\'attendais à la sortie de la mine.', 'J\'ai battu Brann du premier coup. Et toi ? Prouve-le !'],
      defeat: ['Non ! Comment tu fais ?!'],
      after: ['Tu progresses vite… Trop vite.', 'On se reverra. Et cette fois, je gagnerai !'],
      afterLose: ['Ha ! Je suis toujours devant toi !'],
    });
  },

  async rival4(g) {
    await rivalEncounter(g, 4, {
      intro: ['{player}… Tu as entendu ? L\'Ordre est monté au sommet du volcan.', 'Grand-père dit que si Nyctaris s\'éveille, le soleil ne se lèvera plus.', 'Je veux être sûr que tu es assez fort pour les arrêter. Combat !'],
      defeat: ['… Tu es devenu vraiment fort.'],
      after: ['Va. Je retiens les sbires en bas du volcan. Toi, fonce au sommet après l\'arène de Cendrelave !'],
      afterLose: ['Tu dois devenir plus fort, {player}. Pour nous tous.'],
      heal: true,
    });
  },

  async sommet_vesper(g) {
    if (g.flag('sommet_done')) return;
    const vesper = g.npc('som_vesper'), kessel = g.npc('som_kessel'), morvane = g.npc('som_morvane');
    g.cameraFocus(0, -40);
    g.music('ordre');
    await g.say(vesper, ['Te voilà donc, {player}. Juste à temps pour le lever de la nuit éternelle.', 'Regarde. Les quatre Éclats, vidés de leur lumière, ouvrent la porte du sommeil de Nyctaris.', 'Kessel. Morvane. Occupez-vous de notre invité.']);
    g.cameraRelease();
    await g.walk(morvane, g.player.position.x + 1.6, g.player.position.z - 1.6);
    const r1 = await g.battle({ id: 'som_morvane_b', cls: 'admin_f', name: 'Admin Morvane', look: morvane?.def.look, team: [['chauvampire', 43], ['volriquor', 43], ['viiraulis', 44], ['venicobrax', 45]], intro: ['Cette fois, pas de quartier.'], defeat: ['Non… pas maintenant !'] });
    if (r1 === 'lose') return;
    g.hideNpc(morvane);
    await g.walk(kessel, g.player.position.x - 1.6, g.player.position.z - 1.6);
    const r2 = await g.battle({ id: 'som_kessel_b', cls: 'admin', name: 'Admin Kessel', look: kessel?.def.look, team: [['pipereux', 43], ['carpeclat', 44], ['chauvampire', 44], ['venicobrax', 45]], intro: ['Tu ne gâcheras pas ce moment !'], defeat: ['Le Chef… va devoir s\'en charger.'] });
    if (r2 === 'lose') return;
    g.hideNpc(kessel);
    await g.walk(vesper, g.player.position.x, g.player.position.z - 2.2);
    g.face(vesper, 'player');
    const r3 = await g.battle({ id: 'som_vesper_b', cls: 'chef', name: 'Vesper', look: vesper?.def.look, team: [['venicobrax', 46], ['carpeclat', 47], ['piperax', 47], ['grivelion', 47], ['viiraulis', 48]], intro: ['La lumière n\'apporte que des illusions. Laisse-moi te montrer la vérité du néant !'], defeat: ['Impossible…'] });
    if (r3 === 'lose') return;
    await g.say(vesper, ['C\'est… trop tard. Écoute.']);
    g.shake(0.4);
    g.sfx('quake');
    await g.fade(0.8, 0.6);
    await g.say(null, ['Le cratère se met à gronder. Une ombre immense s\'élève de la lave…']);
    g.setFlag('sommet_done');
    g.refresh();
    await g.fade(0, 0.6);
    const ny = g.npc('som_nyctaris');
    g.cameraFocus(0, -48);
    g.sfx('roar');
    await g.say('Nyctaris', ['NNNYYYAAAAAAH !']);
    await g.say(vesper, ['Nyctaris… Obéis-moi ! Je t\'ai éveillé !', '… Il ne m\'écoute pas. Il dévore la lumière… même la mienne.', '{player} ! Arrête-le. Je t\'en supplie !']);
    g.cameraRelease();
    g.hideNpc(vesper);
    await SCRIPTS.legend(g, { npc: ny, def: { legend: { species: 'nyctaris', level: 50, flag: 'nyctaris' } } });
    await g.say('Pr. Aubin', ['{player} ! Tu vas bien ? Regarde le ciel… Les étoiles brillent de nouveau !', 'L\'Ordre du Crépuscule s\'est dispersé. Vesper s\'est rendu à la police de Cendrelave.', 'Tu as sauvé Lumeria. Il ne te reste plus qu\'une arène : celle d\'Astralis, au nord.']);
    g.music();
  },

  async nyctaris_retry(g, { npc }) {
    await SCRIPTS.legend(g, { npc, def: { legend: { species: 'nyctaris', level: 50, flag: 'nyctaris' } } });
  },

  /** Lumin légendaire : combat sauvage, capture possible ; s'il est vaincu, il revient plus tard. */
  async legend(g, { npc, def }) {
    const L = def.legend || npc?.def.legend;
    if (!L || g.flag(L.flag)) return;
    const sp = CREATURE_MAP[L.species];
    g.sfx('roar');
    g.shake(0.25);
    await g.say(null, [`${sp.name} vous fixe intensément…`]);
    const res = await g.wildBattle(L.species, L.level, { legend: true, music: 'legend', perfectIvs: 20, noRun: false });
    if (res === 'caught') { g.setFlag(L.flag); if (npc) g.hideNpc(npc); g.refresh(); return; }
    if (res === 'lose') return;
    if (npc) g.hideNpc(npc);
    await g.say(null, [`${sp.name} s'est envolé… Il reviendra sans doute en ces lieux.`]);
  },

  // ── LIGUE ───────────────────────────────────────────────────────────
  async rival5(g) {
    await rivalEncounter(g, 5, {
      intro: ['{player}. Je savais que tu viendrais.', 'Huit badges chacun. La Ligue derrière cette porte… Mais avant, il reste une chose à régler entre nous.', 'Ce combat, c\'est pour tout ce qu\'on a vécu depuis Clairvent. Donne tout !'],
      defeat: ['… C\'est toi le plus fort. Je l\'admets.'],
      after: ['Va, et deviens Champion. Pour nous deux.', 'Tiens, je soigne tes Lumins. Ne perds pas, d\'accord ?'],
      afterLose: ['Tu dois être plus fort que ça pour affronter la Ligue…'],
      heal: true,
    });
  },

  async champion_win(g) {
    g.music('fanfare');
    await g.say('Orsane', ['Félicitations, {player}. Tu es le nouveau Champion de la Ligue du Zénith !', 'Viens, entrons ensemble dans le Panthéon.']);
    await g.hallOfFame();
    g.setFlag('champion');
    g.data.stats.champion = true;
    await g.say('Orsane', ['Une dernière chose : prends ce Ticket de Ferry.', 'Au large de Port-Azur, l\'Île Lointaine n\'attend que les Champions… On dit qu\'un Lumin de lumière y sommeille.']);
    await g.give('ticket_ferry', 1);
    await g.say(null, ['De nouvelles zones se sont ouvertes : le Pic Millénaire (Route 4), le Temple du Vent (Route 8) et la Grotte Glacée (Col Givré).', 'Les membres du Conseil des 4 ont aussi renforcé leurs équipes pour vos revanches.']);
    await g.warp('clairvent:maison', 'door');
  },
};
