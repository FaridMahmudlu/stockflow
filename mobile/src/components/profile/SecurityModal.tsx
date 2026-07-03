import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Icon } from '../ui/icon';
import { GlassCard } from '../glass-card';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../theme/ThemeProvider';

interface SecurityModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: any) => string;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ visible, onClose, t }) => {
  const { colors, theme } = useAppTheme();
  const isLight = theme === 'light';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <BlurView intensity={isLight ? 40 : 20} tint={isLight ? "light" : "dark"} style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{t('security')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.iconHeader}>
              <Icon name="shield-check" size={64} color={colors.status.success} />
              <Text style={[styles.subTextCenter, { color: colors.text.secondary }]}>
                Sizin məlumatlarınız tam qorunur və şifrələnir.
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Giriş Təhlükəsizliyi</Text>
            <GlassCard style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.border.subtle }]}>
              <TouchableOpacity style={styles.row}>
                <Icon name="key" size={22} color={colors.accent.primary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Şifrəni Dəyiş</Text>
                  <Text style={[styles.sub, { color: colors.text.secondary }]}>Son dəyişiklik: 2 ay əvvəl</Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              
              <View style={styles.row}>
                <Icon name="fingerprint" size={22} color={colors.accent.primary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Biometrik Giriş (Face ID)</Text>
                  <Text style={[styles.sub, { color: colors.text.secondary }]}>Sürətli və təhlükəsiz giriş</Text>
                </View>
                <Switch 
                  value={true} 
                  onValueChange={() => {}} 
                  trackColor={{ false: colors.background.glass, true: colors.accent.primary }}
                  thumbColor="#fff"
                />
              </View>
            </GlassCard>

            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Hesab Hərəkətləri</Text>
            <GlassCard style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.border.subtle }]}>
              <TouchableOpacity style={styles.row}>
                <Icon name="device-mobile" size={22} color={colors.accent.primary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Aktiv Cihazlar</Text>
                  <Text style={[styles.sub, { color: colors.text.secondary }]}>1 cihazda giriş edilib</Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              
              <TouchableOpacity style={styles.row}>
                <Icon name="list" size={22} color={colors.accent.primary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Giriş Tarixçəsi</Text>
                  <Text style={[styles.sub, { color: colors.text.secondary }]}>Son giriş: Bu gün, 14:30</Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </GlassCard>

            <TouchableOpacity style={styles.deleteAccountBtn}>
              <Text style={styles.deleteAccountText}>Hesabı Sil</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  subTextCenter: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    maxWidth: '80%',
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 12,
  },
  card: {
    padding: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  sub: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  deleteAccountBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 40,
  },
  deleteAccountText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
