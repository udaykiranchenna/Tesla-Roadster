/**
 * How to Play & Stunt Physics Guide Modal
 */
import React from 'react';
import { HelpCircle, Rocket, Flame, ArrowUp, Navigation, Sparkles, X } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-5">
          <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-xl text-red-400">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-red-400">Pilot Briefing</span>
            <h2 className="text-2xl font-black text-white">How to Master the Curved Loop Jump</h2>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="space-y-4 text-sm">
          {/* 1. Plaid Acceleration */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-red-400 mt-0.5">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">1. Plaid Acceleration Launch (W / Up Arrow)</div>
              <p className="text-neutral-400 text-xs mt-1">
                Pin the throttle immediately on green light. The Tesla Roadster's tri-motor Plaid powertrain unleashes 0-60 in ~1.1 seconds. Steer with A/D to keep perfectly centered down the speed lane.
              </p>
            </div>
          </div>

          {/* 2. Curved Ramp & Wall Crawling */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-cyan-400 mt-0.5">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">2. Steep Curved Wall Crawl (Half-Circle Loop)</div>
              <p className="text-neutral-400 text-xs mt-1">
                As the car hits the curved ramp, high-downforce ground-effect suction fans pin the tires flush to the surface. You'll drive 90° vertically, and then curve upside-down (up to 128° loop) before reaching the launch lip.
              </p>
            </div>
          </div>

          {/* 3. SpaceX Booster Thrusters */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-amber-400 mt-0.5">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">3. SpaceX Cold-Gas Booster (Spacebar / Boost Button)</div>
              <p className="text-neutral-400 text-xs mt-1">
                The SpaceX cold-gas thruster package behind the license plate delivers massive rocket propulsion. Fire the thrusters right as you leave the lip and pulse it at high altitude to glide over 1,500+ meters!
              </p>
            </div>
          </div>

          {/* 4. Buttery Smooth Landing */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-green-400 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">4. Buttery Smooth Touchdown (+30% Distance Bonus!)</div>
              <p className="text-neutral-400 text-xs mt-1">
                Use Pitch controls (S/W or Down/Up keys) in mid-air to level the car. Touchdown pitch between -5° and +10° earns a <strong>BUTTERY SMOOTH LANDING</strong> multiplier (+30% rollout distance bonus). If you nose-dive or flip, distance will be penalized!
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard Controls Table */}
        <div className="mt-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
            Keyboard & Gamepad Controls
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Accelerate / Pitch Down</span>
              <span className="text-white font-bold">W / ↑</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Brake / Pitch Up</span>
              <span className="text-white font-bold">S / ↓</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Steer / Air Roll</span>
              <span className="text-white font-bold">A / D or ← / →</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">SpaceX Cold-Gas Boost</span>
              <span className="text-cyan-400 font-bold">SPACEBAR</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Instant Reset Run</span>
              <span className="text-white font-bold">R</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Switch Camera</span>
              <span className="text-white font-bold">C</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-red-600 hover:bg-red-500 font-bold text-white rounded-xl transition-colors"
        >
          Got it, Let's Jump!
        </button>
      </div>
    </div>
  );
};
