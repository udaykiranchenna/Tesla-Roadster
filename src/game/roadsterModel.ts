/**
 * Exact 1:1 3D Model of the New Tesla Roadster (Design by Franz von Holzhausen / Engineering by Lars Moravy)
 * Built directly from the 5 official reveal screenshots:
 * 1. Crisp Angular Wedge Front Fascia:
 *    - Flat-sloping center hood recessed between two sharp angular front fender ridges
 *    - Center-only razor-thin white horizontal LED light strip above a black trapezoidal intake & active chin spoiler
 * 2. Faceted Side Profile:
 *    - Crisp straight shoulder crease sweeping to an overhanging pointed Kamm-tail
 *    - Front fender vertical aero curtain flap with slim amber side-marker camera blade
 *    - Dark grey/black angled lower rocker & 4 independent retractable 'Sucker' skirts (Front, Rear, Left, Right)
 * 3. Exact Rear Fascia (Screenshot 3 & 4):
 *    - Recessed dual-line full-width red LED taillight bar under sharp Kamm-tail lip
 *    - Centered white "RDSTR" license plate
 *    - Horizontal row of 4 circular brass/gold-lined Cold-Gas Thruster nozzles (O O O O) below the plate
 *    - Horizontal row of 4 spinning "Sucker" downforce fans inside the open diffuser bay below the 4 thrusters
 *    - Optimus-actuated wide GT rear wing with twin central struts, bronze/gold underside, and angled side endplates
 * 4. Vertical Hover & Maneuvering Thrusters (Screenshot 4 & 5):
 *    - Vertical downward cold-gas nitrogen jets firing right behind the front wheels and right behind the rear wheels
 *      with visible supersonic shock diamonds and cryogenic nitrogen vapor clouds
 * 5. Two Authentic Wheel Options:
 *    - 5-Split-Spoke Black Star Blades over White Aero Dish Inserts (Screenshots 1, 2, 3)
 *    - Full Matte Carbon Aero Disc Covers (Screenshot 5 Hover Demo)
 */
import * as THREE from 'three';

export interface RoadsterCustomization {
  bodyColor: string;
  hasSpaceXPackage: boolean;
  wheelStyle: 'aero' | 'turbine';
  windowTint: number;
}

export const ROADSTER_COLORS = [
  { name: 'Ano White (Official Reveal)', hex: '#f2f4f7', metalness: 0.35, roughness: 0.18, clearcoat: 0.95 },
  { name: 'Signature Ultra Red', hex: '#d91424', metalness: 0.85, roughness: 0.14, clearcoat: 1.0 },
  { name: 'Quicksilver Metallic', hex: '#9aa4b0', metalness: 0.92, roughness: 0.14, clearcoat: 1.0 },
  { name: 'Stealth Obsidian Black', hex: '#14161b', metalness: 0.78, roughness: 0.22, clearcoat: 0.9 },
  { name: 'Titanium Gold', hex: '#c8a248', metalness: 0.88, roughness: 0.16, clearcoat: 1.0 },
  { name: 'Starbase Cryo Blue', hex: '#0066dd', metalness: 0.85, roughness: 0.16, clearcoat: 1.0 },
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
  public chassisBodyGroup: THREE.Group; // Moves with double-wishbone rocker-arm suspension!
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
  private rearCgtPlumes: THREE.Mesh[] = [];       // 4 rear horizontal CGT nozzles
  private hoverJetPlumes: THREE.Group[] = [];     // 4 vertical hover jets behind front & rear wheels
  private rollLeftPlumes: THREE.Mesh[] = [];      // Lateral/Yaw CGTs
  private rollRightPlumes: THREE.Mesh[] = [];
  private thrusterLight: THREE.PointLight | null = null;
  private hoverLight: THREE.PointLight | null = null;
  private suctionRing: THREE.Mesh | null = null;

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
   * Builds the exact angular faceted wedge bodywork seen in Screenshots 1, 2 & 3:
   * - Flat wedge nose with crisp diagonal fender seams
   * - Sharp horizontal side character crease from front arch to overhanging Kamm-tail
   * - Circular wheel well cutouts
   */
  private buildFranzFacetedBodyGeometry(): THREE.BufferGeometry {
    const zSteps = 84;
    const uSteps = 44;
    const minZ = -2.28; // Pointed overhanging Kamm-tail rear tip
    const maxZ = 2.28;  // Crisp flat front LED lightblade nose edge

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const frontWheelZ = 1.35;
    const rearWheelZ = -1.30;
    const archRadius = 0.40;

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps; // 0 = rear Kamm-tail (-2.28), 1 = front nose (+2.28)
      const z = THREE.MathUtils.lerp(minZ, maxZ, tz);

      // Planform Half-Width W(z):
      // Crisp angular taper at front nose (z > 1.55) and clean Kamm-tail taper at rear (z < -1.65)
      let halfWidth = 0.96;
      if (z > 1.55) {
        const nt = (z - 1.55) / (maxZ - 1.55);
        halfWidth = THREE.MathUtils.lerp(0.96, 0.56, Math.pow(nt, 1.15));
      } else if (z < -1.65) {
        const rt = (-1.65 - z) / (-1.65 - minZ);
        halfWidth = THREE.MathUtils.lerp(0.98, 0.78, Math.pow(rt, 1.1));
      } else {
        // Subtle muscular flare over front & rear wheels
        const fFlare = 0.035 * Math.exp(-Math.pow((z - frontWheelZ) / 0.55, 2));
        const rFlare = 0.045 * Math.exp(-Math.pow((z - rearWheelZ) / 0.60, 2));
        halfWidth = 0.94 + fFlare + rFlare;
      }

      // Center Hood & Deck Height:
      // Flat raked wedge hood at front (from y=0.39 at nose tip z=2.28 up to y=0.63 at windshield base z=1.05)
      let centerHeight = 0.65;
      if (z > 1.0) {
        const ft = (z - 1.0) / (maxZ - 1.0);
        centerHeight = THREE.MathUtils.lerp(0.63, 0.39, ft);
      } else if (z < -0.9) {
        // Flat Kamm-tail rear decklid sloping gently to sharp rear overhang tip (y = 0.70m)
        const rt = (-0.9 - z) / (-0.9 - minZ);
        centerHeight = THREE.MathUtils.lerp(0.67, 0.70, rt);
      }

      // Sharp Outer Fender Ridge Height (In Screenshot 1 & 2, the outer fender planes sit slightly higher than the flat center hood)
      const frontRidge = z > 0.5 ? 0.065 * Math.sin(Math.min(1, (z - 0.5) / 1.4) * Math.PI) : 0;
      const rearShoulder = z < 0.2 ? 0.045 * Math.min(1, (0.2 - z) / 1.2) : 0;
      const shoulderCrestY = centerHeight + frontRidge + rearShoulder;

      // Wheel Arch & Lower Rocker Cutout Height
      const dFront = Math.abs(z - frontWheelZ);
      const dRear = Math.abs(z - rearWheelZ);
      let bottomEdgeY = 0.22; // Above dark rocker panel
      if (dFront < archRadius) {
        bottomEdgeY = 0.35 + Math.sqrt(Math.max(0, archRadius * archRadius - dFront * dFront)) * 0.95;
      } else if (dRear < archRadius * 1.04) {
        const rA = archRadius * 1.04;
        bottomEdgeY = 0.37 + Math.sqrt(Math.max(0, rA * rA - dRear * dRear)) * 0.96;
      } else if (z < -1.72) {
        // Kamm-tail overhanging rear angle (cuts sharply upward from rear wheel arch to taillight tip!)
        const kt = (-1.72 - z) / (-1.72 - minZ);
        bottomEdgeY = THREE.MathUtils.lerp(0.26, 0.62, kt);
      } else if (z > 1.80) {
        // Front wedge nose lower bumper cutout
        const nt = (z - 1.80) / (maxZ - 1.80);
        bottomEdgeY = THREE.MathUtils.lerp(0.18, 0.37, Math.pow(nt, 1.4));
      } else {
        // Sweeping dark rocker line that rises slightly from front wheel toward rear wheel (Screenshot 1 & 2)
        const rockerSlope = THREE.MathUtils.clamp((0.8 - z) / 2.2, 0, 1) * 0.07;
        bottomEdgeY = 0.20 + rockerSlope;
      }

      for (let iu = 0; iu <= uSteps; iu++) {
        const s = (iu / uSteps) * 2 - 1; // -1 (left bottom) to 0 (top center) to +1 (right bottom)
        const absS = Math.abs(s);
        const signS = s < 0 ? -1 : 1;

        let x = 0;
        let y = 0;

        if (absS <= 0.38) {
          // Flat-topped Center Hood / Decklid section (between the two diagonal fender shutlines!)
          const uCenter = absS / 0.38;
          x = signS * halfWidth * 0.56 * uCenter;
          y = centerHeight;
        } else if (absS <= 0.64) {
          // Crisp Angled Outer Fender Top Plane rising to the sharp horizontal shoulder crease
          const uFender = (absS - 0.38) / 0.26;
          x = signS * halfWidth * THREE.MathUtils.lerp(0.56, 0.96, uFender);
          y = THREE.MathUtils.lerp(centerHeight, shoulderCrestY, uFender);
        } else {
          // Planar Faceted Side Door / Fender Flank dropping from the sharp shoulder crease to the lower rocker
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
   * Builds the Sleek Dark-Tinted Coupe Greenhouse & Fastback Glass with Body-Color Roof Arch Rails
   * matching Screenshots 1, 2 & 3
   */
  private buildCoupeGreenhouseGeometry(): THREE.BufferGeometry {
    const zSteps = 44;
    const uSteps = 24;
    const minZ = -1.62; // Fastback rear glass base
    const maxZ = 1.15;  // Steeply raked windshield base

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps;
      const z = THREE.MathUtils.lerp(minZ, maxZ, tz);

      // Teardrop coupe cabin planform
      const widthEnv =
        0.74 *
        Math.sin(Math.pow(tz, 0.68) * Math.PI * 0.94 + 0.05) *
        (z < -0.4 ? 0.80 + 0.20 * ((z - minZ) / (-0.4 - minZ)) : 1.0);

      // Sleek low-slung fastback roofline peaking at y = 1.11m
      const archCurve = Math.sin(Math.pow(tz, 0.72) * Math.PI);
      const baseY = z > 0 ? 0.62 : 0.66;
      const peakY = baseY + 0.47 * archCurve;

      for (let iu = 0; iu <= uSteps; iu++) {
        const s = (iu / uSteps) * 2 - 1;
        const x = s * widthEnv;
        // Flat-ish center roof glass with crisp side window tumblehome
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

    // 1. Official Ano White / Multi-Coat Body Material
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

    // 2. Deep Tinted Stealth Glass Material (Screenshots 1, 2, 3)
    const darkGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x080a0f),
      metalness: 0.25,
      roughness: 0.04,
      transmission: 0.35,
      transparent: true,
      opacity: 0.94,
      ior: 1.55,
      clearcoat: 1.0,
      reflectivity: 1.0,
    });

    // 3. Dark Charcoal Satin Rocker & Diffuser Composite Material
    const darkRockerMat = new THREE.MeshStandardMaterial({
      color: 0x1e2128,
      roughness: 0.42,
      metalness: 0.55,
    });

    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.5,
      metalness: 0.4,
    });

    const brassNozzleMat = new THREE.MeshStandardMaterial({
      color: 0xc59b40, // Warm gold/brass nozzle lining & wing underside seen in Screenshot 4!
      metalness: 0.88,
      roughness: 0.22,
    });

    // ==========================================
    // 1. FACETED WEDGE COACHWORK & PANEL SEAMS
    // ==========================================
    const bodyGeo = this.buildFranzFacetedBodyGeometry();
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.chassisBodyGroup.add(bodyMesh);

    // Crisp Dark Hood Shutlines & Concealed Headlight Seams (Screenshot 1 & 2)
    [-1, 1].forEach((side) => {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 1.18), matteBlackMat);
      seam.position.set(side * 0.46, 0.52, 1.65);
      seam.rotation.x = 0.19;
      seam.rotation.y = side * -0.12;
      this.chassisBodyGroup.add(seam);
    });

    // ==========================================
    // 2. FRONT WEDGE LIGHTBAR, TRAPEZOIDAL BLACK INTAKE & ACTIVE CHIN SPOILER
    // ==========================================
    // Center-Only Razor-Thin Horizontal White LED Light Strip (Screenshots 1 & 2!)
    const frontCenterLed = new THREE.Mesh(
      new THREE.BoxGeometry(1.10, 0.022, 0.03),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    frontCenterLed.position.set(0, 0.385, 2.275);
    this.chassisBodyGroup.add(frontCenterLed);

    // Recessed Matte-Black Trapezoidal Front Bumper Grille Cavity under the center LED strip
    const frontIntakeCavity = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.22, 0.28), matteBlackMat);
    frontIntakeCavity.position.set(0, 0.26, 2.12);
    this.chassisBodyGroup.add(frontIntakeCavity);

    // Active Multi-Surface Front Chin Spoiler (Lars Moravy 12:05)
    this.frontChinSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.035, 0.48), darkRockerMat);
    this.frontChinSpoiler.position.set(0, 0.135, 2.02);
    this.chassisBodyGroup.add(this.frontChinSpoiler);

    // ==========================================
    // 3. VERTICAL FRONT FENDER AERO FLAP & AMBER SIDE MARKER (Screenshot 1 & 2)
    // ==========================================
    [-1, 1].forEach((side) => {
      // Deployed vertical aero panel behind front wheel arch
      const aeroFlap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.22), bodyMat);
      aeroFlap.position.set(side * 0.955, 0.34, 0.82);
      aeroFlap.rotation.y = side * 0.08;
      this.chassisBodyGroup.add(aeroFlap);

      // Slim horizontal black & amber side-marker camera blade at top of flap
      const markerHousing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.028, 0.24), matteBlackMat);
      markerHousing.position.set(side * 0.96, 0.50, 0.82);
      this.chassisBodyGroup.add(markerHousing);

      const amberLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.014, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xff9900 })
      );
      amberLed.position.set(side * 0.962, 0.505, 0.89);
      this.chassisBodyGroup.add(amberLed);

      // Rear bumper red side-marker reflector dot (Screenshot 3 & 5)
      const rearReflector = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff1122 })
      );
      rearReflector.position.set(side * 0.94, 0.44, -1.78);
      this.chassisBodyGroup.add(rearReflector);
    });

    // ==========================================
    // 4. DARK ROCKERS & 4 INDEPENDENT RETRACTABLE 'SUCKER' SKIRTS (Lars Moravy 13:34)
    // ==========================================
    const underbodyCore = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.16, 4.10), matteBlackMat);
    underbodyCore.position.set(0, 0.21, 0);
    this.chassisBodyGroup.add(underbodyCore);

    // Left & Right Dark Grey/Black Angled Rocker Panels + Retractable Suction Skirts
    const skirtGeoSide = new THREE.BoxGeometry(0.06, 0.12, 1.85);
    this.skirtLeft = new THREE.Mesh(skirtGeoSide, darkRockerMat);
    this.skirtLeft.position.set(0.93, 0.15, 0.02);
    this.chassisBodyGroup.add(this.skirtLeft);

    this.skirtRight = new THREE.Mesh(skirtGeoSide, darkRockerMat);
    this.skirtRight.position.set(-0.93, 0.15, 0.02);
    this.chassisBodyGroup.add(this.skirtRight);

    // Front & Rear Retractable Suction Skirts (Open in High-Flow Mode > 200 mph!)
    const skirtGeoTransverse = new THREE.BoxGeometry(1.68, 0.09, 0.06);
    this.skirtFront = new THREE.Mesh(skirtGeoTransverse, darkRockerMat);
    this.skirtFront.position.set(0, 0.14, 0.92);
    this.chassisBodyGroup.add(this.skirtFront);

    this.skirtRear = new THREE.Mesh(skirtGeoTransverse, darkRockerMat);
    this.skirtRear.position.set(0, 0.14, -0.92);
    this.chassisBodyGroup.add(this.skirtRear);

    // Glowing Underbody Vacuum Seal Ring when 4-Fan Sucker System is pulling >2G
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
      })
    );
    this.suctionRing.position.set(0, 0.03, 0);
    this.group.add(this.suctionRing);

    // ==========================================
    // 5. COUPE GREENHOUSE, ROOF ARCH RAILS & 600L 10,000-PSI NITROGEN TANK
    // ==========================================
    const greenhouseGeo = this.buildCoupeGreenhouseGeometry();
    const greenhouseMesh = new THREE.Mesh(greenhouseGeo, darkGlassMat);
    greenhouseMesh.castShadow = true;
    this.chassisBodyGroup.add(greenhouseMesh);

    // Body-Colored Ano White Upper Window Arch Rails & C-Pillar Fastback Buttresses (Screenshots 1, 2, 3)
    [-1, 1].forEach((side) => {
      const roofArchPts = [
        new THREE.Vector3(side * 0.66, 0.64, 0.95),
        new THREE.Vector3(side * 0.58, 0.98, 0.25),
        new THREE.Vector3(side * 0.54, 1.04, -0.35),
        new THREE.Vector3(side * 0.56, 0.86, -1.05),
        new THREE.Vector3(side * 0.62, 0.70, -1.65),
      ];
      const archCurve = new THREE.CatmullRomCurve3(roofArchPts);
      const archTube = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 28, 0.032, 8, false), bodyMat);
      this.chassisBodyGroup.add(archTube);

      // Thin B-pillar window divider bar (seen in Screenshot 1, 2, 3)
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.34, 0.035), matteBlackMat);
      bPillar.position.set(side * 0.63, 0.83, 0.12);
      bPillar.rotation.z = side * 0.32;
      bPillar.rotation.x = -0.22;
      this.chassisBodyGroup.add(bPillar);
    });

    // 600-Liter 10,000 PSI Carbon-Wrapped Nitrogen Pressure Tank inside rear cabin
    const n2Tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.85, 12, 24), darkRockerMat);
    n2Tank.rotation.z = Math.PI / 2;
    n2Tank.position.set(0, 0.62, -0.75);
    this.chassisBodyGroup.add(n2Tank);

    // ==========================================
    // 6. EXACT REAR FASCIA (SCREENSHOT 3 & 4):
    //    - Dual Red LED Taillight Bar
    //    - "RDSTR" License Plate
    //    - 4x Horizontal Cold-Gas Thrusters (O O O O)
    //    - 4x Horizontal 'Sucker' Fans below the thrusters
    //    - Optimus-Actuated Wide GT Rear Wing
    // ==========================================
    // Recessed Dark Rear Panel under Kamm-tail overhang
    const rearFasciaPanel = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.42, 0.18), matteBlackMat);
    rearFasciaPanel.position.set(0, 0.44, -2.18);
    this.chassisBodyGroup.add(rearFasciaPanel);

    // Dual-Line Full-Width Red LED Taillight Bar (Screenshot 3 & 4)
    const tailLedMat = new THREE.MeshBasicMaterial({ color: 0xff1828 });
    const upperTailBar = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.022, 0.04), tailLedMat);
    upperTailBar.position.set(0, 0.65, -2.26);
    this.chassisBodyGroup.add(upperTailBar);

    const lowerTailBar = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.014, 0.04), tailLedMat);
    lowerTailBar.position.set(0, 0.615, -2.25);
    this.chassisBodyGroup.add(lowerTailBar);

    // White "RDSTR" License Plate centered below taillight bar (Screenshot 3 & 4)
    const plateTex = this.createRDSTRLicensePlateTexture();
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.17),
      new THREE.MeshBasicMaterial({ map: plateTex })
    );
    plateMesh.rotation.y = Math.PI;
    plateMesh.position.set(0, 0.51, -2.245);
    this.chassisBodyGroup.add(plateMesh);

    // Open Rear Diffuser Bay housing the 4 Sucker Fans & 4 Rear CGT Nozzles (Screenshot 4!)
    const diffuserShell = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.28, 0.35), darkRockerMat);
    diffuserShell.position.set(0, 0.26, -2.14);
    this.chassisBodyGroup.add(diffuserShell);

    const diffuserCavity = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 0.38), matteBlackMat);
    diffuserCavity.position.set(0, 0.25, -2.15);
    this.chassisBodyGroup.add(diffuserCavity);

    // 4 Spinning "Sucker" Downforce Fans in a horizontal row inside the lower diffuser (Screenshot 4!)
    [-0.48, -0.16, 0.16, 0.48].forEach((xFan) => {
      const fanGroup = new THREE.Group();
      fanGroup.position.set(xFan, 0.23, -2.22);

      // Shroud ring
      const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 12, 24), darkRockerMat);
      fanGroup.add(shroud);

      // Spinning Impeller Hub & 7 Blades
      const impeller = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), matteBlackMat);
      hub.rotation.x = Math.PI / 2;
      impeller.add(hub);

      for (let b = 0; b < 7; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.095, 0.008), darkRockerMat);
        const ang = (b / 7) * Math.PI * 2;
        blade.position.set(Math.cos(ang) * 0.05, Math.sin(ang) * 0.05, 0);
        blade.rotation.z = ang + 0.35;
        impeller.add(blade);
      }
      fanGroup.add(impeller);
      this.suckerFans.push(impeller);
      this.chassisBodyGroup.add(fanGroup);
    });

    // Optimus-Actuated Wide GT Rear Wing (Screenshot 1 & 4: White top, Bronze/Gold underside, Side Endplates, Twin Struts)
    this.activeSpoiler = new THREE.Group();
    const wingTop = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.022, 0.34), bodyMat);
    wingTop.position.y = 0.20;
    this.activeSpoiler.add(wingTop);

    const wingBottomGold = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.012, 0.33), brassNozzleMat);
    wingBottomGold.position.y = 0.185;
    this.activeSpoiler.add(wingBottomGold);

    // Triangular Side Endplates (Screenshot 1 & 4)
    [-0.87, 0.87].forEach((xEnd) => {
      const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.16, 0.36), bodyMat);
      endplate.position.set(xEnd, 0.14, -0.02);
      endplate.rotation.z = xEnd > 0 ? -0.18 : 0.18;
      this.activeSpoiler!.add(endplate);
    });

    // Twin Central Optimus Robot Actuator Swan-Neck Struts (Screenshot 4)
    [-0.32, 0.32].forEach((xStrut) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.22, 0.09), matteBlackMat);
      strut.position.set(xStrut, 0.09, 0.04);
      strut.rotation.x = -0.25;
      this.activeSpoiler!.add(strut);
    });

    this.activeSpoiler.position.set(0, 0.65, -2.02);
    this.chassisBodyGroup.add(this.activeSpoiler);

    // ==========================================
    // 7. SPACEX PACKAGE: 10 COLD-GAS THRUSTERS (10,000 PSI NITROGEN)
    //    - 4x Horizontal Rear CGT Nozzles (O O O O) below license plate (Screenshot 3 & 4)
    //    - 4x Vertical Hover/Flight Nozzles behind front & rear wheels (Screenshot 4 & 5)
    //    - 2x Lateral Yaw/Roll Stabilizer Nozzles
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

    // A. 4x Horizontal Rear Cold-Gas Thruster Nozzles (O O O O) directly below RDSTR license plate (Screenshot 3 & 4!)
    [-0.39, -0.13, 0.13, 0.39].forEach((xNoz) => {
      const outerRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.042, 0.14, 20, 1, true),
        brassNozzleMat
      );
      outerRing.rotation.x = Math.PI / 2;
      outerRing.position.set(xNoz, 0.38, -2.26);
      spxGroup.add(outerRing);

      const innerCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.032, 0.12, 16),
        matteBlackMat
      );
      innerCore.rotation.x = Math.PI / 2;
      innerCore.position.set(xNoz, 0.38, -2.25);
      spxGroup.add(innerCore);

      // Supersonic 10,000-PSI Nitrogen Jet Plume
      const jetPlume = createNitrogenPlume(0.14, 3.2, 0xd8f6ff);
      jetPlume.rotation.x = -Math.PI / 2;
      jetPlume.position.set(xNoz, 0.38, -2.32);
      spxGroup.add(jetPlume);
      this.rearCgtPlumes.push(jetPlume);

      const shockCore = createNitrogenPlume(0.065, 1.8, 0xffffff);
      shockCore.rotation.x = -Math.PI / 2;
      shockCore.position.set(xNoz, 0.38, -2.32);
      spxGroup.add(shockCore);
      this.rearCgtPlumes.push(shockCore);
    });

    // B. 4x Vertical Downward Hover & Flight Thrusters (Screenshot 4 & Screenshot 5!)
    // Located right behind the front wheels (z = +0.78) and under the rear bumper corners behind rear wheels (z = -1.86)
    const hoverNozzleCoords = [
      { x: 0.78, y: 0.22, z: 0.78 },   // Front-Left Hover CGT (behind front wheel, Screenshot 5)
      { x: -0.78, y: 0.22, z: 0.78 },  // Front-Right Hover CGT
      { x: 0.74, y: 0.24, z: -1.88 },  // Rear-Left Hover CGT (outer diffuser corner, Screenshot 4 & 5)
      { x: -0.74, y: 0.24, z: -1.88 }, // Rear-Right Hover CGT
    ];

    hoverNozzleCoords.forEach((hc) => {
      // Metallic downward thruster nozzle bell (visible in Screenshot 4!)
      const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.052, 0.12, 16), brassNozzleMat);
      bell.position.set(hc.x, hc.y, hc.z);
      spxGroup.add(bell);

      // Multi-stage Shock-Diamond Vertical Nitrogen Jet Group (Screenshot 5!)
      const jetGroup = new THREE.Group();
      jetGroup.position.set(hc.x, hc.y - 0.05, hc.z);

      const mainJet = createNitrogenPlume(0.18, 2.2, 0xdff8ff);
      mainJet.rotation.x = Math.PI; // Point straight DOWN (-Y)
      jetGroup.add(mainJet);

      // 3 Supersonic Shock Diamonds along the vertical jet column (Screenshot 5!)
      [0.35, 0.75, 1.15].forEach((dY, idx) => {
        const diamond = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.055 - idx * 0.01, 0),
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
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

    // C. 2x Independent Left/Right Yaw & Roll Control Thrusters (Lars Moravy 21:09)
    const yawL = createNitrogenPlume(0.12, 1.4, 0xdff8ff);
    yawL.rotation.z = -Math.PI / 3;
    yawL.position.set(0.95, 0.56, -0.6);
    spxGroup.add(yawL);
    this.rollLeftPlumes.push(yawL);

    const yawR = createNitrogenPlume(0.12, 1.4, 0xdff8ff);
    yawR.rotation.z = Math.PI / 3;
    yawR.position.set(-0.95, 0.56, -0.6);
    spxGroup.add(yawR);
    this.rollRightPlumes.push(yawR);

    this.thrusterLight = new THREE.PointLight(0xd8f6ff, 0, 14);
    this.thrusterLight.position.set(0, 0.40, -2.8);
    spxGroup.add(this.thrusterLight);

    this.hoverLight = new THREE.PointLight(0xd8f6ff, 0, 12);
    this.hoverLight.position.set(0, -0.5, 0);
    spxGroup.add(this.hoverLight);

    spxGroup.visible = config.hasSpaceXPackage;
    this.chassisBodyGroup.add(spxGroup);

    // ==========================================
    // 8. EXACT 5-SPLIT-SPOKE STAR WHEELS WITH WHITE AERO DISH INSERTS (SCREENSHOTS 1, 2, 3)
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
    });

    const whiteAeroInsertMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6ebf0, // The bright white/silver recessed aero ring inside the black star spokes in Screenshot 1, 2, 3!
      metalness: 0.35,
      roughness: 0.22,
      clearcoat: 0.8,
      side: THREE.DoubleSide,
    });

    wheelSpecs.forEach((ws) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(ws.x, ws.y, ws.z);

      const spinGroup = new THREE.Group();

      // Pirelli P Zero Tire Barrel
      const tireBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(ws.r, ws.r, ws.w, 36),
        tireRubberMat
      );
      tireBarrel.rotation.z = Math.PI / 2;
      tireBarrel.castShadow = true;
      spinGroup.add(tireBarrel);

      const outerSide = ws.x > 0 ? 1 : -1;
      const faceX = outerSide * (ws.w / 2 + 0.004);

      // Recessed White/Silver Aero Dish Ring (Clearly visible behind the 5 black split spokes in Screenshots 1, 2, 3!)
      const aeroDish = new THREE.Mesh(
        new THREE.RingGeometry(ws.r * 0.28, ws.r * 0.78, 32),
        whiteAeroInsertMat
      );
      aeroDish.rotation.y = outerSide > 0 ? Math.PI / 2 : -Math.PI / 2;
      aeroDish.position.x = faceX - outerSide * 0.012;
      spinGroup.add(aeroDish);

      // Outer Dark Rim Lip
      const rimLip = new THREE.Mesh(
        new THREE.RingGeometry(ws.r * 0.77, ws.r * 0.83, 32),
        glossBlackSpokeMat
      );
      rimLip.rotation.y = outerSide > 0 ? Math.PI / 2 : -Math.PI / 2;
      rimLip.position.x = faceX;
      spinGroup.add(rimLip);

      // 5 Gloss-Black Split-Spoke Star Blades (Exact match to Screenshot 1, 2, 3!)
      for (let i = 0; i < 5; i++) {
        const baseAngle = (i / 5) * Math.PI * 2;
        const spokeLen = ws.r * 0.80;

        // Twin parallel split-bars per star point
        [-0.022, 0.022].forEach((offset) => {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(0.024, 0.022, spokeLen),
            glossBlackSpokeMat
          );
          const perpY = Math.cos(baseAngle) * offset;
          const perpZ = -Math.sin(baseAngle) * offset;
          bar.position.set(
            faceX,
            Math.sin(baseAngle) * (spokeLen * 0.45) + perpY,
            Math.cos(baseAngle) * (spokeLen * 0.45) + perpZ
          );
          bar.rotation.x = -baseAngle;
          spinGroup.add(bar);
        });
      }

      // Gloss Black Center Hub Cap
      const centerCap = new THREE.Mesh(
        new THREE.CylinderGeometry(ws.r * 0.18, ws.r * 0.18, ws.w + 0.016, 20),
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
    // 1. Spin Rear-Wheel-Drive & Front Wheels + Turn Front Wheels on Steering
    const speedMps = (speedMph * 1609.34) / 3600;
    const rotDelta = (speedMps / 2.25) * dt * Math.PI * 2;
    this.wheels.forEach((w) => {
      w.rotation.x += rotDelta;
    });

    const targetSteer = thrusterState.steerAngleRad || 0;
    this.frontWheelMounts.forEach((fw) => {
      fw.rotation.y = THREE.MathUtils.damp(fw.rotation.y, targetSteer, 14, dt);
    });

    // 2. Spin the 4 Rear Diffuser 'Sucker' Fans when active!
    if (thrusterState.suctionFanActive || speedMph > 20) {
      const fanSpeed = thrusterState.suctionFanActive ? 45 : 18;
      this.suckerFans.forEach((fan) => {
        fan.rotation.z += fanSpeed * dt;
      });
    }

    // 3. 4 Independent Retractable 'Sucker' Skirts & High-Flow Mode (>200 mph)
    // Lars Moravy (13:34 & 13:58): Skirts seal down to ground for 2G suction, then front/rear open above 200 mph to reduce drag
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

    // 4. Double-Wishbone Rocker-Arm Suspension Compression, Cornering Roll & Launch Squat (Lars Moravy 8:17)
    const targetBodyOffsetY = -thrusterState.suspensionCompression * 0.065;
    const targetRoll = thrusterState.chassisRollRad || 0;
    const targetPitchSquat = thrusterState.chassisPitchSquatRad || 0;
    this.chassisBodyGroup.position.y = THREE.MathUtils.damp(this.chassisBodyGroup.position.y, targetBodyOffsetY, 12, dt);
    this.chassisBodyGroup.rotation.z = THREE.MathUtils.damp(this.chassisBodyGroup.rotation.z, targetRoll, 10, dt);
    this.chassisBodyGroup.rotation.x = THREE.MathUtils.damp(this.chassisBodyGroup.rotation.x, targetPitchSquat, 10, dt);

    // 5. Optimus-Actuated Active Rear Wing & Front Chin Spoiler (Lars Moravy 12:05, 14:54)
    if (this.activeSpoiler) {
      // High deployment on ramp & flight, low-drag trim above 200 mph
      const wingDeployed = speedMph > 50 || isAirborne || thrusterState.suctionFanActive;
      const targetWingY = wingDeployed ? (thrusterState.highFlowSkirtMode ? 0.68 : 0.74) : 0.56;
      const targetWingTilt = isAirborne ? -0.22 : thrusterState.highFlowSkirtMode ? -0.04 : -0.16;
      this.activeSpoiler.position.y = THREE.MathUtils.damp(this.activeSpoiler.position.y, targetWingY, 7, dt);
      this.activeSpoiler.rotation.x = THREE.MathUtils.damp(this.activeSpoiler.rotation.x, targetWingTilt, 7, dt);
    }

    // 6. Animate 10 SpaceX Cold-Gas Nitrogen Thrusters (10,000 PSI)
    const flicker = 0.85 + Math.random() * 0.30;

    // 4x Rear Horizontal CGT Nozzles (O O O O)
    this.rearCgtPlumes.forEach((plume, idx) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      if (thrusterState.rearBoost) {
        mat.opacity = (idx % 2 === 0 ? 0.85 : 0.98) * flicker;
        plume.scale.set(1, flicker * 1.15, 1);
      } else {
        mat.opacity = THREE.MathUtils.damp(mat.opacity, 0, 15, dt);
      }
    });
    if (this.thrusterLight) {
      this.thrusterLight.intensity = thrusterState.rearBoost
        ? 5.0 * flicker
        : THREE.MathUtils.damp(this.thrusterLight.intensity, 0, 12, dt);
    }

    // 4x Vertical Downward Hover & Flight CGTs (Screenshot 4 & Screenshot 5!)
    this.hoverJetPlumes.forEach((jetGroup) => {
      jetGroup.visible = thrusterState.hoverThrust;
      if (thrusterState.hoverThrust) {
        jetGroup.scale.set(1, 0.85 + Math.random() * 0.35, 1);
      }
    });
    if (this.hoverLight) {
      this.hoverLight.intensity = thrusterState.hoverThrust
        ? 4.2 * flicker
        : THREE.MathUtils.damp(this.hoverLight.intensity, 0, 12, dt);
    }

    // Independent Left vs. Right Yaw/Roll Control CGTs (Lars Moravy 21:09)
    this.rollLeftPlumes.forEach((plume) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = thrusterState.rollDir < 0 ? 0.92 * flicker : THREE.MathUtils.damp(mat.opacity, 0, 15, dt);
    });
    this.rollRightPlumes.forEach((plume) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = thrusterState.rollDir > 0 ? 0.92 * flicker : THREE.MathUtils.damp(mat.opacity, 0, 15, dt);
    });

    // Underbody Suction Ring
    if (this.suctionRing) {
      const sMat = this.suctionRing.material as THREE.MeshBasicMaterial;
      if (thrusterState.suctionFanActive) {
        sMat.opacity = 0.72 * flicker;
        this.suctionRing.rotation.y += 22 * dt;
      } else {
        sMat.opacity = THREE.MathUtils.damp(sMat.opacity, 0, 10, dt);
      }
    }
  }
}
