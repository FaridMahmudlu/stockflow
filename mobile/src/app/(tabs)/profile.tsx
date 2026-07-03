import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Clipboard } from 'react-native';
import { useAuthStore } from '../../store/auth.store';
import { useSettingsStore } from '../../store/settings.store';
import { useTranslation } from '../../hooks/useTranslation';
import { useRouter, useFocusEffect } from 'expo-router';
import { Icon } from '../../components/ui/icon';
import { api } from '../../services/api';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackground } from '../../components/glass-background';
import { GlassCard } from '../../components/glass-card';
import { useToastStore } from '../../store/toast.store';
import { CustomAlert } from '../../components/ui/custom-alert';
import { LinearGradient } from 'expo-linear-gradient';

import { SecurityModal } from '../../components/profile/SecurityModal';
import { AboutModal } from '../../components/profile/AboutModal';
import { LanguageModal } from '../../components/profile/LanguageModal';
import { ThemeModal } from '../../components/profile/ThemeModal';
import { CustomSwitch } from '../../components/ui/custom-switch';
import { useAppTheme } from '../../theme/ThemeProvider';

interface ProductAssignment {
  productId: string;
  product: {
    name: string;
    sku: string;
  };
}

interface UserDetail {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'WORKER';
  isActive: boolean;
  createdAt: string;
  productAssignments: ProductAssignment[];
}

export default function ProfileScreen() {
  const { logout } = useAuthStore();
  const { themeMode, notificationsEnabled, setNotificationsEnabled, language } = useSettingsStore();
  const { colors, theme } = useAppTheme();
  const { t } = useTranslation();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [stats, setStats] = useState({ products: 0, suppliers: 0, movements: 0, notifications: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  
  const { showToast } = useToastStore();
  const insets = useSafeAreaInsets();
  
  const isLight = theme === 'light';

  const fetchData = async () => {
    try {
      const [profileRes, dashRes, supRes, movRes, notRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/stock/dashboard'),
        api.get('/suppliers?limit=1'),
        api.get('/stock/movement?limit=1'),
        api.get('/notifications?limit=10')
      ]);

      setProfile(profileRes.data);
      setStats({
        products: dashRes.data.products?.active || 0,
        suppliers: supRes.data.meta?.total || 0,
        movements: movRes.data.meta?.total || 0,
        notifications: notRes.data.data?.filter((n: any) => !n.isRead).length || 0
      });
    } catch (error) {
      console.error('Failed to fetch profile data', error);
      showToast(t('errorFetch'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const Notifications = require('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: notificationsEnabled,
          shouldPlaySound: notificationsEnabled,
          shouldSetBadge: notificationsEnabled,
          shouldShowBanner: notificationsEnabled,
          shouldShowList: notificationsEnabled,
        }),
      });
    } catch (e) {
      console.warn('Expo notifications not available:', e);
    }
  }, [notificationsEnabled]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const getLanguageName = (code: string) => {
    if (code === 'az') return 'Azərbaycanca';
    if (code === 'en') return 'English';
    return 'Русский';
  };

  const getThemeName = (mode: string) => {
    if (mode === 'system') return t('systemTheme') || 'Sistem Standartı';
    if (mode === 'light') return t('lightTheme') || 'Açıq';
    return t('darkTheme') || 'Tünd';
  };

  const handleLogout = () => {
    setLogoutAlertVisible(true);
  };

  if (isLoading) {
    return (
      <GlassBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </GlassBackground>
    );
  }

  const isAdminOrManager = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
  
  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const roleKey = profile?.role === 'ADMIN' ? 'roleAdmin' : profile?.role === 'MANAGER' ? 'roleManager' : 'roleWorker';
  const roleLabel = t(roleKey);

  return (
    <GlassBackground>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t('profile')}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>{t('profileDesc')}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity 
            style={[styles.headerIconButton, { backgroundColor: colors.background.glass, borderColor: colors.border.subtle }]} 
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Icon name="notifications" size={24} color={colors.icon.primary} />
            {stats.notifications > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: colors.status.error, borderColor: colors.background.primary }]}>
                <Text style={styles.notificationBadgeText}>{stats.notifications > 9 ? '9+' : stats.notifications}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main User Card */}
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <LinearGradient
            colors={isLight ? ['rgba(241, 245, 249, 0.9)', 'rgba(226, 232, 240, 0.9)'] : ['rgba(88, 28, 135, 0.4)', 'rgba(30, 27, 75, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.userCard, { borderColor: colors.border.subtle, shadowColor: colors.shadow.color, shadowOpacity: colors.shadow.opacity, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }]}
          >
            <View style={styles.userCardTop}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[colors.accent.primary, colors.accent.secondary]}
                  style={styles.avatarGradient}
                >
                  <Text style={[styles.avatarText, { color: colors.accent.onAccent }]}>
                    {(profile?.fullName || profile?.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <TouchableOpacity style={[styles.cameraButton, { backgroundColor: colors.accent.primary, borderColor: colors.background.primary }]}>
                  <Icon name="camera" size={12} color={colors.accent.onAccent} />
                </TouchableOpacity>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text.primary }]}>{profile?.fullName || 'İstifadəçi'}</Text>
                <Text style={[styles.userEmail, { color: colors.text.secondary }]}>{profile?.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: colors.status.errorBg }]}>
                  <Icon name="shield-check" size={12} color={colors.status.error} />
                  <Text style={[styles.roleBadgeText, { color: colors.status.error }]}>{roleLabel}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.userCardBottom, { borderTopColor: colors.border.subtle }]}>
              <View style={[styles.detailColumn, styles.detailColumnCentered]}>
                <Icon name="calendar" size={20} color={colors.icon.secondary} />
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{t('registerDate')}</Text>
                <Text style={[styles.detailValue, { color: colors.text.primary }]}>{formatDate(profile?.createdAt)}</Text>
              </View>

              <View style={[styles.verticalDivider, { backgroundColor: colors.border.subtle }]} />

              <View style={[styles.detailColumn, styles.detailColumnCentered]}>
                <Icon name="shield-check" size={20} color={colors.icon.secondary} />
                <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>{t('status')}</Text>
                <Text style={[styles.detailStatusText, { color: colors.status.success }]}>{profile?.isActive ? t('active') : t('inactive')}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.statsRow}>
          <GlassCard style={styles.statCard} useBlurView>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.status.infoBg }]}>
              <Icon name="cube" size={18} color={colors.status.info} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.products}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('activeProducts')}</Text>
            </View>
            <View style={[styles.statLine, { backgroundColor: colors.status.info }]} />
          </GlassCard>

          <GlassCard style={styles.statCard} useBlurView>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.status.warningBg }]}>
              <Icon name="layers" size={18} color={colors.status.warning} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.suppliers}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('suppliers')}</Text>
            </View>
            <View style={[styles.statLine, { backgroundColor: colors.status.warning }]} />
          </GlassCard>

          <GlassCard style={styles.statCard} useBlurView>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.status.successBg }]}>
              <Icon name="swap-vertical" size={18} color={colors.status.success} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.movements}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('stockMovements')}</Text>
            </View>
            <View style={[styles.statLine, { backgroundColor: colors.status.success }]} />
          </GlassCard>

          <GlassCard style={styles.statCard} useBlurView>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.status.errorBg }]}>
              <Icon name="notifications" size={18} color={colors.status.error} />
            </View>
            <View style={styles.statInfo}>
              <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.notifications}</Text>
              <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{t('notifications')}</Text>
            </View>
            <View style={[styles.statLine, { backgroundColor: colors.status.error }]} />
          </GlassCard>
        </Animated.View>

        {/* System Permissions */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <GlassCard style={styles.sectionCard} useBlurView>
            <View style={styles.sectionHeader}>
              <Icon name="shield" size={20} color={colors.accent.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('permissions')} ({roleLabel})</Text>
              <View style={[styles.fullAccessBadge, { backgroundColor: colors.accent.secondary, borderColor: colors.border.subtle }]}>
                <Text style={[styles.fullAccessText, { color: colors.accent.primary }]}>{profile?.role === 'ADMIN' ? t('fullAccess') : profile?.role === 'MANAGER' ? t('partialAccess') : t('limitedAccess')}</Text>
              </View>
            </View>
            
            <View style={styles.permissionsList}>
              {profile?.role === 'ADMIN' ? (
                <>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permAdmin1')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permAdmin2')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permAdmin3')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permAdmin4')}</Text></View>
                </>
              ) : profile?.role === 'MANAGER' ? (
                <>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permManager1')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permManager2')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permManager3')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="close-circle" weight="fill" size={18} color={colors.status.error} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permManager4')}</Text></View>
                </>
              ) : (
                <>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permWorker1')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permWorker2')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="check-circle" weight="fill" size={18} color={colors.status.success} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permWorker3')}</Text></View>
                  <View style={styles.permissionItem}><Icon name="close-circle" weight="fill" size={18} color={colors.status.error} /><Text style={[styles.permissionText, { color: colors.text.secondary }]}>{t('permWorker4')}</Text></View>
                </>
              )}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Settings Section */}
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <GlassCard style={styles.sectionCard} useBlurView>
            <View style={styles.sectionHeader}>
              <Icon name="settings" size={20} color={colors.accent.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t('settings')}</Text>
            </View>

            <View style={styles.settingsList}>
              <TouchableOpacity style={styles.settingItem} onPress={() => setLangModalVisible(true)}>
                <Icon name="globe" size={20} color={colors.icon.primary} style={styles.settingIcon} />
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('language')}</Text>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: colors.text.secondary }]}>{getLanguageName(language)}</Text>
                  <Icon name="chevron-right" size={16} color={colors.icon.inactive} />
                </View>
              </TouchableOpacity>
              <View style={[styles.settingDivider, { backgroundColor: colors.border.subtle }]} />

              <TouchableOpacity style={styles.settingItem} onPress={() => setThemeModalVisible(true)}>
                <Icon name="sun" size={20} color={colors.icon.primary} style={styles.settingIcon} />
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('theme')}</Text>
                <View style={styles.settingRight}>
                  <Text style={[styles.settingValue, { color: colors.text.secondary }]}>{getThemeName(themeMode)}</Text>
                  <Icon name="chevron-right" size={16} color={colors.icon.inactive} />
                </View>
              </TouchableOpacity>
              <View style={[styles.settingDivider, { backgroundColor: colors.border.subtle }]} />

              <View style={styles.settingItem}>
                <Icon name={notificationsEnabled ? "notifications" : "notifications-off"} size={20} color={notificationsEnabled ? colors.accent.primary : colors.icon.inactive} style={styles.settingIcon} />
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('notificationsToggle')}</Text>
                <CustomSwitch 
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              </View>
              <View style={[styles.settingDivider, { backgroundColor: colors.border.subtle }]} />

              <TouchableOpacity style={styles.settingItem} onPress={() => setSecurityModalVisible(true)}>
                <Icon name="lock" size={20} color={colors.icon.primary} style={styles.settingIcon} />
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('security')}</Text>
                <Icon name="chevron-right" size={16} color={colors.icon.inactive} />
              </TouchableOpacity>
              <View style={[styles.settingDivider, { backgroundColor: colors.border.subtle }]} />

              <TouchableOpacity style={styles.settingItem} onPress={() => setAboutModalVisible(true)}>
                <Icon name="info" size={20} color={colors.icon.primary} style={styles.settingIcon} />
                <Text style={[styles.settingLabel, { color: colors.text.primary }]}>{t('about')}</Text>
                <Icon name="chevron-right" size={16} color={colors.icon.inactive} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.bottomActions}>
          {isAdminOrManager && (
            <TouchableOpacity 
              style={[styles.manageStockButton, { backgroundColor: colors.accent.primary }]}
              onPress={() => router.push('/(admin)/stock-adjust')}
              activeOpacity={0.8}
            >
              <Icon name="settings" size={20} color={colors.accent.onAccent} style={{ marginRight: 8 }} />
              <Text style={[styles.manageStockText, { color: colors.accent.onAccent }]}>{t('manageStock')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.status.errorBg, borderColor: colors.status.errorBg }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={20} color={colors.status.error} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutText, { color: colors.status.error }]}>{t('logout')}</Text>
            <Icon name="chevron-right" size={18} color={colors.status.error} style={{ position: 'absolute', right: 20 }} />
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
      
      <CustomAlert
        visible={logoutAlertVisible}
        title={t('confirmLogout')}
        message={t('confirmLogoutMsg')}
        cancelText={t('cancel')}
        confirmText={t('logout')}
        confirmStyle="destructive"
        onCancel={() => setLogoutAlertVisible(false)}
        onConfirm={() => {
          setLogoutAlertVisible(false);
          logout();
        }}
      />

      <SecurityModal 
        visible={securityModalVisible} 
        onClose={() => setSecurityModalVisible(false)} 
        t={t} 
      />
      
      <AboutModal 
        visible={aboutModalVisible} 
        onClose={() => setAboutModalVisible(false)} 
        t={t} 
      />

      <LanguageModal 
        visible={langModalVisible} 
        onClose={() => setLangModalVisible(false)} 
        t={t} 
      />

      <ThemeModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
        t={t}
      />
    </GlassBackground>
  );
}

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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    maxWidth: 220,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
    gap: 16,
  },
  userCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 16,
  },
  detailColumn: {
    flex: 1,
  },
  detailColumnCentered: {
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 16,
  },
  detailLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    position: 'relative',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: -8, // visually adjust
  },
  statLine: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sectionCard: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  fullAccessBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  fullAccessText: {
    fontSize: 11,
    fontWeight: '600',
  },
  permissionsList: {
    gap: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  settingsList: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
  },
  settingDivider: {
    height: 1,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  manageStockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    position: 'relative',
  },
  manageStockText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  logoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    height: 56,
    borderRadius: 16,
    position: 'relative',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
