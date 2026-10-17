/**
 * 3D Tire Smoke & Cryo-Nitrogen Thruster Cloud Particle System
 * Generates volumetric billowing smoke trails from tire contact patches and thruster exhaust:
 * - High G-force cornering / lateral drift friction smoke
 * - Sudden 10,000-PSI Cold-Gas Thruster activation & 0.55s RWD launch burnout clouds
 * - 2.3G Curved Wall-Climb friction trails & high-speed touchdown tire scrub smoke
 * Zero-GC pooled particle buffer with per-particle expansion, rotation, and alpha fade
 */
import * as THREE from 'three';

const MAX_PARTICLES = 700;

interface SmokeParticleData {
  active: boolean;
  age: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  startSize: number;
  endSize: number;
  baseAlpha: number;
  rotationSpeed: number;
}

export class TireSmokeParticleSystem {
  public mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private rotations: Float32Array;
  private colors: Float32Array;
  private pool: SmokeParticleData[] = [];
  private nextIdx: number = 0;

  // Reusable world-space wheel offset helpers (Zero-GC)
  private readonly _wheelLocal = new THREE.Vector3();
  private readonly _wheelWorld = new THREE.Vector3();
  private readonly _normalOffset = new THREE.Vector3();

  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);
    this.rotations = new Float32Array(MAX_PARTICLES);
    this.colors = new Float32Array(MAX_PARTICLES * 3);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        age: 0,
        maxLife: 1.0,
        vx: 0,
        vy: 0,
        vz: 0,
        startSize: 0.5,
        endSize: 3.5,
        baseAlpha: 0.6,
        rotationSpeed: 0,
      });
      this.alphas[i] = 0;
      this.sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('aRotation', new THREE.BufferAttribute(this.rotations, 1));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));

    const smokeTex = this.createVolumetricSmokeTexture();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: smokeTex },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aRotation;
        attribute vec3 aColor;
        varying float vAlpha;
        varying float vRotation;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vAlpha = aAlpha;
          vRotation = aRotation;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * uPixelRatio * (340.0 / max(1.0, -mvPosition.z));
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying float vAlpha;
        varying float vRotation;
        varying vec3 vColor;

        void main() {
          if (vAlpha <= 0.005) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 rotatedUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + vec2(0.5);
          vec4 texColor = texture2D(uMap, rotatedUV);
          gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.mesh = new THREE.Points(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  private createVolumetricSmokeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 128, 128);

    // Multi-lobe soft cloud puff for realistic tire smoke & cryo-nitrogen vapor
    const lobes = [
      { x: 64, y: 64, r: 54, a: 0.65 },
      { x: 50, y: 56, r: 38, a: 0.45 },
      { x: 78, y: 58, r: 36, a: 0.45 },
      { x: 60, y: 76, r: 38, a: 0.45 },
    ];

    lobes.forEach((lobe) => {
      const grad = ctx.createRadialGradient(lobe.x, lobe.y, 4, lobe.x, lobe.y, lobe.r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`);
      grad.addColorStop(0.45, `rgba(235, 242, 250, ${lobe.a * 0.65})`);
      grad.addColorStop(1, 'rgba(200, 215, 230, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public spawnPuff(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    startSize: number,
    endSize: number,
    maxLife: number,
    baseAlpha: number,
    r: number = 0.92,
    g: number = 0.95,
    b: number = 0.99
  ) {
    const idx = this.nextIdx;
    this.nextIdx = (this.nextIdx + 1) % MAX_PARTICLES;

    const p = this.pool[idx];
    p.active = true;
    p.age = 0;
    p.maxLife = maxLife;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.startSize = startSize;
    p.endSize = endSize;
    p.baseAlpha = baseAlpha;
    p.rotationSpeed = (Math.random() - 0.5) * 3.2;

    this.positions[idx * 3 + 0] = x;
    this.positions[idx * 3 + 1] = y;
    this.positions[idx * 3 + 2] = z;

    this.sizes[idx] = startSize;
    this.alphas[idx] = baseAlpha;
    this.rotations[idx] = Math.random() * Math.PI * 2;

    this.colors[idx * 3 + 0] = r;
    this.colors[idx * 3 + 1] = g;
    this.colors[idx * 3 + 2] = b;
  }

  /**
   * Spawns tire friction smoke and sudden thruster ground clouds around the Roadster
   */
  public emitFromRoadster(params: {
    carPosition: THREE.Vector3;
    carRotation: THREE.Euler;
    surfaceNormal: THREE.Vector3;
    speedMph: number;
    lateralG: number;
    longitudinalG: number;
    thrusterBurstIntensity: number; // 0..1 (1 on sudden thruster activation!)
    isOnGroundOrWall: boolean;
    touchdownBurst: number; // 0..1 on landing impact
  }) {
    const {
      carPosition,
      carRotation,
      surfaceNormal,
      speedMph,
      lateralG,
      longitudinalG,
      thrusterBurstIntensity,
      isOnGroundOrWall,
      touchdownBurst,
    } = params;

    // 1. High G-Force Cornering / Drift / Wall-Climb Friction Tire Smoke
    const highGCornering = isOnGroundOrWall && (lateralG > 0.65 || longitudinalG > 1.85) && speedMph > 15;
    const isBurnoutLaunch = isOnGroundOrWall && speedMph < 95 && longitudinalG > 1.6;

    if (highGCornering || isBurnoutLaunch || touchdownBurst > 0.1) {
      // Rear RWD tires (+ front tires during high lateral G cornering or touchdown)
      const tireOffsets =
        lateralG > 0.8 || touchdownBurst > 0.1
          ? [
              { x: 0.94, y: -0.26, z: -1.30 },  // Rear Left
              { x: -0.94, y: -0.26, z: -1.30 }, // Rear Right
              { x: 0.91, y: -0.26, z: 1.35 },   // Front Left
              { x: -0.91, y: -0.26, z: 1.35 },  // Front Right
            ]
          : [
              { x: 0.94, y: -0.26, z: -1.30 },  // Rear Left RWD
              { x: -0.94, y: -0.26, z: -1.30 }, // Rear Right RWD
            ];

      const intensity = Math.min(
        1.0,
        Math.max(
          (lateralG - 0.5) * 0.7,
          (longitudinalG - 1.5) * 0.45,
          touchdownBurst
        )
      );

      const puffsPerTire = intensity > 0.6 ? 2 : 1;

      tireOffsets.forEach((off) => {
        for (let i = 0; i < puffsPerTire; i++) {
          this._wheelLocal.set(
            off.x + (Math.random() - 0.5) * 0.22,
            off.y,
            off.z + (Math.random() - 0.5) * 0.25
          );
          this._wheelWorld.copy(this._wheelLocal).applyEuler(carRotation).add(carPosition);

          // Billow outward & along surface normal
          this._normalOffset.copy(surfaceNormal).multiplyScalar(1.2 + Math.random() * 1.8);
          const lateralSpread = (off.x > 0 ? 1 : -1) * (1.2 + lateralG * 1.5 + Math.random() * 1.4);

          this.spawnPuff(
            this._wheelWorld.x,
            this._wheelWorld.y,
            this._wheelWorld.z,
            this._normalOffset.x + lateralSpread,
            this._normalOffset.y + 0.8 + Math.random() * 1.2,
            this._normalOffset.z - 2.5 - Math.random() * 3.0,
            0.65 + intensity * 0.35,
            3.2 + intensity * 2.6,
            0.65 + Math.random() * 0.45,
            Math.min(0.68, 0.28 + intensity * 0.38),
            0.88,
            0.90,
            0.94
          );
        }
      });
    }

    // 2. Sudden 10,000-PSI Cold-Gas Thruster Activation & Cryo-Nitrogen Ground Plume (Screenshot 4!)
    if (thrusterBurstIntensity > 0.05) {
      const burstCount = thrusterBurstIntensity > 0.65 ? 5 : 3;
      for (let i = 0; i < burstCount; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        this._wheelLocal.set(
          side * (0.45 + Math.random() * 0.55),
          -0.18 + (Math.random() - 0.5) * 0.15,
          -2.25 - Math.random() * 0.4
        );
        this._wheelWorld.copy(this._wheelLocal).applyEuler(carRotation).add(carPosition);

        this.spawnPuff(
          this._wheelWorld.x,
          this._wheelWorld.y,
          this._wheelWorld.z,
          side * (2.2 + Math.random() * 3.5 * thrusterBurstIntensity),
          (isOnGroundOrWall ? 1.4 : 0.4) + (Math.random() - 0.3) * 2.2,
          -8.0 - Math.random() * 6.0 * thrusterBurstIntensity,
          0.75 + thrusterBurstIntensity * 0.45,
          4.2 + thrusterBurstIntensity * 2.8,
          0.55 + Math.random() * 0.4,
          Math.min(0.75, 0.35 + thrusterBurstIntensity * 0.4),
          0.92,
          0.97,
          1.0 // Crisp icy-white cryo nitrogen cloud tint
        );
      }
    }
  }

  public update(dt: number) {
    let anyActive = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.age += dt;
      if (p.age >= p.maxLife) {
        p.active = false;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        anyActive = true;
        continue;
      }

      anyActive = true;
      const t = p.age / p.maxLife; // 0..1

      // Exponential air drag on smoke puff velocity + gentle upward thermal buoyancy
      const drag = Math.exp(-2.6 * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * drag + 0.9 * dt;

      this.positions[i * 3 + 0] += p.vx * dt;
      this.positions[i * 3 + 1] += p.vy * dt;
      this.positions[i * 3 + 2] += p.vz * dt;

      // Expand size rapidly at first, then billow
      const sizeCurve = 1 - Math.pow(1 - t, 2.2);
      this.sizes[i] = THREE.MathUtils.lerp(p.startSize, p.endSize, sizeCurve);

      // Smooth fade-in and fade-out envelope
      const fadeIn = Math.min(1.0, t * 6.0);
      const fadeOut = Math.pow(1.0 - t, 1.6);
      this.alphas[i] = p.baseAlpha * fadeIn * fadeOut;

      this.rotations[i] += p.rotationSpeed * dt;
    }

    if (anyActive) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.aSize.needsUpdate = true;
      this.geometry.attributes.aAlpha.needsUpdate = true;
      this.geometry.attributes.aRotation.needsUpdate = true;
      this.geometry.attributes.aColor.needsUpdate = true;
    }
  }

  public reset() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool[i].active = false;
      this.alphas[i] = 0;
      this.sizes[i] = 0;
    }
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  public dispose() {
    this.geometry.dispose();
    const mat = this.mesh.material as THREE.ShaderMaterial;
    if (mat.uniforms.uMap.value) {
      mat.uniforms.uMap.value.dispose();
    }
    mat.dispose();
  }
}
