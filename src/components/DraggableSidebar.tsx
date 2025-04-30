
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { SidebarProps } from '@/types';
import { DragHandle } from './sidebar/DragHandle';
import { CollapseButton } from './sidebar/CollapseButton';
import { SidebarContent } from './sidebar/SidebarContent';

export const DraggableSidebar = (props: SidebarProps) => {
  const { sidebarPosition, setSidebarPosition, isDraggingSidebar, setIsDraggingSidebar } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getSize = () => {
    if (collapsed) return { width: '4rem', height: '4rem' };
    return sidebarPosition === 'left' || sidebarPosition === 'right'
      ? { width: '16rem', height: '100%' }
      : { width: '100%', height: '16rem' };
  };
  
  const getSidebarStyle = () => {
    const { width, height } = getSize();
    const baseStyle = {
      width,
      height,
      transition: isDraggingSidebar ? 'none' : 'all 0.3s ease',
    };
    
    const positionStyles = {
      left: { ...baseStyle, left: 0, top: 0, bottom: 0, borderRight: '1px solid var(--sidebar-border)' },
      right: { ...baseStyle, right: 0, top: 0, bottom: 0, borderLeft: '1px solid var(--sidebar-border)' },
      top: { ...baseStyle, top: 0, left: 0, right: 0, borderBottom: '1px solid var(--sidebar-border)' },
      bottom: { ...baseStyle, bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--sidebar-border)' },
    };
    
    return positionStyles[sidebarPosition];
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
    startPositionRef.current = { x: e.clientX, y: e.clientY };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDraggingSidebar) return;
    
    const deltaX = e.clientX - startPositionRef.current.x;
    const deltaY = e.clientY - startPositionRef.current.y;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      deltaX > viewportWidth / 4 
        ? setSidebarPosition('right')
        : deltaX < -viewportWidth / 4 && setSidebarPosition('left');
    } else {
      deltaY > viewportHeight / 4
        ? setSidebarPosition('bottom')
        : deltaY < -viewportHeight / 4 && setSidebarPosition('top');
    }
  };

  const handleDragEnd = () => {
    setIsDraggingSidebar(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, []);

  const isHorizontal = sidebarPosition === 'top' || sidebarPosition === 'bottom';
  
  const SidebarWrapper = () => (
    <div className="flex flex-col bg-sidebar text-sidebar-foreground h-full w-full overflow-hidden relative"
         style={{ flexDirection: isHorizontal ? 'row' : 'column' }}>
      <DragHandle isHorizontal={isHorizontal} onDragStart={handleDragStart} />
      <CollapseButton isHorizontal={isHorizontal} onCollapse={() => setCollapsed(!collapsed)} />
      {!collapsed && <SidebarContent {...props} />}
    </div>
  );

  return (
    <>
      <div className="hidden md:block fixed z-30" style={getSidebarStyle()}>
        <SidebarWrapper />
      </div>
      
      <div className={`md:hidden fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 transform ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarWrapper />
      </div>
      
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileOpen(!mobileOpen)}
        />
      )}
    </>
  );
};
