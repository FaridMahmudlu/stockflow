import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';
import { Icon } from '../../components/ui/icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth.store';
import { useToastStore } from '../../store/toast.store';
import { useRefreshStore } from '../../store/refresh.store';
import { GlassBackground } from '../../components/glass-background';
import { CustomAlert } from '../../components/ui/custom-alert';
import { ActionSheet, ActionSheetOption } from '../../components/ui/action-sheet';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';

export default function SupplierFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const isEditMode = !!id;
  const isAdmin = user?.role === 'ADMIN';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [statusActionSheetVisible, setStatusActionSheetVisible] = useState(false);

  const statusOptions: ActionSheetOption[] = [
    { label: 'Aktiv', value: 'ACTIVE', icon: 'check-circle', color: '#34d399' },
    { label: 'Deaktiv', value: 'INACTIVE', icon: 'close-circle', color: '#f87171' },
    { label: 'İmtina', value: 'CANCEL', icon: 'close', color: '#94a3b8' },
  ];

  const insets = useSafeAreaInsets();
  const { triggerSupplierRefresh } = useRefreshStore();

  useEffect(() => {
    if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') {
      showToast('Bu səhifəyə daxil olmaq üçün icazəniz yoxdur.', 'error');
      router.back();
      return;
    }

    const initForm = async () => {
      try {
        if (isEditMode) {
          const response = await api.get(`/suppliers/${id}`);
          const s = response.data;
          setName(s.name);
          setPhone(s.phone || '');
          setEmail(s.email || '');
          setAddress(s.address || '');
          setCreatedAt(s.createdAt);
          setIsActive(s.isActive);
        } else {
          setCreatedAt(new Date().toISOString());
        }
      } catch (error) {
        console.error('Failed to fetch supplier details', error);
        showToast('Təchizatçı məlumatları tapılmadı', 'error');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    initForm();
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Təchizatçı adı daxil edilməlidir', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
      };

      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();
      if (address.trim()) payload.address = address.trim();
      payload.isActive = isActive;

      if (isEditMode) {
        await api.patch(`/suppliers/${id}`, payload);
        showToast('Təchizatçı uğurla yeniləndi', 'success');
      } else {
        await api.post('/suppliers', payload);
        showToast('Təchizatçı uğurla yaradıldı', 'success');
      }
      
      triggerSupplierRefresh();
      router.back();
    } catch (error: any) {
      console.error('Failed to submit supplier form', error);
      showToast(error.response?.data?.message || 'Sorğu zamanı xəta baş verdi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/suppliers/${id}`);
      showToast('Təchizatçı silindi', 'success');
      triggerSupplierRefresh();
      router.back();
    } catch (error: any) {
      console.error('Failed to delete supplier', error);
      showToast(error.response?.data?.message || 'Təchizatçı silinərkən xəta baş verdi', 'error');
    } finally {
      setDeleteAlertVisible(false);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return { date: '-', time: '-' };
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formattedDate = formatDate(createdAt);

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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeftRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
              <Icon name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>{isEditMode ? 'Təchizatçını Redaktə Et' : 'Yeni Təchizatçı'}</Text>
              <Text style={styles.headerSubtitle}>{isEditMode ? 'Təchizatçı məlumatlarını yeniləyin' : 'Yeni təchizatçı məlumatlarını daxil edin'}</Text>
            </View>
          </View>
          
          {isEditMode && isAdmin && (
            <TouchableOpacity style={styles.deleteIconButton} onPress={() => setDeleteAlertVisible(true)} activeOpacity={0.7}>
              <Icon name="trash" size={20} color="#f87171" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.delay(100).springify()}>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardIconContainer}>
                  <Icon name="person" size={18} color="#c084fc" />
                </View>
                <Text style={styles.cardTitleText}>Ümumi Məlumatlar</Text>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Təchizatçı Adı <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Icon name="person" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Euro Foods Group"
                    placeholderTextColor="#64748b"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Telefon Nömrəsi <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Icon name="phone" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+994 70 333 44 55"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>E-poçt Ünvanı <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Icon name="mail" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="contact@eurofoods.az"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Ünvan <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Icon name="map-pin" size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Bakı, Azərbaycan"
                    placeholderTextColor="#64748b"
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(167, 139, 250, 0.1)' }]}>
                  <Icon name="info" size={18} color="#a78bfa" />
                </View>
                <Text style={styles.cardTitleText}>Əlavə Məlumatlar</Text>
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Qeyd (istəyə bağlı)</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Icon name="document-text" size={18} color="#64748b" style={styles.textAreaIcon} />
                  <TextInput
                    style={styles.textArea}
                    placeholder="Əlavə qeyd daxil edin..."
                    placeholderTextColor="#64748b"
                    multiline={true}
                    maxLength={200}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
                <Text style={styles.charCount}>{notes.length}/200</Text>
              </View>

              <View style={styles.bottomInfoRow}>
                <View style={styles.infoBox}>
                  <View style={styles.infoIconWrapper}>
                    <Icon name="calendar" size={20} color="#a78bfa" />
                  </View>
                  <View>
                    <Text style={styles.infoTitle}>Yaradılma tarixi</Text>
                    <Text style={styles.infoValueMain}>{formattedDate.date}</Text>
                    <Text style={styles.infoValueSub}>{formattedDate.time}</Text>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <View style={[styles.infoIconWrapper, { backgroundColor: isActive ? 'rgba(52, 211, 153, 0.05)' : 'rgba(239, 68, 68, 0.05)' }]}>
                    <Icon name={isActive ? "check-circle" : "close-circle"} size={20} color={isActive ? "#34d399" : "#f87171"} />
                  </View>
                  <View>
                    <Text style={styles.infoTitle}>Status</Text>
                    <TouchableOpacity 
                      style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}
                      onPress={() => setStatusActionSheetVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusText, isActive ? styles.textActive : styles.textInactive]}>
                        {isActive ? 'Aktiv' : 'Deaktiv'}
                      </Text>
                      <Icon name="chevron-down" size={12} color={isActive ? "#34d399" : "#f87171"} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeIn.delay(300)} style={[styles.bottomStickyBar, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
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
                <Icon name={isEditMode ? "check" : "add"} size={20} color="#ffffff" style={styles.saveIcon} />
                <Text style={styles.submitButtonText}>{isEditMode ? 'Yadda Saxla' : 'Təchizatçı Əlavə Et'}</Text>
              </>
            )}
          </TouchableOpacity>
          {isEditMode && <Text style={styles.saveNotice}>Dəyişikliklər dərhal yadda saxlanacaq</Text>}
        </Animated.View>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={deleteAlertVisible}
        title="Təchizatçını Sil"
        message="Bu təchizatçını silmək istədiyinizdən əminsiniz?"
        cancelText="İmtina"
        confirmText="Sil"
        confirmStyle="destructive"
        onCancel={() => setDeleteAlertVisible(false)}
        onConfirm={confirmDelete}
      />
      
      <ActionSheet
        visible={statusActionSheetVisible}
        title="Statusu Seçin"
        options={statusOptions}
        onSelect={(value) => {
          if (value === 'ACTIVE') setIsActive(true);
          if (value === 'INACTIVE') setIsActive(false);
          setStatusActionSheetVisible(false);
        }}
        onClose={() => setStatusActionSheetVisible(false)}
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
    paddingBottom: 20,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  deleteIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: '500',
  },
  requiredAsterisk: {
    color: '#a78bfa',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
  },
  textAreaContainer: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 14,
  },
  textAreaIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  bottomInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  infoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValueMain: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  infoValueSub: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
  },
  statusInactive: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textActive: {
    color: '#34d399',
  },
  textInactive: {
    color: '#f87171',
  },
  bottomStickyBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#7c3aed',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  saveIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveNotice: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
  },
});
