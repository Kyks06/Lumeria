import * as THREE from 'three';
import { Sky as SkyMesh } from 'three/addons/objects/Sky.js';
import { NIGHT } from './Materials.js';
import { GAME } from '../config/game.js';
import { smoothstep, lerp } from '../core/utils.js';

const C = (hex) => new THREE.Color(hex);
const SUN_DAY = C('#fff3e2'), SUN_LOW = C('#ffa45c'), MOON = C('#9db4ff');

/**
 * CIEL, SOLEIL, LUNE ET CYCLE JOUR/NUIT
 * Modes : 'outdoor' (ciel atmosphérique, ombres du soleil), 'indoor' (éclairage intérieur chaud), 'cave' (obscurité, lanterne).
 * Chaque biome ajuste la teinte du brouillard, la couverture nuageuse et la chaleur de la lumière.
 */
export class SkySystem {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;
    this.hour = GAME.startHour;
    this.mode = 'outdoor';
    this.lampLights = [];
    this.biome = { fogDay: '#a7c4dd', fogNight: '#0b1324', fogDusk: '#f0a985', near: 70, far: 420, clouds: 0.42, turbidity: 2.6, sunTint: '#ffffff', ambient: 1, exposure: 1 };

    this.sky = new SkyMesh();
    this.sky.scale.setScalar(1000);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    const u = this.sky.material.uniforms;
    u.rayleigh.value = 1.35;
    u.mieCoefficient.value = 0.003;
    u.mieDirectionalG.value = 0.78;
    u.cloudDensity.value = 0.55;
    u.cloudScale.value = 0.00022;
    u.cloudSpeed.value = 0.00004;
    u.cloudElevation.value = 0.55;
    this.skyGain = { value: 0.62 };
    this.sky.material.onBeforeCompile = (shader) => {
      shader.uniforms.uSkyGain = this.skyGain;
      shader.fragmentShader = shader.fragmentShader
        .replace('uniform float time;', 'uniform float time;\nuniform float uSkyGain;')
        .replace('gl_FragColor = vec4( texColor, 1.0 );', 'gl_FragColor = vec4( min( texColor * uSkyGain, vec3( 1.12 ) ), 1.0 );');
    };
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight('#ffffff', 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 220;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 4;
    this.setShadowQuality(engine.settings.quality);
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight('#cfe3ff', '#6f8a4c', 0.6);
    scene.add(this.hemi);
    this.indoorLight = new THREE.PointLight('#ffe2b8', 0, 40, 1.2);
    this.indoorLight.castShadow = false;
    scene.add(this.indoorLight);
    this.lantern = new THREE.PointLight('#ffd8a0', 0, 14, 1.4);
    scene.add(this.lantern);

    scene.fog = new THREE.Fog(C(this.biome.fogDay), 70, 420);
    this.stars = this.createStars();
    scene.add(this.stars);
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#eef2ff').multiplyScalar(2.2), fog: false, transparent: true }));
    this.moon.frustumCulled = false;
    scene.add(this.moon);
    this.sunDir = new THREE.Vector3();
    this.day = 1;
    this.night = 0;
    this.override = null;
  }

  setShadowQuality(q) {
    this.sun.castShadow = q !== 'basse';
    const size = q === 'basse' ? 1024 : q === 'ultra' ? 4096 : (this.engine.isMobile ? 1536 : 2048);
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
  }

  createStars() {
    const n = 1800;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random(), y = Math.random() * 0.9 + 0.08;
      const theta = u * Math.PI * 2, r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(theta) * r * 900; pos[i * 3 + 1] = y * 900; pos[i * 3 + 2] = Math.sin(theta) * r * 900;
      size[i] = Math.random() < 0.06 ? 3.2 + Math.random() * 2 : 1.2 + Math.random() * 1.6;
      phase[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uPixel: { value: 1 } },
      vertexShader: `attribute float size; attribute float phase; uniform float uTime; uniform float uPixel; varying float vTw;
        void main() { vTw = 0.6 + 0.4 * sin( uTime * ( 1.5 + fract( phase ) * 2.0 ) + phase ); vec4 mv = modelViewMatrix * vec4( position, 1.0 ); gl_PointSize = size * uPixel; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uOpacity; varying float vTw;
        void main() { float d = length( gl_PointCoord - 0.5 ); float a = smoothstep( 0.5, 0.0, d ); gl_FragColor = vec4( vec3( 1.6, 1.7, 2.0 ) * a * vTw, a * uOpacity * vTw ); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -9;
    return pts;
  }

  /** Configure le ciel pour la carte courante. */
  configure(mode, biome = {}) {
    this.mode = mode;
    this.biome = { ...this.biome, fogDay: '#a7c4dd', fogDusk: '#f0a985', fogNight: '#0b1324', near: 70, far: 420, clouds: 0.42, turbidity: 2.6, sunTint: '#ffffff', ambient: 1, exposure: 1, ...biome };
    const outdoor = mode === 'outdoor';
    this.sky.visible = outdoor;
    this.stars.visible = outdoor;
    this.moon.visible = outdoor;
    this.sun.castShadow = mode !== 'cave' && this.engine.shadows;
    const u = this.sky.material.uniforms;
    u.cloudCoverage.value = this.biome.clouds;
    u.turbidity.value = this.biome.turbidity;
    this.lampLights = [];
    if (mode === 'indoor') {
      this.engine.scene.background = C(biome.background || '#1a1410');
      this.engine.scene.fog.near = 60; this.engine.scene.fog.far = 200;
    } else if (mode === 'cave') {
      this.engine.scene.background = C(biome.background || '#08070a');
    } else {
      this.engine.scene.background = null;
    }
  }

  addLampLight(l) { this.lampLights.push(l); }
  setHour(h) { this.hour = ((h % 24) + 24) % 24; }
  get isNight() { return this.mode === 'outdoor' ? this.night > 0.5 : this.hour < 6 || this.hour >= 20; }
  timeOfDay() { return this.hour >= 6 && this.hour < 20 ? 'day' : 'night'; }

  clockString() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  update(dt, focus, camera, timeScale = 1) {
    this.hour = (this.hour + dt * timeScale * 24 / GAME.dayLengthSeconds) % 24;
    const h = this.hour;
    const angle = ((h - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(angle) * 1.12;
    const az = Math.PI / 2 - ((h - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize();
    const sy = this.sunDir.y;
    const day = smoothstep(-0.14, 0.22, sy);
    const warm = smoothstep(0.45, 0.02, sy) * smoothstep(-0.2, 0.05, sy);
    this.day = day;
    this.night = 1 - day;
    const scene = this.engine.scene;
    const B = this.biome;
    const r = this.engine.renderer;
    const n = smoothstep(0.35, 0.85, this.night);
    NIGHT.window.emissiveIntensity = n * 2.4;
    NIGHT.lamp.emissiveIntensity = 0.15 + n * 4;
    NIGHT.neon.emissiveIntensity = 0.6 + n * 3;

    if (this.mode === 'indoor') {
      this.sun.intensity = 0.9;
      this.sun.color.set('#fff0dc');
      this.sun.position.copy(focus).add(new THREE.Vector3(6, 14, 9));
      this.sun.target.position.copy(focus);
      this.hemi.color.set('#fff2e0');
      this.hemi.groundColor.set('#5a4a3a');
      this.hemi.intensity = 0.95;
      scene.environmentIntensity = 0.5;
      this.indoorLight.intensity = 22;
      this.indoorLight.position.copy(focus).add(new THREE.Vector3(0, 4.5, 0));
      this.lantern.intensity = 0;
      scene.fog.color.set(B.background || '#1a1410');
      r.toneMappingExposure = 1.0 * B.exposure;
      for (const l of this.lampLights) l.intensity = 6;
      return;
    }
    this.indoorLight.intensity = 0;
    if (this.mode === 'cave') {
      this.sun.intensity = 0.35;
      this.sun.color.set('#9fb0d8');
      this.sun.position.copy(focus).add(new THREE.Vector3(10, 30, 8));
      this.sun.target.position.copy(focus);
      this.hemi.color.set(B.caveSky || '#3a4060');
      this.hemi.groundColor.set('#1a1410');
      this.hemi.intensity = B.dark ? 0.12 : 0.42;
      scene.environmentIntensity = B.dark ? 0.04 : 0.12;
      scene.fog.color.set(B.background || '#08070a');
      scene.fog.near = B.dark ? 4 : 14;
      scene.fog.far = B.dark ? 22 : 70;
      this.lantern.intensity = B.dark ? (B.lanternOn ? 40 : 6) : 18;
      this.lantern.distance = B.dark ? (B.lanternOn ? 22 : 7) : 18;
      this.lantern.position.copy(focus).add(new THREE.Vector3(0, 2.6, 0));
      r.toneMappingExposure = 1.0;
      for (const l of this.lampLights) l.intensity = 14;
      return;
    }
    this.lantern.intensity = 0;
    const u = this.sky.material.uniforms;
    u.sunPosition.value.copy(this.sunDir);
    u.time.value += dt * timeScale;
    this.sky.position.copy(camera.position);
    const useSun = sy > -0.06;
    const lightDir = useSun ? this.sunDir.clone() : new THREE.Vector3(-this.sunDir.x, Math.max(0.35, -sy), -this.sunDir.z).normalize();
    if (lightDir.y < 0.14) lightDir.y = 0.14;
    lightDir.normalize();
    this.sun.position.copy(focus).addScaledVector(lightDir, 90);
    this.sun.target.position.copy(focus);
    const tint = C(B.sunTint);
    if (useSun) {
      this.sun.color.copy(SUN_DAY).lerp(SUN_LOW, warm).multiply(tint);
      this.sun.intensity = 2.7 * smoothstep(-0.06, 0.12, sy);
    } else {
      this.sun.color.copy(MOON);
      this.sun.intensity = 0.42 * smoothstep(-0.06, -0.25, sy);
    }
    this.hemi.color.set('#cfe3ff').lerp(C('#22305a'), this.night);
    this.hemi.groundColor.set(B.ground || '#6f8a4c').lerp(C('#0d1118'), this.night);
    this.hemi.intensity = lerp(0.3, 0.62, day) * B.ambient;
    scene.environmentIntensity = lerp(0.12, 0.42, day);
    scene.fog.color.copy(C(B.fogDay)).lerp(C(B.fogDusk), warm * 0.75).lerp(C(B.fogNight), this.night);
    scene.fog.near = this.override?.near ?? B.near;
    scene.fog.far = this.override?.far ?? B.far;
    r.toneMappingExposure = lerp(0.95, 0.82, warm) * lerp(0.92, 1, day) * B.exposure;
    this.stars.position.copy(camera.position);
    this.stars.material.uniforms.uOpacity.value = smoothstep(0.35, 0.95, this.night) * (B.clouds > 0.7 ? 0.3 : 1);
    this.stars.material.uniforms.uTime.value += dt;
    this.stars.material.uniforms.uPixel.value = r.getPixelRatio();
    const moonDir = this.sunDir.clone().negate();
    this.moon.position.copy(camera.position).addScaledVector(moonDir, 700);
    this.moon.visible = moonDir.y > -0.1;
    this.moon.material.opacity = smoothstep(-0.05, 0.25, moonDir.y);
    for (const l of this.lampLights) l.intensity = n * 14;
  }
}
