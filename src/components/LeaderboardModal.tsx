/**
 * Daily Leaderboard Modal Component
 * Displays ranked distance standings for the $10 challenge
 */
import React from 'react';
import { Trophy, Award, Medal, Gauge, CheckCircle, Flame, X, ArrowUpRight } from 'lucide-react';
import { dailyChallengeManager, LeaderboardEntry } from '../game/dailyChallenge';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeRemainingStr: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  timeRemainingStr,
}) => {
  if (!isOpen) return null;

  const entries: LeaderboardEntry[] = dailyChallengeManager.getLeaderboard();

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> #1 WINNER ($10)
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-300/20 text-slate-200 border border-slate-300/30">
          <Medal className="w-3.5 h-3.5 text-slate-300" /> #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-700/20 text-amber-600 border border-amber-700/30">
          <Award className="w-3.5 h-3.5 text-amber-600" /> #3
        </span>
      );
    }
    return <span className="font-mono text-neutral-400 text-xs font-medium">#{rank}</span>;
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'smooth':
        return <span className="text-[11px] text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Smooth 1.3x</span>;
      case 'solid':
        return <span className="text-[11px] text-cyan-400 font-medium bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">Solid 1.1x</span>;
      case 'rough':
        return <span className="text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Rough 0.85x</span>;
      case 'crash':
        return <span className="text-[11px] text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Crash 0.55x</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400">
              <Trophy className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-red-400">Today's Standings</span>
                <span className="text-xs font-mono text-neutral-400">• Resets in {timeRemainingStr}</span>
              </div>
              <h2 className="text-2xl font-black text-white">Daily $10 Leaderboard</h2>
            </div>
          </div>
        </div>

        {/* Table of Competitors */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {entries.map((entry) => {
            const isUser = entry.isCurrentUser;
            const distFeet = Math.round(entry.distanceMeters * 3.28084);
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isUser
                    ? 'bg-red-950/40 border-red-500/50 shadow-lg shadow-red-900/20'
                    : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Left: Rank & Pilot */}
                <div className="flex items-center gap-3">
                  <div className="w-24 flex items-center">{getRankBadge(entry.rank)}</div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      {entry.playerTag}
                      {isUser && (
                        <span className="px-1.5 py-0.2 text-[10px] uppercase font-bold bg-red-500 text-white rounded">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                      <span>{entry.speedMph} mph</span>
                      <span>•</span>
                      <span>{entry.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Distance & Landing Grade */}
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-lg font-mono font-black text-white">
                      {entry.distanceMeters.toLocaleString(undefined, { minimumFractionDigits: 1 })} m
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {distFeet.toLocaleString()} ft
                    </div>
                  </div>
                  <div className="w-20 text-right">{getGradeBadge(entry.landingGrade)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
          <span>The #1 driver when timer hits 00:00 UTC receives $10 USD.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 font-semibold text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
