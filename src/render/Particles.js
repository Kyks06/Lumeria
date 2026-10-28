import * as THREE from 'three';

/** Formes de particules disponibles dans le shader. */
export const SHAPE = { glow: 0, spark: 1, leaf: 2, drop: 3, chunk: 4, smoke: 5 };

const _c = new THREE.Color();
/** Convertit une couleur CSS en composantes linéaires multipliées par une intensité (HDR pour le bloom). */
export function hdr(color, intensity = 1) {
  _c.set(color);
  return [_c.r * intensity, _c.g * intensity, _c.b * intensity];
}

/**
 * Système de particules GPU (THREE.Points) avec simulation CPU :
 * gravité, frottement, couleur/taille interpolées, rotation (feuilles), formes procédurales.
 */
export class ParticleSystem {
  constructor(capacity = 2000, { additive = true } = {}) {
    this.cap = capacity;
    this.count = 0;
    const n = capacity;
    this.p = new Float32Array(n * 3);
    this.v = new Float32Array(n * 3);
    this.c0 = new Float32Array(n * 3);
    this.c1 = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.s0 = new Float32Array(n);
    this.s1 = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.shape = new Float32Array(n);
    this.rot = new Float32Array(n);
    this.spin = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.floor = new Float32Array(n);

    this.aPos = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.aShape = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aShape', this.aShape);
    geo.setAttribute('aRot', this.aRot);
    geo.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader: /* glsl */`
        attribute vec4 aColor; attribute float aSize; attribute float aShape; attribute float aRot;
        uniform float uScale;
        varying vec4 vColor; varying float vShape; varying float vRot;
        void main() {
          vColor = aColor; vShape = aShape; vRot = aRot;
          vec4 mv = modelViewMatrix * vec4( position, 1.0 );
          gl_PointSize = aSize * uScale / max( 0.1, -mv.z );
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        varying vec4 vColor; varying float vShape; varying float vRot;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float c = cos( vRot ), s = sin( vRot );
          vec2 r = vec2( c * uv.x - s * uv.y, s * uv.x + c * uv.y );
          float d = length( uv );
          float a = 0.0;
          vec3 col = vColor.rgb;
          int sh = int( vShape + 0.5 );
          if ( sh == 0 ) {
            a = pow( max( 0.0, 1.0 - d * 2.0 ), 1.7 );
          } else if ( sh == 1 ) {
            float core = max( 0.0, 1.0 - d * 2.8 );
            float arms = max( 0.0, 1.0 - abs( r.x ) * 18.0 ) * max( 0.0, 1.0 - abs( r.y ) * 2.1 )
                       + max( 0.0, 1.0 - abs( r.y ) * 18.0 ) * max( 0.0, 1.0 - abs( r.x ) * 2.1 );
            a = clamp( core * core * 1.5 + arms, 0.0, 1.0 );
          } else if ( sh == 2 ) {
            vec2 q = r * vec2( 2.5, 1.1 );
            float e = length( q );
            a = smoothstep( 0.5, 0.44, e );
            float vein = 1.0 - smoothstep( 0.0, 0.035, abs( r.x ) );
            col *= ( 1.0 - vein * 0.3 ) * ( 0.85 + r.y * 0.6 );
          } else if ( sh == 3 ) {
            a = smoothstep( 0.5, 0.38, d );
            float hl = smoothstep( 0.2, 0.0, length( uv - vec2( -0.13, -0.13 ) ) );
            col = mix( col, vec3( 1.2 ), hl * 0.8 );
          } else if ( sh == 4 ) {
            vec2 q = abs( r );
            float hex = max( q.x * 0.866 + q.y * 0.5, q.y );
            a = 1.0 - smoothstep( 0.36, 0.4, hex );
            col *= 0.7 + 0.6 * ( 0.5 - r.y ) + 0.15 * r.x;
          } else {
            a = smoothstep( 0.5, 0.0, d ) * 0.65;
          }
          a *= vColor.a;
          if ( a < 0.01 ) discard;
          gl_FragColor = vec4( col, a );
        }`,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 6 : 5;
  }

  setViewport(heightPx, fovDeg) {
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  }

  /**
   * @param o { pos:[x,y,z], vel:[x,y,z], color:[r,g,b], color1?, size, size1?, life, gravity?, drag?, shape?, spin?, rot?, alpha?, floor? }
   */
  emit(o) {
    if (this.count >= this.cap) return;
    const i = this.count++;
    const i3 = i * 3;
    const P = o.pos, V = o.vel || [0, 0, 0], C0 = o.color || [1, 1, 1], C1 = o.color1 || C0;
    this.p[i3] = P[0]; this.p[i3 + 1] = P[1]; this.p[i3 + 2] = P[2];
    this.v[i3] = V[0]; this.v[i3 + 1] = V[1]; this.v[i3 + 2] = V[2];
    this.c0[i3] = C0[0]; this.c0[i3 + 1] = C0[1]; this.c0[i3 + 2] = C0[2];
    this.c1[i3] = C1[0]; this.c1[i3 + 1] = C1[1]; this.c1[i3 + 2] = C1[2];
    this.life[i] = 0;
    this.maxLife[i] = o.life || 1;
    this.s0[i] = o.size ?? 0.3;
    this.s1[i] = o.size1 ?? this.s0[i] * 0.2;
    this.grav[i] = o.gravity ?? 0;
    this.drag[i] = o.drag ?? 0;
    this.shape[i] = o.shape ?? 0;
    this.rot[i] = o.rot ?? Math.random() * Math.PI * 2;
    this.spin[i] = o.spin ?? 0;
    this.alpha[i] = o.alpha ?? 1;
    this.floor[i] = o.floor ?? -1e9;
  }

  copy(from, to) {
    const f3 = from * 3, t3 = to * 3;
    for (let k = 0; k < 3; k++) {
      this.p[t3 + k] = this.p[f3 + k]; this.v[t3 + k] = this.v[f3 + k];
      this.c0[t3 + k] = this.c0[f3 + k]; this.c1[t3 + k] = this.c1[f3 + k];
    }
    this.life[to] = this.life[from]; this.maxLife[to] = this.maxLife[from];
    this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from];
    this.grav[to] = this.grav[from]; this.drag[to] = this.drag[from];
    this.shape[to] = this.shape[from]; this.rot[to] = this.rot[from];
    this.spin[to] = this.spin[from]; this.alpha[to] = this.alpha[from];
    this.floor[to] = this.floor[from];
  }

  update(dt) {
    const P = this.aPos.array, C = this.aColor.array, S = this.aSize.array, SH = this.aShape.array, R = this.aRot.array;
    let i = 0;
    while (i < this.count) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        this.count--;
        if (i !== this.count) this.copy(this.count, i);
        continue;
      }
      const i3 = i * 3;
      const t = this.life[i] / this.maxLife[i];
      this.v[i3 + 1] -= this.grav[i] * dt;
      const dr = Math.exp(-this.drag[i] * dt);
      this.v[i3] *= dr; this.v[i3 + 1] *= dr; this.v[i3 + 2] *= dr;
      this.p[i3] += this.v[i3] * dt;
      this.p[i3 + 1] += this.v[i3 + 1] * dt;
      this.p[i3 + 2] += this.v[i3 + 2] * dt;
      if (this.p[i3 + 1] < this.floor[i]) {
        this.p[i3 + 1] = this.floor[i];
        this.v[i3 + 1] *= -0.35;
        this.v[i3] *= 0.6; this.v[i3 + 2] *= 0.6;
      }
      this.rot[i] += this.spin[i] * dt;
      P[i3] = this.p[i3]; P[i3 + 1] = this.p[i3 + 1]; P[i3 + 2] = this.p[i3 + 2];
      const i4 = i * 4;
      C[i4] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * t;
      C[i4 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * t;
      C[i4 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * t;
      const fadeIn = Math.min(1, t * 8);
      const fadeOut = 1 - Math.pow(t, 2.2);
      C[i4 + 3] = this.alpha[i] * fadeIn * fadeOut;
      S[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      SH[i] = this.shape[i];
      R[i] = this.rot[i];
      i++;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.count);
    this.aPos.needsUpdate = true;
    this.aColor.needsUpdate = true;
    this.aSize.needsUpdate = true;
    this.aShape.needsUpdate = true;
    this.aRot.needsUpdate = true;
  }

  clear() { this.count = 0; }
}
