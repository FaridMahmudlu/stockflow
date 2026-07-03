import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../services/api';
import { Icon } from '../../../components/ui/icon';
import { useAuthStore } from '../../../store/auth.store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRefreshStore } from '../../../store/refresh.store';
import { GlassBackground } from '../../../components/glass-background';
import { GlassCard } from '../../../components/glass-card';
import { ActionSheet, ActionSheetOption } from '../../../components/ui/action-sheet';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface User {
  id: string;
  email: string;
}

interface StockMovement {
  id: string;
  productId: string;
  product: Product;
  userId: string;
  user: User;
  type: 'INCREASE' | 'DECREASE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  quantity: number;
  reference: string | null;
  createdAt: string;
}

interface DashboardStats {
  incoming: { total: number; thisMonth: number };
  outgoing: { total: number; thisMonth: number };
  value: { total: number; monthlyGrowth: number };
  products: { total: number; active: number };
}

export default function StockMovementsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState<'all' | 'in' | 'out'>('all');
  const [activeDateFilter, setActiveDateFilter] = useState<'all' | '7days' | '30days' | 'thisMonth'>('all');
  
  // Action sheet visibility states
  const [typeSheetVisible, setTypeSheetVisible] = useState(false);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const movementRefreshTrigger = useRefreshStore((state) => state.movementRefreshTrigger);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchData = async () => {
    try {
      const [movementsRes, statsRes] = await Promise.all([
        api.get('/stock/movement?limit=50'),
        api.get('/stock/dashboard')
      ]);
      setMovements(movementsRes.data.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch stock data', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [movementRefreshTrigger])
  );

  useEffect(() => {
    fetchData();
  }, [movementRefreshTrigger]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getMovementInfo = (type: StockMovement['type']) => {
    switch (type) {
      case 'INCREASE':
      case 'TRANSFER_IN':
        return { label: type === 'INCREASE' ? 'Mədaxil' : 'Tr. Giriş', icon: 'arrow-down', color: '#34d399', isPositive: true };
      case 'DECREASE':
      case 'TRANSFER_OUT':
        return { label: type === 'DECREASE' ? 'Məxaric' : 'Tr. Çıxış', icon: 'arrow-up', color: '#f87171', isPositive: false };
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric' })} • ${d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderDashboard = () => {
    if (!stats) return null;

    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.dashboardRow}>
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.dashboardCardWrapper}>
            <GlassCard style={styles.dashboardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.dashboardIconContainer, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
                  <Icon name="arrow-down" size={20} color="#34d399" />
                </View>
                <Text style={styles.dashboardCardTitle}>Daxil olan</Text>
              </View>
              <View style={styles.cardValueRow}>
                <Text style={styles.dashboardMainValue}>{stats.incoming.total}</Text>
                <Text style={styles.dashboardUnit}>ədəd</Text>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={styles.dashboardSubText}>Bu ay</Text>
                <Text style={[styles.dashboardGrowthText, { color: '#34d399' }]}>
                  +{stats.incoming.thisMonth} ədəd
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.dashboardCardWrapper}>
            <GlassCard style={styles.dashboardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.dashboardIconContainer, { borderColor: 'rgba(248, 113, 113, 0.3)' }]}>
                  <Icon name="arrow-up" size={20} color="#f87171" />
                </View>
                <Text style={styles.dashboardCardTitle}>Çıxan</Text>
              </View>
              <View style={styles.cardValueRow}>
                <Text style={styles.dashboardMainValue}>{stats.outgoing.total}</Text>
                <Text style={styles.dashboardUnit}>ədəd</Text>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={styles.dashboardSubText}>Bu ay</Text>
                <Text style={[styles.dashboardGrowthText, { color: '#f87171' }]}>
                  -{stats.outgoing.thisMonth} ədəd
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        </View>

        <View style={styles.dashboardRow}>
          <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.dashboardCardWrapper}>
            <GlassCard style={styles.dashboardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.dashboardIconContainer, { borderColor: 'rgba(192, 132, 252, 0.3)' }]}>
                  <Icon name="cube" size={20} color="#c084fc" />
                </View>
                <Text style={styles.dashboardCardTitle}>Cari stok dəyəri</Text>
              </View>
              <View style={styles.cardValueRow}>
                <Text style={styles.dashboardMainValue}>{stats.value.total.toLocaleString('az-AZ')}</Text>
                <Text style={styles.dashboardUnit}>AZN</Text>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={styles.dashboardSubText}>Bu ay</Text>
                <Text style={[styles.dashboardGrowthText, { color: '#34d399' }]}>
                  +{stats.value.monthlyGrowth}%
                </Text>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.dashboardCardWrapper}>
            <GlassCard style={styles.dashboardCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.dashboardIconContainer, { borderColor: 'rgba(96, 165, 250, 0.3)' }]}>
                  <Icon name="chart" size={20} color="#60a5fa" />
                </View>
                <Text style={styles.dashboardCardTitle}>Ümumi məhsul</Text>
              </View>
              <View style={styles.cardValueRow}>
                <Text style={styles.dashboardMainValue}>{stats.products.total}</Text>
              </View>
              <View style={styles.cardSubRow}>
                <Text style={styles.dashboardSubText}>Aktiv məhsul</Text>
                <Text style={[styles.dashboardGrowthText, { color: '#60a5fa' }]}>
                  {stats.products.active}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        </View>
      </View>
    );
  };

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      // 1. Search text match
      const matchesSearch = m.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.product?.sku.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Type match
      if (activeFilter === 'in' && (m.type === 'DECREASE' || m.type === 'TRANSFER_OUT')) return false;
      if (activeFilter === 'out' && (m.type === 'INCREASE' || m.type === 'TRANSFER_IN')) return false;

      // 3. Date match
      const mDate = new Date(m.createdAt);
      const now = new Date();
      if (activeDateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (mDate < sevenDaysAgo) return false;
      } else if (activeDateFilter === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (mDate < thirtyDaysAgo) return false;
      } else if (activeDateFilter === 'thisMonth') {
        if (mDate.getMonth() !== now.getMonth() || mDate.getFullYear() !== now.getFullYear()) return false;
      }

      return true;
    });
  }, [movements, searchQuery, activeFilter, activeDateFilter]);

  const renderItem = useCallback(({ item, index }: { item: StockMovement, index: number }) => {
    const info = getMovementInfo(item.type);
    return (
      <StockMovementItem 
        item={item} 
        index={index} 
        info={info} 
        formatDate={formatDate} 
      />
    );
  }, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 86, // 76px card height + 10px margin bottom
    offset: 86 * index,
    index,
  }), []);

  if (isLoading && !isRefreshing) {
    return (
      <GlassBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      </GlassBackground>
    );
  }

  const getFilterLabel = () => {
    if (activeFilter === 'in') return 'Daxil olanlar';
    if (activeFilter === 'out') return 'Çıxanlar';
    return 'Hamısı';
  };

  const typeOptions: ActionSheetOption[] = [
    { label: 'Hamısı', value: 'all', icon: 'list' },
    { label: 'Daxil olanlar', value: 'in', icon: 'arrow-circle-down' },
    { label: 'Çıxanlar', value: 'out', icon: 'arrow-circle-up' },
  ];

  const dateOptions: ActionSheetOption[] = [
    { label: 'Bütün vaxtlar', value: 'all', icon: 'calendar' },
    { label: 'Son 7 gün', value: '7days', icon: 'clock' },
    { label: 'Son 30 gün', value: '30days', icon: 'clock' },
    { label: 'Bu ay', value: 'thisMonth', icon: 'calendar' },
  ];

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilter !== 'all') count++;
    if (activeDateFilter !== 'all') count++;
    return count;
  };

  const filterCount = getActiveFilterCount();

  return (
    <GlassBackground>
      <View style={[styles.headerTopRow, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.mainTitle}>Stok</Text>
          <Text style={styles.subTitle}>Stok hərəkətlərini izləyin və idarə edin</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7} onPress={() => setTypeSheetVisible(true)}>
            <Icon name="filter" size={20} color="#ffffff" />
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isAdminOrManager && (
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => router.push('/(admin)/stock-adjust')}
              activeOpacity={0.7}
            >
              <Icon name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredMovements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={getItemLayout}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#a78bfa" colors={['#a78bfa']} />
        }
        ListHeaderComponent={
          <>
            {renderDashboard()}

            {/* Search Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Məhsul adı və ya SKU axtar..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setTypeSheetVisible(true)}>
                <Text style={styles.dropdownText}>{getFilterLabel()}</Text>
                <Icon name="chevron-down" size={14} color="#a78bfa" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.calendarBtn, activeDateFilter !== 'all' && { borderColor: '#a78bfa', backgroundColor: 'rgba(167, 139, 250, 0.1)' }]} onPress={() => setDateSheetVisible(true)}>
                <Icon name="calendar" size={20} color={activeDateFilter !== 'all' ? '#a78bfa' : '#94a3b8'} />
              </TouchableOpacity>
            </View>

            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>Stok Hərəkətləri</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="swap-vertical" size={72} color="#475569" />
            <Text style={styles.emptyText}>Hərəkət tapılmadı</Text>
          </View>
        }
      />

      <ActionSheet
        visible={typeSheetVisible}
        title="Hərəkət Növü"
        options={typeOptions}
        onSelect={(val) => setActiveFilter(val as any)}
        onClose={() => setTypeSheetVisible(false)}
      />

      <ActionSheet
        visible={dateSheetVisible}
        title="Zaman Aralığı"
        options={dateOptions}
        onSelect={(val) => setActiveDateFilter(val as any)}
        onClose={() => setDateSheetVisible(false)}
      />
    </GlassBackground>
  );
}

const StockMovementItem = React.memo(({ item, index, info, formatDate }: { item: StockMovement; index: number; info: any; formatDate: (isoString: string) => string }) => {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(1000, 500 + (index * 50))).springify()}>
      <TouchableOpacity style={styles.cardTouch} activeOpacity={0.7}>
        <GlassCard style={styles.card}>
          <View style={styles.cardLeft}>
            <View style={[styles.listIconContainer, { borderColor: info.color + '40' }]}>
              <Icon name={info.icon as any} size={20} color={info.color} />
            </View>
            <View style={styles.productDetails}>
              <Text style={styles.productName} numberOfLines={1}>{item.product?.name || 'Məhsul bilinmir'}</Text>
              <Text style={styles.skuText}>SKU: {item.product?.sku || '-'}</Text>
              <View style={styles.metaRow}>
                <View style={[styles.badge, { backgroundColor: info.color + '15', borderColor: info.color + '30' }]}>
                  <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
                </View>
                <Text style={styles.userText}>
                  Tərəfindən: {item.user?.email?.split('@')[0] || 'admin'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={styles.quantityRow}>
              <Text style={[styles.quantityText, { color: info.color }]}>
                {info.isPositive ? '+' : '-'}{item.quantity}
              </Text>
              <Text style={[styles.quantityUnit, { color: info.color }]}> ədəd</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
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
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
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
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardContainer: {
    gap: 12,
    marginBottom: 20,
  },
  dashboardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dashboardCardWrapper: {
    flex: 1,
  },
  dashboardCard: {
    padding: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 16, 38, 0.6)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dashboardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  dashboardCardTitle: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  cardValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  dashboardMainValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 6,
  },
  dashboardUnit: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardSubText: {
    fontSize: 11,
    color: '#64748b',
  },
  dashboardGrowthText: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    height: '100%',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  dropdownText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '500',
  },
  calendarBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  listLink: {
    fontSize: 13,
    color: '#c084fc',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  cardTouch: {
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 76,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 16, 38, 0.6)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  skuText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 40,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  quantityUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
  },
});
