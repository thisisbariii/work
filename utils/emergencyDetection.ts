import { Linking } from 'react-native';

const crisisKeywords = [
  'suicide', 'kill myself', 'end it all', 'not worth living',
  'self harm', 'hurt myself', 'want to die', 'ending my life',
  'can\'t go on', 'better off dead', 'no point in living',
  'suicidal thoughts', 'taking my own life'
];

const emergencyResources = [
  {
    name: 'National Suicide Prevention Lifeline',
    number: '988',
    description: '24/7 crisis support',
  },
  {
    name: 'Crisis Text Line',
    text: 'HOME',
    number: '741741',
    description: 'Free 24/7 text support',
  },
  {
    name: 'SAMHSA National Helpline',
    number: '1-800-662-4357',
    description: 'Mental health services locator',
  },
];

export class EmergencyDetectionService {
  static detectCrisis(text: string): boolean {
    const lowerText = text.toLowerCase();
    return crisisKeywords.some(keyword => lowerText.includes(keyword));
  }

  static getEmergencyResources() {
    return emergencyResources;
  }

  static async callEmergencyLine(number: string): Promise<void> {
    try {
      const url = `tel:${number}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error('Phone calls not supported on this device');
      }
    } catch (error) {
      console.error('Error making emergency call:', error);
    }
  }

  static async sendEmergencyText(number: string, message: string): Promise<void> {
    try {
      const url = `sms:${number}?body=${encodeURIComponent(message)}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.error('SMS not supported on this device');
      }
    } catch (error) {
      console.error('Error sending emergency text:', error);
    }
  }
}