import React from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../theme/ThemeProvider';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  useBlurView?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, useBlurView = false, ...props }) => {
  const { theme, colors } = useAppTheme();
  const isLight = theme === 'light';

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.background.glass,
      borderColor: colors.border.subtle,
      shadowColor: colors.shadow.color,
      shadowOpacity: colors.shadow.opacity,
      shadowRadius: colors.shadow.elevation * 2,
      shadowOffset: { width: 0, height: colors.shadow.elevation },
    },
    style,
  ];

  if (useBlurView) {
    return (
      <View style={containerStyle} {...props}>
        <BlurView 
          intensity={isLight ? 40 : 15} 
          tint={isLight ? 'light' : 'dark'} 
          style={StyleSheet.absoluteFill} 
        />
        {children}
      </View>
    );
  }

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
