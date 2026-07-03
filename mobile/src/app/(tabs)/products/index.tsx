import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, RefreshControl, TextInput, Platform, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../services/api';
import { Icon } from '../../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth.store';
import { useRefreshStore } from '../../../store/refresh.store';
import { GlassBackground } from '../../../components/glass-background';
import { GlassCard } from '../../../components/glass-card';
import { ActionSheet, ActionSheetOption } from '../../../components/ui/action-sheet';

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  isActive: boolean;
}

type FilterType = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type SortType = 'newest' | 'name_asc' | 'stock_desc' | 'stock_asc';

export default function ProductsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortSheetVisible, setSortSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const productRefreshTrigger = useRefreshStore((state) => state.productRefreshTrigger);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const data = response.data.data || [];
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower)
      );
    }

    // 2. Tab Filter
    if (activeFilter === 'in_stock') {
      result = result.filter((p) => p.stock > (p.minimumStock ?? 0));
    } else if (activeFilter === 'low_stock') {
      result = result.filter((p) => p.stock > 0 && p.stock <= (p.minimumStock ?? 0));
    } else if (activeFilter === 'out_of_stock') {
      result = result.filter((p) => p.stock === 0);
    }

    // 3. Sorting
    if (activeSort === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'az-AZ'));
    } else if (activeSort === 'stock_desc') {
      result.sort((a, b) => b.stock - a.stock);
    } else if (activeSort === 'stock_asc') {
      result.sort((a, b) => a.stock - b.stock);
    }

    return result;
  }, [products, searchQuery, activeFilter, activeSort]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  useEffect(() => {
    fetchProducts();
  }, [productRefreshTrigger]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
  };

  const handleSortChange = () => {
    setSortSheetVisible(true);
  };

  const sortOptions: ActionSheetOption[] = [
    { label: 'Ən yeni', value: 'newest', icon: 'clock' },
    { label: 'Ad (A - Z)', value: 'name_asc', icon: 'text-t' },
    { label: 'Stok (Çoxdan - Aza)', value: 'stock_desc', icon: 'trend-down' },
    { label: 'Stok (Azdan - Çoxa)', value: 'stock_asc', icon: 'trend-up' },
  ];

  const handleSortSelect = (value: string) => {
    const sort = value as SortType;
    setActiveSort(sort);
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchProducts();
  };

  const handleItemPress = useCallback((id: string) => {
    router.push(`/product/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: Product }) => {
    return <ProductItem item={item} onPress={handleItemPress} />;
  }, [handleItemPress]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 84, // 72px card height + 12px margin bottom
    offset: 84 * index,
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

  const getActiveFilterLabel = () => {
    switch (activeSort) {
      case 'name_asc': return 'Ad';
      case 'stock_desc': return 'Stok ↓';
      case 'stock_asc': return 'Stok ↑';
      default: return 'Sıralama';
    }
  };

  return (
    <GlassBackground>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>Məhsullar</Text>
          <Text style={styles.headerSubtitle}>{products.length} Məhsul mövcuddur</Text>
        </View>
        {isAdminOrManager && (
          <TouchableOpacity 
            style={styles.headerPlusBtn}
            onPress={() => router.push('/(admin)/product-form')}
            activeOpacity={0.7}
          >
            <Icon name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainerWrapper}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Məhsul adı və ya SKU ilə axtar..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton} activeOpacity={0.7}>
              <Icon name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.filterSortRow}>
        <View style={{ flex: 1 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            <TouchableOpacity 
              style={[styles.tabButton, activeFilter === 'all' && styles.tabButtonActive]}
              onPress={() => handleFilterChange('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeFilter === 'all' && styles.tabTextActive]}>Hamısı</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeFilter === 'in_stock' && styles.tabButtonActive]}
              onPress={() => handleFilterChange('in_stock')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIndicatorDot, { backgroundColor: '#34d399' }]} />
              <Text style={[styles.tabText, activeFilter === 'in_stock' && styles.tabTextActive]}>Stokda</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeFilter === 'low_stock' && styles.tabButtonActive]}
              onPress={() => handleFilterChange('low_stock')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIndicatorDot, { backgroundColor: '#fbbf24' }]} />
              <Text style={[styles.tabText, activeFilter === 'low_stock' && styles.tabTextActive]}>Kritik</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeFilter === 'out_of_stock' && styles.tabButtonActive]}
              onPress={() => handleFilterChange('out_of_stock')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIndicatorDot, { backgroundColor: '#f87171' }]} />
              <Text style={[styles.tabText, activeFilter === 'out_of_stock' && styles.tabTextActive]}>Stoksuz</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <TouchableOpacity 
          style={styles.sortButton} 
          onPress={handleSortChange}
          activeOpacity={0.7}
        >
          <Icon name="swap-vertical" size={14} color="#94a3b8" style={{ marginRight: 4 }} />
          <Text style={styles.sortButtonText}>{getActiveFilterLabel()}</Text>
          <Icon name="chevron-down" size={12} color="#94a3b8" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube" size={72} color="#475569" />
            <Text style={styles.emptyText}>Heç bir məhsul tapılmadı</Text>
          </View>
        }
      />

      {isAdminOrManager && (
        <TouchableOpacity
          style={styles.fabTouch}
          onPress={() => router.push('/(admin)/product-form')}
          activeOpacity={0.85}
        >
          <View style={styles.fab}>
            <Icon name="add" size={28} color="#ffffff" />
          </View>
        </TouchableOpacity>
      )}

      <ActionSheet
        visible={sortSheetVisible}
        title="Sıralama Seçin"
        options={sortOptions}
        onSelect={handleSortSelect}
        onClose={() => setSortSheetVisible(false)}
      />
    </GlassBackground>
  );
}

interface ProductItemProps {
  item: Product;
  onPress: (id: string) => void;
}

const ProductItem = React.memo(({ item, onPress }: ProductItemProps) => {
  const isCritical = item.stock === 0;
  const isLow = item.stock > 0 && item.stock <= (item.minimumStock ?? 0);
  const estimatedValue = item.stock * 25;

  return (
    <TouchableOpacity 
      style={styles.cardTouch}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <GlassCard style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={styles.cubeContainer}>
            <Icon name="cube" size={20} color="#a78bfa" />
          </View>
          <View style={styles.productDetails}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.skuText}>SKU: {item.sku}</Text>
            <View style={styles.statusIndicatorRow}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: isCritical ? '#f87171' : isLow ? '#fbbf24' : '#34d399' }
              ]} />
              <Text style={styles.statusText}>
                {isCritical ? 'Stoksuz' : isLow ? 'Az Stok' : 'Normal Stok'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={[
            styles.quantityBadge, 
            isCritical ? styles.badgeCritical : isLow ? styles.badgeLow : styles.badgeNormal
          ]}>
            <Text style={[
              styles.quantityText,
              isCritical ? styles.textCritical : isLow ? styles.textLow : styles.textNormal
            ]}>
              {item.stock} ədəd
            </Text>
          </View>
          <View style={styles.arrowRow}>
            <Text style={styles.priceText}>
              {estimatedValue.toLocaleString('az-AZ')} AZN
            </Text>
            <Icon name="chevron-right" size={16} color="#94a3b8" style={{ marginLeft: 6 }} />
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#a78bfa',
  },
  headerPlusBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(25, 20, 45, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  filterSortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabsScrollContent: {
    gap: 8,
    paddingRight: 12,
    alignItems: 'center',
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  tabIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#c084fc',
    fontWeight: '700',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sortButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  cardTouch: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 72,
    backgroundColor: 'rgba(25, 20, 45, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cubeContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  skuText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 4,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
  },
  quantityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeNormal: {
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  badgeLow: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  badgeCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  quantityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textNormal: {
    color: '#34d399',
  },
  textLow: {
    color: '#fbbf24',
  },
  textCritical: {
    color: '#f87171',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  fabTouch: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  fab: {
    width: 56,
    height: 56,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
