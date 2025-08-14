import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl,
  Platform,
  Keyboard,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { AITherapyService } from '@/services/aiTherapyService';
import { Send, Bot, User, AlertTriangle, ArrowLeft } from 'lucide-react-native';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

const { height: screenHeight } = Dimensions.get('window');

export default function AIChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm here to listen and support you. What's on your mind today? 💙",
      isUser: false,
      timestamp: Date.now(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCrisisAlert, setShowCrisisAlert] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
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

  // Auto-scroll to bottom when messages change or keyboard appears
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isKeyboardVisible]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Check for crisis language
    if (AITherapyService.detectCrisis(userMessage.text)) {
      setShowCrisisAlert(true);
    }

    try {
      const aiResponse = await AITherapyService.sendMessage(userMessage.text);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now, but I want you to know that your feelings matter and you're not alone. 💙",
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      <View style={styles.messageHeader}>
        {item.isUser ? (
          <User size={16} color={colors.text + '80'} />
        ) : (
          <Bot size={16} color={colors.primary} />
        )}
        <Text style={[styles.messageAuthor, { color: colors.text + '80' }]}>
          {item.isUser ? 'You' : 'AI Therapist'}
        </Text>
      </View>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: item.isUser ? colors.primary : colors.card,
          borderColor: colors.border,
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: item.isUser ? 'white' : colors.text }
        ]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <>
      {/* Custom Header that extends to top */}
      <View style={[
        styles.headerContainer, 
        { 
          backgroundColor: colors.background,
          paddingTop: insets.top,
          borderBottomColor: colors.border 
        }
      ]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>AI Therapy</Text>
            <Text style={[styles.headerSubtitle, { color: colors.text + '80' }]}>
              Safe • Confidential • Always Available
            </Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      {/* Crisis Alert */}
      {showCrisisAlert && (
        <View style={[styles.crisisAlert, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <AlertTriangle size={20} color="#EF4444" />
          <View style={styles.crisisTextContainer}>
            <Text style={[styles.crisisTitle, { color: '#DC2626' }]}>Emergency Support</Text>
            <Text style={[styles.crisisText, { color: '#7F1D1D' }]}>
              If you're in crisis, please reach out for immediate help.
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.crisisButton}
            onPress={() => setShowCrisisAlert(false)}>
            <Text style={{ color: '#DC2626', fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderFooter = () => (
    <View style={{ height: 100 }} /> // Spacer to ensure content doesn't get cut off
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              : 80 // Height for input container
          }
        ]}
        contentContainerStyle={[
          styles.messagesContent,
          { 
            paddingBottom: 20,
          }
        ]}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            progressViewOffset={insets.top + 60} // Account for header height
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (messages.length > 1) { // Don't auto-scroll on initial load
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onLayout={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />
      
      {/* Fixed Input Container */}
      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: colors.card, 
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' 
            ? Math.max(insets.bottom, 16) 
            : 16,
          position: 'absolute',
          bottom: isKeyboardVisible ? keyboardHeight : 0,
          left: 0,
          right: 0,
        }
      ]}>
        <TextInput
          style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
          placeholder="Share what's on your mind..."
          placeholderTextColor={colors.text + '60'}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          textAlignVertical="top"
          onFocus={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 300);
          }}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: colors.primary,
              opacity: inputText.trim() && !isLoading ? 1 : 0.5,
            }
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}>
          <Send size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    flexGrow: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  crisisAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  crisisTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  crisisTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  crisisText: {
    fontSize: 12,
    marginTop: 2,
  },
  crisisButton: {
    padding: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  messageContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});