
import { useState } from 'react';
import { Menu, Plus, User, Presentation, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { AudienceLevel, Mode } from '../types';

interface SidebarProps {
  audienceLevel: AudienceLevel;
  mode: Mode;
  onAudienceLevelChange: (level: AudienceLevel) => void;
  onModeChange: (mode: Mode) => void;
  onNewSession: () => void;
}

const Sidebar = ({
  audienceLevel,
  mode,
  onAudienceLevelChange,
  onModeChange,
  onNewSession,
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebar = (
    <div
      className={`bg-ailearn-darkblue text-white flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      } transition-all duration-300 ease-in-out h-full`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!collapsed && <h1 className="text-xl font-bold">AI Reverse Learning</h1>}
        
        <button
          onClick={toggleSidebar}
          className="ml-auto p-2 rounded-full hover:bg-gray-700 lg:flex hidden"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
        
        <button
          onClick={toggleMobileSidebar}
          className="ml-auto p-2 rounded-full hover:bg-gray-700 lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto">
        <div className="p-4">
          <button
            onClick={onNewSession}
            className={`w-full mb-4 flex items-center justify-${
              collapsed ? 'center' : 'start'
            } gap-2 bg-ailearn-lightpurple hover:bg-ailearn-purple text-white p-2 rounded-md transition-colors`}
          >
            <Plus className="h-5 w-5" />
            {!collapsed && <span>New Session</span>}
          </button>

          {!collapsed && (
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Audience Level</label>
              <div className="space-y-2">
                {(['Beginner', 'Intermediate', 'Expert'] as AudienceLevel[]).map((level) => (
                  <button
                    key={level}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      audienceLevel === level
                        ? 'bg-ailearn-purple text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => onAudienceLevelChange(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {collapsed && (
            <div className="mb-4 flex flex-col items-center">
              <span className="text-xs text-gray-400 mb-2">Level</span>
              {(['B', 'I', 'E'] as string[]).map((level, index) => {
                const fullLevel = ['Beginner', 'Intermediate', 'Expert'][
                  index
                ] as AudienceLevel;
                return (
                  <button
                    key={level}
                    title={fullLevel}
                    className={`w-10 h-10 mb-1 flex items-center justify-center rounded-md ${
                      audienceLevel === fullLevel
                        ? 'bg-ailearn-purple text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => onAudienceLevelChange(fullLevel)}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          )}

          <div className={`mb-4 ${collapsed ? 'flex flex-col items-center' : ''}`}>
            {!collapsed && <label className="block text-sm text-gray-300 mb-2">Mode</label>}
            {collapsed && <span className="text-xs text-gray-400 mb-2">Mode</span>}
            
            <div className={`${collapsed ? 'space-y-1' : 'flex space-x-2'}`}>
              <button
                className={`${
                  collapsed ? 'w-10 h-10' : 'flex-1'
                } flex items-center justify-center p-2 rounded-md ${
                  mode === 'Explain'
                    ? 'bg-ailearn-purple text-white'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => onModeChange('Explain')}
                title="Explain Mode"
              >
                <BookOpen className="h-5 w-5" />
                {!collapsed && <span className="ml-2">Explain</span>}
              </button>
              
              <button
                className={`${
                  collapsed ? 'w-10 h-10' : 'flex-1'
                } flex items-center justify-center p-2 rounded-md ${
                  mode === 'Presentation'
                    ? 'bg-ailearn-purple text-white'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => onModeChange('Presentation')}
                title="Presentation Mode"
              >
                <Presentation className="h-5 w-5" />
                {!collapsed && <span className="ml-2">Present</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <button
          className={`w-full flex items-center ${
            collapsed ? 'justify-center' : 'justify-start space-x-2'
          } hover:bg-gray-700 p-2 rounded-md`}
        >
          <User className="h-5 w-5" />
          {!collapsed && <span>Profile</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`lg:flex hidden h-screen ${
          collapsed ? 'w-16' : 'w-64'
        } transition-all duration-300 ease-in-out`}
      >
        {sidebar}
      </div>

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Mobile menu button */}
      <button
        onClick={toggleMobileSidebar}
        className={`lg:hidden fixed top-4 left-4 z-30 p-2 rounded-md bg-ailearn-darkblue text-white hover:bg-gray-700`}
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  );
};

export default Sidebar;
