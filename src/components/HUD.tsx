/**
 * Mobile-Responsive 2-Hands Tactile Hardware Controller & Minimalist Telemetry HUD
 * Visual-first automotive & aerospace controls:
 * - Icon-driven sculpted hardware buttons, racing pedals with grip ridges, and glowing thruster rings
 * - Visual horizon & runway radar bar (no wordy text banners)
 * - True 2-Hands Split Mode (Default) & Right-Thumb Steer Mode toggle
 */
import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Flame,
  RotateCw,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Gamepad2,
  Disc,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { Telemetry, PlayerInput } from '../game/physicsEngine';

interface HUDProps {
  telemetry: Telemetry;
  bestDistance: number;
  isStudioOpen: boolean;
  onToggleStudio: () => void;
  inputStateRef: React.MutableRefObject<PlayerInput>;
  onReset: () => void;
}

type ControlLayoutMode = 'TWO_HAND_SPLIT' | 'RIGHT_HAND_STEER';

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  bestDistance,
  isStudioOpen,
  onToggleStudio,
  inputStateRef,
  onReset,
}) => {
  const {
    phase,
    speedMph,
    distanceJumpedMeters,
    boostFuelPct,
    rollDeg,
    isUprightReady,
    lateralOffsetMeters,
    isOnRunwayCorridor,
    barrelRollsCount,
    countdownTimer,
  } = telemetry;

  const [controlMode, setControlMode] = useState<ControlLayoutMode>('TWO_HAND_SPLIT');

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

  const roadMarkerPct = Math.max(-46, Math.min(46, (lateralOffsetMeters / 28) * 46));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-white select-none touch-none overflow-hidden">
      {/* ===================================================================== */}
      {/* SLEEK ICON-FIRST TOP BAR                                              */}
      {/* ===================================================================== */}
      <header className="flex items-center justify-between w-full pointer-events-auto">
        {/* Left: Compact Brand + Personal Best Pill */}
        <div className="flex items-center gap-2 bg-neutral-950/75 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1.5 shadow-lg">
          <span className="font-black tracking-wider text-xs sm:text-sm text-white">
            ROADSTER
          </span>
          {bestDistance > 0 && (
            <div className="flex items-center gap-1 pl-2 border-l border-white/15 text-amber-300 font-mono text-xs font-bold tabular-nums">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{Math.round(bestDistance)}M</span>
            </div>
          )}
        </div>

        {/* Center: Speedometer & Jump Distance Cluster */}
        <div className="flex items-center gap-3 sm:gap-5 bg-neutral-950/75 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1 sm:px-5 sm:py-1.5 shadow-xl tabular-nums">
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-mono text-white leading-none">
              {speedMph}
            </span>
            <span className="text-[9px] font-bold text-neutral-400">MPH</span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-mono text-cyan-400 leading-none">
              {distanceJumpedMeters.toFixed(0)}
            </span>
            <span className="text-[9px] font-bold text-cyan-500">M</span>
          </div>

          {/* Slim N2 Fuel Bar */}
          <div className="hidden xs:flex flex-col items-center gap-0.5">
            <div className="w-10 sm:w-14 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-75"
                style={{ width: `${boostFuelPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Pure Icon Action Cluster (Layout Switch, Reset, Studio) */}
        <div className="flex items-center gap-1.5 bg-neutral-950/75 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-lg">
          <button
            onClick={() =>
              setControlMode((prev) =>
                prev === 'TWO_HAND_SPLIT' ? 'RIGHT_HAND_STEER' : 'TWO_HAND_SPLIT'
              )
            }
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              controlMode === 'TWO_HAND_SPLIT'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
            }`}
            title="Switch 2-Hands Layout"
          >
            <Gamepad2 className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Reset Run"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleStudio}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
              isStudioOpen
                ? 'bg-red-600 text-white border-red-400 shadow-md'
                : 'bg-white/5 hover:bg-white/15 text-cyan-400 border-transparent'
            }`}
            title="Customize & Cameras"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* VISUAL HORIZON & RUNWAY RADAR (ZERO WORDY TEXT)                       */}
      {/* ===================================================================== */}
      <div className="flex flex-col items-center mt-1.5 mb-auto pointer-events-none">
        {phase === 'STAGING' && countdownTimer > 0 && (
          <div className="w-12 h-12 rounded-full bg-black/70 backdrop-blur-md border-2 border-amber-400/70 flex items-center justify-center shadow-2xl">
            <span className="text-xl font-black font-mono text-amber-300">{countdownTimer}</span>
          </div>
        )}

        {(phase === 'AIRBORNE' || phase === 'RAMP_CLIMB' || phase === 'ROLLOUT') && (
          <div className="bg-neutral-950/75 backdrop-blur-md border border-white/15 rounded-full px-3.5 py-1.5 flex items-center gap-3 shadow-xl">
            {/* Visual Car Attitude Gyro Icon (rotates live with car rollDeg!) */}
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors ${
                isUprightReady
                  ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-300'
                  : 'border-amber-400/90 bg-amber-500/25 text-amber-300 animate-pulse'
              }`}
            >
              <Navigation
                className="w-3.5 h-3.5 transition-transform duration-75"
                style={{ transform: `rotate(${rollDeg}deg)` }}
              />
            </div>

            {/* Visual Runway Alignment Strip */}
            <div className="relative w-32 sm:w-44 h-2.5 bg-red-950/90 rounded-full overflow-hidden border border-white/15">
              {/* Asphalt Road Zone */}
              <div className="absolute top-0 bottom-0 left-[20%] right-[20%] bg-neutral-700 border-x border-red-500/80" />
              {/* Center Line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/50" />
              {/* Live Car Position Dot */}
              <div
                className={`absolute top-0.5 bottom-0.5 w-3 rounded-full -translate-x-1/2 transition-all duration-75 shadow ${
                  isOnRunwayCorridor
                    ? 'bg-cyan-400 shadow-cyan-400/80'
                    : 'bg-amber-400 shadow-amber-400/80'
                }`}
                style={{ left: `${50 + roadMarkerPct}%` }}
              />
            </div>

            {/* Barrel Roll Counter Badge */}
            {barrelRollsCount > 0 && (
              <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-black text-amber-300">
                {barrelRollsCount}×
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SCULPTED HARDWARE 2-HANDS TOUCH CONTROLS (CLEAN ICON DESIGN)          */}
      {/* ===================================================================== */}
      {controlMode === 'TWO_HAND_SPLIT' ? (
        /* ------------------------------------------------------------------- */
        /* MODE 1 (DEFAULT): SYMMETRIC 2-HANDS SPLIT                           */
        /* • LEFT HAND:  [◀ STEER] + [ROCKET BOOST] + [BRAKE / DIVE]           */
        /* • RIGHT HAND: [STEER ▶] + [GAS PEDAL / FLIP] + [GLIDE UP]           */
        /* ------------------------------------------------------------------- */
        <div className="pointer-events-auto flex items-end justify-between w-full px-1 sm:px-3">
          {/* LEFT THUMB CLUSTER */}
          <div className="flex items-end gap-2.5 sm:gap-3.5">
            {/* Primary Left Steer / Roll Pad */}
            <button
              {...bindTouchPad(['steerLeft', 'rollLeft'])}
              aria-label="Steer Left"
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                pressedUI.left
                  ? 'bg-cyan-400 text-neutral-950 scale-92 ring-4 ring-cyan-300/60 shadow-cyan-400/50'
                  : 'bg-neutral-900/85 hover:bg-neutral-800/90 text-white border-2 border-white/20 backdrop-blur-md'
              }`}
            >
              <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
              <ChevronLeft
                className={`w-10 h-10 sm:w-12 sm:h-12 -ml-1 ${
                  pressedUI.left ? 'text-neutral-950' : 'text-cyan-400'
                }`}
                strokeWidth={2.75}
              />
            </button>

            {/* Secondary Left Column: Boost Thruster + Brake/Dive */}
            <div className="flex flex-col items-center gap-2 pb-1">
              {phase === 'AIRBORNE' ? (
                <button
                  {...bindTouchPad(['pitchDown'])}
                  aria-label="Nose Down"
                  className={`w-12 h-10 sm:w-14 sm:h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer touch-none shadow-lg ${
                    pressedUI.pitchDown
                      ? 'bg-cyan-400 text-neutral-950 border-white scale-92'
                      : 'bg-neutral-900/80 text-neutral-300 border-white/15 backdrop-blur-md'
                  }`}
                >
                  <ChevronDown className="w-6 h-6" strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  {...bindTouchPad(['brake'])}
                  aria-label="Brake or Drift"
                  className={`w-12 h-10 sm:w-14 sm:h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer touch-none shadow-lg ${
                    pressedUI.brake
                      ? 'bg-amber-400 text-neutral-950 border-white scale-92'
                      : 'bg-neutral-900/80 text-amber-400/90 border-white/15 backdrop-blur-md'
                  }`}
                >
                  <Disc className="w-5 h-5" />
                </button>
              )}

              {/* SpaceX Cold-Gas Thruster Button */}
              <button
                {...bindTouchPad(['boost', 'accelerate'])}
                aria-label="Rocket Boost"
                className={`relative w-15 h-15 sm:w-17 sm:h-17 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                  pressedUI.boost
                    ? 'bg-cyan-300 text-neutral-950 scale-92 ring-4 ring-white shadow-cyan-400/60'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-2 border-cyan-300/80 shadow-cyan-500/30'
                }`}
              >
                <div className="absolute inset-1.5 rounded-full border border-white/25 pointer-events-none" />
                <Rocket className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.25} />
              </button>
            </div>
          </div>

          {/* RIGHT THUMB CLUSTER */}
          <div className="flex items-end gap-2.5 sm:gap-3.5">
            {/* Secondary Right Column: Glide Up + Flip / Gas Pedal */}
            <div className="flex flex-col items-center gap-2 pb-1">
              {phase === 'AIRBORNE' && (
                <button
                  {...bindTouchPad(['pitchUp'])}
                  aria-label="Nose Up Glide"
                  className={`w-12 h-10 sm:w-14 sm:h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer touch-none shadow-lg ${
                    pressedUI.pitchUp
                      ? 'bg-cyan-400 text-neutral-950 border-white scale-92'
                      : 'bg-neutral-900/80 text-neutral-300 border-white/15 backdrop-blur-md'
                  }`}
                >
                  <ChevronUp className="w-6 h-6" strokeWidth={2.5} />
                </button>
              )}

              {phase === 'AIRBORNE' ? (
                /* Mid-Air Self-Righting Flip / 360° Spin Trigger */
                <button
                  onPointerDown={handleFlipOrBarrelRoll}
                  aria-label="Flip Car Upright"
                  className={`relative w-15 h-15 sm:w-17 sm:h-17 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl active:scale-90 ${
                    !isUprightReady
                      ? 'bg-amber-400 text-neutral-950 ring-4 ring-amber-300/60 shadow-amber-400/50 animate-pulse'
                      : 'bg-neutral-900/90 text-amber-400 border-2 border-amber-400/70'
                  }`}
                >
                  <div className="absolute inset-1.5 rounded-full border border-current opacity-25 pointer-events-none" />
                  <RotateCw className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.5} />
                </button>
              ) : (
                /* Sculpted Racing Accelerator Pedal */
                <button
                  {...bindTouchPad(['accelerate'])}
                  aria-label="Accelerator Pedal"
                  className={`relative w-15 h-20 sm:w-17 sm:h-24 rounded-2xl flex flex-col items-center justify-between py-3 transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                    pressedUI.gas
                      ? 'bg-red-500 text-white scale-92 ring-4 ring-red-400/60 shadow-red-500/60'
                      : 'bg-gradient-to-b from-red-600 to-red-800 text-white border-2 border-red-400/80 shadow-red-600/30'
                  }`}
                >
                  {/* Tactile Pedal Tread Lines */}
                  <div className="w-7 h-1 rounded-full bg-black/30" />
                  <Flame className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow" strokeWidth={2.25} />
                  <div className="flex flex-col gap-1">
                    <div className="w-7 h-1 rounded-full bg-black/30" />
                    <div className="w-7 h-1 rounded-full bg-black/30" />
                  </div>
                </button>
              )}
            </div>

            {/* Primary Right Steer / Roll Pad */}
            <button
              {...bindTouchPad(['steerRight', 'rollRight'])}
              aria-label="Steer Right"
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                pressedUI.right
                  ? 'bg-cyan-400 text-neutral-950 scale-92 ring-4 ring-cyan-300/60 shadow-cyan-400/50'
                  : 'bg-neutral-900/85 hover:bg-neutral-800/90 text-white border-2 border-white/20 backdrop-blur-md'
              }`}
            >
              <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
              <ChevronRight
                className={`w-10 h-10 sm:w-12 sm:h-12 -mr-1 ${
                  pressedUI.right ? 'text-neutral-950' : 'text-cyan-400'
                }`}
                strokeWidth={2.75}
              />
            </button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* MODE 2: RIGHT-THUMB STEERING ("R-Steer")                            */
        /* • LEFT HAND:  [GAS PEDAL] + [ROCKET BOOST] + [FLIP]                 */
        /* • RIGHT HAND: [◀ LEFT] + [RIGHT ▶] + [PITCH TRIM]                   */
        /* ------------------------------------------------------------------- */
        <div className="pointer-events-auto flex items-end justify-between w-full px-1 sm:px-3">
          {/* LEFT HAND: Pedals & Thrusters */}
          <div className="flex items-end gap-2.5 sm:gap-3.5">
            {/* Sculpted Racing Accelerator Pedal */}
            <button
              {...bindTouchPad(['accelerate'])}
              aria-label="Accelerator Pedal"
              className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-2xl flex flex-col items-center justify-between py-3.5 transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                pressedUI.gas
                  ? 'bg-red-500 text-white scale-92 ring-4 ring-red-400/60'
                  : 'bg-gradient-to-b from-red-600 to-red-800 text-white border-2 border-red-400/80'
              }`}
            >
              <div className="w-8 h-1 rounded-full bg-black/30" />
              <Flame className="w-8 h-8 sm:w-9 sm:h-9" strokeWidth={2.25} />
              <div className="flex flex-col gap-1">
                <div className="w-8 h-1 rounded-full bg-black/30" />
                <div className="w-8 h-1 rounded-full bg-black/30" />
              </div>
            </button>

            <div className="flex flex-col items-center gap-2 pb-1">
              {phase === 'AIRBORNE' ? (
                <button
                  onPointerDown={handleFlipOrBarrelRoll}
                  aria-label="Flip Car Upright"
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all cursor-pointer touch-none shadow-xl active:scale-90 ${
                    !isUprightReady
                      ? 'bg-amber-400 text-neutral-950 ring-4 ring-amber-300/60 animate-pulse'
                      : 'bg-neutral-900/90 text-amber-400 border-2 border-amber-400/70'
                  }`}
                >
                  <RotateCw className="w-7 h-7" strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  {...bindTouchPad(['brake'])}
                  aria-label="Brake"
                  className={`w-12 h-10 sm:w-14 sm:h-11 rounded-2xl flex items-center justify-center border transition-all cursor-pointer touch-none shadow-lg ${
                    pressedUI.brake
                      ? 'bg-amber-400 text-neutral-950 border-white scale-92'
                      : 'bg-neutral-900/80 text-amber-400 border-white/15 backdrop-blur-md'
                  }`}
                >
                  <Disc className="w-5 h-5" />
                </button>
              )}

              <button
                {...bindTouchPad(['boost', 'accelerate'])}
                aria-label="Rocket Boost"
                className={`relative w-15 h-15 sm:w-17 sm:h-17 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                  pressedUI.boost
                    ? 'bg-cyan-300 text-neutral-950 scale-92 ring-4 ring-white'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-2 border-cyan-300/80'
                }`}
              >
                <Rocket className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.25} />
              </button>
            </div>
          </div>

          {/* RIGHT HAND: Dual Left/Right Steering Wheel Pads */}
          <div className="flex flex-col items-center gap-2">
            {phase === 'AIRBORNE' && (
              <div className="flex items-center gap-2">
                <button
                  {...bindTouchPad(['pitchUp'])}
                  aria-label="Nose Up"
                  className={`w-14 h-10 rounded-2xl flex items-center justify-center border transition-all cursor-pointer touch-none ${
                    pressedUI.pitchUp
                      ? 'bg-cyan-400 text-neutral-950 border-white scale-92'
                      : 'bg-neutral-900/80 text-white border-white/20 backdrop-blur-md'
                  }`}
                >
                  <ChevronUp className="w-6 h-6" strokeWidth={2.5} />
                </button>
                <button
                  {...bindTouchPad(['pitchDown'])}
                  aria-label="Nose Down"
                  className={`w-14 h-10 rounded-2xl flex items-center justify-center border transition-all cursor-pointer touch-none ${
                    pressedUI.pitchDown
                      ? 'bg-cyan-400 text-neutral-950 border-white scale-92'
                      : 'bg-neutral-900/80 text-white border-white/20 backdrop-blur-md'
                  }`}
                >
                  <ChevronDown className="w-6 h-6" strokeWidth={2.5} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                {...bindTouchPad(['steerLeft', 'rollLeft'])}
                aria-label="Steer Left"
                className={`relative w-19 h-19 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                  pressedUI.left
                    ? 'bg-cyan-400 text-neutral-950 scale-92 ring-4 ring-cyan-300/60'
                    : 'bg-neutral-900/85 text-white border-2 border-white/20 backdrop-blur-md'
                }`}
              >
                <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
                <ChevronLeft
                  className={`w-10 h-10 -ml-1 ${pressedUI.left ? 'text-neutral-950' : 'text-cyan-400'}`}
                  strokeWidth={2.75}
                />
              </button>

              <button
                {...bindTouchPad(['steerRight', 'rollRight'])}
                aria-label="Steer Right"
                className={`relative w-19 h-19 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer touch-none shadow-2xl ${
                  pressedUI.right
                    ? 'bg-cyan-400 text-neutral-950 scale-92 ring-4 ring-cyan-300/60'
                    : 'bg-neutral-900/85 text-white border-2 border-white/20 backdrop-blur-md'
                }`}
              >
                <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
                <ChevronRight
                  className={`w-10 h-10 -mr-1 ${pressedUI.right ? 'text-neutral-950' : 'text-cyan-400'}`}
                  strokeWidth={2.75}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
