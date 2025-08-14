// @ts-ignore - AsyncStorage types may not be properly configured
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore - NetInfo types may not be properly configured
import NetInfo from '@react-native-community/netinfo';
import { FirebaseService } from '@/services/firebaseService';

const SYNC_QUEUE_KEY = 'sync_queue';

interface SyncItem {
  id: string;
  type: 'post' | 'mood' | 'like';
  data: any;
  timestamp: number;
  retries: number;
}

// Type for NetInfo state
interface NetworkState {
  isConnected: boolean | null;
  type?: string;
}

export class OfflineSyncService {
  private static isOnline = true;
  private static syncInProgress = false;

  static async initialize(): Promise<void> {
    try {
      // Monitor network status
      NetInfo.addEventListener((state: NetworkState) => {
        const wasOffline = !this.isOnline;
        this.isOnline = !!state.isConnected;
        
        console.log('Network status changed:', this.isOnline ? 'online' : 'offline');
        
        if (wasOffline && this.isOnline) {
          console.log('Back online - starting sync...');
          this.syncQueuedItems();
        }
      });

      // Check initial network state
      const networkState = await NetInfo.fetch();
      this.isOnline = !!(networkState as NetworkState).isConnected;
      
      console.log('Initial network status:', this.isOnline ? 'online' : 'offline');
      
      if (this.isOnline) {
        this.syncQueuedItems();
      }
    } catch (error) {
      console.error('Error initializing offline sync:', error);
      // Assume online if we can't check network status
      this.isOnline = true;
    }
  }

  static async queueItem(type: string, data: any): Promise<void> {
    try {
      const queue = await this.getQueue();
      const item: SyncItem = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type as 'post' | 'mood' | 'like',
        data,
        timestamp: Date.now(),
        retries: 0,
      };
      
      queue.push(item);
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      
      console.log(`Queued ${type} for offline sync:`, item.id);
      
      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncQueuedItems();
      }
    } catch (error) {
      console.error('Error queuing item:', error);
    }
  }

  static async syncQueuedItems(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      console.log('Sync skipped - in progress or offline');
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        console.log('No items to sync');
        this.syncInProgress = false;
        return;
      }
      
      console.log(`Starting sync of ${queue.length} items...`);
      const processedItems: string[] = [];
      
      for (const item of queue) {
        try {
          await this.processItem(item);
          processedItems.push(item.id);
          console.log(`Successfully synced item: ${item.id}`);
        } catch (error) {
          console.error('Error processing sync item:', error);
          
          // Retry logic
          item.retries += 1;
          if (item.retries >= 3) {
            processedItems.push(item.id); // Remove after 3 failed attempts
            console.log(`Removing item after 3 failed attempts: ${item.id}`);
          }
        }
      }
      
      // Remove successfully processed items
      const remainingQueue = queue.filter(item => !processedItems.includes(item.id));
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
      
      console.log(`Sync completed. ${processedItems.length} items processed, ${remainingQueue.length} remaining`);
      
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private static async processItem(item: SyncItem): Promise<void> {
    switch (item.type) {
      case 'post':
        await FirebaseService.createPost(
          item.data.text,
          item.data.emotionTag,
          item.data.openForChat
        );
        break;
        
      case 'mood':
        await FirebaseService.addMoodEntry(
          item.data.mood,
          item.data.intensity,
          item.data.notes
        );
        break;
        
      case 'like':
        await FirebaseService.likePost(item.data.postId);
        break;
        
      default:
        console.warn('Unknown sync item type:', item.type);
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  private static async getQueue(): Promise<SyncItem[]> {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  static async getQueueSize(): Promise<number> {
    try {
      const queue = await this.getQueue();
      return queue.length;
    } catch (error) {
      console.error('Error getting queue size:', error);
      return 0;
    }
  }

  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      console.log('Sync queue cleared');
    } catch (error) {
      console.error('Error clearing sync queue:', error);
    }
  }
}