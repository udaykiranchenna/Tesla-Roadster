/**
 * Three.js 3D WebGL Canvas Component
 * Sets up the scene, studio environment, tire smoke particle system, physics loop,
 * tactile camera FOV warp & G-force shake, and responsive keyboard/touch input handling
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import confetti from 'canvas-confetti';
import { TeslaRoadsterModel } from './roadsterModel';
import { TrackBuilder } from './trackBuilder';
import { PhysicsEngine, PlayerInput, Telemetry, LandingGrade } from './physicsEngine';
import { TireSmokeParticleSystem } from './particleSystem';
import { dailyChallengeManager } from './dailyChallenge';

export type CameraMode = 'CHASE' | 'SHOWROOM' | 'COCKPIT' | 'CINEMATIC' | 'DRONE';

interface GameCanvasProps {
  onTelemetryUpdate: (telemetry: Telemetry) => void;
  onJumpCompleted: (result: {
    distance: number;
    grade: LandingGrade;
    speed: number;
    rank: number;
    isDailyWinner: boolean;
  }) => void;
  activeColor: string;
  hasSpaceXPackage: boolean;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  inputStateRef: React.MutableRefObject<PlayerInput>;
}

// Pre-allocated vectors for 60fps zero-GC camera interpolation
const _camPosTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _carForward = new THREE.Vector3();

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

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090c14);
    scene.fog = new THREE.FogExp2(0x090c14, 0.00055);

    const camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / container.clientHeight,
      0.1,
      9000
    );
    camera.position.set(0, 3.2, -34);

    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
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
    const ambientLight = new THREE.HemisphereLight(0x88b4dc, 0x181c26, 0.75);
    scene.add(ambientLight);

    const sunKeyLight = new THREE.DirectionalLight(0xfff6eb, 2.0);
    sunKeyLight.position.set(45, 110, 60);
    sunKeyLight.castShadow = !isHeadless;
    sunKeyLight.shadow.mapSize.width = 2048;
    sunKeyLight.shadow.mapSize.height = 2048;
    sunKeyLight.shadow.camera.near = 10;
    sunKeyLight.shadow.camera.far = 450;
    const shadowD = 65;
    sunKeyLight.shadow.camera.left = -shadowD;
    sunKeyLight.shadow.camera.right = shadowD;
    sunKeyLight.shadow.camera.top = shadowD;
    sunKeyLight.shadow.camera.bottom = -shadowD;
    sunKeyLight.shadow.bias = -0.0003;
    scene.add(sunKeyLight);

    const followLight = new THREE.PointLight(0x88e5ff, 1.5, 60);
    scene.add(followLight);

    // 4. Build SpaceX McGregor Track & Half-Circle Overhang Ramp
    const track = new TrackBuilder();
    scene.add(track.group);
    trackRef.current = track;

    // 5. Build 2026 Tesla Roadster Model
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

    physics.setOnScore((distance, grade, speed) => {
      const result = dailyChallengeManager.submitScore(distance, grade, speed);
      if (result.isDailyWinner || result.rank <= 3) {
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
        });
      }
      onJumpCompleted({
        distance,
        grade,
        speed,
        rank: result.rank,
        isDailyWinner: result.isDailyWinner,
      });
    });

    // 8. Horizon-Stabilized Tactile Camera Loop
    let lastTime = performance.now();
    let animId: number;

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      physics.update(dt, inputStateRef.current);

      sunKeyLight.position.set(physics.position.x + 35, 90, physics.position.z + 45);
      sunKeyLight.target = carModel.group;
      followLight.position.set(physics.position.x, physics.position.y + 4.5, physics.position.z);

      // Dynamic FOV Warp based on speed & sudden 10,000 PSI thruster burst!
      const speedNorm = Math.min(physics.speedMph / 260, 1.25);
      const targetFov =
        cameraMode === 'SHOWROOM'
          ? 50
          : 60 + speedNorm * 10 + physics.thrusterBurstIntensity * 7;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 8, dt);
        camera.updateProjectionMatrix();
      }

      // Subtle tactile G-force & thruster vibration shake
      const shakeMag =
        cameraMode === 'SHOWROOM'
          ? 0
          : (physics.thrusterBurstIntensity * 0.055 + Math.max(0, physics.lateralG - 0.7) * 0.03);
      const shakeX = (Math.random() - 0.5) * shakeMag;
      const shakeY = (Math.random() - 0.5) * shakeMag;

      if (cameraMode === 'CHASE') {
        const distBehind = 5.8 + speedNorm * 2.2 - physics.thrusterBurstIntensity * 0.5;

        const camX =
          physics.phase === 'RAMP_CLIMB'
            ? physics.position.x * 0.45 - 2.2
            : physics.position.x * 0.72;

        const camY =
          physics.phase === 'RAMP_CLIMB'
            ? Math.max(2.0, physics.position.y - 1.1)
            : Math.max(1.9, physics.position.y + 1.75 + speedNorm * 0.55);

        _camPosTarget.set(camX + shakeX, camY + shakeY, physics.position.z - distBehind);
        _lookTarget.set(
          physics.position.x * 0.85,
          physics.position.y + 0.52,
          physics.position.z + 5.0
        );

        camera.position.lerp(_camPosTarget, Math.min(1, 11 * dt));
        // Subtle horizon bank into high-G corners for visceral steering feel!
        const bankAngle = -physics.lateralVelocityX * 0.004;
        camera.up.set(Math.sin(bankAngle), Math.cos(bankAngle), 0).normalize();
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'SHOWROOM') {
        const orbitAngle = currentTime * 0.00065;
        const radius = 4.5;
        _camPosTarget.set(
          physics.position.x + Math.sin(orbitAngle) * radius,
          physics.position.y + 1.30,
          physics.position.z + Math.cos(orbitAngle) * radius
        );
        _lookTarget.copy(physics.position).add(new THREE.Vector3(0, 0.52, 0));

        camera.position.lerp(_camPosTarget, Math.min(1, 8 * dt));
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'COCKPIT') {
        _carForward.set(0, 0, 1).applyEuler(physics.rotation);
        _camPosTarget.copy(physics.position).add(new THREE.Vector3(shakeX * 0.4, 0.85 + shakeY * 0.4, 0.25));
        _lookTarget.copy(_camPosTarget).add(_carForward.multiplyScalar(25));

        camera.position.copy(_camPosTarget);
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'CINEMATIC') {
        _camPosTarget.set(
          physics.position.x - 14,
          Math.max(2.6, physics.position.y * 0.85 + 2.0),
          physics.position.z - 6
        );
        _lookTarget.copy(physics.position).add(new THREE.Vector3(0, 0.7, 2));

        camera.position.lerp(_camPosTarget, Math.min(1, 6 * dt));
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      } else if (cameraMode === 'DRONE') {
        _camPosTarget.set(
          physics.position.x,
          physics.position.y + 42,
          physics.position.z - 24
        );
        _lookTarget.copy(physics.position).add(new THREE.Vector3(0, 0, 10));

        camera.position.lerp(_camPosTarget, Math.min(1, 6 * dt));
        camera.up.set(0, 1, 0);
        camera.lookAt(_lookTarget);
      }

      onTelemetryUpdate(physics.getTelemetry());
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

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
    win.resetTeslaGame = () => physics.reset();
    win.triggerTeslaBarrelRoll = () => physics.triggerBarrelRoll();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
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
      className="absolute inset-0 w-full h-full overflow-hidden select-none touch-none outline-none cursor-grab active:cursor-grabbing"
      tabIndex={0}
    />
  );
};
