
import { MessageSquare, Trash2 } from 'lucide-react';
import React from 'react';

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

interface ChatHistoryListProps {
  chatSessions: ChatSession[];
  loadingChats: boolean;
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onDeleteChat: (chatId: string, e: React.MouseEvent) => void;
  collapsed: boolean;
}

export const ChatHistoryList = ({
  chatSessions,
  loadingChats,
  currentChatId,
  onChatSelect,
  onDeleteChat,
  collapsed
}: ChatHistoryListProps) => {
  if (collapsed) {
    return (
      <div className="mb-4 flex flex-col items-center">
        <MessageSquare className="h-5 w-5 mb-1 text-gray-300" />
        {chatSessions.slice(0, 3).map((chat) => (
          <button
            key={chat.id}
            onClick={() => onChatSelect(chat.id)}
            title={chat.title}
            className={`w-8 h-8 mb-1 flex items-center justify-center rounded-md ${
              currentChatId === chat.id
                ? 'bg-ailearn-purple text-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {chat.title.charAt(0)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
        <MessageSquare className="h-4 w-4 mr-2" />
        Chat History
      </h2>
      {loadingChats ? (
        <div className="text-center py-4">
          <div className="animate-pulse text-gray-400">Loading chats...</div>
        </div>
      ) : chatSessions.length === 0 ? (
        <div className="text-gray-400 text-sm py-2 text-center">No chat history yet</div>
      ) : (
        <div className="space-y-1">
          {chatSessions.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                currentChatId === chat.id
                  ? 'bg-ailearn-purple/80'
                  : 'hover:bg-gray-700'
              }`}
            >
              <div className="truncate flex-1">
                <div className="font-medium truncate">{chat.title}</div>
                <div className="text-xs text-gray-400 truncate">
                  {chat.preview}
                </div>
              </div>
              <button
                onClick={(e) => onDeleteChat(chat.id, e)}
                className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-gray-600 ml-2"
                title="Delete chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
