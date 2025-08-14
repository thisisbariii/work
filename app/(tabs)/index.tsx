import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { Share, Compass, Bot, Moon, Sun, Gamepad2 } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { colors, isDark, toggleTheme } = useTheme();

  const menuItems = [
    {
      title: 'Share Your Feelings',
      subtitle: 'Express yourself anonymously',
      icon: Share,
      onPress: () => router.push('/share'),
    },
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
      <View style={styles.content}>
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
      </View>
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
    marginBottom: 60,
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
    marginBottom: 80,
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
    fontWeight: '400', // Lighter weight for script style
    letterSpacing: -1,
    lineHeight: 55,
    includeFontPadding: false,
    // Script/handwritten characteristics
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
  menu: {
    gap: 0,
    marginBottom: 40,
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
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
});