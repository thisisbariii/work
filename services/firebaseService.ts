import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  where,
  onSnapshot,
  increment,
  Timestamp,
  writeBatch,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '@/config/firebase';
import { Post, MoodEntry, Chat, ChatMessage, EmotionType } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAuthenticated, getCurrentUserId } from '@/utils/anonymousAuth';

const OFFLINE_POSTS_KEY = 'offline_posts';
const OFFLINE_MOODS_KEY = 'offline_moods';
const LIKED_POSTS_KEY = 'liked_posts';
const getUserPostsKey = (userId: string) => `user_posts_${userId}`;
const CURRENT_USER_ID_KEY = 'current_user_id_cache';

// Interface for participated chats
interface ParticipatedChat {
  id: string;
  postId: string;
  postText: string;
  postOwnerId: string;
  emotionTag: EmotionType;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

export class FirebaseService {
  private static async getConsistentUserId(): Promise<string> {
    try {
      const cachedUserId = await AsyncStorage.getItem(CURRENT_USER_ID_KEY);
      const currentUserId = await getCurrentUserId();
      
      if (cachedUserId && cachedUserId !== currentUserId) {
        // Handle user ID change if needed
      }
      
      await AsyncStorage.setItem(CURRENT_USER_ID_KEY, currentUserId);
      return currentUserId;
    } catch (error) {
      return await getCurrentUserId();
    }
  }

  static async testAuth(): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      const firebaseUser = auth.currentUser;
      
      const testQuery = query(
        collection(db, 'posts'),
        limit(1)
      );
      
      const snapshot = await getDocs(testQuery);
    } catch (error) {
      throw error;
    }
  }

  static async createPost(text: string, emotionTag: EmotionType, openForChat: boolean): Promise<string> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const post: Omit<Post, 'id'> = {
        text,
        emotionTag,
        timestamp: Date.now(),
        likes: 0,
        userId,
        openForChat,
        isDeleted: false,
      };

      const docRef = await addDoc(collection(db, 'posts'), {
        ...post,
        timestamp: Timestamp.fromDate(new Date()),
      });

      const fullPost: Post = { ...post, id: docRef.id };
      await this.cachePostLocally(fullPost);
      await this.cacheUserPost(fullPost, userId);
      
      return docRef.id;
    } catch (error) {
      await this.storeOfflinePost(text, emotionTag, openForChat);
      throw error;
    }
  }

  static async getPosts(lastDoc?: any): Promise<Post[]> {
    try {
      let q = query(
        collection(db, 'posts'),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(q, where('timestamp', '<', lastDoc));
      }

      const snapshot = await getDocs(q);
      const posts: Post[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toMillis() || Date.now(),
      } as Post));

      await this.cachePosts(posts);
      return posts;
    } catch (error) {
      return await this.getCachedPosts();
    }
  }

  static async deletePost(postId: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { 
        isDeleted: true,
        deletedAt: Timestamp.now(),
        deletedBy: userId
      });

      await this.removePostFromCache(postId);
      await this.removeUserPostFromCache(postId, userId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete mood entry associated with a post
   * Since mood entries don't have a direct postId reference, we match by:
   * - userId (same user)
   * - mood matches post's emotionTag
   * - timestamp is close to post's timestamp (within 5 minutes)
   */
  static async deleteMoodEntryByPost(
    postId: string, 
    userId: string, 
    emotionTag: EmotionType, 
    postTimestamp: number
  ): Promise<void> {
    try {
      await ensureAuthenticated();
      
      console.log('🗑️ Deleting mood entry for post:', { postId, userId, emotionTag, postTimestamp });
      
      // Define a time window (5 minutes before and after the post)
      const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
      const startTime = postTimestamp - timeWindow;
      const endTime = postTimestamp + timeWindow;
      
      // Query for mood entries that match the criteria
      const moodEntriesRef = collection(db, 'moodEntries');
      
      // First, get all mood entries for this user with matching emotion
      const userMoodQuery = query(
        moodEntriesRef,
        where('userId', '==', userId),
        where('mood', '==', emotionTag),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(userMoodQuery);
      
      if (querySnapshot.empty) {
        console.log('📭 No mood entries found for user with matching emotion');
        return;
      }
      
      // Filter by timestamp on the client side to find entries within the time window
      const matchingEntries = querySnapshot.docs.filter(doc => {
        const moodData = doc.data();
        const moodTimestamp = moodData.timestamp?.toMillis() || moodData.timestamp;
        
        // Check if the mood entry timestamp is within our time window
        return moodTimestamp >= startTime && moodTimestamp <= endTime;
      });
      
      if (matchingEntries.length === 0) {
        console.log('📭 No mood entries found within the time window');
        return;
      }
      
      // Delete all matching mood entries (there should typically be just one)
      console.log(`🗑️ Found ${matchingEntries.length} matching mood entries to delete`);
      
      const deletePromises = matchingEntries.map(async (doc) => {
        const moodData = doc.data();
        console.log('🗑️ Deleting mood entry:', {
          id: doc.id,
          mood: moodData.mood,
          timestamp: moodData.timestamp?.toMillis() || moodData.timestamp
        });
        
        return deleteDoc(doc.ref);
      });
      
      await Promise.all(deletePromises);
      
      // Also remove from local cache
      await this.removeMoodFromCache(matchingEntries.map(doc => doc.id));
      
      console.log('✅ Successfully deleted mood entries associated with post');
      
    } catch (error) {
      console.error('❌ Error deleting mood entry by post:', error);
throw new Error(`Failed to delete associated mood entry: ${(error as Error).message || 'Unknown error'}`);    }
  }

  static async getUserPosts(): Promise<Post[]> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      try {
        const q = query(
          collection(db, 'posts'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(q);
        
        const allPosts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toMillis() || Date.now(),
        })) as Post[];
        
        const posts = allPosts.filter(post => !post.isDeleted);
        
        await this.cacheUserPosts(posts, userId);
        return posts;
      } catch (firebaseError) {
        console.error('❌ Firebase getUserPosts failed:', firebaseError);
        const cachedPosts = await this.getCachedUserPosts(userId);
        return cachedPosts;
      }
    } catch (error) {
      try {
        const userId = await this.getConsistentUserId();
        return await this.getCachedUserPosts(userId);
      } catch {
        return [];
      }
    }
  }

  static async likePost(postId: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const likeRef = doc(db, 'posts', postId, 'likes', userId);
      const likeDoc = await getDoc(likeRef);
      
      if (likeDoc.exists()) {
        await this.cacheLike(postId);
        return;
      }
      
      const likedPosts = await this.getLikedPosts();
      if (likedPosts.includes(postId)) {
        return;
      }

      const postRef = doc(db, 'posts', postId);
      
      const batch = writeBatch(db);
      batch.set(likeRef, { userId, timestamp: Timestamp.now() });
      batch.update(postRef, { likes: increment(1) });
      
      await batch.commit();
      await this.cacheLike(postId);
    } catch (error) {
      throw error;
    }
  }

  static async unlikePost(postId: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const likeRef = doc(db, 'posts', postId, 'likes', userId);
      const likeDoc = await getDoc(likeRef);
      
      if (!likeDoc.exists()) {
        return;
      }
      
      const postRef = doc(db, 'posts', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        return;
      }
      
      try {
        await deleteDoc(likeRef);
      } catch (error) {
        throw error;
      }
      
      try {
        await updateDoc(postRef, { likes: increment(-1) });
      } catch (error: any) {
        try {
          await setDoc(likeRef, { userId, timestamp: Timestamp.now() });
        } catch (revertError) {
          // Silent fail
        }
        throw error;
      }
      
      await this.removeLikeFromCache(postId);
    } catch (error: any) {
      throw error;
    }
  }

  static async addMoodEntry(mood: EmotionType, intensity: number, notes?: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const moodEntry: Omit<MoodEntry, 'id'> = {
        mood,
        intensity,
        timestamp: Date.now(),
        userId,
        notes,
      };

      await addDoc(collection(db, 'moodEntries'), {
        ...moodEntry,
        timestamp: Timestamp.fromDate(new Date()),
      });

      await this.cacheMoodLocally({ ...moodEntry, id: `local_${Date.now()}` });
    } catch (error) {
      await this.storeOfflineMood(mood, intensity, notes);
      throw error;
    }
  }

  static async getMoodEntries(userId?: string): Promise<MoodEntry[]> {
    try {
      await ensureAuthenticated();
      const finalUserId = userId || await this.getConsistentUserId();
      
      try {
        const testQuery = query(
          collection(db, 'moodEntries'),
          limit(1)
        );
        await getDocs(testQuery);
      } catch (permissionError) {
        return await this.getCachedMoods();
      }
      
      const q = query(
        collection(db, 'moodEntries'),
        where('userId', '==', finalUserId),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const moods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toMillis() || Date.now(),
      })) as MoodEntry[];
      
      await this.cacheMoods(moods);
      return moods;
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        return await this.getCachedMoods();
      }
      
      return await this.getCachedMoods();
    }
  }

  static async createChat(postId: string, receiverId: string): Promise<string> {
    try {
      await ensureAuthenticated();
      const initiatorId = await this.getConsistentUserId();
      
      const chatData: Omit<Chat, 'id'> = {
        participants: [initiatorId, receiverId],
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        isActive: true,
        postId,
      };

      const docRef = await addDoc(collection(db, 'posts', postId, 'chats'), {
        ...chatData,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(new Date(chatData.expiresAt)),
      });

      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  static async sendMessage(postId: string, chatId: string, message: ChatMessage): Promise<void> {
    try {
      await ensureAuthenticated();
      
      if (!message.fromUserId || !message.toUserId || !message.text) {
        throw new Error('Invalid message data: missing required fields');
      }

      const messageData = {
        fromUserId: message.fromUserId,
        toUserId: message.toUserId,
        text: message.text,
        timestamp: Timestamp.fromDate(new Date(message.timestamp)),
        isRead: false,
      };

      await addDoc(collection(db, 'posts', postId, 'chats', chatId, 'messages'), messageData);

      try {
        const postDoc = await getDoc(doc(db, 'posts', postId));
        const postText = postDoc.exists() ? postDoc.data()?.text : undefined;

        const { NotificationService } = await import('@/services/notificationService');
        
        await NotificationService.sendMessageNotification(
          message.toUserId,
          message.fromUserId,
          postId,
          chatId,
          message.text,
          postText
        );
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
      
    } catch (error) {
      throw error;
    }
  }

  static async getChatMessages(postId: string, chatId: string): Promise<ChatMessage[]> {
    try {
      await ensureAuthenticated();
      
      const messagesQuery = query(
        collection(db, 'posts', postId, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(messagesQuery);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toMillis() || Date.now(),
      })) as ChatMessage[];
      
      return messages;
    } catch (error) {
      return [];
    }
  }

  static async findExistingChat(postId: string, userId1: string, userId2: string): Promise<string | null> {
    try {
      await ensureAuthenticated();
      
      const chatsQuery = query(
        collection(db, 'posts', postId, 'chats'),
        where('participants', 'array-contains', userId1)
      );

      const snapshot = await getDocs(chatsQuery);
      
      for (const doc of snapshot.docs) {
        const chatData = doc.data();
        if (chatData.participants && 
            chatData.participants.includes(userId1) && 
            chatData.participants.includes(userId2)) {
          return doc.id;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  static async hasUserLikedPost(postId: string): Promise<boolean> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const likeRef = doc(db, 'posts', postId, 'likes', userId);
      const likeDoc = await getDoc(likeRef);
      
      if (likeDoc.exists()) {
        await this.cacheLike(postId);
        return true;
      }
      
      const likedPosts = await this.getLikedPosts();
      return likedPosts.includes(postId);
    } catch (error) {
      const likedPosts = await this.getLikedPosts();
      return likedPosts.includes(postId);
    }
  }

  static async getUnreadMessageCount(postId: string): Promise<number> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const chatsQuery = query(collection(db, 'posts', postId, 'chats'));
      const chatsSnapshot = await getDocs(chatsQuery);
      
      let totalUnreadCount = 0;
      
      for (const chatDoc of chatsSnapshot.docs) {
        const messagesQuery = query(
          collection(db, 'posts', postId, 'chats', chatDoc.id, 'messages'),
          where('toUserId', '==', userId),
          where('isRead', '==', false)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        totalUnreadCount += messagesSnapshot.docs.length;
      }
      
      return totalUnreadCount;
    } catch (error) {
      return 0;
    }
  }

  static async getTotalUnreadMessageCount(): Promise<number> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      let totalUnread = 0;
      
      // 1. Get unread messages from posts user owns
      const userPostsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', userId)
      );
      
      const postsSnapshot = await getDocs(userPostsQuery);
      
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        if (postData.isDeleted) continue;
        
        const unreadCount = await this.getUnreadMessageCount(postDoc.id);
        totalUnread += unreadCount;
      }
      
      // 2. Get unread messages from chats user participated in
      const participatedChats = await this.getUserParticipatedChats();
      const participatedUnread = participatedChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      totalUnread += participatedUnread;
      
      console.log('📊 Total unread messages:', totalUnread);
      
      return totalUnread;
    } catch (error) {
      console.error('❌ Failed to get total unread count:', error);
      return 0;
    }
  }

  static async getUserParticipatedChats(): Promise<ParticipatedChat[]> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      console.log('🔄 Loading participated chats for user:', userId);
      
      const allPostsQuery = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const postsSnapshot = await getDocs(allPostsQuery);
      const participatedChats: ParticipatedChat[] = [];
      
      // Process each post
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        const postId = postDoc.id;
        
        // Skip deleted posts
        if (postData.isDeleted) continue;
        
        // Skip posts owned by current user
        if (postData.userId === userId) continue;
        
        try {
          // Check for chats where user participated
          const chatsQuery = query(
            collection(db, 'posts', postId, 'chats'),
            where('participants', 'array-contains', userId)
          );
          
          const chatsSnapshot = await getDocs(chatsQuery);
          
          for (const chatDoc of chatsSnapshot.docs) {
            const chatId = chatDoc.id;
            
            // Get unread count
            const unreadQuery = query(
              collection(db, 'posts', postId, 'chats', chatId, 'messages'),
              where('toUserId', '==', userId),
              where('isRead', '==', false)
            );
            
            const unreadSnapshot = await getDocs(unreadQuery);
            const unreadCount = unreadSnapshot.docs.length;
            
            // Get last message
            let lastMessage = '';
            let lastMessageTime = 0;
            
            try {
              const lastMsgQuery = query(
                collection(db, 'posts', postId, 'chats', chatId, 'messages'),
                orderBy('timestamp', 'desc'),
                limit(1)
              );
              
              const lastMsgSnapshot = await getDocs(lastMsgQuery);
              if (!lastMsgSnapshot.empty) {
                const msgData = lastMsgSnapshot.docs[0].data();
                lastMessage = msgData.text || '';
                lastMessageTime = msgData.timestamp?.toMillis() || 0;
              }
            } catch (msgError) {
              // Continue without last message
            }
            
            participatedChats.push({
              id: chatId,
              postId: postId,
              postText: postData.text || '',
              postOwnerId: postData.userId || '',
              emotionTag: (postData.emotionTag as EmotionType) || 'happy',
              unreadCount: unreadCount,
              lastMessage: lastMessage,
              lastMessageTime: lastMessageTime
            });
          }
        } catch (chatError) {
          console.error(`❌ Error loading chats for post ${postId}:`, chatError);
          // Continue to next post
        }
      }
      
      // Sort by most recent activity
      participatedChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
      
      console.log('✅ Participated chats loaded:', participatedChats.length);
      return participatedChats;
      
    } catch (error) {
      console.error('❌ Failed to load participated chats:', error);
      return [];
    }
  }

  static async markMessagesAsRead(postId: string, chatId: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const messagesQuery = query(
        collection(db, 'posts', postId, 'chats', chatId, 'messages'),
        where('toUserId', '==', userId),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(messagesQuery);
      
      if (snapshot.docs.length === 0) {
        return;
      }
      
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((messageDoc) => {
        batch.update(messageDoc.ref, { isRead: true });
      });
      
      await batch.commit();

      try {
        const { NotificationService } = await import('@/services/notificationService');
        await NotificationService.updateBadgeCount();
      } catch (error) {
        // Silent fail
      }
      
    } catch (error) {
      throw error;
    }
  }

  static async getUnreadMessageCountsForPosts(postIds: string[]): Promise<{ [postId: string]: number }> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const results: { [postId: string]: number } = {};
      
      const batchSize = 5;
      for (let i = 0; i < postIds.length; i += batchSize) {
        const batch = postIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (postId) => {
          try {
            const count = await this.getUnreadMessageCount(postId);
            return { postId, count };
          } catch (error) {
            return { postId, count: 0 };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ postId, count }) => {
          results[postId] = count;
        });
      }
      
      return results;
    } catch (error) {
      return {};
    }
  }

  static async recordAdWatch(gameType: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const progressRef = doc(db, 'gameProgress', userId);
      await setDoc(progressRef, {
        userId,
        adsWatched: increment(1),
        lastAdWatch: Timestamp.now(),
        lastGameType: gameType,
      }, { merge: true });
    } catch (error) {
      throw error;
    }
  }

  static async getGameProgress(): Promise<{ adsWatched: number; lastAdWatch: number | null }> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      const progressRef = doc(db, 'gameProgress', userId);
      const progressDoc = await getDoc(progressRef);
      
      if (!progressDoc.exists()) {
        return { adsWatched: 0, lastAdWatch: null };
      }
      
      const data = progressDoc.data();
      return {
        adsWatched: data.adsWatched || 0,
        lastAdWatch: data.lastAdWatch?.toMillis() || null,
      };
    } catch (error) {
      return { adsWatched: 0, lastAdWatch: null };
    }
  }

  static async syncOfflineData(): Promise<void> {
    try {
      const offlineQueue = await AsyncStorage.getItem('offline_queue') || '[]';
      const queue = JSON.parse(offlineQueue);
      
      if (queue.length === 0) {
        return;
      }
      
      for (const item of queue) {
        try {
          if (item.type === 'post') {
            await this.createPost(item.data.text, item.data.emotionTag, item.data.openForChat);
          } else if (item.type === 'mood') {
            await this.addMoodEntry(item.data.mood, item.data.intensity, item.data.notes);
          }
        } catch (error) {
          // Continue with other items
        }
      }
      
      await AsyncStorage.removeItem('offline_queue');
    } catch (error) {
      // Silent fail
    }
  }

  static async debugCacheState(): Promise<void> {
    try {
      const userId = await this.getConsistentUserId();
      const cachedUserId = await AsyncStorage.getItem(CURRENT_USER_ID_KEY);
      
      const userPostsKey = getUserPostsKey(userId);
      
      const userPostsCache = await AsyncStorage.getItem(userPostsKey);
      const generalPostsCache = await AsyncStorage.getItem(OFFLINE_POSTS_KEY);
      
      if (generalPostsCache) {
        const allPosts = JSON.parse(generalPostsCache);
        const userPostsInGeneral = allPosts.filter((p: Post) => p.userId === userId);
      }
    } catch (error) {
      // Silent fail
    }
  }

  static async clearAllCaches(): Promise<void> {
    try {
      const userId = await this.getConsistentUserId();
      const userPostsKey = getUserPostsKey(userId);
      
      await AsyncStorage.multiRemove([
        OFFLINE_POSTS_KEY,
        OFFLINE_MOODS_KEY,
        LIKED_POSTS_KEY,
        userPostsKey,
        CURRENT_USER_ID_KEY
      ]);
    } catch (error) {
      // Silent fail
    }
  }

  // Private cache methods
  private static async cachePostLocally(post: Post): Promise<void> {
    try {
      const cachedPosts = await this.getCachedPosts();
      const existingIndex = cachedPosts.findIndex(p => p.id === post.id);
      
      if (existingIndex >= 0) {
        cachedPosts[existingIndex] = post;
      } else {
        cachedPosts.unshift(post);
      }
      
      await AsyncStorage.setItem(OFFLINE_POSTS_KEY, JSON.stringify(cachedPosts.slice(0, 50)));
    } catch (error) {
      // Silent fail
    }
  }

  private static async cacheUserPost(post: Post, userId?: string): Promise<void> {
    try {
      const finalUserId = userId || await this.getConsistentUserId();
      if (post.userId !== finalUserId) return;

      const userPostsKey = getUserPostsKey(finalUserId);
      const cachedUserPosts = await this.getCachedUserPosts(finalUserId);
      const existingIndex = cachedUserPosts.findIndex(p => p.id === post.id);
      
      if (existingIndex >= 0) {
        cachedUserPosts[existingIndex] = post;
      } else {
        cachedUserPosts.unshift(post);
      }
      
      await AsyncStorage.setItem(userPostsKey, JSON.stringify(cachedUserPosts));
    } catch (error) {
      // Silent fail
    }
  }

  private static async cacheUserPosts(posts: Post[], userId: string): Promise<void> {
    try {
      const userPostsKey = getUserPostsKey(userId);
      await AsyncStorage.setItem(userPostsKey, JSON.stringify(posts));
    } catch (error) {
      // Silent fail
    }
  }

  private static async cachePosts(posts: Post[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_POSTS_KEY, JSON.stringify(posts));
    } catch (error) {
      // Silent fail
    }
  }

  private static async getCachedPosts(): Promise<Post[]> {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_POSTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  public static async getCachedUserPosts(userId?: string): Promise<Post[]> {
    try {
      const finalUserId = userId || await this.getConsistentUserId();
      
      const userPostsKey = getUserPostsKey(finalUserId);
      const userCached = await AsyncStorage.getItem(userPostsKey);
      if (userCached) {
        const posts = JSON.parse(userCached);
        return posts;
      }

      const generalCachedPosts = await this.getCachedPosts();
      const filteredPosts = generalCachedPosts.filter(post => post.userId === finalUserId);
      
      if (filteredPosts.length > 0) {
        await AsyncStorage.setItem(userPostsKey, JSON.stringify(filteredPosts));
      }
      
      return filteredPosts;
    } catch (error) {
      return [];
    }
  }

  private static async removePostFromCache(postId: string): Promise<void> {
    try {
      const cachedPosts = await this.getCachedPosts();
      const updatedPosts = cachedPosts.filter(post => post.id !== postId);
      await AsyncStorage.setItem(OFFLINE_POSTS_KEY, JSON.stringify(updatedPosts));
    } catch (error) {
      // Silent fail
    }
  }

  private static async removeUserPostFromCache(postId: string, userId?: string): Promise<void> {
    try {
      const finalUserId = userId || await this.getConsistentUserId();
      const userPostsKey = getUserPostsKey(finalUserId);
      const cachedUserPosts = await this.getCachedUserPosts(finalUserId);
      const updatedUserPosts = cachedUserPosts.filter(post => post.id !== postId);
      await AsyncStorage.setItem(userPostsKey, JSON.stringify(updatedUserPosts));
    } catch (error) {
      // Silent fail
    }
  }

  private static async cacheMoodLocally(mood: MoodEntry): Promise<void> {
    try {
      const cachedMoods = await this.getCachedMoods();
      const existingIndex = cachedMoods.findIndex(m => m.id === mood.id);
      
      if (existingIndex >= 0) {
        cachedMoods[existingIndex] = mood;
      } else {
        cachedMoods.unshift(mood);
      }
      
      await AsyncStorage.setItem(OFFLINE_MOODS_KEY, JSON.stringify(cachedMoods.slice(0, 100)));
    } catch (error) {
      // Silent fail
    }
  }

  private static async cacheMoods(moods: MoodEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_MOODS_KEY, JSON.stringify(moods));
    } catch (error) {
      // Silent fail
    }
  }

  private static async getCachedMoods(): Promise<MoodEntry[]> {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_MOODS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Remove mood entries from local cache
   */
  private static async removeMoodFromCache(moodEntryIds: string[]): Promise<void> {
    try {
      const cachedMoods = await this.getCachedMoods();
      const updatedMoods = cachedMoods.filter(mood => !moodEntryIds.includes(mood.id));
      await AsyncStorage.setItem(OFFLINE_MOODS_KEY, JSON.stringify(updatedMoods));
      
      console.log('🗑️ Removed mood entries from cache:', moodEntryIds);
    } catch (error) {
      console.error('❌ Error removing mood from cache:', error);
      // Silent fail - cache removal is not critical
    }
  }

  private static async getLikedPosts(): Promise<string[]> {
    try {
      const cached = await AsyncStorage.getItem(LIKED_POSTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      return [];
    }
  }

  private static async cacheLike(postId: string): Promise<void> {
    try {
      const likedPosts = await this.getLikedPosts();
      if (!likedPosts.includes(postId)) {
        likedPosts.push(postId);
        await AsyncStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(likedPosts));
      }
    } catch (error) {
      // Silent fail
    }
  }

  private static async removeLikeFromCache(postId: string): Promise<void> {
    try {
      const likedPosts = await this.getLikedPosts();
      const updatedLikes = likedPosts.filter(id => id !== postId);
      await AsyncStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(updatedLikes));
    } catch (error) {
      // Silent fail
    }
  }

  private static async storeOfflinePost(text: string, emotionTag: EmotionType, openForChat: boolean): Promise<void> {
    try {
      const offlineQueue = await AsyncStorage.getItem('offline_queue') || '[]';
      const queue = JSON.parse(offlineQueue);
      queue.push({
        type: 'post',
        data: { text, emotionTag, openForChat },
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
    } catch (error) {
      // Silent fail
    }
  }

  private static async storeOfflineMood(mood: EmotionType, intensity: number, notes?: string): Promise<void> {
    try {
      const offlineQueue = await AsyncStorage.getItem('offline_queue') || '[]';
      const queue = JSON.parse(offlineQueue);
      queue.push({
        type: 'mood',
        data: { mood, intensity, notes },
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
    } catch (error) {
      // Silent fail
    }
  }
}