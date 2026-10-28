import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { damp } from './utils.js';

/**
 * Moteur de rendu : renderer PBR (ACES Filmic), environnement RoomEnvironment,
 * post-processing (profondeur de champ, bloom, SMAA) et redimensionnement.
 */
export class Engine {
  constructor(container, settings) {
    this.container = container;
    this.settings = settings;
    this.isMobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // ombres douces via light.shadow.radius
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1400);
    this.camera.position.set(0, 20, 120);

    // Éclairage d'environnement pour des reflets PBR réalistes
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.55;

    // Post-processing
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bokehPass = new BokehPass(this.scene, this.camera, { focus: 10, aperture: 0.0006, maxblur: 0.0055 });
    this.bokehPass.enabled = false;
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.34, 0.5, 1.25);
    this.outputPass = new OutputPass();
    this.smaaPass = new SMAAPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bokehPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.smaaPass);

    this.baseBloom = 0.34;
    this.bloomBoost = 0;
    this.dof = { enabled: false, focus: 10, targetFocus: 10 };
    this.shake = { amount: 0, time: 0 };
    this.resizeListeners = new Set();

    this.applyQuality();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  get pixelRatio() {
    const q = this.settings.quality;
    const cap = q === 'basse' ? 0.85 : q === 'ultra' ? 2 : (this.isMobile ? 1.25 : 1.5);
    const scale = window.__lumeriaPixelScale || 1; // réglage de test
    return Math.min(window.devicePixelRatio || 1, cap) * scale;
  }

  /** Les ombres sont coupées en qualité basse (gros gain sur les petites cartes graphiques). */
  get shadows() { return this.settings.quality !== 'basse'; }

  applyQuality() {
    const high = this.settings.quality !== 'basse';
    this.bloomPass.enabled = high;
    this.smaaPass.enabled = true;
    this.renderer.shadowMap.enabled = this.shadows;
    this.scene.traverse((o) => { if (o.isMesh && o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    this.resize();
  }

  onResize(fn) { this.resizeListeners.add(fn); }

  /** Champ de vision de base : plus large en mode portrait (téléphone). */
  get baseFov() { return window.innerWidth / window.innerHeight < 0.85 ? 72 : 55; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = this.pixelRatio;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    if (!this.fovLocked) this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
    this.resizeListeners.forEach((fn) => fn(w, h, pr));
  }

  /** Active la profondeur de champ (combat) et règle la distance de mise au point. */
  setDOF(enabled, focus) {
    this.dof.enabled = enabled && this.settings.quality !== 'basse';
    if (focus !== undefined) this.dof.targetFocus = focus;
  }

  addShake(amount) { this.shake.amount = Math.max(this.shake.amount, amount); }

  update(dt) {
    this.dof.focus = damp(this.dof.focus, this.dof.targetFocus, 6, dt);
    this.bokehPass.enabled = this.dof.enabled;
    this.bokehPass.uniforms.focus.value = this.dof.focus;
    this.bloomBoost = damp(this.bloomBoost, 0, 3, dt);
    this.bloomPass.strength = this.baseBloom + this.bloomBoost;
    this.shake.time += dt;
    this.shake.amount = damp(this.shake.amount, 0, 5, dt);
  }

  /** Décalage de tremblement d'écran à appliquer à la caméra. */
  getShakeOffset(out) {
    const a = this.shake.amount;
    if (a < 0.002) return out.set(0, 0, 0);
    const t = this.shake.time * 60;
    return out.set(Math.sin(t * 1.3) * a, Math.sin(t * 1.7 + 1) * a * 0.8, Math.sin(t * 1.1 + 2) * a * 0.5);
  }

  render() {
    this.composer.render();
  }
}
