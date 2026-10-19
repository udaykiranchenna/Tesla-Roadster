/**
 * Physics Engine for the New Tesla Roadster on the Inverted C-Ramp (Lars Moravy Engineering Specs)
 * Models:
 * 1. Powertrain: Dual RWD Electric Motors (>1 MW / 1,050 kW, 1,400 Nm torque, 8.4:1 planetary reduction, 1,680 kg mass)
 *    - Rocket Version (SpaceX Package ON): 0-60 mph in 0.55 seconds!
 *    - Standard Performance (SpaceX Package OFF): 0-60 mph in 1.60 seconds!
 * 2. 'Sucker' Aerodynamic System:
 *    - 4 Fans + 4 Independent Retractable Skirts pulling >2.4G active suction downforce to cling upside-down at 170°!
 *    - High-Flow Mode (200+ mph on flat ground): Front & rear skirts open automatically to minimize drag
 * 3. Full Player-Controlled Mid-Air Flight, Roll-Flip & On-Road Touchdown:
 *    - Launches upside-down (180° roll) off the 170° C-Ramp overhang with lateral drift momentum
 *    - Player controls lateral SpaceX CGT steering (to stay aligned with the 34m asphalt runway),
 *      manual roll flip (180° upside-down -> 0° upright), and nose pitch attitude!
 *    - Landing off the road (|X| > 16.5m) or upside-down triggers a crash penalty; landing upright on the road earns up to 1.30x!
 */
import * as THREE from 'three';
import { TrackBuilder } from './trackBuilder';
import { TeslaRoadsterModel, ThrusterVisualState } from './roadsterModel';
import { TireSmokeParticleSystem } from './particleSystem';
import { soundEngine } from './soundEngine';

export type GamePhase =
  | 'STAGING'
  | 'ACCELERATION'
  | 'RAMP_CLIMB'
  | 'AIRBORNE'
  | 'ROLLOUT'
  | 'COMPLETED';

export type LandingGrade = 'smooth' | 'solid' | 'rough' | 'crash';

export interface Telemetry {
  phase: GamePhase;
  speedMph: number;
  speedKmh: number;
  altitudeMeters: number;
  distanceJumpedMeters: number;
  totalDistanceMeters: number;
  boostFuelPct: number;
  nitrogenPsi: number;          // 0 to 10,000 PSI (600L N2 Tank)
  motorPowerKw: number;         // Up to 1,050+ kW (>1 Megawatt RWD)
  skirtMode: 'SEALED_2G' | 'HIGH_FLOW_200MPH' | 'FLIGHT';
  zeroToSixtySec: number | null; // Measured 0-60 mph rollout time (0.55s Rocket / 1.60s Standard)
  pitchDeg: number;             // On C-Ramp: 0° -> 90° -> 170° (PITCH: 170 DEG upside-down!); In Air: nose pitch
  rollDeg: number;              // Normalized -180° to +180° (0° = upright, ±180° = upside-down)
  isUpsideDown: boolean;        // True when gliding upside-down on the C-ramp overhang or inverted in mid-air
  isUprightReady: boolean;      // True when rolled within ±28° of upright for a safe 4-wheel touchdown
  lateralOffsetMeters: number;  // Signed X offset in meters from runway centerline (runway is -16.5m to +16.5m)
  isOnRunwayCorridor: boolean;  // True when positioned over the asphalt landing runway (|X| <= 16.5m)
  landedOffRoad: boolean;       // True if touchdown occurred outside the asphalt runway bounds
  barrelRollsCount: number;
  suctionG: number;
  gForce: number;
  lateralG: number;
  isTireSmoking: boolean;
  landingGrade: LandingGrade | null;
  countdownTimer: number;
  rolloutBonusMeters: number;
}

export interface PlayerInput {
  accelerate: boolean;
  brake: boolean;
  boost: boolean;
  steerLeft: boolean;
  steerRight: boolean;
  pitchUp: boolean;
  pitchDown: boolean;
  rollLeft: boolean;
  rollRight: boolean;
  analogX: number; // Continuous -1 (left) to +1 (right) from Virtual Thumbstick
  analogY: number; // Continuous -1 (push up / nose down) to +1 (pull down / nose up) from Virtual Thumbstick
}

export class PhysicsEngine {
  public phase: GamePhase = 'STAGING';

  // Physical Constants (Lars Moravy Specs)
  public readonly massKg: number = 1680;
  public readonly gearRatio: number = 8.4;
  public readonly maxMotorTorqueNm: number = 1400;
  public readonly runwayHalfWidth: number = 16.5;
  public hasSpaceXPackage: boolean = true;

  // Arc-length along Approach + C-Ramp (0 to totalTrackLength)
  public sDistance: number = 8.0;
  public forwardSpeed: number = 0; // m/s along the C-ramp tangent
  public rampProgress: number = 0; // 0..1 along the curved C-section + overhang
  public cRampPitchDeg: number = 0; // 0° -> 90° -> 170°
  public isUpsideDown: boolean = false;
  public landedOffRoad: boolean = false;

  // 3D World Position, Velocity & Gimbal-Lock-Free Quaternion Orientation
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.02, 122);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotation: THREE.Euler = new THREE.Euler(0, Math.PI, 0, 'YXZ');
  public quaternion: THREE.Quaternion = new THREE.Quaternion();
  public forwardDir: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  public upDir: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  // Dynamics & Telemetry State
  public speedMph: number = 0;
  public gForce: number = 1.0;
  public lateralG: number = 0.0;
  public suctionG: number = 0.0;
  public boostFuel: number = 100; // % of 10,000 PSI N2 tank
  public motorPowerKw: number = 0;
  public skirtMode: 'SEALED_2G' | 'HIGH_FLOW_200MPH' | 'FLIGHT' = 'SEALED_2G';
  public elapsedRunTime: number = 0;
  public zeroToSixtySec: number | null = null;
  public suspensionCompression: number = 0;

  // Tactile Steering, Body Roll, Thruster Burst & Smoke State
  public lateralOffsetX: number = 0;
  public lateralVelocityX: number = 0;
  public steerAngleRad: number = 0;
  public chassisRollRad: number = 0;
  public chassisPitchSquatRad: number = 0;
  public thrusterBurstIntensity: number = 0;
  public touchdownSmokeBurst: number = 0;
  private wasBoostingLastFrame: boolean = false;
  private currentSurfaceNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  public countdown: number = 2.2;
  public jumpStartZ: number = 17.1;
  public finalDistance: number = 0;
  public landingGrade: LandingGrade | null = null;
  public rolloutBonus: number = 0;

  // Airborne Manual Flip, Roll & Pitch State
  public airElapsed: number = 0;
  public airPitchRad: number = 0;
  public airYawRad: number = 0;
  public barrelRollsCount: number = 0;
  private cumulativeRollRad: number = Math.PI; // Starts at 180° (upside-down) at C-ramp launch lip!
  private rollAngularVel: number = 0;
  private assistTargetRollRad: number | null = null;

  // Reusable math helpers (Zero-GC)
  private readonly _rotMatrix = new THREE.Matrix4();
  private readonly _xAxis = new THREE.Vector3();
  private readonly _yAxis = new THREE.Vector3();
  private readonly _zAxis = new THREE.Vector3();

  private track: TrackBuilder;
  private carModel: TeslaRoadsterModel;
  private smokeSystem?: TireSmokeParticleSystem;
  private onScoreCallback?: (distance: number, grade: LandingGrade, speed: number) => void;

  constructor(
    track: TrackBuilder,
    carModel: TeslaRoadsterModel,
    smokeSystem?: TireSmokeParticleSystem
  ) {
    this.track = track;
    this.carModel = carModel;
    this.smokeSystem = smokeSystem;
    this.reset();
  }

  public setSpaceXPackage(enabled: boolean) {
    this.hasSpaceXPackage = enabled;
  }

  public setOnScore(callback: (distance: number, grade: LandingGrade, speed: number) => void) {
    this.onScoreCallback = callback;
  }

  /**
   * Fires SpaceX Lateral Roll Cold-Gas Thrusters:
   * - If the car is currently upside-down or tilted in mid-air, locks onto the nearest upright (0°/360°) angle to flip right-side-up!
   * - If already upright, executes a full 360° bonus barrel roll!
   */
  public triggerBarrelRoll() {
    if (this.phase === 'AIRBORNE' && this.boostFuel > 2) {
      const normRoll = this.getNormalizedRollDeg();
      const nearestUprightRad =
        Math.round(this.cumulativeRollRad / (Math.PI * 2)) * (Math.PI * 2) || Math.PI * 2;

      if (Math.abs(normRoll) > 30) {
        // Flip from upside-down / tilted directly to upright!
        this.assistTargetRollRad = nearestUprightRad;
        if (this.barrelRollsCount < 1) this.barrelRollsCount = 1;
      } else {
        // Already upright -> perform a full 360° bonus barrel roll!
        this.assistTargetRollRad = nearestUprightRad + Math.PI * 2;
        this.barrelRollsCount += 1;
        this.velocity.z += 10;
        this.velocity.y += 4.0;
      }

      this.boostFuel = Math.max(0, this.boostFuel - 4);
      this.thrusterBurstIntensity = 1.0;
      soundEngine.playLaunchRampWhoosh();
    }
  }

  private getNormalizedRollDeg(): number {
    const raw = ((this.cumulativeRollRad * 180) / Math.PI) % 360;
    return raw > 180 ? raw - 360 : raw < -180 ? raw + 360 : raw;
  }

  /**
   * Combines continuous Virtual Thumbstick analogX (-1..1) with keyboard A/D / Left/Right
   */
  private getEffectiveSteerX(input: PlayerInput): number {
    if (Math.abs(input.analogX) > 0.04) {
      return THREE.MathUtils.clamp(input.analogX, -1, 1);
    }
    let k = 0;
    if (input.steerLeft || input.rollLeft) k -= 1;
    if (input.steerRight || input.rollRight) k += 1;
    return k;
  }

  /**
   * Combines continuous Virtual Thumbstick analogY (-1..1) with keyboard W/S / Up/Down
   */
  private getEffectivePitchY(input: PlayerInput): number {
    if (Math.abs(input.analogY) > 0.04) {
      return THREE.MathUtils.clamp(input.analogY, -1, 1);
    }
    let k = 0;
    if (input.pitchDown) k -= 1;
    if (input.pitchUp) k += 1;
    return k;
  }

  public reset() {
    this.phase = 'STAGING';
    this.sDistance = 8.0; // Starts at Z = 122m facing -Z straight into the giant C-Ramp!
    this.forwardSpeed = 0;
    this.rampProgress = 0;
    this.cRampPitchDeg = 0;
    this.isUpsideDown = false;
    this.landedOffRoad = false;

    const startPt = this.track.getPointAtArcLength(this.sDistance);
    this.position.copy(startPt.position);
    this.position.y = 0.02;
    this.velocity.set(0, 0, 0);
    this.forwardDir.copy(startPt.forward);
    this.upDir.copy(startPt.up);

    this._xAxis.crossVectors(this.upDir, this.forwardDir).normalize();
    this._rotMatrix.makeBasis(this._xAxis, this.upDir, this.forwardDir);
    this.quaternion.setFromRotationMatrix(this._rotMatrix);
    this.rotation.setFromQuaternion(this.quaternion, 'YXZ');

    this.speedMph = 0;
    this.gForce = 1.0;
    this.lateralG = 0.0;
    this.suctionG = 0.0;
    this.boostFuel = 100;
    this.motorPowerKw = 0;
    this.skirtMode = 'SEALED_2G';
    this.elapsedRunTime = 0;
    this.zeroToSixtySec = null;
    this.suspensionCompression = 0;
    this.lateralOffsetX = 0;
    this.lateralVelocityX = 0;
    this.steerAngleRad = 0;
    this.chassisRollRad = 0;
    this.chassisPitchSquatRad = 0;
    this.thrusterBurstIntensity = 0;
    this.touchdownSmokeBurst = 0;
    this.wasBoostingLastFrame = false;
    this.currentSurfaceNormal.set(0, 1, 0);

    this.countdown = 2.2;
    this.jumpStartZ = this.track.rampSpecs.launchLipZ;
    this.finalDistance = 0;
    this.landingGrade = null;
    this.rolloutBonus = 0;
    this.airElapsed = 0;
    this.airPitchRad = 0;
    this.airYawRad = 0;
    this.barrelRollsCount = 0;
    this.cumulativeRollRad = Math.PI;
    this.rollAngularVel = 0;
    this.assistTargetRollRad = null;

    this.track.distanceGates.forEach((g) => (g.passed = false));
    this.track.setCountdownStage(0);
    if (this.smokeSystem) {
      this.smokeSystem.reset();
    }

    this.syncCarTransform();
  }

  public update(dt: number, input: PlayerInput) {
    const delta = Math.min(dt, 0.04);

    // Detect sudden thruster activation (rising edge of boost) for explosive cryo-nitrogen & tire smoke burst!
    const isBoostPressed = this.hasSpaceXPackage && input.boost && this.boostFuel > 0;
    if (isBoostPressed && !this.wasBoostingLastFrame) {
      this.thrusterBurstIntensity = 1.0;
      soundEngine.playLaunchRampWhoosh();
    } else if (isBoostPressed) {
      this.thrusterBurstIntensity = THREE.MathUtils.damp(this.thrusterBurstIntensity, 0.72, 4, delta);
    } else {
      this.thrusterBurstIntensity = THREE.MathUtils.damp(this.thrusterBurstIntensity, 0.0, 8, delta);
    }
    this.wasBoostingLastFrame = isBoostPressed;

    this.touchdownSmokeBurst = THREE.MathUtils.damp(this.touchdownSmokeBurst, 0, 4, delta);

    const isHighFlow = this.speedMph >= 200 && this.phase !== 'RAMP_CLIMB' && this.phase !== 'AIRBORNE';

    const thrusterVisuals: ThrusterVisualState = {
      rearBoost: false,
      hoverThrust: false,
      rollDir: 0,
      pitchDir: 0,
      suctionFanActive: false,
      highFlowSkirtMode: isHighFlow,
      suspensionCompression: this.suspensionCompression,
      steerAngleRad: this.steerAngleRad,
      chassisRollRad: this.chassisRollRad,
      chassisPitchSquatRad: this.chassisPitchSquatRad,
    };

    switch (this.phase) {
      case 'STAGING':
        this.updateStaging(delta, input);
        break;
      case 'ACCELERATION':
        this.updateAcceleration(delta, input, thrusterVisuals);
        break;
      case 'RAMP_CLIMB':
        this.updateRampClimb(delta, input, thrusterVisuals);
        break;
      case 'AIRBORNE':
        this.updateAirborne(delta, input, thrusterVisuals);
        break;
      case 'ROLLOUT':
        this.updateRollout(delta, input, thrusterVisuals);
        break;
      case 'COMPLETED':
        this.motorPowerKw = 0;
        this.lateralG = 0;
        break;
    }

    thrusterVisuals.suspensionCompression = this.suspensionCompression;
    thrusterVisuals.steerAngleRad = this.steerAngleRad;
    thrusterVisuals.chassisRollRad = this.chassisRollRad;
    thrusterVisuals.chassisPitchSquatRad = this.chassisPitchSquatRad;

    const isAirborne = this.phase === 'AIRBORNE';
    const anyThrusterActive =
      thrusterVisuals.rearBoost ||
      thrusterVisuals.hoverThrust ||
      thrusterVisuals.rollDir !== 0;

    soundEngine.updateMotorSound(
      this.speedMph,
      input.accelerate || this.phase === 'RAMP_CLIMB' ? 1 : 0,
      !isAirborne
    );
    soundEngine.setThrusterActive(anyThrusterActive);

    // Emit & Update 3D Tire Smoke and Sudden Thruster Clouds
    if (this.smokeSystem) {
      const isOnGroundOrWall =
        this.phase === 'ACCELERATION' ||
        this.phase === 'RAMP_CLIMB' ||
        this.phase === 'ROLLOUT';

      this.smokeSystem.emitFromRoadster({
        carPosition: this.position,
        carQuaternion: this.quaternion,
        surfaceNormal: this.currentSurfaceNormal,
        speedMph: this.speedMph,
        lateralG: this.lateralG,
        longitudinalG: this.gForce,
        thrusterBurstIntensity: this.thrusterBurstIntensity,
        isOnGroundOrWall,
        touchdownBurst: this.touchdownSmokeBurst,
        rollDir: thrusterVisuals.rollDir,
      });
      this.smokeSystem.update(delta);
    }

    this.carModel.updateAnimation(this.speedMph, delta, thrusterVisuals, isAirborne);
    this.syncCarTransform();
  }

  private updateStaging(dt: number, input: PlayerInput) {
    const prev = this.countdown;
    this.countdown -= dt;
    this.currentSurfaceNormal.set(0, 1, 0);

    // Pre-stage RWD burnout smoke if holding gas or boost during countdown!
    if ((input.accelerate || input.boost) && this.smokeSystem) {
      this.thrusterBurstIntensity = input.boost && this.hasSpaceXPackage ? 0.9 : 0.35;
      this.gForce = 2.2;
      this.smokeSystem.emitFromRoadster({
        carPosition: this.position,
        carQuaternion: this.quaternion,
        surfaceNormal: this.currentSurfaceNormal,
        speedMph: 25,
        lateralG: 0.4,
        longitudinalG: 2.2,
        thrusterBurstIntensity: this.thrusterBurstIntensity,
        isOnGroundOrWall: true,
        touchdownBurst: 0,
        rollDir: 0,
      });
    }

    if (prev > 1.6 && this.countdown <= 1.6) {
      this.track.setCountdownStage(1);
      soundEngine.playCountdownBeep(false);
    } else if (prev > 1.0 && this.countdown <= 1.0) {
      this.track.setCountdownStage(2);
      soundEngine.playCountdownBeep(false);
    } else if (prev > 0.4 && this.countdown <= 0.4) {
      this.track.setCountdownStage(3);
      soundEngine.playCountdownBeep(false);
    } else if (prev > 0.0 && this.countdown <= 0.0) {
      this.track.setCountdownStage(4);
      soundEngine.playCountdownBeep(true);
      this.phase = 'ACCELERATION';
      this.thrusterBurstIntensity = this.hasSpaceXPackage ? 1.0 : 0.4;
    }

    if ((input.accelerate || input.boost) && this.countdown > 0.2) {
      this.countdown = 0.15;
    }
  }

  /**
   * Flat Approach Run (s from 8m to 130m, heading in -Z straight into the base of the C-Ramp)
   */
  private updateAcceleration(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.elapsedRunTime += dt;
    this.currentSurfaceNormal.set(0, 1, 0);
    this.cRampPitchDeg = 0;
    this.isUpsideDown = false;

    const isHighFlow = this.speedMph >= 200;
    this.skirtMode = isHighFlow ? 'HIGH_FLOW_200MPH' : 'SEALED_2G';
    visuals.suctionFanActive = !isHighFlow;
    visuals.highFlowSkirtMode = isHighFlow;
    this.suctionG = isHighFlow ? 0.8 : 2.1;

    const useRocketLaunch =
      this.hasSpaceXPackage && (input.boost || this.speedMph < 65) && this.boostFuel > 0;

    let accelRate = 16.76; // Standard 1.60s 0-60 mph RWD performance
    if (useRocketLaunch) {
      accelRate = 48.76; // 0-60 mph in 0.55 seconds!
      this.boostFuel = Math.max(0, this.boostFuel - 10 * dt);
      visuals.rearBoost = true;
      this.thrusterBurstIntensity = Math.max(this.thrusterBurstIntensity, 0.85);
    } else if (this.hasSpaceXPackage && input.boost && this.boostFuel > 0) {
      accelRate = 38.0;
      this.boostFuel = Math.max(0, this.boostFuel - 12 * dt);
      visuals.rearBoost = true;
    }

    if (input.brake && !input.accelerate) {
      this.forwardSpeed = Math.max(28, this.forwardSpeed - 30 * dt);
      this.motorPowerKw = 0;
      this.chassisPitchSquatRad = 0.035;
      this.lateralG = Math.max(this.lateralG, 0.9);
    } else {
      this.forwardSpeed = Math.min(138, this.forwardSpeed + accelRate * dt);
      this.motorPowerKw = Math.min(1080, Math.round(350 + (this.speedMph / 240) * 730));
      this.chassisPitchSquatRad = -Math.min(0.045, (accelRate / 48.76) * 0.042);
    }

    const nextSpeedMph = this.forwardSpeed * 2.23694;
    if (this.zeroToSixtySec === null && nextSpeedMph >= 60) {
      this.zeroToSixtySec = useRocketLaunch ? 0.55 : 1.60;
    }

    // Proportional Steering via Virtual Thumbstick or Keyboard
    const steerInput = this.getEffectiveSteerX(input);
    this.steerAngleRad = -steerInput * 0.42;
    const targetLatVel = steerInput * Math.min(15, 5 + this.forwardSpeed * 0.11);
    this.lateralVelocityX = THREE.MathUtils.damp(this.lateralVelocityX, targetLatVel, 9, dt);
    this.lateralOffsetX = THREE.MathUtils.clamp(
      this.lateralOffsetX + this.lateralVelocityX * dt,
      -3.4,
      3.4
    );

    const speedFactor = Math.min(1.6, this.speedMph / 90);
    this.lateralG =
      Math.abs(this.lateralVelocityX) * 0.16 * speedFactor +
      (Math.abs(steerInput) > 0.15 ? 0.75 * Math.abs(steerInput) * speedFactor : 0);
    this.chassisRollRad = -steerInput * Math.min(0.065, this.lateralG * 0.028);

    // Side thrusters are OFF on the ground (only active when flying!)
    visuals.rollDir = 0;

    this.sDistance += this.forwardSpeed * dt;
    const pt = this.track.getPointAtArcLength(Math.min(this.sDistance, this.track.rampSpecs.approachLength));

    // Heading in -Z (camera at +Z looking toward -Z):
    // Screen-LEFT is -X (steerInput < 0) and Screen-RIGHT is +X (steerInput > 0)!
    this.position.set(this.lateralOffsetX, 0.02, pt.position.z);
    this.velocity.copy(pt.forward).multiplyScalar(this.forwardSpeed);
    this.forwardDir.copy(pt.forward);
    this.upDir.copy(pt.up);

    // Subtle yaw slip angle when carving left/right
    const yawSlip = this.lateralVelocityX * 0.008;
    this._zAxis.set(Math.sin(yawSlip), 0, -Math.cos(yawSlip)).normalize();
    this._yAxis.set(0, 1, 0);
    this._xAxis.crossVectors(this._yAxis, this._zAxis).normalize();
    this._rotMatrix.makeBasis(this._xAxis, this._yAxis, this._zAxis);
    this.quaternion.setFromRotationMatrix(this._rotMatrix);
    this.rotation.setFromQuaternion(this.quaternion, 'YXZ');

    this.speedMph = nextSpeedMph;
    this.gForce = accelRate / 9.81;
    this.suspensionCompression = Math.min(1, this.gForce * 0.18 + this.lateralG * 0.12);

    if (this.sDistance >= this.track.rampSpecs.approachLength) {
      this.phase = 'RAMP_CLIMB';
      this.forwardSpeed = Math.max(this.forwardSpeed, 88);
      this.thrusterBurstIntensity = 0.9;
      soundEngine.playLaunchRampWhoosh();
    }
  }

  /**
   * Climbing the Vertical C-Ramp (0° -> 90° vertical wall -> 170° upside-down overhang)
   * and Gliding Upside-Down along the 20m top overhang before launching!
   */
  private updateRampClimb(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.skirtMode = 'SEALED_2G';
    visuals.suctionFanActive = true;
    visuals.highFlowSkirtMode = false;
    this.suctionG = 2.4;

    let accelRate = 18.0;
    const isInvertedOverhang = this.cRampPitchDeg >= 85;
    if (this.hasSpaceXPackage && (input.boost || isInvertedOverhang) && this.boostFuel > 0) {
      accelRate += 28.0;
      this.boostFuel = Math.max(0, this.boostFuel - 10 * dt);
      visuals.rearBoost = true;
      this.thrusterBurstIntensity = Math.max(this.thrusterBurstIntensity, isInvertedOverhang ? 0.85 : 0.65);
    }

    this.forwardSpeed = Math.min(138, Math.max(88, this.forwardSpeed + accelRate * dt));
    this.motorPowerKw = 1050;
    this.sDistance += this.forwardSpeed * dt;

    // Player can steer across the C-ramp width while climbing!
    const steerInput = this.getEffectiveSteerX(input);
    this.steerAngleRad = -steerInput * 0.28;
    visuals.rollDir = 0; // Side thrusters OFF on the ramp
    const targetLatVel = steerInput * 8.5;
    this.lateralVelocityX = THREE.MathUtils.damp(this.lateralVelocityX, targetLatVel, 8, dt);
    this.lateralOffsetX = THREE.MathUtils.clamp(
      this.lateralOffsetX + this.lateralVelocityX * dt,
      -3.2,
      3.2
    );

    const rampSpan = this.track.arcLength + this.track.rampSpecs.overhangLength;
    this.rampProgress = THREE.MathUtils.clamp(
      (this.sDistance - this.track.rampSpecs.approachLength) / rampSpan,
      0,
      1
    );

    const pt = this.track.getPointAtArcLength(this.sDistance);
    this.cRampPitchDeg = pt.pitchDeg;
    this.isUpsideDown = pt.pitchDeg > 95;
    this.currentSurfaceNormal.copy(pt.up);
    this.forwardDir.copy(pt.forward);
    this.upDir.copy(pt.up);

    // Did the Roadster just glide past the top upside-down overhang lip of the C-Ramp?
    if (pt.isPastLip) {
      this.phase = 'AIRBORNE';
      this.skirtMode = 'FLIGHT';
      this.jumpStartZ = this.track.rampSpecs.launchLipZ;
      this.thrusterBurstIntensity = 1.0;
      this.airElapsed = 0;

      const launchSpeed = Math.max(this.forwardSpeed, 96);
      const boostBonusZ = input.boost && this.hasSpaceXPackage ? 18 : 6;
      const boostBonusY = input.boost && this.hasSpaceXPackage ? 8 : 3;

      // In +Z flight, Screen-Left is +X and Screen-Right is -X.
      // Flip X on launch transition so the car stays on the same left/right side of the screen!
      this.position.x = -this.lateralOffsetX;
      const initialVx = -this.lateralVelocityX * 0.5;

      this.velocity.set(
        initialVx,
        pt.forward.y * launchSpeed + boostBonusY,
        pt.forward.z * launchSpeed + boostBonusZ
      );

      // Exact continuous orientation at the 170° launch lip:
      // +10° nose-up flight angle in +Z (`airPitchRad = -10°`) AND 180° upside-down roll (`cumulativeRollRad = Math.PI`)!
      const overhangNoseUpRad = ((180 - this.track.rampSpecs.maxAngleDeg) * Math.PI) / 180;
      this.airPitchRad = -overhangNoseUpRad;
      this.airYawRad = Math.atan2(this.velocity.x, this.velocity.z);
      this.cumulativeRollRad = Math.PI; // Starts 180° UPSIDE-DOWN at the lip!
      this.rollAngularVel = steerInput !== 0 ? steerInput * 2.2 : 0.45;
      this.assistTargetRollRad = null;
      this.barrelRollsCount = 0;
      this.isUpsideDown = true;

      soundEngine.playLaunchRampWhoosh();
      return;
    }

    // Keep tires in tight contact with the curved C-ramp and upside-down overhang ceiling!
    this.position.copy(pt.position).addScaledVector(pt.up, 0.02);
    this.position.x = this.lateralOffsetX;
    this.velocity.copy(pt.forward).multiplyScalar(this.forwardSpeed);

    this._xAxis.crossVectors(pt.up, pt.forward).normalize();
    this._rotMatrix.makeBasis(this._xAxis, pt.up, pt.forward);
    this.quaternion.setFromRotationMatrix(this._rotMatrix);
    this.rotation.setFromQuaternion(this.quaternion, 'YXZ');

    this.speedMph = this.forwardSpeed * 2.23694;
    this.gForce = 2.4 + (this.forwardSpeed * this.forwardSpeed) / (this.track.rampSpecs.radius * 9.81 * 3.5);
    this.lateralG = 1.45;
    this.suspensionCompression = 0.72;
    this.chassisRollRad = 0;
    this.chassisPitchSquatRad = -0.02;
  }

  /**
   * Full Player-Controlled Airborne Flight, Roll Flip & Road Alignment:
   * - Car launches upside-down (180° roll) with lateral drift velocity.
   * - Player uses Left Virtual Thumbstick (or WASD/Arrows + [E] Flip button) to:
   *   1. Roll the car from 180° upside-down to 0° upright
   *   2. Vector lateral SpaceX Cold-Gas Thrusters to steer left/right onto the 34m-wide asphalt runway
   *   3. Control nose pitch up/down for maximum glide distance and a level 4-wheel touchdown!
   */
  private updateAirborne(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.airElapsed += dt;
    this.suctionG = 0.0;
    this.skirtMode = 'FLIGHT';
    this.suspensionCompression = 0.0;
    this.steerAngleRad = 0;
    this.chassisRollRad = 0;
    this.chassisPitchSquatRad = 0;
    this.motorPowerKw = 180;
    this.currentSurfaceNormal.set(0, 1, 0);

    const ctrlX = this.getEffectiveSteerX(input); // -1 (left) to +1 (right)
    const ctrlY = this.getEffectivePitchY(input); // -1 (nose down) to +1 (nose up)

    const baseGravity = -9.81;
    const forwardVelZ = this.velocity.z;
    // Pitching the nose slightly upward (+5° to +18°) generates aerodynamic body lift for longer jumps!
    const currentNoseUpDeg = (-this.airPitchRad * 180) / Math.PI;
    const pitchLiftBonus = THREE.MathUtils.clamp(currentNoseUpDeg * 0.08, -1.2, 1.6);
    const aeroLift = Math.min(3.9, forwardVelZ * 0.028) + pitchLiftBonus;

    let thrustZ = 0;
    let thrustY = 0;

    if (this.hasSpaceXPackage && input.boost && this.boostFuel > 0) {
      thrustZ = 36.0;
      thrustY = 8.4;
      this.boostFuel = Math.max(0, this.boostFuel - 13 * dt);
      visuals.rearBoost = true;
      visuals.hoverThrust = true;
    } else if (this.hasSpaceXPackage && input.accelerate && this.boostFuel > 0) {
      thrustZ = 15.0;
      thrustY = 4.6;
      this.boostFuel = Math.max(0, this.boostFuel - 6.0 * dt);
      visuals.hoverThrust = true;
      visuals.rearBoost = true;
    }

    // SpaceX Vertical Hover-Jet Cushion burn when descending near the runway IF the car is upright!
    const normRollDeg = this.getNormalizedRollDeg();
    const isUpright = Math.abs(normRollDeg) <= 35;
    if (this.hasSpaceXPackage && isUpright && this.position.y < 13.0 && this.velocity.y < -4.5) {
      thrustY += 6.2;
      visuals.hoverThrust = true;
      this.thrusterBurstIntensity = Math.max(this.thrusterBurstIntensity, 0.5);
    }

    // ============================================================================
    // 1. MANUAL LATERAL ROAD STEERING (X-Axis Velocity & Runway Alignment)
    // ============================================================================
    // In +Z flight (camera looking toward +Z):
    // - Screen LEFT is World +X
    // - Screen RIGHT is World -X
    // Pressing LEFT arrow (ctrlX < 0) directly drives velocity.x toward +X (Screen LEFT)!
    // Pressing RIGHT arrow (ctrlX > 0) directly drives velocity.x toward -X (Screen RIGHT)!
    const targetVx = -ctrlX * (this.hasSpaceXPackage ? 24.0 : 16.0);
    this.velocity.x = THREE.MathUtils.damp(
      this.velocity.x,
      targetVx,
      Math.abs(ctrlX) > 0.05 ? 8.5 : 3.5,
      dt
    );
    this.lateralVelocityX = this.velocity.x;
    this.lateralG = Math.abs(ctrlX) * 1.1;

    const accelY = baseGravity + aeroLift + thrustY;
    const dragZ = -0.00042 * forwardVelZ * forwardVelZ;
    const accelZ = thrustZ + dragZ;

    this.velocity.y += accelY * dt;
    this.velocity.z = Math.max(52, this.velocity.z + accelZ * dt);

    this.position.x = THREE.MathUtils.clamp(this.position.x + this.velocity.x * dt, -42, 42);
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // ============================================================================
    // 2. MANUAL ROLL FLIP CONTROL (180° Upside-Down -> 0° Upright!)
    // ============================================================================
    if (Math.abs(ctrlX) > 0.06) {
      // Player is actively rolling/steering with Thumbstick or A/D keys!
      this.assistTargetRollRad = null;
      const targetRollRate = ctrlX * 4.4;
      this.rollAngularVel = THREE.MathUtils.damp(this.rollAngularVel, targetRollRate, 10, dt);
      this.cumulativeRollRad += this.rollAngularVel * dt;
      visuals.rollDir = ctrlX > 0 ? 1 : -1;
      visuals.hoverThrust = true;
    } else if (this.assistTargetRollRad !== null) {
      // Player tapped the Quick Flip Upright / 360° Roll [E] thruster button
      const diff = this.assistTargetRollRad - this.cumulativeRollRad;
      if (Math.abs(diff) > 0.04) {
        visuals.rollDir = diff > 0 ? 1 : -1;
        visuals.hoverThrust = true;
        this.cumulativeRollRad = THREE.MathUtils.damp(
          this.cumulativeRollRad,
          this.assistTargetRollRad,
          5.5,
          dt
        );
      } else {
        this.cumulativeRollRad = this.assistTargetRollRad;
        this.assistTargetRollRad = null;
      }
      this.rollAngularVel = 0;
    } else {
      // Stick released: damp angular roll velocity, and if the player has rolled within ±34° of upright (0°/360°),
      // gently engage the SpaceX upright attitude detent so it locks cleanly onto all 4 wheels!
      this.rollAngularVel = THREE.MathUtils.damp(this.rollAngularVel, 0, 5, dt);
      this.cumulativeRollRad += this.rollAngularVel * dt;

      if (Math.abs(normRollDeg) < 34) {
        const nearestUpright =
          Math.round(this.cumulativeRollRad / (Math.PI * 2)) * (Math.PI * 2);
        this.cumulativeRollRad = THREE.MathUtils.damp(
          this.cumulativeRollRad,
          nearestUpright,
          6.0,
          dt
        );
      }
    }

    const completedHalfTurns = Math.floor((Math.abs(this.cumulativeRollRad - Math.PI) + 0.45) / Math.PI);
    if (completedHalfTurns > this.barrelRollsCount) {
      this.barrelRollsCount = completedHalfTurns;
    }

    const updatedNormRoll = this.getNormalizedRollDeg();
    this.isUpsideDown = Math.abs(updatedNormRoll) > 90;

    // ============================================================================
    // 3. MANUAL PITCH CONTROL (Thumbstick Y-Axis or W/S / Up/Down)
    // ============================================================================
    const flightPathPitch = Math.atan2(this.velocity.y, this.velocity.z) * 0.35;
    if (Math.abs(ctrlY) > 0.06) {
      // Direct proportional pitch control from player thumbstick/keys
      const targetManualPitch = THREE.MathUtils.clamp(
        -flightPathPitch - ctrlY * 0.42,
        -0.52, // +30° nose up max
        0.48   // -27° nose down max
      );
      this.airPitchRad = THREE.MathUtils.damp(this.airPitchRad, targetManualPitch, 6.5, dt);
      visuals.pitchDir = ctrlY > 0 ? 1 : -1;
    } else {
      // Subtle aerodynamic trim toward flight path when stick Y is neutral
      const trimPitch = THREE.MathUtils.clamp(-flightPathPitch, -0.22, 0.22);
      this.airPitchRad = THREE.MathUtils.damp(this.airPitchRad, trimPitch, 2.8, dt);
    }

    // Subtle visual yaw alignment with lateral velocity vector so the player feels the car carving through the air!
    const targetAirYaw = Math.atan2(this.velocity.x, this.velocity.z) * 0.65;
    this.airYawRad = THREE.MathUtils.damp(this.airYawRad, targetAirYaw, 6.0, dt);

    this.rotation.set(this.airPitchRad, this.airYawRad, this.cumulativeRollRad, 'YXZ');
    this.quaternion.setFromEuler(this.rotation);

    this.forwardDir.set(0, 0, 1).applyQuaternion(this.quaternion);
    this.upDir.set(0, 1, 0).applyQuaternion(this.quaternion);
    this.cRampPitchDeg = Math.round((-this.airPitchRad * 180) / Math.PI);

    this.speedMph = this.velocity.length() * 2.23694;
    this.gForce = Math.max(0.5, (accelY + 9.81) / 9.81);

    this.track.distanceGates.forEach((gate) => {
      if (!gate.passed && this.position.z >= gate.zPos) {
        gate.passed = true;
        soundEngine.playRecordCheer();
      }
    });

    if (this.position.y <= 0.04 && this.position.z > this.jumpStartZ + 30) {
      this.handleTouchdown();
    }
  }

  private handleTouchdown() {
    this.position.y = 0.02;
    this.phase = 'ROLLOUT';
    this.isUpsideDown = false;
    this.suspensionCompression = 1.0;
    this.touchdownSmokeBurst = 1.0;
    this.currentSurfaceNormal.set(0, 1, 0);

    const pitchDeg = Math.abs((this.airPitchRad * 180) / Math.PI);
    const normRollDeg = Math.abs(this.getNormalizedRollDeg());
    const isOnRunway = Math.abs(this.position.x) <= this.runwayHalfWidth;
    this.landedOffRoad = !isOnRunway;

    let multiplier = 1.0;
    if (!isOnRunway) {
      // Missed the road! Landed outside the 34m asphalt runway
      this.landingGrade = 'crash';
      multiplier = 0.55;
      soundEngine.playTouchdown('crash');
    } else if (pitchDeg < 16 && normRollDeg < 24) {
      this.landingGrade = 'smooth';
      multiplier = 1.30;
      soundEngine.playTouchdown('smooth');
    } else if (pitchDeg < 28 && normRollDeg < 45) {
      this.landingGrade = 'solid';
      multiplier = 1.12;
      soundEngine.playTouchdown('smooth');
    } else if (pitchDeg < 42 && normRollDeg < 72) {
      this.landingGrade = 'rough';
      multiplier = 0.88;
      soundEngine.playTouchdown('rough');
    } else {
      // Landed upside-down or extreme nose-dive!
      this.landingGrade = 'crash';
      multiplier = 0.60;
      soundEngine.playTouchdown('crash');
    }

    const airDist = Math.max(0, this.position.z - this.jumpStartZ);
    this.rolloutBonus = isOnRunway
      ? airDist * (multiplier - 1.0) + this.barrelRollsCount * 45
      : -airDist * 0.25;

    this.velocity.y = 0;
    this.velocity.z = Math.max(20, this.velocity.z * multiplier * 0.85);

    this.rotation.set(0, this.airYawRad * 0.5, 0, 'YXZ');
    this.quaternion.setFromEuler(this.rotation);
    this.forwardDir.set(0, 0, 1).applyQuaternion(this.quaternion);
    this.upDir.set(0, 1, 0);
  }

  private updateRollout(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.suspensionCompression = THREE.MathUtils.damp(this.suspensionCompression, 0.15, 5, dt);
    this.skirtMode = this.speedMph >= 200 ? 'HIGH_FLOW_200MPH' : 'SEALED_2G';
    this.currentSurfaceNormal.set(0, 1, 0);
    this.isUpsideDown = false;
    this.cRampPitchDeg = 0;

    // Steering & High-G Drift Smoke during high-speed rollout along the +Z runway!
    const steerInput = this.getEffectiveSteerX(input);
    this.steerAngleRad = -steerInput * 0.38;
    visuals.rollDir = 0; // Side thrusters OFF on the ground
    const targetLat = -steerInput * Math.min(16, this.velocity.z * 0.20);
    this.lateralVelocityX = THREE.MathUtils.damp(this.lateralVelocityX, targetLat, 8, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x + this.lateralVelocityX * dt, -38, 38);

    const isOffRoadNow = Math.abs(this.position.x) > this.runwayHalfWidth;
    if (isOffRoadNow) {
      this.landedOffRoad = true;
    }

    this.lateralG =
      Math.abs(this.lateralVelocityX) * 0.18 +
      (input.brake && this.speedMph > 40 ? 1.1 : 0) +
      (isOffRoadNow ? 0.9 : 0);
    this.chassisRollRad = -steerInput * Math.min(0.06, this.lateralG * 0.025);

    // Extra off-road drag if the player rolls off the asphalt runway onto the desert floor
    const baseDecel = isOffRoadNow ? 42.0 : 22.0;
    const decel = input.brake ? 52.0 : baseDecel;

    if (this.hasSpaceXPackage && input.boost && this.boostFuel > 0 && !isOffRoadNow) {
      this.velocity.z += 22 * dt;
      this.boostFuel = Math.max(0, this.boostFuel - 14 * dt);
      visuals.rearBoost = true;
    } else {
      this.velocity.z = Math.max(0, this.velocity.z - decel * dt);
    }

    this.position.z += this.velocity.z * dt;
    this.position.y = 0.02;
    this.rotation.set(0, Math.atan2(this.lateralVelocityX, Math.max(10, this.velocity.z)), 0, 'YXZ');
    this.quaternion.setFromEuler(this.rotation);
    this.forwardDir.set(0, 0, 1).applyQuaternion(this.quaternion);
    this.upDir.set(0, 1, 0);

    this.speedMph = this.velocity.z * 2.23694;
    this.gForce = input.brake ? 1.8 : 1.0;

    this.track.distanceGates.forEach((gate) => {
      if (!gate.passed && this.position.z >= gate.zPos) {
        gate.passed = true;
        soundEngine.playRecordCheer();
      }
    });

    if (this.velocity.z <= 0.4) {
      this.velocity.set(0, 0, 0);
      this.phase = 'COMPLETED';
      this.finalDistance = Math.max(0, this.position.z - this.jumpStartZ);

      if (this.onScoreCallback && this.landingGrade) {
        this.onScoreCallback(this.finalDistance, this.landingGrade, this.speedMph);
      }
    }
  }

  private syncCarTransform() {
    this.carModel.group.position.copy(this.position);
    this.carModel.group.quaternion.copy(this.quaternion);
  }

  public getTelemetry(): Telemetry {
    const flightDist =
      this.phase === 'AIRBORNE' || this.phase === 'ROLLOUT' || this.phase === 'COMPLETED'
        ? Math.max(0, this.position.z - this.jumpStartZ)
        : 0;

    const normRoll =
      this.phase === 'RAMP_CLIMB'
        ? this.isUpsideDown
          ? 180
          : 0
        : Math.round(this.getNormalizedRollDeg());

    const isOnSurface =
      this.phase === 'ACCELERATION' || this.phase === 'RAMP_CLIMB' || this.phase === 'ROLLOUT';
    const isTireSmoking =
      (isOnSurface &&
        (this.lateralG > 0.65 || this.gForce > 1.85 || this.touchdownSmokeBurst > 0.1)) ||
      this.thrusterBurstIntensity > 0.25;

    // Positive lateralOffsetMeters = Right of centerline, Negative = Left of centerline
    const signedRoadOffset =
      this.phase === 'STAGING' || this.phase === 'ACCELERATION' || this.phase === 'RAMP_CLIMB'
        ? this.lateralOffsetX
        : -this.position.x;

    return {
      phase: this.phase,
      speedMph: Math.round(this.speedMph),
      speedKmh: Math.round(this.speedMph * 1.60934),
      altitudeMeters: Math.max(0, Math.round((this.position.y - 0.02) * 10) / 10),
      distanceJumpedMeters: Math.round(flightDist * 10) / 10,
      totalDistanceMeters: Math.round(Math.max(0, this.position.z) * 10) / 10,
      boostFuelPct: Math.round(this.boostFuel),
      nitrogenPsi: Math.round(this.boostFuel * 100),
      motorPowerKw: this.motorPowerKw,
      skirtMode: this.skirtMode,
      zeroToSixtySec: this.zeroToSixtySec,
      pitchDeg: Math.round(this.cRampPitchDeg),
      rollDeg: normRoll,
      isUpsideDown: this.isUpsideDown,
      isUprightReady: Math.abs(normRoll) <= 28,
      lateralOffsetMeters: Math.round(signedRoadOffset * 10) / 10,
      isOnRunwayCorridor: Math.abs(signedRoadOffset) <= this.runwayHalfWidth,
      landedOffRoad: this.landedOffRoad,
      barrelRollsCount: this.barrelRollsCount,
      suctionG: Math.round(this.suctionG * 10) / 10,
      gForce: Math.round(this.gForce * 10) / 10,
      lateralG: Math.round(this.lateralG * 10) / 10,
      isTireSmoking,
      landingGrade: this.landingGrade,
      countdownTimer: Math.max(0, Math.ceil(this.countdown)),
      rolloutBonusMeters: Math.round(this.rolloutBonus * 10) / 10,
    };
  }
}
