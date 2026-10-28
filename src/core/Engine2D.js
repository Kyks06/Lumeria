import * as THREE from 'three';

/**
 * MOTEUR DE RENDU PIXEL ART.
 * - Le jeu dessine dans une image basse résolution (≈ 320 × 180, agrandie d'un facteur entier, sans lissage).
 * - Une passe WebGL finale ajoute à la résolution de l'écran : halo lumineux (bloom) des sources
 *   émissives, flou de profondeur « miniature » en haut et en bas, vignette.
 * - Repli automatique en Canvas 2D si WebGL est indisponible.
 */
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tSrc, vUv) * 0.227027;
  c += texture2D(tSrc, vUv + uDir * 1.3846153846) * 0.3162162162; c += texture2D(tSrc, vUv - uDir * 1.3846153846) * 0.3162162162;
  c += texture2D(tSrc, vUv + uDir * 3.2307692308) * 0.0702702703; c += texture2D(tSrc, vUv - uDir * 3.2307692308) * 0.0702702703;
  gl_FragColor = c;
}`;
const COPY = `uniform sampler2D tSrc; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tSrc, vUv); }`;
const FINAL = `uniform sampler2D tBase; uniform sampler2D tBlur; uniform sampler2D tGlow1; uniform sampler2D tGlow2;
uniform vec2 uScale; uniform vec2 uOffset; uniform float uBloom; uniform float uTilt; uniform float uVignette; uniform float uHeat; uniform float uTime; uniform vec3 uTint;
varying vec2 vUv;
void main(){
  vec2 uv = (vUv - uOffset) / uScale;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  vec2 suv = uv;
  if (uHeat > 0.0) suv.x += sin(uv.y * 90.0 + uTime * 3.0) * uHeat * 0.0012 * smoothstep(0.55, 1.0, uv.y);
  vec3 base = texture2D(tBase, suv).rgb;
  vec3 blur = texture2D(tBlur, suv).rgb;
  float t = max(smoothstep(0.16, 0.0, uv.y), smoothstep(0.86, 1.0, uv.y)) * uTilt;
  vec3 col = mix(base, blur, t);
  vec3 glow = texture2D(tGlow1, uv).rgb * 0.5 + texture2D(tGlow2, uv).rgb * 0.65;
  col += glow * uBloom;
  col *= uTint;
  vec2 q = uv - 0.5;
  col *= 1.0 - dot(q, q) * uVignette;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Engine2D {
  constructor(container, settings) {
    this.settings = settings;
    this.container = container;
    this.isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 820);
    this.listeners = [];
    this.shake = 0;
    this.shakeT = 0;
    this.bloomBoost = 0;
    this.heat = 0;
    this.tint = [1, 1, 1];
    this.time = 0;
    // image du jeu (basse résolution) et image des sources lumineuses
    this.frame = document.createElement('canvas');
    this.fctx = this.frame.getContext('2d', { alpha: false });
    this.glow = document.createElement('canvas');
    this.gctx = this.glow.getContext('2d');
    // canvas visible
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.canvas.style.imageRendering = 'pixelated';
    container.appendChild(this.canvas);
    this.gl = null;
    try { this.initGL(); } catch (e) { console.warn('WebGL indisponible, rendu 2D simple.', e); this.gl = null; }
    if (!this.gl) { this.c2d = this.canvas.getContext('2d'); }
    this.renderer = { domElement: this.canvas };
    this.ps = 4;
    this.W = 320; this.H = 180;
    this.cssW = innerWidth; this.cssH = innerHeight; this.offX = 0; this.offY = 0;
    addEventListener('resize', () => this.resize());
    // la zone de jeu peut changer de taille sans que la fenêtre change (format téléphone, barre d'adresse)
    if (typeof ResizeObserver !== 'undefined') {
      let pending = false;
      new ResizeObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; this.resize(); }); }).observe(container);
    }
    this.resize();
  }

  /** Taille (en pixels CSS) de la zone où le jeu est dessiné. */
  viewSize() {
    const r = this.container.getBoundingClientRect();
    const w = Math.round(r.width) || innerWidth, h = Math.round(r.height) || innerHeight;
    return { w, h, x: r.left, y: r.top };
  }

  initGL() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.autoClear = false;
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.gl = r;
    const mkTex = (c, near) => { const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = near ? THREE.NearestFilter : THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; return t; };
    this.tFrame = mkTex(this.frame, true);
    this.tGlow = mkTex(this.glow, false);
    const rt = () => new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
    this.rtA = rt(); this.rtB = rt(); this.rtC = rt(); this.rtD = rt(); this.rtE = rt(); this.rtF = rt();
    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.mBlur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: VS, fragmentShader: BLUR, depthTest: false, depthWrite: false });
    this.mCopy = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null } }, vertexShader: VS, fragmentShader: COPY, depthTest: false, depthWrite: false });
    this.mFinal = new THREE.ShaderMaterial({
      uniforms: { tBase: { value: this.tFrame }, tBlur: { value: null }, tGlow1: { value: null }, tGlow2: { value: null }, uScale: { value: new THREE.Vector2(1, 1) }, uOffset: { value: new THREE.Vector2() }, uBloom: { value: 1 }, uTilt: { value: 0.6 }, uVignette: { value: 0.5 }, uHeat: { value: 0 }, uTime: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
      vertexShader: VS, fragmentShader: FINAL, depthTest: false, depthWrite: false,
    });
  }

  /** Taille d'un pixel du jeu (en pixels CSS) : facteur entier pour une hauteur d'environ 180 px. */
  pixelScale(w, h) {
    const target = { fins: 216, normaux: 180, gros: 150 }[this.settings.pixelScale] || 180;
    const zoom = this.settings.zoom || 0;
    let ps = Math.round(Math.min(h / target, w / (target * 1.6)));
    if (w < h) ps = Math.floor(w / 190); // portrait : environ 12 tuiles de large
    return Math.max(2, Math.min(12, ps + zoom));
  }

  get pixelRatio() { return 1 / this.ps; }

  resize() {
    const v = this.viewSize();
    const w = v.w, h = v.h;
    if (w === this.cssW && h === this.cssH && this.frame.width === this.W && this.lastPs === this.pixelScale(w, h) && this.sized) { this.offX = v.x; this.offY = v.y; return; }
    this.sized = true;
    this.cssW = w; this.cssH = h; this.offX = v.x; this.offY = v.y;
    this.ps = this.pixelScale(w, h);
    this.lastPs = this.ps;
    this.W = Math.max(120, Math.floor(w / this.ps));
    this.H = Math.max(100, Math.floor(h / this.ps));
    this.frame.width = this.W; this.frame.height = this.H;
    this.glow.width = this.W; this.glow.height = this.H;
    this.fctx.imageSmoothingEnabled = false;
    this.gctx.imageSmoothingEnabled = true;
    const dpr = Math.min(devicePixelRatio || 1, this.settings.quality === 'basse' ? 1 : 2);
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
    if (this.gl) {
      this.gl.setPixelRatio(dpr);
      this.gl.setSize(w, h, false);
      const half = (rt, k) => rt.setSize(Math.max(4, Math.round(this.W / k)), Math.max(4, Math.round(this.H / k)));
      half(this.rtA, 1); half(this.rtB, 1); half(this.rtC, 2); half(this.rtD, 2); half(this.rtE, 1); half(this.rtF, 1);
      this.tFrame.dispose(); this.tGlow.dispose();
      const mk = (c, near) => { const t = new THREE.CanvasTexture(c); t.minFilter = t.magFilter = near ? THREE.NearestFilter : THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; return t; };
      this.tFrame = mk(this.frame, true); this.tGlow = mk(this.glow, false);
      this.mFinal.uniforms.tBase.value = this.tFrame;
      const sx = (this.W * this.ps) / w, sy = (this.H * this.ps) / h;
      this.mFinal.uniforms.uScale.value.set(sx, sy);
      this.mFinal.uniforms.uOffset.value.set((1 - sx) / 2, (1 - sy) / 2);
    } else {
      this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    }
    this.listeners.forEach((fn) => fn(this.W, this.H, this.ps));
  }

  onResize(fn) { this.listeners.push(fn); }
  applyQuality() { this.sized = false; this.resize(); }
  addShake(a) { this.shake = Math.min(1.2, this.shake + a); }
  setDOF() {}

  /** Décalage de secousse en pixels du jeu. */
  getShakeOffset(out = { x: 0, y: 0 }) {
    const s = this.shake * 7;
    out.x = Math.round((Math.random() * 2 - 1) * s);
    out.y = Math.round((Math.random() * 2 - 1) * s);
    if (out.set) out.set(out.x, out.y, 0);
    return out;
  }

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.bloomBoost = Math.max(0, this.bloomBoost - dt * 1.6);
  }

  pass(mat, target) {
    this.quad.material = mat;
    this.gl.setRenderTarget(target);
    this.gl.render(this.scene, this.cam);
  }

  blur(src, a, b, steps = 1) {
    let s = src;
    for (let i = 0; i < steps; i++) {
      this.mBlur.uniforms.tSrc.value = s.texture || s;
      this.mBlur.uniforms.uDir.value.set(1 / a.width, 0);
      this.pass(this.mBlur, a);
      this.mBlur.uniforms.tSrc.value = a.texture;
      this.mBlur.uniforms.uDir.value.set(0, 1 / a.height);
      this.pass(this.mBlur, b);
      s = b;
    }
    return b;
  }

  /** Composition finale (appelée après que le jeu a dessiné this.frame et this.glow). */
  present(opts = {}) {
    if (!this.gl) {
      const c = this.c2d;
      const w = this.canvas.width, h = this.canvas.height;
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
      const k = w / this.cssW;
      const dw = this.W * this.ps * k, dh = this.H * this.ps * k;
      c.drawImage(this.frame, (w - dw) / 2, (h - dh) / 2, dw, dh);
      c.globalCompositeOperation = 'lighter';
      c.imageSmoothingEnabled = true;
      c.globalAlpha = 0.7;
      c.drawImage(this.glow, (w - dw) / 2, (h - dh) / 2, dw, dh);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      return;
    }
    this.tFrame.needsUpdate = true;
    this.tGlow.needsUpdate = true;
    const high = this.settings.quality !== 'basse';
    // halo : deux niveaux de flou
    const g1 = this.blur(this.tGlow, this.rtA, this.rtB, high ? 2 : 1);
    this.mCopy.uniforms.tSrc.value = g1.texture;
    this.pass(this.mCopy, this.rtC);
    const g2 = this.blur(this.rtC, this.rtD, this.rtC, 2);
    // flou de profondeur
    let tb = this.tFrame;
    const tilt = high && this.settings.tiltShift !== false ? (opts.tilt ?? 0.4) : 0;
    if (tilt > 0) tb = this.blur(this.tFrame, this.rtE, this.rtF, 1).texture;
    const U = this.mFinal.uniforms;
    U.tBlur.value = tb;
    U.tGlow1.value = g1.texture;
    U.tGlow2.value = g2.texture;
    U.uBloom.value = (opts.bloom ?? 1) * (1 + this.bloomBoost);
    U.uTilt.value = tilt;
    U.uVignette.value = opts.vignette ?? 0.45;
    U.uHeat.value = opts.heat ?? this.heat;
    U.uTime.value = this.time;
    U.uTint.value.set(...(opts.tint || this.tint));
    this.gl.setRenderTarget(null);
    this.quad.material = this.mFinal;
    this.gl.render(this.scene, this.cam);
  }

  /** Coordonnées écran (CSS) d'un pixel de l'image du jeu. */
  toScreen(fx, fy) {
    const ox = this.offX + (this.cssW - this.W * this.ps) / 2, oy = this.offY + (this.cssH - this.H * this.ps) / 2;
    return { x: ox + fx * this.ps, y: oy + fy * this.ps };
  }

  render() { /* le jeu appelle present() lui-même */ }
}
