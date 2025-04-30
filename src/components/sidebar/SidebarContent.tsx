
import React from 'react';
import { AudienceLevel, Mode } from '@/types';
import { Button } from '@/components/ui/button';

interface SidebarContentProps {
  audienceLevel: AudienceLevel;
  mode: Mode;
  onAudienceLevelChange: (level: AudienceLevel) => void;
  onModeChange: (mode: Mode) => void;
  onNewSession: () => void;
}

export const SidebarContent = ({
  audienceLevel,
  mode,
  onAudienceLevelChange,
  onModeChange,
  onNewSession,
}: SidebarContentProps) => (
  <div className="p-4 overflow-auto">
    <h2 className="font-semibold mb-4">AI Reverse Learning</h2>
    
    <Button
      onClick={onNewSession}
      className="w-full mb-4 flex items-center justify-start gap-2 bg-ailearn-lightpurple hover:bg-ailearn-purple text-white p-2 rounded-md transition-colors"
    >
      <span>New Session</span>
    </Button>
    
    <div className="mb-4">
      <label className="block text-sm mb-2">Audience Level</label>
      <div className="space-y-2">
        {(['Beginner', 'Intermediate', 'Expert'] as const).map((level) => (
          <button
            key={level}
            className={`w-full text-left px-3 py-2 rounded-md ${
              audienceLevel === level
                ? 'bg-ailearn-purple text-white'
                : 'hover:bg-sidebar-accent'
            }`}
            onClick={() => onAudienceLevelChange(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
    
    <div className="mb-4">
      <label className="block text-sm mb-2">Mode</label>
      <div className="space-y-2">
      {(['Explain', 'Presentation'] as const).map((modeOption) => (
          <button
            key={modeOption}
            className={`w-full text-left px-3 py-2 rounded-md ${
              mode === modeOption
                ? 'bg-ailearn-purple text-white'
                : 'hover:bg-sidebar-accent'
            }`}
            onClick={() => onModeChange(modeOption)}
          >
            {modeOption}
          </button>
        ))}
      </div>
    </div>
  </div>
);
