// Update your types/index.ts file with these changes:

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  timestamp: number;
  isRead?: boolean; // NEW: Added for message notifications
}

export interface Post {
  id: string;
  text: string;
  emotionTag: EmotionType;
  timestamp: number;
  likes: number;
  userId: string;
  openForChat: boolean;
  isDeleted?: boolean;
}

export interface MoodEntry {
  id: string;
  mood: EmotionType;
  intensity: number;
  timestamp: number;
  userId: string;
  notes?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  postId: string;
}

export type EmotionType = 'sad' | 'angry' | 'anxious' | 'guilty' | 'happy' | 'empty';

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    text: string;
    card: string;
    primary: string;
    secondary: string;
    accent: string;
    border: string;
  };
}

export interface GameCategory {
  id: string;
  title: string;
  description: string;
  games: Game[];
}

export interface Game {
  id: string;
  title: string;
  description: string;
  type: 'breathing' | 'meditation' | 'mindfulness' | 'anxiety';
}