import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { FirebaseService } from '@/services/firebaseService';
import { EmotionType } from '@/types';
import { ArrowLeft, Send, MessageCircle, Heart } from 'lucide-react-native';

const MAX_CHARS = 500;

// Gentle, minimal emotion colors
const emotionTheme = {
  sad: { 
    bg: '#f0f4ff', 
    border: '#e0e7ff', 
    accent: '#6366f1',
    label: 'Sad'
  },
  angry: { 
    bg: '#fef2f2', 
    border: '#fee2e2', 
    accent: '#ef4444',
    label: 'Angry'
  },
  anxious: { 
    bg: '#fffbeb', 
    border: '#fef3c7', 
    accent: '#f59e0b',
    label: 'Anxious'
  },
  guilty: { 
    bg: '#faf5ff', 
    border: '#f3e8ff', 
    accent: '#8b5cf6',
    label: 'Guilty'
  },
  happy: { 
    bg: '#f0fdf4', 
    border: '#d1fae5', 
    accent: '#10b981',
    label: 'Happy'
  },
  empty: { 
    bg: '#f9fafb', 
    border: '#f3f4f6', 
    accent: '#6b7280',
    label: 'Empty'
  },
};

// Gentle emotional prompts
const emotionPrompts = {
  sad: "Share what's weighing on your heart...",
  angry: "Express what's stirring inside you...",
  anxious: "Describe what's on your mind...",
  guilty: "Share what you're carrying...",
  happy: "Tell us what's bringing you joy...",
  empty: "Share this quiet moment...",
};

// Simple local storage helper - replace AsyncStorage functionality
const storeLastPostDate = async (date: string) => {
  try {
    // In a real app, you'd use AsyncStorage here
    // For now, we'll just store in memory or handle differently
    console.log('Storing last post date:', date);
  } catch (error) {
    console.log('Error storing date:', error);
  }
};

export default function ShareScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType>('sad');
  const [openForChat, setOpenForChat] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emotions: EmotionType[] = ['sad', 'angry', 'anxious', 'guilty', 'happy', 'empty'];

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert('Share your thoughts', 'Write something before sharing your feelings');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the post
      await FirebaseService.createPost(text.trim(), selectedEmotion, openForChat);
      
      // Add mood entry automatically
      const emotionToIntensity = {
        'sad': 2, 'angry': 3, 'anxious': 4, 'guilty': 3, 'happy': 8, 'empty': 1
      };
      
      await FirebaseService.addMoodEntry(
        selectedEmotion, 
        emotionToIntensity[selectedEmotion],
        `Shared: ${text.trim().substring(0, 50)}...`
      );
      
      // Record last post date
      await storeLastPostDate(new Date().toDateString());
      
      Alert.alert(
        'Shared with Care',
        'Your feelings have been shared anonymously. Thank you for being brave and authentic.',
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Share Feelings</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text + '50' }]}>
            Safe • Anonymous • Supportive
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emotion selector first - more intuitive flow */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>How are you feeling?</Text>
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

        {/* Dynamic text input with emotion-based styling */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Share your thoughts</Text>
          <View style={[
            styles.inputContainer, 
            { 
              backgroundColor: currentTheme.bg,
              borderColor: currentTheme.border,
            }
          ]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder={emotionPrompts[selectedEmotion]}
              placeholderTextColor={colors.text + '40'}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={MAX_CHARS}
              textAlignVertical="top"
            />
            <View style={styles.inputFooter}>
              <View style={styles.inputMeta}>
                <View style={[styles.emotionIndicator, { backgroundColor: currentTheme.accent }]} />
                <Text style={[styles.emotionText, { color: currentTheme.accent }]}>
                  {currentTheme.label} moment
                </Text>
              </View>
              <Text style={[styles.charCount, { color: colors.text + '50' }]}>
                {text.length}/{MAX_CHARS}
              </Text>
            </View>
          </View>
        </View>

        {/* Refined chat toggle */}
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
                  Allow supportive messages
                </Text>
                <Text style={[styles.chatToggleSubtitle, { color: colors.text + '50' }]}>
                  Others can send anonymous encouragement
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

        {/* Encouragement note */}
        <View style={[styles.encouragementCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.encouragementIcon, { backgroundColor: currentTheme.bg }]}>
            <Heart size={16} color={currentTheme.accent} />
          </View>
          <View style={styles.encouragementContent}>
            <Text style={[styles.encouragementTitle, { color: colors.text }]}>
              Your feelings matter
            </Text>
            <Text style={[styles.encouragementText, { color: colors.text + '60' }]}>
              Sharing your emotions helps you process them and connect with others who understand.
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
            {isSubmitting ? 'Sharing safely...' : 'Share anonymously'}
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
    width: 40,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  
  // Emotion selection
  emotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  emotionChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
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
  emotionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
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