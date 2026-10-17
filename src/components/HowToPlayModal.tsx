/**
 * How to Play & Stunt Physics Guide Modal
 */
import React from 'react';
import { HelpCircle, Rocket, Flame, Navigation, Sparkles, X } from 'lucide-react';

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
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition-colors cursor-pointer"
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
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-red-400">
              Pilot Briefing
            </span>
            <h2 className="text-2xl font-black text-white">
              Mastering the Inverted C-Ramp &amp; Manual Road Landing
            </h2>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="space-y-4 text-sm">
          {/* 1. 0.55s Rocket Launch */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-red-400 mt-0.5">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">
                01. 0.55s Rocket Acceleration (Right Gas Pedal / W)
              </div>
              <p className="text-neutral-400 text-xs mt-1">
                Hold the right-hand <strong>GAS</strong> pedal and <strong>10-CGT BOOST</strong> on launch. Use the left-hand <strong>Virtual Analog Thumbstick</strong> (or A/D) to aim straight into the center of the towering C-Ramp.
              </p>
            </div>
          </div>

          {/* 2. Inverted C-Ramp Overhang Glide */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-cyan-400 mt-0.5">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">
                02. 170° Upside-Down Overhang Glide
              </div>
              <p className="text-neutral-400 text-xs mt-1">
                Four underbody suction fans and retractable skirts pull 2.4G of downforce, pinning the Roadster vertically up the wall (90°) and upside-down (170°) along the overhanging ceiling before launching ~109 ft in the air.
              </p>
            </div>
          </div>

          {/* 3. Manual Mid-Air Flip & Road Alignment */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-amber-400 mt-0.5">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">
                03. Manual Mid-Air Flip &amp; Steering Onto the Road
              </div>
              <p className="text-neutral-400 text-xs mt-1">
                You leave the C-ramp lip <strong>upside-down (180°)</strong> with lateral drift! Move the <strong>Left Virtual Thumbstick</strong> left/right (or tap <strong>FLIP UPRIGHT [E]</strong>) to roll the car right-side-up (0°) and vector the lateral SpaceX thrusters so your indicator stays inside the <strong>ON ROAD</strong> corridor.
              </p>
            </div>
          </div>

          {/* 4. On-Road Touchdown Bonus */}
          <div className="flex gap-3.5 items-start bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800">
            <div className="p-2 bg-neutral-800 rounded-lg text-emerald-400 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-white text-base">
                04. Smooth On-Road Touchdown (+30% Distance Bonus)
              </div>
              <p className="text-neutral-400 text-xs mt-1">
                Pull the thumbstick slightly down in mid-air to stretch your glide, then level the nose and land upright inside the red-bordered asphalt runway for a <strong>+30% rollout bonus</strong>. Missing the road or landing inverted triggers a crash penalty!
              </p>
            </div>
          </div>
        </div>

        {/* Controls Reference */}
        <div className="mt-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
            Mobile Touch &amp; Desktop Controls
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Steer / Roll Flip / Pitch</span>
              <span className="text-cyan-400 font-bold">Left Thumbstick / WASD</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Gas / Launch Pedal</span>
              <span className="text-white font-bold">GAS Pedal / W / ↑</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">10-CGT Boost &amp; Hover</span>
              <span className="text-cyan-400 font-bold">BOOST Button / SPACE</span>
            </div>
            <div className="flex justify-between bg-neutral-800/60 p-2 rounded">
              <span className="text-neutral-400">Flip Upright / 360° Roll</span>
              <span className="text-amber-400 font-bold">FLIP Button / E</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-red-600 hover:bg-red-500 font-bold text-white rounded-xl transition-colors cursor-pointer"
        >
          Got It — Let&apos;s Jump!
        </button>
      </div>
    </div>
  );
};
