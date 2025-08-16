import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Share,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { FirebaseService } from '@/services/firebaseService';
import { Post, EmotionType } from '@/types';
import { Heart, MessageCircle, Sparkles, Clock, Pin, Send, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { getCurrentUserId } from '@/utils/anonymousAuth';

const { width, height } = Dimensions.get('window');

// Updated emotions array with new tags only
const emotions: EmotionType[] = [
  'chaotic',
  'overthinking', 
  'drained',
  'vibing',
  'frustrated',
  'contemplating',
  'excited',
  'nostalgic',
];

// Updated emotion theme with only new emotions
const emotionTheme = {
  chaotic: { color: '#ef4444', bg: '#fef2f2', light: '#fee2e2', label: 'Chaotic', emoji: '🌪️' },
  overthinking: { color: '#f59e0b', bg: '#fffbeb', light: '#fef3c7', label: 'Overthinking', emoji: '🧠' },
  drained: { color: '#6366f1', bg: '#f0f4ff', light: '#e0e7ff', label: 'Drained', emoji: '🔋' },
  vibing: { color: '#10b981', bg: '#f0fdf4', light: '#d1fae5', label: 'Vibing', emoji: '✨' },
  frustrated: { color: '#8b5cf6', bg: '#faf5ff', light: '#f3e8ff', label: 'Frustrated', emoji: '😤' },
  contemplating: { color: '#6b7280', bg: '#f9fafb', light: '#f3f4f6', label: 'Contemplating', emoji: '💭' },
  excited: { color: '#f97316', bg: '#fff7ed', light: '#fed7aa', label: 'Excited', emoji: '🚀' },
  nostalgic: { color: '#ec4899', bg: '#fdf2f8', light: '#fce7f3', label: 'Nostalgic', emoji: '🌅' },
};

// Motivational quotes updated for new emotions
const motivationalQuotes = [
  "Every feeling is valid and temporary 💙",
  "You're stronger than you think ✨",
  "This moment doesn't define you 🌱",
  "Your emotions are your strength 💪",
  "Healing isn't linear, and that's okay 🌊",
  "You belong here, exactly as you are 🤗",
  "Small steps still count as progress 👣",
  "Your story matters 📖",
  "Tomorrow is a new opportunity 🌅",
  "You're not alone in this feeling 🫂",
];

const getRandomMotivationalQuote = () => {
  return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
};

export default function ExploreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EmotionType | null>(null);
  const [scrollCount, setScrollCount] = useState(0);
  const [showMotivational, setShowMotivational] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  
  // Track liked posts and loading states
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  const [chatLoadingPosts, setChatLoadingPosts] = useState<Set<string>>(new Set());
  const [processingLikes, setProcessingLikes] = useState<Set<string>>(new Set());

  // Long press menu states
  const [showMenu, setShowMenu] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });;
  
  // ✅ NEW: Location state
  const [userLocation, setUserLocation] = useState<string | null>(null);

  // Pinned posts state
  const [pinnedPosts, setPinnedPosts] = useState<Set<string>>(new Set());

  // ✅ NEW: Load user location
  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        const location = await FirebaseService.getCurrentLocation();
        if (location) {
          setUserLocation(`${location.city}, ${location.state}`);
        }
      } catch (error) {
        console.log('Could not load location');
      }
    };
    loadUserLocation();
  }, []);

  useEffect(() => {
    loadPosts();
  }, [filter]);

  useEffect(() => {
    if (posts.length > 0) {
      loadLikedPosts();
    }
  }, [posts.length]);

  const loadLikedPosts = async () => {
    try {
      const likedPostIds = new Set<string>();
      
      const likeChecks = await Promise.all(
        posts.map(async (post) => {
          const hasLiked = await FirebaseService.hasUserLikedPost(post.id);
          return { postId: post.id, hasLiked };
        })
      );
      
      likeChecks.forEach(({ postId, hasLiked }) => {
        if (hasLiked) {
          likedPostIds.add(postId);
        }
      });
      
      setLikedPosts(likedPostIds);
    } catch (error) {
      // Silent error handling
    }
  };

  // ✅ UPDATED: Use location-based posts
  const loadPosts = async () => {
    try {
      // Use location-based posts instead of regular posts
      const fetchedPosts = await FirebaseService.getPostsWithLocation();
      const filteredPosts = filter 
        ? fetchedPosts.filter((post) => post.emotionTag === filter) 
        : fetchedPosts;
      
      setPosts(filteredPosts);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  }, [filter]);

  const handleScroll = () => {
    const newCount = scrollCount + 1;
    setScrollCount(newCount);

    if (newCount % 8 === 0) {
      setMotivationalQuote(getRandomMotivationalQuote());
      setShowMotivational(true);
      setTimeout(() => setShowMotivational(false), 4000);
    }
  };

  const handleLike = async (postId: string) => {
    if (processingLikes.has(postId) || likingPosts.has(postId)) {
      return;
    }

    const isCurrentlyLiked = likedPosts.has(postId);
    
    try {
      setProcessingLikes(prev => new Set([...prev, postId]));
      setLikingPosts(prev => new Set([...prev, postId]));

      // Optimistic update
      if (isCurrentlyLiked) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
          )
        );
      } else {
        setLikedPosts(prev => new Set([...prev, postId]));
        setPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post
          )
        );
      }

      if (isCurrentlyLiked) {
        await FirebaseService.unlikePost(postId);
      } else {
        await FirebaseService.likePost(postId);
      }

      const actualLikeState = await FirebaseService.hasUserLikedPost(postId);
      
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (actualLikeState) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });

    } catch (error) {
      // Revert on error
      if (isCurrentlyLiked) {
        setLikedPosts(prev => new Set([...prev, postId]));
        setPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post
          )
        );
      } else {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setPosts(prev =>
          prev.map(post =>
            post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
          )
        );
      }
      
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setTimeout(() => {
        setLikingPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        setProcessingLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      }, 500);
    }
  };

  const handleChatPress = async (post: Post) => {
    if (chatLoadingPosts.has(post.id)) return;

    try {
      setChatLoadingPosts(prev => new Set([...prev, post.id]));
      
      const currentUserId = await getCurrentUserId();
      
      const navigationParams = {
        postId: post.id,
        postOwnerId: post.userId,
        isPostOwner: (post.userId === currentUserId).toString(),
        postText: post.text
      };
      
      router.push({
        pathname: '/chat',
        params: navigationParams
      });
      
    } catch (error) {
      Alert.alert('Error', 'Unable to open chat. Please try again.');
    } finally {
      setTimeout(() => {
        setChatLoadingPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(post.id);
          return newSet;
        });
      }, 1000);
    }
  };

  // Long press handler
  const handleLongPress = (post: Post, event: any) => {
    const { pageY } = event.nativeEvent;
    
    setSelectedPost(post);
    setMenuPosition({
      x: width / 2 - 100, // Center horizontally
      y: Math.min(pageY - 50, height - 200), // Ensure menu doesn't go off screen
    });
    setShowMenu(true);
  };

  // Pin post handler
  const handlePinPost = () => {
    if (!selectedPost) return;
    
    setPinnedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(selectedPost.id)) {
        newSet.delete(selectedPost.id);
      } else {
        newSet.add(selectedPost.id);
      }
      return newSet;
    });
    
    setShowMenu(false);
    setSelectedPost(null);
  };

  // Share to WhatsApp handler
  const handleShareToWhatsApp = async () => {
    if (!selectedPost) return;
    
    try {
      const shareText = `"${selectedPost.text}"\n\n- Shared from Unfold App`;
      
      // Try to open WhatsApp directly
      const whatsappURL = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappURL);
      
      if (canOpen) {
        await Linking.openURL(whatsappURL);
      } else {
        // Fallback to native share if WhatsApp is not available
        await Share.share({
          message: shareText,
          title: 'Share Post',
        });
      }
    } catch (error) {
      // Fallback to native share
      try {
        const shareText = `"${selectedPost.text}"\n\n- Shared from Unfold App`;
        await Share.share({
          message: shareText,
          title: 'Share Post',
        });
      } catch (shareError) {
        Alert.alert('Error', 'Unable to share post. Please try again.');
      }
    } finally {
      setShowMenu(false);
      setSelectedPost(null);
    }
  };

  const closeMenu = () => {
    setShowMenu(false);
    setSelectedPost(null);
  };

  // Separate pinned and regular posts
  const pinnedPostsData = posts.filter(post => pinnedPosts.has(post.id));
  const regularPostsData = posts.filter(post => !pinnedPosts.has(post.id));
  
  // Combine them with pinned posts first
  const sortedPosts = [...pinnedPostsData, ...regularPostsData];

  // ✅ UPDATED: renderPost with location indicator
  const renderPost = ({ item, isPinned = false }: { item: Post; isPinned?: boolean }) => {
    const isLiked = likedPosts.has(item.id);
    const isLiking = likingPosts.has(item.id);
    const isChatLoading = chatLoadingPosts.has(item.id);
    // Use contemplating as fallback for old posts that might not match new emotions
    const emotion = emotionTheme[item.emotionTag] || emotionTheme.contemplating;
    const isProcessing = processingLikes.has(item.id) || isLiking;
    
    return (
      <TouchableOpacity
        style={[
          styles.postCard, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border 
          },
          isPinned && {
            borderColor: colors.primary,
            borderWidth: 2,
            shadowColor: colors.primary,
            shadowOpacity: 0.1,
          }
        ]}
        activeOpacity={0.95}
        onLongPress={(event) => handleLongPress(item, event)}
        delayLongPress={500}
      >
        {/* Pinned indicator */}
        {isPinned && (
          <View style={[styles.pinnedIndicator, { backgroundColor: colors.primary }]}>
            <Pin size={12} color="white" />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}

        {/* Enhanced emotion indicator with emoji */}
        <View style={styles.postHeader}>
          <View style={[styles.emotionIndicator, { backgroundColor: emotion.light }]}>
            <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
          </View>
          <Text style={[styles.emotionLabel, { color: emotion.color }]}>
            {emotion.label}
          </Text>
          
          {/* ✅ NEW: Location indicator */}
          {item.isLocal && (
            <View style={[styles.localIndicator, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.localText, { color: colors.primary }]}>📍 Near you</Text>
            </View>
          )}
          
          <View style={styles.spacer} />
          <Text style={[styles.timeText, { color: colors.text + '40' }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>

        {/* Post content */}
        <Text style={[styles.postText, { color: colors.text }]}>
          {item.text}
        </Text>

        {/* Enhanced actions bar */}
        <View style={[styles.postActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              isLiked && { backgroundColor: emotion.light },
              isProcessing && styles.disabledButton
            ]} 
            onPress={() => handleLike(item.id)}
            disabled={isProcessing}
            activeOpacity={isProcessing ? 1 : 0.7}
          >
            {isLiking ? (
              <ActivityIndicator size="small" color={emotion.color} />
            ) : (
              <Heart 
                size={16}
                color={isLiked ? emotion.color : colors.text + (isProcessing ? '30' : '50')}
                fill={isLiked ? emotion.color : 'transparent'}
              />
            )}
            {item.likes > 0 && (
              <Text style={[
                styles.actionCount, 
                { color: isLiked ? emotion.color : colors.text + (isProcessing ? '40' : '60') }
              ]}>
                {item.likes}
              </Text>
            )}
          </TouchableOpacity>

          {item.openForChat && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => handleChatPress(item)}
              disabled={isChatLoading}
              activeOpacity={0.7}
            >
              {isChatLoading ? (
                <ActivityIndicator size="small" color={emotion.color} />
              ) : (
                <>
                  <MessageCircle size={16} color={colors.text + '50'} />
                  <Text style={[styles.actionLabel, { color: colors.text + '60' }]}>
                    Chat
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ✅ UPDATED: renderHeader with location info
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
      {/* Clean title with location */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, { color: colors.text }]}>
          Explore
        </Text>
        <Text style={[styles.subtitle, { color: colors.text + '50' }]}>
          {userLocation 
            ? `Stories from ${userLocation} and beyond` 
            : 'Connect through shared feelings'
          }
        </Text>
      </View>

      {/* ✅ NEW: Location info banner */}
      {userLocation && (
        <View style={[styles.locationBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MapPin size={14} color={colors.primary} />
          <Text style={[styles.locationText, { color: colors.text + '70' }]}>
            Showing posts from your area and other places
          </Text>
        </View>
      )}

      {/* Updated filter pills with new emotions */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterPill,
            filter === null && [
              styles.activeFilter, 
              { backgroundColor: colors.primary, borderColor: colors.primary }
            ],
            { borderColor: colors.border }
          ]}
          onPress={() => setFilter(null)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.filterText, 
            { color: filter === null ? 'white' : colors.text + '70' }
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {emotions.map((emotion: EmotionType) => {
          const isSelected = filter === emotion;
          const theme = emotionTheme[emotion];
          
          return (
            <TouchableOpacity
              key={emotion}
              style={[
                styles.filterPill,
                { borderColor: isSelected ? theme.color : colors.border },
                isSelected && { backgroundColor: theme.color }
              ]}
              onPress={() => setFilter(emotion)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterEmoji}>{theme.emoji}</Text>
              <Text style={[
                styles.filterText,
                { color: isSelected ? 'white' : colors.text + '70' }
              ]}>
                {theme.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Long press menu component
  const LongPressMenu = () => (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
      onRequestClose={closeMenu}
    >
      <TouchableWithoutFeedback onPress={closeMenu}>
        <View style={styles.menuOverlay}>
          <TouchableWithoutFeedback>
            <View 
              style={[
                styles.menuContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  left: menuPosition.x,
                  top: menuPosition.y,
                }
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handlePinPost}
                activeOpacity={0.7}
              >
                <Pin 
                  size={18} 
                  color={selectedPost && pinnedPosts.has(selectedPost.id) ? colors.primary : colors.text + '70'} 
                />
                <Text style={[
                  styles.menuItemText, 
                  { 
                    color: selectedPost && pinnedPosts.has(selectedPost.id) ? colors.primary : colors.text 
                  }
                ]}>
                  {selectedPost && pinnedPosts.has(selectedPost.id) ? 'Unpin' : 'Pin Post'}
                </Text>
              </TouchableOpacity>
              
              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleShareToWhatsApp}
                activeOpacity={0.7}
              >
                <Send size={18} color={colors.text + '70'} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Share to WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text + '60' }]}>
            Loading stories...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Elegant motivational overlay */}
      {showMotivational && (
        <View style={[
          styles.motivationalOverlay, 
          { 
            backgroundColor: colors.primary,
            top: insets.top + 80 
          }
        ]}>
          <View style={styles.motivationalContent}>
            <Sparkles size={20} color="white" style={styles.sparkleIcon} />
            <Text style={styles.motivationalText}>{motivationalQuote}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={sortedPosts}
        renderItem={({ item }) => renderPost({ 
          item, 
          isPinned: pinnedPosts.has(item.id) 
        })}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={insets.top + 100}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.border }]}>
              <MessageCircle size={24} color={colors.text + '40'} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {filter ? `No ${emotionTheme[filter]?.label || 'filtered'} stories yet` : 'No stories to explore'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text + '50' }]}>
              Be the first to share your feelings and connect with others
            </Text>
          </View>
        )}
      />

      {/* Long press menu */}
      <LongPressMenu />
    </View>
  );
}

const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  
  // Elegant motivational overlay
  motivationalOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  motivationalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  sparkleIcon: {
    opacity: 0.9,
  },
  motivationalText: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  
  // Ultra-clean header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleSection: {
    marginBottom: 20,
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
  
  // ✅ NEW: Location banner styles
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  
  // Refined filter pills
  filtersContainer: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingRight: 20,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 50,
  },
  activeFilter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  filterEmoji: {
    fontSize: 14,
  },
  
  // Content
  listContent: {
    paddingBottom: 32,
  },
  
  // Refined post cards
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
  
  // Pinned post indicator
  pinnedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  pinnedText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  emotionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emotionEmoji: {
    fontSize: 16,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  
  // ✅ NEW: Local post indicator styles
  localIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  localText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  spacer: {
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  postText: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontWeight: '400',
  },
  
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Long press menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    position: 'absolute',
    width: 200,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  
  // Empty state
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
})