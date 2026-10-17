/**
 * Jump Results & Score Summary Modal
 * Shows landing grade multiplier, on-road vs off-road status, total distance, daily rank, and $10 prize qualification
 */
import React from 'react';
import { Trophy, Award, Sparkles, AlertTriangle, RotateCcw, DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';
import { LandingGrade } from '../game/physicsEngine';

interface JumpResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  distance: number;
  grade: LandingGrade | null;
  landedOffRoad?: boolean;
  speed: number;
  rank: number;
  isDailyWinner: boolean;
  onJumpAgain: () => void;
  onOpenLeaderboard: () => void;
  onOpenPrizeModal: () => void;
}

export const JumpResultModal: React.FC<JumpResultModalProps> = ({
  isOpen,
  distance,
  grade,
  landedOffRoad = false,
  speed,
  rank,
  isDailyWinner,
  onJumpAgain,
  onOpenLeaderboard,
  onOpenPrizeModal,
}) => {
  if (!isOpen) return null;

  const distFeet = Math.round(distance * 3.28084);

  const getGradeInfo = () => {
    if (landedOffRoad) {
      return {
        title: 'MISSED THE RUNWAY (OFF-ROAD)!',
        badge: '-45% Off-Track Penalty',
        color: 'text-red-400',
        border: 'border-red-500/40',
        bg: 'bg-red-950/40',
        desc: 'You drifted outside the 34m asphalt landing strip! Use the Left Thumbstick (or A/D) in mid-air to steer back onto the road before touchdown.',
      };
    }

    switch (grade) {
      case 'smooth':
        return {
          title: 'BUTTERY SMOOTH ON-ROAD LANDING!',
          badge: '+30% Rollout Bonus',
          color: 'text-emerald-400',
          border: 'border-emerald-500/40',
          bg: 'bg-emerald-950/40',
          desc: 'Flipped upright and landed squarely on the asphalt runway! Maximum rollout momentum achieved.',
        };
      case 'solid':
        return {
          title: 'SOLID ON-ROAD LANDING',
          badge: '+12% Distance Bonus',
          color: 'text-cyan-400',
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-950/40',
          desc: 'Good upright wheel contact on the asphalt runway with minor suspension bounce.',
        };
      case 'rough':
        return {
          title: 'ROUGH TOUCHDOWN',
          badge: '-12% Distance Loss',
          color: 'text-amber-400',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/40',
          desc: 'Landed on the road at a tilted roll or steep pitch angle, scrubbing rollout speed.',
        };
      case 'crash':
        return {
          title: 'INVERTED / ROLLOVER CRASH!',
          badge: '-40% Penalty',
          color: 'text-red-400',
          border: 'border-red-500/40',
          bg: 'bg-red-950/40',
          desc: 'Touched down upside-down or nose-dived! Roll the Left Thumbstick or tap FLIP UPRIGHT [E] in mid-air before hitting the runway.',
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
      <div className="relative w-full max-w-lg bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white text-center">
        {/* Top Trophy / Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl border bg-gradient-to-br from-neutral-800 to-neutral-900 border-neutral-700">
          {isDailyWinner ? (
            <Trophy className="w-9 h-9 text-amber-400" />
          ) : rank <= 3 ? (
            <Award className="w-9 h-9 text-amber-500" />
          ) : (
            <Sparkles className="w-8 h-8 text-cyan-400" />
          )}
        </div>

        {/* Daily Contest Rank Callout */}
        {isDailyWinner ? (
          <div className="text-xs font-mono font-bold text-amber-300 mb-2">
            CURRENT #1 FOR TODAY&apos;S $10 PRIZE
          </div>
        ) : (
          <div className="text-xs font-mono font-bold text-neutral-400 mb-2">
            TODAY&apos;S RANK: #{rank}
          </div>
        )}

        {/* Distance Numbers */}
        <div className="text-xs uppercase tracking-widest text-neutral-400 font-bold mt-1">
          Total Jump Distance
        </div>
        <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white mt-1 tabular-nums">
          {distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
          <span className="text-2xl text-cyan-400">m</span>
        </div>
        <div className="text-sm font-mono text-neutral-400 mt-1 tabular-nums">
          {distFeet.toLocaleString()} ft · {speed} mph touchdown speed
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
              <span className={`font-black text-sm ${gradeInfo.color}`}>{gradeInfo.title}</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-black/40 text-white whitespace-nowrap">
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
            onClick={onOpenLeaderboard}
            className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Leaderboard</span>
          </button>
        </div>

        {/* $10 Prize Claim Link */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80">
          <button
            onClick={onOpenPrizeModal}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>How to claim the daily $10 prize &amp; payout rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
