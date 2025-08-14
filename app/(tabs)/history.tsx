import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { FirebaseService } from '@/services/firebaseService';
import { Post, EmotionType } from '@/types';
import { Trash2, Heart, MessageCircle, TrendingUp, Sparkles, ArrowRight, Reply } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentUserId } from '@/utils/anonymousAuth';
import { router } from 'expo-router';

// Refined minimal emotion colors
const emotionColors = {
  sad: '#f8fafc',
  angry: '#fef2f2',
  anxious: '#fffbeb',
  guilty: '#faf5ff',
  happy: '#f0fdf4',
  empty: '#f0f9ff',
};

// Clean accent colors
const emotionAccents = {
  sad: '#6366f1',
  angry: '#ef4444',
  anxious: '#f59e0b',
  guilty: '#8b5cf6',
  happy: '#10b981',
  empty: '#06b6d4',
};

const emotionLabels = {
  sad: 'Sad',
  angry: 'Angry',
  anxious: 'Anxious',
  guilty: 'Guilty',
  happy: 'Happy',
  empty: 'Empty',
};

interface PostWithUnreadCount extends Post {
  unreadMessageCount?: number;
}

// Interface for participated chats
interface ParticipatedChat {
  id: string;
  postId: string;
  postText: string;
  postOwnerId: string;
  emotionTag: EmotionType;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: number;
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [userPosts, setUserPosts] = useState<PostWithUnreadCount[]>([]);
  const [participatedChats, setParticipatedChats] = useState<ParticipatedChat[]>([]);
  const [filter, setFilter] = useState<EmotionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [showingTab, setShowingTab] = useState<'posts' | 'chats'>('posts');
  const [deletingPosts, setDeletingPosts] = useState<Set<string>>(new Set());

  const loadCachedPosts = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      const cachedPosts = await FirebaseService.getCachedUserPosts(userId);
      if (cachedPosts.length > 0) {
        setUserPosts(cachedPosts.map(post => ({ ...post, unreadMessageCount: 0 })));
        setLoading(false);
      }
    } catch (error) {
      // Silent fail
    }
  }, []);

  const loadUserPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!userPosts.length) {
        setLoading(true);
      }
      
      const userId = await getCurrentUserId();
      const posts = await FirebaseService.getUserPosts();
      
      const validPosts = posts.filter(post => {
        const isValid = post.userId === userId;
        return isValid;
      });
      
      if (validPosts.length === 0) {
        setUserPosts([]);
        return;
      }

      const postIds = validPosts.map(post => post.id);
      const unreadCounts = await FirebaseService.getUnreadMessageCountsForPosts(postIds);
      
      const postsWithUnreadCounts: PostWithUnreadCount[] = validPosts.map(post => ({
        ...post,
        unreadMessageCount: unreadCounts[post.id] || 0
      }));

      setUserPosts(postsWithUnreadCounts);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to load your posts. Please try again.');
      await loadCachedPosts();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userPosts.length, loadCachedPosts]);

  // Load participated chats
  const loadParticipatedChats = useCallback(async () => {
    try {
      const chats = await FirebaseService.getUserParticipatedChats();
      setParticipatedChats(chats);
    } catch (error) {
      console.error('Failed to load participated chats:', error);
      setParticipatedChats([]);
    }
  }, []);

  // Calculate total unread from both sources
  const calculateTotalUnread = useCallback(() => {
    const postsUnread = userPosts.reduce((sum, post) => sum + (post.unreadMessageCount || 0), 0);
    const chatsUnread = participatedChats.reduce((sum, chat) => sum + chat.unreadCount, 0);
    setTotalUnreadMessages(postsUnread + chatsUnread);
  }, [userPosts, participatedChats]);

  useEffect(() => {
    calculateTotalUnread();
  }, [calculateTotalUnread]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadCachedPosts();
        await Promise.all([
          loadUserPosts(),
          loadParticipatedChats()
        ]);
      } catch (error) {
        setLoading(false);
      }
    };
    initializeData();
  }, [loadCachedPosts, loadUserPosts, loadParticipatedChats]);

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          await loadCachedPosts();
          await Promise.all([
            loadUserPosts(),
            loadParticipatedChats()
          ]);
        } catch (error) {
          // Silent fail
        }
      };
      refreshData();
    }, [loadCachedPosts, loadUserPosts, loadParticipatedChats])
  );

  // ✅ UPDATED: Enhanced handleDeletePost to also delete mood entry
  const handleDeletePost = useCallback((postId: string) => {
    // Check if already deleting this post
    if (deletingPosts.has(postId)) {
      return;
    }

    Alert.alert(
      'Delete Post & Mood Entry',
      'This will permanently delete your post and its associated mood entry. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Add to deleting set to prevent double-deletion
              setDeletingPosts(prev => new Set([...prev, postId]));

              // Find the post to get its details for mood deletion
              const postToDelete = userPosts.find(post => post.id === postId);
              
              if (!postToDelete) {
                Alert.alert('Error', 'Post not found.');
                return;
              }

              // Get current user ID
              const userId = await getCurrentUserId();

              // ✅ NEW: Delete both post and mood entry simultaneously
              await Promise.all([
                // Delete the post
                FirebaseService.deletePost(postId),
                // Delete the corresponding mood entry
                FirebaseService.deleteMoodEntryByPost(postId, userId, postToDelete.emotionTag, postToDelete.timestamp)
              ]);

              // Update local state to remove the deleted post
              setUserPosts(prev => {
                const filteredPosts = prev.filter(post => post.id !== postId);
                return filteredPosts;
              });

              Alert.alert('Success', 'Post and mood entry deleted successfully');
              
            } catch (error) {
              console.error('Error deleting post and mood:', error);
              Alert.alert(
                'Error', 
                'Failed to delete post and mood entry. Please try again.'
              );
            } finally {
              // Remove from deleting set
              setDeletingPosts(prev => {
                const newSet = new Set(prev);
                newSet.delete(postId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  }, [userPosts, deletingPosts]);

  const handleChatPress = useCallback(async (post: PostWithUnreadCount) => {
    if (!post.openForChat) {
      Alert.alert('Chat Disabled', 'This post is not open for chat.');
      return;
    }

    try {
      const currentUserId = await getCurrentUserId();
      
      const currentUnreadCount = post.unreadMessageCount || 0;
      setUserPosts(prevPosts => 
        prevPosts.map(p => 
          p.id === post.id 
            ? { ...p, unreadMessageCount: 0 }
            : p
        )
      );
      
      router.push({
        pathname: '/chat',
        params: {
          postId: post.id,
          postOwnerId: post.userId,
          isPostOwner: (post.userId === currentUserId).toString(),
          postText: post.text
        }
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat. Please try again.');
      await loadUserPosts(true);
    }
  }, [loadUserPosts]);

  // Handle participated chat press
  const handleParticipatedChatPress = useCallback(async (chat: ParticipatedChat) => {
    try {
      const currentUserId = await getCurrentUserId();
      
      // Mark as read optimistically
      setParticipatedChats(prevChats => 
        prevChats.map(c => 
          c.id === chat.id 
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
      
      router.push({
        pathname: '/chat',
        params: {
          postId: chat.postId,
          postOwnerId: chat.postOwnerId,
          isPostOwner: 'false',
          postText: chat.postText,
          chatId: chat.id
        }
      });
      
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat. Please try again.');
      await loadParticipatedChats();
    }
  }, [loadParticipatedChats]);

  const filteredPosts = filter 
    ? userPosts.filter(post => post.emotionTag === filter)
    : userPosts;

  const filteredChats = filter 
    ? participatedChats.filter(chat => chat.emotionTag === filter)
    : participatedChats;

  const emotions: EmotionType[] = ['sad', 'angry', 'anxious', 'guilty', 'happy', 'empty'];

  const getStreak = () => {
    if (userPosts.length === 0) return 0;
    const sortedPosts = [...userPosts].sort((a, b) => b.timestamp - a.timestamp);
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      const hasPost = sortedPosts.some(post => {
        const postDate = new Date(post.timestamp);
        return postDate.toDateString() === checkDate.toDateString();
      });
      
      if (hasPost) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const renderPost = ({ item }: { item: PostWithUnreadCount }) => {
    const isDeleting = deletingPosts.has(item.id);
    
    return (
      <View style={[
        styles.postCard, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          opacity: isDeleting ? 0.6 : 1 
        }
      ]}>
        <View style={styles.postHeader}>
          <View style={styles.postMeta}>
            <View style={[styles.emotionDot, { backgroundColor: emotionAccents[item.emotionTag] }]} />
            <Text style={[styles.emotionLabel, { color: emotionAccents[item.emotionTag] }]}>
              {emotionLabels[item.emotionTag]}
            </Text>
            <Text style={[styles.dateText, { color: colors.text + '40' }]}>
              {new Date(item.timestamp).toLocaleDateString('en', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => handleDeletePost(item.id)}
            style={[
              styles.deleteButton,
              isDeleting && styles.disabledButton
            ]}
            activeOpacity={isDeleting ? 1 : 0.7}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.text + '40'} />
            ) : (
              <Trash2 size={14} color={colors.text + '40'} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.postText, { color: colors.text }]}>{item.text}</Text>

        <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
          <View style={styles.postStats}>
            <View style={styles.statItem}>
              <Heart 
                size={12}
                color="#ef4444"
                fill={item.likes > 0 ? '#ef4444' : 'transparent'}
              />
              <Text style={[styles.statText, { color: colors.text + '60' }]}>
                {item.likes}
              </Text>
            </View>
          </View>
          
          {item.openForChat && (
            <TouchableOpacity
              style={[
                styles.chatButton,
                { 
                  backgroundColor: item.unreadMessageCount && item.unreadMessageCount > 0 
                    ? '#fee2e2'
                    : colors.border,
                  borderColor: item.unreadMessageCount && item.unreadMessageCount > 0 
                    ? '#ef4444'
                    : 'transparent'
                },
                isDeleting && styles.disabledButton
              ]}
              onPress={() => handleChatPress(item)}
              activeOpacity={isDeleting ? 1 : 0.7}
              disabled={isDeleting}
            >
              <MessageCircle 
                size={12}
                color={item.unreadMessageCount && item.unreadMessageCount > 0 ? '#dc2626' : colors.text + '60'}
              />
              <Text style={[
                styles.chatButtonText, 
                { 
                  color: item.unreadMessageCount && item.unreadMessageCount > 0 
                    ? '#dc2626'
                    : colors.text + '60'
                }
              ]}>
                Chat
                {item.unreadMessageCount && item.unreadMessageCount > 0 && (
                  <Text style={styles.unreadBadge}>
                    {' '}({item.unreadMessageCount})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render participated chat item
  const renderParticipatedChat = ({ item }: { item: ParticipatedChat }) => (
    <TouchableOpacity
      style={[
        styles.chatCard, 
        { 
          backgroundColor: colors.card, 
          borderColor: item.unreadCount > 0 ? emotionAccents[item.emotionTag] : colors.border 
        }
      ]}
      onPress={() => handleParticipatedChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.chatHeader}>
        <View style={styles.chatMeta}>
          <View style={[styles.emotionDot, { backgroundColor: emotionAccents[item.emotionTag] }]} />
          <Text style={[styles.emotionLabel, { color: emotionAccents[item.emotionTag] }]}>
            {emotionLabels[item.emotionTag]}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadIndicator, { backgroundColor: emotionAccents[item.emotionTag] }]}>
              <Text style={styles.unreadIndicatorText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        <ArrowRight size={14} color={colors.text + '40'} />
      </View>

      <Text style={[styles.chatPostText, { color: colors.text }]} numberOfLines={2}>
        {item.postText}
      </Text>

      {item.lastMessage && (
        <View style={styles.lastMessageContainer}>
          <Reply size={12} color={colors.text + '50'} />
          <Text style={[styles.lastMessage, { color: colors.text + '60' }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
      )}

      {item.lastMessageTime && (
        <Text style={[styles.chatTime, { color: colors.text + '40' }]}>
          {formatRelativeTime(item.lastMessageTime)}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return new Date(timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const renderHeader = () => (
    <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
      <View style={styles.titleSection}>
        <Text style={[styles.title, { color: colors.text }]}>Your Journey</Text>
        <Text style={[styles.subtitle, { color: colors.text + '50' }]}>
          Every feeling shared is progress made
        </Text>
      </View>

      {totalUnreadMessages > 0 && (
        <View style={[styles.unreadNotification, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
          <View style={styles.unreadContent}>
            <MessageCircle size={16} color="#dc2626" />
            <Text style={[styles.unreadText, { color: '#dc2626' }]}>
              {totalUnreadMessages} new message{totalUnreadMessages !== 1 ? 's' : ''} waiting
            </Text>
          </View>
        </View>
      )}

      <View style={styles.statsSection}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: emotionColors.happy }]}>
            <Sparkles size={14} color={emotionAccents.happy} />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>{userPosts.length}</Text>
          <Text style={[styles.statLabel, { color: colors.text + '50' }]}>Posts</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: '#fee2e2' }]}>
            <Heart size={14} color="#ef4444" />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>
            {userPosts.reduce((sum, post) => sum + post.likes, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text + '50' }]}>Likes</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconContainer, { backgroundColor: emotionColors.happy }]}>
            <TrendingUp size={14} color={emotionAccents.happy} />
          </View>
          <Text style={[styles.statNumber, { color: colors.text }]}>{getStreak()}</Text>
          <Text style={[styles.statLabel, { color: colors.text + '50' }]}>Day Streak</Text>
        </View>
      </View>

      {/* Tab selector */}
      <View style={[styles.tabSelector, { backgroundColor: colors.border + '30' }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            showingTab === 'posts' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setShowingTab('posts')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: showingTab === 'posts' ? 'white' : colors.text + '70' }
          ]}>
            My Posts ({userPosts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            showingTab === 'chats' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setShowingTab('chats')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { color: showingTab === 'chats' ? 'white' : colors.text + '70' }
          ]}>
            Conversations ({participatedChats.length})
            {participatedChats.reduce((sum, chat) => sum + chat.unreadCount, 0) > 0 && (
              <Text style={styles.unreadTabBadge}>
                {' '}({participatedChats.reduce((sum, chat) => sum + chat.unreadCount, 0)})
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Show filters only for posts */}
      {showingTab === 'posts' && (
        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: filter === null ? colors.primary : 'transparent',
                    borderColor: filter === null ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setFilter(null)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.filterText,
                  { color: filter === null ? 'white' : colors.text + '70' }
                ]}>
                  All ({userPosts.length})
                </Text>
              </TouchableOpacity>

              {emotions.map((emotion) => {
                const count = userPosts.filter(post => post.emotionTag === emotion).length;
                if (count === 0) return null;
                
                return (
                  <TouchableOpacity
                    key={emotion}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: filter === emotion ? emotionAccents[emotion] : 'transparent',
                        borderColor: filter === emotion ? emotionAccents[emotion] : colors.border,
                      }
                    ]}
                    onPress={() => setFilter(emotion)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.filterText,
                      { color: filter === emotion ? 'white' : colors.text + '70' }
                    ]}>
                      {emotionLabels[emotion]} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserPosts(true),
      loadParticipatedChats()
    ]);
    setRefreshing(false);
  }, [loadUserPosts, loadParticipatedChats]);

  if (loading && userPosts.length === 0 && participatedChats.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text + '60' }]}>
            Loading your journey...
          </Text>
        </View>
      </View>
    );
  }

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.border }]}>
        <Sparkles size={24} color={colors.text + '40'} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {showingTab === 'posts' 
          ? (filter ? `No ${filter} posts yet` : 'Your journey awaits')
          : 'No conversations yet'
        }
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.text + '50' }]}>
        {showingTab === 'posts'
          ? (filter 
              ? `Share a ${filter} feeling to see it here`
              : 'Start sharing your feelings to track your progress'
            )
          : 'Reply to someone\'s post to start a conversation'
        }
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {showingTab === 'posts' ? (
        <FlatList<PostWithUnreadCount>
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressViewOffset={insets.top + 100}
            />
          }
          ListEmptyComponent={renderEmptyComponent}
        />
      ) : (
        <FlatList<ParticipatedChat>
          data={filteredChats}
          renderItem={renderParticipatedChat}
          keyExtractor={(item) => `chat_${item.id}`}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressViewOffset={insets.top + 100}
            />
          }
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },

  unreadNotification: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  unreadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  
  statsSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Tab selector styles
  tabSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  unreadTabBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  filtersSection: {
    marginBottom: 8,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Original post card styles
  postCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontWeight: '400',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  chatButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unreadBadge: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Participated chat card styles
  chatCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadIndicator: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  chatPostText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 13,
    fontStyle: 'italic',
    flex: 1,
  },
  chatTime: {
    fontSize: 11,
    fontWeight: '500',
    alignSelf: 'flex-end',
  },
  
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});