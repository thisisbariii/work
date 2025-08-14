import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationService } from '@/services/notificationService';
import NotificationBanner from '@/components/NotificationBanner';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Initialize notifications on app start
    const initializeNotifications = async () => {
      try {
        // Request permissions early
        await NotificationService.requestPermissions();
        
        // Schedule wellness reminders
        await NotificationService.scheduleDailyReminder();
        await NotificationService.scheduleWellnessCheck();
        
        console.log('✅ Notification system initialized');
      } catch (error) {
        console.error('❌ Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
            <Stack.Screen name="emergency" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          
          {/* Global notification banner */}
          <NotificationBanner />
          
          <StatusBar style="auto" />
        </NotificationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}