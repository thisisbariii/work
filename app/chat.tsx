import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  Keyboard,
  Dimensions,
  Platform
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { FirebaseService } from '@/services/firebaseService';
import { getCurrentUserId } from '@/utils/anonymousAuth';
import { ChatMessage } from '@/types';
import { ArrowLeft, Send, Clock, MessageCircle } from 'lucide-react-native';

const { height: screenHeight } = Dimensions.get('window');

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Get parameters from navigation
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  const postOwnerId = params.postOwnerId as string;
  const isPostOwner = params.isPostOwner as string;
  const postText = params.postText as string;
  const existingChatId = params.chatId as string | undefined;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string | null>(existingChatId || null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [receiverId, setReceiverId] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(24 * 60 * 60 * 1000);
  const [loading, setLoading] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const messageListenerRef = useRef<(() => void) | null>(null);

  // Enhanced keyboard handling
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Auto-mark messages as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (chatId && postId) {
        loadChatMessages(postId, chatId);
        
        const markAsRead = async () => {
          try {
            await FirebaseService.markMessagesAsRead(postId, chatId);
          } catch (error) {
            // Silent error handling
          }
        };
        
        setTimeout(markAsRead, 500);
      }
    }, [chatId, postId])
  );

  useEffect(() => {
    initializeChat();
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
      if (messageListenerRef.current) {
        messageListenerRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (chatId && postId) {
      setupMessageListener(postId, chatId);
    }
    
    return () => {
      if (messageListenerRef.current) {
        messageListenerRef.current();
      }
    };
  }, [chatId, postId]);

  const initializeChat = async () => {
    try {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
      
      if (!postId) {
        throw new Error('Post ID is required');
      }
      
      if (!postOwnerId) {
        throw new Error('Post Owner ID is required');
      }
      
      if (!userId) {
        throw new Error('Current user ID is required');
      }
      
      const finalReceiverId = postOwnerId;
      setReceiverId(finalReceiverId);
      
      let finalChatId = existingChatId;
      
      if (!finalChatId) {
        const existingChat = await FirebaseService.findExistingChat(postId, userId, finalReceiverId);
        
        if (existingChat) {
          finalChatId = existingChat;
        } else {
          finalChatId = await FirebaseService.createChat(postId, finalReceiverId);
          
          const initialMessage: ChatMessage = {
            id: Date.now().toString(),
            fromUserId: userId,
            toUserId: finalReceiverId,
            text: `Hi! I saw your post${postText ? `: "${postText.substring(0, 100)}..."` : ''} and wanted to reach out. How are you doing?`,
            timestamp: Date.now(),
            isRead: undefined
          };
          
          await FirebaseService.sendMessage(postId, finalChatId, initialMessage);
        }
      }
      
      setChatId(finalChatId);
    } catch (error: any) {
      Alert.alert('Error', `Unable to start chat: ${error?.message || 'Unknown error'}`);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const setupMessageListener = async (postId: string, chatId: string) => {
    try {
      const { onSnapshot, collection, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      const messagesQuery = query(
        collection(db, 'posts', postId, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        const newMessages = snapshot.docs.map(doc => {
          const data = doc.data();
          const message = {
            id: doc.id,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            text: data.text,
            timestamp: data.timestamp?.toMillis() || Date.now(),
          };
          return message;
        }) as ChatMessage[];
        
        setMessages(newMessages);
        
        if (newMessages.length > 0) {
          try {
            await FirebaseService.markMessagesAsRead(postId, chatId);
          } catch (error) {
            // Silent error handling
          }
        }
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      messageListenerRef.current = unsubscribe;
      
    } catch (error) {
      await loadChatMessages(postId, chatId);
    }
  };

  const loadChatMessages = async (postId: string, chatId: string) => {
    try {
      const messages = await FirebaseService.getChatMessages(postId, chatId);
      setMessages(messages);
      
      if (messages.length > 0) {
        try {
          await FirebaseService.markMessagesAsRead(postId, chatId);
        } catch (error) {
          // Silent error handling
        }
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !chatId || !postId || !currentUserId || !receiverId) {
      return;
    }

    const messageText = inputText.trim();
    setInputText('');

    const message: ChatMessage = {
      id: Date.now().toString(),
      fromUserId: currentUserId,
      toUserId: receiverId,
      text: messageText,
      timestamp: Date.now(),
      isRead: undefined
    };

    try {
      await FirebaseService.sendMessage(postId, chatId, message);
    } catch (error) {
      setInputText(messageText);
      Alert.alert('Error', 'Failed to send message. Please check your connection and try again.');
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.fromUserId === currentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser 
            ? [styles.currentUserBubble, { backgroundColor: colors.primary }] 
            : [styles.otherUserBubble, { backgroundColor: colors.card, borderColor: colors.border }]
        ]}>
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? 'white' : colors.text }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.messageTime,
            { color: isCurrentUser ? 'rgba(255,255,255,0.6)' : colors.text + '40' }
          ]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <Text style={[styles.loadingText, { color: colors.text + '60' }]}>Starting chat...</Text>
        </View>
      </View>
    );
  }

  if (timeRemaining <= 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.expiredContainer, { paddingTop: insets.top }]}>
          <View style={[styles.expiredIcon, { backgroundColor: colors.border }]}>
            <Clock size={28} color={colors.text + '60'} />
          </View>
          <Text style={[styles.expiredTitle, { color: colors.text }]}>Chat Expired</Text>
          <Text style={[styles.expiredText, { color: colors.text + '60' }]}>
            This anonymous chat has expired after 24 hours for privacy and safety.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header extending to top */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.background, 
          borderBottomColor: colors.border,
          paddingTop: insets.top + 12
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Anonymous Chat</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text + '50' }]}>
            {formatTimeRemaining(timeRemaining)} remaining
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          {messages.length > 0 && (
            <View style={[styles.messageCount, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.messageCountText, { color: colors.primary }]}>
                {messages.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={[
          styles.messagesList,
          {
            marginBottom: isKeyboardVisible 
              ? Platform.OS === 'ios' 
                ? keyboardHeight - insets.bottom + 80
                : keyboardHeight + 80
              : 80
          }
        ]}
        contentContainerStyle={[
          styles.messagesContent,
          messages.length === 0 && styles.emptyMessagesContent
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.border }]}>
              <MessageCircle size={24} color={colors.text + '40'} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Start the conversation
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text + '50' }]}>
              Send a supportive message to connect
            </Text>
          </View>
        )}
      />

      {/* Fixed input container */}
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16),
          position: 'absolute',
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          left: 0,
          right: 0,
        }
      ]}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.textInput, 
              { 
                color: colors.text, 
                backgroundColor: colors.card,
                borderColor: colors.border
              }
            ]}
            placeholder="Send a supportive message..."
            placeholderTextColor={colors.text + '40'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={300}
            textAlignVertical="top"
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.border,
              }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            activeOpacity={0.7}
          >
            <Send size={16} color={inputText.trim() ? 'white' : colors.text + '40'} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  
  // Header extending to top
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonHeader: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  messageCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  messageCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
  emptyMessagesContent: {
    justifyContent: 'center',
  },
  messageContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  currentUserBubble: {
    borderBottomRightRadius: 6,
    borderWidth: 0,
  },
  otherUserBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.8,
  },
  
  // Input
  inputContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 44,
    fontWeight: '400',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    flex: 1,
    justifyContent: 'center',
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
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Expired state
  expiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  expiredIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  expiredTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  expiredText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    maxWidth: 280,
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});