import { GAME, DIFFICULTY, CHALLENGE_RULES, DEFAULT_SETTINGS } from '../config/game.js';
import { TYPES } from '../config/types.js';
import { ITEMS, POCKETS } from '../config/items.js';
import { MOVES } from '../config/moves.js';
import { CREATURES, CREATURE_MAP, baseForm } from '../config/creatures.js';
import { CHALLENGES } from '../config/challenges.js';
import { BADGES } from '../config/badges.js';
import { STAT_SHORT, STATS } from '../config/natures.js';
import { MAPS, MAP_ORDER } from '../maps/index.js';
import { Save } from '../core/Save.js';
import { typeChip, statusChip, genderMark } from './BattleUI.js';
import { money } from './Screens.js';
import { $, h, escapeHtml, formatTime } from '../core/utils.js';

const hpClass = (r) => (r <= 0.2 ? 'low' : r <= 0.5 ? 'mid' : '');

/** Habitats d'une espèce (cartes où on la rencontre). */
function habitats(id) {
  const out = [];
  for (const mid of MAP_ORDER) {
    const enc = MAPS[mid]?.encounters;
    if (!enc) continue;
    const ways = Object.entries(enc).filter(([, t]) => t?.some((e) => e[0] === id)).map(([k]) => ({ grass: 'herbes', cave: 'grotte', surf: 'surf', fish: 'pêche' }[k] || k));
    if (ways.length) out.push(`${MAPS[mid].name} (${ways.join(', ')})`);
  }
  return out;
}

const BIOME_NAMES = { prairie: 'prairies', foret: 'forêts', cote: 'côtes', mer: 'haute mer', lac: 'lacs et rivières', marais: 'marais', montagne: 'montagnes', desert: 'déserts', neige: 'terres enneigées', volcan: 'volcans', celeste: 'hauteurs célestes', grotte: 'grottes' };
const RARITY_NAMES = { c: 'Commun', u: 'Peu commun', r: 'Rare', P: 'Très rare', L: 'Unique', S: 'Partenaire de départ', x: 'Légendaire' };
/** Milieu naturel de la lignée (bestiaire). */
function milieu(sp) {
  const b = CREATURE_MAP[baseForm(sp.id)] || sp;
  const list = (b.hab || []).map((h0) => `${BIOME_NAMES[h0.biome] || h0.biome}${h0.time === 'night' ? ' (la nuit)' : h0.time === 'day' ? ' (le jour)' : ''}`);
  return { list, rarity: RARITY_NAMES[b.rar?.[0]] || '' };
}

/**
 * MENU PAUSE : Équipe, Lumidex, Sac, Carte, Carnet de défis, Carte de dresseur, Options, Sauvegarde.
 */
export class Menus {
  constructor(ui) {
    this.ui = ui;
    this.nav = ui.nav;
  }

  get game() { return this.ui.game; }
  get screens() { return this.ui.screens; }

  pause() {
    return new Promise((resolve) => {
      const g = this.game;
      const o = this.screens.overlay('pause-overlay');
      const tabs = [['team', 'Équipe'], ['dex', 'Lumidex'], ['bag', 'Sac'], ['map', 'Carte'], ['challenges', 'Carnet de défis'], ['card', 'Dresseur'], ['options', 'Options'], ['save', 'Sauvegarder'], ['quit', 'Écran titre']];
      const side = h('div', { class: 'pause-side' }, h('div', { class: 'who' }, h('strong', {}, g.data.name), h('span', {}, `${formatTime(g.data.playTime)} · ${money(g.data.money)}`), h('span', {}, `${g.badgeCount} badge(s) · ${Object.keys(g.data.dex.caught).length} capturés`)));
      const btns = tabs.map(([, l]) => h('button', { class: 'btn', type: 'button' }, l));
      side.append(...btns);
      const titleEl = h('h2', {}, '');
      const body = h('div', { class: 'pause-body' });
      const main = h('div', { class: 'pause-main' }, titleEl, body);
      const closeBtn = h('button', { class: 'pause-close', type: 'button', 'aria-label': 'Fermer le menu' }, '✕');
      closeBtn.addEventListener('click', (e) => { e.preventDefault(); g.input.emit('cancel', { source: 'touch' }); });
      o.el.append(h('div', { class: 'pause shard' }, side, main, closeBtn));
      g.audio.play('select');
      const close = () => { this.nav.remove(menu); o.close(); resolve(); };
      const show = async (i, enter) => {
        btns.forEach((b, k) => b.classList.toggle('active', k === i));
        const key = tabs[i][0];
        if (key === 'map') { if (enter) await this.screens.regionMap(true); else this.preview(titleEl, body, 'Carte de Lumeria', 'Ouvrez la carte de la région' + (g.hasBadge('brasier') ? ' — vous pouvez y utiliser Vol.' : '.')); return; }
        if (key === 'options') { if (enter) await this.optionsSheet(); else this.preview(titleEl, body, 'Options', 'Qualité graphique, volume, vitesse du texte, commandes…'); return; }
        if (key === 'save') {
          this.preview(titleEl, body, 'Sauvegarder', `Dernière sauvegarde automatique à chaque changement de zone. Lieu : ${g.map?.def.name || ''}.`);
          if (enter) { const ok = g.saveGame(); g.audio.play(ok ? 'save' : 'deny'); this.ui.toast(ok ? 'Partie sauvegardée !' : 'Impossible de sauvegarder (stockage indisponible).'); }
          return;
        }
        if (key === 'quit') {
          this.preview(titleEl, body, 'Écran titre', 'Revenir à l\'écran titre (la progression non sauvegardée sera perdue).');
          if (enter) { const c = await this.screens.chooseList('Revenir à l\'écran titre ?', [{ label: 'Sauvegarder et quitter' }, { label: 'Quitter sans sauvegarder' }, { label: 'Annuler' }]); if (c === 0) g.saveGame(); if (c === 0 || c === 1) location.reload(); }
          return;
        }
        await this[`tab_${key}`](titleEl, body, enter);
      };
      const menu = this.nav.push({
        items: btns, index: 0,
        onChange: (i) => show(i, false),
        onSelect: (i) => show(i, true),
        onCancel: close,
        onPause: close,
      });
      show(0, false);
    });
  }

  preview(titleEl, body, title, text) {
    titleEl.innerHTML = escapeHtml(title);
    body.innerHTML = `<p class="muted">${escapeHtml(text)}</p>`;
  }

  /** Navigation à l'intérieur d'un onglet (renvoie quand on revient au menu latéral). */
  focusList(items, { cols = 1, onSelect, index = 0, onChange, handle } = {}) {
    return new Promise((resolve) => {
      if (!items.length) { resolve(); return; }
      const menu = this.nav.push({ items, cols, index, onChange, handle, onSelect: (i) => onSelect?.(i, menu), onCancel: () => { this.nav.remove(menu); resolve(); } });
    });
  }

  // ── Équipe ─────────────────────────────────────────────────────────
  async tab_team(titleEl, body, enter) {
    const g = this.game;
    const render = () => {
      titleEl.innerHTML = `Équipe <small>${g.team.length}/6</small>`;
      body.innerHTML = '';
      const grid = h('div', { class: 'team-grid' });
      const btns = g.team.map((c) => h('button', { class: `btn mon-btn big${c.hp <= 0 && !c.egg ? ' ko' : ''}`, type: 'button', html: this.screens.monRow(c, c.dead ? 'Perdu' : '') }));
      grid.append(...btns);
      body.append(grid);
      return btns;
    };
    let btns = render();
    if (!enter) return;
    let swapFrom = null;
    await this.focusList(btns, {
      cols: 2,
      onSelect: async (i, menu) => {
        if (swapFrom !== null) {
          const t = g.team[i]; g.team[i] = g.team[swapFrom]; g.team[swapFrom] = t;
          swapFrom = null;
          this.nav.remove(menu); btns = render(); menu.items = btns; menu.index = i; this.nav.push(menu);
          g.refreshHUD();
          return;
        }
        const c = g.team[i];
        const opts = [{ label: 'Résumé' }, { label: 'Changer de place' }];
        if (!c.egg) opts.push({ label: c.item ? `Reprendre l'objet (${ITEMS[c.item].name})` : 'Donner un objet' });
        const k = await this.screens.chooseList(c.name, opts);
        if (k === 0) await this.screens.summary(g.team, i);
        else if (k === 1) { swapFrom = i; this.ui.toast('Choisissez la nouvelle place.'); }
        else if (k === 2) {
          if (c.item) { g.addItem(c.item, 1); this.ui.toast(`${ITEMS[c.item].name} rangé dans le Sac.`); c.item = null; }
          else {
            const ids = Object.keys(g.data.bag).filter((id) => ITEMS[id] && ['baie', 'objet', 'soin'].includes(ITEMS[id].pocket) && g.data.bag[id] > 0 && (ITEMS[id].held || ITEMS[id].pocket === 'baie'));
            if (!ids.length) { this.ui.toast('Aucun objet à tenir.'); }
            else {
              const j = await this.screens.chooseList('Objet à tenir', ids.map((id) => ({ label: ITEMS[id].name, sub: ITEMS[id].desc, right: `×${g.data.bag[id]}`, color: ITEMS[id].color })));
              if (j !== null) { c.item = ids[j]; g.take(ids[j], 1); this.ui.toast(`${c.name} tient : ${ITEMS[ids[j]].name}.`); }
            }
          }
        }
        this.nav.remove(menu); btns = render(); menu.items = btns; menu.index = Math.min(i, btns.length - 1); this.nav.push(menu);
      },
    });
  }

  // ── Lumidex ────────────────────────────────────────────────────────
  async tab_dex(titleEl, body, enter) {
    const g = this.game;
    const seen = g.data.dex.seen, caught = g.data.dex.caught;
    titleEl.innerHTML = `Lumidex <small>${Object.keys(seen).length} vus · ${Object.keys(caught).length} capturés / ${CREATURES.length}</small>`;
    body.innerHTML = '';
    const grid = h('div', { class: 'dex-grid' });
    const btns = CREATURES.map((sp) => {
      const s = seen[sp.id], c = caught[sp.id];
      return h('button', { class: `btn dex-cell${s ? '' : ' unseen'}`, type: 'button', html: `${s ? this.ui.portraitHtml(sp.id) : '<span class="unknown">?</span>'}<span class="num">N°${String(sp.num).padStart(3, '0')}</span><span class="nm">${s ? sp.name : '???'}</span>${c ? '<span class="got"></span>' : ''}` });
    });
    grid.append(...btns);
    body.append(grid);
    if (!enter) return;
    await this.focusList(btns, {
      cols: Math.max(1, Math.floor((grid.clientWidth || 600) / 118)),
      onSelect: async (i) => {
        const sp = CREATURES[i];
        if (!seen[sp.id]) { this.ui.toast('Lumin encore inconnu.'); return; }
        await this.dexDetail(sp, !!caught[sp.id]);
      },
    });
  }

  dexDetail(sp, isCaught) {
    return new Promise((resolve) => {
      const o = this.screens.overlay('center');
      const evo = (sp.evo || []).map((e) => `${CREATURE_MAP[e.to]?.name} (${e.level ? `N.${e.level}` : e.item ? ITEMS[e.item]?.name : e.friend ? 'amitié' : ''}${e.time ? `, ${e.time === 'day' ? 'le jour' : 'la nuit'}` : ''})`).join(', ');
      const hab = habitats(sp.id);
      const tot = STATS.reduce((a, s) => a + sp.base[s], 0);
      o.el.append(h('div', { class: 'summary shard', html: `<div class="sum-head">${this.ui.portraitHtml(sp.id, false, 'sum-img')}<div><h2>N°${String(sp.num).padStart(3, '0')} ${sp.name}</h2><div class="sum-sub">${sp.types.map(typeChip).join(' ')} ${sp.legendary ? '<span class="status-chip" style="background:#ffd23f">LÉGENDAIRE</span>' : ''}</div></div></div>
        <div class="sum-body"><p>${escapeHtml(sp.desc || '')}</p>
        ${isCaught ? `<div class="stats">${STATS.map((s) => `<div class="stat-row"><span>${STAT_SHORT[s]}</span><span>${sp.base[s]}</span><span class="bar"><i style="width:${Math.min(100, sp.base[s] / 1.6)}%"></i></span></div>`).join('')}</div><p class="muted">Total ${tot} · Taille ${sp.height} m · Taux de capture ${sp.catch} · Groupes d'œufs : ${sp.egg.join(', ')}</p>` : '<p class="muted">Capturez ce Lumin pour connaître ses statistiques.</p>'}
        ${evo ? `<p><b>Évolution :</b> ${escapeHtml(evo)}</p>` : ''}
        ${(() => { const m = milieu(sp); return m.list.length || m.rarity ? `<p><b>Milieu :</b> ${escapeHtml(m.list.join(', ') || '—')}${m.rarity ? ` · <i>${m.rarity}</i>` : ''}</p>` : ''; })()}
        <p><b>Habitat :</b> ${hab.length ? escapeHtml(hab.join(' · ')) : 'Inconnu (évolution, œuf, cadeau ou légende).'}</p></div>
        <div class="sum-foot"><span>Échap : retour</span></div>` }));
      const close = () => { this.nav.remove(menu); o.close(); resolve(); };
      const menu = this.nav.push({ handle: (a) => { if (['cancel', 'confirm', 'pause'].includes(a)) close(); return true; } });
      o.el.addEventListener('click', close);
    });
  }

  // ── Sac ────────────────────────────────────────────────────────────
  async tab_bag(titleEl, body, enter, pocketIndex = 0) {
    const g = this.game;
    let p = pocketIndex;
    const render = () => {
      const pk = POCKETS[p];
      titleEl.innerHTML = `Sac <small>◀ ${pk.name} ▶</small>`;
      body.innerHTML = '';
      const tabs = h('div', { class: 'pocket-tabs' }, ...POCKETS.map((x, k) => h('span', { class: k === p ? 'on' : '' }, x.name)));
      body.append(tabs);
      const ids = Object.keys(g.data.bag).filter((id) => ITEMS[id]?.pocket === pk.id && g.data.bag[id] > 0).sort((a, b) => (ITEMS[a].num || 0) - (ITEMS[b].num || 0) || ITEMS[a].name.localeCompare(ITEMS[b].name));
      const list = h('div', { class: 'sheet-list' });
      const btns = ids.map((id) => {
        const it = ITEMS[id];
        const label = it.tm ? `${it.name} — ${MOVES[it.tm]?.name}` : it.name;
        const extra = id === 'multi_exp' ? (g.data.expShare ? ' (activé)' : ' (désactivé)') : '';
        return h('button', { class: 'btn', type: 'button' }, h('span', { class: 'lbl' }, h('i', { class: 'item-dot', style: `background:${it.color || '#fff'}` }), h('span', {}, label + extra, h('span', { class: 'btn-sub' }, it.tm ? `${TYPES[MOVES[it.tm]?.type]?.name} · Puiss. ${MOVES[it.tm]?.power || '—'}` : it.desc))), it.pocket === 'cle' || it.tm ? null : h('span', { class: 'btn-right' }, `×${g.data.bag[id]}`));
      });
      if (!btns.length) list.append(h('p', { class: 'muted' }, 'Cette poche est vide.'));
      list.append(...btns);
      body.append(list);
      tabs.querySelectorAll('span').forEach((el, k) => el.addEventListener('click', () => { p = k; rerender(); }));
      return { ids, btns };
    };
    let st = render();
    let menuRef = null;
    const rerender = () => { st = render(); if (menuRef) { this.nav.remove(menuRef); menuRef.items = st.btns.length ? st.btns : [h('span')]; menuRef.index = Math.min(menuRef.index, Math.max(0, st.btns.length - 1)); this.nav.push(menuRef); } };
    if (!enter) return;
    await new Promise((resolve) => {
      const menu = this.nav.push({
        items: st.btns.length ? st.btns : [h('span')], index: 0,
        handle: (a) => {
          if (a === 'left') { p = (p + POCKETS.length - 1) % POCKETS.length; rerender(); g.audio.play('move'); return true; }
          if (a === 'right') { p = (p + 1) % POCKETS.length; rerender(); g.audio.play('move'); return true; }
          return false;
        },
        onSelect: async (i) => {
          const id = st.ids[i];
          if (!id) return;
          await this.useBagItem(id);
          rerender();
        },
        onCancel: () => { this.nav.remove(menu); resolve(); },
      });
      menuRef = menu;
    });
  }

  async useBagItem(id) {
    const g = this.game;
    const it = ITEMS[id];
    const opts = [];
    const fieldUsable = it.heal || it.cure || it.revive || it.pp || it.vitamin || it.candy || it.ppUp || it.abilityCapsule || it.evoItem || it.tm || it.repel || it.escape || it.register || it.toggle || id === 'lumidex';
    if (fieldUsable) opts.push('Utiliser');
    if (it.held || it.pocket === 'baie') opts.push('Faire tenir');
    if (it.pocket !== 'cle' && !it.tm) opts.push('Jeter');
    opts.push('Annuler');
    const k = await this.screens.chooseList(it.name, opts.map((l) => ({ label: l })));
    const act = opts[k];
    if (!act || act === 'Annuler') return;
    if (act === 'Jeter') {
      const q = await this.screens.quantity(`Jeter ${it.name} — combien ?`, g.data.bag[id], () => '');
      if (q) { g.take(id, q); this.ui.toast(`${it.name} ×${q} jeté.`); }
      return;
    }
    if (act === 'Faire tenir') {
      const i = await this.screens.chooseMon(g.team, { title: `Faire tenir ${it.name}`, check: (c) => (c.egg ? 'Œuf' : null) });
      if (i === null) return;
      const c = g.team[i];
      if (c.item) g.addItem(c.item, 1);
      c.item = id;
      g.take(id, 1);
      this.ui.toast(`${c.name} tient : ${it.name}.`);
      return;
    }
    // Utiliser
    if (id === 'lumidex') { this.ui.toast('Ouvrez l\'onglet Lumidex.'); return; }
    if (it.toggle === 'expShare') { g.data.expShare = !g.data.expShare; this.ui.toast(`Multi Exp ${g.data.expShare ? 'activé' : 'désactivé'}.`); return; }
    if (it.register === 'bike') { this.closeAllAndRun(() => g.toggleBike()); return; }
    if (it.register === 'fish') { this.closeAllAndRun(() => g.tryFish()); return; }
    if (it.repel) {
      if (g.data.repel > 0) { this.ui.toast('Une Repousse est déjà active.'); return; }
      g.data.repel = it.repel; g.take(id, 1); g.audio.play('item');
      this.ui.toast(`${it.name} utilisée : ${it.repel} pas sans Lumin plus faible que votre premier Lumin.`);
      return;
    }
    if (it.escape) { this.closeAllAndRun(async () => { g.busy++; try { if (await g.escapeRope()) g.take(id, 1); } finally { g.busy--; } }); return; }
    const i = await this.screens.chooseMon(g.team, { title: `Utiliser ${it.name} sur…`, check: (c) => (it.tm ? (c.egg ? 'Œuf' : null) : null) });
    if (i === null) return;
    let moveIndex = null;
    if (it.ppOne) {
      const m = await this.screens.chooseList('Quelle attaque ?', g.team[i].moves.map((mv) => ({ label: MOVES[mv.id].name, right: `${mv.pp}/${mv.ppMax}` })));
      if (m === null) return;
      moveIndex = m;
    }
    const used = await g.useItemOnMon(id, g.team[i], moveIndex);
    if (used) g.take(id, 1);
    g.refreshHUD();
  }

  /** Ferme tous les menus puis exécute une action (vélo, pêche, corde…). */
  closeAllAndRun(fn) {
    this.nav.clear();
    document.querySelectorAll('.overlay').forEach((el) => el.remove());
    this.screens.z = 40;
    setTimeout(() => { this.game.busy = Math.max(0, this.game.busy - 1); fn(); }, 50);
  }

  // ── Carnet de défis ────────────────────────────────────────────────
  async tab_challenges(titleEl, body, enter) {
    const g = this.game;
    g.checkChallenges();
    const render = () => {
      const done = CHALLENGES.filter((c) => g.data.challenges[c.id]).length;
      titleEl.innerHTML = `Carnet de défis <small>${done}/${CHALLENGES.length}</small>`;
      body.innerHTML = '';
      const list = h('div', { class: 'sheet-list' });
      const btns = CHALLENGES.map((c) => {
        const st = g.data.challenges[c.id];
        return h('button', { class: `btn challenge ${st || ''}`, type: 'button' }, h('span', {}, h('b', {}, c.name), h('span', { class: 'btn-sub' }, `${c.desc} — Récompense : ${ITEMS[c.reward[0]]?.name} ×${c.reward[1]}`)), h('span', { class: 'btn-right' }, st === 'claimed' ? '✔ Réclamé' : st === 'done' ? 'Réclamer !' : '…'));
      });
      list.append(...btns);
      body.append(list);
      return btns;
    };
    let btns = render();
    if (!enter) return;
    await this.focusList(btns, {
      onSelect: async (i, menu) => {
        const c = CHALLENGES[i];
        if (g.data.challenges[c.id] === 'done') { await g.claimChallenge(c.id); this.nav.remove(menu); btns = render(); menu.items = btns; this.nav.push(menu); }
      },
    });
  }

  // ── Carte de dresseur ──────────────────────────────────────────────
  async tab_card(titleEl, body) {
    const g = this.game, d = g.data;
    titleEl.innerHTML = 'Carte de dresseur';
    const rules = Object.entries(d.rules || {}).filter(([, v]) => v).map(([k]) => CHALLENGE_RULES[k].name);
    body.innerHTML = `<div class="tcard shard">
      <div class="tc-top"><div class="tc-avatar ${d.look}"></div><div><h3>${escapeHtml(d.name)}</h3><span class="muted">Dresseur de Lumeria${g.flag('champion') ? ' · Champion de la Ligue' : ''}</span></div></div>
      <dl class="sum-dl"><dt>Argent</dt><dd>${money(d.money)}</dd><dt>Temps de jeu</dt><dd>${formatTime(d.playTime)}</dd>
      <dt>Lumidex</dt><dd>${Object.keys(d.dex.caught).length} capturés · ${Object.keys(d.dex.seen).length} vus</dd>
      <dt>Dresseurs vaincus</dt><dd>${d.stats.trainers}</dd><dt>Œufs éclos</dt><dd>${d.stats.hatched}</dd><dt>Tour de Combat</dt><dd>Record ${d.tower.best} · ${d.bp} PC</dd>
      <dt>Difficulté</dt><dd>${DIFFICULTY[d.difficulty]?.name}</dd><dt>Défis</dt><dd>${rules.length ? rules.join(', ') : 'Aucun'}${d.nuzlocke.failed ? ' (Nuzlocke échoué)' : ''}</dd>
      ${d.rules?.levelcap ? `<dt>Plafond de niveau</dt><dd>${g.levelCap}</dd>` : ''}</dl>
      <div class="badges">${BADGES.map((b) => `<div class="badge-slot${g.hasBadge(b.id) ? ' got' : ''}" style="--bc:${b.color}" title="${b.name} — ${b.leader}"><i></i><span>${g.hasBadge(b.id) ? b.name.replace('Badge ', '') : '?'}</span></div>`).join('')}</div></div>`;
  }

  // ── Options ────────────────────────────────────────────────────────
  optionsDefs() {
    return [
      ['quality', 'Qualité graphique', ['basse', 'haute', 'ultra'], { basse: 'Basse', haute: 'Haute', ultra: 'Ultra' }],
      ['music', 'Volume musique', [0, 0.25, 0.5, 0.75, 1], null],
      ['sfx', 'Volume effets', [0, 0.25, 0.5, 0.8, 1], null],
      ['textSpeed', 'Vitesse du texte', ['lente', 'normale', 'rapide'], { lente: 'Lente', normale: 'Normale', rapide: 'Rapide' }],
      ['battleAnims', 'Animations de combat', [true, false], { true: 'Complètes', false: 'Rapides' }],
      ['autoRun', 'Course automatique', [false, true], { true: 'Oui', false: 'Non' }],
      ['invertY', 'Inverser l\'axe vertical', [false, true], { true: 'Oui', false: 'Non' }],
      ['sensitivity', 'Sensibilité caméra', [0.5, 0.75, 1, 1.5, 2], null],
    ];
  }

  optionsSheet() {
    return new Promise((resolve) => {
      const g = this.game, S = g.settings;
      const o = this.screens.overlay('sheet');
      const list = h('div', { class: 'sheet-list' });
      const panel = h('div', { class: 'sheet-panel shard' }, h('div', { class: 'sheet-title' }, 'Options', h('small', {}, '◀ ▶ pour changer')), list);
      o.el.append(panel);
      const defs = this.optionsDefs();
      const fmt = (d, v) => (d[3] ? d[3][String(v)] : typeof v === 'number' ? (d[0] === 'sensitivity' ? `×${v}` : `${Math.round(v * 100)} %`) : String(v));
      const btns = defs.map((d) => h('button', { class: 'btn opt-row', type: 'button' }, h('span', {}, d[1]), h('span', { class: 'val' }, fmt(d, S[d[0]]))));
      list.append(...btns);
      const change = (i, dir) => {
        const d = defs[i];
        const vals = d[2];
        let k = vals.findIndex((v) => v === S[d[0]]);
        if (k < 0) k = 0;
        k = (k + dir + vals.length) % vals.length;
        S[d[0]] = vals[k];
        $('.val', btns[i]).textContent = fmt(d, S[d[0]]);
        this.applySettings(d[0]);
        g.audio.play('move');
      };
      const close = () => { this.nav.remove(menu); o.close(); Save.writeSettings(S); resolve(); };
      const menu = this.nav.push({
        items: btns,
        onSelect: (i) => change(i, 1),
        handle: (a) => { if (a === 'left') { change(menu.index, -1); return true; } if (a === 'right') { change(menu.index, 1); return true; } return false; },
        onCancel: close,
      });
    });
  }

  applySettings(key) {
    const g = this.game, S = g.settings;
    if (key === 'quality') { g.engine.applyQuality(); g.sky.setShadowQuality(S.quality); }
    if (key === 'music') g.bgm.setVolume(S.music);
    if (key === 'sfx') g.audio.setVolume(S.sfx);
  }
}

export { DEFAULT_SETTINGS, GAME, statusChip, genderMark, hpClass };
