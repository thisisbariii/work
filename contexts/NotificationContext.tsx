import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationService } from '@/services/notificationService';
import { FirebaseService } from '@/services/firebaseService';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'reminder' | 'wellness';
  timestamp: number;
  data?: any;
  isRead: boolean;
}

interface NotificationContextType {
  // In-app notifications
  notifications: InAppNotification[];
  unreadCount: number;
  
  // Message notifications
  totalUnreadMessages: number;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshUnreadMessages: () => Promise<void>;
  
  // Initialization
  isInitialized: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize notification system
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize notification service
        await NotificationService.initialize();
        
        // Load initial notifications
        const initialNotifications = NotificationService.getInAppNotifications();
        setNotifications(initialNotifications);
        setUnreadCount(NotificationService.getUnreadCount());
        
        // Load initial unread message count
        await refreshUnreadMessages();
        
        // ✅ REMOVED: No longer setting up Firebase message listener
        // Notifications are now handled directly in FirebaseService.sendMessage()
        
        // Subscribe to in-app notification updates
        const notificationUnsubscribe = NotificationService.subscribe((newNotifications) => {
          setNotifications(newNotifications);
          setUnreadCount(newNotifications.filter(n => !n.isRead).length);
          
          // Update badge count
          NotificationService.updateBadgeCount();
        });
        
        setIsInitialized(true);
        
        // Return cleanup function
        return () => {
          notificationUnsubscribe();
        };
        
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        setIsInitialized(true); // Still mark as initialized to prevent blocking UI
      }
    };

    const cleanup = initialize();
    
    // Cleanup on unmount
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  // Refresh unread message count periodically
  useEffect(() => {
    // Refresh unread messages every 30 seconds
    const interval = setInterval(refreshUnreadMessages, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Refresh unread message count
  const refreshUnreadMessages = async () => {
    try {
      const count = await FirebaseService.getTotalUnreadMessageCount();
      setTotalUnreadMessages(count);
    } catch (error) {
      console.error('Failed to refresh unread messages:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      // State will be updated via subscription
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      // State will be updated via subscription
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    totalUnreadMessages,
    markAsRead,
    markAllAsRead,
    refreshUnreadMessages,
    isInitialized,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Hook for just the unread count (lighter weight)
export function useUnreadCount() {
  const { unreadCount, totalUnreadMessages } = useNotifications();
  return { unreadCount, totalUnreadMessages };
}