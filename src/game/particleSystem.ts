/**
 * 3D Tire Smoke & Airborne Reaction Thruster Plume Particle System
 * - Ground/Wall: High-G tire friction & RWD launch burnout smoke from tires
 * - Flying (Airborne ONLY):
 *   • Press LEFT Arrow (car moves LEFT) -> Thruster jet & cryo-smoke shoot out from the RIGHT side of the car!
 *   • Press RIGHT Arrow (car moves RIGHT) -> Thruster jet & cryo-smoke shoot out from the LEFT side of the car!
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

  // Reusable world-space vector helpers (Zero-GC)
  private readonly _wheelLocal = new THREE.Vector3();
  private readonly _wheelWorld = new THREE.Vector3();
  private readonly _normalOffset = new THREE.Vector3();
  private readonly _exhaustDir = new THREE.Vector3();

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
   * Spawns airborne opposite-side reaction thruster plumes & ground tire smoke
   */
  public emitFromRoadster(params: {
    carPosition: THREE.Vector3;
    carQuaternion: THREE.Quaternion;
    surfaceNormal: THREE.Vector3;
    speedMph: number;
    lateralG: number;
    longitudinalG: number;
    thrusterBurstIntensity: number;
    isOnGroundOrWall: boolean;
    touchdownBurst: number;
    rollDir: number; // < 0 = Left Arrow pressed (move LEFT, thruster on RIGHT!), > 0 = Right Arrow pressed (move RIGHT, thruster on LEFT!)
  }) {
    const {
      carPosition,
      carQuaternion,
      surfaceNormal,
      speedMph,
      lateralG,
      longitudinalG,
      thrusterBurstIntensity,
      isOnGroundOrWall,
      touchdownBurst,
      rollDir,
    } = params;

    // Rear exhaust vector in world space (local -Z of the car)
    this._exhaustDir.set(0, 0, -1).applyQuaternion(carQuaternion);

    // =========================================================================
    // 1. AIRBORNE-ONLY OPPOSITE-SIDE REACTION THRUSTER EFFECT
    //    When flying in +Z (camera behind looking toward +Z):
    //    - Screen LEFT is World +X, Screen RIGHT is World -X.
    //    - When player presses LEFT (rollDir < 0):
    //      Car moves to Screen LEFT (+X), and thruster jet fires on Screen RIGHT (-X side of car, shooting toward -X)!
    //    - When player presses RIGHT (rollDir > 0):
    //      Car moves to Screen RIGHT (-X), and thruster jet fires on Screen LEFT (+X side of car, shooting toward +X)!
    // =========================================================================
    if (!isOnGroundOrWall && Math.abs(rollDir) > 0.05) {
      // rollDir < 0 (Left pressed)  -> worldOutwardX = -1 (Screen RIGHT side of car!)
      // rollDir > 0 (Right pressed) -> worldOutwardX = +1 (Screen LEFT side of car!)
      const worldOutwardX = rollDir < 0 ? -1 : 1;

      const nozzleZOffsets = [-0.65, 0.85];
      nozzleZOffsets.forEach((zOff) => {
        for (let i = 0; i < 3; i++) {
          const spawnX = carPosition.x + worldOutwardX * (1.05 + Math.random() * 0.15);
          const spawnY = carPosition.y + 0.35 + (Math.random() - 0.5) * 0.16;
          const spawnZ = carPosition.z + zOff + (Math.random() - 0.5) * 0.22;

          const jetSpeed = 10.5 + Math.random() * 6.5;
          this.spawnPuff(
            spawnX,
            spawnY,
            spawnZ,
            worldOutwardX * jetSpeed,
            -1.2 + (Math.random() - 0.5) * 1.6,
            (Math.random() - 0.5) * 2.5,
            0.85,
            3.8,
            0.42 + Math.random() * 0.22,
            0.78,
            0.82,
            0.96,
            1.0 // Bright icy-cyan/white SpaceX cold-gas thruster jet
          );
        }
      });
    }

    // =========================================================================
    // 2. GROUND / RAMP TIRE FRICTION SMOKE (Only when tires are on ground/wall)
    // =========================================================================
    const highGCornering = isOnGroundOrWall && (lateralG > 0.65 || longitudinalG > 1.85) && speedMph > 15;
    const isBurnoutLaunch = isOnGroundOrWall && speedMph < 95 && longitudinalG > 1.6;

    if (highGCornering || isBurnoutLaunch || touchdownBurst > 0.1) {
      const tireOffsets =
        lateralG > 0.8 || touchdownBurst > 0.1
          ? [
              { x: 0.94, y: 0.06, z: -1.30 },
              { x: -0.94, y: 0.06, z: -1.30 },
              { x: 0.91, y: 0.06, z: 1.35 },
              { x: -0.91, y: 0.06, z: 1.35 },
            ]
          : [
              { x: 0.94, y: 0.06, z: -1.30 },
              { x: -0.94, y: 0.06, z: -1.30 },
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
          this._wheelWorld.copy(this._wheelLocal).applyQuaternion(carQuaternion).add(carPosition);

          this._normalOffset.copy(surfaceNormal).multiplyScalar(1.1 + Math.random() * 1.5);
          const lateralSpread = (off.x > 0 ? 1 : -1) * (1.1 + lateralG * 1.3 + Math.random() * 1.2);

          this.spawnPuff(
            this._wheelWorld.x,
            this._wheelWorld.y,
            this._wheelWorld.z,
            this._normalOffset.x + lateralSpread,
            this._normalOffset.y + this._exhaustDir.y * 2.5,
            this._normalOffset.z + this._exhaustDir.z * (2.5 + Math.random() * 3.0),
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

    // 3. Rear Cold-Gas Thruster Boost Plume (Straight behind car)
    if (thrusterBurstIntensity > 0.05) {
      const burstCount = thrusterBurstIntensity > 0.65 ? 4 : 2;
      for (let i = 0; i < burstCount; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        this._wheelLocal.set(
          side * (0.35 + Math.random() * 0.45),
          0.25 + (Math.random() - 0.5) * 0.15,
          -2.25 - Math.random() * 0.4
        );
        this._wheelWorld.copy(this._wheelLocal).applyQuaternion(carQuaternion).add(carPosition);

        const exhaustSpeed = 8.0 + Math.random() * 6.0 * thrusterBurstIntensity;
        this.spawnPuff(
          this._wheelWorld.x,
          this._wheelWorld.y,
          this._wheelWorld.z,
          this._exhaustDir.x * exhaustSpeed,
          this._exhaustDir.y * exhaustSpeed + (Math.random() - 0.4) * 1.8,
          this._exhaustDir.z * exhaustSpeed,
          0.75 + thrusterBurstIntensity * 0.45,
          4.0 + thrusterBurstIntensity * 2.6,
          0.52 + Math.random() * 0.35,
          Math.min(0.75, 0.35 + thrusterBurstIntensity * 0.4),
          0.92,
          0.97,
          1.0
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
      const t = p.age / p.maxLife;

      const drag = Math.exp(-2.6 * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * drag + 0.9 * dt;

      this.positions[i * 3 + 0] += p.vx * dt;
      this.positions[i * 3 + 1] += p.vy * dt;
      this.positions[i * 3 + 2] += p.vz * dt;

      const sizeCurve = 1 - Math.pow(1 - t, 2.2);
      this.sizes[i] = THREE.MathUtils.lerp(p.startSize, p.endSize, sizeCurve);

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
