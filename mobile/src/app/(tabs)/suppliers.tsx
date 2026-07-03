import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Platform, ScrollView, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../services/api';
import { Icon } from '../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { GlassBackground } from '../../components/glass-background';
import { GlassCard } from '../../components/glass-card';
import { BlurView } from 'expo-blur';
import { useToastStore } from '../../store/toast.store';
import { useRefreshStore } from '../../store/refresh.store';
import { CustomAlert } from '../../components/ui/custom-alert';
import Animated, { FadeInUp, FadeIn, Layout } from 'react-native-reanimated';
import { ActionSheet, ActionSheetOption } from '../../components/ui/action-sheet';

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

type TabType = 'ALL' | 'ACTIVE' | 'INACTIVE';

const getAvatarColor = (name: string) => {
  const colors = ['#8b5cf6', '#d97706', '#3b82f6', '#14b8a6', '#ec4899', '#f43f5e'];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default function SuppliersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{visible: boolean, id: string, name: string}>({visible: false, id: '', name: ''});
  
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'DEFAULT'>('DEFAULT');

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [moreSheetVisible, setMoreSheetVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();
  const supplierRefreshTrigger = useRefreshStore((state) => state.supplierRefreshTrigger);
  const { triggerSupplierRefresh } = useRefreshStore();

  const isAdmin = user?.role === 'ADMIN';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers?limit=1000');
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSuppliers();
    }, [supplierRefreshTrigger])
  );

  React.useEffect(() => {
    fetchSuppliers();
  }, [supplierRefreshTrigger]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchSuppliers();
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteAlert({ visible: true, id, name });
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/suppliers/${deleteAlert.id}`);
      showToast('Təchizatçı silindi', 'success');
      triggerSupplierRefresh();
      fetchSuppliers();
    } catch (error: any) {
      console.error('Failed to delete supplier', error);
      showToast(error.response?.data?.message || 'Təchizatçı silinərkən xəta baş verdi', 'error');
    } finally {
      setDeleteAlert({ visible: false, id: '', name: '' });
    }
  };

  const counts = useMemo(() => {
    let active = 0, inactive = 0;
    suppliers.forEach(s => {
      if (s.isActive) active++;
      else inactive++;
    });
    return { ALL: suppliers.length, ACTIVE: active, INACTIVE: inactive };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter(s => {
      if (activeTab === 'ACTIVE' && !s.isActive) return false;
      if (activeTab === 'INACTIVE' && s.isActive) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    if (sortOrder === 'A-Z') {
      result = result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'Z-A') {
      result = result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [suppliers, activeTab, searchQuery, sortOrder]);

  const filterOptions: ActionSheetOption[] = [
    { label: 'A-dan Z-yə', value: 'A-Z', icon: 'text-t' },
    { label: 'Z-dən A-ya', value: 'Z-A', icon: 'text-t' },
    { label: 'Sıfırla', value: 'DEFAULT', icon: 'arrows-clockwise' },
  ];

  const getMoreOptions = (): ActionSheetOption[] => {
    const options: ActionSheetOption[] = [
      { label: 'Zəng et', value: 'CALL', icon: 'phone' },
      { label: 'E-poçt göndər', value: 'EMAIL', icon: 'mail' },
    ];
    if (isAdminOrManager) {
      options.push({ label: 'Redaktə et', value: 'EDIT', icon: 'edit' });
    }
    if (isAdmin) {
      options.push({ label: 'Sil', value: 'DELETE', icon: 'trash', color: '#f87171' });
    }
    return options;
  };

  const handleFilterSelect = (val: string) => {
    setSortOrder(val as any);
    setFilterSheetVisible(false);
  };

  const handleFilterPress = () => {
    setFilterSheetVisible(true);
  };

  const handleMoreSelect = (val: string) => {
    setMoreSheetVisible(false);
    if (!selectedSupplier) return;
    
    if (val === 'CALL') {
      if (selectedSupplier.phone) Linking.openURL(`tel:${selectedSupplier.phone}`);
      else showToast('Telefon nömrəsi yoxdur', 'error');
    } else if (val === 'EMAIL') {
      if (selectedSupplier.email) Linking.openURL(`mailto:${selectedSupplier.email}`);
      else showToast('E-poçt yoxdur', 'error');
    } else if (val === 'EDIT') {
      router.push({ pathname: '/(admin)/supplier-form', params: { id: selectedSupplier.id } });
    } else if (val === 'DELETE') {
      handleDelete(selectedSupplier.id, selectedSupplier.name);
    }
  };

  const handleMorePress = (item: Supplier) => {
    setSelectedSupplier(item);
    setMoreSheetVisible(true);
  };

  const renderTab = (type: TabType, label: string, count: number, badgeColor: string) => {
    const isActive = activeTab === type;
    return (
      <TouchableOpacity 
        style={[styles.tabButton, isActive && styles.tabButtonActive]} 
        onPress={() => setActiveTab(type)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
        <View style={[styles.tabBadge, { backgroundColor: isActive ? badgeColor : 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.tabBadgeText, { color: isActive ? '#ffffff' : '#cbd5e1' }]}>
             {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = React.useCallback(({ item, index }: { item: Supplier, index: number }) => {
    const avatarColor = getAvatarColor(item.name);
    return (
      <SupplierItem 
        item={item} 
        index={index} 
        avatarColor={avatarColor} 
        handleMorePress={handleMorePress} 
        handleDelete={handleDelete} 
        isAdmin={isAdmin} 
        isAdminOrManager={isAdminOrManager} 
        router={router} 
      />
    );
  }, [isAdmin, isAdminOrManager, router]);

  if (isLoading && !isRefreshing) {
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
          <View style={styles.titleContainer}>
            <Text style={styles.mainTitle}>Təchizatçılar</Text>
            <Text style={styles.subTitle}>Təchizatçıları idarə edin və məlumatları izləyin</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearchActive(!isSearchActive)}>
              <Icon name="search" size={20} color="#ffffff" />
            </TouchableOpacity>
            {isAdminOrManager && (
              <TouchableOpacity style={styles.addIconButton} onPress={() => router.push('/(admin)/supplier-form')}>
                <Icon name="add" size={24} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isSearchActive && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.searchContainer}>
            <Icon name="search" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Təchizatçı axtar..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </Animated.View>
        )}

        <View style={styles.tabsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {renderTab('ALL', 'Hamısı', counts.ALL, '#8b5cf6')}
            {renderTab('ACTIVE', 'Aktiv', counts.ACTIVE, '#34d399')}
            {renderTab('INACTIVE', 'Deaktiv', counts.INACTIVE, '#f87171')}
          </ScrollView>
          <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
            <Icon name="filter" size={18} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredSuppliers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#a78bfa" colors={['#a78bfa']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="business" size={72} color="#475569" />
            <Text style={styles.emptyText}>Təchizatçı tapılmadı</Text>
          </View>
        }
      />

      <ActionSheet
        visible={filterSheetVisible}
        title="Sıralama"
        options={filterOptions}
        onSelect={handleFilterSelect}
        onClose={() => setFilterSheetVisible(false)}
      />

      <ActionSheet
        visible={moreSheetVisible}
        title={selectedSupplier ? selectedSupplier.name : 'Seçimlər'}
        options={getMoreOptions()}
        onSelect={handleMoreSelect}
        onClose={() => setMoreSheetVisible(false)}
      />

      <CustomAlert
        visible={deleteAlert.visible}
        title="Təchizatçını Sil"
        message={`"${deleteAlert.name}" təchizatçısını silmək istədiyinizdən əminsiniz?`}
        cancelText="İmtina"
        confirmText="Sil"
        confirmStyle="destructive"
        onCancel={() => setDeleteAlert({ visible: false, id: '', name: '' })}
        onConfirm={confirmDelete}
      />
    </GlassBackground>
  );
}

const SupplierItem = React.memo(({ 
  item, 
  index, 
  avatarColor, 
  handleMorePress, 
  handleDelete, 
  isAdmin, 
  isAdminOrManager, 
  router 
}: { 
  item: Supplier; 
  index: number; 
  avatarColor: string; 
  handleMorePress: (s: Supplier) => void; 
  handleDelete: (id: string, name: string) => void; 
  isAdmin: boolean; 
  isAdminOrManager: boolean; 
  router: any 
}) => {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(1000, index * 40)).springify()} layout={Layout.springify()}>
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor + '20', borderColor: avatarColor + '40' }]}>
            <Text style={[styles.avatarText, { color: avatarColor }]}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.statusBadge, item.isActive ? styles.statusActive : styles.statusInactive]}>
                <View style={[styles.statusDot, item.isActive ? styles.dotActive : styles.dotInactive]} />
                <Text style={[styles.statusText, item.isActive ? styles.textActive : styles.textInactive]}>
                  {item.isActive ? 'Aktiv' : 'Deaktiv'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={() => handleMorePress(item)}>
            <Icon name="more-vertical" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.contactContainer}>
          <View style={styles.contactRow}>
            <Icon name="phone" size={16} color="#64748b" />
            <Text style={styles.contactText}>{item.phone || 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="mail" size={16} color="#64748b" />
            <Text style={styles.contactText}>{item.email || 'Göstərilməyib'}</Text>
          </View>
        </View>

        {isAdminOrManager && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => router.push({ pathname: '/(admin)/supplier-form', params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={16} color="#8b5cf6" />
              <Text style={styles.editText}>Redaktə</Text>
            </TouchableOpacity>

            {isAdmin && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(item.id, item.name)}
                activeOpacity={0.7}
              >
                <Icon name="trash" size={16} color="#f87171" />
                <Text style={styles.deleteText}>Sil</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </GlassCard>
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
  titleContainer: {
    flex: 1,
    paddingRight: 10,
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
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsContainer: {
    gap: 10,
    paddingRight: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
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
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 16, 38, 0.6)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  statusActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  statusInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#34d399',
  },
  dotInactive: {
    backgroundColor: '#f87171',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textActive: {
    color: '#34d399',
  },
  textInactive: {
    color: '#f87171',
  },
  moreButton: {
    padding: 4,
  },
  contactContainer: {
    gap: 10,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#cbd5e1',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
  },
  editButton: {
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  deleteButton: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  editText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
