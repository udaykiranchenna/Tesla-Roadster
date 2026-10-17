/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas, CameraMode } from './game/GameCanvas';
import { HUD } from './components/HUD';
import { BottomControlDock } from './components/BottomControlDock';
import { DailyPrizeModal } from './components/DailyPrizeModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { JumpResultModal } from './components/JumpResultModal';
import { Telemetry, LandingGrade, PlayerInput } from './game/physicsEngine';
import { soundEngine } from './game/soundEngine';
import { dailyChallengeManager } from './game/dailyChallenge';

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
  const [playerTag, setPlayerTag] = useState<string>(dailyChallengeManager.getPlayerTag());

  // Top-Bar Zen View / Studio Drawer State (defaults to false = unobstructed Zen View for mobile thumb controls!)
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);

  // Modals
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    distance: number;
    grade: LandingGrade | null;
    speed: number;
    rank: number;
    isDailyWinner: boolean;
  }>({
    distance: 0,
    grade: null,
    speed: 0,
    rank: 1,
    isDailyWinner: false,
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

  // Tournament Reset Countdown (updates every second)
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('00:00:00');

  useEffect(() => {
    const updateCountdown = () => {
      const info = dailyChallengeManager.getTournamentInfo();
      const totalSec = info.timeRemainingSeconds;
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      setTimeRemainingStr(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

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
    (result: {
      distance: number;
      grade: LandingGrade;
      speed: number;
      rank: number;
      isDailyWinner: boolean;
    }) => {
      setLastResult(result);
      setTimeout(() => {
        setIsResultModalOpen(true);
      }, 1200);
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

      {/* Mobile-First Heads-Up Telemetry, Virtual Analog Thumbstick & Right Pedals */}
      <HUD
        telemetry={telemetry}
        timeRemainingStr={timeRemainingStr}
        isStudioOpen={isStudioOpen}
        onToggleStudio={() => setIsStudioOpen((prev) => !prev)}
        onOpenPrizeModal={() => setIsPrizeModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        inputStateRef={inputStateRef}
        onReset={handleResetRun}
      />

      {/* Top-Bar Toggled Roadster Studio & Camera Drawer (Completely unmounted in Zen View!) */}
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
        onOpenPrizeModal={() => setIsPrizeModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Modals */}
      <DailyPrizeModal
        isOpen={isPrizeModalOpen}
        onClose={() => setIsPrizeModalOpen(false)}
        playerTag={playerTag}
        onPlayerTagChange={setPlayerTag}
        timeRemainingStr={timeRemainingStr}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        timeRemainingStr={timeRemainingStr}
      />

      <HowToPlayModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <JumpResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        distance={lastResult.distance}
        grade={lastResult.grade}
        landedOffRoad={telemetry.landedOffRoad}
        speed={lastResult.speed}
        rank={lastResult.rank}
        isDailyWinner={lastResult.isDailyWinner}
        onJumpAgain={handleResetRun}
        onOpenLeaderboard={() => {
          setIsResultModalOpen(false);
          setIsLeaderboardOpen(true);
        }}
        onOpenPrizeModal={() => {
          setIsResultModalOpen(false);
          setIsPrizeModalOpen(true);
        }}
      />
    </div>
  );
}
