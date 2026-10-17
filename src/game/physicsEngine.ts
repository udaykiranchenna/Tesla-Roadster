/**
 * Physics Engine for the New Tesla Roadster (Lars Moravy Engineering Specs)
 * Models:
 * 1. Powertrain: Dual RWD Electric Motors (>1 MW / 1,050 kW, 1,400 Nm torque, 8.4:1 planetary reduction, 1,680 kg mass)
 *    - Rocket Version (SpaceX Package ON): 0-60 mph in 0.55 seconds!
 *    - Standard Performance (SpaceX Package OFF): 0-60 mph in 1.60 seconds!
 * 2. 'Sucker' Aerodynamic System:
 *    - 4 Fans + 4 Independent Retractable Skirts pulling >2.0G active suction downforce
 *    - High-Flow Mode (200+ mph): Front & rear skirts open automatically to minimize drag
 * 3. SpaceX Cold-Gas Thruster (CGT) System:
 *    - 600-Liter Compressed Nitrogen Tank at 10,000 PSI
 *    - 10 CGTs (4 Rear Propulsion + 6 Flight/Hover/Independent Yaw & Roll Control)
 * 4. Double-Wishbone Rocker-Arm Suspension with Spool-Valve Adaptive Dampers
 * 5. High-G Cornering & Sudden Thruster Activation Tire Smoke Particle Integration
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
  pitchDeg: number;
  rollDeg: number;
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
}

export class PhysicsEngine {
  public phase: GamePhase = 'STAGING';

  // Physical Constants (Lars Moravy Specs)
  public readonly massKg: number = 1680;
  public readonly gearRatio: number = 8.4;
  public readonly maxMotorTorqueNm: number = 1400;
  public hasSpaceXPackage: boolean = true;

  // Position, Velocity, Orientation
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.35, -25);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');

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
  public lateralVelocityX: number = 0;
  public steerAngleRad: number = 0;
  public chassisRollRad: number = 0;
  public chassisPitchSquatRad: number = 0;
  public thrusterBurstIntensity: number = 0;
  public touchdownSmokeBurst: number = 0;
  private wasBoostingLastFrame: boolean = false;
  private currentSurfaceNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  public countdown: number = 2.4;
  public jumpStartDistance: number = 380;
  public finalDistance: number = 0;
  public landingGrade: LandingGrade | null = null;
  public rolloutBonus: number = 0;

  // Barrel Roll & Yaw Control Tracking
  public barrelRollsCount: number = 0;
  private cumulativeRollRad: number = 0;
  private targetAutoRollRad: number = Math.PI * 2;

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

  public triggerBarrelRoll() {
    if (this.phase === 'AIRBORNE' && this.hasSpaceXPackage && this.boostFuel > 2) {
      this.targetAutoRollRad += Math.PI * 2;
      this.barrelRollsCount += 1;
      this.boostFuel = Math.max(0, this.boostFuel - 4);
      this.thrusterBurstIntensity = 1.0;
      this.velocity.z += 12;
      this.velocity.y += 4.5;
      soundEngine.playLaunchRampWhoosh();
    }
  }

  public reset() {
    this.phase = 'STAGING';
    this.position.set(0, 0.35, -25);
    this.velocity.set(0, 0, 0);
    this.rotation.set(0, 0, 0, 'YXZ');
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
    this.lateralVelocityX = 0;
    this.steerAngleRad = 0;
    this.chassisRollRad = 0;
    this.chassisPitchSquatRad = 0;
    this.thrusterBurstIntensity = 0;
    this.touchdownSmokeBurst = 0;
    this.wasBoostingLastFrame = false;
    this.currentSurfaceNormal.set(0, 1, 0);

    this.countdown = 2.4;
    this.jumpStartDistance = this.track.rampSpecs.endZ;
    this.finalDistance = 0;
    this.landingGrade = null;
    this.rolloutBonus = 0;
    this.barrelRollsCount = 0;
    this.cumulativeRollRad = 0;
    this.targetAutoRollRad = Math.PI * 2;

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
      this.thrusterBurstIntensity = 1.0; // Sudden 10,000 PSI CGT ignition spike!
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
        carRotation: this.rotation,
        surfaceNormal: this.currentSurfaceNormal,
        speedMph: this.speedMph,
        lateralG: this.lateralG,
        longitudinalG: this.gForce,
        thrusterBurstIntensity: this.thrusterBurstIntensity,
        isOnGroundOrWall,
        touchdownBurst: this.touchdownSmokeBurst,
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

    // Pre-stage RWD burnout smoke if holding gas + brake or boost during countdown!
    if ((input.accelerate || input.boost) && this.smokeSystem) {
      this.thrusterBurstIntensity = input.boost && this.hasSpaceXPackage ? 0.9 : 0.3;
      this.gForce = 2.2;
      this.smokeSystem.emitFromRoadster({
        carPosition: this.position,
        carRotation: this.rotation,
        surfaceNormal: this.currentSurfaceNormal,
        speedMph: 25,
        lateralG: 0.4,
        longitudinalG: 2.2,
        thrusterBurstIntensity: this.thrusterBurstIntensity,
        isOnGroundOrWall: true,
        touchdownBurst: 0,
      });
    }

    if (prev > 1.8 && this.countdown <= 1.8) {
      this.track.setCountdownStage(1);
      soundEngine.playCountdownBeep(false);
    } else if (prev > 1.1 && this.countdown <= 1.1) {
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

  private updateAcceleration(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.elapsedRunTime += dt;
    this.currentSurfaceNormal.set(0, 1, 0);

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
      this.boostFuel = Math.max(0, this.boostFuel - 12 * dt);
      visuals.rearBoost = true;
      this.thrusterBurstIntensity = Math.max(this.thrusterBurstIntensity, 0.85);
    } else if (this.hasSpaceXPackage && input.boost && this.boostFuel > 0) {
      accelRate = 38.0;
      this.boostFuel = Math.max(0, this.boostFuel - 14 * dt);
      visuals.rearBoost = true;
    }

    if (this.speedMph > 140 && !useRocketLaunch) {
      accelRate *= isHighFlow ? 0.88 : 0.72;
    }

    if (input.brake && !input.accelerate) {
      this.velocity.z = Math.max(25, this.velocity.z - 32 * dt);
      this.motorPowerKw = 0;
      this.chassisPitchSquatRad = 0.035; // Brake nose dive
      this.lateralG = Math.max(this.lateralG, 0.9); // Brake tire scrub smoke
    } else {
      this.velocity.z = Math.min(146, this.velocity.z + accelRate * dt);
      this.motorPowerKw = Math.min(1080, Math.round(350 + (this.speedMph / 240) * 730));
      // Rear squat under >1MW RWD + 10,000 PSI CGT launch thrust!
      this.chassisPitchSquatRad = -Math.min(0.045, (accelRate / 48.76) * 0.042);
    }

    const nextSpeedMph = this.velocity.z * 2.23694;
    if (this.zeroToSixtySec === null && nextSpeedMph >= 60) {
      this.zeroToSixtySec = useRocketLaunch ? 0.55 : 1.60;
    }

    // Tactile Responsive Steering, High-G Cornering Slip & Independent Yaw Control (Lars Moravy 21:09)
    let steerInput = 0;
    if (input.steerLeft) steerInput = -1;
    if (input.steerRight) steerInput = 1;

    this.steerAngleRad = -steerInput * 0.42; // Front wheels turn visibly!
    const targetLatVel = steerInput * Math.min(16, 6 + this.velocity.z * 0.12);
    this.lateralVelocityX = THREE.MathUtils.damp(this.lateralVelocityX, targetLatVel, 9, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x + this.lateralVelocityX * dt, -5.8, 5.8);

    // If not steering, smoothly return toward centerline before entering the curved wall ramp
    if (steerInput === 0 && this.position.z > 110) {
      this.position.x = THREE.MathUtils.damp(this.position.x, 0, 5.0, dt);
    }

    // Compute High-G Cornering Lateral Acceleration (generates tire smoke when > 0.65G!)
    const speedFactor = Math.min(1.6, this.speedMph / 90);
    this.lateralG = Math.abs(this.lateralVelocityX) * 0.16 * speedFactor + (steerInput !== 0 ? 0.75 * speedFactor : 0);
    this.chassisRollRad = -steerInput * Math.min(0.065, this.lateralG * 0.028);

    if (steerInput !== 0 && this.hasSpaceXPackage) {
      visuals.rollDir = steerInput; // Independent Left/Right Yaw CGT fires to stabilize cornering!
    }

    this.position.z += this.velocity.z * dt;
    this.position.y = 0.35;
    // Subtle yaw slip angle when carving left/right at high G!
    const yawAngle = -this.lateralVelocityX * 0.0085;
    this.rotation.set(0, yawAngle, 0, 'YXZ');

    this.speedMph = nextSpeedMph;
    this.gForce = accelRate / 9.81;
    this.suspensionCompression = Math.min(1, this.gForce * 0.18 + this.lateralG * 0.12);

    if (this.position.z >= this.track.rampSpecs.startZ) {
      this.phase = 'RAMP_CLIMB';
      this.velocity.z = Math.max(this.velocity.z, 92);
      soundEngine.playLaunchRampWhoosh();
    }
  }

  private updateRampClimb(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.skirtMode = 'SEALED_2G';
    visuals.suctionFanActive = true;
    visuals.highFlowSkirtMode = false;
    this.suctionG = 2.3;

    let accelRate = 24.0;
    if (this.hasSpaceXPackage && this.boostFuel > 0) {
      accelRate += 34.0;
      this.boostFuel = Math.max(0, this.boostFuel - 13 * dt);
      visuals.rearBoost = true;
      this.thrusterBurstIntensity = Math.max(this.thrusterBurstIntensity, 0.75);
    }

    this.velocity.z = Math.min(152, Math.max(92, this.velocity.z + accelRate * dt));
    this.motorPowerKw = 1050;
    const nextZ = this.position.z + this.velocity.z * dt;

    const surf = this.track.getRampSurfaceAt(nextZ);
    this.currentSurfaceNormal.copy(surf.normal);

    if (surf.isPastLip) {
      this.phase = 'AIRBORNE';
      this.skirtMode = 'FLIGHT';
      this.jumpStartDistance = this.track.rampSpecs.endZ;
      this.thrusterBurstIntensity = 1.0;

      const launchSpeed = Math.max(this.velocity.z, 102);
      const launchAngle = Math.max(surf.pitchRad, 0.36);
      this.velocity.set(
        0,
        Math.sin(launchAngle) * launchSpeed + (input.boost && this.hasSpaceXPackage ? 11 : 5),
        Math.cos(launchAngle) * launchSpeed + (input.boost && this.hasSpaceXPackage ? 20 : 8)
      );

      this.cumulativeRollRad = Math.PI;
      this.targetAutoRollRad = Math.PI * 2;
      this.barrelRollsCount = 1;

      soundEngine.playLaunchRampWhoosh();
      return;
    }

    const offsetFromSurface = surf.normal.clone().multiplyScalar(0.35);
    this.position.copy(surf.position).add(offsetFromSurface);
    this.rotation.set(-surf.pitchRad, 0, surf.rollRad, 'YXZ');

    this.speedMph = (this.velocity.z / Math.cos(surf.pitchRad)) * 2.23694;
    this.gForce = 2.3 + (this.velocity.z * this.velocity.z) / (115 * 9.81);
    // High lateral & centripetal G on the curved wall climb triggers tire friction smoke!
    this.lateralG = 1.45;
    this.suspensionCompression = 0.78;
    this.steerAngleRad = 0.08;
    this.chassisRollRad = 0;
    this.chassisPitchSquatRad = -0.025;
  }

  private updateAirborne(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.suctionG = 0.0;
    this.lateralG = 0.0;
    this.skirtMode = 'FLIGHT';
    this.suspensionCompression = 0.0;
    this.steerAngleRad = 0;
    this.chassisRollRad = 0;
    this.chassisPitchSquatRad = 0;
    this.motorPowerKw = 180;
    this.currentSurfaceNormal.set(0, 1, 0);

    const baseGravity = -9.81;
    const forwardSpeed = this.velocity.z;
    const aeroLift = Math.min(3.9, forwardSpeed * 0.029);

    let thrustZ = 0;
    let thrustY = 0;

    if (this.hasSpaceXPackage && input.boost && this.boostFuel > 0) {
      thrustZ = 36.0;
      thrustY = 8.0;
      this.boostFuel = Math.max(0, this.boostFuel - 15 * dt);
      visuals.rearBoost = true;
      visuals.hoverThrust = true;
    } else if (this.hasSpaceXPackage && input.accelerate && this.boostFuel > 0) {
      thrustZ = 15.0;
      thrustY = 4.4;
      this.boostFuel = Math.max(0, this.boostFuel - 7 * dt);
      visuals.hoverThrust = true;
      visuals.rearBoost = true;
    }

    if (this.hasSpaceXPackage && this.position.y < 13.0 && this.velocity.y < -5.5) {
      thrustY += 6.8;
      visuals.hoverThrust = true;
      this.thrusterBurstIntensity = Math.max(this.thrusterBurstIntensity, 0.55);
    }

    const accelY = baseGravity + aeroLift + thrustY;
    const dragZ = -0.00042 * forwardSpeed * forwardSpeed;
    const accelZ = thrustZ + dragZ;

    this.velocity.y += accelY * dt;
    this.velocity.z = Math.max(48, this.velocity.z + accelZ * dt);

    this.position.x = THREE.MathUtils.damp(this.position.x, 0, 2.2, dt);
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    if (input.rollLeft) {
      this.targetAutoRollRad -= 5.2 * dt;
      visuals.rollDir = -1;
    } else if (input.rollRight) {
      this.targetAutoRollRad += 5.2 * dt;
      visuals.rollDir = 1;
    } else {
      const nearestUpright = Math.round(this.targetAutoRollRad / (Math.PI * 2)) * (Math.PI * 2);
      this.targetAutoRollRad = THREE.MathUtils.damp(this.targetAutoRollRad, nearestUpright, 3.6, dt);
    }

    const rollDiff = this.targetAutoRollRad - this.cumulativeRollRad;
    if (Math.abs(rollDiff) > 0.08) {
      visuals.rollDir = rollDiff > 0 ? 1 : -1;
    }
    this.cumulativeRollRad = THREE.MathUtils.damp(this.cumulativeRollRad, this.targetAutoRollRad, 4.4, dt);

    const totalRolls = Math.max(1, Math.floor((Math.abs(this.cumulativeRollRad - Math.PI) + 0.4) / Math.PI));
    if (totalRolls > this.barrelRollsCount) {
      this.barrelRollsCount = totalRolls;
    }

    const flightPathPitch = Math.atan2(this.velocity.y, this.velocity.z) * 0.45;
    let targetPitch = -flightPathPitch;

    if (input.pitchUp) {
      targetPitch -= 0.30;
      visuals.pitchDir = 1;
    } else if (input.pitchDown) {
      targetPitch += 0.28;
      visuals.pitchDir = -1;
    }

    if (this.position.y < 18 && this.velocity.y < 0 && !input.pitchDown) {
      targetPitch = THREE.MathUtils.lerp(targetPitch, -0.06, 0.68);
      visuals.pitchDir = 1;
    }

    const dampedPitch = THREE.MathUtils.damp(this.rotation.x, targetPitch, 5.2, dt);
    this.rotation.set(dampedPitch, 0, this.cumulativeRollRad, 'YXZ');

    this.speedMph = this.velocity.length() * 2.23694;
    this.gForce = Math.max(0.5, (accelY + 9.81) / 9.81);

    this.track.distanceGates.forEach((gate) => {
      if (!gate.passed && this.position.z >= gate.zPos) {
        gate.passed = true;
        soundEngine.playRecordCheer();
      }
    });

    if (this.position.y <= 0.35 && this.position.z > this.track.rampSpecs.endZ + 20) {
      this.handleTouchdown();
    }
  }

  private handleTouchdown() {
    this.position.y = 0.35;
    this.phase = 'ROLLOUT';
    this.suspensionCompression = 1.0;
    this.touchdownSmokeBurst = 1.0; // Massive tire bark & smoke cloud on runway touchdown!
    this.currentSurfaceNormal.set(0, 1, 0);

    const pitchDeg = Math.abs((this.rotation.x * 180) / Math.PI);
    const rawRollDeg = ((this.rotation.z * 180) / Math.PI) % 360;
    const normRollDeg = Math.abs(
      rawRollDeg > 180 ? rawRollDeg - 360 : rawRollDeg < -180 ? rawRollDeg + 360 : rawRollDeg
    );

    let multiplier = 1.0;
    if (pitchDeg < 16 && normRollDeg < 22) {
      this.landingGrade = 'smooth';
      multiplier = 1.30;
      soundEngine.playTouchdown('smooth');
    } else if (pitchDeg < 28 && normRollDeg < 45) {
      this.landingGrade = 'solid';
      multiplier = 1.12;
      soundEngine.playTouchdown('smooth');
    } else if (pitchDeg < 45 && normRollDeg < 75) {
      this.landingGrade = 'rough';
      multiplier = 0.9;
      soundEngine.playTouchdown('rough');
    } else {
      this.landingGrade = 'crash';
      multiplier = 0.65;
      soundEngine.playTouchdown('crash');
    }

    const airDist = Math.max(0, this.position.z - this.jumpStartDistance);
    this.rolloutBonus = airDist * (multiplier - 1.0) + this.barrelRollsCount * 45;

    this.velocity.y = 0;
    this.velocity.x = 0;
    this.velocity.z = Math.max(25, this.velocity.z * multiplier * 0.85);

    this.rotation.set(0, 0, 0, 'YXZ');
  }

  private updateRollout(dt: number, input: PlayerInput, visuals: ThrusterVisualState) {
    this.suspensionCompression = THREE.MathUtils.damp(this.suspensionCompression, 0.15, 5, dt);
    this.skirtMode = this.speedMph >= 200 ? 'HIGH_FLOW_200MPH' : 'SEALED_2G';
    this.currentSurfaceNormal.set(0, 1, 0);

    // Steering & High-G Drift Smoke during high-speed rollout!
    let steerInput = 0;
    if (input.steerLeft) steerInput = -1;
    if (input.steerRight) steerInput = 1;
    this.steerAngleRad = -steerInput * 0.38;
    const targetLat = steerInput * Math.min(14, this.velocity.z * 0.18);
    this.lateralVelocityX = THREE.MathUtils.damp(this.lateralVelocityX, targetLat, 8, dt);
    this.position.x = THREE.MathUtils.clamp(this.position.x + this.lateralVelocityX * dt, -14, 14);
    this.lateralG = Math.abs(this.lateralVelocityX) * 0.18 + (input.brake && this.speedMph > 40 ? 1.1 : 0);
    this.chassisRollRad = -steerInput * Math.min(0.06, this.lateralG * 0.025);

    const decel = input.brake ? 48.0 : 22.0;
    if (this.hasSpaceXPackage && input.boost && this.boostFuel > 0) {
      this.velocity.z += 22 * dt;
      this.boostFuel = Math.max(0, this.boostFuel - 15 * dt);
      visuals.rearBoost = true;
    } else {
      this.velocity.z = Math.max(0, this.velocity.z - decel * dt);
    }

    this.position.z += this.velocity.z * dt;
    this.position.y = 0.35;
    this.rotation.set(0, -this.lateralVelocityX * 0.01, 0, 'YXZ');

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
      this.finalDistance = Math.max(0, this.position.z - this.jumpStartDistance);

      if (this.onScoreCallback && this.landingGrade) {
        this.onScoreCallback(this.finalDistance, this.landingGrade, this.speedMph);
      }
    }
  }

  private syncCarTransform() {
    this.carModel.group.position.copy(this.position);
    this.carModel.group.rotation.copy(this.rotation);
  }

  public getTelemetry(): Telemetry {
    const flightDist =
      this.phase === 'AIRBORNE' || this.phase === 'ROLLOUT' || this.phase === 'COMPLETED'
        ? Math.max(0, this.position.z - this.jumpStartDistance)
        : 0;

    const rawRoll = Math.round(((this.rotation.z * 180) / Math.PI) % 360);
    const isOnSurface =
      this.phase === 'ACCELERATION' || this.phase === 'RAMP_CLIMB' || this.phase === 'ROLLOUT';
    const isTireSmoking =
      (isOnSurface && (this.lateralG > 0.65 || this.gForce > 1.85 || this.touchdownSmokeBurst > 0.1)) ||
      this.thrusterBurstIntensity > 0.25;

    return {
      phase: this.phase,
      speedMph: Math.round(this.speedMph),
      speedKmh: Math.round(this.speedMph * 1.60934),
      altitudeMeters: Math.max(0, Math.round((this.position.y - 0.35) * 10) / 10),
      distanceJumpedMeters: Math.round(flightDist * 10) / 10,
      totalDistanceMeters: Math.round(Math.max(0, this.position.z) * 10) / 10,
      boostFuelPct: Math.round(this.boostFuel),
      nitrogenPsi: Math.round(this.boostFuel * 100),
      motorPowerKw: this.motorPowerKw,
      skirtMode: this.skirtMode,
      zeroToSixtySec: this.zeroToSixtySec,
      pitchDeg: Math.round((-this.rotation.x * 180) / Math.PI),
      rollDeg: rawRoll,
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
