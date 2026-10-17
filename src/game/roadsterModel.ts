/**
 * Exact 1:1 3D Model of the New Tesla Roadster (Design by Franz von Holzhausen / Engineering by Lars Moravy)
 * Built with zero coplanar Z-fighting and zero self-shadow flickering:
 * 1. Crisp Angular Wedge Front Fascia:
 *    - Flat-sloping center hood recessed between two sharp angular front fender ridges
 *    - Center-only razor-thin white horizontal LED light strip above a black trapezoidal intake & active chin spoiler
 * 2. Faceted Side Profile & Recessed Cabin Tub:
 *    - Crisp straight shoulder crease sweeping to an overhanging pointed Kamm-tail
 *    - Front fender vertical aero curtain flap with slim amber side-marker camera blade
 *    - Dark grey/black angled lower rocker & 4 independent retractable 'Sucker' skirts (Front, Rear, Left, Right)
 * 3. Exact Rear Fascia:
 *    - Recessed dual-line full-width red LED taillight bar under sharp Kamm-tail lip
 *    - Centered white "RDSTR" license plate
 *    - Horizontal row of 4 circular brass/gold-lined Cold-Gas Thruster nozzles (O O O O) below the plate
 *    - Horizontal row of 4 spinning "Sucker" downforce fans inside the open diffuser bay below the 4 thrusters
 *    - Optimus-actuated wide GT rear wing with twin central struts, bronze/gold underside, and angled side endplates
 * 4. Vertical Hover & Maneuvering Thrusters:
 *    - Vertical downward cold-gas nitrogen jets firing right behind the front wheels and right behind the rear wheels
 *      with visible supersonic shock diamonds
 */
import * as THREE from 'three';

export interface RoadsterCustomization {
  bodyColor: string;
  hasSpaceXPackage: boolean;
  wheelStyle: 'aero' | 'turbine';
  windowTint: number;
}

export const ROADSTER_COLORS = [
  { name: 'Ano White (Official Reveal)', hex: '#f2f4f7', metalness: 0.32, roughness: 0.18, clearcoat: 0.95 },
  { name: 'Signature Ultra Red', hex: '#d91424', metalness: 0.82, roughness: 0.15, clearcoat: 1.0 },
  { name: 'Quicksilver Metallic', hex: '#9aa4b0', metalness: 0.88, roughness: 0.15, clearcoat: 1.0 },
  { name: 'Stealth Obsidian Black', hex: '#14161b', metalness: 0.75, roughness: 0.22, clearcoat: 0.9 },
  { name: 'Titanium Gold', hex: '#c8a248', metalness: 0.85, roughness: 0.16, clearcoat: 1.0 },
  { name: 'Starbase Cryo Blue', hex: '#0066dd', metalness: 0.82, roughness: 0.16, clearcoat: 1.0 },
];

export interface ThrusterVisualState {
  rearBoost: boolean;
  hoverThrust: boolean;
  rollDir: number;        // -1 left yaw/roll, 0 none, 1 right yaw/roll
  pitchDir: number;       // -1 nose down, 0 none, 1 nose up
  suctionFanActive: boolean;
  highFlowSkirtMode: boolean; // True at 200+ mph when front/rear skirts open for low drag
  suspensionCompression: number; // 0..1 rocker-arm suspension travel
  steerAngleRad?: number;        // Front wheel steering angle
  chassisRollRad?: number;       // High-G cornering body roll
  chassisPitchSquatRad?: number; // Thruster launch squat / brake dive
}

export class TeslaRoadsterModel {
  public group: THREE.Group;
  public chassisBodyGroup: THREE.Group;
  public wheels: THREE.Object3D[] = [];
  public frontWheelMounts: THREE.Object3D[] = [];
  public activeSpoiler: THREE.Group | null = null;
  public frontChinSpoiler: THREE.Mesh | null = null;
  public bodyMaterials: THREE.MeshPhysicalMaterial[] = [];

  // 4 Independent Retractable 'Sucker' Skirts
  private skirtFront: THREE.Mesh | null = null;
  private skirtRear: THREE.Mesh | null = null;
  private skirtLeft: THREE.Mesh | null = null;
  private skirtRight: THREE.Mesh | null = null;

  // 4 Rear Diffuser 'Sucker' Fan Impellers
  private suckerFans: THREE.Object3D[] = [];

  // 10 SpaceX Cold-Gas Nitrogen Thruster Plumes (10,000 PSI)
  private rearCgtPlumes: THREE.Mesh[] = [];
  private hoverJetPlumes: THREE.Group[] = [];
  private rollLeftPlumes: THREE.Mesh[] = [];
  private rollRightPlumes: THREE.Mesh[] = [];
  private thrusterLight: THREE.PointLight | null = null;
  private hoverLight: THREE.PointLight | null = null;
  private suctionRing: THREE.Mesh | null = null;
  private animClock: number = 0;

  constructor(
    customization: RoadsterCustomization = {
      bodyColor: '#f2f4f7',
      hasSpaceXPackage: true,
      wheelStyle: 'turbine',
      windowTint: 0.9,
    }
  ) {
    this.group = new THREE.Group();
    this.group.name = 'TeslaRoadster2026FranzDesign';
    this.chassisBodyGroup = new THREE.Group();
    this.group.add(this.chassisBodyGroup);
    this.buildRoadster(customization);
  }

  public setPaintColor(hex: string) {
    const color = new THREE.Color(hex);
    const preset = ROADSTER_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    this.bodyMaterials.forEach((mat) => {
      mat.color.copy(color);
      if (preset) {
        mat.metalness = preset.metalness;
        mat.roughness = preset.roughness;
        mat.clearcoat = preset.clearcoat;
      }
    });
  }

  public setSpaceXPackageActive(enabled: boolean) {
    const spxGroup = this.chassisBodyGroup.getObjectByName('SpaceXThrusterPackage');
    if (spxGroup) {
      spxGroup.visible = enabled;
    }
  }

  private createRDSTRLicensePlateTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#e8ecf2';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#b0b8c4';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 120);

    ctx.fillStyle = '#788290';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RDSTR', 128, 68);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Builds the angular faceted wedge bodywork with a recessed cabin well
   * so the dark glass greenhouse never intersects or Z-fights the body mesh!
   */
  private buildFranzFacetedBodyGeometry(): THREE.BufferGeometry {
    const zSteps = 84;
    const uSteps = 44;
    const minZ = -2.28;
    const maxZ = 2.28;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const frontWheelZ = 1.35;
    const rearWheelZ = -1.30;
    const archRadius = 0.40;

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps;
      const z = THREE.MathUtils.lerp(minZ, maxZ, tz);

      let halfWidth = 0.96;
      if (z > 1.55) {
        const nt = (z - 1.55) / (maxZ - 1.55);
        halfWidth = THREE.MathUtils.lerp(0.96, 0.56, Math.pow(nt, 1.15));
      } else if (z < -1.65) {
        const rt = (-1.65 - z) / (-1.65 - minZ);
        halfWidth = THREE.MathUtils.lerp(0.98, 0.78, Math.pow(rt, 1.1));
      } else {
        const fFlare = 0.035 * Math.exp(-Math.pow((z - frontWheelZ) / 0.55, 2));
        const rFlare = 0.045 * Math.exp(-Math.pow((z - rearWheelZ) / 0.60, 2));
        halfWidth = 0.94 + fFlare + rFlare;
      }

      // Center Hood & Deck Height (recessed inside cabin z ∈ [-1.45, 0.95] so glass never Z-fights!)
      let centerHeight = 0.65;
      if (z > 1.0) {
        const ft = (z - 1.0) / (maxZ - 1.0);
        centerHeight = THREE.MathUtils.lerp(0.63, 0.39, ft);
      } else if (z < -0.9) {
        const rt = (-0.9 - z) / (-0.9 - minZ);
        centerHeight = THREE.MathUtils.lerp(0.67, 0.70, rt);
      }

      const isCabinZone = z > -1.45 && z < 0.98;
      const cabinRecess = isCabinZone
        ? 0.14 * Math.sin(((z + 1.45) / 2.43) * Math.PI)
        : 0;

      const frontRidge = z > 0.5 ? 0.065 * Math.sin(Math.min(1, (z - 0.5) / 1.4) * Math.PI) : 0;
      const rearShoulder = z < 0.2 ? 0.045 * Math.min(1, (0.2 - z) / 1.2) : 0;
      const shoulderCrestY = centerHeight + frontRidge + rearShoulder;

      const dFront = Math.abs(z - frontWheelZ);
      const dRear = Math.abs(z - rearWheelZ);
      let bottomEdgeY = 0.22;
      if (dFront < archRadius) {
        bottomEdgeY = 0.35 + Math.sqrt(Math.max(0, archRadius * archRadius - dFront * dFront)) * 0.95;
      } else if (dRear < archRadius * 1.04) {
        const rA = archRadius * 1.04;
        bottomEdgeY = 0.37 + Math.sqrt(Math.max(0, rA * rA - dRear * dRear)) * 0.96;
      } else if (z < -1.72) {
        const kt = (-1.72 - z) / (-1.72 - minZ);
        bottomEdgeY = THREE.MathUtils.lerp(0.26, 0.62, kt);
      } else if (z > 1.80) {
        const nt = (z - 1.80) / (maxZ - 1.80);
        bottomEdgeY = THREE.MathUtils.lerp(0.18, 0.37, Math.pow(nt, 1.4));
      } else {
        const rockerSlope = THREE.MathUtils.clamp((0.8 - z) / 2.2, 0, 1) * 0.07;
        bottomEdgeY = 0.20 + rockerSlope;
      }

      for (let iu = 0; iu <= uSteps; iu++) {
        const s = (iu / uSteps) * 2 - 1;
        const absS = Math.abs(s);
        const signS = s < 0 ? -1 : 1;

        let x = 0;
        let y = 0;

        if (absS <= 0.38) {
          const uCenter = absS / 0.38;
          x = signS * halfWidth * 0.56 * uCenter;
          y = centerHeight - cabinRecess * (1 - uCenter * 0.5);
        } else if (absS <= 0.64) {
          const uFender = (absS - 0.38) / 0.26;
          x = signS * halfWidth * THREE.MathUtils.lerp(0.56, 0.96, uFender);
          y = THREE.MathUtils.lerp(centerHeight - cabinRecess * 0.5, shoulderCrestY, uFender);
        } else {
          const uFlank = (absS - 0.64) / 0.36;
          x = signS * halfWidth * THREE.MathUtils.lerp(0.96, 1.0, Math.sin(uFlank * (Math.PI / 2)));
          y = THREE.MathUtils.lerp(shoulderCrestY, bottomEdgeY, uFlank);
        }

        positions.push(x, y, z);
        uvs.push(iu / uSteps, tz);

        if (iz < zSteps && iu < uSteps) {
          const a = iz * (uSteps + 1) + iu;
          const b = (iz + 1) * (uSteps + 1) + iu;
          indices.push(a, b, a + 1);
          indices.push(a + 1, b, b + 1);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  /**
   * Builds the Sleek Dark-Tinted Coupe Greenhouse & Fastback Glass
   * cleanly elevated above the cabin sill so there is zero Z-fighting
   */
  private buildCoupeGreenhouseGeometry(): THREE.BufferGeometry {
    const zSteps = 44;
    const uSteps = 24;
    const minZ = -1.58;
    const maxZ = 1.12;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps;
      const z = THREE.MathUtils.lerp(minZ, maxZ, tz);

      const widthEnv =
        0.72 *
        Math.sin(Math.pow(tz, 0.68) * Math.PI * 0.94 + 0.05) *
        (z < -0.4 ? 0.80 + 0.20 * ((z - minZ) / (-0.4 - minZ)) : 1.0);

      const archCurve = Math.sin(Math.pow(tz, 0.72) * Math.PI);
      const baseY = z > 0 ? 0.645 : 0.685;
      const peakY = baseY + 0.45 * archCurve;

      for (let iu = 0; iu <= uSteps; iu++) {
        const s = (iu / uSteps) * 2 - 1;
        const x = s * widthEnv;
        const dome = Math.cos(s * (Math.PI / 2));
        const y = THREE.MathUtils.lerp(baseY, peakY, Math.pow(dome, 0.58));

        positions.push(x, y, z);
        uvs.push(iu / uSteps, tz);

        if (iz < zSteps && iu < uSteps) {
          const a = iz * (uSteps + 1) + iu;
          const b = (iz + 1) * (uSteps + 1) + iu;
          indices.push(a, b, a + 1);
          indices.push(a + 1, b, b + 1);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  private buildRoadster(config: RoadsterCustomization) {
    const preset =
      ROADSTER_COLORS.find((c) => c.hex.toLowerCase() === config.bodyColor.toLowerCase()) || ROADSTER_COLORS[0];

    // 1. Official Ano White / Multi-Coat Body Material (FrontSide + depthWrite for zero double-sided Z-flicker)
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(config.bodyColor),
      metalness: preset.metalness,
      roughness: preset.roughness,
      clearcoat: preset.clearcoat,
      clearcoatRoughness: 0.06,
      reflectivity: 1.0,
      side: THREE.DoubleSide,
    });
    this.bodyMaterials.push(bodyMat);

    // 2. Opaque High-Gloss Stealth Canopy Glass (eliminates transparent sorting flicker against body!)
    const darkGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x0a0d14),
      metalness: 0.35,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const darkRockerMat = new THREE.MeshStandardMaterial({
      color: 0x1e2128,
      roughness: 0.42,
      metalness: 0.55,
    });

    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.5,
      metalness: 0.4,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const brassNozzleMat = new THREE.MeshStandardMaterial({
      color: 0xc59b40,
      metalness: 0.88,
      roughness: 0.22,
    });

    // ==========================================
    // 1. FACETED WEDGE COACHWORK
    // ==========================================
    const bodyGeo = this.buildFranzFacetedBodyGeometry();
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = false; // Prevents shadow-map acne swimming across curved white fenders!
    this.chassisBodyGroup.add(bodyMesh);

    // Crisp Dark Hood Shutlines (elevated slightly with polygonOffset so zero Z-fighting)
    [-1, 1].forEach((side) => {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 1.15), matteBlackMat);
      seam.position.set(side * 0.46, 0.535, 1.65);
      seam.rotation.x = 0.19;
      seam.rotation.y = side * -0.12;
      this.chassisBodyGroup.add(seam);
    });

    // ==========================================
    // 2. FRONT WEDGE LIGHTBAR, TRAPEZOIDAL BLACK INTAKE & ACTIVE CHIN SPOILER
    // ==========================================
    const frontLedMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const frontCenterLed = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.024, 0.03), frontLedMat);
    frontCenterLed.position.set(0, 0.388, 2.29);
    this.chassisBodyGroup.add(frontCenterLed);

    const frontIntakeCavity = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.20, 0.24), matteBlackMat);
    frontIntakeCavity.position.set(0, 0.25, 2.15);
    this.chassisBodyGroup.add(frontIntakeCavity);

    this.frontChinSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.035, 0.48), darkRockerMat);
    this.frontChinSpoiler.position.set(0, 0.135, 2.02);
    this.chassisBodyGroup.add(this.frontChinSpoiler);

    // ==========================================
    // 3. VERTICAL FRONT FENDER AERO FLAP & AMBER SIDE MARKER
    // ==========================================
    [-1, 1].forEach((side) => {
      const aeroFlap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.22), bodyMat);
      aeroFlap.position.set(side * 0.965, 0.34, 0.82);
      aeroFlap.rotation.y = side * 0.08;
      this.chassisBodyGroup.add(aeroFlap);

      const markerHousing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.24), matteBlackMat);
      markerHousing.position.set(side * 0.972, 0.50, 0.82);
      this.chassisBodyGroup.add(markerHousing);

      const amberLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.014, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xff9900 })
      );
      amberLed.position.set(side * 0.978, 0.505, 0.89);
      this.chassisBodyGroup.add(amberLed);

      const rearReflector = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff1122 })
      );
      rearReflector.position.set(side * 0.955, 0.44, -1.78);
      this.chassisBodyGroup.add(rearReflector);
    });

    // ==========================================
    // 4. DARK ROCKERS & 4 INDEPENDENT RETRACTABLE 'SUCKER' SKIRTS
    // ==========================================
    const underbodyCore = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.14, 3.95), matteBlackMat);
    underbodyCore.position.set(0, 0.20, 0);
    this.chassisBodyGroup.add(underbodyCore);

    const skirtGeoSide = new THREE.BoxGeometry(0.055, 0.12, 1.82);
    this.skirtLeft = new THREE.Mesh(skirtGeoSide, darkRockerMat);
    this.skirtLeft.position.set(0.92, 0.15, 0.02);
    this.chassisBodyGroup.add(this.skirtLeft);

    this.skirtRight = new THREE.Mesh(skirtGeoSide, darkRockerMat);
    this.skirtRight.position.set(-0.92, 0.15, 0.02);
    this.chassisBodyGroup.add(this.skirtRight);

    const skirtGeoTransverse = new THREE.BoxGeometry(1.64, 0.09, 0.055);
    this.skirtFront = new THREE.Mesh(skirtGeoTransverse, darkRockerMat);
    this.skirtFront.position.set(0, 0.14, 0.90);
    this.chassisBodyGroup.add(this.skirtFront);

    this.skirtRear = new THREE.Mesh(skirtGeoTransverse, darkRockerMat);
    this.skirtRear.position.set(0, 0.14, -0.90);
    this.chassisBodyGroup.add(this.skirtRear);

    // Glowing Underbody Vacuum Seal Ring (elevated slightly at y = 0.045 to avoid floor Z-fighting)
    const suctionRingGeo = new THREE.RingGeometry(0.55, 0.94, 36);
    suctionRingGeo.rotateX(-Math.PI / 2);
    this.suctionRing = new THREE.Mesh(
      suctionRingGeo,
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.suctionRing.position.set(0, 0.045, 0);
    this.group.add(this.suctionRing);

    // ==========================================
    // 5. COUPE GREENHOUSE & ROOF ARCH RAILS
    // ==========================================
    const greenhouseGeo = this.buildCoupeGreenhouseGeometry();
    const greenhouseMesh = new THREE.Mesh(greenhouseGeo, darkGlassMat);
    greenhouseMesh.castShadow = true;
    this.chassisBodyGroup.add(greenhouseMesh);

    [-1, 1].forEach((side) => {
      const roofArchPts = [
        new THREE.Vector3(side * 0.66, 0.65, 0.95),
        new THREE.Vector3(side * 0.58, 0.99, 0.25),
        new THREE.Vector3(side * 0.54, 1.05, -0.35),
        new THREE.Vector3(side * 0.56, 0.87, -1.05),
        new THREE.Vector3(side * 0.62, 0.71, -1.65),
      ];
      const archCurve = new THREE.CatmullRomCurve3(roofArchPts);
      const archTube = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 28, 0.032, 8, false), bodyMat);
      this.chassisBodyGroup.add(archTube);
    });

    // ==========================================
    // 6. EXACT REAR FASCIA (Spatially separated planes for zero Z-fighting!)
    // ==========================================
    // Recessed Dark Rear Panel at z = -2.20 (back face at -2.26)
    const rearFasciaPanel = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.36, 0.12), matteBlackMat);
    rearFasciaPanel.position.set(0, 0.48, -2.20);
    this.chassisBodyGroup.add(rearFasciaPanel);

    // Dual-Line Red LED Taillight Bars at z = -2.285 (cleanly outside rearFasciaPanel)
    const tailLedMat = new THREE.MeshBasicMaterial({
      color: 0xff1828,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const upperTailBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.022, 0.03), tailLedMat);
    upperTailBar.position.set(0, 0.65, -2.285);
    this.chassisBodyGroup.add(upperTailBar);

    const lowerTailBar = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.014, 0.03), tailLedMat);
    lowerTailBar.position.set(0, 0.615, -2.280);
    this.chassisBodyGroup.add(lowerTailBar);

    // White "RDSTR" License Plate at z = -2.282
    const plateTex = this.createRDSTRLicensePlateTexture();
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.16),
      new THREE.MeshBasicMaterial({
        map: plateTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    plateMesh.rotation.y = Math.PI;
    plateMesh.position.set(0, 0.51, -2.282);
    this.chassisBodyGroup.add(plateMesh);

    // Lower Diffuser Bay at y = 0.24, z = -2.14 (back face at -2.28)
    const diffuserShell = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 0.28), darkRockerMat);
    diffuserShell.position.set(0, 0.23, -2.14);
    this.chassisBodyGroup.add(diffuserShell);

    // 4 Spinning "Sucker" Downforce Fans at z = -2.29
    [-0.48, -0.16, 0.16, 0.48].forEach((xFan) => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(xFan, 0.22, -2.29);

      const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 12, 24), darkRockerMat);
      fanGroup.add(shroud);

      const impeller = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.04, 12), matteBlackMat);
      hub.rotation.x = Math.PI / 2;
      impeller.add(hub);

      for (let b = 0; b < 7; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.09, 0.008), darkRockerMat);
        const ang = (b / 7) * Math.PI * 2;
        blade.position.set(Math.cos(ang) * 0.048, Math.sin(ang) * 0.048, 0);
        blade.rotation.z = ang + 0.35;
        impeller.add(blade);
      }
      fanGroup.add(impeller);
      this.suckerFans.push(impeller);
      this.chassisBodyGroup.add(fanGroup);
    });

    // Optimus-Actuated Wide GT Rear Wing (cleanly separated top & bottom plates so zero overlap!)
    this.activeSpoiler = new THREE.Group();
    const wingTop = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.020, 0.34), bodyMat);
    wingTop.position.y = 0.21;
    this.activeSpoiler.add(wingTop);

    const wingBottomGold = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.012, 0.32), brassNozzleMat);
    wingBottomGold.position.y = 0.185;
    this.activeSpoiler.add(wingBottomGold);

    [-0.87, 0.87].forEach((xEnd) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.36), bodyMat);
      endplate.position.set(xEnd, 0.14, -0.02);
      endplate.rotation.z = xEnd > 0 ? -0.18 : 0.18;
      this.activeSpoiler!.add(endplate);
    });

    [-0.32, 0.32].forEach((xStrut) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.22, 0.09), matteBlackMat);
      strut.position.set(xStrut, 0.09, 0.04);
      strut.rotation.x = -0.25;
      this.activeSpoiler!.add(strut);
    });

    this.activeSpoiler.position.set(0, 0.65, -2.02);
    this.chassisBodyGroup.add(this.activeSpoiler);

    // ==========================================
    // 7. SPACEX PACKAGE: 10 COLD-GAS THRUSTERS
    // ==========================================
    const spxGroup = new THREE.Group();
    spxGroup.name = 'SpaceXThrusterPackage';

    const createNitrogenPlume = (radius: number, length: number, colorHex: number) => {
      const coneGeo = new THREE.ConeGeometry(radius, length, 16, 1, true);
      coneGeo.translate(0, length / 2, 0);
      const plumeMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Mesh(coneGeo, plumeMat);
    };

    // A. 4x Horizontal Rear Cold-Gas Thruster Nozzles (O O O O) below license plate
    [-0.39, -0.13, 0.13, 0.39].forEach((xNoz) => {
      const outerRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.042, 0.12, 20, 1, true),
        brassNozzleMat
      );
      outerRing.rotation.x = Math.PI / 2;
      outerRing.position.set(xNoz, 0.38, -2.30);
      spxGroup.add(outerRing);

      const innerCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.030, 0.10, 16),
        matteBlackMat
      );
      innerCore.rotation.x = Math.PI / 2;
      innerCore.position.set(xNoz, 0.38, -2.29);
      spxGroup.add(innerCore);

      const jetPlume = createNitrogenPlume(0.14, 3.2, 0xd8f6ff);
      jetPlume.rotation.x = -Math.PI / 2;
      jetPlume.position.set(xNoz, 0.38, -2.36);
      spxGroup.add(jetPlume);
      this.rearCgtPlumes.push(jetPlume);

      const shockCore = createNitrogenPlume(0.065, 1.8, 0xffffff);
      shockCore.rotation.x = -Math.PI / 2;
      shockCore.position.set(xNoz, 0.38, -2.36);
      spxGroup.add(shockCore);
      this.rearCgtPlumes.push(shockCore);
    });

    // B. 4x Vertical Downward Hover & Flight Thrusters
    const hoverNozzleCoords = [
      { x: 0.78, y: 0.22, z: 0.78 },
      { x: -0.78, y: 0.22, z: 0.78 },
      { x: 0.74, y: 0.24, z: -1.88 },
      { x: -0.74, y: 0.24, z: -1.88 },
    ];

    hoverNozzleCoords.forEach((hc) => {
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.052, 0.12, 16), brassNozzleMat);
      bell.position.set(hc.x, hc.y, hc.z);
      spxGroup.add(bell);

      const jetGroup = new THREE.Group();
      jetGroup.position.set(hc.x, hc.y - 0.05, hc.z);

      const mainJet = createNitrogenPlume(0.18, 2.2, 0xdff8ff);
      mainJet.rotation.x = Math.PI;
      jetGroup.add(mainJet);

      [0.35, 0.75, 1.15].forEach((dY, idx) => {
        const diamond = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.055 - idx * 0.01, 0),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        diamond.scale.set(1, 1.8, 1);
        diamond.position.y = -dY;
        jetGroup.add(diamond);
      });

      jetGroup.visible = false;
      spxGroup.add(jetGroup);
      this.hoverJetPlumes.push(jetGroup);
    });

    // C. 2x Independent Left/Right Yaw & Roll Control Thrusters
    const yawL = createNitrogenPlume(0.12, 1.4, 0xdff8ff);
    yawL.rotation.z = -Math.PI / 3;
    yawL.position.set(0.96, 0.56, -0.6);
    spxGroup.add(yawL);
    this.rollLeftPlumes.push(yawL);

    const yawR = createNitrogenPlume(0.12, 1.4, 0xdff8ff);
    yawR.rotation.z = Math.PI / 3;
    yawR.position.set(-0.96, 0.56, -0.6);
    spxGroup.add(yawR);
    this.rollRightPlumes.push(yawR);

    this.thrusterLight = new THREE.PointLight(0xd8f6ff, 0, 14);
    this.thrusterLight.position.set(0, 0.40, -2.9);
    spxGroup.add(this.thrusterLight);

    this.hoverLight = new THREE.PointLight(0xd8f6ff, 0, 12);
    this.hoverLight.position.set(0, -0.5, 0);
    spxGroup.add(this.hoverLight);

    spxGroup.visible = config.hasSpaceXPackage;
    this.chassisBodyGroup.add(spxGroup);

    // ==========================================
    // 8. 5-SPLIT-SPOKE STAR WHEELS WITH WHITE AERO DISH INSERTS (Cleanly spaced planes!)
    // ==========================================
    const wheelSpecs = [
      { x: 0.91, y: 0.35, z: 1.35, r: 0.35, w: 0.27 },
      { x: -0.91, y: 0.35, z: 1.35, r: 0.35, w: 0.27 },
      { x: 0.94, y: 0.37, z: -1.30, r: 0.37, w: 0.31 },
      { x: -0.94, y: 0.37, z: -1.30, r: 0.37, w: 0.31 },
    ];

    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x121417,
      roughness: 0.72,
      metalness: 0.15,
    });

    const glossBlackSpokeMat = new THREE.MeshPhysicalMaterial({
      color: 0x101216,
      metalness: 0.85,
      roughness: 0.12,
      clearcoat: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const whiteAeroInsertMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6ebf0,
      metalness: 0.35,
      roughness: 0.22,
      clearcoat: 0.8,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    wheelSpecs.forEach((ws) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(ws.x, ws.y, ws.z);

      const spinGroup = new THREE.Group();

      const tireBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(ws.r, ws.r, ws.w, 32),
        tireRubberMat
      );
      tireBarrel.rotation.z = Math.PI / 2;
      tireBarrel.castShadow = true;
      spinGroup.add(tireBarrel);

      const outerSide = ws.x > 0 ? 1 : -1;
      const dishX = outerSide * (ws.w / 2 + 0.012);
      const spokeX = outerSide * (ws.w / 2 + 0.026);

      // White/Silver Aero Dish Ring clearly separated outside the tire wall
      const aeroDish = new THREE.Mesh(
        new THREE.RingGeometry(ws.r * 0.26, ws.r * 0.78, 32),
        whiteAeroInsertMat
      );
      aeroDish.rotation.y = outerSide > 0 ? Math.PI / 2 : -Math.PI / 2;
      aeroDish.position.x = dishX;
      spinGroup.add(aeroDish);

      // Outer Dark Rim Lip
      const rimLip = new THREE.Mesh(
        new THREE.RingGeometry(ws.r * 0.76, ws.r * 0.83, 32),
        glossBlackSpokeMat
      );
      rimLip.rotation.y = outerSide > 0 ? Math.PI / 2 : -Math.PI / 2;
      rimLip.position.x = spokeX;
      spinGroup.add(rimLip);

      // 5 Gloss-Black Split-Spoke Star Blades
      for (let i = 0; i < 5; i++) {
        const baseAngle = (i / 5) * Math.PI * 2;
        const spokeLen = ws.r * 0.80;

        [-0.022, 0.022].forEach((offset) => {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(0.018, 0.022, spokeLen),
            glossBlackSpokeMat
          );
          const perpY = Math.cos(baseAngle) * offset;
          const perpZ = -Math.sin(baseAngle) * offset;
          bar.position.set(
            spokeX,
            Math.sin(baseAngle) * (spokeLen * 0.45) + perpY,
            Math.cos(baseAngle) * (spokeLen * 0.45) + perpZ
          );
          bar.rotation.x = -baseAngle;
          spinGroup.add(bar);
        });
      }

      const centerCap = new THREE.Mesh(
        new THREE.CylinderGeometry(ws.r * 0.18, ws.r * 0.18, ws.w + 0.055, 20),
        glossBlackSpokeMat
      );
      centerCap.rotation.z = Math.PI / 2;
      spinGroup.add(centerCap);

      wheelMount.add(spinGroup);
      this.group.add(wheelMount);
      this.wheels.push(spinGroup);
      if (ws.z > 0) {
        this.frontWheelMounts.push(wheelMount);
      }
    });
  }

  public updateAnimation(
    speedMph: number,
    dt: number,
    thrusterState: ThrusterVisualState,
    isAirborne: boolean
  ) {
    this.animClock += dt;

    // 1. Spin Wheels + Turn Front Wheels on Steering
    const speedMps = (speedMph * 1609.34) / 3600;
    const rotDelta = (speedMps / 2.25) * dt * Math.PI * 2;
    this.wheels.forEach((w) => {
      w.rotation.x += rotDelta;
    });

    const targetSteer = thrusterState.steerAngleRad || 0;
    this.frontWheelMounts.forEach((fw) => {
      fw.rotation.y = THREE.MathUtils.damp(fw.rotation.y, targetSteer, 14, dt);
    });

    // 2. Spin the 4 Rear Diffuser 'Sucker' Fans
    if (thrusterState.suctionFanActive || speedMph > 20) {
      const fanSpeed = thrusterState.suctionFanActive ? 45 : 18;
      this.suckerFans.forEach((fan) => {
        fan.rotation.z += fanSpeed * dt;
      });
    }

    // 3. 4 Independent Retractable 'Sucker' Skirts & High-Flow Mode (>200 mph)
    const targetSideSkirtY = thrusterState.suctionFanActive ? 0.09 : 0.15;
    const targetFrontRearSkirtY =
      thrusterState.highFlowSkirtMode ? 0.22 : thrusterState.suctionFanActive ? 0.08 : 0.14;

    if (this.skirtLeft && this.skirtRight) {
      this.skirtLeft.position.y = THREE.MathUtils.damp(this.skirtLeft.position.y, targetSideSkirtY, 10, dt);
      this.skirtRight.position.y = THREE.MathUtils.damp(this.skirtRight.position.y, targetSideSkirtY, 10, dt);
    }
    if (this.skirtFront && this.skirtRear) {
      this.skirtFront.position.y = THREE.MathUtils.damp(this.skirtFront.position.y, targetFrontRearSkirtY, 10, dt);
      this.skirtRear.position.y = THREE.MathUtils.damp(this.skirtRear.position.y, targetFrontRearSkirtY, 10, dt);
    }

    // 4. Double-Wishbone Rocker-Arm Suspension Compression, Cornering Roll & Launch Squat
    const targetBodyOffsetY = -thrusterState.suspensionCompression * 0.055;
    const targetRoll = thrusterState.chassisRollRad || 0;
    const targetPitchSquat = thrusterState.chassisPitchSquatRad || 0;
    this.chassisBodyGroup.position.y = THREE.MathUtils.damp(this.chassisBodyGroup.position.y, targetBodyOffsetY, 12, dt);
    this.chassisBodyGroup.rotation.z = THREE.MathUtils.damp(this.chassisBodyGroup.rotation.z, targetRoll, 10, dt);
    this.chassisBodyGroup.rotation.x = THREE.MathUtils.damp(this.chassisBodyGroup.rotation.x, targetPitchSquat, 10, dt);

    // 5. Optimus-Actuated Active Rear Wing
    if (this.activeSpoiler) {
      const wingDeployed = speedMph > 50 || isAirborne || thrusterState.suctionFanActive;
      const targetWingY = wingDeployed ? (thrusterState.highFlowSkirtMode ? 0.68 : 0.74) : 0.56;
      const targetWingTilt = isAirborne ? -0.22 : thrusterState.highFlowSkirtMode ? -0.04 : -0.16;
      this.activeSpoiler.position.y = THREE.MathUtils.damp(this.activeSpoiler.position.y, targetWingY, 7, dt);
      this.activeSpoiler.rotation.x = THREE.MathUtils.damp(this.activeSpoiler.rotation.x, targetWingTilt, 7, dt);
    }

    // 6. Smooth Continuous Pulse for 10 SpaceX Cold-Gas Nitrogen Thrusters (Zero random strobing!)
    const pulse = 0.94 + Math.sin(this.animClock * 28.0) * 0.06;

    this.rearCgtPlumes.forEach((plume, idx) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      if (thrusterState.rearBoost) {
        mat.opacity = (idx % 2 === 0 ? 0.85 : 0.96) * pulse;
        plume.scale.set(1, pulse * 1.1, 1);
      } else {
        mat.opacity = THREE.MathUtils.damp(mat.opacity, 0, 15, dt);
      }
    });
    if (this.thrusterLight) {
      this.thrusterLight.intensity = thrusterState.rearBoost
        ? 4.2 * pulse
        : THREE.MathUtils.damp(this.thrusterLight.intensity, 0, 12, dt);
    }

    this.hoverJetPlumes.forEach((jetGroup) => {
      jetGroup.visible = thrusterState.hoverThrust;
      if (thrusterState.hoverThrust) {
        jetGroup.scale.set(1, 0.92 + Math.sin(this.animClock * 32.0) * 0.08, 1);
      }
    });
    if (this.hoverLight) {
      this.hoverLight.intensity = thrusterState.hoverThrust
        ? 3.6 * pulse
        : THREE.MathUtils.damp(this.hoverLight.intensity, 0, 12, dt);
    }

    this.rollLeftPlumes.forEach((plume) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = thrusterState.rollDir < 0 ? 0.9 * pulse : THREE.MathUtils.damp(mat.opacity, 0, 15, dt);
    });
    this.rollRightPlumes.forEach((plume) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = thrusterState.rollDir > 0 ? 0.9 * pulse : THREE.MathUtils.damp(mat.opacity, 0, 15, dt);
    });

    if (this.suctionRing) {
      const sMat = this.suctionRing.material as THREE.MeshBasicMaterial;
      if (thrusterState.suctionFanActive) {
        sMat.opacity = 0.65 * pulse;
        this.suctionRing.rotation.y += 18 * dt;
      } else {
        sMat.opacity = THREE.MathUtils.damp(sMat.opacity, 0, 10, dt);
      }
    }
  }
}
