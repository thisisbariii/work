import { EmotionType } from '@/types';

export const emotionColors = {
  sad: '#6366F1',
  angry: '#EF4444',
  anxious: '#F59E0B',
  guilty: '#8B5CF6',
  happy: '#10B981',
  empty: '#6B7280',
};

export const emotionEmojis = {
  sad: '😢',
  angry: '😠',
  anxious: '😰',
  guilty: '😔',
  happy: '😊',
  empty: '😶',
};

export const emotionLabels = {
  sad: 'Sad',
  angry: 'Angry',
  anxious: 'Anxious',
  guilty: 'Guilty',
  happy: 'Happy',
  empty: 'Empty',
};

export const motivationalQuotes = [
  "You're stronger than you know 💪",
  "This feeling is temporary, you are permanent 🌟",
  "Your story isn't over yet 📖",
  "You matter more than you realize 💙",
  "Every storm runs out of rain ⛈️",
  "You're doing better than you think 🌱",
  "Your feelings are valid and important ✨",
  "Take it one breath at a time 🫁",
  "You've survived 100% of your difficult days 📈",
  "Healing isn't linear, and that's okay 🌀",
  "You're worthy of love and happiness 💝",
  "Progress, not perfection 🎯",
  "Your mental health matters 🧠",
  "You're not alone in this journey 🤝",
  "Small steps still count as progress 👣",
  "You're allowed to feel whatever you're feeling 🎭",
  "Tomorrow is a new opportunity 🌅",
  "Your courage inspires others 🦁",
  "Rest is productive too 😴",
  "You're exactly where you need to be 🗺️",
];

export const getRandomMotivationalQuote = (): string => {
  return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
};