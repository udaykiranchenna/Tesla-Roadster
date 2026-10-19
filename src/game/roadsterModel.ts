/**
 * Exact 1:1 3D Model of the New Tesla Roadster (Design by Franz von Holzhausen / Engineering by Lars Moravy)
 * Constructed directly from the official studio & reveal photographs:
 * 1. Front Hood & Wedge Fascia (Screenshot 1 & 2):
 *    - Flat-sloping trapezoidal center frunk hood with crisp longitudinal & transverse shutlines
 *    - Raised, sharp-creased outer front fenders with triangular recessed metallic headlight/aero pockets at the front corners
 *    - Black windshield wiper cowl recess at the base of the windshield
 *    - Razor-thin center white horizontal LED lightbar above a dark recessed trapezoidal intake & front splitter
 * 2. Authentic Trapezoidal Windshield, Painted Roof & Flush Side Windows (NO circular glass dome!):
 *    - Wide trapezoidal raked windshield with straight bottom cowl edge, straight top header, and painted A-pillars
 *    - Body-colored painted roof panel with twin longitudinal targa shutlines & painted roof cantrail arches
 *    - Separate flush-fitted side door & rear quarter windows with gloss-black B-pillar divider and visible white sport seats
 * 3. Crisp Faceted Flanks & Kamm-Tail Rear:
 *    - Straight razor-sharp shoulder crease from front wheel arch to rear Kamm-tail corner
 *    - Vertical front fender aero curtain panel with slim recessed black/amber side-repeater camera blade
 *    - Dark sculpted lower rocker skirt + 4 retractable Sucker skirts, 4 rear Cold-Gas Thruster nozzles,
 *      4 rear Sucker fans, and Optimus-actuated wide white/gold GT rear wing
 */
import * as THREE from 'three';

export interface RoadsterCustomization {
  bodyColor: string;
  hasSpaceXPackage: boolean;
  wheelStyle: 'aero' | 'turbine';
  windowTint: number;
}

export const ROADSTER_COLORS = [
  { name: 'Ano White (Official Reveal)', hex: '#f2f4f7', metalness: 0.28, roughness: 0.16, clearcoat: 0.96 },
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
  highFlowSkirtMode: boolean;
  suspensionCompression: number;
  steerAngleRad?: number;
  chassisRollRad?: number;
  chassisPitchSquatRad?: number;
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
   * Builds the Lower & Mid Faceted Wedge Bodywork:
   * - Flat-sloping center frunk hood between raised angular front fenders
   * - Crisp straight shoulder crease from front wheel arch to rear Kamm-tail
   * - Deeply recessed cabin floor so the trapezoidal windshield & side windows never Z-fight
   */
  private buildFranzFacetedBodyGeometry(): THREE.BufferGeometry {
    const zSteps = 88;
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

      // Plan-view half-width profile (tapered angular wedge nose, muscular wheel flares, Kamm tail)
      let halfWidth = 0.96;
      if (z > 1.50) {
        const nt = (z - 1.50) / (maxZ - 1.50);
        halfWidth = THREE.MathUtils.lerp(0.96, 0.58, Math.pow(nt, 1.08));
      } else if (z < -1.65) {
        const rt = (-1.65 - z) / (-1.65 - minZ);
        halfWidth = THREE.MathUtils.lerp(0.98, 0.80, Math.pow(rt, 1.05));
      } else {
        const fFlare = 0.032 * Math.exp(-Math.pow((z - frontWheelZ) / 0.52, 2));
        const rFlare = 0.048 * Math.exp(-Math.pow((z - rearWheelZ) / 0.58, 2));
        halfWidth = 0.94 + fFlare + rFlare;
      }

      // Center Frunk Hood & Rear Deck Height
      let centerHeight = 0.64;
      if (z >= 0.92) {
        // Flat-sloping center hood from cowl (z=0.92, y=0.64) down to nose leading edge (z=2.28, y=0.395)
        const ft = (z - 0.92) / (maxZ - 0.92);
        centerHeight = THREE.MathUtils.lerp(0.64, 0.395, Math.pow(ft, 0.94));
      } else if (z <= -1.15) {
        // Rear deck behind rear glass
        const rt = (-1.15 - z) / (-1.15 - minZ);
        centerHeight = THREE.MathUtils.lerp(0.74, 0.71, rt);
      } else {
        // Deep cabin cockpit well (z ∈ [-1.15, 0.92]) so interior seats & glass sit cleanly above!
        centerHeight = 0.46;
      }

      // Straight rising shoulder crease from front fender peak (y=0.71 at z=1.35) to rear haunch (y=0.79 at z=-1.55)
      let shoulderCrestY = 0.72;
      if (z > 1.35) {
        const ft = (z - 1.35) / (maxZ - 1.35);
        // Sharp angular front fender ridge slicing down to the outer front bumper corners
        shoulderCrestY = THREE.MathUtils.lerp(0.71, 0.405, Math.pow(ft, 0.96));
      } else if (z >= -1.55) {
        const mt = (1.35 - z) / 2.90;
        shoulderCrestY = THREE.MathUtils.lerp(0.71, 0.79, mt);
      } else {
        const rt = (-1.55 - z) / (-1.55 - minZ);
        shoulderCrestY = THREE.MathUtils.lerp(0.79, 0.72, rt);
      }

      // Wheel arch cutouts & rising dark rocker line
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
        const rockerSlope = THREE.MathUtils.clamp((0.8 - z) / 2.2, 0, 1) * 0.08;
        bottomEdgeY = 0.20 + rockerSlope;
      }

      for (let iu = 0; iu <= uSteps; iu++) {
        const s = (iu / uSteps) * 2 - 1;
        const absS = Math.abs(s);
        const signS = s < 0 ? -1 : 1;

        let x = 0;
        let y = 0;

        if (absS <= 0.42) {
          // Flat center frunk panel / cabin tub / rear deck
          const uCenter = absS / 0.42;
          x = signS * halfWidth * 0.54 * uCenter;
          y = centerHeight;
        } else if (absS <= 0.66) {
          // Raised angular fender ridge / cabin sill shoulder
          const uFender = (absS - 0.42) / 0.24;
          x = signS * halfWidth * THREE.MathUtils.lerp(0.54, 0.96, uFender);
          // Crisp planar facet from inner hood shutline up to outer fender peak
          y = THREE.MathUtils.lerp(centerHeight, shoulderCrestY, Math.pow(uFender, 0.85));
        } else {
          // Planar vertical/tucked door & fender side flank
          const uFlank = (absS - 0.66) / 0.34;
          x = signS * halfWidth * THREE.MathUtils.lerp(0.96, 0.99, Math.sin(uFlank * (Math.PI / 2)));
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
   * Builds the Authentic Trapezoidal Raked Front Windshield (Screenshot 1 & 2):
   * - Straight horizontal bottom cowl edge at z = +0.94 (halfWidth = 0.64m, y = 0.645m)
   * - Straight horizontal top roof header at z = -0.02 (halfWidth = 0.50m, y = 1.045m)
   * - Crisp straight side edges framed by the painted A-pillars (NO circular or oval shape!)
   */
  private buildTrapezoidalWindshieldGeometry(): THREE.BufferGeometry {
    const zSteps = 24;
    const xSteps = 20;
    const zTop = -0.02;
    const zBottom = 0.94;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps; // 0 = top header (z=-0.02), 1 = bottom cowl (z=+0.94)
      const z = THREE.MathUtils.lerp(zTop, zBottom, tz);
      const halfW = THREE.MathUtils.lerp(0.50, 0.64, tz);
      // Slight aerodynamic longitudinal curve from cowl up to roof header
      const baseLineY = THREE.MathUtils.lerp(1.042, 0.648, Math.pow(tz, 0.92)) + Math.sin(tz * Math.PI) * 0.028;

      for (let ix = 0; ix <= xSteps; ix++) {
        const sx = (ix / xSteps) * 2 - 1; // -1..+1
        const x = sx * halfW;
        // Subtle cross-car cylindrical windshield crown
        const crown = (1 - sx * sx) * 0.028;
        const y = baseLineY + crown;

        positions.push(x, y, z);
        uvs.push(ix / xSteps, tz);

        if (iz < zSteps && ix < xSteps) {
          const a = iz * (xSteps + 1) + ix;
          const b = (iz + 1) * (xSteps + 1) + ix;
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
   * Builds the Body-Colored Painted Roof Panel behind the Windshield Header (Screenshot 1):
   * - Spans from z = -0.02 (windshield header) back to z = -0.78 (rear fastback glass header)
   * - Matches the car's body paint color, divided into 3 panels by 2 longitudinal shutlines
   */
  private buildPaintedRoofPanelGeometry(): THREE.BufferGeometry {
    const zSteps = 18;
    const xSteps = 18;
    const zRear = -0.78;
    const zFront = -0.02;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps; // 0 = rear (-0.78), 1 = front (-0.02)
      const z = THREE.MathUtils.lerp(zRear, zFront, tz);
      const halfW = THREE.MathUtils.lerp(0.45, 0.50, tz);
      const centerLineY = THREE.MathUtils.lerp(0.985, 1.042, Math.sin(tz * (Math.PI / 2)));

      for (let ix = 0; ix <= xSteps; ix++) {
        const sx = (ix / xSteps) * 2 - 1;
        const x = sx * halfW;
        const crown = (1 - sx * sx) * 0.024;
        const y = centerLineY + crown;

        positions.push(x, y, z);
        uvs.push(ix / xSteps, tz);

        if (iz < zSteps && ix < xSteps) {
          const a = iz * (xSteps + 1) + ix;
          const b = (iz + 1) * (xSteps + 1) + ix;
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
   * Builds the Tapered Rear Fastback Glass between the C-Pillar Buttresses (z = -0.78 to -1.55)
   */
  private buildRearFastbackGlassGeometry(): THREE.BufferGeometry {
    const zSteps = 14;
    const xSteps = 12;
    const zRear = -1.55;
    const zFront = -0.78;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps; // 0 = rear (-1.55), 1 = front (-0.78)
      const z = THREE.MathUtils.lerp(zRear, zFront, tz);
      const halfW = THREE.MathUtils.lerp(0.32, 0.45, tz);
      const y = THREE.MathUtils.lerp(0.755, 0.985, tz);

      for (let ix = 0; ix <= xSteps; ix++) {
        const sx = (ix / xSteps) * 2 - 1;
        const x = sx * halfW;
        positions.push(x, y + (1 - sx * sx) * 0.012, z);
        uvs.push(ix / xSteps, tz);

        if (iz < zSteps && ix < xSteps) {
          const a = iz * (xSteps + 1) + ix;
          const b = (iz + 1) * (xSteps + 1) + ix;
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
   * Builds the Flush Teardrop Side Window Glass (Door Glass + Rear Quarter Window) for Left (+1) or Right (-1) side
   * Matches Screenshot 1 & 2:
   * - Pointed front corner at z = +0.76, y = 0.69, |x| = 0.72
   * - Arched upper roofline following the painted roof cantrail up to y = 1.02 at z = -0.10
   * - Rising lower beltline from y = 0.69 (front) to y = 0.79 (rear corner at z = -1.18)
   */
  private buildSideWindowGeometry(side: 1 | -1): THREE.BufferGeometry {
    const zSteps = 28;
    const vSteps = 8;
    const zRear = -1.18;
    const zFront = 0.76;

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let iz = 0; iz <= zSteps; iz++) {
      const tz = iz / zSteps; // 0 = rear corner (-1.18), 1 = front corner (+0.76)
      const z = THREE.MathUtils.lerp(zRear, zFront, tz);

      // Lower window sill beltline
      const sillY = THREE.MathUtils.lerp(0.79, 0.68, tz);
      const sillX = THREE.MathUtils.lerp(0.74, 0.76, Math.sin(tz * Math.PI));

      // Upper window arch line (meets sill at front & rear tips, arches up to roof rail in the middle)
      const archEnv = Math.sin(Math.pow(tz, 0.85) * Math.PI);
      const topY = sillY + 0.31 * archEnv;
      const topX = THREE.MathUtils.lerp(sillX, 0.51, archEnv * 0.92);

      for (let iv = 0; iv <= vSteps; iv++) {
        const tv = iv / vSteps; // 0 = bottom sill, 1 = top roof rail
        const y = THREE.MathUtils.lerp(sillY, topY, tv);
        // Subtle outward tumblehome curvature of the side glass
        const xMag = THREE.MathUtils.lerp(sillX, topX, tv) + Math.sin(tv * Math.PI) * 0.015;
        const x = side * xMag;

        positions.push(x, y, z);
        uvs.push(tz, tv);

        if (iz < zSteps && iv < vSteps) {
          const a = iz * (vSteps + 1) + iv;
          const b = (iz + 1) * (vSteps + 1) + iv;
          if (side > 0) {
            indices.push(a, a + 1, b);
            indices.push(a + 1, b + 1, b);
          } else {
            indices.push(a, b, a + 1);
            indices.push(a + 1, b, b + 1);
          }
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

    // 2. High-Gloss Smoked Automotive Windshield & Side Window Glass
    const darkGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0x111620),
      metalness: 0.25,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const darkRockerMat = new THREE.MeshStandardMaterial({
      color: 0x181b22,
      roughness: 0.42,
      metalness: 0.55,
    });

    const matteBlackMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.55,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const chromeCornerPocketMat = new THREE.MeshPhysicalMaterial({
      color: 0xdce4ee,
      metalness: 0.85,
      roughness: 0.12,
      clearcoat: 1.0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const brassNozzleMat = new THREE.MeshStandardMaterial({
      color: 0xc59b40,
      metalness: 0.88,
      roughness: 0.22,
    });

    // ==========================================
    // 1. FACETED WEDGE COACHWORK & HOOD SHUTLINES
    // ==========================================
    const bodyGeo = this.buildFranzFacetedBodyGeometry();
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = false;
    this.chassisBodyGroup.add(bodyMesh);

    // Crisp Dark Frunk Hood Longitudinal & Transverse Shutlines (Screenshot 1 & 2)
    [-1, 1].forEach((side) => {
      // Longitudinal frunk shutline from cowl (z=0.94) to front corner pocket (z=2.24)
      const hoodSeam = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 1.32), matteBlackMat);
      hoodSeam.position.set(side * 0.47, 0.525, 1.60);
      hoodSeam.rotation.x = 0.185;
      hoodSeam.rotation.y = side * -0.095;
      this.chassisBodyGroup.add(hoodSeam);

      // Triangular Metallic Headlight / Aero Corner Pocket at front outer hood corners (Screenshot 1!)
      const pocketShape = new THREE.Shape();
      pocketShape.moveTo(0, 0);
      pocketShape.lineTo(side * 0.22, -0.04);
      pocketShape.lineTo(side * 0.04, 0.52);
      pocketShape.closePath();

      const pocketGeo = new THREE.ShapeGeometry(pocketShape);
      pocketGeo.rotateX(-Math.PI / 2 + 0.20);
      const pocketMesh = new THREE.Mesh(pocketGeo, chromeCornerPocketMat);
      pocketMesh.position.set(side * 0.43, 0.425, 2.18);
      pocketMesh.rotation.z = side * -0.18;
      this.chassisBodyGroup.add(pocketMesh);

      // Slim LED brow strip along the top edge of the triangular corner pocket (Screenshot 1 & 2)
      const cornerLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.19, 0.012, 0.025),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      cornerLed.position.set(side * 0.52, 0.495, 1.72);
      cornerLed.rotation.y = side * -0.35;
      cornerLed.rotation.z = side * -0.16;
      this.chassisBodyGroup.add(cornerLed);
    });

    // Transverse Frunk Shutline & Black Windshield Cowl / Wiper Recess Bay (Screenshot 1 & 2)
    const cowlBay = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.025, 0.14), matteBlackMat);
    cowlBay.position.set(0, 0.642, 0.94);
    cowlBay.rotation.x = 0.15;
    this.chassisBodyGroup.add(cowlBay);

    const transverseHoodSeam = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.008, 0.014), matteBlackMat);
    transverseHoodSeam.position.set(0, 0.618, 1.12);
    this.chassisBodyGroup.add(transverseHoodSeam);

    // ==========================================
    // 2. FRONT WEDGE LIGHTBAR, TRAPEZOIDAL BLACK INTAKE & SPLITTER
    // ==========================================
    const frontLedMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const frontCenterLed = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.022, 0.03), frontLedMat);
    frontCenterLed.position.set(0, 0.392, 2.29);
    this.chassisBodyGroup.add(frontCenterLed);

    // Recessed Trapezoidal Matte-Black Front Bumper Fascia & Grille Mouth (Screenshot 1, 2, 3)
    const frontIntakeCavity = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.22, 0.26), matteBlackMat);
    frontIntakeCavity.position.set(0, 0.255, 2.15);
    this.chassisBodyGroup.add(frontIntakeCavity);

    this.frontChinSpoiler = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.036, 0.48), darkRockerMat);
    this.frontChinSpoiler.position.set(0, 0.135, 2.02);
    this.chassisBodyGroup.add(this.frontChinSpoiler);

    // ==========================================
    // 3. VERTICAL FRONT FENDER AERO CURTAIN & AMBER SIDE MARKER BLADE (Screenshot 2)
    // ==========================================
    [-1, 1].forEach((side) => {
      // Vertical door/fender cutline seam behind front wheel
      const doorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.40, 0.012), matteBlackMat);
      doorSeam.position.set(side * 0.968, 0.44, 0.72);
      this.chassisBodyGroup.add(doorSeam);

      // Recessed Black & Amber Side-Repeater Camera Blade (Screenshot 2)
      const markerHousing = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.034, 0.22), matteBlackMat);
      markerHousing.position.set(side * 0.968, 0.53, 0.82);
      this.chassisBodyGroup.add(markerHousing);

      const amberLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.050, 0.016, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xff7700 })
      );
      amberLed.position.set(side * 0.974, 0.532, 0.88);
      this.chassisBodyGroup.add(amberLed);
    });

    // ==========================================
    // 4. INTERIOR SPORT BUCKET SEATS & COCKPIT (Visible in Screenshot 2!)
    // ==========================================
    const cockpitFloor = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 1.75), matteBlackMat);
    cockpitFloor.position.set(0, 0.48, -0.05);
    this.chassisBodyGroup.add(cockpitFloor);

    const seatWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xd8dee8,
      roughness: 0.4,
      metalness: 0.1,
    });
    [-0.29, 0.29].forEach((seatX) => {
      const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.10), seatWhiteMat);
      seatBack.position.set(seatX, 0.74, -0.32);
      seatBack.rotation.x = -0.28;
      this.chassisBodyGroup.add(seatBack);

      const headrest = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 16), seatWhiteMat);
      headrest.position.set(seatX, 0.94, -0.38);
      headrest.rotation.x = -0.22;
      this.chassisBodyGroup.add(headrest);

      const headrestHole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 12), matteBlackMat);
      headrestHole.rotation.x = Math.PI / 2;
      headrestHole.position.set(seatX, 0.92, -0.35);
      this.chassisBodyGroup.add(headrestHole);
    });

    // ==========================================
    // 5. AUTHENTIC TRAPEZOIDAL WINDSHIELD, PAINTED ROOF, A-PILLARS & SIDE WINDOWS
    //    (Zero circular glass! Exact geometry from Screenshot 1, 2 & 3)
    // ==========================================
    // A. Raked Trapezoidal Front Windshield Glass
    const windshieldMesh = new THREE.Mesh(this.buildTrapezoidalWindshieldGeometry(), darkGlassMat);
    this.chassisBodyGroup.add(windshieldMesh);

    // B. Body-Colored Painted Roof Panel (with 2 longitudinal targa seams as in Screenshot 1!)
    const paintedRoofMesh = new THREE.Mesh(this.buildPaintedRoofPanelGeometry(), bodyMat);
    paintedRoofMesh.castShadow = true;
    this.chassisBodyGroup.add(paintedRoofMesh);

    // Roof Targa Panel Shutlines (Screenshot 1 top view: 2 longitudinal lines + front/rear header lines)
    [-0.17, 0.17].forEach((xSeam) => {
      const roofLongSeam = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.008, 0.76), matteBlackMat);
      roofLongSeam.position.set(xSeam, 1.052, -0.40);
      roofLongSeam.rotation.x = 0.07;
      this.chassisBodyGroup.add(roofLongSeam);
    });
    const roofHeaderSeam = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.008, 0.012), matteBlackMat);
    roofHeaderSeam.position.set(0, 1.055, -0.02);
    this.chassisBodyGroup.add(roofHeaderSeam);

    // C. Rear Fastback Glass between C-Pillars
    const rearGlassMesh = new THREE.Mesh(this.buildRearFastbackGlassGeometry(), darkGlassMat);
    this.chassisBodyGroup.add(rearGlassMesh);

    // D. Left & Right Flush Teardrop Side Windows + Gloss-Black B-Pillar + Painted A-Pillar/Roof Cantrail Arches
    ([-1, 1] as (1 | -1)[]).forEach((side) => {
      const sideWinMesh = new THREE.Mesh(this.buildSideWindowGeometry(side), darkGlassMat);
      this.chassisBodyGroup.add(sideWinMesh);

      // Gloss-Black B-Pillar Divider between Door Window & Rear Quarter Window (Screenshot 1 & 2)
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.30, 0.045), matteBlackMat);
      bPillar.position.set(side * 0.62, 0.88, -0.42);
      bPillar.rotation.z = side * 0.48;
      bPillar.rotation.x = -0.15;
      this.chassisBodyGroup.add(bPillar);

      // Body-Colored Painted A-Pillar to C-Pillar Roof Cantrail Arch (Screenshot 1 & 2)
      const roofArchPts = [
        new THREE.Vector3(side * 0.66, 0.65, 0.94),   // Base of A-pillar at front fender/cowl
        new THREE.Vector3(side * 0.56, 0.89, 0.42),   // Mid A-pillar framing straight edge of windshield
        new THREE.Vector3(side * 0.50, 1.045, -0.02), // Top of windshield header
        new THREE.Vector3(side * 0.48, 1.02, -0.52),  // Roof cantrail above door glass
        new THREE.Vector3(side * 0.55, 0.88, -1.10),  // C-pillar buttress
        new THREE.Vector3(side * 0.64, 0.76, -1.68),  // Blending into rear haunch deck
      ];
      const archCurve = new THREE.CatmullRomCurve3(roofArchPts);
      const archTube = new THREE.Mesh(new THREE.TubeGeometry(archCurve, 32, 0.036, 10, false), bodyMat);
      archTube.scale.set(1.15, 0.65, 1.0); // Flattened aerodynamic pillar profile
      this.chassisBodyGroup.add(archTube);
    });

    // ==========================================
    // 6. DARK ROCKERS & 4 INDEPENDENT RETRACTABLE 'SUCKER' SKIRTS
    // ==========================================
    const underbodyCore = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.15, 3.95), matteBlackMat);
    underbodyCore.position.set(0, 0.20, 0);
    this.chassisBodyGroup.add(underbodyCore);

    const skirtGeoSide = new THREE.BoxGeometry(0.06, 0.13, 1.84);
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
    // 7. EXACT REAR FASCIA & OPTIMUS-ACTUATED ACTIVE WING (Screenshot 2)
    // ==========================================
    const rearFasciaPanel = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.36, 0.12), matteBlackMat);
    rearFasciaPanel.position.set(0, 0.48, -2.20);
    this.chassisBodyGroup.add(rearFasciaPanel);

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

    const diffuserShell = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 0.28), darkRockerMat);
    diffuserShell.position.set(0, 0.23, -2.14);
    this.chassisBodyGroup.add(diffuserShell);

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

    // Optimus-Actuated Wide GT Rear Wing (Screenshot 2: white upper blade, gold underside, flared side endplates)
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
    // 8. SPACEX PACKAGE: 10 COLD-GAS THRUSTERS
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

    // C. Independent Left/Right Yaw & Roll Reaction Control Thrusters (Front & Rear Flanks)
    [-0.65, 0.95].forEach((zPos) => {
      const yawL = createNitrogenPlume(0.14, 1.65, 0xdff8ff);
      yawL.rotation.z = -Math.PI / 2.6;
      yawL.position.set(0.98, 0.52, zPos);
      spxGroup.add(yawL);
      this.rollLeftPlumes.push(yawL);

      const yawR = createNitrogenPlume(0.14, 1.65, 0xdff8ff);
      yawR.rotation.z = Math.PI / 2.6;
      yawR.position.set(-0.98, 0.52, zPos);
      spxGroup.add(yawR);
      this.rollRightPlumes.push(yawR);
    });

    this.thrusterLight = new THREE.PointLight(0xd8f6ff, 0, 14);
    this.thrusterLight.position.set(0, 0.40, -2.9);
    spxGroup.add(this.thrusterLight);

    this.hoverLight = new THREE.PointLight(0xd8f6ff, 0, 12);
    this.hoverLight.position.set(0, -0.5, 0);
    spxGroup.add(this.hoverLight);

    spxGroup.visible = config.hasSpaceXPackage;
    this.chassisBodyGroup.add(spxGroup);

    // ==========================================
    // 9. 5-SPLIT-SPOKE STAR WHEELS WITH WHITE AERO DISH INSERTS (Screenshot 2 & 3)
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
      roughness: 0.16,
      clearcoat: 1.0,
    });

    const whiteAeroInsertMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef2f7,
      metalness: 0.22,
      roughness: 0.24,
      clearcoat: 0.9,
      side: THREE.DoubleSide,
    });

    const goldCaliperMat = new THREE.MeshStandardMaterial({
      color: 0xd49b2a,
      metalness: 0.82,
      roughness: 0.24,
    });

    wheelSpecs.forEach((ws) => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(ws.x, ws.y, ws.z);

      const spinGroup = new THREE.Group();
      const outerSide = ws.x > 0 ? 1 : -1;

      const tireMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(ws.r, ws.r, ws.w, 32),
        tireRubberMat
      );
      tireMesh.rotation.z = Math.PI / 2;
      tireMesh.castShadow = true;
      spinGroup.add(tireMesh);

      const brakeDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(ws.r * 0.65, ws.r * 0.65, 0.04, 24),
        new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.7, roughness: 0.35 })
      );
      brakeDisc.rotation.z = Math.PI / 2;
      brakeDisc.position.x = outerSide * 0.03;
      spinGroup.add(brakeDisc);

      const caliper = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, ws.r * 0.42, 0.11),
        goldCaliperMat
      );
      caliper.position.set(outerSide * 0.05, 0.05, ws.z > 0 ? -ws.r * 0.38 : ws.r * 0.38);
      wheelMount.add(caliper);

      const dishX = outerSide * (ws.w / 2 + 0.008);
      const spokeX = outerSide * (ws.w / 2 + 0.026);

      const aeroDish = new THREE.Mesh(
        new THREE.RingGeometry(ws.r * 0.26, ws.r * 0.78, 32),
        whiteAeroInsertMat
      );
      aeroDish.rotation.y = outerSide > 0 ? Math.PI / 2 : -Math.PI / 2;
      aeroDish.position.x = dishX;
      spinGroup.add(aeroDish);

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

    // 6. Smooth Continuous Pulse for 10 SpaceX Cold-Gas Nitrogen Thrusters
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

    // Side Reaction Thrusters ONLY fire when flying (isAirborne)!
    const localPlusXWorldX = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).x;
    const isUprightScreenOrientation = localPlusXWorldX >= 0;

    const fireLocalPlusX =
      isAirborne &&
      ((thrusterState.rollDir > 0 && isUprightScreenOrientation) ||
        (thrusterState.rollDir < 0 && !isUprightScreenOrientation));
    const fireLocalMinusX =
      isAirborne &&
      ((thrusterState.rollDir < 0 && isUprightScreenOrientation) ||
        (thrusterState.rollDir > 0 && !isUprightScreenOrientation));

    this.rollLeftPlumes.forEach((plume) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = fireLocalPlusX ? 0.96 * pulse : THREE.MathUtils.damp(mat.opacity, 0, 18, dt);
    });
    this.rollRightPlumes.forEach((plume) => {
      const mat = plume.material as THREE.MeshBasicMaterial;
      mat.opacity = fireLocalMinusX ? 0.96 * pulse : THREE.MathUtils.damp(mat.opacity, 0, 18, dt);
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
