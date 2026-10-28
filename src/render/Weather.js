import * as THREE from 'three';

/**
 * MÉTÉO DES CARTES : pluie, neige, tempête de sable, cendres, feuilles qui tombent, lucioles.
 * Les particules vivent dans une boîte qui suit la caméra (coût constant quelle que soit la carte).
 */
const CONFIGS = {
  rain:   { count: 2600, box: [44, 26, 44], speed: [0, -26, 0], spread: 0.6, size: 0.06, color: '#a8c8ff', opacity: 0.55, streak: 0.9 },
  snow:   { count: 2200, box: [48, 26, 48], speed: [0.6, -1.6, 0.3], spread: 0.8, size: 0.12, color: '#ffffff', opacity: 0.9, wobble: 1.2 },
  sand:   { count: 1800, box: [50, 14, 50], speed: [9, -0.2, 3], spread: 2.5, size: 0.08, color: '#e8c890', opacity: 0.55, wobble: 0.6 },
  ash:    { count: 1500, box: [44, 24, 44], speed: [0.4, -1.2, 0.2], spread: 0.5, size: 0.09, color: '#5a5250', opacity: 0.8, wobble: 0.8, embers: true },
  leaves: { count: 260, box: [40, 18, 40], speed: [0.8, -1.0, 0.4], spread: 0.6, size: 0.18, color: '#c8a040', opacity: 0.95, wobble: 1.6, leaf: true },
  fireflies: { count: 160, box: [36, 5, 36], speed: [0, 0, 0], spread: 0.5, size: 0.14, color: '#d8ff6a', opacity: 1, wobble: 0.8, glow: true, nightOnly: true },
  spores: { count: 300, box: [36, 8, 36], speed: [0.1, 0.25, 0.05], spread: 0.3, size: 0.1, color: '#c8ff8a', opacity: 0.8, wobble: 0.7, glow: true },
};

export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.systems = [];
    this.time = 0;
  }

  set(types = []) {
    for (const s of this.systems) { this.scene.remove(s.points); s.points.geometry.dispose(); s.points.material.dispose(); }
    this.systems = [];
    for (const t of types) if (CONFIGS[t]) this.systems.push(this.create(t, CONFIGS[t]));
  }

  create(type, c) {
    const n = c.count;
    const pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * c.box[0];
      pos[i * 3 + 1] = Math.random() * c.box[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * c.box[2];
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const col = new THREE.Color(c.color);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: c.size }, uColor: { value: c.glow ? col.clone().multiplyScalar(3) : col }, uOpacity: { value: c.opacity }, uScale: { value: 500 }, uTime: { value: 0 }, uStreak: { value: c.streak || 0 }, uLeaf: { value: c.leaf ? 1 : 0 }, uEmber: { value: c.embers ? 1 : 0 } },
      vertexShader: `attribute float seed; uniform float uSize; uniform float uScale; uniform float uTime; varying float vSeed;
        void main() { vSeed = seed; vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_PointSize = uSize * uScale / max( 0.5, -mv.z ) * ( 0.7 + seed * 0.6 ); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uStreak; uniform float uLeaf; uniform float uEmber; uniform float uTime; varying float vSeed;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float a;
          vec3 col = uColor;
          if ( uStreak > 0.0 ) { a = ( 1.0 - smoothstep( 0.0, 0.08, abs( p.x ) ) ) * ( 1.0 - smoothstep( 0.3, 0.5, abs( p.y ) ) ); }
          else if ( uLeaf > 0.0 ) {
            float r = vSeed * 6.28 + uTime * ( 1.0 + vSeed );
            vec2 q = vec2( cos( r ) * p.x - sin( r ) * p.y, sin( r ) * p.x + cos( r ) * p.y ) * vec2( 2.4, 1.1 );
            a = smoothstep( 0.5, 0.42, length( q ) );
            col = mix( vec3( 0.85, 0.45, 0.15 ), vec3( 0.95, 0.75, 0.25 ), vSeed );
          } else { a = smoothstep( 0.5, 0.15, length( p ) ); }
          if ( uEmber > 0.0 && vSeed > 0.88 ) col = vec3( 3.0, 1.1, 0.2 );
          gl_FragColor = vec4( col, a * uOpacity );
          if ( gl_FragColor.a < 0.02 ) discard;
        }`,
      transparent: true, depthWrite: false, blending: c.glow ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.renderOrder = 8;
    this.scene.add(points);
    return { type, c, points, pos, seed, origin: new THREE.Vector3() };
  }

  update(dt, camera, isNight = false, heightAt = null) {
    this.time += dt;
    const h = camera.domElement?.height || window.innerHeight;
    for (const s of this.systems) {
      const { c, pos, seed } = s;
      s.points.visible = !c.nightOnly || isNight;
      if (!s.points.visible) continue;
      s.points.material.uniforms.uTime.value = this.time;
      s.points.material.uniforms.uScale.value = window.innerHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const [bx, by, bz] = c.box;
      const groundY = heightAt ? heightAt(cx, cz) : cy - 6;
      for (let i = 0; i < seed.length; i++) {
        const k = i * 3, sd = seed[i];
        const w = c.wobble ? Math.sin(this.time * (0.8 + sd) + sd * 20) * c.wobble : 0;
        pos[k] += (c.speed[0] * (0.7 + sd * 0.6) + w) * dt;
        pos[k + 1] += c.speed[1] * (0.7 + sd * 0.6) * dt + (c.glow ? Math.sin(this.time * 1.3 + sd * 9) * 0.4 * dt : 0);
        pos[k + 2] += (c.speed[2] * (0.7 + sd * 0.6) + Math.cos(this.time * 0.7 + sd * 13) * (c.wobble || 0) * 0.6) * dt;
        let dx = pos[k] - cx, dz = pos[k + 2] - cz;
        if (dx > bx / 2) pos[k] -= bx; else if (dx < -bx / 2) pos[k] += bx;
        if (dz > bz / 2) pos[k + 2] -= bz; else if (dz < -bz / 2) pos[k + 2] += bz;
        const floor = c.glow ? groundY + 0.3 : groundY - 1;
        if (pos[k + 1] < floor || pos[k + 1] > floor + by + (c.glow ? 0 : 6)) pos[k + 1] = c.speed[1] < 0 ? floor + by : floor + Math.random() * by;
      }
      s.points.geometry.attributes.position.needsUpdate = true;
    }
  }
}
