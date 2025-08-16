import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Share, Compass, Bot, Moon, Sun, Gamepad2, Timer, Eye, ArrowRight } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [selectedQuickMood, setSelectedQuickMood] = useState<string | null>(null);

  // Updated quick mood options with new emotion tags
  const quickMoods = [
    { emotion: 'chaotic', emoji: '🌪️', label: 'Chaotic' },
    { emotion: 'vibing', emoji: '✨', label: 'Vibing' },
    { emotion: 'drained', emoji: '🔋', label: 'Drained' },
    { emotion: 'overthinking', emoji: '🧠', label: 'Overthinking' },
    { emotion: 'excited', emoji: '🚀', label: 'Excited' },
  ];

  const menuItems = [
    {
      title: 'Explore Stories',
      subtitle: 'Connect with others\' experiences',
      icon: Compass,
      onPress: () => router.push('/explore'),
    },
    {
      title: 'AI Therapist',
      subtitle: 'Get supportive guidance',
      icon: Bot,
      onPress: () => router.push('/ai-chat'),
    },
  ];

  const handleQuickMoodShare = (mood: string) => {
    setSelectedQuickMood(mood);
    // Navigate to share screen with pre-selected mood
    router.push({ pathname: '/share', params: { preselectedMood: mood } });
  };

  const handleQuickVent = () => {
    // Navigate to share screen with quick vent mode
    router.push({ pathname: '/share', params: { quickVent: 'true' } });
  };

  // Apple-style logo with standout "T"
  const renderLogo = () => {
    return (
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, { color: colors.text }]}>
          Un
        </Text>
        
        {/* Special Script-style "T" */}
        <View style={styles.specialTContainer}>
          <Text style={[
            styles.specialT,
            { 
              color: colors.primary,
              textShadowColor: isDark ? colors.primary + '40' : colors.primary + '20',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 8,
              // Script/handwritten style
              fontStyle: 'italic',
              transform: [{ rotate: '-8deg' }],
            }
          ]}>
            𝒯
          </Text>
          {/* Subtle accent dot */}
          <View style={[
            styles.accentDot,
            { backgroundColor: colors.accent }
          ]} />
        </View>
        
        <Text style={[styles.logoText, { color: colors.text }]}>
          old
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { marginTop: Platform.OS === 'ios' ? 20 : 40 }]}>
          <TouchableOpacity 
            onPress={toggleTheme} 
            style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
          >
            {isDark ? 
              <Sun size={20} color={colors.text} /> : 
              <Moon size={20} color={colors.text} />
            }
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/emergency')}
            style={[styles.playButton, { backgroundColor: colors.primary }]}
          >
            <Gamepad2 size={18} color="white" />
            <Text style={[styles.playButtonText]}>Play & Heal</Text>
          </TouchableOpacity>
        </View>

        {/* Logo Section */}
        <View style={styles.logoSection}>
          {renderLogo()}
          
          <Text style={[styles.tagline, { color: colors.text + '90' }]}>
            Your safe space to share and heal
          </Text>
        </View>

        {/* Quick Mood Entry Section */}
        <View style={styles.quickSection}>
          <Text style={[styles.quickTitle, { color: colors.text }]}>
            What's your vibe right now?
          </Text>
          
          <View style={styles.quickMoodsGrid}>
            {quickMoods.map((mood, index) => (
              <TouchableOpacity
                key={mood.emotion}
                style={[
                  styles.quickMoodChip,
                  {
                    backgroundColor: selectedQuickMood === mood.emotion 
                      ? colors.primary + '20' 
                      : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderColor: selectedQuickMood === mood.emotion 
                      ? colors.primary 
                      : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  }
                ]}
                onPress={() => handleQuickMoodShare(mood.emotion)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickMoodEmoji}>{mood.emoji}</Text>
                <Text style={[
                  styles.quickMoodLabel,
                  { color: selectedQuickMood === mood.emotion ? colors.primary : colors.text + '80' }
                ]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: colors.primary }]}
              onPress={handleQuickVent}
              activeOpacity={0.8}
            >
              <Timer size={16} color="white" />
              <Text style={styles.quickActionText}>Quick vent (30 sec)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionButton,
                { 
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                }
              ]}
              onPress={() => router.push('/explore')}
              activeOpacity={0.8}
            >
              <Eye size={16} color={colors.text} />
              <Text style={[styles.quickActionTextOutline, { color: colors.text }]}>
                See what others are saying
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Preview - Updated with new emotion tags */}
        <View style={styles.previewSection}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              Recent moments
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/explore')}
              style={styles.previewSeeAll}
            >
              <Text style={[styles.previewSeeAllText, { color: colors.primary }]}>
                See all
              </Text>
              <ArrowRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Preview Cards - Updated with new emotion examples */}
          <View style={styles.previewCards}>
            <View style={[
              styles.previewCard,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }
            ]}>
              <View style={styles.previewCardHeader}>
                <Text style={styles.previewEmoji}>🧠</Text>
                <Text style={[styles.previewMood, { color: colors.text + '70' }]}>
                  Overthinking • 2h ago
                </Text>
              </View>
              <Text style={[styles.previewText, { color: colors.text + '90' }]}>
                "Can't stop thinking about that conversation from yesterday..."
              </Text>
              <View style={styles.previewStats}>
                <Text style={[styles.previewStat, { color: colors.text + '50' }]}>
                  💙 12 people relate
                </Text>
              </View>
            </View>

            <View style={[
              styles.previewCard,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }
            ]}>
              <View style={styles.previewCardHeader}>
                <Text style={styles.previewEmoji}>✨</Text>
                <Text style={[styles.previewMood, { color: colors.text + '70' }]}>
                  Vibing • 4h ago
                </Text>
              </View>
              <Text style={[styles.previewText, { color: colors.text + '90' }]}>
                "Finally found a song that matches my exact mood today"
              </Text>
              <View style={styles.previewStats}>
                <Text style={[styles.previewStat, { color: colors.text + '50' }]}>
                  ✨ 28 people relate
                </Text>
              </View>
            </View>

            <View style={[
              styles.previewCard,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }
            ]}>
              <View style={styles.previewCardHeader}>
                <Text style={styles.previewEmoji}>🌪️</Text>
                <Text style={[styles.previewMood, { color: colors.text + '70' }]}>
                  Chaotic • 6h ago
                </Text>
              </View>
              <Text style={[styles.previewText, { color: colors.text + '90' }]}>
                "Everything happening at once, trying to find my center"
              </Text>
              <View style={styles.previewStats}>
                <Text style={[styles.previewStat, { color: colors.text + '50' }]}>
                  💙 15 people relate
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
              }]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <item.icon size={20} color={colors.text} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.menuSubtitle, { color: colors.text + '80' }]}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text + '60' }]}>
            Anonymous • Safe • Supportive
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  playButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    height: 60,
  },
  logoText: {
    fontSize: 42,
    letterSpacing: -1,
    includeFontPadding: false,
    fontWeight: '400',
  },
  specialTContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -2,
  },
  specialT: {
    fontSize: 55,
    fontWeight: '400',
    letterSpacing: -1,
    lineHeight: 55,
    includeFontPadding: false,
    textDecorationLine: 'none',
  },
  accentDot: {
    position: 'absolute',
    top: 8,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
  },

  // Quick Mood Section
  quickSection: {
    marginBottom: 30,
  },
  quickTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickMoodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 20,
  },
  quickMoodChip: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  quickMoodEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  quickMoodLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Quick Actions
  quickActions: {
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  quickActionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  quickActionTextOutline: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Preview Section
  previewSection: {
    marginBottom: 30,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewSeeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  previewSeeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewCards: {
    gap: 12,
  },
  previewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  previewEmoji: {
    fontSize: 16,
  },
  previewMood: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  previewStats: {
    flexDirection: 'row',
  },
  previewStat: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Menu
  menu: {
    gap: 0,
    marginBottom: 30,
  },
  menuItem: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    marginBottom: 2,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
});