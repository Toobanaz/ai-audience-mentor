
import React from 'react';
import { X } from 'lucide-react';

interface CollapseButtonProps {
  isHorizontal: boolean;
  onCollapse: () => void;
}

export const CollapseButton = ({ isHorizontal, onCollapse }: CollapseButtonProps) => (
  <button
    onClick={onCollapse}
    className={`absolute bg-sidebar-accent hover:bg-sidebar-accent-foreground/10 p-1 rounded-md transition-colors ${
      isHorizontal 
        ? 'top-1 right-1' 
        : 'bottom-1 right-1'
    }`}
    title="Collapse"
  >
    <X className="h-4 w-4 text-sidebar-accent-foreground/70" />
  </button>
);
