import * as THREE from 'three';
import { terrainTexture, detailNormal } from './Textures.js';

/**
 * MATÉRIAUX PARTAGÉS : cache, liseré lumineux (style « anime »), terrain multicouche,
 * matériaux nocturnes (fenêtres, lampadaires), eau et lave animées.
 */
const matCache = new Map();

export function stdMat(color, opts = {}) {
  const hasObj = Object.values(opts).some((v) => v && typeof v === 'object');
  if (hasObj) return new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });
  const key = `${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return matCache.get(key);
}

/** Ajoute un liseré de lumière sur les bords (fresnel) : donne du volume aux créatures et personnages. */
export function addRim(mat, color = '#ffffff', strength = 0.35, power = 2.6) {
  mat.userData.rim = { value: new THREE.Color(color).multiplyScalar(strength) };
  mat.userData.rimPower = { value: power };
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    prev?.call(mat, shader, r);
    shader.uniforms.uRim = mat.userData.rim;
    shader.uniforms.uRimPower = mat.userData.rimPower;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uRimPower;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 vdir = normalize( vViewPosition );
          float rimf = pow( 1.0 - clamp( abs( dot( normal, vdir ) ), 0.0, 1.0 ), uRimPower );
          totalEmissiveRadiance += uRim * rimf;
        }`);
  };
  mat.customProgramCacheKey = () => `rim-${mat.type}`;
  return mat;
}

// ═══ FENÊTRES ET LAMPES (pilotées par le cycle jour/nuit) ═══════════════
export const NIGHT = {
  window: new THREE.MeshStandardMaterial({ color: '#2b3448', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: 0.15, metalness: 0.1 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: '#ffd27a', emissiveIntensity: 0.2, roughness: 0.3 }),
  neon: new THREE.MeshStandardMaterial({ color: '#c8e8ff', emissive: '#7fd8ff', emissiveIntensity: 0.6, roughness: 0.3 }),
};

// ═══ TERRAIN MULTICOUCHE ═══════════════════════════════════════════════
/**
 * layers : 4 textures (r, g, b, a de l'attribut `splat`), la 3e (roche) est projetée en triplanaire.
 * La couleur de sommet teinte le résultat (variations du biome).
 */
export function terrainMaterial(layers = ['grass', 'dirt', 'rock', 'sand'], scales = [0.22, 0.28, 0.12, 0.2]) {
  const tex = layers.map((k) => terrainTexture(k));
  const normal = detailNormal('terrain', 16, 2.2);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0, normalMap: normal, normalScale: new THREE.Vector2(0.55, 0.55) });
  const U = {
    tL0: { value: tex[0] }, tL1: { value: tex[1] }, tL2: { value: tex[2] }, tL3: { value: tex[3] },
    uScales: { value: new THREE.Vector4(...scales) },
  };
  mat.userData.terrainUniforms = U;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat;\nvWPos = ( modelMatrix * vec4( position, 1.0 ) ).xyz;\nvWNorm = normalize( mat3( modelMatrix ) * normal );');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tL0; uniform sampler2D tL1; uniform sampler2D tL2; uniform sampler2D tL3;
        uniform vec4 uScales;
        varying vec4 vSplat; varying vec3 vWPos; varying vec3 vWNorm;
        vec3 sampleAT( sampler2D t, vec2 uv ) {
          return mix( texture2D( t, uv ).rgb, texture2D( t, uv * 0.31 + vec2( 0.37, 0.71 ) ).rgb, 0.38 );
        }`)
      .replace('#include <map_fragment>', `
        {
          vec3 c0 = sampleAT( tL0, vWPos.xz * uScales.x );
          vec3 c1 = sampleAT( tL1, vWPos.xz * uScales.y );
          vec3 bw = pow( abs( vWNorm ), vec3( 4.0 ) );
          bw /= ( bw.x + bw.y + bw.z + 1e-4 );
          vec3 c2 = texture2D( tL2, vWPos.zy * uScales.z ).rgb * bw.x + texture2D( tL2, vWPos.xz * uScales.z ).rgb * bw.y + texture2D( tL2, vWPos.xy * uScales.z ).rgb * bw.z;
          vec3 c3 = sampleAT( tL3, vWPos.xz * uScales.w );
          vec4 w = max( vSplat, vec4( 0.0 ) );
          w /= max( 1e-4, w.x + w.y + w.z + w.w );
          vec3 col = c0 * w.x + c1 * w.y + c2 * w.z + c3 * w.w;
          diffuseColor.rgb *= col * 1.25;
        }`);
  };
  mat.customProgramCacheKey = () => 'lumeria-terrain';
  return mat;
}

/** Change les textures des couches (même matériau, autre biome). */
export function setTerrainLayers(mat, layers, scales) {
  const U = mat.userData.terrainUniforms;
  layers.forEach((k, i) => { U[`tL${i}`].value = terrainTexture(k); });
  if (scales) U.uScales.value.set(...scales);
}

// ═══ EAU ═══════════════════════════════════════════════════════════════
export function waterMaterial({ color = '#1f6c8c', deep = '#0a2a44', opacity = 0.88, murky = false } = {}) {
  const normal = detailNormal('water', 6, 1.6).clone();
  normal.needsUpdate = true;
  normal.repeat.set(1, 1);
  const mat = new THREE.MeshPhysicalMaterial({
    color, roughness: murky ? 0.25 : 0.05, metalness: 0, transparent: true, opacity,
    normalMap: normal, normalScale: new THREE.Vector2(0.45, 0.45), clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3,
  });
  const U = { uTime: { value: 0 }, uDeep: { value: new THREE.Color(deep) } };
  mat.userData.water = U;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 wp0 = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
        transformed.z += ( sin( wp0.x * 0.35 + uTime * 1.3 ) * 0.06 + sin( wp0.z * 0.27 - uTime * 1.1 ) * 0.05 );
        vWP = wp0;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uDeep;\nvarying vec3 vWP;')
      .replace('#include <normal_fragment_maps>', `
        vec3 n1 = texture2D( normalMap, vWP.xz * 0.045 + vec2( uTime * 0.012, uTime * 0.007 ) ).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D( normalMap, vWP.xz * 0.11 - vec2( uTime * 0.017, -uTime * 0.011 ) ).xyz * 2.0 - 1.0;
        vec3 mapN = normalize( vec3( ( n1.xy + n2.xy ) * normalScale, 1.0 ) );
        normal = normalize( tbn * mapN );`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float dview = clamp( dot( normalize( vViewPosition ), vec3( 0.0, 1.0, 0.0 ) ) , 0.0, 1.0 );
        diffuseColor.rgb = mix( uDeep, diffuseColor.rgb, 0.55 + 0.45 * dview );`);
  };
  mat.customProgramCacheKey = () => 'lumeria-water';
  return mat;
}

// ═══ LAVE ══════════════════════════════════════════════════════════════
let lavaTex = null;
function lavaTexture() {
  if (lavaTex) return lavaTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#ff3a00'); g.addColorStop(0.5, '#ffb000'); g.addColorStop(1, '#ff3a00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 6 + Math.random() * 26;
    ctx.fillStyle = `rgba(${40 + Math.random() * 40},10,0,${0.35 + Math.random() * 0.4})`;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
  }
  lavaTex = new THREE.CanvasTexture(c);
  lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
  lavaTex.colorSpace = THREE.SRGBColorSpace;
  return lavaTex;
}

export function lavaMaterial() {
  const t = lavaTexture().clone();
  t.needsUpdate = true;
  t.repeat.set(0.08, 0.08);
  const mat = new THREE.MeshStandardMaterial({ color: '#ff6a10', emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 2.2, map: t, roughness: 0.6 });
  mat.userData.update = (dt) => { t.offset.x += dt * 0.01; t.offset.y += dt * 0.006; };
  return mat;
}
