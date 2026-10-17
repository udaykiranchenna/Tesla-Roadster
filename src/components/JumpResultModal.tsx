/**
 * Jump Results & Score Summary Modal
 * Shows landing grade multiplier, total distance, daily rank, and $10 prize qualification
 */
import React from 'react';
import { Trophy, Award, Sparkles, AlertTriangle, RotateCcw, DollarSign, ArrowRight, Share2, CheckCircle2 } from 'lucide-react';
import { LandingGrade } from '../game/physicsEngine';

interface JumpResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  distance: number;
  grade: LandingGrade | null;
  speed: number;
  rank: number;
  isDailyWinner: boolean;
  onJumpAgain: () => void;
  onOpenLeaderboard: () => void;
  onOpenPrizeModal: () => void;
}

export const JumpResultModal: React.FC<JumpResultModalProps> = ({
  isOpen,
  onClose,
  distance,
  grade,
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
    switch (grade) {
      case 'smooth':
        return {
          title: 'BUTTERY SMOOTH LANDING!',
          badge: '+30% Rollout Bonus',
          color: 'text-green-400',
          border: 'border-green-500/40',
          bg: 'bg-green-950/40',
          desc: 'Perfect nose pitch angle on touchdown. Absorbed momentum cleanly for maximum distance!',
        };
      case 'solid':
        return {
          title: 'SOLID CLEAN LANDING',
          badge: '+10% Distance Bonus',
          color: 'text-cyan-400',
          border: 'border-cyan-500/40',
          bg: 'bg-cyan-950/40',
          desc: 'Good wheel contact and minor suspension bounce.',
        };
      case 'rough':
        return {
          title: 'ROUGH TOUCHDOWN',
          badge: '-15% Distance Loss',
          color: 'text-amber-400',
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/40',
          desc: 'High pitch angle caused a skid and bounce.',
        };
      case 'crash':
        return {
          title: 'NOSE DIVE CRASH!',
          badge: '-45% Penalty',
          color: 'text-red-400',
          border: 'border-red-500/40',
          bg: 'bg-red-950/40',
          desc: 'Flipped or severe impact halted forward rollout abruptly.',
        };
      default:
        return {
          title: 'TOUCHDOWN COMPLETE',
          badge: 'Standard',
          color: 'text-white',
          border: 'border-neutral-700',
          bg: 'bg-neutral-900',
          desc: 'Landed on runway.',
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
            <Trophy className="w-9 h-9 text-amber-400 animate-bounce" />
          ) : rank <= 3 ? (
            <Award className="w-9 h-9 text-amber-500" />
          ) : (
            <Sparkles className="w-8 h-8 text-cyan-400" />
          )}
        </div>

        {/* Daily Contest Rank Callout */}
        {isDailyWinner ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-2">
            <Trophy className="w-3.5 h-3.5" /> CURRENT #1 FOR TODAY'S $10 PRIZE!
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-300 border border-neutral-700 mb-2">
            <span>TODAY'S RANK: #{rank}</span>
          </div>
        )}

        {/* Distance Numbers */}
        <div className="text-xs uppercase tracking-widest text-neutral-400 font-bold mt-1">
          Total Jump Distance
        </div>
        <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white mt-1">
          {distance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
          <span className="text-2xl text-cyan-400">m</span>
        </div>
        <div className="text-sm font-mono text-neutral-400 mt-1">
          {distFeet.toLocaleString()} ft • {speed} mph launch speed
        </div>

        {/* Landing Grade Card */}
        <div className={`mt-5 p-3.5 rounded-2xl border ${gradeInfo.border} ${gradeInfo.bg} text-left flex items-start gap-3`}>
          <div className="mt-0.5">
            {grade === 'smooth' ? (
              <Sparkles className="w-5 h-5 text-green-400" />
            ) : grade === 'crash' ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={`font-black text-sm ${gradeInfo.color}`}>{gradeInfo.title}</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-black/40 text-white">
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
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>How to claim the daily $10 prize & payout rules</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
