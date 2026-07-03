import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon, IconName } from './ui/icon';
import Animated, { useAnimatedStyle, withTiming, withSpring, useSharedValue } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Colors matching Image 2
const TAB_BAR_BG = '#191526';
const ACTIVE_ITEM_BG = '#262039';
const PURPLE_ACCENT = '#9d4edd';
const TEXT_ACTIVE = '#ffffff';
const TEXT_INACTIVE = '#94a3b8';

export function CustomTabBar({ state, descriptors, navigation }: any) {
  // Hide product detail page from tabs
  const visibleRoutes = state.routes.filter((route: any) => !route.name.includes('product/'));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {visibleRoutes.map((route: any, index: number) => {
          const options = descriptors[route.key].options as any;
          
          if (options.href === null) {
            return null;
          }

          const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          let iconName: IconName = 'home';
          if (route.name === 'index') iconName = 'home';
          if (route.name === 'products') iconName = 'cube';
          if (route.name === 'stock/index') iconName = 'swap-vertical';
          if (route.name === 'suppliers') iconName = 'business';
          if (route.name === 'notifications') iconName = 'notifications';
          if (route.name === 'profile') iconName = 'person';

          if (route.name === 'stock/index') {
            return (
              <CenterButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                iconName={iconName}
                label={label as string}
              />
            );
          }

          return (
            <TabBarItem
              key={route.key}
              routeName={route.name}
              label={label as string}
              iconName={iconName}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              badgeCount={options.tabBarBadge as number | undefined}
            />
          );
        })}
      </View>
      <View style={styles.homeIndicator} />
    </View>
  );
}

const CenterButton = ({ isFocused, onPress, onLongPress, iconName, label }: any) => {
  const isPressed = useSharedValue(false);
  
  const animatedIconStyle = useAnimatedStyle(() => {
    // Rotating 180 degrees fits "swap-vertical" perfectly
    let rotateZ = 0;
    if (isPressed.value) rotateZ = 90;
    else if (isFocused) rotateZ = 180;

    return {
      transform: [
        { rotateZ: withSpring(`${rotateZ}deg`, { damping: 12, stiffness: 200 }) },
        { scale: withSpring(isFocused ? 1.15 : 1) }
      ],
    };
  });

  return (
    <View style={styles.centerButtonWrapper}>
      {/* Bump is now perfectly aligned inside the center button wrapper */}
      <View style={styles.bumpContainer}>
        <View style={styles.bump} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => (isPressed.value = true)}
        onPressOut={() => (isPressed.value = false)}
        style={styles.centerButtonOuter}
      >
        <View style={[styles.centerButtonInner, isFocused && styles.centerButtonActive]}>
          <Animated.View style={animatedIconStyle}>
            <Icon name={iconName} size={28} color={PURPLE_ACCENT} weight={isFocused ? 'fill' : 'regular'} />
          </Animated.View>
        </View>
      </Pressable>
      <Text style={styles.centerLabel}>
        {label}
      </Text>
    </View>
  );
};

interface TabBarItemProps {
  routeName: string;
  label: string;
  iconName: IconName;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  badgeCount?: number;
}

const TabBarItem = React.memo(({ routeName, label, iconName, isFocused, onPress, onLongPress, badgeCount }: TabBarItemProps) => {
  const isPressed = useSharedValue(false);

  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isFocused ? ACTIVE_ITEM_BG : 'transparent', { duration: 250 }),
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    // Unique bespoke animations per icon type
    if (routeName === 'products') {
      // Rocking box
      let rotateZ = 0;
      if (isPressed.value) rotateZ = 15;
      return {
        transform: [
          { rotateZ: withSpring(`${rotateZ}deg`) },
          { scale: withSpring(isFocused ? 1.1 : 1) }
        ],
      };
    } else if (routeName === 'notifications') {
      // Ringing bell
      let rotateZ = 0;
      if (isPressed.value) rotateZ = -20;
      return {
        transform: [
          { rotateZ: withSpring(`${rotateZ}deg`) },
          { scale: withSpring(isFocused ? 1.1 : 1) }
        ],
      };
    } else if (routeName === 'suppliers') {
      // Jump
      let translateY = 0;
      if (isPressed.value) translateY = -4;
      return {
        transform: [
          { translateY: withSpring(translateY) },
          { scale: withSpring(isFocused ? 1.1 : 1) }
        ],
      };
    } else if (routeName === 'profile') {
      // 3D rotation nod
      let rotateY = 0;
      if (isPressed.value) rotateY = 45;
      return {
        transform: [
          { rotateY: withSpring(`${rotateY}deg`) },
          { scale: withSpring(isFocused ? 1.1 : 1) }
        ],
      };
    } else {
      // Default (Home) - normal bounce
      const scale = isPressed.value ? 0.8 : (isFocused ? 1.1 : 1);
      return {
        transform: [
          { scale: withSpring(scale, { damping: 12, stiffness: 200 }) }
        ],
      };
    }
  });

  const animatedDotStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration: 250 }),
      transform: [{ scale: withSpring(isFocused ? 1 : 0.5) }],
    };
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => (isPressed.value = true)}
      onPressOut={() => (isPressed.value = false)}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabItemContainer, animatedBgStyle]}>
        <View style={styles.iconContainer}>
          <Animated.View style={animatedIconStyle}>
            <Icon name={iconName} size={22} color={isFocused ? TEXT_ACTIVE : TEXT_INACTIVE} weight={isFocused ? 'fill' : 'regular'} />
          </Animated.View>
          
          <Animated.View style={[styles.activeDot, animatedDotStyle]} />

          {badgeCount ? (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.label, { color: isFocused ? TEXT_ACTIVE : TEXT_INACTIVE }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 72,
    borderRadius: 36,
    backgroundColor: TAB_BAR_BG,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    zIndex: 999,
  },
  bumpContainer: {
    position: 'absolute',
    top: -24,
    // Perfectly aligns directly above the center button wrapper in flex layout
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  bump: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: TAB_BAR_BG,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 24,
    minWidth: 50,
    height: 56,
  },
  iconContainer: {
    position: 'relative',
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeDot: {
    position: 'absolute',
    top: -4,
    right: -10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURPLE_ACCENT,
    shadowColor: PURPLE_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: TAB_BAR_BG,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  centerButtonWrapper: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  centerButtonOuter: {
    position: 'absolute',
    top: -18,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: TAB_BAR_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#201b33',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PURPLE_ACCENT,
  },
  centerButtonActive: {
    backgroundColor: '#292244',
  },
  centerLabel: {
    position: 'absolute',
    bottom: 8,
    fontSize: 10,
    fontWeight: '600',
    color: PURPLE_ACCENT,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
  },
});

