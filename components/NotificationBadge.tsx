import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  style?: any;
  maxCount?: number;
}

export default function NotificationBadge({ 
  count, 
  size = 'medium',
  color = '#ef4444',
  textColor = 'white',
  style,
  maxCount = 99
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  
  const sizeStyles = {
    small: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 10,
    },
    medium: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      fontSize: 11,
    },
    large: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      fontSize: 12,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          minWidth: currentSize.minWidth,
          height: currentSize.height,
          borderRadius: currentSize.borderRadius,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: textColor,
            fontSize: currentSize.fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeText: {
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
});