import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ✅ FIXED: Provide fallback values and better error handling
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_UDZEOARvyJjwaC95yKqACkKc8PjSOg8",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "therapist-a5b89.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "therapist-a5b89",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "therapist-a5b89.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "512793836680",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:512793836680:android:e344cb7c03137bd9e6b33d",
};

// ✅ ADDED: Validation to prevent crashes
const validateFirebaseConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => 
    !firebaseConfig[key as keyof typeof firebaseConfig] || 
    firebaseConfig[key as keyof typeof firebaseConfig].includes('your-')
  );
  
  if (missingKeys.length > 0) {
    console.error('❌ Missing Firebase configuration keys:', missingKeys);
    console.error('Please check your .env file or environment variables');
    // Don't throw error in production, just log it
    if (__DEV__) {
      throw new Error(`Missing Firebase config: ${missingKeys.join(', ')}`);
    }
  }
};

// Validate config before initializing
validateFirebaseConfig();

// Initialize Firebase with proper error handling
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Log successful initialization
console.log('✅ Firebase initialized successfully');

/**
 * Enable Firestore network (go online)
 */
export const enableOfflineSupport = async (): Promise<void> => {
  try {
    await enableNetwork(db);
    console.log('✅ Firebase network enabled');
  } catch (error) {
    console.error('Error enabling network:', error);
  }
};

/**
 * Disable Firestore network (go offline)
 */
export const disableOfflineSupport = async (): Promise<void> => {
  try {
    await disableNetwork(db);
    console.log('✅ Firebase network disabled');
  } catch (error) {
    console.error('Error disabling network:', error);
  }
};