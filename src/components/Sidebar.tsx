
import { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { AudienceLevel, Mode, SidebarProps } from '../types';
import { ChatHistoryList } from './sidebar/ChatHistoryList';
import { ModeSelector } from './sidebar/ModeSelector';
import { AudienceLevelSelector } from './sidebar/AudienceLevelSelector';

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

const Sidebar = ({
  audienceLevel,
  mode,
  onAudienceLevelChange,
  onModeChange,
  onNewSession,
  onChatSelect,
  currentChatId,
}: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoadingChats(true);
        const response = await fetch('/chats');
        const data = await response.json();
        setChatSessions(data.chats);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setLoadingChats(false);
      }
    };

    fetchChats();
  }, []);

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/chats/${chatId}`, { method: 'DELETE' });
      setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        onNewSession();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

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

          <ChatHistoryList
            chatSessions={chatSessions}
            loadingChats={loadingChats}
            currentChatId={currentChatId}
            onChatSelect={onChatSelect}
            onDeleteChat={deleteChat}
            collapsed={collapsed}
          />

          {!collapsed && (
            <>
              <AudienceLevelSelector
                currentLevel={audienceLevel}
                onLevelChange={onAudienceLevelChange}
              />
              <ModeSelector
                currentMode={mode}
                onModeChange={onModeChange}
              />
            </>
          )}
        </div>
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

      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 transform ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleMobileSidebar}
        />
      )}
    </>
  );
};

export default Sidebar;
