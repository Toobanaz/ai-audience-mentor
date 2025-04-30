
import React from 'react';
import { AudienceLevel } from '@/types';

interface AudienceLevelSelectorProps {
  currentLevel: AudienceLevel;
  onLevelChange: (level: AudienceLevel) => void;
}

export const AudienceLevelSelector = ({
  currentLevel,
  onLevelChange
}: AudienceLevelSelectorProps) => {
  return (
    <div className="mb-4">
      <label className="block text-sm mb-2">Audience Level</label>
      <div className="space-y-2">
        {(['Beginner', 'Intermediate', 'Expert'] as const).map((level) => (
          <button
            key={level}
            className={`w-full text-left px-3 py-2 rounded-md ${
              currentLevel === level
                ? 'bg-ailearn-purple text-white'
                : 'hover:bg-gray-700'
            }`}
            onClick={() => onLevelChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
};
