// services/chatModerationService.ts

export interface ChatModerationResult {
  isAllowed: boolean;
  isBlocked: boolean;
  flaggedWords: string[];
  cleanedText: string;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  warningMessage?: string;
}

export class ChatModerationService {
  // English vulgar/abusive words
  private static readonly ENGLISH_VULGAR = [
    'fuck', 'fucking', 'fucked', 'fucker', 'shit', 'shitting', 'bitch', 'bitches',
    'asshole', 'assholes', 'bastard', 'damn', 'hell', 'crap', 'piss', 'pissed',
    'bloody', 'wtf', 'stfu', 'gtfo', 'motherfucker', 'dickhead', 'retard',
    'stupid', 'idiot', 'moron', 'loser', 'ugly', 'fat', 'dumb'
  ];

  // Hindi/Indian abusive words (in English script)
  private static readonly HINDI_VULGAR = [
    // Common Hindi abuses
    'madarchod', 'bhenchod', 'behenchod', 'bhenchodd', 'mc', 'bc',
    'chutiya', 'chutiye', 'gandu', 'randi', 'randwa', 'saala', 'saali',
    'kamina', 'kamine', 'harami', 'haramzada', 'kutte', 'kutta', 'suar',
    'ullu', 'bewakoof', 'pagal', 'gaandu', 'laude', 'lodu', 'chodu',
    
    // Regional variations
    'lawde', 'lawda', 'lund', 'bhosdi', 'bhosdk', 'chinal', 'raand',
    'chakka', 'hijra', 'bhadwa', 'dalle', 'kuttiya', 'chinaal',
    
    // Milder but still inappropriate
    'bakchod', 'chutiyapa', 'haggu', 'tatti', 'pesaab', 'potty',
    'besharam', 'ghatiya', 'faltu', 'bekaar', 'nautanki'
  ];

  // Other Indian languages (common ones)
  private static readonly OTHER_INDIAN_VULGAR = [
    // Tamil
    'punda', 'pundi', 'oombu', 'kena', 'poolu', 'thevidiya',
    
    // Telugu
    'bootu', 'lanja', 'gudda', 'pichi', 'dengey',
    
    // Gujarati
    'gando', 'chodu', 'madarchod', 'dhakkan',
    
    // Punjabi
    'pencho', 'bhencho', 'kudi', 'gadhe', 'kameeney',
    
    // Bengali
    'sala', 'magir', 'banchod', 'tor', 'chudbe',
    
    // Marathi
    'zavadya', 'bhikari', 'gadha', 'shala', 'aho'
  ];

  // Severe harmful content
  private static readonly SEVERE_HARMFUL = [
    'kill yourself', 'kys', 'go die', 'suicide kar', 'mar ja', 'marr ja',
    'tu mar ja', 'die bitch', 'kill urself', 'hang yourself', 'jump off',
    'nobody likes you', 'everyone hates you', 'worthless piece',
    'waste of space', 'should not exist', 'mistake', 'accident'
  ];

  // Threatening language
  private static readonly THREATS = [
    'i will kill', 'mai maar dunga', 'main tumhe maar dunga', 'address de',
    'ghar aa jaunga', 'milte hai', 'dekh lunga', 'badla lunga',
    'watch out', 'you are dead', 'gonna get you', 'find you'
  ];

  /**
   * Check if a chat message should be allowed
   */
  static moderateMessage(text: string): ChatModerationResult {
    const normalizedText = text.toLowerCase().trim();
    
    // Check all word lists
    const severeCheck = this.checkWordList(normalizedText, this.SEVERE_HARMFUL);
    const threatCheck = this.checkWordList(normalizedText, this.THREATS);
    const englishCheck = this.checkWordList(normalizedText, this.ENGLISH_VULGAR);
    const hindiCheck = this.checkWordList(normalizedText, this.HINDI_VULGAR);
    const otherCheck = this.checkWordList(normalizedText, this.OTHER_INDIAN_VULGAR);
    
    // Combine all flagged words
    const allFlaggedWords = [
      ...severeCheck.flaggedWords,
      ...threatCheck.flaggedWords,
      ...englishCheck.flaggedWords,
      ...hindiCheck.flaggedWords,
      ...otherCheck.flaggedWords
    ];
    
    // Determine severity and action
    let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
    let isBlocked = false;
    let warningMessage: string | undefined;
    
    if (severeCheck.found || threatCheck.found) {
      severity = 'severe';
      isBlocked = true;
      warningMessage = "Messages containing harmful content or threats are not allowed. Please be supportive.";
    } else if (allFlaggedWords.length >= 3) {
      severity = 'severe';
      isBlocked = true;
      warningMessage = "Too much inappropriate language. Please keep conversations respectful.";
    } else if (allFlaggedWords.length >= 1) {
      severity = 'moderate';
      isBlocked = true;
      warningMessage = "Please avoid using inappropriate language. Keep the conversation supportive.";
    }
    
    // Clean the text (replace bad words with asterisks)
    let cleanedText = text;
    allFlaggedWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleanedText = cleanedText.replace(regex, '*'.repeat(word.length));
    });
    
    return {
      isAllowed: !isBlocked,
      isBlocked,
      flaggedWords: allFlaggedWords,
      cleanedText,
      severity,
      warningMessage
    };
  }
  
  /**
   * Check a text against a word list
   */
  private static checkWordList(text: string, wordList: string[]): { found: boolean; flaggedWords: string[] } {
    const flaggedWords: string[] = [];
    
    wordList.forEach(word => {
      // Check for exact word matches and variations
      const patterns = [
        `\\b${word}\\b`,           // Exact word
        `\\b${word}s\\b`,          // Plural
        `\\b${word}ing\\b`,        // -ing form
        `\\b${word}ed\\b`,         // -ed form
        word.replace(/./g, '$&+'), // With extra characters (f+u+c+k)
        word.split('').join('[^a-z]*'), // With separators (f-u-c-k)
      ];
      
      patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(text)) {
          if (!flaggedWords.includes(word)) {
            flaggedWords.push(word);
          }
        }
      });
    });
    
    return {
      found: flaggedWords.length > 0,
      flaggedWords
    };
  }
  
  /**
   * Get suggestions for positive alternatives
   */
  static getPositiveAlternatives(): string[] {
    return [
      "I understand how you're feeling...",
      "That sounds really difficult.",
      "You're not alone in this.",
      "I'm here to listen if you want to talk.",
      "Thank you for sharing that with me.",
      "I hear you, and your feelings are valid.",
      "It takes courage to open up about this.",
      "I appreciate you trusting me with this.",
      "That must be really hard for you.",
      "You're being really strong by reaching out."
    ];
  }
  
  /**
   * Check if message contains supportive language
   */
  static isSupportiveMessage(text: string): boolean {
    const supportiveKeywords = [
      'understand', 'support', 'here for you', 'not alone', 'listen',
      'care about', 'thinking of you', 'proud of you', 'strong', 'brave',
      'better', 'hope', 'love', 'hug', 'sending', 'prayers', 'positive',
      'believe in you', 'you matter', 'important', 'special', 'amazing'
    ];
    
    const normalizedText = text.toLowerCase();
    return supportiveKeywords.some(keyword => normalizedText.includes(keyword));
  }
  
  /**
   * Log inappropriate message attempt for monitoring
   */
  static async logInappropriateMessage(
    userId: string, 
    chatId: string, 
    originalText: string, 
    flaggedWords: string[]
  ): Promise<void> {
    try {
      console.log('Inappropriate message blocked:', {
        userId,
        chatId,
        flaggedWords,
        timestamp: new Date().toISOString(),
        textLength: originalText.length
      });
      
      // TODO: Store in Firebase for monitoring
      // await FirebaseService.logInappropriateMessage({
      //   userId,
      //   chatId,
      //   flaggedWords,
      //   timestamp: Date.now(),
      //   severity: this.moderateMessage(originalText).severity
      // });
      
    } catch (error) {
      console.error('Failed to log inappropriate message:', error);
    }
  }
  
  /**
   * Get warning message based on severity
   */
  static getWarningMessage(severity: string, flaggedWords: string[]): string {
    switch (severity) {
      case 'severe':
        return "This message contains harmful content and cannot be sent. Please be kind and supportive.";
      case 'moderate':
        return "Please avoid inappropriate language. Our community values respect and support.";
      case 'mild':
        return "Let's keep the conversation positive and supportive.";
      default:
        return "Please ensure your message is respectful and supportive.";
    }
  }
  
  /**
   * Check if user has been sending too many inappropriate messages
   */
  static async checkUserBehavior(userId: string): Promise<{
    shouldWarn: boolean;
    shouldTempBan: boolean;
    warningMessage?: string;
  }> {
    try {
      // TODO: Implement with Firebase - track user's inappropriate message count
      // For now, return default
      return {
        shouldWarn: false,
        shouldTempBan: false
      };
    } catch (error) {
      return {
        shouldWarn: false,
        shouldTempBan: false
      };
    }
  }
}