/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas, CameraMode } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { BottomControlDock } from './components/BottomControlDock';
import { HowToPlayModal } from './components/HowToPlayModal';
import { JumpResultModal } from './components/JumpResultModal';
import { Telemetry, LandingGrade, PlayerInput } from './game/physicsEngine';
import { soundEngine } from './game/soundEngine';

const BEST_JUMP_STORAGE_KEY = 'tesla_roadster_best_jump_m';

export default function App() {
  // Telemetry state
  const [telemetry, setTelemetry] = useState<Telemetry>({
    phase: 'STAGING',
    speedMph: 0,
    speedKmh: 0,
    altitudeMeters: 0,
    distanceJumpedMeters: 0,
    totalDistanceMeters: 0,
    boostFuelPct: 100,
    nitrogenPsi: 10000,
    motorPowerKw: 0,
    skirtMode: 'SEALED_2G',
    zeroToSixtySec: null,
    pitchDeg: 0,
    rollDeg: 0,
    isUpsideDown: false,
    isUprightReady: true,
    lateralOffsetMeters: 0,
    isOnRunwayCorridor: true,
    landedOffRoad: false,
    barrelRollsCount: 0,
    suctionG: 0,
    gForce: 1.0,
    lateralG: 0,
    isTireSmoking: false,
    landingGrade: null,
    countdownTimer: 3,
    rolloutBonusMeters: 0,
  });

  // Car Customization (Defaults to Ano White from the Official Reveal)
  const [activeColor, setActiveColor] = useState<string>('#f2f4f7');
  const [hasSpaceXPackage, setHasSpaceXPackage] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('CHASE');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Personal Best Distance
  const [bestDistance, setBestDistance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BEST_JUMP_STORAGE_KEY);
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Top-Bar Zen View / Studio Drawer State
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    distance: number;
    grade: LandingGrade | null;
    speed: number;
    isNewBest: boolean;
  }>({
    distance: 0,
    grade: null,
    speed: 0,
    isNewBest: false,
  });

  // Input State Ref for 60fps responsiveness without React re-renders
  const inputStateRef = useRef<PlayerInput>({
    accelerate: false,
    brake: false,
    boost: false,
    steerLeft: false,
    steerRight: false,
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    analogX: 0,
    analogY: 0,
  });

  // Initialize audio on first user touch/click
  useEffect(() => {
    const initAudio = () => {
      soundEngine.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  }, [isMuted]);

  const handleResetRun = useCallback(() => {
    const resetFn = (window as unknown as { resetTeslaGame?: () => void }).resetTeslaGame;
    if (resetFn) resetFn();
    setIsResultModalOpen(false);
  }, []);

  const handleJumpCompleted = useCallback(
    (result: { distance: number; grade: LandingGrade; speed: number }) => {
      setBestDistance((prevBest) => {
        const isNewBest = result.distance > prevBest;
        const nextBest = isNewBest ? result.distance : prevBest;
        if (isNewBest) {
          try {
            localStorage.setItem(BEST_JUMP_STORAGE_KEY, nextBest.toFixed(1));
          } catch {
            // Ignore storage errors
          }
        }
        setLastResult({
          distance: result.distance,
          grade: result.grade,
          speed: result.speed,
          isNewBest,
        });
        return nextBest;
      });

      setTimeout(() => {
        setIsResultModalOpen(true);
      }, 1000);
    },
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans antialiased select-none">
      {/* 3D WebGL Canvas */}
      <GameCanvas
        onTelemetryUpdate={setTelemetry}
        onJumpCompleted={handleJumpCompleted}
        activeColor={activeColor}
        hasSpaceXPackage={hasSpaceXPackage}
        cameraMode={cameraMode}
        onCameraModeChange={setCameraMode}
        inputStateRef={inputStateRef}
      />

      {/* Mobile-First 2-Hands Hardware Controller Deck & Telemetry HUD */}
      <HUD
        telemetry={telemetry}
        bestDistance={bestDistance}
        isStudioOpen={isStudioOpen}
        onToggleStudio={() => setIsStudioOpen((prev) => !prev)}
        inputStateRef={inputStateRef}
        onReset={handleResetRun}
      />

      {/* Top-Bar Toggled Roadster Studio & Camera Drawer */}
      <BottomControlDock
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        activeColor={activeColor}
        onColorChange={setActiveColor}
        hasSpaceXPackage={hasSpaceXPackage}
        onToggleSpaceX={() => setHasSpaceXPackage(!hasSpaceXPackage)}
        cameraMode={cameraMode}
        onCameraChange={setCameraMode}
        onReset={handleResetRun}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Modals */}
      <HowToPlayModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <JumpResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        distance={lastResult.distance}
        bestDistance={bestDistance}
        isNewBest={lastResult.isNewBest}
        grade={lastResult.grade}
        landedOffRoad={telemetry.landedOffRoad}
        speed={lastResult.speed}
        onJumpAgain={handleResetRun}
        onOpenStudio={() => {
          setIsResultModalOpen(false);
          setIsStudioOpen(true);
        }}
      />
    </div>
  );
}
