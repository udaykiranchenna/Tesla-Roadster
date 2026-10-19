/**
 * Roadster Studio & Camera Drawer Component
 * Clean, visual-first customization & camera selector drawer with minimal text.
 */
import React, { useState } from 'react';
import {
  Palette,
  Rocket,
  Camera,
  RotateCcw,
  Volume2,
  VolumeX,
  HelpCircle,
  X,
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
  onOpenGuide,
}) => {
  const [activeTab, setActiveTab] = useState<'garage' | 'cameras'>('garage');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed z-40 left-1/2 -translate-x-1/2 top-14 sm:top-16 w-[min(600px,92vw)] transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      <div className="w-full bg-neutral-950/95 backdrop-blur-md border border-white/15 rounded-2xl p-3 sm:p-3.5 shadow-2xl shadow-black/90 flex flex-col gap-3">
        {/* Top Icon Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('garage')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'garage'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white bg-white/5'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Paint</span>
            </button>
            <button
              onClick={() => setActiveTab('cameras')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'cameras'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white bg-white/5'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Cameras</span>
            </button>
          </div>

          {/* Pure Icon Utility Bar */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                onClose();
                onOpenGuide();
              }}
              className="w-8 h-8 bg-white/5 hover:bg-white/15 text-neutral-300 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              title="Controls Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onToggleMute}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-white/5 hover:bg-white/15 text-neutral-300'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                onReset();
                onClose();
              }}
              className="w-8 h-8 bg-white/5 hover:bg-white/15 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: Paint Swatches & SpaceX Thruster Toggle */}
        {activeTab === 'garage' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2">
              {ROADSTER_COLORS.map((col) => {
                const isSelected = activeColor.toLowerCase() === col.hex.toLowerCase();
                return (
                  <button
                    key={col.name}
                    onClick={() => onColorChange(col.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
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

            <button
              onClick={onToggleSpaceX}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                hasSpaceXPackage
                  ? 'bg-cyan-950/60 border-cyan-400/80 text-cyan-300 shadow-md'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <Rocket className={`w-4 h-4 ${hasSpaceXPackage ? 'text-cyan-400' : 'text-neutral-500'}`} />
              <span>SpaceX</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasSpaceXPackage ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-neutral-600'
                }`}
              />
            </button>
          </div>
        )}

        {/* Tab 2: Camera Angles */}
        {activeTab === 'cameras' && (
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {(['CHASE', 'SHOWROOM', 'COCKPIT', 'CINEMATIC', 'DRONE'] as CameraMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onCameraChange(mode);
                  onClose();
                }}
                className={`py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer text-center ${
                  cameraMode === mode
                    ? 'bg-white text-neutral-950 shadow'
                    : 'bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {mode === 'CHASE'
                  ? 'Chase'
                  : mode === 'SHOWROOM'
                  ? '360°'
                  : mode === 'COCKPIT'
                  ? 'Cockpit'
                  : mode === 'CINEMATIC'
                  ? 'Side'
                  : 'Drone'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
