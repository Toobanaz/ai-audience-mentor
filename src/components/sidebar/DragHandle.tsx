
import React from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';

interface DragHandleProps {
  isHorizontal: boolean;
  onDragStart: (e: React.MouseEvent) => void;
}

export const DragHandle = ({ isHorizontal, onDragStart }: DragHandleProps) => (
  <div
    className={`absolute cursor-move flex items-center justify-center z-10 bg-sidebar-accent hover:bg-sidebar-accent-foreground/10 rounded-md p-1 transition-colors ${
      isHorizontal 
        ? 'top-1 left-1/2 -translate-x-1/2' 
        : 'left-1 top-1/2 -translate-y-1/2'
    }`}
    onMouseDown={onDragStart}
    title="Drag to reposition sidebar"
  >
    {isHorizontal ? (
      <GripHorizontal className="h-4 w-4 text-sidebar-accent-foreground/70" />
    ) : (
      <GripVertical className="h-4 w-4 text-sidebar-accent-foreground/70" />
    )}
  </div>
);
