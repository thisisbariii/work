import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EmotionType } from '@/types';
import { emotionColors, emotionEmojis, emotionLabels } from '@/utils/emotions';
import { useTheme } from '@/contexts/ThemeContext';

interface EmotionSelectorProps {
  selectedEmotion: EmotionType;
  onSelectEmotion: (emotion: EmotionType) => void;
  emotions?: EmotionType[];
}

export default function EmotionSelector({ 
  selectedEmotion, 
  onSelectEmotion, 
  emotions = ['sad', 'angry', 'anxious', 'guilty', 'happy', 'empty'] 
}: EmotionSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {emotions.map((emotion) => (
        <TouchableOpacity
          key={emotion}
          style={[
            styles.emotionTag,
            {
              backgroundColor: selectedEmotion === emotion 
                ? emotionColors[emotion] 
                : colors.card,
              borderColor: emotionColors[emotion],
            }
          ]}
          onPress={() => onSelectEmotion(emotion)}>
          <Text style={styles.emotionEmoji}>{emotionEmojis[emotion]}</Text>
          <Text style={[
            styles.emotionLabel,
            {
              color: selectedEmotion === emotion 
                ? 'white' 
                : colors.text,
            }
          ]}>
            {emotionLabels[emotion]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 100,
  },
  emotionEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  emotionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});