/**
 * Three.js 3D WebGL Canvas Component
 * Features:
 * - Logarithmic depth buffer & tight frustum (0.6m..3500m) for zero Z-fighting on mobile & desktop GPUs
 * - Relative camera offset damping (locks onto the Roadster with zero frame-time jitter or flickering)
 * - Throttled HUD React state synchronization for rock-solid 60fps mobile performance
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import confetti from 'canvas-confetti';
import { TeslaRoadsterModel } from './roadsterModel';
import { TrackBuilder } from './trackBuilder';
import { PhysicsEngine, PlayerInput, Telemetry, LandingGrade } from './physicsEngine';
import { TireSmokeParticleSystem } from './particleSystem';

export type CameraMode = 'CHASE' | 'SHOWROOM' | 'COCKPIT' | 'CINEMATIC' | 'DRONE';

interface GameCanvasProps {
  onTelemetryUpdate: (telemetry: Telemetry) => void;
  onJumpCompleted: (result: {
    distance: number;
    grade: LandingGrade;
    speed: number;
  }) => void;
  activeColor: string;
  hasSpaceXPackage: boolean;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  inputStateRef: React.MutableRefObject<PlayerInput>;
}

// Pre-allocated vectors for 60fps zero-GC relative camera tracking
const _targetCamOffset = new THREE.Vector3(0, 2.05, 6.8);
const _smoothedCamOffset = new THREE.Vector3(0, 2.05, 6.8);
const _targetLookOffset = new THREE.Vector3(0, 0.9, -7.0);
const _smoothedLookOffset = new THREE.Vector3(0, 0.9, -7.0);
const _lookTarget = new THREE.Vector3();
const _carForward = new THREE.Vector3();
const _carUp = new THREE.Vector3();

export const GameCanvas: React.FC<GameCanvasProps> = ({
  onTelemetryUpdate,
  onJumpCompleted,
  activeColor,
  hasSpaceXPackage,
  cameraMode,
  inputStateRef,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const carModelRef = useRef<TeslaRoadsterModel | null>(null);
  const trackRef = useRef<TrackBuilder | null>(null);

  useEffect(() => {
    if (carModelRef.current) {
      carModelRef.current.setPaintColor(activeColor);
    }
  }, [activeColor]);

  useEffect(() => {
    if (carModelRef.current) {
      carModelRef.current.setSpaceXPackageActive(hasSpaceXPackage);
    }
    if (physicsRef.current) {
      physicsRef.current.setSpaceXPackage(hasSpaceXPackage);
    }
  }, [hasSpaceXPackage]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer (Tight near/far + logarithmicDepthBuffer prevents all mobile Z-fighting!)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a12);
    scene.fog = new THREE.FogExp2(0x070a12, 0.00048);

    const camera = new THREE.PerspectiveCamera(
      62,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.6,
      3500
    );
    camera.position.set(0, 2.2, 129);
    camera.lookAt(0, 1.2, 100);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
      logarithmicDepthBuffer: !isHeadless,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Studio Environment Reflection via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Studio Lighting Rig
    const ambientLight = new THREE.HemisphereLight(0x88b4dc, 0x181c26, 0.85);
    scene.add(ambientLight);

    const sunKeyLight = new THREE.DirectionalLight(0xfff6eb, 2.0);
    sunKeyLight.position.set(45, 110, 60);
    sunKeyLight.castShadow = !isHeadless;
    sunKeyLight.shadow.mapSize.width = 1024;
    sunKeyLight.shadow.mapSize.height = 1024;
    sunKeyLight.shadow.camera.near = 15;
    sunKeyLight.shadow.camera.far = 350;
    const shadowD = 55;
    sunKeyLight.shadow.camera.left = -shadowD;
    sunKeyLight.shadow.camera.right = shadowD;
    sunKeyLight.shadow.camera.top = shadowD;
    sunKeyLight.shadow.camera.bottom = -shadowD;
    sunKeyLight.shadow.bias = -0.0005;
    scene.add(sunKeyLight);

    const followLight = new THREE.PointLight(0x88e5ff, 1.4, 65);
    scene.add(followLight);

    // 4. Build SpaceX Inverted C-Ramp & Landing Runway
    const track = new TrackBuilder();
    scene.add(track.group);
    trackRef.current = track;

    // 5. Build New Tesla Roadster Model
    const carModel = new TeslaRoadsterModel({
      bodyColor: activeColor,
      hasSpaceXPackage: hasSpaceXPackage,
      wheelStyle: 'turbine',
      windowTint: 0.9,
    });
    scene.add(carModel.group);
    carModelRef.current = carModel;

    // 6. Build 3D Tire Smoke & Sudden Thruster Cloud Particle System
    const smokeSystem = new TireSmokeParticleSystem();
    scene.add(smokeSystem.mesh);

    // 7. Physics & Flight Engine
    const physics = new PhysicsEngine(track, carModel, smokeSystem);
    physics.setSpaceXPackage(hasSpaceXPackage);
    physicsRef.current = physics;

    _smoothedCamOffset.set(0, 2.05, 6.8);
    _smoothedLookOffset.set(0, 0.9, -7.0);

    physics.setOnScore((distance, grade, speed) => {
      if (grade === 'smooth' || grade === 'solid') {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      onJumpCompleted({
        distance,
        grade,
        speed,
      });
    });

    // 8. Jitter-Free Relative Camera Tracking Loop
    let lastTime = performance.now();
    let lastHudSyncTime = 0;
    let animId: number;

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.04);
      lastTime = currentTime;

      physics.update(dt, inputStateRef.current);

      // Snap directional shadow light in coarse steps so shadow texels never swim or flicker
      const snapZ = Math.round(physics.position.z / 10) * 10;
      sunKeyLight.position.set(35, 95, snapZ + 45);
      followLight.position.set(physics.position.x, physics.position.y + 4.2, physics.position.z);

      // Smooth FOV warp based on speed
      const speedNorm = Math.min(physics.speedMph / 260, 1.2);
      const targetFov = cameraMode === 'SHOWROOM' ? 50 : 60 + speedNorm * 9;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6, dt);
        camera.updateProjectionMatrix();
      }

      if (cameraMode === 'CHASE') {
        const distBehind = 6.4 + speedNorm * 1.6;

        if (physics.phase === 'STAGING' || physics.phase === 'ACCELERATION') {
          // Approach Run: Car heads in -Z toward the C-Ramp. Offset is +Z behind the car.
          _targetCamOffset.set(-physics.position.x * 0.2, 2.05 + speedNorm * 0.3, distBehind);
          _targetLookOffset.set(0, 0.95, -8.0);
        } else if (physics.phase === 'RAMP_CLIMB') {
          // C-Ramp Climb & 170° Upside-Down Overhang Glide: Smoothly swing around the -X side of the C-Ramp
          const p = physics.rampProgress;
          const sideSwingX = -Math.sin(p * Math.PI * 0.86) * 14.5 - 2.2;
          const backSwingZ = Math.cos(p * Math.PI) * 6.8;
          const relY = Math.max(2.0 - physics.position.y, -1.1 + Math.cos(p * Math.PI) * 0.9);

          _targetCamOffset.set(sideSwingX, relY, backSwingZ);
          _targetLookOffset.set(
            0,
            physics.isUpsideDown ? -0.35 : 0.6,
            p > 0.55 ? 3.5 : -2.0
          );
        } else {
          // AIRBORNE, ROLLOUT & COMPLETED: Car flies/rolls in +Z down the landing runway. Offset is -Z behind the car.
          const relMinY = Math.max(1.85 - physics.position.y, 1.85 + speedNorm * 0.4);
          _targetCamOffset.set(-physics.position.x * 0.18, relMinY, -distBehind);
          _targetLookOffset.set(0, 0.55, 6.5);
        }

        // Damp only the relative offset vector, then add directly to physics.position for ZERO car jitter!
        const dampRate = physics.phase === 'RAMP_CLIMB' ? 7.5 : 9.0;
        _smoothedCamOffset.x = THREE.MathUtils.damp(_smoothedCamOffset.x, _targetCamOffset.x, dampRate, dt);
        _smoothedCamOffset.y = THREE.MathUtils.damp(_smoothedCamOffset.y, _targetCamOffset.y, dampRate, dt);
        _smoothedCamOffset.z = THREE.MathUtils.damp(_smoothedCamOffset.z, _targetCamOffset.z, dampRate, dt);

        _smoothedLookOffset.x = THREE.MathUtils.damp(_smoothedLookOffset.x, _targetLookOffset.x, dampRate, dt);
        _smoothedLookOffset.y = THREE.MathUtils.damp(_smoothedLookOffset.y, _targetLookOffset.y, dampRate, dt);
        _smoothedLookOffset.z = THREE.MathUtils.damp(_smoothedLookOffset.z, _targetLookOffset.z, dampRate, dt);

        camera.position.copy(physics.position).add(_smoothedCamOffset);
        _lookTarget.copy(physics.position).add(_smoothedLookOffset);
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'SHOWROOM') {
        const orbitAngle = currentTime * 0.00065;
        const radius = 4.6;
        camera.position.set(
          physics.position.x + Math.sin(orbitAngle) * radius,
          physics.position.y + 1.35,
          physics.position.z + Math.cos(orbitAngle) * radius
        );
        _lookTarget.copy(physics.position).add(new THREE.Vector3(0, 0.55, 0));
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'COCKPIT') {
        _carForward.set(0, 0, 1).applyQuaternion(physics.quaternion);
        _carUp.set(0, 1, 0).applyQuaternion(physics.quaternion);
        camera.position
          .copy(physics.position)
          .addScaledVector(_carUp, 0.88)
          .addScaledVector(_carForward, 0.22);
        _lookTarget.copy(camera.position).addScaledVector(_carForward, 25);
        camera.up.copy(_carUp);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'CINEMATIC') {
        _targetCamOffset.set(
          -18,
          Math.max(3.0 - physics.position.y, 2.2),
          physics.phase === 'ACCELERATION' || physics.phase === 'STAGING' ? -6 : 4
        );
        _smoothedCamOffset.lerp(_targetCamOffset, Math.min(1, 7 * dt));
        camera.position.copy(physics.position).add(_smoothedCamOffset);
        _lookTarget.copy(physics.position).add(new THREE.Vector3(0, 0.6, 0));
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'DRONE') {
        const isHeadingNegZ = physics.phase === 'STAGING' || physics.phase === 'ACCELERATION';
        _targetCamOffset.set(-10, 36, isHeadingNegZ ? 22 : -22);
        _smoothedCamOffset.lerp(_targetCamOffset, Math.min(1, 6 * dt));
        camera.position.copy(physics.position).add(_smoothedCamOffset);
        _lookTarget.copy(physics.position);
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      }

      // Sync React HUD telemetry at ~25Hz (every 40ms) to keep mobile WebGL frame pacing 100% smooth
      if (currentTime - lastHudSyncTime >= 40 || physics.phase === 'COMPLETED') {
        lastHudSyncTime = currentTime;
        onTelemetryUpdate(physics.getTelemetry());
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyQ'].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputStateRef.current.accelerate = true;
        inputStateRef.current.pitchDown = true;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputStateRef.current.brake = true;
        inputStateRef.current.pitchUp = true;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputStateRef.current.steerLeft = true;
        inputStateRef.current.rollLeft = true;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputStateRef.current.steerRight = true;
        inputStateRef.current.rollRight = true;
      }
      if (e.code === 'Space') {
        inputStateRef.current.boost = true;
      }
      if (e.code === 'KeyE' || e.code === 'KeyQ') {
        physics.triggerBarrelRoll();
      }
      if (e.code === 'KeyR') {
        physics.reset();
        _smoothedCamOffset.set(0, 2.05, 6.8);
        _smoothedLookOffset.set(0, 0.9, -7.0);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputStateRef.current.accelerate = false;
        inputStateRef.current.pitchDown = false;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputStateRef.current.brake = false;
        inputStateRef.current.pitchUp = false;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputStateRef.current.steerLeft = false;
        inputStateRef.current.rollLeft = false;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputStateRef.current.steerRight = false;
        inputStateRef.current.rollRight = false;
      }
      if (e.code === 'Space') {
        inputStateRef.current.boost = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const win = window as unknown as {
      resetTeslaGame?: () => void;
      triggerTeslaBarrelRoll?: () => void;
    };
    win.resetTeslaGame = () => {
      physics.reset();
      _smoothedCamOffset.set(0, 2.05, 6.8);
      _smoothedLookOffset.set(0, 0.9, -7.0);
    };
    win.triggerTeslaBarrelRoll = () => physics.triggerBarrelRoll();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      smokeSystem.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [cameraMode]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none outline-none"
      tabIndex={0}
    />
  );
};
