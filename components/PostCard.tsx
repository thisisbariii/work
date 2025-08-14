import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Post } from '@/types';
import { emotionColors, emotionEmojis, emotionLabels } from '@/utils/emotions';
import { useTheme } from '@/contexts/ThemeContext';
import { Heart, MessageCircle, Share } from 'lucide-react-native';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onChat?: (post: Post) => void;
  onShare?: (post: Post) => void;
  showActions?: boolean;
}

export default function PostCard({ 
  post, 
  onLike, 
  onChat, 
  onShare, 
  showActions = true 
}: PostCardProps) {
  const { colors } = useTheme();

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Emotion Tag */}
      <View style={[styles.emotionTag, { backgroundColor: emotionColors[post.emotionTag] + '20' }]}>
        <Text style={styles.emotionEmoji}>{emotionEmojis[post.emotionTag]}</Text>
        <Text style={[styles.emotionText, { color: emotionColors[post.emotionTag] }]}>
          {emotionLabels[post.emotionTag]}
        </Text>
      </View>

      {/* Content */}
      <Text style={[styles.postText, { color: colors.text }]}>{post.text}</Text>

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onLike(post.id)}>
              <Heart  size={18} color= {colors.text + '80' } />
              <Text style={[styles.actionText, { color: colors.text + '80' }]}>
                {post.likes}
              </Text>
            </TouchableOpacity>
            
            {post.openForChat && onChat && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onChat(post)}>
                <MessageCircle  size= {18} color= {colors.primary } />
                <Text style={[styles.actionText, { color: colors.primary }]}>Chat</Text>
              </TouchableOpacity>
            )}

            {onShare && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onShare(post)}>
                <Share size= {18} color= {colors.text + '80' } />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.timeText, { color: colors.text + '60' }]}>
            {formatTime(post.timestamp)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  emotionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  emotionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
  },
});