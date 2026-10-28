import { MAPS } from '../maps/index.js';
import { buildOutdoor } from './OutdoorBuilder.js';
import { buildInterior } from './InteriorBuilder.js';
import { buildGrid } from './GridMap.js';

const KIND_PRESET = { house: 'house', bighouse: 'bighouse', center: 'center', shop: 'shop', lab: 'lab', daycare: 'daycare', tower: 'tower', dept: 'dept', temple: 'hall', lighthouse: 'hall' };
const KIND_NAME = { house: 'Maison', bighouse: 'Grande maison', center: 'Centre Lumin', shop: 'Boutique', lab: 'Laboratoire', daycare: 'Pension Lumin', tower: 'Tour de Combat', dept: 'Grand Magasin', temple: 'Temple', lighthouse: 'Phare' };

/**
 * GESTION DES CARTES : définitions (src/maps), intérieurs dérivés des bâtiments, construction et libération.
 */
export class MapManager {
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

  /** Nom affiché d'une carte (et de sa zone pour les intérieurs). */
  displayName(id) {
    const d = this.getDef(id);
    return d ? d.name : id;
  }

  async build(id) {
    const def = this.getDef(id);
    if (!def) throw new Error(`Carte inconnue : ${id}`);
    let map;
    if (def.type === 'interior') map = await buildInterior(def, this.game);
    else if (def.type === 'grid') map = await buildGrid(def, this.game);
    else map = await buildOutdoor(def, this.game);
    return map;
  }

  async load(id) {
    if (this.current) {
      this.current.dispose();
      this.current = null;
    }
    const map = await this.build(id);
    this.current = map;
    this.game.engine.scene.add(map.group);
    return map;
  }
}
