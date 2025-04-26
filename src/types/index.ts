
export type AudienceLevel = 'Beginner' | 'Intermediate' | 'Expert';
export type Mode = 'Explain' | 'Presentation';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  feedback?: Feedback;
}

export interface Feedback {
  // presentation mode
  summary?:              string;
  clarity?:              string;
  pacing?:               string;
  structureSuggestions?: string;
  deliveryTips?:         string;
  rephrasingSuggestions?: {
    original: string;
    suggested: string;
  }[];
  // both modes
  questions?:            string[];
  // explain mode only
  gaps?:                 string;
  clarificationTip?:     string;
}


export interface SessionSettings {
  audienceLevel: AudienceLevel;
  mode: Mode;
}

export interface AudioAnalysisResult {
  transcript: string;
  summary:    string;
  feedback:   Feedback;
}
