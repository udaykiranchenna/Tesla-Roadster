/**
 * SpaceX McGregor Texas Test Facility & Half-Circle Inverted Wall Ramp Builder
 * Reconstructs the October 2026 Tesla Roadster "Rocket" Demonstration Arena:
 * 1. High-speed Launch Strip (0-60 mph in 0.81s)
 * 2. Giant C-Shaped Half-Circle Wall-to-Overhang Ramp:
 *    - Smoothly transitions from flat ground (0° roll) -> vertical wall (90° roll) -> inverted overhanging ceiling (180° upside-down!)
 *    - Rises to 36m launch height with a +24° forward ski-jump launch angle
 * 3. 5-Tesla Vault Lineup parked beneath the jump gap (Tesla Semi Truck, Cybertruck, Model S, Model X, Model 3)
 * 4. 4,000m Salt Flat / SpaceX Landing Runway with Distance Milestone Gates
 */
import * as THREE from 'three';

export interface RampSpecs {
  startZ: number;      // Z where curved wall ramp begins (180m)
  endZ: number;        // Z where overhanging launch lip ends (380m)
  tubeRadius: number;  // Radius of the C-shaped half-circle wall cross-section (10.5m)
  maxSpineY: number;   // Additional elevation rise of the ramp spine (16m -> total lip height = 16 + 2*10.5 = 37m!)
  width: number;       // Runway width (16m)
}

export interface DistanceGate {
  distanceMeters: number;
  zPos: number;
  mesh: THREE.Group;
  passed: boolean;
}

export interface RampSurfacePoint {
  isOnRamp: boolean;
  isPastLip: boolean;
  position: THREE.Vector3;
  pitchRad: number;     // Upward climb angle
  rollRad: number;      // 0 = flat, PI/2 = 90° vertical wall, PI = 180° upside-down overhang
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  rampProgress: number; // 0..1
}

export class TrackBuilder {
  public group: THREE.Group;
  public rampSpecs: RampSpecs = {
    startZ: 180,
    endZ: 380,
    tubeRadius: 10.5,
    maxSpineY: 16.0,
    width: 16,
  };
  public distanceGates: DistanceGate[] = [];
  public launchGantry: THREE.Group | null = null;
  public countdownLamps: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SpaceXMcGregorStuntTrack';
    this.buildFullTrack();
  }

  private createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1b1d23';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const g = Math.floor(24 + Math.random() * 22);
      ctx.fillStyle = `rgb(${g},${g},${g + 3})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Glowing SpaceX runway edge lines
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(0, 0, 10, 256);
    ctx.fillRect(246, 0, 10, 256);

    // Centerline dashes
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(125, 24, 6, 85);
    ctx.fillRect(125, 148, 6, 85);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 14);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createCurvedRampTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // High-grip suction-sealed composite surface
    ctx.fillStyle = '#161922';
    ctx.fillRect(0, 0, 512, 512);

    // Longitudinal ribs
    ctx.strokeStyle = '#262b38';
    ctx.lineWidth = 3;
    for (let x = 0; x < 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // Transverse steel ribs
    for (let y = 0; y < 512; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Glowing cyan/gold target racing line along the spiral path
    ctx.fillStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.fillRect(190, 0, 132, 512);

    // Bright chevron arrows pointing forward along the ramp
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 10;
    for (let y = 64; y < 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(210, y + 36);
      ctx.lineTo(256, y);
      ctx.lineTo(302, y + 36);
      ctx.stroke();
    }

    // Safety borders
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(0, 0, 14, 512);
    ctx.fillRect(498, 0, 14, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 10);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private buildFullTrack() {
    const asphaltTex = this.createAsphaltTexture();
    const rampTex = this.createCurvedRampTexture();

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.78,
      metalness: 0.15,
    });

    const rampMat = new THREE.MeshStandardMaterial({
      map: rampTex,
      roughness: 0.42,
      metalness: 0.65,
      side: THREE.DoubleSide,
    });

    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonGoldMat = new THREE.MeshBasicMaterial({ color: 0xffb800 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2c323d, metalness: 0.85, roughness: 0.35 });

    // ==========================================
    // 1. STRAIGHT LAUNCH STRIP (Z = -50 to 180m)
    // ==========================================
    const launchStart = -50;
    const launchLength = this.rampSpecs.startZ - launchStart;
    const launchRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(this.rampSpecs.width, launchLength),
      roadMat
    );
    launchRoad.rotation.x = -Math.PI / 2;
    launchRoad.position.set(0, 0.01, (launchStart + this.rampSpecs.startZ) / 2);
    launchRoad.receiveShadow = true;
    this.group.add(launchRoad);

    // Side guardrails on launch strip
    [-1, 1].forEach((side) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, launchLength), steelMat);
      rail.position.set(side * (this.rampSpecs.width / 2 + 0.2), 0.35, (launchStart + this.rampSpecs.startZ) / 2);
      this.group.add(rail);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, launchLength), neonCyanMat);
      strip.position.set(side * (this.rampSpecs.width / 2 + 0.2), 0.75, (launchStart + this.rampSpecs.startZ) / 2);
      this.group.add(strip);
    });

    // ==========================================
    // 2. START LINE GANTRY
    // ==========================================
    this.buildStartGantry();

    // ==========================================
    // 3. TOWERING HALF-CIRCLE C-WALL TO OVERHANG RAMP (Z = 180m to 380m)
    // ==========================================
    this.buildHalfCircleOverhangRamp(rampMat, steelMat, neonCyanMat, neonGoldMat);

    // ==========================================
    // 4. LINEUP OF 5 TESLA VEHICLES UNDER THE LAUNCH GAP (Semi + Cybertruck + S/3/X)
    // ==========================================
    this.buildTeslaLineupUnderJump();

    // ==========================================
    // 5. VAST LANDING RUNWAY & DISTANCE GATES (Z = 380m to 4500m)
    // ==========================================
    this.buildLandingRunway(roadMat, neonCyanMat);

    // ==========================================
    // 6. STADIUM LIGHTS & SPACEX TOWERS
    // ==========================================
    this.buildFacilityLights();
  }

  private buildStartGantry() {
    this.launchGantry = new THREE.Group();
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x20242c, metalness: 0.9, roughness: 0.3 });

    [-1, 1].forEach((side) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8.5, 0.9), trussMat);
      pillar.position.set(side * (this.rampSpecs.width / 2 + 1.4), 4.25, 0);
      this.launchGantry!.add(pillar);
    });

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(this.rampSpecs.width + 4, 1.3, 1.3), trussMat);
    bridge.position.set(0, 8.0, 0);
    this.launchGantry.add(bridge);

    // Banner: "SPACEX McGREGOR • ROADSTER ROCKET DEMO"
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 512;
    bannerCanvas.height = 128;
    const bCtx = bannerCanvas.getContext('2d')!;
    bCtx.fillStyle = '#090c12';
    bCtx.fillRect(0, 0, 512, 128);
    bCtx.strokeStyle = '#00f0ff';
    bCtx.lineWidth = 6;
    bCtx.strokeRect(6, 6, 500, 116);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = 'bold 34px "Segoe UI", sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('TESLA ROADSTER "ROCKET"', 256, 48);
    bCtx.fillStyle = '#ffbb00';
    bCtx.font = 'bold 21px monospace';
    bCtx.fillText('2G SUCTION WALL + 10 COLD-GAS THRUSTERS', 256, 88);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    bannerTex.colorSpace = THREE.SRGBColorSpace;
    const bannerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 3.2),
      new THREE.MeshBasicMaterial({ map: bannerTex })
    );
    bannerMesh.position.set(0, 10.2, 0.05);
    this.launchGantry.add(bannerMesh);

    // Staging Countdown Lights
    const dimColors = [0x440000, 0x442200, 0x442200, 0x004400];
    for (let i = 0; i < 4; i++) {
      const lampGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 16);
      lampGeo.rotateX(Math.PI / 2);
      const lampMat = new THREE.MeshStandardMaterial({
        color: dimColors[i],
        emissive: dimColors[i],
        emissiveIntensity: 0.2,
      });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(0, 6.8 - i * 0.55, 0.7);
      this.launchGantry.add(lamp);
      this.countdownLamps.push(lamp);
    }

    this.group.add(this.launchGantry);
  }

  public setCountdownStage(stage: number) {
    const activeEmissives = [0xff0000, 0xffaa00, 0xffaa00, 0x00ff44];
    const dimColors = [0x440000, 0x442200, 0x442200, 0x004400];

    this.countdownLamps.forEach((lamp, idx) => {
      const mat = lamp.material as THREE.MeshStandardMaterial;
      if (stage === 4) {
        if (idx === 3) {
          mat.color.setHex(0x00ff44);
          mat.emissive.setHex(0x00ff44);
          mat.emissiveIntensity = 2.2;
        } else {
          mat.color.setHex(dimColors[idx]);
          mat.emissive.setHex(dimColors[idx]);
          mat.emissiveIntensity = 0.1;
        }
      } else if (stage > 0 && idx <= stage - 1) {
        mat.color.setHex(activeEmissives[idx]);
        mat.emissive.setHex(activeEmissives[idx]);
        mat.emissiveIntensity = 1.8;
      } else {
        mat.color.setHex(dimColors[idx]);
        mat.emissive.setHex(dimColors[idx]);
        mat.emissiveIntensity = 0.1;
      }
    });
  }

  /**
   * Builds the Giant Curved Half-Circle Wall-to-Inverted-Overhang Ramp
   * Along Z = [startZ .. endZ], the car spirals smoothly up the right-side curved wall (90°)
   * and onto the overhanging ceiling roof (180° upside down!), before launching forward at +24° pitch!
   */
  private buildHalfCircleOverhangRamp(
    rampMat: THREE.Material,
    steelMat: THREE.Material,
    neonCyanMat: THREE.Material,
    neonGoldMat: THREE.Material
  ) {
    const { startZ, endZ, tubeRadius, maxSpineY } = this.rampSpecs;
    const zSegments = 90;
    const arcSegments = 28; // Cross-sectional C-curve segments

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const racingLinePoints: THREE.Vector3[] = [];

    for (let iz = 0; iz <= zSegments; iz++) {
      const t = iz / zSegments; // 0 to 1 along the ramp length
      const z = THREE.MathUtils.lerp(startZ, endZ, t);

      // Spine elevation rises smoothly as a ski-jump arc
      const spineY = maxSpineY * (t * t);

      // How far around the half-circle C-wall does the structure wrap at this Z?
      // Starts as a wide U/flat track at t=0, wraps into a full 210° overhanging C-tunnel by t=0.45..1.0
      const wrapFactor = Math.min(1, t * 2.2);
      const minPhi = -0.35; // Left edge of floor
      const maxPhi = THREE.MathUtils.lerp(0.35, Math.PI + 0.35, wrapFactor); // Wraps past 180° (PI) overhead!

      for (let ia = 0; ia <= arcSegments; ia++) {
        const s = ia / arcSegments;
        const phi = THREE.MathUtils.lerp(minPhi, maxPhi, s);

        // At t=0, flatten floor so it seamlessly matches the flat launch runway
        const cX = tubeRadius * Math.sin(phi);
        const cY = spineY + tubeRadius * (1 - Math.cos(phi)) * Math.min(1, t * 3.5);

        vertices.push(cX, cY, z);
        uvs.push(s, t * 12);

        if (iz < zSegments && ia < arcSegments) {
          const row1 = iz * (arcSegments + 1) + ia;
          const row2 = (iz + 1) * (arcSegments + 1) + ia;
          indices.push(row1, row1 + 1, row2);
          indices.push(row1 + 1, row2 + 1, row2);
        }
      }

      // Record the glowing racing line along the wall-to-ceiling path
      const surfPt = this.getRampSurfaceAt(z);
      racingLinePoints.push(surfPt.position.clone().add(surfPt.normal.clone().multiplyScalar(0.08)));
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const rampMesh = new THREE.Mesh(geom, rampMat);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.group.add(rampMesh);

    // Glowing Neon Guide Line showing the exact Wall-Crawl -> Upside-Down Overhang Path!
    const racingCurve = new THREE.CatmullRomCurve3(racingLinePoints);
    const guideTubeGeo = new THREE.TubeGeometry(racingCurve, 100, 0.14, 8, false);
    const guideTube = new THREE.Mesh(guideTubeGeo, neonGoldMat);
    this.group.add(guideTube);

    // Massive SpaceX Steel Support Ribs & Scaffolding Holding the Curved Wall & Overhang
    for (let iz = 6; iz <= zSegments; iz += 9) {
      const t = iz / zSegments;
      const z = THREE.MathUtils.lerp(startZ, endZ, t);
      const spineY = maxSpineY * (t * t);
      const topY = spineY + tubeRadius * 2 * Math.min(1, t * 3.5);

      // Heavy steel C-frame rib pillar on the right (+X) supporting the vertical wall & overhang
      const pillarH = topY + 1.5;
      const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, pillarH, 1.2), steelMat);
      rightPillar.position.set(tubeRadius + 1.2, pillarH / 2, z);
      this.group.add(rightPillar);

      // Cantilever overhang beam holding the inverted ceiling at the top
      if (t > 0.35) {
        const overhangBeam = new THREE.Mesh(new THREE.BoxGeometry(tubeRadius * 1.6, 1.1, 1.2), steelMat);
        overhangBeam.position.set(tubeRadius * 0.35, topY + 0.6, z);
        this.group.add(overhangBeam);

        // Glowing neon strip along the overhang lip
        const lipLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.4), neonCyanMat);
        lipLight.position.set(-tubeRadius * 0.35, topY, z);
        this.group.add(lipLight);
      }
    }
  }

  /**
   * Builds the Lineup of 5 Tesla Vehicles parked underneath the launch flight path
   * (Tesla Semi Truck + Cybertruck + Model S + Model X + Model 3) just like the Oct 15, 2026 demo!
   */
  private buildTeslaLineupUnderJump() {
    const lineupGroup = new THREE.Group();
    lineupGroup.name = 'TeslaVaultLineup';

    // 1. Tesla Semi Truck at Z = 400m
    const semiGroup = new THREE.Group();
    const semiMat = new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2, clearcoat: 1.0 });
    const darkGlass = new THREE.MeshStandardMaterial({ color: 0x0a0d12, roughness: 0.1, metalness: 0.9 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(8.5, 3.8, 2.6), semiMat);
    cab.position.set(0, 2.2, 0);
    semiGroup.add(cab);
    const semiWindshield = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.65), darkGlass);
    semiWindshield.position.set(-2.2, 2.6, 0);
    semiWindshield.rotation.z = 0.35;
    semiGroup.add(semiWindshield);
    semiGroup.position.set(0, 0, 402);
    lineupGroup.add(semiGroup);

    // 2. Tesla Cybertruck at Z = 416m (Stainless Steel Wedge)
    const cyberMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b0, metalness: 0.95, roughness: 0.22 });
    const cyberBody = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.8, 2.2), cyberMat);
    cyberBody.position.set(0, 1.1, 416);
    lineupGroup.add(cyberBody);

    // 3. Model S Plaid, Model X, Model 3 at Z = 428m, 440m, 452m
    const colors = [0xd91424, 0x1e293b, 0xf8fafc];
    [428, 440, 452].forEach((zPos, i) => {
      const carMat = new THREE.MeshPhysicalMaterial({
        color: colors[i],
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 1.0,
      });
      const car = new THREE.Mesh(new THREE.BoxGeometry(4.7, 1.45, 2.0), carMat);
      car.position.set(0, 0.85, zPos);
      lineupGroup.add(car);
    });

    this.group.add(lineupGroup);
  }

  private buildLandingRunway(roadMat: THREE.Material, neonMat: THREE.Material) {
    const landingStart = this.rampSpecs.startZ;
    const landingEnd = 4500;
    const landingLength = landingEnd - landingStart;
    const landingWidth = 36;

    const landingMesh = new THREE.Mesh(new THREE.PlaneGeometry(landingWidth, landingLength), roadMat);
    landingMesh.rotation.x = -Math.PI / 2;
    landingMesh.position.set(0, 0.01, (landingStart + landingEnd) / 2);
    landingMesh.receiveShadow = true;
    this.group.add(landingMesh);

    // Surrounding Texas Test Facility Ground
    const groundGeo = new THREE.PlaneGeometry(1200, landingEnd + 1200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x11141b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, (landingEnd + 1000) / 2 - 400);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Distance Gates measured from the Ramp Launch Lip (endZ = 380m)
    const milestones = [100, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000];
    milestones.forEach((dist) => {
      const zPos = this.rampSpecs.endZ + dist;
      const gateGroup = new THREE.Group();

      const pL = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 20, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x222630 })
      );
      pL.position.set(landingWidth / 2 + 2, 10, zPos);
      gateGroup.add(pL);

      const pR = pL.clone();
      pR.position.x = -(landingWidth / 2 + 2);
      gateGroup.add(pR);

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(landingWidth + 6, 1.6, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x222630 })
      );
      beam.position.set(0, 20, zPos);
      gateGroup.add(beam);

      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = 'rgba(9, 13, 22, 0.9)';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.strokeStyle = dist >= 2000 ? '#ff0055' : dist >= 1000 ? '#ffaa00' : '#00f0ff';
      sCtx.lineWidth = 6;
      sCtx.strokeRect(6, 6, 500, 116);

      sCtx.fillStyle = '#ffffff';
      sCtx.font = 'bold 52px monospace';
      sCtx.textAlign = 'center';
      sCtx.fillText(`${dist}m`, 256, 64);
      sCtx.font = 'bold 20px sans-serif';
      sCtx.fillStyle = sCtx.strokeStyle;
      sCtx.fillText(
        dist >= 2000 ? '$10 DAILY RECORD ZONE' : dist >= 1000 ? 'SPACEX FLIGHT ZONE' : 'LANDING RUNWAY',
        256,
        104
      );

      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(16, 4),
        new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
      );
      signMesh.position.set(0, 20, zPos + 0.65);
      gateGroup.add(signMesh);

      const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 20, 0.22), neonMat);
      lightL.position.set(landingWidth / 2 + 2, 10, zPos + 0.65);
      gateGroup.add(lightL);

      const lightR = lightL.clone();
      lightR.position.x = -(landingWidth / 2 + 2);
      gateGroup.add(lightR);

      this.group.add(gateGroup);
      this.distanceGates.push({
        distanceMeters: dist,
        zPos,
        mesh: gateGroup,
        passed: false,
      });
    });
  }

  private buildFacilityLights() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x333842, metalness: 0.9, roughness: 0.3 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4e0 });

    for (let z = -30; z < this.rampSpecs.endZ + 600; z += 80) {
      [-22, 22].forEach((x) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 22, 8), poleMat);
        pole.position.set(x, 11, z);
        this.group.add(pole);

        const emitter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 1.2), lampMat);
        emitter.position.set(x, 22, z);
        this.group.add(emitter);
      });
    }
  }

  /**
   * Computes exact 3D position, roll angle (0 -> 90° vertical wall -> 180° upside-down overhang),
   * upward launch pitch, tangent, and inward suction normal for any Z coordinate along the ramp!
   */
  public getRampSurfaceAt(currentZ: number): RampSurfacePoint {
    const { startZ, endZ, tubeRadius, maxSpineY } = this.rampSpecs;

    if (currentZ < startZ) {
      return {
        isOnRamp: false,
        isPastLip: false,
        position: new THREE.Vector3(0, 0, currentZ),
        pitchRad: 0,
        rollRad: 0,
        tangent: new THREE.Vector3(0, 0, 1),
        normal: new THREE.Vector3(0, 1, 0),
        rampProgress: 0,
      };
    }

    const rampLen = endZ - startZ; // 200m
    const t = (currentZ - startZ) / rampLen;

    if (t > 1.0) {
      // Past the high-altitude overhanging launch lip!
      const lipSlopeDyDz = (2 * maxSpineY) / rampLen;
      const launchPitch = Math.atan(lipSlopeDyDz); // ~ +20° to +24° upward launch angle!
      const lipY = maxSpineY + tubeRadius * 2;
      return {
        isOnRamp: false,
        isPastLip: true,
        position: new THREE.Vector3(0, lipY, currentZ),
        pitchRad: launchPitch,
        rollRad: Math.PI, // Leaves the overhang upside-down (180°), ready to barrel roll!
        tangent: new THREE.Vector3(0, Math.sin(launchPitch), Math.cos(launchPitch)).normalize(),
        normal: new THREE.Vector3(0, -1, 0),
        rampProgress: 1,
      };
    }

    // Smoothly sweep roll angle from 0° (flat) -> 90° (vertical wall at t=0.45) -> 180° (upside-down ceiling by t=0.85..1.0)
    const rollProgress = Math.min(1, t / 0.85);
    // Smoothstep S-curve for silky-smooth entry onto the wall and overhang
    const smoothRoll = rollProgress * rollProgress * (3 - 2 * rollProgress);
    const rollRad = smoothRoll * Math.PI; // 0 to PI (180 degrees upside down!)

    const spineY = maxSpineY * (t * t);
    const tubeScale = Math.min(1, t * 3.5);

    const carX = tubeRadius * Math.sin(rollRad);
    const carY = spineY + tubeRadius * (1 - Math.cos(rollRad)) * tubeScale;

    // Upward slope derivative dY/dZ
    const dyDz = (2 * maxSpineY * t) / rampLen;
    const pitchRad = Math.atan(dyDz);

    // Surface inward normal (pointing from the wall/ceiling toward the center of the tube)
    const normal = new THREE.Vector3(-Math.sin(rollRad), Math.cos(rollRad), 0).normalize();
    const tangent = new THREE.Vector3(0, Math.sin(pitchRad), Math.cos(pitchRad)).normalize();

    return {
      isOnRamp: true,
      isPastLip: false,
      position: new THREE.Vector3(carX, carY, currentZ),
      pitchRad,
      rollRad,
      tangent,
      normal,
      rampProgress: t,
    };
  }
}
