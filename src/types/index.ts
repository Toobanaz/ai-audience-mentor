
export type AudienceLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type Mode = 'Explain' | 'Presentation';

export type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  feedback?: Feedback;
};

export type Feedback = {
  id: string;
  summary?: string;
  type: 'positive' | 'negative' | 'neutral';
  clarity?: string;
  pacing?: string;
  structureSuggestions?: string[];
  deliveryTips?: string[];
  rephrasingSuggestions?: {
    original: string;
    suggested: string;
  }[];
  // both modes
  questions?:            string[];
  // explain mode only
  gaps?:                 string;
  clarificationTip?:     string;
};

export interface SidebarProps {
  audienceLevel: AudienceLevel;
  mode: Mode;
  onAudienceLevelChange: (level: AudienceLevel) => void;
  onModeChange: (mode: Mode) => void;
  onNewSession: () => void;
  onChatSelect: (chatId: string) => void;
  currentChatId?: string;
}
