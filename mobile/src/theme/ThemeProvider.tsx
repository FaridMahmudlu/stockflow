import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, AppState, AppStateStatus, Appearance } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../store/settings.store';
import { lightTokens, darkTokens, SemanticTokens } from './tokens';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextData {
  theme: ResolvedTheme;
  colors: SemanticTokens;
}

const ThemeContext = createContext<ThemeContextData>({
  theme: 'dark',
  colors: darkTokens,
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { themeMode } = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    // Resolve theme immediately when themeMode or systemColorScheme changes
    if (themeMode === 'system') {
      setResolvedTheme(systemColorScheme === 'light' ? 'light' : 'dark');
    } else {
      setResolvedTheme(themeMode);
    }
  }, [themeMode, systemColorScheme]);

  // Listen to AppState to catch system theme changes while backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && themeMode === 'system') {
        const currentSystemTheme = Appearance.getColorScheme();
        setResolvedTheme(currentSystemTheme === 'light' ? 'light' : 'dark');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [themeMode]);

  const colors = resolvedTheme === 'light' ? lightTokens : darkTokens;

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, colors }}>
      <StatusBar style={resolvedTheme === 'light' ? 'dark' : 'light'} />
      {children}
    </ThemeContext.Provider>
  );
};
