import * as THREE from 'three';

/**
 * Aides géométriques : boîtes et plans aux UV « en mètres » (les textures gardent la même échelle
 * quelle que soit la taille de l'objet), toits à deux pans, prismes.
 */
export function texturedBox(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [a, b] = dims[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * (a / tile), uv.getY(i) * (b / tile));
    }
  }
  return g;
}

export function texturedPlane(w, d, tile = 2) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile));
  return g;
}

/** Pignon triangulaire (extrusion), base w, hauteur h, épaisseur t, UV en mètres. */
export function gable(w, h, t, tile = 2) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  return g;
}

/** Groupe d'un toit à deux pans (deux dalles inclinées) posé à la hauteur y. */
export function gableRoof(w, d, rise, overhang, mat, tile = 2.2, thickness = 0.18) {
  const grp = new THREE.Group();
  const half = w / 2 + overhang;
  const slope = Math.hypot(half, rise);
  const ang = Math.atan2(rise, half);
  for (const side of [-1, 1]) {
    const slab = new THREE.Mesh(texturedBox(slope, thickness, d + overhang * 2, tile), mat);
    slab.position.set(side * half / 2, rise / 2, 0);
    slab.rotation.z = -side * ang;
    slab.castShadow = true;
    slab.receiveShadow = true;
    grp.add(slab);
  }
  return grp;
}
