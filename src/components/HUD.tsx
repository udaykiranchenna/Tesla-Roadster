/**
 * Mobile-Responsive Heads-Up Telemetry & Tactile Control Deck
 * Features:
 * - Unified PointerEvent controls (multi-touch mobile + desktop mouse + keyboard visual feedback)
 * - Haptic vibration feedback on mobile touch devices
 * - High-G Cornering & Tire Smoke status indicator
 * - Compact responsive telemetry layout for mobile & desktop screens
 */
import React, { useState, useEffect } from 'react';
import {
  Gauge,
  Rocket,
  Compass,
  Trophy,
  DollarSign,
  Flame,
  RotateCw,
  Sparkles,
  Wind,
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Telemetry, PlayerInput } from '../game/physicsEngine';

interface HUDProps {
  telemetry: Telemetry;
  timeRemainingStr: string;
  onOpenPrizeModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenGuide: () => void;
  inputStateRef: React.MutableRefObject<PlayerInput>;
  onReset: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  timeRemainingStr,
  onOpenPrizeModal,
  onOpenLeaderboard,
  inputStateRef,
}) => {
  const {
    phase,
    speedMph,
    speedKmh,
    altitudeMeters,
    distanceJumpedMeters,
    boostFuelPct,
    nitrogenPsi,
    motorPowerKw,
    skirtMode,
    zeroToSixtySec,
    pitchDeg,
    rollDeg,
    barrelRollsCount,
    suctionG,
    gForce,
    lateralG,
    isTireSmoking,
    landingGrade,
    countdownTimer,
  } = telemetry;

  // Visual state for tactile button highlight (syncs with both touch/pointer & keyboard)
  const [pressedUI, setPressedUI] = useState<{
    left: boolean;
    right: boolean;
    gas: boolean;
    brake: boolean;
    boost: boolean;
  }>({
    left: false,
    right: false,
    gas: false,
    brake: false,
    boost: false,
  });

  useEffect(() => {
    const syncInterval = setInterval(() => {
      const inp = inputStateRef.current;
      setPressedUI((prev) => {
        if (
          prev.left === inp.steerLeft &&
          prev.right === inp.steerRight &&
          prev.gas === inp.accelerate &&
          prev.brake === inp.brake &&
          prev.boost === inp.boost
        ) {
          return prev;
        }
        return {
          left: inp.steerLeft,
          right: inp.steerRight,
          gas: inp.accelerate,
          brake: inp.brake,
          boost: inp.boost,
        };
      });
    }, 50);
    return () => clearInterval(syncInterval);
  }, [inputStateRef]);

  const triggerHaptic = (ms: number = 14) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore on unsupported devices
    }
  };

  const handleControlPress = (keys: (keyof PlayerInput)[], active: boolean) => {
    if (active) triggerHaptic(15);
    keys.forEach((k) => {
      inputStateRef.current[k] = active;
    });
    const inp = inputStateRef.current;
    setPressedUI({
      left: inp.steerLeft,
      right: inp.steerRight,
      gas: inp.accelerate,
      brake: inp.brake,
      boost: inp.boost,
    });
  };

  const handleBarrelRollClick = () => {
    triggerHaptic(25);
    const fn = (window as unknown as { triggerTeslaBarrelRoll?: () => void }).triggerTeslaBarrelRoll;
    if (fn) fn();
  };

  const getPhaseBadge = () => {
    switch (phase) {
      case 'STAGING':
        return (
          <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>10,000 PSI N2 READY • LAUNCH IN {countdownTimer}s</span>
          </div>
        );
      case 'ACCELERATION':
        return (
          <div className="bg-red-500/20 text-red-200 border border-red-500/40 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Zap className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>
              {zeroToSixtySec ? `0–60: ${zeroToSixtySec.toFixed(2)}s • ` : ''}
              {isTireSmoking
                ? 'HIGH-G TIRE SMOKE & CGT THRUST!'
                : skirtMode === 'HIGH_FLOW_200MPH'
                ? '200+ MPH HIGH-FLOW SKIRT MODE'
                : '4-FAN SUCKER SKIRTS SEALED (>2G)'}
            </span>
          </div>
        );
      case 'RAMP_CLIMB':
        return (
          <div className="bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Wind className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>
              2.3G SUCKER WALL CLIMB • ROLL: {Math.abs(rollDeg)}°{' '}
              {Math.abs(rollDeg) > 120 ? '(UPSIDE DOWN!)' : ''}
            </span>
          </div>
        );
      case 'AIRBORNE':
        return (
          <div className="bg-amber-500/25 text-amber-200 border border-amber-400/50 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Rocket className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>10 CGTs ACTIVE • HOLD BOOST TO HOVER • TAP ROLL</span>
          </div>
        );
      case 'ROLLOUT':
        return (
          <div className="bg-green-500/25 text-green-200 border border-green-400/50 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-green-300 shrink-0" />
            <span>TOUCHDOWN ROLLOUT: {landingGrade?.toUpperCase()}!</span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>RUN COMPLETE • {distanceJumpedMeters}m JUMP RECORDED</span>
          </div>
        );
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-5 text-white select-none touch-none">
      {/* TOP BAR (Responsive for Mobile & Desktop) */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-600 rounded-lg text-white font-black text-[10px] sm:text-xs tracking-wider shadow">
            TESLA × SPACEX
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight text-xs sm:text-sm text-white drop-shadow">
              NEW ROADSTER "ROCKET"
            </span>
            <span className="hidden sm:inline text-[10px] font-mono text-cyan-400 tracking-wider">
              1MW RWD • 8.4:1 • 4-FAN SUCKER • 10 CGTs @ 10,000 PSI
            </span>
          </div>
        </div>

        {/* Daily $10 Tournament Banner */}
        <button
          onClick={onOpenPrizeModal}
          className="pointer-events-auto group px-2.5 sm:px-4 py-1 sm:py-1.5 bg-neutral-900/90 hover:bg-neutral-800 border border-amber-500/50 hover:border-amber-400 rounded-xl shadow-lg flex items-center gap-2 sm:gap-3 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="p-1 bg-amber-500/20 text-amber-400 rounded-md">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </span>
            <div className="text-left">
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Daily $10 Longest Jump
              </div>
              <div className="text-[11px] sm:text-xs font-mono font-bold text-white">
                {timeRemainingStr} left
              </div>
            </div>
          </div>
          <span className="px-1.5 sm:px-2 py-0.5 bg-amber-500 text-neutral-950 font-black text-[9px] sm:text-[10px] rounded uppercase tracking-wider">
            Claim
          </span>
        </button>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onOpenLeaderboard}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-neutral-900/85 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-[11px] sm:text-xs font-bold text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Board</span>
          </button>
        </div>
      </div>

      {/* TOP-CENTER STATUS & ATTITUDE HUD + COMPACT TELEMETRY BAR */}
      <div className="flex flex-col items-center gap-1.5 mt-1 mb-auto pointer-events-none">
        {getPhaseBadge()}

        {/* Compact Telemetry Strip for Mobile & Desktop */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-neutral-950/88 border border-neutral-800/90 rounded-2xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-xl">
          {/* Speed */}
          <div className="flex items-baseline gap-1">
            <Gauge className="w-3.5 h-3.5 text-red-500 self-center mr-0.5" />
            <span className="text-xl sm:text-2xl font-black font-mono text-white">{speedMph}</span>
            <span className="text-[10px] font-bold text-neutral-400">MPH</span>
          </div>

          <div className="text-neutral-700">|</div>

          {/* Jump Distance */}
          <div className="flex items-baseline gap-1">
            <Rocket className="w-3.5 h-3.5 text-cyan-400 self-center mr-0.5" />
            <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
              {distanceJumpedMeters}
            </span>
            <span className="text-[10px] font-bold text-neutral-400">m</span>
          </div>

          <div className="text-neutral-700">|</div>

          {/* 10,000 PSI N2 Tank */}
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-mono text-neutral-400 leading-none">
                N2: {nitrogenPsi.toLocaleString()} PSI
              </span>
              <div className="w-16 sm:w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-75"
                  style={{ width: `${boostFuelPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* High-G / Tire Smoke Badge */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-neutral-800 text-[11px] font-mono">
            <span className={lateralG > 0.65 ? 'text-amber-400 font-bold' : 'text-neutral-400'}>
              LAT: {lateralG.toFixed(1)}G
            </span>
            <span className="text-cyan-400 font-bold">
              {suctionG > 0 ? `SUCKER: ${suctionG}G` : `${gForce}G`}
            </span>
          </div>
        </div>

        {(phase === 'AIRBORNE' || phase === 'RAMP_CLIMB') && (
          <div className="bg-neutral-950/85 border border-neutral-800 rounded-xl px-3 py-1 flex items-center gap-3 text-[11px] font-mono shadow-xl">
            <div className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-neutral-400">PITCH:</span>
              <span className={`font-bold ${pitchDeg >= -8 && pitchDeg <= 16 ? 'text-green-400' : 'text-amber-400'}`}>
                {pitchDeg > 0 ? `+${pitchDeg}°` : `${pitchDeg}°`}
              </span>
            </div>
            <div className="text-neutral-600">|</div>
            <div className="flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-neutral-400">ROLLS:</span>
              <span className="font-bold text-amber-400">{barrelRollsCount}x</span>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ERGONOMIC MULTI-TOUCH & DESKTOP TACTILE CONTROL PADS     */}
      {/* ======================================================== */}
      <div className="pointer-events-auto flex items-end justify-between w-full mb-14 sm:mb-20 gap-2">
        {/* LEFT THUMB CLUSTER: Steer Left / Right (High-G Cornering Smoke) + Air Pitch */}
        <div className="flex flex-col gap-1.5">
          {phase === 'AIRBORNE' && (
            <div className="flex gap-1.5">
              <button
                onPointerDown={() => handleControlPress(['pitchUp'], true)}
                onPointerUp={() => handleControlPress(['pitchUp'], false)}
                onPointerLeave={() => handleControlPress(['pitchUp'], false)}
                onPointerCancel={() => handleControlPress(['pitchUp'], false)}
                className="w-14 h-11 sm:w-16 sm:h-12 bg-neutral-900/90 active:bg-cyan-600 border border-neutral-700 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer touch-none"
              >
                <ChevronUp className="w-4 h-4 text-cyan-400" />
                <span>NOSE UP</span>
              </button>
              <button
                onPointerDown={() => handleControlPress(['pitchDown'], true)}
                onPointerUp={() => handleControlPress(['pitchDown'], false)}
                onPointerLeave={() => handleControlPress(['pitchDown'], false)}
                onPointerCancel={() => handleControlPress(['pitchDown'], false)}
                className="w-14 h-11 sm:w-16 sm:h-12 bg-neutral-900/90 active:bg-cyan-600 border border-neutral-700 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer touch-none"
              >
                <ChevronDown className="w-4 h-4 text-cyan-400" />
                <span>NOSE DN</span>
              </button>
            </div>
          )}

          <div className="flex gap-1.5 sm:gap-2">
            <button
              onPointerDown={() => handleControlPress(['steerLeft', 'rollLeft'], true)}
              onPointerUp={() => handleControlPress(['steerLeft', 'rollLeft'], false)}
              onPointerLeave={() => handleControlPress(['steerLeft', 'rollLeft'], false)}
              onPointerCancel={() => handleControlPress(['steerLeft', 'rollLeft'], false)}
              className={`w-15 h-14 sm:w-20 sm:h-16 rounded-2xl border font-black text-xs flex flex-col items-center justify-center transition-transform shadow-xl cursor-pointer touch-none ${
                pressedUI.left
                  ? 'bg-cyan-500 text-neutral-950 border-white scale-95 shadow-cyan-500/40'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-700'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-[10px] tracking-wider">
                {phase === 'AIRBORNE' ? 'ROLL L' : 'STEER [A]'}
              </span>
            </button>

            <button
              onPointerDown={() => handleControlPress(['steerRight', 'rollRight'], true)}
              onPointerUp={() => handleControlPress(['steerRight', 'rollRight'], false)}
              onPointerLeave={() => handleControlPress(['steerRight', 'rollRight'], false)}
              onPointerCancel={() => handleControlPress(['steerRight', 'rollRight'], false)}
              className={`w-15 h-14 sm:w-20 sm:h-16 rounded-2xl border font-black text-xs flex flex-col items-center justify-center transition-transform shadow-xl cursor-pointer touch-none ${
                pressedUI.right
                  ? 'bg-cyan-500 text-neutral-950 border-white scale-95 shadow-cyan-500/40'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-700'
              }`}
            >
              <ChevronRight className="w-6 h-6" />
              <span className="text-[10px] tracking-wider">
                {phase === 'AIRBORNE' ? 'ROLL R' : 'STEER [D]'}
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT THUMB CLUSTER: Drift/Brake, 10,000 PSI CGT Boost & Hover, and Gas Launch Pedal */}
        <div className="flex items-end gap-1.5 sm:gap-2.5">
          {/* Barrel Roll Action Button */}
          {phase === 'AIRBORNE' && (
            <button
              onPointerDown={handleBarrelRollClick}
              className="h-14 sm:h-16 px-3 sm:px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 border border-amber-300 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-xl flex flex-col items-center justify-center gap-0.5 cursor-pointer touch-none"
            >
              <RotateCw className="w-5 h-5" />
              <span>360° ROLL [E]</span>
            </button>
          )}

          {/* Drift / Brake Button (Triggers High-G Tire Smoke!) */}
          {phase !== 'AIRBORNE' && (
            <button
              onPointerDown={() => handleControlPress(['brake', 'pitchUp'], true)}
              onPointerUp={() => handleControlPress(['brake', 'pitchUp'], false)}
              onPointerLeave={() => handleControlPress(['brake', 'pitchUp'], false)}
              onPointerCancel={() => handleControlPress(['brake', 'pitchUp'], false)}
              className={`w-14 h-14 sm:w-18 sm:h-16 rounded-2xl border font-black text-[10px] sm:text-xs uppercase flex flex-col items-center justify-center transition-transform shadow-xl cursor-pointer touch-none ${
                pressedUI.brake
                  ? 'bg-amber-500 text-neutral-950 border-white scale-95'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
            >
              <Wind className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span>DRIFT [S]</span>
            </button>
          )}

          {/* 10,000 PSI Cold-Gas Thruster Boost & Hover Button */}
          <button
            onPointerDown={() => handleControlPress(['boost'], true)}
            onPointerUp={() => handleControlPress(['boost'], false)}
            onPointerLeave={() => handleControlPress(['boost'], false)}
            onPointerCancel={() => handleControlPress(['boost'], false)}
            className={`h-15 sm:h-18 px-3.5 sm:px-5 rounded-2xl border font-black text-[11px] sm:text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition-transform shadow-xl cursor-pointer touch-none ${
              pressedUI.boost
                ? 'bg-cyan-300 text-neutral-950 border-white scale-95 shadow-cyan-400/50'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-cyan-300/70 shadow-cyan-500/25'
            }`}
          >
            <Rocket className="w-5 h-5" />
            <span>10-CGT BOOST</span>
            <span className="text-[9px] font-mono opacity-85">[SPACE]</span>
          </button>

          {/* Gas / 0.55s Launch Pedal */}
          <button
            onPointerDown={() => handleControlPress(['accelerate', 'pitchDown'], true)}
            onPointerUp={() => handleControlPress(['accelerate', 'pitchDown'], false)}
            onPointerLeave={() => handleControlPress(['accelerate', 'pitchDown'], false)}
            onPointerCancel={() => handleControlPress(['accelerate', 'pitchDown'], false)}
            className={`w-17 h-17 sm:w-22 sm:h-20 rounded-2xl border font-black text-xs sm:text-sm uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition-transform shadow-2xl cursor-pointer touch-none ${
              pressedUI.gas
                ? 'bg-red-500 text-white border-white scale-95 shadow-red-500/60'
                : 'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border-red-400/70 shadow-red-600/30'
            }`}
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>GAS [W]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
