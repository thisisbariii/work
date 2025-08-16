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
import * as Location from 'expo-location';

const USER_LOCATION_KEY = 'user_location_cache';
const OFFLINE_POSTS_KEY = 'offline_posts';
const OFFLINE_MOODS_KEY = 'offline_moods';
const LIKED_POSTS_KEY = 'liked_posts';
const getUserPostsKey = (userId: string) => `user_posts_${userId}`;
const CURRENT_USER_ID_KEY = 'current_user_id_cache';

interface UserLocation {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
}

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

interface LocationFilter {
  city?: string;
  state?: string;
  country?: string;
  limit: number;
  excludeIds?: string[];
}

export class FirebaseService {
  private static async getConsistentUserId(): Promise<string> {
    try {
      const cachedUserId = await AsyncStorage.getItem(CURRENT_USER_ID_KEY);
      const currentUserId = await getCurrentUserId();
      
      if (cachedUserId && cachedUserId !== currentUserId) {
        console.log('🔄 User ID changed, clearing caches');
        await this.clearAllCaches();
      }
      
      await AsyncStorage.setItem(CURRENT_USER_ID_KEY, currentUserId);
      return currentUserId;
    } catch (error) {
      console.error('❌ Error getting consistent user ID:', error);
      return await getCurrentUserId();
    }
  }

  static async testAuth(): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      console.log('🔐 Auth test - User ID:', userId);
      
      const testQuery = query(
        collection(db, 'posts'),
        where('isDeleted', '==', false),
        limit(1)
      );
      
      const snapshot = await getDocs(testQuery);
      console.log('🔐 Auth test - Can query posts:', !snapshot.empty);
    } catch (error) {
      console.error('❌ Auth test failed:', error);
      throw error;
    }
  }

  static async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Location permission status:', status);
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      return false;
    }
  }

  static async getCurrentLocation(): Promise<UserLocation | null> {
    try {
      const cachedLocation = await AsyncStorage.getItem(USER_LOCATION_KEY);
      if (cachedLocation) {
        const location: UserLocation = JSON.parse(cachedLocation);
        const isRecent = Date.now() - location.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          console.log('📍 Using cached location:', location.city);
          return location;
        }
      }

      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        console.log('📍 Location permission denied, using fallback');
        return null;
      }

      console.log('📍 Getting fresh location...');
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });

      const { latitude, longitude } = position.coords;
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        const userLocation: UserLocation = {
          city: location.city || 'Unknown City',
          state: location.region || location.subregion || 'Unknown State',
          country: location.country || 'Unknown Country',
          latitude,
          longitude,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem(USER_LOCATION_KEY, JSON.stringify(userLocation));
        console.log('📍 Fresh location detected:', userLocation);
        return userLocation;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting location:', error);
      return null;
    }
  }

  private static async getPostsByLocation(filter: LocationFilter): Promise<Post[]> {
    try {
      let baseQuery = query(
        collection(db, 'posts'),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc'),
        limit(filter.limit)
      );

      if (filter.city) {
        baseQuery = query(baseQuery, where('location.city', '==', filter.city));
      } else if (filter.state) {
        baseQuery = query(baseQuery, where('location.state', '==', filter.state));
      } else if (filter.country) {
        baseQuery = query(baseQuery, where('location.country', '==', filter.country));
      }

      const snapshot = await getDocs(baseQuery);
      
      const posts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toMillis() || Date.now(),
        } as Post))
        .filter(post => {
          return !filter.excludeIds?.includes(post.id);
        });

      return posts;
    } catch (error) {
      console.error(`❌ Error getting posts by location:`, error);
      return [];
    }
  }

  static async getSmartLocationFeed(lastDoc?: any, pageSize: number = 20): Promise<Post[]> {
    try {
      console.log('🎯 Getting smart location-based feed...');
      
      const userLocation = await this.getCurrentLocation();
      
      if (!userLocation) {
        console.log('📍 No location - using global feed');
        return await this.getPosts(lastDoc);
      }

      console.log(`📍 User location: ${userLocation.city}, ${userLocation.state}, ${userLocation.country}`);

      const allPosts: Post[] = [];
      const postIds = new Set<string>();

      const cityTarget = Math.floor(pageSize * 0.6);
      console.log(`🏙️ Getting up to ${cityTarget} posts from ${userLocation.city}...`);
      
      const cityPosts = await this.getPostsByLocation({
        city: userLocation.city,
        limit: cityTarget + 5,
      });

      cityPosts.slice(0, cityTarget).forEach(post => {
        if (!postIds.has(post.id)) {
          const postWithPriority: Post = { ...post, locationPriority: 'city' };
          allPosts.push(postWithPriority);
          postIds.add(post.id);
        }
      });

      console.log(`✅ Added ${allPosts.length} city posts`);

      const stateTarget = Math.floor(pageSize * 0.25);
      const stateNeeded = Math.max(0, stateTarget);
      
      if (stateNeeded > 0) {
        console.log(`🏛️ Getting up to ${stateNeeded} posts from ${userLocation.state}...`);
        
        const statePosts = await this.getPostsByLocation({
          state: userLocation.state,
          limit: stateNeeded + 5,
          excludeIds: Array.from(postIds),
        });

        statePosts.slice(0, stateNeeded).forEach(post => {
          if (!postIds.has(post.id)) {
            const postWithPriority: Post = { ...post, locationPriority: 'state' };
            allPosts.push(postWithPriority);
            postIds.add(post.id);
          }
        });

        console.log(`✅ Added ${allPosts.length - cityTarget} state posts`);
      }

      const countryTarget = Math.floor(pageSize * 0.1);
      const countryNeeded = Math.max(0, countryTarget);
      
      if (countryNeeded > 0 && allPosts.length < pageSize) {
        console.log(`🌍 Getting up to ${countryNeeded} posts from ${userLocation.country}...`);
        
        const countryPosts = await this.getPostsByLocation({
          country: userLocation.country,
          limit: countryNeeded + 3,
          excludeIds: Array.from(postIds),
        });

        countryPosts.slice(0, countryNeeded).forEach(post => {
          if (!postIds.has(post.id)) {
            const postWithPriority: Post = { ...post, locationPriority: 'country' };
            allPosts.push(postWithPriority);
            postIds.add(post.id);
          }
        });

        console.log(`✅ Added ${allPosts.length - cityTarget - stateNeeded} country posts`);
      }

      const globalNeeded = pageSize - allPosts.length;
      
      if (globalNeeded > 0) {
        console.log(`🌐 Getting ${globalNeeded} global posts to fill remaining slots...`);
        
        const globalPosts = await this.getGlobalPosts(globalNeeded + 5, Array.from(postIds));
        
        globalPosts.slice(0, globalNeeded).forEach(post => {
          if (!postIds.has(post.id)) {
            const postWithPriority: Post = { ...post, locationPriority: 'global' };
            allPosts.push(postWithPriority);
            postIds.add(post.id);
          }
        });

        console.log(`✅ Added ${allPosts.length - (pageSize - globalNeeded)} global posts`);
      }

      allPosts.sort((a, b) => {
        const priorityOrder: Record<string, number> = { 
          city: 1, 
          state: 2, 
          country: 3, 
          global: 4 
        };
        const aPriority = priorityOrder[a.locationPriority || 'global'];
        const bPriority = priorityOrder[b.locationPriority || 'global'];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return b.timestamp - a.timestamp;
      });

      await this.cachePosts(allPosts);

      console.log(`🎯 Smart feed complete: ${allPosts.length} posts`);
      console.log(`📊 Breakdown:`, {
        city: allPosts.filter(p => p.locationPriority === 'city').length,
        state: allPosts.filter(p => p.locationPriority === 'state').length,
        country: allPosts.filter(p => p.locationPriority === 'country').length,
        global: allPosts.filter(p => p.locationPriority === 'global').length,
      });

      return allPosts;

    } catch (error) {
      console.error('❌ Error getting smart location feed:', error);
      console.log('🔄 Falling back to regular posts');
      return await this.getPosts(lastDoc);
    }
  }

  private static async getGlobalPosts(limitCount: number, excludeIds: string[] = []): Promise<Post[]> {
    try {
      const globalQuery = query(
        collection(db, 'posts'),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc'),
        limit(limitCount + excludeIds.length)
      );

      const snapshot = await getDocs(globalQuery);
      
      return snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toMillis() || Date.now(),
        } as Post))
        .filter(post => !excludeIds.includes(post.id))
        .slice(0, limitCount);

    } catch (error) {
      console.error('❌ Error getting global posts:', error);
      return [];
    }
  }

  static async getPosts(lastDoc?: any): Promise<Post[]> {
    try {
      console.log('🔍 Getting regular posts...');
      
      let q = query(
        collection(db, 'posts'),
        where('isDeleted', '==', false),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      if (lastDoc) {
        q = query(q, where('timestamp', '<', lastDoc));
      }

      console.log('📡 Executing posts query...');
      const snapshot = await getDocs(q);
      
      console.log(`📊 Query returned ${snapshot.docs.length} documents`);
      
      const posts: Post[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now()),
        } as Post;
      });

      const validPosts = posts.filter(post => !post.isDeleted);
      console.log(`✅ Returning ${validPosts.length} valid posts`);

      await this.cachePosts(validPosts);
      return validPosts;
    } catch (error) {
      console.error('❌ Error getting posts from Firebase:', error);
      console.log('🔄 Falling back to cached posts');
      const cachedPosts = await this.getCachedPosts();
      console.log(`📱 Cached posts count: ${cachedPosts.length}`);
      return cachedPosts;
    }
  }

  static async getPostsWithLocation(lastDoc?: any, forceGlobal: boolean = false): Promise<Post[]> {
    if (forceGlobal) {
      return await this.getPosts(lastDoc);
    }
    return await this.getSmartLocationFeed(lastDoc);
  }

  static async debugPostsInDatabase(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Checking all posts in database...');
      
      const currentUserId = await this.getConsistentUserId();
      console.log('👤 Current user ID:', currentUserId);
      
      const allPostsQuery = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(allPostsQuery);
      console.log(`📊 Total posts in database: ${snapshot.docs.length}`);
      
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📄 Post ${index + 1}:`, {
          id: doc.id,
          text: data.text?.substring(0, 30) + '...',
          userId: data.userId,
          emotionTag: data.emotionTag,
          isDeleted: data.isDeleted,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp,
          isCurrentUser: data.userId === currentUserId,
          location: data.location || 'No location'
        });
      });
      
      const activePosts = snapshot.docs.filter(doc => !doc.data().isDeleted);
      const deletedPosts = snapshot.docs.filter(doc => doc.data().isDeleted);
      const userPosts = snapshot.docs.filter(doc => doc.data().userId === currentUserId);
      const otherUserPosts = snapshot.docs.filter(doc => doc.data().userId !== currentUserId && !doc.data().isDeleted);
      
      console.log('📊 Post statistics:', {
        total: snapshot.docs.length,
        active: activePosts.length,
        deleted: deletedPosts.length,
        byCurrentUser: userPosts.length,
        byOtherUsers: otherUserPosts.length
      });
      
    } catch (error) {
      console.error('❌ Error debugging posts:', error);
    }
  }

  static async createPost(text: string, emotionTag: EmotionType, openForChat: boolean): Promise<string> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      console.log('📝 Creating post:', { text: text.substring(0, 50), emotionTag, userId });
      
      const userLocation = await this.getCurrentLocation();
      
      const post: Omit<Post, 'id'> = {
        text,
        emotionTag,
        timestamp: Date.now(),
        likes: 0,
        userId,
        openForChat,
        isDeleted: false,
        ...(userLocation && { 
          location: {
            city: userLocation.city,
            state: userLocation.state,
            country: userLocation.country
          }
        })
      };

      const docRef = await addDoc(collection(db, 'posts'), {
        ...post,
        timestamp: Timestamp.fromDate(new Date()),
      });

      const fullPost: Post = { ...post, id: docRef.id };
      await this.cachePostLocally(fullPost);
      await this.cacheUserPost(fullPost, userId);
      
      console.log(`✅ Post created with ID: ${docRef.id}, location: ${userLocation?.city || 'No location'}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating post:', error);
      await this.storeOfflinePost(text, emotionTag, openForChat);
      throw error;
    }
  }

  static async deletePost(postId: string): Promise<void> {
    try {
      await ensureAuthenticated();
      const userId = await this.getConsistentUserId();
      
      console.log('🗑️ Deleting post:', postId);
      
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, { 
        isDeleted: true,
        deletedAt: Timestamp.now(),
        deletedBy: userId
      });

      await this.removePostFromCache(postId);
      await this.removeUserPostFromCache(postId, userId);
      
      console.log('✅ Post deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting post:', error);
      throw error;
    }
  }

  static async deleteMoodEntryByPost(
    postId: string, 
    userId: string, 
    emotionTag: EmotionType, 
    postTimestamp: number
  ): Promise<void> {
    try {
      await ensureAuthenticated();
      
      console.log('🗑️ Deleting mood entry for post:', { postId, userId, emotionTag, postTimestamp });
      
      const timeWindow = 5 * 60 * 1000;
      const startTime = postTimestamp - timeWindow;
      const endTime = postTimestamp + timeWindow;
      
      const moodEntriesRef = collection(db, 'moodEntries');
      
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
      
      const matchingEntries = querySnapshot.docs.filter(doc => {
        const moodData = doc.data();
        const moodTimestamp = moodData.timestamp?.toMillis() || moodData.timestamp;
        return moodTimestamp >= startTime && moodTimestamp <= endTime;
      });
      
      if (matchingEntries.length === 0) {
        console.log('📭 No mood entries found within the time window');
        return;
      }
      
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
      await this.removeMoodFromCache(matchingEntries.map(doc => doc.id));
      
      console.log('✅ Successfully deleted mood entries associated with post');
      
    } catch (error) {
      console.error('❌ Error deleting mood entry by post:', error);
      throw new Error(`Failed to delete associated mood entry: ${(error as Error).message || 'Unknown error'}`);
    }
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
      
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        const postId = postDoc.id;
        
        if (postData.isDeleted) continue;
        if (postData.userId === userId) continue;
        
        try {
          const chatsQuery = query(
            collection(db, 'posts', postId, 'chats'),
            where('participants', 'array-contains', userId)
          );
          
          const chatsSnapshot = await getDocs(chatsQuery);
          
          for (const chatDoc of chatsSnapshot.docs) {
            const chatId = chatDoc.id;
            
            const unreadQuery = query(
              collection(db, 'posts', postId, 'chats', chatId, 'messages'),
              where('toUserId', '==', userId),
              where('isRead', '==', false)
            );
            
            const unreadSnapshot = await getDocs(unreadQuery);
            const unreadCount = unreadSnapshot.docs.length;
            
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
              emotionTag: (postData.emotionTag as EmotionType) || 'vibing',
              unreadCount: unreadCount,
              lastMessage: lastMessage,
              lastMessageTime: lastMessageTime
            });
          }
        } catch (chatError) {
          console.error(`❌ Error loading chats for post ${postId}:`, chatError);
          continue;
        }
      }
      
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
          continue;
        }
      }
      
      await AsyncStorage.removeItem('offline_queue');
    } catch (error) {
      // Silent fail
    }
  }

  static async debugCacheState(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Cache state analysis...');
      
      const userId = await this.getConsistentUserId();
      const cachedUserId = await AsyncStorage.getItem(CURRENT_USER_ID_KEY);
      
      console.log('👤 Current user ID:', userId);
      console.log('💾 Cached user ID:', cachedUserId);
      console.log('🔄 IDs match:', userId === cachedUserId);
      
      const userPostsKey = getUserPostsKey(userId);
      
      // Check user-specific posts cache
      const userPostsCache = await AsyncStorage.getItem(userPostsKey);
      const userPostsCount = userPostsCache ? JSON.parse(userPostsCache).length : 0;
      console.log(`📝 User posts cache (${userPostsKey}):`, userPostsCount, 'posts');
      
      // Check general posts cache
      const generalPostsCache = await AsyncStorage.getItem(OFFLINE_POSTS_KEY);
      const generalPostsCount = generalPostsCache ? JSON.parse(generalPostsCache).length : 0;
      console.log('📋 General posts cache:', generalPostsCount, 'posts');
      
      if (generalPostsCache) {
        const allPosts = JSON.parse(generalPostsCache);
        const userPostsInGeneral = allPosts.filter((p: Post) => p.userId === userId);
        console.log('👤 User posts in general cache:', userPostsInGeneral.length);
      }
      
      // Check other caches
      const moodsCache = await AsyncStorage.getItem(OFFLINE_MOODS_KEY);
      const moodsCount = moodsCache ? JSON.parse(moodsCache).length : 0;
      console.log('😊 Moods cache:', moodsCount, 'entries');
      
      const likedPostsCache = await AsyncStorage.getItem(LIKED_POSTS_KEY);
      const likedPostsCount = likedPostsCache ? JSON.parse(likedPostsCache).length : 0;
      console.log('❤️ Liked posts cache:', likedPostsCount, 'posts');
      
      const locationCache = await AsyncStorage.getItem(USER_LOCATION_KEY);
      if (locationCache) {
        const location = JSON.parse(locationCache);
        console.log('📍 Location cache:', `${location.city}, ${location.state}`);
        console.log('📍 Location age:', Math.round((Date.now() - location.timestamp) / 1000 / 60), 'minutes');
      } else {
        console.log('📍 No location cache');
      }
      
      // Check offline queue
      const offlineQueue = await AsyncStorage.getItem('offline_queue');
      const queueCount = offlineQueue ? JSON.parse(offlineQueue).length : 0;
      console.log('📤 Offline queue:', queueCount, 'items');
      
      console.log('✅ Cache state analysis complete');
      
    } catch (error) {
      console.error('❌ Error debugging cache state:', error);
    }
  }

  // Cache management methods
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
      console.error('❌ Error caching post locally:', error);
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
      console.error('❌ Error caching user post:', error);
    }
  }

  private static async cacheUserPosts(posts: Post[], userId: string): Promise<void> {
    try {
      const userPostsKey = getUserPostsKey(userId);
      await AsyncStorage.setItem(userPostsKey, JSON.stringify(posts));
    } catch (error) {
      console.error('❌ Error caching user posts:', error);
    }
  }

  private static async cachePosts(posts: Post[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_POSTS_KEY, JSON.stringify(posts));
    } catch (error) {
      console.error('❌ Error caching posts:', error);
    }
  }

  private static async getCachedPosts(): Promise<Post[]> {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_POSTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('❌ Error getting cached posts:', error);
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
      console.error('❌ Error getting cached user posts:', error);
      return [];
    }
  }

  private static async removePostFromCache(postId: string): Promise<void> {
    try {
      const cachedPosts = await this.getCachedPosts();
      const updatedPosts = cachedPosts.filter(post => post.id !== postId);
      await AsyncStorage.setItem(OFFLINE_POSTS_KEY, JSON.stringify(updatedPosts));
    } catch (error) {
      console.error('❌ Error removing post from cache:', error);
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
      console.error('❌ Error removing user post from cache:', error);
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
      console.error('❌ Error caching mood locally:', error);
    }
  }

  private static async cacheMoods(moods: MoodEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_MOODS_KEY, JSON.stringify(moods));
    } catch (error) {
      console.error('❌ Error caching moods:', error);
    }
  }

  private static async getCachedMoods(): Promise<MoodEntry[]> {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_MOODS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('❌ Error getting cached moods:', error);
      return [];
    }
  }

  private static async removeMoodFromCache(moodEntryIds: string[]): Promise<void> {
    try {
      const cachedMoods = await this.getCachedMoods();
      const updatedMoods = cachedMoods.filter(mood => !moodEntryIds.includes(mood.id));
      await AsyncStorage.setItem(OFFLINE_MOODS_KEY, JSON.stringify(updatedMoods));
      
      console.log('🗑️ Removed mood entries from cache:', moodEntryIds);
    } catch (error) {
      console.error('❌ Error removing mood from cache:', error);
    }
  }

  private static async getLikedPosts(): Promise<string[]> {
    try {
      const cached = await AsyncStorage.getItem(LIKED_POSTS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('❌ Error getting liked posts:', error);
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
      console.error('❌ Error caching like:', error);
    }
  }

  private static async removeLikeFromCache(postId: string): Promise<void> {
    try {
      const likedPosts = await this.getLikedPosts();
      const updatedLikes = likedPosts.filter(id => id !== postId);
      await AsyncStorage.setItem(LIKED_POSTS_KEY, JSON.stringify(updatedLikes));
    } catch (error) {
      console.error('❌ Error removing like from cache:', error);
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
      console.error('❌ Error storing offline post:', error);
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
      console.error('❌ Error storing offline mood:', error);
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
        CURRENT_USER_ID_KEY,
        USER_LOCATION_KEY
      ]);
      
      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('❌ Error clearing caches:', error);
    }
  }
  
}