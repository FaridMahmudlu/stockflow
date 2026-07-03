import React from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GlassBackgroundProps extends ViewProps {
  children: React.ReactNode;
}

export const GlassBackground: React.FC<GlassBackgroundProps> = ({ children, style, ...props }) => {
  const { theme, colors } = useAppTheme();
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]} {...props}>
      {/* Background Orbs */}
      <View style={styles.orbContainer}>
        <LinearGradient
          colors={[colors.accent.secondary, 'transparent']}
          style={[styles.orb, styles.orb1]}
        />
        <LinearGradient
          colors={[colors.status.infoBg, 'transparent']}
          style={[styles.orb, styles.orb2]}
        />
        <LinearGradient
          colors={[colors.status.errorBg, 'transparent']}
          style={[styles.orb, styles.orb3]}
        />
      </View>

      <BlurView 
        intensity={isLight ? 40 : 20} 
        tint={isLight ? 'light' : 'dark'}
        style={StyleSheet.absoluteFill} 
      />
      
      {/* Safe Area View simulation */}
      <View style={[{ flex: 1 }, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orbContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.8,
  },
  orb1: {
    top: -100,
    right: -100,
  },
  orb2: {
    top: '30%',
    left: -150,
  },
  orb3: {
    bottom: -50,
    right: -50,
  },
});
