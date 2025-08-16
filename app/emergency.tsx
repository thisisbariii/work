import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Animated, Dimensions, Modal } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Phone, Heart, Sparkles, Circle, Waves, Star, Cloud, X, Plus, Check } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Custom Alert Component
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'grounding' | 'affirmations';
}

const CustomAlert = ({ visible, title, message, onClose, type }: CustomAlertProps) => {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const groundingSteps = [
    "Look around and name 5 things you can see",
    "Touch and name 4 things you can feel", 
    "Listen and name 3 things you can hear",
    "Smell and name 2 things you can smell",
    "Taste and name 1 thing you can taste"
  ];

  const affirmations = [
    "I am safe right now",
    "This feeling will pass", 
    "I am worthy of love and care",
    "I am doing the best I can",
    "I am not alone"
  ];

  const steps = type === 'grounding' ? groundingSteps : affirmations;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      setCurrentStep(0);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.alertOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[
          styles.alertContainer,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ scale: scaleAnim }]
          }
        ]}>
          <View style={styles.alertHeader}>
            <View style={[styles.alertIcon, { backgroundColor: colors.primary + '20' }]}>
              {type === 'grounding' ? (
                <Star size={24} color={colors.primary} />
              ) : (
                <Heart size={24} color={colors.primary} />
              )}
            </View>
            <Text style={[styles.alertTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.alertCloseButton}>
              <X size={20} color={colors.text + '60'} />
            </TouchableOpacity>
          </View>

          <View style={styles.alertContent}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { 
                    backgroundColor: colors.primary,
                    width: `${((currentStep + 1) / steps.length) * 100}%`
                  }
                ]} />
              </View>
              <Text style={[styles.progressText, { color: colors.text + '60' }]}>
                {currentStep + 1} of {steps.length}
              </Text>
            </View>

            <View style={[styles.stepContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={[styles.stepText, { color: colors.text }]}>
                {steps[currentStep]}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={nextStep}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              </Text>
              {currentStep !== steps.length - 1 && (
                <ArrowLeft size={16} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Game Components
interface GameProps {
  onClose: () => void;
  colors: any;
}

// Enhanced Zen Puzzle Game
const ZenPuzzleGame = ({ onClose, colors }: GameProps) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [showPattern, setShowPattern] = useState(true);
  const [success, setSuccess] = useState(false);

  const zenColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const buttonScale = useRef(zenColors.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    generatePattern();
  }, [level]);

  const generatePattern = () => {
    const newPattern = Array.from({ length: level + 2 }, () => Math.floor(Math.random() * 6));
    setPattern(newPattern);
    setUserPattern([]);
    setShowPattern(true);
    setSuccess(false);
    
    // Animate pattern display
    newPattern.forEach((colorIndex, index) => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(buttonScale[colorIndex], {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale[colorIndex], {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();
      }, index * 600);
    });

    setTimeout(() => setShowPattern(false), 2000 + level * 600);
  };

  const addToUserPattern = (colorIndex: number) => {
    if (showPattern) return;
    
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScale[colorIndex], {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale[colorIndex], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    const newUserPattern = [...userPattern, colorIndex];
    setUserPattern(newUserPattern);

    if (newUserPattern.length === pattern.length) {
      if (JSON.stringify(newUserPattern) === JSON.stringify(pattern)) {
        setSuccess(true);
        setScore(prev => prev + 10);
        setLevel(prev => prev + 1);
        setTimeout(generatePattern, 1500);
      } else {
        setTimeout(generatePattern, 1500);
      }
    }
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gameHeader, { borderBottomColor: colors.border, paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: colors.text }]}>Zen Puzzle</Text>
        <View style={styles.gameStats}>
          <Text style={[styles.gameScore, { color: colors.primary }]}>Level {level}</Text>
          <Text style={[styles.gameScore, { color: colors.primary }]}>Score {score}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <View style={[styles.gameStatus, { backgroundColor: colors.card }]}>
          <Text style={[styles.puzzleInstructions, { color: colors.text }]}>
            {showPattern ? '🧘‍♀️ Watch the pattern...' : '🎯 Repeat the pattern!'}
          </Text>
          {success && (
            <Text style={[styles.successText, { color: '#10b981' }]}>
              ✨ Perfect! Moving to next level...
            </Text>
          )}
        </View>
        
        <View style={styles.puzzleGrid}>
          {zenColors.map((color, index) => (
            <Animated.View
              key={index}
              style={[
                styles.puzzleButtonContainer,
                { transform: [{ scale: buttonScale[index] }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.puzzleButton,
                  {
                    backgroundColor: color,
                    opacity: showPattern ? 
                      (pattern.slice(0, Math.ceil((Date.now() % 10000) / 600)).includes(index) ? 1 : 0.4) :
                      (userPattern.includes(index) ? 1 : 0.7),
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }
                ]}
                onPress={() => addToUserPattern(index)}
                disabled={showPattern}
              >
                <View style={styles.puzzleButtonInner}>
                  <Sparkles size={24} color="white" />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        
        <Text style={[styles.gameInstructions, { color: colors.text + '60' }]}>
          Watch the pattern carefully, then tap colors in the same order 🧩
        </Text>
      </View>
    </View>
  );
};

// Enhanced Virtual Garden Game
const VirtualGardenGame = ({ onClose, colors }: GameProps) => {
  const [plants, setPlants] = useState<Array<{id: number, type: string, growth: number, x: number, y: number, planted: number}>>([]);
  const [selectedSeed, setSelectedSeed] = useState('flower');
  const [waterLevel, setWaterLevel] = useState(100);
  const [showWaterEffect, setShowWaterEffect] = useState(false);

  const plantTypes = [
    { id: 'flower', emoji: '🌸', name: 'Peace Flower', color: '#ec4899' },
    { id: 'tree', emoji: '🌳', name: 'Calm Tree', color: '#059669' },
    { id: 'herb', emoji: '🌿', name: 'Serenity Herb', color: '#10b981' },
    { id: 'sun', emoji: '🌻', name: 'Joy Sunflower', color: '#f59e0b' }
  ];

  const plantSeed = (event: any) => {
    if (waterLevel < 10) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const newPlant = {
      id: Date.now(),
      type: selectedSeed,
      growth: 0,
      x: Math.max(20, Math.min(locationX - 20, width - 60)),
      y: Math.max(20, Math.min(locationY - 20, 200)),
      planted: Date.now()
    };
    
    setPlants(prev => [...prev, newPlant]);
    setWaterLevel(prev => prev - 10);
  };

  const waterPlants = () => {
    setShowWaterEffect(true);
    setPlants(prev => prev.map(plant => ({
      ...plant,
      growth: Math.min(plant.growth + 25, 100)
    })));
    setWaterLevel(100);
    
    setTimeout(() => setShowWaterEffect(false), 2000);
  };

  const getPlantSize = (growth: number) => {
    return 0.5 + (growth / 100) * 0.8;
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.gameHeader, { borderBottomColor: colors.border, paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: colors.text }]}>Virtual Garden</Text>
        <View style={styles.gameStats}>
          <Text style={[styles.gameScore, { color: colors.primary }]}>Plants: {plants.length}</Text>
          <Text style={[styles.gameScore, { color: colors.primary }]}>Water: {waterLevel}%</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={colors.text} />
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
                  backgroundColor: selectedSeed === plant.id ? plant.color + '20' : colors.card,
                  borderColor: selectedSeed === plant.id ? plant.color : colors.border,
                  borderWidth: 2,
                }
              ]}
              onPress={() => setSelectedSeed(plant.id)}
            >
              <Text style={styles.seedEmoji}>{plant.emoji}</Text>
              <Text style={[styles.seedName, { color: colors.text }]}>{plant.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View 
          style={[
            styles.gardenArea, 
            { 
              backgroundColor: showWaterEffect ? '#e0f2fe' : colors.card + '40',
              borderColor: colors.border,
              borderWidth: 2,
              borderRadius: 16,
            }
          ]} 
          onTouchStart={plantSeed}
        >
          {showWaterEffect && (
            <View style={styles.waterEffectOverlay}>
              <Text style={styles.waterEffectText}>💧 ✨ Watering... ✨ 💧</Text>
            </View>
          )}
          
          {plants.map(plant => {
            const plantType = plantTypes.find(p => p.id === plant.type);
            const scale = getPlantSize(plant.growth);
            return (
              <View
                key={plant.id}
                style={[
                  styles.plant,
                  {
                    left: plant.x,
                    top: plant.y,
                    transform: [{ scale }]
                  }
                ]}
              >
                <Text style={[styles.plantEmoji, { fontSize: 28 }]}>{plantType?.emoji}</Text>
                {plant.growth < 100 && (
                  <View style={styles.growthBar}>
                    <View style={[
                      styles.growthFill,
                      { width: `${plant.growth}%`, backgroundColor: plantType?.color }
                    ]} />
                  </View>
                )}
              </View>
            );
          })}
          
          {plants.length === 0 && (
            <View style={styles.emptyGarden}>
              <Sparkles size={32} color={colors.text + '40'} />
              <Text style={[styles.emptyGardenText, { color: colors.text + '60' }]}>
                Tap anywhere to plant seeds of calm 🌱
              </Text>
              <Text style={[styles.emptyGardenSubtext, { color: colors.text + '40' }]}>
                Select a seed type above first
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.waterButton,
            { 
              backgroundColor: waterLevel < 100 ? colors.primary : colors.primary + '50'
            }
          ]}
          onPress={waterPlants}
          disabled={waterLevel >= 100}
        >
          <Text style={styles.waterButtonText}>
            💧 {waterLevel < 100 ? 'Water Garden' : 'Garden is Watered'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Enhanced Happy Memory Game
const HappyMemoryGame = ({ onClose, colors }: GameProps) => {
  const [cards, setCards] = useState<Array<{id: number, emoji: string, isFlipped: boolean, isMatched: boolean}>>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);

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
    
    setFlippedCards([]);
    setScore(0);
    setMoves(0);
    setMatches(0);
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
          setMatches(prev => prev + 1);
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
        <View style={styles.gameStats}>
          <Text style={[styles.gameScore, { color: colors.primary }]}>Score: {score}</Text>
          <Text style={[styles.gameScore, { color: colors.primary }]}>Moves: {moves}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <View style={[styles.gameStatus, { backgroundColor: colors.card }]}>
          <Text style={[styles.memoryStatus, { color: colors.text }]}>
            🎯 Matches: {matches}/6
          </Text>
          {matches === 6 && (
            <Text style={[styles.successText, { color: '#10b981' }]}>
              🎉 Congratulations! You found all matches!
            </Text>
          )}
        </View>

        <View style={styles.memoryGrid}>
          {cards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.memoryCard,
                {
                  backgroundColor: card.isFlipped || card.isMatched ? '#f0fdf4' : colors.card,
                  borderColor: card.isMatched ? '#10b981' : 
                              card.isFlipped ? colors.primary : colors.border,
                  borderWidth: 2,
                  shadowColor: card.isMatched ? '#10b981' : colors.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: card.isFlipped || card.isMatched ? 0.3 : 0,
                  shadowRadius: 4,
                  elevation: card.isFlipped || card.isMatched ? 4 : 0,
                }
              ]}
              onPress={() => flipCard(card.id)}
            >
              <Text style={[
                styles.cardEmoji,
                { fontSize: card.isFlipped || card.isMatched ? 28 : 24 }
              ]}>
                {card.isFlipped || card.isMatched ? card.emoji : '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: colors.primary }]}
          onPress={initializeGame}
        >
          <Text style={styles.resetButtonText}>🔄 New Game</Text>
        </TouchableOpacity>

        <Text style={[styles.gameInstructions, { color: colors.text + '60' }]}>
          Find matching pairs of happy symbols! 💝
        </Text>
      </View>
    </View>
  );
};

// Enhanced Constellation Maker Game
const ConstellationMakerGame = ({ onClose, colors }: GameProps) => {
  const [stars, setStars] = useState<Array<{id: number, x: number, y: number, connected: boolean}>>([]);
  const [connections, setConnections] = useState<Array<{from: number, to: number}>>([]);
  const [score, setScore] = useState(0);
  const [selectedStar, setSelectedStar] = useState<number | null>(null);

  useEffect(() => {
    generateStars();
  }, []);

  const generateStars = () => {
    const newStars = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * (width - 60),
      y: 50 + Math.random() * 300,
      connected: false
    }));
    setStars(newStars);
  };

  const connectStar = (starId: number) => {
    if (selectedStar === null) {
      setSelectedStar(starId);
      setStars(prev => prev.map(star => 
        star.id === starId ? { ...star, connected: true } : star
      ));
    } else if (selectedStar !== starId) {
      setConnections(prev => [...prev, { from: selectedStar, to: starId }]);
      setScore(prev => prev + 1);
      setStars(prev => prev.map(star => 
        star.id === starId ? { ...star, connected: true } : star
      ));
      setSelectedStar(starId);
    }
  };

  const clearConstellation = () => {
    setConnections([]);
    setSelectedStar(null);
    setStars(prev => prev.map(star => ({ ...star, connected: false })));
    setScore(0);
  };

  return (
    <View style={[styles.gameContainer, { backgroundColor: '#000020' }]}>
      <View style={[styles.gameHeader, { borderBottomColor: '#333', paddingTop: 40 }]}>
        <Text style={[styles.gameTitle, { color: 'white' }]}>Constellation Maker</Text>
        <View style={styles.gameStats}>
          <Text style={[styles.gameScore, { color: '#60a5fa' }]}>Connections: {connections.length}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={'white'} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.gameArea}>
        <View style={[styles.gameStatus, { backgroundColor: '#001122' }]}>
          <Text style={[styles.constellationStatus, { color: 'white' }]}>
            ⭐ {selectedStar !== null ? 'Tap another star to connect' : 'Tap a star to begin'}
          </Text>
        </View>

        <View style={styles.starField}>
          {/* Render connections as SVG-like lines */}
          {connections.map((conn, index) => {
            const fromStar = stars.find(s => s.id === conn.from);
            const toStar = stars.find(s => s.id === conn.to);
            if (!fromStar || !toStar) return null;
            
            const distance = Math.sqrt((toStar.x - fromStar.x) ** 2 + (toStar.y - fromStar.y) ** 2);
            const angle = Math.atan2(toStar.y - fromStar.y, toStar.x - fromStar.x) * 180 / Math.PI;
            
            return (
              <View
                key={index}
                style={[
                  styles.starConnection,
                  {
                    left: fromStar.x,
                    top: fromStar.y,
                    width: distance,
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor: '#60a5fa',
                    height: 2,
                    opacity: 0.8,
                    shadowColor: '#60a5fa',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 4,
                  }
                ]}
              />
            );
          })}
          
          {/* Render stars */}
          {stars.map(star => (
            <TouchableOpacity
              key={star.id}
              style={[
                styles.star,
                {
                  left: star.x - 12,
                  top: star.y - 12,
                  backgroundColor: star.id === selectedStar ? '#fbbf24' : 
                                  star.connected ? '#60a5fa' : '#94a3b8',
                  shadowColor: star.id === selectedStar ? '#fbbf24' : '#60a5fa',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: star.connected ? 0.8 : 0.4,
                  shadowRadius: star.id === selectedStar ? 8 : 4,
                  transform: [{ scale: star.id === selectedStar ? 1.2 : 1 }]
                }
              ]}
              onPress={() => connectStar(star.id)}
            >
              <Star size={14} color="white" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.constellationControls}>
          <TouchableOpacity
            style={[styles.constellationButton, { backgroundColor: '#60a5fa' }]}
            onPress={() => {
              generateStars();
              setConnections([]);
              setSelectedStar(null);
              setScore(0);
            }}
          >
            <Text style={styles.constellationButtonText}>🌌 New Sky</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.constellationButton, { backgroundColor: '#ef4444' }]}
            onPress={clearConstellation}
          >
            <Text style={styles.constellationButtonText}>🔄 Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.gameInstructions, { color: 'white' }]}>
          Tap stars to connect them and create your own constellation ⭐
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

  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  alertCloseButton: {
    padding: 4,
  },
  alertContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  stepContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Premium section - moved to top
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  premiumCardDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
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

  // Breathing exercise
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

  // Activities section
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

  // Help section - moved to bottom
  helpSection: {
    margin: 20,
    marginTop: 0,
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

  // Reminder section
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
    fontSize: 18,
    fontWeight: '700',
  },
  gameStats: {
    alignItems: 'flex-end',
  },
  gameScore: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  gameArea: {
    flex: 1,
    padding: 20,
  },
  gameStatus: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  gameInstructions: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: 20,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },

  // Zen Puzzle Game
  puzzleInstructions: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  puzzleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 30,
  },
  puzzleButtonContainer: {
    alignItems: 'center',
  },
  puzzleButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  puzzleButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  growthBar: {
    position: 'absolute',
    bottom: -8,
    left: 5,
    width: 30,
    height: 3,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  growthFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyGarden: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyGardenText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyGardenSubtext: {
    fontSize: 12,
    textAlign: 'center',
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
  waterEffectOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 242, 254, 0.8)',
    borderRadius: 16,
  },
  waterEffectText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0891b2',
  },

  // Happy Memory Game
  memoryStatus: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  memoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 30,
  },
  memoryCard: {
    width: 65,
    height: 65,
    borderRadius: 12,
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
  constellationStatus: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  starField: {
    height: 350,
    position: 'relative',
    marginBottom: 20,
  },
  star: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starConnection: {
    position: 'absolute',
  },
  constellationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  constellationButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  constellationButtonText: {
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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'grounding' | 'affirmations'>('grounding');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  
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
          }, 1000);
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
        setAlertType('grounding');
        setAlertTitle('5-4-3-2-1 Grounding Exercise');
        setAlertMessage('Follow each step slowly and mindfully');
        setAlertVisible(true);
        break;
      case 'affirmations':
        setAlertType('affirmations');
        setAlertTitle('Positive Affirmations');
        setAlertMessage('Repeat each phrase slowly and with intention');
        setAlertVisible(true);
        break;
    }
  };

  const startGame = (game: any) => {
    setCurrentGame(game);
  };

  const closeAlert = () => {
    setAlertVisible(false);
    setCurrentActivity(null);
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

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={closeAlert}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Therapeutic Games Section - Now at top */}
        <View style={[styles.premiumSection, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={styles.premiumHeader}>
            <View style={[styles.premiumIcon, { backgroundColor: colors.primary + '20' }]}>
              <Star size={24} color={colors.primary} />
            </View>
            <Text style={[styles.premiumTitle, { color: colors.text }]}>Therapeutic Games</Text>
            <Text style={[styles.premiumSubtitle, { color: colors.text + '60' }]}>
              Interactive experiences designed to calm your mind and reduce anxiety through engaging, mindful gameplay
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

        {/* Breathing Exercise */}
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

        {/* Quick Relief Activities */}
        <View style={[styles.activitiesSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Relief</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text + '50' }]}>
            Simple exercises for immediate calm and grounding
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

        {/* Reminder Section */}
        <View style={[styles.reminderSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.reminderSectionIcon, { backgroundColor: colors.primary + '20' }]}>
            <Heart size={20} color={colors.primary} />
          </View>
          <Text style={[styles.reminderSectionTitle, { color: colors.text }]}>
            You're Not Alone
          </Text>
          <Text style={[styles.reminderSectionText, { color: colors.text + '60' }]}>
            These feelings are temporary. You are stronger than you know, and support is always available when you need it.
          </Text>
        </View>

        {/* Crisis Support Section - Now at bottom */}
        <View style={[styles.helpSection, { backgroundColor: colors.card, borderColor: '#e2e8f0' }]}>
          <View style={[styles.helpIcon, { backgroundColor: '#f1f5f9' }]}>
            <Phone size={20} color="#64748b" />
          </View>
          <Text style={[styles.helpTitle, { color: colors.text }]}>Need Someone to Talk To?</Text>
          <Text style={[styles.helpSubtitle, { color: colors.text + '60' }]}>
            Professional support is available 24/7 when you need immediate help
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
      </ScrollView>
    </View>
  );
}