import React, { createContext, useContext, useEffect, useState } from 'react';
// @ts-ignore - AsyncStorage types may not be properly configured
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContextType } from '@/types';

const THEME_KEY = 'app_theme_preference';

const lightColors = {
  background: '#FFFFFF',
  text: '#1F2937',
  card: '#F9FAFB',
  primary: '#87CEEB',
  secondary: '#E5F3FF',
  accent: '#5B9BD5',
  border: '#E5E7EB',
};

const darkColors = {
  background: '#111827',
  text: '#F9FAFB',
  card: '#1F2937',
  primary: '#87CEEB',
  secondary: '#2D3748',
  accent: '#5B9BD5',
  border: '#374151',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
      // Fallback to light theme if storage fails
      setIsDark(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
      // Theme will still work for current session
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};