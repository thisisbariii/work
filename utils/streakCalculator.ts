import { MoodEntry, Post } from '@/types';

export class StreakCalculator {
  static calculateMoodStreak(entries: MoodEntry[]): number {
    if (entries.length === 0) return 0;

    const sortedEntries = entries.sort((a, b) => b.timestamp - a.timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (entryDate.getTime() < currentDate.getTime() - 86400000) {
        // More than 1 day gap, break streak
        break;
      }
    }
    
    return streak;
  }

  static calculatePostStreak(posts: Post[]): number {
    if (posts.length === 0) return 0;

    const sortedPosts = posts.sort((a, b) => b.timestamp - a.timestamp);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (const post of sortedPosts) {
      const postDate = new Date(post.timestamp);
      postDate.setHours(0, 0, 0, 0);
      
      if (postDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (postDate.getTime() < currentDate.getTime() - 86400000) {
        break;
      }
    }
    
    return streak;
  }

  static getStreakMessage(streak: number): string {
    if (streak === 0) return "Start your journey today! 🌱";
    if (streak === 1) return "Great start! Keep it up! 🎯";
    if (streak < 7) return `${streak} days strong! 💪`;
    if (streak < 30) return `${streak} days! You're building great habits! 🔥`;
    return `${streak} days! You're incredible! 🌟`;
  }
}