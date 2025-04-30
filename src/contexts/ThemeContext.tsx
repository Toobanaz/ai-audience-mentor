
import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type ThemeAccent = 'purple' | 'blue' | 'green' | 'orange' | 'pink';
type SidebarPosition = 'left' | 'right' | 'top' | 'bottom';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: ThemeAccent;
  setAccent: (accent: ThemeAccent) => void;
  sidebarPosition: SidebarPosition;
  setSidebarPosition: (position: SidebarPosition) => void;
  isDraggingSidebar: boolean;
  setIsDraggingSidebar: (isDragging: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [accent, setAccent] = useState<ThemeAccent>('purple');
  const [sidebarPosition, setSidebarPosition] = useState<SidebarPosition>('left');
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode') as ThemeMode | null;
    const savedAccent = localStorage.getItem('theme-accent') as ThemeAccent | null;
    const savedPosition = localStorage.getItem('sidebar-position') as SidebarPosition | null;

    if (savedMode) setMode(savedMode);
    if (savedAccent) setAccent(savedAccent);
    if (savedPosition) setSidebarPosition(savedPosition);

    // Handle system preference for theme if set to system
    if (savedMode === 'system' || !savedMode) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', savedMode === 'dark');
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-accent', accent);
    localStorage.setItem('sidebar-position', sidebarPosition);

    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
  }, [mode, accent, sidebarPosition]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        accent,
        setAccent,
        sidebarPosition,
        setSidebarPosition,
        isDraggingSidebar,
        setIsDraggingSidebar
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
