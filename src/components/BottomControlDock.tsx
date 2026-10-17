/**
 * Roadster Studio & Camera Drawer Component
 * Conforms to the approved Top-Bar Zen View design:
 * - When closed (Zen View active), completely unmounts/hides off-screen (0px bottom footprint)
 *   so the mobile Virtual Thumbstick and Right Pedals have 100% unobstructed thumb space!
 * - Controlled from the sleek Top Bar "Studio / Cams" button or the close button inside the drawer.
 */
import React, { useState } from 'react';
import {
  Palette,
  Rocket,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  DollarSign,
  HelpCircle,
  X,
  EyeOff,
} from 'lucide-react';
import { ROADSTER_COLORS } from '../game/roadsterModel';
import { CameraMode } from '../game/GameCanvas';

interface BottomControlDockProps {
  isOpen: boolean;
  onClose: () => void;
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
  isOpen,
  onClose,
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
  const [activeTab, setActiveTab] = useState<'garage' | 'cameras'>('garage');

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed z-40 left-1/2 -translate-x-1/2 top-14 sm:top-16 w-[min(860px,94vw)] transition-all duration-200 animate-in fade-in slide-in-from-top-2"
    >
      {/* Floating Studio & Camera Drawer */}
      <div className="w-full bg-neutral-950/95 backdrop-blur-md border border-neutral-800 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-black/90 flex flex-col gap-3">
        {/* Top Navigation Bar inside the drawer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('garage')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'garage'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Roadster Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'cameras'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Views</span>
            </button>
          </div>

          {/* Utility Shortcuts + Zen View Close */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenPrizeModal();
              }}
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">$10 Prize</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenLeaderboard();
              }}
              className="px-2.5 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenGuide();
              }}
              className="p-2 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 rounded-xl transition-colors cursor-pointer"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleMute}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                onReset();
                onClose();
              }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 font-bold text-xs text-white rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restart</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Enter Zen View"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Zen View</span>
              <X className="w-3.5 h-3.5 ml-0.5 opacity-70" />
            </button>
          </div>
        </div>

        {/* Tab 1: Roadster Customizer & SpaceX Package */}
        {activeTab === 'garage' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            {/* Color Swatches */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-neutral-400 font-semibold whitespace-nowrap">
                Finish:
              </span>
              <div className="flex items-center gap-2">
                {ROADSTER_COLORS.map((col) => {
                  const isSelected = activeColor.toLowerCase() === col.hex.toLowerCase();
                  return (
                    <button
                      key={col.name}
                      onClick={() => onColorChange(col.hex)}
                      className={`group relative w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                        isSelected
                          ? 'border-white scale-110 shadow-md ring-2 ring-red-500'
                          : 'border-neutral-600 hover:scale-105 opacity-85 hover:opacity-100'
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
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                hasSpaceXPackage
                  ? 'bg-cyan-950/60 border-cyan-400/80 text-cyan-300 shadow-md shadow-cyan-900/30'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Rocket className={`w-4 h-4 ${hasSpaceXPackage ? 'text-cyan-400' : 'text-neutral-500'}`} />
              <span>SpaceX 10-CGT Package</span>
              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded font-mono ${
                  hasSpaceXPackage ? 'bg-cyan-400 text-black font-extrabold' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {hasSpaceXPackage ? 'ON (0.55s)' : 'OFF (1.6s)'}
              </span>
            </button>
          </div>
        )}

        {/* Tab 2: Cameras */}
        {activeTab === 'cameras' && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs text-neutral-400 font-semibold mr-1 whitespace-nowrap">
              Camera Angle:
            </span>
            {(['CHASE', 'SHOWROOM', 'COCKPIT', 'CINEMATIC', 'DRONE'] as CameraMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onCameraChange(mode);
                  onClose();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  cameraMode === mode
                    ? 'bg-neutral-100 text-neutral-950 shadow'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {mode === 'CHASE'
                  ? 'Chase 3rd'
                  : mode === 'SHOWROOM'
                  ? '360° Inspect'
                  : mode === 'COCKPIT'
                  ? 'Cockpit FPV'
                  : mode === 'CINEMATIC'
                  ? 'Broadcast Side'
                  : 'Drone Top'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
