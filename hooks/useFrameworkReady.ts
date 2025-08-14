import { useEffect } from 'react';
import { initializeAuth } from '@/utils/anonymousAuth';
import { FirebaseService } from '@/services/firebaseService';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // FIXED: Initialize authentication system first and wait for completion
        await initializeAuth();
        console.log('Authentication initialized');
        
        // FIXED: Add a small delay to ensure auth is fully ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Sync any offline data
        try {
          await FirebaseService.syncOfflineData();
          console.log('Offline sync completed');
        } catch (syncError) {
          console.error('Offline sync failed (non-critical):', syncError);
        }
        
        // FIXED: Debug cache state for troubleshooting
        if (__DEV__) {
          await FirebaseService.debugCacheState();
        }
        
        console.log('App initialization complete');
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Don't throw - app should still work even if some initialization fails
      }
      
      // Call the framework ready callback
      window.frameworkReady?.();
    };

    initializeApp();
  }, []);
}