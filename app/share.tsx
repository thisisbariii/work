import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { FirebaseService } from '@/services/firebaseService';
import { EmotionType } from '@/types';
import { ArrowLeft, Send, MessageCircle, Heart, Clock, MapPin } from 'lucide-react-native';

const MAX_CHARS = 500;
const QUICK_VENT_TIMER = 30; // 30 seconds for quick vent

// Updated: More relatable, Gen Z-friendly emotion tags
const emotionTheme = {
  chaotic: { 
    bg: '#fef2f2', 
    border: '#fee2e2', 
    accent: '#ef4444',
    label: 'Chaotic',
    emoji: '🌪️'
  },
  overthinking: { 
    bg: '#fffbeb', 
    border: '#fef3c7', 
    accent: '#f59e0b',
    label: 'Overthinking',
    emoji: '🧠'
  },
  drained: { 
    bg: '#f0f4ff', 
    border: '#e0e7ff', 
    accent: '#6366f1',
    label: 'Drained',
    emoji: '🔋'
  },
  vibing: { 
    bg: '#f0fdf4', 
    border: '#d1fae5', 
    accent: '#10b981',
    label: 'Vibing',
    emoji: '✨'
  },
  frustrated: { 
    bg: '#faf5ff', 
    border: '#f3e8ff', 
    accent: '#8b5cf6',
    label: 'Frustrated',
    emoji: '😤'
  },
  contemplating: { 
    bg: '#f9fafb', 
    border: '#f3f4f6', 
    accent: '#6b7280',
    label: 'Contemplating',
    emoji: '💭'
  },
  excited: { 
    bg: '#fff7ed', 
    border: '#fed7aa', 
    accent: '#f97316',
    label: 'Excited',
    emoji: '🚀'
  },
  nostalgic: { 
    bg: '#fdf2f8', 
    border: '#fce7f3', 
    accent: '#ec4899',
    label: 'Nostalgic',
    emoji: '🌅'
  },
};

// Updated: More engaging prompts
const emotionPrompts = {
  chaotic: "What's the chaos in your world right now?",
  overthinking: "What's been spinning in your mind lately?",
  drained: "What's been taking your energy today?",
  vibing: "Share what's making you feel good...",
  frustrated: "What's not going the way you wanted?",
  contemplating: "What deep thoughts are you having?",
  excited: "What's got you pumped up right now?",
  nostalgic: "What memory or feeling are you revisiting?",
};

// Quick vent specific prompts
const quickVentPrompts = [
  "What's on your mind right now?",
  "What happened today?",
  "How are you really feeling?",
  "What do you need to get off your chest?",
  "Share your current mood...",
];

// Simple local storage helper
const storeLastPostDate = async (date: string) => {
  try {
    console.log('Storing last post date:', date);
  } catch (error) {
    console.log('Error storing date:', error);
  }
};

export default function ShareScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Handle URL parameters
  const preselectedMood = params.preselectedMood as EmotionType;
  const isQuickVent = params.quickVent === 'true';
  
  const [text, setText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>(
    preselectedMood || 'chaotic'
  );
  const [openForChat, setOpenForChat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickVentTimer, setQuickVentTimer] = useState(QUICK_VENT_TIMER);
  const [isQuickVentMode, setIsQuickVentMode] = useState(isQuickVent);
  
  // ✅ NEW: Location state
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Updated emotions array
  const emotions: EmotionType[] = ['chaotic', 'overthinking', 'drained', 'vibing', 'frustrated', 'contemplating', 'excited', 'nostalgic'];

  // ✅ NEW: Load user location on component mount
  useEffect(() => {
    const loadUserLocation = async () => {
      try {
        setLocationLoading(true);
        const location = await FirebaseService.getCurrentLocation();
        if (location) {
          setUserLocation(`${location.city}, ${location.state}`);
        }
      } catch (error) {
        console.log('Could not load location');
      } finally {
        setLocationLoading(false);
      }
    };
    
    loadUserLocation();
  }, []);

  // Quick vent timer effect
  useEffect(() => {
    let interval: any;
    
    if (isQuickVentMode && quickVentTimer > 0) {
      interval = setInterval(() => {
        setQuickVentTimer(prev => {
          if (prev <= 1) {
            // Time's up - auto submit if there's text
            if (text.trim()) {
              handleSubmit();
            } else {
              setIsQuickVentMode(false);
              Alert.alert(
                'Time\'s up!', 
                'Take your time to share when you\'re ready.',
                [{ text: 'Continue writing' }]
              );
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isQuickVentMode, quickVentTimer, text]);

  // Set random prompt for quick vent mode
  const getQuickVentPrompt = () => {
    return quickVentPrompts[Math.floor(Math.random() * quickVentPrompts.length)];
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Share your thoughts', 'Write something before sharing your feelings');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the post (location will be automatically added in FirebaseService)
      await FirebaseService.createPost(text.trim(), selectedEmotion, openForChat);
      
      // Updated emotion to intensity mapping
      const emotionToIntensity = {
        'chaotic': 3, 'overthinking': 4, 'drained': 2, 'vibing': 8, 
        'frustrated': 3, 'contemplating': 5, 'excited': 9, 'nostalgic': 6
      };
      
      await FirebaseService.addMoodEntry(
        selectedEmotion, 
        emotionToIntensity[selectedEmotion],
        `Shared: ${text.trim().substring(0, 50)}...`
      );
      
      // Record last post date
      await storeLastPostDate(new Date().toDateString());
      
      const successMessage = isQuickVentMode 
        ? 'Quick vent shared! Sometimes getting it out fast is exactly what you need.' 
        : 'Your feelings have been shared anonymously. Thank you for being brave and authentic.';
      
      Alert.alert(
        'Shared with Care',
        successMessage,
        [{ text: 'Continue', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(
        'Saved for Later',
        'No connection right now. Your post will be shared when you\'re back online.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTheme = emotionTheme[selectedEmotion];

  // Get appropriate placeholder text
  const getPlaceholder = () => {
    if (isQuickVentMode) {
      return getQuickVentPrompt();
    }
    return emotionPrompts[selectedEmotion];
  };

  // Format timer display
  const formatTimer = (seconds: number) => {
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header extending to top */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isQuickVentMode ? 'Quick Vent' : 'Share Feelings'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text + '50' }]}>
            {isQuickVentMode ? 'Fast & Anonymous' : 'Safe • Anonymous • Supportive'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {isQuickVentMode && quickVentTimer > 0 && (
            <View style={[styles.timerContainer, { backgroundColor: currentTheme.accent + '20' }]}>
              <Clock size={12} color={currentTheme.accent} />
              <Text style={[styles.timerText, { color: currentTheme.accent }]}>
                {formatTimer(quickVentTimer)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ✅ NEW: Location info banner */}
        {userLocation && !isQuickVentMode && (
          <View style={[styles.locationBanner, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border }]}>
            <View style={styles.locationContent}>
              <MapPin size={16} color={currentTheme.accent} />
              <Text style={[styles.locationText, { color: colors.text + '70' }]}>
                Sharing from {userLocation}
              </Text>
            </View>
            <Text style={[styles.locationSubtext, { color: colors.text + '50' }]}>
              Your post will be visible to people in your area and beyond
            </Text>
          </View>
        )}

        {/* Quick Vent Mode Banner */}
        {isQuickVentMode && (
          <View style={[styles.quickVentBanner, { backgroundColor: currentTheme.bg, borderColor: currentTheme.border }]}>
            <Text style={[styles.quickVentTitle, { color: currentTheme.accent }]}>
              ⚡ Quick Vent Mode
            </Text>
            <Text style={[styles.quickVentDesc, { color: colors.text + '70' }]}>
              {quickVentTimer > 0 
                ? `Write whatever's on your mind. ${formatTimer(quickVentTimer)} left to share quickly!`
                : 'Take your time now. You can still share when ready.'
              }
            </Text>
            <TouchableOpacity 
              onPress={() => setIsQuickVentMode(false)}
              style={styles.exitQuickVent}
            >
              <Text style={[styles.exitQuickVentText, { color: colors.text + '60' }]}>
                Exit quick mode
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emotion selector - hide in quick vent mode initially */}
        {!isQuickVentMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>What's your vibe?</Text>
            <View style={styles.emotionsGrid}>
              {emotions.map((emotion) => {
                const isSelected = selectedEmotion === emotion;
                const theme = emotionTheme[emotion];
                
                return (
                  <TouchableOpacity
                    key={emotion}
                    style={[
                      styles.emotionChip,
                      {
                        backgroundColor: isSelected ? theme.bg : 'transparent',
                        borderColor: isSelected ? theme.accent : colors.border,
                      }
                    ]}
                    onPress={() => setSelectedEmotion(emotion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emotionEmoji}>{theme.emoji}</Text>
                    <Text style={[
                      styles.emotionLabel,
                      {
                        color: isSelected ? theme.accent : colors.text + '70',
                      }
                    ]}>
                      {theme.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Dynamic text input with emotion-based styling */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isQuickVentMode ? 'What\'s on your mind?' : 'Share your thoughts'}
          </Text>
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: currentTheme.bg,
              borderColor: currentTheme.border,
            }
          ]}>
            <TextInput
              style={[
                styles.textInput, 
                { 
                  color: colors.text,
                  minHeight: isQuickVentMode ? 80 : 120 
                }
              ]}
              placeholder={getPlaceholder()}
              placeholderTextColor={colors.text + '40'}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={MAX_CHARS}
              textAlignVertical="top"
              autoFocus={isQuickVentMode}
            />
            <View style={styles.inputFooter}>
              <View style={styles.inputMeta}>
                <Text style={styles.emotionEmoji}>{currentTheme.emoji}</Text>
                <Text style={[styles.emotionText, { color: currentTheme.accent }]}>
                  {currentTheme.label} {isQuickVentMode ? 'vent' : 'moment'}
                </Text>
              </View>
              <Text style={[styles.charCount, { color: colors.text + '50' }]}>
                {text.length}/{MAX_CHARS}
              </Text>
            </View>
          </View>
        </View>

        {/* Chat toggle - simplified in quick vent mode */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.chatToggle, 
              { 
                backgroundColor: openForChat ? currentTheme.bg : colors.card,
                borderColor: openForChat ? currentTheme.accent : colors.border,
              }
            ]}
            onPress={() => setOpenForChat(!openForChat)}
            activeOpacity={0.8}
          >
            <View style={styles.chatToggleLeft}>
              <View style={[
                styles.chatToggleIcon,
                { backgroundColor: openForChat ? currentTheme.accent + '20' : colors.border }
              ]}>
                <MessageCircle 
                  size={16}
                  color={openForChat ? currentTheme.accent : colors.text + '60'}
                />
              </View>
              <View style={styles.chatToggleContent}>
                <Text style={[
                  styles.chatToggleTitle, 
                  { color: openForChat ? currentTheme.accent : colors.text }
                ]}>
                  {isQuickVentMode ? 'Allow messages' : 'Allow supportive messages'}
                </Text>
                <Text style={[styles.chatToggleSubtitle, { color: colors.text + '50' }]}>
                  {isQuickVentMode 
                    ? 'Others can respond to help' 
                    : 'Others can send anonymous encouragement'
                  }
                </Text>
              </View>
            </View>
            
            <View style={[
              styles.switch,
              { backgroundColor: openForChat ? currentTheme.accent : colors.border }
            ]}>
              <View style={[
                styles.switchHandle,
                {
                  backgroundColor: 'white',
                  transform: [{ translateX: openForChat ? 18 : 2 }],
                }
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Encouragement note - different for quick vent */}
        <View style={[styles.encouragementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.encouragementIcon, { backgroundColor: currentTheme.bg }]}>
            <Heart size={16} color={currentTheme.accent} />
          </View>
          <View style={styles.encouragementContent}>
            <Text style={[styles.encouragementTitle, { color: colors.text }]}>
              {isQuickVentMode ? 'You\'re doing great' : 'Your feelings matter'}
            </Text>
            <Text style={[styles.encouragementText, { color: colors.text + '60' }]}>
              {isQuickVentMode 
                ? 'Sometimes we just need to get things out. That\'s perfectly okay.'
                : 'Sharing your emotions helps you process them and connect with others who understand.'
              }
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed submit button */}
      <View style={[
        styles.submitContainer, 
        { 
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 16)
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: text.trim() ? currentTheme.accent : colors.border,
              opacity: isSubmitting ? 0.7 : 1,
            }
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !text.trim()}
          activeOpacity={0.8}
        >
          <Send size={18} color="white" />
          <Text style={styles.submitButtonText}>
            {isSubmitting 
              ? 'Sharing safely...' 
              : isQuickVentMode 
                ? 'Share quick vent' 
                : 'Share anonymously'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header extending to top
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    width: 60,
    alignItems: 'flex-end',
  },
  
  // Timer
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // ✅ NEW: Location banner styles
  locationBanner: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  locationSubtext: {
    fontSize: 11,
    lineHeight: 16,
  },
  
  // Quick Vent Banner
  quickVentBanner: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickVentTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  quickVentDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  exitQuickVent: {
    alignSelf: 'flex-start',
  },
  exitQuickVentText: {
    fontSize: 11,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  
  // Sections
  section: {
    marginBottom: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.1,
  },
  
  // Emotion selection - Updated layout
  emotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  emotionChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: '30%',
    alignItems: 'center',
    marginBottom: 8,
  },
  emotionEmoji: {
    fontSize: 16,
    marginBottom: 4,
  },
  emotionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Text input
  inputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    padding: 20,
    paddingBottom: 16,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  inputMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Chat toggle
  chatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  chatToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  chatToggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatToggleContent: {
    flex: 1,
  },
  chatToggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatToggleSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  switch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    position: 'relative',
  },
  switchHandle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Encouragement card
  encouragementCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 20,
  },
  encouragementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  encouragementContent: {
    flex: 1,
  },
  encouragementTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  encouragementText: {
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Submit button
  submitContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});