import { MAPS } from '../maps/index.js';
import { buildOutdoor2D } from './buildOutdoor.js';
import { buildInterior2D } from './buildInterior.js';
import { buildGrid2D } from './buildGrid.js';

const KIND_PRESET = { house: 'house', bighouse: 'bighouse', center: 'center', shop: 'shop', lab: 'lab', daycare: 'daycare', tower: 'tower', dept: 'dept', temple: 'hall', lighthouse: 'hall' };
const KIND_NAME = { house: 'Maison', bighouse: 'Grande maison', center: 'Centre Lumin', shop: 'Boutique', lab: 'Laboratoire', daycare: 'Pension Lumin', tower: 'Tour de Combat', dept: 'Grand Magasin', temple: 'Temple', lighthouse: 'Phare' };

/**
 * GESTION DES CARTES 2D : définitions (src/maps), intérieurs dérivés des bâtiments, construction.
 */
export class MapManager2D {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.defs = MAPS;
  }

  getDef(id) {
    if (this.defs[id]) return this.defs[id];
    const i = id.indexOf(':');
    if (i < 0) return null;
    const pid = id.slice(0, i), bid = id.slice(i + 1);
    const parent = this.defs[pid];
    const b = parent?.buildings?.find((x) => x.id === bid);
    if (!b) return null;
    const it = b.interior || {};
    const def = {
      type: 'interior', name: b.name || KIND_NAME[b.kind] || 'Bâtiment', area: parent.area || parent.id, areaName: parent.name,
      preset: it.preset || KIND_PRESET[b.kind] || 'house', exitTo: pid, exitEntry: `door:${bid}`, music: it.music || (b.kind === 'center' ? 'center' : parent.music),
      biome: 'interieur', parent: pid, shop: it.shop || parent.shop, ...it, id,
    };
    this.defs[id] = def;
    return def;
  }

  displayName(id) {
    const d = this.getDef(id);
    return d ? d.name : id;
  }

  async build(id) {
    const def = this.getDef(id);
    if (!def) throw new Error(`Carte inconnue : ${id}`);
    if (!def.id) def.id = id;
    if (def.type === 'interior') return buildInterior2D(def, this.game);
    if (def.type === 'grid') return buildGrid2D(def, this.game);
    return buildOutdoor2D(def, this.game);
  }

  async load(id) {
    if (this.current) { this.current.dispose(); this.current = null; }
    const map = await this.build(id);
    this.current = map;
    return map;
  }
}
