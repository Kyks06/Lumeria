/**
 * APPARENCES DES HABITANTS (PNJ non dresseurs). Les dresseurs utilisent config/trainers.js.
 * npcLook('vieux', 'id-unique') → apparence stable (peau/cheveux selon l'identifiant).
 */
const SKINS = ['#f3d0b0', '#e8b98f', '#d9a77c', '#c68863', '#8d5a3b', '#f1c9a5', '#6b4430'];
const HAIRS = ['#2a1a12', '#5a3a22', '#8a5a2a', '#c8a050', '#1a1a1a', '#b84a2a', '#e8d8b0'];

export const NPC_LOOKS = {
  homme:      { gender: 'm', top: '#5a7aa8', bottom: '#3a3a4a', hairStyle: 'short' },
  femme:      { gender: 'f', top: '#c8553d', bottom: '#3a4a6a', hairStyle: 'long' },
  garconnet:  { kid: true, gender: 'm', top: '#ffd23f', bottom: '#3a5a8a', hairStyle: 'spiky', hat: 'cap', hatColor: '#3a7bd5' },
  fillette:   { kid: true, gender: 'f', top: '#ff9ad5', bottom: '#ffffff', hairStyle: 'twin', outfit: 'dress' },
  vieux:      { gender: 'm', elder: true, top: '#8a7a6a', bottom: '#4a4a4a', hairStyle: 'bald', hair: '#d8d8d8', glasses: true },
  vieille:    { gender: 'f', elder: true, top: '#9a6a9a', bottom: '#5a4a5a', hairStyle: 'bun', hair: '#e0e0e0', glasses: true },
  mere:       { gender: 'f', top: '#7dc860', bottom: '#4a4a6a', hairStyle: 'bun', hair: '#6a3a22', apron: '#fff6e6' },
  professeur: { gender: 'm', top: '#e8e4dc', bottom: '#4a4a5a', hairStyle: 'messy', hair: '#9a9a9a', outfit: 'labcoat', glasses: true, elder: true },
  assistante: { gender: 'f', top: '#e8e4dc', bottom: '#3a4a6a', hairStyle: 'ponytail', hair: '#2a1a12', outfit: 'labcoat', glasses: true },
  infirmiere: { gender: 'f', top: '#ffb8c8', bottom: '#ffffff', hairStyle: 'twin', hair: '#ff7aa2', hat: 'beret', hatColor: '#ffffff', apron: '#ffffff' },
  vendeur:    { gender: 'm', top: '#3a7bd5', bottom: '#2a2a3a', hairStyle: 'short', apron: '#3a7bd5', hat: 'cap', hatColor: '#3a7bd5' },
  vendeuse:   { gender: 'f', top: '#3a7bd5', bottom: '#2a2a3a', hairStyle: 'ponytail', apron: '#3a7bd5' },
  marin:      { gender: 'm', top: '#ffffff', bottom: '#2a3a6a', hairStyle: 'beard', hat: 'cap', hatColor: '#ffffff', big: true },
  pecheur:    { gender: 'm', top: '#e6a23c', bottom: '#40546b', hairStyle: 'beard', hat: 'bucket', elder: true },
  ouvrier:    { gender: 'm', top: '#ff8a3a', bottom: '#3a3a4a', hairStyle: 'short', hat: 'helmet', big: true },
  garde:      { gender: 'm', top: '#2a3a6a', bottom: '#1a2a4a', hairStyle: 'short', hat: 'cap', hatColor: '#1a2a4a', outfit: 'uniform', accent: '#ffd23f' },
  touriste:   { gender: 'f', top: '#ff7aa2', bottom: '#f0e0b0', hairStyle: 'curly', hat: 'bucket', hatColor: '#fff6e6', glasses: true },
  moine:      { gender: 'm', top: '#c8a070', bottom: '#c8a070', hairStyle: 'bald', outfit: 'robe', elder: true },
  pretresse:  { gender: 'f', top: '#ffffff', bottom: '#c83a3a', hairStyle: 'long', hair: '#1a1a1a', outfit: 'robe' },
  savant:     { gender: 'm', top: '#4a3a7a', bottom: '#2a2a3a', hairStyle: 'messy', outfit: 'labcoat', glasses: true },
  eleveur:    { gender: 'm', elder: true, top: '#7dc860', bottom: '#5a4a3a', hairStyle: 'short', hair: '#c8c8c8', apron: '#fff6e6' },
  eleveuse:   { gender: 'f', elder: true, top: '#ffb547', bottom: '#5a4a3a', hairStyle: 'bun', hair: '#d8d8d8', apron: '#fff6e6' },
  sportif:    { gender: 'm', top: '#ff4f4f', bottom: '#2a2a3a', hairStyle: 'spiky', headband: true },
  artiste:    { gender: 'f', top: '#c58bff', bottom: '#2a2a3a', hairStyle: 'bob', hair: '#ff4f7b', hat: 'beret', hatColor: '#2a2a3a' },
  receptionniste: { gender: 'f', top: '#2a3a7a', bottom: '#2a3a7a', hairStyle: 'bun', outfit: 'uniform', accent: '#ffd23f' },
};

function hash(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function npcLook(kind = 'homme', id = '', extra = {}) {
  const h = hash(id + kind);
  const base = NPC_LOOKS[kind] || NPC_LOOKS.homme;
  return { skin: SKINS[h % SKINS.length], hair: HAIRS[(h >>> 3) % HAIRS.length], ...base, ...extra };
}
