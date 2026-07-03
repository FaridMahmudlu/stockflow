import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { Icon } from '../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useToastStore } from '../../store/toast.store';
import { useRefreshStore } from '../../store/refresh.store';
import { GlassBackground } from '../../components/glass-background';
import { GlassCard } from '../../components/glass-card';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Supplier {
  id: string;
  name: string;
  isActive: boolean;
}

// ─── Section Header Component ──────────────────────────────────────
const SectionHeader = ({ icon, title }: { icon: string; title: string }) => (
  <View style={sStyles.sectionHeader}>
    <View style={sStyles.sectionIconWrap}>
      <Icon name={icon as any} size={16} color="#c084fc" />
    </View>
    <Text style={sStyles.sectionTitle}>{title}</Text>
  </View>
);

const sStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

// ─── Dropdown Selector Component ───────────────────────────────────
const DropdownSelector = ({
  label,
  value,
  placeholder,
  onPress,
  icon,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onPress: () => void;
  icon?: string;
}) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TouchableOpacity style={styles.dropdownButton} onPress={onPress} activeOpacity={0.7}>
      {icon && <Icon name={icon as any} size={16} color="#64748b" style={{ marginRight: 8 }} />}
      <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Icon name="chevron-down" size={16} color="#64748b" />
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────
export default function ProductFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const isEditMode = !!id;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('ədəd (pcs)');
  const [model, setModel] = useState('');
  const [minimumStock, setMinimumStock] = useState('5');
  const [currentStock, setCurrentStock] = useState('0');
  const [initialStock, setInitialStock] = useState('0');
  const [location, setLocation] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [description, setDescription] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierModalVisible, setSupplierModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { triggerProductRefresh } = useRefreshStore();

  const categories = ['Elektronika', 'Geyim', 'Qida', 'Ev əşyaları', 'Ofis', 'Digər'];
  const units = ['ədəd (pcs)', 'kq (kg)', 'litr (lt)', 'metr (m)', 'qutu', 'paket'];
  const locations = ['Əsas Anbar', 'Anbar 2', 'Mağaza', 'Ofis Anbarı'];

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      showToast('Bu səhifəyə daxil olmaq üçün icazəniz yoxdur.', 'error');
      router.back();
      return;
    }

    const initForm = async () => {
      try {
        const suppliersRes = await api.get('/suppliers');
        const activeSuppliers = (suppliersRes.data.data || []).filter((s: Supplier) => s.isActive);
        setSuppliers(activeSuppliers);

        if (isEditMode) {
          const productRes = await api.get(`/products/${id}`);
          const p = productRes.data;
          setName(p.name);
          setSku(p.sku);
          setMinimumStock(String(p.minimumStock));
          setCurrentStock(String(p.stock ?? 0));
          if (p.category) setCategory(p.category);
          if (p.brand) setBrand(p.brand);
          if (p.unit) setUnit(p.unit);
          if (p.model) setModel(p.model);
          if (p.location) setLocation(p.location);
          if (p.purchasePrice !== null && p.purchasePrice !== undefined) setPurchasePrice(String(p.purchasePrice));
          if (p.salePrice !== null && p.salePrice !== undefined) setSalePrice(String(p.salePrice));
          if (p.description) setDescription(p.description);

          if (p.supplierId) {
            const found = activeSuppliers.find((s: Supplier) => s.id === p.supplierId);
            if (found) {
              setSelectedSupplier(found);
            } else {
              setSelectedSupplier({
                id: p.supplierId,
                name: p.supplier?.name || 'Seçilmiş Təchizatçı',
                isActive: true,
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize form', error);
        showToast('Məlumatlar yüklənərkən xəta baş verdi', 'error');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    initForm();
  }, [id]);

  const generateSku = () => {
    if (!name.trim()) {
      showToast('Əvvəlcə məhsulun adını daxil edin', 'error');
      return;
    }
    const cleanName = name
      .trim()
      .toUpperCase()
      .replace(/Ə/g, 'E')
      .replace(/I/g, 'I')
      .replace(/İ/g, 'I')
      .replace(/Ö/g, 'O')
      .replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S')
      .replace(/Ç/g, 'C')
      .replace(/Ğ/g, 'G')
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .split('-')
      .filter(Boolean)
      .join('-')
      .substring(0, 12);
    const random = Math.floor(1000 + Math.random() * 9000);
    setSku(`${cleanName}-${random}`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Məhsul adı daxil edilməlidir', 'error');
      return;
    }
    if (!sku.trim()) {
      showToast('SKU kodu daxil edilməlidir', 'error');
      return;
    }
    const minStockNum = Number(minimumStock);
    if (isNaN(minStockNum) || minStockNum < 0) {
      showToast('Minimum stok düzgün rəqəm olmalıdır', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        minimumStock: minStockNum,
      };

      if (category) payload.category = category;
      if (brand.trim()) payload.brand = brand.trim();
      if (unit) payload.unit = unit;
      if (model.trim()) payload.model = model.trim();
      if (location) payload.location = location;
      
      const parsedPurchase = parseFloat(purchasePrice.replace(',', '.'));
      if (!isNaN(parsedPurchase)) payload.purchasePrice = parsedPurchase;
      
      const parsedSale = parseFloat(salePrice.replace(',', '.'));
      if (!isNaN(parsedSale)) payload.salePrice = parsedSale;
      
      if (description.trim()) payload.description = description.trim();


      if (selectedSupplier) {
        payload.supplierId = selectedSupplier.id;
      }

      if (isEditMode) {
        await api.patch(`/products/${id}`, payload);
        showToast('Məhsul uğurla yeniləndi', 'success');
        triggerProductRefresh();
        router.replace('/products');
      } else {
        const response = await api.post('/products', payload);
        const createdProduct = response.data;
        const initialStockNum = Number(initialStock);
        if (initialStockNum > 0 && createdProduct?.id) {
          await api.post('/stock/movement', {
            productId: createdProduct.id,
            quantity: initialStockNum,
            type: 'INCREASE',
            reference: 'İlkin daxil edilən stok miqdarı',
          });
        }
        showToast('Məhsul uğurla yaradıldı', 'success');
        triggerProductRefresh();
        router.replace('/products');
      }
    } catch (error: any) {
      console.error('Failed to submit product form', error);
      showToast(error.response?.data?.message || 'Sorğu zamanı xəta baş verdi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Generic List Modal ──
  const renderListModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    items: string[],
    onSelect: (item: string) => void,
    selected: string | null,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Icon name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[styles.modalItemText, selected === item && styles.modalItemTextSelected]}>
                  {item}
                </Text>
                {selected === item && <Icon name="check-circle" size={18} color="#c084fc" />}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </TouchableOpacity>
    </Modal>
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        {/* ── Header (TOXUNULMAZ) ── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Məhsulu Redaktə Et' : 'Yeni Məhsul'}</Text>
            <Text style={styles.headerSubtitle}>Məhsul məlumatlarını daxil edin</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ═══ SECTION 1: Əsas Məlumatlar ═══ */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <GlassCard style={styles.sectionCard}>
              <SectionHeader icon="settings" title="Əsas Məlumatlar" />

              {/* Məhsul Adı */}
              <Text style={styles.fieldLabel}>
                Məhsul Adı <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Məsələn: iPhone 15 Pro"
                  placeholderTextColor="#4a4a5a"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* SKU Kodu */}
              <Text style={styles.fieldLabel}>
                SKU Kodu <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrap, styles.skuInputWrap, isEditMode && styles.inputDisabledWrap]}>
                <Icon name="barcode" size={18} color="#64748b" style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.textInput, { flex: 1 }, isEditMode && styles.inputDisabledText]}
                  placeholder="Məsələn: IPH15P-256"
                  placeholderTextColor="#4a4a5a"
                  value={sku}
                  onChangeText={setSku}
                  autoCapitalize="characters"
                  editable={!isEditMode}
                />
                {!isEditMode && (
                  <TouchableOpacity style={styles.genButton} onPress={generateSku} activeOpacity={0.7}>
                    <Text style={styles.genButtonText}>Gen</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isEditMode && <Text style={styles.hintText}>SKU kodu redaktə edilə bilməz.</Text>}

              {/* Kateqoriya & Marka (iki sütun) */}
              <View style={styles.rowFields}>
                <DropdownSelector
                  label="Kateqoriya"
                  value={category}
                  placeholder="Kateqoriya seçin"
                  onPress={() => setCategoryModalVisible(true)}
                />
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Marka</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Marka seçin"
                      placeholderTextColor="#4a4a5a"
                      value={brand}
                      onChangeText={setBrand}
                    />
                  </View>
                </View>
              </View>

              {/* Vahid & Model (iki sütun) */}
              <View style={styles.rowFields}>
                <DropdownSelector
                  label="Vahid"
                  value={unit}
                  placeholder="Vahid seçin"
                  onPress={() => setUnitModalVisible(true)}
                />
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Model</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Modeli daxil edin"
                      placeholderTextColor="#4a4a5a"
                      value={model}
                      onChangeText={setModel}
                    />
                  </View>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ═══ SECTION 2: Stok Məlumatları ═══ */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <GlassCard style={styles.sectionCard}>
              <SectionHeader icon="layers" title="Stok Məlumatları" />

              <View style={styles.rowFields}>
                {/* Mövcud Miqdar */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Mövcud Miqdar</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="swap-vertical" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="0"
                      placeholderTextColor="#4a4a5a"
                      keyboardType="numeric"
                      value={currentStock}
                      onChangeText={setCurrentStock}
                      editable={false}
                    />
                  </View>
                </View>
                <View style={{ width: 12 }} />
                {/* Minimum Stok Həddi */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    Minimum Stok Həddi <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <Icon name="alert" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="5"
                      placeholderTextColor="#4a4a5a"
                      keyboardType="numeric"
                      value={minimumStock}
                      onChangeText={setMinimumStock}
                    />
                  </View>
                </View>
              </View>

              {!isEditMode && (
                <View style={styles.rowFields}>
                  {/* İlkin Stok Miqdarı */}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>İlkin Stok Miqdarı</Text>
                    <View style={styles.inputWrap}>
                      <Icon name="sign-in" size={16} color="#64748b" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.textInput}
                        placeholder="0"
                        placeholderTextColor="#4a4a5a"
                        keyboardType="numeric"
                        value={initialStock}
                        onChangeText={setInitialStock}
                      />
                    </View>
                  </View>
                  <View style={{ width: 12 }} />
                  {/* Məkan (Anbar) */}
                  <DropdownSelector
                    label="Məkan (Anbar)"
                    value={location}
                    placeholder="Anbar seçin"
                    onPress={() => setLocationModalVisible(true)}
                    icon="business"
                  />
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* ═══ SECTION 3: Təchizatçı ═══ */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <GlassCard style={styles.sectionCard}>
              <SectionHeader icon="users" title="Təchizatçı (Könüllü)" />

              <TouchableOpacity
                style={styles.supplierSelector}
                onPress={() => setSupplierModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.supplierSelectorText, !selectedSupplier && styles.supplierSelectorPlaceholder]}
                  numberOfLines={1}
                >
                  {selectedSupplier ? selectedSupplier.name : 'Təchizatçı seçin'}
                </Text>
                <Icon name="chevron-down" size={18} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.addSupplierBtn} 
                activeOpacity={0.7}
                onPress={() => router.push('/(admin)/supplier-form')}
              >
                <Icon name="add" size={18} color="#c084fc" />
                <Text style={styles.addSupplierText}>Yeni Təchizatçı Əlavə Et</Text>
              </TouchableOpacity>
            </GlassCard>
          </Animated.View>

          {/* ═══ SECTION 4: Qiymət Məlumatları ═══ */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <GlassCard style={styles.sectionCard}>
              <SectionHeader icon="cash" title="Qiymət Məlumatları" />

              <View style={styles.rowFields}>
                {/* Alış Qiyməti */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Alış Qiyməti</Text>
                  <View style={styles.priceInputWrap}>
                    <Icon name="info" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="0.00"
                      placeholderTextColor="#4a4a5a"
                      keyboardType="decimal-pad"
                      value={purchasePrice}
                      onChangeText={setPurchasePrice}
                    />
                    <Text style={styles.currencyLabel}>AZN</Text>
                  </View>
                </View>
                <View style={{ width: 12 }} />
                {/* Satış Qiyməti */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Satış Qiyməti</Text>
                  <View style={styles.priceInputWrap}>
                    <Icon name="info" size={16} color="#64748b" style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="0.00"
                      placeholderTextColor="#4a4a5a"
                      keyboardType="decimal-pad"
                      value={salePrice}
                      onChangeText={setSalePrice}
                    />
                    <Text style={styles.currencyLabel}>AZN</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ═══ SECTION 5: Digər Məlumatlar ═══ */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)}>
            <GlassCard style={styles.sectionCard}>
              <SectionHeader icon="info" title="Digər Məlumatlar (Könüllü)" />

              <View style={styles.textAreaWrap}>
                <TextInput
                  style={styles.textArea}
                  placeholder="Qısa qeyd və ya təsvir..."
                  placeholderTextColor="#4a4a5a"
                  value={description}
                  onChangeText={(text) => {
                    if (text.length <= 250) setDescription(text);
                  }}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length} / 250</Text>
              </View>
            </GlassCard>
          </Animated.View>

          {/* ═══ SUBMIT BUTTON ═══ */}
          <Animated.View entering={FadeInUp.delay(600).duration(500)}>
            <TouchableOpacity
              style={[styles.submitTouchable, isSubmitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7c3aed', '#a855f7', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.submitContent}>
                    <Icon name="add" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitText}>
                      {isEditMode ? 'Yadda Saxla' : 'Məhsul Əlavə Et'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* ── Supplier Modal ── */}
        <Modal
          visible={supplierModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSupplierModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSupplierModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Təchizatçı Seçin</Text>
                <TouchableOpacity onPress={() => setSupplierModalVisible(false)} activeOpacity={0.7}>
                  <Icon name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={[{ id: '', name: 'Heç biri (Təyin etmə)', isActive: true }, ...suppliers]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      if (item.id === '') {
                        setSelectedSupplier(null);
                      } else {
                        setSelectedSupplier(item);
                      }
                      setSupplierModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        ((!selectedSupplier && item.id === '') || selectedSupplier?.id === item.id) &&
                          styles.modalItemTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {((!selectedSupplier && item.id === '') || selectedSupplier?.id === item.id) && (
                      <Icon name="check-circle" size={18} color="#c084fc" />
                    )}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Category Modal ── */}
        {renderListModal(
          categoryModalVisible,
          () => setCategoryModalVisible(false),
          'Kateqoriya Seçin',
          categories,
          setCategory,
          category,
        )}

        {/* ── Unit Modal ── */}
        {renderListModal(
          unitModalVisible,
          () => setUnitModalVisible(false),
          'Vahid Seçin',
          units,
          setUnit,
          unit,
        )}

        {/* ── Location Modal ── */}
        {renderListModal(
          locationModalVisible,
          () => setLocationModalVisible(false),
          'Məkan Seçin',
          locations,
          setLocation,
          location,
        )}
      </KeyboardAvoidingView>
    </GlassBackground>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 3,
    letterSpacing: 0.3,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },

  // ── Section Card ──
  sectionCard: {
    padding: 18,
    marginBottom: 14,
  },

  // ── Fields ──
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 7,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  required: {
    color: '#c084fc',
    fontSize: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 4,
  },
  inputDisabledWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    height: '100%',
  },
  inputDisabledText: {
    color: '#475569',
  },
  skuInputWrap: {
    paddingRight: 6,
  },
  hintText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    marginLeft: 4,
    marginBottom: 4,
  },

  // ── Gen Button ──
  genButton: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: 6,
  },
  genButtonText: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Row Fields ──
  rowFields: {
    flexDirection: 'row',
    marginTop: 6,
  },

  // ── Dropdown Button ──
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 4,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  dropdownPlaceholder: {
    color: '#4a4a5a',
  },

  // ── Supplier ──
  supplierSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
  },
  supplierSelectorText: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  supplierSelectorPlaceholder: {
    color: '#4a4a5a',
  },
  addSupplierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.25)',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addSupplierText: {
    color: '#c084fc',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },

  // ── Price ──
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 8,
  },

  // ── Textarea ──
  textAreaWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 14,
    minHeight: 90,
  },
  textArea: {
    fontSize: 14,
    color: '#ffffff',
    minHeight: 60,
  },
  charCount: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'right',
    marginTop: 4,
  },

  // ── Submit ──
  submitTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 6,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 12, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '65%',
    padding: 20,
    backgroundColor: 'rgba(18, 12, 38, 0.95)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalItem: {
    paddingVertical: 13,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 15,
    color: '#cbd5e1',
  },
  modalItemTextSelected: {
    color: '#c084fc',
    fontWeight: '800',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
