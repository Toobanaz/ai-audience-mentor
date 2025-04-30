
import React from 'react';
import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const ThemeSwitcher = () => {
  const { mode, setMode, accent, setAccent, sidebarPosition, setSidebarPosition } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {mode === 'light' && <Sun className="h-[1.2rem] w-[1.2rem]" />}
          {mode === 'dark' && <Moon className="h-[1.2rem] w-[1.2rem]" />}
          {mode === 'system' && <Monitor className="h-[1.2rem] w-[1.2rem]" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setMode('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Color Accent</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => setAccent('purple')}>
              <div className="w-4 h-4 rounded-full bg-ailearn-purple mr-2" />
              <span>Purple</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAccent('blue')}>
              <div className="w-4 h-4 rounded-full bg-blue-500 mr-2" />
              <span>Blue</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAccent('green')}>
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2" />
              <span>Green</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAccent('orange')}>
              <div className="w-4 h-4 rounded-full bg-orange-500 mr-2" />
              <span>Orange</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAccent('pink')}>
              <div className="w-4 h-4 rounded-full bg-pink-500 mr-2" />
              <span>Pink</span>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Sidebar Position</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setSidebarPosition('left')}>
          Left Side
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSidebarPosition('right')}>
          Right Side
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSidebarPosition('top')}>
          Top Side
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSidebarPosition('bottom')}>
          Bottom Side
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
