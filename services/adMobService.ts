import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADS_WATCHED_KEY = 'ads_watched_today';
const LAST_AD_WATCH_KEY = 'last_ad_watch';
const DAILY_AD_LIMIT = 15;
const AD_COOLDOWN = 30000; // 30 seconds

export class AdMobService {
  static async canWatchAd(): Promise<{ canWatch: boolean; reason?: string }> {
    try {
      if (Platform.OS === 'web') {
        return { canWatch: true }; // Skip ad restrictions on web for testing
      }

      const today = new Date().toDateString();
      const adsWatchedData = await AsyncStorage.getItem(ADS_WATCHED_KEY);
      const lastAdWatch = await AsyncStorage.getItem(LAST_AD_WATCH_KEY);
      
      let adsToday = 0;
      if (adsWatchedData) {
        const data = JSON.parse(adsWatchedData);
        if (data.date === today) {
          adsToday = data.count;
        }
      }

      if (adsToday >= DAILY_AD_LIMIT) {
        return { canWatch: false, reason: 'Daily limit reached. Try again tomorrow!' };
      }

      if (lastAdWatch) {
        const timeSinceLastAd = Date.now() - parseInt(lastAdWatch);
        if (timeSinceLastAd < AD_COOLDOWN) {
          const remainingTime = Math.ceil((AD_COOLDOWN - timeSinceLastAd) / 1000);
          return { canWatch: false, reason: `Please wait ${remainingTime} seconds` };
        }
      }

      return { canWatch: true };
    } catch (error) {
      console.error('Error checking ad availability:', error);
      return { canWatch: true };
    }
  }

  static async showRewardedAd(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Simulate ad watch on web
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.recordAdWatch();
        return true;
      }

      // For mobile platforms, implement actual AdMob integration
      // This would use expo-ads-admob in a real implementation
      await this.recordAdWatch();
      return true;
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      return false;
    }
  }

  private static async recordAdWatch(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const adsWatchedData = await AsyncStorage.getItem(ADS_WATCHED_KEY);
      
      let adsToday = 0;
      if (adsWatchedData) {
        const data = JSON.parse(adsWatchedData);
        if (data.date === today) {
          adsToday = data.count;
        }
      }

      await AsyncStorage.setItem(ADS_WATCHED_KEY, JSON.stringify({
        date: today,
        count: adsToday + 1,
      }));

      await AsyncStorage.setItem(LAST_AD_WATCH_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error recording ad watch:', error);
    }
  }
}