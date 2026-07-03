import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { Icon } from '../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { GlassBackground } from '../../components/glass-background';
import { GlassCard } from '../../components/glass-card';
import { BarChart } from '../../components/bar-chart';

interface DashboardStats {
  totalProducts: number;
  totalSuppliers: number;
  criticalProducts: number;
  activeProductsCount: number;
  totalStock: number;
  weeklyData: number[];
  monthlyData: number[];
  recentMovements: any[];
  girişWeekly: number;
  çıxışWeekly: number;
  girişMonthly: number;
  çıxışMonthly: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSuppliers: 0,
    criticalProducts: 0,
    activeProductsCount: 0,
    totalStock: 0,
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    monthlyData: Array(30).fill(0),
    recentMovements: [],
    girişWeekly: 0,
    çıxışWeekly: 0,
    girişMonthly: 0,
    çıxışMonthly: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartRange, setChartRange] = useState<'7d' | '30d'>('7d');

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchDashboardData = async () => {
    try {
      const [productsRes, suppliersRes, movementsRes] = await Promise.all([
        api.get('/products'),
        api.get('/suppliers'),
        api.get('/stock/movement?limit=100'),
      ]);

      const products = productsRes.data.data || [];
      const suppliers = suppliersRes.data.data || [];
      const movements = movementsRes.data.data || [];

      const totalProducts = products.length;
      const totalSuppliers = suppliers.length;
      const criticalProducts = products.filter((p: any) => p.stock <= p.minimumStock).length;
      const activeProductsCount = products.filter((p: any) => p.stock > 0).length;
      const totalStock = products.reduce((acc: number, p: any) => acc + p.stock, 0);

      // Calculate last 7 days and 30 days of movement counts
      const weeklyData = [0, 0, 0, 0, 0, 0, 0];
      const monthlyData = Array(30).fill(0);
      const today = new Date();
      
      let girişWeekly = 0;
      let çıxışWeekly = 0;
      let girişMonthly = 0;
      let çıxışMonthly = 0;

      movements.forEach((m: any) => {
        const mDate = new Date(m.createdAt);
        const diffTime = Math.abs(today.getTime() - mDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const isPositive = m.type === 'INCREASE' || m.type === 'TRANSFER_IN';
        
        if (diffDays < 7) {
          weeklyData[6 - diffDays] += m.quantity;
          if (isPositive) girişWeekly += m.quantity;
          else çıxışWeekly += m.quantity;
        }
        if (diffDays < 30) {
          monthlyData[29 - diffDays] += m.quantity;
          if (isPositive) girişMonthly += m.quantity;
          else çıxışMonthly += m.quantity;
        }
      });

      setStats({
        totalProducts,
        totalSuppliers,
        criticalProducts,
        activeProductsCount,
        totalStock,
        weeklyData,
        monthlyData,
        recentMovements: movements.slice(0, 5),
        girişWeekly,
        çıxışWeekly,
        girişMonthly,
        çıxışMonthly,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData();
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${Math.max(diffMins, 1)} dəqiqə əvvəl`;
    } else if (diffHours < 24) {
      return `${diffHours} saat əvvəl`;
    } else {
      return `${diffDays} gün əvvəl`;
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <GlassBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      </GlassBackground>
    );
  }

  const getWeekdayLabels = () => {
    const today = new Date();
    const result = [];
    const map = ['B.', 'B.e', 'Ç.a', 'Ç.', 'C.a', 'C.', 'Ş.'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      result.push(map[d.getDay()]);
    }
    return result;
  };

  const activeProductsPercent = stats.totalProducts > 0 
    ? Math.round((stats.activeProductsCount / stats.totalProducts) * 100)
    : 0;

  return (
    <GlassBackground>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#a78bfa" colors={['#a78bfa']} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Salam, {user?.email?.split('@')[0]}! 👋</Text>
            <Text style={styles.headerSubtitle}>Anbar idarəetmə paneli</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.bellButton} 
              onPress={() => router.push('/notifications')}
              activeOpacity={0.7}
            >
              <Icon name="notifications" size={22} color="#ffffff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {isAdminOrManager && (
              <TouchableOpacity 
                style={styles.plusButton} 
                onPress={() => router.push('/(admin)/product-form')}
                activeOpacity={0.7}
              >
                <Icon name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main KPI Card */}
        <GlassCard style={styles.mainKpiCard}>
          <View style={styles.mainKpiLeft}>
            <View style={[styles.cubeContainer, styles.cubeIconWrapper]}>
              <Icon name="cube" size={34} color="#c084fc" />
            </View>
            <View style={styles.mainKpiTexts}>
              <Text style={styles.mainKpiLabel}>Ümumi Məhsul</Text>
              <View style={styles.mainKpiValueRow}>
                <Text style={styles.mainKpiValue}>{stats.totalProducts.toLocaleString('az-AZ')}</Text>
                <View style={styles.skuBadge}>
                  <Text style={styles.skuBadgeText}>SKU</Text>
                </View>
              </View>
              <Text style={styles.mainKpiSubText}>
                Dəyər: {(stats.totalStock * 25).toLocaleString('az-AZ')} AZN
              </Text>
            </View>
          </View>
          <View style={styles.mainKpiRight}>
            <View style={styles.growthBadge}>
              <Text style={styles.growthBadgeText}>↑ 12.5%</Text>
            </View>
            <Text style={styles.growthSubText}>Bu ay</Text>
          </View>
        </GlassCard>

        {/* 2x2 Stats Grid */}
        <View style={styles.grid}>
          {/* Card 1: Aktiv Məhsullar */}
          <GlassCard style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.gridIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Icon name="cube" size={16} color="#60a5fa" />
              </View>
              <Text style={styles.gridCardLabel}>Aktiv Məhsullar</Text>
            </View>
            <View style={styles.gridCardValueRow}>
              <Text style={styles.gridCardValue}>{stats.activeProductsCount}</Text>
              <Text style={styles.gridCardPercent}>{activeProductsPercent}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${activeProductsPercent}%`, backgroundColor: '#3b82f6' }]} />
            </View>
          </GlassCard>

          {/* Card 2: Təchizatçılar */}
          <GlassCard style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.gridIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Icon name="business" size={16} color="#fbbf24" />
              </View>
              <Text style={styles.gridCardLabel}>Təchizatçılar</Text>
            </View>
            <View style={styles.gridCardValueRow}>
              <Text style={styles.gridCardValue}>{stats.totalSuppliers}</Text>
              <Text style={[styles.gridCardPercent, { color: '#fbbf24' }]}>Aktiv</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '70%', backgroundColor: '#f59e0b' }]} />
            </View>
          </GlassCard>
        </View>

        <View style={styles.grid}>
          {/* Card 3: Kritik Stok */}
          <GlassCard style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.gridIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Icon name="alert" size={16} color="#f87171" />
              </View>
              <Text style={styles.gridCardLabel}>Kritik Stok</Text>
            </View>
            <View style={styles.gridCardValueRow}>
              <Text style={[styles.gridCardValue, stats.criticalProducts > 0 && { color: '#f87171' }]}>
                {stats.criticalProducts}
              </Text>
              <Text style={[styles.gridCardPercent, { color: '#f87171' }]}>Məhsul</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: stats.totalProducts > 0 ? `${(stats.criticalProducts / stats.totalProducts) * 100}%` : '0%', backgroundColor: '#ef4444' }]} />
            </View>
          </GlassCard>

          {/* Card 4: Bildirişlər */}
          <GlassCard style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.gridIconBg, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                <Icon name="notifications" size={16} color="#c084fc" />
              </View>
              <Text style={styles.gridCardLabel}>Bildirişlər</Text>
            </View>
            <View style={styles.gridCardValueRow}>
              <Text style={styles.gridCardValue}>{unreadCount}</Text>
              <Text style={[styles.gridCardPercent, { color: '#c084fc' }]}>Yeni</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: unreadCount > 0 ? '50%' : '0%', backgroundColor: '#a78bfa' }]} />
            </View>
          </GlassCard>
        </View>

        {/* Anbar Hərəkətləri Chart */}
        <GlassCard style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Anbar Hərəkətləri</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity 
                style={[styles.toggleBtn, chartRange === '7d' && styles.toggleBtnActive]}
                onPress={() => setChartRange('7d')}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, chartRange === '7d' && styles.toggleTextActive]}>7 Gün</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, chartRange === '30d' && styles.toggleBtnActive]}
                onPress={() => setChartRange('30d')}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, chartRange === '30d' && styles.toggleTextActive]}>30 Gün</Text>
              </TouchableOpacity>
            </View>
          </View>

          <BarChart 
            data={chartRange === '7d' ? stats.weeklyData : stats.monthlyData} 
            labels={chartRange === '7d' ? getWeekdayLabels() : ['30 gün əvvəl', 'Bu gün']}
            height={150}
            color="#a78bfa"
          />

          {/* Giriş / Çıxış Summary Cards */}
          <View style={styles.chartSummaryRow}>
            <View style={styles.summarySubCard}>
              <View style={[styles.arrowCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Icon name="arrow-down" size={16} color="#10b981" />
              </View>
              <View style={styles.summaryTexts}>
                <Text style={styles.summaryLabel}>Giriş</Text>
                <View style={styles.summaryValueRow}>
                  <Text style={styles.summaryValue}>
                    {chartRange === '7d' ? stats.girişWeekly : stats.girişMonthly}
                  </Text>
                  <Text style={styles.summaryGrowth}>+18.2%</Text>
                </View>
              </View>
            </View>

            <View style={styles.summarySubCard}>
              <View style={[styles.arrowCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Icon name="arrow-up" size={16} color="#ef4444" />
              </View>
              <View style={styles.summaryTexts}>
                <Text style={styles.summaryLabel}>Çıxış</Text>
                <View style={styles.summaryValueRow}>
                  <Text style={styles.summaryValue}>
                    {chartRange === '7d' ? stats.çıxışWeekly : stats.çıxışMonthly}
                  </Text>
                  <Text style={[styles.summaryGrowth, { color: '#ef4444' }]}>-6.3%</Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Sürətli Əməliyyatlar */}
        <Text style={styles.sectionTitle}>Sürətli Əməliyyatlar</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(admin)/stock-adjust')} activeOpacity={0.8}>
            <GlassCard style={styles.actionCard}>
              <Icon name="swap-vertical" size={22} color="#60a5fa" />
              <Text style={styles.actionText}>Stok Dəyiş</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(admin)/product-form')} activeOpacity={0.8}>
            <GlassCard style={styles.actionCard}>
              <Icon name="add" size={22} color="#34d399" />
              <Text style={styles.actionText}>Yeni Məhsul</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(admin)/supplier-form')} activeOpacity={0.8}>
            <GlassCard style={styles.actionCard}>
              <Icon name="business" size={22} color="#fbbf24" />
              <Text style={styles.actionText}>Yeni Təchizatçı</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        <View style={[styles.quickActionsGrid, { marginTop: 10 }]}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(admin)/users')} activeOpacity={0.8}>
            <GlassCard style={styles.actionCard}>
              <Icon name="users" size={22} color="#c084fc" />
              <Text style={styles.actionText}>İstifadəçilər</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/profile')} activeOpacity={0.8}>
            <GlassCard style={styles.actionCard}>
              <Icon name="person" size={22} color="#38bdf8" />
              <Text style={styles.actionText}>Mənim Profilim</Text>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
            <GlassCard style={styles.actionCard}>
              <Icon name="notifications" size={22} color="#f472b6" />
              <Text style={styles.actionText}>Bildirişlərim</Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* Son Hərəkətlər Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Son Hərəkətlər</Text>
          <TouchableOpacity onPress={() => router.push('/stock')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Hamısına bax</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.movementsList}>
          {stats.recentMovements.length > 0 ? (
            stats.recentMovements.map((item) => {
              const isPositive = item.type === 'INCREASE' || item.type === 'TRANSFER_IN';
              return (
                <GlassCard key={item.id} style={styles.movementItem}>
                  <View style={styles.movementLeft}>
                    <View style={[
                      styles.arrowBgCircle, 
                      { backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                    ]}>
                      <Icon 
                        name={isPositive ? "arrow-down" : "arrow-up"} 
                        size={18} 
                        color={isPositive ? "#10b981" : "#ef4444"} 
                      />
                    </View>
                    <View style={styles.movementTexts}>
                      <Text style={styles.movementTitle}>
                        {isPositive ? 'Məhsul girişi edildi' : 'Məhsul çıxışı edildi'}
                      </Text>
                      <Text style={styles.movementSubtitle}>
                        {item.product?.name || 'Bilinməyən Məhsul'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.movementRight}>
                    <Text style={[styles.movementQty, { color: isPositive ? "#10b981" : "#ef4444" }]}>
                      {isPositive ? '+' : '-'}{item.quantity} ədəd
                    </Text>
                    <Text style={styles.movementTime}>{formatTimeAgo(item.createdAt)}</Text>
                  </View>
                </GlassCard>
              );
            })
          ) : (
            <Text style={styles.emptyText}>Son hərəkət tapılmadı</Text>
          )}
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
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
  bellButton: {
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
  plusButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7c3aed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  mainKpiCard: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(25, 20, 45, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainKpiLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cubeContainer: {
    marginRight: 16,
  },
  cubeIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainKpiTexts: {
    flex: 1,
  },
  mainKpiLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  mainKpiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  mainKpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  skuBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  skuBadgeText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  mainKpiSubText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  mainKpiRight: {
    alignItems: 'flex-end',
  },
  growthBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  growthBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  growthSubText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  gridCard: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(25, 20, 45, 0.45)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gridIconBg: {
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  gridCardValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  gridCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  gridCardPercent: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '700',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  chartCard: {
    padding: 16,
    backgroundColor: 'rgba(25, 20, 45, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 8,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#c084fc',
    fontWeight: '700',
  },
  chartSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 16,
  },
  summarySubCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 10,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryTexts: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
  summaryValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  summaryGrowth: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionItem: {
    flex: 1,
  },
  actionCard: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25, 20, 45, 0.4)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 24,
    marginBottom: 12,
  },
  seeAllText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  movementsList: {
    gap: 10,
  },
  movementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(25, 20, 45, 0.35)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  movementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  arrowBgCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementTexts: {
    flex: 1,
  },
  movementTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  movementSubtitle: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  movementRight: {
    alignItems: 'flex-end',
  },
  movementQty: {
    fontSize: 13,
    fontWeight: '800',
  },
  movementTime: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 2,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
});
