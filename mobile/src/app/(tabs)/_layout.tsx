import { Tabs } from 'expo-router';
import { useNotificationStore } from '../../store/notification.store';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { CustomTabBar } from '../../components/custom-tab-bar';
import { Icon } from '../../components/ui/icon';

export default function TabLayout() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <Tabs 
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: true,
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        },
        headerBackground: () => (
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        headerTitleStyle: {
          fontWeight: '800',
          color: '#ffffff',
          fontSize: 20,
        }
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Ana Səhifə',
          tabBarLabel: 'Ana Səhifə',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="home" weight={focused ? 'fill' : 'regular'} size={size} color={color as string} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="products" 
        options={{ 
          title: 'Məhsullar',
          tabBarLabel: 'Məhsullar',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="cube" weight={focused ? 'fill' : 'regular'} size={size} color={color as string} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="stock/index" 
        options={{ 
          title: 'Stok',
          tabBarLabel: 'Stok',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="swap-vertical" weight={focused ? 'fill' : 'regular'} size={size} color={color as string} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="suppliers" 
        options={{ 
          title: 'Təchizatçılar',
          tabBarLabel: 'Təchizatçı',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="business" weight={focused ? 'fill' : 'regular'} size={size} color={color as string} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="notifications" 
        options={{ 
          title: 'Bildirişlər',
          tabBarLabel: 'Bildirişlər',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="notifications" weight={focused ? 'fill' : 'regular'} size={size} color={color as string} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="person" weight={focused ? 'fill' : 'regular'} size={size} color={color as string} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="product/[id]" 
        options={{ 
          href: null,
          title: 'Məhsul Detalı' 
        }} 
      />
    </Tabs>
  );
}
