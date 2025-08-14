import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, MessageCircle, Gamepad2, BarChart3, Clock, Bot } from 'lucide-react-native';
import { useUnreadCount } from '@/contexts/NotificationContext';
import NotificationBadge from '@/components/NotificationBadge';

function TabIcon({
  IconComponent,
  size,
  color,
  showBadge = false,
  badgeCount = 0
}: {
  IconComponent: any;
  size: number;
  color: string;
  showBadge?: boolean;
  badgeCount?: number;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <IconComponent size={size} color={color} />
      {showBadge && badgeCount > 0 && (
        <NotificationBadge
          count={badgeCount}
          size="small"
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
          }}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { totalUnreadMessages } = useUnreadCount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
          height: Math.max(insets.bottom + 60, 80),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text + '80',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <TabIcon IconComponent={Home} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ size, color }) => (
            <TabIcon IconComponent={MessageCircle} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'AI Therapy',
          tabBarIcon: ({ size, color }) => (
            <TabIcon IconComponent={Bot} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood-tracker"
        options={{
          title: 'Mood',
          tabBarIcon: ({ size, color }) => (
            <TabIcon IconComponent={BarChart3} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ size, color }) => (
            <TabIcon 
              IconComponent={Clock}
              size={size}
              color={color}
              showBadge={true}
              badgeCount={totalUnreadMessages}
            />
          ),
        }}
      />
    </Tabs>
  );
}