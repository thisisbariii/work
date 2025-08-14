import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { MessageCircle, X, Bell } from 'lucide-react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'reminder' | 'wellness';
  timestamp: number;
  data?: any;
  isRead: boolean;
}

interface NotificationBannerProps {
  position?: 'top' | 'bottom';
  autoHide?: boolean;
  hideAfter?: number;
}

export default function NotificationBanner({ 
  position = 'top', 
  autoHide = true, 
  hideAfter = 4000 
}: NotificationBannerProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { notifications, markAsRead } = useNotifications();
  const [currentNotification, setCurrentNotification] = useState<InAppNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = new Animated.Value(position === 'top' ? -200 : 200);
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  // Show latest unread notification
  useEffect(() => {
    const latestUnread = notifications.find(n => 
      !n.isRead && 
      !shownNotifications.has(n.id) && 
      n.type === 'message' // Only show message notifications in banner
    );
    
    if (latestUnread && (!currentNotification || latestUnread.id !== currentNotification.id)) {
      showNotification(latestUnread);
    }
  }, [notifications, currentNotification, shownNotifications]);

  const showNotification = (notification: InAppNotification) => {
    setCurrentNotification(notification);
    setIsVisible(true);
    
    // Mark as shown
    setShownNotifications(prev => new Set([...prev, notification.id]));

    // Animate in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Auto hide
    if (autoHide) {
      setTimeout(() => {
        hideNotification();
      }, hideAfter);
    }
  };

  const hideNotification = () => {
    Animated.spring(slideAnim, {
      toValue: position === 'top' ? -200 : 200,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setIsVisible(false);
      setCurrentNotification(null);
    });
  };

  const handleNotificationPress = async () => {
    if (!currentNotification) return;

    // Mark as read
    await markAsRead(currentNotification.id);

    // Handle navigation based on notification type
    if (currentNotification.type === 'message' && currentNotification.data) {
      const data = currentNotification.data;
      
      try {
        router.push({
          pathname: '/chat',
          params: {
            postId: data.postId,
            chatId: data.chatId,
            postOwnerId: data.fromUserId,
            isPostOwner: 'false',
            postText: data.postText || '',
          },
        });
      } catch (error) {
        // Fallback to history tab if chat navigation fails
        router.push('/(tabs)/history');
      }
    }

    hideNotification();
  };

  const handleDismiss = async () => {
    if (currentNotification) {
      await markAsRead(currentNotification.id);
    }
    hideNotification();
  };

  const getNotificationIcon = () => {
    if (!currentNotification) return <Bell size={16} color={colors.primary} />;
    
    switch (currentNotification.type) {
      case 'message':
        return <MessageCircle size={16} color={colors.primary} />;
      case 'wellness':
        return <Text style={{ fontSize: 16 }}>🌟</Text>;
      case 'reminder':
        return <Text style={{ fontSize: 16 }}>💭</Text>;
      default:
        return <Bell size={16} color={colors.primary} />;
    }
  };

  if (!isVisible || !currentNotification) {
    return null;
  }

  const topPosition = position === 'top' ? insets.top + 10 : undefined;
  const bottomPosition = position === 'bottom' ? insets.bottom + 10 : undefined;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateY: slideAnim }],
          top: topPosition,
          bottom: bottomPosition,
          shadowColor: colors.text,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handleNotificationPress}
        activeOpacity={0.9}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          {getNotificationIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {currentNotification.title}
          </Text>
          <Text style={[styles.message, { color: colors.text + '80' }]} numberOfLines={2}>
            {currentNotification.message}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={colors.text + '60'} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  dismissButton: {
    padding: 4,
  },
});