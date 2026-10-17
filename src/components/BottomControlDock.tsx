/**
 * Bottom Control Dock Component
 * Built in accordance with Three.js skill layout constitution:
 * Single consolidated bottom dock, collapsible, zero viewport occlusion
 */
import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Palette,
  Rocket,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
  Trophy,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import { ROADSTER_COLORS } from '../game/roadsterModel';
import { CameraMode } from '../game/GameCanvas';

interface BottomControlDockProps {
  activeColor: string;
  onColorChange: (colorHex: string) => void;
  hasSpaceXPackage: boolean;
  onToggleSpaceX: () => void;
  cameraMode: CameraMode;
  onCameraChange: (mode: CameraMode) => void;
  onReset: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenPrizeModal: () => void;
  onOpenLeaderboard: () => void;
  onOpenGuide: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  activeColor,
  onColorChange,
  hasSpaceXPackage,
  onToggleSpaceX,
  cameraMode,
  onCameraChange,
  onReset,
  isMuted,
  onToggleMute,
  onOpenPrizeModal,
  onOpenLeaderboard,
  onOpenGuide,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'garage' | 'cameras' | 'actions'>('garage');

  return (
    <div
      className="fixed z-30 transition-transform duration-300 ease-out flex flex-col items-center"
      style={{
        bottom: '20px',
        left: '50%',
        transform: `translateX(-50%) translateY(${isCollapsed ? 'calc(100% - 34px)' : '0'})`,
        maxWidth: 'min(940px, 94vw)',
        width: '100%',
      }}
    >
      {/* Collapse / Expand Toggle Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-4 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-t-xl border-t border-x border-neutral-700/80 shadow-lg flex items-center gap-1.5 transition-colors cursor-pointer"
        aria-label={isCollapsed ? 'Expand Control Dock' : 'Collapse Control Dock'}
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-red-400" />
            <span>Show Roadster Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>Hide Controls (Zen View)</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Dock Container (solid rgba without backdrop-filter to prevent stall) */}
      <div className="w-full bg-neutral-950/95 border border-neutral-800/90 rounded-2xl p-3 shadow-2xl shadow-black/80 flex flex-col gap-2.5">
        {/* Top Mini Navigation Bar inside the dock */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('garage')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'garage'
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Roadster Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'cameras'
                  ? 'bg-red-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Views</span>
            </button>
          </div>

          {/* Quick Utility Shortcuts */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenPrizeModal}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>$10 Challenge</span>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="px-2.5 py-1 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Daily Board</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="p-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              title="How to Play"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleMute}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onReset}
              className="px-3 py-1 bg-red-700 hover:bg-red-600 font-bold text-xs text-white rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restart [R]</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Roadster Customizer & SpaceX Package */}
        {activeTab === 'garage' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Color Swatches */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1">
                Paint:
              </span>
              <div className="flex items-center gap-2">
                {ROADSTER_COLORS.map((col) => {
                  const isSelected = activeColor.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.name}
                      onClick={() => onColorChange(col.hex)}
                      className={`group relative w-7 h-7 rounded-full border-2 transition-transform ${
                        isSelected
                          ? 'border-white scale-110 shadow-md ring-2 ring-red-500'
                          : 'border-neutral-600 hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* SpaceX Package Switch */}
            <button
              onClick={onToggleSpaceX}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                hasSpaceXPackage
                  ? 'bg-cyan-950/60 border-cyan-400/80 text-cyan-300 shadow-md shadow-cyan-900/30'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Rocket className={`w-3.5 h-3.5 ${hasSpaceXPackage ? 'text-cyan-400' : 'text-neutral-500'}`} />
              <span>SpaceX Cold-Gas Thruster Package</span>
              <span
                className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                  hasSpaceXPackage ? 'bg-cyan-400 text-black font-extrabold' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {hasSpaceXPackage ? 'Active' : 'Off'}
              </span>
            </button>
          </div>
        )}

        {/* Tab 2: Cameras */}
        {activeTab === 'cameras' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-neutral-400 font-semibold">Camera Mode:</span>
            {(['CHASE', 'SHOWROOM', 'COCKPIT', 'CINEMATIC', 'DRONE'] as CameraMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onCameraChange(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  cameraMode === mode
                    ? 'bg-neutral-100 text-neutral-950 font-bold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {mode === 'CHASE'
                  ? 'Chase 3rd'
                  : mode === 'SHOWROOM'
                  ? '360° Car Inspect'
                  : mode === 'COCKPIT'
                  ? 'Cockpit FPV'
                  : mode === 'CINEMATIC'
                  ? 'Cinematic Side'
                  : 'Drone Top'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
