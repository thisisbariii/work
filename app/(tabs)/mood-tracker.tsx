import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { FirebaseService } from '@/services/firebaseService';
import { MoodEntry, EmotionType } from '@/types';
import { getCurrentUserId } from '@/utils/anonymousAuth';
import { Sparkles, TrendingUp, Heart, RefreshCw } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const emotionColors = {
  sad: '#6366f1',
  angry: '#ef4444',
  anxious: '#f59e0b',
  guilty: '#8b5cf6',
  happy: '#10b981',
  empty: '#06b6d4',
};

const emotionBackgrounds = {
  sad: '#f8fafc',
  angry: '#fef2f2',
  anxious: '#fffbeb',
  guilty: '#faf5ff',
  happy: '#f0fdf4',
  empty: '#f0f9ff',
};

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

const emotionIcons = {
  sad: '💙',
  angry: '🔥',
  anxious: '⚡',
  guilty: '💜',
  happy: '✨',
  empty: '○',
};

const moodDescriptors = {
  sad: 'moments of reflection',
  angry: 'intense feelings',
  anxious: 'restless energy', 
  guilty: 'heavy thoughts',
  happy: 'bright moments',
  empty: 'quiet spaces',
};

export default function MoodTrackerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month'>('week');

  const loadMoodData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const userId = await getCurrentUserId();
      const entries = await FirebaseService.getMoodEntries(userId);
      
      const validEntries = entries.filter(entry => {
        const isValid = entry.userId === userId;
        return isValid;
      });
      
      setMoodEntries(validEntries);
      
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadMoodData();
      } catch (error) {
        setLoading(false);
      }
    };
    initializeData();
  }, [loadMoodData]);

  useFocusEffect(
    useCallback(() => {
      const refreshData = async () => {
        try {
          await loadMoodData();
        } catch (error) {
          // Silent fail
        }
      };
      refreshData();
    }, [loadMoodData])
  );

  const handleRefresh = useCallback(() => {
    loadMoodData(true);
  }, [loadMoodData]);

  const getConsistencyLevel = () => {
    if (moodEntries.length === 0) return 'Just starting';
    if (moodEntries.length < 7) return 'Building routine';
    if (moodEntries.length < 21) return 'Growing awareness';
    return 'Mindful journey';
  };

  const getTimeframeData = () => {
    const data = [];
    const today = new Date();
    const days = selectedTimeframe === 'week' ? 7 : 14;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayEntries = moodEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate.toDateString() === date.toDateString();
      });
      
      let intensity = 'none';
      let dominantMood = null;
      
      if (dayEntries.length > 0) {
        dominantMood = dayEntries[dayEntries.length - 1].mood;
        intensity = dayEntries.length === 1 ? 'light' : dayEntries.length === 2 ? 'moderate' : 'full';
      }
      
      data.push({
        date: date.getDate(),
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        intensity,
        dominantMood,
        hasEntries: dayEntries.length > 0,
        entries: dayEntries
      });
    }
    
    return data;
  };

  const getMoodFlow = () => {
    if (moodEntries.length === 0) return [];
    
    const flow: { [key in EmotionType]: number } = {
      'happy': 0, 'sad': 0, 'anxious': 0, 'angry': 0, 'guilty': 0, 'empty': 0
    };
    
    moodEntries.forEach(entry => {
      flow[entry.mood]++;
    });
    
    return Object.entries(flow)
      .map(([mood, count]) => ({
        mood: mood as EmotionType,
        count,
        presence: count === 0 ? 'none' : count < 3 ? 'light' : count < 7 ? 'moderate' : 'strong'
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);
  };

  if (loading) {
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

  const chartData = getTimeframeData();
  const moodFlow = getMoodFlow();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Mood Journey</Text>
          <Text style={[styles.subtitle, { color: colors.text + '50' }]}>
            Understanding your emotional patterns
          </Text>
        </View>

        <View style={styles.insightsSection}>
          <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.insightIcon, { backgroundColor: emotionBackgrounds.happy }]}>
              <Sparkles size={16} color={emotionColors.happy} />
            </View>
            <Text style={[styles.insightLabel, { color: colors.text }]}>Journey Stage</Text>
            <Text style={[styles.insightValue, { color: colors.text + '60' }]}>
              {getConsistencyLevel()}
            </Text>
          </View>
          
          <View style={[styles.insightCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.insightIcon, { backgroundColor: emotionBackgrounds.happy }]}>
              <Heart size={16} color={emotionColors.happy} />
            </View>
            <Text style={[styles.insightLabel, { color: colors.text }]}>Recent Focus</Text>
            <Text style={[styles.insightValue, { color: colors.text + '60' }]}>
              {moodEntries.length > 0 ? 'Active reflection' : 'Getting started'}
            </Text>
          </View>
        </View>

        <View style={[styles.entryCountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.entryCountNumber, { color: colors.text }]}>{moodEntries.length}</Text>
          <Text style={[styles.entryCountLabel, { color: colors.text + '60' }]}>
            Total mood entries recorded
          </Text>
        </View>

        <View style={styles.timeframeSwitcher}>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selectedTimeframe === 'week' && [styles.activeTimeframe, { backgroundColor: colors.primary }],
              { borderColor: colors.border }
            ]}
            onPress={() => setSelectedTimeframe('week')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.timeframeText,
              { color: selectedTimeframe === 'week' ? 'white' : colors.text + '70' }
            ]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeframeButton,
              selectedTimeframe === 'month' && [styles.activeTimeframe, { backgroundColor: colors.primary }],
              { borderColor: colors.border }
            ]}
            onPress={() => setSelectedTimeframe('month')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.timeframeText,
              { color: selectedTimeframe === 'month' ? 'white' : colors.text + '70' }
            ]}>
              Two Weeks
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Patterns</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text + '50' }]}>
            Your emotional flow over time
          </Text>
          
          <View style={styles.visualChart}>
            {chartData.map((day, index) => (
              <View key={index} style={styles.dayColumn}>
                <View style={styles.dayIndicator}>
                  <View
                    style={[
                      styles.moodDot,
                      {
                        backgroundColor: day.hasEntries && day.dominantMood 
                          ? emotionColors[day.dominantMood] 
                          : colors.border,
                        opacity: day.intensity === 'none' ? 0.2 : 
                                day.intensity === 'light' ? 0.5 :
                                day.intensity === 'moderate' ? 0.8 : 1,
                        transform: [{ 
                          scale: day.intensity === 'none' ? 0.5 : 
                                 day.intensity === 'light' ? 0.7 :
                                 day.intensity === 'moderate' ? 0.9 : 1 
                        }]
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.dayLabel, { color: colors.text + '50' }]}>
                  {selectedTimeframe === 'week' ? day.dayName : day.date}
                </Text>
              </View>
            ))}
          </View>
          
          <View style={styles.chartLegend}>
            <Text style={[styles.legendText, { color: colors.text + '50' }]}>
              Dots show presence and intensity of emotional sharing
            </Text>
          </View>
        </View>

        {moodFlow.length > 0 && (
          <View style={[styles.flowContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Emotional Landscape</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text + '50' }]}>
              The feelings you've been exploring
            </Text>
            
            {moodFlow.slice(0, 6).map((item, index) => (
              <View key={item.mood} style={styles.flowRow}>
                <View style={styles.flowLeft}>
                  <View style={[
                    styles.flowIconContainer,
                    { backgroundColor: emotionBackgrounds[item.mood] }
                  ]}>
                    <Text style={styles.flowIcon}>{emotionIcons[item.mood]}</Text>
                  </View>
                  <View style={styles.flowContent}>
                    <Text style={[styles.flowLabel, { color: colors.text }]}>
                      {emotionLabels[item.mood]}
                    </Text>
                    <Text style={[styles.flowDescription, { color: colors.text + '60' }]}>
                      {moodDescriptors[item.mood]}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.flowRight}>
                  <View style={[styles.presenceIndicator, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.presenceBar,
                        {
                          width: item.presence === 'light' ? '25%' :
                                 item.presence === 'moderate' ? '60%' : '100%',
                          backgroundColor: emotionColors[item.mood],
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.presenceText, { color: emotionColors[item.mood] }]}>
                    {item.count} times
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {moodEntries.length > 0 && (
          <View style={[styles.recentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Reflections</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text + '50' }]}>
              Your latest emotional check-ins
            </Text>
            
            {moodEntries.slice(0, 5).map((entry, index) => (
              <View key={entry.id || index} style={[styles.entryRow, { borderBottomColor: colors.border }]}>
                <View style={styles.entryLeft}>
                  <View style={[
                    styles.entryIconContainer,
                    { backgroundColor: emotionBackgrounds[entry.mood] }
                  ]}>
                    <Text style={styles.entryIcon}>{emotionIcons[entry.mood]}</Text>
                  </View>
                  <View style={styles.entryContent}>
                    <Text style={[styles.entryMood, { color: colors.text }]}>
                      {emotionLabels[entry.mood]} moment
                    </Text>
                    <Text style={[styles.entryDate, { color: colors.text + '50' }]}>
                      {new Date(entry.timestamp).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </Text>
                    {entry.notes && (
                      <Text style={[styles.entryNotes, { color: colors.text + '70' }]} numberOfLines={2}>
                        "{entry.notes}"
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={[
                  styles.moodBadge,
                  { backgroundColor: emotionBackgrounds[entry.mood] }
                ]}>
                  <Text style={[
                    styles.moodBadgeText,
                    { color: emotionColors[entry.mood] }
                  ]}>
                    {emotionLabels[entry.mood]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {moodEntries.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.border }]}>
              <Sparkles size={24} color={colors.text + '40'} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Begin Your Journey</Text>
            <Text style={[styles.emptySubtitle, { color: colors.text + '50' }]}>
              Start sharing your feelings to discover patterns and insights about your emotional well-being
            </Text>
          </View>
        )}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
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
  
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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

  entryCountCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  entryCountNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  entryCountLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  
  insightsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  insightCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  insightValue: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },

  timeframeSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  activeTimeframe: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  timeframeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  visualChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 16,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayIndicator: {
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  chartLegend: {
    alignItems: 'center',
  },
  legendText: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  flowContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  flowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flowIcon: {
    fontSize: 14,
  },
  flowContent: {
    flex: 1,
  },
  flowLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  flowDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  flowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  presenceIndicator: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  presenceBar: {
    height: '100%',
    borderRadius: 2,
  },
  presenceText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  recentContainer: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  entryLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  entryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryIcon: {
    fontSize: 14,
  },
  entryContent: {
    flex: 1,
  },
  entryMood: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  entryNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  moodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  emptyState: {
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