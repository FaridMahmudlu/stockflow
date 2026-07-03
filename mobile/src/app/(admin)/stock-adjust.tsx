import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Icon } from '../../components/ui/icon';
import { useAuthStore } from '../../store/auth.store';
import { useToastStore } from '../../store/toast.store';
import { GlassBackground } from '../../components/glass-background';
import { GlassCard } from '../../components/glass-card';
import { ActionSheet } from '../../components/ui/action-sheet';
import Animated, { FadeInUp, FadeInRight, Layout } from 'react-native-reanimated';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit?: string;
}

export default function StockAdjustScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [type, setType] = useState<'INCREASE' | 'DECREASE' | 'TRANSFER_IN' | 'TRANSFER_OUT'>('INCREASE');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ədəd (pcs)');
  const [unitSheetVisible, setUnitSheetVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      showToast('Bu səhifəyə daxil olmaq üçün icazəniz yoxdur.', 'error');
      router.back();
      return;
    }

    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleSubmit = async () => {
    if (!selectedProductId) {
      showToast('Zəhmət olmasa məhsul seçin', 'error');
      return;
    }
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      showToast('Düzgün miqdar daxil edin', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedReference = [description, reference].filter(Boolean).join(' | ');
      await api.post('/stock/movement', {
        productId: selectedProductId,
        type,
        quantity: Number(quantity),
        reference: combinedReference || undefined,
      });
      showToast('Stok hərəkəti uğurla qeydə alındı', 'success');
      router.back();
    } catch (error: any) {
      console.error('Failed to submit stock movement', error);
      showToast(error.response?.data?.message || 'Stok əməliyyatı uğursuz oldu', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update selected unit when a product is selected
  useEffect(() => {
    if (selectedProductId) {
      const p = products.find(prod => prod.id === selectedProductId);
      if (p?.unit) {
        setSelectedUnit(p.unit);
      }
    }
  }, [selectedProductId, products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Icon name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stok Əməliyyatı</Text>
          <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={() => showToast('Stok hərəkətləri üçün məlumatları doldurun', 'info')}>
            <Icon name="info" size={20} color="#c084fc" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          
          {/* Section 1: Product Selection */}
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <GlassCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="cube" size={20} color="#c084fc" />
                <Text style={styles.sectionTitle}>1. Məhsul Seçin</Text>
              </View>
              
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

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll} contentContainerStyle={styles.productScrollContent}>
                {(showAllProducts ? filteredProducts : filteredProducts.slice(0, 5)).map((p, index) => {
                  const isSelected = selectedProductId === p.id;
                  return (
                    <Animated.View key={p.id} entering={FadeInRight.delay(200 + index * 50).springify()} layout={Layout.springify()}>
                      <TouchableOpacity 
                        style={[styles.productCard, isSelected && styles.productCardSelected]}
                        onPress={() => setSelectedProductId(p.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                        <Text style={styles.productSku}>SKU: {p.sku}</Text>
                        
                        {isSelected && (
                          <View style={styles.checkBadge}>
                            <Icon name="check" size={12} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
                
                {!showAllProducts && filteredProducts.length > 5 && (
                  <Animated.View entering={FadeInRight.delay(200 + 5 * 50).springify()}>
                    <TouchableOpacity style={styles.viewAllCard} activeOpacity={0.7} onPress={() => setShowAllProducts(true)}>
                      <View style={styles.viewAllIconBg}>
                        <Icon name="grid-four" size={20} color="#c084fc" />
                      </View>
                      <Text style={styles.viewAllText}>Hamısına bax</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </ScrollView>
            </GlassCard>
          </Animated.View>

          {/* Section 2: Movement Type */}
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <GlassCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="arrows-left-right" size={20} color="#c084fc" />
                <Text style={styles.sectionTitle}>2. Hərəkət Növü</Text>
              </View>
              
              <View style={styles.typeContainer}>
                <TouchableOpacity 
                  style={[styles.typeButton, type === 'INCREASE' && styles.typeSelectedInc]}
                  onPress={() => setType('INCREASE')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeIconBg, type === 'INCREASE' ? { borderColor: '#34d399' } : { borderColor: 'rgba(255,255,255,0.1)' }]}>
                    <Icon name="arrow-down" size={20} color={type === 'INCREASE' ? '#34d399' : '#64748b'} />
                  </View>
                  <View>
                    <Text style={[styles.typeText, type === 'INCREASE' && { color: '#34d399' }]}>Mədaxil</Text>
                    <Text style={styles.typeSubText}>Stoka daxil et</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.typeButton, type === 'DECREASE' && styles.typeSelectedDec]}
                  onPress={() => setType('DECREASE')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.typeIconBg, type === 'DECREASE' ? { borderColor: '#f87171' } : { borderColor: 'rgba(255,255,255,0.1)' }]}>
                    <Icon name="arrow-up" size={20} color={type === 'DECREASE' ? '#f87171' : '#64748b'} />
                  </View>
                  <View>
                    <Text style={[styles.typeText, type === 'DECREASE' && { color: '#f87171' }]}>Məxaric</Text>
                    <Text style={styles.typeSubText}>Stokdan çıxar</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </Animated.View>

          {/* Section 3: Quantity */}
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <GlassCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="basket" size={20} color="#c084fc" />
                <Text style={styles.sectionTitle}>3. Miqdar</Text>
              </View>
              
              <View style={styles.inputContainer}>
                <Icon name="cube" size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Miqdar daxil edin"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
                <TouchableOpacity 
                  style={styles.unitContainer}
                  onPress={() => setUnitSheetVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.unitText}>{selectedUnit.split(' ')[0]}</Text>
                  <Icon name="chevron-down" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>Məsələn: 50</Text>
            </GlassCard>
          </Animated.View>

          {/* Section 4: Details */}
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <GlassCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Icon name="list" size={20} color="#c084fc" />
                <Text style={styles.sectionTitle}>4. Əlavə Məlumatlar</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Icon name="document-text" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Açıqlama (istəyə bağlı)"
                    placeholderTextColor="#64748b"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
                <Text style={styles.helperText}>Məsələn: Yeni partiya, qaimə nömrəsi və s.</Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Text style={styles.hashIcon}>#</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Sənəd nömrəsi (istəyə bağlı)"
                    placeholderTextColor="#64748b"
                    value={reference}
                    onChangeText={setReference}
                  />
                </View>
                <Text style={styles.helperText}>Məsələn: Qaimə #12345</Text>
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>
        
        {/* Footer */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Təsdiqlə</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={unitSheetVisible}
        title="Ölçü vahidi"
        options={[
          { label: 'ədəd (pcs)', value: 'ədəd (pcs)', icon: 'cube' },
          { label: 'kiloqram (kq)', value: 'kiloqram (kq)', icon: 'scales' },
          { label: 'litr (l)', value: 'litr (l)', icon: 'drop' },
          { label: 'metr (m)', value: 'metr (m)', icon: 'arrows-out' },
          { label: 'qutu (box)', value: 'qutu (box)', icon: 'layers' },
        ]}
        onSelect={(val) => setSelectedUnit(val as string)}
        onClose={() => setUnitSheetVisible(false)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for footer
    gap: 16,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 16, 38, 0.6)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%',
  },
  productScroll: {
    marginHorizontal: -16,
  },
  productScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: 140,
    height: 100,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    position: 'relative',
  },
  productCardSelected: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderColor: '#a78bfa',
  },
  productName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  productSku: {
    color: '#94a3b8',
    fontSize: 11,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  viewAllCard: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  viewAllIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewAllText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  typeSelectedInc: {
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  typeSelectedDec: {
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
  },
  typeIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 2,
  },
  typeSubText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  hashIcon: {
    fontSize: 18,
    color: '#64748b',
    marginRight: 12,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%',
  },
  unitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  unitText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(15, 10, 28, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
