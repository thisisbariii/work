import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Phone, Heart, Sparkles, Circle, Waves, Star, Cloud, X, Plus } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Game Components
interface GameProps {
  onClose: () => void;
  colors: any;
}

// Zen Puzzle Game - Interactive Pattern Matching
const ZenPuzzleGame = ({ onClose, colors }: GameProps) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [showPattern, setShowPattern] = useState(true);

  const zenColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    generatePattern();
  }, [level]);

  const generatePattern = () => {
    const newPattern = Array.from({ length: level + 2 }, () => Math.floor(Math.random() * 6));
    setPattern(newPattern);
    setUserPattern([]);
    setShowPattern(true);
    setTimeout(() => setShowPattern(false), 2000 + level * 500);
  };

  const addToUserPattern = (colorIndex: number) => {
    if (showPattern) return;
    
    const newUserPattern = [...userPattern, colorIndex];
    setUserPattern(newUserPattern);

    if (newUserPattern.length === pattern.length) {
      if (JSON.stringify(newUserPattern) === JSON.stringify(pattern)) {
        setScore(prev => prev + 10);
        setLevel(prev => prev + 1);
        setTimeout(generatePattern, 1000);
      } else {
        Alert.alert('Almost!', 'Try to remember the pattern. You\'re doing great! 🌟');
        setTimeout(generatePattern, 1500);
      }
    }
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gameHeader, { borderBottomColor: colors.border, paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: colors.text }]}>Zen Puzzle</Text>
        <Text style={[styles.gameScore, { color: colors.primary }]}>Level {level} • Score {score}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X  size= {20} color={colors.text }  />
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <Text style={[styles.puzzleInstructions, { color: colors.text }]}>
          {showPattern ? 'Watch the pattern...' : 'Repeat the pattern!'}
        </Text>
        
        <View style={styles.puzzleGrid}>
          {zenColors.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.puzzleButton,
                {
                  backgroundColor: color,
                  opacity: showPattern && pattern.includes(index) ? 1 : 
                          showPattern ? 0.3 :
                          userPattern.includes(index) ? 1 : 0.6,
                  transform: [{ scale: showPattern && pattern[pattern.length - userPattern.length - 1] === index ? 1.1 : 1 }]
                }
              ]}
              onPress={() => addToUserPattern(index)}
              disabled={showPattern}
            />
          ))}
        </View>
        
        <Text style={[styles.gameInstructions, { color: colors.text + '60' }]}>
          Watch the pattern, then tap colors in the same order 🧩
        </Text>
      </View>
    </View>
  );
};

// Virtual Garden Game - Plant and Grow
const VirtualGardenGame = ({ onClose, colors }: GameProps) => {
  const [plants, setPlants] = useState<Array<{id: number, type: string, growth: number, x: number, y: number}>>([]);
  const [selectedSeed, setSelectedSeed] = useState('flower');
  const [waterLevel, setWaterLevel] = useState(100);

  const plantTypes = [
    { id: 'flower', emoji: '🌸', name: 'Peace Flower' },
    { id: 'tree', emoji: '🌳', name: 'Calm Tree' },
    { id: 'herb', emoji: '🌿', name: 'Serenity Herb' },
    { id: 'sun', emoji: '🌻', name: 'Joy Sunflower' }
  ];

  const plantSeed = (event: any) => {
    if (waterLevel < 10) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const newPlant = {
      id: Date.now(),
      type: selectedSeed,
      growth: 0,
      x: locationX - 20,
      y: locationY - 20
    };
    
    setPlants(prev => [...prev, newPlant]);
    setWaterLevel(prev => prev - 10);
  };

  const waterPlants = () => {
    setPlants(prev => prev.map(plant => ({
      ...plant,
      growth: Math.min(plant.growth + 25, 100)
    })));
    setWaterLevel(100);
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gameHeader, { borderBottomColor: colors.border, paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: colors.text }]}>Virtual Garden</Text>
        <Text style={[styles.gameScore, { color: colors.primary }]}>Plants: {plants.length} • Water: {waterLevel}%</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X  size ={20} color={colors.text }  />
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <View style={styles.seedSelector}>
          {plantTypes.map(plant => (
            <TouchableOpacity
              key={plant.id}
              style={[
                styles.seedButton,
                {
                  backgroundColor: selectedSeed === plant.id ? colors.primary + '20' : colors.card,
                  borderColor: selectedSeed === plant.id ? colors.primary : colors.border
                }
              ]}
              onPress={() => setSelectedSeed(plant.id)}
            >
              <Text style={styles.seedEmoji}>{plant.emoji}</Text>
              <Text style={[styles.seedName, { color: colors.text }]}>{plant.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.gardenArea, { backgroundColor: colors.card + '40' }]} onTouchStart={plantSeed}>
          {plants.map(plant => {
            const plantType = plantTypes.find(p => p.id === plant.type);
            return (
              <View
                key={plant.id}
                style={[
                  styles.plant,
                  {
                    left: plant.x,
                    top: plant.y,
                    opacity: 0.3 + (plant.growth / 100) * 0.7,
                    transform: [{ scale: 0.5 + (plant.growth / 100) * 0.5 }]
                  }
                ]}
              >
                <Text style={styles.plantEmoji}>{plantType?.emoji}</Text>
              </View>
            );
          })}
          {plants.length === 0 && (
            <View style={styles.emptyGarden}>
              <Text style={[styles.emptyGardenText, { color: colors.text + '60' }]}>
                Tap to plant seeds of calm 🌱
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.waterButton,
            { 
              backgroundColor: colors.primary,
              opacity: waterLevel < 100 ? 1 : 0.5
            }
          ]}
          onPress={waterPlants}
          disabled={waterLevel >= 100}
        >
          <Text style={styles.waterButtonText}>💧 Water Garden</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Happy Memory Game - Card Matching
const HappyMemoryGame = ({ onClose, colors }: GameProps) => {
  const [cards, setCards] = useState<Array<{id: number, emoji: string, isFlipped: boolean, isMatched: boolean}>>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);

  const happyEmojis = ['😊', '🌟', '🌈', '🦋', '🌸', '☀️', '🎵', '💝'];

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const gameEmojis = happyEmojis.slice(0, 6);
    const cardPairs = [...gameEmojis, ...gameEmojis];
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    
    setCards(shuffled.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false
    })));
  };

  const flipCard = (cardId: number) => {
    if (flippedCards.length >= 2) return;
    if (cards[cardId].isFlipped || cards[cardId].isMatched) return;

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);
    setMoves(prev => prev + 1);

    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlippedCards.length === 2) {
      const [first, second] = newFlippedCards;
      if (cards[first].emoji === cards[second].emoji) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            card.id === first || card.id === second 
              ? { ...card, isMatched: true }
              : card
          ));
          setScore(prev => prev + 10);
          setFlippedCards([]);
        }, 1000);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            card.id === first || card.id === second 
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
        }, 1500);
      }
    }
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gameHeader, { borderBottomColor: colors.border, paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: colors.text }]}>Happy Memory</Text>
        <Text style={[styles.gameScore, { color: colors.primary }]}>Score: {score} • Moves: {moves}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X  size={20} color={colors.text } />
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <View style={styles.memoryGrid}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.memoryCard,
                {
                  backgroundColor: card.isFlipped || card.isMatched ? '#f0fdf4' : colors.card,
                  borderColor: card.isMatched ? '#10b981' : colors.border
                }
              ]}
              onPress={() => flipCard(card.id)}
            >
              <Text style={styles.cardEmoji}>
                {card.isFlipped || card.isMatched ? card.emoji : '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: colors.primary }]}
          onPress={initializeGame}
        >
          <Text style={styles.resetButtonText}>New Game</Text>
        </TouchableOpacity>

        <Text style={[styles.gameInstructions, { color: colors.text + '60' }]}>
          Find matching pairs of happy symbols! 💝
        </Text>
      </View>
    </View>
  );
};

// Constellation Maker Game - Connect the Stars
const ConstellationMakerGame = ({ onClose, colors }: GameProps) => {
  const [stars, setStars] = useState<Array<{id: number, x: number, y: number, connected: boolean}>>([]);
  const [connections, setConnections] = useState<Array<{from: number, to: number}>>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    generateStars();
  }, []);

  const generateStars = () => {
    const newStars = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: 50 + Math.random() * (width - 100),
      y: 50 + Math.random() * 300,
      connected: false
    }));
    setStars(newStars);
  };

  const connectStar = (starId: number) => {
    const lastConnected = connections.length > 0 ? connections[connections.length - 1].to : null;
    
    if (lastConnected !== null && lastConnected !== starId) {
      setConnections(prev => [...prev, { from: lastConnected, to: starId }]);
      setScore(prev => prev + 1);
    }
    
    setStars(prev => prev.map(star => 
      star.id === starId ? { ...star, connected: true } : star
    ));
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: '#000020' }]}>
      <View style={[styles.gameHeader, { borderBottomColor: '#333', paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: 'white' }]}>Constellation Maker</Text>
        <Text style={[styles.gameScore, { color: '#60a5fa' }]}>Connections: {connections.length}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size= {20} color={'white' }/>
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <View style={styles.starField}>
          {/* Draw connections */}
          {connections.map((conn, index) => {
            const fromStar = stars.find(s => s.id === conn.from);
            const toStar = stars.find(s => s.id === conn.to);
            if (!fromStar || !toStar) return null;
            
            return (
              <View
                key={index}
                style={[
                  styles.starConnection,
                  {
                    left: fromStar.x,
                    top: fromStar.y,
                    width: Math.sqrt((toStar.x - fromStar.x) ** 2 + (toStar.y - fromStar.y) ** 2),
                    transform: [
                      { rotate: `${Math.atan2(toStar.y - fromStar.y, toStar.x - fromStar.x)}rad` }
                    ]
                  }
                ]}
              />
            );
          })}
          
          {/* Draw stars */}
          {stars.map(star => (
            <TouchableOpacity
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.x - 10,
                  top: star.y - 10,
                  backgroundColor: star.connected ? '#fbbf24' : '#60a5fa'
                }
              ]}
              onPress={() => connectStar(star.id)}
            >
<Star size={12} color="white" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.constellationControls}>
          <TouchableOpacity
            style={[styles.newConstellationButton, { backgroundColor: '#60a5fa' }]}
            onPress={() => {
              generateStars();
              setConnections([]);
              setScore(0);
            }}
          >
            <Text style={styles.newConstellationText}>New Sky</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.gameInstructions, { color: 'white' }]}>
          Tap stars to connect them and create your constellation ⭐
        </Text>
      </View>
    </View>
  );
};

const crisisResources = [
  {
    name: 'Crisis Text Line',
    number: '741741',
    action: 'Text HOME',
    description: '24/7 text crisis support',
    type: 'text'
  },
  {
    name: 'National Suicide Prevention',
    number: '988',
    action: 'Call',
    description: '24/7 crisis counseling',
    type: 'call'
  },
  {
    name: 'Mental Health Crisis',
    number: '1-800-662-4357', 
    action: 'Call',
    description: 'SAMHSA National Helpline',
    type: 'call'
  },
];

const calmingActivities = [
  {
    id: 'breathing',
    title: '4-7-8 Breathing',
    description: 'Guided breathing exercise',
    icon: Sparkles,
    color: '#10b981'
  },
  {
    id: 'grounding',
    title: '5-4-3-2-1 Grounding',
    description: 'Focus on your senses',
    icon: Star,
    color: '#6366f1'
  },
  {
    id: 'affirmations',
    title: 'Positive Affirmations',
    description: 'Gentle self-compassion',
    icon: Heart,
    color: '#ef4444'
  }
];

const premiumGames = [
  {
    id: 'puzzle',
    title: 'Zen Puzzle',
    description: 'Pattern memory challenge',
    icon: Star,
    color: '#ec4899',
    component: ZenPuzzleGame
  },
  {
    id: 'garden',
    title: 'Virtual Garden',
    description: 'Plant & grow peace',
    icon: Sparkles,
    color: '#059669',
    component: VirtualGardenGame
  },
  {
    id: 'memory',
    title: 'Happy Memory',
    description: 'Match joyful symbols',
    icon: Heart,
    color: '#f97316',
    component: HappyMemoryGame
  },
  {
    id: 'stars',
    title: 'Constellation Maker',
    description: 'Connect cosmic patterns',
    icon: Star,
    color: '#0891b2',
    component: ConstellationMakerGame
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  },
  helpSection: {
    margin: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
  },
  helpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  helpSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
    width: '100%',
  },
  helpButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpButtonContent: {
    flex: 1,
  },
  helpButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  helpButtonSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  breathingContainer: {
    margin: 20,
    marginTop: 0,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  breathingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  breathingPhase: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stopButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activitiesSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  activityDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  premiumSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  premiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  premiumCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  premiumCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  premiumCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  premiumCardDescription: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
    marginBottom: 8,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  reminderSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  reminderSectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  reminderSectionText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Game container styles
  gameContainer: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  gameTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  gameScore: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 16,
  },
  closeButton: {
    padding: 8,
  },
  gameArea: {
    flex: 1,
    padding: 20,
  },
  gameInstructions: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 20,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Zen Puzzle Game
  puzzleInstructions: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  puzzleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  puzzleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  // Virtual Garden Game
  seedSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  seedButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    flex: 1,
    minWidth: '22%',
  },
  seedEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  seedName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  gardenArea: {
    height: 250,
    borderRadius: 16,
    marginBottom: 20,
    position: 'relative',
  },
  plant: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantEmoji: {
    fontSize: 24,
  },
  emptyGarden: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyGardenText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  waterButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  waterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Happy Memory Game
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  memoryCard: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 24,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Constellation Maker Game
  starField: {
    height: 350,
    position: 'relative',
    marginBottom: 20,
  },
  star: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starConnection: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#60a5fa',
    opacity: 0.7,
  },
  constellationControls: {
    alignItems: 'center',
  },
  newConstellationButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  newConstellationText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function EmergencyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [currentActivity, setCurrentActivity] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<any>(null);
  
  const breathingScale = useRef(new Animated.Value(1)).current;

  const makeCall = (number: string) => {
    Linking.openURL(`tel:${number}`);
  };

  const sendText = () => {
    Linking.openURL('sms:741741&body=HOME');
  };

  const startBreathingExercise = () => {
    setBreathingActive(true);
    setCurrentActivity('breathing');
    runBreathingCycle();
  };

  const runBreathingCycle = () => {
    setBreathingPhase('inhale');
    Animated.timing(breathingScale, {
      toValue: 1.5,
      duration: 4000,
      useNativeDriver: true,
    }).start(() => {
      setBreathingPhase('hold');
      setTimeout(() => {
        setBreathingPhase('exhale');
        Animated.timing(breathingScale, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            if (breathingActive) {
              runBreathingCycle();
            }
          }, 8000);
        });
      }, 7000);
    });
  };

  const stopBreathingExercise = () => {
    setBreathingActive(false);
    setCurrentActivity(null);
    Animated.timing(breathingScale, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const startActivity = (activityId: string) => {
    setCurrentActivity(activityId);
    
    switch (activityId) {
      case 'breathing':
        startBreathingExercise();
        break;
      case 'grounding':
        Alert.alert(
          '5-4-3-2-1 Grounding Exercise',
          'Look around and name:\n\n• 5 things you can see\n• 4 things you can touch\n• 3 things you can hear\n• 2 things you can smell\n• 1 thing you can taste\n\nTake your time with each step.',
          [{ text: 'Start Now', onPress: () => setCurrentActivity(null) }]
        );
        break;
      case 'affirmations':
        Alert.alert(
          'Positive Affirmations',
          'Repeat these gentle phrases:\n\n• "I am safe right now"\n• "This feeling will pass"\n• "I am worthy of love and care"\n• "I am doing the best I can"\n• "I am not alone"\n\nSay each one slowly and with intention.',
          [{ text: 'Begin', onPress: () => setCurrentActivity(null) }]
        );
        break;
    }
  };

  const startGame = (game: any) => {
    setCurrentGame(game);
  };

  const animatedStyle = {
    transform: [{ scale: breathingScale }],
  };

  // Render current game if one is active
  if (currentGame && currentGame.component) {
    const GameComponent = currentGame.component;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GameComponent onClose={() => setCurrentGame(null)} colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header, 
        { 
          borderBottomColor: colors.border,
          paddingTop: insets.top + 16
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
<ArrowLeft size={22} color={colors.text} />

        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Emergency Support</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text + '50' }]}>
            Immediate help & calming activities
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.helpSection, { backgroundColor: colors.card, borderColor: '#e2e8f0' }]}>
          <View style={[styles.helpIcon, { backgroundColor: '#f1f5f9' }]}>
<Phone size={20} color="#64748b" />
          </View>
          <Text style={[styles.helpTitle, { color: colors.text }]}>Need Someone to Talk To?</Text>
          <Text style={[styles.helpSubtitle, { color: colors.text + '60' }]}>
            Professional support is available 24/7
          </Text>
          
          {crisisResources.map((resource, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.helpButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => resource.type === 'text' ? sendText() : makeCall(resource.number)}
              activeOpacity={0.7}
            >
              <View style={[styles.helpButtonIcon, { backgroundColor: '#f1f5f9' }]}>
<Phone size={16} color="#64748b" />

              </View>
              <View style={styles.helpButtonContent}>
                <Text style={[styles.helpButtonTitle, { color: colors.text }]}>
                  {resource.action} {resource.number}
                </Text>
                <Text style={[styles.helpButtonSubtitle, { color: colors.text + '60' }]}>
                  {resource.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {breathingActive && (
          <View style={[styles.breathingContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.breathingTitle, { color: colors.text }]}>
              4-7-8 Breathing Exercise
            </Text>
            <Text style={[styles.breathingPhase, { color: colors.primary }]}>
              {breathingPhase === 'inhale' && 'Breathe In (4s)'}
              {breathingPhase === 'hold' && 'Hold Gently (7s)'}
              {breathingPhase === 'exhale' && 'Breathe Out (8s)'}
            </Text>
            
            <Animated.View style={[
              styles.breathingCircle, 
              { backgroundColor: colors.primary + '30', borderColor: colors.primary }, 
              animatedStyle
            ]}>
<Sparkles size={32} color={colors.primary} />

            </Animated.View>
            
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={stopBreathingExercise}
              activeOpacity={0.7}
            >
              <Text style={[styles.stopButtonText, { color: colors.text }]}>Stop Exercise</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.activitiesSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Relief</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text + '50' }]}>
            Simple exercises for immediate calm
          </Text>
          
          <View style={styles.activitiesGrid}>
            {calmingActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityCard, 
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => startActivity(activity.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.activityIcon, { backgroundColor: activity.color + '20' }]}>
<activity.icon size={20} color={activity.color} />

                </View>
                <Text style={[styles.activityTitle, { color: colors.text }]}>
                  {activity.title}
                </Text>
                <Text style={[styles.activityDescription, { color: colors.text + '60' }]}>
                  {activity.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.premiumSection, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.premiumHeader}>
            <View style={[styles.premiumIcon, { backgroundColor: colors.primary + '20' }]}>
<Star size={20} color={colors.primary} />

            </View>
            <Text style={[styles.premiumTitle, { color: colors.text }]}>Therapeutic Games</Text>
            <Text style={[styles.premiumSubtitle, { color: colors.text + '60' }]}>
              Playable now • Test these calming experiences
            </Text>
          </View>
          
          <View style={styles.premiumGrid}>
            {premiumGames.map((game) => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.premiumCard, 
                  { 
                    backgroundColor: colors.background,
                    borderColor: game.color + '40'
                  }
                ]}
                onPress={() => startGame(game)}
                activeOpacity={0.7}
              >
                <View style={[styles.premiumCardIcon, { backgroundColor: game.color + '20' }]}>
<game.icon size={18} color={game.color} />


                </View>
                <Text style={[styles.premiumCardTitle, { color: colors.text }]}>
                  {game.title}
                </Text>
                <Text style={[styles.premiumCardDescription, { color: colors.text + '60' }]}>
                  {game.description}
                </Text>
                <View style={[styles.premiumBadge, { backgroundColor: game.color }]}>
                  <Text style={styles.premiumBadgeText}>Play Now</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.reminderSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.reminderSectionIcon, { backgroundColor: colors.primary + '20' }]}>
<Heart size={20} color={colors.primary} />

          </View>
          <Text style={[styles.reminderSectionTitle, { color: colors.text }]}>
            You're Not Alone
          </Text>
          <Text style={[styles.reminderSectionText, { color: colors.text + '60' }]}>
            These feelings are temporary. You are stronger than you know, and support is always available.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}