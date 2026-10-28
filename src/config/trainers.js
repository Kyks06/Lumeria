/**
 * CLASSES DE DRESSEURS : apparence, argent gagné (× niveau du dernier Lumin) et répliques par défaut.
 * Les dresseurs eux-mêmes sont placés dans les fichiers de cartes (src/maps/*.js).
 */
const SKINS = ['#f3d0b0', '#e8b98f', '#d9a77c', '#c68863', '#8d5a3b', '#f1c9a5', '#6b4430'];

export const TRAINER_CLASSES = {
  gamin:        { name: 'Gamin', pay: 16, ai: 1, look: { kid: true, gender: 'm', top: '#4a9aff', bottom: '#3a4a6a', hairStyle: 'spiky', hat: 'cap' },
    intro: ['Mes Lumins sont les plus forts du quartier !', 'Hé ! Toi ! Combat !', 'Je m\'entraîne tous les jours après l\'école !'], defeat: ['Oh non… je vais le dire à ma mère !', 'Pas juste !', 'Tu triches, c\'est sûr !'] },
  fillette:     { name: 'Fillette', pay: 16, ai: 1, look: { kid: true, gender: 'f', top: '#ff7ab0', bottom: '#ffffff', hairStyle: 'twin', outfit: 'dress' },
    intro: ['Mes Lumins sont trop mignons, tu vas voir !', 'On joue ?'], defeat: ['Ouin… ils ont fait de leur mieux !', 'Tu es trop fort…'] },
  campeur:      { name: 'Campeur', pay: 20, ai: 1, look: { gender: 'm', top: '#6a8a3a', bottom: '#8a6a4a', hairStyle: 'short', hat: 'cap', backpack: true },
    intro: ['Rien de tel qu\'un combat au grand air !', 'Je campe ici depuis trois jours. Je m\'ennuyais !'], defeat: ['Je retourne à ma tente…', 'Bien joué, randonneur !'] },
  pique_niqueuse:{ name: 'Pique-niqueuse', pay: 20, ai: 1, look: { gender: 'f', top: '#ffd23f', bottom: '#3a8a5a', hairStyle: 'ponytail', backpack: true },
    intro: ['Tu veux un sandwich ? Non ? Alors combat !', 'Il fait si beau aujourd\'hui !'], defeat: ['Mon pique-nique est gâché…', 'Tu as de la force !'] },
  randonneur:   { name: 'Randonneur', pay: 32, ai: 1, look: { gender: 'm', top: '#c84a3a', bottom: '#5a4a3a', hairStyle: 'beard', hat: 'bucket', backpack: true, big: true },
    intro: ['Les montagnes forgent les Lumins !', 'Haha ! Encore un aventurier !'], defeat: ['Je dois reprendre mon souffle !', 'Bonne route à toi !'] },
  pecheur:      { name: 'Pêcheur', pay: 32, ai: 1, look: { gender: 'm', top: '#e6a23c', bottom: '#40546b', hairStyle: 'short', hat: 'bucket' },
    intro: ['Ça mord ! Ah non, c\'est toi.', 'Un poisson ou un dresseur, c\'est pareil pour moi !'], defeat: ['Ça ne mord vraiment pas aujourd\'hui…', 'Tu m\'as fait fuir le poisson !'] },
  nageuse:      { name: 'Nageuse', pay: 24, ai: 2, look: { gender: 'f', top: '#3ba7ff', bottom: '#3ba7ff', hairStyle: 'long', outfit: 'swim' },
    intro: ['L\'eau est bonne ! Mais toi, tu vas boire la tasse !', 'Je nage depuis l\'Île Lointaine !'], defeat: ['Je coule…', 'Tu nages comme un poisson !'] },
  nageur:       { name: 'Nageur', pay: 24, ai: 2, look: { gender: 'm', top: '#f1c9a5', bottom: '#ff6a3d', hairStyle: 'short', outfit: 'swim' },
    intro: ['Cent longueurs par jour, ça forge le caractère !'], defeat: ['Glouglou…'] },
  ornithologue: { name: 'Ornithologue', pay: 28, ai: 2, look: { gender: 'm', top: '#8a9a6a', bottom: '#6a5a4a', hairStyle: 'short', hat: 'bucket', glasses: true },
    intro: ['Mes Lumins volants sont les plus élégants !', 'Chut… tu as fait fuir un Aérion rare !'], defeat: ['Mes oiseaux se sont envolés…'] },
  scout:        { name: 'Scout', pay: 24, ai: 2, look: { gender: 'f', top: '#6a8a3a', bottom: '#5a4a3a', hairStyle: 'ponytail', hat: 'beret', scarf: '#ffd23f' },
    intro: ['Toujours prête ! Surtout pour un combat !'], defeat: ['Je n\'étais pas prête…'] },
  mineur:       { name: 'Mineur', pay: 40, ai: 2, look: { gender: 'm', top: '#8a6a3a', bottom: '#3a3a4a', hairStyle: 'beard', hat: 'helmet', big: true },
    intro: ['Je creuse ces galeries depuis vingt ans !', 'Tu cherches des cristaux ? Ils sont à moi !'], defeat: ['Je retourne creuser…', 'Une vraie pépite, ce dresseur !'] },
  karateka:     { name: 'Karatéka', pay: 36, ai: 2, look: { gender: 'm', top: '#ffffff', bottom: '#ffffff', hairStyle: 'bald', outfit: 'gi', belt: '#2a2a2a' },
    intro: ['Hiyaaa ! Mon entraînement est sans faille !', 'Le corps et l\'esprit ne font qu\'un !'], defeat: ['Je dois encore méditer…'] },
  sportive:     { name: 'Sportive', pay: 32, ai: 2, look: { gender: 'f', top: '#ff4f7b', bottom: '#2a2a3a', hairStyle: 'ponytail', headband: true },
    intro: ['Je cours dix kilomètres chaque matin avec mes Lumins !'], defeat: ['Je dois accélérer mon entraînement !'] },
  cycliste:     { name: 'Cycliste', pay: 32, ai: 2, look: { gender: 'm', top: '#ffd23f', bottom: '#2a2a3a', hairStyle: 'short', hat: 'helmet' },
    intro: ['Personne ne roule plus vite que moi !'], defeat: ['J\'ai crevé un pneu…'] },
  medium:       { name: 'Médium', pay: 40, ai: 2, look: { gender: 'f', top: '#6a4a9a', bottom: '#4a3a7a', hairStyle: 'long', outfit: 'robe', elder: true },
    intro: ['Les esprits m\'ont prévenue de ta venue…', 'Je vois… une défaite dans ton avenir.'], defeat: ['Les esprits se sont trompés…'] },
  pyromane:     { name: 'Cracheur de feu', pay: 40, ai: 2, look: { gender: 'm', top: '#c83a2a', bottom: '#2a2a2a', hairStyle: 'spiky', hair: '#ff6a2a' },
    intro: ['Tu sens cette chaleur ? C\'est ma passion qui brûle !'], defeat: ['Mes flammes se sont éteintes…'] },
  skieuse:      { name: 'Skieuse', pay: 36, ai: 2, look: { gender: 'f', top: '#5fd4ff', bottom: '#2a3a5a', hairStyle: 'long', hat: 'beanie', scarf: '#ff4f7b' },
    intro: ['La neige fraîche, c\'est mon terrain !'], defeat: ['J\'ai dérapé…'] },
  montagnard:   { name: 'Montagnard', pay: 40, ai: 2, look: { gender: 'm', top: '#4a6a8a', bottom: '#3a3a3a', hairStyle: 'beard', hat: 'beanie', big: true, scarf: '#c84a3a' },
    intro: ['Le froid ne me fait pas peur. Toi non plus !'], defeat: ['Brrr… quelle défaite glaciale.'] },
  archeologue:  { name: 'Archéologue', pay: 44, ai: 2, look: { gender: 'f', top: '#c8a070', bottom: '#6a5a40', hairStyle: 'bun', hat: 'explorer', glasses: true },
    intro: ['Ces ruines cachent des Lumins anciens !'], defeat: ['Je retourne à mes fouilles…'] },
  scientifique: { name: 'Scientifique', pay: 48, ai: 3, look: { gender: 'm', top: '#ffffff', bottom: '#3a4a6a', hairStyle: 'messy', outfit: 'labcoat', glasses: true },
    intro: ['Mes calculs prédisent ta défaite à 87 % !', 'Pour la science !'], defeat: ['Il y a une erreur dans mes équations…'] },
  eleveuse:     { name: 'Éleveuse', pay: 40, ai: 2, look: { gender: 'f', top: '#7dc860', bottom: '#5a4a3a', hairStyle: 'bun', apron: '#fff6e6' },
    intro: ['J\'ai élevé ces Lumins depuis l\'œuf !'], defeat: ['Ils grandiront encore, tu verras !'] },
  gentleman:    { name: 'Gentleman', pay: 72, ai: 2, look: { gender: 'm', top: '#2a2a3a', bottom: '#2a2a3a', hairStyle: 'short', hat: 'top', elder: true, glasses: true },
    intro: ['Un duel entre gens de bonne compagnie ?'], defeat: ['Ma foi, quelle élégance dans la victoire.'] },
  aristo:       { name: 'Aristo', pay: 72, ai: 2, look: { gender: 'f', top: '#c83a8a', bottom: '#ffffff', hairStyle: 'curly', outfit: 'dress', hair: '#ffd23f' },
    intro: ['Mes Lumins coûtent plus cher que ta maison !'], defeat: ['C\'est… humiliant !'] },
  pro_m:        { name: 'Dresseur Pro', pay: 60, ai: 3, look: { gender: 'm', top: '#3a5aaf', bottom: '#2a2a3a', hairStyle: 'spiky', cape: '#c83a3a' },
    intro: ['Je vise la Ligue du Zénith. Tu es un bon entraînement.'], defeat: ['Tu as l\'étoffe d\'un Champion.'] },
  pro_f:        { name: 'Dresseuse Pro', pay: 60, ai: 3, look: { gender: 'f', top: '#c83a3a', bottom: '#2a2a3a', hairStyle: 'long', cape: '#3a5aaf' },
    intro: ['Je ne perds jamais. Enfin, presque.'], defeat: ['Impressionnant… vraiment.'] },
  sbire:        { name: 'Sbire du Crépuscule', pay: 30, ai: 2, look: { gender: 'm', top: '#2a2040', bottom: '#1a1428', hairStyle: 'short', hat: 'hood', accent: '#c58bff', outfit: 'uniform' },
    intro: ['L\'Ordre du Crépuscule ne tolère aucun témoin !', 'Le jour touche à sa fin. La nuit éternelle approche !', 'Dégage, gamin ! On est occupés !'],
    defeat: ['Le Chef ne va pas être content…', 'Battre en retraite !', 'Tu ne peux pas arrêter la nuit !'] },
  sbire_f:      { name: 'Sbire du Crépuscule', pay: 30, ai: 2, look: { gender: 'f', top: '#2a2040', bottom: '#1a1428', hairStyle: 'ponytail', hat: 'hood', accent: '#c58bff', outfit: 'uniform' },
    intro: ['Encore un héros en herbe ? Quelle plaie.', 'Les Éclats appartiennent à l\'Ordre !'], defeat: ['C\'est pas possible…', 'Je vais le payer cher…'] },
  admin:        { name: 'Admin du Crépuscule', pay: 80, ai: 3, look: { gender: 'm', top: '#1a1030', bottom: '#120a20', hairStyle: 'long', hair: '#c8c8d8', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff' }, intro: [], defeat: [] },
  admin_f:      { name: 'Admin du Crépuscule', pay: 80, ai: 3, look: { gender: 'f', top: '#1a1030', bottom: '#120a20', hairStyle: 'bob', hair: '#ff4f7b', outfit: 'uniform', cape: '#4a2a7a', accent: '#c58bff' }, intro: [], defeat: [] },
  chef:         { name: 'Chef du Crépuscule', pay: 120, ai: 3, look: { gender: 'm', top: '#0e0818', bottom: '#0e0818', hairStyle: 'slick', hair: '#1a1a1a', outfit: 'uniform', cape: '#2a1050', accent: '#ffd23f', big: true }, intro: [], defeat: [] },
  rival:        { name: 'Rival', pay: 40, ai: 3, look: { gender: 'm', top: '#3a7bd5', bottom: '#2a2a3a', hairStyle: 'spiky', hair: '#2a1a4a', scarf: '#ffd23f', backpack: true }, intro: [], defeat: [] },
  leader:       { name: 'Champion d\'Arène', pay: 100, ai: 3, look: {}, intro: [], defeat: [] },
  conseil:      { name: 'Conseil des 4', pay: 120, ai: 3, look: {}, intro: [], defeat: [] },
  champion:     { name: 'Championne', pay: 200, ai: 3, look: {}, intro: [], defeat: [] },
  tour:         { name: 'As de la Tour', pay: 0, ai: 3, look: { gender: 'm', top: '#2a2a3a', bottom: '#2a2a3a', hairStyle: 'short', cape: '#ffd23f' }, intro: ['La Tour ne pardonne aucune erreur.'], defeat: ['Bien joué. Le suivant sera plus fort.'] },
};

/** Apparence complète d'un dresseur (couleur de peau et de cheveux stables selon son identifiant). */
export function trainerLook(cls, id = '', extra = {}) {
  const c = TRAINER_CLASSES[cls] || TRAINER_CLASSES.campeur;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hairs = ['#2a1a12', '#5a3a22', '#8a5a2a', '#c8a050', '#1a1a1a', '#b84a2a', '#e8d8b0'];
  return { skin: SKINS[h % SKINS.length], hair: hairs[(h >>> 3) % hairs.length], ...c.look, ...extra };
}

export function trainerLine(cls, id, kind) {
  const c = TRAINER_CLASSES[cls];
  const list = c?.[kind] || [];
  if (!list.length) return null;
  let h = 7;
  for (const ch of id) h = (h * 17 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
