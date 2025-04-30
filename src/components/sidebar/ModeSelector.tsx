import React from 'react';
import { Mode } from '@/types';

interface ModeSelectorProps {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export const ModeSelector = ({ currentMode, onModeChange }: ModeSelectorProps) => {
  return (
    <div className="mb-4">
      <label className="block text-sm mb-2">Mode</label>
      <div className="space-y-2">
        {(['Explain', 'Presentation'] as const).map((mode) => (
          <button
            key={mode}
            className={`w-full text-left px-3 py-2 rounded-md ${
              currentMode === mode
                ? 'bg-ailearn-purple text-white'
                : 'hover:bg-gray-700'
            }`}
            onClick={() => onModeChange(mode)}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
};
