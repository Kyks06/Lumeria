import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Optimisations de rendu : fusion des maillages statiques par matériau (moins d'appels de dessin)
 * pour les décors, les prototypes instanciés et les pièces des modèles articulés.
 */

/** Prépare une géométrie pour la fusion : non indexée, attributs homogènes, transformée. */
function prepGeometry(geo, matrix, keepColor) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name === 'position' || name === 'normal' || name === 'uv' || (keepColor && name === 'color')) continue;
    g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (keepColor && !g.attributes.color) {
    const c = new Float32Array(g.attributes.position.count * 3).fill(1);
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  }
  g.clearGroups();
  g.applyMatrix4(matrix);
  return g;
}

function mergeBucket(geos) {
  if (geos.length === 1) return geos[0];
  return mergeGeometries(geos, false) || geos[0];
}

/** Regroupe les maillages d'un objet par matériau, dans le repère de `root`. */
export function bucketsByMaterial(root, skip = () => false) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const used = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || skip(o)) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    let b = buckets.get(o.material);
    if (!b) { b = { geos: [], cast: false }; buckets.set(o.material, b); }
    b.geos.push(prepGeometry(o.geometry, m, !!o.material.vertexColors));
    b.cast = b.cast || o.castShadow;
    used.push(o);
  });
  return { buckets, used };
}

/**
 * Fusionne tous les maillages statiques de `root` (sauf ceux contenus dans `keep`)
 * en un maillage par matériau.
 */
export function mergeStatic(root, keep = new Set()) {
  const inKeep = (o) => { for (let p = o; p && p !== root; p = p.parent) if (keep.has(p)) return true; return false; };
  const { buckets, used } = bucketsByMaterial(root, inKeep);
  for (const o of used) o.parent.remove(o);
  for (const [mat, b] of buckets) {
    const mesh = new THREE.Mesh(mergeBucket(b.geos), mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  return root;
}

/**
 * Optimise un modèle articulé : aplatit les groupes non animés puis fusionne,
 * dans chaque articulation, les maillages qui partagent un matériau.
 */
export function optimizeRig(rig) {
  const keep = new Set([rig.root, rig.body, rig.head, rig.tail, ...(rig.ears || []), ...(rig.legs || []), ...(rig.arms || []), ...(rig.wings || []), ...(rig.segments || []), ...(rig.spinners || []), ...(rig.keep || [])].filter(Boolean));
  const flick = new Set((rig.flickers || []).map((f) => f.obj));

  const flatten = (node) => {
    for (const child of [...node.children]) {
      flatten(child);
      if (!child.isMesh && !keep.has(child) && !child.isLight) {
        child.updateMatrix();
        for (const gc of [...child.children]) { gc.applyMatrix4(child.matrix); node.add(gc); }
        node.remove(child);
      }
    }
  };
  flatten(rig.root);

  const nodes = [];
  rig.root.traverse((n) => { if (!n.isMesh) nodes.push(n); });
  for (const node of nodes) {
    const groups = new Map();
    for (const c of node.children) {
      if (!c.isMesh || flick.has(c) || c.children.length) continue;
      if (!groups.has(c.material)) groups.set(c.material, []);
      groups.get(c.material).push(c);
    }
    for (const [mat, list] of groups) {
      if (list.length < 2) continue;
      const geos = list.map((m) => { m.updateMatrix(); return prepGeometry(m.geometry, m.matrix, !!mat.vertexColors); });
      const merged = new THREE.Mesh(mergeBucket(geos), mat);
      merged.castShadow = list.some((m) => m.castShadow);
      merged.receiveShadow = true;
      list.forEach((m) => node.remove(m));
      node.add(merged);
    }
  }
  rig.root.traverse((o) => { if (o.isMesh && o.material?.userData?.noShadow) o.castShadow = false; });
}
