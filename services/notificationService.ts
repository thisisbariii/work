import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/utils/anonymousAuth';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface MessageNotificationData {
  type: 'message';
  postId: string;
  chatId: string;
  fromUserId: string;
  toUserId: string;
  messageText: string;
  postText?: string;
}

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'reminder' | 'wellness';
  timestamp: number;
  data?: any;
  isRead: boolean;
}

const NOTIFICATION_TOKEN_KEY = 'expo_push_token';
const IN_APP_NOTIFICATIONS_KEY = 'in_app_notifications';
const LAST_NOTIFICATION_CHECK_KEY = 'last_notification_check';

export class NotificationService {
  private static inAppNotifications: InAppNotification[] = [];
  private static listeners: ((notifications: InAppNotification[]) => void)[] = [];

  // Privacy-friendly caring messages
  private static readonly CARING_MESSAGES = [
    'Someone who understands is reaching out to connect with you',
    'You have support waiting - someone cares about your journey',
    'A fellow soul wants to connect and offer support',
    'Someone in the community is thinking of you',
    'You\'re not alone - someone wants to share in your experience',
    'A caring person has reached out to you',
    'Someone who relates to your feelings wants to connect',
    'You have a message from someone who cares',
    'A supportive friend is reaching out to you',
    'Someone wants to offer you comfort and understanding'
  ];

  private static readonly CARING_TITLES = [
    'Someone cares 💙',
    'You\'re supported 🤗',
    'Connection awaits 💫',
    'You matter ✨',
    'Support is here 🌟',
    'You\'re not alone 💝'
  ];

  private static getRandomCaringMessage(): string {
    return this.CARING_MESSAGES[Math.floor(Math.random() * this.CARING_MESSAGES.length)];
  }

  private static getRandomCaringTitle(): string {
    return this.CARING_TITLES[Math.floor(Math.random() * this.CARING_TITLES.length)];
  }

  // Initialize notification service
  static async initialize(): Promise<void> {
    try {
      // Request permissions
      await this.requestPermissions();
      
      // Register for push notifications if not web
      if (Platform.OS !== 'web') {
        await this.registerForPushNotifications();
      } else {
        await this.setupWebNotifications();
      }
      
      // Load in-app notifications
      await this.loadInAppNotifications();
      
      // Set up notification received listener
      this.setupNotificationListeners();
      
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web notification permissions
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Register for push notifications (mobile)
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return null;

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'c555a10c-3886-48b7-b3f2-06e261edfc44',
      });

      // Store token locally
      await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token.data);
      
      // TODO: Send token to your backend to store for this user
      const userId = await getCurrentUserId();
      console.log('Push token for user', userId, ':', token.data);

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Setup web notifications
  static async setupWebNotifications(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
      }

      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error setting up web notifications:', error);
      return false;
    }
  }

  // Setup notification listeners
  static setupNotificationListeners(): void {
    if (Platform.OS === 'web') return;

    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener((notification) => {
      // Type assertion with proper type checking
      const data = notification.request.content.data;
      
      if (data && typeof data === 'object' && 'type' in data && data.type === 'message') {
        this.handleIncomingMessageNotification(data as unknown as MessageNotificationData);
      }
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      // Type assertion with proper type checking
      const data = response.notification.request.content.data;
      
      if (data && typeof data === 'object' && 'type' in data && data.type === 'message') {
        this.handleNotificationTap(data as unknown as MessageNotificationData);
      }
    });
  }

  // Send message notification with privacy-friendly messages
  static async sendMessageNotification(
    toUserId: string,
    fromUserId: string,
    postId: string,
    chatId: string,
    messageText: string,
    postText?: string
  ): Promise<void> {
    try {
      const currentUserId = await getCurrentUserId();
      
      // 🔧 FIX: Don't send notification if YOU are the sender
      if (fromUserId === currentUserId) return;

      const caringTitle = this.getRandomCaringTitle();
      const caringMessage = this.getRandomCaringMessage();

      // Create in-app notification immediately
      await this.createInAppNotification({
        title: caringTitle,
        message: caringMessage,
        type: 'message',
        data: {
          type: 'message',
          postId,
          chatId,
          fromUserId,
          toUserId,
          messageText,
          postText,
        },
      });

      // For mobile, schedule local notification (in production, use push notifications)
      if (Platform.OS !== 'web') {
        await this.scheduleLocalMessageNotification(caringTitle, caringMessage, {
          type: 'message',
          postId,
          chatId,
          fromUserId,
          toUserId,
          messageText,
          postText,
        });
      } else {
        // For web, show browser notification
        await this.showWebNotification(caringTitle, caringMessage, {
          type: 'message',
          postId,
          chatId,
          fromUserId,
          toUserId,
          messageText,
          postText,
        });
      }

    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }

  // Schedule local notification for messages
  private static async scheduleLocalMessageNotification(
    title: string,
    message: string,
    data: MessageNotificationData
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: message,
          sound: true,
          // Convert to Record<string, unknown> to satisfy Expo's type requirements
          data: data as unknown as Record<string, unknown>,
        },
        trigger: {
          seconds: 1,
          type: 'timeInterval',
          repeats: false,
        } as any,
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  // Show web notification
  private static async showWebNotification(
    title: string,
    body: string,
    data: any
  ): Promise<void> {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const notification = new Notification(title, {
        body,
        icon: '/assets/images/icon.png',
        badge: '/assets/images/icon.png',
        tag: 'message-notification',
        requireInteraction: true,
        data,
      });

      notification.onclick = () => {
        window.focus();
        this.handleNotificationTap(data);
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing web notification:', error);
    }
  }

  // Handle incoming message notification
  private static handleIncomingMessageNotification(data: MessageNotificationData): void {
    // This runs when app is in foreground
    // The in-app notification is already created, just notify listeners
    this.notifyListeners();
  }

  // Handle notification tap
  private static handleNotificationTap(data: MessageNotificationData): void {
    if (data.type === 'message') {
      // Navigate to chat screen
      // Note: You'll need to implement navigation logic here
      // For now, we'll just log the action
      console.log('Navigate to chat:', data.postId, data.chatId);
      
      // You can use your router here:
      // router.push({
      //   pathname: '/chat',
      //   params: {
      //     postId: data.postId,
      //     chatId: data.chatId,
      //     postOwnerId: data.fromUserId,
      //     isPostOwner: 'false',
      //     postText: data.postText || '',
      //   },
      // });
    }
  }

  // Create in-app notification
  static async createInAppNotification(notification: Omit<InAppNotification, 'id' | 'timestamp' | 'isRead'>): Promise<void> {
    try {
      const newNotification: InAppNotification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: Date.now(),
        isRead: false,
      };

      this.inAppNotifications.unshift(newNotification);
      
      // Keep only last 50 notifications
      this.inAppNotifications = this.inAppNotifications.slice(0, 50);
      
      // Save to storage
      await AsyncStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(this.inAppNotifications));
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error creating in-app notification:', error);
    }
  }

  // Load in-app notifications
  static async loadInAppNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(IN_APP_NOTIFICATIONS_KEY);
      if (stored) {
        this.inAppNotifications = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error loading in-app notifications:', error);
    }
  }

  // Get in-app notifications
  static getInAppNotifications(): InAppNotification[] {
    return [...this.inAppNotifications];
  }

  // Get unread count
  static getUnreadCount(): number {
    return this.inAppNotifications.filter(n => !n.isRead).length;
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const index = this.inAppNotifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        this.inAppNotifications[index].isRead = true;
        await AsyncStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(this.inAppNotifications));
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all as read
  static async markAllAsRead(): Promise<void> {
    try {
      this.inAppNotifications = this.inAppNotifications.map(n => ({ ...n, isRead: true }));
      await AsyncStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(this.inAppNotifications));
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  // Clear old notifications
  static async clearOldNotifications(olderThanDays: number = 7): Promise<void> {
    try {
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      this.inAppNotifications = this.inAppNotifications.filter(n => n.timestamp > cutoffTime);
      await AsyncStorage.setItem(IN_APP_NOTIFICATIONS_KEY, JSON.stringify(this.inAppNotifications));
      this.notifyListeners();
    } catch (error) {
      console.error('Error clearing old notifications:', error);
    }
  }

  // Subscribe to notification updates
  static subscribe(listener: (notifications: InAppNotification[]) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private static notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.inAppNotifications]);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Set app badge count (mobile only)
  static async updateBadgeCount(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      const unreadCount = this.getUnreadCount();
      await Notifications.setBadgeCountAsync(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  // EXISTING METHODS (keeping your wellness features)
  
  static async scheduleReminder(message: string, seconds: number): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Untold 💙',
          body: message,
          sound: false,
          data: {
            type: 'reminder',
            timestamp: Date.now(),
          } as Record<string, unknown>,
        },
        trigger: {
          seconds,
          type: 'timeInterval',
          repeats: false,
        } as any,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  static async scheduleDailyReminder(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      const lastPost = await AsyncStorage.getItem('last_post_date');
      const today = new Date().toDateString();

      if (lastPost !== today) {
        await this.scheduleReminder(
          "How are you feeling today? Share your thoughts with the community 💭",
          60 * 60 * 48 // 48 hours
        );
      }
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
    }
  }

  static async scheduleWellnessCheck(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      await this.scheduleReminder(
        "Take a moment to check in with yourself. You matter 🌟",
        60 * 60 * 24 * 3 // 3 days
      );
    } catch (error) {
      console.error('Error scheduling wellness check:', error);
    }
  }

  static async cancelAllNotifications(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      if (Platform.OS === 'web') return [];
      
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  static async updateLastPostDate(): Promise<void> {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('last_post_date', today);
    } catch (error) {
      console.error('Error updating last post date:', error);
    }
  }
}