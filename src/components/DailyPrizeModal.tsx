/**
 * Daily $10 Challenge Rules and Claim Details Modal
 */
import React, { useState } from 'react';
import { DollarSign, Trophy, Award, Clock, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { dailyChallengeManager } from '../game/dailyChallenge';

interface DailyPrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerTag: string;
  onPlayerTagChange: (tag: string) => void;
  timeRemainingStr: string;
}

export const DailyPrizeModal: React.FC<DailyPrizeModalProps> = ({
  isOpen,
  onClose,
  playerTag,
  onPlayerTagChange,
  timeRemainingStr,
}) => {
  const [tagInput, setTagInput] = useState(playerTag);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const tournamentInfo = dailyChallengeManager.getTournamentInfo();

  if (!isOpen) return null;

  const handleSaveTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    dailyChallengeManager.setPlayerTag(tagInput.trim());
    onPlayerTagChange(tagInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Banner */}
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-5">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl shadow-lg shadow-red-500/20">
            <DollarSign className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                Official Tournament
              </span>
              <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Resets in {timeRemainingStr}
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white mt-0.5">
              Daily $10 Longest Jump Prize
            </h2>
          </div>
        </div>

        {/* Prize Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3.5 text-center">
            <div className="text-xs font-medium text-neutral-400 mb-1">Daily Reward</div>
            <div className="text-3xl font-black text-amber-400">$10.00</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">USD Cash or Giftcard</div>
          </div>
          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3.5 text-center">
            <div className="text-xs font-medium text-neutral-400 mb-1">Today's Best Distance</div>
            <div className="text-3xl font-black text-cyan-400">{tournamentInfo.todaysTopDistance} m</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Set by #{dailyChallengeManager.getLeaderboard()[0]?.playerTag || 'Plaid'}</div>
          </div>
          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3.5 text-center">
            <div className="text-xs font-medium text-neutral-400 mb-1">Reset Cycle</div>
            <div className="text-xl font-black text-white">00:00 UTC</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">Every 24 Hours</div>
          </div>
        </div>

        {/* Player Tag Customizer Form */}
        <form onSubmit={handleSaveTag} className="bg-neutral-800/40 border border-neutral-700/70 rounded-xl p-4 mb-6">
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
            Your Racer Callsign / Tag (Used on Daily Leaderboard)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. Starman_99"
              maxLength={16}
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 font-semibold text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save Tag
            </button>
          </div>
          {savedSuccess && (
            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Callsign saved! Your jumps will be registered under this tag.
            </p>
          )}
        </form>

        {/* How It Works & Rules */}
        <div className="space-y-4 text-sm text-neutral-300 mb-6">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Tournament Rules & How to Win
          </h3>

          <div className="space-y-2.5">
            <div className="flex gap-3 items-start bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
              <div className="font-mono font-bold text-amber-400 text-base">01</div>
              <div>
                <div className="font-semibold text-white">Full Throttle on the Stunt Ramp</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Accelerate down the straight runway. As you hit the steep curved ramp, keep full throttle—the ground-effect suction fans will pin the Roadster against the vertical and inverted wall!
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-start bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
              <div className="font-mono font-bold text-cyan-400 text-base">02</div>
              <div>
                <div className="font-semibold text-white">Fire SpaceX Cold Gas Thrusters at the Lip</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Hit the Boost key (Spacebar) right as you release from the curved ramp lip to blast into high-altitude flight and carry massive horizontal momentum.
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-start bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
              <div className="font-mono font-bold text-green-400 text-base">03</div>
              <div>
                <div className="font-semibold text-white">Nail a Buttery Smooth Landing (+30% Distance Bonus!)</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Use Pitch controls to level the nose before ground contact. Landing flat awards a "BUTTERY SMOOTH" multiplier (+30% bonus rollout distance). Crash landings reduce distance.
                </div>
              </div>
            </div>

            <div className="flex gap-3 items-start bg-neutral-900/60 p-3 rounded-lg border border-neutral-800">
              <div className="font-mono font-bold text-purple-400 text-base">04</div>
              <div>
                <div className="font-semibold text-white">Daily Reset & Payout</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  At 00:00 UTC daily, the #1 jumper on the leaderboard takes the $10 prize! Payout sent via PayPal, Venmo, CashApp, or Steam/Amazon Giftcard.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Yesterday's Winner Archive */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-800 rounded-lg text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-neutral-400 font-medium">Yesterday's Awarded Champion</div>
              <div className="font-bold text-white text-base">
                @{tournamentInfo.yesterdaysWinner.playerTag} — {tournamentInfo.yesterdaysWinner.distanceMeters} m
              </div>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> $10 Paid
          </span>
        </div>

        {/* Footer Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-bold text-base rounded-xl transition-all shadow-lg shadow-red-600/25"
          >
            Start Stunt Jump Now
          </button>
        </div>
      </div>
    </div>
  );
};
