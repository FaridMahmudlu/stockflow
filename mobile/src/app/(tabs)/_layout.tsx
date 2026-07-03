import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useNavigation, useRouter, usePathname, Slot } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { NavigationContext } from '@react-navigation/native';
import { CustomTabBar } from '../../components/custom-tab-bar';
import { useNotificationStore } from '../../store/notification.store';
import { GlassBackground } from '../../components/glass-background';

import DashboardScreen from './index';
import ProductsScreen from './products/index';
import StockScreen from './stock/index';
import SuppliersScreen from './suppliers';
import ProfileScreen from './profile';

const screenWidth = Dimensions.get('window').width;

// Proxy wrapper to forward navigation focus/blur events to child screens
function TabScreenWrapper({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  const parentNavigation = useNavigation();
  const listeners = useRef<{ event: string; callback: () => void; called: boolean }[]>([]);

  const navigationMock = useMemo(() => {
    return new Proxy(parentNavigation, {
      get(target, prop) {
        if (prop === 'addListener') {
          return (event: string, callback: () => void) => {
            const hasCalled = event === 'focus';
            listeners.current.push({ event, callback, called: hasCalled });
            
            // Pre-fetch in background on mount
            if (event === 'focus') {
              callback();
            }
            
            return () => {
              listeners.current = listeners.current.filter((l) => l.callback !== callback);
            };
          };
        }
        return (target as any)[prop];
      },
    });
  }, [parentNavigation]);

  useEffect(() => {
    listeners.current.forEach((l) => {
      if (isActive && l.event === 'focus') {
        if (l.called) {
          l.called = false;
          return;
        }
        l.callback();
      } else if (!isActive && l.event === 'blur') {
        l.callback();
      }
    });
  }, [isActive]);

  return (
    <NavigationContext.Provider value={navigationMock as any}>
      {children}
    </NavigationContext.Provider>
  );
}

export default function TabLayout() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const scrollViewRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);

  const tabsOrder = ['index', 'products', 'stock/index', 'suppliers', 'profile'];
  const titles = ['Ana Səhifə', 'Məhsullar', 'Stok', 'Təchizatçılar', 'Profil'];

  const getTabPath = (route: string) => {
    if (route === 'index') return '/(tabs)/';
    if (route === 'stock/index') return '/(tabs)/stock';
    return `/(tabs)/${route}`;
  };

  // Determine active tab index from current route pathname
  let activeIndex = 0;
  if (pathname.includes('/products')) activeIndex = 1;
  else if (pathname.includes('/stock')) activeIndex = 2;
  else if (pathname.includes('/suppliers')) activeIndex = 3;
  else if (pathname.includes('/profile')) activeIndex = 4;

  // Check if current route is one of the main tabs
  const isMainTab = useMemo(() => {
    const cleanPath = pathname.replace('/(tabs)', '').replace(/\/$/, '');
    const activeRoute = cleanPath === '' || cleanPath === '/' ? 'index' : cleanPath.slice(1);
    
    return tabsOrder.some(route => {
      const cleanRoute = route.replace('/index', '');
      return activeRoute === cleanRoute;
    });
  }, [pathname]);

  // Synchronize path navigation changes into the ScrollView
  useEffect(() => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    if (isMainTab) {
      scrollViewRef.current?.scrollTo({ x: activeIndex * screenWidth, animated: true });
    }
  }, [activeIndex, isMainTab]);

  // Synchronize ScrollView swipe updates back to the router path
  const handleScrollEnd = (e: any) => {
    const contentOffset = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(contentOffset / screenWidth);
    if (newPage !== activeIndex && newPage >= 0 && newPage < tabsOrder.length) {
      isProgrammaticScroll.current = true;
      router.replace(getTabPath(tabsOrder[newPage]));
    }
  };

  const descriptors = {
    'index': { options: { title: 'Ana Səhifə', tabBarLabel: 'Ana Səhifə' } },
    'products': { options: { title: 'Məhsullar', tabBarLabel: 'Məhsullar' } },
    'stock/index': { options: { title: 'Stok', tabBarLabel: 'Stok' } },
    'suppliers': { options: { title: 'Təchizatçılar', tabBarLabel: 'Təchizatçı' } },
    'profile': { options: { title: 'Profil', tabBarLabel: 'Profil' } },
  } as any;

  const mockNavigation = useMemo(() => ({
    emit: () => ({ defaultPrevented: false }),
    navigate: (routeName: string) => {
      router.replace(getTabPath(routeName));
    }
  }), [router]);

  // If we are navigating to a nested detail screen (like /product/123), render standard Slot
  if (!isMainTab) {
    return <Slot />;
  }

  return (
    <GlassBackground style={styles.container}>
      {/* Master Header */}
      <View style={styles.headerContainer}>
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          <Text style={styles.headerTitle}>{titles[activeIndex]}</Text>
        </View>
      </View>

      {/* Pure JS Horizontal ScrollView for native-like finger following swiping */}
      <ScrollView 
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        contentOffset={{ x: activeIndex * screenWidth, y: 0 }}
        style={styles.pager}
      >
        <View style={{ width: screenWidth, flex: 1 }}>
          <TabScreenWrapper isActive={activeIndex === 0}>
            <DashboardScreen />
          </TabScreenWrapper>
        </View>
        <View style={{ width: screenWidth, flex: 1 }}>
          <TabScreenWrapper isActive={activeIndex === 1}>
            <ProductsScreen />
          </TabScreenWrapper>
        </View>
        <View style={{ width: screenWidth, flex: 1 }}>
          <TabScreenWrapper isActive={activeIndex === 2}>
            <StockScreen />
          </TabScreenWrapper>
        </View>
        <View style={{ width: screenWidth, flex: 1 }}>
          <TabScreenWrapper isActive={activeIndex === 3}>
            <SuppliersScreen />
          </TabScreenWrapper>
        </View>
        <View style={{ width: screenWidth, flex: 1 }}>
          <TabScreenWrapper isActive={activeIndex === 4}>
            <ProfileScreen />
          </TabScreenWrapper>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <CustomTabBar 
        state={{
          index: activeIndex,
          routes: [
            { key: 'index', name: 'index' },
            { key: 'products', name: 'products' },
            { key: 'stock/index', name: 'stock/index' },
            { key: 'suppliers', name: 'suppliers' },
            { key: 'profile', name: 'profile' },
          ]
        }}
        descriptors={descriptors}
        navigation={mockNavigation}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  headerContent: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#ffffff',
    fontSize: 20,
  },
  pager: {
    flex: 1,
  }
});
