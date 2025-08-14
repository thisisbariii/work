// @ts-ignore - AsyncStorage types may not be properly configured
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/config/firebase';
// @ts-ignore - expo-crypto types may not be properly configured
import * as Crypto from 'expo-crypto';

const PERSISTENT_USER_ID_KEY = 'persistent_user_id';
const FIREBASE_USER_ID_KEY = 'firebase_user_id';
const USER_ID_GENERATION_TIMESTAMP = 'user_id_generation_timestamp'; // NEW: Track when ID was created

let authPromise: Promise<string> | null = null;
let currentPersistentUserId: string | null = null;
let isInitialized = false; // NEW: Track initialization state

/**
 * Generate a UUID v4 using expo-crypto
 */
const generateUUID = async (): Promise<string> => {
  try {
    return await Crypto.randomUUID();
  } catch (error) {
    // Fallback to timestamp-based ID if crypto fails
    console.warn('Crypto.randomUUID failed, using fallback:', error);
    return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * This system creates a persistent user ID that survives app restarts.
 * We use this ID for all database operations instead of Firebase's anonymous user ID.
 */

export const initializeAuth = async (): Promise<void> => {
  try {
    console.log('Initializing persistent authentication...');
    await getOrCreatePersistentUserId();
    isInitialized = true;
    console.log('Persistent authentication initialized');
  } catch (error) {
    console.error('Failed to initialize authentication:', error);
    throw error;
  }
};

export const getOrCreatePersistentUserId = async (): Promise<string> => {
  // Return existing promise if authentication is in progress
  if (authPromise) {
    console.log('Auth promise in progress, waiting...');
    return authPromise;
  }

  // If we already have the persistent user ID in memory, return it
  if (currentPersistentUserId) {
    console.log('Using cached persistent user ID:', currentPersistentUserId);
    return currentPersistentUserId;
  }

  authPromise = createPersistentUserId();
  
  try {
    const userId = await authPromise;
    authPromise = null;
    return userId;
  } catch (error) {
    authPromise = null;
    throw error;
  }
};

const createPersistentUserId = async (): Promise<string> => {
  try {
    console.log('Creating/retrieving persistent user ID...');
    
    // Try to get existing persistent user ID
    let persistentUserId = await AsyncStorage.getItem(PERSISTENT_USER_ID_KEY);
    
    if (!persistentUserId) {
      // Create new persistent user ID using expo-crypto
      const uuid = await generateUUID();
      persistentUserId = `anon_${uuid}`;
      
      // Store the user ID and timestamp
      await AsyncStorage.multiSet([
        [PERSISTENT_USER_ID_KEY, persistentUserId],
        [USER_ID_GENERATION_TIMESTAMP, Date.now().toString()]
      ]);
      
      console.log('✅ Created NEW persistent user ID:', persistentUserId);
    } else {
      // Check if this is a very old user ID that might have inconsistencies
      const timestamp = await AsyncStorage.getItem(USER_ID_GENERATION_TIMESTAMP);
      if (!timestamp) {
        // Add timestamp for existing users
        await AsyncStorage.setItem(USER_ID_GENERATION_TIMESTAMP, Date.now().toString());
      }
      
      console.log('✅ Using EXISTING persistent user ID:', persistentUserId);
    }

    // Cache in memory for faster access
    currentPersistentUserId = persistentUserId;

    // Also ensure we have a Firebase user for authentication
    await ensureFirebaseAuth();

    return persistentUserId;
  } catch (error) {
    console.error('❌ Error creating persistent user ID:', error);
    
    // Enhanced fallback with timestamp
    const fallbackId = `anon_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    currentPersistentUserId = fallbackId;
    
    // Try to store the fallback ID
    try {
      await AsyncStorage.setItem(PERSISTENT_USER_ID_KEY, fallbackId);
    } catch (storageError) {
      console.error('Could not store fallback ID:', storageError);
    }
    
    return fallbackId;
  }
};

const ensureFirebaseAuth = async (): Promise<User> => {
  try {
    // Check if we already have a Firebase user
    if (auth.currentUser) {
      console.log('✅ Firebase user already exists:', auth.currentUser.uid);
      return auth.currentUser;
    }

    // Wait for auth state to be ready (with timeout)
    const existingUser = await waitForAuthState(2000);
    if (existingUser) {
      console.log('✅ Firebase user found in auth state:', existingUser.uid);
      return existingUser;
    }

    // Create new Firebase anonymous user
    console.log('🔄 Creating Firebase anonymous user...');
    const userCredential = await signInAnonymously(auth);
    
    // Cache the Firebase user ID (though we don't use it for data)
    try {
      await AsyncStorage.setItem(FIREBASE_USER_ID_KEY, userCredential.user.uid);
    } catch (storageError) {
      console.warn('Could not cache Firebase user ID:', storageError);
    }
    
    console.log('✅ Firebase user created:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Error ensuring Firebase auth:', error);
    throw error;
  }
};

const waitForAuthState = (timeout: number = 3000): Promise<User | null> => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeout);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
};

// For backward compatibility with existing code
export const ensureAuthenticated = async (): Promise<User> => {
  try {
    // Make sure we have our persistent user ID
    await getOrCreatePersistentUserId();
    
    // Ensure Firebase auth (needed for database operations)
    return await ensureFirebaseAuth();
  } catch (error) {
    console.error('❌ Error ensuring authentication:', error);
    throw error;
  }
};

// This is the key function - always returns the same user ID
export const getCurrentUserId = async (): Promise<string> => {
  try {
    // If we have the ID in memory and we're initialized, return it immediately
    if (currentPersistentUserId && isInitialized) {
      return currentPersistentUserId;
    }

    // Otherwise, go through the full initialization process
    const userId = await getOrCreatePersistentUserId();
    console.log('📱 getCurrentUserId returning:', userId);
    return userId;
  } catch (error) {
    console.error('❌ Error getting current user ID:', error);
    
    // Enhanced fallback with more unique identifier
    const fallbackId = `anon_emergency_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    console.warn('🚨 Using emergency fallback ID:', fallbackId);
    return fallbackId;
  }
};

// For backward compatibility
export const getUserId = async (): Promise<string | null> => {
  try {
    return await getCurrentUserId();
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

// For backward compatibility  
export const getOrCreateUserId = async (): Promise<string> => {
  return getCurrentUserId();
};

// NEW: Method to verify user ID consistency
export const verifyUserIdConsistency = async (): Promise<{ 
  isConsistent: boolean; 
  storedId: string | null; 
  memoryId: string | null; 
  timestamp: string | null;
}> => {
  try {
    const storedId = await AsyncStorage.getItem(PERSISTENT_USER_ID_KEY);
    const timestamp = await AsyncStorage.getItem(USER_ID_GENERATION_TIMESTAMP);
    
    return {
      isConsistent: storedId === currentPersistentUserId,
      storedId,
      memoryId: currentPersistentUserId,
      timestamp
    };
  } catch (error) {
    console.error('Error verifying user ID consistency:', error);
    return {
      isConsistent: false,
      storedId: null,
      memoryId: currentPersistentUserId,
      timestamp: null
    };
  }
};

// NEW: Force refresh user ID (useful for debugging)
export const refreshUserId = async (): Promise<string> => {
  console.log('🔄 Force refreshing user ID...');
  
  // Clear memory cache
  currentPersistentUserId = null;
  authPromise = null;
  isInitialized = false;
  
  // Get fresh user ID
  return await getCurrentUserId();
};

// Utility function to clear all auth data (for testing/debugging)
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      PERSISTENT_USER_ID_KEY, 
      FIREBASE_USER_ID_KEY,
      USER_ID_GENERATION_TIMESTAMP
    ]);
    currentPersistentUserId = null;
    authPromise = null;
    isInitialized = false;
    console.log('✅ Auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};

// NEW: Debug method to log auth state
export const debugAuthState = async (): Promise<void> => {
  try {
    console.log('=== AUTH STATE DEBUG ===');
    
    const consistency = await verifyUserIdConsistency();
    console.log('User ID Consistency:', consistency);
    
    const firebaseUser = auth.currentUser;
    console.log('Firebase User:', firebaseUser ? {
      uid: firebaseUser.uid,
      isAnonymous: firebaseUser.isAnonymous,
      creationTime: firebaseUser.metadata.creationTime
    } : 'null');
    
    console.log('Memory State:', {
      currentPersistentUserId,
      isInitialized,
      authPromiseActive: !!authPromise
    });
    
    console.log('=== END AUTH DEBUG ===');
  } catch (error) {
    console.error('Error debugging auth state:', error);
  }
};