




// First, update your types/index.ts file:

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  timestamp: number;
  isRead?: boolean;
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
  location?: {
    city: string;
    state: string;
    country: string;
  };
  isLocal?: boolean;
  // ✅ ADD THIS LINE TO FIX THE TYPESCRIPT ERRORS
  locationPriority?: 'city' | 'state' | 'country' | 'global';
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

export type EmotionType = 'chaotic' | 'overthinking' | 'drained' | 'vibing' | 'frustrated' | 'contemplating' | 'excited' | 'nostalgic';