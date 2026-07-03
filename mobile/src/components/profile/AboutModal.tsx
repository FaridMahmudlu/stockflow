import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../ui/icon';
import { GlassCard } from '../glass-card';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../../theme/ThemeProvider';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: any) => string;
}

export const AboutModal: React.FC<AboutModalProps> = ({ visible, onClose, t }) => {
  const { colors, theme } = useAppTheme();
  const isLight = theme === 'light';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: colors.overlay.scrim }]}>
        <BlurView intensity={isLight ? 40 : 20} tint={isLight ? "light" : "dark"} style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>{t('about')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.logoContainer}>
              <Icon name="cube" size={64} color={colors.accent.primary} />
              <Text style={[styles.appName, { color: colors.text.primary }]}>Supply Changer</Text>
              <Text style={[styles.version, { color: colors.text.secondary }]}>Versiya 1.0.0 (Build 42)</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Hüquqi (Legal)</Text>
            <GlassCard style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.border.subtle }]}>
              <TouchableOpacity style={styles.row}>
                <Icon name="document-text" size={22} color={colors.accent.primary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>İstifadə Şərtləri (Terms of Service)</Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              <TouchableOpacity style={styles.row}>
                <Icon name="shield" size={22} color={colors.status.success} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Məxfilik Siyasəti (Privacy Policy)</Text>
                </View>
                <Icon name="chevron-right" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </GlassCard>

            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Əlaqə (Contact)</Text>
            <GlassCard style={[styles.card, { backgroundColor: colors.background.secondary, borderColor: colors.border.subtle }]}>
              <View style={styles.row}>
                <Icon name="mail" size={22} color={colors.text.secondary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Dəstək (Support)</Text>
                  <Text style={[styles.sub, { color: colors.text.secondary }]}>support@supplychanger.local</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
              <View style={styles.row}>
                <Icon name="globe" size={22} color={colors.text.secondary} />
                <View style={styles.info}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>Vebsayt</Text>
                  <Text style={[styles.sub, { color: colors.text.secondary }]}>www.supplychanger.local</Text>
                </View>
              </View>
            </GlassCard>
            
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.text.tertiary }]}>© 2026 Supply Changer.</Text>
              <Text style={[styles.footerText, { color: colors.text.tertiary }]}>Bütün hüquqlar qorunur.</Text>
            </View>
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
    height: '85%',
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  version: {
    fontSize: 14,
    marginTop: 4,
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
  footer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 2,
  }
});
