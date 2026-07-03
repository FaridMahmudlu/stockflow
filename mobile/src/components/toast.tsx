import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './ui/icon';
import { useToastStore, ToastType } from '../store/toast.store';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

export function Toast() {
  const { isVisible, message, type, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(insets.top + 10, { damping: 12, stiffness: 90 });
      opacity.value = withTiming(1, { duration: 200 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-100, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(hideToast)();
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  // We avoid reading opacity.value during render to prevent Reanimated warnings.
  // The component remains mounted but invisible when opacity is 0.

  const getIconAndColor = (t: ToastType): { name: IconName; color: string; bg: string } => {
    switch (t) {
      case 'success': return { name: 'check-circle', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' };
      case 'error': return { name: 'close-circle', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'info':
      default:
        return { name: 'info', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)' };
    }
  };

  const { name, color, bg } = getIconAndColor(type);

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={isVisible ? 'auto' : 'none'}>
      <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Icon name={name} size={22} color={color} weight="fill" />
        </View>
        <Text style={styles.messageText}>{message}</Text>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    width: width - 40,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
