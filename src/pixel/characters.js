import { Px } from './Px.js';
import { shade, outlineOf, mixHex } from './color.js';

/**
 * PERSONNAGES EN PIXEL ART (16 × 24, 4 directions × 3 images de marche) construits « en papier découpé »
 * à partir d'une apparence : peau, cheveux (coupe), haut, bas, chapeau, tenue, accessoires.
 * Directions : 0 bas, 1 gauche, 2 droite, 3 haut. Images : 0 debout, 1 pas gauche, 2 pas droit.
 * Images spéciales : vélo (2 par direction), surf (assis), pêche.
 */
export const FW = 16, FH = 24;

const R3 = (c) => [shade(c, -0.38), c, shade(c, 0.3)];
const EYE = '#1c1a2a';

function look3(look) {
  const L = { skin: '#f1c9a5', hair: '#3a2a1e', top: '#5a7aa8', bottom: '#3a3a4a', shoes: '#4a3a30', hatColor: null, ...look };
  if (!L.hatColor) L.hatColor = L.accent || shade(L.top, -0.15);
  return L;
}

/**
 * Dessine un personnage dans un tampon (ox, oy = coin haut-gauche de la case 16×24).
 * pose : { dir, step (-1 gauche / 0 / 1 droite), bike, sit, fish, arms }
 */
export function drawCharacter(px, ox, oy, look, pose = {}) {
  const L = look3(look);
  const dir = pose.dir ?? 0, step = pose.step ?? 0;
  const kid = !!L.kid, big = !!L.big;
  const S = R3(L.skin), Hc = R3(L.hair), T = R3(L.top), B = R3(L.bottom), Sh = R3(L.shoes || '#4a3a30');
  const set = (x, y, c) => px.set(ox + x, oy + y, c);
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  // repères verticaux
  const dy = kid ? 3 : 0;               // les enfants sont plus petits
  const headTop = 1 + dy, headH = 11;
  const torsoY = headTop + headH, torsoH = kid ? 4 : 6;
  const legY = torsoY + torsoH;
  const feetY = 22;
  const legH = feetY - legY;
  const tx0 = big ? 3 : 4, tw = big ? 10 : 8;
  const side = dir === 1 || dir === 2;
  const flip = dir === 2;
  const X = (x) => (flip ? 15 - x : x); // miroir pour la droite
  const sX = (x, y, c) => set(X(x), y, c);
  const sRect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sX(x + i, y + j, c); };
  const bob = step !== 0 && !pose.bike && !pose.sit ? 0 : 0;
  const cape = L.cape;
  const robe = L.outfit === 'robe', dress = L.outfit === 'dress', coat = L.outfit === 'labcoat', swim = L.outfit === 'swim', gi = L.outfit === 'gi';
  const topC = gi ? R3('#f4f2ea') : T;
  const botC = gi ? R3('#f0eee6') : robe ? T : B;

  // ── Cape (derrière) ──
  if (cape && !pose.sit) {
    const C = R3(cape);
    if (dir === 3) sRect(tx0 - 1, torsoY, tw + 2, legH + torsoH - 1, C[1]);
    else if (side) sRect(10, torsoY + 1, 3, legH + torsoH - 2, C[0]);
    else { sRect(tx0 - 1, torsoY + 1, 1, torsoH + legH - 3, C[0]); sRect(tx0 + tw, torsoY + 1, 1, torsoH + legH - 3, C[0]); }
  }
  // ── Jambes ──
  if (pose.sit) {
    // assis (surf) : jambes repliées vers l'avant
    if (!side) { rect(5, legY, 6, 2, botC[1]); rect(5, legY + 2, 2, 1, Sh[1]); rect(9, legY + 2, 2, 1, Sh[1]); }
    else { sRect(4, legY, 6, 2, botC[1]); sRect(3, legY + 1, 2, 2, Sh[1]); }
  } else if (pose.bike) {
    if (!side) { rect(5, legY, 2, legH - (step > 0 ? 2 : 0), botC[1]); rect(9, legY, 2, legH - (step < 0 ? 2 : 0), botC[0]); }
    else { sRect(6, legY, 3, legH - 1, botC[1]); sRect(step > 0 ? 4 : 8, legY + legH - 2, 3, 2, Sh[1]); }
  } else if (!side) {
    const lLift = step < 0 ? 1 : 0, rLift = step > 0 ? 1 : 0;
    const legC = (swim || dress) ? S : botC;
    if (!robe) {
      rect(5, legY, 3, legH - 1 - lLift, legC[1]); rect(5, legY, 1, legH - 1 - lLift, legC[2]);
      rect(8, legY, 3, legH - 1 - rLift, legC[1]); rect(10, legY, 1, legH - 1 - rLift, legC[0]);
      rect(5, feetY - 1 - lLift, 3, 2, Sh[1]); rect(8, feetY - 1 - rLift, 3, 2, Sh[1]);
      set(5, feetY - lLift, Sh[2]); set(10, feetY - rLift, Sh[0]);
    } else {
      rect(5, feetY - 1 - lLift, 3, 2, Sh[1]); rect(8, feetY - 1 - rLift, 3, 2, Sh[1]);
    }
  } else {
    // profil : enjambée
    const legC = (swim || dress) ? S : botC;
    const front = step === 0 ? 0 : step;
    if (!robe) {
      if (front === 0) { sRect(6, legY, 4, legH - 1, legC[1]); sRect(9, legY, 1, legH - 1, legC[0]); sRect(5, feetY - 1, 5, 2, Sh[1]); }
      else {
        sRect(4, legY, 3, legH - 1, legC[front > 0 ? 1 : 0]); sRect(3, feetY - 1, 4, 2, Sh[front > 0 ? 1 : 0]);
        sRect(8, legY, 3, legH - 2, legC[front > 0 ? 0 : 1]); sRect(8, feetY - 2, 4, 2, Sh[front > 0 ? 0 : 1]);
      }
    } else sRect(5, feetY - 1, 6, 2, Sh[1]);
  }
  // ── Tronc ──
  const tY = torsoY;
  if (!side) {
    rect(tx0, tY, tw, torsoH, topC[1]);
    rect(tx0, tY, 1, torsoH, topC[2]); rect(tx0 + tw - 1, tY, 1, torsoH, topC[0]);
    if (swim) { rect(tx0, tY, tw, torsoH, S[1]); rect(tx0, tY + torsoH - 2, tw, 2, T[1]); if (L.gender === 'f') rect(tx0 + 1, tY + 1, tw - 2, 2, T[1]); }
    if (coat) { rect(tx0 + 3, tY + 1, tw - 6, torsoH - 1, R3(L.inner || '#5a7aa8')[1]); }
    if (L.apron && dir === 0) { const A = R3(L.apron); rect(tx0 + 1, tY + 2, tw - 2, torsoH - 1, A[1]); rect(tx0 + 1, tY + 2, tw - 2, 1, A[2]); }
    if (L.outfit === 'uniform' && L.accent) { const A = R3(L.accent); rect(tx0, tY + torsoH - 1, tw, 1, A[0]); set(7, tY + 1, A[1]); set(8, tY + 1, A[1]); }
    if (gi || L.belt) rect(tx0, tY + torsoH - 1, tw, 1, L.belt || '#2a2a2a');
    if (dir === 3 && L.backpack) { const P = R3(L.packColor || '#ffd23f'); rect(tx0 + 1, tY, tw - 2, torsoH, P[1]); rect(tx0 + 1, tY, tw - 2, 1, P[2]); rect(tx0 + 1, tY + torsoH - 1, tw - 2, 1, P[0]); }
    if (dir === 0 && L.backpack) { const P = R3(L.packColor || '#ffd23f'); set(tx0 + 1, tY, P[0]); set(tx0 + 1, tY + 1, P[0]); set(tx0 + tw - 2, tY, P[0]); set(tx0 + tw - 2, tY + 1, P[0]); }
    // jupe / robe / blouse longue
    if (dress) { for (let j = 0; j < 4; j++) rect(tx0 - (j > 1 ? 1 : 0), legY + j - 1, tw + (j > 1 ? 2 : 0), 1, topC[j === 3 ? 0 : 1]); }
    if (coat) { rect(tx0, legY, 3, legH - 3, topC[1]); rect(tx0 + tw - 3, legY, 3, legH - 3, topC[0]); }
    if (robe) { for (let j = 0; j < legH; j++) rect(tx0 - (j > 2 ? 1 : 0), legY + j - 1, tw + (j > 2 ? 2 : 0), 1, topC[j > legH - 2 ? 0 : 1]); }
  } else {
    sRect(5, tY, 6, torsoH, topC[1]); sRect(5, tY, 1, torsoH, topC[2]); sRect(10, tY, 1, torsoH, topC[0]);
    if (swim) sRect(5, tY, 6, torsoH - 2, S[1]);
    if (L.backpack) { const P = R3(L.packColor || '#ffd23f'); sRect(10, tY, 3, torsoH - 1, P[1]); sRect(12, tY, 1, torsoH - 1, P[0]); sRect(10, tY, 3, 1, P[2]); }
    if (L.apron) { const A = R3(L.apron); sRect(4, tY + 2, 2, torsoH - 1, A[1]); }
    if (gi || L.belt) sRect(5, tY + torsoH - 1, 6, 1, L.belt || '#2a2a2a');
    if (dress) for (let j = 0; j < 4; j++) sRect(4, legY + j - 1, 8, 1, topC[j === 3 ? 0 : 1]);
    if (coat) sRect(5, legY, 6, legH - 3, topC[1]);
    if (robe) for (let j = 0; j < legH; j++) sRect(4, legY + j - 1, 8, 1, topC[j > legH - 2 ? 0 : 1]);
  }
  // ── Bras ──
  const armC = swim ? S : topC;
  const sw = pose.bike || pose.sit ? 0 : step;
  if (!side) {
    const ax0 = tx0 - 1, ax1 = tx0 + tw;
    const la = sw > 0 ? 1 : 0, ra = sw < 0 ? 1 : 0;
    if (pose.bike) { rect(ax0, tY + 1, 1, 3, armC[1]); rect(ax1, tY + 1, 1, 3, armC[0]); set(ax0, tY + 4, S[1]); set(ax1, tY + 4, S[1]); }
    else {
      rect(ax0, tY, 1, torsoH - 1 - la, armC[1]); set(ax0, tY + torsoH - 1 - la, S[1]);
      rect(ax1, tY, 1, torsoH - 1 - ra, armC[0]); set(ax1, tY + torsoH - 1 - ra, S[0]);
    }
  } else {
    if (pose.fish) { sRect(3, tY + 1, 4, 2, armC[1]); sRect(2, tY + 1, 1, 2, S[1]); }
    else if (pose.bike) { sRect(4, tY + 1, 3, 2, armC[1]); sRect(3, tY + 2, 1, 1, S[1]); }
    else {
      const ax = sw === 0 ? 7 : sw > 0 ? 6 : 8;
      sRect(ax, tY + 1, 2, torsoH - 2, armC[0]); sRect(ax, tY + torsoH - 1, 2, 1, S[1]);
    }
  }
  // ── Écharpe ──
  if (L.scarf) { const C = R3(L.scarf); if (!side) { rect(tx0, tY, tw, 1, C[1]); if (dir === 0) set(tx0 + tw - 2, tY + 1, C[0]); else rect(tx0 + 2, tY + 1, 2, 3, C[1]); } else { sRect(5, tY, 6, 1, C[1]); sRect(11, tY + 1, 2, 2, C[0]); } }

  // ── Tête ──
  const hx = 3, hw = 10, hy = headTop;
  // visage / crâne
  for (let j = 0; j < headH; j++) for (let i = 0; i < hw; i++) {
    const corner = (j === 0 || j === headH - 1) && (i === 0 || i === hw - 1);
    if (corner) continue;
    if (j === headH - 1 && (i === 1 || i === hw - 2)) continue;
    set(hx + i, hy + j, S[1]);
  }
  if (!side && dir === 0) { for (let j = 1; j < headH - 1; j++) set(hx, hy + j, S[2]); for (let j = 2; j < headH - 1; j++) set(hx + hw - 1, hy + j, S[0]); for (let i = 2; i < hw - 2; i++) set(hx + i, hy + headH - 1, S[0]); }
  // cheveux
  const hairStyle = L.hairStyle || 'short';
  const HC = Hc;
  const hairRows = (rows) => {
    // rows : liste de [y, x0, x1] relatifs à la tête (miroir appliqué en profil)
    for (const [j, a, b, c] of rows) for (let i = a; i <= b; i++) (side ? sX : set)(hx + i, hy + j, c || HC[1]);
  };
  const H1 = HC[1], H0 = HC[0], H2 = HC[2];
  if (hairStyle !== 'bald') {
    if (dir === 3) {
      // de dos : toute la tête couverte
      for (let j = 0; j < headH - (hairStyle === 'long' || hairStyle === 'ponytail' || hairStyle === 'twin' ? 0 : 2); j++) for (let i = 0; i < hw; i++) {
        if ((j === 0) && (i === 0 || i === hw - 1)) continue;
        set(hx + i, hy + j, j < 2 ? H2 : (i === hw - 1 || j > headH - 4) ? H0 : H1);
      }
      if (hairStyle === 'long' || hairStyle === 'ponytail') { rect(hx + 2, hy + headH, hw - 4, hairStyle === 'long' ? 3 : 4, H1); }
      if (hairStyle === 'twin') { rect(hx - 1, hy + 4, 2, 6, H1); rect(hx + hw - 1, hy + 4, 2, 6, H0); }
      if (hairStyle === 'bun') { rect(hx + 3, hy - 1, 4, 2, H1); }
    } else if (!side) {
      hairRows([[0, 1, hw - 2, H2], [1, 0, hw - 1, H2], [2, 0, hw - 1], [3, 0, hw - 1]]);
      // frange
      if (hairStyle === 'spiky') { hairRows([[4, 0, 2], [4, 4, 5], [4, 7, hw - 1], [5, 0, 0], [5, hw - 1, hw - 1]]); set(hx + 2, hy - 1, H2); set(hx + 5, hy - 1, H2); set(hx + 8, hy - 1, H2); set(hx + 3, hy, H2); set(hx + 6, hy, H2); }
      else if (hairStyle === 'slick') hairRows([[4, 0, 1], [4, hw - 2, hw - 1]]);
      else if (hairStyle === 'messy' || hairStyle === 'curly') { hairRows([[4, 0, 3], [4, 6, hw - 1], [5, 0, 1], [5, hw - 2, hw - 1]]); set(hx - 1, hy + 2, H1); set(hx + hw, hy + 2, H0); set(hx + 4, hy - 1, H2); }
      else hairRows([[4, 0, 2], [4, 5, hw - 1], [5, 0, 0], [5, hw - 1, hw - 1]]);
      // côtés
      const sideLen = hairStyle === 'long' ? 13 : hairStyle === 'bob' ? 9 : hairStyle === 'twin' || hairStyle === 'ponytail' ? 7 : 6;
      for (let j = 4; j < Math.min(sideLen, headH + 3); j++) { set(hx, hy + j, H1); set(hx + hw - 1, hy + j, H0); if (hairStyle === 'long' || hairStyle === 'bob') { set(hx - (j > 6 ? 1 : 0), hy + j, H1); } }
      if (hairStyle === 'twin') { rect(hx - 2, hy + 4, 2, 7, H1); rect(hx + hw, hy + 4, 2, 7, H0); set(hx - 2, hy + 4, H2); }
      if (hairStyle === 'bun') { rect(hx + 3, hy - 2, 4, 2, H1); set(hx + 3, hy - 2, H2); }
      if (hairStyle === 'curly') { set(hx - 1, hy + 4, H1); set(hx + hw, hy + 4, H0); set(hx - 1, hy + 6, H1); set(hx + hw, hy + 6, H0); }
    } else {
      // profil (tourné vers la gauche ; miroir pour la droite)
      hairRows([[0, 1, hw - 2, H2], [1, 0, hw - 1, H2], [2, 0, hw - 1], [3, 0, hw - 1], [4, 2, hw - 1], [5, 4, hw - 1], [6, 5, hw - 1], [7, 6, hw - 1, H0]]);
      if (hairStyle === 'spiky') { sX(hx + 3, hy - 1, H2); sX(hx + 6, hy - 1, H2); sX(hx + 9, hy, H2); hairRows([[4, 0, 1]]); }
      if (hairStyle === 'long' || hairStyle === 'bob') hairRows([[8, 6, hw - 1, H0], [9, 6, hw - 1, H0], [10, 7, hw - 1, H0]].concat(hairStyle === 'long' ? [[11, 7, hw - 1, H0], [12, 7, hw - 2, H0]] : []));
      if (hairStyle === 'ponytail') { sRect(hx + hw, hy + 4, 2, 6, H1); sX(hx + hw + 1, hy + 10, H0); }
      if (hairStyle === 'twin') sRect(hx + hw - 2, hy + 6, 2, 6, H1);
      if (hairStyle === 'bun') sRect(hx + 6, hy - 2, 4, 2, H1);
    }
  } else if (dir !== 3) {
    // chauve : couronne de cheveux sur les côtés
    if (!side) { for (let j = 4; j < 8; j++) { set(hx, hy + j, H1); set(hx + hw - 1, hy + j, H0); } set(hx + 3, hy + 1, S[2]); set(hx + 4, hy + 1, S[2]); }
    else { hairRows([[4, 6, hw - 1], [5, 6, hw - 1], [6, 7, hw - 1]]); }
  } else { for (let j = 4; j < 8; j++) for (let i = 0; i < hw; i++) set(hx + i, hy + j, H1); }
  // barbe
  if (hairStyle === 'beard' && dir !== 3) {
    if (!side) { for (let i = 1; i < hw - 1; i++) { set(hx + i, hy + headH - 2, H1); set(hx + i, hy + headH - 1, H0); } set(hx, hy + headH - 3, H1); set(hx + hw - 1, hy + headH - 3, H0); }
    else { for (let i = 1; i < 6; i++) { sX(hx + i, hy + headH - 2, H1); sX(hx + i, hy + headH - 1, H0); } }
  }
  // yeux
  if (dir === 0) {
    const ey = hy + 7;
    set(hx + 2, ey, EYE); set(hx + 2, ey + 1, EYE); set(hx + 7, ey, EYE); set(hx + 7, ey + 1, EYE);
    if (!kid && L.gender === 'f') { set(hx + 1, ey - 1, EYE); set(hx + 8, ey - 1, EYE); }
    if (L.glasses) { for (let i = 1; i <= 8; i++) set(hx + i, ey - 1, i === 4 || i === 5 ? '#5a5a6a' : '#3a3a4a'); set(hx + 2, ey, '#bfe6ff'); set(hx + 7, ey, '#bfe6ff'); }
    if (kid || L.gender === 'f') { set(hx + 1, ey + 2, shade(L.skin, -0.12)); set(hx + 8, ey + 2, shade(L.skin, -0.12)); }
    if (L.headband) { const C = R3(L.headband === true ? '#ff4f4f' : L.headband); for (let i = 0; i < hw; i++) set(hx + i, hy + 4, C[1]); }
  } else if (side) {
    const ey = hy + 7;
    sX(hx + 1, ey, EYE); sX(hx + 1, ey + 1, EYE);
    if (L.glasses) { sX(hx, ey - 1, '#3a3a4a'); sX(hx + 1, ey - 1, '#3a3a4a'); sX(hx + 2, ey - 1, '#3a3a4a'); }
    sX(hx - 1, ey + 2, S[1]); // nez
    if (L.headband) { const C = R3(L.headband === true ? '#ff4f4f' : L.headband); for (let i = 0; i < hw; i++) sX(hx + i, hy + 4, C[1]); }
  }
  // ── Chapeaux ──
  const hat = L.hat;
  if (hat) {
    const C = R3(L.hatColor);
    const hrow = (j, a, b, c) => { for (let i = a; i <= b; i++) (side ? sX : set)(hx + i, hy + j, c); };
    if (hat === 'cap') {
      hrow(-1, 2, hw - 3, C[2]); hrow(0, 1, hw - 2, C[2]); hrow(1, 0, hw - 1, C[1]); hrow(2, 0, hw - 1, C[1]); hrow(3, 0, hw - 1, C[0]);
      if (dir === 0) { hrow(4, 1, hw - 2, shade(L.hatColor, -0.5)); set(hx + 4, hy + 1, '#ffffff'); set(hx + 5, hy + 1, '#ffffff'); }
      else if (side) { for (let i = -3; i <= 1; i++) sX(hx + i, hy + 3, C[0]); }
      else hrow(4, 3, hw - 4, C[0]);
    } else if (hat === 'beret') { hrow(-1, 2, hw - 1, C[2]); hrow(0, 0, hw, C[1]); hrow(1, 0, hw - 1, C[1]); hrow(2, 0, hw - 1, C[0]); }
    else if (hat === 'bucket' || hat === 'explorer') { hrow(-1, 2, hw - 3, C[2]); hrow(0, 1, hw - 2, C[1]); hrow(1, 1, hw - 2, C[1]); if (hat === 'explorer') hrow(2, 1, hw - 2, '#5a3a22'); else hrow(2, 1, hw - 2, C[1]); hrow(3, -2, hw + 1, C[0]); }
    else if (hat === 'helmet') { hrow(-1, 2, hw - 3, C[2]); hrow(0, 1, hw - 2, C[2]); hrow(1, 0, hw - 1, C[1]); hrow(2, 0, hw - 1, C[1]); hrow(3, 0, hw - 1, C[1]); hrow(4, -1, hw, C[0]); if (dir === 0) { set(hx + 4, hy, '#fff6a8'); set(hx + 5, hy, '#fff6a8'); } }
    else if (hat === 'hood') {
      for (let j = -1; j < (dir === 3 ? headH : 7); j++) for (let i = -1; i <= hw; i++) {
        if (j === -1 && (i < 1 || i > hw - 2)) continue;
        if (dir === 0 && j >= 3 && i >= 1 && i <= hw - 2) continue;
        if (side && j >= 3 && i <= 4) continue;
        (side ? sX : set)(hx + i, hy + j, j < 1 ? C[2] : (i === hw || i === hw - 1) ? C[0] : C[1]);
      }
      if (dir === 0 && L.accent) { set(hx + 4, hy + 1, L.accent); set(hx + 5, hy + 1, L.accent); }
    }
    else if (hat === 'beanie') { hrow(-2, 4, 5, '#ffffff'); hrow(-1, 2, hw - 3, C[2]); hrow(0, 1, hw - 2, C[1]); hrow(1, 0, hw - 1, C[1]); hrow(2, 0, hw - 1, C[1]); hrow(3, 0, hw - 1, C[0]); for (let i = 0; i < hw; i += 2) (side ? sX : set)(hx + i, hy + 3, C[2]); }
    else if (hat === 'top') { for (let j = -5; j < 1; j++) hrow(j, 2, hw - 3, j === -5 ? C[2] : C[1]); hrow(0, 2, hw - 3, '#c83a3a'); hrow(1, -1, hw, C[0]); }
  }
  return px;
}

/** Feuille de sprites : 3 colonnes (debout, pas G, pas D) × 4 lignes (bas, gauche, droite, haut). */
export function characterSheet(look) {
  const px = new Px(FW * 3, FH * 4);
  for (let d = 0; d < 4; d++) for (let f = 0; f < 3; f++) drawCharacter(px, f * FW, d * FH, look, { dir: d, step: f === 0 ? 0 : f === 1 ? -1 : 1 });
  outlineFrames(px, 3, 4);
  return px;
}

/** Images spéciales : vélo (2 × 4), surf (1 × 4), pêche (1 × 4). */
export function extraSheet(look) {
  const px = new Px(FW * 4, FH * 4);
  for (let d = 0; d < 4; d++) {
    drawBike(px, 0, d * FH, d, 0); drawCharacter(px, 0, d * FH - 2, look, { dir: d, bike: true, step: -1 });
    drawBike(px, FW, d * FH, d, 1); drawCharacter(px, FW, d * FH - 2, look, { dir: d, bike: true, step: 1 });
    drawCharacter(px, FW * 2, d * FH - 3, look, { dir: d, sit: true });
    drawCharacter(px, FW * 3, d * FH, look, { dir: d, fish: true });
  }
  outlineFrames(px, 4, 4);
  return px;
}

function drawBike(px, ox, oy, dir, f) {
  const set = (x, y, c) => px.set(ox + x, oy + y, c);
  const red = '#e83a3a', dk = '#2a2a32', mt = '#a8aab4';
  if (dir === 0 || dir === 3) {
    for (let j = 15; j < 24; j++) set(7, j, dk), set(8, j, dk);
    set(7, 23 - (f ? 1 : 0), mt);
    for (let i = 4; i < 12; i++) set(i, dir === 0 ? 15 : 14, mt);
    set(7, 17, red); set(8, 17, red); set(7, 18, red); set(8, 18, red);
  } else {
    const wheel = (cx) => { for (let a = 0; a < 16; a++) { const x = Math.round(cx + Math.cos(a / 16 * 6.283) * 3), y = Math.round(20 + Math.sin(a / 16 * 6.283) * 3); set(x, y, dk); } set(cx, 20, mt); };
    wheel(3); wheel(12);
    for (let i = 3; i <= 12; i++) set(i, 18, red);
    set(6, 17, red); set(7, 16, red); set(10, 16, mt); set(11, 15, mt);
    if (dir === 2) { /* miroir géré par la position des roues symétrique */ }
  }
}

function outlineFrames(px, cols, rows) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const f = new Px(FW, FH);
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const i = px.i(c * FW + x, r * FH + y); if (px.d[i + 3]) f.set(x, y, [px.d[i], px.d[i + 1], px.d[i + 2]]); }
    f.outline(null, { k: 0.82 });
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const i = f.i(x, y), j = px.i(c * FW + x, r * FH + y); px.d[j] = f.d[i]; px.d[j + 1] = f.d[i + 1]; px.d[j + 2] = f.d[i + 2]; px.d[j + 3] = f.d[i + 3]; }
  }
}

/** Monture de surf (le Lumin vu du dessus, couleur du Lumin Eau de tête). */
export function surfMount(color = '#3ba7ff', frame = 0) {
  const px = new Px(32, 24);
  const C = [shade(color, -0.5), shade(color, -0.2), color, shade(color, 0.35)];
  px.ellipse(16, 14 + (frame ? 1 : 0), 11, 7, null, (x, y, nx, ny) => px.set(x, y, C[nx + ny < -0.6 ? 3 : nx + ny < 0.4 ? 2 : 1]));
  px.ellipse(16, 8 + (frame ? 1 : 0), 6, 4, null, (x, y, nx, ny) => px.set(x, y, C[ny < -0.2 ? 3 : 2]));
  px.set(13, 7 + frame, '#1c1a2a'); px.set(19, 7 + frame, '#1c1a2a');
  px.outline(null, { k: 0.8 });
  return px.toCanvas();
}

export { mixHex, outlineOf };
