import { GAME, DIFFICULTY, CHALLENGE_RULES, LEVEL_CAPS } from '../config/game.js';
import { TYPES } from '../config/types.js';
import { MOVES, describeMove, categoryLabel } from '../config/moves.js';
import { ITEMS, sellPrice } from '../config/items.js';
import { CREATURE_MAP } from '../config/creatures.js';
import { NATURES, STAT_LABELS, STAT_SHORT, STATS } from '../config/natures.js';
import { ABILITIES } from '../config/abilities.js';
import { BADGES } from '../config/badges.js';
import { shopList, BP_SHOP } from '../config/shops.js';
import { REGION, MAPS } from '../maps/index.js';
import { Creature } from '../battle/Creature.js';
import { typeChip, statusChip, genderMark } from './BattleUI.js';
import { $, h, escapeHtml, sleep, formatTime } from '../core/utils.js';

const hpClass = (r) => (r <= 0.2 ? 'low' : r <= 0.5 ? 'mid' : '');
export const money = (n) => `${GAME.currencySymbol} ${Number(n).toLocaleString('fr-FR')}`;

/**
 * ÉCRANS DE L'INTERFACE : titre, nouvelle partie, choix du starter, surnom, listes, résumé d'un Lumin,
 * boutique, PC, pension, carte de la région, badge, éclosion, Panthéon…
 * Chaque écran est une couche (overlay) avec sa propre navigation clavier / manette / souris / tactile.
 */
/** L'application peut-elle être installée (pas déjà lancée depuis l'écran d'accueil, page servie en http(s)) ? */
function canInstall() {
  try {
    const standalone = window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone || !/^https?:$/.test(location.protocol) || window.self !== window.top) return false;
    const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
    return !!window.__lumeriaInstall || mobile;
  } catch { return false; }
}

export class Screens {
  constructor(ui) {
    this.ui = ui;
    this.nav = ui.nav;
    this.root = $('#ui');
    this.z = 40;
  }

  get game() { return this.ui.game; }
  get audio() { return this.ui.audio; }
  portrait(id, shiny, cls) { return this.ui.portraitHtml(id, shiny, cls); }

  overlay(cls = '', { clear = false } = {}) {
    const el = h('div', { class: `overlay ${cls}${clear ? ' clear' : ''}`, style: `z-index:${++this.z}` });
    this.root.append(el);
    return { el, close: () => { el.remove(); this.z--; } };
  }

  /** Liste simple (titre + éléments) → index ou null. items: {label, sub, right, color, type, disabled} */
  chooseList(title, items, { cancel = true, cls = '' } = {}) {
    return new Promise((resolve) => {
      const o = this.overlay('sheet');
      const list = h('div', { class: 'sheet-list' });
      const panel = h('div', { class: `sheet-panel shard ${cls}` }, h('div', { class: 'sheet-title' }, title), list);
      o.el.append(panel);
      const btns = items.map((d) => h('button', { class: `btn${d.disabled ? ' is-disabled' : ''}`, type: 'button', style: d.type ? `--tc:${TYPES[d.type]?.color}` : null },
        h('span', { class: 'lbl' }, d.color ? h('i', { class: 'item-dot', style: `background:${d.color}` }) : null, d.type ? h('span', { class: 'type-chip', style: `background:${TYPES[d.type].color}` }, TYPES[d.type].name) : null, h('span', {}, d.label, d.sub ? h('span', { class: 'btn-sub' }, d.sub) : null)),
        d.right ? h('span', { class: 'btn-right' }, d.right) : null));
      list.append(...btns);
      let back = null;
      if (cancel) { back = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Retour'); panel.append(back); }
      const all = back ? [...btns, back] : btns;
      const close = (v) => { this.nav.remove(menu); o.close(); resolve(v); };
      const menu = this.nav.push({ items: all, onSelect: (i) => close(i >= btns.length ? null : i), onCancel: cancel ? () => close(null) : null });
    });
  }

  monRow(c, why = '') {
    const r = c.maxHp ? c.hp / c.maxHp : 0;
    return `${c.egg ? '<span class="egg-ico big"></span>' : this.portrait(c.species, c.shiny)}
      <span class="mon-mid">
        <span class="mon-top"><span>${escapeHtml(c.name)}${c.egg ? '' : genderMark(c.gender)}</span>${c.egg ? '' : `<span class="lvl">N.${c.level}</span>`}${statusChip(c.status)}${c.item ? `<i class="item-dot" title="${escapeHtml(ITEMS[c.item]?.name || '')}" style="background:${ITEMS[c.item]?.color || '#fff'}"></i>` : ''}</span>
        ${c.egg ? `<span class="btn-sub">${c.eggCycles > 10 ? 'Il va falloir attendre longtemps.' : c.eggCycles > 4 ? 'Il bouge de temps en temps.' : 'Il va bientôt éclore !'}</span>` : `<span class="mon-hp"><span class="hpbar"><i class="${hpClass(r)}" style="width:${r * 100}%"></i></span><span>${c.hp}/${c.maxHp}</span></span>`}
      </span>
      <span class="why">${why || ''}</span>`;
  }

  /** Choix d'un Lumin dans une liste → index ou null. */
  chooseMon(team, { title = 'Choisir un Lumin', check = () => null, cancel = true } = {}) {
    return new Promise((resolve) => {
      const o = this.overlay('sheet');
      const list = h('div', { class: 'sheet-list' });
      const panel = h('div', { class: 'sheet-panel shard' }, h('div', { class: 'sheet-title' }, title), list);
      o.el.append(panel);
      const btns = team.map((c, i) => { const why = check(c, i); return h('button', { class: `btn mon-btn${why ? ' is-disabled' : ''}${c.hp <= 0 && !c.egg ? ' ko' : ''}`, type: 'button', html: this.monRow(c, why) }); });
      list.append(...btns);
      let back = null;
      if (cancel) { back = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Retour'); panel.append(back); }
      const all = back ? [...btns, back] : btns;
      const close = (v) => { this.nav.remove(menu); o.close(); resolve(v); };
      const menu = this.nav.push({ items: all, onSelect: (i) => close(i >= btns.length ? null : i), onCancel: cancel ? () => close(null) : null });
    });
  }

  /** Oubli d'une attaque pour en apprendre une nouvelle → index (0-3) ou -1. */
  forgetMove(mon, newMove) {
    const nm = MOVES[newMove];
    const items = [...mon.moves.map((m) => { const mv = MOVES[m.id]; return { label: mv.name, type: mv.type, sub: `${categoryLabel(mv.cat)} · Puiss. ${mv.power || '—'} · Préc. ${mv.acc || '—'} · PP ${m.ppMax}`, right: '' }; }),
      { label: `Ne pas apprendre ${nm.name}`, sub: `${TYPES[nm.type].name} · ${categoryLabel(nm.cat)} · Puiss. ${nm.power || '—'} — ${describeMove(nm)}` }];
    return this.chooseList(`${mon.name} : oublier quelle attaque pour ${nm.name} ?`, items, { cancel: false }).then((i) => (i === null || i >= 4 ? -1 : i));
  }

  /** Saisie d'un nom. */
  nameEntry(title, def = '', max = 12) {
    return new Promise((resolve) => {
      const o = this.overlay('center');
      const input = h('input', { type: 'text', maxlength: String(max), value: def, autocomplete: 'off', spellcheck: 'false' });
      const ok = h('button', { class: 'btn', type: 'button' }, 'Valider');
      const panel = h('div', { class: 'name-panel' }, h('h2', {}, title), input, ok);
      o.el.append(panel);
      const done = () => { const v = input.value.trim().slice(0, max); this.nav.remove(menu); o.close(); resolve(v || def); };
      const menu = this.nav.push({ items: [ok], onSelect: done, onCancel: () => { this.nav.remove(menu); o.close(); resolve(def); }, handle: (a) => { if (document.activeElement === input && a !== 'confirm' && a !== 'cancel') return true; return false; } });
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') done(); if (e.key === 'Escape') { input.blur(); } });
      setTimeout(() => { input.focus(); input.select(); }, 50);
    });
  }

  // ── Écran titre et nouvelle partie ─────────────────────────────────
  title(save) {
    return new Promise((resolve) => {
      const o = this.overlay('title-screen');
      o.el.innerHTML = `<div class="title-vignette"></div><div class="title-content">
        <div class="logo logo-big"><span class="logo-top">Éclats de</span><span class="logo-main">LUMERIA</span><span class="logo-sub">${GAME.subtitle}</span></div>
        <nav class="title-menu"></nav></div>
        <footer class="title-foot"><span><kbd>ZQSD</kbd>/<kbd>↑↓</kbd> naviguer</span><span><kbd>E</kbd>/<kbd>Entrée</kbd> valider</span><span>Manette et tactile compatibles</span><span class="ver">v${GAME.version}</span></footer>`;
      const nav = $('.title-menu', o.el);
      const opts = [];
      if (save) opts.push(['continue', 'Continuer', `${escapeHtml(save.name)} · ${save.badges?.length || 0} badge(s) · ${formatTime(save.playTime || 0)}`]);
      opts.push(['new', 'Nouvelle partie', save ? 'Écrase la sauvegarde actuelle' : 'Commencer l\'aventure']);
      opts.push(['options', 'Options', '']);
      if (canInstall()) opts.push(['install', 'Installer l\'application', 'Jouer depuis l\'écran d\'accueil, en plein écran']);
      const btns = opts.map(([, l, s]) => h('button', { class: 'btn', type: 'button' }, h('span', {}, l, s ? h('span', { class: 'btn-sub' }, s) : null)));
      nav.append(...btns);
      const menu = this.nav.push({
        items: btns,
        onSelect: async (i) => {
          const id = opts[i][0];
          if (id === 'options') { await this.ui.menus.optionsSheet(); return; }
          if (id === 'install') { await this.installApp(); return; }
          if (id === 'new') {
            if (save) { const c = await this.chooseList('Une sauvegarde existe déjà. La remplacer ?', [{ label: 'Oui, nouvelle partie' }, { label: 'Non' }]); if (c !== 0) return; }
            const setup = await this.newGame();
            if (!setup) return;
            this.nav.remove(menu); o.close(); resolve({ action: 'new', setup });
            return;
          }
          this.nav.remove(menu); o.close(); resolve({ action: 'continue' });
        },
      });
    });
  }

  /** Installation sur l'écran d'accueil (Android/ordinateur : invite du navigateur ; iPhone : marche à suivre). */
  async installApp() {
    const ev = window.__lumeriaInstall;
    if (ev) {
      try { ev.prompt(); const r = await ev.userChoice; if (r?.outcome === 'accepted') { window.__lumeriaInstall = null; this.ui.toast('Lumeria est installé sur ton appareil !'); } } catch { /* invite refusée */ }
      return;
    }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const lines = ios
      ? ['Sur iPhone : ouvre cette page dans Safari, touche le bouton Partager (le carré avec une flèche), puis « Sur l\'écran d\'accueil ».', 'Lumeria apparaît alors comme une application, en plein écran.']
      : ['Ouvre le menu de ton navigateur (⋮) puis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil ».', 'Lumeria apparaît alors comme une application, en plein écran.'];
    await this.chooseList(lines.join(' '), [{ label: 'Compris' }]);
  }

  /** Configuration d'une nouvelle partie : apparence, nom, difficulté, défis. */
  async newGame() {
    const look = await this.choosePanel('Qui êtes-vous ?', [
      { id: 'garcon', label: 'Garçon', sub: 'Casquette et sac à dos' },
      { id: 'fille', label: 'Fille', sub: 'Béret et queue de cheval' },
    ], { cls: 'looks' });
    if (!look) return null;
    const name = await this.nameEntry('Quel est votre nom ?', look === 'fille' ? 'Léna' : 'Alex', 10);
    const diff = await this.choosePanel('Difficulté', Object.entries(DIFFICULTY).map(([id, d]) => ({ id, label: d.name, sub: d.desc })), { cls: 'diffs', index: 1 });
    if (!diff) return null;
    const rules = await this.rulesPanel();
    if (!rules) return null;
    return { look, name, difficulty: diff, rules };
  }

  choosePanel(title, options, { cls = '', index = 0 } = {}) {
    return new Promise((resolve) => {
      const o = this.overlay('center');
      const btns = options.map((op) => h('button', { class: `btn choice-card${op.id ? ` choice-${op.id}` : ''}`, type: 'button' }, h('span', {}, h('b', {}, op.label), h('span', { class: 'btn-sub' }, op.sub || ''))));
      o.el.append(h('div', { class: `choice-panel shard ${cls}` }, h('h2', {}, title), h('div', { class: 'choice-grid' }, ...btns)));
      const close = (v) => { this.nav.remove(menu); o.close(); resolve(v); };
      const menu = this.nav.push({ items: btns, cols: options.length <= 3 ? options.length : 1, index, onSelect: (i) => close(options[i].id), onCancel: () => close(null) });
    });
  }

  rulesPanel() {
    return new Promise((resolve) => {
      const state = { nuzlocke: false, levelcap: false, noitems: false, monotype: false };
      const o = this.overlay('center');
      const list = h('div', { class: 'sheet-list' });
      const render = () => {
        list.innerHTML = '';
        const btns = Object.entries(CHALLENGE_RULES).map(([id, r]) => h('button', { class: `btn toggle${state[id] ? ' on' : ''}`, type: 'button' }, h('span', {}, h('b', {}, r.name), h('span', { class: 'btn-sub' }, r.desc)), h('span', { class: 'btn-right' }, state[id] ? 'Activé' : 'Désactivé')));
        const go = h('button', { class: 'btn go', type: 'button' }, 'Commencer l\'aventure !');
        list.append(...btns, go);
        return [...btns, go];
      };
      o.el.append(h('div', { class: 'sheet-panel shard wide' }, h('div', { class: 'sheet-title' }, 'Défis optionnels', h('small', {}, 'Pour les dresseurs qui veulent souffrir')), list));
      let items = render();
      const ids = Object.keys(CHALLENGE_RULES);
      const menu = this.nav.push({
        items,
        onSelect: (i) => {
          if (i >= ids.length) { this.nav.remove(menu); o.close(); resolve(state); return; }
          state[ids[i]] = !state[ids[i]];
          const idx = menu.index;
          items = render();
          this.nav.remove(menu);
          menu.items = items;
          menu.index = idx;
          this.nav.push(menu);
        },
        onCancel: () => { this.nav.remove(menu); o.close(); resolve(null); },
      });
    });
  }

  /** Introduction du Professeur (écran noir + textes). */
  async intro(name) {
    const o = this.overlay('intro-screen');
    o.el.innerHTML = `<div class="intro-orb"></div>`;
    await sleep(0.4);
    await this.ui.dialogue.say('Pr. Aubin', [
      'Bonjour, et bienvenue dans le monde des Lumins !',
      'Je m\'appelle Aubin. Les gens m\'appellent le Professeur des Lumins.',
      'Les Lumins sont des créatures nées de la lumière des étoiles. Ils vivent partout : dans les prairies, les forêts, les mers, les volcans…',
      'Certains les capturent dans des Prismes pour en faire des compagnons. D\'autres les entraînent pour des combats amicaux.',
      'Mais depuis quelque temps, une ombre plane sur notre région de Lumeria. Les Éclats de l\'Aube, qui protègent notre ciel, perdent leur éclat…',
      `${name}, ton aventure commence aujourd'hui. Un monde de rêves et d'aventures avec les Lumins t'attend !`,
    ]);
    o.el.classList.add('out');
    await sleep(0.6);
    o.close();
  }

  /** Choix du starter : trois cartes avec portrait, types et description. */
  starter(ids) {
    return new Promise((resolve) => {
      const o = this.overlay('center');
      const btns = ids.map((id) => {
        const sp = CREATURE_MAP[id];
        return h('button', { class: 'btn starter-card', type: 'button', html: `${this.portrait(id, false, 'sc-img')}<span class="sc-top"><span class="sc-name">${sp.name}</span>${sp.types.map(typeChip).join('')}</span><p>${escapeHtml(sp.desc || '')}</p>` });
      });
      o.el.append(h('div', { class: 'starter-wrap' }, h('h2', {}, 'Choisissez votre premier Lumin'), h('div', { class: 'starter-cards' }, ...btns), h('span', { class: 'starter-hint' }, 'Plante bat Eau · Eau bat Feu · Feu bat Plante')));
      const menu = this.nav.push({
        items: btns, cols: btns.length, index: 1,
        onSelect: async (i) => {
          const sp = CREATURE_MAP[ids[i]];
          const c = await this.chooseList(`Choisir ${sp.name} ?`, [{ label: `Oui, ${sp.name} !` }, { label: 'Non, je réfléchis encore' }]);
          if (c !== 0) return;
          this.nav.remove(menu); o.close(); resolve(ids[i]);
        },
      });
    });
  }

  // ── Résumé d'un Lumin ──────────────────────────────────────────────
  summary(team, index, { inBattle = false } = {}) {
    return new Promise((resolve) => {
      const o = this.overlay('center');
      let i = index, tab = 0;
      const panel = h('div', { class: 'summary shard' });
      o.el.append(panel);
      const render = () => {
        const c = team[i];
        if (c.egg) {
          panel.innerHTML = `<div class="sum-head"><span class="egg-ico big"></span><h2>Œuf</h2></div><p class="muted">${c.eggCycles > 10 ? 'Il va falloir attendre longtemps avant qu\'il éclose.' : c.eggCycles > 4 ? 'Des bruits proviennent de l\'intérieur. Il va bientôt éclore.' : 'Il bouge beaucoup ! Il va éclore d\'un instant à l\'autre !'}</p><div class="sum-foot"><span>◀ ▶ changer de Lumin · Échap retour</span></div>`;
          return;
        }
        const sp = c.def, nat = NATURES[c.nature];
        const tabs = ['Infos', 'Statistiques', 'Attaques'];
        let body = '';
        if (tab === 0) {
          body = `<dl class="sum-dl">
            <dt>N° Lumidex</dt><dd>${String(sp.num).padStart(3, '0')}</dd>
            <dt>Espèce</dt><dd>${sp.name}</dd>
            <dt>Type</dt><dd>${sp.types.map(typeChip).join(' ')}</dd>
            <dt>Talent</dt><dd><b>${ABILITIES[c.ability]?.name || c.ability}</b><br><small>${escapeHtml(ABILITIES[c.ability]?.desc || '')}</small></dd>
            <dt>Nature</dt><dd><b>${nat?.name || c.nature}</b> ${nat?.up ? `<small>(+${STAT_SHORT[nat.up]} / −${STAT_SHORT[nat.down]})</small>` : '<small>(neutre)</small>'}</dd>
            <dt>Objet tenu</dt><dd>${c.item ? ITEMS[c.item]?.name : '—'}</dd>
            <dt>Dresseur</dt><dd>${escapeHtml(c.ot || '—')}</dd>
            <dt>Rencontré</dt><dd>${escapeHtml(c.met || '—')}</dd>
            <dt>Amitié</dt><dd><span class="friend">${'♥'.repeat(Math.max(1, Math.ceil(c.friendship / 51)))}</span></dd>
            <dt>Expérience</dt><dd>${c.xp.toLocaleString('fr-FR')} pts · encore ${c.xpToNext.toLocaleString('fr-FR')} pour N.${Math.min(100, c.level + 1)}<div class="bp-xp"><i style="width:${c.xpProgress * 100}%"></i></div></dd>
          </dl><p class="muted">${escapeHtml(sp.desc || '')}</p>`;
        } else if (tab === 1) {
          body = `<div class="stats">${STATS.map((s) => {
            const v = c.stats[s];
            const mark = nat?.up === s ? 'up' : nat?.down === s ? 'down' : '';
            return `<div class="stat-row ${mark}"><span>${STAT_LABELS[s]}</span><span>${s === 'hp' ? `${c.hp}/${v}` : v}</span><span class="bar"><i style="width:${Math.min(100, (v / (s === 'hp' ? 400 : 300)) * 100)}%"></i></span><span class="ivev" title="Potentiel / Points d'effort">${c.iv[s]} · ${c.ev[s]}</span></div>`;
          }).join('')}</div>
          <p class="muted small">Colonne de droite : potentiel caché (0-31) · points d'effort (0-252, total 510). Statistique en vert/rouge : effet de la nature.</p>
          <div class="sum-base">Statistiques de base : ${STATS.map((s) => `${STAT_SHORT[s]} ${sp.base[s]}`).join(' · ')} · Total ${STATS.reduce((a, s) => a + sp.base[s], 0)}</div>`;
        } else {
          body = `<div class="sum-moves">${c.moves.map((m) => {
            const mv = MOVES[m.id];
            return `<div class="mv-pill" style="--tc:${TYPES[mv.type].color}"><span class="mv-l">${mv.name}${typeChip(mv.type)}<b>PP ${m.pp}/${m.ppMax}</b></span><small>${categoryLabel(mv.cat)} · Puiss. ${mv.power || '—'} · Préc. ${mv.acc || '—'}</small><small>${escapeHtml(describeMove(mv))}</small></div>`;
          }).join('')}</div>`;
        }
        panel.innerHTML = `<div class="sum-head">${this.portrait(c.species, c.shiny, 'sum-img')}<div><h2>${escapeHtml(c.name)}${genderMark(c.gender)}${c.shiny ? ' <span class="bp-shiny">✦</span>' : ''}</h2><div class="sum-sub">N.${c.level} ${statusChip(c.status)} ${c.dead ? '<span class="status-chip" style="background:#555">PERDU</span>' : ''}</div><div class="hpbar"><i class="${hpClass(c.hp / c.maxHp)}" style="width:${(c.hp / c.maxHp) * 100}%"></i></div></div></div>
          <div class="sum-tabs">${tabs.map((t, k) => `<span class="${k === tab ? 'on' : ''}">${t}</span>`).join('')}</div>
          <div class="sum-body">${body}</div>
          <div class="sum-foot"><span>◀ ▶ onglets · ▲ ▼ Lumin · Échap retour</span><span>${i + 1}/${team.length}</span></div>`;
        panel.querySelectorAll('.sum-tabs span').forEach((el, k) => el.addEventListener('click', () => { tab = k; render(); }));
      };
      render();
      const close = () => { this.nav.remove(menu); o.close(); resolve(); };
      const menu = this.nav.push({
        handle: (a) => {
          if (a === 'left') { tab = (tab + 2) % 3; render(); this.audio.play('move'); }
          else if (a === 'right') { tab = (tab + 1) % 3; render(); this.audio.play('move'); }
          else if (a === 'up') { i = (i - 1 + team.length) % team.length; render(); this.audio.play('move'); }
          else if (a === 'down') { i = (i + 1) % team.length; render(); this.audio.play('move'); }
          else if (a === 'cancel' || a === 'confirm' || a === 'pause') { this.audio.play('back'); close(); }
          return true;
        },
      });
      o.el.addEventListener('click', (e) => { if (e.target === o.el) close(); });
    });
  }

  // ── Boutique ───────────────────────────────────────────────────────
  async shop(shopId) {
    const g = this.game;
    for (;;) {
      const c = await this.chooseList('Boutique', [{ label: 'Acheter' }, { label: 'Vendre' }]);
      if (c === null) return;
      if (c === 0) await this.shopBuy(shopList(shopId, g.badgeCount));
      else await this.shopSell();
    }
  }

  async shopBuy(list) {
    const g = this.game;
    for (;;) {
      const items = list.map((id) => ({ label: ITEMS[id].name, sub: ITEMS[id].desc, right: money(ITEMS[id].price), color: ITEMS[id].color }));
      const i = await this.chooseList(`Acheter — ${money(g.data.money)}`, items);
      if (i === null) return;
      const it = ITEMS[list[i]];
      const max = Math.min(99, Math.floor(g.data.money / it.price));
      if (max < 1) { this.audio.play('deny'); this.ui.toast('Vous n\'avez pas assez d\'argent.'); continue; }
      const q = await this.quantity(`${it.name} — combien ?`, max, (n) => `${money(n * it.price)}`);
      if (!q) continue;
      g.addMoney(-q * it.price);
      g.addItem(it.id, q);
      this.audio.play('buy');
      this.ui.toast(`Vous achetez ${it.name} ×${q}.`);
      if (it.id === 'prisme' && q >= 10) { g.addItem('super_prisme', 1); this.ui.toast('En cadeau : un Super Prisme !'); }
    }
  }

  async shopSell() {
    const g = this.game;
    for (;;) {
      const ids = Object.keys(g.data.bag).filter((k) => ITEMS[k] && ITEMS[k].pocket !== 'cle' && ITEMS[k].pocket !== 'dt' && sellPrice(ITEMS[k]) > 0 && g.data.bag[k] > 0);
      if (!ids.length) { this.ui.toast('Rien à vendre.'); return; }
      const i = await this.chooseList(`Vendre — ${money(g.data.money)}`, ids.map((k) => ({ label: ITEMS[k].name, right: `×${g.data.bag[k]} · ${money(sellPrice(ITEMS[k]))}`, color: ITEMS[k].color })));
      if (i === null) return;
      const it = ITEMS[ids[i]];
      const q = await this.quantity(`Vendre ${it.name} — combien ?`, g.data.bag[it.id], (n) => `${money(n * sellPrice(it))}`);
      if (!q) continue;
      g.take(it.id, q);
      g.addMoney(q * sellPrice(it));
      this.audio.play('buy');
    }
  }

  quantity(title, max, priceOf) {
    return new Promise((resolve) => {
      let n = 1;
      const o = this.overlay('center');
      const val = h('div', { class: 'qty-val' });
      const ok = h('button', { class: 'btn', type: 'button' }, 'Valider');
      const panel = h('div', { class: 'name-panel qty' }, h('h2', {}, title), h('div', { class: 'qty-row' }, h('button', { class: 'btn btn-ghost qminus', type: 'button' }, '−'), val, h('button', { class: 'btn btn-ghost qplus', type: 'button' }, '+')), ok);
      o.el.append(panel);
      const render = () => { val.innerHTML = `<b>×${n}</b><span>${priceOf(n)}</span>`; };
      render();
      const set = (v) => { n = Math.max(1, Math.min(max, v)); render(); this.audio.play('move'); };
      $('.qminus', panel).addEventListener('click', () => set(n - 1));
      $('.qplus', panel).addEventListener('click', () => set(n + 1));
      const close = (v) => { this.nav.remove(menu); o.close(); resolve(v); };
      const menu = this.nav.push({
        items: [ok], onSelect: () => close(n), onCancel: () => close(0),
        handle: (a) => { if (a === 'up' || a === 'right') { set(n + 1); return true; } if (a === 'down' || a === 'left') { set(n - 1); return true; } return false; },
      });
    });
  }

  async bpShop() {
    const g = this.game;
    for (;;) {
      const i = await this.chooseList(`Échange de Points Combat — ${g.data.bp} PC`, BP_SHOP.map(([id, cost]) => ({ label: ITEMS[id].name, sub: ITEMS[id].desc, right: `${cost} PC`, color: ITEMS[id].color, disabled: g.data.bp < cost })));
      if (i === null) return;
      const [id, cost] = BP_SHOP[i];
      if (g.data.bp < cost) { this.audio.play('deny'); continue; }
      g.data.bp -= cost;
      g.addItem(id, 1);
      this.audio.play('buy');
      this.ui.toast(`Vous obtenez : ${ITEMS[id].name} !`);
    }
  }

  // ── PC de stockage ─────────────────────────────────────────────────
  pc() {
    return new Promise((resolve) => {
      const g = this.game;
      const o = this.overlay('center');
      let box = 0, held = null;
      const panel = h('div', { class: 'pc shard' });
      o.el.append(panel);
      const get = (i) => (i < 30 ? (g.data.boxes[box][i] ? Creature.fromJSON(g.data.boxes[box][i]) : null) : g.team[i - 30] || null);
      const validTeam = (team) => team.some((c) => !c.egg && !c.dead);
      /** Échange deux emplacements (boîte 0-29, équipe 30-35). */
      const swap = (a, b) => {
        if (a === b) return true;
        const boxes = g.data.boxes[box].slice();
        const team = g.team.slice();
        const ca = a < 30 ? boxes[a] : team[a - 30], cb = b < 30 ? boxes[b] : team[b - 30];
        const toJ = (c) => (c && c.toJSON ? c.toJSON() : c);
        const toC = (c) => (c && !c.toJSON ? Creature.fromJSON(c) : c);
        if (a < 30 && b < 30) { boxes[a] = cb ?? null; boxes[b] = ca ?? null; }
        else if (a >= 30 && b >= 30) { if (cb) { team[a - 30] = cb; team[b - 30] = ca; } else { team.splice(a - 30, 1); team.push(ca); } }
        else {
          const [bi, ti] = a < 30 ? [a, b - 30] : [b, a - 30];
          const fromBox = boxes[bi], fromTeam = team[ti];
          boxes[bi] = fromTeam ? toJ(fromTeam) : null;
          if (fromBox) { if (ti < team.length) team[ti] = toC(fromBox); else team.push(toC(fromBox)); } else if (ti < team.length) team.splice(ti, 1);
        }
        const clean = team.filter(Boolean);
        if (!validTeam(clean) || clean.length > 6) { this.audio.play('deny'); this.ui.toast('Gardez au moins un Lumin capable de combattre dans l\'équipe !'); return false; }
        g.data.boxes[box] = boxes;
        g.team.splice(0, g.team.length, ...clean);
        return true;
      };
      let menu;
      const build = () => {
        const B = g.data.boxes[box];
        panel.innerHTML = `<div class="pc-head"><button class="btn btn-ghost pc-prev" type="button">◀</button><h2>Boîte ${box + 1}</h2><button class="btn btn-ghost pc-next" type="button">▶</button><span class="muted">${held !== null ? `Déplacement de ${escapeHtml(get(held)?.name || '')} : choisissez la destination` : `${g.pcCount()} Lumin(s) stocké(s)`}</span></div>
          <div class="pc-body"><div class="pc-grid"></div><div class="pc-team"><h3>Équipe</h3></div></div>
          <div class="sum-foot"><span>Valider : options / destination · Pause : boîte suivante · Échap : quitter</span></div>`;
        const cells = B.map((raw, i) => {
          const c = raw ? Creature.fromJSON(raw) : null;
          return h('button', { class: `btn pc-cell${c ? '' : ' empty'}${held === i ? ' held' : ''}`, type: 'button', html: c ? `${c.egg ? '<span class="egg-ico"></span>' : this.portrait(c.species, c.shiny)}<span>${c.egg ? 'Œuf' : `N.${c.level}`}</span>` : '' });
        });
        $('.pc-grid', panel).append(...cells);
        const tcells = [];
        for (let k = 0; k < 6; k++) {
          const c = g.team[k];
          tcells.push(h('button', { class: `btn pc-cell team${c ? '' : ' empty'}${held === 30 + k ? ' held' : ''}`, type: 'button', html: c ? `${c.egg ? '<span class="egg-ico"></span>' : this.portrait(c.species, c.shiny)}<span>${escapeHtml(c.name)}</span>` : '' }));
        }
        $('.pc-team', panel).append(...tcells);
        $('.pc-prev', panel).addEventListener('click', () => { held = null; box = (box + g.data.boxes.length - 1) % g.data.boxes.length; rebuild(); });
        $('.pc-next', panel).addEventListener('click', () => { held = null; box = (box + 1) % g.data.boxes.length; rebuild(); });
        return [...cells, ...tcells];
      };
      const rebuild = (idx) => {
        const keep = idx ?? menu?.index ?? 0;
        if (menu) this.nav.remove(menu);
        const items = build();
        menu = this.nav.push({
          items, cols: 6, index: keep,
          onSelect: (i) => onSel(i),
          onCancel: () => { if (held !== null) { held = null; rebuild(); return; } this.nav.remove(menu); o.close(); g.refreshHUD(); resolve(); },
          handle: (a) => { if (a === 'pause') { held = null; box = (box + 1) % g.data.boxes.length; rebuild(); return true; } return false; },
        });
      };
      const onSel = async (i) => {
        if (held !== null) {
          const target = i >= 30 && i - 30 > g.team.length ? 30 + g.team.length : i;
          if (swap(held, target)) this.audio.play('select');
          held = null;
          rebuild(i);
          return;
        }
        const cur = get(i);
        if (!cur) return;
        const k = await this.chooseList(cur.name, [{ label: 'Déplacer' }, { label: 'Résumé' }, { label: 'Relâcher' }]);
        if (k === 0) { held = i; rebuild(i); }
        else if (k === 1) await this.summary([cur], 0);
        else if (k === 2) {
          if (i >= 30 && g.team.filter((c) => !c.egg && !c.dead).length <= 1 && !cur.egg) { this.ui.toast('Impossible : c\'est votre dernier Lumin.'); return; }
          const c2 = await this.chooseList(`Relâcher ${cur.name} ? C'est définitif.`, [{ label: 'Oui, relâcher' }, { label: 'Non' }]);
          if (c2 === 0) {
            if (i < 30) g.data.boxes[box][i] = null; else g.team.splice(i - 30, 1);
            this.ui.toast(`${cur.name} retourne à la nature. Au revoir !`);
            rebuild();
          }
        }
      };
      rebuild();
    });
  }

  /** Équipe de 3 pour la Tour de Combat. */
  async pickTeam(team, n) {
    const picks = [];
    while (picks.length < n) {
      const i = await this.chooseMon(team, { title: `Choisissez ${n} Lumins (${picks.length}/${n})`, check: (c) => (picks.includes(c) ? 'Choisi' : c.egg ? 'Œuf' : null) });
      if (i === null) return null;
      picks.push(team[i]);
    }
    return picks;
  }

  // ── Pension ────────────────────────────────────────────────────────
  async daycare() {
    const g = this.game;
    const dc = g.data.daycare;
    const host = 'Éleveuse';
    for (;;) {
      const mons = dc.mons.map((o) => Creature.fromJSON(o));
      const lines = mons.length ? mons.map((c) => `${c.name} (N.${c.level}${c.xpGained ? `, +${c.xpGained} pas` : ''})`).join(' et ') : 'aucun Lumin';
      const chance = g.breedChance();
      const verdict = mons.length < 2 ? '' : chance >= 50 ? 'Ils s\'entendent à merveille !' : chance >= 20 ? 'Ils s\'entendent plutôt bien.' : 'Ils préfèrent jouer avec d\'autres Lumins…';
      const c = await this.chooseList(`Pension — ${lines}. ${verdict}`, [{ label: 'Confier un Lumin', disabled: mons.length >= 2 }, { label: 'Reprendre un Lumin', disabled: !mons.length }, { label: 'Au revoir' }]);
      if (c === null || c === 2) return;
      if (c === 0) {
        if (mons.length >= 2) continue;
        const i = await this.chooseMon(g.team, { title: 'Quel Lumin confier ?', check: (m) => (m.egg ? 'Œuf' : g.team.filter((x) => !x.egg && !x.dead && x.hp > 0).length <= 1 && m.hp > 0 ? 'Dernier Lumin' : null) });
        if (i === null) continue;
        const m = g.team[i];
        g.team.splice(i, 1);
        const j = m.toJSON();
        j.xpGained = 0;
        dc.mons.push(j);
        await g.say(host, [`Nous prendrons bien soin de ${m.name} !`]);
      } else {
        const i = await this.chooseList('Quel Lumin reprendre ?', mons.map((m, k) => ({ label: m.name, right: `${100 + 100 * Math.floor((dc.mons[k].xpGained || 0) / 100)} ◆` })));
        if (i === null) continue;
        if (g.team.length >= 6) { await g.say(host, ['Votre équipe est pleine !']); continue; }
        const raw = dc.mons[i];
        const cost = 100 + 100 * Math.floor((raw.xpGained || 0) / 100);
        if (g.data.money < cost) { await g.say(host, [`Il faut ${money(cost)}.`]); continue; }
        g.addMoney(-cost);
        const m = Creature.fromJSON(raw);
        const ups = (raw.xpGained || 0) > 0 && !(g.levelCap && m.level >= g.levelCap) ? m.gainXp(raw.xpGained) : [];
        dc.mons.splice(i, 1);
        g.team.push(m);
        await g.say(host, [`Voici ${m.name} !${ups.length ? ` Il a pris ${ups.length} niveau${ups.length > 1 ? 'x' : ''} !` : ''}`]);
        for (const up of ups) for (const mv of up.newMoves) await g.teachMove(m, mv);
      }
      g.refreshHUD();
    }
  }

  // ── Carte de la région / Vol ───────────────────────────────────────
  regionMap(canFly = false) {
    return new Promise((resolve) => {
      const g = this.game;
      const o = this.overlay('center');
      const W = 1000, H = 680;
      const here = (g.map?.id || '').split(':')[0];
      const nodeOf = (id) => REGION.nodes[id] || REGION.points[id];
      const svg = [`<svg viewBox="0 0 ${W} ${H}" class="region-svg" role="img" aria-label="Carte de Lumeria">`,
        '<defs><radialGradient id="sea" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1c3a5e"/><stop offset="1" stop-color="#0b1a30"/></radialGradient></defs>',
        `<rect width="${W}" height="${H}" fill="url(#sea)"/>`,
        ...regionArt()];
      for (const [id, a, b] of REGION.links) {
        const A = nodeOf(a), B = nodeOf(b);
        if (!A || !B) continue;
        const vis = g.data.visited[id];
        svg.push(`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${vis ? '#ffd27a' : '#8a8a7a'}" stroke-width="${vis ? 7 : 5}" stroke-linecap="round" stroke-dasharray="${vis ? '' : '10 8'}"/>`);
      }
      svg.push('<line x1="380" y1="380" x2="520" y2="300" stroke="#9ab8ff" stroke-width="3" stroke-dasharray="6 8"/>');
      for (const [id, p] of Object.entries(REGION.points)) svg.push(`<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="${g.data.visited[id] ? '#c8a070' : '#5a5a50'}"/>`);
      for (const [id, p] of Object.entries(REGION.nodes)) {
        const vis = g.data.visited[id];
        svg.push(`<g class="rnode${id === here ? ' here' : ''}"><rect x="${p[0] - 16}" y="${p[1] - 16}" width="32" height="32" rx="5" fill="${vis ? '#ffc65c' : '#6a6a60'}" stroke="#2a1404" stroke-width="3"/><text x="${p[0]}" y="${p[1] + 40}" text-anchor="middle" class="rlabel">${vis ? escapeHtml(MAPS[id]?.name || id) : '???'}</text></g>`);
      }
      const hp = nodeOf(here) || (() => { const l = REGION.links.find(([id]) => id === here); if (!l) return null; const A = nodeOf(l[1]), B = nodeOf(l[2]); return A && B ? [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2] : null; })();
      if (hp) svg.push(`<circle cx="${hp[0]}" cy="${hp[1]}" r="11" fill="#ff5a5a" stroke="#fff" stroke-width="3" class="you"/>`);
      svg.push('</svg>');
      const flyable = canFly && g.hasBadge('brasier') ? Object.keys(REGION.nodes).filter((id) => g.data.fly[id]) : [];
      const btns = flyable.map((id) => h('button', { class: 'btn', type: 'button' }, `Voler vers ${MAPS[id].name}`));
      const close = h('button', { class: 'btn btn-ghost', type: 'button' }, 'Fermer');
      o.el.append(h('div', { class: 'region shard' }, h('h2', {}, 'Lumeria', h('small', {}, `Vous êtes ici : ${escapeHtml(g.map?.def.areaName || g.map?.def.name || '')}`)), h('div', { class: 'region-map', html: svg.join('') }), h('div', { class: 'region-fly' }, ...btns, close)));
      const done = (v) => { this.nav.remove(menu); o.close(); resolve(v); };
      const menu = this.nav.push({
        items: [...btns, close], cols: Math.min(4, btns.length + 1),
        onSelect: async (i) => { if (i >= btns.length) { done(null); return; } done(flyable[i]); await g.flyTo(flyable[i]); },
        onCancel: () => done(null),
      });
    });
  }

  // ── Séquences ──────────────────────────────────────────────────────
  async badge(b) {
    const o = this.overlay('center');
    o.el.append(h('div', { class: 'badge-show' }, h('div', { class: 'badge-gem', style: `--bc:${b.color}` }), h('h2', {}, b.name), h('p', {}, `${b.leader} · ${b.town}`)));
    this.audio.play('keyitem');
    await sleep(2.4);
    o.close();
  }

  async hatch(mon) {
    await this.game.battleCtl.hatchScene(mon);
  }

  async hallOfFame(team, data) {
    const o = this.overlay('center hof');
    const cards = team.filter((c) => !c.egg).map((c) => `<div class="hof-card">${this.portrait(c.species, c.shiny)}<b>${escapeHtml(c.name)}</b><span>N.${c.level} · ${c.def.types.map((t) => TYPES[t].name).join('/')}</span></div>`).join('');
    o.el.innerHTML = `<div class="hof-wrap"><div class="logo"><span class="logo-top">Panthéon de la Ligue</span><span class="logo-main">CHAMPION</span><span class="logo-sub">${escapeHtml(data.name)} · ${formatTime(data.playTime)} · ${Object.keys(data.dex.caught).length} Lumins capturés</span></div><div class="hof-cards">${cards}</div><p class="muted">Difficulté : ${DIFFICULTY[data.difficulty]?.name}${Object.entries(data.rules || {}).filter(([, v]) => v).map(([k]) => ` · ${CHALLENGE_RULES[k].name}`).join('')}</p><p class="credits">Éclats de Lumeria — un jeu de créatures en pixel art dans le navigateur. Merci d'avoir joué !</p></div>`;
    this.game.bgm.play('title');
    await new Promise((resolve) => {
      const menu = this.nav.push({ handle: (a) => { if (a === 'confirm' || a === 'cancel') { this.nav.remove(menu); resolve(); } return true; } });
      setTimeout(() => o.el.classList.add('ready'), 3000);
    });
    o.close();
  }
}

/** Décor de la carte de la région : côtes, biomes estompés et petits pictogrammes. */
function regionArt() {
  const LAND = 'M70 600 C40 420 70 260 160 210 C280 140 330 70 420 70 C560 50 720 60 880 80 C960 100 970 220 930 330 C960 450 960 600 870 640 C700 680 520 660 380 640 C240 650 110 680 70 600 Z';
  const ISLE = 'M480 260 C520 240 580 260 570 310 C560 350 500 350 480 320 Z';
  const B = [
    [140, 560, 130, '#6aa84e'], [140, 380, 140, '#2f6a34'], [380, 380, 120, '#5f9a4a'], [380, 140, 150, '#7d776a'],
    [600, 140, 150, '#d9bc7c'], [820, 140, 130, '#4d6b4a'], [820, 380, 140, '#e6edf4'], [840, 590, 130, '#5b3a32'],
    [600, 580, 120, '#86b878'], [480, 470, 90, '#a9c98f'], [700, 380, 120, '#6f9a5a'], [260, 250, 120, '#55834a'],
  ];
  const out = ['<defs><filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>',
    `<clipPath id="land"><path d="${LAND}"/><path d="${ISLE}"/></clipPath>`,
    '<pattern id="waves" width="40" height="18" patternUnits="userSpaceOnUse"><path d="M0 12 Q10 4 20 12 T40 12" fill="none" stroke="#2c5684" stroke-width="2"/></pattern></defs>',
    '<rect width="1000" height="680" fill="url(#waves)" opacity="0.5"/>',
    `<path d="${LAND}" fill="#e2d39a" transform="translate(0 6)" opacity="0.6"/>`,
    `<path d="${LAND}" fill="#4a7a42"/><path d="${ISLE}" fill="#6aa050"/>`,
    '<g clip-path="url(#land)"><g filter="url(#soft)">'];
  for (const [x, y, r, c] of B) out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`);
  out.push('</g>');
  const tree = (x, y, c = '#1f4f28') => `<path d="M${x} ${y - 14} L${x + 8} ${y + 4} L${x - 8} ${y + 4} Z" fill="${c}" opacity="0.85"/>`;
  const mount = (x, y, s = 1) => `<path d="M${x - 22 * s} ${y + 12 * s} L${x} ${y - 18 * s} L${x + 22 * s} ${y + 12 * s} Z" fill="#5d574d"/><path d="M${x - 7 * s} ${y - 7 * s} L${x} ${y - 18 * s} L${x + 7 * s} ${y - 7 * s} Z" fill="#f4f4f0"/>`;
  const dune = (x, y) => `<path d="M${x - 20} ${y} Q${x} ${y - 12} ${x + 20} ${y}" fill="none" stroke="#b8955a" stroke-width="3"/>`;
  const flake = (x, y) => `<path d="M${x - 7} ${y} H${x + 7} M${x} ${y - 7} V${y + 7} M${x - 5} ${y - 5} L${x + 5} ${y + 5} M${x - 5} ${y + 5} L${x + 5} ${y - 5}" stroke="#9fb4c8" stroke-width="2"/>`;
  for (const [x, y] of [[90, 330], [118, 300], [200, 300], [210, 440], [90, 450], [180, 470], [250, 380], [300, 300], [330, 260]]) out.push(tree(x, y));
  for (const [x, y, s] of [[300, 120, 1], [450, 110, 1.2], [340, 190, 0.8], [700, 260, 0.9], [940, 240, 0.8]]) out.push(mount(x, y, s));
  for (const [x, y] of [[560, 100], [650, 180], [700, 110], [540, 190]]) out.push(dune(x, y));
  for (const [x, y] of [[760, 340], [880, 420], [900, 350], [770, 430]]) out.push(flake(x, y));
  for (const [x, y] of [[760, 120], [880, 180], [850, 100]]) out.push(tree(x, y, '#2f4a30'));
  out.push('<path d="M890 650 L920 590 L950 650 Z" fill="#3a2622"/><circle cx="920" cy="592" r="9" fill="#ff6a2a" opacity="0.9"/>');
  out.push('</g>');
  out.push(`<path d="${LAND}" fill="none" stroke="#f0e2b0" stroke-width="4"/><path d="${ISLE}" fill="none" stroke="#f0e2b0" stroke-width="3"/>`);
  return out;
}

export { LEVEL_CAPS, BADGES };
