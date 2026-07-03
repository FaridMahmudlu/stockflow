import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Platform, Share, Clipboard } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../services/api';
import { Icon } from '../../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth.store';
import { GlassBackground } from '../../../components/glass-background';
import { GlassCard } from '../../../components/glass-card';
import { useToastStore } from '../../../store/toast.store';
import { useRefreshStore } from '../../../store/refresh.store';
import { CustomAlert } from '../../../components/ui/custom-alert';
import { ActionSheet, ActionSheetOption } from '../../../components/ui/action-sheet';

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  supplierId: string | null;
  supplier: Supplier | null;
  isActive: boolean;
  category?: string;
  brand?: string;
  unit?: string;
  model?: string;
  location?: string;
  purchasePrice?: number;
  salePrice?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { triggerProductRefresh } = useRefreshStore();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const isAdmin = user?.role === 'ADMIN';
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product details', error);
      showToast('Məhsul məlumatları tapılmadı', 'error');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchProduct();
      }
    }, [id])
  );

  const handleDelete = () => {
    setDeleteAlertVisible(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/products/${id}`);
      showToast('Məhsul silindi', 'success');
      triggerProductRefresh();
      router.replace('/products');
    } catch (error: any) {
      console.error('Failed to delete product', error);
      showToast(error.response?.data?.message || 'Məhsul silinərkən xəta baş verdi', 'error');
    } finally {
      setDeleteAlertVisible(false);
    }
  };

  const handleCopySKU = async () => {
    if (!product) return;
    try {
      Clipboard.setString(product.sku);
      showToast('SKU panoya kopyalandı!', 'success');
    } catch (err) {
      await Share.share({ message: product.sku });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };



  const handleMoreOptions = () => {
    setOptionsSheetVisible(true);
  };

  const moreOptions: ActionSheetOption[] = [
    { label: 'Paylaş', value: 'share', icon: 'share-network' },
    { label: 'Düzəliş Et', value: 'edit', icon: 'edit' },
  ];

  const handleOptionSelect = async (value: string) => {
    if (value === 'share' && product) {
      await Share.share({ message: `Məhsul: ${product.name}\nSKU: ${product.sku}\nStok: ${product.stock} ədəd` });
    } else if (value === 'edit') {
      router.push({ pathname: '/(admin)/product-form', params: { id: product?.id } });
    }
  };

  if (isLoading || !product) {
    return (
      <GlassBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      </GlassBackground>
    );
  }

  const isCritical = product.stock === 0;
  const isLow = product.stock > 0 && product.stock <= product.minimumStock;

  return (
    <GlassBackground>
      {/* Header matching reference */}
      <View style={[styles.headerNav, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.roundedBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitleText}>Məhsul Detalı</Text>
        <TouchableOpacity style={styles.roundedBtn} onPress={handleMoreOptions} activeOpacity={0.7}>
          <Icon name="more-vertical" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Product Title Card Block */}
        <View style={styles.productBlock}>
          <View style={styles.cubeBoxWrapper}>
            <Icon name="cube" size={32} color="#c084fc" />
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.productNameText}>{product.name}</Text>
            
            <View style={styles.skuBadgeRow}>
              <TouchableOpacity style={styles.skuBadge} onPress={handleCopySKU} activeOpacity={0.7}>
                <Text style={styles.skuBadgeText}>SKU: {product.sku}</Text>
                <Icon name="copy" size={12} color="#94a3b8" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusBadgeRow}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: isCritical ? '#f87171' : isLow ? '#fbbf24' : '#34d399' }
              ]} />
              <Text style={styles.statusBadgeText}>
                {isCritical ? 'Stoksuz' : isLow ? 'Az Stok' : 'Normal Stok'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stok Vəziyyəti Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="chart" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Stok Vəziyyəti</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.rowLabelText}>Mövcud Miqdar</Text>
              <Text style={styles.rowSubLabelText}>Hazırda mövcud olan ədəd</Text>
            </View>
            <Text style={[
              styles.quantityValueText,
              isCritical ? styles.textCritical : isLow ? styles.textLow : styles.textNormal
            ]}>
              {product.stock} ədəd
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <View>
              <Text style={styles.rowLabelText}>Minimum Hədd</Text>
              <Text style={styles.rowSubLabelText}>Stokun düşməməli olduğu hədd</Text>
            </View>
            <Text style={styles.quantityValueTextWhite}>
              {product.minimumStock} ədəd
            </Text>
          </View>
        </GlassCard>

        {/* Təchizatçı Məlumatı Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="bus" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Təchizatçı Məlumatı</Text>
          </View>

          <View style={styles.divider} />

          {product.supplier ? (
            <>
              <View style={styles.cardRowSimple}>
                <Text style={styles.simpleLabel}>Adı</Text>
                <Text style={styles.simpleValue}>{product.supplier.name}</Text>
              </View>
              <View style={styles.cardRowSimple}>
                <Text style={styles.simpleLabel}>Telefon</Text>
                <Text style={styles.simpleValue}>{product.supplier.phone || 'Göstərilməyib'}</Text>
              </View>
              <View style={styles.cardRowSimple}>
                <Text style={styles.simpleLabel}>E-poçt</Text>
                <Text style={styles.simpleValue}>{product.supplier.email || 'Göstərilməyib'}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Bu məhsula təchizatçı təyin edilməyib.</Text>
          )}
        </GlassCard>

        {/* Digər Məlumatlar Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="info" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Digər Məlumatlar</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Kategoriya</Text>
            <Text style={styles.simpleValue}>{product.category || 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Marka</Text>
            <Text style={styles.simpleValue}>{product.brand || 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Model</Text>
            <Text style={styles.simpleValue}>{product.model || 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Vahid</Text>
            <Text style={styles.simpleValue}>{product.unit || 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Məkan (Anbar)</Text>
            <Text style={styles.simpleValue}>{product.location || 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Yaradılma tarixi</Text>
            <Text style={styles.simpleValue}>{formatDate(product.createdAt)}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Son yenilənmə</Text>
            <Text style={styles.simpleValue}>{formatDate(product.updatedAt)}</Text>
          </View>
        </GlassCard>

        {/* Qiymət Məlumatları Card */}
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="cash" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
            <Text style={styles.cardHeaderTitle}>Qiymət Məlumatları</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Alış Qiyməti</Text>
            <Text style={styles.simpleValue}>{product.purchasePrice ? `${product.purchasePrice} AZN` : 'Göstərilməyib'}</Text>
          </View>
          <View style={styles.cardRowSimple}>
            <Text style={styles.simpleLabel}>Satış Qiyməti</Text>
            <Text style={styles.simpleValue}>{product.salePrice ? `${product.salePrice} AZN` : 'Göstərilməyib'}</Text>
          </View>
        </GlassCard>

        {/* Təsvir Card */}
        {product.description && (
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="document-text" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>Təsvir</Text>
            </View>

            <View style={styles.divider} />

            <Text style={{ color: '#ffffff', fontSize: 13, lineHeight: 20 }}>
              {product.description}
            </Text>
          </GlassCard>
        )}

        {/* İdarəetmə Paneli Card */}
        {isAdminOrManager && (
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="settings" size={18} color="#a78bfa" style={{ marginRight: 8 }} />
              <Text style={styles.cardHeaderTitle}>İdarəetmə Paneli</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => router.push({ pathname: '/(admin)/product-form', params: { id: product.id } })}
                activeOpacity={0.8}
              >
                <Icon name="edit" size={18} color="#60a5fa" />
                <Text style={[styles.actionButtonText, { color: '#60a5fa' }]}>Redaktə et</Text>
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Icon name="trash" size={18} color="#f87171" />
                  <Text style={[styles.actionButtonText, { color: '#f87171' }]}>Sil</Text>
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
        )}
      </ScrollView>

      <CustomAlert
        visible={deleteAlertVisible}
        title="Məhsulu Sil"
        message="Bu məhsulu silmək istədiyinizdən əminsiniz?"
        cancelText="İmtina"
        confirmText="Sil"
        confirmStyle="destructive"
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={confirmDelete}
      />

      <ActionSheet
        visible={optionsSheetVisible}
        title="Seçimlər"
        options={moreOptions}
        onSelect={handleOptionSelect}
        onClose={() => setOptionsSheetVisible(false)}
      />
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
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  roundedBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  productBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  cubeBoxWrapper: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleInfo: {
    flex: 1,
  },
  productNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  skuBadgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  skuBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 18,
  },
  skuBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  card: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(25, 20, 45, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#c084fc',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  rowSubLabelText: {
    fontSize: 11,
    color: '#64748b',
  },
  quantityValueText: {
    fontSize: 15,
    fontWeight: '800',
  },
  quantityValueTextWhite: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  textNormal: { color: '#34d399' },
  textLow: { color: '#fbbf24' },
  textCritical: { color: '#f87171' },
  cardRowSimple: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  simpleLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  simpleValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
