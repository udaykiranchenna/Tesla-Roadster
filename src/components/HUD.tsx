/**
 * Mobile-Responsive 2-Hands Controller Deck & Telemetry HUD
 * Designed specifically for ergonomic 2-Handed Mobile Play (Portrait & Landscape) + Desktop Keyboard:
 * - Default "2-HANDS SPLIT" Mode:
 *   • LEFT HAND (Left Thumb): Large [◀ STEER / ROLL LEFT] pad + [10-CGT BOOST] trigger + [DIVE] air trim
 *   • RIGHT HAND (Right Thumb): Large [STEER / ROLL RIGHT ▶] pad + [GAS / FLIP UPRIGHT] trigger + [GLIDE] air trim
 * - Optional 1-Tap "R-THUMB STEER" Mode:
 *   • LEFT HAND: [GAS] + [10-CGT BOOST] + [FLIP UPRIGHT]
 *   • RIGHT HAND: [◀ STEER LEFT] + [STEER RIGHT ▶] + [GLIDE / DIVE]
 * - Multi-touch pointer capture on every button so both thumbs operate simultaneously with zero lag
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
  RotateCcw,
  Sparkles,
  Wind,
  Zap,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Gamepad2,
} from 'lucide-react';
import { Telemetry, PlayerInput } from '../game/physicsEngine';

interface HUDProps {
  telemetry: Telemetry;
  timeRemainingStr: string;
  isStudioOpen: boolean;
  onToggleStudio: () => void;
  onOpenPrizeModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenGuide: () => void;
  inputStateRef: React.MutableRefObject<PlayerInput>;
  onReset: () => void;
}

type ControlLayoutMode = 'TWO_HAND_SPLIT' | 'RIGHT_HAND_STEER';

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  timeRemainingStr,
  isStudioOpen,
  onToggleStudio,
  onOpenPrizeModal,
  onOpenLeaderboard,
  inputStateRef,
  onReset,
}) => {
  const {
    phase,
    speedMph,
    distanceJumpedMeters,
    boostFuelPct,
    nitrogenPsi,
    skirtMode,
    zeroToSixtySec,
    pitchDeg,
    rollDeg,
    isUprightReady,
    lateralOffsetMeters,
    isOnRunwayCorridor,
    landedOffRoad,
    barrelRollsCount,
    suctionG,
    gForce,
    lateralG,
    isTireSmoking,
    landingGrade,
    countdownTimer,
  } = telemetry;

  // Defaults to True 2-Hands Symmetric Split (Left Thumb = Left + Boost, Right Thumb = Right + Gas/Flip)
  const [controlMode, setControlMode] = useState<ControlLayoutMode>('TWO_HAND_SPLIT');

  // Visual state for instant tactile highlight on touch & keyboard
  const [pressedUI, setPressedUI] = useState<{
    left: boolean;
    right: boolean;
    gas: boolean;
    brake: boolean;
    boost: boolean;
    pitchUp: boolean;
    pitchDown: boolean;
  }>({
    left: false,
    right: false,
    gas: false,
    brake: false,
    boost: false,
    pitchUp: false,
    pitchDown: false,
  });

  const triggerHaptic = (ms: number = 12) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore on unsupported devices
    }
  };

  useEffect(() => {
    const syncInterval = setInterval(() => {
      const inp = inputStateRef.current;
      setPressedUI((prev) => {
        if (
          prev.left === inp.steerLeft &&
          prev.right === inp.steerRight &&
          prev.gas === inp.accelerate &&
          prev.brake === inp.brake &&
          prev.boost === inp.boost &&
          prev.pitchUp === inp.pitchUp &&
          prev.pitchDown === inp.pitchDown
        ) {
          return prev;
        }
        return {
          left: inp.steerLeft,
          right: inp.steerRight,
          gas: inp.accelerate,
          brake: inp.brake,
          boost: inp.boost,
          pitchUp: inp.pitchUp,
          pitchDown: inp.pitchDown,
        };
      });
    }, 50);
    return () => clearInterval(syncInterval);
  }, [inputStateRef]);

  const setInputKeys = (
    keys: (keyof Omit<PlayerInput, 'analogX' | 'analogY'>)[],
    active: boolean
  ) => {
    if (active) triggerHaptic(12);
    keys.forEach((k) => {
      inputStateRef.current[k] = active;
    });
    // Keep analogX/Y in sync for smooth proportional response
    const inp = inputStateRef.current;
    inp.analogX = (inp.steerRight ? 1 : 0) - (inp.steerLeft ? 1 : 0);
    inp.analogY = (inp.pitchUp ? 1 : 0) - (inp.pitchDown ? 1 : 0);

    setPressedUI({
      left: inp.steerLeft,
      right: inp.steerRight,
      gas: inp.accelerate,
      brake: inp.brake,
      boost: inp.boost,
      pitchUp: inp.pitchUp,
      pitchDown: inp.pitchDown,
    });
  };

  const bindTouchPad = (keys: (keyof Omit<PlayerInput, 'analogX' | 'analogY'>)[]) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture unsupported
      }
      setInputKeys(keys, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setInputKeys(keys, false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setInputKeys(keys, false);
    },
  });

  const handleFlipOrBarrelRoll = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    triggerHaptic(22);
    const fn = (window as unknown as { triggerTeslaBarrelRoll?: () => void }).triggerTeslaBarrelRoll;
    if (fn) fn();
  };

  const getPhaseBanner = () => {
    switch (phase) {
      case 'STAGING':
        return (
          <div className="bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>10,000 PSI N2 READY · LAUNCH IN {countdownTimer}s</span>
          </div>
        );
      case 'ACCELERATION':
        return (
          <div className="bg-black/75 backdrop-blur-md text-red-200 border border-red-500/40 px-3 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Zap className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>
              {zeroToSixtySec ? `0–60: ${zeroToSixtySec.toFixed(2)}s · ` : ''}
              {isTireSmoking ? 'HIGH-G TIRE SMOKE & CGT THRUST' : 'STEER INTO C-RAMP'}
            </span>
          </div>
        );
      case 'RAMP_CLIMB':
        return (
          <div className="bg-black/75 backdrop-blur-md text-cyan-200 border border-cyan-400/50 px-3 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Wind className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>
              C-RAMP {suctionG}G · PITCH: {pitchDeg}°{' '}
              {pitchDeg > 95 ? '· UPSIDE-DOWN GLIDE!' : '· VERTICAL CLIMB'}
            </span>
          </div>
        );
      case 'AIRBORNE':
        return (
          <div
            className={`backdrop-blur-md px-3 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg border ${
              !isUprightReady || !isOnRunwayCorridor
                ? 'bg-amber-950/85 text-amber-200 border-amber-400/60'
                : 'bg-emerald-950/85 text-emerald-200 border-emerald-400/60'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>
              {!isUprightReady
                ? 'UPSIDE DOWN! TAP FLIP OR HOLD L/R TO RIGHT CAR'
                : !isOnRunwayCorridor
                ? `OFF-ROAD DRIFT! STEER ${lateralOffsetMeters > 0 ? 'LEFT ◀' : '▶ RIGHT'} TO ROAD`
                : 'UPRIGHT & ON ROAD · HOLD BOOST TO GLIDE'}
            </span>
          </div>
        );
      case 'ROLLOUT':
        return (
          <div
            className={`backdrop-blur-md px-3 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg border ${
              landedOffRoad || landingGrade === 'crash'
                ? 'bg-red-950/85 text-red-200 border-red-500/50'
                : 'bg-emerald-950/85 text-emerald-200 border-emerald-400/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              {landedOffRoad
                ? 'MISSED RUNWAY! OFF-ROAD PENALTY'
                : `ON-ROAD TOUCHDOWN: ${landingGrade?.toUpperCase()}`}
            </span>
          </div>
        );
      case 'COMPLETED':
        return (
          <div className="bg-black/75 backdrop-blur-md text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-[10px] sm:text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>RUN COMPLETE · {distanceJumpedMeters}m JUMP</span>
          </div>
        );
    }
  };

  const roadMarkerPct = Math.max(-48, Math.min(48, (lateralOffsetMeters / 28) * 48));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 sm:p-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] text-white select-none touch-none overflow-hidden">
      {/* ===================================================================== */}
      {/* COMPACT MOBILE-RESPONSIVE TOP BAR                                     */}
      {/* ===================================================================== */}
      <header className="flex items-center justify-between gap-1.5 sm:gap-3 w-full bg-neutral-950/80 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-lg pointer-events-auto">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-black tracking-tight text-[11px] sm:text-sm text-white whitespace-nowrap">
            ROADSTER <span className="text-red-500">SPACEX</span>
          </span>
        </div>

        {/* Zone 2: Daily $10 Challenge & Leaderboard */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenPrizeModal}
            className="px-2 sm:px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-lg sm:rounded-xl flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold text-amber-300">$10 Daily</span>
            <span className="hidden md:inline text-[11px] font-mono text-white/80 tabular-nums">
              · {timeRemainingStr}
            </span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-white/5 hover:bg-white/15 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Daily Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Board</span>
          </button>
        </div>

        {/* Zone 3: 2-Hand Mode Switcher + Reset + Zen Studio Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() =>
              setControlMode((prev) =>
                prev === 'TWO_HAND_SPLIT' ? 'RIGHT_HAND_STEER' : 'TWO_HAND_SPLIT'
              )
            }
            className="px-2 py-1 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Switch 2-Hands Control Layout"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>{controlMode === 'TWO_HAND_SPLIT' ? '2-Hands' : 'R-Steer'}</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 sm:px-2.5 sm:py-1 bg-white/10 hover:bg-white/15 rounded-lg sm:rounded-xl text-xs font-semibold text-white flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Restart Run [R]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reset</span>
          </button>

          <button
            onClick={onToggleStudio}
            className={`px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isStudioOpen
                ? 'bg-red-600 text-white border-red-400 shadow-md'
                : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border-white/20'
            }`}
            title="Toggle Roadster Studio & Camera Views"
          >
            <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400" />
            <span>{isStudioOpen ? 'Zen' : 'Studio'}</span>
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* TOP-CENTER TELEMETRY & LIVE ROAD ALIGNMENT INSTRUMENT                 */}
      {/* ===================================================================== */}
      <div className="flex flex-col items-center gap-1 mt-1 mb-auto pointer-events-none">
        {getPhaseBanner()}

        {/* Compact Speed / Distance / N2 Strip */}
        <div className="flex items-center justify-center gap-2 sm:gap-3.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl px-3 py-1 sm:px-4 sm:py-1.5 shadow-xl tabular-nums">
          <div className="flex items-baseline gap-1">
            <Gauge className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500 self-center" />
            <span className="text-base sm:text-2xl font-black font-mono text-white tabular-nums">
              {speedMph}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-neutral-400">MPH</span>
          </div>

          <span className="text-white/20">·</span>

          <div className="flex items-baseline gap-1">
            <Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 self-center" />
            <span className="text-base sm:text-2xl font-black font-mono text-cyan-400 tabular-nums">
              {distanceJumpedMeters.toFixed(1)}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-neutral-400">m</span>
          </div>

          <span className="text-white/20">·</span>

          <div className="flex flex-col text-left">
            <span className="text-[8px] sm:text-[9px] font-mono text-neutral-300 leading-none tabular-nums">
              N2 {nitrogenPsi.toLocaleString()} PSI
            </span>
            <div className="w-12 sm:w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-75"
                style={{ width: `${boostFuelPct}%` }}
              />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10 text-[11px] font-mono tabular-nums">
            <span className="text-cyan-400 font-bold">
              {suctionG > 0 ? `SUCKER ${suctionG}G` : `${gForce}G`}
            </span>
          </div>
        </div>

        {/* Live Road Alignment & Roll Flip Bar during C-Ramp Climb / Flight / Rollout */}
        {(phase === 'AIRBORNE' || phase === 'RAMP_CLIMB' || phase === 'ROLLOUT') && (
          <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1.5 flex flex-col gap-1 w-[min(330px,88vw)] shadow-xl">
            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
              <div className="flex items-center gap-1">
                {isUprightReady ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                )}
                <span className={isUprightReady ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                  {isUprightReady ? `UPRIGHT (${rollDeg}°)` : `ROLL: ${rollDeg}° (FLIP!)`}
                </span>
              </div>

              <div className="flex items-center gap-1 text-neutral-300">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>PITCH {pitchDeg > 0 ? `+${pitchDeg}°` : `${pitchDeg}°`}</span>
              </div>

              <div className="flex items-center gap-1 text-amber-400 font-bold">
                <RotateCw className="w-3 h-3" />
                <span>{barrelRollsCount}x</span>
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono uppercase tracking-wider">
                <span className="text-red-400">Off-Road L</span>
                <span className={isOnRunwayCorridor ? 'text-cyan-300 font-bold' : 'text-amber-300 font-bold'}>
                  {isOnRunwayCorridor
                    ? `ON ROAD (${lateralOffsetMeters > 0 ? `R +${lateralOffsetMeters}m` : lateralOffsetMeters < 0 ? `L ${lateralOffsetMeters}m` : 'CENTER'})`
                    : `STEER ${lateralOffsetMeters > 0 ? '◀ LEFT' : 'RIGHT ▶'} TO ROAD!`}
                </span>
                <span className="text-red-400">Off-Road R</span>
              </div>
              <div className="relative w-full h-2 bg-red-950/80 rounded-full overflow-hidden border border-white/10">
                <div className="absolute top-0 bottom-0 left-[20%] right-[20%] bg-neutral-700/95 border-x border-red-500/80" />
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/60" />
                <div
                  className={`absolute top-0 bottom-0 w-2.5 rounded-full -translate-x-1/2 transition-transform duration-75 ${
                    isOnRunwayCorridor ? 'bg-cyan-400' : 'bg-amber-400'
                  }`}
                  style={{ left: `${50 + roadMarkerPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* ERGONOMIC 2-HANDS MOBILE & DESKTOP CONTROLLER DECK                    */}
      {/* ===================================================================== */}
      {controlMode === 'TWO_HAND_SPLIT' ? (
        /* ------------------------------------------------------------------- */
        /* MODE 1 (DEFAULT): SYMMETRIC 2-HANDS SPLIT MODE                      */
        /* • LEFT THUMB:  [10-CGT BOOST] + [◀ STEER / ROLL LEFT]               */
        /* • RIGHT THUMB: [GAS / FLIP UPRIGHT] + [STEER / ROLL RIGHT ▶]        */
        /* Both hands share steering & actions symmetrically!                  */
        /* ------------------------------------------------------------------- */
        <div className="pointer-events-auto flex items-end justify-between w-full gap-2">
          {/* LEFT HAND CLUSTER (Left Thumb) */}
          <div className="flex flex-col gap-1.5 w-[44%] max-w-[180px]">
            {/* Mid-Air Nose Dive / Ground Drift Row */}
            {phase === 'AIRBORNE' ? (
              <button
                {...bindTouchPad(['pitchDown'])}
                className={`w-full h-11 sm:h-12 rounded-xl border font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-lg cursor-pointer touch-none transition-transform ${
                  pressedUI.pitchDown
                    ? 'bg-cyan-500 text-neutral-950 border-white scale-95'
                    : 'bg-black/65 backdrop-blur-md text-neutral-200 border-white/20'
                }`}
              >
                <ChevronDown className="w-4 h-4 text-cyan-400" />
                <span>NOSE DOWN [W]</span>
              </button>
            ) : (
              <button
                {...bindTouchPad(['brake'])}
                className={`w-full h-10 sm:h-11 rounded-xl border font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow-lg cursor-pointer touch-none transition-transform ${
                  pressedUI.brake
                    ? 'bg-amber-500 text-neutral-950 border-white scale-95'
                    : 'bg-black/65 backdrop-blur-md text-neutral-300 border-white/15'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>DRIFT / BRAKE [S]</span>
              </button>
            )}

            {/* Left Hand Upper Trigger: 10-CGT SpaceX Boost & Hover */}
            <button
              {...bindTouchPad(['boost', 'accelerate'])}
              className={`w-full h-14 sm:h-16 rounded-2xl border font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl cursor-pointer touch-none transition-transform ${
                pressedUI.boost
                  ? 'bg-cyan-300 text-neutral-950 border-white scale-95 shadow-cyan-400/50'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300/80 shadow-cyan-500/25'
              }`}
            >
              <Rocket className="w-5 h-5 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span>BOOST</span>
                <span className="text-[9px] font-mono opacity-85">10-CGT [SPC]</span>
              </div>
            </button>

            {/* Left Hand Primary Pad: STEER LEFT & ROLL LEFT */}
            <button
              {...bindTouchPad(['steerLeft', 'rollLeft'])}
              className={`w-full h-18 sm:h-22 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xl cursor-pointer touch-none transition-transform ${
                pressedUI.left
                  ? 'bg-cyan-400 text-neutral-950 border-white scale-95 shadow-cyan-400/50'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-white/25'
              }`}
            >
              <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span>{phase === 'AIRBORNE' ? 'STEER & ROLL L' : 'STEER LEFT'}</span>
                <span className="text-[9px] font-mono text-neutral-400">[A / ◀]</span>
              </div>
            </button>
          </div>

          {/* RIGHT HAND CLUSTER (Right Thumb) */}
          <div className="flex flex-col gap-1.5 w-[44%] max-w-[180px]">
            {/* Mid-Air Glide Nose Up Row */}
            {phase === 'AIRBORNE' && (
              <button
                {...bindTouchPad(['pitchUp'])}
                className={`w-full h-11 sm:h-12 rounded-xl border font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-lg cursor-pointer touch-none transition-transform ${
                  pressedUI.pitchUp
                    ? 'bg-cyan-500 text-neutral-950 border-white scale-95'
                    : 'bg-black/65 backdrop-blur-md text-neutral-200 border-white/20'
                }`}
              >
                <ChevronUp className="w-4 h-4 text-cyan-400" />
                <span>GLIDE UP [S]</span>
              </button>
            )}

            {/* Right Hand Upper Trigger:
                - On Ground/Ramp: GAS / LAUNCH [W]
                - In Mid-Air: FLIP UPRIGHT / 360° ROLL [E] */}
            {phase === 'AIRBORNE' ? (
              <button
                onPointerDown={handleFlipOrBarrelRoll}
                className={`w-full h-14 sm:h-16 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl cursor-pointer touch-none active:scale-95 transition-transform ${
                  !isUprightReady
                    ? 'bg-amber-500 text-neutral-950 border-white shadow-amber-500/40'
                    : 'bg-neutral-900/90 text-amber-300 border-amber-400/70'
                }`}
              >
                <RotateCw className="w-5 h-5 shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span>{!isUprightReady ? 'FLIP CAR' : '360° ROLL'}</span>
                  <span className="text-[9px] font-mono opacity-80">UPRIGHT [E]</span>
                </div>
              </button>
            ) : (
              <button
                {...bindTouchPad(['accelerate'])}
                className={`w-full h-14 sm:h-16 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl cursor-pointer touch-none transition-transform ${
                  pressedUI.gas
                    ? 'bg-red-500 text-white border-white scale-95 shadow-red-500/60'
                    : 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-400/80 shadow-red-600/30'
                }`}
              >
                <Flame className="w-5 h-5 shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span>GAS LAUNCH</span>
                  <span className="text-[9px] font-mono opacity-85">1MW RWD [W]</span>
                </div>
              </button>
            )}

            {/* Right Hand Primary Pad: STEER RIGHT & ROLL RIGHT */}
            <button
              {...bindTouchPad(['steerRight', 'rollRight'])}
              className={`w-full h-18 sm:h-22 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xl cursor-pointer touch-none transition-transform ${
                pressedUI.right
                  ? 'bg-cyan-400 text-neutral-950 border-white scale-95 shadow-cyan-400/50'
                  : 'bg-neutral-900/90 hover:bg-neutral-800 text-white border-white/25'
              }`}
            >
              <div className="flex flex-col items-end leading-tight">
                <span>{phase === 'AIRBORNE' ? 'STEER & ROLL R' : 'STEER RIGHT'}</span>
                <span className="text-[9px] font-mono text-neutral-400">[D / ▶]</span>
              </div>
              <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* MODE 2: RIGHT-HAND STEERING MODE ("R-Steer")                        */
        /* • LEFT THUMB:  [GAS] + [10-CGT BOOST] + [FLIP UPRIGHT]              */
        /* • RIGHT THUMB: [◀ STEER LEFT] + [STEER RIGHT ▶] + [GLIDE / DIVE]    */
        /* Ideal for right-handed players who prefer steering with Right Thumb!*/
        /* ------------------------------------------------------------------- */
        <div className="pointer-events-auto flex items-end justify-between w-full gap-2">
          {/* LEFT HAND: Gas + Boost + Flip Upright */}
          <div className="flex flex-col gap-1.5 w-[44%] max-w-[180px]">
            {phase === 'AIRBORNE' && (
              <button
                onPointerDown={handleFlipOrBarrelRoll}
                className={`w-full h-13 sm:h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl cursor-pointer touch-none active:scale-95 transition-transform ${
                  !isUprightReady
                    ? 'bg-amber-500 text-neutral-950 border-white'
                    : 'bg-neutral-900/90 text-amber-300 border-amber-400/70'
                }`}
              >
                <RotateCw className="w-4 h-4 shrink-0" />
                <span>{!isUprightReady ? 'FLIP UPRIGHT [E]' : '360° ROLL [E]'}</span>
              </button>
            )}

            <button
              {...bindTouchPad(['boost', 'accelerate'])}
              className={`w-full h-15 sm:h-18 rounded-2xl border font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xl cursor-pointer touch-none transition-transform ${
                pressedUI.boost
                  ? 'bg-cyan-300 text-neutral-950 border-white scale-95'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300/80'
              }`}
            >
              <Rocket className="w-5 h-5 shrink-0" />
              <span>10-CGT BOOST</span>
            </button>

            <button
              {...bindTouchPad(['accelerate'])}
              className={`w-full h-16 sm:h-20 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xl cursor-pointer touch-none transition-transform ${
                pressedUI.gas
                  ? 'bg-red-500 text-white border-white scale-95'
                  : 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-400/80'
              }`}
            >
              <Flame className="w-5 h-5 shrink-0" />
              <span>GAS [W]</span>
            </button>
          </div>

          {/* RIGHT HAND: Dominant Right-Thumb Left/Right Steering & Pitch */}
          <div className="flex flex-col gap-1.5 w-[52%] max-w-[210px]">
            {phase === 'AIRBORNE' && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  {...bindTouchPad(['pitchUp'])}
                  className={`h-11 rounded-xl border font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow-lg cursor-pointer touch-none ${
                    pressedUI.pitchUp
                      ? 'bg-cyan-500 text-neutral-950 border-white'
                      : 'bg-black/65 backdrop-blur-md text-white border-white/20'
                  }`}
                >
                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                  <span>GLIDE</span>
                </button>
                <button
                  {...bindTouchPad(['pitchDown'])}
                  className={`h-11 rounded-xl border font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 shadow-lg cursor-pointer touch-none ${
                    pressedUI.pitchDown
                      ? 'bg-cyan-500 text-neutral-950 border-white'
                      : 'bg-black/65 backdrop-blur-md text-white border-white/20'
                  }`}
                >
                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                  <span>DIVE</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                {...bindTouchPad(['steerLeft', 'rollLeft'])}
                className={`h-22 sm:h-26 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase flex flex-col items-center justify-center gap-1 shadow-2xl cursor-pointer touch-none transition-transform ${
                  pressedUI.left
                    ? 'bg-cyan-400 text-neutral-950 border-white scale-95'
                    : 'bg-neutral-900/90 text-white border-white/25'
                }`}
              >
                <ChevronLeft className="w-7 h-7 text-cyan-400" />
                <span>{phase === 'AIRBORNE' ? 'ROLL L' : 'LEFT'}</span>
              </button>

              <button
                {...bindTouchPad(['steerRight', 'rollRight'])}
                className={`h-22 sm:h-26 rounded-2xl border-2 font-black text-xs sm:text-sm uppercase flex flex-col items-center justify-center gap-1 shadow-2xl cursor-pointer touch-none transition-transform ${
                  pressedUI.right
                    ? 'bg-cyan-400 text-neutral-950 border-white scale-95'
                    : 'bg-neutral-900/90 text-white border-white/25'
                }`}
              >
                <ChevronRight className="w-7 h-7 text-cyan-400" />
                <span>{phase === 'AIRBORNE' ? 'ROLL R' : 'RIGHT'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
