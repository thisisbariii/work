import { Audio } from 'expo-av';
import { Platform } from 'react-native';

type SoundType = 'chime' | 'success' | 'breathing';

export class SoundTherapyService {
  private static sounds: { [key in SoundType]?: Audio.Sound } = {};

  static async playSound(soundType: SoundType): Promise<void> {
    try {
      if (Platform.OS === 'web') return; // Skip on web

      if (this.sounds[soundType]) {
        await this.sounds[soundType]!.replayAsync();
      } else {
        const soundUri = this.getSoundUri(soundType);
        const { sound } = await Audio.Sound.createAsync({ uri: soundUri });
        this.sounds[soundType] = sound;
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  private static getSoundUri(soundType: SoundType): string {
    const soundMappings: Record<SoundType, string> = {
      chime: 'https://www.soundjay.com/misc/sounds/chime.wav',
      success: 'https://www.soundjay.com/misc/sounds/success.wav',
      breathing: 'https://www.soundjay.com/misc/sounds/breathing.wav',
    };

    return soundMappings[soundType];
  }

  static async stopAllSounds(): Promise<void> {
    try {
      for (const sound of Object.values(this.sounds)) {
        if (sound) await sound.stopAsync();
      }
    } catch (error) {
      console.error('Error stopping sounds:', error);
    }
  }

  static async setupAudio(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      // Use existing constants or fallback to 1 (DoNotMix mode)
      const INTERRUPTION_MODE_IOS_DO_NOT_MIX = (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX ?? 1;
      const INTERRUPTION_MODE_ANDROID_DO_NOT_MIX = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX ?? 1;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  }
}
