import * as THREE from 'three';
import { mulberry32 } from '../core/utils.js';

/**
 * Herbe instanciée animée par le vent (shader injecté dans un MeshStandardMaterial PBR).
 * Les brins s'écartent aussi au passage du joueur.
 */
export class GrassSystem {
  constructor() {
    this.uniforms = {
      uTime: { value: 0 },
      uWind: { value: 1 },
      uPlayer: { value: new THREE.Vector3(9999, 0, 9999) },
    };
    this.geometry = createTuftGeometry();
    this.customMap = null;
    this.meshes = [];
  }

  /** Remplace la touffe générée par la géométrie d'un modèle grass.glb (normalisé à 1 m). */
  useModel(object) {
    let found = null;
    object.updateMatrixWorld(true);
    object.traverse((o) => { if (!found && o.isMesh) found = o; });
    if (!found) return;
    const geo = found.geometry.clone().applyMatrix4(found.matrixWorld);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const hgt = Math.max(0.001, bb.max.y - bb.min.y);
    geo.translate(0, -bb.min.y, 0);
    geo.scale(1 / hgt, 1 / hgt, 1 / hgt);
    if (!geo.attributes.color) {
      const n = geo.attributes.position.count;
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const y = geo.attributes.position.getY(i);
        const v = 0.55 + 0.45 * y;
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    this.geometry = geo;
    this.customMap = found.material?.map || null;
  }

  createMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, metalness: 0,
      map: this.customMap, alphaTest: this.customMap ? 0.5 : 0,
    });
    const U = this.uniforms;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = U.uTime;
      shader.uniforms.uWind = U.uWind;
      shader.uniforms.uPlayer = U.uPlayer;
      shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\nuniform vec3 uPlayer;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', /* glsl */`
        vec4 mvPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        vec4 wp = modelMatrix * mvPosition;
        float k = clamp( position.y, 0.0, 1.0 );
        k *= k;
        float gust = sin( uTime * 0.55 + wp.x * 0.045 + wp.z * 0.03 ) * 0.5 + 0.5;
        float w = sin( uTime * 1.7 + wp.x * 0.23 + wp.z * 0.19 ) * 0.55
                + sin( uTime * 2.9 + wp.x * 0.61 - wp.z * 0.37 ) * 0.22;
        vec2 windDir = normalize( vec2( 1.0, 0.45 ) );
        wp.xz += windDir * ( w + gust * 0.9 ) * uWind * 0.2 * k;
        vec2 d = wp.xz - uPlayer.xz;
        float dist = length( d );
        float push = ( 1.0 - smoothstep( 0.0, 1.25, dist ) ) * k;
        wp.xz += ( d / max( dist, 0.0001 ) ) * push * 0.55;
        wp.y -= push * 0.22;
        mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
      `);
    };
    mat.customProgramCacheKey = () => 'lumeria-grass';
    return mat;
  }

  /**
   * Crée un champ d'herbe découpé en tuiles (pour un frustum culling efficace).
   * @param sampler (x,z) => {y, scale} | null  — renvoie null pour ne rien planter
   */
  createField({ minX, maxX, minZ, maxZ, density, sampler, colorA, colorB, chunk = 24, seed = 1 }) {
    const group = new THREE.Group();
    const mat = this.createMaterial();
    const cA = new THREE.Color(colorA), cB = new THREE.Color(colorB), col = new THREE.Color();
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const random = mulberry32(Math.abs(Math.floor(seed * 7919)) + 17);
    for (let cx = minX; cx < maxX; cx += chunk) {
      for (let cz = minZ; cz < maxZ; cz += chunk) {
        const w = Math.min(chunk, maxX - cx), d = Math.min(chunk, maxZ - cz);
        const target = Math.floor(w * d * density);
        if (target <= 0) continue;
        const items = [];
        for (let i = 0; i < target; i++) {
          const x = cx + random() * w, z = cz + random() * d;
          const r = sampler(x, z, random);
          if (r) items.push([x, z, r]);
        }
        if (!items.length) continue;
        const im = new THREE.InstancedMesh(this.geometry, mat, items.length);
        items.forEach(([x, z, r], i) => {
          q.setFromAxisAngle(up, random() * Math.PI * 2);
          const sc = r.scale;
          s.set(sc * (0.8 + random() * 0.4), sc, sc * (0.8 + random() * 0.4));
          p.set(x, r.y, z);
          m.compose(p, q, s);
          im.setMatrixAt(i, m);
          col.copy(cA).lerp(cB, random());
          const v = 0.85 + random() * 0.3;
          col.multiplyScalar(v);
          im.setColorAt(i, col);
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.castShadow = false;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        group.add(im);
      }
    }
    this.meshes.push(group);
    return group;
  }

  update(dt, playerPos) {
    this.uniforms.uTime.value += dt;
    if (playerPos) this.uniforms.uPlayer.value.copy(playerPos);
  }
}

/** Touffe de 3 brins effilés et légèrement courbés (hauteur 1, couleurs sombres → claires). */
function createTuftGeometry() {
  const pos = [], col = [], nor = [], idx = [];
  const levels = [[0, 1], [0.38, 0.82], [0.72, 0.5], [1, 0]];
  const blades = 3;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.4;
    const wx = Math.cos(a), wz = Math.sin(a);
    const px = -wz, pz = wx;
    const off = 0.04;
    const ox = px * off * (b - 1), oz = pz * off * (b - 1);
    const lean = 0.18 + b * 0.06;
    const base = pos.length / 3;
    levels.forEach(([y, wk]) => {
      const width = 0.075 * wk;
      const bend = y * y * lean;
      const cx = ox + px * bend, cz = oz + pz * bend;
      if (wk > 0) {
        pos.push(cx - wx * width, y, cz - wz * width, cx + wx * width, y, cz + wz * width);
        const c = 0.45 + 0.55 * y;
        col.push(c * 0.9, c, c * 0.85, c * 0.9, c, c * 0.85);
        nor.push(px * 0.3, 1, pz * 0.3, px * 0.3, 1, pz * 0.3);
      } else {
        pos.push(cx, y, cz);
        col.push(1.05, 1.1, 0.95);
        nor.push(px * 0.3, 1, pz * 0.3);
      }
    });
    for (let l = 0; l < 2; l++) {
      const i0 = base + l * 2;
      idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
    idx.push(base + 4, base + 5, base + 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.normalizeNormals();
  return geo;
}
