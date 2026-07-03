import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Platform, ScrollView, RefreshControl } from 'react-native';
import { useNotificationStore, Notification } from '../../store/notification.store';
import { Icon } from '../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackground } from '../../components/glass-background';
import { GlassCard } from '../../components/glass-card';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, FadeInUp, FadeIn, Layout } from 'react-native-reanimated';

type TabType = 'ALL' | 'STOCK' | 'SYSTEM' | 'ALERT';

export default function NotificationsScreen() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = async () => {
      await fetchNotifications();
      setIsLoading(false);
    };
    load();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };

  const bellRotation = useSharedValue(0);

  useEffect(() => {
    if (!isLoading && notifications.length === 0) {
      bellRotation.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 100 }),
          withTiming(10, { duration: 100 }),
          withTiming(-10, { duration: 100 }),
          withTiming(0, { duration: 100 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );
    }
  }, [isLoading, notifications.length]);

  const animatedBellStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${bellRotation.value}deg` }],
    };
  });

  const getCategory = (type: string): 'STOCK' | 'SYSTEM' | 'ALERT' => {
    if (type.includes('CRITICAL') || type.includes('LOW') || type.includes('DELETED')) return 'ALERT';
    if (type.includes('STOCK_INCREASED') || type.includes('STOCK_DECREASED')) return 'STOCK';
    return 'SYSTEM'; // Default for GENERAL, PRODUCT_CREATED, PRODUCT_UPDATED, SUPPLIER_*, USER_*, ROLE_*
  };

  const counts = useMemo(() => {
    let stock = 0, system = 0, alert = 0;
    notifications.forEach(n => {
      const cat = getCategory(n.type);
      if (cat === 'STOCK') stock++;
      else if (cat === 'SYSTEM') system++;
      else if (cat === 'ALERT') alert++;
    });
    return { ALL: notifications.length, STOCK: stock, SYSTEM: system, ALERT: alert };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab !== 'ALL' && getCategory(n.type) !== activeTab) return false;
      if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const renderTab = (type: TabType, label: string, icon: any, count: number) => {
    const isActive = activeTab === type;
    return (
      <TouchableOpacity 
        style={[styles.tabButton, isActive && styles.tabButtonActive]} 
        onPress={() => setActiveTab(type)}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <Icon name={icon} size={18} color={isActive ? '#c084fc' : '#64748b'} />
          <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
        </View>
        <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>{count}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = React.useCallback(({ item, index }: { item: Notification, index: number }) => {
    const cat = getCategory(item.type);
    return (
      <NotificationItem 
        item={item} 
        index={index} 
        cat={cat} 
        markAsRead={markAsRead} 
      />
    );
  }, [markAsRead]);

  if (isLoading) {
    return (
      <GlassBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.mainTitle}>Bildirişlər</Text>
            <Text style={styles.subTitle}>Sistem bildirişləri və yeniliklər</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={markAllAsRead}>
              <Icon name="filter" size={20} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearchActive(!isSearchActive)}>
              <Icon name="search" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {isSearchActive && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.searchContainer}>
            <Icon name="search" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Bildirişlərdə axtar..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </Animated.View>
        )}

        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {renderTab('ALL', 'Hamısı', 'grid-four', counts.ALL)}
            {renderTab('STOCK', 'Stok', 'cube', counts.STOCK)}
            {renderTab('SYSTEM', 'Sistem', 'settings', counts.SYSTEM)}
            {renderTab('ALERT', 'Xəbərdarlıq', 'notifications', counts.ALERT)}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#a78bfa"
            colors={['#a78bfa']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Animated.View style={animatedBellStyle}>
              <Icon name="notifications" size={72} color="#475569" />
            </Animated.View>
            <Text style={styles.emptyTitle}>Hər şey sakitdir</Text>
            <Text style={styles.emptyText}>Bu kateqoriyada bildiriş tapılmadı.</Text>
          </View>
        }
      />
    </GlassBackground>
  );
}

const NotificationItem = React.memo(({ item, index, cat, markAsRead }: { item: Notification; index: number; cat: 'STOCK' | 'SYSTEM' | 'ALERT'; markAsRead: (id: string) => Promise<void> }) => {
  const isUnread = !item.isRead;

  let iconName = 'notifications';
  let themeColor = '#c084fc'; // default purple
  let badgeIcon = '';

  // Assign specific icons and colors based on the exact type
  switch (item.type) {
    case 'STOCK_INCREASED':
      iconName = 'cube';
      themeColor = '#c084fc';
      badgeIcon = 'plus';
      break;
    case 'STOCK_DECREASED':
      iconName = 'cube';
      themeColor = '#c084fc';
      badgeIcon = 'minus';
      break;
    case 'PRODUCT_CREATED':
      iconName = 'cube';
      themeColor = '#34d399';
      badgeIcon = 'plus';
      break;
    case 'PRODUCT_UPDATED':
      iconName = 'cube';
      themeColor = '#60a5fa';
      badgeIcon = 'edit';
      break;
    case 'PRODUCT_DELETED':
      iconName = 'trash';
      themeColor = '#f87171';
      break;
    case 'SUPPLIER_CREATED':
    case 'SUPPLIER_UPDATED':
    case 'SUPPLIER_CHANGED':
      iconName = 'business';
      themeColor = '#34d399';
      break;
    case 'USER_CREATED':
    case 'USER_UPDATED':
    case 'ROLE_CHANGED':
      iconName = 'users';
      themeColor = '#60a5fa';
      break;
    case 'STOCK_LOW':
    case 'STOCK_CRITICAL':
      iconName = 'warning-outline';
      themeColor = '#f87171';
      break;
    default:
      iconName = 'notifications';
      themeColor = '#94a3b8';
  }

  const d = new Date(item.createdAt);
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(1000, index * 50)).springify()} layout={Layout.springify()}>
      <TouchableOpacity 
        style={styles.cardTouch}
        onPress={() => isUnread && markAsRead(item.id)}
        activeOpacity={0.8}
      >
        <GlassCard style={[styles.card, isUnread && styles.cardUnread]}>
          <View style={styles.cardMain}>
            <View style={[styles.iconContainer, { borderColor: themeColor + '40', backgroundColor: themeColor + '10' }]}>
              <Icon name={iconName as any} size={24} color={themeColor} />
              {badgeIcon !== '' && (
                <View style={[styles.plusBadge, { backgroundColor: themeColor }]}>
                  <Icon name={badgeIcon as any} size={10} color="#ffffff" />
                </View>
              )}
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>{item.title}</Text>
                {isUnread && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.message, isUnread && styles.messageUnread]}>{item.message}</Text>
              
              <View style={styles.tagsRow}>
                {cat === 'STOCK' && (
                  <Icon name="cube" size={16} color="#fb923c" style={{ marginRight: 6 }} />
                )}
                <View style={[styles.tagBadge, { backgroundColor: themeColor + '20' }]}>
                  <Text style={[styles.tagText, { color: themeColor }]}>
                    {cat === 'STOCK' ? 'Stok' : cat === 'SYSTEM' ? 'Sistem' : 'Xəbərdarlıq'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.rightContainer}>
              <Text style={[styles.timeText, { color: themeColor }]}>{timeStr}</Text>
              <Text style={styles.dateText}>{dateStr}</Text>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  tabsWrapper: {
    marginHorizontal: -20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  tabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#c084fc',
    fontWeight: '700',
  },
  tabCount: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  tabCountActive: {
    color: '#a78bfa',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  cardTouch: {
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 16, 38, 0.6)',
  },
  cardUnread: {
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  cardMain: {
    flexDirection: 'row',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    position: 'relative',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f172a',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: '#cbd5e1',
    fontWeight: '600',
    flexShrink: 1,
  },
  titleUnread: {
    color: '#ffffff',
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  newBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  message: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 10,
  },
  messageUnread: {
    color: '#cbd5e1',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 12,
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
});
