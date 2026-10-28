import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const DRACO_PATH = 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/libs/draco/gltf/';

/**
 * Chargement des modèles .glb avec suivi de progression.
 * Un modèle manquant ou invalide renvoie null : l'appelant utilise alors une forme générée.
 */
export class Assets {
  constructor() {
    this.loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    this.loader.setDRACOLoader(draco);
    this.loader.setMeshoptDecoder(MeshoptDecoder);
    this.store = new Map();
    this.found = [];
    this.missing = [];
  }

  /**
   * @param {{key:string,url:string}[]} manifest
   * @param {(fraction:number,label:string)=>void} onProgress
   */
  async load(manifest, onProgress = () => {}) {
    const total = manifest.length || 1;
    const partial = new Map();
    let done = 0;
    const report = (label) => {
      let sum = done;
      partial.forEach((v) => { sum += v; });
      onProgress(Math.min(1, sum / total), label);
    };
    await Promise.all(manifest.map((entry) => this.loadOne(entry, (f) => {
      partial.set(entry.key, f);
      report(entry.url);
    }).then((gltf) => {
      partial.delete(entry.key);
      done++;
      this.store.set(entry.key, gltf);
      (gltf ? this.found : this.missing).push(entry.url);
      report(entry.url);
    })));
    if (this.missing.length) {
      console.info(`[Lumeria] ${this.missing.length} modèle(s) absent(s), formes de remplacement utilisées :`, this.missing);
    }
  }

  loadOne(entry, onFileProgress) {
    return new Promise((resolve) => {
      this.loader.load(
        entry.url,
        (gltf) => {
          gltf.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = 1;
            }
          });
          resolve(gltf);
        },
        (xhr) => { if (xhr.lengthComputable && xhr.total) onFileProgress(xhr.loaded / xhr.total * 0.95); },
        () => resolve(null),
      );
    });
  }

  /** Charge un modèle à la demande (une seule fois) ; résout même si le fichier est absent. */
  ensure(key, url) {
    if (this.store.has(key)) return Promise.resolve(this.store.get(key));
    if (!this.pending) this.pending = new Map();
    if (this.pending.has(key)) return this.pending.get(key);
    const p = this.loadOne({ key, url }, () => {}).then((gltf) => {
      this.store.set(key, gltf);
      this.pending.delete(key);
      (gltf ? this.found : this.missing).push(url);
      return gltf;
    });
    this.pending.set(key, p);
    return p;
  }

  get(key) { return this.store.get(key) || null; }
  has(key) { return !!this.store.get(key); }

  /**
   * Clone un modèle chargé (squelette compris) et le normalise à la taille voulue.
   * @returns {{object:THREE.Group, model:THREE.Object3D, animations:THREE.AnimationClip[]}|null}
   */
  instantiate(key, opts = {}) {
    const gltf = this.get(key);
    if (!gltf) return null;
    const model = skeletonClone(gltf.scene);
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      }
    });
    const object = normalizeObject(model, opts);
    return { object, model, animations: gltf.animations || [] };
  }
}

/** Met un objet à l'échelle (hauteur ou diamètre cible), pieds à y=0, centré en x/z. */
export function normalizeObject(model, { height, size } = {}) {
  const wrapper = new THREE.Group();
  wrapper.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const dims = box.getSize(new THREE.Vector3());
  let s = 1;
  if (height && dims.y > 0) s = height / dims.y;
  else if (size) s = size / Math.max(dims.x, dims.z, 0.0001);
  model.scale.multiplyScalar(s);
  model.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(model);
  const center = box2.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box2.min.y;
  return wrapper;
}
