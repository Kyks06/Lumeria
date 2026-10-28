/**
 * ATTAQUES
 * m(nom, type, catégorie, puissance, précision, PP, effets)
 *  catégorie : 'P' physique (Attaque/Défense) · 'S' spéciale (Atq. Spé./Déf. Spé.) · 'St' statut
 *  précision : 0 = ne rate jamais
 * Effets possibles :
 *  st:[statut, %]           brn (brûlure) psn (poison) tox (poison grave) par (paralysie) slp (sommeil) frz (gel)
 *  foe:[{stat:n}, %]        modifie les stats de la cible · self:[{stat:n}, %] modifie les siennes
 *  drain:0.5 · recoil:0.33 · heal:0.5 · hits:[2,5] · prio:1 · crit:1 (taux élevé) · flinch:% · confuse:%
 *  weather:'sun'|'rain'|'sand'|'snow' · protect · leech · trap · rest · haze · charge:'sun' (charge sauf soleil)
 *  fixed:'level' · facade · nc (physique sans contact) · ground (sismique : sans effet sur le type Vent)
 *  univ (enseignable à tous via DT)
 */
const m = (name, type, cat, power, acc, pp, fx = {}) => ({ name, type, cat, power, acc, pp, ...fx });

export const MOVES = {
  // ── NORMAL ─────────────────────────────────────────────
  bousculade:      m('Bousculade', 'normal', 'P', 40, 100, 35),
  griffure:        m('Griffure', 'normal', 'P', 40, 100, 35),
  elan:            m('Élan Fulgurant', 'normal', 'P', 40, 100, 30, { prio: 1 }),
  ligotage:        m('Ligotage', 'normal', 'P', 15, 90, 20, { trap: 1 }),
  coup_double:     m('Coup Double', 'normal', 'P', 25, 100, 20, { hits: [2, 2] }),
  ruee:            m('Ruée', 'normal', 'P', 70, 100, 20),
  plongeon_lourd:  m('Plongeon Lourd', 'normal', 'P', 85, 100, 15, { st: ['par', 30] }),
  rage_contenue:   m('Rage Contenue', 'normal', 'P', 70, 100, 20, { facade: 1, univ: 1 }),
  assaut_total:    m('Assaut Total', 'normal', 'P', 120, 100, 15, { recoil: 0.33 }),
  onde_sonore:     m('Onde Sonore', 'normal', 'S', 60, 100, 25),
  meteores:        m('Météores', 'normal', 'S', 60, 0, 20),
  deflagration:    m('Hurlement', 'normal', 'S', 90, 100, 10),
  grondement:      m('Grondement', 'normal', 'St', 0, 100, 40, { foe: [{ atk: -1 }, 100] }),
  queue_narquoise: m('Queue Narquoise', 'normal', 'St', 0, 100, 30, { foe: [{ def: -1 }, 100] }),
  regard_noir:     m('Regard Perçant', 'normal', 'St', 0, 100, 30, { foe: [{ def: -1 }, 100] }),
  cri_deroutant:   m('Cri Déroutant', 'normal', 'St', 0, 55, 20, { confuse: 100 }),
  aiguisage:       m('Aiguisage', 'normal', 'St', 0, 0, 20, { self: [{ atk: 2 }, 100], univ: 1 }),
  acceleration:    m('Accélération', 'normal', 'St', 0, 0, 30, { self: [{ spe: 2 }, 100] }),
  sieste:          m('Sieste', 'normal', 'St', 0, 0, 10, { rest: 1, univ: 1 }),
  bouclier:        m('Bouclier', 'normal', 'St', 0, 0, 10, { protect: 1, univ: 1 }),
  recuperation:    m('Récupération', 'normal', 'St', 0, 0, 10, { heal: 0.5 }),
  danse_victoire:  m('Danse de Victoire', 'normal', 'St', 0, 0, 20, { self: [{ atk: 1, spe: 1 }, 100] }),
  ecran_fumee:     m('Écran de Fumée', 'normal', 'St', 0, 100, 20, { foe: [{ acc: -1 }, 100] }),
  colere_titan:    m('Colère du Titan', 'normal', 'P', 100, 100, 10, { univ: 1 }),

  // ── FEU ────────────────────────────────────────────────
  escarbille:      m('Escarbille', 'feu', 'S', 40, 100, 25, { st: ['brn', 10] }),
  griffe_braise:   m('Griffe Braise', 'feu', 'P', 60, 100, 25, { st: ['brn', 10] }),
  morsure_ardente: m('Morsure Ardente', 'feu', 'P', 65, 95, 15, { st: ['brn', 10], flinch: 10 }),
  spirale_ardente: m('Spirale Ardente', 'feu', 'S', 75, 95, 15, { trap: 1 }),
  poing_volcan:    m('Poing Volcan', 'feu', 'P', 75, 100, 15, { st: ['brn', 10] }),
  jet_incandescent:m('Jet Incandescent', 'feu', 'S', 90, 100, 15, { st: ['brn', 10] }),
  brasier_solaire: m('Brasier Solaire', 'feu', 'S', 110, 85, 5, { st: ['brn', 30] }),
  ruee_infernale:  m('Ruée Infernale', 'feu', 'P', 120, 100, 15, { recoil: 0.33, st: ['brn', 10] }),
  flamme_spectrale:m('Flamme Spectrale', 'feu', 'St', 0, 85, 15, { st: ['brn', 100] }),
  soleil_ardent:   m('Sécheresse', 'feu', 'St', 0, 0, 5, { weather: 'sun', univ: 1 }),
  chaleur:         m('Chaleur Intérieure', 'feu', 'St', 0, 0, 20, { self: [{ atk: 1, spa: 1 }, 100] }),
  regard_brulant:  m('Regard Brûlant', 'feu', 'St', 0, 100, 25, { foe: [{ def: -1, spd: -1 }, 100] }),

  // ── EAU ────────────────────────────────────────────────
  bulle:           m("Bulle d'Écume", 'eau', 'S', 40, 100, 30, { foe: [{ spe: -1 }, 10] }),
  jet_vif:         m('Jet Vif', 'eau', 'P', 40, 100, 20, { prio: 1 }),
  tourbillon:      m('Tourbillon', 'eau', 'S', 35, 85, 15, { trap: 1 }),
  jet_ondulant:    m('Jet Ondulant', 'eau', 'S', 65, 100, 20, { confuse: 20 }),
  coup_nageoire:   m('Coup de Nageoire', 'eau', 'P', 65, 100, 20),
  croc_abyssal:    m('Croc Abyssal', 'eau', 'P', 80, 100, 15, { flinch: 20 }),
  vague_lame:      m('Vague-Lame', 'eau', 'S', 80, 100, 15),
  torrent_hurlant: m('Torrent Hurlant', 'eau', 'S', 90, 100, 15),
  maelstrom:       m('Maelström', 'eau', 'S', 110, 80, 5),
  ruee_abyssale:   m('Ruée Abyssale', 'eau', 'P', 120, 100, 15, { recoil: 0.33 }),
  voile_brume:     m('Brume', 'eau', 'St', 0, 0, 20, { self: [{ def: 1, spd: 1 }, 100] }),
  pluie_douce:     m('Pluie Douce', 'eau', 'St', 0, 0, 5, { weather: 'rain', univ: 1 }),
  source_vive:     m('Source Vive', 'eau', 'St', 0, 0, 10, { heal: 0.5 }),

  // ── PLANTE ─────────────────────────────────────────────
  feuille_vive:    m('Feuille Vive', 'plante', 'S', 40, 100, 25),
  fouet_liane:     m('Fouet Végétal', 'plante', 'P', 45, 100, 25),
  seve:            m('Sève', 'plante', 'S', 60, 100, 15, { drain: 0.5 }),
  feuille_tranchante: m('Feuille Tranchante', 'plante', 'P', 55, 95, 25, { crit: 1 }),
  bourgeon:        m('Bourgeon Explosif', 'plante', 'S', 80, 100, 10, { foe: [{ spd: -1 }, 10] }),
  taille_sylvestre:m('Taille Sylvestre', 'plante', 'P', 90, 100, 15, { crit: 1 }),
  tempete_petales: m('Tempête de Pétales', 'plante', 'S', 90, 100, 10),
  rayon_chloro:    m('Rayon Chlorophylle', 'plante', 'S', 120, 100, 10, { charge: 'sun' }),
  marteau_racine:  m('Marteau Racine', 'plante', 'P', 120, 100, 15, { recoil: 0.33 }),
  photosynthese:   m('Photosynthèse', 'plante', 'St', 0, 0, 5, { heal: 0.5 }),
  spores:          m('Spores Dormantes', 'plante', 'St', 0, 75, 15, { st: ['slp', 100] }),
  pollen_lourd:    m('Pollen Lourd', 'plante', 'St', 0, 95, 20, { foe: [{ spe: -2 }, 100] }),
  graine_sangsue:  m('Graine Sangsue', 'plante', 'St', 0, 90, 10, { leech: 1 }),
  croissance:      m('Croissance', 'plante', 'St', 0, 0, 20, { self: [{ atk: 1, spa: 1 }, 100] }),

  // ── FOUDRE ─────────────────────────────────────────────
  etincelle:       m('Étincelle', 'foudre', 'S', 40, 100, 30, { st: ['par', 10] }),
  eclair_vif:      m('Charge Éclair', 'foudre', 'P', 40, 100, 30, { prio: 1 }),
  coup_volt:       m('Coup-Volt', 'foudre', 'P', 65, 100, 20, { st: ['par', 10] }),
  onde_choc:       m('Onde de Choc', 'foudre', 'S', 60, 0, 20),
  poing_orage:     m('Poing Orage', 'foudre', 'P', 75, 100, 15, { st: ['par', 10] }),
  arc_foudre:      m('Arc de Foudre', 'foudre', 'S', 80, 100, 15, { st: ['par', 10] }),
  rayon_ionique:   m('Tonnerre', 'foudre', 'S', 90, 100, 15, { st: ['par', 10] }),
  fulgurance:      m('Fulgurance', 'foudre', 'S', 110, 70, 10, { st: ['par', 30] }),
  decharge_totale: m('Vol-Voltage', 'foudre', 'P', 120, 100, 15, { recoil: 0.33, st: ['par', 10] }),
  onde_paralysante:m('Cage Électrique', 'foudre', 'St', 0, 90, 20, { st: ['par', 100] }),
  charge_statique: m('Charge Statique', 'foudre', 'St', 0, 0, 20, { self: [{ spe: 2 }, 100] }),

  // ── GLACE ──────────────────────────────────────────────
  poudre_gelee:    m('Poudreuse', 'glace', 'S', 40, 100, 25, { st: ['frz', 10] }),
  eclat_glace:     m('Éclat de Glace', 'glace', 'P', 40, 100, 30, { prio: 1, nc: 1 }),
  souffle_polaire: m('Vent Glacé', 'glace', 'S', 55, 95, 15, { foe: [{ spe: -1 }, 100] }),
  croc_givre:      m('Croc Givré', 'glace', 'P', 65, 95, 15, { st: ['frz', 10], flinch: 10 }),
  poing_givre:     m('Poing Givre', 'glace', 'P', 75, 100, 15, { st: ['frz', 10] }),
  pic_glace:       m('Lance de Glace', 'glace', 'P', 85, 90, 10, { flinch: 30, nc: 1 }),
  rayon_givrant:   m('Rayon Givrant', 'glace', 'S', 90, 100, 10, { st: ['frz', 10] }),
  blizzard:        m('Blizzard', 'glace', 'S', 110, 70, 5, { st: ['frz', 10] }),
  brume_glacee:    m('Brume Glacée', 'glace', 'St', 0, 0, 30, { haze: 1 }),
  chute_neige:     m('Grêle', 'glace', 'St', 0, 0, 10, { weather: 'snow', univ: 1 }),
  armure_givre:    m('Miroir Glace', 'glace', 'St', 0, 0, 20, { self: [{ def: 1, spd: 1 }, 100] }),

  // ── ROCHE (roche & sol) ────────────────────────────────
  jet_pierres:     m('Jet-Pierres', 'roche', 'P', 40, 100, 25, { nc: 1 }),
  tir_boue:        m('Tir de Boue', 'sol', 'S', 55, 95, 15, { foe: [{ spe: -1 }, 100], ground: 1 }),
  coup_eboulis:    m("Coup d'Éboulis", 'roche', 'P', 60, 95, 20),
  pietinement:     m('Tremblement', 'sol', 'P', 60, 100, 20, { ground: 1, foe: [{ spe: -1 }, 100], nc: 1 }),
  avalanche:       m('Éboulement', 'roche', 'P', 75, 90, 10, { flinch: 30, nc: 1 }),
  joyau:           m('Joyau Brillant', 'roche', 'S', 80, 100, 20),
  pouvoir_tellurique: m('Pouvoir Tellurique', 'sol', 'S', 90, 100, 10, { ground: 1, foe: [{ spd: -1 }, 10] }),
  seisme_cristal:  m('Séisme Cristal', 'sol', 'P', 100, 100, 10, { ground: 1, nc: 1 }),
  lame_roc:        m('Lame de Roc', 'roche', 'P', 100, 80, 5, { crit: 1, nc: 1 }),
  carapace:        m('Mur de Pierre', 'roche', 'St', 0, 0, 15, { self: [{ def: 2 }, 100] }),
  poussiere:       m('Nuage de Poussière', 'sol', 'St', 0, 100, 15, { foe: [{ acc: -1 }, 100] }),
  tempete_sable:   m('Tempête de Sable', 'sol', 'St', 0, 0, 10, { weather: 'sand', univ: 1 }),

  // ── VENT ───────────────────────────────────────────────
  bec_vif:         m('Bec Vif', 'vent', 'P', 40, 100, 35),
  tornade:         m('Tornade', 'vent', 'S', 40, 100, 35),
  aile_tranchante: m('Aile Tranchante', 'vent', 'P', 60, 100, 35),
  lame_air:        m('Lame de Vent', 'vent', 'S', 75, 95, 15, { flinch: 30 }),
  rafale:          m('Rafale', 'vent', 'P', 80, 100, 15, { crit: 1 }),
  ouragan:         m('Ouragan', 'vent', 'S', 110, 70, 10, { confuse: 30 }),
  pique_fatal:     m('Piqué Fatal', 'vent', 'P', 120, 100, 15, { recoil: 0.33 }),
  danse_plume:     m('Danse Plume', 'vent', 'St', 0, 0, 20, { self: [{ atk: 1, spe: 1 }, 100] }),
  atterrissage:    m('Atterrissage', 'vent', 'St', 0, 0, 10, { heal: 0.5 }),
  vent_arriere:    m('Vent Arrière', 'vent', 'St', 0, 0, 15, { self: [{ spe: 2 }, 100] }),

  // ── TOXINE ─────────────────────────────────────────────
  piqure_toxique:  m('Piqûre Toxique', 'toxine', 'P', 40, 100, 35, { st: ['psn', 30] }),
  acide:           m('Venin', 'toxine', 'S', 40, 100, 30, { foe: [{ spd: -1 }, 10] }),
  vague_toxique:   m('Vague Toxique', 'toxine', 'S', 65, 100, 20, { st: ['psn', 30] }),
  crochet_nocif:   m('Crochet Nocif', 'toxine', 'P', 80, 100, 20, { st: ['psn', 30] }),
  bombe_fangeuse:  m('Bombe Fangeuse', 'toxine', 'S', 90, 100, 10, { st: ['psn', 30] }),
  deluge_putride:  m('Déluge Putride', 'toxine', 'P', 120, 80, 5, { st: ['psn', 30], nc: 1 }),
  venin_lent:      m('Nuage Toxique', 'toxine', 'St', 0, 90, 10, { st: ['tox', 100] }),
  poudre_toxique:  m('Gaz Toxik', 'toxine', 'St', 0, 75, 35, { st: ['psn', 100] }),
  armure_acide:    m('Armure Acide', 'toxine', 'St', 0, 0, 20, { self: [{ def: 2 }, 100] }),

  // ── COMBAT ─────────────────────────────────────────────
  poing_eclair:    m('Poing Éclair', 'normal', 'P', 40, 100, 30, { prio: 1 }),
  balayette:       m('Balayette', 'sol', 'P', 65, 100, 20, { foe: [{ spe: -1 }, 100] }),
  coup_paume:      m('Coup de Paume', 'normal', 'P', 60, 100, 10, { st: ['par', 30] }),
  riposte:         m('Riposte', 'normal', 'P', 75, 100, 15),
  vague_aura:      m("Vague d'Aura", 'lumiere', 'S', 80, 0, 20),
  poing_brisant:   m('Poing Brisant', 'roche', 'P', 90, 90, 10, { foe: [{ def: -1 }, 50] }),
  melee_totale:    m('Mêlée Totale', 'normal', 'P', 120, 100, 5, { self: [{ def: -1, spd: -1 }, 100] }),
  concentration:   m('Concentration Astrale', 'astral', 'S', 120, 70, 5, { foe: [{ spd: -1 }, 10] }),
  posture:         m('Posture', 'normal', 'St', 0, 0, 20, { self: [{ atk: 1, def: 1 }, 100] }),

  // ── PSY ────────────────────────────────────────────────
  choc_mental:     m('Choc Mental', 'astral', 'S', 50, 100, 25, { confuse: 10 }),
  rafale_psy:      m('Rafale Astrale', 'astral', 'S', 65, 100, 20, { confuse: 10 }),
  taille_mentale:  m('Taille Mentale', 'astral', 'P', 70, 100, 20, { crit: 1, nc: 1 }),
  coup_meditatif:  m('Coup Méditatif', 'astral', 'P', 80, 90, 15, { flinch: 20 }),
  onde_psychique:  m('Onde Psychique', 'astral', 'S', 90, 100, 10, { foe: [{ spd: -1 }, 10] }),
  explosion_mentale: m('Explosion Mentale', 'astral', 'S', 120, 85, 5),
  berceuse:        m('Berceuse', 'lumiere', 'St', 0, 60, 20, { st: ['slp', 100] }),
  meditation:      m('Méditation', 'astral', 'St', 0, 0, 20, { self: [{ spa: 1, spd: 1 }, 100] }),
  barriere_psy:    m('Barrière Astrale', 'astral', 'St', 0, 0, 20, { self: [{ def: 2 }, 100] }),

  // ── OMBRE ──────────────────────────────────────────────
  ombre_furtive:   m('Ombre Portée', 'spectre', 'P', 40, 100, 30, { prio: 1 }),
  lechouille:      m('Léchouille', 'spectre', 'P', 30, 100, 30, { st: ['par', 30] }),
  crocs_vifs:      m('Morsure', 'ombre', 'P', 60, 100, 25, { flinch: 30 }),
  griffe_ombre:    m('Griffe Ombre', 'spectre', 'P', 70, 100, 15, { crit: 1 }),
  broyage_noir:    m('Broyage Noir', 'ombre', 'P', 80, 100, 15, { foe: [{ def: -1 }, 20] }),
  onde_tenebreuse: m('Vent Ténébreux', 'ombre', 'S', 80, 100, 15, { flinch: 20 }),
  sphere_ombre:    m("Ball'Ombre", 'spectre', 'S', 80, 100, 15, { foe: [{ spd: -1 }, 20] }),
  cauchemar:       m('Cauchemar Éveillé', 'spectre', 'S', 110, 85, 5, { st: ['slp', 10] }),
  complot:         m('Complot', 'ombre', 'St', 0, 0, 20, { self: [{ spa: 2 }, 100] }),
  ricanement:      m('Ricanement', 'ombre', 'St', 0, 100, 20, { foe: [{ spa: -2 }, 100] }),

  // ── MÉTAL ──────────────────────────────────────────────
  poing_rivet:     m('Poing Rivet', 'metal', 'P', 40, 100, 30, { prio: 1 }),
  lame_acier:      m("Lame d'Acier", 'metal', 'P', 50, 95, 35, { self: [{ atk: 1 }, 10] }),
  eclat_magnetique:m('Éclat Magnétique', 'metal', 'S', 60, 0, 20),
  front_acier:     m("Front d'Acier", 'metal', 'P', 80, 100, 15, { flinch: 30 }),
  canon_chrome:    m('Canon Métallique', 'metal', 'S', 80, 100, 10, { foe: [{ spd: -1 }, 10] }),
  poing_orbital:   m('Poing Orbital', 'metal', 'P', 90, 90, 10, { self: [{ atk: 1 }, 20] }),
  rayon_lame:      m('Rayon-Lame', 'metal', 'S', 120, 90, 5, { self: [{ spa: -1 }, 100] }),
  blindage:        m('Armure', 'metal', 'St', 0, 0, 15, { self: [{ def: 2 }, 100] }),

  // ── LUMIÈRE ────────────────────────────────────────────
  brise_lumineuse: m('Brise Lumineuse', 'lumiere', 'S', 40, 100, 30),
  baiser_eclat:    m('Baiser Éclat', 'lumiere', 'P', 50, 100, 25, { foe: [{ atk: -1 }, 30] }),
  eclat_prisme:    m('Éclat Prismatique', 'lumiere', 'S', 80, 100, 10),
  frappe_radieuse: m('Frappe Radieuse', 'lumiere', 'P', 90, 90, 10, { foe: [{ atk: -1 }, 10] }),
  rayon_aurore:    m('Rayon Lumineux', 'lumiere', 'S', 95, 100, 15, { foe: [{ spa: -1 }, 30] }),
  lumiere_douce:   m('Lumière Douce', 'lumiere', 'St', 0, 0, 10, { heal: 0.5 }),
  regard_charmeur: m('Regard Charmeur', 'lumiere', 'St', 0, 100, 20, { foe: [{ atk: -2 }, 100] }),
  eblouissement:   m('Éblouissement', 'lumiere', 'St', 0, 100, 20, { foe: [{ acc: -1 }, 100] }),
  halo:            m('Halo Protecteur', 'lumiere', 'St', 0, 0, 20, { self: [{ spa: 1, spd: 1 }, 100] }),

  // ── INSECTE ────────────────────────────────────────────
  piqure:          m('Piqûre', 'insecte', 'P', 40, 100, 30, { prio: 1 }),
  nuee_rageuse:    m('Nuée Rageuse', 'insecte', 'S', 50, 100, 20, { foe: [{ spa: -1 }, 100] }),
  mandibules:      m('Mandibules', 'insecte', 'P', 60, 100, 20),
  dard_double:     m('Dard Double', 'insecte', 'P', 25, 100, 20, { hits: [2, 2], st: ['psn', 20], nc: 1 }),
  ciseaux_croises: m('Ciseaux Croisés', 'insecte', 'P', 80, 100, 15),
  bourdonnement:   m('Bourdonnement', 'insecte', 'S', 90, 100, 10, { foe: [{ spd: -1 }, 10] }),
  corne_titan:     m('Corne Titan', 'insecte', 'P', 120, 85, 10),
  danse_ailes:     m('Danse des Ailes', 'insecte', 'St', 0, 0, 20, { self: [{ spa: 1, spd: 1, spe: 1 }, 100] }),
  toile_collante:  m('Toile', 'insecte', 'St', 0, 95, 40, { foe: [{ spe: -2 }, 100] }),

  // ── ASTRAL ─────────────────────────────────────────────
  souffle_stellaire: m('Souffle Stellaire', 'astral', 'S', 60, 100, 20, { st: ['par', 30] }),
  griffe_astrale:  m('Griffe Astrale', 'astral', 'P', 80, 100, 15),
  pulsar:          m('Pulsar', 'astral', 'S', 85, 100, 10),
  queue_comete:    m('Queue Comète', 'astral', 'P', 60, 100, 20, { prio: 0 }),
  furie_cosmique:  m('Furie Cosmique', 'astral', 'P', 120, 90, 10, { recoil: 0.25 }),
  pluie_cometes:   m('Pluie de Comètes', 'astral', 'S', 130, 90, 5, { self: [{ spa: -2 }, 100] }),
  danse_celeste:   m('Danse Céleste', 'astral', 'St', 0, 0, 20, { self: [{ atk: 1, spe: 1 }, 100] }),

  // ── SIGNATURES DES LÉGENDAIRES ─────────────────────────
  eclipse_totale:  m('Éclipse Totale', 'ombre', 'S', 120, 95, 5, { foe: [{ spd: -1 }, 30] }),
  aube_eternelle:  m('Aube Éternelle', 'lumiere', 'S', 120, 95, 5, { st: ['brn', 30] }),
  colere_tellurique: m('Colère Tellurique', 'roche', 'P', 120, 95, 5, { ground: 1, nc: 1, flinch: 20 }),
  tempete_celeste: m('Tempête Céleste', 'vent', 'S', 120, 95, 5, { st: ['par', 30] }),
  maree_glaciale:  m('Marée Glaciale', 'eau', 'S', 120, 95, 5, { st: ['frz', 20] }),
  zenith_fulgurant:m('Zénith Fulgurant', 'foudre', 'S', 120, 95, 5, { self: [{ spe: 1 }, 100] }),
  lutte:           m('Lutte', 'normal', 'P', 50, 0, 1, { recoil: 0.25 }),
};


// ═══ ATTAQUES DU BESTIAIRE (board) ════════════════════════════════════
Object.assign(MOVES, {
  // Feu
  flamme_vive:       m('Flamme Vive', 'feu', 'P', 50, 100, 25, { st: ['brn', 10] }),
  brasier_ardent:    m('Brasier Ardent', 'feu', 'S', 75, 100, 15, { st: ['brn', 15] }),
  deflagration_feu:  m('Déflagration', 'feu', 'S', 110, 85, 5, { st: ['brn', 10] }),
  mur_feu:           m('Mur de Feu', 'feu', 'St', 0, 0, 15, { self: [{ def: 1, spd: 1 }, 100] }),
  danse_flamme:      m('Danse Flamme', 'feu', 'S', 35, 85, 15, { trap: 1 }),
  // Eau
  torrent_purifiant: m('Torrent Purifiant', 'eau', 'S', 75, 100, 10, { drain: 0.5 }),
  vague_ecrasante:   m('Vague Écrasante', 'eau', 'P', 90, 100, 10, { nc: 1 }),
  surf:              m('Surf', 'eau', 'S', 90, 100, 15),
  cascade:           m('Cascade', 'eau', 'P', 80, 100, 15, { flinch: 20 }),
  hydrocanon:        m('Hydrocanon', 'eau', 'S', 110, 80, 5),
  // Plante
  spore_toxique:     m('Spore Toxique', 'plante', 'St', 0, 85, 20, { st: ['psn', 100] }),
  soin_vegetal:      m('Soin Végétal', 'plante', 'St', 0, 0, 10, { heal: 0.5 }),
  tempete_verte:     m('Tempête Verte', 'plante', 'S', 95, 100, 10),
  // Électrik
  eclair_foudroyant: m('Éclair Foudroyant', 'foudre', 'S', 80, 100, 15, { st: ['par', 20] }),
  paralysie:         m('Paralysie', 'foudre', 'St', 0, 90, 20, { st: ['par', 100] }),
  // Glace
  grele_glacee:      m('Grêlons', 'glace', 'P', 25, 100, 20, { hits: [2, 5], nc: 1 }),
  // Roche
  tomberoche:        m('Tomberoche', 'roche', 'P', 60, 95, 15, { foe: [{ spe: -1 }, 100], nc: 1 }),
  piege_roc:         m('Piège de Roc', 'roche', 'St', 0, 100, 20, { foe: [{ def: -1, spe: -1 }, 100] }),
  // Sol
  griffe_sable:      m('Griffe de Sable', 'sol', 'P', 40, 100, 30),
  jet_sable:         m('Jet de Sable', 'sol', 'S', 40, 100, 30, { foe: [{ acc: -1 }, 30], ground: 1 }),
  tunnel:            m('Tunnel', 'sol', 'P', 80, 100, 10, { ground: 1 }),
  tombe_sable:       m('Tombe-Sable', 'sol', 'S', 35, 85, 15, { trap: 1, ground: 1 }),
  seisme:            m('Séisme', 'sol', 'P', 100, 100, 10, { ground: 1, nc: 1 }),
  pique_roc:         m('Piqué de Roc', 'sol', 'P', 75, 95, 15, { flinch: 20 }),
  sables_mouvants:   m('Sables Mouvants', 'sol', 'St', 0, 90, 15, { foe: [{ spe: -2 }, 100], trap: 1 }),
  faille:            m('Faille Terrestre', 'sol', 'P', 120, 85, 5, { ground: 1, nc: 1, recoil: 0.25 }),
  // Air
  cyclone:           m('Cyclone', 'vent', 'S', 100, 90, 10, { confuse: 20 }),
  pique:             m('Piqué', 'vent', 'P', 75, 100, 15),
  // Insecte
  dard_venimeux:     m('Dard Venimeux', 'insecte', 'P', 15, 100, 25, { hits: [2, 5], st: ['psn', 20] }),
  essaim:            m('Essaim', 'insecte', 'S', 70, 100, 15),
  danse_chenille:    m('Danse Chenille', 'insecte', 'St', 0, 0, 20, { self: [{ atk: 1, def: 1 }, 100] }),
  volee_aiguilles:   m('Volée d\'Aiguilles', 'insecte', 'P', 25, 95, 20, { hits: [2, 5], nc: 1 }),
  // Poison
  bombe_acide:       m('Bombe Acide', 'toxine', 'S', 40, 100, 20, { foe: [{ spd: -2 }, 100] }),
  corrosion:         m('Corrosion', 'toxine', 'S', 80, 100, 15, { foe: [{ def: -1 }, 30] }),
  // Spectre
  souffle_spectral:  m('Souffle Spectral', 'spectre', 'S', 40, 100, 30),
  ultrason:          m('Ultrason', 'spectre', 'St', 0, 70, 20, { confuse: 100 }),
  spectre_protect:   m('Spectre-Protect', 'spectre', 'St', 0, 0, 10, { protect: 1 }),
  malediction:       m('Malédiction', 'spectre', 'St', 0, 0, 10, { self: [{ atk: 1, def: 1, spe: -1 }, 100] }),
  hantise:           m('Hantise', 'spectre', 'P', 65, 100, 15, { flinch: 20 }),
  requiem:           m('Requiem', 'spectre', 'P', 120, 100, 5, { recoil: 0.33 }),
  // Acier
  gyro_balle:        m('Gyro-Balle', 'metal', 'P', 80, 100, 10),
  tranch_acier:      m('Tranch\'Acier', 'metal', 'P', 70, 100, 15, { crit: 1 }),
  verrouillage:      m('Verrouillage', 'metal', 'St', 0, 100, 20, { foe: [{ spe: -2 }, 100] }),
  // Dragon
  queue_dragon:      m('Queue Dragon', 'dragon', 'P', 45, 100, 25),
  draco_souffle:     m('Draco-Souffle', 'dragon', 'S', 60, 100, 20, { st: ['par', 30] }),
  colere_dragon:     m('Colère du Dragon', 'dragon', 'S', 50, 100, 15),
  griffe_dragon:     m('Griffe Dragon', 'dragon', 'P', 80, 100, 15),
  souffle_ancien:    m('Souffle Ancien', 'dragon', 'S', 85, 100, 10),
  draco_charge:      m('Draco-Charge', 'dragon', 'P', 100, 90, 10, { recoil: 0.25 }),
  draco_meteore:     m('Draco-Météore', 'dragon', 'S', 125, 90, 5, { self: [{ spa: -2 }, 100] }),
  draco_rage:        m('Draco-Rage', 'dragon', 'P', 120, 100, 10, { confuse: 30 }),
  danse_dragon:      m('Danse du Dragon', 'dragon', 'St', 0, 0, 20, { self: [{ atk: 1, spe: 1 }, 100] }),
  ecailles:          m('Écailles', 'dragon', 'St', 0, 0, 20, { self: [{ def: 1, spd: 1 }, 100] }),
  // Ténèbres
  pouvoir_lunaire:   m('Pouvoir Lunaire', 'ombre', 'S', 95, 100, 15, { foe: [{ spa: -1 }, 30] }),
  griffe_nuit:       m('Griffe de Nuit', 'ombre', 'P', 45, 100, 25, { crit: 1 }),
  // Lumière
  soin_divin:        m('Soin Divin', 'lumiere', 'St', 0, 0, 10, { heal: 0.5 }),
  aura_sacree:       m('Aura Sacrée', 'lumiere', 'St', 0, 0, 20, { self: [{ spa: 1, spd: 1 }, 100] }),
  eclat_lumineux:    m('Éclat Lumineux', 'lumiere', 'S', 60, 100, 20, { foe: [{ acc: -1 }, 20] }),
  // Cosmique
  onde_stellaire:    m('Onde Stellaire', 'astral', 'S', 80, 100, 15),
  trou_noir:         m('Trou Noir', 'astral', 'S', 100, 90, 10, { trap: 1 }),
  paradoxe:          m('Paradoxe', 'astral', 'St', 0, 100, 15, { foe: [{ spa: -1, atk: -1 }, 100] }),
  poussiere_etoile:  m('Poussière d\'Étoile', 'astral', 'S', 40, 100, 30),
});

for (const [id, mv] of Object.entries(MOVES)) mv.id = id;

const CAT_LABEL = { P: 'Physique', S: 'Spéciale', St: 'Statut' };
const ST_LABEL = { brn: 'brûler', psn: 'empoisonner', tox: 'empoisonner gravement', par: 'paralyser', slp: 'endormir', frz: 'geler' };
const STAT_FR = { atk: "l'Attaque", def: 'la Défense', spa: "l'Atq. Spé.", spd: 'la Déf. Spé.', spe: 'la Vitesse', acc: 'la Précision', eva: "l'Esquive" };
const WEATHER_FR = { sun: 'un soleil ardent', rain: 'la pluie', sand: 'une tempête de sable', snow: 'la neige' };

export function categoryLabel(cat) { return CAT_LABEL[cat]; }

function statText(obj) {
  return Object.entries(obj).map(([k, v]) => `${v > 0 ? 'augmente' : 'baisse'} ${STAT_FR[k]}${Math.abs(v) > 1 ? ' fortement' : ''}`).join(' et ');
}

/** Description lisible générée à partir des effets. */
export function describeMove(mv) {
  const p = [];
  if (mv.prio > 0) p.push('Frappe en priorité.');
  if (mv.hits) p.push(`Frappe ${mv.hits[0] === mv.hits[1] ? mv.hits[0] : `${mv.hits[0]} à ${mv.hits[1]}`} fois.`);
  if (mv.crit) p.push('Taux de critique élevé.');
  if (mv.charge) p.push('Se charge un tour, sauf sous un soleil ardent.');
  if (mv.st) p.push(mv.st[1] >= 100 ? `Peut ${ST_LABEL[mv.st[0]]} la cible.`.replace('Peut', 'Tente de') : `${mv.st[1]} % de chances de ${ST_LABEL[mv.st[0]]} la cible.`);
  if (mv.flinch) p.push(`${mv.flinch} % de chances d'apeurer la cible.`);
  if (mv.confuse) p.push(mv.confuse >= 100 ? 'Rend la cible confuse.' : `${mv.confuse} % de chances de rendre la cible confuse.`);
  if (mv.foe) p.push(`${mv.foe[1] >= 100 ? '' : `${mv.foe[1]} % de chances : `}${statText(mv.foe[0])} de la cible.`.replace(/^./, (c) => c.toUpperCase()));
  if (mv.self) p.push(`${mv.self[1] >= 100 ? '' : `${mv.self[1]} % de chances : `}${statText(mv.self[0])} du lanceur.`.replace(/^./, (c) => c.toUpperCase()));
  if (mv.drain) p.push(`Récupère ${Math.round(mv.drain * 100)} % des dégâts infligés.`);
  if (mv.recoil) p.push('Le lanceur subit un contrecoup.');
  if (mv.heal) p.push('Restaure la moitié des PV max.');
  if (mv.weather) p.push(`Déclenche ${WEATHER_FR[mv.weather]} pendant 5 tours.`);
  if (mv.protect) p.push('Protège de toutes les attaques ce tour-ci.');
  if (mv.leech) p.push('Draine des PV à la cible chaque tour.');
  if (mv.trap) p.push('Piège la cible et la blesse pendant plusieurs tours.');
  if (mv.rest) p.push('Restaure tous les PV mais endort le lanceur 2 tours.');
  if (mv.haze) p.push('Annule toutes les modifications de stats.');
  if (mv.facade) p.push('Puissance doublée si le lanceur souffre d\'un statut.');
  if (mv.ground) p.push('Sans effet sur le type Vent.');
  if (mv.acc === 0 && mv.cat !== 'St') p.push('Ne rate jamais.');
  return p.join(' ') || (mv.cat === 'St' ? 'Attaque de statut.' : 'Attaque sans effet secondaire.');
}
