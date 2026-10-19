/**
 * Jump Results & Personal Best Summary Modal
 * Shows landing grade multiplier, on-road vs off-road status, total distance, and personal best
 */
import React from 'react';
import { Sparkles, AlertTriangle, RotateCcw, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { LandingGrade } from '../game/physicsEngine';

interface JumpResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  distance: number;
  bestDistance: number;
  isNewBest: boolean;
  grade: LandingGrade | null;
  landedOffRoad?: boolean;
  speed: number;
  onJumpAgain: () => void;
  onOpenStudio: () => void;
}

export const JumpResultModal: React.FC<JumpResultModalProps> = ({
  isOpen,
  distance,
  bestDistance,
  isNewBest,
  grade,
  landedOffRoad = false,
  speed,
  onJumpAgain,
  onOpenStudio,
}) => {
  if (!isOpen) return null;

  const distFeet = Math.round(distance * 3.28084);

  const getGradeInfo = () => {
    if (landedOffRoad) {
      return {
        title: 'MISSED THE RUNWAY',
        badge: '-45% Off-Road',
        color: 'text-red-400',
        border: 'border-red-500/40',
        bg: 'bg-red-950/40',
        desc: 'Drifted outside the asphalt landing strip. Use left/right steering in mid-air to align with the road.',
      };
    }

    switch (grade) {
      case 'smooth':
        return {
          title: 'SMOOTH ON-ROAD LANDING!',
          badge: '+30% Bonus',
          color: 'text-emerald-400',
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/40',
          desc: 'Flipped upright and landed cleanly on the runway with maximum rollout momentum.',
        };
      case 'solid':
        return {
          title: 'SOLID ON-ROAD LANDING',
          badge: '+12% Bonus',
          color: 'text-cyan-400',
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-950/40',
          desc: 'Good upright wheel contact on the asphalt runway.',
        };
      case 'rough':
        return {
          title: 'ROUGH TOUCHDOWN',
          badge: '-12% Scrub',
          color: 'text-amber-400',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/40',
          desc: 'Landed at a tilted angle, scrubbing rollout speed.',
        };
      case 'crash':
        return {
          title: 'INVERTED CRASH!',
          badge: '-40% Penalty',
          color: 'text-red-400',
          border: 'border-red-500/40',
          bg: 'bg-red-950/40',
          desc: 'Touched down upside-down! Tap the Flip button or steer left/right in mid-air to land on your wheels.',
        };
      default:
        return {
          title: 'TOUCHDOWN COMPLETE',
          badge: 'Standard',
          color: 'text-white',
          border: 'border-neutral-700',
          bg: 'bg-neutral-900',
          desc: 'Landed on the proving ground runway.',
        };
    }
  };

  const gradeInfo = getGradeInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl text-white text-center">
        {/* Personal Best Badge */}
        {isNewBest ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-xs font-mono font-bold text-amber-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>NEW PERSONAL BEST!</span>
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-neutral-400 mb-2">
            PERSONAL BEST: {bestDistance.toFixed(1)} m
          </div>
        )}

        {/* Distance Numbers */}
        <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white tabular-nums">
          {distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
          <span className="text-2xl text-cyan-400">m</span>
        </div>
        <div className="text-xs font-mono text-neutral-400 mt-1 tabular-nums">
          {distFeet.toLocaleString()} ft · {speed} mph touchdown
        </div>

        {/* Landing Grade Card */}
        <div className={`mt-5 p-3.5 rounded-2xl border ${gradeInfo.border} ${gradeInfo.bg} text-left flex items-start gap-3`}>
          <div className="mt-0.5">
            {grade === 'smooth' && !landedOffRoad ? (
              <Sparkles className="w-5 h-5 text-emerald-400" />
            ) : grade === 'crash' || landedOffRoad ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-black text-xs sm:text-sm ${gradeInfo.color}`}>{gradeInfo.title}</span>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-black/40 text-white whitespace-nowrap">
                {gradeInfo.badge}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{gradeInfo.desc}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onJumpAgain}
            className="py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-bold text-sm rounded-xl transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jump Again</span>
          </button>

          <button
            onClick={onOpenStudio}
            className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Customize</span>
          </button>
        </div>
      </div>
    </div>
  );
};
