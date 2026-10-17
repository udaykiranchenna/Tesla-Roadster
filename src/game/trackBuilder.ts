/**
 * Exact C-Shaped Vertical Inverted Ramp & Arena Builder
 * Reconstructs the exact C-Ramp from the SpaceX demonstration screenshots:
 * - Towering C-shaped vertical half-loop ramp (0° flat entry -> 90° vertical wall -> 170° upside-down overhang!)
 * - Concrete-grey single-lane surface with crisp white centerline stripe
 * - Glowing RED neon LED edge rails along both sides of the C-ramp
 * - Red structural I-beam spine & white/silver steel box-truss scaffolding tower behind the curve
 * - Upward-angled blue/cyan stadium searchlight beams at the base & white truss spotlights at the overhang
 * - Long forward (+Z) landing runway with distance milestone gates for the Daily $10 Jump Challenge
 */
import * as THREE from 'three';

export interface RampSpecs {
  approachLength: number; // Flat approach run into the bottom of the C-ramp (130m)
  radius: number;         // Radius of the vertical C-curve (15.0m -> ~109 ft top overhang height!)
  maxAngleDeg: number;    // 170 degrees (PITCH: 170 DEG upside-down overhang, matching Screenshot 6 & 8!)
  overhangLength: number; // Straight upside-down overhanging extension at the top of the C (20m)
  width: number;          // Single-lane stunt ramp width (8.5m)
  launchLipZ: number;     // Z coordinate where the top overhang lip releases the car
  launchLipY: number;     // Y altitude of the top overhang lip (~33.24m / ~109 ft)
}

export interface DistanceGate {
  distanceMeters: number;
  zPos: number;
  mesh: THREE.Group;
  passed: boolean;
}

export interface CRampPoint {
  isOnApproach: boolean;
  isOnRamp: boolean;
  isPastLip: boolean;
  position: THREE.Vector3;
  thetaRad: number;     // 0 = flat approach (-Z), PI/2 = 90° vertical, 170° (2.967 rad) = upside-down overhang (+Z)
  pitchDeg: number;     // 0 to 170 deg (matches broadcast gauge PITCH: 170 DEG)
  forward: THREE.Vector3;
  up: THREE.Vector3;    // Points from wheels through roof (at 170°, points DOWN -Y because car is upside-down!)
  right: THREE.Vector3;
}

export class TrackBuilder {
  public group: THREE.Group;
  public rampSpecs: RampSpecs;
  public distanceGates: DistanceGate[] = [];
  public launchGantry: THREE.Group | null = null;
  public countdownLamps: THREE.Mesh[] = [];

  public readonly arcLength: number;
  public readonly totalTrackLength: number;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SpaceXInvertedCRampArena';

    const radius = 15.0;
    const maxAngleDeg = 170;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180;
    const overhangLength = 20.0;
    const approachLength = 130.0;

    this.arcLength = radius * maxAngleRad;
    this.totalTrackLength = approachLength + this.arcLength + overhangLength;

    const endArcZ = -radius * Math.sin(maxAngleRad);
    const endArcY = radius * (1 - Math.cos(maxAngleRad));
    const launchLipZ = endArcZ - overhangLength * Math.cos(maxAngleRad);
    const launchLipY = endArcY + overhangLength * Math.sin(maxAngleRad);

    this.rampSpecs = {
      approachLength,
      radius,
      maxAngleDeg,
      overhangLength,
      width: 8.5,
      launchLipZ,
      launchLipY,
    };

    this.buildFullArena();
  }

  /**
   * Concrete-grey ramp surface texture with crisp white centerline stripe and tire marks
   * (Exact match to Screenshots 2, 3, 4, 6)
   */
  private createCRampSurfaceTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Smooth grey concrete ramp surface
    ctx.fillStyle = '#6c727a';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle concrete panel joints & texture mottling
    for (let i = 0; i < 4500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = 95 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(x, y, 3, 3);
    }

    // Transverse concrete slab seam lines
    ctx.strokeStyle = 'rgba(40, 44, 52, 0.45)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Subtle dark rubber wheel tracks straddling the centerline
    ctx.fillStyle = 'rgba(30, 33, 38, 0.22)';
    ctx.fillRect(170, 0, 36, 512);
    ctx.fillRect(306, 0, 36, 512);

    // Crisp continuous WHITE centerline stripe down the middle of the C-ramp (Screenshots 2, 3, 4, 6)
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(250, 0, 12, 512);

    // Bright glowing RED edge borders
    ctx.fillStyle = '#ff1e27';
    ctx.fillRect(0, 0, 14, 512);
    ctx.fillRect(498, 0, 14, 512);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 10);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createRunwayTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#14171e';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const g = Math.floor(18 + Math.random() * 18);
      ctx.fillStyle = `rgb(${g},${g},${g + 3})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Red edge stripes & white centerline
    ctx.fillStyle = '#ff1e27';
    ctx.fillRect(0, 0, 8, 256);
    ctx.fillRect(248, 0, 8, 256);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(125, 20, 6, 90);
    ctx.fillRect(125, 145, 6, 90);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 16);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildFullArena() {
    const cRampTex = this.createCRampSurfaceTexture();
    const runwayTex = this.createRunwayTexture();

    const cRampMat = new THREE.MeshStandardMaterial({
      map: cRampTex,
      roughness: 0.52,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    const runwayMat = new THREE.MeshStandardMaterial({
      map: runwayTex,
      roughness: 0.72,
      metalness: 0.15,
    });

    const redNeonMat = new THREE.MeshBasicMaterial({ color: 0xff1e27 });
    const redGirderMat = new THREE.MeshStandardMaterial({
      color: 0xc81e24, // Red structural I-beam girder under the ramp deck in Screenshot 8!
      roughness: 0.4,
      metalness: 0.65,
    });
    const whiteTrussMat = new THREE.MeshStandardMaterial({
      color: 0xd8dee6, // White/silver steel box-truss scaffolding in Screenshots 2, 3, 6, 8!
      roughness: 0.35,
      metalness: 0.75,
    });

    // ==========================================
    // 1. APPROACH LANE + GIANT INVERTED-C RAMP + WHITE TRUSS TOWER
    // ==========================================
    this.buildInvertedCRampAndTower(cRampMat, redNeonMat, redGirderMat, whiteTrussMat);

    // ==========================================
    // 2. BLUE STADIUM SEARCHLIGHT BEAMS AT RAMP BASE (Screenshots 2 & 6)
    // ==========================================
    this.buildBlueStadiumBeams();

    // ==========================================
    // 3. LONG LANDING RUNWAY & DISTANCE GATES (Along +Z flight direction!)
    // ==========================================
    this.buildLandingRunway(runwayMat, redNeonMat);
  }

  /**
   * Builds the continuous ribbon of the Approach Lane + Vertical C-Curve (0° -> 90° -> 170°)
   * + Overhanging Top Extension, plus the Red Neon Edge Strips and White Steel Box-Truss Scaffolding Tower!
   */
  private buildInvertedCRampAndTower(
    cRampMat: THREE.Material,
    redNeonMat: THREE.Material,
    redGirderMat: THREE.Material,
    whiteTrussMat: THREE.Material
  ) {
    const { width, radius, overhangLength, approachLength } = this.rampSpecs;
    const halfW = width / 2;
    const segments = 160;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const leftEdgePts: THREE.Vector3[] = [];
    const rightEdgePts: THREE.Vector3[] = [];
    const leftGirderPts: THREE.Vector3[] = [];
    const rightGirderPts: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const s = t * this.totalTrackLength;
      const pt = this.getPointAtArcLength(s);

      // Slightly raise approach strip by 0.02m so it sits cleanly above the arena floor
      const pos = pt.position.clone();
      if (pt.isOnApproach) pos.y = 0.02;

      const leftV = pos.clone().addScaledVector(pt.right, -halfW);
      const rightV = pos.clone().addScaledVector(pt.right, halfW);

      vertices.push(leftV.x, leftV.y, leftV.z);
      uvs.push(0, s / 18);

      vertices.push(rightV.x, rightV.y, rightV.z);
      uvs.push(1, s / 18);

      if (i < segments) {
        const r1 = i * 2;
        const r2 = (i + 1) * 2;
        indices.push(r1, r1 + 1, r2);
        indices.push(r1 + 1, r2 + 1, r2);
      }

      // Record points along the curved C-section (s >= approachLength - 20) for the glowing red neon edge tubes & girders
      if (s >= approachLength - 20) {
        leftEdgePts.push(leftV.clone());
        rightEdgePts.push(rightV.clone());

        // Outer structural spine behind/above the ramp surface (-pt.up direction)
        const girderBack = pos.clone().addScaledVector(pt.up, -0.58);
        leftGirderPts.push(girderBack.clone().addScaledVector(pt.right, -(halfW - 0.3)));
        rightGirderPts.push(girderBack.clone().addScaledVector(pt.right, halfW - 0.3));
      }
    }

    const rampGeo = new THREE.BufferGeometry();
    rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    rampGeo.setIndex(indices);
    rampGeo.computeVertexNormals();

    const rampMesh = new THREE.Mesh(rampGeo, cRampMat);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.group.add(rampMesh);

    // Glowing RED Neon Edge Strips along both sides of the C-Ramp (Screenshots 2, 3, 4, 6, 8)
    const leftEdgeCurve = new THREE.CatmullRomCurve3(leftEdgePts);
    const rightEdgeCurve = new THREE.CatmullRomCurve3(rightEdgePts);
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(leftEdgeCurve, 100, 0.15, 8, false), redNeonMat));
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(rightEdgeCurve, 100, 0.15, 8, false), redNeonMat));

    // Red Structural Steel I-Beam Girders behind the C-Ramp deck (Screenshot 8!)
    const leftGirderCurve = new THREE.CatmullRomCurve3(leftGirderPts);
    const rightGirderCurve = new THREE.CatmullRomCurve3(rightGirderPts);
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(leftGirderCurve, 80, 0.30, 6, false), redGirderMat));
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(rightGirderCurve, 80, 0.30, 6, false), redGirderMat));

    // ==========================================
    // WHITE/SILVER STEEL BOX-TRUSS SCAFFOLDING TOWER (Screenshots 2, 3, 4, 6, 8)
    // ==========================================
    const trussGroup = new THREE.Group();
    const towerBackZ = -radius - 2.8;
    const maxTopY = this.rampSpecs.launchLipY + 1.5;

    // 4 Main Vertical Steel Tower Columns behind the C-ramp
    [-halfW + 0.3, halfW - 0.3].forEach((xCol) => {
      [towerBackZ, towerBackZ + 2.4].forEach((zCol) => {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.44, maxTopY, 0.44), whiteTrussMat);
        col.position.set(xCol, maxTopY / 2, zCol);
        trussGroup.add(col);
      });
    });

    // Horizontal & Diagonal Truss Bracing connecting the vertical tower to the back of the C-curve and top overhang!
    const numLevels = 15;
    for (let lvl = 1; lvl <= numLevels; lvl++) {
      const frac = lvl / numLevels;
      const sCurve = approachLength + frac * (this.arcLength + overhangLength);
      const pt = this.getPointAtArcLength(sCurve);
      const backPos = pt.position.clone().addScaledVector(pt.up, -0.82);

      [-halfW + 0.3, halfW - 0.3].forEach((xSide) => {
        const spanZ = Math.abs(backPos.z - towerBackZ);
        if (spanZ > 0.4) {
          const hBeam = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, spanZ), whiteTrussMat);
          hBeam.position.set(xSide, backPos.y, (backPos.z + towerBackZ) / 2);
          trussGroup.add(hBeam);

          const diagLen = Math.hypot(spanZ, 2.2);
          const dBeam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, diagLen), whiteTrussMat);
          dBeam.position.set(xSide, backPos.y - 1.1, (backPos.z + towerBackZ) / 2);
          dBeam.rotation.x = backPos.z > towerBackZ ? 0.42 : -0.42;
          trussGroup.add(dBeam);
        }
      });

      // Cross-beam linking Left and Right truss frames behind the ramp
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, 0.34), whiteTrussMat);
      crossBeam.position.set(0, backPos.y, backPos.z);
      trussGroup.add(crossBeam);
    }

    // Overhanging Upper Truss Frame & Theatre Spotlights above the 170° upside-down section (Screenshot 8!)
    for (let d = 2.5; d <= overhangLength; d += 4.5) {
      const sOver = approachLength + this.arcLength + d;
      const pt = this.getPointAtArcLength(sOver);
      const topFramePos = pt.position.clone().addScaledVector(pt.up, -1.28);

      const topCross = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.38, 0.38), whiteTrussMat);
      topCross.position.set(0, topFramePos.y, topFramePos.z);
      trussGroup.add(topCross);

      // Focused white spotlight heads illuminating the upside-down Roadster
      [-halfW - 0.5, halfW + 0.5].forEach((xSpot) => {
        const spotHousing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.28, 0.45, 12),
          new THREE.MeshStandardMaterial({ color: 0x15181f })
        );
        spotHousing.position.set(xSpot, topFramePos.y - 0.4, topFramePos.z);
        trussGroup.add(spotHousing);

        const lens = new THREE.Mesh(
          new THREE.CircleGeometry(0.20, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(xSpot, topFramePos.y - 0.63, topFramePos.z);
        trussGroup.add(lens);
      });
    }

    // Glowing Launch Lip Beacon Arch at the tip of the 170° upside-down overhang
    const lipBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.6, 0.28, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    lipBeacon.position.set(0, this.rampSpecs.launchLipY + 0.35, this.rampSpecs.launchLipZ);
    trussGroup.add(lipBeacon);

    // Dedicated Illumination Lights aimed directly at the C-Ramp face so the grey concrete & white Roadster gleam at night!
    const rampSpotLight = new THREE.PointLight(0xffffff, 5.2, 110);
    rampSpotLight.position.set(0, 18, 16);
    this.group.add(rampSpotLight);

    const overhangLight = new THREE.PointLight(0xfff6ee, 4.5, 85);
    overhangLight.position.set(0, this.rampSpecs.launchLipY - 3, this.rampSpecs.launchLipZ + 4);
    this.group.add(overhangLight);

    this.group.add(trussGroup);
  }

  /**
   * Builds the fan of upward-angled cyan/blue stadium spotlight beams behind the base of the C-ramp
   * seen in Screenshot 2 & Screenshot 6
   */
  private buildBlueStadiumBeams() {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x33bbff,
      transparent: true,
      opacity: 0.20,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const angles = [-0.55, -0.35, -0.18, 0.18, 0.35, 0.55];
    angles.forEach((ang, idx) => {
      const coneGeo = new THREE.ConeGeometry(1.5, 26, 12, 1, true);
      coneGeo.translate(0, 13, 0);
      const beam = new THREE.Mesh(coneGeo, beamMat);
      beam.position.set((idx - 2.5) * 3.2, 0.2, -6);
      beam.rotation.z = ang;
      beam.rotation.x = -0.15;
      this.group.add(beam);
    });
  }

  private buildLandingRunway(runwayMat: THREE.Material, redNeonMat: THREE.Material) {
    // The approach strip runs from Z = 130m down to Z = 0m into the C-Ramp.
    // The car launches off the top overhang lip (Z ≈ +17.1m, Y ≈ 33.2m) in the +Z direction,
    // flying high above the approach lane and touching down past Z = 140m on the wide landing runway!
    const landingStart = 132;
    const landingEnd = 4500;
    const landingLength = landingEnd - landingStart;
    const landingWidth = 34;

    const landingMesh = new THREE.Mesh(new THREE.PlaneGeometry(landingWidth, landingLength), runwayMat);
    landingMesh.rotation.x = -Math.PI / 2;
    landingMesh.position.set(0, 0.01, (landingStart + landingEnd) / 2);
    landingMesh.receiveShadow = true;
    this.group.add(landingMesh);

    // Dark Night Proving Ground Floor
    const groundGeo = new THREE.PlaneGeometry(1600, landingEnd + 1600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x05070b,
      roughness: 0.92,
      metalness: 0.08,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.05, (landingEnd + 800) / 2 - 300);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Parked Tesla Spectator Cars with Glowing Headlights along the arena edge (seen in Screenshot 6 & 8!)
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const carBodyMat = new THREE.MeshStandardMaterial({ color: 0x161920, metalness: 0.8, roughness: 0.2 });
    [28, 46, 68, 95].forEach((zCar, idx) => {
      const xCar = idx % 2 === 0 ? 14 : -14;
      const specCar = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.35, 4.6), carBodyMat);
      body.position.y = 0.7;
      specCar.add(body);

      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.05), headLightMat);
      hlL.position.set(0.65, 0.65, -2.31);
      specCar.add(hlL);
      const hlR = hlL.clone();
      hlR.position.x = -0.65;
      specCar.add(hlR);

      specCar.position.set(xCar, 0, zCar);
      specCar.rotation.y = xCar > 0 ? 0.35 : -0.35;
      this.group.add(specCar);
    });

    // Distance Milestone Gates along +Z measured from the C-Ramp Launch Lip!
    const milestones = [150, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 3500, 4000];
    milestones.forEach((dist) => {
      const zPos = this.rampSpecs.launchLipZ + dist;
      const gateGroup = new THREE.Group();

      const pL = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 20, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x1c2029 })
      );
      pL.position.set(landingWidth / 2 + 2, 10, zPos);
      gateGroup.add(pL);

      const pR = pL.clone();
      pR.position.x = -(landingWidth / 2 + 2);
      gateGroup.add(pR);

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(landingWidth + 5, 1.4, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x1c2029 })
      );
      beam.position.set(0, 20, zPos);
      gateGroup.add(beam);

      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sCtx = signCanvas.getContext('2d')!;
      sCtx.fillStyle = 'rgba(8, 10, 16, 0.92)';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.strokeStyle = dist >= 2000 ? '#ff1e27' : dist >= 1000 ? '#ffaa00' : '#00f0ff';
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
        new THREE.PlaneGeometry(15, 3.8),
        new THREE.MeshBasicMaterial({ map: signTex, transparent: true })
      );
      signMesh.position.set(0, 20, zPos - 0.55);
      signMesh.rotation.y = Math.PI;
      gateGroup.add(signMesh);

      const signMeshBack = signMesh.clone();
      signMeshBack.position.z = zPos + 0.55;
      signMeshBack.rotation.y = 0;
      gateGroup.add(signMeshBack);

      const lightL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 20, 0.2), redNeonMat);
      lightL.position.set(landingWidth / 2 + 2, 10, zPos);
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

  public setCountdownStage(_stage: number) {
    // Maintained for interface compatibility
  }

  /**
   * Evaluates exact 3D position, pitch angle (0° -> 90° vertical wall -> 170° upside-down overhang),
   * and basis vectors (forward, up, right) for any arc-length distance `s` along the C-Ramp!
   */
  public getPointAtArcLength(s: number): CRampPoint {
    const { approachLength, radius, maxAngleDeg, overhangLength } = this.rampSpecs;
    const maxAngleRad = (maxAngleDeg * Math.PI) / 180; // 170 deg = 2.967 rad

    // 1. Flat Approach Run into the bottom of the C-Ramp (heading in -Z from Z = 130m to Z = 0m)
    if (s <= approachLength) {
      const z = approachLength - s;
      return {
        isOnApproach: true,
        isOnRamp: false,
        isPastLip: false,
        position: new THREE.Vector3(0, 0, z),
        thetaRad: 0,
        pitchDeg: 0,
        forward: new THREE.Vector3(0, 0, -1),
        up: new THREE.Vector3(0, 1, 0),
        right: new THREE.Vector3(1, 0, 0),
      };
    }

    // 2. Climbing the Circular C-Curve (theta sweeps from 0° -> 90° vertical -> 170° upside-down!)
    const sOnRamp = s - approachLength;
    if (sOnRamp <= this.arcLength) {
      const theta = sOnRamp / radius;
      const y = radius * (1 - Math.cos(theta));
      const z = -radius * Math.sin(theta);

      return {
        isOnApproach: false,
        isOnRamp: true,
        isPastLip: false,
        position: new THREE.Vector3(0, y, z),
        thetaRad: theta,
        pitchDeg: (theta * 180) / Math.PI,
        forward: new THREE.Vector3(0, Math.sin(theta), -Math.cos(theta)).normalize(),
        up: new THREE.Vector3(0, Math.cos(theta), Math.sin(theta)).normalize(),
        right: new THREE.Vector3(1, 0, 0),
      };
    }

    // 3. Gliding Upside-Down along the Overhanging Top Extension (theta = 170° constant!)
    const dOverhang = sOnRamp - this.arcLength;
    const endArcY = radius * (1 - Math.cos(maxAngleRad));
    const endArcZ = -radius * Math.sin(maxAngleRad);

    const forward = new THREE.Vector3(0, Math.sin(maxAngleRad), -Math.cos(maxAngleRad)).normalize();
    const up = new THREE.Vector3(0, Math.cos(maxAngleRad), Math.sin(maxAngleRad)).normalize();

    const pos = new THREE.Vector3(0, endArcY, endArcZ).addScaledVector(
      forward,
      Math.min(dOverhang, overhangLength)
    );

    return {
      isOnApproach: false,
      isOnRamp: dOverhang <= overhangLength,
      isPastLip: dOverhang > overhangLength,
      position: pos,
      thetaRad: maxAngleRad,
      pitchDeg: maxAngleDeg, // 170 DEG!
      forward,
      up,
      right: new THREE.Vector3(1, 0, 0),
    };
  }
}
